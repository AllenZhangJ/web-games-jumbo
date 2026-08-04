import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_DESPAWN_REASON } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS,
  ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_REQUIRED_EVENT_TYPES,
  classifyFormalSurvivalBotPressureStatus,
  createFormalSurvivalBotPressureManifest,
  createFormalSurvivalBotPressureManifestHash,
  hasFormalSurvivalBotCaseSpawnCoverage,
  inspectFormalSurvivalBotPressureManifest,
  isFormalSurvivalBotPressureRequest,
  normalizeFormalSurvivalBotPressureRequest,
  requiredEquipmentDespawnReasonCoverage,
  runFormalSurvivalBotPressure,
} from '../../scripts/arena-formal-survival-bot-pressure.js';
import {
  ARENA_PA6_READ_STEP_CASES_V1,
  ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS,
} from '../../scripts/lib/arena-pa6-read-step-variants-v1.js';

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

test('PA6 cases 000-019 are the exact first-20 formal configuration', () => {
  const manifest = createFormalSurvivalBotPressureManifest(
    20,
    20,
    ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS,
  );
  assert.deepEqual(ARENA_PA6_READ_STEP_CASES_V1, manifest.cases);
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
  assert.deepEqual(first.configTemplate.participantIds, ['player-1', 'player-2']);
});

test('three-case smoke separates world/runtime bounds and proves the held-runtime boundary', () => {
  const first = runFormalSurvivalBotPressure({
    caseCount: 3,
    uniqueSeedCount: 3,
    hardLimitTicks: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks,
  });
  const second = runFormalSurvivalBotPressure({
    caseCount: 3,
    uniqueSeedCount: 3,
    hardLimitTicks: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks,
  });
  assert.equal(first.status, 'smoke-passed');
  assert.equal(first.executionPassed, true);
  assert.equal(first.formalRequest, false);
  assert.equal(first.formalGateEligible, false);
  assert.equal(first.formalGatePassed, false);
  assert.equal(first.requestedCaseCount, 3);
  assert.equal(first.actualCaseCount, 3);
  assert.equal(first.requestedUniqueSeedCount, 3);
  assert.equal(first.actualUniqueSeedCount, 3);
  assert.equal(first.uniqueCaseIdentityCount, 3);
  assert.equal(first.uniqueTraceHashes, 3);
  assert.equal(first.maximumWorldEquipmentLimit, 3);
  assert.equal(first.maximumRuntimeLimit, 5);
  assert.ok(first.maximumWorldEquipmentCount <= 3);
  assert.ok(first.maximumRuntimeCount <= 5);
  assert.ok(first.canonicalTotalTicks >= 2_401);
  assert.equal(first.executedTotalTicks, first.canonicalTotalTicks * 2);
  const canonicalEventCount = Object.values(first.eventTypeCounts)
    .reduce((sum, count) => sum + count, 0);
  assert.equal(first.canonicalTotalEvents, canonicalEventCount);
  assert.equal(first.executedTotalEvents, canonicalEventCount * 2);
  assert.equal(first.terminalCoverage.allCasesEnded, true);
  assert.equal(first.terminalCoverage.spawnAt1200, true);
  assert.equal(first.terminalCoverage.spawnAt2400, true);
  assert.equal(first.terminalCoverage.activeSupplyReached3, true);
  assert.ok(
    (first.equipmentDespawnReasonCounts[EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE] ?? 0) > 0,
  );
  assert.equal(
    first.equipmentDespawnReasonCoverage[EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE],
    true,
  );
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
  const heldRuntimeBoundaryCase = first.caseResults.find(({ seed }) => seed === 1_795_162_114);
  assert.ok(heldRuntimeBoundaryCase);
  const at2401 = heldRuntimeBoundaryCase.boundarySnapshots.find(({ tick }) => tick === 2_401);
  assert.ok(at2401);
  assert.equal(at2401.equipmentTotalCount, 4);
  assert.equal(at2401.equipmentWorldCount, 3);
  assert.equal(at2401.supplyCount, 3);
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

test('formal coverage requires the exact expired-held despawn reason, not only event type counts', () => {
  assert.deepEqual(
    requiredEquipmentDespawnReasonCoverage({ EquipmentDespawned: 1 }),
    { [EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE]: false },
  );
  assert.deepEqual(
    requiredEquipmentDespawnReasonCoverage({
      [EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE]: 1,
    }),
    { [EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE]: true },
  );
  assert.deepEqual(
    requiredEquipmentDespawnReasonCoverage({
      'no-valid-drop-position': 1,
    }),
    { [EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE]: false },
  );
});

test('per-case spawn coverage rejects wrong per-wave counts without requiring active=3', () => {
  assert.equal(
    hasFormalSurvivalBotCaseSpawnCoverage({ '1200': 3, '2400': 3 }),
    true,
  );
  assert.equal(
    hasFormalSurvivalBotCaseSpawnCoverage({ '1200': 4, '2400': 2 }),
    false,
  );
  assert.equal(
    hasFormalSurvivalBotCaseSpawnCoverage({ '1200': 3, '2400': 2 }),
    false,
  );
});

test('first 20 formal cases allow immediate-pickup cases with maximum active supply below 3', () => {
  const report = runFormalSurvivalBotPressure({
    caseCount: 20,
    uniqueSeedCount: 20,
    hardLimitTicks: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks,
  });
  assert.equal(report.executionPassed, true);
  for (const caseId of [
    'formal-survival-bot-006',
    'formal-survival-bot-011',
    'formal-survival-bot-012',
    'formal-survival-bot-016',
    'formal-survival-bot-017',
  ]) {
    const result = report.caseResults.find((item) => item.caseId === caseId);
    assert.ok(result, caseId);
    assert.equal(result.maximumActiveSupplyCount, 2, caseId);
    assert.deepEqual(result.spawnCountsByTick, { '1200': 3, '2400': 3 }, caseId);
  }
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
