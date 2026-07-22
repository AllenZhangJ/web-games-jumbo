import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';

const OPTION_KEYS = new Set(['capacity']);

export interface PresentationEvent extends PlainRecord {
  readonly id: string;
  readonly type: string;
  readonly tick: number;
  readonly sequence: number;
}

function positiveInteger(value: unknown, name: string): number {
  const integer = assertIntegerAtLeast(value, 1, name);
  return integer;
}

function normalizeEvents(value: unknown): readonly PresentationEvent[] {
  if (!Array.isArray(value)) throw new TypeError('presentation events 必须是数组。');
  const expectedKeys = new Set(['length']);
  const result: PresentationEvent[] = [];
  for (let index = 0; index < value.length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError('presentation events 不能包含空槽或访问器。');
    }
    const eventValue: DeepReadonly<unknown> = cloneFrozenData(
      descriptor.value,
      `presentation events[${index}]`,
    );
    const event = assertPlainRecord(eventValue, `presentation events[${index}]`);
    assertNonEmptyString(event.id, `presentation events[${index}].id`);
    assertNonEmptyString(event.type, `presentation events[${index}].type`);
    assertIntegerAtLeast(event.tick, 0, `presentation events[${index}].tick`);
    assertIntegerAtLeast(event.sequence, 0, `presentation events[${index}].sequence`);
    result.push(event as PresentationEvent);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('presentation events 不能包含额外字段。');
  }
  return result;
}

export class PresentationEventWindow {
  readonly #capacity: number;
  #ids = new Set<string>();
  #order: string[] = [];
  #highestSequence = -1;
  #highestId: string | null = null;
  #acceptedCount = 0;
  #duplicateCount = 0;
  #destroyed = false;

  constructor(options: unknown = {}) {
    assertKnownKeys(options, OPTION_KEYS, 'PresentationEventWindow options');
    this.#capacity = positiveInteger(options.capacity ?? 512, 'PresentationEventWindow.capacity');
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('PresentationEventWindow 已销毁。');
  }

  consume(eventsValue: unknown): readonly PresentationEvent[] {
    this.#assertUsable();
    const copied = normalizeEvents(eventsValue);
    for (let index = 1; index < copied.length; index += 1) {
      const current = copied[index];
      const previous = copied[index - 1];
      if (!current || !previous) throw new Error('PresentationEventWindow 内部索引不一致。');
      if (current.sequence < previous.sequence) {
        throw new RangeError('presentation events.sequence 必须单调不减。');
      }
    }
    const simulatedIds = new Set(this.#ids);
    const simulatedOrder = [...this.#order];
    let simulatedHighestSequence = this.#highestSequence;
    let simulatedHighestId = this.#highestId;
    let acceptedCount = this.#acceptedCount;
    let duplicateCount = this.#duplicateCount;
    const accepted: PresentationEvent[] = [];
    for (const event of copied) {
      if (event.sequence < simulatedHighestSequence || simulatedIds.has(event.id)) {
        duplicateCount += 1;
        continue;
      }
      if (event.sequence === simulatedHighestSequence) {
        if (event.id !== simulatedHighestId) {
          throw new Error(`presentation event sequence ${event.sequence} 出现稳定 ID 冲突。`);
        }
        duplicateCount += 1;
        continue;
      }
      simulatedHighestSequence = event.sequence;
      simulatedHighestId = event.id;
      simulatedIds.add(event.id);
      simulatedOrder.push(event.id);
      while (simulatedOrder.length > this.#capacity) {
        const evicted = simulatedOrder.shift();
        if (evicted !== undefined) simulatedIds.delete(evicted);
      }
      acceptedCount += 1;
      accepted.push(event);
    }
    this.#ids = simulatedIds;
    this.#order = simulatedOrder;
    this.#highestSequence = simulatedHighestSequence;
    this.#highestId = simulatedHighestId;
    this.#acceptedCount = acceptedCount;
    this.#duplicateCount = duplicateCount;
    return Object.freeze(accepted);
  }

  getDebugSnapshot(): Readonly<Record<string, number | string | null>> {
    this.#assertUsable();
    return Object.freeze({
      capacity: this.#capacity, retainedIds: this.#ids.size,
      highestSequence: this.#highestSequence, highestId: this.#highestId,
      acceptedCount: this.#acceptedCount, duplicateCount: this.#duplicateCount,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#ids.clear();
    this.#order.length = 0;
  }
}
