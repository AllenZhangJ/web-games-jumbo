import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_LANE,
  ActionRegistry,
  createActionDefinition,
} from '@number-strategy-jump/arena-definitions';
import type {
  ActionCandidate,
  ActionIntentInput,
  ActionResolutionContext,
  ArenaRuleEngineContract,
} from '@number-strategy-jump/arena-core';
import {
  ACTION_PRIORITY,
  ACTION_RESOLUTION_KIND,
  ActionAffordanceProjector,
  ActionResolver,
  ACTION_AFFORDANCE_PROFILE,
  type ActionAffordanceProfileResult,
} from '@number-strategy-jump/arena-core';
import {
  createArenaV1RuleEngine,
} from '@number-strategy-jump/arena-v1-composition';
import { createArenaMatchConfig } from '@number-strategy-jump/arena-match';

type PublicProjectProfile = Parameters<ActionAffordanceProjector['projectProfile']>[1];
type PublicRuleProfile = Parameters<ArenaRuleEngineContract['getActionAffordanceProfile']>[1];
const legalProjectProfiles: readonly PublicProjectProfile[] = [
  'local-context-primary',
  'bot-mobility',
  'full-audit',
];
const legalRuleProfiles: readonly PublicRuleProfile[] = legalProjectProfiles;
const arbitraryProfileText: string = 'primary';
// @ts-expect-error arbitrary strings are not part of the public fixed profile contract.
const invalidProjectProfile: PublicProjectProfile = arbitraryProfileText;
// @ts-expect-error arbitrary strings are not part of the RuleEngine fixed profile contract.
const invalidRuleProfile: PublicRuleProfile = arbitraryProfileText;
// @ts-expect-error objects are not part of the public fixed profile contract.
const invalidProjectObject: PublicProjectProfile = { channels: ['primary'] };
// @ts-expect-error objects are not part of the RuleEngine fixed profile contract.
const invalidRuleObject: PublicRuleProfile = { channels: ['primary'] };
void [legalProjectProfiles, legalRuleProfiles, invalidProjectProfile, invalidRuleProfile, invalidProjectObject, invalidRuleObject];

function action(
  id: string,
  inputChannel: (typeof ACTION_INPUT_CHANNEL)[keyof typeof ACTION_INPUT_CHANNEL],
  lane: (typeof ACTION_LANE)[keyof typeof ACTION_LANE],
) {
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'fixed-profile-test',
    input: {
      channel: inputChannel,
      trigger: 'pressed',
    },
    lane,
    conflictTags: [],
    timing: { windupTicks: 0, activeTicks: 1, recoveryTicks: 0, cooldownTicks: 0 },
    targeting: { kind: 'self', parameters: {} },
    effects: [{
      id: `${id}-effect`,
      kind: 'fixed-profile-test',
      trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
      parameters: {},
    }],
    tags: [],
  });
}

function candidate(
  id: string,
  actionDefinitionId: string,
  priority: number = ACTION_PRIORITY.BASE,
): ActionCandidate {
  return {
    id,
    actionDefinitionId,
    source: 'fixed-profile-test',
    priority,
    available: true,
    blocksFallback: false,
    unavailableReason: null,
  };
}

function context(
  overrides: Partial<Omit<ActionResolutionContext, 'input'>> = {},
): Omit<ActionResolutionContext, 'input'> {
  return {
    tick: 18,
    participantId: 'player-1',
    canAct: true,
    candidates: [
      candidate('primary', 'primary-action'),
      candidate('jump', 'jump-action', ACTION_PRIORITY.LOCOMOTION),
      candidate('slam', 'slam-action', ACTION_PRIORITY.AIR),
    ],
    occupiedLanes: [],
    activeConflictTags: [],
    ...overrides,
  };
}

function assertFrozenProfileResult(value: ActionAffordanceProfileResult) {
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.channels));
  for (const outcome of Object.values(value.channels)) assert.ok(Object.isFrozen(outcome));
}

function createResolver() {
  return new ActionResolver({
    actionRegistry: new ActionRegistry([
      action('primary-action', ACTION_INPUT_CHANNEL.PRIMARY, ACTION_LANE.COMBAT),
      action('jump-action', ACTION_INPUT_CHANNEL.JUMP, ACTION_LANE.LOCOMOTION),
      action('slam-action', ACTION_INPUT_CHANNEL.SLAM, ACTION_LANE.INTERACTION),
    ]),
  });
}

function createCountingFallbackResolver() {
  const resolver = createResolver();
  const calls: ActionIntentInput[] = [];
  return {
    calls,
    resolve(contextValue: unknown) {
      const value = contextValue as ActionResolutionContext;
      calls.push(value.input);
      return resolver.resolve(contextValue);
    },
  };
}

function createRuleEngine() {
  const config = createArenaMatchConfig({ preparingTicks: 0 });
  return createArenaV1RuleEngine({ participantIds: config.participantIds, config });
}

function ruleActors(canAct = true) {
  return [
    {
      id: 'player-1',
      canAct,
      targetable: true,
      position: { x: 0, y: 1, z: 0 },
      facing: { x: 1, z: 0 },
    },
    {
      id: 'player-2',
      canAct: true,
      targetable: true,
      position: { x: 1, y: 1, z: 0 },
      facing: { x: -1, z: 0 },
    },
  ];
}

test('PA1.1 fixed profiles are selected before evaluation and never full-then-crop', () => {
  const projector = new ActionAffordanceProjector({ resolver: createResolver() });
  const full = projector.project(context());
  const local = projector.projectProfile(context(), ACTION_AFFORDANCE_PROFILE.LOCAL_CONTEXT_PRIMARY);
  const bot = projector.projectProfile(context(), ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY);

  assert.deepEqual(local.channels.primary, full.channels.primary);
  assert.deepEqual(local.channels.primaryHold, full.channels.primaryHold);
  assert.equal(local.primaryActionDefinitionId, full.primaryActionDefinitionId);
  assert.deepEqual(bot.channels.jump, full.channels.jump);
  assert.deepEqual(bot.channels.slam, full.channels.slam);
  assert.deepEqual(Object.keys(local), ['tick', 'participantId', 'channels', 'primaryActionDefinitionId']);
  assert.deepEqual(Object.keys(local.channels), ['primary', 'primaryHold']);
  assert.deepEqual(Object.keys(bot), ['tick', 'participantId', 'channels']);
  assert.deepEqual(Object.keys(bot.channels), ['jump', 'slam']);
  assertFrozenProfileResult(local);
  assertFrozenProfileResult(bot);
});

test('PA1.1 fallback call counts are local=2 plus conditional display, bot=2, full=4', () => {
  const localFallback = createCountingFallbackResolver();
  new ActionAffordanceProjector({ resolver: localFallback }).projectProfile(
    context({ canAct: false }),
    ACTION_AFFORDANCE_PROFILE.LOCAL_CONTEXT_PRIMARY,
  );
  assert.equal(localFallback.calls.length, 3);
  assert.equal(localFallback.calls.filter(({ primaryPressed }) => primaryPressed).length, 2);
  assert.deepEqual(localFallback.calls.slice(0, 2).map(({ primaryHeld, primaryPressed }) => ({
    primaryHeld,
    primaryPressed,
  })), [
    { primaryHeld: false, primaryPressed: true },
    { primaryHeld: true, primaryPressed: false },
  ]);
  assert.equal(localFallback.calls[2]?.primaryPressed, true);

  const botFallback = createCountingFallbackResolver();
  new ActionAffordanceProjector({ resolver: botFallback }).projectProfile(
    context({ canAct: false }),
    ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY,
  );
  assert.equal(botFallback.calls.length, 2);
  assert.equal(botFallback.calls.some(({ primaryPressed, primaryHeld }) => primaryPressed || primaryHeld), false);

  const fullFallback = createCountingFallbackResolver();
  new ActionAffordanceProjector({ resolver: fullFallback }).projectProfile(
    context(),
    ACTION_AFFORDANCE_PROFILE.FULL_AUDIT,
  );
  assert.equal(fullFallback.calls.length, 4);
});

test('PA1.1 local profile preserves canAct=false display identity without exposing display outcome', () => {
  const projector = new ActionAffordanceProjector({ resolver: createResolver() });
  const result = projector.projectProfile(
    context({ canAct: false }),
    ACTION_AFFORDANCE_PROFILE.LOCAL_CONTEXT_PRIMARY,
  );
  assert.equal(result.primaryActionDefinitionId, 'primary-action');
  assert.deepEqual(Object.keys(result.channels), ['primary', 'primaryHold']);
  assert.equal('displayPrimary' in result.channels, false);
  assert.equal(result.channels.primary.kind, ACTION_RESOLUTION_KIND.IGNORED);
  assert.equal(result.channels.primary.reason, 'participant-unavailable');
});

test('PA1.1 malformed profile/options fail before resolver evaluation and recover', () => {
  const fallback = createCountingFallbackResolver();
  const projector = new ActionAffordanceProjector({ resolver: fallback });
  assert.throws(
    () => Reflect.apply(projector.projectProfile, projector, [context(), 'primary']),
    /不支持的 ActionAffordance profile/,
  );
  assert.equal(fallback.calls.length, 0);

  const malformed = {};
  Object.defineProperty(malformed, 'tick', {
    enumerable: true,
    get() {
      throw new Error('options accessor must not execute');
    },
  });
  assert.throws(
    () => projector.projectProfile(malformed, ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY),
    /必须是可枚举数据字段/,
  );
  assert.equal(fallback.calls.length, 0);
  assert.doesNotThrow(() => projector.projectProfile(
    context(),
    ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY,
  ));
  assert.equal(fallback.calls.length, 2);
});

test('PA1.1 profile validation does not coerce hostile objects', () => {
  const projector = new ActionAffordanceProjector({ resolver: createCountingFallbackResolver() });
  const hostile = {
    [Symbol.toPrimitive]() {
      throw new Error('profile coercion must not execute');
    },
    toString() {
      throw new Error('profile toString must not execute');
    },
  };
  assert.throws(
    () => Reflect.apply(projector.projectProfile, projector, [context(), hostile]),
    /ActionAffordance profile 类型: object/,
  );
});

test('PA1.1 RuleEngine options use descriptor snapshots before resolver evaluation', () => {
  const engine = createRuleEngine();
  const options = {
    tick: 0,
    participantId: 'player-1',
    actors: ruleActors(),
    additionalCandidates: [],
  };
  let getterReads = 0;
  const dataProxy = new Proxy(options, {
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() {
      getterReads += 1;
      throw new Error('RuleEngine affordance option getter must not execute');
    },
  });
  assert.doesNotThrow(() => engine.getActionAffordanceProfile(
    dataProxy,
    ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY,
  ));
  assert.equal(getterReads, 0);

  const accessor = { ...options };
  Object.defineProperty(accessor, 'tick', {
    enumerable: true,
    get() {
      getterReads += 1;
      throw new Error('RuleEngine accessor must not execute');
    },
  });
  assert.throws(
    () => engine.getActionAffordanceProfile(accessor, ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY),
    /必须是可枚举数据字段/,
  );
  assert.equal(getterReads, 0);
  engine.destroy();
});

test('PA1.1 RuleEngine profile boundary keeps legacy full output exact', () => {
  const engine = createRuleEngine();
  const options = {
    tick: 0,
    participantId: 'player-1',
    actors: ruleActors(),
    additionalCandidates: [],
  };
  const legacy = engine.getActionAffordance(options);
  const full = engine.getActionAffordanceProfile(options, ACTION_AFFORDANCE_PROFILE.FULL_AUDIT);
  const local = engine.getActionAffordanceProfile(options, ACTION_AFFORDANCE_PROFILE.LOCAL_CONTEXT_PRIMARY);
  const bot = engine.getActionAffordanceProfile(options, ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY);
  assert.deepEqual(full, legacy);
  assert.deepEqual(local.channels.primary, legacy.channels.primary);
  assert.deepEqual(local.channels.primaryHold, legacy.channels.primaryHold);
  assert.equal(local.primaryActionDefinitionId, legacy.primaryActionDefinitionId);
  assert.deepEqual(bot.channels.jump, legacy.channels.jump);
  assert.deepEqual(bot.channels.slam, legacy.channels.slam);
  assertFrozenProfileResult(full);
  assertFrozenProfileResult(local);
  assertFrozenProfileResult(bot);
  engine.destroy();
});

test('PA1.1 unknown profile is closed at the RuleEngine boundary', () => {
  const engine = createRuleEngine();
  const options = {
    tick: 0,
    participantId: 'player-1',
    actors: ruleActors(),
    additionalCandidates: [],
  };
  assert.throws(
    () =>
      Reflect.apply(engine.getActionAffordanceProfile, engine, [
        options,
        { channels: ['primary'] },
      ]),
    /不支持的 ActionAffordance profile/,
  );
  assert.doesNotThrow(() => engine.getActionAffordance(options));
  engine.destroy();
});
