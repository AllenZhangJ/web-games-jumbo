import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  ActionRegistry,
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  CharacterRegistry,
  createActionDefinition,
  createCharacterDefinition,
} from '../src/index.js';
import type { ActionDefinition, CharacterDefinition } from '../src/index.js';

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
});
