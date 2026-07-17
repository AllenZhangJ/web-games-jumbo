import { PRODUCT_SESSION_STATE } from '../../product/state/product-session-transition-definition.js';
import {
  PRODUCT_UI_INTENT_ID,
  createProductUiIntent,
  createProductUiIntentKey,
} from './product-ui-intent.js';

function validateController(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductSessionIntentDispatcher 需要 ProductSessionController。');
  }
  for (const method of [
    'boot',
    'openCharacterSelect',
    'closeCharacterSelect',
    'selectCharacter',
    'requestMatch',
    'requestRematch',
    'continueReward',
    'dismissUnlocks',
    'retry',
    'getSnapshot',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`ProductSessionController 缺少 ${method}()。`);
    }
  }
  return value;
}

function currentActiveState(controller) {
  const state = controller.getSnapshot().state;
  return state.state === PRODUCT_SESSION_STATE.SUSPENDED
    ? state.activeState
    : state.state;
}

export class ProductSessionIntentDispatcher {
  #controller;
  #pending;
  #pendingKey;
  #destroyed;

  constructor({ controller }) {
    this.#controller = validateController(controller);
    this.#pending = null;
    this.#pendingKey = null;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #perform(controller, intent) {
    switch (intent.id) {
      case PRODUCT_UI_INTENT_ID.BOOT:
        return controller.boot();
      case PRODUCT_UI_INTENT_ID.START_MATCH:
        if (currentActiveState(controller) !== PRODUCT_SESSION_STATE.READY) {
          throw new Error('start-match 只能从 ready 发起。');
        }
        controller.openCharacterSelect();
        return controller.requestMatch();
      case PRODUCT_UI_INTENT_ID.OPEN_CHARACTER_SELECT:
        return controller.openCharacterSelect();
      case PRODUCT_UI_INTENT_ID.CLOSE_CHARACTER_SELECT:
        return controller.closeCharacterSelect();
      case PRODUCT_UI_INTENT_ID.SELECT_CHARACTER:
        return controller.selectCharacter(intent.characterDefinitionId);
      case PRODUCT_UI_INTENT_ID.REQUEST_MATCH:
        return controller.requestMatch();
      case PRODUCT_UI_INTENT_ID.REQUEST_REMATCH:
        return controller.requestRematch();
      case PRODUCT_UI_INTENT_ID.CONTINUE_REWARD:
        return controller.continueReward();
      case PRODUCT_UI_INTENT_ID.DISMISS_UNLOCKS:
        return controller.dismissUnlocks();
      case PRODUCT_UI_INTENT_ID.RETRY:
        return controller.retry();
      default:
        throw new RangeError(`未实现 Product UI intent ${intent.id}。`);
    }
  }

  dispatch(intentValue) {
    if (this.#destroyed) {
      return Promise.reject(new Error('ProductSessionIntentDispatcher 已销毁。'));
    }
    const intent = createProductUiIntent(intentValue);
    const key = createProductUiIntentKey(intent);
    if (this.#pending !== null) {
      if (this.#pendingKey === key) return this.#pending;
      return Promise.reject(new Error('已有 Product UI intent 正在处理。'));
    }
    const controller = this.#controller;
    let operation;
    operation = Promise.resolve()
      .then(() => this.#perform(controller, intent))
      .then((snapshot) => snapshot ?? controller.getSnapshot())
      .finally(() => {
        if (this.#pending === operation) {
          this.#pending = null;
          this.#pendingKey = null;
          if (this.#destroyed) this.#controller = null;
        }
      });
    this.#pendingKey = key;
    this.#pending = operation;
    return operation;
  }

  getSnapshot() {
    return Object.freeze({
      destroyed: this.#destroyed,
      pending: this.#pending !== null,
      pendingIntentKey: this.#pendingKey,
    });
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    if (this.#pending === null) this.#controller = null;
  }
}
