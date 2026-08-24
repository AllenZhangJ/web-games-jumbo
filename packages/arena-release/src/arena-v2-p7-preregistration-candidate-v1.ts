import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceGitCommit,
  assertEvidenceSha256,
} from '@number-strategy-jump/arena-evidence-contracts';

export const ARENA_V2_P7_PREREGISTRATION_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1 = Object.freeze([
  Object.freeze({ id: 'web-mobile-390x844', platform: 'web', viewport: '390x844' }),
  Object.freeze({ id: 'web-desktop-1440x900', platform: 'web', viewport: '1440x900' }),
  Object.freeze({ id: 'wechat-developer-tool', platform: 'wechat', viewport: null }),
  Object.freeze({ id: 'douyin-developer-tool', platform: 'douyin', viewport: null }),
  Object.freeze({ id: 'ios-physical-device', platform: 'ios', viewport: null }),
  Object.freeze({ id: 'android-physical-device', platform: 'android', viewport: null }),
] as const);

export const ARENA_V2_P7_HUMAN_TASKS_CANDIDATE_V1 = Object.freeze([
  Object.freeze({
    id: 'onboarding-180-seconds',
    requiredFacts: Object.freeze([
      'direction', 'ground-jump', 'air-jump', 'ground-primary', 'air-primary',
      'automatic-pickup-replacement', 'one-counterplay-explanation',
    ]),
  }),
  Object.freeze({
    id: 'weapon-comparison-10-seconds',
    requiredFacts: Object.freeze([
      'range', 'coverage', 'risk', 'ground-air-difference',
    ]),
  }),
  Object.freeze({
    id: 'kz-first-route-and-reentry',
    requiredFacts: Object.freeze([
      'first-segment-route', 'first-failure-reason', 'correct-respawn-reentry',
    ]),
  }),
  Object.freeze({
    id: 'survival-supply-and-two-life-goal',
    requiredFacts: Object.freeze([
      'supply-location', 'ten-second-expiry', 'keep-or-replace-decision',
      'post-first-revive-goal',
    ]),
  }),
  Object.freeze({
    id: 'multiplayer-two-to-four-readability',
    requiredFacts: Object.freeze([
      'two-to-four-crowding', 'simultaneous-attacks', 'finish', 'reentry',
    ]),
  }),
  Object.freeze({
    id: 'longitudinal-active-goal',
    requiredFacts: Object.freeze([
      'active-next-goal', 'goal-completion', 'cross-weapon-or-map-use',
    ]),
  }),
] as const);

export const ARENA_V2_P7_HUMAN_SUBGROUPS_CANDIDATE_V1 = Object.freeze([
  Object.freeze({
    id: 'experienced',
    classificationRule: Object.freeze({
      questionnaireFieldId:
        'relevant-platform-fighting-or-kz-experience-hours-before-first-session',
      operator: 'greater-than-or-equal' as const,
      thresholdHours: 20,
    }),
  }),
  Object.freeze({
    id: 'novice',
    classificationRule: Object.freeze({
      questionnaireFieldId:
        'relevant-platform-fighting-or-kz-experience-hours-before-first-session',
      operator: 'less-than' as const,
      thresholdHours: 20,
    }),
  }),
] as const);

export const ARENA_V2_P7_HUMAN_SUBGROUP_IDS_CANDIDATE_V1 = Object.freeze(
  ARENA_V2_P7_HUMAN_SUBGROUPS_CANDIDATE_V1.map(({ id }) => id),
);

export const ARENA_V2_P7_LONGITUDINAL_CHECKPOINT_HOURS_CANDIDATE_V1 = Object.freeze([
  0.5, 1, 10, 30, 60, 120, 200,
] as const);

export const ARENA_V2_P7_SCORE_DIMENSIONS_CANDIDATE_V1 = Object.freeze([
  Object.freeze({ id: 'novice-controls', weight: 15 }),
  Object.freeze({ id: 'weapon-feedback-understanding', weight: 15 }),
  Object.freeze({ id: 'map-mode-understanding', weight: 15 }),
  Object.freeze({ id: 'balance-retention', weight: 15 }),
  Object.freeze({ id: 'three-platform-performance-stability', weight: 15 }),
  Object.freeze({ id: 'replay-regression-integrity', weight: 10 }),
  Object.freeze({ id: 'formal-assets-accessibility', weight: 5 }),
  Object.freeze({ id: 'governance-independent-audit', weight: 10 }),
] as const);

type TargetEnvironmentId =
  typeof ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1[number]['id'];
type HumanTaskId = typeof ARENA_V2_P7_HUMAN_TASKS_CANDIDATE_V1[number]['id'];
type LongitudinalCheckpointHours =
  typeof ARENA_V2_P7_LONGITUDINAL_CHECKPOINT_HOURS_CANDIDATE_V1[number];

export interface ArenaV2P7EnvironmentBuildIdentityCandidateV1 {
  readonly environmentId: TargetEnvironmentId;
  readonly buildIdentitySha256: string;
}

export interface ArenaV2P7HumanTaskThresholdCandidateV1 {
  readonly taskId: HumanTaskId;
  readonly minimumQualifiedParticipants: number;
  readonly minimumOverallCompletionRate: number;
  readonly minimumNoVerbalHelpRate: number;
  readonly minimumExplanationRate: number;
  readonly minimumSubgroupRate: number;
}

export interface ArenaV2P7LongitudinalThresholdCandidateV1 {
  readonly checkpointHours: LongitudinalCheckpointHours;
  readonly minimumQualifiedParticipants: number;
  readonly minimumActiveGoalRate: number;
  readonly minimumGoalCompletionRate: number;
  readonly minimumCrossWeaponOrMapUseRate: number;
}

export interface ArenaV2P7PreregistrationOptionsCandidateV1 {
  readonly sourceCommit: string;
  readonly sourceDirty: false;
  readonly contentIdentityHash: string;
  readonly environmentBuilds: readonly ArenaV2P7EnvironmentBuildIdentityCandidateV1[];
  readonly humanTaskThresholds: readonly ArenaV2P7HumanTaskThresholdCandidateV1[];
  readonly longitudinalThresholds: readonly ArenaV2P7LongitudinalThresholdCandidateV1[];
}

const OPTION_KEYS = new Set([
  'sourceCommit', 'sourceDirty', 'contentIdentityHash', 'environmentBuilds',
  'humanTaskThresholds', 'longitudinalThresholds',
]);
const PREREGISTRATION_KEYS = new Set([
  'schemaVersion', 'status', 'sourceCommit', 'sourceDirty', 'contentIdentityHash',
  'environmentBuildSetIdentityHash', 'environmentBuilds', 'humanTasks', 'humanTaskThresholds',
  'humanSubgroups',
  'longitudinalCheckpointHours', 'longitudinalThresholds', 'scoreDimensions',
  'releaseGates', 'preregistrationIdentityHash',
]);
const BUILD_KEYS = new Set(['environmentId', 'buildIdentitySha256']);
const HUMAN_THRESHOLD_KEYS = new Set([
  'taskId', 'minimumQualifiedParticipants', 'minimumOverallCompletionRate',
  'minimumNoVerbalHelpRate', 'minimumExplanationRate', 'minimumSubgroupRate',
]);
const LONGITUDINAL_THRESHOLD_KEYS = new Set([
  'checkpointHours', 'minimumQualifiedParticipants', 'minimumActiveGoalRate',
  'minimumGoalCompletionRate', 'minimumCrossWeaponOrMapUseRate',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const MINIMUM_QUALIFIED_PARTICIPANTS = 10;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function rate(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name}必须是0到1的有限数。`);
  }
  return value;
}

function rateAtLeast(value: unknown, minimum: number, name: string): number {
  const normalized = rate(value, name);
  if (normalized < minimum) {
    throw new RangeError(`${name}不得低于${minimum}。`);
  }
  return normalized;
}

function positivePreregisteredRate(value: unknown, name: string): number {
  const normalized = rate(value, name);
  if (normalized === 0) throw new RangeError(`${name}不能用0规避纵向门槛。`);
  return normalized;
}

function canonicalIdentity(value: unknown, name: string): string {
  return assertNonEmptyString(value, name);
}

function canonicalCheckpoint(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}必须是非负有限数。`);
  }
  return value;
}

function requireCanonicalCoverage<TSource, TResult>(
  source: readonly TSource[],
  canonicalKeys: readonly string[],
  keyOf: (value: TSource, index: number) => string,
  normalize: (value: TSource, index: number) => TResult,
  name: string,
): readonly TResult[] {
  if (source.length !== canonicalKeys.length) {
    throw new RangeError(`${name}必须精确覆盖${canonicalKeys.length}项。`);
  }
  return Object.freeze(source.map((value, index) => {
    const expected = canonicalKeys[index];
    if (keyOf(value, index) !== expected) {
      throw new RangeError(`${name}[${index}]必须是${expected}且保持冻结顺序。`);
    }
    return normalize(value, index);
  }));
}

function normalizedBuilds(
  value: unknown,
): readonly ArenaV2P7EnvironmentBuildIdentityCandidateV1[] {
  if (!Array.isArray(value)) throw new TypeError('P7 environmentBuilds必须是数组。');
  const ids = ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1.map(({ id }) => id);
  return requireCanonicalCoverage(
    value,
    ids,
    (entry, index) => {
      exactRecord(entry, BUILD_KEYS, `P7 environmentBuilds[${index}]`);
      return canonicalIdentity(
        entry.environmentId,
        `P7 environmentBuilds[${index}].environmentId`,
      );
    },
    (entry, index) => {
      exactRecord(entry, BUILD_KEYS, `P7 environmentBuilds[${index}]`);
      return Object.freeze({
        environmentId: entry.environmentId as TargetEnvironmentId,
        buildIdentitySha256: assertEvidenceSha256(
          entry.buildIdentitySha256,
          `P7 environmentBuilds[${index}].buildIdentitySha256`,
        ),
      });
    },
    'P7 environmentBuilds',
  );
}

function normalizedHumanThresholds(
  value: unknown,
): readonly ArenaV2P7HumanTaskThresholdCandidateV1[] {
  if (!Array.isArray(value)) throw new TypeError('P7 humanTaskThresholds必须是数组。');
  const ids = ARENA_V2_P7_HUMAN_TASKS_CANDIDATE_V1.map(({ id }) => id);
  return requireCanonicalCoverage(
    value,
    ids,
    (entry, index) => {
      exactRecord(entry, HUMAN_THRESHOLD_KEYS, `P7 humanTaskThresholds[${index}]`);
      return canonicalIdentity(
        entry.taskId,
        `P7 humanTaskThresholds[${index}].taskId`,
      );
    },
    (entry, index) => {
      exactRecord(entry, HUMAN_THRESHOLD_KEYS, `P7 humanTaskThresholds[${index}]`);
      return Object.freeze({
        taskId: entry.taskId as HumanTaskId,
        minimumQualifiedParticipants: assertIntegerAtLeast(
          entry.minimumQualifiedParticipants,
          MINIMUM_QUALIFIED_PARTICIPANTS,
          `P7 humanTaskThresholds[${index}].minimumQualifiedParticipants`,
        ),
        minimumOverallCompletionRate: rateAtLeast(
          entry.minimumOverallCompletionRate,
          0.9,
          `P7 humanTaskThresholds[${index}].minimumOverallCompletionRate`,
        ),
        minimumNoVerbalHelpRate: rateAtLeast(
          entry.minimumNoVerbalHelpRate,
          0.8,
          `P7 humanTaskThresholds[${index}].minimumNoVerbalHelpRate`,
        ),
        minimumExplanationRate: rateAtLeast(
          entry.minimumExplanationRate,
          0.8,
          `P7 humanTaskThresholds[${index}].minimumExplanationRate`,
        ),
        minimumSubgroupRate: rateAtLeast(
          entry.minimumSubgroupRate,
          0.8,
          `P7 humanTaskThresholds[${index}].minimumSubgroupRate`,
        ),
      });
    },
    'P7 humanTaskThresholds',
  );
}

function normalizedLongitudinalThresholds(
  value: unknown,
): readonly ArenaV2P7LongitudinalThresholdCandidateV1[] {
  if (!Array.isArray(value)) throw new TypeError('P7 longitudinalThresholds必须是数组。');
  const checkpoints = ARENA_V2_P7_LONGITUDINAL_CHECKPOINT_HOURS_CANDIDATE_V1.map(String);
  return requireCanonicalCoverage(
    value,
    checkpoints,
    (entry, index) => {
      exactRecord(
        entry,
        LONGITUDINAL_THRESHOLD_KEYS,
        `P7 longitudinalThresholds[${index}]`,
      );
      return String(canonicalCheckpoint(
        entry.checkpointHours,
        `P7 longitudinalThresholds[${index}].checkpointHours`,
      ));
    },
    (entry, index) => {
      exactRecord(
        entry,
        LONGITUDINAL_THRESHOLD_KEYS,
        `P7 longitudinalThresholds[${index}]`,
      );
      const checkpointHours = canonicalCheckpoint(
        entry.checkpointHours,
        `P7 longitudinalThresholds[${index}].checkpointHours`,
      );
      if (checkpointHours !== ARENA_V2_P7_LONGITUDINAL_CHECKPOINT_HOURS_CANDIDATE_V1[index]) {
        throw new RangeError(`P7 longitudinalThresholds[${index}]节点身份漂移。`);
      }
      return Object.freeze({
        checkpointHours: checkpointHours as LongitudinalCheckpointHours,
        minimumQualifiedParticipants: assertIntegerAtLeast(
          entry.minimumQualifiedParticipants,
          MINIMUM_QUALIFIED_PARTICIPANTS,
          `P7 longitudinalThresholds[${index}].minimumQualifiedParticipants`,
        ),
        minimumActiveGoalRate: positivePreregisteredRate(
          entry.minimumActiveGoalRate,
          `P7 longitudinalThresholds[${index}].minimumActiveGoalRate`,
        ),
        minimumGoalCompletionRate: positivePreregisteredRate(
          entry.minimumGoalCompletionRate,
          `P7 longitudinalThresholds[${index}].minimumGoalCompletionRate`,
        ),
        minimumCrossWeaponOrMapUseRate: positivePreregisteredRate(
          entry.minimumCrossWeaponOrMapUseRate,
          `P7 longitudinalThresholds[${index}].minimumCrossWeaponOrMapUseRate`,
        ),
      });
    },
    'P7 longitudinalThresholds',
  );
}

/**
 * Creates the immutable preregistration identity for P7. It intentionally
 * accepts no observations or outcomes: thresholds, six target builds and the
 * clean source/content identity must be frozen before the first participant.
 */
export function createArenaV2P7PreregistrationCandidateV1(value: unknown) {
  const source = cloneFrozenData(value, 'Arena V2 P7 preregistration options');
  exactRecord(source, OPTION_KEYS, 'Arena V2 P7 preregistration options');
  if (source.sourceDirty !== false) {
    throw new RangeError('Arena V2 P7 preregistration只能绑定clean source。');
  }
  const contentIdentityHash = assertNonEmptyString(
    source.contentIdentityHash,
    'Arena V2 P7 preregistration contentIdentityHash',
  );
  if (!HASH_PATTERN.test(contentIdentityHash)) {
    throw new RangeError('Arena V2 P7 preregistration contentIdentityHash必须是8位小写hash。');
  }
  const environmentBuilds = normalizedBuilds(source.environmentBuilds);
  const core = Object.freeze({
    schemaVersion: ARENA_V2_P7_PREREGISTRATION_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    sourceCommit: assertEvidenceGitCommit(
      source.sourceCommit,
      'Arena V2 P7 preregistration sourceCommit',
    ),
    sourceDirty: false as const,
    contentIdentityHash,
    environmentBuildSetIdentityHash: createDeterministicDataHash(
      environmentBuilds,
      'Arena V2 P7 preregistered environment build set candidate V1',
    ),
    environmentBuilds,
    humanTasks: ARENA_V2_P7_HUMAN_TASKS_CANDIDATE_V1,
    humanSubgroups: ARENA_V2_P7_HUMAN_SUBGROUPS_CANDIDATE_V1,
    humanTaskThresholds: normalizedHumanThresholds(source.humanTaskThresholds),
    longitudinalCheckpointHours:
      ARENA_V2_P7_LONGITUDINAL_CHECKPOINT_HOURS_CANDIDATE_V1,
    longitudinalThresholds: normalizedLongitudinalThresholds(
      source.longitudinalThresholds,
    ),
    scoreDimensions: ARENA_V2_P7_SCORE_DIMENSIONS_CANDIDATE_V1,
    releaseGates: Object.freeze({
      requiredTargetEnvironmentCount: 6 as const,
      blockingDefectMaximum: 0 as const,
      highDefectMaximum: 0 as const,
      mediumAndLowRequireNamedOwnerImpactScopeAndAcceptanceReason: true as const,
      minimumQualifiedParticipantsPerSubgroup: 5 as const,
      missingDeviceOrSampleMeansIncomplete: true as const,
      allEvidenceMustMatchSourceBuildAndContentIdentity: true as const,
      independentAuditRequired: true as const,
      minimumTotalScore: 90 as const,
      minimumScorePerDimension: 80 as const,
    }),
  });
  return Object.freeze({
    ...core,
    preregistrationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 P7 preregistration candidate V1',
    ),
  });
}

export type ArenaV2P7PreregistrationCandidateV1 = ReturnType<
  typeof createArenaV2P7PreregistrationCandidateV1
>;

/** Rebuilds the canonical preregistration and rejects any stored mutation. */
export function validateArenaV2P7PreregistrationCandidateV1(
  value: unknown,
): ArenaV2P7PreregistrationCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 P7 stored preregistration');
  exactRecord(source, PREREGISTRATION_KEYS, 'Arena V2 P7 stored preregistration');
  if (
    source.schemaVersion !== ARENA_V2_P7_PREREGISTRATION_CANDIDATE_V1_SCHEMA_VERSION
    || source.status !== 'production-unreachable'
  ) throw new RangeError('Arena V2 P7 stored preregistration版本或状态无效。');
  const canonical = createArenaV2P7PreregistrationCandidateV1({
    sourceCommit: source.sourceCommit,
    sourceDirty: source.sourceDirty,
    contentIdentityHash: source.contentIdentityHash,
    environmentBuilds: source.environmentBuilds,
    humanTaskThresholds: source.humanTaskThresholds,
    longitudinalThresholds: source.longitudinalThresholds,
  });
  if (
    source.preregistrationIdentityHash !== canonical.preregistrationIdentityHash
    || createDeterministicDataHash(
      source,
      'Arena V2 P7 stored preregistration comparison',
    ) !== createDeterministicDataHash(
      canonical,
      'Arena V2 P7 stored preregistration comparison',
    )
  ) throw new RangeError('Arena V2 P7 stored preregistration身份或内容发生漂移。');
  return canonical;
}

export const ARENA_V2_P7_PREREGISTRATION_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  targetEnvironmentCount: 6 as const,
  environmentBuildSetIdentityFrozen: true as const,
  humanTaskCount: 6 as const,
  humanSubgroupCount: 2 as const,
  minimumQualifiedParticipantsPerSubgroup: 5 as const,
  longitudinalCheckpointCount: 7 as const,
  minimumQualifiedParticipantsPerTaskOrCheckpoint:
    MINIMUM_QUALIFIED_PARTICIPANTS,
  minimumHumanOverallCompletionRate: 0.9 as const,
  minimumHumanNoHelpExplanationAndSubgroupRate: 0.8 as const,
  minimumTotalScore: 90 as const,
  minimumScorePerDimension: 80 as const,
  thresholdsMustBeFrozenBeforeFirstParticipant: true as const,
  acceptsObservationsOrOutcomes: false as const,
  validatesStoredIdentityAndCanonicalContent: true as const,
  defaultReleaseBundleWired: false as const,
  validationStatus: 'not-run' as const,
});
