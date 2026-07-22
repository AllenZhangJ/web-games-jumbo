import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  createCharacterDefinition,
} from '@number-strategy-jump/arena-definitions';
import { createCharacterPhysicsProfile } from '@number-strategy-jump/arena-physics';
import {
  CharacterRegistry,
  createCharacterRegistrySnapshot,
} from '@number-strategy-jump/arena-definitions';
import { createCharacterRuntimeReference } from '@number-strategy-jump/arena-match';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { PHYSICS_POC_ARENA } from '@number-strategy-jump/arena-match';
import {
  ARENA_V1_CHARACTER_DEFINITIONS,
  createArenaV1CharacterRegistry,
} from '@number-strategy-jump/arena-v1-content';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  compileHorizontalImpulseFromDistance,
  compileJumpImpulseFromHeight,
} from '@number-strategy-jump/arena-definitions';

function definition(overrides = {}) {
  return {
    schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
    id: 'test-character',
    collision: { radius: 0.45, halfHeight: 0.55, mass: 1 },
    movement: {
      walkSpeed: 3,
      runSpeed: 6,
      runInputThreshold: 0.65,
      groundAcceleration: 42,
      airAcceleration: 14,
      maximumHorizontalSpeed: 18,
      automaticStepHeight: 0.35,
    },
    jump: {
      groundImpulse: 7.5,
      crouchImpulse: 9.5,
      airImpulse: 7,
      downSmashSpeed: 16,
      downSmashAccelerationPerTick: 0.55,
      maximumDownSmashSpeed: 22,
      coyoteTicks: 6,
      bufferTicks: 6,
      maximumAirJumps: 1,
      maximumCrouchChargeTicks: 24,
    },
    tags: ['test'],
    ...overrides,
  };
}

test('Gameplay V2 tuning compiles author-facing height and distance into authority values', () => {
  const tuning = ARENA_GAMEPLAY_V2_TUNING;
  assert.ok(Object.isFrozen(tuning));
  assert.ok(Object.isFrozen(tuning.character.jump));
  assert.equal(
    compileJumpImpulseFromHeight(tuning.character.jump.targetGroundHeight),
    7.5,
  );
  assert.ok(Math.abs(
    compileHorizontalImpulseFromDistance(
      tuning.attacks['hammer-smash'].knockback.targetGroundDistance,
    ) - 15,
  ) < 1e-12);
  assert.equal(tuning.units.tickRateHz, 60);
  assert.deepEqual(tuning.character.movement, {
    walkSpeed: 3.2,
    runSpeed: 6,
    runInputThreshold: 0.65,
    groundAcceleration: 42,
    airAcceleration: 14,
    maximumHorizontalSpeed: 18,
    automaticStepHeight: 0.35,
  });
  assert.deepEqual({
    ground: tuning.character.jump.targetGroundHeight,
    charged: tuning.character.jump.targetChargedHeight,
    air: tuning.character.jump.targetAirHeight,
  }, {
    ground: 1.171875,
    charged: 1.8802083333333333,
    air: 1.0208333333333333,
  });
  assert.throws(() => compileJumpImpulseFromHeight(0), /大于 0/);
  assert.throws(() => compileHorizontalImpulseFromDistance(Number.NaN), /大于 0/);
});

test('CharacterDefinition clones, deeply freezes and excludes presentation data', () => {
  const source = definition();
  const character = createCharacterDefinition(source);
  source.collision.radius = 99;
  source.tags.push('mutated');
  assert.equal(character.collision.radius, 0.45);
  assert.deepEqual(character.tags, ['test']);
  assert.ok(Object.isFrozen(character));
  assert.ok(Object.isFrozen(character.collision));
  assert.ok(Object.isFrozen(character.movement));
  assert.ok(Object.isFrozen(character.jump));
  assert.throws(() => { character.movement.runSpeed = 999; }, TypeError);
  assert.throws(
    () => createCharacterDefinition({ ...definition(), modelAssetId: 'forbidden.glb' }),
    /不支持字段 modelAssetId/,
  );
});

test('CharacterDefinition rejects accessors and invalid movement relationships', () => {
  let getterCalls = 0;
  const source = definition();
  Object.defineProperty(source.collision, 'mass', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 1;
    },
  });
  assert.throws(() => createCharacterDefinition(source), /数据字段/);
  assert.equal(getterCalls, 0);
  assert.throws(() => createCharacterDefinition(definition({
    movement: { ...definition().movement, runInputThreshold: 1.1 },
  })), /runInputThreshold/);
  assert.throws(() => createCharacterDefinition(definition({
    movement: { ...definition().movement, runSpeed: 2 },
  })), /runSpeed 不能小于 walkSpeed/);
  assert.throws(() => createCharacterDefinition(definition({
    collision: { ...definition().collision, mass: 0 },
  })), /mass 必须是有限正数/);
  assert.throws(() => createCharacterDefinition(definition({
    jump: { ...definition().jump, crouchImpulse: 7 },
  })), /crouchImpulse 不能小于 groundImpulse/);
});

test('CharacterRegistry owns stable IDs and exposes a sorted read-only catalog', () => {
  const first = definition({ id: 'z-character' });
  const second = definition({ id: 'a-character' });
  const registry = new CharacterRegistry([first, second]);
  assert.deepEqual(registry.list().map(({ id }) => id), ['a-character', 'z-character']);
  assert.ok(Object.isFrozen(registry.list()));
  assert.equal(registry.require('a-character').id, 'a-character');
  assert.throws(() => registry.require('missing'), /未知 CharacterDefinition missing/);
  assert.throws(() => new CharacterRegistry([first, first]), /重复 id z-character/);
});

test('CharacterRegistry snapshots injected catalogs before authority use', () => {
  const externalDefinitions = [definition({ id: 'external-character' })];
  const externalRegistry = {
    list() {
      return externalDefinitions;
    },
    require(id) {
      return externalDefinitions.find((value) => value.id === id);
    },
  };
  const snapshot = createCharacterRegistrySnapshot(externalRegistry);
  externalDefinitions[0].collision.radius = 9;
  externalDefinitions.push(definition({ id: 'late-character' }));
  assert.equal(snapshot.size, 1);
  assert.equal(snapshot.require('external-character').collision.radius, 0.45);
  assert.throws(() => snapshot.require('late-character'), /未知 CharacterDefinition/);

  let getterCalls = 0;
  const hostileArray = [];
  Object.defineProperty(hostileArray, '0', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return definition();
    },
  });
  hostileArray.length = 1;
  assert.throws(() => new CharacterRegistry(hostileArray), /空槽或访问器/);
  assert.equal(getterCalls, 0);
});

test('Arena V1 catalog contains both accepted character identities with shared gameplay baseline', () => {
  const registry = createArenaV1CharacterRegistry();
  assert.equal(registry.size, 2);
  assert.deepEqual(registry.list().map(({ id }) => id), [
    ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
    ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
  ]);
  const apprentice = registry.require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const robot = registry.require(ARENA_V1_CHARACTER_ID.WIND_UP_CUBE);
  assert.deepEqual(apprentice.collision, robot.collision);
  assert.deepEqual(apprentice.movement, robot.movement);
  assert.deepEqual(apprentice.jump, robot.jump);
});

test('Character runtime keeps only immutable identity and projects an ordinary physics profile', () => {
  const registry = createArenaV1CharacterRegistry();
  const runtime = createCharacterRuntimeReference({
    participantId: 'player-1',
    definitionId: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
    characterRegistry: registry,
  });
  assert.deepEqual(runtime, {
    participantId: 'player-1',
    definitionId: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
  });
  assert.ok(Object.isFrozen(runtime));
  assert.equal(runtime.physicsBody, undefined);
  assert.equal(runtime.renderer, undefined);
  const profile = createCharacterPhysicsProfile(registry.require(runtime.definitionId));
  assert.deepEqual(profile, {
    radius: 0.45,
    halfHeight: 0.55,
    mass: 1,
    moveSpeed: 6,
    groundAcceleration: 42,
    airAcceleration: 14,
  });
  assert.throws(() => createCharacterRuntimeReference({
    participantId: 'player-1',
    definitionId: 'missing',
    characterRegistry: registry,
  }), /未知 CharacterDefinition missing/);
});

test('MatchCore resolves participant character IDs and includes character content in authority hashes', () => {
  const first = createArenaV1MatchCore({
    seed: 12,
    config: {
      preparingTicks: 0,
      participantCharacters: [
        { participantId: 'player-1', definitionId: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE },
        { participantId: 'player-2', definitionId: ARENA_V1_CHARACTER_ID.WIND_UP_CUBE },
      ],
    },
  });
  assert.deepEqual(first.getSnapshot().participants.map(({ id, characterDefinitionId }) => ({
    participantId: id,
    definitionId: characterDefinitionId,
  })), first.config.participantCharacters);
  assert.equal(
    first.getCharacterDefinition('player-2').id,
    ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
  );

  const changedDefinitions = ARENA_V1_CHARACTER_DEFINITIONS.map((value) => (
    value.id === ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE
      ? { ...value, jump: { ...value.jump, bufferTicks: value.jump.bufferTicks + 1 } }
      : value
  ));
  const changed = createArenaV1MatchCore({
    seed: 12,
    config: { preparingTicks: 0 },
    characterRegistry: new CharacterRegistry(changedDefinitions),
  });
  const reordered = createArenaV1MatchCore({
    seed: 12,
    config: { preparingTicks: 0 },
    characterRegistry: new CharacterRegistry([...ARENA_V1_CHARACTER_DEFINITIONS].reverse()),
  });
  assert.equal(first.ruleContentHash, reordered.ruleContentHash);
  assert.notEqual(first.ruleContentHash, changed.ruleContentHash);
  first.destroy();
  changed.destroy();
  reordered.destroy();
});

test('MatchCore rejects incomplete assignments, unknown definitions and unsafe selected geometry', () => {
  assert.throws(() => createArenaV1MatchCore({
    config: { participantCharacters: [] },
  }), /恰好覆盖/);
  assert.throws(() => createArenaV1MatchCore({
    config: {
      participantCharacters: [
        { participantId: 'player-1', definitionId: 'missing' },
        { participantId: 'player-2', definitionId: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE },
      ],
    },
  }), /未知 CharacterDefinition missing/);

  const oversized = ARENA_V1_CHARACTER_DEFINITIONS.map((value) => ({
    ...value,
    collision: { ...value.collision, radius: 2.1 },
  }));
  assert.throws(() => createArenaV1MatchCore({
    characterRegistry: new CharacterRegistry(oversized),
  }), /不可步行连通/);

  const unsafeSpawnArena = structuredClone(PHYSICS_POC_ARENA);
  unsafeSpawnArena.spawns[0].x = 5.8;
  assert.throws(() => createArenaV1MatchCore({
    config: { arena: unsafeSpawnArena },
  }), /spawn\[0\].*不安全/);

  const floatingSpawnArena = structuredClone(PHYSICS_POC_ARENA);
  floatingSpawnArena.spawns[0].y = 1.2;
  assert.throws(() => createArenaV1MatchCore({
    config: { arena: floatingSpawnArena },
  }), /spawn\[0\].*不安全/);
});
