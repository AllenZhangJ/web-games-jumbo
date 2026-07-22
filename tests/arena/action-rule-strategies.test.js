import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
} from '@number-strategy-jump/arena-definitions';
import { ActionRegistry } from '@number-strategy-jump/arena-definitions';
import {
  ACTION_RULE_COMMAND,
  ActionEffectRegistry,
  createDefaultActionEffectRegistry,
  createDefaultTargetingRegistry,
} from '@number-strategy-jump/arena-core';
import {
  STAGE4_ACTION_ID,
  createStage4ContentRegistries,
} from '@number-strategy-jump/arena-v1-content';
import { createMovementActionEffectHandlers } from '@number-strategy-jump/arena-v1-composition';

const SOURCE = Object.freeze({
  id: 'player-1',
  position: Object.freeze({ x: 0, y: 1, z: 0 }),
  facing: Object.freeze({ x: 1, z: 0 }),
});
const FRONT = Object.freeze({
  id: 'player-2',
  position: Object.freeze({ x: 1, y: 1, z: 0 }),
  facing: Object.freeze({ x: -1, z: 0 }),
});

test('default targeting and effect strategies validate the complete Stage4 catalog', () => {
  const { actionRegistry } = createStage4ContentRegistries();
  const targeting = createDefaultTargetingRegistry();
  const effects = createDefaultActionEffectRegistry(createMovementActionEffectHandlers());
  assert.equal(targeting.validateActionRegistry(actionRegistry), targeting);
  assert.equal(effects.validateActionRegistry(actionRegistry), effects);
});

test('facing cone targeting reads immutable snapshots and returns stable target ids', () => {
  const { actionRegistry } = createStage4ContentRegistries();
  const targeting = createDefaultTargetingRegistry();
  targeting.validateActionRegistry(actionRegistry);
  const targets = targeting.resolve({
    definition: actionRegistry.require(STAGE4_ACTION_ID.BASE_PUSH),
    source: SOURCE,
    candidates: [
      { id: 'z-front', position: { x: 1.2, y: 1, z: 0.1 } },
      { id: 'behind', position: { x: -1, y: 1, z: 0 } },
      { id: 'a-front', position: { x: 1, y: 1, z: -0.1 } },
    ],
  });
  assert.deepEqual(targets, ['a-front', 'z-front']);
  assert.ok(Object.isFrozen(targets));
});

test('facing capsule rejects side and rear actors outside the charge path', () => {
  const { actionRegistry } = createStage4ContentRegistries();
  const targeting = createDefaultTargetingRegistry();
  const targets = targeting.resolve({
    definition: actionRegistry.require(STAGE4_ACTION_ID.SHIELD_CHARGE),
    source: SOURCE,
    candidates: [
      FRONT,
      { id: 'side', position: { x: 1, y: 1, z: 1.2 } },
      { id: 'rear', position: { x: -1, y: 1, z: 0 } },
    ],
  });
  assert.deepEqual(targets, ['player-2']);
});

test('downward cylinder only selects targets below the airborne attacker', () => {
  const { actionRegistry } = createStage4ContentRegistries();
  const targeting = createDefaultTargetingRegistry();
  const targets = targeting.resolve({
    definition: actionRegistry.require(STAGE4_ACTION_ID.HAMMER_AIR_SMASH),
    source: { ...SOURCE, position: { x: 0, y: 3, z: 0 } },
    candidates: [
      { id: 'below', position: { x: 0.7, y: 1, z: 0.2 } },
      { id: 'above', position: { x: 0.2, y: 3.4, z: 0 } },
      { id: 'too-far-side', position: { x: 2, y: 1, z: 0 } },
      { id: 'too-far-down', position: { x: 0, y: 0.2, z: 0 } },
    ],
  });
  assert.deepEqual(targets, ['below']);
});

test('default effects convert data into frozen commands without mutating actors', () => {
  const { actionRegistry } = createStage4ContentRegistries();
  const effects = createDefaultActionEffectRegistry(createMovementActionEffectHandlers());
  effects.validateActionRegistry(actionRegistry);
  const basePush = actionRegistry.require(STAGE4_ACTION_ID.BASE_PUSH);
  const directional = basePush.effects.find(({ kind }) => kind === 'apply-directional-impulse');
  const commands = effects.resolve(directional, {
    actionDefinitionId: basePush.id,
    source: SOURCE,
    target: FRONT,
  });
  assert.deepEqual(commands, [{
    effectKind: 'apply-directional-impulse',
    impulse: { x: 8.5, y: 4.8, z: 0 },
    kind: ACTION_RULE_COMMAND.APPLY_IMPULSE,
    participantId: 'player-2',
  }]);
  assert.ok(Object.isFrozen(commands));
  assert.ok(Object.isFrozen(commands[0].impulse));
  assert.equal(FRONT.position.x, 1);
});

test('chain pull and front guard remain composable effect commands', () => {
  const { actionRegistry } = createStage4ContentRegistries();
  const effects = createDefaultActionEffectRegistry();
  const chain = actionRegistry.require(STAGE4_ACTION_ID.CHAIN_PULL);
  const pull = effects.resolve(chain.effects.find(({ kind }) => kind === 'pull-to-source'), {
    actionDefinitionId: chain.id,
    source: SOURCE,
    target: FRONT,
  });
  assert.deepEqual(pull[0].impulse, { x: -10, y: 2.5, z: 0 });

  const shield = actionRegistry.require(STAGE4_ACTION_ID.SHIELD_CHARGE);
  const guard = effects.resolve(shield.effects.find(({ kind }) => kind === 'front-guard'), {
    actionDefinitionId: shield.id,
    source: SOURCE,
  });
  assert.equal(guard[0].kind, ACTION_RULE_COMMAND.REGISTER_FRONT_GUARD);
  assert.deepEqual(guard[0].cancelledEffectKinds, ['pull-to-source']);
});

test('strategy registries reject unsupported kinds and invalid specialized parameters at bootstrap', () => {
  const unsupportedAction = {
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: 'unsupported-action',
    kind: 'test',
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: [],
    timing: { windupTicks: 0, activeTicks: 1, recoveryTicks: 0, cooldownTicks: 0 },
    targeting: { kind: 'telepathy', parameters: {} },
    effects: [{
      id: 'unsupported-effect',
      kind: 'unregistered-effect',
      trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
      parameters: {},
    }],
    tags: [],
  };
  const actionRegistry = new ActionRegistry([unsupportedAction]);
  assert.throws(
    () => createDefaultTargetingRegistry().validateActionRegistry(actionRegistry),
    /未注册 targeting telepathy/,
  );
  assert.throws(
    () => createDefaultActionEffectRegistry().validateActionRegistry(actionRegistry),
    /未注册 effect unregistered-effect/,
  );
  assert.throws(
    () => new ActionEffectRegistry([{
      kind: 'broken',
      triggers: [ACTION_EFFECT_TRIGGER.ACTION_STARTED],
      validateParameters() {},
    }]),
    /缺少函数合同/,
  );

  const invalidDownwardCylinder = new ActionRegistry([{
    ...unsupportedAction,
    id: 'invalid-downward-cylinder',
    targeting: {
      kind: 'downward-cylinder',
      parameters: {
        range: 1,
        radius: 2,
        minimumVerticalDrop: 0,
        maximumVerticalDifference: 1,
      },
    },
  }]);
  assert.throws(
    () => createDefaultTargetingRegistry().validateActionRegistry(invalidDownwardCylinder),
    /radius 不能大于 range/,
  );
});
