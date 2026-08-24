import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  resolveArenaV2FormalAudioCueCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';

export const ARENA_V2_FORMAL_WEB_AUDIO_PORT_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  LOADING: 'loading',
  PRELOADED: 'preloaded',
  READY: 'ready',
  DISPOSING: 'disposing',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type AudioPortState = typeof ARENA_V2_FORMAL_WEB_AUDIO_PORT_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_FORMAL_WEB_AUDIO_PORT_STATE_CANDIDATE_V1
];

interface ActiveVoice {
  readonly sourceEventId: string;
  readonly priority: 1 | 2 | 3;
  readonly ordinal: number;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  readonly endedListener: EventListener;
  readonly cleanup: {
    endedListenerRemoved: boolean;
    playbackTerminated: boolean;
    sourceDisconnected: boolean;
    gainDisconnected: boolean;
  };
}

interface VoiceConstructionCleanupDebtCandidateV1 {
  source: AudioBufferSourceNode | null;
  gain: GainNode | null;
}

const OPTION_KEYS = new Set([
  'windowObject',
  'baseUrl',
  'allowMissingCandidateCues',
  'allowUnapprovedCandidateCues',
  'onTerminalCleanupProgress',
]);
const MAXIMUM_CONCURRENT_VOICES = 8;
const RECENT_SOURCE_EVENT_LIMIT = 64;
const MASTER_HEADROOM_DB = -6;
const SFX_BUS_GAIN_DB = 0;
const LIMITER_THRESHOLD_DB = -3;
const LIMITER_KNEE_DB = 0;
const LIMITER_RATIO = 20;
const LIMITER_ATTACK_SECONDS = 0.003;
const LIMITER_RELEASE_SECONDS = 0.18;
const PRODUCTION_APPROVED_AUDIO_ASSET_IDS = Object.freeze([
  ...ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1
    .productionApprovedAudioAssetIds,
]);
const PRODUCTION_APPROVED_AUDIO_ASSET_ID_SET = new Set(PRODUCTION_APPROVED_AUDIO_ASSET_IDS);

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function windowObject(value: unknown): Window {
  if (
    typeof value !== 'object'
    || value === null
    || typeof (value as Window).fetch !== 'function'
    || typeof (value as Window).AudioContext !== 'function'
  ) throw new TypeError('Arena V2 formal Web audio需要支持Web Audio与fetch的Window。');
  return value as Window;
}

function baseUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Arena V2 formal Web audio baseUrl必须是非空字符串。');
  }
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new RangeError('Arena V2 formal Web audio baseUrl只允许HTTP(S)。');
  }
  return parsed.href;
}

function dbToLinear(value: number): number {
  return 10 ** (value / 20);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function voiceOrder(left: ActiveVoice, right: ActiveVoice): number {
  return left.priority - right.priority
    || left.ordinal - right.ordinal
    || compareText(left.sourceEventId, right.sourceEventId);
}

function aggregateFailure(
  message: string,
  cause: unknown,
  cleanupErrors: readonly unknown[],
): Error {
  if (cleanupErrors.length === 0 && cause instanceof Error) return cause;
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupErrors', {
    value: Object.freeze([...cleanupErrors]),
  });
  return failure;
}

function throwSettledBatchFailures(
  results: readonly PromiseSettledResult<unknown>[],
  message: string,
): void {
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(({ reason }) => reason);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, message);
}

function deferred<T>(): Readonly<{
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return Object.freeze({ promise, resolve, reject });
}

interface FormalWebAudioConstructionResourcesCandidateV1 {
  readonly context: AudioContext;
  limiter: DynamicsCompressorNode | null;
  masterBus: GainNode | null;
  sfxBus: GainNode | null;
  contextCloseRequested: boolean;
  contextCloseCompleted: boolean;
  contextCloseOperation: Promise<void> | null;
}

function formalWebAudioConstructionCleanupCompleteCandidateV1(
  resources: FormalWebAudioConstructionResourcesCandidateV1,
): boolean {
  return resources.limiter === null
    && resources.masterBus === null
    && resources.sfxBus === null
    && resources.contextCloseCompleted;
}

function cleanupFormalWebAudioConstructionResourcesCandidateV1(
  resources: FormalWebAudioConstructionResourcesCandidateV1,
): void {
  if (resources.limiter !== null) {
    resources.limiter.disconnect();
    resources.limiter = null;
  }
  if (resources.masterBus !== null) {
    resources.masterBus.disconnect();
    resources.masterBus = null;
  }
  if (resources.sfxBus !== null) {
    resources.sfxBus.disconnect();
    resources.sfxBus = null;
  }
  if (resources.context.state === 'closed') {
    resources.contextCloseRequested = true;
    resources.contextCloseCompleted = true;
    resources.contextCloseOperation = null;
    return;
  }
  if (resources.contextCloseRequested || resources.contextCloseCompleted) return;
  const closing = resources.context.close();
  resources.contextCloseRequested = true;
  resources.contextCloseCompleted = false;
  resources.contextCloseOperation = closing;
  void closing.then(
    () => {
      if (resources.contextCloseOperation !== closing) return;
      resources.contextCloseOperation = null;
      resources.contextCloseCompleted = true;
    },
    () => {
      if (resources.contextCloseOperation !== closing) return;
      resources.contextCloseOperation = null;
      resources.contextCloseRequested = false;
      resources.contextCloseCompleted = false;
    },
  );
}

export class ArenaV2FormalWebAudioConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: FormalWebAudioConstructionResourcesCandidateV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: FormalWebAudioConstructionResourcesCandidateV1,
  ) {
    super(
      [originalError, cleanupError],
      'Arena V2 formal Web audio构造失败且清理未收敛。',
    );
    this.name = 'ArenaV2FormalWebAudioConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return formalWebAudioConstructionCleanupCompleteCandidateV1(this.#resources);
  }

  retryCleanup(): void {
    cleanupFormalWebAudioConstructionResourcesCandidateV1(this.#resources);
  }
}

/**
 * Browser Web Audio owner for the approved formal OGG records. Files are
 * fetched and decoded during Loading; match-time play is synchronous and only
 * consumes the authority-derived audio command. Unsupported cues fail closed
 * by default; an explicit isolated-development option may skip them without
 * synthesizing an oscillator or borrowing an unrelated sound.
 */
export class ArenaV2FormalWebAudioPortCandidateV1 {
  readonly #window: Window;
  readonly #baseUrl: string;
  readonly #context: AudioContext;
  readonly #sfxBus: GainNode;
  readonly #masterBus: GainNode;
  readonly #limiter: DynamicsCompressorNode;
  readonly #allowMissingCandidateCues: boolean;
  readonly #allowUnapprovedCandidateCues: boolean;
  readonly #onTerminalCleanupProgress: (() => unknown) | null;
  readonly #buffers = new Map<string, AudioBuffer>();
  readonly #pendingLoadAbortControllers = new Map<string, AbortController>();
  readonly #voices = new Map<string, ActiveVoice>();
  readonly #voiceConstructionCleanupDebts = new Set<VoiceConstructionCleanupDebtCandidateV1>();
  #state: AudioPortState = 'created';
  #loadOperation: Promise<this> | null = null;
  #loadPending = false;
  #activationOperation: Promise<this> | null = null;
  #activationPending = false;
  #disposeRequested = false;
  #recentSourceEventIds: string[] = [];
  #nextVoiceOrdinal = 1;
  #skippedMissingCueCount = 0;
  #lastError: unknown = null;
  #sfxBusDisconnected = false;
  #masterBusDisconnected = false;
  #limiterDisconnected = false;
  #contextCloseRequested = false;
  #contextCloseCompleted = false;
  #contextCloseOperation: Promise<void> | null = null;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 formal Web audio options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 formal Web audio options');
    dataField(source, 'windowObject', 'Arena V2 formal Web audio options');
    dataField(source, 'baseUrl', 'Arena V2 formal Web audio options');
    const allowMissingCandidateCues = Object.hasOwn(source, 'allowMissingCandidateCues')
      ? dataField(source, 'allowMissingCandidateCues', 'Arena V2 formal Web audio options')
      : false;
    if (typeof allowMissingCandidateCues !== 'boolean') {
      throw new TypeError('Arena V2 formal Web audio allowMissingCandidateCues必须是boolean。');
    }
    const allowUnapprovedCandidateCues = Object.hasOwn(source, 'allowUnapprovedCandidateCues')
      ? dataField(source, 'allowUnapprovedCandidateCues', 'Arena V2 formal Web audio options')
      : false;
    if (typeof allowUnapprovedCandidateCues !== 'boolean') {
      throw new TypeError(
        'Arena V2 formal Web audio allowUnapprovedCandidateCues必须是boolean。',
      );
    }
    const onTerminalCleanupProgress = Object.hasOwn(source, 'onTerminalCleanupProgress')
      ? dataField(source, 'onTerminalCleanupProgress', 'Arena V2 formal Web audio options')
      : null;
    if (onTerminalCleanupProgress !== null && typeof onTerminalCleanupProgress !== 'function') {
      throw new TypeError(
        'Arena V2 formal Web audio onTerminalCleanupProgress必须是函数或null。',
      );
    }
    this.#window = windowObject(source.windowObject);
    this.#baseUrl = baseUrl(source.baseUrl);
    this.#allowMissingCandidateCues = allowMissingCandidateCues;
    this.#allowUnapprovedCandidateCues = allowUnapprovedCandidateCues;
    this.#onTerminalCleanupProgress = onTerminalCleanupProgress as (() => unknown) | null;
    const context = new this.#window.AudioContext({ latencyHint: 'interactive' });
    let sfxBus: GainNode | null = null;
    let masterBus: GainNode | null = null;
    let limiter: DynamicsCompressorNode | null = null;
    try {
      sfxBus = context.createGain();
      masterBus = context.createGain();
      limiter = context.createDynamicsCompressor();
      sfxBus.gain.value = dbToLinear(SFX_BUS_GAIN_DB);
      masterBus.gain.value = dbToLinear(MASTER_HEADROOM_DB);
      limiter.threshold.value = LIMITER_THRESHOLD_DB;
      limiter.knee.value = LIMITER_KNEE_DB;
      limiter.ratio.value = LIMITER_RATIO;
      limiter.attack.value = LIMITER_ATTACK_SECONDS;
      limiter.release.value = LIMITER_RELEASE_SECONDS;
      sfxBus.connect(masterBus);
      masterBus.connect(limiter);
      limiter.connect(context.destination);
    } catch (error) {
      const resources: FormalWebAudioConstructionResourcesCandidateV1 = {
        context,
        limiter,
        masterBus,
        sfxBus,
        contextCloseRequested: false,
        contextCloseCompleted: false,
        contextCloseOperation: null,
      };
      let cleanupError: unknown = new Error(
        'Arena V2 formal Web audio构造清理等待AudioContext关闭。',
      );
      try {
        cleanupFormalWebAudioConstructionResourcesCandidateV1(resources);
      } catch (nextCleanupError) {
        cleanupError = nextCleanupError;
      }
      if (!formalWebAudioConstructionCleanupCompleteCandidateV1(resources)) {
        throw new ArenaV2FormalWebAudioConstructionCleanupFailureCandidateV1(
          error,
          cleanupError,
          resources,
        );
      }
      throw error;
    }
    if (sfxBus === null || masterBus === null || limiter === null) {
      throw new Error('Arena V2 formal Web audio总线构造后节点缺失。');
    }
    this.#context = context;
    this.#sfxBus = sfxBus;
    this.#masterBus = masterBus;
    this.#limiter = limiter;
  }

  get state(): AudioPortState {
    return this.#runSynchronousOperation('state-read', () => this.#state);
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`${operation}不可重入${this.#operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertLive(operation: string): void {
    this.#assertNoOperation(operation);
    if (this.#state === 'disposing' || this.#state === 'failed' || this.#state === 'disposed') {
      throw new Error(`${operation}拒绝状态${this.#state}。`);
    }
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    const reentrySequence = this.#reentrySequence;
    try {
      let result: T;
      try {
        result = run();
      } catch (error) {
        if (this.#reentrySequence !== reentrySequence) {
          return this.#failOperationReentry(operation, error);
        }
        throw error;
      }
      if (this.#reentrySequence !== reentrySequence) {
        return this.#failOperationReentry(operation);
      }
      return result;
    } finally {
      if (this.#operation === operation) this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 formal Web audio提交缺少操作所有权。');
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #failOperationReentry(operation: string, operationFailure?: unknown): never {
    const reentryError = this.#reentryError ?? new Error(
      `Arena V2 formal Web audio ${operation}检测到被Web Audio或Observer吞掉的同步重入。`,
    );
    return this.#commitFailure(
      operationFailure === undefined || operationFailure === reentryError
        ? reentryError
        : new AggregateError(
          [operationFailure, reentryError],
          `Arena V2 formal Web audio ${operation}失败且检测到同步重入。`,
        ),
    );
  }

  #releaseVoice(
    sourceEventId: string,
    expectedVoice: ActiveVoice,
    playbackTerminated = false,
  ): readonly unknown[] {
    const voice = this.#voices.get(sourceEventId);
    if (voice === undefined || voice !== expectedVoice) return Object.freeze([]);
    if (playbackTerminated) voice.cleanup.playbackTerminated = true;
    const errors: unknown[] = [];
    if (!voice.cleanup.sourceDisconnected) {
      const reentrySequence = this.#reentrySequence;
      try {
        voice.source.disconnect();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            `Arena V2 formal Web audio voice ${sourceEventId} source清理期间发生同步重入。`,
          ));
          return Object.freeze(errors);
        }
        voice.cleanup.sourceDisconnected = true;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (!voice.cleanup.gainDisconnected) {
      const reentrySequence = this.#reentrySequence;
      try {
        voice.gain.disconnect();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            `Arena V2 formal Web audio voice ${sourceEventId} gain清理期间发生同步重入。`,
          ));
          return Object.freeze(errors);
        }
        voice.cleanup.gainDisconnected = true;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (voice.cleanup.endedListenerRemoved
      && voice.cleanup.playbackTerminated
      && voice.cleanup.sourceDisconnected
      && voice.cleanup.gainDisconnected) {
      this.#voices.delete(sourceEventId);
    }
    return Object.freeze(errors);
  }

  #removeVoiceEndedListener(voice: ActiveVoice): readonly unknown[] {
    if (voice.cleanup.endedListenerRemoved) return Object.freeze([]);
    const errors: unknown[] = [];
    const reentrySequence = this.#reentrySequence;
    try {
      rejectThenable(
        voice.source.removeEventListener('ended', voice.endedListener),
        `Arena V2 formal Web audio voice ${voice.sourceEventId} ended listener cleanup`,
      );
      if (this.#reentrySequence !== reentrySequence) {
        errors.push(this.#reentryError ?? new Error(
          `Arena V2 formal Web audio voice ${voice.sourceEventId} ended监听清理期间发生同步重入。`,
        ));
        return Object.freeze(errors);
      }
      voice.cleanup.endedListenerRemoved = true;
    } catch (error) {
      errors.push(error);
    }
    return Object.freeze(errors);
  }

  #cleanupVoiceConstructionDebt(
    debt: VoiceConstructionCleanupDebtCandidateV1,
  ): readonly unknown[] {
    const errors: unknown[] = [];
    if (debt.source !== null) {
      const reentrySequence = this.#reentrySequence;
      try {
        debt.source.disconnect();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            'Arena V2 formal Web audio未发布Source清理期间发生同步重入。',
          ));
          return Object.freeze(errors);
        }
        debt.source = null;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (debt.gain !== null) {
      const reentrySequence = this.#reentrySequence;
      try {
        debt.gain.disconnect();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            'Arena V2 formal Web audio未发布Gain清理期间发生同步重入。',
          ));
          return Object.freeze(errors);
        }
        debt.gain = null;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (debt.source === null && debt.gain === null) {
      this.#voiceConstructionCleanupDebts.delete(debt);
    }
    return Object.freeze(errors);
  }

  #cleanupVoiceConstructionDebts(): readonly unknown[] {
    for (const debt of this.#voiceConstructionCleanupDebts) {
      const errors = this.#cleanupVoiceConstructionDebt(debt);
      if (errors.length > 0) return errors;
    }
    return Object.freeze([]);
  }

  #recordDetachedFailure(error: unknown, message: string): void {
    this.#lastError = this.#lastError === null
      ? error
      : new AggregateError([this.#lastError, error], message);
    if (this.#state !== 'disposed') this.#state = 'failed';
  }

  #recordContextCloseSettlementCommitFailure(
    closing: Promise<void>,
    error: unknown,
  ): void {
    const errors: unknown[] = [error];
    if (this.#contextCloseOperation === closing) {
      try {
        if (this.#context.state === 'closed') {
          this.#contextCloseOperation = null;
          this.#contextCloseRequested = true;
          this.#contextCloseCompleted = true;
        } else {
          this.#contextCloseOperation = null;
          this.#contextCloseRequested = false;
          this.#contextCloseCompleted = false;
        }
      } catch (inspectionError) {
        errors.push(inspectionError);
      }
    }
    this.#recordDetachedFailure(
      errors.length === 1
        ? error
        : new AggregateError(
          errors,
          'Arena V2 formal Web audio context close结果提交失败且状态复核不完整。',
        ),
      'Arena V2 formal Web audio context close结果提交失败。',
    );
  }

  #settleEndedVoiceEventually(sourceEventId: string, voice: ActiveVoice): void {
    if (this.#operation !== null) {
      void Promise.resolve().then(() => {
        this.#settleEndedVoiceEventually(sourceEventId, voice);
      }).catch((error: unknown) => {
        this.#recordDetachedFailure(
          error,
          'Arena V2 formal Web audio voice ended延期结算失败。',
        );
      });
      return;
    }
    this.#runSynchronousOperation('Arena V2 formal Web audio voice ended提交', () => {
      const errors = this.#releaseVoice(sourceEventId, voice, true);
      if (errors.length > 0) {
        this.#lastError ??= new AggregateError(
          errors,
          'Arena V2 formal Web audio voice ended清理不完整。',
        );
      }
    });
  }

  #stopVoice(sourceEventId: string): readonly unknown[] {
    const voice = this.#voices.get(sourceEventId);
    if (voice === undefined) return Object.freeze([]);
    const errors: unknown[] = [];
    errors.push(...this.#removeVoiceEndedListener(voice));
    if (errors.length > 0) return Object.freeze(errors);
    if (!voice.cleanup.playbackTerminated) {
      const reentrySequence = this.#reentrySequence;
      try {
        voice.source.stop();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            `Arena V2 formal Web audio voice ${sourceEventId}停止期间发生同步重入。`,
          ));
          return Object.freeze(errors);
        }
        voice.cleanup.playbackTerminated = true;
      } catch (error) {
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(error);
          return Object.freeze(errors);
        }
        if (error instanceof DOMException && error.name === 'InvalidStateError') {
          voice.cleanup.playbackTerminated = true;
        } else {
          errors.push(error);
          return Object.freeze(errors);
        }
      }
    }
    errors.push(...this.#releaseVoice(sourceEventId, voice));
    return Object.freeze(errors);
  }

  #cleanupVoices(resetRecent: boolean): readonly unknown[] {
    const errors: unknown[] = [];
    for (const sourceEventId of [...this.#voices.keys()]) {
      const reentrySequence = this.#reentrySequence;
      const cleanupErrors = this.#stopVoice(sourceEventId);
      errors.push(...cleanupErrors);
      if (this.#reentrySequence !== reentrySequence) {
        if (!errors.includes(this.#reentryError)) {
          errors.push(this.#reentryError ?? new Error(
            `Arena V2 formal Web audio voice ${sourceEventId}批量清理期间发生同步重入。`,
          ));
        }
        return Object.freeze(errors);
      }
      if (cleanupErrors.length > 0) return Object.freeze(errors);
    }
    if (resetRecent) this.#recentSourceEventIds = [];
    return Object.freeze(errors);
  }

  #disconnectBusGraph(): readonly unknown[] {
    const errors: unknown[] = [];
    if (!this.#sfxBusDisconnected) {
      const reentrySequence = this.#reentrySequence;
      try {
        this.#sfxBus.disconnect();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            'Arena V2 formal Web audio SFX Bus清理期间发生同步重入。',
          ));
          return Object.freeze(errors);
        }
        this.#sfxBusDisconnected = true;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (!this.#masterBusDisconnected) {
      const reentrySequence = this.#reentrySequence;
      try {
        this.#masterBus.disconnect();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            'Arena V2 formal Web audio Master Bus清理期间发生同步重入。',
          ));
          return Object.freeze(errors);
        }
        this.#masterBusDisconnected = true;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (!this.#limiterDisconnected) {
      const reentrySequence = this.#reentrySequence;
      try {
        this.#limiter.disconnect();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            'Arena V2 formal Web audio Limiter清理期间发生同步重入。',
          ));
          return Object.freeze(errors);
        }
        this.#limiterDisconnected = true;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    return Object.freeze(errors);
  }

  #abortPendingLoads(): readonly unknown[] {
    const errors: unknown[] = [];
    for (const [audioAssetId, controller] of this.#pendingLoadAbortControllers) {
      if (controller.signal.aborted) continue;
      const reentrySequence = this.#reentrySequence;
      try {
        controller.abort();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            `Arena V2 formal Web audio ${audioAssetId}取消期间发生同步重入。`,
          ));
          return Object.freeze(errors);
        }
        if (!controller.signal.aborted) {
          errors.push(new Error(`Arena V2 formal Web audio ${audioAssetId}取消未提交。`));
          return Object.freeze(errors);
        }
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    return Object.freeze(errors);
  }

  #terminalCleanupComplete(): boolean {
    return this.#voiceConstructionCleanupDebts.size === 0
      && this.#voices.size === 0
      && this.#pendingLoadAbortControllers.size === 0
      && this.#sfxBusDisconnected
      && this.#masterBusDisconnected
      && this.#limiterDisconnected
      && !this.#loadPending
      && !this.#activationPending
      && this.#contextCloseCompleted;
  }

  #notifyTerminalCleanupProgress(): void {
    if (this.#onTerminalCleanupProgress === null) return;
    try {
      rejectThenable(
        this.#onTerminalCleanupProgress(),
        'Arena V2 formal Web audio terminal cleanup progress observer',
      );
    } catch (error) {
      this.#lastError ??= error;
    }
  }

  #attemptRequestedDisposal(): readonly unknown[] {
    const errors = [...this.#abortPendingLoads()];
    if (errors.length > 0 || this.#reentryError !== null) return Object.freeze(errors);
    errors.push(...this.#cleanupVoiceConstructionDebts());
    if (errors.length > 0 || this.#reentryError !== null) return Object.freeze(errors);
    errors.push(...this.#cleanupVoices(true));
    if (errors.length > 0 || this.#reentryError !== null) return Object.freeze(errors);
    this.#buffers.clear();
    if (this.#voices.size === 0) errors.push(...this.#disconnectBusGraph());
    if (errors.length > 0 || this.#reentryError !== null) return Object.freeze(errors);
    const busGraphDisconnected = this.#sfxBusDisconnected
      && this.#masterBusDisconnected
      && this.#limiterDisconnected;
    if (
      !this.#loadPending
      && !this.#activationPending
      && this.#voices.size === 0
      && busGraphDisconnected
      && !this.#contextCloseRequested
    ) {
      try {
        const closing = this.#context.close();
        this.#contextCloseRequested = true;
        this.#contextCloseCompleted = false;
        this.#contextCloseOperation = closing;
        const settlementCommit = closing.then(
          () => {
            this.#runSynchronousOperation(
              'Arena V2 formal Web audio context close完成提交',
              () => {
                if (this.#contextCloseOperation !== closing) return;
                this.#contextCloseOperation = null;
                this.#contextCloseCompleted = true;
                if (this.#disposeRequested) this.#commitRequestedDisposal();
                else this.#notifyTerminalCleanupProgress();
              },
            );
          },
          (error: unknown) => {
            this.#runSynchronousOperation(
              'Arena V2 formal Web audio context close失败提交',
              () => {
                if (this.#contextCloseOperation !== closing) return;
                this.#contextCloseOperation = null;
                this.#contextCloseRequested = false;
                this.#contextCloseCompleted = false;
                this.#lastError ??= error;
                this.#state = 'failed';
              },
            );
          },
        );
        void settlementCommit.catch((error: unknown) => {
          this.#recordContextCloseSettlementCommitFailure(closing, error);
        });
        this.#assertCurrentOperationCommit();
      } catch (error) { errors.push(error); }
    }
    if (this.#reentryError !== null) return Object.freeze(errors);
    this.#state = errors.length > 0
      ? 'failed'
      : this.#terminalCleanupComplete()
        ? 'disposed'
        : 'disposing';
    return Object.freeze(errors);
  }

  #continueRequestedDisposal(): void {
    if (!this.#disposeRequested || this.#state === 'disposed') return;
    this.#runSynchronousOperation(
      'Arena V2 formal Web audio异步续接清理',
      () => this.#commitRequestedDisposal(),
    );
  }

  #commitRequestedDisposal(): void {
    const errors = this.#attemptRequestedDisposal();
    this.#assertCurrentOperationCommit();
    if (errors.length > 0) {
      this.#lastError = new AggregateError(
        errors,
        'Arena V2 formal Web audio异步续接清理不完整。',
      );
    }
    this.#notifyTerminalCleanupProgress();
  }

  #commitFailure(error: unknown): never {
    this.#lastError = error;
    const cleanupErrors = this.#cleanupVoices(false);
    if (this.#reentryError === null) this.#buffers.clear();
    this.#state = 'failed';
    throw aggregateFailure(
      'Arena V2 formal Web audio失败且清理不完整。',
      error,
      cleanupErrors,
    );
  }

  #fail(error: unknown): never {
    if (this.#operation !== null) return this.#commitFailure(error);
    return this.#runSynchronousOperation(
      'Arena V2 formal Web audio失败提交',
      () => this.#commitFailure(error),
    );
  }

  #assertAudioAssetsPermitted(): void {
    if (this.#allowUnapprovedCandidateCues) return;
    const blockedAssetIds = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
      .audioRecords
      .map(({ audioAssetId }) => audioAssetId)
      .filter((assetId) => !PRODUCTION_APPROVED_AUDIO_ASSET_ID_SET.has(assetId))
      .sort();
    if (blockedAssetIds.length === 0) return;
    throw new Error(
      `Arena V2 formal Web audio拒绝${blockedAssetIds.length}项未获生产批准资产；`
      + '默认路径不会发起任何OGG加载。',
    );
  }

  load(): Promise<this> {
    this.#assertNoOperation('Arena V2 formal Web audio load');
    if (this.#state === 'loading' && this.#loadOperation !== null) {
      return this.#loadOperation;
    }
    this.#assertLive('Arena V2 formal Web audio load');
    if (this.#state === 'preloaded' || this.#state === 'ready') return Promise.resolve(this);
    if (this.#loadOperation !== null) return this.#loadOperation;
    if (this.#state !== 'created') {
      return Promise.reject(new Error(`Arena V2 formal Web audio不能在${this.#state}加载。`));
    }
    try {
      this.#assertAudioAssetsPermitted();
    } catch (error) {
      this.#lastError = error;
      this.#state = 'failed';
      this.#loadOperation = Promise.reject(error);
      return this.#loadOperation;
    }
    this.#state = 'loading';
    const records = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.audioRecords;
    this.#loadPending = true;
    const loadOwner = deferred<this>();
    this.#loadOperation = loadOwner.promise;
    let loadingOperations: Promise<void>[] = [];
    try {
      this.#runSynchronousOperation(
        'Arena V2 formal Web audio加载启动',
        () => {
          for (const record of records) {
            if (this.#state !== 'loading') {
              throw new Error(`Arena V2 formal audio ${record.audioAssetId}启动时Owner已不可接收。`);
            }
            const abortController = new AbortController();
            if (this.#pendingLoadAbortControllers.has(record.audioAssetId)) {
              throw new RangeError(`Arena V2 formal audio ${record.audioAssetId}重复加载。`);
            }
            this.#pendingLoadAbortControllers.set(record.audioAssetId, abortController);
            loadingOperations.push((async () => {
              try {
                const response = await this.#window.fetch(
                  new URL(record.runtimeSourceKey, this.#baseUrl),
                  { signal: abortController.signal },
                );
                if (!response.ok) {
                  throw new Error(
                    `Arena V2 formal audio ${record.audioAssetId}加载失败：HTTP ${response.status}。`,
                  );
                }
                const encoded = await this.#runSynchronousOperation(
                  `Arena V2 formal audio ${record.audioAssetId} arrayBuffer启动`,
                  () => {
                    if (this.#state !== 'loading') {
                      throw new Error(
                        `Arena V2 formal audio ${record.audioAssetId}响应迟到，拒绝继续读取。`,
                      );
                    }
                    return response.arrayBuffer();
                  },
                );
                const decoded = await this.#runSynchronousOperation(
                  `Arena V2 formal audio ${record.audioAssetId} decode启动`,
                  () => {
                    if (this.#state !== 'loading') {
                      throw new Error(
                        `Arena V2 formal audio ${record.audioAssetId}字节迟到，拒绝开始解码。`,
                      );
                    }
                    return this.#context.decodeAudioData(encoded.slice(0));
                  },
                );
                this.#runSynchronousOperation(
                  `Arena V2 formal audio ${record.audioAssetId} decode settlement`,
                  () => {
                    if (this.#state !== 'loading') {
                      throw new Error(`Arena V2 formal audio ${record.audioAssetId}迟到加载被拒绝。`);
                    }
                    this.#buffers.set(record.audioAssetId, decoded);
                  },
                );
              } finally {
                if (this.#pendingLoadAbortControllers.get(record.audioAssetId)
                  === abortController) {
                  this.#pendingLoadAbortControllers.delete(record.audioAssetId);
                }
              }
            })());
            this.#assertCurrentOperationCommit();
          }
        },
      );
    } catch (error) {
      const execution = Promise.allSettled(loadingOperations).then(() => {
        if (this.#state !== 'loading') throw error;
        return this.#fail(error);
      }).finally(() => {
        try {
          this.#runSynchronousOperation(
            'Arena V2 formal Web audio启动失败终态水位',
            () => { this.#loadPending = false; },
          );
        } finally {
          this.#continueRequestedDisposal();
        }
      });
      void execution.then(loadOwner.resolve, loadOwner.reject);
      return this.#loadOperation;
    }
    const execution = Promise.allSettled(loadingOperations).then((results) => {
      return this.#runSynchronousOperation(
        'Arena V2 formal Web audio加载成功提交',
        () => {
          throwSettledBatchFailures(
            results,
            'Arena V2 formal Web audio加载批次存在多项失败。',
          );
          if (this.#state !== 'loading') {
            throw new Error('Arena V2 formal Web audio加载完成时Owner不可接收。');
          }
          if (this.#buffers.size !== records.length) {
            throw new RangeError('Arena V2 formal Web audio预载数量不闭合。');
          }
          this.#state = this.#context.state === 'running' ? 'ready' : 'preloaded';
          return this;
        },
      );
    }).catch((error: unknown) => {
      if (this.#state !== 'loading') throw error;
      return this.#fail(error);
    }).finally(() => {
      try {
        this.#runSynchronousOperation(
          'Arena V2 formal Web audio加载终态水位',
          () => { this.#loadPending = false; },
        );
      } finally {
        this.#continueRequestedDisposal();
      }
    });
    void execution.then(loadOwner.resolve, loadOwner.reject);
    return this.#loadOperation;
  }

  activate(): Promise<this> {
    this.#assertNoOperation('Arena V2 formal Web audio activate');
    if (this.#activationPending && this.#activationOperation !== null) {
      return this.#activationOperation;
    }
    this.#assertLive('Arena V2 formal Web audio activate');
    if (this.#state === 'ready' && this.#context.state === 'running') {
      return Promise.resolve(this);
    }
    if (this.#activationOperation !== null) return this.#activationOperation;
    if (this.#state !== 'preloaded') {
      return Promise.reject(new Error('Arena V2 formal Web audio必须先完成Loading预载。'));
    }
    const activationOwner = deferred<this>();
    this.#activationOperation = activationOwner.promise;
    this.#activationPending = true;
    let resumeOperation: Promise<void>;
    try {
      resumeOperation = this.#runSynchronousOperation(
        'Arena V2 formal Web audio激活启动',
        () => this.#context.resume(),
      );
    } catch (error) {
      resumeOperation = Promise.reject(error);
    }
    const execution = resumeOperation.then(() => {
      return this.#runSynchronousOperation(
        'Arena V2 formal Web audio激活成功提交',
        () => {
          if (this.#state !== 'preloaded') {
            throw new Error(`Arena V2 formal Web audio激活完成时Owner状态已是${this.#state}。`);
          }
          if (this.#context.state !== 'running') {
            throw new Error(`Arena V2 formal Web audio context未运行：${this.#context.state}。`);
          }
          this.#state = 'ready';
          return this;
        },
      );
    }).catch((error: unknown) => {
      if (this.#state !== 'preloaded') throw error;
      return this.#fail(error);
    }).finally(() => {
      try {
        this.#runSynchronousOperation(
          'Arena V2 formal Web audio激活终态水位',
          () => { this.#activationPending = false; },
        );
      } finally {
        this.#continueRequestedDisposal();
      }
    });
    void execution.then(activationOwner.resolve, activationOwner.reject);
    return this.#activationOperation;
  }

  play(value: unknown): void {
    this.#assertLive('Arena V2 formal Web audio play');
    this.#runSynchronousOperation('Arena V2 formal Web audio play', () => {
      if (this.#state !== 'ready' || this.#context.state !== 'running') {
        throw new Error('Arena V2 formal Web audio必须在用户手势激活后播放。');
      }
      try {
        const cue = resolveArenaV2FormalAudioCueCandidateV1(value);
        if (this.#recentSourceEventIds.includes(cue.sourceEventId)) {
          throw new RangeError(`Arena V2 formal Web audio拒绝重复事件${cue.sourceEventId}。`);
        }
        if (!cue.ready) {
          if (!this.#allowMissingCandidateCues) {
            throw new RangeError(
              `Arena V2正式音频未覆盖${cue.actionDefinitionId ?? cue.cueId}。`,
            );
          }
          this.#skippedMissingCueCount += 1;
          this.#recentSourceEventIds = [
            ...this.#recentSourceEventIds,
            cue.sourceEventId,
          ].slice(-RECENT_SOURCE_EVENT_LIMIT);
          return;
        }
        if (!cue.approved && !this.#allowUnapprovedCandidateCues) {
          throw new RangeError(
            `Arena V2 formal Web audio拒绝未批准候选${cue.audioAssetId ?? cue.cueId}。`,
          );
        }
        const buffer = cue.audioAssetId === null ? undefined : this.#buffers.get(cue.audioAssetId);
        if (buffer === undefined) {
          throw new RangeError(`Arena V2 formal Web audio ${cue.audioAssetId ?? cue.cueId}未预载。`);
        }
        if (this.#voices.size > MAXIMUM_CONCURRENT_VOICES) {
          throw new RangeError('Arena V2 formal Web audio voice池已越过8条硬上限。');
        }
        let evictionCandidate: ActiveVoice | null = null;
        if (this.#voices.size === MAXIMUM_CONCURRENT_VOICES) {
          const lowest = [...this.#voices.values()].sort(voiceOrder)[0];
          if (lowest === undefined) throw new Error('Arena V2 formal Web audio voice池状态无效。');
          if (cue.priority < lowest.priority) {
            this.#recentSourceEventIds = [
              ...this.#recentSourceEventIds,
              cue.sourceEventId,
            ].slice(-RECENT_SOURCE_EVENT_LIMIT);
            return;
          }
          evictionCandidate = lowest;
        }
        const currentVoiceOrdinal = this.#nextVoiceOrdinal;
        const nextVoiceOrdinal = currentVoiceOrdinal + 1;
        if (!Number.isSafeInteger(currentVoiceOrdinal)
          || !Number.isSafeInteger(nextVoiceOrdinal)) {
          throw new RangeError('Arena V2 formal Web audio voice ordinal已耗尽安全整数空间。');
        }
        if (evictionCandidate !== null) {
          const cleanupErrors = this.#stopVoice(evictionCandidate.sourceEventId);
          this.#assertCurrentOperationCommit();
          if (cleanupErrors.length > 0
            || this.#voices.has(evictionCandidate.sourceEventId)) {
            throw new AggregateError(
              cleanupErrors.length > 0
                ? cleanupErrors
                : [new Error('Arena V2 formal Web audio voice淘汰后仍保留清理债务。')],
              'Arena V2 formal Web audio voice淘汰失败。',
            );
          }
        }
        let source: AudioBufferSourceNode | null = null;
        let gain: GainNode | null = null;
        try {
          source = this.#context.createBufferSource();
          this.#assertCurrentOperationCommit();
          gain = this.#context.createGain();
          this.#assertCurrentOperationCommit();
          source.buffer = buffer;
          source.playbackRate.value = cue.playbackRate;
          gain.gain.value = dbToLinear(cue.gainDb);
          this.#assertCurrentOperationCommit();
          source.connect(gain);
          this.#assertCurrentOperationCommit();
          gain.connect(this.#sfxBus);
          this.#assertCurrentOperationCommit();
        } catch (error) {
          const debt: VoiceConstructionCleanupDebtCandidateV1 = { source, gain };
          this.#voiceConstructionCleanupDebts.add(debt);
          const cleanupErrors = this.#cleanupVoiceConstructionDebt(debt);
          throw aggregateFailure(
            'Arena V2 formal Web audio voice构造失败且回收不完整。',
            error,
            cleanupErrors,
          );
        }
        if (source === null || gain === null) {
          throw new Error('Arena V2 formal Web audio voice构造后节点缺失。');
        }
        let voice!: ActiveVoice;
        const endedListener: EventListener = () => {
          voice.cleanup.endedListenerRemoved = true;
          this.#settleEndedVoiceEventually(cue.sourceEventId, voice);
        };
        voice = Object.freeze({
          sourceEventId: cue.sourceEventId,
          priority: cue.priority,
          ordinal: currentVoiceOrdinal,
          source,
          gain,
          endedListener,
          cleanup: {
            endedListenerRemoved: false,
            playbackTerminated: false,
            sourceDisconnected: false,
            gainDisconnected: false,
          },
        });
        this.#nextVoiceOrdinal = nextVoiceOrdinal;
        this.#voices.set(cue.sourceEventId, voice);
        rejectThenable(
          source.addEventListener('ended', endedListener, { once: true }),
          `Arena V2 formal Web audio voice ${cue.sourceEventId} ended listener bind`,
        );
        this.#assertCurrentOperationCommit();
        try {
          source.start(0);
          this.#assertCurrentOperationCommit();
        } catch (error) {
          const cleanupErrors = this.#stopVoice(cue.sourceEventId);
          throw aggregateFailure(
            'Arena V2 formal Web audio启动voice失败。',
            error,
            cleanupErrors,
          );
        }
        this.#recentSourceEventIds = [
          ...this.#recentSourceEventIds,
          cue.sourceEventId,
        ].slice(-RECENT_SOURCE_EVENT_LIMIT);
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  stopAll(): void {
    this.#assertNoOperation('Arena V2 formal Web audio stopAll');
    if (this.#state === 'disposed') return;
    this.#runSynchronousOperation('Arena V2 formal Web audio stopAll', () => {
      const errors = this.#cleanupVoices(true);
      if (errors.length > 0) {
        this.#fail(new AggregateError(errors, 'Arena V2 formal Web audio停止失败。'));
      }
    });
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return this.#runSynchronousOperation('snapshot-read', () => Object.freeze({
      state: this.#state,
      contextState: this.#context.state,
      loadedAudioAssetIds: Object.freeze([...this.#buffers.keys()].sort()),
      pendingLoadCount: this.#pendingLoadAbortControllers.size,
      pendingLoadAbortRequestedCount: [...this.#pendingLoadAbortControllers.values()]
        .filter(({ signal }) => signal.aborted).length,
      activeVoiceCount: this.#voices.size,
      voiceConstructionCleanupDebtCount: this.#voiceConstructionCleanupDebts.size,
      activeSourceEventIds: Object.freeze([...this.#voices.keys()].sort()),
      recentSourceEventCount: this.#recentSourceEventIds.length,
      skippedMissingCueCount: this.#skippedMissingCueCount,
      busGraph: Object.freeze({
        route: 'voice-gain→SFX→Master→limiter→destination' as const,
        sfxGainDb: SFX_BUS_GAIN_DB,
        masterHeadroomDb: MASTER_HEADROOM_DB,
        limiterThresholdDb: LIMITER_THRESHOLD_DB,
        limiterRatio: LIMITER_RATIO,
      }),
      approvalMode: this.#allowUnapprovedCandidateCues
        ? 'isolated-unapproved-candidates'
        : 'production-approved-only',
      productionApprovedAudioAssetIds: PRODUCTION_APPROVED_AUDIO_ASSET_IDS,
      blockedAudioAssetIds: Object.freeze(this.#allowUnapprovedCandidateCues
        ? []
        : ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.audioRecords
          .map(({ audioAssetId }) => audioAssetId)
          .filter((assetId) => !PRODUCTION_APPROVED_AUDIO_ASSET_ID_SET.has(assetId))
          .sort()),
      allowUnapprovedCandidateCues: this.#allowUnapprovedCandidateCues,
      loadPending: this.#loadPending,
      activationPending: this.#activationPending,
      disposeRequested: this.#disposeRequested,
      contextCloseRequested: this.#contextCloseRequested,
      contextCloseCompleted: this.#contextCloseCompleted,
      lastError: this.#lastError,
    }));
  }

  dispose(): void {
    this.#assertNoOperation('Arena V2 formal Web audio dispose');
    if (this.#state === 'disposed') return;
    this.#runSynchronousOperation('Arena V2 formal Web audio dispose', () => {
      this.#disposeRequested = true;
      const errors = [...this.#attemptRequestedDisposal()];
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 formal Web audio销毁不完整。');
      }
    });
  }
}

export const ARENA_V2_FORMAL_WEB_AUDIO_PORT_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  productionApprovalCheckedBeforeFetch: true as const,
  productionApprovalUsesSharedLedgerIndex: true as const,
  defaultUnapprovedCandidateLoadingAllowed: false as const,
  isolatedCandidateLoadingRequiresExplicitOptIn: true as const,
  currentProductionApprovedAudioAssetCount: 0 as const,
  loadOperationPublishedBeforeFetch: true as const,
  activationOperationPublishedBeforeContextResume: true as const,
  repeatedLoadAndActivationCheckReentryBeforeOwnerReuse: true as const,
  allPublicLifecycleCommitsGuarded: true as const,
  endedVoiceSettlementReentersThroughOperationGuard: true as const,
  publicReadsRejectedDuringOperationCommit: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  fetchDecodeAndResumeCallsRetainAsyncOwnerBeforeReentryCheck: true as const,
  voiceNodeCallbacksCheckedBeforeVoiceOrRecentIdentityCommit: true as const,
  voiceBusAndContextCleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true as const,
  voiceBusAndContextOrdinaryFailureRetainsCurrentOwnerAndStopsLaterOwners: true as const,
  voiceCleanupUsesPlaybackSourceGainWatermarks: true as const,
  voiceCleanupUsesEndedListenerPlaybackSourceGainWatermarks: true as const,
  voiceEndedListenerOwnerPublishedBeforeRegistration: true as const,
  voiceEndedListenerRemovedBeforeTerminalPlaybackAndNodeCleanup: true as const,
  naturalEndedCommitsOnceListenerRemovalBeforeDeferredSettlement: true as const,
  voiceEndedDeferredSettlementFailureIsContained: true as const,
  constructorFailureExposesRetryableAudioGraphAndContextOwner: true as const,
  unpublishedVoiceNodesRetainedAsRetryableConstructionDebt: true as const,
  contextCloseOwnerCapturedBeforeReentryCheck: true as const,
  contextCloseSettlementHooksCapturedBeforeReentryCheck: true as const,
  swallowedWebAudioOrObserverReentryFailsClosed: true as const,
  eachDecodeSettlementCommitsUnderOperationGuard: true as const,
  loadAndActivationTerminalWatermarksCommitUnderOperationGuard: true as const,
  synchronousLoadLaunchFailureSettlesPublishedOwner: true as const,
  repeatedPendingLoadAndActivationReusePublishedOwners: true as const,
  loadingPhaseDecodeRequired: true as const,
  userGestureActivationRequired: true as const,
  maximumConcurrentVoices: MAXIMUM_CONCURRENT_VOICES,
  overflowPolicy: 'drop-lowest-priority' as const,
  equalPriorityOverflowPolicy: 'evict-oldest-for-newest-authority-event' as const,
  lowerPriorityIncomingPolicy: 'consume-and-drop-incoming' as const,
  voiceSelectionOrder: 'priority-ascending→ordinal-ascending→sourceEventId-ascending' as const,
  voiceOrdinalMustRemainSafeInteger: true as const,
  voiceOrdinalAdvanceValidatedBeforeEviction: true as const,
  evictionCleanupCompletesBeforeVoiceConstruction: true as const,
  droppedAndPlayedSourceEventsEnterRecentWindow: true as const,
  recentSourceEventLimit: RECENT_SOURCE_EVENT_LIMIT,
  busGraph: 'voice-gain→SFX→Master→limiter→destination' as const,
  masterHeadroomDb: MASTER_HEADROOM_DB,
  sfxBusGainDb: SFX_BUS_GAIN_DB,
  limiter: Object.freeze({
    thresholdDb: LIMITER_THRESHOLD_DB,
    kneeDb: LIMITER_KNEE_DB,
    ratio: LIMITER_RATIO,
    attackSeconds: LIMITER_ATTACK_SECONDS,
    releaseSeconds: LIMITER_RELEASE_SECONDS,
  }),
  deterministicPlaybackRateVariants: Object.freeze([0.96, 1, 1.04] as const),
  lateEndedCallbackCannotReleaseReplacementVoice: true as const,
  failedVoiceCleanupRetainsOriginalVoiceOwnership: true as const,
  voiceCleanupRetriesOnlyIncompleteNodes: true as const,
  busAndContextCleanupWaitForAllVoices: true as const,
  contextCloseRequestRetriesUntilAccepted: true as const,
  asynchronousContextCloseFailureReopensCleanupOwnership: true as const,
  contextCloseOutcomeIsSeparatedFromSettlementCommitFailure: true as const,
  successfulContextCloseWatermarkSurvivesCommitFailure: true as const,
  rejectedContextCloseReopensOwnershipAfterCommitFailure: true as const,
  contextCloseRequestIsNotCleanupCompletion: true as const,
  parentMustRetainOwnershipUntilContextCloseCompletes: true as const,
  loadAndActivationSettlementAutomaticallyContinueRequestedDisposal: true as const,
  contextCloseCompletionNotifiesOwningHost: true as const,
  contextCloseFailureRequiresExplicitOwnerRetry: true as const,
  terminalContinuationUsesAsyncSettlementNotPolling: true as const,
  lateLoadOrActivationCannotRefailClosedOwner: true as const,
  waitsForEntireAudioLoadBatchSettlement: true as const,
  reportsEveryRejectedAudioLoadInSettledBatch: true as const,
  contextCloseWaitsForAudioLoadingToSettle: true as const,
  pendingAudioFetchesOwnAbortControllers: true as const,
  disposalAbortsPendingAudioFetchesBeforeGraphCleanup: true as const,
  responseAndDecodeLaunchRejectClosedOwner: true as const,
  syntheticAudioFallbackAllowed: false as const,
  missingCandidateCuesFailByDefault: true as const,
  isolatedDevelopmentMaySilentlySkipMissingCandidateCues: true as const,
  unapprovedCandidateCuesFailByDefault: true as const,
  isolatedDevelopmentMayAuditionRegisteredCandidateCues: true as const,
  validationStatus: 'not-run' as const,
});
