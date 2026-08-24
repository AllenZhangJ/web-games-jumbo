import {
  assertNonEmptyString,
  assertPlainRecord,
  combineCleanupFailure,
  isNormalizedInputFrame,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createProductPublicMatchInfo,
  validateProductMatchResult,
  type ProductMatchResult,
  type ProductPublicMatchInfo,
} from '@number-strategy-jump/arena-product-contracts';
import { PresentationEventWindow } from '@number-strategy-jump/arena-presentation-runtime';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';
import {
  ownOptions,
  rejectThenable,
  snapshotMethod,
} from './capability-utils.js';

export const PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE = Object.freeze({
  PREPARED: 'prepared',
  RUNNING: 'running',
  RESULT: 'result',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ProductMatchPresentationRuntimeState = typeof PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE[
  keyof typeof PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE
];

interface ProductControllerAdapter {
  beginMatchWithReadFrame(): unknown;
  stepMatchWithReadFrame(input: unknown): unknown;
  getActiveMatchReadFrame(): unknown;
}

export interface ProductMatchPresentationControllerPort {
  beginMatchWithReadFrame(): unknown;
  stepMatchWithReadFrame(input: unknown): unknown;
  getActiveMatchReadFrame(): unknown;
}

export interface ProductMatchPresentationInputPort {
  sample(
    tick: number,
    options: Readonly<{
      eventSequence: number;
      localActionSidecar: unknown;
    }>,
  ): unknown;
}

export interface ProductMatchPresentationEventWindowPort {
  consume(events: readonly unknown[]): unknown;
  destroy(): void;
}

export interface ProductMatchPresentationProjectorOptions {
  readonly worldSnapshot: unknown;
  readonly localActionSidecar: unknown;
  readonly events: readonly unknown[];
  readonly publicMatchInfo: ProductPublicMatchInfo;
  readonly localParticipantId: string;
  readonly opponentParticipantId: string;
  readonly content: unknown;
}

export interface ProductMatchPresentationRuntimeOptions {
  readonly controller: ProductMatchPresentationControllerPort;
  readonly inputSource: ProductMatchPresentationInputPort;
  readonly localParticipantId?: string;
  readonly opponentParticipantId?: string;
  readonly content?: unknown;
  readonly eventWindowFactory?: (
    options: Readonly<{ capacity: number }>,
  ) => ProductMatchPresentationEventWindowPort;
  readonly frameProjector: (options: ProductMatchPresentationProjectorOptions) => unknown;
}

const OPTION_KEYS = new Set([
  'controller', 'inputSource', 'localParticipantId', 'opponentParticipantId',
  'content', 'eventWindowFactory', 'frameProjector',
]);

function syncResult(value: unknown, name: string): unknown {
  rejectThenable(value, name);
  return value;
}

function normalizeController(value: unknown): ProductControllerAdapter {
  const beginMatchWithReadFrame = snapshotMethod(
    value,
    'ProductSessionController',
    'beginMatchWithReadFrame',
  )!;
  const stepMatchWithReadFrame = snapshotMethod(
    value,
    'ProductSessionController',
    'stepMatchWithReadFrame',
  )!;
  const getActiveMatchReadFrame = snapshotMethod(
    value,
    'ProductSessionController',
    'getActiveMatchReadFrame',
  )!;
  return Object.freeze({
    beginMatchWithReadFrame: () => syncResult(
      beginMatchWithReadFrame(),
      'ProductSessionController.beginMatchWithReadFrame()',
    ),
    stepMatchWithReadFrame: (input: unknown) => syncResult(
      stepMatchWithReadFrame(input),
      'ProductSessionController.stepMatchWithReadFrame()',
    ),
    getActiveMatchReadFrame: () => syncResult(
      getActiveMatchReadFrame(),
      'ProductSessionController.getActiveMatchReadFrame()',
    ),
  });
}

function normalizeInputSource(value: unknown): ProductMatchPresentationInputPort {
  const sample = snapshotMethod(value, 'ProductMatch inputSource', 'sample')!;
  return Object.freeze({
    sample: (tick: number, options: Readonly<{
      eventSequence: number;
      localActionSidecar: unknown;
    }>) => sample(tick, options),
  });
}

function normalizeEventWindow(value: unknown): ProductMatchPresentationEventWindowPort {
  let consume: (...args: unknown[]) => unknown;
  let destroy: (...args: unknown[]) => unknown;
  try {
    consume = snapshotMethod(value, 'ProductMatch eventWindow', 'consume')!;
    destroy = snapshotMethod(value, 'ProductMatch eventWindow', 'destroy')!;
  } catch (error) {
    throw new TypeError('ProductMatchPresentationRuntime eventWindow 不符合合同。', {
      cause: safelyWrapThrownError(error, 'ProductMatch eventWindow 合同无效'),
    });
  }
  return Object.freeze({
    consume: (events: readonly unknown[]) => syncResult(
      consume(events),
      'ProductMatch eventWindow.consume()',
    ),
    destroy: () => { syncResult(destroy(), 'ProductMatch eventWindow.destroy()'); },
  });
}

function requiredFunction(value: unknown, name: string): (...args: unknown[]) => unknown {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as (...args: unknown[]) => unknown;
}

function activeProductState(snapshotValue: unknown): unknown {
  const snapshot = assertPlainRecord(snapshotValue, 'ProductSession snapshot');
  const state = assertPlainRecord(snapshot.state, 'ProductSession snapshot.state');
  return state.state === PRODUCT_SESSION_STATE.SUSPENDED ? state.activeState : state.state;
}

const V2_FRAME_KEYS = new Set(['schemaVersion', 'worldSnapshot', 'localActionSidecar']);
const V2_LOCAL_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'participantId', 'profile',
  'primaryActionDefinitionId', 'channels',
]);
const V2_CHANNEL_KEYS = new Set(['primary', 'primaryHold']);
const INPUT_FRAME_SEMANTIC_KEYS = [
  'tick', 'participantId', 'moveX', 'moveZ',
  'primaryPressed', 'primaryHeld', 'jumpPressed', 'jumpHeld', 'slamPressed',
] as const;

function strictFrozenDataRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  const record = assertPlainRecord(value, name);
  if (!Object.isFrozen(record)) throw new TypeError(`${name} 必须冻结。`);
  const ownKeys = Object.keys(record);
  if (ownKeys.length !== keys.size || ownKeys.some((key) => !keys.has(key))) {
    throw new TypeError(`${name} 字段集合不符合 V2 合同。`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 必须是冻结数据字段。`);
    }
  }
  return record;
}

interface TrustedV2FrameParts {
  readonly frame: PlainRecord;
  readonly world: PlainRecord;
  readonly local: PlainRecord;
}

function readV2Frame(value: unknown, localParticipantId: string): TrustedV2FrameParts {
  const frame = strictFrozenDataRecord(value, V2_FRAME_KEYS, 'ProductMatch MatchReadFrameV2');
  if (frame.schemaVersion !== 2) throw new RangeError('ProductMatch MatchReadFrameV2.schemaVersion 必须是 2。');
  const world = assertPlainRecord(frame.worldSnapshot, 'ProductMatch WorldSnapshotV2');
  if (!Object.isFrozen(world)) throw new TypeError('ProductMatch WorldSnapshotV2 必须冻结。');
  const local = strictFrozenDataRecord(
    frame.localActionSidecar,
    V2_LOCAL_KEYS,
    'ProductMatch LocalActionSidecarV2',
  );
  if (local.schemaVersion !== 2 || local.profile !== 'local-context-primary') {
    throw new RangeError('ProductMatch LocalActionSidecarV2 profile/schema 无效。');
  }
  if (local.participantId !== localParticipantId) {
    throw new RangeError('ProductMatch LocalActionSidecarV2 participantId 不匹配。');
  }
  if (local.tick !== world.tick || local.eventSequence !== world.eventSequence) {
    throw new RangeError('ProductMatch V2 frame world/local identity 不一致。');
  }
  const channels = strictFrozenDataRecord(
    local.channels,
    V2_CHANNEL_KEYS,
    'ProductMatch LocalActionSidecarV2.channels',
  );
  for (const channel of V2_CHANNEL_KEYS) {
    const outcome = assertPlainRecord(channels[channel], `ProductMatch local ${channel}`);
    if (!Object.isFrozen(outcome)) throw new TypeError(`ProductMatch local ${channel} 必须冻结。`);
  }
  return Object.freeze({ frame, world, local });
}

function assertPostStepInputIdentity(
  submittedValue: unknown,
  returnedValue: unknown,
  postFrame: TrustedV2FrameParts,
  localParticipantId: string,
): void {
  if (!isNormalizedInputFrame(submittedValue) || !isNormalizedInputFrame(returnedValue)) {
    throw new TypeError('ProductMatch V2 step input 必须是 trusted normalized InputFrame。');
  }
  const submitted = submittedValue;
  const returned = returnedValue;
  const postTick = postFrame.world.tick;
  if (
    submitted.participantId !== localParticipantId
    || returned.participantId !== localParticipantId
    || postFrame.local.participantId !== localParticipantId
  ) {
    throw new RangeError('ProductMatch V2 step input participant identity 不一致。');
  }
  if (!Number.isSafeInteger(postTick) || (postTick as number) < 1) {
    throw new RangeError('ProductMatch V2 post frame tick 无效。');
  }
  const expectedInputTick = (postTick as number) - 1;
  if (
    submitted.tick !== returned.tick
    || submitted.tick !== expectedInputTick
    || returned.tick !== expectedInputTick
  ) {
    throw new RangeError('ProductMatch V2 step input 与 post frame tick identity 不一致。');
  }
  for (const key of INPUT_FRAME_SEMANTIC_KEYS) {
    if (!Object.is(submitted[key], returned[key])) {
      throw new Error('ProductMatch V2 step returned input 与本次提交 input 语义不一致。');
    }
  }
}

function assertResultMatchIdentity(
  result: ProductMatchResult,
  publicMatchInfo: ProductPublicMatchInfo,
): void {
  if (
    result.matchSeed !== publicMatchInfo.matchSeed
    || result.content.contentHash !== publicMatchInfo.content.contentHash
    || result.opponent.id !== publicMatchInfo.opponent.id
    || result.opponent.displayName !== publicMatchInfo.opponent.displayName
    || result.opponent.portraitKey !== publicMatchInfo.opponent.portraitKey
    || result.opponent.appearanceKey !== publicMatchInfo.opponent.appearanceKey
  ) {
    throw new RangeError('ProductMatch V2 result 与当前 public match identity 不一致。');
  }
}

function assertPublicMatchIdentity(
  publicMatchInfo: ProductPublicMatchInfo,
  localParticipantId: string,
  opponentParticipantId: string,
): void {
  const participantIds = publicMatchInfo.content.participantCharacters.map(
    (assignment) => assignment.participantId,
  );
  if (!participantIds.includes(localParticipantId) || !participantIds.includes(opponentParticipantId)) {
    throw new RangeError('ProductMatch public content 未覆盖本局 local/opponent participant。');
  }
}

function readWorldOutcomeField(
  outcome: PlainRecord,
  field: string,
  name: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(outcome, field);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${field} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function assertPostWorldResultConsistency(
  result: ProductMatchResult | null,
  postFrame: TrustedV2FrameParts,
  localParticipantId: string,
  opponentParticipantId: string,
): void {
  const world = postFrame.world;
  const worldResultValue = world.result;
  if (result === null) {
    if (worldResultValue !== null || world.phase === 'ended') {
      throw new RangeError('ProductMatch V2 post world 已终局但 Product result 缺失。');
    }
    return;
  }
  if (world.phase !== 'ended' || worldResultValue === null) {
    throw new RangeError('ProductMatch V2 terminal result 与 post world phase/result 不一致。');
  }
  const worldResult = assertPlainRecord(worldResultValue, 'ProductMatch post WorldSnapshot.result');
  const winnerId = readWorldOutcomeField(
    worldResult,
    'winnerId',
    'ProductMatch post WorldSnapshot.result',
  );
  const reason = readWorldOutcomeField(
    worldResult,
    'reason',
    'ProductMatch post WorldSnapshot.result',
  );
  const isDraw = readWorldOutcomeField(
    worldResult,
    'isDraw',
    'ProductMatch post WorldSnapshot.result',
  );
  const endedAtTick = readWorldOutcomeField(
    worldResult,
    'endedAtTick',
    'ProductMatch post WorldSnapshot.result',
  );
  if (
    winnerId !== null
    && winnerId !== localParticipantId
    && winnerId !== opponentParticipantId
  ) throw new RangeError('ProductMatch post WorldSnapshot.result.winnerId 不属于本局。');
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new TypeError('ProductMatch post WorldSnapshot.result.reason 无效。');
  }
  if (typeof isDraw !== 'boolean' || isDraw !== (winnerId === null)) {
    throw new RangeError('ProductMatch post WorldSnapshot.result winner/draw 不一致。');
  }
  if (!Number.isSafeInteger(endedAtTick) || (endedAtTick as number) < 0) {
    throw new RangeError('ProductMatch post WorldSnapshot.result.endedAtTick 无效。');
  }
  const authority = result.authorityResult;
  if (
    authority.winnerId !== winnerId
    || authority.reason !== reason
    || authority.isDraw !== isDraw
    || authority.endedAtTick !== endedAtTick
  ) throw new RangeError('ProductMatch result 与 post WorldSnapshot.result 身份不一致。');
}

function runtimeFailure(error: unknown, message: string): Error {
  return safelyWrapThrownError(error, message);
}

function attachOpaqueCause(failure: Error, error: unknown): Error {
  try {
    Object.defineProperty(failure, 'cause', {
      value: error,
      enumerable: false,
      configurable: true,
      writable: false,
    });
  } catch {
    // A hostile thrown value must never prevent the static failure from being registered.
  }
  return failure;
}

function safelyWrapThrownError(error: unknown, message: string): Error {
  return attachOpaqueCause(new Error(message), error);
}

type ProductMatchPresentationRuntimeOperation =
  | 'start'
  | 'step'
  | 'state-read'
  | 'frame-read'
  | 'result-read'
  | 'debug-read'
  | 'destroy';

export class ProductMatchPresentationRuntime {
  #controller: ProductControllerAdapter | null;
  #inputSource: ProductMatchPresentationInputPort | null;
  #eventWindow: ProductMatchPresentationEventWindowPort | null;
  #frameProjector: ((options: ProductMatchPresentationProjectorOptions) => unknown) | null;
  #content: unknown;
  readonly #localParticipantId: string;
  readonly #opponentParticipantId: string;
  #state: ProductMatchPresentationRuntimeState;
  #operation: ProductMatchPresentationRuntimeOperation | null = null;
  #operationSequence = 0;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #cleanupIncomplete = false;
  #publicMatchInfo: ProductPublicMatchInfo | null = null;
  #lastFrame: unknown = null;
  #lastResult: ProductMatchResult | null = null;
  #lastError: Error | null = null;

  constructor(optionsValue: ProductMatchPresentationRuntimeOptions) {
    const options = ownOptions(
      optionsValue,
      OPTION_KEYS,
      'ProductMatchPresentationRuntime options',
    );
    this.#controller = normalizeController(options.controller);
    this.#inputSource = normalizeInputSource(options.inputSource);
    this.#localParticipantId = assertNonEmptyString(
      options.localParticipantId ?? 'player-1',
      'localParticipantId',
    );
    this.#opponentParticipantId = assertNonEmptyString(
      options.opponentParticipantId ?? 'player-2',
      'opponentParticipantId',
    );
    if (this.#localParticipantId === this.#opponentParticipantId) {
      throw new RangeError('本地与对手 participantId 不能相同。');
    }
    this.#content = options.content;
    const projector = requiredFunction(
      options.frameProjector,
      'ProductMatchPresentationRuntime.frameProjector',
    );
    this.#frameProjector = (projectorOptions) => syncResult(
      projector(projectorOptions),
      'ProductMatchPresentationRuntime.frameProjector()',
    );
    const eventWindowFactory = options.eventWindowFactory === undefined
      ? (value: Readonly<{ capacity: number }>) => new PresentationEventWindow(value)
      : requiredFunction(
        options.eventWindowFactory,
        'ProductMatchPresentationRuntime.eventWindowFactory',
      );
    let candidate: unknown = null;
    try {
      candidate = syncResult(
        eventWindowFactory({ capacity: 512 }),
        'ProductMatchPresentationRuntime.eventWindowFactory()',
      );
      this.#eventWindow = normalizeEventWindow(candidate);
    } catch (error) {
      const cleanupErrors: Error[] = [];
      try {
        const destroy = snapshotMethod(
          candidate,
          '无效 ProductMatch eventWindow',
          'destroy',
          false,
        );
        if (destroy) syncResult(destroy(), '无效 ProductMatch eventWindow.destroy()');
      } catch (cleanupError) {
        cleanupErrors.push(safelyWrapThrownError(cleanupError, '无效 eventWindow 清理失败'));
      }
      throw combineCleanupFailure(
        safelyWrapThrownError(error, 'ProductMatchPresentationRuntime 构造失败'),
        cleanupErrors,
        'ProductMatchPresentationRuntime 构造失败且清理未完整完成。',
      );
    }
    this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.PREPARED;
    Object.freeze(this);
  }

  get state(): ProductMatchPresentationRuntimeState {
    return this.#runOperation('state-read', () => this.#state);
  }

  getState(): ProductMatchPresentationRuntimeState {
    return this.#runOperation('state-read', () => this.#state);
  }

  #assertUsable(): void {
    if (this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED) {
      throw new Error('ProductMatchPresentationRuntime 已销毁。');
    }
    if (this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED) {
      throw new Error('ProductMatchPresentationRuntime 已失败关闭。', { cause: this.#lastError });
    }
  }

  #beginOperation(operation: ProductMatchPresentationRuntimeOperation): number {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        `ProductMatchPresentationRuntime.${operation}() 不可重入；当前正在 ${this.#operation}()。`,
      );
      throw this.#reentryError;
    }
    this.#operation = operation;
    this.#operationSequence += 1;
    this.#reentryError = null;
    return this.#operationSequence;
  }

  #assertCurrentOperationCommit(sequence: number, label: string): void {
    if (this.#operation === null || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前ProductMatchPresentationRuntime操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #finishOperation(sequence: number): void {
    const operation = this.#operation;
    const ownershipError = operation === null || this.#operationSequence !== sequence
      ? new Error('ProductMatchPresentationRuntime操作所有权在结束前已失效。')
      : null;
    const reentryError = this.#reentryError;
    let reentryFailure: Error | null = null;
    if (reentryError !== null) {
      reentryFailure = new Error(
        `ProductMatchPresentationRuntime.${operation ?? 'operation'}() 检测到宿主重入并已失败关闭。`,
        { cause: reentryError },
      );
      this.#lastError = reentryFailure;
      if (operation === 'destroy') this.#cleanupIncomplete = true;
      if (this.#state !== PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED) {
        this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED;
      }
    }
    this.#operation = null;
    this.#reentryError = null;
    if (ownershipError !== null) throw ownershipError;
    if (reentryFailure !== null) throw reentryFailure;
  }

  #runOperation<T>(
    operation: ProductMatchPresentationRuntimeOperation,
    callback: (sequence: number) => T,
  ): T {
    const sequence = this.#beginOperation(operation);
    try {
      return callback(sequence);
    } finally {
      this.#finishOperation(sequence);
    }
  }

  #callChecked<T>(sequence: number, label: string, callback: () => T): T {
    const result = callback();
    rejectThenable(result, label);
    this.#assertCurrentOperationCommit(sequence, label);
    return result;
  }

  #fail(error: unknown, message: string): Error {
    const failure = new Error(message);
    this.#lastError = failure;
    this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED;
    return attachOpaqueCause(failure, error);
  }

  #project(
    sequence: number,
    readFrame: TrustedV2FrameParts,
    events: readonly unknown[],
    publicMatchInfo: ProductPublicMatchInfo,
  ): unknown {
    const eventWindow = this.#eventWindow;
    if (eventWindow === null) throw new Error('ProductMatch eventWindow 已释放。');
    const frameProjector = this.#frameProjector;
    if (frameProjector === null) throw new Error('ProductMatch frameProjector 已释放。');
    const accepted = this.#callChecked(
      sequence,
      'ProductMatch eventWindow.consume()',
      () => eventWindow.consume(events),
    );
    if (!Array.isArray(accepted)) {
      throw new TypeError('ProductMatch eventWindow.consume() 必须返回数组。');
    }
    const frame = this.#callChecked(
      sequence,
      'ProductMatch frameProjector()',
      () => frameProjector({
        worldSnapshot: readFrame.world,
        localActionSidecar: readFrame.local,
        events: accepted,
        publicMatchInfo,
        localParticipantId: this.#localParticipantId,
        opponentParticipantId: this.#opponentParticipantId,
        content: this.#content,
      }),
    );
    if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
      throw new TypeError('ProductMatch frameProjector() 必须返回对象。');
    }
    return frame;
  }

  start(): unknown {
    return this.#runOperation('start', (sequence) => {
      this.#assertUsable();
      try {
      if (
        this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING
        || this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT
      ) return this.#lastFrame;
      const controller = this.#controller;
      if (controller === null) throw new Error('ProductSessionController 已释放。');
      const outcomeValue = this.#callChecked(
        sequence,
        'ProductSessionController.beginMatchWithReadFrame()',
        () => controller.beginMatchWithReadFrame(),
      );
      const outcome = assertPlainRecord(
        outcomeValue,
        'ProductSession V2 begin outcome',
      );
      const productSnapshotValue = outcome.productSnapshot;
      if (activeProductState(productSnapshotValue) !== PRODUCT_SESSION_STATE.IN_MATCH) {
        throw new Error('Product match 启动后未进入 in-match。');
      }
      const productSnapshot = assertPlainRecord(productSnapshotValue, 'ProductSession snapshot');
      const match = assertPlainRecord(productSnapshot.match, 'ProductSession snapshot.match');
      const publicMatchInfo = createProductPublicMatchInfo(match.publicMatchInfo);
      assertPublicMatchIdentity(
        publicMatchInfo,
        this.#localParticipantId,
        this.#opponentParticipantId,
      );
      const readFrame = readV2Frame(outcome.readFrame, this.#localParticipantId);
      this.#assertCurrentOperationCommit(sequence, 'Product match start validation');
      const frame = this.#project(sequence, readFrame, [], publicMatchInfo);
      this.#assertCurrentOperationCommit(sequence, 'Product match start publication');
      this.#publicMatchInfo = publicMatchInfo;
      this.#lastFrame = frame;
      this.#lastError = null;
      this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING;
      return frame;
      } catch (error) {
        throw this.#fail(error, 'Product match 表现启动失败');
      }
    });
  }

  step(): unknown {
    return this.#runOperation('step', (sequence) => {
      this.#assertUsable();
      let sampleStarted = false;
      let sampleReturned = false;
      let authorityEntered = false;
      let failureMessage = 'Product match 表现 step 失败';
      try {
      if (this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT) return this.#lastFrame;
      if (this.#state !== PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING) {
        throw new Error(`ProductMatchPresentationRuntime 无法在 ${this.#state} 状态 step。`);
      }
      const publicMatchInfo = this.#publicMatchInfo;
      if (publicMatchInfo === null) throw new Error('Product match 运行中缺少公开比赛信息。');
      const controller = this.#controller;
      if (controller === null) throw new Error('ProductSessionController 已释放。');
      const inputSource = this.#inputSource;
      if (inputSource === null) throw new Error('ProductMatch inputSource 已释放。');
      const beforeValue = this.#callChecked(
        sequence,
        'ProductSessionController.getActiveMatchReadFrame()',
        () => controller.getActiveMatchReadFrame(),
      );
      const before = readV2Frame(
        beforeValue,
        this.#localParticipantId,
      );
      this.#assertCurrentOperationCommit(sequence, 'Product match pre-frame validation');
      const tick = before.world.tick;
      if (!Number.isSafeInteger(tick) || (tick as number) < 0) {
        throw new RangeError('ProductMatch V2 world.tick 必须是非负安全整数。');
      }
      sampleStarted = true;
      const sampledValue = inputSource.sample(tick as number, {
        eventSequence: before.local.eventSequence as number,
        localActionSidecar: before.local,
      });
      sampleReturned = true;
      rejectThenable(sampledValue, 'ProductMatch inputSource.sample()');
      this.#assertCurrentOperationCommit(sequence, 'ProductMatch inputSource.sample()');
      const input = sampledValue;
      if (!isNormalizedInputFrame(input)) {
        throw new TypeError('Product match V2 inputSource 必须返回 trusted normalized InputFrame。');
      }
      if (input.tick !== tick) {
        throw new RangeError(
          `Product match V2 input.tick ${input.tick} 与当前 frame.tick ${tick} 不一致。`,
        );
      }
      if (input.participantId !== this.#localParticipantId) {
        throw new RangeError('Product match V2 input.participantId 与本地 participant 不一致。');
      }
      authorityEntered = true;
      const outcomeValue = this.#callChecked(
        sequence,
        'ProductSessionController.stepMatchWithReadFrame()',
        () => controller.stepMatchWithReadFrame(input),
      );
      const outcome = assertPlainRecord(
        outcomeValue,
        'ProductSession V2 step outcome',
      );
      if (outcome.matchStep === null) {
        throw new Error('Product match V2 权威 step 失败并已关闭。');
      }
      const matchStep = assertPlainRecord(outcome.matchStep, 'Product match step');
      if (!Array.isArray(matchStep.events) || !matchStep.readFrame) {
        throw new TypeError('Product match step 返回值不符合表现合同。');
      }
      const postFrame = readV2Frame(matchStep.readFrame, this.#localParticipantId);
      try {
        assertPostStepInputIdentity(input, matchStep.input, postFrame, this.#localParticipantId);
      } catch (error) {
        failureMessage = 'Product match 表现 step 失败：post input identity';
        throw error;
      }
      const result = matchStep.result === null
        ? null
        : validateProductMatchResult(matchStep.result);
      if (result !== null) {
        failureMessage = 'Product match 表现 step 失败：post result identity';
        assertResultMatchIdentity(result, publicMatchInfo);
      }
      assertPostWorldResultConsistency(
        result,
        postFrame,
        this.#localParticipantId,
        this.#opponentParticipantId,
      );
      const expectedProductState = result === null
        ? PRODUCT_SESSION_STATE.IN_MATCH
        : PRODUCT_SESSION_STATE.RESULTS;
      if (activeProductState(outcome.productSnapshot) !== expectedProductState) {
        throw new Error(`Product match step 后未进入 ${expectedProductState}。`);
      }
      this.#assertCurrentOperationCommit(sequence, 'Product match post-step validation');
      const frame = this.#project(
        sequence,
        postFrame,
        matchStep.events,
        publicMatchInfo,
      );
      this.#assertCurrentOperationCommit(sequence, 'Product match step publication');
      this.#lastFrame = frame;
      if (result !== null) {
        this.#lastResult = result;
        this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT;
      }
      return frame;
      } catch (error) {
        if (sampleStarted && !sampleReturned && !authorityEntered && this.#reentryError === null) {
          throw runtimeFailure(error, 'Product match 输入采样失败');
        }
        throw this.#fail(error, failureMessage);
      }
    });
  }

  getLastPresentationFrame(): unknown {
    return this.#runOperation('frame-read', () => this.#lastFrame);
  }

  getLastMatchResult(): ProductMatchResult | null {
    return this.#runOperation('result-read', () => this.#lastResult);
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    return this.#runOperation('debug-read', () => {
      let lastTick: number | null = null;
      if (this.#lastFrame && typeof this.#lastFrame === 'object') {
        const sourceDescriptor = Object.getOwnPropertyDescriptor(this.#lastFrame, 'source');
        const source = sourceDescriptor && 'value' in sourceDescriptor
          ? sourceDescriptor.value as unknown
          : null;
        if (source && typeof source === 'object') {
          const tickDescriptor = Object.getOwnPropertyDescriptor(source, 'tick');
          const value = tickDescriptor && 'value' in tickDescriptor ? tickDescriptor.value : null;
          if (Number.isSafeInteger(value) && (value as number) >= 0) lastTick = value as number;
        }
      }
      return Object.freeze({
        state: this.#state,
        stepping: this.#operation === 'step',
        cleanupIncomplete: this.#cleanupIncomplete,
        hasPublicMatchInfo: this.#publicMatchInfo !== null,
        hasFrame: this.#lastFrame !== null,
        hasResult: this.#lastResult !== null,
        lastTick,
        failed: this.#lastError !== null,
      });
    });
  }

  destroy(): void {
    this.#runOperation('destroy', (sequence) => {
      if (
        this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED
        && this.#eventWindow === null
      ) return;
      try {
        if (this.#eventWindow !== null) {
          const eventWindow = this.#eventWindow;
          this.#callChecked(
            sequence,
            'ProductMatch eventWindow.destroy()',
            () => eventWindow.destroy(),
          );
          this.#eventWindow = null;
        }
        this.#assertCurrentOperationCommit(sequence, 'Product match destroy publication');
        this.#controller = null;
        this.#inputSource = null;
        this.#frameProjector = null;
        this.#content = null;
        this.#publicMatchInfo = null;
        this.#lastFrame = null;
        this.#lastResult = null;
        this.#lastError = null;
        this.#cleanupIncomplete = false;
        this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED;
      } catch (error) {
        this.#cleanupIncomplete = true;
        throw this.#fail(error, 'Product match 表现资源清理失败');
      }
    });
  }
}

export const PRODUCT_MATCH_PRESENTATION_RUNTIME_OPERATION_POLICY = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  controllerInputEventAndProjectorCallbacksCheckedBeforeFramePublication: true as const,
  publicStateFrameResultAndDebugReadsRejectIntermediateOperations: true as const,
  preAuthorityInputFailureRemainsSameTickRetryable: true as const,
  terminalResultPublicationWaitsForPostFrameAndProjectionClosure: true as const,
  eventWindowDestroyRetainsOwnershipUntilCallbackClosure: true as const,
  presentationDoesNotWriteMatchAuthority: true as const,
  validationStatus: 'not-run' as const,
});
