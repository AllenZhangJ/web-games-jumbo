import {
  assertKnownKeys,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningProfileV1,
  type ArenaV2LearningModeKindV1,
  type ArenaV2WeaponLearningContextV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  resolveArenaV2MapRouteSegmentFocusV1,
  type ArenaV2MapRouteSegmentFocusV1,
} from './arena-v2-map-route-research-milestone-projection-v1.js';
import { readDataField } from './options.js';

export type ArenaV2NextLearningGoalKindV1 =
  | 'collect-map'
  | 'collect-weapon'
  | 'weapon-context'
  | 'map-segment'
  | 'mode-mastery'
  | 'cross-challenge'
  | 'record-improvement'
  | 'catalog-complete';

export const ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1 = 'catalog-complete' as const;
export const ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1 =
  'active-learning-complete' as const;
export const ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1 =
  'weapon-learning-complete' as const;
export const ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1 =
  'map-learning-complete' as const;

export interface ArenaV2NextLearningGoalV1 {
  readonly schemaVersion: 1;
  readonly profileRevision: number;
  readonly kind: ArenaV2NextLearningGoalKindV1;
  readonly goalId: string;
  readonly question: string;
  readonly actionLabel: string;
  readonly currentProgress: number;
  readonly targetProgress: number;
  readonly weaponDefinitionId: string | null;
  readonly mapDefinitionId: string | null;
  readonly segmentDefinitionId: string | null;
  readonly modeDefinitionId: string | null;
  readonly challengeDefinitionId: string | null;
  readonly context: ArenaV2WeaponLearningContextV1 | null;
  readonly effectiveLearningRequired: boolean;
}

export interface ArenaV2WeaponContextLearningFocusV1 {
  readonly weaponDefinitionId: string;
  readonly context: ArenaV2WeaponLearningContextV1;
  readonly currentProgress: number;
  readonly targetProgress: number;
  readonly practiceInstruction: string;
}

export interface ArenaV2PreparationLearningFocusV1 {
  readonly schemaVersion: 1;
  readonly profileRevision: number;
  readonly modeKind: ArenaV2LearningModeKindV1;
  readonly weaponContextFocus: ArenaV2WeaponContextLearningFocusV1 | null;
  readonly mapSegmentFocus: ArenaV2MapRouteSegmentFocusV1 | null;
}

const OPTION_KEYS = new Set([
  'profileDefinition', 'profile', 'eligibleWeaponDefinitionIds',
]);
const WEAPON_CONTEXT_FOCUS_OPTION_KEYS = new Set([
  'profileDefinition', 'profile', 'weaponDefinitionId',
]);
const MODE_WEAPON_CONTEXT_FOCUS_OPTION_KEYS = new Set([
  'profileDefinition', 'profile', 'weaponDefinitionId', 'modeKind',
]);
const PREPARATION_FOCUS_OPTION_KEYS = new Set([
  'profileDefinition', 'profile', 'modeKind', 'weaponDefinitionId', 'mapDefinitionId',
]);

const MODE_WEAPON_CONTEXTS = Object.freeze({
  duel: Object.freeze(['ground', 'aerial', 'edge', 'duel-counterplay']),
  race: Object.freeze(['ground', 'aerial', 'edge']),
  survival: Object.freeze(['ground', 'aerial', 'edge', 'survival']),
} satisfies Readonly<Record<ArenaV2LearningModeKindV1,
  readonly ArenaV2WeaponLearningContextV1[]>>);

const WEAPON_CONTEXT_PRACTICE_INSTRUCTION = Object.freeze({
  ground: '在地面用这把武器形成一次有效武器反馈',
  aerial: '在空中用这把武器形成一次有效武器反馈',
  edge: '站在边缘支撑面，用这把武器形成命中、落点转移或击落反馈',
  'duel-counterplay': '在常规1v1中完成一次被对手完整避开的攻击窗口',
  survival: '在生存模式中用这把武器形成一次有效武器反馈',
} satisfies Readonly<Record<ArenaV2WeaponLearningContextV1, string>>);

function readGoalOptions(value: unknown): Readonly<{
  readonly profileDefinition: unknown;
  readonly profile: unknown;
  readonly eligibleWeaponDefinitionIds: unknown;
}> {
  const source = assertPlainRecord(value, 'ArenaV2NextLearningGoalV1 options');
  assertKnownKeys(source, OPTION_KEYS, 'ArenaV2NextLearningGoalV1 options');
  return Object.freeze({
    profileDefinition: readDataField(
      source,
      'profileDefinition',
      'ArenaV2NextLearningGoalV1 options',
    ),
    profile: readDataField(source, 'profile', 'ArenaV2NextLearningGoalV1 options'),
    eligibleWeaponDefinitionIds: Object.hasOwn(source, 'eligibleWeaponDefinitionIds')
      ? readDataField(
        source,
        'eligibleWeaponDefinitionIds',
        'ArenaV2NextLearningGoalV1 options',
      )
      : undefined,
  });
}

type GoalFields = Omit<
  ArenaV2NextLearningGoalV1,
  'schemaVersion' | 'profileRevision' | 'effectiveLearningRequired'
>;

function goal(profile: ArenaV2LearningProfileV1, fields: GoalFields): ArenaV2NextLearningGoalV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: profile.revision,
    ...fields,
    effectiveLearningRequired: fields.kind !== 'record-improvement'
      && fields.kind !== 'catalog-complete',
  });
}

function eligibleWeaponDefinitionIds(
  definition: ArenaV2LearningProfileDefinitionV1,
  value: unknown,
): ReadonlySet<string> | null {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError('ArenaV2NextLearningGoalV1 eligibleWeaponDefinitionIds必须是非空数组。');
  }
  const known = new Set(definition.weaponDefinitionIds);
  const eligible = new Set<string>();
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new TypeError(
        `ArenaV2NextLearningGoalV1 eligibleWeaponDefinitionIds[${index}]无效。`,
      );
    }
    if (!known.has(entry)) {
      throw new RangeError(`ArenaV2NextLearningGoalV1包含目录外武器${entry}。`);
    }
    if (eligible.has(entry)) {
      throw new RangeError(`ArenaV2NextLearningGoalV1重复声明武器${entry}。`);
    }
    eligible.add(entry);
  });
  return eligible;
}

interface MapSegmentGoalCandidateV1 {
  readonly mapDefinitionId: string;
  readonly segmentDefinitionId: string;
  readonly currentProgress: number;
  readonly practiceInstruction: string;
}

function leastPracticedMapSegment(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
): MapSegmentGoalCandidateV1 | null {
  let selected: MapSegmentGoalCandidateV1 | null = null;
  for (const map of definition.mapDefinitions) {
    if (!profile.collections.mapDefinitionIds.includes(map.mapDefinitionId)) continue;
    const focus = resolveArenaV2MapRouteSegmentFocusV1({
      evidencePerSegmentTarget: definition.masteryRequirements.mapSegmentCompletionEvidence,
      segments: map.segmentDefinitionIds.map((segmentDefinitionId) => ({
        segmentDefinitionId,
        completionEvidenceCount: profile.mapSegmentMastery.find((entry) => (
          entry.mapDefinitionId === map.mapDefinitionId
          && entry.segmentDefinitionId === segmentDefinitionId
        ))?.completionEvidenceCount ?? 0,
      })),
    });
    if (focus !== null
      && (selected === null || focus.currentProgress < selected.currentProgress)) {
      selected = Object.freeze({
        mapDefinitionId: map.mapDefinitionId,
        segmentDefinitionId: focus.segmentDefinitionId,
        currentProgress: focus.currentProgress,
        practiceInstruction: focus.practiceInstruction,
      });
    }
  }
  return selected;
}

function preferMapRouteLane(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  eligibleWeapons: ReadonlySet<string> | null,
): boolean {
  const weaponIds = definition.weaponDefinitionIds.filter((weaponDefinitionId) => (
    eligibleWeapons === null || eligibleWeapons.has(weaponDefinitionId)
  ));
  const weaponTarget = BigInt(weaponIds.length)
    * BigInt(definition.masteryRequirements.weaponCollectionUseEvidence);
  const weaponEvidence = weaponIds.reduce((total, weaponDefinitionId) => (
    total + BigInt(profile.weaponMastery.find((entry) => (
      entry.weaponDefinitionId === weaponDefinitionId
    ))?.useCount ?? 0)
  ), 0n);
  const mapTarget = definition.mapDefinitions.reduce(
    (total, map) => total + BigInt(map.segmentDefinitionIds.length)
      * BigInt(definition.masteryRequirements.mapSegmentCompletionEvidence),
    0n,
  );
  const mapEvidence = profile.mapSegmentMastery.reduce(
    (total, entry) => total + BigInt(entry.completionEvidenceCount),
    0n,
  );
  if (weaponTarget < 1n || mapTarget < 1n) {
    throw new RangeError('ArenaV2NextLearningGoalV1学习轨道总量必须为正数。');
  }
  // Compare normalized completion without floating point or a new persisted
  // rotation counter. The less-complete lane receives the next visible goal.
  return mapEvidence * weaponTarget <= weaponEvidence * mapTarget;
}

function mapSegmentGoal(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  candidate: MapSegmentGoalCandidateV1,
): ArenaV2NextLearningGoalV1 {
  return goal(profile, {
    kind: 'map-segment',
    goalId: `map-segment:${candidate.mapDefinitionId}:${candidate.segmentDefinitionId}`,
    question: '当前最需要补齐的是哪一段路线？',
    actionLabel: candidate.practiceInstruction,
    currentProgress: candidate.currentProgress,
    targetProgress: definition.masteryRequirements.mapSegmentCompletionEvidence,
    weaponDefinitionId: null,
    mapDefinitionId: candidate.mapDefinitionId,
    segmentDefinitionId: candidate.segmentDefinitionId,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
  });
}

function firstUncoveredModeGoal(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
): ArenaV2NextLearningGoalV1 | null {
  const mode = definition.modeDefinitions.find(({ modeDefinitionId }) => (
    (profile.modeRecords.find((entry) => (
      entry.modeDefinitionId === modeDefinitionId
    ))?.completionCount ?? 0) < 1
  ));
  if (mode === undefined) return null;
  return goal(profile, {
    kind: 'mode-mastery',
    goalId: `mode-first-completion:${mode.modeDefinitionId}`,
    question: '哪一种常驻模式还没有完成过一局？',
    actionLabel: '完成一局该模式，建立第一条模式记录',
    currentProgress: 0,
    targetProgress: 1,
    weaponDefinitionId: null,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: mode.modeDefinitionId,
    challengeDefinitionId: null,
    context: null,
  });
}

function uncollectedWeaponGoal(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  eligibleWeapons: ReadonlySet<string> | null,
): ArenaV2NextLearningGoalV1 | null {
  const weaponDefinitionId = resolveArenaV2UncollectedWeaponResearchFocusV1(
    definition,
    profile,
    eligibleWeapons === null ? undefined : [...eligibleWeapons],
  );
  if (weaponDefinitionId === null) return null;
  const collectionEvidence = profile.weaponMastery.find((entry) => (
    entry.weaponDefinitionId === weaponDefinitionId
  ))?.useCount ?? 0;
  return goal(profile, {
    kind: 'collect-weapon',
    goalId: `collect-weapon:${weaponDefinitionId}`,
    question: '下一把需要持续研究并收入收藏的武器是什么？',
    actionLabel: '在一局中主要使用这把武器',
    currentProgress: collectionEvidence,
    targetProgress: definition.masteryRequirements.weaponCollectionUseEvidence,
    weaponDefinitionId,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
  });
}

function incompleteCollectedWeaponResearchGoal(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  eligibleWeapons: ReadonlySet<string> | null,
): ArenaV2NextLearningGoalV1 | null {
  const targetProgress = definition.masteryRequirements.weaponCollectionUseEvidence;
  const weaponDefinitionId = definition.weaponDefinitionIds.find((candidate) => {
    if (eligibleWeapons !== null && !eligibleWeapons.has(candidate)) return false;
    if (!profile.collections.weaponDefinitionIds.includes(candidate)) return false;
    const currentProgress = profile.weaponMastery.find((entry) => (
      entry.weaponDefinitionId === candidate
    ))?.useCount ?? 0;
    return currentProgress < targetProgress;
  });
  if (weaponDefinitionId === undefined) return null;
  const currentProgress = profile.weaponMastery.find((entry) => (
    entry.weaponDefinitionId === weaponDefinitionId
  ))?.useCount ?? 0;
  return goal(profile, {
    kind: 'collect-weapon',
    goalId: `collect-weapon:${weaponDefinitionId}`,
    question: '下一把仍需完成主研究的武器是什么？',
    actionLabel: '继续在一局中主要使用这把武器',
    currentProgress,
    targetProgress,
    weaponDefinitionId,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
  });
}

function incompleteWeaponContextGoal(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  eligibleWeapons: ReadonlySet<string> | null,
): ArenaV2NextLearningGoalV1 | null {
  for (const weaponDefinitionId of definition.weaponDefinitionIds) {
    if (!profile.collections.weaponDefinitionIds.includes(weaponDefinitionId)) continue;
    if (eligibleWeapons !== null && !eligibleWeapons.has(weaponDefinitionId)) continue;
    const record = profile.weaponMastery.find((entry) => (
      entry.weaponDefinitionId === weaponDefinitionId
    ));
    const focus = weaponContextLearningFocus(definition, record, weaponDefinitionId);
    if (focus !== null) {
      return goal(profile, {
        kind: 'weapon-context',
        goalId: `weapon-context:${weaponDefinitionId}:${focus.context}`,
        question: '这把武器还缺哪一种实战理解？',
        actionLabel: focus.practiceInstruction,
        currentProgress: focus.currentProgress,
        targetProgress: focus.targetProgress,
        weaponDefinitionId,
        mapDefinitionId: null,
        segmentDefinitionId: null,
        modeDefinitionId: null,
        challengeDefinitionId: null,
        context: focus.context,
      });
    }
  }
  return null;
}

function hasIncompleteLearningOutsideEligibleWeaponScope(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  eligibleWeapons: ReadonlySet<string> | null,
): boolean {
  if (eligibleWeapons === null
    || eligibleWeapons.size === definition.weaponDefinitionIds.length) return false;
  for (const weaponDefinitionId of definition.weaponDefinitionIds) {
    if (eligibleWeapons.has(weaponDefinitionId)) continue;
    if (!profile.collections.weaponDefinitionIds.includes(weaponDefinitionId)) return true;
    const record = profile.weaponMastery.find((entry) => (
      entry.weaponDefinitionId === weaponDefinitionId
    ));
    if ((record?.useCount ?? 0)
      < definition.masteryRequirements.weaponCollectionUseEvidence) return true;
    if (ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.some((context) => (
      (record?.contexts.find((entry) => entry.context === context)?.evidenceCount ?? 0)
        < definition.masteryRequirements.weaponContextEvidence[context]
    ))) return true;
  }
  return definition.challengeDefinitions.some((challenge) => (
    challenge.weaponDefinitionId !== null
    && !eligibleWeapons.has(challenge.weaponDefinitionId)
    && (profile.challenges.find((entry) => (
      entry.challengeDefinitionId === challenge.challengeDefinitionId
    ))?.progress ?? 0) < challenge.targetProgress
  ));
}

function weaponContextLearningFocus(
  definition: ArenaV2LearningProfileDefinitionV1,
  record: ArenaV2LearningProfileV1['weaponMastery'][number] | undefined,
  weaponDefinitionId: string,
  allowedContexts: readonly ArenaV2WeaponLearningContextV1[] =
    ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
): ArenaV2WeaponContextLearningFocusV1 | null {
  for (const context of ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1) {
    if (!allowedContexts.includes(context)) continue;
    const currentProgress = record?.contexts.find((entry) => entry.context === context)
      ?.evidenceCount ?? 0;
    const targetProgress = definition.masteryRequirements.weaponContextEvidence[context];
    if (currentProgress >= targetProgress) continue;
    return Object.freeze({
      weaponDefinitionId,
      context,
      currentProgress,
      targetProgress,
      practiceInstruction: WEAPON_CONTEXT_PRACTICE_INSTRUCTION[context],
    });
  }
  return null;
}

export function resolveArenaV2WeaponContextLearningFocusV1(
  value: unknown,
): ArenaV2WeaponContextLearningFocusV1 | null {
  const source = assertPlainRecord(value, 'ArenaV2WeaponContextLearningFocusV1 options');
  assertKnownKeys(
    source,
    WEAPON_CONTEXT_FOCUS_OPTION_KEYS,
    'ArenaV2WeaponContextLearningFocusV1 options',
  );
  const definition = createArenaV2LearningProfileDefinitionV1(readDataField(
    source,
    'profileDefinition',
    'ArenaV2WeaponContextLearningFocusV1 options',
  ));
  const profile = createArenaV2LearningProfileV1(definition, readDataField(
    source,
    'profile',
    'ArenaV2WeaponContextLearningFocusV1 options',
  ));
  const weaponDefinitionId = readDataField(
    source,
    'weaponDefinitionId',
    'ArenaV2WeaponContextLearningFocusV1 options',
  );
  if (typeof weaponDefinitionId !== 'string'
    || !definition.weaponDefinitionIds.includes(weaponDefinitionId)) {
    throw new RangeError('ArenaV2WeaponContextLearningFocusV1武器不在正式学习目录中。');
  }
  const record = profile.weaponMastery.find((entry) => (
    entry.weaponDefinitionId === weaponDefinitionId
  ));
  return weaponContextLearningFocus(definition, record, weaponDefinitionId);
}

export function resolveArenaV2WeaponContextLearningFocusForModeV1(
  value: unknown,
): ArenaV2WeaponContextLearningFocusV1 | null {
  const source = assertPlainRecord(
    value,
    'ArenaV2WeaponContextLearningFocusForModeV1 options',
  );
  assertKnownKeys(
    source,
    MODE_WEAPON_CONTEXT_FOCUS_OPTION_KEYS,
    'ArenaV2WeaponContextLearningFocusForModeV1 options',
  );
  for (const key of MODE_WEAPON_CONTEXT_FOCUS_OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaV2WeaponContextLearningFocusForModeV1 options缺少${key}。`);
    }
  }
  const definition = createArenaV2LearningProfileDefinitionV1(readDataField(
    source,
    'profileDefinition',
    'ArenaV2WeaponContextLearningFocusForModeV1 options',
  ));
  const profile = createArenaV2LearningProfileV1(definition, readDataField(
    source,
    'profile',
    'ArenaV2WeaponContextLearningFocusForModeV1 options',
  ));
  const modeKind = readDataField(
    source,
    'modeKind',
    'ArenaV2WeaponContextLearningFocusForModeV1 options',
  );
  if (modeKind !== 'duel' && modeKind !== 'race' && modeKind !== 'survival') {
    throw new RangeError('ArenaV2WeaponContextLearningFocusForModeV1模式无效。');
  }
  if (!definition.modeDefinitions.some((mode) => mode.kind === modeKind)) {
    throw new RangeError('ArenaV2WeaponContextLearningFocusForModeV1模式不在学习目录中。');
  }
  const weaponDefinitionId = readDataField(
    source,
    'weaponDefinitionId',
    'ArenaV2WeaponContextLearningFocusForModeV1 options',
  );
  if (typeof weaponDefinitionId !== 'string'
    || !definition.weaponDefinitionIds.includes(weaponDefinitionId)) {
    throw new RangeError('ArenaV2WeaponContextLearningFocusForModeV1武器不在学习目录中。');
  }
  const record = profile.weaponMastery.find((entry) => (
    entry.weaponDefinitionId === weaponDefinitionId
  ));
  return weaponContextLearningFocus(
    definition,
    record,
    weaponDefinitionId,
    MODE_WEAPON_CONTEXTS[modeKind],
  );
}

/**
 * Selects only goals that can be evidenced in the chosen mode. Survival keeps
 * weapon focus null because the product starts unarmed and cannot promise a
 * preselected weapon before the authoritative supply flow begins.
 */
export function projectArenaV2PreparationLearningFocusV1(
  value: unknown,
): ArenaV2PreparationLearningFocusV1 {
  const source = assertPlainRecord(value, 'ArenaV2PreparationLearningFocusV1 options');
  assertKnownKeys(
    source,
    PREPARATION_FOCUS_OPTION_KEYS,
    'ArenaV2PreparationLearningFocusV1 options',
  );
  for (const key of PREPARATION_FOCUS_OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaV2PreparationLearningFocusV1 options缺少${key}。`);
    }
  }
  const definition = createArenaV2LearningProfileDefinitionV1(readDataField(
    source,
    'profileDefinition',
    'ArenaV2PreparationLearningFocusV1 options',
  ));
  const profile = createArenaV2LearningProfileV1(definition, readDataField(
    source,
    'profile',
    'ArenaV2PreparationLearningFocusV1 options',
  ));
  const modeKind = readDataField(
    source,
    'modeKind',
    'ArenaV2PreparationLearningFocusV1 options',
  );
  if (modeKind !== 'duel' && modeKind !== 'race' && modeKind !== 'survival') {
    throw new RangeError('ArenaV2PreparationLearningFocusV1模式无效。');
  }
  if (!definition.modeDefinitions.some((mode) => mode.kind === modeKind)) {
    throw new RangeError('ArenaV2PreparationLearningFocusV1模式不在学习目录中。');
  }
  const weaponDefinitionId = readDataField(
    source,
    'weaponDefinitionId',
    'ArenaV2PreparationLearningFocusV1 options',
  );
  if (modeKind === 'survival' && weaponDefinitionId !== null) {
    throw new RangeError('ArenaV2PreparationLearningFocusV1生存准备武器必须为null。');
  }
  if (modeKind !== 'survival'
    && (typeof weaponDefinitionId !== 'string'
      || !definition.weaponDefinitionIds.includes(weaponDefinitionId))) {
    throw new RangeError('ArenaV2PreparationLearningFocusV1武器不在学习目录中。');
  }
  const mapDefinitionId = readDataField(
    source,
    'mapDefinitionId',
    'ArenaV2PreparationLearningFocusV1 options',
  );
  const map = typeof mapDefinitionId === 'string'
    ? definition.mapDefinitions.find((entry) => entry.mapDefinitionId === mapDefinitionId)
    : undefined;
  if (map === undefined) {
    throw new RangeError('ArenaV2PreparationLearningFocusV1地图不在学习目录中。');
  }
  const weaponRecord = typeof weaponDefinitionId === 'string'
    ? profile.weaponMastery.find((entry) => (
      entry.weaponDefinitionId === weaponDefinitionId
    ))
    : undefined;
  const weaponContextFocus = modeKind === 'survival'
    ? null
    : weaponContextLearningFocus(
      definition,
      weaponRecord,
      weaponDefinitionId as string,
      MODE_WEAPON_CONTEXTS[modeKind],
    );
  const mapSegmentFocus = resolveArenaV2MapRouteSegmentFocusV1({
    evidencePerSegmentTarget: definition.masteryRequirements.mapSegmentCompletionEvidence,
    segments: map.segmentDefinitionIds.map((segmentDefinitionId) => ({
      segmentDefinitionId,
      completionEvidenceCount: profile.mapSegmentMastery.find((entry) => (
        entry.mapDefinitionId === map.mapDefinitionId
        && entry.segmentDefinitionId === segmentDefinitionId
      ))?.completionEvidenceCount ?? 0,
    })),
  });
  return Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: profile.revision,
    modeKind,
    weaponContextFocus,
    mapSegmentFocus,
  });
}

function laneCompleteGoal(
  profile: ArenaV2LearningProfileV1,
  lane: 'weapon' | 'map',
): ArenaV2NextLearningGoalV1 {
  return goal(profile, {
    kind: 'catalog-complete',
    goalId: lane === 'weapon'
      ? ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1
      : ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1,
    question: lane === 'weapon'
      ? '武器收藏与实战理解是否已经闭合？'
      : '地图收藏与路线研究是否已经闭合？',
    actionLabel: lane === 'weapon'
      ? '自由选择武器并刷新个人记录'
      : '自由选择地图并刷新路线记录',
    currentProgress: 1,
    targetProgress: 1,
    weaponDefinitionId: null,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
  });
}

export function resolveArenaV2UncollectedWeaponResearchFocusV1(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  eligibleWeaponIds: readonly string[] | undefined = undefined,
): string | null {
  const eligible = eligibleWeaponDefinitionIds(definition, eligibleWeaponIds);
  const weaponMasteryById = new Map(profile.weaponMastery.map((entry) => [
    entry.weaponDefinitionId,
    entry,
  ]));
  return definition.weaponDefinitionIds.reduce<string | null>(
    (selected, weaponDefinitionId) => {
      if (eligible !== null && !eligible.has(weaponDefinitionId)) return selected;
      if (profile.collections.weaponDefinitionIds.includes(weaponDefinitionId)) return selected;
      if (selected === null) return weaponDefinitionId;
      const selectedEvidence = weaponMasteryById.get(selected)?.useCount ?? 0;
      const candidateEvidence = weaponMasteryById.get(weaponDefinitionId)?.useCount ?? 0;
      return candidateEvidence > selectedEvidence ? weaponDefinitionId : selected;
    },
    null,
  );
}

export function resolveArenaV2NextLearningGoalV1(value: unknown): ArenaV2NextLearningGoalV1 {
  const options = readGoalOptions(value);
  const definition = createArenaV2LearningProfileDefinitionV1(options.profileDefinition);
  const profile = createArenaV2LearningProfileV1(definition, options.profile);
  const eligibleWeapons = eligibleWeaponDefinitionIds(
    definition,
    options.eligibleWeaponDefinitionIds,
  );

  const uncollectedMap = definition.mapDefinitions.find(
    ({ mapDefinitionId }) => !profile.collections.mapDefinitionIds.includes(mapDefinitionId),
  );
  if (uncollectedMap) return goal(profile, {
    kind: 'collect-map',
    goalId: `collect-map:${uncollectedMap.mapDefinitionId}`,
    question: '下一张需要熟悉的地图是什么？',
    actionLabel: '竞速亲自冲线，或完成1v1/生存来收藏地图',
    currentProgress: 0,
    targetProgress: 1,
    weaponDefinitionId: null,
    mapDefinitionId: uncollectedMap.mapDefinitionId,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
  });

  const uncoveredModeGoal = firstUncoveredModeGoal(definition, profile);
  if (uncoveredModeGoal !== null) return uncoveredModeGoal;

  const uncollectedWeapon = uncollectedWeaponGoal(definition, profile, eligibleWeapons);
  const mapSegmentCandidate = leastPracticedMapSegment(definition, profile);
  if (mapSegmentCandidate !== null
    && (uncollectedWeapon === null
      || preferMapRouteLane(definition, profile, eligibleWeapons))) {
    return mapSegmentGoal(definition, profile, mapSegmentCandidate);
  }
  if (uncollectedWeapon !== null) return uncollectedWeapon;

  const incompleteCollectedWeaponResearch = incompleteCollectedWeaponResearchGoal(
    definition,
    profile,
    eligibleWeapons,
  );
  if (incompleteCollectedWeaponResearch !== null) {
    return incompleteCollectedWeaponResearch;
  }

  const weaponContextGoal = incompleteWeaponContextGoal(
    definition,
    profile,
    eligibleWeapons,
  );
  if (weaponContextGoal !== null) return weaponContextGoal;

  if (mapSegmentCandidate !== null) {
    return mapSegmentGoal(definition, profile, mapSegmentCandidate);
  }

  for (const mode of definition.modeDefinitions) {
    const record = profile.modeRecords.find((entry) => entry.modeDefinitionId === mode.modeDefinitionId);
    const currentProgress = record?.completionCount ?? 0;
    const targetProgress = definition.masteryRequirements.modeCompletionEvidence;
    if (currentProgress >= targetProgress) continue;
    return goal(profile, {
      kind: 'mode-mastery',
      goalId: `mode-mastery:${mode.modeDefinitionId}`,
      question: '下一种需要建立记录的模式是什么？',
      actionLabel: '完成一局该模式',
      currentProgress,
      targetProgress,
      weaponDefinitionId: null,
      mapDefinitionId: null,
      segmentDefinitionId: null,
      modeDefinitionId: mode.modeDefinitionId,
      challengeDefinitionId: null,
      context: null,
    });
  }

  for (const challenge of definition.challengeDefinitions) {
    if (challenge.weaponDefinitionId !== null
      && eligibleWeapons !== null
      && !eligibleWeapons.has(challenge.weaponDefinitionId)) continue;
    const record = profile.challenges.find((entry) => (
      entry.challengeDefinitionId === challenge.challengeDefinitionId
    ));
    const currentProgress = record?.progress ?? 0;
    if (currentProgress >= challenge.targetProgress) continue;
    return goal(profile, {
      kind: 'cross-challenge',
      goalId: `cross-challenge:${challenge.challengeDefinitionId}`,
      question: '下一项武器、地图和模式交叉目标是什么？',
      actionLabel: challenge.weaponDefinitionId !== null
        && challenge.segmentDefinitionId !== null
        ? '在指定路段用指定武器命中一次'
        : '按指定组合完成一次有效挑战',
      currentProgress,
      targetProgress: challenge.targetProgress,
      weaponDefinitionId: challenge.weaponDefinitionId,
      mapDefinitionId: challenge.mapDefinitionId,
      segmentDefinitionId: challenge.segmentDefinitionId,
      modeDefinitionId: challenge.modeDefinitionId,
      challengeDefinitionId: challenge.challengeDefinitionId,
      context: null,
    });
  }

  const modeMissingComparableRecord = definition.modeDefinitions.find((mode) => (
    profile.modeRecords.find((record) => (
      record.modeDefinitionId === mode.modeDefinitionId
    ))?.bestPerformanceTicks === null
  ));
  if (modeMissingComparableRecord) return goal(profile, {
    kind: 'record-improvement',
    goalId: `record-improvement:${modeMissingComparableRecord.modeDefinitionId}`,
    question: '哪种已掌握模式还缺少可比较的个人记录？',
    actionLabel: '完成一局并建立该模式个人记录',
    currentProgress: 0,
    targetProgress: 1,
    weaponDefinitionId: null,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: modeMissingComparableRecord.modeDefinitionId,
    challengeDefinitionId: null,
    context: null,
  });
  const activeLearningScopeIsPartial = hasIncompleteLearningOutsideEligibleWeaponScope(
    definition,
    profile,
    eligibleWeapons,
  );
  return goal(profile, {
    kind: 'catalog-complete',
    goalId: activeLearningScopeIsPartial
      ? ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1
      : ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
    question: activeLearningScopeIsPartial
      ? '当前已开放学习内容是否已经闭合？'
      : '全部已注册学习目录和模式记录是否已经闭合？',
    actionLabel: activeLearningScopeIsPartial
      ? '自由练习当前开放内容，等待新武器开放'
      : '自由挑战或刷新任意个人记录',
    currentProgress: 1,
    targetProgress: 1,
    weaponDefinitionId: null,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
  });
}

/** Keeps the weapon collection page on its own learning lane. */
export function resolveArenaV2WeaponLearningGoalV1(value: unknown): ArenaV2NextLearningGoalV1 {
  const options = readGoalOptions(value);
  const definition = createArenaV2LearningProfileDefinitionV1(options.profileDefinition);
  const profile = createArenaV2LearningProfileV1(definition, options.profile);
  const eligibleWeapons = eligibleWeaponDefinitionIds(
    definition,
    options.eligibleWeaponDefinitionIds,
  );
  return uncollectedWeaponGoal(definition, profile, eligibleWeapons)
    ?? incompleteCollectedWeaponResearchGoal(definition, profile, eligibleWeapons)
    ?? incompleteWeaponContextGoal(definition, profile, eligibleWeapons)
    ?? laneCompleteGoal(profile, 'weapon');
}

/** Keeps the map collection page on collection first, then route mastery. */
export function resolveArenaV2MapLearningGoalV1(value: unknown): ArenaV2NextLearningGoalV1 {
  const options = readGoalOptions(value);
  const definition = createArenaV2LearningProfileDefinitionV1(options.profileDefinition);
  const profile = createArenaV2LearningProfileV1(definition, options.profile);
  const uncollectedMap = definition.mapDefinitions.find(
    ({ mapDefinitionId }) => !profile.collections.mapDefinitionIds.includes(mapDefinitionId),
  );
  if (uncollectedMap !== undefined) return goal(profile, {
    kind: 'collect-map',
    goalId: `collect-map:${uncollectedMap.mapDefinitionId}`,
    question: '下一张需要熟悉的地图是什么？',
    actionLabel: '竞速亲自冲线，或完成1v1/生存来收藏地图',
    currentProgress: 0,
    targetProgress: 1,
    weaponDefinitionId: null,
    mapDefinitionId: uncollectedMap.mapDefinitionId,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
  });
  const candidate = leastPracticedMapSegment(definition, profile);
  return candidate === null
    ? laneCompleteGoal(profile, 'map')
    : mapSegmentGoal(definition, profile, candidate);
}
