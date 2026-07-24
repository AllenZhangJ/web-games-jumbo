import { describe, expect, it } from 'vitest';
import {
  PRODUCT_SESSION_EVENT,
  PRODUCT_SESSION_STATE,
  ProductSessionStateMachine,
  ProductSessionTransitionRegistry,
  createProductSessionCleanupFailure,
} from '../src/index.js';

describe('arena-product-state foundation', () => {
  it('preserves suspended completion and explicit recovery targets', () => {
    const machine = new ProductSessionStateMachine();
    machine.dispatch(PRODUCT_SESSION_EVENT.BOOT_REQUESTED);
    machine.suspend();
    machine.dispatch(PRODUCT_SESSION_EVENT.PROFILE_LOADED);
    expect(machine.getSnapshot().activeState).toBe(PRODUCT_SESSION_STATE.READY);
    machine.resume();
    machine.failRecoverable(PRODUCT_SESSION_STATE.BOOT);
    machine.retry();
    expect(machine.state).toBe(PRODUCT_SESSION_STATE.BOOT);
    machine.destroy();
    expect(machine.destroy()).toEqual(machine.getSnapshot());
  });

  it('rejects constructor accessors and registry subclasses without execution', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'transitionRegistry', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return null;
      },
    });
    expect(() => new ProductSessionStateMachine(options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);

    class HostileRegistry extends ProductSessionTransitionRegistry {
      override resolve(): never {
        throw new Error('hostile resolve');
      }
    }
    expect(() => new ProductSessionStateMachine({
      transitionRegistry: new HostileRegistry(),
    })).toThrow(/普通对象|Definition 数组/);
  });

  it('freezes cleanup causes and rejects accessor array slots', () => {
    const failure = createProductSessionCleanupFailure([new Error('one')]);
    expect(failure).not.toBeNull();
    expect(Object.isFrozen(failure?.causes)).toBe(true);
    let getterCalls = 0;
    const errors = Object.defineProperty([], '0', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return new Error('hidden');
      },
    });
    Object.defineProperty(errors, 'length', { value: 1 });
    expect(() => createProductSessionCleanupFailure(errors)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });
});
