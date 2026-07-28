import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY,
  auditArenaV2WeaponValueChain,
  createArenaV2WeaponValueChainAuditReport,
} from '../src/index.js';

describe('Arena V2 weapon value-chain audit', () => {
  it('passes the six deep research cases through all six structural gates', () => {
    const report = createArenaV2WeaponValueChainAuditReport();
    expect(report).toMatchObject({
      caseCount: 6,
      passedCount: 6,
      blockedCount: 0,
      allCasesPass: true,
    });
    expect(report.cases.every(({ gates }) => (
      gates.length === 6 && gates.every(({ status, missing }) => (
        status === 'passed' && missing.length === 0
      ))
    ))).toBe(true);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.cases)).toBe(true);
  });

  it('blocks a case when action identity, failure cost or counterplay is removed', () => {
    const sourceMove = ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY.moves[0]!;
    const incomplete = {
      ...ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY,
      moves: Object.freeze([{
        ...sourceMove,
        id: '',
        counterplay: '',
        failureCost: '',
      }]),
    };
    const audit = auditArenaV2WeaponValueChain(incomplete);
    expect(audit.allGatesPassed).toBe(false);
    expect(audit.gates.find(({ gateId }) => gateId === 'action-identity')).toMatchObject({
      status: 'blocked',
    });
    expect(audit.gates.find(({ gateId }) => gateId === 'failure-cost')).toMatchObject({
      status: 'blocked',
    });
    expect(audit.gates.find(({ gateId }) => gateId === 'counterplay-feedback')).toMatchObject({
      status: 'blocked',
    });
  });
});
