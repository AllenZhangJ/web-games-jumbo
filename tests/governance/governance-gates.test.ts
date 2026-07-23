import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifyJavaScriptMigration } from '../../scripts/governance/check-js-migration.js';
import { verifyRetiredProductBoundaries } from '../../scripts/governance/check-product-boundaries.js';
import { verifyPresentationThreeBoundaries } from '../../scripts/governance/check-presentation-three-boundaries.js';

describe('enterprise governance gates', () => {
  it('keeps the repository free of JavaScript source files', async () => {
    const report = await verifyJavaScriptMigration();
    expect(report.currentCount).toBe(0);
  });

  it('rejects every new JavaScript source file without an allowlist escape hatch', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-zero-js-gate-'));
    try {
      await writeFile(path.join(directory, 'regression.js'), 'export const regression = true;\n');
      await expect(verifyJavaScriptMigration(directory)).rejects.toThrow(
        /禁止提交 JavaScript 源文件：regression\.js/,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('keeps the retired product outside the active repository', async () => {
    await expect(verifyRetiredProductBoundaries()).resolves.toBeUndefined();
  });

  it('keeps Three presentation dependencies and authority boundaries exact', async () => {
    await expect(verifyPresentationThreeBoundaries()).resolves.toEqual({
      sourceFileCount: 21,
      productSourceFileCount: 2,
    });
  });
});
