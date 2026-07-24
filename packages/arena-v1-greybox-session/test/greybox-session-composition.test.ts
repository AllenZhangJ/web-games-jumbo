import { describe, expect, it } from 'vitest';
import { createArenaGreyboxSessionComposition } from '../src/index.js';

function platform(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'test',
    createCanvas: () => ({}),
    getViewport: () => ({ width: 390, height: 844 }),
    requestFrame: () => 1,
    cancelFrame: () => {},
    now: () => 1,
    bindInput: () => () => {},
    onResize: () => () => {},
    onShow: () => () => {},
    onHide: () => () => {},
    ...overrides,
  };
}

describe('Arena V1 greybox session composition', () => {
  it('rejects option and platform accessors without executing them', () => {
    let reads = 0;
    const options = Object.defineProperty({}, 'initialSeed', {
      enumerable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    expect(() => createArenaGreyboxSessionComposition(platform(), options)).toThrow(/访问器/);
    const host = platform();
    Object.defineProperty(host, 'now', {
      enumerable: true,
      get() {
        reads += 1;
        return () => 1;
      },
    });
    expect(() => createArenaGreyboxSessionComposition(host)).toThrow(/数据方法/);
    expect(reads).toBe(0);
  });

  it('snapshots platform and match service methods before publication', () => {
    const host = platform({ now: () => 7 });
    const create = () => ({ id: 'original' });
    const service = { create };
    const composition = createArenaGreyboxSessionComposition(host, { matchService: service });
    host.now = () => 99;
    service.create = () => ({ id: 'replacement' });
    expect(composition.platform.now).toBeTypeOf('function');
    expect((composition.platform.now as () => number)()).toBe(7);
    expect(composition.matchService.create()).toEqual({ id: 'original' });
  });

  it('does not execute viewport accessors while deriving a default seed', () => {
    let reads = 0;
    const viewport = Object.defineProperties({}, {
      width: { get() { reads += 1; return 390; } },
      height: { get() { reads += 1; return 844; } },
    });
    const composition = createArenaGreyboxSessionComposition(platform({
      getViewport: () => viewport,
    }));
    expect(composition.matchService.create).toBeTypeOf('function');
    expect(reads).toBe(0);
  });
});
