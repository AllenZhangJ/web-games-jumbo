import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  createArenaV1MatchCore,
  createArenaV2SurvivalSupplyMatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import type { MatchCore } from '@number-strategy-jump/arena-match';
import {
  armBotMatchReadTransaction,
  createMatchReadBotBundleV2,
  invalidateBotMatchReadBundle,
  readFullAuditForSession,
  readPresentationFrameForSession,
} from '../../packages/arena-session/src/bot-match-read-bundle.js';

const SURVIVAL_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'pa5b-left',
    position: Object.freeze({ x: -3, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'center',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'pa5b-center',
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'pa5b-right',
    position: Object.freeze({ x: 3, y: 1, z: 0 }),
  }),
]);

const SURVIVAL_PROJECTION = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick,
  spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnIntervalTicks,
  spawnCount: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnCount,
  lifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.lifetimeTicks,
  spawnSpecs: SURVIVAL_SPECS,
  equipmentDefinitionIds: Object.freeze([
    ...new Set(SURVIVAL_SPECS.map(({ equipmentDefinitionId }) => equipmentDefinitionId)),
  ]),
});

function ordinaryCore(seed: number): MatchCore {
  return createArenaV1MatchCore({
    seed,
    config: { preparingTicks: 0, suddenDeathStartTick: 60, hardLimitTicks: 120 },
  });
}

function survivalCore(seed: number): MatchCore {
  return createArenaV2SurvivalSupplyMatchCore({
    seed,
    config: { preparingTicks: 0, suddenDeathStartTick: 1_800, hardLimitTicks: 2_500 },
    supply: {
      supplyDefinitionId: SURVIVAL_PROJECTION.supplyDefinitionId,
      spawnSpecs: SURVIVAL_SPECS,
    },
  });
}

function descriptor(core: MatchCore, formal: boolean): Record<string, unknown> {
  return {
    schemaVersion: 1,
    compositionId: formal ? 'arena-v2-survival-supply.v1' : 'arena-quick-match.v2',
    participantIds: [...core.config.participantIds],
    mapDefinitionId: core.config.mapDefinitionId,
    contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
    compositionContractHash: formal ? '1234abcd' : null,
  };
}

function createBundle(core: MatchCore, formal: boolean): object {
  return createMatchReadBotBundleV2({
    ownedNewCore: core,
    descriptor: descriptor(core, formal),
    localId: 'player-1',
    botId: 'player-2',
    ...(formal ? { projectionContract: SURVIVAL_PROJECTION } : {}),
  });
}

test('PA5b full-audit readers share the existing bundle identity and stable participant order', () => {
  const core = ordinaryCore(9501);
  try {
    const bundle = createBundle(core, false);
    const frame = readPresentationFrameForSession(bundle, core, 'player-1', 'player-2');
    const first = readFullAuditForSession(bundle, core, 'player-1', 'player-2');
    assert.strictEqual(first.worldSnapshot, frame.worldSnapshot);
    assert.deepEqual(
      first.sidecars.map(({ participantId }) => participantId),
      ['player-1', 'player-2'],
    );
    assert.equal(first.sidecars.every((sidecar) => (
      sidecar.profile === 'full-audit'
      && sidecar.tick === first.worldSnapshot.tick
      && sidecar.eventSequence === first.worldSnapshot.eventSequence
      && Object.isFrozen(sidecar)
    )), true);
    assert.equal(Object.isFrozen(first), true);
    assert.equal(Object.isFrozen(first.sidecars), true);

    core.step([]);
    const second = readFullAuditForSession(bundle, core, 'player-1', 'player-2');
    assert.equal(second.worldSnapshot.tick, 1);
    assert.notStrictEqual(second.worldSnapshot, first.worldSnapshot);

    const active = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
    assert.throws(
      () => readFullAuditForSession(bundle, core, 'player-1', 'player-2'),
      /transaction/,
    );
    invalidateBotMatchReadBundle(bundle, core, 'player-1', 'player-2');
    assert.throws(
      () => readFullAuditForSession(bundle, core, 'player-1', 'player-2'),
      /provenance|失效/,
    );
    assert.doesNotThrow(() => invalidateBotMatchReadBundle(bundle, core, 'player-1', 'player-2'));
    assert.throws(() => active.completeSuccess(), /transaction 已失效/);
  } finally {
    core.destroy();
  }
});

test('PA5b formal bundle keeps full-audit capability on the formal projection path', () => {
  const core = survivalCore(9502);
  try {
    const bundle = createBundle(core, true);
    const result = readFullAuditForSession(bundle, core, 'player-1', 'player-2');
    assert.deepEqual(
      result.sidecars.map(({ participantId }) => participantId),
      ['player-1', 'player-2'],
    );
    assert.equal(result.worldSnapshot.activeSupplyProjection === null, false);
    assert.equal(result.sidecars.every(({ channels }) => (
      Object.keys(channels).sort().join(',') === 'jump,primary,primaryHold,slam'
    )), true);
  } finally {
    core.destroy();
  }
});

test('PA5b partial full-audit reader construction is isolated and quarantines the Core', () => {
  const child = String.raw`
    import assert from 'node:assert/strict';
    const { MatchCore } = await import('@number-strategy-jump/arena-match');
    const sidecarDescriptor = Object.getOwnPropertyDescriptor(MatchCore.prototype, 'createMatchReadSidecarReader');
    if (sidecarDescriptor === undefined || typeof sidecarDescriptor.value !== 'function') throw new Error('native sidecar reader missing');
    const nativeSidecarReader = sidecarDescriptor.value;
    let fullAuditAttempts = 0;
    Object.defineProperty(MatchCore.prototype, 'createMatchReadSidecarReader', {
      configurable: true,
      value(binding, participantId, profile) {
        if (profile === 'full-audit') {
          fullAuditAttempts += 1;
          if (participantId === 'player-2') throw new Error('injected full-audit reader failure');
        }
        return Reflect.apply(nativeSidecarReader, this, [binding, participantId, profile]);
      },
    });
    const { createArenaV1MatchCore } = await import('./packages/arena-v1-composition/src/arena-v1-match-core.ts');
    const { createMatchReadBotBundleV2 } = await import('./packages/arena-session/src/bot-match-read-bundle.ts');
    const core = createArenaV1MatchCore({ seed: 9503, config: { preparingTicks: 0, suddenDeathStartTick: 60, hardLimitTicks: 120 } });
    let destroyCalls = 0;
    const nativeDestroy = core.destroy.bind(core);
    Object.defineProperty(core, 'destroy', {
      configurable: true,
      value() {
        destroyCalls += 1;
        return nativeDestroy();
      },
    });
    const descriptor = {
      schemaVersion: 1,
      compositionId: 'arena-quick-match.v2',
      participantIds: [...core.config.participantIds],
      mapDefinitionId: core.config.mapDefinitionId,
      contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
      compositionContractHash: null,
    };
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor,
      localId: 'player-1',
      botId: 'player-2',
    }), /injected full-audit reader failure/);
    assert.equal(fullAuditAttempts, 2);
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor,
      localId: 'player-1',
      botId: 'player-2',
    }), /只能创建一个/);
    core.destroy();
    assert.equal(destroyCalls, 1);
  `;
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', child], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
});
