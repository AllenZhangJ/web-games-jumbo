import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '../../src/arena/arena-v1-match-core.js';
import {
  cloneBotSourceSnapshot,
  createBotArenaView,
  createBotObservation,
} from '../../src/arena/ai/bot-observation.js';

test('BotObservation exposes only public delayed opponent state and is deeply frozen', () => {
  const core = createArenaV1MatchCore({ seed: 9, config: { preparingTicks: 0 } });
  const source = cloneBotSourceSnapshot(core.getSnapshot());
  const observation = createBotObservation({
    commandSnapshot: source,
    delayedSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.config.character.radius),
  });
  assert.equal(observation.self.id, 'player-2');
  assert.equal(observation.opponent.id, 'player-1');
  assert.equal(observation.matchSeed, undefined);
  assert.equal(observation.configHash, undefined);
  assert.equal(observation.rngStates, undefined);
  assert.equal(observation.opponent.lastHitBy, undefined);
  assert.equal(observation.opponent.lastHitTick, undefined);
  assert.equal(observation.equipment.length, 3);
  assert.equal(observation.equipment[0].originPosition, undefined);
  assert.equal(observation.equipment[0].revision, undefined);
  assert.equal(observation.self.equipment, null);
  assert.ok(Object.isFrozen(observation));
  assert.ok(Object.isFrozen(observation.opponent.position));
  assert.ok(Object.isFrozen(observation.equipment[0].position));
  assert.throws(() => { observation.opponent.position.x = 999; }, TypeError);
  core.destroy();
});

test('BotObservation delays world equipment and opponent ownership but keeps self state current', () => {
  const core = createArenaV1MatchCore({
    seed: 31,
    config: {
      preparingTicks: 0,
      equipment: {
        initialSpawns: [{
          id: 'pickup-now',
          definitionId: 'hammer',
          position: { x: -1.2, y: 1.02, z: 0 },
        }],
      },
    },
  });
  const beforePickup = cloneBotSourceSnapshot(core.getSnapshot());
  core.step([]);
  const afterPickup = cloneBotSourceSnapshot(core.getSnapshot());
  const common = {
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.config.character.radius),
  };
  const delayed = createBotObservation({
    ...common,
    commandSnapshot: afterPickup,
    delayedSnapshot: beforePickup,
  });
  assert.equal(delayed.equipment.length, 1);
  assert.equal(delayed.opponent.equipment, null);
  assert.equal(delayed.opponentActionRule.definitionId, 'base-push');
  assert.equal(delayed.self.equipment, null);

  const current = createBotObservation({
    ...common,
    commandSnapshot: afterPickup,
    delayedSnapshot: afterPickup,
  });
  assert.equal(current.equipment.length, 0);
  assert.equal(current.opponent.equipment.definitionId, 'hammer');
  assert.equal(current.opponentActionRule.definitionId, 'hammer-smash');
  assert.equal(current.opponentActionRule.range, 1.8);
  core.destroy();
});

test('BotObservation rejects future information', () => {
  const core = createArenaV1MatchCore({ seed: 4, config: { preparingTicks: 0 } });
  const earlier = cloneBotSourceSnapshot(core.getSnapshot());
  core.step([]);
  const later = cloneBotSourceSnapshot(core.getSnapshot());
  const common = {
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.config.character.radius),
  };
  assert.throws(() => createBotObservation({
    ...common,
    commandSnapshot: earlier,
    delayedSnapshot: later,
  }), /未来快照/);
  core.destroy();
});

test('BotObservation rejects mismatched identities and safely copies objective data', () => {
  const core = createArenaV1MatchCore({ seed: 14, config: { preparingTicks: 0 } });
  const source = cloneBotSourceSnapshot(core.getSnapshot());
  const common = {
    commandSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.config.character.radius),
  };
  const mismatched = {
    ...source,
    participants: source.participants.map((participant, index) => (
      index === 0 ? { ...participant, id: 'intruder' } : participant
    )),
  };
  assert.throws(() => createBotObservation({
    ...common,
    delayedSnapshot: mismatched,
  }), /身份不一致/);

  const objective = { id: 'future-equipment', position: { x: 1, y: 0, z: 2 } };
  const observation = createBotObservation({
    ...common,
    delayedSnapshot: source,
    objectives: [objective],
  });
  assert.notEqual(observation.objectives[0].position, objective.position);
  assert.ok(Object.isFrozen(observation.objectives[0].position));
  assert.equal(Object.isFrozen(objective.position), false);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => createBotObservation({
    ...common,
    delayedSnapshot: source,
    objectives: [cyclic],
  }), /循环引用/);
  core.destroy();
});
