import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_TRIGGER,
} from '../../src/arena/action/action-definition.js';
import { ActionRegistry } from '../../src/arena/action/action-registry.js';
import {
  ACTION_PRIORITY,
  ACTION_RESOLUTION_KIND,
  ActionResolver,
} from '../../src/arena/action/action-resolver.js';

function action(id, trigger = ACTION_INPUT_TRIGGER.PRESSED) {
  return {
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'test',
    input: { trigger },
    timing: { windupTicks: 0, activeTicks: 1, recoveryTicks: 0, cooldownTicks: 0 },
    targeting: { kind: 'self', parameters: {} },
    effects: [{
      id: `${id}-effect`,
      kind: 'test',
      trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
      parameters: {},
    }],
    tags: [],
  };
}

function candidate(id, actionDefinitionId, priority, overrides = {}) {
  return {
    id,
    actionDefinitionId,
    source: 'test-system',
    priority,
    available: true,
    blocksFallback: false,
    ...overrides,
  };
}

function context(candidates, overrides = {}) {
  return {
    tick: 12,
    participantId: 'player-1',
    canAct: true,
    input: { actionPressed: true, actionHeld: true },
    candidates,
    ...overrides,
  };
}

function resolver(...actions) {
  return new ActionResolver({ actionRegistry: new ActionRegistry(actions) });
}

test('ActionResolver enforces contextual priority without knowing equipment implementations', () => {
  const value = resolver(action('base'), action('air'), action('equipment'));
  const result = value.resolve(context([
    candidate('base-candidate', 'base', ACTION_PRIORITY.BASE),
    candidate('air-candidate', 'air', ACTION_PRIORITY.AIR),
    candidate('equipment-candidate', 'equipment', ACTION_PRIORITY.EQUIPMENT),
  ]));
  assert.deepEqual(result, {
    kind: ACTION_RESOLUTION_KIND.SELECTED,
    tick: 12,
    participantId: 'player-1',
    reason: 'candidate-selected',
    candidateId: 'equipment-candidate',
    actionDefinitionId: 'equipment',
    source: 'test-system',
  });
  assert.ok(Object.isFrozen(result));
});

test('equipment cooldown can consume input and prevent fallback base attack', () => {
  const value = resolver(action('base'), action('equipment'));
  const result = value.resolve(context([
    candidate('base-candidate', 'base', ACTION_PRIORITY.BASE),
    candidate('equipment-candidate', 'equipment', ACTION_PRIORITY.EQUIPMENT, {
      available: false,
      blocksFallback: true,
      unavailableReason: 'equipment-cooldown',
    }),
  ]));
  assert.equal(result.kind, ACTION_RESOLUTION_KIND.IGNORED);
  assert.equal(result.reason, 'equipment-cooldown');
  assert.equal(result.candidateId, 'equipment-candidate');
});

test('unavailable participant and neutral input have explicit non-action outcomes', () => {
  const value = resolver(action('base'));
  const unavailable = value.resolve(context([
    candidate('base-candidate', 'base', ACTION_PRIORITY.BASE),
  ], { canAct: false }));
  assert.equal(unavailable.kind, ACTION_RESOLUTION_KIND.IGNORED);
  assert.equal(unavailable.reason, 'participant-unavailable');

  const neutral = value.resolve(context([], {
    input: { actionPressed: false, actionHeld: false },
  }));
  assert.equal(neutral.kind, ACTION_RESOLUTION_KIND.NONE);
  assert.equal(neutral.reason, 'no-input');
});

test('same-priority candidates resolve by stable id independent of registration order', () => {
  const value = resolver(action('first-action'), action('second-action'));
  const first = candidate('a-candidate', 'first-action', 250);
  const second = candidate('z-candidate', 'second-action', 250);
  const left = value.resolve(context([second, first]));
  const right = value.resolve(context([first, second]));
  assert.deepEqual(left, right);
  assert.equal(left.candidateId, 'a-candidate');
});

test('new equipment action extends the registry and candidates without changing the resolver', () => {
  const value = resolver(action('base'), action('new-grappling-hook'));
  const result = value.resolve(context([
    candidate('base-candidate', 'base', ACTION_PRIORITY.BASE),
    candidate('grappling-hook-candidate', 'new-grappling-hook', ACTION_PRIORITY.EQUIPMENT),
  ]));
  assert.equal(result.actionDefinitionId, 'new-grappling-hook');
});

test('candidate validation rejects duplicates, invalid references and ambiguous blocked state', () => {
  const value = resolver(action('base'));
  const duplicate = candidate('same', 'base', ACTION_PRIORITY.BASE);
  assert.throws(() => value.resolve(context([duplicate, duplicate])), /重复 candidate id same/);
  assert.throws(
    () => value.resolve(context([candidate('missing', 'unknown', ACTION_PRIORITY.BASE)])),
    /未知 ActionDefinition unknown/,
  );
  assert.throws(
    () => value.resolve(context([candidate('blocked', 'base', ACTION_PRIORITY.BASE, {
      available: false,
      blocksFallback: true,
    })])),
    /unavailableReason 必须是非空字符串/,
  );
});
