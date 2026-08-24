import type {
  ArenaV2ModeHudFeedbackItemV1,
  ArenaV2ModeHudRenderModelV1,
} from './arena-v2-mode-hud-render-model-v1.js';

export const ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS = Object.freeze({
  retainedItemCount: 12,
  visibleItemCount: 3,
  oneShotAudioCueCount: 8,
  seenIdentityCount: 64,
  normalLifetimeTicks: 120,
  strongLifetimeTicks: 180,
  warningLifetimeTicks: 240,
} as const);

export interface ArenaV2ModeHudFeedbackQueueEntryV1 {
  readonly item: ArenaV2ModeHudFeedbackItemV1;
  readonly expiresAtTick: number;
}

export interface ArenaV2ModeHudFeedbackSeenIdentityV1 {
  readonly sourceEventId: string;
  readonly tick: number;
  readonly sequence: number;
  readonly fingerprint: string;
  readonly announced: boolean;
}

export interface ArenaV2ModeHudFeedbackQueueStateV1 {
  readonly schemaVersion: typeof ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_SCHEMA_VERSION;
  readonly tick: number;
  readonly revision: number;
  readonly entries: readonly ArenaV2ModeHudFeedbackQueueEntryV1[];
  readonly seenIdentities: readonly ArenaV2ModeHudFeedbackSeenIdentityV1[];
}

export interface ArenaV2ModeHudFeedbackQueueProjectionV1 {
  readonly schemaVersion: typeof ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_SCHEMA_VERSION;
  readonly modelTick: number;
  readonly stateRevision: number;
  readonly soundEnabled: boolean;
  readonly visibleItems: readonly ArenaV2ModeHudFeedbackItemV1[];
  readonly liveAnnouncements: readonly string[];
  readonly oneShotAudioCues: readonly Readonly<{
    readonly sourceEventId: string;
    readonly cueId: string;
    readonly actionDefinitionId: string | null;
    readonly emphasis: 'normal' | 'strong' | 'warning';
    readonly voicePriority: 1 | 2 | 3;
  }>[];
  readonly droppedSourceEventIds: readonly string[];
  readonly state: ArenaV2ModeHudFeedbackQueueStateV1;
}

function integerAtLeast(value: number, minimum: number, name: string): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的整数。`);
  }
  return value;
}

function compareItems(
  left: ArenaV2ModeHudFeedbackItemV1,
  right: ArenaV2ModeHudFeedbackItemV1,
): number {
  return left.tick - right.tick
    || left.sequence - right.sequence
    || compareIds(left.sourceEventId, right.sourceEventId);
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function feedbackFingerprint(item: ArenaV2ModeHudFeedbackItemV1): string {
  return JSON.stringify([
    item.sourceEventId,
    item.tick,
    item.sequence,
    item.category,
    item.anchorParticipantId,
    item.attackerParticipantId,
    item.targetParticipantId,
    item.anchorWorldPosition,
    item.actionDefinitionId,
    item.perspective,
    item.title,
    item.explanation,
    item.emphasis,
    item.visualCue,
    item.audioCue,
    item.motionPolicy,
  ]);
}

function emphasisPriority(item: ArenaV2ModeHudFeedbackItemV1): number {
  return item.emphasis === 'warning' ? 3 : item.emphasis === 'strong' ? 2 : 1;
}

function categoryPriority(item: ArenaV2ModeHudFeedbackItemV1): number {
  return item.category === 'mode' ? 3 : item.category === 'weapon' ? 2 : 1;
}

function perspectivePriority(item: ArenaV2ModeHudFeedbackItemV1): number {
  return item.perspective === 'local-involved' ? 3 : item.perspective === 'global' ? 2 : 1;
}

const TERMINAL_MODE_VISUAL_CUES: ReadonlySet<string> = new Set([
  'race-finish-claimed',
  'survival-terminal-fall',
] as const);

const DECISIVE_MODE_VISUAL_CUES: ReadonlySet<string> = new Set([
  'survival-first-fall',
] as const);

function semanticPriority(item: ArenaV2ModeHudFeedbackItemV1): number {
  if (item.category === 'mode' && item.visualCue === 'match-ended') return 6;
  if (item.category === 'mode' && TERMINAL_MODE_VISUAL_CUES.has(item.visualCue)) return 5;
  if (item.category === 'mode'
    && (DECISIVE_MODE_VISUAL_CUES.has(item.visualCue)
      || item.visualCue.startsWith('participant-fell-'))) return 4;
  if (item.category === 'weapon'
    && (item.visualCue === 'ring-out'
      || item.visualCue.includes('.hit-ring-out.'))) return 4;
  if (item.category === 'weapon' && item.emphasis !== 'normal') return 3;
  if (item.category === 'mode' || item.category === 'weapon') return 2;
  return 1;
}

function audioVoicePriority(item: ArenaV2ModeHudFeedbackItemV1): 1 | 2 | 3 {
  const priority = semanticPriority(item);
  return priority >= 4 ? 3 : priority >= 2 ? 2 : 1;
}

function validatePerspective(item: ArenaV2ModeHudFeedbackItemV1): void {
  if (item.perspective !== 'local-involved'
    && item.perspective !== 'global'
    && item.perspective !== 'remote-only') {
    throw new RangeError('Arena V2 HUD Feedback Queue perspective无效。');
  }
}

function validateParticipantIdentities(item: ArenaV2ModeHudFeedbackItemV1): void {
  for (const [name, value] of [
    ['anchorParticipantId', item.anchorParticipantId],
    ['attackerParticipantId', item.attackerParticipantId],
    ['targetParticipantId', item.targetParticipantId],
  ] as const) {
    if (value !== null
      && (typeof value !== 'string' || value.length === 0 || value.trim() !== value)) {
      throw new TypeError(`Arena V2 HUD Feedback Queue ${name}必须为空或非空规范ID。`);
    }
  }
  if (item.category !== 'weapon') {
    if (item.attackerParticipantId !== null || item.targetParticipantId !== null) {
      throw new RangeError('Arena V2 HUD Feedback Queue非武器反馈不得伪造攻防身份。');
    }
    return;
  }
  if (item.anchorParticipantId !== (item.targetParticipantId ?? item.attackerParticipantId)) {
    throw new RangeError('Arena V2 HUD Feedback Queue武器反馈锚点必须服从受击者优先身份。');
  }
}

function lifetimeTicks(item: ArenaV2ModeHudFeedbackItemV1): number {
  return item.emphasis === 'warning'
    ? ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.warningLifetimeTicks
    : item.emphasis === 'strong'
      ? ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.strongLifetimeTicks
      : ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.normalLifetimeTicks;
}

function validateModelFeedback(model: ArenaV2ModeHudRenderModelV1): void {
  integerAtLeast(model.tick, 0, 'Arena V2 HUD Feedback Queue model.tick');
  const identities = new Set<string>();
  let previous: ArenaV2ModeHudFeedbackItemV1 | null = null;
  for (const item of model.feedbackItems) {
    if (item.sourceEventId.length === 0) {
      throw new TypeError('Arena V2 HUD Feedback Queue sourceEventId不能为空。');
    }
    integerAtLeast(item.tick, 0, 'Arena V2 HUD Feedback Queue item.tick');
    integerAtLeast(item.sequence, 0, 'Arena V2 HUD Feedback Queue item.sequence');
    if (item.tick > model.tick) {
      throw new RangeError('Arena V2 HUD Feedback Queue不能消费未来反馈。');
    }
    validatePerspective(item);
    validateParticipantIdentities(item);
    if (identities.has(item.sourceEventId)) {
      throw new RangeError(`Arena V2 HUD Feedback Queue输入ID重复：${item.sourceEventId}。`);
    }
    if (previous !== null && compareItems(previous, item) >= 0) {
      throw new RangeError('Arena V2 HUD Feedback Queue输入必须按tick/sequence/id稳定升序。');
    }
    identities.add(item.sourceEventId);
    previous = item;
  }
}

function validateState(
  state: ArenaV2ModeHudFeedbackQueueStateV1,
  modelTick: number,
): void {
  if (state.schemaVersion !== ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena V2 HUD Feedback Queue只支持state schema 1。');
  }
  integerAtLeast(state.tick, 0, 'Arena V2 HUD Feedback Queue state.tick');
  integerAtLeast(state.revision, 0, 'Arena V2 HUD Feedback Queue state.revision');
  if (state.tick > modelTick) {
    throw new RangeError('Arena V2 HUD Feedback Queue拒绝tick倒退。');
  }
  if (state.entries.length > ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.retainedItemCount) {
    throw new RangeError('Arena V2 HUD Feedback Queue state超出保留上限。');
  }
  if (state.seenIdentities.length > ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.seenIdentityCount) {
    throw new RangeError('Arena V2 HUD Feedback Queue seen identity超出上限。');
  }
  const entryIds = new Set<string>();
  let previousEntry: ArenaV2ModeHudFeedbackQueueEntryV1 | null = null;
  for (const entry of state.entries) {
    if (typeof entry.item.sourceEventId !== 'string'
      || entry.item.sourceEventId.length === 0) {
      throw new TypeError('Arena V2 HUD Feedback Queue state entry身份不能为空。');
    }
    if (entryIds.has(entry.item.sourceEventId)) {
      throw new RangeError('Arena V2 HUD Feedback Queue state entry重复。');
    }
    integerAtLeast(entry.item.tick, 0, 'Arena V2 HUD Feedback Queue state entry.tick');
    integerAtLeast(entry.item.sequence, 0, 'Arena V2 HUD Feedback Queue state entry.sequence');
    if (entry.item.tick > state.tick) {
      throw new RangeError('Arena V2 HUD Feedback Queue state entry不能来自未来tick。');
    }
    integerAtLeast(entry.expiresAtTick, entry.item.tick, 'Arena V2 HUD Feedback Queue expiry');
    if (entry.expiresAtTick !== entry.item.tick + lifetimeTicks(entry.item)) {
      throw new RangeError('Arena V2 HUD Feedback Queue state entry生命周期发生漂移。');
    }
    if (entry.expiresAtTick <= state.tick) {
      throw new RangeError('Arena V2 HUD Feedback Queue state不得保留已过期entry。');
    }
    validatePerspective(entry.item);
    validateParticipantIdentities(entry.item);
    if (previousEntry !== null && compareItems(previousEntry.item, entry.item) >= 0) {
      throw new RangeError('Arena V2 HUD Feedback Queue state entry顺序发生漂移。');
    }
    entryIds.add(entry.item.sourceEventId);
    previousEntry = entry;
  }
  const seenIds = new Set<string>();
  const seenById = new Map<string, ArenaV2ModeHudFeedbackSeenIdentityV1>();
  let previousSeen: ArenaV2ModeHudFeedbackSeenIdentityV1 | null = null;
  for (const seen of state.seenIdentities) {
    if (seenIds.has(seen.sourceEventId)) {
      throw new RangeError('Arena V2 HUD Feedback Queue seen identity重复。');
    }
    integerAtLeast(seen.tick, 0, 'Arena V2 HUD Feedback Queue seen.tick');
    integerAtLeast(seen.sequence, 0, 'Arena V2 HUD Feedback Queue seen.sequence');
    if (seen.tick > state.tick) {
      throw new RangeError('Arena V2 HUD Feedback Queue seen identity不能来自未来tick。');
    }
    if (typeof seen.sourceEventId !== 'string' || seen.sourceEventId.length === 0
      || typeof seen.fingerprint !== 'string' || seen.fingerprint.length === 0) {
      throw new TypeError('Arena V2 HUD Feedback Queue seen identity字段不能为空。');
    }
    if (typeof seen.announced !== 'boolean') {
      throw new TypeError('Arena V2 HUD Feedback Queue seen identity播报状态无效。');
    }
    if (previousSeen !== null && (
      previousSeen.tick > seen.tick
      || (previousSeen.tick === seen.tick && previousSeen.sequence > seen.sequence)
      || (previousSeen.tick === seen.tick && previousSeen.sequence === seen.sequence
        && compareIds(previousSeen.sourceEventId, seen.sourceEventId) >= 0)
    )) {
      throw new RangeError('Arena V2 HUD Feedback Queue seen identity顺序发生漂移。');
    }
    seenIds.add(seen.sourceEventId);
    seenById.set(seen.sourceEventId, seen);
    previousSeen = seen;
  }
  for (const entry of state.entries) {
    const seen = seenById.get(entry.item.sourceEventId);
    if (seen === undefined) {
      throw new RangeError('Arena V2 HUD Feedback Queue active entry必须存在seen identity。');
    }
    if (!sameIdentity(seen, entry.item)) {
      throw new RangeError('Arena V2 HUD Feedback Queue active entry与首次接受身份漂移。');
    }
  }
}

function sameIdentity(
  seen: ArenaV2ModeHudFeedbackSeenIdentityV1,
  item: ArenaV2ModeHudFeedbackItemV1,
): boolean {
  return seen.tick === item.tick
    && seen.sequence === item.sequence
    && seen.fingerprint === feedbackFingerprint(item);
}

function retentionOrder(
  left: ArenaV2ModeHudFeedbackQueueEntryV1,
  right: ArenaV2ModeHudFeedbackQueueEntryV1,
): number {
  return semanticPriority(right.item) - semanticPriority(left.item)
    || perspectivePriority(right.item) - perspectivePriority(left.item)
    || emphasisPriority(right.item) - emphasisPriority(left.item)
    || categoryPriority(right.item) - categoryPriority(left.item)
    || right.item.tick - left.item.tick
    || right.item.sequence - left.item.sequence
    || compareIds(right.item.sourceEventId, left.item.sourceEventId);
}

function displayOrder(
  left: ArenaV2ModeHudFeedbackQueueEntryV1,
  right: ArenaV2ModeHudFeedbackQueueEntryV1,
): number {
  return semanticPriority(right.item) - semanticPriority(left.item)
    || perspectivePriority(right.item) - perspectivePriority(left.item)
    || emphasisPriority(right.item) - emphasisPriority(left.item)
    || categoryPriority(right.item) - categoryPriority(left.item)
    || right.item.tick - left.item.tick
    || right.item.sequence - left.item.sequence
    || compareIds(right.item.sourceEventId, left.item.sourceEventId);
}

function protectsTerminalVisualSlot(item: ArenaV2ModeHudFeedbackItemV1): boolean {
  return item.category === 'mode'
    && (item.visualCue === 'match-ended' || TERMINAL_MODE_VISUAL_CUES.has(item.visualCue));
}

function isLocalWeaponActionFeedback(item: ArenaV2ModeHudFeedbackItemV1): boolean {
  return item.category === 'weapon'
    && item.perspective === 'local-involved'
    && item.actionDefinitionId !== null;
}

function isResolvedLocalWeaponImpact(item: ArenaV2ModeHudFeedbackItemV1): boolean {
  if (!isLocalWeaponActionFeedback(item)) return false;
  return item.visualCue === 'impact-confirm'
    || item.visualCue === 'impact-surface-transfer'
    || item.visualCue === 'ring-out'
    || item.visualCue.includes('.hit-confirm.')
    || item.visualCue.includes('.hit-surface-transfer.')
    || item.visualCue.includes('.hit-ring-out.');
}

function projectVisibleItemForPreferences(
  item: ArenaV2ModeHudFeedbackItemV1,
  reducedMotion: boolean,
): ArenaV2ModeHudFeedbackItemV1 {
  const motionPolicy = reducedMotion ? 'static' as const : 'standard' as const;
  return item.motionPolicy === motionPolicy
    ? item
    : Object.freeze({ ...item, motionPolicy });
}

function selectVisibleEntries(
  entries: readonly ArenaV2ModeHudFeedbackQueueEntryV1[],
): readonly ArenaV2ModeHudFeedbackQueueEntryV1[] {
  const priorityOrder = [...entries].sort(displayOrder);
  const visible = priorityOrder.slice(
    0,
    ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.visibleItemCount,
  );
  const localWeapons = priorityOrder
    .filter(({ item }) => (
      isLocalWeaponActionFeedback(item)
    ))
    .sort((left, right) => (
      Number(isResolvedLocalWeaponImpact(right.item))
      - Number(isResolvedLocalWeaponImpact(left.item))
      || displayOrder(left, right)
    ));
  const preferredLocalWeapon = localWeapons[0];
  const alreadyShowsLocalWeapon = visible.some(({ item }) => (
    isLocalWeaponActionFeedback(item)
  ));
  const alreadyShowsResolvedLocalImpact = visible.some(({ item }) => (
    isResolvedLocalWeaponImpact(item)
  ));
  const needsPreferredLocalWeapon = preferredLocalWeapon !== undefined
    && (!alreadyShowsLocalWeapon
      || (isResolvedLocalWeaponImpact(preferredLocalWeapon.item)
        && !alreadyShowsResolvedLocalImpact));
  if (needsPreferredLocalWeapon) {
    let replaceIndex = -1;
    if (alreadyShowsLocalWeapon && isResolvedLocalWeaponImpact(preferredLocalWeapon.item)) {
      for (let index = visible.length - 1; index >= 0; index -= 1) {
        const item = visible[index]!.item;
        if (isLocalWeaponActionFeedback(item)
          && !isResolvedLocalWeaponImpact(item)) {
          replaceIndex = index;
          break;
        }
      }
    }
    for (let index = visible.length - 1; index >= 0; index -= 1) {
      if (replaceIndex >= 0) break;
      if (!protectsTerminalVisualSlot(visible[index]!.item)) {
        replaceIndex = index;
        break;
      }
    }
    if (replaceIndex >= 0) visible[replaceIndex] = preferredLocalWeapon;
  }
  return Object.freeze(visible.sort((left, right) => compareItems(left.item, right.item)));
}

/**
 * Advances a presentation-only queue using authority tick. It never owns match
 * outcomes and emits audio only for identities first accepted by this state.
 */
export function advanceArenaV2ModeHudFeedbackQueueV1(
  model: ArenaV2ModeHudRenderModelV1,
  previousState: ArenaV2ModeHudFeedbackQueueStateV1 | null,
): ArenaV2ModeHudFeedbackQueueProjectionV1 {
  if (model.schemaVersion !== 1) {
    throw new RangeError('Arena V2 HUD Feedback Queue只支持RenderModel schema 1。');
  }
  validateModelFeedback(model);
  const initialState: ArenaV2ModeHudFeedbackQueueStateV1 = Object.freeze({
    schemaVersion: ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_SCHEMA_VERSION,
    tick: model.tick,
    revision: 0,
    entries: Object.freeze([]),
    seenIdentities: Object.freeze([]),
  });
  const previous = previousState ?? initialState;
  validateState(previous, model.tick);
  const seenById = new Map(
    previous.seenIdentities.map((identity) => [identity.sourceEventId, identity]),
  );
  const accepted: ArenaV2ModeHudFeedbackItemV1[] = [];
  const nextSeen = [...previous.seenIdentities];
  for (const item of model.feedbackItems) {
    const seen = seenById.get(item.sourceEventId);
    if (seen !== undefined) {
      if (!sameIdentity(seen, item)) {
        throw new RangeError(`Arena V2 HUD Feedback Queue ID语义漂移：${item.sourceEventId}。`);
      }
      continue;
    }
    const identity = Object.freeze({
      sourceEventId: item.sourceEventId,
      tick: item.tick,
      sequence: item.sequence,
      fingerprint: feedbackFingerprint(item),
      announced: false,
    });
    nextSeen.push(identity);
    seenById.set(item.sourceEventId, identity);
    accepted.push(item);
  }
  const active = previous.entries.filter(({ expiresAtTick }) => expiresAtTick > model.tick);
  const dropped = previous.entries
    .filter(({ expiresAtTick }) => expiresAtTick <= model.tick)
    .map(({ item }) => item.sourceEventId);
  const candidates = [
    ...active,
    ...accepted.map((item) => Object.freeze({
      item,
      expiresAtTick: item.tick + lifetimeTicks(item),
    })),
  ].filter(({ expiresAtTick, item }) => {
    if (expiresAtTick > model.tick) return true;
    dropped.push(item.sourceEventId);
    return false;
  });
  const retainedByPriority = [...candidates].sort(retentionOrder).slice(
    0,
    ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.retainedItemCount,
  );
  const retainedIds = new Set(retainedByPriority.map(({ item }) => item.sourceEventId));
  for (const candidate of candidates) {
    if (!retainedIds.has(candidate.item.sourceEventId)) dropped.push(candidate.item.sourceEventId);
  }
  const entries = Object.freeze(retainedByPriority.sort((left, right) => (
    compareItems(left.item, right.item)
  )));
  const visibleEntries = selectVisibleEntries(entries);
  const retainedAccepted = accepted.filter(({ sourceEventId }) => retainedIds.has(sourceEventId));
  const visibleIds = new Set(visibleEntries.map(({ item }) => item.sourceEventId));
  const priorityVisibleIds = new Set([...entries].sort(displayOrder).slice(
    0,
    ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.visibleItemCount,
  ).map(({ item }) => item.sourceEventId));
  const firstVisibleEntries = visibleEntries.filter(({ item }) => (
    seenById.get(item.sourceEventId)?.announced === false
  ));
  const firstVisibleIds = new Set(firstVisibleEntries.map(({ item }) => item.sourceEventId));
  const seenAfterAnnouncements = nextSeen.map((identity) => (
    firstVisibleIds.has(identity.sourceEventId)
      ? Object.freeze({ ...identity, announced: true })
      : identity
  ));
  const audibleAccepted = retainedAccepted.filter(({ sourceEventId }) => (
    visibleIds.has(sourceEventId) || priorityVisibleIds.has(sourceEventId)
  ));
  const audibleAcceptedIds = new Set(audibleAccepted.map(({ sourceEventId }) => sourceEventId));
  const localWeaponAudioOverflow = retainedAccepted
    .filter((item) => (
      item.category === 'weapon'
      && item.perspective === 'local-involved'
      && item.actionDefinitionId !== null
      && item.audioCue !== null
      && !audibleAcceptedIds.has(item.sourceEventId)
    ))
    .map((item) => Object.freeze({ item, expiresAtTick: item.tick + lifetimeTicks(item) }))
    .sort(retentionOrder)
    .slice(0, Math.max(
      0,
      ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.oneShotAudioCueCount
        - audibleAccepted.filter(({ audioCue }) => audioCue !== null).length,
    ))
    .map(({ item }) => item);
  const oneShotAudioItems = [...audibleAccepted, ...localWeaponAudioOverflow]
    .sort(compareItems);
  const retainedSeenIds = new Set(entries.map(({ item }) => item.sourceEventId));
  const retainedSeen = seenAfterAnnouncements.filter(({ sourceEventId }) => (
    retainedSeenIds.has(sourceEventId)
  ));
  const historySeen = seenAfterAnnouncements.filter(({ sourceEventId }) => (
    !retainedSeenIds.has(sourceEventId)
  ))
    .sort((left, right) => (
      left.tick - right.tick
      || left.sequence - right.sequence
      || compareIds(left.sourceEventId, right.sourceEventId)
    ))
    .slice(-(
      ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.seenIdentityCount - retainedSeen.length
    ));
  const seenIdentities = Object.freeze([...retainedSeen, ...historySeen].sort((left, right) => (
    left.tick - right.tick
    || left.sequence - right.sequence
    || compareIds(left.sourceEventId, right.sourceEventId)
  )));
  const state = Object.freeze({
    schemaVersion: ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_SCHEMA_VERSION,
    tick: model.tick,
    revision: previous.revision + 1,
    entries,
    seenIdentities,
  });
  return Object.freeze({
    schemaVersion: ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_SCHEMA_VERSION,
    modelTick: model.tick,
    stateRevision: state.revision,
    soundEnabled: model.preferences.soundEnabled,
    visibleItems: Object.freeze(visibleEntries.map(({ item }) => (
      projectVisibleItemForPreferences(item, model.preferences.reducedMotion)
    ))),
    liveAnnouncements: Object.freeze(firstVisibleEntries.map(({ item }) => item.title)),
    oneShotAudioCues: Object.freeze(model.preferences.soundEnabled
      ? oneShotAudioItems.flatMap((item) => item.audioCue === null
        ? []
        : [Object.freeze({
          sourceEventId: item.sourceEventId,
          cueId: item.audioCue,
          actionDefinitionId: item.actionDefinitionId,
          emphasis: item.emphasis,
          voicePriority: audioVoicePriority(item),
        })])
      : []),
    droppedSourceEventIds: Object.freeze([...new Set(dropped)].sort()),
    state,
  });
}

export const ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  usesAuthorityTickOnly: true as const,
  ownsAuthorityState: false as const,
  semanticPriorityOrder: Object.freeze([
    'authoritative-match-ended',
    'terminal-finish-or-fall',
    'decisive-fall-or-ring-out',
    'strong-or-warning-weapon-impact',
    'ordinary-mode-or-weapon-feedback',
    'supply-feedback',
  ] as const),
  sameSemanticPerspectiveOrder: Object.freeze([
    'local-involved',
    'global',
    'remote-only',
  ] as const),
  perspectiveDerivedFromValidatedParticipantIdsBeforeQueue: true as const,
  perspectiveCannotBeChangedByWeaponSpecialization: true as const,
  higherSemanticPriorityCannotBeOverriddenByPerspective: true as const,
  matchEndedAlwaysHighest: true as const,
  localizedCopyDoesNotAffectPriority: true as const,
  visibleAndRetainedLimitsUnchanged: true as const,
  visualEffectCountNotExpanded: true as const,
  oneShotAudioCountBoundedByExistingVoiceLimit: true as const,
  audioVoicePriorityUsesSemanticPriority: true as const,
  audioVoicePriorityDoesNotChangeGainDb: true as const,
  localWeaponAudioCanSurviveVisualCongestion: true as const,
  localWeaponVisualSlotReservedDuringCongestion: true as const,
  localWeaponVisualReservationPrefersResolvedImpactOverEvaded: true as const,
  localWeaponEvadedRemainsEligibleWithoutResolvedImpact: true as const,
  movementFallWithoutActionCannotClaimLocalWeaponVisualReservation: true as const,
  previousStateActiveEntryIdentityRevalidated: true as const,
  previousStateRejectsFutureOrExpiredEntries: true as const,
  previousStateRequiresExactSemanticLifetime: true as const,
  previousStateOrderRevalidated: true as const,
  queuedFeedbackAnnouncedWhenFirstVisible: true as const,
  feedbackAnnouncementIdentityPersistsAcrossVisibilityReentry: true as const,
  liveAnnouncementsRemainOneShot: true as const,
  eventIdentityDoesNotDependOnCurrentPreferenceFallback: true as const,
  retainedVisualsFollowCurrentReducedMotionPreference: true as const,
  enablingSoundDoesNotReplayRetainedFeedback: true as const,
  soundPreferenceForwardedForOwnedAudioStop: true as const,
  terminalVisualSlotsCannotBeDisplacedByReservation: true as const,
  localWeaponVisualReservationExpandsVisibleLimit: false as const,
  displacedPriorityVisualKeepsBoundedAudio: true as const,
  localWeaponAudioOverflowLimit:
    ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.oneShotAudioCueCount,
  maximumConcurrentAudioVoicesUnchanged: true as const,
  validationStatus: 'not-run' as const,
});
