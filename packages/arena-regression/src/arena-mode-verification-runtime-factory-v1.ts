import {
  ACTION_RESOLUTION_KIND,
  ARENA_MATCH_EVENT_V6,
  assertKnownKeys,
  cloneFrozenData,
  createArenaMatchEventV6,
  createArenaSupplyCadenceSnapshotV1,
  createDeterministicDataHash,
  createMatchReadFrameV3Audit,
  createNeutralInputFrame,
  type ArenaInputFrame,
  type ArenaMatchEventV6,
  type DeepReadonly,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  MODE_MATCH_RUNTIME_V6_STATE,
  ModeMatchRuntimeV6,
  RACE_MODE_PREPARING_TICKS_V1,
  type ArenaMatchConfigV6,
  type ModeMatchResolutionV6,
  type ModeMatchWorldAuthorityV6,
  type RaceModeCommandV1,
  type SurvivalModeCommandV1,
} from '@number-strategy-jump/arena-match';
import { createArenaModeVerificationFixtureV1 } from './arena-mode-verification-fixture-v1.js';
import type {
  ArenaModeVerificationRunOutputV1,
  ArenaModeVerificationRunRequestV1,
  ArenaModeVerificationRuntimeFactoryV1,
} from './arena-mode-verification-runner-v1.js';

export const ARENA_MODE_VERIFICATION_RUNTIME_FACTORY_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const PHYSICS_BACKEND_VERSION = 'arena.p2.verification.no-render.v1';
const CHECKPOINT_INTERVAL_TICKS = 30;
const NO_SUPPLY_AUDIT = Object.freeze({
  worldSupplyEquipmentInstanceIds: Object.freeze([]),
  expectedWorldSupplyIdentities: Object.freeze([]),
});
const AUTHORITY_CHECKPOINT_KEYS = new Set([
  'schemaVersion', 'readFrame', 'readFrameAudit', 'stateHash', 'paused',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

type VerificationReplayV6 = ReturnType<ModeMatchRuntimeV6['exportReplayV6']>;
type VerificationModeCheckpointsV2 = ReturnType<
  ModeMatchRuntimeV6['exportModeCheckpointsV2']
>;

export interface ArenaModeVerificationMatchTraceV1 {
  readonly variant: 'continuous' | 'restored';
  readonly restoreFrameTick: number | null;
  readonly restoreCount: number;
  readonly executedTicks: number;
  readonly finalTick: number;
  readonly inputFrames: VerificationReplayV6['inputFrames'];
  readonly events: VerificationReplayV6['events'];
  readonly replay: VerificationReplayV6;
  readonly modeCheckpoints: VerificationModeCheckpointsV2;
  readonly modeResult: VerificationReplayV6['modeResult'];
  readonly authorityHash: string;
  readonly finalHash: string;
  readonly replacedRuntimeRetainedResourceCount: number | null;
  readonly retainedResourceCountAfterDestroy: number;
}

export interface ArenaModeVerificationContinuationPairV1 {
  readonly request: Readonly<ArenaModeVerificationRunRequestV1>;
  readonly continuous: Readonly<ArenaModeVerificationMatchTraceV1>;
  readonly restored: Readonly<ArenaModeVerificationMatchTraceV1>;
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function safelyWrapThrownError(value: unknown, message: string): Error {
  const error = new Error(message);
  Object.defineProperty(error, 'cause', {
    value,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return error;
}

function verificationSupplyCadence(
  config: ArenaMatchConfigV6,
  snapshotTick: number,
) {
  if (config.modeKind !== 'survival') return null;
  const intervalTicks = 1_200;
  const nextWaveIndex = snapshotTick === 0 ? 0 : Math.ceil(snapshotTick / intervalTicks);
  const nextSpawnTick = nextWaveIndex * intervalTicks;
  return createArenaSupplyCadenceSnapshotV1({
    schemaVersion: 1,
    modeDefinitionId: config.modeDefinitionId,
    supplyDefinitionId: 'arena.supply.verification.survival.v1',
    snapshotTick,
    nextWaveIndex,
    nextSpawnTick,
    remainingTicks: nextSpawnTick - snapshotTick,
    spawnCount: 3,
  });
}

function participant(assignment: ArenaMatchConfigV6['participantAssignments'][number]) {
  return Object.freeze({
    id: assignment.participantId,
    characterDefinitionId: assignment.characterDefinitionId,
    status: 'active',
    lives: 3,
    eliminations: 0,
    deaths: 0,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    respawnTicks: 0,
    lastHitBy: null,
    lastHitTick: -1,
    action: Object.freeze({
      definitionId: 'arena.action.verification.primary.test',
      phase: 'active',
      ticksRemaining: 1,
    }),
    actionRule: Object.freeze({ range: 2 }),
    movement: Object.freeze({
      schemaVersion: 2,
      participantId: assignment.participantId,
      characterDefinitionId: assignment.characterDefinitionId,
      mode: 'standard',
      coyoteTicksRemaining: 0,
      jumpBufferTicksRemaining: 0,
      airJumpsUsed: 0,
      crouchChargeTicks: 0,
      crouchActionId: null,
      downSmashActionId: null,
      revision: 0,
      grounded: true,
    }),
    equipment: null,
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
    velocity: Object.freeze({ x: 0, y: 0, z: 0 }),
    facing: Object.freeze({ x: 1, z: 0 }),
    grounded: true,
    supportSurfaceId: 'verification-main.test',
  });
}

function localSidecar(tick: number, eventSequence: number, participantId: string) {
  return Object.freeze({
    schemaVersion: 3,
    tick,
    eventSequence,
    participantId,
    profile: 'local-context-primary',
    primaryActionDefinitionId: 'arena.action.verification.primary.test',
    channels: Object.freeze({
      primary: Object.freeze({
        kind: ACTION_RESOLUTION_KIND.SELECTED,
        actionDefinitionId: 'arena.action.verification.primary.test',
        lane: 'primary',
        source: 'player-input',
        reason: 'selected',
      }),
      primaryHold: Object.freeze({
        kind: ACTION_RESOLUTION_KIND.NONE,
        actionDefinitionId: null,
        lane: null,
        source: null,
        reason: 'not-requested',
      }),
    }),
  });
}

function initialProjection(config: ArenaMatchConfigV6) {
  if (config.modeKind === 'duel') {
    return Object.freeze({
      schemaVersion: 1,
      modeDefinitionId: config.modeDefinitionId,
      revision: 0,
      preparationRemainingTicks: 1,
      state: Object.freeze({ kind: 'duel', suddenDeath: false }),
    });
  }
  if (config.modeKind === 'race') {
    return Object.freeze({
      schemaVersion: 1,
      modeDefinitionId: config.modeDefinitionId,
      revision: 0,
      preparationRemainingTicks: RACE_MODE_PREPARING_TICKS_V1,
      state: Object.freeze({
        kind: 'race',
        finishGateId: 'race-finish-gate.test',
        participants: Object.freeze(config.participantAssignments.map((entry, index) => (
          Object.freeze({
            participantId: entry.participantId,
            status: 'racing',
            safeAnchorId: `race-safe-anchor-${String(index + 1).padStart(2, '0')}.test`,
            progressOrdinal: 0,
            respawnReadyTick: null,
            finishTick: null,
            rank: null,
          })
        ))),
      }),
    });
  }
  const enemies = config.participantAssignments.filter(({ modeRole }) => modeRole === 'enemy');
  return Object.freeze({
    schemaVersion: 1,
    modeDefinitionId: config.modeDefinitionId,
    revision: 0,
    preparationRemainingTicks: null,
    state: Object.freeze({
      kind: 'survival',
      playerParticipantId: config.participantAssignments.find(({ modeRole }) => (
        modeRole === 'player'
      ))!.participantId,
      fallCount: 0,
      terminalFallCount: 2,
      survivedTicks: 0,
      pressureStage: 0,
      enemySlots: Object.freeze(enemies.map((entry) => Object.freeze({
        slotId: entry.slotId!,
        participantId: entry.participantId,
        active: false,
        generation: 0,
        anchorId: null,
      }))),
    }),
  });
}

interface FrameOptions {
  readonly config: ArenaMatchConfigV6;
  readonly localParticipantId: string;
  readonly matchSeed: number;
  readonly tick: number;
  readonly activeTick: number;
  readonly eventSequence: number;
  readonly modeProjection: MatchReadFrameV3['worldSnapshot']['modeProjection'];
  readonly modeResult: DeepReadonly<ModeResultV3Payload> | null;
  readonly terminalAuthorityTick: number;
}

function createFrame(options: FrameOptions): MatchReadFrameV3 {
  const preparing = options.modeProjection.preparationRemainingTicks !== null;
  return createMatchReadFrameV3Audit({
    schemaVersion: 3,
    worldSnapshot: {
      authoritySchemaVersion: 6,
      physicsBackendVersion: PHYSICS_BACKEND_VERSION,
      configHash: createDeterministicDataHash(options.config),
      ruleContentHash: options.config.modePolicyContentHash,
      matchSeed: options.matchSeed,
      tick: options.tick,
      activeTick: options.activeTick,
      phase: options.modeResult !== null ? 'ended' : preparing ? 'preparing' : 'running',
      remainingTicks: Math.max(0, options.terminalAuthorityTick - options.tick + 1),
      eventSequence: options.eventSequence,
      modeDefinitionId: options.config.modeDefinitionId,
      participants: options.config.participantAssignments.map(participant),
      equipment: [],
      activeSupplyProjection: null,
      modeProjection: options.modeProjection,
      map: {
        schemaVersion: 1,
        definitionId: 'arena.map.verification.no-render.test',
        nextActiveTick: options.tick + 1,
        revision: options.tick,
        surfaces: [{ id: 'verification-main.test', enabled: true, revision: 0 }],
        occurrences: [],
      },
      result: options.modeResult,
    },
    localActionSidecar: localSidecar(
      options.tick,
      options.eventSequence,
      options.localParticipantId,
    ),
  }, NO_SUPPLY_AUDIT);
}

function activeTick(modeKind: ArenaMatchConfigV6['modeKind'], authorityTick: number): number {
  return modeKind === 'race'
    ? Math.max(0, authorityTick - RACE_MODE_PREPARING_TICKS_V1)
    : authorityTick + 1;
}

function facts(
  request: Readonly<ArenaModeVerificationRunRequestV1>,
  config: ArenaMatchConfigV6,
  tick: number,
  terminalAuthorityTick: number,
): unknown {
  if (config.modeKind === 'duel') {
    return Object.freeze({
      phase: 'running',
      preparationRemainingTicks: null,
      result: tick < terminalAuthorityTick ? null : Object.freeze({
        winnerId: config.participantAssignments[0]!.participantId,
        reason: 'last-participant-standing',
        isDraw: false,
        endedAtTick: tick,
      }),
    });
  }
  if (config.modeKind === 'race') {
    const preparing = tick < RACE_MODE_PREPARING_TICKS_V1;
    const expectedPreparation = tick <= RACE_MODE_PREPARING_TICKS_V1
      ? RACE_MODE_PREPARING_TICKS_V1 - tick
      : null;
    const anchors = config.participantAssignments.map((_, index) => (
      `race-safe-anchor-${String(index + 1).padStart(2, '0')}.test`
    ));
    return Object.freeze({
      tick,
      activeTick: preparing ? null : tick - RACE_MODE_PREPARING_TICKS_V1,
      preparationRemainingTicks: expectedPreparation,
      validSafeAnchorIds: Object.freeze(anchors),
      safeAnchorClaims: tick === RACE_MODE_PREPARING_TICKS_V1
        ? Object.freeze([Object.freeze({
          participantId: config.participantAssignments[0]!.participantId,
          anchorId: anchors[0]!,
          progressOrdinal: 1,
        })])
        : Object.freeze([]),
      finishClaims: request.profile !== 'long-run' && tick === terminalAuthorityTick
        ? Object.freeze([Object.freeze({
          participantId: config.participantAssignments[0]!.participantId,
          finishGateId: 'race-finish-gate.test',
          progressOrdinal: 2,
        })])
        : Object.freeze([]),
      participantFalls: request.profile !== 'long-run'
        && tick === RACE_MODE_PREPARING_TICKS_V1 + 1
        ? Object.freeze([config.participantAssignments[0]!.participantId])
        : Object.freeze([]),
    });
  }
  const exerciseLifecycle = request.profile !== 'long-run';
  return Object.freeze({
    tick,
    activeTick: tick,
    playerFell: exerciseLifecycle && (tick === 1 || tick === terminalAuthorityTick),
    enemyFalls: exerciseLifecycle && tick === 1
      ? Object.freeze([config.participantAssignments.find(({ modeRole }) => (
        modeRole === 'enemy'
      ))!.participantId])
      : Object.freeze([]),
  });
}

function eventId(matchSeed: number, tick: number, sequence: number): string {
  return `verification:${matchSeed.toString(16)}:${tick}:${sequence}`;
}

function pushEvent(
  events: ArenaMatchEventV6[],
  matchSeed: number,
  tick: number,
  sequence: number,
  value: Record<string, unknown>,
): number {
  events.push(createArenaMatchEventV6({
    ...value,
    id: eventId(matchSeed, tick, sequence),
    sequence,
    tick,
  }));
  return sequence + 1;
}

function mapRaceCommands(
  commands: readonly unknown[],
  config: ArenaMatchConfigV6,
  matchSeed: number,
  tick: number,
  sequenceValue: number,
  events: ArenaMatchEventV6[],
): number {
  let sequence = sequenceValue;
  for (const command of commands as readonly RaceModeCommandV1[]) {
    if (command.kind === 'commit-safe-anchor') {
      sequence = pushEvent(events, matchSeed, tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED,
        modeDefinitionId: config.modeDefinitionId,
        participantId: command.participantId,
        anchorId: command.anchorId,
        progressOrdinal: command.progressOrdinal,
      });
    } else if (command.kind === 'record-finish-claim') {
      sequence = pushEvent(events, matchSeed, tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED,
        modeDefinitionId: config.modeDefinitionId,
        participantId: command.participantId,
        finishTick: command.finishTick,
        progressOrdinal: command.progressOrdinal,
      });
    } else if (command.kind === 'schedule-respawn') {
      sequence = pushEvent(events, matchSeed, tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED,
        modeDefinitionId: config.modeDefinitionId,
        participantId: command.participantId,
        modeRole: 'competitor',
        slotId: null,
        slotGeneration: 0,
        readyTick: command.readyTick,
        anchorId: command.anchorId,
        reason: 'race-fall',
      });
    } else if (command.kind === 'respawn-participant') {
      sequence = pushEvent(events, matchSeed, tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED,
        modeDefinitionId: config.modeDefinitionId,
        participantId: command.participantId,
        modeRole: 'competitor',
        slotId: null,
        slotGeneration: 0,
        anchorId: command.anchorId,
        invulnerableTicks: command.protectionTicks,
      });
    }
  }
  return sequence;
}

function mapSurvivalCommands(
  commands: readonly unknown[],
  config: ArenaMatchConfigV6,
  matchSeed: number,
  tick: number,
  sequenceValue: number,
  events: ArenaMatchEventV6[],
): number {
  let sequence = sequenceValue;
  for (const command of commands as readonly SurvivalModeCommandV1[]) {
    if (command.kind === 'count-player-fall') {
      sequence = pushEvent(events, matchSeed, tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED,
        modeDefinitionId: config.modeDefinitionId,
        participantId: command.participantId,
        fallCount: command.fallCount,
        terminalFallCount: command.terminalFallCount,
        terminal: command.terminal,
      });
    } else if (command.kind === 'schedule-player-respawn') {
      sequence = pushEvent(events, matchSeed, tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED,
        modeDefinitionId: config.modeDefinitionId,
        participantId: command.participantId,
        modeRole: 'player',
        slotId: null,
        slotGeneration: 0,
        readyTick: command.readyTick,
        anchorId: command.anchorId,
        reason: 'survival-first-fall',
      });
    } else if (command.kind === 'respawn-player') {
      sequence = pushEvent(events, matchSeed, tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED,
        modeDefinitionId: config.modeDefinitionId,
        participantId: command.participantId,
        modeRole: 'player',
        slotId: null,
        slotGeneration: 0,
        anchorId: command.anchorId,
        invulnerableTicks: command.protectionTicks,
      });
    } else if (command.kind === 'change-enemy-slot') {
      sequence = pushEvent(events, matchSeed, tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED,
        modeDefinitionId: config.modeDefinitionId,
        participantId: command.participantId,
        slotId: command.slotId,
        previousGeneration: command.previousGeneration,
        generation: command.generation,
        active: command.active,
        anchorId: command.anchorId,
        reason: command.reason,
      });
    }
  }
  return sequence;
}

class VerificationWorldAuthorityV1 implements ModeMatchWorldAuthorityV6 {
  readonly #request: Readonly<ArenaModeVerificationRunRequestV1>;
  readonly #config: ArenaMatchConfigV6;
  readonly #localParticipantId: string;
  readonly #terminalAuthorityTick: number;
  #readFrame: MatchReadFrameV3 | null = null;
  #readFrameAudit: MatchReadFrameV3AuditOptions | null = null;
  #stateHash: string | null = null;
  #paused = false;
  #destroyed = false;

  constructor(
    request: Readonly<ArenaModeVerificationRunRequestV1>,
    config: ArenaMatchConfigV6,
    localParticipantId: string,
    terminalAuthorityTick: number,
  ) {
    this.#request = request;
    this.#config = config;
    this.#localParticipantId = localParticipantId;
    this.#terminalAuthorityTick = terminalAuthorityTick;
  }

  #assertLive(): void {
    if (this.#destroyed) throw new Error('VerificationWorldAuthorityV1已销毁。');
  }

  #commitFrame(
    tick: number,
    eventSequence: number,
    projection: MatchReadFrameV3['worldSnapshot']['modeProjection'],
    result: DeepReadonly<ModeResultV3Payload> | null,
    inputFrames: readonly ArenaInputFrame[],
  ): void {
    this.#readFrame = createFrame({
      config: this.#config,
      localParticipantId: this.#localParticipantId,
      matchSeed: this.#request.matchSeed,
      tick,
      activeTick: activeTick(this.#config.modeKind, tick - 1),
      eventSequence,
      modeProjection: projection,
      modeResult: result,
      terminalAuthorityTick: this.#terminalAuthorityTick,
    });
    this.#readFrameAudit = NO_SUPPLY_AUDIT;
    this.#stateHash = createDeterministicDataHash({
      previousHash: this.#stateHash,
      inputFrames,
      worldSnapshot: this.#readFrame.worldSnapshot,
    }, 'Arena Mode verification authority state');
  }

  start(context: Readonly<{
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
  }>): unknown {
    this.#assertLive();
    if (this.#readFrame !== null || this.#paused) throw new Error('Verification authority只能启动一次。');
    if (
      context.expectedMatchSeed !== this.#request.matchSeed
      || context.localParticipantId !== this.#localParticipantId
      || !sameData(context.config, this.#config, 'Verification authority start config')
    ) throw new RangeError('Verification authority start身份漂移。');
    this.#readFrame = createFrame({
      config: this.#config,
      localParticipantId: this.#localParticipantId,
      matchSeed: this.#request.matchSeed,
      tick: 0,
      activeTick: 0,
      eventSequence: 0,
      modeProjection: initialProjection(this.#config),
      modeResult: null,
      terminalAuthorityTick: this.#terminalAuthorityTick,
    });
    this.#readFrameAudit = NO_SUPPLY_AUDIT;
    this.#stateHash = createDeterministicDataHash({
      matchSeed: this.#request.matchSeed,
      worldSnapshot: this.#readFrame.worldSnapshot,
    }, 'Arena Mode verification authority initial state');
    return Object.freeze({
      readFrame: this.#readFrame,
      readFrameAudit: this.#readFrameAudit,
      supplyCadence: verificationSupplyCadence(this.#config, 0),
      stateHash: this.#stateHash,
    });
  }

  step(request: Readonly<{
    readonly tick: number;
    readonly inputFrames: readonly ArenaInputFrame[];
    readonly resolveMode: (facts: unknown) => ModeMatchResolutionV6;
  }>): unknown {
    this.#assertLive();
    if (this.#paused || this.#readFrame === null || this.#stateHash === null) {
      throw new Error('Verification authority当前不可step。');
    }
    if (request.tick !== this.#readFrame.worldSnapshot.tick) {
      throw new RangeError('Verification authority tick与current frame不一致。');
    }
    const resolution = request.resolveMode(facts(
      this.#request,
      this.#config,
      request.tick,
      this.#terminalAuthorityTick,
    ));
    const events: ArenaMatchEventV6[] = [];
    let sequence = this.#readFrame.worldSnapshot.eventSequence;
    if (request.tick === 0) {
      sequence = pushEvent(events, this.#request.matchSeed, request.tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.MATCH_STARTED,
        modeDefinitionId: this.#config.modeDefinitionId,
        participantIds: this.#config.participantAssignments.map(({ participantId }) => participantId),
      });
    }
    if (
      this.#config.modeKind === 'race'
      && this.#request.profile !== 'long-run'
      && request.tick === RACE_MODE_PREPARING_TICKS_V1 + 1
    ) {
      sequence = pushEvent(events, this.#request.matchSeed, request.tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
        modeDefinitionId: this.#config.modeDefinitionId,
        participantId: this.#config.participantAssignments[0]!.participantId,
        modeRole: 'competitor',
        slotId: null,
        slotGeneration: 0,
        fallCause: 'movement',
        creditedAttackerId: null,
        supportSurfaceId: null,
      });
    }
    if (
      this.#config.modeKind === 'survival'
      && this.#request.profile !== 'long-run'
      && (request.tick === 1 || request.tick === this.#terminalAuthorityTick)
    ) {
      const player = this.#config.participantAssignments.find(({ modeRole }) => (
        modeRole === 'player'
      ))!;
      sequence = pushEvent(events, this.#request.matchSeed, request.tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
        modeDefinitionId: this.#config.modeDefinitionId,
        participantId: player.participantId,
        modeRole: 'player',
        slotId: null,
        slotGeneration: 0,
        fallCause: 'movement',
        creditedAttackerId: null,
        supportSurfaceId: null,
      });
      if (request.tick === 1) {
        const enemy = this.#config.participantAssignments.find(({ modeRole }) => (
          modeRole === 'enemy'
        ))!;
        sequence = pushEvent(events, this.#request.matchSeed, request.tick, sequence, {
          type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId: enemy.participantId,
          modeRole: 'enemy',
          slotId: enemy.slotId,
          slotGeneration: 0,
          fallCause: 'environment',
          creditedAttackerId: null,
          supportSurfaceId: null,
        });
      }
    }
    if (this.#config.modeKind === 'race') {
      sequence = mapRaceCommands(
        resolution.commands,
        this.#config,
        this.#request.matchSeed,
        request.tick,
        sequence,
        events,
      );
    } else if (this.#config.modeKind === 'survival') {
      sequence = mapSurvivalCommands(
        resolution.commands,
        this.#config,
        this.#request.matchSeed,
        request.tick,
        sequence,
        events,
      );
    }
    if (resolution.modeResult !== null) {
      sequence = pushEvent(events, this.#request.matchSeed, request.tick, sequence, {
        type: ARENA_MATCH_EVENT_V6.MATCH_ENDED,
        modeDefinitionId: this.#config.modeDefinitionId,
        modeResult: resolution.modeResult,
      });
    }
    this.#commitFrame(
      request.tick + 1,
      sequence,
      resolution.modeProjection,
      resolution.modeResult,
      request.inputFrames,
    );
    return Object.freeze({
      readFrame: this.#readFrame,
      readFrameAudit: this.#readFrameAudit,
      events: Object.freeze(events),
      supplyCadence: verificationSupplyCadence(this.#config, request.tick + 1),
      stateHash: this.#stateHash,
      appliedModeCommandHash: createDeterministicDataHash(
        resolution.commands,
        'Arena Mode verification applied commands',
      ),
    });
  }

  exportCheckpoint(): unknown {
    this.#assertLive();
    if (this.#readFrame === null || this.#readFrameAudit === null || this.#stateHash === null) {
      throw new Error('Verification authority尚无可导出的checkpoint。');
    }
    return cloneFrozenData({
      schemaVersion: 1,
      readFrame: this.#readFrame,
      readFrameAudit: this.#readFrameAudit,
      stateHash: this.#stateHash,
      paused: this.#paused,
    }, 'Verification authority checkpoint');
  }

  restore(request: Readonly<{
    readonly checkpoint: DeepReadonly<unknown>;
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
    readonly runtimeState: 'running' | 'paused';
  }>): unknown {
    this.#assertLive();
    if (this.#readFrame !== null) throw new Error('Verification authority恢复只能执行一次。');
    const source = cloneFrozenData(request.checkpoint, 'Verification authority checkpoint');
    assertKnownKeys(source, AUTHORITY_CHECKPOINT_KEYS, 'Verification authority checkpoint');
    for (const key of AUTHORITY_CHECKPOINT_KEYS) {
      if (!Object.hasOwn(source, key)) throw new TypeError(`Verification checkpoint缺少${key}。`);
    }
    if (source.schemaVersion !== 1 || typeof source.paused !== 'boolean') {
      throw new RangeError('Verification authority checkpoint schema/paused无效。');
    }
    if (
      request.expectedMatchSeed !== this.#request.matchSeed
      || request.localParticipantId !== this.#localParticipantId
      || request.runtimeState !== (source.paused ? 'paused' : 'running')
      || !sameData(request.config, this.#config, 'Verification authority restore config')
    ) throw new RangeError('Verification authority restore身份漂移。');
    const audit = source.readFrameAudit as MatchReadFrameV3AuditOptions;
    const frame = createMatchReadFrameV3Audit(source.readFrame, audit);
    if (
      frame.worldSnapshot.result !== null
      || frame.worldSnapshot.matchSeed !== this.#request.matchSeed
      || frame.worldSnapshot.configHash !== createDeterministicDataHash(this.#config)
      || frame.worldSnapshot.ruleContentHash !== this.#config.modePolicyContentHash
      || frame.worldSnapshot.modeDefinitionId !== this.#config.modeDefinitionId
      || frame.localActionSidecar.participantId !== this.#localParticipantId
      || frame.worldSnapshot.physicsBackendVersion !== PHYSICS_BACKEND_VERSION
      || frame.worldSnapshot.participants.length !== this.#config.participantAssignments.length
      || frame.worldSnapshot.participants.some((participantValue, index) => (
        participantValue.id !== this.#config.participantAssignments[index]!.participantId
      ))
      || typeof source.stateHash !== 'string'
      || !HASH_PATTERN.test(source.stateHash)
    ) throw new RangeError('Verification authority restored frame/hash身份无效。');
    this.#readFrame = frame;
    this.#readFrameAudit = audit;
    this.#stateHash = source.stateHash;
    this.#paused = source.paused;
    return Object.freeze({
      readFrame: frame,
      readFrameAudit: audit,
      supplyCadence: verificationSupplyCadence(this.#config, frame.worldSnapshot.tick),
      stateHash: source.stateHash,
    });
  }

  pause(): unknown {
    this.#assertLive();
    if (this.#paused || this.#readFrame === null) throw new Error('Verification authority不能暂停。');
    this.#paused = true;
    return undefined;
  }

  resume(): unknown {
    this.#assertLive();
    if (!this.#paused || this.#readFrame === null) throw new Error('Verification authority不能恢复。');
    this.#paused = false;
    return undefined;
  }

  destroy(): unknown {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#readFrame = null;
    this.#readFrameAudit = null;
    this.#stateHash = null;
  }
}

function assertExactDataEqual(
  left: unknown,
  right: unknown,
  path: string,
  visited = new WeakMap<object, object>(),
  active = new WeakSet<object>(),
): void {
  if (Object.is(left, right)) return;
  if (
    (typeof left !== 'object' || left === null)
    || (typeof right !== 'object' || right === null)
  ) throw new RangeError(`${path}逐字段身份漂移。`);
  const previous = visited.get(left);
  if (previous !== undefined) {
    if (active.has(left)) throw new TypeError(`${path}不得包含循环引用。`);
    if (previous !== right) throw new RangeError(`${path}对象图身份漂移。`);
    return;
  }
  visited.set(left, right);
  active.add(left);
  const leftIsArray = Array.isArray(left);
  const rightIsArray = Array.isArray(right);
  if (leftIsArray !== rightIsArray) throw new RangeError(`${path}容器类型漂移。`);
  const leftKeys = Reflect.ownKeys(left);
  const rightKeys = Reflect.ownKeys(right);
  if (
    leftKeys.some((key) => typeof key === 'symbol')
    || rightKeys.some((key) => typeof key === 'symbol')
    || leftKeys.length !== rightKeys.length
  ) throw new RangeError(`${path}exact-key身份漂移。`);
  for (let index = 0; index < leftKeys.length; index += 1) {
    const leftKey = leftKeys[index]!;
    const rightKey = rightKeys[index]!;
    if (leftKey !== rightKey) throw new RangeError(`${path}字段顺序漂移。`);
    const leftDescriptor = Object.getOwnPropertyDescriptor(left, leftKey);
    const rightDescriptor = Object.getOwnPropertyDescriptor(right, rightKey);
    if (
      leftDescriptor === undefined
      || rightDescriptor === undefined
      || !Object.hasOwn(leftDescriptor, 'value')
      || !Object.hasOwn(rightDescriptor, 'value')
      || leftDescriptor.enumerable !== rightDescriptor.enumerable
    ) throw new TypeError(`${path}.${String(leftKey)}必须是同构数据字段。`);
    assertExactDataEqual(
      leftDescriptor.value,
      rightDescriptor.value,
      `${path}.${String(leftKey)}`,
      visited,
      active,
    );
  }
  active.delete(left);
}

function destroyAndAssertReleased(runtime: ModeMatchRuntimeV6, name: string): number {
  const failures: Error[] = [];
  try {
    runtime.destroy();
  } catch (error) {
    failures.push(safelyWrapThrownError(error, `${name}首次destroy失败。`));
    try {
      runtime.destroy();
    } catch (retryError) {
      failures.push(safelyWrapThrownError(retryError, `${name} destroy retry失败。`));
    }
  }
  let retainedResourceCount = -1;
  try {
    retainedResourceCount = runtime.getRetainedResourceSnapshot().ownedResourceCount;
    if (retainedResourceCount !== 0) {
      throw new RangeError(`${name} destroy后仍保留${retainedResourceCount}项资源。`);
    }
  } catch (error) {
    failures.push(safelyWrapThrownError(error, `${name}资源归零复核失败。`));
  }
  if (failures.length > 0) throw new AggregateError(failures, `${name}清理失败。`);
  return retainedResourceCount;
}

function restoreFrameTick(
  request: Readonly<ArenaModeVerificationRunRequestV1>,
  modeKind: ArenaMatchConfigV6['modeKind'],
): number {
  if (request.profile === 'long-run') return Math.floor(request.runnerTickBudget / 2);
  if (modeKind === 'duel') return 0;
  return modeKind === 'race' ? 120 : 2;
}

function runMatchVariant(
  request: Readonly<ArenaModeVerificationRunRequestV1>,
  fixture: ReturnType<typeof createArenaModeVerificationFixtureV1>,
  variant: 'continuous' | 'restored',
): Readonly<ArenaModeVerificationMatchTraceV1> {
  const createAuthority = () => new VerificationWorldAuthorityV1(
    request,
    fixture.config,
    fixture.localParticipantId,
    fixture.terminalAuthorityTick,
  );
  let runtime = new ModeMatchRuntimeV6({
    checkpointIntervalTicks: CHECKPOINT_INTERVAL_TICKS,
    config: fixture.config,
    expectedMatchSeed: request.matchSeed,
    localParticipantId: fixture.localParticipantId,
    mode: fixture.mode,
    worldAuthority: createAuthority(),
  });
  let executedTicks = 0;
  let restoreCount = 0;
  const expectedRestoreFrameTick = variant === 'restored'
    ? restoreFrameTick(request, fixture.config.modeKind)
    : null;
  let replacedRuntimeRetainedResourceCount: number | null = null;
  let traceCore: Omit<
    ArenaModeVerificationMatchTraceV1,
    'retainedResourceCountAfterDestroy'
  > | null = null;
  let retainedResourceCountAfterDestroy: number | null = null;
  let primaryFailure: unknown = undefined;
  let hasPrimaryFailure = false;
  const restoreRuntime = (): void => {
    const checkpoint = runtime.exportRuntimeCheckpointV3();
    const previous = runtime;
    replacedRuntimeRetainedResourceCount = destroyAndAssertReleased(
      previous,
      'Arena Mode verification被替换runtime',
    );
    runtime = ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV3({
      checkpoint,
      mode: fixture.mode,
      worldAuthority: createAuthority(),
    });
    restoreCount += 1;
  };
  try {
    runtime.start();
    while (runtime.state === MODE_MATCH_RUNTIME_V6_STATE.RUNNING) {
      if (
        variant === 'restored'
        && restoreCount === 0
        && runtime.readFrame?.worldSnapshot.tick === expectedRestoreFrameTick
      ) restoreRuntime();
      if (executedTicks >= request.runnerTickBudget) {
        throw new RangeError('Arena Mode verification runtime超过预注册tick预算。');
      }
      const tick = runtime.readFrame!.worldSnapshot.tick;
      const inputs = fixture.config.participantAssignments.map(({ participantId }) => (
        createNeutralInputFrame(tick, participantId)
      ));
      runtime.step(inputs);
      executedTicks += 1;
    }
    if (runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Mode verification runtime未正常终局。');
    }
    if (restoreCount !== (variant === 'restored' ? 1 : 0)) {
      throw new Error(`Arena Mode verification ${variant}恢复次数漂移。`);
    }
    const replay = runtime.exportReplayV6();
    const modeCheckpoints = runtime.exportModeCheckpointsV2();
    const finalTick = runtime.readFrame?.worldSnapshot.tick;
    if (!Number.isSafeInteger(finalTick) || (finalTick as number) < 1) {
      throw new RangeError('Arena Mode verification终局tick无效。');
    }
    traceCore = Object.freeze({
      variant,
      restoreFrameTick: expectedRestoreFrameTick,
      restoreCount,
      executedTicks,
      finalTick: finalTick as number,
      inputFrames: replay.inputFrames,
      events: replay.events,
      replay,
      modeCheckpoints,
      modeResult: replay.modeResult,
      authorityHash: replay.finalHash,
      finalHash: replay.finalHash,
      replacedRuntimeRetainedResourceCount,
    });
  } catch (error) {
    primaryFailure = error;
    hasPrimaryFailure = true;
  } finally {
    try {
      retainedResourceCountAfterDestroy = destroyAndAssertReleased(
        runtime,
        `Arena Mode verification ${variant} match`,
      );
    } catch (cleanupError) {
      primaryFailure = hasPrimaryFailure
        ? new AggregateError([primaryFailure, cleanupError], `${variant}主错及清理错。`)
        : cleanupError;
      hasPrimaryFailure = true;
    }
  }
  if (hasPrimaryFailure) throw primaryFailure;
  if (traceCore === null || retainedResourceCountAfterDestroy === null) {
    throw new Error(`Arena Mode verification ${variant}未形成完整trace。`);
  }
  return Object.freeze({
    ...traceCore,
    retainedResourceCountAfterDestroy,
  });
}

export function assertArenaModeVerificationContinuationParityV1(
  value: Readonly<ArenaModeVerificationContinuationPairV1>,
): void {
  const { request, continuous, restored } = value;
  const expectedRestoreFrameTick = restoreFrameTick(request, request.modeKind);
  if (
    continuous.variant !== 'continuous'
    || continuous.restoreFrameTick !== null
    || continuous.restoreCount !== 0
    || continuous.replacedRuntimeRetainedResourceCount !== null
    || restored.variant !== 'restored'
    || restored.restoreFrameTick !== expectedRestoreFrameTick
    || restored.restoreCount !== 1
    || restored.replacedRuntimeRetainedResourceCount !== 0
    || continuous.retainedResourceCountAfterDestroy !== 0
    || restored.retainedResourceCountAfterDestroy !== 0
  ) throw new RangeError('Arena Mode verification continuation生命周期证据漂移。');
  if (continuous.executedTicks !== restored.executedTicks) {
    throw new RangeError('Arena Mode verification executedTicks漂移。');
  }
  if (continuous.finalTick !== restored.finalTick) {
    throw new RangeError('Arena Mode verification finalTick漂移。');
  }
  assertExactDataEqual(continuous.inputFrames, restored.inputFrames, 'continuation.inputFrames');
  assertExactDataEqual(continuous.events, restored.events, 'continuation.events');
  assertExactDataEqual(continuous.replay, restored.replay, 'continuation.replayV6');
  assertExactDataEqual(
    continuous.modeCheckpoints,
    restored.modeCheckpoints,
    'continuation.modeCheckpointsV2',
  );
  assertExactDataEqual(continuous.modeResult, restored.modeResult, 'continuation.modeResult');
  if (
    continuous.authorityHash !== restored.authorityHash
    || continuous.finalHash !== restored.finalHash
    || continuous.authorityHash !== continuous.finalHash
    || restored.authorityHash !== restored.finalHash
  ) throw new RangeError('Arena Mode verification authority/final hash漂移。');
}

export function createArenaModeVerificationContinuationPairV1(
  value: Readonly<ArenaModeVerificationRunRequestV1>,
): Readonly<ArenaModeVerificationContinuationPairV1> {
  const request = cloneFrozenData(
    value,
    'Arena Mode verification continuation request',
  ) as Readonly<ArenaModeVerificationRunRequestV1>;
  const fixture = createArenaModeVerificationFixtureV1(request);
  const pair = Object.freeze({
    request,
    continuous: runMatchVariant(request, fixture, 'continuous'),
    restored: runMatchVariant(request, fixture, 'restored'),
  });
  assertArenaModeVerificationContinuationParityV1(pair);
  return pair;
}

function runOneMatch(request: Readonly<ArenaModeVerificationRunRequestV1>) {
  const pair = createArenaModeVerificationContinuationPairV1(request);
  const restored = pair.restored;
  return Object.freeze({
    executedTicks: restored.executedTicks,
    authorityHash: restored.authorityHash,
    replayIdentityHash: createDeterministicDataHash(
      restored.replay,
      'verification replay identity',
    ),
    checkpointSequenceHash: createDeterministicDataHash(
      restored.modeCheckpoints,
      'verification checkpoint sequence',
    ),
    modeResultHash: createDeterministicDataHash(
      restored.modeResult,
      'verification mode result',
    ),
    finalHash: restored.finalHash,
  });
}

function aggregateRuns(
  request: Readonly<ArenaModeVerificationRunRequestV1>,
): Readonly<ArenaModeVerificationRunOutputV1> {
  const runs = Array.from({ length: request.rematchCount }, () => runOneMatch(request));
  const executedTicks = runs.reduce((sum, run) => sum + run.executedTicks, 0);
  const maximumTicksPerMatch = Math.max(...runs.map(({ executedTicks: ticks }) => ticks));
  const identity = Object.freeze(runs.map((run) => Object.freeze({
    authorityHash: run.authorityHash,
    replayIdentityHash: run.replayIdentityHash,
    checkpointSequenceHash: run.checkpointSequenceHash,
    modeResultHash: run.modeResultHash,
    finalHash: run.finalHash,
  })));
  return Object.freeze({
    executedTicks,
    maximumTicksPerMatch,
    completedRematches: runs.length,
    authorityHash: createDeterministicDataHash(
      identity.map(({ authorityHash }) => authorityHash),
      'verification aggregate authority',
    ),
    replayIdentityHash: createDeterministicDataHash(
      identity.map(({ replayIdentityHash }) => replayIdentityHash),
      'verification aggregate replay',
    ),
    checkpointSequenceHash: createDeterministicDataHash(
      identity.map(({ checkpointSequenceHash }) => checkpointSequenceHash),
      'verification aggregate checkpoints',
    ),
    modeResultHash: createDeterministicDataHash(
      identity.map(({ modeResultHash }) => modeResultHash),
      'verification aggregate results',
    ),
    finalHash: createDeterministicDataHash(identity, 'verification aggregate final'),
  });
}

export function createArenaModeVerificationRuntimeFactoryV1():
ArenaModeVerificationRuntimeFactoryV1 {
  return (value) => {
    const request = cloneFrozenData(
      value,
      'Arena Mode verification runtime factory request',
    ) as Readonly<ArenaModeVerificationRunRequestV1>;
    createArenaModeVerificationFixtureV1(request);
    let state: 'created' | 'running' | 'ended' | 'failed' | 'destroyed' = 'created';
    return Object.freeze({
      run() {
        if (state !== 'created') throw new Error(`Verification runtime状态${state}不能run。`);
        state = 'running';
        try {
          const output = aggregateRuns(request);
          state = 'ended';
          return output;
        } catch (error) {
          state = 'failed';
          throw error;
        }
      },
      destroy() { state = 'destroyed'; },
      getRetainedResourceCount() { return 0; },
    });
  };
}
