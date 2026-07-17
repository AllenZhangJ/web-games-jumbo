import { assertNonEmptyString } from '../../rules/definition-utils.js';
import {
  PRODUCT_SESSION_EVENT,
  PRODUCT_SESSION_STATE,
} from './product-session-transition-definition.js';
import { createProductSessionTransitionRegistry } from './product-session-transition-registry.js';

export const PRODUCT_SESSION_STATE_SNAPSHOT_SCHEMA_VERSION = 1;

const RECOVERY_STATES = new Set([
  PRODUCT_SESSION_STATE.BOOT,
  PRODUCT_SESSION_STATE.READY,
  PRODUCT_SESSION_STATE.CHARACTER_SELECT,
]);

function copyTransition(value) {
  return value === null ? null : Object.freeze({ ...value });
}

function assertRecoveryState(value) {
  if (!RECOVERY_STATES.has(value)) {
    throw new RangeError('ProductSessionStateMachine recoveryState 不受支持。');
  }
  return value;
}

export class ProductSessionStateMachine {
  #registry;
  #state;
  #resumeState;
  #recoveryState;
  #revision;
  #lastTransition;
  #transitioning;

  constructor({ transitionRegistry = null } = {}) {
    this.#registry = createProductSessionTransitionRegistry(transitionRegistry);
    this.#state = PRODUCT_SESSION_STATE.BOOT;
    this.#resumeState = null;
    this.#recoveryState = null;
    this.#revision = 0;
    this.#lastTransition = null;
    this.#transitioning = false;
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  get activeState() {
    if (this.#state === PRODUCT_SESSION_STATE.DESTROYED) return null;
    return this.#state === PRODUCT_SESSION_STATE.SUSPENDED
      ? this.#resumeState
      : this.#state;
  }

  #assertMutable() {
    if (this.#state === PRODUCT_SESSION_STATE.DESTROYED) {
      throw new Error('ProductSessionStateMachine 已销毁。');
    }
    if (this.#transitioning) {
      throw new Error('ProductSessionStateMachine 转换不可重入。');
    }
  }

  #record(eventId, {
    visibleFrom,
    visibleTo,
    activeFrom,
    activeTo,
  }) {
    this.#revision += 1;
    this.#lastTransition = Object.freeze({
      revision: this.#revision,
      eventId,
      fromState: visibleFrom,
      toState: visibleTo,
      activeFromState: activeFrom,
      activeToState: activeTo,
    });
    return this.getSnapshot();
  }

  #run(callback) {
    this.#assertMutable();
    this.#transitioning = true;
    try {
      return callback();
    } finally {
      this.#transitioning = false;
    }
  }

  dispatch(eventIdValue) {
    const eventId = assertNonEmptyString(eventIdValue, 'ProductSession eventId');
    return this.#run(() => {
      const visibleFrom = this.#state;
      const activeFrom = this.activeState;
      const definition = this.#registry.resolve(eventId, activeFrom);
      if (!definition) {
        throw new Error(`ProductSession 无法在 ${activeFrom} 处理 ${eventId}。`);
      }
      if (visibleFrom === PRODUCT_SESSION_STATE.SUSPENDED) {
        this.#resumeState = definition.toState;
      } else {
        this.#state = definition.toState;
      }
      return this.#record(eventId, {
        visibleFrom,
        visibleTo: this.#state,
        activeFrom,
        activeTo: definition.toState,
      });
    });
  }

  suspend() {
    if (this.#state === PRODUCT_SESSION_STATE.DESTROYED) return this.getSnapshot();
    if (this.#state === PRODUCT_SESSION_STATE.SUSPENDED) return this.getSnapshot();
    if (this.#state === PRODUCT_SESSION_STATE.FATAL_ERROR) return this.getSnapshot();
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

  resume() {
    if (this.#state === PRODUCT_SESSION_STATE.DESTROYED) return this.getSnapshot();
    if (this.#state !== PRODUCT_SESSION_STATE.SUSPENDED) return this.getSnapshot();
    return this.#run(() => {
      const activeTo = this.#resumeState;
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

  failRecoverable(recoveryStateValue) {
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

  retry() {
    return this.#run(() => {
      if (this.activeState !== PRODUCT_SESSION_STATE.RECOVERABLE_ERROR) {
        throw new Error('只有 recoverable-error 可以重试。');
      }
      const visibleFrom = this.#state;
      const activeTo = this.#recoveryState;
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

  failFatal() {
    if (this.#state === PRODUCT_SESSION_STATE.DESTROYED) return this.getSnapshot();
    if (this.#state === PRODUCT_SESSION_STATE.FATAL_ERROR) return this.getSnapshot();
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

  destroy() {
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

  getSnapshot() {
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
