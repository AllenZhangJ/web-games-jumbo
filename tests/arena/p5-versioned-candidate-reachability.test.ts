import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const PRODUCTION_ROOTS = Object.freeze([
  'src/entry',
  'packages/arena-v1-composition/src',
  'packages/arena-v1-application-launch/src',
  'packages/arena-v1-application-session/src',
  'packages/arena-product-composition/src',
  'packages/arena-product-presentation-three/src',
]);

const P5_VERSIONED_SURFACE = /\b(?:ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1|ARENA_V2_INFORMATION_SCREEN_CATALOG_CANDIDATE_V1|ARENA_V2_INFORMATION_PRESENTATION_CONTENT_CANDIDATE_V1|ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1|ARENA_V2_QUICK_MATCH_BUNDLE_FACTORY_CANDIDATE_V1|ArenaV2InformationNavigationSessionV1|ArenaV2InformationModeSessionHostCandidateV1|ArenaV2ModeLearningSessionFactoryCandidateV1|ArenaV2QuickMatchBundleFactoryCandidateV1|ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1|projectArenaV2InformationScreenViewModelV1|createArenaV2InformationScreenPipelineV1|addArenaV2InformationSelectionToRenderPlanCandidateV1|addArenaV2InformationModePreparationLinkToRenderPlanCandidateV1|addArenaV2InformationModeCharacterLinkToRenderPlanCandidateV1|addArenaV2InformationCompetitivePreparationLinksToRenderPlanCandidateV1|addArenaV2InformationSurvivalPreparationLinksToRenderPlanCandidateV1|addArenaV2InformationPreparationDetailReturnToRenderPlanCandidateV1|addArenaV2InformationDetailDirectoryLinkToRenderPlanCandidateV1|addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1|projectArenaV2CharacterInformationCandidateV1|projectArenaV2InformationCollectionContentV1|projectArenaV2WeaponDetailContentFieldsV1|projectArenaV2WeaponOperationReadV1|projectArenaV2WeaponCoreFightReadV1|projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1|projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1|projectArenaV2MapRouteSkeletonReadV1|projectArenaV2MapDetailContentFieldsV1|advanceArenaV2ModeHudFeedbackQueueV1|ArenaV2ModeHudFeedbackEffectConsumerV1|ArenaV2ModeHudPresentationHostV1|ArenaV2ModeHudValidatedPresentationHostV1|projectArenaV2ModeHudWorldMarkersV1|createArenaV2ModeHudRenderPlanV1|paintArenaV2UiRenderPlanV1|createArenaV2UiDomSurfaceModelV1|resolveArenaV2UiPointerIntentV1)\b|\/arena-v2-(?:character-information|home-(?:next-learning-signature|record-summary)-information|information-screen|information-navigation|information-content|information-selection|information-mode-(?:preparation|character)-link|information-(?:competitive|survival)-preparation-links|information-preparation-detail-return|information-detail-(?:directory-link|adjacent-browse)|information-presentation|information-mode-session-host|information-local-playable-surface-binding|mode-learning-session-factory|quick-match-bundle-factory|mode-hud|ui-(?:render-plan|canvas-painter|dom-surface-model|interaction))[^'"\s]*\.js/u;

const P5_HOST_CANDIDATES = new Set([
  'src/entry/arena-v2-information-dom-surface-candidate-v1.ts',
  'src/entry/arena-v2-information-canvas-surface-candidate-v1.ts',
  'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-information-mode-session-host-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-mode-learning-session-factory-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-quick-match-bundle-factory-candidate-v1.ts',
]);

function typescriptFiles(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...typescriptFiles(candidate));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(candidate);
  }
  return result;
}

test('P5 candidates remain unreachable until navigation and surface gates approve them', () => {
  for (const root of PRODUCTION_ROOTS) {
    for (const file of typescriptFiles(root)) {
      if (P5_HOST_CANDIDATES.has(file)) continue;
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        P5_VERSIONED_SURFACE,
        `${file}不得在P5门批准前接入P5候选。`,
      );
    }
  }
});

test('P5 exports are explicit, versioned and keep production flags closed', () => {
  const index = readFileSync('packages/arena-product-presentation/src/index.ts', 'utf8');
  for (const file of [
    'arena-v2-information-screen-definition-v1',
    'arena-v2-information-screen-registry-v1',
    'arena-v2-information-screen-view-model-v1',
    'arena-v2-information-content-read-projection-v1',
    'arena-v2-product-session-information-projection-candidate-v1',
    'arena-v2-home-next-learning-signature-information-projection-candidate-v1',
    'arena-v2-home-record-summary-information-projection-candidate-v1',
    'arena-v2-mode-content-information-projection-candidate-v1',
    'arena-v2-loading-information-projection-candidate-v1',
    'arena-v2-information-selection-render-plan-candidate-v1',
    'arena-v2-information-mode-preparation-link-render-plan-candidate-v1',
    'arena-v2-information-mode-character-link-render-plan-candidate-v1',
    'arena-v2-information-competitive-preparation-links-render-plan-candidate-v1',
    'arena-v2-information-survival-preparation-links-render-plan-candidate-v1',
    'arena-v2-information-preparation-detail-return-render-plan-candidate-v1',
    'arena-v2-information-detail-directory-link-render-plan-candidate-v1',
    'arena-v2-information-detail-adjacent-browse-render-plan-candidate-v1',
    'arena-v2-character-information-projection-candidate-v1',
    'arena-v2-information-screen-pipeline-v1',
    'arena-v2-information-navigation-session-v1',
    'arena-v2-information-presentation-content-v1',
    'arena-v2-information-screen-render-model-v1',
    'arena-v2-information-screen-layout-v1',
    'arena-v2-mode-hud-view-model-v1',
    'arena-v2-mode-hud-render-model-v1',
    'arena-v2-mode-hud-feedback-queue-v1',
    'arena-v2-mode-hud-feedback-effect-consumer-v1',
    'arena-v2-mode-hud-consumer-epoch-v1',
    'arena-v2-mode-hud-presentation-host-v1',
    'arena-v2-mode-hud-validated-presentation-host-v1',
    'arena-v2-mode-hud-layout-v1',
    'arena-v2-mode-hud-world-marker-projection-v1',
    'arena-v2-supply-fact-cue-projection-v1',
    'arena-v2-ui-render-plan-v1',
    'arena-v2-ui-canvas-painter-v1',
    'arena-v2-ui-dom-surface-model-v1',
    'arena-v2-ui-interaction-v1',
  ]) assert.match(index, new RegExp(`\\./${file}\\.js`));
  assert.match(
    readFileSync('packages/arena-product-content/src/index.ts', 'utf8'),
    /\.\/arena-v2-information-content-read-catalog-candidate-v1\.js/,
  );
  const catalog = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-information-screen-registry-v1.ts',
    'utf8',
  );
  assert.match(catalog, /status: 'production-unreachable'/);
  assert.match(catalog, /hardGate: false/);
  assert.match(catalog, /defaultNavigationWired: false/);
  for (const hostFile of P5_HOST_CANDIDATES) {
    const hostCandidate = readFileSync(hostFile, 'utf8');
    assert.match(hostCandidate, /status: 'production-unreachable'/);
    assert.match(hostCandidate, /hardGate: false/);
    assert.match(hostCandidate, /defaultEntryWired: false/);
    assert.match(hostCandidate, /defaultNavigationWired: false/);
  }
  for (const root of PRODUCTION_ROOTS) {
    for (const file of typescriptFiles(root)) {
      if (P5_HOST_CANDIDATES.has(file)) continue;
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        /arena-v2-information-(?:dom|canvas)-surface-candidate-v1/u,
        `${file}不得导入隔离的P5宿主候选。`,
      );
    }
  }
});

test('P5 three-mode Information owner preserves Host to Factory dependency cleanup', () => {
  const source = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  const ownerStart = source.indexOf(
    'export class ArenaThreeModeAuthoritativeInformationHostCandidateV1',
  );
  const ownerEnd = source.indexOf('\nfunction playablePreferences', ownerStart);
  assert.notEqual(ownerStart, -1);
  assert.notEqual(ownerEnd, -1);
  const owner = source.slice(ownerStart, ownerEnd);
  assert.match(owner, /#sessionFactory: ArenaV2ModeLearningSessionFactoryCandidateV1 \| null/u);
  assert.match(owner, /if \(this\.#hostDestroyed && sessionFactory !== null\)/u);
  assert.match(
    owner,
    /if \(this\.#hostDestroyed && this\.#sessionFactory === null && bundleFactory !== null\)/u,
  );
  assert.match(owner, /destroyDependencyOrder: Object\.freeze\(\[[\s\S]*'information-host'[\s\S]*'mode-learning-session-factory'[\s\S]*'quick-match-bundle-factory'/u);
  assert.match(owner, /destroyClearsOnlySuccessfullyReleasedOwners: true/u);
  assert.match(owner, /failedFactoryCleanupRetainsRetryOwnership: true/u);
});

test('P5 keyboard and pointer drivers retry only incomplete owned cleanup resources', () => {
  const keyboard = readFileSync(
    'src/entry/arena-v2-local-match-keyboard-driver-candidate-v1.ts',
    'utf8',
  );
  assert.match(keyboard, /#loopQuiesced = false/u);
  assert.match(keyboard, /#loopDestroyed = false/u);
  assert.match(keyboard, /#bindingDisposed = false/u);
  assert.match(
    keyboard,
    /this\.#loopQuiesced && this\.#input === null && this\.#visibilityCleanups\.length === 0/u,
  );
  assert.match(keyboard, /driverCleanupRetriesOnlyIncompleteOwnedResources: true/u);
  assert.match(
    keyboard,
    /bindingCleanupWaitsForLoopInputAndVisibilityQuiescence: true/u,
  );

  const pointer = readFileSync(
    'src/entry/arena-v2-local-match-pointer-driver-candidate-v1.ts',
    'utf8',
  );
  assert.equal((pointer.match(/#visibilityPaused = false;/gu) ?? []).length, 1);
  assert.match(pointer, /#adapterDestroyed = false/u);
  assert.match(pointer, /#samplerDestroyed = false/u);
  assert.match(pointer, /this\.#cleanups\.length === 0 && !this\.#adapterDestroyed/u);
  assert.match(pointer, /this\.#adapterDestroyed && !this\.#samplerDestroyed/u);
  assert.match(pointer, /driverCleanupRetriesOnlyIncompleteOwnedResources: true/u);
  assert.match(pointer, /bindingCleanupWaitsForLoopAndInputQuiescence: true/u);
});

test('P5.3zzzwg uses one visible keyboard and touch binding without adding controls', () => {
  const binding = readFileSync(
    'packages/arena-presentation-runtime/src/arena-v2-simple-three-concept-control-binding.ts',
    'utf8',
  );
  const runtimeIndex = readFileSync(
    'packages/arena-presentation-runtime/src/index.ts',
    'utf8',
  );
  const keyboard = readFileSync(
    'src/entry/arena-v2-local-match-keyboard-driver-candidate-v1.ts',
    'utf8',
  );
  const pointer = readFileSync(
    'src/entry/arena-v2-local-match-pointer-driver-candidate-v1.ts',
    'utf8',
  );
  const copy = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-control-learning-copy-candidate-v1.ts',
    'utf8',
  );
  const tokens = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-ui-visual-tokens-v1.ts',
    'utf8',
  );
  for (const marker of [
    "moveLeftCodes: Object.freeze(['KeyA', 'ArrowLeft'] as const)",
    "moveRightCodes: Object.freeze(['KeyD', 'ArrowRight'] as const)",
    "moveForwardCodes: Object.freeze(['KeyW', 'ArrowUp'] as const)",
    "moveBackwardCodes: Object.freeze(['KeyS', 'ArrowDown'] as const)",
    "jumpCodes: Object.freeze(['Space'] as const)",
    "primaryAttackCodes: Object.freeze(['KeyJ', 'KeyE'] as const)",
    "visibleText: '键盘 WASD/方向键移动 · 空格跳跃 · J/E攻击'",
    "visibleText: '触控 方向盘移动 · 跳跃键 · 攻击键'",
  ]) assert.match(binding, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  assert.match(runtimeIndex, /arena-v2-simple-three-concept-control-binding\.js/u);
  assert.match(keyboard, /ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1/u);
  assert.match(pointer, /ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1/u);
  assert.match(copy, /platformControlAccessibilityText/u);
  assert.match(copy, /coveredCharacterCount:/u);
  assert.match(copy, /coveredWeaponCount:/u);
  assert.match(copy, /coveredMapSegmentCount:/u);
  assert.match(tokens, /ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1/u);
  assert.doesNotMatch(binding, /block|crouch|dash|slam|格挡|蹲伏|冲刺|下砸/u);
});

test('P5 formal VFX retains exact effects and late textures until cleanup succeeds', () => {
  const source = readFileSync(
    'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /readonly #effectCleanupDebts = new Set<ActiveEffect>\(\)/u);
  assert.match(source, /#retainEffectCleanupDebt\(effect: ActiveEffect\): void/u);
  assert.match(source, /const cleanupErrors = disposeEffect\(draft\)/u);
  assert.match(source, /this\.#retainEffectCleanupDebt\(effect\)/u);
  assert.match(source, /readonly #pendingTextures = new Set<THREE\.Texture>\(\)/u);
  assert.match(source, /this\.#pendingTextures\.add\(texture\)/u);
  assert.match(source, /Promise\.allSettled\(loadingOperations\)/u);
  assert.match(source, /#clearPendingTextures\(\): readonly unknown\[\]/u);
  assert.match(source, /this\.#pendingTextures\.size === 0/u);
  assert.match(source, /!this\.#loadPending/u);
  assert.match(source, /failedEffectCleanupRetainsOriginalEffectOwnership: true/u);
  assert.match(source, /failedEffectConstructionRetainsRetryableCleanupDebt: true/u);
  assert.match(source, /effectMountIsTransactional: true/u);
  assert.match(source, /lateTextureCleanupRetainsRetryOwnership: true/u);
  assert.match(source, /textureBatchSettlementCannotCompleteOnFirstFailure: true/u);
});

test('P5 HUD feedback consumer retains incomplete visual and audio cleanup ownership', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
    'utf8',
  );
  assert.match(source, /#cleanupStarted = false/u);
  assert.match(source, /#visualCleared = false/u);
  assert.match(source, /#audioStopped = false/u);
  assert.match(source, /#visualEffectsOwned = false/u);
  assert.match(source, /#audioEffectsOwned = false/u);
  assert.match(source, /#cleanupOwnedEffects\(\): readonly unknown\[\]/u);
  assert.match(source, /#cleanupComplete\(\): boolean/u);
  assert.match(source, /if \(this\.#visualEffectsOwned && !this\.#visualCleared\)/u);
  assert.match(source, /if \(this\.#audioEffectsOwned && !this\.#audioStopped\)/u);
  assert.match(source, /cleanupRetriesOnlyIncompleteExternalEffects: true/u);
  assert.match(source, /epochSwitchCarriesPartialCleanupIntoFailedState: true/u);
  assert.match(source, /terminalStateWaitsForVisualClearAndAudioStop: true/u);
  assert.match(source, /freshOwnerDisposeHasNoExternalSideEffects: true/u);
  assert.match(source, /externalEffectOwnershipBeginsBeforePotentialSideEffect: true/u);
});

test('P5 HUD congestion keeps terminal, fall and ring-out feedback ahead of supply', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-queue-v1.ts',
    'utf8',
  );
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
  ]) assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  assert.doesNotMatch(
    source.slice(source.indexOf('function semanticPriority'), source.indexOf('\nfunction lifetimeTicks')),
    /title|explanation/u,
  );
  const renderModel = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-hud-render-model-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ARENA_V2_MODE_HUD_FEEDBACK_PERSPECTIVE_CONTRACT_V1',
    "source: 'validated-local-participant-and-feedback-participant-ids'",
    'weaponFeedbackPerspective(',
    'supplyFeedbackPerspective(',
    'modeFeedbackPerspective(',
    'localizedCopyDoesNotAffectPerspective: true',
    'weaponSpecializationCannotChangePerspective: true',
    'writesRuleMatchOrResult: false',
  ]) assert.match(renderModel, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  const effectConsumer = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
    'utf8',
  );
  for (const marker of [
    "audioVoicePrioritySource: 'feedback-queue-semantic-priority'",
    "audioGainSource: 'existing-feedback-emphasis'",
    'audioVoicePriorityDoesNotChangeGainDb: true',
    'maximumConcurrentAudioVoices: 8',
    'priority: cue.voicePriority',
    'const gainPriority = emphasisPriority(emphasis)',
    'voicePriority !== 1 && voicePriority !== 2 && voicePriority !== 3',
  ]) assert.match(effectConsumer, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
});

test('P5 HUD presentation hosts retain incomplete child ownership and feedback identity', () => {
  const host = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-hud-presentation-host-v1.ts',
    'utf8',
  );
  assert.match(host, /#projectionConsumerDisposed = false/u);
  assert.match(host, /#effectConsumerDisposed = false/u);
  assert.match(host, /#cleanupChildren\(\): readonly unknown\[\]/u);
  assert.match(host, /cleanupRetriesOnlyIncompleteChildConsumers: true/u);
  assert.match(host, /terminalStateWaitsForBothChildConsumers: true/u);

  const specializedHost = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
    'utf8',
  );
  assert.match(specializedHost, /#innerHostDisposed = false/u);
  assert.match(specializedHost, /#deferIdentityClear = false/u);
  assert.match(specializedHost, /assertSynchronousReturn\(result, 'Arena V2 twenty weapon HUD visual\.remove'\)/u);
  assert.match(specializedHost, /epochIdentityClearCommitsAfterInnerEpochSwitch: true/u);
  assert.match(specializedHost, /failedCleanupRetainsFeedbackReadIdentity: true/u);
  assert.match(specializedHost, /cleanupRetriesOnlyIncompleteInnerHost: true/u);
  assert.match(specializedHost, /terminalStateWaitsForInnerHost: true/u);
  assert.match(specializedHost, /presentPassthroughDirectional/u);
  assert.match(specializedHost, /unarmedDirectionAndImpactStrengthPreserved: true/u);
  assert.match(specializedHost, /unarmedAudioStrengthUsesExistingCueAndBus: true/u);
  assert.match(specializedHost, /impactStrengthAudioPriorityAndGainFloorsIndependent: true/u);
  assert.match(
    specializedHost,
    /const gainDb = command\.gainDb >= strength\.presentation\.minimumAudioGainDb/u,
  );
  assert.match(
    specializedHost,
    /const MAXIMUM_SYNC_PORT_METHOD_PROTOTYPE_DEPTH = 32/u,
  );
  assert.match(specializedHost, /if \(visited\.has\(owner\)\)/u);
  assert.match(
    specializedHost,
    /synchronousPortMethodPrototypeCycleRejected: true/u,
  );
  const unarmedDirection = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-unarmed-feedback-direction-presentation-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1',
    'ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1',
    'PASSTHROUGH_CUE_BY_FEEDBACK_KIND',
    'exactUnarmedActionIdentityRequired: true',
    'exactFeedbackFactIdentityRequired: true',
    'reusesGenericCueAndAuthoredBudget: true',
    'infersDirectionFromPositionOrAnimation: false',
    'addsTextureAudioOrParticleBudget: false',
  ]) assert.match(unarmedDirection, new RegExp(
    marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'),
    'u',
  ));
});

test('P5 formal Three preloader retains loading tasks until every lease settles and releases', () => {
  const task = readFileSync(
    'packages/arena-presentation-runtime/src/presentation-asset-load-task.ts',
    'utf8',
  );
  assert.match(task, /#loadSettled = true/u);
  assert.match(task, /isCleanupComplete\(\): boolean/u);
  assert.match(task, /this\.#state === PRESENTATION_ASSET_LOAD_STATE\.DESTROYED/u);
  assert.match(task, /&& this\.#loadSettled/u);
  assert.match(task, /&& this\.#lease === null/u);

  const preloader = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-asset-preloader-candidate-v1.ts',
    'utf8',
  );
  assert.match(preloader, /Promise\.allSettled\(operations\)/u);
  assert.match(preloader, /throwSettledBatchFailures\(/u);
  assert.match(preloader, /if \(task\.isCleanupComplete\(\)\) this\.#tasks\.delete\(assetId\)/u);
  assert.match(preloader, /this\.#tasks\.size === 0 && !this\.#loadPending/u);
  assert.match(preloader, /waitsForEntireLoadBatchSettlement: true/u);
  assert.match(preloader, /retainsIncompleteTasksForCleanupRetry: true/u);
  assert.match(preloader, /reportsEveryRejectedLoadInSettledBatch: true/u);
  assert.match(preloader, /#disposeRequested = false/u);
  assert.match(preloader, /this\.#continueRequestedDisposal\(\)/u);
  assert.match(
    preloader,
    /loadingSettlementAutomaticallyContinuesRequestedDisposal: true/u,
  );
});

test('P5 formal Three stage retains partial match and terminal cleanup ownership', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-stage-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#beginMatchCleanupOwnership\(\): void/u);
  assert.match(
    source,
    /#disposeEquipmentRecord\(instanceId: string \| null, record: EquipmentRecord\)/u,
  );
  assert.match(source, /readonly #equipmentCleanupDebts = new Set<EquipmentRecord>\(\)/u);
  assert.match(source, /#createEquipmentRecord\(/u);
  assert.match(source, /candidate\.readability\.consume\(\{/u);
  assert.match(source, /if \(identityChanged\) this\.#equipmentRoot\.add\(candidate\.root\)/u);
  assert.match(source, /this\.#disposeEquipmentRecord\(equipment\.instanceId, previous\)/u);
  assert.match(
    source,
    /record\.cleanup\.readabilityDestroyed && !record\.cleanup\.rootRemoved/u,
  );
  assert.match(source, /#matchCleanupComplete\(\): boolean/u);
  assert.match(source, /#terminalCleanupComplete\(\): boolean/u);
  assert.match(source, /this\.#characters === null && this\.#characterFactory !== null/u);
  assert.match(source, /this\.#routeReadability === null && this\.#mapObject !== null/u);
  assert.match(source, /this\.#visualEffectsDisposed && !this\.#characterImpactDisposed/u);
  assert.match(source, /this\.#visualEffectsDisposed && !this\.#cameraDisposed/u);
  assert.match(source, /matchCleanupRetriesOnlyIncompleteOwnedResources: true/u);
  assert.match(source, /worldEquipmentReplacementPreflightsBeforeRetiringPrevious: true/u);
  assert.match(source, /failedWorldEquipmentReplacementRetainsRetryableCleanupDebt: true/u);
  assert.match(source, /failedOpenRetainsConstructedMatchOwners: true/u);
  assert.match(source, /terminalCleanupRequiresEveryOwnedResource: true/u);
  assert.match(source, /strictProductionApprovalRequiredByDefault: true/u);
  assert.match(source, /isolatedUnapprovedCandidateStageRequiresExplicitOptIn: true/u);
  assert.match(source, /packet\(value, this\.#allowUnapprovedCandidates\)/u);
});

test('P5 formal Scene reports frame-specific production approval blockers', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-scene-resolution-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /isArenaV2FormalModelLoadPermittedCandidateV1/u);
  assert.match(source, /unapprovedCharacterAssetIds/u);
  assert.match(source, /unapprovedEquipmentAssetIds/u);
  assert.match(source, /unapprovedMapAssetIds/u);
  assert.match(source, /productionApprovalUsesSharedLedgerIndex: true/u);
  assert.match(source, /reportsFrameSpecificUnapprovedAssetIds: true/u);
});

test('P5 formal GLTF character view and factory retain partial cleanup ownership', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-gltf-character-view-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#cleanupStarted = false/u);
  assert.match(source, /#controllerDisposed = false/u);
  assert.match(source, /readonly #disposedMaterialIndices = new Set<number>\(\)/u);
  assert.match(source, /interface HeldEquipmentRecord/u);
  assert.match(
    source,
    /readonly #heldEquipmentCleanupDebts = new Set<HeldEquipmentRecord>\(\)/u,
  );
  assert.match(source, /#cleanupHeldEquipment\(\): readonly unknown\[\]/u);
  assert.match(source, /#createHeldEquipmentRecord\(definitionId: string\)/u);
  assert.match(source, /this\.#syncHeldWeaponReadability\(candidate, participant, frameValue\)/u);
  assert.match(source, /this\.#equipmentSlot\.add\(candidate\.object\)/u);
  assert.match(source, /this\.#cleanupHeldEquipmentRecord\(previous\)/u);
  assert.match(source, /this\.#rootRemoved && !this\.#rootCleared/u);
  assert.match(source, /this\.#disposedMaterialIndices\.size === this\.#ownedMaterials\.length/u);
  assert.match(source, /this\.#views\.set\(participantId, created\)/u);
  assert.match(source, /viewCleanupRetriesOnlyIncompleteOwnedResources: true/u);
  assert.match(source, /heldEquipmentReplacementPreflightsBeforeRetiringPrevious: true/u);
  assert.match(source, /failedHeldEquipmentReplacementRetainsRetryableCleanupDebt: true/u);
  assert.match(source, /failedViewInitializationRetainsFactoryOwnership: true/u);
  assert.match(source, /factoryDisposalRetainsFailedViewCleanupOwnership: true/u);
});

test('P5 formal HUD retains partial canvas and accessibility cleanup ownership', () => {
  const hud = readFileSync(
    'src/entry/arena-v2-formal-hud-canvas-layer-candidate-v1.ts',
    'utf8',
  );
  assert.match(hud, /#cleanupStarted = false/u);
  assert.match(hud, /#pixelsCleared = true/u);
  assert.match(hud, /#liveRegionRemoved = true/u);
  assert.match(hud, /#contextReleased = true/u);
  assert.match(hud, /#cleanupComplete\(\): boolean/u);
  assert.match(hud, /this\.#pixelsCleared && !this\.#contextReleased/u);
  assert.match(hud, /cleanupRetriesOnlyIncompletePlatformResources: true/u);
  assert.match(hud, /contextReleaseWaitsForPixelClear: true/u);
  assert.match(hud, /canvasAndAccessibilityStateRestoreIndependently: true/u);
  assert.match(hud, /#reentrySequence = 0/u);
  assert.match(hud, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(hud, /#reentryAttempted/u);
  assert.match(hud, /this\.#assertNoOperation\('state-read'\)/u);
  assert.match(hud, /this\.#assertNoOperation\('last-render-plan-read'\)/u);
  assert.match(
    hud,
    /swallowedCanvasDomViewportOrAccessibilityReentryFailsClosed: true/u,
  );
  assert.match(hud, /publicStateAndRenderReadsRejectedDuringOperationCommit: true/u);
  assert.match(hud, /terminalSuccessCannotOverwriteSwallowedReentry: true/u);
  assert.match(hud, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(hud, /platformCallbacksCheckedBeforeRenderAndLifecycleWatermarks: true/u);
  assert.match(hud, /renderProjectionAndPaintCallbacksCheckedBeforeSnapshotPublication: true/u);
  assert.match(hud, /cleanupReentryRetainsCurrentOwnerAndStopsLaterResources: true/u);

  const host = readFileSync(
    'src/entry/arena-v2-formal-web-match-host-candidate-v1.ts',
    'utf8',
  );
  assert.match(host, /hudLayer = new ArenaV2FormalHudCanvasLayerCandidateV1\(\{/u);
  assert.match(host, /hudLayer\.load\(\);/u);
  assert.doesNotMatch(host, /new ArenaV2FormalHudCanvasLayerCandidateV1\([\s\S]*?\}\)\.load\(\)/u);
});

test('P5 formal impact owners dispose without allocating another epoch', () => {
  const camera = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-camera-controller-candidate-v1.ts',
    'utf8',
  );
  assert.match(camera, /FAILED: 'failed'/u);
  assert.match(camera, /#baseCameraRestored = false/u);
  assert.match(camera, /#cameraImpactsDisposed = false/u);
  assert.match(camera, /this\.#cameraImpacts\.clear\(\)/u);
  assert.match(camera, /this\.#baseCameraRestored && !this\.#cameraImpactsDisposed/u);
  assert.match(camera, /terminalDisposalDoesNotAllocateEpoch: true/u);
  assert.match(camera, /cleanupRetriesOnlyIncompleteOwnedResources: true/u);
  const disposeBody = camera.slice(camera.indexOf('  dispose(): void {'));
  assert.doesNotMatch(disposeBody, /this\.#advanceCameraImpactEpoch\(\)/u);

  const characterImpact = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-character-impact-readability-candidate-v1.ts',
    'utf8',
  );
  assert.match(characterImpact, /terminalDisposalDoesNotAllocateEpoch: true/u);
  const characterDisposeBody = characterImpact.slice(characterImpact.indexOf('  dispose(): void {'));
  assert.doesNotMatch(characterDisposeBody, /this\.clearCharacterImpacts\(\)/u);

  const stage = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-stage-candidate-v1.ts',
    'utf8',
  );
  assert.match(stage, /#disposeMatch\(terminal: boolean\)/u);
  assert.match(stage, /#disposeMatch\(true\)/u);
  assert.match(stage, /#disposeMatch\(false\)/u);
  assert.match(stage, /terminalCleanupSkipsReversibleHudVfxAndCameraReset: true/u);
});

test('P5 formal Web host retains listener and asynchronous audio cleanup ownership', () => {
  const audio = readFileSync(
    'src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts',
    'utf8',
  );
  assert.match(audio, /DISPOSING: 'disposing'/u);
  assert.match(audio, /#contextCloseCompleted = false/u);
  assert.match(audio, /this\.#contextCloseCompleted = true/u);
  assert.match(audio, /contextCloseRequestIsNotCleanupCompletion: true/u);
  assert.match(audio, /parentMustRetainOwnershipUntilContextCloseCompletes: true/u);
  assert.match(audio, /loadAndActivationSettlementAutomaticallyContinueRequestedDisposal: true/u);
  assert.match(audio, /contextCloseCompletionNotifiesOwningHost: true/u);
  assert.match(audio, /contextCloseFailureRequiresExplicitOwnerRetry: true/u);

  const vfx = readFileSync(
    'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts',
    'utf8',
  );
  assert.match(vfx, /DISPOSING: 'disposing'/u);
  assert.match(vfx, /#disposeRequested = false/u);
  assert.match(vfx, /this\.#continueRequestedDisposal\(\)/u);
  assert.match(vfx, /textureSettlementAutomaticallyContinuesRequestedDisposal: true/u);
  assert.match(vfx, /reportsEveryRejectedTextureInSettledBatch: true/u);
  assert.match(vfx, /command\.perspective !== 'local-involved'/u);
  assert.match(vfx, /cameraImpactRequiresLocalInvolvement: true/u);
  assert.match(vfx, /remoteWeaponImpactKeepsWorldAndCharacterFeedback: true/u);

  const host = readFileSync(
    'src/entry/arena-v2-formal-web-match-host-candidate-v1.ts',
    'utf8',
  );
  assert.match(host, /#contextLostListenerRemoved = true/u);
  assert.match(host, /#bindContextLostListener\(\): void/u);
  assert.match(host, /this\.#surfaceDisposed && !this\.#preloaderDisposed/u);
  assert.match(host, /this\.#surfaceDisposed && !this\.#rendererDisposed/u);
  assert.match(host, /this\.#surfaceDisposed && !this\.#audioDisposed/u);
  assert.match(host, /this\.#audioDisposed = this\.#audio\.state === 'disposed'/u);
  assert.match(host, /#cleanupComplete\(\): boolean/u);
  assert.match(host, /contextLostListenerBindsAfterConstruction: true/u);
  assert.match(host, /contextLostListenerCleanupRetainsRetryOwnership: true/u);
  assert.match(host, /listenerCleanupFailureDoesNotSkipOwnedResourceCleanup: true/u);
  assert.match(host, /borrowedResourcesReleaseAfterSurfaceDisposal: true/u);
  assert.match(host, /audioOwnershipRetainedUntilContextCloseCompletes: true/u);
  assert.match(host, /Promise\.allSettled\(\[/u);
  assert.match(host, /function captureAsyncOperation<T>/u);
  assert.match(host, /captureAsyncOperation\(\(\) => this\.#preloader\.load\(\)\)/u);
  assert.match(host, /captureAsyncOperation\(\(\) => this\.#audio\.load\(\)\)/u);
  assert.match(host, /captureAsyncOperation\(\(\) => this\.#visualEffects\.load\(\)\)/u);
  assert.match(host, /synchronousChildLoadThrowCannotSkipSiblingStartup: true/u);
  assert.match(host, /reportsEveryRejectedChildPreparationInSettledBatch: true/u);
  assert.match(host, /#scheduleTerminalCleanupContinuation\(\): void/u);
  assert.match(host, /onTerminalCleanupProgress: \(\) => \{/u);
  assert.match(host, /if \(this\.#constructionComplete\) this\.#scheduleTerminalCleanupContinuation\(\)/u);
  assert.match(host, /asyncChildSettlementAutomaticallyContinuesTerminalCleanup: true/u);
  assert.match(host, /constructorRollbackIgnoresLateChildProgressCallbacks: true/u);
  assert.match(host, /terminalCleanupSettlementPropagatesToOwningComposition: true/u);

  const composition = readFileSync(
    'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(
    composition,
    /else retryConstructionOwnerAfterMatchHostSettles\?\.\(\)/u,
  );
  assert.match(composition, /#handleMatchHostTerminalCleanupSettled\(\): void/u);
  assert.match(composition, /if \(this\.#state === 'failed'\) \{/u);
  assert.match(
    composition,
    /matchHostTerminalCleanupSettlementRetriesFailureShutdown: true/u,
  );
  assert.match(composition, /independentMatchHostFailurePropagatesToComposition: true/u);
  assert.match(
    composition,
    /matchHostSettlementContinuesIncompleteConstructionOwnerRollback: true/u,
  );
  assert.match(composition, /constructionRollbackContinuationDoesNotPoll: true/u);
});

test('P5 formal presentation ports share one descriptor-only synchronous return boundary', () => {
  const contract = readFileSync(
    'packages/arena-contracts/src/synchronous-return-boundary.ts',
    'utf8',
  );
  assert.match(contract, /const MAX_SYNCHRONOUS_RETURN_PROTOTYPE_DEPTH = 32/u);
  assert.match(contract, /function assertNativePromiseIntegrity\(\): void/u);
  assert.match(contract, /function assertNativePromiseSpeciesIntegrity\(\): void/u);
  assert.match(contract, /export function assertSynchronousReturn/u);
  assert.match(contract, /descriptorOnlyOrdinaryThenableInspection: true/u);
  assert.match(contract, /nativePromiseIntegrityRequiredBeforeObservation: true/u);
  const sharedRuntime = readFileSync(
    'packages/arena-presentation-runtime/src/capability-utils.ts',
    'utf8',
  );
  assert.match(sharedRuntime, /import \{ assertSynchronousReturn \}/u);
  assert.match(sharedRuntime, /assertSynchronousReturn\(value, name\)/u);
  assert.doesNotMatch(sharedRuntime, /Reflect\.apply\(NATIVE_PROMISE_THEN/u);

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
    const source = readFileSync(file, 'utf8');
    assert.match(source, /assertSynchronousReturn as rejectThenable/u);
    assert.doesNotMatch(source, /instanceof Promise/u);
  }

  for (const file of [
    'src/entry/arena-v2-local-match-keyboard-driver-candidate-v1.ts',
    'src/entry/arena-v2-local-match-pointer-driver-candidate-v1.ts',
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /assertSynchronousReturn\(result, name\)/u);
    assert.match(source, /sharedSynchronousReturnBoundaryWired: true/u);
    assert.doesNotMatch(source, /const NATIVE_PROMISE_THEN = Promise\.prototype\.then/u);
    assert.doesNotMatch(source, /function rejectAsync\(/u);
  }

  const synchronousStorage = readFileSync(
    'packages/arena-contracts/src/synchronous-storage-port.ts',
    'utf8',
  );
  assert.match(
    synchronousStorage,
    /import \{ assertSynchronousReturn \} from '\.\/synchronous-return-boundary\.js'/u,
  );
  assert.match(synchronousStorage, /assertSynchronousReturn\(value, name\)/u);
  assert.doesNotMatch(synchronousStorage, /thenMethod\.call|instanceof Promise/u);

  const preloader = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-asset-preloader-candidate-v1.ts',
    'utf8',
  );
  const vfx = readFileSync('src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts', 'utf8');
  const audio = readFileSync('src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts', 'utf8');
  const host = readFileSync('src/entry/arena-v2-formal-web-match-host-candidate-v1.ts', 'utf8');
  assert.match(preloader, /lateLoadFailureCannotRefailClosedOwner: true/u);
  assert.match(vfx, /lateLoadFailureCannotRefailClosedOwner: true/u);
  assert.match(audio, /lateLoadOrActivationCannotRefailClosedOwner: true/u);
  assert.match(host, /lateAssetPreparationCannotRefailClosedHost: true/u);
});
