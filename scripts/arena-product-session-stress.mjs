import { createArenaV1ProductSession } from '@number-strategy-jump/arena-v1-composition';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';

function positiveIntegerFlag(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  if (!argument) return fallback;
  const value = Number(argument.slice(prefix.length));
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createStorage() {
  const values = new Map();
  return {
    storageRead(key) {
      return values.has(key)
        ? { ok: true, found: true, value: clone(values.get(key)) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key, value) {
      values.set(key, clone(value));
      return true;
    },
    storageDelete(key) {
      values.delete(key);
      return true;
    },
  };
}

const matches = positiveIntegerFlag('matches', 200);
const storage = createStorage();
let nextSeed = 10_000;
let ownerGeneration = 0;
let controller = null;

function createController() {
  ownerGeneration += 1;
  return createArenaV1ProductSession({
    storage,
    ownerId: `product-stress-${ownerGeneration}`,
    wallNow: () => 10_000 + ownerGeneration,
    seedSource: { nextSeed: () => nextSeed += 1 },
    keyPrefix: 'stress.product-session',
    matchConfig: {
      preparingTicks: 0,
      suddenDeathStartTick: 30,
      hardLimitTicks: 60,
    },
  });
}

const authorityHashes = new Set();
const contentHashes = new Set();
let lifecycleTransitions = 0;
let rematches = 0;
let maximumTicks = 0;
let expectedExperience = 0;
let latestGrantId = null;

try {
  controller = createController();
  await controller.boot();
  controller.openCharacterSelect();
  controller.selectCharacter('wind-up-cube');
  controller.closeCharacterSelect();

  for (let matchIndex = 0; matchIndex < matches; matchIndex += 1) {
    const isRematch = controller.state === PRODUCT_SESSION_STATE.REWARD;
    if (!isRematch) controller.openCharacterSelect();
    const firstRequest = isRematch
      ? controller.requestRematch()
      : controller.requestMatch();
    const duplicateRequest = isRematch
      ? controller.requestRematch()
      : controller.requestMatch();
    if (firstRequest !== duplicateRequest) throw new Error('快速连点创建了不同匹配 Promise。');
    if (isRematch) rematches += 1;
    if (matchIndex % 3 === 0) {
      controller.hide();
      lifecycleTransitions += 1;
    }
    await firstRequest;
    if (controller.state === PRODUCT_SESSION_STATE.SUSPENDED) {
      if (controller.getSnapshot().state.activeState !== PRODUCT_SESSION_STATE.PREPARING) {
        throw new Error('后台匹配完成后恢复目标不是 preparing。');
      }
      controller.show();
      lifecycleTransitions += 1;
    }
    const preparedContent = controller.getSnapshot().match.publicMatchInfo?.content;
    if (!preparedContent || !/^[0-9a-f]{8}$/.test(preparedContent.contentHash)) {
      throw new Error(`第 ${matchIndex} 局缺少冻结内容身份。`);
    }
    if (/sourceProfileRevision|poolHash|difficulty/i.test(JSON.stringify(preparedContent))) {
      throw new Error(`第 ${matchIndex} 局公开内容泄漏产品来源或难度。`);
    }
    controller.beginMatch();

    let finalStep = null;
    for (let tickIndex = 0; tickIndex < 100; tickIndex += 1) {
      if (tickIndex === 2 && matchIndex % 2 === 0) {
        controller.hide();
        controller.hide();
        lifecycleTransitions += 1;
        controller.show();
        controller.show();
        lifecycleTransitions += 1;
      }
      finalStep = controller.stepMatch();
      if (controller.state === PRODUCT_SESSION_STATE.RESULTS) break;
    }
    if (controller.state !== PRODUCT_SESSION_STATE.RESULTS || !finalStep?.matchStep?.result) {
      throw new Error(`第 ${matchIndex} 局未在压力上限内结算。`);
    }
    const result = finalStep.matchStep.result;
    if (!/^[0-9a-f]{8}$/.test(result.authorityHash)) {
      throw new Error(`第 ${matchIndex} 局 authorityHash 无效。`);
    }
    if (result.content.contentHash !== preparedContent.contentHash) {
      throw new Error(`第 ${matchIndex} 局准备内容与结算内容串局。`);
    }
    if (result.content.participantCharacters.length !== 2) {
      throw new Error(`第 ${matchIndex} 局内容没有覆盖双方角色。`);
    }
    if (/difficulty|\bbot\b|机器人|简单|普通|困难/i.test(JSON.stringify(controller.getSnapshot()))) {
      throw new Error(`第 ${matchIndex} 局公开快照泄漏隐藏匹配信息。`);
    }
    authorityHashes.add(result.authorityHash);
    contentHashes.add(result.content.contentHash);
    maximumTicks = Math.max(maximumTicks, result.authorityResult.endedAtTick);
    const rewarded = controller.commitReward();
    if (rewarded.state.state !== PRODUCT_SESSION_STATE.REWARD || rewarded.match.hasRuntime) {
      throw new Error(`第 ${matchIndex} 局奖励提交后未释放 Match。`);
    }
    expectedExperience += rewarded.reward.grant.experienceDelta;
    latestGrantId = rewarded.reward.grant.grantId;
    if (rewarded.profile.progression.experience !== expectedExperience) {
      throw new Error(`第 ${matchIndex} 局累计经验不一致。`);
    }
    if (rewarded.profile.progression.committedGrantIds[0] !== latestGrantId) {
      throw new Error(`第 ${matchIndex} 局最新奖励幂等键未持久化。`);
    }
    const shouldRestart = (matchIndex + 1) % 25 === 0 && matchIndex + 1 < matches;
    const shouldRematch = !shouldRestart
      && matchIndex + 1 < matches
      && matchIndex % 2 === 0;
    if (!shouldRematch) {
      controller.continueReward();
      if (controller.state === PRODUCT_SESSION_STATE.UNLOCK) controller.dismissUnlocks();
    }

    if (shouldRestart) {
      controller.destroy();
      controller = createController();
      const restored = await controller.boot();
      if (restored.profile.selection.characterId !== 'wind-up-cube') {
        throw new Error('产品重启后角色选择未恢复。');
      }
      if (restored.profile.progression.experience !== expectedExperience) {
        throw new Error('产品重启后累计经验未恢复。');
      }
      if (restored.profile.progression.committedGrantIds[0] !== latestGrantId) {
        throw new Error('产品重启后最新奖励幂等键未恢复。');
      }
    }
  }

  const snapshot = controller.getSnapshot();
  if (snapshot.state.state !== PRODUCT_SESSION_STATE.READY || snapshot.match.hasRuntime) {
    throw new Error('压力结束后产品未回到无 Match 资源的 ready。');
  }
  controller.destroy();
  controller = null;
  console.log(JSON.stringify({
    ok: true,
    matches,
    authorityHashCount: authorityHashes.size,
    contentHashCount: contentHashes.size,
    lifecycleTransitions,
    rematches,
    maximumTicks,
    restarts: ownerGeneration - 1,
    experience: snapshot.profile.progression.experience,
    latestGrantId,
  }));
} finally {
  controller?.destroy();
}
