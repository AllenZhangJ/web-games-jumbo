import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import { PRODUCT_SESSION_STATE } from '../../product/state/product-session-transition-definition.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import { assertProductUiIntentId } from './product-ui-intent.js';

export const PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION = 1;

export const PRODUCT_SCREEN_KIND = Object.freeze({
  LOADING: 'loading',
  MENU: 'menu',
  MATCHING: 'matching',
  GAMEPLAY: 'gameplay',
  RESULT: 'result',
  UNLOCK: 'unlock',
  ERROR: 'error',
  TERMINAL: 'terminal',
});

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'activeState',
  'kind',
  'sceneId',
  'titleMessageId',
  'bodyMessageId',
  'primaryAction',
  'secondaryAction',
  'announcementMessageId',
]);
const ACTION_KEYS = new Set(['intentId', 'labelMessageId']);
const ACTIVE_STATES = new Set(
  Object.values(PRODUCT_SESSION_STATE).filter((state) => state !== PRODUCT_SESSION_STATE.SUSPENDED),
);

function nullableMessageId(value, name) {
  return value === null
    ? null
    : assertNonEmptyString(value, name);
}

function cloneAction(value, name) {
  if (value === null) return null;
  assertKnownKeys(value, ACTION_KEYS, name);
  return Object.freeze({
    intentId: assertProductUiIntentId(value.intentId, `${name}.intentId`),
    labelMessageId: assertNonEmptyString(
      value.labelMessageId,
      `${name}.labelMessageId`,
    ),
  });
}

export class ProductScreenDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'ProductScreenDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'ProductScreenDefinition');
    if (source.schemaVersion !== PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 ProductScreenDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    const activeState = assertNonEmptyString(
      source.activeState,
      'ProductScreenDefinition.activeState',
    );
    if (!ACTIVE_STATES.has(activeState)) {
      throw new RangeError(`ProductScreenDefinition.activeState 不受支持：${activeState}。`);
    }
    if (!Object.values(PRODUCT_SCREEN_KIND).includes(source.kind)) {
      throw new RangeError(`ProductScreenDefinition.kind 不受支持：${String(source.kind)}。`);
    }
    const primaryAction = cloneAction(
      source.primaryAction,
      'ProductScreenDefinition.primaryAction',
    );
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
    Object.defineProperties(this, {
      schemaVersion: {
        value: PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: assertNonEmptyString(source.id, 'ProductScreenDefinition.id'),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'ProductScreenDefinition.contentVersion',
        ),
        enumerable: true,
      },
      activeState: { value: activeState, enumerable: true },
      kind: { value: source.kind, enumerable: true },
      sceneId: {
        value: assertNonEmptyString(source.sceneId, 'ProductScreenDefinition.sceneId'),
        enumerable: true,
      },
      titleMessageId: {
        value: assertNonEmptyString(
          source.titleMessageId,
          'ProductScreenDefinition.titleMessageId',
        ),
        enumerable: true,
      },
      bodyMessageId: {
        value: nullableMessageId(
          source.bodyMessageId,
          'ProductScreenDefinition.bodyMessageId',
        ),
        enumerable: true,
      },
      primaryAction: { value: primaryAction, enumerable: true },
      secondaryAction: { value: secondaryAction, enumerable: true },
      announcementMessageId: {
        value: assertNonEmptyString(
          source.announcementMessageId,
          'ProductScreenDefinition.announcementMessageId',
        ),
        enumerable: true,
      },
    });
    Object.freeze(this);
  }

  toJSON() {
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

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `ProductScreenDefinition ${this.id}`);
  }
}

export function createProductScreenDefinition(value) {
  return value instanceof ProductScreenDefinition
    ? value
    : new ProductScreenDefinition(value);
}
