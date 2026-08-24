import { optionalMethod, rejectThenable } from './host-capability.js';

const WEB_TEARDOWN_STATE = Symbol.for('number-strategy-jump.web-teardown-state');

type Cleanup = () => void;
type Stop = (environment: unknown) => unknown;
type HostMethod = (...args: unknown[]) => unknown;
type WebGameTeardownOperation = 'bind' | 'cleanup' | 'pagehide';

function ownDataValue(owner: unknown, key: PropertyKey): unknown {
  if ((typeof owner !== 'object' || owner === null) && typeof owner !== 'function') return undefined;
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(owner, key);
  } catch {
    return undefined;
  }
  if (!descriptor) return undefined;
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new TypeError('Web teardown 宿主状态必须是数据字段。');
  }
  return descriptor.value;
}

function writeState(environment: object, value: Cleanup | null): void {
  if (value === null) {
    try {
      if (Reflect.deleteProperty(environment, WEB_TEARDOWN_STATE)) return;
    } catch { /* report the retained state below */ }
    throw new Error('Web teardown 无法释放宿主清理状态。');
  }
  try {
    Object.defineProperty(environment, WEB_TEARDOWN_STATE, {
      configurable: true,
      enumerable: false,
      value,
      writable: true,
    });
  } catch {
    throw new Error('Web teardown 无法持有宿主清理状态。');
  }
}

class WebGameTeardownOwner {
  readonly cleanup: Cleanup;
  readonly #environment: object;
  readonly #stop: Stop;
  readonly #addEventListener: HostMethod;
  readonly #removeEventListener: HostMethod;
  readonly #handler: (event: unknown) => void;
  #operation: WebGameTeardownOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;
  #observationDepth: number;
  #listenerOwned: boolean;
  #stateOwned: boolean;

  constructor(
    environment: object,
    stop: Stop,
    addEventListener: HostMethod,
    removeEventListener: HostMethod,
  ) {
    this.#environment = environment;
    this.#stop = stop;
    this.#addEventListener = addEventListener;
    this.#removeEventListener = removeEventListener;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    this.#observationDepth = 0;
    this.#listenerOwned = false;
    this.#stateOwned = false;
    this.#handler = (event: unknown): void => {
      try {
        this.#runOperation('pagehide', (sequence) => {
          let persisted = false;
          if ((typeof event === 'object' && event !== null) || typeof event === 'function') {
            try { persisted = Reflect.get(event, 'persisted') === true; } catch { return; }
          }
          this.#assertCurrentOperationCommit(
            sequence,
            'pagehide',
            'Web teardown pagehide event read',
          );
          if (persisted) return;
          try {
            this.#containObservation(() => {
              rejectThenable(this.#stop(this.#environment), 'Web teardown stop');
            });
          } catch {
            // A browser lifecycle callback cannot safely surface host cleanup errors.
          }
        });
      } catch {
        // A browser lifecycle callback cannot own teardown binding lifecycle.
      }
    };
    this.cleanup = (): void => {
      this.#runOperation('cleanup', (sequence) => {
        this.#cleanupOwned(sequence, 'cleanup', false);
      });
    };
  }

  #guardObservationReentry(operation: WebGameTeardownOperation): void {
    if (this.#observationDepth > 0) {
      throw new Error(`Web teardown observer期间不能执行${operation}。`);
    }
  }

  #guardReentry(operation: WebGameTeardownOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `Web teardown ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertOperationOwner(
    sequence: number,
    operation: WebGameTeardownOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前Web teardown operation所有权。`);
    }
  }

  #assertCurrentOperationCommit(
    sequence: number,
    operation: WebGameTeardownOperation,
    label: string,
  ): void {
    this.#assertOperationOwner(sequence, operation, label);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(
    operation: WebGameTeardownOperation,
    run: (sequence: number) => T,
  ): T {
    this.#guardObservationReentry(operation);
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
      this.#assertCurrentOperationCommit(sequence, operation, `Web teardown ${operation}`);
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
          `Web teardown ${operation}失败关闭且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #callChecked<T>(
    sequence: number,
    operation: WebGameTeardownOperation,
    callback: () => T,
    label: string,
  ): T {
    try {
      const result = callback();
      rejectThenable(result, label);
      this.#assertCurrentOperationCommit(sequence, operation, label);
      return result;
    } catch (error) {
      try {
        this.#assertCurrentOperationCommit(sequence, operation, label);
      } catch (reentryError) {
        if (error !== reentryError) {
          throw new AggregateError(
            [error, reentryError],
            `${label}失败且发生Web teardown重入。`,
          );
        }
        throw reentryError;
      }
      throw error;
    }
  }

  #callRollbackChecked<T>(
    sequence: number,
    operation: WebGameTeardownOperation,
    callback: () => T,
    label: string,
  ): T {
    const reentrySequence = this.#reentrySequence;
    const result = callback();
    rejectThenable(result, label);
    this.#assertOperationOwner(sequence, operation, label);
    if (this.#reentrySequence !== reentrySequence) {
      throw this.#reentryError ?? new Error(`${label}期间发生Web teardown重入。`);
    }
    return result;
  }

  #containObservation<T>(observe: () => T): T {
    const reentryError = this.#reentryError;
    this.#observationDepth += 1;
    try {
      return observe();
    } finally {
      this.#observationDepth -= 1;
      this.#reentryError = reentryError;
    }
  }

  #cleanupOwned(
    sequence: number,
    operation: WebGameTeardownOperation,
    rollback: boolean,
  ): void {
    const invoke = <T>(callback: () => T, label: string): T => (
      rollback
        ? this.#callRollbackChecked(sequence, operation, callback, label)
        : this.#callChecked(sequence, operation, callback, label)
    );
    if (this.#listenerOwned) {
      invoke(
        () => this.#removeEventListener('pagehide', this.#handler),
        'Web teardown removeEventListener',
      );
      this.#listenerOwned = false;
    }
    if (this.#stateOwned) {
      const currentCleanup = invoke(
        () => ownDataValue(this.#environment, WEB_TEARDOWN_STATE),
        'Web teardown state ownership read',
      );
      if (currentCleanup !== this.cleanup) {
        throw new Error('Web teardown 宿主清理状态在持有期间被替换。');
      }
      invoke(
        () => writeState(this.#environment, null),
        'Web teardown state release',
      );
      this.#stateOwned = false;
    }
  }

  bind(): Cleanup {
    return this.#runOperation('bind', (sequence) => {
      this.#callChecked(
        sequence,
        'bind',
        () => writeState(this.#environment, this.cleanup),
        'Web teardown state publication',
      );
      this.#stateOwned = true;
      this.#listenerOwned = true;
      try {
        this.#callChecked(
          sequence,
          'bind',
          () => this.#addEventListener('pagehide', this.#handler),
          'Web teardown addEventListener',
        );
      } catch (error) {
        try {
          this.#cleanupOwned(sequence, 'bind', true);
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            'Web teardown 绑定失败且回滚不完整。',
          );
        }
        throw error;
      }
      return this.cleanup;
    });
  }
}

export function bindWebGameTeardown(environment: unknown, stop: Stop): Cleanup {
  if ((typeof environment !== 'object' || environment === null)
    && typeof environment !== 'function') {
    throw new TypeError('bindWebGameTeardown 需要 Window 事件能力。');
  }
  if (typeof stop !== 'function') throw new TypeError('bindWebGameTeardown.stop 必须是函数。');
  const addEventListener = optionalMethod(environment, 'addEventListener');
  const removeEventListener = optionalMethod(environment, 'removeEventListener');
  if (!addEventListener || !removeEventListener) {
    throw new TypeError('bindWebGameTeardown 需要完整的 Window 事件能力。');
  }

  const staleCleanup = ownDataValue(environment, WEB_TEARDOWN_STATE);
  if (staleCleanup !== undefined && staleCleanup !== null) {
    if (typeof staleCleanup !== 'function') {
      throw new TypeError('Web teardown 宿主状态已损坏。');
    }
    staleCleanup();
  }
  return new WebGameTeardownOwner(
    environment,
    stop,
    addEventListener,
    removeEventListener,
  ).bind();
}

export const WEB_GAME_TEARDOWN_OPERATION_POLICY = Object.freeze({
  hostCleanupPublishesBeforeListenerRegistration: true as const,
  allBindingCleanupAndPagehideCallbacksUseSingleOperationOwner: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  hostCallbacksCheckedBeforeOwnershipPublicationOrRelease: true as const,
  failedRegistrationRollbackRetainsReachableCleanupDebt: true as const,
  failedRemovalRetainsExactListenerAndStateOwnersForRetry: true as const,
  staleCleanupCompletesBeforeReplacementBinding: true as const,
  pagehideStopObserverCannotOwnBindingLifecycle: true as const,
  bfcacheAndRealNavigationBehaviorRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});
