// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { S3_ADDRESS } from '../../consts/urls';
import type { UploadVideoResult } from '../../redux/features/video/actions';

type MixamoViewerProps = {
	result: UploadVideoResult;
};

const TARGET_HEIGHT = 1.7;

const MixamoViewer: React.FC<MixamoViewerProps> = ({ result }) => {
	const containerRef = useRef<HTMLDivElement | null>(null);

	const sceneRef = useRef<THREE.Scene | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const controlsRef = useRef<OrbitControls | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const clockRef = useRef(new THREE.Clock());

	const mixerRef = useRef<THREE.AnimationMixer | null>(null);
	const actionsRef = useRef<THREE.AnimationAction[]>([]);
	const modelRef = useRef<THREE.Group | null>(null);
	const gridRef = useRef<THREE.GridHelper | null>(null);

	const [playing, setPlaying] = useState(true);
	const [animations, setAnimations] = useState<string[]>([]);
	const [currentAnimation, setCurrentAnimation] = useState(0);
	const [modelScale, setModelScale] = useState(1);
	const [timeScale, setTimeScale] = useState(1);

	const modelUrl = `${S3_ADDRESS}${result.result_key}`;

	useEffect(() => {
		const container = containerRef.current;

		if (!container) {
			return;
		}

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

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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
		dirLight.castShadow = true;
		scene.add(dirLight);

		scene.add(new THREE.PointLight(0x4466cc, 0.4, 10));

		const grid = new THREE.GridHelper(4, 20, 0x335588, 0x1e1e2e);
		grid.position.y = -0.8;
		scene.add(grid);
		gridRef.current = grid;

		const handleResize = () => {
			const currentContainer = containerRef.current;
			const currentCamera = cameraRef.current;
			const currentRenderer = rendererRef.current;

			if (!currentContainer || !currentCamera || !currentRenderer) {
				return;
			}

			currentCamera.aspect =
				currentContainer.clientWidth / currentContainer.clientHeight;

			currentCamera.updateProjectionMatrix();
			currentRenderer.setSize(
				currentContainer.clientWidth,
				currentContainer.clientHeight,
			);
		};

		window.addEventListener('resize', handleResize);

		const animate = () => {
			const delta = clockRef.current.getDelta();

			if (playing && mixerRef.current) {
				mixerRef.current.update(delta * timeScale);
			}

			controls.update();
			renderer.render(scene, camera);
			animationFrameRef.current = requestAnimationFrame(animate);
		};

		animate();

		return () => {
			window.removeEventListener('resize', handleResize);

			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
			}

			controls.dispose();
			renderer.dispose();

			if (container.contains(renderer.domElement)) {
				container.removeChild(renderer.domElement);
			}

			sceneRef.current = null;
			cameraRef.current = null;
			rendererRef.current = null;
			controlsRef.current = null;
			gridRef.current = null;
		};
	}, []);

	useEffect(() => {
		const scene = sceneRef.current;

		if (!scene) {
			return;
		}

		const loader = new GLTFLoader();
		let cancelled = false;

		const clearCurrentModel = () => {
			actionsRef.current.forEach((action) => action.stop());
			actionsRef.current = [];
			mixerRef.current = null;

			if (modelRef.current) {
				scene.remove(modelRef.current);

				modelRef.current.traverse((child) => {
					const mesh = child as THREE.Mesh;

					if (mesh.geometry) {
						mesh.geometry.dispose();
					}

					const material = mesh.material;

					if (Array.isArray(material)) {
						material.forEach((mtrl) => mtrl.dispose());
					} else if (material) {
						material.dispose();
					}
				});

				modelRef.current = null;
			}
		};

		clearCurrentModel();
		setAnimations([]);
		setCurrentAnimation(0);

		loader.load(
			modelUrl,
			(gltf) => {
				if (cancelled) {
					return;
				}

				const model = gltf.scene;
				modelRef.current = model;

				let box = new THREE.Box3().setFromObject(model);
				const originalHeight = box.max.y - box.min.y;

				const normalizedScale =
					originalHeight > 0 ? TARGET_HEIGHT / originalHeight : 1;

				model.scale.setScalar(normalizedScale * modelScale);
				model.updateWorldMatrix(true, true);

				box = new THREE.Box3().setFromObject(model);
				const lowestPoint = box.min.y;
				model.position.y = -lowestPoint;

				scene.add(model);

				if (gridRef.current) {
					gridRef.current.position.y = model.position.y - 0.05;
				}

				if (gltf.animations && gltf.animations.length > 0) {
					const mixer = new THREE.AnimationMixer(model);
					mixerRef.current = mixer;

					const actionNames = gltf.animations.map(
						(clip, index) => clip.name || `Animation ${index + 1}`,
					);

					setAnimations(actionNames);

					actionsRef.current = gltf.animations.map((clip) => {
						const action = mixer.clipAction(clip);
						action.clampWhenFinished = false;
						action.loop = THREE.LoopRepeat;
						action.timeScale = timeScale;
						return action;
					});

					actionsRef.current[0]?.play();
					setCurrentAnimation(0);
				}
			},
			undefined,
			(error) => {
				console.error('Ошибка загрузки модели из S3:', error);
			},
		);

		return () => {
			cancelled = true;
			clearCurrentModel();
		};
	}, [modelUrl]);

	useEffect(() => {
		if (!modelRef.current) {
			return;
		}

		const model = modelRef.current;

		let box = new THREE.Box3().setFromObject(model);
		const currentHeight = box.max.y - box.min.y;

		if (currentHeight <= 0) {
			return;
		}

		const targetScaleFactor = modelScale;
		const normalizedBaseScale = model.scale.x / targetScaleFactor;

		model.scale.setScalar(normalizedBaseScale * modelScale);
		model.updateWorldMatrix(true, true);

		box = new THREE.Box3().setFromObject(model);
		model.position.y = -box.min.y;

		if (gridRef.current) {
			gridRef.current.position.y = model.position.y - 0.05;
		}
	}, [modelScale]);

	useEffect(() => {
		actionsRef.current.forEach((action) => {
			action.timeScale = timeScale;
		});
	}, [timeScale]);

	const switchAnimation = (index: number) => {
		actionsRef.current.forEach((action) => action.stop());
		actionsRef.current[index]?.reset().play();
		setCurrentAnimation(index);
	};

	return (
		<div
			style={{
				minHeight: '100vh',
				width: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '24px',
				boxSizing: 'border-box',
			}}
		>
			<div style={{ width: '50%' }}>
				<div
					style={{
						display: 'flex',
						gap: 8,
						marginBottom: 8,
						flexWrap: 'wrap',
						alignItems: 'center',
					}}
				>
					<button onClick={() => setPlaying((prev) => !prev)}>
						{playing ? '⏸ Пауза' : '▶ Play'}
					</button>

					<label
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 6,
							fontSize: 13,
						}}
					>
						Масштаб: {(modelScale * 100).toFixed(0)}%
						<input
							type="range"
							min={0.1}
							max={2}
							step={0.05}
							value={modelScale}
							onChange={(e) => setModelScale(parseFloat(e.target.value))}
							style={{ width: 100 }}
						/>
					</label>

					<label
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 6,
							fontSize: 13,
						}}
					>
						Скорость: {timeScale.toFixed(1)}x
						<input
							type="range"
							min={0.1}
							max={3}
							step={0.1}
							value={timeScale}
							onChange={(e) => setTimeScale(parseFloat(e.target.value))}
							style={{ width: 100 }}
						/>
					</label>

					{animations.map((name, index) => (
						<button
							key={index}
							onClick={() => switchAnimation(index)}
							style={{
								background: currentAnimation === index ? '#4CAF50' : '#333',
								color: 'white',
								border: 'none',
								padding: '8px 16px',
								borderRadius: 4,
								cursor: 'pointer',
								fontSize: 12,
							}}
						>
							{name}
						</button>
					))}
				</div>

				<div
					ref={containerRef}
					style={{
						width: '100%',
						height: 520,
						borderRadius: 8,
						background: '#0a0a0f',
						border: '1px solid #333',
					}}
				/>
			</div>
		</div>
	);
};

export default MixamoViewer;
