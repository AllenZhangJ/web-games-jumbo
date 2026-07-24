import { describe, expect, it } from 'vitest';
import { createProductPresentationSessionComposition } from '../src/index.js';

function platformHarness(): Record<string, unknown> {
  return {
    id: 'strict-host',
    createCanvas() { return {}; },
    getViewport() { return { width: 390, height: 844 }; },
    requestFrame() { return 1; },
    cancelFrame() { return true; },
    now() { return 100; },
    wallNow() { return 200; },
    bindInput() { return () => {}; },
    onResize() { return () => {}; },
    onShow() { return () => {}; },
    onHide() { return () => {}; },
    storageRead() { return null; },
    storageWrite() { return true; },
    storageDelete() { return true; },
  };
}

describe('Arena V1 application session composition', () => {
  it('rejects option and platform accessors without executing caller code', () => {
    let reads = 0;
    const options = Object.defineProperty({}, 'rendererFactory', {
      enumerable: true,
      get() {
        reads += 1;
        return () => ({});
      },
    });
    expect(() => createProductPresentationSessionComposition(platformHarness(), options))
      .toThrow(/不能是访问器/);

    const platform = platformHarness();
    Object.defineProperty(platform, 'now', {
      enumerable: true,
      get() {
        reads += 1;
        return () => 0;
      },
    });
    expect(() => createProductPresentationSessionComposition(platform, {
      rendererFactory: () => ({}),
    })).toThrow(/数据方法/);
    expect(reads).toBe(0);
  });

  it('snapshots host and seed capabilities before publishing the composition', () => {
    const platform = platformHarness();
    const seedSource = { nextSeed: () => 41 };
    const composition = createProductPresentationSessionComposition(platform, {
      rendererFactory: () => ({}),
      seedSource,
      ownerId: 'strict-owner',
    });
    platform.now = () => 999;
    seedSource.nextSeed = () => 99;
    expect((composition.platform as { now(): unknown }).now()).toBe(100);
    expect((composition.seedSource as { nextSeed(): unknown }).nextSeed()).toBe(41);
    expect(Object.isFrozen(composition.platform)).toBe(true);
    expect(Object.isFrozen(composition.seedSource)).toBe(true);
  });

  it('rejects optional host accessors and symbol options without executing them', () => {
    let reads = 0;
    const platform = platformHarness();
    Object.defineProperty(platform, 'createAudio', {
      enumerable: true,
      get() {
        reads += 1;
        return () => ({});
      },
    });
    expect(() => createProductPresentationSessionComposition(platform, {
      rendererFactory: () => ({}),
    })).toThrow(/数据方法/);
    expect(reads).toBe(0);

    expect(() => createProductPresentationSessionComposition(platformHarness(), {
      rendererFactory: () => ({}),
      [Symbol('unexpected')]: true,
    })).toThrow(/Symbol/);
  });

  it('does not execute viewport accessors while deriving a fallback seed', () => {
    let reads = 0;
    const viewport = Object.defineProperties({}, {
      width: { get() { reads += 1; return 390; } },
      height: { get() { reads += 1; return 844; } },
    });
    const platform = platformHarness();
    platform.getViewport = () => viewport;
    const composition = createProductPresentationSessionComposition(platform, {
      rendererFactory: () => ({}),
      ownerId: 'viewport-owner',
    });
    expect(composition.seedSource).toBeTruthy();
    expect(reads).toBe(0);
  });
});
