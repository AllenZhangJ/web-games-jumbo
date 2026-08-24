import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_P7_HUMAN_TASKS_CANDIDATE_V1,
  ARENA_V2_P7_HUMAN_SUBGROUP_IDS_CANDIDATE_V1,
  ARENA_V2_P7_HUMAN_SUBGROUPS_CANDIDATE_V1,
  ARENA_V2_P7_LONGITUDINAL_CHECKPOINT_HOURS_CANDIDATE_V1,
  ARENA_V2_P7_SCORE_DIMENSIONS_CANDIDATE_V1,
  ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1,
  createArenaV2P7PreregistrationCandidateV1,
  validateArenaV2P7PreregistrationCandidateV1,
} from '../src/index.js';

function options() {
  return {
    sourceCommit: 'a'.repeat(40),
    sourceDirty: false as const,
    contentIdentityHash: '1234abcd',
    environmentBuilds: ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1.map(({ id }, index) => ({
      environmentId: id,
      buildIdentitySha256: String(index + 1).repeat(64),
    })),
    humanTaskThresholds: ARENA_V2_P7_HUMAN_TASKS_CANDIDATE_V1.map(({ id }) => ({
      taskId: id,
      minimumQualifiedParticipants: 10,
      minimumOverallCompletionRate: 0.9,
      minimumNoVerbalHelpRate: 0.8,
      minimumExplanationRate: 0.8,
      minimumSubgroupRate: 0.8,
    })),
    longitudinalThresholds:
      ARENA_V2_P7_LONGITUDINAL_CHECKPOINT_HOURS_CANDIDATE_V1.map((hours) => ({
        checkpointHours: hours,
        minimumQualifiedParticipants: 10,
        minimumActiveGoalRate: 0.8,
        minimumGoalCompletionRate: 0.7,
        minimumCrossWeaponOrMapUseRate: 0.6,
      })),
  };
}

describe('Arena V2 P7 preregistration candidate V1', () => {
  it('freezes six target builds, six tasks, seven checkpoints and the 100-point score', () => {
    const first = createArenaV2P7PreregistrationCandidateV1(options());
    const second = createArenaV2P7PreregistrationCandidateV1(options());

    expect(first.environmentBuilds).toHaveLength(6);
    expect(first.environmentBuildSetIdentityHash).toMatch(/^[0-9a-f]{8}$/u);
    expect(first.humanTasks).toHaveLength(6);
    expect(first.humanSubgroups).toEqual(ARENA_V2_P7_HUMAN_SUBGROUPS_CANDIDATE_V1);
    expect(ARENA_V2_P7_HUMAN_SUBGROUP_IDS_CANDIDATE_V1).toEqual([
      'experienced', 'novice',
    ]);
    expect(first.humanSubgroups.map(({ classificationRule }) => classificationRule)).toEqual([
      {
        questionnaireFieldId:
          'relevant-platform-fighting-or-kz-experience-hours-before-first-session',
        operator: 'greater-than-or-equal', thresholdHours: 20,
      },
      {
        questionnaireFieldId:
          'relevant-platform-fighting-or-kz-experience-hours-before-first-session',
        operator: 'less-than', thresholdHours: 20,
      },
    ]);
    expect(first.releaseGates.minimumQualifiedParticipantsPerSubgroup).toBe(5);
    expect(
      first.releaseGates.mediumAndLowRequireNamedOwnerImpactScopeAndAcceptanceReason,
    ).toBe(true);
    expect(first.longitudinalCheckpointHours).toEqual([0.5, 1, 10, 30, 60, 120, 200]);
    expect(ARENA_V2_P7_SCORE_DIMENSIONS_CANDIDATE_V1.reduce(
      (sum, dimension) => sum + dimension.weight,
      0,
    )).toBe(100);
    expect(first.preregistrationIdentityHash).toBe(second.preregistrationIdentityHash);
    expect(first.environmentBuildSetIdentityHash).toBe(
      second.environmentBuildSetIdentityHash,
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.humanTaskThresholds)).toBe(true);
    expect(first.releaseGates.blockingDefectMaximum).toBe(0);
    expect(first.releaseGates.highDefectMaximum).toBe(0);
    expect(first.releaseGates.minimumTotalScore).toBe(90);
    expect(first.releaseGates.minimumScorePerDimension).toBe(80);
    expect(validateArenaV2P7PreregistrationCandidateV1(first)).toEqual(first);
  });

  it('fails closed on dirty source, missing coverage, reordered targets and future fields', () => {
    expect(() => createArenaV2P7PreregistrationCandidateV1({
      ...options(),
      sourceDirty: true,
    })).toThrow(/clean source/);

    expect(() => createArenaV2P7PreregistrationCandidateV1({
      ...options(),
      environmentBuilds: options().environmentBuilds.slice(0, 5),
    })).toThrow(/精确覆盖6项/);

    expect(() => createArenaV2P7PreregistrationCandidateV1({
      ...options(),
      environmentBuilds: [...options().environmentBuilds].reverse(),
    })).toThrow(/冻结顺序/);

    const wrongIdentityType = options();
    expect(() => createArenaV2P7PreregistrationCandidateV1({
      ...wrongIdentityType,
      environmentBuilds: [
        { ...wrongIdentityType.environmentBuilds[0], environmentId: 1 },
        ...wrongIdentityType.environmentBuilds.slice(1),
      ],
    })).toThrow(/environmentId/);

    const stringCheckpoint = options();
    expect(() => createArenaV2P7PreregistrationCandidateV1({
      ...stringCheckpoint,
      longitudinalThresholds: [
        { ...stringCheckpoint.longitudinalThresholds[0], checkpointHours: '0.5' },
        ...stringCheckpoint.longitudinalThresholds.slice(1),
      ],
    })).toThrow(/checkpointHours/);

    expect(() => createArenaV2P7PreregistrationCandidateV1({
      ...options(),
      futureField: true,
    })).toThrow(/未知字段|known/i);
  });

  it('does not allow weak sample or human-readability thresholds to masquerade as flagship', () => {
    const weakSample = options();
    weakSample.humanTaskThresholds[0] = {
      ...weakSample.humanTaskThresholds[0]!,
      minimumQualifiedParticipants: 9,
    };
    expect(() => createArenaV2P7PreregistrationCandidateV1(weakSample)).toThrow(/10/);

    const weakCompletion = options();
    weakCompletion.humanTaskThresholds[0] = {
      ...weakCompletion.humanTaskThresholds[0]!,
      minimumOverallCompletionRate: 0.89,
    };
    expect(() => createArenaV2P7PreregistrationCandidateV1(weakCompletion)).toThrow(/不得低于0.9/);

    const zeroLongitudinalGate = options();
    zeroLongitudinalGate.longitudinalThresholds[0] = {
      ...zeroLongitudinalGate.longitudinalThresholds[0]!,
      minimumActiveGoalRate: 0,
    };
    expect(() => createArenaV2P7PreregistrationCandidateV1(
      zeroLongitudinalGate,
    )).toThrow(/不能用0规避/);
  });

  it('rejects accessors before executing them', () => {
    let reads = 0;
    const value = Object.defineProperty({}, 'sourceCommit', {
      enumerable: true,
      get() {
        reads += 1;
        return 'a'.repeat(40);
      },
    });

    expect(() => createArenaV2P7PreregistrationCandidateV1(value)).toThrow();
    expect(reads).toBe(0);
  });

  it('rejects stored preregistration identity, threshold or canonical catalog drift', () => {
    const registration = createArenaV2P7PreregistrationCandidateV1(options());
    expect(() => validateArenaV2P7PreregistrationCandidateV1({
      ...registration,
      preregistrationIdentityHash: 'deadbeef',
    })).toThrow(/漂移/);
    expect(() => validateArenaV2P7PreregistrationCandidateV1({
      ...registration,
      humanTaskThresholds: registration.humanTaskThresholds.map((threshold, index) => (
        index === 0 ? { ...threshold, minimumOverallCompletionRate: 0.95 } : threshold
      )),
    })).toThrow(/漂移/);
    expect(() => validateArenaV2P7PreregistrationCandidateV1({
      ...registration,
      humanTasks: [...registration.humanTasks].reverse(),
    })).toThrow(/漂移/);
    expect(() => validateArenaV2P7PreregistrationCandidateV1({
      ...registration,
      humanSubgroups: registration.humanSubgroups.map((subgroup, index) => (
        index === 0
          ? {
            ...subgroup,
            classificationRule: { ...subgroup.classificationRule, thresholdHours: 21 },
          }
          : subgroup
      )),
    })).toThrow(/漂移/);
  });
});
