import { describe, expect, it } from 'vitest';
import {
  RACE_MODE_PREPARING_TICKS_V1,
  type ModeMatchRuntimeV6ModeOptions,
} from '@number-strategy-jump/arena-match';
import { createArenaModeVerificationFixtureV1 } from '../src/arena-mode-verification-fixture-v1.js';
import type { ArenaModeVerificationRunRequestV1 } from '../src/arena-mode-verification-runner-v1.js';

function request(
  modeKind: 'duel' | 'race' | 'survival',
  profile: 'correctness' | 'long-run' = 'correctness',
  participantCount = modeKind === 'survival' ? 5 : 2,
): ArenaModeVerificationRunRequestV1 {
  return {
    caseId: `arena.p2.${profile}.${modeKind}`,
    profile,
    modeKind,
    modeDefinitionId: `arena.mode.${modeKind}.v6`,
    fixtureDefinitionId: modeKind === 'duel' ? null : `arena.mode.${modeKind}.test.fixture.v1`,
    participantCount,
    enemySlotCount: modeKind === 'survival' ? participantCount - 1 : 0,
    matchSeed: 17,
    runnerTickBudget: profile === 'long-run' ? 108_000 : 1_000,
    rematchCount: 1,
  };
}

function fixtureOf(mode: ModeMatchRuntimeV6ModeOptions): Record<string, unknown> {
  if (mode.kind === 'duel') throw new Error('Duel没有fixture。');
  return mode.fixture as Record<string, unknown>;
}

describe('Arena Mode verification fixture V1 production-unreachable candidate', () => {
  it.each([
    ['duel', 2],
    ['race', 2],
    ['race', 3],
    ['race', 4],
    ['survival', 5],
    ['survival', 9],
    ['survival', 13],
    ['survival', 17],
  ] as const)('builds an exact %s fixture for %i participants', (modeKind, count) => {
    const created = createArenaModeVerificationFixtureV1(request(modeKind, 'correctness', count));
    expect(created.config.participantAssignments).toHaveLength(count);
    expect(created.config.modeKind).toBe(modeKind);
    expect(created.candidateStatus).toBe('production-unreachable');
    expect(created.localParticipantId).toBe('participant-01');
    expect(created.mode.kind).toBe(modeKind);
  });

  it('derives long-run terminal ticks from the registered runner budget', () => {
    const race = createArenaModeVerificationFixtureV1(request('race', 'long-run', 4));
    const survival = createArenaModeVerificationFixtureV1(request('survival', 'long-run', 5));
    expect(race.terminalAuthorityTick).toBe(107_999);
    expect(fixtureOf(race.mode).hardLimitActiveTicks).toBe(
      107_999 - RACE_MODE_PREPARING_TICKS_V1,
    );
    expect(survival.terminalAuthorityTick).toBe(107_999);
    expect(fixtureOf(survival.mode).hardLimitActiveTicks).toBe(107_999);
  });

  it('keeps unresolved balance values isolated inside explicit test fixtures', () => {
    for (const modeKind of ['race', 'survival'] as const) {
      const created = createArenaModeVerificationFixtureV1(request(modeKind));
      expect(fixtureOf(created.mode).fixtureDefinitionId).toContain('.test.');
      expect(JSON.stringify(created.mode)).toContain('.test');
    }
  });

  it('rejects hostile matrix and future fields before creating a fixture', () => {
    expect(() => createArenaModeVerificationFixtureV1({
      ...request('survival'),
      participantCount: 5,
      enemySlotCount: 16,
    })).toThrow(/participant\/slot/);
    expect(() => createArenaModeVerificationFixtureV1({
      ...request('race'),
      future: true,
    })).toThrow(/future/);
  });
});
