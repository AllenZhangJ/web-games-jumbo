import { describe, expect, it } from 'vitest';
import { ARENA_V2_WEAPON_RESEARCH_CATALOG } from '../src/index.js';

describe('Arena V2 weapon research catalog', () => {
  it('keeps twelve researched reference weapons as structured, non-production evidence', () => {
    expect(ARENA_V2_WEAPON_RESEARCH_CATALOG).toHaveLength(12);
    expect(new Set(ARENA_V2_WEAPON_RESEARCH_CATALOG.map(({ referenceId }) => referenceId)).size)
      .toBe(12);
    expect(ARENA_V2_WEAPON_RESEARCH_CATALOG.every(({ sourceUrl, contexts, hitResults, mapUses, notToCopy }) => (
      sourceUrl.startsWith('https://bfo.web.sdo.com/')
      && contexts.length >= 2
      && hitResults.length >= 2
      && mapUses.length >= 2
      && notToCopy.length >= 2
    ))).toBe(true);
  });

  it('preserves the minimum Arena translation without importing reference-game complexity', () => {
    const guns = ARENA_V2_WEAPON_RESEARCH_CATALOG.find(({ referenceId }) => (
      referenceId === 'white-platinum-dual-guns'
    ));
    expect(guns).toMatchObject({
      functionalFamily: 'line-pressure',
      coreVerb: '保持距离',
      arenaMinimumVersion: expect.stringContaining('直线投射物'),
    });
    expect(guns?.notToCopy).toContain('自动跟踪');

    const noodles = ARENA_V2_WEAPON_RESEARCH_CATALOG.find(({ referenceId }) => (
      referenceId === 'lonely-fried-noodles'
    ));
    expect(noodles?.hitResults).toContain('立即爆炸');
    expect(noodles?.hitResults).toContain('延迟爆炸');
    expect(noodles?.failureCost).toContain('机会成本');
  });
});
