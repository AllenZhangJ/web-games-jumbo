import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_LONG_PROGRESS_READABLE_LAYOUT_CANDIDATE_V1,
  ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  createArenaV2InformationScreenLayoutV1,
  createArenaV2InformationScreenRenderPlanV1,
  createArenaV2UiDomSurfaceModelV1,
  projectArenaV2InformationScreenViewModelV1,
  resolveArenaV2InformationLongProgressReadableLayoutCandidateV1,
  resolveArenaV2InformationScreenRenderModelV1,
} from '../src/index.js';

const MOBILE_VIEWPORT = Object.freeze({
  width: 390,
  height: 844,
  safeAreaInsets: Object.freeze({ top: 47, right: 0, bottom: 34, left: 0 }),
});
const DESKTOP_VIEWPORT = Object.freeze({
  width: 1440,
  height: 900,
  safeAreaInsets: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
});

function render(
  screenId: 'home' | 'map-detail' | 'match-prep' | 'result-reward' | 'weapon-detail',
  revision: number,
  fieldValues: readonly Readonly<{
    fieldId: string;
    labelMessageId: string;
    valueText: string;
    accessibilityText: string;
    fixedWidthNumeric: boolean;
  }>[],
  viewport: typeof MOBILE_VIEWPORT | typeof DESKTOP_VIEWPORT,
) {
  const viewModel = projectArenaV2InformationScreenViewModelV1(
    ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
    {
      revision,
      screenId,
      state: 'ready',
      fieldValues,
      primaryActionEnabled: true,
      primaryActionDisabledReasonMessageId: null,
    },
  );
  const model = resolveArenaV2InformationScreenRenderModelV1(
    viewModel,
    ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  );
  const layout = createArenaV2InformationScreenLayoutV1(model, viewport);
  return Object.freeze({
    model,
    layout,
    plan: createArenaV2InformationScreenRenderPlanV1(model, layout),
  });
}

function matchPrepFields(weaponMapPlan: string, accessibilityText: string) {
  return Object.freeze([
    Object.freeze({ fieldId: 'mode-goal', labelMessageId: 'arena.v2.field.mode-goal', valueText: '把对手击落到场外，成为最后站立者', accessibilityText: '把对手击落到场外，成为最后站立者', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'participant-count', labelMessageId: 'arena.v2.field.participant-count', valueText: '2名参与者（1名玩家 + 1名对手）', accessibilityText: '两名参与者，一名玩家和一名对手', fixedWidthNumeric: true }),
    Object.freeze({ fieldId: 'map-rule', labelMessageId: 'arena.v2.field.map-rule', valueText: '在所选路线的多段平台上利用武器和边界完成击落', accessibilityText: '在所选路线的多段平台上利用武器和边界完成击落', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'character-entry', labelMessageId: 'arena.v2.field.character-entry', valueText: '当前角色：先锋', accessibilityText: '当前角色，先锋', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'weapon-entry', labelMessageId: 'arena.v2.field.weapon-entry', valueText: '本局武器：引力锁链（已收藏 · 熟练 · 主研究119/120）', accessibilityText: '本局武器，引力锁链，已收藏，当前主研究熟练，主研究一百一十九，共一百二十', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'map-entry', labelMessageId: 'arena.v2.field.map-entry', valueText: '本局地图：空港断层（已收藏，路线理解 7/12）', accessibilityText: '本局地图，空港断层，已收藏，路线理解七段，共十二段', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'weapon-map-plan', labelMessageId: 'arena.v2.field.weapon-map-plan', valueText: weaponMapPlan, accessibilityText, fixedWidthNumeric: false }),
  ]);
}

function weaponDetailFields(
  mapConsequences: string,
  accessibilityText: string,
  weaponRecord = '--',
  weaponRecordAccessibilityText = '武器记录，暂无',
) {
  return Object.freeze([
    Object.freeze({ fieldId: 'range-coverage', labelMessageId: 'arena.v2.field.range-coverage', valueText: '中距离 · 正面覆盖', accessibilityText: '中距离，正面覆盖', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'timing-risk', labelMessageId: 'arena.v2.field.timing-risk', valueText: '前摇0.30秒 · 失手风险', accessibilityText: '前摇零点三秒，失手风险', fixedWidthNumeric: true }),
    Object.freeze({ fieldId: 'ground-aerial', labelMessageId: 'arena.v2.field.ground-aerial', valueText: '推离｜按一下｜注意落点', accessibilityText: '核心打法，推离，按一下，注意落点', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'counter-inputs', labelMessageId: 'arena.v2.field.counter-inputs', valueText: '方向、跳跃', accessibilityText: '反制输入，方向与跳跃', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'map-consequences', labelMessageId: 'arena.v2.field.map-consequences', valueText: mapConsequences, accessibilityText, fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'weapon-record', labelMessageId: 'arena.v2.field.weapon-record', valueText: weaponRecord, accessibilityText: weaponRecordAccessibilityText, fixedWidthNumeric: true }),
  ]);
}

function mapDetailFields(
  fullRoute: string,
  accessibilityText: string,
  segmentCount: 8 | 12,
  weaponConsequences = '武器会影响落点选择',
  weaponConsequencesAccessibilityText = '武器会影响落点选择',
  modeRecords = '--',
  modeRecordsAccessibilityText = '模式记录，暂无',
) {
  return Object.freeze([
    Object.freeze({ fieldId: 'route-goal', labelMessageId: 'arena.v2.field.route-goal', valueText: `${segmentCount}段路线 · 到达终点`, accessibilityText: `${segmentCount}段路线，到达终点`, fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'hazard-summary', labelMessageId: 'arena.v2.field.hazard-summary', valueText: '起步 → 变化 → 高潮 → 收官', accessibilityText: '路线骨架，起步、变化、高潮、收官', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'best-record', labelMessageId: 'arena.v2.field.best-record', valueText: '--', accessibilityText: '最佳记录，暂无', fixedWidthNumeric: true }),
    Object.freeze({ fieldId: 'full-route', labelMessageId: 'arena.v2.field.full-route', valueText: fullRoute, accessibilityText, fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'weapon-consequences', labelMessageId: 'arena.v2.field.weapon-consequences', valueText: weaponConsequences, accessibilityText: weaponConsequencesAccessibilityText, fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'mode-records', labelMessageId: 'arena.v2.field.mode-records', valueText: modeRecords, accessibilityText: modeRecordsAccessibilityText, fixedWidthNumeric: true }),
  ]);
}

function homeFields(records: string, accessibilityText: string) {
  return Object.freeze([
    Object.freeze({ fieldId: 'next-goal', labelMessageId: 'arena.v2.field.next-goal', valueText: '继续唯一目标', accessibilityText: '下一目标，继续唯一目标', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'last-mode', labelMessageId: 'arena.v2.field.last-mode', valueText: '竞速', accessibilityText: '上次模式，竞速', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'quick-start', labelMessageId: 'arena.v2.field.quick-start', valueText: '2 步', accessibilityText: '两步内开始', fixedWidthNumeric: true }),
    Object.freeze({ fieldId: 'recent-records', labelMessageId: 'arena.v2.field.recent-records', valueText: records, accessibilityText, fixedWidthNumeric: true }),
  ]);
}

function resultFields(
  progress: string,
  accessibilityText: string,
  collectionChange = '未新增收藏',
  collectionAccessibilityText = '收藏变化，未新增收藏',
  fullMatchRecord = '已记录权威事实',
  fullMatchAccessibilityText = '完整对局记录，已记录权威事实',
  rewardBreakdown = '规则经验 +22',
  rewardAccessibilityText = '规则经验二十二',
) {
  return Object.freeze([
    Object.freeze({ fieldId: 'match-result', labelMessageId: 'arena.v2.field.match-result', valueText: '生存胜利 · 08:20', accessibilityText: '生存胜利，八分二十秒', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'earned-progress', labelMessageId: 'arena.v2.field.earned-progress', valueText: progress, accessibilityText, fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'next-goal', labelMessageId: 'arena.v2.field.next-goal', valueText: '继续唯一目标', accessibilityText: '下一目标，继续唯一目标', fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'reward-breakdown', labelMessageId: 'arena.v2.field.reward-breakdown', valueText: rewardBreakdown, accessibilityText: rewardAccessibilityText, fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'full-match-record', labelMessageId: 'arena.v2.field.full-match-record', valueText: fullMatchRecord, accessibilityText: fullMatchAccessibilityText, fixedWidthNumeric: false }),
    Object.freeze({ fieldId: 'collection-change', labelMessageId: 'arena.v2.field.collection-change', valueText: collectionChange, accessibilityText: collectionAccessibilityText, fixedWidthNumeric: false }),
  ]);
}

describe('Arena V2 long progress readable layout candidate V1', () => {
  it('groups the existing home field without adding primitives or splitting its semantics', () => {
    const compact = '累计结算128次；经验4096；1v1 00:42｜竞速 01:14｜生存 18:30；模式熟练15/15·武器20/20·主研究2400/2400·情境100/100·情境研究30000/30000·地图2/2·路线20/20·路线研究1200/1200·挑战16/16·挑战进度256/256';
    const accessibility = '记录总览。累计结算一百二十八次，经验四千零九十六；三模式个人最佳；模式熟练、武器主研究、情境研究、地图路线研究和挑战进度均为上游只读事实。';
    const long = render('home', 21, homeFields(compact, accessibility), MOBILE_VIEWPORT);
    const short = render('home', 22, homeFields('3 局', '最近三局'), MOBILE_VIEWPORT);
    const value = long.plan.primitives.find(({ id }) => id === 'deferred:recent-records:value');
    if (value?.kind !== 'text') throw new Error('测试夹具缺少首页记录总览文字。');
    expect(value).toMatchObject({
      kind: 'text',
      text: [
        '累计结算128次 · 经验4096',
        '1v1 00:42｜竞速 01:14｜生存 18:30',
        '模式熟练15/15',
        '武器20/20 · 主研究2400/2400 · 情境100/100 · 情境研究30000/30000',
        '地图2/2 · 路线20/20 · 路线研究1200/1200',
        '挑战16/16 · 挑战进度256/256',
      ].join('\n'),
      accessibilityText: accessibility,
      fixedWidthNumeric: true,
    });
    expect(long.plan.primitives.map(({ id }) => id))
      .toEqual(short.plan.primitives.map(({ id }) => id));
    expect(long.layout.deferredItemRects[0]!.rect.height).toBeGreaterThan(88);
    expect(long.layout.verticalScrollRequired).toBe(true);
    const dom = createArenaV2UiDomSurfaceModelV1(long.plan);
    expect(dom.nodes.find(({ id }) => id === 'deferred:recent-records:value')).toMatchObject({
      text: value.text,
      ariaLabel: accessibility,
    });
  });

  it('expands earned-progress for every receipt while preserving one field and one action', () => {
    const progress = '第1把武器，本局+1，当前120/120，已收藏；常规1v1最快胜利00:42；空港断层本局路线+2，累计25/60，理解3/12段；模式熟练1v1 5/15；情境研究地面命中42/300；挑战进度7/16；按建议组合开局';
    const accessibility = '结算进展。第一把武器本局增加一，当前一百二十除以一百二十并已收藏；常规一对一最快胜利四十二秒；空港断层本局路线增加二，累计二十五除以六十，理解三除以十二段；模式熟练、情境研究、挑战进度和开局组合回执均已记录。';
    for (const [revision, viewport] of [[31, MOBILE_VIEWPORT], [32, DESKTOP_VIEWPORT]] as const) {
      const result = render('result-reward', revision, resultFields(progress, accessibility), viewport);
      const targetRect = result.layout.firstViewItemRects.find(({ fieldId }) => (
        fieldId === 'earned-progress'
      ))!.rect;
      const value = result.plan.primitives.find(({ id }) => id === 'first:earned-progress:value');
      if (value?.kind !== 'text') throw new Error('测试夹具缺少结算进展文字。');
      expect(targetRect.height).toBeGreaterThan(96);
      expect(value).toMatchObject({
        kind: 'text',
        text: progress.split('；').join('\n'),
        accessibilityText: accessibility,
      });
      expect(value.maximumLines).toBeGreaterThanOrEqual(progress.split('；').length);
      expect(result.plan.primitives.filter(({ kind }) => kind === 'action')).toHaveLength(1);
      expect(result.plan.primitives.some((primitive) => (
        primitive.kind === 'text' && primitive.text.includes('另有')
      ))).toBe(false);
    }
    const mobile = render('result-reward', 33, resultFields(progress, accessibility), MOBILE_VIEWPORT);
    expect(mobile.layout.verticalScrollRequired).toBe(true);
    expect(mobile.layout.contentHeight).toBeGreaterThan(mobile.layout.contentViewport.height);
    expect(mobile.layout.primaryActionRect.height).toBeGreaterThanOrEqual(48);
  });

  it('expands every existing collection-change receipt without adding a field or primitive', () => {
    const collectionChange = '冲锋盾（第1把武器）主研究达到120/120，进入已收藏阶段；阶段只表示熟悉度，不提升战斗数值；空港断层路线研究达到25%；冲锋盾（第1把武器）已加入收藏（武器1/20）；空港断层已加入收藏（地图1/2）';
    const accessibility = '阶段与收藏。冲锋盾主研究达到一百二十并完成收藏；空港断层路线研究达到百分之二十五并完成地图收藏。阶段不提升战斗数值。';
    for (const [revision, viewport, baseHeight] of [
      [41, MOBILE_VIEWPORT, 58],
      [42, DESKTOP_VIEWPORT, 68],
    ] as const) {
      const result = render(
        'result-reward',
        revision,
        resultFields('本局主研究+1', '本局主研究增加一', collectionChange, accessibility),
        viewport,
      );
      const compact = render(
        'result-reward',
        revision + 10,
        resultFields('本局主研究+1', '本局主研究增加一'),
        viewport,
      );
      const targetRect = result.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'collection-change'
      ))!.rect;
      const value = result.plan.primitives.find(({ id }) => (
        id === 'deferred:collection-change:value'
      ));
      if (value?.kind !== 'text') throw new Error('测试夹具缺少结算阶段与收藏文字。');
      expect(targetRect.height).toBeGreaterThan(baseHeight);
      expect(value).toMatchObject({
        kind: 'text',
        text: collectionChange.split('；').join('\n'),
        accessibilityText: accessibility,
      });
      expect(value.maximumLines).toBeGreaterThanOrEqual(collectionChange.split('；').length);
      expect(result.plan.primitives.map(({ id }) => id))
        .toEqual(compact.plan.primitives.map(({ id }) => id));
      expect(createArenaV2UiDomSurfaceModelV1(result.plan).nodes.find(({ id }) => (
        id === 'deferred:collection-change:value'
      ))).toMatchObject({ text: value.text, ariaLabel: accessibility });
      expect(result.plan.primitives.filter(({ kind }) => kind === 'action')).toHaveLength(1);
    }
    expect(ARENA_V2_INFORMATION_LONG_PROGRESS_READABLE_LAYOUT_CANDIDATE_V1.targetFieldIds)
      .toContain('collection-change');
  });

  it('keeps the complete Product Result weapon record readable without choosing review facts', () => {
    const weaponNames = Array.from({ length: 20 }, (_, index) => `第${index + 1}把武器`).join('、');
    const fullMatchRecord = `本局地图：KZ十二段竞技路线；本局使用：${weaponNames}；主复盘重锤：推离·按一下；下局优先找边缘（第2段·定向断层）、开阔平台（第1段·起步平台）`;
    const accessibility = '完整对局记录。本局地图为KZ十二段竞技路线。本局使用了二十把收藏武器。主复盘和下一局练习点均来自Product Result只读投影。';
    for (const [revision, viewport, baseHeight] of [
      [61, MOBILE_VIEWPORT, 58],
      [62, DESKTOP_VIEWPORT, 68],
    ] as const) {
      const result = render(
        'result-reward',
        revision,
        resultFields(
          '本局主研究+1',
          '本局主研究增加一',
          '未新增收藏',
          '收藏变化，未新增收藏',
          fullMatchRecord,
          accessibility,
        ),
        viewport,
      );
      const compact = render(
        'result-reward',
        revision + 10,
        resultFields('本局主研究+1', '本局主研究增加一'),
        viewport,
      );
      const targetRect = result.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'full-match-record'
      ))!.rect;
      const value = result.plan.primitives.find(({ id }) => (
        id === 'deferred:full-match-record:value'
      ));
      if (value?.kind !== 'text') throw new Error('测试夹具缺少完整对局记录文字。');
      expect(targetRect.height).toBeGreaterThan(baseHeight);
      expect(value).toMatchObject({
        kind: 'text',
        text: fullMatchRecord.split('；').join('\n'),
        accessibilityText: accessibility,
      });
      expect(value.maximumLines).toBeGreaterThanOrEqual(fullMatchRecord.split('；').length);
      expect(result.plan.primitives.map(({ id }) => id))
        .toEqual(compact.plan.primitives.map(({ id }) => id));
      expect(result.plan.primitives.some((primitive) => (
        primitive.kind === 'text' && primitive.text.includes('另有')
      ))).toBe(false);
      expect(createArenaV2UiDomSurfaceModelV1(result.plan).nodes.find(({ id }) => (
        id === 'deferred:full-match-record:value'
      ))).toMatchObject({ text: value.text, ariaLabel: accessibility });
    }
    expect(ARENA_V2_INFORMATION_LONG_PROGRESS_READABLE_LAYOUT_CANDIDATE_V1.targetFieldIds)
      .toContain('full-match-record');
  });

  it('keeps the complete authoritative reward explanation readable without recalculating it', () => {
    const rewardBreakdown = '完成 +10，坚持到压力阶段5 +12；规则经验 +22，达到档案上限后实际 +8；已结算，未重复累计';
    const accessibility = '奖励明细。完成获得十点，坚持到压力阶段五获得十二点。规则请求经验二十二，档案上限后实际入账八点。本次重复请求没有再次累计。';
    for (const [revision, viewport, baseHeight] of [
      [81, MOBILE_VIEWPORT, 58],
      [82, DESKTOP_VIEWPORT, 68],
    ] as const) {
      const result = render(
        'result-reward',
        revision,
        resultFields(
          '本局主研究+1',
          '本局主研究增加一',
          '未新增收藏',
          '收藏变化，未新增收藏',
          '已记录权威事实',
          '完整对局记录，已记录权威事实',
          rewardBreakdown,
          accessibility,
        ),
        viewport,
      );
      const compact = render(
        'result-reward',
        revision + 10,
        resultFields('本局主研究+1', '本局主研究增加一'),
        viewport,
      );
      expect(compact.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'reward-breakdown'
      ))!.rect.height).toBe(baseHeight);
      const targetRect = result.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'reward-breakdown'
      ))!.rect;
      const value = result.plan.primitives.find(({ id }) => (
        id === 'deferred:reward-breakdown:value'
      ));
      if (value?.kind !== 'text') throw new Error('测试夹具缺少经验明细文字。');
      expect(targetRect.height).toBeGreaterThan(baseHeight);
      expect(value).toMatchObject({
        kind: 'text',
        text: rewardBreakdown.split('；').join('\n'),
        accessibilityText: accessibility,
      });
      expect(value.maximumLines).toBeGreaterThanOrEqual(rewardBreakdown.split('；').length);
      expect(result.plan.primitives.map(({ id }) => id))
        .toEqual(compact.plan.primitives.map(({ id }) => id));
      expect(createArenaV2UiDomSurfaceModelV1(result.plan).nodes.find(({ id }) => (
        id === 'deferred:reward-breakdown:value'
      ))).toMatchObject({ text: value.text, ariaLabel: accessibility });
      expect(result.plan.primitives.filter(({ kind }) => kind === 'action')).toHaveLength(1);
    }
    expect(ARENA_V2_INFORMATION_LONG_PROGRESS_READABLE_LAYOUT_CANDIDATE_V1.targetFieldIds)
      .toEqual([
        'recent-records',
        'earned-progress',
        'collection-change',
        'full-match-record',
        'reward-breakdown',
        'weapon-map-plan',
        'full-route',
        'weapon-consequences',
        'mode-records',
        'map-consequences',
        'weapon-record',
      ]);
  });

  it('keeps the complete match preparation learning plan without parsing its facts', () => {
    const weaponMapPlan = '本局练法：引力锁链核心牵引·按一下；在空港断层优先找定向断层（第2段·定向断层）；长期目标：继续地图路线研究；路线骨架：起步平台→断层→落点→终局钢丝；武器目标：空中42/60，用空中动作形成有效反馈；路线目标：第2段·定向断层1/3，完成一次可归因路线推进';
    const accessibility = '本局练法。引力锁链在空港断层优先找定向断层；长期目标、四段路线骨架、空中武器情境目标和第二段路线目标均来自同一只读准备投影。';
    const expected = weaponMapPlan.split('；').map((clause, index, clauses) => (
      `${clause}${index < clauses.length - 1 ? '；' : ''}`
    )).join('\n');
    const results = [
      render('match-prep', 351, matchPrepFields(weaponMapPlan, accessibility), MOBILE_VIEWPORT),
      render('match-prep', 352, matchPrepFields(weaponMapPlan, accessibility), DESKTOP_VIEWPORT),
    ] as const;
    const compact = [
      render('match-prep', 361, matchPrepFields('本局练法：重锤核心推离', '本局练法，重锤核心推离'), MOBILE_VIEWPORT),
      render('match-prep', 362, matchPrepFields('本局练法：重锤核心推离', '本局练法，重锤核心推离'), DESKTOP_VIEWPORT),
    ] as const;
    for (const [index, result] of results.entries()) {
      const targetRect = result.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'weapon-map-plan'
      ))!.rect;
      const compactRect = compact[index]!.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'weapon-map-plan'
      ))!.rect;
      const value = result.plan.primitives.find(({ id }) => (
        id === 'deferred:weapon-map-plan:value'
      ));
      if (value?.kind !== 'text') throw new Error('测试夹具缺少赛前本局练法文字。');
      expect(targetRect.height).toBeGreaterThan(compactRect.height);
      expect(value).toMatchObject({
        kind: 'text',
        text: expected,
        accessibilityText: accessibility,
      });
      expect(value.maximumLines).toBeGreaterThanOrEqual(6);
      expect(result.plan.primitives.map(({ id }) => id))
        .toEqual(compact[index]!.plan.primitives.map(({ id }) => id));
      expect(createArenaV2UiDomSurfaceModelV1(result.plan).nodes.find(({ id }) => (
        id === 'deferred:weapon-map-plan:value'
      ))).toMatchObject({ text: expected, ariaLabel: accessibility });
      expect(result.plan.primitives.filter(({ kind }) => kind === 'action')).toHaveLength(1);
    }
  });

  it('keeps the complete 12/8-segment map route readable without deriving route facts', () => {
    const routes = Object.freeze([
      Object.freeze([
        '1.起步平台［起步］',
        '2.第一断层［断层］',
        '3.回转落点［落点］',
        '4.双路迷宫［变化］',
        '5.窄桥［精确］',
        '6.长线钢丝［高潮］',
        '7.移动平台［移动］',
        '8.侧向断层［侧向］',
        '9.缓冲台［恢复］',
        '10.终段入口［收束］',
        '11.终段落点［确认］',
        '12.终局钢丝［收官］。危险统计：断层3、移动平台2',
      ]),
      Object.freeze([
        '1.折返起点［起步］',
        '2.第一阶梯［抬升］',
        '3.折返落点［变化］',
        '4.窄台［精确］',
        '5.第二阶梯［高潮］',
        '6.回转平台［恢复］',
        '7.终点入口［收束］',
        '8.折返终点［收官］。危险统计：折返2、阶梯3',
      ]),
    ] as const);
    for (const [routeIndex, route] of routes.entries()) {
      const fullRoute = route.join(' → ');
      const accessibility = `完整路线。${route.length}段路线及危险统计均来自地图内容只读投影。`;
      for (const [viewportIndex, viewport, baseHeight] of [
        [0, MOBILE_VIEWPORT, 58],
        [1, DESKTOP_VIEWPORT, 68],
      ] as const) {
        const revision = 91 + routeIndex * 10 + viewportIndex;
        const result = render(
          'map-detail',
          revision,
          mapDetailFields(fullRoute, accessibility, route.length),
          viewport,
        );
        const compact = render(
          'map-detail',
          revision + 20,
          mapDetailFields('路线资料准备中', '完整路线资料准备中', route.length),
          viewport,
        );
        const targetRect = result.layout.deferredItemRects.find(({ fieldId }) => (
          fieldId === 'full-route'
        ))!.rect;
        const value = result.plan.primitives.find(({ id }) => (
          id === 'deferred:full-route:value'
        ));
        if (value?.kind !== 'text') throw new Error('测试夹具缺少地图完整路线文字。');
        expect(compact.layout.deferredItemRects.find(({ fieldId }) => (
          fieldId === 'full-route'
        ))!.rect.height).toBe(baseHeight);
        expect(targetRect.height).toBeGreaterThan(baseHeight);
        expect(value).toMatchObject({
          kind: 'text',
          text: fullRoute.split(' → ').join('\n'),
          accessibilityText: accessibility,
        });
        expect(value.maximumLines).toBeGreaterThanOrEqual(route.length);
        expect(result.plan.primitives.map(({ id }) => id))
          .toEqual(compact.plan.primitives.map(({ id }) => id));
        expect(createArenaV2UiDomSurfaceModelV1(result.plan).nodes.find(({ id }) => (
          id === 'deferred:full-route:value'
        ))).toMatchObject({ text: value.text, ariaLabel: accessibility });
        expect(result.plan.primitives.filter(({ kind }) => kind === 'action')).toHaveLength(1);
      }
    }
  });

  it('keeps all existing map weapon consequence sentences without deriving combat facts', () => {
    const consequences = '地标顺序：起步台→落点岛→终局钢丝。每段都有一个武器供给点；断层、窄桥和移动平台会放大推离、拉取、压制和侧袭对落点的影响，快速分支更暴露，恢复分支更稳。当前竞速武器重锤优先练落点前减速并保留跳跃。';
    const accessibility = '武器影响。地标顺序、供给点、落点影响和当前练习建议均来自地图详情只读投影。';
    for (const [revision, viewport, baseHeight] of [
      [121, MOBILE_VIEWPORT, 58],
      [122, DESKTOP_VIEWPORT, 68],
    ] as const) {
      const result = render(
        'map-detail',
        revision,
        mapDetailFields('路线资料准备中', '完整路线资料准备中', 12, consequences, accessibility),
        viewport,
      );
      const compact = render(
        'map-detail',
        revision + 10,
        mapDetailFields('路线资料准备中', '完整路线资料准备中', 12),
        viewport,
      );
      const targetRect = result.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'weapon-consequences'
      ))!.rect;
      const value = result.plan.primitives.find(({ id }) => (
        id === 'deferred:weapon-consequences:value'
      ));
      if (value?.kind !== 'text') throw new Error('测试夹具缺少地图武器影响文字。');
      expect(compact.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'weapon-consequences'
      ))!.rect.height).toBe(baseHeight);
      expect(targetRect.height).toBeGreaterThan(baseHeight);
      expect(value).toMatchObject({
        kind: 'text',
        text: consequences.split('。').filter(Boolean).map((entry) => `${entry}。`).join('\n'),
        accessibilityText: accessibility,
      });
      expect(value.maximumLines).toBeGreaterThanOrEqual(3);
      expect(result.plan.primitives.map(({ id }) => id))
        .toEqual(compact.plan.primitives.map(({ id }) => id));
      expect(createArenaV2UiDomSurfaceModelV1(result.plan).nodes.find(({ id }) => (
        id === 'deferred:weapon-consequences:value'
      ))).toMatchObject({ text: value.text, ariaLabel: accessibility });
      expect(result.plan.primitives.filter(({ kind }) => kind === 'action')).toHaveLength(1);
    }
  });

  it('keeps the complete map research and mastery journey in upstream clause order', () => {
    const modeRecords = '路线研究35/60·熟悉；下一里程碑50%，还需5次有效路线练习；路线理解7/12；模式熟练18/45；全部地图路线研究61/120；全部路线理解12/20；下一路段定向断层（第2段）1/3：完成一次可归因路线推进';
    const accessibility = '地图模式记录。路线研究、下一里程碑、单图路线理解、三模式熟练、全地图路线研究、全部路线理解和下一路段均来自同一Learning只读投影。';
    const expected = modeRecords.split('；').map((clause, index, clauses) => (
      `${clause}${index < clauses.length - 1 ? '；' : ''}`
    )).join('\n');
    for (const [revision, viewport, baseHeight] of [
      [131, MOBILE_VIEWPORT, 58],
      [132, DESKTOP_VIEWPORT, 68],
    ] as const) {
      const result = render(
        'map-detail',
        revision,
        mapDetailFields(
          '路线资料准备中',
          '完整路线资料准备中',
          12,
          '武器会影响落点选择',
          '武器会影响落点选择',
          modeRecords,
          accessibility,
        ),
        viewport,
      );
      const compact = render(
        'map-detail',
        revision + 10,
        mapDetailFields('路线资料准备中', '完整路线资料准备中', 12),
        viewport,
      );
      const targetRect = result.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'mode-records'
      ))!.rect;
      const value = result.plan.primitives.find(({ id }) => (
        id === 'deferred:mode-records:value'
      ));
      if (value?.kind !== 'text') throw new Error('测试夹具缺少地图模式记录文字。');
      expect(compact.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'mode-records'
      ))!.rect.height).toBe(baseHeight);
      expect(targetRect.height).toBeGreaterThan(baseHeight);
      expect(value).toMatchObject({
        kind: 'text',
        text: expected,
        accessibilityText: accessibility,
      });
      expect(value.maximumLines).toBeGreaterThanOrEqual(7);
      expect(result.plan.primitives.map(({ id }) => id))
        .toEqual(compact.plan.primitives.map(({ id }) => id));
      expect(createArenaV2UiDomSurfaceModelV1(result.plan).nodes.find(({ id }) => (
        id === 'deferred:mode-records:value'
      ))).toMatchObject({ text: value.text, ariaLabel: accessibility });
      expect(result.plan.primitives.filter(({ kind }) => kind === 'action')).toHaveLength(1);
    }
  });

  it('keeps all existing weapon map consequence clauses without deriving map facts', () => {
    const consequences = '学习问题：先确认落点再出手 1v1在开阔平台争取正面推离；竞速在断层前保留跳跃；生存在窄桥避免被包围；当前竞速地图KZ 十二段竞技路线优先练平台入口（第1段·起步平台）、断层（第2段·定向断层）';
    const accessibility = '地图后果。学习问题、三模式地图影响和当前竞技地图练习建议均来自武器详情只读投影。';
    const expected = consequences.split('；').map((clause, index, clauses) => (
      `${clause}${index < clauses.length - 1 ? '；' : ''}`
    )).join('\n');
    for (const [revision, viewport, baseHeight] of [
      [141, MOBILE_VIEWPORT, 58],
      [142, DESKTOP_VIEWPORT, 68],
    ] as const) {
      const result = render(
        'weapon-detail',
        revision,
        weaponDetailFields(consequences, accessibility),
        viewport,
      );
      const compact = render(
        'weapon-detail',
        revision + 10,
        weaponDetailFields('开阔平台更利于观察落点', '开阔平台更利于观察落点'),
        viewport,
      );
      const targetRect = result.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'map-consequences'
      ))!.rect;
      const value = result.plan.primitives.find(({ id }) => (
        id === 'deferred:map-consequences:value'
      ));
      if (value?.kind !== 'text') throw new Error('测试夹具缺少武器地图后果文字。');
      expect(compact.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'map-consequences'
      ))!.rect.height).toBe(baseHeight);
      expect(targetRect.height).toBeGreaterThan(baseHeight);
      expect(value).toMatchObject({
        kind: 'text',
        text: expected,
        accessibilityText: accessibility,
      });
      expect(value.maximumLines).toBeGreaterThanOrEqual(4);
      expect(result.plan.primitives.map(({ id }) => id))
        .toEqual(compact.plan.primitives.map(({ id }) => id));
      expect(createArenaV2UiDomSurfaceModelV1(result.plan).nodes.find(({ id }) => (
        id === 'deferred:map-consequences:value'
      ))).toMatchObject({ text: value.text, ariaLabel: accessibility });
      expect(result.plan.primitives.filter(({ kind }) => kind === 'action')).toHaveLength(1);
    }
  });

  it('keeps the complete weapon research journey in upstream clause order without parsing progress', () => {
    const weaponRecord = '已收藏；当前主研究熟练，下一阶段精通（90/120），至少还需18次有效主研究；下一局优先练空中情境42/60：用空中动作形成有效反馈；完整理解3/5种情境；地面60/60已理解、空中42/60、边缘3/3已理解、1v1反制1/3、生存3/3已理解；全武器主研究1680/2400；全部武器情境研究84/100';
    const accessibility = '武器记录。已收藏，当前主研究熟练；下一阶段精通，下一情境为空中；五种情境证据、全武器主研究与全部武器情境研究均来自同一上游只读投影。';
    const expected = weaponRecord.split('；').map((clause, index, clauses) => (
      `${clause}${index < clauses.length - 1 ? '；' : ''}`
    )).join('\n');
    for (const [revision, viewport, baseHeight] of [
      [161, MOBILE_VIEWPORT, 58],
      [162, DESKTOP_VIEWPORT, 68],
    ] as const) {
      const result = render(
        'weapon-detail',
        revision,
        weaponDetailFields(
          '开阔平台更利于观察落点',
          '开阔平台更利于观察落点',
          weaponRecord,
          accessibility,
        ),
        viewport,
      );
      const compact = render(
        'weapon-detail',
        revision + 10,
        weaponDetailFields('开阔平台更利于观察落点', '开阔平台更利于观察落点'),
        viewport,
      );
      const targetRect = result.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'weapon-record'
      ))!.rect;
      const value = result.plan.primitives.find(({ id }) => (
        id === 'deferred:weapon-record:value'
      ));
      if (value?.kind !== 'text') throw new Error('测试夹具缺少武器记录文字。');
      expect(compact.layout.deferredItemRects.find(({ fieldId }) => (
        fieldId === 'weapon-record'
      ))!.rect.height).toBe(baseHeight);
      expect(targetRect.height).toBeGreaterThan(baseHeight);
      expect(value).toMatchObject({
        kind: 'text',
        text: expected,
        accessibilityText: accessibility,
      });
      expect(value.maximumLines).toBeGreaterThanOrEqual(7);
      expect(result.plan.primitives.map(({ id }) => id))
        .toEqual(compact.plan.primitives.map(({ id }) => id));
      expect(createArenaV2UiDomSurfaceModelV1(result.plan).nodes.find(({ id }) => (
        id === 'deferred:weapon-record:value'
      ))).toMatchObject({ text: value.text, ariaLabel: accessibility });
      expect(result.plan.primitives.filter(({ kind }) => kind === 'action')).toHaveLength(1);
    }
  });

  it('keeps short progress compact and rejects empty or unbounded receipt lists', () => {
    const short = resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'result-reward',
      fieldId: 'earned-progress',
      valueText: '本局无新增进展',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 96,
      baseMaximumLines: 3,
    });
    expect(short).toMatchObject({ cardHeightCssPixels: 96, maximumLines: 3 });
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'result-reward',
      fieldId: 'earned-progress',
      valueText: '真实回执；；被隐藏回执',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 96,
      baseMaximumLines: 3,
    })).toThrow(/空回执/);
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'result-reward',
      fieldId: 'collection-change',
      valueText: '武器里程碑；；地图收藏',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 58,
      baseMaximumLines: 2,
    })).toThrow(/阶段与收藏.*空回执/);
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'result-reward',
      fieldId: 'full-match-record',
      valueText: '本局地图；；本局使用',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 58,
      baseMaximumLines: 2,
    })).toThrow(/完整对局记录.*空回执/);
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'result-reward',
      fieldId: 'reward-breakdown',
      valueText: '规则奖励；；实际入账',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 58,
      baseMaximumLines: 2,
    })).toThrow(/经验明细.*空回执/);
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'map-detail',
      fieldId: 'full-route',
      valueText: '起步平台 →  → 终局钢丝',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 58,
      baseMaximumLines: 2,
    })).toThrow(/完整路线.*空路段/);
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'map-detail',
      fieldId: 'weapon-consequences',
      valueText: '地标顺序。 。落点影响。',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 58,
      baseMaximumLines: 2,
    })).toThrow(/武器影响.*空句/);
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'weapon-detail',
      fieldId: 'map-consequences',
      valueText: '学习问题；；竞技地图建议',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 58,
      baseMaximumLines: 2,
    })).toThrow(/地图后果.*空子句/);
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'weapon-detail',
      fieldId: 'weapon-record',
      valueText: '已收藏；；全武器主研究1680/2400',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 58,
      baseMaximumLines: 2,
    })).toThrow(/武器记录.*空子句/);
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'map-detail',
      fieldId: 'mode-records',
      valueText: '路线研究35/60；；全部路线理解12/20',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 58,
      baseMaximumLines: 2,
    })).toThrow(/模式记录.*空子句/);
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'match-prep',
      fieldId: 'weapon-map-plan',
      valueText: '本局练法：重锤；；路线目标：终点',
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 58,
      baseMaximumLines: 2,
    })).toThrow(/本局练法.*空子句/);
    expect(() => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: 'result-reward',
      fieldId: 'earned-progress',
      valueText: '回'.repeat(4097),
      textWidthCssPixels: 334,
      baseCardHeightCssPixels: 96,
      baseMaximumLines: 3,
    })).toThrow(/有界视觉合同/);
  });
});
