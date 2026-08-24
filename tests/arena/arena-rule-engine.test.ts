import test from 'node:test';
import assert from 'node:assert/strict';
import type { ArenaInputFrame } from '@number-strategy-jump/arena-contracts';
import {
  ActionRegistry,
  EquipmentRegistry,
  createActionDefinition,
} from '@number-strategy-jump/arena-definitions';
import type {
  ArenaRuleEngineContract,
  RuleActor,
  RuleImpulse,
  RuleMutationPorts,
} from '@number-strategy-jump/arena-core';
import {
  createArenaV1AuthorityContent,
  createArenaV1RuleEngine,
} from '@number-strategy-jump/arena-v1-composition';
import { createArenaMatchConfig } from '@number-strategy-jump/arena-match';
import {
  createArenaV2WeaponCandidateContentRegistries,
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`测试缺少 ${name}。`);
  return value;
}

function createEngine(configOverrides: Record<string, unknown> = {}): ArenaRuleEngineContract {
  const config = createArenaMatchConfig({ preparingTicks: 0, ...configOverrides });
  return createArenaV1RuleEngine({ participantIds: config.participantIds, config });
}

function createCommitmentEngine(): ArenaRuleEngineContract {
  const config = createArenaMatchConfig({ preparingTicks: 0 });
  const base = createArenaV2WeaponCandidateContentRegistries();
  const baseAction = base.actionRegistry.require(STAGE4_ACTION_ID.BASE_PUSH);
  const actionRegistry = new ActionRegistry(base.actionRegistry.list().map((definition) => (
    definition.id === baseAction.id
      ? createActionDefinition({
        ...definition,
        commitment: {
          commitTicks: 1,
          expireTicks: 4,
          expireOutcome: 'cancel',
          canTurn: true,
          levelThresholds: [1],
        },
      })
      : definition
  )));
  const equipmentRegistry = new EquipmentRegistry({
    definitions: base.equipmentRegistry.list(),
    actionRegistry,
  });
  const authorityContent = createArenaV1AuthorityContent(config);
  return createArenaV1RuleEngine({
    participantIds: config.participantIds,
    config,
    authorityContent: {
      ...authorityContent,
      actionRegistry,
      equipmentRegistry,
    },
  });
}

function commitmentFrames(tick: number, primaryHeld: boolean): ArenaInputFrame[] {
  return frames(tick, ['player-1']).map((frame) => (
    frame.participantId === 'player-1' ? { ...frame, primaryHeld } : frame
  ));
}

function actor(
  id: string,
  x: number,
  facingX: number,
  overrides: Partial<RuleActor> = {},
): RuleActor {
  return {
    id,
    canAct: true,
    targetable: true,
    position: { x, y: 1, z: 0 },
    facing: { x: facingX, z: 0 },
    ...overrides,
  };
}

function actors(distance = 1): RuleActor[] {
  return [actor('player-1', 0, 1), actor('player-2', distance, -1)];
}

function frames(tick: number, pressedIds: readonly string[] = []): ArenaInputFrame[] {
  return ['player-1', 'player-2'].map((participantId) => ({
    tick,
    participantId,
    moveX: 0,
    moveZ: 0,
    primaryPressed: pressedIds.includes(participantId),
    primaryHeld: pressedIds.includes(participantId),
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  }));
}

function createPorts() {
  const recorded: {
    hits: Array<[string, string, string]>;
    hitstuns: Array<[string, number]>;
    impulses: Array<[string, RuleImpulse]>;
  } = { hits: [], hitstuns: [], impulses: [] };
  const ports: RuleMutationPorts = {
    recordHit: (...values) => recorded.hits.push(values),
    applyHitstun: (...values) => recorded.hitstuns.push(values),
    applyImpulse: (...values) => recorded.impulses.push(values),
  };
  return {
    recorded,
    ports,
  };
}

test('ArenaRuleEngine migrates base push through resolver, state, targeting, effects and commands', () => {
  const engine = createEngine();
  const started = engine.resolveActions({ tick: 0, actors: actors(), inputFrames: frames(0, ['player-1']) });
  assert.equal(required(started.starts[0], '启动动作').actionDefinitionId, STAGE4_ACTION_ID.BASE_PUSH);
  assert.deepEqual(started.events.map(({ type }) => type), ['ActionStarted']);
  const startPorts = createPorts();
  engine.commit(started, startPorts.ports);
  assert.deepEqual(startPorts.recorded, { hits: [], hitstuns: [], impulses: [] });

  for (let tick = 0; tick < 8; tick += 1) engine.advanceTimers();
  const active = engine.resolveActiveActions({ actors: actors() });
  assert.deepEqual(active.hits, [{
    attackerId: 'player-1',
    targetId: 'player-2',
    actionDefinitionId: STAGE4_ACTION_ID.BASE_PUSH,
  }]);
  assert.deepEqual(active.events.map(({ type }) => type), ['HitResolved', 'KnockbackApplied']);
  const { ports, recorded } = createPorts();
  engine.commit(active, ports);
  assert.deepEqual(recorded.hits, [['player-1', 'player-2', STAGE4_ACTION_ID.BASE_PUSH]]);
  assert.deepEqual(recorded.hitstuns, [['player-2', 24]]);
  assert.deepEqual(recorded.impulses, [['player-2', { x: 8.5, y: 4.8, z: 0 }]]);
  assert.deepEqual(engine.resolveActiveActions({ actors: actors() }).hits, []);
  engine.destroy();
});

test('base attack can start at any distance and only resolves a hit during active range', () => {
  const engine = createEngine({ contextPrimaryMobilityEnabled: false });
  const distantActors = actors(12);
  const started = engine.resolveActions({
    tick: 0,
    actors: distantActors,
    inputFrames: frames(0, ['player-1']),
  });
  assert.equal(required(started.starts[0], '远距离启动动作').actionDefinitionId, STAGE4_ACTION_ID.BASE_PUSH);
  assert.equal(required(started.events[0], '远距离启动事件').type, 'ActionStarted');
  for (let tick = 0; tick < 8; tick += 1) engine.advanceTimers();
  const active = engine.resolveActiveActions({ actors: distantActors });
  assert.deepEqual(active.hits, []);
  assert.deepEqual(active.events, []);
  engine.destroy();
});

test('base push overrides are adapted into one ActionDefinition truth', () => {
  const engine = createEngine({
    basePush: {
      windupTicks: 1,
      activeTicks: 1,
      recoveryTicks: 2,
      hitstunTicks: 7,
      horizontalImpulse: 3,
      verticalImpulse: 2,
    },
  });
  engine.resolveActions({ tick: 0, actors: actors(), inputFrames: frames(0, ['player-1']) });
  engine.advanceTimers();
  const batch = engine.resolveActiveActions({ actors: actors() });
  const { ports, recorded } = createPorts();
  engine.commit(batch, ports);
  assert.deepEqual(recorded.hitstuns, [['player-2', 7]]);
  assert.deepEqual(recorded.impulses, [['player-2', { x: 3, y: 2, z: 0 }]]);
  engine.destroy();
});

test('rule content hash and public action view follow the immutable registered content', () => {
  const baseline = createEngine();
  const tuned = createEngine({ basePush: { range: 2.25 } });
  assert.match(baseline.getContentHash(), /^[0-9a-f]{8}$/);
  assert.notEqual(baseline.getContentHash(), tuned.getContentHash());
  assert.equal(baseline.getParticipantActionRule('player-1').definitionId, STAGE4_ACTION_ID.BASE_PUSH);

  baseline.spawnEquipment({
    instanceId: 'chain-public-view',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'public-view',
    position: { x: 0, y: 1, z: 0 },
  });
  baseline.resolveEquipmentPickups({
    participants: actors(10).map(({ id, position }) => ({ id, position, eligible: true })),
    contestSeed: 1,
  });
  const equippedRule = baseline.getParticipantActionRule('player-1');
  assert.equal(equippedRule.definitionId, STAGE4_ACTION_ID.CHAIN_PULL);
  assert.equal(equippedRule.range, 5);
  assert.ok(Object.isFrozen(equippedRule));
  baseline.destroy();
  tuned.destroy();
});

test('ActionAffordance is a frozen next-tick projection of the same resolver candidates', () => {
  const engine = createEngine();
  const currentActors = actors();
  const affordance = engine.getActionAffordance({
    tick: 0,
    participantId: 'player-1',
    actors: currentActors,
  });
  assert.equal(affordance.primaryActionDefinitionId, STAGE4_ACTION_ID.BASE_PUSH);
  assert.equal(required(affordance.channels.primary, '主动作可用性').kind, 'selected');
  assert.ok(Object.isFrozen(affordance));
  assert.ok(Object.isFrozen(affordance.channels));
  assert.ok(Object.isFrozen(required(affordance.channels.primary, '冻结的主动作可用性')));

  const resolved = engine.resolveActions({
    tick: 0,
    actors: currentActors,
    inputFrames: frames(0, ['player-1']),
  });
  assert.equal(required(resolved.starts[0], '投影后的启动动作').actionDefinitionId, affordance.primaryActionDefinitionId);
  assert.throws(() => engine.getActionAffordance({
    tick: 1,
    participantId: 'unknown',
    actors: currentActors,
  }), /未知 affordance participant/);
  assert.throws(() => engine.getActionAffordance({
    tick: 1,
    participantId: 'player-1',
    actors: currentActors,
    leaked: true,
  }), /不支持字段 leaked/);
  engine.destroy();
});

test('ActionAffordance rejects malformed candidate arrays without invoking accessors', () => {
  const engine = createEngine();
  const currentActors = actors();
  const sparseCandidates: unknown[] = [];
  sparseCandidates.length = 1;
  assert.throws(() => engine.getActionAffordance({
    tick: 0,
    participantId: 'player-1',
    actors: currentActors,
    additionalCandidates: sparseCandidates,
  }), /必须是可枚举数据字段/);

  let accessorReads = 0;
  const accessorCandidates: unknown[] = [];
  Object.defineProperty(accessorCandidates, '0', {
    enumerable: true,
    get() {
      accessorReads += 1;
      return {};
    },
  });
  accessorCandidates.length = 1;
  assert.throws(() => engine.getActionAffordance({
    tick: 0,
    participantId: 'player-1',
    actors: currentActors,
    additionalCandidates: accessorCandidates,
  }), /必须是可枚举数据字段/);
  assert.equal(accessorReads, 0);

  const candidatesWithExtraField: unknown[] & { leaked?: boolean } = [];
  candidatesWithExtraField.leaked = true;
  assert.throws(() => engine.getActionAffordance({
    tick: 0,
    participantId: 'player-1',
    actors: currentActors,
    additionalCandidates: candidatesWithExtraField,
  }), /不能包含额外字段/);

  let hiddenIndexReads = 0;
  const hiddenIndex = new Proxy([{}], {
    ownKeys() {
      return ['length'];
    },
    getOwnPropertyDescriptor(target, key) {
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() {
      hiddenIndexReads += 1;
      throw new Error('hidden index get trap must not execute');
    },
  });
  assert.throws(() => engine.getActionAffordance({
    tick: 0,
    participantId: 'player-1',
    actors: currentActors,
    additionalCandidates: hiddenIndex,
  }), /隐藏索引/);
  assert.equal(hiddenIndexReads, 0);

  let missingDescriptorReads = 0;
  const missingDescriptor = new Proxy([{}], {
    ownKeys() {
      return ['length', '0'];
    },
    getOwnPropertyDescriptor(target, key) {
      return key === '0' ? undefined : Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() {
      missingDescriptorReads += 1;
      throw new Error('missing descriptor get trap must not execute');
    },
  });
  assert.throws(() => engine.getActionAffordance({
    tick: 0,
    participantId: 'player-1',
    actors: currentActors,
    additionalCandidates: missingDescriptor,
  }), /必须是可枚举数据字段/);
  assert.equal(missingDescriptorReads, 0);
  engine.destroy();
});

test('additional candidate snapshots never read Proxy values after descriptor validation', () => {
  const engine = createEngine();
  let arrayReads = 0;
  let entryReads = 0;
  const entry = new Proxy({ participantId: 'player-1', candidates: [] }, {
    get() {
      entryReads += 1;
      throw new Error('entry get trap must not execute');
    },
  });
  const additionalCandidates = new Proxy([entry], {
    get() {
      arrayReads += 1;
      throw new Error('array get trap must not execute');
    },
  });
  const resolved = engine.resolveActions({
    tick: 0,
    actors: actors(),
    inputFrames: frames(0),
    additionalCandidates,
  });
  assert.deepEqual(resolved.starts, []);
  assert.equal(arrayReads, 0);
  assert.equal(entryReads, 0);
  engine.destroy();

  const inconsistentEngine = createEngine();
  let inconsistentReads = 0;
  const inconsistentEntry = new Proxy({ participantId: 'unknown', candidates: [] }, {
    get(target, key, receiver) {
      inconsistentReads += 1;
      if (key === 'participantId') return 'player-1';
      return Reflect.get(target, key, receiver);
    },
  });
  assert.throws(() => inconsistentEngine.resolveActions({
    tick: 0,
    actors: actors(),
    inputFrames: frames(0),
    additionalCandidates: [inconsistentEntry],
  }), /未知 participant unknown/);
  assert.equal(inconsistentReads, 0);
  inconsistentEngine.destroy();

  const unknownFieldEngine = createEngine();
  assert.throws(() => unknownFieldEngine.resolveActions({
    tick: 0,
    actors: actors(),
    inputFrames: frames(0),
    additionalCandidates: [{ participantId: 'player-1', candidates: [], leaked: true }],
  }), /不支持字段 leaked/);
  assert.deepEqual(unknownFieldEngine.resolveActions({
    tick: 0,
    actors: actors(),
    inputFrames: frames(0),
    additionalCandidates: [],
  }).starts, []);
  unknownFieldEngine.destroy();
});

test('malformed candidate rejection leaves a real commitment retryable in the same tick', () => {
  const subject = createCommitmentEngine();
  const fresh = createCommitmentEngine();
  const initial = commitmentFrames(0, true);
  const initialSubject = subject.resolveActions({
    tick: 0,
    actors: actors(),
    inputFrames: initial,
    additionalCandidates: [],
  });
  const initialFresh = fresh.resolveActions({
    tick: 0,
    actors: actors(),
    inputFrames: initial,
    additionalCandidates: [],
  });
  assert.equal(initialSubject.starts.length, 1);
  assert.deepEqual(initialSubject.starts, initialFresh.starts);

  const retryFrames = commitmentFrames(1, false);
  assert.throws(() => subject.resolveActions({
    tick: 1,
    actors: actors(),
    inputFrames: retryFrames,
    additionalCandidates: [{ participantId: 'player-1', candidates: [], leaked: true }],
  }), /不支持字段 leaked/);
  const retried = subject.resolveActions({
    tick: 1,
    actors: actors(),
    inputFrames: retryFrames,
    additionalCandidates: [],
  });
  const expected = fresh.resolveActions({
    tick: 1,
    actors: actors(),
    inputFrames: retryFrames,
    additionalCandidates: [],
  });
  assert.deepEqual(retried.starts, expected.starts);
  assert.deepEqual(retried.events, expected.events);
  assert.deepEqual(subject.getActionSnapshot('player-1'), fresh.getActionSnapshot('player-1'));
  subject.destroy();
  fresh.destroy();
});

test('same-tick symmetric actions collect both hits before interruption commits', () => {
  const engine = createEngine();
  engine.resolveActions({
    tick: 0,
    actors: actors(),
    inputFrames: frames(0, ['player-1', 'player-2']),
  });
  for (let tick = 0; tick < 8; tick += 1) engine.advanceTimers();
  const batch = engine.resolveActiveActions({ actors: actors() });
  assert.deepEqual(batch.hits.map(({ attackerId, targetId }) => [attackerId, targetId]), [
    ['player-1', 'player-2'],
    ['player-2', 'player-1'],
  ]);
  const { ports, recorded } = createPorts();
  engine.commit(batch, ports);
  assert.equal(recorded.impulses.length, 2);
  assert.equal(engine.getActionSnapshot('player-1').definitionId, null);
  assert.equal(engine.getActionSnapshot('player-2').definitionId, null);
  engine.destroy();
});

test('front shield guard cancels chain pull only from the guarded direction', () => {
  const engine = createEngine();
  engine.spawnEquipment({
    instanceId: 'chain-1',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'left',
    position: { x: 0, y: 1, z: 0 },
  });
  engine.spawnEquipment({
    instanceId: 'shield-1',
    definitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'right',
    position: { x: 3, y: 1, z: 0 },
  });
  const combatants = actors(3);
  engine.resolveEquipmentPickups({
    participants: combatants.map(({ id, position }) => ({ id, position, eligible: true })),
    contestSeed: 4,
  });
  const started = engine.resolveActions({
    tick: 0,
    actors: combatants,
    inputFrames: frames(0, ['player-1', 'player-2']),
  });
  const startCommit = createPorts();
  engine.commit(started, startCommit.ports);
  for (let tick = 0; tick < 12; tick += 1) engine.advanceTimers();
  const guarded = engine.resolveActiveActions({ actors: combatants });
  assert.deepEqual(guarded.hits.map(({ actionDefinitionId }) => actionDefinitionId), [
    STAGE4_ACTION_ID.CHAIN_PULL,
  ]);
  assert.equal(guarded.commands.some(({ kind }) => kind === 'apply-impulse'), false);

  const rearEngine = createEngine();
  rearEngine.spawnEquipment({
    instanceId: 'chain-1',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'left',
    position: { x: 0, y: 1, z: 0 },
  });
  rearEngine.spawnEquipment({
    instanceId: 'shield-1',
    definitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'right',
    position: { x: 3, y: 1, z: 0 },
  });
  const rearFacing = [required(combatants[0], '背向测试攻击者'), actor('player-2', 3, 1)];
  rearEngine.resolveEquipmentPickups({
    participants: rearFacing.map(({ id, position }) => ({ id, position, eligible: true })),
    contestSeed: 4,
  });
  const rearStarted = rearEngine.resolveActions({
    tick: 0,
    actors: rearFacing,
    inputFrames: frames(0, ['player-1', 'player-2']),
  });
  rearEngine.commit(rearStarted, createPorts().ports);
  for (let tick = 0; tick < 12; tick += 1) rearEngine.advanceTimers();
  const rear = rearEngine.resolveActiveActions({ actors: rearFacing });
  assert.equal(rear.commands.some(({ effectKind }) => effectKind === 'pull-to-source'), true);
  engine.destroy();
  rearEngine.destroy();
});

test('ArenaRuleEngine rejects malformed batches before mutation and has terminal lifecycle', () => {
  const engine = createEngine();
  const batch = engine.resolveActions({ tick: 0, actors: actors(), inputFrames: frames(0) });
  assert.throws(() => engine.commit(batch, {
    recordHit() {},
    applyHitstun() {},
  } as unknown as RuleMutationPorts), /缺少 applyImpulse/);
  assert.equal(engine.getActionSnapshot('player-1').definitionId, null);
  engine.destroy();
  engine.destroy();
  assert.throws(() => engine.advanceTimers(), /已销毁/);
});

test('ArenaRuleEngine keeps swallowed commit reentrancy sticky and stops later mutation ports', () => {
  const engine = createEngine({
    basePush: { windupTicks: 1, activeTicks: 1 },
  });
  engine.resolveActions({
    tick: 0,
    actors: actors(),
    inputFrames: frames(0, ['player-1']),
  });
  engine.advanceTimers();
  const batch = engine.resolveActiveActions({ actors: actors() });
  const reentryErrors: Error[] = [];
  let laterMutationPortCalls = 0;
  assert.throws(() => engine.commit(batch, {
    recordHit() {
      try {
        engine.advanceTimers();
      } catch (error) {
        reentryErrors.push(error instanceof Error ? error : new Error(String(error)));
      }
    },
    applyHitstun() { laterMutationPortCalls += 1; },
    applyImpulse() { laterMutationPortCalls += 1; },
  }), /commit 期间不可重入/);
  assert.match(required(reentryErrors[0], '重入错误').message, /commit 期间不可重入/);
  assert.equal(laterMutationPortCalls, 0);
  assert.throws(() => engine.advanceTimers(), /已失败/);
  engine.destroy();
});
