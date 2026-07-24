import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  cloneBotSourceSnapshot,
  createBotArenaView,
  createBotObservation,
} from '@number-strategy-jump/arena-bot';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';

type Mutable<T> = {
  -readonly [Key in keyof T]: T[Key] extends readonly (infer Item)[]
    ? Mutable<Item>[]
    : T[Key] extends object
      ? Mutable<T[Key]>
      : T[Key];
};

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

test('BotObservation exposes only public delayed opponent state and is deeply frozen', () => {
  const core = createArenaV1MatchCore({ seed: 9, config: { preparingTicks: 0 } });
  const source = cloneBotSourceSnapshot(core.getSnapshot());
  const observation = createBotObservation({
    commandSnapshot: source,
    delayedSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.getCharacterDefinition('player-2').collision.radius),
  });
  assert.equal(observation.schemaVersion, 4);
  assert.equal(observation.self.id, 'player-2');
  assert.equal(observation.opponent.id, 'player-1');
  const publicObservation = record(observation, 'observation');
  const publicOpponent = record(observation.opponent, 'observation.opponent');
  assert.equal(publicObservation.matchSeed, undefined);
  assert.equal(publicObservation.configHash, undefined);
  assert.equal(publicObservation.rngStates, undefined);
  assert.equal(publicOpponent.lastHitBy, undefined);
  assert.equal(publicOpponent.lastHitTick, undefined);
  assert.equal(observation.equipment.length, 3);
  const firstEquipment = observation.equipment[0];
  if (!firstEquipment) throw new Error('测试观察缺少场上装备。');
  const publicEquipment = record(firstEquipment, 'observation.equipment[0]');
  assert.equal(publicEquipment.originPosition, undefined);
  assert.equal(publicEquipment.revision, undefined);
  assert.equal(observation.self.equipment, null);
  assert.equal(observation.self.movement.grounded, true);
  const publicMovement = record(observation.self.movement, 'observation.self.movement');
  assert.equal(publicMovement.jumpBufferTicksRemaining, undefined);
  assert.equal(publicMovement.coyoteTicksRemaining, undefined);
  assert.equal(publicMovement.revision, undefined);
  assert.equal(observation.self.actionAffordance.channels.jump.kind, 'selected');
  assert.ok(Object.isFrozen(observation));
  assert.ok(Object.isFrozen(observation.opponent.position));
  assert.ok(Object.isFrozen(observation.self.movement));
  assert.ok(Object.isFrozen(observation.self.actionAffordance.channels.jump));
  assert.ok(Object.isFrozen(firstEquipment.position));
  assert.throws(() => {
    (observation.opponent.position as { x: number }).x = 999;
  }, TypeError);
  core.destroy();
});

test('BotObservation keeps self movement current while delaying opponent movement and affordance', () => {
  const core = createArenaV1MatchCore({ seed: 10, config: { preparingTicks: 0 } });
  const beforeJump = cloneBotSourceSnapshot(core.getSnapshot());
  core.step([
    { ...createNeutralInputFrame(0, 'player-1'), jumpPressed: true },
    { ...createNeutralInputFrame(0, 'player-2'), jumpPressed: true },
  ]);
  const afterJump = cloneBotSourceSnapshot(core.getSnapshot());
  const observation = createBotObservation({
    commandSnapshot: afterJump,
    delayedSnapshot: beforeJump,
    selfId: 'player-2',
    arena: createBotArenaView(
      core.config.arena,
      core.getCharacterDefinition('player-2').collision.radius,
    ),
  });
  assert.equal(observation.commandTick, 1);
  assert.equal(observation.observedTick, 0);
  assert.equal(observation.self.movement.grounded, false);
  assert.equal(observation.self.actionAffordance.tick, 1);
  assert.equal(observation.opponent.movement.grounded, true);
  assert.equal(observation.opponent.actionAffordance.tick, 0);
  assert.notEqual(
    observation.self.actionAffordance.channels.jump.actionDefinitionId,
    observation.opponent.actionAffordance.channels.jump.actionDefinitionId,
  );
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
    arena: createBotArenaView(core.config.arena, core.getCharacterDefinition('player-2').collision.radius),
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
  assert.equal(current.opponent.equipment?.definitionId, 'hammer');
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
    arena: createBotArenaView(core.config.arena, core.getCharacterDefinition('player-2').collision.radius),
  };
  assert.throws(() => createBotObservation({
    ...common,
    commandSnapshot: earlier,
    delayedSnapshot: later,
  }), /未来快照/);
  core.destroy();
});

test('BotObservation rejects action affordance from a different tick', () => {
  const core = createArenaV1MatchCore({ seed: 5, config: { preparingTicks: 0 } });
  const snapshot = cloneBotSourceSnapshot(core.getSnapshot());
  const mismatched = structuredClone(snapshot) as Mutable<typeof snapshot>;
  const participant = mismatched.participants[0];
  if (!participant) throw new Error('测试快照缺少 player-1。');
  participant.actionAffordance.tick = snapshot.tick + 1;
  assert.throws(() => cloneBotSourceSnapshot(mismatched), /actionAffordance\.tick.*快照 tick/);
  core.destroy();
});

test('BotObservation rejects mismatched identities and safely copies objective data', () => {
  const core = createArenaV1MatchCore({ seed: 14, config: { preparingTicks: 0 } });
  const source = cloneBotSourceSnapshot(core.getSnapshot());
  const common = {
    commandSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(core.config.arena, core.getCharacterDefinition('player-2').collision.radius),
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
  const copiedObjective = record(observation.objectives[0], 'observation.objectives[0]');
  assert.notEqual(copiedObjective.position, objective.position);
  assert.ok(Object.isFrozen(copiedObjective.position));
  assert.equal(Object.isFrozen(objective.position), false);
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.throws(() => createBotObservation({
    ...common,
    delayedSnapshot: source,
    objectives: [cyclic],
  }), /循环引用/);
  core.destroy();
});
