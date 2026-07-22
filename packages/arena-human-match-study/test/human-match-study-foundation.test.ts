import { describe, expect, it } from 'vitest';
import { BOT_DIFFICULTY_ID } from '@number-strategy-jump/arena-bot';
import {
  ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID,
  HumanMatchStudyCaptureSession,
  createArenaStage9HumanFairnessV1Definition,
  createHumanMatchStudyAssignment,
  createHumanMatchStudyDefinition,
  createHumanMatchStudyRecord,
} from '../src/index.js';

function definitionData(): Readonly<Record<string, unknown>> {
  return {
    schemaVersion: 1,
    id: 'human-study-test',
    stage: 'test',
    contentVersion: 1,
    participantPrompt: '完成一局测试。',
    assignmentSeed: 42,
    matchesPerParticipant: 1,
    candidate: {
      balanceDefinitionId: 'balance-test',
      balanceDefinitionHash: '1234abcd',
      botDifficultyProfilesHash: '5678abcd',
      replaySchemaVersion: 1,
    },
    arms: [
      { id: 'easy', difficultyId: BOT_DIFFICULTY_ID.EASY, botStrengthRank: 1, minimumSessionWinRate: 0, maximumSessionWinRate: 1 },
      { id: 'normal', difficultyId: BOT_DIFFICULTY_ID.NORMAL, botStrengthRank: 2, minimumSessionWinRate: 0, maximumSessionWinRate: 1 },
      { id: 'hard', difficultyId: BOT_DIFFICULTY_ID.HARD, botStrengthRank: 3, minimumSessionWinRate: 0, maximumSessionWinRate: 1 },
    ],
    environment: {
      platform: 'web',
      formFactor: 'phone',
      orientation: 'portrait',
      inputMode: 'touch',
    },
    thresholds: {
      minimumEligibleParticipantsPerArm: 1,
      minimumCompletionRate: 0,
      maximumInvalidationRate: 1,
      minimumAggregateSessionWinRate: 0,
      maximumAggregateSessionWinRate: 1,
      maximumAggregateWilsonIntervalWidth: 1,
      minimumExtremeSessionWinRateDelta: 0.1,
      maximumAdjacentSessionWinRateInversion: 1,
      targetMinimumTicks: 1,
      targetMaximumTicks: 10_000,
      minimumTargetDurationShare: 0,
      maximumBotGuessRate: 1,
      minimumFairnessRatingAverage: 1,
      minimumNaturalnessRatingAverage: 1,
      minimumRematchRate: 0,
    },
  };
}

describe('Human Match Study strict foundation', () => {
  it('publishes the frozen Stage 9 study content without changing its accepted hash', () => {
    const definition = createArenaStage9HumanFairnessV1Definition();
    expect(definition.getContentHash()).toBe('484492a6');
    expect(definition.arms.map(({ id }) => id)).toEqual([
      ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID.EASY,
      ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID.NORMAL,
      ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID.HARD,
    ]);
    expect(definition.matchesPerParticipant).toBe(3);
    expect(Object.isFrozen(ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID)).toBe(true);
  });

  it('rejects record accessors without evaluating untrusted code', () => {
    let reads = 0;
    const record = Object.defineProperty({}, 'recordId', {
      enumerable: true,
      get() {
        reads += 1;
        return 'record-accessor';
      },
    });
    expect(() => createHumanMatchStudyRecord(
      createArenaStage9HumanFairnessV1Definition(),
      record,
    )).toThrow(/访问器|数据字段/);
    expect(reads).toBe(0);
  });

  it('publishes one immutable definition with a stable content hash', () => {
    const first = createHumanMatchStudyDefinition(definitionData());
    const second = createHumanMatchStudyDefinition(definitionData());
    expect(first.getContentHash()).toBe(second.getContentHash());
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.arms)).toBe(true);
    expect(first.getArm('normal')?.difficultyId).toBe(BOT_DIFFICULTY_ID.NORMAL);
  });

  it('rejects assignment and capture option accessors without executing them', () => {
    let reads = 0;
    const assignmentOptions = { participantId: 'participant', enrollmentIndex: 0 };
    Object.defineProperty(assignmentOptions, 'definition', {
      enumerable: true,
      get() {
        reads += 1;
        return definitionData();
      },
    });
    expect(() => createHumanMatchStudyAssignment(assignmentOptions)).toThrow(/数据字段/);

    const captureOptions = { definition: definitionData() };
    Object.defineProperty(captureOptions, 'assignment', {
      enumerable: true,
      get() {
        reads += 1;
        return {};
      },
    });
    expect(() => new HumanMatchStudyCaptureSession(captureOptions)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });
});
