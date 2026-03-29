// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SegmentBar } from './SegmentBar';
import styles from './SkeletonViewer.module.scss';

import { useSelector } from 'react-redux';
import { selectVideoResult } from '../../redux/features/video/selectors';

type Joint = {
	x: number;
	y: number;
	z: number;
	vis: number;
};

type Frame = {
	frame_idx: number;
	timestamp_ms: number;
	joints: Joint[];
};

type Segment = {
	index: number;
	label: string;
	start_frame: number;
	end_frame: number;
	start_ms: number;
	end_ms: number;
	duration_ms: number;
	duration_sec: number;
	num_frames: number;
};

type SkeletonData = {
	meta?: {
		fps?: number;
		num_frames?: number;
		duration_sec?: number;
	};
	joint_names: string[];
	connections: [number, number][];
	frames: Frame[];
	segments?: Segment[];
};

const SkeletonViewer: React.FC = () => {
	const TEST_MODE = true;

	const containerRef = useRef<HTMLDivElement | null>(null);
	const frameIdxRef = useRef(0);

	const [status, setStatus] = useState('Загрузка...');
	const [currentFile, setCurrentFile] = useState<string | null>(
		'/skeleton.json',
	);

	const [playing, setPlaying] = useState(true);
	const [speed, setSpeed] = useState(1.0);
	const [currentFrame, setCurrentFrame] = useState(0);
	const [totalFrames, setTotalFrames] = useState(0);
	const [segmentsData, setSegmentsData] = useState<Segment[]>([]);

	const result = useSelector(selectVideoResult);

	useEffect(() => {
		if (result?.result_key) {
			const fileUrl =
				'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/' +
				result.result_key;

			setCurrentFile(fileUrl);
			setStatus(`Загрузка ${fileUrl}...`);
		}
	}, [result]);

	useEffect(() => {
		const container = containerRef.current;

		if (!container) {
			return;
		}

		let isDestroyed = false;
		let animationId: number;
		let lastTime = 0;
		let currentFrameIdx = 0;
		let fps = 30;
		let totalFramesCount = 0;
		let framesData: Frame[] = [];
		let connections: [number, number][] = [];

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0a0a0f);
		scene.fog = new THREE.FogExp2(0x0a0a0f, 0.008);

		const camera = new THREE.PerspectiveCamera(
			45,
			container.clientWidth / container.clientHeight,
			0.1,
			1000,
		);

		camera.position.set(1.5, 1.2, 2.5);
		camera.lookAt(0, 0.5, 0);

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		container.appendChild(renderer.domElement);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.rotateSpeed = 1.0;
		controls.zoomSpeed = 1.2;
		controls.target.set(0, 0.8, 0);

		const ambientLight = new THREE.AmbientLight(0x404060);
		scene.add(ambientLight);

		const mainLight = new THREE.DirectionalLight(0xffffff, 1);
		mainLight.position.set(1, 2, 1);
		mainLight.castShadow = true;
		scene.add(mainLight);

		const fillLight = new THREE.PointLight(0x4466cc, 0.3);
		fillLight.position.set(0, 1, 1);
		scene.add(fillLight);

		const backLight = new THREE.PointLight(0xffaa66, 0.2);
		backLight.position.set(0, 1, -1);
		scene.add(backLight);

		const gridHelper = new THREE.GridHelper(3, 20, 0x335588, 0x1e1e2e);
		gridHelper.position.y = -0.8;
		scene.add(gridHelper);

		let lines: THREE.Line[] = [];
		let spheres: THREE.Mesh[] = [];

		const getConnectionColor = (from: number, to: number): number => {
			if ((from === 11 || to === 11) && (from === 12 || to === 12)) {
				return 0x44aaff;
			}

			if (from === 23 || to === 23 || from === 24 || to === 24) {
				return 0x44aaff;
			}

			if (from === 13 || to === 13 || from === 15 || to === 15) {
				return 0x44ffaa;
			}

			if (from === 14 || to === 14 || from === 16 || to === 16) {
				return 0xffaa44;
			}

			if (from === 25 || to === 25 || from === 27 || to === 27) {
				return 0xff44aa;
			}

			if (from === 26 || to === 26 || from === 28 || to === 28) {
				return 0xaa44ff;
			}

			if (from === 0 || to === 0) {
				return 0xff44ff;
			}
			return 0x88aaff;
		};

		const createSkeleton = (joints: THREE.Vector3[]) => {
			lines.forEach((line) => scene.remove(line));
			spheres.forEach((sphere) => scene.remove(sphere));
			lines = [];
			spheres = [];

			if (!joints.length) {
				return;
			}

			joints.forEach((pos) => {
				const geometry = new THREE.SphereGeometry(0.025, 16, 16);
				const material = new THREE.MeshStandardMaterial({
					color: 0x7c6af7,
					emissive: 0x221166,
					roughness: 0.3,
					metalness: 0.1,
				});

				const sphere = new THREE.Mesh(geometry, material);
				sphere.position.copy(pos);
				scene.add(sphere);
				spheres.push(sphere);
			});

			connections.forEach(([from, to]) => {
				if (from < joints.length && to < joints.length) {
					const points = [joints[from], joints[to]];
					const geometry = new THREE.BufferGeometry().setFromPoints(points);
					const color = getConnectionColor(from, to);
					const material = new THREE.LineBasicMaterial({ color });
					const line = new THREE.Line(geometry, material);
					scene.add(line);
					lines.push(line);
				}
			});
		};

		const convertJoints = (frame: Frame): THREE.Vector3[] => {
			const leftHip = frame.joints[23];
			const rightHip = frame.joints[24];
			const center = {
				x: (leftHip.x + rightHip.x) / 2,
				y: (leftHip.y + rightHip.y) / 2,
				z: (leftHip.z + rightHip.z) / 2,
			};

			const scaleXY = 1.5;
			const scaleZ = 0.5;

			return frame.joints.map(
				(joint) =>
					new THREE.Vector3(
						(joint.x - center.x) * scaleXY,
						-(joint.y - center.y) * scaleXY,
						(joint.z - center.z) * scaleZ,
					),
			);
		};

		const loadData = async (fileUrl: string) => {
			setStatus(`Загрузка ${fileUrl}...`);

			try {
				const url = fileUrl.startsWith('http')
					? fileUrl.trim()
					: `/${fileUrl.replace(/^\/+/, '')}`;

				console.log('Загрузка данных по URL:', url);
				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data: SkeletonData = await response.json();

				framesData = data.frames;
				connections = data.connections;
				totalFramesCount = framesData.length;
				fps = data.meta?.fps || 30;

				setTotalFrames(totalFramesCount);
				setCurrentFrame(0);
				setSegmentsData(data.segments || []);
				currentFrameIdx = 0;
				frameIdxRef.current = 0;

				setStatus(
					`Готово: ${totalFramesCount} кадров, ${Math.round(fps)} FPS${data.segments?.length ? `, ${data.segments.length} сегментов` : ''}`,
				);
			} catch (err) {
				setStatus(
					`Ошибка: ${err instanceof Error ? err.message : String(err)}`,
				);

				console.error(err);
			}
		};

		const updateFrame = (frameIndex: number) => {
			if (!framesData.length) {
				return;
			}

			const frame = framesData[Math.min(frameIndex, framesData.length - 1)];
			const positions = convertJoints(frame);
			createSkeleton(positions);
			setCurrentFrame(frameIndex);
		};

		const animate = (time: number) => {
			if (isDestroyed) {
				return;
			}

			if (playing && framesData.length) {
				if (lastTime === 0) {
					lastTime = time;
				}
				const delta = Math.min(0.033, (time - lastTime) / 1000);
				lastTime = time;

				currentFrameIdx += delta * fps * speed;

				if (currentFrameIdx >= framesData.length) {
					currentFrameIdx = 0;
				}

				if (currentFrameIdx < 0) {
					currentFrameIdx = 0;
				}

				frameIdxRef.current = Math.floor(currentFrameIdx);
				updateFrame(Math.floor(currentFrameIdx));
			} else if (!playing && framesData.length) {
				if (frameIdxRef.current !== Math.floor(currentFrameIdx)) {
					currentFrameIdx = frameIdxRef.current;
					updateFrame(Math.floor(currentFrameIdx));
				}
			}

			controls.update();
			renderer.render(scene, camera);
			animationId = requestAnimationFrame(animate);
		};

		const init = async () => {
			if (currentFile) {
				await loadData(currentFile);

				if (framesData.length) {
					updateFrame(0);
				}
			} else {
				setStatus('Нет файла для загрузки');
			}

			lastTime = 0;
			animationId = requestAnimationFrame(animate);
		};

		init();

		const resizeObserver = new ResizeObserver(() => {
			camera.aspect = container.clientWidth / container.clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(container.clientWidth, container.clientHeight);
		});

		resizeObserver.observe(container);

		return () => {
			isDestroyed = true;
			cancelAnimationFrame(animationId);
			resizeObserver.disconnect();
			controls.dispose();
			renderer.dispose();

			if (container && renderer.domElement) {
				container.removeChild(renderer.domElement);
			}
		};
	}, [currentFile, playing, speed]);

	if (!result && !TEST_MODE) {
		return <></>;
	}

	return (
		<section className={styles.section}>
			<h2 className={styles.title}>3D Skeleton Viewer</h2>
			<p className={styles.subtitle}>
				ЛКМ — вращение | ПКМ — панорама | Колесо — зум
			</p>
			<div className={styles.status}>{status}</div>

			<div className={styles.controls}>
				<div className={styles.playbackControls}>
					<button onClick={() => setPlaying(!playing)}>
						{playing ? '⏸ Пауза' : '▶ Воспроизвести'}
					</button>
					<button
						onClick={() => {
							setPlaying(false);
							setCurrentFrame(0);
							frameIdxRef.current = 0;
						}}
					>
						⏮ Сброс
					</button>

					<div className={styles.sliderGroup}>
						<span>
							Кадр: {currentFrame} / {totalFrames}
						</span>
						<input
							type="range"
							min={0}
							max={totalFrames - 1 || 0}
							value={currentFrame}
							onChange={(e) => {
								const idx = parseInt(e.target.value);
								setPlaying(false);
								setCurrentFrame(idx);
								frameIdxRef.current = idx;
							}}
						/>
					</div>

					<div className={styles.sliderGroup}>
						<span>Скорость: {speed.toFixed(1)}x</span>
						<input
							type="range"
							min={0.1}
							max={3}
							step={0.1}
							value={speed}
							onChange={(e) => setSpeed(parseFloat(e.target.value))}
						/>
					</div>
				</div>
			</div>

			<div className={styles.frame}>
				<div ref={containerRef} className={styles.canvasHost} />
			</div>

			<SegmentBar
				segments={segmentsData}
				currentFrame={currentFrame}
				totalFrames={totalFrames}
				onSegmentClick={(startFrame) => {
					setPlaying(false);
					setCurrentFrame(startFrame);
					frameIdxRef.current = startFrame;
				}}
			/>
		</section>
	);
};

export default SkeletonViewer;
