import { describe, expect, it } from 'vitest';
import { CharacterRegistry } from '@number-strategy-jump/arena-definitions';
import {
  createArenaConfigHash,
  createCharacterRuntimeReference,
  createMatchStateHash,
  validateArenaReplay,
  type ArenaInternalMatchSnapshot,
} from '../src/index.js';

function character(id = 'fighter') {
  return {
    schemaVersion: 2,
    id,
    collision: { radius: 0.45, halfHeight: 0.55, mass: 1 },
    movement: {
      walkSpeed: 3,
      runSpeed: 6,
      runInputThreshold: 0.75,
      groundAcceleration: 42,
      airAcceleration: 14,
      maximumHorizontalSpeed: 8,
      automaticStepHeight: 0.25,
    },
    jump: {
      groundImpulse: 8,
      crouchImpulse: 10,
      airImpulse: 7,
      downSmashSpeed: 8,
      downSmashAccelerationPerTick: 1,
      maximumDownSmashSpeed: 16,
      coyoteTicks: 4,
      bufferTicks: 5,
      maximumAirJumps: 1,
      maximumCrouchChargeTicks: 30,
    },
    tags: ['test'],
  };
}

function snapshotFixture(): ArenaInternalMatchSnapshot {
  return {
    schemaVersion: 5,
    physicsBackendVersion: 'lightweight-v3',
    configHash: 'config-hash',
    ruleContentHash: 'rule-hash',
    matchSeed: 7,
    tick: 3,
    activeTick: 2,
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
      action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
      actionRule: null,
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
      position: { x: 0.125, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      facing: { x: 1, z: 0 },
      grounded: true,
      supportSurfaceId: 'main',
    }],
    equipment: [{
      schemaVersion: 1,
      instanceId: 'equipment-b',
      definitionId: 'hammer',
      spawnId: 'spawn-b',
      locationState: 'world',
      ownerId: null,
      position: { x: 2, y: 1, z: 0 },
      lastSafePosition: { x: 2, y: 1, z: 0 },
      cooldownRemainingTicks: 0,
      revision: 1,
    }, {
      schemaVersion: 1,
      instanceId: 'equipment-a',
      definitionId: 'shield',
      spawnId: 'spawn-a',
      locationState: 'world',
      ownerId: null,
      position: { x: -2, y: 1, z: 0 },
      lastSafePosition: { x: -2, y: 1, z: 0 },
      cooldownRemainingTicks: 0,
      revision: 1,
    }],
    map: {
      schemaVersion: 1,
      definitionId: 'main-map',
      nextActiveTick: 2,
      revision: 1,
      surfaces: [
        { id: 'right', enabled: true, revision: 0 },
        { id: 'left', enabled: true, revision: 0 },
      ],
      occurrences: [],
    },
    rngStates: { spawn: 11, map: 22 },
    result: null,
  };
}

describe('arena-match authority foundation', () => {
  it('rejects Replay accessors without evaluating untrusted code', () => {
    let reads = 0;
    const replay = Object.defineProperty({}, 'matchSeed', {
      enumerable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    expect(() => validateArenaReplay(replay)).toThrow(/访问器|数据字段/);
    expect(reads).toBe(0);
  });

  it('keeps character runtime as immutable validated identity only', () => {
    const registry = new CharacterRegistry([character()]);
    const runtime = createCharacterRuntimeReference({
      participantId: 'player-1',
      definitionId: 'fighter',
      characterRegistry: registry,
    });
    expect(runtime).toEqual({ participantId: 'player-1', definitionId: 'fighter' });
    expect(Object.isFrozen(runtime)).toBe(true);

    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'characterRegistry', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return registry;
      },
    });
    expect(() => createCharacterRuntimeReference(hostile as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('hashes config keys and unordered authority collections deterministically', () => {
    expect(createArenaConfigHash({ b: 2, a: 1 })).toBe(createArenaConfigHash({ a: 1, b: 2 }));
    const first = snapshotFixture();
    const reordered: ArenaInternalMatchSnapshot = {
      ...first,
      equipment: [...first.equipment].reverse(),
      map: { ...first.map, surfaces: [...first.map.surfaces].reverse() },
      rngStates: { map: 22, spawn: 11 },
    };
    expect(createMatchStateHash(first)).toBe(createMatchStateHash(reordered));
  });

  it('rejects non-finite or incomplete internal hash snapshots', () => {
    const snapshot = snapshotFixture();
    expect(() => createMatchStateHash({
      ...snapshot,
      participants: [{
        ...snapshot.participants[0]!,
        position: { x: Number.NaN, y: 1, z: 0 },
      }],
    })).toThrow(/非有限数/);
    expect(() => createMatchStateHash({
      ...snapshot,
      map: null,
    } as unknown as ArenaInternalMatchSnapshot)).toThrow(/缺少 map runtime/);
  });
});
