import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import {
  INPUT_PILOT_COMPREHENSION,
  createInputPilotObserverReport,
  createInputPilotSelfReport,
  type InputPilotObserverReport,
  type InputPilotSelfReport,
} from './input-pilot-record-fields.js';

export interface InputPilotReviewDraft {
  readonly observer: InputPilotObserverReport;
  readonly selfReport: InputPilotSelfReport;
  readonly invalidate: boolean;
}
const REVIEW_KEYS = new Set(['observer', 'selfReport', 'invalidate']);

export function createEmptyInputPilotReviewDraft(): InputPilotReviewDraft {
  return Object.freeze({
    observer: createInputPilotObserverReport({
      intentMismatchCount: 0, accidentalInputCount: 0, repeatedInputCount: 0,
      abandonedInputCount: 0, correctionCount: 0,
      oneHandCompleted: false, objectiveCompleted: false,
    }),
    selfReport: createInputPilotSelfReport({
      groundAction: INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
      airAction: INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
      equipmentAction: INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
    }),
    invalidate: false,
  });
}

export function createInputPilotReviewDraft(value: unknown = null): InputPilotReviewDraft {
  if (value === null || value === undefined) return createEmptyInputPilotReviewDraft();
  assertKnownKeys(value, REVIEW_KEYS, 'InputPilotReviewDraft');
  if (typeof value.invalidate !== 'boolean') {
    throw new TypeError('InputPilotReviewDraft.invalidate 必须是布尔值。');
  }
  return Object.freeze({
    observer: createInputPilotObserverReport(value.observer, 'InputPilotReviewDraft.observer'),
    selfReport: createInputPilotSelfReport(value.selfReport, 'InputPilotReviewDraft.selfReport'),
    invalidate: value.invalidate,
  });
}
