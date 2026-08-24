import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  P6_PERMANENT_COMBAT_VALUE_PATTERN,
  P6_RENDERER_NEUTRAL_AUTHORITY_FILES,
  P6_RENDERER_NEUTRAL_FORBIDDEN_PATTERNS,
} from '../../scripts/governance/check-p6-candidate-boundaries.js';

const PRODUCTION_ROOTS = Object.freeze([
  'src/entry',
  'packages/arena-v1-composition/src',
  'packages/arena-v1-application-launch/src',
  'packages/arena-v1-application-session/src',
  'packages/arena-product-presentation-three/src',
  'packages/arena-product-v1-content/src',
  'packages/arena-release/src',
]);
const REACHABILITY = /arena-v2-(?:product-authority-registry|learning-profile|learning-grant|replay-learning|next-learning|learning-capacity|learning-evidence|learning-information|learning-settlement|learning-terminal|mode-learning-session|retention-observation)[^'"\s]*\.js|product-result-(?:replay-settlement-evidence-v1|runtime-settlement-evidence-v[23])\.js|ProductResult(?:ReplaySettlementEvidenceV1|RuntimeSettlementEvidenceV[23])|ArenaV2ProductAuthorityRegistryCandidateV1|ARENA_V2_(?:PRODUCT_AUTHORITY|LEARNING_(?:PROFILE|SETTLEMENT|EVIDENCE|TERMINAL)|MODE_LEARNING_SESSION|RETENTION_OBSERVATION).*CANDIDATE/u;

function files(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...files(candidate));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(candidate);
  }
  return result;
}

test('P6 renderer-neutral authority candidates share the governance boundary catalog', () => {
  assert.equal(
    new Set(P6_RENDERER_NEUTRAL_AUTHORITY_FILES).size,
    P6_RENDERER_NEUTRAL_AUTHORITY_FILES.length,
    'P6 renderer-neutral authority catalog must not contain duplicates',
  );
  for (const relative of P6_RENDERER_NEUTRAL_AUTHORITY_FILES) {
    assert.match(
      relative,
      /^packages\/(?:arena-product-match|arena-profile-contracts|arena-product-progression|arena-product-composition)\/src\//u,
      `${relative}不属于P6 renderer-neutral合同写域。`,
    );
    const source = readFileSync(relative, 'utf8');
    for (const [label, pattern] of P6_RENDERER_NEUTRAL_FORBIDDEN_PATTERNS) {
      assert.doesNotMatch(source, pattern, `${relative}包含禁止的${label}。`);
    }
    assert.doesNotMatch(
      source,
      P6_PERMANENT_COMBAT_VALUE_PATTERN,
      `${relative}不得把永久战斗数值写入学习档案。`,
    );
  }
});

test('P6 learning candidates remain unreachable from production entry and release paths', () => {
  for (const root of PRODUCTION_ROOTS) {
    for (const file of files(root)) {
      assert.doesNotMatch(readFileSync(file, 'utf8'), REACHABILITY, `${file}提前接入P6。`);
    }
  }
  for (const file of [
    'packages/arena-product-composition/src/product-session-composition.ts',
    'packages/arena-product-composition/src/mode-product-session-composition-v2.ts',
  ]) assert.doesNotMatch(readFileSync(file, 'utf8'), REACHABILITY, `${file}提前接入P6。`);
});

test('P6 candidate metadata keeps all default wiring and hard gates closed', () => {
  const profile = readFileSync(
    'packages/arena-product-content/src/arena-v2-learning-profile-definition-candidate-v1.ts',
    'utf8',
  );
  assert.match(profile, /status: 'production-unreachable'/);
  assert.match(profile, /hardGate: false/);
  assert.match(profile, /defaultProfileServiceWired: false/);
  const settlement = readFileSync(
    'packages/arena-product-composition/src/arena-v2-learning-settlement-candidate-v1.ts',
    'utf8',
  );
  assert.match(settlement, /defaultSessionWired: false/);
  const settlementRecoveryOwner = readFileSync(
    'packages/arena-product-composition/src/arena-v2-learning-settlement-recovery-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(settlementRecoveryOwner, /status: 'production-unreachable'/);
  assert.match(settlementRecoveryOwner, /hardGate: false/);
  assert.match(settlementRecoveryOwner, /defaultCompositionWired: false/);
  assert.match(settlementRecoveryOwner, /defaultEntryWired: false/);
  assert.match(settlementRecoveryOwner, /profileWritesDuringRecovery: 0/);
  const terminalHandoff = readFileSync(
    'packages/arena-product-composition/src/arena-v2-learning-terminal-handoff-candidate-v1.ts',
    'utf8',
  );
  assert.match(terminalHandoff, /defaultSessionWired: false/);
  const modeLearningFactory = readFileSync(
    'packages/arena-product-composition/src/arena-v2-mode-learning-session-factory-candidate-v1.ts',
    'utf8',
  );
  assert.match(modeLearningFactory, /defaultCompositionWired: false/);
  assert.match(modeLearningFactory, /defaultNavigationWired: false/);
  const quickMatchBundleFactory = readFileSync(
    'packages/arena-product-composition/src/arena-v2-quick-match-bundle-factory-candidate-v1.ts',
    'utf8',
  );
  assert.match(quickMatchBundleFactory, /defaultCompositionWired: false/);
  assert.match(quickMatchBundleFactory, /defaultNavigationWired: false/);
  assert.match(quickMatchBundleFactory, /assertSynchronousReturn\(value, name\)/u);
  assert.match(quickMatchBundleFactory, /sharedSynchronousReturnBoundaryWired: true/u);
  assert.match(
    quickMatchBundleFactory,
    /returnedRawSessionOwnedBeforeDestroyPortCapture: true/u,
  );
  assert.match(
    quickMatchBundleFactory,
    /invalidDestroyPortRetainsRawSessionCleanupOwnership: true/u,
  );
  assert.match(
    quickMatchBundleFactory,
    /function destroyOwnedSession\(owned: OwnedSession, name: string\): void/u,
  );
  assert.doesNotMatch(
    quickMatchBundleFactory,
    /const NATIVE_PROMISE_THEN = Promise\.prototype\.then/u,
  );
});

test('P6.393 rejects movement-fall attack context before effective weapon learning', () => {
  const source = readFileSync(
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
    'utf8',
  );
  const guard = source.indexOf('Replay Learning movement-fall不能携带攻击上下文。');
  const effectiveLearningCommit = source.indexOf(
    'effectiveWeapons.add(binding.weaponDefinitionId)',
  );
  assert.ok(guard > 0);
  assert.ok(effectiveLearningCommit > guard);
  const guardedBranch = source.slice(guard - 300, guard);
  assert.match(guardedBranch, /event\.attackerId !== null/u);
  assert.match(guardedBranch, /event\.actionDefinitionId !== null/u);
  assert.match(guardedBranch, /event\.actionStartedTick !== null/u);
});

test('P6.394 rejects Survival equipment actions outside active lifecycle before usage rebuild while preserving delayed feedback', () => {
  const replayLearning = readFileSync(
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
    'utf8',
  );
  const eligibilityGuard = replayLearning.indexOf(
    'assertArenaV6SurvivalEquipmentActionEligibilityV1({',
  );
  const usageRebuild = replayLearning.indexOf('const rebuiltUsage = createParticipantEquipmentUsageV3FromEvents({');
  const effectiveCommit = replayLearning.indexOf('effectiveWeapons.add(binding.weaponDefinitionId)');
  assert.ok(eligibilityGuard > 0);
  assert.ok(usageRebuild > eligibilityGuard);
  assert.ok(effectiveCommit > eligibilityGuard);

  const eligibility = readFileSync(
    'packages/arena-contracts/src/survival-equipment-action-eligibility-v1.ts',
    'utf8',
  );
  assert.match(eligibility, /Survival equipment ActionStarted不能来自非active参与者。/u);
  assert.match(eligibility, /does not judge delayed feedback/u);
});

test('P6.396 keeps Duel/Race weapon learning behind active-life eligibility', () => {
  const replayLearning = readFileSync(
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
    'utf8',
  );
  const eligibilityGuard = replayLearning.indexOf(
    'assertArenaV6CompetitiveEquipmentActionEligibilityV1({',
  );
  const effectiveCommit = replayLearning.indexOf('effectiveWeapons.add(binding.weaponDefinitionId)');
  assert.ok(eligibilityGuard > 0 && effectiveCommit > eligibilityGuard);

  const eligibility = readFileSync(
    'packages/arena-contracts/src/competitive-equipment-action-eligibility-v1.ts',
    'utf8',
  );
  assert.match(eligibility, /Competitive equipment ActionStarted不能来自非active参与者。/u);
  assert.match(eligibility, /does not re-evaluate hit outcomes/u);
});

test('P6.397 rejects impossible evaded-plus-hit learning evidence', () => {
  const replayLearning = readFileSync(
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
    'utf8',
  );
  const consistencyGuard = replayLearning.indexOf(
    'assertArenaV6ActionFeedbackOutcomeConsistencyV1(events);',
  );
  const effectiveCommit = replayLearning.indexOf('effectiveWeapons.add(binding.weaponDefinitionId)');
  assert.ok(consistencyGuard > 0 && effectiveCommit > consistencyGuard);

  const consistency = readFileSync(
    'packages/arena-contracts/src/action-feedback-outcome-consistency-v1.ts',
    'utf8',
  );
  assert.match(consistency, /attack-evaded不能重复或与命中结果共存/u);
  assert.match(consistency, /delayed hit outcomes stay legal/u);
});

test('P6.398 formal Learning bridge consumes complete supply-bound Runtime V3 evidence', () => {
  const bridge = readFileSync(
    'packages/arena-product-composition/src/arena-v2-learning-mode-session-bridge-candidate-v1.ts',
    'utf8',
  );
  const readEvidence = bridge.indexOf('this.#session.getTerminalRuntimeEvidenceV2');
  const bindEvidence = bridge.indexOf('this.#learningHandoff.bindRuntimeTerminalEvidenceV3');
  const prepareGrant = bridge.indexOf('this.#learningHandoff.prepareBound');
  const prepareReward = bridge.indexOf('this.#session.prepareReward');
  assert.ok(readEvidence > 0 && bindEvidence > readEvidence);
  assert.ok(prepareGrant > bindEvidence && prepareReward > prepareGrant);
  assert.match(bridge, /requiresCompleteSupplyOwnershipBindingBeforeReward: true/u);

  const handoff = readFileSync(
    'packages/arena-product-composition/src/arena-v2-learning-terminal-handoff-candidate-v1.ts',
    'utf8',
  );
  assert.match(handoff, /createProductResultRuntimeSettlementEvidenceV3/u);
  assert.match(handoff, /createRegisteredSettlementEvidenceV3/u);
  assert.match(handoff, /prepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV3/u);
});

test('P6 weapon selection readability reuses milestones before availability copy', () => {
  const projection = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-weapon-collection-research-selection-projection-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'projectArenaV2WeaponCollectionResearchMilestoneV1',
    'projectArenaV2WeaponCollectionResearchSelectionCandidateV1',
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'defaultSurfaceWired: false',
    'mutatesProfile: false',
    'readsRegistry: false',
    'addsSelectionFields: false',
  ]) assert.equal(projection.includes(marker), true, `P6武器卡投影缺少${marker}`);
  assert.doesNotMatch(projection, /Math\.random|Date\.now|performance\.now|document\.|window\./u);

  const host = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  const resultRouteFit = readFileSync(
    'packages/arena-product-progression/src/arena-v2-result-next-goal-route-fit-v1.ts',
    'utf8',
  );
  for (const marker of [
    'freezesEligibleWeaponScopeForNavigation: true',
    'nullEligibleWeaponScopeMeansFullDefinition: true',
    'eligibleWeaponDefinitionIds: normalizedEligibleWeaponDefinitionIds',
  ]) assert.match(resultRouteFit, new RegExp(marker, 'u'));
  const weaponBranch = host.slice(
    host.indexOf("if (screenId === 'weapon-index')"),
    host.indexOf("const firstMap = collectionContent.maps[0]"),
  );
  const baseSelection = weaponBranch.indexOf('const selection = Object.freeze({');
  const researchProjection = weaponBranch.indexOf(
    'projectArenaV2WeaponCollectionResearchSelectionCandidateV1({',
  );
  const availabilityProjection = weaponBranch.indexOf(
    'projectArenaV2WeaponAvailabilityInformationSelectionCandidateV1({',
  );
  assert.equal(baseSelection !== -1 && baseSelection < researchProjection, true);
  assert.equal(researchProjection < availabilityProjection, true);
  assert.match(
    weaponBranch,
    /weaponResearchFacts: Object\.freeze\(collectionProgress\.weapons\.map/u,
  );
  for (const key of [
    'weaponDefinitionId',
    'collectionEvidenceCount',
    'collectionEvidenceTarget',
    'collected',
  ]) assert.match(weaponBranch, new RegExp(`\\b${key}: weapon\\.${key}\\b`, 'u'));
  assert.match(weaponBranch, /selection: researchSelection/u);
  assert.match(
    host,
    /informationCollectionSelectionUsesSingleProfileRegistryReadSnapshot: true/u,
  );
  assert.match(
    host,
    /informationCollectionReadBundlesSelectionContentProfileAndRegistry: true/u,
  );
  assert.match(
    host,
    /resultNextGoalNavigationUsesFrozenRouteFitWeaponScope: true/u,
  );
  assert.match(
    host,
    /homeContinuationNavigationUsesFrozenGoalWeaponScope: true/u,
  );
  assert.match(
    host,
    /informationPageProjectionReusesSingleRewardAndLearningProfileReads: true/u,
  );
  assert.match(
    host,
    /informationPipelineSelectionReusesPageProjectionReadBundle: true/u,
  );
  assert.match(
    host,
    /informationPipelineDetailBrowseReusesPageProjectionReadBundle: true/u,
  );
  assert.match(
    host,
    /informationPipelineCarriesPageRecoveryAndNextGoalRead: true/u,
  );
  assert.match(
    host,
    /informationPipelineCarriesResultRecommendationsFromPageRead: true/u,
  );
  assert.match(
    host,
    /resultNextGoalClickUsesSingleSettlementAndLearningRead: true/u,
  );
  assert.match(
    host,
    /resultReadConsumersAvoidSettlementExistencePreflightReread: true/u,
  );
  assert.match(
    host,
    /informationPageProjectionCarriesSingleLearningSettlementRead: true/u,
  );
  assert.match(
    host,
    /informationPageProjectionUsesAggregateRecoveryOwnerSnapshot: true/u,
  );
  assert.match(
    host,
    /informationCompositionReusesInitialModeSessionStateRead: true/u,
  );
  assert.match(
    host,
    /modeContentContinuationPreparationReusesPageLearningRead: true/u,
  );
  assert.match(
    host,
    /informationNavigationSelectionReadAvoidsProfileProjection: true/u,
  );
  assert.match(
    host,
    /primaryIntentReusesSingleLearningSettlementAndRouteFitRead: true/u,
  );
  assert.match(
    host,
    /diagnosticSnapshotReusesCurrentScreenPageProjectionRead: true/u,
  );
  assert.match(
    host,
    /informationInteractionGateReadSharesInformationAndRecoverySnapshot: true/u,
  );
  assert.match(
    host,
    /informationPageProjectionAvoidsNestedHostGuardReads: true/u,
  );
  assert.match(
    host,
    /informationPageProjectionUsesGuardFreeProfileAndRegistryReads: true/u,
  );
  assert.match(
    host,
    /settlementRecoveryRetryReusesSingleInformationSnapshot: true/u,
  );
  assert.match(
    host,
    /standaloneInformationProjectionsUseSingleOuterHostGuard: true/u,
  );
  assert.match(
    host,
    /highFrequencyInformationConsumersReuseOuterHostGuard: true/u,
  );
  assert.match(
    host,
    /continuationDriftCallersReuseOuterHostGuard: true/u,
  );
  assert.match(host, /bottomNavigationReusesSingleWritableHost: true/u);
  assert.match(host, /primaryIntentReusesSingleWritableHost: true/u);
  assert.match(host, /diagnosticSnapshotReusesSingleHostAndInformationRead: true/u);
  assert.match(host, /detailBrowseReusesOuterHostRegistryRead: true/u);
  assert.match(host, /nextGoalReadsReuseSingleLearningAndRegistrySnapshot: true/u);
  assert.match(
    host,
    /weaponSelectionReusesOuterHostAndDeadProfileReadWrappersRemoved: true/u,
  );
  assert.doesNotMatch(
    host,
    /#learningProfileSnapshotForRead\(\):|#rewardProfileSnapshotForRead\(\):/u,
  );
  const weaponSelection = host.slice(
    host.indexOf('  selectInformationWeapon(value: unknown): void {'),
    host.indexOf('\n  selectInformationMap(value: unknown): void {'),
  );
  assert.match(weaponSelection, /#activeRegistryBindingFromCurrentOwner\(\)/u);
  assert.doesNotMatch(weaponSelection, /#activeRegistryBinding\(\)/u);
  const homeNextGoalRead = host.slice(
    host.indexOf('  getInformationHomeNextGoalContinuationRouteRead('),
    host.indexOf('\n  getMatchInputContext():'),
  );
  const nextGoalRead = host.slice(
    host.indexOf('  getInformationNextLearningGoalRead('),
    host.indexOf('\n  getInformationLearningProfileRead('),
  );
  for (const read of [homeNextGoalRead, nextGoalRead]) {
    assert.equal(
      read.match(/#informationLearningProfileReadFromCurrentOwners\(\)/gu)?.length,
      1,
    );
    assert.doesNotMatch(
      read,
      /#activeRegistryBinding\(\)|#learningProfileSnapshotForRead\(\)/u,
    );
  }
  const detailBrowse = host.slice(
    host.indexOf('  getInformationCurrentDetailBrowseProjection('),
    host.indexOf('\n  #projectInformationCurrentDetailBrowseFromRead('),
  );
  assert.match(detailBrowse, /this\.#activeRegistryBindingFromCurrentOwner\(\)/u);
  assert.doesNotMatch(detailBrowse, /this\.#activeRegistryBinding\(\)/u);
  const bottomNavigation = host.slice(
    host.indexOf('  openBottomNavigation(value: unknown): unknown {',
      host.indexOf('export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1'),
    ),
    host.indexOf('\n  selectInformationMode(value: unknown): void {'),
  );
  assert.equal(bottomNavigation.match(/this\.#host\(\)/gu)?.length, 1);
  assert.match(bottomNavigation, /const host = this\.#host\(\)/u);
  assert.match(bottomNavigation, /host\.openBottomNavigation\(value\)/u);
  const settlementRecoveryRetry = host.slice(
    host.indexOf('  retryLearningSettlementProjectionRecovery():'),
    host.indexOf('\n  updatePreferences(value: unknown): void',
      host.indexOf('  retryLearningSettlementProjectionRecovery():'),
    ),
  );
  assert.equal(settlementRecoveryRetry.match(/host\.getInformationSnapshot\(\)/gu)?.length, 1);
  assert.match(settlementRecoveryRetry, /information\.modeSessionState/u);
  assert.doesNotMatch(settlementRecoveryRetry, /this\.getLearningSettlementRecoveryRead\(\)/u);
  const interactionGateRead = host.slice(
    host.indexOf('  getInformationInteractionGateRead('),
    host.indexOf('\n  getInformationNavigationSelectionRead('),
  );
  assert.equal(interactionGateRead.match(/getInformationSnapshot\(\)/gu)?.length, 1);
  assert.equal(interactionGateRead.match(/getRead\(\)/gu)?.length, 1);
  assert.match(interactionGateRead, /information\.modeSessionState/u);
  const navigationSelectionRead = host.slice(
    host.indexOf('  getInformationNavigationSelectionRead('),
    host.indexOf('\n  getInformationHomeNextGoalContinuationRouteRead('),
  );
  assert.match(navigationSelectionRead, /selectedModeKind: this\.#selectedModeKind/u);
  assert.match(
    navigationSelectionRead,
    /selectedWeaponDefinitionId: this\.#selectedWeaponDefinitionId/u,
  );
  assert.doesNotMatch(navigationSelectionRead, /ProfileProjection|ProfileSnapshot|Registry/u);
  const dispatchPrimaryIntent = host.slice(
    host.lastIndexOf('  dispatchPrimaryIntent(value: unknown): unknown {'),
    host.indexOf('\n  openBottomNavigation(value: unknown): unknown {'),
  );
  assert.equal(dispatchPrimaryIntent.match(/this\.#host\(\)/gu)?.length, 1);
  assert.match(dispatchPrimaryIntent, /const host = this\.#host\(\)/u);
  assert.match(dispatchPrimaryIntent, /host\.dispatchPrimaryIntent\(navigationIntent\)/u);
  assert.equal(
    dispatchPrimaryIntent.match(/#informationLearningProfileReadFromCurrentOwners\(\)/gu)
      ?.length,
    1,
  );
  assert.doesNotMatch(dispatchPrimaryIntent, /getInformationLearningProfileRead\(\)/u);
  assert.equal(dispatchPrimaryIntent.match(/getSettlement\(\)/gu)?.length, 1);
  assert.equal(
    dispatchPrimaryIntent.match(/#resultNextGoalRouteFitFromRead\(/gu)?.length,
    1,
  );
  assert.match(
    dispatchPrimaryIntent,
    /#nextLearningGoalContinuationRouteReadFromLearningRead\(readClickLearning\(\)\)/u,
  );
  assert.match(
    dispatchPrimaryIntent,
    /#continuationPreparationGoalDriftedFromRead\(/u,
  );
  assert.doesNotMatch(dispatchPrimaryIntent, /#resultNextGoalRouteFit\(\)/u);
  const diagnosticSnapshot = host.slice(
    host.lastIndexOf('  getSnapshot(): unknown {'),
    host.indexOf('\n  destroy(): void {', host.lastIndexOf('  getSnapshot(): unknown {')),
  );
  assert.match(
    diagnosticSnapshot,
    /#informationCurrentScreenCompositionBundleFromInformation\(\{\}, information\)/u,
  );
  assert.match(
    diagnosticSnapshot,
    /informationPageProjections\.profileReads\.learningSettlementRecovery/u,
  );
  assert.doesNotMatch(
    diagnosticSnapshot,
    /getInformationProfileProjection\(|getInformationProfileProjections\(|getInformationCurrentScreenComposition\(|getInformationPageProjections\(|getInformationPresentationPreferencesRead\(|getLearningSettlementRecoveryRead\(|#activeRegistryBinding\(\)/u,
  );
  assert.equal(diagnosticSnapshot.match(/this\.#readHost\(\)/gu)?.length, 1);
  assert.equal(diagnosticSnapshot.match(/host\.getInformationSnapshot\(\)/gu)?.length, 1);
  assert.match(diagnosticSnapshot, /host\.getSnapshot\(\)/u);
  assert.match(diagnosticSnapshot, /host\.getPreferencesRead\(\)/u);
  assert.doesNotMatch(
    dispatchPrimaryIntent,
    /getSettlement\(\) !== null[\s\S]*#resultNextGoalRouteFit\(\)/u,
  );
  const collectionSelectionBranch = host.slice(
    host.indexOf('  getInformationCurrentScreenSelectionProjection('),
    host.indexOf('\n  getSnapshot(): unknown'),
  );
  assert.equal(
    collectionSelectionBranch.match(
      /this\.#informationPageProjectionsFromModeSessionState\(/gu,
    )?.length,
    1,
  );
  assert.match(collectionSelectionBranch, /information\.modeSessionState/u);
  assert.doesNotMatch(
    collectionSelectionBranch,
    /this\.getInformationPageProjections\(value\)/u,
  );
  assert.doesNotMatch(
    collectionSelectionBranch,
    /this\.getInformationCollectionRead\(\)/u,
  );
  assert.doesNotMatch(
    collectionSelectionBranch,
    /this\.getInformationLearningProfileRead\(\)/u,
  );
  assert.doesNotMatch(collectionSelectionBranch, /this\.#activeRegistryBinding\(\)/u);
  const pageProjectionBranch = host.slice(
    host.indexOf('  getInformationPageProjections('),
    host.indexOf('\n  #informationCurrentScreenCompositionBundle('),
  );
  assert.equal(pageProjectionBranch.match(/getSnapshot\(\)/gu)?.length, 1);
  assert.doesNotMatch(pageProjectionBranch, /getSettlement\(\)/u);
  assert.match(pageProjectionBranch, /learningSettlement,/u);
  assert.match(pageProjectionBranch, /learningSettlementRecovery,/u);
  const currentCompositionBranch = host.slice(
    host.indexOf('  #informationCurrentScreenCompositionBundle('),
    host.indexOf('\n  getInformationCurrentScreenComposition('),
  );
  assert.match(
    currentCompositionBranch,
    /const settledLearning = pages\.profileReads\.learningSettlement/u,
  );
  assert.match(
    currentCompositionBranch,
    /const settlementRecovery = pages\.profileReads\.learningSettlementRecovery/u,
  );
  assert.match(
    currentCompositionBranch,
    /#informationPageProjectionsFromModeSessionState\([\s\S]*information\.modeSessionState/u,
  );
  assert.doesNotMatch(
    currentCompositionBranch,
    /this\.getInformationPageProjections\(value\)/u,
  );
  assert.doesNotMatch(currentCompositionBranch, /learningSettlementRecoveryOwner\.getSettlement/u);
  const resultRecommendationBranch = host.slice(
    host.indexOf('  getInformationResultPrimaryRecommendation():'),
    host.indexOf('\n  #createRetentionObservation('),
  );
  assert.equal(resultRecommendationBranch.match(/const settlement =/gu)?.length, 2);
  assert.equal(
    resultRecommendationBranch.match(/#resultNextGoalRouteFitFromRead\(/gu)?.length,
    2,
  );
  assert.doesNotMatch(resultRecommendationBranch, /this\.#resultNextGoalRouteFit\(\)/u);
  assert.match(resultRecommendationBranch, /routeFit\.eligibleWeaponDefinitionIds/u);
  assert.doesNotMatch(resultRecommendationBranch, /this\.#activeRegistryBinding\(\)/u);
  const homeContinuationNavigation = host.slice(
    host.indexOf('  #resolveHomeNextGoalContinuationNavigationRoute('),
    host.indexOf('\n  #assertRenderedHomeContinuationRouteIdentity('),
  );
  assert.match(homeContinuationNavigation, /eligibleWeaponDefinitionIds\.includes\(/u);
  assert.doesNotMatch(homeContinuationNavigation, /this\.#activeRegistryBinding\(\)/u);
  const pageProjection = host.slice(
    host.indexOf('  getInformationPageProjections('),
    host.indexOf('\n  #informationCurrentScreenCompositionBundle('),
  );
  assert.equal(
    pageProjection.match(/this\.#rewardProfileSnapshotFromCurrentOwner\(\)/gu)?.length,
    1,
  );
  assert.equal(
    pageProjection.match(/this\.#informationLearningProfileReadFromCurrentOwners\(\)/gu)
      ?.length,
    1,
  );
  assert.doesNotMatch(
    pageProjection,
    /this\.#rewardProfileSnapshotForRead\(\)|this\.getInformationLearningProfileRead\(\)/u,
  );
  assert.doesNotMatch(pageProjection, /this\.getInformationModeContentProjection\(\)/u);
  assert.doesNotMatch(pageProjection, /this\.getInformationProfileProjections\(value\)/u);
  assert.match(
    pageProjection,
    /this\.#projectInformationProductSessionFromCurrentRead\(\)/u,
  );
  assert.match(pageProjection, /this\.#projectInformationLoadingFromCurrentRead\(\)/u);
  assert.doesNotMatch(
    pageProjection,
    /this\.getInformationProductSessionProjection\(\)|this\.getInformationLoadingProjection\(\)/u,
  );
  const modeContentProjection = host.slice(
    host.indexOf('  #projectInformationModeContentFromProfileReads('),
    host.indexOf('\n  getInformationLoadingProjection():'),
  );
  assert.match(
    modeContentProjection,
    /#continuationPreparationReadFromLearningRead\([\s\S]*learningRead,[\s\S]*learningSettlement/u,
  );
  assert.doesNotMatch(modeContentProjection, /#continuationPreparationRead\(\)/u);
  const continuationGoalDrift = host.slice(
    host.indexOf('  #continuationPreparationGoalDriftedFromCurrentOwners(): boolean {'),
    host.indexOf('\n  #clearContinuationPreparationIfGoalDrifted(): void {'),
  );
  assert.equal(
    continuationGoalDrift.match(/#informationLearningProfileReadFromCurrentOwners\(\)/gu)
      ?.length,
    1,
  );
  assert.doesNotMatch(continuationGoalDrift, /getInformationLearningProfileRead\(\)/u);
  assert.equal(continuationGoalDrift.match(/getSettlement\(\)/gu)?.length, 1);
  assert.match(continuationGoalDrift, /accepted === null && detail === null/u);
  const currentComposition = host.slice(
    host.indexOf('  #informationCurrentScreenCompositionBundle('),
    host.indexOf('\n  getInformationCurrentScreenComposition('),
  );
  assert.match(currentComposition, /pages\.profileReads\.learning\.profile/u);
  assert.doesNotMatch(currentComposition, /this\.#learningProfileSnapshotForRead\(\)/u);
  const currentPipeline = host.slice(
    host.indexOf('  getInformationCurrentScreenPipelineBundle('),
    host.indexOf('\n  getInformationCurrentDetailBrowseProjection('),
  );
  assert.match(currentPipeline, /const selection = compositionBundle\.selection;/u);
  assert.doesNotMatch(
    currentPipeline,
    /this\.getInformationCurrentScreenSelectionProjection\(value\)/u,
  );
  assert.match(currentPipeline, /const returnScreenId = compositionBundle\.returnScreenId;/u);
  assert.match(currentPipeline, /compositionBundle\.detailBrowseProjection/u);
  assert.doesNotMatch(
    currentPipeline,
    /this\.getInformationCurrentDetailBrowseProjection\(\)/u,
  );
  assert.doesNotMatch(currentPipeline, /this\.#readHost\(\)\.getInformationSnapshot\(\)/u);
});

test('P6 competitive repeatable challenge reuses validated mode records without inventing a step', () => {
  const projection = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-competitive-repeatable-challenge-information-projection-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1',
    'ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1',
    'ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz',
    "targetScreenId: 'match-prep'",
    "targetOwnerId: 'p5-mode-content'",
    "improvementStepPolicy: 'no-formal-step-do-not-invent-exact-tick'",
    'fieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    'hardGate: false',
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
  ]) assert.equal(projection.includes(marker), true, `P6竞技重复挑战投影缺少${marker}`);
  assert.doesNotMatch(
    projection,
    /Math\.random|Date\.now|performance\.now|document\.|window\.|setTimeout|setInterval/u,
  );

  const host = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  const start = host.indexOf('getInformationModeContentProjection():');
  const end = host.indexOf('getInformationLoadingProjection():', start);
  const branch = host.slice(start, end);
  for (const marker of [
    'const learningProfile = learningRead.profile',
    "if (selectedModeKind === 'survival') return focusedProjection",
    "modeDefinitions.find(({ kind }) => kind === selectedModeKind)",
    "modeRecords.find(({ kind }) => kind === selectedModeKind)",
    'projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1({',
    'bestPerformanceTicks: modeRecord?.bestPerformanceTicks ?? null',
  ]) assert.equal(branch.includes(marker), true, `P6竞技重复挑战Host接线缺少${marker}`);
  assert.equal(
    branch.match(/this\.#informationLearningProfileReadFromCurrentOwners\(\)/gu)?.length,
    1,
    'P6竞技重复挑战必须复用同一份外层受保护Learning Profile读取。',
  );
});

test('P6 catalog terminal remains actionable across collection and mode selection without a second resolver', () => {
  const modeProjection = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-mastery-selection-information-projection-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'nextGoal: ArenaV2NextLearningGoalV1',
    'const resolvedNextGoal = nextGoalFact(source.nextGoal)',
    '学习目录已完成·${resolvedNextGoal.actionLabel}',
    'PERSONAL_RECORD_TARGET_LABELS',
    'catalogCompletePersonalRecordTargetsWired: true',
    'terminalRecordOrderFromValidatedSummary: true',
    'activeLearningCompletionDoesNotClaimFullCatalogTerminal: true',
    "terminalSource: 'validated-next-learning-goal-fact'",
    'catalogCompleteFreeChallengeCopyWired: true',
    'duplicatesNextGoalResolution: false',
    'catalogCompletionAlgorithmCopied: false',
  ]) assert.equal(modeProjection.includes(marker), true, `P6模式终态投影缺少${marker}`);
  assert.doesNotMatch(modeProjection, /completePair\(|weaponMainResearchProgress !==/u);

  const host = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(host, /nextGoal: pages\.profiles\.learning\.nextGoal/u);
  assert.doesNotMatch(host, /nextGoalKind: pages\.profiles\.learning\.nextGoal\.kind/u);

  const homeNextLearningSignature = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-home-next-learning-signature-information-projection-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1',
    "goalKind === 'catalog-complete'",
    "scopeCompletionIdentitySource: 'p6-next-goal-continuation-route'",
    'scopeCompletionUsesStableGoalIds: true',
    'unknownFreeChoiceGoalRejected: true',
    'duplicatesScopeCompletionResolution: false',
  ]) assert.equal(
    homeNextLearningSignature.includes(marker),
    true,
    `P6首页终态续玩身份闭包缺少${marker}`,
  );

  const collection = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-collection-next-goal-first-screen-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    "category === 'mode' || category === 'complete'",
    'weaponMainResearchProgress: number',
    'weaponMainResearchTarget: 2_400',
    'progressFact.weaponMainResearchProgress !== progressFact.weaponMainResearchTarget',
    'nextGoal.goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1',
    'catalogCompletePrimaryActionWired: true',
    "catalogCompletePrimaryActionTarget: 'existing-mode-select'",
  ]) assert.equal(collection.includes(marker), true, `P6收藏终态动作缺少${marker}`);
  assert.doesNotMatch(collection, /sourceState === 'ready' && category !== 'complete'/u);

  const nextGoal = readFileSync(
    'packages/arena-product-progression/src/arena-v2-next-learning-goal-v1.ts',
    'utf8',
  );
  for (const marker of [
    'function incompleteCollectedWeaponResearchGoal(',
    'function hasIncompleteLearningOutsideEligibleWeaponScope(',
    'profile.collections.weaponDefinitionIds.includes(candidate)',
    'return currentProgress < targetProgress',
    '?? incompleteCollectedWeaponResearchGoal(definition, profile, eligibleWeapons)',
    'ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1',
    'activeLearningScopeIsPartial',
    'ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1',
    'ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1',
    '? ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1',
    ': ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1',
  ]) assert.equal(nextGoal.includes(marker), true, `P6已拥有武器主研究续接缺少${marker}`);

  const resultRouteFit = readFileSync(
    'packages/arena-product-progression/src/arena-v2-result-next-goal-route-fit-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1',
    'ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1',
    'const fullCatalogComplete =',
    'const activeLearningComplete =',
    "scopeCompletionIdentitySource: 'unique-next-goal-resolver'",
    'freeChallengeUsesStableScopeCompletionGoalIds: true',
    'duplicatesScopeCompletionResolution: false',
    ': fullCatalogComplete || activeLearningComplete',
  ]) assert.equal(resultRouteFit.includes(marker), true, `P6结果页自由挑战身份闭包缺少${marker}`);
  assert.doesNotMatch(
    resultRouteFit,
    /nextGoal\.kind === 'catalog-complete'\s*\? 'free-challenge'/u,
  );

  const continuationRoute = readFileSync(
    'packages/arena-product-progression/src/'
      + 'arena-v2-next-learning-goal-continuation-route-v1.ts',
    'utf8',
  );
  for (const marker of [
    'function scopeCompletionIdentity(',
    'const scopeCompletion = scopeCompletionIdentity(goalId)',
    'return Object.freeze({',
    'const { nextGoal, scopeCompletion } = validatedGoal',
    "freeChoiceUsesStableScopeCompletionGoalIds: true",
    'freeChoiceDoesNotUseCatalogKindAlone: true',
    'scopeCompletionIdentityDerivedOnce: true',
  ]) assert.equal(
    continuationRoute.includes(marker),
    true,
    `P6续玩路由范围完成身份闭包缺少${marker}`,
  );
  assert.equal(
    continuationRoute.match(/scopeCompletionIdentity\(/gu)?.length,
    2,
    'P6续玩路由必须仅保留一个身份函数声明和一个调用点。',
  );
  assert.doesNotMatch(
    continuationRoute,
    /scopeCompletionIdentity\(nextGoal\.goalId\)|const recommendedMode = nextGoal\.kind === 'catalog-complete'/u,
  );

  const preparationGoalFit = readFileSync(
    'packages/arena-product-presentation/src/'
      + 'arena-v2-preparation-learning-focus-information-projection-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1',
    'ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1',
    'const fullCatalogComplete =',
    'const activeLearningComplete =',
    "scopeCompletionIdentitySource: 'result-next-goal-route-fit'",
    'freeChallengeUsesStableScopeCompletionGoalIds: true',
    'nonFreeChallengeCannotClaimScopeCompletionGoalId: true',
    'duplicatesScopeCompletionResolution: false',
    "implementationStatus: 'code-written-not-run'",
  ]) assert.equal(
    preparationGoalFit.includes(marker),
    true,
    `P6准备页自由挑战身份闭包缺少${marker}`,
  );
  for (const marker of [
    'const preparationGlobalGoalFit = resolveArenaV2ResultNextGoalRouteFitV1({',
    'goalId: preparationGlobalGoalFit.nextGoal.goalId',
    'kind: preparationGlobalGoalFit.kind',
  ]) assert.equal(host.includes(marker), true, `P6准备页Route Fit同源接线缺少${marker}`);

  const learningInformation = readFileSync(
    'packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1',
    'ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1',
    'goal.goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1',
    'goal.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1',
    'scopeCompletionCopyUsesStableGoalIds: true',
    'unknownScopeCompletionCopyRejected: true',
    'nonScopeCompletionCannotClaimStableCompletionGoalId: true',
    'duplicatesScopeCompletionResolution: false',
    "assertLearningLaneGoalSource(weaponGoal, 'weapon')",
    "assertLearningLaneGoalSource(mapGoal, 'map')",
    'laneCompletionGoalIdsFromSingleResolverSource: true',
    'laneCompletionKindAndSourceValidatedBeforeCopy: true',
    'function isAttemptedGlobalScopeCompletionGoal(',
    'attemptReceiptScopeCompletionUsesStableGlobalGoalIds: true',
    'laneOrUnknownCompletionCannotSuppressAttemptReceipt: true',
    'if (isAttemptedGlobalScopeCompletionGoal(goal)) return null',
    'const fullCatalogCompletion = goal.kind ===',
    'const activeLearningCompletion = goal.kind ===',
    'resultGoalHintUsesStableScopeCompletionGoalIds: true',
    'resultGoalHintHasNoImplicitFullCatalogFallback: true',
  ]) assert.equal(
    learningInformation.includes(marker),
    true,
    `P6学习信息范围完成文案身份闭包缺少${marker}`,
  );
  assert.doesNotMatch(
    learningInformation,
    /if \(goal\.kind === 'catalog-complete'\) return '完整收藏目录'/u,
  );
  assert.doesNotMatch(
    learningInformation,
    /goal\.goalId === '(?:weapon|map)-learning-complete'/u,
  );
  assert.doesNotMatch(
    learningInformation,
    /value\.status !== 'committed' \|\| goal\.kind === 'catalog-complete'/u,
  );
  assert.doesNotMatch(learningInformation, /activeLearningCompletion: boolean/u);

  const nextGoalIdentity = readFileSync(
    'packages/arena-product-progression/src/arena-v2-collection-next-goal-identity-projection-v1.ts',
    'utf8',
  );
  for (const marker of [
    "catalogCompleteKindMeaning: 'resolved-learning-scope-complete'",
    'fullCatalogTerminalGoalId: ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1',
    'activeLearningCompletionGoalId: ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1',
  ]) assert.equal(nextGoalIdentity.includes(marker), true, `P6范围完成身份合同缺少${marker}`);

  const collectionProgressInputAdapter = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-profile-collection-progress-input-adapter-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'eligibleWeaponScopeForwardedToUniqueGoalResolver: true',
    'nullEligibleWeaponScopeMeansFullDefinition: true',
    'fullCatalogProgressRemainsVisibleForActiveScope: true',
    "'eligibleWeaponDefinitionIds'",
    ': { eligibleWeaponDefinitionIds: input.eligibleWeaponDefinitionIds }',
    '当前可用武器${weaponDefinitionId}不在P5收藏目录中',
  ]) assert.equal(
    collectionProgressInputAdapter.includes(marker),
    true,
    `P6收藏页active武器范围接力缺少${marker}`,
  );

  const collectionPreviewReadInput = readFileSync(
    'src/entry/arena-v2-collection-preview-read-input-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'readsSelectionContentProfileAndWeaponScopeFromOneHostSnapshot: true',
    'getInformationCollectionRead()',
    'eligibleWeaponDefinitionIds: profileRead.eligibleWeaponDefinitionIds',
  ]) assert.equal(
    collectionPreviewReadInput.includes(marker),
    true,
    `P6收藏入口active武器范围接线缺少${marker}`,
  );

  const milestone = readFileSync(
    'packages/arena-product-progression/src/arena-v2-weapon-collection-research-milestone-projection-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ownershipAndMainResearchStageAreIndependent: true',
    'mainResearchCompletesOnlyAtEvidenceTarget: true',
    "'主研究完成'",
  ]) assert.equal(milestone.includes(marker), true, `P6武器拥有/主研究分轨缺少${marker}`);
});

test('P6 home records reuse validated mode, collection and route facts without a new page', () => {
  const learning = readFileSync(
    'packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts',
    'utf8',
  );
  const presentation = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-home-record-summary-information-projection-candidate-v1.ts',
    'utf8',
  );
  const collectionProgress = readFileSync(
    'packages/arena-product-progression/src/arena-v2-collection-progress-summary-facts-projection-v1.ts',
    'utf8',
  );
  const host = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ARENA_V2_HOME_RECORD_SUMMARY_READ_CONTRACT_V1',
    "source: 'validated-learning-profile-mode-collection-and-route-records'",
    "modeOrder: Object.freeze(['duel', 'race', 'survival'] as const)",
    'homeRecordSummary: recordSummary',
    'recordFieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    'writesProfileAuthorityRewardOrTask: false',
    'ownsNavigationOrFocus: false',
    "weaponGoal.kind === 'collect-weapon'",
    'Learning information武器主研究目标缺少武器身份',
    "nextWeaponMilestone.collected ? '已收藏·' : ''",
    'function scopedGoalCopy(',
    'const nextGoalCopy = scopedGoalCopy(',
    'const weaponGoalCopy = scopedGoalCopy(',
    'const mapGoalCopy = scopedGoalCopy(',
    'visibleAndAccessibilityScopeCompletionDerivedOncePerGoalCopy: true',
    'visibleAndAccessibilityShareNormalizedGoalCopy: true',
    'nextGoal.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1',
    'const mainResearchComplete = record.useCount === target',
    "mainResearchComplete ? '主研究已完成' : practiceContinuation",
  ]) assert.equal(learning.includes(marker), true, `P6首页记录读取缺少${marker}`);
  assert.equal(
    learning.match(/const scopedCatalogCompletion =/gu)?.length,
    1,
    'P6范围完成可见文案与读屏文案必须共用一次身份派生。',
  );
  assert.equal(
    learning.match(/scopedGoalCopy\(/gu)?.length,
    4,
    'P6必须保留一个scopedGoalCopy声明，并分别规范化next/weapon/map三个目标。',
  );
  assert.doesNotMatch(learning, /scopedGoalText|scopedGoalAccessibility/u);
  for (const marker of [
    'projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1',
    "targetScreenId: 'home'",
    "targetFieldId: TARGET_FIELD_ID",
    "focusSource: 'existing-bottom-navigation-records-focus'",
    'recordFieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    "validationStatus: 'not-run'",
  ]) assert.equal(presentation.includes(marker), true, `P6首页记录展示缺少${marker}`);
  for (const marker of [
    "averageMatchMinutesSource: 'arena-v2-learning-capacity-report-v1'",
    'ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1',
  ]) assert.equal(collectionProgress.includes(marker), true, `P6容量共享口径缺少${marker}`);
  assert.match(host, /summary: pages\.profiles\.learning\.homeRecordSummary/u);
  assert.match(host, /recordsBottomNavigationUsesExistingHomeField: true/u);
  assert.doesNotMatch(
    `${learning}\n${presentation}`,
    /Math\.random|Date\.now|performance\.now|document\.|window\.|setTimeout|setInterval/u,
  );
});

test('A6.16-A6.17 collection preview wiring remains explicit, lazy and production unreachable', () => {
  const composition = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(composition, /stage: 'A6\.16'/);
  assert.match(composition, /status: 'production-unreachable'/);
  assert.match(composition, /validationStatus: 'not-run'/);
  assert.match(composition, /hardGate: false/);
  assert.match(composition, /defaultSurfaceWired: false/);
  assert.match(composition, /rendererFactory/);
  assert.match(composition, /constructionRollbackRetainsHostAndRendererCleanupOwnership: true/);
  assert.match(composition, /disposalUsesDependencyOrderedCompletionWatermarks: true/);
  assert.match(composition, /orphanRendererDisposeWaitsForScissorDisable: true/);
  assert.match(composition, /underlyingSurfaceWaitsForPreviewResourceCleanup: true/);
  assert.doesNotMatch(composition, /requestAnimationFrame|setInterval|requestIdleCallback/);

  const readInput = readFileSync(
    'src/entry/arena-v2-collection-preview-read-input-candidate-v1.ts',
    'utf8',
  );
  assert.match(readInput, /status: 'production-unreachable'/);
  assert.match(readInput, /addsPages: false/);
  assert.match(readInput, /addsActions: false/);
  for (const screenId of ['weapon-index', 'weapon-detail', 'map-index', 'map-detail']) {
    assert.match(readInput, new RegExp(`'${screenId}'`));
  }

  const formalWeb = readFileSync(
    'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(formalWeb, /getInformationCurrentScreenBasePipeline\s*\(/);
  assert.doesNotMatch(formalWeb, /getInformationCurrentScreenPipeline\s*\(/);
  assert.match(
    composition,
    /this\.#layoutBridge\.compose\(\{[\s\S]*?selectionProjection:[\s\S]*?sourceRenderPlan,[\s\S]*?readSnapshot/,
  );
  assert.match(formalWeb, /rendererFactory:/);
  assert.match(formalWeb, /width === 390 && height === 844/);
  assert.match(formalWeb, /width === 1440 && height === 900/);
  assert.match(formalWeb, /if \(viewport === null\) return null/);
  assert.match(formalWeb, /defaultEntryWired: false/);

  for (const entry of ['src/entry/web.ts', 'src/entry/wechat.ts', 'src/entry/douyin.ts']) {
    assert.doesNotMatch(
      readFileSync(entry, 'utf8'),
      /information-collection-preview-surface-composition|collection-preview-read-input/,
      `${entry}不得默认接入A6.16/A6.17。`,
    );
  }
});

test('P6 local playable host retains only incomplete cleanup owners and closes business entry', () => {
  const source = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#cleanupStarted = false/u);
  assert.match(source, /#assertBusinessOpen\(operation: string\): void/u);
  assert.match(source, /拒绝已开始清理的本地Playable Host/u);
  assert.match(source, /#activeRegistryBinding\(\)[\s\S]*?#assertBusinessOpen\('Arena three-mode local playable host Registry读取'\)/u);
  assert.match(source, /if \(!this\.#learningSettlementRecoveryOwnerDestroyed\)/u);
  assert.match(source, /if \(!this\.#learningSettlementIntentJournalDestroyed\)/u);
  const destroyStart = source.indexOf('  destroy(): void {', source.indexOf(
    'export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
  ));
  assert.notEqual(destroyStart, -1);
  const destroy = source.slice(destroyStart);
  assert.equal(
    destroy.indexOf('this.#terminalProductResult = null')
      > destroy.indexOf('this.#destroyed = errors.length === 0'),
    true,
  );
  assert.match(source, /localPlayablePartialCleanupRetainsOnlyIncompleteOwners: true/u);
});

test('P6 playable host retries only incomplete information and HUD owners', () => {
  const source = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  const classStart = source.indexOf(
    'export class ArenaThreeModeAuthoritativePlayableHostCandidateV1',
  );
  const classEnd = source.indexOf(
    'export function createArenaThreeModeAuthoritativePlayableHostCandidateV1',
    classStart,
  );
  assert.notEqual(classStart, -1);
  assert.notEqual(classEnd, -1);
  const playable = source.slice(classStart, classEnd);
  assert.match(playable, /#cleanupStarted = false/u);
  assert.match(playable, /#informationOwnerDestroyed = false/u);
  assert.match(playable, /#cleanupOwnedResources\(\): readonly unknown\[\]/u);
  assert.match(playable, /if \(!this\.#informationOwnerDestroyed\)/u);
  assert.match(playable, /#cleanupComplete\(\): boolean/u);
  assert.match(playable, /this\.#informationOwnerDestroyed && this\.#hud === null/u);
  assert.match(playable, /Arena three-mode playable host已开始清理/u);
  assert.match(source, /playableHostCleanupClosesAllBusinessEntry: true/u);
  assert.match(source, /playableHostPartialCleanupRetainsOnlyIncompleteOwners: true/u);
  assert.match(source, /playableHostTerminalStateWaitsForInformationAndHudOwners: true/u);
  assert.match(source, /playableHostPreflightsHudBeforeInformationOwnerConstruction: true/u);
  assert.equal(
    playable.indexOf(
      'const hud = new ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1(hudOptions)',
    ) < playable.indexOf(
      'informationOwner = new ArenaThreeModeAuthoritativeInformationHostCandidateV1({',
    ),
    true,
  );
});

test('P6.334 Learning Bridge checks children before state and cleanup ownership commits', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-learning-mode-session-bridge-candidate-v1.ts',
    'utf8',
  );
  const cleanupStart = source.indexOf('  #cleanup(): Error[] {');
  const destroyStart = source.indexOf('  destroy(): void {', cleanupStart);
  assert.notEqual(cleanupStart, -1);
  assert.notEqual(destroyStart, -1);
  const cleanup = source.slice(cleanupStart, source.indexOf('\n\n  #fail(', cleanupStart));
  const destroy = source.slice(destroyStart, source.indexOf('\n}\n\nexport const', destroyStart));
  assert.match(cleanup, /if \(!this\.#learningHandoffDestroyed\)/u);
  assert.match(cleanup, /this\.#learningHandoffDestroyed = true/u);
  assert.match(cleanup, /if \(!this\.#sessionDestroyed\)/u);
  assert.match(cleanup, /this\.#sessionDestroyed = true/u);
  assert.ok(
    cleanup.indexOf("'Learning Mode Session Bridge handoff destroy'")
      < cleanup.indexOf('this.#learningHandoffDestroyed = true'),
  );
  assert.ok(
    cleanup.indexOf('if (this.#reentryError !== null) return errors')
      < cleanup.indexOf('if (!this.#sessionDestroyed)'),
  );
  assert.equal(
    destroy.indexOf('this.#terminalResult = null')
      > destroy.indexOf('if (!this.#sessionDestroyed || !this.#learningHandoffDestroyed)'),
    true,
  );
  assert.match(source, /cleanupRetriesOnlyIncompleteChildren: true/u);
  assert.match(source, /constructorTransfersChildrenOnlyAfterAllPortsCaptured: true/u);
  assert.match(source, /constructionFailureLeavesChildOwnershipWithCaller: true/u);
  const constructorStart = source.indexOf('  constructor(value: unknown) {');
  const constructorEnd = source.indexOf('\n  get state', constructorStart);
  const constructor = source.slice(constructorStart, constructorEnd);
  assert.doesNotMatch(constructor, /\.destroy/u);
  assert.match(source, /assertSynchronousReturn\(value, name\)/u);
  assert.match(source, /sharedSynchronousReturnBoundaryWired: true/u);
  assert.doesNotMatch(source, /const NATIVE_PROMISE_THEN = Promise\.prototype\.then/u);
  assert.doesNotMatch(source, /function rejectAsync\(/u);
  assert.match(source, /cleanupFailureRetainsTerminalSettlementEvidence: true/u);
  assert.match(source, /terminalSettlementEvidenceClearsAfterAllChildren: true/u);
  assert.match(source, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(source, /childCallbacksCheckedBeforeBridgeStateCommit: true/u);
  assert.match(source, /cleanupReentryRetainsCurrentAndLaterBridgeOwners: true/u);
  assert.doesNotMatch(source, /#reentryAttempted|#assertReentryFree/u);
});

test('P6 Mode Product construction transfers children only after the full session exists', () => {
  const sessionSource = readFileSync(
    'packages/arena-product-session/src/mode-product-session-v2.ts',
    'utf8',
  );
  const constructorStart = sessionSource.indexOf('  constructor(value: unknown) {');
  const constructorEnd = sessionSource.indexOf('\n  get state', constructorStart);
  assert.notEqual(constructorStart, -1);
  assert.notEqual(constructorEnd, -1);
  const constructor = sessionSource.slice(constructorStart, constructorEnd);
  assert.doesNotMatch(constructor, /\.destroy\(/u);
  assert.match(
    sessionSource,
    /constructorTransfersChildrenOnlyAfterAllPortsCaptured: true/u,
  );
  assert.match(
    sessionSource,
    /constructionFailureLeavesChildOwnershipWithCaller: true/u,
  );

  const compositionSource = readFileSync(
    'packages/arena-product-composition/src/mode-product-session-composition-v2.ts',
    'utf8',
  );
  const construction = compositionSource.indexOf('const session = new ModeProductSessionV2({');
  const transfer = compositionSource.indexOf('assembler = null;', construction);
  assert.notEqual(construction, -1);
  assert.equal(transfer > construction, true);
  assert.doesNotMatch(compositionSource, /matchSession[\s\S]*?destroyMatch/u);
  assert.match(
    compositionSource,
    /failedSessionConstructionLeavesMatchOwnershipWithCaller: true/u,
  );
  assert.match(
    compositionSource,
    /failedSessionConstructionCleansOnlyCompositionOwnedAssembler: true/u,
  );
});

test('P6.277 keeps Learning Terminal Handoff evidence retryable across swallowed reentry', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-learning-terminal-handoff-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#operation: LearningTerminalHandoffOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning|#reentryAttempted|#assertNoReentry/u);
  for (const marker of [
    'operationGuardPrecedesStateAndInputValidation: true',
    'authorityAndProfilePortsCheckedBeforeBusinessProgress: true',
    'internalSnapshotAndPreparationAvoidPublicReentry: true',
    'settlementReentryRetainsPreparedGrantAndTerminalEvidence: true',
    'publicReadsRejectOperationIntermediateState: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
  ]) assert.ok(source.includes(marker));

  for (const marker of [
    "this.#runOperation('state-read'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('append-events'",
    "this.#runOperation('settle'",
    "this.#runOperation('bind-replay'",
    "this.#runOperation('bind-runtime'",
    "this.#runOperation('prepare-bound'",
    "this.#runOperation('settle-bound'",
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(source, /return this\.getSnapshot\(\)/u);
  assert.doesNotMatch(source, /this\.prepareBound\(\)/u);
  assert.match(source, /#prepareBoundInsideOperation\(\): ArenaV2LearningGrantV1/u);

  const legacySettlementStart = source.indexOf('  settle(result: unknown): SettlementOutcome {');
  const replayBindingStart = source.indexOf('  bindTerminalEvidence(', legacySettlementStart);
  const legacySettlement = source.slice(legacySettlementStart, replayBindingStart);
  assert.ok(
    legacySettlement.indexOf('settleArenaV2LearningMatchCandidateV1({')
      < legacySettlement.indexOf("this.#assertReentryFree(sequence, '旧结算')"),
  );
  assert.ok(
    legacySettlement.indexOf("this.#reentrySequence === sequence")
      < legacySettlement.indexOf("this.#state = 'failed'"),
  );

  const boundSettlementStart = source.indexOf('  settleBound(): SettlementOutcome {');
  const destroyStart = source.indexOf('  destroy(): void {', boundSettlementStart);
  const boundSettlement = source.slice(boundSettlementStart, destroyStart);
  assert.ok(
    boundSettlement.indexOf('this.#learningProfileService.commitGrant(preparedRuntimeGrant)')
      < boundSettlement.indexOf("this.#assertReentryFree(sequence, '绑定结算')"),
  );
  assert.ok(
    boundSettlement.indexOf('this.#reentrySequence === sequence')
      < boundSettlement.indexOf("this.#state = 'failed'"),
  );
  assert.ok(
    boundSettlement.indexOf('this.#preparedRuntimeGrant = null')
      > boundSettlement.indexOf("this.#assertReentryFree(sequence, '绑定结算')"),
  );
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf("if (this.#state === 'destroyed') return"),
  );
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.278/P6.388 keeps offline retention writes retryable and publicly unambiguous', () => {
  const source = readFileSync(
    'packages/arena-product-progression/src/arena-v2-offline-retention-observation-journal-candidate-v1.ts',
    'utf8',
  );
  assert.match(
    source,
    /#operation: OfflineRetentionObservationJournalOperationCandidateV1 \| null = null/u,
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#mutating/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'storageAndLeasePortsCheckedBeforeCrossOwnerProgress: true',
    'durableObservationWatermarkPrecedesReentryRejection: true',
    'pendingCollectIntentFrozenBeforeStorageWrite: true',
    'pendingCollectRetryRequiresExactObservation: true',
    'pendingCollectReconcilesBaseOrIntendedDurableIdentity: true',
    'pendingCollectWatermarkCommitsAfterDurableConfirmation: true',
    'pendingCollectPublicSnapshotAndExportFailClosed: true',
    'destroyPreservesUnresolvedPendingCollectOwnership: true',
    'publicReadsRejectOperationIntermediateState: true',
    'internalSnapshotAvoidsPublicReentry: true',
    'destroyWatermarkPrecedesReentryRejection: true',
    "this.#runOperation('open'",
    "this.#runOperation('collector-read'",
    "this.#runOperation('collect'",
    "this.#runOperation('collect-batch'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('export-read'",
    "this.#runOperation('destroy'",
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(source, /return this\.getSnapshot\(\)/u);
  assert.equal((source.match(/'打开租约取得'/gu) ?? []).length, 1);

  const collectStart = source.indexOf('  #collectObservationBatch(');
  const collectEnd = source.indexOf('  collect(value: unknown): void {', collectStart);
  const collect = source.slice(collectStart, collectEnd);
  const publicCollectEnd = source.indexOf('  collectBatch(value: unknown): void {', collectEnd);
  const publicCollect = source.slice(collectEnd, publicCollectEnd);
  assert.ok(
    publicCollect.indexOf('createArenaV2RetentionObservationV1(value)')
      < publicCollect.indexOf('this.#collectObservationBatch('),
  );
  assert.ok(
    collect.indexOf('this.#pendingCollectIntent = pending')
      < collect.indexOf('this.#reconcilePendingCollectIntent(pending, sequence)'),
  );
  assert.doesNotMatch(collect, /this\.#lifecycle = 'failed'/u);

  const writeConfirmedStart = source.indexOf('  #writeConfirmed(');
  const createPendingStart = source.indexOf(
    '  #createPendingCollectIntent(',
    writeConfirmedStart,
  );
  const writeConfirmed = source.slice(writeConfirmedStart, createPendingStart);
  assert.ok(
    writeConfirmed.indexOf("this.#assertReentryFree(sequence, '写入确认')")
      < writeConfirmed.indexOf('return;'),
  );

  const commitStart = source.indexOf('  #commitPendingCollectIntent(');
  const reconcileStart = source.indexOf('  #reconcilePendingCollectIntent(', commitStart);
  const collectIntentCommit = source.slice(commitStart, reconcileStart);
  const reconcileEnd = source.indexOf('\n  open():', reconcileStart);
  const reconcile = source.slice(reconcileStart, reconcileEnd);
  assert.match(collectIntentCommit, /const localIsBase =/u);
  assert.match(collectIntentCommit, /const localIsIntended =/u);
  assert.ok(
    collectIntentCommit.indexOf("this.#assertReentryFree(sequence, '观察写入发布')")
      < collectIntentCommit.indexOf('this.#pendingCollectIntent = null'),
  );
  assert.match(reconcile, /stored\.payloadHash === pending\.intendedEnvelope\.payloadHash/u);
  assert.match(reconcile, /stored\.payloadHash !== pending\.baseEnvelope\.payloadHash/u);
  assert.ok(
    reconcile.indexOf('this.#writeConfirmed(pending.intendedEnvelope, sequence)')
      < reconcile.lastIndexOf('this.#commitPendingCollectIntent(pending, sequence)'),
  );

  const snapshotReadStart = source.indexOf('  getSnapshot():');
  const exportReadStart = source.indexOf('  getExportBundle():', snapshotReadStart);
  const destroyStart = source.indexOf('  destroy(): void {', exportReadStart);
  const publicReads = source.slice(snapshotReadStart, destroyStart);
  assert.equal((publicReads.match(/this\.#pendingCollectIntent !== null/gu) ?? []).length, 2);
  assert.match(publicReads, /不能发布snapshot/u);
  assert.match(publicReads, /不能发布export/u);

  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf("if (this.#lifecycle === 'destroyed') return"),
  );
  assert.ok(
    destroy.indexOf('this.#reconcilePendingCollectIntent(pendingCollectIntent, sequence)')
      < destroy.indexOf("this.#lifecycle = 'failed'"),
  );
  assert.ok(
    destroy.indexOf("this.#lifecycle = 'destroyed'")
      < destroy.indexOf("this.#assertReentryFree(sequence, '销毁发布')"),
  );
  const behaviorSource = readFileSync(
    'packages/arena-product-progression/test/arena-v2-learning-information-and-retention.test.ts',
    'utf8',
  );
  assert.match(behaviorSource, /reconciles an uncertain collect by retrying only the same frozen observation/u);
  assert.match(behaviorSource, /keeps pending collect and lease ownership when destroy cannot reconcile it/u);
  assert.match(
    behaviorSource,
    /expect\(\(\) => journal\.getSnapshot\(\)\)\.toThrow\(\/未决collect\/u\)/u,
  );
  assert.match(behaviorSource, /expect\(revisionOneWrites\)\.toBe\(1\)/u);
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.390 treats the exact latest committed event as acknowledgement retry only', () => {
  const source = readFileSync(
    'packages/arena-product-progression/src/arena-v2-offline-retention-observation-journal-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'lastCommittedObservationAcknowledgementRetrySupported: true',
    'lastCommittedAcknowledgementRequiresExactIdentityAndContent: true',
    'lastCommittedAcknowledgementTouchesNoStorageOrLease: true',
    'function observationIdentityHash(',
    '#acknowledgeLastCommittedObservationRetry(',
    '#acknowledgeLastCommittedObservationBatchRetry(',
    'this.#envelope.observations.slice(-observations.length)',
    'retryIdentityHash !== committed.observationBatchIdentityHash',
    "this.#assertReentryFree(sequence, '最后已提交观察批确认')",
  ]) assert.ok(source.includes(marker));

  const collectStart = source.indexOf('  #collectObservationBatch(');
  const collectEnd = source.indexOf('  collect(value: unknown): void {', collectStart);
  const collect = source.slice(collectStart, collectEnd);
  const pendingRecovery = collect.indexOf('if (pendingCollectIntent !== null)');
  const identityCheck = collect.indexOf(
    'if (observations.some((observation) => (',
  );
  const acknowledgement = collect.indexOf(
    'this.#acknowledgeLastCommittedObservationBatchRetry(observations, sequence)',
  );
  const nextSequence = collect.indexOf(
    'const expectedEventSequence = this.#currentSessionEventSequence + index + 1',
  );
  assert.ok(pendingRecovery >= 0);
  assert.ok(identityCheck > pendingRecovery && acknowledgement > identityCheck);
  assert.ok(nextSequence > acknowledgement);

  const acknowledgementStart = source.indexOf(
    '  #acknowledgeLastCommittedObservationRetry(',
  );
  const acknowledgementEnd = source.indexOf(
    '  #assertPendingCollectObservation(',
    acknowledgementStart,
  );
  const acknowledgementBody = source.slice(acknowledgementStart, acknowledgementEnd);
  for (const marker of [
    'const committed = this.#lastCommittedCollectBatch',
    'const retained = this.#envelope.observations.slice(-observations.length)',
    'observations.length !== committed.observations.length',
    'observationBatchIdentityHash(observations)',
    'observationBatchIdentityHash(retained)',
  ]) assert.ok(acknowledgementBody.includes(marker));
  assert.doesNotMatch(
    acknowledgementBody,
    /#storageValue|#leaseValue|#readExclusiveCurrent|#writeConfirmed/u,
  );
  assert.doesNotMatch(
    acknowledgementBody,
    /this\.#(?:envelope|currentSessionEventSequence|pendingCollectIntent)\s*=/u,
  );

  const behaviorSource = readFileSync(
    'packages/arena-product-progression/test/arena-v2-learning-information-and-retention.test.ts',
    'utf8',
  );
  for (const title of [
    'acknowledges only the exact latest committed observation without touching persistence',
    'acknowledges only the exact last committed atomic batch without touching ports',
    'rejects an event older than the latest committed acknowledgement watermark',
  ]) assert.ok(behaviorSource.includes(title));
  const hostBehaviorSource = readFileSync(
    'packages/arena-regression/test/arena-three-mode-mode-registry-preflight-quick-match-candidate-v1.test.ts',
    'utf8',
  );
  assert.match(
    hostBehaviorSource,
    /reconciles a Host catalog cursor after durable Journal acknowledgement loss/u,
  );
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.391 persists settled retention work as one bounded atomic Journal batch', () => {
  const journalSource = readFileSync(
    'packages/arena-product-progression/src/arena-v2-offline-retention-observation-journal-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ARENA_V2_OFFLINE_RETENTION_OBSERVATION_BATCH_LIMIT_V1 = 25',
    'atomicObservationBatchCollectSupported: true',
    'atomicObservationBatchRevisionAdvancesByObservationCount: true',
    'atomicObservationBatchRetryRequiresExactOrderedContent: true',
    'atomicObservationBatchAcknowledgementRejectsSubBatchOverlap: true',
    'destroyClearsLastCommittedObservationBatch: true',
    'function normalizeObservationBatch(',
    '#createPendingCollectBatchIntent(',
    '#acknowledgeLastCommittedObservationBatchRetry(',
    "this.#runOperation('collect-batch'",
  ]) assert.ok(journalSource.includes(marker));
  const createBatchStart = journalSource.indexOf('  #createPendingCollectBatchIntent(');
  const acknowledgeStart = journalSource.indexOf(
    '  #acknowledgeLastCommittedObservationRetry(',
    createBatchStart,
  );
  const createBatch = journalSource.slice(createBatchStart, acknowledgeStart);
  assert.match(createBatch, /for \(const observation of batch\)/u);
  assert.match(createBatch, /baseEnvelope\.revision,[\s\S]*batch\.length/u);
  assert.match(createBatch, /baseEnvelope\.observationCount,[\s\S]*batch\.length/u);
  assert.ok(
    createBatch.indexOf('metrics = Object.freeze(metrics.map')
      < createBatch.indexOf('const intendedEnvelope = envelope'),
  );
  const collectBatchStart = journalSource.indexOf('  collectBatch(value: unknown): void {');
  const snapshotStart = journalSource.indexOf('  getSnapshot():', collectBatchStart);
  const collectBatch = journalSource.slice(collectBatchStart, snapshotStart);
  assert.ok(
    collectBatch.indexOf('normalizeObservationBatch(value)')
      < collectBatch.indexOf('this.#collectObservationBatch(observations, sequence)'),
  );

  const hostSource = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'retentionSettlementUsesAtomicCollectorBatchWhenAvailable: true',
    'retentionAtomicBatchPreconditionsCheckedBeforeCollectorCall: true',
    'retentionAtomicBatchPostStateCommitsOnlyAfterCollectorSuccess: true',
    'retentionCollectorsWithoutBatchPortRemainSupported: true',
    '#assertAtomicSettlementRetentionWorkBatchReady(',
    '#commitAtomicSettlementRetentionWorkBatch(',
    'collector.collectBatch(observations);',
    'collector.collect(item.observation);',
  ]) assert.ok(hostSource.includes(marker));
  const drainStart = hostSource.indexOf('  #drainRetentionWorkBatch(');
  const drainEnd = hostSource.indexOf('  #retryPendingRetentionWorkBatches(', drainStart);
  const drain = hostSource.slice(drainStart, drainEnd);
  const atomicPrecheck = drain.indexOf('this.#assertAtomicSettlementRetentionWorkBatchReady(');
  const atomicCollect = drain.indexOf('collector.collectBatch(observations);');
  const callbackBoundary = drain.indexOf(
    'this.#assertRetentionCallbackBoundary(callbackBoundary);',
    atomicCollect,
  );
  const localCommit = drain.indexOf(
    'this.#commitAtomicSettlementRetentionWorkBatch(',
    callbackBoundary,
  );
  assert.ok(atomicPrecheck >= 0 && atomicCollect > atomicPrecheck);
  assert.ok(callbackBoundary > atomicCollect && localCommit > callbackBoundary);
  const destroyStart = journalSource.indexOf('  destroy(): void {');
  const destroy = journalSource.slice(destroyStart);
  assert.ok(
    destroy.indexOf('this.#lastCommittedCollectBatch = null')
      < destroy.indexOf("this.#lifecycle = 'destroyed'"),
  );

  const journalBehavior = readFileSync(
    'packages/arena-product-progression/test/arena-v2-learning-information-and-retention.test.ts',
    'utf8',
  );
  for (const title of [
    'commits one bounded atomic batch to the same final envelope as ordered single collects',
    'rejects an invalid middle batch item and an oversized batch before any port access',
    'recovers one uncertain atomic batch only from the exact frozen ordered content',
    'acknowledges only the exact last committed atomic batch without touching ports',
  ]) assert.ok(journalBehavior.includes(title));
  const hostBehavior = readFileSync(
    'packages/arena-regression/test/arena-three-mode-mode-registry-preflight-quick-match-candidate-v1.test.ts',
    'utf8',
  );
  for (const title of [
    'treats an explicit invalid or accessor collectBatch as failure instead of no-batch fallback',
    'keeps a real Journal settlement batch at cursor zero until one atomic retry commits',
    'uses Journal batch acknowledgement after Host loses the first atomic confirmation',
  ]) assert.ok(hostBehavior.includes(title));
});

test('P6.392 retries next-goal capture from the committed settlement generation', () => {
  const hostSource = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'retentionNextGoalCaptureDebtFrozenAtSettlementCommit: true',
    'retentionNextGoalCaptureDebtRetriesSameProfileGeneration: true',
    'retentionNextGoalCaptureFreezesRegistryScopeBeforeResolver: true',
    'retentionNextGoalCaptureRetriesNeverRereadRegistryScope: true',
    'retentionNextGoalCaptureDebtBlocksBusinessAndMatchStart: true',
    'retentionNextGoalCaptureDebtClearsOnlyAfterGoalIdentityClosure: true',
    'retentionNextGoalCaptureMutuallyExclusiveWithWorkActionAndImpression: true',
    'retentionDestroyDrainsNextGoalCaptureBeforeChildCleanup: true',
    'retentionWithoutCollectorCreatesNoNextGoalCaptureDebt: true',
    'interface PendingNextGoalCaptureDebtV1',
    '#preparePendingNextGoalCaptureDebt(',
    'pendingNextGoalCapture:',
  ]) assert.ok(hostSource.includes(marker));

  const drainStart = hostSource.indexOf('  #drainRetentionWorkBatch(');
  const drainEnd = hostSource.indexOf('  #retryPendingRetentionWorkBatches(', drainStart);
  const drain = hostSource.slice(drainStart, drainEnd);
  const atomicDebt = drain.indexOf('this.#preparePendingNextGoalCaptureDebt(');
  const atomicCollect = drain.indexOf('collector.collectBatch(observations);');
  const atomicCommit = drain.indexOf('this.#commitAtomicSettlementRetentionWorkBatch(');
  assert.ok(atomicDebt >= 0 && atomicCollect > atomicDebt && atomicCommit > atomicCollect);
  assert.ok(
    drain.lastIndexOf('this.#preparePendingNextGoalCaptureDebt(')
      < drain.indexOf('collector.collect(item.observation);'),
  );

  const captureStart = hostSource.indexOf('  #captureNextGoalImpression(): boolean {');
  const captureEnd = hostSource.indexOf('  #completeNextGoalImpression(', captureStart);
  const capture = hostSource.slice(captureStart, captureEnd);
  assert.ok(captureStart >= 0 && captureEnd > captureStart);
  assert.equal(
    (capture.match(/this\.#activeRegistryBindingFromCurrentOwner\(\)/gu) ?? []).length,
    1,
  );
  assert.doesNotMatch(capture, /this\.#nextLearningGoal\(\)/u);
  const scopeRead = capture.indexOf('this.#activeRegistryBindingFromCurrentOwner()');
  const scopeBoundary = capture.indexOf(
    'this.#assertRetentionCallbackBoundary(callbackBoundary);',
    scopeRead,
  );
  const scopeCommit = capture.indexOf('this.#pendingNextGoalCaptureDebt = scopedDebt;');
  const profileRead = capture.indexOf(
    'this.#profileOwner.learningProfileService.getSnapshot()',
    scopeCommit,
  );
  const resolve = capture.indexOf('this.#resolveNextLearningGoalWithWeaponScope(', profileRead);
  const impressionCommit = capture.indexOf('this.#pendingNextGoalImpression = impression;');
  const debtClear = capture.indexOf(
    'this.#pendingNextGoalCaptureDebt = null;',
    impressionCommit,
  );
  assert.ok(scopeRead >= 0 && scopeBoundary > scopeRead && scopeCommit > scopeBoundary);
  assert.ok(profileRead > scopeCommit && resolve > profileRead);
  assert.match(capture, /debt\.registryScope\?\.collectionEquipmentDefinitionIds \?\? null/u);
  assert.ok(impressionCommit > resolve && debtClear > impressionCommit);
  assert.match(capture, /nextGoal\.profileRevision !== debt\.expectedProfileRevision/u);

  const localHostStart = hostSource.indexOf(
    'export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
  );
  const operationStart = hostSource.indexOf('  #runOperation<T>(', localHostStart);
  const operationEnd = hostSource.indexOf('  #ownedHost(', operationStart);
  const operation = hostSource.slice(operationStart, operationEnd);
  const workRetry = operation.indexOf('this.#retryPendingRetentionWorkBatches();');
  const captureRetry = operation.indexOf('this.#captureNextGoalImpression();', workRetry);
  const captureCatalog = operation.indexOf(
    'this.#collectCatalogImpressionForCurrentScreen();',
    captureRetry,
  );
  const actionRetry = operation.indexOf('this.#retryPendingRetentionAction();', captureRetry);
  const business = operation.indexOf('result = action();');
  assert.ok(workRetry >= 0 && captureRetry > workRetry && captureCatalog > captureRetry);
  assert.ok(actionRetry > captureCatalog);
  assert.ok(business > actionRetry);

  const primaryStart = hostSource.indexOf(
    '  dispatchPrimaryIntent(value: unknown): unknown {',
    localHostStart,
  );
  const primaryEnd = hostSource.indexOf('  stepMatch(value: unknown): unknown {', primaryStart);
  const primary = hostSource.slice(primaryStart, primaryEnd);
  assert.ok(
    primary.indexOf('this.#pendingNextGoalCaptureDebt !== null')
      < primary.indexOf('this.#learningSettlementIntentJournal.captureMatchStartBaseline('),
  );

  const destroyStart = hostSource.indexOf('  #destroyOwnedResources(): void {', localHostStart);
  const destroyEnd = hostSource.indexOf('\n  destroy(): void {', destroyStart);
  const destroy = hostSource.slice(destroyStart, destroyEnd);
  const destroyWork = destroy.indexOf('this.#retryPendingRetentionWorkBatches()');
  const destroyCapture = destroy.indexOf('this.#captureNextGoalImpression()', destroyWork);
  const destroyAction = destroy.indexOf('this.#retryPendingRetentionAction()', destroyCapture);
  const destroyCatalog = destroy.indexOf(
    'this.#collectCatalogImpressionForCurrentScreen()',
    destroyAction,
  );
  const destroyChild = destroy.indexOf('this.#playableHost.destroy()');
  assert.ok(destroyWork >= 0 && destroyCapture > destroyWork && destroyAction > destroyCapture);
  assert.ok(destroyCatalog > destroyAction && destroyChild > destroyCatalog);

  const behaviorSource = readFileSync(
    'packages/arena-regression/test/arena-three-mode-mode-registry-preflight-quick-match-candidate-v1.test.ts',
    'utf8',
  );
  for (const title of [
    'retains a frozen next-goal capture debt after the settlement batch commits',
    'freezes the active Registry scope once before retrying the same goal generation',
    'blocks navigation and match start while next-goal capture keeps failing',
    'does not create next-goal capture debt when no retention collector is wired',
  ]) assert.ok(behaviorSource.includes(title));
});

test('P6.410 excludes scope completion from the next-goal selection denominator', () => {
  const hostSource = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(
    hostSource,
    /scopeCompletionDoesNotCreateNextGoalSelectionDenominator: true/u,
  );
  const captureStart = hostSource.indexOf('  #captureNextGoalImpression(): boolean {');
  const captureEnd = hostSource.indexOf('  #completeNextGoalImpression(', captureStart);
  const capture = hostSource.slice(captureStart, captureEnd);
  const identityClosure = capture.indexOf(
    "throw new RangeError('Arena下一目标捕获债务与Profile或结算留存水位漂移。');",
  );
  const completionGuard = capture.indexOf("if (nextGoal.kind === 'catalog-complete') {");
  const completionDebtClear = capture.indexOf(
    'this.#pendingNextGoalCaptureDebt = null;',
    completionGuard,
  );
  const completionReturn = capture.indexOf('return true;', completionDebtClear);
  const impressionCommit = capture.indexOf('this.#pendingNextGoalImpression = impression;');
  assert.ok(identityClosure >= 0 && completionGuard > identityClosure);
  assert.ok(completionDebtClear > completionGuard && completionReturn > completionDebtClear);
  assert.ok(impressionCommit > completionReturn);
});

test('P6.411 counts only revalidated goal-aligned replay as next-goal selection', () => {
  const hostSource = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'goalAlignedPlayAgainCountsAsNextGoalSelection: true',
    '#captureGoalAlignedPlayAgainPreparation(',
    'selectedNextGoal || acceptedGoalAlignedPlayAgainPreparation !== null',
  ]) assert.ok(hostSource.includes(marker));
  const dispatchStart = hostSource.indexOf('  dispatchPrimaryIntent(value: unknown): unknown {');
  const dispatchEnd = hostSource.indexOf('\n  stepMatch(value: unknown): unknown {', dispatchStart);
  const dispatch = hostSource.slice(dispatchStart, dispatchEnd);
  const capture = dispatch.indexOf('const acceptedGoalAlignedPlayAgainPreparation =');
  const hostDispatch = dispatch.indexOf('host.dispatchPrimaryIntent(navigationIntent)');
  const startClosure = dispatch.indexOf(
    'this.#captureHomeContinuationMatchReceipt(matchPresentation);',
    hostDispatch,
  );
  const completion = dispatch.indexOf(
    'selectedNextGoal || acceptedGoalAlignedPlayAgainPreparation !== null',
    startClosure,
  );
  assert.ok(capture >= 0 && hostDispatch > capture);
  assert.ok(startClosure > hostDispatch && completion > startClosure);
});

test('P6.412 exposes one discoverable platform mapping for the complete control scope', () => {
  const inputContract = readFileSync(
    'packages/arena-product-content/src/arena-v2-three-concept-input-contract-candidate-v1.ts',
    'utf8',
  );
  const controlBinding = readFileSync(
    'packages/arena-presentation-runtime/src/arena-v2-simple-three-concept-control-binding.ts',
    'utf8',
  );
  const controlCopy = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-control-learning-copy-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'characterCount: 6 as const',
    'weaponCount: 20 as const',
    'weaponActionCount: 40 as const',
    'mapCount: 2 as const',
    'mapSegmentCount: MAP_SEGMENT_COUNT',
    'contextAddsButtons: false as const',
  ]) assert.ok(inputContract.includes(marker));
  for (const marker of [
    'ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1',
    'ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1',
    'WASD/方向键移动',
    '空格跳跃',
    'J/E攻击',
    '方向盘移动',
    '跳跃键',
    '攻击键',
  ]) assert.ok(controlBinding.includes(marker));
  for (const marker of [
    'platformControlText',
    'platformControlAccessibilityText',
    'coveredCharacterCount:',
    'coveredWeaponCount:',
    'coveredMapCount:',
    'coveredMapSegmentCount:',
    'addsInputConcepts: false as const',
    'defaultSurfaceWired: false as const',
  ]) assert.ok(controlCopy.includes(marker));
});

test('P6.413 preserves unarmed authority direction and strength through formal feedback', () => {
  const projection = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-unarmed-feedback-direction-presentation-candidate-v1.ts',
    'utf8',
  );
  const hudHost = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
    'utf8',
  );
  const formalVfx = readFileSync(
    'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'exactUnarmedActionIdentityRequired: true',
    'exactFeedbackFactIdentityRequired: true',
    'reusesGenericCueAndAuthoredBudget: true',
    'addsTextureAudioOrParticleBudget: false',
  ]) assert.ok(projection.includes(marker));
  for (const marker of [
    'presentPassthroughDirectional',
    'strengthAdjustedAudioCommand(command, directionFact)',
    'unarmedDirectionAndImpactStrengthPreserved: true',
    'unarmedAudioStrengthUsesExistingCueAndBus: true',
  ]) assert.ok(hudHost.includes(marker));
  for (const marker of [
    'projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1',
    'presentPassthroughDirectional(value: unknown)',
    'unarmedPassthroughConsumesAuthorityDirectionFactsV2: true',
    'unarmedPassthroughReusesGenericCueAndAssetBudget: true',
  ]) assert.ok(formalVfx.includes(marker));
});

test('P6.414 applies authority impact audio priority and gain floors independently', () => {
  const hudHost = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'const priority = command.priority >= strength.presentation.minimumAudioPriority',
    'const gainDb = command.gainDb >= strength.presentation.minimumAudioGainDb',
    'impactStrengthAudioPriorityAndGainFloorsIndependent: true',
    'priority,',
    'gainDb,',
  ]) assert.ok(hudHost.includes(marker));
});

test('P6.415 names the exact result route adjustment before mode confirmation', () => {
  const binding = readFileSync(
    'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    "recommendation.targetScreenId !== 'mode-select'",
    "label: `调整为${compactTargets.join('＋')}`",
    '具体调整路线没有实际选择变化',
    '生存仍然空手开局，目标武器',
    '需要在场上遇到后拾取',
    'resultRouteAdjustmentNamesExactChangedModeWeaponAndMap: true',
    'resultRouteAdjustmentStopsAtExistingModeConfirmation: true',
    'resultSurvivalAdjustmentPreservesUnarmedWorldPickupCopy: true',
  ]) assert.ok(binding.includes(marker));
});

test('P6.416 names every explicit next-goal destination without adding navigation', () => {
  const binding = readFileSync(
    'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'function resultExplicitNextGoalCopy(',
    "label: `确认${compactTargets.join('＋')}`",
    'label: `了解目标武器：${targetWeaponDisplayName}`',
    'label: `了解目标地图：${targetMapDisplayName}`',
    'label: `查看目标武器：${learningSignature.weaponDisplayName}`',
    "label: '返回首页继续'",
    '结果页显式下一目标缺少可达页面',
    'explicitNextGoalNamesExactExistingDestination: true',
    'explicitNextGoalReusesModeWeaponMapAndHomePages: true',
    'explicitNextGoalAddsNoPageOrAction: true',
  ]) assert.ok(binding.includes(marker));
});

test('P6.417 preserves the exact map segment through the shared next-goal signature', () => {
  const signature = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-home-next-learning-signature-information-projection-candidate-v1.ts',
    'utf8',
  );
  const host = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  const binding = readFileSync(
    'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    "'weaponDefinitionId', 'mapDefinitionId', 'segmentDefinitionId'",
    '下一段：${segmentOrdinal}.${segmentDisplayName}',
    '目标路段是第${segmentOrdinal}段${segmentDisplayName}',
    'exactMapSegmentGoalPrecedesRouteSkeleton: true',
    'maximumVisibleMapSegmentSignatureCount: 1',
  ]) assert.ok(signature.includes(marker));
  assert.ok(host.includes('segmentDefinitionId: nextGoal.segmentDefinitionId'));
  assert.ok(binding.includes('segmentDefinitionId: nextLearningGoal.segmentDefinitionId'));
  assert.ok(binding.includes('resultLearningSignaturePreservesExactMapSegmentGoal: true'));
});

test('P6.418 calibrates the five-minute capacity hypothesis from authority ticks only', () => {
  const source = readFileSync(
    'packages/arena-product-progression/src/arena-v2-learning-pace-calibration-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz',
    'aggregateArenaV2RetentionObservationsV1(source.observations)',
    'missingAuthorityDurationCount: settled.length - measured.length',
    "status: 'offline-capacity-calibration-candidate'",
    "longitudinalEvidence: 'not-run'",
    "'observed-authority-duration-if-every-match-awards-one-main-research-point'",
    'claimsObservedRetention: false',
    'containsWallClockTime: false',
    'preservesFiveMinuteCapacityAsHypothesis: true',
    'idealizedWeaponCollectionDeltaFromTargetHours',
    'meetsTwoHundredHourIdealizedWeaponCapacity',
    'minimumCollectionEvidencePerWeaponForTargetAtObservedAverage',
    'calculatesThresholdDecisionFactsWithoutMutatingThreshold: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(
    source,
    /Date\.now|performance\.now|new Date|setTimeout|setInterval/u,
  );
});

test('P6.420 derives weapon research pace from an exact profile revision window', () => {
  const source = readFileSync(
    'packages/arena-product-progression/src/arena-v2-weapon-research-pace-calibration-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'currentProfile.revision - baselineProfile.revision',
    'createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1',
    'baselineProfileHash',
    'profileDefinitionContentHash',
    'windowIdentityHash',
    '观察与校准窗口主体漂移',
    'settled.length !== revisionSpan',
    'observedWeaponResearchPointCount > evidence.settledMatchCount',
    'completeAuthorityDurationWindow',
    'averageAuthorityMinutesPerResearchPoint',
    "'profile-delta-and-complete-authority-window-extrapolation'",
    'reusesExistingEightRetentionMetrics: true',
    'addsRetentionMetric: false',
    'mutatesProfileProgressionOrThreshold: false',
    'completeAuthorityDurationWindowRequiredForProjection: true',
    'baselineProfileAndCohortWindowIdentityRequired: true',
    'profileDefinitionContentHashBoundIntoWindowIdentity: true',
    'cohortSubjectIdMaximumLengthUsesSharedRetentionContract: true',
    'accumulatedEvidenceUsesSameProjectionFormula: true',
    'accumulatedEvidenceStoresNoReplayOrInputTrajectory: true',
    'projectArenaV2WeaponResearchPaceCalibrationFromAccumulatedEvidenceCandidateV1',
    'rawProfileIdExcludedFromWindow: true',
    'containsWallClockTime: false',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(
    source,
    /Date\.now|performance\.now|new Date|setTimeout|setInterval/u,
  );
});

test('P6.531 persists the offline weapon pace baseline behind a bounded owner', () => {
  const source = readFileSync(
    'packages/arena-product-progression/src/arena-v2-offline-weapon-research-pace-baseline-store-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'ArenaV2OfflineWeaponResearchPaceBaselineStoreCandidateV1',
    'weapon-research-pace-baseline.lease',
    'createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1',
    'baselineWriteUsesExclusiveLease: true',
    'leaseReleasedAfterInitialization: true',
    'writeRequiresReadBackConfirmation: true',
    'storedPayloadUsesDeterministicHash: true',
    'futureSchemaFailsClosed: true',
    'profileDefinitionContentHash',
    'sourceJournalPayloadHash',
    'equalJournalWatermarkRequiresExactPayloadHash: true',
    'storageRollbackFailsClosed: true',
    'sameOwnerTakeoverUsesDistinctLeaseHolderIdentity: true',
    'weapon-research-pace-baseline-holder',
    'performsNetworkUpload: false',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(
    source,
    /setTimeout|setInterval|fetch\(|XMLHttpRequest/u,
  );
});

test('P6.532 compacts settled authority evidence before Journal tail eviction', () => {
  const source = readFileSync(
    'packages/arena-product-progression/src/arena-v2-offline-weapon-research-pace-baseline-store-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'synchronizeEnvelope',
    'accumulatedThroughProfileRevision',
    'accumulatedSettlementCount',
    'accumulatedMeasuredSettlementCount',
    'accumulatedMissingAuthorityDurationCount',
    'accumulatedAuthorityTicks',
    'checkpointJournalPayloadHash',
    'Checkpoint缺少连续结算窗口',
    'projectArenaV2WeaponResearchPaceCalibrationFromAccumulatedEvidenceCandidateV1',
    'compactSettlementEvidenceSurvivesJournalTailEviction: true',
    'compactEvidenceStoresOnlyCountsAndAuthorityTicks: true',
    'compactEvidenceUsesTheSharedWeaponPaceProjection: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(
    source,
    /rawReplay|inputTrajectory|setTimeout|setInterval|fetch\(|XMLHttpRequest/u,
  );
});

test('P6.533 freezes weapon pace evidence at the exact catalog completion boundary', () => {
  const store = readFileSync(
    'packages/arena-product-progression/src/arena-v2-offline-weapon-research-pace-baseline-store-candidate-v1.ts',
    'utf8',
  );
  const calibration = readFileSync(
    'packages/arena-product-progression/src/arena-v2-weapon-research-pace-calibration-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'accumulatedMainResearchPoints',
    'catalogCompletionProfileRevision',
    'catalogCompletionFreezesPaceEvidence: true',
    'postCompletionMatchesDoNotDiluteCollectionDuration: true',
    'Checkpoint全集完成边界不明确',
  ]) assert.ok(store.includes(marker));
  for (const marker of [
    'projectArenaV2WeaponResearchCatalogProgressCandidateV1',
    'evidenceThroughProfileRevision',
    'catalogCompletionPaceEvidenceFrozen',
    'catalogCompletionBoundaryRequiredBeforeEvidenceFreeze: true',
    'postCompletionMatchesExcludedFromCollectionDuration: true',
  ]) assert.ok(calibration.includes(marker));
});

test('P6.534 separates exact observed catalog duration from pace projection', () => {
  const source = readFileSync(
    'packages/arena-product-progression/src/arena-v2-weapon-research-pace-calibration-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'observedCatalogCompletionHours',
    'observedCatalogCompletionDeltaFromTargetHours',
    'observedCatalogCompletionMeetsTwoHundredHourTarget',
    "'complete-zero-baseline-window'",
    "'partial-baseline'",
    "'incomplete-authority-duration-window'",
    'exactObservedCompletionDurationRequiresZeroBaseline: true',
    'exactObservedCompletionDurationRequiresRevisionZero: true',
    'partialBaselineNeverClaimsObservedCatalogDuration: true',
  ]) assert.ok(source.includes(marker));
});

test('P6.383 keeps retention profile revision watermarks monotonic before persistence', () => {
  const observationSource = readFileSync(
    'packages/arena-product-progression/src/arena-v2-retention-observation-v1.ts',
    'utf8',
  );
  const journalSource = readFileSync(
    'packages/arena-product-progression/src/arena-v2-offline-retention-observation-journal-candidate-v1.ts',
    'utf8',
  );
  assert.ok(journalSource.includes(
    'sameOwnerTakeoverUsesDistinctLeaseHolderIdentity: true',
  ));
  assert.ok(journalSource.includes('.offline-retention-journal-holder'));
  assert.equal(
    (observationSource.match(/assertProfileRevisionOrder\(observations\)/gu) ?? []).length,
    1,
  );
  for (const marker of [
    'profileRevisionWatermarkMonotonic: true',
    'profileRevisionRollbackRejectedBeforeStorageAccess: true',
    'observation.profileRevision < previousProfileRevision',
  ]) assert.ok(journalSource.includes(marker));
  const collectStart = journalSource.indexOf('  #collectObservationBatch(');
  const collectEnd = journalSource.indexOf('  collect(value: unknown): void {', collectStart);
  const collect = journalSource.slice(collectStart, collectEnd);
  assert.ok(
    collect.indexOf('observation.profileRevision < previousProfileRevision')
      < collect.indexOf('this.#createPendingCollectBatchIntent(observations)'),
  );
  assert.match(journalSource, /validationStatus: 'not-run'/u);
});

test('P6.384 binds frozen learning-focus goals to the committed Profile revision', () => {
  const observationSource = readFileSync(
    'packages/arena-product-progression/src/arena-v2-retention-observation-v1.ts',
    'utf8',
  );
  const hostSource = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    "'previousGoalProfileRevision'",
    '目标与结算Profile revision不连续',
    '武器学习焦点goalId与目标身份不一致',
    '地图学习焦点goalId与目标身份不一致',
  ]) assert.ok(observationSource.includes(marker));
  for (const marker of [
    'learningFocusObservationBindsGoalAndSettlementProfileRevision: true',
    'weaponResearchFocusUsesReducerAppliedIdentityOnly: true',
    'profileRevision: nextGoal.profileRevision',
    'previousGoalProfileRevision: focus.profileRevision',
    'profile.revision !== settlementProfileRevision',
  ]) assert.ok(hostSource.includes(marker));
  assert.equal(
    (hostSource.match(/profileRevision: nextGoal\.profileRevision/gu) ?? []).length,
    2,
  );
  assert.equal(
    (hostSource.match(/previousGoalProfileRevision: focus\.profileRevision/gu) ?? []).length,
    2,
  );
  const weaponStart = hostSource.indexOf('  #collectWeaponResearchFocusObservation(');
  const mapStart = hostSource.indexOf('  #collectMapLearningFocusObservation(', weaponStart);
  const weapon = hostSource.slice(weaponStart, mapStart);
  assert.ok(
    weapon.indexOf("settlement.status !== 'committed'")
      < weapon.indexOf('this.#profileOwner.learningProfileService.getSnapshot()'),
  );
  assert.match(
    weapon,
    /progressedWeaponDefinitionId: focus\.goalKind === 'collect-weapon'\s+\? settlement\.researchedWeaponDefinitionId/u,
  );
  assert.doesNotMatch(
    weapon,
    /progressedWeaponDefinitionId:[\s\S]{0,120}\? authorityResearchedWeaponDefinitionId/u,
  );
  const mapEnd = hostSource.indexOf('  #completeLearningSettlementPostProcessing(', mapStart);
  const map = hostSource.slice(mapStart, mapEnd);
  assert.ok(
    map.indexOf("settlement.status !== 'committed'")
      < map.indexOf('settlement.mapSegmentEvidenceDeltas.find'),
  );
  assert.ok(
    map.indexOf('this.#profileOwner.learningProfileService.getSnapshot()')
      < map.indexOf('createArenaV2MapLearningFocusContinuationObservationV1({'),
  );
});

test('P6.385 binds retention use metrics to complete local Product Result usage', () => {
  const hostSource = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'retentionProducerStateCommitsAfterCollectorSuccess: true',
    'settledRetentionFactsBindCommittedProfileAndReplayContent: true',
    'settledRetentionFactsUseCompleteLocalProductResultWeaponUsage: true',
    'authorityResearchCandidateOnlyChecksSettlementIdentity: true',
    'weaponDefinitionIds: localUsage.usedCollectionEquipmentDefinitionIds',
    'expectedProfileRevision: facts.profileRevision',
  ]) assert.ok(hostSource.includes(marker));

  const factsStart = hostSource.indexOf('  #settledRetentionFacts(');
  const collectStart = hostSource.indexOf(
    '  #prepareSettledMatchRetentionWorkBatch(',
    factsStart,
  );
  const collectEnd = hostSource.indexOf('  #captureNextGoalImpression()', collectStart);
  const facts = hostSource.slice(factsStart, collectStart);
  const collect = hostSource.slice(collectStart, collectEnd);
  assert.ok(factsStart >= 0 && collectStart > factsStart && collectEnd > collectStart);
  assert.match(
    facts,
    /authorityResearchedWeaponDefinitionId !== null[\s\S]*localUsage\.usedCollectionEquipmentDefinitionIds\.includes/u,
  );
  assert.match(
    facts,
    /settlement\.researchedWeaponDefinitionId !== null[\s\S]*!== authorityResearchedWeaponDefinitionId/u,
  );
  assert.doesNotMatch(
    facts,
    /weaponDefinitionIds:\s*authorityResearchedWeaponDefinitionId/u,
  );
  assert.equal(
    (collect.match(/for \(const weaponDefinitionId of weaponDefinitionIds\)/gu) ?? [])
      .length,
    1,
  );
  assert.ok(
    collect.indexOf("kind: 'effective-learning-completed'")
      < collect.indexOf('for (const weaponDefinitionId of weaponDefinitionIds)'),
  );
  assert.ok(
    collect.indexOf('for (const weaponDefinitionId of weaponDefinitionIds)')
      < collect.indexOf("kind: 'cross-content-used'"),
  );
  assert.match(collect, /postCommit: Object\.freeze\(\{[\s\S]*kind: 'cross-content-used'/u);
  assert.match(hostSource, /validationStatus: 'not-run'/u);
});

test('P6.387 consumes pending retention actions only after collector success', () => {
  const hostSource = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(
    hostSource,
    /retentionPendingActionConsumptionCommitsAfterCollectorSuccess: true/u,
  );
  assert.match(
    hostSource,
    /retentionPendingActionBlocksLaterWatermarksUntilRetry: true/u,
  );
  assert.match(
    hostSource,
    /retentionPendingActionRetriesFrozenObservationIdentity: true/u,
  );
  assert.match(
    hostSource,
    /retentionPendingOpportunityNeverReplacedBeforeCommit: true/u,
  );
  assert.match(
    hostSource,
    /retentionCollectorReentryCheckedBeforeWatermarkCommit: true/u,
  );
  assert.match(
    hostSource,
    /retentionRetryReentryCheckedBeforeBusinessAction: true/u,
  );
  const nextStart = hostSource.indexOf('  #completeNextGoalImpression(');
  const nextEnd = hostSource.indexOf('  #captureHomeContinuationFollowObservation(', nextStart);
  const next = hostSource.slice(nextStart, nextEnd);
  assert.ok(nextStart >= 0 && nextEnd > nextStart);
  assert.match(next, /this\.#submitRetentionActionObservation\(/u);
  assert.match(next, /Object\.freeze\(\{/u);

  const captureNextStart = hostSource.indexOf('  #captureNextGoalImpression(): boolean {');
  const captureNextEnd = hostSource.indexOf('  #completeNextGoalImpression(', captureNextStart);
  const captureNext = hostSource.slice(captureNextStart, captureNextEnd);
  assert.match(captureNext, /this\.#pendingNextGoalImpression !== null/u);
  assert.doesNotMatch(captureNext, /this\.#pendingNextGoalImpression = null;/u);

  const homeStart = hostSource.indexOf('  #completeHomeContinuationFollowObservation(');
  const homeEnd = hostSource.indexOf('  #clearContinuationPreparationAfterExplicitExit(', homeStart);
  const home = hostSource.slice(homeStart, homeEnd);
  assert.equal(
    (home.match(/this\.#submitRetentionActionObservation\(/gu) ?? []).length,
    2,
  );
  const homeAssignment = hostSource.indexOf(
    'this.#pendingHomeContinuationFollowObservation =\n          acceptedHomeContinuationObservation;',
  );
  const homeSuccessGuard = hostSource.lastIndexOf(
    'if (previousObservationCompleted)',
    homeAssignment,
  );
  assert.ok(homeAssignment >= 0 && homeSuccessGuard >= 0 && homeSuccessGuard < homeAssignment);

  const submitStart = hostSource.indexOf('  #submitRetentionActionObservation(');
  const submitEnd = hostSource.indexOf('  #retryPendingRetentionAction(', submitStart);
  const submit = hostSource.slice(submitStart, submitEnd);
  const submitFrozenFields = submit.indexOf(
    'fields: this.#freezeRetentionObservationFields(fields)',
  );
  const submitFieldsPending = submit.indexOf(
    'this.#pendingRetentionActionRetry = pendingFields;',
  );
  const submitCreate = submit.indexOf('const observation = this.#createRetentionObservation(');
  const submitPending = submit.indexOf('this.#pendingRetentionActionRetry = pending;');
  const submitCollect = submit.indexOf('collector.collect(observation);');
  const submitReentryCheck = submit.lastIndexOf(
    'this.#assertRetentionCallbackBoundary(callbackBoundary);',
  );
  const submitCommit = submit.indexOf('this.#commitPendingRetentionAction(pending);');
  assert.ok(submitFrozenFields >= 0 && submitFieldsPending > submitFrozenFields);
  assert.ok(submitCreate > submitFieldsPending && submitPending > submitCreate);
  assert.ok(submitCollect > submitPending);
  assert.ok(submitReentryCheck > submitCollect && submitCommit > submitReentryCheck);

  const retryStart = hostSource.indexOf('  #retryPendingRetentionAction(');
  const retryEnd = hostSource.indexOf('  #commitPendingRetentionAction(', retryStart);
  const retry = hostSource.slice(retryStart, retryEnd);
  assert.match(retry, /collector\.collect\(pending\.observation\);/u);
  assert.ok(
    retry.indexOf('collector.collect(pending.observation);')
      < retry.indexOf('this.#assertRetentionCallbackBoundary(callbackBoundary);'),
  );

  const localHostStart = hostSource.indexOf(
    'export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
  );
  const operationStart = hostSource.indexOf('  #runOperation<T>(', localHostStart);
  const operationEnd = hostSource.indexOf('  #ownedHost(', operationStart);
  const operation = hostSource.slice(operationStart, operationEnd);
  assert.ok(localHostStart >= 0 && operationStart > localHostStart && operationEnd > operationStart);
  const operationRetry = operation.indexOf('this.#retryPendingRetentionAction();');
  const operationReentryCheck = operation.indexOf(
    'this.#reentrySequence !== reentrySequence',
    operationRetry,
  );
  const operationAction = operation.indexOf('result = action();');
  assert.ok(operationRetry >= 0 && operationReentryCheck > operationRetry);
  assert.ok(operationAction > operationReentryCheck);

  const destroyStart = hostSource.indexOf('  #destroyOwnedResources(): void {');
  const destroyEnd = hostSource.indexOf('\n  destroy(): void {', destroyStart);
  const destroy = hostSource.slice(destroyStart, destroyEnd);
  const destroyRetry = destroy.indexOf('this.#retryPendingRetentionAction()');
  const destroyChildren = destroy.indexOf('this.#playableHost.destroy();');
  assert.ok(destroyStart >= 0 && destroyEnd > destroyStart);
  assert.ok(destroyRetry >= 0 && destroyChildren > destroyRetry);
  assert.match(destroy, /const nextGoalCompleted = this\.#completeNextGoalImpression\(false\);/u);
  assert.match(destroy, /this\.#pendingNextGoalImpression !== null/u);
  assert.match(destroy, /const homeContinuationCompleted =/u);
  assert.match(destroy, /this\.#pendingHomeContinuationFollowObservation !== null/u);
  assert.ok(
    destroy.indexOf('this.#cleanupStarted = true;')
      > destroy.indexOf('this.#pendingHomeContinuationFollowObservation !== null'),
  );
  assert.doesNotMatch(destroy, /this\.#pendingRetentionActionRetry = null;/u);

  const behaviorTest = readFileSync(
    'packages/arena-regression/test/arena-three-mode-mode-registry-preflight-quick-match-candidate-v1.test.ts',
    'utf8',
  );
  assert.match(behaviorTest, /retains the home continuation opportunity until the collector confirms it/u);
  assert.match(behaviorTest, /pendingActionRetryKind: 'home-continuation-followed'/u);
  assert.match(behaviorTest, /pendingActionRetryKind: null/u);
  assert.match(behaviorTest, /eventId: attempts\[0\]!\.eventId/u);
  assert.match(behaviorTest, /eventSequence: attempts\[0\]!\.eventSequence/u);
  assert.match(behaviorTest, /expect\(attempts\[1\]\)\.toBe\(attempts\[0\]\)/u);
  assert.match(
    behaviorTest,
    /retries the same frozen next-goal selection before the next business action/u,
  );
  assert.match(behaviorTest, /pendingActionRetryKind: 'next-goal-selected'/u);
  assert.match(behaviorTest, /goalSelected: false/u);
  assert.match(behaviorTest, /authorityTick: attempts\[0\]!\.authorityTick/u);
  assert.match(
    behaviorTest,
    /keeps the frozen retention action uncommitted when the collector swallows Host reentry/u,
  );
  assert.match(
    behaviorTest,
    /retries the frozen retention action before starting destroy cleanup/u,
  );
});

test('P6.389 drains frozen retention work before actions and business mutations', () => {
  const hostSource = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'retentionPendingActionRetryBlocksBusinessUntilCommitted: true',
    'retentionActionRetryCapturesCurrentCatalogBeforeBusiness: true',
    'retentionPendingActionBlocksMatchStartBeforeBaseline: true',
    'retentionSettlementWorkBatchBoundedToTwentyFive: true',
    'retentionSettlementWorkBatchFreezesOrderedObservationsAndPostCommit: true',
    'retentionSettlementWorkBatchRetriesFromExactCursor: true',
    'retentionCatalogWorkFreezesNavigationRevisionAndOrdinal: true',
    'retentionFocusClearsOnlyAfterCollectorCommit: true',
    'retentionSettlementWorkBlocksNextMatchUntilDrained: true',
    'retentionDestroyDrainsFrozenWorkBeforeChildCleanup: true',
    'const MAX_SETTLEMENT_RETENTION_WORK_ITEMS_V1 =',
    'ARENA_V2_OFFLINE_RETENTION_OBSERVATION_BATCH_LIMIT_V1;',
  ]) assert.ok(hostSource.includes(marker));

  const localHostStart = hostSource.indexOf(
    'export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1',
  );
  const operationStart = hostSource.indexOf('  #runOperation<T>(', localHostStart);
  const operationEnd = hostSource.indexOf('  #ownedHost(', operationStart);
  const operation = hostSource.slice(operationStart, operationEnd);
  const workRetry = operation.indexOf('this.#retryPendingRetentionWorkBatches();');
  const actionRetry = operation.indexOf('this.#retryPendingRetentionAction();');
  const catalogCatchUp = operation.indexOf(
    'this.#collectCatalogImpressionForCurrentScreen();',
    actionRetry,
  );
  const businessAction = operation.indexOf('result = action();');
  assert.ok(workRetry >= 0 && actionRetry > workRetry);
  assert.ok(catalogCatchUp > actionRetry && businessAction > catalogCatchUp);
  assert.match(operation, /if \(!actionCompleted \|\| this\.#pendingRetentionActionRetry !== null\)/u);
  assert.match(operation, /if \(!catalogCompleted[\s\S]*pendingCatalogRetentionWorkBatch/u);

  const primaryStart = hostSource.indexOf('  dispatchPrimaryIntent(value: unknown): unknown {', localHostStart);
  const primaryEnd = hostSource.indexOf('  stepMatch(value: unknown): unknown {', primaryStart);
  const primary = hostSource.slice(primaryStart, primaryEnd);
  const startsMatchGuard = primary.indexOf('if (startsMatch');
  const baselineCapture = primary.indexOf(
    'this.#learningSettlementIntentJournal.captureMatchStartBaseline(',
  );
  const hostDispatch = primary.indexOf('host.dispatchPrimaryIntent(navigationIntent)');
  assert.match(
    primary,
    /if \(startsMatch[\s\S]*this\.#pendingRetentionActionRetry !== null/u,
  );
  assert.ok(startsMatchGuard >= 0 && baselineCapture > startsMatchGuard);
  assert.ok(hostDispatch > baselineCapture);

  const drainStart = hostSource.indexOf('  #drainRetentionWorkBatch(');
  const drainEnd = hostSource.indexOf('  #retryPendingRetentionWorkBatches(', drainStart);
  const drain = hostSource.slice(drainStart, drainEnd);
  assert.match(drain, /const item = items\[batch\.cursor\]!;/u);
  assert.ok(
    drain.indexOf('collector.collect(item.observation);')
      < drain.indexOf('this.#applyRetentionWorkPostCommit(item.postCommit);'),
  );
  assert.ok(
    drain.indexOf('this.#applyRetentionWorkPostCommit(item.postCommit);')
      < drain.indexOf('this.#retentionObservationEventSequence = item.observation.eventSequence;'),
  );

  const destroyStart = hostSource.indexOf('  #destroyOwnedResources(): void {', localHostStart);
  const destroyEnd = hostSource.indexOf('\n  destroy(): void {', destroyStart);
  const destroy = hostSource.slice(destroyStart, destroyEnd);
  const destroyWorkRetry = destroy.indexOf('this.#retryPendingRetentionWorkBatches()');
  const destroyActionRetry = destroy.indexOf('this.#retryPendingRetentionAction()');
  const destroyCatalogCatchUp = destroy.indexOf(
    'this.#collectCatalogImpressionForCurrentScreen();',
    destroyActionRetry,
  );
  const destroyCleanupStart = destroy.indexOf('this.#cleanupStarted = true;');
  const destroyChild = destroy.indexOf('this.#playableHost.destroy();');
  assert.ok(destroyWorkRetry >= 0 && destroyActionRetry > destroyWorkRetry);
  assert.ok(destroyCatalogCatchUp > destroyActionRetry);
  assert.ok(destroyCleanupStart > destroyCatalogCatchUp);
  assert.ok(destroyChild > destroyCleanupStart);

  const behaviorTest = readFileSync(
    'packages/arena-regression/test/arena-three-mode-mode-registry-preflight-quick-match-candidate-v1.test.ts',
    'utf8',
  );
  for (const title of [
    'retries a settled retention work batch from the exact frozen cursor before business',
    'orders the complete settled retention batch and captures next-goal only at its tail',
    'commits cross-content and focus post-state only after each exact retry succeeds',
    'commits a pending action before catching up the same catalog opportunity',
    'retries the same frozen catalog observation before the next business action',
    'blocks business and match-start dispatch while a frozen retention action still fails',
  ]) assert.ok(behaviorTest.includes(title));
});

test('P6.279 keeps eleven-screen navigation atomic across Registry callback reentry', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-information-navigation-session-v1.ts',
    'utf8',
  );
  assert.match(source, /#operation: ArenaV2InformationNavigationOperationV1 \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'registryCallbacksCheckedBeforeNavigationCommit: true',
    'publicSnapshotRejectsOperationIntermediateState: true',
    'internalSnapshotAvoidsPublicReentry: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'inputAccessorsRejectedBeforeExecution: true',
    'revisionOverflowRejectedBeforeCommit: true',
    "this.#runOperation('start'",
    "this.#runOperation('loading-ready'",
    "this.#runOperation('open-declared-link'",
    "this.#runOperation('open-bottom-navigation'",
    "this.#runOperation('dispatch-primary-intent'",
    "this.#runOperation('complete-match'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('destroy'",
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(source, /return this\.getSnapshot\(\)/u);
  assert.match(source, /Object\.getOwnPropertyDescriptor\(value, key\)/u);
  assert.match(source, /if \(!Number\.isSafeInteger\(revision\)\)/u);

  const requireStart = source.indexOf('  #requireScreenDefinition(');
  const assertInformationStart = source.indexOf('  #assertInformation(', requireStart);
  const requireDefinition = source.slice(requireStart, assertInformationStart);
  assert.ok(
    requireDefinition.indexOf('this.#registry.require(screenIdValue)')
      < requireDefinition.indexOf('this.#assertReentryFree(sequence, operation)'),
  );
  const dispatchStart = source.indexOf('  dispatchPrimaryIntent(value: unknown)');
  const completeStart = source.indexOf('  completeMatch(value: unknown)', dispatchStart);
  const dispatch = source.slice(dispatchStart, completeStart);
  assert.ok(
    dispatch.indexOf("this.#useRegistryValueChecked(\n        sequence,\n        '主动作Definition使用'")
      < dispatch.indexOf('return this.#commitInformation(SCREEN.MODE_SELECT, null)'),
  );
  const destroyStart = source.indexOf('  destroy(): ArenaV2InformationNavigationSnapshotV1 {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf("if (this.#lifecycle === 'destroyed') return this.#snapshot()"),
  );
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.280 keeps equipment Registry, pickup and map callbacks ahead of authority commits', () => {
  const source = readFileSync(
    'packages/arena-equipment/src/equipment-system.ts',
    'utf8',
  );
  assert.match(source, /#operation: EquipmentSystemOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#mutating/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'registryResolverAndMapCallbacksCheckedBeforeAuthorityCommit: true',
    'swallowedCallbackReentryRejectsBeforeAuthorityCommit: true',
    'publicReadsRejectAuthorityIntermediateState: true',
    'internalReadsAvoidPublicReentry: true',
    'authorityCommitChecksStickyReentryFact: true',
    'postCommitReentryFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runMutation('spawn'",
    "this.#runMutation('supply-timeline'",
    "this.#runMutation('pickup'",
    "this.#runMutation('supply-pickup'",
    "this.#runMutation('action-start'",
    "this.#runMutation('drop-owned'",
    "this.#runMutation('world-equipment-reconcile'",
    "this.#runOperation('checkpoint-export'",
    "this.#runOperation('destroy'",
    'this.#assertAuthorityCommitReady(',
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(source, /this\.assertActionCanStart\(/u);
  assert.doesNotMatch(source, /runtimes: this\.listSnapshots\(\)/u);

  const spawnStart = source.indexOf('  spawn(options: unknown)');
  const timelineStart = source.indexOf('  applySupplyTimelinePhase(', spawnStart);
  const spawn = source.slice(spawnStart, timelineStart);
  assert.ok(
    spawn.indexOf("this.#useExternalValueChecked('Equipment Spawner解析'")
      < spawn.indexOf('this.#runtimes.set(runtime.instanceId, runtime)'),
  );
  const actionStart = source.indexOf('  markActionStarted(');
  const cooldownStart = source.indexOf('  advanceCooldowns()', actionStart);
  const action = source.slice(actionStart, cooldownStart);
  assert.ok(
    action.indexOf('this.#requireActionDefinition(actionId)')
      < action.indexOf('mutableRuntime.cooldownRemainingTicks ='),
  );
  const dropStart = source.indexOf('  dropOwned(');
  const reconcileStart = source.indexOf('  despawnInvalidWorldEquipment(', dropStart);
  const drop = source.slice(dropStart, reconcileStart);
  assert.ok(
    drop.indexOf("this.#useExternalValueChecked('地图装备落点校验'")
      < drop.indexOf('runtime.locationState = drop.despawned'),
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#destroyed) return'),
  );
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.281 keeps the physical mutation port ahead of local movement authority commits', () => {
  const source = readFileSync(
    'packages/arena-movement/src/movement-system.ts',
    'utf8',
  );
  assert.match(source, /#operation: MovementSystemOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#mutating/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'physicalMutationPortCheckedBeforeMovementCommit: true',
    'swallowedPortReentryRejectsBeforeMovementCommit: true',
    'publicReadsRejectMovementIntermediateState: true',
    'internalCapabilityAndSnapshotReadsAvoidPublicReentry: true',
    'movementCommitChecksStickyReentryFact: true',
    'indeterminatePhysicalMutationFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runOperation('prepare-tick'",
    "this.#runOperation('execute'",
    "this.#runOperation('complete-tick'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('checkpoint-export'",
    "this.#runOperation('destroy'",
    'this.#assertMovementCommitReady(',
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(source, /this\.getCapabilities\(/u);

  const executeStart = source.indexOf('  execute(');
  const completeStart = source.indexOf('  completeTick(', executeStart);
  const execute = source.slice(executeStart, completeStart);
  assert.ok(
    execute.indexOf('this.#applyPhysicalMutationBatchChecked(applyBatch, mutations)')
      < execute.indexOf("this.#assertMovementCommitReady('执行移动命令')"),
  );
  assert.ok(
    execute.indexOf("this.#assertMovementCommitReady('执行移动命令')")
      < execute.indexOf('this.#states = drafts'),
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#destroyed) return'),
  );
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.282 keeps participant transitions and resource cleanup watermarks reentry-safe', () => {
  const source = readFileSync(
    'packages/arena-match/src/match-participant-system-v2.ts',
    'utf8',
  );
  assert.match(source, /#operation: MatchParticipantSystemOperationV2 \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#mutating|#destroying|#reentryAttempted/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicReadsRejectParticipantTransactionIntermediateState: true',
    'transitionCommitChecksStickyReentryFact: true',
    'resourceCleanupWatermarkPrecedesReentryRejection: true',
    'swallowedResourceReentryStopsLaterCleanup: true',
    'failedCleanupRetainsUnprocessedResourceOwnership: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runOperation('state-read'",
    "this.#runOperation('start'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('apply-transitions'",
    "this.#runOperation('destroy'",
    'this.#assertTransitionCommitReady()',
  ]) assert.ok(source.includes(marker));

  const applyStart = source.indexOf('  applyTransitions(');
  const destroyStart = source.indexOf('  destroy(): void {', applyStart);
  const apply = source.slice(applyStart, destroyStart);
  assert.ok(
    apply.indexOf('this.#assertTransitionCommitReady()')
      < apply.indexOf('this.#participants.set(participantId, candidate)'),
  );
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#state === MATCH_PARTICIPANT_SYSTEM_STATE_V2.DESTROYED) return'),
  );
  assert.ok(
    destroy.indexOf('this.#resources[index] = null')
      < destroy.indexOf('this.#assertReentryFree(sequence'),
  );
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.283 keeps Survival restore and tick commits behind one authority operation', () => {
  const source = readFileSync(
    'packages/arena-match/src/survival-mode-system.ts',
    'utf8',
  );
  assert.match(source, /#operation: SurvivalModeSystemOperationV1 \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#processing|#reentryAttempted|#assertIdle/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicReadsRejectTickAndRestoreIntermediateState: true',
    'checkpointRestoreValidatesCompleteCandidateBeforeCommit: true',
    'tickCommitChecksStickyReentryFact: true',
    'internalSnapshotAvoidsPublicReentry: true',
    'revisionOverflowRejectedBeforeAuthorityCommit: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runOperation('fixture-content-hash-read'",
    "this.#runOperation('lifecycle-read'",
    "this.#runOperation('checkpoint-restore'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('equipment-tier-resolve'",
    "this.#runOperation('step'",
    "this.#runOperation('destroy'",
    "this.#assertAuthorityCommitReady('checkpoint-restore', true)",
    "this.#assertAuthorityCommitReady('step', true)",
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(source, /state: this\.getSnapshot\(\)/u);

  const restoreStart = source.indexOf('  restoreFromCheckpointState(');
  const pauseStart = source.indexOf('  pause(): void {', restoreStart);
  const restore = source.slice(restoreStart, pauseStart);
  assert.ok(
    restore.indexOf("const revision = assertIntegerAtLeast(")
      < restore.indexOf("this.#assertAuthorityCommitReady('checkpoint-restore', true)"),
  );
  assert.ok(
    restore.indexOf("this.#assertAuthorityCommitReady('checkpoint-restore', true)")
      < restore.indexOf('this.#slots.clear()'),
  );
  const stepStart = source.indexOf('  step(value: unknown)');
  const destroyStart = source.indexOf('  destroy(): void {', stepStart);
  const step = source.slice(stepStart, destroyStart);
  assert.ok(
    step.indexOf("this.#assertAuthorityCommitReady('step', true)")
      < step.indexOf('this.#slots.clear()'),
  );
  assert.ok(
    step.indexOf('if (!Number.isSafeInteger(revision))')
      < step.indexOf("this.#assertAuthorityCommitReady('step', true)"),
  );
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf("if (this.#lifecycle === 'destroyed') return"),
  );
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.284 keeps reward Profile ports and durable outcome watermarks reentry-safe', () => {
  const source = readFileSync(
    'packages/arena-product-progression/src/mode-reward-committer-v2.ts',
    'utf8',
  );
  assert.match(source, /#operation: ModeRewardCommitterOperationV2 \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#committing/u);
  for (const marker of [
    'operationGuardPrecedesFailureAndInputValidation: true',
    'profileReadPortCheckedBeforeRewardResolution: true',
    'swallowedReadReentryFailsClosedBeforePreparedGrantCommit: true',
    'durableCommitOutcomeWatermarkPrecedesReentryRejection: true',
    'preparedGrantPublicationChecksStickyReentryFact: true',
    'duplicatePublicationChecksStickyReentryFact: true',
    "this.#runOperation('prepare'",
    "this.#runOperation('commit'",
    "this.#assertAuthorityCommitReady('prepare')",
    "this.#assertAuthorityCommitReady('commit')",
    "this.#assertReentryFree(commitSequence, 'Profile奖励提交终态发布', true)",
  ]) assert.ok(source.includes(marker));

  const readStart = source.indexOf('  #readProfileChecked(');
  const resolveStart = source.indexOf('  #resolve(', readStart);
  const read = source.slice(readStart, resolveStart);
  assert.ok(
    read.indexOf('this.#profilePort.getSnapshot()')
      < read.indexOf('this.#assertReentryFree(sequence, operation, true)'),
  );
  const prepareStart = source.indexOf('  prepare(result: unknown)');
  const commitStart = source.indexOf('  commit(result: unknown)', prepareStart);
  const prepare = source.slice(prepareStart, commitStart);
  assert.ok(
    prepare.indexOf("this.#assertAuthorityCommitReady('prepare')")
      < prepare.indexOf('this.#preparedProfile = prepared.profile'),
  );
  const commit = source.slice(commitStart);
  assert.ok(
    commit.indexOf('this.#profilePort.commitProgressionGrant({')
      < commit.indexOf('outcome = normalizeOutcome('),
  );
  assert.ok(
    commit.indexOf('this.#lastOutcome = outcome')
      < commit.indexOf("this.#assertReentryFree(commitSequence, 'Profile奖励提交终态发布', true)"),
  );
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.336 Learning Profile Service closes swallowed Repository reentry before publication', () => {
  const source = readFileSync(
    'packages/arena-profile-service/src/arena-v2-learning-profile-service-v1.ts',
    'utf8',
  );
  assert.doesNotMatch(source, /#reentryAttempted|#assertNoReentry/u);
  assert.match(
    source,
    /#assertCurrentOperationCommit\([\s\S]*operation: string,[\s\S]*restartRequired = false,[\s\S]*preserveState = false,[\s\S]*\): void/u,
  );
  assert.match(source, /this\.#assertCurrentOperationCommit\('租约续租'\)/u);
  assert.match(source, /this\.#assertCurrentOperationCommit\('CAS提交', true\)/u);
  assert.match(source, /this\.#assertCurrentOperationCommit\('CAS异常后读回', true\)/u);
  assert.match(source, /this\.#assertCurrentOperationCommit\('CAS冲突读回'\)/u);
  assert.match(source, /this\.#assertCurrentOperationCommit\('提交后读回', true\)/u);
  assert.match(source, /repositoryCallbackReentryIsSticky: true/u);
  assert.match(source, /profilePublicationWaitsForRepositoryCallbackClosure: true/u);
  assert.match(source, /openFailureDispositionIsExplicit: true/u);
  assert.match(source, /destroyStartsAtFailedClosedWatermark: true/u);
  assert.match(source, /this\.#assertCurrentOperationCommit\('打开'\)/u);
  assert.match(source, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(source, /repositoryCallbacksCheckedBeforeProfilePublication: true/u);
  assert.match(source, /destroyCallbackConfirmedBeforeOwnershipRelease: true/u);
  assert.match(source, /reason: 'repository-open-profile-invalid'/u);
  assert.match(source, /assertSynchronousReturn\(value, name\)/u);
  assert.match(source, /sharedSynchronousReturnBoundaryWired: true/u);
  assert.doesNotMatch(source, /const descriptor = Object\.getOwnPropertyDescriptor\(cursor, 'then'\)/u);
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6 Learning Profile Repository delays persistent publication until callbacks close', () => {
  const source = readFileSync(
    'packages/arena-profile-persistence/src/arena-v2-learning-profile-repository-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(
    source,
    /#assertNoReentrySince\(sequence: number, operation: string\): void/u,
  );
  assert.match(source, /this\.#assertNoReentrySince\(writeReentrySequence, '新槽写入'\)/u);
  assert.match(source, /this\.#assertNoReentrySince\(readbackReentrySequence, '新槽读回'\)/u);
  assert.match(source, /this\.#assertNoReentrySince\(headWriteReentrySequence, 'head写入'\)/u);
  assert.match(source, /storageAndLeaseCallbackReentryIsSticky: true/u);
  assert.match(source, /persistentPublicationWaitsForCallbackClosure: true/u);
  assert.match(source, /postWriteReentryIsIndeterminate: true/u);
  assert.match(source, /openFailureWithLeaseCleanupDebtFailsClosed: true/u);
  assert.match(source, /destroyStartsAtFailedClosedWatermark: true/u);
  assert.match(source, /leaseAcquireFailureDispositionIsExplicit: true/u);
  assert.match(source, /leaseFailedClosed = this\.#leaseValue\(\)\.isFailedClosed\(\);/u);
  assert.match(
    source,
    /const indeterminate = new ArenaV2LearningProfileIndeterminateWriteError\(/u,
  );
  assert.match(source, /indeterminate\.cause = combinedFailure;/u);
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6 shared synchronous lease retains bounded cleanup identities after swallowed reentry', () => {
  const source = readFileSync(
    'packages/arena-storage/src/synchronous-storage-lease.ts',
    'utf8',
  );
  assert.match(source, /#failed = false/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#cleanupLeaseCandidates: StoredLease\[\] = \[\]/u);
  assert.match(source, /#assertNoReentrySince\(sequence: number, operation: string\): void/u);
  assert.match(source, /#retainCleanupCandidate\(candidate: StoredLease\): void/u);
  assert.match(source, /this\.#cleanupLeaseCandidates\.length > 2/u);
  assert.match(source, /callbackReentryIsSticky: true/u);
  assert.match(source, /publicStateWaitsForCallbackClosure: true/u);
  assert.match(source, /failedLeaseRetainsCleanupIdentity: true/u);
  assert.match(source, /ambiguousRenewRetainsBoundedCleanupCandidates: true/u);
  assert.match(source, /assertSynchronousReturn\(rawNow, `\$\{this\.#label\} wallNow`\)/u);
  assert.match(source, /wallClockUsesSharedSynchronousReturnBoundary: true/u);
  assert.match(source, /failedClosedStateIsOwnerObservable: true/u);
  assert.match(source, /isFailedClosed\(\): boolean/u);
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.285 keeps every synchronous lease operation behind one authority guard', () => {
  const source = readFileSync(
    'packages/arena-storage/src/synchronous-storage-lease.ts',
    'utf8',
  );
  assert.match(source, /#operation: SynchronousStorageLeaseOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#mutating/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicReadsRejectLeaseTransactionIntermediateState: true',
    'callbackReentryIsSticky: true',
    'storedValueValidationCheckedBeforeCrossPortProgress: true',
    'failedLeaseRetainsCleanupIdentity: true',
    'ambiguousRenewRetainsBoundedCleanupCandidates: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runOperation('acquire'",
    "this.#runOperation('assert-held'",
    "this.#runOperation('renew'",
    "this.#runOperation('release'",
    "this.#runOperation('status-read'",
    "this.#runOperation('failed-closed-read'",
    "this.#runOperation('destroy'",
    "this.#assertAuthorityCommitReady('acquire')",
    "this.#assertAuthorityCommitReady('renew')",
    "this.#assertAuthorityCommitReady('destroy')",
  ]) assert.ok(source.includes(marker));

  const acquireStart = source.indexOf('  acquire(): boolean {');
  const heldStart = source.indexOf('  assertHeld(): true {', acquireStart);
  const acquire = source.slice(acquireStart, heldStart);
  assert.ok(
    acquire.indexOf("this.#assertAuthorityCommitReady('acquire')")
      < acquire.indexOf('this.#held = true'),
  );
  const readStart = source.indexOf('  #read(): StoredLease | null {');
  const writeStart = source.indexOf('  #writeAndConfirm(', readStart);
  const read = source.slice(readStart, writeStart);
  assert.ok(
    read.indexOf('validated = validateLease(result.value, this.#label)')
      < read.lastIndexOf("this.#assertNoReentrySince(sequence, 'Storage读取值校验')"),
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#destroyed) return'),
  );
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.286 keeps ArenaRuleEngine mutation ports behind one sticky commit operation', () => {
  const source = readFileSync(
    'packages/arena-core/src/arena-rule-engine.ts',
    'utf8',
  );
  assert.match(source, /#operation: ArenaRuleEngineOperation \| null/u);
  assert.match(source, /#operationSequence: number/u);
  assert.match(source, /#reentrySequence: number/u);
  assert.match(source, /#reentryError: Error \| null/u);
  assert.doesNotMatch(source, /#committing/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicCallsRejectCommitIntermediateState: true',
    'mutationPortsCheckedAfterEveryCallback: true',
    'swallowedPortReentryStopsLaterMutationPorts: true',
    'authorityCommitChecksStickyReentryFact: true',
    'postCommitReentryFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runOperation('commit'",
    "this.#runOperation('destroy'",
    "this.#useMutationPortChecked(operationSequence, 'recordHit端口'",
    "this.#useMutationPortChecked(operationSequence, 'applyHitstun端口'",
    "this.#useMutationPortChecked(operationSequence, 'applyImpulse端口'",
    "this.#assertAuthorityCommitReady(operationSequence, '提交输入验证')",
    "this.#assertAuthorityCommitReady(operationSequence, '命中权威提交后', true)",
    "this.#assertAuthorityCommitReady(operationSequence, '规则命令提交后', true)",
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const commitStart = source.indexOf('  commit(batch: unknown, ports: unknown): void {');
  const spawnStart = source.indexOf('  spawnEquipment(options: unknown)', commitStart);
  const commit = source.slice(commitStart, spawnStart);
  assert.ok(
    commit.indexOf("this.#runOperation('commit'")
      < commit.indexOf('const hits = batchRecord.hits'),
  );
  assert.ok(
    commit.indexOf("this.#assertAuthorityCommitReady(operationSequence, '提交输入验证')")
      < commit.indexOf('this.#actionExecution.recordHits(validatedBatch.hits)'),
  );
  assert.ok(
    commit.indexOf("this.#useMutationPortChecked(operationSequence, 'recordHit端口'")
      < commit.indexOf('this.#commandRegistry.execute(validatedBatch.commands'),
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#destroyed) return'),
  );
});

test('P6.287 keeps ArenaMapSystem strategy and mutation commits behind one operation', () => {
  const source = readFileSync(
    'packages/arena-map/src/arena-map-system.ts',
    'utf8',
  );
  assert.match(source, /#operation: ArenaMapSystemOperation \| null = null/u);
  assert.match(source, /#operationSequence = 0/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#advancing|#committing/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'strategyCallbacksCheckedBeforeRuntimeCommit: true',
    'mutationPortsCheckedAfterEveryCallback: true',
    'swallowedCallbackReentryStopsLaterAuthorityMutation: true',
    'publicReadsRejectAdvanceAndCommitIntermediateState: true',
    'pendingBatchPublicationChecksStickyReentryFact: true',
    'pendingBatchClearChecksStickyReentryFact: true',
    'postCommitReentryFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runOperation('advance'",
    "this.#runOperation('commit'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('state-snapshot-read'",
    "this.#runOperation('content-hash-read'",
    "this.#runOperation('surface-enabled-read'",
    "this.#runOperation('position-on-surface-read'",
    "this.#runOperation('destroy'",
    "this.#assertOperationReady('advance', operationSequence, '待提交批次发布', true)",
    "this.#assertOperationReady('commit', operationSequence, '待提交批次清除', true)",
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const advanceStart = source.indexOf('  advance(value: unknown): ArenaMapAdvanceBatch {');
  const commitStart = source.indexOf('  commit(batch: unknown, value: unknown): void {');
  const advance = source.slice(advanceStart, commitStart);
  assert.ok(
    advance.indexOf("this.#runOperation('advance'")
      < advance.indexOf('if (this.#pendingBatch)'),
  );
  assert.ok(
    advance.indexOf("this.#assertOperationReady('advance', operationSequence, '待提交批次发布', true)")
      < advance.indexOf('this.#pendingBatch = batch'),
  );
  const snapshotStart = source.indexOf('  getSnapshot(): ArenaMapSnapshot {', commitStart);
  const commit = source.slice(commitStart, snapshotStart);
  assert.ok(
    commit.indexOf("this.#runOperation('commit'")
      < commit.indexOf('const pendingBatch = this.#pendingBatch'),
  );
  assert.ok(
    commit.indexOf("this.#assertOperationReady('commit', operationSequence, '待提交批次清除', true)")
      < commit.indexOf('this.#pendingBatch = null'),
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#destroyed) return'),
  );
});

test('P6.288 keeps Race restore and step commits behind one authority operation', () => {
  const source = readFileSync(
    'packages/arena-match/src/race-mode-system.ts',
    'utf8',
  );
  assert.match(source, /#operation: RaceModeSystemOperationV1 \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#processing|#reentryAttempted|#assertIdle/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicReadsRejectStepAndRestoreIntermediateState: true',
    'checkpointRestoreValidatesCompleteCandidateBeforeCommit: true',
    'stepCommitChecksStickyReentryFact: true',
    'internalSnapshotAvoidsPublicReentry: true',
    'revisionOverflowRejectedBeforeAuthorityCommit: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runOperation('fixture-content-hash-read'",
    "this.#runOperation('lifecycle-read'",
    "this.#runOperation('start'",
    "this.#runOperation('checkpoint-restore'",
    "this.#runOperation('pause'",
    "this.#runOperation('resume'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('step'",
    "this.#runOperation('destroy'",
    "this.#assertAuthorityCommitReady('checkpoint-restore', true)",
    "this.#assertAuthorityCommitReady('step', true)",
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const restoreStart = source.indexOf('  restoreFromCheckpointState(');
  const pauseStart = source.indexOf('  pause(): void {', restoreStart);
  const restore = source.slice(restoreStart, pauseStart);
  assert.ok(
    restore.indexOf("this.#assertAuthorityCommitReady('checkpoint-restore', true)")
      < restore.indexOf('this.#participants.clear()'),
  );
  const stepStart = source.indexOf('  step(value: unknown)');
  const destroyStart = source.indexOf('  destroy(): void {', stepStart);
  const step = source.slice(stepStart, destroyStart);
  assert.ok(
    step.indexOf('if (!Number.isSafeInteger(revision))')
      < step.indexOf("this.#assertAuthorityCommitReady('step', true)"),
  );
  assert.ok(
    step.indexOf("this.#assertAuthorityCommitReady('step', true)")
      < step.indexOf('this.#participants.clear()'),
  );
  assert.match(step, /state: this\.#createSnapshotInsideOperation\(\)/u);
  assert.doesNotMatch(step, /this\.getSnapshot\(\)/u);
});

test('P6.289 keeps ProductMatchRuntime Session callbacks behind one sticky operation', () => {
  const source = readFileSync(
    'packages/arena-product-match/src/product-match-runtime.ts',
    'utf8',
  );
  assert.match(source, /#operation: ProductMatchRuntimeOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicReadsRejectCallbackIntermediateState: true',
    'sessionCallbacksCheckedBeforeAuthorityCommit: true',
    'completionSinkCheckedBeforeResultPublication: true',
    'swallowedCallbackReentryStopsLaterAuthorityMutation: true',
    'postCallbackReentryFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runOperation('state-read'",
    "this.#runOperation('pause-transition'",
    "this.#runOperation('start-read-frame'",
    "this.#runOperation('read-frame-read'",
    "this.#runOperation('step-read-frame'",
    "this.#runOperation('public-info-read'",
    "this.#runOperation('result-read'",
    "this.#runOperation('destroy'",
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const pauseStart = source.indexOf('  setPaused(paused: boolean): void {');
  const startStart = source.indexOf('  startWithReadFrame()', pauseStart);
  const pause = source.slice(pauseStart, startStart);
  assert.ok(
    pause.indexOf("this.#assertAuthorityCommitReady('pause-transition', true)")
      < pause.indexOf('this.#pauseRequested = paused'),
  );
  const completionStart = source.indexOf('  #completeEndedSession(');
  const pauseMethodStart = source.indexOf('  setPaused(paused: boolean): void {', completionStart);
  const completion = source.slice(completionStart, pauseMethodStart);
  assert.ok(
    completion.lastIndexOf('this.#assertAuthorityCommitReady(operation, true)')
      < completion.indexOf('this.#result = result'),
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.DESTROYED'),
  );
});

test('P6.290 keeps ProductMatchCoordinator async commit slices and cleanup guarded', () => {
  const source = readFileSync(
    'packages/arena-product-match/src/product-match-coordinator.ts',
    'utf8',
  );
  assert.match(source, /#operation: ProductMatchCoordinatorOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning|#runTransition/u);
  for (const marker of [
    'operationGuardPrecedesStateAndInputValidation: true',
    'asyncPrepareOwnsOnlySynchronousCommitSlices: true',
    'factoryAndRuntimeCallbacksCheckedBeforeAuthorityCommit: true',
    'snapshotCallbacksCheckedBeforePublication: true',
    'swallowedCallbackReentryStopsLaterAuthorityMutation: true',
    'cleanupOwnershipRetainedWhenReentryInterruptsRelease: true',
    'postCallbackReentryFailsClosed: true',
    'destroyChecksOperationBeforeCleanupMutation: true',
    "this.#runOperation('prepare-request'",
    "this.#runOperation('prepare-factory-create'",
    "this.#runOperation('prepare-adopt'",
    "this.#runOperation('prepare-reject'",
    "this.#runOperation('prepare-finalize'",
    "this.#runOperation('pause-transition'",
    "this.#runOperation('start-read-frame'",
    "this.#runOperation('step-read-frame'",
    "this.#runOperation('release'",
    "this.#runOperation('reset-failure'",
    "this.#runOperation('destroy'",
    "this.#runOperation('snapshot-read'",
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const pauseStart = source.indexOf('  setPaused(paused: boolean)');
  const startStart = source.indexOf('  startWithReadFrame()', pauseStart);
  const pause = source.slice(pauseStart, startStart);
  assert.ok(
    pause.indexOf("this.#assertAuthorityCommitReady('pause-transition', true)")
      < pause.lastIndexOf('this.#pauseRequested = paused'),
  );
  const stepStart = source.indexOf('  stepWithReadFrame(');
  const readStart = source.indexOf('  getMatchReadFrame()', stepStart);
  const step = source.slice(stepStart, readStart);
  assert.ok(
    step.indexOf("this.#assertAuthorityCommitReady('step-read-frame', true)")
      < step.indexOf('const runtimeResult = runtime.getResult()'),
  );
  const releaseStart = source.indexOf('  #releaseRuntime(');
  const releaseEnd = source.indexOf('  #release(', releaseStart);
  const releaseRuntime = source.slice(releaseStart, releaseEnd);
  assert.ok(
    releaseRuntime.indexOf('this.#assertAuthorityCommitReady(operation, true)')
      < releaseRuntime.indexOf('this.#runtime = null'),
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('this.#generation += 1'),
  );
});

test('P6.291 keeps QuickMatchProductFactory creation and cleanup under one operation', () => {
  const source = readFileSync(
    'packages/arena-product-match/src/quick-match-product-factory.ts',
    'utf8',
  );
  assert.match(source, /#operation: QuickMatchProductFactoryOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#creating|#destroying|#destroyReentryAttempted/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'createCandidateCleanupCapturedBeforeReentryRejection: true',
    'swallowedCreateReentryPreventsRuntimePublication: true',
    'cleanupCallbackCheckedBeforeOwnershipRelease: true',
    'publicPendingReadRejectsOperationIntermediateState: true',
    'destroyRetainsServiceOwnershipAcrossReentry: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runOperation('create'",
    "this.#runOperation('cleanup-retry'",
    "this.#runOperation('pending-cleanup-read'",
    "this.#runOperation('destroy'",
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const createStart = source.indexOf('  create(): ProductMatchRuntime {');
  const retryStart = source.indexOf('  retryPendingCleanup(): void {', createStart);
  const create = source.slice(createStart, retryStart);
  assert.ok(
    create.indexOf("this.#runOperation('create'")
      < create.indexOf('if (this.#destroyRequested || this.#destroyed)'),
  );
  assert.ok(
    create.indexOf('destroyLocalMatch = snapshotLocalMatchDestroy(localMatch)')
      < create.indexOf("this.#assertOperationReady('create')"),
  );
  assert.ok(
    create.lastIndexOf("this.#assertOperationReady('create')")
      < create.indexOf('destroyLocalMatch = null'),
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#destroyed) return'),
  );
  assert.ok(
    destroy.indexOf("this.#assertOperationReady('destroy')")
      < destroy.indexOf('this.#destroyQuickMatchService = null'),
  );
});

test('P6.292 keeps ModeProductSession cleanup ownership behind sequence-sticky reentry', () => {
  const source = readFileSync(
    'packages/arena-product-session/src/mode-product-session-v2.ts',
    'utf8',
  );
  assert.match(source, /#operation: ModeProductSessionV2Operation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesSequenceAndFirstError: true',
    'cleanupCallbacksCheckedBeforeOwnershipRelease: true',
    'swallowedCleanupReentryStopsLaterOwners: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'const reentrySequence = this.#reentrySequence',
    'if (this.#reentrySequence !== reentrySequence) return errors',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const cleanupStart = source.indexOf('  #cleanup(): Error[] {');
  const failStart = source.indexOf('  #fail(error: unknown): never {', cleanupStart);
  const cleanup = source.slice(cleanupStart, failStart);
  assert.ok(
    cleanup.indexOf('if (this.#reentrySequence !== reentrySequence)')
      < cleanup.indexOf('this.#assembler = null'),
  );
  assert.ok(
    cleanup.indexOf('if (this.#reentrySequence !== reentrySequence) return errors')
      < cleanup.indexOf('if (this.#match !== null)'),
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf('if (this.#state === MODE_PRODUCT_SESSION_V2_STATE.DESTROYED) return'),
  );
});

test('P6.293 keeps authoritative Session Runtime cleanup ownership sequence-sticky', () => {
  const source = readFileSync(
    'packages/arena-session/src/mode-authoritative-local-match-session-v3.ts',
    'utf8',
  );
  assert.match(
    source,
    /#operation: ModeAuthoritativeLocalMatchSessionV3Operation \| null = null/u,
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesSequenceAndFirstError: true',
    'runtimeCleanupCheckedBeforeOwnershipRelease: true',
    'swallowedCleanupReentryRetainsRuntimeOwner: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'const reentrySequence = this.#reentrySequence',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const cleanupStart = source.indexOf('  #cleanup(): readonly Error[] {');
  const failStart = source.indexOf('  #fail(error: unknown): never {', cleanupStart);
  const cleanup = source.slice(cleanupStart, failStart);
  assert.ok(
    cleanup.indexOf('if (this.#reentrySequence !== reentrySequence)')
      < cleanup.indexOf('this.#runtime = null'),
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf('this.#state === MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.DESTROYED'),
  );
});

test('P6.294 keeps ModeMatchRuntime Driver and Authority cleanup sequence-sticky', () => {
  const source = readFileSync(
    'packages/arena-match/src/mode-match-runtime-v6.ts',
    'utf8',
  );
  assert.match(source, /#operation: ModeMatchRuntimeV6Operation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesSequenceAndFirstError: true',
    'cleanupCallbacksCheckedBeforeOwnershipRelease: true',
    'swallowedCleanupReentryStopsLaterOwners: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'const reentrySequence = this.#reentrySequence',
    'if (this.#reentrySequence !== reentrySequence) return Object.freeze(errors)',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const cleanupStart = source.indexOf('  #cleanup(): readonly Error[] {');
  const clearStart = source.indexOf('  #clearCommittedRecords(): void {', cleanupStart);
  const cleanup = source.slice(cleanupStart, clearStart);
  assert.ok(
    cleanup.indexOf('if (this.#reentrySequence !== reentrySequence)')
      < cleanup.indexOf('this.#driver = null'),
  );
  assert.ok(
    cleanup.indexOf('if (this.#reentrySequence !== reentrySequence) return Object.freeze(errors)')
      < cleanup.indexOf('if (this.#authority !== null)'),
  );
  assert.ok(
    cleanup.lastIndexOf('if (this.#reentrySequence !== reentrySequence)')
      < cleanup.indexOf('this.#authority = null'),
  );
});

test('P6.295 keeps QuickMatch Bundle publication on sequence-sticky reentry facts', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-quick-match-bundle-factory-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#operation: QuickMatchBundleFactoryOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesSequenceAndFirstError: true',
    'operationGuardPrecedesStateAndRequestValidation: true',
    'sessionOwnershipRetainedUntilBundlePublicationCommits: true',
    'successfulPendingCleanupWatermarkPrecedesReentryRejection: true',
    "this.#assertReentryFree('Quick Match Bundle Factory bundle publication')",
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const createStart = source.indexOf('  createMatchBundle(value: unknown)');
  const destroyStart = source.indexOf('  destroy(): void {', createStart);
  const create = source.slice(createStart, destroyStart);
  assert.ok(
    create.indexOf("this.#assertReentryFree('Quick Match Bundle Factory bundle publication')")
      < create.indexOf('ownedSession = null'),
  );
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf('if (this.#destroyed && this.#pendingCleanup === null) return'),
  );
});

test('P6 shared storage port requires exact own read fields and bounded methods', () => {
  const source = readFileSync(
    'packages/arena-contracts/src/synchronous-storage-port.ts',
    'utf8',
  );
  assert.match(source, /const MAX_STORAGE_PORT_PROTOTYPE_DEPTH = 32/u);
  assert.match(source, /readResultField\(result: object, key: string, label: string\)/u);
  assert.match(source, /readResultRequiresExactOwnEnumerableDataFields: true/u);
  assert.match(source, /sharedSynchronousReturnBoundaryWired: true/u);
  assert.match(source, /validationStatus: 'not-run'/u);
});

test('P6.335 Mode Learning factory checks construction before generation and owner transfer', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-mode-learning-session-factory-candidate-v1.ts',
    'utf8',
  );
  const createStart = source.indexOf('  createSession(value: unknown)');
  const destroyStart = source.indexOf('  destroy(): void {', createStart);
  assert.notEqual(createStart, -1);
  assert.notEqual(destroyStart, -1);
  const create = source.slice(createStart, destroyStart);
  assert.match(create, /const priorCleanupErrors = this\.#releasePendingCleanupResources\(\)/u);
  assert.match(create, /this\.#releaseOrRetain\([\s\S]*HUD-ready session/u);
  assert.match(create, /this\.#releaseOrRetain\([\s\S]*Mode Learning Session Factory bridge/u);
  assert.match(source, /#pendingCleanupResources: PendingCleanupResource\[\] = \[\]/u);
  assert.match(source, /assertSynchronousReturn\(value, name\)/u);
  assert.doesNotMatch(source, /const NATIVE_PROMISE_THEN = Promise\.prototype\.then/u);
  assert.match(source, /preflightArenaV2ModeLearningSessionFactoryDependenciesCandidateV1/u);
  assert.match(source, /dependencyPreflightCapturesBeforeSessionCreation: true/u);
  assert.match(source, /sharedSynchronousReturnBoundaryWired: true/u);
  assert.match(source, /failedConstructionCleanupRetainsRetryOwnership: true/u);
  assert.match(source, /nextCreationClosesHistoricalCleanupDebtFirst: true/u);
  assert.match(source, /outerOwnerMustDestroyFactoryAfterSessionHost: true/u);
  assert.match(source, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(source, /constructionCallbacksCheckedBeforeGenerationCommit: true/u);
  assert.match(source, /cleanupReentryRetainsCurrentAndLaterFactoryOwners: true/u);
  assert.doesNotMatch(source, /#reentryAttempted|#assertReentryFree/u);
  assert.ok(
    create.indexOf("this.#assertCurrentOperationCommit('Mode Learning Session Factory session publication')")
      < create.indexOf('this.#nextGeneration += 1'),
  );
});

test('P6.338 keeps local Match Session callbacks behind frame and cleanup commits', () => {
  const source = readFileSync(
    'packages/arena-session/src/mode-local-match-session-v2.ts',
    'utf8',
  );
  assert.match(source, /#operation: ModeLocalMatchSessionV2Operation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning|#reentryAttempted/u);
  for (const marker of [
    'operationGuardPrecedesStateAndInputValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'runtimeAndControllerCallbacksCheckedBeforeFramePublication: true',
    'publicStateAndReadFrameRejectOperationIntermediateState: true',
    'cleanupReentryRetainsCurrentAndLaterSessionOwners: true',
    'terminalFramePublicationWaitsForRuntimeCallbackClosure: true',
  ]) assert.ok(source.includes(marker));

  const start = source.slice(
    source.indexOf('  start(): ModeLocalMatchSessionV2StartOutcome'),
    source.indexOf('  step(localInput: unknown)', source.indexOf('  start():')),
  );
  assert.ok(
    start.indexOf("this.#callChecked(runtime.start, [], 'ModeLocalMatchSessionV2 runtime start')")
      < start.indexOf('this.#readFrame = outcome.readFrame'),
  );
  const step = source.slice(
    source.indexOf('  step(localInput: unknown)'),
    source.indexOf('  pause(): void {', source.indexOf('  step(localInput: unknown)')),
  );
  assert.ok(step.indexOf('controller.createInput') < step.indexOf('this.#readFrame = outcome.readFrame'));
  assert.ok(step.indexOf('this.#callChecked(runtime.step') < step.indexOf('this.#lastEventSequence'));
  const cleanup = source.slice(
    source.indexOf('  #destroyOwnedPorts()'),
    source.indexOf('  #fail(error: unknown)', source.indexOf('  #destroyOwnedPorts()')),
  );
  assert.ok(
    cleanup.indexOf('if (this.#reentryError !== null)')
      < cleanup.indexOf("'ModeLocalMatchSessionV2 runtime destroy'"),
  );
  const destroy = source.slice(source.indexOf('  destroy(): void {'));
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#state === MODE_LOCAL_MATCH_SESSION_V2_STATE.DESTROYED)'),
  );
});

test('P6.339 keeps authoritative Quick Match construction and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-quick-match/src/mode-authoritative-quick-match-service-v3.ts',
    'utf8',
  );
  assert.match(source, /#operation: 'create' \| 'destroy' \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.match(source, /#pendingCleanupResources: PendingCleanupResource\[\] = \[\]/u);
  assert.doesNotMatch(source, /#reentryAttempted|#assertReentryFree/u);
  for (const marker of [
    'seedRosterContentAndRuntimePortsCheckedBeforeNextOwner: true',
    'createdSessionRetainsCleanupOwnershipUntilSafeReturn: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'failedConstructionCleanupRetainsRetryOwnership: true',
    'cleanupReentryRetainsCurrentAndLaterQuickMatchOwners: true',
  ]) assert.ok(source.includes(marker));

  const create = source.slice(
    source.indexOf('  create(value: unknown)'),
    source.indexOf('  destroy(): void {', source.indexOf('  create(value: unknown)')),
  );
  assert.ok(
    create.indexOf('const priorCleanupErrors = this.#releasePendingCleanupResources()')
      < create.indexOf('this.#nextSeed'),
  );
  assert.ok(
    create.indexOf('session = new ModeAuthoritativeLocalMatchSessionV3')
      < create.indexOf('runtime = null'),
  );
  assert.ok(
    create.indexOf("this.#assertCurrentOperationCommit('ModeAuthoritativeQuickMatchServiceV3 result publication')")
      < create.indexOf('session = null'),
  );
  const cleanup = source.slice(
    source.indexOf('  #releasePendingCleanupResources()'),
    source.indexOf('  create(value: unknown)'),
  );
  assert.ok(cleanup.indexOf('this.#pendingCleanupResources =') < cleanup.indexOf('if (this.#reentryError !== null)'));
});

test('P6.340 keeps Quick Match V2 controller construction and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-quick-match/src/mode-quick-match-service-v2.ts',
    'utf8',
  );
  assert.match(source, /#operation: 'create' \| 'destroy' \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.match(source, /#pendingCleanupResources: PendingCleanupResource\[\] = \[\]/u);
  assert.doesNotMatch(source, /#creating|#reentryAttempted/u);
  for (const marker of [
    'operationGuardPrecedesRequestValidation: true',
    'seedRosterContentRuntimeAndControllerPortsCheckedBeforeNextOwner: true',
    'sessionConstructionOwnsTransferredRuntimeAndControllersOnEntry: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'failedConstructionCleanupRetainsRetryOwnership: true',
    'cleanupReentryRetainsCurrentAndLaterQuickMatchOwners: true',
  ]) assert.ok(source.includes(marker));

  const create = source.slice(
    source.indexOf('  create(value: unknown)'),
    source.indexOf('  destroy(): void {', source.indexOf('  create(value: unknown)')),
  );
  assert.ok(
    create.indexOf('const priorCleanupErrors = this.#releasePendingCleanupResources()')
      < create.indexOf('this.#nextSeed'),
  );
  assert.ok(
    create.indexOf('runtime = null')
      < create.indexOf('session = new ModeLocalMatchSessionV2'),
  );
  assert.ok(
    create.indexOf('controllerResources.length = 0')
      < create.indexOf('session = new ModeLocalMatchSessionV2'),
  );
  assert.ok(
    create.indexOf("this.#assertCurrentOperationCommit('ModeQuickMatchServiceV2 result publication')")
      < create.indexOf('session = null'),
  );
});

test('P6.341 keeps Product Input Router callbacks and sampler ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/product-input-router.ts',
    'utf8',
  );
  assert.match(source, /#operation: string \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.match(source, /#cleanupSamplers: SamplerAdapter\[\] = \[\]/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'samplerCallbacksCheckedBeforeInputStateCommit: true',
    'uiHitAndIntentCallbacksCheckedBeforeRouterCommit: true',
    'cleanupReentryRetainsCurrentAndLaterSamplerOwners: true',
    'gameplaySampleDoesNotChangeActionVocabulary: true',
  ]) assert.ok(source.includes(marker));

  const setMode = source.slice(
    source.indexOf('  setMode(modeValue: unknown)'),
    source.indexOf('  #routePointer(', source.indexOf('  setMode(modeValue: unknown)')),
  );
  assert.ok(
    setMode.indexOf("this.#enter('setMode')")
      < setMode.indexOf("typeof modeValue !== 'string'"),
  );
  const routePointer = source.slice(
    source.indexOf('  #routePointer('),
    source.indexOf('  pointerStart(', source.indexOf('  #routePointer(')),
  );
  assert.ok(
    routePointer.indexOf('point normalization')
      < routePointer.indexOf('sampler[operation](point)'),
  );
  const hit = source.slice(
    source.indexOf('  #hit(point: PresentationInputPoint)'),
    source.indexOf('  #reportIntentRejection(', source.indexOf('  #hit(point: PresentationInputPoint)')),
  );
  assert.ok(
    hit.indexOf('const intent = createProductUiIntent(value)')
      < hit.indexOf('ProductInputRouter UI intent normalization'),
  );
  const replaceSampler = source.slice(
    source.indexOf('  replaceSampler(samplerValue: unknown)'),
    source.indexOf('  getDebugSnapshot()', source.indexOf('  replaceSampler(samplerValue: unknown)')),
  );
  assert.ok(
    replaceSampler.indexOf('replacement normalization')
      < replaceSampler.indexOf('replacement.source === previous.source'),
  );
  assert.ok(
    replaceSampler.indexOf('previous sampler destroy')
      < replaceSampler.indexOf('this.#sampler = replacement'),
  );
  const destroy = source.slice(source.indexOf('  destroy(): void {'));
  assert.ok(
    destroy.indexOf('if (this.#operation !== null)')
      < destroy.indexOf('if (this.#destroyed && this.#sampler === null'),
  );
});

test('P6.342 keeps InputSampler validation, frame publication and cleanup atomic', () => {
  const source = readFileSync(
    'packages/arena-presentation-runtime/src/input-sampler.ts',
    'utf8',
  );
  assert.match(source, /#operation: InputSamplerOperation \| null = null/u);
  assert.match(source, /#operationSequence = 0/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.match(source, /#raw: RawControlState \| null/u);
  assert.match(source, /#gestures: GestureRecognizer \| null/u);
  assert.doesNotMatch(
    source,
    /#validationActive|#validationReentryAttempted|#sampling|#reentryAttempted/u,
  );
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'validationReentryBeforeRawConsumptionRemainsSameTickRetryable: true',
    'rawGestureAndMapperCallbacksCheckedBeforeFramePublication: true',
    'lastTickAdvancesOnlyAfterNormalizedFrameClosure: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'cleanupReentryRetainsCurrentAndLaterInputOwners: true',
    'destroyFailuresRetainRetryOwnership: true',
    'inputActionVocabularyRemainsMovePrimaryAndJump: true',
  ]) assert.ok(source.includes(marker));

  const sample = source.slice(
    source.indexOf('  sample(tickValue: unknown'),
    source.indexOf('  getDebugSnapshot()', source.indexOf('  sample(tickValue: unknown')),
  );
  assert.ok(
    sample.indexOf("this.#runOperation('sample'")
      < sample.indexOf("integerAtLeast(tickValue, 0, 'InputSampler.tick')"),
  );
  assert.ok(
    sample.indexOf('const validationReentry = this.#takeReentryError()')
      < sample.indexOf('raw.consumeSnapshot()'),
  );
  for (const marker of [
    'InputSampler RawControlState consumeSnapshot',
    'InputSampler GestureRecognizer sample',
    "this.#assertCurrentOperationCommit(sequence, 'InputSampler mapper')",
    "this.#assertCurrentOperationCommit(sequence, 'InputSampler mapped semantic input')",
    "this.#assertCurrentOperationCommit(sequence, 'InputSampler normalized frame')",
  ]) assert.ok(sample.includes(marker));
  assert.ok(
    sample.indexOf("this.#assertCurrentOperationCommit(sequence, 'InputSampler normalized frame')")
      < sample.indexOf('this.#lastTick = tick'),
  );
  const destroy = source.slice(source.indexOf('  destroy(): void {'));
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#destroyed && this.#raw === null'),
  );
  assert.ok(
    destroy.indexOf("this.#assertCurrentOperationCommit(sequence, 'InputSampler RawControlState destroy')")
      < destroy.indexOf('this.#raw = null'),
  );
});

test('P6.343 keeps PointerInputAdapter binding, events and deferred destroy atomic', () => {
  const source = readFileSync(
    'packages/arena-presentation-runtime/src/pointer-input-adapter.ts',
    'utf8',
  );
  assert.match(source, /#operation: PointerInputAdapterOperation \| null = null/u);
  assert.match(source, /#operationSequence = 0/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'deferredDestroyRequestPreservesExistingLifecycleSemantics: true',
    'platformSamplerAndEventCallbacksCheckedBeforeStatePublication: true',
    'bindingsPublishOnlyAfterCompleteStartCallbackClosure: true',
    'cleanupReentryRetainsCurrentAndEarlierBindingOwners: true',
    'failedCleanupRetainsRetryOwnership: true',
    'inputActionVocabularyRemainsPointerMovePrimaryAndJump: true',
  ]) assert.ok(source.includes(marker));

  const start = source.slice(
    source.indexOf('  start(): boolean {'),
    source.indexOf('  #stopWithinOperation(', source.indexOf('  start(): boolean {')),
  );
  assert.ok(
    start.indexOf("this.#runOperation('start'")
      < start.indexOf("this.#state === 'destroyed'"),
  );
  assert.ok(
    start.indexOf('cleanups.push(candidate as Cleanup)')
      < start.indexOf('this.#assertStartContinues(sequence)'),
  );
  assert.ok(
    start.indexOf('this.#assertStartContinues(sequence)')
      < start.indexOf("this.#state = 'started'"),
  );
  const cleanup = source.slice(
    source.indexOf('  #cleanup(values: readonly Cleanup[]'),
    source.indexOf('  #assertStartContinues(', source.indexOf('  #cleanup(values: readonly Cleanup[]')),
  );
  assert.ok(
    cleanup.indexOf("'PointerInputAdapter cleanup'")
      < cleanup.indexOf('failed.splice(index, 1)'),
  );
  assert.ok(cleanup.includes('if (this.#reentryError !== null) break'));
  const dispatch = source.slice(
    source.indexOf('  #dispatch('),
    source.indexOf('  #cleanup(', source.indexOf('  #dispatch(')),
  );
  assert.ok(dispatch.includes("this.#runOperation('event'"));
  const destroy = source.slice(source.indexOf('  destroy(): void {'));
  assert.ok(
    destroy.indexOf('this.#destroyRequested = true')
      < destroy.indexOf("this.#runOperation('destroy'"),
  );
});

test('P6.344 keeps Product Match Presentation callbacks and frame publication atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/product-match-presentation-runtime.ts',
    'utf8',
  );
  assert.match(
    source,
    /#operation: ProductMatchPresentationRuntimeOperation \| null = null/u,
  );
  assert.match(source, /#operationSequence = 0/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted|#assertNoSwallowedReentry/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'controllerInputEventAndProjectorCallbacksCheckedBeforeFramePublication: true',
    'publicStateFrameResultAndDebugReadsRejectIntermediateOperations: true',
    'preAuthorityInputFailureRemainsSameTickRetryable: true',
    'terminalResultPublicationWaitsForPostFrameAndProjectionClosure: true',
    'eventWindowDestroyRetainsOwnershipUntilCallbackClosure: true',
    'presentationDoesNotWriteMatchAuthority: true',
  ]) assert.ok(source.includes(marker));

  for (const marker of [
    "this.#runOperation('state-read'",
    "this.#runOperation('frame-read'",
    "this.#runOperation('result-read'",
    "this.#runOperation('debug-read'",
  ]) assert.ok(source.includes(marker));
  const start = source.slice(
    source.indexOf('  start(): unknown {'),
    source.indexOf('  step(): unknown {', source.indexOf('  start(): unknown {')),
  );
  assert.ok(
    start.indexOf("this.#runOperation('start'")
      < start.indexOf('this.#assertUsable()'),
  );
  assert.ok(
    start.indexOf('Product match start validation')
      < start.indexOf('this.#project(sequence'),
  );
  assert.ok(
    start.indexOf('this.#project(sequence')
      < start.indexOf('Product match start publication'),
  );
  const step = source.slice(
    source.indexOf('  step(): unknown {'),
    source.indexOf('  getLastPresentationFrame()', source.indexOf('  step(): unknown {')),
  );
  assert.ok(
    step.indexOf('sampleReturned = true')
      < step.indexOf("rejectThenable(sampledValue, 'ProductMatch inputSource.sample()')"),
  );
  assert.ok(step.includes(
    'sampleStarted && !sampleReturned && !authorityEntered && this.#reentryError === null',
  ));
  assert.ok(
    step.indexOf('Product match post-step validation')
      < step.indexOf('const frame = this.#project('),
  );
  assert.ok(
    step.indexOf('Product match step publication')
      < step.indexOf('this.#lastFrame = frame'),
  );
  const destroy = source.slice(source.indexOf('  destroy(): void {'));
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED'),
  );
  assert.ok(
    destroy.indexOf("'ProductMatch eventWindow.destroy()'")
      < destroy.indexOf('this.#eventWindow = null'),
  );
});

test('P6.345 keeps Product Presentation Flow intent, match and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/product-presentation-flow.ts',
    'utf8',
  );
  assert.match(source, /#operation: ProductPresentationFlowOperation \| null = null/u);
  assert.match(source, /#operationSequence = 0/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.match(source, /#pendingMatchRuntimeCandidate: unknown = null/u);
  assert.doesNotMatch(source, /#reentryAttempted|#assertNoSwallowedReentry/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleIntentAndSnapshotValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'controllerDispatcherAndMatchRuntimeCallbacksCheckedBeforeFlowPublication: true',
    'pendingIntentPublishesAfterDispatcherPromiseCapture: true',
    'asynchronousIntentSettlementUsesIndependentOperation: true',
    'matchFrameResultAndSnapshotPublishAfterCallbackClosure: true',
    'failedMatchRuntimeConstructionRetainsRetryOwnership: true',
    'cleanupReentryRetainsCurrentAndLaterFlowOwners: true',
    'destroyFailuresRetainRetryOwnership: true',
    'flowDoesNotWriteMatchAuthorityOrAddProductScreens: true',
  ]) assert.ok(source.includes(marker));

  for (const marker of [
    "this.#run('state-read'",
    "this.#run('synchronize'",
    "this.#run('stepMatch'",
    "this.#run('heartbeat'",
    "this.#run('hide'",
    "this.#run('show'",
    "this.#run('snapshot-read'",
    "this.#run('destroy'",
  ]) assert.ok(source.includes(marker));
  const create = source.slice(
    source.indexOf('  #createAndStartMatch('),
    source.indexOf('  #captureResult(', source.indexOf('  #createAndStartMatch(')),
  );
  assert.ok(
    create.indexOf('this.#pendingMatchRuntimeCandidate = candidate')
      < create.indexOf('ProductPresentationFlow match runtime factory'),
  );
  assert.ok(
    create.indexOf('this.#matchRuntime = runtime')
      < create.indexOf('const frame = runtime.start()'),
  );
  assert.ok(create.includes('if (this.#reentryError === null)'));
  const dispatch = source.slice(
    source.indexOf('  dispatch(intentValue: unknown)'),
    source.indexOf('  stepMatch()', source.indexOf('  dispatch(intentValue: unknown)')),
  );
  assert.ok(
    dispatch.indexOf("this.#run('dispatch'")
      < dispatch.indexOf('createProductUiIntent(intentValue)'),
  );
  assert.ok(
    dispatch.indexOf('const dispatched = dispatcher.dispatch(intent)')
      < dispatch.indexOf('this.#pendingIntent = operation'),
  );
  assert.ok(dispatch.includes("this.#run('intent-settlement'"));
  const step = source.slice(
    source.indexOf('  stepMatch()'),
    source.indexOf('  heartbeat()', source.indexOf('  stepMatch()')),
  );
  assert.ok(
    step.indexOf('ProductPresentationFlow match step')
      < step.indexOf('this.#lastMatchFrame = frame'),
  );
  const destroy = source.slice(source.indexOf('  destroy(): void {'));
  assert.ok(
    destroy.indexOf("this.#run('destroy'")
      < destroy.indexOf('this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED'),
  );
  assert.ok(
    source.indexOf('ProductPresentationFlow match runtime destroy')
      < source.indexOf('this.#matchRuntime = null'),
  );
  assert.ok(
    destroy.indexOf('ProductPresentationFlow dispatcher destroy')
      < destroy.indexOf('this.#dispatcher = null'),
  );
});

test('P6.346 keeps Product Session State Machine transitions and reads atomic', () => {
  const source = readFileSync(
    'packages/arena-product-state/src/product-session-state-machine.ts',
    'utf8',
  );
  assert.match(source, /#operation: ProductSessionStateMachineOperation \| null = null/u);
  assert.match(source, /#operationSequence = 0/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning|#reentryAttempted/u);
  for (const marker of [
    "this.#run('state-read'",
    "this.#run('active-state-read'",
    "this.#run('snapshot-read'",
    "this.#run('dispatch'",
    "this.#run('suspend'",
    "this.#run('resume'",
    "this.#run('fail-recoverable'",
    "this.#run('retry'",
    "this.#run('fail-fatal'",
    "this.#run('destroy'",
    'operationGuardPrecedesLifecycleEventAndReadValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'registryResolveCheckedBeforeStateMutation: true',
    'publicStateActiveStateAndSnapshotReadsRejectIntermediateTransitions: true',
    'revisionAndLastTransitionPublishWithStateMutation: true',
    'reentryFailsClosedToFatalErrorWithoutSyntheticTransition: true',
    'transitionVocabularyAndRecoveryStatesRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const dispatch = source.slice(
    source.indexOf('  dispatch(eventIdValue: unknown)'),
    source.indexOf('  suspend():', source.indexOf('  dispatch(eventIdValue: unknown)')),
  );
  assert.ok(
    dispatch.indexOf("this.#run('dispatch'")
      < dispatch.indexOf("assertNonEmptyString("),
  );
  assert.ok(
    dispatch.indexOf('this.#registry.resolve(eventId, activeFrom)')
      < dispatch.indexOf('this.#state = definition.toState'),
  );
  const finish = source.slice(
    source.indexOf('  #finishOperation('),
    source.indexOf('  #run<T>(', source.indexOf('  #finishOperation(')),
  );
  assert.ok(
    finish.indexOf('this.#state = PRODUCT_SESSION_STATE.FATAL_ERROR')
      < finish.indexOf('this.#operation = null'),
  );
  const destroy = source.slice(source.indexOf('  destroy(): ProductSessionStateSnapshot'));
  assert.ok(
    destroy.indexOf("this.#run('destroy'")
      < destroy.indexOf('this.#state === PRODUCT_SESSION_STATE.DESTROYED'),
  );
});

test('P6.347 keeps Product Session Controller ports, promises and cleanup atomic', () => {
  const source = readFileSync(
    'packages/arena-product-session/src/product-session-controller.ts',
    'utf8',
  );
  assert.match(source, /#operation: ProductSessionControllerOperation \| null = null/u);
  assert.match(source, /#operationSequence = 0/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning|#runTransition/u);
  for (const marker of [
    "this.#runOperation('state-read'",
    "this.#runOperation('boot-request'",
    "this.#runOperation('boot-profile-settlement'",
    "this.#runOperation('boot-profile-failure'",
    "this.#runOperation('match-prepare-start'",
    "this.#runOperation('match-prepare-settlement'",
    "this.#runOperation('match-prepare-failure'",
    "this.#runOperation('begin-match'",
    "this.#runOperation('step-match'",
    "this.#runOperation('renew-profile-lease'",
    "this.#runOperation('commit-reward'",
    "this.#runOperation('destroy'",
    "this.#runOperation('snapshot-read'",
    'operationGuardPrecedesLifecycleIntentAndReadValidation: true',
    'stickyAuthoritativeReentryUsesMonotonicSequenceAndFirstError: true',
    'diagnosticObservationReentryIsContainedWithoutProductMutation: true',
    'profileMatchRewardAndStateCallbacksCheckedBeforeControllerPublication: true',
    'bootAndMatchPreparationPublishSinglePromiseOwnersBeforeSettlement: true',
    'asynchronousSettlementUsesIndependentOperations: true',
    'publicStateFrameAndSnapshotReadsRejectIntermediateOperations: true',
    'reentryPublishesFatalStateBeforeStoppingCrossOwnerProgress: true',
    'cleanupReentryRetainsCurrentAndLaterControllerOwners: true',
    'destroyFailuresRetainExactRetryOwnership: true',
    'productStatesIntentsMatchAuthorityAndRewardSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const boot = source.slice(
    source.indexOf('  #boot(): Promise<ProductSessionSnapshot>'),
    source.indexOf('  openCharacterSelect():', source.indexOf('  #boot():')),
  );
  assert.ok(
    boot.indexOf('const operation: Promise<ProductSessionSnapshot>')
      < boot.indexOf('this.#bootPromise = operation'),
  );
  assert.ok(
    boot.indexOf('this.#dispatch(PRODUCT_SESSION_EVENT.PROFILE_LOADED)')
      < boot.indexOf('this.#profileSnapshot = normalizedProfile'),
  );
  const prepare = source.slice(
    source.indexOf('  #prepareMatch(options: PrepareMatchOptions)'),
    source.indexOf('  requestMatch():', source.indexOf('  #prepareMatch(')),
  );
  assert.ok(
    prepare.indexOf('const operation: Promise<ProductSessionSnapshot>')
      < prepare.indexOf('this.#matchRequestPromise = operation'),
  );
  const reward = source.slice(
    source.indexOf('  commitReward(): ProductSessionSnapshot'),
    source.indexOf('  continueReward():', source.indexOf('  commitReward():')),
  );
  assert.ok(
    reward.indexOf('ProductSession MatchCoordinator.release()')
      < reward.indexOf('this.#profileSnapshot = outcome.profile'),
  );
  assert.ok(
    reward.indexOf('this.#dispatch(PRODUCT_SESSION_EVENT.REWARD_COMMITTED)')
      < reward.indexOf('this.#rewardSnapshot = outcome.reward'),
  );
  const destroy = source.slice(source.indexOf('  destroy(): ProductSessionSnapshot'));
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('this.#stateMachineCleanupPending'),
  );
  assert.ok(
    destroy.indexOf('if (this.#reentryError !== null)')
      < destroy.indexOf('if (this.#profileCleanupPending)'),
  );
});

test('P6.348 keeps Product Presentation Session frame callbacks and deferred destroy atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/product-presentation-session.ts',
    'utf8',
  );
  assert.match(source, /#frameOperation: 'frame' \| null/u);
  assert.match(source, /#frameOperationSequence: number/u);
  assert.match(source, /#frameReentrySequence: number/u);
  assert.match(source, /#frameReentryError: Error \| null/u);
  assert.doesNotMatch(source, /#processingFrame|#frameReentryAttempted/u);
  for (const marker of [
    "this.#guardFrameReentry('state')",
    "this.#guardFrameReentry('dispatch')",
    "this.#guardFrameReentry('setPaused')",
    "this.#guardFrameReentry('getLastSnapshot')",
    "this.#guardFrameReentry('getPerformanceSnapshot')",
    "this.#guardFrameReentry('getDebugSnapshot')",
    'ProductPresentationSession frame resize',
    'ProductPresentationSession frame heartbeat',
    'ProductPresentationSession frame accumulator',
    'ProductPresentationSession frame match steps',
    'ProductPresentationSession frame publication',
    'ProductPresentationSession frame completion',
    'frameGuardPrecedesTimestampDeltaAndLifecycleValidation: true',
    'stickyFrameReentryUsesMonotonicSequenceAndFirstError: true',
    'frameCallbacksCheckedBeforeLaterFramePublication: true',
    'publicStateSnapshotPerformanceAndDebugReadsRejectFrameIntermediateState: true',
    'swallowedFrameReentryFailsSessionClosed: true',
    'destroyDuringFrameRemainsDeferredUntilFrameClosure: true',
    'frameFailureCleanupRemainsDeferredUntilFrameOwnershipRelease: true',
    'renderingInputTickAndHeartbeatSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const frame = source.slice(
    source.indexOf('  #onFrame(timestamp: number, deltaSeconds: number)'),
    source.indexOf('  #resizeRenderer():', source.indexOf('  #onFrame(')),
  );
  assert.ok(
    frame.indexOf('const sequence = this.#beginFrameOperation()')
      < frame.indexOf('Number.isFinite(timestamp)'),
  );
  assert.ok(
    frame.indexOf('this.#assertFrameOperationCommit(sequence,')
      < frame.indexOf('return !this.#hidden'),
  );
  assert.ok(
    frame.indexOf('this.#frameOperation = null')
      < frame.indexOf('this.#fail(reentryError)'),
  );
  const destroy = source.slice(source.indexOf('  destroy(): void {'));
  assert.ok(
    destroy.indexOf('if (this.#frameOperation !== null)')
      < destroy.indexOf('const errors = this.#cleanupResources()'),
  );
});

test('P6.349 keeps Product Presentation Session cleanup ownership retryable and ordered', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/product-presentation-session.ts',
    'utf8',
  );
  assert.match(source, /#cleanupOperation: 'cleanup' \| null/u);
  assert.match(source, /#cleanupOperationSequence: number/u);
  assert.match(source, /#cleanupReentrySequence: number/u);
  assert.match(source, /#cleanupReentryError: Error \| null/u);
  assert.doesNotMatch(source, /#cleaningUp/u);
  for (const marker of [
    "this.#guardCleanupReentry('state')",
    "this.#guardCleanupReentry('start')",
    "this.#guardCleanupReentry('dispatch')",
    "this.#guardCleanupReentry('setPaused')",
    "this.#guardCleanupReentry('getLastSnapshot')",
    "this.#guardCleanupReentry('getPerformanceSnapshot')",
    "this.#guardCleanupReentry('getDebugSnapshot')",
    "this.#guardCleanupReentry('destroy')",
    'const sequence = this.#beginCleanupOperation()',
    'this.#callCleanup(sequence, cleanup, label)',
    'retainedCleanupOrder.push(...cleanupOrder.slice(index + 1))',
    'cleanupGuardPrecedesDestroyIdempotenceAndPublicReads: true',
    'stickyCleanupReentryUsesMonotonicSequenceAndFirstError: true',
    'cleanupCallbacksCheckedBeforeOwnershipRelease: true',
    'cleanupReentryRetainsCurrentAndLaterSessionOwners: true',
    'bindingAndCandidateCleanupRetainUnprocessedReverseOrderOwners: true',
    'performanceProbeCleanupChecksClockStopSnapshotAndDestroyCallbacks: true',
    'ordinaryCleanupFailuresRemainExactRetryOwners: true',
    'cleanupCompletionClearsNonOwnerPresentationStateOnlyAfterAllOwnerClasses: true',
    'renderingInputTickHeartbeatAndDestroyRetrySemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const cleanup = source.slice(
    source.indexOf('  #cleanupResources(): unknown[]'),
    source.indexOf('  #completeFailureCleanup():', source.indexOf('  #cleanupResources():')),
  );
  assert.ok(
    cleanup.indexOf('this.#callCleanup(')
      < cleanup.indexOf('this.#frameLoop = null'),
  );
  assert.ok(
    cleanup.indexOf('if (reentered()) return errors')
      < cleanup.indexOf('this.#inputAdapter.destroy'),
  );
  assert.ok(
    cleanup.indexOf('this.#flow.destroy')
      < cleanup.indexOf('this.#inputRouter.destroy'),
  );
  assert.ok(
    cleanup.indexOf('this.#inputRouter.destroy')
      < cleanup.indexOf('this.#controller.destroy'),
  );
  const destroy = source.slice(source.indexOf('  destroy(): void {'));
  assert.ok(
    destroy.indexOf("this.#guardCleanupReentry('destroy')")
      < destroy.indexOf('this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED'),
  );
});

test('P6.350 keeps Product Presentation Session startup owners segmented and fail closed', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/product-presentation-session.ts',
    'utf8',
  );
  assert.match(source, /#startupSegment: ProductPresentationStartupSegment \| null/u);
  assert.match(source, /#startupSegmentSequence: number/u);
  assert.match(source, /#startupReentrySequence: number/u);
  assert.match(source, /#startupReentryError: Error \| null/u);
  for (const marker of [
    "this.#runStartupSegment('renderer-construction'",
    "this.#runStartupSegment('product-assembly'",
    "this.#runStartupSegment('input-start'",
    "this.#runStartupSegment('interactive-publication'",
    "this.#guardStartupReentry('state')",
    "this.#guardStartupReentry('dispatch')",
    "this.#guardStartupReentry('setPaused')",
    "this.#guardStartupReentry('getLastSnapshot')",
    "this.#guardStartupReentry('getPerformanceSnapshot')",
    "this.#guardStartupReentry('getDebugSnapshot')",
    "this.#guardStartupReentry('host-callback')",
    "this.#guardStartupReentry('owned-error-callback')",
    'this.#containObservation(() => shouldSampleResources())',
    'startPromisePublishesBeforeAnyFactoryInvocation: true',
    'startupUsesRendererAssemblyInputAndInteractiveSegments: true',
    'stickyStartupReentryUsesMonotonicSequenceAndFirstError: true',
    'startupCallbacksCheckedBeforeCrossSegmentPublication: true',
    'destroyDuringStartupSegmentDefersUntilSegmentClosure: true',
    'destroyBetweenAsyncSegmentsPreventsLaterOwnerPublication: true',
    'observationalCallbacksCannotOwnProductLifecycle: true',
    'startupFailureRetainsCandidateCleanupOwnership: true',
    'renderingInputTickHeartbeatAndProductSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const start = source.slice(
    source.indexOf('  start(): Promise<this>'),
    source.indexOf('  #startFrameLoop():', source.indexOf('  start(): Promise<this>')),
  );
  assert.ok(start.indexOf('Promise.resolve()') < start.indexOf('.then(() => this.#initialize())'));
  assert.ok(start.indexOf('.then(() => this.#initialize())') < start.indexOf('this.#startPromise = operation'));
  const destroy = source.slice(source.indexOf('  destroy(): void {'));
  assert.ok(
    destroy.indexOf('if (this.#startupSegment !== null)')
      < destroy.indexOf('const errors = this.#cleanupResources()'),
  );
});

test('P6.351 keeps Product Renderer load, frame and cleanup publication atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/product-renderer.ts',
    'utf8',
  );
  assert.match(source, /#operation: ProductRendererOperation \| null/u);
  assert.match(source, /#operationSequence: number/u);
  assert.match(source, /#reentrySequence: number/u);
  assert.match(source, /#reentryError: Error \| null/u);
  assert.doesNotMatch(source, /#rendering/u);
  for (const marker of [
    "this.#runOperation('state-read'",
    "this.#runOperation('load-request'",
    "this.#runOperation('load-gameplay-launch'",
    "this.#runOperation('load-ui-launch'",
    "this.#runOperation('load-publication'",
    "this.#runOperation('render'",
    "this.#runOperation('resize'",
    "this.#runOperation('context-lost'",
    "this.#runOperation('context-restored'",
    "this.#runOperation('dispose'",
    'loadPromisePublishesBeforeChildLoadInvocation: true',
    'asynchronousLoadUsesGameplayUiAndPublicationSegments: true',
    'contextLossAndDisposeRemainAvailableBetweenAsyncLoadSegments: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeCrossChildAndStatePublication: true',
    'publicStateDebugAndPerformanceReadsRejectIntermediateOperations: true',
    'cleanupReentryRetainsCurrentAndLaterRendererOwners: true',
    'ordinaryCleanupFailureRetainsExactRetryOwner: true',
    'frameCompositionContextAndCleanupOrderRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const load = source.slice(
    source.indexOf('  load() {'),
    source.indexOf('  render(', source.indexOf('  load() {')),
  );
  assert.ok(load.indexOf('Promise.resolve()') < load.indexOf('.then(() => this.#performLoad('));
  assert.ok(load.indexOf('.then(() => this.#performLoad(') < load.indexOf('this.#loadPromise = operation'));
  const render = source.slice(
    source.indexOf('  render(frameValue:'),
    source.indexOf('  resize(', source.indexOf('  render(frameValue:')),
  );
  assert.ok(
    render.indexOf('ProductRenderer.uiSurface.render()')
      < render.indexOf('ProductRenderer.gameplayRenderer.renderComposite()'),
  );
  const dispose = source.slice(source.indexOf('  dispose() {'));
  assert.ok(
    dispose.indexOf('ProductRenderer.uiSurface.dispose()')
      < dispose.indexOf('if (this.#reentryError === null)'),
  );
  assert.ok(
    dispose.indexOf('if (this.#reentryError === null)')
      < dispose.indexOf('ProductRenderer.gameplayRenderer.dispose()'),
  );
});

test('P6.352 keeps Product Canvas UI paint, reads and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/product-canvas-ui-surface.ts',
    'utf8',
  );
  assert.match(source, /#operation: ProductCanvasUiSurfaceOperation \| null/u);
  assert.match(source, /#operationSequence = 0/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#operating|#operationName|#reentryDetected/u);
  for (const marker of [
    "this.#runOperation('state-read'",
    "this.#runOperation('load'",
    "this.#runOperation('render'",
    "this.#runOperation('resize'",
    "this.#runOperation('input-viewport-read'",
    "this.#runOperation('ui-hit-test'",
    "this.#runOperation('intent-bind'",
    "this.#runOperation('composite-read'",
    "this.#runOperation('present'",
    "this.#runOperation('debug-read'",
    "this.#runOperation('dispose'",
    'ProductCanvasUiSurface paint transform',
    'ProductCanvasUiSurface paint clear',
    'ProductCanvasUiSurface paint scene',
    'ProductCanvasUiSurface render publication',
    'ProductCanvasUiSurface resize publication',
    'allPublicLifecycleAndReadsUseSingleOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'canvasCallbacksCheckedBeforeTextureModelAndViewportPublication: true',
    'rendererCallbackCheckedBeforePresentCompletion: true',
    'publicStateViewportCompositeAndDebugReadsRejectIntermediateOperations: true',
    'failClosedCleanupRetainsBindingLeaseAndSceneOwnersForRetry: true',
    'cleanupReentryRetainsCurrentAndLaterSurfaceOwners: true',
    'ordinaryCleanupFailureRetainsExactRetryOwner: true',
    'layoutPaintHitIntentAndCompositeSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const cleanup = source.slice(
    source.indexOf('  #disposeResources('),
    source.indexOf('  #failClosed(', source.indexOf('  #disposeResources(')),
  );
  assert.ok(
    cleanup.indexOf('ProductCanvasUiSurface binding cleanup()')
      < cleanup.indexOf('ProductCanvasUiSurface resourceLease.dispose()'),
  );
  assert.ok(
    cleanup.indexOf('ProductCanvasUiSurface resourceLease.dispose()')
      < cleanup.indexOf('ProductCanvasUiSurface scene.clear()'),
  );
  assert.ok(cleanup.includes('cleanupReentered = this.#reentrySequence !== reentrySequence'));
});

test('P6.353 keeps Presentation Frame Loop token, delivery and deferred lifecycle atomic', () => {
  const source = readFileSync(
    'packages/arena-presentation-runtime/src/presentation-frame-loop.ts',
    'utf8',
  );
  assert.match(source, /#operation: PresentationFrameLoopOperation \| null = null/u);
  assert.match(source, /#operationSequence = 0/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.match(source, /#pendingFrameSequence: number \| null = null/u);
  assert.doesNotMatch(source, /#scheduling|#delivering|#cancelling|#hasPendingFrame/u);
  for (const marker of [
    "this.#runOperation('start'",
    "this.#runOperation('deliver'",
    "this.#runOperation('stop'",
    "this.#runOperation('debug-read'",
    "this.#runOperation('destroy'",
    'this.#pendingFrameSequence !== frameSequence',
    "this.#operation === 'start' || this.#operation === 'deliver'",
    'this.#applyDeferredCommand(sequence, \'start\')',
    'this.#applyDeferredCommand(sequence, \'deliver\')',
    'PresentationFrameLoop requestFrame',
    'PresentationFrameLoop frame clock',
    'PresentationFrameLoop callback',
    'requestCancelDeliveryAndPublicReadsUseSingleOperationOwner: true',
    'pendingFramesUseGenerationAndMonotonicFrameSequenceIdentity: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'requestAndCancelCallbacksCheckedBeforeTokenOrStatePublication: true',
    'clockAndFrameCallbacksCheckedBeforeTimestampAndNextFramePublication: true',
    'stopAndDestroyDuringDeliveryDeferUntilCallbackClosure: true',
    'diagnosticObserverCannotOwnFrameLoopLifecycle: true',
    'duplicateLateAndCancelledCallbacksCannotClearNewerFrameOwner: true',
    'cadenceDeltaClampAndFailureContainmentRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));
});

test('P6.354 keeps default Web Product UI intent dispatch single-owner and stale-safe', () => {
  const source = readFileSync('src/entry/web-product-ui-surface.ts', 'utf8');
  assert.match(source, /#dispatchOwner: IntentDispatchOwner \| null/u);
  assert.match(source, /#dispatchSequence: number/u);
  assert.doesNotMatch(source, /#dispatching/u);
  for (const marker of [
    'const owner = Object.freeze({ sequence: dispatchSequence, intent })',
    'this.#dispatchOwner = owner',
    '.then(() => {',
    'this.#dispatchOwner !== owner',
    'this.#settleIntentDispatch(owner, onRejected, null)',
    'this.#settleIntentDispatch(owner, onRejected, error)',
    'this.#dispatchOwner = null',
    'intentOwnerPublishesBeforeSessionHandlerInvocation: true',
    'dispatchUsesMonotonicSequenceAndObjectIdentity: true',
    'duplicateClicksCannotCreateParallelIntentOwners: true',
    'staleSuccessAndFailureSettlementsCannotMutateCurrentUi: true',
    'disposeInvalidatesPendingIntentBeforeDomCleanup: true',
    'rejectionObserverCannotReplaceIntentOwner: true',
    'interactiveControlsDeriveDisabledStateFromOwnerIdentity: true',
    'sceneLayoutHitAndIntentSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const dispose = source.slice(source.indexOf('  dispose(): void {'));
  assert.ok(
    dispose.indexOf('this.#dispatchOwner = null')
      < dispose.indexOf('const bindingOwner = this.#bindingOwner'),
  );
});

test('P6.355 closes default Web Product UI lifecycle, DOM publication and retry owners', () => {
  const source = readFileSync('src/entry/web-product-ui-surface.ts', 'utf8');
  assert.doesNotMatch(source, /#bindingCleanup/u);
  for (const marker of [
    "this.#runOperation('state-read'",
    "this.#runOperation('load'",
    "this.#runOperation('render'",
    "this.#runOperation('resize'",
    "this.#runOperation('input-viewport-read'",
    "this.#runOperation('hit-test'",
    "this.#runOperation('present'",
    "this.#runOperation('composite-read'",
    "this.#runOperation('intent-bind'",
    "this.#runOperation('intent-unbind'",
    "this.#runOperation('intent-launch'",
    "this.#runOperation('intent-settlement'",
    "this.#runOperation('debug-read'",
    "this.#runOperation('dispose'",
    'WebProductUiSurface render base DOM commit',
    'WebProductUiSurface render interactive DOM commit',
    'this.#lastRenderKey = renderKey',
    'const bindingOwner = this.#bindingOwner',
    'this.#releaseBindingOwner(sequence, \'dispose\', bindingOwner)',
    'this.#state = WEB_PRODUCT_UI_SURFACE_STATE.DISPOSE_INCOMPLETE',
    'allPublicLifecycleAndReadsUseSingleOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'domCallbacksCheckedBeforeRenderIdentityPublication: true',
    'renderIdentityPublishesOnlyAfterCompleteDomCommit: true',
    'bindingListenerPublishesOnlyAfterHostRegistration: true',
    'bindingCleanupRetainsFailedListenerOwnerForRetry: true',
    'intentLaunchAndSettlementUseSeparateSynchronousSegments: true',
    'intentDomFailureInvalidatesRenderIdentityForFullRetry: true',
    'disposeInvalidatesIntentBeforeBindingAndDomCleanup: true',
    'disposeFailuresRetainExactBindingRootAndCanvasOwners: true',
    'screenLayoutAccessibilityIntentAndGameplayVisibilityRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const render = source.slice(
    source.indexOf('  render(viewModel: ProductSessionViewModel): boolean {'),
    source.indexOf('  resize(viewport:', source.indexOf('  render(viewModel:')),
  );
  assert.ok(
    render.indexOf('WebProductUiSurface render interactive DOM commit')
      < render.lastIndexOf('this.#lastRenderKey = renderKey'),
  );
});

test('P6.356 closes Web pagehide binding, observation and retryable cleanup ownership', () => {
  const source = readFileSync(
    'packages/arena-platform-runtime/src/web-game-teardown.ts',
    'utf8',
  );
  for (const marker of [
    'class WebGameTeardownOwner',
    "this.#runOperation('bind'",
    "this.#runOperation('cleanup'",
    "this.#runOperation('pagehide'",
    'Web teardown state publication',
    'Web teardown addEventListener',
    'this.#cleanupOwned(sequence, \'bind\', true)',
    'Web teardown state ownership read',
    'Web teardown state release',
    'hostCleanupPublishesBeforeListenerRegistration: true',
    'allBindingCleanupAndPagehideCallbacksUseSingleOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'hostCallbacksCheckedBeforeOwnershipPublicationOrRelease: true',
    'failedRegistrationRollbackRetainsReachableCleanupDebt: true',
    'failedRemovalRetainsExactListenerAndStateOwnersForRetry: true',
    'staleCleanupCompletesBeforeReplacementBinding: true',
    'pagehideStopObserverCannotOwnBindingLifecycle: true',
    'bfcacheAndRealNavigationBehaviorRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const bind = source.slice(
    source.indexOf('  bind(): Cleanup {'),
    source.indexOf('\n  }\n}', source.indexOf('  bind(): Cleanup {')),
  );
  assert.ok(
    bind.indexOf('Web teardown state publication')
      < bind.indexOf('Web teardown addEventListener'),
  );
});

test('P6.357 closes launch coordinator async segments, stale settlement and cleanup debt', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/launch-game.ts', 'utf8');
  assert.doesNotMatch(source, /state\.transitioning\s*=\s*true/u);
  for (const marker of [
    'operation: StartupCoordinatorOperation | null',
    'operationSequence: number',
    'reentrySequence: number',
    'reentryError: Error | null',
    'observationDepth: number',
    "runCoordinatorOperation(state, 'begin-generation'",
    "'platform-launch'",
    "'candidate-adoption'",
    "'start-launch'",
    "'start-settlement'",
    "'failure-publication'",
    "runCoordinatorOperation(state, 'retire-record'",
    'launchGame platform Promise publication',
    'launchGame game capability capture',
    'state.starting = record',
    'launchGame start Promise publication',
    'launchGame current game exposure',
    'destroyOwnedChecked(state, sequence, operation, record)',
    'state.pendingCleanup = records.filter((record) => !record.destroyed)',
    'lifecycleUsesHostScopedMonotonicOperationOwner: true',
    'legacyTransitioningFieldIsMigrationOnly: true',
    'platformCandidateStartAndSettlementUseSeparateSynchronousSegments: true',
    'platformAndStartPromisesPublishBeforeAwait: true',
    'gameCapabilitiesPublishToStartingBeforeStartInvocation: true',
    'destroyCallbacksCheckedBeforeDestroyedAndCleanupOwnerRelease: true',
    'stickyReentryStopsCrossOwnerCleanupAndRetainsPendingDebt: true',
    'staleAsyncSettlementsCannotPublishCurrentGame: true',
    'successAndFailureObserversCannotOwnCoordinatorLifecycle: true',
    'replacementStopAndDebugExposureBehaviorRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const begin = source.slice(
    source.indexOf('function beginGeneration('),
    source.indexOf('function retireRecord(', source.indexOf('function beginGeneration(')),
  );
  assert.ok(
    begin.indexOf('state.pendingCleanup = records.filter')
      < begin.indexOf('exposeGame(root, null)'),
  );
});

test('P6.358 closes Web Platform listener registration and cleanup ownership', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebListenerOwner',
    "this.#runOperation('bind'",
    "this.#runOperation('cleanup'",
    'this.#owned = true',
    'this.#removeOwned(sequence, \'bind\', true)',
    'cleanups.push(owner.cleanup)',
    'owner.bind(required)',
    "'pointerdown',\n          inputOwner.start",
    "listen(cleanups, env.windowObject, 'resize'",
    "listen(cleanups, env.documentObject, 'visibilitychange'",
    'cleanupOwnerPublishesToBatchBeforeHostRegistration: true',
    'eachListenerBindAndCleanupUsesMonotonicOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'addAndRemoveCallbacksCheckedBeforeOwnershipCommit: true',
    'failedRegistrationRollsBackSameListenerIdentity: true',
    'failedRemovalRetainsExactListenerOwnerForRetry: true',
    'batchRollbackUsesReverseRegistrationOrder: true',
    'resizeShowHideAndInputShareTheSameListenerBoundary: true',
    'pointerMappingEventVocabularyAndCallbackOrderRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const listen = source.slice(
    source.indexOf('function listen('),
    source.indexOf('class WebCleanupBatchOwner', source.indexOf('function listen(')),
  );
  assert.ok(listen.indexOf('cleanups.push(owner.cleanup)') < listen.indexOf('owner.bind(required)'));
});

test('P6.359 closes Web ResizeObserver registration, rollback and cleanup ownership', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebResizeObserverOwner',
    "this.#runOperation('observe'",
    "this.#runOperation('cleanup'",
    'this.#owned = true',
    'this.#disconnectOwned(sequence, \'observe\', true)',
    'const observerOwner = new WebResizeObserverOwner(observe, disconnect, canvas)',
    'cleanups.push(observerOwner.cleanup)',
    'observerOwner.observe()',
    'cleanupOwnerPublishesBeforeObserveInvocation: true',
    'observeAndDisconnectUseMonotonicOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'observeAndDisconnectCallbacksCheckedBeforeOwnershipCommit: true',
    'failedObserveRollsBackTheSameObserverIdentity: true',
    'failedDisconnectRetainsExactObserverOwnerForBatchRetry: true',
    'ordinaryObserveFailureKeepsWindowResizeFallback: true',
    'observerRollbackFailureClosesTheWholeResizeBinding: true',
    'viewportSizingNotificationAndFallbackBehaviorRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));
  assert.doesNotMatch(source, /let observerActive = true/u);

  assert.ok(
    source.indexOf('cleanups.push(observerOwner.cleanup)')
      < source.indexOf('observerOwner.observe()'),
  );
});

test('P6.360 closes Web Platform binding cleanup batches and reentrant cross-owner progress', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  assert.doesNotMatch(source, /function cleanupAll\(/u);
  for (const marker of [
    'class WebCleanupBatchOwner',
    "this.#runOperation('rollback'",
    "this.#runOperation('cleanup'",
    'const cleanups = [...this.#cleanups].reverse()',
    'if (this.#reentryError !== null) break',
    'this.#completed = true',
    'const cleanupBatch = new WebCleanupBatchOwner(cleanups)',
    "cleanupBatch.rollback('[web] input binding rollback')",
    "this.#cleanupBatch.cleanup('[web] input binding')",
    "cleanupBatch.rollback('[web] resize binding rollback')",
    "cleanupBatch.rollback('[web] show binding rollback')",
    "cleanupBatch.rollback('[web] hide binding rollback')",
    'this.#cleanupBatch.cleanup(`[web] ${this.#label} binding`)',
    'inputResizeShowAndHideUseDedicatedCleanupBatchOwners: true',
    'rollbackAndPublicCleanupUseMonotonicOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCleanupReturnsCheckedBeforeCrossOwnerProgress: true',
    'ordinaryChildFailuresContinueIndependentReverseCleanup: true',
    'reentrantChildFailureStopsCrossOwnerCleanup: true',
    'successfulChildrenRemainIdempotentDuringRetry: true',
    'batchCompletionPublishesOnlyAfterEveryChildConfirmsRelease: true',
    'registrationOrderPublicCleanupAndEventBehaviorRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));
});

test('P6.361 closes Web pointer input events, deferred cleanup and callback ownership', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebPointerInputBindingOwner',
    "this.#runOperation('start'",
    "this.#runOperation('move'",
    "this.#runOperation('end'",
    "this.#runOperation('cancel'",
    "this.#runOperation('cleanup'",
    'this.#cleanupRequested = true',
    "if (operation !== 'cleanup' && this.#cleanupRequested)",
    'this.#pressedPointers.add(pointerId)',
    'this.#pressedPointers.delete(pointerId)',
    'this.#onStart(normalized)',
    'this.#onMove(normalized)',
    'this.#onEnd(normalized)',
    'this.#onCancel(normalized)',
    'inputOwner.deactivateForRollback()',
    'return inputOwner.cleanup',
    'pointerStartMoveEndCancelAndCleanupUseSingleOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'pointerIdGestureCaptureNormalizationAndCallbacksCheckedBeforeProgress: true',
    'startFailureRollsBackPressedPointerAndCaptureHint: true',
    'endAndCancelCommitPressedPointerRemovalBeforeCallback: true',
    'eventCleanupRequestsDeferUntilCurrentEventClosure: true',
    'cleanupClearsInputStateBeforeReverseBindingCleanup: true',
    'callbackThenablesAndNestedEventsFailClosed: true',
    'directionJumpPrimaryMappingAndPointerCoordinatesRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const bindInput = source.slice(
    source.indexOf('bindInput: (bindingsValue: unknown = {}) => {'),
    source.indexOf('onResize: (callback) => {'),
  );
  assert.doesNotMatch(bindInput, /const (start|move|end|cancel) = \(event: HostObject\)/u);
  assert.ok(
    bindInput.indexOf('const inputOwner = new WebPointerInputBindingOwner({')
      < bindInput.indexOf("'pointerdown',\n          inputOwner.start"),
  );
});

test('P6.362 closes Web resize and visibility notification observation ownership', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebNotificationBindingOwner',
    "this.#runOperation('notify'",
    "this.#runOperation('unconditional-notify'",
    "this.#runOperation('cleanup'",
    'this.#cleanupRequested = true',
    "if (operation !== 'cleanup' && this.#cleanupRequested)",
    '() => this.#condition()',
    '() => this.#callback()',
    "label: 'resize'",
    "label: 'show'",
    "label: 'hide'",
    "condition: () => !env.documentObject.hidden",
    "condition: () => Boolean(env.documentObject.hidden)",
    "listen(cleanups, env.windowObject, 'resize', notificationOwner.notify)",
    'observer = new ResizeObserverConstructor(observerNotify) as HostObject',
    'observerNotificationFailure ??= error',
    'if (observerNotificationFailure !== null) throw observerNotificationFailure',
    "listen(cleanups, env.windowObject, 'pageshow', notificationOwner.notify)",
    "'pagehide',\n          notificationOwner.notifyUnconditionally",
    "listen(cleanups, env.windowObject, 'blur', notificationOwner.notifyUnconditionally)",
    'notificationOwner.deactivateForRollback()',
    'return notificationOwner.cleanup',
    'resizeShowAndHideEachUseSingleNotificationOwner: true',
    'conditionalAndUnconditionalNotificationsUseMonotonicOperations: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'visibilityConditionAndCallbackCheckedBeforeProgress: true',
    'callbackCleanupRequestsDeferUntilCurrentNotificationClosure: true',
    'cleanupDeactivatesNotificationBeforeReverseBindingCleanup: true',
    'callbackThenablesAndNestedNotificationsFailClosed: true',
    'resizeObserverAndWindowResizeShareTheSameNotificationOwner: true',
    'visibilityPageFocusBlurVocabularyAndConditionsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const notificationBindings = source.slice(
    source.indexOf('onResize: (callback) => {'),
    source.indexOf('createAudio: () => {'),
  );
  assert.doesNotMatch(notificationBindings, /let active = true/u);
  assert.doesNotMatch(notificationBindings, /const (notify|handler|pageHide) = \(/u);
});

test('P6.363 closes Web storage serialization, host callback and reentry ownership', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebStorageOperationOwner',
    "this.#runOperation('read'",
    "this.#runOperation('write'",
    "this.#runOperation('delete'",
    "() => this.#getItem?.(key)",
    'const serialized = JSON.stringify(value)',
    "this.#assertCommit(sequence, 'write', '[web] storage JSON.stringify')",
    '() => this.#setItem?.(key, serialized)',
    '() => this.#removeItem?.(key)',
    'const parsed: unknown = JSON.parse(value)',
    'const storageOwner = new WebStorageOperationOwner({',
    'const storageRead = storageOwner.read',
    'const storageWrite = storageOwner.write',
    'const storageDelete = storageOwner.delete',
    'readWriteAndDeleteUseSingleStorageOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'hostCallbacksAndThenablesCheckedBeforeResultCommit: true',
    'stringifyAccessorsCheckedBeforeSetItem: true',
    'swallowedNestedStorageCallsFailTheOuterOperationClosed: true',
    'readFailureReturnsNotOkAndMutationFailureReturnsFalse: true',
    'storageKeysJsonShapeAndPublicResultSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const storageOwner = source.slice(
    source.indexOf('class WebStorageOperationOwner'),
    source.indexOf('function parseInputBindings'),
  );
  assert.ok(
    storageOwner.indexOf("this.#assertCommit(sequence, 'write', '[web] storage JSON.stringify')")
      < storageOwner.indexOf('() => this.#setItem?.(key, serialized)'),
  );
  const platformFactory = source.slice(source.indexOf('export function createWebPlatform('));
  assert.doesNotMatch(platformFactory, /const storage(Read|Write|Delete) = \(/u);
});

test('P6.364 closes Web viewport DOM reads, coercion and snapshot publication ownership', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebViewportReadOwner',
    "this.#runOperation('read'",
    "'documentElement',\n        '[web] viewport documentElement'",
    "'clientWidth',\n          '[web] viewport document width'",
    "'innerWidth',\n          '[web] viewport window width'",
    "'clientWidth',\n          '[web] viewport canvas width'",
    "'width',\n          '[web] viewport rect width'",
    "'clientHeight',\n          '[web] viewport document height'",
    "'innerHeight',\n          '[web] viewport window height'",
    "'clientHeight',\n          '[web] viewport canvas height'",
    "'height',\n          '[web] viewport rect height'",
    "'devicePixelRatio',\n            '[web] viewport pixel ratio'",
    "this.#assertCommit(sequence, 'read', '[web] viewport snapshot publication')",
    'const viewportOwner = new WebViewportReadOwner({',
    'getViewport: viewportOwner.read',
    'eachViewportSnapshotUsesSingleReadOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'domCanvasReadsAndNumericCoercionsCheckedBeforeProgress: true',
    'swallowedNestedViewportReadsFailTheOuterSnapshotClosed: true',
    'canvasRectFailureKeepsTheExistingFallbackChain: true',
    'rectCanvasWindowDocumentPriorityRemainsUnchanged: true',
    'pixelRatioStillDefaultsToOneAndCapsAtTwo: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const viewportOwner = source.slice(
    source.indexOf('class WebViewportReadOwner'),
    source.indexOf('function parseInputBindings'),
  );
  assert.ok(viewportOwner.indexOf('const documentWidth =') < viewportOwner.indexOf('const windowWidth ='));
  assert.ok(viewportOwner.indexOf('const windowWidth =') < viewportOwner.indexOf('const canvasWidth ='));
  assert.ok(viewportOwner.indexOf('const canvasWidth =') < viewportOwner.indexOf('const width ='));
  const platformFactory = source.slice(source.indexOf('export function createWebPlatform('));
  assert.doesNotMatch(platformFactory, /getViewport: \(\) => \{/u);
});

test('P6.365 closes Web asset fetch, response and bytes settlement request ownership', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebAssetReadRequestOwner',
    'class WebAssetReadService',
    "'fetch-start',\n        'created',\n        'fetch-pending'",
    "'fetch-settlement',\n        'fetch-pending',\n        'response-ready'",
    "'bytes-start',\n        'response-ready',\n        'bytes-pending'",
    "'bytes-settlement',\n        'bytes-pending',\n        'completed'",
    'const response = await responseValue',
    'const bytes = await bytesValue',
    'const arrayBuffer = optionalMethod(responseObject, \'arrayBuffer\')',
    'if (!(bytes instanceof ArrayBuffer))',
    'this.#phase = nextPhase',
    'this.#requestSequence += 1',
    "const fetchHost = optionalMethod(env.root, 'fetch')",
    "?? optionalMethod(env.windowObject, 'fetch')",
    'const assetReadService = new WebAssetReadService(fetchHost ?? undefined)',
    'const readAssetBytes = assetReadService.read',
    'eachAssetRequestUsesUniqueMonotonicIdentity: true',
    'concurrentIndependentAssetRequestsRemainAllowed: true',
    'fetchAndBytesStartAndSettlementUseFourOwnedSegments: true',
    'eachSegmentRequiresTheExactPriorPhase: true',
    'responsePortIsCapturedBeforeArrayBufferInvocation: true',
    'onlyCompletedRequestMayPublishArrayBufferBytes: true',
    'assetPathRestrictionAndArrayBufferContractRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const requestOwner = source.slice(
    source.indexOf('class WebAssetReadRequestOwner'),
    source.indexOf('class WebAssetReadService'),
  );
  assert.ok(requestOwner.indexOf("'fetch-start'") < requestOwner.indexOf('await responseValue'));
  assert.ok(requestOwner.indexOf("'fetch-settlement'") < requestOwner.indexOf("'bytes-start'"));
  assert.ok(requestOwner.indexOf("'bytes-start'") < requestOwner.indexOf('await bytesValue'));
  assert.ok(requestOwner.indexOf("'bytes-settlement'") < requestOwner.indexOf('return bytes'));
  const platformFactory = source.slice(source.indexOf('export function createWebPlatform('));
  assert.doesNotMatch(platformFactory, /const readAssetBytes = async/u);
});

test('P6.366 closes Web share pending publication, duplicate calls and stale settlement', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebShareOperationOwner',
    'if (this.#pending !== null) return Promise.resolve(false)',
    'this.#pending = pending',
    "this.#runOperation('start'",
    'const result = this.#shareHost?.(payload)',
    "this.#assertCommit(sequence, 'start', '[web] share host invocation')",
    'Promise.resolve(shareResult).then(',
    '() => this.#settle(pending, true)',
    '() => this.#settle(pending, false)',
    'if (this.#pending !== pending) return',
    "this.#runOperation('settlement'",
    'this.#pending = null',
    'pending.resolve(result)',
    'const shareOwner = new WebShareOperationOwner(shareHost ?? undefined)',
    'share: shareOwner.share',
    'pendingOwnerPublishesBeforeHostShareInvocation: true',
    'oneShareRequestMayBePendingAtATime: true',
    'startAndSettlementUseMonotonicOperations: true',
    'stickySynchronousReentryFailsTheCurrentRequestClosed: true',
    'concurrentDuplicateShareReturnsFalseWithoutReplacingOwner: true',
    'staleSettlementCannotReleaseOrPublishANewerRequest: true',
    'hostFailureAndMissingCapabilityStillReturnFalse: true',
    'sharePayloadAndSuccessBooleanSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const shareOwner = source.slice(
    source.indexOf('class WebShareOperationOwner'),
    source.indexOf('function parseInputBindings'),
  );
  assert.ok(shareOwner.indexOf('this.#pending = pending') < shareOwner.indexOf('this.#shareHost?.(payload)'));
  assert.ok(shareOwner.indexOf('if (this.#pending !== pending) return') < shareOwner.indexOf('this.#pending = null'));
  const platformFactory = source.slice(source.indexOf('export function createWebPlatform('));
  assert.doesNotMatch(platformFactory, /share: async \(payload\)/u);
});

test('P6.367 closes Web performance clock and vibration synchronous host ownership', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebClockReadOwner',
    'class WebVibrationOperationOwner',
    "this.#runOperation('read'",
    "() => this.#performanceNow?.()",
    "return this.#callChecked(sequence, () => Date.now(), '[web] Date.now fallback')",
    "this.#runOperation('vibrate'",
    "const result = this.#vibrateHost(kind === 'heavy' ? 40 : 18)",
    "rejectThenable(result, '[web] navigator.vibrate')",
    'const clockOwner = new WebClockReadOwner(performanceNow ?? undefined)',
    'const vibrationOwner = new WebVibrationOperationOwner(vibrateHost ?? undefined)',
    'const now = clockOwner.read',
    'vibrate: vibrationOwner.vibrate',
    'performanceClockAndVibrationUseIndependentOperationOwners: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'performanceNowReturnAndThenableCheckedBeforePublication: true',
    'clockFailureStillFallsBackToWallTime: true',
    'vibrationReturnAndThenableCheckedBeforeSuccess: true',
    'vibrationFailureAndMissingCapabilityStillReturnFalse: true',
    'lightAndHeavyDurationsRemainEighteenAndFortyMilliseconds: true',
    'frameSchedulerClockAndPublicNowShareTheSameOwner: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const platformFactory = source.slice(source.indexOf('export function createWebPlatform('));
  assert.doesNotMatch(platformFactory, /const now = \(\) => \{/u);
  assert.doesNotMatch(platformFactory, /vibrate: \(kind = 'light'\) => \{/u);
  assert.ok(platformFactory.indexOf('const now = clockOwner.read') < platformFactory.indexOf('createFrameScheduler({'));
});

test('P6.368 closes Web image, audio and offscreen canvas factory ownership', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebMediaFactoryOperationOwner',
    "this.#runOperation('create-image'",
    "this.#runOperation('create-audio'",
    "this.#runOperation('create-offscreen-canvas'",
    "() => createElement('img')",
    "() => createElement('canvas')",
    "() => normalizeCanvasSize(width, height, 'web')",
    "() => sizeCanvas(canvas, size.width, size.height, 'web')",
    "if (this.#reentryError !== null) throw error",
    'const mediaFactoryOwner = new WebMediaFactoryOperationOwner(env)',
    'createOffscreenCanvas: mediaFactoryOwner.createOffscreenCanvas',
    'createImage: mediaFactoryOwner.createImage',
    'createAudio: mediaFactoryOwner.createAudio',
    'imageAudioAndOffscreenCanvasUseSingleFactoryOwner: true',
    'eachFactoryCallUsesMonotonicNamedOperation: true',
    'stickyCrossFactoryReentryFailsTheOuterConstructionClosed: true',
    'constructorsAndDomFallbacksCheckedBeforePublication: true',
    'offscreenSizeNormalizationAndSizingCheckedBeforePublication: true',
    'blockedOffscreenCanvasStillFallsBackToDomCanvas: true',
    'imageAndAudioFailureStillReturnNull: true',
    'canvasSizeRulesAndMediaFactoryVocabularyRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  assert.doesNotMatch(source, /function createOffscreenCanvas\(/u);
  const platformFactory = source.slice(source.indexOf('export function createWebPlatform('));
  assert.doesNotMatch(platformFactory, /createImage: \(\) => \{/u);
  assert.doesNotMatch(platformFactory, /createAudio: \(\) => \{/u);
});

test('P6.369 closes Web main Canvas fallback ownership and WebGL2 context publication', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebMainCanvasCreationOwner',
    'class WebGlContextOperationOwner',
    "() => querySelector('#game')",
    "() => prepareCanvas(selectedCanvas, 'web') as HostObject",
    "() => createElement('canvas')",
    'const rollback = remove',
    'appendAttempted = true',
    '() => appendChild(createdCanvas)',
    "() => prepareCanvas(createdCanvas, 'web') as HostObject",
    'if (!rollback) throw cause',
    "'[web] 备用 Canvas 创建失败且DOM回滚不完整。'",
    "const context = getRequiredWebGL2Context(canvas, attributes, 'web')",
    "rejectThenable(context, '[web] WebGL2 context')",
    'const mainCanvasOwner = new WebMainCanvasCreationOwner(env)',
    'const canvas = mainCanvasOwner.create()',
    'const webGlContextOwner = new WebGlContextOperationOwner()',
    'getWebGLContext: webGlContextOwner.create',
    'mainCanvasCreationAndWebGlContextUseIndependentOwners: true',
    'existingSelectedCanvasRemainsBorrowedAndIsNeverRemoved: true',
    'fallbackRollbackPortCapturedBeforeAppendWhenAvailable: true',
    'appendOrPreparationFailureUsesTheSameCandidateRollback: true',
    'minimalHostsWithoutRemovalKeepLegacySuccessfulCreation: true',
    'mainCanvasPublishesOnlyAfterPrepareCanvasCompletes: true',
    'webGlContextPublishesOnlyAfterRequiredWebGl2Validation: true',
    'webGl2AndValidatedLegacyTokenFallbackRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  assert.doesNotMatch(source, /function mainCanvasFrom\(/u);
  const mainCanvasOwner = source.slice(
    source.indexOf('class WebMainCanvasCreationOwner'),
    source.indexOf('class WebGlContextOperationOwner'),
  );
  assert.ok(mainCanvasOwner.indexOf('const rollback = remove') < mainCanvasOwner.indexOf('appendAttempted = true'));
  assert.ok(mainCanvasOwner.indexOf('appendAttempted = true') < mainCanvasOwner.indexOf('() => appendChild(createdCanvas)'));
});

test('P6.370 closes Web wall clock ownership without changing frame scheduler semantics', () => {
  const source = readFileSync('packages/arena-platform-runtime/src/web-platform.ts', 'utf8');
  for (const marker of [
    'class WebWallClockReadOwner',
    "this.#runOperation('read'",
    "rejectThenable(value, '[web] wall clock')",
    "throw new TypeError('[web] wall clock 必须返回有限数字。')",
    'readonly #wallNow: HostCallback',
    "() => this.#wallNow(), '[web] wall clock fallback'",
    'const wallClockOwner = new WebWallClockReadOwner(Date.now.bind(Date))',
    'wallClockOwner.read,',
    'wallNow: wallClockOwner.read',
    'requestFrame: frames.requestFrame',
    'cancelFrame: frames.cancelFrame',
    'wallClockUsesIndependentMonotonicReadOwner: true',
    'dateNowPortIsCapturedOnceDuringPlatformConstruction: true',
    'wallClockReturnAndThenableCheckedBeforePublication: true',
    'publicWallNowAndPerformanceFallbackShareTheSameOwner: true',
    'frameSchedulerAndPublicNowStillShareThePerformanceClockOwner: true',
    'frameSchedulerTokenAndLegalCallbackRescheduleSemanticsRemainUnchanged: true',
    'wallClockVocabularyAndMillisecondUnitsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));

  const platformFactory = source.slice(source.indexOf('export function createWebPlatform('));
  assert.doesNotMatch(platformFactory, /wallNow: \(\) => Date\.now\(\)/u);
  assert.ok(
    platformFactory.indexOf('const wallClockOwner = new WebWallClockReadOwner')
      < platformFactory.indexOf('const clockOwner = new WebClockReadOwner'),
  );
});

test('P6 information composition preflights learning dependencies before bundle ownership', () => {
  const source = readFileSync(
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
    'utf8',
  );
  const classStart = source.indexOf(
    'export class ArenaThreeModeAuthoritativeInformationHostCandidateV1',
  );
  const metadataStart = source.indexOf(
    'export const ARENA_THREE_MODE_AUTHORITATIVE_INFORMATION_HOST_CANDIDATE_V1',
    classStart,
  );
  assert.notEqual(classStart, -1);
  assert.notEqual(metadataStart, -1);
  const informationHost = source.slice(classStart, metadataStart);
  const preflight = informationHost.indexOf(
    'preflightArenaV2ModeLearningSessionFactoryDependenciesCandidateV1({',
  );
  const bundleFactory = informationHost.indexOf(
    'const bundleFactory: ArenaThreeModeInformationHostBundleFactoryPortCandidateV1',
  );
  assert.notEqual(preflight, -1);
  assert.notEqual(bundleFactory, -1);
  assert.equal(preflight < bundleFactory, true);
  assert.match(source, /dependencyPreflightCompletesBeforeBundleFactoryConstruction: true/u);
});

test('P6 information mode session host retries only incomplete session and navigation owners', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-information-mode-session-host-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /assertSynchronousReturn\(value, name\)/u);
  assert.doesNotMatch(source, /const NATIVE_PROMISE_THEN = Promise\.prototype\.then/u);
  assert.match(source, /#navigationDestroyed = false/u);
  assert.match(source, /#pendingSessionDestroy: PortMethod \| null = null/u);
  assert.match(source, /if \(!this\.#navigationDestroyed\)/u);
  assert.match(source, /this\.#navigationDestroyed = true/u);
  assert.match(source, /#cleanupComplete\(\): boolean/u);
  assert.match(source, /this\.#session === null/u);
  assert.match(source, /this\.#pendingSessionDestroy === null/u);
  assert.match(source, /&& this\.#navigationDestroyed/u);
  const constructorStart = source.indexOf('  constructor(value: unknown) {');
  const constructorEnd = source.indexOf('\n  get state', constructorStart);
  const constructor = source.slice(constructorStart, constructorEnd);
  assert.equal(
    constructor.indexOf("'createSession'")
      < constructor.indexOf('new ArenaV2InformationNavigationSessionV1({ registry })'),
    true,
  );
  assert.match(source, /sessionFactoryPortPreflightsBeforeNavigationConstruction: true/u);
  assert.match(source, /cleanupRetriesOnlyIncompleteSessionAndNavigationOwners: true/u);
  assert.match(source, /terminalStateWaitsForSessionAndNavigationOwners: true/u);
  assert.match(source, /returnedSessionDestroyCapturedBeforeBusinessPortTransfer: true/u);
  assert.match(source, /failedPortCaptureRetainsPendingSessionCleanupOwnership: true/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'navigationSessionAndProjectionCallbacksCheckedBeforeHostCommit: true',
    'cleanupReentryRetainsCurrentAndLaterSessionOwners: true',
  ]) assert.ok(source.includes(marker));

  const cleanupStart = source.indexOf('  #destroySession():');
  const failStart = source.indexOf('  #fail(error:', cleanupStart);
  const cleanup = source.slice(cleanupStart, failStart);
  const sessionDestroy = cleanup.indexOf("'Information Mode Session Host session destroy'");
  const navigationDestroy = cleanup.indexOf('this.#navigation.destroy();');
  assert.ok(sessionDestroy
    < cleanup.indexOf('this.#assertCurrentOperationCommit(', sessionDestroy));
  assert.ok(navigationDestroy
    < cleanup.indexOf('this.#assertCurrentOperationCommit(', navigationDestroy));
});

test('P6 HUD-ready session retains its audited projection until child cleanup completes', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-hud-ready-learning-mode-session-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /assertSynchronousReturn\(value, name\)/u);
  assert.doesNotMatch(source, /const NATIVE_PROMISE_THEN = Promise\.prototype\.then/u);
  assert.match(source, /#cleanupStarted = false/u);
  assert.match(source, /#sessionDestroyed = false/u);
  assert.match(source, /#cleanupSession\(operation: string, failureMessage: string\): Error\[\]/u);
  assert.match(source, /#completeTerminalCleanup\(\): void/u);
  const failStart = source.indexOf('  #failProjection(error: unknown): never {');
  const cleanupStart = source.indexOf('  #cleanupSession(', failStart);
  assert.notEqual(failStart, -1);
  assert.notEqual(cleanupStart, -1);
  const failProjection = source.slice(failStart, cleanupStart);
  assert.doesNotMatch(failProjection, /this\.#presentationProjection = null/u);
  assert.match(source, /if \(!this\.#sessionDestroyed\) return/u);
  assert.match(source, /this\.#presentationProjection = null/u);
  assert.match(source, /failedProjectionRetainsLastAuditedProjectionUntilChildCleanup: true/u);
  assert.match(source, /cleanupRetriesSameChildOwner: true/u);
  assert.match(source, /terminalStateWaitsForChildSession: true/u);
  assert.match(source, /constructorTransfersChildOnlyAfterPublicInfoAndPortsValidate: true/u);
  assert.match(source, /constructionFailureLeavesChildOwnershipWithCaller: true/u);
  const constructorStart = source.indexOf('  constructor(value: unknown) {');
  const constructorEnd = source.indexOf('\n  #child()', constructorStart);
  const constructor = source.slice(constructorStart, constructorEnd);
  assert.doesNotMatch(constructor, /\.destroy/u);
  assert.equal(
    constructor.indexOf('createProductPublicMatchInfoV2(')
      < constructor.indexOf('captureSession('),
    true,
  );
});

test('P6.332 keeps Learning settlement recovery monotonic and post-processing isolated', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-learning-settlement-recovery-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#operation: LearningSettlementRecoveryOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning|#reentryAttempted/u);
  assert.match(source, /operationGuardPrecedesBusinessValidation: true/u);
  assert.match(source, /currentProfileReadReentryFailsBeforeRecoveryCommit: true/u);
  assert.match(source, /postProcessingReentryRecordedWithoutReopeningSettlement: true/u);
  assert.match(source, /publicReadsRejectOperationIntermediateState: true/u);
  assert.match(source, /destroyFastPathChecksOperationBeforeIdempotence: true/u);
  assert.match(source, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(source, /authoritativeProfileReadCheckedBeforeRecoveryCommit: true/u);
  assert.match(
    source,
    /nonAuthoritativePostProcessingReentryRemainsRecordedAtMostOnce: true/u,
  );

  const runOperationStart = source.indexOf('  #runOperation<T>(');
  const assertReentryStart = source.indexOf('  #assertCurrentOperationCommit(', runOperationStart);
  assert.notEqual(runOperationStart, -1);
  assert.notEqual(assertReentryStart, -1);
  const runOperation = source.slice(runOperationStart, assertReentryStart);
  assert.ok(
    runOperation.indexOf('if (this.#operation !== null) this.#rejectReentry(operation)')
      < runOperation.indexOf('return callback()'),
  );

  const recoverStart = source.indexOf('  #recover():');
  const finalizeStart = source.indexOf('  #finalize(', recoverStart);
  const recover = source.slice(recoverStart, finalizeStart);
  assert.ok(
    recover.indexOf('const currentProfile = this.#readCurrentProfile()')
      < recover.indexOf("this.#assertCurrentOperationCommit('Arena Learning当前Profile读取')"),
  );
  assert.ok(
    recover.indexOf("this.#assertCurrentOperationCommit('Arena Learning当前Profile读取')")
      < recover.indexOf('recoverArenaV2DuplicateLearningSettlementProjectionV1({'),
  );

  const finalizeEnd = source.indexOf('\n  assertCanStartMatch(): void {', finalizeStart);
  const finalize = source.slice(finalizeStart, finalizeEnd);
  assert.ok(
    finalize.indexOf('this.#postProcessed = true')
      < finalize.indexOf('this.#onSettlementFinalized(settlement, grant)'),
  );
  assert.ok(
    finalize.indexOf('this.#onSettlementFinalized(settlement, grant)')
      < finalize.indexOf("this.#assertCurrentOperationCommit('Arena Learning结算后处理')"),
  );
  assert.match(finalize, /this\.#lastPostProcessingError = this\.#reentryError \?\? error/u);

  for (const marker of [
    "this.#runOperation('settlement-read'",
    "this.#runOperation('pending-baseline-read'",
    "this.#runOperation('recovery-read'",
    "this.#runOperation('snapshot-read'",
  ]) assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#destroyed) return'),
  );
});

test('P6.333 keeps settlement intent callbacks behind durable journal watermarks', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-learning-settlement-intent-journal-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#operation: LearningSettlementIntentJournalOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#mutating|#reentryAttempted|#assertReentryFree/u);
  for (const marker of [
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'leaseStorageAndProfilePortsCheckedBeforeCrossOwnerProgress: true',
    'durableWriteAndDeleteReadbackPrecedesReentryRejection: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'leaseStorageAndProfileCallbacksCheckedBeforeJournalCommit: true',
    'cleanupReentryRetainsCurrentAndLaterJournalOwners: true',
    'publicSnapshotRejectsOperationIntermediateState: true',
    'destroyWatermarkPrecedesReentryRejection: true',
  ]) assert.ok(source.includes(marker));

  const writeConfirmedStart = source.indexOf('  #writeConfirmed(');
  const deleteConfirmedStart = source.indexOf('  #deleteConfirmed(', writeConfirmedStart);
  const openStart = source.indexOf('  open():', deleteConfirmedStart);
  const writeConfirmed = source.slice(writeConfirmedStart, deleteConfirmedStart);
  const deleteConfirmed = source.slice(deleteConfirmedStart, openStart);
  assert.match(writeConfirmed, /confirmed = this\.#readStored\(\)/u);
  assert.match(writeConfirmed, /this\.#assertCurrentOperationCommit\('Arena Learning结算意图台账写入确认'\)/u);
  assert.match(deleteConfirmed, /remaining = this\.#readStored\(\)/u);
  assert.match(deleteConfirmed, /this\.#assertCurrentOperationCommit\('Arena Learning结算意图台账删除确认'\)/u);

  const captureStart = source.indexOf('  captureMatchStartBaseline(');
  const preparedStart = source.indexOf('  capturePreparedSettlementIntent(', captureStart);
  const capture = source.slice(captureStart, preparedStart);
  assert.ok(
    capture.indexOf('this.#pending = next')
      < capture.indexOf("this.#assertCurrentOperationCommit('Arena Learning结算意图台账开局基线发布')"),
  );
  const recoverStart = source.indexOf('  recoverPending(');
  const acknowledgeStart = source.indexOf('  acknowledge(', recoverStart);
  const recover = source.slice(recoverStart, acknowledgeStart);
  assert.ok(
    recover.indexOf("'Arena Learning结算意图台账Reward Profile读取'")
      < recover.indexOf('rewardService.getSnapshot()'),
  );
  assert.ok(
    recover.indexOf("'Arena Learning结算意图台账Learning Profile读取'")
      < recover.indexOf('learningService.commitGrant('),
  );
  assert.match(source, /getSnapshot\(\)[\s\S]*this\.#runOperation\('snapshot-read'/u);
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf("if (this.#lifecycle === 'destroyed') return"),
  );
  assert.ok(destroy.indexOf('this.#leaseValue().destroy()') < destroy.indexOf('this.#lease = null'));
  assert.ok(destroy.indexOf('this.#lease = null') < destroy.indexOf("this.#lifecycle = 'destroyed'"));
});

test('P6.386 rejects Replay-bound Result drift before the first Reward write', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-learning-settlement-intent-journal-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /rejectsSameResultDifferentReplayBindingBeforeRewardWrite: true/u);
  const envelopeStart = source.indexOf('function envelope(');
  const validateEnvelopeStart = source.indexOf('function validateEnvelope(', envelopeStart);
  const envelope = source.slice(envelopeStart, validateEnvelopeStart);
  assert.ok(
    envelope.indexOf('getArenaV2LearningResultGrantIdV1(learningGrant.grantId)')
      < envelope.indexOf('const committedResultGrantId = baselineProfile.committedGrantIds.find'),
  );
  assert.ok(
    envelope.indexOf('const committedResultGrantId = baselineProfile.committedGrantIds.find')
      < envelope.indexOf('同一Result已绑定不同Replay结算身份'),
  );
  const captureStart = source.indexOf('  capturePreparedSettlementIntent(');
  const recoverStart = source.indexOf('  recoverPending(', captureStart);
  const capture = source.slice(captureStart, recoverStart);
  assert.ok(capture.indexOf('const next = envelope(') < capture.indexOf('this.#writeConfirmed(next)'));

  const intentTest = readFileSync(
    'packages/arena-product-composition/test/arena-v2-learning-settlement-intent-journal-candidate-v1.test.ts',
    'utf8',
  );
  assert.match(intentTest, /different Replay binding for an already committed Result/u);
  assert.match(intentTest, /multiWeaponGrants/u);
  assert.match(intentTest, /committedGrantIds\.filter/u);
});

test('P6.337 keeps Reward Profile repository reentry sticky through CAS readback', () => {
  const source = readFileSync(
    'packages/arena-profile-service/src/player-profile-service.ts',
    'utf8',
  );
  assert.match(source, /#operation: PlayerProfileServiceOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning|#reentryAttempted|#assertNoReentry/u);
  for (const marker of [
    'operationGuardPrecedesStateAndInputValidation: true',
    'repositoryPortsCheckedBeforeBusinessProgress: true',
    'ambiguousCompareAndSetReadbackCommitsBeforeReentryRejection: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'repositoryCallbacksCheckedBeforeProfilePublication: true',
    'destroyCallbackConfirmedBeforeOwnershipRelease: true',
    'publicStateAndSnapshotsRejectOperationIntermediateState: true',
    'destroyWatermarkPrecedesReentryRejection: true',
  ]) assert.ok(source.includes(marker));

  assert.match(source, /get state\(\)[\s\S]*this\.#runOperation\('state-read'/u);
  const openStart = source.indexOf('  open(): PlayerProfile {');
  const snapshotStart = source.indexOf('  getSnapshot(): PlayerProfile {', openStart);
  const open = source.slice(openStart, snapshotStart);
  assert.ok(
    open.indexOf("this.#runOperation('open'")
      < open.indexOf('this.#state === PLAYER_PROFILE_SERVICE_STATE.DESTROYED'),
  );
  assert.ok(
    open.indexOf('this.#repositoryOrThrow().open()')
      < open.indexOf("this.#assertCurrentOperationCommit('打开')"),
  );

  const commitStart = source.indexOf('  #commit(');
  const commitEnd = source.indexOf('\n  open(): PlayerProfile {', commitStart);
  const commit = source.slice(commitStart, commitEnd);
  assert.ok(
    commit.indexOf('repository.compareAndSet(next, before.revision)')
      < commit.indexOf("this.#assertCurrentOperationCommit('CAS提交', true)"),
  );
  assert.ok(
    commit.indexOf('this.#profile = published')
      < commit.indexOf("this.#assertCurrentOperationCommit('CAS异常后读回', true)"),
  );
  for (const marker of [
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('last-known-snapshot-read'",
    "this.#runOperation('renew-lease'",
    "this.#runOperation('select-character'",
    "this.#runOperation('commit-progression-grant'",
  ]) assert.ok(source.includes(marker));
  const destroyStart = source.indexOf('  destroy(): void {');
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('this.#state === PLAYER_PROFILE_SERVICE_STATE.DESTROYED'),
  );
  assert.ok(
    destroy.indexOf("this.#assertCurrentOperationCommit('销毁')")
      < destroy.indexOf('this.#repository = null'),
  );
});

test('P6.336 keeps Learning Profile repository reentry sticky through CAS readback', () => {
  const source = readFileSync(
    'packages/arena-profile-service/src/arena-v2-learning-profile-service-v1.ts',
    'utf8',
  );
  assert.match(
    source,
    /#operation: ArenaV2LearningProfileServiceOperationV1 \| null = null/u,
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning|#reentryAttempted|#assertNoReentry/u);
  for (const marker of [
    'operationGuardPrecedesStateAndGrantValidation: true',
    'repositoryPortsCheckedBeforeCrossOwnerProgress: true',
    'ambiguousCompareAndSetReadbackCommitsBeforeReentryRejection: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'repositoryCallbacksCheckedBeforeProfilePublication: true',
    'destroyCallbackConfirmedBeforeOwnershipRelease: true',
    'publicStateAndSnapshotsRejectOperationIntermediateState: true',
    'destroyWatermarkPrecedesReentryRejection: true',
  ]) assert.ok(source.includes(marker));

  const runStart = source.indexOf('  #runOperation<T>(');
  const assertStart = source.indexOf('  #assertCurrentOperationCommit(', runStart);
  const runOperation = source.slice(runStart, assertStart);
  assert.ok(
    runOperation.indexOf('if (this.#operation !== null) this.#rejectReentry(operation)')
      < runOperation.indexOf('return callback()'),
  );
  const openStart = source.indexOf('  open(): ArenaV2LearningProfileV1 {');
  const snapshotStart = source.indexOf('  getSnapshot(): ArenaV2LearningProfileV1 {', openStart);
  const open = source.slice(openStart, snapshotStart);
  assert.ok(
    open.indexOf("this.#runOperation('open'")
      < open.indexOf("this.#state === 'destroyed'"),
  );
  const commitStart = source.indexOf('  commitGrant(grantValue: unknown)');
  const destroyStart = source.indexOf('  destroy(): void {', commitStart);
  const commit = source.slice(commitStart, destroyStart);
  assert.ok(
    commit.indexOf("this.#runOperation('commit-grant'")
      < commit.indexOf('advanceArenaV2LearningProfileV1('),
  );
  const reentrantReadbackStart = commit.indexOf('if (this.#reentryError !== null) {');
  const reentrantReadbackEnd = commit.indexOf('let commit: PlainRecord;', reentrantReadbackStart);
  const reentrantReadback = commit.slice(reentrantReadbackStart, reentrantReadbackEnd);
  assert.ok(
    reentrantReadback.indexOf('this.#repositoryValue().getSnapshot()')
      < reentrantReadback.indexOf('this.#profile = published'),
  );
  assert.ok(
    reentrantReadback.indexOf('this.#profile = published')
      < reentrantReadback.indexOf("this.#assertCurrentOperationCommit('CAS返回后读回', true)"),
  );
  for (const marker of [
    "this.#runOperation('state-read'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('last-known-snapshot-read'",
  ]) assert.ok(source.includes(marker));
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf("if (this.#state === 'destroyed') return"),
  );
  assert.ok(
    destroy.indexOf("this.#assertCurrentOperationCommit('销毁')")
      < destroy.indexOf('this.#repository = null'),
  );
});

test('P6.274 keeps Learning Profile durable slot/head watermarks ahead of reentry rejection', () => {
  const source = readFileSync(
    'packages/arena-profile-persistence/src/arena-v2-learning-profile-repository-v1.ts',
    'utf8',
  );
  assert.match(source, /#operation: LearningProfileRepositoryOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning/u);
  for (const marker of [
    'operationGuardPrecedesStateAndInputValidation: true',
    'storageAndLeasePortsCheckedBeforeCrossOwnerProgress: true',
    'durableSlotAndHeadWatermarksPrecedeReentryRejection: true',
    'publicReadsRejectOperationIntermediateState: true',
    'destroyWatermarkPrecedesReentryRejection: true',
  ]) assert.ok(source.includes(marker));

  const readSlotStart = source.indexOf('  #readSlot(');
  const readHeadStart = source.indexOf('  #readHead():', readSlotStart);
  const readSlot = source.slice(readSlotStart, readHeadStart);
  assert.ok(
    readSlot.indexOf('this.#storageValue().read(key)')
      < readSlot.indexOf('this.#assertNoReentrySince(readReentrySequence'),
  );
  const openStart = source.indexOf('  open(): ArenaV2LearningProfileV1 {');
  const snapshotStart = source.indexOf('  getSnapshot(): ArenaV2LearningProfileV1 {', openStart);
  const open = source.slice(openStart, snapshotStart);
  assert.ok(
    open.indexOf("this.#runOperation('open'")
      < open.indexOf("this.#state === 'destroyed'"),
  );
  const compareStart = source.indexOf('  compareAndSet(');
  const destroyStart = source.indexOf('  destroy(): void {', compareStart);
  const compare = source.slice(compareStart, destroyStart);
  assert.ok(
    compare.indexOf("this.#runOperation('compare-and-set'")
      < compare.indexOf('assertIntegerAtLeast('),
  );
  assert.ok(
    compare.indexOf('this.#storageValue().write(targetKey, envelope)')
      < compare.indexOf('confirmed = this.#readSlot(targetKey, targetSlot)'),
  );
  const slotReentryStart = compare.indexOf('if (this.#reentrySequence !== writeReentrySequence)');
  const headWriteStart = compare.indexOf('const headWriteReentrySequence', slotReentryStart);
  const slotReentry = compare.slice(slotReentryStart, headWriteStart);
  assert.ok(
    slotReentry.indexOf('this.#profile = confirmed.profile')
      < slotReentry.indexOf("this.#assertNoReentrySince(writeReentrySequence, '新槽写入')"),
  );
  const headWrite = compare.slice(headWriteStart);
  assert.ok(
    headWrite.indexOf('this.#profile = confirmed.profile')
      < headWrite.indexOf("this.#assertNoReentrySince(headWriteReentrySequence, 'head写入')"),
  );
  for (const marker of [
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('diagnostics-read'",
    "this.#runOperation('storage-keys-read'",
    "this.#runOperation('renew-lease'",
  ]) assert.ok(source.includes(marker));
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf("if (this.#state === 'destroyed') return"),
  );
  assert.ok(
    destroy.indexOf("this.#state = 'destroyed'")
      < destroy.indexOf("this.#assertNoReentrySince(destroyReentrySequence, '销毁发布', true)"),
  );
});

test('P6.275 keeps Reward Profile durable slot/head watermarks ahead of reentry rejection', () => {
  const source = readFileSync(
    'packages/arena-profile-persistence/src/player-profile-repository.ts',
    'utf8',
  );
  assert.match(source, /#operation: PlayerProfileRepositoryOperation \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#transitioning/u);
  for (const marker of [
    'operationGuardPrecedesStateAndInputValidation: true',
    'storageAndLeasePortsCheckedBeforeCrossOwnerProgress: true',
    'durableSlotAndHeadWatermarksPrecedeReentryRejection: true',
    'publicReadsRejectOperationIntermediateState: true',
    'destroyWatermarkPrecedesReentryRejection: true',
  ]) assert.ok(source.includes(marker));

  const readSlotStart = source.indexOf('  #readSlot(');
  const readHeadStart = source.indexOf('  #readHead():', readSlotStart);
  const readSlot = source.slice(readSlotStart, readHeadStart);
  assert.ok(
    readSlot.indexOf('this.#requireStorage().read(key)')
      < readSlot.indexOf('this.#assertNoReentrySince(readReentrySequence'),
  );
  const openStart = source.indexOf('  open(): PlayerProfile {');
  const snapshotStart = source.indexOf('  getSnapshot(): PlayerProfile {', openStart);
  const open = source.slice(openStart, snapshotStart);
  assert.ok(
    open.indexOf("this.#runOperation('open'")
      < open.indexOf("this.#state === 'destroyed'"),
  );
  const compareStart = source.indexOf('  compareAndSet(');
  const destroyStart = source.indexOf('  destroy(): void {', compareStart);
  const compare = source.slice(compareStart, destroyStart);
  assert.ok(
    compare.indexOf("this.#runOperation('compare-and-set'")
      < compare.indexOf('assertIntegerAtLeast('),
  );
  assert.ok(
    compare.indexOf('this.#requireStorage().write(targetKey, envelope)')
      < compare.indexOf('confirmed = this.#readSlot(targetKey, targetSlot)'),
  );
  const slotReentryStart = compare.indexOf('if (this.#reentrySequence !== writeReentrySequence)');
  const headWriteStart = compare.indexOf('const headWriteReentrySequence', slotReentryStart);
  const slotReentry = compare.slice(slotReentryStart, headWriteStart);
  assert.ok(
    slotReentry.indexOf('this.#profile = confirmed.profile')
      < slotReentry.indexOf("this.#assertNoReentrySince(writeReentrySequence, '新槽写入')"),
  );
  const headWrite = compare.slice(headWriteStart);
  assert.ok(
    headWrite.indexOf('this.#profile = confirmed.profile')
      < headWrite.indexOf("this.#assertNoReentrySince(headWriteReentrySequence, 'head写入')"),
  );
  for (const marker of [
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('diagnostics-read'",
    "this.#runOperation('storage-keys-read'",
    "this.#runOperation('renew-lease'",
  ]) assert.ok(source.includes(marker));
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf("if (this.#state === 'destroyed') return"),
  );
  assert.ok(
    destroy.indexOf("this.#state = 'destroyed'")
      < destroy.indexOf("this.#assertNoReentrySince(destroyReentrySequence, '销毁发布', true)"),
  );
});

test('P6.276 keeps Profile Services Owner reads and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-profile-services-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#operation: ProfileServicesOwnerOperationCandidateV1 \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  for (const marker of [
    'operationGuardPrecedesPublicStateChecks: true',
    'profileReadsCheckedBeforeCrossChildProgress: true',
    'swallowedCleanupReentryRetainsAllUnprocessedOwners: true',
    'successfulCleanupWatermarkPrecedesReentryRejection: true',
    'publicReadsRejectOperationIntermediateState: true',
  ]) assert.ok(source.includes(marker));

  for (const marker of [
    "this.#runOperation('reward-service-read'",
    "this.#runOperation('learning-service-read'",
  ]) assert.ok(source.includes(marker));
  const snapshotStart = source.indexOf('  getSnapshot(): unknown {');
  const destroyStart = source.indexOf('  destroy(): void {', snapshotStart);
  const snapshot = source.slice(snapshotStart, destroyStart);
  assert.ok(
    snapshot.indexOf('const reward = this.#rewardService().getSnapshot()')
      < snapshot.indexOf("this.#assertReentryFree(sequence, 'Reward Profile读取')"),
  );
  assert.ok(
    snapshot.indexOf("this.#assertReentryFree(sequence, 'Reward Profile读取')")
      < snapshot.indexOf('const learning = this.#learningService().getSnapshot()'),
  );
  const destroy = source.slice(destroyStart);
  assert.ok(
    destroy.indexOf("this.#runOperation('destroy'")
      < destroy.indexOf('if (this.#destroyed) return'),
  );
  assert.ok(
    destroy.indexOf('if (currentErrors.length === 0) this.#learningProfileService = null')
      < destroy.indexOf("this.#assertReentryFree(sequence, 'Learning Profile清理')"),
  );
  assert.ok(
    destroy.indexOf("this.#assertReentryFree(sequence, 'Learning Profile清理')")
      < destroy.indexOf('if (this.#rewardProfileService !== null)'),
  );
  assert.ok(
    destroy.indexOf('if (currentErrors.length === 0) this.#rewardProfileService = null')
      < destroy.indexOf("this.#assertReentryFree(sequence, 'Reward Profile清理')"),
  );
});

test('P6.296 keeps formal Survival Bot observation, lifecycle and cleanup commits atomic', () => {
  const source = readFileSync(
    'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
    'utf8',
  );
  assert.match(
    source,
    /#operation: SurvivalSharedWorldAuthorityOperationV1 \| null = null/u,
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(
    source.slice(
      source.indexOf('export class ArenaSurvivalSharedWorldAuthorityCandidateV1'),
      source.indexOf('\nfunction outsideTarget()', source.indexOf(
        'export class ArenaSurvivalSharedWorldAuthorityCandidateV1',
      )),
    ),
    /#transitioning/u,
  );
  for (const marker of [
    'botAuthorityUsesNamedOperationAndStickyReentrySequence: true',
    'botObservationCallbacksCheckedBeforeEvidenceOrPreparedInputPublication: true',
    'modeResolutionAndBotCheckpointCallbacksCheckedBeforeWorldCommit: true',
    'botPauseResumeCallbacksCheckedBeforeAuthorityLifecycleCommit: true',
    'swallowedBotCleanupReentryRetainsCurrentOwnerAndStopsLaterCleanup: true',
    'publicAuthorityReadsRejectBotOperationIntermediateState: true',
    "this.#assertOperationCommit('prepare-inputs')",
    "this.#assertOperationCommit('step')",
    "this.#assertOperationCommit('pause')",
    "this.#assertOperationCommit('resume')",
  ]) assert.ok(source.includes(marker));

  const botInputStart = source.indexOf('  #createEnemyInput(');
  const recordSupplyStart = source.indexOf('  #recordSupply(', botInputStart);
  const botInput = source.slice(botInputStart, recordSupplyStart);
  assert.ok(
    botInput.indexOf('.createInput(observation)')
      < botInput.indexOf("this.#assertOperationCommit('prepare-inputs')"),
  );
  assert.ok(
    botInput.indexOf("this.#assertOperationCommit('prepare-inputs')")
      < botInput.indexOf('this.#evidence.v2ObservationCount += 1'),
  );

  const stepStart = source.indexOf('  step(request: Readonly<{');
  const checkpointStart = source.indexOf('  exportCheckpoint(', stepStart);
  const step = source.slice(stepStart, checkpointStart);
  assert.ok(
    step.indexOf('request.resolveMode(')
      < step.indexOf("this.#assertOperationCommit('step')"),
  );
  assert.ok(
    step.indexOf('controllerStateHashCheckpoints')
      < step.lastIndexOf("this.#assertOperationCommit('step')"),
  );
  assert.ok(
    step.lastIndexOf("this.#assertOperationCommit('step')")
      < step.indexOf('this.#readFrame = next.readFrame'),
  );

  const destroyStart = source.indexOf('  destroy(): unknown {', checkpointStart);
  const destroy = source.slice(destroyStart, source.indexOf('\n}\n\nfunction outsideTarget()', destroyStart));
  assert.ok(
    destroy.indexOf("this.#assertNoOperation('destroy')")
      < destroy.indexOf('if (this.#destroyed) return'),
  );
  assert.ok(
    destroy.indexOf('this.#releaseCurrentResources(errors)')
      < destroy.indexOf('this.#states.clear()'),
  );
});

test('P6.297 stops HUD external effect dispatch after swallowed callback reentry', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'externalEffectCallbacksCheckedBeforeLaterEffectsOrProjectionWatermark: true',
    'swallowedExternalEffectReentryStopsLaterEffectDispatch: true',
    'cleanupReentryRetainsCurrentAndLaterEffectOwnership: true',
    "this.#assertOperationCommit('begin-epoch')",
    "this.#assertOperationCommit('consume')",
  ]) assert.ok(source.includes(marker));
  const consumeStart = source.indexOf('  #consume(');
  const publicConsumeStart = source.indexOf('  consume(', consumeStart);
  const consume = source.slice(consumeStart, publicConsumeStart);
  assert.ok(
    consume.indexOf('this.#visual.remove')
      < consume.indexOf("this.#assertOperationCommit('consume')"),
  );
  assert.ok(
    consume.lastIndexOf("this.#assertOperationCommit('consume')")
      < consume.indexOf('this.#activeVisualIds = new Set(visibleIds)'),
  );
});

test('P6.298 keeps HUD child consumption and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-hud-presentation-host-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeCrossChildProgressOrHostCommit: true',
    'swallowedChildCleanupReentryRetainsCurrentAndLaterOwners: true',
    "this.#assertOperationCommit('begin-epoch')",
    "this.#assertOperationCommit('consume')",
  ]) assert.ok(source.includes(marker));
  const beginStart = source.indexOf('  beginEpoch(');
  const consumeStart = source.indexOf('  consume(', beginStart);
  const begin = source.slice(beginStart, consumeStart);
  assert.ok(
    begin.indexOf('this.#projectionConsumer.beginEpoch(source)')
      < begin.indexOf("this.#assertOperationCommit('begin-epoch')"),
  );
  assert.ok(
    begin.lastIndexOf("this.#assertOperationCommit('begin-epoch')")
      < begin.indexOf('this.#generation = projection.generation'),
  );
  const cleanupStart = source.indexOf('  #cleanupChildren():');
  const cleanupEnd = source.indexOf('  #cleanupComplete():', cleanupStart);
  const cleanup = source.slice(cleanupStart, cleanupEnd);
  assert.ok(
    cleanup.indexOf('if (this.#reentrySequence !== reentrySequence)')
      < cleanup.indexOf('this.#effectConsumerDisposed = true'),
  );
});

test('P6.299 keeps specialized weapon HUD effects and retained identities atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'innerHostAndExternalEffectCallbacksCheckedBeforeIdentityCommit: true',
    'swallowedExternalEffectReentryStopsIdentityDeletionAndQueuePruning: true',
    'swallowedInnerHostCleanupReentryRetainsInnerHostOwnership: true',
    "this.#assertOperationCommit('begin-epoch')",
    "this.#assertOperationCommit('consume')",
  ]) assert.ok(source.includes(marker));

  const removeStart = source.indexOf('  #remove(');
  const clearStart = source.indexOf('  #clear()', removeStart);
  const remove = source.slice(removeStart, clearStart);
  assert.ok(
    remove.indexOf('this.#externalVisual.remove(sourceEventId)')
      < remove.indexOf('this.#assertCurrentOperationCommit()'),
  );
  assert.ok(
    remove.indexOf('this.#assertCurrentOperationCommit()')
      < remove.indexOf('this.#plansBySourceEventId.delete(sourceEventId)'),
  );

  const consumeStart = source.indexOf('  consume(');
  const snapshotStart = source.indexOf('  getSnapshot()', consumeStart);
  const consume = source.slice(consumeStart, snapshotStart);
  assert.ok(
    consume.indexOf('this.#innerHost.consume({')
      < consume.indexOf("this.#assertOperationCommit('consume')"),
  );
  assert.ok(
    consume.indexOf("this.#assertOperationCommit('consume')")
      < consume.indexOf('const retainedSourceEventIds = new Set('),
  );

  const cleanupStart = source.indexOf('  #cleanupInnerHost():');
  const planStart = source.indexOf('  #plan(', cleanupStart);
  const cleanup = source.slice(cleanupStart, planStart);
  assert.ok(
    cleanup.indexOf('if (this.#reentrySequence !== reentrySequence)')
      < cleanup.indexOf('this.#innerHostDisposed = true'),
  );
});

test('P6.300 keeps specialized weapon VFX callbacks and identity commits atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-port-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'downstreamCallbacksCheckedBeforeActiveIdentityCommit: true',
    'swallowedDownstreamClearReentryRetainsIdentityAndStopsDispose: true',
    'downstreamOwnershipReleasedOnlyAfterConfirmedDispose: true',
  ]) assert.ok(source.includes(marker));

  const presentStart = source.indexOf('  present(value: unknown): void {');
  const removeStart = source.indexOf('  remove(value: unknown): void {', presentStart);
  const present = source.slice(presentStart, removeStart);
  assert.ok(
    present.lastIndexOf('this.#assertOperationCommit(operation)')
      < present.indexOf('this.#active.set(input.sourceEventId'),
  );

  const clearStart = source.indexOf('  clear(): void {', removeStart);
  const remove = source.slice(removeStart, clearStart);
  assert.ok(
    remove.indexOf('this.#assertOperationCommit(operation)')
      < remove.indexOf('this.#active.delete(sourceEventId)'),
  );

  const disposeStart = source.indexOf('  dispose(): void {');
  const dispose = source.slice(disposeStart, source.indexOf('\n}\n\nexport const', disposeStart));
  assert.ok(
    dispose.indexOf('if (!reentryStoppedCleanup && !this.#downstreamDisposed)')
      < dispose.indexOf('this.#downstream.dispose'),
  );
  assert.ok(
    dispose.indexOf('this.#reentrySequence !== disposeReentrySequence')
      < dispose.indexOf('this.#downstreamDisposed = true'),
  );
});

test('P6.301 keeps formal Three VFX texture, impact, and cleanup commits atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'textureThreeAndImpactCallbacksCheckedBeforeCrossOwnerOrStateCommit: true',
    'terminalCleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true',
    'syncResolversCheckedBeforeFrameWatermarkCommit: true',
  ]) assert.ok(source.includes(marker));

  const loadStart = source.indexOf('  load(): Promise<this> {');
  const presentEffectStart = source.indexOf('  #presentEffect(', loadStart);
  const load = source.slice(loadStart, presentEffectStart);
  assert.ok(
    load.indexOf('loadingOperations.push(textureOwner.promise.then')
      < load.indexOf('this.#textureLoader.load('),
  );
  assert.ok(
    load.indexOf('this.#textureLoader.load(')
      < load.indexOf('this.#assertCurrentOperationCommit()'),
  );

  const presentCameraStart = source.indexOf('  #presentCameraImpact(', presentEffectStart);
  const presentEffect = source.slice(presentEffectStart, presentCameraStart);
  assert.ok(
    presentEffect.indexOf('this.#root.add(effect.root)')
      < presentEffect.indexOf('this.#assertCurrentOperationCommit()'),
  );
  assert.ok(
    presentEffect.indexOf('this.#assertCurrentOperationCommit()')
      < presentEffect.indexOf('this.#effects.set(command.sourceEventId, effect)'),
  );

  const terminalStart = source.indexOf('  #terminalCleanup():');
  const terminalEnd = source.indexOf('  #terminalCleanupComplete():', terminalStart);
  const terminal = source.slice(terminalStart, terminalEnd);
  assert.ok(
    terminal.indexOf('this.#cameraImpact.clear()')
      < terminal.indexOf('this.#terminalCameraImpactCleared = true'),
  );
  assert.ok(
    terminal.indexOf('return Object.freeze(errors)')
      < terminal.indexOf('this.#terminalCharacterImpactCleared = true'),
  );

  const syncStart = source.indexOf('  sync(value: unknown): void {');
  const snapshotStart = source.indexOf('  getSnapshot():', syncStart);
  const sync = source.slice(syncStart, snapshotStart);
  assert.ok(
    sync.lastIndexOf('this.#assertCurrentOperationCommit()')
      < sync.indexOf('this.#lastTick = currentTick'),
  );
});

test('P6.302 keeps formal Web Audio async owners, voices, and cleanup commits atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'fetchDecodeAndResumeCallsRetainAsyncOwnerBeforeReentryCheck: true',
    'voiceNodeCallbacksCheckedBeforeVoiceOrRecentIdentityCommit: true',
    'voiceBusAndContextCleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true',
    'contextCloseOwnerCapturedBeforeReentryCheck: true',
    'contextCloseSettlementHooksCapturedBeforeReentryCheck: true',
  ]) assert.ok(source.includes(marker));

  const loadStart = source.indexOf('  load(): Promise<this> {');
  const activationStart = source.indexOf('  activate(): Promise<this> {', loadStart);
  const load = source.slice(loadStart, activationStart);
  assert.ok(
    load.indexOf('const responseOperation = this.#window.fetch(')
      < load.indexOf('loadingOperations.push((async () => {'),
  );
  assert.ok(
    load.indexOf('loadingOperations.push((async () => {')
      < load.indexOf('this.#assertCurrentOperationCommit()'),
  );
  assert.match(load, /this\.#runSynchronousOperation\([\s\S]*arrayBuffer启动/u);
  assert.match(load, /this\.#runSynchronousOperation\([\s\S]*decode启动/u);

  const playStart = source.indexOf('  play(value: unknown): void {', activationStart);
  const stopStart = source.indexOf('  stopAll(): void {', playStart);
  const play = source.slice(playStart, stopStart);
  assert.ok(
    play.indexOf('source = this.#context.createBufferSource()')
      < play.indexOf('this.#assertCurrentOperationCommit()'),
  );
  assert.ok(
    play.indexOf("source.addEventListener('ended'")
      < play.lastIndexOf('this.#assertCurrentOperationCommit()'),
  );
  assert.ok(
    play.lastIndexOf('this.#assertCurrentOperationCommit()')
      < play.indexOf('this.#recentSourceEventIds = [', play.indexOf('source.start(0)')),
  );

  const cleanupStart = source.indexOf('  #cleanupVoices(');
  const busStart = source.indexOf('  #disconnectBusGraph(', cleanupStart);
  const cleanup = source.slice(cleanupStart, busStart);
  assert.ok(
    cleanup.indexOf('this.#reentrySequence !== reentrySequence')
      < cleanup.indexOf('if (resetRecent) this.#recentSourceEventIds = []'),
  );

  const disposalStart = source.indexOf('  #attemptRequestedDisposal():');
  const continueStart = source.indexOf('  #continueRequestedDisposal():', disposalStart);
  const disposal = source.slice(disposalStart, continueStart);
  assert.ok(
    disposal.indexOf('this.#contextCloseOperation = closing')
      < disposal.indexOf('void closing.then(() => {'),
  );
  assert.ok(
    disposal.indexOf('void closing.then(() => {')
      < disposal.indexOf('this.#assertCurrentOperationCommit()'),
  );
  assert.ok(
    disposal.indexOf('this.#assertCurrentOperationCommit()')
      < disposal.lastIndexOf('this.#state = errors.length > 0'),
  );
});

test('P6.303 keeps formal HUD Canvas platform callbacks and snapshots atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-formal-hud-canvas-layer-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'platformCallbacksCheckedBeforeRenderAndLifecycleWatermarks: true',
    'renderProjectionAndPaintCallbacksCheckedBeforeSnapshotPublication: true',
    'cleanupReentryRetainsCurrentOwnerAndStopsLaterResources: true',
  ]) assert.ok(source.includes(marker));

  const loadStart = source.indexOf('  load(): this {');
  const renderStart = source.indexOf('  render(value: unknown): void {', loadStart);
  const load = source.slice(loadStart, renderStart);
  assert.ok(
    load.indexOf("this.#context = context")
      < load.indexOf("this.#assertOperationCommit('load')"),
  );
  assert.ok(
    load.indexOf("this.#assertOperationCommit('load')")
      < load.indexOf("this.#document.createElement('div')"),
  );

  const clearStart = source.indexOf('  clear(): void {', renderStart);
  const render = source.slice(renderStart, clearStart);
  assert.ok(
    render.indexOf('paintWorldMarkers(this.#context, markers)')
      < render.lastIndexOf("this.#assertOperationCommit('render')"),
  );
  assert.ok(
    render.lastIndexOf("this.#assertOperationCommit('render')")
      < render.indexOf('this.#lastRenderPlan = plan'),
  );

  const cleanupStepStart = source.indexOf('  #runCleanupStep(');
  const loadAfterCleanupStart = source.indexOf('  load(): this {', cleanupStepStart);
  const cleanupStep = source.slice(cleanupStepStart, loadAfterCleanupStart);
  assert.ok(
    cleanupStep.indexOf('this.#reentrySequence !== reentrySequence')
      < cleanupStep.indexOf('commit();'),
  );

  const disposeStart = source.indexOf('  dispose(): void {', clearStart);
  const dispose = source.slice(disposeStart, source.indexOf('\n}\n\nexport const', disposeStart));
  assert.ok(
    dispose.indexOf("'Arena V2 formal HUD无障碍节点'")
      < dispose.indexOf("'Arena V2 formal HUD Canvas宽度'"),
  );
  assert.ok(
    dispose.indexOf("this.#assertOperationCommit('dispose')")
      < dispose.indexOf('this.#lastRenderPlan = null'),
  );
});

test('P6.304 keeps formal Web Match Host children, snapshots, and cleanup atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-formal-web-match-host-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeStateAndSnapshotCommit: true',
    'preparationChildrenCapturedBeforeNextLaunch: true',
    'cleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true',
    'previewOwnerRollbackPrecedesHostFailureCleanup: true',
  ]) assert.ok(source.includes(marker));

  const preparationStart = source.indexOf('  prepareFormalAssets(): Promise<this> {');
  const activationStart = source.indexOf('  activateFormalAudio(): Promise<this> {', preparationStart);
  const preparation = source.slice(preparationStart, activationStart);
  assert.ok(
    preparation.indexOf('childOperations = Object.freeze([...startedChildOperations])')
      < preparation.indexOf('this.#assertCurrentOperationCommit()'),
  );
  assert.ok(
    preparation.indexOf('this.#assertCurrentOperationCommit()')
      < preparation.indexOf('captureAsyncOperation(() => this.#audio.load())'),
  );

  const renderStart = source.indexOf('  render(value: unknown): void {', activationStart);
  const pauseStart = source.indexOf('  pause(): void {', renderStart);
  const render = source.slice(renderStart, pauseStart);
  assert.ok(
    render.indexOf('this.#surface.render(value)')
      < render.indexOf('this.#assertCurrentOperationCommit()'),
  );
  assert.ok(
    render.indexOf('this.#assertCurrentOperationCommit()')
      < render.indexOf("this.#state = 'active'"),
  );

  const cleanupStart = source.indexOf('  #cleanup(): readonly unknown[] {');
  const cleanupCompleteStart = source.indexOf('  #cleanupComplete(): boolean {', cleanupStart);
  const cleanup = source.slice(cleanupStart, cleanupCompleteStart);
  assert.ok(
    cleanup.indexOf("'Arena V2 formal Web match surface'")
      < cleanup.indexOf("'Arena V2 formal Web asset preloader'"),
  );
  assert.ok(
    cleanup.indexOf("'Arena V2 formal Web asset preloader'")
      < cleanup.indexOf("'Arena V2 formal Web renderer'"),
  );

  const snapshotStart = source.indexOf('  getSnapshot(): Readonly<Record<string, unknown>> {');
  const disposeStart = source.indexOf('  dispose(): void {', snapshotStart);
  const snapshot = source.slice(snapshotStart, disposeStart);
  assert.ok(
    snapshot.indexOf('const audio = this.#audio.getSnapshot()')
      < snapshot.lastIndexOf('this.#assertCurrentOperationCommit()'),
  );
  assert.ok(
    snapshot.lastIndexOf('this.#assertCurrentOperationCommit()')
      < snapshot.indexOf('const snapshot = Object.freeze({'),
  );
});

test('P6.305 keeps formal Match Surface Stage callbacks and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-match-surface-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'stageCallbacksCheckedBeforeResolutionAndStateCommit: true',
    'stageCleanupReentryRetainsOwnershipForRetry: true',
  ]) assert.ok(source.includes(marker));

  const invokeStart = source.indexOf('  #invoke(');
  const disposeStageStart = source.indexOf('  #disposeStage(', invokeStart);
  const invoke = source.slice(invokeStart, disposeStageStart);
  assert.ok(
    invoke.indexOf('rejectThenable(result')
      < invoke.indexOf('this.#assertCurrentOperationCommit()'),
  );

  const loadStart = source.indexOf('  load(value: unknown):', disposeStageStart);
  const renderStart = source.indexOf('  render(value: unknown):', loadStart);
  const load = source.slice(loadStart, renderStart);
  assert.ok(
    load.indexOf("this.#invoke('load', next)")
      < load.indexOf('this.#lastResolution = next.resolution'),
  );

  const disposeStageEnd = source.indexOf('  #fail(error: unknown): never {', disposeStageStart);
  const disposeStage = source.slice(disposeStageStart, disposeStageEnd);
  assert.ok(
    disposeStage.indexOf('this.#reentrySequence !== reentrySequence')
      < disposeStage.indexOf('this.#stageDisposed = true'),
  );
});

test('P6.306 keeps formal Three Stage child callbacks, snapshots, and cleanup atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-stage-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeCrossOwnerOrStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'childSnapshotsCheckedBeforeAggregateSnapshotPublication: true',
    'constructorWorldRootRollbackRetainsCleanupFailure: true',
  ]) assert.ok(source.includes(marker));

  const invokeStart = source.indexOf('  #invoke(');
  const beginCleanupStart = source.indexOf('  #beginMatchCleanupOwnership()', invokeStart);
  const invoke = source.slice(invokeStart, beginCleanupStart);
  assert.ok(
    invoke.indexOf('rejectThenable(result, name)')
      < invoke.indexOf('this.#assertCurrentOperationCommit()'),
  );

  const syncStart = source.indexOf('  #syncAndPresent(');
  const loadStart = source.indexOf('  load(value: unknown): void {', syncStart);
  const sync = source.slice(syncStart, loadStart);
  assert.ok(
    sync.indexOf('routeReadability.sync(')
      < sync.indexOf('this.#assertCurrentOperationCommit()'),
  );
  assert.ok(
    sync.lastIndexOf('this.#assertCurrentOperationCommit()')
      < sync.indexOf('this.#invoke(this.#hudLayer.render'),
  );

  const disposeMatchStart = source.indexOf('  #disposeMatch(');
  const applyEnvironmentStart = source.indexOf('  #applyMapEnvironment(', disposeMatchStart);
  const disposeMatch = source.slice(disposeMatchStart, applyEnvironmentStart);
  assert.ok(
    disposeMatch.indexOf("'Arena V2 formal Three HUD'")
      < disposeMatch.indexOf("'Arena V2 formal Three Visual Effects'"),
  );
  assert.ok(
    disposeMatch.indexOf("'Arena V2 formal Three Visual Effects'")
      < disposeMatch.indexOf("'Arena V2 formal Three武器阶段音频端口'"),
  );

  const snapshotStart = source.indexOf('  getSnapshot(): Readonly<Record<string, unknown>> {');
  const disposeStart = source.indexOf('  dispose(): void {', snapshotStart);
  const snapshot = source.slice(snapshotStart, disposeStart);
  const characterImpactRead = snapshot.indexOf(
    'const characterImpact = this.#characterImpact.getSnapshot()',
  );
  assert.ok(
    characterImpactRead
      < snapshot.indexOf('this.#assertCurrentOperationCommit()', characterImpactRead),
  );
  assert.ok(
    snapshot.lastIndexOf('this.#assertCurrentOperationCommit()')
      < snapshot.indexOf('return Object.freeze({'),
  );
});

test('P6.307 keeps formal Web Composition callbacks, snapshots, and cleanup atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#synchronousReentrySequence = 0/u);
  assert.match(source, /#synchronousReentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#synchronousReentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childDomAndObserverCallbacksCheckedBeforeCrossOwnerOrStateCommit: true',
    'callbackEntrypointsJoinOrCreateGuardedOperation: true',
    'asyncChildOwnersAndSettlementHooksCapturedBeforeReentryCheck: true',
    'runtimeCleanupReentryRetainsCurrentAndLaterOwners: true',
    'childSnapshotsCheckedBeforeAggregateSnapshotPublication: true',
  ]) assert.ok(source.includes(marker));

  const prepareStart = source.indexOf('  prepareFormalAssets(): Promise<this> {');
  const loadAndPrepareStart = source.indexOf('  loadAndPrepare(): Promise<this> {', prepareStart);
  const preparation = source.slice(prepareStart, loadAndPrepareStart);
  assert.ok(
    preparation.indexOf('const childPreparation = this.#matchHost.prepareFormalAssets()')
      < preparation.indexOf('const execution = childPreparation.then'),
  );
  assert.ok(
    preparation.indexOf('void execution.then(prepareOwner.resolve, prepareOwner.reject)')
      < preparation.lastIndexOf('this.#assertCurrentSynchronousOperationCommit()'),
  );

  const setSurfaceStart = source.indexOf('  #setSurface(surface: ActiveSurface): void {');
  const clearAvailabilityStart = source.indexOf(
    '  #clearActionAvailability(): void {',
    setSurfaceStart,
  );
  const setSurface = source.slice(setSurfaceStart, clearAvailabilityStart);
  assert.ok(
    setSurface.lastIndexOf('this.#assertCurrentSynchronousOperationCommit()')
      < setSurface.indexOf('this.#activeSurface = surface'),
  );

  const cleanupStepStart = source.indexOf('  #runOwnedRuntimeCleanupStep(');
  const cleanupStart = source.indexOf(
    '  #cleanupOwnedRuntimeResources(errors: unknown[]): void {',
    cleanupStepStart,
  );
  const cleanupStep = source.slice(cleanupStepStart, cleanupStart);
  assert.ok(
    cleanupStep.indexOf('this.#synchronousReentrySequence !== reentrySequence')
      < cleanupStep.indexOf('commit();'),
  );

  const snapshotStart = source.indexOf('  getSnapshot(): Readonly<Record<string, unknown>> {');
  const exportStart = source.indexOf(
    '  getOfflineRetentionObservationExportRead():',
    snapshotStart,
  );
  const snapshot = source.slice(snapshotStart, exportStart);
  assert.ok(
    snapshot.indexOf('const matchHost = this.#matchHost.getSnapshot()')
      < snapshot.lastIndexOf('this.#assertCurrentSynchronousOperationCommit()'),
  );
  assert.ok(
    snapshot.lastIndexOf('this.#assertCurrentSynchronousOperationCommit()')
      < snapshot.indexOf('return Object.freeze({'),
  );
});

test('P6.308 keeps the isolated formal Web entry generation and DOM commits atomic', () => {
  const source = readFileSync('src/entry/web-arena-v2-formal-candidate.ts', 'utf8');
  assert.match(source, /let synchronousReentrySequence = 0/u);
  assert.match(source, /let synchronousReentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /synchronousReentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'compositionAndDomCallbacksCheckedBeforeStateOrOwnerCommit: true',
    'compositionCleanupReentryRetainsCurrentOwner: true',
    'asyncChildOwnersCapturedBeforeGenerationCheckedSettlement: true',
    'bootstrapAndPageLifecycleCallbacksUseEntryOperationGuard: true',
    'disposedStatePublishesAfterListenerAndCompositionCleanup: true',
  ]) assert.ok(source.includes(marker));

  const cleanupStart = source.indexOf('function disposeCurrentComposition(): void {');
  const operationGuardStart = source.indexOf(
    'function assertNoSynchronousOperation(operation: string): void {',
    cleanupStart,
  );
  const cleanup = source.slice(cleanupStart, operationGuardStart);
  assert.ok(
    cleanup.indexOf('ownedComposition.dispose()')
      < cleanup.indexOf('assertExternalCommitSequence(cleanupSequence'),
  );
  assert.ok(
    cleanup.indexOf('assertExternalCommitSequence(cleanupSequence')
      < cleanup.indexOf('composition = null'),
  );

  const preparationStart = source.indexOf('async function runPreparation(): Promise<void> {');
  const prepareOwnerStart = source.indexOf('function prepare(): Promise<void> {', preparationStart);
  const preparation = source.slice(preparationStart, prepareOwnerStart);
  assert.ok(
    preparation.indexOf('const snapshot = nextComposition.getSnapshot()')
      < preparation.indexOf('localRetentionJournalConnected ='),
  );
  assert.ok(
    preparation.indexOf('const preparation = nextComposition.loadAndPrepare()')
      < preparation.lastIndexOf('assertCurrentSynchronousOperationCommit()'),
  );

  const disposeStart = source.indexOf('function dispose(): void {');
  const pageHideStart = source.indexOf('function handlePageHide(', disposeStart);
  const dispose = source.slice(disposeStart, pageHideStart);
  assert.ok(
    dispose.indexOf('disposeCurrentComposition()') < dispose.indexOf('disposed = true'),
  );

  const bootstrapStart = source.indexOf("runSynchronousOperation('bootstrap'");
  const initialPrepareStart = source.indexOf('void prepare();', bootstrapStart);
  const bootstrap = source.slice(bootstrapStart, initialPrepareStart);
  assert.ok(bootstrap.includes("windowObject.addEventListener('pageshow', handlePageShow)"));
  assert.ok(bootstrap.includes('assertExternalCommitSequence(sequence'));
});

test('P6.309 keeps information Binding callbacks and cleanup ownership atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'hostSurfaceMatchAndObserverCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'attachedMatchDriverStartUsesIndependentGuardedTransition: true',
  ]) assert.ok(source.includes(marker));

  const renderStart = source.indexOf('  #renderCurrent(): ArenaV2UiRenderPlanV1 | null {');
  const notifyStart = source.indexOf('  #notifySurface(', renderStart);
  const render = source.slice(renderStart, notifyStart);
  assert.ok(
    render.indexOf('this.#surface.render(renderPlan)')
      < render.lastIndexOf('this.#assertTransitionCommit()'),
  );
  assert.ok(
    render.lastIndexOf('this.#assertTransitionCommit()')
      < render.indexOf('this.#lastRenderPlan = renderPlan'),
  );

  const cleanupStepStart = source.indexOf('  #runCleanupStep(');
  const cleanupStart = source.indexOf('  #cleanup(): readonly unknown[] {', cleanupStepStart);
  const cleanupStep = source.slice(cleanupStepStart, cleanupStart);
  assert.ok(
    cleanupStep.indexOf('this.#reentrySequence !== reentrySequence')
      < cleanupStep.indexOf('commit();'),
  );

  const intentStart = source.indexOf('  readonly #handleIntent =');
  const loadStart = source.indexOf('  load(): this {', intentStart);
  const intent = source.slice(intentStart, loadStart);
  assert.ok(
    intent.indexOf("this.#endTransition('Arena V2 local playable surface intent'")
      < intent.indexOf("this.#runTransition(\n            'Arena V2 local playable surface attached match driver start'"),
  );
});

test('P6.310 keeps keyboard Driver callbacks, snapshots, and cleanup ownership atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-local-match-keyboard-driver-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'bindingInputLoopAndObserverCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'snapshotChildrenCheckedBeforeAggregatePublication: true',
    'visibilityRegistrationAndCleanupUseSequenceOwnership: true',
  ]) assert.ok(source.includes(marker));

  const replaceInputStart = source.indexOf('  #replaceInput(context: MatchInputContext): void {');
  const frameStart = source.indexOf('  readonly #frame =', replaceInputStart);
  const inputOwnership = source.slice(replaceInputStart, frameStart);
  const inputBind = inputOwnership.indexOf('input.bind()');
  const bindCommit = inputOwnership.indexOf('this.#assertTransitionCommit()', inputBind);
  assert.ok(inputBind < bindCommit);
  assert.ok(bindCommit < inputOwnership.indexOf('this.#input = input', bindCommit));

  const snapshotStart = source.indexOf('  getSnapshot(): Readonly<');
  const disposeStart = source.indexOf('  dispose(): void {', snapshotStart);
  const snapshot = source.slice(snapshotStart, disposeStart);
  assert.ok(snapshot.indexOf('const loop = this.#loop.getDebugSnapshot()')
    < snapshot.lastIndexOf('this.#assertTransitionCommit()'));
  assert.ok(snapshot.lastIndexOf('this.#assertTransitionCommit()')
    < snapshot.indexOf('return Object.freeze({'));
});

test('P6.311 keeps pointer Driver callbacks, snapshots, and cleanup ownership atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-local-match-pointer-driver-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'bindingInputLoopAndObserverCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'snapshotChildrenCheckedBeforeAggregatePublication: true',
    'pointerInputVisibilityAndCleanupUseSequenceOwnership: true',
  ]) assert.ok(source.includes(marker));

  const frameStart = source.indexOf('  readonly #frame =');
  const failStart = source.indexOf('  #fail(error: unknown): void {', frameStart);
  const frame = source.slice(frameStart, failStart);
  const bindingStep = frame.indexOf('this.#binding.stepMatch(localInput)');
  assert.ok(bindingStep < frame.indexOf('this.#assertTransitionCommit()', bindingStep));

  const cleanupStepStart = source.indexOf('  #runCleanupStep(');
  const frameBoundary = source.indexOf('  readonly #frame =', cleanupStepStart);
  const cleanupStep = source.slice(cleanupStepStart, frameBoundary);
  assert.ok(cleanupStep.indexOf('this.#reentrySequence !== sequence')
    < cleanupStep.indexOf('commit();'));
});

test('P6.312 keeps the formal pointer Surface callbacks and cleanup ownership atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-formal-web-pointer-surface-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'domInputLifecycleAndObserverCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'pointerEventCallbacksStopAtFirstReentrySequenceChange: true',
  ]) assert.ok(source.includes(marker));

  const pointStart = source.indexOf('  #point(event: PointerEvent):');
  const guideStart = source.indexOf('  #guide(role: ArenaControlId):', pointStart);
  const platformReads = source.slice(pointStart, guideStart);
  assert.ok(platformReads.indexOf('getBoundingClientRect()')
    < platformReads.indexOf('this.#assertCurrentOperationCommit()'));
  assert.ok(platformReads.indexOf('this.#viewportProvider')
    < platformReads.lastIndexOf('this.#assertCurrentOperationCommit()'));

  const cleanupStart = source.indexOf('  #removeInputListeners(): readonly unknown[] {');
  const unbindStart = source.indexOf('  #unbindInput(', cleanupStart);
  const cleanup = source.slice(cleanupStart, unbindStart);
  assert.ok(cleanup.indexOf('this.#reentrySequence !== sequence')
    < cleanup.indexOf('failed.unshift'));
});

test('P6.313 keeps character preview Mount replacement and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-character-selection-formal-preview-mount-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'buildRetirementAndCleanupCheckedBeforeOwnerCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const mountStart = source.indexOf('  mount(value: unknown):');
  const snapshotStart = source.indexOf('  getSnapshot():', mountStart);
  const mount = source.slice(mountStart, snapshotStart);
  const build = mount.indexOf('next = buildMount(this.#preloader, input)');
  assert.ok(build < mount.indexOf('this.#assertCurrentOperationCommit()', build));
  const retirement = mount.indexOf('cleanupMount(this.#active)');
  assert.ok(retirement < mount.indexOf('this.#assertCurrentOperationCommit()', retirement));
});

test('P6.314 keeps character preview Renderer calls and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-character-selection-formal-preview-render-surface-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'rendererAndSceneCallbacksCheckedBeforeFrameCommit: true',
    'destroyReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const renderStart = source.indexOf('  render(value: unknown):');
  const snapshotStart = source.indexOf('  getSnapshot():', renderStart);
  const render = source.slice(renderStart, snapshotStart);
  const rendererCall = render.indexOf('this.#renderer.render(this.#scene, currentMount.camera)');
  assert.ok(rendererCall < render.indexOf('this.#assertCurrentOperationCommit()', rendererCall));
  assert.ok(render.lastIndexOf('this.#assertCurrentOperationCommit()')
    < render.indexOf('this.#lastTick = tick'));
});

test('P6.315 keeps character preview Composition callbacks and child owners atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-information-character-selection-preview-surface-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'surfaceMountRendererAndObserverCallbacksCheckedBeforeStateCommit: true',
    'childSnapshotsCheckedBeforeAggregatePublication: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const refreshStart = source.indexOf('  #refreshCharacterPreview(');
  const scrollStart = source.indexOf('  #handleScrollOffset(): void {', refreshStart);
  const refresh = source.slice(refreshStart, scrollStart);
  const mount = refresh.indexOf('this.#mountOwner!.mount({');
  const render = refresh.indexOf('this.#renderSurface!.render({');
  assert.ok(mount < refresh.indexOf('this.#assertCurrentOperationCommit()', mount));
  assert.ok(render < refresh.indexOf('this.#assertCurrentOperationCommit()', render));

  const snapshotStart = source.indexOf('  getSnapshot(): Readonly<Record<string, unknown>> {');
  const disposeStart = source.indexOf('  dispose(): void {', snapshotStart);
  const snapshot = source.slice(snapshotStart, disposeStart);
  assert.ok(snapshot.lastIndexOf('this.#assertCurrentOperationCommit()')
    < snapshot.indexOf('return Object.freeze({'));
});

test('P6.316 keeps collection preview Composition callbacks and child owners atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'surfaceContextPreviewAndObserverCallbacksCheckedBeforeStateCommit: true',
    'asyncSubmissionOwnersCapturedBeforeChildStart: true',
    'childSnapshotsCheckedBeforeAggregatePublication: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const renderStart = source.indexOf('  #renderCurrent(): void {');
  const submitStart = source.indexOf('  #submit(frame: PreparedFrameV1): void {', renderStart);
  const render = source.slice(renderStart, submitStart);
  const childRender = render.indexOf('this.#previewHost.renderCurrent({');
  const visible = render.indexOf('this.#setPreviewVisible(true)', childRender);
  assert.ok(childRender < render.indexOf('this.#assertCurrentOperationCommit()', childRender));
  assert.ok(visible < render.indexOf('this.#lastPresentationTick = presentationTick', visible));

  const submission = source.slice(
    submitStart,
    source.indexOf('  #requestResourceRedraw(): void {', submitStart),
  );
  assert.ok(submission.indexOf('this.#submission = operation;')
    < submission.indexOf('this.#previewHost.submitPage({'));

  const snapshotStart = source.indexOf('  getSnapshot():');
  const disposeStart = source.indexOf('  #finishDispose():', snapshotStart);
  const snapshot = source.slice(snapshotStart, disposeStart);
  assert.ok(snapshot.indexOf('this.#previewHost?.getSnapshot()')
    < snapshot.indexOf('this.#assertCurrentOperationCommit()'));
  assert.ok(snapshot.indexOf('this.#assertCurrentOperationCommit()')
    < snapshot.indexOf('return Object.freeze({'));
});

test('P6.317 keeps collection preview Page Surface Host commits and child owners atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-page-surface-host-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'pageRenderAndSnapshotCallbacksCheckedBeforeStateCommit: true',
    'asyncChildSubmissionCapturedBeforeCommitCheck: true',
    'destroyReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const makeSnapshotStart = source.indexOf('  #makeSnapshot(');
  const publishStart = source.indexOf('  #publish(', makeSnapshotStart);
  const makeSnapshot = source.slice(makeSnapshotStart, publishStart);
  assert.ok(makeSnapshot.indexOf('this.#page.getSnapshot()')
    < makeSnapshot.indexOf('this.#assertCurrentOperationCommit()'));
  assert.ok(makeSnapshot.indexOf('this.#renderSurface.getSnapshot()')
    < makeSnapshot.lastIndexOf('this.#assertCurrentOperationCommit()'));

  const submitStart = source.indexOf('  submitPage(');
  const renderStart = source.indexOf('  renderCurrent(', submitStart);
  const submit = source.slice(submitStart, renderStart);
  assert.ok(submit.indexOf('this.#submission = operation;')
    < submit.indexOf('childSubmission = this.#page.step(value);'));
  assert.ok(submit.indexOf('this.#childSubmission = childSubmission;')
    < submit.indexOf('this.#assertCurrentOperationCommit();',
      submit.indexOf('this.#childSubmission = childSubmission;')));

  const destroyStart = source.indexOf('  destroy():');
  const destroy = source.slice(destroyStart);
  const renderDestroy = destroy.indexOf('this.#renderSurface.destroy()');
  const pageDestroy = destroy.indexOf('this.#page.destroy()');
  assert.ok(renderDestroy < destroy.indexOf('this.#assertCurrentOperationCommit()', renderDestroy));
  assert.ok(pageDestroy < destroy.indexOf('this.#assertCurrentOperationCommit()', pageDestroy));
});

test('P6.318 keeps collection preview Page Transaction commits and child owners atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-page-transaction-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'layoutPlannerMountResourceAndSnapshotCallbacksCheckedBeforeStateCommit: true',
    'asyncResourceSubmissionCapturedBeforeCommitCheck: true',
    'destroyReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const stepStart = source.indexOf('  step(value: unknown):');
  const snapshotStart = source.indexOf('  getSnapshot():', stepStart);
  const step = source.slice(stepStart, snapshotStart);
  for (const childCall of [
    'this.#layoutOwner.observe({',
    'this.#planner.plan(layoutSnapshot.plannerInput)',
    'this.#mountLifecycle.prepareRelease({',
    'this.#mountLifecycle.commitRelease({',
    'this.#mountLifecycle.commitExecution({',
  ]) {
    const index = step.indexOf(childCall);
    assert.ok(index < step.indexOf('this.#assertCurrentOperationCommit()', index));
  }
  assert.ok(step.indexOf('this.#inFlightPromise = operation;')
    < step.indexOf('resourcePromise = this.#resourceOwner.execute({'));
  assert.ok(step.indexOf('this.#resourceSubmission = resourcePromise;')
    < step.indexOf('this.#assertCurrentOperationCommit();',
      step.indexOf('this.#resourceSubmission = resourcePromise;')));

  const destroyStart = source.indexOf('  destroy():');
  const destroy = source.slice(destroyStart);
  for (const childCall of [
    'this.#mountLifecycle.prepareAllForOwnerDestroy({',
    'this.#resourceOwner.destroy()',
    'this.#mountLifecycle.finalizeDestroy({',
    'this.#planner.destroy()',
    'this.#layoutOwner.destroy()',
  ]) {
    const index = destroy.indexOf(childCall);
    assert.ok(index < destroy.indexOf('this.#assertCurrentOperationCommit()', index));
  }
});

test('P6.319 keeps collection preview Multi-slot Renderer frame and cleanup commits atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'rendererCallbacksCheckedBeforeFrameCommit: true',
    'destroyReentryRetainsRendererOwnership: true',
  ]) assert.ok(source.includes(marker));

  const rendererStart = source.indexOf('  #callRenderer(');
  const snapshotStart = source.indexOf('  #makeSnapshot(', rendererStart);
  const renderer = source.slice(rendererStart, snapshotStart);
  assert.ok(renderer.indexOf('this.#renderer[method](...args)')
    < renderer.lastIndexOf('this.#assertCurrentOperationCommit()'));

  const destroyStart = source.indexOf('  destroy():');
  const destroy = source.slice(destroyStart);
  const disable = destroy.indexOf("this.#callRenderer('setScissorTest', [false])");
  const dispose = destroy.indexOf("this.#callRenderer('dispose', [])");
  assert.ok(disable < destroy.indexOf('this.#scissorDisabled = true', disable));
  assert.ok(dispose < destroy.indexOf('this.#rendererDisposed = true', dispose));
});

test('P6.320 keeps collection preview Mount lifecycle commits and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'mountProofSettlementAndSnapshotCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const mountStart = source.indexOf('  #mountRecord(');
  const destroyMountStart = source.indexOf('  #destroyRecordMount(', mountStart);
  const mount = source.slice(mountStart, destroyMountStart);
  const childMount = mount.indexOf('this.#mountOwner.mount({');
  assert.ok(childMount < mount.indexOf('this.#assertCurrentOperationCommit()', childMount));
  assert.ok(mount.indexOf('this.#assertCurrentOperationCommit()', childMount)
    < mount.indexOf('record.mountId = mountId'));

  const cleanupStart = source.indexOf('  #continueMountCleanupAfterFailure(', destroyMountStart);
  const destroyMount = source.slice(destroyMountStart, cleanupStart);
  const childDestroyMount = destroyMount.indexOf('this.#mountOwner.destroyMount({');
  assert.ok(childDestroyMount
    < destroyMount.indexOf('this.#assertCurrentOperationCommit()', childDestroyMount));
  assert.ok(destroyMount.indexOf('this.#assertCurrentOperationCommit()', childDestroyMount)
    < destroyMount.indexOf('record.mount = null'));

  const snapshotStart = source.indexOf('  #makeSnapshot():');
  const publishStart = source.indexOf('  #publishSnapshot():', snapshotStart);
  const snapshot = source.slice(snapshotStart, publishStart);
  assert.ok(snapshot.indexOf('this.#mountOwner.getSnapshot()')
    < snapshot.indexOf('this.#assertCurrentOperationCommit()'));

  const finalizeStart = source.indexOf('  finalizeDestroy(');
  const resetStart = source.indexOf('  resetPresentationEpoch(', finalizeStart);
  const finalize = source.slice(finalizeStart, resetStart);
  const childDestroy = finalize.indexOf('this.#mountOwner.destroy()');
  assert.ok(childDestroy < finalize.indexOf('this.#assertCurrentOperationCommit()', childDestroy));
  assert.ok(finalize.indexOf('this.#assertCurrentOperationCommit()', childDestroy)
    < finalize.indexOf('this.#records.clear()'));

  const reset = source.slice(resetStart);
  const oldOwnerDestroy = reset.indexOf('this.#mountOwner.destroy()');
  assert.ok(oldOwnerDestroy < reset.indexOf('this.#assertCurrentOperationCommit()', oldOwnerDestroy));
  assert.ok(reset.indexOf('this.#assertCurrentOperationCommit()', oldOwnerDestroy)
    < reset.indexOf('this.#mountOwner = nextMountOwner'));
});

test('P6.321 keeps collection preview Resource Composition commits and cleanup atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-collection-formal-preview-resource-execution-composition-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'executorAdapterSnapshotsCheckedBeforeAggregateCommit: true',
    'asyncChildCommandCapturedAndSettledBeforeCommitCheck: true',
    'destroyReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const captureStart = source.indexOf('  #captureChildren():');
  const synchronizeStart = source.indexOf('  #synchronizeState():', captureStart);
  const capture = source.slice(captureStart, synchronizeStart);
  const executorSnapshot = capture.indexOf('this.#executor.getSnapshot()');
  const adapterSnapshot = capture.indexOf('this.#adapter.getSnapshot()');
  assert.ok(executorSnapshot
    < capture.indexOf('this.#assertCurrentOperationCommit()', executorSnapshot));
  assert.ok(adapterSnapshot
    < capture.indexOf('this.#assertCurrentOperationCommit()', adapterSnapshot));

  const executeStart = source.indexOf('  execute(');
  const snapshotStart = source.indexOf('  getSnapshot():', executeStart);
  const execute = source.slice(executeStart, snapshotStart);
  const childExecute = execute.lastIndexOf('childPromise = this.#executor.execute(value);');
  assert.ok(execute.indexOf('this.#inFlightPromise = operation;') < childExecute);
  assert.ok(childExecute < execute.indexOf('this.#childInFlightPromise = childPromise;', childExecute));
  assert.ok(execute.indexOf('this.#attachCommandSettlement(operation, childPromise, commandOwner);')
    < execute.indexOf('this.#assertCurrentOperationCommit();', childExecute));

  const fulfilledStart = source.indexOf("this.#runSynchronousOperation('command-fulfilled'");
  const rejectedStart = source.indexOf("this.#runSynchronousOperation('command-rejected'", fulfilledStart);
  const fulfilled = source.slice(fulfilledStart, rejectedStart);
  assert.ok(fulfilled.indexOf('const children = this.#captureChildren();')
    < fulfilled.indexOf('this.#inFlightPromise = null;'));

  const destroyStart = source.indexOf('  destroy():');
  const destroy = source.slice(destroyStart);
  const executorDestroy = destroy.indexOf('this.#executor.destroy()');
  const adapterDestroy = destroy.indexOf('this.#adapter.destroy()');
  assert.ok(executorDestroy < destroy.indexOf('this.#assertCurrentOperationCommit()', executorDestroy));
  assert.ok(destroy.indexOf('this.#assertCurrentOperationCommit()', executorDestroy) < adapterDestroy);
  assert.ok(adapterDestroy < destroy.indexOf('this.#assertCurrentOperationCommit()', adapterDestroy));
});

test('P6.322 keeps collection preview Lease Command execution and resource commits atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-collection-visible-preview-lease-command-execution-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'proofAndLeaseCallbacksCheckedBeforeLedgerCommit: true',
    'acquiredLeasePromiseObservedBeforeRecordPublication: true',
    'destroyReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const snapshotStart = source.indexOf('  #makeSnapshot(');
  const snapshotFromLeaseStart = source.indexOf('  #makeSnapshotFromLease(', snapshotStart);
  const snapshot = source.slice(snapshotStart, snapshotFromLeaseStart);
  assert.ok(snapshot.indexOf('this.#leaseOwner.getSnapshot()')
    < snapshot.indexOf('this.#assertCurrentOperationCommit()'));

  const proofStart = source.indexOf('  #readProof(');
  const activeCheckStart = source.indexOf('  #assertLeaseOwnerActive(', proofStart);
  const proof = source.slice(proofStart, activeCheckStart);
  assert.ok(proof.indexOf('this.#readDestroyedProof(request)')
    < proof.indexOf('this.#assertCurrentOperationCommit()'));

  const executeParsedStart = source.indexOf('  #executeParsed(');
  const executeStart = source.indexOf('  execute(value:', executeParsedStart);
  const executeParsed = source.slice(executeParsedStart, executeStart);
  const release = executeParsed.indexOf('this.#leaseOwner.release(command);');
  const releaseCommit = executeParsed.indexOf('this.#records = new Map(working);', release);
  assert.ok(release < executeParsed.indexOf('this.#assertCurrentOperationCommit()', release));
  assert.ok(executeParsed.indexOf('this.#assertLeaseOwnerActive(', release) < releaseCommit);
  const acquire = executeParsed.indexOf('this.#leaseOwner.acquire(command);');
  const observe = executeParsed.indexOf('this.#observeSettlement(record);', acquire);
  const acquireCommit = executeParsed.indexOf('acquired.set(', acquire);
  assert.ok(acquire < observe);
  assert.ok(observe < executeParsed.indexOf('this.#assertCurrentOperationCommit()', observe));
  assert.ok(executeParsed.indexOf('this.#assertLeaseOwnerActive(', observe) < acquireCommit);

  const destroyStart = source.indexOf('  destroy():');
  const destroy = source.slice(destroyStart);
  const leaseDestroy = destroy.indexOf('this.#leaseOwner.destroy()');
  const leaseSnapshot = destroy.indexOf('this.#leaseOwner.getSnapshot()', leaseDestroy);
  assert.ok(leaseDestroy < destroy.indexOf('this.#assertCurrentOperationCommit()', leaseDestroy));
  assert.ok(leaseSnapshot < destroy.indexOf('this.#assertCurrentOperationCommit()', leaseSnapshot));
  assert.ok(destroy.indexOf('this.#assertCurrentOperationCommit()', leaseSnapshot)
    < destroy.indexOf('this.#records.clear()'));
});

test('P6.323 keeps collection preview Lease resource callbacks and cleanup commits atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-collection-formal-preview-lease-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'loadOperationCapturedAndObservedBeforeCommitCheck: true',
    'cancelAndDisposeCallbacksCheckedBeforeCleanupCommit: true',
    'cleanupReentryRetainsCurrentAndLaterResources: true',
  ]) assert.ok(source.includes(marker));

  const callExternalStart = source.indexOf('  #callExternal(');
  const captureExternalStart = source.indexOf('  #callExternalCapturingResult(', callExternalStart);
  const callExternal = source.slice(callExternalStart, captureExternalStart);
  assert.ok(callExternal.indexOf('this.#callExternalCapturingResult(method, ...args)')
    < callExternal.indexOf('this.#assertCurrentOperationCommit()'));

  const cancelStart = source.indexOf('  #cancelOnce(');
  const disposeStart = source.indexOf('  #disposeOnce(', cancelStart);
  const cancel = source.slice(cancelStart, disposeStart);
  const cancelCallback = cancel.indexOf('this.#callExternal(resource.operation.cancel)');
  assert.ok(cancelCallback
    < cancel.indexOf('resource.cancelComplete = true', cancelCallback));
  const settleLoadedStart = source.indexOf('  #settleLoaded(', disposeStart);
  const dispose = source.slice(disposeStart, settleLoadedStart);
  assert.ok(dispose.indexOf('this.#callExternal(this.#dispose, request)')
    < dispose.indexOf('resource.disposeComplete = true'));

  const acquireStart = source.indexOf('  acquire(value:');
  const releaseStart = source.indexOf('  release(value:', acquireStart);
  const acquire = source.slice(acquireStart, releaseStart);
  const ownerPublish = acquire.indexOf('const leaseResult = this.#installLease(');
  const load = acquire.indexOf('this.#callExternalCapturingResult(this.#load, loadRequest)');
  const observe = acquire.indexOf('this.#observeLoadSettlement(resource, resource.operation)');
  const commitCheck = acquire.indexOf('this.#assertCurrentOperationCommit()', observe);
  assert.ok(ownerPublish < load);
  assert.ok(load < observe && observe < commitCheck);

  const destroyStart = source.indexOf('  destroy():');
  const destroy = source.slice(destroyStart);
  assert.ok(destroy.indexOf('this.#cancelOnce(resource)')
    < destroy.indexOf('this.#leases.clear()'));
  assert.ok(destroy.indexOf('this.#disposeOnce(resource, resource.handle)')
    < destroy.indexOf('this.#resources.clear()'));
});

test('P6.324 keeps collection preview Three Mount build and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'mountBuildCheckedBeforeRecordPublication: true',
    'mountCleanupCheckedBeforeOwnershipRelease: true',
    'destroyReentryRetainsCurrentAndLaterMountOwners: true',
  ]) assert.ok(source.includes(marker));

  const mountStart = source.indexOf('  mount(value:');
  const destroyMountStart = source.indexOf('  destroyMount(value:', mountStart);
  const mount = source.slice(mountStart, destroyMountStart);
  const build = mount.indexOf('built = buildMount(parsed);');
  const publish = mount.indexOf('this.#mounts.set(parsed.mountId');
  assert.ok(build < mount.indexOf('this.#assertCurrentOperationCommit()', build));
  assert.ok(mount.indexOf('this.#assertCurrentOperationCommit()', build) < publish);
  assert.ok(mount.indexOf('cleanupOwnedMountObjects(built.cleanup)') < publish);

  const snapshotStart = source.indexOf('  getSnapshot():', destroyMountStart);
  const destroyMount = source.slice(destroyMountStart, snapshotStart);
  const cleanupMount = destroyMount.indexOf('cleanupOwnedMountObjects(record.cleanup);');
  assert.ok(cleanupMount
    < destroyMount.indexOf('this.#assertCurrentOperationCommit()', cleanupMount));
  assert.ok(destroyMount.indexOf('this.#assertCurrentOperationCommit()', cleanupMount)
    < destroyMount.indexOf('this.#mounts.delete(mountId)'));

  const destroyStart = source.indexOf('  destroy():');
  const destroy = source.slice(destroyStart);
  const cleanup = destroy.indexOf('cleanupOwnedMountObjects(record.cleanup);');
  assert.ok(cleanup < destroy.indexOf('this.#assertCurrentOperationCommit()', cleanup));
  assert.ok(destroy.indexOf('this.#assertCurrentOperationCommit()', cleanup)
    < destroy.indexOf('this.#mounts.delete(mountId)'));
});

test('P6.325 keeps formal Three preload task launch and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-asset-preloader-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'taskLoadCheckedBeforeLaunchingLaterTasks: true',
    'taskCleanupCheckedBeforeOwnershipRelease: true',
    'cleanupReentryRetainsCurrentAndLaterTasks: true',
  ]) assert.ok(source.includes(marker));

  const cleanupStart = source.indexOf('  #cleanupTasks():');
  const continuationStart = source.indexOf('  #continueRequestedDisposal():', cleanupStart);
  const cleanup = source.slice(cleanupStart, continuationStart);
  const taskDestroy = cleanup.indexOf('task.destroy();');
  const cleanupRead = cleanup.indexOf('task.isCleanupComplete()', taskDestroy);
  const taskRelease = cleanup.indexOf('this.#tasks.delete(assetId)', cleanupRead);
  assert.ok(taskDestroy < cleanup.indexOf('this.#assertCurrentOperationCommit()', taskDestroy));
  assert.ok(cleanupRead < cleanup.indexOf('this.#assertCurrentOperationCommit()', cleanupRead));
  assert.ok(cleanup.indexOf('this.#assertCurrentOperationCommit()', cleanupRead) < taskRelease);

  const loadStart = source.indexOf('  load():');
  const requireStart = source.indexOf('  requireAsset(', loadStart);
  const load = source.slice(loadStart, requireStart);
  const taskPublish = load.indexOf('this.#tasks.set(definition.id, task);');
  const taskLoad = load.indexOf('const taskOperation = task.load();', taskPublish);
  const taskCheck = load.indexOf('this.#assertCurrentOperationCommit();', taskLoad);
  assert.ok(taskPublish < taskLoad && taskLoad < taskCheck);
});

test('P6.326 keeps formal Three camera, impact and cleanup commits atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-camera-controller-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'cameraImpactAndViewportCallbacksCheckedBeforeStateCommit: true',
    'cameraWritesCheckedBeforeModelPublication: true',
    'cleanupReentryRetainsCurrentAndLaterCameraOwners: true',
  ]) assert.ok(source.includes(marker));

  const syncStart = source.indexOf('  sync(value:');
  const pauseStart = source.indexOf('  pause():', syncStart);
  const sync = source.slice(syncStart, pauseStart);
  const viewport = sync.indexOf('this.#viewportProvider()');
  const modelWrite = sync.indexOf('this.#lastModel = model;');
  assert.ok(viewport < sync.indexOf('this.#assertCurrentOperationCommit()', viewport));
  const baseCamera = sync.indexOf('applyCameraModel(this.#camera, model);');
  const impactResolve = sync.indexOf('this.#cameraImpacts.resolve(', baseCamera);
  const impactApply = sync.indexOf('applyCameraImpact(this.#camera, model, impact);');
  assert.ok(baseCamera < sync.indexOf('this.#assertCurrentOperationCommit()', baseCamera));
  assert.ok(impactResolve < sync.indexOf('this.#assertCurrentOperationCommit()', impactResolve));
  assert.ok(impactApply < sync.indexOf('this.#assertCurrentOperationCommit()', impactApply));
  assert.ok(sync.indexOf('this.#assertCurrentOperationCommit()', impactApply) < modelWrite);

  const cleanupStart = source.indexOf('  #cleanupOwnedResources():');
  const advanceStart = source.indexOf('  #advanceCameraImpactEpoch():', cleanupStart);
  const cleanup = source.slice(cleanupStart, advanceStart);
  const clear = cleanup.indexOf('this.#cameraImpacts.clear();');
  const dispose = cleanup.indexOf('this.#cameraImpacts.dispose();');
  assert.ok(clear < cleanup.indexOf('this.#assertCurrentOperationCommit()', clear));
  assert.ok(dispose < cleanup.indexOf('this.#assertCurrentOperationCommit()', dispose));
  assert.ok(cleanup.indexOf('this.#assertCurrentOperationCommit()', dispose)
    < cleanup.indexOf('this.#cameraImpactsDisposed = true'));
});

test('P6.327 keeps formal GLTF character View callbacks and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-gltf-character-view-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'viewChildCallbacksCheckedBeforeStateCommit: true',
    'heldEquipmentPublicationWaitsForReadabilityAndMountConfirmation: true',
    'viewCleanupReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const equipmentStart = source.indexOf('  #syncEquipment(');
  const feedbackAnchorStart = source.indexOf('  #feedbackAnchor(', equipmentStart);
  const equipment = source.slice(equipmentStart, feedbackAnchorStart);
  const mount = equipment.indexOf('this.#equipmentSlot.add(candidate.object);');
  const publish = equipment.indexOf('this.#heldEquipment = candidate;');
  assert.ok(mount < equipment.indexOf('this.#assertCurrentOperationCommit()', mount));
  assert.ok(equipment.indexOf('this.#assertCurrentOperationCommit()', mount) < publish);

  const disposeStart = source.indexOf('  dispose(): void {');
  const factoryStart = source.indexOf(
    'export class ArenaV2FormalGltfCharacterViewFactoryCandidateV1',
    disposeStart,
  );
  const dispose = source.slice(disposeStart, factoryStart);
  const controller = dispose.indexOf('this.#controller.dispose();');
  const root = dispose.indexOf('this.root.removeFromParent();');
  const material = dispose.indexOf('this.#ownedMaterials[index]!.dispose();');
  assert.ok(controller < dispose.indexOf('this.#assertCurrentOperationCommit()', controller));
  assert.ok(root < dispose.indexOf('this.#assertCurrentOperationCommit()', root));
  assert.ok(material < dispose.indexOf('this.#assertCurrentOperationCommit()', material));
});

test('P6.328 keeps formal GLTF character Factory registry and cleanup ownership atomic', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-gltf-character-view-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'factoryChildCallbacksCheckedBeforeRegistryCommit: true',
    'factoryViewReleaseCallbackChecksParentOperation: true',
    'factoryCleanupReentryRetainsCurrentAndLaterOwners: true',
  ]) assert.ok(source.includes(marker));

  const releaseStart = source.indexOf('  #releaseDisposedView(');
  const createStart = source.indexOf('  create(value:', releaseStart);
  const release = source.slice(releaseStart, createStart);
  assert.ok(release.indexOf('this.#assertCurrentOperationCommit()')
    < release.indexOf('this.#views.delete(participantId)'));

  const disposeStart = source.indexOf('  dispose(): void {', createStart);
  const metadataStart = source.indexOf(
    'export const ARENA_V2_FORMAL_GLTF_CHARACTER_VIEW_CANDIDATE_V1',
    disposeStart,
  );
  const dispose = source.slice(disposeStart, metadataStart);
  const viewDispose = dispose.indexOf('view.dispose();');
  const retryCleanup = dispose.indexOf('debt.retryCleanup();');
  const cleanupRead = dispose.indexOf('const cleanupComplete = debt.cleanupComplete;');
  assert.ok(viewDispose < dispose.indexOf('this.#assertCurrentOperationCommit()', viewDispose));
  assert.ok(retryCleanup < dispose.indexOf('this.#assertCurrentOperationCommit()', retryCleanup));
  assert.ok(cleanupRead < dispose.indexOf('this.#assertCurrentOperationCommit()', cleanupRead));
});

test('P6.329 keeps Information DOM platform commits and cleanup ownership atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-information-dom-surface-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted|#operationFailure/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'platformCallbacksCheckedBeforeSurfaceCommit: true',
    'cleanupReentryRetainsCurrentAndLaterDomOwners: true',
  ]) assert.ok(source.includes(marker));

  const loadStart = source.indexOf('  load(): this {');
  const bindStart = source.indexOf('  bindIntent(', loadStart);
  const load = source.slice(loadStart, bindStart);
  const hostAppend = load.indexOf('this.#hostRoot.append(surface);');
  const ready = load.indexOf('STATE_CANDIDATE_V1.READY;');
  assert.ok(hostAppend < load.indexOf('this.#assertCurrentOperationCommit()', hostAppend));
  assert.ok(load.indexOf('this.#assertCurrentOperationCommit()', hostAppend) < ready);

  const cleanupStart = source.indexOf('  #cleanupOwnedResources():');
  const failStart = source.indexOf('  #failRuntimeOperation(', cleanupStart);
  const cleanup = source.slice(cleanupStart, failStart);
  const listener = cleanup.indexOf('surface.removeEventListener(type, listener);');
  const remove = cleanup.indexOf('surface.remove();');
  assert.ok(listener < cleanup.indexOf('this.#assertCurrentOperationCommit()', listener));
  assert.ok(remove < cleanup.indexOf('this.#assertCurrentOperationCommit()', remove));
});

test('P6.330 keeps Information Canvas paint, DOM and cleanup ownership atomic', () => {
  const source = readFileSync(
    'src/entry/arena-v2-information-canvas-surface-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted|#operationFailure/u);
  for (const marker of [
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'canvasAndDomCallbacksCheckedBeforeSurfaceCommit: true',
    'cleanupReentryRetainsCurrentAndLaterCanvasOwners: true',
  ]) assert.ok(source.includes(marker));

  const paintStart = source.indexOf('  #paint():');
  const accessibleStart = source.indexOf('  #syncAccessibleLabel():', paintStart);
  const paint = source.slice(paintStart, accessibleStart);
  const paintCall = paint.indexOf('paintArenaV2UiRenderPlanV1(');
  const publish = paint.indexOf('this.#lastPaintResult = paintResult;');
  assert.ok(paintCall < paint.indexOf('this.#assertCurrentOperationCommit()', paintCall));
  assert.ok(paint.indexOf('this.#assertCurrentOperationCommit()', paintCall) < publish);

  const cleanupStart = source.indexOf('  #cleanupOwnedResources():');
  const failStart = source.indexOf('  #failRuntimeOperation(', cleanupStart);
  const cleanup = source.slice(cleanupStart, failStart);
  const listener = cleanup.indexOf('this.#canvas.removeEventListener(type, listener);');
  const liveRegion = cleanup.indexOf('this.#liveRegion.remove();');
  assert.ok(listener < cleanup.indexOf('this.#assertCurrentOperationCommit()', listener));
  assert.ok(liveRegion < cleanup.indexOf('this.#assertCurrentOperationCommit()', liveRegion));
});

test('P6.371 closes mini-game main Canvas and WebGL2 publication ownership', () => {
  const source = readFileSync(
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
    'utf8',
  );
  for (const marker of [
    'class MiniGameMainCanvasCreationOwner',
    'class MiniGameGlContextOperationOwner',
    'const mainCanvasOwner = new MiniGameMainCanvasCreationOwner(createCanvas, id)',
    'canvas = mainCanvasOwner.create()',
    'const glContextOwner = new MiniGameGlContextOperationOwner(id)',
    'getWebGLContext: glContextOwner.create',
    'mainCanvasAndWebGlUseIndependentOperationOwners: true',
    'mainCanvasPublishesOnlyAfterPrepareCanvasCompletes: true',
    'webGlContextPublishesOnlyAfterRequiredWebGl2Validation: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.371缺少${marker}`);
});

test('P6.372 closes mini-game wall and performance clock ownership', () => {
  const source = readFileSync(
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
    'utf8',
  );
  for (const marker of [
    'class MiniGameWallClockReadOwner',
    'class MiniGameClockReadOwner',
    'new MiniGameWallClockReadOwner(Date.now.bind(Date), id)',
    'new MiniGameClockReadOwner(performanceNow ?? undefined, wallClockOwner.read, id)',
    'wallNow: wallClockOwner.read',
    'douyinPerformanceUnitNormalizationRemainsUnchanged: true',
    'frameSchedulerCallbackRescheduleSemanticsRemainUnchanged: true',
  ]) assert.ok(source.includes(marker), `P6.372缺少${marker}`);
  assert.doesNotMatch(source, /wallNow: \(\) => Date\.now\(\)/u);
});

test('P6.373 closes mini-game media factories and vibration ownership', () => {
  const source = readFileSync(
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
    'utf8',
  );
  for (const marker of [
    'class MiniGameMediaFactoryOperationOwner',
    'class MiniGameVibrationOperationOwner',
    'createOffscreenCanvas: mediaFactoryOwner.createOffscreenCanvas',
    'createImage: mediaFactoryOwner.createImage',
    'createAudio: mediaFactoryOwner.createAudio',
    'vibrate: vibrationOwner.vibrate',
    'offscreenCanvasRejectsMainCanvasReuseBeforeSizing: true',
    'lightAndHeavyVibrationVocabularyRemainsUnchanged: true',
  ]) assert.ok(source.includes(marker), `P6.373缺少${marker}`);
});

test('P6.374 closes mini-game viewport snapshot ownership', () => {
  const source = readFileSync(
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
    'utf8',
  );
  for (const marker of [
    'class MiniGameViewportReadOwner',
    'const viewportOwner = new MiniGameViewportReadOwner(api, id)',
    'const readViewport = viewportOwner.read',
    'safeAreaIsCopiedFromDataPropertiesOnly: true',
    'conservativeDimensionsAndPixelRatioCapRemainUnchanged: true',
  ]) assert.ok(source.includes(marker), `P6.374缺少${marker}`);
  assert.doesNotMatch(source, /function createViewportReader\(/u);
});

test('P6.375 closes mini-game storage operation ownership', () => {
  const source = readFileSync(
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
    'utf8',
  );
  for (const marker of [
    'class MiniGameStorageOperationOwner',
    'const storageOwner = new MiniGameStorageOperationOwner({',
    'const storageRead = storageOwner.read',
    'const storageWrite = storageOwner.write',
    'const storageDelete = storageOwner.delete',
    'storageInfoFailureStillFallsBackToDirectRead: true',
    'storageKeysAndValueContractRemainUnchanged: true',
  ]) assert.ok(source.includes(marker), `P6.375缺少${marker}`);
});

test('P6.376 closes mini-game share pending and settlement ownership', () => {
  const source = readFileSync(
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
    'utf8',
  );
  for (const marker of [
    'class MiniGameShareOperationOwner',
    'const shareOwner = new MiniGameShareOperationOwner(shareAppMessage, id)',
    'share: shareOwner.share',
    'pendingIdentityPublishesBeforeHostInvocation: true',
    'duplicateShareWhilePendingReturnsFalse: true',
    'staleSettlementCannotReleaseNewerRequest: true',
  ]) assert.ok(source.includes(marker), `P6.376缺少${marker}`);
  assert.doesNotMatch(source, /share: async \(payload\)/u);
});

test('P6.377 closes mini-game asset request ownership', () => {
  const source = readFileSync(
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
    'utf8',
  );
  for (const marker of [
    'class MiniGameAssetReadRequestOwner',
    'class MiniGameAssetReadService',
    'const assetReadService = new MiniGameAssetReadService(api, id)',
    'const readAssetBytes = assetReadService.read',
    'firstCallbackSettlementWinsAndLateCallbacksAreInert: true',
    'concurrentReadsForDifferentAssetsRemainAllowed: true',
  ]) assert.ok(source.includes(marker), `P6.377缺少${marker}`);
  assert.doesNotMatch(source, /function createMiniGameAssetReader\(/u);
});

test('P6.378-P6.379 close mini-game input and notification binding ownership', () => {
  const source = readFileSync(
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
    'utf8',
  );
  for (const marker of [
    'class MiniGameInputBindingOwner',
    'class MiniGameNotificationBindingOwner',
    'const inputBindingOwner = new MiniGameInputBindingOwner({',
    'const notificationBindingOwner = new MiniGameNotificationBindingOwner({',
    'bindInput: inputBindingOwner.bind',
    'onResize: notificationBindingOwner.onResize',
    'onShow: notificationBindingOwner.onShow',
    'onHide: notificationBindingOwner.onHide',
    'partialTouchRegistrationRollsBackInReverseOrder: true',
    'cleanupFailureRetainsExactSubscriptionForRetry: true',
    'lateTouchDeliveryRemainsInertAfterCleanupStarts: true',
  ]) assert.ok(source.includes(marker), `P6.378-P6.379缺少${marker}`);
});

test('P6.380 closes synchronous frame delivery without blocking legal rescheduling', () => {
  const source = readFileSync(
    'packages/arena-platform-contracts/src/index.ts',
    'utf8',
  );
  for (const marker of [
    'let callbackFailed = false',
    'let callbackFailure: unknown = null',
    'if (callbackFailed) throw callbackFailure',
    'if (!entry.active || !pending.has(token)) return token',
    'synchronousDeliveryStillAllowsCallbackRequestedNextFrame: true',
    'deliveredFrameNeverCreatesOrphanFallbackTimer: true',
    'synchronousCallbackFailureCannotBeSwallowedByHostRequest: true',
    'undefinedHostFrameIdStillMeansScheduled: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.380缺少${marker}`);
});

test('P6.381 shares one coordinate snapshot across a mini-game touch event', () => {
  const source = readFileSync(
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
    'utf8',
  );
  for (const marker of [
    'type MiniGameTouchCoordinateSnapshot',
    'const viewport = readViewport()',
    'const coordinates = Object.freeze({',
    "const value = touchPoint(hostObject(touch, 'mini-game touch'), coordinates)",
    'oneViewportAndCanvasSnapshotIsSharedByAllTouchesInOneEvent: true',
  ]) assert.ok(source.includes(marker), `P6.381缺少${marker}`);
  const touchPointStart = source.indexOf('function touchPoint(');
  const touchPointsStart = source.indexOf('function touchPoints(', touchPointStart);
  assert.doesNotMatch(source.slice(touchPointStart, touchPointsStart), /readViewport\(\)/u);
});

test('P6.382 assembles only an unpublished immutable formal-asset ledger proposal', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-a3-a6-production-approval-immutable-ledger-assembly-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1',
    'createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1',
    'createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1',
    "productionApprovalStatus: 'approved-decision-assembled-not-published'",
    "publicationStatus: 'immutable-proposal-not-published'",
    'currentLedgerMutated: false',
    'publishesLedger: false',
    'approvedEntriesRemainRuntimeUnusableUntilSeparatePublication: true',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.382缺少${marker}`);
  assert.doesNotMatch(source, /writeFile|appendFile|rename\(|copyFile/u);
});

test('P6.422 closes the shared GLTF loader late-settlement and texture-handler lifecycle', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/gltf-presentation-asset-loader.ts',
    'utf8',
  );
  for (const marker of [
    "'active' | 'destroy-requested' | 'destroy-incomplete' | 'destroyed'",
    'this.#pendingLoads.add(sequence)',
    'GltfPresentationAssetLoader销毁期间拒绝发布迟到资产',
    'candidateDisposal.dispose()',
    'cleanup.removeHandler(cleanup.pattern)',
    'pendingLoadOwnerPublishedBeforeExternalRead: true',
    'destroyRejectsNewLoadsBeforeDefinitionRead: true',
    'lateParsedSceneDisposedBeforeRejection: true',
    'textureHandlerRemovedAfterPendingLoadsSettle: true',
    'pendingAssetReadsOwnAbortControllers: true',
    'destroyAbortsPendingAssetReadsBeforeWaitingForGltfSettlement: true',
    'assetReadAbortControllersReleasedOnlyByMatchingLoadOwner: true',
    'incompleteTextureHandlerRemovalRetainedForRetry: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.422缺少${marker}`);
});

test('P6.423 keeps every default GLTF loader owned through child cleanup settlement', () => {
  const sources = Object.freeze({
    renderer: readFileSync(
      'packages/arena-presentation-three/src/arena-greybox-renderer.ts',
      'utf8',
    ),
    factory: readFileSync(
      'packages/arena-presentation-three/src/gltf-character-view-factory.ts',
      'utf8',
    ),
    preloader: readFileSync(
      'packages/arena-product-presentation-three/src/arena-v2-formal-three-asset-preloader-candidate-v1.ts',
      'utf8',
    ),
    adapter: readFileSync(
      'packages/arena-product-presentation-three/src/arena-v2-collection-preview-lazy-gltf-loader-adapter-candidate-v1.ts',
      'utf8',
    ),
    composition: readFileSync(
      'packages/arena-product-presentation-three/src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
      'utf8',
    ),
  });
  for (const marker of [
    '#presentationAssetLoader: GltfPresentationAssetLoader | null',
    'this.#cleanup.assetLoader',
    'this.#presentationAssetLoader.isCleanupComplete()',
  ]) assert.ok(sources.renderer.includes(marker), `P6.423 Renderer缺少${marker}`);
  for (const marker of [
    '#ownedLoader: GltfPresentationAssetLoader | null',
    'const usesDefaultLoader = injectedLoader === undefined || injectedLoader === null',
    'this.#ownedLoader.destroy()',
    'this.#ownedLoader.isCleanupComplete()',
  ]) assert.ok(sources.factory.includes(marker), `P6.423 Factory缺少${marker}`);
  assert.ok(
    sources.preloader.includes('defaultUnderlyingLoaderOwnedAndDestroyedAfterTasks: true'),
    'P6.423 Preloader缺少默认loader所有权标记',
  );
  assert.ok(
    sources.preloader.includes(
      'defaultUnderlyingLoaderShutdownRequestedBeforeTaskSettlementWait: true',
    ),
    'P6.423 Preloader缺少默认loader取消启动水位',
  );
  assert.ok(
    sources.adapter.includes('defaultUnderlyingLoaderOwnedUntilAllTasksSettle: true'),
    'P6.423 A6.11a缺少默认loader所有权标记',
  );
  assert.ok(
    sources.adapter.includes('successfulOwnedLoaderRetryPublishesDestroyed: true'),
    'P6.423 A6.11a缺少默认loader清理重试终态标记',
  );
  for (const marker of [
    'const usesDefaultUnderlyingLoader = value.underlyingLoader === undefined',
    'constructorRollbackReleasesDefaultLoaderAndStaticOwners: true',
    'defaultUnderlyingLoaderOwnedUntilPreviewResourcesRelease: true',
    'defaultUnderlyingLoaderAcceptsCancellableAssetReadAndImagePorts: true',
    'defaultUnderlyingLoaderShutdownRequestedBeforePreviewTaskSettlementWait: true',
    'lateLoaderSettlementNotificationSuppressedAfterDestroy: true',
    'underlyingSurfaceWaitsForLoaderCleanup: true',
    'this.#notifyingLoader.destroy()',
    'this.#notifyingLoader.isCleanupComplete()',
  ]) assert.ok(sources.composition.includes(marker), `P6.423 A6.16缺少${marker}`);
});

test('P6.424 cancels platform texture requests before GLTF handler teardown', () => {
  const textureLoader = readFileSync(
    'packages/arena-presentation-three/src/platform-texture-loader.ts',
    'utf8',
  );
  for (const marker of [
    "'active' | 'destroy-requested' | 'destroy-incomplete' | 'destroyed'",
    'this.#cancelRequestBySequence.set(requestSequence',
    'PlatformTextureLoader销毁已取消纹理',
    'cleanupImage(activeImage)',
    'requestOwnerPublishedBeforeManagerStart: true',
    'destroyCancelsPendingImagesAndDetachesCallbacks: true',
    'cancellationBalancesStartedManagerItem: true',
    'incompleteCancellationCleanupRetainedForRetry: true',
    'lateImageCallbacksCannotRepublishTexture: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(textureLoader.includes(marker), `P6.424 Texture Loader缺少${marker}`);
  const gltfLoader = readFileSync(
    'packages/arena-presentation-three/src/gltf-presentation-asset-loader.ts',
    'utf8',
  );
  for (const marker of [
    'platformTextureLoader.destroy()',
    'platformTextureLoader.isCleanupComplete()',
    'platformTextureLoaderPendingRequestCount',
    'pendingPlatformTexturesCancelledBeforeWaitingForGltfSettlement: true',
  ]) assert.ok(gltfLoader.includes(marker), `P6.424 GLTF Loader缺少${marker}`);
});

test('P6.425 closes texture completion reentry and non-Error lifecycle failures', () => {
  const textureLoader = readFileSync(
    'packages/arena-presentation-three/src/platform-texture-loader.ts',
    'utf8',
  );
  for (const marker of [
    'completionAndCancellationShareOneRequestWatermark: true',
    'managerReentryCannotRecursivelyCleanSameRequest: true',
    'managerStartReentryDefersCancellationUntilCallbackReturns: true',
    'deferredCancellationDoesNotFailOwningCallback: true',
    'cancellationRequestedDuringCompletion',
    'cancellationRequestedDuringManagerStart',
  ]) assert.ok(textureLoader.includes(marker), `P6.425 Texture Loader缺少${marker}`);
  const gltfLoader = readFileSync(
    'packages/arena-presentation-three/src/gltf-presentation-asset-loader.ts',
    'utf8',
  );
  assert.ok(
    gltfLoader.includes('thrownNullAndUndefinedRemainFailuresDuringLoadCleanup: true'),
    'P6.425 GLTF Loader缺少非Error失败标记',
  );
  const adapter = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-lazy-gltf-loader-adapter-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'let releaseFailed = false',
    'let destroyFailed = false',
    'thrownNullAndUndefinedRemainLifecycleFailures: true',
    'taskDestroyAndCleanupCheckShareFailureWatermark: true',
  ]) assert.ok(adapter.includes(marker), `P6.425 A6.11a缺少${marker}`);
});

test('P6.426 retains platform texture requests until GLTF error delivery confirms', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/platform-texture-loader.ts',
    'utf8',
  );
  for (const marker of [
    'const notifyError = (error: Error): readonly unknown[]',
    'errorCallbackNotified = callbackErrors.length === 0',
    'errorCallbackMustConfirmBeforeRequestOwnerRelease: true',
    'errorCallbackRetryReusesSameFailureObject: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.426缺少${marker}`);
});

test('P6.427 closes natural texture failure and cleanup reentry ownership', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/platform-texture-loader.ts',
    'utf8',
  );
  for (const marker of [
    'if (cleanupInProgress)',
    "this.#state = 'destroy-incomplete'",
    'failureCleanupReentryDefersToCurrentOwner: true',
    'incompleteNaturalFailureClosesLoaderToNewRequests: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.427缺少${marker}`);
});

test('P6.428 closes host image callback binding and success confirmation ownership', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/platform-texture-loader.ts',
    'utf8',
  );
  for (const marker of [
    'const requestMayContinue = (): boolean',
    'imageErrorInProgress',
    'const writeImageField = (write: () => void, name: string): boolean',
    'cleanupImage(imageOwner)',
    'imageCallbackBindingStopsAfterSynchronousSettlement: true',
    'successCallbackMustConfirmBeforeTextureOwnershipTransfer: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.428缺少${marker}`);
});

test('P6.429 retains host image callback cleanup debt across fallback and destroy', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/platform-texture-loader.ts',
    'utf8',
  );
  for (const marker of [
    'interface HostImageCleanupOwner',
    'const imageCleanupOwners = new Set<HostImageCleanupOwner>()',
    'queuedBindingSignalConflict',
    'cancellationRequestedDuringImageCreation',
    'cancellationRequestedDuringImageBinding',
    'cancellationRequestedDuringImageError',
    'imageCallbackDetachFailuresRetainedPerAttempt: true',
    'bindingSignalsSettleAfterHostSetterReturns: true',
    'destroyDuringImageCreationAndBindingDefersToOwner: true',
    'destroyDuringImageFailureDefersToCurrentAttempt: true',
    'fallbackCannotAbandonPriorImageCleanupDebt: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.429缺少${marker}`);
});

test('P6.430 rejects and detects swallowed public load reentry from external callbacks', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/platform-texture-loader.ts',
    'utf8',
  );
  for (const marker of [
    '#externalCallbackDepth = 0',
    '#loadReentryAttemptCount = 0',
    '#invokeExternal<T>(name: string, invoke: () => T): T',
    'PlatformTextureLoader外部回调期间拒绝公开load同步重入',
    'externalCallbacksCannotReenterPublicLoad: true',
    'swallowedLoadReentryFailsOwningRequest: true',
    'asynchronousLoadsRemainAllowedOutsideExternalCallbackStack: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.430缺少${marker}`);
});

test('P6.431 retains itemStart rollback debt under the original request owner', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/platform-texture-loader.ts',
    'utf8',
  );
  for (const marker of [
    'const rollbackFailures = failPermanently(error)',
    'LoadingManager.itemStart失败且PlatformTextureLoader回滚未完成',
    'itemStartFailureRetainsRequestOwnerUntilRollbackCompletes: true',
    'itemStartAttemptBalancesManagerErrorAndEnd: true',
    'itemStartRollbackFailureClosesLoaderAndRetries: true',
    'itemStartPrimaryAndCleanupFailuresRemainObservable: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.431缺少${marker}`);
});

test('P6.432 retains invalid GLTF candidate cleanup debt for destroy retry', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/gltf-presentation-asset-loader.ts',
    'utf8',
  );
  for (const marker of [
    'readonly #retainedCandidateDisposals = new Map<number, ThreeObjectDisposalLease>()',
    'retainedCandidateDisposalCount: this.#retainedCandidateDisposals.size',
    'this.#retainedCandidateDisposals.set(sequence, candidateDisposal)',
    'invalidCandidateDisposalRetainedForDestroyRetry: true',
    'candidateCleanupDebtClosesLoaderToNewLoads: true',
    'candidateCleanupRetryPrecedesDestroyedPublication: true',
    'candidateCleanupFailuresRetainOriginalLoadFailure: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.432缺少${marker}`);
});

test('P6.433 defers GLTF terminal cleanup destroy reentry to the current owner', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/gltf-presentation-asset-loader.ts',
    'utf8',
  );
  for (const marker of [
    '#terminalCleanupInProgress = false',
    '#terminalCleanupDestroyReentryCount = 0',
    'if (this.#terminalCleanupInProgress)',
    'terminalCleanupReentryDefersToCurrentOwner: true',
    'removeHandlerDestroyReentryCannotRepeatRemoval: true',
    'candidateCleanupDestroyReentryCannotRepeatDisposal: true',
    'destroyReentryDoesNotPublishIncompleteState: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.433缺少${marker}`);
});

test('P6.434 rejects swallowed GLTF public load reentry without abandoning async results', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/gltf-presentation-asset-loader.ts',
    'utf8',
  );
  for (const marker of [
    'interface LoadExternalInvocation<T>',
    '#externalCallbackDepth = 0',
    '#loadReentryAttemptCount = 0',
    '#invokeLoadExternal<T>(name: string, invoke: () => T)',
    'settleExternalInvocation(',
    'GltfPresentationAssetLoader外部回调期间拒绝公开load同步重入',
    'externalCallbacksCannotReenterPublicLoad: true',
    'swallowedLoadReentryFailsOwningLoad: true',
    'reentrantAsyncResultStillSettlesUnderOriginalOwner: true',
    'callbackStackExitRestoresConcurrentLoadAdmission: true',
    'publishedLeaseReleaseRemainsOutsideLoaderReentryGate: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.434缺少${marker}`);
});

test('P6.435 retains the raw GLTF scene when candidate lease construction fails', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/gltf-presentation-asset-loader.ts',
    'utf8',
  );
  for (const marker of [
    'readonly #retainedCandidateScenes = new Map<number, THREE.Object3D>()',
    'this.#retainedCandidateScenes.set(sequence, candidateScene)',
    'this.#retainedCandidateScenes.size + this.#retainedCandidateDisposals.size',
    'candidateLeaseConstructionFailureRetainsSceneOwner: true',
    'retainedSceneOwnerRetriesLeaseConstructionBeforeDispose: true',
    'candidateSceneOwnerClosesLoaderUntilCleanupCompletes: true',
    'leaseConstructionAndCleanupFailuresRemainObservable: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.435缺少${marker}`);
});

test('P6.436 registers the GLTF texture handler under a recoverable pending load owner', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/gltf-presentation-asset-loader.ts',
    'utf8',
  );
  for (const marker of [
    '#textureHandlerRegistration:',
    '#ensureTextureHandlerRegistered(): void',
    'this.#textureHandlerCleanup = Object.freeze({',
    "'LoadingManager.addHandler()'",
    'textureHandlerRegistrationRunsUnderPendingLoadOwner: true',
    'registrationAttemptPublishesCleanupOwnerBeforeManagerCall: true',
    'registrationFailureRetainsHandlerRemovalDebt: true',
    'destroyBeforeFirstLoadSkipsUnregisteredHandlerRemoval: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.436缺少${marker}`);
});

test('P6.437 keeps the match creatable when a loaded GLTF character template is structurally invalid', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/gltf-character-view-factory.ts',
    'utf8',
  );
  for (const marker of [
    'readonly #templateConstructionErrors = new Map<string, unknown>()',
    '!this.#templateConstructionErrors.has(asset.id)',
    'this.#templateConstructionErrors.set(asset.id, error)',
    'templateConstructionErrorAssetIds:',
    'loadedTemplateConstructionFailureUsesProgrammaticFallback: true',
    'structurallyRejectedTemplateRemainsRejectedForFactoryLifetime: true',
    'successfulGltfTemplateRemainsNormalRenderingPath: true',
    'fallbackDoesNotReleaseSharedTemplateLeaseEarly: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.437缺少${marker}`);
});

test('P6.438 limits GLTF character fallback to typed template integration failures', () => {
  const viewSource = readFileSync(
    'packages/arena-presentation-three/src/gltf-character-view.ts',
    'utf8',
  );
  const factorySource = readFileSync(
    'packages/arena-presentation-three/src/gltf-character-view-factory.ts',
    'utf8',
  );
  for (const marker of [
    'export class GltfCharacterTemplateIntegrationError extends Error',
    'throw new GltfCharacterTemplateIntegrationError(error)',
  ]) assert.ok(viewSource.includes(marker), `P6.438 View缺少${marker}`);
  for (const marker of [
    'error instanceof GltfCharacterTemplateIntegrationError',
    'fallbackRequiresTypedTemplateIntegrationFailure: true',
    'malformedTemplatePayloadMayUseFallback: true',
    'definitionAndActionConfigurationFailuresRemainFatal: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(factorySource.includes(marker), `P6.438 Factory缺少${marker}`);
});

test('P6.439 retains replacement equipment candidates when immediate cleanup also fails', () => {
  for (const path of [
    'packages/arena-presentation-three/src/gltf-character-view.ts',
    'packages/arena-presentation-three/src/programmatic-character-view.ts',
  ]) {
    const source = readFileSync(path, 'utf8');
    for (const marker of [
      '#pendingEquipmentCandidate:',
      '#releaseEquipmentCandidate(',
      'candidateOwnerPublishedBeforeHeldEquipmentRelease: true',
      'failedCandidateCleanupRetainedForDisposeRetry: true',
      'pendingCandidateCleanupPrecedesHeldEquipmentAndViewCleanup: true',
      "validationStatus: 'not-run'",
    ]) assert.ok(source.includes(marker), `P6.439 ${path}缺少${marker}`);
  }
});

test('P6.440 retains failed GLTF view construction cleanup under the factory owner', () => {
  const viewSource = readFileSync(
    'packages/arena-presentation-three/src/gltf-character-view.ts',
    'utf8',
  );
  for (const marker of [
    'interface GltfCharacterViewConstructionResources',
    'function cleanupConstructionResources(',
    'get cleanupComplete(): boolean',
    'retryCleanup(): void',
    'constructionResources.controller = controller',
  ]) assert.ok(viewSource.includes(marker), `P6.440 View缺少${marker}`);
  const factorySource = readFileSync(
    'packages/arena-presentation-three/src/gltf-character-view-factory.ts',
    'utf8',
  );
  for (const marker of [
    '#constructionCleanupDebts = new Set<CharacterViewConstructionCleanupDebt>()',
    'this.#constructionCleanupDebts.add(error)',
    'errors.push(...this.#retryConstructionCleanupDebts())',
    'failedConstructionCleanupRetainsFactoryOwnership: true',
    'constructionDebtCleanupPrecedesSharedTemplateRelease: true',
    'incompleteConstructionCleanupClosesFactoryToCreate: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(factorySource.includes(marker), `P6.440 Factory缺少${marker}`);
});

test('P6.441 retains programmatic view construction cleanup under both factory paths', () => {
  const viewSource = readFileSync(
    'packages/arena-presentation-three/src/programmatic-character-view.ts',
    'utf8',
  );
  for (const marker of [
    'interface ProgrammaticCharacterViewConstructionResources',
    'export class ProgrammaticCharacterViewConstructionCleanupError extends AggregateError',
    'resources.lease = new ThreeObjectDisposalLease(resources.root)',
    'retryCleanup(): void',
    'constructionResources.lease = rootLease',
  ]) assert.ok(viewSource.includes(marker), `P6.441 View缺少${marker}`);
  const programmaticFactory = readFileSync(
    'packages/arena-presentation-three/src/programmatic-character-view-factory.ts',
    'utf8',
  );
  for (const marker of [
    '#constructionCleanupDebts = new Set<ProgrammaticCharacterConstructionCleanupDebt>()',
    'this.#constructionCleanupDebts.add(error)',
    'failedConstructionCleanupRetainsFactoryOwnership: true',
    'incompleteConstructionCleanupClosesFactoryToCreate: true',
    'factoryDisposeRetriesOnlyIncompleteConstructionDebt: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(programmaticFactory.includes(marker), `P6.441 Programmatic Factory缺少${marker}`);
  const gltfFactory = readFileSync(
    'packages/arena-presentation-three/src/gltf-character-view-factory.ts',
    'utf8',
  );
  for (const marker of [
    '| ProgrammaticCharacterViewConstructionCleanupError',
    'error instanceof ProgrammaticCharacterViewConstructionCleanupError',
    'failedProgrammaticFallbackCleanupRetainsFactoryOwnership: true',
  ]) assert.ok(gltfFactory.includes(marker), `P6.441 GLTF Factory缺少${marker}`);
});

test('P6.442 composes animation controller construction cleanup into both GLTF view owners', () => {
  const controllerSource = readFileSync(
    'packages/arena-presentation-three/src/character-animation-controller.ts',
    'utf8',
  );
  for (const marker of [
    'export class CharacterAnimationControllerConstructionCleanupError extends AggregateError',
    '() => this.#cleanup()',
    '() => this.#mixerStopped && this.#rootUncached',
    'constructorCleanupFailureRetainsRetryOwner: true',
    'retrySkipsCompletedMixerCleanup: true',
    'nestedViewConstructionMayComposeControllerDebt: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(controllerSource.includes(marker), `P6.442 Controller缺少${marker}`);
  const sharedView = readFileSync(
    'packages/arena-presentation-three/src/gltf-character-view.ts',
    'utf8',
  );
  for (const marker of [
    'controllerConstructionDebt: CharacterAnimationControllerConstructionCleanupError | null',
    'resources.controllerConstructionDebt.retryCleanup()',
    'error instanceof CharacterAnimationControllerConstructionCleanupError',
  ]) assert.ok(sharedView.includes(marker), `P6.442 Shared View缺少${marker}`);
  const formalView = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-gltf-character-view-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'controllerConstructionDebt: CharacterAnimationControllerConstructionCleanupError | null',
    'resources.controllerConstructionDebt.retryCleanup()',
    'error instanceof CharacterAnimationControllerConstructionCleanupError',
    'failedControllerConstructionCleanupRetainsFactoryOwnership: true',
  ]) assert.ok(formalView.includes(marker), `P6.442 Formal View缺少${marker}`);
});

test('P6.443 retains programmatic builder resources created before root publication', () => {
  const viewSource = readFileSync(
    'packages/arena-presentation-three/src/programmatic-character-view.ts',
    'utf8',
  );
  for (const marker of [
    'interface ProgrammaticCharacterBuildResources',
    'function trackBuildResource<',
    'function cleanupBuildResources(',
    'export class ProgrammaticCharacterBuildConstructionCleanupError',
    'buildArticulatedCharacterOwned({ robot, root, resources: buildResources })',
  ]) assert.ok(viewSource.includes(marker), `P6.443 Builder缺少${marker}`);
  const programmaticFactory = readFileSync(
    'packages/arena-presentation-three/src/programmatic-character-view-factory.ts',
    'utf8',
  );
  for (const marker of [
    'error instanceof ProgrammaticCharacterBuildConstructionCleanupError',
    'failedBuilderCleanupRetainsFactoryOwnership: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(programmaticFactory.includes(marker), `P6.443 Programmatic Factory缺少${marker}`);
  const gltfFactory = readFileSync(
    'packages/arena-presentation-three/src/gltf-character-view-factory.ts',
    'utf8',
  );
  for (const marker of [
    '| ProgrammaticCharacterBuildConstructionCleanupError',
    'error instanceof ProgrammaticCharacterBuildConstructionCleanupError',
    'failedProgrammaticBuilderCleanupRetainsFactoryOwnership: true',
  ]) assert.ok(gltfFactory.includes(marker), `P6.443 GLTF Factory缺少${marker}`);
});

test('P6.444 validates GLTF factory data before constructing its owned loader', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/gltf-character-view-factory.ts',
    'utf8',
  );
  for (const marker of [
    'function snapshotDefaultLoad(): LoadMethod',
    'registryAndEquipmentValidationPrecedeOwnedLoaderConstruction: true',
    'defaultLoadMethodCapturedBeforeOwnedLoaderConstruction: true',
    'ownedLoaderHasNoExternalFactoryInitializationAfterConstruction: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.444 Factory缺少${marker}`);
  const constructorStart = source.indexOf('  constructor(options: unknown) {');
  const constructorEnd = source.indexOf('\n  #assertUsable(): void {', constructorStart);
  const constructor = source.slice(constructorStart, constructorEnd);
  const registryRead = constructor.indexOf('const definitions = this.#assetRegistry.list();');
  const equipmentCommit = constructor.indexOf('this.#equipmentAssetByDefinitionId = equipmentAssets;');
  const defaultMethod = constructor.indexOf('const defaultLoad = usesDefaultLoader ? snapshotDefaultLoad() : null;');
  const loaderConstruction = constructor.indexOf('new GltfPresentationAssetLoader()');
  assert.ok(registryRead >= 0 && registryRead < loaderConstruction);
  assert.ok(equipmentCommit >= 0 && equipmentCommit < loaderConstruction);
  assert.ok(defaultMethod >= 0 && defaultMethod < loaderConstruction);
});

test('P6.445 validates GLTF loader options and default prototypes before creating child owners', () => {
  const source = readFileSync(
    'packages/arena-presentation-three/src/gltf-presentation-asset-loader.ts',
    'utf8',
  );
  for (const marker of [
    'function snapshotUnboundMethod(',
    'optionAndPrototypeValidationPrecedesDefaultLoaderConstruction: true',
    'defaultLoaderMethodsCapturedWithoutPostConstructionPrototypeReads: true',
    'platformTextureOwnerCreatedAfterHandlerPortsCaptured: true',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker), `P6.445 Loader缺少${marker}`);
  const constructorStart = source.indexOf('  constructor(options: unknown = {}) {');
  const constructorEnd = source.indexOf('\n  #advanceLoadReentryAttempt(): void {', constructorStart);
  const constructor = source.slice(constructorStart, constructorEnd);
  const readValidation = constructor.indexOf('GltfPresentationAssetLoader.readAssetBytes 必须是函数或 null。');
  const imageValidation = constructor.indexOf('GltfPresentationAssetLoader.createImage 必须是函数或 null。');
  const defaultPrototype = constructor.indexOf("snapshotUnboundMethod(GLTFLoader.prototype, 'loadAsync'");
  const defaultLoader = constructor.indexOf('new GLTFLoader()');
  const handlerPorts = constructor.indexOf('const removeHandler = usesDefaultLoader');
  const textureOwner = constructor.indexOf('new PlatformTextureLoader({ createImage, manager })');
  assert.ok(readValidation >= 0 && readValidation < defaultLoader);
  assert.ok(imageValidation >= 0 && imageValidation < defaultLoader);
  assert.ok(defaultPrototype >= 0 && defaultPrototype < defaultLoader);
  assert.ok(handlerPorts >= 0 && handlerPorts < textureOwner);
});
