import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createArenaModeVerificationContinuationPairV1,
} from '../packages/arena-regression/src/arena-mode-verification-runtime-factory-v1.js';
import {
  ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS,
} from '../packages/arena-regression/src/arena-mode-verification-plan-v1.js';

test('P2 long-run continuation parity executes outside the Vitest worker', () => {
  const pair = createArenaModeVerificationContinuationPairV1({
    caseId: 'arena.p2.correctness.race.long-run.external',
    profile: 'long-run',
    modeKind: 'race',
    modeDefinitionId: 'arena.mode.race.v6',
    fixtureDefinitionId: 'arena.mode.race.test.fixture.v1',
    participantCount: 4,
    enemySlotCount: 0,
    matchSeed: 29,
    runnerTickBudget: ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS,
    rematchCount: 1,
  });
  assert.equal(
    pair.restored.restoreFrameTick,
    Math.floor(ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS / 2),
  );
  assert.equal(pair.continuous.executedTicks, ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS);
  assert.equal(pair.restored.executedTicks, ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS);
  assert.equal(pair.continuous.finalHash, pair.restored.finalHash);
  assert.equal(pair.continuous.retainedResourceCountAfterDestroy, 0);
  assert.equal(pair.restored.retainedResourceCountAfterDestroy, 0);
});
