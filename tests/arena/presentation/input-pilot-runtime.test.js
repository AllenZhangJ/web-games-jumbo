import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_MATCH_PHASE } from '@number-strategy-jump/arena-match';
import { STAGE6_MOVEMENT_ACTION_ID } from '../../../src/arena/content/stage6-movement-actions.js';
import { ARENA_MATCH_EVENT } from '@number-strategy-jump/arena-contracts';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { QuickMatchService } from '../../../src/arena/matchmaking/quick-match-service.js';
import { createArenaInputPilotV1Definition } from '../../../src/arena/presentation/pilot/arena-input-pilot-v1.js';
import { createInputPilotAssignment } from '../../../src/arena/presentation/pilot/input-pilot-assignment.js';
import {
  INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION,
  InputPilotEnrollmentLedger,
} from '../../../src/arena/presentation/pilot/input-pilot-enrollment-ledger.js';
import { InputPilotMetricCollector } from '../../../src/arena/presentation/pilot/input-pilot-metric-collector.js';
import { createInputPilotDefinition } from '../../../src/arena/presentation/pilot/input-pilot-definition.js';
import { InputPilotObservedMatchService } from '../../../src/arena/presentation/pilot/input-pilot-observed-match-service.js';
import { InputPilotObservedSession } from '../../../src/arena/presentation/pilot/input-pilot-observed-session.js';
import { INPUT_PILOT_ACTION_OUTCOME } from '../../../src/arena/presentation/pilot/input-pilot-record.js';

const MATCH_SEED = 0x99110001;

function assignment(definition, enrollmentIndex = 0, participantId = `pilot-${enrollmentIndex}`) {
  return createInputPilotAssignment({ definition, enrollmentIndex, participantId });
}

function outcome(actionDefinitionId = null) {
  return Object.freeze({
    kind: actionDefinitionId === null ? 'none' : 'selected',
    actionDefinitionId,
  });
}

function participant({ x = 0, z = 0, grounded = true, primary = null, primaryHold = null } = {}) {
  return Object.freeze({
    id: 'player-1',
    grounded,
    position: Object.freeze({ x, y: 1, z }),
    actionAffordance: Object.freeze({
      channels: Object.freeze({
        primary: outcome(primary),
        primaryHold: outcome(primaryHold),
      }),
    }),
  });
}

function snapshot({ tick, activeTick, phase, local = participant() }) {
  return Object.freeze({
    tick,
    activeTick,
    phase,
    matchSeed: MATCH_SEED,
    participants: Object.freeze([local]),
  });
}

function input(tick, overrides = {}) {
  return Object.freeze({
    ...createNeutralInputFrame(tick, 'player-1'),
    ...overrides,
  });
}

function observedStep(collector, beforeSnapshot, playerInput, afterSnapshot, events = []) {
  return collector.observeStep({
    beforeSnapshot,
    input: playerInput,
    result: Object.freeze({
      input: playerInput,
      snapshot: afterSnapshot,
      events: Object.freeze(events),
    }),
  });
}

function captureThrown(callback) {
  try {
    callback();
  } catch (error) {
    return error;
  }
  throw new assert.AssertionError({ message: '预期 callback 抛出异常。' });
}

test('enrollment ledger persists before commit and restores deterministic assignments', () => {
  const definition = createArenaInputPilotV1Definition();
  const persisted = [];
  const ledger = new InputPilotEnrollmentLedger({
    definition,
    persist(next, expectedRevision) {
      persisted.push({ next, expectedRevision });
      return true;
    },
  });
  assert.equal(ledger.getSnapshot().schemaVersion, INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION);
  assert.equal(ledger.getSnapshot().revision, 0);

  const first = ledger.enroll({ participantId: 'pilot-one', enrollmentIndex: 0 });
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].expectedRevision, 0);
  assert.equal(persisted[0].next.revision, 1);
  assert.equal(ledger.getSnapshot().assignments[0], first);
  assert.equal(
    ledger.enroll({ participantId: 'pilot-one', enrollmentIndex: 0 }),
    first,
  );
  assert.equal(persisted.length, 1);

  const second = ledger.enroll({ participantId: 'pilot-two', enrollmentIndex: 1 });
  assert.equal(second.enrollmentIndex, 1);
  assert.equal(ledger.getSnapshot().revision, 2);
  assert.throws(
    () => ledger.enroll({ participantId: 'pilot-one', enrollmentIndex: 2 }),
    /已使用其他 enrollmentIndex/,
  );
  assert.throws(
    () => ledger.enroll({ participantId: 'pilot-three', enrollmentIndex: 1 }),
    /已分配给其他 participant/,
  );

  const restored = new InputPilotEnrollmentLedger({
    definition,
    initialState: ledger.getSnapshot(),
    persist: () => true,
  });
  assert.deepEqual(restored.getSnapshot(), ledger.getSnapshot());
  assert.equal(restored.findByParticipantId('pilot-two').assignmentId, second.assignmentId);
  assert.throws(() => { restored.getSnapshot().revision = 99; }, /read only|Cannot assign/i);
  restored.destroy();
  ledger.destroy();
});

test('enrollment ledger rolls back persistence failure and blocks reentrant or async writers', () => {
  const definition = createArenaInputPilotV1Definition();
  const persistenceFailure = new InputPilotEnrollmentLedger({
    definition,
    persist: () => false,
  });
  const before = persistenceFailure.getSnapshot();
  assert.throws(
    () => persistenceFailure.enroll({ participantId: 'pilot-failed', enrollmentIndex: 0 }),
    /持久化未确认提交/,
  );
  assert.equal(persistenceFailure.getSnapshot(), before);

  const asyncWriter = new InputPilotEnrollmentLedger({
    definition,
    persist: () => Promise.reject(new Error('late async storage failure')),
  });
  assert.throws(
    () => asyncWriter.enroll({ participantId: 'pilot-async', enrollmentIndex: 0 }),
    /必须同步完成/,
  );
  assert.equal(asyncWriter.getSnapshot().revision, 0);

  let reentrant;
  reentrant = new InputPilotEnrollmentLedger({
    definition,
    persist() {
      assert.throws(
        () => reentrant.enroll({ participantId: 'pilot-inner', enrollmentIndex: 1 }),
        /写入不可重入/,
      );
      assert.throws(() => reentrant.destroy(), /写入期间不能销毁/);
      return true;
    },
  });
  reentrant.enroll({ participantId: 'pilot-outer', enrollmentIndex: 0 });
  assert.equal(reentrant.getSnapshot().revision, 1);

  const malformed = {
    ...reentrant.getSnapshot(),
    revision: 2,
  };
  assert.throws(() => new InputPilotEnrollmentLedger({
    definition,
    initialState: malformed,
    persist: () => true,
  }), /revision 必须等于/);

  reentrant.destroy();
  asyncWriter.destroy();
  persistenceFailure.destroy();
});

test('metric collector uses active ticks, actual movement and successful authority actions', () => {
  const definition = createArenaInputPilotV1Definition();
  const collector = new InputPilotMetricCollector({
    definition,
    assignment: assignment(definition),
  });

  observedStep(
    collector,
    snapshot({ tick: 0, activeTick: 0, phase: ARENA_MATCH_PHASE.PREPARING }),
    input(0, { moveX: 1, primaryPressed: true }),
    snapshot({ tick: 1, activeTick: 0, phase: ARENA_MATCH_PHASE.RUNNING }),
  );
  assert.deepEqual(collector.getStatus(), {
    assignmentId: assignment(definition).assignmentId,
    started: true,
    timedOut: false,
    finalized: false,
    trialDurationMs: 0,
    lastObservedTick: 0,
  });

  observedStep(
    collector,
    snapshot({
      tick: 1,
      activeTick: 0,
      phase: ARENA_MATCH_PHASE.RUNNING,
      local: participant({ primary: 'action.base-push' }),
    }),
    input(1, { moveX: 1, primaryPressed: true, jumpPressed: true }),
    snapshot({
      tick: 2,
      activeTick: 1,
      phase: ARENA_MATCH_PHASE.RUNNING,
      local: participant({ x: 0.03, grounded: false }),
    }),
    [
      { type: ARENA_MATCH_EVENT.ACTION_STARTED, participantId: 'player-1', action: 'action.base-push' },
      {
        type: ARENA_MATCH_EVENT.ACTION_STARTED,
        participantId: 'player-1',
        action: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
      },
    ],
  );
  observedStep(
    collector,
    snapshot({
      tick: 2,
      activeTick: 1,
      phase: ARENA_MATCH_PHASE.RUNNING,
      local: participant({ x: 0.03, grounded: false }),
    }),
    input(2, { moveX: 1, jumpPressed: true }),
    snapshot({
      tick: 3,
      activeTick: 2,
      phase: ARENA_MATCH_PHASE.RUNNING,
      local: participant({ x: 0.06, grounded: false }),
    }),
    [{
      type: ARENA_MATCH_EVENT.ACTION_STARTED,
      participantId: 'player-1',
      action: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
    }],
  );
  observedStep(
    collector,
    snapshot({
      tick: 3,
      activeTick: 2,
      phase: ARENA_MATCH_PHASE.RUNNING,
      local: participant({ x: 0.06, grounded: false }),
    }),
    input(3, { slamPressed: true }),
    snapshot({
      tick: 4,
      activeTick: 3,
      phase: ARENA_MATCH_PHASE.RUNNING,
      local: participant({ x: 0.06, grounded: false }),
    }),
  );
  observedStep(
    collector,
    snapshot({
      tick: 4,
      activeTick: 3,
      phase: ARENA_MATCH_PHASE.RUNNING,
      local: participant({ x: 0.06, grounded: false }),
    }),
    input(4),
    snapshot({
      tick: 5,
      activeTick: 4,
      phase: ARENA_MATCH_PHASE.RUNNING,
      local: participant({ x: 0.06, grounded: true }),
    }),
    [{ type: ARENA_MATCH_EVENT.DOWN_SMASH_LANDED, participantId: 'player-1' }],
  );

  const automated = collector.finalize();
  assert.deepEqual(automated, {
    trialDurationMs: 67,
    firstEffectiveMovementMs: 33,
    firstCorrectContextActionMs: 17,
    groundJump: INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED,
    airJump: INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED,
    downSmash: INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED,
  });
  assert.equal(collector.finalize(), automated);
  assert.throws(() => observedStep(
    collector,
    snapshot({ tick: 5, activeTick: 4, phase: ARENA_MATCH_PHASE.RUNNING }),
    input(5),
    snapshot({ tick: 6, activeTick: 5, phase: ARENA_MATCH_PHASE.RUNNING }),
  ), /已终结/);
  collector.destroy();
});

test('metric collector keeps failed attempts and rejects forged timeline progression', () => {
  const definition = createArenaInputPilotV1Definition();
  const failed = new InputPilotMetricCollector({
    definition,
    assignment: assignment(definition, 1),
  });
  observedStep(
    failed,
    snapshot({ tick: 0, activeTick: 0, phase: ARENA_MATCH_PHASE.PREPARING }),
    input(0),
    snapshot({ tick: 1, activeTick: 0, phase: ARENA_MATCH_PHASE.RUNNING }),
  );
  observedStep(
    failed,
    snapshot({ tick: 1, activeTick: 0, phase: ARENA_MATCH_PHASE.RUNNING }),
    input(1, { jumpPressed: true, slamPressed: true }),
    snapshot({ tick: 2, activeTick: 1, phase: ARENA_MATCH_PHASE.RUNNING }),
  );
  assert.deepEqual(failed.finalize(), {
    trialDurationMs: 17,
    firstEffectiveMovementMs: null,
    firstCorrectContextActionMs: null,
    groundJump: INPUT_PILOT_ACTION_OUTCOME.FAILED,
    airJump: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
    downSmash: INPUT_PILOT_ACTION_OUTCOME.FAILED,
  });
  failed.destroy();

  const forged = new InputPilotMetricCollector({
    definition,
    assignment: assignment(definition, 2),
  });
  assert.throws(() => observedStep(
    forged,
    snapshot({ tick: 0, activeTick: 0, phase: ARENA_MATCH_PHASE.RUNNING }),
    input(0),
    snapshot({ tick: 1, activeTick: 2, phase: ARENA_MATCH_PHASE.RUNNING }),
  ), /activeTick 与比赛阶段推进不一致/);
  assert.equal(forged.getStatus().lastObservedTick, -1);
  forged.destroy();
});

test('metric collector does not treat an airborne carried hold as an air-jump attempt', () => {
  const definition = createArenaInputPilotV1Definition();
  const collector = new InputPilotMetricCollector({
    definition,
    assignment: assignment(definition, 8),
  });
  observedStep(
    collector,
    snapshot({
      tick: 0,
      activeTick: 0,
      phase: ARENA_MATCH_PHASE.RUNNING,
      local: participant({ grounded: false }),
    }),
    input(0, { jumpHeld: true }),
    snapshot({
      tick: 1,
      activeTick: 1,
      phase: ARENA_MATCH_PHASE.RUNNING,
      local: participant({ grounded: false }),
    }),
  );
  assert.equal(
    collector.finalize().airJump,
    INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
  );
  collector.destroy();
});

test('metric collector times out on active simulation time without counting preparation', () => {
  const base = createArenaInputPilotV1Definition();
  const definition = createInputPilotDefinition({
    ...base.toJSON(),
    id: 'arena.input-mapper-pilot.timeout-test',
    thresholds: {
      ...base.thresholds,
      successWindowMs: 17,
      maximumTrialDurationMs: 17,
    },
  });
  const collector = new InputPilotMetricCollector({
    definition,
    assignment: assignment(definition),
  });
  observedStep(
    collector,
    snapshot({ tick: 0, activeTick: 0, phase: ARENA_MATCH_PHASE.PREPARING }),
    input(0),
    snapshot({ tick: 1, activeTick: 0, phase: ARENA_MATCH_PHASE.RUNNING }),
  );
  assert.equal(collector.getStatus().trialDurationMs, 0);
  observedStep(
    collector,
    snapshot({ tick: 1, activeTick: 0, phase: ARENA_MATCH_PHASE.RUNNING }),
    input(1),
    snapshot({ tick: 2, activeTick: 1, phase: ARENA_MATCH_PHASE.RUNNING }),
  );
  assert.equal(collector.getStatus().timedOut, true);
  assert.equal(collector.getStatus().trialDurationMs, 17);
  assert.equal(observedStep(
    collector,
    snapshot({ tick: 99, activeTick: 99, phase: ARENA_MATCH_PHASE.RUNNING }),
    input(99),
    snapshot({ tick: 100, activeTick: 100, phase: ARENA_MATCH_PHASE.RUNNING }),
  ), false);
  assert.equal(collector.finalize().trialDurationMs, 17);
  collector.destroy();
});

test('observed match service receives the normalized InputFrame consumed by a real local match', () => {
  const definition = createArenaInputPilotV1Definition();
  const collector = new InputPilotMetricCollector({
    definition,
    assignment: assignment(definition, 3),
  });
  const service = new InputPilotObservedMatchService({
    matchService: new QuickMatchService(),
    collector,
  });
  const match = service.create({
    matchSeed: MATCH_SEED,
    config: { preparingTicks: 0 },
  });
  match.session.start();
  for (let index = 0; index < 12; index += 1) {
    const current = match.session.getSnapshot();
    match.session.step(input(current.tick, {
      moveX: 1,
      jumpPressed: index === 0,
      jumpHeld: index === 0,
    }));
  }
  const automated = collector.finalize();
  assert.equal(automated.groundJump, INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED);
  assert.ok(automated.firstEffectiveMovementMs !== null);
  assert.ok(automated.trialDurationMs > 0);
  service.destroy();
  collector.destroy();
});

class FakeSession {
  constructor() {
    this.state = 'created';
    this.current = snapshot({ tick: 0, activeTick: 0, phase: ARENA_MATCH_PHASE.RUNNING });
    this.paused = false;
    this.destroyCount = 0;
  }

  start() { this.state = this.paused ? 'paused' : 'running'; }

  setPaused(paused) { this.paused = paused; this.state = paused ? 'paused' : 'running'; }

  step(value) {
    if (this.paused) return { events: [], snapshot: this.current, input: null };
    const next = snapshot({
      tick: this.current.tick + 1,
      activeTick: this.current.activeTick + 1,
      phase: ARENA_MATCH_PHASE.RUNNING,
    });
    this.current = next;
    return { events: [], snapshot: next, input: value };
  }

  getSnapshot() { return this.current; }

  getPublicMatchInfo() { return { matchSeed: MATCH_SEED, opponent: {} }; }

  exportReplay() { return { ok: true }; }

  destroy() { this.destroyCount += 1; this.state = 'destroyed'; }
}

test('observed session records only committed inputs and preserves paused no-op steps', () => {
  const delegate = new FakeSession();
  const observations = [];
  const session = new InputPilotObservedSession({
    session: delegate,
    collector: { observeStep: (value) => observations.push(value) },
  });
  session.start();
  const firstInput = input(0, { moveX: 1 });
  const result = session.step(firstInput);
  assert.equal(observations.length, 1);
  assert.equal(observations[0].input, result.input);
  assert.equal(observations[0].beforeSnapshot.tick, 0);
  assert.equal(observations[0].result.snapshot.tick, 1);
  assert.ok(Object.isFrozen(observations[0].beforeSnapshot));
  assert.ok(Object.isFrozen(observations[0].beforeSnapshot.participants[0].position));
  assert.ok(Object.isFrozen(observations[0].result));
  assert.ok(Object.isFrozen(observations[0].result.events));
  assert.ok(Object.isFrozen(session.getSnapshot()));
  const publicMatchInfo = session.getPublicMatchInfo();
  assert.ok(Object.isFrozen(publicMatchInfo));
  assert.ok(Object.isFrozen(publicMatchInfo.opponent));
  assert.throws(() => {
    observations[0].result.snapshot.tick = 99;
  }, /read only|Cannot assign/i);

  session.setPaused(true);
  const paused = session.step(input(1));
  assert.equal(paused.input, null);
  assert.ok(Object.isFrozen(paused));
  assert.equal(observations.length, 1);
  session.setPaused(false);
  session.destroy();
  session.destroy();
  assert.equal(delegate.destroyCount, 1);
});

test('observed session and one-shot match service fail closed on observer or rematch misuse', () => {
  const delegate = new FakeSession();
  const session = new InputPilotObservedSession({
    session: delegate,
    collector: { observeStep: () => { throw new Error('collector failed'); } },
  });
  session.start();
  assert.throws(() => session.step(input(0)), /collector failed/);
  assert.equal(delegate.destroyCount, 1);
  assert.throws(() => session.getSnapshot(), /已销毁/);

  const serviceDelegate = new FakeSession();
  const matchService = new InputPilotObservedMatchService({
    matchService: {
      create: () => ({
        matchSeed: MATCH_SEED,
        opponent: Object.freeze({ id: 'opponent' }),
        session: serviceDelegate,
      }),
    },
    collector: { observeStep: () => {} },
  });
  const match = matchService.create({});
  assert.ok(match.session instanceof InputPilotObservedSession);
  assert.throws(() => matchService.create({}), /只允许创建一局/);
  matchService.destroy();
  matchService.destroy();
  assert.equal(serviceDelegate.destroyCount, 1);
});

test('observed session preserves frozen primary failures and reports cleanup failures', () => {
  const delegate = new FakeSession();
  const collectorFailure = Object.freeze(new Error('frozen collector failure'));
  const cleanupFailure = new Error('delegate cleanup failure');
  delegate.destroy = () => {
    delegate.destroyCount += 1;
    throw cleanupFailure;
  };
  const session = new InputPilotObservedSession({
    session: delegate,
    collector: { observeStep: () => { throw collectorFailure; } },
  });
  session.start();

  const failure = captureThrown(() => session.step(input(0)));
  assert.match(failure.message, /清理未完整完成/);
  assert.equal(failure.originalError, collectorFailure);
  assert.deepEqual(failure.cleanupErrors, [cleanupFailure]);
  assert.equal(delegate.destroyCount, 1);
  assert.throws(() => session.getSnapshot(), /已销毁/);
});

test('observed session fails closed on delegate start or pause lifecycle failures', () => {
  const startDelegate = new FakeSession();
  const startFailure = Object.freeze(new Error('delegate start failure'));
  startDelegate.start = () => { throw startFailure; };
  const startSession = new InputPilotObservedSession({
    session: startDelegate,
    collector: { observeStep: () => {} },
  });
  assert.equal(captureThrown(() => startSession.start()), startFailure);
  assert.equal(startDelegate.destroyCount, 1);
  assert.throws(() => startSession.getSnapshot(), /已销毁/);

  const pauseDelegate = new FakeSession();
  const pauseFailure = Object.freeze(new Error('delegate pause failure'));
  const pauseSession = new InputPilotObservedSession({
    session: pauseDelegate,
    collector: { observeStep: () => {} },
  });
  pauseSession.start();
  assert.throws(() => pauseSession.setPaused('yes'), /布尔值/);
  assert.equal(pauseDelegate.destroyCount, 0);
  pauseDelegate.setPaused = () => { throw pauseFailure; };
  assert.equal(captureThrown(() => pauseSession.setPaused(true)), pauseFailure);
  assert.equal(pauseDelegate.destroyCount, 1);
  assert.throws(() => pauseSession.getSnapshot(), /已销毁/);
});

test('observed match service combines invalid-session and rollback cleanup failures', () => {
  const cleanupFailure = new Error('invalid session cleanup failure');
  const invalidSession = {
    destroy() { throw cleanupFailure; },
  };
  const service = new InputPilotObservedMatchService({
    matchService: {
      create: () => ({
        matchSeed: MATCH_SEED,
        session: invalidSession,
      }),
    },
    collector: { observeStep: () => {} },
  });

  const failure = captureThrown(() => service.create({}));
  assert.match(failure.message, /清理未完整完成/);
  assert.match(failure.originalError.message, /缺少 start/);
  assert.deepEqual(failure.cleanupErrors, [cleanupFailure]);
  assert.deepEqual(service.getDebugSnapshot(), {
    creating: false,
    created: false,
    destroyed: false,
    hasSession: false,
  });
  service.destroy();
});

test('observed match service rolls back a wrapped session when public metadata fails', () => {
  const delegate = new FakeSession();
  const metadataFailure = Object.freeze(new Error('opponent metadata failure'));
  const returnedMatch = {
    matchSeed: MATCH_SEED,
    session: delegate,
  };
  Object.defineProperty(returnedMatch, 'opponent', {
    enumerable: true,
    get() { throw metadataFailure; },
  });
  const service = new InputPilotObservedMatchService({
    matchService: { create: () => returnedMatch },
    collector: { observeStep: () => {} },
  });

  const failure = captureThrown(() => service.create({}));
  assert.equal(failure, metadataFailure);
  assert.equal(delegate.destroyCount, 1);
  assert.equal(service.getDebugSnapshot().created, false);
  assert.equal(service.getDebugSnapshot().hasSession, false);
  service.destroy();
});
