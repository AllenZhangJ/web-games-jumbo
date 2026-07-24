import {
  HUMAN_MATCH_STUDY_CAPTURE_STATE,
  HumanMatchStudyCaptureSession,
} from '@number-strategy-jump/arena-human-match-study';
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
import {
  cloneFrozenData,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';

export const HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE = Object.freeze({
  CREATED: 'created',
  STARTING: 'starting',
  RUNNING: 'running',
  CAPTURE_READY: 'capture-ready',
  FAILED: 'failed',
  DESTROYING: 'destroying',
  DESTROYED: 'destroyed',
});

type HumanMatchStudyProductRuntimeState = typeof HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE[
  keyof typeof HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE
];
type UnknownMethod = (...args: unknown[]) => unknown;
type HostCallback = (value: unknown) => unknown;

interface RuntimeGame {
  readonly start: () => unknown;
  readonly destroy: () => void;
  readonly getDebugSnapshot: (() => unknown) | null;
}

const OPTION_KEYS = new Set([
  'definition',
  'assignment',
  'platform',
  'root',
  'trialId',
  'onProgress',
  'onFailure',
  'gameFactory',
]);

function dataOptions(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('HumanMatchStudyProductRuntime options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('HumanMatchStudyProductRuntime options 必须是普通对象。');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || !OPTION_KEYS.has(key)) {
      throw new RangeError(`HumanMatchStudyProductRuntime 不支持 option ${String(key)}。`);
    }
    const descriptor = descriptors[key]!;
    if (!Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`HumanMatchStudyProductRuntime option ${key} 不能是访问器。`);
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

function hostProperty(value: unknown, key: PropertyKey, name: string): unknown {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  try {
    return Reflect.get(value, key);
  } catch (error) {
    throw normalizeThrownError(error, `${name}.${String(key)} 读取失败`);
  }
}

function descriptorInPrototypeChain(
  value: object,
  key: PropertyKey,
  name: string,
): PropertyDescriptor | null {
  const visited = new Set<object>();
  let current: object | null = value;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) return descriptor;
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

function method(value: unknown, key: string, name: string, required = true): UnknownMethod | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    if (!required) return null;
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = descriptorInPrototypeChain(value, key, name);
  if (!descriptor) {
    if (!required) return null;
    throw new TypeError(`${name}.${key} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    throw new TypeError(`${name}.${key} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as UnknownMethod;
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  const descriptor = descriptorInPrototypeChain(value, 'then', name);
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') return;
  try { Promise.prototype.then.call(value, undefined, () => {}); } catch {
    // Never execute an arbitrary then method; native rejected promises are consumed above.
  }
  throw new TypeError(`${name} 必须同步完成。`);
}

function callSync(callback: UnknownMethod, name: string, ...args: unknown[]): unknown {
  const result = callback(...args);
  rejectThenable(result, name);
  return result;
}

function snapshotPlatform(platform: object): Readonly<Record<string, unknown>> {
  const descriptors = Object.getOwnPropertyDescriptors(platform);
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string') continue;
    const descriptor = descriptors[key]!;
    if (!descriptor.enumerable) continue;
    if (!Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Human Match Study platform.${key} 不能是访问器。`);
    }
    result[key] = typeof descriptor.value === 'function'
      ? descriptor.value.bind(platform)
      : descriptor.value;
  }
  return Object.freeze(result);
}

function createEphemeralProductPlatform(platform: object): Readonly<Record<string, unknown>> {
  const base = snapshotPlatform(platform);
  const values = new Map<string, unknown>();
  const clone = (value: unknown): unknown => (
    value === undefined ? undefined : cloneFrozenData(value, 'Study ephemeral storage value')
  );
  return Object.freeze({
    ...base,
    storageRead(key: unknown) {
      if (typeof key !== 'string' || key.length === 0) {
        return { ok: false, found: false, value: undefined };
      }
      return values.has(key)
        ? { ok: true, found: true, value: clone(values.get(key)) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key: unknown, value: unknown) {
      if (typeof key !== 'string' || key.length === 0) return false;
      values.set(key, clone(value));
      return true;
    },
    storageDelete(key: unknown) {
      if (typeof key !== 'string' || key.length === 0) return false;
      values.delete(key);
      return true;
    },
  });
}

function requiredFunction(value: unknown, name: string): UnknownMethod {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as UnknownMethod;
}

function acquireRuntimeGame(value: unknown): RuntimeGame {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    rejectThenable(value, 'gameFactory');
    throw new TypeError('gameFactory 必须返回 Product Runtime 对象。');
  }
  const destroy = method(value, 'destroy', 'Product Runtime');
  if (!destroy) throw new TypeError('Product Runtime.destroy 缺失。');
  const destroyRuntime = () => { callSync(destroy, 'Product Runtime.destroy'); };
  try {
    const start = method(value, 'start', 'Product Runtime');
    const getDebugSnapshot = method(value, 'getDebugSnapshot', 'Product Runtime', false);
    if (!start) throw new TypeError('Product Runtime.start 缺失。');
    return Object.freeze({
      start,
      destroy: destroyRuntime,
      getDebugSnapshot,
    });
  } catch (validationError) {
    return Object.freeze({
      start() { throw validationError; },
      destroy: destroyRuntime,
      getDebugSnapshot: null,
    });
  }
}

/**
 * Owns the temporary Product Presentation Session and its memory-only Study
 * Capture. It deliberately knows nothing about Workspace, forms, downloads or
 * terminal receipts.
 */
export class HumanMatchStudyProductRuntime {
  #definition: unknown;
  #assignment: unknown;
  #platform: object | null;
  #root: object | null;
  #trialId: string | null;
  #onProgress: HostCallback | null;
  #onFailure: HostCallback | null;
  #gameFactory: UnknownMethod | null;
  #documentQuerySelector: UnknownMethod | null;
  #capture: HumanMatchStudyCaptureSession | null;
  #game: RuntimeGame | null;
  #state: HumanMatchStudyProductRuntimeState;
  #startPromise: Promise<this> | null;
  #failureReported: boolean;

  constructor(optionsValue: unknown) {
    const options = dataOptions(optionsValue);
    for (const key of ['definition', 'assignment', 'platform', 'root', 'trialId', 'onProgress', 'onFailure']) {
      if (!Object.hasOwn(options, key)) {
        throw new TypeError(`HumanMatchStudyProductRuntime 缺少 option ${key}。`);
      }
    }
    const definition = options.definition;
    const assignment = options.assignment;
    const platformValue = options.platform;
    const rootValue = options.root;
    const trialId = options.trialId;
    if (!platformValue || typeof platformValue !== 'object') {
      throw new TypeError('HumanMatchStudyProductRuntime platform 无效。');
    }
    method(platformValue, 'createCanvas', 'HumanMatchStudyProductRuntime platform');
    if (!rootValue || typeof rootValue !== 'object') {
      throw new TypeError('HumanMatchStudyProductRuntime root 无效。');
    }
    const documentObject = hostProperty(rootValue, 'document', 'HumanMatchStudyProductRuntime root');
    const documentQuerySelector = method(
      documentObject,
      'querySelector',
      'HumanMatchStudyProductRuntime document',
    );
    if (typeof trialId !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(trialId)) {
      throw new TypeError('HumanMatchStudyProductRuntime trialId 无效。');
    }
    const onProgress = requiredFunction(options.onProgress, 'onProgress') as HostCallback;
    const onFailure = requiredFunction(options.onFailure, 'onFailure') as HostCallback;
    const gameFactory = requiredFunction(
      options.gameFactory ?? createArenaProductGame,
      'gameFactory',
    );
    this.#definition = definition;
    this.#assignment = assignment;
    this.#platform = platformValue;
    this.#root = rootValue;
    this.#trialId = trialId;
    this.#onProgress = onProgress;
    this.#onFailure = onFailure;
    this.#gameFactory = gameFactory;
    this.#documentQuerySelector = documentQuerySelector;
    this.#capture = new HumanMatchStudyCaptureSession({ definition, assignment });
    this.#game = null;
    this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.CREATED;
    this.#startPromise = null;
    this.#failureReported = false;
    Object.freeze(this);
  }

  get state(): HumanMatchStudyProductRuntimeState {
    return this.#state;
  }

  #assertReadable(): void {
    if (
      this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYING
      || this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED
    ) {
      throw new Error('HumanMatchStudyProductRuntime 已销毁。');
    }
  }

  #queue(operation: () => unknown): void {
    const callback = () => {
      if (
        this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYING
        || this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED
        || this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED
      ) return;
      try {
        rejectThenable(operation(), 'HumanMatchStudyProductRuntime deferred callback');
      } catch (error) {
        this.#reportFailure(error);
        return;
      }
    };
    try {
      queueMicrotask(callback);
    } catch (error) {
      this.#reportFailure(error);
    }
  }

  #reportFailure(error: unknown): void {
    if (this.#failureReported) return;
    this.#failureReported = true;
    if (
      this.#state !== HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYING
      && this.#state !== HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED
    ) {
      this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED;
    }
    try {
      if (this.#onFailure) {
        const result = this.#onFailure(error);
        try { rejectThenable(result, 'HumanMatchStudyProductRuntime onFailure'); } catch {
          // The runtime is already fail-closed; consume async host callback failures.
        }
      }
    } catch {
      // The host owns its own failure path; the runtime is already failed.
    }
  }

  #createGame(): RuntimeGame {
    const capture = this.#capture;
    const platform = this.#platform;
    const root = this.#root;
    const trialId = this.#trialId;
    const gameFactory = this.#gameFactory;
    const documentQuerySelector = this.#documentQuerySelector;
    if (!capture || !platform || !root || !trialId || !gameFactory || !documentQuerySelector) {
      throw new Error('HumanMatchStudyProductRuntime 所有权不完整。');
    }
    const ports = capture.getPresentationPorts();
    const completionSink = (value: unknown) => {
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
      this.#queue(() => this.#onProgress?.(snapshot));
      return snapshot;
    };
    const productPlatform = createEphemeralProductPlatform(platform);
    const uiRoot = documentQuerySelector('#arena-product-ui');
    if (!uiRoot || typeof uiRoot !== 'object') {
      throw new Error('Human Match Study 缺少 #arena-product-ui。');
    }
    const rendererFactory = createArenaProductRendererFactory({
      uiSurfaceFactory: (factoryOptions: unknown) => {
        const canvas = hostProperty(factoryOptions, 'canvas', 'Study UI factory options');
        return new WebProductUiSurface({ canvas, root: uiRoot });
      },
    });
    return acquireRuntimeGame(gameFactory(productPlatform, {
      rendererFactory,
      seedSource: ports.seedSource,
      matchCompletionSink: completionSink,
      ownerId: createWebResearchPageOwnerId(root, 'human-study-product'),
      keyPrefix: `arena.human-study.ephemeral.${trialId}`,
      qualityDefinition: resolveArenaPresentationQualityForLaunch({
        root,
        platformId: productPlatform.id,
      }),
      performanceMemoryProvider: createArenaPresentationMemoryProviderForLaunch({
        root,
        platformId: productPlatform.id,
      }),
    }));
  }

  start(): Promise<this> {
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
      let candidate: RuntimeGame | null = null;
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
        try { candidate?.destroy(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
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
          throw new AggregateError(
            [error, ...cleanupErrors],
            'HumanMatchStudyProductRuntime 启动失败且清理未完整完成。',
          );
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
    if (!this.#capture) throw new Error('HumanMatchStudyProductRuntime capture 已释放。');
    return this.#capture.getParticipantSnapshot();
  }

  exportMatches(): readonly unknown[] {
    this.#assertReadable();
    if (!this.#capture) throw new Error('HumanMatchStudyProductRuntime capture 已释放。');
    const matches = this.#capture.exportOperatorCapture().matches;
    if (!Array.isArray(matches)) throw new TypeError('Human Match Study capture matches 无效。');
    return matches;
  }

  assertHealthy(): true {
    this.#assertReadable();
    if (this.#state === HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED) {
      throw new Error('Human Match Study Product Runtime 已失败关闭。');
    }
    const debugSnapshot = this.#game?.getDebugSnapshot?.() ?? null;
    const gameState = debugSnapshot && typeof debugSnapshot === 'object'
      ? hostProperty(debugSnapshot, 'state', 'Product Runtime debug snapshot')
      : null;
    if (gameState === 'failed') {
      this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED;
      throw new Error('Product Presentation Session 已失败关闭。');
    }
    return true;
  }

  stopPresentation(): void {
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

  destroy(): void {
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
      throw new AggregateError(errors, 'HumanMatchStudyProductRuntime 清理未完整完成。');
    }
    this.#definition = null;
    this.#assignment = null;
    this.#platform = null;
    this.#root = null;
    this.#onProgress = null;
    this.#onFailure = null;
    this.#gameFactory = null;
    this.#documentQuerySelector = null;
    this.#state = HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED;
  }
}
