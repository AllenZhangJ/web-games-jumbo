import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { createArenaInputPilotV1Definition } from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION,
  createInputPilotAssignment,
} from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION,
  createInputPilotEnrollmentSnapshot,
} from '../../../src/arena/presentation/pilot/input-pilot-enrollment-ledger.js';
import {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_RECORD_SCHEMA_VERSION,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_STATUS,
  createInputPilotRecord,
} from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION,
  InputPilotStorageLease,
} from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
  INPUT_PILOT_TRIAL_PHASE,
  createInputPilotTrialCheckpoint,
} from '../../../src/arena/presentation/pilot/input-pilot-trial-checkpoint.js';
import {
  advanceInputPilotWorkspace,
  createInputPilotWorkspace,
  INPUT_PILOT_WORKSPACE_SCHEMA_VERSION,
} from '../../../src/arena/presentation/pilot/input-pilot-workspace.js';
import {
  INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
  InputPilotWorkspaceRepository,
} from '../../../src/arena/presentation/pilot/input-pilot-workspace-repository.js';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function storageHarness() {
  const values = new Map();
  const readFailures = new Set();
  const writeFailures = new Set();
  const deleteFailures = new Set();
  return {
    values,
    readFailures,
    writeFailures,
    deleteFailures,
    port: {
      storageRead(key) {
        if (readFailures.has(key)) return { ok: false, found: false, value: undefined };
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key, value) {
        if (writeFailures.has(key)) return false;
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key) {
        if (deleteFailures.has(key)) return false;
        values.delete(key);
        return true;
      },
    },
  };
}

function device(definition) {
  return definition.environment;
}

function eligibility() {
  return Object.freeze({
    priorArenaExperience: false,
    priorOtherVariantExposure: false,
  });
}

function automated() {
  return Object.freeze({
    trialDurationMs: 1000,
    firstEffectiveMovementMs: 100,
    firstCorrectContextActionMs: 500,
    groundJump: INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED,
    airJump: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
    downSmash: INPUT_PILOT_ACTION_OUTCOME.FAILED,
  });
}

function observer() {
  return Object.freeze({
    intentMismatchCount: 0,
    accidentalInputCount: 0,
    repeatedInputCount: 0,
    abandonedInputCount: 0,
    correctionCount: 0,
    oneHandCompleted: true,
    objectiveCompleted: true,
  });
}

function selfReport() {
  return Object.freeze({
    groundAction: INPUT_PILOT_COMPREHENSION.CORRECT,
    airAction: INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
    equipmentAction: INPUT_PILOT_COMPREHENSION.PARTIAL,
  });
}

function reviewDraft() {
  return Object.freeze({ observer: observer(), selfReport: selfReport(), invalidate: false });
}

function workspaceSequence(definition, participantId = 'pilot-0001') {
  const suffix = participantId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const initial = createInputPilotWorkspace(definition);
  const assignment = createInputPilotAssignment({
    definition,
    participantId,
    enrollmentIndex: 0,
  });
  const enrollment = createInputPilotEnrollmentSnapshot(definition, {
    schemaVersion: INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    revision: 1,
    assignments: [assignment],
  });
  const enrolled = createInputPilotTrialCheckpoint(definition, {
    schemaVersion: INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
    trialId: `pilot-trial-${suffix}`,
    assignment,
    phase: INPUT_PILOT_TRIAL_PHASE.ENROLLED,
    terminationReason: null,
    device: device(definition),
    eligibility: eligibility(),
    automated: null,
    reviewDraft: null,
  });
  const first = advanceInputPilotWorkspace(definition, initial, {
    enrollment,
    activeTrial: enrolled,
    records: [],
  });
  const reviewing = createInputPilotTrialCheckpoint(definition, {
    ...enrolled,
    phase: INPUT_PILOT_TRIAL_PHASE.REVIEWING,
    terminationReason: INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED,
    automated: automated(),
    reviewDraft: reviewDraft(),
  });
  const second = advanceInputPilotWorkspace(definition, first, {
    activeTrial: reviewing,
  });
  const record = createInputPilotRecord(definition, {
    schemaVersion: INPUT_PILOT_RECORD_SCHEMA_VERSION,
    trialId: reviewing.trialId,
    assignment,
    trialStatus: INPUT_PILOT_TRIAL_STATUS.COMPLETED,
    terminationReason: INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED,
    device: reviewing.device,
    eligibility: reviewing.eligibility,
    automated: reviewing.automated,
    observer: observer(),
    selfReport: selfReport(),
  });
  const third = advanceInputPilotWorkspace(definition, second, {
    activeTrial: null,
    records: [record],
  });
  return { initial, first, second, third, assignment, enrolled, record };
}

function appendCompletedTrial(definition, current, index) {
  const participantId = `pilot-${String(index).padStart(4, '0')}`;
  const assignment = createInputPilotAssignment({
    definition,
    participantId,
    enrollmentIndex: index,
  });
  const enrollment = createInputPilotEnrollmentSnapshot(definition, {
    ...current.enrollment,
    revision: current.enrollment.revision + 1,
    assignments: [...current.enrollment.assignments, assignment],
  });
  const enrolled = createInputPilotTrialCheckpoint(definition, {
    schemaVersion: INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
    trialId: `trial-${participantId}`,
    assignment,
    phase: INPUT_PILOT_TRIAL_PHASE.ENROLLED,
    terminationReason: null,
    device: device(definition),
    eligibility: eligibility(),
    automated: null,
    reviewDraft: null,
  });
  const enrollmentWorkspace = advanceInputPilotWorkspace(definition, current, {
    enrollment,
    activeTrial: enrolled,
  });
  const reviewing = createInputPilotTrialCheckpoint(definition, {
    ...enrolled,
    phase: INPUT_PILOT_TRIAL_PHASE.REVIEWING,
    terminationReason: INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED,
    automated: automated(),
    reviewDraft: reviewDraft(),
  });
  const reviewingWorkspace = advanceInputPilotWorkspace(definition, enrollmentWorkspace, {
    activeTrial: reviewing,
  });
  const record = createInputPilotRecord(definition, {
    schemaVersion: INPUT_PILOT_RECORD_SCHEMA_VERSION,
    trialId: reviewing.trialId,
    assignment,
    trialStatus: INPUT_PILOT_TRIAL_STATUS.COMPLETED,
    terminationReason: INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED,
    device: reviewing.device,
    eligibility: reviewing.eligibility,
    automated: reviewing.automated,
    observer: observer(),
    selfReport: selfReport(),
  });
  const terminalWorkspace = advanceInputPilotWorkspace(definition, reviewingWorkspace, {
    activeTrial: null,
    records: [...current.records, record],
  });
  return { enrollmentWorkspace, reviewingWorkspace, terminalWorkspace };
}

test('pilot workspace requires every enrollment to be active or terminal exactly once', () => {
  const definition = createArenaInputPilotV1Definition();
  const sequence = workspaceSequence(definition);
  assert.equal(sequence.first.revision, 1);
  assert.equal(sequence.second.activeTrial.phase, INPUT_PILOT_TRIAL_PHASE.REVIEWING);
  assert.equal(sequence.third.activeTrial, null);
  assert.equal(sequence.third.records[0].trialId, 'pilot-trial-pilot-0001');
  assert.throws(() => createInputPilotWorkspace(definition, {
    ...sequence.first,
    activeTrial: null,
  }), /孤立 assignment/);
  assert.throws(() => createInputPilotWorkspace(definition, {
    ...sequence.third,
    activeTrial: sequence.enrolled,
  }), /已存在终态 record/);
});

test('reviewing checkpoint alone carries validated automated metrics and recoverable form draft', () => {
  const definition = createArenaInputPilotV1Definition();
  const { enrolled } = workspaceSequence(definition);
  assert.throws(() => createInputPilotTrialCheckpoint(definition, {
    ...enrolled,
    automated: automated(),
  }), /只有 reviewing checkpoint/);
  assert.throws(() => createInputPilotTrialCheckpoint(definition, {
    ...enrolled,
    phase: INPUT_PILOT_TRIAL_PHASE.REVIEWING,
    automated: null,
  }), /只有 reviewing checkpoint/);
  assert.throws(() => createInputPilotTrialCheckpoint(definition, {
    ...enrolled,
    terminationReason: INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED,
  }), /terminationReason 必须为 null/);
  assert.throws(() => createInputPilotTrialCheckpoint(definition, {
    ...enrolled,
    phase: INPUT_PILOT_TRIAL_PHASE.REVIEWING,
    terminationReason: null,
    automated: automated(),
  }), /必须包含可提交表单的终止原因/);
  assert.throws(() => createInputPilotTrialCheckpoint(definition, {
    ...enrolled,
    reviewDraft: reviewDraft(),
  }), /reviewDraft 必须为 null/);
  assert.throws(() => createInputPilotTrialCheckpoint(definition, {
    ...enrolled,
    phase: INPUT_PILOT_TRIAL_PHASE.REVIEWING,
    terminationReason: INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED,
    automated: automated(),
    reviewDraft: null,
  }), /必须包含可恢复的 reviewDraft/);
});

test('pilot storage lease supports contention, renewal, expiry takeover and explicit release', () => {
  const harness = storageHarness();
  let now = 1000;
  const first = new InputPilotStorageLease({
    storage: harness.port,
    key: 'pilot.lease',
    ownerId: 'page-a',
    wallNow: () => now,
    durationMs: 1000,
  });
  const second = new InputPilotStorageLease({
    storage: harness.port,
    key: 'pilot.lease',
    ownerId: 'page-b',
    wallNow: () => now,
    durationMs: 1000,
  });
  assert.equal(first.acquire(), true);
  assert.equal(second.acquire(), false);
  now = 1500;
  assert.equal(first.renew(), true);
  assert.equal(second.acquire(), false);
  now = 2500;
  assert.equal(second.acquire(), true);
  assert.throws(() => first.assertHeld(), /过期或被其他页面取代/);
  assert.equal(first.release(), true);
  assert.equal(second.release(), true);
  assert.equal(harness.values.has('pilot.lease'), false);
  first.destroy();
  second.destroy();
});

test('pilot storage lease blocks a second instance even when owner ids are misconfigured alike', () => {
  const harness = storageHarness();
  const first = new InputPilotStorageLease({
    storage: harness.port,
    key: 'pilot.lease',
    ownerId: 'duplicated-page-id',
    wallNow: () => 1000,
  });
  const second = new InputPilotStorageLease({
    storage: harness.port,
    key: 'pilot.lease',
    ownerId: 'duplicated-page-id',
    wallNow: () => 1000,
  });
  assert.equal(first.acquire(), true);
  assert.equal(first.acquire(), true);
  assert.equal(second.acquire(), false);
  assert.equal(first.release(), true);
  assert.equal(second.acquire(), true);
  first.destroy();
  second.destroy();
});

test('pilot storage lease fails closed on read errors and contains async storage contracts', async () => {
  const harness = storageHarness();
  harness.readFailures.add('pilot.lease');
  const broken = new InputPilotStorageLease({
    storage: harness.port,
    key: 'pilot.lease',
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  assert.throws(() => broken.acquire(), /读取失败/);
  broken.destroy();

  const asyncLease = new InputPilotStorageLease({
    storage: {
      storageRead: () => Promise.reject(new Error('late read failure')),
      storageWrite: () => true,
      storageDelete: () => true,
    },
    key: 'pilot.async-lease',
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  assert.throws(() => asyncLease.acquire(), /必须同步完成/);
  asyncLease.destroy();
  await new Promise((resolve) => setImmediate(resolve));
});

test('pilot storage lease repairs malformed ephemeral data but protects future schemas', () => {
  const harness = storageHarness();
  harness.values.set('pilot.lease', { broken: true });
  const repaired = new InputPilotStorageLease({
    storage: harness.port,
    key: 'pilot.lease',
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  assert.equal(repaired.acquire(), true);
  assert.equal(harness.values.get('pilot.lease').ownerId, 'page-a');
  repaired.destroy();

  harness.values.set('pilot.lease', {
    schemaVersion: INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION + 1,
  });
  const future = new InputPilotStorageLease({
    storage: harness.port,
    key: 'pilot.lease',
    ownerId: 'page-b',
    wallNow: () => 1001,
  });
  assert.throws(() => future.acquire(), /来自未来 schema/);
  future.destroy();
  assert.equal(
    harness.values.get('pilot.lease').schemaVersion,
    INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION + 1,
  );
});

test('pilot storage lease rejects a backwards wall clock and failed write confirmation', () => {
  const harness = storageHarness();
  let now = 1000;
  const lease = new InputPilotStorageLease({
    storage: harness.port,
    key: 'pilot.lease',
    ownerId: 'page-a',
    wallNow: () => now,
  });
  assert.equal(lease.acquire(), true);
  now = 999;
  assert.throws(() => lease.assertHeld(), /不能在实例生命周期内倒退/);
  lease.destroy();

  const unconfirmedStorage = storageHarness();
  const originalWrite = unconfirmedStorage.port.storageWrite;
  unconfirmedStorage.port.storageWrite = (key, value) => {
    originalWrite(key, { ...value, revision: value.revision + 1 });
    return true;
  };
  const unconfirmed = new InputPilotStorageLease({
    storage: unconfirmedStorage.port,
    key: 'pilot.lease',
    ownerId: 'page-b',
    wallNow: () => 1000,
  });
  assert.equal(unconfirmed.acquire(), false);
  assert.equal(unconfirmed.getStatus().held, false);
  unconfirmed.destroy();
});

test('workspace repository alternates slots and restores the latest committed generation', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  let now = 1000;
  const firstRepository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => now,
  });
  const sequence = workspaceSequence(definition);
  assert.deepEqual(firstRepository.open(), sequence.initial);
  const firstCommit = firstRepository.compareAndSet(sequence.first, 0);
  assert.deepEqual(firstCommit, { committed: true, reason: null, headUpdated: true });
  const keys = firstRepository.getStorageKeys();
  assert.equal(harness.values.get(keys.head), 'a');
  assert.equal(firstRepository.compareAndSet(sequence.second, 1).committed, true);
  assert.equal(harness.values.get(keys.head), 'b');
  firstRepository.destroy();

  now += 1;
  const restored = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-b',
    wallNow: () => now,
  });
  assert.deepEqual(restored.open(), sequence.second);
  assert.equal(restored.compareAndSet(sequence.third, 2).committed, true);
  assert.deepEqual(restored.getSnapshot(), sequence.third);
  restored.destroy();
});

test('workspace repository preserves a growing evidence set across repeated reopen cycles', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  let now = 1000;
  let ownerIndex = 0;
  let repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: `page-${ownerIndex}`,
    wallNow: () => now,
  });
  let current = repository.open();
  for (let index = 0; index < 12; index += 1) {
    const sequence = appendCompletedTrial(definition, current, index);
    for (const next of [
      sequence.enrollmentWorkspace,
      sequence.reviewingWorkspace,
      sequence.terminalWorkspace,
    ]) {
      assert.equal(repository.compareAndSet(next, current.revision).committed, true);
      current = next;
    }
    if ((index + 1) % 3 === 0) {
      repository.destroy();
      now += 1;
      ownerIndex += 1;
      repository = new InputPilotWorkspaceRepository({
        definition,
        storage: harness.port,
        ownerId: `page-${ownerIndex}`,
        wallNow: () => now,
      });
      assert.deepEqual(repository.open(), current);
    }
  }
  assert.equal(current.revision, 36);
  assert.equal(current.enrollment.revision, 12);
  assert.equal(current.records.length, 12);
  assert.equal(current.activeTrial, null);
  repository.destroy();
});

test('workspace repository keeps a read-back committed slot when head update fails', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const sequence = workspaceSequence(definition);
  const repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  repository.open();
  const keys = repository.getStorageKeys();
  harness.writeFailures.add(keys.head);
  assert.deepEqual(repository.compareAndSet(sequence.first, 0), {
    committed: true,
    reason: null,
    headUpdated: false,
  });
  repository.destroy();

  harness.writeFailures.delete(keys.head);
  const restored = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-b',
    wallNow: () => 1001,
  });
  assert.deepEqual(restored.open(), sequence.first);
  restored.destroy();
});

test('workspace repository releases its lease after open failure and can retry cleanly', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  const keys = repository.getStorageKeys();
  harness.readFailures.add(keys.slotA);
  assert.throws(() => repository.open(), /a 槽读取失败/);
  assert.equal(harness.values.has(keys.lease), false);
  harness.readFailures.delete(keys.slotA);
  assert.equal(repository.open().revision, 0);
  repository.destroy();
});

test('workspace repository keeps memory unchanged after slot write failure and supports retry', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const sequence = workspaceSequence(definition);
  const repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  repository.open();
  const keys = repository.getStorageKeys();
  harness.writeFailures.add(keys.slotA);
  assert.deepEqual(repository.compareAndSet(sequence.first, 0), {
    committed: false,
    reason: 'slot-write-failed',
    headUpdated: false,
  });
  assert.equal(repository.getSnapshot().revision, 0);
  assert.equal(harness.values.has(keys.slotA), false);
  harness.writeFailures.delete(keys.slotA);
  assert.equal(repository.compareAndSet(sequence.first, 0).committed, true);
  repository.destroy();
});

test('workspace repository detects storage changes after open and an expired lease before writing', () => {
  const definition = createArenaInputPilotV1Definition();
  const sequence = workspaceSequence(definition);
  const externalHarness = storageHarness();
  const external = new InputPilotWorkspaceRepository({
    definition,
    storage: externalHarness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  external.open();
  const keys = external.getStorageKeys();
  externalHarness.values.set(keys.slotA, {
    schemaVersion: INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    generation: sequence.first.revision,
    payloadHash: createDeterministicDataHash(sequence.first),
    payload: sequence.first,
  });
  assert.deepEqual(external.compareAndSet(sequence.first, 0), {
    committed: false,
    reason: 'storage-revision-mismatch',
    headUpdated: false,
  });
  assert.equal(external.getSnapshot().revision, 0);
  external.destroy();

  const expiryHarness = storageHarness();
  let now = 1000;
  const expired = new InputPilotWorkspaceRepository({
    definition,
    storage: expiryHarness.port,
    ownerId: 'page-b',
    wallNow: () => now,
    leaseDurationMs: 1000,
  });
  expired.open();
  now = 2000;
  assert.throws(
    () => expired.compareAndSet(sequence.first, 0),
    /已过期或被其他页面取代/,
  );
  assert.equal(expired.getSnapshot().revision, 0);
  expired.destroy();
});

test('workspace repository preserves a retryable lifecycle when lease cleanup fails', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-cleanup-retry',
    wallNow: () => 1000,
  });
  repository.open();
  const keys = repository.getStorageKeys();
  harness.deleteFailures.add(keys.lease);
  assert.throws(() => repository.destroy(), /未能确认释放/);
  assert.equal(repository.getSnapshot().revision, 0);
  harness.deleteFailures.delete(keys.lease);
  repository.destroy();
  repository.destroy();
  assert.equal(harness.values.has(keys.lease), false);
});

test('workspace repository falls back from a corrupt newest slot without exposing raw data', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const sequence = workspaceSequence(definition);
  const repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  repository.open();
  repository.compareAndSet(sequence.first, 0);
  repository.compareAndSet(sequence.second, 1);
  const keys = repository.getStorageKeys();
  repository.destroy();
  harness.values.get(keys.slotB).payloadHash = 'corrupt';

  const restored = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-b',
    wallNow: () => 1001,
  });
  assert.deepEqual(restored.open(), sequence.first);
  assert.deepEqual(restored.getDiagnostics(), {
    invalidSlots: 1,
    headReadable: true,
    headValid: true,
  });
  restored.destroy();
});

test('workspace repository repairs two corrupt slots only after a verified commit', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const sequence = workspaceSequence(definition);
  const repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  const keys = repository.getStorageKeys();
  harness.values.set(keys.slotA, { broken: 'a' });
  harness.values.set(keys.slotB, { broken: 'b' });
  assert.equal(repository.open().revision, 0);
  assert.deepEqual(repository.getDiagnostics(), {
    invalidSlots: 2,
    headReadable: true,
    headValid: true,
  });
  assert.deepEqual(harness.values.get(keys.slotB), { broken: 'b' });
  assert.equal(repository.compareAndSet(sequence.first, 0).committed, true);
  assert.deepEqual(harness.values.get(keys.slotB), { broken: 'b' });
  repository.destroy();

  const restored = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-b',
    wallNow: () => 1001,
  });
  assert.deepEqual(restored.open(), sequence.first);
  assert.equal(restored.getDiagnostics().invalidSlots, 1);
  restored.destroy();
});

test('workspace repository rejects divergent valid slots at the same generation', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const first = workspaceSequence(definition, 'pilot-a').first;
  const second = workspaceSequence(definition, 'pilot-b').first;
  const repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  const keys = repository.getStorageKeys();
  for (const [key, workspace] of [[keys.slotA, first], [keys.slotB, second]]) {
    harness.values.set(key, {
      schemaVersion: INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      generation: workspace.revision,
      payloadHash: createDeterministicDataHash(workspace),
      payload: workspace,
    });
  }
  assert.throws(() => repository.open(), /同 generation 双槽内容冲突/);
  assert.equal(harness.values.has(keys.lease), false);
  repository.destroy();
});

test('workspace repository rejects stale CAS and future envelopes before overwrite', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const sequence = workspaceSequence(definition);
  const repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  repository.open();
  assert.equal(repository.compareAndSet(sequence.first, 1).reason, 'memory-revision-mismatch');
  const keys = repository.getStorageKeys();
  repository.destroy();

  harness.values.set(keys.slotA, {
    schemaVersion: INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION + 1,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    generation: 1,
    payloadHash: createDeterministicDataHash(sequence.first),
    payload: sequence.first,
  });
  const future = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-b',
    wallNow: () => 1001,
  });
  assert.throws(() => future.open(), /未来 schema/);
  future.destroy();
  assert.equal(harness.values.get(keys.slotA).schemaVersion, 2);
});

test('workspace repository refuses a future workspace payload before overwrite', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const sequence = workspaceSequence(definition);
  const repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  repository.open();
  const keys = repository.getStorageKeys();
  repository.destroy();

  const futurePayload = {
    ...sequence.first,
    schemaVersion: INPUT_PILOT_WORKSPACE_SCHEMA_VERSION + 1,
  };
  harness.values.set(keys.slotA, {
    schemaVersion: INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    generation: futurePayload.revision,
    payloadHash: createDeterministicDataHash(futurePayload),
    payload: futurePayload,
  });
  const future = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-b',
    wallNow: () => 1001,
  });
  assert.throws(() => future.open(), /InputPilotWorkspace 来自未来 schema/);
  future.destroy();
  assert.equal(harness.values.get(keys.slotA).payload.schemaVersion, 2);
});

test('workspace repository protects future nested assignment schemas', () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const sequence = workspaceSequence(definition);
  const repository = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  repository.open();
  const keys = repository.getStorageKeys();
  repository.destroy();

  const futurePayload = clone(sequence.first);
  futurePayload.enrollment.assignments[0].schemaVersion = (
    INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION + 1
  );
  harness.values.set(keys.slotA, {
    schemaVersion: INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    generation: futurePayload.revision,
    payloadHash: createDeterministicDataHash(futurePayload),
    payload: futurePayload,
  });
  const future = new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-b',
    wallNow: () => 1001,
  });
  assert.throws(() => future.open(), /assignments\[0\] 来自未来 schema/);
  future.destroy();
  assert.equal(
    harness.values.get(keys.slotA).payload.enrollment.assignments[0].schemaVersion,
    INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION + 1,
  );
});
