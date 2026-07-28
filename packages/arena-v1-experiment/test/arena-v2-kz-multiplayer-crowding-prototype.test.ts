import { describe, expect, it } from 'vitest';
import { runArenaV2KzMultiplayerCrowdingPrototype } from '../src/index.js';

describe('Arena V2 KZ multiplayer crowding prototype', () => {
  it('runs a deterministic 2–4 participant crowding matrix on the shared Rule/Physics path', () => {
    const first = runArenaV2KzMultiplayerCrowdingPrototype();
    const second = runArenaV2KzMultiplayerCrowdingPrototype();

    expect(first).toEqual(second);
    expect(first.productionStatus).toBe('research-only');
    expect(first.usesSharedRuleAndPhysics).toBe(true);
    expect(first.participantCounts).toEqual([2, 3, 4]);
    expect(first.branchCount).toBe(4);
    expect(first.candidateCount).toBe(5);
    expect(first.probeCount).toBe(60);
    expect(first.probes).toHaveLength(60);
    expect(first.summaries).toHaveLength(4);
    expect(first.probes.every(({ targetCount, participantCount }) => (
      targetCount === participantCount - 1
    ))).toBe(true);
    expect(first.probes.every(({ reentry }) => (
      reentry?.respawnWaitTicks === 180 && reentry.reentryReadable
    ))).toBe(true);
  });

  it('shows that narrow branch geometry creates crowding and multi-target feedback cases', () => {
    const result = runArenaV2KzMultiplayerCrowdingPrototype();
    const summaryById = new Map(result.summaries.map((summary) => [summary.branchId, summary]));

    expect(summaryById.get('maze-direct-low')).toMatchObject({
      estimatedLaneCapacity: 1,
      crowdingOverflowCounts: { '2': 0, '3': 5, '4': 5 },
      ambiguousFeedbackCount: 9,
      readableReentryCount: 15,
    });
    expect(summaryById.get('maze-recovery-high')).toMatchObject({
      estimatedLaneCapacity: 2,
      crowdingOverflowCounts: { '2': 0, '3': 0, '4': 5 },
    });
    expect(summaryById.get('wire-centerline')).toMatchObject({
      estimatedLaneCapacity: 1,
      crowdingOverflowCounts: { '2': 0, '3': 5, '4': 5 },
    });
    expect(summaryById.get('wire-edge-cut')).toMatchObject({
      estimatedLaneCapacity: 1,
      crowdingOverflowCounts: { '2': 0, '3': 5, '4': 5 },
    });
    expect(result.probes.filter(({ multipleTargetHit }) => multipleTargetHit)).toHaveLength(37);
    expect(result.probes.some(({ targetResults }) => targetResults.some(({ targetFell }) => targetFell))).toBe(true);
    expect(result.probes.some(({ targetResults }) => targetResults.some(({ feedback }) => (
      feedback.kind === 'hit-ring-out'
    )))).toBe(true);
    expect(result.probes.some(({ targetResults }) => targetResults.some(({ feedback }) => (
      feedback.kind === 'hit-surface-transfer'
    )))).toBe(true);
    expect(result.probes.some(({ targetResults }) => targetResults.some(({ feedback }) => (
      feedback.kind === 'attack-evaded'
    )))).toBe(true);
  });
});
