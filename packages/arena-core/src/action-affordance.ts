import {
  ACTION_INPUT_CHANNEL,
  type ActionInputChannel,
  type ActionLane,
} from '@number-strategy-jump/arena-definitions';
import {
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ActionIntentInput,
  ActionResolution,
  ActionResolutionContext,
  ActionResolutionResult,
} from './action-resolver.js';
import { getActionResolverPreviewPort } from './action-resolver.js';

const PROJECT_KEYS = new Set([
  'tick', 'participantId', 'canAct', 'candidates', 'occupiedLanes', 'activeConflictTags',
]);
const UNSAFE_PROJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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

function requireChannelProbe(
  name: keyof typeof CHANNEL_PROBES,
): readonly [string, ChannelProbe] {
  const probe = CHANNEL_PROBES[name];
  if (!probe) throw new Error(`ActionAffordance ${name} probe 缺失。`);
  return [name, probe];
}

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

export const ACTION_AFFORDANCE_PROFILE = Object.freeze({
  LOCAL_CONTEXT_PRIMARY: 'local-context-primary',
  BOT_MOBILITY: 'bot-mobility',
  FULL_AUDIT: 'full-audit',
} as const);

export type ActionAffordanceProfile =
  (typeof ACTION_AFFORDANCE_PROFILE)[keyof typeof ACTION_AFFORDANCE_PROFILE];

export interface LocalActionAffordance {
  readonly tick: number;
  readonly participantId: string;
  readonly channels: Readonly<{
    readonly primary: ActionAffordanceOutcome;
    readonly primaryHold: ActionAffordanceOutcome;
  }>;
  readonly primaryActionDefinitionId: string | null;
}

export interface BotMobilityAffordance {
  readonly tick: number;
  readonly participantId: string;
  readonly channels: Readonly<{
    readonly jump: ActionAffordanceOutcome;
    readonly slam: ActionAffordanceOutcome;
  }>;
}

export type ActionAffordanceProfileResult =
  | ActionAffordance
  | LocalActionAffordance
  | BotMobilityAffordance;

const PROFILE_VALUES = new Set<string>(Object.values(ACTION_AFFORDANCE_PROFILE));

function describeProfileType(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'object') return Array.isArray(value) ? 'array' : 'object';
  return typeof value;
}

export function assertActionAffordanceProfile(value: unknown): ActionAffordanceProfile {
  if (typeof value !== 'string' || !PROFILE_VALUES.has(value)) {
    throw new RangeError(`不支持的 ActionAffordance profile 类型: ${describeProfileType(value)}。`);
  }
  return value as ActionAffordanceProfile;
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

function snapshotProjectOptions(value: unknown): Record<string, unknown> {
  const record = assertPlainRecord(value, 'ActionAffordanceProjector project options');
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== 'string') {
      throw new TypeError('ActionAffordanceProjector project options 不能包含 Symbol 字段。');
    }
    if (UNSAFE_PROJECT_KEYS.has(key) || !PROJECT_KEYS.has(key)) {
      throw new RangeError(`ActionAffordanceProjector project options 不支持字段 ${key}。`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new TypeError(`ActionAffordanceProjector project options.${key} 必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

function readResolutionIdentity(
  value: unknown,
  expectedTick: unknown,
  expectedParticipantId: unknown,
  name: string,
): ActionResolutionResult {
  const record = assertPlainRecord(value, name);
  const tick = Object.getOwnPropertyDescriptor(record, 'tick');
  const participantId = Object.getOwnPropertyDescriptor(record, 'participantId');
  if (
    !tick
    || !Object.prototype.hasOwnProperty.call(tick, 'value')
    || !participantId
    || !Object.prototype.hasOwnProperty.call(participantId, 'value')
  ) {
    throw new TypeError(`${name} 必须包含 tick/participantId 数据字段。`);
  }
  if (tick.value !== expectedTick || participantId.value !== expectedParticipantId) {
    throw new RangeError(`${name} 的 tick/participantId 与 project options 不一致。`);
  }
  return value as ActionResolutionResult;
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
    return this.projectProfile(optionsValue, ACTION_AFFORDANCE_PROFILE.FULL_AUDIT) as ActionAffordance;
  }

  projectProfile(
    optionsValue: unknown,
    profileValue: typeof ACTION_AFFORDANCE_PROFILE.LOCAL_CONTEXT_PRIMARY,
  ): LocalActionAffordance;
  projectProfile(
    optionsValue: unknown,
    profileValue: typeof ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY,
  ): BotMobilityAffordance;
  projectProfile(
    optionsValue: unknown,
    profileValue: typeof ACTION_AFFORDANCE_PROFILE.FULL_AUDIT,
  ): ActionAffordance;
  projectProfile(
    optionsValue: unknown,
    profileValue: ActionAffordanceProfile,
  ): ActionAffordanceProfileResult;
  projectProfile(
    optionsValue: unknown,
    profileValue: unknown,
  ): ActionAffordanceProfileResult {
    const profile = assertActionAffordanceProfile(profileValue);
    const options = snapshotProjectOptions(optionsValue) as unknown as Omit<ActionResolutionContext, 'input'>;
    const previewPort = getActionResolverPreviewPort(this.#resolver);
    const channels: Record<string, ActionAffordanceOutcome> = {};
    const probes: readonly (readonly [string, ChannelProbe])[] = profile === ACTION_AFFORDANCE_PROFILE.LOCAL_CONTEXT_PRIMARY
      ? [requireChannelProbe('primary'), requireChannelProbe('primaryHold')]
      : profile === ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY
        ? [requireChannelProbe('jump'), requireChannelProbe('slam')]
        : Object.entries(CHANNEL_PROBES);
    let displayResolution: ActionResolutionResult | null = null;
    const expectedTick = options.tick;
    const expectedParticipantId = options.participantId;
    if (previewPort) {
      const preview = profile === ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY
        ? previewPort.resolveWithoutDisplay(
          options,
          probes.map(([, probe]) => probe.input),
        )
        : previewPort.resolve(
          options,
          probes.map(([, probe]) => probe.input),
        );
      if (!preview || !Array.isArray(preview.resolutions) || preview.resolutions.length !== probes.length) {
        throw new RangeError('ActionAffordance preview resolutions 数量必须与 probes 完全一致。');
      }
      displayResolution = preview.displayResolution;
      if (profile === ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY && displayResolution !== null) {
        throw new TypeError('ActionAffordance bot mobility preview 不得包含 display resolution。');
      }
      if (displayResolution !== null) {
        displayResolution = readResolutionIdentity(
          displayResolution,
          expectedTick,
          expectedParticipantId,
          'ActionAffordance display resolution',
        );
      }
      for (let index = 0; index < probes.length; index += 1) {
        const [probeName, probe] = probes[index]!;
        const resolution = readResolutionIdentity(
          preview.resolutions[index],
          expectedTick,
          expectedParticipantId,
          `ActionAffordance ${probeName} resolution`,
        );
        const outcome = resolution.outcomes.find((candidate) => (
          candidate.inputChannel === probe.inputChannel
        )) ?? resolution.outcomes[0];
        if (!outcome) throw new Error(`ActionAffordance ${probeName} 未产生 resolution outcome。`);
        channels[probeName] = projectOutcome(outcome);
      }
    } else {
      for (const [probeName, probe] of probes) {
        const resolution = readResolutionIdentity(
          this.#resolver.resolve({ ...options, input: probe.input }),
          expectedTick,
          expectedParticipantId,
          `ActionAffordance ${probeName} resolution`,
        );
        const outcome = resolution.outcomes.find((candidate) => (
          candidate.inputChannel === probe.inputChannel
        )) ?? resolution.outcomes[0];
        if (!outcome) throw new Error(`ActionAffordance ${probeName} 未产生 resolution outcome。`);
        channels[probeName] = projectOutcome(outcome);
      }
    }
    const primaryChannel = channels[ACTION_INPUT_CHANNEL.PRIMARY];
    let primaryActionDefinitionId = primaryChannel?.actionDefinitionId ?? null;
    if (displayResolution && profile !== ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY) {
      primaryActionDefinitionId = displayResolution.outcomes.find(
        ({ inputChannel }) => inputChannel === ACTION_INPUT_CHANNEL.PRIMARY,
      )?.actionDefinitionId ?? null;
    } else if (
      profile !== ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY
      && !previewPort
      && primaryChannel
      && primaryActionDefinitionId === null
      && !options.canAct
    ) {
      const legacyDisplayResolution = readResolutionIdentity(
        this.#resolver.resolve({
          ...options,
          canAct: true,
          input: PRIMARY_PRESS_INPUT,
        }),
        expectedTick,
        expectedParticipantId,
        'ActionAffordance display resolution',
      );
      primaryActionDefinitionId = legacyDisplayResolution.outcomes.find(
        ({ inputChannel }) => inputChannel === ACTION_INPUT_CHANNEL.PRIMARY,
      )?.actionDefinitionId ?? null;
    }
    const frozenChannels = Object.freeze(channels);
    if (profile === ACTION_AFFORDANCE_PROFILE.BOT_MOBILITY) {
      const jump = frozenChannels.jump;
      const slam = frozenChannels.slam;
      if (!jump || !slam) throw new Error('ActionAffordance bot mobility channels 缺失。');
      return Object.freeze({
        tick: expectedTick,
        participantId: expectedParticipantId,
        channels: Object.freeze({ jump, slam }),
      });
    }
    if (profile === ACTION_AFFORDANCE_PROFILE.LOCAL_CONTEXT_PRIMARY) {
      const primary = frozenChannels.primary;
      const primaryHold = frozenChannels.primaryHold;
      if (!primary || !primaryHold) throw new Error('ActionAffordance local channels 缺失。');
      return Object.freeze({
        tick: expectedTick,
        participantId: expectedParticipantId,
        channels: Object.freeze({ primary, primaryHold }),
        primaryActionDefinitionId,
      });
    }
    if (!primaryChannel) throw new Error('ActionAffordance primary channel 缺失。');
    return Object.freeze({
      tick: expectedTick,
      participantId: expectedParticipantId,
      channels: frozenChannels,
      primaryActionDefinitionId,
    });
  }
}
