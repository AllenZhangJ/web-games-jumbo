import { describe, expect, it } from 'vitest';
import {
  createFinalizedMatchAssignmentV2,
  createMatchContentSelectionV2,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaReplayV6,
  createModeMatchRuntimeTerminalEvidenceV1,
  createModeMatchRuntimeTerminalEvidenceV2,
  type ArenaReplayV6,
} from '@number-strategy-jump/arena-match';
import { createProductMatchResultV3 } from '@number-strategy-jump/arena-product-contracts';
import {
  ArenaV2ProductAuthorityRegistryCandidateV1,
  createProductResultReplaySettlementEvidenceV1,
  createProductResultRuntimeSettlementEvidenceV2,
  createProductResultRuntimeSettlementEvidenceV3,
  validateProductResultReplaySettlementEvidenceV1,
  validateProductResultRuntimeSettlementEvidenceV2,
  validateProductResultRuntimeSettlementEvidenceV3,
} from '../src/index.js';

const MODE_DEFINITION_ID = 'arena.mode.duel.settlement.test.v1';

function participant(
  participantId: string,
  controllerKind: 'human' | 'bot',
  characterDefinitionId: string,
) {
  return {
    participantId,
    modeRole: 'competitor',
    teamId: null,
    controllerKind,
    characterDefinitionId,
    slotId: null,
    slotGeneration: 0,
  } as const;
}

function inputFrame(tick: number, participantId: string) {
  return {
    tick,
    participantId,
    moveX: 0,
    moveZ: 0,
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  };
}

function duelResult() {
  return {
    kind: 'duel',
    winnerParticipantIds: [],
    isDraw: true,
    reason: 'timeout-draw',
    endedAtTick: 1,
  } as const;
}

function replay(terminalEventId = 'event-end'): ArenaReplayV6 {
  const participants = [
    participant('p1', 'human', 'fighter-a'),
    participant('p2', 'bot', 'fighter-b'),
  ];
  const result = duelResult();
  return createArenaReplayV6({
    replaySchemaVersion: 6,
    authoritySchemaVersion: 6,
    physicsBackendVersion: 'arena.physics.settlement.test.v1',
    modeDefinitionId: MODE_DEFINITION_ID,
    contentHash: 'd001d001',
    matchSeed: 73,
    config: {
      schemaVersion: 6,
      modeDefinitionId: MODE_DEFINITION_ID,
      modeKind: 'duel',
      modePolicyContentHash: 'd001d001',
      participantAssignments: participants,
    },
    participantAssignments: participants,
    inputFrames: [
      inputFrame(0, 'p1'),
      inputFrame(0, 'p2'),
      inputFrame(1, 'p1'),
      inputFrame(1, 'p2'),
    ],
    checkpoints: [
      { tick: 0, hash: '11111111' },
      { tick: 2, hash: 'abcdef12' },
    ],
    events: [
      {
        id: 'event-start',
        sequence: 0,
        tick: 0,
        type: 'MatchStarted',
        modeDefinitionId: MODE_DEFINITION_ID,
        participantIds: ['p1', 'p2'],
      },
      {
        id: terminalEventId,
        sequence: 1,
        tick: 1,
        type: 'MatchEnded',
        modeDefinitionId: MODE_DEFINITION_ID,
        modeResult: result,
      },
    ],
    modeResult: result,
    finalHash: 'abcdef12',
  });
}

function productResult(
  authorityReplay: ArenaReplayV6,
  options: Readonly<{
    p1Character?: string;
    equipmentDefinitionIds?: readonly string[];
    p1Usage?: readonly string[];
    contentDefinitionId?: string;
  }> = {},
) {
  const p1Character = options.p1Character ?? 'fighter-a';
  const equipmentDefinitionIds = options.equipmentDefinitionIds ?? [];
  const content = createMatchContentSelectionV2({
    schemaVersion: 2,
    modeDefinitionId: MODE_DEFINITION_ID,
    contentDefinitionId:
      options.contentDefinitionId ?? 'arena.content.duel.settlement.test.v1',
    contentVersion: 1,
    characterDefinitionIds: [...new Set([p1Character, 'fighter-b'])].sort(),
    equipmentDefinitionIds,
    mapDefinitionIds: ['map-duel'],
    selectedMapDefinitionId: 'map-duel',
    participantCharacters: [
      { participantId: 'p1', definitionId: p1Character },
      { participantId: 'p2', definitionId: 'fighter-b' },
    ],
  });
  return createProductMatchResultV3({
    schemaVersion: 3,
    modeDefinitionId: MODE_DEFINITION_ID,
    matchSeed: authorityReplay.matchSeed,
    authorityIdentity: {
      replaySchemaVersion: 6,
      ruleSchemaVersion: 6,
      physicsBackendVersion: authorityReplay.physicsBackendVersion,
      configHash: authorityReplay.configHash,
      ruleContentHash: authorityReplay.contentHash,
      finalHash: authorityReplay.finalHash,
    },
    content,
    participantAssignments: [
      {
        participantId: 'p1', modeRole: 'competitor', teamId: null,
        slotId: null, slotGeneration: 0,
      },
      {
        participantId: 'p2', modeRole: 'competitor', teamId: null,
        slotId: null, slotGeneration: 0,
      },
    ],
    participantEquipmentUsage: [
      {
        participantId: 'p1',
        usedCollectionEquipmentDefinitionIds: options.p1Usage ?? [],
      },
      { participantId: 'p2', usedCollectionEquipmentDefinitionIds: [] },
    ],
    modeResult: authorityReplay.modeResult,
    publicParticipants: [
      {
        participantId: 'p1', displayName: 'Player 1', portraitKey: 'portrait.1',
        appearanceKey: 'appearance.1', identityOrdinal: 1,
        identityGlyphKey: 'glyph.1', identityPatternKey: 'pattern.1',
      },
      {
        participantId: 'p2', displayName: 'Player 2', portraitKey: 'portrait.2',
        appearanceKey: 'appearance.2', identityOrdinal: 2,
        identityGlyphKey: 'glyph.2', identityPatternKey: 'pattern.2',
      },
    ],
  });
}

function authorityRegistry() {
  return new ArenaV2ProductAuthorityRegistryCandidateV1({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    modeRegistryContentHash: 'a1b2c3d4',
    authorities: [
      {
        modeKind: 'duel',
        modeDefinitionId: MODE_DEFINITION_ID,
        replaySchemaVersion: 6,
        ruleSchemaVersion: 6,
        physicsBackendVersion: 'arena.physics.settlement.test.v1',
      },
      {
        modeKind: 'race',
        modeDefinitionId: 'arena.mode.race.settlement.test.v1',
        replaySchemaVersion: 6,
        ruleSchemaVersion: 6,
        physicsBackendVersion: 'arena.physics.race.settlement.test.v1',
      },
      {
        modeKind: 'survival',
        modeDefinitionId: 'arena.mode.survival.settlement.test.v1',
        replaySchemaVersion: 6,
        ruleSchemaVersion: 6,
        physicsBackendVersion: 'arena.physics.survival.settlement.test.v1',
      },
    ],
  });
}

function finalAssignment(authorityReplay: ArenaReplayV6, contentHash: string) {
  return createFinalizedMatchAssignmentV2({
    schemaVersion: 2,
    modeDefinitionId: MODE_DEFINITION_ID,
    contentHash,
    participants: authorityReplay.participantAssignments,
  });
}

describe('Product Result + Replay V6 settlement evidence V1', () => {
  it('binds Result terminal authority to one complete Replay identity', () => {
    const authorityReplay = replay();
    const result = productResult(authorityReplay);
    const evidence = createProductResultReplaySettlementEvidenceV1({
      schemaVersion: 1,
      result,
      replay: authorityReplay,
    });
    expect(evidence).toMatchObject({
      resultAuthorityHash: result.authorityHash,
      replayIdentityHash: authorityReplay.replayIdentityHash,
    });
    expect(validateProductResultReplaySettlementEvidenceV1(evidence)).toEqual(evidence);
  });

  it('rejects character and equipment-usage drift before settlement', () => {
    const authorityReplay = replay();
    expect(() => createProductResultReplaySettlementEvidenceV1({
      schemaVersion: 1,
      result: productResult(authorityReplay, { p1Character: 'fighter-c' }),
      replay: authorityReplay,
    })).toThrow(/参与者、角色或slot/u);
    expect(() => createProductResultReplaySettlementEvidenceV1({
      schemaVersion: 1,
      result: productResult(authorityReplay, {
        equipmentDefinitionIds: ['weapon-a'],
        p1Usage: ['weapon-a'],
      }),
      replay: authorityReplay,
    })).toThrow(/武器使用摘要/u);
  });

  it('distinguishes complete Replay identities with the same terminal Result', () => {
    const firstReplay = replay();
    const secondReplay = replay('event-end-alternate');
    const result = productResult(firstReplay);
    const first = createProductResultReplaySettlementEvidenceV1({
      schemaVersion: 1,
      result,
      replay: firstReplay,
    });
    const second = createProductResultReplaySettlementEvidenceV1({
      schemaVersion: 1,
      result,
      replay: secondReplay,
    });
    expect(second.replayIdentityHash).not.toBe(first.replayIdentityHash);
    expect(second.settlementEvidenceHash).not.toBe(first.settlementEvidenceHash);
  });

  it('rejects a stale settlement identity after caller tampering', () => {
    const authorityReplay = replay();
    const evidence = createProductResultReplaySettlementEvidenceV1({
      schemaVersion: 1,
      result: productResult(authorityReplay),
      replay: authorityReplay,
    });
    expect(() => validateProductResultReplaySettlementEvidenceV1({
      ...evidence,
      settlementEvidenceHash: '00000000',
    })).toThrow(/identity重算/u);
  });

  it('binds one Mode Registry admission to Result and complete Replay settlement', () => {
    const registry = authorityRegistry();
    const authorityReplay = replay();
    const result = productResult(authorityReplay, {
      contentDefinitionId:
        'arena.content.duel.settlement.test.v1.mode-registry-a1b2c3d4',
    });
    const admission = registry.admitMatch({
      modeKind: 'duel',
      modeDefinitionId: MODE_DEFINITION_ID,
      matchSeed: authorityReplay.matchSeed,
      content: result.content,
      finalAssignment: finalAssignment(authorityReplay, result.content.contentHash),
    });
    const settlementEvidence = createProductResultReplaySettlementEvidenceV1({
      schemaVersion: 1,
      result,
      replay: authorityReplay,
    });
    const registered = registry.createRegisteredSettlementEvidence({
      admission,
      settlementEvidence,
    });
    expect(registered).toMatchObject({
      authorityRegistryIdentityHash: registry.registryIdentityHash,
      authorityAdmissionHash: admission.admissionHash,
    });
    expect(registry.validateRegisteredSettlementEvidence(registered)).toEqual(registered);
  });

  it('rejects wrong Registry suffix, stable backend drift and per-match admission drift', () => {
    const registry = authorityRegistry();
    const authorityReplay = replay();
    const unboundResult = productResult(authorityReplay);
    expect(() => registry.admitMatch({
      modeKind: 'duel',
      modeDefinitionId: MODE_DEFINITION_ID,
      matchSeed: authorityReplay.matchSeed,
      content: unboundResult.content,
      finalAssignment: finalAssignment(authorityReplay, unboundResult.content.contentHash),
    })).toThrow(/Mode Registry内容身份/u);

    const result = productResult(authorityReplay, {
      contentDefinitionId:
        'arena.content.duel.settlement.test.v1.mode-registry-a1b2c3d4',
    });
    const admission = registry.admitMatch({
      modeKind: 'duel',
      modeDefinitionId: MODE_DEFINITION_ID,
      matchSeed: authorityReplay.matchSeed,
      content: result.content,
      finalAssignment: finalAssignment(authorityReplay, result.content.contentHash),
    });
    expect(() => registry.admitMatch({
      modeKind: 'duel',
      modeDefinitionId: MODE_DEFINITION_ID,
      matchSeed: authorityReplay.matchSeed,
      content: result.content,
      finalAssignment: createFinalizedMatchAssignmentV2({
        schemaVersion: 2,
        modeDefinitionId: MODE_DEFINITION_ID,
        contentHash: result.content.contentHash,
        participants: authorityReplay.participantAssignments.map((participant) => (
          participant.participantId === 'p1'
            ? { ...participant, characterDefinitionId: 'fighter-c' }
            : participant
        )),
      }),
    })).toThrow(/参与者分配与内容角色/u);
    expect(() => registry.validateAdmission({
      ...admission,
      physicsBackendVersion: 'arena.physics.drift.test.v1',
    })).toThrow(/Registry不一致|hash重算/u);
    expect(() => registry.createRegisteredSettlementEvidence({
      admission: { ...admission, matchSeed: admission.matchSeed + 1 },
      settlementEvidence: createProductResultReplaySettlementEvidenceV1({
        schemaVersion: 1,
        result,
        replay: authorityReplay,
      }),
    })).toThrow(/hash重算|准入身份/u);
  });
});

describe('Product Result + Runtime terminal settlement evidence V2', () => {
  it('binds Result, Replay and concrete Mode Driver into one identity', () => {
    const authorityReplay = replay();
    const result = productResult(authorityReplay);
    const runtimeEvidence = createModeMatchRuntimeTerminalEvidenceV1({
      schemaVersion: 1,
      replay: authorityReplay,
      modeDriverContentHash: 'a001a001',
    });
    const evidence = createProductResultRuntimeSettlementEvidenceV2({
      schemaVersion: 2,
      result,
      runtimeTerminalEvidence: runtimeEvidence,
    });
    expect(evidence).toMatchObject({
      resultAuthorityHash: result.authorityHash,
      replayIdentityHash: authorityReplay.replayIdentityHash,
      modeDriverContentHash: 'a001a001',
      runtimeTerminalEvidenceHash: runtimeEvidence.terminalEvidenceHash,
    });
    expect(validateProductResultRuntimeSettlementEvidenceV2(evidence)).toEqual(evidence);
  });

  it('rejects Mode Driver identity tampering that Replay V6 alone cannot see', () => {
    const authorityReplay = replay();
    const evidence = createProductResultRuntimeSettlementEvidenceV2({
      schemaVersion: 2,
      result: productResult(authorityReplay),
      runtimeTerminalEvidence: createModeMatchRuntimeTerminalEvidenceV1({
        schemaVersion: 1,
        replay: authorityReplay,
        modeDriverContentHash: 'a001a001',
      }),
    });
    expect(() => validateProductResultRuntimeSettlementEvidenceV2({
      ...evidence,
      modeDriverContentHash: 'a002a002',
    })).toThrow(/Runtime终局identity|identity重算/u);
  });

  it('registers the V2 settlement against the same opening admission', () => {
    const registry = authorityRegistry();
    const authorityReplay = replay();
    const result = productResult(authorityReplay, {
      contentDefinitionId:
        'arena.content.duel.settlement.test.v1.mode-registry-a1b2c3d4',
    });
    const admission = registry.admitMatchV2({
      modeKind: 'duel',
      modeDefinitionId: MODE_DEFINITION_ID,
      matchSeed: authorityReplay.matchSeed,
      content: result.content,
      finalAssignment: finalAssignment(authorityReplay, result.content.contentHash),
      modeDriverContentHash: 'a001a001',
    });
    const settlementEvidence = createProductResultRuntimeSettlementEvidenceV2({
      schemaVersion: 2,
      result,
      runtimeTerminalEvidence: createModeMatchRuntimeTerminalEvidenceV1({
        schemaVersion: 1,
        replay: authorityReplay,
        modeDriverContentHash: 'a001a001',
      }),
    });
    const registered = registry.createRegisteredSettlementEvidenceV2({
      admission,
      settlementEvidence,
    });
    expect(registry.validateRegisteredSettlementEvidenceV2(registered)).toEqual(registered);
    expect(() => registry.createRegisteredSettlementEvidenceV2({
      admission: registry.admitMatchV2({
        modeKind: 'duel',
        modeDefinitionId: MODE_DEFINITION_ID,
        matchSeed: authorityReplay.matchSeed,
        content: result.content,
        finalAssignment: finalAssignment(authorityReplay, result.content.contentHash),
        modeDriverContentHash: 'a002a002',
      }),
      settlementEvidence,
    })).toThrow(/准入身份/u);
  });
});

describe('Product Result + complete supply Runtime settlement evidence V3', () => {
  it('binds explicit supply waterline and registers against Admission V2', () => {
    const registry = authorityRegistry();
    const authorityReplay = replay();
    const result = productResult(authorityReplay, {
      contentDefinitionId:
        'arena.content.duel.settlement.test.v1.mode-registry-a1b2c3d4',
    });
    const runtimeEvidence = createModeMatchRuntimeTerminalEvidenceV2({
      schemaVersion: 2,
      replay: authorityReplay,
      modeDriverContentHash: 'a001a001',
      supplyFacts: [],
      supplyFactStreamId: null,
      lastSupplyFactSequence: null,
      supplyFactCount: 0,
    });
    const settlementEvidence = createProductResultRuntimeSettlementEvidenceV3({
      schemaVersion: 3,
      result,
      runtimeTerminalEvidence: runtimeEvidence,
    });
    expect(validateProductResultRuntimeSettlementEvidenceV3(settlementEvidence))
      .toEqual(settlementEvidence);
    const admission = registry.admitMatchV2({
      modeKind: 'duel',
      modeDefinitionId: MODE_DEFINITION_ID,
      matchSeed: authorityReplay.matchSeed,
      content: result.content,
      finalAssignment: finalAssignment(authorityReplay, result.content.contentHash),
      modeDriverContentHash: 'a001a001',
    });
    const registered = registry.createRegisteredSettlementEvidenceV3({
      admission,
      settlementEvidence,
    });
    expect(registry.validateRegisteredSettlementEvidenceV3(registered)).toEqual(registered);
  });

  it('rejects stale supply identity declarations', () => {
    const authorityReplay = replay();
    const evidence = createProductResultRuntimeSettlementEvidenceV3({
      schemaVersion: 3,
      result: productResult(authorityReplay),
      runtimeTerminalEvidence: createModeMatchRuntimeTerminalEvidenceV2({
        schemaVersion: 2,
        replay: authorityReplay,
        modeDriverContentHash: 'a001a001',
        supplyFacts: [],
        supplyFactStreamId: null,
        lastSupplyFactSequence: null,
        supplyFactCount: 0,
      }),
    });
    expect(() => validateProductResultRuntimeSettlementEvidenceV3({
      ...evidence,
      supplyFactCount: 1,
    })).toThrow(/数量声明|供给终局identity/u);
  });
});
