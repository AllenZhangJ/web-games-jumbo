import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponProductionMigrationGate } from '../src/index.js';

describe('Arena V2 weapon production migration gate', () => {
  it('keeps all six candidates visible and blocks promotion until every gate is closed', () => {
    const report = runArenaV2WeaponProductionMigrationGate();
    expect(report).toMatchObject({
      candidateCount: 6,
      productionReadyCount: 0,
      blockedCount: 6,
    });
    expect(report.candidates.map(({ candidateId }) => candidateId)).toEqual([
      'launch-01-approach',
      'launch-02-push-away',
      'launch-03-reposition',
      'launch-04-line-pressure',
      'launch-05-read-punish',
      'launch-06-flank',
    ]);
  });

  it('shows the current migration boundary instead of silently promoting research candidates', () => {
    const report = runArenaV2WeaponProductionMigrationGate();
    const production = report.candidates.slice(0, 3);
    const research = report.candidates.slice(3);
    expect(production.every(({ blockers }) => blockers.length > 0)).toBe(true);
    expect(production.every(({ blockers }) => (
      JSON.stringify(blockers) === JSON.stringify(['replay'])
    ))).toBe(true);
    expect(research.every(({ blockers }) => (
      JSON.stringify(blockers) === JSON.stringify([
      'production-definition',
      'formal-action-state',
      'replay',
      'feedback-presentation',
      ])
    ))).toBe(true);
    expect(report.candidates.every(({ gates }) => (
      gates.some(({ gateId, status }) => gateId === 'map-consequence' && status === 'passed')
    ))).toBe(true);
  });

  it('is deterministic and freezes the migration report', () => {
    const first = runArenaV2WeaponProductionMigrationGate();
    expect(first).toEqual(runArenaV2WeaponProductionMigrationGate());
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.candidates)).toBe(true);
    expect(Object.isFrozen(first.candidates[0]!)).toBe(true);
    expect(Object.isFrozen(first.candidates[0]!.gates)).toBe(true);
  });
});
