import { expect, test } from 'vitest';
import { RenderResourceScope } from '../src/resources/resource-scope.js';
import { RENDER_QUALITY_PROFILES, resolveRenderQualityProfile } from '../src/diagnostics/performance-budget.js';
import { TextureManager } from '../src/texture-manager.js';

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
  const manager = new TextureManager(platform());
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
