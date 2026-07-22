import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  PRODUCT_CANVAS_UI_SURFACE_STATE,
  ProductCanvasUiSurface,
} from '../src/index.js';

function viewModel(scene = 'home'): unknown {
  return {
    revision: 1,
    locale: 'zh-CN',
    busy: false,
    suspended: false,
    terminal: false,
    inputEnabled: true,
    screen: {
      sceneId: scene,
      title: '竞技场',
      body: '准备战斗',
      announcement: '竞技场',
      primaryAction: scene === 'gameplay'
        ? null
        : { label: '开始', enabled: true, intent: { id: 'start-match' } },
      secondaryAction: null,
    },
    characterOptions: [],
    match: null,
    result: null,
    reward: null,
    unlocks: [],
    error: null,
  };
}

function harness(hook: () => void = () => {}) {
  const calls: string[] = [];
  const context: Record<string, unknown> = Object.fromEntries([
    'setTransform', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo',
    'closePath', 'fill', 'stroke', 'arc', 'fillRect', 'fillText',
  ].map((name) => [name, (..._args: unknown[]) => {
    calls.push(name);
    hook();
  }]));
  const canvas = {
    width: 2,
    height: 2,
    getContext(kind: string) { return kind === '2d' ? context : null; },
  };
  return {
    calls,
    context,
    canvas,
    platform: {
      createOffscreenCanvas() { return canvas; },
    },
  };
}

describe('Product Canvas Three surface boundaries', () => {
  it('rejects option and platform method accessors without executing them', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'platform', {
      enumerable: true,
      get() { getterCalls += 1; return harness().platform; },
    });
    expect(() => new ProductCanvasUiSurface(options)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);

    const platform = Object.defineProperty({}, 'createOffscreenCanvas', {
      enumerable: true,
      get() { getterCalls += 1; return () => harness().canvas; },
    });
    expect(() => new ProductCanvasUiSurface({ platform })).toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
  });

  it('snapshots Canvas methods once and keeps invalid resize atomic before host writes', async () => {
    const host = harness();
    const surface = new ProductCanvasUiSurface({ platform: host.platform });
    (host.context.fillText as unknown) = () => { throw new Error('replacement must not run'); };
    await surface.load();
    surface.resize({ width: 390, height: 844, pixelRatio: 2 }, { width: 780, height: 1688 });
    surface.render(viewModel());
    expect(host.calls).toContain('fillText');
    const before = surface.getDebugSnapshot();

    let reads = 0;
    const invalid = Object.defineProperty({ height: 844 }, 'width', {
      enumerable: true,
      get() { reads += 1; return 390; },
    });
    expect(() => surface.resize(invalid)).toThrow(/数据字段/);
    expect(reads).toBe(0);
    expect(surface.getDebugSnapshot()).toEqual(before);
    surface.dispose();
  });

  it('fails closed when a drawing callback swallows a surface reentry error', async () => {
    const surfaceBox: { current: ProductCanvasUiSurface | null } = { current: null };
    let attempted = false;
    const host = harness(() => {
      if (attempted) return;
      attempted = true;
      try { surfaceBox.current?.getDebugSnapshot(); } catch { /* hostile host swallows reentry */ }
    });
    const surface = new ProductCanvasUiSurface({ platform: host.platform });
    surfaceBox.current = surface;
    await surface.load();
    surface.resize({ width: 390, height: 844 });
    expect(() => surface.render(viewModel())).toThrow(/失败关闭/);
    expect(attempted).toBe(true);
    expect(surface.state).toBe(PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED);
    expect(() => surface.render(viewModel())).toThrow(/不可用/);
    surface.dispose();
  });

  it('retries only the incomplete Three resource release', () => {
    const originalDispose = THREE.Material.prototype.dispose;
    let materialDisposals = 0;
    THREE.Material.prototype.dispose = function patchedDispose(): void {
      materialDisposals += 1;
      if (materialDisposals === 1) throw new Error('transient material release');
      originalDispose.call(this);
    };
    const surface = (() => {
      try { return new ProductCanvasUiSurface({ platform: harness().platform }); }
      finally { THREE.Material.prototype.dispose = originalDispose; }
    })();

    expect(() => surface.dispose()).toThrow(/清理未完整完成/);
    expect(surface.state).toBe(PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSE_INCOMPLETE);
    const firstPass = materialDisposals;
    surface.dispose();
    surface.dispose();
    expect(surface.state).toBe(PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED);
    expect(materialDisposals).toBe(firstPass + 1);
  });
});
