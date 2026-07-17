import test from 'node:test';
import assert from 'node:assert/strict';
import { getBotDifficultyProfile } from '../../src/arena/ai/bot-difficulty.js';
import { BOT_GOAL_ID, getArenaBotEvaluators } from '../../src/arena/ai/bot-goals.js';
import {
  cloneBotSourceSnapshot,
  createBotArenaView,
  createBotObservation,
} from '../../src/arena/ai/bot-observation.js';
import { selectHighestUtility } from '../../src/arena/ai/utility-arbitrator.js';
import { createArenaV1MatchCore } from '../../src/arena/arena-v1-match-core.js';
import { createNeutralInputFrame } from '../../src/arena/input-frame.js';

test('bot threat evaluation uses the delayed opponent equipment action range', () => {
  const core = createArenaV1MatchCore({
    seed: 55,
    config: {
      preparingTicks: 0,
      equipment: {
        initialSpawns: [{
          id: 'chain-at-opponent',
          definitionId: 'chain',
          position: { x: -2.4, y: 1.02, z: 0 },
        }],
      },
    },
  });
  core.step([{ ...createNeutralInputFrame(0, 'player-1'), actionPressed: true, actionHeld: true }]);
  const source = cloneBotSourceSnapshot(core.getSnapshot());
  const observation = createBotObservation({
    commandSnapshot: source,
    delayedSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.config.character.radius),
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
