import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
  ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_ENEMY_FAMILY_CHARACTER_DEFINITION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_FORMAL_CORE_FEEDBACK_VFX_CUE_IDS_CANDIDATE_V1,
  isArenaV2FormalAssetProductionApprovedCandidateV1,
  isArenaV2FormalModelLoadPermittedCandidateV1,
  ARENA_V2_FORMAL_MODE_SUPPLY_AUDIO_CUE_IDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  ARENA_V2_FORMAL_WEAPON_PHASE_AUDIO_CUE_IDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';

function sorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...values].sort());
}

function missing(expected: readonly string[], actual: ReadonlySet<string>): readonly string[] {
  return sorted(expected.filter((id) => !actual.has(id)));
}

function assertSubset(
  actual: ReadonlySet<string>,
  expected: ReadonlySet<string>,
  name: string,
): void {
  const unknown = [...actual].filter((id) => !expected.has(id)).sort();
  if (unknown.length > 0) throw new RangeError(`${name}包含未知内容：${unknown.join(', ')}。`);
}

function weaponAudioSemantic(equipmentDefinitionId: string): string {
  const match = /^arena-v2\.weapon\.(.+)\.candidate\.v1$/u.exec(equipmentDefinitionId);
  if (match?.[1] === undefined) {
    throw new RangeError(`Arena V2武器音频无法解析${equipmentDefinitionId}。`);
  }
  if (match[1] === 'charge-shield') return 'shield-charge';
  if (match[1] === 'heavy-hammer') return 'hammer-smash';
  if (match[1] === 'gravity-chain') return 'chain-pull';
  return match[1];
}

const catalog = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1;
const playableCharacterDefinitionIds = sorted(
  ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
);
const enemyCharacterDefinitionIds = Object.freeze([
  ARENA_V2_SURVIVAL_ENEMY_FAMILY_CHARACTER_DEFINITION_CANDIDATE_V1.id,
]);
const characterDefinitionIds = sorted([
  ...playableCharacterDefinitionIds,
  ...enemyCharacterDefinitionIds,
]);
const equipmentDefinitionIds = sorted(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ equipment }) => equipment.id),
);
const mapDefinitionIds = sorted([
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
]);
const modeSupplyAudioCueIds = sorted(
  ARENA_V2_FORMAL_MODE_SUPPLY_AUDIO_CUE_IDS_CANDIDATE_V1,
);
const weaponPhaseAudioCueIds = sorted(
  ARENA_V2_FORMAL_WEAPON_PHASE_AUDIO_CUE_IDS_CANDIDATE_V1,
);
const coreFeedbackVfxCueIds = sorted(
  ARENA_V2_FORMAL_CORE_FEEDBACK_VFX_CUE_IDS_CANDIDATE_V1,
);

const actualCharacterIds = new Set(
  catalog.characterPresentationRegistry.list()
    .filter(({ defaultForCharacter }) => defaultForCharacter)
    .map(({ characterDefinitionId }) => characterDefinitionId),
);
const actualEquipmentIds = new Set(
  catalog.equipmentAssetBindings.map(({ equipmentDefinitionId }) => equipmentDefinitionId),
);
const approvedCharacterIds = new Set(
  catalog.characterPresentationRegistry.list()
    .filter(({ defaultForCharacter, modelAssetId }) => (
      defaultForCharacter && isArenaV2FormalModelLoadPermittedCandidateV1(modelAssetId)
    ))
    .map(({ characterDefinitionId }) => characterDefinitionId),
);
const approvedEquipmentIds = new Set(
  catalog.equipmentAssetBindings.flatMap(({ equipmentDefinitionId, attachmentAssetId }) => (
    isArenaV2FormalModelLoadPermittedCandidateV1(attachmentAssetId)
      ? [equipmentDefinitionId]
      : []
  )),
);
const actualMapIds = new Set(
  catalog.mapAssetBindings.map(({ mapDefinitionId }) => mapDefinitionId),
);
const approvedMapIds = new Set(
  catalog.mapAssetBindings.flatMap(({ mapDefinitionId, mapVisualAssetId }) => (
    isArenaV2FormalModelLoadPermittedCandidateV1(mapVisualAssetId)
      ? [mapDefinitionId]
      : []
  )),
);
const registeredAudioSemantics = new Set<string>(
  catalog.audioRecords.flatMap(({ actionSemantic }) => actionSemantic === null
    ? []
    : [actionSemantic]),
);
const approvedAudioSemantics = new Set<string>(
  catalog.audioRecords
    .flatMap(({ actionSemantic, audioAssetId }) => (
      actionSemantic !== null
        && isArenaV2FormalAssetProductionApprovedCandidateV1(audioAssetId)
        ? [actionSemantic]
        : []
    )),
);
const registeredModeSupplyCueIds = new Set<string>(
  catalog.audioRecords.flatMap(({ cueId }) => (
    cueId === null || cueId.startsWith('arena.cue.audio.weapon-phase.') ? [] : [cueId]
  )),
);
const approvedModeSupplyCueIds = new Set<string>(
  catalog.audioRecords.flatMap(({ cueId, audioAssetId }) => (
    isArenaV2FormalAssetProductionApprovedCandidateV1(audioAssetId)
      && cueId !== null
      && !cueId.startsWith('arena.cue.audio.weapon-phase.')
      ? [cueId]
      : []
  )),
);
const registeredWeaponPhaseCueIds = new Set<string>(
  catalog.audioRecords.flatMap(({ cueId }) => (
    cueId?.startsWith('arena.cue.audio.weapon-phase.') ? [cueId] : []
  )),
);
const approvedWeaponPhaseCueIds = new Set<string>(
  catalog.audioRecords.flatMap(({ cueId, audioAssetId }) => (
    isArenaV2FormalAssetProductionApprovedCandidateV1(audioAssetId)
      && cueId?.startsWith('arena.cue.audio.weapon-phase.')
      ? [cueId]
      : []
  )),
);
const registeredCoreFeedbackVfxCueIds = new Set<string>(
  catalog.vfxTextureRecords.map(({ cueId }) => cueId),
);
const approvedCoreFeedbackVfxCueIds = new Set<string>(
  catalog.vfxTextureRecords.flatMap(({ cueId, vfxAssetId }) => (
    isArenaV2FormalAssetProductionApprovedCandidateV1(vfxAssetId) ? [cueId] : []
  )),
);

assertSubset(actualCharacterIds, new Set(characterDefinitionIds), 'Arena V2正式角色绑定');
assertSubset(actualEquipmentIds, new Set(equipmentDefinitionIds), 'Arena V2正式武器绑定');
assertSubset(actualMapIds, new Set(mapDefinitionIds), 'Arena V2正式地图绑定');
assertSubset(
  registeredModeSupplyCueIds,
  new Set(modeSupplyAudioCueIds),
  'Arena V2模式与供给音频绑定',
);
assertSubset(
  registeredWeaponPhaseCueIds,
  new Set(weaponPhaseAudioCueIds),
  'Arena V2武器阶段音频绑定',
);
assertSubset(
  registeredCoreFeedbackVfxCueIds,
  new Set(coreFeedbackVfxCueIds),
  'Arena V2核心反馈VFX绑定',
);

const missingPlayableCharacterDefinitionIds = missing(
  playableCharacterDefinitionIds,
  actualCharacterIds,
);
const missingEnemyCharacterDefinitionIds = missing(enemyCharacterDefinitionIds, actualCharacterIds);
const missingEquipmentDefinitionIds = missing(equipmentDefinitionIds, actualEquipmentIds);
const unapprovedPlayableCharacterDefinitionIds = missing(
  playableCharacterDefinitionIds,
  approvedCharacterIds,
);
const unapprovedEnemyCharacterDefinitionIds = missing(
  enemyCharacterDefinitionIds,
  approvedCharacterIds,
);
const unapprovedEquipmentDefinitionIds = missing(equipmentDefinitionIds, approvedEquipmentIds);
const missingMapDefinitionIds = missing(mapDefinitionIds, actualMapIds);
const unapprovedMapDefinitionIds = missing(mapDefinitionIds, approvedMapIds);
const missingWeaponAudioDefinitionIds = sorted(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1
    .filter(({ equipment }) => !registeredAudioSemantics.has(
      weaponAudioSemantic(equipment.id),
    ))
    .map(({ equipment }) => equipment.id),
);
const unapprovedWeaponAudioDefinitionIds = sorted(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1
    .filter(({ equipment }) => !approvedAudioSemantics.has(
      weaponAudioSemantic(equipment.id),
    ))
    .map(({ equipment }) => equipment.id),
);
const missingModeSupplyAudioCueIds = missing(
  ARENA_V2_FORMAL_MODE_SUPPLY_AUDIO_CUE_IDS_CANDIDATE_V1,
  registeredModeSupplyCueIds,
);
const unapprovedModeSupplyAudioCueIds = missing(
  ARENA_V2_FORMAL_MODE_SUPPLY_AUDIO_CUE_IDS_CANDIDATE_V1,
  approvedModeSupplyCueIds,
);
const missingWeaponPhaseAudioCueIds = missing(
  weaponPhaseAudioCueIds,
  registeredWeaponPhaseCueIds,
);
const unapprovedWeaponPhaseAudioCueIds = missing(
  weaponPhaseAudioCueIds,
  approvedWeaponPhaseCueIds,
);
const missingCoreFeedbackVfxCueIds = missing(
  coreFeedbackVfxCueIds,
  registeredCoreFeedbackVfxCueIds,
);
const unapprovedCoreFeedbackVfxCueIds = missing(
  coreFeedbackVfxCueIds,
  approvedCoreFeedbackVfxCueIds,
);

const AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  playableCharacterDefinitionIds,
  enemyCharacterDefinitionIds,
  equipmentDefinitionIds,
  mapDefinitionIds,
  modeSupplyAudioCueIds,
  weaponPhaseAudioCueIds,
  coreFeedbackVfxCueIds,
  missingPlayableCharacterDefinitionIds,
  missingEnemyCharacterDefinitionIds,
  missingEquipmentDefinitionIds,
  unapprovedPlayableCharacterDefinitionIds,
  unapprovedEnemyCharacterDefinitionIds,
  unapprovedEquipmentDefinitionIds,
  missingMapDefinitionIds,
  unapprovedMapDefinitionIds,
  missingWeaponAudioDefinitionIds,
  unapprovedWeaponAudioDefinitionIds,
  missingModeSupplyAudioCueIds,
  unapprovedModeSupplyAudioCueIds,
  missingWeaponPhaseAudioCueIds,
  unapprovedWeaponPhaseAudioCueIds,
  missingCoreFeedbackVfxCueIds,
  unapprovedCoreFeedbackVfxCueIds,
  missingCoreFeedbackVisualCueCount: missingCoreFeedbackVfxCueIds.length,
  unarmedImpactAudioReady: catalog.audioRecords.some(
    ({ actionSemantic, audioAssetId }) => actionSemantic === 'base-push'
      && isArenaV2FormalAssetProductionApprovedCandidateV1(audioAssetId),
  ),
  formalVisualAssetsReady: missingPlayableCharacterDefinitionIds.length === 0
    && unapprovedPlayableCharacterDefinitionIds.length === 0
    && missingEnemyCharacterDefinitionIds.length === 0
    && unapprovedEnemyCharacterDefinitionIds.length === 0
    && missingEquipmentDefinitionIds.length === 0
    && unapprovedEquipmentDefinitionIds.length === 0
    && missingMapDefinitionIds.length === 0
    && unapprovedMapDefinitionIds.length === 0
    && missingCoreFeedbackVfxCueIds.length === 0
    && unapprovedCoreFeedbackVfxCueIds.length === 0,
  registeredCoreFeedbackVfxReady: missingCoreFeedbackVfxCueIds.length === 0,
  formalCoreFeedbackVfxReady: missingCoreFeedbackVfxCueIds.length === 0
    && unapprovedCoreFeedbackVfxCueIds.length === 0,
  registeredWeaponAudioReady: missingWeaponAudioDefinitionIds.length === 0,
  formalWeaponAudioReady: missingWeaponAudioDefinitionIds.length === 0
    && unapprovedWeaponAudioDefinitionIds.length === 0
    && missingWeaponPhaseAudioCueIds.length === 0
    && unapprovedWeaponPhaseAudioCueIds.length === 0,
  registeredWeaponPhaseAudioReady: missingWeaponPhaseAudioCueIds.length === 0,
  formalWeaponPhaseAudioReady: missingWeaponPhaseAudioCueIds.length === 0
    && unapprovedWeaponPhaseAudioCueIds.length === 0,
  registeredModeSupplyAudioReady: missingModeSupplyAudioCueIds.length === 0,
  formalModeSupplyAudioReady: missingModeSupplyAudioCueIds.length === 0
    && unapprovedModeSupplyAudioCueIds.length === 0,
  formalAudioAssetsReady: missingWeaponAudioDefinitionIds.length === 0
    && unapprovedWeaponAudioDefinitionIds.length === 0
    && missingWeaponPhaseAudioCueIds.length === 0
    && unapprovedWeaponPhaseAudioCueIds.length === 0
    && missingModeSupplyAudioCueIds.length === 0
    && unapprovedModeSupplyAudioCueIds.length === 0,
  programmaticNormalPathAllowed: false as const,
});

export const ARENA_V2_FORMAL_ASSET_CONTENT_CLOSURE_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Formal Asset Content Closure Candidate V1',
  ),
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  validationStatus: 'not-run' as const,
});
