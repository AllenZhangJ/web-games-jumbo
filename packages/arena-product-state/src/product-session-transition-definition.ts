import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

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
} as const);

export type ProductSessionState = typeof PRODUCT_SESSION_STATE[
  keyof typeof PRODUCT_SESSION_STATE
];

export const PRODUCT_SESSION_EVENT = Object.freeze({
  BOOT_REQUESTED: 'boot-requested',
  PROFILE_LOADED: 'profile-loaded',
  CHARACTER_SELECT_OPENED: 'character-select-opened',
  CHARACTER_SELECT_CLOSED: 'character-select-closed',
  MATCH_REQUESTED: 'match-requested',
  REMATCH_REQUESTED: 'rematch-requested',
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
} as const);

export type ProductSessionEvent = typeof PRODUCT_SESSION_EVENT[
  keyof typeof PRODUCT_SESSION_EVENT
];

export interface ProductSessionTransitionDefinition {
  readonly eventId: ProductSessionEvent;
  readonly fromState: ProductSessionState;
  readonly toState: ProductSessionState;
}

const TRANSITION_KEYS = new Set(['eventId', 'fromState', 'toState']);
const KNOWN_STATES: ReadonlySet<unknown> = new Set(Object.values(PRODUCT_SESSION_STATE));
const KNOWN_EVENTS: ReadonlySet<unknown> = new Set(Object.values(PRODUCT_SESSION_EVENT));

function knownValue<T extends string>(value: unknown, known: ReadonlySet<unknown>, name: string): T {
  const normalized = assertNonEmptyString(value, name);
  if (!known.has(normalized)) throw new RangeError(`${name} 不受支持。`);
  return normalized as T;
}

export function createProductSessionTransitionDefinition(
  value: unknown,
): ProductSessionTransitionDefinition {
  const source = cloneFrozenData(value, 'ProductSessionTransitionDefinition');
  assertKnownKeys(source, TRANSITION_KEYS, 'ProductSessionTransitionDefinition');
  return Object.freeze({
    eventId: knownValue<ProductSessionEvent>(
      source.eventId,
      KNOWN_EVENTS,
      'ProductSessionTransitionDefinition.eventId',
    ),
    fromState: knownValue<ProductSessionState>(
      source.fromState,
      KNOWN_STATES,
      'ProductSessionTransitionDefinition.fromState',
    ),
    toState: knownValue<ProductSessionState>(
      source.toState,
      KNOWN_STATES,
      'ProductSessionTransitionDefinition.toState',
    ),
  });
}

const RAW_TRANSITIONS = Object.freeze([
  [PRODUCT_SESSION_EVENT.BOOT_REQUESTED, PRODUCT_SESSION_STATE.BOOT, PRODUCT_SESSION_STATE.LOADING_PROFILE],
  [PRODUCT_SESSION_EVENT.PROFILE_LOADED, PRODUCT_SESSION_STATE.LOADING_PROFILE, PRODUCT_SESSION_STATE.READY],
  [PRODUCT_SESSION_EVENT.CHARACTER_SELECT_OPENED, PRODUCT_SESSION_STATE.READY, PRODUCT_SESSION_STATE.CHARACTER_SELECT],
  [PRODUCT_SESSION_EVENT.CHARACTER_SELECT_CLOSED, PRODUCT_SESSION_STATE.CHARACTER_SELECT, PRODUCT_SESSION_STATE.READY],
  [PRODUCT_SESSION_EVENT.MATCH_REQUESTED, PRODUCT_SESSION_STATE.CHARACTER_SELECT, PRODUCT_SESSION_STATE.MATCHING],
  [PRODUCT_SESSION_EVENT.REMATCH_REQUESTED, PRODUCT_SESSION_STATE.REWARD, PRODUCT_SESSION_STATE.MATCHING],
  [PRODUCT_SESSION_EVENT.REMATCH_REQUESTED, PRODUCT_SESSION_STATE.UNLOCK, PRODUCT_SESSION_STATE.MATCHING],
  [PRODUCT_SESSION_EVENT.MATCH_PREPARED, PRODUCT_SESSION_STATE.MATCHING, PRODUCT_SESSION_STATE.PREPARING],
  [PRODUCT_SESSION_EVENT.MATCH_STARTED, PRODUCT_SESSION_STATE.PREPARING, PRODUCT_SESSION_STATE.IN_MATCH],
  [PRODUCT_SESSION_EVENT.MATCH_FINISHED, PRODUCT_SESSION_STATE.IN_MATCH, PRODUCT_SESSION_STATE.RESULTS],
  [PRODUCT_SESSION_EVENT.REWARD_COMMITTED, PRODUCT_SESSION_STATE.RESULTS, PRODUCT_SESSION_STATE.REWARD],
  [PRODUCT_SESSION_EVENT.UNLOCK_PRESENTED, PRODUCT_SESSION_STATE.REWARD, PRODUCT_SESSION_STATE.UNLOCK],
  [PRODUCT_SESSION_EVENT.REWARD_DISMISSED, PRODUCT_SESSION_STATE.REWARD, PRODUCT_SESSION_STATE.READY],
  [PRODUCT_SESSION_EVENT.UNLOCK_DISMISSED, PRODUCT_SESSION_STATE.UNLOCK, PRODUCT_SESSION_STATE.READY],
] as const);

export const ARENA_V1_PRODUCT_SESSION_TRANSITIONS: readonly ProductSessionTransitionDefinition[]
  = Object.freeze(RAW_TRANSITIONS.map(([eventId, fromState, toState]) => (
    createProductSessionTransitionDefinition({ eventId, fromState, toState })
  )));
