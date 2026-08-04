import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  ActionRegistry,
} from '@number-strategy-jump/arena-definitions';
import type { ActionDefinition } from '@number-strategy-jump/arena-definitions';
import {
  ACTION_PRIORITY,
  ACTION_RESOLUTION_KIND,
} from '@number-strategy-jump/arena-core';
import type {
  ActionCandidate,
  ActionIntentInput,
  ActionResolutionContext,
  ActionResolutionResult,
} from '@number-strategy-jump/arena-core';
import {
  ActionAffordanceProjector,
  type ActionAffordance,
} from '../../packages/arena-core/src/action-affordance.js';
import {
  ActionResolver,
  getActionResolverPreviewPort,
} from '../../packages/arena-core/src/action-resolver.js';

function action(
  id: string,
  options: Readonly<{
    channel?: (typeof ACTION_INPUT_CHANNEL)[keyof typeof ACTION_INPUT_CHANNEL];
    lane?: (typeof ACTION_LANE)[keyof typeof ACTION_LANE];
    conflictTags?: readonly string[];
  }> = {},
): ActionDefinition {
  return {
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'test',
    input: {
      channel: options.channel ?? ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: options.lane ?? ACTION_LANE.COMBAT,
    conflictTags: options.conflictTags ?? [],
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

function candidate(
  id: string,
  actionDefinitionId: string,
  priority: number = ACTION_PRIORITY.BASE,
  overrides: Partial<ActionCandidate> = {},
): ActionCandidate {
  return {
    id,
    actionDefinitionId,
    source: 'pa1-test',
    priority,
    available: true,
    blocksFallback: false,
    unavailableReason: null,
    ...overrides,
  };
}

function input(overrides: Partial<ActionIntentInput> = {}): ActionIntentInput {
  return {
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
    ...overrides,
  };
}

function baseContext(
  candidates: readonly unknown[],
  overrides: Partial<ActionResolutionContext> = {},
): Omit<ActionResolutionContext, 'input'> {
  return {
    tick: 12,
    participantId: 'player-1',
    canAct: true,
    candidates,
    occupiedLanes: [],
    activeConflictTags: [],
    ...overrides,
  };
}

function projectedOutcome(result: ActionResolutionResult, inputChannel: string) {
  const outcome = result.outcomes.find(({ inputChannel: channel }) => channel === inputChannel)
    ?? result.outcomes[0];
  assert.ok(outcome);
  return {
    kind: outcome.kind,
    actionDefinitionId: outcome.actionDefinitionId,
    lane: outcome.lane,
    source: outcome.source,
    reason: outcome.reason,
  };
}

function createFallbackResolver(
  mutate: (context: ActionResolutionContext, result: ActionResolutionResult) => ActionResolutionResult,
) {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([action('primary-action')]),
  });
  return {
    resolve(contextValue: unknown): ActionResolutionResult {
      const context = contextValue as ActionResolutionContext;
      return mutate(context, resolver.resolve(context));
    },
  };
}

function assertFrozenAffordance(affordance: Readonly<ActionAffordance>) {
  assert.ok(Object.isFrozen(affordance));
  assert.ok(Object.isFrozen(affordance.channels));
  for (const outcome of Object.values(affordance.channels)) assert.ok(Object.isFrozen(outcome));
}

function collectTypeScriptSources(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectTypeScriptSources(path));
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(path);
  }
  return files;
}

test('PA1 projector evaluates four independent intents with legacy field parity', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([
      action('primary-action'),
      action('jump-action', { channel: ACTION_INPUT_CHANNEL.JUMP, lane: ACTION_LANE.LOCOMOTION }),
      action('slam-action', { channel: ACTION_INPUT_CHANNEL.SLAM, lane: ACTION_LANE.INTERACTION }),
    ]),
  });
  const projector = new ActionAffordanceProjector({ resolver });
  const candidates = [
    candidate('primary-candidate', 'primary-action'),
    candidate('jump-candidate', 'jump-action', ACTION_PRIORITY.LOCOMOTION),
    candidate('slam-candidate', 'slam-action', ACTION_PRIORITY.AIR),
  ];
  const context = baseContext(candidates);
  const affordance = projector.project(context);
  const probes: Readonly<Record<string, ActionIntentInput>> = {
    primary: input({ primaryPressed: true }),
    primaryHold: input({ primaryHeld: true }),
    jump: input({ jumpPressed: true }),
    slam: input({ slamPressed: true }),
  };

  for (const [name, probe] of Object.entries(probes)) {
    const legacy = resolver.resolve({ ...context, input: probe });
    assert.deepEqual(
      affordance.channels[name],
      projectedOutcome(legacy, name === 'primary' || name === 'primaryHold'
        ? ACTION_INPUT_CHANNEL.PRIMARY
        : name === 'jump' ? ACTION_INPUT_CHANNEL.JUMP : ACTION_INPUT_CHANNEL.SLAM),
    );
  }
  assert.deepEqual(Object.keys(affordance.channels), ['primary', 'primaryHold', 'jump', 'slam']);
  assert.equal(affordance.primaryActionDefinitionId, 'primary-action');
  assert.ok(Object.isFrozen(affordance));
  assert.ok(Object.isFrozen(affordance.channels));
});

test('PA1 canAct=false keeps display identity internal and exposes no fifth outcome', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([action('primary-action')]),
  });
  const projector = new ActionAffordanceProjector({ resolver });
  const affordance = projector.project(baseContext([
    candidate('primary-candidate', 'primary-action'),
  ], { canAct: false }));

  assert.equal(affordance.primaryActionDefinitionId, 'primary-action');
  const primary = affordance.channels.primary;
  assert.ok(primary);
  assert.equal(primary.kind, ACTION_RESOLUTION_KIND.IGNORED);
  assert.equal(primary.reason, 'participant-unavailable');
  assert.deepEqual(Object.keys(affordance.channels), ['primary', 'primaryHold', 'jump', 'slam']);
  assert.equal('displayPrimary' in affordance.channels, false);
});

test('PA1 fixed canAct=false fixture preserves public channels and display identity', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([action('primary-action')]),
  });
  const affordance = new ActionAffordanceProjector({ resolver }).project(baseContext([
    candidate('primary-candidate', 'primary-action'),
  ], { canAct: false }));

  assert.deepEqual(affordance, {
    tick: 12,
    participantId: 'player-1',
    channels: {
      primary: {
        kind: ACTION_RESOLUTION_KIND.IGNORED,
        actionDefinitionId: null,
        lane: null,
        source: null,
        reason: 'participant-unavailable',
      },
      primaryHold: {
        kind: ACTION_RESOLUTION_KIND.IGNORED,
        actionDefinitionId: null,
        lane: null,
        source: null,
        reason: 'participant-unavailable',
      },
      jump: {
        kind: ACTION_RESOLUTION_KIND.IGNORED,
        actionDefinitionId: null,
        lane: null,
        source: null,
        reason: 'participant-unavailable',
      },
      slam: {
        kind: ACTION_RESOLUTION_KIND.IGNORED,
        actionDefinitionId: null,
        lane: null,
        source: null,
        reason: 'participant-unavailable',
      },
    },
    primaryActionDefinitionId: 'primary-action',
  });
  assert.equal('displayPrimary' in affordance.channels, false);
});

test('PA1 fixed multi-intent fixture locks order, lane conflict, and reasons', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([
      action('primary-action', { lane: ACTION_LANE.COMBAT }),
      action('jump-action', { channel: ACTION_INPUT_CHANNEL.JUMP, lane: ACTION_LANE.COMBAT }),
    ]),
  });
  const result = resolver.resolve({
    ...baseContext([
      candidate('primary-candidate', 'primary-action'),
      candidate('jump-candidate', 'jump-action'),
    ]),
    input: input({ primaryPressed: true, jumpPressed: true }),
  });

  assert.deepEqual(result, {
    tick: 12,
    participantId: 'player-1',
    outcomes: [
      {
        kind: ACTION_RESOLUTION_KIND.IGNORED,
        tick: 12,
        participantId: 'player-1',
        inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
        lane: ACTION_LANE.COMBAT,
        reason: 'same-tick-lane-conflict',
        candidateId: 'primary-candidate',
        actionDefinitionId: 'primary-action',
        source: 'pa1-test',
      },
      {
        kind: ACTION_RESOLUTION_KIND.SELECTED,
        tick: 12,
        participantId: 'player-1',
        inputChannel: ACTION_INPUT_CHANNEL.JUMP,
        lane: ACTION_LANE.COMBAT,
        reason: 'candidate-selected',
        candidateId: 'jump-candidate',
        actionDefinitionId: 'jump-action',
        source: 'pa1-test',
      },
    ],
  });
});

test('PA1 fixed occupied-lane fixture locks rejection outcome and frozen projection', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([action('primary-action', { lane: ACTION_LANE.COMBAT })]),
  });
  const context = baseContext([
    candidate('primary-candidate', 'primary-action'),
  ], { occupiedLanes: [ACTION_LANE.COMBAT] });
  const result = resolver.resolve({ ...context, input: input({ primaryPressed: true }) });
  const expected = {
    kind: ACTION_RESOLUTION_KIND.IGNORED,
    tick: 12,
    participantId: 'player-1',
    inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
    lane: ACTION_LANE.COMBAT,
    reason: 'action-lane-occupied',
    candidateId: 'primary-candidate',
    actionDefinitionId: 'primary-action',
    source: 'pa1-test',
  };
  assert.deepEqual(result.outcomes, [expected]);
  const affordance = new ActionAffordanceProjector({ resolver }).project(context);
  assert.deepEqual(affordance.channels.primary, {
    kind: expected.kind,
    actionDefinitionId: expected.actionDefinitionId,
    lane: expected.lane,
    source: expected.source,
    reason: expected.reason,
  });
  assertFrozenAffordance(affordance);
});

test('PA1 fixed active-conflict fixture locks rejection outcome and frozen projection', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([action('conflict-action', {
      lane: ACTION_LANE.INTERACTION,
      conflictTags: ['equipment'],
    })]),
  });
  const context = baseContext([
    candidate('conflict-candidate', 'conflict-action'),
  ], { activeConflictTags: ['equipment'] });
  const result = resolver.resolve({ ...context, input: input({ primaryPressed: true }) });
  const expected = {
    kind: ACTION_RESOLUTION_KIND.IGNORED,
    tick: 12,
    participantId: 'player-1',
    inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
    lane: ACTION_LANE.INTERACTION,
    reason: 'active-action-conflict',
    candidateId: 'conflict-candidate',
    actionDefinitionId: 'conflict-action',
    source: 'pa1-test',
  };
  assert.deepEqual(result.outcomes, [expected]);
  const affordance = new ActionAffordanceProjector({ resolver }).project(context);
  assert.deepEqual(affordance.channels.primary, {
    kind: expected.kind,
    actionDefinitionId: expected.actionDefinitionId,
    lane: expected.lane,
    source: expected.source,
    reason: expected.reason,
  });
  assertFrozenAffordance(affordance);
});

test('PA1 projector rejects every resolution identity drift, including display fallback', () => {
  const options = baseContext([candidate('primary-candidate', 'primary-action')]);
  assert.throws(
    () => new ActionAffordanceProjector({
      resolver: createFallbackResolver((context, result) => ({
        ...result,
        tick: context.tick + 1,
      })),
    }).project(options),
    /tick\/participantId 与 project options 不一致/
  );
  assert.throws(
    () => new ActionAffordanceProjector({
      resolver: createFallbackResolver((context, result) => ({
        ...result,
        participantId: `${context.participantId}-wrong`,
      })),
    }).project(options),
    /tick\/participantId 与 project options 不一致/
  );
  assert.throws(
    () => new ActionAffordanceProjector({
      resolver: createFallbackResolver((context, result) => context.input.jumpPressed
        ? { ...result, tick: context.tick + 1 }
        : result),
    }).project(options),
    /tick\/participantId 与 project options 不一致/
  );
  assert.throws(
    () => new ActionAffordanceProjector({
      resolver: createFallbackResolver((context, result) => context.canAct
        ? { ...result, participantId: `${context.participantId}-display-wrong` }
        : result),
    }).project({ ...options, canAct: false }),
    /tick\/participantId 与 project options 不一致/
  );
});

test('PA1 preview port remains opaque and instance-bound', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([action('primary-action')]),
  });
  const port = getActionResolverPreviewPort(resolver);
  assert.ok(port);
  assert.equal(getActionResolverPreviewPort({ ...resolver }), null);
  const copiedResolver = { resolve: resolver.resolve.bind(resolver) };
  assert.equal(getActionResolverPreviewPort(copiedResolver), null);
  const proxyResolver = new Proxy(resolver, {});
  assert.equal(getActionResolverPreviewPort(proxyResolver), null);
  assert.doesNotThrow(() => new ActionAffordanceProjector({ resolver: copiedResolver }).project(
    baseContext([candidate('primary-candidate', 'primary-action')]),
  ));
  assert.equal(getActionResolverPreviewPort({ resolve: () => { throw new Error('fake'); } }), null);
});

test('PA1.1 without-display preview shares preparation and restores legacy display semantics', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([action('primary-action')]),
  });
  const port = getActionResolverPreviewPort(resolver);
  assert.ok(port);
  const previewContext = baseContext([
    candidate('primary-candidate', 'primary-action'),
  ], { canAct: false });
  const intents = [input({ jumpPressed: true }), input({ slamPressed: true })];
  const legacy = port.resolve(previewContext, intents);
  const withoutDisplay = port.resolveWithoutDisplay(previewContext, intents);
  assert.equal(legacy.resolutions.length, 2);
  assert.ok(legacy.displayResolution);
  assert.equal(withoutDisplay.resolutions.length, 2);
  assert.equal(withoutDisplay.displayResolution, null);
  assert.deepEqual(withoutDisplay.resolutions, legacy.resolutions);
  assert.equal(port.resolve(previewContext, [input({ primaryPressed: true })]).displayResolution !== null, true);
  assert.equal(port.resolveWithoutDisplay(previewContext, [input({ primaryPressed: true })]).displayResolution, null);
});

test('PA1.1 without-display malformed batches fail before prepare and recover', () => {
  let requireCalls = 0;
  const sourceRegistry = new ActionRegistry([action('primary-action')]);
  const resolver = new ActionResolver({
    actionRegistry: {
      require(id: string) {
        requireCalls += 1;
        return sourceRegistry.require(id);
      },
    },
  });
  const port = getActionResolverPreviewPort(resolver);
  assert.ok(port);
  const previewContext = baseContext([
    candidate('primary-candidate', 'primary-action'),
  ]);
  const malformed = {};
  Object.defineProperty(malformed, 'primaryPressed', {
    enumerable: true,
    get() {
      throw new Error('without-display malformed getter must not execute');
    },
  });
  assert.throws(
    () => port.resolveWithoutDisplay(previewContext, [input({ primaryPressed: true }), malformed]),
    /必须是可枚举数据字段/,
  );
  assert.equal(requireCalls, 0);
  const recovered = port.resolveWithoutDisplay(previewContext, [input({ primaryPressed: true })]);
  assert.equal(requireCalls, 1);
  assert.equal(recovered.resolutions.length, 1);
  assert.equal(recovered.displayResolution, null);
});

test('PA1 subclasses stay on the fallback resolver path', () => {
  let overrideCalls = 0;
  class CustomResolver extends ActionResolver {
    override resolve(contextValue: unknown): ActionResolutionResult {
      overrideCalls += 1;
      return super.resolve(contextValue);
    }
  }
  const resolver = new CustomResolver({
    actionRegistry: new ActionRegistry([action('primary-action')]),
  });
  assert.equal(getActionResolverPreviewPort(resolver), null);
  const affordance = new ActionAffordanceProjector({ resolver }).project(baseContext([
    candidate('primary-candidate', 'primary-action'),
  ]));
  assert.equal(overrideCalls, 4);
  assert.equal(affordance.primaryActionDefinitionId, 'primary-action');
});

test('PA1 authority multi-channel input keeps same-tick conflict semantics separate from previews', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([
      action('primary-action', { lane: ACTION_LANE.COMBAT }),
      action('jump-action', { channel: ACTION_INPUT_CHANNEL.JUMP, lane: ACTION_LANE.COMBAT }),
    ]),
  });
  const projector = new ActionAffordanceProjector({ resolver });
  const context = baseContext([
    candidate('primary-candidate', 'primary-action'),
    candidate('jump-candidate', 'jump-action'),
  ]);
  const affordance = projector.project(context);
  const primary = affordance.channels.primary;
  const jump = affordance.channels.jump;
  assert.ok(primary);
  assert.ok(jump);
  assert.equal(primary.kind, ACTION_RESOLUTION_KIND.SELECTED);
  assert.equal(jump.kind, ACTION_RESOLUTION_KIND.SELECTED);

  const authority = resolver.resolve({
    ...context,
    input: input({ primaryPressed: true, jumpPressed: true }),
  });
  assert.equal(authority.outcomes.filter(({ kind }) => kind === ACTION_RESOLUTION_KIND.SELECTED).length, 1);
  assert.equal(authority.outcomes.filter(({ reason }) => reason === 'same-tick-lane-conflict').length, 1);
});

test('PA1 candidate registration order is stable and malformed preview batch fails atomically', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([action('first-action'), action('second-action')]),
  });
  const port = getActionResolverPreviewPort(resolver);
  assert.ok(port);
  const first = candidate('a-candidate', 'first-action', 300);
  const second = candidate('z-candidate', 'second-action', 300);
  const context = baseContext([second, first]);
  const probe = input({ primaryPressed: true });
  const initial = port.resolve(context, [probe]);
  assert.equal(initial.resolutions[0]?.outcomes[0]?.candidateId, 'a-candidate');

  let accessorReads = 0;
  const malformed = {};
  Object.defineProperty(malformed, 'primaryPressed', {
    enumerable: true,
    get() {
      accessorReads += 1;
      throw new Error('preview input accessor must not execute');
    },
  });
  assert.throws(
    () => port.resolve(context, [probe, probe, malformed, probe]),
    /必须是可枚举数据字段/,
  );
  assert.equal(accessorReads, 0);
  const recovered = port.resolve(context, [probe]);
  assert.equal(recovered.resolutions[0]?.outcomes[0]?.candidateId, 'a-candidate');
  assert.ok(Object.isFrozen(recovered));
  assert.ok(Object.isFrozen(recovered.resolutions));
});

test('PA1 malformed intent batch prepares no registry or candidate cache state', () => {
  let requireCalls = 0;
  const sourceRegistry = new ActionRegistry([action('primary-action')]);
  const resolver = new ActionResolver({
    actionRegistry: {
      require(id: string) {
        requireCalls += 1;
        return sourceRegistry.require(id);
      },
    },
  });
  const port = getActionResolverPreviewPort(resolver);
  assert.ok(port);
  const context = baseContext([candidate('primary-candidate', 'primary-action')]);
  const valid = input({ primaryPressed: true });
  const malformed = {};
  Object.defineProperty(malformed, 'primaryPressed', {
    enumerable: true,
    get() {
      throw new Error('malformed preview getter must not execute');
    },
  });

  assert.throws(() => port.resolve(context, [valid, malformed]), /必须是可枚举数据字段/);
  assert.equal(requireCalls, 0);
  const recovered = port.resolve(context, [valid]);
  assert.equal(requireCalls, 1);
  assert.equal(recovered.resolutions.length, 1);
  assert.equal(recovered.resolutions[0]?.outcomes[0]?.candidateId, 'primary-candidate');
});

test('PA1 strict preview array rejects hidden Proxy indexes without get trap execution', () => {
  const resolver = new ActionResolver({
    actionRegistry: new ActionRegistry([action('primary-action')]),
  });
  const port = getActionResolverPreviewPort(resolver);
  assert.ok(port);
  const context = baseContext([candidate('primary-candidate', 'primary-action')]);
  let getReads = 0;
  const hidden = new Proxy([input({ primaryPressed: true })], {
    ownKeys() {
      return ['length'];
    },
    getOwnPropertyDescriptor(target, key) {
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() {
      getReads += 1;
      throw new Error('preview array get trap must not execute');
    },
  });
  assert.throws(() => port.resolve(context, hidden), /隐藏索引/);
  assert.equal(getReads, 0);
  assert.doesNotThrow(() => port.resolve(context, [input({ primaryPressed: true })]));
});

test('PA1 preview port production consumer has a narrow source allowlist', () => {
  const repositoryRoot = process.cwd();
  const packagesRoot = join(repositoryRoot, 'packages');
  const sourceRoots = readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packagesRoot, entry.name, 'src'))
    .filter((root) => {
      try {
        readdirSync(root);
        return true;
      } catch {
        return false;
      }
    });
  const rootSource = join(repositoryRoot, 'src');
  try {
    readdirSync(rootSource);
    sourceRoots.push(rootSource);
  } catch {
    // This repository currently has no root src directory.
  }
  const productionSources = sourceRoots.flatMap(collectTypeScriptSources);
  const allowedPortFiles = new Set([
    join(repositoryRoot, 'packages/arena-core/src/action-affordance.ts'),
    join(repositoryRoot, 'packages/arena-core/src/action-resolver.ts'),
  ]);
  const consumerSource = readFileSync(
    join(repositoryRoot, 'packages/arena-core/src/action-affordance.ts'),
    'utf8',
  );
  assert.match(consumerSource, /getActionResolverPreviewPort/);
  for (const file of productionSources) {
    if (allowedPortFiles.has(file)) continue;
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /getActionResolverPreviewPort|ActionResolverPreviewPort/);
  }
});
