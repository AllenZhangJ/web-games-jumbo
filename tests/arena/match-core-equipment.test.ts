import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  createNeutralInputFrame,
  type ArenaInputFrame,
  type ArenaParticipantSnapshot,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_EVENT,
  type ArenaAuthorityEvent,
} from '@number-strategy-jump/arena-match';
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

type EquipmentCore = ReturnType<typeof createEquipmentCore>;
type InputOverrides = Readonly<Record<string, Partial<ArenaInputFrame>>>;

function required<Value>(value: Value | null | undefined): Value {
  assert.ok(value);
  return value;
}

function eventValue(event: ArenaAuthorityEvent | undefined, key: string): unknown {
  return event === undefined ? undefined : Reflect.get(event, key);
}

function eventVectorX(event: ArenaAuthorityEvent | undefined, key: string): number {
  const vector = eventValue(event, key);
  assert.ok(typeof vector === 'object' && vector !== null);
  const x = Reflect.get(vector, 'x');
  assert.equal(typeof x, 'number');
  return x as number;
}

function participant(core: EquipmentCore, index = 0): ArenaParticipantSnapshot {
  return required(core.getSnapshot().participants[index]);
}

function affordance(core: EquipmentCore): Readonly<Record<string, unknown>> {
  const value = participant(core).actionAffordance;
  assert.ok(typeof value === 'object' && value !== null);
  return value as Readonly<Record<string, unknown>>;
}

function affordanceChannel(
  value: Readonly<Record<string, unknown>>,
  channelId: string,
): Readonly<Record<string, unknown>> {
  const channels = Reflect.get(value, 'channels');
  assert.ok(typeof channels === 'object' && channels !== null);
  const channel = Reflect.get(channels, channelId);
  assert.ok(typeof channel === 'object' && channel !== null);
  return channel as Readonly<Record<string, unknown>>;
}

function frames(core: EquipmentCore, values: InputOverrides = {}) {
  return core.config.participantIds.map((participantId) => ({
    ...createNeutralInputFrame(core.tick, participantId),
    ...(values[participantId] ?? {}),
    tick: core.tick,
    participantId,
  }));
}

function step(core: EquipmentCore, values: InputOverrides = {}) {
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
  assert.equal(eventValue(first.at(-1), 'action'), STAGE4_ACTION_ID.HAMMER_SMASH);
  const initialSnapshot = core.getSnapshot();
  const initialParticipant = required(initialSnapshot.participants[0]);
  assert.equal(required(initialParticipant.equipment).definitionId, STAGE4_EQUIPMENT_ID.HAMMER);
  assert.equal(required(initialParticipant.equipment).cooldownRemainingTicks, 72);
  assert.equal(required(initialSnapshot.equipment[0]).locationState, EQUIPMENT_LOCATION_STATE.HELD);

  const events: ArenaAuthorityEvent[] = [];
  for (let tick = 0; tick < 18; tick += 1) events.push(...step(core));
  const hit = events.find(({ type }) => type === ARENA_MATCH_EVENT.HIT_RESOLVED);
  const knockback = events.find(({ type }) => type === ARENA_MATCH_EVENT.KNOCKBACK_APPLIED);
  assert.equal(eventValue(hit, 'action'), STAGE4_ACTION_ID.HAMMER_SMASH);
  assert.ok(eventVectorX(knockback, 'impulse') > core.config.basePush.horizontalImpulse);
  core.destroy();
});

test('equipment cooldown consumes action input instead of falling back to base push', () => {
  const core = createEquipmentCore();
  step(core, { 'player-1': { primaryPressed: true, primaryHeld: true } });
  let actionAffordance = affordance(core);
  assert.equal(Reflect.get(actionAffordance, 'primaryActionDefinitionId'), STAGE4_ACTION_ID.HAMMER_SMASH);
  assert.equal(Reflect.get(affordanceChannel(actionAffordance, 'primary'), 'reason'), 'action-lane-occupied');
  for (let tick = 0; tick < 46; tick += 1) step(core);
  assert.equal(participant(core).action.phase, 'idle');
  assert.ok(required(participant(core).equipment).cooldownRemainingTicks > 0);
  actionAffordance = affordance(core);
  assert.equal(Reflect.get(actionAffordance, 'primaryActionDefinitionId'), STAGE4_ACTION_ID.HAMMER_SMASH);
  assert.equal(Reflect.get(affordanceChannel(actionAffordance, 'primary'), 'kind'), 'ignored');
  assert.equal(Reflect.get(affordanceChannel(actionAffordance, 'primary'), 'reason'), 'equipment-cooldown');
  const blocked = step(core, { 'player-1': { primaryPressed: true, primaryHeld: true } });
  assert.equal(blocked.some(({ type }) => type === ARENA_MATCH_EVENT.ACTION_STARTED), false);
  assert.equal(participant(core).action.phase, 'idle');
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
    eventValue(
      chainStarted.find(({ type }) => type === ARENA_MATCH_EVENT.ACTION_STARTED),
      'action',
    ),
    STAGE4_ACTION_ID.CHAIN_PULL,
  );
  const chainEvents: ArenaAuthorityEvent[] = [];
  for (let tick = 0; tick < 12; tick += 1) chainEvents.push(...step(chain));
  const pull = chainEvents.find(({ type }) => type === ARENA_MATCH_EVENT.KNOCKBACK_APPLIED);
  assert.equal(
    eventValue(
      chainEvents.find(({ type }) => type === ARENA_MATCH_EVENT.HIT_RESOLVED),
      'action',
    ),
    STAGE4_ACTION_ID.CHAIN_PULL,
  );
  assert.ok(eventVectorX(pull, 'impulse') < 0);
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
  const beforeX = participant(shield).position.x;
  const shieldStarted = step(shield, {
    'player-1': { primaryPressed: true, primaryHeld: true },
  });
  assert.equal(
    eventValue(
      shieldStarted.find(({ type }) => type === ARENA_MATCH_EVENT.ACTION_STARTED),
      'action',
    ),
    STAGE4_ACTION_ID.SHIELD_CHARGE,
  );
  assert.ok(participant(shield).position.x > beforeX);
  const shieldEvents: ArenaAuthorityEvent[] = [];
  for (let tick = 0; tick < 5; tick += 1) shieldEvents.push(...step(shield));
  assert.equal(
    eventValue(
      shieldEvents.find(({ type }) => type === ARENA_MATCH_EVENT.HIT_RESOLVED),
      'action',
    ),
    STAGE4_ACTION_ID.SHIELD_CHARGE,
  );
  shield.destroy();
});

test('equipment snapshot mutations cannot write back into authority or state hash', () => {
  const core = createEquipmentCore();
  step(core);
  const beforeHash = core.getStateHash();
  const exposed = core.getSnapshot();
  Reflect.set(required(exposed.equipment[0]), 'position', { x: 999, y: 999, z: 999 });
  Reflect.set(required(required(exposed.participants[0]).equipment), 'cooldownRemainingTicks', 999);
  assert.equal(core.getStateHash(), beforeHash);
  const authority = core.getSnapshot();
  assert.notEqual(required(authority.equipment[0]).position?.x, 999);
  assert.notEqual(required(required(authority.participants[0]).equipment).cooldownRemainingTicks, 999);
  core.destroy();
});

test('owner elimination drops equipment at the last valid grounded position', () => {
  const core = createEquipmentCore();
  step(core);
  assert.equal(required(participant(core).equipment).definitionId, STAGE4_EQUIPMENT_ID.HAMMER);
  const events: ArenaAuthorityEvent[] = [];
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
  assert.equal(required(snapshot.participants[0]).equipment, null);
  const droppedEquipment = required(snapshot.equipment[0]);
  assert.equal(droppedEquipment.locationState, EQUIPMENT_LOCATION_STATE.DROPPED);
  assert.equal(droppedEquipment.ownerId, null);
  assert.ok(
    Math.abs(required(droppedEquipment.position).x)
      <= required(EQUIPMENT_ARENA.surfaces[0]).halfExtents.x,
  );
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
