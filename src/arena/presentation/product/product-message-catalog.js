import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '../../rules/definition-utils.js';

export const PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION = 1;

const CATALOG_KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'locale',
  'messages',
]);
const PLACEHOLDER_PATTERN = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

function parsePlaceholders(message, name) {
  const placeholders = [];
  const stripped = message.replace(PLACEHOLDER_PATTERN, (_, placeholder) => {
    placeholders.push(placeholder);
    return '';
  });
  if (/[{}]/.test(stripped)) throw new RangeError(`${name} 包含无效占位符。`);
  return Object.freeze([...new Set(placeholders)].sort());
}

function cloneMessages(value) {
  assertPlainRecord(value, 'ProductMessageCatalog.messages');
  const messages = {};
  const placeholders = {};
  for (const messageId of Object.keys(value).sort()) {
    const id = assertNonEmptyString(messageId, 'ProductMessageCatalog messageId');
    const message = assertNonEmptyString(
      value[messageId],
      `ProductMessageCatalog.messages.${id}`,
    );
    messages[id] = message;
    placeholders[id] = parsePlaceholders(
      message,
      `ProductMessageCatalog.messages.${id}`,
    );
  }
  if (Object.keys(messages).length === 0) {
    throw new RangeError('ProductMessageCatalog.messages 不能为空。');
  }
  return Object.freeze({
    messages: Object.freeze(messages),
    placeholders: Object.freeze(placeholders),
  });
}

function formatParameter(value, name) {
  if (typeof value === 'string') return value;
  if (Number.isFinite(value)) return String(value);
  throw new TypeError(`${name} 必须是字符串或有限数。`);
}

export class ProductMessageCatalog {
  #messages;
  #placeholders;

  constructor(value) {
    const source = cloneFrozenData(value, 'ProductMessageCatalog');
    assertKnownKeys(source, CATALOG_KEYS, 'ProductMessageCatalog');
    if (source.schemaVersion !== PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 ProductMessageCatalog schema ${String(source.schemaVersion)}。`,
      );
    }
    const cloned = cloneMessages(source.messages);
    this.#messages = cloned.messages;
    this.#placeholders = cloned.placeholders;
    Object.defineProperties(this, {
      schemaVersion: {
        value: PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: assertNonEmptyString(source.id, 'ProductMessageCatalog.id'),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'ProductMessageCatalog.contentVersion',
        ),
        enumerable: true,
      },
      locale: {
        value: assertNonEmptyString(source.locale, 'ProductMessageCatalog.locale'),
        enumerable: true,
      },
    });
    Object.freeze(this);
  }

  has(messageId) {
    return Object.prototype.hasOwnProperty.call(this.#messages, messageId);
  }

  require(messageId) {
    if (!this.has(messageId)) {
      throw new RangeError(`ProductMessageCatalog 缺少 message ${String(messageId)}。`);
    }
    return this.#messages[messageId];
  }

  format(messageId, parameterValues = {}) {
    const message = this.require(messageId);
    const parameters = cloneFrozenData(
      parameterValues,
      `ProductMessageCatalog parameters ${messageId}`,
    );
    assertPlainRecord(parameters, `ProductMessageCatalog parameters ${messageId}`);
    const expected = this.#placeholders[messageId];
    for (const key of Object.keys(parameters)) {
      if (!expected.includes(key)) {
        throw new RangeError(`ProductMessageCatalog message ${messageId} 不使用参数 ${key}。`);
      }
    }
    for (const key of expected) {
      if (!Object.prototype.hasOwnProperty.call(parameters, key)) {
        throw new RangeError(`ProductMessageCatalog message ${messageId} 缺少参数 ${key}。`);
      }
    }
    return message.replace(PLACEHOLDER_PATTERN, (_, key) => formatParameter(
      parameters[key],
      `ProductMessageCatalog parameters ${messageId}.${key}`,
    ));
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      locale: this.locale,
      messages: this.#messages,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `ProductMessageCatalog ${this.id}`);
  }
}

export function createProductMessageCatalog(value) {
  return value instanceof ProductMessageCatalog
    ? value
    : new ProductMessageCatalog(value);
}
