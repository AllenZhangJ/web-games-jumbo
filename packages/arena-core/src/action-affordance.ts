import {
  ACTION_INPUT_CHANNEL,
  type ActionInputChannel,
  type ActionLane,
} from '@number-strategy-jump/arena-definitions';
import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import type {
  ActionIntentInput,
  ActionResolution,
  ActionResolutionContext,
  ActionResolutionResult,
} from './action-resolver.js';

const PROJECT_KEYS = new Set([
  'tick', 'participantId', 'canAct', 'candidates', 'occupiedLanes', 'activeConflictTags',
]);

interface ChannelProbe {
  readonly inputChannel: ActionInputChannel;
  readonly input: ActionIntentInput;
}

const CHANNEL_PROBES = Object.freeze<Record<string, ChannelProbe>>({
  primary: Object.freeze({
    inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
    input: Object.freeze({ primaryPressed: true, primaryHeld: false, jumpPressed: false, jumpHeld: false, slamPressed: false }),
  }),
  primaryHold: Object.freeze({
    inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
    input: Object.freeze({ primaryPressed: false, primaryHeld: true, jumpPressed: false, jumpHeld: false, slamPressed: false }),
  }),
  jump: Object.freeze({
    inputChannel: ACTION_INPUT_CHANNEL.JUMP,
    input: Object.freeze({ primaryPressed: false, primaryHeld: false, jumpPressed: true, jumpHeld: false, slamPressed: false }),
  }),
  slam: Object.freeze({
    inputChannel: ACTION_INPUT_CHANNEL.SLAM,
    input: Object.freeze({ primaryPressed: false, primaryHeld: false, jumpPressed: false, jumpHeld: false, slamPressed: true }),
  }),
});

const PRIMARY_PRESS_INPUT = CHANNEL_PROBES.primary?.input;
if (!PRIMARY_PRESS_INPUT) throw new Error('ActionAffordance primary probe 缺失。');

export interface ActionAffordanceOutcome {
  readonly kind: ActionResolution['kind'];
  readonly actionDefinitionId: string | null;
  readonly lane: ActionLane | null;
  readonly source: string | null;
  readonly reason: string;
}

export interface ActionAffordance {
  readonly tick: number;
  readonly participantId: string;
  readonly channels: Readonly<Record<string, ActionAffordanceOutcome>>;
  readonly primaryActionDefinitionId: string | null;
}

interface ActionResolverContract {
  resolve(context: ActionResolutionContext | unknown): ActionResolutionResult;
}

function projectOutcome(outcome: ActionResolution): ActionAffordanceOutcome {
  return Object.freeze({
    kind: outcome.kind,
    actionDefinitionId: outcome.actionDefinitionId,
    lane: outcome.lane,
    source: outcome.source,
    reason: outcome.reason,
  });
}

export class ActionAffordanceProjector {
  readonly #resolver: ActionResolverContract;

  constructor({ resolver }: { readonly resolver: ActionResolverContract }) {
    if (!resolver || typeof resolver.resolve !== 'function') {
      throw new TypeError('ActionAffordanceProjector 需要 ActionResolver。');
    }
    this.#resolver = resolver;
    Object.freeze(this);
  }

  project(optionsValue: unknown): ActionAffordance {
    assertKnownKeys(optionsValue, PROJECT_KEYS, 'ActionAffordanceProjector project options');
    const options = optionsValue as unknown as Omit<ActionResolutionContext, 'input'>;
    const channels: Record<string, ActionAffordanceOutcome> = {};
    for (const [probeName, probe] of Object.entries(CHANNEL_PROBES)) {
      const resolution = this.#resolver.resolve({ ...options, input: probe.input });
      const outcome = resolution.outcomes.find((candidate) => (
        candidate.inputChannel === probe.inputChannel
      )) ?? resolution.outcomes[0];
      if (!outcome) throw new Error(`ActionAffordance ${probeName} 未产生 resolution outcome。`);
      channels[probeName] = projectOutcome(outcome);
    }
    const primaryChannel = channels[ACTION_INPUT_CHANNEL.PRIMARY];
    if (!primaryChannel) throw new Error('ActionAffordance primary channel 缺失。');
    let primaryActionDefinitionId = primaryChannel.actionDefinitionId;
    if (primaryActionDefinitionId === null && !options.canAct) {
      const displayResolution = this.#resolver.resolve({
        ...options,
        canAct: true,
        input: PRIMARY_PRESS_INPUT,
      });
      primaryActionDefinitionId = displayResolution.outcomes.find(
        ({ inputChannel }) => inputChannel === ACTION_INPUT_CHANNEL.PRIMARY,
      )?.actionDefinitionId ?? null;
    }
    return Object.freeze({
      tick: options.tick,
      participantId: options.participantId,
      channels: Object.freeze(channels),
      primaryActionDefinitionId,
    });
  }
}
