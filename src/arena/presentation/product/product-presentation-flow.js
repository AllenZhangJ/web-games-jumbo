import {
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import { validateProductMatchResult } from '@number-strategy-jump/arena-product-contracts';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';
import { ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT } from '../content/arena-gameplay-v2-content.js';
import { ARENA_V1_PRODUCT_PRESENTATION_CONTENT } from './arena-v1-product-presentation-content.js';
import {
  ProductMatchPresentationRuntime,
} from './product-match-presentation-runtime.js';
import { ProductSessionIntentDispatcher } from './product-session-intent-dispatcher.js';
import { createProductSessionViewModel } from './product-session-view-model.js';
import {
  PRODUCT_UI_INTENT_ID,
  createProductUiIntent,
  createProductUiIntentKey,
} from './product-ui-intent.js';

export const PRODUCT_PRESENTATION_FLOW_STATE = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

function validateController(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductPresentationFlow 需要 ProductSessionController。');
  }
  for (const method of [
    'commitReward',
    'getSnapshot',
    'hide',
    'renewProfileLease',
    'show',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`ProductSessionController 缺少 ${method}()。`);
    }
  }
  return value;
}

function validateInputSource(value) {
  if (!value || typeof value.sample !== 'function') {
    throw new TypeError('ProductPresentationFlow 需要 inputSource.sample()。');
  }
  return value;
}

function validateDispatcher(value) {
  if (
    !value
    || typeof value.dispatch !== 'function'
    || typeof value.destroy !== 'function'
    || typeof value.getSnapshot !== 'function'
  ) {
    throw new TypeError('ProductPresentationFlow intentDispatcher 不符合合同。');
  }
  return value;
}

function validateMatchRuntime(value) {
  if (
    !value
    || typeof value.start !== 'function'
    || typeof value.step !== 'function'
    || typeof value.getLastMatchResult !== 'function'
    || typeof value.destroy !== 'function'
  ) {
    throw new TypeError('ProductPresentationFlow matchRuntime 不符合合同。');
  }
  return value;
}

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function productState(snapshot) {
  const state = snapshot?.state;
  if (!state || typeof state !== 'object') {
    throw new TypeError('ProductPresentationFlow Product snapshot 缺少 state。');
  }
  return state.state === PRODUCT_SESSION_STATE.SUSPENDED
    ? state.activeState
    : state.state;
}

function isSuspended(snapshot) {
  return snapshot?.state?.state === PRODUCT_SESSION_STATE.SUSPENDED;
}

function flowFailure(error, message) {
  const cause = normalizeThrownError(error, message);
  const failure = new Error(`${message}：${cause.message}`);
  failure.cause = cause;
  return failure;
}

/**
 * 无宿主的产品表现流程编排。
 *
 * Flow 拥有 IntentDispatcher 与当前 MatchPresentationRuntime；ProductController
 * 和 inputSource 均为借用端口。宿主负责帧调度、Renderer、UI 与最终 Controller 销毁。
 */
export class ProductPresentationFlow {
  #controller;
  #inputSource;
  #presentationContent;
  #dispatcher;
  #matchRuntimeFactory;
  #matchPresentationContent;
  #matchRuntime;
  #state;
  #pendingIntent;
  #pendingIntentKey;
  #synchronizing;
  #stepping;
  #cleanupIncomplete;
  #lastMatchFrame;
  #lastMatchResult;
  #lastError;

  constructor({
    controller,
    inputSource,
    presentationContent = ARENA_V1_PRODUCT_PRESENTATION_CONTENT,
    matchPresentationContent = ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
    intentDispatcherFactory = (options) => new ProductSessionIntentDispatcher(options),
    matchRuntimeFactory = (options) => new ProductMatchPresentationRuntime(options),
  }) {
    this.#controller = validateController(controller);
    this.#inputSource = validateInputSource(inputSource);
    this.#presentationContent = presentationContent;
    this.#matchPresentationContent = matchPresentationContent;
    this.#matchRuntimeFactory = requiredFunction(
      matchRuntimeFactory,
      'ProductPresentationFlow.matchRuntimeFactory',
    );
    requiredFunction(
      intentDispatcherFactory,
      'ProductPresentationFlow.intentDispatcherFactory',
    );
    let dispatcherCandidate = null;
    try {
      dispatcherCandidate = intentDispatcherFactory({ controller: this.#controller });
      this.#dispatcher = validateDispatcher(dispatcherCandidate);
    } catch (error) {
      const cleanupErrors = [];
      try { dispatcherCandidate?.destroy?.(); } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(cleanupError, '无效 IntentDispatcher 清理失败'));
      }
      throw combineCleanupFailure(
        normalizeThrownError(error, 'ProductPresentationFlow 构造失败'),
        cleanupErrors,
        'ProductPresentationFlow 构造失败且清理未完整完成。',
      );
    }
    this.#matchRuntime = null;
    this.#state = PRODUCT_PRESENTATION_FLOW_STATE.ACTIVE;
    this.#pendingIntent = null;
    this.#pendingIntentKey = null;
    this.#synchronizing = false;
    this.#stepping = false;
    this.#cleanupIncomplete = false;
    this.#lastMatchFrame = null;
    this.#lastMatchResult = null;
    this.#lastError = null;
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertUsable() {
    if (this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED) {
      throw new Error('ProductPresentationFlow 已销毁。');
    }
    if (this.#state === PRODUCT_PRESENTATION_FLOW_STATE.FAILED) {
      const error = new Error('ProductPresentationFlow 已失败关闭。');
      error.cause = this.#lastError;
      throw error;
    }
  }

  #fail(error, message) {
    this.#lastError = flowFailure(error, message);
    this.#state = PRODUCT_PRESENTATION_FLOW_STATE.FAILED;
    return this.#lastError;
  }

  #disposeMatchRuntime() {
    if (this.#matchRuntime === null) return;
    this.#matchRuntime.destroy();
    this.#matchRuntime = null;
  }

  #createAndStartMatch() {
    let candidate = null;
    try {
      candidate = this.#matchRuntimeFactory({
        controller: this.#controller,
        inputSource: this.#inputSource,
        content: this.#matchPresentationContent,
      });
      validateMatchRuntime(candidate);
      const frame = candidate.start();
      this.#matchRuntime = candidate;
      candidate = null;
      this.#lastMatchFrame = frame;
      this.#lastMatchResult = null;
    } catch (error) {
      const cleanupErrors = [];
      try { candidate?.destroy?.(); } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(cleanupError, 'Match 表现候选清理失败'));
      }
      throw combineCleanupFailure(
        normalizeThrownError(error, 'Product match 表现创建失败'),
        cleanupErrors,
        'Product match 表现创建失败且清理未完整完成。',
      );
    }
  }

  #captureResult(snapshot) {
    const runtimeValue = this.#matchRuntime?.getLastMatchResult() ?? null;
    const productValue = snapshot.match?.result ?? null;
    if (runtimeValue === null && productValue === null) {
      throw new Error('Product results 缺少可展示的权威结果。');
    }
    const runtimeResult = runtimeValue === null
      ? null
      : validateProductMatchResult(runtimeValue);
    const productResult = productValue === null
      ? null
      : validateProductMatchResult(productValue);
    if (
      runtimeResult !== null
      && productResult !== null
      && runtimeResult.authorityHash !== productResult.authorityHash
    ) {
      throw new RangeError('Product 与 Match 表现结果不一致。');
    }
    this.#lastMatchResult = runtimeResult ?? productResult;
  }

  synchronize() {
    this.#assertUsable();
    if (this.#synchronizing) throw new Error('ProductPresentationFlow.synchronize() 不可重入。');
    if (this.#stepping) throw new Error('stepMatch() 期间不能同步 ProductPresentationFlow。');
    this.#synchronizing = true;
    try {
      let snapshot = this.#controller.getSnapshot();
      const activeState = productState(snapshot);
      if (isSuspended(snapshot)) return this.getSnapshot();

      if (activeState === PRODUCT_SESSION_STATE.PREPARING) {
        if (this.#matchRuntime !== null) {
          throw new Error('Product preparing 时已存在 MatchPresentationRuntime。');
        }
        this.#createAndStartMatch();
        snapshot = this.#controller.getSnapshot();
        if (productState(snapshot) !== PRODUCT_SESSION_STATE.IN_MATCH) {
          throw new Error('Product match 表现启动后未进入 in-match。');
        }
      } else if (activeState === PRODUCT_SESSION_STATE.RESULTS) {
        this.#captureResult(snapshot);
        snapshot = this.#controller.commitReward();
        const afterRewardState = productState(snapshot);
        if (afterRewardState === PRODUCT_SESSION_STATE.REWARD) {
          this.#disposeMatchRuntime();
        } else if (afterRewardState === PRODUCT_SESSION_STATE.FATAL_ERROR) {
          this.#disposeMatchRuntime();
        } else if (
          afterRewardState !== PRODUCT_SESSION_STATE.RECOVERABLE_ERROR
        ) {
          throw new Error(`Product reward 提交后进入未知状态 ${afterRewardState}。`);
        }
      } else if (activeState === PRODUCT_SESSION_STATE.RECOVERABLE_ERROR) {
        if (
          snapshot.state.recoveryState !== PRODUCT_SESSION_STATE.RESULTS
          && this.#matchRuntime !== null
        ) this.#disposeMatchRuntime();
      } else if (
        activeState === PRODUCT_SESSION_STATE.FATAL_ERROR
        || activeState === PRODUCT_SESSION_STATE.DESTROYED
      ) {
        this.#disposeMatchRuntime();
      } else if (activeState === PRODUCT_SESSION_STATE.READY) {
        if (this.#matchRuntime !== null) {
          throw new Error('Product ready 时仍持有 MatchPresentationRuntime。');
        }
        this.#lastMatchFrame = null;
        this.#lastMatchResult = null;
      } else if (
        activeState === PRODUCT_SESSION_STATE.IN_MATCH
        && this.#matchRuntime === null
      ) {
        throw new Error('Product in-match 缺少 MatchPresentationRuntime。');
      }
      this.#lastError = null;
      return this.getSnapshot();
    } catch (error) {
      const productSnapshot = this.#controller.getSnapshot();
      const activeState = productState(productSnapshot);
      if (
        activeState === PRODUCT_SESSION_STATE.RECOVERABLE_ERROR
        || activeState === PRODUCT_SESSION_STATE.FATAL_ERROR
      ) {
        try {
          if (
            activeState === PRODUCT_SESSION_STATE.FATAL_ERROR
            || productSnapshot.state.recoveryState !== PRODUCT_SESSION_STATE.RESULTS
          ) this.#disposeMatchRuntime();
          return this.getSnapshot();
        } catch (cleanupError) {
          const combined = combineCleanupFailure(
            normalizeThrownError(error, 'ProductPresentationFlow 同步失败'),
            [normalizeThrownError(cleanupError, 'Match 表现清理失败')],
            'ProductPresentationFlow 同步失败且清理未完整完成。',
          );
          throw this.#fail(combined, 'ProductPresentationFlow 同步失败');
        }
      }
      throw this.#fail(error, 'ProductPresentationFlow 同步失败');
    } finally {
      this.#synchronizing = false;
    }
  }

  start() {
    return this.dispatch({ id: PRODUCT_UI_INTENT_ID.BOOT });
  }

  dispatch(intentValue) {
    if (this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED) {
      return Promise.reject(new Error('ProductPresentationFlow 已销毁。'));
    }
    try {
      this.#assertUsable();
    } catch (error) {
      return Promise.reject(error);
    }
    const intent = createProductUiIntent(intentValue);
    const key = createProductUiIntentKey(intent);
    if (this.#pendingIntent !== null) {
      if (this.#pendingIntentKey === key) return this.#pendingIntent;
      return Promise.reject(new Error('已有 ProductPresentationFlow intent 正在处理。'));
    }
    let operation;
    operation = this.#dispatcher.dispatch(intent)
      .then(() => {
        if (this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED) {
          return null;
        }
        return this.synchronize();
      })
      .finally(() => {
        if (this.#pendingIntent === operation) {
          this.#pendingIntent = null;
          this.#pendingIntentKey = null;
          if (this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED) {
            this.#controller = null;
            this.#inputSource = null;
          }
        }
      });
    this.#pendingIntentKey = key;
    this.#pendingIntent = operation;
    return operation;
  }

  stepMatch() {
    this.#assertUsable();
    if (this.#synchronizing) throw new Error('同步期间不能 step ProductPresentationFlow。');
    if (this.#stepping) throw new Error('ProductPresentationFlow.stepMatch() 不可重入。');
    if (this.#matchRuntime === null) {
      throw new Error('ProductPresentationFlow 缺少 MatchPresentationRuntime。');
    }
    if (isSuspended(this.#controller.getSnapshot())) {
      throw new Error('ProductPresentationFlow 挂起时不能 step。');
    }
    this.#stepping = true;
    try {
      this.#lastMatchFrame = this.#matchRuntime.step();
    } catch (error) {
      const snapshot = this.#controller.getSnapshot();
      const activeState = productState(snapshot);
      if (
        activeState !== PRODUCT_SESSION_STATE.RECOVERABLE_ERROR
        && activeState !== PRODUCT_SESSION_STATE.FATAL_ERROR
      ) throw this.#fail(error, 'ProductPresentationFlow Match step 失败');
    } finally {
      this.#stepping = false;
    }
    return this.synchronize();
  }

  heartbeat() {
    this.#assertUsable();
    if (this.#synchronizing) throw new Error('同步期间不能 heartbeat ProductPresentationFlow。');
    if (this.#stepping) throw new Error('stepMatch() 期间不能 heartbeat ProductPresentationFlow。');
    const outcome = this.#controller.renewProfileLease();
    return Object.freeze({
      renewed: outcome.renewed,
      snapshot: this.synchronize(),
    });
  }

  hide() {
    this.#assertUsable();
    this.#controller.hide();
    return this.synchronize();
  }

  show() {
    this.#assertUsable();
    this.#controller.show();
    return this.synchronize();
  }

  getSnapshot() {
    const productSnapshot = this.#controller?.getSnapshot?.() ?? null;
    const viewModel = productSnapshot === null
      ? null
      : createProductSessionViewModel(productSnapshot, {
        ...this.#presentationContent,
        lastMatchResult: this.#lastMatchResult,
      });
    return Object.freeze({
      state: this.#state,
      pendingIntent: this.#pendingIntent !== null,
      pendingIntentKey: this.#pendingIntentKey,
      synchronizing: this.#synchronizing,
      stepping: this.#stepping,
      cleanupIncomplete: this.#cleanupIncomplete,
      viewModel,
      matchFrame: this.#lastMatchFrame,
      hasMatchRuntime: this.#matchRuntime !== null,
      matchRuntimeState: this.#matchRuntime?.state ?? null,
      failed: this.#lastError !== null,
    });
  }

  destroy() {
    if (
      this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED
      && this.#dispatcher === null
      && this.#matchRuntime === null
    ) return;
    if (this.#stepping || this.#synchronizing) {
      throw new Error('step/synchronize 期间不能销毁 ProductPresentationFlow。');
    }
    const errors = [];
    try {
      try { this.#disposeMatchRuntime(); } catch (error) { errors.push(error); }
      if (this.#dispatcher !== null) {
        try {
          this.#dispatcher.destroy();
          this.#dispatcher = null;
        } catch (error) { errors.push(error); }
      }
      this.#lastMatchFrame = null;
      this.#lastMatchResult = null;
      this.#cleanupIncomplete = errors.length > 0;
      if (errors.length > 0) {
        const failure = new Error('ProductPresentationFlow 清理未完整完成。');
        failure.cleanupErrors = errors.map((error) => normalizeThrownError(
          error,
          'ProductPresentationFlow 资源清理失败',
        ));
        this.#lastError = failure;
        this.#state = PRODUCT_PRESENTATION_FLOW_STATE.FAILED;
        throw failure;
      }
      this.#lastError = null;
      this.#state = PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED;
      if (this.#pendingIntent === null) {
        this.#controller = null;
        this.#inputSource = null;
      }
    } finally {
      this.#cleanupIncomplete = errors.length > 0;
    }
  }
}
