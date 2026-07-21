import { ACTION_INPUT_CHANNEL } from './action-definition.js';
import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';

const PROJECT_KEYS = new Set([
  'tick',
  'participantId',
  'canAct',
  'candidates',
  'occupiedLanes',
  'activeConflictTags',
]);

// Probe names are presentation-facing semantic slots. They intentionally do
// not expose pointer state or let presentation select an action definition.
const CHANNEL_PROBES = Object.freeze({
  primary: Object.freeze({
    inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
    input: Object.freeze({
      primaryPressed: true,
      primaryHeld: false,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    }),
  }),
  primaryHold: Object.freeze({
    inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
    input: Object.freeze({
      primaryPressed: false,
      primaryHeld: true,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    }),
  }),
  jump: Object.freeze({
    inputChannel: ACTION_INPUT_CHANNEL.JUMP,
    input: Object.freeze({
      primaryPressed: false,
      primaryHeld: false,
      jumpPressed: true,
      jumpHeld: false,
      slamPressed: false,
    }),
  }),
  slam: Object.freeze({
    inputChannel: ACTION_INPUT_CHANNEL.SLAM,
    input: Object.freeze({
      primaryPressed: false,
      primaryHeld: false,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: true,
    }),
  }),
});

const PRIMARY_PRESS_INPUT = CHANNEL_PROBES.primary.input;

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
    for (const [probeName, probe] of Object.entries(CHANNEL_PROBES)) {
      const resolution = this.#resolver.resolve({
        tick,
        participantId,
        canAct,
        input: probe.input,
        candidates,
        occupiedLanes,
        activeConflictTags,
      });
      const outcome = resolution.outcomes.find((candidate) => (
        candidate.inputChannel === probe.inputChannel
      ))
        ?? resolution.outcomes[0];
      channels[probeName] = projectOutcome(outcome);
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
        input: PRIMARY_PRESS_INPUT,
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
