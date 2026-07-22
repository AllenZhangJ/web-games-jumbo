import { describe, expect, it } from 'vitest';
import { ARENA_V1_PRESENTATION_QUALITY_ID } from '@number-strategy-jump/arena-presentation-runtime';
import {
  createArenaPresentationMemoryProviderForLaunch,
  createArenaProductRendererFactory,
  createCanvasArenaProductGame,
  resolveArenaPresentationQualityForLaunch,
} from '../src/index.js';

describe('Arena V1 application launch', () => {
  it('rejects renderer and Canvas launch option accessors without execution', () => {
    let reads = 0;
    const rendererOptions = Object.defineProperty({}, 'uiSurfaceFactory', {
      enumerable: true,
      get() {
        reads += 1;
        return () => ({});
      },
    });
    expect(() => createArenaProductRendererFactory(rendererOptions)).toThrow(/访问器/);

    const canvasOptions = Object.defineProperty({}, 'qualityDefinition', {
      enumerable: true,
      get() {
        reads += 1;
        return {};
      },
    });
    expect(() => createCanvasArenaProductGame({ id: 'web' }, canvasOptions)).toThrow(/访问器/);
    expect(reads).toBe(0);
  });

  it('treats optional launch accessors as unavailable without executing them', () => {
    let reads = 0;
    const root = Object.defineProperties({}, {
      __ARENA_PRESENTATION_QUALITY__: {
        get() {
          reads += 1;
          return 'low';
        },
      },
      __ARENA_PERFORMANCE_MEMORY_PROVIDER__: {
        get() {
          reads += 1;
          return () => ({ processMemoryBytes: 1 });
        },
      },
    });
    const quality = resolveArenaPresentationQualityForLaunch({ root, platformId: 'web' }) as {
      readonly id: string;
    };
    expect(quality.id).toBe(ARENA_V1_PRESENTATION_QUALITY_ID.HIGH);
    const memoryProvider = createArenaPresentationMemoryProviderForLaunch({
      root,
      platformId: 'wechat',
    });
    expect(memoryProvider()).toBeNull();
    expect(reads).toBe(0);
  });

  it('preserves an explicitly isolated root instead of observing the host global', () => {
    const quality = resolveArenaPresentationQualityForLaunch({
      root: null,
      platformId: 'web',
    });
    expect(quality.id).toBe(ARENA_V1_PRESENTATION_QUALITY_ID.HIGH);
    expect(createArenaPresentationMemoryProviderForLaunch({
      root: null,
      platformId: 'web',
    })()).toBeNull();
  });

  it('rejects renderer factory argument accessors before creating resources', () => {
    let reads = 0;
    const rendererFactory = createArenaProductRendererFactory({
      uiSurfaceFactory: () => ({}),
      gameplayRendererFactory: () => ({}),
    });
    const args = Object.defineProperty({}, 'canvas', {
      enumerable: true,
      get() {
        reads += 1;
        return {};
      },
    });
    expect(() => rendererFactory(args)).toThrow(/访问器/);
    expect(reads).toBe(0);
  });
});
