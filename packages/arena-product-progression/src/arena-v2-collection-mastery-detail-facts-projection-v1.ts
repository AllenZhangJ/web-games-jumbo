import {
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  type ArenaV2WeaponLearningContextV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  projectArenaV2MapRouteResearchMilestoneV1,
  type ArenaV2MapRouteResearchMilestoneProjectionV1,
} from './arena-v2-map-route-research-milestone-projection-v1.js';
import { readExactOptions } from './options.js';

export const ARENA_V2_COLLECTION_MASTERY_DETAIL_FACTS_PROJECTION_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_COLLECTION_MASTERY_DETAIL_FACTS_PROJECTION_V1_METADATA = Object.freeze({
  status: 'production-unreachable' as const,
  defaultSurfaceWired: false as const,
  validationStatus: 'not-run' as const,
});

export interface ArenaV2CollectionMasteryDetailFactsSelectionV1 {
  readonly kind: 'weapon' | 'map';
  readonly targetDefinitionId: string;
}

export interface ArenaV2WeaponMasteryContextDetailFactV1 {
  readonly context: ArenaV2WeaponLearningContextV1;
  readonly evidenceCount: number;
  readonly completedAtRevision: number | null;
}

export interface ArenaV2WeaponMasteryDetailFactsProjectionV1 {
  readonly schemaVersion:
    typeof ARENA_V2_COLLECTION_MASTERY_DETAIL_FACTS_PROJECTION_V1_SCHEMA_VERSION;
  readonly ownerId: 'p6-profile';
  readonly kind: 'weapon';
  readonly profileRevision: number;
  readonly weaponDefinitionId: string;
  readonly collected: boolean;
  readonly useCount: number;
  readonly collectionEvidenceTarget: number;
  readonly contexts: readonly ArenaV2WeaponMasteryContextDetailFactV1[];
}

export interface ArenaV2MapSegmentMasteryDetailFactV1 {
  readonly segmentDefinitionId: string;
  readonly completionEvidenceCount: number;
  readonly completedAtRevision: number | null;
}

export interface ArenaV2MapMasteryDetailFactsProjectionV1 {
  readonly schemaVersion:
    typeof ARENA_V2_COLLECTION_MASTERY_DETAIL_FACTS_PROJECTION_V1_SCHEMA_VERSION;
  readonly ownerId: 'p6-profile';
  readonly kind: 'map';
  readonly profileRevision: number;
  readonly mapDefinitionId: string;
  readonly routeResearch: ArenaV2MapRouteResearchMilestoneProjectionV1;
  readonly segments: readonly ArenaV2MapSegmentMasteryDetailFactV1[];
}

export type ArenaV2CollectionMasteryDetailFactsProjectionV1 =
  | ArenaV2WeaponMasteryDetailFactsProjectionV1
  | ArenaV2MapMasteryDetailFactsProjectionV1;

const OPTION_KEYS = new Set(['profileDefinition', 'profile', 'selection']);
const SELECTION_KEYS = new Set(['kind', 'targetDefinitionId']);

function readSelection(value: unknown): ArenaV2CollectionMasteryDetailFactsSelectionV1 {
  const source = readExactOptions(
    value,
    SELECTION_KEYS,
    'ArenaV2CollectionMasteryDetailFactsProjectionV1.selection',
  );
  if (source.kind !== 'weapon' && source.kind !== 'map') {
    throw new RangeError('Collection mastery detail selection.kind 不受支持。');
  }
  if (typeof source.targetDefinitionId !== 'string'
    || source.targetDefinitionId.trim().length === 0) {
    throw new TypeError('Collection mastery detail targetDefinitionId 必须是非空字符串。');
  }
  return Object.freeze({
    kind: source.kind,
    targetDefinitionId: source.targetDefinitionId,
  });
}

export function projectArenaV2CollectionMasteryDetailFactsV1(
  value: unknown,
): ArenaV2CollectionMasteryDetailFactsProjectionV1 {
  const options = readExactOptions(
    value,
    OPTION_KEYS,
    'ArenaV2CollectionMasteryDetailFactsProjectionV1 options',
  );
  const definition = createArenaV2LearningProfileDefinitionV1(options.profileDefinition);
  const profile = createArenaV2LearningProfileV1(definition, options.profile);
  const selection = readSelection(options.selection);

  if (selection.kind === 'weapon') {
    if (!definition.weaponDefinitionIds.includes(selection.targetDefinitionId)) {
      throw new RangeError('Collection mastery detail 引用了未知武器Definition。');
    }
    const record = profile.weaponMastery.find(({ weaponDefinitionId }) => (
      weaponDefinitionId === selection.targetDefinitionId
    ));
    const contexts = ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.map((context, index) => {
      const detail = record?.contexts[index];
      if (detail !== undefined && detail.context !== context) {
        throw new RangeError('Collection mastery detail 武器情境顺序发生漂移。');
      }
      return Object.freeze({
        context,
        evidenceCount: detail?.evidenceCount ?? 0,
        completedAtRevision: detail?.completedAtRevision ?? null,
      });
    });
    return Object.freeze({
      schemaVersion: ARENA_V2_COLLECTION_MASTERY_DETAIL_FACTS_PROJECTION_V1_SCHEMA_VERSION,
      ownerId: 'p6-profile' as const,
      kind: 'weapon' as const,
      profileRevision: profile.revision,
      weaponDefinitionId: selection.targetDefinitionId,
      collected: profile.collections.weaponDefinitionIds.includes(selection.targetDefinitionId),
      useCount: record?.useCount ?? 0,
      collectionEvidenceTarget: definition.masteryRequirements.weaponCollectionUseEvidence,
      contexts: Object.freeze(contexts),
    });
  }

  const mapDefinition = definition.mapDefinitions.find(({ mapDefinitionId }) => (
    mapDefinitionId === selection.targetDefinitionId
  ));
  if (!mapDefinition) {
    throw new RangeError('Collection mastery detail 引用了未知地图Definition。');
  }
  const recordBySegmentId = new Map(
    profile.mapSegmentMastery
      .filter(({ mapDefinitionId }) => mapDefinitionId === mapDefinition.mapDefinitionId)
      .map((record) => [record.segmentDefinitionId, record] as const),
  );
  const segments = mapDefinition.segmentDefinitionIds.map((segmentDefinitionId) => {
    const record = recordBySegmentId.get(segmentDefinitionId);
    return Object.freeze({
      segmentDefinitionId,
      completionEvidenceCount: record?.completionEvidenceCount ?? 0,
      completedAtRevision: record?.completedAtRevision ?? null,
    });
  });
  const completedSegmentCount = segments.filter(({ completedAtRevision }) => (
    completedAtRevision !== null
  )).length;
  const routeResearch = projectArenaV2MapRouteResearchMilestoneV1({
    evidenceCount: segments.reduce((total, segment) => (
      total + segment.completionEvidenceCount
    ), 0),
    completedSegmentCount,
    segmentCount: segments.length,
    evidencePerSegmentTarget: definition.masteryRequirements.mapSegmentCompletionEvidence,
  });
  return Object.freeze({
    schemaVersion: ARENA_V2_COLLECTION_MASTERY_DETAIL_FACTS_PROJECTION_V1_SCHEMA_VERSION,
    ownerId: 'p6-profile' as const,
    kind: 'map' as const,
    profileRevision: profile.revision,
    mapDefinitionId: mapDefinition.mapDefinitionId,
    routeResearch,
    segments: Object.freeze(segments),
  });
}
