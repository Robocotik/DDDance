import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

type SkeletonData = {
    meta?: {
        fps?: number;
        num_frames?: number;
    };
    frames: Frame[];
};

// 🔹 Расширенное маппирование: MediaPipe индексы → Mixamo кости
const BONE_MAPPING: Record<number, string[]> = {
    0: ['mixamorig_Head'],           // нос/голова
    11: ['mixamorig_LeftShoulder'],  // левое плечо
    12: ['mixamorig_RightShoulder'], // правое плечо
    13: ['mixamorig_LeftArm'],       // левое предплечье (верх)
    14: ['mixamorig_RightArm'],      // правое предплечье (верх)
    15: ['mixamorig_LeftForeArm'],   // левое предплечье (низ)
    16: ['mixamorig_RightForeArm'],  // правое предплечье (низ)
    17: ['mixamorig_LeftHand'],      // левая кисть (minky)
    18: ['mixamorig_RightHand'],     // правая кисть (minky)
    19: ['mixamorig_LeftHand'],      // левая кисть (index)
    20: ['mixamorig_RightHand'],     // правая кисть (index)
    21: ['mixamorig_LeftHand'],      // левая кисть (thumb)
    22: ['mixamorig_RightHand'],     // правая кисть (thumb)
    23: ['mixamorig_LeftUpLeg'],     // левое бедро
    24: ['mixamorig_RightUpLeg'],    // правое бедро
    25: ['mixamorig_LeftLeg'],       // левое колено
    26: ['mixamorig_RightLeg'],      // правое колено
    27: ['mixamorig_LeftFoot'],      // левая стопа
    28: ['mixamorig_RightFoot'],     // правая стопа
};

// 🔹 Иерархия суставов для вычисления направлений
const JOINT_HIERARCHY: Record<number, number | null> = {
    11: 13, 13: 15, 15: 17, // Левая рука: плечо → локоть → запястье → кисть
    12: 14, 14: 16, 16: 18, // Правая рука
    23: 25, 25: 27,         // Левая нога: бедро → колено → стопа
    24: 26, 26: 28,         // Правая нога
    0: null,                // Голова (нет дочернего сустава в этом маппинге)
};

const AnimatedModelTest: React.FC = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const bonesRef = useRef<Record<string, THREE.Bone>>({});
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const animationRef = useRef<number | null>(null);
    const initializedRef = useRef(false);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const debugSpheresRef = useRef<THREE.Mesh[]>([]);

    const [frames, setFrames] = useState<Frame[]>([]);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [fps, setFps] = useState(30);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [status, setStatus] = useState('Загрузка...');
    const [useTestAnimation, setUseTestAnimation] = useState(true);
    const [modelScale, setModelScale] = useState(0.015);
    const [cameraDistance, setCameraDistance] = useState(3);
    const [showAxes, setShowAxes] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [debugMode, setDebugMode] = useState(true);

    // 🔹 FIX: Убраны пробелы в конце URL
    const TEST_SKELETON_URL = 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/results/510e9d81-47da-47de-8ced-5a5410599d43_result.json';

    // 🔹 Конвертация координат MediaPipe → Three.js
    const convertJointToThreeJS = useCallback((joint: Joint, positionScale = 1.0, yOffset = 0): THREE.Vector3 => {
        // MediaPipe: Y↑, Z→к камере
        // Three.js: Y↑, Z→от камеры
        return new THREE.Vector3(
            joint.x * positionScale,
            -joint.y * positionScale + yOffset,
            -joint.z * positionScale
        );
    }, []);

    // 🔹 Корректный поворот кости к целевой точке с учётом иерархии
    const rotateBoneTowards = useCallback((bone: THREE.Bone, targetWorldPos: THREE.Vector3): void => {
        // Получаем мировую позицию кости
        const boneWorldPos = new THREE.Vector3();
        bone.getWorldPosition(boneWorldPos);
        
        // Вектор направления
        const direction = new THREE.Vector3().subVectors(targetWorldPos, boneWorldPos).normalize();
        
        // Создаем целевое вращение
        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        
        // Конвертируем в локальное пространство кости
        const parentWorldQuat = new THREE.Quaternion();
        if (bone.parent) {
            bone.parent.getWorldQuaternion(parentWorldQuat);
            parentWorldQuat.invert();
        }
        
        const localQuaternion = parentWorldQuat.multiply(targetQuaternion);
        
        // Плавно интерполируем к целевому вращению (опционально)
        bone.quaternion.slerp(localQuaternion, 0.3);
    }, []);

    // 🔹 Применение позы к модели
    const applyPose = useCallback((frame: Frame, positionScale = 1.0, yOffset = 0): void => {
        if (!modelRef.current || Object.keys(bonesRef.current).length === 0) return;

        // 🔹 Кэш мировых позиций
        const jointPositions = new Map<number, THREE.Vector3>();
        frame.joints.forEach((joint, idx) => {
            if (joint.vis >= 0.3) {
                jointPositions.set(idx, convertJointToThreeJS(joint, positionScale, yOffset));
            }
        });

        let appliedCount = 0;

        // 🔹 Применяем к костям
        Object.entries(BONE_MAPPING).forEach(([jointIdxStr, boneNames]) => {
            const jointIdx = parseInt(jointIdxStr);
            const joint = frame.joints[jointIdx];
            if (!joint || joint.vis < 0.3) return;

            const targetPos = jointPositions.get(jointIdx);
            if (!targetPos) return;

            boneNames.forEach(boneName => {
                const bone = bonesRef.current[boneName];
                if (!bone) return;

                // 🔹 Для конечных точек: корректируем позицию (опционально)
                if (boneName.includes('Hand') || boneName.includes('Foot')) {
                    const localPos = targetPos.clone();
                    bone.parent?.worldToLocal(localPos);
                    bone.position.lerp(localPos, 0.2); // Плавная интерполяция
                }

                // 🔹 Поворачиваем к следующему суставу в иерархии
                const childIdx = JOINT_HIERARCHY[jointIdx];
                if (childIdx !== null && childIdx !== undefined && jointPositions.has(childIdx)) {
                    const childPos = jointPositions.get(childIdx)!;
                    rotateBoneTowards(bone, childPos);
                }

                appliedCount++;
            });
        });

        // 🔹 Особая обработка головы (смотрит на нос)
        const headBone = bonesRef.current['mixamorig_Head'];
        const noseJoint = frame.joints[0];
        if (headBone && noseJoint?.vis > 0.3) {
            const nosePos = jointPositions.get(0);
            if (nosePos) {
                rotateBoneTowards(headBone, nosePos);
            }
        }

        // 🔹 Обновляем матрицы только для изменённых костей
        modelRef.current?.updateMatrixWorld(true);
        
        if (debugMode && appliedCount > 0) {
            console.log(`🎯 Применено поз: ${appliedCount} костей`);
        }
    }, [convertJointToThreeJS, rotateBoneTowards, debugMode]);

    // 🔹 Инициализация сцены
    useEffect(() => {
        if (initializedRef.current || !containerRef.current) return;
        initializedRef.current = true;

        console.log('🎬 Инициализация Three.js сцены...');
        setStatus('Инициализация 3D сцены...');

        // Сцена
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0f);
        sceneRef.current = scene;

        // Камера
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
        camera.position.set(0, 1.2, cameraDistance);
        camera.lookAt(0, 0.8, 0);
        cameraRef.current = camera;

        // Рендерер
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Очистка контейнера
        while (containerRef.current?.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Контролы
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0.8, 0);
        controls.minDistance = 1.5;
        controls.maxDistance = 10;
        controlsRef.current = controls;

        // 🔹 Освещение (улучшенное)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 8, 5);
        mainLight.castShadow = true;
        scene.add(mainLight);
        
        const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
        fillLight.position.set(-4, 3, 4);
        scene.add(fillLight);
        
        const rimLight = new THREE.DirectionalLight(0xffaa88, 0.3);
        rimLight.position.set(0, 2, -5);
        scene.add(rimLight);

        // Сетка и пол
        const gridHelper = new THREE.GridHelper(10, 20, 0x4466aa, 0x223355);
        gridHelper.position.y = -0.6;
        gridHelper.visible = showGrid;
        scene.add(gridHelper);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 8),
            new THREE.MeshStandardMaterial({ 
                color: 0x1a2a4a, 
                side: THREE.DoubleSide, 
                transparent: true, 
                opacity: 0.15,
                roughness: 0.8
            })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.61;
        scene.add(floor);

        // Оси
        const axesHelper = new THREE.AxesHelper(1.5);
        axesHelper.visible = showAxes;
        scene.add(axesHelper);

        // Анимационный цикл
        const clock = new THREE.Clock();
        
        const animate = () => {
            animationRef.current = requestAnimationFrame(animate);
            
            const delta = clock.getDelta();
            
            // Обновляем миксер анимаций (если есть)
            if (mixerRef.current) {
                mixerRef.current.update(delta);
            }
            
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Загрузка модели
        console.log('🔄 Загрузка модели /YBot.glb...');
        setStatus('Загрузка 3D модели...');

        const loader = new GLTFLoader();
        loader.load(
            '/YBot.glb',
            (gltf) => {
                console.log('✅ Модель загружена');
                const model = gltf.scene;
                
                // Миксер для анимаций
                mixerRef.current = new THREE.AnimationMixer(model);
                
                // Настройка модели
                model.scale.setScalar(modelScale);
                model.position.set(0, -0.3, 0);
                model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material instanceof THREE.Material) {
                            (child.material as THREE.MeshStandardMaterial).roughness = 0.4;
                            (child.material as THREE.MeshStandardMaterial).metalness = 0.15;
                        }
                    }
                });

                // Сбор костей
                const boneList: string[] = [];
                model.traverse((child) => {
                    if (child instanceof THREE.Bone) {
                        bonesRef.current[child.name] = child;
                        boneList.push(child.name);
                    }
                });

                console.log(`🦴 Найдено костей: ${boneList.length}`);
                
                scene.add(model);
                modelRef.current = model;
                setModelLoaded(true);
                setStatus(`✅ Готово! Костей: ${boneList.length}`);
                
                // Отладочные сферы
                if (debugMode) {
                    addDebugSpheres(scene, bonesRef.current);
                }
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    setStatus(`📥 Загрузка: ${percent}%`);
                }
            },
            (error) => {
                console.error('❌ Ошибка загрузки модели:', error);
                setStatus(`❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`);
            }
        );

        // Ресайз
        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // 🔹 Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            
            // Очистка сфер отладки
            debugSpheresRef.current.forEach(sphere => sphere.geometry?.dispose());
            debugSpheresRef.current = [];
            
            if (rendererRef.current) {
                rendererRef.current.dispose();
                if (containerRef.current?.contains(rendererRef.current.domElement)) {
                    containerRef.current.removeChild(rendererRef.current.domElement);
                }
            }
            if (controlsRef.current) controlsRef.current.dispose();
            
            initializedRef.current = false;
            console.log('🧹 Three.js сцена очищена');
        };
    }, []); // Пустой массив зависимостей — запускается один раз

    // 🔹 Добавление отладочных сфер
    const addDebugSpheres = (scene: THREE.Scene, bones: Record<string, THREE.Bone>): void => {
        // Удаляем старые сферы
        debugSpheresRef.current.forEach(sphere => {
            sphere.geometry?.dispose();
            (sphere.material as THREE.Material)?.dispose();
            sphere.parent?.remove(sphere);
        });
        debugSpheresRef.current = [];

        const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xff44ff, 0x44ffff, 0xffff44];
        let idx = 0;
        
        Object.entries(bones).forEach(([name, bone]) => {
            if (name.includes('Shoulder') || name.includes('Arm') || name.includes('Leg') || name.includes('Head') || name.includes('Hand') || name.includes('Foot')) {
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(0.025, 12, 12),
                    new THREE.MeshStandardMaterial({ 
                        color: colors[idx % colors.length], 
                        emissive: 0x111111,
                        transparent: true,
                        opacity: 0.8
                    })
                );
                sphere.userData = { boneName: name };
                bone.add(sphere);
                debugSpheresRef.current.push(sphere);
                idx++;
            }
        });
        console.log(`🔴 Добавлено ${debugSpheresRef.current.length} отладочных сфер`);
    };

    // 🔹 Загрузка скелетной анимации
    useEffect(() => {
        const loadSkeleton = async () => {
            try {
                setStatus('📥 Загрузка анимации...');
                const response = await fetch(TEST_SKELETON_URL);
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                
                const data: SkeletonData = await response.json();
                
                if (!data.frames || data.frames.length === 0) {
                    throw new Error('Пустой массив кадров');
                }
                
                console.log(`✅ Анимация: ${data.frames.length} кадров, FPS: ${data.meta?.fps || 30}`);
                setFrames(data.frames);
                setFps(data.meta?.fps || 30);
                setStatus(`✅ Анимация: ${data.frames.length} кадров`);
            } catch (err) {
                console.error('❌ Ошибка анимации:', err);
                setStatus(`❌ Ошибка анимации: ${(err as Error).message}`);
            }
        };
        loadSkeleton();
    }, []);

    // 🔹 Тестовая анимация (через вращения, а не позиции)
    const applyTestAnimation = useCallback((): void => {
        if (!modelRef.current) return;
        const t = Date.now() / 1000;
        
        // Голова: плавное покачивание
        const head = bonesRef.current['mixamorig_Head'];
        if (head) {
            const targetRot = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(Math.sin(t * 0.7) * 0.15, Math.cos(t * 0.5) * 0.1, 0, 'XYZ')
            );
            head.quaternion.slerp(targetRot, 0.05);
        }
        
        // Руки: махи
        ['LeftArm', 'RightArm'].forEach((side, i) => {
            const bone = bonesRef.current[`mixamorig_${side}`];
            if (bone) {
                const sign = i === 0 ? 1 : -1;
                const targetRot = new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(0, 0, Math.sin(t * 2 + i) * 0.4 * sign, 'XYZ')
                );
                bone.quaternion.slerp(targetRot, 0.08);
            }
        });
        
        // Ноги: шаг на месте
        ['LeftLeg', 'RightLeg'].forEach((side, i) => {
            const bone = bonesRef.current[`mixamorig_${side}`];
            if (bone) {
                const sign = i === 0 ? 1 : -1;
                const targetRot = new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(Math.sin(t * 1.5 + i * Math.PI) * 0.3 * sign, 0, 0, 'XYZ')
                );
                bone.quaternion.slerp(targetRot, 0.1);
            }
        });
    }, []);

    // 🔹 Анимационный цикл
    useEffect(() => {
        if (!playing) return;

        if (useTestAnimation) {
            let rafId: number;
            const loop = () => {
                if (!playing || !useTestAnimation || !modelLoaded) return;
                applyTestAnimation();
                setCurrentFrame(prev => (prev + 1) % 360);
                rafId = requestAnimationFrame(loop);
            };
            rafId = requestAnimationFrame(loop);
            return () => cancelAnimationFrame(rafId);
        } else {
            if (frames.length === 0 || !modelLoaded) return;
            
            console.log(`▶️ Анимация: ${fps} FPS, ${frames.length} кадров`);
            const interval = setInterval(() => {
                setCurrentFrame(prev => {
                    const next = (prev + 1) % frames.length;
                    if (frames[next]) {
                        applyPose(frames[next], 1.0, 0);
                    }
                    return next;
                });
            }, 1000 / fps);
            
            return () => clearInterval(interval);
        }
    }, [playing, fps, modelLoaded, frames, useTestAnimation, applyPose, applyTestAnimation]);

    // 🔹 Применение первого кадра
    useEffect(() => {
        if (frames.length > 0 && modelLoaded && frames[0] && !useTestAnimation) {
            applyPose(frames[0], 1.0, 0);
            console.log('🎬 Применён кадр #0');
        }
    }, [frames, modelLoaded, useTestAnimation, applyPose]);

    // 🔹 Обновление масштаба модели
    useEffect(() => {
        if (modelRef.current) {
            modelRef.current.scale.setScalar(modelScale);
        }
    }, [modelScale]);

    // 🔹 Обновление камеры
    useEffect(() => {
        if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.set(0, 1.2, cameraDistance);
            controlsRef.current.target.set(0, 0.8, 0);
            controlsRef.current.update();
        }
    }, [cameraDistance]);

    // 🔹 Переключение осей/сетки
    useEffect(() => {
        if (!sceneRef.current) return;
        sceneRef.current.children.forEach(child => {
            if (child instanceof THREE.AxesHelper) child.visible = showAxes;
            if (child instanceof THREE.GridHelper) child.visible = showGrid;
        });
    }, [showAxes, showGrid]);

    // 🔹 Переключение дебаг-сфер
    useEffect(() => {
        if (!sceneRef.current || !modelRef.current) return;
        
        if (debugMode && Object.keys(bonesRef.current).length > 0) {
            addDebugSpheres(sceneRef.current, bonesRef.current);
        } else {
            // Скрыть/удалить сферы
            debugSpheresRef.current.forEach(sphere => {
                sphere.visible = false;
                sphere.parent?.remove(sphere);
            });
            debugSpheresRef.current = [];
        }
    }, [debugMode]);

    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#0a0a0f', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
            {/* Статус */}
            <div style={{
                position: 'absolute', top: 12, left: 12,
                background: 'rgba(10,15,25,0.92)', color: '#7f7',
                padding: '10px 14px', borderRadius: 8, zIndex: 100,
                fontFamily: 'monospace', fontSize: 12, pointerEvents: 'none',
                border: '1px solid #335', boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
            }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{status}</div>
                {modelLoaded && (
                    <div style={{ color: '#8cf' }}>
                        🦴 Костей: {Object.keys(bonesRef.current).length}<br/>
                        🎞 Кадр: {currentFrame}/{useTestAnimation ? 360 : frames.length}<br/>
                        🎮 {playing ? '▶ Играет' : '⏸ Пауза'}
                    </div>
                )}
            </div>

            {/* Панель управления */}
            <div style={{
                position: 'absolute', bottom: 16, left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15,20,35,0.95)', padding: '12px 18px',
                borderRadius: 10, zIndex: 100, display: 'flex', gap: '12px',
                alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center',
                border: '1px solid #335', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                fontSize: 13
            }}>
                <button onClick={() => setPlaying(p => !p)} 
                    style={{ padding: '6px 16px', background: playing ? '#e55' : '#5c5', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontWeight: 500, transition: 'background 0.2s' }}>
                    {playing ? '⏸ Пауза' : '▶ Старт'}
                </button>
                
                <button onClick={() => setUseTestAnimation(v => !v)} 
                    style={{ padding: '6px 14px', background: useTestAnimation ? '#fa5' : '#5af', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontWeight: 500 }}>
                    {useTestAnimation ? '🎭 ТЕСТ' : '🎯 ДАННЫЕ'}
                </button>
                
                <span style={{ color: '#aaa' }}>Кадр:</span>
                <input type="range" min={0} max={useTestAnimation ? 359 : (frames.length - 1 || 0)} 
                    value={currentFrame} onChange={(e) => { 
                        const idx = parseInt(e.target.value); 
                        setCurrentFrame(idx); 
                        setPlaying(false); 
                        if (!useTestAnimation && frames[idx]) applyPose(frames[idx], 1.0, 0); 
                    }}
                    style={{ width: '140px', accentColor: '#6af' }} />
                <span style={{ color: '#fff', minWidth: 50, textAlign: 'center' }}>{currentFrame}</span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#aaa' }}>📏 Масштаб:</span>
                    <input type="range" min={0.008} max={0.04} step={0.002} value={modelScale}
                        onChange={(e) => setModelScale(parseFloat(e.target.value))} 
                        style={{ width: '90px', accentColor: '#6af' }} />
                    <span style={{ color: '#fff', width: 45 }}>{modelScale.toFixed(3)}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#aaa' }}>📷 Камера:</span>
                    <input type="range" min={1.5} max={10} step={0.3} value={cameraDistance}
                        onChange={(e) => setCameraDistance(parseFloat(e.target.value))} 
                        style={{ width: '90px', accentColor: '#6af' }} />
                    <span style={{ color: '#fff', width: 35 }}>{cameraDistance.toFixed(1)}</span>
                </div>
                
                <button onClick={() => setShowAxes(v => !v)} 
                    style={{ padding: '5px 10px', background: showAxes ? '#468' : '#334', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer' }} title="Оси координат">
                    🎯
                </button>
                <button onClick={() => setShowGrid(v => !v)} 
                    style={{ padding: '5px 10px', background: showGrid ? '#468' : '#334', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer' }} title="Сетка">
                    ▦
                </button>
                <button onClick={() => setDebugMode(v => !v)} 
                    style={{ padding: '5px 10px', background: debugMode ? '#468' : '#334', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer' }} title="Отладочные сферы">
                    🔴
                </button>
                
                <span title={modelLoaded ? 'Модель загружена' : 'Загрузка...'} 
                    style={{ color: modelLoaded ? '#7f7' : '#f77', fontSize: 16, fontWeight: 'bold' }}>
                    {modelLoaded ? '●' : '○'}
                </span>
            </div>

            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default AnimatedModelTest;