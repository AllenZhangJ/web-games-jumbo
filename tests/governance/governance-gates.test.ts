import { describe, expect, it } from 'vitest';
import { verifyJavaScriptMigration } from '../../scripts/governance/check-js-migration.js';
import { verifyRetiredProductBoundaries } from '../../scripts/governance/check-product-boundaries.js';
import { verifyPresentationThreeBoundaries } from '../../scripts/governance/check-presentation-three-boundaries.js';

describe('enterprise governance gates', () => {
  it('keeps the JavaScript migration allowlist exact and decreasing', async () => {
    const report = await verifyJavaScriptMigration();
    expect(report.currentCount).toBeLessThanOrEqual(report.baselineCount);
  });

  it('keeps the retired product outside the active repository', async () => {
    await expect(verifyRetiredProductBoundaries()).resolves.toBeUndefined();
  });

  it('keeps Three presentation dependencies and authority boundaries exact', async () => {
    await expect(verifyPresentationThreeBoundaries()).resolves.toEqual({ sourceFileCount: 9 });
  });
});
