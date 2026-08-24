import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOT_PROFILE_REGISTRY,
  BOT_GOAL_ID,
  getArenaBotEvaluators,
  selectHighestUtility,
  type BotPersonality,
} from '@number-strategy-jump/arena-bot';
import {
  cloneBotSourceSnapshot,
  createBotArenaView,
  createBotObservation,
} from '@number-strategy-jump/arena-bot';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';

function testPersonality(
  id: BotPersonality['id'],
  aggression: number,
  patience: number,
  riskTolerance: number,
): BotPersonality {
  return { id, aggression, patience, riskTolerance };
}

test('bot threat evaluation uses the delayed opponent equipment action range', () => {
  const core = createArenaV1MatchCore({
    seed: 55,
    config: {
      preparingTicks: 0,
      equipment: {
        initialSpawns: [{
          id: 'chain-at-opponent',
          definitionId: 'chain',
          position: { x: -1.2, y: 1.02, z: 0 },
        }],
      },
    },
  });
  core.step([{ ...createNeutralInputFrame(0, 'player-1'), primaryPressed: true, primaryHeld: true }]);
  const source = cloneBotSourceSnapshot(core.getLegacyFullSnapshotForAudit());
  const observation = createBotObservation({
    commandSnapshot: source,
    delayedSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(
      core.config.arena,
      core.getCharacterDefinition('player-2').collision.radius,
      core.getCharacterDefinition('player-2').movement.automaticStepHeight,
    ),
  });
  assert.equal(observation.opponentActionRule.definitionId, 'chain-pull');
  assert.ok(observation.opponentActionRule.range > observation.actionRule.range);
  const decision = selectHighestUtility(getArenaBotEvaluators(), {
    observation,
    profile: BOT_PROFILE_REGISTRY.require('hard'),
    personality: testPersonality('survivor', 0, 0, 0.5),
    tickDurationSeconds: core.config.fixedDeltaSeconds,
  });
  assert.equal(decision.goalId, BOT_GOAL_ID.EVADE_THREAT);
  assert.equal(decision.plan.actionCandidate, false);
  core.destroy();
});

test('bot reacts only to publicly observed collapse warnings and uses ordinary movement', () => {
  const core = createArenaV1MatchCore({ seed: 91, config: { preparingTicks: 0 } });
  const beforeWarning = cloneBotSourceSnapshot(core.getLegacyFullSnapshotForAudit());
  const sourceSnapshot = core.getLegacyFullSnapshotForAudit();
  const rawWarning = {
    ...sourceSnapshot,
    map: {
      ...sourceSnapshot.map,
      occurrences: [...sourceSnapshot.map.occurrences, {
        occurrenceId: 'test-collapse:0',
        eventId: 'test-collapse',
        kind: 'collapse-surfaces',
        warningTick: 0,
        startTick: 120,
        endTick: null,
        phase: 'warning',
        publicPayload: { surfaceIds: ['tile-center'] },
        revision: 1,
      }],
      revision: sourceSnapshot.map.revision + 1,
    },
  } as const;
  const withWarning = cloneBotSourceSnapshot(rawWarning);
  const common = {
    commandSnapshot: withWarning,
    selfId: 'player-2',
    arena: createBotArenaView(
      core.config.arena,
      core.getCharacterDefinition('player-2').collision.radius,
      core.getCharacterDefinition('player-2').movement.automaticStepHeight,
    ),
  };
  const delayedObservation = createBotObservation({
    ...common,
    delayedSnapshot: beforeWarning,
  });
  const currentObservation = createBotObservation({
    ...common,
    delayedSnapshot: withWarning,
  });
  const context = {
    profile: BOT_PROFILE_REGISTRY.require('hard'),
    personality: testPersonality('tactician', 0.5, 0.5, 0.5),
    tickDurationSeconds: core.config.fixedDeltaSeconds,
  };
  const delayedDecision = selectHighestUtility(getArenaBotEvaluators(), {
    ...context,
    observation: delayedObservation,
  });
  const currentDecision = selectHighestUtility(getArenaBotEvaluators(), {
    ...context,
    observation: currentObservation,
  });
  assert.notEqual(delayedDecision.goalId, BOT_GOAL_ID.AVOID_MAP_HAZARD);
  assert.equal(currentDecision.goalId, BOT_GOAL_ID.AVOID_MAP_HAZARD);
  assert.equal(currentDecision.plan.actionCandidate, false);
  assert.notEqual(currentDecision.plan.target.x, 0);
  core.destroy();
});

test('hard bot can finish edge recovery on the final center platform', () => {
  const core = createArenaV1MatchCore({ seed: 92, config: { preparingTicks: 0 } });
  const base = core.getLegacyFullSnapshotForAudit();
  const raw = {
    ...base,
    map: {
      ...base.map,
      surfaces: base.map.surfaces.map((surface) => ({
        ...surface,
        enabled: surface.id === 'tile-center',
      })),
    },
    participants: base.participants.map((participant) => participant.id === 'player-2'
      ? {
        ...participant,
        position: { x: 0, y: 1.02, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        grounded: true,
        supportSurfaceId: 'tile-center',
      }
      : participant),
  };
  const source = cloneBotSourceSnapshot(raw);
  const observation = createBotObservation({
    commandSnapshot: source,
    delayedSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(
      core.config.arena,
      core.getCharacterDefinition('player-2').collision.radius,
      core.getCharacterDefinition('player-2').movement.automaticStepHeight,
    ),
  });
  const decision = selectHighestUtility(getArenaBotEvaluators(), {
    observation,
    profile: BOT_PROFILE_REGISTRY.require('hard'),
    personality: testPersonality('survivor', 0.8, 0.5, 0.2),
    tickDurationSeconds: core.config.fixedDeltaSeconds,
  });
  assert.notEqual(decision.goalId, BOT_GOAL_ID.RECOVER_EDGE);
  core.destroy();
});

test('bot treats missing corners of a plus-shaped topology as real outer edges', () => {
  const core = createArenaV1MatchCore({ seed: 93, config: { preparingTicks: 0 } });
  const base = core.getLegacyFullSnapshotForAudit();
  const disabled = new Set([
    'tile-north-west',
    'tile-north-east',
    'tile-south-west',
    'tile-south-east',
  ]);
  const raw = {
    ...base,
    map: {
      ...base.map,
      surfaces: base.map.surfaces.map((surface) => ({
        ...surface,
        enabled: !disabled.has(surface.id),
      })),
    },
    participants: base.participants.map((participant) => participant.id === 'player-2'
      ? {
        ...participant,
        position: { x: 1.8, y: 1.02, z: 4 },
        velocity: { x: 0, y: 0, z: 0 },
        grounded: true,
        supportSurfaceId: 'tile-north',
      }
      : participant),
  };
  const source = cloneBotSourceSnapshot(raw);
  const observation = createBotObservation({
    commandSnapshot: source,
    delayedSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(
      core.config.arena,
      core.getCharacterDefinition('player-2').collision.radius,
      core.getCharacterDefinition('player-2').movement.automaticStepHeight,
    ),
  });
  const decision = selectHighestUtility(getArenaBotEvaluators(), {
    observation,
    profile: BOT_PROFILE_REGISTRY.require('hard'),
    personality: testPersonality('survivor', 0.8, 0.5, 0.2),
    tickDurationSeconds: core.config.fixedDeltaSeconds,
  });
  assert.equal(decision.goalId, BOT_GOAL_ID.RECOVER_EDGE);
  assert.deepEqual(decision.plan.target, { x: 0, y: -0.5, z: 4 });
  core.destroy();
});
