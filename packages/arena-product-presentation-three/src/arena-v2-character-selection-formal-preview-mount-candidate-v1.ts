import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  CHARACTER_PRESENTATION_FRONT_AXIS,
} from '@number-strategy-jump/arena-presentation-contracts';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import {
  ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1,
  requireArenaV2WeaponFirstScreenReadabilityProfileCandidateV1,
} from './arena-v2-character-weapon-first-screen-readability-candidate-v1.js';
import {
  ArenaV2FormalCharacterModelInstanceConstructionCleanupFailureCandidateV1,
  createArenaV2FormalCharacterModelInstanceCandidateV1,
  type ArenaV2FormalCharacterConstructionCleanupDebtCandidateV1,
} from './arena-v2-formal-gltf-character-view-candidate-v1.js';
import {
  ArenaV2FormalThreeAssetPreloaderCandidateV1,
} from './arena-v2-formal-three-asset-preloader-candidate-v1.js';

export const ARENA_V2_CHARACTER_SELECTION_FORMAL_PREVIEW_MOUNT_SCHEMA_VERSION_V1 = 1 as const;

const OWNER_KEYS = new Set(['schemaVersion', 'preloader']);
const MOUNT_KEYS = new Set([
  'schemaVersion',
  'tick',
  'characterDefinitionId',
  'selectedModeKind',
  'previewWeaponDefinitionId',
  'viewport',
  'previewSizeCssPixels',
  'reducedMotion',
]);
const VIEWPORT_KEYS = new Set(['viewportId', 'widthCssPixels', 'heightCssPixels']);
const SIZE_KEYS = new Set(['width', 'height']);

export interface ArenaV2CharacterSelectionFormalPreviewViewportV1 {
  readonly viewportId: '390x844' | '1440x900';
  readonly widthCssPixels: 390 | 1440;
  readonly heightCssPixels: 844 | 900;
}

export interface ArenaV2CharacterSelectionFormalPreviewMountInputV1 {
  readonly schemaVersion: typeof ARENA_V2_CHARACTER_SELECTION_FORMAL_PREVIEW_MOUNT_SCHEMA_VERSION_V1;
  readonly tick: number;
  readonly characterDefinitionId: string;
  readonly selectedModeKind: 'duel' | 'race' | 'survival';
  readonly previewWeaponDefinitionId: string | null;
  readonly viewport: ArenaV2CharacterSelectionFormalPreviewViewportV1;
  readonly previewSizeCssPixels: Readonly<{
    readonly width: number;
    readonly height: number;
  }>;
  readonly reducedMotion: boolean;
}

export interface ArenaV2CharacterSelectionFormalPreviewMountV1 {
  readonly schemaVersion: typeof ARENA_V2_CHARACTER_SELECTION_FORMAL_PREVIEW_MOUNT_SCHEMA_VERSION_V1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly tick: number;
  readonly identity: string;
  readonly characterDefinitionId: string;
  readonly selectedModeKind: 'duel' | 'race' | 'survival';
  readonly matchStartsUnarmed: boolean;
  readonly previewWeaponDefinitionId: string | null;
  readonly previewWeaponAssetId: string | null;
  readonly previewWeaponSilhouetteFamily: string | null;
  readonly previewWeaponPatternCue: string | null;
  readonly presentationDefinitionId: string;
  readonly presentationDefinitionHash: string;
  readonly materialProfileId: string;
  readonly handlingKind: string;
  readonly bodyTintHex: string;
  readonly characterValuePatternId: string;
  readonly handlingShapeAxis: string;
  readonly viewport: ArenaV2CharacterSelectionFormalPreviewViewportV1;
  readonly previewSizeCssPixels: Readonly<{
    readonly width: number;
    readonly height: number;
  }>;
  readonly reducedMotion: boolean;
  readonly previewGroup: THREE.Group;
  readonly model: THREE.Object3D;
  readonly weapon: THREE.Object3D | null;
  readonly camera: THREE.PerspectiveCamera;
  readonly hemisphereLight: THREE.HemisphereLight;
  readonly directionalLight: THREE.DirectionalLight;
  readonly framing: Readonly<{
    readonly sourceBoundsSize: Readonly<{ x: number; y: number; z: number }>;
    readonly sourceBoundsCenter: Readonly<{ x: number; y: number; z: number }>;
    readonly sourceFloorY: number;
    readonly uniformScale: number;
    readonly cameraFovDegrees: 30 | 34;
    readonly cameraDistance: 4.6 | 5.2;
    readonly staticThreeQuarterYawRadians: -0.28;
  }>;
  readonly animation: Readonly<{
    readonly semantic: 'idle' | 'run' | 'jump' | 'land';
    readonly poseProfileId: string;
    readonly clipName: string;
    readonly sampleTimeSeconds: number;
    readonly advancesWithWallClock: false;
    readonly createsRaf: false;
  }>;
  readonly ownership: Readonly<{
    readonly ownsPreviewGroup: true;
    readonly ownsModelHierarchy: true;
    readonly ownsWeaponClone: boolean;
    readonly ownsAnimationMixer: true;
    readonly ownsClonedMaterials: true;
    readonly ownsCameraAndLights: true;
    readonly ownsGeometry: false;
    readonly ownsTexture: false;
    readonly sharesPreloadedWeaponGeometryMaterialAndTexture: true;
    readonly disposesSharedGeometryOrTexture: false;
  }>;
}

export interface ArenaV2CharacterSelectionFormalPreviewMountOwnerSnapshotV1 {
  readonly schemaVersion: typeof ARENA_V2_CHARACTER_SELECTION_FORMAL_PREVIEW_MOUNT_SCHEMA_VERSION_V1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly state: 'active' | 'failed' | 'destroyed';
  readonly lastTick: number;
  readonly activeCharacterDefinitionId: string | null;
  readonly activeSelectedModeKind: 'duel' | 'race' | 'survival' | null;
  readonly activePreviewWeaponDefinitionId: string | null;
  readonly activePresentationDefinitionId: string | null;
  readonly activeIdentity: string | null;
  readonly cleanupDebtCount: number;
  readonly createsRenderer: false;
  readonly createsDom: false;
  readonly createsRaf: false;
}

interface ParsedMountInputV1 {
  readonly tick: number;
  readonly characterDefinitionId: string;
  readonly selectedModeKind: 'duel' | 'race' | 'survival';
  readonly previewWeaponDefinitionId: string | null;
  readonly viewport: ArenaV2CharacterSelectionFormalPreviewViewportV1;
  readonly previewSizeCssPixels: ArenaV2CharacterSelectionFormalPreviewMountInputV1[
    'previewSizeCssPixels'
  ];
  readonly reducedMotion: boolean;
  readonly canonical: string;
}

interface OwnedMountV1 {
  readonly canonical: string;
  readonly mount: ArenaV2CharacterSelectionFormalPreviewMountV1;
  readonly cleanup: OwnedPreviewResourcesV1;
}

interface OwnedPreviewResourcesV1 {
  mixer: THREE.AnimationMixer | null;
  weapon: THREE.Object3D | null;
  readonly ownedMaterials: readonly THREE.Material[];
  readonly uniqueOwnedMaterialCount: number;
  readonly previewGroup: THREE.Group;
  readonly model: THREE.Object3D;
  readonly camera: THREE.PerspectiveCamera;
  readonly hemisphereLight: THREE.HemisphereLight;
  readonly directionalLight: THREE.DirectionalLight;
  mixerStopped: boolean;
  mixerUncached: boolean;
  weaponDetached: boolean;
  weaponCleared: boolean;
  readonly disposedMaterials: Set<THREE.Material>;
  previewGroupCleared: boolean;
  modelCleared: boolean;
  cameraCleared: boolean;
  hemisphereLightCleared: boolean;
  directionalLightCleared: boolean;
}

class MountBuildCleanupFailureV1 extends Error {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly cleanupDebt: OwnedPreviewResourcesV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    cleanupDebt: OwnedPreviewResourcesV1,
  ) {
    super('Arena V2角色选择预览构造失败且清理不完整。');
    this.name = 'MountBuildCleanupFailureV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.cleanupDebt = cleanupDebt;
  }
}

function dataField(value: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 300) {
    throw new TypeError(`${name}必须是1..300字符字符串。`);
  }
  return value;
}

function nullableText(value: unknown, name: string): string | null {
  return value === null ? null : text(value, name);
}

function selectedModeKind(value: unknown): ParsedMountInputV1['selectedModeKind'] {
  if (value === 'duel' || value === 'race' || value === 'survival') return value;
  throw new RangeError('selectedModeKind必须是duel、race或survival。');
}

function integer(value: unknown, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的安全整数。`);
  }
  return value as number;
}

function parseViewport(value: unknown): ArenaV2CharacterSelectionFormalPreviewViewportV1 {
  const source = assertPlainRecord(value, 'Arena V2角色选择预览viewport');
  assertKnownKeys(source, VIEWPORT_KEYS, 'Arena V2角色选择预览viewport');
  const viewportId = dataField(source, 'viewportId', 'Arena V2角色选择预览viewport');
  const widthCssPixels = dataField(source, 'widthCssPixels', 'Arena V2角色选择预览viewport');
  const heightCssPixels = dataField(source, 'heightCssPixels', 'Arena V2角色选择预览viewport');
  if (
    (viewportId === '390x844' && widthCssPixels === 390 && heightCssPixels === 844)
    || (viewportId === '1440x900' && widthCssPixels === 1440 && heightCssPixels === 900)
  ) return Object.freeze({ viewportId, widthCssPixels, heightCssPixels });
  throw new RangeError('Arena V2角色选择预览viewport必须是固定双视口之一。');
}

function parseSize(
  value: unknown,
  viewport: ArenaV2CharacterSelectionFormalPreviewViewportV1,
): ArenaV2CharacterSelectionFormalPreviewMountInputV1['previewSizeCssPixels'] {
  const source = assertPlainRecord(value, 'Arena V2角色选择预览size');
  assertKnownKeys(source, SIZE_KEYS, 'Arena V2角色选择预览size');
  const result = Object.freeze({
    width: integer(dataField(source, 'width', 'Arena V2角色选择预览size'), 'size.width', 168),
    height: integer(dataField(source, 'height', 'Arena V2角色选择预览size'), 'size.height', 240),
  });
  if (result.width > viewport.widthCssPixels || result.height > viewport.heightCssPixels) {
    throw new RangeError('Arena V2角色选择预览size超过viewport。');
  }
  return result;
}

function parseMountInput(value: unknown): ParsedMountInputV1 {
  const source = assertPlainRecord(value, 'Arena V2角色选择预览mount input');
  assertKnownKeys(source, MOUNT_KEYS, 'Arena V2角色选择预览mount input');
  if (dataField(source, 'schemaVersion', 'Arena V2角色选择预览mount input') !== 1) {
    throw new RangeError('Arena V2角色选择预览mount schemaVersion必须是1。');
  }
  const tick = integer(dataField(source, 'tick', 'Arena V2角色选择预览mount input'), 'tick');
  const characterDefinitionId = text(
    dataField(source, 'characterDefinitionId', 'Arena V2角色选择预览mount input'),
    'characterDefinitionId',
  );
  const modeKind = selectedModeKind(
    dataField(source, 'selectedModeKind', 'Arena V2角色选择预览mount input'),
  );
  const previewWeaponDefinitionId = nullableText(
    dataField(source, 'previewWeaponDefinitionId', 'Arena V2角色选择预览mount input'),
    'previewWeaponDefinitionId',
  );
  if ((modeKind === 'survival') !== (previewWeaponDefinitionId === null)) {
    throw new RangeError('生存模式角色预览必须空手，对战/竞速预览必须持有已选武器。');
  }
  const viewport = parseViewport(dataField(source, 'viewport', 'Arena V2角色选择预览mount input'));
  const previewSizeCssPixels = parseSize(
    dataField(source, 'previewSizeCssPixels', 'Arena V2角色选择预览mount input'),
    viewport,
  );
  const reducedMotion = dataField(source, 'reducedMotion', 'Arena V2角色选择预览mount input');
  if (typeof reducedMotion !== 'boolean') throw new TypeError('reducedMotion必须是boolean。');
  const canonicalValue = Object.freeze({
    schemaVersion: 1,
    characterDefinitionId,
    selectedModeKind: modeKind,
    previewWeaponDefinitionId,
    viewport,
    previewSizeCssPixels,
    reducedMotion,
  });
  return Object.freeze({
    tick,
    characterDefinitionId,
    selectedModeKind: modeKind,
    previewWeaponDefinitionId,
    viewport,
    previewSizeCssPixels,
    reducedMotion,
    canonical: JSON.stringify(canonicalValue),
  });
}

function requireWeaponBinding(equipmentDefinitionId: string): Readonly<{
  readonly equipmentDefinitionId: string;
  readonly attachmentAssetId: string;
}> {
  const binding = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
    .equipmentAssetBindings.find((entry) => (
      entry.equipmentDefinitionId === equipmentDefinitionId
    ));
  if (binding === undefined) {
    throw new RangeError(`Arena V2角色选择预览缺少武器资产绑定：${equipmentDefinitionId}。`);
  }
  return binding;
}

function frontAxisYaw(value: unknown): number {
  if (value === CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_Z) return 0;
  if (value === CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_X) return Math.PI / 2;
  if (value === CHARACTER_PRESENTATION_FRONT_AXIS.NEGATIVE_Z) return Math.PI;
  if (value === CHARACTER_PRESENTATION_FRONT_AXIS.NEGATIVE_X) return -Math.PI / 2;
  throw new RangeError('Arena V2角色选择预览front axis未知。');
}

function cleanupOwnedPreviewResources(
  record: OwnedPreviewResourcesV1,
  assertCommit: () => void = () => {},
): void {
  const runStep = (
    label: string,
    run: () => unknown,
    commit: () => void,
  ): void => {
    rejectThenable(run(), label);
    assertCommit();
    commit();
  };
  if (!record.mixerStopped) {
    if (record.mixer === null) record.mixerStopped = true;
    else {
      runStep(
        'Arena V2角色选择预览 mixer.stopAllAction',
        () => record.mixer!.stopAllAction(),
        () => { record.mixerStopped = true; },
      );
    }
  }
  if (record.mixerStopped && !record.mixerUncached) {
    if (record.mixer === null) record.mixerUncached = true;
    else {
      runStep(
        'Arena V2角色选择预览 mixer.uncacheRoot',
        () => record.mixer!.uncacheRoot(record.model),
        () => { record.mixerUncached = true; },
      );
    }
  }
  if (record.mixerUncached && !record.weaponDetached) {
    if (record.weapon === null) record.weaponDetached = true;
    else {
      runStep(
        'Arena V2角色选择预览 weapon.removeFromParent',
        () => record.weapon!.removeFromParent(),
        () => { record.weaponDetached = true; },
      );
    }
  }
  if (record.weaponDetached && !record.weaponCleared) {
    if (record.weapon === null) record.weaponCleared = true;
    else {
      runStep(
        'Arena V2角色选择预览 weapon.clear',
        () => record.weapon!.clear(),
        () => { record.weaponCleared = true; },
      );
    }
  }
  if (record.weaponCleared) {
    for (const material of record.ownedMaterials) {
      if (record.disposedMaterials.has(material)) continue;
      runStep(
        'Arena V2角色选择预览 material.dispose',
        () => material.dispose(),
        () => { record.disposedMaterials.add(material); },
      );
    }
  }
  if (record.disposedMaterials.size >= record.uniqueOwnedMaterialCount
    && !record.previewGroupCleared) {
    runStep(
      'Arena V2角色选择预览 previewGroup.clear',
      () => record.previewGroup.clear(),
      () => { record.previewGroupCleared = true; },
    );
  }
  if (record.previewGroupCleared && !record.modelCleared) {
    runStep(
      'Arena V2角色选择预览 model.clear',
      () => record.model.clear(),
      () => { record.modelCleared = true; },
    );
  }
  if (record.modelCleared && !record.cameraCleared) {
    runStep(
      'Arena V2角色选择预览 camera.clear',
      () => record.camera.clear(),
      () => { record.cameraCleared = true; },
    );
  }
  if (record.cameraCleared && !record.hemisphereLightCleared) {
    runStep(
      'Arena V2角色选择预览 hemisphereLight.clear',
      () => record.hemisphereLight.clear(),
      () => { record.hemisphereLightCleared = true; },
    );
  }
  if (record.hemisphereLightCleared && !record.directionalLightCleared) {
    runStep(
      'Arena V2角色选择预览 directionalLight.clear',
      () => record.directionalLight.clear(),
      () => { record.directionalLightCleared = true; },
    );
  }
  if (!record.directionalLightCleared) {
    throw new Error('Arena V2角色选择预览清理依赖尚未收敛。');
  }
}

function cleanupMount(record: OwnedMountV1, assertCommit?: () => void): void {
  cleanupOwnedPreviewResources(record.cleanup, assertCommit);
}

function buildMount(
  preloader: ArenaV2FormalThreeAssetPreloaderCandidateV1,
  input: ParsedMountInputV1,
): OwnedMountV1 {
  const catalog = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1;
  const presentation = catalog.characterPresentationRegistry.requireDefaultForCharacter(
    input.characterDefinitionId,
  );
  const identity = ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1.find((entry) => (
    entry.characterDefinitionId === input.characterDefinitionId
  ));
  if (identity === undefined
    || identity.presentationDefinitionId !== presentation.id
    || identity.materialProfileId !== presentation.materialProfileId) {
    throw new RangeError('Arena V2角色选择预览角色、Presentation与可读性身份不闭合。');
  }
  const instance = createArenaV2FormalCharacterModelInstanceCandidateV1(
    preloader,
    presentation,
    `ArenaV2CharacterSelectionPreviewModel:${input.characterDefinitionId}`,
  );
  const previewGroup = new THREE.Group();
  previewGroup.name = `ArenaV2CharacterSelectionPreview:${input.characterDefinitionId}`;
  const cameraFovDegrees = input.viewport.viewportId === '390x844' ? 34 as const : 30 as const;
  const cameraDistance = input.viewport.viewportId === '390x844' ? 5.2 as const : 4.6 as const;
  const camera = new THREE.PerspectiveCamera(
    cameraFovDegrees,
    input.previewSizeCssPixels.width / input.previewSizeCssPixels.height,
    0.1,
    20,
  );
  const hemisphereLight = new THREE.HemisphereLight(0xd8e8ff, 0x403d48, 1.15);
  const directionalLight = new THREE.DirectionalLight(0xfff1dc, 1.85);
  let mixer: THREE.AnimationMixer | null = null;
  let weapon: THREE.Object3D | null = null;
  const cleanup: OwnedPreviewResourcesV1 = {
    mixer,
    weapon,
    ownedMaterials: instance.ownedMaterials,
    uniqueOwnedMaterialCount: new Set(instance.ownedMaterials).size,
    previewGroup,
    model: instance.model,
    camera,
    hemisphereLight,
    directionalLight,
    mixerStopped: false,
    mixerUncached: false,
    weaponDetached: false,
    weaponCleared: false,
    disposedMaterials: new Set<THREE.Material>(),
    previewGroupCleared: false,
    modelCleared: false,
    cameraCleared: false,
    hemisphereLightCleared: false,
    directionalLightCleared: false,
  };
  try {
    if (instance.characterValuePatternId !== identity.valuePattern.id) {
      throw new RangeError('Arena V2角色选择预览实例没有应用角色设计表声明的明暗分区。');
    }
    const model = instance.model;
    let previewWeaponAssetId: string | null = null;
    let previewWeaponSilhouetteFamily: string | null = null;
    let previewWeaponPatternCue: string | null = null;
    if (input.previewWeaponDefinitionId !== null) {
      const weaponProfile = requireArenaV2WeaponFirstScreenReadabilityProfileCandidateV1(
        input.previewWeaponDefinitionId,
      );
      const weaponBinding = requireWeaponBinding(input.previewWeaponDefinitionId);
      const weaponTemplate = preloader.requireAsset(weaponBinding.attachmentAssetId);
      weapon = cloneSkeleton(weaponTemplate.scene);
      cleanup.weapon = weapon;
      weapon.name = `ArenaV2CharacterSelectionPreviewWeapon:${input.previewWeaponDefinitionId}`;
      weapon.position.set(0, 0, 0);
      weapon.rotation.set(...weaponProfile.grip.heldEulerRadians);
      weapon.scale.setScalar(weaponProfile.grip.heldScale);
      weapon.userData['arenaV2EquipmentDefinitionId'] = input.previewWeaponDefinitionId;
      weapon.userData['arenaV2SilhouetteFamily'] = weaponProfile.silhouette.family;
      weapon.userData['arenaV2PatternCue'] = weaponProfile.silhouette.patternCue;
      instance.equipmentSlot.add(weapon);
      previewWeaponAssetId = weaponBinding.attachmentAssetId;
      previewWeaponSilhouetteFamily = weaponProfile.silhouette.family;
      previewWeaponPatternCue = weaponProfile.silhouette.patternCue;
    }
    model.rotation.y = -frontAxisYaw(presentation.direction.defaultFrontAxis) - 0.28;
    previewGroup.add(model);
    const pose = identity.selectionPose;
    const poseProfileId = `arena-v2.character-preview-pose.${identity.handlingKind}.v1`;
    const animationBinding = presentation.animationMap[pose.semantic];
    const clipName = animationBinding.sourceKey;
    const previewClip = instance.animations.find(({ name }) => name === clipName);
    if (previewClip === undefined) {
      throw new RangeError(`Arena V2角色选择预览缺少${pose.semantic} clip。`);
    }
    mixer = new THREE.AnimationMixer(model);
    cleanup.mixer = mixer;
    const previewAction = mixer.clipAction(previewClip);
    previewAction.enabled = true;
    previewAction.setLoop(animationBinding.loop ? THREE.LoopRepeat : THREE.LoopOnce, 1);
    previewAction.clampWhenFinished = true;
    previewAction.play();
    const sampleTimeSeconds = Math.min(
      Math.max(0, previewClip.duration - 0.001),
      Math.max(0, previewClip.duration * pose.sampleRatio),
    );
    previewAction.time = sampleTimeSeconds;
    mixer.update(0);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) throw new RangeError('Arena V2角色选择预览模型bounds为空。');
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    if (![size.x, size.y, size.z, center.x, center.y, center.z, bounds.min.y]
      .every(Number.isFinite) || size.y <= 0.0001 || size.y > 100) {
      throw new RangeError('Arena V2角色选择预览模型bounds无效。');
    }
    const targetHeight = input.viewport.viewportId === '390x844' ? 2.45 : 2.7;
    const uniformScale = targetHeight / size.y;
    if (!Number.isFinite(uniformScale) || uniformScale <= 0 || uniformScale > 10_000) {
      throw new RangeError('Arena V2角色选择预览统一尺度无效。');
    }
    previewGroup.scale.setScalar(uniformScale);
    previewGroup.position.set(
      -center.x * uniformScale,
      -bounds.min.y * uniformScale,
      -center.z * uniformScale,
    );
    camera.name = `ArenaV2CharacterSelectionPreviewCamera:${input.characterDefinitionId}`;
    camera.position.set(0, 1.32, cameraDistance);
    camera.lookAt(0, 1.28, 0);
    hemisphereLight.name = `ArenaV2CharacterSelectionPreviewHemisphere:${input.characterDefinitionId}`;
    directionalLight.name = `ArenaV2CharacterSelectionPreviewDirectional:${input.characterDefinitionId}`;
    directionalLight.position.set(3.4, 4.8, 4.2);
    directionalLight.castShadow = false;
    const mountIdentity = createDeterministicDataHash({
      characterDefinitionId: input.characterDefinitionId,
      selectedModeKind: input.selectedModeKind,
      matchStartsUnarmed: input.selectedModeKind === 'survival',
      previewWeaponDefinitionId: input.previewWeaponDefinitionId,
      previewWeaponAssetId,
      previewWeaponSilhouetteFamily,
      previewWeaponPatternCue,
      presentationDefinitionHash: presentation.getContentHash(),
      materialProfileId: presentation.materialProfileId,
      characterValuePatternId: identity.valuePattern.id,
      handlingShapeAxis: identity.handlingShapeAxis,
      poseProfileId,
      poseSemantic: pose.semantic,
      poseSampleRatio: pose.sampleRatio,
      viewport: input.viewport,
      previewSizeCssPixels: input.previewSizeCssPixels,
      reducedMotion: input.reducedMotion,
    }, 'Arena V2 Character Selection Formal Preview Mount V1');
    const mount = Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      validationStatus: 'not-run' as const,
      tick: input.tick,
      identity: mountIdentity,
      characterDefinitionId: input.characterDefinitionId,
      selectedModeKind: input.selectedModeKind,
      matchStartsUnarmed: input.selectedModeKind === 'survival',
      previewWeaponDefinitionId: input.previewWeaponDefinitionId,
      previewWeaponAssetId,
      previewWeaponSilhouetteFamily,
      previewWeaponPatternCue,
      presentationDefinitionId: presentation.id,
      presentationDefinitionHash: presentation.getContentHash(),
      materialProfileId: presentation.materialProfileId,
      handlingKind: identity.handlingKind,
      bodyTintHex: identity.bodyTintHex,
      characterValuePatternId: identity.valuePattern.id,
      handlingShapeAxis: identity.handlingShapeAxis,
      viewport: input.viewport,
      previewSizeCssPixels: input.previewSizeCssPixels,
      reducedMotion: input.reducedMotion,
      previewGroup,
      model,
      weapon,
      camera,
      hemisphereLight,
      directionalLight,
      framing: Object.freeze({
        sourceBoundsSize: Object.freeze({ x: size.x, y: size.y, z: size.z }),
        sourceBoundsCenter: Object.freeze({ x: center.x, y: center.y, z: center.z }),
        sourceFloorY: bounds.min.y,
        uniformScale,
        cameraFovDegrees,
        cameraDistance,
        staticThreeQuarterYawRadians: -0.28 as const,
      }),
      animation: Object.freeze({
        semantic: pose.semantic,
        poseProfileId,
        clipName,
        sampleTimeSeconds,
        advancesWithWallClock: false as const,
        createsRaf: false as const,
      }),
      ownership: Object.freeze({
        ownsPreviewGroup: true as const,
        ownsModelHierarchy: true as const,
        ownsWeaponClone: weapon !== null,
        ownsAnimationMixer: true as const,
        ownsClonedMaterials: true as const,
        ownsCameraAndLights: true as const,
        ownsGeometry: false as const,
        ownsTexture: false as const,
        sharesPreloadedWeaponGeometryMaterialAndTexture: true as const,
        disposesSharedGeometryOrTexture: false as const,
      }),
    }) satisfies ArenaV2CharacterSelectionFormalPreviewMountV1;
    return Object.freeze({
      canonical: input.canonical,
      mount,
      cleanup,
    });
  } catch (error) {
    try {
      cleanupOwnedPreviewResources(cleanup);
    } catch (cleanupError) {
      throw new MountBuildCleanupFailureV1(error, cleanupError, cleanup);
    }
    throw error;
  }
}

export class ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1 {
  readonly #preloader: ArenaV2FormalThreeAssetPreloaderCandidateV1;
  #state: 'active' | 'failed' | 'destroyed' = 'active';
  #lastTick = -1;
  #active: OwnedMountV1 | null = null;
  readonly #cleanupDebts = new Set<OwnedPreviewResourcesV1>();
  readonly #modelConstructionCleanupDebts =
    new Set<ArenaV2FormalCharacterConstructionCleanupDebtCandidateV1>();
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2角色选择预览Owner options');
    assertKnownKeys(source, OWNER_KEYS, 'Arena V2角色选择预览Owner options');
    if (dataField(source, 'schemaVersion', 'Arena V2角色选择预览Owner options') !== 1) {
      throw new RangeError('Arena V2角色选择预览Owner schemaVersion必须是1。');
    }
    const preloader = dataField(source, 'preloader', 'Arena V2角色选择预览Owner options');
    if (!(preloader instanceof ArenaV2FormalThreeAssetPreloaderCandidateV1)) {
      throw new TypeError('Arena V2角色选择预览Owner需要正式Three预加载器。');
    }
    this.#preloader = preloader;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`Arena V2角色选择预览${operation}不可重入${this.#operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('Arena V2角色选择预览缺少当前操作所有权。');
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failure: unknown = null;
    let result!: T;
    try {
      result = run();
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#state = 'failed';
      throw failed && failure !== reentryError
        ? new AggregateError([failure, reentryError], `Arena V2角色选择预览${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failure;
    return result;
  }

  mount(value: unknown): ArenaV2CharacterSelectionFormalPreviewMountV1 {
    return this.#runSynchronousOperation('mount', () => {
    if (this.#state !== 'active') throw new Error('Arena V2角色选择预览Owner当前不可挂载。');
    const input = parseMountInput(value);
    if (input.tick < this.#lastTick) throw new RangeError('Arena V2角色选择预览tick回退。');
    if (this.#active?.canonical === input.canonical) {
      this.#lastTick = input.tick;
      return this.#active.mount;
    }
    let next: OwnedMountV1 | null = null;
    let nextCleanupHandled = false;
    try {
      next = buildMount(this.#preloader, input);
      this.#assertCurrentOperationCommit();
      if (this.#active !== null) {
        try {
          cleanupMount(this.#active, () => this.#assertCurrentOperationCommit());
          this.#assertCurrentOperationCommit();
          this.#active = null;
        } catch (retirementError) {
          let nextCleanupError: unknown | null = null;
          nextCleanupHandled = true;
          try {
            cleanupMount(next, () => this.#assertCurrentOperationCommit());
            this.#assertCurrentOperationCommit();
          } catch (cleanupError) {
            this.#cleanupDebts.add(next.cleanup);
            nextCleanupError = cleanupError;
          }
          this.#state = 'failed';
          throw nextCleanupError === null
            ? retirementError
            : new AggregateError(
              [retirementError, nextCleanupError],
              'Arena V2角色选择预览旧挂载退役失败且新挂载清理不完整。',
            );
        }
      }
      this.#active = next;
      this.#lastTick = input.tick;
      return next.mount;
    } catch (error) {
      if (next !== null && !nextCleanupHandled) {
        try {
          cleanupMount(next, () => this.#assertCurrentOperationCommit());
          this.#assertCurrentOperationCommit();
        } catch (cleanupError) {
          this.#cleanupDebts.add(next.cleanup);
          this.#state = 'failed';
          throw new AggregateError(
            [error, cleanupError],
            'Arena V2角色选择预览替换失败且新挂载清理不完整。',
          );
        }
      }
      if (error instanceof MountBuildCleanupFailureV1) {
        this.#cleanupDebts.add(error.cleanupDebt);
        this.#state = 'failed';
        throw new AggregateError(
          [error.originalError, error.cleanupError],
          'Arena V2角色选择预览构造失败且清理不完整。',
        );
      }
      if (error
        instanceof ArenaV2FormalCharacterModelInstanceConstructionCleanupFailureCandidateV1) {
        this.#modelConstructionCleanupDebts.add(error);
      }
      this.#state = 'failed';
      throw error;
    }
    });
  }

  getSnapshot(): ArenaV2CharacterSelectionFormalPreviewMountOwnerSnapshotV1 {
    return this.#runSynchronousOperation('snapshot', () => Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      validationStatus: 'not-run' as const,
      state: this.#state,
      lastTick: this.#lastTick,
      activeCharacterDefinitionId: this.#active?.mount.characterDefinitionId ?? null,
      activeSelectedModeKind: this.#active?.mount.selectedModeKind ?? null,
      activePreviewWeaponDefinitionId: this.#active?.mount.previewWeaponDefinitionId ?? null,
      activePresentationDefinitionId: this.#active?.mount.presentationDefinitionId ?? null,
      activeIdentity: this.#active?.mount.identity ?? null,
      cleanupDebtCount: this.#cleanupDebts.size + this.#modelConstructionCleanupDebts.size,
      createsRenderer: false as const,
      createsDom: false as const,
      createsRaf: false as const,
    }));
  }

  clear(): void {
    this.#runSynchronousOperation('clear', () => {
    if (this.#state !== 'active') {
      throw new Error('Arena V2角色选择预览Owner当前不可清空。');
    }
    if (this.#active === null) return;
    try {
      cleanupMount(this.#active, () => this.#assertCurrentOperationCommit());
      this.#assertCurrentOperationCommit();
      this.#active = null;
    } catch (error) {
      this.#state = 'failed';
      throw error;
    }
    });
  }

  destroy(): void {
    this.#runSynchronousOperation('destroy', () => {
    if (this.#state === 'destroyed') return;
    this.#state = 'failed';
    const errors: unknown[] = [];
    let complete = false;
    let mayContinue = true;
      if (this.#active !== null) {
        const sequence = this.#reentrySequence;
        try {
          cleanupMount(this.#active, () => this.#assertCurrentOperationCommit());
          if (this.#reentrySequence === sequence) this.#active = null;
        } catch (error) {
          errors.push(error);
          mayContinue = false;
        }
        mayContinue = mayContinue && this.#reentrySequence === sequence;
      }
      for (const debt of mayContinue ? [...this.#cleanupDebts] : []) {
        const sequence = this.#reentrySequence;
        try {
          cleanupOwnedPreviewResources(
            debt,
            () => this.#assertCurrentOperationCommit(),
          );
          if (this.#reentrySequence === sequence) this.#cleanupDebts.delete(debt);
        } catch (error) {
          errors.push(error);
          mayContinue = false;
          break;
        }
        if (this.#reentrySequence !== sequence) {
          mayContinue = false;
          break;
        }
      }
      for (const debt of mayContinue ? [...this.#modelConstructionCleanupDebts] : []) {
        const sequence = this.#reentrySequence;
        try {
          rejectThenable(
            debt.retryCleanup(),
            'Arena V2角色选择预览 model construction debt.retryCleanup',
          );
          this.#assertCurrentOperationCommit();
          if (this.#reentrySequence === sequence && debt.cleanupComplete) {
            this.#modelConstructionCleanupDebts.delete(debt);
          }
        } catch (error) {
          errors.push(error);
          break;
        }
        if (this.#reentrySequence !== sequence) break;
      }
      complete = this.#active === null
        && this.#cleanupDebts.size === 0
        && this.#modelConstructionCleanupDebts.size === 0;
      this.#state = complete && errors.length === 0 ? 'destroyed' : 'failed';
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2角色选择预览Owner清理不完整。');
    }
    if (!complete) throw new Error('Arena V2角色选择预览Owner清理未收敛。');
    });
  }
}

export const ARENA_V2_CHARACTER_SELECTION_FORMAL_PREVIEW_MOUNT_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  characterCount: 6 as const,
  reusesFormalMatchCharacterModelAndMaterialProfiles: true as const,
  reusesFormalMatchWeaponAssetBindings: true as const,
  reusesHeldWeaponSilhouetteAndGripProfiles: true as const,
  duelAndRacePreviewSelectedWeapon: true as const,
  survivalPreviewStartsUnarmed: true as const,
  weaponCloneSharesPreloadedRenderResources: true as const,
  clearReleasesActiveCloneWithoutDestroyingOwner: true as const,
  mountCleanupUsesPerResourceCompletionWatermarks: true as const,
  failedBuildCleanupDebtRetainedForDestroyRetry: true as const,
  failedModelConstructionCleanupDebtRetainedForDestroyRetry: true as const,
  failedPreviousMountRetirementDoesNotDoubleCleanupNextMount: true as const,
  mountOwnerDestroyReentrancyRejected: true as const,
  synchronousMountSnapshotClearAndDestroyGuarded: true as const,
  swallowedThreeAndMixerReentryFailsClosed: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  buildRetirementAndCleanupCheckedBeforeOwnerCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterOwners: true as const,
  ordinaryCleanupFailureRetainsCurrentAndLaterOwners: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  usesSkeletonUtilsClone: true as const,
  staticHandlingPoseOnly: true as const,
  createsRenderer: false as const,
  createsDom: false as const,
  createsRaf: false as const,
  addsInput: false as const,
  programmaticCharacterFallbackAllowed: false as const,
  productionAssetApprovalClaimed: false as const,
});
