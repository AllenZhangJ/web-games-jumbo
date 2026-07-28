import {
  createArenaV2WeaponCaseStudyOverview,
  createArenaV2WeaponCaseStudyReadabilityMatrix,
  createArenaV2WeaponCaseStudyResearchSignalReadout,
  createArenaV2WeaponReadabilityContextFacts,
  createArenaV2WeaponReadabilityTaskSet,
  evaluateArenaV2WeaponReadabilityAttempt,
  projectArenaV2WeaponReadabilityParticipantTasks,
  type ArenaV2WeaponReadabilityAttemptAnswer,
  type ArenaV2WeaponReadabilityAttemptReport,
  type ArenaV2WeaponReadabilityParticipantTask,
  type ArenaV2WeaponResearchOverviewMatrix,
  type ArenaV2WeaponResearchOverviewContext,
  type ArenaV2WeaponResearchOverviewRow,
  type ArenaV2WeaponResearchOverviewStat,
  type ArenaV2WeaponReadabilityTaskSet,
  type ArenaV2WeaponCaseStudyResearchSignalReadout,
  type ArenaV2WeaponCaseStudyLearningStep,
  type ArenaV2WeaponCaseStudyOverviewRow,
  type ArenaV2WeaponReadabilityContextFact,
} from '@number-strategy-jump/arena-v1-experiment';
import type { ArenaV2WeaponPublicAxisId } from '@number-strategy-jump/arena-v1-experiment';

interface ReadabilityStudyDocument extends Document {
  readonly defaultView: (Window & typeof globalThis) | null;
}

interface ReadabilityStudyState {
  readonly taskSet: ArenaV2WeaponReadabilityTaskSet;
  readonly answers: readonly ArenaV2WeaponReadabilityAttemptAnswer[] | null;
  readonly report: ArenaV2WeaponReadabilityAttemptReport | null;
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`武器数值可读性页面缺少 ${selector}。`);
  return node;
}

function text(node: Element, value: string): void {
  node.textContent = value;
}

function taskOptionName(taskId: string): string {
  return `readability-option-${taskId}`;
}

function reasonInputName(taskId: string): string {
  return `readability-reason-${taskId}`;
}

function contextInputName(taskId: string): string {
  return `readability-context-${taskId}`;
}

function directionLabel(direction: ArenaV2WeaponResearchOverviewStat['direction']): string {
  switch (direction) {
    case 'higher-is-better':
      return '越高越强';
    case 'lower-is-better':
      return '越低越快';
    case 'higher-is-risk':
      return '越高风险越大';
  }
}

function formatStat(stat: ArenaV2WeaponResearchOverviewStat): string {
  return `${stat.value.toFixed(stat.precision)} ${stat.unit}`;
}

function allContextStats(context: ArenaV2WeaponResearchOverviewContext): readonly ArenaV2WeaponResearchOverviewStat[] {
  const stats = new Map<string, ArenaV2WeaponResearchOverviewStat>();
  for (const stat of [...context.stats, ...context.contextStats, ...context.behaviorStats]) {
    if (!stats.has(stat.id)) stats.set(stat.id, stat);
  }
  return Object.freeze([...stats.values()]);
}

type ReadabilityQuickStatContext = 'ground' | 'aerial';

interface ReadabilityQuickStatSpec {
  readonly contextId: ReadabilityQuickStatContext;
  readonly statId: ArenaV2WeaponPublicAxisId;
  readonly label: string;
}

const READABILITY_QUICK_STAT_SPECS: readonly ReadabilityQuickStatSpec[] = Object.freeze([
  Object.freeze({ contextId: 'ground', statId: 'range', label: '地面距离' }),
  Object.freeze({ contextId: 'aerial', statId: 'range', label: '空中距离' }),
  Object.freeze({ contextId: 'ground', statId: 'startup', label: '地面前摇' }),
  Object.freeze({ contextId: 'ground', statId: 'recovery', label: '地面恢复' }),
]);

function directionGlyph(direction: ArenaV2WeaponResearchOverviewStat['direction']): string {
  switch (direction) {
    case 'higher-is-better':
      return '↑';
    case 'lower-is-better':
      return '↓';
    case 'higher-is-risk':
      return '⚠';
  }
}

function quickStatFor(
  row: ArenaV2WeaponResearchOverviewRow,
  spec: ReadabilityQuickStatSpec,
): ArenaV2WeaponResearchOverviewStat {
  const context = row.contexts.find(({ id }) => id === spec.contextId);
  const stat = context && allContextStats(context).find(({ id }) => id === spec.statId);
  if (!stat) throw new Error(`研究概览缺少 ${row.displayName} 的 ${spec.contextId}/${spec.statId} 快速数值。`);
  return stat;
}

function renderQuickStat(
  documentValue: Document,
  row: ArenaV2WeaponResearchOverviewRow,
  spec: ReadabilityQuickStatSpec,
): HTMLElement {
  const stat = quickStatFor(row, spec);
  const item = documentValue.createElement('div');
  item.className = 'readability-quick-stat';
  item.dataset.weaponQuickStat = spec.statId;
  item.dataset.weaponQuickContext = spec.contextId;
  item.dataset.weaponQuickDirection = stat.direction;
  item.setAttribute(
    'aria-label',
    `${spec.label}：${formatStat(stat)}，${directionLabel(stat.direction)}`,
  );
  const label = documentValue.createElement('span');
  label.className = 'readability-quick-stat-label';
  text(label, `${spec.label} ${directionGlyph(stat.direction)}`);
  const value = documentValue.createElement('strong');
  value.className = 'readability-quick-stat-value';
  text(value, formatStat(stat));
  const track = documentValue.createElement('span');
  track.className = 'readability-quick-stat-track';
  track.setAttribute('aria-hidden', 'true');
  track.style.setProperty(
    '--readability-quick-fill',
    `${Math.min(100, Math.max(8, (stat.value / stat.maxValue) * 100))}%`,
  );
  item.append(label, value, track);
  return item;
}

function contextLabel(context: ArenaV2WeaponCaseStudyLearningStep['context']): string {
  switch (context) {
    case 'ground': return '地面';
    case 'running': return '跑动';
    case 'aerial': return '空中';
    case 'charged': return '蓄力';
    case 'delayed': return '延迟';
    case 'counter': return '反制';
    case 'after-hit': return '命中后';
    case 'resource': return '资源';
  }
}

function renderLearningPath(
  documentValue: Document,
  steps: readonly ArenaV2WeaponCaseStudyLearningStep[],
): HTMLDetailsElement {
  const details = documentValue.createElement('details');
  details.className = 'readability-learning-path';
  const summary = documentValue.createElement('summary');
  text(summary, `学习路径：${steps.length} 步`);
  details.append(summary);
  const list = documentValue.createElement('ol');
  for (const step of steps) {
    const item = documentValue.createElement('li');
    const title = documentValue.createElement('strong');
    text(title, step.title);
    const context = documentValue.createElement('span');
    text(context, `${step.input} · ${contextLabel(step.context)}`);
    const decision = documentValue.createElement('p');
    text(decision, `要做的决定：${step.decision}`);
    const observe = documentValue.createElement('p');
    text(observe, `要观察：${step.observe}`);
    const failure = documentValue.createElement('p');
    text(failure, `失败代价：${step.failureCost}`);
    const numeric = documentValue.createElement('p');
    const focus = step.numericFocus.map(({ label, status }) => (
      `${label}${status === 'research-only' ? '（研究中）' : ''}`
    ));
    text(numeric, `数值重点：${focus.length > 0 ? focus.join('、') : '暂无'}`);
    item.append(title, context, decision, observe, failure, numeric);
    list.append(item);
  }
  details.append(list);
  return details;
}

function renderWeaponSummary(
  documentValue: Document,
  row: ArenaV2WeaponResearchOverviewRow,
  learningPath: readonly ArenaV2WeaponCaseStudyLearningStep[],
): HTMLElement {
  const article = documentValue.createElement('article');
  article.className = 'readability-overview-card';
  const heading = documentValue.createElement('h3');
  text(heading, row.displayName);
  article.append(heading);
  const verb = documentValue.createElement('p');
  verb.className = 'readability-overview-verb';
  text(verb, `${row.coreVerb} · ${row.hitResult}`);
  article.append(verb);
  const quickStats = documentValue.createElement('div');
  quickStats.className = 'readability-overview-quick-stats';
  quickStats.setAttribute('aria-label', '核心数值摘要');
  for (const spec of READABILITY_QUICK_STAT_SPECS) {
    quickStats.append(renderQuickStat(documentValue, row, spec));
  }
  article.append(quickStats);
  article.append(renderLearningPath(documentValue, learningPath));
  const map = documentValue.createElement('p');
  text(map, `适合：${row.mapSpaces.join(' / ')}`);
  article.append(map);
  const counterplay = documentValue.createElement('p');
  text(counterplay, `反制：${row.counterplay.join(' / ')}`);
  article.append(counterplay);
  return article;
}

function renderContextTable(
  documentValue: Document,
  rows: readonly ArenaV2WeaponResearchOverviewRow[],
  contextId: 'ground' | 'aerial',
): HTMLDetailsElement {
  const context = rows[0]?.contexts.find(({ id }) => id === contextId);
  if (!context) throw new Error(`研究矩阵缺少 ${contextId} 上下文。`);
  const details = documentValue.createElement('details');
  details.className = 'readability-overview-context';
  details.open = contextId === 'ground';
  const summary = documentValue.createElement('summary');
  text(summary, `${context.label}：完整数值矩阵（横向比较）`);
  details.append(summary);

  const wrap = documentValue.createElement('div');
  wrap.className = 'readability-table-wrap';
  const table = documentValue.createElement('table');
  table.className = 'readability-overview-table';
  const caption = documentValue.createElement('caption');
  text(caption, '数值保留原始单位；方向语义直接写在每个数值名称下。');
  table.append(caption);
  const head = documentValue.createElement('thead');
  const headRow = documentValue.createElement('tr');
  const axisHead = documentValue.createElement('th');
  axisHead.scope = 'col';
  text(axisHead, '数值轴');
  headRow.append(axisHead);
  for (const row of rows) {
    const weaponHead = documentValue.createElement('th');
    weaponHead.scope = 'col';
    text(weaponHead, row.displayName);
    headRow.append(weaponHead);
  }
  head.append(headRow);
  table.append(head);

  const body = documentValue.createElement('tbody');
  const stats = allContextStats(context);
  for (const stat of stats) {
    const row = documentValue.createElement('tr');
    row.dataset.axisId = stat.id;
    const axisCell = documentValue.createElement('th');
    axisCell.scope = 'row';
    const label = documentValue.createElement('span');
    text(label, stat.label);
    const meaning = documentValue.createElement('small');
    text(meaning, `${stat.playerMeaning} · ${directionLabel(stat.direction)}`);
    axisCell.append(label, meaning);
    row.append(axisCell);
    for (const candidate of rows) {
      const candidateContext = candidate.contexts.find(({ id }) => id === contextId);
      const candidateStat = candidateContext && allContextStats(candidateContext).find(({ id }) => id === stat.id);
      if (!candidateStat) throw new Error(`研究矩阵缺少 ${candidate.displayName} 的 ${stat.id} 数值。`);
      const valueCell = documentValue.createElement('td');
      text(valueCell, formatStat(candidateStat));
      row.append(valueCell);
    }
    body.append(row);
  }
  table.append(body);
  wrap.append(table);
  details.append(wrap);
  return details;
}

function renderContextFacts(
  documentValue: Document,
  facts: readonly ArenaV2WeaponReadabilityContextFact[],
): HTMLElement {
  const section = documentValue.createElement('section');
  section.className = 'readability-context-facts';
  section.setAttribute('aria-labelledby', 'readability-context-facts-title');
  const heading = documentValue.createElement('h3');
  heading.id = 'readability-context-facts-title';
  text(heading, '场景差异速览');
  section.append(heading);
  const note = documentValue.createElement('p');
  note.className = 'readability-note';
  text(note, '只展示六件研究武器矩阵中的唯一极值；每条都保留场景、数值和单位，完整矩阵可继续核对。');
  section.append(note);
  const list = documentValue.createElement('div');
  list.className = 'readability-context-fact-list';
  for (const fact of facts) {
    const item = documentValue.createElement('div');
    item.className = 'readability-context-fact';
    item.dataset.contextFactKind = fact.kind;
    item.dataset.contextFactContext = fact.contextId;
    item.dataset.contextFactStat = fact.statId;
    item.setAttribute(
      'aria-label',
      `${fact.displayName}：${fact.statement}，${fact.value.toFixed(fact.precision)} ${fact.unit}`,
    );
    const name = documentValue.createElement('strong');
    text(name, fact.displayName);
    const statement = documentValue.createElement('span');
    text(statement, fact.statement);
    const value = documentValue.createElement('b');
    text(value, `${fact.value.toFixed(fact.precision)} ${fact.unit}`);
    item.append(name, statement, value);
    list.append(item);
  }
  section.append(list);
  return section;
}

function renderOverview(
  documentValue: Document,
  matrix: ArenaV2WeaponResearchOverviewMatrix,
  researchSignals: readonly ArenaV2WeaponCaseStudyResearchSignalReadout[],
  caseStudyRows: readonly ArenaV2WeaponCaseStudyOverviewRow[],
): void {
  const overview = required<HTMLElement>(documentValue, '#readability-overview');
  const researchSignalsRoot = required<HTMLElement>(overview, '#readability-research-signals');
  overview.replaceChildren();
  const summary = documentValue.createElement('div');
  summary.className = 'readability-overview-summary';
  for (const row of matrix.rows) {
    const caseStudyRow = caseStudyRows.find(({ referenceId }) => referenceId === row.candidateId);
    if (!caseStudyRow) throw new Error(`研究概览缺少学习路径：${row.candidateId}`);
    summary.append(renderWeaponSummary(documentValue, row, caseStudyRow.learningPath));
  }
  overview.append(summary);
  overview.append(renderContextFacts(documentValue, createArenaV2WeaponReadabilityContextFacts(matrix)));
  overview.append(renderContextTable(documentValue, matrix.rows, 'ground'));
  overview.append(renderContextTable(documentValue, matrix.rows, 'aerial'));
  overview.append(researchSignalsRoot);
  renderResearchSignals(documentValue, researchSignals);
}

function formatResearchSignal(value: number | null): string {
  return value === null ? '未建立' : `${value} tick`;
}

function renderResearchSignals(
  documentValue: Document,
  signals: readonly ArenaV2WeaponCaseStudyResearchSignalReadout[],
): void {
  const root = required<HTMLElement>(documentValue, '#readability-research-signals');
  root.replaceChildren();
  const heading = documentValue.createElement('h3');
  text(heading, '延迟与预警研究信号');
  root.append(heading);
  const note = documentValue.createElement('p');
  note.className = 'readability-note';
  text(note, '这组数字单独展示延迟武器的核心差异；它们是研究假设，不是生产战斗参数。未建立不等于 0 tick。');
  root.append(note);

  const wrap = documentValue.createElement('div');
  wrap.className = 'readability-table-wrap';
  const table = documentValue.createElement('table');
  table.className = 'readability-research-signal-table';
  const caption = documentValue.createElement('caption');
  text(caption, '延迟：动作开始到危险窗口；预警：玩家可见危险到有效窗口；有效：危险实际生效窗口。');
  table.append(caption);
  const head = documentValue.createElement('thead');
  const headRow = documentValue.createElement('tr');
  for (const label of ['武器', '核心动词', '延迟', '预警', '有效窗口', '状态']) {
    const cell = documentValue.createElement('th');
    cell.scope = 'col';
    text(cell, label);
    headRow.append(cell);
  }
  head.append(headRow);
  table.append(head);

  const body = documentValue.createElement('tbody');
  for (const signal of signals) {
    const row = documentValue.createElement('tr');
    row.dataset.referenceId = signal.referenceId;
    const name = documentValue.createElement('th');
    name.scope = 'row';
    text(name, signal.displayName);
    row.append(name);
    const verb = documentValue.createElement('td');
    text(verb, signal.coreVerb);
    row.append(verb);
    for (const value of [signal.delayTicks, signal.warningTicks, signal.activeTicks]) {
      const cell = documentValue.createElement('td');
      text(cell, formatResearchSignal(value));
      row.append(cell);
    }
    const status = documentValue.createElement('td');
    text(status, signal.status === 'research-hypothesis' ? '研究假设' : '未声明');
    status.title = signal.explanation;
    row.append(status);
    body.append(row);
  }
  table.append(body);
  wrap.append(table);
  root.append(wrap);
}

function appendLabel(
  documentValue: Document,
  parent: HTMLElement,
  className: string,
  input: HTMLInputElement,
  labelText: string,
): void {
  const label = documentValue.createElement('label');
  label.className = className;
  label.append(input, documentValue.createTextNode(labelText));
  parent.append(label);
}

function renderTask(
  documentValue: Document,
  task: ArenaV2WeaponReadabilityParticipantTask,
): HTMLFieldSetElement {
  const fieldset = documentValue.createElement('fieldset');
  fieldset.className = 'readability-task';
  fieldset.dataset.taskId = task.id;
  const legend = documentValue.createElement('legend');
  text(legend, task.prompt);
  fieldset.append(legend);
  const status = documentValue.createElement('p');
  status.className = 'readability-task-status';
  text(status, task.status === 'ready' ? '请根据概览信息作答。' : '本题当前阻塞，不能计入真人采集。');
  fieldset.append(status);

  const options = documentValue.createElement('div');
  options.className = 'readability-options';
  for (const option of task.options) {
    const input = documentValue.createElement('input');
    input.type = 'radio';
    input.name = taskOptionName(task.id);
    input.value = option.id;
    input.required = true;
    appendLabel(documentValue, options, 'readability-option', input, option.label);
  }
  fieldset.append(options);

  if (task.kind === 'map-choice' || task.kind === 'context-difference') {
    const reasons = documentValue.createElement('fieldset');
    reasons.className = 'readability-reasons';
    const reasonLegend = documentValue.createElement('legend');
    text(reasonLegend, '选择你使用的数值理由');
    reasons.append(reasonLegend);
    for (const axisId of task.axisIds) {
      const input = documentValue.createElement('input');
      input.type = 'checkbox';
      input.name = reasonInputName(task.id);
      input.value = axisId;
      appendLabel(documentValue, reasons, 'readability-reason', input, axisId);
    }
    fieldset.append(reasons);
  }

  if (task.kind === 'context-difference') {
    const context = documentValue.createElement('div');
    context.className = 'readability-context';
    for (const contextId of ['ground', 'aerial'] as const) {
      const input = documentValue.createElement('input');
      input.type = 'radio';
      input.name = contextInputName(task.id);
      input.value = contextId;
      input.required = true;
      appendLabel(documentValue, context, 'readability-context-option', input, contextId === 'ground' ? '地面更高' : '空中更高');
    }
    fieldset.append(context);
  }
  return fieldset;
}

function selectedValue(root: ParentNode, name: string): string | null {
  return root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? null;
}

function readAnswers(
  root: ParentNode,
  tasks: readonly ArenaV2WeaponReadabilityParticipantTask[],
): readonly ArenaV2WeaponReadabilityAttemptAnswer[] {
  return Object.freeze(tasks.map((task) => {
    const selectedOptionId = selectedValue(root, taskOptionName(task.id));
    if (selectedOptionId === null) throw new Error(`请完成题目：${task.prompt}`);
    const reasonAxisIds: readonly ArenaV2WeaponPublicAxisId[] = [...root.querySelectorAll<HTMLInputElement>(
      `input[name="${reasonInputName(task.id)}"]:checked`,
    )].map(({ value }) => value as ArenaV2WeaponPublicAxisId);
    if ((task.kind === 'map-choice' || task.kind === 'context-difference') && reasonAxisIds.length === 0) {
      throw new Error(`请至少选择一个数值理由：${task.prompt}`);
    }
    const selectedContextId = task.kind === 'context-difference'
      ? selectedValue(root, contextInputName(task.id)) as 'ground' | 'aerial' | null
      : null;
    if (task.kind === 'context-difference' && selectedContextId === null) {
      throw new Error(`请完成地面/空中判断：${task.prompt}`);
    }
    return Object.freeze({ taskId: task.id, selectedOptionId, selectedContextId, reasonAxisIds });
  }));
}

function downloadJson(
  documentValue: ReadabilityStudyDocument,
  state: ReadabilityStudyState,
): void {
  const view = documentValue.defaultView;
  if (!view || typeof view.Blob !== 'function' || !view.URL?.createObjectURL) {
    throw new Error('当前研究环境不支持结果下载。');
  }
  const payload = JSON.stringify({
    schemaVersion: 1,
    taskSetHash: state.taskSet.taskSetHash,
    sourceMatrixHash: state.taskSet.sourceMatrixHash,
    answers: state.answers,
    report: state.report,
  }, null, 2);
  const blob = new view.Blob([payload], { type: 'application/json;charset=utf-8' });
  const url = view.URL.createObjectURL(blob);
  const anchor = documentValue.createElement('a');
  anchor.href = url;
  anchor.download = `arena-weapon-readability-${state.taskSet.taskSetHash}.json`;
  anchor.click();
  view.URL.revokeObjectURL(url);
}

function renderReport(
  documentValue: Document,
  report: ArenaV2WeaponReadabilityAttemptReport,
  taskSet: ArenaV2WeaponReadabilityTaskSet,
): void {
  const result = required<HTMLElement>(documentValue, '#readability-result');
  const summary = required<HTMLElement>(documentValue, '#readability-result-summary');
  const list = required<HTMLOListElement>(documentValue, '#readability-result-list');
  result.hidden = false;
  text(summary, `${report.passedTaskCount} / ${report.readyTaskCount} 题通过（本次 passRate ${(report.passRate * 100).toFixed(0)}%）`);
  list.replaceChildren();
  for (const item of report.results) {
    const task = taskSet.tasks.find(({ id }) => id === item.taskId);
    const node = documentValue.createElement('li');
    node.className = item.passed ? 'is-pass' : 'is-fail';
    text(node, `${task?.prompt ?? item.taskId}：${item.passed ? '通过' : '未通过'}`);
    list.append(node);
  }
}

function start(): void {
  const documentValue = globalThis.document as ReadabilityStudyDocument;
  const root = required<HTMLElement>(documentValue, '#weapon-readability-study');
  const form = required<HTMLFormElement>(root, '#readability-task-form');
  const submit = required<HTMLButtonElement>(root, '#readability-submit');
  const exportButton = required<HTMLButtonElement>(root, '#readability-export');
  const error = required<HTMLElement>(root, '#readability-error');
  const matrix = createArenaV2WeaponCaseStudyReadabilityMatrix();
  const caseStudyRows = createArenaV2WeaponCaseStudyOverview().rows;
  const researchSignals = createArenaV2WeaponCaseStudyResearchSignalReadout();
  const taskSet = createArenaV2WeaponReadabilityTaskSet(matrix);
  const tasks = projectArenaV2WeaponReadabilityParticipantTasks(taskSet);
  renderOverview(documentValue, matrix, researchSignals, caseStudyRows);
  const taskHash = required<HTMLElement>(root, '#readability-task-hash');
  const matrixHash = required<HTMLElement>(root, '#readability-matrix-hash');
  const status = required<HTMLElement>(root, '#readability-status');
  text(taskHash, taskSet.taskSetHash);
  text(matrixHash, taskSet.sourceMatrixHash);
  text(status, taskSet.participantReady ? '可开始' : '已阻塞');
  form.replaceChildren(...tasks.map((task) => renderTask(documentValue, task)));

  let state: ReadabilityStudyState = Object.freeze({ taskSet, answers: null, report: null });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    error.hidden = true;
    try {
      const answers = readAnswers(form, tasks);
      const report = evaluateArenaV2WeaponReadabilityAttempt(taskSet, answers);
      state = Object.freeze({ taskSet, answers, report });
      renderReport(documentValue, report, taskSet);
      exportButton.disabled = report.status !== 'evaluated';
      text(status, '已评估（非真人结论）');
    } catch (caught) {
      text(error, caught instanceof Error ? caught.message : String(caught));
      error.hidden = false;
    }
  });
  exportButton.addEventListener('click', () => {
    try {
      if (!state.answers || !state.report) throw new Error('请先提交本次回答。');
      downloadJson(documentValue, state);
    } catch (caught) {
      text(error, caught instanceof Error ? caught.message : String(caught));
      error.hidden = false;
    }
  });
  submit.disabled = !taskSet.participantReady;
}

start();
