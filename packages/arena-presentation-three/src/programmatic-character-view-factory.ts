import {
  PRESENTATION_ASSET_KIND,
  assertPresentationAssetRegistry,
  createCharacterPresentationDefinition,
  type CharacterPresentationDefinition,
  type PresentationAssetDefinition,
  type PresentationAssetRegistryPort,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  assertSynchronousReturn as rejectThenable,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import {
  ProgrammaticCharacterBuildConstructionCleanupError,
  ProgrammaticCharacterViewConstructionCleanupError,
  type ProgrammaticCharacterConstructionCleanupDebt,
} from './programmatic-character-view.js';

interface ProgrammaticCharacterViewOptions {
  readonly participantId: string;
  readonly presentationDefinition: CharacterPresentationDefinition;
  readonly assetDefinition: PresentationAssetDefinition;
  readonly actionPresentations: Readonly<Record<string, object>>;
}

type CreateView = (options: Readonly<ProgrammaticCharacterViewOptions>) => unknown;

const OPTION_KEYS = new Set<PropertyKey>([
  'assetRegistry', 'actionPresentations', 'createView',
]);
const CREATE_KEYS = new Set<PropertyKey>(['participantId', 'presentationDefinition']);

function ownData(value: unknown, field: PropertyKey, name: string): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  }
  return descriptor.value;
}

function assertKnownKeys(value: unknown, allowed: ReadonlySet<PropertyKey>, name: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function snapshotActionPresentations(value: unknown): Readonly<Record<string, object>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ProgrammaticCharacterViewFactory actionPresentations 必须是对象。');
  }
  const result = cloneFrozenData(value, 'ProgrammaticCharacterViewFactory actionPresentations');
  for (const [key, entry] of Object.entries(result)) {
    if (key.length === 0 || !entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TypeError(`ProgrammaticCharacterViewFactory actionPresentations.${key} 必须是对象。`);
    }
  }
  return result as Readonly<Record<string, object>>;
}

export class ProgrammaticCharacterViewFactory {
  readonly #assetRegistry: PresentationAssetRegistryPort;
  readonly #actionPresentations: Readonly<Record<string, object>>;
  readonly #createView: CreateView;
  readonly #constructionCleanupDebts = new Set<ProgrammaticCharacterConstructionCleanupDebt>();
  #creating = false;
  #cleaning = false;
  #cleanupReentryDetected = false;
  #destroyRequested = false;
  #failedError: unknown = null;
  #disposed = false;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'ProgrammaticCharacterViewFactory options');
    this.#assetRegistry = assertPresentationAssetRegistry(
      ownData(options, 'assetRegistry', 'ProgrammaticCharacterViewFactory options'),
    );
    this.#actionPresentations = snapshotActionPresentations(
      ownData(options, 'actionPresentations', 'ProgrammaticCharacterViewFactory options'),
    );
    const createView = ownData(options, 'createView', 'ProgrammaticCharacterViewFactory options');
    if (typeof createView !== 'function') {
      throw new TypeError('ProgrammaticCharacterViewFactory createView 必须是函数。');
    }
    this.#createView = createView as CreateView;
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#cleaning) {
      this.#cleanupReentryDetected = true;
      throw new Error('ProgrammaticCharacterViewFactory 清理回调不可反调公开API。');
    }
    if (this.#disposed || this.#destroyRequested) {
      throw new Error('ProgrammaticCharacterViewFactory 已销毁。');
    }
    if (this.#failedError) {
      const error = new Error('ProgrammaticCharacterViewFactory 已失败。');
      error.cause = this.#failedError;
      throw error;
    }
    if (this.#creating) throw new Error('ProgrammaticCharacterViewFactory 不允许 create 回调重入。');
  }

  create(options: unknown): unknown {
    this.#assertUsable();
    assertKnownKeys(options, CREATE_KEYS, 'ProgrammaticCharacterViewFactory create options');
    const participantId = nonEmptyString(
      ownData(options, 'participantId', 'ProgrammaticCharacterViewFactory create options'),
      'ProgrammaticCharacterViewFactory participantId',
    );
    const presentationDefinition = createCharacterPresentationDefinition(
      ownData(options, 'presentationDefinition', 'ProgrammaticCharacterViewFactory create options'),
    );
    const asset = this.#assetRegistry.require(presentationDefinition.modelAssetId);
    if (
      asset.kind !== PRESENTATION_ASSET_KIND.CHARACTER_MODEL
      || asset.providerId !== ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1
    ) {
      throw new RangeError(`asset ${asset.id} 不能由程序化角色 Factory 创建。`);
    }
    this.#creating = true;
    try {
      return this.#createView(Object.freeze({
        participantId,
        presentationDefinition,
        assetDefinition: asset,
        actionPresentations: this.#actionPresentations,
      }));
    } catch (error) {
      if (
        error instanceof ProgrammaticCharacterViewConstructionCleanupError
        || error instanceof ProgrammaticCharacterBuildConstructionCleanupError
      ) {
        this.#constructionCleanupDebts.add(error);
        this.#failedError = error;
      }
      throw error;
    } finally {
      this.#creating = false;
    }
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    return Object.freeze({
      constructionCleanupDebtCount: this.#constructionCleanupDebts.size,
    });
  }

  dispose(): void {
    if (this.#cleaning) {
      this.#cleanupReentryDetected = true;
      throw new Error('ProgrammaticCharacterViewFactory 清理不可重入。');
    }
    if (this.#disposed) return;
    if (this.#creating) throw new Error('ProgrammaticCharacterViewFactory create 期间不能销毁。');
    this.#destroyRequested = true;
    this.#cleaning = true;
    this.#cleanupReentryDetected = false;
    const errors: unknown[] = [];
    try {
      for (const debt of [...this.#constructionCleanupDebts]) {
        try {
          rejectThenable(
            debt.retryCleanup(),
            'ProgrammaticCharacterViewFactory construction debt.retryCleanup()',
          );
          if (this.#cleanupReentryDetected) {
            throw new Error('ProgrammaticCharacterViewFactory 构造债务清理发生Factory反调。');
          }
          const cleanupComplete = debt.cleanupComplete;
          if (this.#cleanupReentryDetected) {
            throw new Error('ProgrammaticCharacterViewFactory 构造债务完成确认发生Factory反调。');
          }
          if (!cleanupComplete) throw new Error('程序化角色View构造清理依赖尚未收敛。');
          this.#constructionCleanupDebts.delete(debt);
        } catch (error) {
          errors.push(error);
          break;
        }
      }
      this.#disposed = this.#constructionCleanupDebts.size === 0;
    } finally {
      this.#cleaning = false;
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'ProgrammaticCharacterViewFactory 清理未完整完成。');
    }
  }
}

export const PROGRAMMATIC_CHARACTER_VIEW_FACTORY_LIFECYCLE_V1 = Object.freeze({
  failedConstructionCleanupRetainsFactoryOwnership: true as const,
  incompleteConstructionCleanupClosesFactoryToCreate: true as const,
  factoryDisposeRetriesOnlyIncompleteConstructionDebt: true as const,
  failedBuilderCleanupRetainsFactoryOwnership: true as const,
  currentDebtFailureRetainsCurrentAndLaterDebts: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  swallowedFactoryReentryRejectsDebtCommit: true as const,
  validationStatus: 'not-run' as const,
});
