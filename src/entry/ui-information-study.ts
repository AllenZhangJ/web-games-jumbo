import {
  resolveArenaV2UiNextGoal,
  runArenaV2UiInformationPrototype,
  type ArenaV2UiFlowResult,
  type ArenaV2UiInformationPrototypeResult,
  type ArenaV2UiNextGoal,
  type ArenaV2UiPageContract,
  type ArenaV2UiPageId,
  type ArenaV2UiProgressSnapshot,
} from '@number-strategy-jump/arena-v1-experiment';

interface UiInformationStudyDocument extends Document {
  readonly defaultView: (Window & typeof globalThis) | null;
}

interface UiNextGoalScenario {
  readonly id: string;
  readonly label: string;
  readonly progress: ArenaV2UiProgressSnapshot;
}

const NEXT_GOAL_SCENARIOS: readonly UiNextGoalScenario[] = Object.freeze([
  Object.freeze({
    id: 'collect',
    label: '收集阶段',
    progress: Object.freeze({
      weaponCatalogSize: 12,
      ownedWeaponCount: 3,
      masteredWeaponContextCount: 0,
      totalWeaponContextCount: 24,
      masteredMapSegmentCount: 0,
      totalMapSegmentCount: 6,
      bestSurvivalSeconds: 200,
      nextSurvivalTargetSeconds: 240,
    }),
  }),
  Object.freeze({
    id: 'context',
    label: '熟悉阶段',
    progress: Object.freeze({
      weaponCatalogSize: 12,
      ownedWeaponCount: 12,
      masteredWeaponContextCount: 8,
      totalWeaponContextCount: 24,
      masteredMapSegmentCount: 1,
      totalMapSegmentCount: 6,
      bestSurvivalSeconds: 200,
      nextSurvivalTargetSeconds: 240,
    }),
  }),
  Object.freeze({
    id: 'route',
    label: '地图阶段',
    progress: Object.freeze({
      weaponCatalogSize: 12,
      ownedWeaponCount: 12,
      masteredWeaponContextCount: 24,
      totalWeaponContextCount: 24,
      masteredMapSegmentCount: 4,
      totalMapSegmentCount: 6,
      bestSurvivalSeconds: 200,
      nextSurvivalTargetSeconds: 240,
    }),
  }),
  Object.freeze({
    id: 'survival',
    label: '生存阶段',
    progress: Object.freeze({
      weaponCatalogSize: 12,
      ownedWeaponCount: 12,
      masteredWeaponContextCount: 24,
      totalWeaponContextCount: 24,
      masteredMapSegmentCount: 6,
      totalMapSegmentCount: 6,
      bestSurvivalSeconds: 200,
      nextSurvivalTargetSeconds: 240,
    }),
  }),
]);

function required<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`局外页面研究缺少 ${selector}。`);
  return node;
}

function text(node: Element, value: string): void {
  node.textContent = value;
}

function labelForPage(page: ArenaV2UiPageContract): string {
  const labels: Readonly<Record<ArenaV2UiPageId, string>> = {
    loading: '加载',
    home: '首页',
    'mode-select': '模式选择',
    'character-select': '角色选择',
    'match-prep': '竞技准备',
    'survival-prep': '生存准备',
    'weapon-index': '武器收藏',
    'weapon-detail': '武器详情',
    'map-index': '地图收藏',
    'map-detail': '地图详情',
    'result-reward': '结算/奖励',
  };
  return labels[page.id];
}

function renderList(
  documentValue: Document,
  values: readonly string[],
  className = '',
): HTMLUListElement {
  const list = documentValue.createElement('ul');
  if (className) list.className = className;
  for (const value of values) {
    const item = documentValue.createElement('li');
    text(item, value);
    list.append(item);
  }
  return list;
}

function renderPage(
  documentValue: Document,
  page: ArenaV2UiPageContract,
): void {
  const preview = required<HTMLElement>(documentValue, '#ui-page-preview');
  preview.replaceChildren();
  const heading = documentValue.createElement('h2');
  text(heading, labelForPage(page));
  preview.append(heading);
  const question = documentValue.createElement('p');
  question.className = 'ui-page-question';
  text(question, page.question);
  preview.append(question);

  const metrics = documentValue.createElement('div');
  metrics.className = 'ui-page-metrics';
  const metricValues: readonly [string, string][] = [
    ['信息层', page.layer],
    ['首屏信息', `${page.firstViewInformation.length} 项`],
    ['下一步预算', `${page.maximumActionsBeforeNextStep} 次`],
  ];
  for (const [name, value] of metricValues) {
    const metric = documentValue.createElement('div');
    metric.className = 'ui-page-metric';
    const nameNode = documentValue.createElement('span');
    text(nameNode, name);
    const valueNode = documentValue.createElement('strong');
    text(valueNode, value);
    metric.append(nameNode, valueNode);
    metrics.append(metric);
  }
  preview.append(metrics);

  const columns = documentValue.createElement('div');
  columns.className = 'ui-page-columns';
  const firstView = documentValue.createElement('section');
  const firstViewHeading = documentValue.createElement('h3');
  text(firstViewHeading, '首屏必须看懂');
  firstView.append(firstViewHeading, renderList(documentValue, page.firstViewInformation));
  const deferred = documentValue.createElement('section');
  deferred.className = 'ui-page-deferred';
  const deferredHeading = documentValue.createElement('h3');
  text(deferredHeading, '可以延后');
  deferred.append(deferredHeading, renderList(documentValue, page.deferredInformation));
  columns.append(firstView, deferred);
  preview.append(columns);

  const actions = documentValue.createElement('div');
  actions.className = 'ui-page-actions';
  const primary = documentValue.createElement('span');
  primary.className = 'ui-page-action';
  text(primary, `主动作：${page.primaryAction}`);
  actions.append(primary);
  if (page.secondaryAction) {
    const secondary = documentValue.createElement('span');
    secondary.className = 'ui-page-action secondary';
    text(secondary, `次动作：${page.secondaryAction}`);
    actions.append(secondary);
  }
  preview.append(actions);

  const note = documentValue.createElement('p');
  note.className = 'ui-page-note';
  text(note, `支持模式：${page.supportedModes.length === 0 ? '全局入口' : page.supportedModes.join(' / ')}`);
  preview.append(note);
}

function renderPageNav(
  documentValue: Document,
  result: ArenaV2UiInformationPrototypeResult,
  selectPage: (pageId: ArenaV2UiPageId) => void,
): void {
  const nav = required<HTMLElement>(documentValue, '#ui-page-nav');
  nav.replaceChildren();
  for (const page of result.pages) {
    const button = documentValue.createElement('button');
    button.type = 'button';
    button.dataset.pageId = page.id;
    button.setAttribute('aria-current', page.id === result.pages[0]?.id ? 'page' : 'false');
    const name = documentValue.createElement('span');
    text(name, labelForPage(page));
    const detail = documentValue.createElement('small');
    text(detail, `${page.firstViewInformation.length} 项首屏 · ${page.maximumActionsBeforeNextStep} 次预算`);
    button.append(name, detail);
    button.addEventListener('click', () => selectPage(page.id));
    nav.append(button);
  }
}

function selectPage(
  documentValue: Document,
  result: ArenaV2UiInformationPrototypeResult,
  pageId: ArenaV2UiPageId,
): void {
  const page = result.pages.find(({ id }) => id === pageId);
  if (!page) throw new Error(`局外页面研究不存在 ${pageId}。`);
  renderPage(documentValue, page);
  for (const button of documentValue.querySelectorAll<HTMLButtonElement>('#ui-page-nav button')) {
    const selected = button.dataset.pageId === pageId;
    button.setAttribute('aria-current', selected ? 'page' : 'false');
  }
}

function flowLabel(flow: ArenaV2UiFlowResult): string {
  const labels: Readonly<Record<ArenaV2UiFlowResult['flowId'], string>> = {
    'first-run': '首次进入',
    'weapon-learning': '学习武器',
    'map-learning': '学习地图',
    'survival-rematch': '生存重开',
  };
  return labels[flow.flowId];
}

function renderFlow(
  documentValue: Document,
  flow: ArenaV2UiFlowResult,
): void {
  const preview = required<HTMLElement>(documentValue, '#ui-flow-preview');
  preview.replaceChildren();
  const heading = documentValue.createElement('h3');
  text(heading, flowLabel(flow));
  preview.append(heading);
  const description = documentValue.createElement('p');
  text(description, `页面顺序：${flow.pageIds.join(' → ')}`);
  preview.append(description);
  const list = documentValue.createElement('ol');
  for (const [index, pageId] of flow.pageIds.entries()) {
    const item = documentValue.createElement('li');
    text(item, `${index + 1}. ${pageId}`);
    list.append(item);
  }
  preview.append(list);
  const result = documentValue.createElement('p');
  result.className = 'ui-flow-result';
  text(result, `${flow.passed ? '合同通过' : '合同阻塞'} · ${flow.actionCount} 次主要操作`);
  preview.append(result);
}

function renderFlowNav(
  documentValue: Document,
  result: ArenaV2UiInformationPrototypeResult,
): void {
  const nav = required<HTMLElement>(documentValue, '#ui-flow-nav');
  nav.replaceChildren();
  for (const [index, flow] of result.flows.entries()) {
    const button = documentValue.createElement('button');
    button.type = 'button';
    button.dataset.flowId = flow.flowId;
    button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
    text(button, flowLabel(flow));
    button.addEventListener('click', () => {
      renderFlow(documentValue, flow);
      for (const candidate of documentValue.querySelectorAll<HTMLButtonElement>('#ui-flow-nav button')) {
        candidate.setAttribute('aria-pressed', candidate.dataset.flowId === flow.flowId ? 'true' : 'false');
      }
    });
    nav.append(button);
  }
}

function renderNextGoal(
  documentValue: Document,
  goal: ArenaV2UiNextGoal,
): void {
  const preview = required<HTMLElement>(documentValue, '#ui-next-goal-preview');
  preview.replaceChildren();
  const heading = documentValue.createElement('h3');
  text(heading, goal.title);
  preview.append(heading);
  const reason = documentValue.createElement('p');
  reason.className = 'ui-next-goal-reason';
  text(reason, goal.reason);
  preview.append(reason);

  const progressLine = documentValue.createElement('div');
  progressLine.className = 'ui-next-goal-progress';
  const progress = documentValue.createElement('progress');
  progress.max = goal.progressTarget;
  progress.value = goal.progressValue;
  progress.setAttribute('aria-label', `${goal.title}进度`);
  const progressText = documentValue.createElement('strong');
  text(progressText, `${goal.progressValue} / ${goal.progressTarget}`);
  progressLine.append(progress, progressText);
  preview.append(progressLine);

  const action = documentValue.createElement('span');
  action.className = 'ui-next-goal-action';
  text(action, `立即行动：${goal.actionLabel}`);
  preview.append(action);
}

function renderNextGoalNav(
  documentValue: Document,
  selectScenario: (scenario: UiNextGoalScenario) => void,
): void {
  const nav = required<HTMLElement>(documentValue, '#ui-next-goal-nav');
  nav.replaceChildren();
  for (const [index, scenario] of NEXT_GOAL_SCENARIOS.entries()) {
    const button = documentValue.createElement('button');
    button.type = 'button';
    button.dataset.nextGoalScenario = scenario.id;
    button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
    text(button, scenario.label);
    button.addEventListener('click', () => {
      selectScenario(scenario);
      for (const candidate of documentValue.querySelectorAll<HTMLButtonElement>('#ui-next-goal-nav button')) {
        candidate.setAttribute(
          'aria-pressed',
          candidate.dataset.nextGoalScenario === scenario.id ? 'true' : 'false',
        );
      }
    });
    nav.append(button);
  }
}

function run(documentValue: UiInformationStudyDocument): void {
  const result = runArenaV2UiInformationPrototype();
  text(required(documentValue, '#ui-page-count'), `${result.pageCount} 页`);
  text(required(documentValue, '#ui-flow-count'), `${result.flows.length} 条`);
  text(required(documentValue, '#ui-complexity-count'), `${result.complexSystemsIntroduced}`);
  text(required(documentValue, '#ui-touch-target'), `${result.interactionAudit.minimumTouchTargetPx} px`);
  text(required(documentValue, '#ui-contract-status'), result.passed ? '通过' : '阻塞');
  renderPageNav(documentValue, result, (pageId) => selectPage(documentValue, result, pageId));
  renderFlowNav(documentValue, result);
  renderNextGoalNav(documentValue, (scenario) => {
    renderNextGoal(documentValue, resolveArenaV2UiNextGoal(scenario.progress));
  });
  const firstPage = result.pages[0];
  const firstFlow = result.flows[0];
  const firstGoalScenario = NEXT_GOAL_SCENARIOS[0];
  if (!firstPage || !firstFlow || !firstGoalScenario) {
    throw new Error('局外页面研究缺少默认页面、流程或下一目标。');
  }
  renderPage(documentValue, firstPage);
  renderFlow(documentValue, firstFlow);
  renderNextGoal(documentValue, resolveArenaV2UiNextGoal(firstGoalScenario.progress));
}

const documentValue = globalThis.document as UiInformationStudyDocument | undefined;
if (!documentValue) throw new Error('局外页面研究必须在浏览器文档中运行。');
try {
  run(documentValue);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const alert = required<HTMLElement>(documentValue, '#ui-study-error');
  text(alert, message);
  alert.hidden = false;
}
