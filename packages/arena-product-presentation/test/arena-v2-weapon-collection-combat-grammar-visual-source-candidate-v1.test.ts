import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  WEAPON_ACTION_CONTEXT_V1,
  WEAPON_CORE_VERB_V1,
  WEAPON_COUNTER_INPUT_V1,
  WEAPON_FAILURE_RISK_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
} from '../src/arena-v2-weapon-collection-combat-grammar-visual-source-candidate-v1.js';

describe('Arena V2 A5/A6 weapon combat grammar visual source（未运行候选）', () => {
  it('从既有20武器内容目录逐项投影固定ground/aerial语法且不复制战斗数值', () => {
    const source = ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1;
    expect(source.entries).toHaveLength(20);
    expect(source.entries.map(({ weaponDefinitionId }) => weaponDefinitionId)).toEqual(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.map(
        ({ weaponDefinitionId }) => weaponDefinitionId,
      ),
    );
    expect(source.entries.map(({ catalogId }) => catalogId)).toEqual(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.map(
        ({ catalogId }) => catalogId,
      ),
    );
    source.entries.forEach((entry, index) => {
      const authority = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons[index]!;
      expect(entry).toEqual({
        weaponDefinitionId: authority.weaponDefinitionId,
        catalogId: authority.catalogId,
        collectionOrder: authority.collectionOrder,
        coreVerb: authority.coreVerb,
        contexts: authority.actions.map((action) => ({
          context: action.context,
          actionDefinitionId: action.actionDefinitionId,
          failureRisk: action.failureRisk,
          counterInputs: action.counterInputs,
        })),
      });
      expect(entry.contexts.map(({ context }) => context)).toEqual([
        WEAPON_ACTION_CONTEXT_V1.GROUND,
        WEAPON_ACTION_CONTEXT_V1.AERIAL,
      ]);
    });
    const serialized = JSON.stringify(source);
    for (const forbidden of [
      'range', 'coverageValue', 'windupTicks', 'activeTicks', 'recoveryTicks',
      'cooldownTicks', 'rarity', 'power', 'reward',
    ]) expect(serialized).not.toContain(`\"${forbidden}\"`);
  });

  it('状态、来源与不猜距离档位边界保持失败关闭', () => {
    expect(ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        defaultSurfaceWired: false,
        weaponCount: 20,
        contextOrder: ['ground', 'aerial'],
        projectsDistanceBand: false,
        distanceBandOmittedBecauseNoApprovedStableCategoryExists: true,
        copiesCombatNumbers: false,
        readsRuntimeRules: false,
        grantsAssetApproval: false,
        sourceCatalogContentHash:
          ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.contentHash,
      });
    expect(Object.isFrozen(
      ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.entries,
    )).toBe(true);
    expect(Object.isFrozen(
      ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.entries[0]!.contexts,
    )).toBe(true);
    expect(new Set(Object.values(WEAPON_CORE_VERB_V1)).size).toBe(6);
    expect(new Set(Object.values(WEAPON_ACTION_CONTEXT_V1)).size).toBe(2);
    expect(new Set(Object.values(WEAPON_COUNTER_INPUT_V1)).size).toBe(2);
    expect(new Set(Object.values(WEAPON_FAILURE_RISK_V1)).size).toBe(7);
  });
});
