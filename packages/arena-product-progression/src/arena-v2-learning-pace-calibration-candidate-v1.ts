import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  createArenaV2LearningProfileDefinitionV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
  ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1,
} from './arena-v2-learning-capacity-report-v1.js';
import {
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1,
  aggregateArenaV2RetentionObservationsV1,
  createArenaV2RetentionObservationV1,
} from './arena-v2-retention-observation-v1.js';
import { readExactOptions } from './options.js';

const OPTION_KEYS = new Set(['profileDefinition', 'observations']);
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;

export interface ArenaV2LearningPaceCalibrationCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-capacity-calibration-candidate';
  readonly productionReady: false;
  readonly longitudinalEvidence: 'not-run';
  readonly tickRateHz: number;
  readonly assumedAverageMatchMinutes: number;
  readonly settledMatchCount: number;
  readonly measuredSettledMatchCount: number;
  readonly missingAuthorityDurationCount: number;
  readonly effectiveLearningMatchCount: number;
  readonly effectiveLearningRate: number | null;
  readonly totalAuthorityTicks: number;
  readonly minimumAuthorityMatchTicks: number | null;
  readonly maximumAuthorityMatchTicks: number | null;
  readonly averageAuthorityMatchTicks: number | null;
  readonly averageAuthorityMatchMinutes: number | null;
  readonly averageMinusAssumptionMinutes: number | null;
  readonly meetsFiveMinuteCapacityAssumption: boolean | null;
  readonly weaponMainResearchPointTarget: number;
  readonly idealizedWeaponCollectionHoursAtObservedAverage: number | null;
  readonly idealizedWeaponCollectionDeltaFromTargetHours: number | null;
  readonly meetsTwoHundredHourIdealizedWeaponCapacity: boolean | null;
  readonly minimumMainResearchPointsForTargetAtObservedAverage: number | null;
  readonly minimumCollectionEvidencePerWeaponForTargetAtObservedAverage: number | null;
  readonly estimateKind:
    'observed-authority-duration-if-every-match-awards-one-main-research-point';
  readonly claimsObservedRetention: false;
  readonly containsWallClockTime: false;
}

function addSafeInteger(total: number, value: number, name: string): number {
  const next = total + value;
  if (!Number.isSafeInteger(next)) throw new RangeError(`${name}溢出。`);
  return next;
}

function safeCeilingOrNull(value: number, name: string): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const result = Math.ceil(value);
  if (!Number.isSafeInteger(result)) throw new RangeError(`${name}溢出。`);
  return result;
}

/**
 * Calibrates the static five-minute capacity hypothesis from authoritative
 * match ticks only. It does not change progression and does not claim that
 * every settled match actually awards one main-research point.
 */
export function projectArenaV2LearningPaceCalibrationCandidateV1(
  value: unknown,
): ArenaV2LearningPaceCalibrationCandidateV1 {
  const source = readExactOptions(value, OPTION_KEYS, 'Arena V2学习节奏校准输入');
  const definition = createArenaV2LearningProfileDefinitionV1(source.profileDefinition);
  if (!Array.isArray(source.observations)) {
    throw new TypeError('Arena V2学习节奏校准observations必须是数组。');
  }
  aggregateArenaV2RetentionObservationsV1(source.observations);
  const observations = source.observations.map(createArenaV2RetentionObservationV1);
  const settled = observations.filter(({ kind }) => (
    kind === ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED
  ));
  const measured = settled.filter((entry) => entry.authorityTick !== null);
  const authorityTicks = measured.map(({ authorityTick }) => {
    if (authorityTick === null) {
      throw new Error('Arena V2学习节奏已测样本缺少权威tick。');
    }
    return authorityTick;
  });
  let totalAuthorityTicks = 0;
  let minimumAuthorityMatchTicks: number | null = null;
  let maximumAuthorityMatchTicks: number | null = null;
  for (const authorityTick of authorityTicks) {
    totalAuthorityTicks = addSafeInteger(
      totalAuthorityTicks,
      authorityTick,
      'Arena V2学习节奏总权威tick',
    );
    minimumAuthorityMatchTicks = minimumAuthorityMatchTicks === null
      ? authorityTick
      : Math.min(minimumAuthorityMatchTicks, authorityTick);
    maximumAuthorityMatchTicks = maximumAuthorityMatchTicks === null
      ? authorityTick
      : Math.max(maximumAuthorityMatchTicks, authorityTick);
  }
  const averageAuthorityMatchTicks = measured.length === 0
    ? null
    : totalAuthorityTicks / measured.length;
  const tickRateHz = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;
  const averageAuthorityMatchMinutes = averageAuthorityMatchTicks === null
    ? null
    : averageAuthorityMatchTicks / tickRateHz / SECONDS_PER_MINUTE;
  const weaponMainResearchPointTarget = definition.weaponDefinitionIds.length
    * definition.masteryRequirements.weaponCollectionUseEvidence;
  if (!Number.isSafeInteger(weaponMainResearchPointTarget)
    || weaponMainResearchPointTarget < 1) {
    throw new RangeError('Arena V2学习节奏武器主研究总目标无效。');
  }
  const effectiveLearningMatchCount = settled.reduce(
    (total, entry) => total + entry.numeratorIncrement,
    0,
  );
  const usableAverageAuthorityMatchMinutes = averageAuthorityMatchMinutes !== null
    && averageAuthorityMatchMinutes > 0
    ? averageAuthorityMatchMinutes
    : null;
  const idealizedWeaponCollectionHoursAtObservedAverage =
    usableAverageAuthorityMatchMinutes === null
      ? null
      : usableAverageAuthorityMatchMinutes
        * weaponMainResearchPointTarget / MINUTES_PER_HOUR;
  const minimumMainResearchPointsForTargetAtObservedAverage =
    usableAverageAuthorityMatchMinutes === null
      ? null
      : safeCeilingOrNull(
        ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1
          / usableAverageAuthorityMatchMinutes,
        'Arena V2达到目标时长所需武器主研究总点数',
      );
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'offline-capacity-calibration-candidate' as const,
    productionReady: false as const,
    longitudinalEvidence: 'not-run' as const,
    tickRateHz,
    assumedAverageMatchMinutes: ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
    settledMatchCount: settled.length,
    measuredSettledMatchCount: measured.length,
    missingAuthorityDurationCount: settled.length - measured.length,
    effectiveLearningMatchCount,
    effectiveLearningRate: settled.length === 0
      ? null
      : effectiveLearningMatchCount / settled.length,
    totalAuthorityTicks,
    minimumAuthorityMatchTicks,
    maximumAuthorityMatchTicks,
    averageAuthorityMatchTicks,
    averageAuthorityMatchMinutes,
    averageMinusAssumptionMinutes: averageAuthorityMatchMinutes === null
      ? null
      : averageAuthorityMatchMinutes
        - ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
    meetsFiveMinuteCapacityAssumption: averageAuthorityMatchMinutes === null
      ? null
      : averageAuthorityMatchMinutes
        >= ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
    weaponMainResearchPointTarget,
    idealizedWeaponCollectionHoursAtObservedAverage,
    idealizedWeaponCollectionDeltaFromTargetHours:
      idealizedWeaponCollectionHoursAtObservedAverage === null
        ? null
        : idealizedWeaponCollectionHoursAtObservedAverage
          - ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1 / MINUTES_PER_HOUR,
    meetsTwoHundredHourIdealizedWeaponCapacity:
      idealizedWeaponCollectionHoursAtObservedAverage === null
        ? null
        : idealizedWeaponCollectionHoursAtObservedAverage
          >= ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1 / MINUTES_PER_HOUR,
    minimumMainResearchPointsForTargetAtObservedAverage,
    minimumCollectionEvidencePerWeaponForTargetAtObservedAverage:
      minimumMainResearchPointsForTargetAtObservedAverage === null
        ? null
        : Math.ceil(
          minimumMainResearchPointsForTargetAtObservedAverage
            / definition.weaponDefinitionIds.length,
        ),
    estimateKind:
      'observed-authority-duration-if-every-match-awards-one-main-research-point' as const,
    claimsObservedRetention: false as const,
    containsWallClockTime: false as const,
  });
}

export const ARENA_V2_LEARNING_PACE_CALIBRATION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSinkWired: false as const,
  mutatesProfileOrProgression: false as const,
  consumesAuthorityTicksOnly: true as const,
  preservesFiveMinuteCapacityAsHypothesis: true as const,
  calculatesThresholdDecisionFactsWithoutMutatingThreshold: true as const,
  idealizedHoursDoNotClaimObservedRetention: true as const,
  validationStatus: 'not-run' as const,
});
