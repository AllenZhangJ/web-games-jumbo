import {
  INPUT_PILOT_COMPREHENSION,
} from './input-pilot-record.js';
import { createInputPilotReviewDraft } from './input-pilot-review-draft.js';

const COUNTER_KEYS = Object.freeze([
  'intentMismatchCount',
  'accidentalInputCount',
  'repeatedInputCount',
  'abandonedInputCount',
  'correctionCount',
]);

const COMPREHENSION_KEYS = Object.freeze([
  'groundAction',
  'airAction',
  'equipmentAction',
]);

function count(value, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 999) {
    throw new RangeError(`${name} 必须是 0～999 的安全整数。`);
  }
  return value;
}

export class InputPilotFormModel {
  #counters;
  #oneHandCompleted;
  #objectiveCompleted;
  #comprehension;

  constructor() {
    this.reset();
    Object.freeze(this);
  }

  reset() {
    this.#counters = Object.fromEntries(COUNTER_KEYS.map((key) => [key, 0]));
    this.#oneHandCompleted = false;
    this.#objectiveCompleted = false;
    this.#comprehension = Object.fromEntries(COMPREHENSION_KEYS.map((key) => [
      key,
      INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
    ]));
  }

  setCounter(key, value) {
    if (!COUNTER_KEYS.includes(key)) throw new RangeError(`未知观察计数 ${String(key)}。`);
    this.#counters[key] = count(value, `InputPilotFormModel.${key}`);
    return this.#counters[key];
  }

  adjustCounter(key, delta) {
    if (!Number.isSafeInteger(delta)) throw new TypeError('计数增量必须是安全整数。');
    return this.setCounter(key, Math.max(0, Math.min(999, this.#counters[key] + delta)));
  }

  setCompletion(key, value) {
    if (typeof value !== 'boolean') throw new TypeError(`${key} 必须是布尔值。`);
    if (key === 'oneHandCompleted') this.#oneHandCompleted = value;
    else if (key === 'objectiveCompleted') this.#objectiveCompleted = value;
    else throw new RangeError(`未知完成状态 ${String(key)}。`);
  }

  setComprehension(key, value) {
    if (!COMPREHENSION_KEYS.includes(key)) {
      throw new RangeError(`未知理解字段 ${String(key)}。`);
    }
    if (!Object.values(INPUT_PILOT_COMPREHENSION).includes(value)) {
      throw new RangeError(`未知理解结果 ${String(value)}。`);
    }
    this.#comprehension[key] = value;
  }

  restore({ observer, selfReport }) {
    const draft = createInputPilotReviewDraft({
      observer,
      selfReport,
      invalidate: false,
    });
    this.#counters = Object.fromEntries(COUNTER_KEYS.map((key) => [
      key,
      draft.observer[key],
    ]));
    this.#oneHandCompleted = draft.observer.oneHandCompleted;
    this.#objectiveCompleted = draft.observer.objectiveCompleted;
    this.#comprehension = Object.fromEntries(COMPREHENSION_KEYS.map((key) => [
      key,
      draft.selfReport[key],
    ]));
    return this.getSnapshot();
  }

  getSnapshot() {
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

export const INPUT_PILOT_OBSERVER_COUNTER_KEYS = COUNTER_KEYS;
export const INPUT_PILOT_COMPREHENSION_KEYS = COMPREHENSION_KEYS;
