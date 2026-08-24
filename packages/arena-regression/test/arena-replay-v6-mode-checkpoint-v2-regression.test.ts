import { describe, expect, it } from 'vitest';
import {
  createArenaModeCheckpointV2,
  createArenaReplayV6,
} from '@number-strategy-jump/arena-match';
import {
  createArenaReplayV6ModeCheckpointV2RegressionCandidate,
  validateArenaReplayV6ModeCheckpointV2RegressionCandidate,
} from '../src/arena-replay-v6-mode-checkpoint-v2-regression.js';

type DataRecord = Record<string, unknown>;

function participant(
  participantId: string,
  controllerKind: 'human' | 'bot',
  characterDefinitionId = `character.${participantId}.test`,
): DataRecord {
  return {
    participantId,
    modeRole: 'competitor',
    teamId: null,
    controllerKind,
    characterDefinitionId,
    slotId: null,
    slotGeneration: 0,
  };
}

interface FixtureIdentityOptions {
  readonly contentHash?: string;
  readonly playerOneCharacterDefinitionId?: string;
}

function config(options: FixtureIdentityOptions = {}): DataRecord {
  const contentHash = options.contentHash ?? 'd001d001';
  return {
    schemaVersion: 6,
    modeDefinitionId: 'arena.mode.duel.test.v6',
    modeKind: 'duel',
    modePolicyContentHash: contentHash,
    participantAssignments: [
      participant(
        'player-1',
        'human',
        options.playerOneCharacterDefinitionId ?? 'character.player-1.test',
      ),
      participant('player-2', 'bot'),
    ],
  };
}

function inputFrame(tick: number, participantId: string): DataRecord {
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

function modeResult(): DataRecord {
  return {
    kind: 'duel',
    winnerParticipantIds: ['player-1'],
    isDraw: false,
    reason: 'last-participant-standing',
    endedAtTick: 1,
  };
}

function replayOptions(
  options: FixtureIdentityOptions & { readonly matchSeed?: number } = {},
): DataRecord {
  const matchConfig = config(options);
  const result = modeResult();
  return {
    replaySchemaVersion: 6,
    authoritySchemaVersion: 6,
    physicsBackendVersion: 'arena.physics.test.v1',
    modeDefinitionId: 'arena.mode.duel.test.v6',
    contentHash: options.contentHash ?? 'd001d001',
    matchSeed: options.matchSeed ?? 73,
    config: matchConfig,
    participantAssignments: matchConfig.participantAssignments,
    inputFrames: [
      inputFrame(0, 'player-1'), inputFrame(0, 'player-2'),
      inputFrame(1, 'player-1'), inputFrame(1, 'player-2'),
    ],
    checkpoints: [{ tick: 0, hash: '11111111' }, { tick: 2, hash: 'abcdef12' }],
    events: [{
      id: 'event-start', sequence: 0, tick: 0, type: 'MatchStarted',
      modeDefinitionId: 'arena.mode.duel.test.v6', participantIds: ['player-1', 'player-2'],
    }, {
      id: 'event-end', sequence: 1, tick: 1, type: 'MatchEnded',
      modeDefinitionId: 'arena.mode.duel.test.v6', modeResult: result,
    }],
    modeResult: result,
    finalHash: 'abcdef12',
  };
}

function checkpointOptions(
  tick: 0 | 2,
  options: {
    readonly matchSeed?: number;
    readonly phase?: 'preparing' | 'running';
    readonly eventSequence?: number;
  } & FixtureIdentityOptions,
): DataRecord {
  const matchConfig = config(options);
  const terminal = tick === 2;
  return {
    checkpointSchemaVersion: 2,
    matchSchemaVersion: 6,
    modeDefinitionId: 'arena.mode.duel.test.v6',
    contentHash: options.contentHash ?? 'd001d001',
    matchSeed: options.matchSeed ?? 73,
    config: matchConfig,
    participantAssignments: matchConfig.participantAssignments,
    tick,
    phase: terminal ? 'ended' : options.phase ?? 'preparing',
    eventSequence: options.eventSequence ?? (terminal ? 2 : 0),
    modeState: { kind: 'duel', suddenDeath: false },
    modeResult: terminal ? modeResult() : null,
    stateHash: terminal ? 'abcdef12' : '11111111',
  };
}

function run(options: {
  readonly initialPhase?: 'preparing' | 'running';
  readonly matchSeed?: number;
  readonly checkpointMatchSeed?: number;
  readonly contentHash?: string;
  readonly playerOneCharacterDefinitionId?: string;
} = {}): DataRecord {
  const checkpointOptionsValue = {
    matchSeed: options.checkpointMatchSeed ?? options.matchSeed ?? 73,
    phase: options.initialPhase ?? 'preparing',
    contentHash: options.contentHash ?? 'd001d001',
    playerOneCharacterDefinitionId:
      options.playerOneCharacterDefinitionId ?? 'character.player-1.test',
  } as const;
  return {
    replay: createArenaReplayV6(replayOptions(options)),
    modeCheckpoints: [
      createArenaModeCheckpointV2(checkpointOptions(0, checkpointOptionsValue)),
      createArenaModeCheckpointV2(checkpointOptions(2, checkpointOptionsValue)),
    ],
  };
}

function candidateOptions(firstRun = run(), secondRun = run()): DataRecord {
  return {
    schemaVersion: 1,
    id: 'arena.regression.duel-v6.seed-73.test',
    firstRun,
    secondRun,
  };
}

describe('Arena Replay V6 / Mode Checkpoint V2 deterministic regression candidate', () => {
  it('binds two complete runs to events, checkpoints, mode result and final identity', () => {
    const candidate = createArenaReplayV6ModeCheckpointV2RegressionCandidate(
      candidateOptions(),
    );
    expect(candidate).toMatchObject({
      schemaVersion: 1,
      id: 'arena.regression.duel-v6.seed-73.test',
      finalHash: 'abcdef12',
    });
    expect(candidate.firstRun.replay.events).toHaveLength(2);
    expect(candidate.firstRun.modeCheckpoints).toHaveLength(2);
    expect(candidate.replayIdentityHash).toBe(candidate.firstRun.replay.replayIdentityHash);
    expect(validateArenaReplayV6ModeCheckpointV2RegressionCandidate(candidate)).toEqual(candidate);
    expect(Object.isFrozen(candidate)).toBe(true);
    expect(Object.isFrozen(candidate.firstRun.modeCheckpoints)).toBe(true);
  });

  it('rejects Replay V6 event/result/final identity drift between equal-input runs', () => {
    const driftedReplay = replayOptions();
    (driftedReplay.events as DataRecord[])[1]!.id = 'event-end-drift';
    const secondRun = run();
    secondRun.replay = createArenaReplayV6(driftedReplay);
    expect(() => createArenaReplayV6ModeCheckpointV2RegressionCandidate(
      candidateOptions(run(), secondRun),
    )).toThrow(/确定性漂移/);
  });

  it('rejects full checkpoint sequence drift even when each checkpoint is individually valid', () => {
    expect(() => createArenaReplayV6ModeCheckpointV2RegressionCandidate(
      candidateOptions(run(), run({ initialPhase: 'running' })),
    )).toThrow(/Checkpoint V2 序列漂移/);
  });

  it('requires equal seed, config, finalized assignment and content before comparing runs', () => {
    expect(() => createArenaReplayV6ModeCheckpointV2RegressionCandidate(
      candidateOptions(run(), run({ matchSeed: 74 })),
    )).toThrow(/前提/);
    expect(() => createArenaReplayV6ModeCheckpointV2RegressionCandidate(
      candidateOptions(run(), run({ contentHash: 'd002d002' })),
    )).toThrow(/前提/);
    expect(() => createArenaReplayV6ModeCheckpointV2RegressionCandidate(
      candidateOptions(run(), run({
        playerOneCharacterDefinitionId: 'character.player-1.alternate.test',
      })),
    )).toThrow(/前提/);
  });

  it('fails closed when checkpoint restore seed/config identity does not match its Replay', () => {
    expect(() => createArenaReplayV6ModeCheckpointV2RegressionCandidate(
      candidateOptions(
        run({ checkpointMatchSeed: 74 }),
        run({ checkpointMatchSeed: 74 }),
      ),
    )).toThrow(/identity/);
  });

  it('rejects missing checkpoint mappings, event waterline drift and tampered result hash', () => {
    const missing = run();
    (missing.modeCheckpoints as unknown[]).pop();
    expect(() => createArenaReplayV6ModeCheckpointV2RegressionCandidate(
      candidateOptions(missing, run()),
    )).toThrow(/完整映射/);

    const waterline = run();
    (waterline.modeCheckpoints as DataRecord[])[1] = createArenaModeCheckpointV2(
      checkpointOptions(2, { eventSequence: 1 }),
    );
    expect(() => createArenaReplayV6ModeCheckpointV2RegressionCandidate(
      candidateOptions(waterline, run()),
    )).toThrow(/eventSequence/);

    const candidate = createArenaReplayV6ModeCheckpointV2RegressionCandidate(
      candidateOptions(),
    );
    expect(() => validateArenaReplayV6ModeCheckpointV2RegressionCandidate({
      ...candidate,
      resultHash: '00000000',
    })).toThrow(/resultHash/);
  });

  it('rejects future/unknown fields and accessors without publishing a candidate', () => {
    expect(() => createArenaReplayV6ModeCheckpointV2RegressionCandidate({
      ...candidateOptions(), schemaVersion: 2,
    })).toThrow(/schemaVersion/);
    expect(() => createArenaReplayV6ModeCheckpointV2RegressionCandidate({
      ...candidateOptions(), future: true,
    })).toThrow(/future/);

    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    let published: unknown = null;
    expect(() => {
      published = createArenaReplayV6ModeCheckpointV2RegressionCandidate(hostile);
    }).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);
    expect(published).toBeNull();
  });
});
