import { normalizeThrownError } from '../../lifecycle-error.js';
import {
  PRODUCT_MATCH_COORDINATOR_STATE,
} from '../matchmaking/product-match-coordinator.js';
import {
  PlayerProfileSelectionPersistenceError,
} from '../profile/player-profile-selection-service.js';
import {
  PRODUCT_SESSION_EVENT,
  PRODUCT_SESSION_STATE,
} from '../state/product-session-transition-definition.js';
import {
  PRODUCT_SESSION_ERROR_CODE,
  createProductSessionCleanupFailure,
  createProductSessionPublicError,
} from '../state/product-session-error.js';
import {
  validateProductDiagnosticSink,
  validateProductMatchCoordinator,
  validateProductProfileService,
  validateProductSessionStateMachine,
} from './product-session-ports.js';

export const PRODUCT_SESSION_SNAPSHOT_SCHEMA_VERSION = 1;

export class ProductSessionController {
  #stateMachine;
  #profileService;
  #matchCoordinator;
  #diagnosticSink;
  #bootPromise;
  #matchRequestPromise;
  #profileSnapshot;
  #lastError;
  #destroying;
  #stepping;

  constructor({ stateMachine, profileService, matchCoordinator, diagnosticSink = null }) {
    this.#stateMachine = validateProductSessionStateMachine(stateMachine);
    this.#profileService = validateProductProfileService(profileService);
    this.#matchCoordinator = validateProductMatchCoordinator(matchCoordinator);
    this.#diagnosticSink = validateProductDiagnosticSink(diagnosticSink);
    this.#bootPromise = null;
    this.#matchRequestPromise = null;
    this.#profileSnapshot = null;
    this.#lastError = null;
    this.#destroying = false;
    this.#stepping = false;
    Object.freeze(this);
  }

  get state() {
    return this.#stateMachine.getSnapshot().state;
  }

  #report(type, error = null) {
    try {
      this.#diagnosticSink?.(Object.freeze({ type, error }));
    } catch {
      // Diagnostics are observational and never own product lifecycle.
    }
  }

  #assertForeground(expectedState) {
    const state = this.#stateMachine.getSnapshot();
    if (state.state === PRODUCT_SESSION_STATE.DESTROYED) {
      throw new Error('ProductSessionController 已销毁。');
    }
    if (state.state === PRODUCT_SESSION_STATE.SUSPENDED) {
      throw new Error('ProductSessionController 挂起时不能处理用户意图。');
    }
    if (state.activeState !== expectedState) {
      throw new Error(`ProductSession 需要 ${expectedState}，当前为 ${state.activeState}。`);
    }
    if (this.#destroying) throw new Error('ProductSessionController 正在销毁。');
    return state;
  }

  #recover(code, recoveryState, error) {
    const failure = normalizeThrownError(error, `ProductSession ${code}`);
    this.#report(code, failure);
    this.#lastError = createProductSessionPublicError(code);
    this.#stateMachine.failRecoverable(recoveryState);
    return this.getSnapshot();
  }

  #fatal(code, error) {
    const failure = normalizeThrownError(error, `ProductSession ${code}`);
    const cleanupErrors = [];
    try {
      this.#matchCoordinator.destroy();
    } catch (cleanupErrorValue) {
      cleanupErrors.push(normalizeThrownError(cleanupErrorValue, 'Product match 清理失败'));
    }
    const combined = cleanupErrors.length === 0
      ? failure
      : createProductSessionCleanupFailure([failure, ...cleanupErrors]);
    this.#report(code, combined);
    this.#lastError = createProductSessionPublicError(
      cleanupErrors.length === 0 ? code : PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED,
    );
    this.#stateMachine.failFatal();
    return this.getSnapshot();
  }

  #resetFailedMatchOrFatal(originalError, recoveryCode) {
    try {
      if (this.#matchCoordinator.state === PRODUCT_MATCH_COORDINATOR_STATE.FAILED) {
        this.#matchCoordinator.resetFailure();
      } else if (
        this.#matchCoordinator.state !== PRODUCT_MATCH_COORDINATOR_STATE.IDLE
        && this.#matchCoordinator.state !== PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED
      ) {
        this.#matchCoordinator.release();
      }
    } catch (cleanupErrorValue) {
      const combined = createProductSessionCleanupFailure([
        normalizeThrownError(originalError, recoveryCode),
        normalizeThrownError(cleanupErrorValue, 'Product match 恢复清理失败'),
      ]);
      return this.#fatal(PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED, combined);
    }
    return this.#recover(
      recoveryCode,
      PRODUCT_SESSION_STATE.CHARACTER_SELECT,
      originalError,
    );
  }

  boot() {
    const state = this.#stateMachine.getSnapshot();
    if (state.state === PRODUCT_SESSION_STATE.DESTROYED) {
      return Promise.reject(new Error('ProductSessionController 已销毁。'));
    }
    if (
      state.activeState === PRODUCT_SESSION_STATE.LOADING_PROFILE
      && this.#bootPromise
    ) return this.#bootPromise;
    if (
      state.activeState === PRODUCT_SESSION_STATE.READY
      || state.activeState === PRODUCT_SESSION_STATE.CHARACTER_SELECT
      || state.activeState === PRODUCT_SESSION_STATE.MATCHING
      || state.activeState === PRODUCT_SESSION_STATE.PREPARING
      || state.activeState === PRODUCT_SESSION_STATE.IN_MATCH
      || state.activeState === PRODUCT_SESSION_STATE.RESULTS
    ) return Promise.resolve(this.getSnapshot());
    this.#assertForeground(PRODUCT_SESSION_STATE.BOOT);
    this.#stateMachine.dispatch(PRODUCT_SESSION_EVENT.BOOT_REQUESTED);

    let operation;
    operation = Promise.resolve()
      .then(() => this.#profileService.open())
      .then((profile) => {
        if (this.state === PRODUCT_SESSION_STATE.DESTROYED) {
          try { this.#profileService.destroy(); } catch { /* retry remains available */ }
          return this.getSnapshot();
        }
        this.#profileSnapshot = profile;
        this.#lastError = null;
        this.#stateMachine.dispatch(PRODUCT_SESSION_EVENT.PROFILE_LOADED);
        return this.getSnapshot();
      })
      .catch((error) => {
        if (this.state === PRODUCT_SESSION_STATE.DESTROYED) return this.getSnapshot();
        return this.#recover(
          PRODUCT_SESSION_ERROR_CODE.PROFILE_LOAD_FAILED,
          PRODUCT_SESSION_STATE.BOOT,
          error,
        );
      })
      .finally(() => {
        if (this.#bootPromise === operation) this.#bootPromise = null;
      });
    this.#bootPromise = operation;
    return operation;
  }

  openCharacterSelect() {
    const state = this.#stateMachine.getSnapshot();
    if (
      state.state !== PRODUCT_SESSION_STATE.SUSPENDED
      && state.activeState === PRODUCT_SESSION_STATE.CHARACTER_SELECT
    ) return this.getSnapshot();
    this.#assertForeground(PRODUCT_SESSION_STATE.READY);
    this.#stateMachine.dispatch(PRODUCT_SESSION_EVENT.CHARACTER_SELECT_OPENED);
    return this.getSnapshot();
  }

  closeCharacterSelect() {
    const state = this.#stateMachine.getSnapshot();
    if (
      state.state !== PRODUCT_SESSION_STATE.SUSPENDED
      && state.activeState === PRODUCT_SESSION_STATE.READY
    ) return this.getSnapshot();
    this.#assertForeground(PRODUCT_SESSION_STATE.CHARACTER_SELECT);
    this.#stateMachine.dispatch(PRODUCT_SESSION_EVENT.CHARACTER_SELECT_CLOSED);
    return this.getSnapshot();
  }

  selectCharacter(characterId) {
    this.#assertForeground(PRODUCT_SESSION_STATE.CHARACTER_SELECT);
    try {
      this.#profileSnapshot = this.#profileService.selectCharacter(characterId);
      this.#lastError = null;
      return this.getSnapshot();
    } catch (error) {
      if (!(error instanceof PlayerProfileSelectionPersistenceError)) throw error;
      return this.#recover(
        PRODUCT_SESSION_ERROR_CODE.PROFILE_SAVE_FAILED,
        PRODUCT_SESSION_STATE.CHARACTER_SELECT,
        error,
      );
    }
  }

  requestMatch() {
    const current = this.#stateMachine.getSnapshot();
    if (
      current.activeState === PRODUCT_SESSION_STATE.MATCHING
      && this.#matchRequestPromise
    ) return this.#matchRequestPromise;
    this.#assertForeground(PRODUCT_SESSION_STATE.CHARACTER_SELECT);
    this.#stateMachine.dispatch(PRODUCT_SESSION_EVENT.MATCH_REQUESTED);

    let operation;
    operation = Promise.resolve()
      .then(() => this.#matchCoordinator.prepare())
      .then(() => {
        if (this.state === PRODUCT_SESSION_STATE.DESTROYED) return this.getSnapshot();
        const state = this.#stateMachine.getSnapshot();
        if (state.activeState !== PRODUCT_SESSION_STATE.MATCHING) {
          throw new Error('Product match 准备完成时产品状态已失配。');
        }
        if (state.state === PRODUCT_SESSION_STATE.SUSPENDED) {
          this.#matchCoordinator.setPaused(true);
        }
        this.#stateMachine.dispatch(PRODUCT_SESSION_EVENT.MATCH_PREPARED);
        this.#lastError = null;
        return this.getSnapshot();
      })
      .catch((error) => {
        if (this.state === PRODUCT_SESSION_STATE.DESTROYED) return this.getSnapshot();
        return this.#resetFailedMatchOrFatal(
          error,
          PRODUCT_SESSION_ERROR_CODE.MATCH_PREPARE_FAILED,
        );
      })
      .finally(() => {
        if (this.#matchRequestPromise === operation) this.#matchRequestPromise = null;
      });
    this.#matchRequestPromise = operation;
    return operation;
  }

  beginMatch() {
    this.#assertForeground(PRODUCT_SESSION_STATE.PREPARING);
    try {
      this.#matchCoordinator.start();
      this.#stateMachine.dispatch(PRODUCT_SESSION_EVENT.MATCH_STARTED);
      this.#lastError = null;
      return this.getSnapshot();
    } catch (error) {
      return this.#resetFailedMatchOrFatal(
        error,
        PRODUCT_SESSION_ERROR_CODE.MATCH_RUNTIME_FAILED,
      );
    }
  }

  stepMatch(playerFrame = null) {
    this.#assertForeground(PRODUCT_SESSION_STATE.IN_MATCH);
    if (this.#stepping) throw new Error('ProductSessionController.stepMatch() 不可重入。');
    this.#stepping = true;
    try {
      const matchStep = this.#matchCoordinator.step(playerFrame);
      if (matchStep.result !== null) {
        this.#stateMachine.dispatch(PRODUCT_SESSION_EVENT.MATCH_FINISHED);
      }
      return Object.freeze({ matchStep, productSnapshot: this.getSnapshot() });
    } catch (error) {
      const productSnapshot = this.#resetFailedMatchOrFatal(
        error,
        PRODUCT_SESSION_ERROR_CODE.MATCH_RUNTIME_FAILED,
      );
      return Object.freeze({ matchStep: null, productSnapshot });
    } finally {
      this.#stepping = false;
    }
  }

  dismissResults() {
    this.#assertForeground(PRODUCT_SESSION_STATE.RESULTS);
    try {
      this.#matchCoordinator.release();
      this.#stateMachine.dispatch(PRODUCT_SESSION_EVENT.RESULTS_DISMISSED);
      this.#lastError = null;
      return this.getSnapshot();
    } catch (error) {
      return this.#fatal(PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED, error);
    }
  }

  retry() {
    const state = this.#assertForeground(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
    const recoveryState = state.recoveryState;
    this.#stateMachine.retry();
    this.#lastError = null;
    if (recoveryState === PRODUCT_SESSION_STATE.BOOT) return this.boot();
    return Promise.resolve(this.getSnapshot());
  }

  hide() {
    if (this.state === PRODUCT_SESSION_STATE.DESTROYED) return this.getSnapshot();
    if (this.state === PRODUCT_SESSION_STATE.SUSPENDED) return this.getSnapshot();
    try {
      this.#stateMachine.suspend();
      this.#matchCoordinator.setPaused(true);
      return this.getSnapshot();
    } catch (error) {
      return this.#fatal(PRODUCT_SESSION_ERROR_CODE.LIFECYCLE_FAILED, error);
    }
  }

  show() {
    if (this.state === PRODUCT_SESSION_STATE.DESTROYED) return this.getSnapshot();
    if (this.state !== PRODUCT_SESSION_STATE.SUSPENDED) return this.getSnapshot();
    try {
      this.#matchCoordinator.setPaused(false);
      this.#stateMachine.resume();
      return this.getSnapshot();
    } catch (error) {
      return this.#fatal(PRODUCT_SESSION_ERROR_CODE.LIFECYCLE_FAILED, error);
    }
  }

  destroy() {
    if (this.#destroying) throw new Error('ProductSessionController.destroy() 不可重入。');
    if (this.#stepping) throw new Error('stepMatch() 期间不能销毁 ProductSessionController。');
    this.#destroying = true;
    this.#stateMachine.destroy();
    const errors = [];
    try {
      try {
        this.#matchCoordinator.destroy();
      } catch (error) {
        errors.push(normalizeThrownError(error, 'Product match 销毁失败'));
      }
      try {
        this.#profileService.destroy();
      } catch (error) {
        errors.push(normalizeThrownError(error, 'Product profile 销毁失败'));
      }
      this.#profileSnapshot = null;
      if (errors.length > 0) {
        this.#lastError = createProductSessionPublicError(PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED);
        const failure = createProductSessionCleanupFailure(errors);
        this.#report(PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED, failure);
        throw failure;
      }
      this.#lastError = null;
      return this.getSnapshot();
    } finally {
      this.#destroying = false;
    }
  }

  getSnapshot() {
    const state = this.#stateMachine.getSnapshot();
    return Object.freeze({
      schemaVersion: PRODUCT_SESSION_SNAPSHOT_SCHEMA_VERSION,
      state,
      profile: state.state === PRODUCT_SESSION_STATE.DESTROYED
        ? null
        : this.#profileSnapshot,
      match: this.#matchCoordinator.getSnapshot(),
      lastError: this.#lastError,
    });
  }
}
