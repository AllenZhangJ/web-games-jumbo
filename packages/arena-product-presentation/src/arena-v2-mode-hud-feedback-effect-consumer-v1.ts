import {
  assertSynchronousReturn as rejectThenable,
  assertTrimmedNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS,
  type ArenaV2ModeHudFeedbackQueueProjectionV1,
} from './arena-v2-mode-hud-feedback-queue-v1.js';

export const ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1 = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type ConsumerState = typeof ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1[
  keyof typeof ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1
];
type SyncMethod = (...args: unknown[]) => unknown;
type EffectConsumerOperation = 'load' | 'begin-epoch' | 'consume' | 'dispose';

const OPTION_KEYS = new Set(['audio', 'visual', 'qualityTier']);

interface AudioPortV1 {
  readonly play: SyncMethod;
  readonly stopAll: SyncMethod;
}

interface VisualPortV1 {
  readonly present: SyncMethod;
  readonly remove: SyncMethod;
  readonly clear: SyncMethod;
}

function dataField(value: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined
    || !descriptor.enumerable
    || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

export type ArenaV2ModeHudFeedbackEffectQualityTierV1 = 'low' | 'medium' | 'high';

export interface ArenaV2ModeHudFeedbackAudioCommandV1 {
  readonly sourceEventId: string;
  readonly cueId: string;
  readonly actionDefinitionId: string | null;
  readonly bus: 'SFX';
  readonly gainDb: -6 | -3 | -2;
  readonly priority: 1 | 2 | 3;
  readonly deterministicVariantIndex: number;
  readonly maximumConcurrentVoices: 8;
  readonly overflowPolicy: 'drop-lowest-priority';
}

export interface ArenaV2ModeHudFeedbackVisualCommandV1 {
  readonly sourceEventId: string;
  readonly cueId: string;
  readonly anchorParticipantId: string | null;
  readonly attackerParticipantId: string | null;
  readonly targetParticipantId: string | null;
  readonly anchorWorldPosition: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }> | null;
  readonly title: string;
  readonly explanation: string;
  readonly perspective: 'local-involved' | 'global' | 'remote-only';
  readonly emphasis: 'normal' | 'strong' | 'warning';
  readonly motionPolicy: 'standard' | 'static';
  readonly qualityTier: ArenaV2ModeHudFeedbackEffectQualityTierV1;
  readonly timingLanguage: 'reaction-action-follow-through' | 'static-result-only';
  readonly valueContrastPolicy: 'bright-core-dark-edge';
  readonly maximumLayers: 1 | 2 | 3;
  readonly maximumParticles: 0 | 24 | 48 | 96;
  readonly maximumAverageOverdraw: 2;
  readonly distortionAllowed: false;
  readonly explicitOffSwitch: true;
  readonly tick: number;
  readonly sequence: number;
}

export interface ArenaV2ModeHudFeedbackEffectConsumerSnapshotV1 {
  readonly state: ConsumerState;
  readonly consumerEpochId: string | null;
  readonly tick: number | null;
  readonly revision: number | null;
  readonly soundEnabled: boolean | null;
  readonly activeVisualSourceEventIds: readonly string[];
  readonly consumedVisualSourceEventIds: readonly string[];
  readonly consumedAudioSourceEventIds: readonly string[];
  readonly cleanup: Readonly<{
    readonly started: boolean;
    readonly visualCleared: boolean;
    readonly audioStopped: boolean;
    readonly visualEffectsOwned: boolean;
    readonly audioEffectsOwned: boolean;
  }>;
}

interface ConsumedVisualIdentityV1 {
  readonly sourceEventId: string;
  readonly tick: number;
  readonly sequence: number;
  readonly actionDefinitionId: string | null;
  readonly visualCue: string;
  readonly anchorParticipantId: string | null;
  readonly attackerParticipantId: string | null;
  readonly targetParticipantId: string | null;
}

function method(value: unknown, name: string, key: string): SyncMethod {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  const visited = new Set<object>();
  let owner: object | null = value;
  while (owner !== null) {
    if (visited.has(owner) || visited.size >= 32) {
      throw new TypeError(`${name}原型链无效。`);
    }
    visited.add(owner);
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是同步数据方法。`);
      }
      const captured = descriptor.value as SyncMethod;
      return (...args: unknown[]) => Reflect.apply(captured, value, args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  throw new TypeError(`${name}缺少${key}方法。`);
}

function options(value: unknown): Readonly<{
  readonly audio: unknown;
  readonly visual: unknown;
  readonly qualityTier: ArenaV2ModeHudFeedbackEffectQualityTierV1;
}> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 HUD Feedback Consumer options必须是对象。');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== OPTION_KEYS.size
    || keys.some((key) => typeof key !== 'string' || !OPTION_KEYS.has(key))) {
    throw new RangeError('Arena V2 HUD Feedback Consumer options字段不闭合。');
  }
  const audio = dataField(value, 'audio', 'Arena V2 HUD Feedback Consumer options');
  const visual = dataField(value, 'visual', 'Arena V2 HUD Feedback Consumer options');
  const qualityTier = dataField(
    value,
    'qualityTier',
    'Arena V2 HUD Feedback Consumer options',
  );
  if (qualityTier !== 'low' && qualityTier !== 'medium' && qualityTier !== 'high') {
    throw new RangeError('Arena V2 HUD Feedback Consumer qualityTier无效。');
  }
  return Object.freeze({ audio, visual, qualityTier });
}

function call(methodValue: SyncMethod, args: readonly unknown[], name: string): void {
  rejectThenable(methodValue(...args), name);
}

function projectionFingerprint(value: ArenaV2ModeHudFeedbackQueueProjectionV1): string {
  return JSON.stringify({
    modelTick: value.modelTick,
    stateRevision: value.stateRevision,
    soundEnabled: value.soundEnabled,
    visibleItems: value.visibleItems,
    liveAnnouncements: value.liveAnnouncements,
    oneShotAudioCues: value.oneShotAudioCues,
  });
}

function emphasisPriority(value: 'normal' | 'strong' | 'warning'): 1 | 2 | 3 {
  return value === 'warning' ? 3 : value === 'strong' ? 2 : 1;
}

function stableVariantIndex(sourceEventId: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < sourceEventId.length; index += 1) {
    hash ^= sourceEventId.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % 3;
}

function audioCommand(
  cue: ArenaV2ModeHudFeedbackQueueProjectionV1['oneShotAudioCues'][number],
): ArenaV2ModeHudFeedbackAudioCommandV1 {
  const gainPriority = emphasisPriority(cue.emphasis);
  return Object.freeze({
    sourceEventId: cue.sourceEventId,
    cueId: cue.cueId,
    actionDefinitionId: cue.actionDefinitionId,
    bus: 'SFX' as const,
    gainDb: gainPriority === 3 ? -2 as const : gainPriority === 2 ? -3 as const : -6 as const,
    priority: cue.voicePriority,
    deterministicVariantIndex: stableVariantIndex(cue.sourceEventId),
    maximumConcurrentVoices: 8 as const,
    overflowPolicy: 'drop-lowest-priority' as const,
  });
}

function visualCommand(
  item: ArenaV2ModeHudFeedbackQueueProjectionV1['visibleItems'][number],
  qualityTier: ArenaV2ModeHudFeedbackEffectQualityTierV1,
): ArenaV2ModeHudFeedbackVisualCommandV1 {
  const staticResult = item.motionPolicy === 'static';
  const maximumLayers = staticResult || qualityTier === 'low'
    ? 1 as const
    : qualityTier === 'medium' ? 2 as const : 3 as const;
  const maximumParticles = staticResult
    ? 0 as const
    : qualityTier === 'low' ? 24 as const : qualityTier === 'medium' ? 48 as const : 96 as const;
  return Object.freeze({
    sourceEventId: item.sourceEventId,
    cueId: item.visualCue,
    anchorParticipantId: item.anchorParticipantId,
    attackerParticipantId: item.attackerParticipantId,
    targetParticipantId: item.targetParticipantId,
    anchorWorldPosition: item.anchorWorldPosition,
    title: item.title,
    explanation: item.explanation,
    perspective: item.perspective,
    emphasis: item.emphasis,
    motionPolicy: item.motionPolicy,
    qualityTier,
    timingLanguage: staticResult
      ? 'static-result-only' as const
      : 'reaction-action-follow-through' as const,
    valueContrastPolicy: 'bright-core-dark-edge' as const,
    maximumLayers,
    maximumParticles,
    maximumAverageOverdraw: 2 as const,
    distortionAllowed: false as const,
    explicitOffSwitch: true as const,
    tick: item.tick,
    sequence: item.sequence,
  });
}

export class ArenaV2ModeHudFeedbackEffectConsumerV1 {
  readonly #audio: AudioPortV1;
  readonly #visual: VisualPortV1;
  readonly #qualityTier: ArenaV2ModeHudFeedbackEffectQualityTierV1;
  #state: ConsumerState = ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.CREATED;
  #tick: number | null = null;
  #revision: number | null = null;
  #fingerprint: string | null = null;
  #consumerEpochId: string | null = null;
  #soundEnabled: boolean | null = null;
  #activeVisualIds = new Set<string>();
  #activeVisualMotionPolicies = new Map<string, 'standard' | 'static'>();
  #consumedVisualIdentities: ConsumedVisualIdentityV1[] = [];
  #consumedAudioIds: string[] = [];
  #operation: EffectConsumerOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #operationFailure: unknown = null;
  #cleanupStarted = false;
  #visualCleared = false;
  #audioStopped = false;
  #visualEffectsOwned = false;
  #audioEffectsOwned = false;

  constructor(value: unknown) {
    const resolved = options(value);
    this.#audio = Object.freeze({
      play: method(resolved.audio, 'Arena V2 HUD Feedback Consumer audio', 'play'),
      stopAll: method(resolved.audio, 'Arena V2 HUD Feedback Consumer audio', 'stopAll'),
    });
    this.#visual = Object.freeze({
      present: method(resolved.visual, 'Arena V2 HUD Feedback Consumer visual', 'present'),
      remove: method(resolved.visual, 'Arena V2 HUD Feedback Consumer visual', 'remove'),
      clear: method(resolved.visual, 'Arena V2 HUD Feedback Consumer visual', 'clear'),
    });
    this.#qualityTier = resolved.qualityTier;
    Object.freeze(this);
  }

  get state(): ConsumerState {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #beginOperation(operation: EffectConsumerOperation): void {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    this.#operationFailure = null;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(
      `Arena V2 HUD Feedback Consumer拒绝${this.#operation}期间同步重入${operation}。`,
    );
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertOperationCommit(operation: EffectConsumerOperation): void {
    if (this.#operation !== operation) {
      throw new Error(`Arena V2 HUD Feedback Consumer缺少${operation}操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #endOperation(operation: EffectConsumerOperation): void {
    const reentryError = this.#reentryError;
    const operationFailure = this.#operationFailure;
    this.#operation = null;
    this.#reentryError = null;
    this.#operationFailure = null;
    if (reentryError === null) return;
    const failure = operationFailure === null || operationFailure === reentryError
      ? reentryError
      : new AggregateError(
        [operationFailure, reentryError],
        `Arena V2 HUD Feedback Consumer ${operation}失败且检测到同步重入。`,
      );
    if (this.#state === ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.DISPOSED) {
      this.#state = ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.FAILED;
      throw failure;
    }
    if (this.#state === ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.FAILED) {
      throw failure;
    }
    this.#fail(failure);
  }

  load(): this {
    this.#assertNoOperation('load');
    this.#beginOperation('load');
    try {
      if (this.#state === ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.DISPOSED) {
        throw new Error('Arena V2 HUD Feedback Consumer已销毁。');
      }
      if (this.#state === ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.FAILED) {
        throw new Error('Arena V2 HUD Feedback Consumer已失败关闭。');
      }
      this.#state = ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.READY;
      return this;
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      this.#endOperation('load');
    }
  }

  beginEpoch(consumerEpochIdValue: unknown): void {
    this.#assertNoOperation('begin-epoch');
    if (this.#state !== ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.READY) {
      throw new Error(`Arena V2 HUD Feedback Consumer状态${this.#state}不能切换epoch。`);
    }
    const consumerEpochId = assertTrimmedNonEmptyString(
      consumerEpochIdValue,
      'Arena V2 HUD Feedback Consumer epoch id',
    );
    if (consumerEpochId === this.#consumerEpochId) {
      throw new RangeError('Arena V2 HUD Feedback Consumer拒绝复用epoch id。');
    }
    this.#beginOperation('begin-epoch');
    try {
      this.#cleanupStarted = true;
      this.#visualCleared = !this.#visualEffectsOwned;
      this.#audioStopped = !this.#audioEffectsOwned;
      if (this.#visualEffectsOwned) {
        call(this.#visual.clear, [], 'Arena V2 HUD visual.clear epoch');
        this.#assertOperationCommit('begin-epoch');
        this.#visualCleared = true;
        this.#visualEffectsOwned = false;
      }
      if (this.#audioEffectsOwned) {
        call(this.#audio.stopAll, [], 'Arena V2 HUD audio.stopAll epoch');
        this.#assertOperationCommit('begin-epoch');
        this.#audioStopped = true;
        this.#audioEffectsOwned = false;
      }
      this.#assertOperationCommit('begin-epoch');
      this.#activeVisualIds.clear();
      this.#activeVisualMotionPolicies.clear();
      this.#consumedVisualIdentities = [];
      this.#consumedAudioIds = [];
      this.#tick = null;
      this.#revision = null;
      this.#fingerprint = null;
      this.#consumerEpochId = consumerEpochId;
      this.#soundEnabled = null;
      this.#cleanupStarted = false;
      this.#visualCleared = false;
      this.#audioStopped = false;
      this.#visualEffectsOwned = false;
      this.#audioEffectsOwned = false;
    } catch (error) {
      this.#fail(error);
    } finally {
      this.#endOperation('begin-epoch');
    }
  }

  #fail(error: unknown): never {
    if (this.#operation !== null) this.#operationFailure ??= error;
    this.#state = ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.FAILED;
    this.#cleanupStarted = true;
    const cleanupErrors = this.#cleanupOwnedEffects();
    this.#activeVisualIds.clear();
    this.#activeVisualMotionPolicies.clear();
    const failure = new Error('Arena V2 HUD Feedback Consumer消费失败。') as Error & {
      cleanupErrors?: readonly unknown[];
    };
    failure.cause = error;
    if (cleanupErrors.length > 0) failure.cleanupErrors = Object.freeze(cleanupErrors);
    if (this.#operation !== null) this.#operationFailure = failure;
    throw failure;
  }

  #cleanupOwnedEffects(): readonly unknown[] {
    const cleanupErrors: unknown[] = [];
    if (this.#visualEffectsOwned && !this.#visualCleared) {
      const reentrySequence = this.#reentrySequence;
      try {
        call(this.#visual.clear, [], 'Arena V2 HUD visual.clear');
        if (this.#reentrySequence !== reentrySequence) {
          cleanupErrors.push(this.#reentryError ?? new Error(
            'Arena V2 HUD visual.clear清理期间发生重入。',
          ));
          return Object.freeze(cleanupErrors);
        }
        this.#visualCleared = true;
        this.#visualEffectsOwned = false;
      } catch (cause) {
        cleanupErrors.push(cause);
        if (this.#reentrySequence !== reentrySequence) return Object.freeze(cleanupErrors);
      }
    }
    if (this.#audioEffectsOwned && !this.#audioStopped) {
      const reentrySequence = this.#reentrySequence;
      try {
        call(this.#audio.stopAll, [], 'Arena V2 HUD audio.stopAll');
        if (this.#reentrySequence !== reentrySequence) {
          cleanupErrors.push(this.#reentryError ?? new Error(
            'Arena V2 HUD audio.stopAll清理期间发生重入。',
          ));
          return Object.freeze(cleanupErrors);
        }
        this.#audioStopped = true;
        this.#audioEffectsOwned = false;
      } catch (cause) { cleanupErrors.push(cause); }
    }
    return Object.freeze(cleanupErrors);
  }

  #cleanupComplete(): boolean {
    return (!this.#visualEffectsOwned || this.#visualCleared)
      && (!this.#audioEffectsOwned || this.#audioStopped);
  }

  #consume(value: ArenaV2ModeHudFeedbackQueueProjectionV1): void {
    if (this.#state !== ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.READY) {
      throw new Error(`Arena V2 HUD Feedback Consumer当前状态不可消费：${this.#state}。`);
    }
    if (value.schemaVersion !== 1
      || !Number.isInteger(value.modelTick) || value.modelTick < 0
      || !Number.isInteger(value.stateRevision) || value.stateRevision < 1
      || typeof value.soundEnabled !== 'boolean'
      || value.visibleItems.length > 3) {
      throw new RangeError('Arena V2 HUD Feedback Consumer投影合同无效。');
    }
    if (!value.soundEnabled && value.oneShotAudioCues.length > 0) {
      throw new RangeError('Arena V2 HUD Feedback Consumer静音投影不得携带one-shot声音。');
    }
    const fingerprint = projectionFingerprint(value);
    if (this.#revision !== null) {
      if (value.stateRevision < this.#revision || value.modelTick < this.#tick!) {
        throw new RangeError('Arena V2 HUD Feedback Consumer拒绝倒退投影。');
      }
      if (value.stateRevision === this.#revision) {
        if (fingerprint !== this.#fingerprint) {
          throw new RangeError('Arena V2 HUD Feedback Consumer同revision内容漂移。');
        }
        return;
      }
    }
    const visibleIds = value.visibleItems.map(({ sourceEventId }) => sourceEventId);
    if (new Set(visibleIds).size !== visibleIds.length) {
      throw new RangeError('Arena V2 HUD Feedback Consumer可见反馈ID重复。');
    }
    const audioIds = value.oneShotAudioCues.map(({ sourceEventId }) => sourceEventId);
    if (new Set(audioIds).size !== audioIds.length
      || audioIds.some((id) => this.#consumedAudioIds.includes(id))) {
      throw new RangeError('Arena V2 HUD Feedback Consumer拒绝重复one-shot声音。');
    }
    if (value.oneShotAudioCues.length
      > ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.oneShotAudioCueCount
      || value.oneShotAudioCues.some(({ voicePriority, emphasis }) => (
        (voicePriority !== 1 && voicePriority !== 2 && voicePriority !== 3)
        || (emphasis !== 'normal' && emphasis !== 'strong' && emphasis !== 'warning')
      ))) {
      throw new RangeError('Arena V2 HUD Feedback Consumer声音抢占优先级无效。');
    }
    const consumedVisualIdentitiesById = new Map(
      this.#consumedVisualIdentities.map((identity) => [identity.sourceEventId, identity]),
    );
    for (const item of value.visibleItems) {
      const consumedIdentity = consumedVisualIdentitiesById.get(item.sourceEventId);
      if (consumedIdentity !== undefined
        && (consumedIdentity.tick !== item.tick
          || consumedIdentity.sequence !== item.sequence
          || consumedIdentity.actionDefinitionId !== item.actionDefinitionId
          || consumedIdentity.visualCue !== item.visualCue
          || consumedIdentity.anchorParticipantId !== item.anchorParticipantId
          || consumedIdentity.attackerParticipantId !== item.attackerParticipantId
          || consumedIdentity.targetParticipantId !== item.targetParticipantId)) {
        throw new RangeError('Arena V2 HUD Feedback Consumer已消费视觉反馈身份漂移。');
      }
    }
    const visualItemsToPresent = value.visibleItems.filter(({ sourceEventId }) => (
      !this.#activeVisualIds.has(sourceEventId)
      && !consumedVisualIdentitiesById.has(sourceEventId)
    ));
    const currentActiveMotionPolicies = new Map([...this.#activeVisualIds].map((sourceEventId) => {
      const motionPolicy = this.#activeVisualMotionPolicies.get(sourceEventId);
      if (motionPolicy === undefined) {
        throw new Error('Arena V2 HUD active visual缺少动态偏好水位。');
      }
      return [sourceEventId, motionPolicy] as const;
    }));
    const visualItemsToRefresh = value.visibleItems.filter((item) => (
      this.#activeVisualIds.has(item.sourceEventId)
      && currentActiveMotionPolicies.get(item.sourceEventId) === 'standard'
      && item.motionPolicy === 'static'
    ));
    const visualRefreshIds = new Set(
      visualItemsToRefresh.map(({ sourceEventId }) => sourceEventId),
    );
    try {
      if (!value.soundEnabled && this.#audioEffectsOwned) {
        call(this.#audio.stopAll, [], 'Arena V2 HUD audio.stopAll muted');
        this.#assertOperationCommit('consume');
        this.#audioStopped = true;
        this.#audioEffectsOwned = false;
      }
      for (const sourceEventId of this.#activeVisualIds) {
        if (!visibleIds.includes(sourceEventId) || visualRefreshIds.has(sourceEventId)) {
          this.#visualEffectsOwned = true;
          call(this.#visual.remove, [sourceEventId], 'Arena V2 HUD visual.remove');
          this.#assertOperationCommit('consume');
        }
      }
      for (const item of [...visualItemsToPresent, ...visualItemsToRefresh]) {
        this.#visualEffectsOwned = true;
        call(
          this.#visual.present,
          [visualCommand(item, this.#qualityTier)],
          'Arena V2 HUD visual.present',
        );
        this.#assertOperationCommit('consume');
      }
      for (const cue of value.oneShotAudioCues) {
        const item = value.visibleItems.find(({ sourceEventId }) => (
          sourceEventId === cue.sourceEventId
        )) ?? value.state.entries.find(({ item: retained }) => (
          retained.sourceEventId === cue.sourceEventId
        ))?.item;
        if (item === undefined
          || item.audioCue !== cue.cueId
          || item.actionDefinitionId !== cue.actionDefinitionId
          || item.emphasis !== cue.emphasis) {
          throw new RangeError('Arena V2 HUD one-shot声音必须对应当前可见或保留反馈。');
        }
        this.#audioStopped = false;
        this.#audioEffectsOwned = true;
        call(this.#audio.play, [audioCommand(cue)], 'Arena V2 HUD audio.play');
        this.#assertOperationCommit('consume');
      }
    } catch (error) {
      this.#fail(error);
    }
    this.#assertOperationCommit('consume');
    const retainedActiveVisualIds = [...this.#activeVisualIds].filter((sourceEventId) => (
      visibleIds.includes(sourceEventId)
    ));
    const newlyPresentedVisualIds = visualItemsToPresent.map(({ sourceEventId }) => sourceEventId);
    this.#activeVisualIds = new Set([
      ...retainedActiveVisualIds,
      ...newlyPresentedVisualIds,
    ]);
    const refreshedPolicies = new Map(visualItemsToRefresh.map(({ sourceEventId, motionPolicy }) => (
      [sourceEventId, motionPolicy] as const
    )));
    const presentedPolicies = new Map(visualItemsToPresent.map(({ sourceEventId, motionPolicy }) => (
      [sourceEventId, motionPolicy] as const
    )));
    this.#activeVisualMotionPolicies = new Map([...this.#activeVisualIds].map((sourceEventId) => {
      const motionPolicy = refreshedPolicies.get(sourceEventId)
        ?? presentedPolicies.get(sourceEventId)
        ?? currentActiveMotionPolicies.get(sourceEventId);
      if (motionPolicy === undefined) {
        throw new Error('Arena V2 HUD active visual缺少动态偏好水位。');
      }
      return [sourceEventId, motionPolicy] as const;
    }));
    this.#visualEffectsOwned = this.#activeVisualIds.size > 0;
    this.#consumedVisualIdentities = [
      ...this.#consumedVisualIdentities,
      ...visualItemsToPresent.map(({
        sourceEventId,
        tick,
        sequence,
        actionDefinitionId,
        visualCue,
        anchorParticipantId,
        attackerParticipantId,
        targetParticipantId,
      }) => Object.freeze({
        sourceEventId,
        tick,
        sequence,
        actionDefinitionId,
        visualCue,
        anchorParticipantId,
        attackerParticipantId,
        targetParticipantId,
      })),
    ].slice(-ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.seenIdentityCount);
    this.#consumedAudioIds = [...this.#consumedAudioIds, ...audioIds].slice(
      -ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.seenIdentityCount,
    );
    this.#tick = value.modelTick;
    this.#revision = value.stateRevision;
    this.#soundEnabled = value.soundEnabled;
    this.#fingerprint = fingerprint;
  }

  consume(value: ArenaV2ModeHudFeedbackQueueProjectionV1): void {
    this.#beginOperation('consume');
    try {
      if (this.#consumerEpochId !== null) {
        throw new Error('Arena V2 HUD Feedback Consumer已启用epoch，必须携带epoch id消费。');
      }
      this.#consume(value);
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      this.#endOperation('consume');
    }
  }

  consumeEpoch(
    consumerEpochIdValue: unknown,
    value: ArenaV2ModeHudFeedbackQueueProjectionV1,
  ): void {
    this.#beginOperation('consume');
    try {
      const consumerEpochId = assertTrimmedNonEmptyString(
        consumerEpochIdValue,
        'Arena V2 HUD Feedback Consumer consume epoch id',
      );
      if (consumerEpochId !== this.#consumerEpochId || this.#consumerEpochId === null) {
        throw new RangeError('Arena V2 HUD Feedback Consumer拒绝旧epoch回调。');
      }
      this.#consume(value);
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      this.#endOperation('consume');
    }
  }

  getSnapshot(): ArenaV2ModeHudFeedbackEffectConsumerSnapshotV1 {
    this.#assertNoOperation('getSnapshot');
    return Object.freeze({
      state: this.#state,
      consumerEpochId: this.#consumerEpochId,
      tick: this.#tick,
      revision: this.#revision,
      soundEnabled: this.#soundEnabled,
      activeVisualSourceEventIds: Object.freeze([...this.#activeVisualIds].sort()),
      consumedVisualSourceEventIds: Object.freeze(
        this.#consumedVisualIdentities.map(({ sourceEventId }) => sourceEventId),
      ),
      consumedAudioSourceEventIds: Object.freeze([...this.#consumedAudioIds]),
      cleanup: Object.freeze({
        started: this.#cleanupStarted,
        visualCleared: this.#visualCleared,
        audioStopped: this.#audioStopped,
        visualEffectsOwned: this.#visualEffectsOwned,
        audioEffectsOwned: this.#audioEffectsOwned,
      }),
    });
  }

  dispose(): void {
    this.#assertNoOperation('dispose');
    if (this.#state === ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.DISPOSED) return;
    this.#beginOperation('dispose');
    try {
      this.#cleanupStarted = true;
      const errors = [...this.#cleanupOwnedEffects()];
      if (this.#cleanupComplete()) {
        this.#activeVisualIds.clear();
        this.#activeVisualMotionPolicies.clear();
        this.#consumedVisualIdentities = [];
        this.#consumedAudioIds = [];
        this.#tick = null;
        this.#revision = null;
        this.#fingerprint = null;
        this.#consumerEpochId = null;
        this.#soundEnabled = null;
        this.#state = ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.DISPOSED;
      } else {
        this.#state = ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.FAILED;
      }
      if (errors.length > 0) {
        const failure = new Error('Arena V2 HUD Feedback Consumer销毁不完整。') as Error & {
          cleanupErrors: readonly unknown[];
        };
        failure.cleanupErrors = Object.freeze(errors);
        throw failure;
      }
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      this.#endOperation('dispose');
    }
  }
}

export const ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultSurfaceWired: false as const,
  formalAudioAssetsReady: false as const,
  formalVfxAssetsReady: false as const,
  audioBus: 'SFX' as const,
  audioVoicePrioritySource: 'feedback-queue-semantic-priority' as const,
  audioGainSource: 'existing-feedback-emphasis' as const,
  audioVoicePriorityDoesNotChangeGainDb: true as const,
  localWeaponAudioDoesNotRequireVisibleFeedbackSlot: true as const,
  visualPerspectiveSource: 'validated-feedback-item-perspective' as const,
  visualPerspectiveCopiedWithoutLocalizedTextInference: true as const,
  visualCommandCarriesAttackerAndTargetSeparately: true as const,
  visualCommandDoesNotInferCombatIdentityFromAnchor: true as const,
  maximumConcurrentAudioVoices:
    ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.oneShotAudioCueCount,
  maximumActiveVisuals: 3 as const,
  maximumConsumedVisualIdentities:
    ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.seenIdentityCount,
  visualOneShotIdentitySource:
    'feedback-source-event-id-tick-sequence-action-cue-and-combat-identities' as const,
  sameTickDistinctFeedbackIdsPreserved: true as const,
  laterRevisionDoesNotReplayConsumedVisualIdentity: true as const,
  consumedVisualIdentityDriftFailsClosed: true as const,
  activeVisualCanDowngradeToStaticWithoutReplayingIdentity: true as const,
  staticRetainedVisualDoesNotReanimateWhenPreferenceRelaxes: true as const,
  mutingStopsOwnedHudAudioImmediately: true as const,
  unmutingDoesNotReplayConsumedAudioIdentity: true as const,
  maximumParticlesPerEffect: 96 as const,
  maximumAverageOverdraw: 2 as const,
  mobileDistortionAllowed: false as const,
  cleanupRetriesOnlyIncompleteExternalEffects: true as const,
  epochSwitchCarriesPartialCleanupIntoFailedState: true as const,
  terminalStateWaitsForVisualClearAndAudioStop: true as const,
  freshOwnerDisposeHasNoExternalSideEffects: true as const,
  externalEffectOwnershipBeginsBeforePotentialSideEffect: true as const,
  constructorOptionsUseDescriptorOnlyDataFields: true as const,
  portMethodPrototypeScanDepthLimit: 32 as const,
  portMethodBindingUsesReflectApply: true as const,
  consumerEpochIdRequiresTrimmedIdentity: true as const,
  synchronousLifecycleReentryRejected: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  externalEffectCallbacksCheckedBeforeLaterEffectsOrProjectionWatermark: true as const,
  swallowedExternalEffectReentryStopsLaterEffectDispatch: true as const,
  cleanupReentryRetainsCurrentAndLaterEffectOwnership: true as const,
  swallowedVisualOrAudioReentryFailsClosed: true as const,
  loadEpochConsumeAndDisposeCommitUnderStickyOperation: true as const,
  stateAndSnapshotReadsRejectedDuringOperation: true as const,
  idempotentDisposeChecksReentryBeforeFastPath: true as const,
  operationLockScope: 'begin-epoch-consume-dispose-with-load-snapshot-rejection' as const,
  constructorAccessorsExecuted: false as const,
  validationStatus: 'not-run' as const,
  ownsAuthorityState: false as const,
});
