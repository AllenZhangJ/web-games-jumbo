import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaInputPilotV1Definition } from '@number-strategy-jump/arena-input-pilot';
import { InputPilotAssignedMatchService } from '@number-strategy-jump/arena-input-pilot';
import { createInputPilotAssignment } from '@number-strategy-jump/arena-input-pilot';
import { INPUT_PILOT_ACTION_OUTCOME } from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
  INPUT_PILOT_TRIAL_PHASE,
  createInputPilotTrialCheckpoint,
} from '@number-strategy-jump/arena-input-pilot';
import { INPUT_PILOT_RUNTIME_STATE } from '@number-strategy-jump/arena-input-pilot';
import { InputPilotPresentationRuntime } from '@number-strategy-jump/arena-input-pilot-presentation';

type PilotDefinition = ReturnType<typeof createArenaInputPilotV1Definition>;

interface TestPresentationOptions {
  readonly mapperId: string;
  readonly experimentLabel: string;
  readonly matchService: { create(options?: unknown): unknown };
  readonly onMatchProgress: () => unknown;
  readonly onDiagnostic: (value: unknown) => unknown;
}

interface TestPresentation {
  state: string;
  start(): Promise<TestPresentation>;
  setPaused(paused: boolean): boolean;
  destroy(): void;
}

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`测试缺少 ${name}。`);
  return value;
}

function checkpoint(definition: PilotDefinition) {
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
  const calls: Record<string, unknown>[] = [];
  const service = new InputPilotAssignedMatchService({
    matchSeed: 123,
    matchService: {
      create(options: Record<string, unknown>) {
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
  const baseCalls: Record<string, unknown>[] = [];
  const lifecycle: string[] = [];
  let timedOut = false;
  let presentation: TestPresentation | undefined;
  let presentationOptions: TestPresentationOptions | undefined;
  const failures: unknown[] = [];
  const diagnostics: unknown[] = [];
  let progressCount = 0;

  const runtime = new InputPilotPresentationRuntime({
    platform: { id: 'fake-platform' },
    definition,
    checkpoint: active,
    matchService: {
      create(options: Record<string, unknown>) {
        baseCalls.push(options);
        return { matchSeed: options.matchSeed, session: {} };
      },
    },
    onProgress() {
      progressCount += 1;
      return true;
    },
    onFailure(error: unknown) {
      failures.push(error);
      return true;
    },
    onDiagnostic(value: unknown) {
      diagnostics.push(value);
    },
    collectorFactory() {
      return {
        getStatus: () => ({ timedOut }),
        finalize: () => metrics(),
        destroy: () => lifecycle.push('collector'),
      };
    },
    observedMatchServiceFactory({
      matchService,
    }: {
      matchService: { create(options?: unknown): unknown };
    }) {
      return {
        create: (options?: unknown) => matchService.create(options),
        destroy: () => lifecycle.push('observed'),
      };
    },
    presentationSessionFactory(
      platform: { id: string },
      options: TestPresentationOptions,
    ) {
      assert.equal(platform.id, 'fake-platform');
      presentationOptions = options;
      presentation = {
        state: 'created',
        async start() {
          options.matchService.create({ config: { preparingTicks: 0 } });
          this.state = 'running';
          return this;
        },
        setPaused(paused: boolean) {
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
  assert.equal(required(baseCalls[0], '基础匹配调用').matchSeed, active.assignment.matchSeed);
  const options = required(presentationOptions, '表现会话 options');
  assert.equal(options.mapperId, active.assignment.mapperId);
  assert.equal(options.experimentLabel, '');
  assert.deepEqual(runtime.getStatus(), {
    state: INPUT_PILOT_RUNTIME_STATE.RUNNING,
    timedOut: false,
  });
  options.onMatchProgress();
  assert.equal(progressCount, 1);
  timedOut = true;
  assert.deepEqual(runtime.getStatus(), {
    state: INPUT_PILOT_RUNTIME_STATE.RUNNING,
    timedOut: true,
  });
  required(presentation, '表现会话').state = 'result';
  assert.equal(runtime.getStatus().state, INPUT_PILOT_RUNTIME_STATE.RESULT);
  assert.equal(runtime.finalizeMetrics(), runtime.finalizeMetrics());
  options.onDiagnostic({ type: 'render-note' });
  options.onDiagnostic({ type: 'session-failed', message: 'frame failed' });
  options.onDiagnostic({ type: 'session-failed', message: 'duplicate' });
  assert.equal(diagnostics.length, 3);
  assert.equal(failures.length, 1);
  const failure = required(failures[0], '表现失败');
  assert.match(failure instanceof Error ? failure.message : String(failure), /frame failed/);

  runtime.destroy();
  runtime.destroy();
  assert.deepEqual(lifecycle, ['presentation', 'observed', 'collector']);
  assert.deepEqual(runtime.getStatus(), {
    state: INPUT_PILOT_RUNTIME_STATE.DESTROYED,
    timedOut: true,
  });
});
