import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  ARENA_GAMEPLAY_V2_MAP_ID,
  ARENA_V1_CHARACTER_ID,
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  ActionRegistry,
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  CharacterRegistry,
  createEquipmentDefinition,
  createMapDefinition,
  createActionDefinition,
  createCharacterDefinition,
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_DROP_FALLBACK,
  EQUIPMENT_DROP_POLICY,
  EQUIPMENT_PICKUP_MODE,
  EquipmentRegistry,
  MAP_DEFINITION_SCHEMA_VERSION,
  MapRegistry,
  STAGE4_EQUIPMENT_ID,
  STAGE5_MAP_ID,
} from '../src/index.js';
import type {
  ActionDefinition,
  CharacterDefinition,
  EquipmentDefinition,
  MapDefinition,
} from '../src/index.js';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';

function action(id: string): ActionDefinition {
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'attack',
    input: { channel: ACTION_INPUT_CHANNEL.PRIMARY, trigger: ACTION_INPUT_TRIGGER.PRESSED },
    lane: ACTION_LANE.COMBAT,
    conflictTags: [],
    timing: { windupTicks: 1, activeTicks: 1, recoveryTicks: 1, cooldownTicks: 0 },
    targeting: { kind: 'none', parameters: {} },
    effects: [{
      id: `${id}.effect`,
      kind: 'noop',
      trigger: ACTION_EFFECT_TRIGGER.ACTION_ACTIVE,
      parameters: {},
    }],
    tags: [],
  });
}

function character(id: string): CharacterDefinition {
  return createCharacterDefinition({
    schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
    id,
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
    tags: [],
  });
}

describe('Arena Definition public contracts', () => {
  it('publishes stable Arena V1 content IDs from one immutable API', () => {
    expect(Object.isFrozen(STAGE4_EQUIPMENT_ID)).toBe(true);
    expect(Object.values(STAGE4_EQUIPMENT_ID)).toEqual(['hammer', 'chain', 'shield']);
    expect(Object.values(ARENA_V1_CHARACTER_ID)).toHaveLength(2);
    expect(STAGE5_MAP_ID).toBe('abyss-grid-wind-v1');
    expect(ARENA_GAMEPLAY_V2_MAP_ID).toBe('forge-crossroads-v2');
  });

  it('freezes the one executable gameplay tuning table behind a reviewed hash', () => {
    expect(Object.isFrozen(ARENA_GAMEPLAY_V2_TUNING)).toBe(true);
    expect(createDeterministicDataHash(ARENA_GAMEPLAY_V2_TUNING)).toBe('8c322912');
  });

  it('exposes immutable typed definitions from its public API', () => {
    const actionDefinition = action('z');
    const characterDefinition = character('player');
    expectTypeOf(actionDefinition).toEqualTypeOf<ActionDefinition>();
    expectTypeOf(characterDefinition).toEqualTypeOf<CharacterDefinition>();
    expect(Object.isFrozen(actionDefinition)).toBe(true);
    expect(Object.isFrozen(characterDefinition)).toBe(true);
  });

  it('sorts registries stably and rejects duplicate ids before publication', () => {
    expect(new ActionRegistry([action('z'), action('a')]).list().map(({ id }) => id))
      .toEqual(['a', 'z']);
    expect(new CharacterRegistry([character('z'), character('a')]).list().map(({ id }) => id))
      .toEqual(['a', 'z']);
    expect(() => new ActionRegistry([action('same'), action('same')])).toThrow(/重复 id/);
    expect(() => new CharacterRegistry([character('same'), character('same')])).toThrow(/重复 id/);
  });

  it('rejects schema drift and cross-field movement or action violations', () => {
    expect(() => createActionDefinition({ schemaVersion: 1 })).toThrow();
    expect(() => createCharacterDefinition({
      ...character('invalid'),
      movement: { ...character('invalid').movement, runSpeed: 2 },
    })).toThrow(/runSpeed/);
  });

  it('binds equipment actions at Registry construction without mutable publication', () => {
    const actionRegistry = new ActionRegistry([action('ground'), action('air')]);
    const equipment: EquipmentDefinition = createEquipmentDefinition({
      schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
      id: 'hammer',
      category: 'weapon',
      slot: 'primary',
      actionDefinitionId: 'ground',
      aerialActionDefinitionId: 'air',
      pickup: { mode: EQUIPMENT_PICKUP_MODE.AUTOMATIC, radius: 0.8 },
      drop: {
        onOwnerEliminated: EQUIPMENT_DROP_POLICY.LAST_SAFE_POSITION,
        invalidPositionFallback: EQUIPMENT_DROP_FALLBACK.ORIGIN_SPAWN,
      },
      presentationSemantic: 'hammer',
      tags: [],
    });
    expect(new EquipmentRegistry({ definitions: [equipment], actionRegistry }).require('hammer'))
      .toStrictEqual(equipment);
    expect(() => new EquipmentRegistry({
      definitions: [{ ...equipment, actionDefinitionId: 'missing' }],
      actionRegistry,
    })).toThrow(/未知 ActionDefinition/);
  });

  it('publishes only validated, stable map geometry and timeline data', () => {
    const map: MapDefinition = createMapDefinition({
      schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
      id: 'arena',
      arena: {
        killY: -10,
        surfaces: [{
          id: 'center',
          center: { x: 0, y: 0, z: 0 },
          halfExtents: { x: 4, y: 0.5, z: 4 },
        }],
        spawns: [{ x: -1, y: 0.5, z: 0 }, { x: 1, y: 0.5, z: 0 }],
      },
      equipmentSpawnPoints: [],
      events: [],
    });
    expect(new MapRegistry([map]).require('arena')).toBe(map);
    expect(Object.isFrozen(map.arena.surfaces)).toBe(true);
    expect(() => createMapDefinition({
      ...map.toJSON(),
      arena: { ...map.arena, spawns: [{ x: 10, y: 1, z: 10 }, map.arena.spawns[1]] },
    })).toThrow(/没有合法支撑 surface/);
  });
});
