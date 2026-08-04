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
const NATIVE_PROMISE_THEN = Promise.prototype.then;

type SyncReturnInspection =
  | Readonly<{ kind: 'native-promise'; value: object }>
  | Readonly<{ kind: 'sync'; value: unknown }>;

function inspectSyncOrNativePromise(value: unknown, label: string): SyncReturnInspection {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    return { kind: 'sync', value };
  }
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    return { kind: 'native-promise', value: value as object };
  } catch {
    // Ordinary thenables have no Promise internal slot; never invoke their then.
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  let depth = 0;
  while (current !== null && depth < 32 && !visited.has(current)) {
    visited.add(current);
    depth += 1;
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${label} 返回了访问器 thenable。`);
      }
      if (typeof descriptor.value === 'function') {
        throw new TypeError(`${label} 返回了普通 thenable。`);
      }
      return { kind: 'sync', value };
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) throw new TypeError(`${label} 返回值原型链无效。`);
  return { kind: 'sync', value };
}

function resolveSyncOrNativePromise<T>(
  value: unknown,
  label: string,
): Promise<Readonly<{ value: T }>> {
  const inspected = inspectSyncOrNativePromise(value, label);
  if (inspected.kind === 'sync') {
    return Promise.resolve(Object.freeze({ value: inspected.value as T }));
  }
  return new Promise<Readonly<{ value: T }>>((resolve, reject) => {
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, inspected.value, [
        (resolved: unknown) => resolve(Object.freeze({ value: resolved as T })),
        (rejected: unknown) => reject(rejected),
      ]);
    } catch (error) {
      reject(error);
    }
  });
}

function observeNativePromise(value: unknown): boolean {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    return true;
  } catch {
    return false;
  }
}

function observedRejectedOperation(error: unknown): Promise<never> {
  observeNativePromise(error);
  const operation = Promise.reject(error);
  observeNativePromise(operation);
  return operation;
}

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

  #resolveControllerResult<T>(
    value: unknown,
    label: string,
  ): Promise<Readonly<{ value: T }>> {
    if (this.#pending !== null && value === this.#pending) {
      throw new Error(`${label} 不得自返回当前 pending operation。`);
    }
    return resolveSyncOrNativePromise<T>(value, label);
  }

  #perform(
    controller: ControllerAdapter,
    intent: ProductUiIntent,
  ): Promise<Readonly<{ value: unknown }>> {
    switch (intent.id) {
      case PRODUCT_UI_INTENT_ID.BOOT:
        return this.#resolveControllerResult(
          controller.boot(),
          'ProductSessionController.boot()',
        );
      case PRODUCT_UI_INTENT_ID.START_MATCH:
        if (currentActiveState(controller) !== PRODUCT_SESSION_STATE.READY) {
          throw new Error('start-match 只能从 ready 发起。');
        }
        return this.#resolveControllerResult(
          controller.openCharacterSelect(),
          'ProductSessionController.openCharacterSelect()',
        ).then(() => this.#resolveControllerResult(
          controller.requestMatch(),
          'ProductSessionController.requestMatch()',
        ));
      case PRODUCT_UI_INTENT_ID.OPEN_CHARACTER_SELECT:
        return this.#resolveControllerResult(
          controller.openCharacterSelect(),
          'ProductSessionController.openCharacterSelect()',
        );
      case PRODUCT_UI_INTENT_ID.CLOSE_CHARACTER_SELECT:
        return this.#resolveControllerResult(
          controller.closeCharacterSelect(),
          'ProductSessionController.closeCharacterSelect()',
        );
      case PRODUCT_UI_INTENT_ID.SELECT_CHARACTER:
        return this.#resolveControllerResult(
          controller.selectCharacter(intent.characterDefinitionId!),
          'ProductSessionController.selectCharacter()',
        );
      case PRODUCT_UI_INTENT_ID.REQUEST_MATCH:
        return this.#resolveControllerResult(
          controller.requestMatch(),
          'ProductSessionController.requestMatch()',
        );
      case PRODUCT_UI_INTENT_ID.REQUEST_REMATCH:
        return this.#resolveControllerResult(
          controller.requestRematch(),
          'ProductSessionController.requestRematch()',
        );
      case PRODUCT_UI_INTENT_ID.CONTINUE_REWARD:
        return this.#resolveControllerResult(
          controller.continueReward(),
          'ProductSessionController.continueReward()',
        );
      case PRODUCT_UI_INTENT_ID.DISMISS_UNLOCKS:
        return this.#resolveControllerResult(
          controller.dismissUnlocks(),
          'ProductSessionController.dismissUnlocks()',
        );
      case PRODUCT_UI_INTENT_ID.RETRY:
        return this.#resolveControllerResult(
          controller.retry(),
          'ProductSessionController.retry()',
        );
      default:
        throw new RangeError('未实现 Product UI intent。');
    }
  }

  dispatch(intentValue: unknown): Promise<unknown> {
    if (this.#destroyed || this.#controller === null) {
      return observedRejectedOperation(new Error('ProductSessionIntentDispatcher 已销毁。'));
    }
    let intent: ProductUiIntent;
    let key: string;
    try {
      intent = createProductUiIntent(intentValue);
      key = createProductUiIntentKey(intent);
    } catch (error) {
      observeNativePromise(error);
      throw error;
    }
    if (this.#pending !== null) {
      if (this.#pendingKey === key) return this.#pending;
      return observedRejectedOperation(new Error('已有 Product UI intent 正在处理。'));
    }
    const controller = this.#controller;
    const operation: Promise<unknown> = Promise.resolve()
      .then(() => this.#perform(controller, intent))
      .then(({ value: snapshot }) => snapshot ?? controller.getSnapshot())
      .catch((error: unknown) => {
        observeNativePromise(error);
        throw error;
      })
      .finally(() => {
        if (this.#pending === operation) {
          this.#pending = null;
          this.#pendingKey = null;
          if (this.#destroyed) this.#controller = null;
        }
      });
    this.#pendingKey = key;
    this.#pending = operation;
    observeNativePromise(operation);
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
