import { describe, expect, it } from 'vitest';
import { definitionKey } from '../src/index.js';

describe('definitionKey', () => {
  it('creates a stable versioned key', () => {
    expect(definitionKey({ id: 'number-strategy-jump', version: 1 }))
      .toBe('number-strategy-jump@1');
  });

  it('rejects unstable ids and versions', () => {
    expect(() => definitionKey({ id: 'Number Jump', version: 1 })).toThrow(TypeError);
    expect(() => definitionKey({ id: ' number-jump ', version: 1 })).toThrow(TypeError);
    expect(() => definitionKey({ id: 'number-jump', version: 0 })).toThrow(RangeError);
    expect(() => definitionKey(null)).toThrow(TypeError);
  });
});
