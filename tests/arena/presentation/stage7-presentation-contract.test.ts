import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_ANIMATION_ACTION_CATEGORY,
  ARENA_ANIMATION_SEMANTIC,
  ARENA_ANIMATION_SEMANTIC_IDS,
  AnimationSemanticResolver,
  CharacterPresentationRegistry,
  createCharacterPresentationDefinition,
  resolveAnimationBinding,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  CharacterViewRegistry,
} from '@number-strategy-jump/arena-presentation-three';
import {
  PRESENTATION_ASSET_LOAD_STATE,
  CharacterViewRuntime,
  PresentationAssetLoadTask,
  SIX_SECTOR_DIRECTION_ID,
  SixSectorDirectionResolver,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_V1_GREYBOX_CONTENT,
} from '@number-strategy-jump/arena-v1-presentation-content';
import { STAGE4_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import { STAGE6_MOVEMENT_ACTION_ID } from '@number-strategy-jump/arena-v1-content';

const CAMERA_MODEL = Object.freeze({
  inputBasis: Object.freeze({
    screenRight: Object.freeze({ x: 1, z: 0 }),
    screenUp: Object.freeze({ x: 0, z: 1 }),
  }),
});

function required<T>(value: T, name: string): NonNullable<T> {
  assert.ok(value != null, `${name} 不存在。`);
  return value as NonNullable<T>;
}

function record(value: unknown, name: string): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} 必须是对象。`);
  return value as Record<string, unknown>;
}

function facingAtDegrees(degrees: number) {
  const radians = degrees * Math.PI / 180;
  return { x: Math.sin(radians), z: Math.cos(radians) };
}

function definition() {
  return required(
    ARENA_V1_GREYBOX_CONTENT.characterPresentationRegistry.list()[0],
    '默认角色表现定义',
  );
}

function participant(overrides: Readonly<Record<string, unknown>> = {}) {
  const presentation = definition();
  return {
    id: 'player-1',
    characterDefinitionId: presentation.characterDefinitionId,
    appearance: {
      presentationId: presentation.id,
      definitionHash: presentation.getContentHash(),
      modelAssetId: presentation.modelAssetId,
    },
    status: 'active',
    hitstunTicks: 0,
    invulnerableTicks: 0,
    grounded: true,
    velocity: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 1, z: 0 },
    facing: { x: 1, z: 0 },
    movement: { mode: 'standard' },
    action: {
      definitionId: null,
      phase: 'idle',
      ticksRemaining: 0,
      presentationSemantic: null,
      animationCategory: null,
    },
    equipment: null,
    ...overrides,
  };
}

interface FrameOptions {
  readonly events?: readonly unknown[];
  readonly phase?: string;
  readonly result?: unknown;
  readonly matchSeed?: number;
}

function frame(tick: number, participantValue: unknown, {
  events = [],
  phase = 'running',
  result = null,
  matchSeed = 77,
}: FrameOptions = {}) {
  return {
    source: { matchSeed, tick },
    phase,
    world: { participants: [participantValue] },
    hud: { result },
    events,
  };
}

test('Stage 7 character and asset definitions are immutable, complete and referentially valid', () => {
  const { assetRegistry, characterPresentationRegistry } = ARENA_V1_GREYBOX_CONTENT;
  assert.equal(assetRegistry.size, 2);
  assert.equal(characterPresentationRegistry.size, 2);
  const definitions = characterPresentationRegistry.list();
  assert.equal(new Set(definitions.map(({ rigProfileId }) => rigProfileId)).size, 2);
  for (const value of definitions) {
    assert.equal(value.attachmentSlots.length, 6);
    assert.deepEqual(Object.keys(value.animationMap).sort(), ARENA_ANIMATION_SEMANTIC_IDS);
    assert.equal(assetRegistry.require(value.modelAssetId).kind, 'character-model');
    assert.equal(
      characterPresentationRegistry.requireDefaultForCharacter(value.characterDefinitionId),
      value,
    );
    assert.match(value.getContentHash(), /^[0-9a-f]{8}$/);
  }
  assert.deepEqual(
    definition().animationMap.run.fallbackSemantics,
    ['walk', 'idle'],
    'fallback 优先级必须保留声明顺序',
  );
  assert.throws(() => {
    Object.assign(required(definition().attachmentSlots[0], '首个挂点'), { nodeName: 'tampered' });
  }, /read only|Cannot assign/i);

  const cyclic = structuredClone(definition().toJSON());
  Reflect.set(cyclic, 'id', 'arena.character-presentation.cyclic');
  Reflect.set(cyclic.animationMap.idle, 'fallbackSemantics', ['walk']);
  assert.throws(() => createCharacterPresentationDefinition(cyclic), /fallback 不能形成循环/);

  const incomplete = structuredClone(definition().toJSON());
  Reflect.set(incomplete, 'id', 'arena.character-presentation.incomplete');
  Reflect.deleteProperty(incomplete.animationMap, 'draw');
  assert.throws(
    () => createCharacterPresentationDefinition(incomplete),
    /完整定义全部 AnimationSemantic/,
  );

  const duplicateDefault = structuredClone(definition().toJSON());
  Reflect.set(duplicateDefault, 'id', 'arena.character-presentation.duplicate-default');
  assert.throws(() => new CharacterPresentationRegistry({
    assetRegistry,
    definitions: [definition(), duplicateDefault],
  }), /存在多个默认表现/);

  const dangling = structuredClone(definition().toJSON());
  Reflect.set(dangling, 'id', 'arena.character-presentation.dangling');
  Reflect.set(dangling, 'modelAssetId', 'missing-model');
  assert.throws(() => new CharacterPresentationRegistry({
    assetRegistry,
    definitions: [dangling],
  }), /未知 PresentationAssetDefinition missing-model/);
});

test('animation binding uses explicit ordered fallbacks and never guesses clip names', () => {
  const run = resolveAnimationBinding(definition(), ARENA_ANIMATION_SEMANTIC.RUN, {
    proceduralKeys: ['idle', 'walk'],
    clipKeys: [],
  });
  assert.equal(run.resolvedSemantic, ARENA_ANIMATION_SEMANTIC.WALK);
  assert.equal(run.sourceKey, 'walk');
  assert.equal(run.usedFallback, true);

  const idle = resolveAnimationBinding(definition(), ARENA_ANIMATION_SEMANTIC.RUN, {
    proceduralKeys: ['idle'],
    clipKeys: [],
  });
  assert.equal(idle.resolvedSemantic, ARENA_ANIMATION_SEMANTIC.IDLE);
  assert.throws(() => resolveAnimationBinding(
    definition(),
    ARENA_ANIMATION_SEMANTIC.RUN,
    { proceduralKeys: [], clipKeys: [] },
  ), /无法解析 animation run/);
  assert.throws(() => resolveAnimationBinding(
    definition(),
    ARENA_ANIMATION_SEMANTIC.RUN,
    { proceduralKeys: ['idle', 'idle'], clipKeys: [] },
  ), /不能包含重复项/);
});

test('animation semantic resolver keeps locomotion, airborne memory, overlays and results separate', () => {
  const resolver = new AnimationSemanticResolver({
    participantId: 'player-1',
    presentationDefinition: definition(),
    actionPresentations: ARENA_V1_GREYBOX_CONTENT.actions,
  });

  let actor = participant();
  assert.equal(resolver.resolve(frame(0, actor), actor).baseSemantic, 'idle');
  actor = participant({ velocity: { x: 1, y: 0, z: 0 } });
  assert.equal(resolver.resolve(frame(1, actor), actor).baseSemantic, 'walk');
  actor = participant({ velocity: { x: 5, y: 0, z: 0 } });
  assert.equal(resolver.resolve(frame(2, actor), actor).baseSemantic, 'run');

  actor = participant({ grounded: false, velocity: { x: 1, y: 8, z: 0 } });
  const airJump = resolver.resolve(frame(3, actor, {
    events: [{
      type: 'ActionStarted',
      participantId: 'player-1',
      action: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
    }],
  }), actor);
  assert.equal(airJump.baseSemantic, 'double-jump');
  actor = participant({ grounded: false, velocity: { x: 1, y: 2, z: 0 } });
  assert.equal(resolver.resolve(frame(4, actor), actor).baseSemantic, 'double-jump');
  actor = participant();
  assert.equal(resolver.resolve(frame(5, actor), actor).baseSemantic, 'land');

  actor = participant({
    action: {
      definitionId: STAGE4_ACTION_ID.BASE_PUSH,
      phase: 'windup',
      ticksRemaining: 3,
      presentationSemantic: 'push',
      animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.ATTACK,
    },
  });
  const windup = resolver.resolve(frame(6, actor), actor);
  assert.equal(windup.baseSemantic, 'idle');
  assert.equal(windup.overlaySemantic, 'attack-windup');

  actor = participant({
    action: {
      definitionId: STAGE4_ACTION_ID.SHIELD_CHARGE,
      phase: 'active',
      ticksRemaining: 2,
      presentationSemantic: 'shield-charge',
      animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.DEFEND,
    },
  });
  assert.equal(resolver.resolve(frame(7, actor), actor).overlaySemantic, 'defend');

  actor = participant({
    hitstunTicks: 3,
    velocity: { x: 8, y: 2, z: 0 },
  });
  const knockback = resolver.resolve(frame(8, actor), actor);
  assert.equal(knockback.baseSemantic, 'knockback');
  assert.equal(knockback.overlaySemantic, null);

  actor = participant();
  const drawFrame = frame(9, actor, {
    phase: 'ended',
    result: { winnerId: null, isDraw: true },
  });
  const draw = resolver.resolve(drawFrame, actor);
  assert.equal(draw.baseSemantic, 'draw');
  assert.equal(resolver.resolve(drawFrame, actor), draw, '同 tick 重放必须幂等');

  assert.equal(resolver.resolve(frame(0, actor), actor).baseSemantic, 'idle');
  resolver.destroy();
  resolver.destroy();
  assert.throws(() => resolver.resolve(frame(1, actor), actor), /已销毁/);
});

test('six-sector direction resolution is camera-relative, stable at boundaries and lifecycle-safe', () => {
  const resolver = new SixSectorDirectionResolver(definition().direction);
  const resolve = (degrees: number, options: Readonly<Record<string, unknown>> = {}) => resolver.resolve({
    facing: facingAtDegrees(degrees),
    cameraBasis: CAMERA_MODEL.inputBasis,
    ...options,
  });

  assert.equal(resolve(0).id, SIX_SECTOR_DIRECTION_ID.FRONT);
  assert.equal(resolve(31).id, SIX_SECTOR_DIRECTION_ID.FRONT);
  assert.equal(resolve(37).id, SIX_SECTOR_DIRECTION_ID.FRONT_RIGHT);
  assert.equal(resolve(25).id, SIX_SECTOR_DIRECTION_ID.FRONT_RIGHT);
  assert.equal(resolve(23).id, SIX_SECTOR_DIRECTION_ID.FRONT);
  assert.equal(resolver.resolve({
    facing: { x: 0, z: 0 },
    cameraBasis: CAMERA_MODEL.inputBasis,
  }).id, SIX_SECTOR_DIRECTION_ID.FRONT);

  const rotated = resolver.resolve({
    facing: { x: 1, z: 0 },
    cameraBasis: {
      screenRight: { x: 0, z: -1 },
      screenUp: { x: 1, z: 0 },
    },
    reset: true,
  });
  assert.equal(rotated.id, SIX_SECTOR_DIRECTION_ID.FRONT);
  assert.deepEqual(rotated.worldFacing, { x: 1, z: 0 });
  resolver.destroy();
  resolver.destroy();
  assert.throws(() => resolve(0), /已销毁/);
});

test('CharacterViewRuntime owns one resolver/view and fails closed on view errors', () => {
  const calls: Record<string, unknown>[] = [];
  let disposed = 0;
  const view = {
    root: { position: { x: 0, y: 0, z: 0 } },
    getAnimationCapabilities: () => ({
      proceduralKeys: ARENA_ANIMATION_SEMANTIC_IDS,
      clipKeys: [],
    }),
    sync: (actor: unknown, options: unknown) => { calls.push({ actor, options }); },
    update: (delta: unknown) => { calls.push({ delta }); },
    getDebugSnapshot: () => Object.freeze({ kind: 'fake' }),
    dispose: () => { disposed += 1; },
  };
  const runtime = new CharacterViewRuntime({
    participantId: 'player-1',
    presentationDefinition: definition(),
    actionPresentations: ARENA_V1_GREYBOX_CONTENT.actions,
    viewFactory: { create: () => view },
  });
  const actor = participant();
  runtime.sync(frame(0, actor), actor, { snap: true, cameraModel: CAMERA_MODEL });
  runtime.update(1 / 60);
  const firstCall = required(calls[0], '首个 View 调用');
  const firstOptions = record(firstCall.options, '首个 View 调用选项');
  const animation = record(firstOptions.animation, '首个 View 动画选项');
  const baseBinding = record(animation.baseBinding, '基础动画绑定');
  assert.equal(baseBinding.sourceKey, 'idle');
  assert.equal(firstOptions.snap, true);
  assert.equal(record(runtime.getDebugSnapshot().view, 'View 调试快照').kind, 'fake');
  runtime.dispose();
  runtime.dispose();
  assert.equal(disposed, 1);

  let constructorDisposed = 0;
  assert.throws(() => new CharacterViewRuntime({
    participantId: 'player-1',
    presentationDefinition: definition(),
    actionPresentations: ARENA_V1_GREYBOX_CONTENT.actions,
    viewFactory: {
      create: () => ({
        ...view,
        getAnimationCapabilities: () => { throw new Error('capability failed'); },
        dispose: () => { constructorDisposed += 1; },
      }),
    },
  }), /capability failed/);
  assert.equal(constructorDisposed, 1);

  let failedDisposed = 0;
  const failed = new CharacterViewRuntime({
    participantId: 'player-1',
    presentationDefinition: definition(),
    actionPresentations: ARENA_V1_GREYBOX_CONTENT.actions,
    viewFactory: {
      create: () => ({
        ...view,
        sync: () => { throw new Error('view sync failed'); },
        dispose: () => { failedDisposed += 1; },
      }),
    },
  });
  assert.throws(
    () => failed.sync(frame(0, actor), actor, { cameraModel: CAMERA_MODEL }),
    /view sync failed/,
  );
  assert.equal(failedDisposed, 1);
  assert.throws(() => failed.update(0), /已失败/);
  failed.dispose();
  assert.equal(failedDisposed, 1, '失败关闭后不能重复释放底层 view');
});

test('CharacterViewRuntime snapshots view methods, rejects accessors and retries failed cleanup', () => {
  const actor = participant();
  const calls: string[] = [];
  let disposeAttempts = 0;
  const mutableView = {
    root: { position: { x: 0, y: 0, z: 0 } },
    getAnimationCapabilities: () => ({
      proceduralKeys: ARENA_ANIMATION_SEMANTIC_IDS,
      clipKeys: [],
    }),
    sync: () => { calls.push('original-sync'); },
    update: () => {},
    getDebugSnapshot: () => ({ kind: 'mutable-fake' }),
    dispose: () => {
      disposeAttempts += 1;
      if (disposeAttempts === 1) throw new Error('transient view cleanup');
    },
  };
  const runtime = new CharacterViewRuntime({
    participantId: 'player-1',
    presentationDefinition: definition(),
    actionPresentations: ARENA_V1_GREYBOX_CONTENT.actions,
    viewFactory: { create: () => mutableView },
  });
  mutableView.sync = () => { throw new Error('replacement sync must not run'); };
  runtime.sync(frame(0, actor), actor, { cameraModel: CAMERA_MODEL });
  assert.deepEqual(calls, ['original-sync']);
  assert.throws(() => runtime.dispose(), /清理未完整完成/);
  runtime.dispose();
  runtime.dispose();
  assert.equal(disposeAttempts, 2);

  let optionReads = 0;
  assert.throws(() => new CharacterViewRuntime({
    participantId: 'player-1',
    presentationDefinition: definition(),
    actionPresentations: ARENA_V1_GREYBOX_CONTENT.actions,
    get viewFactory() {
      optionReads += 1;
      return { create: () => mutableView };
    },
  }), /viewFactory.*数据字段/);
  assert.equal(optionReads, 0);

  let methodReads = 0;
  let invalidDisposed = 0;
  const invalidView = {
    root: { position: { x: 0, y: 0, z: 0 } },
    getAnimationCapabilities: () => ({
      proceduralKeys: ARENA_ANIMATION_SEMANTIC_IDS,
      clipKeys: [],
    }),
    get sync() {
      methodReads += 1;
      return () => {};
    },
    update: () => {},
    getDebugSnapshot: () => ({}),
    dispose: () => { invalidDisposed += 1; },
  };
  assert.throws(() => new CharacterViewRuntime({
    participantId: 'player-1',
    presentationDefinition: definition(),
    actionPresentations: ARENA_V1_GREYBOX_CONTENT.actions,
    viewFactory: { create: () => invalidView },
  }), /sync 必须是数据方法/);
  assert.equal(methodReads, 0);
  assert.equal(invalidDisposed, 1);
});

test('CharacterViewRegistry detaches removed roots and closes every runtime after sync failure', () => {
  const roots: unknown[] = [];
  const root = {
    add: (value: unknown) => { roots.push(value); },
    remove: (value: unknown) => {
      const index = roots.indexOf(value);
      if (index >= 0) roots.splice(index, 1);
    },
  };
  const disposeCalls = new Map<string, number>();
  let throwOnSync = false;
  const registry = new CharacterViewRegistry(root, {
    presentationRegistry: ARENA_V1_GREYBOX_CONTENT.characterPresentationRegistry,
    actionPresentations: ARENA_V1_GREYBOX_CONTENT.actions,
    viewFactory: {
      create: ({ participantId }: Readonly<{ participantId: string }>) => ({
        root: { position: { x: 0, y: 0, z: 0 } },
        getAnimationCapabilities: () => ({
          proceduralKeys: ARENA_ANIMATION_SEMANTIC_IDS,
          clipKeys: [],
        }),
        sync: () => {
          if (throwOnSync) throw new Error('registry sync failed');
        },
        update: () => {},
        getDebugSnapshot: () => Object.freeze({ participantId }),
        dispose: () => disposeCalls.set(
          participantId,
          (disposeCalls.get(participantId) ?? 0) + 1,
        ),
      }),
    },
  });
  const playerOne = participant();
  const playerTwo = participant({ id: 'player-2' });
  registry.sync({
    ...frame(0, playerOne),
    world: { participants: [playerOne, playerTwo] },
  }, { cameraModel: CAMERA_MODEL });
  assert.equal(roots.length, 2);

  registry.sync(frame(1, playerOne), { cameraModel: CAMERA_MODEL });
  assert.equal(roots.length, 1);
  assert.equal(disposeCalls.get('player-2'), 1);

  throwOnSync = true;
  assert.throws(
    () => registry.sync(frame(2, playerOne), { cameraModel: CAMERA_MODEL }),
    /registry sync failed/,
  );
  assert.equal(roots.length, 0);
  assert.equal(disposeCalls.get('player-1'), 1);
  assert.throws(() => registry.update(0), /已失败/);
  registry.dispose();
  registry.dispose();
  assert.equal(disposeCalls.get('player-1'), 1);
});

test('CharacterViewRegistry retains failed root and runtime cleanup for an exact dispose retry', () => {
  interface TestRoot { readonly participantId: string; readonly position: Readonly<{ x: number; y: number; z: number }> }
  const roots: TestRoot[] = [];
  const removeAttempts = new Map<string, number>();
  const disposeAttempts = new Map<string, number>();
  const root = {
    add: (value: TestRoot) => { roots.push(value); },
    remove: (value: TestRoot) => {
      const attempts = (removeAttempts.get(value.participantId) ?? 0) + 1;
      removeAttempts.set(value.participantId, attempts);
      if (value.participantId === 'player-2' && attempts <= 2) {
        throw new Error('transient character detach');
      }
      const index = roots.indexOf(value);
      if (index >= 0) roots.splice(index, 1);
    },
  };
  const registry = new CharacterViewRegistry(root, {
    presentationRegistry: ARENA_V1_GREYBOX_CONTENT.characterPresentationRegistry,
    actionPresentations: ARENA_V1_GREYBOX_CONTENT.actions,
    viewFactory: {
      create: ({ participantId }: Readonly<{ participantId: string }>) => ({
        root: { participantId, position: { x: 0, y: 0, z: 0 } },
        getAnimationCapabilities: () => ({
          proceduralKeys: ARENA_ANIMATION_SEMANTIC_IDS,
          clipKeys: [],
        }),
        sync: () => {},
        update: () => {},
        getDebugSnapshot: () => Object.freeze({ participantId }),
        dispose: () => {
          const attempts = (disposeAttempts.get(participantId) ?? 0) + 1;
          disposeAttempts.set(participantId, attempts);
          if (participantId === 'player-2' && attempts <= 2) {
            throw new Error('transient character dispose');
          }
        },
      }),
    },
  });
  const playerOne = participant();
  const playerTwo = participant({ id: 'player-2' });
  registry.sync({
    ...frame(0, playerOne),
    world: { participants: [playerOne, playerTwo] },
  }, { cameraModel: CAMERA_MODEL });
  assert.throws(
    () => registry.sync(frame(1, playerOne), { cameraModel: CAMERA_MODEL }),
    /失败关闭时清理未完整完成/,
  );
  assert.throws(() => registry.update(0), /已失败/);
  assert.equal(roots.length, 1);
  registry.dispose();
  registry.dispose();
  assert.equal(roots.length, 0);
  assert.equal(removeAttempts.get('player-2'), 3);
  assert.equal(disposeAttempts.get('player-2'), 3);
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

test('PresentationAssetLoadTask deduplicates load and releases ready or late assets exactly once', async () => {
  const assetId = required(ARENA_V1_GREYBOX_CONTENT.assetRegistry.list()[0], '首个表现资产').id;
  const first = deferred<unknown>();
  let loadCalls = 0;
  let releases = 0;
  const task = new PresentationAssetLoadTask({
    assetRegistry: ARENA_V1_GREYBOX_CONTENT.assetRegistry,
    assetId,
    loader: {
      load: (asset: Readonly<{ id: string }>) => {
        loadCalls += 1;
        assert.equal(asset.id, assetId);
        return first.promise;
      },
    },
  });
  const one = task.load();
  const two = task.load();
  assert.equal(one, two);
  await Promise.resolve();
  assert.equal(loadCalls, 1);
  const value = Object.freeze({ scene: 'placeholder' });
  first.resolve({ assetId, value, release: () => { releases += 1; } });
  assert.equal(await one, value);
  assert.equal(task.state, PRESENTATION_ASSET_LOAD_STATE.READY);
  assert.equal(await task.load(), value);
  task.destroy();
  task.destroy();
  assert.equal(releases, 1);

  const late = deferred<unknown>();
  let lateReleases = 0;
  const lateTask = new PresentationAssetLoadTask({
    assetRegistry: ARENA_V1_GREYBOX_CONTENT.assetRegistry,
    assetId,
    loader: { load: () => late.promise },
  });
  const pending = lateTask.load();
  await Promise.resolve();
  lateTask.destroy();
  late.resolve({ assetId, value: {}, release: () => { lateReleases += 1; } });
  await assert.rejects(pending, /加载完成时已销毁/);
  assert.equal(lateReleases, 1);
  assert.equal(lateTask.state, PRESENTATION_ASSET_LOAD_STATE.DESTROYED);
});

test('PresentationAssetLoadTask rejects invalid leases without invoking accessors', async () => {
  const assetId = required(ARENA_V1_GREYBOX_CONTENT.assetRegistry.list()[0], '首个表现资产').id;
  let released = 0;
  const wrongIdentity = new PresentationAssetLoadTask({
    assetRegistry: ARENA_V1_GREYBOX_CONTENT.assetRegistry,
    assetId,
    loader: {
      load: () => ({
        assetId: 'wrong',
        value: {},
        release: () => { released += 1; },
      }),
    },
  });
  await assert.rejects(wrongIdentity.load(), /assetId 与请求不一致/);
  assert.equal(released, 1);
  assert.equal(wrongIdentity.state, PRESENTATION_ASSET_LOAD_STATE.FAILED);

  let getterCalled = false;
  const accessorLease = { assetId, value: {} };
  Object.defineProperty(accessorLease, 'release', {
    enumerable: true,
    get() {
      getterCalled = true;
      return () => {};
    },
  });
  const accessor = new PresentationAssetLoadTask({
    assetRegistry: ARENA_V1_GREYBOX_CONTENT.assetRegistry,
    assetId,
    loader: { load: () => accessorLease },
  });
  await assert.rejects(accessor.load(), /release 必须是可枚举数据字段/);
  assert.equal(getterCalled, false);
});

test('PresentationAssetLoadTask retains a failed cleanup lease so destroy can retry', async () => {
  const assetId = required(ARENA_V1_GREYBOX_CONTENT.assetRegistry.list()[0], '首个表现资产').id;
  let attempts = 0;
  const task = new PresentationAssetLoadTask({
    assetRegistry: ARENA_V1_GREYBOX_CONTENT.assetRegistry,
    assetId,
    loader: {
      load: () => ({
        assetId,
        value: {},
        release: () => {
          attempts += 1;
          if (attempts === 1) throw new Error('transient release failure');
        },
      }),
    },
  });
  await task.load();
  assert.throws(() => task.destroy(), /transient release failure/);
  assert.equal(task.state, PRESENTATION_ASSET_LOAD_STATE.DESTROYED);
  assert.equal(task.getDebugSnapshot().hasLease, true);
  task.destroy();
  task.destroy();
  assert.equal(attempts, 2);
  assert.equal(task.getDebugSnapshot().hasLease, false);
});
