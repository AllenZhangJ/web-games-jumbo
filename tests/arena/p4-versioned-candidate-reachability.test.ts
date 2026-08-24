import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const PRODUCTION_ROOTS = Object.freeze([
  'src/arena',
  'packages/arena-v1-composition/src',
  'packages/arena-v1-application-launch/src',
  'packages/arena-v1-application-session/src',
  'packages/arena-product-composition/src',
  'packages/arena-product-presentation-three/src',
  'packages/arena-product-v1-content/src',
]);

const P4_VERSIONED_SURFACE = new RegExp([
  '\\b(?:createSurvivalEnemyPrimaryActionAffordanceV1|createArenaWeaponFeedbackSemanticEventV1|resolveArenaWeaponFeedbackSemanticV1|MatchCoreWeaponFeedbackAdapterV1|projectArenaWeaponFeedbackEventV6PresentationEvent|ArenaV2ModeHudFeedbackEffectConsumerV1|WEAPON_FEEDBACK_RESOLVED|getPublicSupplyProjectionV3|composeSurvivalMatchReadFrameV3|SurvivalPressureResolverV1|waveEquipmentOverrides|createWeaponCombatGrammarDefinitionV1|ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_FLANK_BLADE_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_LAUNCH_WEAPON_CATALOG_CANDIDATE_V1',
  '|ARENA_V2_EXPANDED_WEAPON_CATALOG_CANDIDATE_V1',
  '|ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1',
  '|ARENA_V2_UNARMED_ACTION_CANDIDATE_V1',
  '|ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1',
  '|ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1',
  '|createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1',
  '|runArenaBaselineWeaponConsequenceVerificationCandidateV1',
  '|runArenaBaselineWeaponMatchCoreReplayVerificationCandidateV1',
  '|runArenaExpandedWeaponCounterplayVerificationCandidateV1',
  '|runArenaExpandedWeaponSpatialCounterplayVerificationCandidateV1',
  '|runArenaExpandedWeaponVerificationCandidateV1',
  '|runArenaLineSuppressorVerificationCandidateV1',
  '|runArenaReadCounterVerificationCandidateV1',
  '|runArenaFlankBladeVerificationCandidateV1',
  '|runArenaSurvivalBaselineWeaponSupplyVerificationCandidateV1',
  '|runArenaSurvivalWeaponTierConsequenceVerificationCandidateV1',
  '|runArenaSurvivalWeaponBotAffordanceVerificationCandidateV1',
  '|runArenaSurvivalTieredSupplyMatchCoreVerificationCandidateV1',
  '|runArenaSurvivalTenWaveMatchCoreVerificationCandidateV1',
  '|runArenaSurvivalPressureBotLongRunVerificationCandidateV1)\\b',
  '|/(?:weapon-feedback-semantic-v1',
  '|weapon-feedback-resolver-v1',
  '|arena-v2-mode-hud-feedback-effect-consumer-v1',
  '|match-core-weapon-feedback-adapter-v1',
  '|weapon-combat-grammar-definition-v1',
  '|survival-match-read-frame-v3-adapter',
  '|survival-pressure-resolver-v1',
  '|arena-v2-heavy-hammer-weapon-candidate-v1',
  '|arena-v2-gravity-chain-weapon-candidate-v1',
  '|arena-v2-charge-shield-weapon-candidate-v1',
  '|arena-v2-line-suppressor-weapon-candidate-v1',
  '|arena-v2-read-counter-weapon-candidate-v1',
  '|arena-v2-flank-blade-weapon-candidate-v1',
  '|arena-v2-launch-weapon-catalog-candidate-v1',
  '|arena-v2-expanded-weapon-candidates-v1',
  '|arena-v2-collection-weapon-catalog-candidate-v1',
  '|arena-v2-unarmed-action-candidate-v1',
  '|arena-v2-survival-baseline-weapon-tiers-candidate-v1',
  '|arena-v2-survival-pressure-candidate-v1',
  '|arena-baseline-weapon-consequence-verification-v1',
  '|arena-baseline-weapon-matchcore-replay-verification-v1',
  '|arena-expanded-weapon-counterplay-verification-v1',
  '|arena-expanded-weapon-spatial-counterplay-verification-v1',
  '|arena-expanded-weapon-verification-v1',
  '|arena-line-suppressor-verification-v1',
  '|arena-read-counter-verification-v1',
  '|arena-flank-blade-verification-v1',
  '|arena-survival-baseline-weapon-supply-verification-v1',
  '|arena-survival-weapon-tier-consequence-verification-v1',
  '|arena-survival-weapon-bot-affordance-verification-v1',
  '|arena-survival-tiered-supply-matchcore-verification-v1',
  '|arena-survival-pressure-bot-long-run-verification-v1)\\.js',
].join(''), 'u');

function typescriptFiles(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...typescriptFiles(candidate));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(candidate);
  }
  return result;
}

const CANDIDATE_COMPOSITION_ALLOWLIST = new Set([
  'packages/arena-product-composition/src/arena-v2-learning-evidence-composition-candidate-v1.ts',
]);

test('P4 weapon candidates remain unreachable until the P4 gate approves production wiring', () => {
  for (const root of PRODUCTION_ROOTS) {
    for (const file of typescriptFiles(root)) {
      if (CANDIDATE_COMPOSITION_ALLOWLIST.has(file)) continue;
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        P4_VERSIONED_SURFACE,
        `${file} 不得在P4门批准前接入武器候选。`,
      );
    }
  }
});

test('P4 first weapon provisioning retains failed bootstrap cleanup ownership', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-first-weapon-registry-provisioning-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /this\.#runtimeBootstrap = cleanupIncomplete \? bootstrap : null/u);
  assert.match(
    source,
    /if \(this\.#runtimeBootstrap !== null\)[\s\S]*failedBootstrap\.destroy\(\)[\s\S]*this\.#runtimeBootstrap === failedBootstrap/u,
  );
  assert.match(source, /failedRuntimeBootstrapCleanupRetainsOwner: true/u);
  assert.match(source, /runtimeBootstrapRetryCleansPriorFailedInstance: true/u);
  assert.match(source, /destroyRetriesOnlyOwnedChildren: true/u);
});

test('P4 single-weapon admission consumes the shared production approval index', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-single-weapon-production-readiness-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /isArenaV2FormalAssetProductionApprovedCandidateV1/u);
  assert.match(source, /isArenaV2FormalModelLoadPermittedCandidateV1/u);
  assert.match(source, /productionApprovalUsesSharedLedgerIndex: true/u);
  assert.match(source, /modelApprovalRequiresExternalTextureDependencyClosure: true/u);
  assert.match(source, /productionResolutionApproved: resolution\.approved/u);
  assert.doesNotMatch(source, /intakeResolutionApproved:/u);
  assert.doesNotMatch(source, /productionApproved: attachment\.productionApproved/u);
  assert.doesNotMatch(source, /productionApproved: asset\.productionApproved/u);
});

test('P4.4ci preserves grouped multi-target feedback causality through Replay Learning', () => {
  const directionOwner = readFileSync(
    'packages/arena-match/src/match-core-weapon-feedback-direction-owner-v2.ts',
    'utf8',
  );
  assert.match(directionOwner, /openHitSourceEventIdsByTargetAndAttacker/u);
  assert.match(directionOwner, /groupedHitEventsCanPrecedeKnockbacks: true/u);
  assert.match(directionOwner, /sameTargetRepeatedHitsUseDeterministicFifo: true/u);
  assert.doesNotMatch(directionOwner, /let openHitSourceEventId: string \| null/u);

  for (const file of [
    'packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts',
    'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /pendingFeedbackHitsByTarget/u, file);
    assert.match(source, /multiTargetFeedbackUsesPerTargetFifo: true/u, file);
    assert.doesNotMatch(source, /let openFeedbackHit:/u, file);
  }

  const replayLearning = readFileSync(
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
    'utf8',
  );
  assert.match(replayLearning, /createParticipantEquipmentUsageV3FromEvents/u);
  assert.match(replayLearning, /const usedWeapons = new Set/u);
  assert.match(replayLearning, /effectiveWeapons\.add\(binding\.weaponDefinitionId\)/u);
  assert.match(replayLearning, /WeaponFeedback缺少同动作同tick的权威起手/u);
});

test('P4.4cj consumes stable feedback visuals once without tick-level deduplication', () => {
  const source = readFileSync(
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
    'utf8',
  );
  assert.match(source, /#consumedVisualIdentities/u);
  assert.match(source, /visualItemsToPresent/u);
  assert.match(source, /sourceEventId,[\s\S]*tick,[\s\S]*sequence,[\s\S]*actionDefinitionId,[\s\S]*visualCue/u);
  assert.match(source, /sameTickDistinctFeedbackIdsPreserved: true/u);
  assert.match(source, /laterRevisionDoesNotReplayConsumedVisualIdentity: true/u);
  assert.match(source, /seenIdentityCount/u);
  assert.doesNotMatch(source, /consumedVisualTick/u);
});

test('P4.4ck rejects movement-fall attack context before weapon learning', () => {
  const semantic = readFileSync(
    'packages/arena-contracts/src/weapon-feedback-semantic-v1.ts',
    'utf8',
  );
  const movementBranch = semantic.indexOf(
    'targetId === null\n      || targetFallTick === null',
  );
  assert.ok(movementBranch > 0);
  const movementGuard = semantic.slice(Math.max(0, movementBranch - 220), movementBranch);
  assert.match(movementGuard, /attackerId !== null/u);
  assert.match(movementGuard, /actionDefinitionId !== null/u);
  assert.match(movementGuard, /actionStartedTick !== null/u);

  const replayLearning = readFileSync(
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
    'utf8',
  );
  const replayGuard = replayLearning.indexOf(
    'Replay Learning movement-fall不能携带攻击上下文。',
  );
  const effectiveLearningCommit = replayLearning.indexOf(
    'effectiveWeapons.add(binding.weaponDefinitionId)',
  );
  assert.ok(replayGuard > 0);
  assert.ok(effectiveLearningCommit > replayGuard);
  assert.match(replayLearning.slice(replayGuard - 260, replayGuard), /event\.attackerId !== null/u);
  assert.match(replayLearning.slice(replayGuard - 260, replayGuard), /event\.actionDefinitionId !== null/u);
  assert.match(replayLearning.slice(replayGuard - 260, replayGuard), /event\.actionStartedTick !== null/u);
});

test('P4.4cl rejects Survival actions outside the active player life or enemy generation', () => {
  const eligibility = readFileSync(
    'packages/arena-contracts/src/survival-equipment-action-eligibility-v1.ts',
    'utf8',
  );
  for (const marker of [
    'Survival equipment ActionStarted不能来自非active参与者。',
    'Survival enemy slot change与当前generation不闭合。',
    'does not judge delayed feedback',
  ]) assert.match(eligibility, new RegExp(marker, 'u'));

  const replay = readFileSync('packages/arena-match/src/replay-v6.ts', 'utf8');
  const replayGuard = replay.indexOf('assertArenaV6SurvivalEquipmentActionEligibilityV1({');
  const replayReturn = replay.indexOf('return Object.freeze({', replayGuard);
  assert.ok(replayGuard > 0 && replayReturn > replayGuard);

  const productResult = readFileSync(
    'packages/arena-product-match/src/mode-product-result-assembler-v3.ts',
    'utf8',
  );
  const productGuard = productResult.indexOf('assertArenaV6SurvivalEquipmentActionEligibilityV1({');
  const usage = productResult.indexOf('createParticipantEquipmentUsageV3FromEvents({');
  assert.ok(productGuard > 0 && usage > productGuard);
});

test('P4.4cm rejects Duel/Race equipment starts outside active competitive life', () => {
  const eligibility = readFileSync(
    'packages/arena-contracts/src/competitive-equipment-action-eligibility-v1.ts',
    'utf8',
  );
  for (const marker of [
    'Competitive equipment ActionStarted不能来自非active参与者。',
    'Race respawn schedule必须闭合当前掉落与固定延迟。',
    'does not re-evaluate hit outcomes',
  ]) assert.match(eligibility, new RegExp(marker, 'u'));

  for (const file of [
    'packages/arena-match/src/replay-v6.ts',
    'packages/arena-product-match/src/mode-product-result-assembler-v3.ts',
    'packages/arena-product-match/src/product-result-replay-settlement-evidence-v1.ts',
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /assertArenaV6CompetitiveEquipmentActionEligibilityV1/u);
  }
});

test('P4.4cn binds feedback outcomes to one preceding action outcome family', () => {
  const consistency = readFileSync(
    'packages/arena-contracts/src/action-feedback-outcome-consistency-v1.ts',
    'utf8',
  );
  assert.match(consistency, /缺少同攻击者、动作与起手tick的先行权威起手/u);
  assert.match(consistency, /attack-evaded不能重复或与命中结果共存/u);
  assert.match(consistency, /delayed hit outcomes stay legal/u);

  for (const file of [
    'packages/arena-match/src/replay-v6.ts',
    'packages/arena-product-match/src/mode-product-result-assembler-v3.ts',
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /assertArenaV6ActionFeedbackOutcomeConsistencyV1/u);
  }
});

test('P4.4co binds Survival equipment actions to the complete supply ownership prefix', () => {
  const ownership = readFileSync(
    'packages/arena-contracts/src/survival-equipment-ownership-consistency-v1.ts',
    'utf8',
  );
  for (const marker of [
    '完整供给事实必须从sequence 0开始',
    '替换事实未闭合当前持有实例',
    'ActionStarted缺少当前参与者的供给持有事实',
    'same-tick actions',
  ]) assert.match(ownership, new RegExp(marker, 'u'));

  const runtime = readFileSync('packages/arena-match/src/mode-match-runtime-v6.ts', 'utf8');
  assert.match(runtime, /#supplyFactsComplete = true/u);
  assert.match(runtime, /exportRuntimeCheckpointV4/u);
  assert.match(runtime, /exportTerminalEvidenceV2/u);
  assert.match(runtime, /旧版Survival恢复缺少完整供给事实前缀/u);

  const settlement = readFileSync(
    'packages/arena-product-match/src/product-result-runtime-settlement-evidence-v3.ts',
    'utf8',
  );
  assert.match(settlement, /validateModeMatchRuntimeTerminalEvidenceV2/u);
  assert.match(settlement, /supplyFactsHash/u);
});

test('P4.4cp flags only same-semantics numeric dominance without a power score', () => {
  const source = readFileSync(
    'packages/arena-product-content/src/arena-v2-weapon-numeric-dominance-audit-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    'sameCoreVerbAndSemanticShapeOnly: true',
    'groundAndAerialMustBothBeNoWorse: true',
    'atLeastOneStrictNumericAdvantageRequired: true',
    'compositePowerScoreForbidden: true',
    'automaticTuningMutationForbidden: true',
    'numericFindingRequiresThreeModeMapReview: true',
    'provesOverallWeaponDominance: false',
    "validationStatus: 'not-run'",
  ]) assert.ok(source.includes(marker));
});

test('P4 registry promotion owners retain failed cleanup ownership', () => {
  const coordinator = readFileSync(
    'packages/arena-product-composition/src/arena-v2-single-weapon-registry-promotion-coordinator-candidate-v1.ts',
    'utf8',
  );
  assert.match(coordinator, /destroyRejectsUnsealedPersistentPublicationBeforeAnyCleanup: true/u);
  assert.match(coordinator, /destroyAttemptsIndependentOwnedChildren: true/u);
  assert.match(
    coordinator,
    /reference\.destroy\(\);[\s\S]*this\.#registryReference === reference[\s\S]*host\.destroy\(\);[\s\S]*this\.#registrationHost === host/u,
  );
  assert.match(coordinator, /Arena V2 Registry promotion coordinator清理不完整/u);

  const host = readFileSync(
    'packages/arena-product-composition/src/arena-v2-single-weapon-persistent-registration-host-candidate-v1.ts',
    'utf8',
  );
  assert.match(host, /destroyDependencyOrderPreserved: true/u);
  assert.match(host, /failedChildCleanupRemainsRetryable: true/u);
  assert.match(
    host,
    /owner\.destroy\(\);[\s\S]*this\.#owner === owner[\s\S]*if \(this\.#owner === null && this\.#port !== null\)[\s\S]*port\.destroy\(\)/u,
  );
  assert.match(host, /Arena V2 persistent registration host清理不完整/u);
});

test('P4 registry-backed local owner closes dependents before shared bootstrap', () => {
  const source = readFileSync(
    'packages/arena-regression/src/arena-v2-registry-backed-local-playable-owner-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /activePromotionMustResolveBeforeAnyOuterCleanup: true/u);
  assert.match(
    source,
    /promotionState === 'published'[\s\S]*promotionState === 'activated-reference-stale'[\s\S]*promotionState === 'reference-promoted-unsealed'[\s\S]*必须先收口活动武器晋级/u,
  );
  assert.match(source, /destroyAttemptsIndependentDependents: true/u);
  assert.match(source, /registryBootstrapReleasesAfterDependents: true/u);
  assert.match(source, /constructionCleanupRetainsNestedLocalPlayableDebt: true/u);
  assert.match(
    source,
    /constructionCleanupWaitsForLocalPlayableBeforeRegistryBootstrap: true/u,
  );
  assert.match(source, /constructionCleanupRetriesOnlyIncompleteOwners: true/u);
  assert.match(
    source,
    /firstProvisioningFactoryDoesNotDoubleDestroyRetainedBootstrap: true/u,
  );
  assert.match(
    source,
    /coordinator\.destroy\(\);[\s\S]*this\.#promotionCoordinator === coordinator[\s\S]*localPlayable\.destroy\(\);[\s\S]*this\.#localPlayable === localPlayable/u,
  );
  assert.match(
    source,
    /this\.#promotionCoordinator === null[\s\S]*&& this\.#localPlayable === null[\s\S]*&& this\.#registryBootstrap !== null[\s\S]*registryBootstrap\.destroy\(\)/u,
  );
  assert.match(source, /Arena V2 Registry-backed local owner清理不完整/u);
});

test('P4 adaptive counterplay owner retains failed child cleanup ownership', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-information-host-adaptive-counterplay-bot-owner-candidate-v1.ts',
    'utf8',
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  assert.notEqual(destroyStart, -1);
  const destroy = source.slice(destroyStart);
  assert.match(destroy, /if \(this\.#destroying\)/u);
  assert.match(source, /#releasePort\(\): void \{[\s\S]*port\.destroy\(\);[\s\S]*if \(this\.#port === port\) this\.#port = null/u);
  assert.equal(
    destroy.indexOf('this.#destroyed = true') > destroy.indexOf('this.#releasePort()'),
    true,
  );
  assert.match(source, /宿主step结果身份漂移/u);
  assert.match(source, /originalAndCleanupFailuresAreAggregated: true/u);
});

test('P4 counterplay port commits destroyed only after controller cleanup succeeds', () => {
  const source = readFileSync(
    'packages/arena-product-composition/src/arena-v2-information-host-counterplay-bot-port-candidate-v1.ts',
    'utf8',
  );
  const destroyStart = source.indexOf('  destroy(): void {');
  assert.notEqual(destroyStart, -1);
  const destroy = source.slice(destroyStart);
  assert.equal(
    destroy.indexOf('this.#controller.destroy()')
      < destroy.indexOf('this.#destroyed = true'),
    true,
  );
  assert.match(source, /#fail\(error: unknown\): never/u);
  assert.match(source, /input = this\.#controller\.createInput\([\s\S]*?return this\.#fail\(error\)/u);
  assert.match(source, /projectArenaV2LocalCounterplayBotCurrentFactsCandidateV1\([\s\S]*?return this\.#fail\(error\)/u);
  assert.match(source, /failedControllerCleanupRemainsRetryable: true/u);
  assert.match(source, /宿主step结果身份漂移/u);
});

test('P4 Registry failure summaries never stringify arbitrary thrown values', () => {
  for (const file of [
    'packages/arena-product-composition/src/arena-v2-first-weapon-registry-provisioning-owner-candidate-v1.ts',
    'packages/arena-product-composition/src/arena-v2-single-weapon-registry-publication-owner-candidate-v1.ts',
    'packages/arena-product-composition/src/arena-v2-single-weapon-registry-promotion-coordinator-candidate-v1.ts',
    'packages/arena-product-composition/src/arena-v2-single-weapon-persistent-registration-host-candidate-v1.ts',
  ]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /String\(error\)/u, file);
  }
});

test('P4 candidates are exported only through explicit versioned surfaces', () => {
  const expected = Object.freeze([
    [
      'packages/arena-bot/src/index.ts',
      /\.\/survival-enemy-weapon-affordance-v1\.js/,
    ],
    [
      'packages/arena-contracts/src/index.ts',
      /\.\/weapon-feedback-semantic-v1\.js/,
    ],
    [
      'packages/arena-core/src/index.ts',
      /\.\/weapon-feedback-resolver-v1\.js/,
    ],
    [
      'packages/arena-definitions/src/index.ts',
      /\.\/weapon-combat-grammar-definition-v1\.js/,
    ],
    [
      'packages/arena-match/src/index.ts',
      /\.\/survival-match-read-frame-v3-adapter\.js/,
    ],
    [
      'packages/arena-match/src/index.ts',
      /\.\/match-core-weapon-feedback-adapter-v1\.js/,
    ],
    [
      'packages/arena-match/src/index.ts',
      /\.\/survival-pressure-resolver-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-heavy-hammer-weapon-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-gravity-chain-weapon-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-charge-shield-weapon-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-line-suppressor-weapon-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-read-counter-weapon-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-flank-blade-weapon-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-launch-weapon-catalog-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-expanded-weapon-candidates-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-collection-weapon-catalog-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-unarmed-action-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-survival-baseline-weapon-tiers-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-survival-pressure-candidate-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-baseline-weapon-consequence-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-baseline-weapon-matchcore-replay-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-expanded-weapon-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-line-suppressor-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-read-counter-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-flank-blade-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-survival-baseline-weapon-supply-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-survival-weapon-tier-consequence-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-survival-weapon-bot-affordance-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-survival-tiered-supply-matchcore-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-survival-pressure-bot-long-run-verification-v1\.js/,
    ],
  ] as const);
  for (const [file, pattern] of expected) assert.match(readFileSync(file, 'utf8'), pattern);
});
