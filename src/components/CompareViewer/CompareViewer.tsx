import { S3_ADDRESS } from '@/consts/urls';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import styles from './CompareViewer.module.scss';

interface CompareViewerProps {
	userGlbKey: string;
	referenceGlbKey: string;
}

const TARGET_HEIGHT = 1.7;
const CHARACTER_KEY = 'blender_data/character.glb';
/** Сколько максимум сегментов пробуем подгрузить из папки эталона. */
const MAX_SEGMENTS = 100;

const resolveS3 = (key: string) => {
	if (key.startsWith('http://') || key.startsWith('https://')) return key;
	const base = (S3_ADDRESS || '').replace(/\/+$/, '');
	return `${base}/${key.replace(/^\/+/, '')}`;
};

/** Извлекает префикс-папку из ключа: `results/{id}/foo.glb` → `results/{id}/`. */
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

/** Грузит один файл и возвращает все его анимации. */
const loadSingleAnimation = (animUrl: string): ClipsProvider => async () => {
	try {
		const gltf = await loadGltfAsync(animUrl);
		return gltf.animations;
	} catch {
		return [];
	}
};

/**
 * Грузит все анимации эталона из одной папки:
 * сначала пробует `full_animation.glb`, при отсутствии — последовательно
 * `segment_0.glb`, `segment_1.glb`, ... пока не получит 404.
 */
const loadReferenceAnimations = (folderKey: string): ClipsProvider => async () => {
	// Сначала пробуем full_animation.glb.
	try {
		const gltf = await loadGltfAsync(resolveS3(`${folderKey}full_animation.glb`));
		if (gltf.animations.length > 0) return gltf.animations;
	} catch {
		/* fall through to segments */
	}

	const clips: THREE.AnimationClip[] = [];
	for (let i = 0; i < MAX_SEGMENTS; i++) {
		try {
			const gltf = await loadGltfAsync(resolveS3(`${folderKey}segment_${i}.glb`));
			if (gltf.animations.length > 0) {
				clips.push(...gltf.animations);
			}
		} catch {
			break; // 404 — больше сегментов нет
		}
	}
	return clips;
};

/**
 * Грузит базового персонажа (`character.glb`), затем через `getClips`
 * подтягивает анимации. Если клипов несколько — играет их последовательно
 * по кругу. Если ни одной — модель остаётся в T-позе.
 */
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
			if (isCancelled()) return;

			const model = characterGltf.scene;
			const box = new THREE.Box3().setFromObject(model);
			const h = box.max.y - box.min.y;
			if (h > 0) model.scale.setScalar(TARGET_HEIGHT / h);

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
				// Несколько клипов: проигрываем по очереди, по кругу.
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
			// clips.length === 0 — оставляем модель в T-позе, без анимации.

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
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refModelFailed, setRefModelFailed] = useState(false);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let cancelled = false;
		const mixers: THREE.AnimationMixer[] = [];
		const models: THREE.Group[] = [];
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
			if (!container) return;
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
				if (width > 0 && height > 0) onResize();
			}
		});
		resizeObserver.observe(container);

		// Mixer'ы и длительности заполняются асинхронно по мере загрузки моделей
		// ниже. Объявляем их ДО animate(), чтобы первый rAF-тик не упёрся в
		// Temporal Dead Zone (let-биндинги).
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
			mixers.forEach((m) => m.update(delta));

			// Зацикливание по k = min(userDuration, refDuration). Оба mixer'а
			// идут в натуральном темпе (timeScale = 1) — без растяжения
			// эталона под пользователя. Когда чей-то таймер превысил k,
			// возвращаем оба к нулю одновременно — меньшее видео диктует длину
			// цикла, большее просто не доигрывает до своего конца.
			if (userMixer && refMixer && userDuration > 0 && refDuration > 0) {
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

		// Когда обе модели загружены — стартуем обе с нуля. timeScale у обеих
		// остаётся 1.0: больше НИКАКОЙ растяжки эталона под длину пользователя
		// (раньше это давало визуальное ускорение длинного эталона). Зацикливание
		// по min(userDuration, refDuration) делает animate-цикл выше.
		const trySync = () => {
			if (!userMixer || !refMixer) return;
			if (userDuration <= 0 || refDuration <= 0) return;
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

		// Эталон: загружаем все сегменты из папки и проигрываем их по очереди.
		const referenceFolder = folderOf(referenceGlbKey);
		loadCharacterWithClips(
			loadReferenceAnimations(referenceFolder),
			scene,
			-1.2,
			(model, mixer, total) => {
				models.push(model);
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

		// Пользователь: одиночный файл с готовой анимацией.
		loadCharacterWithClips(
			loadSingleAnimation(resolveS3(userGlbKey)),
			scene,
			1.2,
			(model, mixer, total) => {
				models.push(model);
				mixers.push(mixer);
				userMixer = mixer;
				userDuration = total;
				checkAllLoaded();
			},
			() => {
				if (!cancelled) setError('Не удалось загрузить вашу модель');
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
		};
	}, [userGlbKey, referenceGlbKey]);

	return (
		<div className={styles.wrapper}>
			{loading && !error && (
				<div className={styles.loadingOverlay}>
					<p>Загрузка моделей...</p>
				</div>
			)}
			{error && <div className={styles.errorOverlay}>Не удалось загрузить модели</div>}
			{!loading && !error && (
				<>
					{!refModelFailed
						? <div className={`${styles.label} ${styles.labelLeft}`}>Эталон</div>
						: <div className={styles.refUnavailableOverlay}>Эталон недоступен</div>
					}
					<div className={`${styles.label} ${styles.labelRight}`}>Вы</div>
				</>
			)}
			<div ref={containerRef} className={styles.canvas} />
		</div>
	);
};

export default CompareViewer;
