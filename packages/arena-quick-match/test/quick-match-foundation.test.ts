import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { BotProfileRegistry, BOT_PROFILE_REGISTRY } from '@number-strategy-jump/arena-bot';
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

  it('validates the read-only Bot Profile Registry at composition time', () => {
    const completeCustomRegistry = new BotProfileRegistry([
      ...BOT_PROFILE_REGISTRY.list().map((profile) => ({
        ...profile,
        maximumInputMagnitude: Math.min(profile.maximumInputMagnitude, 0.75),
      })),
      {
        ...BOT_PROFILE_REGISTRY.require('hard'),
        id: 'rush',
      },
    ]);
    const service = new QuickMatchService({
      coreFactory: () => null as never,
      botProfileRegistry: completeCustomRegistry,
    });
    service.destroy();

    let coreCalls = 0;
    let botCalls = 0;
    let sessionCalls = 0;
    expect(() => new QuickMatchService({
      coreFactory: () => {
        coreCalls += 1;
        return null as never;
      },
      botControllerFactory: () => {
        botCalls += 1;
        throw new Error('不应在组合校验前创建 Bot。');
      },
      sessionFactory: () => {
        sessionCalls += 1;
        throw new Error('不应在组合校验前创建 Session。');
      },
      botProfileRegistry: new BotProfileRegistry([
        BOT_PROFILE_REGISTRY.require('hard'),
      ]),
    })).toThrow(/未知 Bot Profile/);
    expect({ coreCalls, botCalls, sessionCalls }).toEqual({
      coreCalls: 0,
      botCalls: 0,
      sessionCalls: 0,
    });
    expect(() => new QuickMatchService({
      coreFactory: () => null as never,
      botProfileRegistry: { require: () => BOT_PROFILE_REGISTRY.require('hard') } as never,
    })).toThrow(/已校验的只读 Registry/);
  });

  it('classifies a missing foreign Session method without observing Error.message', async () => {
    const source = await readFile(new URL('../src/quick-match-service.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/error\.message/);
    expect(source).toMatch(/class MissingDataMethodError extends TypeError/);
    expect(source).toMatch(/if \(isMissingDataMethodError\(error\)\)/);
    expect(() => new QuickMatchService({
      seedSource: {} as never,
    }, {
      coreFactory: () => null as never,
    })).toThrow(TypeError);
  });
});
