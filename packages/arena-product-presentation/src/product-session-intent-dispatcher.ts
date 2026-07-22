import {
  PRODUCT_UI_INTENT_ID,
  createProductUiIntent,
  createProductUiIntentKey,
  type ProductUiIntent,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  PRODUCT_SESSION_STATE,
} from '@number-strategy-jump/arena-product-state';
import { ownOptions, rejectThenable, snapshotMethod } from './capability-utils.js';

const OPTION_KEYS = new Set(['controller']);

export interface ProductSessionControllerPresentationPort {
  boot(): unknown;
  openCharacterSelect(): unknown;
  closeCharacterSelect(): unknown;
  selectCharacter(characterDefinitionId: string): unknown;
  requestMatch(): unknown;
  requestRematch(): unknown;
  continueReward(): unknown;
  dismissUnlocks(): unknown;
  retry(): unknown;
  getSnapshot(): unknown;
}

interface ControllerAdapter extends ProductSessionControllerPresentationPort {
  readonly source: object;
}

function normalizeController(value: unknown): ControllerAdapter {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ProductSessionIntentDispatcher 需要 ProductSessionController。');
  }
  const method = (methodName: string): ((...args: unknown[]) => unknown) => (
    snapshotMethod(value, 'ProductSessionController', methodName)!
  );
  const boot = method('boot');
  const openCharacterSelect = method('openCharacterSelect');
  const closeCharacterSelect = method('closeCharacterSelect');
  const selectCharacter = method('selectCharacter');
  const requestMatch = method('requestMatch');
  const requestRematch = method('requestRematch');
  const continueReward = method('continueReward');
  const dismissUnlocks = method('dismissUnlocks');
  const retry = method('retry');
  const getSnapshot = method('getSnapshot');
  return Object.freeze({
    source: value,
    boot: () => boot(),
    openCharacterSelect: () => openCharacterSelect(),
    closeCharacterSelect: () => closeCharacterSelect(),
    selectCharacter: (id: string) => selectCharacter(id),
    requestMatch: () => requestMatch(),
    requestRematch: () => requestRematch(),
    continueReward: () => continueReward(),
    dismissUnlocks: () => dismissUnlocks(),
    retry: () => retry(),
    getSnapshot: () => {
      const snapshot = getSnapshot();
      rejectThenable(snapshot, 'ProductSessionController.getSnapshot()');
      return snapshot;
    },
  });
}

interface ActiveStateView {
  readonly state: string;
  readonly activeState: string | null;
}

function requiredData(value: object, field: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${field} 必须是数据字段。`);
  }
  return descriptor.value;
}

function stateData(snapshotValue: unknown): ActiveStateView {
  if (!snapshotValue || typeof snapshotValue !== 'object') {
    throw new TypeError('ProductSessionController snapshot 无效。');
  }
  const state = requiredData(snapshotValue, 'state', 'ProductSessionController snapshot');
  if (!state || typeof state !== 'object') {
    throw new TypeError('ProductSessionController snapshot.state 无效。');
  }
  const current = requiredData(state, 'state', 'ProductSessionController state');
  const active = requiredData(state, 'activeState', 'ProductSessionController state');
  if (typeof current !== 'string') {
    throw new TypeError('ProductSessionController state.state 必须是字符串。');
  }
  if (active !== null && typeof active !== 'string') {
    throw new TypeError('ProductSessionController state.activeState 必须是字符串或 null。');
  }
  return Object.freeze({ state: current, activeState: active as string | null });
}

function currentActiveState(controller: ControllerAdapter): string {
  const state = stateData(controller.getSnapshot());
  if (state.state !== PRODUCT_SESSION_STATE.SUSPENDED) return state.state;
  if (state.activeState === null) {
    throw new TypeError('ProductSessionController suspended state 缺少 activeState。');
  }
  return state.activeState;
}

export class ProductSessionIntentDispatcher {
  #controller: ControllerAdapter | null;
  #pending: Promise<unknown> | null = null;
  #pendingKey: string | null = null;
  #destroyed = false;

  constructor(optionsValue: { readonly controller: ProductSessionControllerPresentationPort }) {
    const options = ownOptions(
      optionsValue,
      OPTION_KEYS,
      'ProductSessionIntentDispatcher options',
    );
    this.#controller = normalizeController(options.controller);
    Object.freeze(this);
  }

  #perform(controller: ControllerAdapter, intent: ProductUiIntent): unknown {
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
        return controller.selectCharacter(intent.characterDefinitionId!);
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
        throw new RangeError('未实现 Product UI intent。');
    }
  }

  dispatch(intentValue: unknown): Promise<unknown> {
    if (this.#destroyed || this.#controller === null) {
      return Promise.reject(new Error('ProductSessionIntentDispatcher 已销毁。'));
    }
    const intent = createProductUiIntent(intentValue);
    const key = createProductUiIntentKey(intent);
    if (this.#pending !== null) {
      if (this.#pendingKey === key) return this.#pending;
      return Promise.reject(new Error('已有 Product UI intent 正在处理。'));
    }
    const controller = this.#controller;
    const operation: Promise<unknown> = Promise.resolve()
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

  getSnapshot(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      destroyed: this.#destroyed,
      pending: this.#pending !== null,
      pendingIntentKey: this.#pendingKey,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    if (this.#pending === null) this.#controller = null;
  }
}
