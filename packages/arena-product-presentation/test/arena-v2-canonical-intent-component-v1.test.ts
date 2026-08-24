import { describe, expect, it } from 'vitest';
import {
  decodeArenaV2CanonicalIntentComponentV1,
} from '../src/index.js';

describe('Arena V2 canonical intent component V1', () => {
  it('decodes only components produced by canonical encodeURIComponent', () => {
    expect(decodeArenaV2CanonicalIntentComponentV1('weapon.a')).toBe('weapon.a');
    expect(decodeArenaV2CanonicalIntentComponentV1(
      '%E5%86%B2%E9%94%8B%E7%9B%BE',
    )).toBe('冲锋盾');
  });

  it('fails closed on empty, whitespace, malformed and noncanonical inputs', () => {
    expect(() => decodeArenaV2CanonicalIntentComponentV1('')).toThrow(/非空/);
    expect(() => decodeArenaV2CanonicalIntentComponentV1('%20')).toThrow(/不能为空/);
    expect(() => decodeArenaV2CanonicalIntentComponentV1('%')).toThrow(/percent-encoding/);
    expect(() => decodeArenaV2CanonicalIntentComponentV1('%77eapon.a'))
      .toThrow(/canonical/);
    expect(() => decodeArenaV2CanonicalIntentComponentV1(
      '%e5%86%b2%e9%94%8b%e7%9b%be',
    )).toThrow(/canonical/);
    expect(() => decodeArenaV2CanonicalIntentComponentV1('\uD800'))
      .toThrow(/Unicode/);
  });
});
