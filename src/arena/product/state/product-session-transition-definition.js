import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';

export const PRODUCT_SESSION_STATE = Object.freeze({
  BOOT: 'boot',
  LOADING_PROFILE: 'loading-profile',
  READY: 'ready',
  CHARACTER_SELECT: 'character-select',
  MATCHING: 'matching',
  PREPARING: 'preparing',
  IN_MATCH: 'in-match',
  RESULTS: 'results',
  REWARD: 'reward',
  UNLOCK: 'unlock',
  SUSPENDED: 'suspended',
  RECOVERABLE_ERROR: 'recoverable-error',
  FATAL_ERROR: 'fatal-error',
  DESTROYED: 'destroyed',
});

export const PRODUCT_SESSION_EVENT = Object.freeze({
  BOOT_REQUESTED: 'boot-requested',
  PROFILE_LOADED: 'profile-loaded',
  CHARACTER_SELECT_OPENED: 'character-select-opened',
  CHARACTER_SELECT_CLOSED: 'character-select-closed',
  MATCH_REQUESTED: 'match-requested',
  MATCH_PREPARED: 'match-prepared',
  MATCH_STARTED: 'match-started',
  MATCH_FINISHED: 'match-finished',
  REWARD_COMMITTED: 'reward-committed',
  UNLOCK_PRESENTED: 'unlock-presented',
  REWARD_DISMISSED: 'reward-dismissed',
  UNLOCK_DISMISSED: 'unlock-dismissed',
  SUSPENDED: 'suspended',
  RESUMED: 'resumed',
  RECOVERABLE_FAILURE: 'recoverable-failure',
  RETRY_REQUESTED: 'retry-requested',
  FATAL_FAILURE: 'fatal-failure',
  DESTROY_REQUESTED: 'destroy-requested',
});

const TRANSITION_KEYS = new Set(['eventId', 'fromState', 'toState']);
const KNOWN_STATES = new Set(Object.values(PRODUCT_SESSION_STATE));
const KNOWN_EVENTS = new Set(Object.values(PRODUCT_SESSION_EVENT));

function knownValue(value, known, name) {
  const normalized = assertNonEmptyString(value, name);
  if (!known.has(normalized)) throw new RangeError(`${name} 不受支持。`);
  return normalized;
}

export function createProductSessionTransitionDefinition(value) {
  const source = cloneFrozenData(value, 'ProductSessionTransitionDefinition');
  assertKnownKeys(source, TRANSITION_KEYS, 'ProductSessionTransitionDefinition');
  return Object.freeze({
    eventId: knownValue(
      source.eventId,
      KNOWN_EVENTS,
      'ProductSessionTransitionDefinition.eventId',
    ),
    fromState: knownValue(
      source.fromState,
      KNOWN_STATES,
      'ProductSessionTransitionDefinition.fromState',
    ),
    toState: knownValue(
      source.toState,
      KNOWN_STATES,
      'ProductSessionTransitionDefinition.toState',
    ),
  });
}

export const ARENA_V1_PRODUCT_SESSION_TRANSITIONS = Object.freeze([
  [
    PRODUCT_SESSION_EVENT.BOOT_REQUESTED,
    PRODUCT_SESSION_STATE.BOOT,
    PRODUCT_SESSION_STATE.LOADING_PROFILE,
  ],
  [
    PRODUCT_SESSION_EVENT.PROFILE_LOADED,
    PRODUCT_SESSION_STATE.LOADING_PROFILE,
    PRODUCT_SESSION_STATE.READY,
  ],
  [
    PRODUCT_SESSION_EVENT.CHARACTER_SELECT_OPENED,
    PRODUCT_SESSION_STATE.READY,
    PRODUCT_SESSION_STATE.CHARACTER_SELECT,
  ],
  [
    PRODUCT_SESSION_EVENT.CHARACTER_SELECT_CLOSED,
    PRODUCT_SESSION_STATE.CHARACTER_SELECT,
    PRODUCT_SESSION_STATE.READY,
  ],
  [
    PRODUCT_SESSION_EVENT.MATCH_REQUESTED,
    PRODUCT_SESSION_STATE.CHARACTER_SELECT,
    PRODUCT_SESSION_STATE.MATCHING,
  ],
  [
    PRODUCT_SESSION_EVENT.MATCH_PREPARED,
    PRODUCT_SESSION_STATE.MATCHING,
    PRODUCT_SESSION_STATE.PREPARING,
  ],
  [
    PRODUCT_SESSION_EVENT.MATCH_STARTED,
    PRODUCT_SESSION_STATE.PREPARING,
    PRODUCT_SESSION_STATE.IN_MATCH,
  ],
  [
    PRODUCT_SESSION_EVENT.MATCH_FINISHED,
    PRODUCT_SESSION_STATE.IN_MATCH,
    PRODUCT_SESSION_STATE.RESULTS,
  ],
  [
    PRODUCT_SESSION_EVENT.REWARD_COMMITTED,
    PRODUCT_SESSION_STATE.RESULTS,
    PRODUCT_SESSION_STATE.REWARD,
  ],
  [
    PRODUCT_SESSION_EVENT.UNLOCK_PRESENTED,
    PRODUCT_SESSION_STATE.REWARD,
    PRODUCT_SESSION_STATE.UNLOCK,
  ],
  [
    PRODUCT_SESSION_EVENT.REWARD_DISMISSED,
    PRODUCT_SESSION_STATE.REWARD,
    PRODUCT_SESSION_STATE.READY,
  ],
  [
    PRODUCT_SESSION_EVENT.UNLOCK_DISMISSED,
    PRODUCT_SESSION_STATE.UNLOCK,
    PRODUCT_SESSION_STATE.READY,
  ],
].map(([eventId, fromState, toState]) => createProductSessionTransitionDefinition({
  eventId,
  fromState,
  toState,
})));
