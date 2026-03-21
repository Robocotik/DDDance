import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import styles from './SkeletonViewer.module.scss';

type SkeletonJoint = {
	x: number;
	y: number;
	z: number;
	vis?: number;
};

type SkeletonFrame = {
	frame_idx: number;
	timestamp_ms: number;
	joints: SkeletonJoint[];
};

type SkeletonData = {
	meta?: {
		fps?: number;
	};
	joint_names: string[];
	frames: SkeletonFrame[];
};

type BVHData = {
	bone_name: string[];
	root_positions: number[][];
	rotations: number[][][];
};

type BoneCalibration = {
	invertX: boolean;
	invertY: boolean;
	invertZ: boolean;
	swapYZ: boolean;
	scale: number;
};

const isSkeletonData = (value: unknown): value is SkeletonData => {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const candidate = value as Partial<SkeletonData>;
	return (
		Array.isArray(candidate.joint_names) && Array.isArray(candidate.frames)
	);
};

const isBVHData = (value: unknown): value is BVHData => {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const candidate = value as Partial<BVHData>;
	return (
		Array.isArray(candidate.bone_name) &&
		Array.isArray(candidate.root_positions) &&
		Array.isArray(candidate.rotations)
	);
};

const MODEL_URLS = [
	'https://models.readyplayer.me/67be034c9fab1c21c486eb14.glb',
	'/models/avatar.glb',
	'https://rawcdn.githack.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb',
	'https://rawcdn.githack.com/mrdoob/three.js/r146/examples/models/gltf/Soldier.glb',
];

const hierarchy: Record<string, string> = {
	Spine1: 'Hips',
	Spine2: 'Spine1',
	Neck: 'Spine2',
	Head: 'Neck',
	LeftForeArm: 'LeftArm',
	LeftHand: 'LeftForeArm',
	RightArm: 'Neck',
	RightForeArm: 'RightArm',
	RightHand: 'RightForeArm',
	LeftUpLeg: 'Hips',
	LeftLeg: 'LeftUpLeg',
	LeftFoot: 'LeftLeg',
	RightUpLeg: 'Hips',
	RightLeg: 'RightUpLeg',
	RightFoot: 'RightLeg',
};

const boneAliases: Record<string, string[]> = {
	Hips: ['hips', 'pelvis', 'skeletontorsojoint1', 'torsojoint1'],
	Spine1: ['spine', 'spine1', 'spine01', 'skeletontorsojoint2', 'torsojoint2'],
	Spine2: [
		'spine2',
		'spine02',
		'chest',
		'upperchest',
		'torsojoint3',
		'skeletontorsojoint3',
	],
	Neck: [
		'neck',
		'skeletonneckjoint1',
		'neckjoint1',
		'skeletonneckjoint2',
		'neckjoint2',
	],
	Head: ['head', 'skeletonneckjoint2', 'neckjoint2'],
	LeftArm: [
		'leftarm',
		'leftupperarm',
		'lupperarm',
		'leftshoulder',
		'skeletonarmjointl4',
		'armjointl4',
	],
	LeftForeArm: [
		'leftforearm',
		'leftlowerarm',
		'lforearm',
		'llowerarm',
		'skeletonarmjointl3',
		'armjointl3',
	],
	LeftHand: ['lefthand', 'lhand', 'skeletonarmjointl2', 'armjointl2'],
	RightArm: [
		'rightarm',
		'rightupperarm',
		'rupperarm',
		'rightshoulder',
		'skeletonarmjointr',
		'armjointr1',
		'armjointr',
	],
	RightForeArm: [
		'rightforearm',
		'rightlowerarm',
		'rforearm',
		'rlowerarm',
		'skeletonarmjointr2',
		'armjointr2',
	],
	RightHand: ['righthand', 'rhand', 'skeletonarmjointr3', 'armjointr3'],
	LeftUpLeg: ['leftupleg', 'leftthigh', 'lthigh', 'leftleg', 'legjointl1'],
	LeftLeg: ['leftleg', 'leftcalf', 'lcalf', 'leftlowerleg', 'legjointl2'],
	LeftFoot: ['leftfoot', 'lfoot', 'legjointl3', 'legjointl5'],
	RightUpLeg: ['rightupleg', 'rightthigh', 'rthigh', 'rightleg', 'legjointr1'],
	RightLeg: ['rightleg', 'rightcalf', 'rcalf', 'rightlowerleg', 'legjointr2'],
	RightFoot: ['rightfoot', 'rfoot', 'legjointr3', 'legjointr5'],
};

const normalizeBoneName = (name: string) =>
	name
		.toLowerCase()
		.replaceAll(/mixamorig:?/g, '')
		.replaceAll(/[^a-z0-9]/g, '');

const resolveBoneByAliases = (
	bonesByName: Map<string, THREE.Bone>,
	aliases: string[],
) => {
	const normalizedAliases = aliases.map(normalizeBoneName);

	for (const [rawName, bone] of bonesByName.entries()) {
		const normalizedName = normalizeBoneName(rawName);
		if (
			normalizedAliases.some(
				(alias) => normalizedName === alias || normalizedName.endsWith(alias),
			)
		) {
			return bone;
		}
	}

	return null;
};

const bvhNameToStandard: Record<string, string> = {
	Pelvis: 'Hips',
	L_Hip: 'LeftUpLeg',
	R_Hip: 'RightUpLeg',
	Spine1: 'Spine1',
	L_Knee: 'LeftLeg',
	R_Knee: 'RightLeg',
	Spine2: 'Spine2',
	L_Ankle: 'LeftFoot',
	R_Ankle: 'RightFoot',
	Spine3: 'Spine2',
	L_Foot: 'LeftFoot',
	R_Foot: 'RightFoot',
	Neck: 'Neck',
	L_Collar: 'LeftArm',
	R_Collar: 'RightArm',
	Head: 'Head',
	L_Shoulder: 'LeftArm',
	R_Shoulder: 'RightArm',
	L_Elbow: 'LeftForeArm',
	R_Elbow: 'RightForeArm',
	L_Wrist: 'LeftHand',
	R_Wrist: 'RightHand',
	L_Hand: 'LeftHand',
	R_Hand: 'RightHand',
};

const poseToMediaPipe: Record<string, string[]> = {
	LeftArm: ['left_shoulder'],
	RightArm: ['right_shoulder'],
	LeftForeArm: ['left_elbow'],
	RightForeArm: ['right_elbow'],
	LeftHand: ['left_wrist'],
	RightHand: ['right_wrist'],
	LeftUpLeg: ['left_hip'],
	RightUpLeg: ['right_hip'],
	LeftLeg: ['left_knee'],
	RightLeg: ['right_knee'],
	LeftFoot: ['left_ankle'],
	RightFoot: ['right_ankle'],
	Head: ['nose'],
};

const getAveragePoint = (points: Array<SkeletonJoint | null | undefined>) => {
	const validPoints = points.filter(
		(point): point is SkeletonJoint =>
			Boolean(point) &&
			Number.isFinite(point?.x) &&
			Number.isFinite(point?.y) &&
			Number.isFinite(point?.z),
	);

	if (!validPoints.length) {
		return null;
	}

	const sum = validPoints.reduce(
		(accumulator, point) => ({
			x: accumulator.x + point.x,
			y: accumulator.y + point.y,
			z: accumulator.z + point.z,
		}),
		{ x: 0, y: 0, z: 0 },
	);

	return {
		x: sum.x / validPoints.length,
		y: sum.y / validPoints.length,
		z: sum.z / validPoints.length,
	};
};

const SkeletonViewer: React.FC = () => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [status, setStatus] = useState('Загрузка сцены...');
	const [skeletonFile, setSkeletonFile] = useState<
		'skeleton.json' | 'b_result.json' | 'b_result_2.json' | '000.json'
	>('skeleton.json');

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return undefined;
		}

		let isDestroyed = false;
		let frameRequest = 0;
		const bonesByName = new Map<string, THREE.Bone>();
		const baseQuaternions = new Map<string, THREE.Quaternion>();
		const resolvedBones = new Map<string, THREE.Bone>();
		const framePoses: Array<Record<string, THREE.Vector3>> = [];

		// Load calibration from localStorage
		const calibrationJson = localStorage.getItem(
			'dddance.skeletonViewer.calibration',
		);
		const calibration: BoneCalibration = calibrationJson
			? JSON.parse(calibrationJson)
			: {
					invertX: false,
					invertY: false,
					invertZ: false,
					swapYZ: false,
					scale: 1,
				};

		const applyTransform = (
			x: number,
			y: number,
			z: number,
		): [number, number, number] => {
			let px = calibration.invertX ? -x : x;
			let py = calibration.invertY ? -y : y;
			let pz = calibration.invertZ ? -z : z;

			if (calibration.swapYZ) {
				[py, pz] = [pz, py];
			}

			px *= calibration.scale;
			py *= calibration.scale;
			pz *= calibration.scale;

			return [px, py, pz];
		};

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x111827);

		const camera = new THREE.PerspectiveCamera(
			50,
			container.clientWidth / container.clientHeight,
			0.1,
			1000,
		);
		camera.position.set(0, 1.8, 4.2);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		container.append(renderer.domElement);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.08;
		controls.target.set(0, 1, 0);

		scene.add(new THREE.AmbientLight(0x98a7ff, 0.9));

		const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
		keyLight.position.set(5, 8, 4);
		keyLight.castShadow = true;
		scene.add(keyLight);

		const fillLight = new THREE.DirectionalLight(0x7a8bff, 0.65);
		fillLight.position.set(-5, 6, -3);
		scene.add(fillLight);

		const ground = new THREE.Mesh(
			new THREE.CircleGeometry(10, 64),
			new THREE.MeshStandardMaterial({
				color: 0x1f2937,
				roughness: 0.9,
				metalness: 0.1,
			}),
		);
		ground.rotation.x = -Math.PI / 2;
		ground.receiveShadow = true;
		scene.add(ground);

		const grid = new THREE.GridHelper(10, 24, 0x4b5563, 0x374151);
		grid.position.y = 0.01;
		if (Array.isArray(grid.material)) {
			grid.material.forEach((material: THREE.Material) => {
				material.transparent = true;
				material.opacity = 0.35;
			});
		} else {
			grid.material.transparent = true;
			grid.material.opacity = 0.35;
		}
		scene.add(grid);

		let modelRoot: THREE.Object3D | null = null;
		let fps = 30;
		let startedAt = performance.now();
		let baseRootY = 0;
		let currentFileFormat: '000.json' | 'skeleton.json' = 'skeleton.json';
		let bvhData: BVHData | null = null;
		let bvhFrames: Array<{ rotations: number[][]; rootPos: number[] }> = [];

		const resizeObserver = new ResizeObserver(() => {
			if (!container) {
				return;
			}

			camera.aspect = container.clientWidth / container.clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(container.clientWidth, container.clientHeight);
		});

		resizeObserver.observe(container);

		const applyBVHPose = (
			frameRotations: number[][],
			bvhData: BVHData,
			rootPos?: THREE.Vector3,
		) => {
			if (!modelRoot) {
				return;
			}

			// Reset all bones to base quaternions
			for (const [targetBoneName, bone] of resolvedBones.entries()) {
				const base = baseQuaternions.get(targetBoneName);
				if (base) {
					bone.quaternion.copy(base);
				}
			}

			// Apply quaternions from BVH data
			for (
				let i = 0;
				i < bvhData.bone_name.length && i < frameRotations.length;
				i++
			) {
				const bvhBoneName = bvhData.bone_name[i];
				const standardName = bvhNameToStandard[bvhBoneName] || bvhBoneName;
				const bone = resolvedBones.get(standardName);

				if (bone && frameRotations[i] && frameRotations[i].length >= 4) {
					// BVH format: [x, y, z, w]
					const quat = new THREE.Quaternion(
						frameRotations[i][0],
						frameRotations[i][1],
						frameRotations[i][2],
						frameRotations[i][3],
					);
					bone.quaternion.copy(quat);
				}
			}

			// Apply root position if available
			if (rootPos) {
				const hipsBone = resolvedBones.get('Hips');
				if (hipsBone && hipsBone.parent) {
					hipsBone.parent.position.copy(rootPos);
				}
			}

			modelRoot.updateMatrixWorld(true);
		};

		const applyPose = (
			pose: Record<string, THREE.Vector3>,
			rootDamping: number | null,
		) => {
			if (!modelRoot) {
				return;
			}

			for (const [targetBoneName, bone] of resolvedBones.entries()) {
				const base = baseQuaternions.get(targetBoneName);
				if (base) {
					bone.quaternion.copy(base);
				}
			}

			modelRoot.updateMatrixWorld(true);

			for (const [childName, parentName] of Object.entries(hierarchy)) {
				const parentBone = resolvedBones.get(parentName);
				const childBone = resolvedBones.get(childName);
				if (!parentBone) {
					continue;
				}
				if (!childBone) {
					continue;
				}
				if (parentBone === childBone) {
					continue;
				}

				const parentPoint = pose[parentName];
				const childPoint = pose[childName];
				if (!parentPoint || !childPoint) {
					continue;
				}

				const targetDirection = new THREE.Vector3()
					.subVectors(childPoint, parentPoint)
					.normalize();
				if (targetDirection.lengthSq() < 1e-8) {
					continue;
				}

				const boneWorldPosition = new THREE.Vector3();
				parentBone.getWorldPosition(boneWorldPosition);

				const childWorldPosition = new THREE.Vector3();
				childBone.getWorldPosition(childWorldPosition);

				const currentDirection = new THREE.Vector3()
					.subVectors(childWorldPosition, boneWorldPosition)
					.normalize();
				if (currentDirection.lengthSq() < 1e-8) {
					continue;
				}

				const worldDelta = new THREE.Quaternion().setFromUnitVectors(
					currentDirection,
					targetDirection,
				);

				if (parentBone.parent) {
					parentBone.parent.updateMatrixWorld(true);
					const parentWorldQuaternion = new THREE.Quaternion();
					parentBone.parent.getWorldQuaternion(parentWorldQuaternion);
					const localDelta = parentWorldQuaternion
						.clone()
						.invert()
						.multiply(worldDelta)
						.multiply(parentWorldQuaternion);
					parentBone.quaternion.premultiply(localDelta);
				}
			}

			if (rootDamping !== null) {
				const hipsBone = resolvedBones.get('Hips');
				const hipsBase = baseQuaternions.get('Hips');
				if (hipsBone && hipsBase) {
					hipsBone.quaternion.slerp(hipsBase, rootDamping);
				}
			}

			modelRoot.updateMatrixWorld(true);
		};

		const animate = () => {
			if (isDestroyed) {
				return;
			}

			if (modelRoot) {
				const elapsedSeconds = (performance.now() - startedAt) / 1000;

				if (
					currentFileFormat === '000.json' &&
					bvhData &&
					bvhFrames.length > 0
				) {
					const frameIndex =
						Math.floor(elapsedSeconds * fps) % bvhFrames.length;
					const frame = bvhFrames[frameIndex];
					const [px, py, pz] = applyTransform(
						frame.rootPos[0] ?? 0,
						frame.rootPos[1] ?? 0,
						frame.rootPos[2] ?? 0,
					);
					applyBVHPose(frame.rotations, bvhData, new THREE.Vector3(px, py, pz));
				} else if (framePoses.length > 0) {
					const frameIndex =
						Math.floor(elapsedSeconds * fps) % framePoses.length;
					const rootDamping =
						skeletonFile === 'b_result.json'
							? 0.55
							: skeletonFile === 'b_result_2.json'
								? 0.42
								: null;
					applyPose(framePoses[frameIndex], rootDamping);
					modelRoot.position.y = baseRootY;
				}
			}

			controls.update();
			renderer.render(scene, camera);
			frameRequest = window.requestAnimationFrame(animate);
		};

		const loader = new GLTFLoader();

		const loadModelWithFallback = async () => {
			const errors: string[] = [];

			for (const modelUrl of MODEL_URLS) {
				try {
					setStatus(`Загрузка GLB-модели: ${modelUrl}`);
					const gltf = await new Promise<
						Awaited<ReturnType<GLTFLoader['loadAsync']>>
					>((resolve, reject) => {
						loader.load(modelUrl, resolve, undefined, reject);
					});

					return { gltf, modelUrl };
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					errors.push(`${modelUrl}: ${message}`);
				}
			}

			throw new Error(
				`Не удалось загрузить модель ни по одному URL. ` +
					`Добавь локальный файл в public/models/avatar.glb. Детали: ${errors.join(' | ')}`,
			);
		};

		const loadScene = async () => {
			const fileName = skeletonFile;
			setStatus(`Загрузка ${fileName}...`);

			const dataResponse = await fetch(`/${fileName}`, { cache: 'no-store' });
			if (!dataResponse.ok) {
				throw new Error(`Не удалось загрузить ${fileName}`);
			}
			const data: unknown = await dataResponse.json();

			const { gltf, modelUrl } = await loadModelWithFallback();

			if (isDestroyed) {
				return;
			}

			modelRoot = gltf.scene;
			modelRoot.scale.set(1, 1, 1);

			const bounds = new THREE.Box3().setFromObject(modelRoot);
			const modelHeight = Math.max(bounds.max.y - bounds.min.y, 0.0001);
			const targetHeight = 1.8;
			const scaleFactor = targetHeight / modelHeight;
			modelRoot.scale.setScalar(scaleFactor);

			const scaledBounds = new THREE.Box3().setFromObject(modelRoot);
			modelRoot.position.y = -scaledBounds.min.y;
			baseRootY = modelRoot.position.y;

			modelRoot.traverse((node: THREE.Object3D) => {
				if ((node as THREE.Mesh).isMesh) {
					const meshNode = node as THREE.Mesh;
					meshNode.castShadow = true;
					meshNode.receiveShadow = true;
				}

				const maybeBoneNode = node as THREE.Bone & { type?: string };
				if (maybeBoneNode.isBone === true || maybeBoneNode.type === 'Bone') {
					const boneNode = node as THREE.Bone;
					bonesByName.set(boneNode.name, boneNode);
				}
			});

			const targetBoneNames = new Set<string>([
				...Object.keys(hierarchy),
				...Object.values(hierarchy),
			]);
			const missingBones: string[] = [];

			for (const targetBoneName of targetBoneNames) {
				const aliases = boneAliases[targetBoneName] ?? [targetBoneName];
				const resolvedBone = resolveBoneByAliases(bonesByName, [
					targetBoneName,
					...aliases,
				]);
				if (resolvedBone) {
					resolvedBones.set(targetBoneName, resolvedBone);
					baseQuaternions.set(targetBoneName, resolvedBone.quaternion.clone());
				} else {
					missingBones.push(targetBoneName);
				}
			}

			scene.add(modelRoot);

			// Parse data based on format
			if (fileName === '000.json') {
				if (!isBVHData(data)) {
					throw new Error(
						'Выбран 000.json, но структура не BVH (ожидались bone_name/root_positions/rotations).',
					);
				}
				currentFileFormat = '000.json';
				bvhData = data;
				const bvh = bvhData;
				// For BVH format: use rotations as quaternions applied to bones
				// rotations[frameIdx] is array of [x, y, z, w] quaternions per bone
				for (let frameIdx = 0; frameIdx < bvh.rotations.length; frameIdx++) {
					const frameRotations = bvh.rotations[frameIdx];
					const rootPos = bvh.root_positions[frameIdx];

					// Store BVH frames separately
					bvhFrames.push({
						rotations: frameRotations,
						rootPos: rootPos || [0, 0, 0],
					});
				}
				fps = 30; // BVH default
			} else {
				if (!isSkeletonData(data)) {
					throw new Error(
						`Выбран ${fileName}, но структура не skeleton (ожидались joint_names/frames).`,
					);
				}
				currentFileFormat = 'skeleton.json';
				bvhFrames = [];
				bvhData = null;
				// skeleton.json format
				const skeleton = data;
				const nameToIndex = new Map<string, number>(
					skeleton.joint_names.map((name, index) => [name, index]),
				);

				for (const frame of skeleton.frames) {
					const rawPose: Record<
						string,
						ReturnType<typeof getAveragePoint>
					> = {};

					for (const [poseJoint, sourceJoints] of Object.entries(
						poseToMediaPipe,
					)) {
						rawPose[poseJoint] = getAveragePoint(
							sourceJoints.map(
								(jointName) => frame.joints[nameToIndex.get(jointName) ?? -1],
							),
						);
					}

					rawPose.Hips = getAveragePoint([
						frame.joints[nameToIndex.get('left_hip') ?? -1],
						frame.joints[nameToIndex.get('right_hip') ?? -1],
					]);

					rawPose.Spine1 = getAveragePoint([
						frame.joints[nameToIndex.get('left_hip') ?? -1],
						frame.joints[nameToIndex.get('right_hip') ?? -1],
						frame.joints[nameToIndex.get('left_shoulder') ?? -1],
						frame.joints[nameToIndex.get('right_shoulder') ?? -1],
					]);

					rawPose.Spine2 = getAveragePoint([
						frame.joints[nameToIndex.get('left_shoulder') ?? -1],
						frame.joints[nameToIndex.get('right_shoulder') ?? -1],
						frame.joints[nameToIndex.get('left_hip') ?? -1],
						frame.joints[nameToIndex.get('right_hip') ?? -1],
						frame.joints[nameToIndex.get('nose') ?? -1],
					]);

					rawPose.Neck = getAveragePoint([
						frame.joints[nameToIndex.get('left_shoulder') ?? -1],
						frame.joints[nameToIndex.get('right_shoulder') ?? -1],
						frame.joints[nameToIndex.get('nose') ?? -1],
					]);

					const hips = rawPose.Hips;
					if (!hips) {
						continue;
					}

					const framePose: Record<string, THREE.Vector3> = {};
					const scale = 6;

					for (const [jointName, point] of Object.entries(rawPose)) {
						if (!point) {
							continue;
						}

						framePose[jointName] = new THREE.Vector3(
							-(point.x - hips.x) * scale,
							-(point.y - hips.y) * scale,
							-(point.z - hips.z) * scale,
						);
					}

					framePoses.push(framePose);
				}

				fps = skeleton.meta?.fps ?? 30;
			}

			startedAt = performance.now();

			if (resolvedBones.size === 0) {
				const detectedBoneNames = Array.from(bonesByName.keys()).slice(0, 30);
				throw new Error(
					'Не удалось сопоставить кости модели с позой. ' +
						`Найдено костей: ${bonesByName.size}. Примеры: ${detectedBoneNames.join(', ') || 'нет'}. ` +
						'Добавь локальную аватар-модель в public/models/avatar.glb.',
				);
			}

			setStatus(
				`Готово: файл ${fileName}, парсер ${currentFileFormat === '000.json' ? 'BVH/quat' : 'skeleton/joints'}, ` +
					`${currentFileFormat === '000.json' ? bvhFrames.length : framePoses.length} кадров, ${Math.round(fps)} FPS, модель: ${modelUrl}` +
					(missingBones.length > 0
						? `, не найдены: ${missingBones.join(', ')}`
						: ''),
			);
			frameRequest = window.requestAnimationFrame(animate);
		};

		void loadScene().catch((error: unknown) => {
			const errorMessage =
				error instanceof Error ? error.message : 'Неизвестная ошибка';
			setStatus(`Ошибка: ${errorMessage}`);
			console.error(error);
		});

		return () => {
			isDestroyed = true;
			window.cancelAnimationFrame(frameRequest);
			resizeObserver.disconnect();
			controls.dispose();
			renderer.dispose();
			container.removeChild(renderer.domElement);
		};
	}, [skeletonFile]);

	return (
		<section className={styles.section}>
			<h2 className={styles.title}>Движение манекена</h2>
			<p className={styles.subtitle}>
				ЛКМ — вращение, колесо — зум, ПКМ — панорама.
			</p>
			<div className={styles.status}>{status}</div>
			<div className={styles.calibratorContainer}>
				<div className={styles.calibratorGroup}>
					<button
						className={`${styles.calibratorButton} ${skeletonFile === 'skeleton.json' ? styles.active : ''}`}
						onClick={() => setSkeletonFile('skeleton.json')}
					>
						skeleton.json
					</button>
					<button
						className={`${styles.calibratorButton} ${skeletonFile === 'b_result.json' ? styles.active : ''}`}
						onClick={() => setSkeletonFile('b_result.json')}
					>
						b_result.json
					</button>
					<button
						className={`${styles.calibratorButton} ${skeletonFile === 'b_result_2.json' ? styles.active : ''}`}
						onClick={() => setSkeletonFile('b_result_2.json')}
					>
						b_result_2.json
					</button>
					<button
						className={`${styles.calibratorButton} ${skeletonFile === '000.json' ? styles.active : ''}`}
						onClick={() => setSkeletonFile('000.json')}
					>
						000.json
					</button>
				</div>
			</div>
			<div className={styles.frame}>
				<div ref={containerRef} className={styles.canvasHost} />
			</div>
		</section>
	);
};

export default SkeletonViewer;
