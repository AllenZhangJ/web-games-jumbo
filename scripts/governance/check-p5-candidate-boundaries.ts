import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const PRODUCTION_ROOTS = Object.freeze([
  'src/entry',
  'packages/arena-v1-composition/src',
  'packages/arena-v1-application-launch/src',
  'packages/arena-v1-application-session/src',
  'packages/arena-product-composition/src',
  'packages/arena-product-presentation-three/src',
]);

const P5_FILES = Object.freeze([
  'packages/arena-product-presentation/src/arena-v2-information-screen-definition-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-screen-registry-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-screen-view-model-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-field-composition-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-content-read-projection-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-weapon-map-learning-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-weapon-availability-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-home-next-learning-signature-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-home-record-summary-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-result-home-continuation-receipt-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-survival-repeatable-challenge-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-competitive-repeatable-challenge-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-product-session-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-content-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-preparation-learning-focus-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-loading-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-selection-render-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-mode-preparation-link-render-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-mode-character-link-render-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-competitive-preparation-links-render-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-survival-preparation-links-render-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-preparation-detail-return-render-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-detail-directory-link-render-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-detail-adjacent-browse-render-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-result-new-collection-detail-render-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-character-information-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-screen-pipeline-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-formal-presentation-asset-catalog-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-formal-asset-production-approval-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-formal-action-presentations-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-formal-audio-cue-resolution-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-weapon-collection-combat-grammar-visual-source-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-match-scene-read-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-navigation-session-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-presentation-content-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-screen-render-model-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-information-screen-layout-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-view-model-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-render-model-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-queue-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-consumer-epoch-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-presentation-host-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-validated-presentation-host-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-weapon-impact-strength-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-layout-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-world-marker-projection-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-supply-fact-cue-projection-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-unarmed-feedback-direction-presentation-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-control-learning-copy-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-ui-visual-tokens-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-ui-render-plan-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-ui-canvas-painter-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-ui-dom-surface-model-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-ui-interaction-v1.ts',
]);

const P5_CONTENT_FILES = Object.freeze([
  'packages/arena-product-content/src/arena-v2-information-content-read-catalog-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-six-character-catalog-candidate-v1.ts',
]);

const P5_HOST_FILES = Object.freeze([
  'src/entry/arena-v2-information-dom-surface-candidate-v1.ts',
  'src/entry/arena-v2-information-canvas-surface-candidate-v1.ts',
  'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts',
  'src/entry/arena-v2-formal-hud-canvas-layer-candidate-v1.ts',
  'src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts',
  'src/entry/arena-v2-formal-web-pointer-surface-candidate-v1.ts',
  'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
  'src/entry/web-arena-v2-formal-candidate.ts',
  'src/entry/arena-v2-local-match-keyboard-driver-candidate-v1.ts',
  'src/entry/arena-v2-local-match-pointer-driver-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-information-mode-session-host-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-mode-learning-session-factory-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-quick-match-bundle-factory-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-formal-asset-content-closure-candidate-v1.ts',
]);
const P5_THREE_FILES = Object.freeze([
  'src/entry/arena-v2-formal-web-match-host-candidate-v1.ts',
  'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts',
  'packages/arena-product-presentation-three/src/arena-v2-formal-gltf-character-view-candidate-v1.ts',
  'packages/arena-product-presentation-three/src/arena-v2-formal-match-surface-candidate-v1.ts',
  'packages/arena-product-presentation-three/src/arena-v2-formal-scene-resolution-candidate-v1.ts',
  'packages/arena-product-presentation-three/src/arena-v2-formal-three-asset-preloader-candidate-v1.ts',
  'packages/arena-product-presentation-three/src/arena-v2-formal-three-camera-controller-candidate-v1.ts',
  'packages/arena-product-presentation-three/src/arena-v2-formal-three-stage-candidate-v1.ts',
]);
const P5_A6_18_FILES = Object.freeze({
  semanticSource:
    'packages/arena-product-presentation/src/arena-v2-collection-fallback-semantic-source-candidate-v1.ts',
  visualProfile:
    'packages/arena-product-presentation-three/src/arena-v2-collection-semantic-fallback-visual-profile-candidate-v1.ts',
  renderPlanBridge:
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-render-plan-layout-bridge-candidate-v1.ts',
} as const);
const P5_A6_18_DEFERRED_TEST_FILES = Object.freeze([
  'packages/arena-product-presentation/test/arena-v2-collection-fallback-semantic-source-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-semantic-fallback-visual-profile-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-preview-render-plan-layout-bridge-candidate-v1.test.ts',
  'tests/arena/a6-16-17-information-collection-preview-wiring-candidate-v1.test.ts',
] as const);
const P5_WEAPON_AVAILABILITY_DEFERRED_TEST_FILE =
  'packages/arena-product-presentation/test/arena-v2-weapon-availability-information-projection-candidate-v1.test.ts';
const P5_SURVIVAL_REPEATABLE_CHALLENGE_DEFERRED_TEST_FILE =
  'packages/arena-product-presentation/test/arena-v2-survival-repeatable-challenge-information-projection-candidate-v1.test.ts';
const P5_COMPETITIVE_REPEATABLE_CHALLENGE_DEFERRED_TEST_FILE =
  'packages/arena-product-presentation/test/arena-v2-competitive-repeatable-challenge-information-projection-candidate-v1.test.ts';
const P5_HOME_RECORD_SUMMARY_DEFERRED_TEST_FILE =
  'packages/arena-product-presentation/test/arena-v2-home-record-summary-information-projection-candidate-v1.test.ts';
const P5_CHARACTER_SELECTION_MODE_LOADOUT_PREVIEW_DEFERRED_TEST_FILE =
  'tests/arena/p5-character-selection-mode-loadout-preview-candidate-v1.test.ts';
const P5_ISOLATED_FILE_SET = new Set<string>([...P5_HOST_FILES, ...P5_THREE_FILES]);
const P5_THREE_MODE_INFORMATION_HOST_FILE =
  'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts';

const EXPECTED_EXPORTS = Object.freeze(P5_FILES.map((file) => (
  `./${path.basename(file, '.ts')}.js`
)));

const P5_REACHABILITY = /\b(?:ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1|ARENA_V2_INFORMATION_SCREEN_CATALOG_CANDIDATE_V1|ARENA_V2_INFORMATION_PRESENTATION_CONTENT_CANDIDATE_V1|ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1|ARENA_V2_WEAPON_MAP_LEARNING_PROJECTION_CONTRACT_V1|ARENA_V2_QUICK_MATCH_BUNDLE_FACTORY_CANDIDATE_V1|ARENA_V2_FORMAL_ASSET_CONTENT_CLOSURE_CANDIDATE_V1|ARENA_V2_FORMAL_ACTION_PRESENTATIONS_CANDIDATE_V1|ArenaV2InformationNavigationSessionV1|ArenaV2InformationModeSessionHostCandidateV1|ArenaV2ModeLearningSessionFactoryCandidateV1|ArenaV2QuickMatchBundleFactoryCandidateV1|ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1|ArenaV2FormalHudCanvasLayerCandidateV1|ArenaV2FormalWebAudioPortCandidateV1|ArenaV2FormalWebPointerSurfaceCandidateV1|ArenaV2FormalThreeVfxPortCandidateV1|ArenaV2FormalWebMatchHostCandidateV1|ArenaV2FormalWebPlayableCompositionCandidateV1|ArenaV2LocalMatchKeyboardDriverCandidateV1|ArenaV2LocalMatchPointerDriverCandidateV1|ArenaV2FormalGltfCharacterViewCandidateV1|ArenaV2FormalGltfCharacterViewFactoryCandidateV1|ArenaV2FormalMatchSurfaceCandidateV1|ArenaV2FormalThreeAssetPreloaderCandidateV1|ArenaV2FormalThreeCameraControllerCandidateV1|ArenaV2FormalThreeStageCandidateV1|projectArenaV2InformationScreenViewModelV1|composeArenaV2InformationScreenViewModelV1|createArenaV2InformationScreenPipelineV1|addArenaV2InformationSelectionToRenderPlanCandidateV1|addArenaV2InformationModePreparationLinkToRenderPlanCandidateV1|addArenaV2InformationModeCharacterLinkToRenderPlanCandidateV1|addArenaV2InformationCompetitivePreparationLinksToRenderPlanCandidateV1|addArenaV2InformationSurvivalPreparationLinksToRenderPlanCandidateV1|addArenaV2InformationPreparationDetailReturnToRenderPlanCandidateV1|addArenaV2InformationDetailDirectoryLinkToRenderPlanCandidateV1|addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1|projectArenaV2CharacterInformationCandidateV1|projectArenaV2InformationCollectionContentV1|projectArenaV2WeaponDetailContentFieldsV1|projectArenaV2WeaponOperationReadV1|projectArenaV2WeaponCoreFightReadV1|projectArenaV2NextLearningSignatureReadCandidateV1|projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1|projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1|projectArenaV2MapRouteSkeletonReadV1|projectArenaV2MapDetailContentFieldsV1|projectArenaV2WeaponMapLearningCandidateV1|projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1|projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1|projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1|resolveArenaV2FormalSceneFrameCandidateV1|requireArenaV2FormalSceneFrameCandidateV1|advanceArenaV2ModeHudFeedbackQueueV1|ArenaV2ModeHudFeedbackEffectConsumerV1|ArenaV2ModeHudPresentationHostV1|ArenaV2ModeHudValidatedPresentationHostV1|projectArenaV2ModeHudWorldMarkersV1|createArenaV2ModeHudRenderPlanV1|paintArenaV2UiRenderPlanV1|createArenaV2UiDomSurfaceModelV1|resolveArenaV2UiPointerIntentV1)\b|\/arena-v2-(?:character-information|competitive-repeatable-challenge-information|home-(?:next-learning-signature|record-summary)-information|formal-(?:action-presentations|asset-content-closure|gltf-character-view|hud-canvas-layer|match-surface|scene-resolution|three-asset-preloader|three-camera-controller|three-stage|three-vfx-port|web-audio-port|web-match-host|web-playable-composition|web-pointer-surface)|information-screen|information-navigation|information-field|information-content|information-selection|information-mode-(?:preparation|character)-link|information-(?:competitive|survival)-preparation-links|information-preparation-detail-return|information-detail-(?:directory-link|adjacent-browse)|information-presentation|information-mode-session-host|information-local-playable-surface-binding|local-match-(?:keyboard|pointer)-driver|mode-learning-session-factory|quick-match-bundle-factory|mode-hud|survival-repeatable-challenge-information|weapon-(?:availability-information|map-learning)|ui-(?:render-plan|canvas-painter|dom-surface-model|interaction))[^'"\s]*\.js/u;

const FORBIDDEN_PATTERNS = Object.freeze([
  ['experiment dependency', /@number-strategy-jump\/arena-v1-experiment/u],
  ['legacy content dependency', /@number-strategy-jump\/arena-v1-content/u],
  ['Three.js dependency', /(?:from\s+['"]three['"]|arena-presentation-three)/u],
  ['Mode Registry或Policy直接消费', /\b(?:ModeRegistry|ResolvedModePolicyBundle|modeRegistryCandidate)\b/u],
  ['DOM window', /\bwindow(?:\.|\[)/u],
  ['DOM document', /\bdocument(?:\.|\[)/u],
  ['unseeded random', /\bMath\.random\s*\(/u],
  ['wall clock', /\b(?:Date|performance)\.now\s*\(/u],
] as const);

const FORBIDDEN_HOST_PATTERNS = Object.freeze(FORBIDDEN_PATTERNS.filter(([label]) => (
  label !== 'DOM window' && label !== 'DOM document'
)));
const FORBIDDEN_THREE_PATTERNS = Object.freeze(FORBIDDEN_HOST_PATTERNS.filter(([label]) => (
  label !== 'Three.js dependency'
)));

async function typescriptFiles(root: string): Promise<readonly string[]> {
  const result: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...await typescriptFiles(candidate));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(candidate);
  }
  return result;
}

async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  const index = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/index.ts',
  ), 'utf8');
  for (const expectedExport of EXPECTED_EXPORTS) {
    if (!index.includes(expectedExport)) {
      throw new Error(`arena-product-presentation index缺少${expectedExport}。`);
    }
  }
  const contentIndex = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-content/src/index.ts',
  ), 'utf8');
  if (!contentIndex.includes('./arena-v2-information-content-read-catalog-candidate-v1.js')) {
    throw new Error('arena-product-content index缺少P5具体内容阅读目录导出。');
  }
  for (const file of [...P5_FILES, ...P5_CONTENT_FILES]) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    for (const [label, pattern] of FORBIDDEN_PATTERNS) {
      if (pattern.test(source)) throw new Error(`${file}包含禁止的${label}。`);
    }
    if (/productionReady:\s*true|defaultNavigationWired:\s*true/u.test(source)) {
      throw new Error(`${file}不得在P5门前声明生产就绪或默认导航接线。`);
    }
  }
  for (const file of P5_HOST_FILES) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    for (const [label, pattern] of FORBIDDEN_HOST_PATTERNS) {
      if (pattern.test(source)) throw new Error(`${file}包含禁止的${label}。`);
    }
    for (const marker of [
      "status: 'production-unreachable'",
      'hardGate: false',
      'defaultEntryWired: false',
      'defaultNavigationWired: false',
    ]) if (!source.includes(marker)) throw new Error(`${file}缺少隔离标记${marker}。`);
  }
  const isolatedDevelopmentEntry = await readFile(path.join(
    repositoryRoot,
    'src/entry/web-arena-v2-formal-candidate.ts',
  ), 'utf8');
  for (const marker of [
    "enter.textContent = '重新准备'",
    'constructionCleanupDebt.retryCleanup()',
    'constructionCleanupDebt.cleanupComplete',
    'startupFailureOffersInPlaceRetry: true',
    'retryRequiresPriorCompositionDispose: true',
    'constructionCleanupDebtRetainedForRetry: true',
    'retryPreservesMatchSeedSequence: true',
    'startupQueryParsingOccursInsideRetryBoundary: true',
    'crossTabLeaseOwnerUsesEphemeralCryptoIdentity: true',
    'fixedOwnerFallbackDisablesSameOwnerTakeover: true',
    'readArenaV2FormalWebDevelopmentRetentionExportCandidateV1',
    'composition.getOfflineRetentionObservationExportRead()',
    'localRetentionExportReadAvailableOnlyWhenReadyOrActive: true',
    'localRetentionExportReadTriggersDownloadOrUpload: false',
    'staleAsyncGenerationCannotPublishGateState: true',
    'type EntrySynchronousOperation =',
    'let synchronousReentrySequence = 0',
    'let synchronousReentryError: Error | null = null',
    '检测到被Composition、DOM或Observer吞掉的同步重入',
    "runSynchronousOperation('preparation-start'",
    "runSynchronousOperation('preparation-success'",
    "runSynchronousOperation('activation-start'",
    "runSynchronousOperation('activation-success'",
    "runSynchronousOperation('preparation-owner-settlement'",
    "runSynchronousOperation('activation-owner-settlement'",
    "runSynchronousOperation('pagehide'",
    "runSynchronousOperation('pageshow'",
    "'retention-read'",
    'throw failure',
    'preparationAndActivationFailuresRejectPublishedOwners: true',
    'stalePreparationAndActivationGenerationsRejectPublishedOwners: true',
    'asyncSuccessAndOwnerSettlementCommitUnderEntryOperationGuard: true',
    'swallowedCompositionDomOrObserverReentryFailsClosed: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'compositionAndDomCallbacksCheckedBeforeStateOrOwnerCommit: true',
    'compositionCleanupReentryRetainsCurrentOwner: true',
    'asyncChildOwnersCapturedBeforeGenerationCheckedSettlement: true',
    'bootstrapAndPageLifecycleCallbacksUseEntryOperationGuard: true',
    'disposedStatePublishesAfterListenerAndCompositionCleanup: true',
    'detachedOwnerSettlementFailureCommitIsContained: true',
    'pageLifecycleAndRetentionReadUseEntryOperationGuard: true',
    'backForwardCacheRestoreRepreparesCandidate: true',
    'retryAddsPageOrGameplayAction: false',
  ]) if (!isolatedDevelopmentEntry.includes(marker)) {
    throw new Error(`Arena V2隔离开发入口缺少原位重试边界${marker}。`);
  }
  if (isolatedDevelopmentEntry.includes('synchronousReentryAttempted')) {
    throw new Error('Arena V2隔离开发入口不得保留可重置布尔反调事实。');
  }
  const persistentRegistryPublicationPort = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-persistent-registry-publication-port-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'swallowedStorageOrLeaseReentryFailsClosed: true',
    'storageAndLeaseCallbacksCheckedByReentrySequence: true',
    'publicReadsRejectedDuringTransition: true',
    'idempotentDestroyChecksReentryBeforeFastPath: true',
    '#reentrySequence = 0',
    '#runExternalOperation<T>',
    "validationStatus: 'not-run'",
  ]) if (!persistentRegistryPublicationPort.includes(marker)) {
    throw new Error(`Arena V2持久Registry发布端缺少重入治理标记${marker}。`);
  }
  const singleWeaponRegistryPublicationOwner = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-single-weapon-registry-publication-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'swallowedPortReentryFailsClosed: true',
    'portCallbacksCheckedByReentrySequence: true',
    'snapshotRejectedDuringTransition: true',
    '#reentrySequence = 0',
    '#runPortOperation<T>',
    "validationStatus: 'not-run'",
  ]) if (!singleWeaponRegistryPublicationOwner.includes(marker)) {
    throw new Error(`Arena V2单把Registry发布Owner缺少重入治理标记${marker}。`);
  }
  const singleWeaponPersistentRegistrationHost = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-single-weapon-persistent-registration-host-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'swallowedChildReentryFailsClosed: true',
    'publicationActivationAndDestroyCommitUnderStickyTransition: true',
    'snapshotRejectedDuringTransition: true',
    'idempotentDestroyChecksReentryBeforeFastPath: true',
    '#reentryAttempted = false',
    '#reentryError: Error | null = null',
    "validationStatus: 'not-run'",
  ]) if (!singleWeaponPersistentRegistrationHost.includes(marker)) {
    throw new Error(`Arena V2单把Registry持久Host缺少重入治理标记${marker}。`);
  }
  const singleWeaponRegistryPromotionCoordinator = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-single-weapon-registry-promotion-coordinator-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'swallowedChildReentryCannotPublishPromoted: true',
    'childCallsCheckedByReentrySequence: true',
    'promotionWatermarksCommittedBeforeReentryCheck: true',
    'snapshotRejectedDuringTransition: true',
    'idempotentDestroyChecksReentryBeforeFastPath: true',
    'failedCoordinatorRejectsRegistryRead: true',
    '#reentrySequence = 0',
    '#runChildOperation<T>',
    "validationStatus: 'not-run'",
  ]) if (!singleWeaponRegistryPromotionCoordinator.includes(marker)) {
    throw new Error(`Arena V2单把Registry晋级Coordinator缺少重入治理标记${marker}。`);
  }
  const firstWeaponRegistryInitializationOwner = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-first-weapon-registry-initialization-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'swallowedCoordinatorReentryFailsOwnerClosed: true',
    'coordinatorResultCommittedBeforeReentryCheck: true',
    'snapshotAndRegistryReadRejectedDuringOperation: true',
    'failedOwnerCannotClaimDurableRegistryPlayable: true',
    'idempotentDestroyChecksReentryBeforeFastPath: true',
    '#operation: InitializationOperation | null = null',
    '#reentrySequence = 0',
    '#failed = false',
    "validationStatus: 'not-run'",
  ]) if (!firstWeaponRegistryInitializationOwner.includes(marker)) {
    throw new Error(`Arena V2首把Registry初始化Owner缺少重入治理标记${marker}。`);
  }
  const firstWeaponRegistryProvisioningOwner = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-first-weapon-registry-provisioning-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'swallowedChildReentryFailsProvisioningClosed: true',
    'childOwnershipCommittedBeforeReentryCheck: true',
    'postInitializationReentryUsesRuntimeBootstrapRecovery: true',
    'snapshotRejectedDuringOperation: true',
    'idempotentDestroyChecksReentryBeforeFastPath: true',
    '#operation: ProvisioningOperation | null = null',
    '#reentrySequence = 0',
    '#failedByReentry = false',
    "validationStatus: 'not-run'",
  ]) if (!firstWeaponRegistryProvisioningOwner.includes(marker)) {
    throw new Error(`Arena V2首把Registry provisioning Owner缺少重入治理标记${marker}。`);
  }
  const registryBackedLocalPlayableOwner = await readFile(path.join(
    repositoryRoot,
    'packages/arena-regression/src/arena-v2-registry-backed-local-playable-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'swallowedChildReentryFailsLocalOwnerClosed: true',
    'childCallsCheckedByReentrySequence: true',
    'promotionWatermarksCommittedBeforeReentryCheck: true',
    'failedOwnerAllowsExactPromotionRecoveryOnly: true',
    'snapshotAndReadsRejectedDuringOperation: true',
    'idempotentDestroyChecksReentryBeforeFastPath: true',
    '#operation: RegistryBackedLocalPlayableOperation | null = null',
    '#reentrySequence = 0',
    '#failedByReentry = false',
    "validationStatus: 'not-run'",
  ]) if (!registryBackedLocalPlayableOwner.includes(marker)) {
    throw new Error(`Arena V2 Registry-backed local playable Owner缺少重入治理标记${marker}。`);
  }
  for (const file of P5_THREE_FILES) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    for (const [label, pattern] of FORBIDDEN_THREE_PATTERNS) {
      if (pattern.test(source)) throw new Error(`${file}包含禁止的${label}。`);
    }
    for (const marker of [
      "status: 'production-unreachable'",
      'hardGate: false',
      'defaultEntryWired: false',
      'defaultNavigationWired: false',
    ]) if (!source.includes(marker)) throw new Error(`${file}缺少隔离标记${marker}。`);
  }
  for (const root of PRODUCTION_ROOTS) {
    for (const file of await typescriptFiles(path.join(repositoryRoot, root))) {
      const relative = path.relative(repositoryRoot, file);
      if (P5_ISOLATED_FILE_SET.has(relative)) continue;
      const source = await readFile(file, 'utf8');
      if (P5_REACHABILITY.test(source)) {
        throw new Error(`${file}在P5门批准前接入了P5候选。`);
      }
    }
  }
  const screenCatalog = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-screen-registry-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    'hardGate: false',
    'defaultNavigationWired: false',
    'pageCount: 11',
  ]) {
    if (!screenCatalog.includes(marker)) throw new Error(`P5页面目录缺少${marker}。`);
  }
  const presentationContent = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-presentation-content-v1.ts',
  ), 'utf8');
  if (!presentationContent.includes("status: 'production-unreachable'")
    || !presentationContent.includes('contentVersion: 8')
    || !presentationContent.includes('formalVisualAssetsReady: false')) {
    throw new Error('P5表现内容必须保持生产不可达且正式视觉未就绪。');
  }
  const modePreparationLink = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-mode-preparation-link-render-plan-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'primaryActionCountAdded: 0',
    'secondaryActionCountAdded: 1',
    'minimumTouchTargetCssPixels: 48',
    'keepsModeSelectPrimaryStartDirect: true',
    'reusesExistingPreparationPages: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!modePreparationLink.includes(marker)) {
      throw new Error(`P5模式规则次级入口缺少标记${marker}。`);
    }
  }
  const modeCharacterLink = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-mode-character-link-render-plan-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'primaryActionCountAdded: 0',
    'secondaryActionCountAdded: 1',
    'minimumTouchTargetCssPixels: 48',
    'keepsCharacterSelectionOptional: true',
    'returnsToCurrentModeAfterSave: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!modeCharacterLink.includes(marker)) {
      throw new Error(`P5角色次级入口缺少标记${marker}。`);
    }
  }
  const competitivePreparationLinks = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-competitive-preparation-links-render-plan-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'primaryActionCountAdded: 0',
    'secondaryActionCountAdded: 4',
    'minimumTouchTargetCssPixels: 48',
    'keepsPreparedMatchPrimaryStartDirect: true',
    'supportsExplicitReturnToModeSelect: true',
    'survivalUnarmedPreparationUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!competitivePreparationLinks.includes(marker)) {
      throw new Error(`P5竞技准备次级入口缺少标记${marker}。`);
    }
  }
  const survivalPreparationLinks = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-survival-preparation-links-render-plan-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'primaryActionCountAdded: 0',
    'secondaryActionCountAdded: 4',
    'minimumTouchTargetCssPixels: 48',
    'weaponRouteIsCollectionOnly: true',
    'keepsSurvivalPrimaryStartDirect: true',
    'supportsExplicitReturnToModeSelect: true',
    'keepsSurvivalStartUnarmed: true',
    'narrowColumnCount: 2',
    'wideColumnCount: 4',
    "validationStatus: 'not-run'",
  ]) {
    if (!survivalPreparationLinks.includes(marker)) {
      throw new Error(`P5生存准备次级入口缺少标记${marker}。`);
    }
  }
  const preparationDetailReturn = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-preparation-detail-return-render-plan-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'retainedDepth: 1',
    'addsNavigationStack: false',
    'changesPrimaryIntent: false',
    'changesSelectionOrAuthority: false',
    'survivalWeaponDetailReturnForbidden: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!preparationDetailReturn.includes(marker)) {
      throw new Error(`P5准备详情单层返回缺少标记${marker}。`);
    }
  }
  const detailDirectoryLink = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-detail-directory-link-render-plan-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'primaryActionCountAdded: 0',
    'secondaryActionCountAdded: 1',
    'minimumTouchTargetCssPixels: 48',
    'preservesCurrentSelection: true',
    'clearsRetainedPreparationSourceThroughNavigation: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!detailDirectoryLink.includes(marker)) {
      throw new Error(`P5详情返回目录入口缺少标记${marker}。`);
    }
  }
  const detailAdjacentBrowse = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-detail-adjacent-browse-render-plan-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'usesDirectoryOrder: true',
    'excludesInactiveRegistryWeapons: true',
    'wrapsDirectoriesWithThreeOrMoreItems: true',
    'twoItemDirectoryUsesSingleOtherAction: true',
    'primaryActionCountAdded: 0',
    'maximumSecondaryActionCountAdded: 2',
    'visibleDirectoryPositionTextAdded: true',
    'directoryPositionUsesCurrentBrowsableSet: true',
    'adjacentActionLabelsExposeTargetNames: true',
    'selectedIdentityAnchoredInFirstReadingPoint: true',
    'selectedIdentityUsesSameBrowseProjection: true',
    'selectedIdentityPrimitiveCountAdded: 0',
    'minimumTouchTargetCssPixels: 48',
    'changesSelectionOnlyAfterBoundIntent: true',
    'ownsGameplayAuthority: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!detailAdjacentBrowse.includes(marker)) {
      throw new Error(`P5详情连续浏览入口缺少标记${marker}。`);
    }
  }
  const informationContentReadProjection = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-content-read-projection-v1.ts',
  ), 'utf8');
  for (const marker of [
    "implementationStatus: 'code-written-not-run'",
    'weaponDetailFirstViewLeadsWithCoreVerbAndTradeoff: true',
    'weaponDetailCoreReadoutUsesExistingGroundAerialField: true',
    'mapDetailFirstViewUsesFourAnchorRouteSkeleton: true',
    'mapDetailFullRouteRetainsDangerStatistics: true',
    'mapRouteSkeletonReadSharedByDirectoryAndDetail: true',
    'mapRouteSkeletonReadSharedByDirectoryDetailAndPreparation: true',
    'mapRouteSkeletonReadSharedByDirectoryDetailPreparationResultAndMode: true',
    'weaponOperationReadSharedByDetailDirectoryAndHud: true',
    'weaponCoreFightReadSharedByDirectoryDetailPreparationAndResult: true',
    'weaponCoreFightReadSharedByDirectoryDetailPreparationResultAndMode: true',
    'weaponOperationReadNormalizesDefinitionAndCatalogIdentity: true',
    'weaponOperationReadRejectsGroundAerialGestureDrift: true',
    'projectArenaV2WeaponOperationReadV1',
    'projectArenaV2WeaponCoreFightReadV1',
    'projectArenaV2MapRouteSkeletonReadV1',
    "localizedEnum(messages, 'verb', weapon.coreVerb)",
    "validationStatus: 'not-run'",
  ]) {
    if (!informationContentReadProjection.includes(marker)) {
      throw new Error(`P5武器/地图详情快速学习读出缺少标记${marker}。`);
    }
  }
  const weaponMapLearningProjection = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-weapon-map-learning-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'ARENA_V2_WEAPON_MAP_LEARNING_PROJECTION_CONTRACT_V1',
    "weaponSource: 'information-content-catalog.weapon-definition'",
    "modeSituationSource: 'information-content-catalog.mode-consequence'",
    "mapOpportunitySource: 'information-content-catalog.weapon-situation-opportunity-counts'",
    "exampleSegmentPolicy: 'earliest-route-ordinal-owned-by-content-catalog'",
    'segmentProjectionUsesExplicitMapSegmentIdentity: true',
    'segmentProjectionCanReturnNullWhenNotApplicable: true',
    'practiceSummary',
    'projectArenaV2WeaponMapSegmentLearningCandidateV1',
    "'competitive-weapon-detail'",
    "'competitive-map-detail'",
    "'competitive-preparation'",
    "'duel-persistent-current-weapon'",
    "'survival-local-pickup-or-replacement'",
    "'survival-persistent-current-weapon'",
    "'race-next-segment-current-weapon'",
    "'product-result-review'",
    'maximumVisibleSituationCount: 2',
    'readsParticipantPosition: false',
    'infersCurrentSegment: false',
    'writesRuleMatchRewardOrProfile: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!weaponMapLearningProjection.includes(marker)) {
      throw new Error(`P5武器地图学习单一投影缺少治理标记${marker}。`);
    }
  }
  const weaponAvailabilityInformationProjection = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-weapon-availability-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1',
    'projectArenaV2WeaponAvailabilityInformationSelectionCandidateV1',
    "source.newlyPlayable !== true",
    "source.newlyCollected !== false",
    "targetFieldId: 'next-unowned'",
    'targetSelectionDescriptionPrefix: NEWLY_PLAYABLE_SELECTION_PREFIX',
    "const NEWLY_PLAYABLE_SELECTION_PREFIX = '新开放 · 已可用未收藏 · '",
    'fieldCountAdded: 0',
    'selectionFieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    'newlyPlayableNeverMeansCollected: true',
    'currentProfileCollectionOverridesHistoricalAvailabilityNotice: true',
    'readsRegistryOrProfileAtRenderTime: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!weaponAvailabilityInformationProjection.includes(marker)) {
      throw new Error(`P5武器可用未收藏提示缺少治理标记${marker}。`);
    }
  }
  const homeNextLearningSignatureProjection = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-home-next-learning-signature-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'projectArenaV2NextLearningSignatureReadCandidateV1',
    'projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1',
    "targetScreenId: 'home'",
    "targetOwnerId: 'p6-learning-profile'",
    "targetFieldId: TARGET_FIELD_ID",
    "'p6-learning-profile.next-goal.weapon-map-and-segment-definition-ids'",
    "weaponCoreFightSource: 'shared-weapon-core-fight-read-projection'",
    "mapRouteSource: 'shared-map-route-skeleton-read-projection'",
    'readProjectionSharedByHomeAndResult: true',
    'maximumVisibleWeaponSignatureCount: 1',
    'maximumVisibleMapSignatureCount: 1',
    'maximumVisibleMapSegmentSignatureCount: 1',
    'homeUsesCompactStartFinishRoute: true',
    'exactMapSegmentGoalPrecedesRouteSkeleton: true',
    '目标路段是第${segmentOrdinal}段${segmentDisplayName}',
    'homeShowsOneNextMatchContinuationRoute: true',
    'continuationRouteDoesNotMutateSelectionOrNavigation: true',
    'survivalContinuationNeverPromisesWeaponSupply: true',
    'resultCanUseExpandedFourAnchorRoute: true',
    'nullLearningIdentityStillShowsContinuationRoute: true',
    '下一局：${modeLabel}',
    '供给不保证本局一定出现',
    'fieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    'writesGoalProfileAuthorityRewardOrTask: false',
    "status: 'production-unreachable'",
    'hardGate: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!homeNextLearningSignatureProjection.includes(marker)) {
      throw new Error(`P5首页下一目标学习签名缺少治理标记${marker}。`);
    }
  }
  const homeRecordSummaryProjection = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-home-record-summary-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1',
    "targetScreenId: 'home'",
    "targetOwnerId: 'p6-reward-profile'",
    'targetFieldId: TARGET_FIELD_ID',
    "focusSource: 'existing-bottom-navigation-records-focus'",
    "learningSource: 'validated-learning-profile-home-record-summary'",
    'recordFieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    'writesProfileAuthorityRewardOrTask: false',
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
  ]) {
    if (!homeRecordSummaryProjection.includes(marker)) {
      throw new Error(`P5首页记录总览缺少治理标记${marker}。`);
    }
  }
  const survivalRepeatableChallengeProjection = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-survival-repeatable-challenge-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1',
    'ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1.stages',
    'ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1',
    "targetScreenId: 'survival-prep'",
    "targetOwnerId: 'p6-learning-profile'",
    "targetFieldId: TARGET_FIELD_ID",
    'pressureStageCount: PRESSURE_STAGES.length',
    'fieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    'writesAuthorityProfileRewardOrTask: false',
    'usesWallClockTimerOrAsyncOwner: false',
    'hardGate: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!survivalRepeatableChallengeProjection.includes(marker)) {
      throw new Error(`P5 Survival重复挑战投影缺少治理标记${marker}。`);
    }
  }
  const competitiveRepeatableChallengeProjection = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-competitive-repeatable-challenge-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1',
    'ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1',
    'ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.limits.maxCounterValue',
    'ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz',
    "targetScreenId: 'match-prep'",
    "targetOwnerId: 'p5-mode-content'",
    "targetFieldId: TARGET_FIELD_ID",
    "improvementStepPolicy: 'no-formal-step-do-not-invent-exact-tick'",
    'fieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    'writesAuthorityProfileRewardOrTask: false',
    'usesWallClockTimerOrAsyncOwner: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!competitiveRepeatableChallengeProjection.includes(marker)) {
      throw new Error(`P5 Duel/Race重复挑战投影缺少治理标记${marker}。`);
    }
  }
  const modeContentInformation = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-mode-content-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'selectedWeaponDefinitionId',
    'selectedMapDefinitionId',
    'weapon-map-plan',
    '武器Definition与显示名称不一致',
    '地图Definition与显示名称不一致',
    '地图Definition与路线段落总数不一致',
    'competitivePreparationWeaponMapLearningWired: true',
    'competitivePreparationWeaponCoreFightWired: true',
    'projectArenaV2WeaponCoreFightReadV1',
    'projectArenaV2MapRouteSkeletonReadV1',
    'quickStartCurrentLoadoutVisibleBeforePrimaryAction: true',
    'modeSelectionShortWeaponMapSignatureWired: true',
    'modeSelectionSignatureUsesSharedWeaponAndMapProjection: true',
    'acceptedHomeContinuationStateReusesPreparationEntry: true',
    'adjustedHomeContinuationDoesNotBlockCurrentSelection: true',
    'homeContinuationPreparationState',
    'homeContinuationPreparationSource',
    'acceptedResultContinuationStateReusesPreparationEntry: true',
    'continuationPreparationCopyUsesExplicitSource: true',
    '目标已准备｜',
    '已改选｜',
    'survivalSkipsWeaponCoreFightProjection: true',
    'survivalStartsUnarmedWithoutPreselectedWeaponPlan: true',
    'shortRouteSignature',
    '1v1/竞速：${selectedWeaponDisplayName}',
    '生存：${selectedMapDisplayName}',
    '默认空手开局',
    "validationStatus: 'not-run'",
  ]) {
    if (!modeContentInformation.includes(marker)) {
      throw new Error(`P5竞技准备武器地图学习缺少治理标记${marker}。`);
    }
  }
  const resultContinuationReceipt = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-result-home-continuation-receipt-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "new Set(['schemaVersion', 'fieldSource', 'sourceKind', 'receiptKind'])",
    "acceptedSources: Object.freeze(['home', 'result'] as const)",
    'sourceCopyNeverInferredFromGoalOrSelection: true',
    '上局目标',
    '上局结算目标回执',
    'neverClaimsGoalCompletion: true',
    'fieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    "validationStatus: 'not-run'",
  ]) {
    if (!resultContinuationReceipt.includes(marker)) {
      throw new Error(`P5结果续玩回执缺少治理标记${marker}。`);
    }
  }
  const preparationLearningFocus = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-preparation-learning-focus-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1',
    "competitiveTargetFieldId: 'weapon-map-plan'",
    "survivalTargetFieldId: 'pressure-summary'",
    'Arena生存准备不能携带预选武器身份',
    'Arena准备学习目标与当前Profile revision不一致',
    'Arena准备学习目标与当前模式不一致',
    'Arena准备武器情境目标与当前武器不一致',
    'projectArenaV2MapRouteSkeletonReadV1',
    'mapRouteSkeletonAlwaysVisibleBeforePrimaryAction: true',
    'mapRouteSkeletonUsesSharedDetailDirectoryProjection: true',
    'uniqueLongTermGoalFitVisibleBeforePrimaryAction: true',
    'uniqueLongTermGoalFitReusesProgressionRouteFit: true',
    'incompatibleCombinationDoesNotBlockFreeStart: true',
    'conditionalSurvivalSupplyNeverPromisesSpawn: true',
    '长期目标：当前组合可稳定推进',
    '长期目标：当前组合不能推进',
    '长期目标：条件推进',
    'validatesTargetNumericLayoutByMode: true',
    'addsPagesFieldsActionsOrTasks: false',
    'mutatesProfileRewardSelectionOrAuthority: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!preparationLearningFocus.includes(marker)) {
      throw new Error(`P5准备页学习焦点缺少治理标记${marker}。`);
    }
  }
  const twentyWeaponFeedbackHudHost = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'createDeterministicDataHash',
    '同批方向事实ID重复',
    '同批反馈事件ID重复',
    '同批读取计划ID重复',
    '同一反馈ID不能从徒手漂移为武器',
    '徒手方向事实身份漂移',
    '权威反馈事件身份漂移',
    'retainedFeedbackIdentityImmutable: true',
    "duplicateFeedbackIdentityPolicy: 'fail-closed-before-presentation-side-effects'",
    'assertSynchronousReturn(result, \'Arena V2 twenty weapon HUD visual.remove\')',
    'epochIdentityClearCommitsAfterInnerEpochSwitch: true',
    'failedCleanupRetainsFeedbackReadIdentity: true',
    'cleanupRetriesOnlyIncompleteInnerHost: true',
    'terminalStateWaitsForInnerHost: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'synchronousPortMethodPrototypeDepthLimit: MAXIMUM_SYNC_PORT_METHOD_PROTOTYPE_DEPTH',
    'synchronousPortMethodPrototypeCycleRejected: true',
    'innerHostAndExternalEffectCallbacksCheckedBeforeIdentityCommit: true',
    'swallowedExternalEffectReentryStopsIdentityDeletionAndQueuePruning: true',
    'swallowedInnerHostCleanupReentryRetainsInnerHostOwnership: true',
    'swallowedInnerHostVisualOrAudioReentryFailsClosed: true',
    'epochConsumeAndDisposeCommitUnderStickyOperation: true',
    'stateAndSnapshotReadsRejectedDuringOperation: true',
    'idempotentDisposeChecksReentryBeforeFastPath: true',
    'specializedRenderModelFeedsExistingQueue: true',
    'impactStrengthPlayerLabelsEnabled: true',
    'impactStrengthAudioUsesExistingCueAndBus: true',
    'presentPassthroughDirectional',
    'unarmedDirectionAndImpactStrengthPreserved: true',
    'unarmedDirectionalVisualPortCompatibilityFallback: true',
    'unarmedAudioStrengthUsesExistingCueAndBus: true',
    'addsSameCatalogResultOrRiskLearningLoop: true',
    'learningHintPrecedesGenericOutcomeCopy: true',
    'duplicatesWeaponLearningCopy: false',
    "status: 'production-unreachable'",
    'hardGate: false',
    'validationStatus: \'not-run\'',
  ]) {
    if (!twentyWeaponFeedbackHudHost.includes(marker)) {
      throw new Error(`P5二十武器反馈Host缺少完整身份不可变标记${marker}。`);
    }
  }
  const unarmedDirectionPresentation = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-unarmed-feedback-direction-presentation-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1',
    'ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1',
    'PASSTHROUGH_CUE_BY_FEEDBACK_KIND',
    'exactUnarmedActionIdentityRequired: true',
    'exactFeedbackFactIdentityRequired: true',
    'reusesGenericCueAndAuthoredBudget: true',
    'infersDirectionFromPositionOrAnimation: false',
    'addsTextureAudioOrParticleBudget: false',
    "status: 'production-unreachable'",
    'hardGate: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!unarmedDirectionPresentation.includes(marker)) {
      throw new Error(`P5.3zzzwh徒手方向反馈投影缺少治理标记${marker}。`);
    }
  }
  const modeHudRenderPlan = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-ui-render-plan-v1.ts',
  ), 'utf8');
  for (const marker of [
    'ARENA_V2_MODE_HUD_FEEDBACK_READABILITY_CONTRACT_V1',
    "impactStrengthLabelPosition: 'title-prefix'",
    "weaponLearningHintPosition: 'explanation-prefix'",
    'primaryLearningTitleMaximumLines: 2',
    'primaryLearningExplanationMaximumLines: 3',
    'narrowLearningFocusSecondaryCardsRendered: false',
    'hiddenSecondaryItemsRemainQueuedAndLiveAnnounced: true',
    'singleLineHudFactsUseMeasuredEllipsis: true',
    'truncatedVisibleTextRetainsFullAccessibilityText: true',
    'reducedMotionRetainsCausalAndLearningText: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!modeHudRenderPlan.includes(marker)) {
      throw new Error(`P5 HUD命中学习反馈缺少可读性标记${marker}。`);
    }
  }
  const modeHudViewModel = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-view-model-v1.ts',
  ), 'utf8');
  for (const marker of [
    "readonly kind: 'duel'",
    'readonly mapDefinitionId: string',
    'readonly mapDisplayName: string',
    'ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(',
    'info.content.selectedMapDefinitionId !== frame.worldSnapshot.map.definitionId',
    'PublicMatchInfo内容地图身份与Frame不一致',
    'mapDefinitionId: frame.worldSnapshot.map.definitionId',
    'Arena V2 HUD 1v1地图',
  ]) {
    if (!modeHudViewModel.includes(marker)) {
      throw new Error(`P5 HUD 1v1地图学习身份缺少治理标记${marker}。`);
    }
  }
  const modeHudRenderModel = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-render-model-v1.ts',
  ), 'utf8');
  for (const marker of [
    'ARENA_V2_MODE_HUD_WEAPON_MAP_LEARNING_CONTRACT_V1',
    'ARENA_V2_LOCAL_PICKUP_MAP_LEARNING_CONTRACT_V1',
    "authorityMapSource: 'hud-view-model.mode.mapDefinitionId'",
    "weaponSituationSource: 'weapon-map-learning-projection.mode-consequence'",
    "mapOpportunitySource: 'weapon-map-learning-projection.current-map-opportunity-counts'",
    'projectArenaV2WeaponMapLearningCandidateV1',
    'projectArenaV2WeaponOperationReadV1',
    'maximumVisibleSituationCount: 2',
    'readsParticipantPosition: false',
    'infersCurrentSegment: false',
    '显示身份漂移',
    'fullPracticeCopyAppliesOnlyToLocalPickupOrReplacement: true',
    'persistentVisibleCopyLimitedToPrimarySituation: true',
    'persistentLocalWeaponFactUsesPrimarySituation: true',
    "persistentLocalWeaponRenderPrimitiveId: 'hud:local:local-weapon'",
    'persistentVisibleMaximumLines: 1',
    "persistentCanvasOverflowPolicy: 'measured-ellipsis'",
    'persistentAccessibilityUsesConcretePracticeSummary: true',
    'persistentAccessibilityTextTruncated: false',
    "hudCollectionIdentityNormalizationPolicy: 'catalog-id-to-unique-definition-id'",
    'requireArenaV2WeaponDefinitionIdV1(',
    'raceRouteWeaponPractice(',
    'projectArenaV2WeaponMapSegmentLearningCandidateV1(',
    '竞速路段武器学习显示身份漂移',
    'duelPersistentLearningUsesAuthorityMapIdentity: true',
    'duelPersistentVisibleCopyLimitedToPrimarySituation: true',
    'racePersistentMapLevelCopyAllowed: false',
    'localDuelWeaponMapLearning(',
    'localPersistentWeaponMapLearning(',
    'Arena V2 HUD 1v1地图',
    'localSurvivalWeaponMapLearning(',
    '` · 练${persistentLearning.situations[0]!.displayName}`',
    'addsPagePopupTaskOrReward: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!modeHudRenderModel.includes(marker)) {
      throw new Error(`P5本地拾取地图学习缺少治理标记${marker}。`);
    }
  }
  const modeHudFeedbackQueue = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-queue-v1.ts',
  ), 'utf8');
  for (const marker of [
    'TERMINAL_MODE_VISUAL_CUES',
    "'match-ended'",
    "'race-finish-claimed'",
    "'survival-terminal-fall'",
    'DECISIVE_MODE_VISUAL_CUES',
    "'survival-first-fall'",
    "item.visualCue.startsWith('participant-fell-')",
    "item.visualCue.includes('.hit-ring-out.')",
    "'authoritative-match-ended'",
    "'terminal-finish-or-fall'",
    "'decisive-fall-or-ring-out'",
    "'strong-or-warning-weapon-impact'",
    "'ordinary-mode-or-weapon-feedback'",
    "'supply-feedback'",
    'localizedCopyDoesNotAffectPriority: true',
    'visibleAndRetainedLimitsUnchanged: true',
    'visualEffectCountNotExpanded: true',
    'oneShotAudioCountBoundedByExistingVoiceLimit: true',
    'localWeaponAudioCanSurviveVisualCongestion: true',
    'audioVoicePriorityUsesSemanticPriority: true',
    'audioVoicePriorityDoesNotChangeGainDb: true',
    'maximumConcurrentAudioVoicesUnchanged: true',
    "'local-involved'",
    "'global'",
    "'remote-only'",
    'perspectiveDerivedFromValidatedParticipantIdsBeforeQueue: true',
    'perspectiveCannotBeChangedByWeaponSpecialization: true',
    'higherSemanticPriorityCannotBeOverriddenByPerspective: true',
    'matchEndedAlwaysHighest: true',
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
  ]) {
    if (!modeHudFeedbackQueue.includes(marker)) {
      throw new Error(`P5 HUD拥挤反馈语义优先级缺少治理标记${marker}。`);
    }
  }
  const semanticPriorityBody = modeHudFeedbackQueue.slice(
    modeHudFeedbackQueue.indexOf('function semanticPriority('),
    modeHudFeedbackQueue.indexOf('\nfunction lifetimeTicks('),
  );
  for (const localizedField of ['title', 'explanation']) {
    if (semanticPriorityBody.includes(localizedField)) {
      throw new Error(`P5 HUD拥挤反馈优先级不得读取本地化字段${localizedField}。`);
    }
  }
  for (const marker of [
    'ARENA_V2_MODE_HUD_FEEDBACK_PERSPECTIVE_CONTRACT_V1',
    "source: 'validated-local-participant-and-feedback-participant-ids'",
    'weaponFeedbackPerspective(',
    'supplyFeedbackPerspective(',
    'modeFeedbackPerspective(',
    'localizedCopyDoesNotAffectPerspective: true',
    'weaponSpecializationCannotChangePerspective: true',
    'writesRuleMatchOrResult: false',
  ]) {
    if (!modeHudRenderModel.includes(marker)) {
      throw new Error(`P5 HUD本地视角相关度缺少治理标记${marker}。`);
    }
  }
  const feedbackEffectConsumer = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
  ), 'utf8');
  for (const marker of [
    "audioVoicePrioritySource: 'feedback-queue-semantic-priority'",
    "audioGainSource: 'existing-feedback-emphasis'",
    'audioVoicePriorityDoesNotChangeGainDb: true',
    'maximumConcurrentAudioVoices: 8',
    'priority: cue.voicePriority',
    'const gainPriority = emphasisPriority(emphasis)',
    'voicePriority !== 1 && voicePriority !== 2 && voicePriority !== 3',
  ]) {
    if (!feedbackEffectConsumer.includes(marker)) {
      throw new Error(`P5 HUD音频语义抢占缺少治理标记${marker}。`);
    }
  }
  const weaponOperationReadBody = modeHudRenderModel.slice(
    modeHudRenderModel.indexOf('function weaponOperationRead('),
    modeHudRenderModel.indexOf('\nfunction localSurvivalWeaponMapLearning(',
      modeHudRenderModel.indexOf('function weaponOperationRead(')),
  );
  for (const forbidden of ['commitTicks', 'expireTicks', 'expireOutcome', 'canTurn']) {
    if (weaponOperationReadBody.includes(forbidden)) {
      throw new Error(`P5 HUD不得重新判定武器操作字段${forbidden}。`);
    }
  }
  const informationContentCatalog = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-content/src/arena-v2-information-content-read-catalog-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'weaponSituationOpportunityCounts',
    'weaponSituationOpportunity(',
    'isArenaV2WeaponSituationOpportunityCandidateV1(',
    'exampleSegment',
    'weaponMapSituationCount: 6',
    'weaponSituationOpportunityCountsOwnedByContent: true',
    "weaponSituationExampleSegmentPolicy: 'earliest-route-ordinal'",
  ]) {
    if (!informationContentCatalog.includes(marker)) {
      throw new Error(`P5内容目录缺少地图武器机会所有权标记${marker}。`);
    }
  }
  const informationContentProjection = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-information-content-read-projection-v1.ts',
  ), 'utf8');
  for (const marker of [
    'ArenaV2CompetitiveWeaponMapLearningContextV1',
    'competitiveLearningProjection(',
    'projectArenaV2WeaponMapLearningCandidateV1',
    'competitiveWeaponMapDetailLearningUsesSharedProjection: true',
    'survivalPreselectedWeaponLearningAllowed: false',
    'Arena V2武器详情与竞技学习武器身份不一致',
    'Arena V2地图详情与竞技学习地图身份不一致',
  ]) {
    if (!informationContentProjection.includes(marker)) {
      throw new Error(`P5详情武器地图学习接力缺少治理标记${marker}。`);
    }
  }
  const productSessionInformation = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-product-session-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'ARENA_V2_PRODUCT_RESULT_WEAPON_MAP_REVIEW_CONTRACT_V1',
    "authorityMapSource: 'product-result-v3.content.selectedMapDefinitionId'",
    "weaponUsageSource: 'participant-equipment-usage-v3'",
    "reviewFocusPolicy: 'lowest-collection-order-among-used-weapons'",
    "coreFightSource: 'shared-weapon-core-fight-read-projection'",
    'maximumVisibleCoreFightCount: 1',
    'coreFightSelectionUsesReviewFocus: true',
    "unknownMapPolicy: 'preserve-usage-fact-without-review-guess'",
    'maximumVisibleSituationCount: 2',
    'readsParticipantPosition: false',
    'infersCurrentSegment: false',
    'claimsHitCountSuccessOrPerformance: false',
    'projectArenaV2WeaponCoreFightReadV1',
    '主复盘不代表命中次数或表现结论',
    'resultReviewDoesNotClaimHitCountSuccessOrPerformance: true',
    'resultReviewVisibleCoreFightCount: 1',
    'addsPagePopupTaskRewardOrProfileField: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!productSessionInformation.includes(marker)) {
      throw new Error(`P5结算武器地图回看缺少治理标记${marker}。`);
    }
  }
  const uiCanvasPainter = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-ui-canvas-painter-v1.ts',
  ), 'utf8');
  for (const marker of [
    'forceEllipsis = false',
    'const maximumLinesByHeight = Math.max(1, Math.floor(target.height / lineHeight))',
    'Math.min(primitive.maximumLines, maximumLinesByHeight)',
  ]) {
    if (!uiCanvasPainter.includes(marker)) {
      throw new Error(`P5 Canvas命中学习反馈缺少有界换行标记${marker}。`);
    }
  }
  const modeHudPresentationHost = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-presentation-host-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#cleanupStarted = false',
    '#projectionConsumerDisposed = false',
    '#effectConsumerDisposed = false',
    '#cleanupChildren(): readonly unknown[]',
    '#cleanupComplete(): boolean',
    'cleanupRetriesOnlyIncompleteChildConsumers: true',
    'cleanupFollowsEffectConsumerBeforeProjectionProducer: true',
    'if (this.#effectConsumerDisposed && !this.#projectionConsumerDisposed)',
    'terminalStateWaitsForBothChildConsumers: true',
    'swallowedChildConsumerOrExternalEffectReentryFailsClosed: true',
    'epochConsumeAndDisposeCommitUnderStickyOperation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeCrossChildProgressOrHostCommit: true',
    'swallowedChildCleanupReentryRetainsCurrentAndLaterOwners: true',
    'stateAndSnapshotReadsRejectedDuringOperation: true',
    'idempotentDisposeChecksReentryBeforeFastPath: true',
    'boundedWeaponFeedbackRenderProjectionForwarded: true',
    "status: 'production-unreachable'",
    'hardGate: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!modeHudPresentationHost.includes(marker)) {
      throw new Error(`P5 HUD Presentation Host缺少子Owner终态清理水位${marker}。`);
    }
  }
  const modeHudConsumerEpoch = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-consumer-epoch-v1.ts',
  ), 'utf8');
  for (const marker of [
    "'projectedRenderModel'",
    'boundedWeaponFeedbackRenderProjectionAllowed: true',
    'projectedRenderModelMayChangeAuthorityIdentity: false',
    '只允许专门化武器反馈',
  ]) {
    if (!modeHudConsumerEpoch.includes(marker)) {
      throw new Error(`P5 HUD Consumer Epoch缺少受限武器表现投影标记${marker}。`);
    }
  }
  const impactStrengthProjection = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-weapon-impact-strength-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'mediumMinimumHorizontalImpulse: 8',
    'heavyMinimumHorizontalImpulse: 12',
    "authoritySource: 'weapon-feedback-direction-fact-v2.horizontalImpulseMagnitude'",
    'readsWeaponLevel: false',
    'infersFromDistanceOrAnimation: false',
    "status: 'production-unreachable'",
    'hardGate: false',
    'defaultRegistryWired: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!impactStrengthProjection.includes(marker)) {
      throw new Error(`P5命中力度投影缺少治理标记${marker}。`);
    }
  }
  const twentyWeaponFeedbackHost = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'const priority = command.priority >= strength.presentation.minimumAudioPriority',
    'const gainDb = command.gainDb >= strength.presentation.minimumAudioGainDb',
    'impactStrengthAudioPriorityAndGainFloorsIndependent: true',
  ]) {
    if (!twentyWeaponFeedbackHost.includes(marker)) {
      throw new Error(`P5命中力度音频独立下限缺少治理标记${marker}。`);
    }
  }
  const formalThreeVfx = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'authorityImpactStrengthProjectionWired: true',
    'impactStrengthAddsParticleOrLayerBudget: false',
    'direction.directionArrowScaleMultiplier',
    'effect.impactScaleMultiplier',
    'direction?.cameraImpactScaleMultiplier ?? 1',
    'direction?.characterImpactScaleMultiplier ?? 1',
    "command.perspective !== 'local-involved'",
    'cameraImpactRequiresLocalInvolvement: true',
    'remoteWeaponImpactKeepsWorldAndCharacterFeedback: true',
    'presentPassthroughDirectional(value: unknown)',
    'unarmedPassthroughConsumesAuthorityDirectionFactsV2: true',
    'unarmedPassthroughReusesGenericCueAndAssetBudget: true',
  ]) {
    if (!formalThreeVfx.includes(marker)) {
      throw new Error(`P5正式Three VFX缺少统一力度表现标记${marker}。`);
    }
  }
  for (const marker of [
    '#cleanupStarted = false',
    '#visualCleared = false',
    '#audioStopped = false',
    '#visualEffectsOwned = false',
    '#audioEffectsOwned = false',
    '#cleanupOwnedEffects(): readonly unknown[]',
    '#cleanupComplete(): boolean',
    'if (this.#visualEffectsOwned && !this.#visualCleared)',
    'if (this.#audioEffectsOwned && !this.#audioStopped)',
    'cleanupRetriesOnlyIncompleteExternalEffects: true',
    'epochSwitchCarriesPartialCleanupIntoFailedState: true',
    'terminalStateWaitsForVisualClearAndAudioStop: true',
    'freshOwnerDisposeHasNoExternalSideEffects: true',
    'externalEffectOwnershipBeginsBeforePotentialSideEffect: true',
    'swallowedVisualOrAudioReentryFailsClosed: true',
    'loadEpochConsumeAndDisposeCommitUnderStickyOperation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'externalEffectCallbacksCheckedBeforeLaterEffectsOrProjectionWatermark: true',
    'swallowedExternalEffectReentryStopsLaterEffectDispatch: true',
    'cleanupReentryRetainsCurrentAndLaterEffectOwnership: true',
    'stateAndSnapshotReadsRejectedDuringOperation: true',
    'idempotentDisposeChecksReentryBeforeFastPath: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!feedbackEffectConsumer.includes(marker)) {
      throw new Error(`P5 HUD反馈消费者缺少终态清理水位${marker}。`);
    }
  }
  const formalHudCanvasLayer = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-formal-hud-canvas-layer-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'assertSynchronousReturn as rejectThenable',
    '#cleanupStarted = false',
    '#pixelsCleared = true',
    '#liveRegionRemoved = true',
    '#contextReleased = true',
    '#cleanupComplete(): boolean',
    'this.#pixelsCleared && !this.#contextReleased',
    'cleanupRetriesOnlyIncompletePlatformResources: true',
    'contextReleaseWaitsForPixelClear: true',
    'canvasAndAccessibilityStateRestoreIndependently: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'platformCallbacksCheckedBeforeRenderAndLifecycleWatermarks: true',
    'renderProjectionAndPaintCallbacksCheckedBeforeSnapshotPublication: true',
    'cleanupReentryRetainsCurrentOwnerAndStopsLaterResources: true',
    "this.#assertNoOperation('state-read')",
    "this.#assertNoOperation('last-render-plan-read')",
    "this.#assertNoOperation('last-paint-result-read')",
    "this.#assertNoOperation('last-marker-projection-read')",
    'swallowedCanvasDomViewportOrAccessibilityReentryFailsClosed: true',
    'publicStateAndRenderReadsRejectedDuringOperationCommit: true',
    'terminalSuccessCannotOverwriteSwallowedReentry: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!formalHudCanvasLayer.includes(marker)) {
      throw new Error(`P5正式HUD Canvas缺少逐平台资源清理所有权标记${marker}。`);
    }
  }
  if (formalHudCanvasLayer.includes('#reentryAttempted')) {
    throw new Error('P5正式HUD Canvas不得保留可重置布尔反调事实。');
  }
  const formalWebAudioPort = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'expectedVoice: ActiveVoice',
    'voice === undefined || voice !== expectedVoice',
    'this.#stopVoice(cue.sourceEventId)',
    'lateEndedCallbackCannotReleaseReplacementVoice: true',
    'failedVoiceCleanupRetainsOriginalVoiceOwnership: true',
    'voiceCleanupRetriesOnlyIncompleteNodes: true',
    'if (this.#voices.size === 0)',
    'busAndContextCleanupWaitForAllVoices: true',
    'contextCloseRequestRetriesUntilAccepted: true',
    'asynchronousContextCloseFailureReopensCleanupOwnership: true',
    "DISPOSING: 'disposing'",
    '#contextCloseCompleted = false',
    'contextCloseRequestIsNotCleanupCompletion: true',
    'parentMustRetainOwnershipUntilContextCloseCompletes: true',
    '#loadPending = false',
    'let loadingOperations: Promise<void>[] = []',
    'Promise.allSettled(loadingOperations)',
    'decode settlement',
    'Arena V2 formal Web audio启动失败终态水位',
    'Arena V2 formal Web audio加载成功提交',
    'Arena V2 formal Web audio加载终态水位',
    'Arena V2 formal Web audio激活成功提交',
    'Arena V2 formal Web audio激活终态水位',
    "this.#runSynchronousOperation('state-read'",
    "this.#runSynchronousOperation('snapshot-read'",
    '检测到被Web Audio或Observer吞掉的同步重入',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'fetchDecodeAndResumeCallsRetainAsyncOwnerBeforeReentryCheck: true',
    'voiceNodeCallbacksCheckedBeforeVoiceOrRecentIdentityCommit: true',
    'voiceBusAndContextCleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true',
    'contextCloseOwnerCapturedBeforeReentryCheck: true',
    'contextCloseSettlementHooksCapturedBeforeReentryCheck: true',
    'waitsForEntireAudioLoadBatchSettlement: true',
    'reportsEveryRejectedAudioLoadInSettledBatch: true',
    'contextCloseWaitsForAudioLoadingToSettle: true',
    'loadAndActivationSettlementAutomaticallyContinueRequestedDisposal: true',
    'contextCloseCompletionNotifiesOwningHost: true',
    'contextCloseFailureRequiresExplicitOwnerRetry: true',
    'terminalContinuationUsesAsyncSettlementNotPolling: true',
    'swallowedWebAudioOrObserverReentryFailsClosed: true',
    'eachDecodeSettlementCommitsUnderOperationGuard: true',
    'loadAndActivationTerminalWatermarksCommitUnderOperationGuard: true',
    'synchronousLoadLaunchFailureSettlesPublishedOwner: true',
    'repeatedPendingLoadAndActivationReusePublishedOwners: true',
    "this.#assertNoOperation('Arena V2 formal Web audio load')",
    "this.#assertNoOperation('Arena V2 formal Web audio activate')",
    'repeatedLoadAndActivationCheckReentryBeforeOwnerReuse: true',
    'this.#assertAudioAssetsPermitted()',
    'productionApprovalCheckedBeforeFetch: true',
    'productionApprovalUsesSharedLedgerIndex: true',
    'defaultUnapprovedCandidateLoadingAllowed: false',
    'currentProductionApprovedAudioAssetCount: 0',
  ]) {
    if (!formalWebAudioPort.includes(marker)) {
      throw new Error(`P5正式Web Audio缺少Voice/总线清理所有权标记${marker}。`);
    }
  }
  if (formalWebAudioPort.includes('#reentryAttempted')) {
    throw new Error('P5正式Web Audio不得保留可重置布尔反调事实。');
  }
  const audioApprovalPreflight = formalWebAudioPort.indexOf(
    'this.#assertAudioAssetsPermitted()',
  );
  const firstAudioFetch = formalWebAudioPort.indexOf('this.#window.fetch(');
  if (
    audioApprovalPreflight === -1
    || firstAudioFetch === -1
    || audioApprovalPreflight >= firstAudioFetch
  ) throw new Error('P5正式Web Audio必须在首个fetch前闭合生产批准。');
  const formalThreeVfxPort = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'assertSynchronousReturn as rejectThenable',
    'readonly #effectCleanupDebts = new Set<ActiveEffect>()',
    '#retainEffectCleanupDebt(effect: ActiveEffect): void',
    'const cleanupErrors = disposeEffect(draft)',
    'this.#retainEffectCleanupDebt(effect)',
    'readonly #pendingTextures = new Set<THREE.Texture>()',
    '#clearPendingTextures(): readonly unknown[]',
    'this.#pendingTextures.add(texture)',
    'this.#pendingTextures.delete(texture)',
    'let loadingOperations: Promise<void>[] = []',
    'Promise.allSettled(loadingOperations)',
    'texture settlement',
    'Arena V2 formal Three VFX启动失败终态水位',
    'Arena V2 formal Three VFX纹理加载成功提交',
    'Arena V2 formal Three VFX纹理加载终态水位',
    "this.#runSynchronousOperation('state-read'",
    "this.#runSynchronousOperation('snapshot-read'",
    '检测到被Texture、Three或Impact吞掉的同步重入',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'textureThreeAndImpactCallbacksCheckedBeforeCrossOwnerOrStateCommit: true',
    'terminalCleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true',
    'syncResolversCheckedBeforeFrameWatermarkCommit: true',
    'failedEffectCleanupRetainsOriginalEffectOwnership: true',
    'failedEffectConstructionRetainsRetryableCleanupDebt: true',
    'effectMountIsTransactional: true',
    'effectCleanupRetriesOnlyIncompleteResources: true',
    'terminalCleanupRetriesOnlyIncompleteOwnedResources: true',
    'lateTextureCleanupRetainsRetryOwnership: true',
    'disposalWaitsForTextureLoadingToSettle: true',
    'textureSettlementAutomaticallyContinuesRequestedDisposal: true',
    'terminalContinuationUsesAsyncSettlementNotPolling: true',
    'textureBatchSettlementCannotCompleteOnFirstFailure: true',
    'reportsEveryRejectedTextureInSettledBatch: true',
    'lateLoadFailureCannotRefailClosedOwner: true',
    'swallowedTextureThreeOrImpactReentryFailsClosed: true',
    'eachTextureSettlementCommitsUnderOperationGuard: true',
    'textureBatchAndTerminalWatermarksCommitUnderOperationGuard: true',
    'synchronousLaunchFailureSettlesPublishedLoadOwner: true',
    'lateTexturesAreDisposedBeforeSettlementRejects: true',
    "this.#assertNoOperation('Arena V2 formal Three VFX load')",
    'repeatedLoadChecksReentryBeforeOwnerReuse: true',
    'productionApprovalCheckedBeforeTextureLoaderInvocation: true',
    'productionApprovalUsesSharedLedgerIndex: true',
    'defaultUnapprovedCandidateLoadingAllowed: false',
    'currentProductionApprovedVfxTextureAssetCount: 0',
  ]) {
    if (!formalThreeVfxPort.includes(marker)) {
      throw new Error(`P5正式Three VFX缺少Effect/纹理清理所有权标记${marker}。`);
    }
  }
  if (formalThreeVfxPort.includes('#reentryAttempted')) {
    throw new Error('P5正式Three VFX不得保留可重置布尔反调事实。');
  }
  const vfxApprovalPreflight = formalThreeVfxPort.indexOf(
    'records.length !== ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length',
  );
  const firstTextureLoad = formalThreeVfxPort.indexOf('this.#textureLoader.loadAsync(');
  if (
    vfxApprovalPreflight === -1
    || firstTextureLoad === -1
    || vfxApprovalPreflight >= firstTextureLoad
  ) throw new Error('P5正式Three VFX必须在首个texture loader前闭合生产批准。');
  const formalAssetProductionApproval = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-formal-asset-production-approval-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'productionApproved && assetUsePermitted && formalReady',
    'entry.artifactPath !== asset.artifactPath',
    'entry.byteLength !== asset.byteLength',
    'entry.sha256 !== asset.sha256',
    'modelLoadingRequiresApprovedExternalTextureDependencyClosure: true',
    'currentProductionApprovedAssetCount: 0',
    'sourceIntakeDoesNotGrantProductionApproval: true',
    'candidateBudgetCoverageDoesNotGrantProductionApproval: true',
  ]) {
    if (!formalAssetProductionApproval.includes(marker)) {
      throw new Error(`P5正式资产批准索引缺少共享真值标记${marker}。`);
    }
  }
  const formalThreeAssetPreloader = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-asset-preloader-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'Promise.allSettled(operations)',
    'this.#assertDefinitionsPermitted(definitions)',
    'ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1',
    'productionApprovalUsesSharedLedgerIndex: true',
    'productionApprovalCheckedBeforeLoaderInvocation: true',
    'defaultUnapprovedCandidateLoadingAllowed: false',
    'isolatedCandidateLoadingRequiresExplicitOptIn: true',
    'currentProductionApprovedVisualAssetCount: 0',
    'task.isCleanupComplete()',
    'this.#tasks.size === 0 && !this.#loadPending',
    'waitsForEntireLoadBatchSettlement: true',
    'reportsEveryRejectedLoadInSettledBatch: true',
    'retainsIncompleteTasksForCleanupRetry: true',
    'disposalWaitsForLoadingToSettle: true',
    'loadingSettlementAutomaticallyContinuesRequestedDisposal: true',
    'terminalContinuationUsesAsyncSettlementNotPolling: true',
    'lateLoadFailureCannotRefailClosedOwner: true',
    'swallowedTaskOrLoaderReentryFailsClosed: true',
    'eachAssetSettlementCommitsUnderOperationGuard: true',
    'batchSuccessAndTerminalWatermarksCommitUnderOperationGuard: true',
    'synchronousLaunchFailureCommitsFailedAfterStartedTasksSettle: true',
    'publicAssetAndSnapshotReadsUseOperationGuard: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'taskLoadCheckedBeforeLaunchingLaterTasks: true',
    'taskCleanupCheckedBeforeOwnershipRelease: true',
    'cleanupReentryRetainsCurrentAndLaterTasks: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#assertNoOperation('Arena V2 formal Three asset preloader load')",
    "this.#assertNoOperation('Arena V2 formal Three asset preloader dispose')",
    'repeatedLoadAndIdempotentDisposeCheckReentryBeforeFastPath: true',
    "this.#runSynchronousCommit('state-read'",
    "this.#runSynchronousCommit('asset-read'",
    "this.#runSynchronousCommit('snapshot-read'",
    'const taskOperation = task.load();',
    'Arena V2 formal Three asset preloader加载成功提交',
    'Arena V2 formal Three asset preloader加载终态水位',
    'Arena V2 formal Three asset preloader启动失败提交',
  ]) {
    if (!formalThreeAssetPreloader.includes(marker)) {
      throw new Error(`P5正式Three资产预加载器缺少迟到租约所有权标记${marker}。`);
    }
  }
  if (formalThreeAssetPreloader.includes('#reentryAttempted')) {
    throw new Error('P5正式Three资产预加载器不得恢复可重置布尔反调事实。');
  }
  const approvalPreflight = formalThreeAssetPreloader.indexOf(
    'this.#assertDefinitionsPermitted(definitions)',
  );
  const firstAssetTask = formalThreeAssetPreloader.indexOf(
    'new PresentationAssetLoadTask({',
  );
  if (approvalPreflight === -1 || firstAssetTask === -1 || approvalPreflight >= firstAssetTask) {
    throw new Error('P5正式Three资产预加载器必须在首个loader task前闭合生产批准。');
  }
  const formalWebMatchHost = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-formal-web-match-host-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '{ allowUnapprovedCandidates: true }',
    '{ loader: source.assetLoader, allowUnapprovedCandidates: true }',
    'preloaderExplicitlyOptsIntoUnapprovedCandidateLoading: true',
    'audioExplicitlyOptsIntoUnapprovedCandidateLoading: true',
    'vfxExplicitlyOptsIntoUnapprovedCandidateLoading: true',
    'stageExplicitlyOptsIntoUnapprovedCandidateRendering: true',
    'isolatedDevelopmentUsesExplicitUnapprovedCandidatePath: true',
  ]) {
    if (!formalWebMatchHost.includes(marker)) {
      throw new Error(`P5隔离Web宿主缺少候选资产显式许可标记${marker}。`);
    }
  }
  const p5DeferredRunnerSource = await readFile(path.join(
    repositoryRoot,
    'scripts/run-arena-p5-candidate-tests.ts',
  ), 'utf8');
  if (!p5DeferredRunnerSource.includes(
    "'tests/arena/p5-formal-three-asset-preloader-approval-gate-candidate-v1.test.ts'",
  )) {
    throw new Error('P5集中验证清单缺少正式GLB预加载批准门延期测试。');
  }
  if (!p5DeferredRunnerSource.includes(
    "'tests/arena/p5-formal-asset-production-approval-loading-gates-candidate-v1.test.ts'",
  )) {
    throw new Error('P5集中验证清单缺少正式资产加载批准门延期测试。');
  }
  if (!p5DeferredRunnerSource.includes(
    "'packages/arena-product-presentation/test/arena-v2-formal-asset-production-approval-candidate-v1.test.ts'",
  )) {
    throw new Error('P5集中验证清单缺少正式资产批准索引行为测试。');
  }
  if (!p5DeferredRunnerSource.includes(
    "'packages/arena-product-presentation-three/test/arena-v2-formal-three-asset-preloader-approval-gate-candidate-v1.test.ts'",
  )) {
    throw new Error('P5集中验证清单缺少正式GLB预加载批准门行为测试。');
  }
  if (!p5DeferredRunnerSource.includes(
    "'packages/arena-product-presentation/test/arena-v2-formal-audio-combat-grammar-identity-candidate-v1.test.ts'",
  )) {
    throw new Error('P5集中验证清单缺少正式武器音频战斗语法同源延期测试。');
  }
  if (!p5DeferredRunnerSource.includes(
    "'packages/arena-product-presentation-three/test/arena-v2-twenty-weapon-formal-vfx-combat-grammar-identity-candidate-v1.test.ts'",
  )) {
    throw new Error('P5集中验证清单缺少局外收藏与局内VFX战斗语法同源反证。');
  }
  if (!p5DeferredRunnerSource.includes(
    "'packages/arena-product-presentation-three/test/arena-v2-twenty-weapon-audiovisual-manifest-combat-grammar-identity-candidate-v1.test.ts'",
  )) {
    throw new Error('P5集中验证清单缺少Three音画清单与正式音频语法同源反证。');
  }
  const audiovisualManifestSource = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-twenty-weapon-audiovisual-production-manifest-candidate-v1.ts',
  ), 'utf8');
  for (const forbidden of [
    'AUDIO_SEMANTIC_BY_WEAPON_ID',
    'actionDefinitionId.includes(',
  ]) {
    if (audiovisualManifestSource.includes(forbidden)) {
      throw new Error(`P5 Three音画清单不得保留本地音频语义猜测：${forbidden}。`);
    }
  }
  for (const required of [
    'item.weaponDefinitionId === equipmentDefinitionId',
    'requireArenaV2WeaponCombatGrammarSourceIdentityByActionDefinitionIdCandidateV1',
    'requireArenaV2FormalAudioCombatGrammarIdentityCandidateV1',
    'modeSupplyMovementUnarmedCombatGrammarIdentity: null',
  ]) {
    if (!audiovisualManifestSource.includes(required)) {
      throw new Error(`P5 Three音画清单缺少正式Definition/语法同源标记：${required}。`);
    }
  }
  const presentationAssetLoadTask = await readFile(path.join(
    repositoryRoot,
    'packages/arena-presentation-runtime/src/presentation-asset-load-task.ts',
  ), 'utf8');
  for (const marker of [
    '#loadSettled = true',
    'this.#loadSettled = false',
    'isCleanupComplete(): boolean',
    '&& this.#loadSettled',
    '&& this.#lease === null',
  ]) {
    if (!presentationAssetLoadTask.includes(marker)) {
      throw new Error(`P5表现资产Task缺少清理完成水位${marker}。`);
    }
  }
  const formalThreeStage = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-stage-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'assertSynchronousReturn as rejectThenable',
    '#beginMatchCleanupOwnership(): void',
    '#disposeEquipmentRecord(instanceId: string | null, record: EquipmentRecord)',
    'readonly #equipmentCleanupDebts = new Set<EquipmentRecord>()',
    '#createEquipmentRecord(',
    'candidate.readability.consume({',
    'this.#equipmentRoot.add(candidate.root)',
    'this.#disposeEquipmentRecord(equipment.instanceId, previous)',
    'record.cleanup.readabilityDestroyed && !record.cleanup.rootRemoved',
    '#matchCleanupComplete(): boolean',
    '#terminalCleanupComplete(): boolean',
    'this.#characters === null && this.#characterFactory !== null',
    'this.#routeReadability === null && this.#mapObject !== null',
    'this.#visualEffectsDisposed && !this.#characterImpactDisposed',
    'this.#visualEffectsDisposed && !this.#cameraDisposed',
    'matchCleanupRetriesOnlyIncompleteOwnedResources: true',
    'failedOpenRetainsConstructedMatchOwners: true',
    'terminalCleanupRequiresEveryOwnedResource: true',
    'terminalCleanupSkipsReversibleHudVfxAndCameraReset: true',
    'visualEffectsReleasePrecedesBorrowedImpactOwners: true',
    'equipmentRootRemovalWaitsForReadabilityRelease: true',
    'worldEquipmentReplacementPreflightsBeforeRetiringPrevious: true',
    'failedWorldEquipmentReplacementRetainsRetryableCleanupDebt: true',
    'strictProductionApprovalRequiredByDefault: true',
    'isolatedUnapprovedCandidateStageRequiresExplicitOptIn: true',
    'packet(value, this.#allowUnapprovedCandidates)',
    'allPublicLifecycleAndSnapshotCommitsGuarded: true',
    'swallowedChildOwnerReentryFailsClosed: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeCrossOwnerOrStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'childSnapshotsCheckedBeforeAggregateSnapshotPublication: true',
    'constructorWorldRootRollbackRetainsCleanupFailure: true',
    'successfulStateCommitsAfterChildOperationsOnly: true',
    "this.#runSynchronousOperation('state-read'",
    "this.#runSynchronousOperation('load'",
    "this.#runSynchronousOperation('render'",
    "this.#runSynchronousOperation('pause'",
    "this.#runSynchronousOperation('resume'",
    "this.#runSynchronousOperation('leave'",
    "this.#runSynchronousOperation('snapshot-read'",
    "this.#runSynchronousOperation('dispose'",
  ]) {
    if (!formalThreeStage.includes(marker)) {
      throw new Error(`P5正式Three Stage缺少逐资源清理所有权标记${marker}。`);
    }
  }
  if (formalThreeStage.includes('#reentryAttempted')) {
    throw new Error('P5正式Three Stage不得保留可重置布尔反调事实。');
  }
  const formalSceneResolution = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-formal-scene-resolution-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'isArenaV2FormalModelLoadPermittedCandidateV1',
    'unapprovedCharacterAssetIds',
    'unapprovedEquipmentAssetIds',
    'unapprovedMapAssetIds',
    'productionApprovalUsesSharedLedgerIndex: true',
    'reportsFrameSpecificUnapprovedAssetIds: true',
  ]) {
    if (!formalSceneResolution.includes(marker)) {
      throw new Error(`P5正式Scene解析缺少逐帧批准标记${marker}。`);
    }
  }
  const formalThreeCameraController = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-camera-controller-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "FAILED: 'failed'",
    '#cleanupStarted = false',
    '#baseCameraRestored = false',
    '#cameraImpactsDisposed = false',
    '#operation: string | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'this.#cameraImpacts.clear()',
    'this.#cleanupOwnedResources()',
    'this.#baseCameraRestored && !this.#cameraImpactsDisposed',
    "this.#runSynchronousOperation('state-read'",
    "this.#runSynchronousOperation('last-model-read'",
    "'impact-epoch-read'",
    "this.#runSynchronousOperation('snapshot-read'",
    'terminalDisposalDoesNotAllocateEpoch: true',
    'cleanupRetriesOnlyIncompleteOwnedResources: true',
    'swallowedCameraOrImpactReentryFailsClosed: true',
    'successfulStateAndModelCommitsAfterChildOperationsOnly: true',
    'terminalCleanupUsesSameStickyOperationGuard: true',
    'impactStateReleaseWaitsForBaseCameraRestore: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'cameraImpactAndViewportCallbacksCheckedBeforeStateCommit: true',
    'cameraWritesCheckedBeforeModelPublication: true',
    'cleanupReentryRetainsCurrentAndLaterCameraOwners: true',
  ]) {
    if (!formalThreeCameraController.includes(marker)) {
      throw new Error(`P5正式Three Camera缺少终态清理所有权标记${marker}。`);
    }
  }
  if (formalThreeCameraController.includes('#reentryAttempted')) {
    throw new Error('P5正式Three Camera不得恢复可重置布尔反调事实。');
  }
  const formalThreeCharacterImpact = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-character-impact-readability-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'this.#active.clear()',
    'this.#recent.clear()',
    'terminalDisposalDoesNotAllocateEpoch: true',
  ]) {
    if (!formalThreeCharacterImpact.includes(marker)) {
      throw new Error(`P5正式Three Character Impact缺少无epoch终态清理标记${marker}。`);
    }
  }
  const formalGltfCharacterView = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-formal-gltf-character-view-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#cleanupStarted = false',
    '#controllerDisposed = false',
    'readonly #disposedMaterialIndices = new Set<number>()',
    'interface HeldEquipmentRecord',
    'readonly #heldEquipmentCleanupDebts = new Set<HeldEquipmentRecord>()',
    '#cleanupHeldEquipment(): readonly unknown[]',
    '#createHeldEquipmentRecord(definitionId: string): HeldEquipmentRecord',
    'this.#syncHeldWeaponReadability(candidate, participant, frameValue)',
    'this.#equipmentSlot.add(candidate.object)',
    'this.#cleanupHeldEquipmentRecord(previous)',
    'this.#rootRemoved && !this.#rootCleared',
    'this.#disposedMaterialIndices.size === this.#ownedMaterials.length',
    'this.#views.set(participantId, created)',
    'viewCleanupRetriesOnlyIncompleteOwnedResources: true',
    'heldEquipmentRootWaitsForReadabilityRelease: true',
    'heldEquipmentReplacementPreflightsBeforeRetiringPrevious: true',
    'failedHeldEquipmentReplacementRetainsRetryableCleanupDebt: true',
    'failedViewInitializationRetainsFactoryOwnership: true',
    'failedModelAndViewConstructionCleanupRetainsFactoryOwnership: true',
    'failedInitialDirectionCleanupClosesFactoryToCreate: true',
    'constructionOwnedMaterials.push(cloned)',
    'cleanupModelInstanceConstructionResources(cleanupResources)',
    'readonly #constructionCleanupDebts =',
    'factoryDisposalRetainsFailedViewCleanupOwnership: true',
    'viewSynchronousOperationsGuarded: true',
    'factorySynchronousOperationsGuarded: true',
    'swallowedThreeAndControllerReentryFailsViewClosed: true',
    'swallowedChildViewReentryFailsFactoryClosed: true',
    'animationEquipmentImpactAndDebugCommitsOperationIsolated: true',
    'disposalCommitsOperationIsolated: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'viewChildCallbacksCheckedBeforeStateCommit: true',
    'heldEquipmentPublicationWaitsForReadabilityAndMountConfirmation: true',
    'viewCleanupReentryRetainsCurrentAndLaterOwners: true',
    'factoryChildCallbacksCheckedBeforeRegistryCommit: true',
    'factoryViewReleaseCallbackChecksParentOperation: true',
    'factoryCleanupReentryRetainsCurrentAndLaterOwners: true',
    "this.#runSynchronousOperation('sync'",
    "this.#runSynchronousOperation('update'",
    "this.#runSynchronousOperation('impact-readability'",
    "this.#runSynchronousOperation('debug-snapshot'",
    "this.#runSynchronousOperation('dispose'",
    "this.#runSynchronousOperation('create-view'",
    "this.#runSynchronousOperation('apply-impact-readability'",
    "this.#runSynchronousOperation('apply-impact-directions'",
    "this.#runSynchronousOperation('dispose-factory'",
  ]) {
    if (!formalGltfCharacterView.includes(marker)) {
      throw new Error(`P5正式GLTF角色View缺少逐资源清理所有权标记${marker}。`);
    }
  }
  if (formalGltfCharacterView.includes('#reentryAttempted')) {
    throw new Error('P5正式GLTF角色View/Factory不得恢复可重置布尔反调事实。');
  }
  const localPlayableSurfaceBinding = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'assertSynchronousReturn as rejectThenable',
    "rejectThenable(unbind(), 'Arena V2 local playable surface unbindIntent')",
    "rejectThenable(unbind(), 'Arena V2 local playable surface cleanup unbindIntent')",
    'if (this.#unbindIntent === unbind) this.#unbindIntent = null',
    'failedIntentUnbindRetainsRetryOwnership: true',
    'intentUnbindMustCompleteSynchronously: true',
    'synchronousSurfaceReturnsUseDescriptorOnlyBoundary: true',
    'if (this.#unbindIntent === null && !this.#surfaceDisposed)',
    'if (this.#surfaceDisposed && !this.#hostOwnerDestroyed)',
    '&& this.#hostOwnerDestroyed',
    '&& this.#matchSurface !== null',
    '&& !this.#matchSurfaceDisposed',
    'cleanupRetriesOnlyIncompleteOwnedResources: true',
    'cleanupRespectsInformationHostAndMatchProducerDependencyOrder: true',
    'failedInformationCleanupRetainsHostAndMatchAssetOwners: true',
    'failedHostCleanupRetainsMatchAudioAndVfxProducer: true',
    'intentTransactionFailureClosesBindingWithoutSurfaceRejectedCallback: true',
    'surfaceRejectedCallbackDoesNotRepeatClosedBindingFailure: true',
    'settlementRecoverySurfaceFailureClosesBinding: true',
    'allPublicHostSurfaceAndMatchCallsCommitUnderStickyTransition: true',
    'swallowedHostSurfaceMatchDriverOrObserverReentryFailsClosed: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'hostSurfaceMatchAndObserverCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'attachedMatchDriverStartUsesIndependentGuardedTransition: true',
    'stateAndLastRenderPlanReadsRejectedDuringTransition: true',
    'idempotentLoadAndDisposeCheckReentryBeforeFastPath: true',
    'matchDriverStartsOnlyAfterIntentTransitionCommits: true',
    '#revealFocusedInformationField(',
    "focusFieldId !== 'recent-records' || targetScreenId !== 'home'",
    'this.#surface.revealPrimitive(primitiveId)',
    'recordsBottomNavigationFocusConsumed: true',
    'recordsFocusUsesRenderedPrimitiveGeometry: true',
    'recordsFocusAddsNoPageOrAction: true',
    'weaponAvailabilityChangeProvider',
    'const weaponAvailabilityChange = this.#weaponAvailabilityChangeProvider();',
    "'Arena V2 local playable surface weaponAvailabilityChangeProvider'",
    '#lastRenderedResultPrimaryRecommendation',
    'Arena V2结果页主动作缺少已渲染推荐身份',
    'expectedResultCollectionTargetKind',
    'expectedResultCollectionTargetDefinitionId',
    'expectedResultRecommendationKind',
    'expectedResultGoalId',
    'expectedResultTargetScreenId',
    'expectedResultTargetModeKind',
    'expectedResultTargetWeaponDefinitionId',
    'expectedResultTargetMapDefinitionId',
    'resultPrimaryClickUsesLastRenderedRecommendation: true',
    'resultCollectionTargetIdentityRevalidatedBeforeNavigation: true',
    'resultGoalRouteIdentityRevalidatedBeforeNavigation: true',
    'resultGoalRouteModeSynchronizesFromHostAfterNavigation: true',
    'navigationSelectionSynchronizesFromSingleNarrowHostRead: true',
    '#lastRenderedHomeContinuationRoute',
    'Arena V2首页主动作缺少已渲染续玩路由身份',
    'expectedHomeContinuationGoalId',
    'expectedHomeContinuationKind',
    'expectedHomeContinuationModeDefinitionId',
    'expectedHomeContinuationModeKind',
    'expectedHomeContinuationTargetWeaponDefinitionId',
    'expectedHomeContinuationTargetMapDefinitionId',
    'homePrimaryActionSynchronizesAcceptedContinuationFromHost: true',
    'getInformationNavigationSelectionRead()',
    'homePrimaryClickRevalidatesLastRenderedContinuationIdentity: true',
    'homePrimaryLabelNamesRecommendedExistingMode: true',
    'homePrimaryAccessibilityExplainsSelectionAndConfirmation: true',
    'function homeContinuationPrimaryActionRenderPlan(',
    "primitive.intentId !== 'open-mode-select'",
    'route.requiresTargetMapSelection',
    '再次确认后才开始${modeLabel}，不会自动开局',
    'homeAcceptedContinuationStillStopsAtModeConfirmation: true',
    'homeSurvivalContinuationPreservesUnarmedMatchStart: true',
    'resultNextMapRouteSkeletonUsesExistingGoalValue: true',
    'resultNextMapRouteSkeletonUsesSharedMapProjection: true',
    'resultNextWeaponCoreFightUsesExistingGoalValue: true',
    'resultNextWeaponCoreFightUsesSharedWeaponProjection: true',
    'resultLearningSignatureUsesProfileNextGoalIdentity: true',
    'resultLearningSignaturePreservesExactMapSegmentGoal: true',
    'resultLearningSignatureUsesSharedHomeReadProjection: true',
    'resultCrossChallengeCanShowWeaponAndMapSignature: true',
    'resultNavigationRecommendationDoesNotSelectLearningSignature: true',
    'settlementRecoverySkipsNextContentRead: true',
    'renderReusesPipelineRecoveryAndNextGoalRead: true',
    'renderReusesPipelineResultRecommendations: true',
    'interactionGateReusesSingleRecoveryRead: true',
    'interactionGateUsesAggregateInformationAndRecoveryRead: true',
    'getInformationInteractionGateRead()',
    'resultNextWeaponDisplayNameRevalidatedAgainstSharedProjection: true',
    'resultNextMapDisplayNameRevalidatedAgainstSharedProjection: true',
    'projectArenaV2NextLearningSignatureReadCandidateV1',
    'learningSettlementRecovery: recovery',
    'nextLearningGoal,',
    'resultPrimaryRecommendation,',
    'resultNextGoalRecommendation,',
    'learningSignature.expandedText',
    'learningSignatureValueCount !== 1',
    'modePreparationRuleDetailSecondaryActionWired: true',
    'modePreparationRuleDetailReusesExistingPages: true',
    'modeCharacterSelectionSecondaryActionWired: true',
    'modeCharacterSelectionReturnsThroughExistingSaveAction: true',
    'competitivePreparationOptionalDetailActionsWired: true',
    'competitivePreparationPrimaryStartRemainsDirect: true',
    'preparationPagesCanReturnToModeSelectWithoutStarting: true',
    'survivalPreparationRemainsUnarmedWithoutWeaponSelectionAction: true',
    'survivalPreparationOptionalCollectionActionsWired: true',
    'survivalPreparationWeaponActionCannotEquipLoadout: true',
    'survivalPreparationPrimaryStartRemainsDirect: true',
    'detailDirectorySecondaryActionWired: true',
    'detailDirectoryActionPreservesSelection: true',
    'detailDirectoryReturnRevealsCurrentSelection: true',
    'detailDirectoryRevealUsesRenderedSelectionActionIdentity: true',
    'detailAdjacentBrowseActionsWired: true',
    'detailAdjacentBrowseReusesCurrentDetailScreen: true',
    'modePrimaryStartRemainsDirect: true',
    'supportsDefaultGoalAlignedResultRecommendation: true',
    'stableOrCurrentEligibleConditionalReplayKeepsPlayAgain: true',
    'routeAdjustmentReusesSingleResultPrimaryAction: true',
    'resultRouteAdjustmentNamesExactChangedModeWeaponAndMap: true',
    'resultRouteAdjustmentStopsAtExistingModeConfirmation: true',
    'resultSurvivalAdjustmentPreservesUnarmedWorldPickupCopy: true',
    'explicitNextGoalNamesExactExistingDestination: true',
    'explicitNextGoalReusesModeWeaponMapAndHomePages: true',
    'explicitNextGoalAddsNoPageOrAction: true',
    'defaultGoalAdjustmentCanEnterModeSelectDirectly: true',
    "resultRecommendationKind === 'prepare-next-goal'",
    '下一把武器推荐与目标路线类型不一致',
    '下一张地图推荐与目标路线类型不一致',
    'settledExplicitNextGoalRouteIdentityAlsoFrozen: true',
    "label: `调整为${compactTargets.join('＋')}`",
    '具体调整路线没有实际选择变化',
    '生存仍然空手开局，目标武器',
    '需要在场上遇到后拾取',
    "label: `确认${compactTargets.join('＋')}`",
    'label: `了解目标武器：${targetWeaponDisplayName}`',
    'label: `了解目标地图：${targetMapDisplayName}`',
    'label: `查看目标武器：${learningSignature.weaponDisplayName}`',
    "label: '返回首页继续'",
    '结果页显式下一目标缺少可达页面',
    "selectedModeKind === 'survival'",
    "label: '同地图再来一局'",
    '仍然空手开局，在场上拾取武器',
    'playAgainCopyRespectsSurvivalUnarmedRule: true',
    'competitivePlayAgainCopyRetainsSelectedWeapon: true',
  ]) {
    if (!localPlayableSurfaceBinding.includes(marker)) {
      throw new Error(`P5本地Surface Binding缺少Intent解绑所有权标记${marker}。`);
    }
  }
  if (localPlayableSurfaceBinding.includes('#reentryAttempted')) {
    throw new Error('P5本地Surface Binding不得保留可重置布尔反调事实。');
  }
  const formalWebPointerSurface = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-formal-web-pointer-surface-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: string | null = null',
    '#runEventOperation(',
    '#publicLifecycleCleanup(',
    'pointerAndLifecycleCallbacksCommitUnderStickyOperation: true',
    'swallowedDomInputLifecycleOrObserverReentryFailsClosed: true',
    'publicVisibilityAndSnapshotReadsRejectOperationMiddleState: true',
    'inputAndLifecycleCleanupClosuresUseSurfaceOperationGuard: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'domInputLifecycleAndObserverCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'pointerEventCallbacksStopAtFirstReentrySequenceChange: true',
    'idempotentVisibilityAndDisposeCheckReentryBeforeFastPath: true',
    'visualMovementAvailabilityFromAuthorityCanMove: true',
    'visualMovementAvailabilityReadOnly: true',
    'visualMovementBlockedDoesNotDisableInput: true',
    'visualPrimaryGestureHintUsesAuthorityCommitmentChargeLevel: true',
    'primaryActionGestureHint:',
    "requireArenaV2UiPrimaryGestureLabelV1(nextGestureHint)",
    'applyMovementAvailability(',
    'clearMovementAvailability()',
  ]) {
    if (!formalWebPointerSurface.includes(marker)) {
      throw new Error(`P5正式Web触控Surface缺少粘滞同步事务标记${marker}。`);
    }
  }
  if (formalWebPointerSurface.includes('#reentryAttempted')) {
    throw new Error('P5正式Web触控Surface不得保留可重置布尔反调事实。');
  }
  if (localPlayableSurfaceBinding.includes('instanceof Promise')) {
    throw new Error('P5本地Surface Binding同步返回边界不得使用instanceof Promise。');
  }
  if ((localPlayableSurfaceBinding.match(/this\.#informationProjectionOptions\(\)/gu)?.length ?? 0)
    !== 1) {
    throw new Error('P5武器可用状态provider只能由正常信息页渲染路径读取一次。');
  }
  const uiInteraction = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-ui-interaction-v1.ts',
  ), 'utf8');
  for (const marker of [
    'resolveArenaV2UiActionRevealV1',
    'resolveArenaV2UiPrimitiveRevealV1',
    'actionRevealUsesCurrentRenderPlanGeometry: true',
    'actionRevealCentersAndClampsToScrollBounds: true',
    'primitiveRevealUsesCurrentRenderPlanGeometry: true',
    'primitiveRevealSupportsTextAndActions: true',
  ]) {
    if (!uiInteraction.includes(marker)) {
      throw new Error(`P5信息交互缺少目录选择定位标记${marker}。`);
    }
  }
  const informationCanvasSurface = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-information-canvas-surface-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "FAILED: 'failed'",
    '#cleanupOwnedResources(): readonly unknown[]',
    '#pointerDownListenerBound = false',
    '#liveRegionRemoved = true',
    '#roleRestored = true',
    'failedLoadRollsBackThroughOwnedResourceLedger: true',
    'cleanupRetriesOnlyIncompleteOwnedResources: true',
    'canvasContextReleasedAfterListenersLiveRegionAndStateRestore: true',
    '#failRuntimeOperation(error: unknown, message: string): never',
    'partialResizeOrRenderFailureClosesInteractiveSurface: true',
    'resolveArenaV2UiActionRevealV1',
    'resolveArenaV2UiPrimitiveRevealV1',
    'actionRevealUsesSharedRenderPlanGeometry: true',
    'primitiveRevealUsesSharedRenderPlanGeometry: true',
    'synchronousLifecycleOperationReentryRejected: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'eventPaintAndAccessibilityCommitsUseOperationGuard: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'canvasAndDomCallbacksCheckedBeforeSurfaceCommit: true',
    'cleanupReentryRetainsCurrentAndLaterCanvasOwners: true',
    'swallowedCanvasDomOrObserverReentryFailsClosed: true',
    'publicOperationsCommitUnderStickyOperation: true',
    'idempotentCleanupAndDisposeCheckReentryBeforeFastPath: true',
    'pointerKeyboardWheelAndVisibilityEventsCommitUnderStickyOperation: true',
    'intentCallbacksRunAfterSurfaceOperationCommit: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!informationCanvasSurface.includes(marker)) {
      throw new Error(`P5信息Canvas Surface缺少逐资源清理标记${marker}。`);
    }
  }
  if (informationCanvasSurface.includes('#reentryAttempted')) {
    throw new Error('P5信息Canvas Surface不得恢复可重置布尔反调事实。');
  }
  const informationDomSurface = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-information-dom-surface-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "FAILED: 'failed'",
    '#cleanupOwnedResources(): readonly unknown[]',
    '#pointerDownListenerBound = false',
    '#surfaceRemoved = true',
    'failedLoadRollsBackThroughOwnedResourceLedger: true',
    'cleanupRetriesOnlyIncompleteOwnedResources: true',
    'surfaceRemovalWaitsForPointerAndListenerRelease: true',
    '#failRuntimeOperation(error: unknown, message: string): never',
    'partialRenderOrScrollFailureClosesInteractiveSurface: true',
    'resolveArenaV2UiActionRevealV1',
    'resolveArenaV2UiPrimitiveRevealV1',
    'actionRevealUsesSharedRenderPlanGeometry: true',
    'actionRevealPublishesCommittedScrollOffset: true',
    'primitiveRevealUsesSharedRenderPlanGeometry: true',
    'primitiveRevealPublishesCommittedScrollOffset: true',
    'synchronousIntentRerenderDoesNotLatchEnabledButtonsDisabled: true',
    'synchronousLifecycleOperationReentryRejected: true',
    'stateAndScrollReadsRejectedDuringOperationCommit: true',
    'scrollObserverRunsAfterCommittedOperationUnlock: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'platformCallbacksCheckedBeforeSurfaceCommit: true',
    'cleanupReentryRetainsCurrentAndLaterDomOwners: true',
    'swallowedPlatformOrObserverReentryFailsClosed: true',
    'publicOperationsCommitUnderStickyOperation: true',
    'idempotentCleanupAndDisposeCheckReentryBeforeFastPath: true',
    'pointerKeyboardWheelAndVisibilityEventsCommitUnderStickyOperation: true',
    'intentAndScrollObserversRunAfterSurfaceOperationCommit: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!informationDomSurface.includes(marker)) {
      throw new Error(`P5信息DOM Surface缺少逐资源清理标记${marker}。`);
    }
  }
  if (informationDomSurface.includes('#reentryAttempted')) {
    throw new Error('P5信息DOM Surface不得恢复可重置布尔反调事实。');
  }
  for (const marker of [
    "if (this.#state !== 'preloaded')",
    "if (this.#state === 'disposed' || this.#state === 'failed') throw error",
    'hudLayer = new ArenaV2FormalHudCanvasLayerCandidateV1({',
    'hudLayer.load();',
    'lateAudioActivationCannotReviveOrRefailClosedHost: true',
    'lateAssetPreparationCannotRefailClosedHost: true',
    '#contextLostListenerRemoved = true',
    '#bindContextLostListener(): void',
    'contextLostListenerBindsAfterConstruction: true',
    'contextLostListenerCleanupRetainsRetryOwnership: true',
    'listenerCleanupFailureDoesNotSkipOwnedResourceCleanup: true',
    'this.#surfaceDisposed && !this.#preloaderDisposed',
    'this.#surfaceDisposed && !this.#rendererDisposed',
    'this.#surfaceDisposed && !this.#audioDisposed',
    "audioDisposed = this.#audio.state === 'disposed'",
    'this.#audioDisposed = audioDisposed',
    '#cleanupComplete(): boolean',
    'borrowedResourcesReleaseAfterSurfaceDisposal: true',
    'audioOwnershipRetainedUntilContextCloseCompletes: true',
    'terminalStateRequiresEveryOwnedResourceCleanup: true',
    'const startedChildOperations: Promise<unknown>[] = []',
    'function captureAsyncOperation<T>',
    'captureAsyncOperation(() => this.#preloader.load())',
    'captureAsyncOperation(() => this.#audio.load())',
    'captureAsyncOperation(() => this.#visualEffects.load())',
    'Promise.allSettled(childOperations)',
    'Arena V2 formal Web match host资产准备启动',
    'Arena V2 formal Web match host资产准备成功提交',
    'Arena V2 formal Web match host音频激活启动',
    'Arena V2 formal Web match host音频激活成功提交',
    'Arena V2 formal Web context lost提交',
    "this.#runSynchronousOperation('state-read'",
    "this.#runSynchronousOperation('last-error-read'",
    "this.#runSynchronousOperation('snapshot-read'",
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeStateAndSnapshotCommit: true',
    'preparationChildrenCapturedBeforeNextLaunch: true',
    'cleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true',
    'previewOwnerRollbackPrecedesHostFailureCleanup: true',
    'synchronousChildLoadThrowCannotSkipSiblingStartup: true',
    'reportsEveryRejectedChildPreparationInSettledBatch: true',
    '#scheduleTerminalCleanupContinuation(): void',
    'if (this.#constructionComplete) this.#scheduleTerminalCleanupContinuation()',
    'asyncChildSettlementAutomaticallyContinuesTerminalCleanup: true',
    'constructorRollbackIgnoresLateChildProgressCallbacks: true',
    'terminalCleanupProgressUsesEventsNotPolling: true',
    'terminalCleanupSettlementPropagatesToOwningComposition: true',
    'swallowedChildOwnerOrObserverReentryFailsClosed: true',
    'asyncPrepareAndActivationSettlementCommitsUnderOperationGuard: true',
    'pendingContextLossConsumedByAsyncSuccessCommits: true',
    'synchronousPrepareLaunchFailureWaitsForStartedChildren: true',
    'terminalContinuationUsesStickyOperationGuard: true',
    'publicLifecycleAndSnapshotUseStickyOperationGuard: true',
    "this.#assertNoOperation('Arena V2 formal Web match host prepareFormalAssets')",
    "this.#assertNoOperation('Arena V2 formal Web match host activateFormalAudio')",
    'repeatedPrepareAndActivationRequestsCheckReentryBeforeOwnerReuse: true',
  ]) {
    if (!formalWebMatchHost.includes(marker)) {
      throw new Error(`P5正式Match Host缺少迟到音频激活隔离标记${marker}。`);
    }
  }
  if (formalWebMatchHost.includes('#reentryAttempted')) {
    throw new Error('P5正式Match Host不得保留可重置布尔反调事实。');
  }
  const synchronousReturnBoundary = await readFile(path.join(
    repositoryRoot,
    'packages/arena-contracts/src/synchronous-return-boundary.ts',
  ), 'utf8');
  for (const marker of [
    'const MAX_SYNCHRONOUS_RETURN_PROTOTYPE_DEPTH = 32',
    'function assertNativePromiseIntegrity(): void',
    'function assertNativePromiseSpeciesIntegrity(): void',
    'export function assertSynchronousReturn',
    '返回值原型链循环',
    '返回访问器constructor',
    '返回访问器thenable',
    'descriptorOnlyOrdinaryThenableInspection: true',
    'nativePromiseIntegrityRequiredBeforeObservation: true',
  ]) {
    if (!synchronousReturnBoundary.includes(marker)) {
      throw new Error(`P5正式表现同步返回合同缺少安全标记${marker}。`);
    }
  }
  const presentationRuntimeCapabilityUtils = await readFile(path.join(
    repositoryRoot,
    'packages/arena-presentation-runtime/src/capability-utils.ts',
  ), 'utf8');
  for (const marker of [
    "import { assertSynchronousReturn } from '@number-strategy-jump/arena-contracts'",
    'assertSynchronousReturn(value, name)',
  ]) {
    if (!presentationRuntimeCapabilityUtils.includes(marker)) {
      throw new Error(`P5共享表现Runtime未复用统一同步返回合同${marker}。`);
    }
  }
  for (const file of [
    'src/entry/arena-v2-formal-hud-canvas-layer-candidate-v1.ts',
    'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts',
    'src/entry/arena-v2-formal-web-match-host-candidate-v1.ts',
    'src/entry/arena-v2-formal-web-pointer-surface-candidate-v1.ts',
    'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
    'packages/arena-product-presentation-three/src/arena-v2-formal-match-surface-candidate-v1.ts',
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-camera-controller-candidate-v1.ts',
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-stage-candidate-v1.ts',
    'src/entry/arena-v2-information-dom-surface-candidate-v1.ts',
    'src/entry/arena-v2-information-canvas-surface-candidate-v1.ts',
    'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts',
    'packages/arena-product-presentation-three/src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
    'packages/arena-product-presentation-three/src/arena-v2-information-character-selection-preview-surface-composition-candidate-v1.ts',
    'packages/arena-product-presentation-three/src/product-canvas-ui-surface.ts',
    'packages/arena-presentation-runtime/src/character-view-runtime.ts',
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-port-candidate-v1.ts',
  ]) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    if (!source.includes('assertSynchronousReturn as rejectThenable')) {
      throw new Error(`P5正式表现端口${file}未接入统一同步返回合同。`);
    }
    if (source.includes('instanceof Promise')) {
      throw new Error(`P5正式表现端口${file}不得继续使用instanceof Promise。`);
    }
  }
  const twentyWeaponFeedbackVfxPort = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-port-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: string | null = null',
    '#reentrySequence = 0',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'downstreamCallbacksCheckedBeforeActiveIdentityCommit: true',
    'swallowedDownstreamClearReentryRetainsIdentityAndStopsDispose: true',
    'downstreamOwnershipReleasedOnlyAfterConfirmedDispose: true',
    'swallowedDownstreamReentryFailsClosed: true',
    'presentRemoveClearAndDisposeCommitUnderStickyOperation: true',
    'stateAndSnapshotReadsRejectedDuringOperation: true',
    'idempotentRemoveAndDisposeCheckReentryBeforeFastPath: true',
  ]) {
    if (!twentyWeaponFeedbackVfxPort.includes(marker)) {
      throw new Error(`P5二十武器命中反馈VFX端口缺少粘滞事务标记${marker}。`);
    }
  }
  if (twentyWeaponFeedbackVfxPort.includes('#reentryAttempted')) {
    throw new Error('P5二十武器命中反馈VFX端口不得保留可重置布尔反调事实。');
  }
  const formalMatchSurface = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-formal-match-surface-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedStageReentryFailsClosed: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'stageCallbacksCheckedBeforeResolutionAndStateCommit: true',
    'stageCleanupReentryRetainsOwnershipForRetry: true',
    'successfulStateCommitsAfterStageOperationOnly: true',
    "this.#runSynchronousOperation('state-read'",
    "this.#runSynchronousOperation('last-resolution-read'",
    "this.#runSynchronousOperation('load'",
    "this.#runSynchronousOperation('render'",
    "this.#runSynchronousOperation('pause'",
    "this.#runSynchronousOperation('resume'",
    "this.#runSynchronousOperation('leave'",
    "this.#runSynchronousOperation('dispose'",
  ]) {
    if (!formalMatchSurface.includes(marker)) {
      throw new Error(`P5正式Match Surface缺少同步提交边界标记${marker}。`);
    }
  }
  if (formalMatchSurface.includes('#reentryAttempted')) {
    throw new Error('P5正式Match Surface不得保留可重置布尔反调事实。');
  }
  const synchronousStoragePort = await readFile(path.join(
    repositoryRoot,
    'packages/arena-contracts/src/synchronous-storage-port.ts',
  ), 'utf8');
  for (const marker of [
    "import { assertSynchronousReturn } from './synchronous-return-boundary.js'",
    'assertSynchronousReturn(value, name)',
  ]) {
    if (!synchronousStoragePort.includes(marker)) {
      throw new Error(`P5同步存储端口未复用统一同步返回合同${marker}。`);
    }
  }
  for (const forbidden of ['thenMethod.call', 'instanceof Promise', 'Promise.resolve(value)']) {
    if (synchronousStoragePort.includes(forbidden)) {
      throw new Error(`P5同步存储端口不得保留旧异步探测${forbidden}。`);
    }
  }
  const a6_18SemanticSource = await readFile(path.join(
    repositoryRoot,
    P5_A6_18_FILES.semanticSource,
  ), 'utf8');
  for (const marker of [
    "stage: 'A6.18'",
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'weaponCount: 20',
    'mapCount: 2',
    'mapSegmentCount: 20',
    'grantsAssetApproval: false',
    'readsRulesAtRenderTime: false',
    'collectionOrder === 1 ? 12 as const : 8 as const',
    'MAPS.reduce((total, { segmentCount }) => total + segmentCount, 0) !== 20',
  ]) {
    if (!a6_18SemanticSource.includes(marker)) {
      throw new Error(`P5 A6.18收藏语义来源缺少静态边界${marker}。`);
    }
  }
  const a6_18VisualProfile = await readFile(path.join(
    repositoryRoot,
    P5_A6_18_FILES.visualProfile,
  ), 'utf8');
  for (const marker of [
    "stage: 'A6.18'",
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'profileCount: 22',
    'weaponProfileCount: 20',
    'mapProfileCount: 2',
    'maximumPrimitiveCountPerSlot: 4',
    'maximumTextPrimitiveCountPerSlot: 1',
    'createsThreeResources: false',
    'loadsAssetBytes: false',
    'createsLeaseOrMount: false',
    'claimsFormalAssetApproval: false',
    'colorIsNeverSoleSignal: true',
    'programmaticGeometryNormalPath: false',
    "stage: 'A6.18b'",
    'standardSlotCssPixels: STANDARD_SLOT_CSS_PIXELS',
    'profileCount: 22',
    'panelCountPerProfile: 3',
    'textCountPerProfile: 1',
    'colorParticipatesInGeometryIdentity: false',
    'createsResources: false',
    'defaultSurfaceWired: false',
    'x - rect.x',
    'y - rect.y',
    'new Set(signatures).size !== 22',
    '右/下边界不得发生number溢出',
  ]) {
    if (!a6_18VisualProfile.includes(marker)) {
      throw new Error(`P5 A6.18回退视觉词汇缺少静态边界${marker}。`);
    }
  }
  for (const forbidden of [
    "from 'three'",
    'GLTFLoader',
    'rendererFactory',
    'requestAnimationFrame',
    'setTimeout(',
    'setInterval(',
  ]) {
    if (a6_18VisualProfile.includes(forbidden)) {
      throw new Error(`P5 A6.18回退视觉词汇不得创建资源或定时副作用：${forbidden}。`);
    }
  }
  const a6_18RenderPlanBridge = await readFile(path.join(
    repositoryRoot,
    P5_A6_18_FILES.renderPlanBridge,
  ), 'utf8');
  for (const marker of [
    "semanticFallbackVocabulary: 'arena-v2.a6.18.v1'",
    'semanticFallbackProfileCount: 22',
    'semanticFallbackMaximumPrimitiveCountPerSlot: 4',
    'semanticFallbackResourceRequestsAdded: 0',
    'slot.formalReady',
    'slot.assetUsePermitted',
    'createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1',
  ]) {
    if (!a6_18RenderPlanBridge.includes(marker)) {
      throw new Error(`P5 A6.18 RenderPlan桥缺少静态接入边界${marker}。`);
    }
  }
  const p5DeferredRunner = await readFile(path.join(
    repositoryRoot,
    'scripts/run-arena-p5-candidate-tests.ts',
  ), 'utf8');
  for (const file of P5_A6_18_DEFERRED_TEST_FILES) {
    if (!p5DeferredRunner.includes(`'${file}'`)) {
      throw new Error(`P5集中验证清单缺少A6.18延期测试${file}。`);
    }
  }
  if (!p5DeferredRunner.includes(`'${P5_WEAPON_AVAILABILITY_DEFERRED_TEST_FILE}'`)) {
    throw new Error('P5集中验证清单缺少武器可用未收藏提示延期测试。');
  }
  if (!p5DeferredRunner.includes(`'${P5_SURVIVAL_REPEATABLE_CHALLENGE_DEFERRED_TEST_FILE}'`)) {
    throw new Error('P5集中验证清单缺少Survival重复挑战投影延期测试。');
  }
  if (!p5DeferredRunner.includes(`'${P5_COMPETITIVE_REPEATABLE_CHALLENGE_DEFERRED_TEST_FILE}'`)) {
    throw new Error('P5集中验证清单缺少Duel/Race重复挑战投影延期测试。');
  }
  if (!p5DeferredRunner.includes(`'${P5_HOME_RECORD_SUMMARY_DEFERRED_TEST_FILE}'`)) {
    throw new Error('P5集中验证清单缺少首页记录总览延期测试。');
  }
  if (!p5DeferredRunner.includes(
    `'${P5_CHARACTER_SELECTION_MODE_LOADOUT_PREVIEW_DEFERRED_TEST_FILE}'`,
  )) {
    throw new Error('P5集中验证清单缺少选角模式装备预览延期测试。');
  }
  const formalWebPlayableComposition = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#hasConstructionFailure',
    'if (this.#hasConstructionFailure) throw this.#constructionFailure',
    'normalizeCompositionFailure',
    "Object.defineProperty(error, 'originalError'",
    '#scheduleFailureShutdown(): void',
    'this.#driver.dispose()',
    'this.#offlineRetentionObservationJournal.destroy()',
    'this.#pointerSurface.dispose()',
    'synchronousConstructionFailureUsesRollbackChain: true',
    'arbitraryConstructionFailureValuePreservedWithoutStringification: true',
    'anyCompositionFailureStopsOwnedDriverBeforeNextPlatformTurn: true',
    'failureShutdownReleasesOwnedRuntimeResources: true',
    '#cleanupOwnedRuntimeResources(errors: unknown[]): void',
    'ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1',
    'constructionCleanupRetainsRetryableCompleteOwnerTree: true',
    'constructionCleanupWaitsForNestedLocalAndRegistryDebt: true',
    'constructionCleanupReleasesLocalConsumersBeforeMatchMediaProducer: true',
    'constructionFailureReportsTransferredRegistryBootstrapOwnership: true',
    'firstProvisionedFactoryDoesNotDoubleDestroyRetainedBootstrap: true',
    'failureShutdownAndDisposeShareCleanupLedger: true',
    'matchHostTerminalCleanupSettlementRetriesFailureShutdown: true',
    '#handleMatchHostTerminalCleanupSettled(): void',
    'independentMatchHostFailurePropagatesToComposition: true',
    'else retryConstructionOwnerAfterMatchHostSettles?.()',
    'matchHostSettlementContinuesIncompleteConstructionOwnerRollback: true',
    'synchronousHostSettlementCannotReenterConstructionOwnerRollback: true',
    'synchronousHostSettlementPreservesOnePostAttemptContinuation: true',
    'constructionRollbackContinuationDoesNotPoll: true',
    'cleanupRetriesOnlyIncompleteOwnedResources: true',
    'runtimeCleanupWaitsForResizeAndDriverBeforeIndependentDependencies: true',
    'failureShutdownRetainsDiagnosticContainerUntilDispose: true',
    '#ownedRuntimeCleanupComplete(): boolean',
    'this.#ownedRuntimeCleanupComplete() && !this.#containerRemoved',
    'containerRemovalWaitsForOwnedRuntimeCleanup: true',
    'terminalStateRequiresOwnedRuntimeAndContainerCleanup: true',
    '#synchronousReentrySequence = 0',
    '#synchronousReentryError: Error | null = null',
    '检测到被子Owner、DOM或Observer吞掉的同步重入',
    "this.#runSynchronousOperation('state-read'",
    "this.#runSynchronousOperation('active-surface-read'",
    "this.#runSynchronousOperation('last-error-read'",
    "this.#runSynchronousOperation('binding-read'",
    "this.#runSynchronousOperation('snapshot-read'",
    "'retention-export-read'",
    'launchedPrepare = execution',
    'if (launchedPrepare === null) reject(failure)',
    'launchedActivation = execution',
    'if (launchedActivation === null) reject(failure)',
    '#recordDetachedFailure(error: unknown, message: string)',
    'swallowedChildDomOrObserverReentryFailsClosed: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childDomAndObserverCallbacksCheckedBeforeCrossOwnerOrStateCommit: true',
    'callbackEntrypointsJoinOrCreateGuardedOperation: true',
    'asyncChildOwnersAndSettlementHooksCapturedBeforeReentryCheck: true',
    'runtimeCleanupReentryRetainsCurrentAndLaterOwners: true',
    'childSnapshotsCheckedBeforeAggregateSnapshotPublication: true',
    'publicStateBindingSnapshotAndRetentionReadsUseStickyGuard: true',
    'repeatedPrepareAndActivationReadsCheckReentryBeforeOwnerReuse: true',
    'publishedPrepareAndActivationOwnersWaitForLaunchedChildren: true',
    'asyncPrepareAndActivationSettlementCommitsUnderOperationGuard: true',
    'failureRecordingUsesSynchronousOperationGuard: true',
    'detachedSettlementAndResizeFailureCommitsAreContained: true',
    'terminalFailureShutdownErrorCommitUsesOperationGuard: true',
    'if (!this.#resizeCleanupCompleted)',
    'if (!this.#driverDisposed)',
    'weaponAvailabilityChangeProvider: () => (',
    'registryOwner!.snapshot().lastAvailabilityChange',
    '#registryProjectionAfterMaintenance()',
    'elevenPagePlayerReachabilityRoutesWired: true',
    'modeAndPreparationOptionalDepthNavigationWired: true',
    'preparationPagesExplicitReturnToModeWired: true',
    'preparationDetailSingleSourceReturnWired: true',
    'detailDirectorySecondaryNavigationWired: true',
    'detailDirectoryReturnPreservesSelection: true',
    'detailDirectoryReturnRevealsCurrentSelection: true',
    'detailDirectoryRevealUsesPreviewAwareRenderPlanGeometry: true',
    'detailAdjacentContinuousBrowseWired: true',
    'detailBrowseVisibleDirectoryPositionWired: true',
    'detailAdjacentTargetNamesVisible: true',
    'detailSelectedIdentityVisibleInQuestion: true',
    'weaponDetailCoreFightReadoutWired: true',
    'mapDetailFourAnchorRouteSkeletonWired: true',
    'mapDirectoryFourAnchorRouteSkeletonWired: true',
    'preparationMapRouteSkeletonWired: true',
    'preparationUniqueLongTermGoalFitWired: true',
    'preparationUniqueLongTermGoalFitReusesResultRouteFit: true',
    'preparationIncompatibleGoalFitDoesNotBlockStart: true',
    'preparationConditionalSurvivalGoalNeverPromisesSupply: true',
    'resultNextMapRouteSkeletonWired: true',
    'resultNextWeaponCoreFightWired: true',
    'weaponDirectoryBasicGestureReadoutWired: true',
    'weaponDirectoryCoreFightReadoutWired: true',
    'preparationWeaponCoreFightWired: true',
    'modeSelectionShortContentSignatureWired: true',
    'homeNextLearningSignatureWired: true',
    'homeNextMatchContinuationRouteWired: true',
    'homePrimaryActionAcceptsContinuationIntoExistingModeConfirmation: true',
    'homeContinuationNeverAutoStartsMatch: true',
    'homeSurvivalContinuationNeverPreselectsWeapon: true',
    'homeContinuationFollowObservationOptInWired: true',
    'homeContinuationFollowUsesFrozenMatchStartScene: true',
    'homeContinuationObservationFailureNeverBlocksMatchStart: true',
    'modeConfirmationShowsHomeContinuationPreparationState: true',
    'adjustedHomeContinuationStillAllowsCurrentSelection: true',
    'homeContinuationPreparationStateIndependentFromRetentionCollector: true',
    'resultHomeContinuationReceiptUsesValidatedMatchStartScene: true',
    'resultHomeContinuationReceiptNeverClaimsGoalCompletion: true',
    'resultHomeContinuationReceiptFailureNeverBlocksMatch: true',
    'resultMatchStartLearningGoalAttemptReceiptWired: true',
    'resultMatchStartLearningGoalAttemptUsesFrozenProfileAndRegistryRead: true',
    'resultMatchStartLearningGoalAttemptUsesReducerAppliedIdentityOnly: true',
    'resultMatchStartLearningGoalAttemptIndependentFromRetentionCollector: true',
    'resultGoalPreparationReusesContinuationConfirmationSession: true',
    'resultGoalPreparationRevalidatesGoalModeWeaponAndMap: true',
    'resultGoalPreparationPreservesSurvivalUnarmedStart: true',
    'resultGoalPreparationNeverWritesHomeContinuationMetric: true',
    'continuationPreparationOptionalDepthPreservesSession: true',
    'continuationPreparationExplicitExitClearsAfterNavigation: true',
    'continuationPreparationExitCompletesOnlyPendingHomeObservation: true',
    'resultCollectionDetailCarriesPendingGoalPreparation: true',
    'resultCollectionDetailRevalidatesGoalBeforeModeConfirmation: true',
    'resultCollectionDetailAdjacentBrowseBecomesAdjustedPreparation: true',
    'resultCollectionDetailExitClearsPendingPreparation: true',
    'goalAlignedPlayAgainUsesRenderedRouteFitIdentity: true',
    'goalAlignedPlayAgainRevalidatesStableOrConditionalFit: true',
    'goalAlignedPlayAgainReceiptUsesValidatedMatchStartScene: true',
    'arbitraryPlayAgainNeverClaimsGoalContinuation: true',
    'explicitNextGoalReusesModeOrDetailContinuationSession: true',
    'explicitNextGoalUnsupportedRoutesNeverClaimPreparation: true',
    'staleContinuationPreparationHiddenWithoutMutation: true',
    'staleContinuationPreparationClearedBeforeNextAction: true',
    'staleContinuationNeverCreatesMatchReceipt: true',
    'staleResultDetailContinuesAsOrdinaryNavigation: true',
    '#isContinuationPreparationCurrentFromRead(',
    '#continuationPreparationReadFromLearningRead(',
    '#continuationPreparationGoalDriftedFromCurrentOwners()',
    '#clearContinuationPreparationIfGoalDrifted()',
    'sevenOfflineRetentionObservationLifecycleOptInWired: true',
    'eightOfflineRetentionObservationLifecycleOptInWired: true',
    'legacySixMetricRetentionJournalMigrationWired: true',
    'legacySevenMetricRetentionJournalMigrationWired: true',
    'homeRecordSummaryWired: true',
    'recordsBottomNavigationFocusWired: true',
    'resultNextLearningSignatureWired: true',
    'nextLearningGoalLightweightReadWired: true',
    'detailAdjacentBrowseExcludesInactiveWeapons: true',
    'informationPrimaryStartActionsRemainDirect: true',
    'survivalCollectionNavigationCannotEquipBeforeMatch: true',
  ]) {
    if (!formalWebPlayableComposition.includes(marker)) {
      throw new Error(`P5正式Web组合缺少失败停机所有权标记${marker}。`);
    }
  }
  if (formalWebPlayableComposition.includes('#synchronousReentryAttempted')) {
    throw new Error('P5正式Web组合不得保留可重置布尔反调事实。');
  }
  const maintenanceProjectionStart = formalWebPlayableComposition.indexOf(
    '  #registryProjectionAfterMaintenance():',
  );
  const maintenanceProjectionEnd = formalWebPlayableComposition.indexOf(
    '\n  #recordFailure(',
    maintenanceProjectionStart,
  );
  if (maintenanceProjectionStart === -1 || maintenanceProjectionEnd === -1) {
    throw new Error('P5正式Web组合缺少Registry维护成功投影边界。');
  }
  const maintenanceProjection = formalWebPlayableComposition.slice(
    maintenanceProjectionStart,
    maintenanceProjectionEnd,
  );
  if (!maintenanceProjection.includes('return projection;')
    || maintenanceProjection.includes('renderCurrent')
    || maintenanceProjection.includes('#recordFailure')) {
    throw new Error('P5 Registry维护成功不得触发表现重绘或反向失败关闭。');
  }
  const localMatchKeyboardDriver = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-local-match-keyboard-driver-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'visibilityPlatform',
    'assertSynchronousReturn(result, name)',
    'sharedSynchronousReturnBoundaryWired: true',
    '#visibilityBinding',
    '#cleanupVisibility()',
    'optionalPlatformVisibilityPausesAuthority: true',
    'hiddenPlatformCannotBeManuallyResumed: true',
    'failedInputCleanupRetainsRetryOwnership: true',
    'failedInputBindRollbackRetainsRetryOwnership: true',
    'swallowedBindingInputLoopOrObserverReentryFailsClosed: true',
    'stateAndSnapshotReadsRejectedDuringTransition: true',
    'disposeCommitsUnderStickyTransitionGuard: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'bindingInputLoopAndObserverCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'snapshotChildrenCheckedBeforeAggregatePublication: true',
    'visibilityRegistrationAndCleanupUseSequenceOwnership: true',
    'idempotentLifecycleChecksFollowTransitionGuard: true',
  ]) {
    if (!localMatchKeyboardDriver.includes(marker)) {
      throw new Error(`P5键盘Driver缺少后台暂停所有权标记${marker}。`);
    }
  }
  const localMatchPointerDriver = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-local-match-pointer-driver-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'isHidden(): boolean',
    'assertSynchronousReturn(result, name)',
    'sharedSynchronousReturnBoundaryWired: true',
    '#readPlatformHidden()',
    'platformVisibilityPausesAuthority: true',
    'hiddenPlatformCannotStartOrResumeAuthority: true',
    'failedInputCleanupRetainsRetryOwnership: true',
    'failedInputBindRollbackRetainsRetryOwnership: true',
    '#adapterDestroyed = false',
    '#samplerDestroyed = false',
    'pointerInputCleanupDependencyOrderPreserved: true',
    'driverCleanupRetriesOnlyIncompleteOwnedResources: true',
    'bindingCleanupWaitsForLoopAndInputQuiescence: true',
    'swallowedBindingInputLoopOrObserverReentryFailsClosed: true',
    'stateAndSnapshotReadsRejectedDuringTransition: true',
    'disposeCommitsUnderStickyTransitionGuard: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'bindingInputLoopAndObserverCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'snapshotChildrenCheckedBeforeAggregatePublication: true',
    'pointerInputVisibilityAndCleanupUseSequenceOwnership: true',
    'idempotentLifecycleChecksFollowTransitionGuard: true',
  ]) {
    if (!localMatchPointerDriver.includes(marker)) {
      throw new Error(`P5指针Driver缺少后台暂停所有权标记${marker}。`);
    }
  }
  const simpleThreeConceptControlBinding = await readFile(path.join(
    repositoryRoot,
    'packages/arena-presentation-runtime/src/arena-v2-simple-three-concept-control-binding.ts',
  ), 'utf8');
  const presentationRuntimeIndex = await readFile(path.join(
    repositoryRoot,
    'packages/arena-presentation-runtime/src/index.ts',
  ), 'utf8');
  const controlLearningCopy = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-control-learning-copy-candidate-v1.ts',
  ), 'utf8');
  const uiVisualTokens = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-ui-visual-tokens-v1.ts',
  ), 'utf8');
  for (const marker of [
    "moveLeftCodes: Object.freeze(['KeyA', 'ArrowLeft'] as const)",
    "moveRightCodes: Object.freeze(['KeyD', 'ArrowRight'] as const)",
    "moveForwardCodes: Object.freeze(['KeyW', 'ArrowUp'] as const)",
    "moveBackwardCodes: Object.freeze(['KeyS', 'ArrowDown'] as const)",
    "jumpCodes: Object.freeze(['Space'] as const)",
    "primaryAttackCodes: Object.freeze(['KeyJ', 'KeyE'] as const)",
    "visibleText: '键盘 WASD/方向键移动 · 空格跳跃 · J/E攻击'",
    "visibleText: '触控 方向盘移动 · 跳跃键 · 攻击键'",
  ]) {
    if (!simpleThreeConceptControlBinding.includes(marker)) {
      throw new Error(`P5.3zzzwg共享三概念平台操作映射缺少${marker}。`);
    }
  }
  if (/block|crouch|dash|slam|格挡|蹲伏|冲刺|下砸/u.test(simpleThreeConceptControlBinding)) {
    throw new Error('P5.3zzzwg共享平台操作映射不得引入第四操作。');
  }
  for (const [sourceName, source, markers] of [
    ['Presentation Runtime导出', presentationRuntimeIndex, [
      './arena-v2-simple-three-concept-control-binding.js',
    ]],
    ['键盘Driver', localMatchKeyboardDriver, [
      'ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1',
    ]],
    ['触控Driver', localMatchPointerDriver, [
      'ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1',
    ]],
    ['操作学习文案', controlLearningCopy, [
      'ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1',
      'ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1',
      'platformControlText',
      'platformControlAccessibilityText',
      'coveredCharacterCount:',
      'coveredWeaponCount:',
      'coveredMapSegmentCount:',
      'addsInputConcepts: false',
    ]],
    ['触控Visual Tokens', uiVisualTokens, [
      'ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.movementControlLabel',
      'ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.primaryAttackControlLabel',
      'ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.jumpControlLabel',
    ]],
  ] as const) {
    for (const marker of markers) {
      if (!source.includes(marker)) {
        throw new Error(`P5.3zzzwg${sourceName}缺少共享映射标记${marker}。`);
      }
    }
  }
  for (const marker of [
    '#loopQuiesced = false',
    '#loopDestroyed = false',
    '#bindingDisposed = false',
    'driverCleanupRetriesOnlyIncompleteOwnedResources: true',
    'bindingCleanupWaitsForLoopInputAndVisibilityQuiescence: true',
    'this.#visibilityCleanups.length === 0',
  ]) {
    if (!localMatchKeyboardDriver.includes(marker)) {
      throw new Error(`P5键盘Driver缺少逐资源清理所有权标记${marker}。`);
    }
  }
  const informationModeSessionHost = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-information-mode-session-host-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: InformationModeSessionHostOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#assertNoOperation('state-read')",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('input-context-read'",
    "this.#runOperation('scene-frame-read'",
    'allBusinessAndExternalReadsUseStickyOperationGuard: true',
    'swallowedNavigationSessionOrProjectionReentryFailsClosed: true',
    'publicStateAndSnapshotRejectOperationIntermediateState: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'navigationSessionAndProjectionCallbacksCheckedBeforeHostCommit: true',
    'cleanupReentryRetainsCurrentAndLaterSessionOwners: true',
  ]) {
    if (!informationModeSessionHost.includes(marker)) {
      throw new Error(`P5 Information Mode Session Host缺少粘滞提交标记${marker}。`);
    }
  }
  if (informationModeSessionHost.includes('#reentryAttempted')) {
    throw new Error('P5 Information Mode Session Host不得恢复可重置布尔反调事实。');
  }
  const matchSceneReadProjection = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-match-scene-read-projection-candidate-v1.ts',
  ), 'utf8');
  const modeHudValidatedPresentationHost = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-validated-presentation-host-v1.ts',
  ), 'utf8');
  for (const marker of [
    'readonly localJumpAvailability: ArenaLocalJumpAvailabilityV1',
    'const localJumpAvailability = createArenaLocalJumpAvailabilityV1(',
    'requiresExplicitLocalJumpAvailabilityAtSceneProjection: true',
  ]) {
    if (!matchSceneReadProjection.includes(marker)) {
      throw new Error(`P5 Scene投影缺少Movement/Jump必传标记${marker}。`);
    }
  }
  if (matchSceneReadProjection.includes('readonly localJumpAvailability?:')
    || matchSceneReadProjection.includes('source.localJumpAvailability === null')) {
    throw new Error('P5 Scene投影不得保留Movement/Jump可选或null兼容分支。');
  }
  for (const marker of [
    'readonly localJumpAvailability: ArenaLocalJumpAvailabilityV1',
    'getLocalJumpAvailability(): ArenaLocalJumpAvailabilityV1',
    'requiresExplicitLocalJumpAvailabilityAtProjectionBoundary: true',
    'preservesMovementAndJumpCapabilityIdentity: true',
  ]) {
    if (!modeHudValidatedPresentationHost.includes(marker)) {
      throw new Error(`P5 HUD验证投影缺少Movement/Jump必传标记${marker}。`);
    }
  }
  if (modeHudValidatedPresentationHost.includes('ArenaLocalJumpAvailabilityV1 | undefined')
    || modeHudValidatedPresentationHost.includes('scene.localJumpAvailability === undefined')) {
    throw new Error('P5 HUD验证投影不得把Movement/Jump能力降级为undefined。');
  }
  for (const marker of [
    'weaponFeedbackDirectionFactsV2: projection.weaponFeedbackDirectionFactsV2',
    'forwardsValidatedWeaponFeedbackDirectionFactsV2: true',
    'rejectsWeaponFeedbackAtSpecializedEpochBaseline: true',
  ]) {
    if (!modeHudValidatedPresentationHost.includes(marker)) {
      throw new Error(`P5二十武器验证宿主缺少命中方向事实末端转发标记${marker}。`);
    }
  }
  const hudReadyLearningModeSession = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-hud-ready-learning-mode-session-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: HudReadyLearningModeSessionOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('projection-read'",
    "this.#assertNoOperation('destroy')",
    'allLifecycleAndProjectionReadsUseStickyOperationGuard: true',
    'swallowedChildOrProjectionReadReentryFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'requiresExplicitSupplyFactsEveryStep: true',
    'requiresExplicitAuthorityAuditEveryStep: true',
    'requiresExplicitSupplyCadenceEveryStep: true',
    'requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true',
    'requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true',
    'MATCH_STEP_REQUIRED_KEYS',
    "field(matchStep, 'supplyFacts', 'HUD-ready Learning Mode Session matchStep')",
    "field(matchStep, 'readFrameAudit', 'HUD-ready Learning Mode Session matchStep')",
    "field(matchStep, 'supplyCadence', 'HUD-ready Learning Mode Session matchStep')",
  ]) {
    if (!hudReadyLearningModeSession.includes(marker)) {
      throw new Error(`P5 HUD-ready Learning Mode Session缺少粘滞提交标记${marker}。`);
    }
  }
  const learningModeSessionBridge = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-learning-mode-session-bridge-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: LearningModeSessionBridgeOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#assertNoOperation('state-read')",
    "this.#runOperation('snapshot-read'",
    "this.#assertReentryFree('Learning Mode Session Bridge settleReward')",
    "this.#assertNoOperation('destroy')",
    'allLifecycleSettlementAndSnapshotReadsUseStickyOperationGuard: true',
    'operationGuardPrecedesBusinessStateValidation: true',
    'swallowedSessionHandoffOrIntentPublisherReentryFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'requiresExplicitPresentationAuditEveryStep: true',
    'requiresExplicitSupplyCadenceEveryStep: true',
    'requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true',
    'requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true',
  ]) {
    if (!learningModeSessionBridge.includes(marker)) {
      throw new Error(`P5 Learning Mode Session Bridge缺少粘滞提交标记${marker}。`);
    }
  }
  const modeProductSessionV2 = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-session/src/mode-product-session-v2.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ModeProductSessionV2Operation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#assertNoOperation('state-read')",
    "this.#assertNoOperation('snapshot-read')",
    "this.#assertReentryFree('ModeProductSessionV2 match step')",
    "this.#assertReentryFree('ModeProductSessionV2 appendEvents')",
    "this.#assertNoOperation('destroy')",
    'operationGuardPrecedesBusinessStateValidation: true',
    'matchAssemblerAndRewardCallsCheckedBeforeCrossOwnerProgress: true',
    'publicStateAndSnapshotRejectOperationIntermediateState: true',
    'swallowedMatchAssemblerOrRewardReentryFailsClosed: true',
    'stickyReentryUsesSequenceAndFirstError: true',
    'cleanupCallbacksCheckedBeforeOwnershipRelease: true',
    'swallowedCleanupReentryStopsLaterOwners: true',
    'explicitLocalJumpAvailabilityRequiredEveryStartAndStep: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'requiresExplicitPresentationAuditEveryStep: true',
    'requiresExplicitSupplyCadenceEveryStep: true',
    'requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true',
    'requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true',
    'requiredStepFieldsValidatedBeforeAssembler: true',
  ]) {
    if (!modeProductSessionV2.includes(marker)) {
      throw new Error(`P5 Mode Product Session V2缺少粘滞提交标记${marker}。`);
    }
  }
  if (modeProductSessionV2.includes('#reentryAttempted')) {
    throw new Error('P5 Mode Product Session V2不得保留可重置布尔反调事实。');
  }
  const authoritativeLocalMatchSessionV3 = await readFile(path.join(
    repositoryRoot,
    'packages/arena-session/src/mode-authoritative-local-match-session-v3.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ModeAuthoritativeLocalMatchSessionV3Operation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#assertNoOperation('state-read')",
    "this.#assertNoOperation('read-frame-read')",
    "this.#runOperation('mode-driver-content-hash-read'",
    "this.#runOperation('terminal-authority-identity-read'",
    "this.#runOperation('terminal-replay-read'",
    "this.#runOperation('terminal-runtime-evidence-read'",
    "this.#assertNoOperation('destroy')",
    'operationGuardPrecedesBusinessStateValidation: true',
    'runtimeLifecycleAndAuthorityReadsUseStickyOperationGuard: true',
    'publicStateAndReadFrameRejectOperationIntermediateState: true',
    'swallowedRuntimeOrAuthorityReadReentryFailsClosed: true',
    'stickyReentryUsesSequenceAndFirstError: true',
    'runtimeCleanupCheckedBeforeOwnershipRelease: true',
    'swallowedCleanupReentryRetainsRuntimeOwner: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true',
    'requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true',
  ]) {
    if (!authoritativeLocalMatchSessionV3.includes(marker)) {
      throw new Error(`P5 Authoritative Local Match Session V3缺少粘滞提交标记${marker}。`);
    }
  }
  if (authoritativeLocalMatchSessionV3.includes('#reentryAttempted')) {
    throw new Error('P5 Authoritative Local Match Session V3不得保留可重置布尔反调事实。');
  }
  const modeMatchRuntimeV6 = await readFile(path.join(
    repositoryRoot,
    'packages/arena-match/src/mode-match-runtime-v6.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ModeMatchRuntimeV6Operation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#assertNoOperation('state-read')",
    "this.#assertNoOperation('read-frame-read')",
    "this.#runOperation('restore'",
    "this.#runOperation('runtime-checkpoint-v1-read'",
    "this.#runOperation('runtime-checkpoint-v2-read'",
    "this.#runOperation('runtime-checkpoint-v3-read'",
    "this.#runOperation('terminal-replay-read'",
    "this.#runOperation('terminal-evidence-read'",
    "this.#assertReentryFree('ModeMatchRuntimeV6 authority start')",
    "this.#assertReentryFree('ModeMatchRuntimeV6 authority mode resolver入口')",
    "this.#assertReentryFree('ModeMatchRuntimeV6 authority step')",
    "this.#assertNoOperation('destroy')",
    'operationGuardPrecedesBusinessStateValidation: true',
    'authorityAndModeDriverCallsCheckedBeforeCrossOwnerProgress: true',
    'publicStateCheckpointAndTerminalReadsRejectOperationIntermediateState: true',
    'swallowedAuthorityOrModeDriverReentryFailsClosed: true',
    'stickyReentryUsesSequenceAndFirstError: true',
    'cleanupCallbacksCheckedBeforeOwnershipRelease: true',
    'swallowedCleanupReentryStopsLaterOwners: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
  ]) {
    if (!modeMatchRuntimeV6.includes(marker)) {
      throw new Error(`P5 Mode Match Runtime V6缺少粘滞提交标记${marker}。`);
    }
  }
  if (modeMatchRuntimeV6.includes('#reentryAttempted')) {
    throw new Error('P5 Mode Match Runtime V6不得保留可重置布尔反调事实。');
  }
  const authoritativeQuickMatchServiceV3 = await readFile(path.join(
    repositoryRoot,
    'packages/arena-quick-match/src/mode-authoritative-quick-match-service-v3.ts',
  ), 'utf8');
  for (const marker of [
    "#operation: 'create' | null = null",
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#assertNoOperation('create')",
    "this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 request validation')",
    "this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 seedSource')",
    "this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 rosterProvider')",
    "this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 contentProvider')",
    "this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 runtimeFactory')",
    "this.#assertReentryFree('ModeAuthoritativeQuickMatchServiceV3 session construction')",
    'destroyRuntime(session, cleanupErrors)',
    'createGuardPrecedesRequestValidation: true',
    'seedRosterContentAndRuntimePortsCheckedBeforeNextOwner: true',
    'createdSessionRetainsCleanupOwnershipUntilSafeReturn: true',
    'swallowedPortOrCleanupReentryRejectsCreate: true',
  ]) {
    if (!authoritativeQuickMatchServiceV3.includes(marker)) {
      throw new Error(`P5 Authoritative Quick Match Service V3缺少构造提交标记${marker}。`);
    }
  }
  const quickMatchBundleFactory = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-quick-match-bundle-factory-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: QuickMatchBundleFactoryOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#beginOperation('create-match-bundle')",
    "this.#assertReentryFree('Quick Match Bundle Factory request validation')",
    "this.#assertReentryFree('Quick Match Bundle Factory quickMatch owner capture')",
    "this.#assertReentryFree('Quick Match Bundle Factory publicParticipantProvider')",
    "this.#assertReentryFree('Quick Match Bundle Factory public match projection')",
    "this.#assertReentryFree('Quick Match Bundle Factory mode driver content hash')",
    "this.#assertReentryFree('Quick Match Bundle Factory authority admission')",
    "this.#assertReentryFree('Quick Match Bundle Factory bundle publication')",
    "this.#assertNoOperation('destroy')",
    'operationGuardPrecedesStateAndRequestValidation: true',
    'quickMatchParticipantAndAdmissionPortsCheckedBeforeTransfer: true',
    'sessionOwnershipRetainedUntilBundlePublicationCommits: true',
    'successfulPendingCleanupWatermarkPrecedesReentryRejection: true',
    'stickyReentryUsesSequenceAndFirstError: true',
  ]) {
    if (!quickMatchBundleFactory.includes(marker)) {
      throw new Error(`P5 Quick Match Bundle Factory缺少所有权提交标记${marker}。`);
    }
  }
  if (quickMatchBundleFactory.includes('#reentryAttempted')) {
    throw new Error('P5 Quick Match Bundle Factory不得保留可重置布尔反调事实。');
  }
  const modeLearningSessionFactory = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-mode-learning-session-factory-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ModeLearningSessionFactoryOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#beginOperation('create-session')",
    "this.#assertReentryFree('Mode Learning Session Factory request validation')",
    "this.#assertReentryFree('Mode Learning Session Factory match bundle owner capture')",
    "this.#assertReentryFree('Mode Learning Session Factory match bundle validation')",
    "this.#assertReentryFree('Mode Learning Session Factory authority admission')",
    "this.#assertReentryFree('Mode Learning Session Factory mode session composition')",
    "this.#assertReentryFree('Mode Learning Session Factory learning handoff construction')",
    "this.#assertReentryFree('Mode Learning Session Factory bridge construction')",
    "this.#assertReentryFree('Mode Learning Session Factory HUD-ready construction')",
    "this.#assertReentryFree('Mode Learning Session Factory session publication')",
    'for (const remaining of cleanupCandidates.slice(index + 1))',
    "this.#assertNoOperation('destroy')",
    'operationGuardPrecedesStateAndRequestValidation: true',
    'childOwnershipTransfersCheckedBeforeNextConstructionStage: true',
    'swallowedCleanupReentryRetainsAllUnprocessedOwners: true',
    'successfulCleanupWatermarkPrecedesReentryRejection: true',
  ]) {
    if (!modeLearningSessionFactory.includes(marker)) {
      throw new Error(`P5 Mode Learning Session Factory缺少所有权提交标记${marker}。`);
    }
  }
  const threeModeInformationHost = await readFile(path.join(
    repositoryRoot,
    P5_THREE_MODE_INFORMATION_HOST_FILE,
  ), 'utf8');
  for (const marker of [
    '#hostDestroyed = false',
    '#sessionFactory: ArenaV2ModeLearningSessionFactoryCandidateV1 | null',
    '#cleanupStarted = false',
    '#destroying = false',
    'this.#cleanupStarted = true',
    'if (this.#hostDestroyed && sessionFactory !== null)',
    'if (this.#hostDestroyed && this.#sessionFactory === null && bundleFactory !== null)',
    '&& this.#sessionFactory === null',
    "'mode-learning-session-factory'",
    'destroyClearsOnlySuccessfullyReleasedOwners: true',
    'failedFactoryCleanupRetainsRetryOwnership: true',
    'Arena three-mode information host清理期间不可重入',
    'presentationConsumesModeRegistry: false',
    'contentIdentityWired: true',
    'runtimePolicyConsumptionWired: false',
    'projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1',
    'projectArenaV2WeaponAvailabilityInformationSelectionCandidateV1',
    'projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1',
    'projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1',
    "screenId === 'survival-prep'",
    "({ kind }) => kind === 'survival'",
    "if (selectedModeKind === 'survival') return projection",
    "modeDefinitions.find(({ kind }) => kind === selectedModeKind)",
    "modeRecords.find(({ kind }) => kind === selectedModeKind)",
    'bestPerformanceTicks: modeRecord?.bestPerformanceTicks ?? null',
    'learningRead.profile.collections.weaponDefinitionIds',
    'detailDirectorySecondaryNavigationWired: true',
    'detailAdjacentContinuousBrowseWired: true',
    'detailBrowseVisibleDirectoryPositionWired: true',
    'detailAdjacentTargetNamesVisible: true',
    'detailSelectedIdentityVisibleInQuestion: true',
    'weaponDetailCoreFightReadoutWired: true',
    'mapDetailFourAnchorRouteSkeletonWired: true',
    'mapDirectoryFourAnchorRouteSkeletonWired: true',
    'preparationMapRouteSkeletonWired: true',
    'preparationUniqueLongTermGoalFitWired: true',
    'preparationUniqueLongTermGoalFitReusesResultRouteFit: true',
    'preparationIncompatibleGoalFitDoesNotBlockStart: true',
    'preparationConditionalSurvivalGoalNeverPromisesSupply: true',
    'resultNextMapRouteSkeletonWired: true',
    'resultNextWeaponCoreFightWired: true',
    'weaponDirectoryBasicGestureReadoutWired: true',
    'weaponDirectoryCoreFightReadoutWired: true',
    'preparationWeaponCoreFightWired: true',
    'modeSelectionShortContentSignatureWired: true',
    'homeNextLearningSignatureWired: true',
    'homeNextMatchContinuationRouteWired: true',
    'homePrimaryActionAcceptsContinuationIntoExistingModeConfirmation: true',
    'homeContinuationNeverAutoStartsMatch: true',
    'homeSurvivalContinuationNeverPreselectsWeapon: true',
    'homeContinuationFollowObservationOptInWired: true',
    'homeContinuationFollowUsesFrozenMatchStartScene: true',
    'homeContinuationObservationFailureNeverBlocksMatchStart: true',
    'modeConfirmationShowsHomeContinuationPreparationState: true',
    'adjustedHomeContinuationStillAllowsCurrentSelection: true',
    'homeContinuationPreparationStateIndependentFromRetentionCollector: true',
    'resultHomeContinuationReceiptUsesValidatedMatchStartScene: true',
    'resultHomeContinuationReceiptNeverClaimsGoalCompletion: true',
    'resultHomeContinuationReceiptFailureNeverBlocksMatch: true',
    'resultMatchStartLearningGoalAttemptReceiptWired: true',
    'resultMatchStartLearningGoalAttemptUsesFrozenProfileAndRegistryRead: true',
    'resultMatchStartLearningGoalAttemptUsesReducerAppliedIdentityOnly: true',
    'resultMatchStartLearningGoalAttemptIndependentFromRetentionCollector: true',
    'resultGoalPreparationReusesContinuationConfirmationSession: true',
    'resultGoalPreparationRevalidatesGoalModeWeaponAndMap: true',
    'resultGoalPreparationPreservesSurvivalUnarmedStart: true',
    'resultGoalPreparationNeverWritesHomeContinuationMetric: true',
    'continuationPreparationOptionalDepthPreservesSession: true',
    'continuationPreparationExplicitExitClearsAfterNavigation: true',
    'continuationPreparationExitCompletesOnlyPendingHomeObservation: true',
    'resultCollectionDetailCarriesPendingGoalPreparation: true',
    'resultCollectionDetailRevalidatesGoalBeforeModeConfirmation: true',
    'resultCollectionDetailAdjacentBrowseBecomesAdjustedPreparation: true',
    'resultCollectionDetailExitClearsPendingPreparation: true',
    'goalAlignedPlayAgainUsesRenderedRouteFitIdentity: true',
    'goalAlignedPlayAgainRevalidatesStableOrConditionalFit: true',
    'goalAlignedPlayAgainReceiptUsesValidatedMatchStartScene: true',
    'arbitraryPlayAgainNeverClaimsGoalContinuation: true',
    'explicitNextGoalReusesModeOrDetailContinuationSession: true',
    'explicitNextGoalUnsupportedRoutesNeverClaimPreparation: true',
    'staleContinuationPreparationHiddenWithoutMutation: true',
    'staleContinuationPreparationClearedBeforeNextAction: true',
    'staleContinuationNeverCreatesMatchReceipt: true',
    'staleResultDetailContinuesAsOrdinaryNavigation: true',
    '#isContinuationPreparationCurrentFromRead(',
    '#continuationPreparationReadFromLearningRead(',
    '#continuationPreparationGoalDriftedFromCurrentOwners()',
    '#clearContinuationPreparationIfGoalDrifted()',
    'homeRecordSummaryWired: true',
    'recordsBottomNavigationUsesExistingHomeField: true',
    'resultNextLearningSignatureWired: true',
    'nextLearningGoalLightweightReadWired: true',
    'projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1',
    'resolveArenaV2NextLearningGoalContinuationRouteV1',
    '#assertRenderedHomeContinuationRouteIdentity(',
    'Arena首页已渲染的下一局建议与点击时续玩路由发生漂移',
    "targetScreenId: 'mode-select' as const",
    'this.#applyNextGoalNavigationRoute(homeContinuationRoute)',
    '#completeHomeContinuationFollowObservation(',
    "kind: 'home-continuation-followed'",
    'matchPresentation.getSceneReadFrame()',
    '#acceptedHomeContinuationPreparation',
    'const continuationPreparation = this.#continuationPreparationReadFromLearningRead(',
    'homeContinuationPreparationState: continuationPreparation.state',
    '#captureHomeContinuationMatchReceipt(',
    '#projectHomeContinuationMatchReceipt(',
    '#captureResultGoalContinuationPreparation(',
    '#captureResultCollectionDetailPreparation(',
    '#revalidateResultCollectionDetailPreparation(',
    '#captureGoalAlignedPlayAgainPreparation(',
    'primaryIntentReusesSingleLearningSettlementAndRouteFitRead: true',
    'informationPageProjectionAvoidsNestedHostGuardReads: true',
    'informationPageProjectionUsesGuardFreeProfileAndRegistryReads: true',
    'settlementRecoveryRetryReusesSingleInformationSnapshot: true',
    'standaloneInformationProjectionsUseSingleOuterHostGuard: true',
    'highFrequencyInformationConsumersReuseOuterHostGuard: true',
    'continuationDriftCallersReuseOuterHostGuard: true',
    'bottomNavigationReusesSingleWritableHost: true',
    'primaryIntentReusesSingleWritableHost: true',
    'diagnosticSnapshotReusesSingleHostAndInformationRead: true',
    'detailBrowseReusesOuterHostRegistryRead: true',
    'nextGoalReadsReuseSingleLearningAndRegistrySnapshot: true',
    'weaponSelectionReusesOuterHostAndDeadProfileReadWrappersRemoved: true',
    'expectedResultPlayAgainFitKind',
    'Arena已渲染的目标对齐复玩与点击时长期目标或当前组合发生漂移',
    '#pendingResultCollectionDetailPreparation',
    '#clearContinuationPreparationAfterExplicitExit()',
    'homeContinuationPreparationSource: continuationPreparation.source',
    'Arena结果页目标准备与当前长期目标的模式、武器或地图发生漂移',
    'sourceKind: receipt.source',
    'projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1({',
    'projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1',
    'pages.profiles.learning.homeRecordSummary',
    'getInformationNextLearningGoalRead(',
    'pages.profiles.learning.nextGoal.weaponDefinitionId',
    'pages.profiles.learning.nextGoal.mapDefinitionId',
    '#assertRenderedResultCollectionTarget(',
    'Arena结果页展示的下一把武器与实际导航目标发生漂移',
    'Arena结果页展示的下一张地图与实际导航目标发生漂移',
    'getInformationCharacterPreviewLoadoutRead()',
    'const matchStartsUnarmed = selectedModeKind === \'survival\'',
    'Arena角色预览的已选武器已脱离当前Registry',
    'playableHostSwallowedChildReentryFailsClosed: true',
    'playableHostReentryFailureCleansOwnedResources: true',
    'playableHostDestroyFastPathChecksOperationFirst: true',
    '#reentrySequence = 0',
    '#failSwallowedReentry(',
    'localPlayableHostSwallowedChildReentryFailsClosed: true',
    'localPlayableHostReentryFailureRetainsCleanupOwnership: true',
    'localPlayableHostPublicReadsRejectDuringOperation: true',
    'localPlayableHostDestroyFastPathChecksOperationFirst: true',
    '#synchronousReentryFailure: Error | null = null',
    '#ownedHost()',
    'localPlayableFailureCleanupUsesPrivateOwnedResourcePath: true',
    'localPlayableFailureCleanupDoesNotReenterPublicDestroy: true',
    '#destroyOwnedResources()',
    '#destroyReentrySequence = 0',
    '#captureSwallowedDestroyReentry(',
    'swallowedChildDestroyReentryFailsCleanupCallClosed: true',
    'destroyReentryCheckedBeforeIdempotentFastPath: true',
    'destroyReentryDoesNotDiscardRetryOwnership: true',
  ]) {
    if (!threeModeInformationHost.includes(marker)) {
      throw new Error(`P5三模式Information Host缺少可重试清理所有权标记${marker}。`);
    }
  }
  const characterPreviewMount = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-character-selection-formal-preview-mount-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'reusesFormalMatchWeaponAssetBindings: true',
    'reusesHeldWeaponSilhouetteAndGripProfiles: true',
    'duelAndRacePreviewSelectedWeapon: true',
    'survivalPreviewStartsUnarmed: true',
    'sharesPreloadedWeaponGeometryMaterialAndTexture: true',
    'disposesSharedGeometryOrTexture: false',
    'previewSizeCssPixels',
    'clearReleasesActiveCloneWithoutDestroyingOwner: true',
    'mountCleanupUsesPerResourceCompletionWatermarks: true',
    'failedBuildCleanupDebtRetainedForDestroyRetry: true',
    'failedModelConstructionCleanupDebtRetainedForDestroyRetry: true',
    'failedPreviousMountRetirementDoesNotDoubleCleanupNextMount: true',
    'mountOwnerDestroyReentrancyRejected: true',
    'synchronousMountSnapshotClearAndDestroyGuarded: true',
    'swallowedThreeAndMixerReentryFailsClosed: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'buildRetirementAndCleanupCheckedBeforeOwnerCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    "this.#runSynchronousOperation('mount'",
    "this.#runSynchronousOperation('snapshot'",
    "this.#runSynchronousOperation('clear'",
    "this.#runSynchronousOperation('destroy'",
    '#cleanupDebts = new Set',
  ]) {
    if (!characterPreviewMount.includes(marker)) {
      throw new Error(`P5选角武器预览缺少边界标记${marker}。`);
    }
  }
  if (characterPreviewMount.includes('#reentryAttempted')) {
    throw new Error('P5选角武器预览Mount不得保留可重置布尔反调事实。');
  }
  if (characterPreviewMount.includes('previewRectCssPixels')) {
    throw new Error('P5选角模型挂载身份不得包含屏幕位置，避免滚动时重建角色与武器。');
  }
  const collectionPreviewThreeMountOwner = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'mutationReentrancyRejected: true',
    'swallowedThreeCallbackReentryFailsClosed: true',
    'failedMountReentryDoesNotPublishRecord: true',
    'destroyReentryCannotPublishDestroyedSuccess: true',
    'partialMutationSnapshotReadRejected: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'mountBuildCheckedBeforeRecordPublication: true',
    'mountCleanupCheckedBeforeOwnershipRelease: true',
    'destroyReentryRetainsCurrentAndLaterMountOwners: true',
    '#operation: string | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runSynchronousOperation('mount'",
    "this.#runSynchronousOperation('destroy-mount'",
    "this.#runSynchronousOperation('snapshot-read'",
    "this.#runSynchronousOperation('destroy'",
    'cleanupOwnedMountObjects(built.cleanup);',
    'this.#mounts.set(parsed.mountId',
  ]) {
    if (!collectionPreviewThreeMountOwner.includes(marker)) {
      throw new Error(`P5 A6.9收藏Three mount Owner缺少重入失败关闭标记${marker}。`);
    }
  }
  if (collectionPreviewThreeMountOwner.includes('#reentryAttempted')) {
    throw new Error('P5 A6.9收藏Three mount Owner不得恢复可重置布尔反调事实。');
  }
  if (collectionPreviewThreeMountOwner.indexOf('cleanupOwnedMountObjects(built.cleanup);')
    >= collectionPreviewThreeMountOwner.indexOf('this.#mounts.set(parsed.mountId')) {
    throw new Error('P5 A6.9吞错重入必须先清理未发布mount，再允许任何record提交。');
  }
  const collectionPreviewMountLifecycle = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedA6_9CallbackReentryFailsMountLifecycleOwner: true',
    'leaseSettlementCommitsUnderOperationGuard: true',
    'proofReadAndReleaseCommitAreOperationIsolated: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'mountProofSettlementAndSnapshotCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    '#operation: string | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runSynchronousOperation('constructor-snapshot'",
    "this.#runSynchronousOperation('commit-execution'",
    "this.#runSynchronousOperation('prepare-release'",
    "this.#runSynchronousOperation('read-destroyed-proof'",
    "this.#runSynchronousOperation('commit-release'",
    "this.#runSynchronousOperation('rollback-release'",
    "this.#runSynchronousOperation('prepare-owner-destroy'",
    "this.#runSynchronousOperation('finalize-destroy'",
    "this.#runSynchronousOperation('reset-epoch'",
    "this.#runSynchronousOperation('lease-settled'",
    "this.#runSynchronousOperation('lease-rejected'",
  ]) {
    if (!collectionPreviewMountLifecycle.includes(marker)) {
      throw new Error(`P5 A6.12b mount/proof Owner缺少同步提交边界${marker}。`);
    }
  }
  if (collectionPreviewMountLifecycle.includes('#reentryAttempted')) {
    throw new Error('P5 A6.12b mount/proof Owner不得恢复可重置布尔反调事实。');
  }
  const collectionPreviewMultiSlotSurface = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'stateReadRejectedDuringRendererCallback: true',
    'swallowedStateReadReentryFailsCurrentRendererOperation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'rendererCallbacksCheckedBeforeFrameCommit: true',
    'destroyReentryRetainsRendererOwnership: true',
    "this.#assertNoOperation('state read');",
    "this.#runSynchronousOperation('render'",
    "this.#runSynchronousOperation('snapshot'",
    "this.#runSynchronousOperation('destroy'",
  ]) {
    if (!collectionPreviewMultiSlotSurface.includes(marker)) {
      throw new Error(`P5 A6.13多槽预览Surface缺少公开读取重入边界${marker}。`);
    }
  }
  if (collectionPreviewMultiSlotSurface.includes('#reentryAttempted')) {
    throw new Error('P5 A6.13多槽预览Surface不得恢复可重置的布尔反调事实。');
  }
  const collectionPreviewLazyGltfAdapter = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-lazy-gltf-loader-adapter-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedCallbackReentryFailsClosed: true',
    'taskOperationOwnerPublishedBeforeTaskLoad: true',
    'taskSettlementCommitsUnderOperationGuard: true',
    'successfulTaskPromiseResolvesAfterGuardedStateCommit: true',
    'releasedOrDestroyedTaskCannotBeRevivedByLateLoad: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'const operation = Object.freeze({',
    'this.#tasks.set(parsed.request.requestIdentity, record);',
    'taskOperation = task.load();',
    "this.#runSynchronousOperation('task-resolved'",
    "this.#runSynchronousOperation('task-rejected'",
    "this.#runSynchronousOperation('cancel'",
    "this.#runSynchronousOperation('dispose'",
    "this.#runSynchronousOperation('destroy'",
    'record.resolveOperation(handle);',
  ]) {
    if (!collectionPreviewLazyGltfAdapter.includes(marker)) {
      throw new Error(`P5 A6.11a懒加载适配层缺少同步提交边界标记${marker}。`);
    }
  }
  if (collectionPreviewLazyGltfAdapter.indexOf('const operation = Object.freeze({')
    >= collectionPreviewLazyGltfAdapter.indexOf('taskOperation = task.load();')
    || collectionPreviewLazyGltfAdapter.indexOf(
      'this.#tasks.set(parsed.request.requestIdentity, record);',
    ) >= collectionPreviewLazyGltfAdapter.indexOf('taskOperation = task.load();')) {
    throw new Error('P5 A6.11a必须先发布task operation与record，再启动PresentationAssetLoadTask。');
  }
  const collectionFormalPreviewLeaseOwner = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-collection-formal-preview-lease-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedCallbackReentryRejectedBeforeSuccessCommit: true',
    'leaseAndResourceOwnersPublishedBeforeLoaderLoad: true',
    'loadSettlementCommitsUnderOperationGuard: true',
    'releasedLeaseCannotBeRevivedByLateLoad: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'loadOperationCapturedAndObservedBeforeCommitCheck: true',
    'cancelAndDisposeCallbacksCheckedBeforeCleanupCommit: true',
    'cleanupReentryRetainsCurrentAndLaterResources: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'const settlementOwner = createDeferredPromiseOwner<void>();',
    'const leaseResult = this.#installLease(',
    'this.#load, loadRequest',
    "this.#runSynchronousOperation('load-fulfilled'",
    "this.#runSynchronousOperation('load-rejected'",
    "this.#runSynchronousOperation('load-invocation-failure'",
    "this.#runSynchronousOperation('release'",
    "this.#runSynchronousOperation('reset-epoch'",
    "this.#runSynchronousOperation('destroy'",
    'if (lease.resultSettled) return;',
  ]) {
    if (!collectionFormalPreviewLeaseOwner.includes(marker)) {
      throw new Error(`P5 A6.6正式预览租约Owner缺少同步提交边界标记${marker}。`);
    }
  }
  if (collectionFormalPreviewLeaseOwner.includes('#reentryAttempted')) {
    throw new Error('P5 A6.6正式预览租约Owner不得恢复可重置布尔反调事实。');
  }
  if (collectionFormalPreviewLeaseOwner.indexOf('const leaseResult = this.#installLease(')
    >= collectionFormalPreviewLeaseOwner.indexOf('this.#load, loadRequest')) {
    throw new Error('P5 A6.6必须先发布租约与资源Owner，再调用外部loader。');
  }
  const collectionPreviewLeaseExecutor = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-collection-visible-preview-lease-command-execution-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedCallbackReentryRejectedBeforeSuccessCommit: true',
    'commandOwnerPublishedBeforeExecutionMicrotask: true',
    'commandAndLeaseSettlementCommitUnderOperationGuard: true',
    'failedOwnerCannotBeRevivedByLateCommand: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'proofAndLeaseCallbacksCheckedBeforeLedgerCommit: true',
    'acquiredLeasePromiseObservedBeforeRecordPublication: true',
    'destroyReentryRetainsCurrentAndLaterOwners: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'this.#inFlightPromise = operation;',
    'NATIVE_PROMISE_THEN, EXECUTION_MICROTASK_TRIGGER',
    "this.#runSynchronousOperation('constructor-snapshot'",
    "this.#runSynchronousOperation('command-commit'",
    "this.#runSynchronousOperation('command-failure'",
    "this.#runSynchronousOperation('lease-settled'",
    "this.#runSynchronousOperation('lease-rejected'",
    "this.#runSynchronousOperation('destroy'",
    'command执行时拒绝状态${this.#state}复活',
  ]) {
    if (!collectionPreviewLeaseExecutor.includes(marker)) {
      throw new Error(`P5 A6.11b租约命令Executor缺少同步提交边界标记${marker}。`);
    }
  }
  if (collectionPreviewLeaseExecutor.includes('#reentryAttempted')) {
    throw new Error('P5 A6.11b租约命令Executor不得恢复可重置布尔反调事实。');
  }
  if (collectionPreviewLeaseExecutor.indexOf('this.#inFlightPromise = operation;')
    >= collectionPreviewLeaseExecutor.indexOf(
      'NATIVE_PROMISE_THEN, EXECUTION_MICROTASK_TRIGGER',
    )) {
    throw new Error('P5 A6.11b必须先发布command Owner，再调度执行微任务。');
  }
  const collectionPreviewResourceComposition = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-collection-formal-preview-resource-execution-composition-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedChildReentryRejectedBeforeSuccessCommit: true',
    'commandOwnerPublishedBeforeExecutorExecute: true',
    'commandSettlementCommitsUnderOperationGuard: true',
    'failedOwnerCannotBeRevivedByLateFulfillment: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'executorAdapterSnapshotsCheckedBeforeAggregateCommit: true',
    'asyncChildCommandCapturedAndSettledBeforeCommitCheck: true',
    'destroyReentryRetainsCurrentAndLaterOwners: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'this.#inFlightPromise = operation;',
    'childPromise = this.#executor.execute(value);',
    'this.#childInFlightPromise = childPromise;',
    'this.#attachCommandSettlement(operation, childPromise, commandOwner);',
    "this.#runSynchronousOperation('constructor-snapshot'",
    "this.#runSynchronousOperation('command-fulfilled'",
    "this.#runSynchronousOperation('command-rejected'",
    "this.#runSynchronousOperation('reset-epoch'",
    "this.#runSynchronousOperation('destroy'",
    'command完成时拒绝状态${this.#state}复活',
  ]) {
    if (!collectionPreviewResourceComposition.includes(marker)) {
      throw new Error(`P5 A6.11c资源Composition缺少同步提交边界标记${marker}。`);
    }
  }
  if (collectionPreviewResourceComposition.includes('#reentryAttempted')) {
    throw new Error('P5 A6.11c资源Composition不得恢复可重置布尔反调事实。');
  }
  if (collectionPreviewResourceComposition.indexOf('this.#inFlightPromise = operation;')
    >= collectionPreviewResourceComposition.indexOf(
      'childPromise = this.#executor.execute(value);',
    )) {
    throw new Error('P5 A6.11c必须先发布command Owner，再调用A6.11b execute。');
  }
  const collectionPreviewPageTransaction = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-page-transaction-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedChildReentryRejectedBeforeSuccessCommit: true',
    'stepOwnerPublishedBeforeResourceExecute: true',
    'resourceSettlementCommitsUnderOperationGuard: true',
    'failedOwnerCannotBeRevivedByLateFulfillment: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'this.#inFlightPromise = operation;',
    'resourcePromise = this.#resourceOwner.execute({',
    "this.#runSynchronousOperation('resource-fulfilled'",
    "this.#runSynchronousOperation('resource-rejected'",
    "this.#runSynchronousOperation('destroy'",
    'resource完成时拒绝状态${this.#state}复活',
  ]) {
    if (!collectionPreviewPageTransaction.includes(marker)) {
      throw new Error(`P5 A6.12c页面事务缺少同步提交边界标记${marker}。`);
    }
  }
  if (collectionPreviewPageTransaction.includes('#reentryAttempted')) {
    throw new Error('P5 A6.12c页面事务不得恢复可重置的布尔反调事实。');
  }
  if (collectionPreviewPageTransaction.indexOf('this.#inFlightPromise = operation;')
    >= collectionPreviewPageTransaction.indexOf(
      'resourcePromise = this.#resourceOwner.execute({',
    )) {
    throw new Error('P5 A6.12c必须先发布step Owner，再调用A6.11c execute。');
  }
  const collectionPreviewPageSurfaceHost = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-page-surface-host-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedChildReentryRejectedBeforeSuccessCommit: true',
    'submissionOwnerPublishedBeforePageStep: true',
    'submissionSettlementCommitsUnderOperationGuard: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'pageRenderAndSnapshotCallbacksCheckedBeforeStateCommit: true',
    'asyncChildSubmissionCapturedBeforeCommitCheck: true',
    'destroyReentryRetainsCurrentAndLaterOwners: true',
    'this.#submission = operation;',
    'childSubmission = this.#page.step(value);',
    "this.#runSynchronousOperation('submission-fulfilled'",
    "this.#runSynchronousOperation('submission-rejected'",
    "this.#runSynchronousOperation('render-current'",
    "this.#runSynchronousOperation('destroy'",
  ]) {
    if (!collectionPreviewPageSurfaceHost.includes(marker)) {
      throw new Error(`P5 A6.14页面预览Host缺少同步提交边界标记${marker}。`);
    }
  }
  if (collectionPreviewPageSurfaceHost.includes('#reentryAttempted')) {
    throw new Error('P5 A6.14页面预览Host不得恢复可重置的布尔反调事实。');
  }
  if (collectionPreviewPageSurfaceHost.indexOf('this.#submission = operation;')
    >= collectionPreviewPageSurfaceHost.indexOf('childSubmission = this.#page.step(value);')) {
    throw new Error('P5 A6.14必须先发布Host submission Owner，再调用A6.12c step。');
  }
  const collectionPreviewSurface = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedHostReentryRejectedBeforeSuccessCommit: true',
    'submissionOwnerPublishedBeforePreviewHostSubmit: true',
    'submissionSettlementCommitsUnderOperationGuard: true',
    'resourceRedrawCallbackCommitsUnderOperationGuard: true',
    'scrollRefreshReusesCurrentRevealOperation: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'surfaceContextPreviewAndObserverCallbacksCheckedBeforeStateCommit: true',
    'asyncSubmissionOwnersCapturedBeforeChildStart: true',
    'childSnapshotsCheckedBeforeAggregatePublication: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'this.#submission = operation;',
    'this.#previewHost.submitPage({',
    "this.#runSynchronousOperation('submission-fulfilled'",
    "this.#runSynchronousOperation('submission-rejected'",
    "this.#runSynchronousOperation('resource-redraw'",
  ]) {
    if (!collectionPreviewSurface.includes(marker)) {
      throw new Error(`P5收藏预览同步与异步提交缺少边界标记${marker}。`);
    }
  }
  if (collectionPreviewSurface.includes('#reentryAttempted')) {
    throw new Error('P5收藏预览不得恢复可重置的布尔反调事实。');
  }
  if (collectionPreviewSurface.indexOf('this.#submission = operation;')
    >= collectionPreviewSurface.indexOf('this.#previewHost.submitPage({')) {
    throw new Error('P5收藏预览必须先发布submission Owner，再调用A6.14 submitPage。');
  }
  const characterPreviewRender = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-character-selection-formal-preview-render-surface-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'previewRectCssPixels',
    'renderPositionProvidedPerFrame: true',
    'fullyVisiblePreviewOnly: true',
    'fractionalScrollPositionSupported: true',
    'rendererDestroyUsesCompletionWatermarks: true',
    'rendererDestroyReentrancyRejected: true',
    'synchronousRenderSnapshotAndDestroyGuarded: true',
    'swallowedRendererReentryFailsClosed: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'rendererAndSceneCallbacksCheckedBeforeFrameCommit: true',
    'destroyReentryRetainsCurrentAndLaterOwners: true',
    "this.#runSynchronousOperation('render'",
    "this.#runSynchronousOperation('snapshot'",
    "this.#runSynchronousOperation('destroy'",
  ]) {
    if (!characterPreviewRender.includes(marker)) {
      throw new Error(`P5选角逐帧滚动投影缺少边界标记${marker}。`);
    }
  }
  if (characterPreviewRender.includes('#reentryAttempted')) {
    throw new Error('P5选角逐帧Render不得保留可重置布尔反调事实。');
  }
  const characterPreviewSurface = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation-three/src/arena-v2-information-character-selection-preview-surface-composition-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "visibility: 'clipped-or-outside'",
    'this.#mountOwner?.clear()',
    'scrollPositionDoesNotRemountCharacterOrWeapon: true',
    'clippedPreviewRetainsMount: true',
    'leavingCharacterPageReleasesMount: true',
    'constructionRollbackRetainsFailedCleanupOwnership: true',
    'disposeRetriesOnlyIncompleteOwnedResources: true',
    'rendererBorrowReleasedBeforeMountOwnerDestroy: true',
    'underlyingSurfaceWaitsForPreviewOwners: true',
    'disposeReentrancyRejected: true',
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedHostReentryRejectedBeforeSuccessCommit: true',
    'scrollRefreshReusesCurrentRevealOperation: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'surfaceMountRendererAndObserverCallbacksCheckedBeforeStateCommit: true',
    'childSnapshotsCheckedBeforeAggregatePublication: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    '#orphanRenderer',
    '&& this.#renderSurface === null',
    '&& this.#orphanRenderer === null',
    '&& this.#mountOwner === null',
    '&& !this.#surfaceDisposed',
    'this.#scrollUnbind = unbind;',
    "if (typeof unbind === 'function')",
    'if (this.#scrollUnbind === null) {',
  ]) {
    if (!characterPreviewSurface.includes(marker)) {
      throw new Error(`P5选角预览生命周期缺少边界标记${marker}。`);
    }
  }
  if (characterPreviewSurface.includes('#reentryAttempted')) {
    throw new Error('P5选角预览组合不得保留可重置布尔反调事实。');
  }
  if (/try \{ this\.#mountOwner\.destroy\(\); \} catch \(error\) \{ errors\.push\(error\); \}\s*this\.#mountOwner = null/u.test(
    characterPreviewSurface,
  ) || /try \{ this\.#renderSurface\.destroy\(\); \} catch \(error\) \{ errors\.push\(error\); \}\s*this\.#renderSurface = null/u.test(
    characterPreviewSurface,
  )) {
    throw new Error('P5选角预览不得在子清理失败后无条件丢失唯一重试Owner。');
  }
  for (const marker of [
    'this.#unbindIntent === null && !this.#surfaceDisposed',
    'this.#surfaceDisposed && !this.#hostOwnerDestroyed',
    '&& this.#hostOwnerDestroyed',
    '&& this.#matchSurface !== null',
    '&& !this.#matchSurfaceDisposed',
    'cleanupRespectsInformationHostAndMatchProducerDependencyOrder: true',
    'failedInformationCleanupRetainsHostAndMatchAssetOwners: true',
    'failedHostCleanupRetainsMatchAudioAndVfxProducer: true',
    'disposeRequiresAllOwnedResourcesToReachCompletion: true',
  ]) {
    if (!localPlayableSurfaceBinding.includes(marker)) {
      throw new Error(`P5页面Binding清理依赖顺序缺少边界标记${marker}。`);
    }
  }
  const formalWebComposition = await readFile(path.join(
    repositoryRoot,
    'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'panel.rect.y - request.scrollOffsetCssPixels',
    'characterPreviewFractionalScrollProjectionWired: true',
    "characterPreviewFullyVisiblePolicy: 'entire-preview-rect-inside-content-clip'",
    'characterPreviewScrollDoesNotRemountModel: true',
    'characterPreviewClippedStateRetainsMount: true',
    'characterPreviewClippedStateSkipsProfileAndLoadoutReads: true',
    'characterPreviewPageExitReleasesMount: true',
    'projectArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1(',
    "'localJumpAvailability', 'localParticipantId', 'events', 'result'",
    'this.#pointerSurface.applyMovementAvailability(movementAndJump.movement)',
    'this.#pointerSurface.applyJumpActionAvailability(movementAndJump.jump)',
    "primaryKind === 'selected' || primaryHoldKind === 'selected'",
    'primaryAvailabilityIncludesPressOrHoldAffordance: true',
    "commitment.status === 'charging'",
    'primaryAvailabilityIncludesActiveHoldCommitment: true',
    'primaryGestureHintUsesAuthorityChargeLevel: true',
  ]) {
    if (!formalWebComposition.includes(marker)) {
      throw new Error(`P5正式Web选角滚动接线缺少边界标记${marker}。`);
    }
  }
  if (formalWebComposition.includes('if (request.scrollOffsetCssPixels !== 0) return null')) {
    throw new Error('P5选角预览不得因页面发生任意滚动而永久隐藏。');
  }
  if (formalWebComposition.indexOf("visibility: 'clipped-or-outside' as const")
    >= formalWebComposition.indexOf('getInformationCharacterPreviewLoadoutRead()')) {
    throw new Error('P5选角预览裁剪态不得为不可见画面反复读取Profile与装备。');
  }
  for (const deferredTestFile of [
    P5_WEAPON_AVAILABILITY_DEFERRED_TEST_FILE,
    P5_SURVIVAL_REPEATABLE_CHALLENGE_DEFERRED_TEST_FILE,
    P5_COMPETITIVE_REPEATABLE_CHALLENGE_DEFERRED_TEST_FILE,
  ]) {
    const deferredTest = await readFile(path.join(repositoryRoot, deferredTestFile), 'utf8');
    if (!deferredTest.includes("implementationStatus: 'code-written-not-run'")) {
      throw new Error(`${deferredTestFile}缺少code-written-not-run反证。`);
    }
  }
  if (/this\.#bundleFactory = null;\s*this\.#destroyed = true/u.test(
    threeModeInformationHost,
  )) {
    throw new Error('P5三模式Information Host不得在子清理失败后无条件丢失所有权。');
  }
  console.log(JSON.stringify({
    status: 'passed',
    p5FileCount: P5_FILES.length + P5_CONTENT_FILES.length
      + P5_HOST_FILES.length + P5_THREE_FILES.length + 1,
    productionRootCount: PRODUCTION_ROOTS.length,
  }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
