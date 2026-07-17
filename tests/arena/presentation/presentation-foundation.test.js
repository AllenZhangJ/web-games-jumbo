import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '../../../src/arena/arena-v1-match-core.js';
import { STAGE5_MAP_DEFINITION } from '../../../src/arena/content/stage5-map.js';
import { ARENA_V1_GREYBOX_CONTENT } from '../../../src/arena/presentation/content/arena-v1-greybox-content.js';
import {
  createArenaWorldBounds,
  createOrthographicArenaCamera,
} from '../../../src/arena/presentation/camera/orthographic-arena-camera.js';
import { PresentationEventWindow } from '../../../src/arena/presentation/events/presentation-event-window.js';
import { projectArenaPresentationFrame } from '../../../src/arena/presentation/projection/arena-frame-projector.js';

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

test('Arena frame projector reads ActionAffordance and exposes no hidden bot difficulty', () => {
  const core = createCore();
  const source = core.getSnapshot();
  const expectedActionId = source.participants[0].actionAffordance.primaryActionDefinitionId;
  const frame = projectArenaPresentationFrame({
    snapshot: source,
    publicMatchInfo: PUBLIC_INFO,
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
  }), /missing-character/);
  core.destroy();
});

test('Arena frame projector rejects cross-match HUD data and stale affordance', () => {
  const core = createCore();
  const snapshot = core.getSnapshot();
  assert.throws(() => projectArenaPresentationFrame({
    snapshot,
    publicMatchInfo: { ...PUBLIC_INFO, matchSeed: PUBLIC_INFO.matchSeed + 1 },
  }), /matchSeed.*不一致/);
  snapshot.participants[0].actionAffordance.tick += 1;
  assert.throws(() => projectArenaPresentationFrame({
    snapshot,
    publicMatchInfo: PUBLIC_INFO,
  }), /actionAffordance 身份无效/i);
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
