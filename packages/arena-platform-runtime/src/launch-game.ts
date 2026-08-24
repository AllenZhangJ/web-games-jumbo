import { isThenable, optionalMethod } from './host-capability.js';

const STARTUP_STATE = Symbol.for('number-strategy-jump.startup-state');
const COORDINATOR_BRAND = Symbol.for('number-strategy-jump.startup-coordinator.v2');
const OWNED_GAME_BRAND = Symbol.for('number-strategy-jump.owned-startup-game.v2');
const EXPOSED_GAME = '__NUMBER_STRATEGY_GAME__';

type UnknownCallback = (...args: unknown[]) => unknown;

interface OwnedGame {
  readonly brand: typeof OWNED_GAME_BRAND;
  readonly game: object;
  readonly destroy: () => unknown;
  readonly start: () => unknown;
  destroyed: boolean;
}

interface StartupCoordinator {
  readonly brand: typeof COORDINATOR_BRAND;
  generation: number;
  current: OwnedGame | null;
  starting: OwnedGame | null;
  pendingCleanup: OwnedGame[];
  operation: StartupCoordinatorOperation | null;
  operationSequence: number;
  reentrySequence: number;
  reentryError: Error | null;
  observationDepth: number;
  /** Kept only for same-page migration from the pre-operation coordinator. */
  transitioning: boolean;
}

type StartupCoordinatorOperation =
  | 'begin-generation'
  | 'platform-launch'
  | 'candidate-adoption'
  | 'start-launch'
  | 'start-settlement'
  | 'failure-publication'
  | 'retire-record';

const STARTUP_COORDINATOR_OPERATIONS = new Set<StartupCoordinatorOperation>([
  'begin-generation',
  'platform-launch',
  'candidate-adoption',
  'start-launch',
  'start-settlement',
  'failure-publication',
  'retire-record',
]);

interface ParsedLaunchOptions {
  readonly root: object;
  readonly createGame: UnknownCallback | null;
  readonly gameOptions: unknown;
  readonly onError: UnknownCallback | null;
  readonly onSuccess: UnknownCallback | null;
}

const OPTION_KEYS = new Set(['root', 'createGame', 'gameOptions', 'onError', 'onSuccess']);

function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function ownDataEntries(value: unknown, label: string): Map<string, unknown> {
  if (!isObject(value) || Array.isArray(value)) throw new TypeError(`${label} 必须是对象。`);
  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch (error) {
    throw new TypeError(`${label} 无法读取。`, { cause: error });
  }
  const entries = new Map<string, unknown>();
  for (const key of keys) {
    if (typeof key !== 'string' || !OPTION_KEYS.has(key)) {
      throw new TypeError(`${label} 包含未知字段 ${String(key)}。`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (error) {
      throw new TypeError(`${label}.${key} 无法读取。`, { cause: error });
    }
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${label}.${key} 必须是数据字段。`);
    }
    entries.set(key, descriptor.value);
  }
  return entries;
}

function parseLaunchOptions(value: unknown): ParsedLaunchOptions {
  const entries = ownDataEntries(value ?? {}, 'launchGame options');
  const rootValue = entries.has('root') ? entries.get('root') : globalThis;
  if (!isObject(rootValue)) throw new TypeError('launchGame.root 必须是对象。');
  const createGame = entries.get('createGame');
  const onError = entries.get('onError');
  const onSuccess = entries.get('onSuccess');
  if (createGame !== undefined && typeof createGame !== 'function') {
    throw new TypeError('launchGame.createGame 必须是函数。');
  }
  if (onError !== undefined && typeof onError !== 'function') {
    throw new TypeError('launchGame.onError 必须是函数。');
  }
  if (onSuccess !== undefined && typeof onSuccess !== 'function') {
    throw new TypeError('launchGame.onSuccess 必须是函数。');
  }
  return Object.freeze({
    root: rootValue,
    createGame: (createGame as UnknownCallback | undefined) ?? null,
    gameOptions: entries.get('gameOptions'),
    onError: (onError as UnknownCallback | undefined) ?? null,
    onSuccess: (onSuccess as UnknownCallback | undefined) ?? null,
  });
}

function createCoordinator(): StartupCoordinator {
  const state = {} as StartupCoordinator;
  Object.defineProperties(state, {
    brand: { enumerable: false, value: COORDINATOR_BRAND, writable: false },
    generation: { enumerable: true, value: 0, writable: true },
    current: { enumerable: true, value: null, writable: true },
    starting: { enumerable: true, value: null, writable: true },
    pendingCleanup: { enumerable: true, value: [], writable: true },
    operation: { enumerable: true, value: null, writable: true },
    operationSequence: { enumerable: true, value: 0, writable: true },
    reentrySequence: { enumerable: true, value: 0, writable: true },
    reentryError: { enumerable: true, value: null, writable: true },
    observationDepth: { enumerable: true, value: 0, writable: true },
    transitioning: { enumerable: true, value: false, writable: true },
  });
  return state;
}

function requiredOwnDataValue(owner: unknown, key: PropertyKey): unknown {
  if (!isObject(owner)) return undefined;
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(owner, key);
  } catch {
    return undefined;
  }
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) return undefined;
  return descriptor.value;
}

function hasOwnDataField(owner: unknown, key: PropertyKey): boolean {
  if (!isObject(owner)) return false;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    return descriptor !== undefined && Object.hasOwn(descriptor, 'value');
  } catch {
    return false;
  }
}

function isOwnedGame(value: unknown): value is OwnedGame {
  return isObject(value)
    && requiredOwnDataValue(value, 'brand') === OWNED_GAME_BRAND
    && isObject(requiredOwnDataValue(value, 'game'))
    && typeof requiredOwnDataValue(value, 'start') === 'function'
    && typeof requiredOwnDataValue(value, 'destroy') === 'function'
    && typeof requiredOwnDataValue(value, 'destroyed') === 'boolean';
}

function validateCoordinator(value: unknown): StartupCoordinator {
  if (!isObject(value)) throw new TypeError('launchGame 宿主协调状态已损坏。');
  const brand = requiredOwnDataValue(value, 'brand');
  const generation = requiredOwnDataValue(value, 'generation');
  const current = requiredOwnDataValue(value, 'current');
  const starting = requiredOwnDataValue(value, 'starting');
  const pendingCleanup = requiredOwnDataValue(value, 'pendingCleanup');
  const transitioning = requiredOwnDataValue(value, 'transitioning');
  let operation = requiredOwnDataValue(value, 'operation');
  let operationSequence = requiredOwnDataValue(value, 'operationSequence');
  let reentrySequence = requiredOwnDataValue(value, 'reentrySequence');
  let reentryError = requiredOwnDataValue(value, 'reentryError');
  let observationDepth = requiredOwnDataValue(value, 'observationDepth');
  if (brand !== COORDINATOR_BRAND
    || !Number.isSafeInteger(generation)
    || (generation as number) < 0
    || (current !== null && !isOwnedGame(current))
    || (starting !== null && !isOwnedGame(starting))
    || !Array.isArray(pendingCleanup)
    || !pendingCleanup.every(isOwnedGame)
    || new Set(pendingCleanup).size !== pendingCleanup.length
    || pendingCleanup.some((record) => requiredOwnDataValue(record, 'destroyed') !== false)
    || (current !== null && current === starting)
    || (current !== null && pendingCleanup.includes(current))
    || (starting !== null && pendingCleanup.includes(starting))
    || transitioning !== false) {
    throw new TypeError('launchGame 宿主协调状态已损坏。');
  }
  const legacyOperationState = operation === undefined
    && operationSequence === undefined
    && reentrySequence === undefined
    && reentryError === undefined
    && observationDepth === undefined;
  if (legacyOperationState) {
    try {
      Object.defineProperties(value, {
        operation: { enumerable: true, value: null, writable: true },
        operationSequence: { enumerable: true, value: 0, writable: true },
        reentrySequence: { enumerable: true, value: 0, writable: true },
        reentryError: { enumerable: true, value: null, writable: true },
        observationDepth: { enumerable: true, value: 0, writable: true },
      });
    } catch (error) {
      throw new TypeError('launchGame 无法升级旧宿主协调状态。', { cause: error });
    }
    operation = null;
    operationSequence = 0;
    reentrySequence = 0;
    reentryError = null;
    observationDepth = 0;
  }
  if (
    (operation !== null && (
      typeof operation !== 'string'
      || !STARTUP_COORDINATOR_OPERATIONS.has(operation as StartupCoordinatorOperation)
    ))
    || !Number.isSafeInteger(operationSequence)
    || (operationSequence as number) < 0
    || !Number.isSafeInteger(reentrySequence)
    || (reentrySequence as number) < 0
    || (reentryError !== null && !isObject(reentryError))
    || !Number.isSafeInteger(observationDepth)
    || (observationDepth as number) < 0
  ) {
    throw new TypeError('launchGame 宿主协调operation状态已损坏。');
  }
  return value as unknown as StartupCoordinator;
}

function createLegacyOwnedGame(candidate: unknown): OwnedGame {
  if (!isObject(candidate)) throw new TypeError('旧启动协调器持有无效游戏对象。');
  const destroy = optionalMethod(candidate, 'destroy');
  if (!destroy) throw new TypeError('旧启动协调器游戏缺少同步 destroy 方法。');
  const start = optionalMethod(candidate, 'start') ?? (() => undefined);
  const record = {} as OwnedGame;
  Object.defineProperties(record, {
    brand: { enumerable: false, value: OWNED_GAME_BRAND, writable: false },
    game: { enumerable: true, value: candidate, writable: false },
    destroy: { enumerable: false, value: destroy, writable: false },
    start: { enumerable: false, value: start, writable: false },
    destroyed: { enumerable: true, value: false, writable: true },
  });
  return record;
}

function migrateLegacyCoordinator(root: object, value: unknown): StartupCoordinator {
  if (!isObject(value)) throw new TypeError('launchGame 旧宿主协调状态已损坏。');
  const generation = requiredOwnDataValue(value, 'generation');
  const legacyGame = requiredOwnDataValue(value, 'game');
  const legacyStarting = requiredOwnDataValue(value, 'starting');
  if (!Number.isSafeInteger(generation) || (generation as number) < 0) {
    throw new TypeError('launchGame 旧宿主协调状态已损坏。');
  }
  const state = createCoordinator();
  state.generation = generation as number;
  for (const candidate of [legacyGame, legacyStarting]) {
    if (candidate === null || candidate === undefined) continue;
    if (state.pendingCleanup.some((record) => record.game === candidate)) continue;
    state.pendingCleanup.push(createLegacyOwnedGame(candidate));
  }
  try {
    Object.defineProperty(root, STARTUP_STATE, {
      configurable: false,
      enumerable: false,
      value: state,
      writable: false,
    });
  } catch (error) {
    throw new TypeError('launchGame 无法接管旧宿主协调状态。', { cause: error });
  }
  return state;
}

function coordinator(root: object): StartupCoordinator {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(root, STARTUP_STATE);
  } catch (error) {
    throw new TypeError('launchGame 无法读取宿主协调状态。', { cause: error });
  }
  if (descriptor) {
    if (!Object.hasOwn(descriptor, 'value')) {
      throw new TypeError('launchGame 宿主协调状态必须是数据字段。');
    }
    try {
      return validateCoordinator(descriptor.value);
    } catch (error) {
      if (requiredOwnDataValue(descriptor.value, 'brand') === undefined
        && hasOwnDataField(descriptor.value, 'generation')
        && hasOwnDataField(descriptor.value, 'game')
        && hasOwnDataField(descriptor.value, 'starting')
        && !hasOwnDataField(descriptor.value, 'current')
        && !hasOwnDataField(descriptor.value, 'pendingCleanup')) {
        return migrateLegacyCoordinator(root, descriptor.value);
      }
      throw error;
    }
  }
  const state = createCoordinator();
  try {
    Object.defineProperty(root, STARTUP_STATE, {
      configurable: false,
      enumerable: false,
      value: state,
      writable: false,
    });
  } catch (error) {
    throw new TypeError('launchGame 无法持有宿主协调状态。', { cause: error });
  }
  return state;
}

function ownDataValue(owner: object, key: string): unknown {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(owner, key);
  } catch {
    return undefined;
  }
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) return undefined;
  return descriptor.value;
}

function exposeGame(root: object, game: object | null): void {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(root, EXPOSED_GAME);
  } catch {
    return;
  }
  try {
    if (!descriptor) {
      Object.defineProperty(root, EXPOSED_GAME, {
        configurable: true,
        enumerable: false,
        value: game,
        writable: true,
      });
      return;
    }
    if (Object.hasOwn(descriptor, 'value') && descriptor.writable === true) {
      Reflect.set(root, EXPOSED_GAME, game);
    }
  } catch {
    // Debug exposure is optional and cannot decide startup success.
  }
}

function createOwnedGame(candidate: unknown): OwnedGame {
  if (!isObject(candidate)) throw new TypeError('createGame 必须返回游戏对象。');
  const destroy = optionalMethod(candidate, 'destroy');
  if (!destroy) throw new TypeError('createGame 返回值缺少同步 destroy 方法。');
  const start = optionalMethod(candidate, 'start');
  if (!start) {
    try {
      const result = destroy();
      if (isThenable(result)) throw new TypeError('游戏 destroy 不得返回异步 thenable。');
    } catch (cleanupError) {
      throw new AggregateError([
        new TypeError('createGame 返回值缺少 start 方法。'),
        cleanupError,
      ], '无效游戏候选清理失败。');
    }
    throw new TypeError('createGame 返回值缺少 start 方法。');
  }
  const record = {} as OwnedGame;
  Object.defineProperties(record, {
    brand: { enumerable: false, value: OWNED_GAME_BRAND, writable: false },
    game: { enumerable: true, value: candidate, writable: false },
    destroy: { enumerable: false, value: destroy, writable: false },
    start: { enumerable: false, value: start, writable: false },
    destroyed: { enumerable: true, value: false, writable: true },
  });
  return record;
}

function guardCoordinatorObservation(
  state: StartupCoordinator,
  operation: StartupCoordinatorOperation,
): void {
  if (state.observationDepth > 0) {
    throw new Error(`launchGame observer期间不能执行${operation}。`);
  }
}

function guardCoordinatorReentry(
  state: StartupCoordinator,
  operation: StartupCoordinatorOperation,
): void {
  if (state.operation === null) return;
  state.reentrySequence += 1;
  state.reentryError ??= new Error(
    `launchGame ${state.operation}期间拒绝${operation}重入。`,
  );
  throw state.reentryError;
}

function assertCoordinatorOwner(
  state: StartupCoordinator,
  sequence: number,
  operation: StartupCoordinatorOperation,
  label: string,
): void {
  if (state.operation !== operation || state.operationSequence !== sequence) {
    throw new Error(`${label}缺少当前launchGame operation所有权。`);
  }
}

function assertCoordinatorCommit(
  state: StartupCoordinator,
  sequence: number,
  operation: StartupCoordinatorOperation,
  label: string,
): void {
  assertCoordinatorOwner(state, sequence, operation, label);
  if (state.reentryError !== null) throw state.reentryError;
}

function runCoordinatorOperation<T>(
  state: StartupCoordinator,
  operation: StartupCoordinatorOperation,
  run: (sequence: number) => T,
): T {
  guardCoordinatorObservation(state, operation);
  guardCoordinatorReentry(state, operation);
  state.operation = operation;
  state.operationSequence += 1;
  const sequence = state.operationSequence;
  state.reentryError = null;
  let result!: T;
  let failure: unknown = null;
  let failed = false;
  try {
    result = run(sequence);
    assertCoordinatorCommit(state, sequence, operation, `launchGame ${operation}`);
  } catch (error) {
    failed = true;
    failure = error;
  } finally {
    const reentryError = state.reentryError;
    state.operation = null;
    state.reentryError = null;
    if (reentryError !== null && failure !== reentryError) {
      throw new AggregateError(
        failed ? [failure, reentryError] : [reentryError],
        `launchGame ${operation}失败关闭且发生同步重入。`,
      );
    }
  }
  if (failed) throw failure;
  return result;
}

function callCoordinatorChecked<T>(
  state: StartupCoordinator,
  sequence: number,
  operation: StartupCoordinatorOperation,
  callback: () => T,
  label: string,
  allowThenable = false,
): T {
  try {
    const result = callback();
    if (!allowThenable && isThenable(result)) {
      throw new TypeError(`${label} 不得返回异步 thenable。`);
    }
    assertCoordinatorCommit(state, sequence, operation, label);
    return result;
  } catch (error) {
    try {
      assertCoordinatorCommit(state, sequence, operation, label);
    } catch (reentryError) {
      if (error !== reentryError) {
        throw new AggregateError(
          [error, reentryError],
          `${label}失败且发生launchGame重入。`,
        );
      }
      throw reentryError;
    }
    throw error;
  }
}

function containCoordinatorObservation<T>(state: StartupCoordinator, observe: () => T): T {
  const reentryError = state.reentryError;
  state.observationDepth += 1;
  try {
    return observe();
  } finally {
    state.observationDepth -= 1;
    state.reentryError = reentryError;
  }
}

function destroyOwnedChecked(
  state: StartupCoordinator,
  sequence: number,
  operation: StartupCoordinatorOperation,
  record: OwnedGame,
): void {
  if (record.destroyed) return;
  callCoordinatorChecked(
    state,
    sequence,
    operation,
    () => record.destroy(),
    'launchGame game.destroy()',
  );
  record.destroyed = true;
}

function callNonCritical(
  state: StartupCoordinator | null,
  callback: UnknownCallback | null,
  value: unknown,
): void {
  if (!callback) return;
  try {
    const result = state === null
      ? callback(value)
      : containCoordinatorObservation(state, () => callback(value));
    if (isThenable(result)) return;
  } catch {
    // Host diagnostics and UI callbacks cannot own the game lifecycle.
  }
}

function addUnique(records: OwnedGame[], record: OwnedGame | null): void {
  if (record && !records.includes(record)) records.push(record);
}

function cleanupRecords(
  state: StartupCoordinator,
  sequence: number,
  operation: StartupCoordinatorOperation,
  records: readonly OwnedGame[],
): Error[] {
  const errors: Error[] = [];
  let index = 0;
  for (; index < records.length; index += 1) {
    const record = records[index]!;
    try {
      destroyOwnedChecked(state, sequence, operation, record);
    } catch (error) {
      if (!state.pendingCleanup.includes(record)) state.pendingCleanup.push(record);
      errors.push(error instanceof Error ? error : new Error(String(error)));
      if (state.reentryError !== null) {
        index += 1;
        break;
      }
    }
  }
  for (; index < records.length; index += 1) {
    const record = records[index]!;
    if (!record.destroyed && !state.pendingCleanup.includes(record)) {
      state.pendingCleanup.push(record);
    }
  }
  state.pendingCleanup = state.pendingCleanup.filter((record) => !record.destroyed);
  return errors;
}

function beginGeneration(root: object, state: StartupCoordinator): { generation: number; error: Error | null } {
  return runCoordinatorOperation(state, 'begin-generation', (sequence) => {
    state.generation = state.generation >= Number.MAX_SAFE_INTEGER ? 1 : state.generation + 1;
    const records: OwnedGame[] = [...state.pendingCleanup];
    addUnique(records, state.current);
    addUnique(records, state.starting);
    const exposed = ownDataValue(root, EXPOSED_GAME);
    assertCoordinatorCommit(
      state,
      sequence,
      'begin-generation',
      'launchGame exposed game read',
    );
    if (isObject(exposed)
      && !records.some((record) => record.game === exposed)) {
      try { records.push(createOwnedGame(exposed)); } catch { /* optional legacy debug exposure */ }
    }
    assertCoordinatorCommit(
      state,
      sequence,
      'begin-generation',
      'launchGame legacy exposed game capture',
    );
    state.current = null;
    state.starting = null;
    state.pendingCleanup = records.filter((record) => !record.destroyed);
    exposeGame(root, null);
    assertCoordinatorCommit(
      state,
      sequence,
      'begin-generation',
      'launchGame exposed game clear',
    );
    const errors = cleanupRecords(state, sequence, 'begin-generation', records);
    return {
      generation: state.generation,
      error: errors.length === 0
        ? null
        : new AggregateError(errors, '旧游戏资源清理未完成，拒绝启动替换实例。'),
    };
  });
}

function retireRecord(state: StartupCoordinator, record: OwnedGame): Error | null {
  try {
    return runCoordinatorOperation(state, 'retire-record', (sequence) => {
      if (state.current === record) state.current = null;
      if (state.starting === record) state.starting = null;
      if (!record.destroyed && !state.pendingCleanup.includes(record)) {
        state.pendingCleanup.push(record);
      }
      try {
        destroyOwnedChecked(state, sequence, 'retire-record', record);
        state.pendingCleanup = state.pendingCleanup.filter((candidate) => candidate !== record);
        return null;
      } catch (error) {
        if (!state.pendingCleanup.includes(record)) state.pendingCleanup.push(record);
        throw error;
      }
    });
  } catch (error) {
    if (!state.pendingCleanup.includes(record) && !record.destroyed) {
      state.pendingCleanup.push(record);
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}

function handledFailure(
  options: ParsedLaunchOptions | null,
  error: unknown,
  state: StartupCoordinator | null = null,
): Promise<null> {
  return Promise.resolve().then(() => {
    callNonCritical(state, options?.onError ?? null, error);
    return null;
  });
}

export function launchGame(
  createPlatformValue: unknown,
  optionsValue: unknown = {},
): Promise<object | null> {
  let options: ParsedLaunchOptions;
  try {
    options = parseLaunchOptions(optionsValue);
  } catch (error) {
    return handledFailure(null, error);
  }
  if (typeof createPlatformValue !== 'function') {
    return handledFailure(options, new TypeError('launchGame 需要 createPlatform 函数。'));
  }
  const createGame = options.createGame;
  if (!createGame) {
    return handledFailure(options, new TypeError('launchGame 需要 createGame 函数。'));
  }

  let state: StartupCoordinator;
  let prepared: { generation: number; error: Error | null };
  try {
    state = coordinator(options.root);
  } catch (error) {
    return handledFailure(options, error);
  }
  try {
    prepared = beginGeneration(options.root, state);
  } catch (error) {
    return handledFailure(options, error, state);
  }
  if (prepared.error) return handledFailure(options, prepared.error, state);
  const generation = prepared.generation;

  const run = async (): Promise<object | null> => {
    let record: OwnedGame | null = null;
    try {
      const platformPromise = runCoordinatorOperation(
        state,
        'platform-launch',
        (sequence) => {
          if (generation !== state.generation) return null;
          const platformResult = callCoordinatorChecked(
            state,
            sequence,
            'platform-launch',
            () => (createPlatformValue as UnknownCallback)(),
            'launchGame createPlatform()',
            true,
          );
          const promise = Promise.resolve(platformResult);
          assertCoordinatorCommit(
            state,
            sequence,
            'platform-launch',
            'launchGame platform Promise publication',
          );
          return promise;
        },
      );
      if (platformPromise === null) return null;
      const platform = await platformPromise;
      const adopted = runCoordinatorOperation(
        state,
        'candidate-adoption',
        (sequence) => {
          if (generation !== state.generation) return false;
          const candidate = callCoordinatorChecked(
            state,
            sequence,
            'candidate-adoption',
            () => createGame(platform, options.gameOptions),
            'launchGame createGame()',
          );
          record = createOwnedGame(candidate);
          assertCoordinatorCommit(
            state,
            sequence,
            'candidate-adoption',
            'launchGame game capability capture',
          );
          state.starting = record;
          return true;
        },
      );
      if (!adopted || record === null) return null;
      const startPromise = runCoordinatorOperation(
        state,
        'start-launch',
        (sequence) => {
          if (generation !== state.generation || state.starting !== record) return null;
          const startResult = callCoordinatorChecked(
            state,
            sequence,
            'start-launch',
            () => record!.start(),
            'launchGame game.start()',
            true,
          );
          const promise = Promise.resolve(startResult);
          assertCoordinatorCommit(
            state,
            sequence,
            'start-launch',
            'launchGame start Promise publication',
          );
          return promise;
        },
      );
      if (startPromise === null) {
        retireRecord(state, record);
        return null;
      }
      await startPromise;
      const published = runCoordinatorOperation(
        state,
        'start-settlement',
        (sequence) => {
          if (generation !== state.generation || state.starting !== record) return null;
          state.starting = null;
          state.current = record;
          exposeGame(options.root, record!.game);
          assertCoordinatorCommit(
            state,
            sequence,
            'start-settlement',
            'launchGame current game exposure',
          );
          callNonCritical(state, options.onSuccess, record!.game);
          assertCoordinatorCommit(
            state,
            sequence,
            'start-settlement',
            'launchGame success observation',
          );
          return state.current === record ? record!.game : null;
        },
      );
      if (published === null) {
        retireRecord(state, record);
        return null;
      }
      return published;
    } catch (error) {
      let failure: unknown = error;
      if (record) {
        const cleanupError = retireRecord(state, record);
        if (cleanupError) failure = new AggregateError([error, cleanupError], '游戏启动失败且清理未完成。');
      }
      if (generation === state.generation) {
        try {
          runCoordinatorOperation(state, 'failure-publication', (sequence) => {
            if (generation !== state.generation) return;
            exposeGame(options.root, null);
            assertCoordinatorCommit(
              state,
              sequence,
              'failure-publication',
              'launchGame failed game exposure clear',
            );
            callNonCritical(state, options.onError, failure);
          });
        } catch (publicationError) {
          callNonCritical(
            state,
            options.onError,
            new AggregateError(
              [failure, publicationError],
              '游戏启动失败且失败状态发布未完整完成。',
            ),
          );
        }
      }
      return null;
    }
  };
  return Promise.resolve().then(run);
}

export function stopLaunchedGame(rootValue: unknown = globalThis): void {
  if (!isObject(rootValue)) throw new TypeError('stopLaunchedGame.root 必须是对象。');
  const state = coordinator(rootValue);
  const prepared = beginGeneration(rootValue, state);
  if (prepared.error) throw prepared.error;
}

export const LAUNCH_GAME_COORDINATOR_OPERATION_POLICY = Object.freeze({
  lifecycleUsesHostScopedMonotonicOperationOwner: true as const,
  legacyTransitioningFieldIsMigrationOnly: true as const,
  platformCandidateStartAndSettlementUseSeparateSynchronousSegments: true as const,
  platformAndStartPromisesPublishBeforeAwait: true as const,
  gameCapabilitiesPublishToStartingBeforeStartInvocation: true as const,
  destroyCallbacksCheckedBeforeDestroyedAndCleanupOwnerRelease: true as const,
  stickyReentryStopsCrossOwnerCleanupAndRetainsPendingDebt: true as const,
  staleAsyncSettlementsCannotPublishCurrentGame: true as const,
  successAndFailureObserversCannotOwnCoordinatorLifecycle: true as const,
  replacementStopAndDebugExposureBehaviorRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});
