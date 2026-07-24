import {
  PRESENTATION_ASSET_KIND,
  assertPresentationAssetRegistry,
  createCharacterPresentationDefinition,
  type CharacterPresentationDefinition,
  type PresentationAssetDefinition,
  type PresentationAssetRegistryPort,
} from '@number-strategy-jump/arena-presentation-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';

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
  #creating = false;

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

  create(options: unknown): unknown {
    if (this.#creating) throw new Error('ProgrammaticCharacterViewFactory 不允许 create 回调重入。');
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
    } finally {
      this.#creating = false;
    }
  }
}
