import { describe, expect, it } from 'vitest';
import { runArenaV2KzBranchWeaponConsequencePrototype } from '../src/index.js';

describe('Arena V2 KZ branch weapon consequence prototype', () => {
  it('runs all researched weapon languages across every branch and response', () => {
    const first = runArenaV2KzBranchWeaponConsequencePrototype();
    const second = runArenaV2KzBranchWeaponConsequencePrototype();

    expect(first).toEqual(second);
    expect(first.productionStatus).toBe('research-only');
    expect(first.usesSharedRuleAndPhysics).toBe(true);
    expect(first.branchCount).toBe(4);
    expect(first.candidateCount).toBe(5);
    expect(first.responsePolicies).toEqual(['hold', 'step-out', 'jump']);
    expect(first.attackPoints).toEqual(['entry', 'turn', 'exit']);
    expect(first.probeCount).toBe(180);
    expect(first.summaries).toHaveLength(4);
    expect(first.attackPointSummaries).toHaveLength(12);
    expect(first.attackPointSummaries.every(({ probeCount }) => probeCount === 15)).toBe(true);
    expect(new Set(first.probes.map(({ branchId }) => branchId))).toEqual(new Set([
      'maze-direct-low',
      'maze-recovery-high',
      'wire-centerline',
      'wire-edge-cut',
    ]));
  }, 20_000);

  it('shows that branch geometry changes weapon consequences instead of only changing labels', () => {
    const result = runArenaV2KzBranchWeaponConsequencePrototype();
    const summaryById = new Map(result.summaries.map((summary) => [summary.branchId, summary]));
    const mazeDirect = summaryById.get('maze-direct-low');
    const mazeRecovery = summaryById.get('maze-recovery-high');
    const wireCenterline = summaryById.get('wire-centerline');
    const wireEdge = summaryById.get('wire-edge-cut');

    expect(mazeDirect?.surfaceDepth).toBe(1.64);
    expect(mazeRecovery?.surfaceDepth).toBe(1.8);
    expect(wireCenterline?.surfaceDepth).toBe(1.4);
    expect(wireEdge?.surfaceDepth).toBe(0.4);
    expect(mazeDirect?.ringOutCount).not.toBe(mazeRecovery?.ringOutCount);
    expect(wireCenterline?.ringOutCount).not.toBe(wireEdge?.ringOutCount);
    expect(result.probes.some(({ feedback }) => feedback.kind === 'hit-ring-out')).toBe(true);
    expect(result.probes.some(({ feedback }) => feedback.kind === 'hit-surface-transfer')).toBe(true);
    expect(result.probes.some(({ feedback }) => feedback.kind === 'movement-fall')).toBe(true);
    expect(result.probes.some(({ warningZone }) => warningZone !== null)).toBe(true);
    expect(result.probes.some(({ jumpStarted }) => jumpStarted)).toBe(true);
    const mazeDirectPoints = result.attackPointSummaries.filter(({ branchId }) => branchId === 'maze-direct-low');
    expect(mazeDirectPoints.map(({ attackPoint }) => attackPoint)).toEqual(['entry', 'turn', 'exit']);
    expect(new Set(mazeDirectPoints.map(({ surfaceWaypointIndex }) => surfaceWaypointIndex)).size).toBe(3);
    expect(mazeDirectPoints.find(({ attackPoint }) => attackPoint === 'turn')?.surfaceTransferCount)
      .toBeGreaterThan(mazeDirectPoints.find(({ attackPoint }) => attackPoint === 'entry')?.surfaceTransferCount ?? -1);
    expect(result.probes.some(({ attackPoint }) => attackPoint === 'entry')).toBe(true);
    expect(result.probes.some(({ attackPoint }) => attackPoint === 'turn')).toBe(true);
    expect(result.probes.some(({ attackPoint }) => attackPoint === 'exit')).toBe(true);
  });
});
