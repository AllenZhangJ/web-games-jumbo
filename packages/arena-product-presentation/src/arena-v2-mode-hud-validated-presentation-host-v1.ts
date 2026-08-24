import {
  ARENA_MATCH_EVENT_V6,
  assertKnownKeys,
  assertTrimmedNonEmptyString,
  cloneFrozenData,
  createArenaMatchEventV6,
  createArenaWeaponFeedbackDirectionFactV2,
  type ArenaMatchEventV6,
  type ArenaLocalJumpAvailabilityV1,
  type ArenaWeaponFeedbackDirectionFactV2,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2ModeHudPresentationHostV1,
  type ArenaV2ModeHudPresentationHostSnapshotV1,
} from './arena-v2-mode-hud-presentation-host-v1.js';
import {
  ArenaV2TwentyWeaponFeedbackHudHostCandidateV1,
  type ArenaV2TwentyWeaponFeedbackHudHostSnapshotCandidateV1,
} from './arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.js';
import {
  projectArenaV2ModeHudViewModelV1,
  type ArenaV2ModeHudViewModelV1,
} from './arena-v2-mode-hud-view-model-v1.js';
import {
  projectArenaV2MatchSceneReadFrameCandidateV1,
  type ArenaV2MatchSceneReadFrameCandidateV1,
} from './arena-v2-match-scene-read-projection-candidate-v1.js';

export interface ArenaV2ModeHudValidatedStepProjectionSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly modeDefinitionId: string;
  readonly localParticipantId: string;
  readonly tick: number;
  readonly eventSequence: number;
  readonly sourceEventCount: number;
  readonly weaponFeedbackDirectionFactCount: number;
  readonly containsOneShotFacts: boolean;
}

interface ProjectionData {
  readonly model: ArenaV2ModeHudViewModelV1;
  readonly scene: ArenaV2MatchSceneReadFrameCandidateV1;
  readonly sourceEvents: readonly DeepReadonly<ArenaMatchEventV6>[];
  readonly weaponFeedbackDirectionFactsV2:
    readonly DeepReadonly<ArenaWeaponFeedbackDirectionFactV2>[];
  readonly localJumpAvailability: ArenaLocalJumpAvailabilityV1;
}

const PROJECTION_INPUT_KEYS = new Set([
  'events', 'supplyCues', 'supplyCadence', 'readFrame', 'readFrameAudit', 'publicMatchInfo',
  'weaponFeedbackDirectionFactsV2',
  'localJumpAvailability',
]);
const HOST_BEGIN_KEYS = new Set(['consumerEpochId', 'projection', 'preferences']);
const HOST_CONSUME_KEYS = new Set(['consumerEpochId', 'projection', 'preferences']);
const PROJECTION_TOKEN = Symbol('ArenaV2ModeHudValidatedStepProjectionV1');
const PROJECTION_DATA = new WeakMap<ArenaV2ModeHudValidatedStepProjectionV1, ProjectionData>();

function exactData(value: unknown, keys: ReadonlySet<string>, name: string) {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function opaqueInput(value: unknown, keys: ReadonlySet<string>, name: string) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.some((key) => typeof key !== 'string' || !keys.has(key))
    || ownKeys.length !== keys.size
  ) throw new RangeError(`${name}字段不闭合。`);
  const fields = new Map<string, unknown>();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
    fields.set(key, descriptor.value);
  }
  return fields;
}

function projectionData(value: unknown): ProjectionData {
  if (!(value instanceof ArenaV2ModeHudValidatedStepProjectionV1)) {
    throw new TypeError('Arena V2 HUD Validated Host只接受已验证step投影。');
  }
  const data = PROJECTION_DATA.get(value);
  if (data === undefined) throw new TypeError('Arena V2 HUD step投影身份无效。');
  return data;
}

export class ArenaV2ModeHudValidatedStepProjectionV1 {
  private constructor(token: symbol, data: ProjectionData) {
    if (token !== PROJECTION_TOKEN) throw new TypeError('Arena V2 HUD step投影只能由工厂创建。');
    PROJECTION_DATA.set(this, data);
    Object.freeze(this);
  }

  static create(value: unknown): ArenaV2ModeHudValidatedStepProjectionV1 {
    const source = exactData(value, PROJECTION_INPUT_KEYS, 'Arena V2 HUD step projection input');
    const sharedProjectionInput = Object.freeze({
      events: source.events,
      supplyCues: source.supplyCues,
      readFrame: source.readFrame,
      readFrameAudit: source.readFrameAudit,
      publicMatchInfo: source.publicMatchInfo,
    });
    const model = projectArenaV2ModeHudViewModelV1({
      ...sharedProjectionInput,
      supplyCadence: source.supplyCadence,
    });
    const scene = projectArenaV2MatchSceneReadFrameCandidateV1({
      ...sharedProjectionInput,
      localJumpAvailability: source.localJumpAvailability,
    });
    const eventInputs = source.events;
    if (!Array.isArray(eventInputs)) {
      throw new TypeError('Arena V2 HUD step projection events必须是数组。');
    }
    const sourceEvents = Object.freeze(eventInputs.map(createArenaMatchEventV6));
    const directionFactInputs = source.weaponFeedbackDirectionFactsV2;
    if (!Array.isArray(directionFactInputs)) {
      throw new TypeError('Arena V2 HUD step projection方向事实必须是数组。');
    }
    const weaponFeedbackDirectionFactsV2 = Object.freeze(
      directionFactInputs.map(createArenaWeaponFeedbackDirectionFactV2),
    );
    const feedbackEvents = sourceEvents.filter(
      ({ type }) => type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
    );
    if (
      feedbackEvents.length !== weaponFeedbackDirectionFactsV2.length
      || feedbackEvents.some((event, index) => {
        const fact = weaponFeedbackDirectionFactsV2[index];
        return event.type !== ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED
          || fact === undefined
          || fact.feedbackEventId !== event.id
          || fact.feedbackTick !== event.tick
          || fact.feedbackSequence !== event.sequence
          || fact.feedbackKind !== event.kind;
      })
    ) throw new RangeError('Arena V2 HUD step projection方向事实与反馈事件不闭合。');
    return new ArenaV2ModeHudValidatedStepProjectionV1(
      PROJECTION_TOKEN,
      Object.freeze({
        model,
        scene,
        sourceEvents,
        weaponFeedbackDirectionFactsV2,
        localJumpAvailability: scene.localJumpAvailability,
      }),
    );
  }

  getSnapshot(): ArenaV2ModeHudValidatedStepProjectionSnapshotV1 {
    const data = projectionData(this);
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      modeDefinitionId: data.model.modeDefinitionId,
      localParticipantId: data.model.localParticipant.participantId,
      tick: data.model.tick,
      eventSequence: data.model.eventSequence,
      sourceEventCount: data.sourceEvents.length,
      weaponFeedbackDirectionFactCount: data.weaponFeedbackDirectionFactsV2.length,
      containsOneShotFacts: data.model.weaponFeedbackEvents.length > 0
        || data.model.modeFeedbackEvents.length > 0
        || data.model.supplyFeedbackCues.length > 0,
    });
  }

  getSceneReadFrame(): ArenaV2MatchSceneReadFrameCandidateV1 {
    return projectionData(this).scene;
  }

  getWeaponFeedbackDirectionFactsV2():
  readonly DeepReadonly<ArenaWeaponFeedbackDirectionFactV2>[] {
    return projectionData(this).weaponFeedbackDirectionFactsV2;
  }

  getLocalJumpAvailability(): ArenaLocalJumpAvailabilityV1 {
    return projectionData(this).localJumpAvailability;
  }
}

export const ARENA_V2_MODE_HUD_VALIDATED_PRESENTATION_AUTHORITY_FACTS_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  requiresExplicitLocalJumpAvailabilityAtProjectionBoundary: true as const,
  preservesMovementAndJumpCapabilityIdentity: true as const,
  validationStatus: 'not-run' as const,
});

export function createArenaV2ModeHudValidatedStepProjectionV1(
  value: unknown,
): ArenaV2ModeHudValidatedStepProjectionV1 {
  return ArenaV2ModeHudValidatedStepProjectionV1.create(value);
}

/**
 * Formal candidate boundary for Presentation. Callers cannot provide a HUD
 * model directly: every baseline/update must first pass the canonical Frame V3
 * audit, PublicMatchInfo V2 validation and complete V6 event-batch projection.
 */
export class ArenaV2ModeHudValidatedPresentationHostV1 {
  readonly #host: ArenaV2ModeHudPresentationHostV1;

  constructor(value: unknown) {
    this.#host = new ArenaV2ModeHudPresentationHostV1(value);
  }

  get state() { return this.#host.state; }

  beginEpoch(value: unknown) {
    const source = opaqueInput(value, HOST_BEGIN_KEYS, 'Arena V2 HUD Validated Host begin');
    const consumerEpochId = assertTrimmedNonEmptyString(
      source.get('consumerEpochId'),
      'Arena V2 HUD Validated Host epoch id',
    );
    const projection = projectionData(source.get('projection'));
    return this.#host.beginEpoch({
      consumerEpochId,
      baselineModel: projection.model,
      preferences: source.get('preferences'),
    });
  }

  consume(value: unknown) {
    const source = opaqueInput(value, HOST_CONSUME_KEYS, 'Arena V2 HUD Validated Host consume');
    const consumerEpochId = assertTrimmedNonEmptyString(
      source.get('consumerEpochId'),
      'Arena V2 HUD Validated Host consume epoch id',
    );
    const projection = projectionData(source.get('projection'));
    return this.#host.consume({
      consumerEpochId,
      model: projection.model,
      sourceEvents: projection.sourceEvents,
      preferences: source.get('preferences'),
    });
  }

  getSnapshot(): ArenaV2ModeHudPresentationHostSnapshotV1 {
    return this.#host.getSnapshot();
  }

  dispose(): void { this.#host.dispose(); }
}

/**
 * P4 candidate wrapper that keeps the validated projection capability opaque
 * while routing its model/event pair through the twenty-weapon HUD owner.
 */
export class ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1 {
  readonly #host: ArenaV2TwentyWeaponFeedbackHudHostCandidateV1;

  constructor(value: unknown) {
    this.#host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(value);
  }

  get state() { return this.#host.state; }

  beginEpoch(value: unknown) {
    const source = opaqueInput(
      value,
      HOST_BEGIN_KEYS,
      'Arena V2 twenty weapon HUD Validated Host begin',
    );
    const consumerEpochId = assertTrimmedNonEmptyString(
      source.get('consumerEpochId'),
      'Arena V2 twenty weapon HUD Validated Host epoch id',
    );
    const projection = projectionData(source.get('projection'));
    if (projection.weaponFeedbackDirectionFactsV2.length > 0) {
      throw new RangeError(
        'Arena V2 twenty weapon HUD Validated Host epoch基线不得重放武器反馈。',
      );
    }
    return this.#host.beginEpoch({
      consumerEpochId,
      baselineModel: projection.model,
      preferences: source.get('preferences'),
    });
  }

  consume(value: unknown) {
    const source = opaqueInput(
      value,
      HOST_CONSUME_KEYS,
      'Arena V2 twenty weapon HUD Validated Host consume',
    );
    const consumerEpochId = assertTrimmedNonEmptyString(
      source.get('consumerEpochId'),
      'Arena V2 twenty weapon HUD Validated Host consume epoch id',
    );
    const projection = projectionData(source.get('projection'));
    return this.#host.consume({
      consumerEpochId,
      model: projection.model,
      sourceEvents: projection.sourceEvents,
      weaponFeedbackDirectionFactsV2: projection.weaponFeedbackDirectionFactsV2,
      preferences: source.get('preferences'),
    });
  }

  getSnapshot(): ArenaV2TwentyWeaponFeedbackHudHostSnapshotCandidateV1 {
    return this.#host.getSnapshot();
  }

  dispose(): void { this.#host.dispose(); }
}

export const ARENA_V2_MODE_HUD_VALIDATED_PRESENTATION_HOST_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  acceptsDirectHudModel: false as const,
  requiredAuthorityProjection:
    'match-read-frame-v3-public-match-info-v2-complete-v6-batch' as const,
  exposesRendererNeutralSceneReadFrame: true as const,
  consumesCheckpointData: false as const,
  consumerEpochIdRequiresTrimmedIdentity: true as const,
  ownsAuthorityState: false as const,
});

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_VALIDATED_PRESENTATION_HOST_CANDIDATE_V1 =
  Object.freeze({
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    defaultSurfaceWired: false as const,
    acceptsDirectHudModel: false as const,
    requiredAuthorityProjection:
      'match-read-frame-v3-public-match-info-v2-complete-v6-batch' as const,
    twentyWeaponFeedbackHudOwnerWired: true as const,
    forwardsValidatedWeaponFeedbackDirectionFactsV2: true as const,
    rejectsWeaponFeedbackAtSpecializedEpochBaseline: true as const,
    consumerEpochIdRequiresTrimmedIdentity: true as const,
    ownsAuthorityState: false as const,
    validationStatus: 'not-run' as const,
  });
