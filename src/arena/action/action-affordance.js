import { ACTION_INPUT_CHANNEL } from './action-definition.js';
import { assertKnownKeys } from '../rules/definition-utils.js';

const PROJECT_KEYS = new Set([
  'tick',
  'participantId',
  'canAct',
  'candidates',
  'occupiedLanes',
  'activeConflictTags',
]);

const CHANNEL_INPUTS = Object.freeze({
  [ACTION_INPUT_CHANNEL.PRIMARY]: Object.freeze({
    primaryPressed: true,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  }),
  [ACTION_INPUT_CHANNEL.JUMP]: Object.freeze({
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: true,
    jumpHeld: false,
    slamPressed: false,
  }),
  [ACTION_INPUT_CHANNEL.SLAM]: Object.freeze({
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: true,
  }),
});

function projectOutcome(outcome) {
  return Object.freeze({
    kind: outcome.kind,
    actionDefinitionId: outcome.actionDefinitionId,
    lane: outcome.lane,
    source: outcome.source,
    reason: outcome.reason,
  });
}

export class ActionAffordanceProjector {
  #resolver;

  constructor({ resolver }) {
    if (!resolver || typeof resolver.resolve !== 'function') {
      throw new TypeError('ActionAffordanceProjector 需要 ActionResolver。');
    }
    this.#resolver = resolver;
    Object.freeze(this);
  }

  project(options) {
    assertKnownKeys(
      options,
      PROJECT_KEYS,
      'ActionAffordanceProjector project options',
    );
    const {
      tick,
      participantId,
      canAct,
      candidates,
      occupiedLanes,
      activeConflictTags,
    } = options;
    const channels = {};
    for (const [channel, input] of Object.entries(CHANNEL_INPUTS)) {
      const resolution = this.#resolver.resolve({
        tick,
        participantId,
        canAct,
        input,
        candidates,
        occupiedLanes,
        activeConflictTags,
      });
      const outcome = resolution.outcomes.find(({ inputChannel }) => inputChannel === channel)
        ?? resolution.outcomes[0];
      channels[channel] = projectOutcome(outcome);
    }
    let primaryActionDefinitionId =
      channels[ACTION_INPUT_CHANNEL.PRIMARY].actionDefinitionId;
    if (primaryActionDefinitionId === null && !canAct) {
      // The real outcome intentionally carries no candidate while the actor is
      // unavailable. Resolve once more through the same policy solely to keep
      // the contextual primary-button identity stable during hitstun/respawn.
      const displayResolution = this.#resolver.resolve({
        tick,
        participantId,
        canAct: true,
        input: CHANNEL_INPUTS[ACTION_INPUT_CHANNEL.PRIMARY],
        candidates,
        occupiedLanes,
        activeConflictTags,
      });
      primaryActionDefinitionId = displayResolution.outcomes.find(
        ({ inputChannel }) => inputChannel === ACTION_INPUT_CHANNEL.PRIMARY,
      )?.actionDefinitionId ?? null;
    }
    return Object.freeze({
      tick,
      participantId,
      channels: Object.freeze(channels),
      // Keep the display identity while an action is blocked by cooldown or an
      // occupied lane. Availability remains represented by channel.kind/reason.
      primaryActionDefinitionId,
    });
  }
}
