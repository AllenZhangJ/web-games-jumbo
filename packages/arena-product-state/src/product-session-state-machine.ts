import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_SESSION_EVENT,
  PRODUCT_SESSION_STATE,
  type ProductSessionEvent,
  type ProductSessionState,
} from './product-session-transition-definition.js';
import {
  createProductSessionTransitionRegistry,
  type ProductSessionTransitionRegistry,
} from './product-session-transition-registry.js';

export const PRODUCT_SESSION_STATE_SNAPSHOT_SCHEMA_VERSION = 2;

export interface ProductSessionStateMachineOptions {
  readonly transitionRegistry?: ProductSessionTransitionRegistry | null;
}

export interface ProductSessionTransitionSnapshot {
  readonly revision: number;
  readonly eventId: ProductSessionEvent;
  readonly fromState: ProductSessionState;
  readonly toState: ProductSessionState;
  readonly activeFromState: ProductSessionState | null;
  readonly activeToState: ProductSessionState | null;
}

export interface ProductSessionStateSnapshot {
  readonly schemaVersion: 2;
  readonly revision: number;
  readonly state: ProductSessionState;
  readonly activeState: ProductSessionState | null;
  readonly resumeState: ProductSessionState | null;
  readonly recoveryState: ProductSessionState | null;
  readonly lastTransition: ProductSessionTransitionSnapshot | null;
}

const OPTION_KEYS = new Set(['transitionRegistry']);
const RECOVERY_STATES: ReadonlySet<unknown> = new Set([
  PRODUCT_SESSION_STATE.BOOT,
  PRODUCT_SESSION_STATE.READY,
  PRODUCT_SESSION_STATE.CHARACTER_SELECT,
  PRODUCT_SESSION_STATE.RESULTS,
  PRODUCT_SESSION_STATE.REWARD,
  PRODUCT_SESSION_STATE.UNLOCK,
]);

function readOptionalDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return undefined;
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function copyTransition(
  value: ProductSessionTransitionSnapshot | null,
): ProductSessionTransitionSnapshot | null {
  return value === null ? null : Object.freeze({ ...value });
}

function assertRecoveryState(value: unknown): ProductSessionState {
  if (!RECOVERY_STATES.has(value)) {
    throw new RangeError('ProductSessionStateMachine recoveryState 不受支持。');
  }
  return value as ProductSessionState;
}

export class ProductSessionStateMachine {
  readonly #registry: ProductSessionTransitionRegistry;
  #state: ProductSessionState;
  #resumeState: ProductSessionState | null;
  #recoveryState: ProductSessionState | null;
  #revision: number;
  #lastTransition: ProductSessionTransitionSnapshot | null;
  #transitioning: boolean;

  constructor(options?: ProductSessionStateMachineOptions);
  constructor(options?: unknown) {
    const source = options === undefined ? {} : options;
    assertKnownKeys(source, OPTION_KEYS, 'ProductSessionStateMachine options');
    const record = assertPlainRecord(source, 'ProductSessionStateMachine options');
    const transitionRegistry = readOptionalDataProperty(
      record,
      'transitionRegistry',
      'ProductSessionStateMachine options',
    ) ?? null;
    this.#registry = createProductSessionTransitionRegistry(transitionRegistry);
    this.#state = PRODUCT_SESSION_STATE.BOOT;
    this.#resumeState = null;
    this.#recoveryState = null;
    this.#revision = 0;
    this.#lastTransition = null;
    this.#transitioning = false;
    Object.freeze(this);
  }

  get state(): ProductSessionState {
    return this.#state;
  }

  get activeState(): ProductSessionState | null {
    if (this.#state === PRODUCT_SESSION_STATE.DESTROYED) return null;
    return this.#state === PRODUCT_SESSION_STATE.SUSPENDED
      ? this.#resumeState
      : this.#state;
  }

  #assertMutable(): void {
    if (this.#state === PRODUCT_SESSION_STATE.DESTROYED) {
      throw new Error('ProductSessionStateMachine 已销毁。');
    }
    if (this.#transitioning) {
      throw new Error('ProductSessionStateMachine 转换不可重入。');
    }
  }

  #record(
    eventId: ProductSessionEvent,
    values: Readonly<{
      visibleFrom: ProductSessionState;
      visibleTo: ProductSessionState;
      activeFrom: ProductSessionState | null;
      activeTo: ProductSessionState | null;
    }>,
  ): ProductSessionStateSnapshot {
    this.#revision += 1;
    this.#lastTransition = Object.freeze({
      revision: this.#revision,
      eventId,
      fromState: values.visibleFrom,
      toState: values.visibleTo,
      activeFromState: values.activeFrom,
      activeToState: values.activeTo,
    });
    return this.getSnapshot();
  }

  #run(callback: () => ProductSessionStateSnapshot): ProductSessionStateSnapshot {
    this.#assertMutable();
    this.#transitioning = true;
    try {
      return callback();
    } finally {
      this.#transitioning = false;
    }
  }

  dispatch(eventIdValue: unknown): ProductSessionStateSnapshot {
    const eventId = assertNonEmptyString(eventIdValue, 'ProductSession eventId') as ProductSessionEvent;
    return this.#run(() => {
      const visibleFrom = this.#state;
      const activeFrom = this.activeState;
      const definition = this.#registry.resolve(eventId, activeFrom);
      if (!definition) {
        throw new Error(`ProductSession 无法在 ${String(activeFrom)} 处理 ${eventId}。`);
      }
      if (visibleFrom === PRODUCT_SESSION_STATE.SUSPENDED) this.#resumeState = definition.toState;
      else this.#state = definition.toState;
      return this.#record(eventId, {
        visibleFrom,
        visibleTo: this.#state,
        activeFrom,
        activeTo: definition.toState,
      });
    });
  }

  suspend(): ProductSessionStateSnapshot {
    if (
      this.#state === PRODUCT_SESSION_STATE.DESTROYED
      || this.#state === PRODUCT_SESSION_STATE.SUSPENDED
      || this.#state === PRODUCT_SESSION_STATE.FATAL_ERROR
    ) return this.getSnapshot();
    return this.#run(() => {
      const visibleFrom = this.#state;
      this.#resumeState = this.#state;
      this.#state = PRODUCT_SESSION_STATE.SUSPENDED;
      return this.#record(PRODUCT_SESSION_EVENT.SUSPENDED, {
        visibleFrom,
        visibleTo: this.#state,
        activeFrom: visibleFrom,
        activeTo: this.#resumeState,
      });
    });
  }

  resume(): ProductSessionStateSnapshot {
    if (this.#state === PRODUCT_SESSION_STATE.DESTROYED) return this.getSnapshot();
    if (this.#state !== PRODUCT_SESSION_STATE.SUSPENDED) return this.getSnapshot();
    return this.#run(() => {
      const activeTo = this.#resumeState;
      if (activeTo === null) throw new Error('ProductSession 缺少 resumeState。');
      this.#state = activeTo;
      this.#resumeState = null;
      return this.#record(PRODUCT_SESSION_EVENT.RESUMED, {
        visibleFrom: PRODUCT_SESSION_STATE.SUSPENDED,
        visibleTo: this.#state,
        activeFrom: activeTo,
        activeTo,
      });
    });
  }

  failRecoverable(recoveryStateValue: unknown): ProductSessionStateSnapshot {
    const recoveryState = assertRecoveryState(recoveryStateValue);
    return this.#run(() => {
      if (this.activeState === PRODUCT_SESSION_STATE.FATAL_ERROR) {
        throw new Error('fatal-error 不能降级为 recoverable-error。');
      }
      const visibleFrom = this.#state;
      const activeFrom = this.activeState;
      this.#recoveryState = recoveryState;
      if (visibleFrom === PRODUCT_SESSION_STATE.SUSPENDED) {
        this.#resumeState = PRODUCT_SESSION_STATE.RECOVERABLE_ERROR;
      } else {
        this.#state = PRODUCT_SESSION_STATE.RECOVERABLE_ERROR;
      }
      return this.#record(PRODUCT_SESSION_EVENT.RECOVERABLE_FAILURE, {
        visibleFrom,
        visibleTo: this.#state,
        activeFrom,
        activeTo: PRODUCT_SESSION_STATE.RECOVERABLE_ERROR,
      });
    });
  }

  retry(): ProductSessionStateSnapshot {
    return this.#run(() => {
      if (this.activeState !== PRODUCT_SESSION_STATE.RECOVERABLE_ERROR) {
        throw new Error('只有 recoverable-error 可以重试。');
      }
      const visibleFrom = this.#state;
      const activeTo = this.#recoveryState;
      if (activeTo === null) throw new Error('ProductSession 缺少 recoveryState。');
      if (visibleFrom === PRODUCT_SESSION_STATE.SUSPENDED) this.#resumeState = activeTo;
      else this.#state = activeTo;
      this.#recoveryState = null;
      return this.#record(PRODUCT_SESSION_EVENT.RETRY_REQUESTED, {
        visibleFrom,
        visibleTo: this.#state,
        activeFrom: PRODUCT_SESSION_STATE.RECOVERABLE_ERROR,
        activeTo,
      });
    });
  }

  failFatal(): ProductSessionStateSnapshot {
    if (
      this.#state === PRODUCT_SESSION_STATE.DESTROYED
      || this.#state === PRODUCT_SESSION_STATE.FATAL_ERROR
    ) return this.getSnapshot();
    return this.#run(() => {
      const visibleFrom = this.#state;
      const activeFrom = this.activeState;
      this.#state = PRODUCT_SESSION_STATE.FATAL_ERROR;
      this.#resumeState = null;
      this.#recoveryState = null;
      return this.#record(PRODUCT_SESSION_EVENT.FATAL_FAILURE, {
        visibleFrom,
        visibleTo: this.#state,
        activeFrom,
        activeTo: this.#state,
      });
    });
  }

  destroy(): ProductSessionStateSnapshot {
    if (this.#state === PRODUCT_SESSION_STATE.DESTROYED) return this.getSnapshot();
    return this.#run(() => {
      const visibleFrom = this.#state;
      const activeFrom = this.activeState;
      this.#state = PRODUCT_SESSION_STATE.DESTROYED;
      this.#resumeState = null;
      this.#recoveryState = null;
      return this.#record(PRODUCT_SESSION_EVENT.DESTROY_REQUESTED, {
        visibleFrom,
        visibleTo: this.#state,
        activeFrom,
        activeTo: null,
      });
    });
  }

  getSnapshot(): ProductSessionStateSnapshot {
    return Object.freeze({
      schemaVersion: PRODUCT_SESSION_STATE_SNAPSHOT_SCHEMA_VERSION,
      revision: this.#revision,
      state: this.#state,
      activeState: this.activeState,
      resumeState: this.#resumeState,
      recoveryState: this.#recoveryState,
      lastTransition: copyTransition(this.#lastTransition),
    });
  }
}
