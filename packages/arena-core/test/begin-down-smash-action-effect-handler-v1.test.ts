import { describe, expect, it } from 'vitest';
import { ACTION_EFFECT_TRIGGER } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_BEGIN_DOWN_SMASH_ACTION_EFFECT_KIND_V1,
  createArenaBeginDownSmashActionEffectHandlerV1,
} from '../src/index.js';

const EFFECT = Object.freeze({
  id: 'arena-core.begin-down-smash.test.v1',
  kind: ARENA_BEGIN_DOWN_SMASH_ACTION_EFFECT_KIND_V1,
  trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
  parameters: Object.freeze({}),
});

describe('Arena begin-down-smash ActionEffectHandler V1', () => {
  it('accepts only empty parameters and freezes the stable ACTION_STARTED command', () => {
    const handler = createArenaBeginDownSmashActionEffectHandlerV1();

    handler.validateParameters({}, 'arena-action.test.v1');
    expect(handler.kind).toBe(ARENA_BEGIN_DOWN_SMASH_ACTION_EFFECT_KIND_V1);
    expect(handler.triggers).toEqual([ACTION_EFFECT_TRIGGER.ACTION_STARTED]);
    expect(Object.isFrozen(handler)).toBe(true);
    expect(Object.isFrozen(handler.triggers)).toBe(true);

    const commands = handler.resolve({
      effect: EFFECT,
      context: Object.freeze({ source: Object.freeze({ id: 'participant-1' }) }),
    });
    expect(commands).toEqual([{
      kind: ARENA_BEGIN_DOWN_SMASH_ACTION_EFFECT_KIND_V1,
      participantId: 'participant-1',
    }]);
    expect(Object.isFrozen(commands)).toBe(true);
    expect(Object.isFrozen(commands[0])).toBe(true);
    expect(commands[0]).not.toHaveProperty('actionDefinitionId');
  });

  it('rejects extra, accessor, Symbol and hostile parameters without executing getters', () => {
    const handler = createArenaBeginDownSmashActionEffectHandlerV1();
    let getterCalls = 0;
    const accessorParameters = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(accessorParameters, 'future', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return true;
      },
    });

    expect(() => handler.validateParameters({ future: true }, 'action')).toThrow(/future/u);
    expect(() => handler.validateParameters(accessorParameters, 'action')).toThrow(/数据字段/u);
    expect(getterCalls).toBe(0);
    expect(() => handler.validateParameters({ [Symbol('future')]: true }, 'action'))
      .toThrow(/Symbol/u);
    expect(() => handler.validateParameters(new Proxy({}, {
      ownKeys() {
        throw new Error('hostile-ownKeys');
      },
    }), 'action')).toThrow(/hostile-ownKeys/u);
  });

  it('rejects absent, inherited, accessor and invalid source identities without getter execution', () => {
    const handler = createArenaBeginDownSmashActionEffectHandlerV1();
    const resolve = (source: unknown) => handler.resolve({
      effect: EFFECT,
      context: Object.freeze({ source }),
    });
    let getterCalls = 0;
    const accessorSource = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(accessorSource, 'id', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'participant-1';
      },
    });

    expect(() => resolve(undefined)).toThrow(/普通对象/u);
    expect(() => resolve({})).toThrow(/source\.id/u);
    expect(() => resolve(Object.create({ id: 'participant-1' }))).toThrow(/普通对象/u);
    expect(() => resolve({ id: '' })).toThrow(/非空字符串/u);
    expect(() => resolve(accessorSource)).toThrow(/数据字段/u);
    expect(getterCalls).toBe(0);
  });
});
