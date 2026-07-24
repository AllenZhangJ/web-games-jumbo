import { describe, expect, it } from 'vitest';
import { QuickMatchService } from '../src/index.js';

describe('arena-quick-match lifecycle foundation', () => {
  it('rejects constructor accessors without executing caller code', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'coreFactory', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return () => null;
      },
    });
    expect(() => new QuickMatchService(options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('blocks factory reentry before any candidate ownership exists', () => {
    let reenter = (): void => {};
    const service = new QuickMatchService({
      coreFactory() {
        reenter();
        throw new Error('unreachable');
      },
    });
    reenter = () => { service.create({ matchSeed: 2 }); };
    expect(() => service.create({ matchSeed: 1 })).toThrow(/create 期间不能调用 create/);
    service.destroy();
    expect(() => service.create({ matchSeed: 3 })).toThrow(/已销毁/);
  });
});
