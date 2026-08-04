import { describe, expect, it } from 'vitest';
import {
  ACTION_RESOLUTION_KIND,
  ARENA_MATCH_READ_PROFILE,
  ARENA_MATCH_EVENT,
  EQUIPMENT_EXPIRY_REASON,
  EQUIPMENT_RECYCLE_REASON,
  EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
  createBotMobilitySidecarV2Audit,
  createDeterministicDataHash,
  createEquipmentExpiredEventPayload,
  createEquipmentRecycledEventPayload,
  createEquipmentReplacedEventPayload,
  createEquipmentSpawnedEventPayload,
  createFullAuditSidecarV2Audit,
  createLocalActionSidecarV2Audit,
  createMatchReadFrameV2Audit,
  createRng,
  createNeutralInputFrame,
  createArenaMatchSnapshotAudit,
  ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
  assertArenaPublicSupplyProjectionResyncReady,
  createArenaPublicSupplyProjectionAudit,
  createWorldSnapshotV2Audit,
  requireArenaPublicSupplyProjection,
  requireArenaSurvivalSupplyProjectionV2,
  createSynchronousStoragePort,
  combineCleanupFailure,
  deriveSeed,
  normalizeInputFrames,
  normalizeThrownError,
} from '../src/index.js';
import type {
  ArenaInputFrame,
  ArenaMatchEventType,
  EquipmentExpiredEventPayload,
  EquipmentRecycledEventPayload,
  EquipmentReplacedEventPayload,
  EquipmentSpawnedEventPayload,
} from '../src/index.js';

describe('Arena deterministic contracts', () => {
  it('publishes the immutable action resolution vocabulary for downstream readers', () => {
    expect(ACTION_RESOLUTION_KIND).toEqual({
      NONE: 'none',
      IGNORED: 'ignored',
      SELECTED: 'selected',
    });
    expect(Object.isFrozen(ACTION_RESOLUTION_KIND)).toBe(true);
  });

  function snapshotFixture(includeInternal = false) {
    const participant = {
      id: 'p1',
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
      action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
      actionRule: { range: 2 },
      movement: {
        schemaVersion: 2,
        participantId: 'p1',
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
      ...(includeInternal ? {} : { actionAffordance: { tick: 3 } }),
      equipment: null,
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      facing: { x: 1, z: 0 },
      grounded: true,
      supportSurfaceId: 'main',
    };
    return {
      schemaVersion: 5,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'config-hash',
      ruleContentHash: 'rule-hash',
      matchSeed: 7,
      tick: 3,
      activeTick: 3,
      phase: 'running',
      remainingTicks: 97,
      eventSequence: 4,
      participants: [participant],
      equipment: [],
      map: {
        schemaVersion: 1,
        definitionId: 'main-map',
        nextActiveTick: 3,
        revision: 0,
        surfaces: [{ id: 'main', enabled: true, revision: 0 }],
        occurrences: [],
      },
      result: null,
      ...(includeInternal ? { rngStates: { combat: 123 } } : {}),
    };
  }

  function worldSnapshotV2Fixture() {
    return {
      authoritySchemaVersion: 5,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      matchSeed: 7,
      tick: 3,
      activeTick: 3,
      phase: 'running',
      remainingTicks: 97,
      eventSequence: 4,
      participants: [{
        id: 'p1',
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
          commitment: {
            status: 'committed',
            chargeTicks: 2,
            chargeLevel: 1,
            facingAtStart: { x: 1, z: 0 },
            facingAtResult: { x: -1, z: 0 },
          },
        },
        actionRule: { range: 2 },
        movement: {
          schemaVersion: 2,
          participantId: 'p1',
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
      }],
      equipment: [],
      activeSupplyProjection: null,
      map: {
        schemaVersion: 1,
        definitionId: 'main-map',
        nextActiveTick: 3,
        revision: 0,
        surfaces: [{ id: 'main', enabled: true, revision: 0 }],
        occurrences: [{
          occurrenceId: 'hazard:1',
          eventId: 'hazard-event',
          kind: 'warning',
          warningTick: 1,
          startTick: 2,
          endTick: 4,
          phase: 'active',
          publicPayload: { intensity: 1 },
          revision: 0,
        }],
      },
      result: null,
    };
  }

  function localSidecarFixture() {
    return {
      schemaVersion: 2,
      tick: 3,
      eventSequence: 4,
      participantId: 'p1',
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

  it('audits complete V2 world frames and each least-privilege sidecar profile', () => {
    const world = worldSnapshotV2Fixture();
    const local = localSidecarFixture();
    const bot = {
      schemaVersion: 2,
      tick: 3,
      eventSequence: 4,
      participantId: 'p1',
      profile: ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
      channels: {
        jump: {
          kind: ACTION_RESOLUTION_KIND.IGNORED,
          actionDefinitionId: 'arena.action.jump',
          lane: 'mobility',
          source: 'bot-command',
          reason: 'cooldown',
        },
        slam: {
          kind: ACTION_RESOLUTION_KIND.NONE,
          actionDefinitionId: null,
          lane: null,
          source: null,
          reason: 'not-requested',
        },
      },
    };
    const full = {
      ...local,
      profile: ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
      channels: {
        ...local.channels,
        jump: bot.channels.jump,
        slam: bot.channels.slam,
      },
    };

    const auditedWorld = createWorldSnapshotV2Audit(world);
    const auditedLocal = createLocalActionSidecarV2Audit(local, world);
    const auditedBot = createBotMobilitySidecarV2Audit(bot, world);
    const auditedFull = createFullAuditSidecarV2Audit(full, world);
    const frame = createMatchReadFrameV2Audit({
      schemaVersion: 2,
      worldSnapshot: world,
      localActionSidecar: local,
    });

    expect(auditedWorld.map.occurrences[0]?.occurrenceId).toBe('hazard:1');
    expect(auditedLocal.channels.primary.kind).toBe(ACTION_RESOLUTION_KIND.SELECTED);
    expect(auditedBot.channels.jump.kind).toBe(ACTION_RESOLUTION_KIND.IGNORED);
    expect(auditedFull.channels.slam.kind).toBe(ACTION_RESOLUTION_KIND.NONE);
    expect(frame.localActionSidecar.tick).toBe(frame.worldSnapshot.tick);
    expect([
      auditedWorld,
      auditedWorld.participants[0],
      auditedLocal,
      auditedLocal.channels,
      auditedBot,
      auditedFull,
      frame,
    ].every(Object.isFrozen)).toBe(true);
  });

  it('fails closed on malformed or cross-identity V2 read data without invoking accessors', () => {
    const world = worldSnapshotV2Fixture();
    const local = localSidecarFixture();
    let getterCalls = 0;
    const hostile = { ...local };
    Object.defineProperty(hostile, 'profile', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY;
      },
    });

    expect(() => createLocalActionSidecarV2Audit(hostile, world)).toThrow(/data field|\u6570\u636e\u5b57\u6bb5/);
    expect(getterCalls).toBe(0);
    expect(() => createMatchReadFrameV2Audit({
      schemaVersion: 2,
      worldSnapshot: world,
      localActionSidecar: null,
    })).toThrow(/localActionSidecar/);
    expect(() => createMatchReadFrameV2Audit({
      schemaVersion: 2,
      worldSnapshot: world,
      localActionSidecar: local,
      future: true,
    })).toThrow(/future/);
    expect(() => createLocalActionSidecarV2Audit({ ...local, tick: 2 }, world))
      .toThrow(/identity/);
    expect(() => createLocalActionSidecarV2Audit({ ...local, participantId: 'foreign' }, world))
      .toThrow(/participantId/);
    expect(() => createLocalActionSidecarV2Audit({
      ...local,
      profile: ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
    }, world)).toThrow(/profile/);
    expect(() => createLocalActionSidecarV2Audit({
      ...local,
      primaryActionDefinitionId: 'other-action',
    }, world)).toThrow(/primaryActionDefinitionId/);
    expect(() => createLocalActionSidecarV2Audit({
      ...local,
      channels: {
        ...local.channels,
        primaryHold: {
          ...local.channels.primaryHold,
          kind: ACTION_RESOLUTION_KIND.SELECTED,
        },
      },
    }, world)).toThrow(/selected/);
    expect(() => createLocalActionSidecarV2Audit({
      ...local,
      channels: {
        ...local.channels,
        primary: {
          ...local.channels.primary,
          kind: 'future-kind',
        },
      },
    }, world)).toThrow(/ActionResolutionKind/);
    expect(() => createBotMobilitySidecarV2Audit({
      schemaVersion: 2,
      tick: 3,
      eventSequence: 4,
      participantId: 'p1',
      profile: ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
      channels: { jump: local.channels.primary },
    }, world)).toThrow(/slam/);
    expect(() => requireArenaSurvivalSupplyProjectionV2(world)).toThrow(/activeSupplyProjection/);
  });

  it('cross-validates V2 world lifecycle, equipment ownership, terminal result and supply view', () => {
    const world = worldSnapshotV2Fixture();
    const participant = world.participants[0]!;
    const heldRuntime = {
      schemaVersion: 1,
      instanceId: 'held:hammer',
      definitionId: 'hammer',
      spawnId: 'held-spawn',
      locationState: 'held',
      ownerId: 'p1',
      position: null,
      lastSafePosition: { x: 0, y: 1, z: 0 },
      cooldownRemainingTicks: 2,
      revision: 1,
    };
    const heldWorld = {
      ...world,
      participants: [{
        ...participant,
        equipment: {
          instanceId: heldRuntime.instanceId,
          definitionId: heldRuntime.definitionId,
          cooldownRemainingTicks: heldRuntime.cooldownRemainingTicks,
        },
      }],
      equipment: [heldRuntime],
    };
    expect(createWorldSnapshotV2Audit(heldWorld).participants[0]?.equipment?.instanceId)
      .toBe(heldRuntime.instanceId);

    const endedWorld = {
      ...world,
      phase: 'ended',
      result: { winnerId: 'p1', reason: 'hard-limit', isDraw: false, endedAtTick: 2 },
    };
    expect(createWorldSnapshotV2Audit(endedWorld).result?.winnerId).toBe('p1');
    expect(createWorldSnapshotV2Audit({
      ...endedWorld,
      result: { winnerId: null, reason: 'draw', isDraw: true, endedAtTick: 3 },
    }).result?.isDraw).toBe(true);

    const supplyRuntime = {
      ...heldRuntime,
      instanceId: 'supply:equipment',
      spawnId: 'supply-left',
      locationState: 'spawned',
      ownerId: null,
      position: { x: 0, y: 1, z: 0 },
      cooldownRemainingTicks: 0,
    };
    const survivalWorld = {
      ...world,
      equipment: [supplyRuntime],
      activeSupplyProjection: {
        schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
        snapshotTick: 3,
        snapshotEventSequence: 4,
        resyncReadiness: 'ready',
        pendingAuthorityTick: null,
        pendingExpiryEquipmentInstanceIds: [],
        supplies: [{
          schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
          supplyDefinitionId: 'arena-v2.survival-supply.v1',
          supplyId: 'supply:1',
          slotId: 'left',
          equipmentInstanceId: supplyRuntime.instanceId,
          equipmentDefinitionId: supplyRuntime.definitionId,
          equipmentSpawnId: supplyRuntime.spawnId,
          spawnPosition: { x: 0, y: 1, z: 0 },
          spawnTick: 0,
          expireTick: 10,
          remainingTicks: 7,
          position: { x: 0, y: 1, z: 0 },
        }],
      },
    };
    expect(requireArenaSurvivalSupplyProjectionV2(survivalWorld).supplies[0]?.remainingTicks)
      .toBe(7);

    expect(() => createWorldSnapshotV2Audit({ ...world, configHash: 'short' }))
      .toThrow(/8/);
    expect(() => createWorldSnapshotV2Audit({ ...world, matchSeed: 0x100000000 }))
      .toThrow(/uint32/);
    expect(() => createWorldSnapshotV2Audit({ ...world, activeTick: 4 }))
      .toThrow(/activeTick/);
    expect(() => createWorldSnapshotV2Audit({ ...world, phase: 'future' }))
      .toThrow(/phase/);
    expect(() => createWorldSnapshotV2Audit({ ...world, participants: [] }))
      .toThrow(/participants/);
    expect(() => createWorldSnapshotV2Audit({ ...world, equipment: null }))
      .toThrow(/equipment/);
    expect(() => createWorldSnapshotV2Audit({
      ...world,
      participants: [participant, participant],
    })).toThrow(/\u91cd\u590d/);
    expect(() => createWorldSnapshotV2Audit({
      ...world,
      participants: [{ ...participant, lastHitBy: 'foreign' }],
    })).toThrow(/lastHitBy/);
    expect(() => createWorldSnapshotV2Audit({
      ...world,
      participants: [{
        ...participant,
        movement: { ...participant.movement, participantId: 'foreign' },
      }],
    })).toThrow(/movement.participantId/);
    expect(() => createWorldSnapshotV2Audit({
      ...world,
      participants: [{ ...participant, equipment: heldWorld.participants[0]?.equipment }],
    })).toThrow(/\u7f3a\u5c11 runtime/);
    expect(() => createWorldSnapshotV2Audit({
      ...heldWorld,
      participants: [participant],
    })).toThrow(/\u7f3a\u5c11 participant.equipment/);
    expect(() => createWorldSnapshotV2Audit({
      ...heldWorld,
      participants: [{
        ...heldWorld.participants[0],
        equipment: { ...heldWorld.participants[0]?.equipment, definitionId: 'other' },
      }],
    })).toThrow(/definition/);
    expect(() => createWorldSnapshotV2Audit({
      ...world,
      equipment: [{ ...supplyRuntime, locationState: 'spawned', ownerId: 'p1' }],
    })).toThrow(/world owner\/position/);
    expect(() => createWorldSnapshotV2Audit({
      ...world,
      map: {
        ...world.map,
        occurrences: [{ ...world.map.occurrences[0], warningTick: 3, startTick: 2 }],
      },
    })).toThrow(/tick \u987a\u5e8f/);
    expect(() => createWorldSnapshotV2Audit({ ...world, result: endedWorld.result }))
      .toThrow(/ended phase/);
    expect(() => createWorldSnapshotV2Audit({ ...endedWorld, result: null }))
      .toThrow(/\u5fc5\u987b\u643a\u5e26 result/);
    expect(() => createWorldSnapshotV2Audit({
      ...endedWorld,
      result: { ...endedWorld.result, winnerId: 'foreign' },
    })).toThrow(/winnerId/);
    expect(() => createWorldSnapshotV2Audit({
      ...endedWorld,
      result: { ...endedWorld.result, endedAtTick: 4 },
    })).toThrow(/endedAtTick/);
  });

  it('audits public and internal MatchCore snapshots outside the per-tick hot path', () => {
    const publicSnapshot = createArenaMatchSnapshotAudit(snapshotFixture());
    expect(Object.isFrozen(publicSnapshot)).toBe(true);
    expect(Object.isFrozen(publicSnapshot.participants[0])).toBe(true);
    expect(createArenaMatchSnapshotAudit(snapshotFixture(true), { includeInternal: true }).rngStates)
      .toEqual({ combat: 123 });
    expect(() => createArenaMatchSnapshotAudit({
      ...snapshotFixture(),
      unknown: true,
    })).toThrow(/unknown/);
    const supplyProjection = {
      ...snapshotFixture(),
      equipment: [{
        schemaVersion: 1,
        instanceId: 'supply:equipment',
        definitionId: 'hammer',
        spawnId: 'supply-left',
        locationState: 'spawned',
        ownerId: null,
        position: { x: 0, y: 1, z: 0 },
        lastSafePosition: { x: 0, y: 1, z: 0 },
        cooldownRemainingTicks: 0,
        revision: 0,
      }],
      activeSupplyProjection: {
        schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
        snapshotTick: 3,
        snapshotEventSequence: 4,
        resyncReadiness: 'ready',
        pendingAuthorityTick: null,
        pendingExpiryEquipmentInstanceIds: [],
        supplies: [{
          schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
          supplyDefinitionId: 'arena-v2.survival-supply.v1',
          supplyId: 'supply:1',
          slotId: 'left',
          equipmentInstanceId: 'supply:equipment',
          equipmentDefinitionId: 'hammer',
          equipmentSpawnId: 'supply-left',
          spawnPosition: { x: 0, y: 1, z: 0 },
          spawnTick: 0,
          expireTick: 10,
          remainingTicks: 7,
          position: { x: 0, y: 1, z: 0 },
        }],
      },
    };
    expect(createArenaMatchSnapshotAudit(supplyProjection).activeSupplyProjection?.supplies[0])
      .toMatchObject({ remainingTicks: 7, equipmentInstanceId: 'supply:equipment' });
    expect(() => createArenaPublicSupplyProjectionAudit({
      ...supplyProjection.activeSupplyProjection,
      schemaVersion: 1,
    }, {
      snapshotTick: 3,
      eventSequence: 4,
      equipment: supplyProjection.equipment,
    })).toThrow(/必须是 2/);
    expect(() => createArenaMatchSnapshotAudit({
      ...supplyProjection,
      equipment: [{
        ...supplyProjection.equipment[0],
        locationState: 'held',
      }],
    })).toThrow(/不能连接非世界 equipment/);
    expect(() => createArenaMatchSnapshotAudit({
      ...supplyProjection,
      activeSupplyProjection: {
        ...supplyProjection.activeSupplyProjection,
        snapshotEventSequence: 3,
      },
    })).toThrow(/eventSequence/);
    expect(() => createArenaMatchSnapshotAudit({
      ...supplyProjection,
      activeSupplyProjection: {
        ...supplyProjection.activeSupplyProjection,
        supplies: [{
          ...supplyProjection.activeSupplyProjection.supplies[0],
          remainingTicks: 0,
        }],
      },
    })).toThrow(/remainingTicks/);
    expect(() => createArenaPublicSupplyProjectionAudit(
      supplyProjection.activeSupplyProjection,
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: supplyProjection.equipment,
        expectedWorldSupplyEquipmentInstanceIds: [],
      },
    )).toThrow(/集合与 active supply projection/);
    expect(assertArenaPublicSupplyProjectionResyncReady(
      supplyProjection.activeSupplyProjection,
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: supplyProjection.equipment,
        expectedWorldSupplyEquipmentInstanceIds: ['supply:equipment'],
      },
    ).pendingAuthorityTick).toBeNull();
    const preExpiry = {
      ...supplyProjection.activeSupplyProjection,
      snapshotTick: 1_800,
      snapshotEventSequence: 4,
      resyncReadiness: 'not-ready-pre-expiry' as const,
      pendingAuthorityTick: 1_800,
      pendingExpiryEquipmentInstanceIds: ['pending:equipment'],
      supplies: [],
    };
    expect(() => assertArenaPublicSupplyProjectionResyncReady(preExpiry, {
      snapshotTick: 1_800,
      eventSequence: 4,
      equipment: [],
      expectedWorldSupplyEquipmentInstanceIds: [],
    })).toThrow(/不是 resync-ready/);
    expect(() => createArenaPublicSupplyProjectionAudit({
      ...preExpiry,
      pendingExpiryEquipmentInstanceIds: [
        'pending:0',
        'pending:1',
        'pending:2',
        'pending:3',
      ],
    }, {
      snapshotTick: 1_800,
      eventSequence: 4,
      equipment: [],
    })).toThrow(/超过有界 active 数量/);
    const formalSupplyId = 'arena-v2.survival-supply.v1:wave-0:slot-left';
    const formalEquipmentId = `${formalSupplyId}:equipment`;
    const formalContract = {
      supplyDefinitionId: 'arena-v2.survival-supply.v1',
      firstSpawnTick: 0,
      spawnIntervalTicks: 1_200,
      spawnCount: 1,
      lifetimeTicks: 10,
      spawnSpecs: [{
        slotId: 'left',
        equipmentDefinitionId: 'hammer',
        spawnId: 'supply-left',
        position: { x: 0, y: 1, z: 0 },
      }],
      equipmentDefinitionIds: ['hammer'],
    } as const;
    const formalProjection = {
      ...supplyProjection,
      equipment: [{
        ...supplyProjection.equipment[0],
        instanceId: formalEquipmentId,
      }],
      activeSupplyProjection: {
        ...supplyProjection.activeSupplyProjection,
        supplies: [{
          ...supplyProjection.activeSupplyProjection.supplies[0],
          supplyId: formalSupplyId,
          equipmentInstanceId: formalEquipmentId,
          spawnPosition: { x: 0, y: 1, z: 0 },
        }],
      },
    };
    expect(createArenaPublicSupplyProjectionAudit(
      formalProjection.activeSupplyProjection,
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: formalProjection.equipment,
        lifecycleContract: formalContract,
      },
    ).supplies[0]?.supplyId).toBe(formalSupplyId);
    expect(() => createArenaPublicSupplyProjectionAudit(
      { ...formalProjection.activeSupplyProjection, supplies: [] },
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: formalProjection.equipment,
        lifecycleContract: formalContract,
      },
    )).toThrow(/集合与 active supply projection/);
    expect(() => requireArenaPublicSupplyProjection(undefined, {
      snapshotTick: 3,
      eventSequence: 4,
      equipment: formalProjection.equipment,
      lifecycleContract: formalContract,
    })).toThrow(/缺少 activeSupplyProjection/);
    expect(() => createArenaPublicSupplyProjectionAudit(
      {
        ...formalProjection.activeSupplyProjection,
        supplies: [{
          ...formalProjection.activeSupplyProjection.supplies[0],
          spawnPosition: { x: 99, y: 1, z: 0 },
        }],
      },
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: formalProjection.equipment,
        lifecycleContract: formalContract,
      },
    )).toThrow(/spawnPosition/);
    expect(() => createArenaPublicSupplyProjectionAudit(
      {
        ...formalProjection.activeSupplyProjection,
        supplies: [{
          ...formalProjection.activeSupplyProjection.supplies[0],
          expireTick: 11,
        }],
      },
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: formalProjection.equipment,
        lifecycleContract: formalContract,
      },
    )).toThrow(/expireTick/);

    const formalWorldEquipment = formalProjection.equipment[0];
    const formalActiveProjection = {
      ...formalProjection.activeSupplyProjection,
      pendingExpiryEquipmentInstanceIds: [],
    };
    expect(() => createArenaPublicSupplyProjectionAudit(
      { ...formalActiveProjection, supplies: [] },
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: [{
          ...formalWorldEquipment,
          instanceId: 'arena-v2.survival-supply.v1:wave-1:slot-left:equipment',
        }],
        lifecycleContract: formalContract,
      },
    )).toThrow(/spawnTick 前/);
    expect(() => createArenaPublicSupplyProjectionAudit(
      { ...formalActiveProjection, snapshotTick: 11, supplies: [] },
      {
        snapshotTick: 11,
        eventSequence: 4,
        equipment: [formalWorldEquipment],
        lifecycleContract: formalContract,
      },
    )).toThrow(/expireTick 后/);
    expect(() => createArenaPublicSupplyProjectionAudit(
      { ...formalActiveProjection, supplies: [] },
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: [{
          ...formalWorldEquipment,
          definitionId: 'chain',
          spawnId: 'tampered-spawn',
        }],
        lifecycleContract: formalContract,
      },
    )).toThrow(/definition\/spawn/);
    expect(() => createArenaPublicSupplyProjectionAudit(
      { ...formalActiveProjection, supplies: [] },
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: [{
          ...formalWorldEquipment,
          instanceId: 'arena-v2.survival-supply.v1:wave-0:slot-right:equipment',
          definitionId: 'chain',
          spawnId: 'right-spawn',
        }],
        lifecycleContract: formalContract,
      },
    )).toThrow(/slot 未在冻结 spawn spec/);
    expect(() => createArenaPublicSupplyProjectionAudit(
      { ...formalActiveProjection, supplies: [] },
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: [{
          ...formalWorldEquipment,
          instanceId: 'ordinary-equipment',
          definitionId: 'ordinary',
          spawnId: 'ordinary-spawn',
        }],
        lifecycleContract: formalContract,
      },
    )).toThrow(/未映射到正式 supply identity/);
    for (const locationState of ['held', 'despawned'] as const) {
      expect(() => createArenaPublicSupplyProjectionAudit(
        {
          ...formalActiveProjection,
          snapshotTick: 10,
          resyncReadiness: 'not-ready-pre-expiry',
          pendingAuthorityTick: 10,
          pendingExpiryEquipmentInstanceIds: [formalEquipmentId],
          supplies: [],
        },
        {
          snapshotTick: 10,
          eventSequence: 4,
          equipment: [{
            ...formalWorldEquipment,
            locationState,
            ownerId: locationState === 'held' ? 'player-1' : null,
            position: null,
          }],
          lifecycleContract: formalContract,
        },
      )).toThrow(/nonWorld equipment/);
    }
    expect(() => createArenaPublicSupplyProjectionAudit(
      { ...formalActiveProjection, supplies: [] },
      {
        snapshotTick: 3,
        eventSequence: 4,
        equipment: [formalWorldEquipment],
        expectedWorldSupplyEquipmentInstanceIds: [],
        lifecycleContract: formalContract,
      },
    )).toThrow(/显式 expected world supply 集合/);

    const pendingContract = {
      ...formalContract,
      firstSpawnTick: 1_200,
      lifetimeTicks: 600,
    } as const;
    const pendingSupplyId = 'arena-v2.survival-supply.v1:wave-0:slot-left';
    const pendingEquipmentId = `${pendingSupplyId}:equipment`;
    const pendingProjection = {
      ...formalActiveProjection,
      snapshotTick: 1_800,
      snapshotEventSequence: 4,
      resyncReadiness: 'not-ready-pre-expiry' as const,
      pendingAuthorityTick: 1_800,
      pendingExpiryEquipmentInstanceIds: [pendingEquipmentId],
      supplies: [],
    };
    expect(requireArenaPublicSupplyProjection(pendingProjection, {
      snapshotTick: 1_800,
      eventSequence: 4,
      equipment: [],
      lifecycleContract: pendingContract,
    }).pendingExpiryEquipmentInstanceIds).toEqual([pendingEquipmentId]);
    expect(() => assertArenaPublicSupplyProjectionResyncReady(pendingProjection, {
      snapshotTick: 1_800,
      eventSequence: 4,
      equipment: [],
      lifecycleContract: pendingContract,
    })).toThrow(/不是 resync-ready/);
    expect(() => requireArenaPublicSupplyProjection({
      ...pendingProjection,
      pendingExpiryEquipmentInstanceIds: [pendingEquipmentId],
      snapshotTick: 1_799,
      pendingAuthorityTick: 1_799,
    }, {
      snapshotTick: 1_799,
      eventSequence: 4,
      equipment: [],
      lifecycleContract: pendingContract,
    })).toThrow(/expireTick 等于 snapshotTick/);
    expect(requireArenaPublicSupplyProjection({
      ...pendingProjection,
      snapshotTick: 1_801,
      resyncReadiness: 'ready',
      pendingAuthorityTick: null,
      pendingExpiryEquipmentInstanceIds: [],
    }, {
      snapshotTick: 1_801,
      eventSequence: 4,
      equipment: [],
      lifecycleContract: pendingContract,
    }).resyncReadiness).toBe('ready');
    expect(requireArenaPublicSupplyProjection({
      ...formalActiveProjection,
      supplies: [],
    }, {
      snapshotTick: 3,
      eventSequence: 4,
      equipment: [{
        ...formalWorldEquipment,
        locationState: 'despawned',
        ownerId: null,
        position: null,
      }],
      lifecycleContract: formalContract,
    }).supplies).toEqual([]);
    const accessor = snapshotFixture();
    Object.defineProperty(accessor, 'tick', { enumerable: true, get: () => 3 });
    expect(() => createArenaMatchSnapshotAudit(accessor)).toThrow(/数据字段/);
  });

  it('audits legacy full snapshots with rich nested state and rejects identity drift', () => {
    const base = snapshotFixture();
    const participant = base.participants[0]!;
    const richSnapshot = {
      ...base,
      phase: 'ended',
      participants: [{
        ...participant,
        action: {
          ...participant.action,
          commitment: {
            status: 'committed',
            chargeTicks: 2,
            chargeLevel: 1,
            facingAtStart: { x: 1, z: 0 },
            facingAtResult: { x: -1, z: 0 },
          },
        },
        equipment: {
          instanceId: 'held:hammer',
          definitionId: 'hammer',
          cooldownRemainingTicks: 2,
        },
      }],
      equipment: [{
        schemaVersion: 1,
        instanceId: 'held:hammer',
        definitionId: 'hammer',
        spawnId: 'held-spawn',
        locationState: 'held',
        ownerId: 'p1',
        position: null,
        lastSafePosition: { x: 0, y: 1, z: 0 },
        cooldownRemainingTicks: 2,
        revision: 1,
      }],
      map: {
        ...base.map,
        occurrences: [{
          occurrenceId: 'hazard:1',
          eventId: 'hazard-event',
          kind: 'warning',
          warningTick: 1,
          startTick: 2,
          endTick: 4,
          phase: 'active',
          publicPayload: { intensity: 1 },
          revision: 0,
        }],
      },
      result: { winnerId: 'p1', reason: 'hard-limit', isDraw: false, endedAtTick: 3 },
    };
    expect(createArenaMatchSnapshotAudit(richSnapshot).result?.winnerId).toBe('p1');

    const internal = snapshotFixture(true);
    expect(createArenaMatchSnapshotAudit({
      ...internal,
      map: {
        ...internal.map,
        occurrences: [{
          occurrenceId: 'internal:1',
          eventId: 'internal-event',
          kind: 'planned',
          warningTick: 1,
          startTick: 2,
          endTick: null,
          phase: 'warning',
          publicPayload: {},
          privatePlan: { stream: 'map' },
          revision: 0,
        }],
      },
    }, { includeInternal: true }).map.occurrences[0]?.privatePlan).toEqual({ stream: 'map' });

    expect(() => createArenaMatchSnapshotAudit(base, { includeInternal: 'yes' } as never))
      .toThrow(/includeInternal/);
    expect(() => createArenaMatchSnapshotAudit({ ...base, matchSeed: 0x100000000 }))
      .toThrow(/uint32/);
    expect(() => createArenaMatchSnapshotAudit({ ...base, activeTick: 4 }))
      .toThrow(/activeTick/);
    expect(() => createArenaMatchSnapshotAudit({ ...base, participants: [] }))
      .toThrow(/participants/);
    expect(() => createArenaMatchSnapshotAudit({ ...base, equipment: null }))
      .toThrow(/equipment/);
    expect(() => createArenaMatchSnapshotAudit({
      ...base,
      participants: [snapshotFixture(true).participants[0]],
    })).toThrow(/actionAffordance/);
    expect(() => createArenaMatchSnapshotAudit({
      ...base,
      participants: [participant, participant],
    })).toThrow(/\u91cd\u590d/);
    expect(() => createArenaMatchSnapshotAudit({
      ...base,
      participants: [{
        ...participant,
        movement: { ...participant.movement, characterDefinitionId: 'other' },
      }],
    })).toThrow(/movement.characterDefinitionId/);
    expect(() => createArenaMatchSnapshotAudit({
      ...base,
      map: { ...base.map, surfaces: null },
    })).toThrow(/surfaces\/occurrences/);
    expect(() => createArenaMatchSnapshotAudit({
      ...richSnapshot,
      result: { ...richSnapshot.result, winnerId: 'foreign' },
    })).toThrow(/winnerId/);
    expect(() => createArenaMatchSnapshotAudit({ ...internal, rngStates: undefined }, {
      includeInternal: true,
    })).toThrow(/rngStates/);
    expect(() => createArenaMatchSnapshotAudit({
      ...internal,
      rngStates: { combat: 0x100000000 },
    }, { includeInternal: true })).toThrow(/uint32/);
  });

  it('normalizes complete InputFrame batches and fills missing participants deterministically', () => {
    const frame: ArenaInputFrame = createNeutralInputFrame(3, 'p1');
    expect(normalizeInputFrames([{ ...frame, moveX: 1, moveZ: 1 }], {
      tick: 3,
      participantIds: ['p1', 'p2'],
    })).toEqual([
      { ...frame, moveX: 1 / Math.hypot(1, 1), moveZ: 1 / Math.hypot(1, 1) },
      createNeutralInputFrame(3, 'p2'),
    ]);
    expect(() => normalizeInputFrames([frame, frame], {
      tick: 3,
      participantIds: ['p1'],
    })).toThrow(/重复输入/);
  });

  it('publishes one typed authority event vocabulary', () => {
    const event: ArenaMatchEventType = ARENA_MATCH_EVENT.HIT_RESOLVED;
    expect(event).toBe('HitResolved');
    expect(Object.isFrozen(ARENA_MATCH_EVENT)).toBe(true);
  });

  it('publishes frozen versioned supply spawn, replacement, recycle and expiry payloads', () => {
    const identity = {
      schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
      supplyDefinitionId: 'arena-v2.survival-supply.v1',
      supplyId: 'wave-1:left',
      equipmentInstanceId: 'wave-1:left:hammer',
      spawnTick: 1_200,
      expireTick: 1_800,
    };
    const spawned: EquipmentSpawnedEventPayload = createEquipmentSpawnedEventPayload({
      ...identity,
      tick: identity.spawnTick,
      equipmentDefinitionId: 'hammer',
      spawnId: 'left',
      position: { x: -1, y: 1, z: 0 },
    });
    const replaced: EquipmentReplacedEventPayload = createEquipmentReplacedEventPayload({
      ...identity,
      tick: 1_250,
      participantId: 'player-1',
      previousEquipmentInstanceId: 'held:chain',
      nextEquipmentInstanceId: identity.equipmentInstanceId,
    });
    const recycled: EquipmentRecycledEventPayload = createEquipmentRecycledEventPayload({
      ...identity,
      tick: 1_250,
      participantId: 'player-1',
      recycledEquipmentInstanceId: 'held:chain',
      replacementEquipmentInstanceId: identity.equipmentInstanceId,
      reason: EQUIPMENT_RECYCLE_REASON.REPLACED,
    });
    const expired: EquipmentExpiredEventPayload = createEquipmentExpiredEventPayload({
      ...identity,
      tick: 1_800,
      expiredEquipmentInstanceId: identity.equipmentInstanceId,
      reason: EQUIPMENT_EXPIRY_REASON.LIFETIME_EXPIRED,
    });

    expect(spawned.tick).toBe(spawned.spawnTick);
    expect(replaced.nextEquipmentInstanceId).toBe(identity.equipmentInstanceId);
    expect(recycled.reason).toBe('replaced');
    expect(expired.tick).toBe(expired.expireTick);
    expect([spawned, replaced, recycled, expired].every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(spawned.position)).toBe(true);
  });

  it('rejects ambiguous or unsafe supply event payloads before publication', () => {
    const replaced = {
      schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
      supplyDefinitionId: 'arena-v2.survival-supply.v1',
      supplyId: 'wave-1:left',
      equipmentInstanceId: 'wave-1:left:hammer',
      spawnTick: 1_200,
      expireTick: 1_800,
      tick: 1_250,
      participantId: 'player-1',
      previousEquipmentInstanceId: 'held:chain',
      nextEquipmentInstanceId: 'wave-1:left:hammer',
    };
    expect(() => createEquipmentReplacedEventPayload({ ...replaced, schemaVersion: 2 }))
      .toThrow(/schemaVersion/);
    expect(() => createEquipmentReplacedEventPayload({ ...replaced, futureField: true }))
      .toThrow(/futureField/);
    expect(() => createEquipmentReplacedEventPayload({
      ...replaced,
      get tick() {
        throw new Error('getter must not run');
      },
    })).toThrow(/数据字段/);
    expect(() => createEquipmentReplacedEventPayload({
      ...replaced,
      tick: Number.MAX_SAFE_INTEGER + 1,
    })).toThrow(/tick/);
    expect(() => createEquipmentReplacedEventPayload({
      ...replaced,
      nextEquipmentInstanceId: 'other-equipment',
    })).toThrow(/供给身份不一致/);
    expect(() => createEquipmentSpawnedEventPayload({
      schemaVersion: replaced.schemaVersion,
      supplyDefinitionId: replaced.supplyDefinitionId,
      supplyId: replaced.supplyId,
      equipmentInstanceId: replaced.equipmentInstanceId,
      spawnTick: replaced.spawnTick,
      expireTick: replaced.expireTick,
      tick: replaced.spawnTick + 1,
      equipmentDefinitionId: 'hammer',
      spawnId: 'left',
      position: { x: 0, y: 1, z: 0 },
    })).toThrow(/tick 必须等于 spawnTick/);
    expect(() => createEquipmentSpawnedEventPayload({
      schemaVersion: replaced.schemaVersion,
      supplyDefinitionId: replaced.supplyDefinitionId,
      supplyId: replaced.supplyId,
      equipmentInstanceId: replaced.equipmentInstanceId,
      spawnTick: replaced.spawnTick,
      expireTick: replaced.expireTick,
      tick: replaced.spawnTick,
      equipmentDefinitionId: 'hammer',
      spawnId: 'left',
      position: { x: Number.NaN, y: 1, z: 0 },
    })).toThrow(/有限数/);
    expect(() => createEquipmentRecycledEventPayload({
      schemaVersion: replaced.schemaVersion,
      supplyDefinitionId: replaced.supplyDefinitionId,
      supplyId: replaced.supplyId,
      equipmentInstanceId: replaced.equipmentInstanceId,
      spawnTick: replaced.spawnTick,
      expireTick: replaced.expireTick,
      tick: replaced.tick,
      participantId: replaced.participantId,
      recycledEquipmentInstanceId: 'held:chain',
      replacementEquipmentInstanceId: 'other-equipment',
      reason: EQUIPMENT_RECYCLE_REASON.REPLACED,
    })).toThrow(/供给身份不一致/);
    expect(() => createEquipmentExpiredEventPayload({
      schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
      supplyDefinitionId: replaced.supplyDefinitionId,
      supplyId: replaced.supplyId,
      equipmentInstanceId: replaced.equipmentInstanceId,
      spawnTick: replaced.spawnTick,
      expireTick: replaced.expireTick,
      tick: 1_799,
      expiredEquipmentInstanceId: replaced.equipmentInstanceId,
      reason: EQUIPMENT_EXPIRY_REASON.LIFETIME_EXPIRED,
    })).toThrow(/tick 必须等于 expireTick/);
  });

  it('rejects invalid supply lifecycle transitions and identity substitutions', () => {
    const identity = {
      schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
      supplyDefinitionId: 'arena-v2.survival-supply.v1',
      supplyId: 'wave-1:left',
      equipmentInstanceId: 'wave-1:left:hammer',
      spawnTick: 1_200,
      expireTick: 1_800,
    };
    const replaced = {
      ...identity,
      tick: 1_250,
      participantId: 'player-1',
      previousEquipmentInstanceId: 'held:chain',
      nextEquipmentInstanceId: 'wave-1:left:hammer',
    };
    expect(() => createEquipmentReplacedEventPayload({
      ...replaced,
      expireTick: replaced.spawnTick,
    })).toThrow(/expireTick/);
    expect(() => createEquipmentReplacedEventPayload({
      ...replaced,
      tick: replaced.spawnTick - 1,
    })).toThrow(/spawnTick/);
    expect(() => createEquipmentReplacedEventPayload({
      ...replaced,
      previousEquipmentInstanceId: replaced.nextEquipmentInstanceId,
    })).toThrow(/equipment identity/);
    expect(() => createEquipmentRecycledEventPayload({
      ...identity,
      tick: replaced.tick,
      participantId: replaced.participantId,
      recycledEquipmentInstanceId: 'held:chain',
      replacementEquipmentInstanceId: replaced.equipmentInstanceId,
      reason: 'future-reason',
    })).toThrow(/reason/);
    expect(() => createEquipmentRecycledEventPayload({
      ...identity,
      tick: replaced.tick,
      participantId: replaced.participantId,
      recycledEquipmentInstanceId: replaced.equipmentInstanceId,
      replacementEquipmentInstanceId: replaced.equipmentInstanceId,
      reason: EQUIPMENT_RECYCLE_REASON.REPLACED,
    })).toThrow(/equipment identity/);
    expect(() => createEquipmentExpiredEventPayload({
      ...identity,
      tick: replaced.expireTick,
      expiredEquipmentInstanceId: replaced.equipmentInstanceId,
      reason: 'future-reason',
    })).toThrow(/reason/);
    expect(() => createEquipmentExpiredEventPayload({
      ...identity,
      tick: replaced.expireTick,
      expiredEquipmentInstanceId: 'other-equipment',
      reason: EQUIPMENT_EXPIRY_REASON.LIFETIME_EXPIRED,
    })).toThrow(/\u4f9b\u7ed9\u8eab\u4efd\u4e0d\u4e00\u81f4/);
  });

  it('adapts one synchronous storage boundary and rejects ambiguous host results', () => {
    const values = new Map<string, unknown>();
    const host = {
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: values.get(key) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        values.set(key, value);
        return true;
      },
      storageDelete(key: string) {
        return values.delete(key);
      },
    };
    const port = createSynchronousStoragePort(host, { label: 'Contract Test Storage' });
    expect(port.write('profile', { revision: 1 })).toBe(true);
    expect(port.read('profile')).toEqual({ ok: true, found: true, value: { revision: 1 } });
    expect(port.delete('profile')).toBe(true);
    expect(port.read('profile')).toEqual({ ok: true, found: false, value: undefined });
    expect(Object.isFrozen(port)).toBe(true);
    expect(Object.isFrozen(port.read('profile'))).toBe(true);

    expect(() => createSynchronousStoragePort({
      ...host,
      storageRead: () => ({ ok: false, found: true, value: null }),
    }).read('profile')).toThrow(/found/);
    expect(() => createSynchronousStoragePort({
      ...host,
      storageWrite: async () => true,
    }).write('profile', null)).toThrow(/同步完成/);
  });

  it('snapshots storage methods and rejects method or option accessors without executing them', () => {
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'storageRead', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return () => ({ ok: true, found: false, value: undefined });
      },
    });
    Object.defineProperties(hostile, {
      storageWrite: { enumerable: true, value: () => true },
      storageDelete: { enumerable: true, value: () => true },
    });
    expect(() => createSynchronousStoragePort(hostile)).toThrow(/访问器/);
    expect(getterCalls).toBe(0);

    const host = {
      storageRead: () => ({ ok: true, found: false, value: undefined }),
      storageWrite: () => true,
      storageDelete: () => true,
    };
    const port = createSynchronousStoragePort(host);
    host.storageRead = () => ({ ok: false, found: false, value: undefined });
    expect(port.read('snapshot')).toEqual({ ok: true, found: false, value: undefined });

    const options = Object.defineProperty({}, 'label', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'hostile';
      },
    });
    expect(() => createSynchronousStoragePort(host, options)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('deeply freezes canonical data without trusting accessors or insertion order', () => {
    const left = cloneFrozenData({ z: [3, 2, 1], a: { enabled: true } });
    const right = { a: { enabled: true }, z: [3, 2, 1] };
    expect(Object.isFrozen(left)).toBe(true);
    expect(Object.isFrozen(left.a)).toBe(true);
    expect(createDeterministicDataHash(left)).toBe(createDeterministicDataHash(right));
    expect(() => cloneFrozenData({
      get unsafe() {
        return 1;
      },
    })).toThrow(/数据字段/);
  });

  it('rejects schema drift and normalizes immutable string sets', () => {
    expect(() => assertKnownKeys({ id: 'arena', extra: true }, new Set(['id']), 'value'))
      .toThrow(/不支持字段 extra/);
    expect(cloneFrozenStringSet(['z', 'a'])).toEqual(['a', 'z']);
    expect(() => cloneFrozenStringSet(['same', 'same'])).toThrow(/重复项/);
  });

  it('preserves the frozen RNG sequence, bounded integers and named stream isolation', () => {
    const rng = createRng(12345);
    expect(Array.from({ length: 4 }, () => rng.next())).toEqual([
      0.9797282677609473,
      0.3067522644996643,
      0.484205421525985,
      0.817934412509203,
    ]);
    expect(deriveSeed(88, 'map')).toBe(deriveSeed(88, 'map'));
    expect(deriveSeed(88, 'map')).not.toBe(deriveSeed(88, 'bot'));
    const checkpoint = rng.snapshot();
    const expectedAfterRestore = rng.next();
    rng.restore(checkpoint);
    expect(rng.next()).toBe(expectedAfterRestore);
    expect(['left', 'right']).toContain(rng.pick(['left', 'right']));
    expect(() => rng.pick([])).toThrow(/\u975e\u7a7a\u6570\u7ec4/);
    expect(() => rng.restore(-1)).toThrow(/uint32/);
    expect(() => rng.int(0, 0x100000000)).toThrow(/不能超过 uint32/);
  });

  it('normalizes thrown values and preserves original plus cleanup failures', () => {
    const original = normalizeThrownError('host failed', 'Lifecycle');
    expect(original).toBeInstanceOf(Error);
    expect(original.message).toBe('Lifecycle：host failed');
    expect((original as Error & { originalError: unknown }).originalError).toBe('host failed');
    expect(combineCleanupFailure(original, [], 'unused')).toBe(original);

    const cleanup = new Error('cleanup failed');
    const cleanupErrors = [cleanup];
    const combined = combineCleanupFailure(original, cleanupErrors, 'aggregate failed') as Error & {
      originalError: Error;
      cleanupErrors: readonly Error[];
    };
    expect(combined.message).toBe('aggregate failed');
    expect(combined.originalError).toBe(original);
    expect(combined.cleanupErrors).toEqual([cleanup]);
    expect(combined.cleanupErrors).not.toBe(cleanupErrors);
    expect(Object.isFrozen(combined.cleanupErrors)).toBe(true);
  });
});
