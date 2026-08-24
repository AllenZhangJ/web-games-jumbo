import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_RUNTIME_VARIANTS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  RACE_MODE_PREPARING_TICKS_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  createArenaV2LearningEvidenceDefinitionV1,
} from '@number-strategy-jump/arena-product-progression';

const EDGE_SEGMENT_KINDS = new Set(['gap', 'narrow-path', 'wire']);

function mapEvidenceBinding(
  mapDefinitionId: string,
  route: typeof ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
) {
  return {
    mapDefinitionId,
    raceStartAnchorIds: route.startAnchorIds,
    segments: route.segments.map((segment, index) => ({
      segmentDefinitionId: segment.id,
      progressOrdinal: index + 1,
      safeAnchorId: segment.respawnAnchorId,
      surfaceIds: segment.surfaceIds,
      edgeSurfaceIds: EDGE_SEGMENT_KINDS.has(segment.kind) ? segment.surfaceIds : [],
    })),
  };
}

export const ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1 =
  createArenaV2LearningEvidenceDefinitionV1(
    ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
    {
      schemaVersion: 1,
      status: 'production-unreachable',
      hardGate: false,
      racePreparingTicks: RACE_MODE_PREPARING_TICKS_V1,
      weaponBindings: ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map((weapon) => {
        const ground = weapon.grammar.contexts.find(({ kind }) => kind === 'ground');
        const aerial = weapon.grammar.contexts.find(({ kind }) => kind === 'aerial');
        if (!ground || !aerial) throw new RangeError(`学习证据缺少${weapon.id}地面/空中动作。`);
        const runtimeVariants = ARENA_V2_SURVIVAL_BASELINE_WEAPON_RUNTIME_VARIANTS_CANDIDATE_V1
          .filter(({ collectionEquipmentDefinitionId }) => (
            collectionEquipmentDefinitionId === weapon.equipment.id
          ));
        return {
          weaponDefinitionId: weapon.equipment.id,
          groundActionDefinitionIds: [
            ground.actionDefinitionId,
            ...runtimeVariants.map(({ actions }) => actions[0]!.id),
          ],
          aerialActionDefinitionIds: [
            aerial.actionDefinitionId,
            ...runtimeVariants.map(({ actions }) => actions[1]!.id),
          ],
          actionBindings: [
            {
              actionDefinitionId: ground.actionDefinitionId,
              runtimeEquipmentDefinitionId: weapon.equipment.id,
              context: 'ground',
              modeKinds: ['duel', 'race'],
              survivalLevel: null,
            },
            {
              actionDefinitionId: aerial.actionDefinitionId,
              runtimeEquipmentDefinitionId: weapon.equipment.id,
              context: 'aerial',
              modeKinds: ['duel', 'race'],
              survivalLevel: null,
            },
            ...runtimeVariants.flatMap((variant) => [{
              actionDefinitionId: variant.actions[0]!.id,
              runtimeEquipmentDefinitionId: variant.equipment.id,
              context: 'ground' as const,
              modeKinds: ['survival'] as const,
              survivalLevel: variant.level,
            }, {
              actionDefinitionId: variant.actions[1]!.id,
              runtimeEquipmentDefinitionId: variant.equipment.id,
              context: 'aerial' as const,
              modeKinds: ['survival'] as const,
              survivalLevel: variant.level,
            }]),
          ],
        };
      }),
      mapBindings: [
        mapEvidenceBinding(
          ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
          ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
        ),
        mapEvidenceBinding(
          ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
          ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
        ),
      ],
    },
  );

export const ARENA_V2_LEARNING_EVIDENCE_COMPOSITION_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultCompositionWired: false as const,
  definition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
});
