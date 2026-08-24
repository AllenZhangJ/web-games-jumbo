import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1,
  ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION,
  runArenaSurvivalSharedWorldAuthorityVerificationCandidateV1,
} from '../../packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.js';
import {
  ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_ENEMY_COUNTS_V1,
  createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1,
  runArenaSurvivalModeVerticalIntegrationCandidateV1,
} from '../../packages/arena-regression/src/arena-survival-mode-vertical-integration-candidate-v1.js';

const OPTIONS = Object.freeze({
  schemaVersion: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION,
  matchSeed: 0x5033_0001,
  enemyCounts: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1,
});

function expectedPressureStage(enemyCount: number): number {
  const stage = ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1.stages.find(
    ({ desiredActiveEnemySlots }) => desiredActiveEnemySlots === enemyCount,
  );
  if (stage === undefined) throw new Error(`缺少${enemyCount}敌人的Pressure stage。`);
  return stage.stage;
}

test('P3 Survival shared-world five-matrix keeps pressure, two-fall, checkpoint, Replay and cleanup deterministic', () => {
  const first = runArenaSurvivalSharedWorldAuthorityVerificationCandidateV1(OPTIONS);
  const second = runArenaSurvivalSharedWorldAuthorityVerificationCandidateV1(OPTIONS);

  assert.deepEqual(second, first);
  assert.deepEqual(
    first.scenarios.map(({ enemyCount }) => enemyCount),
    [1, 4, 8, 12, 16],
  );
  for (const scenario of first.scenarios) {
    assert.equal(scenario.participantCount, scenario.enemyCount + 1);
    assert.equal(scenario.pressureTargetReached, true);
    assert.equal(scenario.modeResult.pressureStage, expectedPressureStage(scenario.enemyCount));
    assert.deepEqual(scenario.playerFallTicks.length, 2);
    assert.equal(scenario.modeResult.reason, 'terminal-player-fall');
    assert.equal(scenario.modeResult.fallCount, 2);
    assert.equal(scenario.terminalPostFrameTick, scenario.modeResult.endedAtTick + 1);
    assert.equal(scenario.fullWorldCheckpointRestoreCount, 1);
    assert.match(scenario.runtimeCheckpointV3RestoreIdentityHash, /^[0-9a-f]{8}$/u);
    assert.match(scenario.feedbackCheckpointRestoreIdentityHash, /^[0-9a-f]{8}$/u);
    assert.match(scenario.replayIdentityHash, /^[0-9a-f]{8}$/u);
    assert.match(scenario.finalHash, /^[0-9a-f]{8}$/u);
    assert.equal(scenario.retainedResourceCountAfterDestroy, 0);
  }
  assert.equal(second.resultHash, first.resultHash);
});

test('P3 Survival component matrix retains its exact lifecycle, supply and owner checks on the Node long-run host', () => {
  const options = Object.freeze({
    schemaVersion: 1 as const,
    matchSeed: 0x5030_0001,
    enemyCounts: ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_ENEMY_COUNTS_V1,
  });
  const first = runArenaSurvivalModeVerticalIntegrationCandidateV1(options);
  const second = runArenaSurvivalModeVerticalIntegrationCandidateV1(options);

  assert.deepEqual(second, first);
  assert.deepEqual(first.enemyCounts, [1, 4, 8, 12, 16]);
  assert.deepEqual(first.lifecycleScenarios.map(({ enemyCount }) => enemyCount), [1, 4, 8, 12, 16]);
  for (const scenario of first.lifecycleScenarios) {
    assert.deepEqual(scenario.playerFallCounts, [1, 2]);
    assert.equal(scenario.respawnScheduledCount, 1);
    assert.equal(scenario.respawnedCount, 1);
    assert.equal(scenario.matchEndedCount, 1);
    assert.equal(scenario.resultReason, 'terminal-player-fall');
    assert.equal(scenario.continuousFinalHash, scenario.restoredFinalHash);
  }
  assert.equal(first.supplyFacts.replacementKind, 'replaced');
  assert.equal(first.supplyFacts.allSeedsReachedLevelTen, true);
  assert.ok(first.weaponUsageFacts.actionStartedEventCount > 0);
  assert.ok(first.weaponUsageFacts.hitResolvedEventCount > 0);
  assert.ok(first.weaponUsageFacts.knockbackAppliedEventCount > 0);

  const runtime = createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1(options);
  const report = runtime.run({ authorityStartTick: 0 });
  assert.match(report.resultHash, /^[0-9a-f]{8}$/u);
  assert.throws(() => runtime.run({ authorityStartTick: 0 }), /不可重入/u);
  runtime.destroy();
  assert.deepEqual(runtime.getSnapshot(), {
    state: 'destroyed',
    retainedResourceCount: 0,
    hasReport: false,
  });
});
