import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNeutralInputFrame,
  type LocalActionSidecarV2,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV1MatchCore,
  createArenaV2SurvivalSupplyMatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  ARENA_INPUT_ROUTER_MODE,
  ARENA_INPUT_MAPPER_ID,
  ARENA_INPUT_SOURCE_MODE,
  ArenaInputRouter,
  copyLocalActionSidecarV2,
  createContextInputMapperB,
  createInputMapper,
  GestureRecognizer,
  InputSampler,
  RawControlState,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  createMatchReadBotBundleV2,
} from '../../../packages/arena-session/src/bot-match-read-bundle.js';
import { LocalMatchSession } from '../../../packages/arena-session/src/local-match-session.js';
import type {
  BotInputController,
  LocalMatchSessionOptions,
} from '../../../packages/arena-session/src/local-match-session.js';

const VIEWPORT = Object.freeze({ width: 400, height: 800 });

function control(overrides: Record<string, unknown> = {}) {
  return {
    active: false,
    vector: { x: 0, z: 0 },
    edges: { started: false, ended: false, cancelled: false },
    ...overrides,
  };
}

function gestures(overrides: Record<string, unknown> = {}) {
  return {
    contactHeld: false,
    contactHoldStarted: false,
    tapReleased: false,
    direction: null,
    directionPressed: null,
    directionHeld: null,
    directionReleased: null,
    wasDirectionHeld: false,
    ...overrides,
  };
}

function selected(actionDefinitionId: string, lane: string) {
  return {
    kind: 'selected' as const,
    actionDefinitionId,
    lane,
    source: 'sidecar-test',
    reason: 'candidate-selected',
  };
}

function none() {
  return {
    kind: 'none' as const,
    actionDefinitionId: null,
    lane: null,
    source: null,
    reason: 'no-available-candidate',
  };
}

function ignored() {
  return {
    kind: 'ignored' as const,
    actionDefinitionId: null,
    lane: null,
    source: null,
    reason: 'participant-unavailable',
  };
}

function affordance(tick: number, primaryLane = 'locomotion') {
  return {
    tick,
    participantId: 'player-1',
    primaryActionDefinitionId: 'test-primary',
    channels: {
      primary: selected('test-primary', primaryLane),
      primaryHold: selected('test-primary-hold', 'locomotion'),
      jump: none(),
      slam: none(),
    },
  };
}

function sidecar(
  tick: number,
  eventSequence: number,
  primaryLane = 'locomotion',
): LocalActionSidecarV2 {
  return {
    schemaVersion: 2,
    tick,
    eventSequence,
    participantId: 'player-1',
    profile: 'local-context-primary',
    primaryActionDefinitionId: 'test-primary',
    channels: {
      primary: selected('test-primary', primaryLane),
      primaryHold: selected('test-primary-hold', 'locomotion'),
    },
  };
}

const REAL_ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([
    Object.freeze({
      id: 'pa4b-2-platform',
      center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
      halfExtents: Object.freeze({ x: 10, y: 0.5, z: 4 }),
    }),
  ]),
  spawns: Object.freeze([
    Object.freeze({ x: -1, y: 1, z: 0 }),
    Object.freeze({ x: 1, y: 1, z: 0 }),
  ]),
});

const REAL_SPAWN_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'pa4b-2-left',
    position: Object.freeze({ x: -3, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'center',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'pa4b-2-center',
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'pa4b-2-right',
    position: Object.freeze({ x: 3, y: 1, z: 0 }),
  }),
]);

const REAL_SURVIVAL_CONTRACT = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick,
  spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnIntervalTicks,
  spawnCount: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnCount,
  lifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.lifetimeTicks,
  spawnSpecs: REAL_SPAWN_SPECS,
  equipmentDefinitionIds: Object.freeze([
    ...new Set(REAL_SPAWN_SPECS.map(({ equipmentDefinitionId }) => equipmentDefinitionId)),
  ]),
});

function realOrdinaryCore(seed: number) {
  return createArenaV1MatchCore({
    seed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 8,
      hardLimitTicks: 12,
    },
  });
}

function realFormalCore(seed: number) {
  return createArenaV2SurvivalSupplyMatchCore({
    seed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 2_400,
      hardLimitTicks: 2_505,
      arena: REAL_ARENA,
    },
    supply: {
      supplyDefinitionId: REAL_SURVIVAL_CONTRACT.supplyDefinitionId,
      spawnSpecs: REAL_SPAWN_SPECS,
    },
  });
}

function realDescriptor(core: { readonly config: { readonly participantIds: readonly string[]; readonly mapDefinitionId: string; readonly contentSelection?: { readonly contentHash: string } | null } }, formal: boolean) {
  return {
    schemaVersion: 1,
    compositionId: formal ? 'arena-v2-survival-supply.v1' : 'arena-quick-match.v2',
    participantIds: [...core.config.participantIds],
    mapDefinitionId: core.config.mapDefinitionId,
    contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
    compositionContractHash: formal ? '1234abcd' : null,
  };
}

function realBotController(): BotInputController {
  let reader: { read(): unknown } | null = null;
  return {
    createInput(snapshot) {
      return createNeutralInputFrame(snapshot.tick, 'player-2');
    },
    attachTrustedCommandSourceReader(candidateReader, _handle) {
      reader = candidateReader as { read(): unknown };
      return true;
    },
    createInputFromTrustedCommandSource() {
      if (reader === null) throw new Error('PA4b-2 test command reader missing');
      const source = reader.read() as { commandTick: number };
      return createNeutralInputFrame(source.commandTick, 'player-2');
    },
    destroy() {},
  };
}

function realSession(core: ReturnType<typeof realOrdinaryCore>, formal: boolean) {
  const bundle = createMatchReadBotBundleV2({
    ownedNewCore: core,
    descriptor: realDescriptor(core, formal),
    localId: 'player-1',
    botId: 'player-2',
    ...(formal ? { projectionContract: REAL_SURVIVAL_CONTRACT } : {}),
  });
  const options: LocalMatchSessionOptions = {
    core,
    botController: realBotController(),
    botMatchReadBundle: bundle,
    publicMatchInfo: {
      matchSeed: 42,
      opponent: {
        id: 'pa4b-2-opponent',
        displayName: 'PA4b-2 opponent',
        portraitKey: 'portrait',
        appearanceKey: 'appearance',
      },
    },
  };
  return new LocalMatchSession(options);
}

function mapperContext(
  tick: number,
  eventSequence: number,
  gesture: Record<string, unknown>,
  extra: Record<string, unknown>,
) {
  return {
    tick,
    eventSequence,
    participantId: 'player-1',
    raw: {
      move: control(),
      primary: control(),
      jump: control(),
    },
    gestures: {
      move: gestures(),
      primary: gestures(gesture),
      jump: gestures(),
    },
    ...extra,
  };
}

test('V2 context-primary consumes only two sidecar channels and matches legacy semantics', () => {
  const mapper = createContextInputMapperB();
  const cases = [
    { gesture: { tapReleased: true }, lane: 'locomotion' },
    { gesture: { contactHeld: true }, lane: 'locomotion' },
    { gesture: { contactHoldStarted: true, contactHeld: true }, lane: 'combat' },
    {
      gesture: { direction: 'down', directionPressed: 'down' },
      lane: 'locomotion',
    },
  ];
  for (const [index, current] of cases.entries()) {
    const tick = index + 10;
    const eventSequence = index + 20;
    const legacy = mapper.map(mapperContext(
      tick,
      eventSequence,
      current.gesture,
      { actionAffordance: affordance(tick, current.lane) },
    ));
    const v2 = mapper.map(mapperContext(
      tick,
      eventSequence,
      current.gesture,
      {
        localActionSidecar: copyLocalActionSidecarV2(sidecar(tick, eventSequence, current.lane), {
          tick,
          eventSequence,
          participantId: 'player-1',
        }),
      },
    ));
    assert.deepEqual(v2, legacy, `case ${index} must preserve mapper semantics`);
  }
  const prepared = copyLocalActionSidecarV2(sidecar(0, 0), {
    tick: 0,
    eventSequence: 0,
    participantId: 'player-1',
  });
  assert.deepEqual(Object.keys(prepared.channels), ['primary', 'primaryHold']);
  assert.equal('jump' in prepared.channels, false);
  assert.equal('slam' in prepared.channels, false);
  assert.equal(Object.isFrozen(prepared), true);
  assert.equal(Object.isFrozen(prepared.channels), true);
});

test('V2 sidecar adapter enforces the official envelope without getter execution', () => {
  const valid = sidecar(3, 7);
  const copied = copyLocalActionSidecarV2(valid, {
    tick: 3,
    eventSequence: 7,
    participantId: 'player-1',
  });
  assert.notStrictEqual(copied, valid);
  assert.equal(Object.isFrozen(copied), true);
  assert.equal(Object.isFrozen(copied.channels.primary), true);
  assert.strictEqual(
    copyLocalActionSidecarV2(copied, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    copied,
    'strict copy establishes the only trusted fast-path identity',
  );

  assert.throws(
    () => copyLocalActionSidecarV2({ ...valid, profile: 'full-audit' }, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /profile.*local-context-primary/,
  );
  assert.throws(
    () => copyLocalActionSidecarV2({ ...valid, future: true }, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /不支持字段 future/,
  );
  assert.throws(
    () => copyLocalActionSidecarV2({
      ...valid,
      channels: { ...valid.channels, jump: none() },
    }, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /channels.*不支持字段 jump/,
  );
  assert.throws(
    () => copyLocalActionSidecarV2({ ...valid, eventSequence: 8 }, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /authority identity/,
  );
  assert.throws(
    () => copyLocalActionSidecarV2(valid, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-2',
    }),
    /participantId/,
  );
  assert.throws(
    () => copyLocalActionSidecarV2({ ...valid, primaryActionDefinitionId: undefined }, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /primaryActionDefinitionId.*非空字符串|primaryActionDefinitionId/,
  );
  const missingProfile = { ...valid } as Record<string, unknown>;
  delete missingProfile.profile;
  assert.throws(
    () => copyLocalActionSidecarV2(missingProfile, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /缺少字段 profile/,
  );
  const missingPrimaryHold = {
    ...valid,
    channels: { primary: valid.channels.primary },
  };
  assert.throws(
    () => copyLocalActionSidecarV2(missingPrimaryHold, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /channels.*缺少字段 primaryHold/,
  );
  assert.throws(
    () => copyLocalActionSidecarV2({ ...valid, participantId: '   ' }, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /participantId.*非空字符串/,
  );
  assert.throws(
    () => copyLocalActionSidecarV2({ ...valid, primaryActionDefinitionId: '  ' }, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /primaryActionDefinitionId.*非空字符串/,
  );
  for (const [field, message] of [
    ['lane', 'lane'],
    ['source', 'source'],
    ['reason', 'reason'],
  ] as const) {
    const malformed = {
      ...valid,
      channels: {
        ...valid.channels,
        primary: { ...valid.channels.primary, [field]: '   ' },
      },
    };
    assert.throws(
      () => copyLocalActionSidecarV2(malformed, {
        tick: 3,
        eventSequence: 7,
        participantId: 'player-1',
      }),
      new RegExp(`${message}.*非空字符串`),
    );
  }
  const nonEnumerableChannel = {
    ...valid,
    channels: { ...valid.channels },
  };
  Object.defineProperty(nonEnumerableChannel.channels, 'primaryHold', {
    enumerable: false,
    value: valid.channels.primaryHold,
  });
  assert.throws(
    () => copyLocalActionSidecarV2(nonEnumerableChannel, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /channels\.primaryHold.*可枚举数据字段|channels.*缺少字段 primaryHold/,
  );
  const nonEnumerableOutcome = {
    ...valid,
    channels: {
      ...valid.channels,
      primary: { ...valid.channels.primary },
    },
  };
  Object.defineProperty(nonEnumerableOutcome.channels.primary, 'reason', {
    enumerable: false,
    value: valid.channels.primary.reason,
  });
  assert.throws(
    () => copyLocalActionSidecarV2(nonEnumerableOutcome, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /channels\.primary\.reason.*可枚举数据字段|channels\.primary.*缺少字段 reason/,
  );
  const noSelection = {
    ...valid,
    primaryActionDefinitionId: null,
    channels: { primary: none(), primaryHold: ignored() },
  };
  assert.doesNotThrow(() => copyLocalActionSidecarV2(noSelection, {
    tick: 3,
    eventSequence: 7,
    participantId: 'player-1',
  }));
  assert.throws(
    () => copyLocalActionSidecarV2({
      ...noSelection,
      channels: {
        primary: { ...none(), lane: 'locomotion' },
        primaryHold: ignored(),
      },
    }, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /none.*identity/,
  );

  let getterReads = 0;
  const accessor = { ...valid };
  Object.defineProperty(accessor, 'profile', {
    enumerable: true,
    get() {
      getterReads += 1;
      return 'local-context-primary';
    },
  });
  assert.throws(
    () => copyLocalActionSidecarV2(accessor, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /profile.*访问器/,
  );
  assert.equal(getterReads, 0);

  let ownKeysReads = 0;
  let descriptorReads = 0;
  let valueGetterReads = 0;
  const proxy = new Proxy(valid, {
    ownKeys(target) {
      ownKeysReads += 1;
      return [...Reflect.ownKeys(target), 'future'];
    },
    getOwnPropertyDescriptor(target, key) {
      descriptorReads += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() {
      valueGetterReads += 1;
      throw new Error('proxy get must not execute');
    },
  });
  assert.throws(
    () => copyLocalActionSidecarV2(proxy, {
      tick: 3,
      eventSequence: 7,
      participantId: 'player-1',
    }),
    /不支持字段 future/,
  );
  assert.equal(ownKeysReads, 1, 'ordinary Proxy structural ownKeys is the single reflection boundary');
  assert.ok(descriptorReads > 0, 'ordinary Proxy descriptor traps are structural validation, not value reads');
  assert.equal(valueGetterReads, 0, 'sidecar validation must never execute Proxy get');
});

test('V2 sampler rejects missing or mixed sidecars before raw state and permits same-tick retry', () => {
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: createContextInputMapperB(),
    actionSourceMode: ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2,
  });
  sampler.pointerStart({ pointerId: 1, x: 320, y: 600 });
  assert.throws(
    () => sampler.sample(0, { eventSequence: 0 }),
    /必须提供 localActionSidecar/,
  );
  assert.equal(sampler.getDebugSnapshot().lastTick, -1);
  const valid = copyLocalActionSidecarV2(sidecar(0, 0), {
    tick: 0,
    eventSequence: 0,
    participantId: 'player-1',
  });
  assert.doesNotThrow(() => sampler.sample(0, {
    eventSequence: 0,
    localActionSidecar: valid,
  }));
  assert.equal(sampler.getDebugSnapshot().lastTick, 0);
  assert.throws(
    () => sampler.sample(1, {
      eventSequence: 1,
      localActionSidecar: copyLocalActionSidecarV2(sidecar(2, 1), {
        tick: 2,
        eventSequence: 1,
        participantId: 'player-1',
      }),
    }),
    /authority identity/,
  );
  assert.doesNotThrow(() => sampler.sample(1, {
    eventSequence: 1,
    localActionSidecar: copyLocalActionSidecarV2(sidecar(1, 1), {
      tick: 1,
      eventSequence: 1,
      participantId: 'player-1',
    }),
  }));
  assert.throws(
    () => sampler.sample(2, {
      eventSequence: 2,
      localActionSidecar: valid,
      actionAffordance: affordance(2),
    }),
    /不得同时携带/,
  );
  assert.throws(
    () => sampler.sample(2, {
      eventSequence: 2,
      localActionSidecar: valid,
      actionAffordance: null,
    }),
    /不得同时携带/,
  );
  sampler.destroy();

  const legacy = new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: createContextInputMapperB(),
  });
  assert.throws(
    () => legacy.sample(0, {
      localActionSidecar: valid,
    }),
    /legacy.*不得携带 localActionSidecar/,
  );
  assert.throws(
    () => legacy.sample(0, { eventSequence: 0 }),
    /legacy.*不得携带 eventSequence/,
  );
  legacy.destroy();
});

test('V2 validation transaction rejects sidecar/options/lifecycle reentry before raw commit', () => {
  const createSampler = () => new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: createContextInputMapperB(),
    actionSourceMode: ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2,
  });
  const trusted = copyLocalActionSidecarV2(sidecar(0, 0), {
    tick: 0,
    eventSequence: 0,
    participantId: 'player-1',
  });

  const uncaughtSampler = createSampler();
  let uncaughtTrapReads = 0;
  const uncaught = new Proxy(sidecar(0, 0), {
    getPrototypeOf(target) {
      uncaughtTrapReads += 1;
      uncaughtSampler.sample(0, { eventSequence: 0, localActionSidecar: trusted });
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      return [...Reflect.ownKeys(target), 'future'];
    },
  });
  assert.throws(
    () => uncaughtSampler.sample(0, { eventSequence: 0, localActionSidecar: uncaught }),
    /验证期间检测到重入/,
  );
  assert.equal(uncaughtTrapReads, 1);
  assert.equal(uncaughtSampler.getDebugSnapshot().lastTick, -1);
  assert.doesNotThrow(() => uncaughtSampler.sample(0, {
    eventSequence: 0,
    localActionSidecar: trusted,
  }));
  uncaughtSampler.destroy();

  const caughtSampler = createSampler();
  let nestedErrors = 0;
  const caught = new Proxy(sidecar(0, 0), {
    getPrototypeOf(target) {
      try {
        caughtSampler.sample(0, { eventSequence: 0, localActionSidecar: trusted });
      } catch {
        nestedErrors += 1;
      }
      try {
        caughtSampler.pointerStart({ pointerId: 91, x: 336, y: 608 });
      } catch {
        nestedErrors += 1;
      }
      return Reflect.getPrototypeOf(target);
    },
  });
  assert.throws(
    () => caughtSampler.sample(0, { eventSequence: 0, localActionSidecar: caught }),
    /验证期间检测到重入/,
  );
  assert.equal(nestedErrors, 2);
  assert.equal(caughtSampler.getDebugSnapshot().lastTick, -1);
  assert.equal(
    caughtSampler.pointerStart({ pointerId: 91, x: 336, y: 608 }),
    true,
    'validation reentry must not consume the pointer slot',
  );
  assert.doesNotThrow(() => caughtSampler.sample(0, {
    eventSequence: 0,
    localActionSidecar: trusted,
  }));
  caughtSampler.destroy();

  const optionsSampler = createSampler();
  const validOptions = { eventSequence: 0, localActionSidecar: trusted };
  let optionNestedErrors = 0;
  const optionsProxy = new Proxy(validOptions, {
    getPrototypeOf(target) {
      try {
        optionsSampler.sample(0, validOptions);
      } catch {
        optionNestedErrors += 1;
      }
      return Reflect.getPrototypeOf(target);
    },
  });
  assert.throws(
    () => optionsSampler.sample(0, optionsProxy),
    /验证期间检测到重入/,
  );
  assert.equal(optionNestedErrors, 1);
  assert.equal(optionsSampler.getDebugSnapshot().lastTick, -1);
  assert.doesNotThrow(() => optionsSampler.sample(0, validOptions));
  optionsSampler.destroy();

  const legacySampler = new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: createContextInputMapperB(),
  });
  const legacyAffordance = affordance(0);
  let legacyNestedErrors = 0;
  let legacyDescriptorReads = 0;
  let legacyValueGetterReads = 0;
  const legacyProxy = new Proxy(legacyAffordance, {
    getPrototypeOf(target) {
      try {
        legacySampler.sample(0, { actionAffordance: legacyAffordance });
      } catch {
        legacyNestedErrors += 1;
      }
      return Reflect.getPrototypeOf(target);
    },
    getOwnPropertyDescriptor(target, key) {
      legacyDescriptorReads += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() {
      legacyValueGetterReads += 1;
      throw new Error('legacy affordance value getter must not execute');
    },
  });
  assert.throws(
    () => legacySampler.sample(0, { actionAffordance: legacyProxy }),
    /验证期间检测到重入/,
  );
  assert.equal(legacyNestedErrors, 1);
  assert.ok(legacyDescriptorReads > 0);
  assert.equal(legacyValueGetterReads, 0);
  assert.equal(legacySampler.getDebugSnapshot().lastTick, -1);
  assert.doesNotThrow(() => legacySampler.sample(0, { actionAffordance: legacyAffordance }));
  assert.equal(legacySampler.getDebugSnapshot().lastTick, 0);
  assert.throws(
    () => legacySampler.sample(1, {
      actionAffordance: { ...legacyAffordance, future: true },
    }),
    /不支持字段 future/,
  );
  assert.equal(legacySampler.getDebugSnapshot().lastTick, 0);
  assert.doesNotThrow(() => legacySampler.sample(1, {
    actionAffordance: { ...legacyAffordance, tick: 1 },
  }));
  legacySampler.destroy();
});

test('V2 consumes only the current sidecar for continuous primary hold and retries identity errors', () => {
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    gesture: { holdActivationTicks: 2 },
    mapper: createContextInputMapperB(),
    actionSourceMode: ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2,
  });
  sampler.pointerStart({ pointerId: 7, x: 336, y: 608 });
  const selectedSidecar = (tick: number, eventSequence: number) => sidecar(tick, eventSequence);
  const noActionSidecar = (tick: number, eventSequence: number) => ({
    ...sidecar(tick, eventSequence),
    primaryActionDefinitionId: null,
    channels: { primary: none(), primaryHold: none() },
  });
  try {
    const first = sampler.sample(0, {
      eventSequence: 0,
      localActionSidecar: copyLocalActionSidecarV2(selectedSidecar(0, 0), {
        tick: 0,
        eventSequence: 0,
        participantId: 'player-1',
      }),
    });
    assert.equal(first.primaryHeld, false);
    const held = sampler.sample(1, {
      eventSequence: 1,
      localActionSidecar: copyLocalActionSidecarV2(selectedSidecar(1, 1), {
        tick: 1,
        eventSequence: 1,
        participantId: 'player-1',
      }),
    });
    assert.equal(held.primaryHeld, true);

    const cancelled = sampler.sample(2, {
      eventSequence: 2,
      localActionSidecar: copyLocalActionSidecarV2(noActionSidecar(2, 2), {
        tick: 2,
        eventSequence: 2,
        participantId: 'player-1',
      }),
    });
    assert.equal(cancelled.primaryHeld, false, 'next frame must not reuse the held sidecar');
    assert.equal(cancelled.primaryPressed, false);

    assert.throws(
      () => sampler.sample(3, {
        eventSequence: 3,
        localActionSidecar: copyLocalActionSidecarV2(noActionSidecar(2, 3), {
          tick: 2,
          eventSequence: 3,
          participantId: 'player-1',
        }),
      }),
      /authority identity/,
    );
    assert.equal(sampler.getDebugSnapshot().lastTick, 2);
    assert.doesNotThrow(() => sampler.sample(3, {
      eventSequence: 3,
      localActionSidecar: copyLocalActionSidecarV2(noActionSidecar(3, 3), {
        tick: 3,
        eventSequence: 3,
        participantId: 'player-1',
      }),
    }));
  } finally {
    sampler.destroy();
  }
});

test('validation reentry keeps hostile thrown values opaque and does not commit nested input', () => {
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: createContextInputMapperB(),
    actionSourceMode: ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2,
  });
  const trusted = copyLocalActionSidecarV2(sidecar(0, 0), {
    tick: 0,
    eventSequence: 0,
    participantId: 'player-1',
  });
  let coercions = 0;
  const thrownValue = {
    [Symbol.toPrimitive]() {
      coercions += 1;
      sampler.sample(0, { eventSequence: 0, localActionSidecar: trusted });
      return 'hostile validation error';
    },
  };
  const malicious = new Proxy(sidecar(0, 0), {
    getPrototypeOf() {
      try {
        sampler.sample(0, { eventSequence: 0, localActionSidecar: trusted });
      } catch {
        // The trap deliberately replaces the nested rejection with a hostile value.
      }
      throw thrownValue;
    },
  });
  try {
    assert.throws(
      () => sampler.sample(0, { eventSequence: 0, localActionSidecar: malicious }),
      /验证期间检测到重入/,
    );
    assert.equal(coercions, 0);
    assert.equal(sampler.getDebugSnapshot().lastTick, -1);
    assert.doesNotThrow(() => sampler.sample(0, {
      eventSequence: 0,
      localActionSidecar: trusted,
    }));
  } finally {
    sampler.destroy();
  }
});

test('hostile mapper throws are terminal without coercion and remain fail closed', () => {
  let coercions = 0;
  const hostileBase = {
    [Symbol.toPrimitive]() {
      coercions += 1;
      throw new Error('hostile error coercion');
    },
  };
  const hostileThrownValue = new Proxy(hostileBase, {
    get(target, key, receiver) {
      if (key === Symbol.toPrimitive) coercions += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: createInputMapper(ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY, () => {
      throw hostileThrownValue;
    }),
    actionSourceMode: ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2,
  });
  const trusted = copyLocalActionSidecarV2(sidecar(0, 0), {
    tick: 0,
    eventSequence: 0,
    participantId: 'player-1',
  });
  try {
    assert.throws(() => sampler.sample(0, {
      eventSequence: 0,
      localActionSidecar: trusted,
    }));
    assert.equal(coercions, 0);
    assert.throws(() => sampler.getDebugSnapshot(), /失败关闭/);
    assert.throws(() => sampler.sample(0, {
      eventSequence: 0,
      localActionSidecar: trusted,
    }), /失败关闭/);
    assert.equal(coercions, 0);
  } finally {
    sampler.destroy();
  }
});

test('constructor hostile errors still rollback an already-created RawControlState', () => {
  const hostileThrownValue = {
    [Symbol.toPrimitive]() {
      throw new Error('hostile constructor error coercion');
    },
  };
  const hostileGesture = new Proxy({}, {
    getPrototypeOf() {
      throw hostileThrownValue;
    },
  });
  const originalDestroy = RawControlState.prototype.destroy;
  let destroyCalls = 0;
  RawControlState.prototype.destroy = function patchedDestroy(this: RawControlState): void {
    destroyCalls += 1;
    originalDestroy.call(this);
  };
  try {
    assert.throws(() => new InputSampler({
      participantId: 'player-1',
      viewport: VIEWPORT,
      mapper: createContextInputMapperB(),
      gesture: hostileGesture,
    }));
    assert.equal(destroyCalls, 1);
  } finally {
    RawControlState.prototype.destroy = originalDestroy;
  }
});

test('destroy attempts both cleanup handles after hostile errors without coercion', () => {
  let coercions = 0;
  const hostile = new Proxy({}, {
    get(target, key, receiver) {
      if (key === Symbol.toPrimitive) coercions += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: createContextInputMapperB(),
  });
  const originalRawDestroy = RawControlState.prototype.destroy;
  const originalGestureDestroy = GestureRecognizer.prototype.destroy;
  let rawDestroyCalls = 0;
  let gestureDestroyCalls = 0;
  RawControlState.prototype.destroy = function patchedRawDestroy(this: RawControlState): void {
    rawDestroyCalls += 1;
    throw hostile;
  };
  GestureRecognizer.prototype.destroy = function patchedGestureDestroy(this: GestureRecognizer): void {
    gestureDestroyCalls += 1;
    throw hostile;
  };
  try {
    let thrown: unknown = null;
    try {
      sampler.destroy();
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown instanceof Error);
    assert.match(thrown.message, /资源销毁不完整/);
    assert.equal(rawDestroyCalls, 1);
    assert.equal(gestureDestroyCalls, 1);
    assert.equal(coercions, 0);
    assert.throws(() => sampler.getDebugSnapshot(), /已销毁/);
    sampler.destroy();
    assert.equal(rawDestroyCalls, 1);
    assert.equal(gestureDestroyCalls, 1);
  } finally {
    RawControlState.prototype.destroy = originalRawDestroy;
    GestureRecognizer.prototype.destroy = originalGestureDestroy;
  }
});

test('InputRouter forwards the V2 sidecar and identity options without rewriting them', () => {
  let received: unknown;
  const sampler = {
    pointerStart: () => true,
    pointerMove: () => true,
    pointerEnd: () => true,
    pointerCancel: () => true,
    resize: () => true,
    suspend: () => true,
    resume: () => true,
    sample: (_tick: unknown, options: unknown) => {
      received = options;
      return createNeutralInputFrame(0, 'player-1');
    },
    destroy: () => {},
  };
  const router = new ArenaInputRouter({
    sampler,
    viewport: VIEWPORT,
    hitTestRematch: () => false,
    onRematchRequested: () => {},
  });
  router.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY);
  const localActionSidecar = copyLocalActionSidecarV2(sidecar(0, 0), {
    tick: 0,
    eventSequence: 0,
    participantId: 'player-1',
  });
  const options = { eventSequence: 0, localActionSidecar };
  router.sample(0, options);
  assert.equal(received, options);
  router.destroy();
});

test('V2 sampler keeps mapper reentry and async results fail closed', () => {
  let sampler: InputSampler | null = null;
  let nestedError: unknown = null;
  const reentrantMapper = createInputMapper(ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY, () => {
    try {
      if (sampler === null) throw new Error('test sampler missing');
      sampler.sample(0, {
        eventSequence: 0,
        localActionSidecar: copyLocalActionSidecarV2(sidecar(0, 0), {
          tick: 0,
          eventSequence: 0,
          participantId: 'player-1',
        }),
      });
    } catch (error) {
      nestedError = error;
    }
    return {
      moveX: 0,
      moveZ: 0,
      primaryPressed: false,
      primaryHeld: false,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    };
  });
  sampler = new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: reentrantMapper,
    actionSourceMode: ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2,
  });
  assert.throws(() => sampler.sample(0, {
    eventSequence: 0,
    localActionSidecar: copyLocalActionSidecarV2(sidecar(0, 0), {
      tick: 0,
      eventSequence: 0,
      participantId: 'player-1',
    }),
  }), /尝试重入/);
  assert.match(String(nestedError), /不可重入/);
  assert.throws(() => sampler!.getDebugSnapshot(), /失败关闭/);
  sampler!.destroy();

  const asyncMapper = createInputMapper(
    ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY,
    async () => ({
      moveX: 0,
      moveZ: 0,
      primaryPressed: false,
      primaryHeld: false,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    }),
  );
  const asyncSampler = new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: asyncMapper,
    actionSourceMode: ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2,
  });
  assert.throws(() => asyncSampler.sample(0, {
    eventSequence: 0,
    localActionSidecar: copyLocalActionSidecarV2(sidecar(0, 0), {
      tick: 0,
      eventSequence: 0,
      participantId: 'player-1',
    }),
  }), /InputMapper|普通对象/);
  assert.throws(() => asyncSampler.getDebugSnapshot(), /失败关闭/);
  assert.throws(() => asyncSampler.sample(0, {
    eventSequence: 0,
    localActionSidecar: copyLocalActionSidecarV2(sidecar(0, 0), {
      tick: 0,
      eventSequence: 0,
      participantId: 'player-1',
    }),
  }), /失败关闭/);
  asyncSampler.destroy();
});

test('real ordinary and formal MatchRead local sidecars enter V2 sampler without legacy fallback', () => {
  const cases = [
    { formal: false, core: realOrdinaryCore(9501) },
    { formal: true, core: realFormalCore(9502) },
  ];
  for (const current of cases) {
    const session = realSession(current.core, current.formal);
    try {
      session.start();
      const frame = session.getPresentationReadFrame();
      const sidecar = copyLocalActionSidecarV2(frame.localActionSidecar, {
        tick: frame.worldSnapshot.tick,
        eventSequence: frame.worldSnapshot.eventSequence,
        participantId: 'player-1',
      });
      const sampler = new InputSampler({
        participantId: 'player-1',
        viewport: VIEWPORT,
        mapper: createContextInputMapperB(),
        actionSourceMode: ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2,
      });
      try {
        const input = sampler.sample(frame.worldSnapshot.tick, {
          eventSequence: frame.worldSnapshot.eventSequence,
          localActionSidecar: sidecar,
        });
        assert.equal(input.tick, frame.worldSnapshot.tick);
        assert.equal(input.participantId, 'player-1');
        assert.equal(frame.localActionSidecar.profile, 'local-context-primary');
        assert.equal(frame.worldSnapshot.activeSupplyProjection === null, !current.formal);
      } finally {
        sampler.destroy();
      }
    } finally {
      try { session.destroy(); } catch { /* test cleanup */ }
      current.core.destroy();
    }
  }
});
