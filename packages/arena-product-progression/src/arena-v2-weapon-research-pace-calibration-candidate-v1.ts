import {
  assertIntegerAtLeast,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  type ArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1,
} from './arena-v2-learning-capacity-report-v1.js';
import {
  projectArenaV2LearningPaceCalibrationCandidateV1,
} from './arena-v2-learning-pace-calibration-candidate-v1.js';
import {
  ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1,
  createArenaV2RetentionObservationV1,
} from './arena-v2-retention-observation-v1.js';
import { readExactOptions } from './options.js';

const OPTION_KEYS = new Set([
  'profileDefinition', 'baselineProfile', 'currentProfile', 'observations', 'window',
]);
const WINDOW_INPUT_KEYS = new Set([
  'profileDefinition', 'baselineProfile', 'cohortSubjectId',
]);
const WINDOW_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSinkWired',
  'profileDefinitionId', 'profileDefinitionContentVersion',
  'profileDefinitionContentHash', 'baselineProfileRevision',
  'cohortSubjectId', 'baselineProfileHash', 'windowIdentityHash',
  'containsRawProfileId', 'containsWallClockTime',
]);
const ACCUMULATED_OPTION_KEYS = new Set([
  'profileDefinition', 'baselineProfile', 'currentProfile', 'window',
  'settledMatchCount', 'measuredSettledMatchCount',
  'missingAuthorityDurationCount', 'totalAuthorityTicks',
  'evidenceThroughProfileRevision', 'catalogCompletionProfileRevision',
]);
const CATALOG_PROGRESS_OPTION_KEYS = new Set(['profileDefinition', 'profile']);
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;

export interface ArenaV2WeaponResearchPaceCalibrationCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-weapon-research-pace-calibration-candidate';
  readonly productionReady: false;
  readonly longitudinalEvidence: 'not-run';
  readonly windowIdentityHash: string;
  readonly baselineProfileRevision: number;
  readonly currentProfileRevision: number;
  readonly evidenceThroughProfileRevision: number;
  readonly catalogCompletionProfileRevision: number | null;
  readonly catalogCompletionPaceEvidenceFrozen: boolean;
  readonly settledMatchCount: number;
  readonly measuredSettledMatchCount: number;
  readonly missingAuthorityDurationCount: number;
  readonly completeAuthorityDurationWindow: boolean;
  readonly observedWeaponResearchPointCount: number;
  readonly observedWeaponResearchPointRate: number | null;
  readonly totalAuthorityTicks: number;
  readonly averageAuthorityMinutesPerResearchPoint: number | null;
  readonly currentMainResearchPoints: number;
  readonly targetMainResearchPoints: number;
  readonly remainingMainResearchPoints: number;
  readonly projectedRemainingWeaponCollectionHoursAtObservedPace: number | null;
  readonly projectedCatalogWeaponCollectionHoursAtObservedPace: number | null;
  readonly projectedCatalogDeltaFromTargetHours: number | null;
  readonly meetsTwoHundredHourObservedWeaponPace: boolean | null;
  readonly observedCatalogCompletionHours: number | null;
  readonly observedCatalogCompletionDeltaFromTargetHours: number | null;
  readonly observedCatalogCompletionMeetsTwoHundredHourTarget: boolean | null;
  readonly observedCatalogCompletionEvidence:
    | 'catalog-incomplete'
    | 'partial-baseline'
    | 'incomplete-authority-duration-window'
    | 'complete-zero-baseline-window';
  readonly projectionKind:
    'profile-delta-and-complete-authority-window-extrapolation';
  readonly addsRetentionMetric: false;
  readonly claimsObservedRetention: false;
  readonly containsWallClockTime: false;
}

export interface ArenaV2WeaponResearchPaceCalibrationWindowCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSinkWired: false;
  readonly profileDefinitionId: string;
  readonly profileDefinitionContentVersion: number;
  readonly profileDefinitionContentHash: string;
  readonly baselineProfileRevision: number;
  readonly cohortSubjectId: string;
  readonly baselineProfileHash: string;
  readonly windowIdentityHash: string;
  readonly containsRawProfileId: false;
  readonly containsWallClockTime: false;
}

export interface ArenaV2WeaponResearchPaceAccumulatedEvidenceInputCandidateV1 {
  readonly profileDefinition: unknown;
  readonly baselineProfile: unknown;
  readonly currentProfile: unknown;
  readonly window: unknown;
  readonly settledMatchCount: unknown;
  readonly measuredSettledMatchCount: unknown;
  readonly missingAuthorityDurationCount: unknown;
  readonly totalAuthorityTicks: unknown;
  readonly evidenceThroughProfileRevision: unknown;
  readonly catalogCompletionProfileRevision: unknown;
}

export interface ArenaV2WeaponResearchCatalogProgressCandidateV1 {
  readonly schemaVersion: 1;
  readonly currentMainResearchPoints: number;
  readonly targetMainResearchPoints: number;
  readonly remainingMainResearchPoints: number;
  readonly catalogComplete: boolean;
}

function safeAdd(total: number, value: number, name: string): number {
  const next = total + value;
  if (!Number.isSafeInteger(next)) throw new RangeError(`${name}溢出。`);
  return next;
}

function mainResearchPoints(profile: ArenaV2LearningProfileV1): number {
  return profile.weaponMastery.reduce(
    (total, record) => safeAdd(total, record.useCount, 'Arena V2武器主研究点累计'),
    0,
  );
}

function catalogProgress(
  definition: ReturnType<typeof createArenaV2LearningProfileDefinitionV1>,
  profile: ArenaV2LearningProfileV1,
): ArenaV2WeaponResearchCatalogProgressCandidateV1 {
  const currentMainResearchPoints = mainResearchPoints(profile);
  const targetMainResearchPoints = definition.weaponDefinitionIds.length
    * definition.masteryRequirements.weaponCollectionUseEvidence;
  if (!Number.isSafeInteger(targetMainResearchPoints) || targetMainResearchPoints < 1) {
    throw new RangeError('Arena V2武器研究节奏目录总目标无效。');
  }
  const remainingMainResearchPoints = targetMainResearchPoints - currentMainResearchPoints;
  if (remainingMainResearchPoints < 0) {
    throw new RangeError('Arena V2武器研究节奏当前点数超过目录总目标。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    currentMainResearchPoints,
    targetMainResearchPoints,
    remainingMainResearchPoints,
    catalogComplete: remainingMainResearchPoints === 0,
  });
}

export function projectArenaV2WeaponResearchCatalogProgressCandidateV1(
  value: unknown,
): ArenaV2WeaponResearchCatalogProgressCandidateV1 {
  const source = readExactOptions(
    value,
    CATALOG_PROGRESS_OPTION_KEYS,
    'Arena V2武器研究目录进度输入',
  );
  const definition = createArenaV2LearningProfileDefinitionV1(source.profileDefinition);
  const profile = createArenaV2LearningProfileV1(definition, source.profile);
  return catalogProgress(definition, profile);
}

function cohortSubjectId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('Arena V2武器研究节奏cohortSubjectId必须是非空字符串。');
  }
  if (value.length > ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1) {
    throw new RangeError('Arena V2武器研究节奏cohortSubjectId超过长度上限。');
  }
  return value;
}

export function createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1(
  value: unknown,
): ArenaV2WeaponResearchPaceCalibrationWindowCandidateV1 {
  const source = readExactOptions(
    value,
    WINDOW_INPUT_KEYS,
    'Arena V2武器研究节奏校准窗口输入',
  );
  const definition = createArenaV2LearningProfileDefinitionV1(source.profileDefinition);
  const baselineProfile = createArenaV2LearningProfileV1(
    definition,
    source.baselineProfile,
  );
  const subjectId = cohortSubjectId(source.cohortSubjectId);
  const baselineProfileHash = createDeterministicDataHash(
    baselineProfile,
    'ArenaV2WeaponResearchPaceCalibrationBaselineProfileV1',
  );
  const identityPayload = Object.freeze({
    schemaVersion: 1 as const,
    profileDefinitionId: definition.id,
    profileDefinitionContentVersion: definition.contentVersion,
    profileDefinitionContentHash: definition.contentHash,
    baselineProfileRevision: baselineProfile.revision,
    cohortSubjectId: subjectId,
    baselineProfileHash,
  });
  return Object.freeze({
    ...identityPayload,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSinkWired: false as const,
    windowIdentityHash: createDeterministicDataHash(
      identityPayload,
      'ArenaV2WeaponResearchPaceCalibrationWindowIdentityV1',
    ),
    containsRawProfileId: false as const,
    containsWallClockTime: false as const,
  });
}

function calibrationWindow(
  value: unknown,
  definition: ReturnType<typeof createArenaV2LearningProfileDefinitionV1>,
  baselineProfile: ArenaV2LearningProfileV1,
): ArenaV2WeaponResearchPaceCalibrationWindowCandidateV1 {
  const source = readExactOptions(value, WINDOW_KEYS, 'Arena V2武器研究节奏校准窗口');
  const subjectId = cohortSubjectId(source.cohortSubjectId);
  const expected = createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
    profileDefinition: definition,
    baselineProfile,
    cohortSubjectId: subjectId,
  });
  if (source.schemaVersion !== expected.schemaVersion
    || source.status !== expected.status
    || source.hardGate !== expected.hardGate
    || source.defaultSinkWired !== expected.defaultSinkWired
    || source.profileDefinitionId !== expected.profileDefinitionId
    || source.profileDefinitionContentVersion !== expected.profileDefinitionContentVersion
    || source.profileDefinitionContentHash !== expected.profileDefinitionContentHash
    || source.baselineProfileRevision !== expected.baselineProfileRevision
    || source.baselineProfileHash !== expected.baselineProfileHash
    || source.windowIdentityHash !== expected.windowIdentityHash
    || source.containsRawProfileId !== expected.containsRawProfileId
    || source.containsWallClockTime !== expected.containsWallClockTime) {
    throw new RangeError('Arena V2武器研究节奏校准窗口身份漂移。');
  }
  return expected;
}

function projectFromAccumulatedEvidence(
  definition: ReturnType<typeof createArenaV2LearningProfileDefinitionV1>,
  baselineProfile: ArenaV2LearningProfileV1,
  currentProfile: ArenaV2LearningProfileV1,
  calibrationWindowValue: ArenaV2WeaponResearchPaceCalibrationWindowCandidateV1,
  evidence: Readonly<{
    settledMatchCount: number;
    measuredSettledMatchCount: number;
    missingAuthorityDurationCount: number;
    totalAuthorityTicks: number;
    evidenceThroughProfileRevision: number;
    catalogCompletionProfileRevision: number | null;
  }>,
): ArenaV2WeaponResearchPaceCalibrationCandidateV1 {
  if (baselineProfile.profileId !== currentProfile.profileId) {
    throw new RangeError('Arena V2武器研究节奏Profile身份漂移。');
  }
  if (currentProfile.revision < baselineProfile.revision) {
    throw new RangeError('Arena V2武器研究节奏Profile revision不能回退。');
  }
  if (evidence.evidenceThroughProfileRevision < baselineProfile.revision
    || evidence.evidenceThroughProfileRevision > currentProfile.revision) {
    throw new RangeError('Arena V2武器研究节奏证据边界不在Profile窗口内。');
  }
  const revisionSpan =
    evidence.evidenceThroughProfileRevision - baselineProfile.revision;
  if (!Number.isSafeInteger(revisionSpan)) {
    throw new RangeError('Arena V2武器研究节奏Profile revision跨度溢出。');
  }
  if (evidence.settledMatchCount !== revisionSpan
    || evidence.measuredSettledMatchCount + evidence.missingAuthorityDurationCount
      !== evidence.settledMatchCount) {
    throw new RangeError('Arena V2武器研究节奏累计结算证据与Profile窗口不闭合。');
  }

  const baselinePointByWeapon = new Map(
    baselineProfile.weaponMastery.map((record) => (
      [record.weaponDefinitionId, record.useCount] as const
    )),
  );
  for (const record of currentProfile.weaponMastery) {
    if (record.useCount < (baselinePointByWeapon.get(record.weaponDefinitionId) ?? 0)) {
      throw new RangeError('Arena V2武器研究节奏单武器主研究点不能回退。');
    }
  }
  for (const record of baselineProfile.weaponMastery) {
    const current = currentProfile.weaponMastery.find(({ weaponDefinitionId }) => (
      weaponDefinitionId === record.weaponDefinitionId
    ));
    if (current === undefined && record.useCount > 0) {
      throw new RangeError('Arena V2武器研究节奏当前Profile丢失已有武器记录。');
    }
  }

  const baselineCatalogProgress = catalogProgress(definition, baselineProfile);
  const currentCatalogProgress = catalogProgress(definition, currentProfile);
  const baselineMainResearchPoints = baselineCatalogProgress.currentMainResearchPoints;
  const currentMainResearchPoints = currentCatalogProgress.currentMainResearchPoints;
  const observedWeaponResearchPointCount =
    currentMainResearchPoints - baselineMainResearchPoints;
  if (observedWeaponResearchPointCount < 0
    || observedWeaponResearchPointCount > evidence.settledMatchCount) {
    throw new RangeError('Arena V2武器研究节奏点数增量超过每局最多一点的边界。');
  }
  const targetMainResearchPoints = currentCatalogProgress.targetMainResearchPoints;
  const remainingMainResearchPoints = currentCatalogProgress.remainingMainResearchPoints;
  if (currentCatalogProgress.catalogComplete) {
    if (evidence.catalogCompletionProfileRevision === null
      || evidence.catalogCompletionProfileRevision
        !== evidence.evidenceThroughProfileRevision) {
      throw new RangeError('Arena V2武器研究节奏全集完成边界缺失或漂移。');
    }
  } else if (evidence.catalogCompletionProfileRevision !== null
    || evidence.evidenceThroughProfileRevision !== currentProfile.revision) {
    throw new RangeError('Arena V2武器研究节奏未完成目录不能冻结证据窗口。');
  }
  const completeAuthorityDurationWindow = evidence.missingAuthorityDurationCount === 0;
  const averageAuthorityMinutesPerResearchPoint = completeAuthorityDurationWindow
    && observedWeaponResearchPointCount > 0
    && evidence.totalAuthorityTicks > 0
    ? evidence.totalAuthorityTicks
      / ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz
      / SECONDS_PER_MINUTE
      / observedWeaponResearchPointCount
    : null;
  const projectedRemainingWeaponCollectionHoursAtObservedPace =
    averageAuthorityMinutesPerResearchPoint === null
      ? null
      : averageAuthorityMinutesPerResearchPoint
        * remainingMainResearchPoints / MINUTES_PER_HOUR;
  const projectedCatalogWeaponCollectionHoursAtObservedPace =
    averageAuthorityMinutesPerResearchPoint === null
      ? null
      : averageAuthorityMinutesPerResearchPoint
        * targetMainResearchPoints / MINUTES_PER_HOUR;
  const observedCatalogCompletionEvidence = !currentCatalogProgress.catalogComplete
    ? 'catalog-incomplete' as const
    : baselineProfile.revision !== 0 || baselineMainResearchPoints > 0
      ? 'partial-baseline' as const
      : !completeAuthorityDurationWindow
        ? 'incomplete-authority-duration-window' as const
        : 'complete-zero-baseline-window' as const;
  const observedCatalogCompletionHours = observedCatalogCompletionEvidence
    === 'complete-zero-baseline-window'
    ? evidence.totalAuthorityTicks
      / ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz
      / SECONDS_PER_MINUTE
      / MINUTES_PER_HOUR
    : null;
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'offline-weapon-research-pace-calibration-candidate' as const,
    productionReady: false as const,
    longitudinalEvidence: 'not-run' as const,
    windowIdentityHash: calibrationWindowValue.windowIdentityHash,
    baselineProfileRevision: baselineProfile.revision,
    currentProfileRevision: currentProfile.revision,
    evidenceThroughProfileRevision: evidence.evidenceThroughProfileRevision,
    catalogCompletionProfileRevision: evidence.catalogCompletionProfileRevision,
    catalogCompletionPaceEvidenceFrozen:
      evidence.catalogCompletionProfileRevision !== null,
    settledMatchCount: evidence.settledMatchCount,
    measuredSettledMatchCount: evidence.measuredSettledMatchCount,
    missingAuthorityDurationCount: evidence.missingAuthorityDurationCount,
    completeAuthorityDurationWindow,
    observedWeaponResearchPointCount,
    observedWeaponResearchPointRate: evidence.settledMatchCount === 0
      ? null
      : observedWeaponResearchPointCount / evidence.settledMatchCount,
    totalAuthorityTicks: evidence.totalAuthorityTicks,
    averageAuthorityMinutesPerResearchPoint,
    currentMainResearchPoints,
    targetMainResearchPoints,
    remainingMainResearchPoints,
    projectedRemainingWeaponCollectionHoursAtObservedPace,
    projectedCatalogWeaponCollectionHoursAtObservedPace,
    projectedCatalogDeltaFromTargetHours:
      projectedCatalogWeaponCollectionHoursAtObservedPace === null
        ? null
        : projectedCatalogWeaponCollectionHoursAtObservedPace
          - ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1 / MINUTES_PER_HOUR,
    meetsTwoHundredHourObservedWeaponPace:
      projectedCatalogWeaponCollectionHoursAtObservedPace === null
        ? null
        : projectedCatalogWeaponCollectionHoursAtObservedPace
          >= ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1 / MINUTES_PER_HOUR,
    observedCatalogCompletionHours,
    observedCatalogCompletionDeltaFromTargetHours:
      observedCatalogCompletionHours === null
        ? null
        : observedCatalogCompletionHours
          - ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1 / MINUTES_PER_HOUR,
    observedCatalogCompletionMeetsTwoHundredHourTarget:
      observedCatalogCompletionHours === null
        ? null
        : observedCatalogCompletionHours
          >= ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1 / MINUTES_PER_HOUR,
    observedCatalogCompletionEvidence,
    projectionKind:
      'profile-delta-and-complete-authority-window-extrapolation' as const,
    addsRetentionMetric: false as const,
    claimsObservedRetention: false as const,
    containsWallClockTime: false as const,
  });
}

/**
 * Uses exact profile deltas to distinguish weapon main-research points from
 * other effective progress. A projection is published only when every match
 * in the contiguous profile-revision window has an authoritative duration.
 */
export function projectArenaV2WeaponResearchPaceCalibrationCandidateV1(
  value: unknown,
): ArenaV2WeaponResearchPaceCalibrationCandidateV1 {
  const source = readExactOptions(value, OPTION_KEYS, 'Arena V2武器研究节奏校准输入');
  const definition = createArenaV2LearningProfileDefinitionV1(source.profileDefinition);
  const baselineProfile = createArenaV2LearningProfileV1(
    definition,
    source.baselineProfile,
  );
  const currentProfile = createArenaV2LearningProfileV1(
    definition,
    source.currentProfile,
  );
  if (baselineProfile.profileId !== currentProfile.profileId) {
    throw new RangeError('Arena V2武器研究节奏Profile身份漂移。');
  }
  if (currentProfile.revision < baselineProfile.revision) {
    throw new RangeError('Arena V2武器研究节奏Profile revision不能回退。');
  }
  if (!Array.isArray(source.observations)) {
    throw new TypeError('Arena V2武器研究节奏observations必须是数组。');
  }
  const calibrationWindowValue = calibrationWindow(
    source.window,
    definition,
    baselineProfile,
  );
  const pace = projectArenaV2LearningPaceCalibrationCandidateV1({
    profileDefinition: definition,
    observations: source.observations,
  });
  const observations = source.observations.map(createArenaV2RetentionObservationV1);
  if (observations.some(({ cohortSubjectId: subjectId }) => (
    subjectId !== calibrationWindowValue.cohortSubjectId
  ))) {
    throw new RangeError('Arena V2武器研究节奏观察与校准窗口主体漂移。');
  }
  const settled = observations
    .filter(({ kind }) => (
      kind === ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED
    ));
  const revisionSpan = currentProfile.revision - baselineProfile.revision;
  if (!Number.isSafeInteger(revisionSpan)) {
    throw new RangeError('Arena V2武器研究节奏Profile revision跨度溢出。');
  }
  if (settled.length !== revisionSpan) {
    throw new RangeError('Arena V2武器研究节奏必须覆盖连续Profile revision结算窗口。');
  }
  const settledRevisions = settled
    .map(({ profileRevision }) => profileRevision)
    .sort((left, right) => left - right);
  settledRevisions.forEach((profileRevision, index) => {
    if (profileRevision !== baselineProfile.revision + index + 1) {
      throw new RangeError('Arena V2武器研究节奏结算Profile revision不连续。');
    }
  });
  const baselineCatalogProgress = catalogProgress(definition, baselineProfile);
  const currentCatalogProgress = catalogProgress(definition, currentProfile);
  const catalogCompletionProfileRevision = currentCatalogProgress.catalogComplete
    && ((revisionSpan === 0 && baselineCatalogProgress.catalogComplete)
      || currentCatalogProgress.currentMainResearchPoints
        - baselineCatalogProgress.currentMainResearchPoints === revisionSpan)
    ? currentProfile.revision
    : null;

  return projectFromAccumulatedEvidence(
    definition,
    baselineProfile,
    currentProfile,
    calibrationWindowValue,
    Object.freeze({
      settledMatchCount: pace.settledMatchCount,
      measuredSettledMatchCount: pace.measuredSettledMatchCount,
      missingAuthorityDurationCount: pace.missingAuthorityDurationCount,
      totalAuthorityTicks: pace.totalAuthorityTicks,
      evidenceThroughProfileRevision: currentProfile.revision,
      catalogCompletionProfileRevision,
    }),
  );
}

export function projectArenaV2WeaponResearchPaceCalibrationFromAccumulatedEvidenceCandidateV1(
  value: ArenaV2WeaponResearchPaceAccumulatedEvidenceInputCandidateV1,
): ArenaV2WeaponResearchPaceCalibrationCandidateV1 {
  const source = readExactOptions(
    value,
    ACCUMULATED_OPTION_KEYS,
    'Arena V2武器研究节奏累计证据输入',
  );
  const definition = createArenaV2LearningProfileDefinitionV1(source.profileDefinition);
  const baselineProfile = createArenaV2LearningProfileV1(
    definition,
    source.baselineProfile,
  );
  const currentProfile = createArenaV2LearningProfileV1(
    definition,
    source.currentProfile,
  );
  const calibrationWindowValue = calibrationWindow(
    source.window,
    definition,
    baselineProfile,
  );
  return projectFromAccumulatedEvidence(
    definition,
    baselineProfile,
    currentProfile,
    calibrationWindowValue,
    Object.freeze({
      settledMatchCount: assertIntegerAtLeast(
        source.settledMatchCount,
        0,
        'Arena V2武器研究节奏累计结算数',
      ),
      measuredSettledMatchCount: assertIntegerAtLeast(
        source.measuredSettledMatchCount,
        0,
        'Arena V2武器研究节奏累计已测结算数',
      ),
      missingAuthorityDurationCount: assertIntegerAtLeast(
        source.missingAuthorityDurationCount,
        0,
        'Arena V2武器研究节奏累计缺时长结算数',
      ),
      totalAuthorityTicks: assertIntegerAtLeast(
        source.totalAuthorityTicks,
        0,
        'Arena V2武器研究节奏累计权威tick',
      ),
      evidenceThroughProfileRevision: assertIntegerAtLeast(
        source.evidenceThroughProfileRevision,
        0,
        'Arena V2武器研究节奏证据截止Profile revision',
      ),
      catalogCompletionProfileRevision: source.catalogCompletionProfileRevision === null
        ? null
        : assertIntegerAtLeast(
          source.catalogCompletionProfileRevision,
          0,
          'Arena V2武器研究节奏全集完成Profile revision',
        ),
    }),
  );
}

export const ARENA_V2_WEAPON_RESEARCH_PACE_CALIBRATION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSinkWired: false as const,
  exactContiguousProfileRevisionWindowRequired: true as const,
  baselineProfileAndCohortWindowIdentityRequired: true as const,
  profileDefinitionContentHashBoundIntoWindowIdentity: true as const,
  cohortSubjectIdMaximumLengthUsesSharedRetentionContract: true as const,
  rawProfileIdExcludedFromWindow: true as const,
  reusesExistingEightRetentionMetrics: true as const,
  accumulatedEvidenceUsesSameProjectionFormula: true as const,
  accumulatedEvidenceStoresNoReplayOrInputTrajectory: true as const,
  catalogProgressProjectionIsSharedWithDurableStore: true as const,
  catalogCompletionBoundaryRequiredBeforeEvidenceFreeze: true as const,
  postCompletionMatchesExcludedFromCollectionDuration: true as const,
  exactObservedCompletionDurationRequiresZeroBaseline: true as const,
  exactObservedCompletionDurationRequiresRevisionZero: true as const,
  partialBaselineNeverClaimsObservedCatalogDuration: true as const,
  addsRetentionMetric: false as const,
  mutatesProfileProgressionOrThreshold: false as const,
  completeAuthorityDurationWindowRequiredForProjection: true as const,
  containsWallClockTime: false as const,
  validationStatus: 'not-run' as const,
});
