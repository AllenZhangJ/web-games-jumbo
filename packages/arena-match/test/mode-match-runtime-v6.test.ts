import { describe, expect, it } from 'vitest';
import {
  ACTION_RESOLUTION_KIND,
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_READ_PROFILE,
  createArenaMatchEventV6,
  createArenaLocalJumpAvailabilityV1,
  createArenaSupplyAuthorityFactV1,
  createDeterministicDataHash,
  createMatchReadFrameV3Audit,
  createNeutralInputFrame,
  type ArenaInputFrame,
  type ArenaModeProjectionV1,
  type MatchReadFrameV3,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  MODE_MATCH_RUNTIME_V6_STATE,
  ModeMatchRuntimeV6,
  type ModeMatchRuntimeV6ModeOptions,
  type ModeMatchRuntimeV6StepOutcome,
  type ModeMatchResolutionV6,
} from '../src/mode-match-runtime-v6.js';
import {
  createModeMatchRuntimeCheckpointV2,
} from '../src/mode-match-runtime-checkpoint-v2.js';
import { createArenaMatchConfigV6 } from '../src/match-config-v6.js';
import {
  RACE_MODE_PREPARING_TICKS_V1,
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
} from '../src/race-mode-system.js';
import { SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1 } from '../src/survival-mode-system.js';

type DataRecord = Record<string, unknown>;
type ModeKind = 'duel' | 'race' | 'survival';

const MATCH_SEED = 7;
const NO_SUPPLY = Object.freeze({
  worldSupplyEquipmentInstanceIds: Object.freeze([]),
  expectedWorldSupplyIdentities: Object.freeze([]),
});

function failureCause(operation: () => unknown): Error {
  let thrown: unknown;
  try {
    operation();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(Error);
  const descriptor = Object.getOwnPropertyDescriptor(thrown as object, 'cause');
  expect(descriptor).toBeDefined();
  expect(descriptor).toHaveProperty('value');
  expect(descriptor?.value).toBeInstanceOf(Error);
  return descriptor?.value as Error;
}

function assignment(
  participantId: string,
  modeRole: 'competitor' | 'player' | 'enemy',
  controllerKind: 'human' | 'bot',
  slotId: string | null = null,
) {
  return {
    participantId,
    modeRole,
    teamId: modeRole === 'competitor' ? null : `team.${modeRole}.test`,
    controllerKind,
    characterDefinitionId: `character.${participantId}.test`,
    slotId,
    slotGeneration: 0,
  };
}

function config(kind: ModeKind): DataRecord {
  const modeDefinitionId = `arena.mode.${kind}.runtime.test.v6`;
  return {
    schemaVersion: 6,
    modeDefinitionId,
    modeKind: kind,
    modePolicyContentHash: kind === 'duel' ? 'd001d001'
      : kind === 'race' ? 'ace0ace0' : '51515151',
    participantAssignments: kind === 'duel'
      ? [assignment('player-2', 'competitor', 'bot'), assignment('player-1', 'competitor', 'human')]
      : kind === 'race'
        ? [assignment('racer-2', 'competitor', 'bot'), assignment('racer-1', 'competitor', 'human')]
        : [
          assignment('player-1', 'player', 'human'),
          assignment('enemy-2', 'enemy', 'bot', 'enemy-slot-2.test'),
          assignment('enemy-1', 'enemy', 'bot', 'enemy-slot-1.test'),
        ],
  };
}

function duelBundle(): DataRecord {
  return {
    schemaVersion: 1,
    modeDefinitionId: 'arena.mode.duel.runtime.test.v6',
    modeKind: 'duel',
    contentHash: 'd001d001',
    participant: {
      definitionId: 'arena.mode.duel.participant.runtime.test.v1',
      minimumParticipants: 2,
      maximumParticipants: 2,
      roles: [{
        modeRole: 'competitor', minimumCount: 2, maximumCount: 2,
        allowedControllerKinds: ['human', 'bot'], teamId: null, slotIds: [],
      }],
      controllerKindBounds: [
        { controllerKind: 'human', minimumCount: 1, maximumCount: 1 },
        { controllerKind: 'bot', minimumCount: 1, maximumCount: 1 },
      ],
    },
    elimination: {
      definitionId: 'arena.mode.duel.elimination.runtime.test.v1',
      roleDispositions: [{ modeRole: 'competitor', fallDisposition: 'eliminate' }],
    },
    respawn: {
      definitionId: 'arena.mode.duel.respawn.runtime.test.v1',
      rolePolicies: [{
        modeRole: 'competitor', enabled: false, delayTicks: 0, maximumRespawns: 0,
        anchorPolicy: { kind: 'disabled', anchorCapabilityId: null }, protectionTicks: 0,
      }],
    },
    relationship: {
      definitionId: 'arena.mode.duel.relationship.runtime.test.v1',
      selfTargeting: 'forbidden',
      relations: [{
        sourceRole: 'competitor', targetRole: 'competitor', relationship: 'hostile',
      }],
    },
  };
}

function raceFixture(): DataRecord {
  return {
    schemaVersion: 1,
    fixtureDefinitionId: 'arena.mode.race.runtime.test.v1',
    preparingTicks: RACE_MODE_PREPARING_TICKS_V1,
    respawnDelayTicks: RACE_MODE_RESPAWN_DELAY_TICKS_V1,
    respawnProtectionTicks: 12,
    hardLimitActiveTicks: 1,
    finishGateId: 'race-finish-gate.test',
    safeAnchorIds: ['safe-anchor-1.test', 'safe-anchor-2.test'],
    fallbackSafeAnchorId: 'safe-anchor-1.test',
    initialSafeAnchors: [
      { participantId: 'racer-1', anchorId: 'safe-anchor-1.test' },
      { participantId: 'racer-2', anchorId: 'safe-anchor-2.test' },
    ],
  };
}

function survivalFixture(): DataRecord {
  return {
    schemaVersion: 1,
    fixtureDefinitionId: 'arena.mode.survival.runtime.test.v1',
    terminalPlayerFallCount: SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1,
    playerRespawnDelayTicks: 2,
    playerRespawnProtectionTicks: 10,
    playerRespawnAnchorId: 'survival-player-anchor.test',
    hardLimitActiveTicks: 1,
    pressurePolicyDefinitionId: 'arena.survival.pressure.runtime.test.v1',
    tierPolicyDefinitionId: 'arena.survival.tier.runtime.test.v1',
    slotActivationOrder: ['enemy-slot-1.test', 'enemy-slot-2.test'],
    slotEntries: [
      { slotId: 'enemy-slot-1.test', participantId: 'enemy-1', anchorId: 'enemy-anchor-1.test' },
      { slotId: 'enemy-slot-2.test', participantId: 'enemy-2', anchorId: 'enemy-anchor-2.test' },
    ],
    pressureStages: [{
      stage: 0, startActiveTick: 0, desiredActiveEnemySlots: 1, reactivationDelayTicks: 2,
    }],
    equipmentTiers: [{
      minimumWaveIndex: 0,
      survivalLevel: 1,
      variants: [{
        collectionEquipmentDefinitionId: 'equipment.collection.blade.test',
        runtimeEquipmentDefinitionId: 'equipment.runtime.blade.level-1.test',
      }],
    }],
  };
}

function modeOptions(kind: ModeKind): ModeMatchRuntimeV6ModeOptions {
  if (kind === 'duel') return { kind, definitionBundle: duelBundle() };
  if (kind === 'race') return { kind, fixture: raceFixture() };
  return { kind, fixture: survivalFixture() };
}

function participant(value: ReturnType<typeof assignment>) {
  return {
    id: value.participantId,
    characterDefinitionId: value.characterDefinitionId,
    status: 'active', lives: 3, eliminations: 0, deaths: 0,
    hitstunTicks: 0, invulnerableTicks: 0, respawnTicks: 0,
    lastHitBy: null, lastHitTick: -1,
    action: { definitionId: 'arena.action.primary', phase: 'active', ticksRemaining: 1 },
    actionRule: { range: 2 },
    movement: {
      schemaVersion: 2,
      participantId: value.participantId,
      characterDefinitionId: value.characterDefinitionId,
      mode: 'standard', coyoteTicksRemaining: 0, jumpBufferTicksRemaining: 0,
      airJumpsUsed: 0, crouchChargeTicks: 0, crouchActionId: null,
      downSmashActionId: null, revision: 0, grounded: true,
    },
    equipment: null,
    position: { x: 0, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    facing: { x: 1, z: 0 },
    grounded: true,
    supportSurfaceId: 'main',
  };
}

function initialProjection(
  kind: ModeKind,
  modeDefinitionId: string,
): ArenaModeProjectionV1 {
  if (kind === 'duel') return {
    schemaVersion: 1, modeDefinitionId, revision: 0, preparationRemainingTicks: 1,
    state: { kind: 'duel', suddenDeath: false },
  };
  if (kind === 'race') return {
    schemaVersion: 1, modeDefinitionId, revision: 0,
    preparationRemainingTicks: RACE_MODE_PREPARING_TICKS_V1,
    state: {
      kind: 'race',
      finishGateId: 'race-finish-gate.test',
      participants: ['racer-1', 'racer-2'].map((participantId, index) => ({
        participantId, status: 'racing', safeAnchorId: `safe-anchor-${index + 1}.test`,
        progressOrdinal: 0, respawnReadyTick: null, finishTick: null, rank: null,
      })),
    },
  };
  return {
    schemaVersion: 1, modeDefinitionId, revision: 0, preparationRemainingTicks: null,
    state: {
      kind: 'survival', playerParticipantId: 'player-1', fallCount: 0,
      terminalFallCount: 2, survivedTicks: 0, pressureStage: 0,
      enemySlots: ['enemy-1', 'enemy-2'].map((participantId, index) => ({
        slotId: `enemy-slot-${index + 1}.test`, participantId, active: false,
        generation: 0, anchorId: null,
      })),
    },
  };
}

function localSidecar(tick: number, eventSequence: number, participantId: string) {
  return {
    schemaVersion: 3, tick, eventSequence, participantId,
    profile: ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
    primaryActionDefinitionId: 'arena.action.primary',
    channels: {
      primary: {
        kind: ACTION_RESOLUTION_KIND.SELECTED,
        actionDefinitionId: 'arena.action.primary', lane: 'primary',
        source: 'player-input', reason: 'selected',
      },
      primaryHold: {
        kind: ACTION_RESOLUTION_KIND.NONE,
        actionDefinitionId: null, lane: null, source: null, reason: 'not-requested',
      },
    },
  };
}

function readFrame(options: {
  readonly config: ReturnType<typeof createArenaMatchConfigV6>;
  readonly localParticipantId: string;
  readonly tick: number;
  readonly activeTick: number;
  readonly eventSequence: number;
  readonly modeProjection: unknown;
  readonly modeResult: ModeResultV3Payload | null;
  readonly identityDrift?: 'seed' | 'config' | 'backend';
}): MatchReadFrameV3 {
  const assignments = [...(options.config.participantAssignments as ReturnType<typeof assignment>[])]
    .sort((left, right) => left.participantId.localeCompare(right.participantId));
  const preparing = (options.modeProjection as { preparationRemainingTicks: number | null })
    .preparationRemainingTicks !== null;
  return createMatchReadFrameV3Audit({
    schemaVersion: 3,
    worldSnapshot: {
      authoritySchemaVersion: 6,
      physicsBackendVersion: options.identityDrift === 'backend' ? 'foreign-backend' : 'v6-test',
      configHash: options.identityDrift === 'config'
        ? 'bad0c0de' : createDeterministicDataHash(options.config),
      ruleContentHash: options.config.modePolicyContentHash,
      matchSeed: options.identityDrift === 'seed' ? MATCH_SEED + 1 : MATCH_SEED,
      tick: options.tick,
      activeTick: options.activeTick,
      phase: options.modeResult !== null ? 'ended' : preparing ? 'preparing' : 'running',
      remainingTicks: Math.max(0, 200 - options.activeTick),
      eventSequence: options.eventSequence,
      modeDefinitionId: options.config.modeDefinitionId,
      participants: assignments.map(participant),
      equipment: [],
      activeSupplyProjection: null,
      modeProjection: options.modeProjection,
      map: {
        schemaVersion: 1, definitionId: 'main-map.test',
        nextActiveTick: options.tick + 1, revision: options.tick,
        surfaces: [{ id: 'main', enabled: true, revision: 0 }], occurrences: [],
      },
      result: options.modeResult,
    },
    localActionSidecar: localSidecar(
      options.tick,
      options.eventSequence,
      options.localParticipantId,
    ),
  }, NO_SUPPLY);
}

function facts(kind: ModeKind, tick: number) {
  if (kind === 'duel') return {
    phase: 'running', preparationRemainingTicks: null,
    result: {
      winnerId: 'player-1', reason: 'last-participant-standing',
      isDraw: false, endedAtTick: 0,
    },
  };
  if (kind === 'race') return {
    tick,
    activeTick: tick < RACE_MODE_PREPARING_TICKS_V1
      ? null : tick - RACE_MODE_PREPARING_TICKS_V1,
    preparationRemainingTicks: tick <= RACE_MODE_PREPARING_TICKS_V1
      ? RACE_MODE_PREPARING_TICKS_V1 - tick : null,
    validSafeAnchorIds: ['safe-anchor-1.test', 'safe-anchor-2.test'],
    safeAnchorClaims: [], finishClaims: [], participantFalls: [],
  };
  return { tick, activeTick: tick, playerFell: false, enemyFalls: [] };
}

function supplyCadence(kind: ModeKind, snapshotTick: number) {
  if (kind !== 'survival') return null;
  const nextSpawnTick = snapshotTick === 0
    ? 0
    : Math.ceil(snapshotTick / 1_200) * 1_200;
  return {
    schemaVersion: 1,
    modeDefinitionId: 'arena.mode.survival.runtime.test.v6',
    supplyDefinitionId: 'supply-survival-v1',
    snapshotTick,
    nextWaveIndex: Math.ceil(snapshotTick / 1_200),
    nextSpawnTick,
    remainingTicks: nextSpawnTick - snapshotTick,
    spawnCount: 3,
  };
}

function supplyFact(kind: ModeKind, tick: number, sequence: number) {
  const streamId = `arena.mode.${kind}.runtime.test.supply-stream.v1`;
  return createArenaSupplyAuthorityFactV1({
    schemaVersion: 1,
    id: `${streamId}:supply-fact-v1:${sequence}:spawned`,
    streamId,
    sequence,
    tick,
    modeDefinitionId: `arena.mode.${kind}.runtime.test.v6`,
    kind: 'spawned',
    supplyDefinitionId: 'supply-survival-v1',
    supplyId: `supply-${sequence}.test`,
    equipmentInstanceId: `equipment-instance-${sequence}.test`,
    runtimeEquipmentDefinitionId: 'equipment.runtime.blade.level-1.test',
    collectionEquipmentDefinitionId: 'equipment.collection.blade.test',
    survivalLevel: 1,
    participantId: null,
    previousEquipmentInstanceId: null,
  });
}

interface HarnessOptions {
  readonly beforeStep?: () => void;
  readonly drift?: 'seed' | 'config' | 'backend';
  readonly terminalFrameEndedAtTickOffset?: number;
  readonly wrongCommandHash?: boolean;
  readonly eventMutation?: (
    events: readonly unknown[],
    resolution: ModeMatchResolutionV6,
  ) => readonly unknown[];
  readonly destroyFailures?: number;
  readonly beforeDestroy?: () => void;
  readonly stepOverride?: () => unknown;
  readonly supplyFacts?: (kind: ModeKind, tick: number) => readonly unknown[];
  readonly omitSupplyFacts?: boolean;
  readonly publishJumpAvailability?: boolean;
  readonly omitJumpAvailabilityOnStep?: boolean;
}

function harness(kind: ModeKind, options: HarnessOptions = {}) {
  const runtimeConfig = createArenaMatchConfigV6(config(kind));
  const assignments = [...runtimeConfig.participantAssignments];
  const participantIds = assignments.map(({ participantId }) => participantId);
  const localParticipantId = assignments.find(({ controllerKind }) => controllerKind === 'human')!
    .participantId;
  let eventSequence = 0;
  let destroyCalls = 0;
  let currentProjection: ArenaModeProjectionV1 = initialProjection(
    kind,
    runtimeConfig.modeDefinitionId as string,
  );
const authority = {
    start() {
      return {
        readFrame: readFrame({
          config: runtimeConfig, localParticipantId, tick: 0, activeTick: 0,
          eventSequence: 0, modeProjection: currentProjection, modeResult: null,
        }),
        readFrameAudit: NO_SUPPLY,
        supplyCadence: supplyCadence(kind, 0),
        ...(options.publishJumpAvailability !== false ? {
          localJumpAvailability: createArenaLocalJumpAvailabilityV1({
            schemaVersion: 1,
            tick: 0,
            eventSequence: 0,
            participantId: localParticipantId,
            canMove: false,
            canGroundJump: false,
            canAirJump: false,
            state: 'blocked',
          }),
        } : {}),
        stateHash: createDeterministicDataHash({ kind, tick: 0 }),
      };
    },
    step(request: {
      tick: number;
      inputFrames: readonly ArenaInputFrame[];
      resolveMode(value: unknown): ModeMatchResolutionV6;
    }) {
      if (options.stepOverride) return options.stepOverride();
      options.beforeStep?.();
      const resolution = request.resolveMode(facts(kind, request.tick));
      currentProjection = resolution.modeProjection;
      const events: unknown[] = [];
      if (request.tick === 0) events.push(createArenaMatchEventV6({
        id: 'event-start', sequence: eventSequence++, tick: 0,
        type: ARENA_MATCH_EVENT_V6.MATCH_STARTED,
        modeDefinitionId: runtimeConfig.modeDefinitionId,
        participantIds,
      }));
      if (resolution.modeResult !== null) events.push(createArenaMatchEventV6({
        id: 'event-end', sequence: eventSequence++, tick: request.tick,
        type: ARENA_MATCH_EVENT_V6.MATCH_ENDED,
        modeDefinitionId: runtimeConfig.modeDefinitionId,
        modeResult: resolution.modeResult,
      }));
      const publishedEvents = options.eventMutation
        ? options.eventMutation(events, resolution) : events;
      const frameModeResult = resolution.modeResult === null
        || options.terminalFrameEndedAtTickOffset === undefined
        ? resolution.modeResult
        : {
            ...resolution.modeResult,
            endedAtTick: resolution.modeResult.endedAtTick
              + options.terminalFrameEndedAtTickOffset,
          } as ModeResultV3Payload;
      return {
        readFrame: readFrame({
          config: runtimeConfig,
          localParticipantId,
          tick: request.tick + 1,
          activeTick: kind === 'race'
            ? Math.max(0, request.tick - RACE_MODE_PREPARING_TICKS_V1) : request.tick + 1,
          eventSequence: eventSequence,
          modeProjection: resolution.modeProjection,
          modeResult: frameModeResult,
          ...(options.drift !== undefined ? { identityDrift: options.drift } : {}),
        }),
        readFrameAudit: NO_SUPPLY,
        events: publishedEvents,
        ...(options.omitSupplyFacts === true
          ? {}
          : { supplyFacts: options.supplyFacts?.(kind, request.tick) ?? [] }),
        supplyCadence: supplyCadence(kind, request.tick + 1),
        ...(options.publishJumpAvailability !== false
          && options.omitJumpAvailabilityOnStep !== true ? {
          localJumpAvailability: createArenaLocalJumpAvailabilityV1({
            schemaVersion: 1,
            tick: request.tick + 1,
            eventSequence,
            participantId: localParticipantId,
            canMove: false,
            canGroundJump: false,
            canAirJump: false,
            state: 'blocked',
          }),
        } : {}),
        stateHash: createDeterministicDataHash({ kind, tick: request.tick + 1 }),
        appliedModeCommandHash: options.wrongCommandHash
          ? 'bad0c0de' : createDeterministicDataHash(resolution.commands),
      };
    },
    exportCheckpoint(current: unknown) {
      return current;
    },
    restore(request: unknown) {
      const source = request as {
        readonly checkpoint: {
          readonly readFrame: {
            readonly worldSnapshot: { readonly tick: number; readonly eventSequence: number };
          };
          readonly readFrameAudit: unknown;
          readonly stateHash: string;
        };
      };
      const restoredTick = source.checkpoint.readFrame.worldSnapshot.tick;
      eventSequence = source.checkpoint.readFrame.worldSnapshot.eventSequence;
      return {
        ...source.checkpoint,
        supplyCadence: supplyCadence(kind, restoredTick),
        localJumpAvailability: createArenaLocalJumpAvailabilityV1({
          schemaVersion: 1,
          tick: restoredTick,
          eventSequence,
          participantId: localParticipantId,
          canMove: false,
          canGroundJump: false,
          canAirJump: false,
          state: 'blocked',
        }),
      };
    },
    pause() {},
    resume() {},
    destroy() {
      destroyCalls += 1;
      options.beforeDestroy?.();
      if (destroyCalls <= (options.destroyFailures ?? 0)) throw new Error('destroy failed');
    },
  };
    const runtime = new ModeMatchRuntimeV6({
    checkpointIntervalTicks: 30,
    config: runtimeConfig,
    expectedMatchSeed: MATCH_SEED,
    localParticipantId,
    mode: modeOptions(kind),
  worldAuthority: authority,
  });
  const input = (tick: number) => participantIds.map((id) => createNeutralInputFrame(tick, id));
  return { authority, input, participantIds, runtime, runtimeConfig, get destroyCalls() { return destroyCalls; } };
}

function runToEnded(kind: ModeKind) {
  const created = harness(kind);
  created.runtime.start();
  let lastOutcome: ModeMatchRuntimeV6StepOutcome | undefined;
  while (created.runtime.state === MODE_MATCH_RUNTIME_V6_STATE.RUNNING) {
    const tick = created.runtime.readFrame!.worldSnapshot.tick;
    lastOutcome = created.runtime.step(created.input(tick));
  }
  return { ...created, lastOutcome };
}

describe('ModeMatchRuntimeV6 production-unreachable concrete authority candidate', () => {
  it('requires the authoritative jump capability on start and every step', () => {
    const missing = harness('duel', { publishJumpAvailability: false });
    expect(() => missing.runtime.start()).toThrow(/失败关闭/);
    expect(missing.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
    missing.runtime.destroy();

    const missingStep = harness('duel', { omitJumpAvailabilityOnStep: true });
    missingStep.runtime.start();
    expect(() => missingStep.runtime.step(missingStep.input(0))).toThrow(/失败关闭/);
    expect(missingStep.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
    missingStep.runtime.destroy();

    const capable = harness('duel');
    const capableStart = capable.runtime.start();
    expect(capableStart.localJumpAvailability).toMatchObject({
      tick: 0,
      eventSequence: 0,
      participantId: 'player-1',
      state: 'blocked',
    });
    const step = capable.runtime.step(capable.input(0));
    expect(step.localJumpAvailability).toMatchObject({
      tick: 1,
      eventSequence: 2,
      participantId: 'player-1',
      state: 'blocked',
    });
    capable.runtime.destroy();
  });

  it.each(['duel', 'race', 'survival'] as const)(
    'drives %s from a zero-event start frame to one atomic terminal result',
    (kind) => {
      const { runtime, lastOutcome } = runToEnded(kind);
      expect(runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.ENDED);
      expect(Object.keys(lastOutcome!).sort()).toEqual([
        'events', 'localJumpAvailability', 'readFrame', 'readFrameAudit', 'supplyCadence',
        'supplyFacts',
      ]);
      const replay = runtime.exportReplayV6();
      const checkpoints = runtime.exportModeCheckpointsV2();
      expect(replay.events.filter(({ type }) => type === 'MatchStarted')).toHaveLength(1);
      expect(replay.events.at(0)?.type).toBe('MatchStarted');
      expect(replay.events.filter(({ type }) => type === 'MatchEnded')).toHaveLength(1);
      expect(replay.events.at(-1)?.type).toBe('MatchEnded');
      expect(replay.events.at(-1)?.tick).toBe(replay.modeResult.endedAtTick);
      expect(lastOutcome!.readFrame.worldSnapshot.result).toEqual(replay.modeResult);
      expect(lastOutcome!.readFrame.worldSnapshot.tick).toBe(replay.modeResult.endedAtTick + 1);
      expect(checkpoints.map(({ tick }) => tick)).toEqual(
        kind === 'race' ? [0, 30, 60, 62] : kind === 'survival' ? [0, 2] : [0, 1],
      );
      expect(checkpoints.map(({ stateHash }) => stateHash)).toEqual(
        replay.checkpoints.map(({ hash }) => hash),
      );
      runtime.destroy();
      expect(runtime.getRetainedResourceSnapshot()).toEqual({
        authorityOwned: false, modeDriverOwned: false,
        ownedResourceCount: 0, committedRecordCount: 0,
      });
    },
  );

  it('requires every authority step to publish explicit supply facts, including empty arrays', () => {
    const created = harness('duel', { omitSupplyFacts: true });
    created.runtime.start();
    expect(() => created.runtime.step(created.input(0))).toThrow(/失败关闭/u);
    expect(created.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
    expect(created.runtime.getRetainedResourceSnapshot().committedRecordCount).toBe(0);
  });

  it('rejects an ended frame that rewrites authority endedAtTick to the post-frame tick', () => {
    const created = harness('duel', { terminalFrameEndedAtTickOffset: 1 });
    created.runtime.start();
    expect(() => created.runtime.step(created.input(0))).toThrow(/失败关闭/);
    expect(created.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
    expect(created.runtime.getRetainedResourceSnapshot().committedRecordCount).toBe(0);
  });

  it('rejects a terminal event moved beyond the pre-step authority tick', () => {
    const created = harness('duel', {
      eventMutation(events, resolution) {
        if (resolution.modeResult === null) return events;
        const lateEndedAtTick = resolution.modeResult.endedAtTick + 1;
        return [events[0]!, createArenaMatchEventV6({
          id: 'event-end-late',
          sequence: 1,
          tick: lateEndedAtTick,
          type: ARENA_MATCH_EVENT_V6.MATCH_ENDED,
          modeDefinitionId: 'arena.mode.duel.runtime.test.v6',
          modeResult: { ...resolution.modeResult, endedAtTick: lateEndedAtTick },
        })];
      },
    });
    created.runtime.start();
    expect(() => created.runtime.step(created.input(0))).toThrow(/失败关闭/);
    expect(created.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
    expect(created.runtime.getRetainedResourceSnapshot().committedRecordCount).toBe(0);
  });

  it('keeps a read-only current checkpoint available in running/paused without publishing replay', () => {
    const { runtime } = harness('race');
    runtime.start();
    expect(runtime.exportModeCheckpoint().tick).toBe(0);
    expect(() => runtime.exportReplayV6()).toThrow(/状态running/);
    runtime.pause();
    expect(runtime.exportModeCheckpoint().tick).toBe(0);
    runtime.resume();
    runtime.destroy();
  });

  it.each(['seed', 'config', 'backend'] as const)(
    'rejects post-frame %s identity drift before committing the batch',
    (drift) => {
      const { runtime, input } = harness('duel', { drift });
      runtime.start();
      expect(() => runtime.step(input(0))).toThrow(/失败关闭/);
      expect(runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
      expect(runtime.getRetainedResourceSnapshot().committedRecordCount).toBe(0);
    },
  );

  it('requires a new Survival supply stream to begin at sequence 0', () => {
    const skipped = harness('survival', {
      supplyFacts: (kind, tick) => [supplyFact(kind, tick, 1)],
    });
    skipped.runtime.start();
    expect(() => skipped.runtime.step(skipped.input(0))).toThrow(/failed closed|failure close|失败关闭/u);
    expect(skipped.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
    expect(skipped.runtime.getRetainedResourceSnapshot().committedRecordCount).toBe(0);

    const first = harness('survival', {
      supplyFacts: (kind, tick) => tick === 0 ? [supplyFact(kind, tick, 0)] : [],
    });
    first.runtime.start();
    expect(first.runtime.exportRuntimeCheckpointV2()).toMatchObject({
      supplyFactStreamId: null,
      lastSupplyFactSequence: null,
    });
    const outcome = first.runtime.step(first.input(0));
    expect(outcome.supplyFacts.map(({ sequence }) => sequence)).toEqual([0]);
    expect(first.runtime.exportRuntimeCheckpointV2()).toMatchObject({
      supplyFactStreamId: 'arena.mode.survival.runtime.test.supply-stream.v1',
      lastSupplyFactSequence: 0,
    });
    first.runtime.destroy();
  });

  it.each(['duel', 'race'] as const)(
    'rejects %s supply facts and non-null V2 supply waterlines before commit',
    (kind) => {
      const injected = harness(kind, {
        supplyFacts: (modeKind, tick) => [supplyFact(modeKind, tick, 0)],
      });
      injected.runtime.start();
      expect(() => injected.runtime.step(injected.input(0))).toThrow(/失败关闭/u);
      expect(injected.runtime.getRetainedResourceSnapshot().committedRecordCount).toBe(0);

      const checkpointed = harness(kind);
      checkpointed.runtime.start();
      const runtimeCheckpointV1 = checkpointed.runtime.exportRuntimeCheckpointV1();
      expect(() => createModeMatchRuntimeCheckpointV2({
        schemaVersion: 2,
        runtimeCheckpointV1,
        supplyFactStreamId: `arena.mode.${kind}.runtime.test.supply-stream.v1`,
        lastSupplyFactSequence: 0,
      })).toThrow(/非Survival不得携带供给事实水位/u);
      checkpointed.runtime.destroy();
    },
  );

  it('rejects unapplied command hashes and malformed event identity before commit', () => {
    const wrongCommands = harness('survival', { wrongCommandHash: true });
    wrongCommands.runtime.start();
    expect(() => wrongCommands.runtime.step(wrongCommands.input(0))).toThrow(/失败关闭/);
    expect(wrongCommands.runtime.getRetainedResourceSnapshot().committedRecordCount).toBe(0);

    const wrongRole = harness('survival', {
      eventMutation(events) {
        return [...events, createArenaMatchEventV6({
          id: 'event-fall', sequence: 1, tick: 0,
          type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
          modeDefinitionId: 'arena.mode.survival.runtime.test.v6',
          participantId: 'player-1', modeRole: 'competitor', slotId: null,
          slotGeneration: 0, fallCause: 'movement', creditedAttackerId: null,
          supportSurfaceId: null,
        })];
      },
    });
    wrongRole.runtime.start();
    expect(() => wrongRole.runtime.step(wrongRole.input(0))).toThrow(/失败关闭/);
    expect(wrongRole.runtime.getRetainedResourceSnapshot().committedRecordCount).toBe(0);

    const duplicateStarted = harness('survival', {
      eventMutation(events) {
        return [...events, createArenaMatchEventV6({
          id: 'event-start-duplicate', sequence: 1, tick: 0,
          type: ARENA_MATCH_EVENT_V6.MATCH_STARTED,
          modeDefinitionId: 'arena.mode.survival.runtime.test.v6',
          participantIds: ['enemy-1', 'enemy-2', 'player-1'],
        })];
      },
    });
    duplicateStarted.runtime.start();
    expect(() => duplicateStarted.runtime.step(duplicateStarted.input(0))).toThrow(/失败关闭/);

    const foreignModeEvent = harness('survival', {
      eventMutation(events) {
        return [...events, createArenaMatchEventV6({
          id: 'event-race-anchor', sequence: 1, tick: 0,
          type: ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED,
          modeDefinitionId: 'arena.mode.survival.runtime.test.v6',
          participantId: 'player-1', anchorId: 'foreign-race-anchor', progressOrdinal: 1,
        })];
      },
    });
    foreignModeEvent.runtime.start();
    expect(() => foreignModeEvent.runtime.step(foreignModeEvent.input(0))).toThrow(/失败关闭/);
    expect(foreignModeEvent.runtime.getRetainedResourceSnapshot().committedRecordCount).toBe(0);
  });

  it('retains exact destroy ownership after cleanup failure and clears records before retry', () => {
    const created = harness('race', { destroyFailures: 1 });
    created.runtime.start();
    created.runtime.step(created.input(0));
    expect(() => created.runtime.destroy()).toThrow(/清理不完整/);
    expect(created.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
    expect(created.runtime.getRetainedResourceSnapshot()).toEqual({
      authorityOwned: true, modeDriverOwned: false,
      ownedResourceCount: 1, committedRecordCount: 0,
    });
    created.runtime.destroy();
    created.runtime.destroy();
    expect(created.destroyCalls).toBe(2);
    expect(created.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.DESTROYED);
  });

  it('retains Authority ownership when destroy swallows public reentry', () => {
    let created: ReturnType<typeof harness>;
    created = harness('race', {
      beforeDestroy: () => {
        if (created.destroyCalls !== 1) return;
        try {
          created.runtime.getRetainedResourceSnapshot();
        } catch {
          // Authority deliberately swallows the public reentry rejection.
        }
      },
    });

    expect(() => created.runtime.destroy()).toThrow(/重入|清理不完整/);
    expect(created.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
    expect(created.runtime.getRetainedResourceSnapshot()).toEqual({
      authorityOwned: true,
      modeDriverOwned: false,
      ownedResourceCount: 1,
      committedRecordCount: 0,
    });
    created.runtime.destroy();
    created.runtime.destroy();
    expect(created.destroyCalls).toBe(2);
    expect(created.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.DESTROYED);
  });

  it('rejects V3 mode-driver drift before observing the replacement authority', () => {
    const checkpointed = harness('race');
    checkpointed.runtime.start();
    const checkpoint = checkpointed.runtime.exportRuntimeCheckpointV3();
    let authorityObservations = 0;
    const authority = new Proxy(Object.create(null) as object, {
      get() {
        authorityObservations += 1;
        throw new Error('replacement authority must remain unobserved');
      },
      getOwnPropertyDescriptor() {
        authorityObservations += 1;
        throw new Error('replacement authority descriptor must remain unobserved');
      },
      getPrototypeOf() {
        authorityObservations += 1;
        throw new Error('replacement authority prototype must remain unobserved');
      },
    });
    expect(() => ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV3({
      checkpoint,
      mode: {
        kind: 'race',
        fixture: { ...raceFixture(), hardLimitActiveTicks: 2 },
      },
      worldAuthority: authority as never,
    })).toThrow(/Mode Driver内容身份漂移/u);
    expect(authorityObservations).toBe(0);
    checkpointed.runtime.destroy();
  });

  it('validates mode before authority capture and rejects hostile/Promise/reentrant ports fail closed', async () => {
    let constructorDestroys = 0;
    const authority = {
      start() {}, step() {}, pause() {}, resume() {},
      exportCheckpoint() {},
      restore() {},
      destroy() { constructorDestroys += 1; },
    };
    expect(() => new ModeMatchRuntimeV6({
      checkpointIntervalTicks: 30,
      config: config('duel'),
      expectedMatchSeed: MATCH_SEED,
      localParticipantId: 'player-1',
      mode: { kind: 'duel', definitionBundle: { future: true } },
      worldAuthority: authority,
    })).toThrow(/构造失败/);
    expect(constructorDestroys).toBe(0);

    let thenCalls = 0;
    const hostile = harness('duel', {
      stepOverride: () => ({ then() { thenCalls += 1; } }),
    });
    hostile.runtime.start();
    expect(failureCause(() => hostile.runtime.step(hostile.input(0))).message)
      .toMatch(/then字段/);
    expect(thenCalls).toBe(0);

    const disguisedPromise = Promise.resolve(null);
    Object.defineProperties(disguisedPromise, {
      constructor: { configurable: true, enumerable: true, value: null },
      then: { configurable: true, enumerable: true, value: null },
    });
    const dataThen = harness('duel', { stepOverride: () => disguisedPromise });
    dataThen.runtime.start();
    expect(failureCause(() => dataThen.runtime.step(dataThen.input(0))).message)
      .toMatch(/then字段/);
    expect(dataThen.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
    expect(dataThen.runtime.getRetainedResourceSnapshot().committedRecordCount).toBe(0);
    expect(dataThen.destroyCalls).toBe(1);

    let thenGetterCalls = 0;
    const accessorThen = Object.defineProperty({}, 'then', {
      enumerable: true,
      get() {
        thenGetterCalls += 1;
        throw new Error('then getter must not execute');
      },
    });
    const hostileAccessor = harness('duel', { stepOverride: () => accessorThen });
    hostileAccessor.runtime.start();
    expect(failureCause(() => hostileAccessor.runtime.step(hostileAccessor.input(0))).message)
      .toMatch(/访问器thenable/);
    expect(thenGetterCalls).toBe(0);

    let constructorGetterCalls = 0;
    const accessorConstructor = Object.defineProperty({}, 'constructor', {
      enumerable: true,
      get() {
        constructorGetterCalls += 1;
        throw new Error('constructor getter must not execute');
      },
    });
    const hostileConstructor = harness('duel', {
      stepOverride: () => accessorConstructor,
    });
    hostileConstructor.runtime.start();
    expect(failureCause(
      () => hostileConstructor.runtime.step(hostileConstructor.input(0)),
    ).message).toMatch(/访问器constructor/);
    expect(constructorGetterCalls).toBe(0);

    const cyclicTarget = Object.create(null) as object;
    let cyclicResult: object;
    cyclicResult = new Proxy(cyclicTarget, {
      getPrototypeOf() {
        return cyclicResult;
      },
    });
    const cyclic = harness('duel', { stepOverride: () => cyclicResult });
    cyclic.runtime.start();
    expect(failureCause(() => cyclic.runtime.step(cyclic.input(0))).message)
      .toMatch(/原型链循环/);

    let tooDeepResult = Object.create(null) as object;
    for (let depth = 0; depth < 33; depth += 1) {
      tooDeepResult = Object.create(tooDeepResult) as object;
    }
    const tooDeep = harness('duel', { stepOverride: () => tooDeepResult });
    tooDeep.runtime.start();
    expect(failureCause(() => tooDeep.runtime.step(tooDeep.input(0))).message)
      .toMatch(/超过32层/);

    class UnsafePromiseSubclass extends Promise<unknown> {}
    const promiseSubclass = harness('duel', {
      stepOverride: () => UnsafePromiseSubclass.resolve(),
    });
    promiseSubclass.runtime.start();
    expect(failureCause(
      () => promiseSubclass.runtime.step(promiseSubclass.input(0)),
    ).message).toMatch(/then字段|thenable/);

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
    process.on('unhandledRejection', onUnhandled);
    try {
      const rejected = harness('duel', {
        stepOverride: () => Promise.reject(new Error('async step rejected')),
      });
      rejected.runtime.start();
      expect(() => rejected.runtime.step(rejected.input(0))).toThrow(/失败关闭/);
      await Promise.resolve();
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }

    const thenDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
    expect(thenDescriptor).toBeDefined();
    let replacementThenCalls = 0;
    Object.defineProperty(Promise.prototype, 'then', {
      ...thenDescriptor,
      value() {
        replacementThenCalls += 1;
        throw new Error('replacement then must not execute');
      },
    });
    try {
      const drifted = harness('duel');
      expect(failureCause(() => drifted.runtime.start()).message).toMatch(/描述符漂移/);
      expect(replacementThenCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise.prototype, 'then', thenDescriptor!);
    }

    const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    expect(speciesDescriptor).toBeDefined();
    let speciesGetterCalls = 0;
    Object.defineProperty(Promise, Symbol.species, {
      ...speciesDescriptor,
      get() {
        speciesGetterCalls += 1;
        return Promise;
      },
    });
    try {
      const speciesDrifted = harness('duel', {
        stepOverride: () => Promise.resolve(),
      });
      speciesDrifted.runtime.start();
      expect(failureCause(
        () => speciesDrifted.runtime.step(speciesDrifted.input(0)),
      ).message).toMatch(/Symbol\.species.*描述符漂移/);
      expect(speciesGetterCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor!);
    }

    let reentrantRuntime: ModeMatchRuntimeV6 | null = null;
    const reentrant = harness('duel', {
      beforeStep() {
        try { reentrantRuntime?.pause(); } catch { /* outer transaction must win */ }
      },
    });
    reentrantRuntime = reentrant.runtime;
    reentrant.runtime.start();
    expect(() => reentrant.runtime.step(reentrant.input(0))).toThrow(/失败关闭/);
    expect(reentrant.runtime.state).toBe(MODE_MATCH_RUNTIME_V6_STATE.FAILED);
  });
});
