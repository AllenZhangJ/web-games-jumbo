import { ARENA_MATCH_PHASE } from '../config.js';
import { createNeutralInputFrame, normalizeInputFrame } from '../input-frame.js';
import { combineCleanupFailure, normalizeThrownError } from '../lifecycle-error.js';
import { MatchCore } from '../match-core.js';
import { HeadlessMatchRunner } from '../replay.js';

export const LOCAL_MATCH_SESSION_STATE = Object.freeze({
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  ENDED: 'ended',
  DESTROYED: 'destroyed',
});

function validateController(controller) {
  if (
    !controller
    || typeof controller.createInput !== 'function'
    || typeof controller.destroy !== 'function'
  ) throw new TypeError('LocalMatchSession 需要 BotController 合同。');
  return controller;
}

function copyPublicInfo(info) {
  if (!info || typeof info !== 'object') throw new TypeError('publicMatchInfo 必须是对象。');
  if (!Number.isSafeInteger(info.matchSeed) || info.matchSeed < 0 || info.matchSeed > 0xffffffff) {
    throw new RangeError('publicMatchInfo.matchSeed 必须是 uint32。');
  }
  if (!info.opponent || typeof info.opponent !== 'object') {
    throw new TypeError('publicMatchInfo.opponent 不存在。');
  }
  for (const field of ['id', 'displayName', 'portraitKey', 'appearanceKey']) {
    if (typeof info.opponent[field] !== 'string' || info.opponent[field].length === 0) {
      throw new TypeError(`publicMatchInfo.opponent.${field} 必须是非空字符串。`);
    }
  }
  return {
    matchSeed: info.matchSeed,
    opponent: {
      id: info.opponent.id,
      displayName: info.opponent.displayName,
      portraitKey: info.opponent.portraitKey,
      appearanceKey: info.opponent.appearanceKey,
    },
  };
}

function destroyOwned(value, errors) {
  if (!value) return true;
  try {
    value.destroy();
    return true;
  } catch (error) {
    errors.push(error);
    return false;
  }
}

export class LocalMatchSession {
  #core;
  #runner;
  #botController;
  #playerParticipantId;
  #botParticipantId;
  #publicMatchInfo;
  #state;
  #stepping;
  #pauseRequested;

  constructor({
    core,
    botController,
    playerParticipantId = 'player-1',
    botParticipantId = 'player-2',
    publicMatchInfo,
  }) {
    if (!(core instanceof MatchCore)) throw new TypeError('LocalMatchSession 需要 MatchCore。');
    if (
      !core.config.participantIds.includes(playerParticipantId)
      || !core.config.participantIds.includes(botParticipantId)
      || playerParticipantId === botParticipantId
    ) throw new RangeError('LocalMatchSession 参与者身份无效。');
    const validatedController = validateController(botController);
    const copiedPublicMatchInfo = copyPublicInfo(publicMatchInfo);
    const runner = new HeadlessMatchRunner(core);
    this.#core = core;
    this.#runner = runner;
    this.#botController = validatedController;
    this.#playerParticipantId = playerParticipantId;
    this.#botParticipantId = botParticipantId;
    this.#publicMatchInfo = copiedPublicMatchInfo;
    this.#state = LOCAL_MATCH_SESSION_STATE.CREATED;
    this.#stepping = false;
    this.#pauseRequested = false;
  }

  get state() {
    return this.#state;
  }

  #assertUsable() {
    if (this.#state === LOCAL_MATCH_SESSION_STATE.DESTROYED) {
      throw new Error('LocalMatchSession 已销毁。');
    }
  }

  start() {
    this.#assertUsable();
    if (this.#state === LOCAL_MATCH_SESSION_STATE.CREATED) {
      this.#state = this.#pauseRequested
        ? LOCAL_MATCH_SESSION_STATE.PAUSED
        : LOCAL_MATCH_SESSION_STATE.RUNNING;
      return;
    }
    if (
      this.#state !== LOCAL_MATCH_SESSION_STATE.RUNNING
      && this.#state !== LOCAL_MATCH_SESSION_STATE.PAUSED
    ) {
      throw new Error(`LocalMatchSession 无法从 ${this.#state} start。`);
    }
  }

  setPaused(paused) {
    this.#assertUsable();
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (this.#stepping) throw new Error('step() 期间不能切换 LocalMatchSession 暂停状态。');
    if (this.#state === LOCAL_MATCH_SESSION_STATE.ENDED) return;
    this.#pauseRequested = paused;
    // App hide/show can race with asynchronous presentation startup. Keep the
    // request while CREATED, then let start() enter the correct initial state.
    if (this.#state === LOCAL_MATCH_SESSION_STATE.CREATED) return;
    this.#state = paused
      ? LOCAL_MATCH_SESSION_STATE.PAUSED
      : LOCAL_MATCH_SESSION_STATE.RUNNING;
  }

  #normalizePlayerFrame(frame) {
    const candidate = frame ?? createNeutralInputFrame(this.#core.tick, this.#playerParticipantId);
    const normalized = normalizeInputFrame(candidate, {
      expectedTick: this.#core.tick,
      participantIds: this.#core.config.participantIds,
    });
    if (normalized.participantId !== this.#playerParticipantId) {
      throw new RangeError('玩家输入不能控制隐藏对手。');
    }
    return normalized;
  }

  step(playerFrame = null) {
    this.#assertUsable();
    if (this.#state === LOCAL_MATCH_SESSION_STATE.PAUSED) {
      return { events: [], snapshot: this.#core.getSnapshot(), input: null };
    }
    if (this.#state !== LOCAL_MATCH_SESSION_STATE.RUNNING) {
      throw new Error(`LocalMatchSession 无法在 ${this.#state} 状态 step。`);
    }
    if (this.#stepping) throw new Error('LocalMatchSession.step() 不可重入。');
    this.#stepping = true;
    try {
      // Guard before reading the caller-owned frame. A Proxy/getter must not
      // re-enter step(), pause, or destroy the session during validation.
      const normalizedPlayer = this.#normalizePlayerFrame(playerFrame);
      try {
        const snapshotBeforeStep = this.#core.getSnapshot();
        const botFrame = this.#botController.createInput(snapshotBeforeStep);
        if (botFrame.participantId !== this.#botParticipantId) {
          throw new RangeError('BotController 返回了错误的参与者输入。');
        }
        const events = this.#runner.step([normalizedPlayer, botFrame]);
        const snapshot = this.#core.getSnapshot();
        if (snapshot.phase === ARENA_MATCH_PHASE.ENDED) {
          this.#state = LOCAL_MATCH_SESSION_STATE.ENDED;
        }
        return { events, snapshot, input: normalizedPlayer };
      } catch (error) {
        const failure = normalizeThrownError(error, 'LocalMatchSession step 失败');
        const cleanupErrors = this.#cleanup();
        throw combineCleanupFailure(
          failure,
          cleanupErrors,
          'LocalMatchSession step 失败且清理未完整完成。',
        );
      }
    } finally {
      this.#stepping = false;
    }
  }

  runUntilEnded(inputProvider = () => null, { maxTicks = null } = {}) {
    this.#assertUsable();
    if (typeof inputProvider !== 'function') throw new TypeError('inputProvider 必须是函数。');
    if (this.#state === LOCAL_MATCH_SESSION_STATE.CREATED) this.start();
    const limit = maxTicks ?? (
      this.#core.config.preparingTicks + this.#core.config.hardLimitTicks + 1
    );
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RangeError('maxTicks 必须是正安全整数。');
    }
    while (this.#state !== LOCAL_MATCH_SESSION_STATE.ENDED && this.#core.tick < limit) {
      if (this.#state === LOCAL_MATCH_SESSION_STATE.PAUSED) {
        throw new Error('暂停中的 LocalMatchSession 不能 runUntilEnded。');
      }
      const frame = inputProvider(this.#core.getSnapshot());
      this.step(frame ?? null);
    }
    if (this.#state !== LOCAL_MATCH_SESSION_STATE.ENDED) {
      throw new Error(`本地比赛在 ${limit} tick 内未结束。`);
    }
    return this.exportReplay();
  }

  getSnapshot() {
    this.#assertUsable();
    return this.#core.getSnapshot();
  }

  getPublicMatchInfo() {
    this.#assertUsable();
    return copyPublicInfo(this.#publicMatchInfo);
  }

  exportReplay() {
    this.#assertUsable();
    if (this.#state !== LOCAL_MATCH_SESSION_STATE.ENDED) {
      throw new Error('只能导出已结算的 LocalMatchSession。');
    }
    return this.#runner.exportReplay();
  }

  #cleanup() {
    const errors = [];
    if (destroyOwned(this.#runner, errors)) this.#runner = null;
    if (destroyOwned(this.#botController, errors)) this.#botController = null;
    if (destroyOwned(this.#core, errors)) this.#core = null;
    this.#state = LOCAL_MATCH_SESSION_STATE.DESTROYED;
    this.#pauseRequested = true;
    return errors;
  }

  destroy() {
    if (
      this.#state === LOCAL_MATCH_SESSION_STATE.DESTROYED
      && !this.#runner
      && !this.#botController
      && !this.#core
    ) return;
    if (this.#stepping) throw new Error('step() 期间不能销毁 LocalMatchSession。');
    const errors = this.#cleanup();
    if (errors.length > 0) {
      const cleanupError = new Error('LocalMatchSession 清理未完整完成。');
      cleanupError.causes = errors;
      throw cleanupError;
    }
  }
}
