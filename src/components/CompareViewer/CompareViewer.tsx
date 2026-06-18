import { S3_ADDRESS } from '@/consts/urls';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const applyBoneHeatmap = (
	model: THREE.Group,
	heatmap: Record<string, number>,
	originalMats: Map<string, THREE.Material>,
) => {
	model.traverse((obj) => {
		const mesh = obj as THREE.Mesh;

		if (!mesh.isMesh) {
			return;
		}

		const entry = Object.entries(heatmap).find(([k]) =>
			mesh.name.toLowerCase().includes(k.toLowerCase()),
		);

		if (!entry) {
			return;
		}

		const [, error] = entry;

		if (!originalMats.has(mesh.uuid)) {
			const mat = (
				Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
			) as THREE.Material;

			originalMats.set(mesh.uuid, mat);
			const cloned = mat.clone();

			if (Array.isArray(mesh.material)) {
				mesh.material = [cloned as THREE.MeshStandardMaterial];
			} else {
				mesh.material = cloned as THREE.MeshStandardMaterial;
			}
		}

		const mat = (
			Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
		) as THREE.MeshStandardMaterial;

		mat.color.setHSL((1 - error) * 0.33, 1, 0.5);
	});
};

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import styles from './CompareViewer.module.scss';

interface CompareViewerProps {
	userGlbKey: string;
	referenceGlbKey: string;
	userJointHeatmap?: Record<string, number>;
}

const TARGET_HEIGHT = 1.7;
const CHARACTER_KEY = 'blender_data/character.glb';
const MAX_SEGMENTS = 100;

const resolveS3 = (key: string) => {
	if (key.startsWith('http://') || key.startsWith('https://')) {
		return key;
	}

	const base = (S3_ADDRESS || '').replace(/\/+$/, '');
	return `${base}/${key.replace(/^\/+/, '')}`;
};

const folderOf = (key: string): string => {
	const i = key.lastIndexOf('/');
	return i >= 0 ? key.substring(0, i + 1) : '';
};

type ClipsProvider = () => Promise<THREE.AnimationClip[]>;

const loader = new GLTFLoader();

const loadGltfAsync = (url: string) =>
	new Promise<{ animations: THREE.AnimationClip[] }>((resolve, reject) => {
		loader.load(
			url,
			(gltf) => resolve({ animations: gltf.animations ?? [] }),
			undefined,
			(err) => reject(err),
		);
	});

const loadSingleAnimation =
	(animUrl: string): ClipsProvider =>
	async () => {
		try {
			const gltf = await loadGltfAsync(animUrl);
			return gltf.animations;
		} catch {
			return [];
		}
	};

const loadReferenceAnimations =
	(folderKey: string): ClipsProvider =>
	async () => {
		try {
			const gltf = await loadGltfAsync(
				resolveS3(`${folderKey}full_animation.glb`),
			);

			if (gltf.animations.length > 0) {
				return gltf.animations;
			}
		} catch {}

		const clips: THREE.AnimationClip[] = [];

		for (let i = 0; i < MAX_SEGMENTS; i++) {
			try {
				const gltf = await loadGltfAsync(
					resolveS3(`${folderKey}segment_${i}.glb`),
				);

				if (gltf.animations.length > 0) {
					clips.push(...gltf.animations);
				}
			} catch {
				break;
			}
		}

		return clips;
	};

const loadCharacterWithClips = (
	getClips: ClipsProvider,
	scene: THREE.Scene,
	offsetX: number,
	onDone: (
		model: THREE.Group,
		mixer: THREE.AnimationMixer,
		totalDuration: number,
	) => void,
	onError: () => void,
	isCancelled: () => boolean,
) => {
	loader.load(
		resolveS3(CHARACTER_KEY),
		async (characterGltf) => {
			if (isCancelled()) {
				return;
			}

			const model = characterGltf.scene;
			const box = new THREE.Box3().setFromObject(model);
			const h = box.max.y - box.min.y;

			if (h > 0) {
				model.scale.setScalar(TARGET_HEIGHT / h);
			}

			model.updateWorldMatrix(true, true);
			const box2 = new THREE.Box3().setFromObject(model);
			model.position.y = -box2.min.y;
			model.position.x = offsetX;
			scene.add(model);

			let armature: THREE.Object3D = model;
			model.traverse((obj) => {
				if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
					armature =
						(obj as THREE.SkinnedMesh).skeleton?.bones[0]?.parent ||
						obj.parent ||
						obj;
				}
			});

			const mixer = new THREE.AnimationMixer(model);

			let clips: THREE.AnimationClip[] = [];

			try {
				clips = await getClips();
			} catch {
				clips = [];
			}

			if (isCancelled()) {
				scene.remove(model);
				return;
			}

			const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);

			if (clips.length === 1) {
				const action = mixer.clipAction(clips[0], armature);
				action.reset();
				action.loop = THREE.LoopRepeat;
				action.play();
			} else if (clips.length > 1) {
				let currentIdx = 0;

				const playClip = (idx: number) => {
					const action = mixer.clipAction(clips[idx], armature);
					action.reset();
					action.loop = THREE.LoopOnce;
					action.clampWhenFinished = true;
					action.play();
				};

				mixer.addEventListener('finished', () => {
					const prev = mixer.clipAction(clips[currentIdx], armature);
					prev.stop();
					currentIdx = (currentIdx + 1) % clips.length;
					playClip(currentIdx);
				});

				playClip(0);
			}

			onDone(model, mixer, totalDuration);
		},
		undefined,
		() => {
			onError();
		},
	);
};

const CompareViewer: React.FC<CompareViewerProps> = ({
	userGlbKey,
	referenceGlbKey,
	userJointHeatmap,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const userModelRef = useRef<THREE.Group | null>(null);
	const originalUserMatsRef = useRef<Map<string, THREE.Material>>(new Map());
	const latestHeatmapRef = useRef<Record<string, number> | undefined>(
		userJointHeatmap,
	);

	latestHeatmapRef.current = userJointHeatmap;

	const userMixerRef = useRef<THREE.AnimationMixer | null>(null);
	const refMixerRef = useRef<THREE.AnimationMixer | null>(null);
	const effectiveDurationRef = useRef(0);
	const isPausedRef = useRef(false);
	const seekTrackRef = useRef<HTMLDivElement>(null);
	const draggingRef = useRef(false);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refModelFailed, setRefModelFailed] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [effectiveDuration, setEffectiveDuration] = useState(0);
	const [isPaused, setIsPaused] = useState(false);

	useEffect(() => {
		if (!userModelRef.current || !userJointHeatmap) {
			return;
		}

		applyBoneHeatmap(
			userModelRef.current,
			userJointHeatmap,
			originalUserMatsRef.current,
		);
	}, [userJointHeatmap]);

	useEffect(() => {
		const container = containerRef.current;

		if (!container) {
			return;
		}

		let cancelled = false;
		const mixers: THREE.AnimationMixer[] = [];
		let animFrame: number;
		let lastTime = performance.now();

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0a0a0f);
		scene.fog = new THREE.FogExp2(0x0a0a0f, 0.004);

		const camera = new THREE.PerspectiveCamera(
			45,
			Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
			0.1,
			1000,
		);

		camera.position.set(0, 1.4, 7);
		camera.lookAt(0, 1.0, 0);

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(
			Math.max(container.clientWidth, 1),
			Math.max(container.clientHeight, 1),
		);

		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		container.appendChild(renderer.domElement);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.target.set(0, TARGET_HEIGHT * 0.5, 0);

		scene.add(new THREE.AmbientLight(0xffffff, 0.7));
		const dir = new THREE.DirectionalLight(0xffffff, 1.2);
		dir.position.set(3, 5, 3);
		scene.add(dir);
		const fill = new THREE.DirectionalLight(0xccddff, 0.4);
		fill.position.set(-3, 2, 2);
		scene.add(fill);

		const lineGeo = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(0, TARGET_HEIGHT * 1.1, 0),
		]);

		const lineMat = new THREE.LineBasicMaterial({
			color: 0x94228e,
			transparent: true,
			opacity: 0.6,
		});

		scene.add(new THREE.Line(lineGeo, lineMat));

		const fitCameraToModels = () => {
			const totalWidth = 1.2 * 2 + 1.0;
			const totalHeight = TARGET_HEIGHT;
			const centerY = totalHeight * 0.5;
			const fovRad = camera.fov * (Math.PI / 180);
			const aspect = camera.aspect;
			const distForHeight = totalHeight / 2 / Math.tan(fovRad / 2);
			const distForWidth = totalWidth / 2 / Math.tan((fovRad * aspect) / 2);
			const cameraZ = Math.max(distForHeight, distForWidth) * 1.3;

			camera.position.set(0, centerY, cameraZ);
			camera.lookAt(0, centerY, 0);
			controls.target.set(0, centerY, 0);
			controls.update();
		};

		const onResize = () => {
			if (!container) {
				return;
			}

			const w = Math.max(container.clientWidth, 1);
			const h = Math.max(container.clientHeight, 1);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
		};

		window.addEventListener('resize', onResize);

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;

				if (width > 0 && height > 0) {
					onResize();
				}
			}
		});

		resizeObserver.observe(container);

		let loadedCount = 0;
		let userMixer: THREE.AnimationMixer | null = null;
		let refMixer: THREE.AnimationMixer | null = null;
		let userDuration = 0;
		let refDuration = 0;

		const animate = () => {
			animFrame = requestAnimationFrame(animate);
			const now = performance.now();
			const delta = Math.min((now - lastTime) / 1000, 0.1);
			lastTime = now;

			if (!isPausedRef.current) {
				mixers.forEach((m) => m.update(delta));
			}

			if (userMixerRef.current) {
				setCurrentTime(userMixerRef.current.time);
			}

			if (
				!isPausedRef.current &&
				userMixer &&
				refMixer &&
				userDuration > 0 &&
				refDuration > 0
			) {
				const k = Math.min(userDuration, refDuration);

				if (userMixer.time >= k || refMixer.time >= k) {
					userMixer.setTime(0);
					refMixer.setTime(0);
				}
			}

			controls.update();
			renderer.render(scene, camera);
		};

		animate();

		const trySync = () => {
			if (!userMixer || !refMixer) {
				return;
			}

			if (userDuration <= 0 || refDuration <= 0) {
				return;
			}

			const k = Math.min(userDuration, refDuration);
			effectiveDurationRef.current = k;
			setEffectiveDuration(k);
			userMixer.setTime(0);
			refMixer.setTime(0);
		};

		const checkAllLoaded = () => {
			loadedCount++;

			if (loadedCount === 2 && !cancelled) {
				trySync();
				fitCameraToModels();
				setLoading(false);
			}
		};

		const isCancelled = () => cancelled;

		const referenceFolder = folderOf(referenceGlbKey);
		loadCharacterWithClips(
			loadReferenceAnimations(referenceFolder),
			scene,
			-1.2,
			(_model, mixer, total) => {
				refMixerRef.current = mixer;
				mixers.push(mixer);
				refMixer = mixer;
				refDuration = total;
				checkAllLoaded();
			},
			() => {
				if (!cancelled) {
					setRefModelFailed(true);
					checkAllLoaded();
				}
			},
			isCancelled,
		);

		loadCharacterWithClips(
			loadSingleAnimation(resolveS3(userGlbKey)),
			scene,
			1.2,
			(model, mixer, total) => {
				userModelRef.current = model;
				userMixerRef.current = mixer;

				if (latestHeatmapRef.current) {
					applyBoneHeatmap(
						model,
						latestHeatmapRef.current,
						originalUserMatsRef.current,
					);
				}

				mixers.push(mixer);
				userMixer = mixer;
				userDuration = total;
				checkAllLoaded();
			},
			() => {
				if (!cancelled) {
					setError('Не удалось загрузить вашу модель');
				}
			},
			isCancelled,
		);

		return () => {
			cancelled = true;
			cancelAnimationFrame(animFrame);
			window.removeEventListener('resize', onResize);
			resizeObserver.disconnect();
			controls.dispose();
			renderer.dispose();

			if (container.contains(renderer.domElement)) {
				container.removeChild(renderer.domElement);
			}

			userModelRef.current = null;
			userMixerRef.current = null;
			refMixerRef.current = null;
			effectiveDurationRef.current = 0;
			isPausedRef.current = false;
			originalUserMatsRef.current.clear();
			setEffectiveDuration(0);
			setCurrentTime(0);
			setIsPaused(false);
		};
	}, [userGlbKey, referenceGlbKey]);

	const handleTogglePause = useCallback(() => {
		const next = !isPausedRef.current;
		isPausedRef.current = next;
		setIsPaused(next);
	}, []);

	const seekFromPointer = useCallback((clientX: number) => {
		const track = seekTrackRef.current;

		if (!track) {
			return;
		}

		const rect = track.getBoundingClientRect();

		if (rect.width <= 0) {
			return;
		}

		const k = effectiveDurationRef.current;

		if (k <= 0) {
			return;
		}

		const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * k;
		userMixerRef.current?.setTime(t);
		refMixerRef.current?.setTime(t);
		setCurrentTime(t);
	}, []);

	const onSeekPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.preventDefault();
			(e.target as Element).setPointerCapture?.(e.pointerId);
			draggingRef.current = true;
			seekFromPointer(e.clientX);
		},
		[seekFromPointer],
	);

	const onSeekPointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!draggingRef.current) {
				return;
			}

			seekFromPointer(e.clientX);
		},
		[seekFromPointer],
	);

	const onSeekPointerUp = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!draggingRef.current) {
				return;
			}

			(e.target as Element).releasePointerCapture?.(e.pointerId);
			draggingRef.current = false;
		},
		[],
	);

	return (
		<div className={styles.wrapper}>
			{loading && !error && (
				<div className={styles.loadingOverlay}>
					<p>Загрузка моделей...</p>
				</div>
			)}
			{error && (
				<div className={styles.errorOverlay}>Не удалось загрузить модели</div>
			)}
			{!loading && !error && (
				<>
					{!refModelFailed ? (
						<div className={`${styles.label} ${styles.labelLeft}`}>Эталон</div>
					) : (
						<div className={styles.refUnavailableOverlay}>
							Эталон недоступен
						</div>
					)}
					<div className={`${styles.label} ${styles.labelRight}`}>Вы</div>
				</>
			)}
			<div ref={containerRef} className={styles.canvas} />
			{!loading && !error && effectiveDuration > 0 && (
				<div className={styles.controls}>
					<button className={styles.pauseBtn} onClick={handleTogglePause}>
						{isPaused ? '▶' : '⏸'}
					</button>
					<div
						ref={seekTrackRef}
						className={styles.seekTrack}
						onPointerDown={onSeekPointerDown}
						onPointerMove={onSeekPointerMove}
						onPointerUp={onSeekPointerUp}
					>
						<div
							className={styles.seekFill}
							style={{
								width: `${effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0}%`,
							}}
						/>
					</div>
					<span className={styles.timeLabel}>
						{currentTime.toFixed(1)} / {effectiveDuration.toFixed(1)}s
					</span>
				</div>
			)}
		</div>
	);
};

export default CompareViewer;
