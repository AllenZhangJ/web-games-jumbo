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
}

interface NormalizedOptions {
  readonly createQuickMatch: (options: Readonly<Record<string, unknown>>) => unknown;
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
    matchConfig,
    completionSink: completionSink as ProductMatchCompletionSink | null,
  });
}

function snapshotLocalMatchDestroy(value: unknown): () => unknown {
  const record = requireRecord(value, 'QuickMatchProductFactory localMatch');
  const session = readRequiredDataField(record, 'session', 'QuickMatchProductFactory localMatch');
  return snapshotMethod<() => unknown>(session, 'destroy', 'LocalMatchSession');
}

export class QuickMatchProductFactory implements ProductMatchFactoryPort {
  readonly #createQuickMatch: (options: Readonly<Record<string, unknown>>) => unknown;
  readonly #matchConfig: Readonly<Record<string, unknown>>;
  readonly #completionSink: ProductMatchCompletionSink | null;
  #creating = false;

  constructor(options: QuickMatchProductFactoryOptions) {
    const normalized = normalizeOptions(options);
    this.#createQuickMatch = normalized.createQuickMatch;
    this.#matchConfig = normalized.matchConfig;
    this.#completionSink = normalized.completionSink;
    Object.freeze(this);
  }

  create(): ProductMatchRuntime {
    if (this.#creating) throw new Error('QuickMatchProductFactory.create() 不可重入。');
    this.#creating = true;
    let localMatch: unknown = null;
    let destroyLocalMatch: (() => unknown) | null = null;
    try {
      // The product surface intentionally exposes neither difficulty override
      // nor hidden assignment diagnostics.
      localMatch = this.#createQuickMatch(Object.freeze({ config: this.#matchConfig }));
      containRejectedAsyncReturn(localMatch, 'QuickMatchService.create');
      destroyLocalMatch = snapshotLocalMatchDestroy(localMatch);
      const runtime = new ProductMatchRuntime(localMatch, {
        completionSink: this.#completionSink,
      });
      destroyLocalMatch = null;
      return runtime;
    } catch (error) {
      const cleanupErrors: Error[] = [];
      if (destroyLocalMatch) {
        try {
          destroyLocalMatch();
        } catch (cleanupError) {
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
    } finally {
      this.#creating = false;
    }
  }
}

export function createProductMatchFactoryPort(value: unknown): Readonly<ProductMatchFactoryPort> {
  return Object.freeze({
    create: snapshotMethod<ProductMatchFactoryPort['create']>(
      value,
      'create',
      'ProductMatchFactory',
    ),
  });
}
