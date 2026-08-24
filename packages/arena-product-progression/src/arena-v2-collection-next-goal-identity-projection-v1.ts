import type {
  ArenaV2WeaponLearningContextV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  resolveArenaV2NextLearningGoalV1,
  type ArenaV2NextLearningGoalKindV1,
} from './arena-v2-next-learning-goal-v1.js';

export const ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_METADATA = Object.freeze({
  status: 'production-unreachable' as const,
  defaultSurfaceWired: false as const,
  validationStatus: 'not-run' as const,
  inheritedUnreachableGoalKinds: Object.freeze([] as const),
  inheritedUnreachableGoalReason: null,
  catalogCompleteReachable: true as const,
  catalogCompleteKindMeaning: 'resolved-learning-scope-complete' as const,
  fullCatalogTerminalGoalId: ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  activeLearningCompletionGoalId: ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  fullCatalogTerminalMeaning: 'free-challenge-or-record-refresh' as const,
});

export interface ArenaV2CollectionNextGoalIdentityProjectionV1 {
  readonly schemaVersion:
    typeof ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_SCHEMA_VERSION;
  readonly profileRevision: number;
  readonly kind: ArenaV2NextLearningGoalKindV1;
  readonly goalId: string;
  readonly weaponDefinitionId: string | null;
  readonly mapDefinitionId: string | null;
  readonly segmentDefinitionId: string | null;
  readonly modeDefinitionId: string | null;
  readonly challengeDefinitionId: string | null;
  readonly context: ArenaV2WeaponLearningContextV1 | null;
}

export function projectArenaV2CollectionNextGoalIdentityV1(
  value: unknown,
): ArenaV2CollectionNextGoalIdentityProjectionV1 {
  const goal = resolveArenaV2NextLearningGoalV1(value);
  return Object.freeze({
    schemaVersion: ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_SCHEMA_VERSION,
    profileRevision: goal.profileRevision,
    kind: goal.kind,
    goalId: goal.goalId,
    weaponDefinitionId: goal.weaponDefinitionId,
    mapDefinitionId: goal.mapDefinitionId,
    segmentDefinitionId: goal.segmentDefinitionId,
    modeDefinitionId: goal.modeDefinitionId,
    challengeDefinitionId: goal.challengeDefinitionId,
    context: goal.context,
  });
}
