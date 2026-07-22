import { describe, expect, it } from 'vitest';
import {
  INPUT_PILOT_RUNTIME_STATE,
  INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
  INPUT_PILOT_TRIAL_PHASE,
  createArenaInputPilotV1Definition,
  createInputPilotAssignment,
  createInputPilotTrialCheckpoint,
} from '@number-strategy-jump/arena-input-pilot';
import { InputPilotPresentationRuntime } from '../src/index.js';

function pilotFixture() {
  const definition = createArenaInputPilotV1Definition();
  const checkpoint = createInputPilotTrialCheckpoint(definition, {
    schemaVersion: INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
    trialId: 'strict-presentation-runtime',
    assignment: createInputPilotAssignment({
      definition,
      participantId: 'strict-presentation-runtime',
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
  return { definition, checkpoint };
}

function baseOptions() {
  const fixture = pilotFixture();
  return {
    ...fixture,
    platform: Object.freeze({ id: 'strict-test-platform' }),
    matchService: Object.freeze({ create: () => Object.freeze({}) }),
    onProgress: () => true,
    onFailure: () => true,
  };
}

describe('InputPilotPresentationRuntime strict lifecycle', () => {
  it('retains dependent cleanup ownership until a failed destroy can be retried', () => {
    const lifecycle: string[] = [];
    let presentationDestroyAttempts = 0;
    const runtime = new InputPilotPresentationRuntime({
      ...baseOptions(),
      collectorFactory: () => ({
        getStatus: () => ({ timedOut: false }),
        finalize: () => Object.freeze({ complete: true }),
        destroy: () => lifecycle.push('collector'),
      }),
      observedMatchServiceFactory: ({ matchService }: {
        matchService: { create(options: unknown): unknown };
      }) => ({
        create: (options: unknown) => matchService.create(options),
        destroy: () => lifecycle.push('observed'),
      }),
      presentationSessionFactory: () => ({
        state: 'created',
        start: () => undefined,
        setPaused: () => true,
        destroy: () => {
          presentationDestroyAttempts += 1;
          lifecycle.push(`presentation-${presentationDestroyAttempts}`);
          if (presentationDestroyAttempts === 1) throw new Error('retry cleanup');
        },
      }),
    });

    expect(() => runtime.destroy()).toThrow(/清理未完整/);
    expect(runtime.getStatus()).toEqual({
      state: INPUT_PILOT_RUNTIME_STATE.FAILED,
      timedOut: false,
    });
    expect(lifecycle).toEqual(['presentation-1']);

    runtime.destroy();
    expect(lifecycle).toEqual(['presentation-1', 'presentation-2', 'observed', 'collector']);
    expect(runtime.getStatus()).toEqual({
      state: INPUT_PILOT_RUNTIME_STATE.DESTROYED,
      timedOut: false,
    });
  });

  it('snapshots data methods and rejects a runtime state accessor replacement without executing it', () => {
    let originalStarts = 0;
    let replacementStarts = 0;
    let stateReads = 0;
    const presentation = {
      state: 'created',
      start() {
        originalStarts += 1;
      },
      setPaused() {
        return true;
      },
      destroy() {},
    };
    const runtime = new InputPilotPresentationRuntime({
      ...baseOptions(),
      collectorFactory: () => ({
        getStatus: () => ({ timedOut: false }),
        finalize: () => Object.freeze({ complete: true }),
        destroy: () => undefined,
      }),
      observedMatchServiceFactory: ({ matchService }: {
        matchService: { create(options: unknown): unknown };
      }) => ({ create: (options: unknown) => matchService.create(options) }),
      presentationSessionFactory: () => presentation,
    });

    presentation.start = () => {
      replacementStarts += 1;
    };
    runtime.start();
    expect(originalStarts).toBe(1);
    expect(replacementStarts).toBe(0);

    Object.defineProperty(presentation, 'state', {
      configurable: true,
      enumerable: true,
      get() {
        stateReads += 1;
        return 'result';
      },
    });
    expect(() => runtime.getStatus()).toThrow(/替换为访问器/);
    expect(stateReads).toBe(0);
    runtime.destroy();
  });

  it('rejects option accessors without executing them', () => {
    const options = baseOptions();
    let reads = 0;
    Object.defineProperty(options, 'onDiagnostic', {
      enumerable: true,
      get() {
        reads += 1;
        return () => undefined;
      },
    });
    expect(() => new InputPilotPresentationRuntime(options)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });

  it('cleans invalid factory products after acquiring their destroy method', () => {
    let collectorDestroyCount = 0;
    expect(() => new InputPilotPresentationRuntime({
      ...baseOptions(),
      collectorFactory: () => ({
        finalize: () => Object.freeze({}),
        destroy: () => {
          collectorDestroyCount += 1;
        },
      }),
    })).toThrow(/getStatus/);
    expect(collectorDestroyCount).toBe(1);
  });
});
