import {
  assertKnownKeys,
  cloneFrozenData,
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  containRejectedAsyncReturn,
  readOptionalDataField,
  readRequiredDataField,
  requireRecord,
  snapshotMethod,
  snapshotOptionalMethod,
} from './ports.js';
import {
  ProductMatchRuntime,
  type ProductMatchCompletionSink,
} from './product-match-runtime.js';

export interface QuickMatchProductFactoryOptions {
  readonly quickMatchService: unknown;
  readonly matchConfig?: Readonly<Record<string, unknown>>;
  readonly completionSink?: ProductMatchCompletionSink | null;
}

export interface ProductMatchFactoryPort {
  create(): unknown;
  readonly retryPendingCleanup?: () => void;
  readonly hasPendingCleanup?: () => boolean;
  readonly destroy?: () => void;
}

interface NormalizedOptions {
  readonly createQuickMatch: (options: Readonly<Record<string, unknown>>) => unknown;
  readonly destroyQuickMatchService: (() => unknown) | null;
  readonly matchConfig: Readonly<Record<string, unknown>>;
  readonly completionSink: ProductMatchCompletionSink | null;
}

const OPTION_KEYS = new Set(['quickMatchService', 'matchConfig', 'completionSink']);

function normalizeOptions(value: unknown): Readonly<NormalizedOptions> {
  assertKnownKeys(value, OPTION_KEYS, 'QuickMatchProductFactory options');
  const record = requireRecord(value, 'QuickMatchProductFactory options');
  const quickMatchService = readRequiredDataField(
    record,
    'quickMatchService',
    'QuickMatchProductFactory options',
  );
  const matchConfig = requireRecord(
    cloneFrozenData(
      readOptionalDataField(record, 'matchConfig', 'QuickMatchProductFactory options', {}),
      'QuickMatchProductFactory matchConfig',
    ),
    'QuickMatchProductFactory matchConfig',
  );
  const completionSink = readOptionalDataField(
    record,
    'completionSink',
    'QuickMatchProductFactory options',
    null,
  );
  if (completionSink !== null && typeof completionSink !== 'function') {
    throw new TypeError('QuickMatchProductFactory completionSink 必须是函数或 null。');
  }
  return Object.freeze({
    createQuickMatch: snapshotMethod<NormalizedOptions['createQuickMatch']>(
      quickMatchService,
      'create',
      'QuickMatchService',
    ),
    destroyQuickMatchService: snapshotOptionalMethod<() => unknown>(
      quickMatchService,
      'destroy',
      'QuickMatchService',
    ),
    matchConfig,
    completionSink: completionSink as ProductMatchCompletionSink | null,
  });
}

function snapshotLocalMatchDestroy(value: unknown): () => unknown {
  const record = requireRecord(value, 'QuickMatchProductFactory localMatch');
  const session = readRequiredDataField(record, 'session', 'QuickMatchProductFactory localMatch');
  return snapshotMethod<() => unknown>(session, 'destroy', 'LocalMatchSession');
}

type QuickMatchProductFactoryOperation =
  | 'create'
  | 'cleanup-retry'
  | 'pending-cleanup-read'
  | 'destroy';

export const QUICK_MATCH_PRODUCT_FACTORY_OPERATION_GUARD_V1 = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true,
  createCandidateCleanupCapturedBeforeReentryRejection: true,
  swallowedCreateReentryPreventsRuntimePublication: true,
  cleanupCallbackCheckedBeforeOwnershipRelease: true,
  publicPendingReadRejectsOperationIntermediateState: true,
  destroyRetainsServiceOwnershipAcrossReentry: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
  validationStatus: 'not-run',
} as const);

export class QuickMatchProductFactory implements ProductMatchFactoryPort {
  readonly #createQuickMatch: (options: Readonly<Record<string, unknown>>) => unknown;
  #destroyQuickMatchService: (() => unknown) | null;
  readonly #matchConfig: Readonly<Record<string, unknown>>;
  readonly #completionSink: ProductMatchCompletionSink | null;
  #cleanupRetry: (() => unknown) | null = null;
  #destroyRequested = false;
  #destroyed = false;
  #operation: QuickMatchProductFactoryOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(options: QuickMatchProductFactoryOptions) {
    const normalized = normalizeOptions(options);
    this.#createQuickMatch = normalized.createQuickMatch;
    this.#destroyQuickMatchService = normalized.destroyQuickMatchService;
    this.#matchConfig = normalized.matchConfig;
    this.#completionSink = normalized.completionSink;
    Object.freeze(this);
  }

  #recordReentry(requestedOperation: QuickMatchProductFactoryOperation): Error {
    this.#reentrySequence += 1;
    if (this.#reentryError === null) {
      this.#reentryError = new Error(
        `QuickMatchProductFactory ${String(this.#operation)}期间不可重入${requestedOperation}。`,
      );
    }
    return this.#reentryError;
  }

  #runOperation<T>(operation: QuickMatchProductFactoryOperation, callback: () => T): T {
    if (this.#operation !== null) throw this.#recordReentry(operation);
    this.#operation = operation;
    const sequence = this.#reentrySequence;
    try {
      const result = callback();
      if (this.#reentrySequence !== sequence) {
        throw this.#reentryError
          ?? new Error(`QuickMatchProductFactory ${operation}期间发生重入。`);
      }
      return result;
    } finally {
      this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertOperationReady(operation: QuickMatchProductFactoryOperation): void {
    if (this.#reentryError !== null) throw this.#reentryError;
    if (this.#operation !== operation) {
      throw new Error(`QuickMatchProductFactory ${operation}缺少操作所有权。`);
    }
  }

  #retryPendingCleanupInsideOperation(operation: QuickMatchProductFactoryOperation): void {
    const cleanup = this.#cleanupRetry;
    if (!cleanup) return;
    try {
      containRejectedAsyncReturn(cleanup(), 'QuickMatchProductFactory LocalMatchSession 重试清理');
      this.#assertOperationReady(operation);
      this.#cleanupRetry = null;
    } catch (error) {
      throw normalizeThrownError(error, 'QuickMatchProductFactory LocalMatchSession 重试清理失败');
    }
  }

  create(): ProductMatchRuntime {
    return this.#runOperation('create', () => {
      if (this.#destroyRequested || this.#destroyed) {
        throw new Error('QuickMatchProductFactory已销毁。');
      }
      let localMatch: unknown = null;
      let destroyLocalMatch: (() => unknown) | null = null;
      try {
        this.#retryPendingCleanupInsideOperation('create');
        // The product surface intentionally exposes neither difficulty override
        // nor hidden assignment diagnostics.
        localMatch = this.#createQuickMatch(Object.freeze({ config: this.#matchConfig }));
        containRejectedAsyncReturn(localMatch, 'QuickMatchService.create');
        destroyLocalMatch = snapshotLocalMatchDestroy(localMatch);
        this.#assertOperationReady('create');
        const runtime = new ProductMatchRuntime(localMatch, {
          completionSink: this.#completionSink,
        });
        this.#assertOperationReady('create');
        destroyLocalMatch = null;
        return runtime;
      } catch (error) {
        const cleanupErrors: Error[] = [];
        if (destroyLocalMatch) {
          const cleanup = destroyLocalMatch;
          const cleanupReentrySequence = this.#reentrySequence;
          try {
            containRejectedAsyncReturn(
              cleanup(),
              'QuickMatchProductFactory LocalMatchSession 清理失败',
            );
            if (this.#reentrySequence === cleanupReentrySequence) {
              destroyLocalMatch = null;
            } else {
              throw this.#reentryError
                ?? new Error('QuickMatchProductFactory LocalMatchSession清理期间发生重入。');
            }
          } catch (cleanupError) {
            if (destroyLocalMatch !== null) this.#cleanupRetry = cleanup;
            cleanupErrors.push(normalizeThrownError(
              cleanupError,
              'QuickMatchProductFactory LocalMatchSession 清理失败',
            ));
          }
        }
        throw combineCleanupFailure(
          normalizeThrownError(error, 'QuickMatchProductFactory 创建失败'),
          cleanupErrors,
          'QuickMatchProductFactory 创建失败且清理未完整完成。',
        );
      }
    });
  }

  retryPendingCleanup(): void {
    this.#runOperation('cleanup-retry', () => {
      this.#retryPendingCleanupInsideOperation('cleanup-retry');
    });
  }

  hasPendingCleanup(): boolean {
    return this.#runOperation('pending-cleanup-read', () => (
      this.#cleanupRetry !== null
        || (this.#destroyRequested && this.#destroyQuickMatchService !== null)
    ));
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#destroyed) return;
      this.#destroyRequested = true;
      this.#retryPendingCleanupInsideOperation('destroy');
      this.#assertOperationReady('destroy');
      if (this.#destroyQuickMatchService !== null) {
        try {
          const result = this.#destroyQuickMatchService();
          containRejectedAsyncReturn(
            result,
            'QuickMatchProductFactory QuickMatchService destroy',
          );
          this.#assertOperationReady('destroy');
          this.#destroyQuickMatchService = null;
        } catch (error) {
          throw normalizeThrownError(
            error,
            'QuickMatchProductFactory QuickMatchService清理失败',
          );
        }
      }
      this.#assertOperationReady('destroy');
      this.#destroyed = true;
    });
  }
}

export function createProductMatchFactoryPort(value: unknown): Readonly<ProductMatchFactoryPort> {
  const retryPendingCleanup = snapshotOptionalMethod<() => void>(
    value,
    'retryPendingCleanup',
    'ProductMatchFactory',
  );
  const hasPendingCleanup = snapshotOptionalMethod<() => boolean>(
    value,
    'hasPendingCleanup',
    'ProductMatchFactory',
  );
  const destroy = snapshotOptionalMethod<() => unknown>(
    value,
    'destroy',
    'ProductMatchFactory',
  );
  return Object.freeze({
    create: snapshotMethod<ProductMatchFactoryPort['create']>(
      value,
      'create',
      'ProductMatchFactory',
    ),
    ...(retryPendingCleanup
      ? {
        retryPendingCleanup: (): void => {
          const result = retryPendingCleanup();
          containRejectedAsyncReturn(result, 'ProductMatchFactory.retryPendingCleanup');
        },
      }
      : {}),
    ...(hasPendingCleanup
      ? {
        hasPendingCleanup: (): boolean => {
          const result = hasPendingCleanup();
          containRejectedAsyncReturn(result, 'ProductMatchFactory.hasPendingCleanup');
          if (typeof result !== 'boolean') {
            throw new TypeError('ProductMatchFactory.hasPendingCleanup 必须返回 boolean。');
          }
          return result;
        },
      }
      : {}),
    ...(destroy
      ? {
        destroy: (): void => {
          const result = destroy();
          containRejectedAsyncReturn(result, 'ProductMatchFactory.destroy');
        },
      }
      : {}),
  });
}
