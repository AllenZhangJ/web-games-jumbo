import {
  createInputPilotObserverReport,
  createInputPilotSelfReport,
} from './input-pilot-record-fields.js';
import { INPUT_PILOT_COMPREHENSION } from './input-pilot-record.js';

export function createEmptyInputPilotReviewDraft() {
  return Object.freeze({
    observer: createInputPilotObserverReport({
      intentMismatchCount: 0,
      accidentalInputCount: 0,
      repeatedInputCount: 0,
      abandonedInputCount: 0,
      correctionCount: 0,
      oneHandCompleted: false,
      objectiveCompleted: false,
    }),
    selfReport: createInputPilotSelfReport({
      groundAction: INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
      airAction: INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
      equipmentAction: INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
    }),
    invalidate: false,
  });
}

export function createInputPilotReviewDraft(value = null) {
  if (value === null || value === undefined) return createEmptyInputPilotReviewDraft();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('InputPilotReviewDraft 必须是对象。');
  }
  const keys = Object.keys(value).sort();
  if (keys.join(',') !== 'invalidate,observer,selfReport') {
    throw new RangeError('InputPilotReviewDraft 只允许 observer/selfReport/invalidate。');
  }
  if (typeof value.invalidate !== 'boolean') {
    throw new TypeError('InputPilotReviewDraft.invalidate 必须是布尔值。');
  }
  return Object.freeze({
    observer: createInputPilotObserverReport(value.observer, 'InputPilotReviewDraft.observer'),
    selfReport: createInputPilotSelfReport(value.selfReport, 'InputPilotReviewDraft.selfReport'),
    invalidate: value.invalidate,
  });
}
