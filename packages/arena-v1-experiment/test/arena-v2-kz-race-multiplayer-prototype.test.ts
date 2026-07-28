import { describe, expect, it } from 'vitest';
import { runArenaV2KzRaceMultiplayerPrototype } from '../src/index.js';

describe('Arena V2 KZ multiplayer race prototype', () => {
  it('runs deterministic 2–4 participant finish flows with a real countdown and winner', () => {
    const first = runArenaV2KzRaceMultiplayerPrototype();
    const second = runArenaV2KzRaceMultiplayerPrototype();
    const finishProbes = first.probes.filter(({ scenario }) => scenario === 'finish');

    expect(first).toEqual(second);
    expect(first.productionStatus).toBe('research-only');
    expect(first.usesSharedRuleAndPhysics).toBe(true);
    expect(first.participantCounts).toEqual([2, 3, 4]);
    expect(first.scenarios).toEqual(['finish', 'hit-reentry']);
    expect(first.probeCount).toBe(6);
    expect(finishProbes).toHaveLength(3);
    expect(finishProbes.every(({ phase, winnerId, winnerFinishTick, participantResults }) => (
      phase === 'finished'
      && winnerId !== null
      && winnerFinishTick !== null
      && participantResults.every(({ status, finishTick }) => (
        status === 'finished' && finishTick !== null
      ))
    ))).toBe(true);
    expect(finishProbes.every(({ raceStartTick, events }) => (
      raceStartTick === 60 && events.some(({ kind, tick }) => (
        kind === 'countdown-finished' && tick === 60
      ))
    ))).toBe(true);
  });

  it('keeps attack, ring-out and exact safe-position reentry as observed research outcomes', () => {
    const result = runArenaV2KzRaceMultiplayerPrototype();
    const attackProbes = result.probes.filter(({ scenario }) => scenario === 'hit-reentry');
    const threeParticipantProbe = attackProbes.find(({ participantCount }) => participantCount === 3);
    const fourParticipantProbe = attackProbes.find(({ participantCount }) => participantCount === 4);

    expect(attackProbes).toHaveLength(3);
    expect(attackProbes.every(({ attackWeaponId, attackAttemptTick }) => (
      attackWeaponId === 'shield' && attackAttemptTick !== null
    ))).toBe(true);
    expect(attackProbes.some(({ attackHitTick }) => attackHitTick !== null)).toBe(true);
    expect(threeParticipantProbe).toMatchObject({
      attackHitTick: 336,
      attackHitTargetId: 'kz-race-player-3',
    });
    expect(threeParticipantProbe?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'fell', participantId: 'kz-race-player-3' }),
      expect.objectContaining({ kind: 'respawned', participantId: 'kz-race-player-3', tick: 581 }),
    ]));
    const respawned = threeParticipantProbe?.participantResults.find(({ respawnCount }) => respawnCount > 0);
    expect(respawned).toMatchObject({
      respawnCount: 1,
      respawnTick: 581,
      respawnSurfaceId: 'surface-05-narrow',
      respawnPositionError: 0,
    });
    expect(fourParticipantProbe?.events.filter(({ kind }) => kind === 'attack-hit')).toHaveLength(2);
    expect(result.probes.every(({ respawnWaitTicks }) => respawnWaitTicks === 180)).toBe(true);
  });
});
