import { describe, expect, it } from 'vitest';
import {
  ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_CANDIDATE_V1,
  ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_POINTS_V1,
  createArenaThreeModeWeaponFeedbackFailureInjectionRuntimeV1,
} from '../src/arena-three-mode-weapon-feedback-failure-injection-candidate-v1.js';

describe('Arena three-mode weapon feedback failure injection candidate V1', () => {
  it('freezes construction, step, checkpoint, unknown-event and cleanup injection points', () => {
    expect(ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_CANDIDATE_V1).toEqual({
      schemaVersion: 1,
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      injectionPoints: [
        'fork-after-construction',
        'continuous-step-before-delegate',
        'restored-step-before-delegate',
        'restored-capability-corruption',
        'continuous-unknown-event',
        'restored-destroy-after-delegate',
      ],
      authorityMutationAllowed: false,
      injectedRuntimeOwnsOnlyRestoredForkCleanup: true,
      unknownEventKind: 'ArenaFutureWeaponFeedbackEvent',
      validationStatus: 'not-run',
      defaultRegistryWired: false,
      defaultCompositionWired: false,
      defaultEntryWired: false,
    });
    expect(new Set(ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_POINTS_V1).size)
      .toBe(6);
  });

  it('rejects unknown plans without invoking the wrapped runtime', () => {
    let runtimeCalls = 0;
    expect(() => createArenaThreeModeWeaponFeedbackFailureInjectionRuntimeV1({
      runtime: {
        step() { runtimeCalls += 1; },
        exportRuntimeCheckpointV1() { runtimeCalls += 1; },
        exportWeaponFeedbackCheckpointCapabilityV1() { runtimeCalls += 1; },
        exportContentSelectionCheckpointCapabilityV1() { runtimeCalls += 1; },
        forkFromWeaponFeedbackCheckpointCapabilityV1() {
          runtimeCalls += 1;
          return this;
        },
        destroy() { runtimeCalls += 1; },
      },
      failurePoint: 'future-failure-point',
    } as never)).toThrow(/point不受支持/u);
    expect(runtimeCalls).toBe(0);
  });
});
