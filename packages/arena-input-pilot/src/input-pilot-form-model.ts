import {
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_COMPREHENSION_KEYS,
  INPUT_PILOT_OBSERVER_COUNTER_KEYS,
  type InputPilotComprehension,
  type InputPilotComprehensionKey,
  type InputPilotObserverCounterKey,
  type InputPilotObserverReport,
  type InputPilotSelfReport,
} from './input-pilot-record-fields.js';
import { createInputPilotReviewDraft } from './input-pilot-review-draft.js';

export interface InputPilotFormSnapshot {
  readonly observer: InputPilotObserverReport;
  readonly selfReport: InputPilotSelfReport;
}
const FORM_SNAPSHOT_KEYS = new Set(['observer', 'selfReport']);
const OBSERVER_COUNTER_KEY_SET = new Set<string>(INPUT_PILOT_OBSERVER_COUNTER_KEYS);
const COMPREHENSION_KEY_SET = new Set<string>(INPUT_PILOT_COMPREHENSION_KEYS);
const COMPREHENSION_VALUE_SET = new Set<string>(Object.values(INPUT_PILOT_COMPREHENSION));

function count(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 999) {
    throw new RangeError(`${name} 必须是 0～999 的安全整数。`);
  }
  return value as number;
}

export class InputPilotFormModel {
  #counters!: Record<InputPilotObserverCounterKey, number>;
  #oneHandCompleted!: boolean;
  #objectiveCompleted!: boolean;
  #comprehension!: Record<InputPilotComprehensionKey, InputPilotComprehension>;

  constructor() {
    this.reset();
    Object.freeze(this);
  }

  reset(): void {
    this.#counters = Object.fromEntries(
      INPUT_PILOT_OBSERVER_COUNTER_KEYS.map((key) => [key, 0]),
    ) as Record<InputPilotObserverCounterKey, number>;
    this.#oneHandCompleted = false;
    this.#objectiveCompleted = false;
    this.#comprehension = Object.fromEntries(INPUT_PILOT_COMPREHENSION_KEYS.map((key) => [
      key, INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
    ])) as Record<InputPilotComprehensionKey, InputPilotComprehension>;
  }

  setCounter(keyValue: unknown, value: unknown): number {
    if (typeof keyValue !== 'string' || !OBSERVER_COUNTER_KEY_SET.has(keyValue)) {
      throw new RangeError(`未知观察计数 ${String(keyValue)}。`);
    }
    const key = keyValue as InputPilotObserverCounterKey;
    this.#counters[key] = count(value, `InputPilotFormModel.${key}`);
    return this.#counters[key];
  }

  adjustCounter(keyValue: unknown, deltaValue: unknown): number {
    if (!Number.isSafeInteger(deltaValue)) throw new TypeError('计数增量必须是安全整数。');
    if (typeof keyValue !== 'string' || !OBSERVER_COUNTER_KEY_SET.has(keyValue)) {
      throw new RangeError(`未知观察计数 ${String(keyValue)}。`);
    }
    const key = keyValue as InputPilotObserverCounterKey;
    return this.setCounter(key, Math.max(0, Math.min(999, this.#counters[key] + (deltaValue as number))));
  }

  setCompletion(key: unknown, value: unknown): void {
    if (typeof value !== 'boolean') throw new TypeError(`${String(key)} 必须是布尔值。`);
    if (key === 'oneHandCompleted') this.#oneHandCompleted = value;
    else if (key === 'objectiveCompleted') this.#objectiveCompleted = value;
    else throw new RangeError(`未知完成状态 ${String(key)}。`);
  }

  setComprehension(keyValue: unknown, value: unknown): void {
    if (typeof keyValue !== 'string' || !COMPREHENSION_KEY_SET.has(keyValue)) {
      throw new RangeError(`未知理解字段 ${String(keyValue)}。`);
    }
    if (typeof value !== 'string' || !COMPREHENSION_VALUE_SET.has(value)) {
      throw new RangeError(`未知理解结果 ${String(value)}。`);
    }
    this.#comprehension[keyValue as InputPilotComprehensionKey] = value as InputPilotComprehension;
  }

  restore(value: unknown): InputPilotFormSnapshot {
    assertKnownKeys(value, FORM_SNAPSHOT_KEYS, 'InputPilotFormModel restore value');
    const draft = createInputPilotReviewDraft({
      observer: value.observer,
      selfReport: value.selfReport,
      invalidate: false,
    });
    const counters = Object.fromEntries(INPUT_PILOT_OBSERVER_COUNTER_KEYS.map((key) => [
      key, count(draft.observer[key], `InputPilotFormModel.${key}`),
    ])) as Record<InputPilotObserverCounterKey, number>;
    this.#counters = counters;
    this.#oneHandCompleted = draft.observer.oneHandCompleted;
    this.#objectiveCompleted = draft.observer.objectiveCompleted;
    this.#comprehension = Object.fromEntries(INPUT_PILOT_COMPREHENSION_KEYS.map((key) => [
      key, draft.selfReport[key],
    ])) as Record<InputPilotComprehensionKey, InputPilotComprehension>;
    return this.getSnapshot();
  }

  getSnapshot(): InputPilotFormSnapshot {
    return Object.freeze({
      observer: Object.freeze({
        ...this.#counters,
        oneHandCompleted: this.#oneHandCompleted,
        objectiveCompleted: this.#objectiveCompleted,
      }),
      selfReport: Object.freeze({ ...this.#comprehension }),
    });
  }
}
import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';
