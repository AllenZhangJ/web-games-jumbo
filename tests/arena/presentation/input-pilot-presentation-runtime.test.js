import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaInputPilotV1Definition } from '@number-strategy-jump/arena-input-pilot';
import { InputPilotAssignedMatchService } from '../../../src/arena/presentation/pilot/input-pilot-assigned-match-service.js';
import { createInputPilotAssignment } from '@number-strategy-jump/arena-input-pilot';
import { INPUT_PILOT_ACTION_OUTCOME } from '../../../src/arena/presentation/pilot/input-pilot-record.js';
import {
  INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
  INPUT_PILOT_TRIAL_PHASE,
  createInputPilotTrialCheckpoint,
} from '../../../src/arena/presentation/pilot/input-pilot-trial-checkpoint.js';
import { INPUT_PILOT_RUNTIME_STATE } from '../../../src/arena/presentation/pilot/input-pilot-trial-runtime-port.js';
import { InputPilotPresentationRuntime } from '../../../src/arena/presentation/session/input-pilot-presentation-runtime.js';

function checkpoint(definition) {
  return createInputPilotTrialCheckpoint(definition, {
    schemaVersion: INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
    trialId: 'pilot-runtime-trial',
    assignment: createInputPilotAssignment({
      definition,
      participantId: 'pilot-runtime',
      enrollmentIndex: 0,
    }),
    phase: INPUT_PILOT_TRIAL_PHASE.RUNNING,
    terminationReason: null,
    device: definition.environment,
    eligibility: {
      priorArenaExperience: false,
      priorOtherVariantExposure: false,
    },
    automated: null,
    reviewDraft: null,
  });
}

function metrics() {
  return Object.freeze({
    trialDurationMs: 1000,
    firstEffectiveMovementMs: 200,
    firstCorrectContextActionMs: 500,
    groundJump: INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED,
    airJump: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
    downSmash: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
  });
}

test('assigned match service fixes the experiment seed and permits only one created match', () => {
  const calls = [];
  const service = new InputPilotAssignedMatchService({
    matchSeed: 123,
    matchService: {
      create(options) {
        calls.push(options);
        return { matchSeed: options.matchSeed };
      },
    },
  });
  assert.deepEqual(service.create({ config: { mode: 'pilot' } }), { matchSeed: 123 });
  assert.deepEqual(calls, [{ config: { mode: 'pilot' }, matchSeed: 123 }]);
  assert.throws(() => service.create(), /只允许创建一局/);
  service.destroy();

  const mismatch = new InputPilotAssignedMatchService({
    matchSeed: 123,
    matchService: { create: () => ({}) },
  });
  assert.throws(() => mismatch.create({ matchSeed: 124 }), /不能覆盖/);
  mismatch.destroy();
});

test('presentation runtime adapts the assigned match, collector and lifecycle without leaking them', async () => {
  const definition = createArenaInputPilotV1Definition();
  const active = checkpoint(definition);
  const baseCalls = [];
  const lifecycle = [];
  let timedOut = false;
  let presentation;
  let presentationOptions;
  const failures = [];
  const diagnostics = [];
  let progressCount = 0;

  const runtime = new InputPilotPresentationRuntime({
    platform: { id: 'fake-platform' },
    definition,
    checkpoint: active,
    matchService: {
      create(options) {
        baseCalls.push(options);
        return { matchSeed: options.matchSeed, session: {} };
      },
    },
    onProgress() {
      progressCount += 1;
      return true;
    },
    onFailure(error) {
      failures.push(error);
      return true;
    },
    onDiagnostic(value) {
      diagnostics.push(value);
    },
    collectorFactory() {
      return {
        getStatus: () => ({ timedOut }),
        finalize: () => metrics(),
        destroy: () => lifecycle.push('collector'),
      };
    },
    observedMatchServiceFactory({ matchService }) {
      return {
        create: (options) => matchService.create(options),
        destroy: () => lifecycle.push('observed'),
      };
    },
    presentationSessionFactory(platform, options) {
      assert.equal(platform.id, 'fake-platform');
      presentationOptions = options;
      presentation = {
        state: 'created',
        async start() {
          options.matchService.create({ config: { preparingTicks: 0 } });
          this.state = 'running';
          return this;
        },
        setPaused(paused) {
          this.state = paused ? 'paused' : 'running';
          return true;
        },
        destroy() {
          lifecycle.push('presentation');
          this.state = 'destroyed';
        },
      };
      return presentation;
    },
  });

  await runtime.start();
  assert.equal(baseCalls[0].matchSeed, active.assignment.matchSeed);
  assert.equal(presentationOptions.mapperId, active.assignment.mapperId);
  assert.equal(presentationOptions.experimentLabel, '');
  assert.deepEqual(runtime.getStatus(), {
    state: INPUT_PILOT_RUNTIME_STATE.RUNNING,
    timedOut: false,
  });
  presentationOptions.onMatchProgress();
  assert.equal(progressCount, 1);
  timedOut = true;
  assert.deepEqual(runtime.getStatus(), {
    state: INPUT_PILOT_RUNTIME_STATE.RUNNING,
    timedOut: true,
  });
  presentation.state = 'result';
  assert.equal(runtime.getStatus().state, INPUT_PILOT_RUNTIME_STATE.RESULT);
  assert.equal(runtime.finalizeMetrics(), runtime.finalizeMetrics());
  presentationOptions.onDiagnostic({ type: 'render-note' });
  presentationOptions.onDiagnostic({ type: 'session-failed', message: 'frame failed' });
  presentationOptions.onDiagnostic({ type: 'session-failed', message: 'duplicate' });
  assert.equal(diagnostics.length, 3);
  assert.equal(failures.length, 1);
  assert.match(failures[0].message, /frame failed/);

  runtime.destroy();
  runtime.destroy();
  assert.deepEqual(lifecycle, ['presentation', 'observed', 'collector']);
  assert.deepEqual(runtime.getStatus(), {
    state: INPUT_PILOT_RUNTIME_STATE.DESTROYED,
    timedOut: true,
  });
});
