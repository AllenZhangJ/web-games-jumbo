import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertEvidenceBoundedString,
  assertEvidenceGitCommit,
  assertEvidenceRelativePath,
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
  isEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';

test('Evidence Value Contract accepts canonical deterministic scalar values', () => {
  assert.equal(assertEvidenceBoundedString('operator-1', 32, 'operator'), 'operator-1');
  assert.equal(assertEvidenceGitCommit('a'.repeat(40), 'commit'), 'a'.repeat(40));
  assert.equal(assertEvidenceSha256('b'.repeat(64), 'sha256'), 'b'.repeat(64));
  assert.equal(
    assertEvidenceUtcInstant('2026-07-18T00:00:00.000Z', 'performedAt'),
    '2026-07-18T00:00:00.000Z',
  );
  assert.equal(isEvidenceUtcInstant('2026-07-18T00:00:00.000Z'), true);
  assert.equal(isEvidenceUtcInstant('2026-02-30T00:00:00.000Z'), false);
  assert.equal(
    assertEvidenceRelativePath('runs/run-1/evidence.json', 'path'),
    'runs/run-1/evidence.json',
  );
});

test('Evidence Value Contract rejects ambiguous identities and non-canonical time', () => {
  assert.throws(() => assertEvidenceGitCommit('A'.repeat(40), 'commit'), /小写 Git commit/);
  assert.throws(() => assertEvidenceGitCommit('a'.repeat(39), 'commit'), /40 位/);
  assert.throws(() => assertEvidenceSha256('B'.repeat(64), 'sha256'), /小写十六进制/);
  assert.throws(
    () => assertEvidenceUtcInstant('2026-07-18T00:00:00Z', 'performedAt'),
    /带毫秒/,
  );
  assert.throws(
    () => assertEvidenceUtcInstant('2026-02-30T00:00:00.000Z', 'performedAt'),
    /不是有效 UTC 时间/,
  );
  assert.throws(
    () => assertEvidenceBoundedString('a\u0000b', 8, 'operator', {
      rejectControlCharacters: true,
    }),
    /控制字符/,
  );
  assert.throws(
    () => assertEvidenceBoundedString('value', 8, 'operator', {
      rejectControlCharacters: 'yes',
    } as never),
    /必须是布尔值/,
  );
});

test('Evidence Value Contract rejects traversal, host paths and path encoding ambiguity', () => {
  for (const value of [
    '../escape.json',
    './evidence.json',
    'runs//evidence.json',
    '/absolute/evidence.json',
    'C:/evidence.json',
    'runs\\evidence.json',
    'https://example.com/evidence.json',
    'data:text/plain,evidence',
    'mailto:evidence@example.com',
    'runs/evidence\u0000.json',
  ]) {
    assert.throws(() => assertEvidenceRelativePath(value, 'path'), /相对路径|空段|控制字符/);
  }
  assert.throws(
    () => assertEvidenceRelativePath('123456789', 'path', { maximumLength: 8 }),
    /不能超过 8 个字符/,
  );
});
