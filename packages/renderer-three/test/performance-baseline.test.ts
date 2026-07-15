import { expect, test } from 'vitest';
import { RenderResourceScope } from '../src/resources/resource-scope.js';
import { RENDER_QUALITY_PROFILES, resolveRenderQualityProfile } from '../src/diagnostics/performance-budget.js';
import { TextureManager } from '../src/resources/texture-manager.js';
import { HudScene } from '../src/hud/hud-scene.js';

function context() {
  return {
    clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {},
    closePath() {}, fill() {}, stroke() {}, fillText() {},
  };
}

function platform() {
  return {
    createOffscreenCanvas: () => ({
      width: 1,
      height: 1,
      getContext: () => context(),
    }),
  };
}

test('content menu baseline proves entry-count eviction can retain about 59.5 MB', () => {
  const manager = new TextureManager(platform(), { maxBytes: 128 * 1024 * 1024 });
  for (let index = 0; index < 10; index += 1) {
    manager.get(`hud-content:classic:exact:character-${index}`, 1220, 1220, () => {});
  }
  expect(manager.stats()).toMatchObject({
    cacheEntries: 10,
    cacheBytes: 59_536_000,
    maxEntries: 96,
  });
  expect(manager.stats().cacheBytes).toBeGreaterThan(RENDER_QUALITY_PROFILES.high.uiTextureBudgetBytes);
  manager.dispose();
});

test('quality profiles expose explicit high and low budgets', () => {
  expect(resolveRenderQualityProfile('high').id).toBe('high');
  expect(resolveRenderQualityProfile('low').id).toBe('low');
  expect(resolveRenderQualityProfile('unknown').id).toBe('high');
  expect(RENDER_QUALITY_PROFILES.low.shadowMapSize)
    .toBeLessThan(RENDER_QUALITY_PROFILES.high.shadowMapSize);
});

test('resource scope disposes owned resources in reverse order and remains idempotent', () => {
  const order: string[] = [];
  const scope = new RenderResourceScope('fixture');
  scope.own({ dispose: () => order.push('first') });
  scope.own({ dispose: () => order.push('second') });
  scope.dispose();
  scope.dispose();
  expect(order).toEqual(['second', 'first']);
  expect(scope.size).toBe(0);
});

test('byte LRU evicts old cached textures independently of entry count', () => {
  const manager = new TextureManager(platform(), { maxEntries: 96, maxBytes: 300 });
  const first = manager.get('first', 8, 8, () => {});
  const second = manager.get('second', 8, 8, () => {});
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(manager.stats()).toMatchObject({ cacheEntries: 1, cacheBytes: 256, maxBytes: 300 });
  expect(manager.cache.has('first@8x8')).toBe(false);
  expect(manager.cache.has('second@8x8')).toBe(true);
  manager.dispose();
});

function contentMenu(index: number) {
  return {
    open: true,
    gameplay: {
      id: `gameplay-${index % 5}`, name: `玩法 ${index % 5}`, description: '玩法描述',
      index: (index % 5) + 1, total: 5,
    },
    task: {
      id: `task-${index % 5}`, name: `任务 ${index % 5}`, description: '任务描述',
      index: (index % 5) + 1, total: 5,
    },
    character: {
      id: `character-${index % 10}`, name: `角色 ${index % 10}`, description: '角色描述',
      index: (index % 10) + 1, total: 10,
    },
  };
}

test('cycling all content repaints one menu texture and releases it on close', () => {
  const manager = new TextureManager(platform());
  const hud = new HudScene(manager);
  hud.resize({ width: 390, height: 844 });
  for (let index = 0; index < 50; index += 1) {
    hud.update({
      phase: 'ready', currentValue: 8, targetValue: 42, movesRemaining: 7,
    }, { contentMenu: contentMenu(index) });
  }
  expect(manager.stats()).toMatchObject({
    dynamicTextures: 1,
    dynamicBytes: 4_194_304,
    createdDynamicTextures: 1,
  });
  expect([...manager.cache.keys()].some((key: string) => key.startsWith('hud-content:'))).toBe(false);

  hud.update({ phase: 'ready', currentValue: 8, targetValue: 42, movesRemaining: 7 }, {
    contentMenu: { open: false },
  });
  expect(manager.stats().dynamicTextures).toBe(0);
  expect(manager.stats().totalBytes).toBeLessThanOrEqual(16 * 1024 * 1024);
  hud.dispose();
  manager.dispose();
});

test('charging prewarms release-to-jump HUD textures', () => {
  const manager = new TextureManager(platform());
  const hud = new HudScene(manager);
  const summary = { gameplayName: '全能跃迁', taskName: '精确命中' };
  const base = { currentValue: 8, targetValue: 42, movesRemaining: 7 };
  hud.update({ ...base, phase: 'ready' }, { contentSummary: summary });
  hud.update({ ...base, phase: 'charging', selectedChoice: 0 }, {
    selectedChoice: 0,
    choiceControlMap: { left: 0, right: 1 },
    contentSummary: summary,
  });
  const beforeRelease = manager.stats().createdTextures;
  hud.update({ ...base, phase: 'jumping', selectedChoice: 0 }, {
    selectedChoice: 0,
    choiceControlMap: { left: 0, right: 1 },
    contentSummary: summary,
  });
  expect(manager.stats().createdTextures).toBe(beforeRelease);
  hud.dispose();
  manager.dispose();
});
