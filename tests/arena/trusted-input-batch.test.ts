import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeterministicDataHash,
  createNeutralInputFrame,
  normalizeInputFrame,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import {
  HeadlessMatchRunner,
  type MatchCore,
  type MatchCoreOptions,
} from '@number-strategy-jump/arena-match';
import {
  createArenaV1MatchCore,
  createArenaV2SurvivalSupplyBotSession,
  createArenaV2SurvivalSupplyMatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import { BOT_PROFILE_REGISTRY } from '@number-strategy-jump/arena-bot';
import { createLightweightPhysicsWorld } from '@number-strategy-jump/arena-physics';
import { LocalMatchSession } from '@number-strategy-jump/arena-session';
import {
  ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_ARENA,
  ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_SUPPLY,
} from '../../scripts/arena-formal-survival-bot-pressure.js';

function createFastCore(seed = 701): MatchCore {
  return createArenaV1MatchCore({
    seed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 8,
      hardLimitTicks: 12,
    },
  });
}

function normalizedFrames(core: MatchCore): readonly ArenaInputFrame[] {
  return Object.freeze(core.config.participantIds.map((participantId) => (
    normalizeInputFrame(createNeutralInputFrame(core.tick, participantId), {
      expectedTick: core.tick,
      participantIds: core.config.participantIds,
    })
  )));
}

function publicInfo(seed: number) {
  return {
    matchSeed: seed,
    opponent: {
      id: 'b1-bot',
      displayName: 'B1 Bot',
      portraitKey: 'test-portrait',
      appearanceKey: 'test-appearance',
    },
  } as const;
}

function hashSnapshots(
  snapshot: ArenaMatchSnapshot,
  hashes: string[],
): void {
  hashes.push(createDeterministicDataHash(snapshot, 'B1 public snapshot'));
}

test('B1 trusted InputFrame batch is opaque, exact-order and single-consumer', () => {
  const core = createFastCore();
  const runner = new HeadlessMatchRunner(core);
  const frames = normalizedFrames(core);
  const batch = core.createTrustedInputFrameBatch(frames);

  const events = runner.stepTrustedInputFrameBatch(batch);
  assert.equal(core.tick, 1);
  assert.equal(runner.inputFrames.length, 2);
  assert.deepEqual(runner.inputFrames, frames);
  assert.ok(Array.isArray(events));
  assert.throws(
    () => runner.stepTrustedInputFrameBatch(batch),
    /已被消费/,
  );

  const staleBatch = core.createTrustedInputFrameBatch(normalizedFrames(core));
  core.step([]);
  assert.throws(
    () => runner.stepTrustedInputFrameBatch(staleBatch),
    /已过期/,
  );
  assert.equal(runner.inputFrames.length, 2);

  const secondCore = createFastCore(702);
  const secondRunner = new HeadlessMatchRunner(secondCore);
  const crossCoreBatch = core.createTrustedInputFrameBatch(normalizedFrames(core));
  assert.throws(
    () => secondRunner.stepTrustedInputFrameBatch(crossCoreBatch),
    /不一致/,
  );
  assert.equal(secondCore.tick, 0);

  const wrongOrder = Object.freeze([frames[1], frames[0]]);
  assert.throws(
    () => secondCore.createTrustedInputFrameBatch(wrongOrder),
    /顺序或身份不一致/,
  );
  assert.throws(
    () => secondCore.createTrustedInputFrameBatch(Object.freeze([frames[0]])),
    /length 不一致/,
  );
  assert.throws(
    () => secondCore.createTrustedInputFrameBatch(Object.freeze({} as never)),
    /必须是冻结数组/,
  );

  runner.destroy();
  secondRunner.destroy();
  core.destroy();
  secondCore.destroy();
});

test('B1 trusted batch rejects accessors and Proxy provenance without executing get traps', () => {
  const core = createFastCore(703);
  const frames = normalizedFrames(core);
  let proxyGetCalls = 0;
  const proxiedFrame = new Proxy(frames[0] as ArenaInputFrame, {
    get() {
      proxyGetCalls += 1;
      throw new Error('trusted batch must not read Proxy getters');
    },
  });
  assert.throws(
    () => core.createTrustedInputFrameBatch(Object.freeze([proxiedFrame, frames[1]])),
    /strict normalizer/,
  );
  assert.equal(proxyGetCalls, 0);

  let accessorCalls = 0;
  const accessorFrames = [frames[0], frames[1]] as Array<ArenaInputFrame>;
  Object.defineProperty(accessorFrames, '0', {
    enumerable: true,
    configurable: true,
    get() {
      accessorCalls += 1;
      throw new Error('trusted batch must not execute array accessor');
    },
  });
  Object.freeze(accessorFrames);
  assert.throws(
    () => core.createTrustedInputFrameBatch(accessorFrames),
    /冻结数据字段/,
  );
  assert.equal(accessorCalls, 0);

  core.destroy();
});

test('B1 Core failure consumes the batch but HeadlessMatchRunner records no Replay input', () => {
  const physicsFactory: NonNullable<MatchCoreOptions['physicsFactory']> = ({ arena }) => {
    const world = createLightweightPhysicsWorld({ arena });
    return new Proxy(world, {
      get(target, property) {
        if (property === 'step') return () => { throw new Error('B1 injected physics failure'); };
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
  const core = createArenaV1MatchCore({
    seed: 704,
    physicsFactory,
    config: { preparingTicks: 0, suddenDeathStartTick: 8, hardLimitTicks: 12 },
  });
  const runner = new HeadlessMatchRunner(core);
  const batch = core.createTrustedInputFrameBatch(normalizedFrames(core));
  assert.throws(
    () => runner.stepTrustedInputFrameBatch(batch),
    /B1 injected physics failure/,
  );
  assert.equal(runner.inputFrames.length, 0);
  assert.equal(runner.events.length, 0);
  assert.throws(() => core.getLegacyFullSnapshotForAudit(), /已销毁/);
  runner.destroy();
  core.destroy();
});

function runSessionAndStrictReplay(
  createSession: () => LocalMatchSession,
  createCore: () => MatchCore,
): { readonly replay: ReturnType<HeadlessMatchRunner['exportReplay']>; readonly snapshotHashes: readonly string[] } {
  const snapshotHashes: string[] = [];
  const session = createSession();
  const replay = session.runLegacyUntilEndedForAudit((snapshot: ArenaMatchSnapshot) => {
    hashSnapshots(snapshot, snapshotHashes);
    return createNeutralInputFrame(snapshot.tick, 'player-1');
  });
  session.destroy();

  const core = createCore();
  const runner = new HeadlessMatchRunner(core);
  const strictSnapshotHashes: string[] = [];
  for (let offset = 0; offset < replay.inputFrames.length; offset += core.config.participantIds.length) {
    hashSnapshots(core.getLegacyFullSnapshotForAudit(), strictSnapshotHashes);
    runner.step(replay.inputFrames.slice(offset, offset + core.config.participantIds.length));
  }
  const strictReplay = runner.exportReplay();
  assert.deepEqual(strictSnapshotHashes, snapshotHashes);
  assert.deepEqual(strictReplay.inputFrames, replay.inputFrames);
  assert.deepEqual(strictReplay.events, replay.events);
  assert.deepEqual(strictReplay.checkpoints, replay.checkpoints);
  assert.equal(strictReplay.finalHash, replay.finalHash);
  assert.deepEqual(strictReplay.result, replay.result);
  runner.destroy();
  core.destroy();
  return { replay, snapshotHashes };
}

test('B1 LocalMatchSession keeps ordinary 1v1 Replay and public snapshot hashes identical to strict Runner', () => {
  for (const seed of [705, 706]) {
    runSessionAndStrictReplay(
      () => {
        const core = createFastCore(seed);
        return new LocalMatchSession({
          core,
          botController: {
            createInput(snapshot: ArenaMatchSnapshot) {
              return normalizeInputFrame(createNeutralInputFrame(snapshot.tick, 'player-2'), {
                expectedTick: snapshot.tick,
                participantIds: snapshot.participants.map(({ id }) => id),
              });
            },
            destroy() {},
          },
          publicMatchInfo: publicInfo(seed),
        });
      },
      () => createFastCore(seed),
    );
  }
});

test('B1 survival Composition uses the same Replay/public snapshot semantics', () => {
  for (const seed of [707, 708]) {
    runSessionAndStrictReplay(
      () => {
        const session = createArenaV2SurvivalSupplyBotSession({
          seed,
          config: {
            preparingTicks: 0,
            suddenDeathStartTick: 8,
            hardLimitTicks: 12,
            arena: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_ARENA,
          },
          supply: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_SUPPLY,
          bot: {
            participantId: 'player-2',
            difficultyId: 'easy',
            behaviorSeed: seed + 10,
            personalitySeed: seed + 20,
            profileRegistry: BOT_PROFILE_REGISTRY,
          },
          publicMatchInfo: publicInfo(seed),
        });
        return session;
      },
      () => createArenaV2SurvivalSupplyMatchCore({
        seed,
        config: {
          preparingTicks: 0,
          suddenDeathStartTick: 8,
          hardLimitTicks: 12,
          arena: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_ARENA,
        },
        supply: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_SUPPLY,
      }),
    );
  }
});
