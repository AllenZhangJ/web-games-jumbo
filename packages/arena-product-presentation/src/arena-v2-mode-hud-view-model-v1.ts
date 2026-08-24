import {
  ARENA_MATCH_EVENT_V6,
  assertKnownKeys,
  cloneFrozenData,
  createArenaMatchEventV6,
  createArenaSupplyCadenceSnapshotV1,
  createMatchReadFrameV3Audit,
  type ArenaMatchEventV6,
  type ArenaSupplyCadenceSnapshotV1,
  type DeepReadonly,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  PRODUCT_MODE_ROLE,
  createProductPublicMatchInfoV2,
  type ProductPublicMatchInfoV2,
} from '@number-strategy-jump/arena-product-contracts';
import {
  projectArenaWeaponFeedbackEventV6PresentationEvent,
  type ArenaV2WeaponFeedbackPresentationEvent,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  createArenaV2SupplyPresentationCueV1,
  type ArenaV2SupplyPresentationCueV1,
} from './arena-v2-supply-fact-cue-projection-v1.js';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
} from './arena-v2-information-presentation-content-v1.js';

export const ARENA_V2_MODE_HUD_VIEW_MODEL_V1_SCHEMA_VERSION = 1 as const;
const TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;

function elapsedClockText(ticks: number): string {
  if (ticks < 0) throw new RangeError('Arena V2 HUD展示时间不能为负tick。');
  const totalSeconds = Math.floor(ticks / TICK_RATE_HZ);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function countdownDurationText(ticks: number): string {
  if (ticks < 0) throw new RangeError('Arena V2 HUD倒计时不能为负tick。');
  if (ticks === 0) return '0秒';
  const tenths = Math.max(1, Math.ceil((ticks / TICK_RATE_HZ) * 10));
  return tenths % 10 === 0
    ? `${tenths / 10}秒`
    : `${(tenths / 10).toFixed(1)}秒`;
}

export interface ArenaV2ModeHudParticipantV1 {
  readonly participantId: string;
  readonly lives: number;
  readonly status: string;
  readonly heldCollectionEquipmentDefinitionId: string | null;
  readonly survivalLevel: number | null;
  readonly cooldownRemainingTicks: number;
}

export interface ArenaV2ModeHudSupplyMarkerV1 {
  readonly supplyId: string;
  readonly slotId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly survivalLevel: number;
  readonly remainingTicks: number;
  readonly position: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
}

export interface ArenaV2ModeHudParticipantIdentityV1 {
  readonly participantId: string;
  readonly displayName: string;
  readonly portraitKey: string;
  readonly appearanceKey: string;
  readonly identityOrdinal: number;
  readonly identityGlyphKey: string;
  readonly identityPatternKey: string;
  readonly modeRole: 'competitor' | 'player';
  readonly teamId: string | null;
  readonly local: boolean;
}

export type ArenaV2MapExperienceBeatV1 =
  | 'introduce'
  | 'develop'
  | 'twist'
  | 'test'
  | 'climax'
  | 'release'
  | 'resolution';

export type ArenaV2RaceRouteTargetV1 =
  | Readonly<{
    readonly kind: 'segment';
    readonly segmentDefinitionId: string;
    readonly ordinal: number;
    readonly displayName: string;
    readonly lesson: string;
    readonly experienceBeat: ArenaV2MapExperienceBeatV1;
    readonly experienceIntensity: 1 | 2 | 3 | 4 | 5;
    readonly landmarkCue: string;
    readonly memoryHook: string;
  }>
  | Readonly<{ readonly kind: 'finish-gate' }>
  | Readonly<{ readonly kind: 'finished' }>;

export type ArenaV2ModeHudProjectionV1 =
  | Readonly<{
    readonly kind: 'duel';
    readonly mapDefinitionId: string;
    readonly mapDisplayName: string;
    readonly suddenDeath: boolean;
    readonly participants: readonly ArenaV2ModeHudParticipantV1[];
  }>
  | Readonly<{
    readonly kind: 'race';
    readonly mapDefinitionId: string;
    readonly mapDisplayName: string;
    readonly segmentCount: number;
    readonly finishGateId: string;
    readonly participants: readonly Readonly<{
      readonly participantId: string;
      readonly status: 'racing' | 'respawning' | 'finished';
      readonly progressOrdinal: number;
      readonly completedSegmentCount: number;
      readonly routeTarget: ArenaV2RaceRouteTargetV1;
      readonly rank: number | null;
      readonly respawnReadyTick: number | null;
      readonly finishTick: number | null;
    }>[];
  }>
  | Readonly<{
    readonly kind: 'survival';
    readonly mapDefinitionId: string;
    readonly mapDisplayName: string;
    readonly playerParticipantId: string;
    readonly survivedTicks: number;
    readonly pressureStage: number;
    readonly activeEnemyCount: number;
    readonly fallCount: number;
    readonly terminalFallCount: 2;
  }>;

export interface ArenaV2ModeHudViewModelV1 {
  readonly schemaVersion: typeof ARENA_V2_MODE_HUD_VIEW_MODEL_V1_SCHEMA_VERSION;
  readonly tick: number;
  readonly eventSequence: number;
  readonly modeDefinitionId: string;
  readonly phase: string;
  readonly remainingTicks: number;
  readonly preparationRemainingTicks: number | null;
  readonly localParticipant: ArenaV2ModeHudParticipantV1;
  readonly participantIdentities: readonly ArenaV2ModeHudParticipantIdentityV1[];
  readonly mode: ArenaV2ModeHudProjectionV1;
  readonly supplyResyncReady: boolean;
  readonly supplyCadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1> | null;
  readonly supplyMarkers: readonly ArenaV2ModeHudSupplyMarkerV1[];
  readonly supplyFeedbackCues: readonly DeepReadonly<ArenaV2SupplyPresentationCueV1>[];
  readonly weaponFeedbackEvents: readonly ArenaV2WeaponFeedbackPresentationEvent[];
  readonly modeFeedbackEvents: readonly ArenaV2ModeFeedbackPresentationEventV1[];
  readonly result: DeepReadonly<ModeResultV3Payload> | null;
}

export interface ArenaV2ModeFeedbackPresentationEventV1 {
  readonly sourceEventId: string;
  readonly tick: number;
  readonly sequence: number;
  readonly anchorParticipantId: string | null;
  readonly kind:
    | 'match-started'
    | 'participant-fell'
    | 'respawn-scheduled'
    | 'respawned'
    | 'safe-anchor'
    | 'finish-claimed'
    | 'enemy-pressure'
    | 'survival-fall-counted'
    | 'match-ended';
  readonly title: string;
  readonly explanation: string;
  readonly emphasis: 'normal' | 'strong' | 'warning';
  readonly visualCue: string;
  readonly audioCue: string;
}

const INPUT_KEYS = new Set([
  'events', 'supplyCues', 'supplyCadence', 'readFrame', 'readFrameAudit', 'publicMatchInfo',
]);

function participantIdentities(
  info: DeepReadonly<ProductPublicMatchInfoV2>,
  frame: DeepReadonly<MatchReadFrameV3>,
): readonly ArenaV2ModeHudParticipantIdentityV1[] {
  if (info.modeDefinitionId !== frame.worldSnapshot.modeDefinitionId) {
    throw new RangeError('Arena V2 HUD PublicMatchInfo Mode身份与Frame不一致。');
  }
  if (info.localParticipantId !== frame.localActionSidecar.participantId) {
    throw new RangeError('Arena V2 HUD PublicMatchInfo本地身份与Frame不一致。');
  }
  if (info.content.selectedMapDefinitionId !== frame.worldSnapshot.map.definitionId) {
    throw new RangeError('Arena V2 HUD PublicMatchInfo内容地图身份与Frame不一致。');
  }
  const worldParticipantIds = new Set(
    frame.worldSnapshot.participants.map(({ id }) => id),
  );
  if (
    worldParticipantIds.size !== info.participantAssignments.length
    || info.participantAssignments.some(({ participantId }) => (
      !worldParticipantIds.has(participantId)
    ))
  ) {
    throw new RangeError('Arena V2 HUD PublicMatchInfo参与者集合与Frame不一致。');
  }
  const publicById = new Map(
    info.publicParticipants.map((participant) => [participant.participantId, participant]),
  );
  const controllable = info.participantAssignments.filter(({ modeRole }) => (
    modeRole !== PRODUCT_MODE_ROLE.ENEMY
  ));
  if (controllable.length < 1 || controllable.length > 4) {
    throw new RangeError('Arena V2 HUD只支持1-4个明确可控身份。');
  }
  const projected = controllable.map((assignment) => {
    const participant = publicById.get(assignment.participantId);
    if (!participant) {
      throw new RangeError(`Arena V2 HUD缺少公开身份${assignment.participantId}。`);
    }
    return Object.freeze({
      participantId: participant.participantId,
      displayName: participant.displayName,
      portraitKey: participant.portraitKey,
      appearanceKey: participant.appearanceKey,
      identityOrdinal: participant.identityOrdinal,
      identityGlyphKey: participant.identityGlyphKey,
      identityPatternKey: participant.identityPatternKey,
      modeRole: assignment.modeRole as 'competitor' | 'player',
      teamId: assignment.teamId,
      local: participant.participantId === info.localParticipantId,
    });
  }).sort((left, right) => left.identityOrdinal - right.identityOrdinal);
  if (projected.filter(({ local }) => local).length !== 1) {
    throw new RangeError('Arena V2 HUD必须有且只有一个本地公开身份。');
  }
  const modeState = frame.worldSnapshot.modeProjection.state;
  if (
    modeState.kind === 'duel'
    && (projected.length !== 2 || projected.some(({ modeRole }) => modeRole !== 'competitor'))
  ) {
    throw new RangeError('Arena V2 HUD 1v1必须包含2个明确competitor身份。');
  }
  if (
    modeState.kind === 'race'
    && (projected.length < 2 || projected.length > 4
      || projected.some(({ modeRole }) => modeRole !== 'competitor'))
  ) {
    throw new RangeError('Arena V2 HUD竞速必须包含2-4个明确competitor身份。');
  }
  if (
    modeState.kind === 'survival'
    && (projected.length !== 1
      || projected[0]?.modeRole !== 'player'
      || projected[0]?.participantId !== modeState.playerParticipantId)
  ) {
    throw new RangeError('Arena V2 HUD生存必须只有权威player公开身份。');
  }
  return Object.freeze(projected);
}

function participantView(
  participant: DeepReadonly<MatchReadFrameV3['worldSnapshot']['participants'][number]>,
): ArenaV2ModeHudParticipantV1 {
  return Object.freeze({
    participantId: participant.id,
    lives: participant.lives,
    status: participant.status,
    heldCollectionEquipmentDefinitionId:
      participant.equipment?.collectionEquipmentDefinitionId ?? null,
    survivalLevel: participant.equipment?.survivalLevel ?? null,
    cooldownRemainingTicks: participant.equipment?.cooldownRemainingTicks ?? 0,
  });
}

interface ArenaV2RaceMapLearningV1 {
  readonly mapDefinitionId: string;
  readonly mapDisplayName: string;
  readonly segments: readonly Readonly<{
    readonly segmentDefinitionId: string;
    readonly ordinal: number;
    readonly displayName: string;
    readonly lesson: string;
    readonly experienceBeat: ArenaV2MapExperienceBeatV1;
    readonly experienceIntensity: 1 | 2 | 3 | 4 | 5;
    readonly landmarkCue: string;
    readonly memoryHook: string;
  }>[];
}

function raceMapLearning(
  frame: DeepReadonly<MatchReadFrameV3>,
): ArenaV2RaceMapLearningV1 {
  const mapDefinitionId = frame.worldSnapshot.map.definitionId;
  const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
    (entry) => entry.mapDefinitionId === mapDefinitionId,
  );
  if (!map) {
    throw new RangeError(`Arena V2 HUD竞速地图${mapDefinitionId}没有学习内容。`);
  }
  return Object.freeze({
    mapDefinitionId,
    mapDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      map.nameMessageId,
    ),
    segments: Object.freeze(map.segments.map((segment) => Object.freeze({
      segmentDefinitionId: segment.segmentDefinitionId,
      ordinal: segment.ordinal,
      displayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
        segment.nameMessageId,
      ),
      lesson: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
        segment.lessonMessageId,
      ),
      experienceBeat: segment.experienceBeat,
      experienceIntensity: segment.experienceIntensity,
      landmarkCue: segment.landmarkCue,
      memoryHook: segment.memoryHook,
    }))),
  });
}

function raceRouteTarget(
  status: 'racing' | 'respawning' | 'finished',
  progressOrdinal: number,
  learning: ArenaV2RaceMapLearningV1,
): ArenaV2RaceRouteTargetV1 {
  const segmentCount = learning.segments.length;
  if (progressOrdinal > segmentCount + 1) {
    throw new RangeError('Arena V2 HUD竞速路线进度超过地图终点。');
  }
  if (status === 'finished') {
    if (progressOrdinal !== segmentCount + 1) {
      throw new RangeError('Arena V2 HUD已完成参与者必须位于终点进度。');
    }
    return Object.freeze({ kind: 'finished' as const });
  }
  if (progressOrdinal > segmentCount) {
    throw new RangeError('Arena V2 HUD未完成参与者不能越过终点。');
  }
  if (progressOrdinal === segmentCount) {
    return Object.freeze({ kind: 'finish-gate' as const });
  }
  const segment = learning.segments[progressOrdinal];
  if (!segment) throw new RangeError('Arena V2 HUD竞速下一路段不存在。');
  return Object.freeze({
    kind: 'segment' as const,
    segmentDefinitionId: segment.segmentDefinitionId,
    ordinal: segment.ordinal,
    displayName: segment.displayName,
    lesson: segment.lesson,
    experienceBeat: segment.experienceBeat,
    experienceIntensity: segment.experienceIntensity,
    landmarkCue: segment.landmarkCue,
    memoryHook: segment.memoryHook,
  });
}

function modeProjection(
  frame: DeepReadonly<MatchReadFrameV3>,
  raceLearning: ArenaV2RaceMapLearningV1 | null,
): ArenaV2ModeHudProjectionV1 {
  const state = frame.worldSnapshot.modeProjection.state;
  if (state.kind === 'duel') {
    const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
      ({ mapDefinitionId }) => mapDefinitionId === frame.worldSnapshot.map.definitionId,
    );
    if (map === undefined) {
      throw new RangeError(
        `Arena V2 HUD 1v1地图${frame.worldSnapshot.map.definitionId}没有学习内容。`,
      );
    }
    return Object.freeze({
      kind: 'duel' as const,
      mapDefinitionId: frame.worldSnapshot.map.definitionId,
      mapDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
        map.nameMessageId,
      ),
      suddenDeath: state.suddenDeath,
      participants: Object.freeze(frame.worldSnapshot.participants.map(participantView)),
    });
  }
  if (state.kind === 'race') {
    if (raceLearning === null) throw new RangeError('Arena V2 HUD竞速投影缺少地图学习内容。');
    const segmentCount = raceLearning.segments.length;
    return Object.freeze({
      kind: 'race' as const,
      mapDefinitionId: raceLearning.mapDefinitionId,
      mapDisplayName: raceLearning.mapDisplayName,
      segmentCount,
      finishGateId: state.finishGateId,
      participants: Object.freeze(state.participants.map((participant) => Object.freeze({
        participantId: participant.participantId,
        status: participant.status,
        progressOrdinal: participant.progressOrdinal,
        completedSegmentCount: Math.min(participant.progressOrdinal, segmentCount),
        routeTarget: raceRouteTarget(
          participant.status,
          participant.progressOrdinal,
          raceLearning,
        ),
        rank: participant.rank,
        respawnReadyTick: participant.respawnReadyTick,
        finishTick: participant.finishTick,
      }))),
    });
  }
  const survivalMap = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
    ({ mapDefinitionId }) => mapDefinitionId === frame.worldSnapshot.map.definitionId,
  );
  if (survivalMap === undefined) {
    throw new RangeError(
      `Arena V2 HUD生存地图${frame.worldSnapshot.map.definitionId}没有学习内容。`,
    );
  }
  return Object.freeze({
    kind: 'survival' as const,
    mapDefinitionId: frame.worldSnapshot.map.definitionId,
    mapDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      survivalMap.nameMessageId,
    ),
    playerParticipantId: state.playerParticipantId,
    survivedTicks: state.survivedTicks,
    pressureStage: state.pressureStage,
    activeEnemyCount: state.enemySlots.filter(({ active }) => active).length,
    fallCount: state.fallCount,
    terminalFallCount: state.terminalFallCount,
  });
}

function validateEventBatch(
  values: unknown,
  frame: DeepReadonly<MatchReadFrameV3>,
): readonly DeepReadonly<ArenaMatchEventV6>[] {
  if (!Array.isArray(values)) throw new TypeError('Arena V2 HUD events必须是数组。');
  const events = Object.freeze(values.map(createArenaMatchEventV6));
  const firstExpectedSequence = frame.worldSnapshot.eventSequence - events.length;
  if (firstExpectedSequence < 0) throw new RangeError('Arena V2 HUD event水位小于批次数量。');
  const ids = new Set<string>();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    if (event.sequence !== firstExpectedSequence + index) {
      throw new RangeError('Arena V2 HUD event sequence与Frame水位不闭合。');
    }
    if (event.tick >= frame.worldSnapshot.tick) {
      throw new RangeError('Arena V2 HUD event tick必须早于post-step Frame tick。');
    }
    if (ids.has(event.id)) throw new RangeError(`Arena V2 HUD event id重复：${event.id}。`);
    ids.add(event.id);
    if (
      'modeDefinitionId' in event
      && event.modeDefinitionId !== frame.worldSnapshot.modeDefinitionId
    ) throw new RangeError('Arena V2 HUD event modeDefinitionId与Frame不一致。');
  }
  return events;
}

function validateSupplyCues(
  values: unknown,
  frame: DeepReadonly<MatchReadFrameV3>,
): readonly DeepReadonly<ArenaV2SupplyPresentationCueV1>[] {
  if (!Array.isArray(values)) throw new TypeError('Arena V2 HUD supplyCues必须是数组。');
  const cues = Object.freeze(values.map(createArenaV2SupplyPresentationCueV1));
  const ids = new Set<string>();
  for (const cue of cues) {
    if (cue.tick >= frame.worldSnapshot.tick) {
      throw new RangeError('Arena V2 HUD supply Cue tick必须早于post-step Frame tick。');
    }
    if (ids.has(cue.id)) throw new RangeError(`Arena V2 HUD supply Cue id重复：${cue.id}。`);
    ids.add(cue.id);
  }
  return cues;
}

function actorLabel(
  participantId: string,
  localParticipantId: string,
  identitiesById: ReadonlyMap<string, ArenaV2ModeHudParticipantIdentityV1>,
): string {
  if (participantId === localParticipantId) return '你';
  const identity = identitiesById.get(participantId);
  return identity === undefined
    ? participantId
    : `${identity.displayName} [${identity.identityOrdinal}]`;
}

function modeFeedback(
  event: DeepReadonly<ArenaMatchEventV6>,
  localParticipantId: string,
  identitiesById: ReadonlyMap<string, ArenaV2ModeHudParticipantIdentityV1>,
  raceLearning: ArenaV2RaceMapLearningV1 | null,
): ArenaV2ModeFeedbackPresentationEventV1 | null {
  const base = {
    sourceEventId: event.id,
    tick: event.tick,
    sequence: event.sequence,
  };
  if (event.type === ARENA_MATCH_EVENT_V6.MATCH_STARTED) {
    return Object.freeze({
      ...base,
      anchorParticipantId: null,
      kind: 'match-started' as const,
      title: '对局开始',
      explanation: `模式 ${event.modeDefinitionId} 已开始。`,
      emphasis: 'strong' as const,
      visualCue: 'mode-started',
      audioCue: 'mode-started',
    });
  }
  if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL) {
    const actor = actorLabel(event.participantId, localParticipantId, identitiesById);
    const title = event.fallCause === 'credited-hit'
      ? `${actor}被武器击落`
      : event.fallCause === 'movement'
        ? `${actor}路线失误`
        : `${actor}被环境击落`;
    const explanation = event.fallCause === 'credited-hit'
      ? `本次掉落归因给 ${event.creditedAttackerId === null
        ? '未知攻击者'
        : actorLabel(event.creditedAttackerId, localParticipantId, identitiesById)}。`
      : event.fallCause === 'movement'
        ? '本次掉落不是武器击落。'
        : '本次掉落由环境规则造成。';
    return Object.freeze({
      ...base,
      anchorParticipantId: event.participantId,
      kind: 'participant-fell' as const,
      title,
      explanation,
      emphasis: 'warning' as const,
      visualCue: `participant-fell-${event.fallCause}`,
      audioCue: `participant-fell-${event.fallCause}`,
    });
  }
  if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED) {
    const actor = actorLabel(event.participantId, localParticipantId, identitiesById);
    return Object.freeze({
      ...base,
      anchorParticipantId: event.participantId,
      kind: 'respawn-scheduled' as const,
      title: `${actor}等待重生`,
      explanation: `将在${countdownDurationText(event.readyTick - event.tick)}后于安全锚点 ${event.anchorId} 重生。`,
      emphasis: 'normal' as const,
      visualCue: 'respawn-scheduled',
      audioCue: 'respawn-scheduled',
    });
  }
  if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED) {
    const actor = actorLabel(event.participantId, localParticipantId, identitiesById);
    return Object.freeze({
      ...base,
      anchorParticipantId: event.participantId,
      kind: 'respawned' as const,
      title: `${actor}已重生`,
      explanation: `安全锚点 ${event.anchorId}，保护 ${countdownDurationText(event.invulnerableTicks)}。`,
      emphasis: 'strong' as const,
      visualCue: 'respawned',
      audioCue: 'respawned',
    });
  }
  if (event.type === ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED) {
    if (raceLearning === null) throw new RangeError('Arena V2 HUD竞速事件缺少地图学习内容。');
    const segment = raceLearning.segments[event.progressOrdinal - 1];
    if (!segment || segment.ordinal !== event.progressOrdinal) {
      throw new RangeError('Arena V2 HUD安全点事件没有对应路段。');
    }
    const actor = actorLabel(event.participantId, localParticipantId, identitiesById);
    return Object.freeze({
      ...base,
      anchorParticipantId: event.participantId,
      kind: 'safe-anchor' as const,
      title: `${actor}已通过第${segment.ordinal}段 · ${segment.displayName}`,
      explanation: `${segment.lesson} 已保存复活点 ${event.anchorId}。`,
      emphasis: 'normal' as const,
      visualCue: 'safe-anchor-committed',
      audioCue: 'safe-anchor-committed',
    });
  }
  if (event.type === ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED) {
    if (raceLearning === null) throw new RangeError('Arena V2 HUD竞速终点事件缺少地图学习内容。');
    if (event.progressOrdinal !== raceLearning.segments.length + 1) {
      throw new RangeError('Arena V2 HUD竞速终点事件进度与地图不闭合。');
    }
    const actor = actorLabel(event.participantId, localParticipantId, identitiesById);
    return Object.freeze({
      ...base,
      anchorParticipantId: event.participantId,
      kind: 'finish-claimed' as const,
      title: `${actor}完成${raceLearning.mapDisplayName}`,
      explanation: `${raceLearning.segments.length}/${raceLearning.segments.length}个路段全部通过，完成时间 ${elapsedClockText(event.finishTick)}。`,
      emphasis: 'strong' as const,
      visualCue: 'race-finish-claimed',
      audioCue: 'race-finish-claimed',
    });
  }
  if (event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED) {
    return Object.freeze({
      ...base,
      anchorParticipantId: event.participantId,
      kind: 'enemy-pressure' as const,
      title: event.active ? '敌人压力上升' : '敌人暂时离场',
      explanation: event.active
        ? `敌人从锚点 ${event.anchorId ?? '未知'} 进入。`
        : `敌人槽位 ${event.slotId} 已离场。`,
      emphasis: event.active ? 'warning' as const : 'normal' as const,
      visualCue: event.active ? 'enemy-entered' : 'enemy-left',
      audioCue: event.active ? 'enemy-pressure' : 'enemy-left',
    });
  }
  if (event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED) {
    return Object.freeze({
      ...base,
      anchorParticipantId: event.participantId,
      kind: 'survival-fall-counted' as const,
      title: event.terminal ? '第二次掉落，生存结束' : '第一次掉落，可以重生',
      explanation: `掉落次数 ${event.fallCount}/${event.terminalFallCount}。`,
      emphasis: 'warning' as const,
      visualCue: event.terminal ? 'survival-terminal-fall' : 'survival-first-fall',
      audioCue: event.terminal ? 'survival-terminal-fall' : 'survival-first-fall',
    });
  }
  if (event.type === ARENA_MATCH_EVENT_V6.MATCH_ENDED) {
    return Object.freeze({
      ...base,
      anchorParticipantId: null,
      kind: 'match-ended' as const,
      title: '对局结束',
      explanation: `${event.modeResult.kind} · ${event.modeResult.reason} · ${elapsedClockText(event.modeResult.endedAtTick)}。`,
      emphasis: 'strong' as const,
      visualCue: 'match-ended',
      audioCue: 'match-ended',
    });
  }
  return null;
}

function authoritativeFallFeedbackIdentity(
  participantId: string,
  tick: number,
  fallCause: 'credited-hit' | 'movement',
  creditedAttackerId: string | null,
): string {
  return JSON.stringify([participantId, tick, fallCause, creditedAttackerId]);
}

function weaponFallFeedbackIdentities(
  events: readonly DeepReadonly<ArenaMatchEventV6>[],
): ReadonlySet<string> {
  const identities = new Set<string>();
  for (const event of events) {
    if (event.type !== ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED
      || event.targetId === null
      || event.targetFallTick === null
      || (event.kind !== 'hit-ring-out' && event.kind !== 'movement-fall')) continue;
    identities.add(authoritativeFallFeedbackIdentity(
      event.targetId,
      event.targetFallTick,
      event.kind === 'hit-ring-out' ? 'credited-hit' : 'movement',
      event.creditedAttackerId,
    ));
  }
  return identities;
}

export function projectArenaV2ModeHudViewModelV1(value: unknown): ArenaV2ModeHudViewModelV1 {
  const source = cloneFrozenData(value, 'ArenaV2ModeHudViewModelInput');
  assertKnownKeys(source, INPUT_KEYS, 'ArenaV2ModeHudViewModelInput');
  const audit = source.readFrameAudit as MatchReadFrameV3AuditOptions;
  const frame = createMatchReadFrameV3Audit(source.readFrame, audit);
  const publicMatchInfo = createProductPublicMatchInfoV2(source.publicMatchInfo);
  const identities = participantIdentities(publicMatchInfo, frame);
  const identitiesById = new Map(
    identities.map((identity) => [identity.participantId, identity]),
  );
  const events = validateEventBatch(source.events, frame);
  const supplyFeedbackCues = validateSupplyCues(source.supplyCues, frame);
  const world = frame.worldSnapshot;
  const raceLearning = world.modeProjection.state.kind === 'race'
    ? raceMapLearning(frame)
    : null;
  const localParticipant = world.participants.find(
    ({ id }) => id === frame.localActionSidecar.participantId,
  );
  if (!localParticipant) throw new RangeError('Arena V2 HUD local participant不属于Frame。');
  const supply = world.activeSupplyProjection;
  const supplyCadence = source.supplyCadence === null
    ? null
    : createArenaSupplyCadenceSnapshotV1(source.supplyCadence);
  if (world.modeProjection.state.kind === 'survival') {
    if (supplyCadence === null) {
      throw new RangeError('Arena V2 HUD生存模式缺少权威供给节奏。');
    }
    if (
      supplyCadence.modeDefinitionId !== world.modeDefinitionId
      || supplyCadence.snapshotTick !== world.tick
    ) throw new RangeError('Arena V2 HUD供给节奏Mode/tick身份漂移。');
    if (
      supply !== null
      && supply.supplies.some(({ supplyDefinitionId }) => (
        supplyDefinitionId !== supplyCadence.supplyDefinitionId
      ))
    ) throw new RangeError('Arena V2 HUD供给节奏与地图供给Definition不一致。');
  } else if (supplyCadence !== null) {
    throw new RangeError('Arena V2 HUD非生存模式不得包含供给节奏。');
  }
  const supplyMarkers = supply === null
    ? Object.freeze([])
    : Object.freeze(supply.supplies.map((item) => Object.freeze({
      supplyId: item.supplyId,
      slotId: item.slotId,
      collectionEquipmentDefinitionId: item.collectionEquipmentDefinitionId,
      runtimeEquipmentDefinitionId: item.runtimeEquipmentDefinitionId,
      survivalLevel: item.survivalLevel,
      remainingTicks: item.remainingTicks,
      position: item.position,
    })));
  const weaponFeedbackEvents = Object.freeze(events
    .filter((event) => event.type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED)
    .map(projectArenaWeaponFeedbackEventV6PresentationEvent));
  const resolvedFallFeedbackIdentities = weaponFallFeedbackIdentities(events);
  const modeFeedbackEvents = Object.freeze(events
    .filter((event) => {
      if (event.type !== ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL) return true;
      if (event.fallCause === 'environment') return true;
      return !resolvedFallFeedbackIdentities.has(authoritativeFallFeedbackIdentity(
        event.participantId,
        event.tick,
        event.fallCause,
        event.creditedAttackerId,
      ));
    })
    .map((event) => modeFeedback(event, localParticipant.id, identitiesById, raceLearning))
    .filter((event): event is ArenaV2ModeFeedbackPresentationEventV1 => event !== null));
  return Object.freeze({
    schemaVersion: ARENA_V2_MODE_HUD_VIEW_MODEL_V1_SCHEMA_VERSION,
    tick: world.tick,
    eventSequence: world.eventSequence,
    modeDefinitionId: world.modeDefinitionId,
    phase: world.phase,
    remainingTicks: world.remainingTicks,
    preparationRemainingTicks: world.modeProjection.preparationRemainingTicks,
    localParticipant: participantView(localParticipant),
    participantIdentities: identities,
    mode: modeProjection(frame, raceLearning),
    supplyResyncReady: supply === null || supply.resyncReadiness === 'ready',
    supplyCadence,
    supplyMarkers,
    supplyFeedbackCues,
    weaponFeedbackEvents,
    modeFeedbackEvents,
    result: world.result,
  });
}
