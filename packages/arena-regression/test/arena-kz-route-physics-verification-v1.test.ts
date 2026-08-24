import { describe, expect, it } from 'vitest';
import {
  ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1,
  runArenaKzRoutePhysicsVerificationCandidateV1,
} from '../src/arena-kz-route-physics-verification-v1.js';

describe('Arena KZ route physics verification candidate V1', () => {
  it('covers every main path, every branch, two full routes and every re-entry anchor', () => {
    const plan = ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1;
    expect(plan.status).toBe('production-unreachable');
    expect(plan.hardGate).toBe(false);
    expect(plan.scenarios.filter(({ kind }) => kind === 'segment-main')).toHaveLength(12);
    expect(plan.scenarios.filter(({ kind }) => kind === 'segment-branch')).toHaveLength(8);
    expect(plan.scenarios.filter(({ kind }) => kind.startsWith('full-'))).toHaveLength(2);
    expect(new Set(plan.scenarios.map(({ id }) => id)).size).toBe(plan.scenarios.length);
  });

  it('drives the formal map through shared movement and physics using only direction and jump', () => {
    const report = runArenaKzRoutePhysicsVerificationCandidateV1();
    expect(report.candidateStatus).toBe('production-unreachable');
    expect(report.hardGate).toBe(false);
    expect(report.usesSharedPhysics).toBe(true);
    expect(report.usesOnlyDirectionAndJump).toBe(true);
    expect(report.scenarios).toHaveLength(22);
    expect(report.scenarios.every(({ completed }) => completed)).toBe(true);
    expect(report.scenarios.every(({ failedReason }) => failedReason === null)).toBe(true);
    expect(report.reentryScenarios).toHaveLength(16);
    expect(report.reentryScenarios.every(({ grounded, supportSurfaceId, expectedSurfaceId }) => (
      grounded && supportSurfaceId === expectedSurfaceId
    ))).toBe(true);
  });

  it('produces the same report identity on repeated no-render runs', () => {
    const first = runArenaKzRoutePhysicsVerificationCandidateV1();
    const second = runArenaKzRoutePhysicsVerificationCandidateV1();
    expect(second).toEqual(first);
    expect(second.resultHash).toBe(first.resultHash);
  });
});
