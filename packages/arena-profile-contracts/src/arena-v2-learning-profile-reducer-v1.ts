import { assertIntegerAtLeast } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  createArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningModeKindV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2WeaponLearningContextV1,
} from './arena-v2-learning-profile-definition-v1.js';
import {
  createArenaV2LearningGrantV1,
  getArenaV2LearningResultGrantIdV1,
  type ArenaV2LearningGrantV1,
} from './arena-v2-learning-grant-v1.js';
import {
  createArenaV2LearningProfileV1,
  type ArenaV2ChallengeLearningRecordV1,
  type ArenaV2LearningProfileV1,
  type ArenaV2MapSegmentMasteryRecordV1,
  type ArenaV2ModeLearningRecordV1,
  type ArenaV2WeaponContextMasteryV1,
  type ArenaV2WeaponMasteryRecordV1,
} from './arena-v2-learning-profile-v1.js';

export type ArenaV2LearningProgressKindV1 =
  | 'weapon-collected'
  | 'weapon-collection-research'
  | 'map-collected'
  | 'weapon-context'
  | 'map-segment'
  | 'mode-mastery'
  | 'challenge'
  | 'personal-best'
  | 'statistics';

export interface ArenaV2MapRouteEvidenceDeltaV1 {
  readonly mapDefinitionId: string;
  readonly completionEvidenceDelta: number;
}

export interface ArenaV2MapSegmentEvidenceAppliedDeltaV1 {
  readonly mapDefinitionId: string;
  readonly segmentDefinitionId: string;
  readonly completionEvidenceDelta: number;
}

export interface ArenaV2WeaponContextEvidenceAppliedDeltaV1 {
  readonly weaponDefinitionId: string;
  readonly context: ArenaV2WeaponLearningContextV1;
  readonly evidenceDelta: number;
}

export interface ArenaV2ChallengeProgressAppliedDeltaV1 {
  readonly challengeDefinitionId: string;
  readonly progressDelta: number;
}

export interface ArenaV2ModeCompletionAppliedDeltaV1 {
  readonly modeDefinitionId: string;
  readonly completionCountDelta: number;
}

export interface ArenaV2LearningCommitOutcomeV1 {
  readonly committed: boolean;
  readonly duplicate: boolean;
  readonly effectiveLearningProgress: boolean;
  readonly progressKinds: readonly ArenaV2LearningProgressKindV1[];
  readonly researchedWeaponDefinitionId: string | null;
  readonly weaponContextEvidenceDeltas:
    readonly ArenaV2WeaponContextEvidenceAppliedDeltaV1[];
  readonly mapSegmentEvidenceDeltas: readonly ArenaV2MapSegmentEvidenceAppliedDeltaV1[];
  readonly mapRouteEvidenceDeltas: readonly ArenaV2MapRouteEvidenceDeltaV1[];
  readonly modeCompletionDeltas: readonly ArenaV2ModeCompletionAppliedDeltaV1[];
  readonly challengeProgressDeltas: readonly ArenaV2ChallengeProgressAppliedDeltaV1[];
  readonly newlyCollectedWeaponDefinitionIds: readonly string[];
  readonly newlyCollectedMapDefinitionIds: readonly string[];
  readonly profile: ArenaV2LearningProfileV1;
  readonly grant: ArenaV2LearningGrantV1;
}

function addBounded(current: number, delta: number, maximum: number): number {
  if (delta > maximum - current) return maximum;
  return current + delta;
}

function betterTicks(
  kind: ArenaV2LearningModeKindV1,
  current: number | null,
  candidate: number | null,
): number | null {
  if (candidate === null) return current;
  if (current === null) return candidate;
  return kind === 'survival' ? Math.max(current, candidate) : Math.min(current, candidate);
}

function emptyContexts(): readonly ArenaV2WeaponContextMasteryV1[] {
  return Object.freeze(ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.map((context) => Object.freeze({
    context,
    evidenceCount: 0,
    completedAtRevision: null,
  })));
}

function weaponRecord(
  records: Map<string, ArenaV2WeaponMasteryRecordV1>,
  weaponDefinitionId: string,
): ArenaV2WeaponMasteryRecordV1 {
  return records.get(weaponDefinitionId) ?? Object.freeze({
    weaponDefinitionId,
    useCount: 0,
    contexts: emptyContexts(),
  });
}

function contextDelta(
  grant: ArenaV2LearningGrantV1['weaponDeltas'][number],
  context: ArenaV2WeaponLearningContextV1,
): number {
  return grant.contextEvidence.find((entry) => entry.context === context)?.evidenceDelta ?? 0;
}

function updateWeapon(
  definition: ArenaV2LearningProfileDefinitionV1,
  current: ArenaV2WeaponMasteryRecordV1,
  delta: ArenaV2LearningGrantV1['weaponDeltas'][number],
  nextRevision: number,
  progressKinds: Set<ArenaV2LearningProgressKindV1>,
): ArenaV2WeaponMasteryRecordV1 {
  const useCount = addBounded(
    current.useCount,
    delta.useCountDelta,
    definition.masteryRequirements.weaponCollectionUseEvidence,
  );
  if (useCount !== current.useCount) progressKinds.add('weapon-collection-research');
  const contexts = current.contexts.map((entry) => {
    const required = definition.masteryRequirements.weaponContextEvidence[entry.context];
    const evidenceCount = addBounded(
      entry.evidenceCount,
      contextDelta(delta, entry.context),
      required,
    );
    if (evidenceCount !== entry.evidenceCount) progressKinds.add('weapon-context');
    return Object.freeze({
      context: entry.context,
      evidenceCount,
      completedAtRevision: entry.completedAtRevision
        ?? (evidenceCount === required ? nextRevision : null),
    });
  });
  return Object.freeze({
    weaponDefinitionId: current.weaponDefinitionId,
    useCount,
    contexts: Object.freeze(contexts),
  });
}

function updateMapSegment(
  definition: ArenaV2LearningProfileDefinitionV1,
  current: ArenaV2MapSegmentMasteryRecordV1,
  delta: ArenaV2LearningGrantV1['mapSegmentDeltas'][number],
  nextRevision: number,
  progressKinds: Set<ArenaV2LearningProgressKindV1>,
): ArenaV2MapSegmentMasteryRecordV1 {
  const required = definition.masteryRequirements.mapSegmentCompletionEvidence;
  const completionEvidenceCount = addBounded(
    current.completionEvidenceCount,
    delta.completionEvidenceDelta,
    required,
  );
  if (completionEvidenceCount !== current.completionEvidenceCount) progressKinds.add('map-segment');
  const bestRaceFinishTicks = delta.raceFinishTicksCandidate === null
    ? current.bestRaceFinishTicks
    : current.bestRaceFinishTicks === null
      ? delta.raceFinishTicksCandidate
      : Math.min(current.bestRaceFinishTicks, delta.raceFinishTicksCandidate);
  const bestSurvivalTicks = delta.survivalTicksCandidate === null
    ? current.bestSurvivalTicks
    : Math.max(current.bestSurvivalTicks ?? 0, delta.survivalTicksCandidate);
  if (bestRaceFinishTicks !== current.bestRaceFinishTicks
    || bestSurvivalTicks !== current.bestSurvivalTicks) {
    progressKinds.add('personal-best');
  }
  return Object.freeze({
    mapDefinitionId: current.mapDefinitionId,
    segmentDefinitionId: current.segmentDefinitionId,
    completionEvidenceCount,
    completedAtRevision: current.completedAtRevision
      ?? (completionEvidenceCount === required ? nextRevision : null),
    bestRaceFinishTicks,
    bestSurvivalTicks,
  });
}

function emptyModeRecord(
  definition: ArenaV2LearningProfileDefinitionV1,
  modeDefinitionId: string,
): ArenaV2ModeLearningRecordV1 {
  const mode = definition.modeDefinitions.find((entry) => entry.modeDefinitionId === modeDefinitionId);
  if (!mode) throw new RangeError('Learning reducer缺少Mode Definition。');
  return Object.freeze({
    modeDefinitionId,
    kind: mode.kind,
    playCount: 0,
    completionCount: 0,
    winCount: 0,
    completedAtRevision: null,
    bestPerformanceTicks: null,
  });
}

function updateMode(
  definition: ArenaV2LearningProfileDefinitionV1,
  current: ArenaV2ModeLearningRecordV1,
  delta: ArenaV2LearningGrantV1['modeDelta'],
  nextRevision: number,
  progressKinds: Set<ArenaV2LearningProgressKindV1>,
): ArenaV2ModeLearningRecordV1 {
  const maximum = definition.limits.maxCounterValue;
  const playCount = addBounded(current.playCount, delta.playCountDelta, maximum);
  const completionCount = addBounded(current.completionCount, delta.completionCountDelta, maximum);
  const winCount = addBounded(current.winCount, delta.winCountDelta, maximum);
  if (playCount !== current.playCount || winCount !== current.winCount) progressKinds.add('statistics');
  if (completionCount !== current.completionCount
    && current.completionCount < definition.masteryRequirements.modeCompletionEvidence) {
    progressKinds.add('mode-mastery');
  }
  const bestPerformanceTicks = betterTicks(
    current.kind,
    current.bestPerformanceTicks,
    delta.bestPerformanceTicksCandidate,
  );
  if (bestPerformanceTicks !== current.bestPerformanceTicks) progressKinds.add('personal-best');
  return Object.freeze({
    modeDefinitionId: current.modeDefinitionId,
    kind: current.kind,
    playCount,
    completionCount,
    winCount,
    completedAtRevision: current.completedAtRevision
      ?? (completionCount >= definition.masteryRequirements.modeCompletionEvidence
        ? nextRevision
        : null),
    bestPerformanceTicks,
  });
}

/**
 * Applies one immutable, authority-linked learning grant. This reducer never
 * emits combat configuration and cannot alter lives, speed, knockback or cooldown.
 */
export function advanceArenaV2LearningProfileV1(
  definitionValue: unknown,
  currentValue: unknown,
  grantValue: unknown,
  expectedRevisionValue: unknown,
): ArenaV2LearningCommitOutcomeV1 {
  const definition = createArenaV2LearningProfileDefinitionV1(definitionValue);
  const current = createArenaV2LearningProfileV1(definition, currentValue);
  const grant = createArenaV2LearningGrantV1(definition, grantValue);
  const expectedRevision = assertIntegerAtLeast(
    expectedRevisionValue,
    0,
    'ArenaV2LearningProfile expectedRevision',
  );
  const resultGrantId = getArenaV2LearningResultGrantIdV1(grant.grantId);
  const committedResultGrantId = current.committedGrantIds.find((grantId) => (
    getArenaV2LearningResultGrantIdV1(grantId) === resultGrantId
  ));
  if (committedResultGrantId !== undefined) {
    if (committedResultGrantId !== grant.grantId) {
      throw new RangeError('同一Learning Result已绑定不同Replay结算身份，拒绝重复写入。');
    }
    return Object.freeze({
      committed: false,
      duplicate: true,
      effectiveLearningProgress: false,
      progressKinds: Object.freeze([]),
      researchedWeaponDefinitionId: null,
      weaponContextEvidenceDeltas: Object.freeze([]),
      mapSegmentEvidenceDeltas: Object.freeze([]),
      mapRouteEvidenceDeltas: Object.freeze([]),
      modeCompletionDeltas: Object.freeze([]),
      challengeProgressDeltas: Object.freeze([]),
      newlyCollectedWeaponDefinitionIds: Object.freeze([]),
      newlyCollectedMapDefinitionIds: Object.freeze([]),
      profile: current,
      grant,
    });
  }
  if (current.revision !== expectedRevision) {
    throw new RangeError('ArenaV2LearningProfile revision CAS 冲突。');
  }
  if (current.committedGrantIds.length >= definition.limits.maxCommittedGrantIds) {
    throw new RangeError('ArenaV2LearningProfile 幂等grant记录已满，拒绝部分写入。');
  }
  const nextRevision = current.revision + 1;
  if (!Number.isSafeInteger(nextRevision) || nextRevision > definition.limits.maxCounterValue) {
    throw new RangeError('ArenaV2LearningProfile revision 超出上限。');
  }
  const progressKinds = new Set<ArenaV2LearningProgressKindV1>();
  const newlyCollectedMapDefinitionIds = Object.freeze(
    grant.collectedMapDefinitionIds.filter(
      (id) => !current.collections.mapDefinitionIds.includes(id),
    ).sort(),
  );
  const weaponCollection = new Set(current.collections.weaponDefinitionIds);
  const mapCollection = new Set(current.collections.mapDefinitionIds);
  for (const id of grant.collectedMapDefinitionIds) {
    if (!mapCollection.has(id)) progressKinds.add('map-collected');
    mapCollection.add(id);
  }
  if (mapCollection.size > definition.limits.maxCollectedMapIds) {
    throw new RangeError('ArenaV2LearningProfile 收藏上限不足，拒绝部分写入。');
  }

  const weaponRecords = new Map(
    current.weaponMastery.map((entry) => [entry.weaponDefinitionId, entry]),
  );
  const weaponContextEvidenceDeltas: ArenaV2WeaponContextEvidenceAppliedDeltaV1[] = [];
  for (const delta of grant.weaponDeltas) {
    const currentRecord = weaponRecord(weaponRecords, delta.weaponDefinitionId);
    const updatedRecord = updateWeapon(
      definition,
      currentRecord,
      delta,
      nextRevision,
      progressKinds,
    );
    weaponRecords.set(delta.weaponDefinitionId, updatedRecord);
    for (const context of ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1) {
      const previous = currentRecord.contexts.find((entry) => entry.context === context)!;
      const currentContext = updatedRecord.contexts.find((entry) => entry.context === context)!;
      const evidenceDelta = currentContext.evidenceCount - previous.evidenceCount;
      if (evidenceDelta > 0) {
        weaponContextEvidenceDeltas.push(Object.freeze({
          weaponDefinitionId: delta.weaponDefinitionId,
          context,
          evidenceDelta,
        }));
      }
    }
  }
  if (weaponRecords.size > definition.limits.maxWeaponMasteryRecords) {
    throw new RangeError('武器熟练记录上限不足，拒绝部分写入。');
  }
  const newlyCollectedWeaponDefinitionIds: string[] = [];
  for (const id of grant.collectedWeaponDefinitionIds) {
    const record = weaponRecords.get(id);
    if (record === undefined) {
      throw new RangeError('武器收藏候选必须携带同grant有效研究记录。');
    }
    if (record.useCount < definition.masteryRequirements.weaponCollectionUseEvidence) continue;
    if (!weaponCollection.has(id)) {
      weaponCollection.add(id);
      newlyCollectedWeaponDefinitionIds.push(id);
      progressKinds.add('weapon-collected');
    }
  }
  if (weaponCollection.size > definition.limits.maxCollectedWeaponIds) {
    throw new RangeError('ArenaV2LearningProfile 武器收藏上限不足，拒绝部分写入。');
  }

  const mapRecords = new Map(current.mapSegmentMastery.map((entry) => [
    `${entry.mapDefinitionId}\u0000${entry.segmentDefinitionId}`,
    entry,
  ]));
  const mapSegmentEvidenceDeltas: ArenaV2MapSegmentEvidenceAppliedDeltaV1[] = [];
  const mapRouteEvidenceDeltaByDefinitionId = new Map<string, number>();
  for (const delta of grant.mapSegmentDeltas) {
    const key = `${delta.mapDefinitionId}\u0000${delta.segmentDefinitionId}`;
    const currentRecord = mapRecords.get(key) ?? Object.freeze({
      mapDefinitionId: delta.mapDefinitionId,
      segmentDefinitionId: delta.segmentDefinitionId,
      completionEvidenceCount: 0,
      completedAtRevision: null,
      bestRaceFinishTicks: null,
      bestSurvivalTicks: null,
    });
    const updated = updateMapSegment(
      definition,
      currentRecord,
      delta,
      nextRevision,
      progressKinds,
    );
    mapRecords.set(key, updated);
    const effectiveCompletionEvidenceDelta = updated.completionEvidenceCount
      - currentRecord.completionEvidenceCount;
    if (effectiveCompletionEvidenceDelta > 0) {
      mapSegmentEvidenceDeltas.push(Object.freeze({
        mapDefinitionId: delta.mapDefinitionId,
        segmentDefinitionId: delta.segmentDefinitionId,
        completionEvidenceDelta: effectiveCompletionEvidenceDelta,
      }));
      mapRouteEvidenceDeltaByDefinitionId.set(
        delta.mapDefinitionId,
        (mapRouteEvidenceDeltaByDefinitionId.get(delta.mapDefinitionId) ?? 0)
          + effectiveCompletionEvidenceDelta,
      );
    }
  }
  if (mapRecords.size > definition.limits.maxMapSegmentMasteryRecords) {
    throw new RangeError('地图熟练记录上限不足，拒绝部分写入。');
  }

  const modeRecords = new Map(current.modeRecords.map((entry) => [entry.modeDefinitionId, entry]));
  const currentModeRecord = modeRecords.get(grant.modeDelta.modeDefinitionId)
    ?? emptyModeRecord(definition, grant.modeDelta.modeDefinitionId);
  const updatedModeRecord = updateMode(
    definition,
    currentModeRecord,
    grant.modeDelta,
    nextRevision,
    progressKinds,
  );
  modeRecords.set(grant.modeDelta.modeDefinitionId, updatedModeRecord);
  const modeCompletionTarget = definition.masteryRequirements.modeCompletionEvidence;
  const effectiveModeCompletionDelta = Math.min(
    updatedModeRecord.completionCount,
    modeCompletionTarget,
  ) - Math.min(currentModeRecord.completionCount, modeCompletionTarget);
  const modeCompletionDeltas = effectiveModeCompletionDelta === 0
    ? Object.freeze([])
    : Object.freeze([Object.freeze({
      modeDefinitionId: grant.modeDelta.modeDefinitionId,
      completionCountDelta: effectiveModeCompletionDelta,
    })]);
  if (progressKinds.has('mode-mastery') !== (modeCompletionDeltas.length === 1)) {
    throw new Error('模式熟练进度种类与本局实际生效完成增量不一致。');
  }

  const challengeRecords = new Map(
    current.challenges.map((entry) => [entry.challengeDefinitionId, entry]),
  );
  const challengeDefinitions = new Map(
    definition.challengeDefinitions.map((entry) => [entry.challengeDefinitionId, entry]),
  );
  const challengeProgressDeltas: ArenaV2ChallengeProgressAppliedDeltaV1[] = [];
  for (const delta of grant.challengeDeltas) {
    const challenge = challengeDefinitions.get(delta.challengeDefinitionId)!;
    const existing: ArenaV2ChallengeLearningRecordV1 = challengeRecords.get(
      delta.challengeDefinitionId,
    ) ?? Object.freeze({
      challengeDefinitionId: delta.challengeDefinitionId,
      progress: 0,
      completedAtRevision: null,
    });
    const progress = addBounded(existing.progress, delta.progressDelta, challenge.targetProgress);
    const appliedProgressDelta = progress - existing.progress;
    if (appliedProgressDelta > 0) {
      progressKinds.add('challenge');
      challengeProgressDeltas.push(Object.freeze({
        challengeDefinitionId: delta.challengeDefinitionId,
        progressDelta: appliedProgressDelta,
      }));
    }
    challengeRecords.set(delta.challengeDefinitionId, Object.freeze({
      challengeDefinitionId: delta.challengeDefinitionId,
      progress,
      completedAtRevision: existing.completedAtRevision
        ?? (progress === challenge.targetProgress ? nextRevision : null),
    }));
  }

  const profile = createArenaV2LearningProfileV1(definition, {
    ...current,
    revision: nextRevision,
    committedGrantIds: [...current.committedGrantIds, grant.grantId].sort(),
    collections: {
      weaponDefinitionIds: [...weaponCollection].sort(),
      mapDefinitionIds: [...mapCollection].sort(),
    },
    weaponMastery: [...weaponRecords.values()].sort((left, right) => (
      left.weaponDefinitionId < right.weaponDefinitionId ? -1 : 1
    )),
    mapSegmentMastery: [...mapRecords.values()].sort((left, right) => {
      const leftId = `${left.mapDefinitionId}\u0000${left.segmentDefinitionId}`;
      const rightId = `${right.mapDefinitionId}\u0000${right.segmentDefinitionId}`;
      return leftId < rightId ? -1 : 1;
    }),
    modeRecords: [...modeRecords.values()].sort((left, right) => (
      left.modeDefinitionId < right.modeDefinitionId ? -1 : 1
    )),
    challenges: [...challengeRecords.values()].sort((left, right) => (
      left.challengeDefinitionId < right.challengeDefinitionId ? -1 : 1
    )),
  });
  const effectiveKinds = new Set<ArenaV2LearningProgressKindV1>([
    'weapon-collected', 'weapon-collection-research', 'map-collected',
    'weapon-context', 'map-segment',
    'mode-mastery', 'challenge', 'personal-best',
  ]);
  const orderedKinds = Object.freeze([...progressKinds].sort());
  const researchedWeaponDefinitionId = progressKinds.has('weapon-collection-research')
    ? grant.collectedWeaponDefinitionIds[0] ?? null
    : null;
  if (progressKinds.has('weapon-collection-research')
    && researchedWeaponDefinitionId === null) {
    throw new RangeError('武器收藏研究进度缺少本局主研究武器身份。');
  }
  const mapRouteEvidenceDeltas = Object.freeze(
    [...mapRouteEvidenceDeltaByDefinitionId.entries()]
      .sort(([left], [right]) => left < right ? -1 : 1)
      .map(([mapDefinitionId, completionEvidenceDelta]) => Object.freeze({
        mapDefinitionId,
        completionEvidenceDelta,
      })),
  );
  return Object.freeze({
    committed: true,
    duplicate: false,
    effectiveLearningProgress: orderedKinds.some((kind) => effectiveKinds.has(kind)),
    progressKinds: orderedKinds,
    researchedWeaponDefinitionId,
    weaponContextEvidenceDeltas: Object.freeze(weaponContextEvidenceDeltas),
    mapSegmentEvidenceDeltas: Object.freeze(mapSegmentEvidenceDeltas),
    mapRouteEvidenceDeltas,
    modeCompletionDeltas,
    challengeProgressDeltas: Object.freeze(challengeProgressDeltas),
    newlyCollectedWeaponDefinitionIds: Object.freeze(newlyCollectedWeaponDefinitionIds.sort()),
    newlyCollectedMapDefinitionIds,
    profile,
    grant,
  });
}
