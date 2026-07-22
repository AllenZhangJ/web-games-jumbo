import { describe, expect, it } from 'vitest';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ArenaV1QuickMatchService,
  QuickMatchService,
  assertArenaV1AuthorityContent,
  createArenaV1MatchCore,
} from '../src/index.js';

describe('Arena V1 strict application composition', () => {
  it('rejects option and nested config accessors before executing caller code', () => {
    let reads = 0;
    const outer = Object.defineProperty({}, 'config', {
      enumerable: true,
      get() {
        reads += 1;
        return {};
      },
    });
    expect(() => createArenaV1MatchCore(outer)).toThrow(/数据字段/);

    const config = Object.defineProperty({}, 'arena', {
      enumerable: true,
      get() {
        reads += 1;
        return {};
      },
    });
    expect(() => createArenaV1MatchCore({ seed: 1, config })).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });

  it('keeps same-seed quick matches deterministic through the public composition root', () => {
    const first = new ArenaV1QuickMatchService().create({ matchSeed: 20260722 });
    const second = new ArenaV1QuickMatchService().create({ matchSeed: 20260722 });
    expect(createDeterministicDataHash(first.session.getSnapshot(), 'first snapshot'))
      .toBe(createDeterministicDataHash(second.session.getSnapshot(), 'second snapshot'));
    expect(first.opponent).toEqual(second.opponent);
    first.session.destroy();
    second.session.destroy();
  });

  it('rejects injected registry accessors without executing them', () => {
    let reads = 0;
    const registry = {
      require() { return null; },
      list() { return []; },
    };
    const accessorRegistry = Object.defineProperty({}, 'require', {
      enumerable: true,
      get() {
        reads += 1;
        return () => null;
      },
    });
    expect(() => assertArenaV1AuthorityContent({
      actionRegistry: accessorRegistry,
      equipmentRegistry: registry,
      mapRegistry: registry,
      characterRegistry: registry,
    })).toThrow(/数据方法/);
    expect(reads).toBe(0);
  });

  it('keeps the compatibility export on the same governed implementation', () => {
    expect(QuickMatchService).toBe(ArenaV1QuickMatchService);
    const service = new QuickMatchService();
    service.destroy();
    expect(() => service.create({ matchSeed: 1 })).toThrow(/已销毁/);
  });
});
