import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  createArenaV2InformationScreenLayoutV1,
  createArenaV2InformationScreenRenderPlanV1,
  projectArenaV2InformationScreenViewModelV1,
  resolveArenaV2InformationScreenRenderModelV1,
} from '../src/index.js';

describe('Arena V2 shared UI render plan V1', () => {
  it('keeps content and action in one host-agnostic information plan', () => {
    const viewModel = projectArenaV2InformationScreenViewModelV1(
      ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
      {
        revision: 9,
        screenId: 'weapon-detail',
        state: 'ready',
        fieldValues: [
          { fieldId: 'range-coverage', labelMessageId: 'arena.v2.field.range-coverage', valueText: '长距离 · 窄覆盖', accessibilityText: '长距离，窄覆盖', fixedWidthNumeric: false },
          { fieldId: 'timing-risk', labelMessageId: 'arena.v2.field.timing-risk', valueText: '慢前摇 · 长恢复', accessibilityText: '慢前摇，长恢复', fixedWidthNumeric: false },
          { fieldId: 'ground-aerial', labelMessageId: 'arena.v2.field.ground-aerial', valueText: '地面压线 · 空中拦截', accessibilityText: '地面压线，空中拦截', fixedWidthNumeric: false },
          { fieldId: 'counter-inputs', labelMessageId: 'arena.v2.field.counter-inputs', valueText: '横移或跳跃', accessibilityText: '反制方式，横移或跳跃', fixedWidthNumeric: false },
          { fieldId: 'map-consequences', labelMessageId: 'arena.v2.field.map-consequences', valueText: '窄路入口更强', accessibilityText: '窄路入口更强', fixedWidthNumeric: false },
          { fieldId: 'weapon-record', labelMessageId: 'arena.v2.field.weapon-record', valueText: '命中 18', accessibilityText: '命中十八次', fixedWidthNumeric: true },
        ],
        primaryActionEnabled: true,
        primaryActionDisabledReasonMessageId: null,
      },
    );
    const model = resolveArenaV2InformationScreenRenderModelV1(
      viewModel,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
    );
    const layout = createArenaV2InformationScreenLayoutV1(model, {
      width: 390,
      height: 844,
      safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
    });
    const plan = createArenaV2InformationScreenRenderPlanV1(model, layout);
    expect(plan).toMatchObject({
      surfaceKind: 'information',
      identity: 'weapon-detail',
      revision: 9,
      status: 'layout-candidate',
      productionReady: false,
      formalAssetIds: [],
    });
    expect(plan.primitives.filter(({ kind, id }) => (
      kind === 'action' && id === 'primary-action'
    ))).toHaveLength(1);
    expect(plan.primitives.some((primitive) => (
      primitive.kind === 'text' && primitive.text === '长距离 · 窄覆盖'
    ))).toBe(true);
  });

  it('keeps short result progress as one compact text primitive with full semantics', () => {
    const progressText = '本局主研究已推进 · 当前累计 · 下一里程碑 · 剩余次数';
    const progressAccessibility = '本局主研究已推进，当前累计、下一里程碑和剩余次数均来自上游事实';
    const viewModel = projectArenaV2InformationScreenViewModelV1(
      ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
      {
        revision: 10,
        screenId: 'result-reward',
        state: 'ready',
        fieldValues: [
          { fieldId: 'match-result', labelMessageId: 'arena.v2.field.match-result', valueText: '生存胜利 · 08:20', accessibilityText: '生存胜利，八分二十秒', fixedWidthNumeric: false },
          { fieldId: 'earned-progress', labelMessageId: 'arena.v2.field.earned-progress', valueText: progressText, accessibilityText: progressAccessibility, fixedWidthNumeric: false },
          { fieldId: 'next-goal', labelMessageId: 'arena.v2.field.next-goal', valueText: '继续上游唯一目标', accessibilityText: '下一目标，继续上游唯一目标', fixedWidthNumeric: false },
          { fieldId: 'reward-breakdown', labelMessageId: 'arena.v2.field.reward-breakdown', valueText: '完成 +10，坚持到压力阶段5 +12；规则经验 +22', accessibilityText: '完成十点经验，坚持到压力阶段五获得十二点经验。规则经验二十二。', fixedWidthNumeric: false },
          { fieldId: 'full-match-record', labelMessageId: 'arena.v2.field.full-match-record', valueText: '已记录权威使用事实', accessibilityText: '完整对局记录，已记录权威使用事实', fixedWidthNumeric: false },
          { fieldId: 'collection-change', labelMessageId: 'arena.v2.field.collection-change', valueText: '未收藏', accessibilityText: '收藏变化，未收藏', fixedWidthNumeric: false },
        ],
        primaryActionEnabled: true,
        primaryActionDisabledReasonMessageId: null,
      },
    );
    const model = resolveArenaV2InformationScreenRenderModelV1(
      viewModel,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
    );
    const layout = createArenaV2InformationScreenLayoutV1(model, {
      width: 390,
      height: 844,
      safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
    });
    const plan = createArenaV2InformationScreenRenderPlanV1(model, layout);
    expect(plan.primitives.find(({ id }) => id === 'first:earned-progress:value')).toMatchObject({
      kind: 'text',
      text: progressText,
      accessibilityText: progressAccessibility,
      maximumLines: 3,
      fixedWidthNumeric: false,
    });
    expect(plan.primitives.filter(({ kind, id }) => (
      kind === 'action' && id === 'primary-action'
    ))).toHaveLength(1);
  });
});
