import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_MATCH_READ_PROFILE,
  createDeterministicDataHash,
  createNeutralInputFrame,
  normalizeInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  type MatchReadBinding,
  type MatchCore,
} from '@number-strategy-jump/arena-match';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { createArenaV2SurvivalSupplyMatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import { LocalMatchSession } from '@number-strategy-jump/arena-session';
import { TEST_MATCH_CONTENT_SELECTION } from './product/stage8-test-content.js';
import {
  createMatchReadBindingForOwner,
  createMatchReadOwnerPort,
  createMatchReadReaderForOwner,
  type MatchReadOwnerPort,
} from '../../packages/arena-match/src/match-read-port.js';

const PARTICIPANTS = Object.freeze(['player-1', 'player-2']);
const SURVIVAL_SUPPLY = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  spawnSpecs: Object.freeze([
    Object.freeze({
      slotId: 'left',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
      spawnId: 'pa2b-left',
      position: Object.freeze({ x: -1, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'right',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
      spawnId: 'pa2b-right',
      position: Object.freeze({ x: 1, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'spare',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
      spawnId: 'pa2b-spare',
      position: Object.freeze({ x: 3, y: 1, z: 0 }),
    }),
  ]),
});
const SURVIVAL_PROJECTION_CONTRACT = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick,
  spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnIntervalTicks,
  spawnCount: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnCount,
  lifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.lifetimeTicks,
  spawnSpecs: SURVIVAL_SUPPLY.spawnSpecs,
  equipmentDefinitionIds: Object.freeze([...new Set(
    SURVIVAL_SUPPLY.spawnSpecs.map(({ equipmentDefinitionId }) => equipmentDefinitionId),
  )]),
});
const FORMAL_SURVIVAL_COMPOSITION_CONTRACT_HASH = createDeterministicDataHash(
  SURVIVAL_PROJECTION_CONTRACT,
  'formal survival Bot trusted contract',
);

function createCore(overrides: Readonly<Record<string, unknown>> = {}): MatchCore {
  return createArenaV1MatchCore({
    seed: 704,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 100,
      hardLimitTicks: 120,
      ...overrides,
    },
  });
}

function descriptor(
  core: MatchCore,
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    schemaVersion: 1,
    compositionId: 'pa2b-test-composition',
    participantIds: [...core.config.participantIds],
    mapDefinitionId: core.config.mapDefinitionId,
    contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
    ...overrides,
  };
}

function bind(core: MatchCore, overrides: Readonly<Record<string, unknown>> = {}) {
  return core.createMatchReadBinding(descriptor(core, overrides));
}

function neutralFrames(core: MatchCore) {
  return core.config.participantIds.map((participantId) => (
    createNeutralInputFrame(core.tick, participantId)
  ));
}

function trustedNeutralFrames(core: MatchCore) {
  return Object.freeze(neutralFrames(core).map((frame) => (
    normalizeInputFrame(frame, {
      expectedTick: core.tick,
      participantIds: core.config.participantIds,
    })
  )));
}

function assertReaderFailure(
  action: () => unknown,
  pattern: RegExp,
): void {
  assert.throws(action, pattern);
}

test('PA2b binding clones and strictly validates the Core-owned descriptor', () => {
  const core = createCore();
  const invalidDescriptors: Readonly<Record<string, unknown>>[] = [
    { ...descriptor(core), schemaVersion: 0 },
    { ...descriptor(core), schemaVersion: 2 },
    { ...descriptor(core), compositionId: '' },
    { ...descriptor(core), participantIds: [...PARTICIPANTS].reverse() },
    { ...descriptor(core), participantIds: ['player-1', 'player-1'] },
    { ...descriptor(core), mapDefinitionId: 'map-future' },
    { ...descriptor(core), contentSelectionHash: '00000000' },
    { ...descriptor(core), compositionContractHash: 'ABCDEF12' },
    { ...descriptor(core), compositionContractHash: 'abcdef123' },
    { ...descriptor(core), configHash: core.configHash },
    { ...descriptor(core), authorityContentHash: core.ruleContentHash },
    { ...descriptor(core), compositionHash: 'deadbeef' },
    { ...descriptor(core), extra: true },
  ];
  for (const invalid of invalidDescriptors) {
    assertReaderFailure(() => core.createMatchReadBinding(invalid), /MatchRead|不支持|hash|schema/);
  }

  let getReads = 0;
  const proxied = new Proxy(descriptor(core), {
    get() {
      getReads += 1;
      throw new Error('descriptor getter must not run');
    },
  });
  const binding = core.createMatchReadBinding(proxied);
  assert.equal(getReads, 0);
  assert.equal(Object.isFrozen(binding), true);
  assert.deepEqual(Reflect.ownKeys(binding), []);
  assert.match(
    (core.createMatchReadReader(binding, 'player-1', ARENA_MATCH_READ_PROFILE.FULL_AUDIT)
      .read()).compositionHash,
    /^[0-9a-f]{8}$/,
  );
  core.destroy();
});

test('PA2b composition hash is the flat, Core-bound contract identity', () => {
  const firstCore = createCore();
  const secondCore = createCore();
  const firstBinding = bind(firstCore, { compositionContractHash: null });
  const omitted = { ...descriptor(secondCore) } as Record<string, unknown>;
  delete omitted.compositionContractHash;
  const secondBinding = secondCore.createMatchReadBinding(omitted);
  const firstHash = firstCore.createMatchReadReader(
    firstBinding,
    'player-1',
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  ).read().compositionHash;
  const secondHash = secondCore.createMatchReadReader(
    secondBinding,
    'player-1',
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  ).read().compositionHash;
  const expected = createDeterministicDataHash({
    schemaVersion: 1,
    compositionId: 'pa2b-test-composition',
    participantIds: [...firstCore.config.participantIds],
    mapDefinitionId: firstCore.config.mapDefinitionId,
    contentSelectionHash: null,
    compositionContractHash: null,
    configHash: firstCore.configHash,
    authorityContentHash: firstCore.ruleContentHash,
  }, 'PA2b expected composition hash');
  assert.equal(firstHash, expected);
  assert.equal(secondHash, expected);
  firstCore.destroy();
  secondCore.destroy();
});

test('PA2b rejects containers, cycles, sparse arrays, Symbols and accessors before binding', () => {
  const core = createCore();
  const missing = { ...descriptor(core) } as Record<string, unknown>;
  delete missing.compositionId;
  const cyclicParticipantIds: unknown[] = ['player-1', 'player-2'];
  cyclicParticipantIds[1] = cyclicParticipantIds;
  const cyclic = { ...descriptor(core), participantIds: cyclicParticipantIds } as Record<string, unknown>;
  const sparse = { ...descriptor(core), participantIds: ['player-1', ,] };
  const arrayExtra = { ...descriptor(core) } as Record<string, unknown>;
  const arrayWithExtra = ['player-1', 'player-2'] as unknown as Record<string, unknown>;
  Object.defineProperty(arrayWithExtra, 'extra', { value: true, enumerable: true });
  arrayExtra.participantIds = arrayWithExtra;
  const symbol = { ...descriptor(core) } as Record<PropertyKey, unknown>;
  Object.defineProperty(symbol, Symbol('extra'), { value: true, enumerable: true });
  const accessor = { ...descriptor(core) } as Record<string, unknown>;
  let accessorReads = 0;
  Object.defineProperty(accessor, 'compositionId', {
    enumerable: true,
    get() { accessorReads += 1; throw new Error('compositionId getter must not run'); },
  });
  const nestedAccessorIds = ['player-1', 'player-2'];
  Object.defineProperty(nestedAccessorIds, '0', {
    enumerable: true,
    get() { accessorReads += 1; throw new Error('participantIds getter must not run'); },
  });
  const nestedAccessor = {
    ...descriptor(core),
    participantIds: nestedAccessorIds,
  } as Record<string, unknown>;
  for (const value of [
    missing,
    cyclic,
    sparse,
    arrayExtra,
    symbol,
    accessor,
    nestedAccessor,
    { ...descriptor(core), compositionId: new Map() },
    { ...descriptor(core), participantIds: new Set() },
    { ...descriptor(core), mapDefinitionId: new Date(0) },
    { ...descriptor(core), contentSelectionHash: new Uint8Array([1]) },
  ]) {
    assertReaderFailure(
      () => core.createMatchReadBinding(value),
      /普通对象|循环|空槽|Symbol|可序列化|不支持字段|数据字段|数组不能/,
    );
  }
  assert.equal(accessorReads, 0);
  const valid = bind(core);
  assert.ok(valid);
  core.destroy();
});

test('PA2b reentrant owner read fails without replacing an existing memo', () => {
  const owner = {};
  let recursiveReader: { read(): unknown } | null = null;
  let recurse = false;
  const ownerPort = createMatchReadOwnerPort({
    owner,
    participantIds: ['participant-1'],
    mapDefinitionId: 'map-pa2b',
    contentSelectionHash: null,
    configHash: '11111111',
    authorityContentHash: '22222222',
    readIdentity: () => {
      if (recurse) recursiveReader?.read();
      return Object.freeze({
        generation: 1,
        tick: 0,
        eventSequence: 0,
        phase: 'running',
      });
    },
  });
  const binding = createMatchReadBindingForOwner(ownerPort, {
    schemaVersion: 1,
    compositionId: 'pa2b-harness',
    participantIds: ['participant-1'],
    mapDefinitionId: 'map-pa2b',
    contentSelectionHash: null,
    compositionContractHash: null,
  });
  recursiveReader = createMatchReadReaderForOwner(
    ownerPort,
    binding,
    'participant-1',
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  );
  const initial = recursiveReader.read();
  recurse = true;
  assert.throws(() => recursiveReader?.read(), /不可重入/);
  recurse = false;
  const recovered = recursiveReader.read();
  assert.strictEqual(recovered, initial);
  assert.strictEqual(recursiveReader.read(), initial);
});

test('PA2b binding supports contentSelection null/non-null and one binding per Core', () => {
  const ordinary = createCore();
  const first = bind(ordinary, { compositionContractHash: 'deadbeef' });
  assert.throws(
    () => ordinary.createMatchReadBinding(descriptor(ordinary)),
    /只允许创建一次/,
  );
  assert.doesNotThrow(() => ordinary.createMatchReadReader(
    first,
    'player-1',
    ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
  ));
  ordinary.destroy();

  const selected = createCore({
    contentSelection: TEST_MATCH_CONTENT_SELECTION,
  });
  assert.ok(selected.config.contentSelection?.contentHash);
  const selectedBinding = bind(selected, { compositionContractHash: '0123abcd' });
  const selectedMemo = selected.createMatchReadReader(
    selectedBinding,
    'player-2',
    ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
  ).read();
  assert.equal(selectedMemo.profile, ARENA_MATCH_READ_PROFILE.BOT_MOBILITY);
  selected.destroy();

  const survival = createArenaV2SurvivalSupplyMatchCore({
    seed: 706,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 2_400,
      hardLimitTicks: 2_500,
      arena: {
        killY: -4,
        surfaces: [{
          id: 'pa2b-survival-platform',
          center: { x: 0, y: -0.5, z: 0 },
          halfExtents: { x: 4, y: 0.5, z: 4 },
        }],
        spawns: [
          { x: -1, y: 1, z: 0 },
          { x: 1, y: 1, z: 0 },
        ],
      },
    },
    supply: SURVIVAL_SUPPLY,
  });
  const survivalBinding = bind(survival, {
    compositionContractHash: FORMAL_SURVIVAL_COMPOSITION_CONTRACT_HASH,
  });
  assert.match(FORMAL_SURVIVAL_COMPOSITION_CONTRACT_HASH, /^[0-9a-f]{8}$/);
  assert.equal(
    survival.createMatchReadReader(
      survivalBinding,
      'player-1',
      ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
    ).read().profile,
    ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
  );
  survival.destroy();
});

test('PA2b binding creation is atomic across descriptor Proxy reentrancy', () => {
  const core = createCore();
  let nestedBinding: MatchReadBinding | null = null;
  const nestedErrors: unknown[] = [];
  let trapCalls = 0;
  const proxied = new Proxy(descriptor(core), {
    ownKeys(target) {
      if (trapCalls === 0) {
        trapCalls += 1;
        try {
          nestedBinding = core.createMatchReadBinding(descriptor(core));
        } catch (error) {
          nestedErrors.push(error);
        }
        try {
          core.step(neutralFrames(core));
        } catch (error) {
          nestedErrors.push(error);
        }
        try {
          core.stepTrustedInputFrameBatch(Object.freeze(Object.create(null)));
        } catch (error) {
          nestedErrors.push(error);
        }
        try {
          core.createTrustedInputFrameBatch(trustedNeutralFrames(core));
        } catch (error) {
          nestedErrors.push(error);
        }
        try {
          core.destroy();
        } catch (error) {
          nestedErrors.push(error);
        }
      }
      return Reflect.ownKeys(target);
    },
  });
  const binding = core.createMatchReadBinding(proxied);
  assert.equal(nestedBinding, null);
  assert.equal(nestedErrors.length, 5);
  assert.doesNotThrow(() => core.createMatchReadReader(
    binding,
    'player-1',
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  ));
  core.destroy();

  const recoveredCore = createCore();
  const uncaughtProxy = new Proxy(descriptor(recoveredCore), {
    ownKeys(target) {
      recoveredCore.createMatchReadBinding(descriptor(recoveredCore));
      return Reflect.ownKeys(target);
    },
  });
  assert.throws(
    () => recoveredCore.createMatchReadBinding(uncaughtProxy),
    /创建不可重入|caller input validation/,
  );
  assert.doesNotThrow(() => recoveredCore.createMatchReadBinding(descriptor(recoveredCore)));
  recoveredCore.destroy();
});

test('PA2b trusted batch validation guard blocks authority and capability reentry', () => {
  const core = createCore();
  const matchBinding = bind(core);
  const matchReader = core.createMatchReadReader(
    matchBinding,
    'player-1',
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  );
  const initialMatchMemo = matchReader.read();
  const nestedErrors: unknown[] = [];
  let trapCalls = 0;
  const proxiedFrames = new Proxy(trustedNeutralFrames(core), {
    ownKeys(target) {
      if (trapCalls === 0) {
        trapCalls += 1;
        const attempts = [
          () => core.step([]),
          () => core.stepTrustedInputFrameBatch(Object.freeze(Object.create(null))),
          () => core.createTrustedInputFrameBatch(trustedNeutralFrames(core)),
          () => core.createMatchReadBinding(descriptor(core)),
          () => core.createMatchReadReader(
            matchBinding,
            'player-2',
            ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
          ),
          () => matchReader.read(),
          () => core.getInternalCheckpointIdentity(),
          () => core.getStateHash(),
          () => core.getReplayMetadata(),
          () => core.getCharacterDefinition('player-1'),
          () => core.destroy(),
        ];
        for (const attempt of attempts) {
          try {
            attempt();
          } catch (error) {
            nestedErrors.push(error);
          }
        }
      }
      return Reflect.ownKeys(target);
    },
  });

  const batch = core.createTrustedInputFrameBatch(proxiedFrames);
  assert.equal(trapCalls, 1);
  assert.equal(nestedErrors.length, 11);
  assert.equal(core.tick, 0);
  assert.strictEqual(matchReader.read(), initialMatchMemo);
  assert.doesNotThrow(() => core.stepTrustedInputFrameBatch(batch));
  assert.equal(core.tick, 1);
  assert.equal(matchReader.read().tick, 1);
  core.destroy();
});

test('PA2b uncaught trusted batch validation reentry fails atomically and releases the guard', () => {
  const core = createCore();
  const initialSnapshot = core.getLegacyFullSnapshotForAudit();
  const uncaughtProxy = new Proxy(trustedNeutralFrames(core), {
    ownKeys(target) {
      core.step([]);
      return Reflect.ownKeys(target);
    },
  });
  assert.throws(
    () => core.createTrustedInputFrameBatch(uncaughtProxy),
    /caller input validation 期间不能 step/,
  );
  assert.equal(core.tick, initialSnapshot.tick);
  assert.equal(core.getLegacyFullSnapshotForAudit().eventSequence, initialSnapshot.eventSequence);

  const abruptProxy = new Proxy(trustedNeutralFrames(core), {
    ownKeys() {
      throw new Error('trusted batch ownKeys abrupt failure');
    },
  });
  assert.throws(
    () => core.createTrustedInputFrameBatch(abruptProxy),
    /trusted batch ownKeys abrupt failure/,
  );
  assert.equal(core.tick, initialSnapshot.tick);
  assert.equal(core.getLegacyFullSnapshotForAudit().eventSequence, initialSnapshot.eventSequence);

  const batch = core.createTrustedInputFrameBatch(trustedNeutralFrames(core));
  const binding = core.createMatchReadBinding(descriptor(core));
  const reader = core.createMatchReadReader(
    binding,
    'player-1',
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  );
  assert.doesNotThrow(() => core.stepTrustedInputFrameBatch(batch));
  assert.equal(core.tick, initialSnapshot.tick + 1);
  assert.equal(reader.read().tick, initialSnapshot.tick + 1);
  core.destroy();
});

test('PA2b binding and readers are opaque, owner-bound, non-replaceable capabilities', () => {
  const firstCore = createCore();
  const secondCore = createArenaV1MatchCore({
    seed: 705,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 100,
      hardLimitTicks: 120,
    },
  });
  const binding = bind(firstCore);
  const fake = {} as MatchReadBinding;
  const cloned = Object.assign({}, binding) as MatchReadBinding;
  const proxied = new Proxy(binding, {});
  assertReaderFailure(
    () => firstCore.createMatchReadReader(
      fake,
      'player-1',
      ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
    ),
    /provenance/,
  );
  assertReaderFailure(
    () => firstCore.createMatchReadReader(
      cloned,
      'player-1',
      ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
    ),
    /provenance/,
  );
  assertReaderFailure(
    () => firstCore.createMatchReadReader(
      proxied,
      'player-1',
      ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
    ),
    /provenance/,
  );
  assertReaderFailure(
    () => secondCore.createMatchReadReader(
      binding,
      'player-1',
      ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
    ),
    /不一致/,
  );
  assertReaderFailure(
    () => firstCore.createMatchReadReader(
      binding,
      'unknown',
      ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
    ),
    /未注册/,
  );
  assertReaderFailure(
    () => firstCore.createMatchReadReader(
      binding,
      'player-1',
      'future-profile' as never,
    ),
    /profile/,
  );
  const reader = firstCore.createMatchReadReader(
    binding,
    'player-1',
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  );
  assertReaderFailure(
    () => firstCore.createMatchReadReader(
      binding,
      'player-1',
      ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
    ),
    /replacement/,
  );
  assert.equal(typeof reader.read, 'function');
  firstCore.destroy();
  secondCore.destroy();
});

test('PA2b zero-argument readers memoize stable identities and replace only current state', () => {
  const core = createCore();
  const binding = bind(core);
  const reader = core.createMatchReadReader(
    binding,
    'player-1',
    ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
  );
  const first = reader.read();
  const second = reader.read();
  assert.strictEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.worldIdentity), true);
  assert.equal(first.tick, core.tick);
  assert.equal(first.eventSequence, 0);
  assert.equal(first.generation, 1);
  assert.equal(Reflect.set(first as object, 'tick', 99), false);
  assert.equal(first.tick, 0);
  assertReaderFailure(
    () => Reflect.apply(reader.read as unknown as (...args: unknown[]) => unknown, reader, [1]),
    /不接受参数/,
  );

  core.step(neutralFrames(core));
  const afterStep = reader.read();
  assert.notStrictEqual(afterStep, first);
  assert.equal(afterStep.tick, 1);
  assert.equal(afterStep.generation, first.generation);
  assert.strictEqual(afterStep, reader.read());
  core.destroy();
});

test('PA2b reader creation is initial-identity-only and cannot be entered from input Proxy', () => {
  const core = createCore();
  const invalidBindingInput = new Proxy([], {
    ownKeys(target) {
      core.createMatchReadBinding(descriptor(core));
      return Reflect.ownKeys(target);
    },
  });
  assert.throws(
    () => core.step(invalidBindingInput),
    /创建 MatchRead binding/,
  );
  assert.equal(core.tick, 0);

  const binding = core.createMatchReadBinding(descriptor(core));
  const invalidReaderInput = new Proxy([], {
    ownKeys(target) {
      core.createMatchReadReader(
        binding,
        'player-1',
        ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
      );
      return Reflect.ownKeys(target);
    },
  });
  assert.throws(
    () => core.step(invalidReaderInput),
    /创建 MatchRead reader/,
  );
  assert.equal(core.tick, 0);
  const reader = core.createMatchReadReader(
    binding,
    'player-1',
    ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
  );
  assert.equal(reader.read().tick, 0);

  core.step(neutralFrames(core));
  assert.equal(reader.read().tick, 1);
  assert.throws(
    () => core.createMatchReadBinding(descriptor(core)),
    /初始 authority identity/,
  );
  assert.throws(
    () => core.createMatchReadReader(
      binding,
      'player-2',
      ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
    ),
    /初始 authority identity/,
  );
  assert.strictEqual(reader.read(), reader.read());
  core.destroy();
});

test('PA2b memo storage is bounded to participant/profile slots', () => {
  const core = createCore();
  const binding = bind(core);
  const profiles = [
    ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
    ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  ] as const;
  const readers = core.config.participantIds.flatMap((participantId) => (
    profiles.map((profile) => core.createMatchReadReader(binding, participantId, profile))
  ));
  assert.equal(readers.length, core.config.participantIds.length * profiles.length);
  const initial = readers.map((reader) => reader.read());
  for (let index = 0; index < 20; index += 1) core.step(neutralFrames(core));
  const current = readers.map((reader) => reader.read());
  assert.equal(new Set(current.map((memo) => `${memo.tick}:${memo.eventSequence}`)).size, 1);
  for (let index = 0; index < readers.length; index += 1) {
    assert.notStrictEqual(current[index], initial[index]);
    assert.strictEqual(readers[index]?.read(), current[index]);
  }
  core.destroy();
});

test('PA2b paused/resumed stable authority identity, ended read, and destroy fail closed', () => {
  const core = createCore({ hardLimitTicks: 2, suddenDeathStartTick: 1 });
  const binding = bind(core);
  const reader = core.createMatchReadReader(
    binding,
    'player-1',
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  );
  const session = new LocalMatchSession({
    core,
    botController: {
      createInput: () => createNeutralInputFrame(core.tick, 'player-2'),
      destroy() {},
    },
    publicMatchInfo: {
      matchSeed: core.matchSeed,
      opponent: {
        id: 'test-opponent',
        displayName: '测试对手',
        portraitKey: 'portrait-test',
        appearanceKey: 'appearance-test',
      },
    },
  });
  session.start();
  session.setPaused(true);
  const paused = reader.read();
  session.stepWithLegacySnapshotForAudit(null);
  assert.strictEqual(reader.read(), paused);
  session.setPaused(false);
  assert.strictEqual(reader.read(), paused);

  for (let index = 0; index < 4 && core.phase !== 'ended'; index += 1) {
    core.step(neutralFrames(core));
  }
  const ended = reader.read();
  assert.equal(ended.phase, core.phase);
  assert.strictEqual(reader.read(), ended);
  session.destroy();
  assertReaderFailure(() => reader.read(), /失效|已销毁/);
  core.destroy();
  core.destroy();
});

test('PA2b read during Core input validation rejects without poisoning the Core', () => {
  const core = createCore();
  const binding = bind(core);
  const reader = core.createMatchReadReader(
    binding,
    'player-1',
    ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
  );
  const malicious = new Proxy([], {
    ownKeys(target) {
      reader.read();
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  assertReaderFailure(() => core.step(malicious), /step\(\) 期间不能读取 MatchRead/);
  assert.equal(reader.read().tick, core.tick);
  core.destroy();
});

test('PA2b validates owner identity integers, phase and lifecycle generation at the port boundary', () => {
  const owner = {};
  let invalid: 'generation' | 'tick' | 'eventSequence' | 'phase' | null = 'generation';
  const ownerPort = createMatchReadOwnerPort({
    owner,
    participantIds: ['participant-1'],
    mapDefinitionId: 'map-pa2b-identity',
    contentSelectionHash: null,
    configHash: '33333333',
    authorityContentHash: '44444444',
    readIdentity: (() => Object.freeze({
      generation: invalid === 'generation' ? 2 : 1,
      tick: invalid === 'tick' ? Number.MAX_SAFE_INTEGER + 1 : 0,
      eventSequence: invalid === 'eventSequence' ? Number.POSITIVE_INFINITY : 0,
      phase: invalid === 'phase' ? 'future-phase' : 'running',
    })) as unknown as MatchReadOwnerPort['readIdentity'],
  });
  const binding = createMatchReadBindingForOwner(ownerPort, {
    schemaVersion: 1,
    compositionId: 'pa2b-identity',
    participantIds: ['participant-1'],
    mapDefinitionId: 'map-pa2b-identity',
    contentSelectionHash: null,
  });
  const reader = createMatchReadReaderForOwner(
    ownerPort,
    binding,
    'participant-1',
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  );
  assert.throws(() => reader.read(), /generation/);
  invalid = 'tick';
  assert.throws(() => reader.read(), /安全整数/);
  invalid = 'eventSequence';
  assert.throws(() => reader.read(), /安全整数/);
  invalid = 'phase';
  assert.throws(() => reader.read(), /phase/);
  invalid = null;
  const recovered = reader.read();
  assert.strictEqual(reader.read(), recovered);
});
