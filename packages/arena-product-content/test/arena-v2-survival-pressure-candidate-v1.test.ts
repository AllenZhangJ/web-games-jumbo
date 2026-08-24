import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1,
} from '../src/index.js';

describe('Arena V2 survival pressure candidate v1', () => {
  it('grows one shared enemy family from 1 to 16 on ten 20-second stages', () => {
    const candidate = ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1;
    expect(candidate.status).toBe('production-unreachable');
    expect(candidate.hardGate).toBe(false);
    expect(candidate.defaultRegistryWired).toBe(false);
    expect(candidate.enemyVisualArchetypeCount).toBe(1);
    expect(candidate.enemyAuthorityFamilyCount).toBe(1);
    expect(candidate.maximumActiveEnemies).toBe(16);
    expect(candidate.stageIntervalTicks).toBe(1_200);
    expect(candidate.pressurePolicyDefinition.stages).toHaveLength(10);
    expect(candidate.pressurePolicyDefinition.stages.map(({ desiredActiveEnemySlots }) => (
      desiredActiveEnemySlots
    ))).toEqual([1, 2, 3, 4, 5, 6, 8, 10, 12, 16]);
    expect(candidate.pressurePolicyDefinition.stages.map(({ startActiveTick }) => (
      startActiveTick
    ))).toEqual([0, 1_200, 2_400, 3_600, 4_800, 6_000, 7_200, 8_400, 9_600, 10_800]);
  });

  it('binds every slot to a real KZ re-entry anchor and the same character definition', () => {
    const candidate = ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1;
    const anchors = new Set(
      ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.anchors.map(({ id }) => id),
    );
    expect(candidate.pressurePolicyDefinition.slotEntries).toHaveLength(16);
    expect(candidate.pressurePolicyDefinition.slotEntries.every(({ anchorCapabilityId }) => (
      anchors.has(anchorCapabilityId)
    ))).toBe(true);
    expect(candidate.enemyFamilyCharacterDefinition.tags).toContain('single-archetype');
    expect(candidate.contentHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
