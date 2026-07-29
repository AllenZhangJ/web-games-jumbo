import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS,
  ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_REQUIRED_EVENT_TYPES,
  classifyFormalSurvivalBotPressureStatus,
  createFormalSurvivalBotPressureManifest,
  createFormalSurvivalBotPressureManifestHash,
  inspectFormalSurvivalBotPressureManifest,
  isFormalSurvivalBotPressureRequest,
  normalizeFormalSurvivalBotPressureRequest,
  runFormalSurvivalBotPressure,
} from '../../scripts/arena-formal-survival-bot-pressure.js';

test('formal Bot manifest has 300 unique case identities and rotated repeated-seed dimensions', () => {
  const manifest = createFormalSurvivalBotPressureManifest();
  const inspection = inspectFormalSurvivalBotPressureManifest(
    manifest.cases,
    manifest.caseCount,
    manifest.uniqueSeedCount,
  );
  assert.equal(manifest.cases.length, 300);
  assert.equal(inspection.actualUniqueSeedCount, 120);
  assert.equal(inspection.uniqueCaseIdentityCount, 300);
  assert.deepEqual(inspection.duplicateCaseIdentities, []);

  const bySeed = new Map<number, Array<(typeof manifest.cases)[number]>>();
  for (const item of manifest.cases) {
    const group = bySeed.get(item.seed) ?? [];
    group.push(item);
    bySeed.set(item.seed, group);
  }
  assert.equal(bySeed.size, 120);
  for (const pauseAtTick of manifest.pauseBoundaryTicks) {
    assert.ok(manifest.cases.some((item) => item.pauseAtTick === pauseAtTick));
  }
  for (const group of bySeed.values()) {
    assert.ok(group.length === 2 || group.length === 3);
    assert.equal(
      new Set(group.map(({ difficultyId, inputPlanId, playerParticipantId, pauseAtTick }) => (
        JSON.stringify({ difficultyId, inputPlanId, playerParticipantId, pauseAtTick })
      ))).size,
      group.length,
    );
  }
});

test('formal Bot manifest identity is stable and includes full definition/config/profile/plan/pause inputs', () => {
  const first = createFormalSurvivalBotPressureManifest();
  const second = createFormalSurvivalBotPressureManifest();
  assert.deepEqual(first, second);
  assert.equal(
    createFormalSurvivalBotPressureManifestHash(first),
    createFormalSurvivalBotPressureManifestHash(second),
  );
  assert.equal(first.definition.id, 'arena-v2.survival-supply.v1');
  assert.equal(first.profiles.length, 3);
  assert.equal(first.inputPlans.length, 6);
  assert.deepEqual(first.pauseBoundaryTicks, [
    null, 1_199, 1_200, 1_201, 1_799, 1_800, 1_801, 2_399, 2_400, 2_401,
  ]);
  assert.equal(first.configTemplate.hardLimitTicks, 2_500);
});

test('smoke execution is explicitly never formal-pass and stable across two full dual-runs', () => {
  const first = runFormalSurvivalBotPressure({
    caseCount: 1,
    uniqueSeedCount: 1,
    hardLimitTicks: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks,
  });
  const second = runFormalSurvivalBotPressure({
    caseCount: 1,
    uniqueSeedCount: 1,
    hardLimitTicks: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks,
  });
  assert.equal(first.status, 'smoke-passed');
  assert.equal(first.executionPassed, true);
  assert.equal(first.formalRequest, false);
  assert.equal(first.formalGateEligible, false);
  assert.equal(first.formalGatePassed, false);
  assert.equal(first.requestedCaseCount, 1);
  assert.equal(first.actualCaseCount, 1);
  assert.equal(first.requestedUniqueSeedCount, 1);
  assert.equal(first.actualUniqueSeedCount, 1);
  assert.equal(first.uniqueCaseIdentityCount, 1);
  assert.equal(first.uniqueTraceHashes, 1);
  assert.equal(first.canonicalTotalTicks, 2_500);
  assert.equal(first.executedTotalTicks, 5_000);
  const canonicalEventCount = Object.values(first.eventTypeCounts)
    .reduce((sum, count) => sum + count, 0);
  assert.equal(first.canonicalTotalEvents, canonicalEventCount);
  assert.equal(first.executedTotalEvents, canonicalEventCount * 2);
  assert.equal(first.terminalCoverage.allCasesEnded, true);
  assert.equal(first.terminalCoverage.spawnAt1200, true);
  assert.equal(first.terminalCoverage.spawnAt2400, true);
  assert.equal(first.terminalCoverage.activeSupplyReached3, true);
  for (const eventType of ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_REQUIRED_EVENT_TYPES) {
    assert.equal(first.eventCoverage[eventType], true, eventType);
  }
  assert.deepEqual(first.terminalProjectionCoverage, {
    firstWaveRemaining599: true,
    firstWaveRemaining1: true,
    expiryPendingAt1800: true,
    postExpiryReadyAt1801: true,
    secondWaveRemaining599: true,
  });
  assert.equal(first.manifestHash, second.manifestHash);
  assert.equal(first.definitionHash, second.definitionHash);
  assert.equal(first.configHash, second.configHash);
  assert.equal(first.evidenceHash, second.evidenceHash);
  assert.equal(first.resultManifestHash, second.resultManifestHash);
  assert.notEqual(first.evidenceHash, first.resultManifestHash);
});

test('formal Bot status classifier separates formal failure from smoke failure', () => {
  assert.equal(
    classifyFormalSurvivalBotPressureStatus({
      formalRequest: true,
      executionPassed: true,
      formalGatePassed: true,
    }),
    'formal-passed',
  );
  assert.equal(
    classifyFormalSurvivalBotPressureStatus({
      formalRequest: true,
      executionPassed: true,
      formalGatePassed: false,
    }),
    'formal-failed',
  );
  assert.equal(
    classifyFormalSurvivalBotPressureStatus({
      formalRequest: false,
      executionPassed: true,
      formalGatePassed: false,
    }),
    'smoke-passed',
  );
  assert.equal(
    classifyFormalSurvivalBotPressureStatus({
      formalRequest: false,
      executionPassed: false,
      formalGatePassed: false,
    }),
    'smoke-failed',
  );
});

test('formal Bot request normalization rejects invalid cardinality and never treats reduced requests as formal', () => {
  assert.throws(
    () => normalizeFormalSurvivalBotPressureRequest({ caseCount: 0 }),
    /正安全整数/,
  );
  assert.throws(
    () => normalizeFormalSurvivalBotPressureRequest({ caseCount: 1, uniqueSeedCount: 2 }),
    /不能超过 caseCount/,
  );
  assert.throws(
    () => normalizeFormalSurvivalBotPressureRequest({
      caseCount: 1,
      uniqueSeedCount: 1,
      hardLimitTicks: 2_400,
    }),
    /必须覆盖 2400 tick/,
  );
  assert.equal(
    isFormalSurvivalBotPressureRequest({ caseCount: 301, uniqueSeedCount: 1, hardLimitTicks: 2_500 }),
    false,
  );
  assert.equal(
    isFormalSurvivalBotPressureRequest({ caseCount: 300, uniqueSeedCount: 120, hardLimitTicks: 2_401 }),
    false,
  );
  assert.equal(
    isFormalSurvivalBotPressureRequest({ caseCount: 300, uniqueSeedCount: 120, hardLimitTicks: 2_500 }),
    true,
  );
});
