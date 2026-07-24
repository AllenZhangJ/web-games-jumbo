import { describe, expect, it } from 'vitest';
import {
  assertEvidenceGitCommit,
  assertEvidenceRelativePath,
  assertEvidenceUtcInstant,
} from '../src/index.js';

describe('evidence value contracts', () => {
  it('accepts canonical identities, time and relative paths', () => {
    expect(assertEvidenceGitCommit('a'.repeat(40), 'commit')).toBe('a'.repeat(40));
    expect(assertEvidenceUtcInstant('2026-07-21T10:00:00.000Z', 'time'))
      .toBe('2026-07-21T10:00:00.000Z');
    expect(assertEvidenceRelativePath('runs/ios/trace.json', 'path'))
      .toBe('runs/ios/trace.json');
  });

  it('rejects ambiguous or host-bound evidence values', () => {
    expect(() => assertEvidenceGitCommit('A'.repeat(40), 'commit')).toThrow(/40 位小写/);
    expect(() => assertEvidenceUtcInstant('2026-07-21T10:00:00Z', 'time'))
      .toThrow(/带毫秒/);
    expect(() => assertEvidenceRelativePath('../trace.json', 'path')).toThrow(/不能包含/);
  });
});
