import {
  combineCleanupFailure,
  normalizeInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_INPUT_MAPPER_ID,
  ARENA_INPUT_SOURCE_MODE,
  copyLocalActionSidecarV2,
  copyMapperActionAffordance,
  createMappedSemanticInput,
  type ArenaInputSourceMode,
  type LocalActionSidecarV2Input,
} from './arena-input-mapper.js';
import { GestureRecognizer } from './gesture-recognizer.js';
import { cloneKnownRecord, integerAtLeast } from './input-validation.js';
import { RawControlState } from './raw-control-state.js';

interface InputMapperPort {
  readonly id: string;
  readonly map: (context: unknown) => unknown;
}

interface SafelyWrappedThrownError extends Error {
  originalError: unknown;
}

function safelyWrapThrownError(value: unknown, message: string): Error {
  const error = new Error(message) as SafelyWrappedThrownError;
  error.originalError = value;
  return error;
}

export interface InputSamplerDebugSnapshot {
  readonly participantId: string;
  readonly mapperId: string;
  readonly lastTick: number;
  readonly suspended: boolean;
  readonly sampling: boolean;
  readonly controls: ReturnType<RawControlState['getDebugSnapshot']>;
  readonly gestures: ReturnType<GestureRecognizer['getDebugSnapshot']>;
}

const OPTION_KEYS = new Set([
  'participantId',
  'viewport',
  'mapper',
  'layout',
  'gesture',
  'actionSourceMode',
]);
const MAPPER_KEYS = new Set(['id', 'map']);
const SAMPLE_OPTION_KEYS = new Set(['actionAffordance', 'localActionSidecar', 'eventSequence']);

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function mapperValue(value: unknown): InputMapperPort {
  const source = cloneKnownRecord(value, MAPPER_KEYS, 'InputSampler.mapper');
  const id = nonEmptyString(source.id, 'InputSampler.mapper.id');
  if (typeof source.map !== 'function') {
    throw new TypeError('InputSampler.mapper 必须实现 id/map。');
  }
  return Object.freeze({ id, map: source.map as (context: unknown) => unknown });
}

type InputSamplerOperation =
  | 'pointer-start'
  | 'pointer-move'
  | 'pointer-end'
  | 'pointer-cancel'
  | 'resize'
  | 'suspend'
  | 'resume'
  | 'sample'
  | 'debug-read'
  | 'destroy';

interface InputSamplerOwnedPorts {
  readonly raw: RawControlState;
  readonly gestures: GestureRecognizer;
}

export class InputSampler {
  readonly #participantId: string;
  readonly #mapper: InputMapperPort;
  readonly #actionSourceMode: ArenaInputSourceMode;
  #raw: RawControlState | null;
  #gestures: GestureRecognizer | null;
  #lastTick = -1;
  #suspended = false;
  #operation: InputSamplerOperation | null = null;
  #operationSequence = 0;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #failure: Error | null = null;
  #destroyed = false;

  constructor(options: unknown) {
    const source = cloneKnownRecord(options, OPTION_KEYS, 'InputSampler options');
    const participantId = nonEmptyString(source.participantId, 'InputSampler.participantId');
    const mapper = mapperValue(source.mapper);
    const actionSourceMode = source.actionSourceMode === undefined
      ? ARENA_INPUT_SOURCE_MODE.LEGACY
      : source.actionSourceMode;
    if (!Object.values(ARENA_INPUT_SOURCE_MODE).includes(actionSourceMode as ArenaInputSourceMode)) {
      throw new RangeError('InputSampler.actionSourceMode 无效。');
    }
    if (
      actionSourceMode === ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2
      && mapper.id !== ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY
    ) {
      throw new RangeError('local-sidecar-v2 仅支持 context-primary mapper。');
    }
    let raw: RawControlState | null = null;
    try {
      raw = new RawControlState({ viewport: source.viewport, layout: source.layout ?? {} });
      const gestures = new GestureRecognizer(source.gesture ?? {});
      this.#participantId = participantId;
      this.#mapper = mapper;
      this.#actionSourceMode = actionSourceMode as ArenaInputSourceMode;
      this.#raw = raw;
      this.#gestures = gestures;
    } catch (error) {
      const original = safelyWrapThrownError(error, 'InputSampler 构造失败。');
      const cleanupErrors: Error[] = [];
      try { raw?.destroy(); } catch (cleanupError) {
        cleanupErrors.push(safelyWrapThrownError(
          cleanupError,
          'InputSampler RawControlState 回滚失败。',
        ));
      }
      throw combineCleanupFailure(original, cleanupErrors, 'InputSampler 构造与回滚均失败。');
    }
    Object.freeze(this);
  }

  #assertUsable(): InputSamplerOwnedPorts {
    if (this.#destroyed || this.#raw === null || this.#gestures === null) {
      throw new Error('InputSampler 已销毁。');
    }
    if (this.#failure) {
      const error = new Error('InputSampler 已因采样失败关闭。');
      error.cause = this.#failure;
      throw error;
    }
    return Object.freeze({ raw: this.#raw, gestures: this.#gestures });
  }

  #beginOperation(operation: InputSamplerOperation): number {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        `InputSampler.${operation}() 不可重入；当前正在 ${this.#operation}()。`,
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
      throw new Error(`${label}缺少当前InputSampler操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #takeReentryError(): Error | null {
    const error = this.#reentryError;
    this.#reentryError = null;
    return error;
  }

  #finishOperation(sequence: number, failClosedOnReentry: boolean): void {
    const operation = this.#operation;
    const ownershipError = operation === null || this.#operationSequence !== sequence
      ? new Error('InputSampler操作所有权在结束前已失效。')
      : null;
    const reentryError = this.#reentryError;
    let reentryFailure: Error | null = null;
    if (reentryError !== null) {
      const terminal = failClosedOnReentry || this.#failure !== null;
      reentryFailure = new Error(
        operation === 'sample' && terminal
          ? 'InputSampler mapper 尝试重入采样或生命周期；采样已失败关闭。'
          : terminal
            ? `InputSampler.${operation ?? 'operation'}() 检测到重入并已失败关闭。`
            : `InputSampler.${operation ?? 'operation'}() 检测到重入；当前操作未提交。`,
      );
      reentryFailure.cause = reentryError;
      if (terminal && this.#failure === null) {
        this.#failure = reentryFailure;
        this.#suspended = true;
      }
    }
    this.#operation = null;
    this.#reentryError = null;
    if (ownershipError !== null) throw ownershipError;
    if (reentryFailure !== null) throw reentryFailure;
  }

  #runOperation<T>(
    operation: InputSamplerOperation,
    callback: (sequence: number) => T,
    failClosedOnReentry = true,
  ): T {
    const sequence = this.#beginOperation(operation);
    try {
      return callback(sequence);
    } finally {
      this.#finishOperation(sequence, failClosedOnReentry);
    }
  }

  #callOwnedPort<T>(
    sequence: number,
    label: string,
    callback: () => T,
  ): T {
    const result = callback();
    this.#assertCurrentOperationCommit(sequence, label);
    return result;
  }

  #fail(error: unknown, sequence: number): void {
    // Register the terminal state before touching cleanup or formatting the
    // caller's thrown value. `String(value)` and even reflective inspection of
    // a hostile Proxy are not safe during fail-closed handling.
    const terminalError = safelyWrapThrownError(error, 'InputSampler 采样失败。');
    this.#failure = terminalError;
    this.#suspended = true;
    const cleanupErrors: Error[] = [];
    if (this.#reentryError === null && this.#raw !== null) {
      try {
        this.#raw.suspend();
        this.#assertCurrentOperationCommit(sequence, 'InputSampler RawControlState terminal suspend');
      } catch (cleanupError) {
        cleanupErrors.push(safelyWrapThrownError(
          cleanupError,
          'InputSampler RawControlState terminal suspend 失败。',
        ));
      }
    }
    if (this.#reentryError === null && this.#gestures !== null) {
      try {
        this.#gestures.reset();
        this.#assertCurrentOperationCommit(sequence, 'InputSampler GestureRecognizer terminal reset');
      } catch (cleanupError) {
        cleanupErrors.push(safelyWrapThrownError(
          cleanupError,
          'InputSampler GestureRecognizer terminal reset 失败。',
        ));
      }
    }
    if (cleanupErrors.length > 0) {
      this.#failure = combineCleanupFailure(
        terminalError,
        cleanupErrors,
        'InputSampler terminal cleanup 不完整。',
      );
    }
  }

  pointerStart(point: unknown): boolean {
    return this.#runOperation('pointer-start', (sequence) => {
      const { raw } = this.#assertUsable();
      return this.#callOwnedPort(
        sequence,
        'InputSampler RawControlState pointerStart',
        () => raw.pointerStart(point),
      );
    });
  }

  pointerMove(point: unknown): boolean {
    return this.#runOperation('pointer-move', (sequence) => {
      const { raw } = this.#assertUsable();
      return this.#callOwnedPort(
        sequence,
        'InputSampler RawControlState pointerMove',
        () => raw.pointerMove(point),
      );
    });
  }

  pointerEnd(point: unknown): boolean {
    return this.#runOperation('pointer-end', (sequence) => {
      const { raw } = this.#assertUsable();
      return this.#callOwnedPort(
        sequence,
        'InputSampler RawControlState pointerEnd',
        () => raw.pointerEnd(point),
      );
    });
  }

  pointerCancel(point: unknown): boolean {
    return this.#runOperation('pointer-cancel', (sequence) => {
      const { raw } = this.#assertUsable();
      return this.#callOwnedPort(
        sequence,
        'InputSampler RawControlState pointerCancel',
        () => raw.pointerCancel(point),
      );
    });
  }

  resize(viewport: unknown): boolean {
    return this.#runOperation('resize', (sequence) => {
      const { raw, gestures } = this.#assertUsable();
      const changed = this.#callOwnedPort(
        sequence,
        'InputSampler RawControlState resize',
        () => raw.resize(viewport),
      );
      if (!changed) return false;
      try {
        this.#callOwnedPort(
          sequence,
          'InputSampler GestureRecognizer resize reset',
          () => gestures.reset(),
        );
        return true;
      } catch (error) {
        this.#fail(error, sequence);
        throw error;
      }
    });
  }

  suspend(): boolean {
    return this.#runOperation('suspend', (sequence) => {
      const { raw, gestures } = this.#assertUsable();
      if (this.#suspended) return false;
      try {
        this.#callOwnedPort(
          sequence,
          'InputSampler RawControlState suspend',
          () => raw.suspend(),
        );
        this.#callOwnedPort(
          sequence,
          'InputSampler GestureRecognizer suspend reset',
          () => gestures.reset(),
        );
        this.#suspended = true;
        return true;
      } catch (error) {
        this.#fail(error, sequence);
        throw error;
      }
    });
  }

  resume(): boolean {
    return this.#runOperation('resume', (sequence) => {
      const { raw, gestures } = this.#assertUsable();
      if (!this.#suspended) return false;
      try {
        this.#callOwnedPort(
          sequence,
          'InputSampler RawControlState resume',
          () => raw.resume(),
        );
        this.#callOwnedPort(
          sequence,
          'InputSampler GestureRecognizer resume reset',
          () => gestures.reset(),
        );
        this.#suspended = false;
        return true;
      } catch (error) {
        this.#fail(error, sequence);
        throw error;
      }
    });
  }

  sample(tickValue: unknown, options: unknown = {}): ArenaInputFrame {
    return this.#runOperation('sample', (sequence) => {
      const { raw, gestures } = this.#assertUsable();
      let copiedAffordance: ReturnType<typeof copyMapperActionAffordance> = null;
      let copiedLocalActionSidecar: LocalActionSidecarV2Input | undefined;
      let eventSequence: number | undefined;
      let tick = 0;
      let validationError: unknown = null;
      let hasValidationError = false;
      try {
        tick = integerAtLeast(tickValue, 0, 'InputSampler.tick');
        if (this.#suspended) throw new Error('InputSampler 暂停时不能采样。');
        if (this.#lastTick >= 0 && tick !== this.#lastTick + 1) {
          throw new RangeError(`InputSampler tick 必须连续：上次 ${this.#lastTick}，本次 ${tick}。`);
        }
        const sampleOptions = cloneKnownRecord(
          options,
          SAMPLE_OPTION_KEYS,
          'InputSampler sample options',
        );
        const hasLegacyAffordance = Object.hasOwn(sampleOptions, 'actionAffordance');
        const hasLocalSidecar = Object.hasOwn(sampleOptions, 'localActionSidecar');
        const hasEventSequence = Object.hasOwn(sampleOptions, 'eventSequence');
        if (hasLegacyAffordance && hasLocalSidecar) {
          throw new TypeError(
            'InputSampler sample 不得同时携带 legacy affordance 与 V2 local sidecar。',
          );
        }
        if (this.#actionSourceMode === ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2) {
          if (!hasLocalSidecar || sampleOptions.localActionSidecar === null
            || sampleOptions.localActionSidecar === undefined) {
            throw new TypeError('InputSampler V2 路径必须提供 localActionSidecar。');
          }
          if (!hasEventSequence) {
            throw new TypeError('InputSampler V2 路径必须提供 eventSequence。');
          }
          eventSequence = integerAtLeast(
            sampleOptions.eventSequence,
            0,
            'InputSampler.eventSequence',
          );
          copiedLocalActionSidecar = copyLocalActionSidecarV2(
            sampleOptions.localActionSidecar,
            { tick, eventSequence, participantId: this.#participantId },
          );
        } else {
          if (hasEventSequence) {
            throw new TypeError('legacy InputSampler 路径不得携带 eventSequence。');
          }
          if (hasLocalSidecar) {
            throw new TypeError('legacy InputSampler 路径不得携带 localActionSidecar。');
          }
          copiedAffordance = copyMapperActionAffordance(
            sampleOptions.actionAffordance ?? null,
            { tick, participantId: this.#participantId },
          );
        }
      } catch (error) {
        validationError = error;
        hasValidationError = true;
      }
      const validationReentry = this.#takeReentryError();
      if (validationReentry !== null) {
        const error = new Error(
          hasValidationError
            ? 'InputSampler sample 验证期间检测到重入；当前 sample 未提交，可同 tick 重试；future/额外字段校验未完成。'
            : 'InputSampler sample 验证期间检测到重入；当前 sample 未提交，可同 tick 重试。',
        );
        error.cause = validationReentry;
        if (hasValidationError) {
          (error as Error & { validationError: unknown }).validationError = validationError;
        }
        throw error;
      }
      if (hasValidationError) throw validationError;

      try {
        const rawSnapshot = this.#callOwnedPort(
          sequence,
          'InputSampler RawControlState consumeSnapshot',
          () => raw.consumeSnapshot(),
        );
        const gestureSnapshot = this.#callOwnedPort(
          sequence,
          'InputSampler GestureRecognizer sample',
          () => gestures.sample(tick, rawSnapshot),
        );
        const mappedCandidate = this.#mapper.map(Object.freeze({
          tick,
          ...(eventSequence === undefined ? {} : { eventSequence }),
          participantId: this.#participantId,
          raw: rawSnapshot,
          gestures: gestureSnapshot,
          ...(this.#actionSourceMode === ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2
            ? { localActionSidecar: copiedLocalActionSidecar }
            : { actionAffordance: copiedAffordance }),
        }));
        this.#assertCurrentOperationCommit(sequence, 'InputSampler mapper');
        const mapped = createMappedSemanticInput(
          mappedCandidate,
          `InputSampler(${this.#mapper.id})`,
        );
        this.#assertCurrentOperationCommit(sequence, 'InputSampler mapped semantic input');
        const frame = normalizeInputFrame({
          tick,
          participantId: this.#participantId,
          ...mapped,
        }, {
          expectedTick: tick,
          participantIds: [this.#participantId],
        });
        this.#assertCurrentOperationCommit(sequence, 'InputSampler normalized frame');
        this.#lastTick = tick;
        return frame;
      } catch (error) {
        this.#fail(error, sequence);
        throw error;
      }
    }, false);
  }

  getDebugSnapshot(): InputSamplerDebugSnapshot {
    return this.#runOperation('debug-read', (sequence) => {
      const { raw, gestures } = this.#assertUsable();
      const controls = this.#callOwnedPort(
        sequence,
        'InputSampler RawControlState debug snapshot',
        () => raw.getDebugSnapshot(),
      );
      const gestureSnapshot = this.#callOwnedPort(
        sequence,
        'InputSampler GestureRecognizer debug snapshot',
        () => gestures.getDebugSnapshot(),
      );
      return Object.freeze({
        participantId: this.#participantId,
        mapperId: this.#mapper.id,
        lastTick: this.#lastTick,
        suspended: this.#suspended,
        sampling: this.#operation === 'sample',
        controls,
        gestures: gestureSnapshot,
      });
    });
  }

  destroy(): void {
    this.#runOperation('destroy', (sequence) => {
      if (this.#destroyed && this.#raw === null && this.#gestures === null) return;
      this.#destroyed = true;
      this.#suspended = true;
      const cleanupErrors: Error[] = [];
      if (this.#raw !== null) {
        const raw = this.#raw;
        try {
          raw.destroy();
          this.#assertCurrentOperationCommit(sequence, 'InputSampler RawControlState destroy');
          this.#raw = null;
        } catch (error) {
          cleanupErrors.push(safelyWrapThrownError(
            error,
            'InputSampler RawControlState 销毁失败。',
          ));
        }
      }
      if (this.#reentryError === null && this.#gestures !== null) {
        const gestures = this.#gestures;
        try {
          gestures.destroy();
          this.#assertCurrentOperationCommit(sequence, 'InputSampler GestureRecognizer destroy');
          this.#gestures = null;
        } catch (error) {
          cleanupErrors.push(safelyWrapThrownError(
            error,
            'InputSampler GestureRecognizer 销毁失败。',
          ));
        }
      }
      if (cleanupErrors.length > 0) {
        throw combineCleanupFailure(
          cleanupErrors[0]!,
          cleanupErrors.slice(1),
          'InputSampler 资源销毁不完整。',
        );
      }
    });
  }
}

export const INPUT_SAMPLER_OPERATION_POLICY = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true as const,
  validationReentryBeforeRawConsumptionRemainsSameTickRetryable: true as const,
  rawGestureAndMapperCallbacksCheckedBeforeFramePublication: true as const,
  lastTickAdvancesOnlyAfterNormalizedFrameClosure: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  cleanupReentryRetainsCurrentAndLaterInputOwners: true as const,
  destroyFailuresRetainRetryOwnership: true as const,
  inputActionVocabularyRemainsMovePrimaryAndJump: true as const,
  validationStatus: 'not-run' as const,
});
