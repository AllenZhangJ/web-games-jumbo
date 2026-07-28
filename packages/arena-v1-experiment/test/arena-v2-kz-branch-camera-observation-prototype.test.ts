import { describe, expect, it } from 'vitest';
import { runArenaV2KzBranchCameraObservationPrototype } from '../src/index.js';

describe('Arena V2 KZ branch camera observation prototype', () => {
  it('keeps both branch choices visible at choice and reentry on portrait and landscape profiles', () => {
    const first = runArenaV2KzBranchCameraObservationPrototype();
    const second = runArenaV2KzBranchCameraObservationPrototype();

    expect(first).toEqual(second);
    expect(first.productionStatus).toBe('research-only');
    expect(first.observationTick).toBe(120);
    expect(first.reentryTickOffset).toBe(182);
    expect(first.observations).toHaveLength(8);
    expect(first.allObservationsPass).toBe(true);
    expect(first.observations.every(({ allBranchesVisible }) => allBranchesVisible)).toBe(true);
    expect(first.observations.every(({ visibleBranchIds }) => visibleBranchIds.length === 2)).toBe(true);
  });

  it('records the smallest viewport margin instead of claiming visual proof', () => {
    const result = runArenaV2KzBranchCameraObservationPrototype();

    expect(result.observations.every(({ minimumHorizontalMargin, minimumVerticalMargin }) => (
      minimumHorizontalMargin > 0 && minimumVerticalMargin > 0
    ))).toBe(true);
    expect(result.observations.some(({ viewportId, minimumHorizontalMargin }) => (
      viewportId === 'mobile-portrait' && minimumHorizontalMargin < 0.1
    ))).toBe(true);
  });
});
