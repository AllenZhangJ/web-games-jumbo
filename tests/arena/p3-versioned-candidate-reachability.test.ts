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

const P3_VERSIONED_SURFACE = new RegExp([
  '\\b(?:KzRouteRegistryV2|createKzRouteDefinitionV2|validateKzRouteMapCandidateV1',
  '|ARENA_V2_KZ_(?:BASE|SWITCHBACK)_MAP_CANDIDATE_V1|SurvivalEnemyControllerV[12]',
  '|createSurvivalEnemyObservationV[12]|KzRaceModeMapAdapterV1',
  '|createModeMatchRuntimeCheckpointV3|validateModeMatchRuntimeCheckpointV3',
  '|createKzSurvivalRouteTargetProjectionV1',
  '|ARENA_V2_KZ_VERIFICATION_CHARACTER_CANDIDATE_V1',
  '|ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1',
  '|ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1',
  '|resolveArenaV2RaceRespawnFallbackAnchorCandidateV1',
  '|ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1',
  '|ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1',
  '|resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1',
  '|ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1',
  '|ARENA_V2_MAP_ROUTE_VARIETY_AUDIT_CANDIDATE_V1',
  '|runArenaKzRoutePhysicsVerificationCandidateV1',
  '|runArenaSurvivalEnemyPhysicsVerificationCandidateV1',
  '|runArenaRaceCrowdingPhysicsVerificationCandidateV1',
  '|runArenaRaceVerticalIntegrationVerificationCandidateV1',
  '|runArenaSurvivalModeVerticalIntegrationCandidateV1',
  '|runArenaSurvivalSharedWorldAuthorityVerificationCandidateV1',
  '|runArenaSurvivalSupplyActionReplayVerificationCandidateV1)\\b',
  '|/(?:kz-route-definition-v2|kz-route-registry-v2|kz-route-map-validator-v1',
  '|arena-v2-kz-(?:base|switchback)-map-candidate-v1',
  '|arena-v2-race-respawn-capability-id-v1',
  '|arena-v2-race-respawn-tuning-candidate-v1',
  '|arena-v2-survival-respawn-capability-id-v1',
  '|arena-v2-survival-first-respawn-tuning-candidate-v1|survival-enemy-observation-v1',
  '|arena-v2-three-mode-timeline-product-proposal-candidate-v1',
  '|arena-v2-map-route-variety-audit-candidate-v1',
  '|survival-enemy-observation-v2',
  '|arena-v2-kz-verification-character-candidate-v1',
  '|survival-enemy-controller-v1|survival-enemy-controller-v2|kz-mode-map-adapter-v1',
  '|mode-match-runtime-checkpoint-v3',
  '|arena-kz-route-physics-verification-v1',
  '|arena-survival-enemy-physics-verification-v1',
  '|arena-race-crowding-physics-verification-v1',
  '|arena-race-vertical-integration-verification-v1',
  '|arena-survival-mode-vertical-integration-candidate-v1',
  '|arena-survival-shared-world-authority-verification-v1)\\.js',
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

test('P3 KZ candidates remain unreachable until the P3 gate approves production wiring', () => {
  for (const root of PRODUCTION_ROOTS) {
    for (const file of typescriptFiles(root)) {
      if (CANDIDATE_COMPOSITION_ALLOWLIST.has(file)) continue;
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        P3_VERSIONED_SURFACE,
        `${file} 不得在P3门批准前接入KZ候选。`,
      );
    }
  }
});

test('P3 KZ candidate is exported only through explicit versioned surfaces', () => {
  const expected = Object.freeze([
    ['packages/arena-definitions/src/index.ts', /\.\/kz-route-definition-v2\.js/],
    ['packages/arena-definitions/src/index.ts', /\.\/kz-route-registry-v2\.js/],
    ['packages/arena-map/src/index.ts', /\.\/kz-route-map-validator-v1\.js/],
    ['packages/arena-bot/src/index.ts', /\.\/survival-enemy-observation-v1\.js/],
    ['packages/arena-bot/src/index.ts', /\.\/survival-enemy-controller-v1\.js/],
    ['packages/arena-bot/src/index.ts', /\.\/survival-enemy-observation-v2\.js/],
    ['packages/arena-bot/src/index.ts', /\.\/survival-enemy-controller-v2\.js/],
    ['packages/arena-match/src/index.ts', /\.\/kz-mode-map-adapter-v1\.js/],
    ['packages/arena-match/src/index.ts', /\.\/mode-match-runtime-checkpoint-v3\.js/],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-kz-base-map-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-kz-switchback-map-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-race-respawn-capability-id-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-race-respawn-tuning-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-survival-respawn-capability-id-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-survival-first-respawn-tuning-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-three-mode-timeline-product-proposal-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-kz-verification-character-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-map-route-variety-audit-candidate-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-kz-route-physics-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-survival-enemy-physics-verification-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-race-crowding-physics-verification-v1\.js/,
    ],
  ] as const);
  for (const [file, pattern] of expected) assert.match(readFileSync(file, 'utf8'), pattern);
});

test('P3 three-mode authorities retain only failed cleanup ownership for retry', () => {
  const duel = readFileSync(
    'packages/arena-regression/src/arena-duel-authoritative-runtime-candidate-v1.ts',
    'utf8',
  );
  assert.match(duel, /if \(this\.#feedback === feedback\) this\.#feedback = null/u);
  assert.match(duel, /if \(this\.#core === core\) this\.#core = null/u);
  assert.match(duel, /this\.#failed = true;[\s\S]*Arena Duel authority destroy清理不完整/u);

  const race = readFileSync(
    'packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts',
    'utf8',
  );
  assert.match(race, /this\.#failed = true;[\s\S]*P3 Race authority清理不完整/u);

  const survival = readFileSync(
    'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
    'utf8',
  );
  assert.match(survival, /this\.#controllers\.delete\(participantId\)/u);
  assert.match(survival, /const owned = get\(\);[\s\S]*owned\.destroy\(\);[\s\S]*clear\(\)/u);
  assert.match(survival, /this\.#failed = true;[\s\S]*P3 Survival authority清理不完整/u);
});

test('P3.4g separates Survival verification timing from interactive authority identity', () => {
  const source = readFileSync(
    'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
    'utf8',
  );
  for (const marker of [
    "INTERACTIVE_PRODUCT_CANDIDATE: 'interactive-product-candidate'",
    "VERIFICATION_SCENARIO: 'verification-scenario'",
    'initialPlayerProtectionTicks: 0',
    'verificationScenarioMaximumTick',
    'executionTimingContentHash: executionTiming.contentHash',
    'executionTiming: this.#executionTiming',
    'P3 Survival authority checkpoint executionTiming漂移',
    'interactiveLocalHardLimitSource:',
    'preserved-unapproved-local-runtime-candidate-not-verification-budget',
    'verificationExecutionTimingSeparatedFromInteractiveRuntime: true',
    'explicitTimelinePolicyRuntimeMirrorWired: false',
  ]) assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));

  const verificationCreation = source.indexOf(
    'createArenaSurvivalVerificationExecutionTimingCandidateV1(',
    source.indexOf('runArenaSurvivalSharedWorldAuthorityScenarioCandidateV1'),
  );
  const interactiveCreation = source.indexOf(
    'createArenaSurvivalInteractiveExecutionTimingCandidateV1(',
    source.indexOf('class ArenaSurvivalAuthoritativeRuntimeCandidateV1'),
  );
  assert.ok(verificationCreation >= 0);
  assert.ok(interactiveCreation >= 0);
  assert.doesNotMatch(
    source.slice(interactiveCreation, source.indexOf('const expected = createConfig', interactiveCreation)),
    /verificationScenarioFallDriveStartTick|verificationScenarioMaximumTick/u,
  );
});

test('P3.4b-S uses the existing interactive time-cap identity for neutral supply-action Replay verification', () => {
  const source = readFileSync(
    'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
    'utf8',
  );
  const sectionStart = source.indexOf(
    'export function runArenaSurvivalSupplyActionReplayVerificationCandidateV1(',
  );
  const sectionEnd = source.indexOf('\nfunction deferredGap()', sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart);
  const section = source.slice(sectionStart, sectionEnd);
  assert.match(section, /createArenaSurvivalInteractiveExecutionTimingCandidateV1\(enemyCount\)/u);
  assert.match(section, /prepareNeutralVerificationInputFrames\(\{ playerInputFrame: input \}\)/u);
  assert.match(section, /pickedSupplyIdByEquipmentInstanceId/u);
  assert.match(section, /P3 Survival supply action起手缺少已确认的真实拾取供给身份/u);
  assert.doesNotMatch(section, /createArenaSurvivalVerificationExecutionTimingCandidateV1/u);
});

test('P3.4b keeps the full Survival matrix on the Node long-run host while Vitest retains only quick contracts', () => {
  const runner = readFileSync('scripts/run-arena-p3-candidate-tests.ts', 'utf8');
  const vitest = readFileSync(
    'packages/arena-regression/test/arena-survival-shared-world-authority-verification-v1.test.ts',
    'utf8',
  );
  const authority = readFileSync(
    'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
    'utf8',
  );
  assert.match(runner, /p3-survival-shared-world-authority-matrix\.test\.ts/u);
  assert.match(runner, /ARENA_P3_SURVIVAL_MATRIX_EXTERNAL: '1'/u);
  assert.match(vitest, /const MATRIX_EXTERNAL = process\.env\.ARENA_P3_SURVIVAL_MATRIX_EXTERNAL === '1'/u);
  assert.match(vitest, /const matrixIt = MATRIX_EXTERNAL \? it\.skip : it/u);
  assert.match(authority, /prepareVerificationScenarioInputFrames/u);
  assert.match(authority, /pressureTargetObserved \|\|=/u);
  assert.match(authority, /pressureTargetReached: pressureTargetObserved/u);
});

test('P3.4h separates Race product timing from the verification scenario watchdog', () => {
  const source = readFileSync(
    'packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts',
    'utf8',
  );
  for (const marker of [
    "INTERACTIVE_PRODUCT_CANDIDATE: 'interactive-product-candidate'",
    "VERIFICATION_SCENARIO: 'verification-scenario'",
    'ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT_ACTIVE_TICKS_CANDIDATE_V1',
    'executionTimingContentHash: executionTiming.contentHash',
    'this.#executionTiming.preparingTicks',
    'preserved-unapproved-local-runtime-candidate-not-verification-budget',
    'executionTimingIdentityBoundToConfigAndModeFixture: true',
    'verificationScenarioWatchdogControlsInteractiveFixture: false',
    'explicitTimelinePolicyRuntimeMirrorWired: false',
  ]) assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));

  const mirrorSection = source.slice(
    source.indexOf('export const ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT'),
    source.indexOf('const AIR_JUMP_REPRESS_AFTER_TICKS'),
  );
  assert.match(
    mirrorSection,
    /hardLimitActiveTicks:\s*ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT/u,
  );
  assert.doesNotMatch(
    mirrorSection,
    /VERIFICATION_SCENARIO_MAXIMUM_TICKS\s*-\s*RACE_MODE_PREPARING_TICKS_V1/u,
  );

  const fixtureSection = source.slice(
    source.indexOf('function createFixture('),
    source.indexOf('function actionSnapshot('),
  );
  assert.match(
    source,
    /const FIXTURE_DEFINITION_ID = 'arena-v2\.mode\.race\.vertical-integration\.test\.fixture\.v1'/u,
  );
  assert.match(fixtureSection, /fixtureDefinitionId: runtimePolicyBinding === null/u);
  assert.match(
    fixtureSection,
    /timing-\$\{executionTiming\.contentHash\}[\s\S]*registry-\$\{runtimePolicyBinding\.contentHash\}/u,
  );

  const productSection = source.slice(
    source.indexOf('class ArenaRaceAuthoritativeRuntimeCandidateV1'),
    source.indexOf('const config = createConfig', source.indexOf(
      'class ArenaRaceAuthoritativeRuntimeCandidateV1',
    )),
  );
  assert.match(productSection, /createArenaRaceInteractiveExecutionTimingCandidateV1\(\)/u);
  assert.doesNotMatch(productSection, /createArenaRaceVerificationExecutionTimingCandidateV1/u);

  const scenarioSection = source.slice(
    source.indexOf('runArenaRaceVerticalIntegrationScenarioCandidateV1'),
    source.indexOf('const config = createConfig', source.indexOf(
      'runArenaRaceVerticalIntegrationScenarioCandidateV1',
    )),
  );
  assert.match(scenarioSection, /createArenaRaceVerificationExecutionTimingCandidateV1\(\)/u);
});

test('P2.0w/P3 runtime mirrors read the single Timeline proposal without wiring it', () => {
  const sources = [
    [
      'packages/arena-regression/src/arena-duel-authoritative-runtime-candidate-v1.ts',
      'ARENA_V2_DUEL_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2',
    ],
    [
      'packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts',
      'ARENA_V2_RACE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2',
    ],
    [
      'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
      'ARENA_V2_SURVIVAL_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2',
    ],
  ] as const;
  for (const [file, proposalIdentity] of sources) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, new RegExp(proposalIdentity, 'u'));
    assert.doesNotMatch(source, /timelinePolicyBundle/u);
  }
});

test('P3 three-mode restore switching retains every failed cleanup owner', () => {
  const duel = readFileSync(
    'packages/arena-regression/src/arena-duel-authoritative-runtime-candidate-v1.ts',
    'utf8',
  );
  assert.match(duel, /restoreOldResourcesCommitPerResource: true/u);
  assert.match(duel, /#releaseDetachedResource\('restore MatchCore', nextCore, cleanupErrors\)/u);
  assert.match(duel, /#releasePendingCleanupResources\(cleanupErrors\)/u);
  assert.match(duel, /Arena Duel restore与资源清理失败/u);

  const race = readFileSync(
    'packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts',
    'utf8',
  );
  assert.match(race, /restoreFailureRetainsCleanupOwnership: true/u);
  assert.match(race, /#releaseCurrentResources\(cleanupErrors\)/u);
  assert.match(race, /#releasePendingCleanupResources\(errors\)/u);
  assert.match(race, /P3 Race restore及资源清理失败/u);

  const survival = readFileSync(
    'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
    'utf8',
  );
  assert.match(survival, /restorePostAdoptionFailureFailsClosed: true/u);
  assert.match(survival, /#releaseDetachedControllers\(nextControllers, cleanupErrors\)/u);
  assert.match(survival, /#releasePendingCleanupResources\(errors\)/u);
  assert.match(survival, /P3 Survival restore与新资源清理均失败/u);
});
