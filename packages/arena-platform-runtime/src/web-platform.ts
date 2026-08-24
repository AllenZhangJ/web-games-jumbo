import {
  createFrameScheduler,
  createPlatformContract,
  getRequiredWebGL2Context,
  normalizeCanvasSize,
  prepareCanvas,
  sizeCanvas,
} from '@number-strategy-jump/arena-platform-contracts';
import { isThenable, optionalMethod, rejectThenable } from './host-capability.js';

// Browser and test hosts are structurally dynamic; `any` is confined to this adapter boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HostObject = Record<PropertyKey, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HostCallback = (...args: any[]) => unknown;

const INPUT_BINDING_KEYS = new Set(['onStart', 'onMove', 'onEnd', 'onCancel']);
type WebListenerOperation = 'bind' | 'cleanup';
type WebResizeObserverOperation = 'observe' | 'cleanup';
type WebCleanupBatchOperation = 'rollback' | 'cleanup';
type WebPointerInputOperation = 'start' | 'move' | 'end' | 'cancel' | 'cleanup';
type WebNotificationOperation = 'notify' | 'unconditional-notify' | 'cleanup';
type WebStorageOperation = 'read' | 'write' | 'delete';
type WebViewportOperation = 'read';
type WebAssetReadSegment = 'fetch-start' | 'fetch-settlement' | 'bytes-start' | 'bytes-settlement';
type WebAssetReadPhase = 'created' | 'fetch-pending' | 'response-ready' | 'bytes-pending' | 'completed' | 'failed';
type WebShareOperation = 'start' | 'settlement';
type WebWallClockOperation = 'read';
type WebClockOperation = 'read';
type WebVibrationOperation = 'vibrate';
type WebMediaFactoryOperation = 'create-image' | 'create-audio' | 'create-offscreen-canvas';
type WebMainCanvasOperation = 'create';
type WebGlContextOperation = 'create';
type WebSharePendingOwner = Readonly<{
  requestId: number;
  promise: Promise<boolean>;
  resolve: (result: boolean) => void;
}>;
type WebStorageReadResult = Readonly<{
  ok: boolean;
  found: boolean;
  value: unknown;
}>;
type WebViewportSnapshot = Readonly<{
  width: number;
  height: number;
  pixelRatio: number;
  safeArea: null;
}>;

function hostObject(value: unknown, label: string): HostObject {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${label} 必须是对象。`);
  }
  return value as HostObject;
}

function finite(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizePointer(event: HostObject, canvas: HostObject) {
  let rect: HostObject | null = null;
  try {
    rect = canvas.getBoundingClientRect?.() ?? null;
  } catch {
    rect = null;
  }
  const left = finite(rect?.left);
  const top = finite(rect?.top);
  const displayWidth = positive(rect?.width, positive(canvas.clientWidth, positive(canvas.width, 1)));
  const displayHeight = positive(rect?.height, positive(canvas.clientHeight, positive(canvas.height, 1)));
  const bufferWidth = positive(canvas.width, displayWidth);
  const bufferHeight = positive(canvas.height, displayHeight);
  const clientX = finite(safeProperty(event, 'clientX'), left);
  const clientY = finite(safeProperty(event, 'clientY'), top);
  return {
    x: ((clientX - left) / displayWidth) * bufferWidth,
    y: ((clientY - top) / displayHeight) * bufferHeight,
    pointerId: pointerIdentifier(event),
  };
}

class WebListenerOwner {
  readonly cleanup: () => void;
  readonly #type: string;
  readonly #callback: HostCallback;
  readonly #options: unknown;
  readonly #add: HostCallback;
  readonly #remove: HostCallback;
  #operation: WebListenerOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;
  #owned: boolean;

  constructor(
    type: string,
    callback: HostCallback,
    options: unknown,
    add: HostCallback,
    remove: HostCallback,
  ) {
    this.#type = type;
    this.#callback = callback;
    this.#options = options;
    this.#add = add;
    this.#remove = remove;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.#owned = false;
    this.cleanup = (): void => {
      this.#runOperation('cleanup', (sequence) => {
        this.#removeOwned(sequence, 'cleanup', false);
      });
    };
  }

  #guardReentry(operation: WebListenerOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] ${this.#type} listener ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertOwner(sequence: number, operation: WebListenerOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web Listener operation所有权。`);
    }
  }

  #assertCommit(sequence: number, operation: WebListenerOperation, label: string): void {
    this.#assertOwner(sequence, operation, label);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: WebListenerOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] ${this.#type} listener ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] ${this.#type} listener ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #callChecked<T>(
    sequence: number,
    operation: WebListenerOperation,
    callback: () => T,
    label: string,
  ): T {
    try {
      const result = callback();
      rejectThenable(result, label);
      this.#assertCommit(sequence, operation, label);
      return result;
    } catch (error) {
      try {
        this.#assertCommit(sequence, operation, label);
      } catch (reentryError) {
        if (error !== reentryError) {
          throw new AggregateError([error, reentryError], `${label}失败且发生Listener重入。`);
        }
        throw reentryError;
      }
      throw error;
    }
  }

  #callRollbackChecked<T>(
    sequence: number,
    operation: WebListenerOperation,
    callback: () => T,
    label: string,
  ): T {
    const reentrySequence = this.#reentrySequence;
    const result = callback();
    rejectThenable(result, label);
    this.#assertOwner(sequence, operation, label);
    if (this.#reentrySequence !== reentrySequence) {
      throw this.#reentryError ?? new Error(`${label}期间发生Listener重入。`);
    }
    return result;
  }

  #removeOwned(
    sequence: number,
    operation: WebListenerOperation,
    rollback: boolean,
  ): void {
    if (!this.#owned) return;
    const remove = () => this.#remove(this.#type, this.#callback, this.#options);
    if (rollback) {
      this.#callRollbackChecked(sequence, operation, remove, `[web] 回滚事件 ${this.#type}`);
    } else {
      this.#callChecked(sequence, operation, remove, `[web] 清理事件 ${this.#type}`);
    }
    this.#owned = false;
  }

  bind(required: boolean): void {
    this.#runOperation('bind', (sequence) => {
      this.#owned = true;
      let asynchronousRegistration = false;
      try {
        const result = this.#add(this.#type, this.#callback, this.#options);
        if (isThenable(result)) {
          asynchronousRegistration = true;
          throw new TypeError(`[web] 注册事件 ${this.#type} 不得返回异步 thenable。`);
        }
        this.#assertCommit(sequence, 'bind', `[web] 注册事件 ${this.#type}`);
      } catch (cause) {
        try {
          this.#removeOwned(sequence, 'bind', true);
        } catch (rollbackError) {
          const error = new Error(`[web] 注册必需事件 ${this.#type} 失败`);
          error.cause = new AggregateError(
            [cause, rollbackError],
            `[web] 注册事件 ${this.#type} 失败且回滚不完整`,
          );
          throw error;
        }
        if (required || asynchronousRegistration || this.#reentryError !== null) {
          const error = new Error(`[web] 注册必需事件 ${this.#type} 失败`);
          error.cause = cause;
          throw error;
        }
      }
    });
  }
}

class WebResizeObserverOwner {
  readonly cleanup: () => void;
  readonly #observe: HostCallback;
  readonly #disconnect: HostCallback;
  readonly #canvas: HostObject;
  #operation: WebResizeObserverOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;
  #owned: boolean;

  constructor(observe: HostCallback, disconnect: HostCallback, canvas: HostObject) {
    this.#observe = observe;
    this.#disconnect = disconnect;
    this.#canvas = canvas;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.#owned = false;
    this.cleanup = (): void => {
      this.#runOperation('cleanup', (sequence) => {
        this.#disconnectOwned(sequence, 'cleanup', false);
      });
    };
  }

  #guardReentry(operation: WebResizeObserverOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] ResizeObserver ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertOwner(
    sequence: number,
    operation: WebResizeObserverOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前ResizeObserver operation所有权。`);
    }
  }

  #assertCommit(
    sequence: number,
    operation: WebResizeObserverOperation,
    label: string,
  ): void {
    this.#assertOwner(sequence, operation, label);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(
    operation: WebResizeObserverOperation,
    run: (sequence: number) => T,
  ): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] ResizeObserver ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] ResizeObserver ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #callChecked<T>(
    sequence: number,
    operation: WebResizeObserverOperation,
    callback: () => T,
    label: string,
  ): T {
    try {
      const result = callback();
      rejectThenable(result, label);
      this.#assertCommit(sequence, operation, label);
      return result;
    } catch (error) {
      try {
        this.#assertCommit(sequence, operation, label);
      } catch (reentryError) {
        if (error !== reentryError) {
          throw new AggregateError(
            [error, reentryError],
            `${label}失败且发生ResizeObserver重入。`,
          );
        }
        throw reentryError;
      }
      throw error;
    }
  }

  #callRollbackChecked<T>(
    sequence: number,
    operation: WebResizeObserverOperation,
    callback: () => T,
    label: string,
  ): T {
    const reentrySequence = this.#reentrySequence;
    const result = callback();
    rejectThenable(result, label);
    this.#assertOwner(sequence, operation, label);
    if (this.#reentrySequence !== reentrySequence) {
      throw this.#reentryError ?? new Error(`${label}期间发生ResizeObserver重入。`);
    }
    return result;
  }

  #disconnectOwned(
    sequence: number,
    operation: WebResizeObserverOperation,
    rollback: boolean,
  ): void {
    if (!this.#owned) return;
    if (rollback) {
      this.#callRollbackChecked(
        sequence,
        operation,
        () => this.#disconnect(),
        '[web] ResizeObserver 注册回滚',
      );
    } else {
      this.#callChecked(
        sequence,
        operation,
        () => this.#disconnect(),
        '[web] ResizeObserver.disconnect',
      );
    }
    this.#owned = false;
  }

  observe(): boolean {
    return this.#runOperation('observe', (sequence) => {
      this.#owned = true;
      try {
        this.#callChecked(
          sequence,
          'observe',
          () => this.#observe(this.#canvas),
          '[web] ResizeObserver.observe',
        );
        return true;
      } catch (cause) {
        try {
          this.#disconnectOwned(sequence, 'observe', true);
        } catch (rollbackError) {
          throw new AggregateError(
            [cause, rollbackError],
            '[web] ResizeObserver 注册失败且回滚不完整。',
          );
        }
        if (this.#reentryError !== null || cause instanceof AggregateError) throw cause;
        return false;
      }
    });
  }
}

function listen(
  cleanups: Array<() => void>,
  target: HostObject | null | undefined,
  type: string,
  callback: HostCallback,
  options?: unknown,
  { required = false }: { required?: boolean } = {},
): void {
  const add = optionalMethod(target, 'addEventListener');
  const remove = optionalMethod(target, 'removeEventListener');
  if (!add || !remove) {
    if (required) throw new Error(`[web] 缺少必需事件监听能力：${type}`);
    return;
  }
  const owner = new WebListenerOwner(type, callback, options, add, remove);
  cleanups.push(owner.cleanup);
  owner.bind(required);
}

class WebCleanupBatchOwner {
  readonly #cleanups: readonly (() => void)[];
  #operation: WebCleanupBatchOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;
  #completed: boolean;

  constructor(cleanups: readonly (() => void)[]) {
    this.#cleanups = cleanups;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.#completed = false;
  }

  #guardReentry(operation: WebCleanupBatchOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] cleanup batch ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: WebCleanupBatchOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web cleanup batch operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(
    operation: WebCleanupBatchOperation,
    run: (sequence: number) => T,
  ): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] cleanup batch ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] cleanup batch ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #cleanupChild(
    sequence: number,
    operation: WebCleanupBatchOperation,
    cleanup: () => void,
    label: string,
  ): void {
    try {
      const result = cleanup();
      rejectThenable(result, label);
      this.#assertCommit(sequence, operation, label);
    } catch (error) {
      try {
        this.#assertCommit(sequence, operation, label);
      } catch (reentryError) {
        if (error !== reentryError) {
          throw new AggregateError(
            [error, reentryError],
            `${label}失败且发生cleanup batch重入。`,
          );
        }
        throw reentryError;
      }
      throw error;
    }
  }

  #drain(
    sequence: number,
    operation: WebCleanupBatchOperation,
    label: string,
  ): void {
    if (this.#completed) return;
    const errors: unknown[] = [];
    const cleanups = [...this.#cleanups].reverse();
    for (let index = 0; index < cleanups.length; index += 1) {
      try {
        this.#cleanupChild(
          sequence,
          operation,
          cleanups[index]!,
          `${label} child ${index}`,
        );
      } catch (error) {
        errors.push(error);
        if (this.#reentryError !== null) break;
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(errors, `${label} 存在 ${errors.length} 个清理失败。`);
    }
    this.#completed = true;
  }

  rollback(label: string): void {
    this.#runOperation('rollback', (sequence) => {
      this.#drain(sequence, 'rollback', label);
    });
  }

  cleanup(label: string): void {
    this.#runOperation('cleanup', (sequence) => {
      this.#drain(sequence, 'cleanup', label);
    });
  }
}

class WebPointerInputBindingOwner {
  readonly start: (event: HostObject) => void;
  readonly move: (event: HostObject) => void;
  readonly end: (event: HostObject) => void;
  readonly cancel: (event: HostObject) => void;
  readonly cleanup: () => void;
  readonly #canvas: HostObject;
  readonly #onStart: HostCallback;
  readonly #onMove: HostCallback;
  readonly #onEnd: HostCallback;
  readonly #onCancel: HostCallback;
  readonly #cleanupBatch: WebCleanupBatchOwner;
  readonly #pressedPointers: Set<number>;
  #active: boolean;
  #operation: WebPointerInputOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;
  #cleanupRequested: boolean;

  constructor(options: Readonly<{
    canvas: HostObject;
    onStart: HostCallback;
    onMove: HostCallback;
    onEnd: HostCallback;
    onCancel: HostCallback;
    cleanupBatch: WebCleanupBatchOwner;
  }>) {
    this.#canvas = options.canvas;
    this.#onStart = options.onStart;
    this.#onMove = options.onMove;
    this.#onEnd = options.onEnd;
    this.#onCancel = options.onCancel;
    this.#cleanupBatch = options.cleanupBatch;
    this.#pressedPointers = new Set();
    this.#active = true;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.#cleanupRequested = false;
    this.start = (event: HostObject): void => {
      if (!this.#active && this.#operation === null) return;
      this.#runOperation('start', (sequence) => this.#startOwned(sequence, event));
    };
    this.move = (event: HostObject): void => {
      if (!this.#active && this.#operation === null) return;
      this.#runOperation('move', (sequence) => this.#moveOwned(sequence, event));
    };
    this.end = (event: HostObject): void => {
      if (!this.#active && this.#operation === null) return;
      this.#runOperation('end', (sequence) => this.#endOwned(sequence, event));
    };
    this.cancel = (event: HostObject): void => {
      if (!this.#active && this.#operation === null) return;
      this.#runOperation('cancel', (sequence) => this.#cancelOwned(sequence, event));
    };
    this.cleanup = (): void => {
      if (this.#operation !== null && this.#operation !== 'cleanup') {
        this.#cleanupRequested = true;
        return;
      }
      this.#runOperation('cleanup', (sequence) => {
        this.#active = false;
        this.#pressedPointers.clear();
        this.#callChecked(
          sequence,
          'cleanup',
          () => this.#cleanupBatch.cleanup('[web] input binding'),
          '[web] input binding cleanup batch',
        );
      });
    };
  }

  #guardReentry(operation: WebPointerInputOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] pointer input ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: WebPointerInputOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web pointer input operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(
    operation: WebPointerInputOperation,
    run: (sequence: number) => T,
  ): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] pointer input ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    }
    const reentryError = this.#reentryError;
    this.#operation = null;
    this.#reentryError = null;
    let deferredCleanupError: unknown = null;
    if (operation !== 'cleanup' && this.#cleanupRequested) {
      this.#cleanupRequested = false;
      try {
        this.cleanup();
      } catch (error) {
        deferredCleanupError = error;
      }
    }
    const errors: unknown[] = [];
    if (failed) errors.push(failure);
    if (reentryError !== null && failure !== reentryError) errors.push(reentryError);
    if (deferredCleanupError !== null) errors.push(deferredCleanupError);
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(
        errors,
        `[web] pointer input ${operation}失败且生命周期未完整闭合。`,
      );
    }
    return result;
  }

  #callChecked<T>(
    sequence: number,
    operation: WebPointerInputOperation,
    callback: () => T,
    label: string,
  ): T {
    try {
      const result = callback();
      rejectThenable(result, label);
      this.#assertCommit(sequence, operation, label);
      return result;
    } catch (error) {
      try {
        this.#assertCommit(sequence, operation, label);
      } catch (reentryError) {
        if (error !== reentryError) {
          throw new AggregateError(
            [error, reentryError],
            `${label}失败且发生pointer input重入。`,
          );
        }
        throw reentryError;
      }
      throw error;
    }
  }

  #bestEffortHost(
    sequence: number,
    operation: WebPointerInputOperation,
    callback: () => unknown,
    label: string,
  ): void {
    try {
      rejectThenable(callback(), label);
    } catch {
      // Pointer capture and release remain best-effort host hints.
    }
    this.#assertCommit(sequence, operation, label);
  }

  #pointerId(
    sequence: number,
    operation: WebPointerInputOperation,
    event: HostObject,
  ): number | null {
    const pointerId = pointerIdentifier(event);
    this.#assertCommit(sequence, operation, '[web] pointer id read');
    return pointerId;
  }

  #preventGesture(
    sequence: number,
    operation: WebPointerInputOperation,
    event: HostObject,
  ): void {
    preventBrowserGesture(event);
    this.#assertCommit(sequence, operation, '[web] pointer gesture suppression');
  }

  #normalized(
    sequence: number,
    operation: WebPointerInputOperation,
    event: HostObject,
  ): ReturnType<typeof normalizePointer> {
    const normalized = normalizePointer(event, this.#canvas);
    this.#assertCommit(sequence, operation, '[web] pointer normalization');
    return normalized;
  }

  #startOwned(sequence: number, event: HostObject): void {
    const pointerId = this.#pointerId(sequence, 'start', event);
    if (pointerId === null) return;
    this.#preventGesture(sequence, 'start', event);
    if (this.#pressedPointers.has(pointerId)) return;
    this.#pressedPointers.add(pointerId);
    try {
      this.#bestEffortHost(
        sequence,
        'start',
        () => this.#canvas.setPointerCapture?.(pointerId),
        '[web] pointer capture',
      );
      const normalized = this.#normalized(sequence, 'start', event);
      this.#callChecked(
        sequence,
        'start',
        () => this.#onStart(normalized),
        '[web] input onStart',
      );
    } catch (error) {
      this.#pressedPointers.delete(pointerId);
      this.#bestEffortHost(
        sequence,
        'start',
        () => this.#canvas.releasePointerCapture?.(pointerId),
        '[web] failed start pointer release',
      );
      throw error;
    }
  }

  #moveOwned(sequence: number, event: HostObject): void {
    const pointerId = this.#pointerId(sequence, 'move', event);
    if (pointerId === null || !this.#pressedPointers.has(pointerId)) return;
    this.#preventGesture(sequence, 'move', event);
    const normalized = this.#normalized(sequence, 'move', event);
    this.#callChecked(
      sequence,
      'move',
      () => this.#onMove(normalized),
      '[web] input onMove',
    );
  }

  #endOwned(sequence: number, event: HostObject): void {
    const pointerId = this.#pointerId(sequence, 'end', event);
    if (pointerId === null) return;
    this.#preventGesture(sequence, 'end', event);
    if (!this.#pressedPointers.delete(pointerId)) return;
    this.#bestEffortHost(
      sequence,
      'end',
      () => this.#canvas.releasePointerCapture?.(pointerId),
      '[web] ended pointer release',
    );
    const normalized = this.#normalized(sequence, 'end', event);
    this.#callChecked(
      sequence,
      'end',
      () => this.#onEnd(normalized),
      '[web] input onEnd',
    );
  }

  #cancelOwned(sequence: number, event: HostObject): void {
    const pointerId = this.#pointerId(sequence, 'cancel', event);
    if (pointerId === null) return;
    this.#preventGesture(sequence, 'cancel', event);
    if (!this.#pressedPointers.delete(pointerId)) return;
    const normalized = this.#normalized(sequence, 'cancel', event);
    this.#callChecked(
      sequence,
      'cancel',
      () => this.#onCancel(normalized),
      '[web] input onCancel',
    );
  }

  deactivateForRollback(): void {
    this.#active = false;
    this.#pressedPointers.clear();
  }
}

class WebNotificationBindingOwner {
  readonly notify: () => void;
  readonly notifyUnconditionally: () => void;
  readonly cleanup: () => void;
  readonly #label: string;
  readonly #callback: HostCallback;
  readonly #condition: HostCallback;
  readonly #cleanupBatch: WebCleanupBatchOwner;
  #active: boolean;
  #operation: WebNotificationOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;
  #cleanupRequested: boolean;

  constructor(options: Readonly<{
    label: string;
    callback: HostCallback;
    condition?: HostCallback;
    cleanupBatch: WebCleanupBatchOwner;
  }>) {
    this.#label = options.label;
    this.#callback = options.callback;
    this.#condition = options.condition ?? (() => true);
    this.#cleanupBatch = options.cleanupBatch;
    this.#active = true;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.#cleanupRequested = false;
    this.notify = (): void => {
      if (!this.#active && this.#operation === null) return;
      this.#runOperation('notify', (sequence) => {
        const shouldNotify = this.#callChecked(
          sequence,
          'notify',
          () => this.#condition(),
          `[web] ${this.#label} notification condition`,
        );
        if (!Boolean(shouldNotify)) return;
        this.#notifyOwned(sequence, 'notify');
      });
    };
    this.notifyUnconditionally = (): void => {
      if (!this.#active && this.#operation === null) return;
      this.#runOperation('unconditional-notify', (sequence) => {
        this.#notifyOwned(sequence, 'unconditional-notify');
      });
    };
    this.cleanup = (): void => {
      if (this.#operation !== null && this.#operation !== 'cleanup') {
        this.#cleanupRequested = true;
        return;
      }
      this.#runOperation('cleanup', (sequence) => {
        this.#active = false;
        this.#callChecked(
          sequence,
          'cleanup',
          () => this.#cleanupBatch.cleanup(`[web] ${this.#label} binding`),
          `[web] ${this.#label} binding cleanup batch`,
        );
      });
    };
  }

  #guardReentry(operation: WebNotificationOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] ${this.#label} notification ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: WebNotificationOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web notification operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(
    operation: WebNotificationOperation,
    run: (sequence: number) => T,
  ): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] ${this.#label} notification ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    }
    const reentryError = this.#reentryError;
    this.#operation = null;
    this.#reentryError = null;
    let deferredCleanupError: unknown = null;
    if (operation !== 'cleanup' && this.#cleanupRequested) {
      this.#cleanupRequested = false;
      try {
        this.cleanup();
      } catch (error) {
        deferredCleanupError = error;
      }
    }
    const errors: unknown[] = [];
    if (failed) errors.push(failure);
    if (reentryError !== null && failure !== reentryError) errors.push(reentryError);
    if (deferredCleanupError !== null) errors.push(deferredCleanupError);
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(
        errors,
        `[web] ${this.#label} notification ${operation}失败且生命周期未完整闭合。`,
      );
    }
    return result;
  }

  #callChecked<T>(
    sequence: number,
    operation: WebNotificationOperation,
    callback: () => T,
    label: string,
  ): T {
    try {
      const result = callback();
      rejectThenable(result, label);
      this.#assertCommit(sequence, operation, label);
      return result;
    } catch (error) {
      try {
        this.#assertCommit(sequence, operation, label);
      } catch (reentryError) {
        if (error !== reentryError) {
          throw new AggregateError(
            [error, reentryError],
            `${label}失败且发生notification重入。`,
          );
        }
        throw reentryError;
      }
      throw error;
    }
  }

  #notifyOwned(sequence: number, operation: WebNotificationOperation): void {
    this.#callChecked(
      sequence,
      operation,
      () => this.#callback(),
      `[web] ${this.#label} notification callback`,
    );
  }

  deactivateForRollback(): void {
    this.#active = false;
  }
}

class WebStorageOperationOwner {
  readonly read: (key: string) => WebStorageReadResult;
  readonly write: (key: string, value: unknown) => boolean;
  readonly delete: (key: string) => boolean;
  readonly #getItem: HostCallback | undefined;
  readonly #setItem: HostCallback | undefined;
  readonly #removeItem: HostCallback | undefined;
  #operation: WebStorageOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  constructor(options: Readonly<{
    getItem: HostCallback | undefined;
    setItem: HostCallback | undefined;
    removeItem: HostCallback | undefined;
  }>) {
    this.#getItem = options.getItem;
    this.#setItem = options.setItem;
    this.#removeItem = options.removeItem;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.read = (key: string): WebStorageReadResult => {
      try {
        return this.#runOperation('read', (sequence) => {
          if (!this.#getItem) return { ok: false, found: false, value: undefined };
          const value = this.#callChecked(
            sequence,
            'read',
            () => this.#getItem?.(key),
            '[web] storage.getItem',
          );
          if (value !== null && typeof value !== 'string') {
            return { ok: false, found: false, value: undefined };
          }
          if (value === null) return { ok: true, found: false, value: undefined };
          const parsed: unknown = JSON.parse(value);
          this.#assertCommit(sequence, 'read', '[web] storage JSON.parse');
          return { ok: true, found: true, value: parsed };
        });
      } catch {
        return { ok: false, found: false, value: undefined };
      }
    };
    this.write = (key: string, value: unknown): boolean => {
      try {
        return this.#runOperation('write', (sequence) => {
          if (!this.#setItem) return false;
          const serialized = JSON.stringify(value);
          this.#assertCommit(sequence, 'write', '[web] storage JSON.stringify');
          if (typeof serialized !== 'string') return false;
          this.#callChecked(
            sequence,
            'write',
            () => this.#setItem?.(key, serialized),
            '[web] storage.setItem',
          );
          return true;
        });
      } catch {
        return false;
      }
    };
    this.delete = (key: string): boolean => {
      try {
        return this.#runOperation('delete', (sequence) => {
          if (!this.#removeItem) return false;
          this.#callChecked(
            sequence,
            'delete',
            () => this.#removeItem?.(key),
            '[web] storage.removeItem',
          );
          return true;
        });
      } catch {
        return false;
      }
    };
  }

  #guardReentry(operation: WebStorageOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] storage ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: WebStorageOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web storage operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: WebStorageOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] storage ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] storage ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #callChecked<T>(
    sequence: number,
    operation: WebStorageOperation,
    callback: () => T,
    label: string,
  ): T {
    try {
      const result = callback();
      rejectThenable(result, label);
      this.#assertCommit(sequence, operation, label);
      return result;
    } catch (error) {
      try {
        this.#assertCommit(sequence, operation, label);
      } catch (reentryError) {
        if (error !== reentryError) {
          throw new AggregateError(
            [error, reentryError],
            `${label}失败且发生storage重入。`,
          );
        }
        throw reentryError;
      }
      throw error;
    }
  }
}

class WebViewportReadOwner {
  readonly read: () => WebViewportSnapshot;
  readonly #canvas: HostObject;
  readonly #windowObject: HostObject;
  readonly #documentObject: HostObject;
  #operation: WebViewportOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  constructor(options: Readonly<{
    canvas: HostObject;
    windowObject: HostObject;
    documentObject: HostObject;
  }>) {
    this.#canvas = options.canvas;
    this.#windowObject = options.windowObject;
    this.#documentObject = options.documentObject;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.read = (): WebViewportSnapshot => this.#runOperation('read', (sequence) => {
      const documentElementValue = this.#readProperty(
        sequence,
        this.#documentObject,
        'documentElement',
        '[web] viewport documentElement',
      );
      const documentElement = (
        (typeof documentElementValue === 'object' && documentElementValue !== null)
        || typeof documentElementValue === 'function'
      ) ? documentElementValue as HostObject : null;
      const canvasRect = this.#readCanvasRect(sequence);

      const documentWidth = this.#positiveChecked(
        sequence,
        this.#readProperty(
          sequence,
          documentElement,
          'clientWidth',
          '[web] viewport document width',
        ),
        1280,
        '[web] viewport document width normalization',
      );
      const windowWidth = this.#positiveChecked(
        sequence,
        this.#readProperty(
          sequence,
          this.#windowObject,
          'innerWidth',
          '[web] viewport window width',
        ),
        documentWidth,
        '[web] viewport window width normalization',
      );
      const canvasWidth = this.#positiveChecked(
        sequence,
        this.#readProperty(
          sequence,
          this.#canvas,
          'clientWidth',
          '[web] viewport canvas width',
        ),
        windowWidth,
        '[web] viewport canvas width normalization',
      );
      const width = this.#positiveChecked(
        sequence,
        this.#readProperty(
          sequence,
          canvasRect,
          'width',
          '[web] viewport rect width',
        ),
        canvasWidth,
        '[web] viewport rect width normalization',
      );

      const documentHeight = this.#positiveChecked(
        sequence,
        this.#readProperty(
          sequence,
          documentElement,
          'clientHeight',
          '[web] viewport document height',
        ),
        720,
        '[web] viewport document height normalization',
      );
      const windowHeight = this.#positiveChecked(
        sequence,
        this.#readProperty(
          sequence,
          this.#windowObject,
          'innerHeight',
          '[web] viewport window height',
        ),
        documentHeight,
        '[web] viewport window height normalization',
      );
      const canvasHeight = this.#positiveChecked(
        sequence,
        this.#readProperty(
          sequence,
          this.#canvas,
          'clientHeight',
          '[web] viewport canvas height',
        ),
        windowHeight,
        '[web] viewport canvas height normalization',
      );
      const height = this.#positiveChecked(
        sequence,
        this.#readProperty(
          sequence,
          canvasRect,
          'height',
          '[web] viewport rect height',
        ),
        canvasHeight,
        '[web] viewport rect height normalization',
      );

      const pixelRatio = Math.min(
        this.#positiveChecked(
          sequence,
          this.#readProperty(
            sequence,
            this.#windowObject,
            'devicePixelRatio',
            '[web] viewport pixel ratio',
          ),
          1,
          '[web] viewport pixel ratio normalization',
        ),
        2,
      );
      this.#assertCommit(sequence, 'read', '[web] viewport snapshot publication');
      return { width, height, pixelRatio, safeArea: null };
    });
  }

  #guardReentry(operation: WebViewportOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] viewport ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: WebViewportOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web viewport operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: WebViewportOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] viewport ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] viewport ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #callChecked<T>(sequence: number, callback: () => T, label: string): T {
    try {
      const result = callback();
      rejectThenable(result, label);
      this.#assertCommit(sequence, 'read', label);
      return result;
    } catch (error) {
      try {
        this.#assertCommit(sequence, 'read', label);
      } catch (reentryError) {
        if (error !== reentryError) {
          throw new AggregateError(
            [error, reentryError],
            `${label}失败且发生viewport重入。`,
          );
        }
        throw reentryError;
      }
      throw error;
    }
  }

  #readProperty(
    sequence: number,
    object: HostObject | null,
    key: PropertyKey,
    label: string,
  ): unknown {
    if (object === null) return undefined;
    return this.#callChecked(sequence, () => object[key], label);
  }

  #readCanvasRect(sequence: number): HostObject | null {
    let value: unknown = null;
    try {
      value = this.#canvas.getBoundingClientRect?.() ?? null;
      rejectThenable(value, '[web] viewport canvas rect');
    } catch {
      this.#assertCommit(sequence, 'read', '[web] viewport canvas rect fallback');
      return null;
    }
    this.#assertCommit(sequence, 'read', '[web] viewport canvas rect');
    return (
      (typeof value === 'object' && value !== null)
      || typeof value === 'function'
    ) ? value as HostObject : null;
  }

  #positiveChecked(
    sequence: number,
    value: unknown,
    fallback: number,
    label: string,
  ): number {
    return this.#callChecked(sequence, () => positive(value, fallback), label);
  }
}

class WebAssetReadRequestOwner {
  readonly #requestId: number;
  readonly #sourceKey: string;
  readonly #fetch: HostCallback | undefined;
  #phase: WebAssetReadPhase;
  #operation: WebAssetReadSegment | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  constructor(options: Readonly<{
    requestId: number;
    sourceKey: string;
    fetch: HostCallback | undefined;
  }>) {
    this.#requestId = options.requestId;
    this.#sourceKey = options.sourceKey;
    this.#fetch = options.fetch;
    this.#phase = 'created';
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
  }

  async read(): Promise<ArrayBuffer> {
    try {
      this.#validateSourceKey();
      if (!this.#fetch) throw new Error('[web] 当前宿主缺少 fetch。');
      const responseValue = this.#runSegment(
        'fetch-start',
        'created',
        'fetch-pending',
        () => this.#fetch?.(this.#sourceKey),
      );
      const response = await responseValue;
      const arrayBuffer = this.#runSegment(
        'fetch-settlement',
        'fetch-pending',
        'response-ready',
        () => this.#responseArrayBufferPort(response),
      );
      const bytesValue = this.#runSegment(
        'bytes-start',
        'response-ready',
        'bytes-pending',
        () => arrayBuffer(),
      );
      const bytes = await bytesValue;
      return this.#runSegment(
        'bytes-settlement',
        'bytes-pending',
        'completed',
        () => {
          if (!(bytes instanceof ArrayBuffer)) {
            throw new TypeError('[web] 资产响应不是 ArrayBuffer。');
          }
          return bytes;
        },
      );
    } catch (error) {
      this.#phase = 'failed';
      throw error;
    }
  }

  #validateSourceKey(): void {
    if (
      typeof this.#sourceKey !== 'string'
      || !this.#sourceKey.startsWith('./assets/')
      || this.#sourceKey.includes('..')
      || this.#sourceKey.includes('\\')
    ) {
      throw new RangeError('[web] 资产路径必须位于 ./assets/ 且不能包含路径逃逸。');
    }
  }

  #responseArrayBufferPort(response: unknown): HostCallback {
    const responseObject = hostObject(
      response,
      `[web] asset request ${this.#requestId} response`,
    );
    const ok = safeProperty(responseObject, 'ok');
    const status = safeProperty(responseObject, 'status');
    const arrayBuffer = optionalMethod(responseObject, 'arrayBuffer');
    if (!ok || !arrayBuffer) {
      throw new Error(
        `[web] 读取资产失败：${this.#sourceKey}（${String(status ?? 'unknown')}）`,
      );
    }
    return arrayBuffer;
  }

  #guardReentry(operation: WebAssetReadSegment): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] asset request ${this.#requestId} ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: WebAssetReadSegment, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web asset request operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSegment<T>(
    operation: WebAssetReadSegment,
    expectedPhase: WebAssetReadPhase,
    nextPhase: WebAssetReadPhase,
    run: () => T,
  ): T {
    this.#guardReentry(operation);
    if (this.#phase !== expectedPhase) {
      throw new Error(
        `[web] asset request ${this.#requestId} ${operation}要求${expectedPhase}，实际${this.#phase}。`,
      );
    }
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run();
      this.#assertCommit(
        sequence,
        operation,
        `[web] asset request ${this.#requestId} ${operation}`,
      );
      this.#phase = nextPhase;
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] asset request ${this.#requestId} ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class WebAssetReadService {
  readonly read: (sourceKey: string) => Promise<ArrayBuffer>;
  readonly #fetch: HostCallback | undefined;
  #requestSequence: number;

  constructor(fetch: HostCallback | undefined) {
    this.#fetch = fetch;
    this.#requestSequence = 0;
    this.read = (sourceKey: string): Promise<ArrayBuffer> => {
      this.#requestSequence += 1;
      return new WebAssetReadRequestOwner({
        requestId: this.#requestSequence,
        sourceKey,
        fetch: this.#fetch,
      }).read();
    };
  }
}

class WebShareOperationOwner {
  readonly share: (payload: unknown) => Promise<boolean>;
  readonly #shareHost: HostCallback | undefined;
  #requestSequence: number;
  #pending: WebSharePendingOwner | null;
  #operation: WebShareOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  constructor(shareHost: HostCallback | undefined) {
    this.#shareHost = shareHost;
    this.#requestSequence = 0;
    this.#pending = null;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.share = (payload: unknown): Promise<boolean> => {
      if (!this.#shareHost) return Promise.resolve(false);
      if (this.#operation !== null) {
        try {
          this.#guardReentry('start');
        } catch {
          return Promise.resolve(false);
        }
      }
      if (this.#pending !== null) return Promise.resolve(false);
      this.#requestSequence += 1;
      let resolve!: (result: boolean) => void;
      const promise = new Promise<boolean>((resolver) => {
        resolve = resolver;
      });
      const pending = Object.freeze({
        requestId: this.#requestSequence,
        promise,
        resolve,
      });
      this.#pending = pending;
      let shareResult: unknown;
      try {
        shareResult = this.#runOperation('start', (sequence) => {
          const result = this.#shareHost?.(payload);
          this.#assertCommit(sequence, 'start', '[web] share host invocation');
          return result;
        });
      } catch {
        this.#settle(pending, false);
        return promise;
      }
      Promise.resolve(shareResult).then(
        () => this.#settle(pending, true),
        () => this.#settle(pending, false),
      );
      return promise;
    };
  }

  #guardReentry(operation: WebShareOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] share ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: WebShareOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web share operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: WebShareOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] share ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] share ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #settle(pending: WebSharePendingOwner, result: boolean): void {
    if (this.#pending !== pending) return;
    try {
      this.#runOperation('settlement', (sequence) => {
        if (this.#pending !== pending) return;
        this.#pending = null;
        this.#assertCommit(sequence, 'settlement', '[web] share pending release');
        pending.resolve(result);
        this.#assertCommit(sequence, 'settlement', '[web] share settlement publication');
      });
    } catch {
      if (this.#pending === pending) this.#pending = null;
      pending.resolve(false);
    }
  }
}

class WebWallClockReadOwner {
  readonly read: () => number;
  readonly #wallNow: HostCallback;
  #operation: WebWallClockOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  constructor(wallNow: HostCallback) {
    this.#wallNow = wallNow;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.read = (): number => this.#runOperation('read', (sequence) => {
      const value = this.#wallNow();
      rejectThenable(value, '[web] wall clock');
      this.#assertCommit(sequence, 'read', '[web] wall clock host return');
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError('[web] wall clock 必须返回有限数字。');
      }
      return value;
    });
  }

  #guardReentry(operation: WebWallClockOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] wall clock ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: WebWallClockOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web wall clock operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: WebWallClockOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] wall clock ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] wall clock ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class WebClockReadOwner {
  readonly read: () => number;
  readonly #performanceNow: HostCallback | undefined;
  readonly #wallNow: () => number;
  #operation: WebClockOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  constructor(performanceNow: HostCallback | undefined, wallNow: () => number) {
    this.#performanceNow = performanceNow;
    this.#wallNow = wallNow;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.read = (): number => {
      try {
        return this.#runOperation('read', (sequence) => {
          if (this.#performanceNow) {
            const value = this.#callChecked(
              sequence,
              () => this.#performanceNow?.(),
              '[web] performance.now',
            );
            if (typeof value === 'number' && Number.isFinite(value)) return value;
          }
          return this.#callChecked(sequence, () => this.#wallNow(), '[web] wall clock fallback');
        });
      } catch {
        return this.#wallNow();
      }
    };
  }

  #guardReentry(operation: WebClockOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(`[web] clock ${this.#operation}期间拒绝${operation}重入。`);
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: WebClockOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web clock operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: WebClockOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] clock ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] clock ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #callChecked<T>(sequence: number, callback: () => T, label: string): T {
    const result = callback();
    rejectThenable(result, label);
    this.#assertCommit(sequence, 'read', label);
    return result;
  }
}

class WebVibrationOperationOwner {
  readonly vibrate: (kind?: unknown) => boolean;
  readonly #vibrateHost: HostCallback | undefined;
  #operation: WebVibrationOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  constructor(vibrateHost: HostCallback | undefined) {
    this.#vibrateHost = vibrateHost;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.vibrate = (kind: unknown = 'light'): boolean => {
      try {
        return this.#runOperation('vibrate', (sequence) => {
          if (!this.#vibrateHost) return false;
          const result = this.#vibrateHost(kind === 'heavy' ? 40 : 18);
          rejectThenable(result, '[web] navigator.vibrate');
          this.#assertCommit(sequence, 'vibrate', '[web] navigator.vibrate');
          return Boolean(result);
        });
      } catch {
        return false;
      }
    };
  }

  #guardReentry(operation: WebVibrationOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] vibration ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: WebVibrationOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web vibration operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: WebVibrationOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] vibration ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] vibration ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class WebMediaFactoryOperationOwner {
  readonly createImage: () => unknown;
  readonly createAudio: () => unknown;
  readonly createOffscreenCanvas: (width: unknown, height: unknown) => unknown;
  readonly #environment: HostObject;
  #operation: WebMediaFactoryOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  constructor(environment: HostObject) {
    this.#environment = environment;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.createImage = (): unknown => {
      try {
        return this.#runOperation('create-image', (sequence) => {
          const ImageConstructor = this.#resolveConstructor(
            sequence,
            'create-image',
            'Image',
            '[web] Image constructor',
          );
          if (typeof ImageConstructor === 'function') {
            return this.#constructChecked(
              sequence,
              'create-image',
              () => Reflect.construct(ImageConstructor, []),
              '[web] Image construction',
            );
          }
          const createElement = optionalMethod(this.#environment.documentObject, 'createElement');
          this.#assertCommit(sequence, 'create-image', '[web] image createElement port');
          if (!createElement) return null;
          return this.#callChecked(
            sequence,
            'create-image',
            () => createElement('img'),
            '[web] fallback image element',
          );
        });
      } catch {
        return null;
      }
    };
    this.createAudio = (): unknown => {
      try {
        return this.#runOperation('create-audio', (sequence) => {
          const AudioConstructor = this.#resolveConstructor(
            sequence,
            'create-audio',
            'Audio',
            '[web] Audio constructor',
          );
          if (typeof AudioConstructor !== 'function') return null;
          return this.#constructChecked(
            sequence,
            'create-audio',
            () => Reflect.construct(AudioConstructor, []),
            '[web] Audio construction',
          );
        });
      } catch {
        return null;
      }
    };
    this.createOffscreenCanvas = (width: unknown, height: unknown): unknown => (
      this.#runOperation('create-offscreen-canvas', (sequence) => {
        const size = this.#callChecked(
          sequence,
          'create-offscreen-canvas',
          () => normalizeCanvasSize(width, height, 'web'),
          '[web] offscreen canvas size normalization',
        );
        const OffscreenCanvasConstructor = this.#resolveConstructor(
          sequence,
          'create-offscreen-canvas',
          'OffscreenCanvas',
          '[web] OffscreenCanvas constructor',
        );
        if (typeof OffscreenCanvasConstructor === 'function') {
          try {
            const canvas = this.#constructChecked(
              sequence,
              'create-offscreen-canvas',
              () => Reflect.construct(
                OffscreenCanvasConstructor,
                [size.width, size.height],
              ),
              '[web] OffscreenCanvas construction',
            );
            return this.#callChecked(
              sequence,
              'create-offscreen-canvas',
              () => sizeCanvas(canvas, size.width, size.height, 'web'),
              '[web] OffscreenCanvas sizing',
            );
          } catch (error) {
            if (this.#reentryError !== null) throw error;
            // A blocked or incomplete OffscreenCanvas should not disable 2D labels.
          }
        }
        const createElement = optionalMethod(this.#environment.documentObject, 'createElement');
        this.#assertCommit(sequence, 'create-offscreen-canvas', '[web] canvas createElement port');
        if (!createElement) {
          throw new Error('[web] 当前浏览器不支持 OffscreenCanvas，且无法创建备用 Canvas');
        }
        const canvas = this.#callChecked(
          sequence,
          'create-offscreen-canvas',
          () => createElement('canvas'),
          '[web] fallback canvas element',
        );
        return this.#callChecked(
          sequence,
          'create-offscreen-canvas',
          () => sizeCanvas(canvas, size.width, size.height, 'web'),
          '[web] fallback canvas sizing',
        );
      })
    );
  }

  #guardReentry(operation: WebMediaFactoryOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] media factory ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: WebMediaFactoryOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web media factory operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: WebMediaFactoryOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] media factory ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] media factory ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #callChecked<T>(
    sequence: number,
    operation: WebMediaFactoryOperation,
    callback: () => T,
    label: string,
  ): T {
    const result = callback();
    rejectThenable(result, label);
    this.#assertCommit(sequence, operation, label);
    return result;
  }

  #constructChecked(
    sequence: number,
    operation: WebMediaFactoryOperation,
    construct: () => unknown,
    label: string,
  ): unknown {
    return this.#callChecked(sequence, operation, construct, label);
  }

  #resolveConstructor(
    sequence: number,
    operation: WebMediaFactoryOperation,
    key: string,
    label: string,
  ): unknown {
    const rootValue = this.#callChecked(
      sequence,
      operation,
      () => this.#environment.root[key],
      `${label} root read`,
    );
    if (rootValue !== null && rootValue !== undefined) return rootValue;
    return this.#callChecked(
      sequence,
      operation,
      () => this.#environment.windowObject[key],
      `${label} window read`,
    );
  }
}

class WebMainCanvasCreationOwner {
  readonly create: () => HostObject;
  readonly #environment: HostObject;
  #operation: WebMainCanvasOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  constructor(environment: HostObject) {
    this.#environment = environment;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.create = (): HostObject => this.#runOperation('create', (sequence) => {
      const querySelector = optionalMethod(this.#environment.documentObject, 'querySelector');
      this.#assertCommit(sequence, 'create', '[web] main Canvas querySelector port');
      let selectedCanvas: unknown = null;
      if (querySelector) {
        try {
          selectedCanvas = this.#callChecked(
            sequence,
            () => querySelector('#game'),
            '[web] main Canvas query',
          );
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          selectedCanvas = null;
        }
      }
      if (selectedCanvas) {
        return this.#callChecked(
          sequence,
          () => prepareCanvas(selectedCanvas, 'web') as HostObject,
          '[web] selected main Canvas preparation',
        );
      }
      return this.#createFallback(sequence);
    });
  }

  #createFallback(sequence: number): HostObject {
    const createElement = optionalMethod(this.#environment.documentObject, 'createElement');
    this.#assertCommit(sequence, 'create', '[web] fallback Canvas createElement port');
    const body = this.#callChecked(
      sequence,
      () => this.#environment.documentObject.body,
      '[web] fallback Canvas body read',
    );
    const documentElement = body ?? this.#callChecked(
      sequence,
      () => this.#environment.documentObject.documentElement,
      '[web] fallback Canvas documentElement read',
    );
    const parent = (
      (typeof documentElement === 'object' && documentElement !== null)
      || typeof documentElement === 'function'
    ) ? documentElement as HostObject : null;
    const appendChild = optionalMethod(parent, 'appendChild');
    this.#assertCommit(sequence, 'create', '[web] fallback Canvas append port');
    if (!createElement || !parent || !appendChild) {
      throw new Error('[web] 页面缺少 #game Canvas，且无法自动创建可见的备用 Canvas');
    }
    const createdCanvas = hostObject(
      this.#callChecked(
        sequence,
        () => createElement('canvas'),
        '[web] fallback Canvas construction',
      ),
      '[web] fallback Canvas',
    );
    this.#assertCommit(sequence, 'create', '[web] fallback Canvas validation');
    this.#callChecked(
      sequence,
      () => {
        createdCanvas.id = 'game';
      },
      '[web] fallback Canvas id publication',
    );
    const setAttribute = optionalMethod(createdCanvas, 'setAttribute');
    this.#assertCommit(sequence, 'create', '[web] fallback Canvas attribute port');
    if (setAttribute) {
      this.#callChecked(
        sequence,
        () => setAttribute('aria-label', '竞技场跑酷对决游戏画布'),
        '[web] fallback Canvas aria label',
      );
    }
    const remove = optionalMethod(createdCanvas, 'remove');
    const removeChild = optionalMethod(parent, 'removeChild');
    this.#assertCommit(sequence, 'create', '[web] fallback Canvas rollback port');
    const rollback = remove
      ? () => remove()
      : removeChild
        ? () => removeChild(createdCanvas)
        : null;
    let appendAttempted = false;
    try {
      appendAttempted = true;
      this.#callChecked(
        sequence,
        () => appendChild(createdCanvas),
        '[web] fallback Canvas append',
      );
      const prepared = this.#callChecked(
        sequence,
        () => prepareCanvas(createdCanvas, 'web') as HostObject,
        '[web] fallback Canvas preparation',
      );
      appendAttempted = false;
      return prepared;
    } catch (cause) {
      if (!appendAttempted) throw cause;
      if (!rollback) throw cause;
      try {
        this.#callRollbackChecked(
          sequence,
          rollback,
          '[web] fallback Canvas rollback',
        );
      } catch (rollbackError) {
        throw new AggregateError(
          [cause, rollbackError],
          '[web] 备用 Canvas 创建失败且DOM回滚不完整。',
        );
      }
      throw cause;
    }
  }

  #guardReentry(operation: WebMainCanvasOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] main Canvas ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertOwner(sequence: number, operation: WebMainCanvasOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web main Canvas operation所有权。`);
    }
  }

  #assertCommit(sequence: number, operation: WebMainCanvasOperation, label: string): void {
    this.#assertOwner(sequence, operation, label);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: WebMainCanvasOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] main Canvas ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] main Canvas ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #callChecked<T>(sequence: number, callback: () => T, label: string): T {
    const result = callback();
    rejectThenable(result, label);
    this.#assertCommit(sequence, 'create', label);
    return result;
  }

  #callRollbackChecked<T>(sequence: number, callback: () => T, label: string): T {
    const reentrySequence = this.#reentrySequence;
    const result = callback();
    rejectThenable(result, label);
    this.#assertOwner(sequence, 'create', label);
    if (this.#reentrySequence !== reentrySequence) {
      throw this.#reentryError ?? new Error(`${label}期间发生main Canvas重入。`);
    }
    return result;
  }
}

class WebGlContextOperationOwner {
  readonly create: (canvas: unknown, attributes: unknown) => unknown;
  #operation: WebGlContextOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  constructor() {
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.create = (canvas: unknown, attributes: unknown): unknown => (
      this.#runOperation('create', (sequence) => {
        const context = getRequiredWebGL2Context(canvas, attributes, 'web');
        rejectThenable(context, '[web] WebGL2 context');
        this.#assertCommit(sequence, 'create', '[web] WebGL2 context publication');
        return context;
      })
    );
  }

  #guardReentry(operation: WebGlContextOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `[web] WebGL context ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: WebGlContextOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前WebGL context operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: WebGlContextOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[web] WebGL context ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[web] WebGL context ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

function parseInputBindings(value: unknown): Readonly<Record<string, HostCallback>> {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError('[web] input bindings 必须是对象。');
  }
  if (Array.isArray(value)) throw new TypeError('[web] input bindings 必须是对象。');
  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch (cause) {
    throw new TypeError('[web] input bindings 无法读取。', { cause });
  }
  const callbacks: Record<string, HostCallback> = Object.create(null) as Record<string, HostCallback>;
  for (const key of keys) {
    if (typeof key !== 'string' || !INPUT_BINDING_KEYS.has(key)) {
      throw new TypeError(`[web] input bindings 包含未知字段 ${String(key)}。`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (cause) {
      throw new TypeError(`[web] input bindings.${key} 无法读取。`, { cause });
    }
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`[web] input bindings.${key} 必须是数据字段。`);
    }
    if (descriptor.value !== undefined && typeof descriptor.value !== 'function') {
      throw new TypeError(`[web] input bindings.${key} 必须是函数。`);
    }
    if (typeof descriptor.value === 'function') callbacks[key] = descriptor.value as HostCallback;
  }
  for (const key of INPUT_BINDING_KEYS) callbacks[key] ??= () => {};
  return Object.freeze(callbacks);
}

function preventBrowserGesture(event: HostObject): void {
  try {
    if (event?.cancelable !== false) event?.preventDefault?.();
  } catch {
    // Browser gesture suppression is best-effort; gameplay input still runs.
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeProperty(object: HostObject | null | undefined, key: PropertyKey): any {
  try {
    return object?.[key];
  } catch {
    return undefined;
  }
}

function pointerIdentifier(event: HostObject): number | null {
  const value = safeProperty(event, 'pointerId');
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function webEnvironment(environmentValue: unknown): HostObject {
  const environment = hostObject(environmentValue, '[web] environment');
  const windowObject = safeProperty(environment, 'window') ?? environment;
  const documentObject = safeProperty(environment, 'document') ?? safeProperty(windowObject, 'document');
  if (!documentObject?.querySelector) {
    throw new Error('[web] 未检测到 DOM，请只在 Web 入口中创建 Web 平台');
  }
  return {
    root: environment,
    windowObject,
    documentObject,
    navigatorObject: safeProperty(environment, 'navigator') ?? safeProperty(windowObject, 'navigator'),
    storage: safeProperty(environment, 'localStorage') ?? safeProperty(windowObject, 'localStorage'),
    performanceObject: safeProperty(environment, 'performance') ?? safeProperty(windowObject, 'performance'),
  };
}

export function createWebPlatform(environment: unknown = globalThis) {
  const env = webEnvironment(environment);
  const mainCanvasOwner = new WebMainCanvasCreationOwner(env);
  const canvas = mainCanvasOwner.create();
  const webGlContextOwner = new WebGlContextOperationOwner();
  const performanceNow = optionalMethod(env.performanceObject, 'now');
  const requestAnimationFrame = optionalMethod(env.windowObject, 'requestAnimationFrame');
  const cancelAnimationFrame = optionalMethod(env.windowObject, 'cancelAnimationFrame');
  const storageGetItem = optionalMethod(env.storage, 'getItem');
  const storageSetItem = optionalMethod(env.storage, 'setItem');
  const storageRemoveItem = optionalMethod(env.storage, 'removeItem');
  const vibrateHost = optionalMethod(env.navigatorObject, 'vibrate');
  const shareHost = optionalMethod(env.navigatorObject, 'share');
  const fetchHost = optionalMethod(env.root, 'fetch')
    ?? optionalMethod(env.windowObject, 'fetch');
  const wallClockOwner = new WebWallClockReadOwner(Date.now.bind(Date));
  const clockOwner = new WebClockReadOwner(
    performanceNow ?? undefined,
    wallClockOwner.read,
  );
  const vibrationOwner = new WebVibrationOperationOwner(vibrateHost ?? undefined);
  const mediaFactoryOwner = new WebMediaFactoryOperationOwner(env);
  const now = clockOwner.read;
  const frames = createFrameScheduler({
    ...(requestAnimationFrame ? {
      request: (callback: () => void) => requestAnimationFrame(callback),
    } : {}),
    ...(cancelAnimationFrame ? {
      cancel: (frameId: unknown) => cancelAnimationFrame(frameId),
    } : {}),
    now,
  });
  const storageOwner = new WebStorageOperationOwner({
    getItem: storageGetItem ?? undefined,
    setItem: storageSetItem ?? undefined,
    removeItem: storageRemoveItem ?? undefined,
  });
  const storageRead = storageOwner.read;
  const storageWrite = storageOwner.write;
  const storageDelete = storageOwner.delete;
  const viewportOwner = new WebViewportReadOwner({
    canvas,
    windowObject: env.windowObject,
    documentObject: env.documentObject,
  });
  const assetReadService = new WebAssetReadService(fetchHost ?? undefined);
  const readAssetBytes = assetReadService.read;
  const shareOwner = new WebShareOperationOwner(shareHost ?? undefined);

  return createPlatformContract({
    id: 'web',
    createCanvas: () => canvas,
    createOffscreenCanvas: mediaFactoryOwner.createOffscreenCanvas,
    getWebGLContext: webGlContextOwner.create,
    createImage: mediaFactoryOwner.createImage,
    readAssetBytes,
    getViewport: viewportOwner.read,
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
    now,
    wallNow: wallClockOwner.read,
    bindInput: (bindingsValue: unknown = {}) => {
      const bindings = parseInputBindings(bindingsValue);
      const onStart = bindings.onStart ?? (() => {});
      const onMove = bindings.onMove ?? (() => {});
      const onEnd = bindings.onEnd ?? (() => {});
      const onCancel = bindings.onCancel ?? (() => {});
      const cleanups: Array<() => void> = [];
      const cleanupBatch = new WebCleanupBatchOwner(cleanups);
      const inputOwner = new WebPointerInputBindingOwner({
        canvas,
        onStart,
        onMove,
        onEnd,
        onCancel,
        cleanupBatch,
      });
      try {
        listen(
          cleanups,
          canvas,
          'pointerdown',
          inputOwner.start,
          { passive: false },
          { required: true },
        );
        listen(cleanups, canvas, 'pointerup', inputOwner.end, { passive: false });
        listen(cleanups, canvas, 'pointercancel', inputOwner.cancel, { passive: false });
        listen(cleanups, canvas, 'lostpointercapture', inputOwner.cancel);
        listen(cleanups, canvas, 'contextmenu', preventBrowserGesture);
        listen(cleanups, canvas, 'selectstart', preventBrowserGesture);
        listen(cleanups, canvas, 'dragstart', preventBrowserGesture);
        listen(cleanups, canvas, 'gesturestart', preventBrowserGesture, { passive: false });
        listen(
          cleanups,
          env.windowObject,
          'pointerup',
          inputOwner.end,
          { passive: false },
          { required: true },
        );
        listen(
          cleanups,
          env.windowObject,
          'pointermove',
          inputOwner.move,
          { passive: false },
          { required: true },
        );
        listen(
          cleanups,
          env.windowObject,
          'pointercancel',
          inputOwner.cancel,
          { passive: false },
          { required: true },
        );
      } catch (error) {
        inputOwner.deactivateForRollback();
        try {
          cleanupBatch.rollback('[web] input binding rollback');
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            '[web] input binding 注册失败且回滚不完整。',
          );
        }
        throw error;
      }
      return inputOwner.cleanup;
    },
    onResize: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('[web] resize callback 必须是函数。');
      const cleanups: Array<() => void> = [];
      const cleanupBatch = new WebCleanupBatchOwner(cleanups);
      const notificationOwner = new WebNotificationBindingOwner({
        label: 'resize',
        callback,
        cleanupBatch,
      });
      try {
        listen(cleanups, env.windowObject, 'resize', notificationOwner.notify);
        const ResizeObserverConstructor = env.root.ResizeObserver
          ?? env.windowObject.ResizeObserver;
        if (typeof ResizeObserverConstructor === 'function') {
          let observer: HostObject | null = null;
          let observerNotificationFailure: unknown = null;
          const observerNotify = (): void => {
            try {
              notificationOwner.notify();
            } catch (error) {
              observerNotificationFailure ??= error;
              throw error;
            }
          };
          try {
            observer = new ResizeObserverConstructor(observerNotify) as HostObject;
            if (observerNotificationFailure !== null) throw observerNotificationFailure;
          } catch (error) {
            if (observerNotificationFailure !== null) throw observerNotificationFailure;
            if (error instanceof AggregateError) throw error;
            // Window resize remains the conservative fallback.
          }
          if (observer !== null) {
            const observe = optionalMethod(observer, 'observe');
            const disconnect = optionalMethod(observer, 'disconnect');
            if (observe && disconnect) {
              const observerOwner = new WebResizeObserverOwner(observe, disconnect, canvas);
              cleanups.push(observerOwner.cleanup);
              observerOwner.observe();
              if (observerNotificationFailure !== null) throw observerNotificationFailure;
            }
          }
        }
      } catch (error) {
        notificationOwner.deactivateForRollback();
        try {
          cleanupBatch.rollback('[web] resize binding rollback');
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            '[web] ResizeObserver 与 resize listener 回滚均失败。',
          );
        }
        throw error;
      }
      return notificationOwner.cleanup;
    },
    onShow: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('[web] show callback 必须是函数。');
      const cleanups: Array<() => void> = [];
      const cleanupBatch = new WebCleanupBatchOwner(cleanups);
      const notificationOwner = new WebNotificationBindingOwner({
        label: 'show',
        callback,
        condition: () => !env.documentObject.hidden,
        cleanupBatch,
      });
      try {
        listen(cleanups, env.documentObject, 'visibilitychange', notificationOwner.notify);
        listen(cleanups, env.windowObject, 'pageshow', notificationOwner.notify);
        listen(cleanups, env.windowObject, 'focus', notificationOwner.notify);
      } catch (error) {
        notificationOwner.deactivateForRollback();
        try {
          cleanupBatch.rollback('[web] show binding rollback');
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            '[web] show binding 注册失败且回滚不完整。',
          );
        }
        throw error;
      }
      return notificationOwner.cleanup;
    },
    onHide: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('[web] hide callback 必须是函数。');
      const cleanups: Array<() => void> = [];
      const cleanupBatch = new WebCleanupBatchOwner(cleanups);
      const notificationOwner = new WebNotificationBindingOwner({
        label: 'hide',
        callback,
        condition: () => Boolean(env.documentObject.hidden),
        cleanupBatch,
      });
      try {
        listen(cleanups, env.documentObject, 'visibilitychange', notificationOwner.notify);
        listen(
          cleanups,
          env.windowObject,
          'pagehide',
          notificationOwner.notifyUnconditionally,
        );
        listen(cleanups, env.windowObject, 'blur', notificationOwner.notifyUnconditionally);
      } catch (error) {
        notificationOwner.deactivateForRollback();
        try {
          cleanupBatch.rollback('[web] hide binding rollback');
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            '[web] hide binding 注册失败且回滚不完整。',
          );
        }
        throw error;
      }
      return notificationOwner.cleanup;
    },
    createAudio: mediaFactoryOwner.createAudio,
    vibrate: vibrationOwner.vibrate,
    storageGet: (key) => {
      const result = storageRead(key);
      return result.ok && result.found ? result.value : undefined;
    },
    storageSet: storageWrite,
    storageRemove: storageDelete,
    storageRead,
    storageWrite,
    storageDelete,
    share: shareOwner.share,
  });
}

export const WEB_PLATFORM_LISTENER_OPERATION_POLICY = Object.freeze({
  cleanupOwnerPublishesToBatchBeforeHostRegistration: true as const,
  eachListenerBindAndCleanupUsesMonotonicOperationOwner: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  addAndRemoveCallbacksCheckedBeforeOwnershipCommit: true as const,
  failedRegistrationRollsBackSameListenerIdentity: true as const,
  failedRemovalRetainsExactListenerOwnerForRetry: true as const,
  batchRollbackUsesReverseRegistrationOrder: true as const,
  resizeShowHideAndInputShareTheSameListenerBoundary: true as const,
  pointerMappingEventVocabularyAndCallbackOrderRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_RESIZE_OBSERVER_OPERATION_POLICY = Object.freeze({
  cleanupOwnerPublishesBeforeObserveInvocation: true as const,
  observeAndDisconnectUseMonotonicOperationOwner: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  observeAndDisconnectCallbacksCheckedBeforeOwnershipCommit: true as const,
  failedObserveRollsBackTheSameObserverIdentity: true as const,
  failedDisconnectRetainsExactObserverOwnerForBatchRetry: true as const,
  ordinaryObserveFailureKeepsWindowResizeFallback: true as const,
  observerRollbackFailureClosesTheWholeResizeBinding: true as const,
  viewportSizingNotificationAndFallbackBehaviorRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_CLEANUP_BATCH_OPERATION_POLICY = Object.freeze({
  inputResizeShowAndHideUseDedicatedCleanupBatchOwners: true as const,
  rollbackAndPublicCleanupUseMonotonicOperationOwner: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  childCleanupReturnsCheckedBeforeCrossOwnerProgress: true as const,
  ordinaryChildFailuresContinueIndependentReverseCleanup: true as const,
  reentrantChildFailureStopsCrossOwnerCleanup: true as const,
  successfulChildrenRemainIdempotentDuringRetry: true as const,
  batchCompletionPublishesOnlyAfterEveryChildConfirmsRelease: true as const,
  registrationOrderPublicCleanupAndEventBehaviorRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_POINTER_INPUT_OPERATION_POLICY = Object.freeze({
  pointerStartMoveEndCancelAndCleanupUseSingleOperationOwner: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  pointerIdGestureCaptureNormalizationAndCallbacksCheckedBeforeProgress: true as const,
  startFailureRollsBackPressedPointerAndCaptureHint: true as const,
  endAndCancelCommitPressedPointerRemovalBeforeCallback: true as const,
  eventCleanupRequestsDeferUntilCurrentEventClosure: true as const,
  cleanupClearsInputStateBeforeReverseBindingCleanup: true as const,
  callbackThenablesAndNestedEventsFailClosed: true as const,
  directionJumpPrimaryMappingAndPointerCoordinatesRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_NOTIFICATION_OPERATION_POLICY = Object.freeze({
  resizeShowAndHideEachUseSingleNotificationOwner: true as const,
  conditionalAndUnconditionalNotificationsUseMonotonicOperations: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  visibilityConditionAndCallbackCheckedBeforeProgress: true as const,
  callbackCleanupRequestsDeferUntilCurrentNotificationClosure: true as const,
  cleanupDeactivatesNotificationBeforeReverseBindingCleanup: true as const,
  callbackThenablesAndNestedNotificationsFailClosed: true as const,
  resizeObserverAndWindowResizeShareTheSameNotificationOwner: true as const,
  visibilityPageFocusBlurVocabularyAndConditionsRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_STORAGE_OPERATION_POLICY = Object.freeze({
  readWriteAndDeleteUseSingleStorageOperationOwner: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  hostCallbacksAndThenablesCheckedBeforeResultCommit: true as const,
  stringifyAccessorsCheckedBeforeSetItem: true as const,
  swallowedNestedStorageCallsFailTheOuterOperationClosed: true as const,
  readFailureReturnsNotOkAndMutationFailureReturnsFalse: true as const,
  storageKeysJsonShapeAndPublicResultSemanticsRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_VIEWPORT_OPERATION_POLICY = Object.freeze({
  eachViewportSnapshotUsesSingleReadOperationOwner: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  domCanvasReadsAndNumericCoercionsCheckedBeforeProgress: true as const,
  swallowedNestedViewportReadsFailTheOuterSnapshotClosed: true as const,
  canvasRectFailureKeepsTheExistingFallbackChain: true as const,
  rectCanvasWindowDocumentPriorityRemainsUnchanged: true as const,
  pixelRatioStillDefaultsToOneAndCapsAtTwo: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_ASSET_READ_OPERATION_POLICY = Object.freeze({
  eachAssetRequestUsesUniqueMonotonicIdentity: true as const,
  concurrentIndependentAssetRequestsRemainAllowed: true as const,
  fetchAndBytesStartAndSettlementUseFourOwnedSegments: true as const,
  eachSegmentRequiresTheExactPriorPhase: true as const,
  responsePortIsCapturedBeforeArrayBufferInvocation: true as const,
  onlyCompletedRequestMayPublishArrayBufferBytes: true as const,
  assetPathRestrictionAndArrayBufferContractRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_SHARE_OPERATION_POLICY = Object.freeze({
  pendingOwnerPublishesBeforeHostShareInvocation: true as const,
  oneShareRequestMayBePendingAtATime: true as const,
  startAndSettlementUseMonotonicOperations: true as const,
  stickySynchronousReentryFailsTheCurrentRequestClosed: true as const,
  concurrentDuplicateShareReturnsFalseWithoutReplacingOwner: true as const,
  staleSettlementCannotReleaseOrPublishANewerRequest: true as const,
  hostFailureAndMissingCapabilityStillReturnFalse: true as const,
  sharePayloadAndSuccessBooleanSemanticsRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_SYNC_HOST_OPERATION_POLICY = Object.freeze({
  performanceClockAndVibrationUseIndependentOperationOwners: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  performanceNowReturnAndThenableCheckedBeforePublication: true as const,
  clockFailureStillFallsBackToWallTime: true as const,
  vibrationReturnAndThenableCheckedBeforeSuccess: true as const,
  vibrationFailureAndMissingCapabilityStillReturnFalse: true as const,
  lightAndHeavyDurationsRemainEighteenAndFortyMilliseconds: true as const,
  frameSchedulerClockAndPublicNowShareTheSameOwner: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_MEDIA_FACTORY_OPERATION_POLICY = Object.freeze({
  imageAudioAndOffscreenCanvasUseSingleFactoryOwner: true as const,
  eachFactoryCallUsesMonotonicNamedOperation: true as const,
  stickyCrossFactoryReentryFailsTheOuterConstructionClosed: true as const,
  constructorsAndDomFallbacksCheckedBeforePublication: true as const,
  offscreenSizeNormalizationAndSizingCheckedBeforePublication: true as const,
  blockedOffscreenCanvasStillFallsBackToDomCanvas: true as const,
  imageAndAudioFailureStillReturnNull: true as const,
  canvasSizeRulesAndMediaFactoryVocabularyRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_MAIN_CANVAS_AND_WEBGL_OPERATION_POLICY = Object.freeze({
  mainCanvasCreationAndWebGlContextUseIndependentOwners: true as const,
  existingSelectedCanvasRemainsBorrowedAndIsNeverRemoved: true as const,
  fallbackRollbackPortCapturedBeforeAppendWhenAvailable: true as const,
  appendOrPreparationFailureUsesTheSameCandidateRollback: true as const,
  minimalHostsWithoutRemovalKeepLegacySuccessfulCreation: true as const,
  mainCanvasPublishesOnlyAfterPrepareCanvasCompletes: true as const,
  webGlContextPublishesOnlyAfterRequiredWebGl2Validation: true as const,
  webGl2AndValidatedLegacyTokenFallbackRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});

export const WEB_PLATFORM_WALL_CLOCK_OPERATION_POLICY = Object.freeze({
  wallClockUsesIndependentMonotonicReadOwner: true as const,
  dateNowPortIsCapturedOnceDuringPlatformConstruction: true as const,
  wallClockReturnAndThenableCheckedBeforePublication: true as const,
  publicWallNowAndPerformanceFallbackShareTheSameOwner: true as const,
  frameSchedulerAndPublicNowStillShareThePerformanceClockOwner: true as const,
  frameSchedulerTokenAndLegalCallbackRescheduleSemanticsRemainUnchanged: true as const,
  wallClockVocabularyAndMillisecondUnitsRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});
