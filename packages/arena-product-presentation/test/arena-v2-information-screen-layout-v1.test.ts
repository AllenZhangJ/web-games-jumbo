import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  createArenaV2InformationScreenLayoutV1,
  projectArenaV2InformationScreenViewModelV1,
  resolveArenaV2InformationScreenRenderModelV1,
} from '../src/index.js';

function homeModel() {
  const viewModel = projectArenaV2InformationScreenViewModelV1(
    ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
    {
      revision: 1,
      screenId: 'home',
      state: 'ready',
      fieldValues: [
        { fieldId: 'next-goal', labelMessageId: 'arena.v2.field.next-goal', valueText: '完成一局', accessibilityText: '下一目标，完成一局', fixedWidthNumeric: false },
        { fieldId: 'last-mode', labelMessageId: 'arena.v2.field.last-mode', valueText: '竞速', accessibilityText: '上次模式，竞速', fixedWidthNumeric: false },
        { fieldId: 'quick-start', labelMessageId: 'arena.v2.field.quick-start', valueText: '2 步', accessibilityText: '两步内开始', fixedWidthNumeric: true },
        { fieldId: 'recent-records', labelMessageId: 'arena.v2.field.recent-records', valueText: '3 局', accessibilityText: '最近三局', fixedWidthNumeric: true },
      ],
      primaryActionEnabled: true,
      primaryActionDisabledReasonMessageId: null,
    },
  );
  return resolveArenaV2InformationScreenRenderModelV1(
    viewModel,
    ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  );
}

function resultModel() {
  const viewModel = projectArenaV2InformationScreenViewModelV1(
    ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
    {
      revision: 2,
      screenId: 'result-reward',
      state: 'ready',
      fieldValues: [
        { fieldId: 'match-result', labelMessageId: 'arena.v2.field.match-result', valueText: '生存胜利 · 08:20', accessibilityText: '生存胜利，八分二十秒', fixedWidthNumeric: false },
        { fieldId: 'earned-progress', labelMessageId: 'arena.v2.field.earned-progress', valueText: '本局主研究已推进 · 当前累计 · 下一里程碑 · 剩余次数', accessibilityText: '本局主研究已推进，当前累计、下一里程碑和剩余次数均来自上游事实', fixedWidthNumeric: false },
        { fieldId: 'next-goal', labelMessageId: 'arena.v2.field.next-goal', valueText: '继续上游唯一目标', accessibilityText: '下一目标，继续上游唯一目标', fixedWidthNumeric: false },
        { fieldId: 'reward-breakdown', labelMessageId: 'arena.v2.field.reward-breakdown', valueText: '完成 +10，坚持到压力阶段5 +12；规则经验 +22', accessibilityText: '完成十点经验，坚持到压力阶段五获得十二点经验。规则经验二十二。', fixedWidthNumeric: false },
        { fieldId: 'full-match-record', labelMessageId: 'arena.v2.field.full-match-record', valueText: '已记录权威使用事实', accessibilityText: '完整对局记录，已记录权威使用事实', fixedWidthNumeric: false },
        { fieldId: 'collection-change', labelMessageId: 'arena.v2.field.collection-change', valueText: '未收藏', accessibilityText: '收藏变化，未收藏', fixedWidthNumeric: false },
      ],
      primaryActionEnabled: true,
      primaryActionDisabledReasonMessageId: null,
    },
  );
  return resolveArenaV2InformationScreenRenderModelV1(
    viewModel,
    ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  );
}

describe('Arena V2 information screen shared layout V1', () => {
  it('keeps one 48px-plus action and four equal bottom slots in 390x844', () => {
    const model = homeModel();
    const layout = createArenaV2InformationScreenLayoutV1(model, {
      width: 390,
      height: 844,
      safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
    });
    expect(layout).toMatchObject({
      density: 'narrow',
      horizontalOverflowAllowed: false,
      verticalScrollRequired: false,
    });
    expect(layout.primaryActionRect.height).toBeGreaterThanOrEqual(48);
    expect(layout.bottomNavigationRects).toHaveLength(4);
    expect(layout.bottomNavigationRects.every(({ rect }) => rect.width >= 48)).toBe(true);
    expect(layout.firstViewItemRects.map(({ fieldId }) => fieldId)).toEqual([
      'next-goal', 'last-mode', 'quick-start',
    ]);
    expect(layout.deferredItemRects).toEqual([expect.objectContaining({
      fieldId: 'recent-records',
      rect: expect.objectContaining({ height: 88 }),
    })]);
    expect(layout.primaryHitTarget?.intentId).toBe('open-mode-select');
  });

  it('fails closed when a visible four-slot navigation cannot preserve target width', () => {
    expect(() => createArenaV2InformationScreenLayoutV1(homeModel(), {
      width: 180,
      height: 500,
      safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    })).toThrow(/48px/);
  });

  it('reserves three-line result progress without displacing the primary action in 390x844', () => {
    const layout = createArenaV2InformationScreenLayoutV1(resultModel(), {
      width: 390,
      height: 844,
      safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
    });
    expect(layout.firstViewItemRects.map(({ fieldId, rect }) => ({
      fieldId,
      height: rect.height,
    }))).toEqual([
      { fieldId: 'match-result', height: 96 },
      { fieldId: 'earned-progress', height: 96 },
      { fieldId: 'next-goal', height: 96 },
    ]);
    expect(layout.contentHeight).toBeLessThanOrEqual(layout.contentViewport.height);
    expect(layout.primaryActionRect.height).toBeGreaterThanOrEqual(48);
  });
});
