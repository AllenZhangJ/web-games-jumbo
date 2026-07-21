import { describe, expect, it } from 'vitest';
import {
  LOCAL_MATCH_SESSION_STATE,
  LocalMatchSession,
} from '../src/index.js';

describe('arena-session deterministic foundation', () => {
  it('publishes one frozen explicit lifecycle state catalog', () => {
    expect(LOCAL_MATCH_SESSION_STATE).toEqual({
      CREATED: 'created',
      RUNNING: 'running',
      PAUSED: 'paused',
      ENDED: 'ended',
      DESTROYED: 'destroyed',
    });
    expect(Object.isFrozen(LOCAL_MATCH_SESSION_STATE)).toBe(true);
  });

  it('rejects constructor accessors without executing caller code', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'core', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return null;
      },
    });
    expect(() => new LocalMatchSession(options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });
});
