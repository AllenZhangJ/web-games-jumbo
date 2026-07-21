import {
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  createProductPublicMatchInfo,
  validateProductMatchResult,
} from '../../product/matchmaking/product-match-result.js';
import { PRODUCT_SESSION_STATE } from '../../product/state/product-session-transition-definition.js';
import { ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT } from '../content/arena-gameplay-v2-content.js';
import { PresentationEventWindow } from '../events/presentation-event-window.js';
import { projectArenaPresentationFrame } from '../projection/arena-frame-projector.js';

export const PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE = Object.freeze({
  PREPARED: 'prepared',
  RUNNING: 'running',
  RESULT: 'result',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

function validateController(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductMatchPresentationRuntime 需要 ProductSessionController。');
  }
  for (const method of [
    'beginMatch',
    'stepMatch',
    'getActiveMatchSnapshot',
    'getSnapshot',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`ProductSessionController 缺少 ${method}()。`);
    }
  }
  return value;
}

function validateInputSource(value) {
  if (!value || typeof value.sample !== 'function') {
    throw new TypeError('ProductMatchPresentationRuntime 需要 inputSource.sample()。');
  }
  return value;
}

function validateEventWindow(value) {
  if (
    !value
    || typeof value.consume !== 'function'
    || typeof value.destroy !== 'function'
  ) {
    throw new TypeError('ProductMatchPresentationRuntime eventWindow 不符合合同。');
  }
  return value;
}

function validateProjector(value) {
  if (typeof value !== 'function') {
    throw new TypeError('ProductMatchPresentationRuntime frameProjector 必须是函数。');
  }
  return value;
}

function activeProductState(snapshot) {
  const state = snapshot?.state;
  if (!state || typeof state !== 'object') {
    throw new TypeError('ProductSession snapshot 缺少 state。');
  }
  return state.state === PRODUCT_SESSION_STATE.SUSPENDED
    ? state.activeState
    : state.state;
}

function requireLocalParticipant(snapshot, participantId) {
  if (!snapshot || !Array.isArray(snapshot.participants)) {
    throw new TypeError('Product match snapshot 缺少 participants。');
  }
  const participant = snapshot.participants.find(({ id }) => id === participantId);
  if (!participant) {
    throw new RangeError(`Product match snapshot 缺少本地参与者 ${participantId}。`);
  }
  if (!participant.actionAffordance || typeof participant.actionAffordance !== 'object') {
    throw new TypeError(`${participantId}.actionAffordance 不存在。`);
  }
  return participant;
}

function runtimeFailure(error, message) {
  const cause = normalizeThrownError(error, message);
  const failure = new Error(`${message}：${cause.message}`);
  failure.cause = cause;
  return failure;
}

/**
 * Product Match 与既有 Arena frame projector 之间的非拥有桥接。
 *
 * Controller 是唯一 Match 所有者；inputSource 由宿主输入组合持有；本类只持有
 * PresentationEventWindow，并缓存只读表现帧与已结束比赛结果。
 */
export class ProductMatchPresentationRuntime {
  #controller;
  #inputSource;
  #eventWindow;
  #frameProjector;
  #content;
  #localParticipantId;
  #opponentParticipantId;
  #state;
  #stepping;
  #cleanupIncomplete;
  #publicMatchInfo;
  #lastFrame;
  #lastResult;
  #lastError;

  constructor({
    controller,
    inputSource,
    localParticipantId = 'player-1',
    opponentParticipantId = 'player-2',
    content = ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
    eventWindowFactory = (options) => new PresentationEventWindow(options),
    frameProjector = projectArenaPresentationFrame,
  }) {
    this.#controller = validateController(controller);
    this.#inputSource = validateInputSource(inputSource);
    if (typeof localParticipantId !== 'string' || localParticipantId.length === 0) {
      throw new TypeError('localParticipantId 必须是非空字符串。');
    }
    if (typeof opponentParticipantId !== 'string' || opponentParticipantId.length === 0) {
      throw new TypeError('opponentParticipantId 必须是非空字符串。');
    }
    if (localParticipantId === opponentParticipantId) {
      throw new RangeError('本地与对手 participantId 不能相同。');
    }
    if (typeof eventWindowFactory !== 'function') {
      throw new TypeError('eventWindowFactory 必须是函数。');
    }
    this.#frameProjector = validateProjector(frameProjector);
    this.#content = content;
    this.#localParticipantId = localParticipantId;
    this.#opponentParticipantId = opponentParticipantId;
    let eventWindowCandidate = null;
    try {
      eventWindowCandidate = eventWindowFactory({ capacity: 512 });
      this.#eventWindow = validateEventWindow(eventWindowCandidate);
    } catch (error) {
      const cleanupErrors = [];
      try { eventWindowCandidate?.destroy?.(); } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(cleanupError, '无效 eventWindow 清理失败'));
      }
      throw combineCleanupFailure(
        normalizeThrownError(error, 'ProductMatchPresentationRuntime 构造失败'),
        cleanupErrors,
        'ProductMatchPresentationRuntime 构造失败且清理未完整完成。',
      );
    }
    this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.PREPARED;
    this.#stepping = false;
    this.#cleanupIncomplete = false;
    this.#publicMatchInfo = null;
    this.#lastFrame = null;
    this.#lastResult = null;
    this.#lastError = null;
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertUsable() {
    if (this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED) {
      throw new Error('ProductMatchPresentationRuntime 已销毁。');
    }
    if (this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED) {
      const error = new Error('ProductMatchPresentationRuntime 已失败关闭。');
      error.cause = this.#lastError;
      throw error;
    }
  }

  #fail(error, message) {
    this.#lastError = runtimeFailure(error, message);
    this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED;
    return this.#lastError;
  }

  #project(snapshot, events) {
    const accepted = this.#eventWindow.consume(events);
    return this.#frameProjector({
      snapshot,
      events: accepted,
      publicMatchInfo: this.#publicMatchInfo,
      localParticipantId: this.#localParticipantId,
      opponentParticipantId: this.#opponentParticipantId,
      content: this.#content,
    });
  }

  start() {
    this.#assertUsable();
    if (
      this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING
      || this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT
    ) return this.#lastFrame;
    try {
      const productSnapshot = this.#controller.beginMatch();
      if (activeProductState(productSnapshot) !== PRODUCT_SESSION_STATE.IN_MATCH) {
        throw new Error('Product match 启动后未进入 in-match。');
      }
      this.#publicMatchInfo = createProductPublicMatchInfo(
        productSnapshot.match?.publicMatchInfo,
      );
      const snapshot = this.#controller.getActiveMatchSnapshot();
      if (snapshot === null) throw new Error('Product match 启动后缺少权威快照。');
      const frame = this.#project(snapshot, []);
      this.#lastFrame = frame;
      this.#lastError = null;
      this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING;
      return frame;
    } catch (error) {
      throw this.#fail(error, 'Product match 表现启动失败');
    }
  }

  step() {
    this.#assertUsable();
    if (this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT) {
      return this.#lastFrame;
    }
    if (this.#state !== PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING) {
      throw new Error(`ProductMatchPresentationRuntime 无法在 ${this.#state} 状态 step。`);
    }
    if (this.#stepping) throw new Error('ProductMatchPresentationRuntime.step() 不可重入。');
    this.#stepping = true;
    try {
      const before = this.#controller.getActiveMatchSnapshot();
      if (before === null) throw new Error('Product match 运行中缺少权威快照。');
      const local = requireLocalParticipant(before, this.#localParticipantId);
      const input = this.#inputSource.sample(before.tick, {
        actionAffordance: local.actionAffordance,
      });
      const outcome = this.#controller.stepMatch(input);
      if (!outcome || outcome.matchStep === null) {
        throw new Error('Product match 权威 step 失败并已关闭。');
      }
      const matchStep = outcome.matchStep;
      if (!Array.isArray(matchStep.events) || !matchStep.snapshot) {
        throw new TypeError('Product match step 返回值不符合表现合同。');
      }
      const result = matchStep.result === null
        ? null
        : validateProductMatchResult(matchStep.result);
      const expectedProductState = result === null
        ? PRODUCT_SESSION_STATE.IN_MATCH
        : PRODUCT_SESSION_STATE.RESULTS;
      if (activeProductState(outcome.productSnapshot) !== expectedProductState) {
        throw new Error(`Product match step 后未进入 ${expectedProductState}。`);
      }
      const frame = this.#project(matchStep.snapshot, matchStep.events);
      this.#lastFrame = frame;
      if (result !== null) {
        this.#lastResult = result;
        this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT;
      }
      return frame;
    } catch (error) {
      throw this.#fail(error, 'Product match 表现 step 失败');
    } finally {
      this.#stepping = false;
    }
  }

  getLastPresentationFrame() {
    return this.#lastFrame;
  }

  getLastMatchResult() {
    return this.#lastResult;
  }

  getDebugSnapshot() {
    return Object.freeze({
      state: this.#state,
      stepping: this.#stepping,
      cleanupIncomplete: this.#cleanupIncomplete,
      hasPublicMatchInfo: this.#publicMatchInfo !== null,
      hasFrame: this.#lastFrame !== null,
      hasResult: this.#lastResult !== null,
      lastTick: this.#lastFrame?.source?.tick ?? null,
      failed: this.#lastError !== null,
    });
  }

  destroy() {
    if (
      this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED
      && this.#eventWindow === null
    ) return;
    if (this.#stepping) {
      throw new Error('step() 期间不能销毁 ProductMatchPresentationRuntime。');
    }
    try {
      this.#eventWindow?.destroy();
      this.#eventWindow = null;
      this.#controller = null;
      this.#inputSource = null;
      this.#publicMatchInfo = null;
      this.#lastFrame = null;
      this.#lastResult = null;
      this.#lastError = null;
      this.#cleanupIncomplete = false;
      this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED;
    } catch (error) {
      this.#cleanupIncomplete = true;
      throw this.#fail(error, 'Product match 表现资源清理失败');
    }
  }
}
