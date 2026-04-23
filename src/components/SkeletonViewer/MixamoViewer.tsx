// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { S3_ADDRESS } from '../../consts/urls';

type MixamoViewerProps = {
	glbPath: string | null;
};

const TARGET_HEIGHT = 1.7;
const DEFAULT_CHARACTER_KEY = 'blender_data/character.glb';

const resolveAssetPath = (
	key: string | undefined,
	s3Base?: string,
): string | null => {
	if (!key) return null;
	if (key.startsWith('http://') || key.startsWith('https://')) return key;
	const base = (s3Base || S3_ADDRESS || '').replace(/\/+$/, '');
	const cleanKey = key.replace(/^\/+/, '');
	return `${base}/${cleanKey}`;
};

const MixamoViewer: React.FC<MixamoViewerProps> = ({ glbPath }) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const sceneRef = useRef<THREE.Scene | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const controlsRef = useRef<OrbitControls | null>(null);

	const lastTimeRef = useRef<number>(performance.now());
	const lastTimeUpdateRef = useRef<number>(0);
	const animFrameRef = useRef<number | null>(null);

	const characterRef = useRef<THREE.Group | null>(null);
	const armatureRef = useRef<THREE.Object3D | null>(null);
	const mixerRef = useRef<THREE.AnimationMixer | null>(null);
	const currentActionRef = useRef<THREE.AnimationAction | null>(null);

	const rootBoneRef = useRef<THREE.Object3D | null>(null);
	const rootInitPosRef = useRef<THREE.Vector3 | null>(null);

	const [playing, setPlaying] = useState(false);
	const [timeScale] = useState(1);
	const [loadingCharacter, setLoadingCharacter] = useState(true);
	const [loadingAnimation, setLoadingAnimation] = useState(false);
	const [characterLoadError, setCharacterLoadError] = useState<string | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);

	const playingRef = useRef(playing);
	const timeScaleRef = useRef(timeScale);

	useEffect(() => {
		playingRef.current = playing;
	}, [playing]);
	useEffect(() => {
		timeScaleRef.current = timeScale;
	}, [timeScale]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let cancelled = false;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0a0a0f);
		scene.fog = new THREE.FogExp2(0x0a0a0f, 0.006);
		sceneRef.current = scene;

		const camera = new THREE.PerspectiveCamera(
			45,
			container.clientWidth / container.clientHeight,
			0.1,
			1000,
		);
		camera.position.set(0, 1.2, 3.5);
		camera.lookAt(0, 1.0, 0);
		cameraRef.current = camera;

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.shadowMap.enabled = true;
		rendererRef.current = renderer;
		container.appendChild(renderer.domElement);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.target.set(0, 1.0, 0);
		controlsRef.current = controls;

		scene.add(new THREE.AmbientLight(0xffffff, 0.6));
		const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
		dirLight.position.set(2, 4, 2);
		scene.add(dirLight);

		const fillLight = new THREE.DirectionalLight(0xccddff, 0.4);
		fillLight.position.set(-2, 1, 2);
		scene.add(fillLight);

		const handleResize = () => {
			if (!containerRef.current || !cameraRef.current || !rendererRef.current)
				return;
			cameraRef.current.aspect =
				containerRef.current.clientWidth / containerRef.current.clientHeight;
			cameraRef.current.updateProjectionMatrix();
			rendererRef.current.setSize(
				containerRef.current.clientWidth,
				containerRef.current.clientHeight,
			);
		};
		window.addEventListener('resize', handleResize);

		const animate = () => {
			const now = performance.now();
			const delta = Math.min((now - lastTimeRef.current) / 1000, 0.1);
			lastTimeRef.current = now;

			if (playingRef.current && mixerRef.current) {
				mixerRef.current.update(delta * timeScaleRef.current);
				const action = currentActionRef.current;
				if (action && now - lastTimeUpdateRef.current > 100) {
					lastTimeUpdateRef.current = now;
				}

				if (
					rootBoneRef.current &&
					rootInitPosRef.current &&
					characterRef.current
				) {
					const rootDelta = new THREE.Vector3();
					rootDelta.subVectors(
						rootBoneRef.current.position,
						rootInitPosRef.current,
					);
					characterRef.current.position.x = rootDelta.x;
					characterRef.current.position.z = rootDelta.z;
				}
			}

			controls.update();
			renderer.render(scene, camera);
			animFrameRef.current = requestAnimationFrame(animate);
		};
		animate();

		const characterUrl = resolveAssetPath(DEFAULT_CHARACTER_KEY);

		if (!characterUrl) {
			if (!cancelled) {
				setCharacterLoadError('Не указан путь к персонажу');
				setLoadingCharacter(false);
			}
		} else {
			const loader = new GLTFLoader();
			loader.load(
				characterUrl,
				(gltf) => {
					if (cancelled) return;

					const model = gltf.scene;

					const box = new THREE.Box3().setFromObject(model);
					const height = box.max.y - box.min.y;
					if (height > 0) model.scale.setScalar(TARGET_HEIGHT / height);

					model.updateWorldMatrix(true, true);
					const box2 = new THREE.Box3().setFromObject(model);
					model.position.y = -box2.min.y - 0.8;
					scene.add(model);
					characterRef.current = model;

					let foundArmature: THREE.Object3D | null = null;
					model.traverse((obj) => {
						if ((obj as any).isSkinnedMesh) {
							foundArmature =
								(obj as THREE.SkinnedMesh).skeleton?.bones[0]?.parent ||
								obj.parent ||
								obj;
						}
						if (obj.type === 'Bone' && !foundArmature) {
							let root = obj;
							while (root.parent && root.parent !== model) root = root.parent;
							foundArmature = root;
						}
					});
					armatureRef.current = foundArmature || model;
					mixerRef.current = new THREE.AnimationMixer(model);

					if (foundArmature) {
						let rootBone = foundArmature;
						while (
							rootBone.children.length > 0 &&
							(rootBone.children[0] as any).isBone
						) {
							rootBone = rootBone.children[0];
						}
						rootBoneRef.current = rootBone;
						rootInitPosRef.current = rootBone.position.clone();
					} else {
						rootBoneRef.current = model;
						rootInitPosRef.current = model.position.clone();
					}

					setLoadingCharacter(false);
				},
				undefined,
				() => {
					if (cancelled) return;
					setCharacterLoadError('Не удалось загрузить модель персонажа');
					setLoadingCharacter(false);
				},
			);
		}

		return () => {
			cancelled = true;
			window.removeEventListener('resize', handleResize);
			if (animFrameRef.current !== null)
				cancelAnimationFrame(animFrameRef.current);
			controls.dispose();
			renderer.dispose();
			if (container.contains(renderer.domElement))
				container.removeChild(renderer.domElement);
			sceneRef.current = null;
			cameraRef.current = null;
			rendererRef.current = null;
			controlsRef.current = null;
			characterRef.current = null;
			armatureRef.current = null;
			mixerRef.current = null;
			currentActionRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (
			loadingCharacter ||
			!mixerRef.current ||
			!characterRef.current ||
			!glbPath
		)
			return;

		const animationUrl = resolveAssetPath(glbPath);
		if (!animationUrl) {
			setError('Неверный путь к видео');
			return;
		}

		let cancelled = false;
		setLoadingAnimation(true);
		setError(null);

		const loader = new GLTFLoader();
		loader.load(
			animationUrl,
			(gltf) => {
				if (cancelled) return;
				if (!gltf.animations?.length) {
					setLoadingAnimation(false);
					setError('В glb не найдена анимация');
					return;
				}

				const clip = gltf.animations[0];
				const mixer = mixerRef.current;
				const target = armatureRef.current || characterRef.current;
				if (!mixer || !target) {
					setLoadingAnimation(false);
					return;
				}

				if (currentActionRef.current) currentActionRef.current.stop();
				const action = mixer.clipAction(clip, target);
				action.reset();
				action.clampWhenFinished = true;
				action.loop = THREE.LoopRepeat;
				action.timeScale = timeScaleRef.current;

				if (rootBoneRef.current)
					rootInitPosRef.current = rootBoneRef.current.position.clone();

				action.play();
				currentActionRef.current = action;
				setPlaying(true);
				setLoadingAnimation(false);
			},
			undefined,
			() => {
				if (cancelled) return;
				setLoadingAnimation(false);
				setError('Не удалось загрузить glb анимацию');
			},
		);

		return () => {
			cancelled = true;
		};
	}, [loadingCharacter, glbPath]);

	useEffect(() => {
		if (!currentActionRef.current) return;
		currentActionRef.current.paused = !playing;
	}, [playing]);

	useEffect(() => {
		if (currentActionRef.current)
			currentActionRef.current.timeScale = timeScale;
	}, [timeScale]);

	return (
		<div
			style={{
				position: 'relative',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: 420,
				maxWidth: '100%',
				background: '#05050a',
				borderRadius: 8,
				overflow: 'hidden',
			}}
		>
			{(loadingCharacter || characterLoadError) && (
				<div
					style={{
						position: 'absolute',
						inset: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: '#05050a',
						color: '#fff',
						zIndex: 2,
					}}
				>
					<div style={{ textAlign: 'center' }}>
						{loadingCharacter ? (
							<>
								<div style={{ fontSize: 18, marginBottom: 16 }}>
									Загрузка персонажа...
								</div>
								<div style={{ fontSize: 14, color: '#aaa' }}>
									Пожалуйста, подождите
								</div>
							</>
						) : (
							<>
								<div
									style={{ fontSize: 18, marginBottom: 16, color: '#ff6b6b' }}
								>
									Ошибка загрузки
								</div>
								<div style={{ fontSize: 14, color: '#aaa' }}>
									{characterLoadError}
								</div>
								<button
									onClick={() => window.location.reload()}
									style={{
										marginTop: 20,
										padding: '8px 16px',
										cursor: 'pointer',
									}}
								>
									Попробовать снова
								</button>
							</>
						)}
					</div>
				</div>
			)}

			<div
				style={{
					position: 'absolute',
					top: 8,
					left: 8,
					fontSize: 12,
					color: '#aaa',
					zIndex: 1,
				}}
			>
				{loadingAnimation && <span>Загрузка анимации...</span>}
				{error && <span style={{ color: '#ff6b6b' }}>{error}</span>}
			</div>
			<div
				ref={containerRef}
				style={{
					width: '100%',
					aspectRatio: '4 / 5',
					background: '#0a0a0f',
				}}
			/>
		</div>
	);
};

export default MixamoViewer;
