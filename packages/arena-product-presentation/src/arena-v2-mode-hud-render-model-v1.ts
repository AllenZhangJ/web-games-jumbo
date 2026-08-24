import {
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
} from './arena-v2-information-presentation-content-v1.js';
import {
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
} from './arena-v2-weapon-collection-combat-grammar-visual-source-candidate-v1.js';
import {
  arenaV2MapExperienceBeatTextV1,
  arenaV2MapLandmarkCueTextV1,
  projectArenaV2WeaponOperationReadV1,
} from './arena-v2-information-content-read-projection-v1.js';
import {
  arenaV2WeaponDisplayNameV1,
  projectArenaV2WeaponMapLearningCandidateV1,
  projectArenaV2WeaponMapSegmentLearningCandidateV1,
  requireArenaV2WeaponDefinitionIdV1,
} from './arena-v2-weapon-map-learning-projection-candidate-v1.js';
import type { ArenaV2ModeHudViewModelV1 } from './arena-v2-mode-hud-view-model-v1.js';

export const ARENA_V2_MODE_HUD_RENDER_MODEL_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  validationStatus: 'not-run' as const,
  authorityTickFieldsRemainReadOnly: true as const,
  hierarchy: Object.freeze([
    'primary-match-clock',
    'preparation-countdown',
    'local-cooldown-state',
    'next-supply-countdown',
    'per-supply-expiry',
  ] as const),
  primaryClock: Object.freeze({
    visibleFormat: 'MM:SS' as const,
    minimumWidthCssPixels: Object.freeze({ narrow: 164 as const, regular: 184 as const }),
    numericCharacterColumns: 5 as const,
  }),
  shortCountdown: Object.freeze({
    visibleFormats: Object.freeze(['N秒', '0.x秒', '现在'] as const),
    minimumValueWidthCssPixels: 64 as const,
    roundsTowardNextAuthorityBoundary: true as const,
  }),
  readyState: Object.freeze({
    visibleText: '就绪' as const,
    accessibilityText: '武器已经就绪' as const,
    appliesOnlyToFactId: 'local-cooldown' as const,
    minimumValueWidthCssPixels: 64 as const,
  }),
  numeralGlyphs: Object.freeze({
    policy: 'tabular-monospace' as const,
    fontStack: 'ui-monospace, "SFMono-Regular", Menlo, monospace' as const,
    negativeLetterSpacingAllowed: false as const,
  }),
  congestion: Object.freeze({
    preservePrimaryClock: true as const,
    preservePreparationCountdown: true as const,
    supplyLineStrategy: 'name-over-level-and-time' as const,
    deferredOrder: Object.freeze(['feedback', 'per-supply-expiry'] as const),
    horizontalOverflowAllowed: false as const,
  }),
  reducedMotion: Object.freeze({
    numericReplacementOnly: true as const,
    pulseOrScaleRequired: false as const,
  }),
  accessibility: Object.freeze({
    liveAnnounceEveryCountdownStep: false as const,
    exposeFullSemanticText: true as const,
    mutedRemovesTimeFacts: false as const,
    readyTransitionRequiresSingleDeduplicatedAnnouncement: true as const,
  }),
});

export const ARENA_V2_MODE_HUD_WEAPON_MAP_LEARNING_CONTRACT_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  validationStatus: 'not-run' as const,
  authorityMapSource: 'hud-view-model.mode.mapDefinitionId' as const,
  weaponSituationSource: 'weapon-map-learning-projection.mode-consequence' as const,
  mapOpportunitySource: 'weapon-map-learning-projection.current-map-opportunity-counts' as const,
  maximumVisibleSituationCount: 2 as const,
  readsParticipantPosition: false as const,
  infersCurrentSegment: false as const,
  addsRuleOrMatchAuthority: false as const,
  fullPracticeCopyAppliesOnlyToLocalPickupOrReplacement: true as const,
  persistentVisibleCopyLimitedToPrimarySituation: true as const,
  persistentLocalWeaponFactUsesPrimarySituation: true as const,
  persistentLocalWeaponRenderPrimitiveId: 'hud:local:local-weapon' as const,
  persistentVisibleMaximumLines: 1 as const,
  persistentCanvasOverflowPolicy: 'measured-ellipsis' as const,
  persistentAccessibilityUsesConcretePracticeSummary: true as const,
  persistentAccessibilityTextTruncated: false as const,
  hudCollectionIdentityNormalizationPolicy: 'catalog-id-to-unique-definition-id' as const,
  duelPersistentLearningUsesAuthorityMapIdentity: true as const,
  duelPersistentVisibleCopyLimitedToPrimarySituation: true as const,
  duelOpponentCounterSource: 'shared-weapon-combat-grammar.ground-counter-inputs' as const,
  duelOpponentCounterVisibleMaximumInputCount: 2 as const,
  racePersistentMapLevelCopyAllowed: false as const,
  addsPagePopupTaskOrReward: false as const,
});

export const ARENA_V2_MODE_HUD_FEEDBACK_PERSPECTIVE_CONTRACT_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  source: 'validated-local-participant-and-feedback-participant-ids' as const,
  weaponFeedbackCarriesAttackerAndTargetSeparately: true as const,
  nonWeaponFeedbackAttackAndTargetIdentity: null,
  visualAnchorPolicy: 'target-then-attacker' as const,
  values: Object.freeze(['local-involved', 'global', 'remote-only'] as const),
  derivedBeforeFeedbackQueue: true as const,
  localizedCopyDoesNotAffectPerspective: true as const,
  weaponSpecializationCannotChangePerspective: true as const,
  localReceivedWeaponImpactEmphasis: 'warning' as const,
  localOutgoingWeaponImpactKeepsAuthorityEmphasis: true as const,
  remoteWeaponImpactCannotGainLocalWarning: true as const,
  reusesExistingWarningVisualAudioAndQueueSemantics: true as const,
  writesRuleMatchOrResult: false as const,
});

/** @deprecated Use the mode-wide contract; kept as a source-compatible export. */
export const ARENA_V2_LOCAL_PICKUP_MAP_LEARNING_CONTRACT_V1 =
  ARENA_V2_MODE_HUD_WEAPON_MAP_LEARNING_CONTRACT_V1;

export interface ArenaV2ModeHudPreferenceSnapshotV1 {
  readonly reducedMotion: boolean;
  readonly soundEnabled: boolean;
}

export interface ArenaV2ModeHudPresentationProfileV1 {
  readonly modeLabel: '对战' | '竞速' | '生存';
  readonly objectiveText: '击落对手' | '抵达终点' | '活得更久';
  readonly timerLabel: '回合剩余' | '竞速剩余' | '生存上限';
  readonly localPanelLabel: '我的状态' | '路线状态' | '生存状态';
  readonly modePanelLabel: '对局信息' | '竞速信息' | '压力信息';
  readonly accentTone: 'strong' | 'primary' | 'warning';
}

export interface ArenaV2ModeHudTextFactV1 {
  readonly id: string;
  readonly label: string;
  readonly valueText: string;
  readonly accessibilityText: string;
  readonly fixedWidthNumeric: boolean;
  readonly emphasis: 'normal' | 'strong' | 'warning';
}

export interface ArenaV2ModeHudFeedbackItemV1 {
  readonly sourceEventId: string;
  readonly tick: number;
  readonly sequence: number;
  readonly category: 'weapon' | 'supply' | 'mode';
  readonly anchorParticipantId: string | null;
  readonly attackerParticipantId: string | null;
  readonly targetParticipantId: string | null;
  readonly anchorWorldPosition: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }> | null;
  readonly actionDefinitionId: string | null;
  readonly perspective: 'local-involved' | 'global' | 'remote-only';
  readonly title: string;
  readonly explanation: string;
  readonly emphasis: 'normal' | 'strong' | 'warning';
  readonly visualCue: string;
  readonly audioCue: string | null;
  readonly motionPolicy: 'standard' | 'static';
}

function weaponFeedbackPerspective(
  model: ArenaV2ModeHudViewModelV1,
  event: ArenaV2ModeHudViewModelV1['weaponFeedbackEvents'][number],
): ArenaV2ModeHudFeedbackItemV1['perspective'] {
  return event.attackerId === model.localParticipant.participantId
    || event.targetId === model.localParticipant.participantId
    ? 'local-involved'
    : 'remote-only';
}

function supplyFeedbackPerspective(
  model: ArenaV2ModeHudViewModelV1,
  cue: ArenaV2ModeHudViewModelV1['supplyFeedbackCues'][number],
): ArenaV2ModeHudFeedbackItemV1['perspective'] {
  if (cue.participantId === null) return 'global';
  return cue.participantId === model.localParticipant.participantId
    ? 'local-involved'
    : 'remote-only';
}

function modeFeedbackPerspective(
  model: ArenaV2ModeHudViewModelV1,
  event: ArenaV2ModeHudViewModelV1['modeFeedbackEvents'][number],
): ArenaV2ModeHudFeedbackItemV1['perspective'] {
  if (event.kind === 'match-started'
    || event.kind === 'match-ended'
    || event.kind === 'enemy-pressure') return 'global';
  if (event.anchorParticipantId === null) return 'global';
  return event.anchorParticipantId === model.localParticipant.participantId
    ? 'local-involved'
    : 'remote-only';
}

export interface ArenaV2ModeHudWeaponFeedbackCopyV1 {
  readonly title: string;
  readonly explanation: string;
}

export interface ArenaV2ModeHudWeaponFeedbackCopyContextV1 {
  readonly localParticipantId: string;
  readonly participantIdentities: ArenaV2ModeHudViewModelV1['participantIdentities'];
  readonly modeKind: ArenaV2ModeHudViewModelV1['mode']['kind'];
}

export function projectArenaV2ModeHudWeaponFeedbackEmphasisV1(
  context: ArenaV2ModeHudWeaponFeedbackCopyContextV1,
  event: ArenaV2ModeHudViewModelV1['weaponFeedbackEvents'][number],
): ArenaV2ModeHudFeedbackItemV1['emphasis'] {
  const localReceivedWeaponImpact = event.targetId === context.localParticipantId
    && (event.feedbackKind === 'hit-confirm'
      || event.feedbackKind === 'hit-surface-transfer'
      || event.feedbackKind === 'hit-ring-out');
  return localReceivedWeaponImpact ? 'warning' : event.emphasis;
}

export interface ArenaV2ModeHudRenderModelV1 {
  readonly schemaVersion: typeof ARENA_V2_MODE_HUD_RENDER_MODEL_V1_SCHEMA_VERSION;
  readonly tick: number;
  readonly modeDefinitionId: string;
  readonly modeKind: ArenaV2ModeHudViewModelV1['mode']['kind'];
  readonly modePresentation: ArenaV2ModeHudPresentationProfileV1;
  readonly phase: string;
  readonly preferences: ArenaV2ModeHudPreferenceSnapshotV1;
  readonly participantIdentities: ArenaV2ModeHudViewModelV1['participantIdentities'];
  readonly primaryTimer: ArenaV2ModeHudTextFactV1;
  readonly preparationTimer: ArenaV2ModeHudTextFactV1 | null;
  readonly localFacts: readonly ArenaV2ModeHudTextFactV1[];
  readonly modeFacts: readonly ArenaV2ModeHudTextFactV1[];
  readonly supplyItems: readonly Readonly<{
    readonly supplyId: string;
    readonly slotId: string;
    readonly collectionEquipmentDefinitionId: string;
    readonly displayName: string;
    readonly coreVerbText: string;
    readonly runtimeEquipmentDefinitionId: string;
    readonly survivalLevel: number;
    readonly remainingTicks: number;
    readonly remainingTickText: string;
    readonly worldPosition: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
    readonly accessibilityText: string;
  }>[];
  readonly feedbackItems: readonly ArenaV2ModeHudFeedbackItemV1[];
  readonly supplyResyncReady: boolean;
  readonly result: ArenaV2ModeHudViewModelV1['result'];
}

const PREFERENCE_KEYS = new Set(['reducedMotion', 'soundEnabled']);

function preferences(value: unknown): ArenaV2ModeHudPreferenceSnapshotV1 {
  const source = cloneFrozenData(value, 'ArenaV2ModeHudPreferenceSnapshotV1');
  assertKnownKeys(source, PREFERENCE_KEYS, 'ArenaV2ModeHudPreferenceSnapshotV1');
  if (typeof source.reducedMotion !== 'boolean' || typeof source.soundEnabled !== 'boolean') {
    throw new TypeError('ArenaV2ModeHudPreferenceSnapshotV1字段必须是布尔值。');
  }
  return Object.freeze({
    reducedMotion: source.reducedMotion,
    soundEnabled: source.soundEnabled,
  });
}

const HUD_TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;

function displayTicks(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name}必须是非负安全整数tick。`);
  }
  return value;
}

function countdownClockText(ticks: number): string {
  const safeTicks = displayTicks(ticks, 'Arena V2 HUD主倒计时');
  const totalSeconds = safeTicks === 0 ? 0 : Math.ceil(safeTicks / HUD_TICK_RATE_HZ);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function elapsedClockText(ticks: number): string {
  const safeTicks = displayTicks(ticks, 'Arena V2 HUD累计时间');
  const totalSeconds = Math.floor(safeTicks / HUD_TICK_RATE_HZ);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function shortCountdownText(ticks: number): string {
  const safeTicks = displayTicks(ticks, 'Arena V2 HUD短倒计时');
  if (safeTicks === 0) return '现在';
  if (safeTicks < HUD_TICK_RATE_HZ) {
    const tenths = Math.ceil((safeTicks / HUD_TICK_RATE_HZ) * 10);
    return `${(tenths / 10).toFixed(1)}秒`;
  }
  return `${Math.ceil(safeTicks / HUD_TICK_RATE_HZ)}秒`;
}

function accessibleCountdownText(ticks: number): string {
  const safeTicks = displayTicks(ticks, 'Arena V2 HUD无障碍倒计时');
  if (safeTicks === 0) return '0秒';
  const tenths = Math.ceil((safeTicks / HUD_TICK_RATE_HZ) * 10);
  return tenths % 10 === 0
    ? `${tenths / 10}秒`
    : `${(tenths / 10).toFixed(1)}秒`;
}

function weaponOperationRead(weaponDefinitionId: string): Readonly<{
  readonly visibleText: '按一下' | '按住松开';
  readonly accessibilityText: string;
  readonly groundResult: string;
  readonly aerialResult: string;
}> {
  const operation = projectArenaV2WeaponOperationReadV1(
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
    ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
    weaponDefinitionId,
  );
  return Object.freeze({
    visibleText: operation.visibleText,
    accessibilityText: operation.accessibilityText,
    groundResult: operation.groundResult,
    aerialResult: operation.aerialResult,
  });
}

function localSurvivalWeaponMapLearning(
  model: ArenaV2ModeHudViewModelV1,
  weaponDefinitionId: string,
) {
  if (model.mode.kind !== 'survival') {
    throw new RangeError('Arena V2 HUD地图拾取学习只接受生存模式。');
  }
  const projection = projectArenaV2WeaponMapLearningCandidateV1({
    modeKind: 'survival',
    weaponDefinitionIds: [requireArenaV2WeaponDefinitionIdV1(weaponDefinitionId)],
    mapDefinitionId: model.mode.mapDefinitionId,
    focusPolicy: 'exactly-one',
    unknownMapPolicy: 'fail-closed',
  });
  if (projection === null || model.mode.mapDisplayName !== projection.mapDisplayName) {
    throw new RangeError(`Arena V2 HUD生存地图${model.mode.mapDefinitionId}显示身份漂移。`);
  }
  return projection;
}

function localDuelWeaponMapLearning(
  model: ArenaV2ModeHudViewModelV1,
  weaponDefinitionId: string,
) {
  if (model.mode.kind !== 'duel') {
    throw new RangeError('Arena V2 HUD持续地图武器学习只接受1v1模式。');
  }
  const projection = projectArenaV2WeaponMapLearningCandidateV1({
    modeKind: 'duel',
    weaponDefinitionIds: [requireArenaV2WeaponDefinitionIdV1(weaponDefinitionId)],
    mapDefinitionId: model.mode.mapDefinitionId,
    focusPolicy: 'exactly-one',
    unknownMapPolicy: 'fail-closed',
  });
  if (projection === null || model.mode.mapDisplayName !== projection.mapDisplayName) {
    throw new RangeError(`Arena V2 HUD 1v1地图${model.mode.mapDefinitionId}显示身份漂移。`);
  }
  return projection;
}

function localPersistentWeaponMapLearning(
  model: ArenaV2ModeHudViewModelV1,
  weaponDefinitionId: string,
) {
  if (model.mode.kind === 'duel') {
    return localDuelWeaponMapLearning(model, weaponDefinitionId);
  }
  if (model.mode.kind === 'survival') {
    return localSurvivalWeaponMapLearning(model, weaponDefinitionId);
  }
  return null;
}

function localPickupMapLearning(
  model: ArenaV2ModeHudViewModelV1,
  weaponDefinitionId: string,
): string {
  const projection = localSurvivalWeaponMapLearning(model, weaponDefinitionId);
  return `当前地图${projection.mapDisplayName}：优先找${projection.practiceSummary}`;
}

function raceRouteWeaponPractice(
  model: ArenaV2ModeHudViewModelV1,
  segmentDefinitionId: string,
  segmentOrdinal: number,
  segmentDisplayName: string,
): Readonly<{
  readonly visibleText: string;
  readonly accessibilityText: string;
}> | null {
  if (model.mode.kind !== 'race') {
    throw new RangeError('Arena V2 HUD竞速路段武器练习只接受竞速模式。');
  }
  const heldIdentity = model.localParticipant.heldCollectionEquipmentDefinitionId;
  if (heldIdentity === null) return null;
  const learning = projectArenaV2WeaponMapSegmentLearningCandidateV1({
    modeKind: 'race',
    weaponDefinitionId: requireArenaV2WeaponDefinitionIdV1(heldIdentity),
    mapDefinitionId: model.mode.mapDefinitionId,
    segmentDefinitionId,
    segmentOrdinal,
  });
  if (learning === null) return null;
  if (learning.mapDisplayName !== model.mode.mapDisplayName
    || learning.segmentDisplayName !== segmentDisplayName) {
    throw new RangeError('Arena V2 HUD竞速路段武器学习显示身份漂移。');
  }
  return Object.freeze({
    visibleText: `练${learning.situationDisplayName}`,
    accessibilityText: `当前武器${learning.weaponDisplayName}适合在这一段练${
      learning.situationDisplayName
    }`,
  });
}

function participantStatusText(value: string): string {
  if (value === 'active') return '在场';
  if (value === 'racing') return '竞速中';
  if (value === 'respawning') return '重生中';
  if (value === 'eliminated') return '已淘汰';
  if (value === 'finished') return '已完成';
  return value;
}

function duelOpponentCounterText(weaponDefinitionId: string): Readonly<{
  readonly visibleText: string;
  readonly accessibilityText: string;
}> {
  const weapon = ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.entries
    .find((entry) => entry.weaponDefinitionId === weaponDefinitionId);
  const ground = weapon?.contexts[0];
  if (weapon === undefined || ground?.context !== 'ground') {
    throw new RangeError(`Arena V2 HUD对手武器${weaponDefinitionId}缺少地面反制语法。`);
  }
  const labels = {
    direction: '变向',
    jump: '跳开',
  } as const;
  const inputs = ground.counterInputs.map((input) => labels[input]);
  if (inputs.length < 1 || inputs.length > 2 || new Set(inputs).size !== inputs.length) {
    throw new RangeError(`Arena V2 HUD对手武器${weaponDefinitionId}反制输入不闭合。`);
  }
  return Object.freeze({
    visibleText: inputs.join('/'),
    accessibilityText: inputs.join('或'),
  });
}

function weaponCoreVerbText(weaponDefinitionId: string): string {
  const weapon = ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.entries
    .find((entry) => entry.weaponDefinitionId === weaponDefinitionId);
  if (weapon === undefined) {
    throw new RangeError(`Arena V2 HUD武器${weaponDefinitionId}缺少核心动词语法。`);
  }
  return ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
    `arena.v2.verb.${weapon.coreVerb}`,
  );
}

function feedbackParticipantLabel(
  context: ArenaV2ModeHudWeaponFeedbackCopyContextV1,
  participantId: string | null,
): string {
  if (participantId === null) return '未知参与者';
  if (participantId === context.localParticipantId) return '你';
  const identity = context.participantIdentities.find((candidate) => (
    candidate.participantId === participantId
  ));
  return identity === undefined
    ? context.modeKind === 'survival' ? '敌人' : participantId
    : `${identity.displayName}[${identity.identityOrdinal}]`;
}

/** Uses only the already-authoritative feedback kind and public identities. */
export function projectArenaV2ModeHudWeaponFeedbackCopyV1(
  context: ArenaV2ModeHudWeaponFeedbackCopyContextV1,
  event: ArenaV2ModeHudViewModelV1['weaponFeedbackEvents'][number],
): ArenaV2ModeHudWeaponFeedbackCopyV1 {
  const attacker = feedbackParticipantLabel(context, event.attackerId);
  const target = feedbackParticipantLabel(context, event.targetId);
  if (event.feedbackKind === 'hit-confirm') return Object.freeze({
    title: attacker === '你' ? `你命中了${target}` : target === '你'
      ? `你被${attacker}命中` : `${attacker}命中${target}`,
    explanation: `${target}仍在原支撑面，但位置与路线压力已经改变。`,
  });
  if (event.feedbackKind === 'hit-surface-transfer') return Object.freeze({
    title: attacker === '你' ? `你改变了${target}的落点` : target === '你'
      ? `${attacker}改变了你的落点` : `${attacker}改变了${target}的落点`,
    explanation: `${target}的最终支撑面和路线位置已经转移。`,
  });
  if (event.feedbackKind === 'hit-ring-out') return Object.freeze({
    title: attacker === '你' ? `你击落了${target}` : target === '你'
      ? `你被${attacker}击落` : `${attacker}击落${target}`,
    explanation: `${target}的掉落已由权威规则归因给${attacker}。`,
  });
  if (event.feedbackKind === 'attack-evaded') return Object.freeze({
    title: attacker === '你' ? '你的攻击未命中' : `${attacker}的攻击未命中`,
    explanation: `${attacker}的攻击窗口已经结束，没有命中或掉落事实。`,
  });
  return Object.freeze({
    title: target === '你' ? '你因路线失误掉落' : `${target}因路线失误掉落`,
    explanation: `${target}因移动失足掉落，不计作武器击落。`,
  });
}

function weaponFeedbackCopyContext(
  model: ArenaV2ModeHudViewModelV1,
): ArenaV2ModeHudWeaponFeedbackCopyContextV1 {
  return Object.freeze({
    localParticipantId: model.localParticipant.participantId,
    participantIdentities: model.participantIdentities,
    modeKind: model.mode.kind,
  });
}

function modePresentation(
  kind: ArenaV2ModeHudViewModelV1['mode']['kind'],
): ArenaV2ModeHudPresentationProfileV1 {
  if (kind === 'duel') return Object.freeze({
    modeLabel: '对战',
    objectiveText: '击落对手',
    timerLabel: '回合剩余',
    localPanelLabel: '我的状态',
    modePanelLabel: '对局信息',
    accentTone: 'strong',
  });
  if (kind === 'race') return Object.freeze({
    modeLabel: '竞速',
    objectiveText: '抵达终点',
    timerLabel: '竞速剩余',
    localPanelLabel: '路线状态',
    modePanelLabel: '竞速信息',
    accentTone: 'primary',
  });
  return Object.freeze({
    modeLabel: '生存',
    objectiveText: '活得更久',
    timerLabel: '生存上限',
    localPanelLabel: '生存状态',
    modePanelLabel: '压力信息',
    accentTone: 'warning',
  });
}

function fact(
  id: string,
  label: string,
  valueText: string,
  accessibilityText: string,
  emphasis: ArenaV2ModeHudTextFactV1['emphasis'] = 'normal',
): ArenaV2ModeHudTextFactV1 {
  return Object.freeze({
    id,
    label,
    valueText,
    accessibilityText,
    fixedWidthNumeric: true,
    emphasis,
  });
}

function localFacts(model: ArenaV2ModeHudViewModelV1): readonly ArenaV2ModeHudTextFactV1[] {
  const participant = model.localParticipant;
  let modeLifeFact: ArenaV2ModeHudTextFactV1;
  if (model.mode.kind === 'race') {
    const raceParticipant = model.mode.participants.find(
      ({ participantId }) => participantId === participant.participantId,
    );
    if (!raceParticipant) throw new RangeError('Arena V2 HUD竞速缺少本地复活状态。');
    const respawnRemaining = raceParticipant.respawnReadyTick === null
      ? null
      : displayTicks(
        raceParticipant.respawnReadyTick - model.tick,
        'Arena V2 HUD竞速复活剩余时间',
      );
    modeLifeFact = Object.freeze({
      id: 'local-race-respawn',
      label: '复活',
      valueText: raceParticipant.status === 'finished'
        ? '已完成'
        : respawnRemaining === null
          ? '不限次数 · 3秒'
          : shortCountdownText(respawnRemaining),
      accessibilityText: raceParticipant.status === 'finished'
        ? '已经完成竞速路线'
        : respawnRemaining === null
          ? '竞速掉落后3秒在最近安全位置复活，次数不限'
          : `距离在最近安全位置复活还有${accessibleCountdownText(respawnRemaining)}`,
      fixedWidthNumeric: respawnRemaining !== null,
      emphasis: respawnRemaining === null ? 'normal' as const : 'warning' as const,
    });
  } else if (model.mode.kind === 'survival') {
    const remainingChances = Math.max(
      0,
      model.mode.terminalFallCount - model.mode.fallCount,
    );
    modeLifeFact = Object.freeze({
      id: 'local-survival-chances',
      label: '机会',
      valueText: `剩余${remainingChances}次`,
      accessibilityText: `生存模式还可承受${remainingChances}次掉落，第二次掉落结束本局`,
      fixedWidthNumeric: true,
      emphasis: remainingChances <= 1 ? 'warning' as const : 'normal' as const,
    });
  } else {
    modeLifeFact = fact(
      'local-lives',
      '生命',
      String(participant.lives),
      `剩余生命${participant.lives}`,
      participant.lives <= 1 ? 'warning' : 'normal',
    );
  }
  const weaponOperation = participant.heldCollectionEquipmentDefinitionId === null
    ? null
    : weaponOperationRead(participant.heldCollectionEquipmentDefinitionId);
  const persistentLearning = participant.heldCollectionEquipmentDefinitionId !== null
    ? localPersistentWeaponMapLearning(
      model,
      participant.heldCollectionEquipmentDefinitionId,
    )
    : null;
  const weaponName = participant.heldCollectionEquipmentDefinitionId === null
    ? '无武器'
    : participant.survivalLevel === null
      ? arenaV2WeaponDisplayNameV1(participant.heldCollectionEquipmentDefinitionId)
      : `${arenaV2WeaponDisplayNameV1(participant.heldCollectionEquipmentDefinitionId)} · Lv.${participant.survivalLevel}`;
  const weapon = weaponOperation === null
    ? weaponName
    : `${weaponName} · ${weaponOperation.visibleText}`
      + (persistentLearning === null
        ? ''
        : ` · 练${persistentLearning.situations[0]!.displayName}`);
  return Object.freeze([
    modeLifeFact,
    Object.freeze({
      id: 'local-weapon',
      label: '武器',
      valueText: weapon,
      accessibilityText: weaponOperation === null
        ? `当前${weaponName}`
        : `当前武器${weaponName}。操作：${weaponOperation.accessibilityText}。`
          + `地面：${weaponOperation.groundResult}。空中：${weaponOperation.aerialResult}`
          + (persistentLearning === null
            ? ''
            : `。当前地图${persistentLearning.mapDisplayName}，优先练${
              persistentLearning.practiceSummary
            }`),
      fixedWidthNumeric: false,
      emphasis: 'normal' as const,
    }),
    fact(
      'local-cooldown',
      '冷却',
      participant.cooldownRemainingTicks === 0
        ? ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.readyState.visibleText
        : shortCountdownText(participant.cooldownRemainingTicks),
      participant.cooldownRemainingTicks === 0
        ? ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.readyState.accessibilityText
        : `冷却剩余${accessibleCountdownText(participant.cooldownRemainingTicks)}`,
    ),
  ]);
}

function modeFacts(model: ArenaV2ModeHudViewModelV1): readonly ArenaV2ModeHudTextFactV1[] {
  const identityFact = Object.freeze({
    id: 'participant-identities',
    label: '身份',
    valueText: model.participantIdentities.map((identity) => (
      `${identity.local ? '你' : identity.displayName}[${identity.identityOrdinal}]`
    )).join(' · '),
    accessibilityText: model.participantIdentities.map((identity) => (
      `${identity.local ? '你' : identity.displayName}，身份${identity.identityOrdinal}，`
      + `符号${identity.identityGlyphKey}，纹理${identity.identityPatternKey}`
    )).join('；'),
    fixedWidthNumeric: false,
    emphasis: 'strong' as const,
  });
  if (model.mode.kind === 'duel') {
    const opponent = model.mode.participants.find(
      ({ participantId }) => participantId !== model.localParticipant.participantId,
    );
    if (!opponent || model.mode.participants.length !== 2) {
      throw new RangeError('Arena V2 HUD 1v1投影必须包含唯一对手。');
    }
    const opponentIdentity = model.participantIdentities.find(
      ({ participantId }) => participantId === opponent.participantId,
    );
    if (!opponentIdentity) throw new RangeError('Arena V2 HUD 1v1缺少对手公开身份。');
    const opponentWeapon = opponent.heldCollectionEquipmentDefinitionId === null
      ? '空手'
      : opponent.survivalLevel === null
        ? arenaV2WeaponDisplayNameV1(opponent.heldCollectionEquipmentDefinitionId)
        : `${arenaV2WeaponDisplayNameV1(opponent.heldCollectionEquipmentDefinitionId)} · Lv.${opponent.survivalLevel}`;
    const opponentCounter = opponent.heldCollectionEquipmentDefinitionId === null
      ? null
      : duelOpponentCounterText(opponent.heldCollectionEquipmentDefinitionId);
    const opponentStatus = participantStatusText(opponent.status);
    return Object.freeze([
      identityFact,
      Object.freeze({
        id: 'duel-opponent-state',
        label: '对手',
        valueText: `${opponentIdentity.displayName} · ${opponent.lives}命 · ${opponentStatus}`,
        accessibilityText: `对手${opponentIdentity.displayName}，剩余${opponent.lives}命，${opponentStatus}`,
        fixedWidthNumeric: false,
        emphasis: opponent.lives <= 1 ? 'strong' as const : 'normal' as const,
      }),
      Object.freeze({
        id: 'duel-opponent-weapon',
        label: '对手武器',
        valueText: opponentCounter === null
          ? opponentWeapon
          : `${opponentWeapon} · 反制${opponentCounter.visibleText}`,
        accessibilityText: opponentCounter === null
          ? `对手当前武器${opponentWeapon}`
          : `对手当前武器${opponentWeapon}。可用${opponentCounter.accessibilityText}规避地面攻击`,
        fixedWidthNumeric: false,
        emphasis: 'normal' as const,
      }),
      fact(
        'duel-sudden-death',
        '决胜',
        model.mode.suddenDeath ? '已进入' : '未进入',
        model.mode.suddenDeath ? '已进入决胜阶段' : '尚未进入决胜阶段',
        model.mode.suddenDeath ? 'warning' : 'normal',
      ),
    ]);
  }
  if (model.mode.kind === 'race') {
    const participant = model.mode.participants.find(
      ({ participantId }) => participantId === model.localParticipant.participantId,
    );
    if (!participant) throw new RangeError('Arena V2 HUD竞速投影缺少本地参与者。');
    const statusText = participantStatusText(participant.status);
    const routeWeaponPractice = participant.routeTarget.kind === 'segment'
      ? raceRouteWeaponPractice(
        model,
        participant.routeTarget.segmentDefinitionId,
        participant.routeTarget.ordinal,
        participant.routeTarget.displayName,
      )
      : null;
    const routeTarget = participant.routeTarget.kind === 'segment'
      ? Object.freeze({
        label: '下一段',
        valueText: `${participant.routeTarget.ordinal}/${model.mode.segmentCount} · `
          + `${arenaV2MapLandmarkCueTextV1(participant.routeTarget.landmarkCue)}`
          + `［${arenaV2MapExperienceBeatTextV1(participant.routeTarget.experienceBeat)}`
          + `${participant.routeTarget.experienceIntensity}］`
          + (routeWeaponPractice === null ? '' : ` · ${routeWeaponPractice.visibleText}`),
        accessibilityText: `当前地图${model.mode.mapDisplayName}，已通过${participant.completedSegmentCount}段；`
          + `下一段是第${participant.routeTarget.ordinal}段${participant.routeTarget.displayName}。`
          + `节奏${arenaV2MapExperienceBeatTextV1(participant.routeTarget.experienceBeat)}`
          + `，强度${participant.routeTarget.experienceIntensity}，`
          + `地标${arenaV2MapLandmarkCueTextV1(participant.routeTarget.landmarkCue)}。`
          + `练习提示：${participant.routeTarget.lesson}。`
          + `记忆点：${participant.routeTarget.memoryHook}`
          + (routeWeaponPractice === null ? '' : `。${routeWeaponPractice.accessibilityText}`),
        emphasis: 'normal' as const,
      })
      : participant.routeTarget.kind === 'finish-gate'
        ? Object.freeze({
          label: '下一目标',
          valueText: `终点 · ${model.mode.segmentCount}/${model.mode.segmentCount}`,
          accessibilityText: `当前地图${model.mode.mapDisplayName}的全部路段已经通过，下一目标是终点。`,
          emphasis: 'strong' as const,
        })
        : Object.freeze({
          label: '路线',
          valueText: `已完成 · ${model.mode.segmentCount}/${model.mode.segmentCount}`,
          accessibilityText: `已经完成地图${model.mode.mapDisplayName}的全部${model.mode.segmentCount}个路段。`,
          emphasis: 'strong' as const,
        });
    return Object.freeze([
      identityFact,
      Object.freeze({
        id: 'race-map',
        label: '地图',
        valueText: model.mode.mapDisplayName,
        accessibilityText: `当前地图${model.mode.mapDisplayName}，共${model.mode.segmentCount}个路段`,
        fixedWidthNumeric: false,
        emphasis: 'normal' as const,
      }),
      fact(
        'race-rank',
        '名次/状态',
        `${participant.rank === null ? '--' : `#${participant.rank}`} · ${statusText}`,
        `${participant.rank === null ? '当前没有名次' : `当前第${participant.rank}名`}，`
          + `竞速状态${statusText}`,
        participant.status === 'respawning'
          ? 'warning'
          : participant.rank === 1 ? 'strong' : 'normal',
      ),
      Object.freeze({
        id: 'race-route-target',
        label: routeTarget.label,
        valueText: routeTarget.valueText,
        accessibilityText: routeTarget.accessibilityText,
        fixedWidthNumeric: false,
        emphasis: routeTarget.emphasis,
      }),
    ]);
  }
  const supplyCadence = model.supplyCadence;
  if (supplyCadence === null) {
    throw new RangeError('Arena V2 HUD生存模式缺少权威下一批供给节奏。');
  }
  return Object.freeze([
    fact(
      'survival-time',
      '生存',
      elapsedClockText(model.mode.survivedTicks),
      `已经生存${Math.floor(model.mode.survivedTicks / HUD_TICK_RATE_HZ)}秒`,
      'strong',
    ),
    fact(
      'survival-next-supply',
      '下一批',
      `${supplyCadence.spawnCount}把 · ${shortCountdownText(supplyCadence.remainingTicks)}`,
      `下一批${supplyCadence.spawnCount}把武器将在${accessibleCountdownText(supplyCadence.remainingTicks)}后刷新`,
      supplyCadence.remainingTicks <= 180 ? 'warning' : 'normal',
    ),
    fact(
      'survival-pressure',
      '压力',
      `S${model.mode.pressureStage}`,
      `当前压力阶段${model.mode.pressureStage}`,
    ),
    fact(
      'survival-enemies',
      '敌人',
      String(model.mode.activeEnemyCount),
      `当前敌人${model.mode.activeEnemyCount}个`,
    ),
    fact(
      'survival-falls',
      '掉落',
      `${model.mode.fallCount}/${model.mode.terminalFallCount}`,
      `已经掉落${model.mode.fallCount}次，共${model.mode.terminalFallCount}次结束`,
      model.mode.fallCount > 0 ? 'warning' : 'normal',
    ),
  ]);
}

function supplyCueCopy(
  model: ArenaV2ModeHudViewModelV1,
  cue: ArenaV2ModeHudViewModelV1['supplyFeedbackCues'][number],
): Readonly<{
  title: string;
  explanation: string;
  visualCue: string;
  audioCue: string;
  emphasis: 'normal' | 'strong' | 'warning';
}> {
  const publicIdentity = cue.participantId === null
    ? null
    : model.participantIdentities.find(({ participantId }) => participantId === cue.participantId);
  const actor = cue.participantId === null
    ? null
    : cue.participantId === model.localParticipant.participantId
      ? '你'
      : publicIdentity == null
        ? cue.participantId
        : `${publicIdentity.displayName} [${publicIdentity.identityOrdinal}]`;
  const weapon = `${arenaV2WeaponDisplayNameV1(cue.collectionEquipmentDefinitionId)}`
    + ` · Lv.${cue.survivalLevel}`;
  const operation = weaponOperationRead(cue.collectionEquipmentDefinitionId);
  const localPickup = cue.participantId === model.localParticipant.participantId;
  const pickupLearning = localPickup
    ? `${localPickupMapLearning(model, cue.collectionEquipmentDefinitionId)}`
      + `。操作：${operation.accessibilityText}。地面：${operation.groundResult}`
      + ` 空中：${operation.aerialResult}`
    : '';
  if (cue.kind === 'spawned') return Object.freeze({
    title: `${weapon}已刷新`,
    explanation: `${weapon}已出现在地图供给点，靠近即可拾取替换。`,
    visualCue: 'supply-spawned',
    audioCue: 'supply-spawned',
    emphasis: 'strong',
  });
  if (cue.kind === 'picked-up') return Object.freeze({
    title: `${actor ?? '玩家'}已拾取${weapon}`,
    explanation: localPickup
      ? pickupLearning
      : `${weapon}已成为${actor ?? '该玩家'}的当前武器。`,
    visualCue: 'supply-picked-up',
    audioCue: 'supply-picked-up',
    emphasis: 'normal',
  });
  if (cue.kind === 'replaced') return Object.freeze({
    title: `${actor ?? '玩家'}已换成${weapon}`,
    explanation: localPickup
      ? `旧武器已替换。${pickupLearning}`
      : `旧武器已被${weapon}替换，本局只保留当前持有武器。`,
    visualCue: 'supply-replaced',
    audioCue: 'supply-replaced',
    emphasis: 'strong',
  });
  return Object.freeze({
    title: `${weapon}已消失`,
    explanation: `${weapon}未被拾取，权威生命周期已经结束。`,
    visualCue: 'supply-expired',
    audioCue: 'supply-expired',
    emphasis: 'warning',
  });
}

/**
 * Converts already-audited authority facts into stable labels. Preference
 * flags only select presentation fallbacks and never change match state.
 */
export function createArenaV2ModeHudRenderModelV1(
  model: ArenaV2ModeHudViewModelV1,
  preferenceValue: unknown,
): ArenaV2ModeHudRenderModelV1 {
  if (model.schemaVersion !== 1) {
    throw new RangeError('Arena V2 HUD RenderModel只支持HUD ViewModel schema 1。');
  }
  if (model.supplyMarkers.length > 3) {
    throw new RangeError('Arena V2 HUD最多显示3个权威供给。');
  }
  const preferenceSnapshot = preferences(preferenceValue);
  const presentationProfile = modePresentation(model.mode.kind);
  const feedbackItems: ArenaV2ModeHudFeedbackItemV1[] = [
    ...model.weaponFeedbackEvents.map((event) => {
      const copy = projectArenaV2ModeHudWeaponFeedbackCopyV1(
        weaponFeedbackCopyContext(model),
        event,
      );
      return Object.freeze({
        sourceEventId: event.sourceEventId,
        tick: event.tick,
        sequence: event.sequence,
        category: 'weapon' as const,
        anchorParticipantId: event.targetId ?? event.attackerId,
        attackerParticipantId: event.attackerId,
        targetParticipantId: event.targetId,
        anchorWorldPosition: null,
        actionDefinitionId: event.action,
        perspective: weaponFeedbackPerspective(model, event),
        title: copy.title,
        explanation: copy.explanation,
        emphasis: projectArenaV2ModeHudWeaponFeedbackEmphasisV1(
          weaponFeedbackCopyContext(model),
          event,
        ),
        visualCue: event.visualCue,
        audioCue: event.audioCue,
        motionPolicy: 'standard' as const,
      });
    }),
    ...model.supplyFeedbackCues.map((cue) => {
      const copy = supplyCueCopy(model, cue);
      const marker = model.supplyMarkers.find(({ supplyId }) => supplyId === cue.supplyId);
      return Object.freeze({
        sourceEventId: cue.id,
        tick: cue.tick,
        sequence: cue.sequenceEnd,
        category: 'supply' as const,
        anchorParticipantId: cue.participantId,
        attackerParticipantId: null,
        targetParticipantId: null,
        anchorWorldPosition: marker?.position ?? null,
        actionDefinitionId: null,
        perspective: supplyFeedbackPerspective(model, cue),
        title: copy.title,
        explanation: copy.explanation,
        emphasis: copy.emphasis,
        visualCue: copy.visualCue,
        audioCue: copy.audioCue,
        motionPolicy: 'standard' as const,
      });
    }),
    ...model.modeFeedbackEvents.map((event) => Object.freeze({
      sourceEventId: event.sourceEventId,
      tick: event.tick,
      sequence: event.sequence,
      category: 'mode' as const,
      anchorParticipantId: event.anchorParticipantId,
      attackerParticipantId: null,
      targetParticipantId: null,
      anchorWorldPosition: null,
      actionDefinitionId: null,
      perspective: modeFeedbackPerspective(model, event),
      title: event.title,
      explanation: event.explanation,
      emphasis: event.emphasis,
      visualCue: event.visualCue,
      audioCue: event.audioCue,
      motionPolicy: 'standard' as const,
    })),
  ];
  feedbackItems.sort((left, right) => (
    left.tick - right.tick
    || left.sequence - right.sequence
    || (left.sourceEventId < right.sourceEventId
      ? -1
      : left.sourceEventId > right.sourceEventId ? 1 : 0)
  ));
  return Object.freeze({
    schemaVersion: ARENA_V2_MODE_HUD_RENDER_MODEL_V1_SCHEMA_VERSION,
    tick: model.tick,
    modeDefinitionId: model.modeDefinitionId,
    modeKind: model.mode.kind,
    modePresentation: presentationProfile,
    phase: model.phase,
    preferences: preferenceSnapshot,
    participantIdentities: model.participantIdentities,
    primaryTimer: fact(
      'match-remaining',
      presentationProfile.timerLabel,
      countdownClockText(model.remainingTicks),
      `本局剩余${accessibleCountdownText(model.remainingTicks)}`,
      model.remainingTicks <= 600 ? 'warning' : 'strong',
    ),
    preparationTimer: model.preparationRemainingTicks === null
      ? null
      : fact(
        'preparation-remaining',
        '准备',
        shortCountdownText(model.preparationRemainingTicks),
        `准备阶段剩余${accessibleCountdownText(model.preparationRemainingTicks)}`,
        'strong',
      ),
    localFacts: localFacts(model),
    modeFacts: modeFacts(model),
    supplyItems: Object.freeze(model.supplyMarkers.map((supply) => Object.freeze({
      supplyId: supply.supplyId,
      slotId: supply.slotId,
      collectionEquipmentDefinitionId: supply.collectionEquipmentDefinitionId,
      displayName: arenaV2WeaponDisplayNameV1(supply.collectionEquipmentDefinitionId),
      coreVerbText: weaponCoreVerbText(supply.collectionEquipmentDefinitionId),
      runtimeEquipmentDefinitionId: supply.runtimeEquipmentDefinitionId,
      survivalLevel: supply.survivalLevel,
      remainingTicks: supply.remainingTicks,
      remainingTickText: shortCountdownText(supply.remainingTicks),
      worldPosition: supply.position,
      accessibilityText: `${arenaV2WeaponDisplayNameV1(supply.collectionEquipmentDefinitionId)}，核心用途${weaponCoreVerbText(supply.collectionEquipmentDefinitionId)}，等级${supply.survivalLevel}，${accessibleCountdownText(supply.remainingTicks)}后消失`,
    }))),
    feedbackItems: Object.freeze(feedbackItems),
    supplyResyncReady: model.supplyResyncReady,
    result: model.result,
  });
}
