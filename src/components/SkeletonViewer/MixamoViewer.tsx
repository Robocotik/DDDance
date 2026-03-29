// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MixamoViewer: React.FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const mixerRef = useRef<THREE.AnimationMixer | null>(null);
	const actionsRef = useRef<THREE.AnimationAction[]>([]);
	const modelRef = useRef<THREE.Group | null>(null);

	const [playing, setPlaying] = useState(true);
	const [animations, setAnimations] = useState<string[]>([]);
	const [currentAnimation, setCurrentAnimation] = useState(0);

	// 🔹 Новые состояния для управления
	const [modelScale, setModelScale] = useState(1.0);
	const [timeScale, setTimeScale] = useState(1.0);

	useEffect(() => {
		const container = containerRef.current;

		if (!container) {
			return;
		}

		let isDestroyed = false;
		let animationId: number;
		const clock = new THREE.Clock();

		// Сцена
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0a0a0f);
		scene.fog = new THREE.FogExp2(0x0a0a0f, 0.006);

		// Камера
		const camera = new THREE.PerspectiveCamera(
			45,
			container.clientWidth / container.clientHeight,
			0.1,
			1000,
		);

		camera.position.set(0, 1.2, 3.5);
		camera.lookAt(0, 1.0, 0);

		// Рендерер
		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.shadowMap.enabled = true;
		container.appendChild(renderer.domElement);

		// Контролы
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.target.set(0, 1.0, 0);

		// Свет
		scene.add(new THREE.AmbientLight(0xffffff, 0.6));
		const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
		dirLight.position.set(2, 4, 2);
		dirLight.castShadow = true;
		scene.add(dirLight);
		scene.add(new THREE.PointLight(0x4466cc, 0.4, 10));

		// Сетка для ориентира
		const grid = new THREE.GridHelper(4, 20, 0x335588, 0x1e1e2e);
		grid.position.y = -0.8;
		scene.add(grid);

		// Загрузка модели с анимацией
		const loader = new GLTFLoader();
		loader.load('/dddance.glb', (gltf) => {
			const model = gltf.scene;
			modelRef.current = model;

			// Получаем оригинальный bounding box
			let box = new THREE.Box3().setFromObject(model);
			const originalHeight = box.max.y - box.min.y;

			// Вычисляем правильный масштаб
			const TARGET_HEIGHT = 1.7; // желаемая высота в метрах
			const scale = TARGET_HEIGHT / originalHeight;

			//  Применяем масштаб
			model.scale.setScalar(scale);
			model.updateWorldMatrix(true, true);

			// Вычисляем новый bounding box
			box = new THREE.Box3().setFromObject(model);
			const finalHeight = box.max.y - box.min.y;
			const lowestPoint = box.min.y;
			model.position.y = -lowestPoint;

			scene.add(model);

			const groundLevel = model.position.y;

			const gridHelper = scene.children.find(
				(child) => child instanceof THREE.GridHelper,
			);

			if (gridHelper) {
				gridHelper.position.y = groundLevel - 0.05;
			} else {
				const newGrid = new THREE.GridHelper(4, 20, 0x88aaff, 0x335588);
				newGrid.position.y = groundLevel - 0.05;
				scene.add(newGrid);
			}

			if (gltf.animations && gltf.animations.length > 0) {
				mixerRef.current = new THREE.AnimationMixer(model);

				const actionNames = gltf.animations.map(
					(clip, i) => clip.name || `Animation ${i}`,
				);

				setAnimations(actionNames);

				// Создаём действия для всех анимаций
				actionsRef.current = gltf.animations.map((clip) => {
					const action = mixerRef.current!.clipAction(clip);
					action.clampWhenFinished = false;
					action.loop = THREE.LoopRepeat;
					// Применяем текущую скорость времени
					action.timeScale = timeScale;
					return action;
				});

				actionsRef.current[0]?.play();
			}
		});

		const animate = () => {
			if (isDestroyed) {
				return;
			}

			const delta = clock.getDelta();

			if (playing && mixerRef.current) {
				mixerRef.current.update(delta * timeScale);
			}

			controls.update();
			renderer.render(scene, camera);
			animationId = requestAnimationFrame(animate);
		};

		animate();

		// Cleanup
		return () => {
			isDestroyed = true;
			cancelAnimationFrame(animationId);
			controls.dispose();
			renderer.dispose();

			if (container.contains(renderer.domElement)) {
				container.removeChild(renderer.domElement);
			}
		};
	}, [playing, modelScale, timeScale]);

	const handleScaleChange = (value: number) => {
		setModelScale(value);

		if (modelRef.current) {
			modelRef.current.scale.setScalar(value);
		}
	};

	const handleTimeScaleChange = (value: number) => {
		setTimeScale(value);
		actionsRef.current.forEach((action) => {
			action.timeScale = value;
		});
	};

	// Переключение анимации
	const switchAnimation = (index: number) => {
		actionsRef.current.forEach((action) => action.stop());
		actionsRef.current[index]?.play();
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
					<button onClick={() => setPlaying(!playing)}>
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
							onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
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
							onChange={(e) =>
								handleTimeScaleChange(parseFloat(e.target.value))
							}
							style={{ width: 100 }}
						/>
					</label>

					{animations.map((name, i) => (
						<button
							key={i}
							onClick={() => switchAnimation(i)}
							style={{
								background: currentAnimation === i ? '#4CAF50' : '#333',
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
