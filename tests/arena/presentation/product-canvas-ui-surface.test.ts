import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_CANVAS_UI_SURFACE_STATE,
  ProductCanvasUiSurface,
} from '@number-strategy-jump/arena-product-presentation-three';
import {
  createProductCanvasLayout,
} from '@number-strategy-jump/arena-product-presentation';
import {
  createProductUiSceneModel,
} from '@number-strategy-jump/arena-product-presentation';

function fake2dContext() {
  return Object.fromEntries([
    'setTransform',
    'clearRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'quadraticCurveTo',
    'closePath',
    'fill',
    'stroke',
    'arc',
    'fillRect',
    'fillText',
  ].map((name) => [name, () => {}]));
}

interface FakeCanvas {
  width: number;
  height: number;
  getContext(kind: string): ReturnType<typeof fake2dContext> | null;
}

interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

function platformHarness() {
  const canvases: FakeCanvas[] = [];
  return {
    canvases,
    createOffscreenCanvas(width: number | CanvasSize, height?: number) {
      const canvas = {
        width: typeof width === 'object' ? width.width : width,
        height: typeof width === 'object' ? width.height : height ?? 0,
        getContext: (kind: string) => kind === '2d' ? fake2dContext() : null,
      } satisfies FakeCanvas;
      canvases.push(canvas);
      return canvas;
    },
  };
}

function viewModel(scene = 'home', overrides = {}) {
  return {
    revision: 4,
    locale: 'zh-CN',
    activeState: scene === 'home' ? 'ready' : scene,
    visibleState: scene === 'home' ? 'ready' : scene,
    busy: false,
    suspended: false,
    terminal: false,
    inputEnabled: true,
    screen: {
      sceneId: scene,
      title: scene === 'home' ? '竞技场' : '选择角色',
      body: '争夺装备，把对手击出平台',
      announcement: '竞技场',
      primaryAction: { label: '开始匹配', enabled: true, intent: { id: 'start-match' } },
      secondaryAction: { label: '选择角色', enabled: true, intent: { id: 'open-character-select' } },
    },
    characterOptions: [
      {
        characterDefinitionId: 'parkour-apprentice',
        name: '跑酷学徒',
        selected: true,
        selectIntent: { id: 'select-character', characterDefinitionId: 'parkour-apprentice' },
      },
      {
        characterDefinitionId: 'wind-up-cube',
        name: '发条方块',
        selected: false,
        selectIntent: { id: 'select-character', characterDefinitionId: 'wind-up-cube' },
      },
    ],
    match: null,
    result: null,
    reward: null,
    unlocks: [],
    error: null,
    ...overrides,
  };
}

test('ProductCanvasUiSurface draws and hit-tests public UI in input-buffer coordinates', async () => {
  const platform = platformHarness();
  const surface = new ProductCanvasUiSurface({ platform });
  await surface.load();
  const viewport = {
    width: 390,
    height: 844,
    pixelRatio: 2,
    safeArea: { left: 0, top: 42, right: 390, bottom: 820, width: 390, height: 778 },
  };
  const inputViewport = { width: 780, height: 1688 };
  assert.equal(surface.resize(viewport, inputViewport), true);
  const model = viewModel();
  assert.equal(surface.render(model), true);
  assert.equal(surface.requiresCompositeFrame(), true);
  assert.deepEqual(surface.getInputViewport(), inputViewport);
  const layout = createProductCanvasLayout(createProductUiSceneModel(model), viewport);
  const [primaryAction] = layout.actions;
  assert.ok(primaryAction);
  const primary = primaryAction.rect;
  assert.deepEqual(surface.hitTestUi({
    x: (primary.x + primary.width / 2) * 2,
    y: (primary.y + primary.height / 2) * 2,
  }, inputViewport, model), { id: 'start-match' });
  assert.equal(surface.hitTestUi({ x: 0, y: 0 }, inputViewport, model), null);

  const renderer = { renders: 0, render() { this.renders += 1; } };
  assert.equal(surface.present(renderer), true);
  assert.equal(renderer.renders, 1);
  assert.equal(surface.getDebugSnapshot().hitCount, 2);

  const cleanup = surface.bindIntent({ onIntent() {} });
  assert.equal(surface.getDebugSnapshot().bound, true);
  cleanup();
  surface.render(viewModel('gameplay', {
    revision: 5,
    inputEnabled: true,
    screen: {
      sceneId: 'gameplay',
      title: '对局进行中',
      body: null,
      announcement: '对局进行中',
      primaryAction: null,
      secondaryAction: null,
    },
  }));
  surface.present(renderer);
  assert.equal(renderer.renders, 1);
  assert.equal(surface.getDebugSnapshot().visible, false);
  assert.equal(surface.requiresCompositeFrame(), false);

  surface.dispose();
  surface.dispose();
  assert.equal(surface.state, PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED);
  assert.throws(() => surface.present(renderer), /不可用/);
});

test('Product Canvas layout keeps controls inside the declared safe area', () => {
  const viewport = {
    width: 390,
    height: 844,
    safeArea: { left: 12, top: 47, right: 378, bottom: 801, width: 366, height: 754 },
  };
  const layout = createProductCanvasLayout(createProductUiSceneModel(viewModel()), viewport);
  for (const { rect } of layout.actions) {
    assert.ok(rect.x >= viewport.safeArea.left);
    assert.ok(rect.y >= viewport.safeArea.top);
    assert.ok(rect.x + rect.width <= viewport.safeArea.right);
    assert.ok(rect.y + rect.height <= viewport.safeArea.bottom);
    assert.ok(rect.height >= 48);
  }
});

test('Product Canvas layout preserves a lone secondary action semantic', () => {
  const model = createProductUiSceneModel(viewModel('home', {
    screen: {
      sceneId: 'home',
      title: '竞技场',
      body: '',
      announcement: '竞技场',
      primaryAction: null,
      secondaryAction: {
        label: '返回',
        enabled: true,
        intent: { id: 'go-back' },
      },
    },
  }));
  const layout = createProductCanvasLayout(model, { width: 390, height: 844 });
  assert.equal(layout.actions.length, 1);
  const [secondaryAction] = layout.actions;
  assert.ok(secondaryAction);
  assert.equal(secondaryAction.kind, 'secondary');
  assert.deepEqual(secondaryAction.intent, { id: 'go-back' });
});
