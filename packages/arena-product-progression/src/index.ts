export { resolveMatchReward } from './reward-resolver.js';
export type { ResolveMatchRewardOptions } from './reward-resolver.js';
export { RewardCommitter } from './reward-committer.js';
export type {
  ProfileProgressionCommitPort,
  RewardCommitOutcome,
  RewardCommitterOptions,
} from './reward-committer.js';
export {
  projectModeMatchRewardPolicyBreakdownV2,
  resolveModeMatchRewardV2,
} from './mode-reward-resolver-v2.js';
export type {
  ModeMatchRewardPolicyBreakdownV2,
  ModeMatchRewardPolicyReasonV2,
  ProjectModeMatchRewardPolicyBreakdownV2Options,
  ResolveModeMatchRewardV2Options,
} from './mode-reward-resolver-v2.js';
export {
  MODE_REWARD_COMMITTER_OPERATION_GUARD_V2,
  ModeRewardCommitterV2,
} from './mode-reward-committer-v2.js';
export type {
  ModeRewardCommitOutcomeV2,
  ModeRewardCommitterV2Options,
} from './mode-reward-committer-v2.js';
export * from './arena-v2-three-mode-reward-registry-candidate-v1.js';
// P6 candidate only; no default Profile service/composition invokes it.
export { resolveArenaV2MatchLearningGrantV1 } from './arena-v2-match-learning-grant-resolver-v1.js';
export type { ResolveArenaV2MatchLearningGrantV1Options } from './arena-v2-match-learning-grant-resolver-v1.js';
export {
  isArenaV2EffectiveMatchCompletionV1,
  isArenaV2WholeMapCollectionEarnedV1,
} from './arena-v2-effective-match-completion-v1.js';
export {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1,
  resolveArenaV2MapLearningGoalV1,
  resolveArenaV2NextLearningGoalV1,
  projectArenaV2PreparationLearningFocusV1,
  resolveArenaV2WeaponContextLearningFocusV1,
  resolveArenaV2WeaponContextLearningFocusForModeV1,
  resolveArenaV2WeaponLearningGoalV1,
} from './arena-v2-next-learning-goal-v1.js';
export {
  ARENA_V2_NEXT_LEARNING_GOAL_CONTINUATION_ROUTE_V1,
  resolveArenaV2NextLearningGoalContinuationRouteV1,
} from './arena-v2-next-learning-goal-continuation-route-v1.js';
export type {
  ArenaV2NextLearningGoalContinuationKindV1,
  ArenaV2NextLearningGoalContinuationRouteV1,
} from './arena-v2-next-learning-goal-continuation-route-v1.js';
export {
  ARENA_V2_RESULT_NEXT_GOAL_ROUTE_FIT_V1,
  resolveArenaV2ResultNextGoalRouteFitV1,
} from './arena-v2-result-next-goal-route-fit-v1.js';
export type {
  ArenaV2ResultNextGoalRouteFitKindV1,
  ArenaV2ResultNextGoalRouteFitV1,
} from './arena-v2-result-next-goal-route-fit-v1.js';
export type {
  ArenaV2NextLearningGoalKindV1,
  ArenaV2NextLearningGoalV1,
  ArenaV2PreparationLearningFocusV1,
  ArenaV2WeaponContextLearningFocusV1,
} from './arena-v2-next-learning-goal-v1.js';
// P6/A6 read-only projections; exported for explicit production-unreachable Presentation adapters.
export * from './arena-v2-collection-progress-summary-facts-projection-v1.js';
export * from './arena-v2-collection-mastery-detail-facts-projection-v1.js';
export * from './arena-v2-collection-next-goal-identity-projection-v1.js';
export * from './arena-v2-weapon-collection-research-milestone-projection-v1.js';
export * from './arena-v2-map-route-research-milestone-projection-v1.js';
export * from './arena-v2-full-catalog-replay-combination-v1.js';
export {
  ARENA_V2_HOME_RECORD_SUMMARY_READ_CONTRACT_V1,
  ARENA_V2_LEARNING_RESULT_GOAL_ROUTE_HINT_CONTRACT_V1,
  ARENA_V2_LEARNING_RESULT_PROGRESS_READABILITY_CONTRACT_V1,
  orderArenaV2NewCollectionDefinitionIdsV1,
  projectArenaV2LearningInformationV1,
  recoverArenaV2DuplicateLearningSettlementProjectionV1,
} from './arena-v2-learning-information-projection-v1.js';
export type {
  ArenaV2HomeRecordModeSummaryReadV1,
  ArenaV2HomeRecordSummaryReadV1,
  ArenaV2LearningInformationFieldPatchV1,
  ArenaV2LearningInformationProjectionV1,
  ArenaV2LearningInformationScreenIdV1,
  ArenaV2LearningInformationScreenPatchV1,
  ArenaV2LearningSettlementProjectionStatusV1,
  ArenaV2LearningSettlementProjectionV1,
  RecoverArenaV2DuplicateLearningSettlementProjectionV1Options,
} from './arena-v2-learning-information-projection-v1.js';
export {
  ARENA_V2_REWARD_PROFILE_INFORMATION_CANDIDATE_V1,
  projectArenaV2RewardProfileInformationCandidateV1,
} from './arena-v2-reward-profile-information-candidate-v1.js';
export type {
  ArenaV2RewardProfileInformationProjectionCandidateV1,
  ArenaV2RewardProfileInformationScreenIdCandidateV1,
  ArenaV2RewardProfileInformationScreenPatchCandidateV1,
} from './arena-v2-reward-profile-information-candidate-v1.js';
export {
  ARENA_V2_MODE_REWARD_SETTLEMENT_INFORMATION_CANDIDATE_V1,
  projectArenaV2ModeRewardSettlementInformationCandidateV1,
} from './arena-v2-mode-reward-settlement-information-candidate-v1.js';
export type {
  ArenaV2ModeRewardSettlementInformationProjectionCandidateV1,
} from './arena-v2-mode-reward-settlement-information-candidate-v1.js';
export {
  ARENA_V2_RETENTION_DENOMINATOR_KEY_V1,
  ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1,
  aggregateArenaV2RetentionObservationsV1,
  createArenaV2MapLearningFocusContinuationObservationV1,
  createArenaV2RetentionObservationV1,
  createArenaV2WeaponResearchFocusContinuationObservationV1,
} from './arena-v2-retention-observation-v1.js';
export type {
  ArenaV2RetentionDenominatorKeyV1,
  ArenaV2RetentionMetricV1,
  ArenaV2RetentionObservationKindV1,
  ArenaV2RetentionObservationReportV1,
  ArenaV2RetentionObservationV1,
} from './arena-v2-retention-observation-v1.js';
export {
  ARENA_V2_OFFLINE_RETENTION_OBSERVATION_BATCH_LIMIT_V1,
  ARENA_V2_OFFLINE_RETENTION_OBSERVATION_JOURNAL_CANDIDATE_V1,
  ArenaV2OfflineRetentionObservationJournalCandidateV1,
} from './arena-v2-offline-retention-observation-journal-candidate-v1.js';
export type {
  ArenaV2OfflineRetentionObservationCollectorCandidateV1,
  ArenaV2OfflineRetentionObservationExportBundleCandidateV1,
  ArenaV2OfflineRetentionObservationExportMetricCandidateV1,
  ArenaV2OfflineRetentionObservationJournalOptionsCandidateV1,
  ArenaV2OfflineRetentionObservationJournalSnapshotCandidateV1,
} from './arena-v2-offline-retention-observation-journal-candidate-v1.js';
export {
  ARENA_V2_OFFLINE_WEAPON_RESEARCH_PACE_BASELINE_STORE_CANDIDATE_V1,
  ArenaV2OfflineWeaponResearchPaceBaselineStoreCandidateV1,
} from './arena-v2-offline-weapon-research-pace-baseline-store-candidate-v1.js';
export type {
  ArenaV2OfflineWeaponResearchPaceBaselineOpenInputCandidateV1,
  ArenaV2OfflineWeaponResearchPaceBaselineReadCandidateV1,
  ArenaV2OfflineWeaponResearchPaceBaselineStoreOptionsCandidateV1,
} from './arena-v2-offline-weapon-research-pace-baseline-store-candidate-v1.js';
export {
  ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
  ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1,
  createArenaV2LearningCapacityReportV1,
} from './arena-v2-learning-capacity-report-v1.js';
export type {
  ArenaV2LearningCapacityProjectionV1,
  ArenaV2LearningCapacityReportV1,
} from './arena-v2-learning-capacity-report-v1.js';
export {
  ARENA_V2_LEARNING_PACE_CALIBRATION_CANDIDATE_V1,
  projectArenaV2LearningPaceCalibrationCandidateV1,
} from './arena-v2-learning-pace-calibration-candidate-v1.js';
export type {
  ArenaV2LearningPaceCalibrationCandidateV1,
} from './arena-v2-learning-pace-calibration-candidate-v1.js';
export {
  ARENA_V2_WEAPON_RESEARCH_PACE_CALIBRATION_CANDIDATE_V1,
  createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1,
  projectArenaV2WeaponResearchCatalogProgressCandidateV1,
  projectArenaV2WeaponResearchPaceCalibrationFromAccumulatedEvidenceCandidateV1,
  projectArenaV2WeaponResearchPaceCalibrationCandidateV1,
} from './arena-v2-weapon-research-pace-calibration-candidate-v1.js';
export type {
  ArenaV2WeaponResearchPaceAccumulatedEvidenceInputCandidateV1,
  ArenaV2WeaponResearchCatalogProgressCandidateV1,
  ArenaV2WeaponResearchPaceCalibrationCandidateV1,
  ArenaV2WeaponResearchPaceCalibrationWindowCandidateV1,
} from './arena-v2-weapon-research-pace-calibration-candidate-v1.js';
export { createArenaV2LearningEvidenceDefinitionV1 } from './arena-v2-learning-evidence-definition-v1.js';
export type {
  ArenaV2LearningEvidenceDefinitionV1,
  ArenaV2LearningMapEvidenceBindingV1,
  ArenaV2LearningSegmentEvidenceBindingV1,
  ArenaV2LearningWeaponEvidenceBindingV1,
} from './arena-v2-learning-evidence-definition-v1.js';
export { resolveArenaV2ReplayLearningGrantV1 } from './arena-v2-replay-learning-grant-resolver-v1.js';
export type { ResolveArenaV2ReplayLearningGrantV1Options } from './arena-v2-replay-learning-grant-resolver-v1.js';
