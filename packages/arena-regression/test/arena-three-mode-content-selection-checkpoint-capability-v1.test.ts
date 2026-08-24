import { describe, expect, it } from 'vitest';
import { ArenaDuelAuthoritativeRuntimeCandidateV1 } from '../src/arena-duel-authoritative-runtime-candidate-v1.js';
import { ArenaRaceAuthoritativeRuntimeCandidateV1 } from '../src/arena-race-vertical-integration-verification-v1.js';
import { ArenaSurvivalAuthoritativeRuntimeCandidateV1 } from '../src/arena-survival-shared-world-authority-verification-v1.js';
import {
  ARENA_THREE_MODE_CONTENT_SELECTION_CHECKPOINT_CAPABILITY_V1,
  validateArenaThreeModeContentSelectionCheckpointCapabilityV1,
} from '../src/arena-three-mode-content-selection-checkpoint-capability-v1.js';

describe('Arena three-mode content selection checkpoint capability V1', () => {
  it('freezes one selected weapon for Duel/Race and all twenty for Survival', () => {
    expect(ARENA_THREE_MODE_CONTENT_SELECTION_CHECKPOINT_CAPABILITY_V1).toEqual({
      schemaVersion: 1,
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      duelEquipmentSelectionCardinality: 1,
      raceEquipmentSelectionCardinality: 1,
      survivalEquipmentSelectionCardinality: 20,
      runtimeExportMethod: 'exportContentSelectionCheckpointCapabilityV1',
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
      const descriptor = Object.getOwnPropertyDescriptor(
        prototype,
        'exportContentSelectionCheckpointCapabilityV1',
      );
      expect(typeof descriptor?.value).toBe('function');
      expect(descriptor?.get).toBeUndefined();
    }
    for (const methodName of [
      'exportRuntimeCheckpointV3',
      'forkFromRuntimeCheckpointV3',
      'exportTerminalEvidenceV2',
    ]) {
      for (const prototype of [
        ArenaDuelAuthoritativeRuntimeCandidateV1.prototype,
        ArenaRaceAuthoritativeRuntimeCandidateV1.prototype,
        ArenaSurvivalAuthoritativeRuntimeCandidateV1.prototype,
      ]) {
        expect(typeof Object.getOwnPropertyDescriptor(prototype, methodName)?.value)
          .toBe('function');
      }
    }
    for (const methodName of [
      'exportRuntimeCheckpointV4',
      'forkFromRuntimeCheckpointV4',
    ]) {
      expect(typeof Object.getOwnPropertyDescriptor(
        ArenaSurvivalAuthoritativeRuntimeCandidateV1.prototype,
        methodName,
      )?.value).toBe('function');
    }
  });

  it('rejects future and accessor claims before reading nested content', () => {
    expect(() => validateArenaThreeModeContentSelectionCheckpointCapabilityV1({
      futureSchema: 2,
    })).toThrow(/未知字段|futureSchema/u);
    let getterCalls = 0;
    expect(() => validateArenaThreeModeContentSelectionCheckpointCapabilityV1({
      get schemaVersion() {
        getterCalls += 1;
        return 1;
      },
    })).toThrow(/数据字段|未知字段/u);
    expect(getterCalls).toBe(0);
  });
});
