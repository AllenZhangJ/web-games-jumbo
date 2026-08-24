import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  assertSynchronousReturn,
  createDeterministicDataHash,
  createMatchContentSelectionV2,
  createMatchRosterAssignmentV2,
  createModeResultV3Payload,
  finalizeMatchParticipantAssignmentV2,
  type FinalizedMatchAssignmentV2,
  type MatchContentSelectionV2,
  type MatchRosterAssignmentV2,
} from '@number-strategy-jump/arena-contracts';
import {
  MODE_CONTROLLER_KIND,
  MODE_KIND,
  MODE_ROLE,
  MODE_SLOT_RULE_KIND,
  ModeRegistry,
  type ModeDefinition,
  type ResolvedModePolicyBundle,
} from '@number-strategy-jump/arena-definitions';
import {
  validateProductMatchResultV3,
} from '@number-strategy-jump/arena-product-contracts';
import {
  ArenaV2ProductAuthorityRegistryCandidateV1,
} from '@number-strategy-jump/arena-product-match';
import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
  ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
  ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1,
  ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1,
  ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_ENEMY_SLOT_IDS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1,
  ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION,
  ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1,
  type ArenaV2ThreeModeRegistryCandidateV1,
} from '@number-strategy-jump/arena-product-content';
import {
  ArenaV2InformationModeSessionHostCandidateV1,
  ArenaV2LearningSettlementIntentJournalCandidateV1,
  ArenaV2LearningSettlementRecoveryOwnerCandidateV1,
  ArenaV2ModeLearningSessionFactoryCandidateV1,
  ArenaV2ProfileServicesOwnerCandidateV1,
  ArenaV2QuickMatchBundleFactoryCandidateV1,
  ARENA_V2_FORMAL_ASSET_CONTENT_CLOSURE_CANDIDATE_V1,
  ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
  projectArenaV2RegistryWeaponSequenceCandidateV1,
  preflightArenaV2ModeLearningSessionFactoryDependenciesCandidateV1,
  resolveArenaV2ProfilePersistenceDispositionCandidateV1,
  type ArenaV2ModeLearningMatchBundleCandidateV1,
  type ArenaV2ModeLearningMatchBundleFactoryPortCandidateV1,
  type ArenaV2ModeLearningSessionFactoryRequestCandidateV1,
} from '@number-strategy-jump/arena-product-composition';
import {
  ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
  ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1,
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  ArenaV2ModeHudValidatedStepProjectionV1,
  ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1,
  addArenaV2InformationCompetitivePreparationLinksToRenderPlanCandidateV1,
  addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1,
  addArenaV2InformationDetailDirectoryLinkToRenderPlanCandidateV1,
  addArenaV2InformationModeCharacterLinkToRenderPlanCandidateV1,
  addArenaV2InformationModePreparationLinkToRenderPlanCandidateV1,
  addArenaV2InformationPreparationDetailReturnToRenderPlanCandidateV1,
  addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1,
  addArenaV2InformationSelectionToRenderPlanCandidateV1,
  addArenaV2InformationSurvivalPreparationLinksToRenderPlanCandidateV1,
  createArenaV2InformationScreenPipelineV1,
  projectArenaV2CharacterInformationCandidateV1,
  projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1,
  projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1,
  projectArenaV2InformationCollectionContentV1,
  projectArenaV2FullCatalogReplayCombinationInformationFieldSourceCandidateV1,
  projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1,
  projectArenaV2LoadingInformationCandidateV1,
  projectArenaV2MapDetailContentFieldsV1,
  projectArenaV2MapRouteSkeletonReadV1,
  projectArenaV2MapRouteResearchSelectionCandidateV1,
  projectArenaV2ModeContentInformationCandidateV1,
  projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1,
  projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1,
  projectArenaV2ProductSessionInformationCandidateV1,
  projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1,
  projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1,
  projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1,
  projectArenaV2WeaponAvailabilityInformationSelectionCandidateV1,
  projectArenaV2WeaponCollectionResearchSelectionCandidateV1,
  projectArenaV2WeaponCoreFightReadV1,
  projectArenaV2WeaponDetailContentFieldsV1,
  type ArenaV2InformationFieldCompositionInputV1,
  type ArenaV2InformationDetailBrowseProjectionCandidateV1,
  type ArenaV2InformationFieldSourceV1,
  type ArenaV2InformationSelectionProjectionCandidateV1,
  type ArenaV2ResultNewCollectionDetailItemCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  ARENA_V2_OFFLINE_RETENTION_OBSERVATION_BATCH_LIMIT_V1,
  createArenaV2MapLearningFocusContinuationObservationV1,
  createArenaV2RetentionObservationV1,
  createArenaV2WeaponResearchFocusContinuationObservationV1,
  createArenaV2ThreeModeRewardRegistryCandidateV1,
  orderArenaV2NewCollectionDefinitionIdsV1,
  projectArenaV2CollectionProgressSummaryFactsV1,
  projectArenaV2FullCatalogReplayCombinationV1,
  projectArenaV2LearningInformationV1,
  projectArenaV2ModeRewardSettlementInformationCandidateV1,
  projectArenaV2PreparationLearningFocusV1,
  projectArenaV2RewardProfileInformationCandidateV1,
  resolveArenaV2ResultNextGoalRouteFitV1,
  resolveArenaV2NextLearningGoalContinuationRouteV1,
  resolveArenaV2NextLearningGoalV1,
  type ArenaV2LearningSettlementProjectionV1,
  type ArenaV2NextLearningGoalV1,
  type ArenaV2NextLearningGoalContinuationRouteV1,
  type ArenaV2ResultNextGoalRouteFitV1,
  type ArenaV2RetentionObservationKindV1,
  type ArenaV2RetentionObservationV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  ModeAuthoritativeQuickMatchServiceV3,
} from '@number-strategy-jump/arena-quick-match';
import {
  ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1,
  createArenaDuelAuthoritativeRuntimeCandidateV1,
} from './arena-duel-authoritative-runtime-candidate-v1.js';
import {
  ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1,
  createArenaRaceAuthoritativeRuntimeCandidateV1,
} from './arena-race-vertical-integration-verification-v1.js';
import {
  ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1,
  createArenaSurvivalAuthoritativeRuntimeCandidateV1,
} from './arena-survival-shared-world-authority-verification-v1.js';
import {
  ARENA_THREE_MODE_WEAPON_FEEDBACK_LONG_RESTORE_SUFFIX_CANDIDATE_V2,
  ARENA_THREE_MODE_WEAPON_FEEDBACK_RESTORE_SUFFIX_CANDIDATE_V1,
  type ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1,
} from './arena-three-mode-weapon-feedback-restore-suffix-candidate-v1.js';
import {
  ARENA_THREE_MODE_CONTENT_SELECTION_CHECKPOINT_CAPABILITY_V1,
} from './arena-three-mode-content-selection-checkpoint-capability-v1.js';
import {
  assertArenaV2ResultPlayAgainContentContinuityCandidateV1,
  captureArenaV2ResultPlayAgainContentContinuityCandidateV1,
  type ArenaV2ResultPlayAgainContentContinuityCandidateV1,
} from './arena-v2-result-play-again-content-continuity-candidate-v1.js';
import {
  createArenaThreeModeRuntimePolicyBindingCandidateV1,
  validateArenaThreeModeRuntimePolicyBindingCandidateV1,
  type ArenaThreeModeRuntimePolicyBindingCandidateV1,
} from './arena-three-mode-runtime-policy-binding-candidate-v1.js';
import {
  createArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1,
  type ArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1,
} from './arena-three-mode-timeline-runtime-wiring-eligibility-candidate-v1.js';

export const ARENA_THREE_MODE_AUTHORITATIVE_QUICK_MATCH_COMPOSITION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    modeDefinitionIds: Object.freeze({
      duel: ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
      race: ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
      survival: ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
    }),
    weaponFeedbackCheckpointCapabilities: Object.freeze([
      Object.freeze({
        modeKind: 'duel' as const,
        modeDefinitionId: ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
        capability: ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1
          .weaponFeedbackCheckpointCapability,
      }),
      Object.freeze({
        modeKind: 'race' as const,
        modeDefinitionId: ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
        capability: ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1
          .weaponFeedbackCheckpointCapability,
      }),
      Object.freeze({
        modeKind: 'survival' as const,
        modeDefinitionId: ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
        capability: ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1
          .weaponFeedbackCheckpointCapability,
      }),
    ]),
    weaponFeedbackDirectionCheckpointCapabilities: Object.freeze([
      Object.freeze({
        modeKind: 'duel' as const,
        modeDefinitionId: ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
        capability: ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1
          .weaponFeedbackDirectionCheckpointCapability,
      }),
      Object.freeze({
        modeKind: 'race' as const,
        modeDefinitionId: ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
        capability: ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1
          .weaponFeedbackDirectionCheckpointCapability,
      }),
      Object.freeze({
        modeKind: 'survival' as const,
        modeDefinitionId: ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
        capability: ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1
          .weaponFeedbackDirectionCheckpointCapability,
      }),
    ]),
    weaponFeedbackRestoreSuffixCapability:
      ARENA_THREE_MODE_WEAPON_FEEDBACK_RESTORE_SUFFIX_CANDIDATE_V1,
    weaponFeedbackLongRestoreSuffixCapability:
      ARENA_THREE_MODE_WEAPON_FEEDBACK_LONG_RESTORE_SUFFIX_CANDIDATE_V2,
    contentSelectionCheckpointCapability:
      ARENA_THREE_MODE_CONTENT_SELECTION_CHECKPOINT_CAPABILITY_V1,
    defaultRaceParticipantCount: 4,
    defaultSurvivalEnemyCount: 16,
    ownsBotInputInsideRuntime: true,
    terminalAuthorityIdentity: 'real-replay-v6-terminal-session',
    terminalSupplyOwnershipEvidence:
      'runtime-terminal-evidence-v2-product-settlement-v3-learning-bridge-v3',
    validatedHudProjectionWired: true,
    rendererNeutralSceneReadProjectionWired: true,
    atomicHudAudioVisualOwnerWired: true,
    twentyWeaponFeedbackReadPlanHudOwnerWired: true,
    authorityWeaponFeedbackDirectionFactsV2Wired: true,
    atomicRewardAndLearningProfileOwnerWired: true,
    informationProfileProjectionWired: true,
    informationCollectionSelectionUsesSingleProfileRegistryReadSnapshot: true,
    informationCollectionReadBundlesSelectionContentProfileAndRegistry: true,
    resultNextGoalNavigationUsesFrozenRouteFitWeaponScope: true,
    homeContinuationNavigationUsesFrozenGoalWeaponScope: true,
    informationPageProjectionReusesSingleRewardAndLearningProfileReads: true,
    informationPipelineSelectionReusesPageProjectionReadBundle: true,
    informationPipelineDetailBrowseReusesPageProjectionReadBundle: true,
    informationPipelineCarriesPageRecoveryAndNextGoalRead: true,
    informationPipelineCarriesResultRecommendationsFromPageRead: true,
    resultNextGoalClickUsesSingleSettlementAndLearningRead: true,
    resultReadConsumersAvoidSettlementExistencePreflightReread: true,
    informationPageProjectionCarriesSingleLearningSettlementRead: true,
    informationPageProjectionUsesAggregateRecoveryOwnerSnapshot: true,
    informationCompositionReusesInitialModeSessionStateRead: true,
    modeContentContinuationPreparationReusesPageLearningRead: true,
    continuationGoalDriftChecksReuseSingleLearningRead: true,
    informationNavigationSelectionReadAvoidsProfileProjection: true,
    primaryIntentReusesSingleLearningSettlementAndRouteFitRead: true,
    diagnosticSnapshotReusesCurrentScreenPageProjectionRead: true,
    informationInteractionGateReadSharesInformationAndRecoverySnapshot: true,
    informationPageProjectionAvoidsNestedHostGuardReads: true,
    informationPageProjectionUsesGuardFreeProfileAndRegistryReads: true,
    settlementRecoveryRetryReusesSingleInformationSnapshot: true,
    standaloneInformationProjectionsUseSingleOuterHostGuard: true,
    highFrequencyInformationConsumersReuseOuterHostGuard: true,
    continuationDriftCallersReuseOuterHostGuard: true,
    bottomNavigationReusesSingleWritableHost: true,
    primaryIntentReusesSingleWritableHost: true,
    diagnosticSnapshotReusesSingleHostAndInformationRead: true,
    detailBrowseReusesOuterHostRegistryRead: true,
    nextGoalReadsReuseSingleLearningAndRegistrySnapshot: true,
    weaponSelectionReusesOuterHostAndDeadProfileReadWrappersRemoved: true,
    rewardAndLearningInformationProfileProjectionsWired: true,
    recoverableLearningSettlementProjectionRetryWired: true,
    dedicatedLearningSettlementRecoveryEvidenceOwnerWired: true,
    persistentLearningSettlementIntentJournalWired: true,
    settlementAcknowledgementFailureKeepsResultReadable: true,
    settlementAcknowledgementFailureBlocksAllMutationsUntilRestart: true,
    startupSettlementRecoveryNoticeWired: true,
    immutableLearningSettlementRecoveryEvidenceWired: true,
    learningSettlementFinalizationReentryBlocked: true,
    unresolvedLearningSettlementRecoveryBlocksNextMatch: true,
    learningSettlementBaselineCapturedBeforeMatchStartMutation: true,
    indeterminateMatchStartFailsClosedUntilDestroy: true,
    learningSettlementPostProcessingExactlyOnce: true,
    resultPrimaryActionReusedForPendingLearningSettlementRecovery: true,
    offlineWeaponResearchFocusContinuationObservationOptInWired: true,
    offlineWeaponContextFocusContinuationObservationOptInWired: true,
    offlineMapLearningFocusContinuationObservationOptInWired: true,
    learningFocusObservationBindsGoalAndSettlementProfileRevision: true,
    weaponResearchFocusUsesReducerAppliedIdentityOnly: true,
    sixOfflineRetentionObservationLifecycleOptInWired: true,
    sevenOfflineRetentionObservationLifecycleOptInWired: true,
    eightOfflineRetentionObservationLifecycleOptInWired: true,
    homeContinuationFollowObservationOptInWired: true,
    homeContinuationFollowUsesFrozenMatchStartScene: true,
    homeContinuationObservationFailureNeverBlocksMatchStart: true,
    modeConfirmationShowsHomeContinuationPreparationState: true,
    adjustedHomeContinuationStillAllowsCurrentSelection: true,
    homeContinuationPreparationStateIndependentFromRetentionCollector: true,
    resultHomeContinuationReceiptUsesValidatedMatchStartScene: true,
    resultHomeContinuationReceiptNeverClaimsGoalCompletion: true,
    resultHomeContinuationReceiptFailureNeverBlocksMatch: true,
    resultMatchStartLearningGoalAttemptReceiptWired: true,
    resultMatchStartLearningGoalAttemptUsesFrozenProfileAndRegistryRead: true,
    resultMatchStartLearningGoalAttemptUsesReducerAppliedIdentityOnly: true,
    resultMatchStartLearningGoalAttemptIndependentFromRetentionCollector: true,
    resultGoalPreparationReusesContinuationConfirmationSession: true,
    resultGoalPreparationRevalidatesGoalModeWeaponAndMap: true,
    resultGoalPreparationPreservesSurvivalUnarmedStart: true,
    resultGoalPreparationNeverWritesHomeContinuationMetric: true,
    continuationPreparationOptionalDepthPreservesSession: true,
    continuationPreparationExplicitExitClearsAfterNavigation: true,
    continuationPreparationExitCompletesOnlyPendingHomeObservation: true,
    resultCollectionDetailCarriesPendingGoalPreparation: true,
    resultCollectionDetailRevalidatesGoalBeforeModeConfirmation: true,
    resultCollectionDetailAdjacentBrowseBecomesAdjustedPreparation: true,
    resultCollectionDetailExitClearsPendingPreparation: true,
    resultNewCollectionDetailUsesCommittedReducerOutcomeOnly: true,
    resultNewCollectionDetailFiltersInactiveRegistryWeapons: true,
    resultNewCollectionDetailClickRevalidatesRevisionAndSettlementIdentity: true,
    resultNewCollectionDetailReusesExistingDetailNavigation: true,
    resultNewCollectionDetailDoesNotReplaceLongTermGoalPrimaryAction: true,
    resultNewCollectionDetailSelectionChangesOnlyAfterNavigationCommit: true,
    resultNewCollectionDetailNeverStartsMatch: true,
    goalAlignedPlayAgainUsesRenderedRouteFitIdentity: true,
    goalAlignedPlayAgainRevalidatesStableOrConditionalFit: true,
    goalAlignedPlayAgainReceiptUsesValidatedMatchStartScene: true,
    goalAlignedPlayAgainCountsAsNextGoalSelection: true,
    arbitraryPlayAgainNeverClaimsGoalContinuation: true,
    explicitNextGoalReusesModeOrDetailContinuationSession: true,
    explicitNextGoalUnsupportedRoutesNeverClaimPreparation: true,
    staleContinuationPreparationHiddenWithoutMutation: true,
    staleContinuationPreparationClearedBeforeNextAction: true,
    staleContinuationNeverCreatesMatchReceipt: true,
    staleResultDetailContinuesAsOrdinaryNavigation: true,
    retentionObservationSequenceCommitsAfterCollectorSuccess: true,
    retentionProducerStateCommitsAfterCollectorSuccess: true,
    retentionPendingActionConsumptionCommitsAfterCollectorSuccess: true,
    retentionPendingActionBlocksLaterWatermarksUntilRetry: true,
    retentionPendingActionRetriesFrozenObservationIdentity: true,
    retentionPendingOpportunityNeverReplacedBeforeCommit: true,
    retentionCollectorReentryCheckedBeforeWatermarkCommit: true,
    retentionRetryReentryCheckedBeforeBusinessAction: true,
    retentionPendingActionRetryBlocksBusinessUntilCommitted: true,
    retentionActionRetryCapturesCurrentCatalogBeforeBusiness: true,
    retentionPendingActionBlocksMatchStartBeforeBaseline: true,
    retentionSettlementWorkBatchBoundedToTwentyFive: true,
    retentionSettlementWorkBatchFreezesOrderedObservationsAndPostCommit: true,
    retentionSettlementWorkBatchRetriesFromExactCursor: true,
    retentionSettlementUsesAtomicCollectorBatchWhenAvailable: true,
    retentionAtomicBatchPreconditionsCheckedBeforeCollectorCall: true,
    retentionAtomicBatchPostStateCommitsOnlyAfterCollectorSuccess: true,
    retentionCollectorsWithoutBatchPortRemainSupported: true,
    retentionCatalogWorkFreezesNavigationRevisionAndOrdinal: true,
    retentionFocusClearsOnlyAfterCollectorCommit: true,
    retentionSettlementWorkBlocksNextMatchUntilDrained: true,
    retentionDestroyDrainsFrozenWorkBeforeChildCleanup: true,
    retentionNextGoalCaptureDebtFrozenAtSettlementCommit: true,
    retentionNextGoalCaptureDebtRetriesSameProfileGeneration: true,
    retentionNextGoalCaptureFreezesRegistryScopeBeforeResolver: true,
    retentionNextGoalCaptureRetriesNeverRereadRegistryScope: true,
    retentionNextGoalCaptureDebtBlocksBusinessAndMatchStart: true,
    retentionNextGoalCaptureDebtClearsOnlyAfterGoalIdentityClosure: true,
    retentionNextGoalCaptureMutuallyExclusiveWithWorkActionAndImpression: true,
    retentionDestroyDrainsNextGoalCaptureBeforeChildCleanup: true,
    retentionWithoutCollectorCreatesNoNextGoalCaptureDebt: true,
    scopeCompletionDoesNotCreateNextGoalSelectionDenominator: true,
    settledRetentionFactsBindCommittedProfileAndReplayContent: true,
    settledRetentionFactsUseCompleteLocalProductResultWeaponUsage: true,
    authorityResearchCandidateOnlyChecksSettlementIdentity: true,
    nextGoalAndHomeRetentionBindFrozenProfileRevision: true,
    retentionObservationCollectorReentryBlocked: true,
    localPlayableCleanupClosesAllBusinessEntry: true,
    localPlayablePartialCleanupRetainsOnlyIncompleteOwners: true,
    localPlayableCleanupFollowsConsumerBeforeDependencyOrder: true,
    localPlayableConstructionCleanupPreservesPrimaryAndAllCleanupFailures: true,
    localPlayableConstructionCleanupRetainsRetryableOwnerDebt: true,
    localPlayableConstructionCleanupWaitsForNestedDownstreamDebt: true,
    localPlayableEvidenceClearsAfterAllOwnedResources: true,
    localPlayableHostSynchronousLifecycleReentryRejected: true,
    localPlayableHostSwallowedChildReentryFailsClosed: true,
    localPlayableHostReentryFailureRetainsCleanupOwnership: true,
    localPlayableHostPublicReadsRejectDuringOperation: true,
    localPlayableHostDestroyFastPathChecksOperationFirst: true,
    localPlayableFailureCleanupUsesPrivateOwnedResourcePath: true,
    localPlayableFailureCleanupDoesNotReenterPublicDestroy: true,
    localPlayableHostOperationLockScope:
      'navigation-selection-match-settlement-recovery-preferences-destroy',
    localPlayablePrimarySnapshotsRejectedDuringMutation: true,
    playableHostCleanupClosesAllBusinessEntry: true,
    playableHostPartialCleanupRetainsOnlyIncompleteOwners: true,
    playableHostTerminalStateWaitsForInformationAndHudOwners: true,
    playableHostCleanupFollowsHudConsumerBeforeInformationOwner: true,
    playableHostConstructionCleanupRetainsRetryableHudOwner: true,
    playableHostPreflightsHudBeforeInformationOwnerConstruction: true,
    playableHostSynchronousLifecycleReentryRejected: true,
    playableHostSwallowedChildReentryFailsClosed: true,
    playableHostReentryFailureCleansOwnedResources: true,
    playableHostDestroyFastPathChecksOperationFirst: true,
    playableHostOperationLockScope:
      'all-business-mutations-and-destroy-with-read-snapshot-rejection',
    defaultRetentionObservationSinkWired: false,
    productSessionAndResultInformationProjectionWired: true,
    resultNextGoalDirectRouteWired: true,
    resultGoalAlignedSingleActionRecommendationWired: true,
    resultRenderedGoalRouteIdentityRevalidatedBeforeNavigation: true,
    resultDefaultAdjustmentUsesShortestPreparedRoute: true,
    fullCatalogExplicitNextGoalUsesReplayCombination: true,
    fullCatalogReplayStopsAtExistingModeConfirmation: true,
    activeScopeCompletionStillReturnsHome: true,
    survivalReplayNavigationNeverEquipsSuggestedWeapon: true,
    modePreparationRuleDetailSecondaryNavigationWired: true,
    modeCharacterSelectionSecondaryNavigationWired: true,
    competitivePreparationOptionalDetailNavigationWired: true,
    survivalPreparationOptionalCollectionNavigationWired: true,
    preparationDetailSingleSourceReturnWired: true,
    detailDirectorySecondaryNavigationWired: true,
    detailAdjacentContinuousBrowseWired: true,
    detailBrowseVisibleDirectoryPositionWired: true,
    detailAdjacentTargetNamesVisible: true,
    detailSelectedIdentityVisibleInQuestion: true,
    weaponDetailCoreFightReadoutWired: true,
    mapDetailFourAnchorRouteSkeletonWired: true,
    mapDirectoryFourAnchorRouteSkeletonWired: true,
    preparationMapRouteSkeletonWired: true,
    preparationUniqueLongTermGoalFitWired: true,
    preparationUniqueLongTermGoalFitReusesResultRouteFit: true,
    preparationIncompatibleGoalFitDoesNotBlockStart: true,
    preparationConditionalSurvivalGoalNeverPromisesSupply: true,
    resultNextMapRouteSkeletonWired: true,
    resultNextWeaponCoreFightWired: true,
    weaponDirectoryBasicGestureReadoutWired: true,
    weaponDirectoryCoreFightReadoutWired: true,
    preparationWeaponCoreFightWired: true,
    modeSelectionShortContentSignatureWired: true,
    homeNextLearningSignatureWired: true,
    homeNextMatchContinuationRouteWired: true,
    homePrimaryActionAcceptsContinuationIntoExistingModeConfirmation: true,
    homeFullCatalogReplayUsesSharedCombination: true,
    homeFullCatalogReplayRevalidatesRenderedIdentityOnClick: true,
    homeFullCatalogReplayStopsAtExistingModeConfirmation: true,
    homeFullCatalogSurvivalReplayNeverPreselectsWeapon: true,
    homeContinuationNeverAutoStartsMatch: true,
    homeSurvivalContinuationNeverPreselectsWeapon: true,
    homeRecordSummaryWired: true,
    recordsBottomNavigationUsesExistingHomeField: true,
    characterSelectionModeLoadoutPreviewReadWired: true,
    survivalCharacterSelectionPreviewUnarmedWired: true,
    resultNextLearningSignatureWired: true,
    nextLearningGoalLightweightReadWired: true,
    modeSelectionPrimaryStartRemainsDirect: true,
    resultPlayAgainContentContinuityWired: true,
    modeAndPreparationInformationProjectionWired: true,
    sixCharacterInformationProjectionWired: true,
    twentyWeaponSelectionFrozenIntoDuelAndRaceAuthority: true,
    survivalRemainsUnarmedWorldPickupOnly: true,
    twoSharedMapsFrozenIntoAllThreeModesAtMatchStart: true,
    loadingInformationProjectionWired: true,
    formalPresentationAssetIntakeCatalogWired: true,
    formalVisualAssetsReady: false,
    supplyOneShotCueStatus: 'explicit-authority-facts-wired',
    validationStatus: 'not-run',
    registryBackedCandidateFactoryWired: true,
    weaponRegistryBackedCandidateFactoryWired: true,
    explicitModeRegistryPreflightFactoryWired: true,
    reusableModeRegistryPreflightBoundaryWired: true,
    topLevelModeRegistryPreflightConsumerWired: false,
    modeRegistryPreflightInformationHostWired: true,
    modeRegistryPreflightLocalPlayableHostWired: true,
    registrySnapshotFrozenPerMatchCreation: true,
    registryRevisionBoundIntoContentIdentity: true,
    weaponRegistryRevisionBoundIntoContentIdentity: true,
    survivalWeaponPoolDerivedFromRegistrySnapshot: true,
    runtimePolicyConsumptionWired: false,
    resolvedFrozenRuntimePolicyConsumptionWired: true,
    timelineRuntimePolicyConsumptionWired: false,
    timelineRuntimeWiringEligibilityReported: true,
    explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
    explicitTimelinePolicyRuntimeMirrorWired: false,
    raceEliminationAndRelationshipPolicyConsumedByRuntime: true,
    survivalEliminationAndRelationshipPolicyConsumedByRuntime: true,
    objectiveAndResultExistingSemanticsIdentityBound: true,
    threeModeObjectivePolicyAssertedAtTerminal: true,
    threeModeResultPolicyAssertedAtTerminal: true,
    survivalPressureSlotOrderAndStagesConsumedByRuntime: true,
    survivalTierPolicyConstrainsActiveWeaponRegistrySubset: true,
    productAuthorityRegistrySingleSourceWired: true,
    productAuthorityAdmissionBoundPerMatch: true,
    productAuthorityRegisteredSettlementRequiredForLearning: true,
    perMatchDynamicHashesStoredInAuthorityRegistry: false,
    defaultRegistryWired: false,
    defaultCompositionWired: false,
    defaultEntryWired: false,
  } as const);

export interface ArenaThreeModeAuthoritativeQuickMatchCompositionCandidateV1Options {
  readonly seedSource: unknown;
  readonly raceParticipantCount?: 2 | 3 | 4;
  readonly survivalEnemyCount?: 1 | 4 | 8 | 12 | 16;
}

export interface ArenaThreeModeAuthoritativeInformationHostCandidateV1Options
extends ArenaThreeModeAuthoritativeQuickMatchCompositionCandidateV1Options {
  readonly progressionRegistry: unknown;
  readonly rewardProfileDefinition: unknown;
  readonly rewardProfileService: unknown;
  readonly learningProfileDefinition: unknown;
  readonly learningEvidenceDefinition: unknown;
  readonly learningProfileService: unknown;
  readonly maxEventCount: number;
  readonly onSettlementIntentPrepared?: (intent: unknown) => void;
  readonly selectedWeaponDefinitionIdProvider?: () => unknown;
  readonly selectedMapDefinitionIdProvider?: () => unknown;
  readonly registryReference?: unknown;
  readonly modeRegistryCandidate?: unknown;
}

export interface ArenaThreeModeAuthoritativePlayableHostCandidateV1Options
extends ArenaThreeModeAuthoritativeInformationHostCandidateV1Options {
  readonly audio: unknown;
  readonly visual: unknown;
  readonly qualityTier: 'low' | 'medium' | 'high';
  readonly preferences: Readonly<{
    readonly soundEnabled: boolean;
    readonly reducedMotion: boolean;
  }>;
}

export interface ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options
extends ArenaThreeModeAuthoritativeQuickMatchCompositionCandidateV1Options {
  readonly storage: unknown;
  readonly ownerId: unknown;
  readonly wallNow: unknown;
  readonly audio: unknown;
  readonly visual: unknown;
  readonly maxEventCount?: unknown;
  readonly qualityTier?: 'low' | 'medium' | 'high';
  readonly preferences?: Readonly<{
    readonly soundEnabled: boolean;
    readonly reducedMotion: boolean;
  }>;
  readonly keyPrefix?: unknown;
  readonly leaseDurationMs?: unknown;
  readonly leaseTakeoverSameOwner?: unknown;
  readonly retentionObservationCollector?: unknown;
  readonly registryReference?: unknown;
  readonly modeRegistryCandidate?: unknown;
}

export interface ArenaThreeModeAuthoritativeLocalRetentionObservationCollectorCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-only';
  readonly cohortSubjectId: string;
  readonly sessionSequence: number;
  readonly collect: (observation: ArenaV2RetentionObservationV1) => void;
  readonly collectBatch?: (
    observations: readonly ArenaV2RetentionObservationV1[],
  ) => void;
}

export interface ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options {
  readonly selectedWeaponDefinitionId?: unknown;
  readonly selectedMapDefinitionId?: unknown;
  readonly weaponAvailabilityChange?: unknown;
}

export interface ArenaThreeModeAuthoritativeLocalCharacterPreviewLoadoutReadCandidateV1 {
  readonly schemaVersion: 1;
  readonly selectedModeKind: 'duel' | 'race' | 'survival';
  readonly selectedCharacterDefinitionId: string;
  readonly previewWeaponDefinitionId: string | null;
  readonly matchStartsUnarmed: boolean;
}

export interface ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1 {
  readonly profileDefinition: typeof ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1;
  readonly profile: ReturnType<
    ArenaV2ProfileServicesOwnerCandidateV1['learningProfileService']['getSnapshot']
  >;
  readonly eligibleWeaponDefinitionIds: readonly string[] | null;
}

export interface ArenaThreeModeAuthoritativeLocalCollectionReadCandidateV1 {
  readonly learningProfile:
    ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1;
  readonly collectionContent: ReturnType<
    typeof projectArenaV2InformationCollectionContentV1
  >;
  readonly selectedWeaponDefinitionId: string;
  readonly selectedMapDefinitionId: string;
}

export interface ArenaThreeModeAuthoritativeLocalNavigationSelectionReadCandidateV1 {
  readonly selectedModeKind: 'duel' | 'race' | 'survival' | null;
  readonly selectedWeaponDefinitionId: string;
  readonly selectedMapDefinitionId: string;
}

export interface ArenaThreeModeAuthoritativeLocalLearningSettlementRecoveryReadCandidateV1 {
  readonly pendingBaselineCaptured: boolean;
  readonly pendingGrantCaptured: boolean;
  readonly retryRequired: boolean;
  readonly postProcessed: boolean;
  readonly lastError: unknown;
  readonly lastPostProcessingError: unknown;
  readonly persistentIntentPending: boolean;
  readonly restartRequired: boolean;
  readonly journalLifecycle: string;
  readonly lastJournalError: unknown;
  readonly startupRecoveryStatus: 'none' | 'recovered-after-reward'
    | 'discarded-before-reward' | 'recovery-retry-required'
    | 'recovery-restart-required';
  readonly startupDiscardReason: 'baseline-only' | 'reward-not-committed'
    | 'learning-profile-recovery-temporarily-unavailable'
    | 'learning-profile-recovery-indeterminate' | null;
  readonly restartReason: 'journal-acknowledgement'
    | 'profile-write-indeterminate' | null;
  readonly pendingPhase: 'reward' | 'learning' | 'projection' | null;
}

export interface ArenaThreeModeAuthoritativeLocalInformationInteractionGateReadCandidateV1 {
  readonly information: ReturnType<
    ArenaThreeModeAuthoritativePlayableHostCandidateV1['getInformationSnapshot']
  >;
  readonly learningSettlementRecovery:
    ArenaThreeModeAuthoritativeLocalLearningSettlementRecoveryReadCandidateV1;
}

export interface ArenaThreeModeAuthoritativeLocalInformationPageProjectionsCandidateV1 {
  readonly productSession: ReturnType<typeof projectArenaV2ProductSessionInformationCandidateV1>;
  readonly loading: ReturnType<typeof projectArenaV2LoadingInformationCandidateV1>;
  readonly modeContent: ReturnType<typeof projectArenaV2ModeContentInformationCandidateV1>;
  readonly characterContent: ReturnType<typeof projectArenaV2CharacterInformationCandidateV1>;
  readonly collectionContent: ReturnType<typeof projectArenaV2InformationCollectionContentV1>;
  readonly profiles: Readonly<{
    readonly reward: ReturnType<typeof projectArenaV2RewardProfileInformationCandidateV1>;
    readonly learning: ReturnType<typeof projectArenaV2LearningInformationV1>;
  }>;
  readonly profileReads: Readonly<{
    readonly reward: ReturnType<
      ArenaV2ProfileServicesOwnerCandidateV1['rewardProfileService']['getSnapshot']
    >;
    readonly learning: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1;
    readonly learningSettlement: ArenaV2LearningSettlementProjectionV1 | null;
    readonly learningSettlementRecovery:
      ArenaThreeModeAuthoritativeLocalLearningSettlementRecoveryReadCandidateV1;
  }>;
  readonly rewardSettlement: ReturnType<
    typeof projectArenaV2ModeRewardSettlementInformationCandidateV1
  > | null;
}

interface ArenaThreeModeAuthoritativeLocalInformationCurrentScreenCompositionBundleCandidateV1 {
  readonly composition: ArenaV2InformationFieldCompositionInputV1 | null;
  readonly pageProjections:
    ArenaThreeModeAuthoritativeLocalInformationPageProjectionsCandidateV1 | null;
  readonly homeContinuationRoute: ArenaV2NextLearningGoalContinuationRouteV1 | null;
  readonly fullCatalogReplayCombination: ReturnType<
    typeof projectArenaV2FullCatalogReplayCombinationV1
  >;
  readonly selection: ArenaV2InformationSelectionProjectionCandidateV1 | null;
  readonly returnScreenId: string | null;
  readonly detailBrowseProjection: ArenaV2InformationDetailBrowseProjectionCandidateV1 | null;
  readonly learningSettlementRecovery:
    ArenaThreeModeAuthoritativeLocalLearningSettlementRecoveryReadCandidateV1 | null;
  readonly nextLearningGoal: ReturnType<typeof resolveArenaV2NextLearningGoalV1> | null;
  readonly resultPrimaryRecommendation: ResultPrimaryRecommendationV1 | null;
  readonly resultNextGoalRecommendation: ResultPrimaryRecommendationV1 | null;
  readonly resultNewCollectionDetailItems: ResultNewCollectionDetailItemsV1 | null;
}

interface RuntimeFactoryRequestV1 {
  readonly modeDefinitionId: string;
  readonly matchSeed: number;
  readonly selection: MatchContentSelectionV2;
  readonly finalAssignment: FinalizedMatchAssignmentV2;
  readonly localParticipantId: string;
}

interface ContentProviderRequestV1 {
  readonly modeDefinitionId: string;
  readonly roster: MatchRosterAssignmentV2;
}

export interface ArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1Options
extends ArenaThreeModeAuthoritativeQuickMatchCompositionCandidateV1Options {
  readonly selectedCharacterDefinitionIdProvider?: () => unknown;
  readonly selectedWeaponDefinitionIdProvider?: () => unknown;
  readonly selectedMapDefinitionIdProvider?: () => unknown;
  readonly registryReference?: unknown;
}

export interface ArenaThreeModeAuthoritativeReplayRuntimeCandidateV1Options {
  readonly modeDefinitionId: unknown;
  readonly matchSeed: unknown;
  readonly raceParticipantCount?: unknown;
  readonly survivalEnemyCount?: unknown;
  readonly selectedCharacterDefinitionId?: unknown;
  readonly selectedWeaponDefinitionId?: unknown;
  readonly selectedMapDefinitionId?: unknown;
}

export interface ArenaThreeModeRegistryBackedQuickMatchBundleFactoryCandidateV1Options
extends ArenaThreeModeAuthoritativeQuickMatchCompositionCandidateV1Options {
  readonly registryReference: unknown;
  readonly selectedCharacterDefinitionIdProvider?: () => unknown;
  readonly selectedWeaponDefinitionIdProvider?: () => unknown;
  readonly selectedMapDefinitionIdProvider?: () => unknown;
}

export interface ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1Options {
  readonly seedSource: unknown;
  readonly modeRegistryCandidate: unknown;
  readonly weaponRegistryReference?: unknown;
  readonly raceParticipantCount: unknown;
  readonly survivalEnemyCount: unknown;
  readonly selectedCharacterDefinitionIdProvider?: () => unknown;
  readonly selectedWeaponDefinitionIdProvider?: () => unknown;
  readonly selectedMapDefinitionIdProvider?: () => unknown;
}

export interface ArenaThreeModeModeRegistryPreflightInputV1 {
  readonly modeRegistryCandidate: unknown;
  readonly raceParticipantCount: unknown;
  readonly survivalEnemyCount: unknown;
}

export interface ArenaThreeModeModeRegistryPolicyIdentityV1 {
  readonly modeKind: 'duel' | 'race' | 'survival';
  readonly modeDefinitionId: string;
  readonly contentVersion: number;
  readonly participantPolicyDefinitionId: string;
  readonly timelinePolicyDefinitionId: string;
  readonly objectivePolicyDefinitionId: string;
  readonly eliminationPolicyDefinitionId: string;
  readonly respawnPolicyDefinitionId: string;
  readonly relationshipPolicyDefinitionId: string;
  readonly resultPolicyDefinitionId: string;
  readonly survivalPressurePolicyDefinitionId: string | null;
  readonly survivalEquipmentTierPolicyDefinitionId: string | null;
}

export interface ArenaThreeModeModeRegistryPreflightSummaryV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly registryContentHash: string;
  readonly raceParticipantCount: 2 | 3 | 4;
  readonly survivalEnemyCount: 1 | 4 | 8 | 12 | 16;
  readonly timelineRuntimeWiringEligibility:
    ArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1;
  readonly modePolicyIdentities: Readonly<{
    readonly duel: ArenaThreeModeModeRegistryPolicyIdentityV1;
    readonly race: ArenaThreeModeModeRegistryPolicyIdentityV1;
    readonly survival: ArenaThreeModeModeRegistryPolicyIdentityV1;
  }>;
}

interface PublicParticipantProviderRequestV1 {
  readonly finalAssignment: FinalizedMatchAssignmentV2;
  readonly localParticipantId: string;
}

interface PendingWeaponResearchFocusObservationV1 {
  readonly goalId: string;
  readonly profileRevision: number;
  readonly goalKind: 'collect-weapon' | 'weapon-context';
  readonly weaponDefinitionId: string;
  readonly context: ArenaV2NextLearningGoalV1['context'];
}

interface PendingMapLearningFocusObservationV1 {
  readonly goalId: string;
  readonly profileRevision: number;
  readonly goalKind: 'collect-map' | 'map-segment';
  readonly mapDefinitionId: string;
  readonly segmentDefinitionId: string | null;
}

interface PendingNextGoalImpressionV1 {
  readonly goalId: string;
  readonly profileRevision: number;
  readonly weaponDefinitionIds: readonly string[];
  readonly mapDefinitionIds: readonly string[];
  readonly modeDefinitionIds: readonly string[];
  readonly authorityTick: number;
}

interface PendingNextGoalCaptureDebtV1 {
  readonly identity: string;
  readonly settlementWorkIdentity: string;
  readonly expectedProfileRevision: number;
  readonly authorityTick: number;
  readonly lastObservationEventId: string;
  readonly lastObservationEventSequence: number;
  readonly registryScopeStatus: 'pending' | 'frozen';
  readonly registryScopeIdentityHash: string | null;
  readonly registryScope: Readonly<{
    readonly revision: number;
    readonly snapshotHash: string;
    readonly collectionEquipmentDefinitionIds: readonly string[];
  }> | null;
}

interface PendingHomeContinuationFollowObservationV1 {
  readonly source: 'home' | 'result';
  readonly goalId: string;
  readonly profileRevision: number;
  readonly modeDefinitionId: string;
  readonly targetWeaponDefinitionId: string | null;
  readonly targetMapDefinitionId: string | null;
  readonly requiresTargetWeaponSelection: boolean;
  readonly targetWeaponRequiresWorldPickup: boolean;
}

interface FrozenMatchStartContentIdentityV1 {
  readonly authorityTick: number;
  readonly modeDefinitionId: string;
  readonly mapDefinitionId: string;
  readonly localWeaponDefinitionId: string | null;
}

interface HomeContinuationMatchReceiptV1 {
  readonly source: 'home' | 'result';
  readonly goalId: string;
  readonly kind: 'suggested-combination' | 'adjusted-combination';
  readonly authorityTick: number;
}

interface RetentionObservationFieldsV1 {
  readonly kind: ArenaV2RetentionObservationKindV1;
  readonly expectedProfileRevision: number | null;
  readonly weaponDefinitionIds: readonly string[];
  readonly mapDefinitionIds: readonly string[];
  readonly modeDefinitionIds: readonly string[];
  readonly goalId: string | null;
  readonly repeatOrdinal: number | null;
  readonly effectiveLearningProgress: boolean | null;
  readonly goalSelected: boolean | null;
  readonly authorityTick: number | null;
}

interface PendingRetentionActionRetryV1 {
  readonly fields: RetentionObservationFieldsV1;
  readonly observation: ArenaV2RetentionObservationV1 | null;
  readonly nextGoalImpression: PendingNextGoalImpressionV1 | null;
  readonly homeContinuationFollow: PendingHomeContinuationFollowObservationV1 | null;
}

const MAX_SETTLEMENT_RETENTION_WORK_ITEMS_V1 =
  ARENA_V2_OFFLINE_RETENTION_OBSERVATION_BATCH_LIMIT_V1;

type RetentionWorkPostCommitV1 =
  | Readonly<{ readonly kind: 'none' }>
  | Readonly<{
    readonly kind: 'catalog-impression';
    readonly catalogKind: 'maps' | 'weapons';
    readonly previousOrdinal: number;
    readonly repeatOrdinal: number;
    readonly previousNavigationRevision: number | null;
    readonly navigationRevision: number;
  }>
  | Readonly<{
    readonly kind: 'content-entry';
    readonly contentKey: string;
    readonly previousOrdinal: number;
    readonly repeatOrdinal: number;
  }>
  | Readonly<{
    readonly kind: 'cross-content-used';
    readonly previousWeaponDefinitionIds: readonly string[];
    readonly previousMapDefinitionIds: readonly string[];
    readonly nextWeaponDefinitionIds: readonly string[];
    readonly nextMapDefinitionIds: readonly string[];
  }>
  | Readonly<{
    readonly kind: 'weapon-focus';
    readonly focus: PendingWeaponResearchFocusObservationV1;
  }>
  | Readonly<{
    readonly kind: 'map-focus';
    readonly focus: PendingMapLearningFocusObservationV1;
  }>;

type PreparedRetentionObservationV1 =
  | Readonly<{
    readonly kind: 'generic';
    readonly fields: RetentionObservationFieldsV1;
  }>
  | Readonly<{
    readonly kind: 'weapon-focus';
    readonly profileRevision: number;
    readonly authorityTick: number | null;
    readonly focus: PendingWeaponResearchFocusObservationV1;
    readonly progressedWeaponDefinitionId: string | null;
    readonly progressedContext: ArenaV2NextLearningGoalV1['context'];
  }>
  | Readonly<{
    readonly kind: 'map-focus';
    readonly profileRevision: number;
    readonly authorityTick: number | null;
    readonly focus: PendingMapLearningFocusObservationV1;
    readonly progressedMapDefinitionId: string | null;
    readonly progressedSegmentDefinitionId: string | null;
  }>;

interface PreparedRetentionWorkItemV1 {
  readonly preparedObservation: PreparedRetentionObservationV1;
  readonly postCommit: RetentionWorkPostCommitV1;
}

interface MaterializedRetentionWorkItemV1 {
  readonly observation: ArenaV2RetentionObservationV1;
  readonly postCommit: RetentionWorkPostCommitV1;
}

interface PendingRetentionWorkBatchV1 {
  readonly source: 'catalog' | 'settlement';
  readonly identity: string;
  readonly expectedProfileRevision: number | null;
  readonly preparedItems: readonly PreparedRetentionWorkItemV1[];
  readonly materializedItems: readonly MaterializedRetentionWorkItemV1[] | null;
  readonly materializedObservations: readonly ArenaV2RetentionObservationV1[] | null;
  readonly cursor: number;
  readonly captureNextGoalAfterCompletion: boolean;
}

interface NextGoalNavigationRouteV1 {
  readonly goalId: string;
  readonly targetScreenId:
    'home' | 'map-detail' | 'mode-select' | 'weapon-detail' | 'weapon-index';
  readonly selectedModeKind: 'duel' | 'race' | 'survival' | null;
  readonly selectedWeaponDefinitionId: string | null;
  readonly selectedMapDefinitionId: string | null;
}

interface ResultPrimaryRouteIdentityV1 {
  readonly goalId: string | null;
  readonly targetScreenId: NextGoalNavigationRouteV1['targetScreenId'] | null;
  readonly targetModeKind: NextGoalNavigationRouteV1['selectedModeKind'];
  readonly playAgainFitKind:
    'stable-current-combination' | 'conditional-survival-supply' | null;
}

type ResultPrimaryRecommendationV1 = ResultPrimaryRouteIdentityV1 & (
  Readonly<{
    readonly kind: 'play-again';
    readonly decision: 'play-again';
    readonly nextWeaponDefinitionId: string | null;
    readonly nextWeaponDisplayName: string | null;
    readonly nextMapDefinitionId: string | null;
    readonly nextMapDisplayName: string | null;
  }> | Readonly<{
    readonly kind: 'next-goal';
    readonly decision: 'next-goal';
    readonly nextWeaponDefinitionId: string | null;
    readonly nextWeaponDisplayName: string | null;
    readonly nextMapDefinitionId: string | null;
    readonly nextMapDisplayName: string | null;
  }> | Readonly<{
    readonly kind: 'prepare-next-goal';
    readonly decision: 'next-goal';
    readonly nextWeaponDefinitionId: string | null;
    readonly nextWeaponDisplayName: string | null;
    readonly nextMapDefinitionId: string | null;
    readonly nextMapDisplayName: string | null;
  }> | Readonly<{
    readonly kind: 'next-weapon';
    readonly decision: 'next-goal';
    readonly nextWeaponDefinitionId: string;
    readonly nextWeaponDisplayName: string;
    readonly nextMapDefinitionId: null;
    readonly nextMapDisplayName: null;
  }> | Readonly<{
    readonly kind: 'next-map';
    readonly decision: 'next-goal';
    readonly nextWeaponDefinitionId: null;
    readonly nextWeaponDisplayName: null;
    readonly nextMapDefinitionId: string;
    readonly nextMapDisplayName: string;
  }>
);

type ResultNewCollectionDetailItemsV1 =
  readonly ArenaV2ResultNewCollectionDetailItemCandidateV1[];

const OPTION_KEYS = new Set(['seedSource', 'raceParticipantCount', 'survivalEnemyCount']);
const RESULT_NEW_COLLECTION_DETAIL_REQUEST_KEYS = new Set([
  'expectedRevision',
  'kind',
  'definitionId',
]);
const BUNDLE_FACTORY_OPTION_KEYS = new Set([
  ...OPTION_KEYS,
  'selectedCharacterDefinitionIdProvider',
  'selectedWeaponDefinitionIdProvider',
  'selectedMapDefinitionIdProvider',
  'registryReference',
]);
const MODE_REGISTRY_PREFLIGHT_FACTORY_OPTION_KEYS = new Set([
  'seedSource',
  'modeRegistryCandidate',
  'weaponRegistryReference',
  'raceParticipantCount',
  'survivalEnemyCount',
  'selectedCharacterDefinitionIdProvider',
  'selectedWeaponDefinitionIdProvider',
  'selectedMapDefinitionIdProvider',
]);
const MODE_REGISTRY_PREFLIGHT_INPUT_KEYS = new Set([
  'modeRegistryCandidate',
  'raceParticipantCount',
  'survivalEnemyCount',
]);
const MODE_REGISTRY_CANDIDATE_KEYS = new Set([
  'schemaVersion',
  'status',
  'implementationStatus',
  'hardGate',
  'defaultRegistryWired',
  'defaultCompositionWired',
  'defaultEntryWired',
  'validationStatus',
  'modeDefinitionIds',
  'mapDefinitionIds',
  'requiredBasePolicyDefinitionCount',
  'registeredPolicyDefinitionCount',
  'raceRespawnTuningContentHash',
  'survivalFirstRespawnTuningContentHash',
  'timelineProductProposalContentHash',
  'timelineProposalStatus',
  'timelineBalanceApprovalStatus',
  'registryContentHash',
  'registry',
]);
const MODE_REGISTRY_MODE_ID_KEYS = new Set(['duel', 'race', 'survival']);
const REPLAY_RUNTIME_OPTION_KEYS = new Set([
  'modeDefinitionId',
  'matchSeed',
  'raceParticipantCount',
  'survivalEnemyCount',
  'selectedCharacterDefinitionId',
  'selectedWeaponDefinitionId',
  'selectedMapDefinitionId',
]);
const REGISTRY_READ_KEYS = new Set(['revision', 'snapshotHash', 'collectionWeaponIds']);
const HOST_OPTION_KEYS = new Set([
  ...OPTION_KEYS,
  'progressionRegistry',
  'rewardProfileDefinition',
  'rewardProfileService',
  'learningProfileDefinition',
  'learningEvidenceDefinition',
  'learningProfileService',
  'maxEventCount',
  'onSettlementIntentPrepared',
  'selectedWeaponDefinitionIdProvider',
  'selectedMapDefinitionIdProvider',
  'registryReference',
  'modeRegistryCandidate',
]);
const PLAYABLE_OPTION_KEYS = new Set([
  ...HOST_OPTION_KEYS,
  'audio',
  'visual',
  'qualityTier',
  'preferences',
]);
const LOCAL_PLAYABLE_OPTION_KEYS = new Set([
  ...OPTION_KEYS,
  'storage',
  'ownerId',
  'wallNow',
  'audio',
  'visual',
  'maxEventCount',
  'qualityTier',
  'preferences',
  'keyPrefix',
  'leaseDurationMs',
  'leaseTakeoverSameOwner',
  'retentionObservationCollector',
  'registryReference',
  'modeRegistryCandidate',
]);
const LOCAL_PLAYABLE_REQUIRED_KEYS = Object.freeze([
  'seedSource',
  'storage',
  'ownerId',
  'wallNow',
  'audio',
  'visual',
] as const);

function captureModeRegistryPrototypeMembers() {
  const size = Object.getOwnPropertyDescriptor(ModeRegistry.prototype, 'size');
  const list = Object.getOwnPropertyDescriptor(ModeRegistry.prototype, 'list');
  const resolve = Object.getOwnPropertyDescriptor(ModeRegistry.prototype, 'resolve');
  if (size === undefined || typeof size.get !== 'function' || size.set !== undefined
    || list === undefined || typeof list.value !== 'function'
    || resolve === undefined || typeof resolve.value !== 'function') {
    throw new TypeError('ModeRegistry原始size/list/resolve原型合同缺失。');
  }
  return Object.freeze({
    size: Object.freeze({ ...size }),
    list: Object.freeze({ ...list }),
    resolve: Object.freeze({ ...resolve }),
    sizeGetter: size.get as (this: ModeRegistry) => number,
    listMethod: list.value as (this: ModeRegistry) => readonly ModeDefinition[],
    resolveMethod: resolve.value as (
      this: ModeRegistry,
      id: string,
    ) => ResolvedModePolicyBundle,
  });
}

const MODE_REGISTRY_PROTOTYPE_MEMBERS = captureModeRegistryPrototypeMembers();

function samePropertyDescriptor(
  left: PropertyDescriptor | undefined,
  right: PropertyDescriptor,
): boolean {
  return left !== undefined
    && left.configurable === right.configurable
    && left.enumerable === right.enumerable
    && left.get === right.get
    && left.set === right.set
    && left.value === right.value
    && left.writable === right.writable;
}

function assertModeRegistryPrototypeIntegrity(): void {
  if (!samePropertyDescriptor(
    Object.getOwnPropertyDescriptor(ModeRegistry.prototype, 'size'),
    MODE_REGISTRY_PROTOTYPE_MEMBERS.size,
  ) || !samePropertyDescriptor(
    Object.getOwnPropertyDescriptor(ModeRegistry.prototype, 'list'),
    MODE_REGISTRY_PROTOTYPE_MEMBERS.list,
  ) || !samePropertyDescriptor(
    Object.getOwnPropertyDescriptor(ModeRegistry.prototype, 'resolve'),
    MODE_REGISTRY_PROTOTYPE_MEMBERS.resolve,
  )) {
    throw new TypeError('ModeRegistry size/list/resolve原型成员发生漂移。');
  }
}
const LOCAL_INFORMATION_PROJECTION_OPTION_KEYS = new Set([
  'selectedWeaponDefinitionId',
  'selectedMapDefinitionId',
  'weaponAvailabilityChange',
]);
const LOCAL_PRIMARY_INTENT_KEYS = new Set([
  'expectedRevision', 'screenId', 'intentId', 'selectedModeKind', 'resultDecision',
  'expectedResultCollectionTargetKind',
  'expectedResultCollectionTargetDefinitionId',
  'expectedResultRecommendationKind',
  'expectedResultGoalId',
  'expectedResultTargetScreenId',
  'expectedResultTargetModeKind',
  'expectedResultTargetWeaponDefinitionId',
  'expectedResultTargetMapDefinitionId',
  'expectedResultPlayAgainFitKind',
  'expectedResultPlayAgainGoalId',
  'expectedResultPlayAgainModeKind',
  'expectedResultPlayAgainTargetWeaponDefinitionId',
  'expectedResultPlayAgainTargetMapDefinitionId',
  'expectedHomeContinuationGoalId',
  'expectedHomeContinuationKind',
  'expectedHomeContinuationModeDefinitionId',
  'expectedHomeContinuationModeKind',
  'expectedHomeContinuationTargetWeaponDefinitionId',
  'expectedHomeContinuationTargetMapDefinitionId',
  'expectedHomeReplayProfileRevision',
  'expectedHomeReplayModeDefinitionId',
  'expectedHomeReplayModeKind',
  'expectedHomeReplayWeaponDefinitionId',
  'expectedHomeReplayWeaponRotationOrdinal',
  'expectedHomeReplayEligibleWeaponCount',
  'expectedHomeReplayMapDefinitionId',
  'expectedHomeReplayMapRotationOrdinal',
  'expectedHomeReplayMapCount',
  'expectedHomeReplayCycleLength',
  'expectedHomeReplaySurvivalWeaponRequiresWorldPickup',
]);
const LOCAL_PRIMARY_INTENT_REQUIRED_KEYS = Object.freeze([
  'expectedRevision', 'screenId', 'intentId', 'selectedModeKind', 'resultDecision',
] as const);
const LOCAL_MATCH_START_INTENT_IDS = new Set([
  'start-selected-mode',
  'start-prepared-match',
  'start-survival',
]);
const PREFERENCE_KEYS = new Set(['soundEnabled', 'reducedMotion']);
const RETENTION_COLLECTOR_KEYS = new Set([
  'schemaVersion', 'status', 'cohortSubjectId', 'sessionSequence', 'collect',
  'collectBatch',
]);
const RETENTION_COLLECTOR_REQUIRED_KEYS = Object.freeze([
  'schemaVersion', 'status', 'cohortSubjectId', 'sessionSequence', 'collect',
] as const);
const RACE_COUNTS: ReadonlySet<unknown> = new Set([2, 3, 4]);
const SURVIVAL_COUNTS: ReadonlySet<unknown> = new Set([1, 4, 8, 12, 16]);
const MODE_IDS = ARENA_THREE_MODE_AUTHORITATIVE_QUICK_MATCH_COMPOSITION_CANDIDATE_V1
  .modeDefinitionIds;
const REPLAY_RUNTIME_MODE_IDS: ReadonlySet<unknown> = new Set(Object.values(MODE_IDS));

interface ArenaThreeModeModeRegistryPreflightBindingV1 {
  readonly candidate: ArenaV2ThreeModeRegistryCandidateV1;
  readonly registryContentHash: string;
  readonly duel: ResolvedModePolicyBundle;
  readonly race: ResolvedModePolicyBundle;
  readonly survival: ResolvedModePolicyBundle;
  readonly survivalEnemySlotIds: readonly string[];
}

interface ArenaThreeModeRuntimePolicyBindingsV1 {
  readonly duel: ArenaThreeModeRuntimePolicyBindingCandidateV1;
  readonly race: ArenaThreeModeRuntimePolicyBindingCandidateV1;
  readonly survival: ArenaThreeModeRuntimePolicyBindingCandidateV1;
}

function createRuntimePolicyBindings(
  binding: ArenaThreeModeModeRegistryPreflightBindingV1,
): ArenaThreeModeRuntimePolicyBindingsV1 {
  return Object.freeze({
    duel: createArenaThreeModeRuntimePolicyBindingCandidateV1(
      binding.registryContentHash,
      binding.duel,
    ),
    race: createArenaThreeModeRuntimePolicyBindingCandidateV1(
      binding.registryContentHash,
      binding.race,
    ),
    survival: createArenaThreeModeRuntimePolicyBindingCandidateV1(
      binding.registryContentHash,
      binding.survival,
    ),
  });
}

function createThreeModeProductAuthorityRegistryCandidateV1(
  binding: ArenaThreeModeModeRegistryPreflightBindingV1,
): ArenaV2ProductAuthorityRegistryCandidateV1 {
  return new ArenaV2ProductAuthorityRegistryCandidateV1({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    modeRegistryContentHash: binding.registryContentHash,
    authorities: [
      {
        modeKind: 'duel',
        modeDefinitionId: MODE_IDS.duel,
        replaySchemaVersion: ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.replaySchemaVersion,
        ruleSchemaVersion: ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.ruleSchemaVersion,
        physicsBackendVersion:
          ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.physicsBackendVersion,
      },
      {
        modeKind: 'race',
        modeDefinitionId: MODE_IDS.race,
        replaySchemaVersion: ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.replaySchemaVersion,
        ruleSchemaVersion: ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.ruleSchemaVersion,
        physicsBackendVersion:
          ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.physicsBackendVersion,
      },
      {
        modeKind: 'survival',
        modeDefinitionId: MODE_IDS.survival,
        replaySchemaVersion:
          ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.replaySchemaVersion,
        ruleSchemaVersion: ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.ruleSchemaVersion,
        physicsBackendVersion:
          ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.physicsBackendVersion,
      },
    ],
  });
}

export const ARENA_THREE_MODE_MODE_REGISTRY_PREFLIGHT_QUICK_MATCH_FACTORY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    hardGate: false,
    modeRegistryOptionName: 'modeRegistryCandidate',
    weaponRegistryOptionName: 'weaponRegistryReference',
    requiresExplicitRaceParticipantCount: true,
    requiresExplicitSurvivalEnemyCount: true,
    preflightRunsBeforeSeedRosterContentAndRuntime: true,
    participantCountsValidatedFromResolvedPolicy: true,
    survivalEnemySlotsValidatedFromResolvedPolicy: true,
    modeRegistryContentHashValidated: true,
    contentIdentityWired: true,
    contentIdentityBindingField: 'MatchContentSelectionV2.contentDefinitionId',
    contentIdentityBindingPolicy: 'internal-verified-mode-registry-hash-suffix',
    bundleContentIdentityPostconditionWired: true,
    productAuthorityRegistrySingleSourceWired: true,
    productAuthorityAdmissionBoundPerMatch: true,
    productAuthorityAdmissionBindsFinalAssignment: true,
    productAuthorityRegisteredSettlementRequiredForLearning: true,
    perMatchDynamicHashesStoredInAuthorityRegistry: false,
    reusablePurePreflightBoundaryWired: true,
    purePreflightSummaryIsAuthorizationToken: false,
    downstreamCandidateRevalidationRequired: true,
    topLevelConsumerWired: true,
    modeRegistryPreflightInformationHostWired: true,
    modeRegistryPreflightLocalPlayableHostWired: true,
    runtimePolicyConsumptionWired: false,
    resolvedFrozenRuntimePolicyConsumptionWired: true,
    timelineRuntimePolicyConsumptionWired: false,
    timelineRuntimeWiringEligibilityReported: true,
    explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
    explicitTimelinePolicyRuntimeMirrorWired: false,
    raceEliminationAndRelationshipPolicyConsumedByRuntime: true,
    survivalEliminationAndRelationshipPolicyConsumedByRuntime: true,
    objectiveAndResultExistingSemanticsIdentityBound: true,
    threeModeObjectivePolicyAssertedAtTerminal: true,
    threeModeResultPolicyAssertedAtTerminal: true,
    survivalPressureSlotOrderAndStagesConsumedByRuntime: true,
    survivalTierPolicyConstrainsActiveWeaponRegistrySubset: true,
    presentationConsumesModeRegistry: false,
    defaultRegistryWired: false,
    defaultCompositionWired: false,
    defaultEntryWired: false,
    validationStatus: 'not-run',
  } as const);

function exactOwnDataRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举自有数据字段。`);
    }
  }
  return source;
}

function ownDataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined
    || !descriptor.enumerable
    || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举自有数据字段。`);
  }
  return descriptor.value;
}

function exactFrozenStringArray(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value) || !Object.isFrozen(value)) {
    throw new TypeError(`${name}必须是冻结数组。`);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== 'string')) {
    throw new TypeError(`${name}不能包含Symbol字段。`);
  }
  const expectedKeys = new Set(['length']);
  const result = Array.from({ length: value.length }, (_, index) => {
    const key = String(index);
    expectedKeys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')
      || typeof descriptor.value !== 'string'
      || descriptor.value.trim().length === 0) {
      throw new TypeError(`${name}[${index}]必须是非空字符串数据字段。`);
    }
    return descriptor.value;
  });
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError(`${name}不能包含额外字段。`);
  }
  if (new Set(result).size !== result.length) {
    throw new RangeError(`${name}不能包含重复ID。`);
  }
  return Object.freeze(result);
}

function assertSameOrderedStrings(
  actual: readonly string[],
  expected: readonly string[],
  name: string,
): void {
  if (actual.length !== expected.length
    || actual.some((value, index) => value !== expected[index])) {
    throw new RangeError(`${name}身份闭包漂移。`);
  }
}

function assertControllerCount(
  bundle: ResolvedModePolicyBundle,
  controllerKind: 'human' | 'bot',
  count: number,
): void {
  const bound = bundle.participant.controllerKindBounds.find(
    (candidate) => candidate.controllerKind === controllerKind,
  );
  if (bound === undefined || count < bound.minimumCount || count > bound.maximumCount) {
    throw new RangeError(
      `${bundle.mode.kind} ${controllerKind}人数不在resolved Participant Policy边界内。`,
    );
  }
}

function assertRoleCount(
  bundle: ResolvedModePolicyBundle,
  modeRole: 'competitor' | 'enemy' | 'player',
  count: number,
): void {
  const role = bundle.participant.roles.find((candidate) => candidate.modeRole === modeRole);
  if (role === undefined || count < role.minimumCount || count > role.maximumCount) {
    throw new RangeError(
      `${bundle.mode.kind} ${modeRole}人数不在resolved Participant Policy边界内。`,
    );
  }
}

function assertTotalParticipantCount(
  bundle: ResolvedModePolicyBundle,
  count: number,
): void {
  if (count < bundle.participant.minimumParticipants
    || count > bundle.participant.maximumParticipants) {
    throw new RangeError(`${bundle.mode.kind}总人数不在resolved Participant Policy边界内。`);
  }
}

function modeRegistryPreflightBinding(
  value: unknown,
): ArenaThreeModeModeRegistryPreflightBindingV1 {
  const name = 'Arena three-mode modeRegistryCandidate';
  const source = exactOwnDataRecord(value, MODE_REGISTRY_CANDIDATE_KEYS, name);
  if (!Object.isFrozen(source)) throw new TypeError(`${name}必须是冻结候选。`);
  if (ownDataField(source, 'schemaVersion', name)
    !== ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION
    || ownDataField(source, 'status', name) !== 'production-unreachable'
    || ownDataField(source, 'implementationStatus', name) !== 'code-written-not-run'
    || ownDataField(source, 'hardGate', name) !== false
    || ownDataField(source, 'defaultRegistryWired', name) !== false
    || ownDataField(source, 'defaultCompositionWired', name) !== false
    || ownDataField(source, 'defaultEntryWired', name) !== false
    || ownDataField(source, 'validationStatus', name) !== 'not-run') {
    throw new RangeError(`${name}封套或生产隔离标记漂移。`);
  }
  if (ownDataField(source, 'requiredBasePolicyDefinitionCount', name) !== 21
    || ownDataField(source, 'registeredPolicyDefinitionCount', name) !== 23) {
    throw new RangeError(`${name} Policy数量身份漂移。`);
  }
  if (ownDataField(source, 'survivalFirstRespawnTuningContentHash', name)
    !== ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.contentHash) {
    throw new RangeError(`${name} Survival首次复活调优身份漂移。`);
  }
  if (ownDataField(source, 'raceRespawnTuningContentHash', name)
    !== ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.contentHash) {
    throw new RangeError(`${name} Race重生调优身份漂移。`);
  }
  if (ownDataField(source, 'timelineProductProposalContentHash', name)
      !== ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1.contentHash
    || ownDataField(source, 'timelineProposalStatus', name)
      !== ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1.proposalStatus
    || ownDataField(source, 'timelineBalanceApprovalStatus', name)
      !== ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1
        .balanceApprovalStatus) {
    throw new RangeError(`${name} Timeline产品提案或批准状态身份漂移。`);
  }

  const modeIdsName = `${name}.modeDefinitionIds`;
  const modeIds = exactOwnDataRecord(
    ownDataField(source, 'modeDefinitionIds', name),
    MODE_REGISTRY_MODE_ID_KEYS,
    modeIdsName,
  );
  if (!Object.isFrozen(modeIds)) throw new TypeError(`${modeIdsName}必须冻结。`);
  for (const modeKind of [MODE_KIND.DUEL, MODE_KIND.RACE, MODE_KIND.SURVIVAL] as const) {
    if (ownDataField(modeIds, modeKind, modeIdsName) !== MODE_IDS[modeKind]) {
      throw new RangeError(`${modeIdsName}.${modeKind}稳定身份漂移。`);
    }
  }

  const expectedMapIds = [...ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.mapDefinitionIds];
  assertSameOrderedStrings(
    exactFrozenStringArray(ownDataField(source, 'mapDefinitionIds', name), `${name}.mapDefinitionIds`),
    expectedMapIds,
    `${name}.mapDefinitionIds`,
  );
  if (expectedMapIds.some((id) => (
    !ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.mapDefinitionIds.includes(id)
    || !ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.mapDefinitionIds.includes(id)
  ))) {
    throw new RangeError('Arena three-mode runtime两图能力闭包漂移。');
  }

  const registryContentHash = ownDataField(source, 'registryContentHash', name);
  if (typeof registryContentHash !== 'string' || !/^[0-9a-f]{8}$/u.test(registryContentHash)) {
    throw new RangeError(`${name}.registryContentHash必须是8位小写hash。`);
  }
  const registry = ownDataField(source, 'registry', name);
  if (!(registry instanceof ModeRegistry)
    || Object.getPrototypeOf(registry) !== ModeRegistry.prototype
    || !Object.isFrozen(registry)) {
    throw new TypeError(`${name}.registry必须是真实冻结ModeRegistry。`);
  }
  assertModeRegistryPrototypeIntegrity();
  const observedRegistryContentHash = ownDataField(registry, 'contentHash', `${name}.registry`);
  const registrySize = MODE_REGISTRY_PROTOTYPE_MEMBERS.sizeGetter.call(registry);
  if (observedRegistryContentHash !== registryContentHash || registrySize !== 3) {
    throw new RangeError(`${name}.registry contentHash或size漂移。`);
  }
  const definitions = MODE_REGISTRY_PROTOTYPE_MEMBERS.listMethod.call(registry);
  assertSameOrderedStrings(
    definitions.map(({ id }) => id),
    Object.values(MODE_IDS).sort(),
    `${name}.registry ModeDefinition`,
  );
  const duel = MODE_REGISTRY_PROTOTYPE_MEMBERS.resolveMethod.call(registry, MODE_IDS.duel);
  const race = MODE_REGISTRY_PROTOTYPE_MEMBERS.resolveMethod.call(registry, MODE_IDS.race);
  const survival = MODE_REGISTRY_PROTOTYPE_MEMBERS.resolveMethod.call(
    registry,
    MODE_IDS.survival,
  );
  if (duel.mode.kind !== MODE_KIND.DUEL
    || race.mode.kind !== MODE_KIND.RACE
    || survival.mode.kind !== MODE_KIND.SURVIVAL) {
    throw new RangeError(`${name}.registry Mode kind漂移。`);
  }
  const enemyRole = survival.participant.roles.find(
    ({ modeRole }) => modeRole === MODE_ROLE.ENEMY,
  );
  if (enemyRole === undefined || enemyRole.slotRule.kind !== MODE_SLOT_RULE_KIND.FIXED) {
    throw new RangeError(`${name}.registry Survival enemy slot闭包缺失。`);
  }
  assertSameOrderedStrings(
    enemyRole.slotRule.slotIds,
    [...ARENA_V2_SURVIVAL_ENEMY_SLOT_IDS_CANDIDATE_V1].sort(),
    `${name}.registry Survival预注册slot`,
  );
  const survivalPlayerRespawn = survival.respawn.rolePolicies.find(
    ({ modeRole }) => modeRole === MODE_ROLE.PLAYER,
  );
  if (survivalPlayerRespawn === undefined
    || survivalPlayerRespawn.delayTicks
      !== ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.delayTicks
    || survivalPlayerRespawn.protectionTicks
      !== ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks
    || survivalPlayerRespawn.maximumRespawns
      !== ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.maximumRespawns
    || survivalPlayerRespawn.anchorPolicy.kind !== 'fixed-anchor'
    || survivalPlayerRespawn.anchorPolicy.anchorCapabilityId
      !== ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId) {
    throw new RangeError(`${name}.registry Survival首次复活Policy漂移。`);
  }
  const raceCompetitorRespawn = race.respawn.rolePolicies.find(
    ({ modeRole }) => modeRole === MODE_ROLE.COMPETITOR,
  );
  if (raceCompetitorRespawn === undefined
    || !raceCompetitorRespawn.enabled
    || raceCompetitorRespawn.delayTicks
      !== ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.delayTicks
    || raceCompetitorRespawn.protectionTicks
      !== ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks
    || raceCompetitorRespawn.maximumRespawns !== null
    || raceCompetitorRespawn.anchorPolicy.kind !== 'latest-valid-safe-anchor'
    || raceCompetitorRespawn.anchorPolicy.fallbackAnchorCapabilityId
      !== ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId) {
    throw new RangeError(`${name}.registry Race重生Policy漂移。`);
  }
  return Object.freeze({
    candidate: source as unknown as ArenaV2ThreeModeRegistryCandidateV1,
    registryContentHash,
    duel,
    race,
    survival,
    survivalEnemySlotIds: enemyRole.slotRule.slotIds,
  });
}

function assertRequestedParticipantCounts(
  binding: ArenaThreeModeModeRegistryPreflightBindingV1,
  raceParticipantCount: number,
  survivalEnemyCount: number,
): void {
  assertTotalParticipantCount(binding.duel, 2);
  assertRoleCount(binding.duel, MODE_ROLE.COMPETITOR, 2);
  assertControllerCount(binding.duel, MODE_CONTROLLER_KIND.HUMAN, 1);
  assertControllerCount(binding.duel, MODE_CONTROLLER_KIND.BOT, 1);

  assertTotalParticipantCount(binding.race, raceParticipantCount);
  assertRoleCount(binding.race, MODE_ROLE.COMPETITOR, raceParticipantCount);
  assertControllerCount(binding.race, MODE_CONTROLLER_KIND.HUMAN, 1);
  assertControllerCount(
    binding.race,
    MODE_CONTROLLER_KIND.BOT,
    raceParticipantCount - 1,
  );
  if (!ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.supportedParticipantCounts
    .includes(raceParticipantCount as 2 | 3 | 4)) {
    throw new RangeError('Arena Race人数尚未进入真实runtime支持目录。');
  }

  const survivalParticipantCount = survivalEnemyCount + 1;
  assertTotalParticipantCount(binding.survival, survivalParticipantCount);
  assertRoleCount(binding.survival, MODE_ROLE.PLAYER, 1);
  assertRoleCount(binding.survival, MODE_ROLE.ENEMY, survivalEnemyCount);
  assertControllerCount(binding.survival, MODE_CONTROLLER_KIND.HUMAN, 1);
  assertControllerCount(binding.survival, MODE_CONTROLLER_KIND.BOT, survivalEnemyCount);
  if (survivalEnemyCount > binding.survivalEnemySlotIds.length) {
    throw new RangeError('Arena Survival敌人数超过预注册slot边界。');
  }
  if (!ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.supportedEnemyCounts
    .includes(survivalEnemyCount as 1 | 4 | 8 | 12 | 16)) {
    throw new RangeError('Arena Survival敌人数尚未进入真实runtime支持目录。');
  }
}

function modeRegistryPolicyIdentity(
  bundle: ResolvedModePolicyBundle,
): ArenaThreeModeModeRegistryPolicyIdentityV1 {
  return Object.freeze({
    modeKind: bundle.mode.kind,
    modeDefinitionId: bundle.mode.id,
    contentVersion: bundle.contentVersion,
    participantPolicyDefinitionId: bundle.participant.id,
    timelinePolicyDefinitionId: bundle.timeline.id,
    objectivePolicyDefinitionId: bundle.objective.id,
    eliminationPolicyDefinitionId: bundle.elimination.id,
    respawnPolicyDefinitionId: bundle.respawn.id,
    relationshipPolicyDefinitionId: bundle.relationship.id,
    resultPolicyDefinitionId: bundle.result.id,
    survivalPressurePolicyDefinitionId: bundle.survivalPressure?.id ?? null,
    survivalEquipmentTierPolicyDefinitionId: bundle.survivalEquipmentTier?.id ?? null,
  });
}

/**
 * Pure, synchronous preflight for top-level candidate compositions. The result
 * is an identity summary only: downstream owners must revalidate the original
 * modeRegistryCandidate and explicit counts before creating match resources.
 */
export function preflightArenaThreeModeModeRegistryCandidateV1(
  value: ArenaThreeModeModeRegistryPreflightInputV1,
): ArenaThreeModeModeRegistryPreflightSummaryV1 {
  const name = 'Arena three-mode reusable Mode Registry preflight input';
  const source = exactOwnDataRecord(value, MODE_REGISTRY_PREFLIGHT_INPUT_KEYS, name);
  const modeRegistryCandidate = ownDataField(source, 'modeRegistryCandidate', name);
  const raceParticipantCount = assertIntegerAtLeast(
    ownDataField(source, 'raceParticipantCount', name),
    1,
    `${name}.raceParticipantCount`,
  );
  const survivalEnemyCount = assertIntegerAtLeast(
    ownDataField(source, 'survivalEnemyCount', name),
    1,
    `${name}.survivalEnemyCount`,
  );
  const binding = modeRegistryPreflightBinding(modeRegistryCandidate);
  assertRequestedParticipantCounts(binding, raceParticipantCount, survivalEnemyCount);
  const runtimePolicyBindings = createRuntimePolicyBindings(binding);
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    registryContentHash: binding.registryContentHash,
    raceParticipantCount: raceParticipantCount as 2 | 3 | 4,
    survivalEnemyCount: survivalEnemyCount as 1 | 4 | 8 | 12 | 16,
    timelineRuntimeWiringEligibility:
      createArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1(
        runtimePolicyBindings,
      ),
    modePolicyIdentities: Object.freeze({
      duel: modeRegistryPolicyIdentity(binding.duel),
      race: modeRegistryPolicyIdentity(binding.race),
      survival: modeRegistryPolicyIdentity(binding.survival),
    }),
  });
}

interface ArenaThreeModeRegistryBindingCandidateV1 {
  readonly revision: number;
  readonly snapshotHash: string;
  readonly collectionWeaponIds: readonly string[];
  readonly collectionEquipmentDefinitionIds: readonly string[];
}

export const ARENA_THREE_MODE_REGISTRY_BACKED_QUICK_MATCH_FACTORY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    registryKind: 'weapon-active-registry',
    optionName: 'registryReference',
    registrySource: 'explicit-active-atomic-reference',
    matchCreationSnapshotPolicy: 'single-read-with-post-create-drift-rejection',
    contentIdentityPolicy: 'registry-revision-and-snapshot-hash-suffix',
    duelAndRacePolicy: 'selected-weapon-must-be-registered',
    survivalPolicy: 'registered-collection-only-with-three-slot-repeat',
    informationWeaponCatalogPolicy: 'show-all-disable-unregistered',
    informationSelectedWeaponPolicy: 'active-registry-only',
    unavailableNextGoalPolicy: 'route-to-weapon-index-without-loadout-mutation',
    defaultRegistryWired: false,
    defaultCompositionWired: false,
    defaultEntryWired: false,
    validationStatus: 'not-run',
  } as const);

function sorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function sameOrderedStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function captureRegistryRead(value: unknown): () => unknown {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    throw new TypeError('Arena three-mode Registry reference必须是同步对象。');
  }
  const visited = new Set<object>();
  let cursor: object | null = value;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) {
      throw new TypeError('Arena three-mode Registry reference原型链无效。');
    }
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, 'read');
    if (descriptor !== undefined) {
      if (descriptor.get !== undefined
        || descriptor.set !== undefined
        || !Object.hasOwn(descriptor, 'value')
        || typeof descriptor.value !== 'function') {
        throw new TypeError('Arena three-mode Registry reference.read必须是同步数据方法。');
      }
      const method = descriptor.value as (...args: readonly unknown[]) => unknown;
      return () => method.call(value);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError('Arena three-mode Registry reference缺少read方法。');
}

function registryBinding(value: unknown): ArenaThreeModeRegistryBindingCandidateV1 {
  const source = assertPlainRecord(value, 'Arena three-mode Registry read');
  assertKnownKeys(source, REGISTRY_READ_KEYS, 'Arena three-mode Registry read');
  for (const key of REGISTRY_READ_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena three-mode Registry read.${key}必须是可枚举数据字段。`);
    }
  }
  if (!Number.isSafeInteger(source.revision) || (source.revision as number) < 0) {
    throw new RangeError('Arena three-mode Registry revision必须是非负安全整数。');
  }
  if (typeof source.snapshotHash !== 'string'
    || !/^[0-9a-f]{8}$/u.test(source.snapshotHash)) {
    throw new RangeError('Arena three-mode Registry snapshotHash必须是8位小写hash。');
  }
  if (!Array.isArray(source.collectionWeaponIds)
    || source.collectionWeaponIds.length === 0) {
    throw new RangeError('Arena three-mode Registry至少需要一把已激活武器才能创建比赛。');
  }
  const collectionWeaponIds = Object.freeze(source.collectionWeaponIds.map((value, index) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new TypeError(`Arena three-mode Registry collectionWeaponIds[${index}]非法。`);
    }
    if (!ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.some(({ id }) => id === value)) {
      throw new RangeError(`Arena three-mode Registry包含未知武器${value}。`);
    }
    return value;
  }));
  if (new Set(collectionWeaponIds).size !== collectionWeaponIds.length) {
    throw new RangeError('Arena three-mode Registry不能包含重复武器。');
  }
  projectArenaV2RegistryWeaponSequenceCandidateV1(collectionWeaponIds);
  const collectionEquipmentDefinitionIds = Object.freeze(collectionWeaponIds.map((weaponId) => (
    ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(({ id }) => id === weaponId)!.equipment.id
  )));
  return Object.freeze({
    revision: source.revision as number,
    snapshotHash: source.snapshotHash,
    collectionWeaponIds,
    collectionEquipmentDefinitionIds,
  });
}

function sameRegistryBinding(
  left: ArenaThreeModeRegistryBindingCandidateV1,
  right: ArenaThreeModeRegistryBindingCandidateV1,
): boolean {
  return left.revision === right.revision
    && left.snapshotHash === right.snapshotHash
    && left.collectionWeaponIds.length === right.collectionWeaponIds.length
    && left.collectionWeaponIds.every((id, index) => id === right.collectionWeaponIds[index]);
}

function registryBoundContentDefinitionId(
  baseId: string,
  binding: ArenaThreeModeRegistryBindingCandidateV1 | null,
  modeRegistryContentHash: string | null,
): string {
  const weaponRegistryBoundId = binding === null
    ? baseId
    : `${baseId}.registry-r${binding.revision}-${binding.snapshotHash}`;
  return modeRegistryContentHash === null
    ? weaponRegistryBoundId
    : `${weaponRegistryBoundId}.mode-registry-${modeRegistryContentHash}`;
}

function participantId(prefix: string, index: number): string {
  return `${prefix}${String(index + 1).padStart(2, '0')}`;
}

function duelRoster() {
  return Object.freeze({
    schemaVersion: 2 as const,
    modeDefinitionId: MODE_IDS.duel,
    participants: Object.freeze([
      Object.freeze({
        participantId: 'arena-duel-player-01',
        modeRole: 'competitor' as const,
        teamId: null,
        controllerKind: 'human' as const,
        slotId: null,
        slotGeneration: 0,
      }),
      Object.freeze({
        participantId: 'arena-duel-player-02',
        modeRole: 'competitor' as const,
        teamId: null,
        controllerKind: 'bot' as const,
        slotId: null,
        slotGeneration: 0,
      }),
    ]),
  });
}

function raceRoster(participantCount: 2 | 3 | 4) {
  return Object.freeze({
    schemaVersion: 2 as const,
    modeDefinitionId: MODE_IDS.race,
    participants: Object.freeze(Array.from({ length: participantCount }, (_, index) => (
      Object.freeze({
        participantId: participantId('arena-race-vertical-player-', index),
        modeRole: 'competitor' as const,
        teamId: null,
        controllerKind: index === 0 ? 'human' as const : 'bot' as const,
        slotId: null,
        slotGeneration: 0,
      })
    ))),
  });
}

function survivalRoster(enemyCount: 1 | 4 | 8 | 12 | 16) {
  const enemies = Array.from({ length: enemyCount }, (_, index) => Object.freeze({
    participantId: participantId('arena-p3-survival-shared-enemy-', index),
    modeRole: 'enemy' as const,
    teamId: null,
    controllerKind: 'bot' as const,
    slotId: ARENA_V2_SURVIVAL_ENEMY_SLOT_IDS_CANDIDATE_V1[index]!,
    slotGeneration: index + 1,
  }));
  return Object.freeze({
    schemaVersion: 2 as const,
    modeDefinitionId: MODE_IDS.survival,
    participants: Object.freeze([
      ...enemies,
      Object.freeze({
        participantId: ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.localParticipantId,
        modeRole: 'player' as const,
        teamId: null,
        controllerKind: 'human' as const,
        slotId: null,
        slotGeneration: 0,
      }),
    ]),
  });
}

function selectedPlayableCharacterDefinitionId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0
    || !ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1.includes(value)) {
    throw new RangeError('Arena three-mode选择的角色不在六角色目录中。');
  }
  return value;
}

function selectedPlayableWeaponDefinitionId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0
    || !ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.some(
      ({ equipment }) => equipment.id === value,
    )) {
    throw new RangeError('Arena three-mode选择的武器不在二十武器目录中。');
  }
  return value;
}

function selectedPlayableMapDefinitionId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0
    || !ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.mapDefinitionIds.includes(value)
    || !ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.mapDefinitionIds.includes(value)
    || !ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.mapDefinitionIds.includes(value)) {
    throw new RangeError('Arena three-mode选择的地图尚未同时接入1v1、竞速与生存。');
  }
  return value;
}

function rejectAsynchronousSelectionValue(value: unknown, providerName: string): unknown {
  assertSynchronousReturn(value, `Arena ${providerName}`);
  return value;
}

function selectedCharacterDisplayName(characterDefinitionId: string): string {
  const entry = ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.entries.find(
    ({ definition }) => definition.id === characterDefinitionId,
  );
  if (entry === undefined) throw new RangeError(`Arena准备页未知角色${characterDefinitionId}。`);
  return ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(entry.nameMessageId);
}

function selectedWeaponDisplayName(equipmentDefinitionId: string): string {
  const entry = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.find(
    ({ weaponDefinitionId }) => weaponDefinitionId === equipmentDefinitionId,
  );
  if (entry === undefined) throw new RangeError(`Arena准备页未知武器${equipmentDefinitionId}。`);
  return ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(entry.nameMessageId);
}

function selectedMapDisplayName(mapDefinitionId: string): string {
  const entry = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
    (map) => map.mapDefinitionId === mapDefinitionId,
  );
  if (entry === undefined) throw new RangeError(`Arena准备页未知地图${mapDefinitionId}。`);
  return ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(entry.nameMessageId);
}

function contentFor(
  request: ContentProviderRequestV1,
  selectedCharacterDefinitionId: string,
  selectedWeaponDefinitionId: string,
  selectedMapDefinitionId: string,
  collectionEquipmentDefinitionIds:
    readonly string[] = ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1
      .collectionEquipmentDefinitionIds,
  registrySnapshot: ArenaThreeModeRegistryBindingCandidateV1 | null = null,
  modeRegistryContentHash: string | null = null,
) {
  const participants = request.roster.participants;
  if (request.modeDefinitionId === MODE_IDS.duel) {
    const characterDefinitionId = selectedCharacterDefinitionId;
    return Object.freeze({
      schemaVersion: 2 as const,
      modeDefinitionId: MODE_IDS.duel,
      contentDefinitionId: registryBoundContentDefinitionId(
        'arena-v2.content.duel-authoritative.candidate.v1',
        registrySnapshot,
        modeRegistryContentHash,
      ),
      contentVersion: 1,
      characterDefinitionIds: Object.freeze([characterDefinitionId]),
      equipmentDefinitionIds: Object.freeze([selectedWeaponDefinitionId]),
      mapDefinitionIds: Object.freeze([selectedMapDefinitionId]),
      selectedMapDefinitionId,
      participantCharacters: Object.freeze(participants.map(({ participantId: id }) => (
        Object.freeze({ participantId: id, definitionId: characterDefinitionId })
      ))),
    });
  }
  if (request.modeDefinitionId === MODE_IDS.race) {
    const characterDefinitionId = selectedCharacterDefinitionId;
    return Object.freeze({
      schemaVersion: 2 as const,
      modeDefinitionId: MODE_IDS.race,
      contentDefinitionId: registryBoundContentDefinitionId(
        'arena-v2.content.race-authoritative.candidate.v1',
        registrySnapshot,
        modeRegistryContentHash,
      ),
      contentVersion: 1,
      characterDefinitionIds: Object.freeze([characterDefinitionId]),
      equipmentDefinitionIds: Object.freeze([selectedWeaponDefinitionId]),
      mapDefinitionIds: Object.freeze([selectedMapDefinitionId]),
      selectedMapDefinitionId,
      participantCharacters: Object.freeze(participants.map(({ participantId: id }) => (
        Object.freeze({ participantId: id, definitionId: characterDefinitionId })
      ))),
    });
  }
  if (request.modeDefinitionId === MODE_IDS.survival) {
    const playerCharacter = selectedCharacterDefinitionId;
    const enemyCharacter =
      ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.enemyCharacterDefinitionId;
    return Object.freeze({
      schemaVersion: 2 as const,
      modeDefinitionId: MODE_IDS.survival,
      contentDefinitionId: registryBoundContentDefinitionId(
        'arena-v2.content.survival-authoritative.candidate.v1',
        registrySnapshot,
        modeRegistryContentHash,
      ),
      contentVersion: 1,
      characterDefinitionIds: sorted([playerCharacter, enemyCharacter]),
      equipmentDefinitionIds: sorted(collectionEquipmentDefinitionIds),
      mapDefinitionIds: Object.freeze([selectedMapDefinitionId]),
      selectedMapDefinitionId,
      participantCharacters: Object.freeze(participants.map((participant) => Object.freeze({
        participantId: participant.participantId,
        definitionId: participant.modeRole === 'enemy' ? enemyCharacter : playerCharacter,
      }))),
    });
  }
  throw new RangeError(`Arena three-mode content provider不支持Mode ${request.modeDefinitionId}。`);
}

function createRuntime(
  request: RuntimeFactoryRequestV1,
  runtimePolicyBinding: ArenaThreeModeRuntimePolicyBindingCandidateV1 | null = null,
) {
  const value = Object.freeze({
    modeDefinitionId: request.modeDefinitionId,
    matchSeed: request.matchSeed,
    selection: request.selection,
    finalAssignment: request.finalAssignment,
    localParticipantId: request.localParticipantId,
    ...(runtimePolicyBinding === null ? {} : { runtimePolicyBinding }),
  });
  if (request.modeDefinitionId === MODE_IDS.duel) {
    return requireFeedbackCheckpointRuntimePort(
      createArenaDuelAuthoritativeRuntimeCandidateV1(value),
      'Duel',
    );
  }
  if (request.modeDefinitionId === MODE_IDS.race) {
    return requireFeedbackCheckpointRuntimePort(
      createArenaRaceAuthoritativeRuntimeCandidateV1(value),
      'Race',
    );
  }
  if (request.modeDefinitionId === MODE_IDS.survival) {
    return requireFeedbackCheckpointRuntimePort(
      createArenaSurvivalAuthoritativeRuntimeCandidateV1(value),
      'Survival',
    );
  }
  throw new RangeError(`Arena three-mode runtime factory不支持Mode ${request.modeDefinitionId}。`);
}

export const ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_RUNTIME_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1,
  status: 'production-unreachable',
  implementationStatus: 'code-written-not-run',
  hardGate: false,
  usesAuthoritativeQuickMatchRosterAndContentRules: true,
  startsRuntimeBeforeTransfer: true,
  callerOwnsReturnedRuntime: true,
  defaultRegistryWired: false,
  defaultCompositionWired: false,
  defaultEntryWired: false,
  validationStatus: 'not-run',
} as const);

export const ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_LOCAL_PARTICIPANT_IDS_V1 =
  Object.freeze({
    duel: 'arena-duel-player-01',
    race: 'arena-race-vertical-player-01',
    survival: ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.localParticipantId,
  } as const);

/**
 * Builds one already-started real three-mode runtime without transferring it
 * into a Session. This is an explicit regression-only ownership seam for
 * checkpoint/failure runners; the caller owns and must destroy the result.
 */
export function createArenaThreeModeAuthoritativeReplayRuntimeCandidateV1(
  value: ArenaThreeModeAuthoritativeReplayRuntimeCandidateV1Options,
): ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1 {
  const source = assertPlainRecord(value, 'Arena three-mode replay runtime options');
  assertKnownKeys(
    source,
    REPLAY_RUNTIME_OPTION_KEYS,
    'Arena three-mode replay runtime options',
  );
  for (const key of ['modeDefinitionId', 'matchSeed'] as const) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena three-mode replay runtime options.${key}为必填字段。`);
    }
  }
  if (typeof source.modeDefinitionId !== 'string'
    || !REPLAY_RUNTIME_MODE_IDS.has(source.modeDefinitionId)) {
    throw new RangeError('Arena three-mode replay runtime modeDefinitionId不受支持。');
  }
  const modeDefinitionId = source.modeDefinitionId;
  const matchSeed = assertIntegerAtLeast(
    source.matchSeed,
    0,
    'Arena three-mode replay runtime matchSeed',
  );
  if (matchSeed > 0xffff_ffff) {
    throw new RangeError('Arena three-mode replay runtime matchSeed必须是uint32。');
  }
  const raceParticipantCount = source.raceParticipantCount === undefined
    ? 4
    : assertIntegerAtLeast(
      source.raceParticipantCount,
      2,
      'Arena three-mode replay runtime raceParticipantCount',
    );
  const survivalEnemyCount = source.survivalEnemyCount === undefined
    ? 16
    : assertIntegerAtLeast(
      source.survivalEnemyCount,
      1,
      'Arena three-mode replay runtime survivalEnemyCount',
    );
  if (!RACE_COUNTS.has(raceParticipantCount)) {
    throw new RangeError('Arena three-mode replay runtime Race人数必须是2/3/4。');
  }
  if (!SURVIVAL_COUNTS.has(survivalEnemyCount)) {
    throw new RangeError('Arena three-mode replay runtime Survival敌人数必须是1/4/8/12/16。');
  }
  const roster = createMatchRosterAssignmentV2(
    modeDefinitionId === MODE_IDS.duel
      ? duelRoster()
      : modeDefinitionId === MODE_IDS.race
        ? raceRoster(raceParticipantCount as 2 | 3 | 4)
        : survivalRoster(survivalEnemyCount as 1 | 4 | 8 | 12 | 16),
  );
  const selectedCharacterDefinitionId = selectedPlayableCharacterDefinitionId(
    source.selectedCharacterDefinitionId
      ?? ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1[0]!,
  );
  const selectedWeaponDefinitionId = selectedPlayableWeaponDefinitionId(
    source.selectedWeaponDefinitionId
      ?? ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(
        ({ id }) => id === 'heavy-hammer',
      )!.equipment.id,
  );
  const selectedMapDefinitionId = selectedPlayableMapDefinitionId(
    source.selectedMapDefinitionId
      ?? ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.mapDefinitionId,
  );
  const selection = createMatchContentSelectionV2(contentFor(
    Object.freeze({ modeDefinitionId, roster }),
    selectedCharacterDefinitionId,
    selectedWeaponDefinitionId,
    selectedMapDefinitionId,
  ));
  const finalAssignment = finalizeMatchParticipantAssignmentV2({
    roster,
    content: selection,
  });
  const humans = finalAssignment.participants.filter(
    ({ controllerKind }) => controllerKind === 'human',
  );
  if (humans.length !== 1) {
    throw new RangeError('Arena three-mode replay runtime必须精确包含1名human。');
  }
  const expectedLocalParticipantId = modeDefinitionId === MODE_IDS.duel
    ? ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_LOCAL_PARTICIPANT_IDS_V1.duel
    : modeDefinitionId === MODE_IDS.race
      ? ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_LOCAL_PARTICIPANT_IDS_V1.race
      : ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_LOCAL_PARTICIPANT_IDS_V1.survival;
  if (humans[0]!.participantId !== expectedLocalParticipantId) {
    throw new RangeError('Arena three-mode replay runtime local participant身份漂移。');
  }
  const runtime = createRuntime(Object.freeze({
    modeDefinitionId,
    matchSeed,
    selection,
    finalAssignment,
    localParticipantId: expectedLocalParticipantId,
  }));
  try {
    runtime.start();
    return runtime;
  } catch (error) {
    try {
      runtime.destroy();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Arena three-mode replay runtime启动与清理均失败。',
      );
    }
    throw error;
  }
}

function requireFeedbackCheckpointRuntimePort<T extends Readonly<{ destroy(): unknown }>>(
  runtime: T,
  modeName: string,
): T {
  try {
    const requiredMethods = new Set([
      'exportRuntimeCheckpointV1',
      'exportWeaponFeedbackCheckpointCapabilityV1',
      'forkFromWeaponFeedbackCheckpointCapabilityV1',
      'exportWeaponFeedbackDirectionCheckpointCapabilityV2',
      'forkFromWeaponFeedbackDirectionCheckpointCapabilityV2',
      'exportContentSelectionCheckpointCapabilityV1',
      'getRetainedResourceSnapshot',
    ]);
    for (const methodName of requiredMethods) {
      if (Object.getOwnPropertyDescriptor(runtime, methodName) !== undefined) {
        throw new TypeError(`Arena ${modeName} ${methodName}不得被实例字段遮蔽。`);
      }
    }
    const foundMethods = new Set<string>();
    const visited = new Set<object>();
    let cursor: object | null = Object.getPrototypeOf(runtime);
    while (cursor !== null) {
      if (visited.has(cursor) || visited.size >= 32) {
        throw new TypeError(`Arena ${modeName} feedback runtime原型链无效。`);
      }
      visited.add(cursor);
      for (const methodName of requiredMethods) {
        if (foundMethods.has(methodName)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
        if (descriptor !== undefined) {
          if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
            throw new TypeError(`Arena ${modeName} ${methodName}必须是数据方法。`);
          }
          foundMethods.add(methodName);
        }
      }
      if (foundMethods.size === requiredMethods.size) return runtime;
      cursor = Object.getPrototypeOf(cursor);
    }
    throw new TypeError(
      `Arena ${modeName} runtime缺少真实feedback checkpoint/restore suffix capability。`,
    );
  } catch (error) {
    try {
      runtime.destroy();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `Arena ${modeName} feedback capability捕获与runtime清理均失败。`,
      );
    }
    throw error;
  }
}

function publicParticipants(request: PublicParticipantProviderRequestV1) {
  return Object.freeze(request.finalAssignment.participants.map((participant, index) => (
    Object.freeze({
      participantId: participant.participantId,
      displayName: participant.participantId === request.localParticipantId
        ? '玩家'
        : participant.modeRole === 'enemy' ? `敌人 ${index + 1}` : `对手 ${index}`,
      portraitKey: `arena.identity.portrait.${participant.characterDefinitionId}`,
      appearanceKey: `arena.identity.appearance.${participant.characterDefinitionId}`,
      identityOrdinal: index + 1,
      identityGlyphKey: `arena.identity.glyph.${index + 1}`,
      identityPatternKey: `arena.identity.pattern.${index + 1}`,
    })
  )));
}

function createArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1Internal(
  value: ArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1Options,
  modeRegistryContentHash: string | null,
  authorityRegistry: ArenaV2ProductAuthorityRegistryCandidateV1 | null = null,
  runtimePolicyBindings: ArenaThreeModeRuntimePolicyBindingsV1 | null = null,
): ArenaV2QuickMatchBundleFactoryCandidateV1 {
  if (modeRegistryContentHash !== null
    && !/^[0-9a-f]{8}$/u.test(modeRegistryContentHash)) {
    throw new TypeError('Arena内部Mode Registry content identity必须是8位小写hash。');
  }
  if ((modeRegistryContentHash === null) !== (runtimePolicyBindings === null)) {
    throw new RangeError('Arena内部Mode Registry hash与runtime Policy binding必须同时存在。');
  }
  if (runtimePolicyBindings !== null) {
    validateArenaThreeModeRuntimePolicyBindingCandidateV1(
      runtimePolicyBindings.duel,
      MODE_IDS.duel,
      'duel',
    );
    validateArenaThreeModeRuntimePolicyBindingCandidateV1(
      runtimePolicyBindings.race,
      MODE_IDS.race,
      'race',
    );
    validateArenaThreeModeRuntimePolicyBindingCandidateV1(
      runtimePolicyBindings.survival,
      MODE_IDS.survival,
      'survival',
    );
    if (Object.values(runtimePolicyBindings).some(
      ({ registryContentHash }) => registryContentHash !== modeRegistryContentHash,
    )) {
      throw new RangeError('Arena内部runtime Policy binding Registry hash漂移。');
    }
  }
  const source = assertPlainRecord(
    value,
    'Arena three-mode authoritative quick-match composition options',
  );
  assertKnownKeys(
    source,
    BUNDLE_FACTORY_OPTION_KEYS,
    'Arena three-mode authoritative quick-match composition options',
  );
  if (!Object.hasOwn(source, 'seedSource')) {
    throw new TypeError('Arena three-mode authoritative quick-match composition缺少seedSource。');
  }
  const raceParticipantCount = source.raceParticipantCount === undefined
    ? 4
    : assertIntegerAtLeast(source.raceParticipantCount, 2, 'Arena race participant count');
  const survivalEnemyCount = source.survivalEnemyCount === undefined
    ? 16
    : assertIntegerAtLeast(source.survivalEnemyCount, 1, 'Arena survival enemy count');
  if (!RACE_COUNTS.has(raceParticipantCount)) {
    throw new RangeError('Arena race participant count必须是2/3/4。');
  }
  if (!SURVIVAL_COUNTS.has(survivalEnemyCount)) {
    throw new RangeError('Arena survival enemy count必须是1/4/8/12/16。');
  }
  const selectedCharacterDefinitionIdProvider =
    source.selectedCharacterDefinitionIdProvider === undefined
      ? () => ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1[0]!
      : source.selectedCharacterDefinitionIdProvider;
  if (typeof selectedCharacterDefinitionIdProvider !== 'function') {
    throw new TypeError('Arena selectedCharacterDefinitionIdProvider必须是同步函数。');
  }
  const selectedWeaponDefinitionIdProvider = source.selectedWeaponDefinitionIdProvider === undefined
    ? null
    : source.selectedWeaponDefinitionIdProvider;
  if (selectedWeaponDefinitionIdProvider !== null
    && typeof selectedWeaponDefinitionIdProvider !== 'function') {
    throw new TypeError('Arena selectedWeaponDefinitionIdProvider必须是同步函数。');
  }
  const selectedMapDefinitionIdProvider = source.selectedMapDefinitionIdProvider === undefined
    ? () => ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.mapDefinitionId
    : source.selectedMapDefinitionIdProvider;
  if (typeof selectedMapDefinitionIdProvider !== 'function') {
    throw new TypeError('Arena selectedMapDefinitionIdProvider必须是同步函数。');
  }
  const registryRead = source.registryReference === undefined
    ? null
    : captureRegistryRead(source.registryReference);
  const quickMatchService = new ModeAuthoritativeQuickMatchServiceV3({
    seedSource: source.seedSource,
    rosterProvider: Object.freeze({
      createRoster({ modeDefinitionId }: Readonly<{ modeDefinitionId: string }>) {
        if (modeDefinitionId === MODE_IDS.duel) return duelRoster();
        if (modeDefinitionId === MODE_IDS.race) {
          return raceRoster(raceParticipantCount as 2 | 3 | 4);
        }
        if (modeDefinitionId === MODE_IDS.survival) {
          return survivalRoster(survivalEnemyCount as 1 | 4 | 8 | 12 | 16);
        }
        throw new RangeError(`Arena three-mode roster provider不支持Mode ${modeDefinitionId}。`);
      },
    }),
    contentProvider: Object.freeze({
      createContent(request: ContentProviderRequestV1) {
        const activeRegistry = registryRead === null
          ? null
          : registryBinding(rejectAsynchronousSelectionValue(
            registryRead(),
            'registryReference.read',
          ));
        const selectedCharacter = rejectAsynchronousSelectionValue(
          selectedCharacterDefinitionIdProvider(),
          'selectedCharacterDefinitionIdProvider',
        );
        const selectedWeapon = rejectAsynchronousSelectionValue(
          selectedWeaponDefinitionIdProvider === null
            ? activeRegistry?.collectionEquipmentDefinitionIds[0]
              ?? ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(
                ({ id }) => id === 'heavy-hammer',
              )!.equipment.id
            : selectedWeaponDefinitionIdProvider(),
          'selectedWeaponDefinitionIdProvider',
        );
        const selectedMap = rejectAsynchronousSelectionValue(
          selectedMapDefinitionIdProvider(),
          'selectedMapDefinitionIdProvider',
        );
        const selectedWeaponDefinitionId = selectedPlayableWeaponDefinitionId(selectedWeapon);
        if (activeRegistry !== null
          && !activeRegistry.collectionEquipmentDefinitionIds.includes(
            selectedWeaponDefinitionId,
          )) {
          throw new RangeError('Arena three-mode选择的武器尚未进入active Registry。');
        }
        const content = contentFor(
          request,
          selectedPlayableCharacterDefinitionId(selectedCharacter),
          selectedWeaponDefinitionId,
          selectedPlayableMapDefinitionId(selectedMap),
          activeRegistry?.collectionEquipmentDefinitionIds,
          activeRegistry,
          modeRegistryContentHash,
        );
        if (registryRead !== null) {
          const observedAfterCreate = registryBinding(rejectAsynchronousSelectionValue(
            registryRead(),
            'registryReference.read',
          ));
          if (activeRegistry === null || !sameRegistryBinding(activeRegistry, observedAfterCreate)) {
            throw new RangeError('Arena three-mode比赛创建期间active Registry发生漂移。');
          }
        }
        return content;
      },
    }),
    runtimeFactory: Object.freeze({
      createRuntime(request: RuntimeFactoryRequestV1) {
        const runtimePolicyBinding = runtimePolicyBindings === null
          ? null
          : request.modeDefinitionId === MODE_IDS.duel
            ? runtimePolicyBindings.duel
            : request.modeDefinitionId === MODE_IDS.race
              ? runtimePolicyBindings.race
              : request.modeDefinitionId === MODE_IDS.survival
                ? runtimePolicyBindings.survival
                : null;
        return createRuntime(request, runtimePolicyBinding);
      },
    }),
  });
  return new ArenaV2QuickMatchBundleFactoryCandidateV1({
    duelModeDefinitionId: MODE_IDS.duel,
    raceModeDefinitionId: MODE_IDS.race,
    survivalModeDefinitionId: MODE_IDS.survival,
    quickMatchService,
    ...(authorityRegistry === null ? {} : { authorityRegistry }),
    publicParticipantProvider: Object.freeze({
      createPublicParticipants: publicParticipants,
    }),
  });
}

export function createArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1(
  value: ArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1Options,
): ArenaV2QuickMatchBundleFactoryCandidateV1 {
  return createArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1Internal(value, null);
}

export function createArenaThreeModeRegistryBackedQuickMatchBundleFactoryCandidateV1(
  value: ArenaThreeModeRegistryBackedQuickMatchBundleFactoryCandidateV1Options,
): ArenaV2QuickMatchBundleFactoryCandidateV1 {
  const source = assertPlainRecord(
    value,
    'Arena three-mode Registry-backed quick-match factory options',
  );
  if (!Object.hasOwn(source, 'registryReference')) {
    throw new TypeError('Arena three-mode Registry-backed factory缺少registryReference。');
  }
  return createArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1(value);
}

function destroyRejectedModeRegistryBundle(
  bundle: ArenaV2ModeLearningMatchBundleCandidateV1,
  originalError: unknown,
): never {
  try {
    const target = bundle.matchSession;
    if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
      throw new TypeError('Arena Mode Registry preflight bundle session缺少destroy。');
    }
    const visited = new Set<object>();
    let cursor: object | null = target as object;
    let destroyMethod: ((...args: readonly unknown[]) => unknown) | null = null;
    while (cursor !== null) {
      if (visited.has(cursor) || visited.size >= 32) {
        throw new TypeError('Arena Mode Registry preflight bundle session原型链无效。');
      }
      visited.add(cursor);
      const descriptor = Object.getOwnPropertyDescriptor(cursor, 'destroy');
      if (descriptor !== undefined) {
        if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
          throw new TypeError('Arena Mode Registry preflight bundle session.destroy必须是数据方法。');
        }
        destroyMethod = descriptor.value as (...args: readonly unknown[]) => unknown;
        break;
      }
      cursor = Object.getPrototypeOf(cursor);
    }
    if (destroyMethod === null) {
      throw new TypeError('Arena Mode Registry preflight bundle session缺少destroy。');
    }
    const result = Reflect.apply(destroyMethod, target, []);
    rejectAsynchronousSelectionValue(result, 'modeRegistry preflight session.destroy');
  } catch (cleanupError) {
    throw new AggregateError(
      [originalError, cleanupError],
      'Arena Mode Registry创建后身份漂移且Session清理失败。',
    );
  }
  throw originalError;
}

function assertModeRegistryBundleContentIdentity(
  bundle: ArenaV2ModeLearningMatchBundleCandidateV1,
  registryContentHash: string,
  authorityRegistry: ArenaV2ProductAuthorityRegistryCandidateV1,
): void {
  const bundleName = 'Arena Mode Registry preflight bundle';
  const publicMatchInfo = ownDataField(bundle, 'publicMatchInfo', bundleName);
  const publicMatchInfoRecord = assertPlainRecord(
    publicMatchInfo,
    `${bundleName}.publicMatchInfo`,
  );
  const content = ownDataField(
    publicMatchInfoRecord,
    'content',
    `${bundleName}.publicMatchInfo`,
  );
  const contentRecord = assertPlainRecord(content, `${bundleName}.publicMatchInfo.content`);
  const contentDefinitionId = ownDataField(
    contentRecord,
    'contentDefinitionId',
    `${bundleName}.publicMatchInfo.content`,
  );
  const expectedSuffix = `.mode-registry-${registryContentHash}`;
  if (typeof contentDefinitionId !== 'string'
    || !contentDefinitionId.endsWith(expectedSuffix)
    || contentDefinitionId.length === expectedSuffix.length) {
    throw new RangeError(
      'Arena Mode Registry preflight bundle contentDefinitionId未绑定已验证Registry hash。',
    );
  }
  const bundledAuthorityRegistry = ownDataField(
    bundle,
    'authorityRegistry',
    bundleName,
  );
  if (bundledAuthorityRegistry !== authorityRegistry) {
    throw new RangeError('Arena Mode Registry preflight bundle未复用唯一Authority Registry实例。');
  }
  const admission = authorityRegistry.validateAdmissionCandidate(ownDataField(
    bundle,
    'authorityAdmission',
    bundleName,
  ));
  const modeKind = ownDataField(bundle, 'modeKind', bundleName);
  const modeDefinitionId = ownDataField(bundle, 'modeDefinitionId', bundleName);
  const matchSeed = ownDataField(publicMatchInfoRecord, 'matchSeed', `${bundleName}.publicMatchInfo`);
  const contentHash = ownDataField(contentRecord, 'contentHash', `${bundleName}.publicMatchInfo.content`);
  if (admission.modeKind !== modeKind
    || admission.modeDefinitionId !== modeDefinitionId
    || admission.matchSeed !== matchSeed
    || admission.matchContentHash !== contentHash
    || admission.contentDefinitionId !== contentDefinitionId) {
    throw new RangeError('Arena Mode Registry preflight bundle Authority Admission身份漂移。');
  }
}

/**
 * Explicit P2 preflight seam. It validates the immutable Mode Registry and
 * resolved participant policy before delegating to the existing real
 * QuickMatch chain. Runtimes consume only frozen participant/respawn and
 * mode-specific adjudication fields. Timeline balance remains local and
 * unapproved, so callers must not treat this owner as full policy takeover.
 */
export class ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1
implements ArenaV2ModeLearningMatchBundleFactoryPortCandidateV1 {
  readonly #modeRegistryCandidate: unknown;
  readonly #registryContentHash: string;
  readonly #registry: ModeRegistry;
  readonly #authorityRegistry: ArenaV2ProductAuthorityRegistryCandidateV1;
  readonly #delegate: ArenaV2QuickMatchBundleFactoryCandidateV1;
  #transitioning = false;
  #reentryAttempted = false;
  #failed = false;
  #destroyed = false;

  constructor(options: ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1Options);
  constructor(value: unknown) {
    const name = 'Arena three-mode Mode Registry preflight factory options';
    const source = assertPlainRecord(value, name);
    assertKnownKeys(source, MODE_REGISTRY_PREFLIGHT_FACTORY_OPTION_KEYS, name);
    for (const key of [
      'seedSource',
      'modeRegistryCandidate',
      'raceParticipantCount',
      'survivalEnemyCount',
    ] as const) {
      if (!Object.hasOwn(source, key)) throw new TypeError(`${name}.${key}为必填字段。`);
      ownDataField(source, key, name);
    }
    const binding = modeRegistryPreflightBinding(
      ownDataField(source, 'modeRegistryCandidate', name),
    );
    const raceParticipantCount = assertIntegerAtLeast(
      ownDataField(source, 'raceParticipantCount', name),
      1,
      `${name}.raceParticipantCount`,
    );
    const survivalEnemyCount = assertIntegerAtLeast(
      ownDataField(source, 'survivalEnemyCount', name),
      1,
      `${name}.survivalEnemyCount`,
    );
    assertRequestedParticipantCounts(binding, raceParticipantCount, survivalEnemyCount);

    this.#modeRegistryCandidate = binding.candidate;
    this.#registryContentHash = binding.registryContentHash;
    this.#registry = binding.candidate.registry;
    this.#authorityRegistry = createThreeModeProductAuthorityRegistryCandidateV1(binding);
    this.#delegate = createArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1Internal(
      {
        seedSource: ownDataField(source, 'seedSource', name),
        raceParticipantCount: raceParticipantCount as 2 | 3 | 4,
        survivalEnemyCount: survivalEnemyCount as 1 | 4 | 8 | 12 | 16,
        ...(Object.hasOwn(source, 'selectedCharacterDefinitionIdProvider')
          ? {
            selectedCharacterDefinitionIdProvider: ownDataField(
              source,
              'selectedCharacterDefinitionIdProvider',
              name,
            ) as () => unknown,
          }
          : {}),
        ...(Object.hasOwn(source, 'selectedWeaponDefinitionIdProvider')
          ? {
            selectedWeaponDefinitionIdProvider: ownDataField(
              source,
              'selectedWeaponDefinitionIdProvider',
              name,
            ) as () => unknown,
          }
          : {}),
        ...(Object.hasOwn(source, 'selectedMapDefinitionIdProvider')
          ? {
            selectedMapDefinitionIdProvider: ownDataField(
              source,
              'selectedMapDefinitionIdProvider',
              name,
            ) as () => unknown,
          }
          : {}),
        ...(Object.hasOwn(source, 'weaponRegistryReference')
          ? { registryReference: ownDataField(source, 'weaponRegistryReference', name) }
          : {}),
      },
      binding.registryContentHash,
      this.#authorityRegistry,
      createRuntimePolicyBindings(binding),
    );
  }

  createMatchBundle(
    request: ArenaV2ModeLearningSessionFactoryRequestCandidateV1,
  ): ArenaV2ModeLearningMatchBundleCandidateV1;
  createMatchBundle(value: unknown): ArenaV2ModeLearningMatchBundleCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Mode Registry preflight factory已销毁。');
    if (this.#failed) throw new Error('Arena Mode Registry preflight factory已失败关闭。');
    if (this.#transitioning) {
      this.#reentryAttempted = true;
      throw new Error('Arena Mode Registry preflight factory不可重入。');
    }
    this.#transitioning = true;
    this.#reentryAttempted = false;
    let bundle: ArenaV2ModeLearningMatchBundleCandidateV1 | null = null;
    try {
      let before: ArenaThreeModeModeRegistryPreflightBindingV1;
      try {
        before = modeRegistryPreflightBinding(this.#modeRegistryCandidate);
      } catch (error) {
        this.#failed = true;
        throw error;
      }
      if (before.registryContentHash !== this.#registryContentHash
        || before.candidate.registry !== this.#registry) {
        this.#failed = true;
        throw new RangeError('Arena Mode Registry身份在QuickMatch创建前漂移。');
      }
      if (this.#reentryAttempted) {
        this.#failed = true;
        throw new Error('Arena Mode Registry创建前预检发生被吞掉的重入或destroy尝试。');
      }
      bundle = this.#delegate.createMatchBundle(
        value as ArenaV2ModeLearningSessionFactoryRequestCandidateV1,
      );
      if (this.#reentryAttempted) {
        this.#failed = true;
        return destroyRejectedModeRegistryBundle(
          bundle,
          new Error('Arena Mode Registry QuickMatch创建期间发生被吞掉的重入或destroy尝试。'),
        );
      }
      const after = modeRegistryPreflightBinding(this.#modeRegistryCandidate);
      if (after.registryContentHash !== this.#registryContentHash
        || after.candidate.registry !== this.#registry) {
        this.#failed = true;
        return destroyRejectedModeRegistryBundle(
          bundle,
          new RangeError('Arena Mode Registry身份在QuickMatch创建期间漂移。'),
        );
      }
      if (this.#reentryAttempted) {
        this.#failed = true;
        return destroyRejectedModeRegistryBundle(
          bundle,
          new Error('Arena Mode Registry创建后预检发生被吞掉的重入或destroy尝试。'),
        );
      }
      assertModeRegistryBundleContentIdentity(
        bundle,
        this.#registryContentHash,
        this.#authorityRegistry,
      );
      return bundle;
    } catch (error) {
      if (bundle !== null && !this.#failed) {
        this.#failed = true;
        return destroyRejectedModeRegistryBundle(bundle, error);
      }
      throw error;
    } finally {
      this.#transitioning = false;
    }
  }

  destroy(): void {
    if (this.#transitioning) {
      this.#reentryAttempted = true;
      throw new Error('Arena Mode Registry preflight factory转换期间不可destroy。');
    }
    if (this.#destroyed) return;
    this.#transitioning = true;
    this.#reentryAttempted = false;
    try {
      this.#delegate.destroy();
      this.#destroyed = true;
      if (this.#reentryAttempted) {
        throw new Error('Arena Mode Registry preflight factory destroy期间发生被吞掉的重入。');
      }
    } finally {
      this.#transitioning = false;
    }
  }
}

interface ArenaThreeModeInformationHostBundleFactoryPortCandidateV1
extends ArenaV2ModeLearningMatchBundleFactoryPortCandidateV1 {
  destroy(): void;
}

interface ArenaThreeModeInformationHostConstructionCleanupResourcesCandidateV1 {
  sessionFactory: ArenaV2ModeLearningSessionFactoryCandidateV1 | null;
  bundleFactory: ArenaThreeModeInformationHostBundleFactoryPortCandidateV1 | null;
}

function informationHostConstructionCleanupCompleteCandidateV1(
  resources: ArenaThreeModeInformationHostConstructionCleanupResourcesCandidateV1,
): boolean {
  return resources.sessionFactory === null && resources.bundleFactory === null;
}

function cleanupInformationHostConstructionResourcesCandidateV1(
  resources: ArenaThreeModeInformationHostConstructionCleanupResourcesCandidateV1,
): void {
  const cleanupErrors: unknown[] = [];
  if (resources.sessionFactory !== null) {
    try {
      rejectAsynchronousSelectionValue(
        resources.sessionFactory.destroy(),
        'three-mode information host construction session factory.destroy',
      );
      resources.sessionFactory = null;
    } catch (error) { cleanupErrors.push(error); }
  }
  if (resources.sessionFactory === null && resources.bundleFactory !== null) {
    try {
      rejectAsynchronousSelectionValue(
        resources.bundleFactory.destroy(),
        'three-mode information host construction bundle factory.destroy',
      );
      resources.bundleFactory = null;
    } catch (error) { cleanupErrors.push(error); }
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      'Arena three-mode information host构造资源清理不完整。',
    );
  }
  if (!informationHostConstructionCleanupCompleteCandidateV1(resources)) {
    throw new Error('Arena three-mode information host构造资源清理依赖尚未收敛。');
  }
}

export class ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ArenaThreeModeInformationHostConstructionCleanupResourcesCandidateV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ArenaThreeModeInformationHostConstructionCleanupResourcesCandidateV1,
  ) {
    super(
      [originalError, cleanupError],
      'Arena three-mode information host构造失败且反向清理不完整。',
    );
    this.name =
      'ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return informationHostConstructionCleanupCompleteCandidateV1(this.#resources);
  }

  retryCleanup(): void {
    cleanupInformationHostConstructionResourcesCandidateV1(this.#resources);
  }
}

export class ArenaThreeModeAuthoritativeInformationHostCandidateV1 {
  readonly #host: ArenaV2InformationModeSessionHostCandidateV1;
  #sessionFactory: ArenaV2ModeLearningSessionFactoryCandidateV1 | null;
  #bundleFactory: ArenaThreeModeInformationHostBundleFactoryPortCandidateV1 | null;
  #hostDestroyed = false;
  #cleanupStarted = false;
  #destroying = false;
  #destroyed = false;
  #destroyReentrySequence = 0;
  #destroyReentryError: Error | null = null;

  constructor(value: ArenaThreeModeAuthoritativeInformationHostCandidateV1Options) {
    const source = assertPlainRecord(
      value,
      'Arena three-mode authoritative information host options',
    );
    assertKnownKeys(
      source,
      HOST_OPTION_KEYS,
      'Arena three-mode authoritative information host options',
    );
    for (const key of HOST_OPTION_KEYS) {
      if (
        key !== 'raceParticipantCount'
        && key !== 'survivalEnemyCount'
        && key !== 'selectedWeaponDefinitionIdProvider'
        && key !== 'selectedMapDefinitionIdProvider'
        && key !== 'onSettlementIntentPrepared'
        && key !== 'registryReference'
        && key !== 'modeRegistryCandidate'
        && !Object.hasOwn(source, key)
      ) throw new TypeError(`Arena three-mode information host缺少${key}。`);
    }
    const name = 'Arena three-mode authoritative information host options';
    const hasModeRegistryCandidate = Object.hasOwn(source, 'modeRegistryCandidate');
    let modeRegistryCandidate: unknown;
    let raceParticipantCount: unknown;
    let survivalEnemyCount: unknown;
    if (hasModeRegistryCandidate) {
      modeRegistryCandidate = ownDataField(source, 'modeRegistryCandidate', name);
      if (!Object.hasOwn(source, 'raceParticipantCount')) {
        throw new TypeError(`${name}.raceParticipantCount在显式Mode Registry路径为必填字段。`);
      }
      if (!Object.hasOwn(source, 'survivalEnemyCount')) {
        throw new TypeError(`${name}.survivalEnemyCount在显式Mode Registry路径为必填字段。`);
      }
      raceParticipantCount = ownDataField(source, 'raceParticipantCount', name);
      survivalEnemyCount = ownDataField(source, 'survivalEnemyCount', name);
      const binding = modeRegistryPreflightBinding(modeRegistryCandidate);
      assertRequestedParticipantCounts(
        binding,
        assertIntegerAtLeast(raceParticipantCount, 1, `${name}.raceParticipantCount`),
        assertIntegerAtLeast(survivalEnemyCount, 1, `${name}.survivalEnemyCount`),
      );
    } else {
      raceParticipantCount = Object.hasOwn(source, 'raceParticipantCount')
        ? ownDataField(source, 'raceParticipantCount', name)
        : undefined;
      survivalEnemyCount = Object.hasOwn(source, 'survivalEnemyCount')
        ? ownDataField(source, 'survivalEnemyCount', name)
        : undefined;
    }
    const seedSource = ownDataField(source, 'seedSource', name);
    const rewardProfileService = ownDataField(source, 'rewardProfileService', name);
    const onSettlementIntentPrepared = Object.hasOwn(source, 'onSettlementIntentPrepared')
      ? ownDataField(source, 'onSettlementIntentPrepared', name)
      : undefined;
    if (onSettlementIntentPrepared !== undefined
      && typeof onSettlementIntentPrepared !== 'function') {
      throw new TypeError(`${name}.onSettlementIntentPrepared必须是函数。`);
    }
    const selectedCharacterDefinitionIdProvider = () => {
      const profile = rewardProfileService as Readonly<{ getSnapshot(): unknown }>;
      const snapshot = assertPlainRecord(
        profile.getSnapshot(),
        'Arena three-mode selected character profile snapshot',
      );
      const selection = assertPlainRecord(
        ownDataField(
          snapshot,
          'selection',
          'Arena three-mode selected character profile snapshot',
        ),
        'Arena three-mode selected character profile selection',
      );
      return ownDataField(
        selection,
        'characterId',
        'Arena three-mode selected character profile selection',
      );
    };
    const selectedWeaponDefinitionIdProvider = Object.hasOwn(
      source,
      'selectedWeaponDefinitionIdProvider',
    ) ? ownDataField(source, 'selectedWeaponDefinitionIdProvider', name) : undefined;
    if (selectedWeaponDefinitionIdProvider !== undefined
      && typeof selectedWeaponDefinitionIdProvider !== 'function') {
      throw new TypeError(`${name}.selectedWeaponDefinitionIdProvider必须是函数。`);
    }
    const selectedMapDefinitionIdProvider = Object.hasOwn(
      source,
      'selectedMapDefinitionIdProvider',
    ) ? ownDataField(source, 'selectedMapDefinitionIdProvider', name) : undefined;
    if (selectedMapDefinitionIdProvider !== undefined
      && typeof selectedMapDefinitionIdProvider !== 'function') {
      throw new TypeError(`${name}.selectedMapDefinitionIdProvider必须是函数。`);
    }
    const weaponRegistryReference = Object.hasOwn(source, 'registryReference')
      ? ownDataField(source, 'registryReference', name)
      : undefined;
    if (weaponRegistryReference !== undefined) captureRegistryRead(weaponRegistryReference);
    const dependencies = preflightArenaV2ModeLearningSessionFactoryDependenciesCandidateV1({
      progressionRegistry: ownDataField(source, 'progressionRegistry', name),
      rewardProfileDefinition: ownDataField(source, 'rewardProfileDefinition', name),
      rewardProfileService,
      learningProfileDefinition: ownDataField(source, 'learningProfileDefinition', name),
      learningEvidenceDefinition: ownDataField(source, 'learningEvidenceDefinition', name),
      learningProfileService: ownDataField(source, 'learningProfileService', name),
      maxEventCount: ownDataField(source, 'maxEventCount', name),
      ...(onSettlementIntentPrepared === undefined
        ? {}
        : { onSettlementIntentPrepared }),
    });
    const bundleFactory: ArenaThreeModeInformationHostBundleFactoryPortCandidateV1 =
      hasModeRegistryCandidate
        ? new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
          seedSource,
          modeRegistryCandidate,
          raceParticipantCount: raceParticipantCount as 2 | 3 | 4,
          survivalEnemyCount: survivalEnemyCount as 1 | 4 | 8 | 12 | 16,
          selectedCharacterDefinitionIdProvider,
          ...(selectedWeaponDefinitionIdProvider === undefined
            ? {}
            : {
              selectedWeaponDefinitionIdProvider:
                selectedWeaponDefinitionIdProvider as () => unknown,
            }),
          ...(selectedMapDefinitionIdProvider === undefined
            ? {}
            : {
              selectedMapDefinitionIdProvider:
                selectedMapDefinitionIdProvider as () => unknown,
            }),
          ...(weaponRegistryReference === undefined
            ? {}
            : { weaponRegistryReference }),
        })
        : createArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1({
          seedSource,
          selectedCharacterDefinitionIdProvider,
          ...(selectedWeaponDefinitionIdProvider === undefined
            ? {}
            : {
              selectedWeaponDefinitionIdProvider:
                selectedWeaponDefinitionIdProvider as () => unknown,
            }),
          ...(selectedMapDefinitionIdProvider === undefined
            ? {}
            : {
              selectedMapDefinitionIdProvider:
                selectedMapDefinitionIdProvider as () => unknown,
            }),
          ...(weaponRegistryReference === undefined
            ? {}
            : { registryReference: weaponRegistryReference }),
          ...(raceParticipantCount === undefined
            ? {}
            : { raceParticipantCount: raceParticipantCount as 2 | 3 | 4 }),
          ...(survivalEnemyCount === undefined
            ? {}
            : { survivalEnemyCount: survivalEnemyCount as 1 | 4 | 8 | 12 | 16 }),
        });
    let host: ArenaV2InformationModeSessionHostCandidateV1;
    let sessionFactory: ArenaV2ModeLearningSessionFactoryCandidateV1 | null = null;
    try {
      sessionFactory = new ArenaV2ModeLearningSessionFactoryCandidateV1({
        matchBundleFactory: bundleFactory,
        progressionRegistry: dependencies.progressionRegistry,
        rewardProfileDefinition: dependencies.rewardProfileDefinition,
        rewardProfileService: dependencies.rewardProfileService,
        learningProfileDefinition: dependencies.learningProfileDefinition,
        learningEvidenceDefinition: dependencies.learningEvidenceDefinition,
        learningProfileService: dependencies.learningProfileService,
        maxEventCount: dependencies.maxEventCount,
        onSettlementIntentPrepared: dependencies.onSettlementIntentPrepared,
      });
      host = new ArenaV2InformationModeSessionHostCandidateV1({
        registry: ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
        sessionFactory,
      });
    } catch (error) {
      const resources: ArenaThreeModeInformationHostConstructionCleanupResourcesCandidateV1 = {
        sessionFactory,
        bundleFactory,
      };
      try {
        cleanupInformationHostConstructionResourcesCandidateV1(resources);
      } catch (cleanupError) {
        throw new ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1(
          error,
          cleanupError,
          resources,
        );
      }
      throw error;
    }
    this.#sessionFactory = sessionFactory;
    this.#bundleFactory = bundleFactory;
    this.#host = host;
  }

  get host(): ArenaV2InformationModeSessionHostCandidateV1 {
    if (this.#cleanupStarted) {
      throw new Error('Arena three-mode information host owner已进入清理。');
    }
    return this.#host;
  }

  #rejectDestroyReentry(): never {
    this.#destroyReentrySequence += 1;
    const error = new Error('Arena three-mode information host清理期间不可重入。');
    this.#destroyReentryError ??= error;
    throw error;
  }

  #captureSwallowedDestroyReentry(
    observedSequence: number,
    errors: unknown[],
  ): number {
    if (this.#destroyReentrySequence === observedSequence) return observedSequence;
    const error = this.#destroyReentryError
      ?? new Error('Arena three-mode information host清理期间发生被吞掉的重入。');
    this.#destroyReentryError ??= error;
    if (!errors.includes(error)) errors.push(error);
    return this.#destroyReentrySequence;
  }

  destroy(): void {
    if (this.#destroying) {
      this.#rejectDestroyReentry();
    }
    if (this.#destroyed) return;
    this.#cleanupStarted = true;
    this.#destroying = true;
    const errors: unknown[] = [];
    let observedReentrySequence = this.#destroyReentrySequence;
    try {
      if (!this.#hostDestroyed) {
        try {
          rejectAsynchronousSelectionValue(
            this.#host.destroy(),
            'three-mode information host navigation host.destroy',
          );
          this.#hostDestroyed = true;
        } catch (error) {
          errors.push(error);
        }
        observedReentrySequence = this.#captureSwallowedDestroyReentry(
          observedReentrySequence,
          errors,
        );
      }
      const sessionFactory = this.#sessionFactory;
      if (this.#hostDestroyed && sessionFactory !== null) {
        try {
          rejectAsynchronousSelectionValue(
            sessionFactory.destroy(),
            'three-mode information host session factory.destroy',
          );
          this.#sessionFactory = null;
        } catch (error) {
          errors.push(error);
        }
        observedReentrySequence = this.#captureSwallowedDestroyReentry(
          observedReentrySequence,
          errors,
        );
      }
      const bundleFactory = this.#bundleFactory;
      if (this.#hostDestroyed && this.#sessionFactory === null && bundleFactory !== null) {
        try {
          rejectAsynchronousSelectionValue(
            bundleFactory.destroy(),
            'three-mode information host bundle factory.destroy',
          );
          this.#bundleFactory = null;
        } catch (error) {
          errors.push(error);
        }
        this.#captureSwallowedDestroyReentry(
          observedReentrySequence,
          errors,
        );
      }
      this.#destroyed = this.#hostDestroyed
        && this.#sessionFactory === null
        && this.#bundleFactory === null;
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena three-mode information host清理不完整。');
      }
      if (!this.#destroyed) {
        throw new Error('Arena three-mode information host清理未收敛。');
      }
    } finally {
      this.#destroying = false;
    }
  }
}

export function createArenaThreeModeAuthoritativeInformationHostCandidateV1(
  value: ArenaThreeModeAuthoritativeInformationHostCandidateV1Options,
): ArenaThreeModeAuthoritativeInformationHostCandidateV1 {
  return new ArenaThreeModeAuthoritativeInformationHostCandidateV1(value);
}

export const ARENA_THREE_MODE_AUTHORITATIVE_INFORMATION_HOST_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    hardGate: false,
    defaultCompositionWired: false,
    defaultEntryWired: false,
    destroyDependencyOrder: Object.freeze([
      'information-host',
      'mode-learning-session-factory',
      'quick-match-bundle-factory',
    ] as const),
    destroyClearsOnlySuccessfullyReleasedOwners: true,
    failedFactoryCleanupRetainsRetryOwnership: true,
    constructionCleanupRetainsRetryableFactoryOwners: true,
    constructionCleanupFollowsSessionBeforeBundleDependencyOrder: true,
    constructionAndTerminalCleanupChildrenMustCompleteSynchronously: true,
    publicOperationsRejectAsynchronousChildResults: true,
    dependencyPreflightCompletesBeforeBundleFactoryConstruction: true,
    swallowedChildDestroyReentryFailsCleanupCallClosed: true,
    destroyReentryCheckedBeforeIdempotentFastPath: true,
    destroyReentryDoesNotDiscardRetryOwnership: true,
    validationStatus: 'not-run',
  } as const);

function playablePreferences(value: unknown) {
  const source = assertPlainRecord(value, 'Arena three-mode playable preferences');
  assertKnownKeys(source, PREFERENCE_KEYS, 'Arena three-mode playable preferences');
  for (const key of PREFERENCE_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena three-mode playable preferences.${key}必须是数据字段。`);
    }
    if (typeof descriptor.value !== 'boolean') {
      throw new TypeError(`Arena three-mode playable preferences.${key}必须是boolean。`);
    }
  }
  return Object.freeze({
    soundEnabled: source.soundEnabled as boolean,
    reducedMotion: source.reducedMotion as boolean,
  });
}

function localRetentionObservationCollector(
  value: unknown,
): ArenaThreeModeAuthoritativeLocalRetentionObservationCollectorCandidateV1 | null {
  if (value === undefined) return null;
  const name = 'Arena local retention observation collector';
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, RETENTION_COLLECTOR_KEYS, name);
  for (const key of RETENTION_COLLECTOR_REQUIRED_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
    ownDataField(source, key, name);
  }
  if (Object.hasOwn(source, 'collectBatch')) ownDataField(source, 'collectBatch', name);
  if (source.schemaVersion !== 1 || source.status !== 'offline-only') {
    throw new RangeError('Arena留存观察Collector只允许offline-only schema 1。');
  }
  if (typeof source.cohortSubjectId !== 'string'
    || source.cohortSubjectId.trim().length === 0
    || source.cohortSubjectId.length > 160) {
    throw new RangeError('Arena留存观察cohortSubjectId必须是1..160字符脱敏身份。');
  }
  const sessionSequence = assertIntegerAtLeast(
    source.sessionSequence,
    1,
    'Arena留存观察sessionSequence',
  );
  if (typeof source.collect !== 'function') {
    throw new TypeError('Arena留存观察collect必须是同步函数。');
  }
  const collect = source.collect;
  const hasCollectBatch = Object.hasOwn(source, 'collectBatch');
  const collectBatch = hasCollectBatch
    ? ownDataField(source, 'collectBatch', name)
    : undefined;
  if (hasCollectBatch && typeof collectBatch !== 'function') {
    throw new TypeError('Arena留存观察collectBatch必须是同步函数。');
  }
  const collectBatchMethod = hasCollectBatch
    ? collectBatch as (...args: unknown[]) => unknown
    : null;
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'offline-only' as const,
    cohortSubjectId: source.cohortSubjectId,
    sessionSequence,
    collect: (observation: ArenaV2RetentionObservationV1): void => {
      const result = Reflect.apply(collect, source, [observation]);
      rejectAsynchronousSelectionValue(result, 'retentionObservationCollector.collect');
      if (result !== undefined) {
        throw new TypeError('Arena留存观察collect必须返回void。');
      }
    },
    ...(collectBatchMethod === null ? {} : {
      collectBatch: (
        observations: readonly ArenaV2RetentionObservationV1[],
      ): void => {
        const result = Reflect.apply(collectBatchMethod, source, [observations]);
        rejectAsynchronousSelectionValue(
          result,
          'retentionObservationCollector.collectBatch',
        );
        if (result !== undefined) {
          throw new TypeError('Arena留存观察collectBatch必须返回void。');
        }
      },
    }),
  });
}

function localInformationProjectionSelection(
  value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options,
): Readonly<{
  readonly selectedWeaponDefinitionId: unknown;
  readonly selectedMapDefinitionId: unknown;
  readonly weaponAvailabilityChange: unknown;
}> {
  const name = 'Arena local information profile projection options';
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, LOCAL_INFORMATION_PROJECTION_OPTION_KEYS, name);
  for (const key of Object.keys(source)) ownDataField(source, key, name);
  return Object.freeze({
    selectedWeaponDefinitionId: !Object.hasOwn(source, 'selectedWeaponDefinitionId')
      ? ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.weaponDefinitionIds[0]!
      : ownDataField(source, 'selectedWeaponDefinitionId', name),
    selectedMapDefinitionId: !Object.hasOwn(source, 'selectedMapDefinitionId')
      ? ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.mapDefinitions[0]!.mapDefinitionId
      : ownDataField(source, 'selectedMapDefinitionId', name),
    weaponAvailabilityChange: !Object.hasOwn(source, 'weaponAvailabilityChange')
      ? null
      : ownDataField(source, 'weaponAvailabilityChange', name),
  });
}

function profileFieldSource(
  ownerId:
    | 'p6-reward-profile'
    | 'p6-learning-profile'
    | 'p6-mode-reward-settlement'
    | 'p6-startup-settlement-recovery'
    | 'p6-settlement-recovery',
  fieldValues: readonly Readonly<{
    readonly fieldId: string;
    readonly labelMessageId: string;
    readonly valueText: string;
    readonly accessibilityText: string;
    readonly fixedWidthNumeric: boolean;
  }>[],
): ArenaV2InformationFieldSourceV1 {
  return Object.freeze({ ownerId, fieldValues: Object.freeze([...fieldValues]) });
}

function learningSettlementProjection(
  value: unknown,
): ArenaV2LearningSettlementProjectionV1 {
  const hostOutcome = assertPlainRecord(value, 'Arena local playable settlement outcome');
  const bridgeOutcome = assertPlainRecord(
    ownDataField(hostOutcome, 'settlement', 'Arena local playable settlement outcome'),
    'Arena local playable bridge settlement',
  );
  const learning = assertPlainRecord(
    ownDataField(bridgeOutcome, 'learning', 'Arena local playable bridge settlement'),
    'Arena local playable learning settlement',
  );
  const committed = ownDataField(
    learning,
    'committed',
    'Arena local playable learning settlement',
  );
  const duplicate = ownDataField(
    learning,
    'duplicate',
    'Arena local playable learning settlement',
  );
  const effectiveLearningProgress = ownDataField(
    learning,
    'effectiveLearningProgress',
    'Arena local playable learning settlement',
  );
  const progressKinds = ownDataField(
    learning,
    'progressKinds',
    'Arena local playable learning settlement',
  );
  const researchedWeaponDefinitionId = ownDataField(
    learning,
    'researchedWeaponDefinitionId',
    'Arena local playable learning settlement',
  );
  const weaponContextEvidenceDeltas = ownDataField(
    learning,
    'weaponContextEvidenceDeltas',
    'Arena local playable learning settlement',
  );
  const committedProfile = assertPlainRecord(
    ownDataField(learning, 'profile', 'Arena local playable learning settlement'),
    'Arena local playable learning settlement profile',
  );
  const profileRevision = ownDataField(
    committedProfile,
    'revision',
    'Arena local playable learning settlement profile',
  );
  const mapRouteEvidenceDeltas = ownDataField(
    learning,
    'mapRouteEvidenceDeltas',
    'Arena local playable learning settlement',
  );
  const modeCompletionDeltas = ownDataField(
    learning,
    'modeCompletionDeltas',
    'Arena local playable learning settlement',
  );
  const mapSegmentEvidenceDeltas = ownDataField(
    learning,
    'mapSegmentEvidenceDeltas',
    'Arena local playable learning settlement',
  );
  const challengeProgressDeltas = ownDataField(
    learning,
    'challengeProgressDeltas',
    'Arena local playable learning settlement',
  );
  const newlyCollectedWeaponDefinitionIds = ownDataField(
    learning,
    'newlyCollectedWeaponDefinitionIds',
    'Arena local playable learning settlement',
  );
  const newlyCollectedMapDefinitionIds = ownDataField(
    learning,
    'newlyCollectedMapDefinitionIds',
    'Arena local playable learning settlement',
  );
  const grant = assertPlainRecord(
    ownDataField(learning, 'grant', 'Arena local playable learning settlement'),
    'Arena local playable learning grant',
  );
  const grantId = ownDataField(grant, 'grantId', 'Arena local playable learning grant');
  const sourceModeDefinitionId = ownDataField(
    grant,
    'sourceModeDefinitionId',
    'Arena local playable learning grant',
  );
  const modeDelta = assertPlainRecord(
    ownDataField(grant, 'modeDelta', 'Arena local playable learning grant'),
    'Arena local playable learning grant mode delta',
  );
  const modeDeltaModeDefinitionId = ownDataField(
    modeDelta,
    'modeDefinitionId',
    'Arena local playable learning grant mode delta',
  );
  if (typeof committed !== 'boolean' || typeof duplicate !== 'boolean') {
    throw new TypeError('Arena local playable learning settlement提交状态无效。');
  }
  if (committed === duplicate || typeof grantId !== 'string' || grantId.length === 0) {
    throw new RangeError('Arena local playable learning settlement身份不闭合。');
  }
  if (typeof sourceModeDefinitionId !== 'string' || sourceModeDefinitionId.length === 0
    || sourceModeDefinitionId !== modeDeltaModeDefinitionId) {
    throw new RangeError('Arena local playable learning settlement来源模式身份不闭合。');
  }
  if (typeof effectiveLearningProgress !== 'boolean' || !Array.isArray(progressKinds)
    || !Array.isArray(weaponContextEvidenceDeltas)
    || !Array.isArray(mapSegmentEvidenceDeltas)
    || !Array.isArray(mapRouteEvidenceDeltas)
    || !Array.isArray(modeCompletionDeltas)
    || !Array.isArray(challengeProgressDeltas)
    || !Array.isArray(newlyCollectedWeaponDefinitionIds)
    || !Array.isArray(newlyCollectedMapDefinitionIds)) {
    throw new TypeError('Arena local playable learning settlement进度无效。');
  }
  if (researchedWeaponDefinitionId !== null
    && (typeof researchedWeaponDefinitionId !== 'string'
      || researchedWeaponDefinitionId.length === 0)) {
    throw new TypeError('Arena local playable learning settlement主研究武器身份无效。');
  }
  if (!Number.isSafeInteger(profileRevision) || (profileRevision as number) < 0) {
    throw new RangeError('Arena local playable learning settlement Profile revision无效。');
  }
  return Object.freeze({
    status: committed ? 'committed' as const : 'duplicate' as const,
    grantId,
    profileRevision: profileRevision as number,
    sourceModeDefinitionId,
    effectiveLearningProgress,
    progressKinds: Object.freeze([...progressKinds]) as ArenaV2LearningSettlementProjectionV1[
      'progressKinds'
    ],
    researchedWeaponDefinitionId,
    weaponContextEvidenceDeltas: Object.freeze([
      ...weaponContextEvidenceDeltas,
    ]) as ArenaV2LearningSettlementProjectionV1['weaponContextEvidenceDeltas'],
    mapSegmentEvidenceDeltas: Object.freeze([
      ...mapSegmentEvidenceDeltas,
    ]) as ArenaV2LearningSettlementProjectionV1['mapSegmentEvidenceDeltas'],
    mapRouteEvidenceDeltas: Object.freeze([
      ...mapRouteEvidenceDeltas,
    ]) as ArenaV2LearningSettlementProjectionV1['mapRouteEvidenceDeltas'],
    modeCompletionDeltas: Object.freeze([
      ...modeCompletionDeltas,
    ]) as ArenaV2LearningSettlementProjectionV1['modeCompletionDeltas'],
    challengeProgressDeltas: Object.freeze([
      ...challengeProgressDeltas,
    ]) as ArenaV2LearningSettlementProjectionV1['challengeProgressDeltas'],
    newlyCollectedWeaponDefinitionIds: Object.freeze([
      ...newlyCollectedWeaponDefinitionIds,
    ]) as ArenaV2LearningSettlementProjectionV1['newlyCollectedWeaponDefinitionIds'],
    newlyCollectedMapDefinitionIds: Object.freeze([
      ...newlyCollectedMapDefinitionIds,
    ]) as ArenaV2LearningSettlementProjectionV1['newlyCollectedMapDefinitionIds'],
  });
}

function learningGrantFromSettlement(
  value: unknown,
): Readonly<Record<string, unknown>> {
  const hostOutcome = assertPlainRecord(value, 'Arena local playable settlement outcome');
  const bridgeOutcome = assertPlainRecord(
    ownDataField(hostOutcome, 'settlement', 'Arena local playable settlement outcome'),
    'Arena local playable bridge settlement',
  );
  const learning = assertPlainRecord(
    ownDataField(bridgeOutcome, 'learning', 'Arena local playable bridge settlement'),
    'Arena local playable learning settlement',
  );
  return assertPlainRecord(
    ownDataField(learning, 'grant', 'Arena local playable learning settlement'),
    'Arena local playable learning grant',
  );
}

function learningGrantIdFromSettlement(value: unknown): string {
  const grant = learningGrantFromSettlement(value);
  const grantId = ownDataField(grant, 'grantId', 'Arena local playable learning grant');
  if (typeof grantId !== 'string' || grantId.length === 0) {
    throw new TypeError('Arena local playable learning grant身份无效。');
  }
  return grantId;
}

function rewardOutcomeFromSettlement(value: unknown): unknown {
  const hostOutcome = assertPlainRecord(value, 'Arena local playable settlement outcome');
  const bridgeOutcome = assertPlainRecord(
    ownDataField(hostOutcome, 'settlement', 'Arena local playable settlement outcome'),
    'Arena local playable bridge settlement',
  );
  return ownDataField(
    bridgeOutcome,
    'reward',
    'Arena local playable bridge settlement',
  );
}

function settlementErrorRequiresRestart(value: unknown): boolean {
  return resolveArenaV2ProfilePersistenceDispositionCandidateV1(value) === 'restart';
}

function settlementErrorRetainsRecoveryEvidence(value: unknown): boolean {
  return resolveArenaV2ProfilePersistenceDispositionCandidateV1(value) !== 'fail-closed';
}

function rewardGrantIdFromSettlement(value: unknown): string {
  const outcome = assertPlainRecord(
    rewardOutcomeFromSettlement(value),
    'Arena local playable reward settlement',
  );
  const grant = assertPlainRecord(
    ownDataField(outcome, 'grant', 'Arena local playable reward settlement'),
    'Arena local playable reward grant',
  );
  const grantId = ownDataField(grant, 'grantId', 'Arena local playable reward grant');
  if (typeof grantId !== 'string' || grantId.length === 0) {
    throw new TypeError('Arena local playable reward grant身份无效。');
  }
  return grantId;
}

function authorityResearchedWeaponDefinitionIdFromGrant(
  grantValue: unknown,
): string | null {
  const grant = assertPlainRecord(grantValue, 'Arena local playable learning grant');
  const collectedWeaponDefinitionIds = ownDataField(
    grant,
    'collectedWeaponDefinitionIds',
    'Arena local playable learning grant',
  );
  if (!Array.isArray(collectedWeaponDefinitionIds)
    || collectedWeaponDefinitionIds.length > 1) {
    throw new RangeError('Arena local playable learning grant每局最多只能有一把主研究武器。');
  }
  const weaponDefinitionId = collectedWeaponDefinitionIds[0] ?? null;
  if (weaponDefinitionId === null) return null;
  if (typeof weaponDefinitionId !== 'string'
    || !ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.some(({ equipment }) => (
      equipment.id === weaponDefinitionId
    ))) {
    throw new RangeError('Arena local playable learning grant主研究武器不在当前目录中。');
  }
  return weaponDefinitionId;
}

function terminalProductResultProjection(value: unknown): Readonly<{
  readonly productResult: ReturnType<typeof validateProductMatchResultV3>;
  readonly localParticipantId: string;
}> | null {
  const outer = assertPlainRecord(value, 'Arena local playable step outcome');
  const information = assertPlainRecord(
    ownDataField(outer, 'information', 'Arena local playable step outcome'),
    'Arena local playable information step outcome',
  );
  const modeStep = assertPlainRecord(
    ownDataField(information, 'modeStep', 'Arena local playable information step outcome'),
    'Arena local playable mode step outcome',
  );
  const matchStep = assertPlainRecord(
    ownDataField(modeStep, 'matchStep', 'Arena local playable mode step outcome'),
    'Arena local playable match step outcome',
  );
  const rawResult = ownDataField(matchStep, 'result', 'Arena local playable match step outcome');
  if (rawResult === null) return null;
  const sessionSnapshot = assertPlainRecord(
    ownDataField(modeStep, 'snapshot', 'Arena local playable mode step outcome'),
    'Arena local playable terminal session snapshot',
  );
  const productResult = validateProductMatchResultV3(
    ownDataField(sessionSnapshot, 'result', 'Arena local playable terminal session snapshot'),
  );
  const modeResult = createModeResultV3Payload(rawResult);
  if (createDeterministicDataHash(
    productResult.modeResult,
    'Arena local playable Product Result mode result',
  ) !== createDeterministicDataHash(
    modeResult,
    'Arena local playable match step mode result',
  )) {
    throw new RangeError('Arena local playable Product Result与终局step不一致。');
  }
  const readFrame = assertPlainRecord(
    ownDataField(matchStep, 'readFrame', 'Arena local playable match step outcome'),
    'Arena local playable terminal read frame',
  );
  const sidecar = assertPlainRecord(
    ownDataField(readFrame, 'localActionSidecar', 'Arena local playable terminal read frame'),
    'Arena local playable terminal local sidecar',
  );
  const localParticipantId = ownDataField(
    sidecar,
    'participantId',
    'Arena local playable terminal local sidecar',
  );
  if (typeof localParticipantId !== 'string' || localParticipantId.length === 0) {
    throw new TypeError('Arena local playable terminal local participant无效。');
  }
  if (!productResult.participantAssignments.some(
    ({ participantId }) => participantId === localParticipantId,
  )) {
    throw new RangeError('Arena local playable本地玩家不在Product Result assignment中。');
  }
  return Object.freeze({
    productResult,
    localParticipantId,
  });
}

interface ArenaThreeModePlayableHostConstructionCleanupResourcesCandidateV1 {
  hud: ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1 | null;
  informationConstructionDebt:
    ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1 | null;
}

function playableHostConstructionCleanupCompleteCandidateV1(
  resources: ArenaThreeModePlayableHostConstructionCleanupResourcesCandidateV1,
): boolean {
  return resources.hud === null && resources.informationConstructionDebt === null;
}

function cleanupPlayableHostConstructionResourcesCandidateV1(
  resources: ArenaThreeModePlayableHostConstructionCleanupResourcesCandidateV1,
): void {
  if (resources.hud !== null) {
    rejectAsynchronousSelectionValue(
      resources.hud.dispose(),
      'three-mode playable host construction HUD.dispose',
    );
    resources.hud = null;
  }
  if (resources.hud === null && resources.informationConstructionDebt !== null) {
    const debt = resources.informationConstructionDebt;
    if (!debt.cleanupComplete) {
      rejectAsynchronousSelectionValue(
        debt.retryCleanup(),
        'three-mode playable host construction information debt.retryCleanup',
      );
    }
    if (debt.cleanupComplete) resources.informationConstructionDebt = null;
  }
  if (!playableHostConstructionCleanupCompleteCandidateV1(resources)) {
    throw new Error('Arena three-mode playable host构造资源清理依赖尚未收敛。');
  }
}

export class ArenaThreeModeAuthoritativePlayableHostConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ArenaThreeModePlayableHostConstructionCleanupResourcesCandidateV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ArenaThreeModePlayableHostConstructionCleanupResourcesCandidateV1,
  ) {
    super(
      [originalError, cleanupError],
      'Arena three-mode playable host构造失败且HUD反向清理不完整。',
    );
    this.name = 'ArenaThreeModeAuthoritativePlayableHostConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return playableHostConstructionCleanupCompleteCandidateV1(this.#resources);
  }

  retryCleanup(): void {
    cleanupPlayableHostConstructionResourcesCandidateV1(this.#resources);
  }
}

type ArenaThreeModePlayableHostOperationCandidateV1 =
  | 'start'
  | 'loading-ready'
  | 'open-declared-link'
  | 'open-bottom-navigation'
  | 'dispatch-primary-intent'
  | 'step-match'
  | 'pause-match'
  | 'resume-match'
  | 'settle-match'
  | 'update-preferences'
  | 'destroy';

/**
 * Top-level candidate owner for information navigation, authoritative play and
 * read-only HUD feedback. It deliberately exposes no MatchCore, Bot controller
 * or direct HUD model.
 */
export class ArenaThreeModeAuthoritativePlayableHostCandidateV1 {
  readonly #informationOwner: ArenaThreeModeAuthoritativeInformationHostCandidateV1;
  readonly #hudOptions: Readonly<{
    readonly audio: unknown;
    readonly visual: unknown;
    readonly qualityTier: 'low' | 'medium' | 'high';
  }>;
  #preferences: Readonly<{ readonly soundEnabled: boolean; readonly reducedMotion: boolean }>;
  #hud: ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1 | null;
  #consumerEpochId: string | null = null;
  #failed = false;
  #destroyed = false;
  #cleanupStarted = false;
  #informationOwnerDestroyed = false;
  #operation: ArenaThreeModePlayableHostOperationCandidateV1 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: ArenaThreeModeAuthoritativePlayableHostCandidateV1Options) {
    const source = assertPlainRecord(value, 'Arena three-mode playable host options');
    assertKnownKeys(source, PLAYABLE_OPTION_KEYS, 'Arena three-mode playable host options');
    for (const key of PLAYABLE_OPTION_KEYS) {
      if (
        key !== 'raceParticipantCount'
        && key !== 'survivalEnemyCount'
        && key !== 'selectedWeaponDefinitionIdProvider'
        && key !== 'selectedMapDefinitionIdProvider'
        && key !== 'onSettlementIntentPrepared'
        && key !== 'registryReference'
        && key !== 'modeRegistryCandidate'
        && !Object.hasOwn(source, key)
      ) throw new TypeError(`Arena three-mode playable host缺少${key}。`);
    }
    const playableName = 'Arena three-mode playable host options';
    const hasModeRegistryCandidate = Object.hasOwn(source, 'modeRegistryCandidate');
    const modeRegistryCandidate = hasModeRegistryCandidate
      ? ownDataField(source, 'modeRegistryCandidate', playableName)
      : undefined;
    const raceParticipantCount = Object.hasOwn(source, 'raceParticipantCount')
      ? ownDataField(source, 'raceParticipantCount', playableName)
      : undefined;
    const survivalEnemyCount = Object.hasOwn(source, 'survivalEnemyCount')
      ? ownDataField(source, 'survivalEnemyCount', playableName)
      : undefined;
    if (hasModeRegistryCandidate) {
      if (raceParticipantCount === undefined) {
        throw new TypeError(`${playableName}.raceParticipantCount在显式Mode Registry路径为必填字段。`);
      }
      if (survivalEnemyCount === undefined) {
        throw new TypeError(
          `${playableName}.survivalEnemyCount在显式Mode Registry路径为必填字段。`,
        );
      }
      const binding = modeRegistryPreflightBinding(modeRegistryCandidate);
      assertRequestedParticipantCounts(
        binding,
        assertIntegerAtLeast(raceParticipantCount, 1, `${playableName}.raceParticipantCount`),
        assertIntegerAtLeast(
          survivalEnemyCount,
          1,
          `${playableName}.survivalEnemyCount`,
        ),
      );
    }
    const qualityTier = ownDataField(source, 'qualityTier', playableName);
    if (qualityTier !== 'low' && qualityTier !== 'medium' && qualityTier !== 'high') {
      throw new RangeError('Arena three-mode playable host qualityTier无效。');
    }
    const preferences = playablePreferences(
      ownDataField(source, 'preferences', playableName),
    );
    const seedSource = ownDataField(source, 'seedSource', playableName);
    const progressionRegistry = ownDataField(source, 'progressionRegistry', playableName);
    const rewardProfileDefinition = ownDataField(
      source,
      'rewardProfileDefinition',
      playableName,
    );
    const rewardProfileService = ownDataField(source, 'rewardProfileService', playableName);
    const learningProfileDefinition = ownDataField(
      source,
      'learningProfileDefinition',
      playableName,
    );
    const learningEvidenceDefinition = ownDataField(
      source,
      'learningEvidenceDefinition',
      playableName,
    );
    const learningProfileService = ownDataField(source, 'learningProfileService', playableName);
    const onSettlementIntentPrepared = Object.hasOwn(source, 'onSettlementIntentPrepared')
      ? ownDataField(source, 'onSettlementIntentPrepared', playableName)
      : undefined;
    if (onSettlementIntentPrepared !== undefined
      && typeof onSettlementIntentPrepared !== 'function') {
      throw new TypeError(`${playableName}.onSettlementIntentPrepared必须是函数。`);
    }
    const maxEventCount = ownDataField(source, 'maxEventCount', playableName);
    const selectedWeaponDefinitionIdProvider = Object.hasOwn(
      source,
      'selectedWeaponDefinitionIdProvider',
    ) ? ownDataField(source, 'selectedWeaponDefinitionIdProvider', playableName) : undefined;
    const selectedMapDefinitionIdProvider = Object.hasOwn(
      source,
      'selectedMapDefinitionIdProvider',
    ) ? ownDataField(source, 'selectedMapDefinitionIdProvider', playableName) : undefined;
    const weaponRegistryReference = Object.hasOwn(source, 'registryReference')
      ? ownDataField(source, 'registryReference', playableName)
      : undefined;
    const audio = ownDataField(source, 'audio', playableName);
    const visual = ownDataField(source, 'visual', playableName);
    const hudOptions: Readonly<{
      audio: unknown;
      visual: unknown;
      qualityTier: 'low' | 'medium' | 'high';
    }> = Object.freeze({ audio, visual, qualityTier });
    const hud = new ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1(hudOptions);
    let informationOwner: ArenaThreeModeAuthoritativeInformationHostCandidateV1;
    try {
      informationOwner = new ArenaThreeModeAuthoritativeInformationHostCandidateV1({
        seedSource,
        progressionRegistry,
        rewardProfileDefinition,
        rewardProfileService,
        learningProfileDefinition,
        learningEvidenceDefinition,
        learningProfileService,
        maxEventCount: maxEventCount as number,
        ...(onSettlementIntentPrepared === undefined
          ? {}
          : {
            onSettlementIntentPrepared:
              onSettlementIntentPrepared as (intent: unknown) => void,
          }),
        ...(selectedWeaponDefinitionIdProvider === undefined
          ? {}
          : {
            selectedWeaponDefinitionIdProvider:
              selectedWeaponDefinitionIdProvider as () => unknown,
          }),
        ...(selectedMapDefinitionIdProvider === undefined
          ? {}
          : {
            selectedMapDefinitionIdProvider:
              selectedMapDefinitionIdProvider as () => unknown,
          }),
        ...(weaponRegistryReference === undefined
          ? {}
          : { registryReference: weaponRegistryReference }),
        ...(raceParticipantCount === undefined
          ? {}
          : { raceParticipantCount: raceParticipantCount as 2 | 3 | 4 }),
        ...(survivalEnemyCount === undefined
          ? {}
          : { survivalEnemyCount: survivalEnemyCount as 1 | 4 | 8 | 12 | 16 }),
        ...(hasModeRegistryCandidate ? { modeRegistryCandidate } : {}),
      });
    } catch (error) {
      const resources: ArenaThreeModePlayableHostConstructionCleanupResourcesCandidateV1 = {
        hud,
        informationConstructionDebt:
          error instanceof
            ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1
            ? error
            : null,
      };
      try {
        cleanupPlayableHostConstructionResourcesCandidateV1(resources);
      } catch (cleanupError) {
        throw new ArenaThreeModeAuthoritativePlayableHostConstructionCleanupFailureCandidateV1(
          error,
          cleanupError,
          resources,
        );
      }
      throw error;
    }
    this.#informationOwner = informationOwner;
    this.#hudOptions = hudOptions;
    this.#preferences = preferences;
    this.#hud = hud;
  }

  #assertUsable(): void {
    if (this.#cleanupStarted) {
      throw new Error('Arena three-mode playable host已开始清理。');
    }
    if (this.#failed) throw new Error('Arena three-mode playable host已失败关闭。');
    if (this.#destroyed) throw new Error('Arena three-mode playable host已销毁。');
  }

  #beginOperation(operation: ArenaThreeModePlayableHostOperationCandidateV1): void {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        `Arena three-mode playable host拒绝${this.#operation}期间同步重入${operation}。`,
      );
      throw this.#reentryError;
    }
    this.#operation = operation;
    this.#reentryError = null;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        `Arena three-mode playable host拒绝${this.#operation}期间同步重入${operation}。`,
      );
      throw this.#reentryError;
    }
  }

  #failSwallowedReentry(
    operation: ArenaThreeModePlayableHostOperationCandidateV1,
    cause?: unknown,
  ): never {
    this.#cleanupStarted = true;
    const cleanupErrors = this.#cleanupOwnedResources();
    this.#failed = true;
    this.#destroyed = this.#cleanupComplete();
    const errors: unknown[] = [
      this.#reentryError
        ?? new Error(`Arena three-mode playable host ${operation}期间发生同步重入。`),
    ];
    if (cause !== undefined && cause !== this.#reentryError) errors.push(cause);
    errors.push(...cleanupErrors);
    throw new AggregateError(
      errors,
      `Arena three-mode playable host ${operation}发生被子Owner吞掉的重入并已失败关闭。`,
    );
  }

  #runOperation<T>(
    operation: ArenaThreeModePlayableHostOperationCandidateV1,
    action: () => T,
  ): T {
    this.#beginOperation(operation);
    const reentrySequence = this.#reentrySequence;
    try {
      let result: T;
      try {
        result = action();
        rejectAsynchronousSelectionValue(
          result,
          `three-mode playable host ${operation}`,
        );
      } catch (error) {
        if (this.#reentrySequence !== reentrySequence) {
          return this.#failSwallowedReentry(operation, error);
        }
        throw error;
      }
      if (this.#reentrySequence !== reentrySequence) {
        return this.#failSwallowedReentry(operation);
      }
      return result;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
  }

  #ensureHud(): ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1 {
    this.#assertUsable();
    if (this.#hud === null) {
      this.#hud = new ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1(
        this.#hudOptions,
      );
    }
    return this.#hud;
  }

  #closeHud(): readonly unknown[] {
    const hud = this.#hud;
    if (hud === null) return Object.freeze([]);
    try {
      rejectAsynchronousSelectionValue(
        hud.dispose(),
        'three-mode playable host HUD.dispose',
      );
      this.#hud = null;
      this.#consumerEpochId = null;
      return Object.freeze([]);
    } catch (error) {
      return Object.freeze([error]);
    }
  }

  #cleanupOwnedResources(): readonly unknown[] {
    const cleanupErrors = [...this.#closeHud()];
    if (this.#hud === null && !this.#informationOwnerDestroyed) {
      try {
        rejectAsynchronousSelectionValue(
          this.#informationOwner.destroy(),
          'three-mode playable host information owner.destroy',
        );
        this.#informationOwnerDestroyed = true;
      } catch (cleanupError) { cleanupErrors.push(cleanupError); }
    }
    return Object.freeze(cleanupErrors);
  }

  #cleanupComplete(): boolean {
    return this.#informationOwnerDestroyed && this.#hud === null;
  }

  #fail(error: unknown): never {
    this.#cleanupStarted = true;
    const cleanupErrors = this.#cleanupOwnedResources();
    this.#failed = true;
    this.#destroyed = this.#cleanupComplete();
    const failure = new Error('Arena three-mode playable host失败关闭。') as Error & {
      cleanupErrors?: readonly unknown[];
    };
    failure.cause = error;
    if (cleanupErrors.length > 0) failure.cleanupErrors = Object.freeze(cleanupErrors);
    throw failure;
  }

  start(value: unknown): unknown {
    this.#assertUsable();
    return this.#runOperation('start', () => this.#informationOwner.host.start(value));
  }

  loadingReady(value: unknown): unknown {
    this.#assertUsable();
    return this.#runOperation(
      'loading-ready',
      () => this.#informationOwner.host.loadingReady(value),
    );
  }

  openDeclaredLink(value: unknown): unknown {
    this.#assertUsable();
    return this.#runOperation(
      'open-declared-link',
      () => this.#informationOwner.host.openDeclaredLink(value),
    );
  }

  openBottomNavigation(value: unknown): unknown {
    this.#assertUsable();
    return this.#runOperation(
      'open-bottom-navigation',
      () => this.#informationOwner.host.openBottomNavigation(value),
    );
  }

  dispatchPrimaryIntent(value: unknown): unknown {
    this.#assertUsable();
    return this.#runOperation('dispatch-primary-intent', () => {
      try {
        const information = this.#informationOwner.host.dispatchPrimaryIntent(value);
        if (information.matchStart === null) {
          return Object.freeze({ information, hud: null });
        }
        if (information.matchPresentation === null) {
          return this.#fail(new Error('Arena three-mode playable host开局缺少HUD权威投影。'));
        }
        if (!(information.matchPresentation instanceof ArenaV2ModeHudValidatedStepProjectionV1)) {
          return this.#fail(new Error('Arena three-mode playable host开局投影身份无效。'));
        }
        const generation = information.snapshot.generation;
        const consumerEpochId = `arena-v2.hud-generation-${generation}`;
        const hud = this.#ensureHud().beginEpoch({
          consumerEpochId,
          projection: information.matchPresentation,
          preferences: this.#preferences,
        });
        const scene = information.matchPresentation.getSceneReadFrame();
        const weaponFeedbackDirectionFactsV2 =
          information.matchPresentation.getWeaponFeedbackDirectionFactsV2();
        this.#consumerEpochId = consumerEpochId;
        return Object.freeze({ information, hud, scene, weaponFeedbackDirectionFactsV2 });
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  stepMatch(localInput: unknown): unknown {
    this.#assertUsable();
    return this.#runOperation('step-match', () => {
      try {
        const information = this.#informationOwner.host.stepMatch(localInput);
        if (information.matchPresentation === null || this.#consumerEpochId === null) {
          return this.#fail(new Error('Arena three-mode playable host step缺少HUD epoch或投影。'));
        }
        if (!(information.matchPresentation instanceof ArenaV2ModeHudValidatedStepProjectionV1)) {
          return this.#fail(new Error('Arena three-mode playable host step投影身份无效。'));
        }
        const hud = this.#ensureHud().consume({
          consumerEpochId: this.#consumerEpochId,
          projection: information.matchPresentation,
          preferences: this.#preferences,
        });
        const scene = information.matchPresentation.getSceneReadFrame();
        const weaponFeedbackDirectionFactsV2 =
          information.matchPresentation.getWeaponFeedbackDirectionFactsV2();
        return Object.freeze({ information, hud, scene, weaponFeedbackDirectionFactsV2 });
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  pauseMatch(): unknown {
    this.#assertUsable();
    return this.#runOperation('pause-match', () => this.#informationOwner.host.pauseMatch());
  }

  resumeMatch(): unknown {
    this.#assertUsable();
    return this.#runOperation('resume-match', () => this.#informationOwner.host.resumeMatch());
  }

  settleMatch(): unknown {
    this.#assertUsable();
    return this.#runOperation('settle-match', () => {
      let settlement: unknown;
      try {
        settlement = this.#informationOwner.host.settleMatch();
      } catch (error) {
        const cleanupErrors = this.#closeHud();
        if (cleanupErrors.length > 0) {
          return this.#fail(new AggregateError(
            [error, ...cleanupErrors],
            'Arena three-mode playable host待恢复结算时HUD清理失败。',
          ));
        }
        if (settlementErrorRetainsRecoveryEvidence(error)) throw error;
        return this.#fail(error);
      }
      const cleanupErrors = this.#closeHud();
      if (cleanupErrors.length > 0) {
        return this.#fail(new AggregateError(
          cleanupErrors,
          'Arena three-mode playable host结算后HUD清理失败。',
        ));
      }
      return settlement;
    });
  }

  updatePreferences(value: unknown): void {
    this.#assertUsable();
    this.#runOperation('update-preferences', () => {
      this.#preferences = playablePreferences(value);
    });
  }

  getPreferencesRead(): Readonly<{
    readonly soundEnabled: boolean;
    readonly reducedMotion: boolean;
  }> {
    this.#assertUsable();
    this.#assertNoOperation('getPreferencesRead');
    return this.#preferences;
  }

  getInformationSnapshot(): ReturnType<
    ArenaV2InformationModeSessionHostCandidateV1['getSnapshot']
  > {
    this.#assertUsable();
    this.#assertNoOperation('getInformationSnapshot');
    return this.#informationOwner.host.getSnapshot();
  }

  getMatchInputContext(): ReturnType<
    ArenaV2InformationModeSessionHostCandidateV1['getMatchInputContext']
  > {
    this.#assertUsable();
    this.#assertNoOperation('getMatchInputContext');
    return this.#informationOwner.host.getMatchInputContext();
  }

  getSnapshot(): unknown {
    this.#assertUsable();
    this.#assertNoOperation('getSnapshot');
    return Object.freeze({
      information: this.#informationOwner.host.getSnapshot(),
      hud: this.#hud?.getSnapshot() ?? null,
      consumerEpochId: this.#consumerEpochId,
      preferences: this.#preferences,
    });
  }

  destroy(): void {
    this.#assertNoOperation('destroy');
    if (this.#destroyed && this.#hud === null) return;
    this.#runOperation('destroy', () => {
      this.#cleanupStarted = true;
      const errors = this.#cleanupOwnedResources();
      this.#destroyed = this.#cleanupComplete();
      this.#failed = !this.#destroyed;
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena three-mode playable host清理不完整。');
      }
      if (!this.#destroyed) {
        throw new Error('Arena three-mode playable host清理未收敛。');
      }
    });
  }
}

export function createArenaThreeModeAuthoritativePlayableHostCandidateV1(
  value: ArenaThreeModeAuthoritativePlayableHostCandidateV1Options,
): ArenaThreeModeAuthoritativePlayableHostCandidateV1 {
  return new ArenaThreeModeAuthoritativePlayableHostCandidateV1(value);
}

interface ArenaThreeModeLocalPlayableConstructionCleanupResourcesCandidateV1 {
  downstreamConstructionDebt:
    | ArenaThreeModeAuthoritativePlayableHostConstructionCleanupFailureCandidateV1
    | ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1
    | null;
  playableHost: ArenaThreeModeAuthoritativePlayableHostCandidateV1 | null;
  learningSettlementRecoveryOwner: ArenaV2LearningSettlementRecoveryOwnerCandidateV1 | null;
  learningSettlementIntentJournal: ArenaV2LearningSettlementIntentJournalCandidateV1 | null;
  profileOwner: ArenaV2ProfileServicesOwnerCandidateV1 | null;
}

function localPlayableConstructionCleanupCompleteCandidateV1(
  resources: ArenaThreeModeLocalPlayableConstructionCleanupResourcesCandidateV1,
): boolean {
  return resources.downstreamConstructionDebt === null
    && resources.playableHost === null
    && resources.learningSettlementRecoveryOwner === null
    && resources.learningSettlementIntentJournal === null
    && resources.profileOwner === null;
}

function cleanupLocalPlayableConstructionResourcesCandidateV1(
  resources: ArenaThreeModeLocalPlayableConstructionCleanupResourcesCandidateV1,
): void {
  const cleanupErrors: unknown[] = [];
  if (resources.downstreamConstructionDebt !== null) {
    const debt = resources.downstreamConstructionDebt;
    try {
      if (!debt.cleanupComplete) {
        rejectAsynchronousSelectionValue(
          debt.retryCleanup(),
          'three-mode local playable construction downstream debt.retryCleanup',
        );
      }
      if (debt.cleanupComplete) resources.downstreamConstructionDebt = null;
    } catch (error) { cleanupErrors.push(error); }
  }
  if (resources.downstreamConstructionDebt === null && resources.playableHost !== null) {
    try {
      rejectAsynchronousSelectionValue(
        resources.playableHost.destroy(),
        'three-mode local playable construction playable host.destroy',
      );
      resources.playableHost = null;
    } catch (error) { cleanupErrors.push(error); }
  }
  if (resources.downstreamConstructionDebt === null
    && resources.playableHost === null
    && resources.learningSettlementRecoveryOwner !== null) {
    try {
      rejectAsynchronousSelectionValue(
        resources.learningSettlementRecoveryOwner.destroy(),
        'three-mode local playable construction settlement recovery owner.destroy',
      );
      resources.learningSettlementRecoveryOwner = null;
    } catch (error) { cleanupErrors.push(error); }
  }
  if (resources.downstreamConstructionDebt === null
    && resources.playableHost === null
    && resources.learningSettlementRecoveryOwner === null
    && resources.learningSettlementIntentJournal !== null) {
    try {
      rejectAsynchronousSelectionValue(
        resources.learningSettlementIntentJournal.destroy(),
        'three-mode local playable construction settlement intent journal.destroy',
      );
      resources.learningSettlementIntentJournal = null;
    } catch (error) { cleanupErrors.push(error); }
  }
  if (resources.downstreamConstructionDebt === null
    && resources.playableHost === null
    && resources.learningSettlementRecoveryOwner === null
    && resources.learningSettlementIntentJournal === null
    && resources.profileOwner !== null) {
    try {
      rejectAsynchronousSelectionValue(
        resources.profileOwner.destroy(),
        'three-mode local playable construction profile owner.destroy',
      );
      resources.profileOwner = null;
    } catch (error) { cleanupErrors.push(error); }
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      'Arena three-mode local playable host构造资源清理不完整。',
    );
  }
  if (!localPlayableConstructionCleanupCompleteCandidateV1(resources)) {
    throw new Error('Arena three-mode local playable host构造资源清理依赖尚未收敛。');
  }
}

export class ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ArenaThreeModeLocalPlayableConstructionCleanupResourcesCandidateV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ArenaThreeModeLocalPlayableConstructionCleanupResourcesCandidateV1,
  ) {
    super(
      [originalError, cleanupError],
      'Arena three-mode local playable host构造失败且反向清理不完整。',
    );
    this.name =
      'ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return localPlayableConstructionCleanupCompleteCandidateV1(this.#resources);
  }

  retryCleanup(): void {
    cleanupLocalPlayableConstructionResourcesCandidateV1(this.#resources);
  }
}

type ArenaThreeModeLocalPlayableHostOperationCandidateV1 =
  | 'start'
  | 'loading-ready'
  | 'open-declared-link'
  | 'open-result-collection-detail'
  | 'open-bottom-navigation'
  | 'select-mode'
  | 'select-character'
  | 'select-weapon'
  | 'select-map'
  | 'dispatch-primary-intent'
  | 'step-match'
  | 'pause-match'
  | 'resume-match'
  | 'settle-match'
  | 'retry-settlement-recovery'
  | 'update-preferences'
  | 'destroy';

/**
 * Convenience candidate owner that opens both Profiles and wires the complete
 * three-mode information/play/HUD/settlement path without external services.
 */
export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 {
  readonly #retentionObservationCollector:
    ArenaThreeModeAuthoritativeLocalRetentionObservationCollectorCandidateV1 | null;
  readonly #learningSettlementRecoveryOwner:
    ArenaV2LearningSettlementRecoveryOwnerCandidateV1;
  readonly #learningSettlementIntentJournal:
    ArenaV2LearningSettlementIntentJournalCandidateV1;
  #profileOwner: ArenaV2ProfileServicesOwnerCandidateV1 | null;
  #playableHost: ArenaThreeModeAuthoritativePlayableHostCandidateV1 | null;
  #selectedModeKind: 'duel' | 'race' | 'survival' | null = null;
  #terminalProductResult: ReturnType<typeof validateProductMatchResultV3> | null = null;
  #terminalLocalParticipantId: string | null = null;
  #rewardSettlementProjection: ReturnType<
    typeof projectArenaV2ModeRewardSettlementInformationCandidateV1
  > | null = null;
  #rewardSettlementProjectionError: unknown = null;
  #selectedWeaponDefinitionId = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(
    ({ id }) => id === 'heavy-hammer',
  )!.equipment.id;
  #selectedMapDefinitionId = ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1
    .mapDefinitions[0]!.mapDefinitionId;
  #playAgainContentContinuityLock:
    ArenaV2ResultPlayAgainContentContinuityCandidateV1 | null = null;
  #raceParticipantCount: 2 | 3 | 4;
  #survivalEnemyCount: 1 | 4 | 8 | 12 | 16;
  #pendingWeaponResearchFocusObservation: PendingWeaponResearchFocusObservationV1 | null = null;
  #pendingMapLearningFocusObservation: PendingMapLearningFocusObservationV1 | null = null;
  #matchStartLearningGoalAttempt: ArenaV2NextLearningGoalV1 | null = null;
  #pendingNextGoalImpression: PendingNextGoalImpressionV1 | null = null;
  #pendingHomeContinuationFollowObservation:
    PendingHomeContinuationFollowObservationV1 | null = null;
  #acceptedHomeContinuationPreparation:
    PendingHomeContinuationFollowObservationV1 | null = null;
  #pendingResultCollectionDetailPreparation:
    PendingHomeContinuationFollowObservationV1 | null = null;
  #homeContinuationMatchReceipt: HomeContinuationMatchReceiptV1 | null = null;
  #homeContinuationMatchReceiptError: unknown = null;
  readonly #catalogImpressionOrdinals = new Map<'maps' | 'weapons', number>();
  readonly #contentEntryOrdinals = new Map<string, number>();
  readonly #usedWeaponDefinitionIds = new Set<string>();
  readonly #usedMapDefinitionIds = new Set<string>();
  readonly #registryRead: (() => unknown) | null;
  #lastObservedNavigationRevision: number | null = null;
  #retentionObservationEventSequence = 0;
  #pendingRetentionActionRetry: PendingRetentionActionRetryV1 | null = null;
  #pendingCatalogRetentionWorkBatch: PendingRetentionWorkBatchV1 | null = null;
  #pendingSettlementRetentionWorkBatch: PendingRetentionWorkBatchV1 | null = null;
  #pendingNextGoalCaptureDebt: PendingNextGoalCaptureDebtV1 | null = null;
  #lastRetentionObservation: ArenaV2RetentionObservationV1 | null = null;
  #lastRetentionObservationError: unknown = null;
  #retentionObservationCollectionActive = false;
  #learningSettlementFinalizationActive = false;
  #indeterminateMatchStartFailure: Error | null = null;
  #settlementIntentJournalFailure: Error | null = null;
  #startupSettlementRecoveryNotice: Readonly<{
    readonly status: 'recovered-after-reward' | 'discarded-before-reward'
      | 'recovery-retry-required' | 'recovery-restart-required';
    readonly reason: 'baseline-only' | 'reward-not-committed'
      | 'learning-profile-recovery-temporarily-unavailable'
      | 'learning-profile-recovery-indeterminate' | null;
  }> | null = null;
  #settlementRestartReason: 'journal-acknowledgement'
    | 'profile-write-indeterminate' | null = null;
  #cleanupStarted = false;
  #learningSettlementRecoveryOwnerDestroyed = false;
  #learningSettlementIntentJournalDestroyed = false;
  #destroyed = false;
  #operation: ArenaThreeModeLocalPlayableHostOperationCandidateV1 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #synchronousReentryFailure: Error | null = null;

  constructor(value: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options) {
    const localName = 'Arena three-mode local playable host options';
    const source = assertPlainRecord(value, localName);
    assertKnownKeys(
      source,
      LOCAL_PLAYABLE_OPTION_KEYS,
      localName,
    );
    for (const key of LOCAL_PLAYABLE_REQUIRED_KEYS) {
      if (!Object.hasOwn(source, key)) {
        throw new TypeError(`Arena three-mode local playable host缺少${key}。`);
      }
    }
    const hasModeRegistryCandidate = Object.hasOwn(source, 'modeRegistryCandidate');
    const modeRegistryCandidate = hasModeRegistryCandidate
      ? ownDataField(source, 'modeRegistryCandidate', localName)
      : undefined;
    let raceParticipantCount: unknown;
    let survivalEnemyCount: unknown;
    if (hasModeRegistryCandidate) {
      if (!Object.hasOwn(source, 'raceParticipantCount')) {
        throw new TypeError(`${localName}.raceParticipantCount在显式Mode Registry路径为必填字段。`);
      }
      if (!Object.hasOwn(source, 'survivalEnemyCount')) {
        throw new TypeError(
          `${localName}.survivalEnemyCount在显式Mode Registry路径为必填字段。`,
        );
      }
      raceParticipantCount = ownDataField(source, 'raceParticipantCount', localName);
      survivalEnemyCount = ownDataField(source, 'survivalEnemyCount', localName);
      const binding = modeRegistryPreflightBinding(modeRegistryCandidate);
      assertRequestedParticipantCounts(
        binding,
        assertIntegerAtLeast(raceParticipantCount, 1, `${localName}.raceParticipantCount`),
        assertIntegerAtLeast(
          survivalEnemyCount,
          1,
          `${localName}.survivalEnemyCount`,
        ),
      );
    } else {
      raceParticipantCount = Object.hasOwn(source, 'raceParticipantCount')
        ? ownDataField(source, 'raceParticipantCount', localName)
        : undefined;
      survivalEnemyCount = Object.hasOwn(source, 'survivalEnemyCount')
        ? ownDataField(source, 'survivalEnemyCount', localName)
        : undefined;
    }
    const seedSource = ownDataField(source, 'seedSource', localName);
    const storage = ownDataField(source, 'storage', localName);
    const ownerId = ownDataField(source, 'ownerId', localName);
    const wallNow = ownDataField(source, 'wallNow', localName);
    const audio = ownDataField(source, 'audio', localName);
    const visual = ownDataField(source, 'visual', localName);
    const rawMaxEventCount = Object.hasOwn(source, 'maxEventCount')
      ? ownDataField(source, 'maxEventCount', localName)
      : undefined;
    const maxEventCount = assertIntegerAtLeast(
      rawMaxEventCount ?? 200_000,
      1,
      'Arena three-mode local playable host.maxEventCount',
    );
    if (maxEventCount > 1_000_000) {
      throw new RangeError('Arena three-mode local playable host.maxEventCount超过上限。');
    }
    const rawQualityTier = Object.hasOwn(source, 'qualityTier')
      ? ownDataField(source, 'qualityTier', localName)
      : undefined;
    const qualityTier = rawQualityTier ?? 'high';
    if (qualityTier !== 'low' && qualityTier !== 'medium' && qualityTier !== 'high') {
      throw new RangeError('Arena three-mode local playable host.qualityTier无效。');
    }
    const rawPreferences = Object.hasOwn(source, 'preferences')
      ? ownDataField(source, 'preferences', localName)
      : undefined;
    const explicitPreferences = rawPreferences === undefined
      ? null
      : playablePreferences(rawPreferences);
    const keyPrefix = Object.hasOwn(source, 'keyPrefix')
      ? ownDataField(source, 'keyPrefix', localName)
      : undefined;
    const profileKeyPrefix = assertNonEmptyString(
      keyPrefix ?? 'arena-v2.profile-services.candidate.v1',
      'Arena three-mode local playable host.keyPrefix',
    );
    const profileOwnerId = assertNonEmptyString(
      ownerId,
      'Arena three-mode local playable host.ownerId',
    );
    const leaseDurationMs = Object.hasOwn(source, 'leaseDurationMs')
      ? ownDataField(source, 'leaseDurationMs', localName)
      : undefined;
    const leaseTakeoverSameOwner = Object.hasOwn(source, 'leaseTakeoverSameOwner')
      ? ownDataField(source, 'leaseTakeoverSameOwner', localName)
      : undefined;
    const rawRetentionObservationCollector = Object.hasOwn(
      source,
      'retentionObservationCollector',
    ) ? ownDataField(source, 'retentionObservationCollector', localName) : undefined;
    const retentionObservationCollector = localRetentionObservationCollector(
      rawRetentionObservationCollector,
    );
    const weaponRegistryReference = Object.hasOwn(source, 'registryReference')
      ? ownDataField(source, 'registryReference', localName)
      : undefined;
    const registryRead = weaponRegistryReference === undefined
      ? null
      : captureRegistryRead(weaponRegistryReference);
    const initialRegistryBinding = registryRead === null
      ? null
      : registryBinding(rejectAsynchronousSelectionValue(
        registryRead(),
        'registryReference.read',
      ));
    if (initialRegistryBinding !== null) {
      this.#selectedWeaponDefinitionId =
        initialRegistryBinding.collectionEquipmentDefinitionIds[0]!;
    }

    const profileOwner = new ArenaV2ProfileServicesOwnerCandidateV1({
      rewardProfileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
      learningProfileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      storage,
      ownerId: profileOwnerId,
      wallNow,
      keyPrefix: profileKeyPrefix,
      ...(leaseDurationMs === undefined ? {} : { leaseDurationMs }),
      ...(leaseTakeoverSameOwner === undefined ? {} : { leaseTakeoverSameOwner }),
    });
    let playableHost: ArenaThreeModeAuthoritativePlayableHostCandidateV1;
    let learningSettlementRecoveryOwner:
      ArenaV2LearningSettlementRecoveryOwnerCandidateV1 | null = null;
    let learningSettlementIntentJournal:
      ArenaV2LearningSettlementIntentJournalCandidateV1 | null = null;
    let recoveredSettlementIntent: ReturnType<
      ArenaV2LearningSettlementIntentJournalCandidateV1['recoverPending']
    > = null;
    try {
      learningSettlementIntentJournal =
        new ArenaV2LearningSettlementIntentJournalCandidateV1({
          profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
          storage,
          ownerId: `${profileOwnerId}.learning-settlement-intent`,
          wallNow,
          keyPrefix: `${profileKeyPrefix}.learning-settlement-intent`,
          ...(leaseDurationMs === undefined ? {} : { leaseDurationMs }),
          ...(leaseTakeoverSameOwner === undefined ? {} : { leaseTakeoverSameOwner }),
        });
      learningSettlementIntentJournal.open();
      recoveredSettlementIntent = learningSettlementIntentJournal.recoverPending(
        profileOwner.rewardProfileService,
        profileOwner.learningProfileService,
      );
      learningSettlementRecoveryOwner =
        new ArenaV2LearningSettlementRecoveryOwnerCandidateV1({
          profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
          readCurrentProfile: () => profileOwner.learningProfileService.getSnapshot(),
          onSettlementFinalized: (settlement, grant) => {
            if (this.#learningSettlementFinalizationActive) {
              throw new Error('Arena Learning结算后处理禁止重入。');
            }
            this.#learningSettlementFinalizationActive = true;
            try {
              if (this.#terminalProductResult !== null && this.#selectedModeKind !== null) {
                this.#completeLearningSettlementPostProcessing(
                  settlement,
                  authorityResearchedWeaponDefinitionIdFromGrant(grant),
                );
              }
            } finally {
              this.#learningSettlementFinalizationActive = false;
            }
          },
        });
      const rewardProfile = profileOwner.rewardProfileService.getSnapshot();
      const preferences = explicitPreferences === null
        ? Object.freeze({
          soundEnabled: rewardProfile.settings.soundEnabled,
          reducedMotion: rewardProfile.settings.reducedMotion,
        })
        : explicitPreferences;
      const progressionRegistry = createArenaV2ThreeModeRewardRegistryCandidateV1({
        duelModeDefinitionId: MODE_IDS.duel,
        raceModeDefinitionId: MODE_IDS.race,
        survivalModeDefinitionId: MODE_IDS.survival,
      });
      playableHost = new ArenaThreeModeAuthoritativePlayableHostCandidateV1({
        seedSource,
        progressionRegistry,
        rewardProfileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
        rewardProfileService: profileOwner.rewardProfileService,
        learningProfileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
        learningEvidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
        learningProfileService: profileOwner.learningProfileService,
        maxEventCount,
        onSettlementIntentPrepared: (intent: unknown) => {
          if (learningSettlementIntentJournal === null) {
            throw new Error('Arena结算意图台账尚未初始化。');
          }
          const prepared = learningSettlementIntentJournal
            .capturePreparedSettlementIntent(intent);
          learningSettlementRecoveryOwner?.capturePreparedGrant(prepared.learningGrant);
        },
        selectedWeaponDefinitionIdProvider: () => {
          const requested = this.#playAgainContentContinuityLock?.weaponDefinitionId
            ?? this.#selectedWeaponDefinitionId;
          if (registryRead === null) return requested;
          const active = registryBinding(rejectAsynchronousSelectionValue(
            registryRead(),
            'registryReference.read',
          ));
          return active.collectionEquipmentDefinitionIds.includes(
            requested,
          )
            ? requested
            : this.#playAgainContentContinuityLock === null
              ? active.collectionEquipmentDefinitionIds[0]!
              : (() => {
                throw new RangeError('Arena再来一局原武器已不在active Registry，拒绝静默替换。');
              })();
        },
        selectedMapDefinitionIdProvider: () => (
          this.#playAgainContentContinuityLock?.mapDefinitionId
          ?? this.#selectedMapDefinitionId
        ),
        audio,
        visual,
        qualityTier,
        preferences,
        ...(weaponRegistryReference === undefined
          ? {}
          : { registryReference: weaponRegistryReference }),
        ...(raceParticipantCount === undefined
          ? {}
          : { raceParticipantCount: raceParticipantCount as 2 | 3 | 4 }),
        ...(survivalEnemyCount === undefined
          ? {}
          : { survivalEnemyCount: survivalEnemyCount as 1 | 4 | 8 | 12 | 16 }),
        ...(hasModeRegistryCandidate ? { modeRegistryCandidate } : {}),
      });
    } catch (error) {
      const resources: ArenaThreeModeLocalPlayableConstructionCleanupResourcesCandidateV1 = {
        downstreamConstructionDebt:
          error instanceof
            ArenaThreeModeAuthoritativePlayableHostConstructionCleanupFailureCandidateV1
            || error instanceof
              ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1
            ? error
            : null,
        playableHost: null,
        learningSettlementRecoveryOwner,
        learningSettlementIntentJournal,
        profileOwner,
      };
      try {
        cleanupLocalPlayableConstructionResourcesCandidateV1(resources);
      } catch (cleanupError) {
        throw new ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1(
          error,
          cleanupError,
          resources,
        );
      }
      throw error;
    }
    if (learningSettlementRecoveryOwner === null || learningSettlementIntentJournal === null) {
      const initializationError = new Error(
        'Arena three-mode local playable host缺少Learning结算恢复owner或持久台账。',
      );
      const resources: ArenaThreeModeLocalPlayableConstructionCleanupResourcesCandidateV1 = {
        downstreamConstructionDebt: null,
        playableHost,
        learningSettlementRecoveryOwner,
        learningSettlementIntentJournal,
        profileOwner,
      };
      try {
        cleanupLocalPlayableConstructionResourcesCandidateV1(resources);
      } catch (cleanupError) {
        throw new ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1(
          initializationError,
          cleanupError,
          resources,
        );
      }
      throw initializationError;
    }
    this.#profileOwner = profileOwner;
    this.#playableHost = playableHost;
    this.#learningSettlementRecoveryOwner = learningSettlementRecoveryOwner;
    this.#learningSettlementIntentJournal = learningSettlementIntentJournal;
    this.#retentionObservationCollector = retentionObservationCollector;
    this.#registryRead = registryRead;
    this.#raceParticipantCount = (raceParticipantCount ?? 4) as 2 | 3 | 4;
    this.#survivalEnemyCount = (survivalEnemyCount ?? 16) as 1 | 4 | 8 | 12 | 16;
    if (recoveredSettlementIntent !== null) {
      this.#startupSettlementRecoveryNotice = Object.freeze({
        status: recoveredSettlementIntent.status,
        reason: recoveredSettlementIntent.status === 'discarded-before-reward'
          ? recoveredSettlementIntent.reason
          : recoveredSettlementIntent.status === 'recovery-retry-required'
            || recoveredSettlementIntent.status === 'recovery-restart-required'
            ? recoveredSettlementIntent.reason
          : null,
      });
      if (recoveredSettlementIntent.status === 'discarded-before-reward'
        && recoveredSettlementIntent.cleanupPending) {
        this.#settlementIntentJournalFailure = new Error(
          'Arena已安全判定上局不产生Reward/Learning，但旧结算意图清理未确认；需重启继续清理。',
          { cause: recoveredSettlementIntent.cleanupError },
        );
        this.#settlementRestartReason = 'journal-acknowledgement';
      }
      if (recoveredSettlementIntent.status === 'recovery-restart-required') {
        this.#settlementIntentJournalFailure = new Error(
          'Arena Reward已存在，但Learning启动恢复未完成；已保留结算意图，需再次重启恢复。',
          { cause: recoveredSettlementIntent.recoveryError },
        );
        this.#settlementRestartReason = 'profile-write-indeterminate';
      }
      if (recoveredSettlementIntent.status === 'recovery-retry-required') {
        learningSettlementRecoveryOwner.captureMatchStartBaseline(
          recoveredSettlementIntent.baselineProfile,
        );
        learningSettlementRecoveryOwner.capturePreparedGrant(
          recoveredSettlementIntent.learningGrant,
        );
        learningSettlementRecoveryOwner.retainPendingSettlementFailure(
          recoveredSettlementIntent.recoveryError,
        );
      }
    }
    if (recoveredSettlementIntent?.status === 'recovered-after-reward') {
      try {
        this.#learningSettlementRecoveryOwner.captureMatchStartBaseline(
          recoveredSettlementIntent.baselineProfile,
        );
        this.#learningSettlementRecoveryOwner.capturePreparedGrant(
          recoveredSettlementIntent.learningGrant,
        );
        this.#learningSettlementRecoveryOwner.completeSettlement(
          recoveredSettlementIntent.settlement,
          recoveredSettlementIntent.learningGrant,
        );
        try {
          this.#acknowledgeSettlementIntent(
            recoveredSettlementIntent.rewardGrant.grantId,
            recoveredSettlementIntent.learningGrant.grantId,
          );
        } catch (error) {
          if (error !== this.#settlementIntentJournalFailure) throw error;
        }
      } catch (error) {
        try {
          this.destroy();
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            'Arena three-mode local playable host启动恢复失败且清理不完整。',
          );
        }
        throw error;
      }
    }
    Object.freeze(this);
  }

  #host(): ArenaThreeModeAuthoritativePlayableHostCandidateV1 {
    const host = this.#ownedHost();
    if (this.#settlementIntentJournalFailure !== null) {
      throw this.#settlementIntentJournalFailure;
    }
    if (this.#learningSettlementRecoveryOwner.getRead().retryRequired) {
      throw new Error('Arena Learning结算仍待恢复；当前只允许只读结果与显式恢复。');
    }
    return host;
  }

  #assertBusinessOpen(operation: string): void {
    if (this.#synchronousReentryFailure !== null) {
      throw this.#synchronousReentryFailure;
    }
    if (this.#cleanupStarted) {
      throw new Error(`${operation}拒绝已开始清理的本地Playable Host。`);
    }
    if (this.#learningSettlementFinalizationActive) {
      throw new Error('Arena Learning结算后处理期间不能重入本地Playable Host。');
    }
    if (this.#retentionObservationCollectionActive) {
      throw new Error('Arena留存观察提交期间不能重入本地Playable Host。');
    }
    if (this.#indeterminateMatchStartFailure !== null) {
      throw this.#indeterminateMatchStartFailure;
    }
  }

  #beginOperation(operation: ArenaThreeModeLocalPlayableHostOperationCandidateV1): void {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        `Arena three-mode local playable host拒绝${this.#operation}期间同步重入${operation}。`,
      );
      throw this.#reentryError;
    }
    this.#operation = operation;
    this.#reentryError = null;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        `Arena three-mode local playable host拒绝${this.#operation}期间同步重入${operation}。`,
      );
      throw this.#reentryError;
    }
  }

  #failSwallowedReentry(
    operation: ArenaThreeModeLocalPlayableHostOperationCandidateV1,
    cause?: unknown,
  ): never {
    const reentryError = this.#reentryError
      ?? new Error(`Arena three-mode local playable host ${operation}期间发生同步重入。`);
    const errors: unknown[] = [reentryError];
    if (cause !== undefined && cause !== reentryError) errors.push(cause);
    const failure = new AggregateError(
      errors,
      `Arena three-mode local playable host ${operation}发生被子Owner吞掉的重入；业务已关闭并保留清理所有权。`,
    );
    this.#synchronousReentryFailure = failure;
    throw failure;
  }

  #runOperation<T>(
    operation: ArenaThreeModeLocalPlayableHostOperationCandidateV1,
    action: () => T,
  ): T {
    this.#beginOperation(operation);
    const reentrySequence = this.#reentrySequence;
    try {
      let result: T;
      try {
        if (operation !== 'destroy'
          && (this.#pendingCatalogRetentionWorkBatch !== null
            || this.#pendingSettlementRetentionWorkBatch !== null)) {
          const workCompleted = this.#retryPendingRetentionWorkBatches();
          if (this.#reentrySequence !== reentrySequence) {
            return this.#failSwallowedReentry(
              operation,
              this.#lastRetentionObservationError,
            );
          }
          if (!workCompleted
            || this.#pendingCatalogRetentionWorkBatch !== null
            || this.#pendingSettlementRetentionWorkBatch !== null) {
            throw this.#lastRetentionObservationError
              ?? new Error('Arena留存工作批未排空，本次业务操作失败关闭。');
          }
        }
        if (operation !== 'destroy' && this.#pendingNextGoalCaptureDebt !== null) {
          const captureCompleted = this.#captureNextGoalImpression();
          if (this.#reentrySequence !== reentrySequence) {
            return this.#failSwallowedReentry(
              operation,
              this.#lastRetentionObservationError,
            );
          }
          if (!captureCompleted || this.#pendingNextGoalCaptureDebt !== null) {
            throw this.#lastRetentionObservationError
              ?? new Error('Arena下一学习目标捕获债务未收敛，本次业务操作失败关闭。');
          }
          const catalogCompleted = this.#collectCatalogImpressionForCurrentScreen();
          if (this.#reentrySequence !== reentrySequence) {
            return this.#failSwallowedReentry(
              operation,
              this.#lastRetentionObservationError,
            );
          }
          if (!catalogCompleted
            || this.#pendingCatalogRetentionWorkBatch !== null
            || this.#pendingSettlementRetentionWorkBatch !== null) {
            throw this.#lastRetentionObservationError
              ?? new Error('Arena下一目标捕获后的目录留存机会未提交，本次业务失败关闭。');
          }
        }
        if (operation !== 'destroy' && this.#pendingRetentionActionRetry !== null) {
          const actionCompleted = this.#retryPendingRetentionAction();
          if (this.#reentrySequence !== reentrySequence) {
            return this.#failSwallowedReentry(
              operation,
              this.#lastRetentionObservationError,
            );
          }
          if (!actionCompleted || this.#pendingRetentionActionRetry !== null) {
            throw this.#lastRetentionObservationError
              ?? new Error('Arena next/home留存动作未提交，本次业务操作失败关闭。');
          }
          const catalogCompleted = this.#collectCatalogImpressionForCurrentScreen();
          if (this.#reentrySequence !== reentrySequence) {
            return this.#failSwallowedReentry(
              operation,
              this.#lastRetentionObservationError,
            );
          }
          if (!catalogCompleted
            || this.#pendingCatalogRetentionWorkBatch !== null
            || this.#pendingSettlementRetentionWorkBatch !== null) {
            throw this.#lastRetentionObservationError
              ?? new Error('Arena next/home动作后的目录留存机会未提交，本次业务操作失败关闭。');
          }
        }
        result = action();
        rejectAsynchronousSelectionValue(
          result,
          `three-mode local playable host ${operation}`,
        );
      } catch (error) {
        if (this.#reentrySequence !== reentrySequence) {
          return this.#failSwallowedReentry(operation, error);
        }
        throw error;
      }
      if (this.#reentrySequence !== reentrySequence) {
        return this.#failSwallowedReentry(operation);
      }
      return result;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
  }

  #ownedHost(): ArenaThreeModeAuthoritativePlayableHostCandidateV1 {
    this.#assertBusinessOpen('Arena three-mode local playable host读取');
    if (this.#playableHost === null || this.#destroyed) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    return this.#playableHost;
  }

  #readHost(): ArenaThreeModeAuthoritativePlayableHostCandidateV1 {
    this.#assertNoOperation('Arena three-mode local playable host读取');
    return this.#ownedHost();
  }

  #failIndeterminateMatchStart(
    baseline: unknown | null,
    cause: unknown,
  ): never {
    const failure = new Error(
      'Arena开局结果不确定，已保留Learning基线并失败关闭；仅允许销毁。',
    );
    failure.cause = cause;
    if (baseline !== null) {
      this.#learningSettlementRecoveryOwner.retainIndeterminateMatchStartBaseline(
        baseline,
        failure,
      );
    }
    this.#indeterminateMatchStartFailure = failure;
    throw failure;
  }

  #acknowledgeSettlementIntent(rewardGrantId: string, learningGrantId: string): void {
    try {
      this.#learningSettlementIntentJournal.acknowledge({
        rewardGrantId,
        learningGrantId,
      });
      this.#settlementIntentJournalFailure = null;
      this.#settlementRestartReason = null;
    } catch (cause) {
      const failure = new Error(
        'Arena结算已完成但持久意图确认失败；已失败关闭，需销毁后由下次启动恢复。',
        { cause },
      );
      this.#settlementIntentJournalFailure = failure;
      this.#settlementRestartReason = 'journal-acknowledgement';
      throw failure;
    }
  }

  #failSettlementRecovery(error: unknown): never {
    try {
      this.#destroyOwnedResources();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Arena结算恢复失败关闭且清理不完整。',
      );
    }
    throw error;
  }

  #handlePendingSettlementFailure(error: unknown): never {
    const recovery = this.#learningSettlementRecoveryOwner.getRead();
    if (!recovery.retryRequired) return this.#failSettlementRecovery(error);
    const disposition = resolveArenaV2ProfilePersistenceDispositionCandidateV1(error);
    if (disposition === 'fail-closed') {
      return this.#failSettlementRecovery(error);
    }
    this.#learningSettlementRecoveryOwner.retainPendingSettlementFailure(error);
    throw error;
  }

  #learningProfileSnapshotFromCurrentOwner(): ReturnType<
    ArenaV2ProfileServicesOwnerCandidateV1['learningProfileService']['getSnapshot']
  > {
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    return this.#profileOwner.learningProfileService.state === 'failed'
      ? this.#profileOwner.learningProfileService.getLastKnownSnapshot()
      : this.#profileOwner.learningProfileService.getSnapshot();
  }

  #rewardProfileSnapshotFromCurrentOwner(): ReturnType<
    ArenaV2ProfileServicesOwnerCandidateV1['rewardProfileService']['getSnapshot']
  > {
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    return this.#profileOwner.rewardProfileService.state === 'failed'
      ? this.#profileOwner.rewardProfileService.getLastKnownSnapshot()
      : this.#profileOwner.rewardProfileService.getSnapshot();
  }

  #activeRegistryBinding(): ArenaThreeModeRegistryBindingCandidateV1 | null {
    this.#assertBusinessOpen('Arena three-mode local playable host Registry读取');
    return this.#activeRegistryBindingFromCurrentOwner();
  }

  #activeRegistryBindingFromCurrentOwner(): ArenaThreeModeRegistryBindingCandidateV1 | null {
    if (this.#registryRead === null) return null;
    return registryBinding(rejectAsynchronousSelectionValue(
      this.#registryRead(),
      'registryReference.read',
    ));
  }

  #resolveNextLearningGoal(
    profile: unknown,
  ): ReturnType<typeof resolveArenaV2NextLearningGoalV1> {
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    const activeRegistry = this.#activeRegistryBinding();
    return this.#resolveNextLearningGoalWithWeaponScope(
      profile,
      activeRegistry === null
        ? null
        : activeRegistry.collectionEquipmentDefinitionIds,
    );
  }

  #resolveNextLearningGoalWithWeaponScope(
    profile: unknown,
    eligibleWeaponDefinitionIds: readonly string[] | null,
  ): ReturnType<typeof resolveArenaV2NextLearningGoalV1> {
    return resolveArenaV2NextLearningGoalV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      profile,
      ...(eligibleWeaponDefinitionIds === null
        ? {}
        : { eligibleWeaponDefinitionIds }),
    });
  }

  #nextLearningGoal(): ReturnType<typeof resolveArenaV2NextLearningGoalV1> {
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    return this.#resolveNextLearningGoal(
      this.#profileOwner.learningProfileService.getSnapshot(),
    );
  }

  #nextLearningGoalContinuationRouteReadFromLearningRead(
    learningRead: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1,
  ): Readonly<{
    readonly continuation: ArenaV2NextLearningGoalContinuationRouteV1;
    readonly fullCatalogReplayCombination: ReturnType<
      typeof projectArenaV2FullCatalogReplayCombinationV1
    >;
    readonly eligibleWeaponDefinitionIds: readonly string[] | null;
    readonly profileRevision: number;
  }> {
    const nextGoal = this.#resolveNextLearningGoalWithWeaponScope(
      learningRead.profile,
      learningRead.eligibleWeaponDefinitionIds,
    );
    return Object.freeze({
      continuation: this.#nextLearningGoalContinuationRoute(nextGoal),
      fullCatalogReplayCombination: this.#fullCatalogReplayCombinationFromLearningRead(
        learningRead,
        nextGoal,
      ),
      eligibleWeaponDefinitionIds: learningRead.eligibleWeaponDefinitionIds,
      profileRevision: nextGoal.profileRevision,
    });
  }

  #fullCatalogReplayCombinationFromLearningRead(
    learningRead: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1,
    nextGoal: ReturnType<typeof resolveArenaV2NextLearningGoalV1>,
  ): ReturnType<typeof projectArenaV2FullCatalogReplayCombinationV1> {
    return projectArenaV2FullCatalogReplayCombinationV1({
      profileDefinition: learningRead.profileDefinition,
      profile: learningRead.profile,
      nextGoal,
      eligibleWeaponDefinitionIds: learningRead.eligibleWeaponDefinitionIds,
      eligibleMapDefinitionIds:
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.map(
          ({ mapDefinitionId }) => mapDefinitionId,
        ),
    });
  }

  #resultNextGoalRouteFitFromRead(
    settlement: ArenaV2LearningSettlementProjectionV1,
    learningRead: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1,
  ): ArenaV2ResultNextGoalRouteFitV1 {
    return resolveArenaV2ResultNextGoalRouteFitV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      profile: learningRead.profile,
      eligibleWeaponDefinitionIds: learningRead.eligibleWeaponDefinitionIds === null
        ? undefined
        : learningRead.eligibleWeaponDefinitionIds,
      selectedWeaponDefinitionId: this.#selectedWeaponDefinitionId,
      selectedMapDefinitionId: this.#selectedMapDefinitionId,
      sourceModeDefinitionId: settlement.sourceModeDefinitionId,
    });
  }

  #nextLearningGoalContinuationRoute(
    nextGoal: ReturnType<typeof resolveArenaV2NextLearningGoalV1>,
  ): ArenaV2NextLearningGoalContinuationRouteV1 {
    return resolveArenaV2NextLearningGoalContinuationRouteV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      nextGoal,
    });
  }

  #resolveHomeNextGoalContinuationNavigationRoute(
    continuation: ArenaV2NextLearningGoalContinuationRouteV1,
    eligibleWeaponDefinitionIds: readonly string[] | null,
    fullCatalogReplayCombination: ReturnType<
      typeof projectArenaV2FullCatalogReplayCombinationV1
    >,
  ): NextGoalNavigationRouteV1 {
    if (fullCatalogReplayCombination !== null) {
      if (continuation.goalId !== ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1
        || continuation.goalKind !== 'catalog-complete'
        || continuation.continuationKind !== 'free-choice') {
        throw new RangeError('Arena首页完整目录复练组合与续玩路由漂移。');
      }
      return Object.freeze({
        goalId: continuation.goalId,
        targetScreenId: 'mode-select' as const,
        selectedModeKind: fullCatalogReplayCombination.modeKind,
        selectedWeaponDefinitionId:
          fullCatalogReplayCombination.survivalWeaponRequiresWorldPickup
            ? null
            : selectedPlayableWeaponDefinitionId(
              fullCatalogReplayCombination.weaponDefinitionId,
            ),
        selectedMapDefinitionId: selectedPlayableMapDefinitionId(
          fullCatalogReplayCombination.mapDefinitionId,
        ),
      });
    }
    let selectedWeaponDefinitionId: string | null = null;
    if (continuation.requiresTargetWeaponSelection) {
      if (continuation.targetWeaponDefinitionId === null) {
        throw new RangeError('Arena首页下一局建议缺少必须预选的武器身份。');
      }
      selectedWeaponDefinitionId = selectedPlayableWeaponDefinitionId(
        continuation.targetWeaponDefinitionId,
      );
    }
    if (selectedWeaponDefinitionId !== null) {
      if (eligibleWeaponDefinitionIds !== null
        && !eligibleWeaponDefinitionIds.includes(selectedWeaponDefinitionId)) {
        throw new RangeError('Arena首页下一局建议武器尚未进入active Registry。');
      }
    }
    let selectedMapDefinitionId: string | null = null;
    if (continuation.requiresTargetMapSelection) {
      if (continuation.targetMapDefinitionId === null) {
        throw new RangeError('Arena首页下一局建议缺少必须预选的地图身份。');
      }
      selectedMapDefinitionId = selectedPlayableMapDefinitionId(
        continuation.targetMapDefinitionId,
      );
    }
    if (continuation.targetWeaponRequiresWorldPickup
      && selectedWeaponDefinitionId !== null) {
      throw new RangeError('Arena首页生存续玩路由不得预选目标武器。');
    }
    return Object.freeze({
      goalId: continuation.goalId,
      targetScreenId: 'mode-select' as const,
      selectedModeKind: continuation.recommendedModeKind,
      selectedWeaponDefinitionId,
      selectedMapDefinitionId,
    });
  }

  #assertRenderedHomeContinuationRouteIdentity(
    value: unknown,
    continuation: ArenaV2NextLearningGoalContinuationRouteV1 | null,
  ): void {
    const name = 'Arena local playable首页续玩路由预期';
    const source = assertPlainRecord(value, name);
    const keys = [
      'expectedHomeContinuationGoalId',
      'expectedHomeContinuationKind',
      'expectedHomeContinuationModeDefinitionId',
      'expectedHomeContinuationModeKind',
      'expectedHomeContinuationTargetWeaponDefinitionId',
      'expectedHomeContinuationTargetMapDefinitionId',
    ] as const;
    const descriptors = keys.map((key) => Object.getOwnPropertyDescriptor(source, key));
    if (descriptors.every((descriptor) => descriptor === undefined)) return;
    if (continuation === null
      || descriptors.some((descriptor) => descriptor === undefined
        || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))) {
      throw new TypeError('Arena首页续玩路由预期必须在首页主动作完整提供。');
    }
    const [goalId, continuationKind, modeDefinitionId, modeKind,
      weaponDefinitionId, mapDefinitionId] =
      descriptors.map((descriptor) => descriptor!.value);
    if (goalId !== continuation.goalId
      || continuationKind !== continuation.continuationKind
      || modeDefinitionId !== continuation.recommendedModeDefinitionId
      || modeKind !== continuation.recommendedModeKind
      || weaponDefinitionId !== continuation.targetWeaponDefinitionId
      || mapDefinitionId !== continuation.targetMapDefinitionId) {
      throw new RangeError('Arena首页已渲染的下一局建议与点击时续玩路由发生漂移。');
    }
  }

  #assertRenderedHomeReplayCombinationIdentity(
    value: unknown,
    combination: ReturnType<typeof projectArenaV2FullCatalogReplayCombinationV1>,
  ): void {
    const name = 'Arena local playable首页复练组合预期';
    const source = assertPlainRecord(value, name);
    const keys = [
      'expectedHomeReplayProfileRevision',
      'expectedHomeReplayModeDefinitionId',
      'expectedHomeReplayModeKind',
      'expectedHomeReplayWeaponDefinitionId',
      'expectedHomeReplayWeaponRotationOrdinal',
      'expectedHomeReplayEligibleWeaponCount',
      'expectedHomeReplayMapDefinitionId',
      'expectedHomeReplayMapRotationOrdinal',
      'expectedHomeReplayMapCount',
      'expectedHomeReplayCycleLength',
      'expectedHomeReplaySurvivalWeaponRequiresWorldPickup',
    ] as const;
    const descriptors = keys.map((key) => Object.getOwnPropertyDescriptor(source, key));
    if (descriptors.every((descriptor) => descriptor === undefined)) return;
    if (combination === null
      || descriptors.some((descriptor) => descriptor === undefined
        || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))) {
      throw new TypeError('Arena首页复练组合预期必须完整提供。');
    }
    const expected = descriptors.map((descriptor) => descriptor!.value);
    const actual = [
      combination.profileRevision,
      combination.modeDefinitionId,
      combination.modeKind,
      combination.weaponDefinitionId,
      combination.weaponRotationOrdinal,
      combination.eligibleWeaponCount,
      combination.mapDefinitionId,
      combination.mapRotationOrdinal,
      combination.mapCount,
      combination.weaponMapRotationCycleLength,
      combination.survivalWeaponRequiresWorldPickup,
    ];
    if (expected.some((entry, index) => !Object.is(entry, actual[index]))) {
      throw new RangeError('Arena首页已渲染的完整目录复练组合与点击时权威组合发生漂移。');
    }
  }

  getInformationResultPrimaryRecommendation(): ResultPrimaryRecommendationV1 {
    const information = this.#readHost().getInformationSnapshot();
    const fallback = this.#resultPrimaryRecommendationFallback();
    if (information.state !== 'result') return fallback;
    const settlement = this.#learningSettlementRecoveryOwner.getSettlement();
    if (settlement === null) return fallback;
    return this.#projectInformationResultPrimaryRecommendationFromRead(
      settlement,
      this.#resultNextGoalRouteFitFromRead(
        settlement,
        this.#informationLearningProfileReadFromCurrentOwners(),
      ),
    );
  }

  #resultPrimaryRecommendationFallback(): ResultPrimaryRecommendationV1 {
    return Object.freeze({
      kind: 'play-again' as const,
      decision: 'play-again' as const,
      goalId: null,
      targetScreenId: null,
      targetModeKind: null,
      playAgainFitKind: null,
      nextWeaponDefinitionId: null,
      nextWeaponDisplayName: null,
      nextMapDefinitionId: null,
      nextMapDisplayName: null,
    });
  }

  #projectInformationResultPrimaryRecommendationFromRead(
    settlement: ArenaV2LearningSettlementProjectionV1,
    routeFit: ArenaV2ResultNextGoalRouteFitV1,
  ): ResultPrimaryRecommendationV1 {
    const fallback = this.#resultPrimaryRecommendationFallback();
    const nextGoal = routeFit.nextGoal;
    if (settlement.researchedWeaponDefinitionId !== null
      && settlement.newlyCollectedWeaponDefinitionIds.length === 1
      && settlement.newlyCollectedWeaponDefinitionIds[0]
        === settlement.researchedWeaponDefinitionId
      && nextGoal.kind === 'collect-weapon'
      && nextGoal.weaponDefinitionId !== null
      && nextGoal.weaponDefinitionId !== settlement.researchedWeaponDefinitionId) {
      const nextWeaponDefinitionId = selectedPlayableWeaponDefinitionId(
        nextGoal.weaponDefinitionId,
      );
      if (routeFit.eligibleWeaponDefinitionIds !== null
        && !routeFit.eligibleWeaponDefinitionIds.includes(nextWeaponDefinitionId)) {
        throw new RangeError('Arena结果页推荐的下一把武器尚未进入active Registry。');
      }
      const route = this.#resolveNextGoalNavigationRoute(routeFit);
      return Object.freeze({
        goalId: route.goalId,
        targetScreenId: route.targetScreenId,
        targetModeKind: route.selectedModeKind,
        playAgainFitKind: null,
        kind: 'next-weapon' as const,
        decision: 'next-goal' as const,
        nextWeaponDefinitionId,
        nextWeaponDisplayName: selectedWeaponDisplayName(nextWeaponDefinitionId),
        nextMapDefinitionId: null,
        nextMapDisplayName: null,
      });
    }
    if (settlement.newlyCollectedMapDefinitionIds.length === 1
      && settlement.newlyCollectedMapDefinitionIds[0] === this.#selectedMapDefinitionId
      && nextGoal.kind === 'collect-map'
      && nextGoal.mapDefinitionId !== null
      && nextGoal.mapDefinitionId !== this.#selectedMapDefinitionId) {
      const nextMapDefinitionId = selectedPlayableMapDefinitionId(nextGoal.mapDefinitionId);
      const route = this.#resolveNextGoalNavigationRoute(routeFit);
      return Object.freeze({
        goalId: route.goalId,
        targetScreenId: route.targetScreenId,
        targetModeKind: route.selectedModeKind,
        playAgainFitKind: null,
        kind: 'next-map' as const,
        decision: 'next-goal' as const,
        nextWeaponDefinitionId: null,
        nextWeaponDisplayName: null,
        nextMapDefinitionId,
        nextMapDisplayName: selectedMapDisplayName(nextMapDefinitionId),
      });
    }
    if (routeFit.defaultResultDecision === 'next-goal') {
      const route = this.#resolveDefaultGoalAlignedPreparationRoute(routeFit);
      return Object.freeze({
        goalId: route.goalId,
        targetScreenId: route.targetScreenId,
        targetModeKind: route.selectedModeKind,
        playAgainFitKind: null,
        kind: 'prepare-next-goal' as const,
        decision: 'next-goal' as const,
        nextWeaponDefinitionId: route.selectedWeaponDefinitionId,
        nextWeaponDisplayName: route.selectedWeaponDefinitionId === null
          ? null
          : selectedWeaponDisplayName(route.selectedWeaponDefinitionId),
        nextMapDefinitionId: route.selectedMapDefinitionId,
        nextMapDisplayName: route.selectedMapDefinitionId === null
          ? null
          : selectedMapDisplayName(route.selectedMapDefinitionId),
      });
    }
    if (routeFit.kind === 'stable-current-combination'
      || routeFit.kind === 'conditional-survival-supply') {
      return Object.freeze({
        kind: 'play-again' as const,
        decision: 'play-again' as const,
        goalId: nextGoal.goalId,
        targetScreenId: null,
        targetModeKind: routeFit.recommendedModeKind,
        playAgainFitKind: routeFit.kind,
        nextWeaponDefinitionId: routeFit.targetWeaponDefinitionId,
        nextWeaponDisplayName: routeFit.targetWeaponDefinitionId === null
          ? null
          : selectedWeaponDisplayName(routeFit.targetWeaponDefinitionId),
        nextMapDefinitionId: routeFit.targetMapDefinitionId,
        nextMapDisplayName: routeFit.targetMapDefinitionId === null
          ? null
          : selectedMapDisplayName(routeFit.targetMapDefinitionId),
      });
    }
    return fallback;
  }

  #projectInformationResultNewCollectionDetailItemsFromRead(
    settlement: ArenaV2LearningSettlementProjectionV1,
    learningRead: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1,
  ): ResultNewCollectionDetailItemsV1 {
    if (settlement.status !== 'committed') return Object.freeze([]);
    const eligibleWeaponDefinitionIds = learningRead.eligibleWeaponDefinitionIds;
    const ordered = orderArenaV2NewCollectionDefinitionIdsV1(
      learningRead.profileDefinition,
      settlement.newlyCollectedWeaponDefinitionIds,
      settlement.newlyCollectedMapDefinitionIds,
    );
    return Object.freeze([
      ...ordered.weaponDefinitionIds
        .filter((definitionId) => (
          eligibleWeaponDefinitionIds === null
          || eligibleWeaponDefinitionIds.includes(definitionId)
        ))
        .map((definitionId) => Object.freeze({
          kind: 'weapon' as const,
          definitionId: selectedPlayableWeaponDefinitionId(definitionId),
          displayName: selectedWeaponDisplayName(definitionId),
        })),
      ...ordered.mapDefinitionIds
        .map((mapDefinitionId) => Object.freeze({
          kind: 'map' as const,
          definitionId: selectedPlayableMapDefinitionId(mapDefinitionId),
          displayName: selectedMapDisplayName(mapDefinitionId),
        })),
    ]);
  }

  getInformationResultNextGoalRecommendation(): ResultPrimaryRecommendationV1 {
    const information = this.#readHost().getInformationSnapshot();
    const settlement = this.#learningSettlementRecoveryOwner.getSettlement();
    if (information.state !== 'result' || settlement === null) {
      return this.#resultNextGoalRecommendationFallback();
    }
    return this.#projectInformationResultNextGoalRecommendationFromRead(
      this.#resultNextGoalRouteFitFromRead(
        settlement,
        this.#informationLearningProfileReadFromCurrentOwners(),
      ),
    );
  }

  #resultNextGoalRecommendationFallback(): ResultPrimaryRecommendationV1 {
    return Object.freeze({
      kind: 'next-goal' as const,
      decision: 'next-goal' as const,
      goalId: null,
      targetScreenId: null,
      targetModeKind: null,
      playAgainFitKind: null,
      nextWeaponDefinitionId: null,
      nextWeaponDisplayName: null,
      nextMapDefinitionId: null,
      nextMapDisplayName: null,
    });
  }

  #projectInformationResultNextGoalRecommendationFromRead(
    routeFit: ArenaV2ResultNextGoalRouteFitV1,
  ): ResultPrimaryRecommendationV1 {
    const route = this.#resolveNextGoalNavigationRoute(routeFit);
    return Object.freeze({
      kind: 'next-goal' as const,
      decision: 'next-goal' as const,
      goalId: route.goalId,
      targetScreenId: route.targetScreenId,
      targetModeKind: route.selectedModeKind,
      playAgainFitKind: null,
      nextWeaponDefinitionId: route.selectedWeaponDefinitionId,
      nextWeaponDisplayName: route.selectedWeaponDefinitionId === null
        ? null
        : selectedWeaponDisplayName(route.selectedWeaponDefinitionId),
      nextMapDefinitionId: route.selectedMapDefinitionId,
      nextMapDisplayName: route.selectedMapDefinitionId === null
        ? null
        : selectedMapDisplayName(route.selectedMapDefinitionId),
    });
  }

  #createRetentionObservation(
    fields: RetentionObservationFieldsV1,
    collector: ArenaThreeModeAuthoritativeLocalRetentionObservationCollectorCandidateV1,
    eventSequence: number,
  ): ArenaV2RetentionObservationV1 {
    if (this.#profileOwner === null) {
      throw new Error('Arena留存观察提交期间Profile owner已销毁。');
    }
    const profile = this.#profileOwner.learningProfileService.getSnapshot();
    if (fields.expectedProfileRevision !== null
      && profile.revision !== fields.expectedProfileRevision) {
      throw new RangeError('Arena留存观察的冻结机会与当前Profile revision漂移。');
    }
    return this.#createRetentionObservationForProfileRevision(
      fields,
      collector,
      eventSequence,
      profile.revision,
    );
  }

  #createRetentionObservationForProfileRevision(
    fields: RetentionObservationFieldsV1,
    collector: ArenaThreeModeAuthoritativeLocalRetentionObservationCollectorCandidateV1,
    eventSequence: number,
    profileRevision: number,
  ): ArenaV2RetentionObservationV1 {
    return createArenaV2RetentionObservationV1({
      schemaVersion: 1,
      status: 'production-unreachable',
      hardGate: false,
      defaultSinkWired: false,
      eventId: `arena-v2.${fields.kind}.${collector.sessionSequence}.${eventSequence}`,
      cohortSubjectId: collector.cohortSubjectId,
      sessionSequence: collector.sessionSequence,
      eventSequence,
      profileRevision,
      authorityTick: fields.authorityTick,
      kind: fields.kind,
      weaponDefinitionIds: fields.weaponDefinitionIds,
      mapDefinitionIds: fields.mapDefinitionIds,
      modeDefinitionIds: fields.modeDefinitionIds,
      goalId: fields.goalId,
      repeatOrdinal: fields.repeatOrdinal,
      effectiveLearningProgress: fields.effectiveLearningProgress,
      goalSelected: fields.goalSelected,
    });
  }

  #submitRetentionActionObservation(
    fields: RetentionObservationFieldsV1,
    nextGoalImpression: PendingNextGoalImpressionV1 | null,
    homeContinuationFollow: PendingHomeContinuationFollowObservationV1 | null,
  ): boolean {
    if (this.#pendingRetentionActionRetry !== null
      || this.#pendingCatalogRetentionWorkBatch !== null
      || this.#pendingSettlementRetentionWorkBatch !== null
      || this.#pendingNextGoalCaptureDebt !== null) return false;
    const collector = this.#retentionObservationCollector;
    if (collector === null || this.#profileOwner === null) return false;
    if (this.#retentionObservationCollectionActive) {
      this.#lastRetentionObservationError = new Error('Arena留存观察提交禁止重入。');
      return false;
    }
    const eventSequence = this.#retentionObservationEventSequence + 1;
    if (!Number.isSafeInteger(eventSequence)) {
      this.#lastRetentionObservationError = new RangeError('Arena留存观察事件序号溢出。');
      return false;
    }
    const callbackBoundary = this.#captureRetentionCallbackBoundary();
    const pendingFields = Object.freeze({
      fields: this.#freezeRetentionObservationFields(fields),
      observation: null,
      nextGoalImpression,
      homeContinuationFollow,
    });
    this.#pendingRetentionActionRetry = pendingFields;
    this.#retentionObservationCollectionActive = true;
    try {
      const observation = this.#createRetentionObservation(
        pendingFields.fields,
        collector,
        eventSequence,
      );
      this.#assertRetentionCallbackBoundary(callbackBoundary);
      const pending = Object.freeze({
        fields: pendingFields.fields,
        observation,
        nextGoalImpression,
        homeContinuationFollow,
      });
      if (this.#pendingRetentionActionRetry !== pendingFields) {
        throw new Error('Arena待提交留存动作在observation创建期间发生身份漂移。');
      }
      this.#pendingRetentionActionRetry = pending;
      collector.collect(observation);
      this.#assertRetentionCallbackBoundary(callbackBoundary);
      this.#commitPendingRetentionAction(pending);
      return true;
    } catch (error) {
      this.#lastRetentionObservationError = error;
      if (this.#operation !== callbackBoundary.operation
        || this.#reentrySequence !== callbackBoundary.reentrySequence) {
        throw error;
      }
      return false;
    } finally {
      this.#retentionObservationCollectionActive = false;
    }
  }

  #retryPendingRetentionAction(): boolean {
    const capturedPending = this.#pendingRetentionActionRetry;
    if (capturedPending === null) return true;
    const collector = this.#retentionObservationCollector;
    if (collector === null || this.#profileOwner === null) return false;
    if (this.#retentionObservationCollectionActive) {
      this.#lastRetentionObservationError = new Error('Arena留存观察提交禁止重入。');
      return false;
    }
    const eventSequence = this.#retentionObservationEventSequence + 1;
    if (!Number.isSafeInteger(eventSequence)) {
      this.#lastRetentionObservationError = new RangeError('Arena留存观察事件序号溢出。');
      return false;
    }
    if (capturedPending.observation !== null
      && capturedPending.observation.eventSequence !== eventSequence) {
      this.#lastRetentionObservationError = new RangeError(
        'Arena待重试留存动作的事件序号已被后续观察越过。',
      );
      return false;
    }
    const callbackBoundary = this.#captureRetentionCallbackBoundary();
    this.#retentionObservationCollectionActive = true;
    try {
      let pending = capturedPending;
      let observation = pending.observation;
      if (observation === null) {
        observation = this.#createRetentionObservation(
          pending.fields,
          collector,
          eventSequence,
        );
        this.#assertRetentionCallbackBoundary(callbackBoundary);
        const prepared = Object.freeze({
          ...pending,
          observation,
        });
        if (this.#pendingRetentionActionRetry !== pending) {
          throw new Error('Arena待重试留存动作在observation创建期间发生身份漂移。');
        }
        this.#pendingRetentionActionRetry = prepared;
        pending = prepared;
      }
      collector.collect(observation);
      this.#assertRetentionCallbackBoundary(callbackBoundary);
      this.#commitPendingRetentionAction(pending);
      return true;
    } catch (error) {
      this.#lastRetentionObservationError = error;
      if (this.#operation !== callbackBoundary.operation
        || this.#reentrySequence !== callbackBoundary.reentrySequence) {
        throw error;
      }
      return false;
    } finally {
      this.#retentionObservationCollectionActive = false;
    }
  }

  #commitPendingRetentionAction(pending: PendingRetentionActionRetryV1): void {
    if (this.#pendingRetentionActionRetry !== pending) {
      throw new Error('Arena待重试留存动作在Collector返回前发生身份漂移。');
    }
    const observation = pending.observation;
    if (observation === null) {
      throw new Error('Arena待提交留存动作缺少已规范化observation。');
    }
    if (observation.eventSequence !== this.#retentionObservationEventSequence + 1) {
      throw new RangeError('Arena待提交留存动作的事件序号不再连续。');
    }
    this.#retentionObservationEventSequence = observation.eventSequence;
    this.#lastRetentionObservation = observation;
    this.#lastRetentionObservationError = null;
    this.#pendingRetentionActionRetry = null;
    if (pending.nextGoalImpression !== null
      && this.#pendingNextGoalImpression === pending.nextGoalImpression) {
      this.#pendingNextGoalImpression = null;
    }
    if (pending.homeContinuationFollow !== null
      && this.#pendingHomeContinuationFollowObservation === pending.homeContinuationFollow) {
      this.#pendingHomeContinuationFollowObservation = null;
    }
  }

  #freezeRetentionObservationFields(
    fields: RetentionObservationFieldsV1,
  ): RetentionObservationFieldsV1 {
    return Object.freeze({
      ...fields,
      weaponDefinitionIds: Object.freeze([...fields.weaponDefinitionIds]),
      mapDefinitionIds: Object.freeze([...fields.mapDefinitionIds]),
      modeDefinitionIds: Object.freeze([...fields.modeDefinitionIds]),
    });
  }

  #captureRetentionCallbackBoundary(): Readonly<{
    operation: ArenaThreeModeLocalPlayableHostOperationCandidateV1;
    reentrySequence: number;
  }> {
    if (this.#operation === null) {
      throw new Error('Arena留存观察只能在本地Playable Host业务事务内提交。');
    }
    return Object.freeze({
      operation: this.#operation,
      reentrySequence: this.#reentrySequence,
    });
  }

  #assertRetentionCallbackBoundary(boundary: Readonly<{
    operation: ArenaThreeModeLocalPlayableHostOperationCandidateV1;
    reentrySequence: number;
  }>): void {
    if (this.#operation !== boundary.operation
      || this.#reentrySequence !== boundary.reentrySequence) {
      throw this.#reentryError
        ?? new Error('Arena留存观察外部回调期间发生被吞掉的本地Host重入。');
    }
  }

  #pendingRetentionWorkBatch(
    source: PendingRetentionWorkBatchV1['source'],
  ): PendingRetentionWorkBatchV1 | null {
    return source === 'catalog'
      ? this.#pendingCatalogRetentionWorkBatch
      : this.#pendingSettlementRetentionWorkBatch;
  }

  #replacePendingRetentionWorkBatch(
    expected: PendingRetentionWorkBatchV1,
    replacement: PendingRetentionWorkBatchV1 | null,
  ): void {
    if (this.#pendingRetentionWorkBatch(expected.source) !== expected) {
      throw new Error('Arena留存工作批在提交期间发生身份漂移。');
    }
    if (expected.source === 'catalog') {
      this.#pendingCatalogRetentionWorkBatch = replacement;
    } else {
      this.#pendingSettlementRetentionWorkBatch = replacement;
    }
  }

  #materializePreparedRetentionObservation(
    prepared: PreparedRetentionObservationV1,
    collector: ArenaThreeModeAuthoritativeLocalRetentionObservationCollectorCandidateV1,
    eventSequence: number,
    profileRevision: number,
  ): ArenaV2RetentionObservationV1 {
    if (prepared.kind === 'generic') {
      if (prepared.fields.expectedProfileRevision !== null
        && prepared.fields.expectedProfileRevision !== profileRevision) {
        throw new RangeError('Arena留存工作批的Profile revision在观察物化前漂移。');
      }
      return this.#createRetentionObservationForProfileRevision(
        prepared.fields,
        collector,
        eventSequence,
        profileRevision,
      );
    }
    if (prepared.profileRevision !== profileRevision) {
      throw new RangeError('Arena学习焦点留存工作批与当前Profile revision漂移。');
    }
    if (prepared.kind === 'weapon-focus') {
      return createArenaV2WeaponResearchFocusContinuationObservationV1({
        schemaVersion: 1,
        status: 'production-unreachable',
        hardGate: false,
        defaultSinkWired: false,
        eventId: `arena-v2.weapon-research-focus.${collector.sessionSequence}.${eventSequence}`,
        cohortSubjectId: collector.cohortSubjectId,
        sessionSequence: collector.sessionSequence,
        eventSequence,
        profileRevision,
        authorityTick: prepared.authorityTick,
        previousGoalId: prepared.focus.goalId,
        previousGoalProfileRevision: prepared.focus.profileRevision,
        previousGoalKind: prepared.focus.goalKind,
        previousGoalWeaponDefinitionId: prepared.focus.weaponDefinitionId,
        previousGoalContext: prepared.focus.context,
        progressedWeaponDefinitionId: prepared.progressedWeaponDefinitionId,
        progressedContext: prepared.progressedContext,
      });
    }
    return createArenaV2MapLearningFocusContinuationObservationV1({
      schemaVersion: 1,
      status: 'production-unreachable',
      hardGate: false,
      defaultSinkWired: false,
      eventId: `arena-v2.map-learning-focus.${collector.sessionSequence}.${eventSequence}`,
      cohortSubjectId: collector.cohortSubjectId,
      sessionSequence: collector.sessionSequence,
      eventSequence,
      profileRevision,
      authorityTick: prepared.authorityTick,
      previousGoalId: prepared.focus.goalId,
      previousGoalProfileRevision: prepared.focus.profileRevision,
      previousGoalKind: prepared.focus.goalKind,
      previousGoalMapDefinitionId: prepared.focus.mapDefinitionId,
      previousGoalSegmentDefinitionId: prepared.focus.segmentDefinitionId,
      progressedMapDefinitionId: prepared.progressedMapDefinitionId,
      progressedSegmentDefinitionId: prepared.progressedSegmentDefinitionId,
    });
  }

  #materializeRetentionWorkBatch(
    batch: PendingRetentionWorkBatchV1,
    collector: ArenaThreeModeAuthoritativeLocalRetentionObservationCollectorCandidateV1,
  ): PendingRetentionWorkBatchV1 {
    if (batch.materializedItems !== null) {
      if (batch.materializedObservations === null
        || batch.materializedObservations.length !== batch.materializedItems.length) {
        throw new Error('Arena留存工作批已物化观察数组身份缺失。');
      }
      return batch;
    }
    if (batch.materializedObservations !== null) {
      throw new Error('Arena留存工作批观察数组先于工作项物化。');
    }
    if (batch.preparedItems.length === 0
      || (batch.source === 'catalog' && batch.preparedItems.length !== 1)
      || (batch.source === 'settlement'
        && batch.preparedItems.length > MAX_SETTLEMENT_RETENTION_WORK_ITEMS_V1)) {
      throw new RangeError('Arena留存工作批数量越界。');
    }
    if (this.#profileOwner === null) {
      throw new Error('Arena留存工作批物化期间Profile owner已销毁。');
    }
    const profile = this.#profileOwner.learningProfileService.getSnapshot();
    if (batch.expectedProfileRevision !== null
      && profile.revision !== batch.expectedProfileRevision) {
      throw new RangeError('Arena留存工作批与当前Profile revision漂移。');
    }
    const finalEventSequence = this.#retentionObservationEventSequence
      + batch.preparedItems.length;
    if (!Number.isSafeInteger(finalEventSequence)) {
      throw new RangeError('Arena留存工作批事件序号溢出。');
    }
    const materializedItems = Object.freeze(batch.preparedItems.map((item, index) => (
      Object.freeze({
        observation: this.#materializePreparedRetentionObservation(
          item.preparedObservation,
          collector,
          this.#retentionObservationEventSequence + index + 1,
          profile.revision,
        ),
        postCommit: item.postCommit,
      })
    )));
    const materialized = Object.freeze({
      ...batch,
      materializedItems,
      materializedObservations: Object.freeze(materializedItems.map(
        ({ observation }) => observation,
      )),
    });
    this.#replacePendingRetentionWorkBatch(batch, materialized);
    return materialized;
  }

  #assertRetentionWorkPostCommitReady(postCommit: RetentionWorkPostCommitV1): void {
    switch (postCommit.kind) {
      case 'none':
        return;
      case 'catalog-impression':
        if ((this.#catalogImpressionOrdinals.get(postCommit.catalogKind) ?? 0)
            !== postCommit.previousOrdinal
          || this.#lastObservedNavigationRevision
            !== postCommit.previousNavigationRevision) {
          throw new RangeError('Arena目录曝光留存工作的ordinal或navigation revision漂移。');
        }
        return;
      case 'content-entry':
        if ((this.#contentEntryOrdinals.get(postCommit.contentKey) ?? 0)
          !== postCommit.previousOrdinal) {
          throw new RangeError('Arena内容进入留存工作的ordinal漂移。');
        }
        return;
      case 'cross-content-used':
        if (!sameOrderedStrings(
          sorted([...this.#usedWeaponDefinitionIds]),
          postCommit.previousWeaponDefinitionIds,
        ) || !sameOrderedStrings(
          sorted([...this.#usedMapDefinitionIds]),
          postCommit.previousMapDefinitionIds,
        )) {
          throw new RangeError('Arena跨内容留存工作的used-set水位漂移。');
        }
        return;
      case 'weapon-focus':
        if (this.#pendingWeaponResearchFocusObservation !== postCommit.focus) {
          throw new RangeError('Arena武器研究焦点在留存提交前漂移。');
        }
        return;
      case 'map-focus':
        if (this.#pendingMapLearningFocusObservation !== postCommit.focus) {
          throw new RangeError('Arena地图学习焦点在留存提交前漂移。');
        }
    }
  }

  #applyRetentionWorkPostCommit(postCommit: RetentionWorkPostCommitV1): void {
    switch (postCommit.kind) {
      case 'none':
        return;
      case 'catalog-impression':
        this.#catalogImpressionOrdinals.set(
          postCommit.catalogKind,
          postCommit.repeatOrdinal,
        );
        this.#lastObservedNavigationRevision = postCommit.navigationRevision;
        return;
      case 'content-entry':
        this.#contentEntryOrdinals.set(postCommit.contentKey, postCommit.repeatOrdinal);
        return;
      case 'cross-content-used':
        this.#usedWeaponDefinitionIds.clear();
        for (const definitionId of postCommit.nextWeaponDefinitionIds) {
          this.#usedWeaponDefinitionIds.add(definitionId);
        }
        this.#usedMapDefinitionIds.clear();
        for (const definitionId of postCommit.nextMapDefinitionIds) {
          this.#usedMapDefinitionIds.add(definitionId);
        }
        return;
      case 'weapon-focus':
        this.#pendingWeaponResearchFocusObservation = null;
        return;
      case 'map-focus':
        this.#pendingMapLearningFocusObservation = null;
    }
  }

  #assertAtomicSettlementRetentionWorkBatchReady(
    batch: PendingRetentionWorkBatchV1,
    items: readonly MaterializedRetentionWorkItemV1[],
  ): readonly ArenaV2RetentionObservationV1[] {
    const observations = batch.materializedObservations;
    if (this.#pendingSettlementRetentionWorkBatch !== batch
      || batch.source !== 'settlement'
      || batch.cursor !== 0
      || observations === null
      || observations.length !== items.length
      || observations.length < 1
      || observations.length > MAX_SETTLEMENT_RETENTION_WORK_ITEMS_V1) {
      throw new RangeError('Arena结算留存原子批身份、游标或数量越界。');
    }
    const contentKeys = new Set<string>();
    let hasCrossContentUsed = false;
    let hasWeaponFocus = false;
    let hasMapFocus = false;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]!;
      const observation = observations[index]!;
      const expectedEventSequence = this.#retentionObservationEventSequence + index + 1;
      if (!Number.isSafeInteger(expectedEventSequence)
        || observation !== item.observation
        || observation.eventSequence !== expectedEventSequence) {
        throw new RangeError('Arena结算留存原子批观察身份或事件序号漂移。');
      }
      this.#assertRetentionWorkPostCommitReady(item.postCommit);
      switch (item.postCommit.kind) {
        case 'none':
          break;
        case 'catalog-impression':
          throw new RangeError('Arena结算留存原子批不得夹带目录曝光后置状态。');
        case 'content-entry':
          if (contentKeys.has(item.postCommit.contentKey)) {
            throw new RangeError('Arena结算留存原子批内容进入后置身份重复。');
          }
          contentKeys.add(item.postCommit.contentKey);
          break;
        case 'cross-content-used':
          if (hasCrossContentUsed) {
            throw new RangeError('Arena结算留存原子批跨内容后置身份重复。');
          }
          hasCrossContentUsed = true;
          break;
        case 'weapon-focus':
          if (hasWeaponFocus) {
            throw new RangeError('Arena结算留存原子批武器焦点后置身份重复。');
          }
          hasWeaponFocus = true;
          break;
        case 'map-focus':
          if (hasMapFocus) {
            throw new RangeError('Arena结算留存原子批地图焦点后置身份重复。');
          }
          hasMapFocus = true;
      }
    }
    return observations;
  }

  #preparePendingNextGoalCaptureDebt(
    batch: PendingRetentionWorkBatchV1,
    observations: readonly ArenaV2RetentionObservationV1[],
  ): PendingNextGoalCaptureDebtV1 | null {
    if (!batch.captureNextGoalAfterCompletion) return null;
    const expectedProfileRevision = batch.expectedProfileRevision;
    if (batch.source !== 'settlement'
      || this.#pendingSettlementRetentionWorkBatch !== batch
      || expectedProfileRevision === null
      || !Number.isSafeInteger(expectedProfileRevision)
      || expectedProfileRevision < 0
      || observations.length === 0
      || observations.length > MAX_SETTLEMENT_RETENTION_WORK_ITEMS_V1) {
      throw new RangeError('Arena下一目标捕获债务的结算工作批身份无效。');
    }
    if (this.#retentionObservationCollector === null || this.#profileOwner === null) {
      throw new Error('Arena下一目标捕获债务缺少Collector或Profile owner。');
    }
    if (this.#pendingNextGoalCaptureDebt !== null
      || this.#pendingNextGoalImpression !== null
      || this.#pendingRetentionActionRetry !== null) {
      throw new Error('Arena下一目标捕获债务不得覆盖旧债务、印象或动作。');
    }
    const first = observations[0]!;
    const latest = observations.at(-1)!;
    const authorityTick = first.authorityTick;
    if (authorityTick === null
      || !Number.isSafeInteger(authorityTick)
      || authorityTick < 0
      || observations.some((observation) => (
        observation.profileRevision !== expectedProfileRevision
        || observation.authorityTick !== authorityTick
      ))) {
      throw new RangeError('Arena下一目标捕获债务的Profile代际或权威tick不一致。');
    }
    const identitySource = Object.freeze({
      settlementWorkIdentity: batch.identity,
      expectedProfileRevision,
      authorityTick,
      lastObservationEventId: latest.eventId,
      lastObservationEventSequence: latest.eventSequence,
    });
    return Object.freeze({
      identity: createDeterministicDataHash(
        identitySource,
        'Arena pending next-goal capture debt',
      ),
      ...identitySource,
      registryScopeStatus: 'pending' as const,
      registryScopeIdentityHash: null,
      registryScope: null,
    });
  }

  #commitAtomicSettlementRetentionWorkBatch(
    batch: PendingRetentionWorkBatchV1,
    items: readonly MaterializedRetentionWorkItemV1[],
    nextGoalCaptureDebt: PendingNextGoalCaptureDebtV1 | null,
  ): void {
    if (this.#pendingSettlementRetentionWorkBatch !== batch
      || batch.cursor !== 0
      || items.length < 1) {
      throw new Error('Arena结算留存原子批提交身份漂移。');
    }
    for (const item of items) this.#applyRetentionWorkPostCommit(item.postCommit);
    const latest = items.at(-1)!.observation;
    this.#retentionObservationEventSequence = latest.eventSequence;
    this.#lastRetentionObservation = latest;
    this.#lastRetentionObservationError = null;
    this.#pendingNextGoalCaptureDebt = nextGoalCaptureDebt;
    this.#pendingSettlementRetentionWorkBatch = null;
  }

  #drainRetentionWorkBatch(source: PendingRetentionWorkBatchV1['source']): boolean {
    const batch = this.#pendingRetentionWorkBatch(source);
    if (batch === null) return true;
    let activeBatch: PendingRetentionWorkBatchV1 = batch;
    if (this.#pendingRetentionActionRetry !== null
      || (source === 'settlement' && this.#pendingCatalogRetentionWorkBatch !== null)) {
      return false;
    }
    const collector = this.#retentionObservationCollector;
    if (collector === null || this.#profileOwner === null) return false;
    if (this.#retentionObservationCollectionActive) {
      this.#lastRetentionObservationError = new Error('Arena留存工作批提交禁止重入。');
      return false;
    }
    const callbackBoundary = this.#captureRetentionCallbackBoundary();
    this.#retentionObservationCollectionActive = true;
    try {
      activeBatch = this.#materializeRetentionWorkBatch(activeBatch, collector);
      this.#assertRetentionCallbackBoundary(callbackBoundary);
      const items = activeBatch.materializedItems!;
      if (source === 'settlement' && activeBatch.cursor === 0
        && collector.collectBatch !== undefined) {
        const observations = this.#assertAtomicSettlementRetentionWorkBatchReady(
          activeBatch,
          items,
        );
        const nextGoalCaptureDebt = this.#preparePendingNextGoalCaptureDebt(
          activeBatch,
          observations,
        );
        collector.collectBatch(observations);
        this.#assertRetentionCallbackBoundary(callbackBoundary);
        this.#commitAtomicSettlementRetentionWorkBatch(
          activeBatch,
          items,
          nextGoalCaptureDebt,
        );
      } else {
        while (activeBatch.cursor < items.length) {
          const item = items[activeBatch.cursor]!;
          if (item.observation.eventSequence
            !== this.#retentionObservationEventSequence + 1) {
            throw new RangeError('Arena留存工作批游标与事件序号不连续。');
          }
          this.#assertRetentionWorkPostCommitReady(item.postCommit);
          const nextCursor = activeBatch.cursor + 1;
          const nextGoalCaptureDebt = nextCursor === items.length
            ? this.#preparePendingNextGoalCaptureDebt(
              activeBatch,
              activeBatch.materializedObservations!,
            )
            : null;
          collector.collect(item.observation);
          this.#assertRetentionCallbackBoundary(callbackBoundary);
          this.#applyRetentionWorkPostCommit(item.postCommit);
          this.#retentionObservationEventSequence = item.observation.eventSequence;
          this.#lastRetentionObservation = item.observation;
          this.#lastRetentionObservationError = null;
          if (nextCursor === items.length) {
            this.#pendingNextGoalCaptureDebt = nextGoalCaptureDebt;
            this.#replacePendingRetentionWorkBatch(activeBatch, null);
            break;
          } else {
            const advanced: PendingRetentionWorkBatchV1 = Object.freeze({
              ...activeBatch,
              cursor: nextCursor,
            });
            this.#replacePendingRetentionWorkBatch(activeBatch, advanced);
            activeBatch = advanced;
          }
        }
      }
    } catch (error) {
      this.#lastRetentionObservationError = error;
      if (this.#operation !== callbackBoundary.operation
        || this.#reentrySequence !== callbackBoundary.reentrySequence) {
        throw error;
      }
      return false;
    } finally {
      this.#retentionObservationCollectionActive = false;
    }
    return true;
  }

  #retryPendingRetentionWorkBatches(): boolean {
    if (this.#pendingNextGoalCaptureDebt !== null
      && (this.#pendingCatalogRetentionWorkBatch !== null
        || this.#pendingSettlementRetentionWorkBatch !== null)) {
      throw new Error('Arena下一目标捕获债务不得与留存工作批并存。');
    }
    if (this.#pendingRetentionActionRetry !== null
      && (this.#pendingCatalogRetentionWorkBatch !== null
        || this.#pendingSettlementRetentionWorkBatch !== null)) {
      throw new Error('Arena留存工作批与next/home动作不得并存。');
    }
    if (!this.#drainRetentionWorkBatch('catalog')) return false;
    return this.#drainRetentionWorkBatch('settlement');
  }

  #collectCatalogImpressionForCurrentScreen(): boolean {
    if (this.#retentionObservationCollector === null) return true;
    if (this.#pendingRetentionActionRetry !== null
      || this.#pendingCatalogRetentionWorkBatch !== null
      || this.#pendingSettlementRetentionWorkBatch !== null
      || this.#pendingNextGoalCaptureDebt !== null) return false;
    const information = this.#host().getInformationSnapshot();
    const revision = information.navigation.revision;
    if (!Number.isSafeInteger(revision) || revision < 0) {
      this.#lastRetentionObservationError = new RangeError(
        'Arena目录曝光navigation revision无效。',
      );
      return false;
    }
    if (this.#lastObservedNavigationRevision !== null) {
      if (revision < this.#lastObservedNavigationRevision) {
        this.#lastRetentionObservationError = new RangeError(
          'Arena目录曝光navigation revision不能回退。',
        );
        return false;
      }
      if (revision === this.#lastObservedNavigationRevision) return true;
    }
    const screenId = information.navigation.currentScreenId;
    const catalogKind = screenId === 'weapon-index'
      ? 'weapons' as const
      : screenId === 'map-index'
        ? 'maps' as const
        : null;
    if (catalogKind === null) {
      this.#lastObservedNavigationRevision = revision;
      return true;
    }
    const previousOrdinal = this.#catalogImpressionOrdinals.get(catalogKind) ?? 0;
    const repeatOrdinal = previousOrdinal + 1;
    if (!Number.isSafeInteger(repeatOrdinal)) {
      this.#lastRetentionObservationError = new RangeError('Arena目录曝光ordinal溢出。');
      return false;
    }
    const fields = this.#freezeRetentionObservationFields({
      kind: 'catalog-first-seen',
      expectedProfileRevision: null,
      weaponDefinitionIds: catalogKind === 'weapons'
        ? ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ equipment }) => equipment.id)
        : Object.freeze([]),
      mapDefinitionIds: catalogKind === 'maps'
        ? ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.mapDefinitions.map(
          ({ mapDefinitionId }) => mapDefinitionId,
        )
        : Object.freeze([]),
      modeDefinitionIds: Object.freeze([]),
      goalId: null,
      repeatOrdinal,
      effectiveLearningProgress: null,
      goalSelected: null,
      authorityTick: null,
    });
    const preparedItem = Object.freeze({
      preparedObservation: Object.freeze({ kind: 'generic' as const, fields }),
      postCommit: Object.freeze({
        kind: 'catalog-impression' as const,
        catalogKind,
        previousOrdinal,
        repeatOrdinal,
        previousNavigationRevision: this.#lastObservedNavigationRevision,
        navigationRevision: revision,
      }),
    });
    const preparedItems = Object.freeze([preparedItem]);
    this.#pendingCatalogRetentionWorkBatch = Object.freeze({
      source: 'catalog' as const,
      identity: createDeterministicDataHash(
        Object.freeze({ source: 'catalog', fields, postCommit: preparedItem.postCommit }),
        'Arena catalog retention work batch',
      ),
      expectedProfileRevision: null,
      preparedItems,
      materializedItems: null,
      materializedObservations: null,
      cursor: 0,
      captureNextGoalAfterCompletion: false,
    });
    return this.#drainRetentionWorkBatch('catalog');
  }

  #settledRetentionFacts(
    settlement: ArenaV2LearningSettlementProjectionV1,
    authorityResearchedWeaponDefinitionId: string | null,
  ): Readonly<{
    readonly profileRevision: number;
    readonly authorityTick: number;
    readonly modeDefinitionId: string;
    readonly weaponDefinitionIds: readonly string[];
    readonly mapDefinitionId: string;
  }> {
    const productResult = this.#terminalProductResult;
    const localParticipantId = this.#terminalLocalParticipantId;
    const selectedModeKind = this.#selectedModeKind;
    const settlementProfileRevision = settlement.profileRevision;
    if (settlement.status !== 'committed' || settlementProfileRevision === null) {
      throw new RangeError('Arena结算留存观察必须消费已提交Learning settlement。');
    }
    if (productResult === null || localParticipantId === null || selectedModeKind === null) {
      throw new Error('Arena结算留存观察缺少完整终局Product Result身份。');
    }
    const expectedModeDefinitionId = MODE_IDS[selectedModeKind];
    const settledMapDefinitionId = productResult.content.selectedMapDefinitionId;
    if (productResult.modeDefinitionId !== expectedModeDefinitionId
      || settlement.sourceModeDefinitionId !== expectedModeDefinitionId
      || settledMapDefinitionId !== this.#selectedMapDefinitionId) {
      throw new RangeError('Arena结算留存观察的模式或冻结地图身份漂移。');
    }
    const localUsage = productResult.participantEquipmentUsage.find(
      ({ participantId }) => participantId === localParticipantId,
    );
    if (localUsage === undefined) {
      throw new RangeError('Arena结算留存观察缺少本地参与者武器使用事实。');
    }
    if (authorityResearchedWeaponDefinitionId !== null
      && !localUsage.usedCollectionEquipmentDefinitionIds.includes(
        authorityResearchedWeaponDefinitionId,
      )) {
      throw new RangeError('Arena权威主研究武器不在本地Replay武器使用事实中。');
    }
    if (settlement.researchedWeaponDefinitionId !== null
      && settlement.researchedWeaponDefinitionId
        !== authorityResearchedWeaponDefinitionId) {
      throw new RangeError('Arena结算实际主研究武器与权威Grant身份漂移。');
    }
    return Object.freeze({
      profileRevision: settlementProfileRevision,
      authorityTick: productResult.modeResult.endedAtTick,
      modeDefinitionId: expectedModeDefinitionId,
      weaponDefinitionIds: localUsage.usedCollectionEquipmentDefinitionIds,
      mapDefinitionId: settledMapDefinitionId,
    });
  }

  #prepareSettledMatchRetentionWorkBatch(
    settlement: ArenaV2LearningSettlementProjectionV1,
    authorityResearchedWeaponDefinitionId: string | null,
  ): void {
    if (this.#retentionObservationCollector === null) {
      this.#pendingWeaponResearchFocusObservation = null;
      this.#pendingMapLearningFocusObservation = null;
      this.#captureNextGoalImpression();
      return;
    }
    if (this.#pendingRetentionActionRetry !== null
      || this.#pendingCatalogRetentionWorkBatch !== null
      || this.#pendingSettlementRetentionWorkBatch !== null
      || this.#pendingNextGoalCaptureDebt !== null
      || this.#pendingNextGoalImpression !== null) {
      throw new Error('Arena新结算留存工作批不得覆盖未决观察。');
    }
    const facts = this.#settledRetentionFacts(
      settlement,
      authorityResearchedWeaponDefinitionId,
    );
    const weaponDefinitionIds = sorted(facts.weaponDefinitionIds);
    if (weaponDefinitionIds.length !== facts.weaponDefinitionIds.length
      || weaponDefinitionIds.length > ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.length
      || weaponDefinitionIds.some((weaponDefinitionId) => (
        !ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.some(({ equipment }) => (
          equipment.id === weaponDefinitionId
        ))
      ))) {
      throw new RangeError('Arena结算留存工作批的实际武器集合无效。');
    }
    const modeDefinitionIds = Object.freeze([facts.modeDefinitionId]);
    const mapDefinitionIds = Object.freeze([facts.mapDefinitionId]);
    const preparedItems: PreparedRetentionWorkItemV1[] = [];
    preparedItems.push(Object.freeze({
      preparedObservation: Object.freeze({
        kind: 'generic' as const,
        fields: this.#freezeRetentionObservationFields({
          kind: 'effective-learning-completed',
          expectedProfileRevision: facts.profileRevision,
          weaponDefinitionIds,
          mapDefinitionIds,
          modeDefinitionIds,
          goalId: null,
          repeatOrdinal: null,
          effectiveLearningProgress: settlement.effectiveLearningProgress,
          goalSelected: null,
          authorityTick: facts.authorityTick,
        }),
      }),
      postCommit: Object.freeze({ kind: 'none' as const }),
    }));
    for (const weaponDefinitionId of weaponDefinitionIds) {
      const contentKey = `weapon:${weaponDefinitionId}`;
      const previousOrdinal = this.#contentEntryOrdinals.get(contentKey) ?? 0;
      const repeatOrdinal = previousOrdinal + 1;
      if (!Number.isSafeInteger(repeatOrdinal)) {
        throw new RangeError('Arena武器内容进入ordinal溢出。');
      }
      preparedItems.push(Object.freeze({
        preparedObservation: Object.freeze({
          kind: 'generic' as const,
          fields: this.#freezeRetentionObservationFields({
            kind: 'content-repeat-entry',
            expectedProfileRevision: facts.profileRevision,
            weaponDefinitionIds: Object.freeze([weaponDefinitionId]),
            mapDefinitionIds: Object.freeze([]),
            modeDefinitionIds,
            goalId: null,
            repeatOrdinal,
            effectiveLearningProgress: null,
            goalSelected: null,
            authorityTick: facts.authorityTick,
          }),
        }),
        postCommit: Object.freeze({
          kind: 'content-entry' as const,
          contentKey,
          previousOrdinal,
          repeatOrdinal,
        }),
      }));
    }
    const mapContentKey = `map:${facts.mapDefinitionId}`;
    const previousMapOrdinal = this.#contentEntryOrdinals.get(mapContentKey) ?? 0;
    const nextMapOrdinal = previousMapOrdinal + 1;
    if (!Number.isSafeInteger(nextMapOrdinal)) {
      throw new RangeError('Arena地图内容进入ordinal溢出。');
    }
    preparedItems.push(Object.freeze({
      preparedObservation: Object.freeze({
        kind: 'generic' as const,
        fields: this.#freezeRetentionObservationFields({
          kind: 'content-repeat-entry',
          expectedProfileRevision: facts.profileRevision,
          weaponDefinitionIds: Object.freeze([]),
          mapDefinitionIds,
          modeDefinitionIds,
          goalId: null,
          repeatOrdinal: nextMapOrdinal,
          effectiveLearningProgress: null,
          goalSelected: null,
          authorityTick: facts.authorityTick,
        }),
      }),
      postCommit: Object.freeze({
        kind: 'content-entry' as const,
        contentKey: mapContentKey,
        previousOrdinal: previousMapOrdinal,
        repeatOrdinal: nextMapOrdinal,
      }),
    }));
    const previousWeaponDefinitionIds = sorted([...this.#usedWeaponDefinitionIds]);
    const previousMapDefinitionIds = sorted([...this.#usedMapDefinitionIds]);
    const nextWeaponDefinitionIds = sorted([
      ...previousWeaponDefinitionIds,
      ...weaponDefinitionIds,
    ]);
    const nextMapDefinitionIds = sorted([
      ...previousMapDefinitionIds,
      facts.mapDefinitionId,
    ]);
    preparedItems.push(Object.freeze({
      preparedObservation: Object.freeze({
        kind: 'generic' as const,
        fields: this.#freezeRetentionObservationFields({
          kind: 'cross-content-used',
          expectedProfileRevision: facts.profileRevision,
          weaponDefinitionIds: nextWeaponDefinitionIds,
          mapDefinitionIds: nextMapDefinitionIds,
          modeDefinitionIds,
          goalId: null,
          repeatOrdinal: null,
          effectiveLearningProgress: null,
          goalSelected: null,
          authorityTick: facts.authorityTick,
        }),
      }),
      postCommit: Object.freeze({
        kind: 'cross-content-used' as const,
        previousWeaponDefinitionIds,
        previousMapDefinitionIds,
        nextWeaponDefinitionIds,
        nextMapDefinitionIds,
      }),
    }));
    const weaponFocus = this.#pendingWeaponResearchFocusObservation;
    if (weaponFocus !== null) {
      const contextProgress = weaponFocus.goalKind === 'weapon-context'
        ? settlement.weaponContextEvidenceDeltas.find((entry) => (
          entry.weaponDefinitionId === weaponFocus.weaponDefinitionId
          && entry.context === weaponFocus.context
        )) ?? null
        : null;
      preparedItems.push(Object.freeze({
        preparedObservation: Object.freeze({
          kind: 'weapon-focus' as const,
          profileRevision: facts.profileRevision,
          authorityTick: facts.authorityTick,
          focus: weaponFocus,
          progressedWeaponDefinitionId: weaponFocus.goalKind === 'collect-weapon'
            ? settlement.researchedWeaponDefinitionId
            : contextProgress?.weaponDefinitionId ?? null,
          progressedContext: contextProgress?.context ?? null,
        }),
        postCommit: Object.freeze({ kind: 'weapon-focus' as const, focus: weaponFocus }),
      }));
    }
    const mapFocus = this.#pendingMapLearningFocusObservation;
    if (mapFocus !== null) {
      const segmentProgress = mapFocus.goalKind === 'map-segment'
        ? settlement.mapSegmentEvidenceDeltas.find((entry) => (
          entry.mapDefinitionId === mapFocus.mapDefinitionId
          && entry.segmentDefinitionId === mapFocus.segmentDefinitionId
        )) ?? null
        : null;
      const mapCollectionProgressed = mapFocus.goalKind === 'collect-map'
        && settlement.newlyCollectedMapDefinitionIds.includes(mapFocus.mapDefinitionId);
      preparedItems.push(Object.freeze({
        preparedObservation: Object.freeze({
          kind: 'map-focus' as const,
          profileRevision: facts.profileRevision,
          authorityTick: facts.authorityTick,
          focus: mapFocus,
          progressedMapDefinitionId: mapCollectionProgressed || segmentProgress !== null
            ? mapFocus.mapDefinitionId
            : null,
          progressedSegmentDefinitionId: segmentProgress?.segmentDefinitionId ?? null,
        }),
        postCommit: Object.freeze({ kind: 'map-focus' as const, focus: mapFocus }),
      }));
    }
    if (preparedItems.length > MAX_SETTLEMENT_RETENTION_WORK_ITEMS_V1) {
      throw new RangeError('Arena结算留存工作批超过25项上限。');
    }
    const frozenPreparedItems = Object.freeze(preparedItems);
    const identitySource = Object.freeze({
      source: 'settlement' as const,
      expectedProfileRevision: facts.profileRevision,
      preparedItems: frozenPreparedItems,
    });
    this.#pendingSettlementRetentionWorkBatch = Object.freeze({
      source: 'settlement' as const,
      identity: createDeterministicDataHash(
        identitySource,
        'Arena settled retention work batch',
      ),
      expectedProfileRevision: facts.profileRevision,
      preparedItems: frozenPreparedItems,
      materializedItems: null,
      materializedObservations: null,
      cursor: 0,
      captureNextGoalAfterCompletion: true,
    });
    const completed = this.#drainRetentionWorkBatch('settlement');
    if (completed && this.#pendingNextGoalCaptureDebt !== null) {
      this.#captureNextGoalImpression();
    }
  }

  #captureNextGoalImpression(): boolean {
    let debt = this.#pendingNextGoalCaptureDebt;
    if (debt === null) return true;
    if (this.#retentionObservationCollector === null || this.#profileOwner === null) {
      this.#lastRetentionObservationError = new Error(
        'Arena下一目标捕获债务缺少Collector或Profile owner。',
      );
      return false;
    }
    if (this.#pendingCatalogRetentionWorkBatch !== null
      || this.#pendingSettlementRetentionWorkBatch !== null
      || this.#pendingRetentionActionRetry !== null
      || this.#pendingNextGoalImpression !== null) {
      this.#lastRetentionObservationError = new Error(
        'Arena下一目标捕获债务与工作批、动作或印象状态冲突。',
      );
      return false;
    }
    const callbackBoundary = this.#captureRetentionCallbackBoundary();
    try {
      if (debt.registryScopeStatus === 'pending') {
        const activeRegistry = this.#activeRegistryBindingFromCurrentOwner();
        this.#assertRetentionCallbackBoundary(callbackBoundary);
        const registryScope = activeRegistry === null
          ? null
          : Object.freeze({
            revision: activeRegistry.revision,
            snapshotHash: activeRegistry.snapshotHash,
            collectionEquipmentDefinitionIds: Object.freeze([
              ...activeRegistry.collectionEquipmentDefinitionIds,
            ]),
          });
        const scopedDebt = Object.freeze({
          ...debt,
          registryScopeStatus: 'frozen' as const,
          registryScopeIdentityHash: createDeterministicDataHash(
            Object.freeze({ registryScope }),
            'Arena pending next-goal capture registry scope',
          ),
          registryScope,
        });
        if (this.#pendingNextGoalCaptureDebt !== debt) {
          throw new Error('Arena下一目标捕获债务在Registry scope冻结期间漂移。');
        }
        this.#pendingNextGoalCaptureDebt = scopedDebt;
        debt = scopedDebt;
      }
      const profile = this.#profileOwner.learningProfileService.getSnapshot();
      this.#assertRetentionCallbackBoundary(callbackBoundary);
      const nextGoal = this.#resolveNextLearningGoalWithWeaponScope(
        profile,
        debt.registryScope?.collectionEquipmentDefinitionIds ?? null,
      );
      this.#assertRetentionCallbackBoundary(callbackBoundary);
      const lastObservation = this.#lastRetentionObservation;
      if (this.#pendingNextGoalCaptureDebt !== debt
        || nextGoal.profileRevision !== debt.expectedProfileRevision
        || lastObservation === null
        || lastObservation.eventId !== debt.lastObservationEventId
        || lastObservation.eventSequence !== debt.lastObservationEventSequence) {
        throw new RangeError('Arena下一目标捕获债务与Profile或结算留存水位漂移。');
      }
      if (nextGoal.kind === 'catalog-complete') {
        this.#pendingNextGoalCaptureDebt = null;
        this.#lastRetentionObservationError = null;
        return true;
      }
      const impression = Object.freeze({
        goalId: nextGoal.goalId,
        profileRevision: nextGoal.profileRevision,
        weaponDefinitionIds: nextGoal.weaponDefinitionId === null
          ? Object.freeze([])
          : Object.freeze([nextGoal.weaponDefinitionId]),
        mapDefinitionIds: nextGoal.mapDefinitionId === null
          ? Object.freeze([])
          : Object.freeze([nextGoal.mapDefinitionId]),
        modeDefinitionIds: nextGoal.modeDefinitionId === null
          ? Object.freeze([])
          : Object.freeze([nextGoal.modeDefinitionId]),
        authorityTick: debt.authorityTick,
      });
      this.#pendingNextGoalImpression = impression;
      this.#pendingNextGoalCaptureDebt = null;
      this.#lastRetentionObservationError = null;
      return true;
    } catch (error) {
      this.#lastRetentionObservationError = error;
      if (this.#operation !== callbackBoundary.operation
        || this.#reentrySequence !== callbackBoundary.reentrySequence) {
        throw error;
      }
      return false;
    }
  }

  #completeNextGoalImpression(goalSelected: boolean): boolean {
    const impression = this.#pendingNextGoalImpression;
    if (impression === null) return true;
    return this.#submitRetentionActionObservation(
      Object.freeze({
        kind: 'next-goal-selected',
        expectedProfileRevision: impression.profileRevision,
        weaponDefinitionIds: impression.weaponDefinitionIds,
        mapDefinitionIds: impression.mapDefinitionIds,
        modeDefinitionIds: impression.modeDefinitionIds,
        goalId: impression.goalId,
        repeatOrdinal: null,
        effectiveLearningProgress: null,
        goalSelected,
        authorityTick: impression.authorityTick,
      }),
      impression,
      null,
    );
  }

  #captureHomeContinuationFollowObservation(
    continuation: ArenaV2NextLearningGoalContinuationRouteV1,
    profileRevision: number,
    fullCatalogReplayCombination: ReturnType<
      typeof projectArenaV2FullCatalogReplayCombinationV1
    > = null,
  ): PendingHomeContinuationFollowObservationV1 | null {
    if (this.#retentionObservationCollector === null) return null;
    const preparation = this.#captureHomeContinuationPreparation(
      continuation,
      'home',
      profileRevision,
      fullCatalogReplayCombination,
    );
    if (preparation === null) return null;
    return preparation;
  }

  #captureHomeContinuationPreparation(
    continuation: ArenaV2NextLearningGoalContinuationRouteV1,
    source: 'home' | 'result',
    profileRevision: number,
    fullCatalogReplayCombination: ReturnType<
      typeof projectArenaV2FullCatalogReplayCombinationV1
    > = null,
  ): PendingHomeContinuationFollowObservationV1 | null {
    if (fullCatalogReplayCombination !== null) {
      if (source !== 'home'
        || continuation.goalId !== ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1
        || continuation.goalKind !== 'catalog-complete'
        || continuation.continuationKind !== 'free-choice'
        || fullCatalogReplayCombination.profileRevision !== profileRevision) {
        throw new RangeError('Arena首页完整目录复练准备与当前续玩身份漂移。');
      }
      const targetWeaponRequiresWorldPickup =
        fullCatalogReplayCombination.survivalWeaponRequiresWorldPickup;
      return Object.freeze({
        source,
        goalId: continuation.goalId,
        profileRevision,
        modeDefinitionId: fullCatalogReplayCombination.modeDefinitionId,
        targetWeaponDefinitionId: fullCatalogReplayCombination.weaponDefinitionId,
        targetMapDefinitionId: fullCatalogReplayCombination.mapDefinitionId,
        requiresTargetWeaponSelection: !targetWeaponRequiresWorldPickup,
        targetWeaponRequiresWorldPickup,
      });
    }
    if (continuation.recommendedModeDefinitionId === null
      || continuation.recommendedModeKind === null) return null;
    if (continuation.targetWeaponRequiresWorldPickup
      && continuation.requiresTargetWeaponSelection) {
      throw new RangeError('Arena目标续玩不得把生存世界拾取当作开局装备。');
    }
    if (!Number.isSafeInteger(profileRevision) || profileRevision < 0) {
      throw new RangeError('Arena目标续玩Profile revision无效。');
    }
    return Object.freeze({
      source,
      goalId: continuation.goalId,
      profileRevision,
      modeDefinitionId: continuation.recommendedModeDefinitionId,
      targetWeaponDefinitionId: continuation.targetWeaponDefinitionId,
      targetMapDefinitionId: continuation.targetMapDefinitionId,
      requiresTargetWeaponSelection: continuation.requiresTargetWeaponSelection,
      targetWeaponRequiresWorldPickup: continuation.targetWeaponRequiresWorldPickup,
    });
  }

  #captureResultGoalContinuationPreparation(
    routeFit: ArenaV2ResultNextGoalRouteFitV1,
    route: NextGoalNavigationRouteV1,
  ): PendingHomeContinuationFollowObservationV1 {
    if (route.targetScreenId !== 'mode-select'
      || route.selectedModeKind === null) {
      throw new RangeError('Arena结果页目标准备必须落到既有模式确认页。');
    }
    const replayCombination = this.#fullCatalogReplayCombinationFromRouteFit(routeFit);
    if (replayCombination !== null) {
      const targetWeaponRequiresWorldPickup = replayCombination.modeKind === 'survival';
      const requiresTargetWeaponSelection = !targetWeaponRequiresWorldPickup;
      if (route.goalId !== routeFit.nextGoal.goalId
        || route.selectedModeKind !== replayCombination.modeKind
        || route.selectedWeaponDefinitionId !== (requiresTargetWeaponSelection
          ? replayCombination.weaponDefinitionId
          : null)
        || route.selectedMapDefinitionId !== replayCombination.mapDefinitionId) {
        throw new RangeError('Arena结果页完整目录复练准备与已展示组合发生漂移。');
      }
      return Object.freeze({
        source: 'result' as const,
        goalId: route.goalId,
        profileRevision: replayCombination.profileRevision,
        modeDefinitionId: replayCombination.modeDefinitionId,
        targetWeaponDefinitionId: replayCombination.weaponDefinitionId,
        targetMapDefinitionId: replayCombination.mapDefinitionId,
        requiresTargetWeaponSelection,
        targetWeaponRequiresWorldPickup,
      });
    }
    const targetWeaponRequiresWorldPickup = routeFit.targetWeaponDefinitionId !== null
      && route.selectedModeKind === 'survival';
    const requiresTargetWeaponSelection = routeFit.targetWeaponDefinitionId !== null
      && !targetWeaponRequiresWorldPickup;
    const modeDefinitionId = MODE_IDS[route.selectedModeKind];
    if (route.goalId !== routeFit.nextGoal.goalId
      || modeDefinitionId !== routeFit.recommendedModeDefinitionId
      || route.selectedWeaponDefinitionId !== (requiresTargetWeaponSelection
        ? routeFit.targetWeaponDefinitionId
        : null)
      || route.selectedMapDefinitionId !== routeFit.targetMapDefinitionId) {
      throw new RangeError('Arena结果页目标准备与当前长期目标的模式、武器或地图发生漂移。');
    }
    return Object.freeze({
      source: 'result' as const,
      goalId: route.goalId,
      profileRevision: routeFit.nextGoal.profileRevision,
      modeDefinitionId,
      targetWeaponDefinitionId: routeFit.targetWeaponDefinitionId,
      targetMapDefinitionId: routeFit.targetMapDefinitionId,
      requiresTargetWeaponSelection,
      targetWeaponRequiresWorldPickup,
    });
  }

  #captureResultCollectionDetailPreparation(
    routeFit: ArenaV2ResultNextGoalRouteFitV1,
    route: NextGoalNavigationRouteV1,
    recommendationKind: unknown,
  ): PendingHomeContinuationFollowObservationV1 {
    const expectedDetailScreenId = recommendationKind === 'next-weapon'
      ? 'weapon-detail'
      : recommendationKind === 'next-map'
        ? 'map-detail'
        : null;
    if (expectedDetailScreenId === null
      || route.targetScreenId !== expectedDetailScreenId
      || route.selectedModeKind === null) {
      throw new RangeError('Arena结果页收藏详情承接必须对应长期目标详情路线。');
    }
    const targetWeaponRequiresWorldPickup = routeFit.targetWeaponDefinitionId !== null
      && route.selectedModeKind === 'survival';
    const requiresTargetWeaponSelection = routeFit.targetWeaponDefinitionId !== null
      && !targetWeaponRequiresWorldPickup;
    const modeDefinitionId = MODE_IDS[route.selectedModeKind];
    if (route.goalId !== routeFit.nextGoal.goalId
      || modeDefinitionId !== routeFit.recommendedModeDefinitionId
      || route.selectedWeaponDefinitionId !== (recommendationKind === 'next-weapon'
        ? routeFit.targetWeaponDefinitionId
        : null)
      || route.selectedMapDefinitionId !== (recommendationKind === 'next-map'
        ? routeFit.targetMapDefinitionId
        : null)) {
      throw new RangeError('Arena结果页收藏详情与当前长期目标的模式或内容身份发生漂移。');
    }
    return Object.freeze({
      source: 'result' as const,
      goalId: route.goalId,
      profileRevision: routeFit.nextGoal.profileRevision,
      modeDefinitionId,
      targetWeaponDefinitionId: routeFit.targetWeaponDefinitionId,
      targetMapDefinitionId: routeFit.targetMapDefinitionId,
      requiresTargetWeaponSelection,
      targetWeaponRequiresWorldPickup,
    });
  }

  #revalidateResultCollectionDetailPreparation(
    pending: PendingHomeContinuationFollowObservationV1,
    routeFit: ArenaV2ResultNextGoalRouteFitV1,
  ): PendingHomeContinuationFollowObservationV1 {
    if (pending.source !== 'result') {
      throw new RangeError('Arena结果页收藏详情承接来源无效。');
    }
    const targetWeaponRequiresWorldPickup = routeFit.targetWeaponDefinitionId !== null
      && routeFit.recommendedModeKind === 'survival';
    const requiresTargetWeaponSelection = routeFit.targetWeaponDefinitionId !== null
      && !targetWeaponRequiresWorldPickup;
    if (routeFit.recommendedModeDefinitionId === null
      || routeFit.nextGoal.goalId !== pending.goalId
      || routeFit.nextGoal.profileRevision !== pending.profileRevision
      || routeFit.recommendedModeDefinitionId !== pending.modeDefinitionId
      || routeFit.targetWeaponDefinitionId !== pending.targetWeaponDefinitionId
      || routeFit.targetMapDefinitionId !== pending.targetMapDefinitionId
      || requiresTargetWeaponSelection !== pending.requiresTargetWeaponSelection
      || targetWeaponRequiresWorldPickup !== pending.targetWeaponRequiresWorldPickup) {
      throw new RangeError('Arena结果页收藏详情返回模式页前长期目标身份发生漂移。');
    }
    return pending;
  }

  #frozenMatchStartContentIdentity(
    matchPresentation: unknown,
  ): FrozenMatchStartContentIdentityV1 {
    if (!(matchPresentation instanceof ArenaV2ModeHudValidatedStepProjectionV1)) {
      throw new TypeError('Arena目标续玩回执需要已验证的开局表现投影。');
    }
    const scene = matchPresentation.getSceneReadFrame();
    const localParticipant = scene.world.participants.find(
      ({ id }) => id === scene.localParticipantId,
    );
    if (localParticipant === undefined) {
      throw new RangeError('Arena目标续玩回执在开局快照中缺少本地参与者。');
    }
    return Object.freeze({
      authorityTick: scene.source.tick,
      modeDefinitionId: scene.source.modeDefinitionId,
      mapDefinitionId: scene.source.mapDefinitionId,
      localWeaponDefinitionId: localParticipant.equipment?.collectionEquipmentDefinitionId ?? null,
    });
  }

  #sameContinuationPreparationIdentity(
    left: PendingHomeContinuationFollowObservationV1,
    right: PendingHomeContinuationFollowObservationV1,
  ): boolean {
    return left.source === right.source
      && left.goalId === right.goalId
      && left.profileRevision === right.profileRevision
      && left.modeDefinitionId === right.modeDefinitionId
      && left.targetWeaponDefinitionId === right.targetWeaponDefinitionId
      && left.targetMapDefinitionId === right.targetMapDefinitionId
      && left.requiresTargetWeaponSelection === right.requiresTargetWeaponSelection
      && left.targetWeaponRequiresWorldPickup === right.targetWeaponRequiresWorldPickup;
  }

  #isContinuationPreparationCurrentFromRead(
    pending: PendingHomeContinuationFollowObservationV1,
    learningRead: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1,
    learningSettlement: ArenaV2LearningSettlementProjectionV1 | null,
    settledResultRouteFit: ArenaV2ResultNextGoalRouteFitV1 | null = null,
  ): boolean {
    if (pending.source === 'home') {
      const nextGoal = this.#resolveNextLearningGoalWithWeaponScope(
        learningRead.profile,
        learningRead.eligibleWeaponDefinitionIds,
      );
      const current = this.#captureHomeContinuationPreparation(
        this.#nextLearningGoalContinuationRoute(nextGoal),
        'home',
        nextGoal.profileRevision,
        this.#fullCatalogReplayCombinationFromLearningRead(learningRead, nextGoal),
      );
      return current !== null
        && this.#sameContinuationPreparationIdentity(pending, current);
    }
    if (learningSettlement === null) return false;
    const routeFit = settledResultRouteFit ?? this.#resultNextGoalRouteFitFromRead(
      learningSettlement,
      learningRead,
    );
    if (routeFit.recommendedModeDefinitionId === null
      || routeFit.recommendedModeKind === null) return false;
    const targetWeaponRequiresWorldPickup = routeFit.targetWeaponDefinitionId !== null
      && routeFit.recommendedModeKind === 'survival';
    const current = Object.freeze({
      source: 'result' as const,
      goalId: routeFit.nextGoal.goalId,
      profileRevision: routeFit.nextGoal.profileRevision,
      modeDefinitionId: routeFit.recommendedModeDefinitionId,
      targetWeaponDefinitionId: routeFit.targetWeaponDefinitionId,
      targetMapDefinitionId: routeFit.targetMapDefinitionId,
      requiresTargetWeaponSelection: routeFit.targetWeaponDefinitionId !== null
        && !targetWeaponRequiresWorldPickup,
      targetWeaponRequiresWorldPickup,
    });
    return this.#sameContinuationPreparationIdentity(pending, current);
  }

  #continuationPreparationReadFromLearningRead(
    learningRead: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1,
    learningSettlement: ArenaV2LearningSettlementProjectionV1 | null,
  ): Readonly<{
    readonly state: 'none' | 'ready' | 'adjusted';
    readonly source: 'none' | 'home' | 'result';
  }> {
    const pending = this.#acceptedHomeContinuationPreparation;
    if (pending === null || !this.#isContinuationPreparationCurrentFromRead(
      pending,
      learningRead,
      learningSettlement,
    )) {
      return Object.freeze({ state: 'none', source: 'none' });
    }
    const modeDefinitionId = this.#selectedModeKind === null
      ? null
      : MODE_IDS[this.#selectedModeKind];
    const ready = modeDefinitionId === pending.modeDefinitionId
      && (pending.targetMapDefinitionId === null
        || this.#selectedMapDefinitionId === pending.targetMapDefinitionId)
      && (!pending.requiresTargetWeaponSelection
        || this.#selectedWeaponDefinitionId === pending.targetWeaponDefinitionId);
    return Object.freeze({
      state: ready ? 'ready' : 'adjusted',
      source: pending.source,
    });
  }

  #continuationPreparationGoalDriftedFromRead(
    learningRead: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1,
    learningSettlement: ArenaV2LearningSettlementProjectionV1 | null,
    settledResultRouteFit: ArenaV2ResultNextGoalRouteFitV1 | null,
  ): boolean {
    const accepted = this.#acceptedHomeContinuationPreparation;
    const detail = this.#pendingResultCollectionDetailPreparation;
    if (accepted === null && detail === null) return false;
    const acceptedCurrent = accepted === null
      || this.#isContinuationPreparationCurrentFromRead(
        accepted,
        learningRead,
        learningSettlement,
        settledResultRouteFit,
      );
    const detailCurrent = detail === null
      || this.#isContinuationPreparationCurrentFromRead(
        detail,
        learningRead,
        learningSettlement,
        settledResultRouteFit,
      );
    return !acceptedCurrent || !detailCurrent;
  }

  #continuationPreparationGoalDriftedFromCurrentOwners(): boolean {
    const accepted = this.#acceptedHomeContinuationPreparation;
    const detail = this.#pendingResultCollectionDetailPreparation;
    if (accepted === null && detail === null) return false;
    const learningRead = this.#informationLearningProfileReadFromCurrentOwners();
    const learningSettlement = accepted?.source === 'result' || detail?.source === 'result'
      ? this.#learningSettlementRecoveryOwner.getSettlement()
      : null;
    const settledResultRouteFit = learningSettlement === null
      ? null
      : this.#resultNextGoalRouteFitFromRead(learningSettlement, learningRead);
    return this.#continuationPreparationGoalDriftedFromRead(
      learningRead,
      learningSettlement,
      settledResultRouteFit,
    );
  }

  #clearContinuationPreparationIfGoalDrifted(): void {
    if (this.#continuationPreparationGoalDriftedFromCurrentOwners()) {
      this.#clearContinuationPreparationAfterExplicitExit();
    }
  }

  #homeContinuationFollowed(
    pending: PendingHomeContinuationFollowObservationV1,
    actual: FrozenMatchStartContentIdentityV1,
  ): boolean {
    return actual.modeDefinitionId === pending.modeDefinitionId
      && (pending.targetMapDefinitionId === null
        || actual.mapDefinitionId === pending.targetMapDefinitionId)
      && (!pending.requiresTargetWeaponSelection
        || actual.localWeaponDefinitionId === pending.targetWeaponDefinitionId)
      && (!pending.targetWeaponRequiresWorldPickup
        || actual.localWeaponDefinitionId === null);
  }

  #captureHomeContinuationMatchReceipt(matchPresentation: unknown): void {
    const preparation = this.#acceptedHomeContinuationPreparation;
    if (preparation === null) {
      this.#homeContinuationMatchReceipt = null;
      this.#homeContinuationMatchReceiptError = null;
      return;
    }
    try {
      const actual = this.#frozenMatchStartContentIdentity(matchPresentation);
      this.#homeContinuationMatchReceipt = Object.freeze({
        source: preparation.source,
        goalId: preparation.goalId,
        kind: this.#homeContinuationFollowed(preparation, actual)
          ? 'suggested-combination'
          : 'adjusted-combination',
        authorityTick: actual.authorityTick,
      });
      this.#homeContinuationMatchReceiptError = null;
    } catch (error) {
      this.#homeContinuationMatchReceipt = null;
      this.#homeContinuationMatchReceiptError = error;
    }
  }

  #projectHomeContinuationMatchReceipt(
    fieldSource: ArenaV2InformationFieldSourceV1,
  ): ArenaV2InformationFieldSourceV1 {
    const receipt = this.#homeContinuationMatchReceipt;
    if (receipt === null) return fieldSource;
    try {
      const projected =
        projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1({
          schemaVersion: 1,
          fieldSource,
          sourceKind: receipt.source,
          receiptKind: receipt.kind,
        });
      this.#homeContinuationMatchReceiptError = null;
      return projected;
    } catch (error) {
      this.#homeContinuationMatchReceiptError = error;
      return fieldSource;
    }
  }

  #completeHomeContinuationFollowObservation(
    matchPresentation: unknown | null,
  ): boolean {
    const pending = this.#pendingHomeContinuationFollowObservation;
    if (pending === null) return true;
    if (matchPresentation === null) {
      return this.#submitRetentionActionObservation(
        Object.freeze({
          kind: 'home-continuation-followed',
          expectedProfileRevision: pending.profileRevision,
          weaponDefinitionIds: pending.targetWeaponDefinitionId === null
            ? Object.freeze([])
            : Object.freeze([pending.targetWeaponDefinitionId]),
          mapDefinitionIds: pending.targetMapDefinitionId === null
            ? Object.freeze([])
            : Object.freeze([pending.targetMapDefinitionId]),
          modeDefinitionIds: Object.freeze([pending.modeDefinitionId]),
          goalId: pending.goalId,
          repeatOrdinal: null,
          effectiveLearningProgress: null,
          goalSelected: false,
          authorityTick: null,
        }),
        null,
        pending,
      );
    }
    let actual: FrozenMatchStartContentIdentityV1;
    try {
      actual = this.#frozenMatchStartContentIdentity(matchPresentation);
    } catch (error) {
      this.#lastRetentionObservationError = error;
      return false;
    }
    const followed = this.#homeContinuationFollowed(pending, actual);
    return this.#submitRetentionActionObservation(
      Object.freeze({
        kind: 'home-continuation-followed',
        expectedProfileRevision: pending.profileRevision,
        weaponDefinitionIds: pending.targetWeaponDefinitionId === null
          ? Object.freeze([])
          : Object.freeze([pending.targetWeaponDefinitionId]),
        mapDefinitionIds: pending.targetMapDefinitionId === null
          ? Object.freeze([])
          : Object.freeze([pending.targetMapDefinitionId]),
        modeDefinitionIds: Object.freeze([pending.modeDefinitionId]),
        goalId: pending.goalId,
        repeatOrdinal: null,
        effectiveLearningProgress: null,
        goalSelected: followed,
        authorityTick: actual.authorityTick,
      }),
      null,
      pending,
    );
  }

  #clearContinuationPreparationAfterExplicitExit(): void {
    this.#acceptedHomeContinuationPreparation = null;
    this.#pendingResultCollectionDetailPreparation = null;
    if (this.#pendingHomeContinuationFollowObservation !== null) {
      this.#completeHomeContinuationFollowObservation(null);
    }
  }

  #fullCatalogReplayCombinationFromRouteFit(
    routeFit: ArenaV2ResultNextGoalRouteFitV1,
  ): ReturnType<typeof projectArenaV2FullCatalogReplayCombinationV1> {
    if (routeFit.nextGoal.kind !== 'catalog-complete') return null;
    return projectArenaV2FullCatalogReplayCombinationV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      profile: this.#learningProfileSnapshotFromCurrentOwner(),
      nextGoal: routeFit.nextGoal,
      eligibleWeaponDefinitionIds: routeFit.eligibleWeaponDefinitionIds,
      eligibleMapDefinitionIds:
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.map(
          ({ mapDefinitionId }) => mapDefinitionId,
        ),
    });
  }

  #resolveNextGoalNavigationRoute(
    routeFit: ArenaV2ResultNextGoalRouteFitV1,
  ): NextGoalNavigationRouteV1 {
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    const nextGoal = routeFit.nextGoal;
    const selectedModeKind = routeFit.recommendedModeKind;
    const eligibleWeaponDefinitionIds = routeFit.eligibleWeaponDefinitionIds;
    if (nextGoal.kind === 'collect-weapon' || nextGoal.kind === 'weapon-context') {
      if (nextGoal.weaponDefinitionId === null) {
        throw new Error('Arena武器下一目标缺少武器身份。');
      }
      const weaponDefinitionId = selectedPlayableWeaponDefinitionId(
        nextGoal.weaponDefinitionId,
      );
      const active = eligibleWeaponDefinitionIds === null
        || eligibleWeaponDefinitionIds.includes(weaponDefinitionId);
      return Object.freeze({
        goalId: nextGoal.goalId,
        targetScreenId: active ? 'weapon-detail' as const : 'weapon-index' as const,
        selectedModeKind,
        selectedWeaponDefinitionId: active ? weaponDefinitionId : null,
        selectedMapDefinitionId: null,
      });
    }
    if (nextGoal.kind === 'collect-map' || nextGoal.kind === 'map-segment') {
      if (nextGoal.mapDefinitionId === null) {
        throw new Error('Arena地图下一目标缺少地图身份。');
      }
      return Object.freeze({
        goalId: nextGoal.goalId,
        targetScreenId: 'map-detail' as const,
        selectedModeKind,
        selectedWeaponDefinitionId: null,
        selectedMapDefinitionId: selectedPlayableMapDefinitionId(nextGoal.mapDefinitionId),
      });
    }
    if (nextGoal.kind === 'mode-mastery' || nextGoal.kind === 'record-improvement') {
      if (selectedModeKind === null) {
        throw new Error('Arena模式下一目标缺少模式身份。');
      }
      return Object.freeze({
        goalId: nextGoal.goalId,
        targetScreenId: 'mode-select' as const,
        selectedModeKind,
        selectedWeaponDefinitionId: null,
        selectedMapDefinitionId: null,
      });
    }
    if (nextGoal.kind === 'cross-challenge') {
      const crossWeaponDefinitionId = nextGoal.weaponDefinitionId === null
        ? null
        : selectedPlayableWeaponDefinitionId(nextGoal.weaponDefinitionId);
      const crossWeaponActive = crossWeaponDefinitionId !== null
        && (eligibleWeaponDefinitionIds === null
          || eligibleWeaponDefinitionIds.includes(crossWeaponDefinitionId));
      return Object.freeze({
        goalId: nextGoal.goalId,
        targetScreenId: selectedModeKind !== null
          ? 'mode-select' as const
          : crossWeaponActive
            ? 'weapon-detail' as const
            : crossWeaponDefinitionId !== null
              ? 'weapon-index' as const
            : nextGoal.mapDefinitionId !== null
              ? 'map-detail' as const
              : 'home' as const,
        selectedModeKind,
        selectedWeaponDefinitionId: crossWeaponActive ? crossWeaponDefinitionId : null,
        selectedMapDefinitionId: nextGoal.mapDefinitionId === null
          ? null
          : selectedPlayableMapDefinitionId(nextGoal.mapDefinitionId),
      });
    }
    const replayCombination = this.#fullCatalogReplayCombinationFromRouteFit(routeFit);
    if (replayCombination !== null) {
      return Object.freeze({
        goalId: nextGoal.goalId,
        targetScreenId: 'mode-select' as const,
        selectedModeKind: replayCombination.modeKind,
        selectedWeaponDefinitionId: replayCombination.modeKind === 'survival'
          ? null
          : selectedPlayableWeaponDefinitionId(replayCombination.weaponDefinitionId),
        selectedMapDefinitionId: selectedPlayableMapDefinitionId(
          replayCombination.mapDefinitionId,
        ),
      });
    }
    return Object.freeze({
      goalId: nextGoal.goalId,
      targetScreenId: 'home' as const,
      selectedModeKind: null,
      selectedWeaponDefinitionId: null,
      selectedMapDefinitionId: null,
    });
  }

  #resolveDefaultGoalAlignedPreparationRoute(
    routeFit: ArenaV2ResultNextGoalRouteFitV1,
  ): NextGoalNavigationRouteV1 {
    const route = this.#resolveNextGoalNavigationRoute(routeFit);
    if (routeFit.defaultResultDecision !== 'next-goal'
      || route.selectedModeKind === null
      || (routeFit.requiresWeaponChange && route.selectedWeaponDefinitionId === null)
      || (routeFit.requiresMapChange && route.selectedMapDefinitionId === null)) {
      return route;
    }
    return Object.freeze({
      ...route,
      targetScreenId: 'mode-select' as const,
      selectedWeaponDefinitionId: route.selectedModeKind === 'survival'
        && routeFit.targetWeaponDefinitionId !== null
        ? null
        : route.selectedWeaponDefinitionId,
    });
  }

  #applyNextGoalNavigationRoute(route: NextGoalNavigationRouteV1): void {
    if (route.selectedModeKind !== null) this.#selectedModeKind = route.selectedModeKind;
    if (route.selectedWeaponDefinitionId !== null) {
      this.#selectedWeaponDefinitionId = route.selectedWeaponDefinitionId;
    }
    if (route.selectedMapDefinitionId !== null) {
      this.#selectedMapDefinitionId = route.selectedMapDefinitionId;
    }
  }

  #navigationPrimaryIntent(
    value: unknown,
    route: NextGoalNavigationRouteV1 | null,
  ): Readonly<Record<string, unknown>> {
    const name = 'Arena local playable primary intent';
    const source = assertPlainRecord(value, name);
    assertKnownKeys(source, LOCAL_PRIMARY_INTENT_KEYS, name);
    for (const key of LOCAL_PRIMARY_INTENT_REQUIRED_KEYS) {
      if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
    }
    return Object.freeze({
      expectedRevision: ownDataField(source, 'expectedRevision', name),
      screenId: ownDataField(source, 'screenId', name),
      intentId: ownDataField(source, 'intentId', name),
      selectedModeKind: ownDataField(source, 'selectedModeKind', name),
      resultDecision: ownDataField(source, 'resultDecision', name),
      resultTargetScreenId: route?.targetScreenId ?? null,
    });
  }

  #assertRenderedResultCollectionTarget(
    value: unknown,
    resultDecision: unknown,
    route: NextGoalNavigationRouteV1 | null,
  ): void {
    const name = 'Arena local playable result collection target expectation';
    const source = assertPlainRecord(value, name);
    const kindDescriptor = Object.getOwnPropertyDescriptor(
      source,
      'expectedResultCollectionTargetKind',
    );
    const definitionDescriptor = Object.getOwnPropertyDescriptor(
      source,
      'expectedResultCollectionTargetDefinitionId',
    );
    if (kindDescriptor === undefined && definitionDescriptor === undefined) return;
    if (kindDescriptor === undefined || definitionDescriptor === undefined
      || !kindDescriptor.enumerable || !definitionDescriptor.enumerable
      || !Object.hasOwn(kindDescriptor, 'value')
      || !Object.hasOwn(definitionDescriptor, 'value')) {
      throw new TypeError('Arena结果页收藏承接预期必须成对提供数据字段。');
    }
    const kind = kindDescriptor.value;
    const definitionId = definitionDescriptor.value;
    if (kind === null && definitionId === null) return;
    if ((kind !== 'next-weapon' && kind !== 'next-map')
      || typeof definitionId !== 'string' || definitionId.length === 0) {
      throw new RangeError('Arena结果页收藏承接预期无效。');
    }
    if (resultDecision !== 'next-goal' || route === null) {
      throw new RangeError('Arena结果页收藏承接预期必须对应下一目标导航。');
    }
    if (kind === 'next-weapon') {
      if (route.targetScreenId !== 'weapon-detail'
        || route.selectedWeaponDefinitionId !== definitionId
        || route.selectedMapDefinitionId !== null) {
        throw new RangeError('Arena结果页展示的下一把武器与实际导航目标发生漂移。');
      }
      return;
    }
    if (route.targetScreenId !== 'map-detail'
      || route.selectedMapDefinitionId !== definitionId
      || route.selectedWeaponDefinitionId !== null) {
      throw new RangeError('Arena结果页展示的下一张地图与实际导航目标发生漂移。');
    }
  }

  #assertRenderedResultRouteIdentity(
    value: unknown,
    resultDecision: unknown,
    route: NextGoalNavigationRouteV1 | null,
  ): void {
    this.#assertRenderedResultCollectionTarget(value, resultDecision, route);
    const name = 'Arena local playable result route expectation';
    const source = assertPlainRecord(value, name);
    const keys = [
      'expectedResultRecommendationKind',
      'expectedResultGoalId',
      'expectedResultTargetScreenId',
      'expectedResultTargetModeKind',
      'expectedResultTargetWeaponDefinitionId',
      'expectedResultTargetMapDefinitionId',
    ] as const;
    const descriptors = keys.map((key) => Object.getOwnPropertyDescriptor(source, key));
    if (descriptors.every((descriptor) => descriptor === undefined)) return;
    if (descriptors.some((descriptor) => descriptor === undefined
      || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))) {
      throw new TypeError('Arena结果页目标路线预期必须完整提供数据字段。');
    }
    const [recommendationKind, goalId, targetScreenId, targetModeKind,
      weaponDefinitionId, mapDefinitionId] =
      descriptors.map((descriptor) => descriptor!.value);
    if (recommendationKind === null && goalId === null
      && targetScreenId === null && targetModeKind === null
      && weaponDefinitionId === null && mapDefinitionId === null) return;
    if (recommendationKind !== 'next-goal'
      && recommendationKind !== 'prepare-next-goal'
      && recommendationKind !== 'next-weapon'
      && recommendationKind !== 'next-map') {
      throw new RangeError('Arena结果页目标路线推荐身份无效。');
    }
    if (resultDecision !== 'next-goal' || route === null) {
      throw new RangeError('Arena结果页目标路线预期必须对应下一目标导航。');
    }
    if (goalId !== route.goalId
      || targetScreenId !== route.targetScreenId
      || targetModeKind !== route.selectedModeKind
      || weaponDefinitionId !== route.selectedWeaponDefinitionId
      || mapDefinitionId !== route.selectedMapDefinitionId) {
      throw new RangeError('Arena结果页展示的长期目标路线与实际导航目标发生漂移。');
    }
    if (recommendationKind === 'next-weapon'
      && (route.targetScreenId !== 'weapon-detail'
        || route.selectedWeaponDefinitionId === null
        || route.selectedMapDefinitionId !== null)) {
      throw new RangeError('Arena结果页下一把武器推荐与目标路线类型不一致。');
    }
    if (recommendationKind === 'next-map'
      && (route.targetScreenId !== 'map-detail'
        || route.selectedMapDefinitionId === null
        || route.selectedWeaponDefinitionId !== null)) {
      throw new RangeError('Arena结果页下一张地图推荐与目标路线类型不一致。');
    }
  }

  #captureGoalAlignedPlayAgainPreparation(
    value: unknown,
    resultDecision: unknown,
    readResultRouteFit: () => ArenaV2ResultNextGoalRouteFitV1,
  ): PendingHomeContinuationFollowObservationV1 | null {
    const name = 'Arena local playable目标对齐复玩预期';
    const source = assertPlainRecord(value, name);
    const keys = [
      'expectedResultPlayAgainFitKind',
      'expectedResultPlayAgainGoalId',
      'expectedResultPlayAgainModeKind',
      'expectedResultPlayAgainTargetWeaponDefinitionId',
      'expectedResultPlayAgainTargetMapDefinitionId',
    ] as const;
    const descriptors = keys.map((key) => Object.getOwnPropertyDescriptor(source, key));
    if (descriptors.every((descriptor) => descriptor === undefined)) return null;
    if (descriptors.some((descriptor) => descriptor === undefined
      || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))) {
      throw new TypeError('Arena目标对齐复玩预期必须完整提供数据字段。');
    }
    const [fitKind, goalId, modeKind, weaponDefinitionId, mapDefinitionId] =
      descriptors.map((descriptor) => descriptor!.value);
    if (fitKind === null && goalId === null && modeKind === null
      && weaponDefinitionId === null && mapDefinitionId === null) return null;
    if (resultDecision !== 'play-again'
      || (fitKind !== 'stable-current-combination'
        && fitKind !== 'conditional-survival-supply')
      || (modeKind !== 'duel' && modeKind !== 'race' && modeKind !== 'survival')
      || typeof goalId !== 'string' || goalId.length === 0) {
      throw new RangeError('Arena目标对齐复玩预期身份无效。');
    }
    const routeFit = readResultRouteFit();
    const deterministicFit = fitKind === 'stable-current-combination'
      && routeFit.deterministicCurrentReplayCanAdvance;
    const conditionalFit = fitKind === 'conditional-survival-supply'
      && routeFit.conditionalCurrentReplayCanAdvance;
    const normalizedModeKind: keyof typeof MODE_IDS = modeKind;
    if ((!deterministicFit && !conditionalFit)
      || routeFit.kind !== fitKind
      || routeFit.nextGoal.goalId !== goalId
      || routeFit.recommendedModeKind !== modeKind
      || routeFit.recommendedModeDefinitionId !== MODE_IDS[normalizedModeKind]
      || routeFit.targetWeaponDefinitionId !== weaponDefinitionId
      || routeFit.targetMapDefinitionId !== mapDefinitionId
      || this.#selectedModeKind !== modeKind
      || (routeFit.targetMapDefinitionId !== null
        && this.#selectedMapDefinitionId !== routeFit.targetMapDefinitionId)
      || (deterministicFit && routeFit.targetWeaponDefinitionId !== null
        && this.#selectedWeaponDefinitionId !== routeFit.targetWeaponDefinitionId)) {
      throw new RangeError('Arena已渲染的目标对齐复玩与点击时长期目标或当前组合发生漂移。');
    }
    return Object.freeze({
      source: 'result' as const,
      goalId,
      profileRevision: routeFit.nextGoal.profileRevision,
      modeDefinitionId: MODE_IDS[normalizedModeKind],
      targetWeaponDefinitionId: routeFit.targetWeaponDefinitionId,
      targetMapDefinitionId: routeFit.targetMapDefinitionId,
      requiresTargetWeaponSelection: deterministicFit
        && routeFit.targetWeaponDefinitionId !== null,
      targetWeaponRequiresWorldPickup: conditionalFit
        && routeFit.targetWeaponDefinitionId !== null,
    });
  }

  #captureWeaponResearchFocusObservation(
    nextGoal: ArenaV2NextLearningGoalV1,
  ): PendingWeaponResearchFocusObservationV1 | null {
    if (this.#retentionObservationCollector === null || this.#profileOwner === null) return null;
    if ((nextGoal.kind !== 'collect-weapon' && nextGoal.kind !== 'weapon-context')
      || nextGoal.weaponDefinitionId === null) return null;
    if ((nextGoal.kind === 'collect-weapon' && nextGoal.context !== null)
      || (nextGoal.kind === 'weapon-context' && nextGoal.context === null)) {
      throw new RangeError('Arena武器学习焦点目标类型与情境身份不一致。');
    }
    return Object.freeze({
      goalId: nextGoal.goalId,
      profileRevision: nextGoal.profileRevision,
      goalKind: nextGoal.kind,
      weaponDefinitionId: nextGoal.weaponDefinitionId,
      context: nextGoal.context,
    });
  }

  #captureMapLearningFocusObservation(
    nextGoal: ArenaV2NextLearningGoalV1,
  ): PendingMapLearningFocusObservationV1 | null {
    if (this.#retentionObservationCollector === null || this.#profileOwner === null) return null;
    if ((nextGoal.kind !== 'collect-map' && nextGoal.kind !== 'map-segment')
      || nextGoal.mapDefinitionId === null) return null;
    if ((nextGoal.kind === 'collect-map' && nextGoal.segmentDefinitionId !== null)
      || (nextGoal.kind === 'map-segment' && nextGoal.segmentDefinitionId === null)) {
      throw new RangeError('Arena地图学习焦点目标类型与路段身份不一致。');
    }
    return Object.freeze({
      goalId: nextGoal.goalId,
      profileRevision: nextGoal.profileRevision,
      goalKind: nextGoal.kind,
      mapDefinitionId: nextGoal.mapDefinitionId,
      segmentDefinitionId: nextGoal.segmentDefinitionId,
    });
  }

  #completeLearningSettlementPostProcessing(
    settlement: ArenaV2LearningSettlementProjectionV1,
    authorityResearchedWeaponDefinitionId: string | null,
  ): void {
    this.#prepareSettledMatchRetentionWorkBatch(
      settlement,
      authorityResearchedWeaponDefinitionId,
    );
  }

  start(value: unknown): unknown {
    return this.#runOperation('start', () => {
      const startupReadOnlyRecovery = this.#startupSettlementRecoveryNotice?.status
        === 'recovery-retry-required'
        || this.#startupSettlementRecoveryNotice?.status === 'recovery-restart-required'
        || (this.#settlementIntentJournalFailure !== null
          && this.#startupSettlementRecoveryNotice !== null);
      const outcome = startupReadOnlyRecovery
        ? this.#ownedHost().start({ initialScreenId: 'home' })
        : this.#host().start(value);
      if (!startupReadOnlyRecovery) this.#collectCatalogImpressionForCurrentScreen();
      return outcome;
    });
  }
  loadingReady(value: unknown): unknown {
    return this.#runOperation('loading-ready', () => {
      const outcome = this.#host().loadingReady(value);
      this.#collectCatalogImpressionForCurrentScreen();
      return outcome;
    });
  }
  #openDeclaredLinkAndFinalize(
    value: unknown,
    afterNavigation: (() => void) | null,
  ): unknown {
    const host = this.#host();
    const continuationPreparationGoalDrifted =
      this.#continuationPreparationGoalDriftedFromCurrentOwners();
    const wasResult = host.getInformationSnapshot().state === 'result';
    const hadPendingResultCollectionDetailPreparation =
      this.#pendingResultCollectionDetailPreparation !== null;
    const outcome = host.openDeclaredLink(value);
    afterNavigation?.();
    if (wasResult) this.#completeNextGoalImpression(false);
    const targetScreenId = host.getInformationSnapshot()
      .navigation.currentScreenId;
    if (continuationPreparationGoalDrifted
      || hadPendingResultCollectionDetailPreparation
      || targetScreenId === 'weapon-index' || targetScreenId === 'map-index') {
      this.#clearContinuationPreparationAfterExplicitExit();
    }
    this.#collectCatalogImpressionForCurrentScreen();
    return outcome;
  }
  openDeclaredLink(value: unknown): unknown {
    return this.#runOperation(
      'open-declared-link',
      () => this.#openDeclaredLinkAndFinalize(value, null),
    );
  }
  openInformationResultNewCollectionDetail(value: unknown): unknown {
    return this.#runOperation('open-result-collection-detail', () => {
    const request = assertPlainRecord(
      value,
      'Arena local playable结果页本局新收藏详情请求',
    );
    assertKnownKeys(
      request,
      RESULT_NEW_COLLECTION_DETAIL_REQUEST_KEYS,
      'Arena local playable结果页本局新收藏详情请求',
    );
    for (const key of RESULT_NEW_COLLECTION_DETAIL_REQUEST_KEYS) {
      if (!Object.hasOwn(request, key)) {
        throw new TypeError(`Arena结果页本局新收藏详情请求缺少${key}。`);
      }
    }
    const expectedRevision = assertIntegerAtLeast(
      ownDataField(
        request,
        'expectedRevision',
        'Arena local playable结果页本局新收藏详情请求',
      ),
      0,
      'Arena local playable结果页本局新收藏详情请求.expectedRevision',
    );
    const kind = ownDataField(
      request,
      'kind',
      'Arena local playable结果页本局新收藏详情请求',
    );
    if (kind !== 'weapon' && kind !== 'map') {
      throw new RangeError('Arena结果页本局新收藏详情请求类型无效。');
    }
    const definitionId = assertNonEmptyString(
      ownDataField(
        request,
        'definitionId',
        'Arena local playable结果页本局新收藏详情请求',
      ),
      'Arena local playable结果页本局新收藏详情请求.definitionId',
    );
    const host = this.#host();
    const information = host.getInformationSnapshot();
    if (information.state !== 'result'
      || information.navigation.currentScreenId !== 'result-reward') {
      throw new Error('Arena本局新收藏详情只能从当前结果页打开。');
    }
    if (information.navigation.revision !== expectedRevision) {
      throw new RangeError('Arena本局新收藏详情点击使用了过期结果页revision。');
    }
    const settlement = this.#learningSettlementRecoveryOwner.getSettlement();
    if (settlement === null || settlement.status !== 'committed') {
      throw new Error('Arena本局新收藏详情必须等待权威Learning结算提交完成。');
    }
    if (kind === 'weapon') {
      const selected = selectedPlayableWeaponDefinitionId(definitionId);
      if (!settlement.newlyCollectedWeaponDefinitionIds.includes(selected)) {
        throw new RangeError('Arena结果页请求的武器不是本局新收藏。');
      }
      const active = this.#activeRegistryBindingFromCurrentOwner();
      if (active !== null
        && !active.collectionEquipmentDefinitionIds.includes(selected)) {
        throw new RangeError('Arena本局新收藏武器已不在active Registry，拒绝打开详情。');
      }
      return this.#openDeclaredLinkAndFinalize(
        {
          expectedRevision,
          targetScreenId: 'weapon-detail',
        },
        () => { this.#selectedWeaponDefinitionId = selected; },
      );
    }
    const selected = selectedPlayableMapDefinitionId(definitionId);
    if (!settlement.newlyCollectedMapDefinitionIds.includes(selected)) {
      throw new RangeError('Arena结果页请求的地图不是本局新收藏。');
    }
    return this.#openDeclaredLinkAndFinalize(
      {
        expectedRevision,
        targetScreenId: 'map-detail',
      },
      () => { this.#selectedMapDefinitionId = selected; },
    );
    });
  }
  openBottomNavigation(value: unknown): unknown {
    return this.#runOperation('open-bottom-navigation', () => {
      const host = this.#host();
      const wasResult = host.getInformationSnapshot().state === 'result';
      const outcome = host.openBottomNavigation(value);
      if (wasResult) this.#completeNextGoalImpression(false);
      this.#clearContinuationPreparationAfterExplicitExit();
      this.#collectCatalogImpressionForCurrentScreen();
      return outcome;
    });
  }
  selectInformationMode(value: unknown): void {
    this.#runOperation('select-mode', () => {
      this.#host();
      if (value !== 'duel' && value !== 'race' && value !== 'survival') {
        throw new RangeError('Arena local playable information mode选择无效。');
      }
      this.#clearContinuationPreparationIfGoalDrifted();
      this.#selectedModeKind = value;
    });
  }
  selectInformationCharacter(value: unknown): void {
    this.#runOperation('select-character', () => {
      this.#host();
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new TypeError('Arena local playable information character选择无效。');
      }
      const definitionExists = ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.entries.some(
        ({ definition }) => definition.id === value,
      );
      if (!definitionExists) throw new RangeError(`Arena local playable未知角色${value}。`);
      if (this.#profileOwner === null) {
        throw new Error('Arena three-mode local playable host已销毁。');
      }
      this.#clearContinuationPreparationIfGoalDrifted();
      this.#profileOwner.rewardProfileService.selectCharacter(value);
    });
  }
  selectInformationWeapon(value: unknown): void {
    this.#runOperation('select-weapon', () => {
      this.#host();
      const selected = selectedPlayableWeaponDefinitionId(value);
      const active = this.#activeRegistryBindingFromCurrentOwner();
      if (active !== null) {
        if (!active.collectionEquipmentDefinitionIds.includes(selected)) {
          throw new RangeError('Arena local playable不能选择尚未激活的Registry武器。');
        }
      }
      this.#clearContinuationPreparationIfGoalDrifted();
      this.#selectedWeaponDefinitionId = selected;
    });
  }
  selectInformationMap(value: unknown): void {
    this.#runOperation('select-map', () => {
      this.#host();
      if (typeof value !== 'string' || !ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1
        .mapDefinitions.some(({ mapDefinitionId }) => mapDefinitionId === value)) {
        throw new RangeError('Arena local playable选择的地图不在当前可玩目录中。');
      }
      this.#clearContinuationPreparationIfGoalDrifted();
      this.#selectedMapDefinitionId = value;
    });
  }
  getInformationSnapshot(): ReturnType<
    ArenaThreeModeAuthoritativePlayableHostCandidateV1['getInformationSnapshot']
  > {
    this.#assertNoOperation('getInformationSnapshot');
    return this.#readHost().getInformationSnapshot();
  }
  getInformationInteractionGateRead(
  ): ArenaThreeModeAuthoritativeLocalInformationInteractionGateReadCandidateV1 {
    const information = this.#readHost().getInformationSnapshot();
    return Object.freeze({
      information,
      learningSettlementRecovery: this.#projectLearningSettlementRecoveryReadFromOwnerRead(
        this.#learningSettlementRecoveryOwner.getRead(),
        information.modeSessionState,
      ),
    });
  }
  getInformationNavigationSelectionRead(
  ): ArenaThreeModeAuthoritativeLocalNavigationSelectionReadCandidateV1 {
    this.#readHost();
    return Object.freeze({
      selectedModeKind: this.#selectedModeKind,
      selectedWeaponDefinitionId: this.#selectedWeaponDefinitionId,
      selectedMapDefinitionId: this.#selectedMapDefinitionId,
    });
  }
  getInformationHomeNextGoalContinuationRouteRead(
  ): ArenaV2NextLearningGoalContinuationRouteV1 {
    this.#readHost();
    return this.#nextLearningGoalContinuationRouteReadFromLearningRead(
      this.#informationLearningProfileReadFromCurrentOwners(),
    ).continuation;
  }
  getMatchInputContext(): ReturnType<
    ArenaThreeModeAuthoritativePlayableHostCandidateV1['getMatchInputContext']
  > {
    this.#assertNoOperation('getMatchInputContext');
    return this.#host().getMatchInputContext();
  }
  dispatchPrimaryIntent(value: unknown): unknown {
    return this.#runOperation('dispatch-primary-intent', () => {
    const host = this.#host();
    const informationBefore = host.getInformationSnapshot();
    const wasResult = informationBefore.state === 'result';
    const rawIntentDescriptor = value !== null && typeof value === 'object'
      ? Object.getOwnPropertyDescriptor(value, 'intentId')
      : undefined;
    const resultDecisionDescriptor = value !== null && typeof value === 'object'
      ? Object.getOwnPropertyDescriptor(value, 'resultDecision')
      : undefined;
    const selectedNextGoal = wasResult
      && resultDecisionDescriptor !== undefined
      && Object.hasOwn(resultDecisionDescriptor, 'value')
      && resultDecisionDescriptor.value === 'next-goal';
    let clickLearningRead:
      ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1 | null = null;
    let clickLearningSettlement: ArenaV2LearningSettlementProjectionV1 | null = null;
    let clickLearningSettlementCaptured = false;
    let clickResultRouteFit: ArenaV2ResultNextGoalRouteFitV1 | null = null;
    let clickResultRouteFitCaptured = false;
    const readClickLearning = (
    ): ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1 => {
      clickLearningRead ??= this.#informationLearningProfileReadFromCurrentOwners();
      return clickLearningRead;
    };
    const readClickLearningSettlement = (
    ): ArenaV2LearningSettlementProjectionV1 | null => {
      if (!clickLearningSettlementCaptured) {
        clickLearningSettlement = this.#learningSettlementRecoveryOwner.getSettlement();
        clickLearningSettlementCaptured = true;
      }
      return clickLearningSettlement;
    };
    const readClickResultRouteFit = (): ArenaV2ResultNextGoalRouteFitV1 | null => {
      if (!clickResultRouteFitCaptured) {
        const settlement = readClickLearningSettlement();
        clickResultRouteFit = settlement === null
          ? null
          : this.#resultNextGoalRouteFitFromRead(settlement, readClickLearning());
        clickResultRouteFitCaptured = true;
      }
      return clickResultRouteFit;
    };
    const requireClickResultRouteFit = (
      missingSettlementMessage: string,
    ): ArenaV2ResultNextGoalRouteFitV1 => {
      const routeFit = readClickResultRouteFit();
      if (routeFit === null) throw new Error(missingSettlementMessage);
      return routeFit;
    };
    const continuationPreparationGoalDrifted = (() => {
      const accepted = this.#acceptedHomeContinuationPreparation;
      const detail = this.#pendingResultCollectionDetailPreparation;
      if (accepted === null && detail === null) return false;
      const needsResultRouteFit = accepted?.source === 'result' || detail?.source === 'result';
      const learningSettlement = needsResultRouteFit
        ? readClickLearningSettlement()
        : null;
      const settledResultRouteFit = learningSettlement === null
        ? null
        : readClickResultRouteFit();
      return this.#continuationPreparationGoalDriftedFromRead(
        readClickLearning(),
        learningSettlement,
        settledResultRouteFit,
      );
    })();
    const acceptsHomeContinuation = informationBefore.navigation.currentScreenId === 'home'
      && rawIntentDescriptor !== undefined
      && Object.hasOwn(rawIntentDescriptor, 'value')
      && rawIntentDescriptor.value === 'open-mode-select';
    const acceptsResultCollectionDetailPreparation =
      this.#pendingResultCollectionDetailPreparation !== null
      && !continuationPreparationGoalDrifted
      && ((informationBefore.navigation.currentScreenId === 'weapon-detail'
          && rawIntentDescriptor?.value === 'use-selected-weapon-next-match')
        || (informationBefore.navigation.currentScreenId === 'map-detail'
          && rawIntentDescriptor?.value === 'use-selected-map-next-match'));
    const acceptedResultCollectionDetailReturnPreparation =
      acceptsResultCollectionDetailPreparation
        ? this.#revalidateResultCollectionDetailPreparation(
          this.#pendingResultCollectionDetailPreparation!,
          requireClickResultRouteFit('Arena结果页收藏详情承接必须等待权威结算完成。'),
        )
        : null;
    const homeContinuationRead = acceptsHomeContinuation
      ? this.#nextLearningGoalContinuationRouteReadFromLearningRead(readClickLearning())
      : null;
    const homeContinuation = homeContinuationRead?.continuation ?? null;
    const homeFullCatalogReplayCombination =
      homeContinuationRead?.fullCatalogReplayCombination ?? null;
    const homeContinuationRoute = homeContinuation === null
      ? null
      : this.#resolveHomeNextGoalContinuationNavigationRoute(
        homeContinuation,
        homeContinuationRead!.eligibleWeaponDefinitionIds,
        homeFullCatalogReplayCombination,
      );
    const acceptedHomeContinuationPreparation = homeContinuation === null
      ? null
      : this.#captureHomeContinuationPreparation(
        homeContinuation,
        'home',
        homeContinuationRead!.profileRevision,
        homeFullCatalogReplayCombination,
      );
    let acceptedHomeContinuationObservation:
      PendingHomeContinuationFollowObservationV1 | null = null;
    if (homeContinuation !== null) {
      try {
        acceptedHomeContinuationObservation =
          this.#captureHomeContinuationFollowObservation(
            homeContinuation,
            homeContinuationRead!.profileRevision,
            homeFullCatalogReplayCombination,
          );
      } catch (error) {
        this.#lastRetentionObservationError = error;
      }
    }
    this.#assertRenderedHomeContinuationRouteIdentity(value, homeContinuation);
    this.#assertRenderedHomeReplayCombinationIdentity(
      value,
      homeFullCatalogReplayCombination,
    );
    const resultRecommendationKindDescriptor = value !== null && typeof value === 'object'
      ? Object.getOwnPropertyDescriptor(value, 'expectedResultRecommendationKind')
      : undefined;
    const resultRecommendationKind = resultRecommendationKindDescriptor !== undefined
      && Object.hasOwn(resultRecommendationKindDescriptor, 'value')
      ? resultRecommendationKindDescriptor.value
      : null;
    let settledResultRouteFit: ArenaV2ResultNextGoalRouteFitV1 | null = null;
    let nextGoalRoute: NextGoalNavigationRouteV1 | null = null;
    if (selectedNextGoal) {
      settledResultRouteFit = requireClickResultRouteFit(
        'Arena结果页下一目标导航必须等待权威结算完成。',
      );
      nextGoalRoute = resultRecommendationKind === 'prepare-next-goal'
        ? this.#resolveDefaultGoalAlignedPreparationRoute(settledResultRouteFit)
        : this.#resolveNextGoalNavigationRoute(settledResultRouteFit);
    }
    const navigationIntent = this.#navigationPrimaryIntent(value, nextGoalRoute);
    const intentId = ownDataField(
      navigationIntent,
      'intentId',
      'Arena local playable normalized primary intent',
    );
    const resultDecision = ownDataField(
      navigationIntent,
      'resultDecision',
      'Arena local playable normalized primary intent',
    );
    this.#assertRenderedResultRouteIdentity(value, resultDecision, nextGoalRoute);
    const acceptedGoalAlignedPlayAgainPreparation = wasResult
      ? this.#captureGoalAlignedPlayAgainPreparation(
        value,
        resultDecision,
        () => requireClickResultRouteFit(
          'Arena目标对齐复玩必须等待权威结算完成。',
        ),
      )
      : null;
    const acceptedResultContinuationPreparation = selectedNextGoal
      && settledResultRouteFit !== null
      && nextGoalRoute !== null
      && nextGoalRoute.targetScreenId === 'mode-select'
      && (resultRecommendationKind === 'prepare-next-goal'
        || resultRecommendationKind === 'next-goal')
      ? this.#captureResultGoalContinuationPreparation(
        settledResultRouteFit,
        nextGoalRoute,
      )
      : null;
    const acceptedResultCollectionDetailPreparation = selectedNextGoal
      && settledResultRouteFit !== null
      && nextGoalRoute !== null
      && (resultRecommendationKind === 'next-weapon'
        || resultRecommendationKind === 'next-map'
        || (resultRecommendationKind === 'next-goal'
          && (nextGoalRoute.targetScreenId === 'weapon-detail'
            || nextGoalRoute.targetScreenId === 'map-detail')))
      ? this.#captureResultCollectionDetailPreparation(
        settledResultRouteFit,
        nextGoalRoute,
        resultRecommendationKind === 'next-goal'
          ? nextGoalRoute.targetScreenId === 'weapon-detail'
            ? 'next-weapon'
            : 'next-map'
          : resultRecommendationKind,
      )
      : null;
    const playAgainContinuity = intentId === 'play-again-or-next'
      && resultDecision === 'play-again'
      ? captureArenaV2ResultPlayAgainContentContinuityCandidateV1({
        previousModeKind: this.#selectedModeKind,
        requestedModeKind: ownDataField(
          navigationIntent,
          'selectedModeKind',
          'Arena local playable normalized primary intent',
        ),
        weaponDefinitionId: this.#selectedWeaponDefinitionId,
        mapDefinitionId: this.#selectedMapDefinitionId,
      })
      : null;
    const startsMatch = (typeof intentId === 'string'
      && LOCAL_MATCH_START_INTENT_IDS.has(intentId))
      || (intentId === 'play-again-or-next' && resultDecision === 'play-again');
    if (startsMatch
      && (this.#pendingRetentionActionRetry !== null
        || this.#pendingCatalogRetentionWorkBatch !== null
        || this.#pendingSettlementRetentionWorkBatch !== null
        || this.#pendingNextGoalCaptureDebt !== null)) {
      throw this.#lastRetentionObservationError
        ?? new Error('Arena新局开始前必须排空上一批留存工作。');
    }
    if (continuationPreparationGoalDrifted) {
      this.#clearContinuationPreparationAfterExplicitExit();
    }
    if (playAgainContinuity !== null) {
      if (!wasResult || this.#playAgainContentContinuityLock !== null) {
        throw new Error('Arena再来一局内容连续性只能从结果页单次建立。');
      }
      this.#playAgainContentContinuityLock = playAgainContinuity;
    }
    let matchStartLearningSettlementBaseline: unknown | null = null;
    let matchStartLearningGoalAttempt: ArenaV2NextLearningGoalV1 | null = null;
    if (startsMatch) {
      try {
        this.#learningSettlementRecoveryOwner.assertCanStartMatch();
        if (this.#profileOwner === null) {
          throw new Error('Arena three-mode local playable host已销毁。');
        }
        const matchStartLearningRead = readClickLearning();
        matchStartLearningSettlementBaseline = matchStartLearningRead.profile;
        matchStartLearningGoalAttempt = this.#resolveNextLearningGoalWithWeaponScope(
          matchStartLearningRead.profile,
          matchStartLearningRead.eligibleWeaponDefinitionIds,
        );
        this.#learningSettlementIntentJournal.captureMatchStartBaseline(
          matchStartLearningSettlementBaseline,
        );
        this.#learningSettlementRecoveryOwner.captureMatchStartBaseline(
          matchStartLearningSettlementBaseline,
        );
      } catch (error) {
        this.#playAgainContentContinuityLock = null;
        return this.#failIndeterminateMatchStart(
          matchStartLearningSettlementBaseline,
          error,
        );
      }
    }
    const parsedOutcome = (() => {
      try {
        const outcome = host.dispatchPrimaryIntent(navigationIntent);
        const outer = assertPlainRecord(outcome, 'Arena local playable primary outcome');
        const information = assertPlainRecord(
          ownDataField(outer, 'information', 'Arena local playable primary outcome'),
          'Arena local playable primary information',
        );
        const matchStart = ownDataField(
          information,
          'matchStart',
          'Arena local playable primary information',
        );
        const matchPresentation = ownDataField(
          information,
          'matchPresentation',
          'Arena local playable primary information',
        );
        return Object.freeze({ outcome, information, matchStart, matchPresentation });
      } catch (error) {
        if (startsMatch) {
          return this.#failIndeterminateMatchStart(
            matchStartLearningSettlementBaseline,
            error,
          );
        }
        throw error;
      } finally {
        this.#playAgainContentContinuityLock = null;
      }
    })();
    const { outcome, information, matchStart, matchPresentation } = parsedOutcome;
    if (startsMatch && matchStart === null) {
      return this.#failIndeterminateMatchStart(
        matchStartLearningSettlementBaseline,
        new Error('Arena开局意图未返回Match Start，结果状态不确定。'),
      );
    }
    if (matchStart !== null) {
      if (matchStartLearningSettlementBaseline === null) {
        return this.#failIndeterminateMatchStart(
          matchStartLearningSettlementBaseline,
          new Error('Arena开局缺少状态变更前捕获的Learning Profile基线。'),
        );
      }
      if (matchStartLearningGoalAttempt === null) {
        return this.#failIndeterminateMatchStart(
          matchStartLearningSettlementBaseline,
          new Error('Arena开局缺少同一Learning与Registry快照解析的学习目标。'),
        );
      }
      const selectedModeKind = (():
        'duel' | 'race' | 'survival' => {
        try {
          const snapshot = assertPlainRecord(
            ownDataField(information, 'snapshot', 'Arena local playable primary information'),
            'Arena local playable primary information snapshot',
          );
          const candidate = ownDataField(
            snapshot,
            'selectedModeKind',
            'Arena local playable primary information snapshot',
          );
          if (candidate !== 'duel' && candidate !== 'race' && candidate !== 'survival') {
            throw new RangeError('Arena local playable开局后selectedModeKind无效。');
          }
          return candidate;
        } catch (error) {
          return this.#failIndeterminateMatchStart(
            matchStartLearningSettlementBaseline,
            error,
          );
        }
      })();
      if (playAgainContinuity !== null) {
        try {
          assertArenaV2ResultPlayAgainContentContinuityCandidateV1(
            playAgainContinuity,
            {
              schemaVersion: 1,
              modeKind: selectedModeKind,
              weaponDefinitionId: this.#selectedWeaponDefinitionId,
              mapDefinitionId: this.#selectedMapDefinitionId,
            },
          );
        } catch (error) {
          return this.#failIndeterminateMatchStart(
            matchStartLearningSettlementBaseline,
            error,
          );
        }
      }
      this.#selectedModeKind = selectedModeKind;
      if (acceptedGoalAlignedPlayAgainPreparation !== null) {
        this.#acceptedHomeContinuationPreparation =
          acceptedGoalAlignedPlayAgainPreparation;
        this.#pendingResultCollectionDetailPreparation = null;
      }
      this.#captureHomeContinuationMatchReceipt(matchPresentation);
      this.#matchStartLearningGoalAttempt = matchStartLearningGoalAttempt;
      let learningFocusCaptureError: unknown = null;
      try {
        this.#pendingWeaponResearchFocusObservation =
          this.#captureWeaponResearchFocusObservation(matchStartLearningGoalAttempt);
      } catch (error) {
        this.#pendingWeaponResearchFocusObservation = null;
        learningFocusCaptureError = error;
      }
      try {
        this.#pendingMapLearningFocusObservation =
          this.#captureMapLearningFocusObservation(matchStartLearningGoalAttempt);
      } catch (error) {
        this.#pendingMapLearningFocusObservation = null;
        learningFocusCaptureError ??= error;
      }
      this.#lastRetentionObservationError = learningFocusCaptureError;
      this.#completeHomeContinuationFollowObservation(matchPresentation);
      this.#acceptedHomeContinuationPreparation = null;
      this.#pendingResultCollectionDetailPreparation = null;
      this.#terminalProductResult = null;
      this.#terminalLocalParticipantId = null;
      this.#rewardSettlementProjection = null;
      this.#rewardSettlementProjectionError = null;
    }
    if (nextGoalRoute !== null) {
      this.#applyNextGoalNavigationRoute(nextGoalRoute);
      if (acceptedResultContinuationPreparation !== null) {
        this.#acceptedHomeContinuationPreparation =
          acceptedResultContinuationPreparation;
        this.#pendingResultCollectionDetailPreparation = null;
        this.#completeHomeContinuationFollowObservation(null);
      } else if (acceptedResultCollectionDetailPreparation !== null) {
        this.#acceptedHomeContinuationPreparation = null;
        this.#pendingResultCollectionDetailPreparation =
          acceptedResultCollectionDetailPreparation;
      }
    }
    if (acceptedResultCollectionDetailReturnPreparation !== null) {
      this.#acceptedHomeContinuationPreparation =
        acceptedResultCollectionDetailReturnPreparation;
      this.#pendingResultCollectionDetailPreparation = null;
    }
    if (homeContinuationRoute !== null) {
      this.#applyNextGoalNavigationRoute(homeContinuationRoute);
      this.#acceptedHomeContinuationPreparation = acceptedHomeContinuationPreparation;
      this.#pendingResultCollectionDetailPreparation = null;
      const previousObservationCompleted =
        this.#completeHomeContinuationFollowObservation(null);
      if (previousObservationCompleted) {
        this.#pendingHomeContinuationFollowObservation =
          acceptedHomeContinuationObservation;
      }
    }
    if (wasResult) {
      this.#completeNextGoalImpression(
        selectedNextGoal || acceptedGoalAlignedPlayAgainPreparation !== null,
      );
    }
    this.#collectCatalogImpressionForCurrentScreen();
    return outcome;
    });
  }
  stepMatch(value: unknown): unknown {
    return this.#runOperation('step-match', () => {
      const outcome = this.#host().stepMatch(value);
      const terminal = terminalProductResultProjection(outcome);
      if (terminal !== null) {
        this.#terminalProductResult = terminal.productResult;
        this.#terminalLocalParticipantId = terminal.localParticipantId;
      }
      return outcome;
    });
  }
  pauseMatch(): unknown {
    return this.#runOperation('pause-match', () => this.#host().pauseMatch());
  }
  resumeMatch(): unknown {
    return this.#runOperation('resume-match', () => this.#host().resumeMatch());
  }
  settleMatch(): unknown {
    return this.#runOperation('settle-match', () => this.#settleMatch());
  }

  #settleMatch(): unknown {
    let outcome: unknown;
    try {
      if (this.#settlementIntentJournalFailure !== null) {
        throw this.#settlementIntentJournalFailure;
      }
      outcome = this.#ownedHost().settleMatch();
    } catch (error) {
      if (this.#learningSettlementRecoveryOwner.getRead().retryRequired) {
        return this.#handlePendingSettlementFailure(error);
      }
      throw error;
    }
    const rawSettlement = learningSettlementProjection(outcome);
    const grant = learningGrantFromSettlement(outcome);
    try {
      if (this.#terminalProductResult === null || this.#terminalLocalParticipantId === null) {
        throw new Error('Arena奖励明细投影缺少终局Result或本地参与者。');
      }
      this.#rewardSettlementProjection =
        projectArenaV2ModeRewardSettlementInformationCandidateV1({
          registry: createArenaV2ThreeModeRewardRegistryCandidateV1({
            duelModeDefinitionId: MODE_IDS.duel,
            raceModeDefinitionId: MODE_IDS.race,
            survivalModeDefinitionId: MODE_IDS.survival,
          }),
          profileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
          result: this.#terminalProductResult,
          recipientParticipantId: this.#terminalLocalParticipantId,
          rewardOutcome: rewardOutcomeFromSettlement(outcome),
        });
      this.#rewardSettlementProjectionError = null;
    } catch (error) {
      this.#rewardSettlementProjection = null;
      this.#rewardSettlementProjectionError = error;
    }
    try {
      this.#learningSettlementRecoveryOwner.completeSettlement(rawSettlement, grant);
    } catch (error) {
      return this.#handlePendingSettlementFailure(error);
    }
    const recoveryRead = this.#learningSettlementRecoveryOwner.getRead();
    if (recoveryRead.retryRequired && recoveryRead.lastError !== null) {
      return this.#handlePendingSettlementFailure(recoveryRead.lastError);
    }
    if (!recoveryRead.pendingBaselineCaptured && !recoveryRead.pendingGrantCaptured) {
      this.#acknowledgeSettlementIntent(
        rewardGrantIdFromSettlement(outcome),
        learningGrantIdFromSettlement(outcome),
      );
    }
    return outcome;
  }

  #projectLearningSettlementRecoveryReadFromOwnerRead(
    recovery: ReturnType<ArenaV2LearningSettlementRecoveryOwnerCandidateV1['getRead']>,
    modeSessionState: ReturnType<
      ArenaThreeModeAuthoritativePlayableHostCandidateV1['getInformationSnapshot']
    >['modeSessionState'],
  ): ArenaThreeModeAuthoritativeLocalLearningSettlementRecoveryReadCandidateV1 {
    const journal = this.#learningSettlementIntentJournal.getSnapshot();
    return Object.freeze({
      ...recovery,
      persistentIntentPending: journal.pendingBaselineCaptured,
      restartRequired: this.#settlementIntentJournalFailure !== null
        || settlementErrorRequiresRestart(recovery.lastError)
        || (recovery.retryRequired
          && (this.#profileOwner?.learningProfileService.state === 'failed'
            || this.#profileOwner?.rewardProfileService.state === 'failed')),
      journalLifecycle: journal.lifecycle,
      lastJournalError: this.#settlementIntentJournalFailure,
      startupRecoveryStatus: this.#startupSettlementRecoveryNotice?.status ?? 'none',
      startupDiscardReason: this.#startupSettlementRecoveryNotice?.reason ?? null,
      restartReason: this.#settlementRestartReason
        ?? (settlementErrorRequiresRestart(recovery.lastError)
          || (recovery.retryRequired
            && (this.#profileOwner?.learningProfileService.state === 'failed'
              || this.#profileOwner?.rewardProfileService.state === 'failed'))
          ? 'profile-write-indeterminate'
          : null),
      pendingPhase: !recovery.retryRequired
        ? null
        : this.#startupSettlementRecoveryNotice?.status === 'recovery-retry-required'
          ? 'learning'
          : modeSessionState === 'reward-pending'
          ? 'reward'
          : modeSessionState === 'learning-pending'
            ? 'learning'
            : 'projection',
    });
  }

  getLearningSettlementRecoveryRead(
  ): ArenaThreeModeAuthoritativeLocalLearningSettlementRecoveryReadCandidateV1 {
    this.#assertNoOperation('getLearningSettlementRecoveryRead');
    const modeSessionState = this.#readHost().getInformationSnapshot().modeSessionState;
    return this.#projectLearningSettlementRecoveryReadFromOwnerRead(
      this.#learningSettlementRecoveryOwner.getRead(),
      modeSessionState,
    );
  }

  retryLearningSettlementProjectionRecovery(): ArenaV2LearningSettlementProjectionV1 {
    return this.#runOperation('retry-settlement-recovery', () => {
    const host = this.#readHost();
    const information = host.getInformationSnapshot();
    const recovery = this.#projectLearningSettlementRecoveryReadFromOwnerRead(
      this.#learningSettlementRecoveryOwner.getRead(),
      information.modeSessionState,
    );
    if (recovery.restartRequired) {
      throw new Error('Arena Learning结算写入状态不确定，必须重启后恢复。');
    }
    if (recovery.startupRecoveryStatus === 'recovery-retry-required') {
      if (this.#profileOwner === null) {
        throw new Error('Arena启动结算恢复缺少Profile owner。');
      }
      let recovered: ReturnType<
        ArenaV2LearningSettlementIntentJournalCandidateV1['recoverPending']
      >;
      try {
        recovered = this.#learningSettlementIntentJournal.recoverPending(
          this.#profileOwner.rewardProfileService,
          this.#profileOwner.learningProfileService,
        );
      } catch (error) {
        return this.#failSettlementRecovery(error);
      }
      if (recovered === null || recovered.status === 'discarded-before-reward') {
        return this.#failSettlementRecovery(
          new Error('Arena启动结算恢复的持久意图在显式重试期间漂移。'),
        );
      }
      this.#startupSettlementRecoveryNotice = Object.freeze({
        status: recovered.status,
        reason: recovered.status === 'recovered-after-reward' ? null : recovered.reason,
      });
      if (recovered.status === 'recovery-retry-required') {
        this.#learningSettlementRecoveryOwner.retainPendingSettlementFailure(
          recovered.recoveryError,
        );
        throw recovered.recoveryError;
      }
      if (recovered.status === 'recovery-restart-required') {
        const failure = new Error(
          'Arena Reward已存在，但Learning启动恢复结果无法确认；已保留结算意图，需再次重启恢复。',
          { cause: recovered.recoveryError },
        );
        this.#learningSettlementRecoveryOwner.retainPendingSettlementFailure(failure);
        this.#settlementIntentJournalFailure = failure;
        this.#settlementRestartReason = 'profile-write-indeterminate';
        throw failure;
      }
      if (!('settlement' in recovered)) {
        throw new RangeError('Arena启动结算恢复缺少可完成的Learning结算。');
      }
      try {
        const settlement = this.#learningSettlementRecoveryOwner.completeSettlement(
          recovered.settlement,
          recovered.learningGrant,
        );
        this.#startupSettlementRecoveryNotice = Object.freeze({
          status: 'recovered-after-reward' as const,
          reason: null,
        });
        try {
          this.#acknowledgeSettlementIntent(
            recovered.rewardGrant.grantId,
            recovered.learningGrant.grantId,
          );
        } catch (error) {
          if (error !== this.#settlementIntentJournalFailure) {
            return this.#failSettlementRecovery(error);
          }
          throw error;
        }
        return settlement;
      } catch (error) {
        if (error === this.#settlementIntentJournalFailure) throw error;
        return this.#failSettlementRecovery(error);
      }
    }
    if (information.state === 'result'
      && (information.modeSessionState === 'reward-pending'
        || information.modeSessionState === 'learning-pending')) {
      const outcome = this.#settleMatch();
      return learningSettlementProjection(outcome);
    }
    let settlement: ArenaV2LearningSettlementProjectionV1;
    try {
      settlement = this.#learningSettlementRecoveryOwner.retry();
    } catch (error) {
      return this.#handlePendingSettlementFailure(error);
    }
    const journal = this.#learningSettlementIntentJournal.getSnapshot();
    if (journal.pendingRewardGrantId === null || journal.pendingLearningGrantId === null) {
      throw new Error('Arena Learning恢复完成后缺少持久结算意图身份。');
    }
    this.#acknowledgeSettlementIntent(
      journal.pendingRewardGrantId,
      journal.pendingLearningGrantId,
    );
    return settlement;
    });
  }
  updatePreferences(value: unknown): void {
    this.#runOperation('update-preferences', () => this.#host().updatePreferences(value));
  }

  getInformationPresentationPreferencesRead(): Readonly<{
    readonly soundEnabled: boolean;
    readonly reducedMotion: boolean;
  }> {
    this.#assertNoOperation('getInformationPresentationPreferencesRead');
    return this.#readHost().getPreferencesRead();
  }

  getInformationCharacterPreviewLoadoutRead():
  ArenaThreeModeAuthoritativeLocalCharacterPreviewLoadoutReadCandidateV1 {
    this.#assertNoOperation('getInformationCharacterPreviewLoadoutRead');
    this.#assertBusinessOpen('Arena three-mode local playable host角色预览装备读取');
    const selectedModeKind = this.#selectedModeKind ?? 'duel';
    const selectedCharacterDefinitionId =
      this.#rewardProfileSnapshotFromCurrentOwner().selection.characterId;
    const matchStartsUnarmed = selectedModeKind === 'survival';
    if (!matchStartsUnarmed) {
      const activeRegistry = this.#activeRegistryBindingFromCurrentOwner();
      if (activeRegistry !== null
        && !activeRegistry.collectionEquipmentDefinitionIds.includes(
          this.#selectedWeaponDefinitionId,
        )) {
        throw new RangeError('Arena角色预览的已选武器已脱离当前Registry。');
      }
    }
    return Object.freeze({
      schemaVersion: 1 as const,
      selectedModeKind,
      selectedCharacterDefinitionId,
      previewWeaponDefinitionId: matchStartsUnarmed
        ? null
        : this.#selectedWeaponDefinitionId,
      matchStartsUnarmed,
    });
  }

  #projectInformationLearningFromRead(
    selection: Readonly<{
      readonly selectedWeaponDefinitionId: unknown;
      readonly selectedMapDefinitionId: unknown;
    }>,
    learningRead: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1,
    learningSettlement: ArenaV2LearningSettlementProjectionV1 | null,
  ): ReturnType<typeof projectArenaV2LearningInformationV1> {
    const collectionContent = projectArenaV2InformationCollectionContentV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
    );
    const weaponDisplayNames = collectionContent.weapons.map(({
      weaponDefinitionId,
      displayName,
    }) => Object.freeze({
      weaponDefinitionId,
      displayName,
    }));
    const mapDisplayNames = collectionContent.maps.map((map) => Object.freeze({
      mapDefinitionId: map.mapDefinitionId,
      displayName: map.displayName,
      segments: Object.freeze(map.segments.map((segment) => Object.freeze({
        segmentDefinitionId: segment.segmentDefinitionId,
        displayName: segment.displayName,
      }))),
    }));
    return projectArenaV2LearningInformationV1({
      profileDefinition: learningRead.profileDefinition,
      profile: learningRead.profile,
      selectedWeaponDefinitionId: selection.selectedWeaponDefinitionId,
      selectedMapDefinitionId: selection.selectedMapDefinitionId,
      settlement: learningSettlement,
      attemptedGoal: this.#matchStartLearningGoalAttempt,
      eligibleWeaponDefinitionIds: learningRead.eligibleWeaponDefinitionIds === null
        ? undefined
        : learningRead.eligibleWeaponDefinitionIds,
      weaponDisplayNames,
      mapDisplayNames,
    });
  }

  getInformationProfileProjection(
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options = {},
  ): ReturnType<typeof projectArenaV2LearningInformationV1> {
    this.#readHost();
    const requested = localInformationProjectionSelection(value);
    const selection = Object.freeze({
      selectedWeaponDefinitionId: !Object.hasOwn(value, 'selectedWeaponDefinitionId')
        ? this.#selectedWeaponDefinitionId
        : requested.selectedWeaponDefinitionId,
      selectedMapDefinitionId: !Object.hasOwn(value, 'selectedMapDefinitionId')
        ? this.#selectedMapDefinitionId
        : requested.selectedMapDefinitionId,
    });
    return this.#projectInformationLearningFromRead(
      selection,
      this.#informationLearningProfileReadFromCurrentOwners(),
      this.#learningSettlementRecoveryOwner.getSettlement(),
    );
  }

  getInformationNextLearningGoalRead(
  ): ReturnType<typeof resolveArenaV2NextLearningGoalV1> {
    this.#readHost();
    const learningRead = this.#informationLearningProfileReadFromCurrentOwners();
    return this.#resolveNextLearningGoalWithWeaponScope(
      learningRead.profile,
      learningRead.eligibleWeaponDefinitionIds,
    );
  }

  getInformationLearningProfileRead(
  ): ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1 {
    this.#readHost();
    return this.#informationLearningProfileReadFromCurrentOwners();
  }

  #informationLearningProfileReadFromCurrentOwners(
  ): ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1 {
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    const activeRegistry = this.#activeRegistryBindingFromCurrentOwner();
    return Object.freeze({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      profile: this.#learningProfileSnapshotFromCurrentOwner(),
      eligibleWeaponDefinitionIds: activeRegistry === null
        ? null
        : Object.freeze([...activeRegistry.collectionEquipmentDefinitionIds]),
    });
  }

  getInformationCollectionRead(
  ): ArenaThreeModeAuthoritativeLocalCollectionReadCandidateV1 {
    this.#readHost();
    return Object.freeze({
      learningProfile: this.#informationLearningProfileReadFromCurrentOwners(),
      collectionContent: projectArenaV2InformationCollectionContentV1(
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
        ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      ),
      selectedWeaponDefinitionId: this.#selectedWeaponDefinitionId,
      selectedMapDefinitionId: this.#selectedMapDefinitionId,
    });
  }

  getInformationProfileProjections(
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options = {},
  ): Readonly<{
      readonly reward: ReturnType<typeof projectArenaV2RewardProfileInformationCandidateV1>;
      readonly learning: ReturnType<typeof projectArenaV2LearningInformationV1>;
    }> {
    this.#readHost();
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    return this.#projectInformationProfileProjectionsFromReads(
      value,
      this.#rewardProfileSnapshotFromCurrentOwner(),
      this.#informationLearningProfileReadFromCurrentOwners(),
      this.#learningSettlementRecoveryOwner.getSettlement(),
    );
  }

  #projectInformationProfileProjectionsFromReads(
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options,
    rewardProfile: ReturnType<
      ArenaV2ProfileServicesOwnerCandidateV1['rewardProfileService']['getSnapshot']
    >,
    learningRead: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1,
    learningSettlement: ArenaV2LearningSettlementProjectionV1 | null,
  ): Readonly<{
    readonly reward: ReturnType<typeof projectArenaV2RewardProfileInformationCandidateV1>;
    readonly learning: ReturnType<typeof projectArenaV2LearningInformationV1>;
  }> {
    const requested = localInformationProjectionSelection(value);
    return Object.freeze({
      reward: projectArenaV2RewardProfileInformationCandidateV1({
        profileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
        profile: rewardProfile,
      }),
      learning: this.#projectInformationLearningFromRead(
        Object.freeze({
          selectedWeaponDefinitionId: !Object.hasOwn(value, 'selectedWeaponDefinitionId')
            ? this.#selectedWeaponDefinitionId
            : requested.selectedWeaponDefinitionId,
          selectedMapDefinitionId: !Object.hasOwn(value, 'selectedMapDefinitionId')
            ? this.#selectedMapDefinitionId
            : requested.selectedMapDefinitionId,
        }),
        learningRead,
        learningSettlement,
      ),
    });
  }

  getInformationProductSessionProjection(): ReturnType<
    typeof projectArenaV2ProductSessionInformationCandidateV1
  > {
    this.#readHost();
    return this.#projectInformationProductSessionFromCurrentRead();
  }

  #projectInformationProductSessionFromCurrentRead(): ReturnType<
    typeof projectArenaV2ProductSessionInformationCandidateV1
  > {
    return projectArenaV2ProductSessionInformationCandidateV1({
      selectedModeKind: this.#selectedModeKind,
      productResult: this.#terminalProductResult,
      localParticipantId: this.#terminalLocalParticipantId,
    });
  }

  getInformationModeContentProjection(): ReturnType<
    typeof projectArenaV2ModeContentInformationCandidateV1
  > {
    this.#readHost();
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    return this.#projectInformationModeContentFromProfileReads(
      this.#rewardProfileSnapshotFromCurrentOwner(),
      this.#informationLearningProfileReadFromCurrentOwners(),
      this.#learningSettlementRecoveryOwner.getSettlement(),
    );
  }

  #projectInformationModeContentFromProfileReads(
    rewardProfile: ReturnType<
      ArenaV2ProfileServicesOwnerCandidateV1['rewardProfileService']['getSnapshot']
    >,
    learningRead: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1,
    learningSettlement: ArenaV2LearningSettlementProjectionV1 | null,
  ): ReturnType<typeof projectArenaV2ModeContentInformationCandidateV1> {
    const learningProfile = learningRead.profile;
    const characterDefinitionId = rewardProfile.selection.characterId;
    const selectedWeaponMastery = learningProfile.weaponMastery.find(
      ({ weaponDefinitionId }) => weaponDefinitionId === this.#selectedWeaponDefinitionId,
    );
    const selectedWeaponCollectionTarget =
      ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1
        .masteryRequirements.weaponCollectionUseEvidence;
    const selectedMapDefinition = ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1
      .mapDefinitions.find(({ mapDefinitionId }) => (
        mapDefinitionId === this.#selectedMapDefinitionId
      ));
    if (!selectedMapDefinition) throw new RangeError('Arena当前选择地图缺少学习Definition。');
    const selectedMapCompletedSegmentCount = learningProfile.mapSegmentMastery.filter(
      (entry) => entry.mapDefinitionId === this.#selectedMapDefinitionId
        && entry.completedAtRevision !== null,
    ).length;
    const selectedModeKind = this.#selectedModeKind ?? 'duel';
    const selectedModeDefinition = ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1
      .modeDefinitions.find(({ kind }) => kind === selectedModeKind);
    if (selectedModeDefinition === undefined) {
      throw new RangeError('Arena准备页当前模式缺少Learning Definition。');
    }
    const preparationGlobalGoalFit = resolveArenaV2ResultNextGoalRouteFitV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      profile: learningProfile,
      eligibleWeaponDefinitionIds: learningRead.eligibleWeaponDefinitionIds === null
        ? undefined
        : learningRead.eligibleWeaponDefinitionIds,
      selectedWeaponDefinitionId: this.#selectedWeaponDefinitionId,
      selectedMapDefinitionId: this.#selectedMapDefinitionId,
      sourceModeDefinitionId: selectedModeDefinition.modeDefinitionId,
    });
    const preparationGlobalGoalFitKind = preparationGlobalGoalFit.kind;
    const preparationGlobalGoalFitSourceModeKind = preparationGlobalGoalFit.sourceModeKind;
    const preparationGlobalGoalFitRecommendedModeKind =
      preparationGlobalGoalFit.recommendedModeKind;
    if (preparationGlobalGoalFitKind === 'settlement-pending'
      || preparationGlobalGoalFitSourceModeKind !== selectedModeKind
      || preparationGlobalGoalFitRecommendedModeKind === null) {
      throw new RangeError('Arena准备页长期目标适配缺少当前或推荐模式身份。');
    }
    const readyPreparationGlobalGoalFit = preparationGlobalGoalFit as Exclude<
      typeof preparationGlobalGoalFit,
      { readonly kind: 'settlement-pending' }
    >;
    const continuationPreparation = this.#continuationPreparationReadFromLearningRead(
      learningRead,
      learningSettlement,
    );
    const projection = projectArenaV2ModeContentInformationCandidateV1({
      selectedModeKind,
      raceParticipantCount: this.#raceParticipantCount,
      survivalEnemyCount: this.#survivalEnemyCount,
      selectedCharacterDisplayName: selectedCharacterDisplayName(characterDefinitionId),
      selectedWeaponDefinitionId: this.#selectedWeaponDefinitionId,
      selectedWeaponDisplayName: selectedWeaponDisplayName(this.#selectedWeaponDefinitionId),
      selectedWeaponCollected: learningProfile.collections.weaponDefinitionIds.includes(
        this.#selectedWeaponDefinitionId,
      ),
      selectedWeaponCollectionEvidence: selectedWeaponMastery?.useCount ?? 0,
      selectedWeaponCollectionTarget,
      selectedMapDefinitionId: this.#selectedMapDefinitionId,
      selectedMapDisplayName: selectedMapDisplayName(this.#selectedMapDefinitionId),
      selectedMapCollected: learningProfile.collections.mapDefinitionIds.includes(
        this.#selectedMapDefinitionId,
      ),
      selectedMapCompletedSegmentCount,
      selectedMapSegmentCount: selectedMapDefinition.segmentDefinitionIds.length,
      homeContinuationPreparationState: continuationPreparation.state,
      homeContinuationPreparationSource: continuationPreparation.source,
      supplyIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
      supplySpawnCount: ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1,
      supplyLifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1,
      pressureStageIntervalTicks:
        ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1,
    });
    const preparationLearningFocus = projectArenaV2PreparationLearningFocusV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      profile: learningProfile,
      modeKind: selectedModeKind,
      weaponDefinitionId: selectedModeKind === 'survival'
        ? null
        : this.#selectedWeaponDefinitionId,
      mapDefinitionId: this.#selectedMapDefinitionId,
    });
    const focusedProjection = Object.freeze({
      ...projection,
      screens: Object.freeze(projection.screens.map((screen) => {
        const targetScreenId = selectedModeKind === 'survival'
          ? 'survival-prep'
          : 'match-prep';
        return screen.screenId !== targetScreenId
          ? screen
          : Object.freeze({
            ...screen,
            fieldSource:
              projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
                schemaVersion: 1,
                profileRevision: learningProfile.revision,
                modeKind: selectedModeKind,
                weaponDefinitionId: selectedModeKind === 'survival'
                  ? null
                  : this.#selectedWeaponDefinitionId,
                mapDefinitionId: this.#selectedMapDefinitionId,
                fieldSource: screen.fieldSource,
                focus: preparationLearningFocus,
                globalGoalFit: Object.freeze({
                  schemaVersion: 1 as const,
                  profileRevision: readyPreparationGlobalGoalFit.profileRevision,
                  kind: preparationGlobalGoalFitKind,
                  goalId: readyPreparationGlobalGoalFit.nextGoal.goalId,
                  goalActionLabel: readyPreparationGlobalGoalFit.nextGoal.actionLabel,
                  sourceModeKind: preparationGlobalGoalFitSourceModeKind,
                  recommendedModeKind: preparationGlobalGoalFitRecommendedModeKind,
                  targetWeaponDefinitionId:
                    readyPreparationGlobalGoalFit.targetWeaponDefinitionId,
                  targetMapDefinitionId: readyPreparationGlobalGoalFit.targetMapDefinitionId,
                  requiresModeChange: readyPreparationGlobalGoalFit.requiresModeChange,
                  requiresWeaponChange: readyPreparationGlobalGoalFit.requiresWeaponChange,
                  requiresMapChange: readyPreparationGlobalGoalFit.requiresMapChange,
                  deterministicCurrentReplayCanAdvance:
                    readyPreparationGlobalGoalFit.deterministicCurrentReplayCanAdvance,
                  conditionalCurrentReplayCanAdvance:
                    readyPreparationGlobalGoalFit.conditionalCurrentReplayCanAdvance,
                }),
              }),
          });
      })),
    });
    if (selectedModeKind === 'survival') return focusedProjection;
    const modeDefinition = selectedModeDefinition;
    const modeRecord = learningProfile.modeRecords.find(({ kind }) => kind === selectedModeKind);
    if (modeDefinition === undefined
      || (modeRecord !== undefined
        && modeRecord.modeDefinitionId !== modeDefinition.modeDefinitionId)) {
      throw new RangeError('Arena竞技重复挑战与Learning Profile模式身份不闭合。');
    }
    return Object.freeze({
      ...focusedProjection,
      screens: Object.freeze(focusedProjection.screens.map((screen) => (
        screen.screenId !== 'match-prep'
          ? screen
          : Object.freeze({
            ...screen,
            fieldSource:
              projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1({
                schemaVersion: 1,
                modeDefinitionId: modeDefinition.modeDefinitionId,
                modeKind: selectedModeKind,
                fieldSource: screen.fieldSource,
                bestPerformanceTicks: modeRecord?.bestPerformanceTicks ?? null,
              }),
          })
      ))),
    });
  }

  getInformationLoadingProjection(): ReturnType<
    typeof projectArenaV2LoadingInformationCandidateV1
  > {
    this.#assertNoOperation('getInformationLoadingProjection');
    this.#assertBusinessOpen('Arena three-mode local playable host Loading投影');
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    return this.#projectInformationLoadingFromCurrentRead();
  }

  #projectInformationLoadingFromCurrentRead(): ReturnType<
    typeof projectArenaV2LoadingInformationCandidateV1
  > {
    const formalAssets = ARENA_V2_FORMAL_ASSET_CONTENT_CLOSURE_CANDIDATE_V1;
    const playableImplemented = formalAssets.playableCharacterDefinitionIds.length
      - formalAssets.missingPlayableCharacterDefinitionIds.length;
    const weaponImplemented = formalAssets.equipmentDefinitionIds.length
      - formalAssets.missingEquipmentDefinitionIds.length;
    const mapImplemented = formalAssets.mapDefinitionIds.length
      - formalAssets.missingMapDefinitionIds.length;
    const approvedMapImplemented = formalAssets.mapDefinitionIds.length
      - formalAssets.unapprovedMapDefinitionIds.length;
    const weaponAudioImplemented = formalAssets.equipmentDefinitionIds.length
      - formalAssets.missingWeaponAudioDefinitionIds.length;
    const approvedWeaponAudioImplemented = formalAssets.equipmentDefinitionIds.length
      - formalAssets.unapprovedWeaponAudioDefinitionIds.length;
    const modeSupplyAudioImplemented = formalAssets.modeSupplyAudioCueIds.length
      - formalAssets.missingModeSupplyAudioCueIds.length;
    const approvedModeSupplyAudioImplemented = formalAssets.modeSupplyAudioCueIds.length
      - formalAssets.unapprovedModeSupplyAudioCueIds.length;
    const coreVfxImplemented = formalAssets.coreFeedbackVfxCueIds.length
      - formalAssets.missingCoreFeedbackVfxCueIds.length;
    const approvedCoreVfxImplemented = formalAssets.coreFeedbackVfxCueIds.length
      - formalAssets.unapprovedCoreFeedbackVfxCueIds.length;
    return projectArenaV2LoadingInformationCandidateV1({
      formalVisualAssetsReady: formalAssets.formalVisualAssetsReady,
      inputContractReady: true,
      profileRecoveryReady: true,
      diagnosticText: `正式资产仍未闭合：可玩角色轮廓${playableImplemented}/${formalAssets.playableCharacterDefinitionIds.length}，武器模型${weaponImplemented}/${formalAssets.equipmentDefinitionIds.length}，地图表现登记${mapImplemented}/${formalAssets.mapDefinitionIds.length}、批准${approvedMapImplemented}/${formalAssets.mapDefinitionIds.length}，武器音效登记${weaponAudioImplemented}/${formalAssets.equipmentDefinitionIds.length}、批准${approvedWeaponAudioImplemented}/${formalAssets.equipmentDefinitionIds.length}，模式/供给音效登记${modeSupplyAudioImplemented}/${formalAssets.modeSupplyAudioCueIds.length}、批准${approvedModeSupplyAudioImplemented}/${formalAssets.modeSupplyAudioCueIds.length}，核心VFX登记${coreVfxImplemented}/${formalAssets.coreFeedbackVfxCueIds.length}、批准${approvedCoreVfxImplemented}/${formalAssets.coreFeedbackVfxCueIds.length}。`,
    });
  }

  getInformationPageProjections(
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options = {},
  ): ArenaThreeModeAuthoritativeLocalInformationPageProjectionsCandidateV1 {
    const modeSessionState = this.#readHost().getInformationSnapshot().modeSessionState;
    return this.#informationPageProjectionsFromModeSessionState(value, modeSessionState);
  }

  #informationPageProjectionsFromModeSessionState(
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options,
    modeSessionState: ReturnType<
      ArenaThreeModeAuthoritativePlayableHostCandidateV1['getInformationSnapshot']
    >['modeSessionState'],
  ): ArenaThreeModeAuthoritativeLocalInformationPageProjectionsCandidateV1 {
    this.#assertBusinessOpen('Arena three-mode local playable host Page投影');
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    const rewardProfile = this.#rewardProfileSnapshotFromCurrentOwner();
    const learningRead = this.#informationLearningProfileReadFromCurrentOwners();
    const learningSettlementSnapshot = this.#learningSettlementRecoveryOwner.getSnapshot();
    const learningSettlement = learningSettlementSnapshot.settlement;
    const learningSettlementRecovery =
      this.#projectLearningSettlementRecoveryReadFromOwnerRead(
        learningSettlementSnapshot.read,
        modeSessionState,
      );
    return Object.freeze({
      productSession: this.#projectInformationProductSessionFromCurrentRead(),
      loading: this.#projectInformationLoadingFromCurrentRead(),
      modeContent: this.#projectInformationModeContentFromProfileReads(
        rewardProfile,
        learningRead,
        learningSettlement,
      ),
      characterContent: projectArenaV2CharacterInformationCandidateV1({
        catalog: ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1,
        messages: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
        selectedCharacterDefinitionId: rewardProfile.selection.characterId,
        profileRevision: rewardProfile.revision,
        experience: rewardProfile.progression.experience,
      }),
      collectionContent: projectArenaV2InformationCollectionContentV1(
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
        ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      ),
      profiles: this.#projectInformationProfileProjectionsFromReads(
        value,
        rewardProfile,
        learningRead,
        learningSettlement,
      ),
      profileReads: Object.freeze({
        reward: rewardProfile,
        learning: learningRead,
        learningSettlement,
        learningSettlementRecovery,
      }),
      rewardSettlement: this.#rewardSettlementProjection,
    });
  }

  #informationCurrentScreenCompositionBundle(
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options = {},
  ): ArenaThreeModeAuthoritativeLocalInformationCurrentScreenCompositionBundleCandidateV1 {
    const information = this.#readHost().getInformationSnapshot();
    return this.#informationCurrentScreenCompositionBundleFromInformation(
      value,
      information,
    );
  }

  #informationCurrentScreenCompositionBundleFromInformation(
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options,
    information: ReturnType<
      ArenaThreeModeAuthoritativePlayableHostCandidateV1['getInformationSnapshot']
    >,
  ): ArenaThreeModeAuthoritativeLocalInformationCurrentScreenCompositionBundleCandidateV1 {
    if (information.state !== 'information' && information.state !== 'result') {
      return Object.freeze({
        composition: null,
        pageProjections: null,
        homeContinuationRoute: null,
        fullCatalogReplayCombination: null,
        selection: null,
        returnScreenId: null,
        detailBrowseProjection: null,
        learningSettlementRecovery: null,
        nextLearningGoal: null,
        resultPrimaryRecommendation: null,
        resultNextGoalRecommendation: null,
        resultNewCollectionDetailItems: null,
      });
    }
    const screenId = information.navigation.currentScreenId;
    if (screenId === null) {
      return Object.freeze({
        composition: null,
        pageProjections: null,
        homeContinuationRoute: null,
        fullCatalogReplayCombination: null,
        selection: null,
        returnScreenId: null,
        detailBrowseProjection: null,
        learningSettlementRecovery: null,
        nextLearningGoal: null,
        resultPrimaryRecommendation: null,
        resultNextGoalRecommendation: null,
        resultNewCollectionDetailItems: null,
      });
    }
    const pages = this.#informationPageProjectionsFromModeSessionState(
      value,
      information.modeSessionState,
    );
    const settlementRecovery = pages.profileReads.learningSettlementRecovery;
    const settledLearning = pages.profileReads.learningSettlement;
    const resultRouteFit = screenId === 'result-reward'
      && settledLearning !== null
      && !settlementRecovery.retryRequired
      && !settlementRecovery.restartRequired
      ? this.#resultNextGoalRouteFitFromRead(
        settledLearning,
        pages.profileReads.learning,
      )
      : null;
    const resultPrimaryRecommendation = screenId !== 'result-reward'
      ? null
      : resultRouteFit === null || settledLearning === null
        ? this.#resultPrimaryRecommendationFallback()
        : this.#projectInformationResultPrimaryRecommendationFromRead(
          settledLearning,
          resultRouteFit,
        );
    const resultNextGoalRecommendation = screenId !== 'result-reward'
      ? null
      : resultRouteFit === null
        ? this.#resultNextGoalRecommendationFallback()
        : this.#projectInformationResultNextGoalRecommendationFromRead(resultRouteFit);
    const resultNewCollectionDetailItems = screenId !== 'result-reward'
      ? null
      : settledLearning === null
        || settlementRecovery.retryRequired
        || settlementRecovery.restartRequired
        ? Object.freeze([])
        : this.#projectInformationResultNewCollectionDetailItemsFromRead(
          settledLearning,
          pages.profileReads.learning,
        );
    if (screenId === 'loading') {
      return Object.freeze({
        composition: Object.freeze({
          revision: information.navigation.revision,
          screenId,
          state: pages.loading.state,
          fieldSources: Object.freeze([pages.loading.fieldSource]),
          primaryActionEnabled: pages.loading.primaryActionEnabled,
          primaryActionDisabledReasonMessageId:
            pages.loading.primaryActionDisabledReasonMessageId,
        }),
        pageProjections: pages,
        homeContinuationRoute: null,
        fullCatalogReplayCombination: null,
        selection: null,
        returnScreenId: null,
        detailBrowseProjection: null,
        learningSettlementRecovery: settlementRecovery,
        nextLearningGoal: pages.profiles.learning.nextGoal,
        resultPrimaryRecommendation: null,
        resultNextGoalRecommendation: null,
        resultNewCollectionDetailItems: null,
      });
    }
    const selection = screenId === 'mode-select' || screenId === 'character-select'
      || screenId === 'weapon-index' || screenId === 'map-index'
      ? this.#projectInformationCurrentScreenSelectionFromPageRead(
        screenId,
        value,
        pages,
      )
      : null;
    const detailBrowseProjection = screenId === 'weapon-detail' || screenId === 'map-detail'
      ? this.#projectInformationCurrentDetailBrowseFromRead(
        screenId,
        pages.profileReads.learning.eligibleWeaponDefinitionIds,
      )
      : null;
    const nextGoalContinuationRoute = screenId === 'home' || screenId === 'result-reward'
      ? resolveArenaV2NextLearningGoalContinuationRouteV1({
        profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
        nextGoal: pages.profiles.learning.nextGoal,
      })
      : null;
    const fullCatalogReplayCombination = nextGoalContinuationRoute === null
      ? null
      : this.#fullCatalogReplayCombinationFromLearningRead(
        pages.profileReads.learning,
        pages.profiles.learning.nextGoal,
      );
    const fieldSources: ArenaV2InformationFieldSourceV1[] = [];
    const append = (source: ArenaV2InformationFieldSourceV1 | undefined): void => {
      if (source !== undefined && source.fieldValues.length > 0) fieldSources.push(source);
    };

    append(pages.productSession.screens.find((screen) => (
      screen.screenId === screenId
    ))?.fieldSource);
    if (screenId === 'character-select') {
      append(pages.characterContent.fieldSource);
    } else {
      const modeContentFieldSource = pages.modeContent.screens.find((screen) => (
        screen.screenId === screenId
      ))?.fieldSource;
      append(screenId === 'mode-select' && modeContentFieldSource !== undefined
        ? projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1({
          schemaVersion: 1,
          fieldSource: modeContentFieldSource,
          selectedModeKind: pages.modeContent.selectedModeKind,
          nextGoal: pages.profiles.learning.nextGoal,
          summary: pages.profiles.learning.homeRecordSummary,
        })
        : modeContentFieldSource);
    }
    const rewardPatch = pages.profiles.reward.screens.find((screen) => (
      screen.screenId === screenId
    ));
    if (screenId !== 'character-select'
      && rewardPatch !== undefined && rewardPatch.fieldValues.length > 0) {
      const rewardFieldSource = profileFieldSource(
        'p6-reward-profile',
        rewardPatch.fieldValues,
      );
      append(screenId === 'home'
        ? projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1({
          schemaVersion: 1,
          fieldSource: rewardFieldSource,
          summary: pages.profiles.learning.homeRecordSummary,
        })
        : rewardFieldSource);
    }
    const learningPatch = pages.profiles.learning.screens.find((screen) => (
      screen.screenId === screenId
    ));
    if (learningPatch !== undefined && learningPatch.fieldValues.length > 0) {
      const learningFieldSource = profileFieldSource(
        'p6-learning-profile',
        learningPatch.fieldValues,
      );
      const projectedLearningFieldSource = screenId === 'weapon-index'
        ? projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1({
          schemaVersion: 1,
          fieldSource: learningFieldSource,
          availabilityChange:
            localInformationProjectionSelection(value).weaponAvailabilityChange,
          collectedWeaponDefinitionIds:
            pages.profileReads.learning.profile.collections.weaponDefinitionIds,
        })
        : screenId === 'survival-prep'
          ? projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1({
            schemaVersion: 1,
            fieldSource: learningFieldSource,
            bestSurvivalTicks: pages.profileReads.learning.profile.modeRecords.find(
              ({ kind }) => kind === 'survival',
            )?.bestPerformanceTicks ?? null,
          })
          : screenId === 'home'
            ? (() => {
              const nextGoal = pages.profiles.learning.nextGoal;
              if (nextGoalContinuationRoute === null) {
                throw new Error('Arena首页字段组合缺少同批次续玩路由。');
              }
              return projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1({
                schemaVersion: 1,
                fieldSource: learningFieldSource,
                weaponDefinitionId: nextGoal.weaponDefinitionId,
                mapDefinitionId: nextGoal.mapDefinitionId,
                segmentDefinitionId: nextGoal.segmentDefinitionId,
                continuationRoute: nextGoalContinuationRoute,
                fullCatalogReplayCombination,
              });
            })()
            : screenId === 'result-reward'
              ? (() => {
                if (nextGoalContinuationRoute === null) {
                  throw new Error('Arena结果页复练组合缺少同批次续玩路由。');
                }
                return this.#projectHomeContinuationMatchReceipt(
                  projectArenaV2FullCatalogReplayCombinationInformationFieldSourceCandidateV1({
                    schemaVersion: 1,
                    fieldSource: learningFieldSource,
                    continuationRoute: nextGoalContinuationRoute,
                    fullCatalogReplayCombination,
                  }),
                );
              })()
              : learningFieldSource;
      append(projectedLearningFieldSource);
    }
    if (screenId === 'result-reward' && pages.rewardSettlement !== null) {
      append(profileFieldSource(
        'p6-mode-reward-settlement',
        pages.rewardSettlement.fieldValues,
      ));
    } else if (screenId === 'result-reward') {
      const projectionFailed = this.#rewardSettlementProjectionError !== null;
      append(profileFieldSource('p6-mode-reward-settlement', Object.freeze([Object.freeze({
        fieldId: 'reward-breakdown',
        labelMessageId: 'arena.v2.field.reward-breakdown',
        valueText: projectionFailed
          ? '奖励已安全结算；明细投影暂不可用，不影响已获得进度'
          : '奖励明细等待权威结算',
        accessibilityText: projectionFailed
          ? '奖励已经安全结算。明细暂时不可用，但不会影响已经获得的进度。'
          : '奖励明细正在等待权威结算。',
        fixedWidthNumeric: false,
      })])));
    }
    if (screenId === 'home' && settlementRecovery.startupRecoveryStatus !== 'none') {
      const recovered = settlementRecovery.startupRecoveryStatus === 'recovered-after-reward';
      const recoveryRetry = settlementRecovery.startupRecoveryStatus
        === 'recovery-retry-required';
      const recoveryDeferred = settlementRecovery.startupRecoveryStatus
        === 'recovery-restart-required';
      const baselineOnly = settlementRecovery.startupDiscardReason === 'baseline-only';
      append(profileFieldSource('p6-startup-settlement-recovery', Object.freeze([
        Object.freeze({
          fieldId: 'recovery-status',
          labelMessageId: 'arena.v2.field.recovery-status',
          valueText: recovered
            ? '检测到上次结算中断：奖励已存在，成长已安全恢复，不会重复累计'
            : recoveryRetry
              ? '奖励已存在，成长恢复暂时繁忙；点击“选择模式”会先安全重试，不会重复累计'
            : recoveryDeferred
              ? '奖励已存在，但成长恢复仍未完成；结算证据已保留，请再次重启恢复'
            : baselineOnly
              ? '上次对局未进入结算，未产生奖励或成长'
              : '上次结算未完成奖励写入，成长已安全丢弃，不会产生幽灵进度',
          accessibilityText: recovered
            ? '检测到上次结算中断。奖励已经存在，成长已经安全恢复，不会重复累计。'
            : recoveryRetry
              ? '奖励已经存在，成长恢复暂时繁忙。点击选择模式会先安全重试，不会重复累计。'
            : recoveryDeferred
              ? '奖励已经存在，但成长恢复仍未完成。结算证据已经保留，请再次重启恢复。'
            : baselineOnly
              ? '上次对局没有进入结算，因此没有产生奖励或成长。'
              : '上次结算没有完成奖励写入，成长已经安全丢弃，不会产生幽灵进度。',
          fixedWidthNumeric: false,
        }),
      ])));
    }
    if (screenId === 'result-reward' && settlementRecovery.restartRequired) {
      const acknowledgementFailed = settlementRecovery.restartReason
        === 'journal-acknowledgement';
      append(profileFieldSource('p6-settlement-recovery', Object.freeze([Object.freeze({
        fieldId: 'recovery-status',
        labelMessageId: 'arena.v2.field.recovery-status',
        valueText: acknowledgementFailed
          ? '奖励与成长已保存；结算确认需要重启恢复，重启后不会重复累计'
          : '结算写入结果需要重启核对；重启以实际存档为准，不会重复累计或生成幽灵进度',
        accessibilityText: acknowledgementFailed
          ? '本局奖励与成长已经保存。结算确认需要重启恢复，重启后不会重复写入或累计进度。'
          : '本局结算写入结果需要重启核对。重启后以实际存档为准，不会重复累计，也不会生成幽灵进度。',
        fixedWidthNumeric: false,
      })])));
    } else if (screenId === 'result-reward' && settlementRecovery.retryRequired) {
      const rewardPending = settlementRecovery.pendingPhase === 'reward';
      const projectionPending = settlementRecovery.pendingPhase === 'projection';
      append(profileFieldSource('p6-settlement-recovery', Object.freeze([Object.freeze({
        fieldId: 'recovery-status',
        labelMessageId: 'arena.v2.field.recovery-status',
        valueText: rewardPending
          ? '奖励结果等待恢复；点击主按钮将安全重试本局结算，不会重复累计'
          : projectionPending
            ? '成长已写入，结果明细等待恢复；点击主按钮只恢复展示，不会再次写档'
            : '成长结果等待恢复；点击主按钮将安全重试，不会重复奖励或累计进度',
        accessibilityText: rewardPending
          ? '本局奖励结果等待恢复。点击主按钮会安全重试本局结算，不会重复写入或累计。'
          : projectionPending
            ? '本局成长已经写入，结果明细等待恢复。点击主按钮只恢复展示，不会再次写入档案。'
            : '本局成长结果等待恢复。点击主按钮会安全重试，不会重复奖励或累计进度。',
        fixedWidthNumeric: false,
      })])));
    }
    if (screenId === 'weapon-detail') {
      const weaponDefinitionId = pages.profiles.learning.selectedWeaponDefinitionId;
      if (weaponDefinitionId === null) {
        throw new Error('Arena weapon detail缺少显式武器选择。');
      }
      append(projectArenaV2WeaponDetailContentFieldsV1(
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
        ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
        weaponDefinitionId,
        this.#selectedModeKind === 'duel' || this.#selectedModeKind === 'race'
          ? Object.freeze({
            modeKind: this.#selectedModeKind,
            weaponDefinitionId,
            mapDefinitionId: this.#selectedMapDefinitionId,
          })
          : undefined,
      ));
    }
    if (screenId === 'map-detail') {
      const mapDefinitionId = pages.profiles.learning.selectedMapDefinitionId;
      if (mapDefinitionId === null) {
        throw new Error('Arena map detail缺少显式地图选择。');
      }
      append(projectArenaV2MapDetailContentFieldsV1(
        ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
        ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
        mapDefinitionId,
        this.#selectedModeKind === 'duel' || this.#selectedModeKind === 'race'
          ? Object.freeze({
            modeKind: this.#selectedModeKind,
            weaponDefinitionId: this.#selectedWeaponDefinitionId,
            mapDefinitionId,
          })
          : undefined,
      ));
    }
    if (fieldSources.length === 0) {
      throw new Error(`Arena信息页面${screenId}没有可用字段owner。`);
    }
    return Object.freeze({
      composition: Object.freeze({
        revision: information.navigation.revision,
        screenId,
        state: 'ready' as const,
        fieldSources: Object.freeze(fieldSources),
        primaryActionEnabled: !settlementRecovery.restartRequired,
        primaryActionDisabledReasonMessageId: settlementRecovery.restartRequired
          ? 'arena.v2.reason.restart-required'
          : null,
      }),
      pageProjections: pages,
      homeContinuationRoute: nextGoalContinuationRoute,
      fullCatalogReplayCombination,
      selection,
      returnScreenId: information.navigation.returnScreenId,
      detailBrowseProjection,
      learningSettlementRecovery: settlementRecovery,
      nextLearningGoal: pages.profiles.learning.nextGoal,
      resultPrimaryRecommendation,
      resultNextGoalRecommendation,
      resultNewCollectionDetailItems,
    });
  }

  getInformationCurrentScreenComposition(
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options = {},
  ): ArenaV2InformationFieldCompositionInputV1 | null {
    return this.#informationCurrentScreenCompositionBundle(value).composition;
  }

  getInformationCurrentScreenBasePipeline(
    viewport: unknown,
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options = {},
  ): ReturnType<typeof createArenaV2InformationScreenPipelineV1> {
    const composition = this.getInformationCurrentScreenComposition(value);
    if (composition === null) {
      throw new Error('Arena当前不在可投影的ready信息页面。');
    }
    return createArenaV2InformationScreenPipelineV1(
      ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      composition,
      viewport,
    );
  }

  getInformationCurrentScreenPipeline(
    viewport: unknown,
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options = {},
  ): ReturnType<typeof createArenaV2InformationScreenPipelineV1> {
    const bundle = this.getInformationCurrentScreenPipelineBundle(viewport, value);
    if (bundle === null) {
      throw new Error('Arena当前不在可投影的ready信息页面。');
    }
    return bundle.pipeline;
  }

  getInformationCurrentScreenPipelineBundle(
    viewport: unknown,
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options = {},
  ): Readonly<{
    readonly pipeline: ReturnType<typeof createArenaV2InformationScreenPipelineV1>;
    readonly homeContinuationRoute: ArenaV2NextLearningGoalContinuationRouteV1 | null;
    readonly fullCatalogReplayCombination: ReturnType<
      typeof projectArenaV2FullCatalogReplayCombinationV1
    >;
    readonly learningSettlementRecovery: ReturnType<
      ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1['getLearningSettlementRecoveryRead']
    >;
    readonly nextLearningGoal: ReturnType<typeof resolveArenaV2NextLearningGoalV1>;
    readonly resultPrimaryRecommendation: ResultPrimaryRecommendationV1 | null;
    readonly resultNextGoalRecommendation: ResultPrimaryRecommendationV1 | null;
    readonly resultNewCollectionDetailItems: ResultNewCollectionDetailItemsV1 | null;
  }> | null {
    const compositionBundle = this.#informationCurrentScreenCompositionBundle(value);
    if (compositionBundle.composition === null) return null;
    const pipeline = createArenaV2InformationScreenPipelineV1(
      ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      compositionBundle.composition,
      viewport,
    );
    if (compositionBundle.learningSettlementRecovery === null
      || compositionBundle.nextLearningGoal === null) {
      throw new Error('Arena页面Pipeline缺少同批次结算恢复或下一目标读取。');
    }
    const sharedRead = Object.freeze({
      fullCatalogReplayCombination: compositionBundle.fullCatalogReplayCombination,
      learningSettlementRecovery: compositionBundle.learningSettlementRecovery,
      nextLearningGoal: compositionBundle.nextLearningGoal,
      resultPrimaryRecommendation: compositionBundle.resultPrimaryRecommendation,
      resultNextGoalRecommendation: compositionBundle.resultNextGoalRecommendation,
      resultNewCollectionDetailItems: compositionBundle.resultNewCollectionDetailItems,
    });
    const selection = compositionBundle.selection;
    if (selection === null) {
      if (pipeline.renderPlan.identity === 'result-reward') {
        if (compositionBundle.resultNewCollectionDetailItems === null) {
          throw new Error('Arena结果页Pipeline缺少同批次本局新收藏详情投影。');
        }
        return Object.freeze({
          pipeline: Object.freeze({
            ...pipeline,
            renderPlan: addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(
              pipeline.renderPlan,
              compositionBundle.resultNewCollectionDetailItems,
            ),
          }),
          homeContinuationRoute: compositionBundle.homeContinuationRoute,
          ...sharedRead,
        });
      }
      if (pipeline.renderPlan.identity === 'match-prep') {
        return Object.freeze({
          pipeline: Object.freeze({
            ...pipeline,
            renderPlan:
              addArenaV2InformationCompetitivePreparationLinksToRenderPlanCandidateV1(
                pipeline.renderPlan,
              ),
          }),
          homeContinuationRoute: compositionBundle.homeContinuationRoute,
          ...sharedRead,
        });
      }
      if (pipeline.renderPlan.identity === 'survival-prep') {
        return Object.freeze({
          pipeline: Object.freeze({
            ...pipeline,
            renderPlan: addArenaV2InformationSurvivalPreparationLinksToRenderPlanCandidateV1(
              pipeline.renderPlan,
            ),
          }),
          homeContinuationRoute: compositionBundle.homeContinuationRoute,
          ...sharedRead,
        });
      }
      if (pipeline.renderPlan.identity === 'weapon-detail'
        || pipeline.renderPlan.identity === 'map-detail') {
        const returnScreenId = compositionBundle.returnScreenId;
        const detailPlan = returnScreenId === 'match-prep'
          || returnScreenId === 'survival-prep'
          ? addArenaV2InformationPreparationDetailReturnToRenderPlanCandidateV1(
            pipeline.renderPlan,
            returnScreenId,
          )
          : pipeline.renderPlan;
        if (compositionBundle.detailBrowseProjection === null) {
          throw new Error('Arena详情页Pipeline缺少同批次相邻浏览投影。');
        }
        const browsePlan = addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1(
          detailPlan,
          compositionBundle.detailBrowseProjection,
        );
        return Object.freeze({
          pipeline: Object.freeze({
            ...pipeline,
            renderPlan: addArenaV2InformationDetailDirectoryLinkToRenderPlanCandidateV1(
              browsePlan,
            ),
          }),
          homeContinuationRoute: compositionBundle.homeContinuationRoute,
          ...sharedRead,
        });
      }
      return Object.freeze({
        pipeline,
        homeContinuationRoute: compositionBundle.homeContinuationRoute,
        ...sharedRead,
      });
    }
    const selectionRenderPlan = addArenaV2InformationSelectionToRenderPlanCandidateV1(
      pipeline.renderPlan,
      selection,
    );
    return Object.freeze({
      pipeline: Object.freeze({
        ...pipeline,
        renderPlan: selection.kind === 'mode'
          ? addArenaV2InformationModeCharacterLinkToRenderPlanCandidateV1(
            addArenaV2InformationModePreparationLinkToRenderPlanCandidateV1(
              selectionRenderPlan,
              selection.selectedId,
            ),
          )
          : selectionRenderPlan,
      }),
      homeContinuationRoute: compositionBundle.homeContinuationRoute,
      ...sharedRead,
    });
  }

  getInformationCurrentDetailBrowseProjection(
  ): ArenaV2InformationDetailBrowseProjectionCandidateV1 {
    const screenId = this.#readHost().getInformationSnapshot().navigation.currentScreenId;
    if (screenId !== 'weapon-detail' && screenId !== 'map-detail') {
      throw new Error(`Arena当前页面${String(screenId)}不是可连续浏览的详情页。`);
    }
    const activeRegistry = this.#activeRegistryBindingFromCurrentOwner();
    return this.#projectInformationCurrentDetailBrowseFromRead(
      screenId,
      activeRegistry === null ? null : activeRegistry.collectionEquipmentDefinitionIds,
    );
  }

  #projectInformationCurrentDetailBrowseFromRead(
    screenId: 'weapon-detail' | 'map-detail',
    eligibleWeaponDefinitionIds: readonly string[] | null,
  ): ArenaV2InformationDetailBrowseProjectionCandidateV1 {
    if (screenId === 'weapon-detail') {
      const activeIds = eligibleWeaponDefinitionIds === null
        ? null
        : new Set(eligibleWeaponDefinitionIds);
      return Object.freeze({
        kind: 'weapon' as const,
        selectedDefinitionId: this.#selectedWeaponDefinitionId,
        orderedItems: Object.freeze(
          ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons
            .filter(({ weaponDefinitionId }) => (
              activeIds === null || activeIds.has(weaponDefinitionId)
              || weaponDefinitionId === this.#selectedWeaponDefinitionId
            ))
            .map((weapon) => Object.freeze({
              definitionId: weapon.weaponDefinitionId,
              displayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
                weapon.nameMessageId,
              ),
            })),
        ),
      });
    }
    if (screenId === 'map-detail') {
      return Object.freeze({
        kind: 'map' as const,
        selectedDefinitionId: this.#selectedMapDefinitionId,
        orderedItems: Object.freeze(
          ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.map(
            (map) => Object.freeze({
              definitionId: map.mapDefinitionId,
              displayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
                map.nameMessageId,
              ),
            }),
          ),
        ),
      });
    }
    throw new Error(`Arena当前页面${String(screenId)}不是可连续浏览的详情页。`);
  }

  getInformationCurrentScreenSelectionProjection(
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options = {},
  ): ArenaV2InformationSelectionProjectionCandidateV1 | null {
    const information = this.#readHost().getInformationSnapshot();
    const screenId = information.navigation.currentScreenId;
    if (screenId !== 'mode-select' && screenId !== 'character-select'
      && screenId !== 'weapon-index' && screenId !== 'map-index') {
      return null;
    }
    return this.#projectInformationCurrentScreenSelectionFromPageRead(
      screenId,
      value,
      this.#informationPageProjectionsFromModeSessionState(
        value,
        information.modeSessionState,
      ),
    );
  }

  #projectInformationCurrentScreenSelectionFromPageRead(
    screenId: 'mode-select' | 'character-select' | 'weapon-index' | 'map-index',
    value: ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options,
    pages: Readonly<{
      readonly modeContent: ReturnType<typeof projectArenaV2ModeContentInformationCandidateV1>;
      readonly characterContent: ReturnType<typeof projectArenaV2CharacterInformationCandidateV1>;
      readonly collectionContent: ReturnType<
        typeof projectArenaV2InformationCollectionContentV1
      >;
      readonly profiles: Readonly<{
        readonly learning: ReturnType<typeof projectArenaV2LearningInformationV1>;
      }>;
      readonly profileReads: Readonly<{
        readonly learning: ArenaThreeModeAuthoritativeLocalLearningProfileReadCandidateV1;
      }>;
    }>,
  ): ArenaV2InformationSelectionProjectionCandidateV1 {
    if (screenId === 'mode-select') {
      return Object.freeze({
        kind: 'mode' as const,
        selectedId: pages.modeContent.selectedModeKind,
        items: ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items,
      });
    }
    if (screenId === 'character-select') {
      return Object.freeze({
        kind: 'character' as const,
        selectedId: pages.characterContent.selectedCharacterDefinitionId,
        items: Object.freeze(pages.characterContent.items.map((character) => Object.freeze({
          id: character.characterDefinitionId,
          label: character.displayName,
          description: character.handlingSummary,
        }))),
      });
    }
    const requested = localInformationProjectionSelection(value);
    const learningRead = pages.profileReads.learning;
    const learningProjection = pages.profiles.learning;
    const collectionContent = pages.collectionContent;
    const collectionProgress = projectArenaV2CollectionProgressSummaryFactsV1({
      profileDefinition: learningRead.profileDefinition,
      profile: learningRead.profile,
      orderedDirectory: {
        weaponDefinitionIds: collectionContent.weapons.map(
          ({ weaponDefinitionId }) => weaponDefinitionId,
        ),
        maps: collectionContent.maps.map((map) => ({
          mapDefinitionId: map.mapDefinitionId,
          segmentDefinitionIds: map.segments.map(
            ({ segmentDefinitionId }) => segmentDefinitionId,
          ),
        })),
      },
    });
    if (screenId === 'weapon-index') {
      const firstWeapon = collectionContent.weapons[0];
      if (firstWeapon === undefined) throw new Error('Arena武器选择页缺少武器内容。');
      const activeWeaponDefinitionIds = learningRead.eligibleWeaponDefinitionIds === null
        ? null
        : new Set(learningRead.eligibleWeaponDefinitionIds);
      const contextTarget = Object.keys(
        learningRead.profileDefinition.masteryRequirements.weaponContextEvidence,
      ).length;
      const selection = Object.freeze({
        kind: 'weapon' as const,
        selectedId: learningProjection.selectedWeaponDefinitionId
          ?? firstWeapon.weaponDefinitionId,
        items: Object.freeze(collectionContent.weapons.map((weapon) => {
          const progress = collectionProgress.weapons.find(
            ({ weaponDefinitionId }) => weaponDefinitionId === weapon.weaponDefinitionId,
          );
          if (!progress) throw new RangeError(`Arena武器${weapon.weaponDefinitionId}缺少收藏进度。`);
          const collectionText = progress.collected
            ? '已收藏'
            : `收藏研究 ${progress.collectionEvidenceCount}/${progress.collectionEvidenceTarget}`;
          const contextText = progress.mastered
            ? '五情境已理解'
            : `情境理解 ${progress.completedContextCount}/${contextTarget}`;
          const goalText = learningProjection.weaponGoal.weaponDefinitionId
            === weapon.weaponDefinitionId
            ? '当前目标 · '
            : '';
          const available = activeWeaponDefinitionIds === null
            || activeWeaponDefinitionIds.has(weapon.weaponDefinitionId);
          const unavailableReason = available
            ? null
            : '这把武器尚未进入当前可玩武器池';
          const coreFight = projectArenaV2WeaponCoreFightReadV1(
            ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
            ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
            weapon.weaponDefinitionId,
          );
          if (coreFight.displayName !== weapon.displayName
            || coreFight.coreVerb !== weapon.coreVerb
            || coreFight.tradeoff !== weapon.learningFocus) {
            throw new RangeError(`Arena武器${weapon.weaponDefinitionId}核心打法与收藏目录漂移。`);
          }
          return Object.freeze({
            id: weapon.weaponDefinitionId,
            label: `${weapon.collectionOrder}. ${weapon.displayName}`,
            description: `核心 ${coreFight.compactText}｜${goalText}${
              available ? '' : '等待开放 · '
            }${collectionText} · ${contextText}`,
            ...(activeWeaponDefinitionIds === null
              ? {}
              : { available, unavailableReason }),
          });
        })),
      });
      const researchSelection = projectArenaV2WeaponCollectionResearchSelectionCandidateV1({
        schemaVersion: 1,
        profileRevision: learningRead.profile.revision,
        selection,
        weaponResearchFacts: Object.freeze(collectionProgress.weapons.map((weapon) => (
          Object.freeze({
            weaponDefinitionId: weapon.weaponDefinitionId,
            collectionEvidenceCount: weapon.collectionEvidenceCount,
            collectionEvidenceTarget: weapon.collectionEvidenceTarget,
            collected: weapon.collected,
            mastered: weapon.mastered,
          })
        ))),
      });
      return projectArenaV2WeaponAvailabilityInformationSelectionCandidateV1({
        schemaVersion: 1,
        selection: researchSelection,
        availabilityChange:
          requested.weaponAvailabilityChange,
        collectedWeaponDefinitionIds: learningRead.profile.collections.weaponDefinitionIds,
      });
    }
    const firstMap = collectionContent.maps[0];
    if (firstMap === undefined) throw new Error('Arena地图选择页缺少地图内容。');
    const selection = Object.freeze({
      kind: 'map' as const,
      selectedId: learningProjection.selectedMapDefinitionId ?? firstMap.mapDefinitionId,
      items: Object.freeze(collectionContent.maps.map((map) => {
        const progress = collectionProgress.maps.find(
          ({ mapDefinitionId }) => mapDefinitionId === map.mapDefinitionId,
        );
        if (!progress) throw new RangeError(`Arena地图${map.mapDefinitionId}缺少收藏进度。`);
        const goalText = learningProjection.mapGoal.mapDefinitionId === map.mapDefinitionId
          ? '当前目标 · '
          : '';
        const routeSkeleton = projectArenaV2MapRouteSkeletonReadV1(
          ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
          ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
          map.mapDefinitionId,
        );
        if (routeSkeleton.displayName !== map.displayName) {
          throw new RangeError(`Arena地图${map.mapDefinitionId}路线骨架与收藏目录名称漂移。`);
        }
        return Object.freeze({
          id: map.mapDefinitionId,
          label: map.displayName,
          description: `路线 ${routeSkeleton.compactText}｜${goalText}${
            progress.collected ? '已收藏' : '待收集'
          } · 路线理解 ${
            progress.completedSegmentCount
          }/${progress.totalSegmentCount}｜${map.participantRange}`,
        });
      })),
    });
    const evidenceTarget = learningRead.profileDefinition.masteryRequirements
      .mapSegmentCompletionEvidence;
    return projectArenaV2MapRouteResearchSelectionCandidateV1({
      schemaVersion: 1,
      profileRevision: learningRead.profile.revision,
      replayWeaponRotationSpan: learningRead.eligibleWeaponDefinitionIds?.length
        ?? collectionContent.weapons.length,
      selection,
      mapResearchFacts: Object.freeze(collectionContent.maps.map((map) => (
        Object.freeze({
          mapDefinitionId: map.mapDefinitionId,
          evidencePerSegmentTarget: evidenceTarget,
          segments: Object.freeze(map.segments.map((segment) => {
            const record = learningRead.profile.mapSegmentMastery.find((candidate) => (
              candidate.mapDefinitionId === map.mapDefinitionId
              && candidate.segmentDefinitionId === segment.segmentDefinitionId
            ));
            return Object.freeze({
              segmentDefinitionId: segment.segmentDefinitionId,
              displayName: segment.displayName,
              completionEvidenceCount: record?.completionEvidenceCount ?? 0,
            });
          })),
        })
      ))),
    });
  }

  getSnapshot(): unknown {
    this.#assertNoOperation('getSnapshot');
    if (this.#profileOwner === null) {
      throw new Error('Arena three-mode local playable host已销毁。');
    }
    const host = this.#readHost();
    const information = host.getInformationSnapshot();
    const informationCompositionBundle =
      this.#informationCurrentScreenCompositionBundleFromInformation({}, information);
    const informationPageProjections = informationCompositionBundle.pageProjections
      ?? this.#informationPageProjectionsFromModeSessionState(
        {},
        information.modeSessionState,
      );
    return Object.freeze({
      playable: host.getSnapshot(),
      profiles: Object.freeze({
        reward: informationPageProjections.profileReads.reward,
        learning: informationPageProjections.profileReads.learning.profile,
      }),
      informationPresentationPreferencesRead:
        host.getPreferencesRead(),
      informationLearningProfileRead: informationPageProjections.profileReads.learning,
      informationProfileProjection: informationPageProjections.profiles.learning,
      informationProfileProjections: informationPageProjections.profiles,
      informationPageProjections,
      informationCurrentScreenComposition: informationCompositionBundle.composition,
      homeContinuationPreparation: this.#acceptedHomeContinuationPreparation,
      pendingResultCollectionDetailPreparation:
        this.#pendingResultCollectionDetailPreparation,
      homeContinuationMatchReceipt: this.#homeContinuationMatchReceipt,
      homeContinuationMatchReceiptError: this.#homeContinuationMatchReceiptError,
      matchStartLearningGoalAttempt: this.#matchStartLearningGoalAttempt,
      activeRegistry: this.#activeRegistryBindingFromCurrentOwner(),
      learningSettlementRecovery:
        informationPageProjections.profileReads.learningSettlementRecovery,
      startupSettlementRecoveryNotice: this.#startupSettlementRecoveryNotice,
      retentionObservation: Object.freeze({
        collectorConnected: this.#retentionObservationCollector !== null,
        defaultSinkWired: false as const,
        pendingWeaponResearchFocus: this.#pendingWeaponResearchFocusObservation,
        pendingMapLearningFocus: this.#pendingMapLearningFocusObservation,
        pendingNextGoalImpression: this.#pendingNextGoalImpression,
        pendingHomeContinuationFollow: this.#pendingHomeContinuationFollowObservation,
        pendingActionRetryKind:
          this.#pendingRetentionActionRetry?.observation?.kind
            ?? this.#pendingRetentionActionRetry?.fields.kind
            ?? null,
        pendingActionRetryEventId:
          this.#pendingRetentionActionRetry?.observation?.eventId ?? null,
        pendingCatalogWork: this.#pendingCatalogRetentionWorkBatch === null
          ? null
          : Object.freeze({
            identity: this.#pendingCatalogRetentionWorkBatch.identity,
            cursor: this.#pendingCatalogRetentionWorkBatch.cursor,
            itemCount: this.#pendingCatalogRetentionWorkBatch.preparedItems.length,
            currentEventId:
              this.#pendingCatalogRetentionWorkBatch.materializedItems?.[
                this.#pendingCatalogRetentionWorkBatch.cursor
              ]?.observation.eventId ?? null,
          }),
        pendingSettlementWork: this.#pendingSettlementRetentionWorkBatch === null
          ? null
          : Object.freeze({
            identity: this.#pendingSettlementRetentionWorkBatch.identity,
            cursor: this.#pendingSettlementRetentionWorkBatch.cursor,
            itemCount: this.#pendingSettlementRetentionWorkBatch.preparedItems.length,
            currentEventId:
              this.#pendingSettlementRetentionWorkBatch.materializedItems?.[
                this.#pendingSettlementRetentionWorkBatch.cursor
              ]?.observation.eventId ?? null,
          }),
        pendingNextGoalCapture: this.#pendingNextGoalCaptureDebt === null
          ? null
          : Object.freeze({
            identity: this.#pendingNextGoalCaptureDebt.identity,
            settlementWorkIdentity:
              this.#pendingNextGoalCaptureDebt.settlementWorkIdentity,
            expectedProfileRevision:
              this.#pendingNextGoalCaptureDebt.expectedProfileRevision,
            authorityTick: this.#pendingNextGoalCaptureDebt.authorityTick,
            lastObservationEventId:
              this.#pendingNextGoalCaptureDebt.lastObservationEventId,
            registryScopeStatus:
              this.#pendingNextGoalCaptureDebt.registryScopeStatus,
            registryScopeIdentityHash:
              this.#pendingNextGoalCaptureDebt.registryScopeIdentityHash,
            registryScope: this.#pendingNextGoalCaptureDebt.registryScopeStatus === 'pending'
              ? null
              : this.#pendingNextGoalCaptureDebt.registryScope === null
                ? Object.freeze({ kind: 'no-active-registry' as const })
                : Object.freeze({
                  kind: 'active-registry' as const,
                  revision: this.#pendingNextGoalCaptureDebt.registryScope.revision,
                  snapshotHash:
                    this.#pendingNextGoalCaptureDebt.registryScope.snapshotHash,
                  collectionEquipmentDefinitionCount:
                    this.#pendingNextGoalCaptureDebt.registryScope
                      .collectionEquipmentDefinitionIds.length,
                }),
            attemptState: this.#lastRetentionObservationError === null
              ? 'pending'
              : 'retry-required',
          }),
        settlementWorkItemLimit: MAX_SETTLEMENT_RETENTION_WORK_ITEMS_V1,
        catalogImpressionOrdinals: Object.freeze(Object.fromEntries(
          [...this.#catalogImpressionOrdinals.entries()].sort(([left], [right]) => (
            left < right ? -1 : 1
          )),
        )),
        contentEntryOrdinals: Object.freeze(Object.fromEntries(
          [...this.#contentEntryOrdinals.entries()].sort(([left], [right]) => (
            left < right ? -1 : 1
          )),
        )),
        usedWeaponDefinitionIds: sorted([...this.#usedWeaponDefinitionIds]),
        usedMapDefinitionIds: sorted([...this.#usedMapDefinitionIds]),
        eventSequence: this.#retentionObservationEventSequence,
        lastObservation: this.#lastRetentionObservation,
        lastError: this.#lastRetentionObservationError,
      }),
    });
  }

  #destroyOwnedResources(): void {
    if (this.#learningSettlementFinalizationActive) {
      throw new Error('Arena Learning结算后处理期间不能销毁本地Playable Host。');
    }
    if (this.#retentionObservationCollectionActive) {
      throw new Error('Arena留存观察提交期间不能销毁本地Playable Host。');
    }
    const errors: unknown[] = [];
    if (!this.#cleanupStarted) {
      if ((this.#pendingCatalogRetentionWorkBatch !== null
          || this.#pendingSettlementRetentionWorkBatch !== null)
        && !this.#retryPendingRetentionWorkBatches()) {
        throw this.#lastRetentionObservationError
          ?? new Error('Arena销毁前留存工作批未能排空。');
      }
      if (this.#pendingCatalogRetentionWorkBatch !== null
        || this.#pendingSettlementRetentionWorkBatch !== null) {
        throw new Error('Arena销毁前留存工作批仍有未提交游标。');
      }
      if (this.#pendingNextGoalCaptureDebt !== null
        && !this.#captureNextGoalImpression()) {
        throw this.#lastRetentionObservationError
          ?? new Error('Arena销毁前下一学习目标捕获债务未能收敛。');
      }
      if (this.#pendingNextGoalCaptureDebt !== null) {
        throw new Error('Arena销毁前下一学习目标捕获债务仍未清理。');
      }
      if (this.#pendingRetentionActionRetry !== null
        && !this.#retryPendingRetentionAction()) {
        throw this.#lastRetentionObservationError
          ?? new Error('Arena销毁前待重试留存动作提交失败。');
      }
      if (this.#pendingRetentionActionRetry !== null) {
        throw new Error('Arena销毁前待重试留存动作仍未提交。');
      }
      const catalogCompleted = this.#collectCatalogImpressionForCurrentScreen();
      if (!catalogCompleted
        || this.#pendingCatalogRetentionWorkBatch !== null
        || this.#pendingSettlementRetentionWorkBatch !== null) {
        throw this.#lastRetentionObservationError
          ?? new Error('Arena销毁前当前目录留存机会未提交。');
      }
      const nextGoalCompleted = this.#completeNextGoalImpression(false);
      if (!nextGoalCompleted
        || this.#pendingNextGoalImpression !== null
        || this.#pendingRetentionActionRetry !== null) {
        throw this.#lastRetentionObservationError
          ?? new Error('Arena销毁前下一目标留存动作提交失败。');
      }
      const homeContinuationCompleted =
        this.#completeHomeContinuationFollowObservation(null);
      if (!homeContinuationCompleted
        || this.#pendingHomeContinuationFollowObservation !== null
        || this.#pendingRetentionActionRetry !== null) {
        throw this.#lastRetentionObservationError
          ?? new Error('Arena销毁前首页续玩留存动作提交失败。');
      }
      this.#acceptedHomeContinuationPreparation = null;
      this.#pendingResultCollectionDetailPreparation = null;
      this.#cleanupStarted = true;
    }
    if (this.#playableHost !== null) {
      try {
        rejectAsynchronousSelectionValue(
          this.#playableHost.destroy(),
          'three-mode local playable host playable owner.destroy',
        );
        this.#playableHost = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (this.#playableHost === null && !this.#learningSettlementRecoveryOwnerDestroyed) {
      try {
        rejectAsynchronousSelectionValue(
          this.#learningSettlementRecoveryOwner.destroy(),
          'three-mode local playable host settlement recovery owner.destroy',
        );
        this.#learningSettlementRecoveryOwnerDestroyed = true;
      } catch (error) { errors.push(error); }
    }
    if (this.#playableHost === null
      && this.#learningSettlementRecoveryOwnerDestroyed
      && !this.#learningSettlementIntentJournalDestroyed) {
      try {
        rejectAsynchronousSelectionValue(
          this.#learningSettlementIntentJournal.destroy(),
          'three-mode local playable host settlement intent journal.destroy',
        );
        this.#learningSettlementIntentJournalDestroyed = true;
      } catch (error) { errors.push(error); }
    }
    if (this.#playableHost === null
      && this.#learningSettlementRecoveryOwnerDestroyed
      && this.#learningSettlementIntentJournalDestroyed
      && this.#profileOwner !== null) {
      try {
        rejectAsynchronousSelectionValue(
          this.#profileOwner.destroy(),
          'three-mode local playable host profile owner.destroy',
        );
        this.#profileOwner = null;
      } catch (error) {
        errors.push(error);
      }
    }
    this.#destroyed = errors.length === 0
      && this.#learningSettlementRecoveryOwnerDestroyed
      && this.#learningSettlementIntentJournalDestroyed
      && this.#playableHost === null
      && this.#profileOwner === null;
    if (this.#destroyed) {
      this.#pendingWeaponResearchFocusObservation = null;
      this.#pendingMapLearningFocusObservation = null;
      this.#matchStartLearningGoalAttempt = null;
      this.#pendingNextGoalImpression = null;
      this.#pendingHomeContinuationFollowObservation = null;
      this.#acceptedHomeContinuationPreparation = null;
      this.#pendingResultCollectionDetailPreparation = null;
      this.#homeContinuationMatchReceipt = null;
      this.#homeContinuationMatchReceiptError = null;
      this.#terminalProductResult = null;
      this.#terminalLocalParticipantId = null;
      this.#rewardSettlementProjection = null;
      this.#rewardSettlementProjectionError = null;
      this.#startupSettlementRecoveryNotice = null;
      this.#catalogImpressionOrdinals.clear();
      this.#contentEntryOrdinals.clear();
      this.#usedWeaponDefinitionIds.clear();
      this.#usedMapDefinitionIds.clear();
      this.#pendingCatalogRetentionWorkBatch = null;
      this.#pendingSettlementRetentionWorkBatch = null;
      this.#pendingNextGoalCaptureDebt = null;
      this.#indeterminateMatchStartFailure = null;
      this.#settlementIntentJournalFailure = null;
      this.#settlementRestartReason = null;
      this.#synchronousReentryFailure = null;
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena three-mode local playable host清理不完整。');
    }
    if (!this.#destroyed) {
      throw new Error('Arena three-mode local playable host清理未收敛。');
    }
  }

  destroy(): void {
    this.#assertNoOperation('destroy');
    if (this.#destroyed) return;
    this.#runOperation('destroy', () => this.#destroyOwnedResources());
  }
}

export function createArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1(
  value: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options,
): ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 {
  return new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1(value);
}
