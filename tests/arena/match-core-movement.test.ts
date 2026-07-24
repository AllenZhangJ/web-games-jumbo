import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  createNeutralInputFrame,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_MATCH_EVENT } from '@number-strategy-jump/arena-match';
import {
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import { STAGE6_MOVEMENT_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import { MOVEMENT_MODE } from '@number-strategy-jump/arena-movement';

const WIDE_ARENA = Object.freeze({
  killY: -8,
  surfaces: Object.freeze([Object.freeze({
    id: 'movement-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 8, y: 0.5, z: 5 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -3, y: 1, z: 0 }),
    Object.freeze({ x: 3, y: 1, z: 0 }),
  ]),
});

type ArenaV1Core = ReturnType<typeof createArenaV1MatchCore>;
type ParticipantSnapshot = ArenaMatchSnapshot['participants'][number];
type NeutralInputFrame = ReturnType<typeof createNeutralInputFrame>;

function required<T>(value: T | null | undefined, name: string): T {
  assert.ok(value != null, `${name} 不存在。`);
  return value;
}

function record(value: unknown, name: string): Readonly<Record<string, unknown>> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} 必须是对象。`);
  return value as Readonly<Record<string, unknown>>;
}

function firstParticipant(snapshot: ArenaMatchSnapshot): ParticipantSnapshot {
  return required(snapshot.participants[0], 'first participant');
}

function affordance(participant: ParticipantSnapshot): Readonly<Record<string, unknown>> {
  return record(participant.actionAffordance, 'participant actionAffordance');
}

function channel(
  value: Readonly<Record<string, unknown>>,
  channelId: string,
): Readonly<Record<string, unknown>> {
  const channels = record(value.channels, 'actionAffordance channels');
  return record(channels[channelId], `actionAffordance channel ${channelId}`);
}

function createCore(overrides: Readonly<Record<string, unknown>> = {}) {
  return createArenaV1MatchCore({
    seed: 717,
    config: {
      arena: WIDE_ARENA,
      equipment: { initialSpawns: [] },
      preparingTicks: 0,
      suddenDeathStartTick: 1_000,
      hardLimitTicks: 1_200,
      ...overrides,
    },
  });
}

function frames(
  core: ArenaV1Core,
  overrides: Readonly<Record<string, Partial<NeutralInputFrame>>> = {},
) {
  return core.config.participantIds.map((participantId) => ({
    ...createNeutralInputFrame(core.tick, participantId),
    ...(overrides[participantId] ?? {}),
    tick: core.tick,
    participantId,
  }));
}

function step(
  core: ArenaV1Core,
  overrides: Readonly<Record<string, Partial<NeutralInputFrame>>> = {},
) {
  return core.step(frames(core, overrides));
}

test('explicit ground and air jumps use one ActionResolver path and consume air budget once', () => {
  const core = createCore();
  const groundEvents = step(core, { 'player-1': { jumpPressed: true } });
  assert.equal(
    groundEvents.some(({ type, action }) => (
      type === ARENA_MATCH_EVENT.ACTION_STARTED
      && action === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP
    )),
    true,
  );
  let snapshot = firstParticipant(core.getSnapshot());
  assert.ok(snapshot.velocity.y > 0);
  assert.equal(snapshot.grounded, false);
  assert.equal(snapshot.movement.grounded, false);
  assert.equal(snapshot.movement.airJumpsUsed, 0);
  assert.equal(snapshot.movement.schemaVersion, 2);

  const airEvents = step(core, { 'player-1': { jumpPressed: true } });
  assert.equal(
    airEvents.some(({ action }) => action === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP),
    true,
  );
  snapshot = firstParticipant(core.getSnapshot());
  assert.equal(snapshot.movement.airJumpsUsed, 1);

  const exhausted = step(core, { 'player-1': { jumpPressed: true } });
  assert.equal(
    exhausted.some(({ action }) => action === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP),
    false,
  );
  assert.equal(firstParticipant(core.getSnapshot()).movement.airJumpsUsed, 1);
  core.destroy();
});

test('an exhausted airborne press is buffered and automatically jumps on the first grounded tick', () => {
  const core = createCore();
  step(core, { 'player-1': { jumpPressed: true } });
  step(core, { 'player-1': { jumpPressed: true } });
  assert.equal(firstParticipant(core.getSnapshot()).movement.airJumpsUsed, 1);

  let player = firstParticipant(core.getSnapshot());
  for (let tick = 0; tick < 180 && (player.velocity.y >= 0 || player.position.y > 1.5); tick += 1) {
    step(core);
    player = firstParticipant(core.getSnapshot());
  }
  assert.ok(player.velocity.y < 0);
  assert.ok(player.position.y <= 1.5);

  const bufferedPress = step(core, { 'player-1': { jumpPressed: true } });
  assert.equal(
    bufferedPress.some(({ action }) => action === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP),
    false,
  );
  player = firstParticipant(core.getSnapshot());
  assert.ok(player.movement.jumpBufferTicksRemaining > 0);
  for (let tick = 0; tick < 5 && !player.grounded; tick += 1) {
    step(core);
    player = firstParticipant(core.getSnapshot());
  }
  assert.equal(player.grounded, true);
  assert.ok(player.movement.jumpBufferTicksRemaining > 0);

  const automaticJump = step(core);
  assert.equal(
    automaticJump.some(({ action }) => (
      action === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP
    )),
    true,
  );
  player = firstParticipant(core.getSnapshot());
  assert.equal(player.movement.jumpBufferTicksRemaining, 0);
  assert.equal(player.grounded, false);
  assert.ok(player.velocity.y > 0);
  core.destroy();
});

test('a normal pressed-and-held jump does not accidentally begin crouch charge', () => {
  const core = createCore();
  const events = step(core, {
    'player-1': { jumpPressed: true, jumpHeld: true },
  });
  assert.equal(
    events.some(({ action }) => action === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP),
    true,
  );
  assert.equal(
    events.some(({ action }) => action === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN),
    false,
  );
  assert.equal(firstParticipant(core.getSnapshot()).movement.mode, MOVEMENT_MODE.STANDARD);
  assert.ok(firstParticipant(core.getSnapshot()).velocity.y > 0);
  const currentAffordance = affordance(firstParticipant(core.getSnapshot()));
  assert.equal(
    currentAffordance.primaryActionDefinitionId,
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_AIR_JUMP,
  );
  assert.equal(
    channel(currentAffordance, 'primary').kind,
    'selected',
  );
  core.destroy();
});

test('walk and run inputs converge to CharacterDefinition target speeds', () => {
  const walk = createCore();
  const definition = walk.getCharacterDefinition('player-1');
  for (let tick = 0; tick < 20; tick += 1) {
    step(walk, {
      'player-1': { moveX: definition.movement.runInputThreshold, moveZ: 0 },
    });
  }
  const walkSpeed = Math.hypot(
    firstParticipant(walk.getSnapshot()).velocity.x,
    firstParticipant(walk.getSnapshot()).velocity.z,
  );
  assert.ok(Math.abs(walkSpeed - definition.movement.walkSpeed) < 1e-9);
  walk.destroy();

  const run = createCore();
  for (let tick = 0; tick < 20; tick += 1) {
    step(run, { 'player-1': { moveX: 1, moveZ: 0 } });
  }
  const runSpeed = Math.hypot(
    firstParticipant(run.getSnapshot()).velocity.x,
    firstParticipant(run.getSnapshot()).velocity.z,
  );
  assert.ok(Math.abs(runSpeed - definition.movement.runSpeed) < 1e-9);
  run.destroy();
});

test('primary falls back to context jump only when base targeting has no legal target', () => {
  const far = createCore();
  const fallback = step(far, {
    'player-1': { primaryPressed: true, primaryHeld: true },
  });
  assert.equal(
    fallback.some(({ action }) => action === STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP),
    true,
  );
  assert.ok(firstParticipant(far.getSnapshot()).velocity.y > 0);
  assert.equal(firstParticipant(far.getSnapshot()).action.definitionId, null);
  far.destroy();

  const close = createCore({
    arena: {
      ...WIDE_ARENA,
      spawns: [{ x: -0.55, y: 1, z: 0 }, { x: 0.55, y: 1, z: 0 }],
    },
    basePush: { range: 2 },
  });
  const attack = step(close, {
    'player-1': { primaryPressed: true, primaryHeld: true },
  });
  assert.equal(attack.some(({ action }) => action === STAGE4_ACTION_ID.BASE_PUSH), true);
  assert.equal(
    attack.some(({ action }) => action === STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP),
    false,
  );
  assert.equal(firstParticipant(close.getSnapshot()).velocity.y, 0);
  close.destroy();
});

test('explicit production controls can whiff a base attack without a nearby target', () => {
  const core = createCore({ contextPrimaryMobilityEnabled: false });
  const events = step(core, {
    'player-1': { primaryPressed: true, primaryHeld: true },
  });
  assert.equal(
    events.some(({ type, action }) => (
      type === ARENA_MATCH_EVENT.ACTION_STARTED
      && action === STAGE4_ACTION_ID.BASE_PUSH
    )),
    true,
  );
  assert.equal(events.some(({ type }) => type === ARENA_MATCH_EVENT.HIT_RESOLVED), false);
  assert.equal(
    affordance(firstParticipant(core.getSnapshot())).primaryActionDefinitionId,
    STAGE4_ACTION_ID.BASE_PUSH,
  );
  core.destroy();
});

test('explicit airborne primary starts a weapon-specific downward attack and descent', () => {
  const core = createCore({
    contextPrimaryMobilityEnabled: false,
    equipment: {
      initialSpawns: [{
        id: 'test-hammer',
        definitionId: STAGE4_EQUIPMENT_ID.HAMMER,
        position: { x: -3, y: 1, z: 0 },
      }],
    },
  });
  step(core);
  assert.equal(
    required(firstParticipant(core.getSnapshot()).equipment, 'player equipment').definitionId,
    STAGE4_EQUIPMENT_ID.HAMMER,
  );
  step(core, { 'player-1': { jumpPressed: true } });
  for (let tick = 0; tick < 5; tick += 1) step(core);
  const events = step(core, { 'player-1': { primaryPressed: true } });
  assert.equal(
    events.some(({ type, action }) => (
      type === ARENA_MATCH_EVENT.ACTION_STARTED
      && action === STAGE4_ACTION_ID.HAMMER_AIR_SMASH
    )),
    true,
  );
  const player = firstParticipant(core.getSnapshot());
  assert.equal(player.movement.mode, MOVEMENT_MODE.DOWN_SMASH);
  assert.ok(player.velocity.y < -15);
  core.destroy();
});

test('same tick explicit jump and primary attack occupy independent action lanes', () => {
  const core = createCore({
    arena: {
      ...WIDE_ARENA,
      spawns: [{ x: -0.55, y: 1, z: 0 }, { x: 0.55, y: 1, z: 0 }],
    },
    basePush: { range: 2 },
  });
  const events = step(core, {
    'player-1': {
      primaryPressed: true,
      primaryHeld: true,
      jumpPressed: true,
    },
  });
  assert.deepEqual(
    events
      .filter(({ type }) => type === ARENA_MATCH_EVENT.ACTION_STARTED)
      .map(({ action }) => action)
      .sort(),
    [STAGE4_ACTION_ID.BASE_PUSH, STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP].sort(),
  );
  const player = firstParticipant(core.getSnapshot());
  assert.equal(player.action.definitionId, STAGE4_ACTION_ID.BASE_PUSH);
  assert.ok(player.velocity.y > 0);
  core.destroy();
});

test('crouch charge retains its originating channel and releases a bounded jump', () => {
  const core = createCore();
  step(core, { 'player-1': { jumpHeld: true } });
  let movement = firstParticipant(core.getSnapshot()).movement;
  assert.equal(movement.mode, MOVEMENT_MODE.CROUCH_CHARGING);
  assert.equal(
    movement.crouchActionId,
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN,
  );
  assert.equal(movement.crouchChargeTicks, 1);

  step(core, { 'player-1': { jumpHeld: true } });
  movement = firstParticipant(core.getSnapshot()).movement;
  assert.equal(movement.crouchChargeTicks, 2);
  const release = step(core);
  assert.equal(
    release.some(({ action }) => action === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE),
    true,
  );
  const player = firstParticipant(core.getSnapshot());
  assert.equal(player.movement.mode, MOVEMENT_MODE.STANDARD);
  assert.equal(player.movement.crouchActionId, null);
  assert.ok(player.velocity.y > 0);
  core.destroy();
});

test('down smash is unavailable on ground and emits one authoritative landing transition', () => {
  const core = createCore();
  const grounded = step(core, { 'player-1': { slamPressed: true } });
  assert.equal(
    grounded.some(({ action }) => action === STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH),
    false,
  );
  step(core, { 'player-1': { jumpPressed: true } });
  const smash = step(core, { 'player-1': { slamPressed: true } });
  assert.equal(
    smash.some(({ action }) => action === STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH),
    true,
  );
  const allEvents = [...smash];
  for (let tick = 0; tick < 60; tick += 1) {
    if (allEvents.some(({ type }) => type === ARENA_MATCH_EVENT.DOWN_SMASH_LANDED)) break;
    allEvents.push(...step(core));
  }
  assert.equal(
    allEvents.filter(({ type }) => type === ARENA_MATCH_EVENT.DOWN_SMASH_LANDED).length,
    1,
  );
  assert.equal(firstParticipant(core.getSnapshot()).movement.mode, MOVEMENT_MODE.STANDARD);
  core.destroy();
});

test('snapshot action affordance is derived by the same resolver without becoming authority state', () => {
  const far = createCore();
  const beforeHash = far.getStateHash();
  const farPlayer = firstParticipant(far.getSnapshot());
  const farAffordance = affordance(farPlayer);
  assert.equal(
    farAffordance.primaryActionDefinitionId,
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP,
  );
  assert.equal(channel(farAffordance, 'primary').kind, 'selected');
  assert.equal(
    channel(farAffordance, 'primaryHold').actionDefinitionId,
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN,
  );
  assert.equal(
    channel(farAffordance, 'jump').actionDefinitionId,
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
  );
  assert.equal(channel(farAffordance, 'slam').kind, 'none');
  assert.equal(Reflect.set(farAffordance, 'primaryActionDefinitionId', 'tampered'), true);
  assert.equal(Reflect.set(farPlayer.movement, 'airJumpsUsed', 999), true);
  assert.equal(Reflect.set(farPlayer.movement, 'mode', 'tampered'), true);
  assert.equal(far.getStateHash(), beforeHash);
  assert.equal(
    affordance(firstParticipant(far.getSnapshot())).primaryActionDefinitionId,
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP,
  );
  assert.equal(firstParticipant(far.getSnapshot()).movement.airJumpsUsed, 0);
  assert.equal(firstParticipant(far.getSnapshot()).movement.mode, MOVEMENT_MODE.STANDARD);
  far.destroy();

  const close = createCore({
    arena: {
      ...WIDE_ARENA,
      spawns: [{ x: -0.55, y: 1, z: 0 }, { x: 0.55, y: 1, z: 0 }],
    },
    basePush: { range: 2 },
  });
  const closeAffordance = affordance(firstParticipant(close.getSnapshot()));
  assert.equal(closeAffordance.primaryActionDefinitionId, STAGE4_ACTION_ID.BASE_PUSH);
  assert.equal(channel(closeAffordance, 'primary').source, 'base-action-provider');
  assert.equal(channel(closeAffordance, 'primary').lane, 'combat');
  assert.equal(channel(closeAffordance, 'primaryHold').lane, 'locomotion');
  close.destroy();
});

test('movement outcomes and hashes are independent of participant frame order', () => {
  const ordered = createCore();
  const reversed = createCore();
  for (let tick = 0; tick < 180; tick += 1) {
    const overrides = {
      'player-1': {
        moveX: tick < 90 ? 0.72 : -0.4,
        moveZ: 0.15,
        jumpPressed: tick === 5 || tick === 15,
        jumpHeld: tick === 5 || tick === 15 || (tick >= 80 && tick < 86),
        slamPressed: tick === 30,
        primaryPressed: tick === 125,
        primaryHeld: tick === 125,
      },
      'player-2': {
        moveX: tick < 90 ? -0.83 : 0.35,
        moveZ: -0.1,
        jumpPressed: tick === 25 || tick === 35,
        jumpHeld: tick === 25 || tick === 35 || (tick >= 100 && tick < 108),
        slamPressed: tick === 50,
        primaryPressed: tick === 145,
        primaryHeld: tick === 145,
      },
    };
    const orderedFrames = frames(ordered, overrides);
    const reversedFrames = frames(reversed, overrides).reverse();
    assert.deepEqual(ordered.step(orderedFrames), reversed.step(reversedFrames));
    assert.equal(ordered.getStateHash(), reversed.getStateHash());
  }
  ordered.destroy();
  reversed.destroy();
});
