import {
  ARENA_MATCH_EVENT_V6,
  assertKnownKeys,
  assertNonEmptyString,
  assertSynchronousReturn,
  assertTrimmedNonEmptyString,
  cloneFrozenData,
  createArenaMatchEventV6,
  createDeterministicDataHash,
  createArenaWeaponFeedbackDirectionFactV2,
  type ArenaWeaponFeedbackDirectionFactV2,
  type DeepReadonly,
  type WeaponFeedbackResolvedEventV6,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2ModeHudPresentationHostV1,
  type ArenaV2ModeHudPresentationHostSnapshotV1,
} from './arena-v2-mode-hud-presentation-host-v1.js';
import {
  createArenaV2ModeHudRenderModelV1,
  type ArenaV2ModeHudRenderModelV1,
  type ArenaV2ModeHudPreferenceSnapshotV1,
} from './arena-v2-mode-hud-render-model-v1.js';
import type { ArenaV2ModeHudViewModelV1 } from './arena-v2-mode-hud-view-model-v1.js';
import type {
  ArenaV2ModeHudFeedbackAudioCommandV1,
  ArenaV2ModeHudFeedbackEffectQualityTierV1,
  ArenaV2ModeHudFeedbackVisualCommandV1,
} from './arena-v2-mode-hud-feedback-effect-consumer-v1.js';
import {
  specializeArenaV2TwentyWeaponFeedbackHudCandidateV1,
} from './arena-v2-twenty-weapon-feedback-hud-adapter-candidate-v1.js';
import type {
  ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1,
} from './arena-v2-twenty-weapon-feedback-read-plan-candidate-v1.js';
import {
  projectArenaV2WeaponImpactStrengthCandidateV1,
} from './arena-v2-weapon-impact-strength-projection-candidate-v1.js';
import {
  projectArenaV2WeaponImpactDirectionLabelCandidateV1,
} from './arena-v2-twenty-weapon-feedback-direction-read-plan-candidate-v2.js';

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  ACTIVE: 'active',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

export type ArenaV2TwentyWeaponFeedbackHudHostStateCandidateV1 =
  typeof ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1[
    keyof typeof ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1
  ];

type SyncMethod = (...args: unknown[]) => unknown;
type TwentyWeaponHudHostOperation = 'begin-epoch' | 'consume' | 'dispose';

export interface ArenaV2TwentyWeaponFeedbackHudHostSnapshotCandidateV1 {
  readonly state: ArenaV2TwentyWeaponFeedbackHudHostStateCandidateV1;
  readonly consumerEpochId: string | null;
  readonly retainedWeaponReadPlanSourceEventIds: readonly string[];
  readonly retainedGenericUnarmedSourceEventIds: readonly string[];
  readonly retainedDirectionFactSourceEventIds: readonly string[];
  readonly innerHost: ArenaV2ModeHudPresentationHostSnapshotV1;
  readonly cleanup: Readonly<{
    readonly started: boolean;
    readonly innerHostDisposed: boolean;
  }>;
}

const OPTION_KEYS = new Set(['audio', 'visual', 'qualityTier']);
const BEGIN_KEYS = new Set(['consumerEpochId', 'baselineModel', 'preferences']);
const CONSUME_KEYS = new Set([
  'consumerEpochId', 'model', 'sourceEvents', 'weaponFeedbackDirectionFactsV2', 'preferences',
]);
const WEAPON_VISUAL_CUES = new Set<unknown>([
  'impact-confirm', 'impact-surface-transfer', 'ring-out', 'evaded-warning',
  'movement-fall-warning',
]);
const WEAPON_AUDIO_CUES = new Set<unknown>([
  'weapon-hit', 'weapon-transfer', 'weapon-ring-out', 'weapon-evaded',
  'movement-fall',
]);
const MAXIMUM_SYNC_PORT_METHOD_PROTOTYPE_DEPTH = 32;

function exact(value: unknown, keys: ReadonlySet<string>, name: string) {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function findMethod(
  value: unknown,
  name: string,
  key: string,
  required: boolean,
): SyncMethod | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  const visited = new Set<object>();
  let owner: object | null = value;
  let depth = 0;
  while (owner !== null) {
    if (visited.has(owner)) {
      throw new RangeError(`${name}.${key}方法原型链存在循环。`);
    }
    if (depth >= MAXIMUM_SYNC_PORT_METHOD_PROTOTYPE_DEPTH) {
      throw new RangeError(
        `${name}.${key}方法原型链超过${MAXIMUM_SYNC_PORT_METHOD_PROTOTYPE_DEPTH}层。`,
      );
    }
    visited.add(owner);
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是同步数据方法。`);
      }
      return descriptor.value.bind(value) as SyncMethod;
    }
    owner = Object.getPrototypeOf(owner) as object | null;
    depth += 1;
  }
  if (!required) return null;
  throw new TypeError(`${name}缺少${key}方法。`);
}

function method(value: unknown, name: string, key: string): SyncMethod {
  return findMethod(value, name, key, true)!;
}

function optionalMethod(value: unknown, name: string, key: string): SyncMethod | null {
  return findMethod(value, name, key, false);
}

function options(value: unknown): Readonly<{
  readonly qualityTier: ArenaV2ModeHudFeedbackEffectQualityTierV1;
  readonly audio: Readonly<{ readonly play: SyncMethod; readonly stopAll: SyncMethod }>;
  readonly visual: Readonly<{
    readonly present: SyncMethod;
    readonly presentDirectional: SyncMethod | null;
    readonly presentPassthroughDirectional: SyncMethod | null;
    readonly remove: SyncMethod;
    readonly clear: SyncMethod;
  }>;
}> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 twenty weapon HUD host options必须是对象。');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== OPTION_KEYS.size
    || keys.some((key) => typeof key !== 'string' || !OPTION_KEYS.has(key))) {
    throw new RangeError('Arena V2 twenty weapon HUD host options字段不闭合。');
  }
  const qualityDescriptor = Object.getOwnPropertyDescriptor(value, 'qualityTier');
  const audioDescriptor = Object.getOwnPropertyDescriptor(value, 'audio');
  const visualDescriptor = Object.getOwnPropertyDescriptor(value, 'visual');
  if (qualityDescriptor === undefined || !Object.hasOwn(qualityDescriptor, 'value')
    || audioDescriptor === undefined || !Object.hasOwn(audioDescriptor, 'value')
    || visualDescriptor === undefined || !Object.hasOwn(visualDescriptor, 'value')) {
    throw new TypeError('Arena V2 twenty weapon HUD host options必须使用数据字段。');
  }
  const qualityTier = qualityDescriptor.value;
  if (qualityTier !== 'low' && qualityTier !== 'medium' && qualityTier !== 'high') {
    throw new RangeError('Arena V2 twenty weapon HUD host qualityTier无效。');
  }
  return Object.freeze({
    qualityTier,
    audio: Object.freeze({
      play: method(audioDescriptor.value, 'Arena V2 twenty weapon HUD host audio', 'play'),
      stopAll: method(audioDescriptor.value, 'Arena V2 twenty weapon HUD host audio', 'stopAll'),
    }),
    visual: Object.freeze({
      present: method(visualDescriptor.value, 'Arena V2 twenty weapon HUD host visual', 'present'),
      presentDirectional: optionalMethod(
        visualDescriptor.value,
        'Arena V2 twenty weapon HUD host visual',
        'presentDirectional',
      ),
      presentPassthroughDirectional: optionalMethod(
        visualDescriptor.value,
        'Arena V2 twenty weapon HUD host visual',
        'presentPassthroughDirectional',
      ),
      remove: method(visualDescriptor.value, 'Arena V2 twenty weapon HUD host visual', 'remove'),
      clear: method(visualDescriptor.value, 'Arena V2 twenty weapon HUD host visual', 'clear'),
    }),
  });
}

function preferences(value: unknown): ArenaV2ModeHudPreferenceSnapshotV1 {
  const source = exact(
    value,
    new Set(['reducedMotion', 'soundEnabled']),
    'Arena V2 twenty weapon HUD host preferences',
  );
  if (typeof source.reducedMotion !== 'boolean' || typeof source.soundEnabled !== 'boolean') {
    throw new TypeError('Arena V2 twenty weapon HUD host preferences必须是boolean。');
  }
  return Object.freeze({
    reducedMotion: source.reducedMotion,
    soundEnabled: source.soundEnabled,
  });
}

function sameCanonicalIdentity(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} previous`)
    === createDeterministicDataHash(right, `${name} current`);
}

function withImpactStrengthLabels(
  renderModel: ArenaV2ModeHudRenderModelV1,
  plans: readonly ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1[],
  directionFactsById: ReadonlyMap<string, ArenaWeaponFeedbackDirectionFactV2>,
  feedbackEventsById: ReadonlyMap<string, DeepReadonly<WeaponFeedbackResolvedEventV6>>,
): ArenaV2ModeHudRenderModelV1 {
  const plannedIds = new Set(plans.map(({ sourceEventId }) => sourceEventId));
  const localParticipants = renderModel.participantIdentities.filter(({ local }) => local);
  if (localParticipants.length !== 1) {
    throw new RangeError('Arena V2 twenty weapon HUD本地视角必须精确绑定一个本地参与者。');
  }
  const localParticipantId = localParticipants[0]!.participantId;
  return Object.freeze({
    ...renderModel,
    feedbackItems: Object.freeze(renderModel.feedbackItems.map((item) => {
      if (item.category !== 'weapon' || !plannedIds.has(item.sourceEventId)) return item;
      const directionFact = directionFactsById.get(item.sourceEventId);
      if (directionFact === undefined) {
        throw new RangeError(
          `Arena V2 twenty weapon HUD力度标签缺少方向事实：${item.sourceEventId}。`,
        );
      }
      const strength = projectArenaV2WeaponImpactStrengthCandidateV1(directionFact);
      if (strength === null) return item;
      const directionLabel = projectArenaV2WeaponImpactDirectionLabelCandidateV1(
        directionFact,
      );
      if (directionLabel === null) {
        throw new RangeError(
          `Arena V2 twenty weapon HUD命中反馈缺少玩家方向标签：${item.sourceEventId}。`,
        );
      }
      const event = feedbackEventsById.get(item.sourceEventId);
      if (event === undefined) {
        throw new RangeError(
          `Arena V2 twenty weapon HUD本地视角缺少权威事件：${item.sourceEventId}。`,
        );
      }
      const perspectiveLabel = event.attackerId === localParticipantId
        && event.targetId !== localParticipantId
        ? '命中确认'
        : event.targetId === localParticipantId
          && event.attackerId !== localParticipantId
          ? '受击警告'
          : '交战信息';
      return Object.freeze({
        ...item,
        title: `${perspectiveLabel} · ${strength.playerLabel} · ${directionLabel} · ${item.title}`,
      });
    })),
  });
}

function strengthAdjustedAudioCommand(
  command: ArenaV2ModeHudFeedbackAudioCommandV1,
  directionFact: ArenaWeaponFeedbackDirectionFactV2,
): ArenaV2ModeHudFeedbackAudioCommandV1 {
  const strength = projectArenaV2WeaponImpactStrengthCandidateV1(directionFact);
  if (strength === null) return command;
  const priority = command.priority >= strength.presentation.minimumAudioPriority
    ? command.priority
    : strength.presentation.minimumAudioPriority;
  const gainDb = command.gainDb >= strength.presentation.minimumAudioGainDb
    ? command.gainDb
    : strength.presentation.minimumAudioGainDb;
  if (priority === command.priority && gainDb === command.gainDb) return command;
  return Object.freeze({
    ...command,
    priority,
    gainDb,
  });
}

/**
 * Candidate-only owner that specializes generic HUD weapon cues while keeping
 * the existing host as the only queue/epoch/effect lifecycle owner.
 */
export class ArenaV2TwentyWeaponFeedbackHudHostCandidateV1 {
  readonly #innerHost: ArenaV2ModeHudPresentationHostV1;
  readonly #externalAudio: Readonly<{ readonly play: SyncMethod; readonly stopAll: SyncMethod }>;
  readonly #externalVisual: Readonly<{
    readonly present: SyncMethod;
    readonly presentDirectional: SyncMethod | null;
    readonly presentPassthroughDirectional: SyncMethod | null;
    readonly remove: SyncMethod;
    readonly clear: SyncMethod;
  }>;
  readonly #plansBySourceEventId = new Map<
    string,
    ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1
  >();
  readonly #genericUnarmedSourceEventIds = new Set<string>();
  readonly #directionFactsBySourceEventId = new Map<
    string,
    ArenaWeaponFeedbackDirectionFactV2
  >();
  readonly #feedbackEventsBySourceEventId = new Map<
    string,
    DeepReadonly<WeaponFeedbackResolvedEventV6>
  >();
  #state: ArenaV2TwentyWeaponFeedbackHudHostStateCandidateV1 =
    ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.CREATED;
  #consumerEpochId: string | null = null;
  #operation: TwentyWeaponHudHostOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #operationFailure: unknown = null;
  #cleanupStarted = false;
  #innerHostDisposed = false;
  #deferIdentityClear = false;

  constructor(value: unknown) {
    const resolved = options(value);
    this.#externalAudio = resolved.audio;
    this.#externalVisual = resolved.visual;
    this.#innerHost = new ArenaV2ModeHudPresentationHostV1({
      qualityTier: resolved.qualityTier,
      audio: {
        play: (command: unknown) => this.#play(command),
        stopAll: () => this.#stopAll(),
      },
      visual: {
        present: (command: unknown) => this.#present(command),
        remove: (sourceEventId: unknown) => this.#remove(sourceEventId),
        clear: () => this.#clear(),
      },
    });
  }

  get state(): ArenaV2TwentyWeaponFeedbackHudHostStateCandidateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #beginOperation(operation: TwentyWeaponHudHostOperation): void {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    this.#operationFailure = null;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(
      `Arena V2 twenty weapon HUD host拒绝${this.#operation}期间同步重入${operation}。`,
    );
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertOperationCommit(operation: TwentyWeaponHudHostOperation): void {
    if (this.#operation !== operation) {
      throw new Error(`Arena V2 twenty weapon HUD host缺少${operation}操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    const operation = this.#operation;
    if (operation === null) {
      throw new Error('Arena V2 twenty weapon HUD外部效果调用缺少操作所有权。');
    }
    this.#assertOperationCommit(operation);
  }

  #endOperation(operation: TwentyWeaponHudHostOperation): void {
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
        `Arena V2 twenty weapon HUD host ${operation}失败且检测到同步重入。`,
      );
    if (this.#state === ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.DISPOSED) {
      this.#state = ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.FAILED;
      throw failure;
    }
    if (this.#state === ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.FAILED) {
      throw failure;
    }
    this.#fail(failure);
  }

  #assertUsable(operation: string): void {
    this.#assertNoOperation(operation);
    if (this.#state === ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.DISPOSED) {
      throw new Error('Arena V2 twenty weapon HUD host已销毁。');
    }
    if (this.#state === ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.FAILED) {
      throw new Error('Arena V2 twenty weapon HUD host已失败关闭。');
    }
  }

  #fail(error: unknown): never {
    if (this.#operation !== null) this.#operationFailure ??= error;
    this.#state = ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.FAILED;
    this.#cleanupStarted = true;
    this.#deferIdentityClear = true;
    const cleanupErrors = this.#cleanupInnerHost();
    if (this.#innerHostDisposed) this.#clearRetainedIdentity();
    this.#deferIdentityClear = false;
    const failure = new Error('Arena V2 twenty weapon HUD host原子消费失败。') as Error & {
      cleanupErrors?: readonly unknown[];
    };
    failure.cause = error;
    if (cleanupErrors.length > 0) failure.cleanupErrors = Object.freeze(cleanupErrors);
    if (this.#operation !== null) this.#operationFailure = failure;
    throw failure;
  }

  #clearRetainedIdentity(): void {
    this.#plansBySourceEventId.clear();
    this.#genericUnarmedSourceEventIds.clear();
    this.#directionFactsBySourceEventId.clear();
    this.#feedbackEventsBySourceEventId.clear();
  }

  #cleanupInnerHost(): readonly unknown[] {
    if (this.#innerHostDisposed) return Object.freeze([]);
    const reentrySequence = this.#reentrySequence;
    try {
      this.#innerHost.dispose();
      if (this.#reentrySequence !== reentrySequence) {
        return Object.freeze([this.#reentryError ?? new Error(
          'Arena V2 twenty weapon HUD Inner Host清理期间发生重入。',
        )]);
      }
      this.#innerHostDisposed = true;
      return Object.freeze([]);
    } catch (cause) {
      return Object.freeze([cause]);
    }
  }

  #plan(sourceEventId: string): ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1 | null {
    return this.#plansBySourceEventId.get(sourceEventId) ?? null;
  }

  #present(value: unknown): unknown {
    const command = value as ArenaV2ModeHudFeedbackVisualCommandV1;
    const sourceEventId = assertNonEmptyString(
      command.sourceEventId,
      'Arena V2 twenty weapon HUD visual sourceEventId',
    );
    const plan = this.#plan(sourceEventId);
    if (plan === null) {
      if (this.#genericUnarmedSourceEventIds.has(sourceEventId)) {
        const directionFact = this.#directionFactsBySourceEventId.get(sourceEventId);
        const event = this.#feedbackEventsBySourceEventId.get(sourceEventId);
        if (directionFact === undefined || event === undefined) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD徒手visual缺少V2方向闭包：${sourceEventId}。`,
          );
        }
        const result = this.#externalVisual.presentPassthroughDirectional === null
          ? this.#externalVisual.present(command)
          : this.#externalVisual.presentPassthroughDirectional(Object.freeze({
            schemaVersion: 1 as const,
            command,
            event,
            directionFact,
          }));
        this.#assertCurrentOperationCommit();
        return result;
      }
      if (WEAPON_VISUAL_CUES.has(command.cueId)) {
        throw new RangeError(`Arena V2 twenty weapon HUD visual缺少${sourceEventId}读取计划。`);
      }
      const result = this.#externalVisual.present(command);
      this.#assertCurrentOperationCommit();
      return result;
    }
    if (command.cueId !== plan.vfx.cueId) {
      throw new RangeError(`Arena V2 twenty weapon HUD visual专属Cue漂移：${sourceEventId}。`);
    }
    const directionFact = this.#directionFactsBySourceEventId.get(sourceEventId);
    const event = this.#feedbackEventsBySourceEventId.get(sourceEventId);
    if (directionFact === undefined || event === undefined) {
      throw new RangeError(`Arena V2 twenty weapon HUD visual缺少V2方向闭包：${sourceEventId}。`);
    }
    const result = this.#externalVisual.presentDirectional === null
      ? this.#externalVisual.present(command)
      : this.#externalVisual.presentDirectional(Object.freeze({
        schemaVersion: 2 as const,
        command,
        modeKind: plan.modeKind,
        event,
        directionFact,
      }));
    this.#assertCurrentOperationCommit();
    return result;
  }

  #play(value: unknown): unknown {
    const command = value as ArenaV2ModeHudFeedbackAudioCommandV1;
    const sourceEventId = assertNonEmptyString(
      command.sourceEventId,
      'Arena V2 twenty weapon HUD audio sourceEventId',
    );
    const plan = this.#plan(sourceEventId);
    if (plan === null) {
      if (this.#genericUnarmedSourceEventIds.has(sourceEventId)) {
        const directionFact = this.#directionFactsBySourceEventId.get(sourceEventId);
        if (directionFact === undefined) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD徒手audio缺少力度事实：${sourceEventId}。`,
          );
        }
        const result = this.#externalAudio.play(
          strengthAdjustedAudioCommand(command, directionFact),
        );
        this.#assertCurrentOperationCommit();
        return result;
      }
      if (WEAPON_AUDIO_CUES.has(command.cueId)) {
        throw new RangeError(`Arena V2 twenty weapon HUD audio缺少${sourceEventId}读取计划。`);
      }
      const result = this.#externalAudio.play(command);
      this.#assertCurrentOperationCommit();
      return result;
    }
    if (command.cueId !== plan.audio.cueId) {
      throw new RangeError(`Arena V2 twenty weapon HUD audio专属Cue漂移：${sourceEventId}。`);
    }
    const directionFact = this.#directionFactsBySourceEventId.get(sourceEventId);
    if (directionFact === undefined) {
      throw new RangeError(`Arena V2 twenty weapon HUD audio缺少力度事实：${sourceEventId}。`);
    }
    const result = this.#externalAudio.play(
      strengthAdjustedAudioCommand(command, directionFact),
    );
    this.#assertCurrentOperationCommit();
    return result;
  }

  #stopAll(): unknown {
    const result = this.#externalAudio.stopAll();
    this.#assertCurrentOperationCommit();
    return result;
  }

  #remove(value: unknown): unknown {
    const sourceEventId = assertNonEmptyString(
      value,
      'Arena V2 twenty weapon HUD visual remove sourceEventId',
    );
    const result = this.#externalVisual.remove(sourceEventId);
    assertSynchronousReturn(result, 'Arena V2 twenty weapon HUD visual.remove');
    this.#assertCurrentOperationCommit();
    this.#plansBySourceEventId.delete(sourceEventId);
    this.#genericUnarmedSourceEventIds.delete(sourceEventId);
    this.#directionFactsBySourceEventId.delete(sourceEventId);
    this.#feedbackEventsBySourceEventId.delete(sourceEventId);
    return result;
  }

  #clear(): unknown {
    const result = this.#externalVisual.clear();
    assertSynchronousReturn(result, 'Arena V2 twenty weapon HUD visual.clear');
    this.#assertCurrentOperationCommit();
    if (!this.#deferIdentityClear && !this.#cleanupStarted) this.#clearRetainedIdentity();
    return result;
  }

  beginEpoch(value: unknown) {
    this.#assertUsable('begin-epoch');
    const source = exact(value, BEGIN_KEYS, 'Arena V2 twenty weapon HUD host begin');
    const consumerEpochId = assertTrimmedNonEmptyString(
      source.consumerEpochId,
      'Arena V2 twenty weapon HUD host epoch id',
    );
    if (consumerEpochId === this.#consumerEpochId) {
      throw new RangeError('Arena V2 twenty weapon HUD host拒绝复用epoch id。');
    }
    this.#beginOperation('begin-epoch');
    this.#deferIdentityClear = true;
    try {
      const projection = this.#innerHost.beginEpoch(source);
      this.#assertOperationCommit('begin-epoch');
      this.#clearRetainedIdentity();
      this.#consumerEpochId = consumerEpochId;
      this.#state = ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.ACTIVE;
      this.#deferIdentityClear = false;
      return projection;
    } catch (error) {
      return this.#fail(error);
    } finally {
      this.#endOperation('begin-epoch');
    }
  }

  consume(value: unknown) {
    this.#assertUsable('consume');
    const source = exact(value, CONSUME_KEYS, 'Arena V2 twenty weapon HUD host consume');
    const consumerEpochId = assertTrimmedNonEmptyString(
      source.consumerEpochId,
      'Arena V2 twenty weapon HUD host consume epoch id',
    );
    if (consumerEpochId !== this.#consumerEpochId) {
      throw new RangeError('Arena V2 twenty weapon HUD host拒绝旧epoch回调。');
    }
    if (this.#state !== ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.ACTIVE) {
      throw new Error(`Arena V2 twenty weapon HUD host状态${this.#state}不可消费。`);
    }
    this.#beginOperation('consume');
    try {
      const genericRenderModel = createArenaV2ModeHudRenderModelV1(
        source.model as unknown as ArenaV2ModeHudViewModelV1,
        preferences(source.preferences),
      );
      const specialized = specializeArenaV2TwentyWeaponFeedbackHudCandidateV1({
        schemaVersion: 1,
        renderModel: genericRenderModel,
        events: source.sourceEvents,
      });
      if (!Array.isArray(source.weaponFeedbackDirectionFactsV2)) {
        throw new TypeError('Arena V2 twenty weapon HUD host方向事实必须是数组。');
      }
      const directionFacts = source.weaponFeedbackDirectionFactsV2.map(
        createArenaWeaponFeedbackDirectionFactV2,
      );
      const directionById = new Map<string, ArenaWeaponFeedbackDirectionFactV2>();
      for (const fact of directionFacts) {
        if (directionById.has(fact.feedbackEventId)) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD host同批方向事实ID重复：${fact.feedbackEventId}。`,
          );
        }
        directionById.set(fact.feedbackEventId, fact);
      }
      if (!Array.isArray(source.sourceEvents)) {
        throw new TypeError('Arena V2 twenty weapon HUD host sourceEvents必须是数组。');
      }
      const feedbackEvents = source.sourceEvents
        .map(createArenaMatchEventV6)
        .filter((event): event is DeepReadonly<WeaponFeedbackResolvedEventV6> => (
          event.type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED
        ));
      const feedbackEventsById = new Map<
        string,
        DeepReadonly<WeaponFeedbackResolvedEventV6>
      >();
      for (const event of feedbackEvents) {
        if (feedbackEventsById.has(event.id)) {
          throw new RangeError(`Arena V2 twenty weapon HUD host同批反馈事件ID重复：${event.id}。`);
        }
        feedbackEventsById.set(event.id, event);
      }
      const currentPlanSourceEventIds = new Set<string>();
      for (const plan of specialized.weaponReadPlans) {
        if (currentPlanSourceEventIds.has(plan.sourceEventId)) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD host同批读取计划ID重复：${plan.sourceEventId}。`,
          );
        }
        currentPlanSourceEventIds.add(plan.sourceEventId);
        const previous = this.#plansBySourceEventId.get(plan.sourceEventId);
        if (previous !== undefined && !sameCanonicalIdentity(
          previous,
          plan,
          `Arena V2 twenty weapon HUD host feedback plan ${plan.sourceEventId}`,
        )) {
          throw new RangeError(`Arena V2 twenty weapon HUD host反馈身份漂移：${plan.sourceEventId}。`);
        }
        if (this.#genericUnarmedSourceEventIds.has(plan.sourceEventId)) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD host同一反馈ID不能从徒手漂移为武器：${plan.sourceEventId}。`,
          );
        }
        this.#plansBySourceEventId.set(plan.sourceEventId, plan);
        const directionFact = directionById.get(plan.sourceEventId);
        if (directionFact === undefined) {
          throw new RangeError(`Arena V2 twenty weapon HUD host缺少方向事实：${plan.sourceEventId}。`);
        }
        const previousDirectionFact = this.#directionFactsBySourceEventId.get(plan.sourceEventId);
        if (previousDirectionFact !== undefined
          && !sameCanonicalIdentity(
            previousDirectionFact,
            directionFact,
            `Arena V2 twenty weapon HUD host direction fact ${plan.sourceEventId}`,
          )) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD host方向事实身份漂移：${plan.sourceEventId}。`,
          );
        }
        this.#directionFactsBySourceEventId.set(plan.sourceEventId, directionFact);
        const feedbackEvent = feedbackEventsById.get(plan.sourceEventId);
        if (feedbackEvent === undefined) {
          throw new RangeError(`Arena V2 twenty weapon HUD host缺少反馈事件：${plan.sourceEventId}。`);
        }
        const previousFeedbackEvent = this.#feedbackEventsBySourceEventId.get(plan.sourceEventId);
        if (previousFeedbackEvent !== undefined
          && !sameCanonicalIdentity(
            previousFeedbackEvent,
            feedbackEvent,
            `Arena V2 twenty weapon HUD host authority event ${plan.sourceEventId}`,
          )) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD host权威反馈事件身份漂移：${plan.sourceEventId}。`,
          );
        }
        this.#feedbackEventsBySourceEventId.set(plan.sourceEventId, feedbackEvent);
      }
      const currentUnarmedSourceEventIds = new Set<string>();
      for (const sourceEventId of specialized.passthroughUnarmedSourceEventIds) {
        if (currentUnarmedSourceEventIds.has(sourceEventId)) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD host同批徒手反馈ID重复：${sourceEventId}。`,
          );
        }
        currentUnarmedSourceEventIds.add(sourceEventId);
        if (this.#plansBySourceEventId.has(sourceEventId)) {
          throw new RangeError(`Arena V2 twenty weapon HUD host徒手/武器身份冲突：${sourceEventId}。`);
        }
        const directionFact = directionById.get(sourceEventId);
        if (directionFact === undefined) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD host徒手反馈缺少方向事实：${sourceEventId}。`,
          );
        }
        const previousDirectionFact = this.#directionFactsBySourceEventId.get(sourceEventId);
        if (previousDirectionFact !== undefined
          && !sameCanonicalIdentity(
            previousDirectionFact,
            directionFact,
            `Arena V2 twenty weapon HUD host unarmed direction fact ${sourceEventId}`,
          )) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD host徒手方向事实身份漂移：${sourceEventId}。`,
          );
        }
        const feedbackEvent = feedbackEventsById.get(sourceEventId);
        if (feedbackEvent === undefined) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD host徒手反馈缺少权威事件：${sourceEventId}。`,
          );
        }
        const previousFeedbackEvent = this.#feedbackEventsBySourceEventId.get(sourceEventId);
        if (previousFeedbackEvent !== undefined
          && !sameCanonicalIdentity(
            previousFeedbackEvent,
            feedbackEvent,
            `Arena V2 twenty weapon HUD host unarmed authority event ${sourceEventId}`,
          )) {
          throw new RangeError(
            `Arena V2 twenty weapon HUD host徒手权威事件身份漂移：${sourceEventId}。`,
          );
        }
        this.#genericUnarmedSourceEventIds.add(sourceEventId);
        this.#directionFactsBySourceEventId.set(sourceEventId, directionFact);
        this.#feedbackEventsBySourceEventId.set(sourceEventId, feedbackEvent);
      }
      this.#deferIdentityClear = true;
      const projectedRenderModel = withImpactStrengthLabels(
        specialized.renderModel,
        specialized.weaponReadPlans,
        directionById,
        feedbackEventsById,
      );
      const projection = this.#innerHost.consume({
        consumerEpochId: source.consumerEpochId,
        model: source.model,
        sourceEvents: source.sourceEvents,
        preferences: source.preferences,
        projectedRenderModel,
      });
      this.#assertOperationCommit('consume');
      this.#deferIdentityClear = false;
      const retainedSourceEventIds = new Set(
        projection.feedback.state.seenIdentities.map(({ sourceEventId }) => sourceEventId),
      );
      for (const sourceEventId of this.#plansBySourceEventId.keys()) {
        if (!retainedSourceEventIds.has(sourceEventId)) {
          this.#plansBySourceEventId.delete(sourceEventId);
          this.#directionFactsBySourceEventId.delete(sourceEventId);
          this.#feedbackEventsBySourceEventId.delete(sourceEventId);
        }
      }
      for (const sourceEventId of this.#genericUnarmedSourceEventIds) {
        if (!retainedSourceEventIds.has(sourceEventId)) {
          this.#genericUnarmedSourceEventIds.delete(sourceEventId);
          this.#directionFactsBySourceEventId.delete(sourceEventId);
          this.#feedbackEventsBySourceEventId.delete(sourceEventId);
        }
      }
      return projection;
    } catch (error) {
      return this.#fail(error);
    } finally {
      this.#endOperation('consume');
    }
  }

  getSnapshot(): ArenaV2TwentyWeaponFeedbackHudHostSnapshotCandidateV1 {
    this.#assertNoOperation('getSnapshot');
    return Object.freeze({
      state: this.#state,
      consumerEpochId: this.#consumerEpochId,
      retainedWeaponReadPlanSourceEventIds: Object.freeze(
        [...this.#plansBySourceEventId.keys()].sort(),
      ),
      retainedGenericUnarmedSourceEventIds: Object.freeze(
        [...this.#genericUnarmedSourceEventIds].sort(),
      ),
      retainedDirectionFactSourceEventIds: Object.freeze(
        [...this.#directionFactsBySourceEventId.keys()].sort(),
      ),
      innerHost: this.#innerHost.getSnapshot(),
      cleanup: Object.freeze({
        started: this.#cleanupStarted,
        innerHostDisposed: this.#innerHostDisposed,
      }),
    });
  }

  dispose(): void {
    this.#assertNoOperation('dispose');
    if (this.#state === ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.DISPOSED) {
      return;
    }
    this.#beginOperation('dispose');
    try {
      this.#cleanupStarted = true;
      this.#deferIdentityClear = true;
      const cleanupErrors = this.#cleanupInnerHost();
      if (this.#innerHostDisposed) {
        this.#clearRetainedIdentity();
        this.#consumerEpochId = null;
        this.#state = ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.DISPOSED;
      } else {
        this.#state = ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.FAILED;
      }
      this.#deferIdentityClear = false;
      if (cleanupErrors.length > 0) {
        const failure = new Error('Arena V2 twenty weapon HUD host销毁不完整。') as Error & {
          cleanupErrors: readonly unknown[];
        };
        failure.cleanupErrors = Object.freeze(cleanupErrors);
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

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultSurfaceWired: false as const,
  existingQueueEpochAndEffectHostReused: true as const,
  specializedRenderModelFeedsExistingQueue: true as const,
  impactStrengthPlayerLabelsEnabled: true as const,
  impactStrengthAudioUsesExistingCueAndBus: true as const,
  impactStrengthAudioPriorityAndGainFloorsIndependent: true as const,
  retainedPlanLifetime: 'current-consumer-epoch-and-queue-seen-window' as const,
  maximumRetainedPlanIdentities: 64 as const,
  unarmedCuePolicy: 'validated-generic-passthrough' as const,
  oldEpochReplayAllowed: false as const,
  ownsRuleOrMatchAuthority: false as const,
  consumesAuthorityDirectionFactsV2: true as const,
  directionalVisualPortCompatibilityFallback: true as const,
  unarmedDirectionAndImpactStrengthPreserved: true as const,
  unarmedDirectionalVisualPortCompatibilityFallback: true as const,
  unarmedAudioStrengthUsesExistingCueAndBus: true as const,
  retainedFeedbackIdentityImmutable: true as const,
  duplicateFeedbackIdentityPolicy: 'fail-closed-before-presentation-side-effects' as const,
  epochIdentityClearCommitsAfterInnerEpochSwitch: true as const,
  failedCleanupRetainsFeedbackReadIdentity: true as const,
  cleanupRetriesOnlyIncompleteInnerHost: true as const,
  terminalStateWaitsForInnerHost: true as const,
  consumerEpochIdRequiresTrimmedIdentity: true as const,
  synchronousLifecycleReentryRejected: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  synchronousPortMethodPrototypeDepthLimit: MAXIMUM_SYNC_PORT_METHOD_PROTOTYPE_DEPTH,
  synchronousPortMethodPrototypeCycleRejected: true as const,
  innerHostAndExternalEffectCallbacksCheckedBeforeIdentityCommit: true as const,
  swallowedExternalEffectReentryStopsIdentityDeletionAndQueuePruning: true as const,
  swallowedInnerHostCleanupReentryRetainsInnerHostOwnership: true as const,
  swallowedInnerHostVisualOrAudioReentryFailsClosed: true as const,
  epochConsumeAndDisposeCommitUnderStickyOperation: true as const,
  stateAndSnapshotReadsRejectedDuringOperation: true as const,
  idempotentDisposeChecksReentryBeforeFastPath: true as const,
  operationLockScope: 'begin-epoch-consume-dispose-with-snapshot-rejection' as const,
  validationStatus: 'not-run' as const,
});
