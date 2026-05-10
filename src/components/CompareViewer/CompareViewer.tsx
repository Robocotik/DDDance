import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { S3_ADDRESS } from '@/consts/urls';
import styles from './CompareViewer.module.scss';

interface CompareViewerProps {
	userGlbKey: string;
	referenceGlbKey: string;
}

const TARGET_HEIGHT = 1.7;
const CHARACTER_KEY = 'blender_data/character.glb';

const resolveS3 = (key: string) => {
	if (key.startsWith('http://') || key.startsWith('https://')) return key;
	const base = (S3_ADDRESS || '').replace(/\/+$/, '');
	return `${base}/${key.replace(/^\/+/, '')}`;
};

const extractDanceId = (glbKey: string): string | null => {
	const match = glbKey.match(/dances\/([^/]+)/);
	return match ? match[1] : null;
};

const loadGlb = (
	animUrl: string,
	scene: THREE.Scene,
	offsetX: number,
	onDone: (model: THREE.Group, mixer: THREE.AnimationMixer) => void,
	onError: () => void,
) => {
	const loader = new GLTFLoader();
	const characterUrl = resolveS3(CHARACTER_KEY);

	loader.load(characterUrl, (characterGltf) => {
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
				armature = (obj as THREE.SkinnedMesh).skeleton?.bones[0]?.parent || obj.parent || obj;
			}
		});

		const mixer = new THREE.AnimationMixer(model);

		loader.load(animUrl, (animGltf) => {
			if (!animGltf.animations?.length) {
				onError();
				return;
			}

			const action = mixer.clipAction(animGltf.animations[0], armature);
			action.reset();
			action.loop = THREE.LoopRepeat;
			action.play();
			onDone(model, mixer);
		}, undefined, () => {
			onError();
		});

	}, undefined, () => {
		onError();
	});
};

const CompareViewer: React.FC<CompareViewerProps> = ({ userGlbKey, referenceGlbKey }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const danceId = extractDanceId(referenceGlbKey);

	const handleBack = () => {
		if (danceId) {
			navigate(`/lesson/${danceId}`);
		} else {
			navigate(-1);
		}
	};

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
		renderer.setSize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1));
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
		const lineMat = new THREE.LineBasicMaterial({ color: 0x94228e, transparent: true, opacity: 0.6 });
		scene.add(new THREE.Line(lineGeo, lineMat));

		const fitCameraToModels = () => {
			const totalWidth = 1.2 * 2 + 1.0;
			const totalHeight = TARGET_HEIGHT;
			const centerY = totalHeight * 0.5;
			const fovRad = camera.fov * (Math.PI / 180);
			const aspect = camera.aspect;
			const distForHeight = (totalHeight / 2) / Math.tan(fovRad / 2);
			const distForWidth = (totalWidth / 2) / Math.tan((fovRad * aspect) / 2);
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

		const animate = () => {
			animFrame = requestAnimationFrame(animate);
			const now = performance.now();
			const delta = Math.min((now - lastTime) / 1000, 0.1);
			lastTime = now;
			mixers.forEach((m) => m.update(delta));
			controls.update();
			renderer.render(scene, camera);
		};
		animate();

		let loadedCount = 0;
		const checkAllLoaded = () => {
			loadedCount++;
			if (loadedCount === 2 && !cancelled) {
				fitCameraToModels();
				setLoading(false);
			}
		};

		loadGlb(
			resolveS3(referenceGlbKey),
			scene,
			-1.2,
			(model, mixer) => {
				models.push(model);
				mixers.push(mixer);
				checkAllLoaded();
			},
			() => { if (!cancelled) setError('Не удалось загрузить эталонную модель'); },
		);

		loadGlb(
			resolveS3(userGlbKey),
			scene,
			1.2,
			(model, mixer) => {
				models.push(model);
				mixers.push(mixer);
				checkAllLoaded();
			},
			() => { if (!cancelled) setError('Не удалось загрузить вашу модель'); },
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
			<button className={styles.backBtn} onClick={handleBack}>
				← К уроку
			</button>

			{loading && !error && (
				<div className={styles.loadingOverlay}>
					<p>Загрузка моделей...</p>
				</div>
			)}
			{error && (
				<div className={styles.errorOverlay}>{error}</div>
			)}
			{!loading && !error && (
				<>
					<div className={`${styles.label} ${styles.labelLeft}`}>Эталон</div>
					<div className={`${styles.label} ${styles.labelRight}`}>Вы</div>
				</>
			)}
			<div ref={containerRef} className={styles.canvas} />
		</div>
	);
};

export default CompareViewer;