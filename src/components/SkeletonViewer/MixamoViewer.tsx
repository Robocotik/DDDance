// @ts-nocheck
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { S3_ADDRESS } from '../../consts/urls';

import styles from './MixamoViewer.module.scss';

type MixamoViewerProps = {
	glbPath: string | null;
	preloadPath?: string | null;
	timeScale?: number;
	onAnimationReady?: () => void;
};

export interface MixamoViewerHandle {
	pause: () => void;
	resume: () => void;
	resetToStart: () => void;
}

THREE.Cache.enabled = true;
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

const MixamoViewer = forwardRef<MixamoViewerHandle, MixamoViewerProps>(
	({ glbPath, preloadPath, timeScale = 1, onAnimationReady }, ref) => {
		const containerRef = useRef<HTMLDivElement | null>(null);
		const sceneRef = useRef<THREE.Scene | null>(null);
		const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
		const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
		const controlsRef = useRef<OrbitControls | null>(null);

		const lastTimeRef = useRef<number>(performance.now());
		const animFrameRef = useRef<number | null>(null);

		const characterRef = useRef<THREE.Group | null>(null);
		const armatureRef = useRef<THREE.Object3D | null>(null);
		const mixerRef = useRef<THREE.AnimationMixer | null>(null);
		const currentActionRef = useRef<THREE.AnimationAction | null>(null);
		const rootBoneRef = useRef<THREE.Object3D | null>(null);
		const hipsInitWorldPosRef = useRef<THREE.Vector3 | null>(null);

		const [loadingCharacter, setLoadingCharacter] = useState(true);
		const [loadingAnimation, setLoadingAnimation] = useState(false);
		const [characterLoadError, setCharacterLoadError] = useState<string | null>(
			null,
		);
		const [error, setError] = useState<string | null>(null);

		const timeScaleRef = useRef(timeScale);

		useEffect(() => {
			timeScaleRef.current = timeScale;
			if (currentActionRef.current) {
				currentActionRef.current.timeScale = timeScale;
			}
		}, [timeScale]);

		useImperativeHandle(ref, () => ({
			pause: () => {
				if (currentActionRef.current) {
					currentActionRef.current.paused = true;
				}
			},
			resume: () => {
				if (currentActionRef.current) {
					currentActionRef.current.paused = false;
				}
			},
			resetToStart: () => {
				const action = currentActionRef.current;
				const mixer = mixerRef.current;
				if (!action || !mixer) return;

				action.stop();
				action.reset();
				action.play();
				mixer.update(0);
				action.paused = true;

				if (characterRef.current) {
					characterRef.current.position.x = 0;
					characterRef.current.position.z = 0;
				}
			},
		}));

		const fitCameraToObject = (object: THREE.Object3D) => {
			const camera = cameraRef.current;
			const controls = controlsRef.current;
			if (!camera || !controls) return;

			const box = new THREE.Box3().setFromObject(object);
			const center = box.getCenter(new THREE.Vector3());
			const size = box.getSize(new THREE.Vector3());

			const maxDim = Math.max(size.x, size.y, size.z);
			const fov = camera.fov * (Math.PI / 180);
			const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

			camera.position.set(center.x, center.y + size.y * 0.3, cameraZ);
			camera.lookAt(center);
			controls.target.copy(center);
			controls.update();
		};

		useEffect(() => {
			if (!preloadPath || loadingCharacter) return;
			const url = resolveAssetPath(preloadPath);
			if (!url) return;
			const loader = new GLTFLoader();
			loader.load(
				url,
				() => {},
				undefined,
				() => {},
			);
		}, [preloadPath, loadingCharacter]);

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

				if (mixerRef.current) {
					mixerRef.current.update(delta);
				}

				if (characterRef.current && controlsRef.current) {
					const worldPos = new THREE.Vector3();
					characterRef.current.getWorldPosition(worldPos);
					controlsRef.current.target.x +=
						(worldPos.x - controlsRef.current.target.x) * 0.1;
					controlsRef.current.target.z +=
						(worldPos.z - controlsRef.current.target.z) * 0.1;
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
						model.position.y = -box2.min.y;
						scene.add(model);
						characterRef.current = model;
						fitCameraToObject(model);

						let foundArmature: THREE.Object3D | null = null;
						model.traverse((obj) => {
							if ((obj as THREE.SkinnedMesh).isSkinnedMesh && !foundArmature) {
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

						let hips: THREE.Object3D | null = null;
						model.traverse((obj) => {
							if (
								!hips &&
								obj.type === 'Bone' &&
								(obj.name === 'mixamorig_Hips' ||
									obj.name === 'Hips' ||
									obj.name.toLowerCase().includes('hips'))
							) {
								hips = obj;
							}
						});
						rootBoneRef.current = hips || foundArmature || model;

						mixerRef.current = new THREE.AnimationMixer(model);
						setLoadingCharacter(false);
					},
					undefined,
					() => {
						if (!cancelled) {
							setCharacterLoadError('Не удалось загрузить модель персонажа');
							setLoadingCharacter(false);
						}
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
				rootBoneRef.current = null;
				hipsInitWorldPosRef.current = null;
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
				setError('Неверный путь к анимации');
				return;
			}

			let cancelled = false;
			setLoadingAnimation(true);
			setError(null);

			if (characterRef.current) {
				characterRef.current.position.x = 0;
				characterRef.current.position.z = 0;
			}

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

					if (currentActionRef.current) {
						currentActionRef.current.stop();
					}

					const action = mixer.clipAction(clip, target);
					action.reset();
					action.clampWhenFinished = true;
					action.loop = THREE.LoopRepeat;
					action.timeScale = timeScaleRef.current;
					action.play();

					mixer.update(0);

					action.paused = true;
					currentActionRef.current = action;

					setLoadingAnimation(false);

					onAnimationReady?.();
				},
				undefined,
				(err) => {
					if (!cancelled) {
						setLoadingAnimation(false);
						setError('Не удалось загрузить glb анимацию');
					}
				},
			);

			return () => {
				cancelled = true;
			};
		}, [loadingCharacter, glbPath]);

		return (
			<div className={styles.viewerContainer}>
				{(loadingCharacter || characterLoadError) && (
					<div className={styles.overlay}>
						<div className={styles.overlayContent}>
							{loadingCharacter ? (
								<>
									<div className={styles.loadingText}>
										Загрузка персонажа...
									</div>
									<div className={styles.subText}>Пожалуйста, подождите</div>
								</>
							) : (
								<>
									<div className={styles.errorText}>Не удалось загрузить персонажа</div>
									<button
										onClick={() => window.location.reload()}
										className={styles.retryButton}
									>
										Попробовать снова
									</button>
								</>
							)}
						</div>
					</div>
				)}
				<div className={styles.statusIndicator}>
					{error && <span className={styles.statusError}>Ошибка воспроизведения</span>}
				</div>
				<div ref={containerRef} className={styles.canvasContainer} />
			</div>
		);
	},
);

MixamoViewer.displayName = 'MixamoViewer';
export default MixamoViewer;
