import { describe, expect, it } from 'vitest';
import { ARENA_V2_SURVIVOR_IO_UI_EVIDENCE } from '../src/index.js';

describe('Arena V2 Survivor.io UI evidence', () => {
  it('keeps official claims, Arena translation, and scope boundaries separate', () => {
    expect(ARENA_V2_SURVIVOR_IO_UI_EVIDENCE).toHaveLength(4);
    expect(new Set(ARENA_V2_SURVIVOR_IO_UI_EVIDENCE.map(({ referenceId }) => referenceId)).size)
      .toBe(4);
    expect(ARENA_V2_SURVIVOR_IO_UI_EVIDENCE.every((card) => (
      card.sourceUrl.startsWith('https://')
      && card.sourceClaims.length >= 2
      && card.informationSignals.length >= 2
      && card.arenaTranslation.length >= 2
      && card.notToCopy.length >= 2
      && card.productionAssetStatus === 'research-only'
    ))).toBe(true);
    expect(ARENA_V2_SURVIVOR_IO_UI_EVIDENCE.every(({ sourceUrl }) => (
      sourceUrl.includes('apps.apple.com') || sourceUrl.includes('play.google.com')
    ))).toBe(true);
  });

  it('preserves the behavior-first weapon learning evidence', () => {
    const guide = ARENA_V2_SURVIVOR_IO_UI_EVIDENCE.find(({ referenceId }) => (
      referenceId === 'official-guide-weapon-and-scenario-language'
    ));
    expect(guide?.sourceClaims).toContain('官方指南将苦无描述为自动追击目标且不需要瞄准。');
    expect(guide?.sourceClaims).toContain('官方指南将霰弹枪、太刀和棒球棍描述为需要面对方向的武器。');
    expect(guide?.arenaTranslation).toContain('武器概览先显示核心动词、命中结果和适合的地图空间，再显示真实数值。');
    expect(guide?.notToCopy).toContain('自动锁定和自动攻击');
  });

  it('keeps research evidence immutable and out of production assets', () => {
    const [first] = ARENA_V2_SURVIVOR_IO_UI_EVIDENCE;
    expect(Object.isFrozen(ARENA_V2_SURVIVOR_IO_UI_EVIDENCE)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.sourceClaims)).toBe(true);
    expect(Object.isFrozen(first?.informationSignals)).toBe(true);
    expect(Object.isFrozen(first?.arenaTranslation)).toBe(true);
    expect(Object.isFrozen(first?.notToCopy)).toBe(true);
  });
});
