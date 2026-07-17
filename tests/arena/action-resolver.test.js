import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
} from '../../src/arena/action/action-definition.js';
import { ActionRegistry } from '../../src/arena/action/action-registry.js';
import {
  ACTION_PRIORITY,
  ACTION_RESOLUTION_KIND,
  ActionResolver,
} from '../../src/arena/action/action-resolver.js';

function action(
  id,
  {
    trigger = ACTION_INPUT_TRIGGER.PRESSED,
    channel = ACTION_INPUT_CHANNEL.PRIMARY,
    lane = ACTION_LANE.COMBAT,
    conflictTags = [],
  } = {},
) {
  return {
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'test',
    input: { channel, trigger },
    lane,
    conflictTags,
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
    input: {
      primaryPressed: true,
      primaryHeld: true,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    },
    candidates,
    occupiedLanes: [],
    activeConflictTags: [],
    ...overrides,
  };
}

function resolver(...actions) {
  return new ActionResolver({ actionRegistry: new ActionRegistry(actions) });
}

function primaryOutcome(result) {
  return result.outcomes.find(({ inputChannel }) => inputChannel === ACTION_INPUT_CHANNEL.PRIMARY);
}

test('ActionResolver enforces contextual priority without knowing equipment implementations', () => {
  const value = resolver(action('base'), action('air'), action('equipment'));
  const result = value.resolve(context([
    candidate('base-candidate', 'base', ACTION_PRIORITY.BASE),
    candidate('air-candidate', 'air', ACTION_PRIORITY.LOCOMOTION),
    candidate('equipment-candidate', 'equipment', ACTION_PRIORITY.EQUIPMENT),
  ]));
  assert.deepEqual(primaryOutcome(result), {
    kind: ACTION_RESOLUTION_KIND.SELECTED,
    tick: 12,
    participantId: 'player-1',
    inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
    lane: ACTION_LANE.COMBAT,
    reason: 'candidate-selected',
    candidateId: 'equipment-candidate',
    actionDefinitionId: 'equipment',
    source: 'test-system',
  });
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.outcomes));
});

test('equipment cooldown can consume primary input and prevent fallback base attack', () => {
  const value = resolver(action('base'), action('equipment'));
  const outcome = primaryOutcome(value.resolve(context([
    candidate('base-candidate', 'base', ACTION_PRIORITY.BASE),
    candidate('equipment-candidate', 'equipment', ACTION_PRIORITY.EQUIPMENT, {
      available: false,
      blocksFallback: true,
      unavailableReason: 'equipment-cooldown',
    }),
  ])));
  assert.equal(outcome.kind, ACTION_RESOLUTION_KIND.IGNORED);
  assert.equal(outcome.reason, 'equipment-cooldown');
  assert.equal(outcome.candidateId, 'equipment-candidate');
});

test('unavailable participant and neutral input have explicit per-channel outcomes', () => {
  const value = resolver(action('base'));
  const unavailable = value.resolve(context([
    candidate('base-candidate', 'base', ACTION_PRIORITY.BASE),
  ], { canAct: false }));
  assert.equal(primaryOutcome(unavailable).kind, ACTION_RESOLUTION_KIND.IGNORED);
  assert.equal(primaryOutcome(unavailable).reason, 'participant-unavailable');

  const neutral = value.resolve(context([], {
    input: {
      primaryPressed: false,
      primaryHeld: false,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    },
  }));
  assert.equal(neutral.outcomes[0].kind, ACTION_RESOLUTION_KIND.NONE);
  assert.equal(neutral.outcomes[0].reason, 'no-input');
  assert.equal(neutral.outcomes[0].inputChannel, null);
});

test('same-priority candidates resolve by stable id independent of registration order', () => {
  const value = resolver(action('first-action'), action('second-action'));
  const first = candidate('a-candidate', 'first-action', 250);
  const second = candidate('z-candidate', 'second-action', 250);
  const left = value.resolve(context([second, first]));
  const right = value.resolve(context([first, second]));
  assert.deepEqual(left, right);
  assert.equal(primaryOutcome(left).candidateId, 'a-candidate');
});

test('new equipment action extends definitions and candidates without changing resolver code', () => {
  const value = resolver(action('base'), action('new-grappling-hook'));
  const result = value.resolve(context([
    candidate('base-candidate', 'base', ACTION_PRIORITY.BASE),
    candidate('grappling-hook-candidate', 'new-grappling-hook', ACTION_PRIORITY.EQUIPMENT),
  ]));
  assert.equal(primaryOutcome(result).actionDefinitionId, 'new-grappling-hook');
});

test('explicit primary and jump intents may select different non-conflicting lanes', () => {
  const value = resolver(
    action('attack'),
    action('jump', {
      channel: ACTION_INPUT_CHANNEL.JUMP,
      lane: ACTION_LANE.LOCOMOTION,
    }),
  );
  const result = value.resolve(context([
    candidate('attack-candidate', 'attack', ACTION_PRIORITY.BASE),
    candidate('jump-candidate', 'jump', ACTION_PRIORITY.LOCOMOTION),
  ], {
    input: {
      primaryPressed: true,
      primaryHeld: false,
      jumpPressed: true,
      jumpHeld: false,
      slamPressed: false,
    },
  }));
  assert.deepEqual(
    result.outcomes.map(({ inputChannel, kind, lane }) => ({ inputChannel, kind, lane })),
    [
      {
        inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
        kind: ACTION_RESOLUTION_KIND.SELECTED,
        lane: ACTION_LANE.COMBAT,
      },
      {
        inputChannel: ACTION_INPUT_CHANNEL.JUMP,
        kind: ACTION_RESOLUTION_KIND.SELECTED,
        lane: ACTION_LANE.LOCOMOTION,
      },
    ],
  );
});

test('one primary intent can select only one action even when candidates use different lanes', () => {
  const value = resolver(
    action('attack'),
    action('context-jump', { lane: ACTION_LANE.LOCOMOTION }),
  );
  const result = value.resolve(context([
    candidate('attack-candidate', 'attack', ACTION_PRIORITY.BASE),
    candidate('context-jump-candidate', 'context-jump', ACTION_PRIORITY.LOCOMOTION),
  ]));
  assert.equal(result.outcomes.length, 1);
  assert.equal(primaryOutcome(result).actionDefinitionId, 'context-jump');
});

test('a release-triggered candidate creates intent only while its provider exposes it', () => {
  const release = action('crouch-release', {
    trigger: ACTION_INPUT_TRIGGER.RELEASED,
    channel: ACTION_INPUT_CHANNEL.JUMP,
    lane: ACTION_LANE.LOCOMOTION,
  });
  const value = resolver(release);
  const neutralInput = {
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  };
  const released = value.resolve(context([
    candidate('release-candidate', release.id, ACTION_PRIORITY.LOCOMOTION),
  ], { input: neutralInput }));
  assert.equal(released.outcomes[0].inputChannel, ACTION_INPUT_CHANNEL.JUMP);
  assert.equal(released.outcomes[0].kind, ACTION_RESOLUTION_KIND.SELECTED);

  const absent = value.resolve(context([], { input: neutralInput }));
  assert.equal(absent.outcomes[0].reason, 'no-input');
});

test('same-tick lane and conflict resolution uses priority then stable candidate id', () => {
  const sameLane = resolver(
    action('primary-locomotion', { lane: ACTION_LANE.LOCOMOTION }),
    action('jump', {
      channel: ACTION_INPUT_CHANNEL.JUMP,
      lane: ACTION_LANE.LOCOMOTION,
    }),
  );
  const input = {
    primaryPressed: true,
    primaryHeld: false,
    jumpPressed: true,
    jumpHeld: false,
    slamPressed: false,
  };
  const laneResult = sameLane.resolve(context([
    candidate('primary-candidate', 'primary-locomotion', ACTION_PRIORITY.BASE),
    candidate('jump-candidate', 'jump', ACTION_PRIORITY.LOCOMOTION),
  ], { input }));
  assert.equal(primaryOutcome(laneResult).reason, 'same-tick-lane-conflict');
  assert.equal(laneResult.outcomes[1].kind, ACTION_RESOLUTION_KIND.SELECTED);

  const conflict = resolver(
    action('attack', { conflictTags: ['full-body'] }),
    action('jump', {
      channel: ACTION_INPUT_CHANNEL.JUMP,
      lane: ACTION_LANE.LOCOMOTION,
      conflictTags: ['full-body'],
    }),
  );
  const first = candidate('a-attack', 'attack', 300);
  const second = candidate('z-jump', 'jump', 300);
  const conflictResult = conflict.resolve(context([second, first], { input }));
  assert.equal(primaryOutcome(conflictResult).kind, ACTION_RESOLUTION_KIND.SELECTED);
  assert.equal(conflictResult.outcomes[1].reason, 'same-tick-action-conflict');
});

test('active lane and conflict constraints reject starts before ActionExecution mutation', () => {
  const value = resolver(
    action('attack'),
    action('jump', {
      channel: ACTION_INPUT_CHANNEL.JUMP,
      lane: ACTION_LANE.LOCOMOTION,
      conflictTags: ['lower-body'],
    }),
  );
  const result = value.resolve(context([
    candidate('attack-candidate', 'attack', ACTION_PRIORITY.BASE),
    candidate('jump-candidate', 'jump', ACTION_PRIORITY.LOCOMOTION),
  ], {
    input: {
      primaryPressed: true,
      primaryHeld: false,
      jumpPressed: true,
      jumpHeld: false,
      slamPressed: false,
    },
    occupiedLanes: [ACTION_LANE.COMBAT],
    activeConflictTags: ['lower-body'],
  }));
  assert.equal(primaryOutcome(result).reason, 'action-lane-occupied');
  assert.equal(result.outcomes[1].reason, 'active-action-conflict');
});

test('candidate and context validation reject ambiguity before resolution', () => {
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
  assert.throws(
    () => value.resolve(context([], { occupiedLanes: ['cinematic'] })),
    /未知 occupied action lane/,
  );
});
