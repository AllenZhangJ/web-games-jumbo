import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';

export const PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION = 1 as const;

export interface ProductMessageCatalogJson {
  readonly schemaVersion: typeof PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly locale: string;
  readonly messages: Readonly<Record<string, string>>;
}

const CATALOG_KEYS = new Set(['schemaVersion', 'id', 'contentVersion', 'locale', 'messages']);
const PLACEHOLDER_PATTERN = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

function parsePlaceholders(message: string, name: string): readonly string[] {
  const placeholders: string[] = [];
  const stripped = message.replace(PLACEHOLDER_PATTERN, (_match, placeholder: string) => {
    placeholders.push(placeholder);
    return '';
  });
  if (/[{}]/.test(stripped)) throw new RangeError(`${name} 包含无效占位符。`);
  return Object.freeze([...new Set(placeholders)].sort());
}

function cloneMessages(value: unknown): Readonly<{
  messages: Readonly<Record<string, string>>;
  placeholders: Readonly<Record<string, readonly string[]>>;
}> {
  const source = assertPlainRecord(value, 'ProductMessageCatalog.messages');
  const messages: Record<string, string> = {};
  const placeholders: Record<string, readonly string[]> = {};
  for (const messageId of Object.keys(source).sort()) {
    const id = assertNonEmptyString(messageId, 'ProductMessageCatalog messageId');
    const message = assertNonEmptyString(
      source[messageId],
      `ProductMessageCatalog.messages.${id}`,
    );
    messages[id] = message;
    placeholders[id] = parsePlaceholders(message, `ProductMessageCatalog.messages.${id}`);
  }
  if (Object.keys(messages).length === 0) {
    throw new RangeError('ProductMessageCatalog.messages 不能为空。');
  }
  return Object.freeze({
    messages: Object.freeze(messages),
    placeholders: Object.freeze(placeholders),
  });
}

function formatParameter(value: unknown, name: string): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  throw new TypeError(`${name} 必须是字符串或有限数。`);
}

export class ProductMessageCatalog {
  readonly schemaVersion = PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly locale: string;
  readonly #messages: Readonly<Record<string, string>>;
  readonly #placeholders: Readonly<Record<string, readonly string[]>>;

  constructor(value: unknown) {
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
    this.id = assertNonEmptyString(source.id, 'ProductMessageCatalog.id');
    this.contentVersion = assertIntegerAtLeast(
      source.contentVersion,
      1,
      'ProductMessageCatalog.contentVersion',
    );
    this.locale = assertNonEmptyString(source.locale, 'ProductMessageCatalog.locale');
    Object.freeze(this);
  }

  has(messageId: unknown): messageId is string {
    return typeof messageId === 'string'
      && Object.prototype.hasOwnProperty.call(this.#messages, messageId);
  }

  require(messageId: unknown): string {
    if (!this.has(messageId)) {
      throw new RangeError(`ProductMessageCatalog 缺少 message ${String(messageId)}。`);
    }
    return this.#messages[messageId]!;
  }

  format(messageId: unknown, parameterValues: unknown = {}): string {
    const message = this.require(messageId);
    const id = messageId as string;
    const parameters = cloneFrozenData(
      parameterValues,
      `ProductMessageCatalog parameters ${id}`,
    );
    const record = assertPlainRecord(
      parameters,
      `ProductMessageCatalog parameters ${id}`,
    );
    const expected = this.#placeholders[id] ?? Object.freeze([]);
    for (const key of Object.keys(record)) {
      if (!expected.includes(key)) {
        throw new RangeError(`ProductMessageCatalog message ${id} 不使用参数 ${key}。`);
      }
    }
    for (const key of expected) {
      if (!Object.prototype.hasOwnProperty.call(record, key)) {
        throw new RangeError(`ProductMessageCatalog message ${id} 缺少参数 ${key}。`);
      }
    }
    return message.replace(PLACEHOLDER_PATTERN, (_match, key: string) => formatParameter(
      record[key],
      `ProductMessageCatalog parameters ${id}.${key}`,
    ));
  }

  toJSON(): ProductMessageCatalogJson {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      locale: this.locale,
      messages: this.#messages,
    };
  }

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON(), `ProductMessageCatalog ${this.id}`);
  }
}

export function createProductMessageCatalog(value: unknown): ProductMessageCatalog {
  return value instanceof ProductMessageCatalog ? value : new ProductMessageCatalog(value);
}
