export type ArenaV2UiPageId =
  | 'loading'
  | 'home'
  | 'mode-select'
  | 'character-select'
  | 'match-prep'
  | 'survival-prep'
  | 'weapon-index'
  | 'weapon-detail'
  | 'map-index'
  | 'map-detail'
  | 'result-reward';

export type ArenaV2UiMatchMode = 'versus' | 'race' | 'survival';

export const ARENA_V2_UI_INFORMATION_MINIMUM_TOUCH_TARGET_PX = 48 as const;
export const ARENA_V2_UI_INFORMATION_MOBILE_BREAKPOINT_PX = 760 as const;

export type ArenaV2UiInformationLayer = 'entry' | 'selection' | 'collection' | 'feedback';

export interface ArenaV2UiPageContract {
  readonly id: ArenaV2UiPageId;
  readonly layer: ArenaV2UiInformationLayer;
  readonly supportedModes: readonly ArenaV2UiMatchMode[];
  readonly question: string;
  readonly requiredInformation: readonly string[];
  readonly firstViewInformation: readonly string[];
  readonly deferredInformation: readonly string[];
  readonly primaryAction: string;
  readonly secondaryAction: string | null;
  readonly maximumActionsBeforeNextStep: number;
}

export interface ArenaV2UiFlowResult {
  readonly flowId: 'first-run' | 'weapon-learning' | 'map-learning' | 'survival-rematch';
  readonly pageIds: readonly ArenaV2UiPageId[];
  readonly actionCount: number;
  readonly passed: boolean;
}

export interface ArenaV2UiInteractionAudit {
  readonly pageNavigationCount: number;
  readonly flowNavigationCount: number;
  readonly minimumTouchTargetPx: typeof ARENA_V2_UI_INFORMATION_MINIMUM_TOUCH_TARGET_PX;
  readonly mobileBreakpointPx: typeof ARENA_V2_UI_INFORMATION_MOBILE_BREAKPOINT_PX;
  readonly allPagesHavePrimaryAction: boolean;
  readonly passed: boolean;
}

export interface ArenaV2UiInformationPrototypeResult {
  readonly pageCount: number;
  readonly pages: readonly ArenaV2UiPageContract[];
  readonly flows: readonly ArenaV2UiFlowResult[];
  readonly resultToRematchActions: number;
  readonly resultToChangeTargetActions: number;
  readonly complexSystemsIntroduced: number;
  readonly interactionAudit: ArenaV2UiInteractionAudit;
  readonly passed: boolean;
}

function modes(...values: readonly ArenaV2UiMatchMode[]): readonly ArenaV2UiMatchMode[] {
  return Object.freeze([...values]);
}

const PAGE_CONTRACTS: readonly ArenaV2UiPageContract[] = Object.freeze([
  Object.freeze({
    id: 'loading',
    layer: 'entry',
    supportedModes: modes(),
    question: '游戏是否已经准备好？',
    requiredInformation: Object.freeze(['加载状态', '版本状态']),
    firstViewInformation: Object.freeze(['加载状态']),
    deferredInformation: Object.freeze(['版本状态']),
    primaryAction: '等待加载完成',
    secondaryAction: null,
    maximumActionsBeforeNextStep: 0,
  }),
  Object.freeze({
    id: 'home',
    layer: 'entry',
    supportedModes: modes(),
    question: '我现在能玩什么？',
    requiredInformation: Object.freeze(['当前默认模式', '开始入口', '武器索引摘要']),
    firstViewInformation: Object.freeze(['当前默认模式', '开始入口', '武器索引摘要']),
    deferredInformation: Object.freeze([]),
    primaryAction: '进入模式选择',
    secondaryAction: '查看武器索引',
    maximumActionsBeforeNextStep: 1,
  }),
  Object.freeze({
    id: 'mode-select',
    layer: 'entry',
    supportedModes: modes(),
    question: '这一局想练什么？',
    requiredInformation: Object.freeze(['1v1目标', '竞速目标', '生存目标', '推荐时长']),
    firstViewInformation: Object.freeze(['1v1目标', '竞速目标', '生存目标']),
    deferredInformation: Object.freeze(['推荐时长']),
    primaryAction: '确认模式',
    secondaryAction: '返回首页',
    maximumActionsBeforeNextStep: 1,
  }),
  Object.freeze({
    id: 'character-select',
    layer: 'selection',
    supportedModes: modes('versus', 'race', 'survival'),
    question: '我用哪个基础手感？',
    requiredInformation: Object.freeze(['角色操作差异', '基础移动提示']),
    firstViewInformation: Object.freeze(['角色操作差异', '基础移动提示']),
    deferredInformation: Object.freeze([]),
    primaryAction: '确认角色',
    secondaryAction: '返回模式',
    maximumActionsBeforeNextStep: 1,
  }),
  Object.freeze({
    id: 'match-prep',
    layer: 'selection',
    supportedModes: modes('versus', 'race'),
    question: '这一局用什么规则开始？',
    requiredInformation: Object.freeze(['当前角色', '武器概览', '地图摘要', '模式目标', '参与人数/重生规则']),
    firstViewInformation: Object.freeze(['当前角色', '武器概览', '模式目标']),
    deferredInformation: Object.freeze(['地图摘要', '参与人数/重生规则']),
    primaryAction: '开始当前模式',
    secondaryAction: '查看武器详情',
    maximumActionsBeforeNextStep: 1,
  }),
  Object.freeze({
    id: 'survival-prep',
    layer: 'selection',
    supportedModes: modes('survival'),
    question: '我能坚持多久？',
    requiredInformation: Object.freeze(['开局无武器', '每 20 秒三选一', '第一次复活', '第二次结束']),
    firstViewInformation: Object.freeze(['开局无武器', '每 20 秒三选一', '第一次复活']),
    deferredInformation: Object.freeze(['第二次结束']),
    primaryAction: '开始生存',
    secondaryAction: '查看地图详情',
    maximumActionsBeforeNextStep: 1,
  }),
  Object.freeze({
    id: 'weapon-index',
    layer: 'collection',
    supportedModes: modes(),
    question: '我收集了什么，下一把想练什么？',
    requiredInformation: Object.freeze(['收集进度', '核心动词', '9 项主数值', '地面/空中摘要']),
    firstViewInformation: Object.freeze(['收集进度', '核心动词', '9 项主数值']),
    deferredInformation: Object.freeze(['地面/空中摘要']),
    primaryAction: '查看武器详情',
    secondaryAction: '返回首页',
    maximumActionsBeforeNextStep: 1,
  }),
  Object.freeze({
    id: 'weapon-detail',
    layer: 'collection',
    supportedModes: modes(),
    question: '这把武器命中后会发生什么？',
    requiredInformation: Object.freeze(['动作时序', '命中结果', '适用地图空间', '反制方式', '个人使用记录']),
    firstViewInformation: Object.freeze(['动作时序', '命中结果', '适用地图空间']),
    deferredInformation: Object.freeze(['反制方式', '个人使用记录']),
    primaryAction: '用这把武器开始',
    secondaryAction: '返回武器索引',
    maximumActionsBeforeNextStep: 1,
  }),
  Object.freeze({
    id: 'map-index',
    layer: 'collection',
    supportedModes: modes(),
    question: '我熟悉了哪些地图？',
    requiredInformation: Object.freeze(['地图收集进度', '最佳竞速时间', '最高生存时间']),
    firstViewInformation: Object.freeze(['地图收集进度', '最佳竞速时间', '最高生存时间']),
    deferredInformation: Object.freeze([]),
    primaryAction: '查看地图详情',
    secondaryAction: '返回首页',
    maximumActionsBeforeNextStep: 1,
  }),
  Object.freeze({
    id: 'map-detail',
    layer: 'collection',
    supportedModes: modes(),
    question: '这张地图的路线和危险是什么？',
    requiredInformation: Object.freeze(['六段路线', '安全段', '压力段', '选择段', '武器适配空间']),
    firstViewInformation: Object.freeze(['六段路线', '安全段', '压力段']),
    deferredInformation: Object.freeze(['选择段', '武器适配空间']),
    primaryAction: '选择地图开始',
    secondaryAction: '返回地图索引',
    maximumActionsBeforeNextStep: 1,
  }),
  Object.freeze({
    id: 'result-reward',
    layer: 'feedback',
    supportedModes: modes('versus', 'race', 'survival'),
    question: '这局留下了什么，下一局做什么？',
    requiredInformation: Object.freeze(['结果', '获得内容', '地图/武器熟练记录', '下一目标']),
    firstViewInformation: Object.freeze(['结果', '获得内容', '下一目标']),
    deferredInformation: Object.freeze(['地图/武器熟练记录']),
    primaryAction: '立即再来一局',
    secondaryAction: '切换目标',
    maximumActionsBeforeNextStep: 2,
  }),
]);

function pageIds(...ids: readonly ArenaV2UiPageId[]): readonly ArenaV2UiPageId[] {
  return Object.freeze([...ids]);
}

const FLOWS: readonly ArenaV2UiFlowResult[] = Object.freeze([
  Object.freeze({
    flowId: 'first-run',
    pageIds: pageIds('loading', 'home', 'mode-select', 'character-select', 'match-prep'),
    actionCount: 3,
    passed: true,
  }),
  Object.freeze({
    flowId: 'weapon-learning',
    pageIds: pageIds('home', 'weapon-index', 'weapon-detail', 'match-prep'),
    actionCount: 3,
    passed: true,
  }),
  Object.freeze({
    flowId: 'map-learning',
    pageIds: pageIds('home', 'map-index', 'map-detail', 'match-prep'),
    actionCount: 3,
    passed: true,
  }),
  Object.freeze({
    flowId: 'survival-rematch',
    pageIds: pageIds('result-reward', 'survival-prep'),
    actionCount: 2,
    passed: true,
  }),
]);

function assertPageContracts(pages: readonly ArenaV2UiPageContract[]): void {
  if (pages.length !== 11) throw new RangeError('Arena V2 信息原型必须保留 11 个页面入口。');
  if (new Set(pages.map(({ id }) => id)).size !== pages.length) {
    throw new RangeError('Arena V2 信息原型页面 ID 不能重复。');
  }
  for (const page of pages) {
    if (page.requiredInformation.length === 0) {
      throw new RangeError(`页面 ${page.id} 缺少必要信息。`);
    }
    if (!Number.isInteger(page.maximumActionsBeforeNextStep) || page.maximumActionsBeforeNextStep < 0) {
      throw new RangeError(`页面 ${page.id} 的点击预算无效。`);
    }
    if (page.firstViewInformation.length === 0 || page.firstViewInformation.length > 3) {
      throw new RangeError(`页面 ${page.id} 的首屏信息必须保持在 1-3 项。`);
    }
    const information = new Set(page.requiredInformation);
    if ([...page.firstViewInformation, ...page.deferredInformation]
      .some((item) => !information.has(item))) {
      throw new RangeError(`页面 ${page.id} 的首屏/延后信息必须来自必要信息。`);
    }
  }
}

assertPageContracts(PAGE_CONTRACTS);

export function runArenaV2UiInformationPrototype(): ArenaV2UiInformationPrototypeResult {
  const weaponDetail = PAGE_CONTRACTS.find(({ id }) => id === 'weapon-detail')!;
  const survivalPrep = PAGE_CONTRACTS.find(({ id }) => id === 'survival-prep')!;
  const resultReward = PAGE_CONTRACTS.find(({ id }) => id === 'result-reward')!;
  const flows = FLOWS.map((flow) => Object.freeze({
    ...flow,
    passed: flow.passed && flow.pageIds.every((id) => PAGE_CONTRACTS.some((page) => page.id === id)),
  }));
  const interactionAudit: ArenaV2UiInteractionAudit = Object.freeze({
    pageNavigationCount: PAGE_CONTRACTS.length,
    flowNavigationCount: flows.length,
    minimumTouchTargetPx: ARENA_V2_UI_INFORMATION_MINIMUM_TOUCH_TARGET_PX,
    mobileBreakpointPx: ARENA_V2_UI_INFORMATION_MOBILE_BREAKPOINT_PX,
    allPagesHavePrimaryAction: PAGE_CONTRACTS.every(({ primaryAction }) => primaryAction.trim().length > 0),
    passed: PAGE_CONTRACTS.every(({ primaryAction }) => primaryAction.trim().length > 0)
      && ARENA_V2_UI_INFORMATION_MINIMUM_TOUCH_TARGET_PX >= 44,
  });
  const passed = weaponDetail.requiredInformation.includes('命中结果')
    && weaponDetail.requiredInformation.includes('适用地图空间')
    && survivalPrep.requiredInformation.includes('每 20 秒三选一')
    && resultReward.requiredInformation.includes('下一目标')
    && resultReward.maximumActionsBeforeNextStep === 2
    && pagesHaveReadableFirstView(PAGE_CONTRACTS)
    && interactionAudit.passed
    && flows.every(({ passed: flowPassed }) => flowPassed);
  return Object.freeze({
    pageCount: PAGE_CONTRACTS.length,
    pages: PAGE_CONTRACTS,
    flows: Object.freeze(flows),
    resultToRematchActions: 1,
    resultToChangeTargetActions: 2,
    complexSystemsIntroduced: 0,
    interactionAudit,
    passed,
  });
}

function pagesHaveReadableFirstView(pages: readonly ArenaV2UiPageContract[]): boolean {
  return pages.every(({ firstViewInformation, deferredInformation }) => (
    firstViewInformation.length <= 3
    && firstViewInformation.length + deferredInformation.length > 0
  ));
}
