import { describe, expect, it } from 'vitest';
import {
  PRODUCT_INPUT_ROUTER_MODE,
  PRODUCT_UI_INTENT_ID,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ProductInputRouter,
  ProductSessionIntentDispatcher,
} from '../src/index.js';

function sampler(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const value = {
    pointerStart() { calls.push('pointerStart'); return true; },
    pointerMove() { calls.push('pointerMove'); return true; },
    pointerEnd() { calls.push('pointerEnd'); return true; },
    pointerCancel() { calls.push('pointerCancel'); return true; },
    resize() { calls.push('resize'); return true; },
    suspend() { calls.push('suspend'); return true; },
    resume() { calls.push('resume'); return true; },
    sample(tick: number) { calls.push('sample'); return { tick }; },
    destroy() { calls.push('destroy'); },
    getDebugSnapshot() { return { calls: [...calls] }; },
    ...overrides,
  };
  return { calls, value };
}

function controller() {
  let active = 'ready';
  const calls: string[] = [];
  const snapshot = () => ({ state: { state: active, activeState: active } });
  return {
    calls,
    value: {
      boot() { calls.push('boot'); return snapshot(); },
      openCharacterSelect() { calls.push('open'); active = 'character-select'; return snapshot(); },
      closeCharacterSelect() { calls.push('close'); active = 'ready'; return snapshot(); },
      selectCharacter(id: string) { calls.push(`select:${id}`); return snapshot(); },
      requestMatch() { calls.push('match'); active = 'matching'; return snapshot(); },
      requestRematch() { calls.push('rematch'); return snapshot(); },
      continueReward() { calls.push('continue'); return snapshot(); },
      dismissUnlocks() { calls.push('dismiss'); return snapshot(); },
      retry() { calls.push('retry'); return snapshot(); },
      getSnapshot: snapshot,
    },
  };
}

describe('Product presentation input boundaries', () => {
  it('routes a whitelisted UI tap and isolates gameplay sampling', async () => {
    const input = sampler();
    const intents: string[] = [];
    const router = new ProductInputRouter({
      sampler: input.value,
      viewport: { width: 200, height: 100 },
      hitTestUi: () => ({ id: PRODUCT_UI_INTENT_ID.START_MATCH }),
      onIntent: (intent) => { intents.push(intent.id); },
    });
    expect(input.calls).toEqual(['resize', 'suspend']);
    router.setMode(PRODUCT_INPUT_ROUTER_MODE.UI);
    expect(router.pointerStart({ x: 1, y: 2, pointerId: 7 })).toBe(true);
    expect(router.pointerEnd({ x: 1, y: 2, pointerId: 7 })).toBe(true);
    await Promise.resolve();
    expect(intents).toEqual([PRODUCT_UI_INTENT_ID.START_MATCH]);
    router.setMode(PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY);
    expect(router.sample(4)).toEqual({ tick: 4 });
    router.destroy();
  });

  it('rejects option and capability accessors without executing them', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'sampler', {
      enumerable: true,
      get() { getterCalls += 1; return sampler().value; },
    });
    expect(() => new ProductInputRouter(options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
    const input = sampler();
    Object.defineProperty(input.value, 'resume', {
      enumerable: true,
      get() { getterCalls += 1; return () => true; },
    });
    expect(() => new ProductInputRouter({
      sampler: input.value,
      viewport: { width: 1, height: 1 },
      hitTestUi: () => null,
      onIntent: () => {},
    })).toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
  });

  it('fails closed when a sampler swallows a router reentry error', () => {
    const routerBox: { current: ProductInputRouter | null } = { current: null };
    const input = sampler({
      resume() {
        input.calls.push('resume');
        try { routerBox.current?.getDebugSnapshot(); } catch { /* hostile host swallows reentry */ }
        return true;
      },
    });
    const router = new ProductInputRouter({
      sampler: input.value,
      viewport: { width: 10, height: 10 },
      hitTestUi: () => null,
      onIntent: () => {},
    });
    routerBox.current = router;
    expect(() => router.setMode(PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY)).toThrow(/失败关闭/);
    expect(() => router.getDebugSnapshot()).toThrow(/已销毁/);
    expect(input.calls.at(-1)).toBe('destroy');
  });
});

describe('Product UI intent serialization boundaries', () => {
  it('deduplicates one intent and snapshots controller methods', async () => {
    const product = controller();
    const dispatcher = new ProductSessionIntentDispatcher({ controller: product.value });
    product.value.requestMatch = () => { throw new Error('replacement must not run'); };
    const first = dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.START_MATCH });
    expect(dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.START_MATCH })).toBe(first);
    await first;
    expect(product.calls).toEqual(['open', 'match']);
    dispatcher.destroy();
  });

  it('rejects controller method accessors without executing them', () => {
    let getterCalls = 0;
    const product = controller();
    Object.defineProperty(product.value, 'retry', {
      enumerable: true,
      get() { getterCalls += 1; return () => {}; },
    });
    expect(() => new ProductSessionIntentDispatcher({ controller: product.value }))
      .toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
  });
});
