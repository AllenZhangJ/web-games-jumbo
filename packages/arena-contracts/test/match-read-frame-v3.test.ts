import { describe, expect, it } from 'vitest';
import { ACTION_RESOLUTION_KIND } from '../src/action-resolution.js';
import {
  ARENA_MATCH_READ_PROFILE,
} from '../src/match-read-frame-v2.js';
import {
  ARENA_MODE_PROJECTION_KIND,
  ARENA_RACE_PARTICIPANT_STATUS,
  MATCH_READ_FRAME_V3_SCHEMA_VERSION,
  createMatchReadFrameV3Audit,
  createWorldSnapshotV3Audit,
} from '../src/match-read-frame-v3.js';

function participant(id: string) {
  return {
    id,
    characterDefinitionId: 'fighter',
    status: 'active',
    lives: 3,
    eliminations: 0,
    deaths: 0,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    respawnTicks: 0,
    lastHitBy: null,
    lastHitTick: -1,
    action: {
      definitionId: 'arena.action.primary',
      phase: 'active',
      ticksRemaining: 1,
    },
    actionRule: { range: 2 },
    movement: {
      schemaVersion: 2,
      participantId: id,
      characterDefinitionId: 'fighter',
      mode: 'standard',
      coyoteTicksRemaining: 0,
      jumpBufferTicksRemaining: 0,
      airJumpsUsed: 0,
      crouchChargeTicks: 0,
      crouchActionId: null,
      downSmashActionId: null,
      revision: 0,
      grounded: true,
    },
    equipment: null,
    position: { x: 0, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    facing: { x: 1, z: 0 },
    grounded: true,
    supportSurfaceId: 'main',
  };
}

function commonWorld() {
  return {
    authoritySchemaVersion: 6,
    physicsBackendVersion: 'lightweight-v3',
    configHash: 'deadbeef',
    ruleContentHash: 'c0ffee00',
    matchSeed: 7,
    tick: 100,
    activeTick: 100,
    phase: 'running',
    remainingTicks: 900,
    eventSequence: 12,
    modeDefinitionId: 'mode.duel.test.v1',
    participants: [participant('p1'), participant('p2')],
    equipment: [],
    activeSupplyProjection: null,
    modeProjection: {
      schemaVersion: 1,
      modeDefinitionId: 'mode.duel.test.v1',
      revision: 1,
      preparationRemainingTicks: null,
      state: {
        kind: ARENA_MODE_PROJECTION_KIND.DUEL,
        suddenDeath: false,
      },
    },
    map: {
      schemaVersion: 1,
      definitionId: 'main-map',
      nextActiveTick: 103,
      revision: 0,
      surfaces: [{ id: 'main', enabled: true, revision: 0 }],
      occurrences: [{
        occurrenceId: 'hazard:1',
        eventId: 'hazard-event',
        kind: 'warning',
        warningTick: 90,
        startTick: 95,
        endTick: 110,
        phase: 'active',
        publicPayload: { intensity: 1 },
        revision: 0,
      }],
    },
    result: null,
  };
}

function localSidecar(participantId = 'p1') {
  return {
    schemaVersion: MATCH_READ_FRAME_V3_SCHEMA_VERSION,
    tick: 100,
    eventSequence: 12,
    participantId,
    profile: ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
    primaryActionDefinitionId: 'arena.action.primary',
    channels: {
      primary: {
        kind: ACTION_RESOLUTION_KIND.SELECTED,
        actionDefinitionId: 'arena.action.primary',
        lane: 'primary',
        source: 'player-input',
        reason: 'selected',
      },
      primaryHold: {
        kind: ACTION_RESOLUTION_KIND.NONE,
        actionDefinitionId: null,
        lane: null,
        source: null,
        reason: 'not-requested',
      },
    },
  };
}

const noSupply = {
  worldSupplyEquipmentInstanceIds: [],
  expectedWorldSupplyIdentities: [],
} as const;

describe('P2.0b MatchReadFrame V3 candidate', () => {
  it('accepts and freezes an isolated Duel V3 frame', () => {
    const world = commonWorld();
    const frame = createMatchReadFrameV3Audit({
      schemaVersion: MATCH_READ_FRAME_V3_SCHEMA_VERSION,
      worldSnapshot: world,
      localActionSidecar: localSidecar(),
    }, noSupply);

    expect(frame.worldSnapshot.modeProjection.state.kind).toBe('duel');
    expect(Object.isFrozen(frame)).toBe(true);
    expect(Object.isFrozen(frame.worldSnapshot)).toBe(true);
    expect(Object.isFrozen(frame.localActionSidecar.channels)).toBe(true);
  });

  it('binds a Race authority terminal tick to the following ended read frame', () => {
    const participants = [participant('p1'), participant('p2')];
    const world = {
      ...commonWorld(),
      tick: 201,
      activeTick: 201,
      phase: 'ended',
      modeDefinitionId: 'mode.race.test.v1',
      participants,
      modeProjection: {
        schemaVersion: 1,
        modeDefinitionId: 'mode.race.test.v1',
        revision: 8,
        preparationRemainingTicks: null,
        state: {
          kind: ARENA_MODE_PROJECTION_KIND.RACE,
          finishGateId: 'race.finish',
          participants: [
            {
              participantId: 'p1',
              status: ARENA_RACE_PARTICIPANT_STATUS.FINISHED,
              safeAnchorId: 'race.safe.8',
              progressOrdinal: 10,
              respawnReadyTick: null,
              finishTick: 200,
              rank: 1,
            },
            {
              participantId: 'p2',
              status: ARENA_RACE_PARTICIPANT_STATUS.FINISHED,
              safeAnchorId: 'race.safe.8',
              progressOrdinal: 10,
              respawnReadyTick: null,
              finishTick: 200,
              rank: 1,
            },
          ],
        },
      },
      result: {
        kind: 'race',
        winnerParticipantIds: ['p1', 'p2'],
        rankings: [
          { participantId: 'p1', rank: 1, finishTick: 200, progressOrdinal: 10 },
          { participantId: 'p2', rank: 1, finishTick: 200, progressOrdinal: 10 },
        ],
        reason: 'finish-claimed',
        endedAtTick: 200,
      },
    };
    const frame = createMatchReadFrameV3Audit({
      schemaVersion: 3,
      worldSnapshot: world,
      localActionSidecar: { ...localSidecar(), tick: 201 },
    }, noSupply);
    expect(frame.worldSnapshot.result?.kind).toBe('race');
    expect(frame.worldSnapshot.result?.endedAtTick).toBe(200);
    expect(frame.worldSnapshot.tick).toBe(201);
  });

  it('rejects old display-tick, stale and impossible tick-zero terminal frames', () => {
    const world = {
      ...commonWorld(),
      tick: 101,
      activeTick: 101,
      phase: 'ended',
      result: {
        kind: 'duel',
        winnerParticipantIds: ['p1'],
        isDraw: false,
        reason: 'last-participant-standing',
        endedAtTick: 100,
      },
    } as const;
    expect(() => createWorldSnapshotV3Audit({
      ...world,
      result: { ...world.result, endedAtTick: 101 },
    }, noSupply)).toThrow(/world\.tick - 1/);
    expect(() => createWorldSnapshotV3Audit({
      ...world,
      result: { ...world.result, endedAtTick: 99 },
    }, noSupply)).toThrow(/world\.tick - 1/);
    expect(() => createWorldSnapshotV3Audit({
      ...world,
      tick: 0,
      activeTick: 0,
      result: { ...world.result, endedAtTick: 0 },
    }, noSupply)).toThrow(/world\.tick - 1/);
    expect(() => createWorldSnapshotV3Audit({
      ...world,
      result: { ...world.result, future: true },
    }, noSupply)).toThrow(/future/);

    let getterCalls = 0;
    const accessorResult = { ...world.result } as Record<string, unknown>;
    Object.defineProperty(accessorResult, 'endedAtTick', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 100;
      },
    });
    expect(() => createWorldSnapshotV3Audit({
      ...world,
      result: accessorResult,
    }, noSupply)).toThrow(/访问器/);
    expect(getterCalls).toBe(0);
  });

  it('closes Survival mode, tier identity, world equipment and supply projection', () => {
    const identity = {
      modeDefinitionId: 'mode.survival.test.v1',
      supplyDefinitionId: 'supply.survival.test.v1',
      tierPolicyDefinitionId: 'tier.survival.test.v1',
      supplyId: 'supply-1',
      slotId: 'supply-slot-1',
      waveIndex: 0,
      survivalLevel: 1,
      collectionEquipmentDefinitionId: 'hammer.collection.test',
      runtimeEquipmentDefinitionId: 'hammer.runtime.level-1.test',
      equipmentInstanceId: 'equipment-supply-1',
      equipmentSpawnId: 'equipment-spawn-1',
      spawnPosition: { x: 2, y: 1, z: 0 },
      spawnTick: 580,
      expireTick: 600,
    };
    const world = {
      ...commonWorld(),
      tick: 599,
      activeTick: 599,
      eventSequence: 30,
      modeDefinitionId: 'mode.survival.test.v1',
      participants: [participant('enemy-1'), participant('p1')],
      equipment: [{
        schemaVersion: 1,
        instanceId: identity.equipmentInstanceId,
        runtimeEquipmentDefinitionId: identity.runtimeEquipmentDefinitionId,
        collectionEquipmentDefinitionId: identity.collectionEquipmentDefinitionId,
        survivalLevel: identity.survivalLevel,
        spawnId: identity.equipmentSpawnId,
        locationState: 'spawned',
        ownerId: null,
        position: { x: 2, y: 1, z: 0 },
        lastSafePosition: { x: 2, y: 1, z: 0 },
        cooldownRemainingTicks: 0,
        revision: 1,
      }],
      activeSupplyProjection: {
        schemaVersion: 3,
        modeDefinitionId: 'mode.survival.test.v1',
        snapshotTick: 599,
        snapshotEventSequence: 30,
        resyncReadiness: 'ready',
        pendingAuthorityTick: null,
        pendingExpiryEquipmentInstanceIds: [],
        supplies: [{
          schemaVersion: 3,
          supplyDefinitionId: identity.supplyDefinitionId,
          tierPolicyDefinitionId: identity.tierPolicyDefinitionId,
          supplyId: identity.supplyId,
          slotId: identity.slotId,
          waveIndex: identity.waveIndex,
          survivalLevel: identity.survivalLevel,
          collectionEquipmentDefinitionId: identity.collectionEquipmentDefinitionId,
          runtimeEquipmentDefinitionId: identity.runtimeEquipmentDefinitionId,
          equipmentInstanceId: identity.equipmentInstanceId,
          equipmentSpawnId: identity.equipmentSpawnId,
          spawnPosition: identity.spawnPosition,
          spawnTick: identity.spawnTick,
          expireTick: identity.expireTick,
          remainingTicks: 1,
          position: { x: 2, y: 1, z: 0 },
        }],
      },
      modeProjection: {
        schemaVersion: 1,
        modeDefinitionId: 'mode.survival.test.v1',
        revision: 20,
        preparationRemainingTicks: null,
        state: {
          kind: ARENA_MODE_PROJECTION_KIND.SURVIVAL,
          playerParticipantId: 'p1',
          fallCount: 0,
          terminalFallCount: 2,
          survivedTicks: 599,
          pressureStage: 2,
          enemySlots: [{
            slotId: 'enemy-slot-1',
            participantId: 'enemy-1',
            active: true,
            generation: 1,
            anchorId: 'survival.enemy.anchor.1',
          }],
        },
      },
    };
    const audited = createWorldSnapshotV3Audit(world, {
      worldSupplyEquipmentInstanceIds: [identity.equipmentInstanceId],
      expectedWorldSupplyIdentities: [identity],
    });
    expect(audited.activeSupplyProjection?.supplies[0]?.survivalLevel).toBe(1);
  });

  it('rejects V2, mixed, future and non-canonical frame bytes', () => {
    const world = commonWorld();
    expect(() => createMatchReadFrameV3Audit({
      schemaVersion: 2,
      worldSnapshot: world,
      localActionSidecar: localSidecar(),
    }, noSupply)).toThrow(/schemaVersion/);
    expect(() => createWorldSnapshotV3Audit({
      ...world,
      future: true,
    }, noSupply)).toThrow(/future/);
    expect(() => createWorldSnapshotV3Audit({
      ...world,
      participants: [...world.participants].reverse(),
    }, noSupply)).toThrow(/排序/);
    expect(() => createWorldSnapshotV3Audit({
      ...world,
      participants: [{
        ...world.participants[0],
        equipment: {
          instanceId: 'held-1',
          definitionId: 'legacy-v2-field',
          cooldownRemainingTicks: 0,
        },
      }, world.participants[1]],
    }, noSupply)).toThrow(/definitionId/);
  });

  it('fails closed on mode, result, sidecar and supply identity drift', () => {
    const world = commonWorld();
    expect(() => createWorldSnapshotV3Audit({
      ...world,
      modeProjection: {
        ...world.modeProjection,
        modeDefinitionId: 'mode.other.test.v1',
      },
    }, noSupply)).toThrow(/modeDefinitionId/);
    expect(() => createMatchReadFrameV3Audit({
      schemaVersion: 3,
      worldSnapshot: world,
      localActionSidecar: localSidecar('foreign'),
    }, noSupply)).toThrow(/participantId/);
    expect(() => createWorldSnapshotV3Audit({
      ...world,
      phase: 'ended',
      result: {
        kind: 'survival',
        playerParticipantId: 'p1',
        survivedTicks: 99,
        pressureStage: 1,
        fallCount: 2,
        reason: 'terminal-player-fall',
        endedAtTick: 99,
      },
    }, noSupply)).toThrow(/kind/);
    expect(() => createWorldSnapshotV3Audit(world, {
      worldSupplyEquipmentInstanceIds: [],
      expectedWorldSupplyIdentities: [{ modeDefinitionId: world.modeDefinitionId } as never],
    })).toThrow(/Duel\/Race/);
  });
});
