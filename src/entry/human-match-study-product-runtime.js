import {
  HUMAN_MATCH_STUDY_CAPTURE_STATE,
  HumanMatchStudyCaptureSession,
} from '../arena/study/human-match-study-capture-session.js';
import { createArenaProductGame, createArenaProductRendererFactory } from '@number-strategy-jump/arena-v1-application-launch';
import {
  createArenaPresentationMemoryProviderForLaunch,
} from '@number-strategy-jump/arena-v1-application-launch';
import {
  resolveArenaPresentationQualityForLaunch,
} from '@number-strategy-jump/arena-v1-application-launch';
import { WebProductUiSurface } from './web-product-ui-surface.js';
import {
  createWebResearchPageOwnerId,
} from './web-research-environment.js';

export const HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE = Object.freeze({
  CREATED: 'created',
  STARTING: 'starting',
  RUNNING: 'running',
  CAPTURE_READY: 'capture-ready',
  FAILED: 'failed',
  DESTROYING: 'destroying',
  DESTROYED: 'destroyed',
});

function createEphemeralProductPlatform(platform) {
  const values = new Map();
  const clone = (value) => (
    value === undefined ? undefined : JSON.parse(JSON.stringify(value))
  );
  return {
    ...platform,
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

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

/**
 * Owns the temporary Product Presentation Session and its memory-only Study
 * Capture. It deliberately knows nothing about Workspace, forms, downloads or
 * terminal receipts.
 */
export class HumanMatchStudyProductRuntime {
  #definition;
  #assignment;
  #platform;
  #root;
  #trialId;
  #onProgress;
  #onFailure;
  #gameFactory;
  #capture;
  #game;
  #state;
  #startPromise;
  #failureReported;

  constructor({
    definition,
    assignment,
    platform,
    root,
    trialId,
    onProgress,
    onFailure,
    gameFactory = createArenaProductGame,
  }) {
    if (!platform || typeof platform.createCanvas !== 'function') {
      throw new TypeError('HumanMatchStudyProductRuntime platform 无效。');
    }
    if (!root?.document?.querySelector) {
      throw new TypeError('HumanMatchStudyProductRuntime root 无效。');
    }
    if (typeof trialId !== 'string' || trialId.length === 0) {
      throw new TypeError('HumanMatchStudyProductRuntime trialId 无效。');
    }
    this.#definition = definition;
    this.#assignment = assignment;
    this.#platform = platform;
    this.#root = root;
    this.#trialId = trialId;
    this.#onProgress = requiredFunction(onProgress, 'onProgress');
    this.#onFailure = requiredFunction(onFailure, 'onFailure');
    this.#gameFactory = requiredFunction(gameFactory, 'gameFactory');
    this.#capture = new HumanMatchStudyCaptureSession({ definition, assignment });
    this.#game = null;
    this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.CREATED;
    this.#startPromise = null;
    this.#failureReported = false;
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertReadable() {
    if (
      this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYING
      || this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED
    ) {
      throw new Error('HumanMatchStudyProductRuntime 已销毁。');
    }
  }

  #queue(operation) {
    const callback = () => {
      if (
        this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYING
        || this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED
      ) return;
      try {
        operation();
      } catch (error) {
        this.#reportFailure(error);
      }
    };
    if (typeof this.#root.queueMicrotask === 'function') {
      this.#root.queueMicrotask(callback);
    } else {
      Promise.resolve().then(callback);
    }
  }

  #reportFailure(error) {
    if (this.#failureReported) return;
    this.#failureReported = true;
    if (
      this.#state !== HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYING
      && this.#state !== HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED
    ) {
      this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED;
    }
    try {
      this.#onFailure(error);
    } catch {
      // The host owns its own failure path; the runtime is already failed.
    }
  }

  #createGame() {
    const ports = this.#capture.getPresentationPorts();
    const completionSink = (value) => {
      let snapshot;
      try {
        snapshot = ports.matchCompletionSink(value);
      } catch (error) {
        this.#queue(() => { throw error; });
        throw error;
      }
      if (snapshot.state === HUMAN_MATCH_STUDY_CAPTURE_STATE.COMPLETED) {
        this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.CAPTURE_READY;
      }
      this.#queue(() => this.#onProgress(snapshot));
      return snapshot;
    };
    const productPlatform = createEphemeralProductPlatform(this.#platform);
    const rendererFactory = createArenaProductRendererFactory({
      uiSurfaceFactory: ({ canvas }) => new WebProductUiSurface({
        canvas,
        root: this.#root.document.querySelector('#arena-product-ui'),
      }),
    });
    return this.#gameFactory(productPlatform, {
      rendererFactory,
      seedSource: ports.seedSource,
      matchCompletionSink: completionSink,
      ownerId: createWebResearchPageOwnerId(this.#root, 'human-study-product'),
      keyPrefix: `arena.human-study.ephemeral.${this.#trialId}`,
      qualityDefinition: resolveArenaPresentationQualityForLaunch({
        root: this.#root,
        platformId: productPlatform.id,
      }),
      performanceMemoryProvider: createArenaPresentationMemoryProviderForLaunch({
        root: this.#root,
        platformId: productPlatform.id,
      }),
    });
  }

  start() {
    this.#assertReadable();
    if (this.#startPromise !== null) return this.#startPromise;
    if (this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.RUNNING) {
      return Promise.resolve(this);
    }
    if (this.#state !== HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.CREATED) {
      return Promise.reject(new Error(`当前 ${this.#state} Study Product Runtime 不能启动。`));
    }
    this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.STARTING;
    const operation = Promise.resolve().then(async () => {
      let candidate = null;
      try {
        candidate = this.#createGame();
        this.#game = candidate;
        candidate = null;
        await this.#game.start();
        if (
          this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYING
          || this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED
        ) {
          throw new Error('Study Product Runtime 启动已取消。');
        }
        if (this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.STARTING) {
          this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.RUNNING;
        }
        return this;
      } catch (error) {
        const cleanupErrors = [];
        try { candidate?.destroy?.(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
        if (this.#game !== null) {
          try {
            this.#game.destroy();
            this.#game = null;
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
        }
        if (
          this.#state !== HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYING
          && this.#state !== HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED
        ) {
          this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED;
        }
        if (cleanupErrors.length > 0) {
          const failure = new Error(
            'HumanMatchStudyProductRuntime 启动失败且清理未完整完成。',
            { cause: error },
          );
          failure.cleanupErrors = cleanupErrors;
          throw failure;
        }
        throw error;
      } finally {
        this.#startPromise = null;
      }
    });
    this.#startPromise = operation;
    return operation;
  }

  getParticipantSnapshot() {
    this.#assertReadable();
    return this.#capture.getParticipantSnapshot();
  }

  exportMatches() {
    this.#assertReadable();
    return this.#capture.exportOperatorCapture().matches;
  }

  assertHealthy() {
    this.#assertReadable();
    if (this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED) {
      throw new Error('Human Match Study Product Runtime 已失败关闭。');
    }
    const gameState = this.#game?.getDebugSnapshot?.().state ?? null;
    if (gameState === 'failed') {
      this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED;
      throw new Error('Product Presentation Session 已失败关闭。');
    }
    return true;
  }

  stopPresentation() {
    this.#assertReadable();
    const game = this.#game;
    if (game !== null) {
      try {
        game.destroy();
        this.#game = null;
      } catch (error) {
        this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED;
        throw error;
      }
    }
    if (
      this.#state !== HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED
      && this.#state !== HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.CAPTURE_READY
    ) this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.CAPTURE_READY;
  }

  destroy() {
    if (this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED) return;
    this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYING;
    const errors = [];
    if (this.#game !== null) {
      try {
        this.#game.destroy();
        this.#game = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (this.#capture !== null) {
      try {
        this.#capture.destroy();
        this.#capture = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      const failure = new Error('HumanMatchStudyProductRuntime 清理未完整完成。');
      failure.cleanupErrors = errors;
      throw failure;
    }
    this.#definition = null;
    this.#assignment = null;
    this.#platform = null;
    this.#root = null;
    this.#onProgress = null;
    this.#onFailure = null;
    this.#gameFactory = null;
    this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED;
  }
}
