// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { S3_ADDRESS } from '../../consts/urls';
import type { UploadLessonResult } from '../../redux/features/lesson/actions';

type Segment = {
	index: number;
	label?: string;
	start_frame: number;
	end_frame: number;
	llm_description?: string;
	features?: string;
	duration_sec?: number;
	start_ms?: number;
	end_ms?: number;
	duration_ms?: number;
	num_frames?: number;
};

type MixamoViewerProps = {
	result: UploadLessonResult | null;
};

const TARGET_HEIGHT = 1.7;
const DEFAULT_CHARACTER_KEY = 'blender_data/character.glb';

const FPS = 30;
const getSegmentDuration = (seg: Segment): number => {
	if (seg.duration_sec != null) return seg.duration_sec;
	return (seg.end_frame - seg.start_frame) / FPS;
};

const resolveAssetPath = (
	key: string | undefined,
	s3Base?: string,
): string | null => {
	if (!key) return null;
	const base = (s3Base || S3_ADDRESS || '').replace(/\/+$/, '');
	const cleanKey = key.replace(/^\/+/, '');
	return `${base}/${cleanKey}`;
};

const MixamoViewer: React.FC<MixamoViewerProps> = ({ result }) => {
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
	const loadedClipsRef = useRef<Map<number, THREE.AnimationClip>>(new Map());

	const rootBoneRef = useRef<THREE.Object3D | null>(null);
	const rootInitPosRef = useRef<THREE.Vector3 | null>(null);

	const loadSegmentAnimationRef = useRef<((idx: number) => void) | null>(null);
	const getSegmentUrlRef = useRef<((idx: number) => string | null) | null>(null);

	const [segments, setSegments] = useState<Segment[]>([]);
	const [currentSegmentIdx, setCurrentSegmentIdx] = useState<number | null>(null);
	const [playing, setPlaying] = useState(false);
	const [timeScale, setTimeScale] = useState(1);
	const [currentTime, setCurrentTime] = useState(0);
	const [loadingCharacter, setLoadingCharacter] = useState(true);
	const [loadingSegment, setLoadingSegment] = useState(false);
	const [loadingFullVideo, setLoadingFullVideo] = useState(false);
	const [characterLoadError, setCharacterLoadError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const playingRef = useRef(playing);
	const timeScaleRef = useRef(timeScale);
	const currentSegmentIdxRef = useRef(currentSegmentIdx);
	const segmentsRef = useRef<Segment[]>([]);

	useEffect(() => { playingRef.current = playing; }, [playing]);
	useEffect(() => { timeScaleRef.current = timeScale; }, [timeScale]);
	useEffect(() => { currentSegmentIdxRef.current = currentSegmentIdx; }, [currentSegmentIdx]);
	useEffect(() => { segmentsRef.current = segments; }, [segments]);

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
			if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
			cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
			cameraRef.current.updateProjectionMatrix();
			rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
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
					setCurrentTime(action.time * 1000);
				}

				if (rootBoneRef.current && rootInitPosRef.current && characterRef.current) {
					const rootDelta = new THREE.Vector3();
					rootDelta.subVectors(rootBoneRef.current.position, rootInitPosRef.current);
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
						while (rootBone.children.length > 0 && (rootBone.children[0] as any).isBone) {
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
			if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
			controls.dispose();
			renderer.dispose();
			if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
			sceneRef.current = null;
			cameraRef.current = null;
			rendererRef.current = null;
			controlsRef.current = null;
			characterRef.current = null;
			armatureRef.current = null;
			mixerRef.current = null;
			currentActionRef.current = null;
			loadedClipsRef.current.clear();
		};
	}, []);

	useEffect(() => {
		if (!result?.segments_key) return;

		const segmentsUrl = resolveAssetPath(result.segments_key);
		if (!segmentsUrl) return;

		let cancelled = false;

		fetch(segmentsUrl)
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (cancelled) return;
				if (Array.isArray(data?.segments)) {
					setSegments(data.segments);
				} else {
					throw new Error('No "segments" array in response');
				}
			})
			.catch((e) => {
				if (cancelled) return;
				setError(`Не удалось загрузить сегменты: ${e.message}`);
			});

		return () => { cancelled = true; };
	}, [result?.segments_key]);

	useEffect(() => {
		if (loadingCharacter || !mixerRef.current || !characterRef.current) return;
		if (!result?.full_glb_key) return;

		const fullVideoUrl = resolveAssetPath(result.full_glb_key);
		if (!fullVideoUrl) return;

		let cancelled = false;
		setLoadingFullVideo(true);

		const loader = new GLTFLoader();
		loader.load(
			fullVideoUrl,
			(gltf) => {
				if (cancelled) return;
				if (!gltf.animations?.length) {
					setLoadingFullVideo(false);
					return;
				}
				const clip = gltf.animations[0];
				loadedClipsRef.current.set(-1, clip);
				playFullVideoClip(clip);
				setLoadingFullVideo(false);
			},
			undefined,
			() => {
				if (cancelled) return;
				setLoadingFullVideo(false);
				setError('Не удалось загрузить полное видео');
			},
		);

		return () => { cancelled = true; };
	}, [loadingCharacter, result?.full_glb_key]);

	const playFullVideoClip = useCallback((clip: THREE.AnimationClip) => {
		const mixer = mixerRef.current;
		const target = armatureRef.current || characterRef.current;
		if (!mixer || !target) return;

		if (currentActionRef.current) currentActionRef.current.stop();

		const action = mixer.clipAction(clip, target);
		action.reset();
		action.clampWhenFinished = true;
		action.loop = THREE.LoopOnce;
		action.timeScale = timeScaleRef.current;

		if (rootBoneRef.current) rootInitPosRef.current = rootBoneRef.current.position.clone();

		action.play();
		currentActionRef.current = action;

		setCurrentSegmentIdx(null);
		currentSegmentIdxRef.current = null;
		setCurrentTime(0);
		setPlaying(true);
	}, []);

	const playClip = useCallback((clip: THREE.AnimationClip, segIdx: number) => {
		const mixer = mixerRef.current;
		const target = armatureRef.current || characterRef.current;
		if (!mixer || !target) return;

		if (currentActionRef.current) currentActionRef.current.stop();

		const action = mixer.clipAction(clip, target);
		action.reset();
		action.clampWhenFinished = false;
		action.loop = THREE.LoopRepeat;
		action.timeScale = timeScaleRef.current;

		if (rootBoneRef.current) rootInitPosRef.current = rootBoneRef.current.position.clone();

		action.play();
		currentActionRef.current = action;

		setCurrentSegmentIdx(segIdx);
		currentSegmentIdxRef.current = segIdx;
		setCurrentTime(0);
		setPlaying(true);
	}, []);

	const getSegmentUrl = useCallback(
		(segIdx: number): string | null => {
			const key = (result?.glb_keys ?? [])[segIdx];
			if (!key) return null;
			return resolveAssetPath(key);
		},
		[result?.glb_keys],
	);

	const loadSegmentAnimation = useCallback(
		(segIdx: number) => {
			const mixer = mixerRef.current;
			const character = characterRef.current;
			if (!mixer || !character) return;

			const url = getSegmentUrl(segIdx);
			if (!url) {
				setError(`Анимация для сегмента ${segIdx + 1} недоступна`);
				return;
			}

			if (loadedClipsRef.current.has(segIdx)) {
				playClip(loadedClipsRef.current.get(segIdx)!, segIdx);
				return;
			}

			setLoadingSegment(true);

			const loader = new GLTFLoader();
			loader.load(
				url,
				(gltf) => {
					if (!gltf.animations?.length) {
						setLoadingSegment(false);
						return;
					}
					const clip = gltf.animations[0];
					loadedClipsRef.current.set(segIdx, clip);
					playClip(clip, segIdx);
					setLoadingSegment(false);
				},
				undefined,
				() => {
					setLoadingSegment(false);
					setError('Не удалось загрузить анимацию сегмента');
				},
			);
		},
		[playClip, getSegmentUrl],
	);

	useEffect(() => { loadSegmentAnimationRef.current = loadSegmentAnimation; }, [loadSegmentAnimation]);
	useEffect(() => { getSegmentUrlRef.current = getSegmentUrl; }, [getSegmentUrl]);

	useEffect(() => {
		if (!currentActionRef.current) return;
		currentActionRef.current.paused = !playing;
	}, [playing]);

	useEffect(() => {
		if (currentActionRef.current) currentActionRef.current.timeScale = timeScale;
	}, [timeScale]);

	const handlePlayFullVideo = useCallback(() => {
		if (!result?.full_glb_key) {
			setError('Полное видео недоступно');
			return;
		}

		const fullVideoUrl = resolveAssetPath(result.full_glb_key);
		if (!fullVideoUrl) {
			setError('Неверный путь к полному видео');
			return;
		}

		if (loadedClipsRef.current.has(-1)) {
			playFullVideoClip(loadedClipsRef.current.get(-1)!);
			return;
		}

		setLoadingFullVideo(true);
		const loader = new GLTFLoader();
		loader.load(
			fullVideoUrl,
			(gltf) => {
				if (!gltf.animations?.length) {
					setLoadingFullVideo(false);
					return;
				}
				const clip = gltf.animations[0];
				loadedClipsRef.current.set(-1, clip);
				playFullVideoClip(clip);
				setLoadingFullVideo(false);
			},
			undefined,
			() => {
				setLoadingFullVideo(false);
				setError('Не удалось загрузить полное видео');
			},
		);
	}, [result?.full_glb_key, playFullVideoClip]);

	const totalDuration = segments.reduce((acc, s) => acc + getSegmentDuration(s), 0);

	return (
		<>
			{(loadingCharacter || characterLoadError) && (
				<div style={{
					position: 'fixed', inset: 0, display: 'flex',
					alignItems: 'center', justifyContent: 'center',
					background: '#05050a', color: '#fff', zIndex: 10,
				}}>
					<div style={{ textAlign: 'center' }}>
						{loadingCharacter ? (
							<>
								<div style={{ fontSize: 18, marginBottom: 16 }}>Загрузка персонажа...</div>
								<div style={{ fontSize: 14, color: '#aaa' }}>Пожалуйста, подождите</div>
							</>
						) : (
							<>
								<div style={{ fontSize: 18, marginBottom: 16, color: '#ff6b6b' }}>Ошибка загрузки</div>
								<div style={{ fontSize: 14, color: '#aaa' }}>{characterLoadError}</div>
								<button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '8px 16px', cursor: 'pointer' }}>
									Попробовать снова
								</button>
							</>
						)}
					</div>
				</div>
			)}

			<div style={{
				minHeight: '100vh', width: '100%', display: 'flex',
				alignItems: 'center', justifyContent: 'center',
				padding: 24, boxSizing: 'border-box',
				background: '#05050a', color: '#fff',
			}}>
				<div style={{ width: '50%', maxWidth: 900 }}>
					<div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
						<button
							onClick={() => setPlaying((p) => !p)}
							style={{ padding: '6px 12px', cursor: 'pointer' }}
							disabled={!currentActionRef.current}
						>
							{playing ? 'Пауза' : 'Play'}
						</button>

						<button
							onClick={handlePlayFullVideo}
							style={{
								padding: '6px 12px', cursor: result?.full_glb_key ? 'pointer' : 'not-allowed',
								background: '#4a6fa5', color: 'white', border: 'none', borderRadius: 4,
							}}
							disabled={!result?.full_glb_key || loadingFullVideo}
						>
							{loadingFullVideo ? 'Загрузка...' : 'Полное видео'}
						</button>

						<label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
							Скорость: {timeScale.toFixed(1)}x
							<input
								type="range" min={0.1} max={3} step={0.1} value={timeScale}
								onChange={(e) => setTimeScale(parseFloat(e.target.value))}
								style={{ width: 100 }}
							/>
						</label>

						{loadingSegment && <span style={{ fontSize: 12, color: '#aaa' }}>Загрузка сегмента...</span>}
						{loadingFullVideo && <span style={{ fontSize: 12, color: '#aaa' }}>Загрузка полного видео...</span>}
						{error && <span style={{ fontSize: 12, color: '#ff6b6b' }}>{error}</span>}
					</div>

					<div ref={containerRef} style={{
						width: '100%', height: 520, borderRadius: 8,
						background: '#0a0a0f', border: '1px solid #333',
					}} />

					{segments.length > 0 && (
						<div style={{ marginTop: 16 }}>
							<div style={{
								display: 'flex', justifyContent: 'space-between', alignItems: 'center',
								marginBottom: 8, color: '#aaa', fontSize: 13,
							}}>
								<span>Сегменты ({segments.length})</span>
								<span style={{ fontSize: 11, opacity: 0.7 }}>
									{currentSegmentIdx !== null && segments[currentSegmentIdx]
										? `${(currentTime / 1000).toFixed(1)}с / ${getSegmentDuration(segments[currentSegmentIdx]).toFixed(1)}с`
										: `0.0с / ${totalDuration.toFixed(1)}с`}
								</span>
							</div>

							<div style={{
								display: 'flex', flexDirection: 'column', gap: 4,
								maxHeight: 200, overflowY: 'auto', paddingRight: 4,
							}}>
								{segments.map((seg) => {
									const isActive = seg.index === currentSegmentIdx;
									const hasAnim = !!getSegmentUrl(seg.index);
									return (
										<button
											key={seg.index}
											onClick={() => hasAnim && loadSegmentAnimation(seg.index)}
											disabled={!hasAnim}
											style={{
												background: isActive ? '#4CAF50' : '#2a2a4e',
												color: hasAnim ? 'white' : '#666',
												border: '1px solid ' + (isActive ? '#66bb6a' : '#444'),
												padding: '8px 12px', borderRadius: 6,
												cursor: hasAnim ? 'pointer' : 'not-allowed',
												textAlign: 'left', display: 'flex',
												justifyContent: 'space-between', alignItems: 'center',
												fontSize: 13, opacity: hasAnim ? 1 : 0.5,
											}}
										>
											<span style={{ fontWeight: isActive ? 600 : 400 }}>
												{seg.index + 1}. {seg.label ?? `Сегмент ${seg.index + 1}`}
												{!hasAnim && ' (нет)'}
											</span>
											<span style={{ opacity: 0.7, fontSize: 11 }}>
												{getSegmentDuration(seg).toFixed(1)}с
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default MixamoViewer;