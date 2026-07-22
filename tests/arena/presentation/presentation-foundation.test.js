import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '../../../src/arena/arena-v1-match-core.js';
import {
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_ACTION_ID,
} from '../../../src/arena/content/stage4-equipment.js';
import { STAGE6_MOVEMENT_ACTION_ID } from '../../../src/arena/content/stage6-movement-actions.js';
import { STAGE5_MAP_DEFINITION } from '../../../src/arena/content/stage5-map.js';
import { ARENA_V1_GREYBOX_CONTENT } from '../../../src/arena/presentation/content/arena-gameplay-v2-content.js';
import {
  createArenaWorldBounds,
  createOrthographicArenaCamera,
} from '@number-strategy-jump/arena-presentation-three';
import { PresentationEventWindow } from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_V1_CHARACTER_PRESENTATION_TUNING,
  ARENA_V1_COMBAT_PRESENTATION_CONFIG,
  projectArenaPresentationFrame,
} from '@number-strategy-jump/arena-v1-presentation-content';

const PUBLIC_INFO = Object.freeze({
  matchSeed: 65,
  opponent: Object.freeze({
    id: 'clockwork-rookie',
    displayName: '发条新秀',
    portraitKey: 'portrait-clockwork-rookie',
    appearanceKey: 'wind-up-cube-cream',
  }),
});

function createCore() {
  return createArenaV1MatchCore({
    seed: PUBLIC_INFO.matchSeed,
    config: { preparingTicks: 0 },
  });
}

test('Arena greybox content copies frozen authority geometry and presentation semantics', () => {
  assert.equal(ARENA_V1_GREYBOX_CONTENT.schemaVersion, 2);
  assert.equal(ARENA_V1_GREYBOX_CONTENT.map.id, STAGE5_MAP_DEFINITION.id);
  assert.deepEqual(
    ARENA_V1_GREYBOX_CONTENT.map.surfaces,
    STAGE5_MAP_DEFINITION.arena.surfaces,
  );
  assert.equal(ARENA_V1_GREYBOX_CONTENT.actions['base-push'].label, '推击');
  assert.equal(ARENA_V1_GREYBOX_CONTENT.equipment.hammer.semantic, 'heavy-smash');
  assert.equal(ARENA_V1_GREYBOX_CONTENT.assetRegistry.size, 2);
  assert.equal(ARENA_V1_GREYBOX_CONTENT.characterPresentationRegistry.size, 2);
  assert.ok(Object.isFrozen(ARENA_V1_GREYBOX_CONTENT.map.surfaces[0].center));
  assert.throws(() => {
    ARENA_V1_GREYBOX_CONTENT.map.surfaces[0].center.x = 99;
  }, TypeError);
});

test('Arena action, weapon and character presentation values come from one exported configuration', () => {
  const authorityTimingById = new Map(STAGE4_ACTION_DEFINITIONS.map((definition) => [
    definition.id,
    definition.timing,
  ]));
  for (const actionId of Object.values(STAGE4_ACTION_ID)) {
    assert.deepEqual(
      ARENA_V1_GREYBOX_CONTENT.actions[actionId].timing,
      authorityTimingById.get(actionId),
      `${actionId} 必须直接投影权威 timing。`,
    );
  }
  assert.deepEqual(
    ARENA_V1_GREYBOX_CONTENT.actions[STAGE4_ACTION_ID.HAMMER_SMASH].weaponScale,
    { idle: 1, ...ARENA_V1_COMBAT_PRESENTATION_CONFIG.hammerSmash.scale },
  );
  assert.notDeepEqual(
    ARENA_V1_GREYBOX_CONTENT.actions[STAGE4_ACTION_ID.HAMMER_SMASH].weaponScale,
    ARENA_V1_GREYBOX_CONTENT.actions[STAGE4_ACTION_ID.CHAIN_PULL].weaponScale,
  );
  assert.equal(
    ARENA_V1_GREYBOX_CONTENT.actions[STAGE4_ACTION_ID.HAMMER_AIR_SMASH].semantic,
    'air-heavy-smash',
  );
  for (const actionId of Object.values(STAGE6_MOVEMENT_ACTION_ID)) {
    assert.ok(ARENA_V1_GREYBOX_CONTENT.actions[actionId], `${actionId} 必须有动作表现。`);
  }
  const character = ARENA_V1_GREYBOX_CONTENT.characterPresentationRegistry.list()[0];
  assert.deepEqual(character.locomotion, {
    walkSpeedThreshold: ARENA_V1_CHARACTER_PRESENTATION_TUNING.walkSpeedThreshold,
    runSpeedThreshold: ARENA_V1_CHARACTER_PRESENTATION_TUNING.runSpeedThreshold,
    knockbackSpeedThreshold: ARENA_V1_CHARACTER_PRESENTATION_TUNING.knockbackSpeedThreshold,
  });
  assert.ok(Object.isFrozen(ARENA_V1_COMBAT_PRESENTATION_CONFIG.hammerSmash.scale));
});

test('Arena frame projector reads ActionAffordance and exposes no hidden bot difficulty', () => {
  const core = createCore();
  const source = core.getSnapshot();
  const expectedActionId = source.participants[0].actionAffordance.primaryActionDefinitionId;
  const frame = projectArenaPresentationFrame({
    snapshot: source,
    publicMatchInfo: PUBLIC_INFO,
    content: ARENA_V1_GREYBOX_CONTENT,
  });

  assert.equal(frame.hud.action.definitionId, expectedActionId);
  assert.equal(
    frame.hud.action.label,
    ARENA_V1_GREYBOX_CONTENT.actions[expectedActionId].label,
  );
  assert.equal(frame.hud.opponent.displayName, '发条新秀');
  assert.equal(JSON.stringify(frame).includes('difficulty'), false);
  assert.equal(JSON.stringify(frame).includes('bot'), false);
  assert.equal('geometry' in frame.world.participants[0].appearance, false);
  assert.match(frame.world.participants[0].appearance.definitionHash, /^[0-9a-f]{8}$/);
  const enabledById = Object.fromEntries(source.map.surfaces.map(({ id, enabled }) => [id, enabled]));
  assert.deepEqual(
    frame.world.map.surfaces.map(({ id, enabled }) => ({ id, enabled })),
    ARENA_V1_GREYBOX_CONTENT.map.surfaces.map(({ id }) => ({ id, enabled: enabledById[id] })),
  );
  assert.throws(() => {
    frame.world.participants[0].position.x = 900;
  }, TypeError);
  assert.notEqual(source.participants[0].position.x, 900);

  core.destroy();
});

test('Arena frame projector fails closed on missing presentation content', () => {
  const core = createCore();
  const snapshot = core.getSnapshot();
  snapshot.participants[0].characterDefinitionId = 'missing-character';
  assert.throws(() => projectArenaPresentationFrame({
    snapshot,
    publicMatchInfo: PUBLIC_INFO,
    content: ARENA_V1_GREYBOX_CONTENT,
  }), /missing-character/);
  core.destroy();
});

test('Arena frame projector rejects cross-match HUD data and stale affordance', () => {
  const core = createCore();
  const snapshot = core.getSnapshot();
  assert.throws(() => projectArenaPresentationFrame({
    snapshot,
    publicMatchInfo: { ...PUBLIC_INFO, matchSeed: PUBLIC_INFO.matchSeed + 1 },
    content: ARENA_V1_GREYBOX_CONTENT,
  }), /matchSeed.*不一致/);
  snapshot.participants[0].actionAffordance.tick += 1;
  assert.throws(() => projectArenaPresentationFrame({
    snapshot,
    publicMatchInfo: PUBLIC_INFO,
    content: ARENA_V1_GREYBOX_CONTENT,
  }), /actionAffordance 身份无效/i);
  core.destroy();
});

test('Arena frame projector requires explicit content and rejects malformed snapshots atomically', () => {
  const core = createCore();
  const snapshot = core.getSnapshot();
  assert.throws(() => projectArenaPresentationFrame({
    snapshot,
    publicMatchInfo: PUBLIC_INFO,
  }), /content 不存在/);

  snapshot.participants[0].grounded = 1;
  assert.throws(() => projectArenaPresentationFrame({
    snapshot,
    publicMatchInfo: PUBLIC_INFO,
    content: ARENA_V1_GREYBOX_CONTENT,
  }), /grounded.*布尔值/);

  snapshot.participants[0].grounded = true;
  let getterCalls = 0;
  const hostileEvent = Object.defineProperty({}, 'sequence', {
    enumerable: true,
    get() { getterCalls += 1; return 1; },
  });
  assert.throws(() => projectArenaPresentationFrame({
    snapshot,
    events: [hostileEvent],
    publicMatchInfo: PUBLIC_INFO,
    content: ARENA_V1_GREYBOX_CONTENT,
  }), /数据字段/);
  assert.equal(getterCalls, 0);
  core.destroy();
});

test('PresentationEventWindow validates atomically and suppresses duplicate or evicted old events', () => {
  const window = new PresentationEventWindow({ capacity: 2 });
  const events = [0, 1, 2].map((sequence) => ({
    id: `41:${sequence}:${sequence}`,
    type: 'ActionStarted',
    tick: sequence,
    sequence,
    nested: { value: sequence },
  }));
  assert.deepEqual(window.consume(events.slice(0, 2)).map(({ sequence }) => sequence), [0, 1]);
  assert.deepEqual(window.consume([events[1], events[2]]).map(({ sequence }) => sequence), [2]);
  assert.deepEqual(window.consume([events[0]]), []);
  assert.equal(window.getDebugSnapshot().retainedIds, 2);
  assert.equal(window.getDebugSnapshot().duplicateCount, 2);

  const before = window.getDebugSnapshot();
  assert.throws(() => window.consume([
    { id: '41:3:3', type: 'Valid', tick: 3, sequence: 3 },
    { id: '', type: 'Broken', tick: 4, sequence: 4 },
  ]), /非空字符串/);
  assert.deepEqual(window.getDebugSnapshot(), before);
  assert.throws(() => window.consume([
    { id: '41:3:3', type: 'Valid', tick: 3, sequence: 3 },
    { id: 'collision', type: 'Collision', tick: 3, sequence: 3 },
  ]), /稳定 ID 冲突/);
  assert.deepEqual(window.getDebugSnapshot(), before);
  window.destroy();
  assert.throws(() => window.consume([]), /已销毁/);
});

test('orthographic Arena camera keeps fixed world input basis across aspect ratios', () => {
  const bounds = createArenaWorldBounds(ARENA_V1_GREYBOX_CONTENT.map.surfaces);
  const portrait = createOrthographicArenaCamera({
    viewport: { width: 390, height: 844 },
    worldBounds: bounds,
  });
  const landscape = createOrthographicArenaCamera({
    viewport: { width: 844, height: 390 },
    worldBounds: bounds,
  });
  assert.deepEqual(portrait.inputBasis, landscape.inputBasis);
  assert.deepEqual(portrait.inputBasis, {
    screenRight: { x: 1, z: 0 },
    screenUp: { x: 0, z: 1 },
  });
  assert.equal(portrait.visualTransform.mirrorWorldX, true);
  assert.ok(
    portrait.frustum.right - portrait.frustum.left
      >= bounds.maxX - bounds.minX + 4 - 1e-9,
  );
});
