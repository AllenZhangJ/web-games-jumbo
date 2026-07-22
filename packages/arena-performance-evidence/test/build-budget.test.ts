import { describe, expect, it } from 'vitest';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
  ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaBuildBudgetReport,
  createArenaStage9BuildBudgetV1Policy,
} from '../src/index.js';

describe('build budget evidence', () => {
  it('recomputes a clean Web product build without trusting status', () => {
    const report = createArenaBuildBudgetReport(createArenaStage9BuildBudgetV1Policy(), {
      schemaVersion: ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
      buildId: 'arena-build-budget-test',
      commit: 'a'.repeat(40),
      sourceDirty: false,
      target: 'web',
      defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
      artifacts: [
        { path: 'index.html', sha256: 'b'.repeat(64), byteLength: 1_024 },
        { path: 'assets/game.js', sha256: 'c'.repeat(64), byteLength: 2_048 },
      ],
    });
    expect(report.status).toBe('passed');
    expect(report.freezeEligible).toBe(true);
    expect(report.deliveryBytes).toBe(3_072);
  });
});
