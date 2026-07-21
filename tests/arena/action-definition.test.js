import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  createActionDefinition,
} from '@number-strategy-jump/arena-definitions';
import { ActionRegistry } from '@number-strategy-jump/arena-definitions';

function rawAction(id = 'test-action') {
  return {
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'test',
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: ['upper-body'],
    timing: { windupTicks: 1, activeTicks: 2, recoveryTicks: 3, cooldownTicks: 4 },
    targeting: { kind: 'self', parameters: { radius: 1 } },
    effects: [{
      id: `${id}-effect`,
      kind: 'test-effect',
      trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
      parameters: { strength: 2, labels: ['a'] },
    }],
    tags: ['test'],
  };
}

test('ActionDefinition clones and deeply freezes serializable rule data', () => {
  const source = rawAction();
  const definition = createActionDefinition(source);
  source.targeting.parameters.radius = 999;
  source.effects[0].parameters.labels.push('mutated');
  assert.equal(definition.targeting.parameters.radius, 1);
  assert.deepEqual(definition.effects[0].parameters.labels, ['a']);
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.timing));
  assert.ok(Object.isFrozen(definition.effects[0].parameters.labels));
  assert.ok(Object.isFrozen(definition.conflictTags));
  assert.throws(() => { definition.timing.activeTicks = 99; }, TypeError);
});

test('ActionDefinition rejects schema drift and non-deterministic payloads', () => {
  assert.throws(
    () => createActionDefinition({
      ...rawAction(),
      input: { channel: ACTION_INPUT_CHANNEL.SLAM, trigger: ACTION_INPUT_TRIGGER.HELD },
    }),
    /slam 通道只支持 pressed/,
  );
  assert.throws(
    () => createActionDefinition({ ...rawAction(), lane: 'cinematic' }),
    /lane 不受支持/,
  );
  assert.throws(
    () => createActionDefinition({ ...rawAction(), damage: 10 }),
    /不支持字段 damage/,
  );
  assert.throws(
    () => createActionDefinition({
      ...rawAction(),
      targeting: { kind: 'self', parameters: { radius: Number.NaN } },
    }),
    /非有限数/,
  );
  assert.throws(
    () => createActionDefinition({
      ...rawAction(),
      effects: [{
        id: 'bad',
        kind: 'bad',
        trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
        parameters: { execute() {} },
      }],
    }),
    /可序列化数据/,
  );
  const circular = {};
  circular.self = circular;
  assert.throws(
    () => createActionDefinition({
      ...rawAction(),
      targeting: { kind: 'self', parameters: circular },
    }),
    /循环引用/,
  );
  const sparse = [];
  sparse.length = 1;
  assert.throws(
    () => createActionDefinition({
      ...rawAction(),
      effects: [{
        id: 'sparse',
        kind: 'bad',
        trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
        parameters: { values: sparse },
      }],
    }),
    /空槽或访问器/,
  );
  const accessorParameters = {};
  Object.defineProperty(accessorParameters, 'value', {
    enumerable: true,
    get: () => 1,
  });
  assert.throws(
    () => createActionDefinition({
      ...rawAction(),
      targeting: { kind: 'self', parameters: accessorParameters },
    }),
    /必须是可枚举数据字段/,
  );
});

test('ActionRegistry is read-only, rejects duplicate ids and lists in stable id order', () => {
  const registry = new ActionRegistry([rawAction('z-action'), rawAction('a-action')]);
  assert.equal(registry.size, 2);
  assert.deepEqual(registry.list().map(({ id }) => id), ['a-action', 'z-action']);
  assert.ok(Object.isFrozen(registry.list()));
  assert.equal(registry.register, undefined);
  assert.equal(registry.require('a-action').id, 'a-action');
  assert.throws(() => registry.require('missing'), /未知 ActionDefinition missing/);
  assert.throws(
    () => new ActionRegistry([rawAction('duplicate'), rawAction('duplicate')]),
    /重复 id duplicate/,
  );
});
