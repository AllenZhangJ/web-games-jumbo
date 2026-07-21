import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBotDifficultyProfile,
  selectHighestUtility,
} from '@number-strategy-jump/arena-bot';
import { BOT_GOAL_ID, getArenaBotEvaluators } from '../../src/arena/ai/bot-goals.js';
import {
  cloneBotSourceSnapshot,
  createBotArenaView,
  createBotObservation,
} from '../../src/arena/ai/bot-observation.js';
import { createArenaV1MatchCore } from '../../src/arena/arena-v1-match-core.js';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';

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
  const source = cloneBotSourceSnapshot(core.getSnapshot());
  const observation = createBotObservation({
    commandSnapshot: source,
    delayedSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.getCharacterDefinition('player-2').collision.radius),
  });
  assert.equal(observation.opponentActionRule.definitionId, 'chain-pull');
  assert.ok(observation.opponentActionRule.range > observation.actionRule.range);
  const decision = selectHighestUtility(getArenaBotEvaluators(), {
    observation,
    profile: getBotDifficultyProfile('hard'),
    personality: { aggression: 0, patience: 0, riskTolerance: 0.5 },
  });
  assert.equal(decision.goalId, BOT_GOAL_ID.EVADE_THREAT);
  assert.equal(decision.plan.actionCandidate, false);
  core.destroy();
});

test('bot reacts only to publicly observed collapse warnings and uses ordinary movement', () => {
  const core = createArenaV1MatchCore({ seed: 91, config: { preparingTicks: 0 } });
  const beforeWarning = cloneBotSourceSnapshot(core.getSnapshot());
  const rawWarning = core.getSnapshot();
  rawWarning.map.occurrences.push({
    occurrenceId: 'test-collapse:0',
    eventId: 'test-collapse',
    kind: 'collapse-surfaces',
    warningTick: 0,
    startTick: 120,
    endTick: null,
    phase: 'warning',
    publicPayload: { surfaceIds: ['tile-center'] },
    revision: 1,
  });
  rawWarning.map.revision += 1;
  const withWarning = cloneBotSourceSnapshot(rawWarning);
  const common = {
    commandSnapshot: withWarning,
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.getCharacterDefinition('player-2').collision.radius),
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
    profile: getBotDifficultyProfile('hard'),
    personality: { aggression: 0.5, patience: 0.5, riskTolerance: 0.5 },
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
  const raw = core.getSnapshot();
  for (const surface of raw.map.surfaces) surface.enabled = surface.id === 'tile-center';
  const self = raw.participants.find(({ id }) => id === 'player-2');
  self.position = { x: 0, y: 1.02, z: 0 };
  self.velocity = { x: 0, y: 0, z: 0 };
  self.grounded = true;
  self.supportSurfaceId = 'tile-center';
  const source = cloneBotSourceSnapshot(raw);
  const observation = createBotObservation({
    commandSnapshot: source,
    delayedSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.getCharacterDefinition('player-2').collision.radius),
  });
  const decision = selectHighestUtility(getArenaBotEvaluators(), {
    observation,
    profile: getBotDifficultyProfile('hard'),
    personality: { aggression: 0.8, patience: 0.5, riskTolerance: 0.2 },
  });
  assert.notEqual(decision.goalId, BOT_GOAL_ID.RECOVER_EDGE);
  core.destroy();
});

test('bot treats missing corners of a plus-shaped topology as real outer edges', () => {
  const core = createArenaV1MatchCore({ seed: 93, config: { preparingTicks: 0 } });
  const raw = core.getSnapshot();
  const disabled = new Set([
    'tile-north-west',
    'tile-north-east',
    'tile-south-west',
    'tile-south-east',
  ]);
  for (const surface of raw.map.surfaces) surface.enabled = !disabled.has(surface.id);
  const self = raw.participants.find(({ id }) => id === 'player-2');
  self.position = { x: 1.8, y: 1.02, z: 4 };
  self.velocity = { x: 0, y: 0, z: 0 };
  self.grounded = true;
  self.supportSurfaceId = 'tile-north';
  const source = cloneBotSourceSnapshot(raw);
  const observation = createBotObservation({
    commandSnapshot: source,
    delayedSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.getCharacterDefinition('player-2').collision.radius),
  });
  const decision = selectHighestUtility(getArenaBotEvaluators(), {
    observation,
    profile: getBotDifficultyProfile('hard'),
    personality: { aggression: 0.8, patience: 0.5, riskTolerance: 0.2 },
  });
  assert.equal(decision.goalId, BOT_GOAL_ID.RECOVER_EDGE);
  assert.deepEqual(decision.plan.target, { x: 0, y: -0.5, z: 4 });
  core.destroy();
});
