import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertProductUiIntentId,
  type ProductUiIntentId,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  PRODUCT_SESSION_STATE,
  type ProductSessionState,
} from '@number-strategy-jump/arena-product-state';

export const PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION = 1 as const;

export const PRODUCT_SCREEN_KIND = Object.freeze({
  LOADING: 'loading',
  MENU: 'menu',
  MATCHING: 'matching',
  GAMEPLAY: 'gameplay',
  RESULT: 'result',
  UNLOCK: 'unlock',
  ERROR: 'error',
  TERMINAL: 'terminal',
} as const);

export type ProductScreenKind = typeof PRODUCT_SCREEN_KIND[keyof typeof PRODUCT_SCREEN_KIND];
export type ProductScreenActiveState = Exclude<ProductSessionState, 'suspended'>;

export interface ProductScreenActionDefinition {
  readonly intentId: ProductUiIntentId;
  readonly labelMessageId: string;
}

export interface ProductScreenDefinitionJson {
  readonly schemaVersion: typeof PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly activeState: ProductScreenActiveState;
  readonly kind: ProductScreenKind;
  readonly sceneId: string;
  readonly titleMessageId: string;
  readonly bodyMessageId: string | null;
  readonly primaryAction: ProductScreenActionDefinition | null;
  readonly secondaryAction: ProductScreenActionDefinition | null;
  readonly announcementMessageId: string;
}

const DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'contentVersion', 'activeState', 'kind', 'sceneId',
  'titleMessageId', 'bodyMessageId', 'primaryAction', 'secondaryAction',
  'announcementMessageId',
]);
const ACTION_KEYS = new Set(['intentId', 'labelMessageId']);
const ACTIVE_STATES: ReadonlySet<unknown> = new Set(
  Object.values(PRODUCT_SESSION_STATE).filter((state) => state !== PRODUCT_SESSION_STATE.SUSPENDED),
);
const SCREEN_KINDS: ReadonlySet<unknown> = new Set(Object.values(PRODUCT_SCREEN_KIND));

function nullableMessageId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function cloneAction(value: unknown, name: string): ProductScreenActionDefinition | null {
  if (value === null) return null;
  assertKnownKeys(value, ACTION_KEYS, name);
  return Object.freeze({
    intentId: assertProductUiIntentId(value.intentId, `${name}.intentId`),
    labelMessageId: assertNonEmptyString(value.labelMessageId, `${name}.labelMessageId`),
  });
}

export class ProductScreenDefinition implements ProductScreenDefinitionJson {
  readonly schemaVersion = PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly activeState: ProductScreenActiveState;
  readonly kind: ProductScreenKind;
  readonly sceneId: string;
  readonly titleMessageId: string;
  readonly bodyMessageId: string | null;
  readonly primaryAction: ProductScreenActionDefinition | null;
  readonly secondaryAction: ProductScreenActionDefinition | null;
  readonly announcementMessageId: string;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'ProductScreenDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'ProductScreenDefinition');
    if (source.schemaVersion !== PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 ProductScreenDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    const activeState = assertNonEmptyString(source.activeState, 'ProductScreenDefinition.activeState');
    if (!ACTIVE_STATES.has(activeState)) {
      throw new RangeError(`ProductScreenDefinition.activeState 不受支持：${activeState}。`);
    }
    if (!SCREEN_KINDS.has(source.kind)) {
      throw new RangeError(`ProductScreenDefinition.kind 不受支持：${String(source.kind)}。`);
    }
    const primaryAction = cloneAction(source.primaryAction, 'ProductScreenDefinition.primaryAction');
    const secondaryAction = cloneAction(
      source.secondaryAction,
      'ProductScreenDefinition.secondaryAction',
    );
    if (
      primaryAction !== null
      && secondaryAction !== null
      && primaryAction.intentId === secondaryAction.intentId
    ) {
      throw new RangeError('ProductScreenDefinition 主次动作不能使用同一 intent。');
    }
    this.id = assertNonEmptyString(source.id, 'ProductScreenDefinition.id');
    this.contentVersion = assertIntegerAtLeast(
      source.contentVersion,
      1,
      'ProductScreenDefinition.contentVersion',
    );
    this.activeState = activeState as ProductScreenActiveState;
    this.kind = source.kind as ProductScreenKind;
    this.sceneId = assertNonEmptyString(source.sceneId, 'ProductScreenDefinition.sceneId');
    this.titleMessageId = assertNonEmptyString(
      source.titleMessageId,
      'ProductScreenDefinition.titleMessageId',
    );
    this.bodyMessageId = nullableMessageId(
      source.bodyMessageId,
      'ProductScreenDefinition.bodyMessageId',
    );
    this.primaryAction = primaryAction;
    this.secondaryAction = secondaryAction;
    this.announcementMessageId = assertNonEmptyString(
      source.announcementMessageId,
      'ProductScreenDefinition.announcementMessageId',
    );
    Object.freeze(this);
  }

  toJSON(): ProductScreenDefinitionJson {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      activeState: this.activeState,
      kind: this.kind,
      sceneId: this.sceneId,
      titleMessageId: this.titleMessageId,
      bodyMessageId: this.bodyMessageId,
      primaryAction: this.primaryAction,
      secondaryAction: this.secondaryAction,
      announcementMessageId: this.announcementMessageId,
    };
  }

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON(), `ProductScreenDefinition ${this.id}`);
  }
}

export function createProductScreenDefinition(value: unknown): ProductScreenDefinition {
  return value instanceof ProductScreenDefinition ? value : new ProductScreenDefinition(value);
}
