import { describe, expect, it } from 'vitest';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import {
  createArenaReplayV6,
  createModeMatchRuntimeTerminalEvidenceV1,
  createModeMatchRuntimeTerminalEvidenceV2,
  validateModeMatchRuntimeTerminalEvidenceV1,
  validateModeMatchRuntimeTerminalEvidenceV2,
} from '../src/index.js';

const MODE_DEFINITION_ID = 'arena.mode.duel.runtime-terminal-evidence.test.v1';

function replay() {
  const participants = Object.freeze([
    {
      participantId: 'p1', modeRole: 'competitor', teamId: null,
      controllerKind: 'human', characterDefinitionId: 'fighter-a',
      slotId: null, slotGeneration: 0,
    },
    {
      participantId: 'p2', modeRole: 'competitor', teamId: null,
      controllerKind: 'bot', characterDefinitionId: 'fighter-b',
      slotId: null, slotGeneration: 0,
    },
  ] as const);
  const modeResult = Object.freeze({
    kind: 'duel' as const,
    winnerParticipantIds: Object.freeze([]),
    isDraw: true,
    reason: 'timeout-draw' as const,
    endedAtTick: 0,
  });
  return createArenaReplayV6({
    replaySchemaVersion: 6,
    authoritySchemaVersion: 6,
    physicsBackendVersion: 'arena.physics.runtime-terminal-evidence.test.v1',
    modeDefinitionId: MODE_DEFINITION_ID,
    contentHash: 'd001d001',
    matchSeed: 17,
    config: {
      schemaVersion: 6,
      modeDefinitionId: MODE_DEFINITION_ID,
      modeKind: 'duel',
      modePolicyContentHash: 'd001d001',
      participantAssignments: participants,
    },
    participantAssignments: participants,
    inputFrames: participants.map(({ participantId }) => (
      createNeutralInputFrame(0, participantId)
    )),
    checkpoints: [
      { tick: 0, hash: '11111111' },
      { tick: 1, hash: 'abcdef12' },
    ],
    events: [
      {
        id: 'event-start', sequence: 0, tick: 0, type: 'MatchStarted',
        modeDefinitionId: MODE_DEFINITION_ID, participantIds: ['p1', 'p2'],
      },
      {
        id: 'event-end', sequence: 1, tick: 0, type: 'MatchEnded',
        modeDefinitionId: MODE_DEFINITION_ID, modeResult,
      },
    ],
    modeResult,
    finalHash: 'abcdef12',
  });
}

describe('ModeMatchRuntime terminal evidence V1', () => {
  it('binds one Replay identity to the concrete Mode Driver content', () => {
    const authorityReplay = replay();
    const evidence = createModeMatchRuntimeTerminalEvidenceV1({
      schemaVersion: 1,
      replay: authorityReplay,
      modeDriverContentHash: 'a001a001',
    });
    expect(evidence.replayIdentityHash).toBe(authorityReplay.replayIdentityHash);
    expect(validateModeMatchRuntimeTerminalEvidenceV1(evidence)).toEqual(evidence);
  });

  it('changes identity when only the concrete Mode Driver changes', () => {
    const authorityReplay = replay();
    const first = createModeMatchRuntimeTerminalEvidenceV1({
      schemaVersion: 1,
      replay: authorityReplay,
      modeDriverContentHash: 'a001a001',
    });
    const second = createModeMatchRuntimeTerminalEvidenceV1({
      schemaVersion: 1,
      replay: authorityReplay,
      modeDriverContentHash: 'a002a002',
    });
    expect(second.replayIdentityHash).toBe(first.replayIdentityHash);
    expect(second.terminalEvidenceHash).not.toBe(first.terminalEvidenceHash);
  });

  it('rejects stale terminal identity after tampering', () => {
    const evidence = createModeMatchRuntimeTerminalEvidenceV1({
      schemaVersion: 1,
      replay: replay(),
      modeDriverContentHash: 'a001a001',
    });
    expect(() => validateModeMatchRuntimeTerminalEvidenceV1({
      ...evidence,
      modeDriverContentHash: 'a002a002',
    })).toThrow(/identity重算/u);
  });
});

describe('ModeMatchRuntime terminal evidence V2', () => {
  it('binds an explicit empty supply waterline for non-Survival Replay', () => {
    const evidence = createModeMatchRuntimeTerminalEvidenceV2({
      schemaVersion: 2,
      replay: replay(),
      modeDriverContentHash: 'a001a001',
      supplyFacts: [],
      supplyFactStreamId: null,
      lastSupplyFactSequence: null,
      supplyFactCount: 0,
    });
    expect(validateModeMatchRuntimeTerminalEvidenceV2(evidence)).toEqual(evidence);
  });

  it('rejects a fact count or waterline that does not close the fact array', () => {
    const base = {
      schemaVersion: 2 as const,
      replay: replay(),
      modeDriverContentHash: 'a001a001',
      supplyFacts: [],
      supplyFactStreamId: null,
      lastSupplyFactSequence: null,
      supplyFactCount: 0,
    };
    expect(() => createModeMatchRuntimeTerminalEvidenceV2({
      ...base,
      supplyFactCount: 1,
    })).toThrow(/数量声明/u);
    expect(() => createModeMatchRuntimeTerminalEvidenceV2({
      ...base,
      supplyFactStreamId: 'illegal-non-survival-stream',
      lastSupplyFactSequence: 0,
    })).toThrow(/非Survival/u);
  });
});
