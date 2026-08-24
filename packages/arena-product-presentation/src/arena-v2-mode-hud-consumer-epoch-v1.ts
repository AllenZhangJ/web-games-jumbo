import {
  assertKnownKeys,
  assertNonEmptyString,
  assertTrimmedNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
  createArenaMatchEventV6,
  type ArenaMatchEventV6,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  advanceArenaV2ModeHudFeedbackQueueV1,
  type ArenaV2ModeHudFeedbackQueueProjectionV1,
  type ArenaV2ModeHudFeedbackQueueStateV1,
} from './arena-v2-mode-hud-feedback-queue-v1.js';
import {
  createArenaV2ModeHudRenderModelV1,
  type ArenaV2ModeHudPreferenceSnapshotV1,
  type ArenaV2ModeHudRenderModelV1,
} from './arena-v2-mode-hud-render-model-v1.js';
import type { ArenaV2ModeHudViewModelV1 } from './arena-v2-mode-hud-view-model-v1.js';

export const ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1 = Object.freeze({
  CREATED: 'created',
  ACTIVE: 'active',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

export type ArenaV2ModeHudConsumerEpochStateV1 =
  typeof ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1[
    keyof typeof ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1
  ];

export interface ArenaV2ModeHudConsumerEpochProjectionV1 {
  readonly schemaVersion: 1;
  readonly consumerEpochId: string;
  readonly generation: number;
  readonly tick: number;
  readonly eventSequenceWaterline: number;
  readonly model: ArenaV2ModeHudRenderModelV1;
  readonly feedback: ArenaV2ModeHudFeedbackQueueProjectionV1;
}

export interface ArenaV2ModeHudConsumerEpochSnapshotV1 {
  readonly state: ArenaV2ModeHudConsumerEpochStateV1;
  readonly consumerEpochId: string | null;
  readonly generation: number;
  readonly modeDefinitionId: string | null;
  readonly tick: number | null;
  readonly eventSequenceWaterline: number | null;
  readonly feedbackRevision: number | null;
}

const BEGIN_KEYS = new Set(['consumerEpochId', 'baselineModel', 'preferences']);
const CONSUME_REQUIRED_KEYS = new Set([
  'consumerEpochId', 'model', 'sourceEvents', 'preferences',
]);
const CONSUME_KEYS = new Set([
  ...CONSUME_REQUIRED_KEYS, 'projectedRenderModel',
]);
const MODEL_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'modeDefinitionId', 'phase',
  'remainingTicks', 'preparationRemainingTicks', 'localParticipant',
  'participantIdentities', 'mode', 'supplyResyncReady', 'supplyCadence', 'supplyMarkers',
  'supplyFeedbackCues', 'weaponFeedbackEvents', 'modeFeedbackEvents', 'result',
]);

function exact(value: unknown, keys: ReadonlySet<string>, name: string) {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function exactWithOptional(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  requiredKeys: ReadonlySet<string>,
  name: string,
) {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, allowedKeys, name);
  for (const key of requiredKeys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function safeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function modelIdentity(value: unknown, name: string): ArenaV2ModeHudViewModelV1 {
  const model = cloneFrozenData(value, name);
  assertKnownKeys(model, MODEL_KEYS, name);
  for (const key of MODEL_KEYS) {
    if (!Object.hasOwn(model, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  if (model.schemaVersion !== 1) throw new RangeError(`${name}.schemaVersion不受支持。`);
  safeInteger(model.tick, `${name}.tick`);
  safeInteger(model.eventSequence, `${name}.eventSequence`);
  assertNonEmptyString(model.modeDefinitionId, `${name}.modeDefinitionId`);
  if (
    !Array.isArray(model.weaponFeedbackEvents)
    || !Array.isArray(model.modeFeedbackEvents)
    || !Array.isArray(model.supplyFeedbackCues)
  ) throw new TypeError(`${name}反馈集合必须是数组。`);
  return model as unknown as ArenaV2ModeHudViewModelV1;
}

function preferences(
  value: unknown,
  name: string,
): ArenaV2ModeHudPreferenceSnapshotV1 {
  const source = cloneFrozenData(value, name) as ArenaV2ModeHudPreferenceSnapshotV1;
  if (typeof source.reducedMotion !== 'boolean' || typeof source.soundEnabled !== 'boolean') {
    throw new TypeError(`${name}字段必须是boolean。`);
  }
  return source;
}

function hasOneShotFacts(model: ArenaV2ModeHudViewModelV1): boolean {
  return model.weaponFeedbackEvents.length > 0
    || model.modeFeedbackEvents.length > 0
    || model.supplyFeedbackCues.length > 0;
}

const FEEDBACK_ITEM_KEYS = new Set([
  'sourceEventId', 'tick', 'sequence', 'category', 'anchorParticipantId',
  'attackerParticipantId', 'targetParticipantId',
  'anchorWorldPosition', 'actionDefinitionId', 'perspective', 'title', 'explanation', 'emphasis',
  'visualCue', 'audioCue', 'motionPolicy',
]);
const FEEDBACK_ITEM_FIXED_KEYS = Object.freeze([
  'sourceEventId', 'tick', 'sequence', 'category', 'anchorParticipantId',
  'attackerParticipantId', 'targetParticipantId',
  'anchorWorldPosition', 'actionDefinitionId', 'perspective', 'emphasis', 'motionPolicy',
] as const);

function projectedRenderModel(
  genericModel: ArenaV2ModeHudRenderModelV1,
  value: unknown,
): ArenaV2ModeHudRenderModelV1 {
  const projected = cloneFrozenData(value, 'Arena V2 HUD Consumer Epoch projectedRenderModel');
  assertKnownKeys(projected, new Set([
    'schemaVersion', 'tick', 'modeDefinitionId', 'modeKind', 'modePresentation', 'phase',
    'preferences', 'participantIdentities', 'primaryTimer', 'preparationTimer', 'localFacts',
    'modeFacts', 'supplyItems', 'feedbackItems', 'supplyResyncReady', 'result',
  ]), 'Arena V2 HUD Consumer Epoch projectedRenderModel');
  const { feedbackItems: ignoredGenericFeedback, ...genericShell } = genericModel;
  const { feedbackItems: projectedFeedback, ...projectedShell } = projected;
  if (createDeterministicDataHash(
    genericShell,
    'Arena V2 HUD Consumer Epoch generic render shell',
  ) !== createDeterministicDataHash(
    projectedShell,
    'Arena V2 HUD Consumer Epoch projected render shell',
  )) {
    throw new RangeError('Arena V2 HUD Consumer Epoch投影模型不得修改反馈列表之外的字段。');
  }
  void ignoredGenericFeedback;
  if (!Array.isArray(projectedFeedback)
    || projectedFeedback.length !== genericModel.feedbackItems.length) {
    throw new RangeError('Arena V2 HUD Consumer Epoch投影反馈数量必须与通用模型一致。');
  }
  for (let index = 0; index < projectedFeedback.length; index += 1) {
    const genericItem = genericModel.feedbackItems[index]!;
    const projectedItem = projectedFeedback[index]!;
    assertKnownKeys(
      projectedItem,
      FEEDBACK_ITEM_KEYS,
      `Arena V2 HUD Consumer Epoch projected feedback[${index}]`,
    );
    for (const key of FEEDBACK_ITEM_KEYS) {
      if (!Object.hasOwn(projectedItem, key)) {
        throw new TypeError(`Arena V2 HUD Consumer Epoch projected feedback[${index}]缺少${key}。`);
      }
    }
    for (const key of FEEDBACK_ITEM_FIXED_KEYS) {
      if (createDeterministicDataHash(
        genericItem[key],
        `Arena V2 HUD Consumer Epoch generic feedback[${index}].${key}`,
      ) !== createDeterministicDataHash(
        projectedItem[key],
        `Arena V2 HUD Consumer Epoch projected feedback[${index}].${key}`,
      )) {
        throw new RangeError(`Arena V2 HUD Consumer Epoch投影反馈不得修改${key}。`);
      }
    }
    if (genericItem.category !== 'weapon'
      && createDeterministicDataHash(
        genericItem,
        `Arena V2 HUD Consumer Epoch generic feedback[${index}]`,
      ) !== createDeterministicDataHash(
        projectedItem,
        `Arena V2 HUD Consumer Epoch projected feedback[${index}]`,
      )) {
      throw new RangeError('Arena V2 HUD Consumer Epoch只允许专门化武器反馈。');
    }
    if (typeof projectedItem.title !== 'string' || projectedItem.title.length === 0
      || typeof projectedItem.explanation !== 'string' || projectedItem.explanation.length === 0
      || typeof projectedItem.visualCue !== 'string' || projectedItem.visualCue.length === 0
      || (projectedItem.audioCue !== null
        && (typeof projectedItem.audioCue !== 'string' || projectedItem.audioCue.length === 0))) {
      throw new TypeError('Arena V2 HUD Consumer Epoch投影武器文案或Cue无效。');
    }
  }
  return projected as unknown as ArenaV2ModeHudRenderModelV1;
}

function completeEventBatch(
  value: unknown,
  previousWaterline: number,
  model: ArenaV2ModeHudViewModelV1,
): readonly DeepReadonly<ArenaMatchEventV6>[] {
  if (!Array.isArray(value)) throw new TypeError('Arena V2 HUD Consumer Epoch sourceEvents必须是数组。');
  const events = Object.freeze(value.map(createArenaMatchEventV6));
  if (model.eventSequence !== previousWaterline + events.length) {
    throw new RangeError('Arena V2 HUD Consumer Epoch事件批次未从旧水位闭合到新水位。');
  }
  const eventIds = new Set<string>();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    if (event.sequence !== previousWaterline + index) {
      throw new RangeError('Arena V2 HUD Consumer Epoch事件批次sequence不连续。');
    }
    if (event.tick >= model.tick) {
      throw new RangeError('Arena V2 HUD Consumer Epoch事件不得晚于post-step模型。');
    }
    if (eventIds.has(event.id)) {
      throw new RangeError('Arena V2 HUD Consumer Epoch事件批次ID重复。');
    }
    if (
      'modeDefinitionId' in event
      && event.modeDefinitionId !== model.modeDefinitionId
    ) throw new RangeError('Arena V2 HUD Consumer Epoch事件Mode身份漂移。');
    eventIds.add(event.id);
  }
  const projectedSourceIds = [
    ...model.weaponFeedbackEvents.map(({ sourceEventId }) => sourceEventId),
    ...model.modeFeedbackEvents.map(({ sourceEventId }) => sourceEventId),
    ...model.supplyFeedbackCues.flatMap(({ sourceEventIds }) => sourceEventIds),
  ];
  if (projectedSourceIds.some((id) => !eventIds.has(id))) {
    throw new RangeError('Arena V2 HUD Consumer Epoch反馈来源不属于当前完整事件批次。');
  }
  return events;
}

/**
 * Presentation-only restore boundary. A restored runtime starts a fresh local
 * consumer epoch from a stable, event-free HUD model. Historical events stay
 * below the epoch waterline and can never be replayed as announcements/audio.
 */
export class ArenaV2ModeHudConsumerEpochV1 {
  #state: ArenaV2ModeHudConsumerEpochStateV1 =
    ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1.CREATED;
  #consumerEpochId: string | null = null;
  #generation = 0;
  #modeDefinitionId: string | null = null;
  #tick: number | null = null;
  #eventSequenceWaterline: number | null = null;
  #feedbackState: ArenaV2ModeHudFeedbackQueueStateV1 | null = null;

  get state(): ArenaV2ModeHudConsumerEpochStateV1 { return this.#state; }

  #assertNotDisposed(): void {
    if (this.#state === ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1.DISPOSED) {
      throw new Error('Arena V2 HUD Consumer Epoch已销毁。');
    }
  }

  #fail(error: unknown): never {
    this.#feedbackState = null;
    this.#state = ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1.FAILED;
    const failure = new Error('Arena V2 HUD Consumer Epoch消费失败。');
    failure.cause = error;
    throw failure;
  }

  beginEpoch(value: unknown): ArenaV2ModeHudConsumerEpochProjectionV1 {
    this.#assertNotDisposed();
    const source = exact(value, BEGIN_KEYS, 'Arena V2 HUD Consumer Epoch begin');
    const consumerEpochId = assertTrimmedNonEmptyString(
      source.consumerEpochId,
      'Arena V2 HUD Consumer Epoch id',
    );
    if (consumerEpochId === this.#consumerEpochId) {
      throw new RangeError('Arena V2 HUD Consumer Epoch拒绝复用generation id。');
    }
    try {
      const model = modelIdentity(
        source.baselineModel,
        'Arena V2 HUD Consumer Epoch baselineModel',
      );
      if (hasOneShotFacts(model)) {
        throw new RangeError('Arena V2 HUD Consumer Epoch基线不得包含历史one-shot。');
      }
      if (model.result !== null) {
        throw new RangeError('Arena V2 HUD Consumer Epoch只能从未终局的稳定基线恢复。');
      }
      const renderModel = createArenaV2ModeHudRenderModelV1(
        model,
        preferences(source.preferences, 'Arena V2 HUD Consumer Epoch preferences'),
      );
      const feedback = advanceArenaV2ModeHudFeedbackQueueV1(renderModel, null);
      if (feedback.liveAnnouncements.length > 0 || feedback.oneShotAudioCues.length > 0) {
        throw new Error('Arena V2 HUD Consumer Epoch基线意外产生one-shot。');
      }
      this.#consumerEpochId = consumerEpochId;
      this.#generation += 1;
      this.#modeDefinitionId = model.modeDefinitionId;
      this.#tick = model.tick;
      this.#eventSequenceWaterline = model.eventSequence;
      this.#feedbackState = feedback.state;
      this.#state = ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1.ACTIVE;
      return Object.freeze({
        schemaVersion: 1 as const,
        consumerEpochId,
        generation: this.#generation,
        tick: model.tick,
        eventSequenceWaterline: model.eventSequence,
        model: renderModel,
        feedback,
      });
    } catch (error) {
      return this.#fail(error);
    }
  }

  consume(value: unknown): ArenaV2ModeHudConsumerEpochProjectionV1 {
    this.#assertNotDisposed();
    const source = exactWithOptional(
      value,
      CONSUME_KEYS,
      CONSUME_REQUIRED_KEYS,
      'Arena V2 HUD Consumer Epoch consume',
    );
    const consumerEpochId = assertTrimmedNonEmptyString(
      source.consumerEpochId,
      'Arena V2 HUD Consumer Epoch consume id',
    );
    if (consumerEpochId !== this.#consumerEpochId) {
      throw new RangeError('Arena V2 HUD Consumer Epoch拒绝旧generation回调。');
    }
    if (this.#state !== ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1.ACTIVE) {
      throw new Error(`Arena V2 HUD Consumer Epoch状态${this.#state}不可消费。`);
    }
    try {
      const model = modelIdentity(source.model, 'Arena V2 HUD Consumer Epoch model');
      if (model.modeDefinitionId !== this.#modeDefinitionId) {
        throw new RangeError('Arena V2 HUD Consumer Epoch mode身份漂移。');
      }
      const previousTick = this.#tick!;
      const previousWaterline = this.#eventSequenceWaterline!;
      const events = completeEventBatch(source.sourceEvents, previousWaterline, model);
      if (model.tick === previousTick) {
        if (events.length > 0 || model.eventSequence !== previousWaterline || hasOneShotFacts(model)) {
          throw new RangeError('Arena V2 HUD Consumer Epoch同tick只能重建持续静态状态。');
        }
      } else if (model.tick !== previousTick + 1) {
        throw new RangeError('Arena V2 HUD Consumer Epoch拒绝tick跳跃或倒退。');
      }
      const genericRenderModel = createArenaV2ModeHudRenderModelV1(
        model,
        preferences(source.preferences, 'Arena V2 HUD Consumer Epoch preferences'),
      );
      const renderModel = Object.hasOwn(source, 'projectedRenderModel')
        ? projectedRenderModel(genericRenderModel, source.projectedRenderModel)
        : genericRenderModel;
      for (const item of renderModel.feedbackItems) {
        if (item.sequence < previousWaterline || item.sequence >= model.eventSequence) {
          throw new RangeError('Arena V2 HUD Consumer Epoch拒绝历史或越界one-shot。');
        }
      }
      const feedback = advanceArenaV2ModeHudFeedbackQueueV1(
        renderModel,
        this.#feedbackState,
      );
      this.#tick = model.tick;
      this.#eventSequenceWaterline = model.eventSequence;
      this.#feedbackState = feedback.state;
      return Object.freeze({
        schemaVersion: 1 as const,
        consumerEpochId,
        generation: this.#generation,
        tick: model.tick,
        eventSequenceWaterline: model.eventSequence,
        model: renderModel,
        feedback,
      });
    } catch (error) {
      return this.#fail(error);
    }
  }

  getSnapshot(): ArenaV2ModeHudConsumerEpochSnapshotV1 {
    return Object.freeze({
      state: this.#state,
      consumerEpochId: this.#consumerEpochId,
      generation: this.#generation,
      modeDefinitionId: this.#modeDefinitionId,
      tick: this.#tick,
      eventSequenceWaterline: this.#eventSequenceWaterline,
      feedbackRevision: this.#feedbackState?.revision ?? null,
    });
  }

  dispose(): void {
    if (this.#state === ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1.DISPOSED) return;
    this.#feedbackState = null;
    this.#consumerEpochId = null;
    this.#modeDefinitionId = null;
    this.#tick = null;
    this.#eventSequenceWaterline = null;
    this.#state = ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1.DISPOSED;
  }
}

export const ARENA_V2_MODE_HUD_CONSUMER_EPOCH_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  consumesCheckpointData: false as const,
  replaysHistoricalOneShots: false as const,
  boundedWeaponFeedbackRenderProjectionAllowed: true as const,
  projectedRenderModelMayChangeAuthorityIdentity: false as const,
  consumerEpochIdRequiresTrimmedIdentity: true as const,
  ownsAuthorityState: false as const,
});
