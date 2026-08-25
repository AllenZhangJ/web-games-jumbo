import { describe, expect, it } from 'vitest';
import { ArenaDuelAuthoritativeRuntimeCandidateV1 } from '../src/arena-duel-authoritative-runtime-candidate-v1.js';
import { ArenaRaceAuthoritativeRuntimeCandidateV1 } from '../src/arena-race-vertical-integration-verification-v1.js';
import { ArenaSurvivalAuthoritativeRuntimeCandidateV1 } from '../src/arena-survival-shared-world-authority-verification-v1.js';
import {
  ARENA_THREE_MODE_WEAPON_FEEDBACK_RESTORE_SUFFIX_CANDIDATE_V1,
  runArenaThreeModeWeaponFeedbackRestoreSuffixCandidateV1,
} from '../src/arena-three-mode-weapon-feedback-restore-suffix-candidate-v1.js';

describe('Arena three-mode weapon feedback restore suffix candidate V1', () => {
  it('freezes the same restore suffix port on all three real runtime classes', () => {
    expect(ARENA_THREE_MODE_WEAPON_FEEDBACK_RESTORE_SUFFIX_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      supportedModeDefinitionIds: [
        'arena-v2.mode.duel.candidate.v1',
        'arena-v2.mode.race.candidate.v1',
        'arena-v2.mode.survival.candidate.v1',
      ],
      requiredRuntimeDataMethods: [
        'exportRuntimeCheckpointV1',
        'exportWeaponFeedbackCheckpointCapabilityV1',
        'forkFromWeaponFeedbackCheckpointCapabilityV1',
        'exportContentSelectionCheckpointCapabilityV1',
      ],
      consumesOneStablePreTerminalTick: true,
      validationStatus: 'not-run',
      defaultRegistryWired: false,
      defaultCompositionWired: false,
      defaultEntryWired: false,
    });
    for (const prototype of [
      ArenaDuelAuthoritativeRuntimeCandidateV1.prototype,
      ArenaRaceAuthoritativeRuntimeCandidateV1.prototype,
      ArenaSurvivalAuthoritativeRuntimeCandidateV1.prototype,
    ]) {
      for (const methodName of
        ARENA_THREE_MODE_WEAPON_FEEDBACK_RESTORE_SUFFIX_CANDIDATE_V1
          .requiredRuntimeDataMethods) {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
        expect(descriptor).toMatchObject({ enumerable: false });
        expect(typeof descriptor?.value).toBe('function');
        expect(descriptor?.get).toBeUndefined();
      }
    }
  });

  it('fails before touching a runtime when the mode is outside the frozen catalog', () => {
    let runtimeCalls = 0;
    expect(() => runArenaThreeModeWeaponFeedbackRestoreSuffixCandidateV1({
      modeDefinitionId: 'arena.mode.future',
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
      localInput: {},
    })).toThrow(/modeDefinitionId不受支持/u);
    expect(runtimeCalls).toBe(0);
  });

  it('rejects instance-level hostile method replacement before invoking it', () => {
    let runtimeCalls = 0;
    expect(() => runArenaThreeModeWeaponFeedbackRestoreSuffixCandidateV1({
      modeDefinitionId: 'arena-v2.mode.duel.candidate.v1',
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
      localInput: {},
    })).toThrow(/实例字段遮蔽/u);
    expect(runtimeCalls).toBe(0);
  });
});
