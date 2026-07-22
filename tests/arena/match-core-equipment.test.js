import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { ARENA_MATCH_EVENT } from '@number-strategy-jump/arena-match';
import { EQUIPMENT_LOCATION_STATE } from '@number-strategy-jump/arena-equipment';
import { STAGE4_ACTION_ID, STAGE4_EQUIPMENT_ID } from '@number-strategy-jump/arena-v1-content';

const EQUIPMENT_ARENA = Object.freeze({
  killY: -3,
  surfaces: Object.freeze([Object.freeze({
    id: 'equipment-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 3, y: 0.5, z: 3 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -1, y: 1, z: 0 }),
    Object.freeze({ x: 0.5, y: 1, z: 0 }),
  ]),
});

function createEquipmentCore(overrides = {}) {
  return createArenaV1MatchCore({
    seed: 123,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 1_000,
      hardLimitTicks: 1_200,
      arena: EQUIPMENT_ARENA,
      equipment: {
        initialSpawns: [{
          id: 'hammer-at-player-1',
          definitionId: STAGE4_EQUIPMENT_ID.HAMMER,
          position: { x: -1, y: 1, z: 0 },
        }],
      },
      ...overrides,
    },
  });
}

function frames(core, values = {}) {
  return core.config.participantIds.map((participantId) => ({
    ...createNeutralInputFrame(core.tick, participantId),
    ...(values[participantId] ?? {}),
    tick: core.tick,
    participantId,
  }));
}

function step(core, values) {
  return core.step(frames(core, values));
}

test('MatchCore automatically picks up equipment and resolves its action on the same input path', () => {
  const core = createEquipmentCore();
  const first = step(core, {
    'player-1': { primaryPressed: true, primaryHeld: true },
  });
  assert.deepEqual(first.map(({ type }) => type), [
    ARENA_MATCH_EVENT.MATCH_STARTED,
    ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED,
    ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP,
    ARENA_MATCH_EVENT.ACTION_STARTED,
  ]);
  assert.equal(first.at(-1).action, STAGE4_ACTION_ID.HAMMER_SMASH);
  const initialSnapshot = core.getSnapshot();
  assert.equal(initialSnapshot.participants[0].equipment.definitionId, STAGE4_EQUIPMENT_ID.HAMMER);
  assert.equal(initialSnapshot.participants[0].equipment.cooldownRemainingTicks, 72);
  assert.equal(initialSnapshot.equipment[0].locationState, EQUIPMENT_LOCATION_STATE.HELD);

  const events = [];
  for (let tick = 0; tick < 18; tick += 1) events.push(...step(core));
  const hit = events.find(({ type }) => type === ARENA_MATCH_EVENT.HIT_RESOLVED);
  const knockback = events.find(({ type }) => type === ARENA_MATCH_EVENT.KNOCKBACK_APPLIED);
  assert.equal(hit.action, STAGE4_ACTION_ID.HAMMER_SMASH);
  assert.ok(knockback.impulse.x > core.config.basePush.horizontalImpulse);
  core.destroy();
});

test('equipment cooldown consumes action input instead of falling back to base push', () => {
  const core = createEquipmentCore();
  step(core, { 'player-1': { primaryPressed: true, primaryHeld: true } });
  let affordance = core.getSnapshot().participants[0].actionAffordance;
  assert.equal(affordance.primaryActionDefinitionId, STAGE4_ACTION_ID.HAMMER_SMASH);
  assert.equal(affordance.channels.primary.reason, 'action-lane-occupied');
  for (let tick = 0; tick < 46; tick += 1) step(core);
  assert.equal(core.getSnapshot().participants[0].action.phase, 'idle');
  assert.ok(core.getSnapshot().participants[0].equipment.cooldownRemainingTicks > 0);
  affordance = core.getSnapshot().participants[0].actionAffordance;
  assert.equal(affordance.primaryActionDefinitionId, STAGE4_ACTION_ID.HAMMER_SMASH);
  assert.equal(affordance.channels.primary.kind, 'ignored');
  assert.equal(affordance.channels.primary.reason, 'equipment-cooldown');
  const blocked = step(core, { 'player-1': { primaryPressed: true, primaryHeld: true } });
  assert.equal(blocked.some(({ type }) => type === ARENA_MATCH_EVENT.ACTION_STARTED), false);
  assert.equal(core.getSnapshot().participants[0].action.phase, 'idle');
  core.destroy();
});

test('chain pull and shield charge execute through the same MatchCore action path', () => {
  const chain = createEquipmentCore({
    equipment: {
      initialSpawns: [{
        id: 'chain-at-player-1',
        definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
        position: { x: -1, y: 1, z: 0 },
      }],
    },
  });
  const chainStarted = step(chain, {
    'player-1': { primaryPressed: true, primaryHeld: true },
  });
  assert.equal(
    chainStarted.find(({ type }) => type === ARENA_MATCH_EVENT.ACTION_STARTED).action,
    STAGE4_ACTION_ID.CHAIN_PULL,
  );
  const chainEvents = [];
  for (let tick = 0; tick < 12; tick += 1) chainEvents.push(...step(chain));
  const pull = chainEvents.find(({ type }) => type === ARENA_MATCH_EVENT.KNOCKBACK_APPLIED);
  assert.equal(
    chainEvents.find(({ type }) => type === ARENA_MATCH_EVENT.HIT_RESOLVED).action,
    STAGE4_ACTION_ID.CHAIN_PULL,
  );
  assert.ok(pull.impulse.x < 0);
  chain.destroy();

  const shield = createEquipmentCore({
    equipment: {
      initialSpawns: [{
        id: 'shield-at-player-1',
        definitionId: STAGE4_EQUIPMENT_ID.SHIELD,
        position: { x: -1, y: 1, z: 0 },
      }],
    },
  });
  const beforeX = shield.getSnapshot().participants[0].position.x;
  const shieldStarted = step(shield, {
    'player-1': { primaryPressed: true, primaryHeld: true },
  });
  assert.equal(
    shieldStarted.find(({ type }) => type === ARENA_MATCH_EVENT.ACTION_STARTED).action,
    STAGE4_ACTION_ID.SHIELD_CHARGE,
  );
  assert.ok(shield.getSnapshot().participants[0].position.x > beforeX);
  const shieldEvents = [];
  for (let tick = 0; tick < 5; tick += 1) shieldEvents.push(...step(shield));
  assert.equal(
    shieldEvents.find(({ type }) => type === ARENA_MATCH_EVENT.HIT_RESOLVED).action,
    STAGE4_ACTION_ID.SHIELD_CHARGE,
  );
  shield.destroy();
});

test('equipment snapshot mutations cannot write back into authority or state hash', () => {
  const core = createEquipmentCore();
  step(core);
  const beforeHash = core.getStateHash();
  const exposed = core.getSnapshot();
  exposed.equipment[0].position = { x: 999, y: 999, z: 999 };
  exposed.participants[0].equipment.cooldownRemainingTicks = 999;
  assert.equal(core.getStateHash(), beforeHash);
  const authority = core.getSnapshot();
  assert.notEqual(authority.equipment[0].position?.x, 999);
  assert.notEqual(authority.participants[0].equipment.cooldownRemainingTicks, 999);
  core.destroy();
});

test('owner elimination drops equipment at the last valid grounded position', () => {
  const core = createEquipmentCore();
  step(core);
  assert.equal(core.getSnapshot().participants[0].equipment.definitionId, STAGE4_EQUIPMENT_ID.HAMMER);
  const events = [];
  for (let tick = 0; tick < 180; tick += 1) {
    events.push(...step(core, { 'player-1': { moveX: -1 } }));
    if (events.some((event) => (
      event.type === ARENA_MATCH_EVENT.PLAYER_ELIMINATED
      && event.participantId === 'player-1'
    ))) break;
  }
  const eliminationIndex = events.findIndex((event) => (
    event.type === ARENA_MATCH_EVENT.PLAYER_ELIMINATED
    && event.participantId === 'player-1'
  ));
  const dropIndex = events.findIndex((event) => event.type === ARENA_MATCH_EVENT.EQUIPMENT_DROPPED);
  assert.ok(eliminationIndex >= 0);
  assert.ok(dropIndex > eliminationIndex);
  assert.equal(
    events.some((event) => event.type === ARENA_MATCH_EVENT.EQUIPMENT_DROP_FALLBACK),
    false,
  );
  const snapshot = core.getSnapshot();
  assert.equal(snapshot.participants[0].equipment, null);
  assert.equal(snapshot.equipment[0].locationState, EQUIPMENT_LOCATION_STATE.DROPPED);
  assert.equal(snapshot.equipment[0].ownerId, null);
  assert.ok(Math.abs(snapshot.equipment[0].position.x) <= EQUIPMENT_ARENA.surfaces[0].halfExtents.x);
  core.destroy();
});

test('invalid or unknown initial equipment fails construction and cleans partial authority', () => {
  assert.throws(() => createEquipmentCore({
    equipment: {
      initialSpawns: [{
        id: 'outside',
        definitionId: STAGE4_EQUIPMENT_ID.HAMMER,
        position: { x: 99, y: 1, z: 0 },
      }],
    },
  }), /不在合法竞技场表面/);
  assert.throws(() => createEquipmentCore({
    equipment: {
      initialSpawns: [{
        id: 'floating',
        definitionId: STAGE4_EQUIPMENT_ID.HAMMER,
        position: { x: 0, y: 100, z: 0 },
      }],
    },
  }), /不在合法竞技场表面/);
  assert.throws(() => createEquipmentCore({
    equipment: {
      initialSpawns: [{
        id: 'unknown',
        definitionId: 'missing-equipment',
        position: { x: 0, y: 1, z: 0 },
      }],
    },
  }), /未知 EquipmentDefinition missing-equipment/);
});
