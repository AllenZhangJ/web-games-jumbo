function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value;
}

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function integerAtLeast(value, minimum, name) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value;
}

function cloneFrozen(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFrozen));
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    cloneFrozen(child),
  ])));
}

function copyEvent(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`presentation events[${index}] 必须是对象。`);
  }
  const event = cloneFrozen(value);
  nonEmptyString(event.id, `presentation events[${index}].id`);
  nonEmptyString(event.type, `presentation events[${index}].type`);
  integerAtLeast(event.tick, 0, `presentation events[${index}].tick`);
  integerAtLeast(event.sequence, 0, `presentation events[${index}].sequence`);
  return event;
}

/**
 * A match-scoped monotonic event gate. The sequence watermark prevents an
 * evicted old event from replaying after Scene/context reconstruction, while
 * the bounded ID set catches duplicates without unbounded memory growth.
 */
export class PresentationEventWindow {
  #capacity;
  #ids;
  #order;
  #highestSequence;
  #highestId;
  #acceptedCount;
  #duplicateCount;
  #destroyed;

  constructor({ capacity = 512 } = {}) {
    this.#capacity = positiveInteger(capacity, 'PresentationEventWindow.capacity');
    this.#ids = new Set();
    this.#order = [];
    this.#highestSequence = -1;
    this.#highestId = null;
    this.#acceptedCount = 0;
    this.#duplicateCount = 0;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('PresentationEventWindow 已销毁。');
  }

  consume(events) {
    this.#assertUsable();
    if (!Array.isArray(events)) throw new TypeError('presentation events 必须是数组。');
    // Validate and copy the whole caller-owned batch before changing the
    // watermark. Getters/proxies cannot leave a partially accepted batch.
    const copied = events.map(copyEvent);
    for (let index = 1; index < copied.length; index += 1) {
      if (copied[index].sequence < copied[index - 1].sequence) {
        throw new RangeError('presentation events.sequence 必须单调不减。');
      }
    }

    const simulatedIds = new Set(this.#ids);
    const simulatedOrder = [...this.#order];
    let simulatedHighestSequence = this.#highestSequence;
    let simulatedHighestId = this.#highestId;
    let acceptedCount = this.#acceptedCount;
    let duplicateCount = this.#duplicateCount;
    const accepted = [];
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
        simulatedIds.delete(simulatedOrder.shift());
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

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      capacity: this.#capacity,
      retainedIds: this.#ids.size,
      highestSequence: this.#highestSequence,
      highestId: this.#highestId,
      acceptedCount: this.#acceptedCount,
      duplicateCount: this.#duplicateCount,
    });
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#ids.clear();
    this.#order.length = 0;
  }
}
