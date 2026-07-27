import {
  createArenaV2WeaponReadabilityTaskSet,
  evaluateArenaV2WeaponReadabilityAttempt,
  projectArenaV2WeaponReadabilityParticipantTasks,
  type ArenaV2WeaponReadabilityAttemptAnswer,
  type ArenaV2WeaponReadabilityAttemptReport,
  type ArenaV2WeaponReadabilityParticipantTask,
  type ArenaV2WeaponReadabilityTaskSet,
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
  const taskSet = createArenaV2WeaponReadabilityTaskSet();
  const tasks = projectArenaV2WeaponReadabilityParticipantTasks(taskSet);
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
