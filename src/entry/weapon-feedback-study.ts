import {
  runArenaV2KzLanguageConsequencePrototype,
  type ArenaV2KzLanguageConsequenceProbeResult,
  type ArenaV2WeaponHitFeedbackKind,
} from '@number-strategy-jump/arena-v1-experiment';
import {
  projectArenaV2WeaponFeedbackPresentationEvent,
  type ArenaV2WeaponFeedbackPresentationEvent,
} from '@number-strategy-jump/arena-presentation-runtime';

interface FeedbackStudyDocument extends Document {
  readonly defaultView: (Window & typeof globalThis) | null;
}

interface FeedbackStudyScenario {
  readonly id: string;
  readonly probe: ArenaV2KzLanguageConsequenceProbeResult;
  readonly presentation: ArenaV2WeaponFeedbackPresentationEvent;
  readonly options: readonly ArenaV2WeaponHitFeedbackKind[];
}

interface FeedbackStudyAnswer {
  readonly scenarioId: string;
  readonly selectedKind: ArenaV2WeaponHitFeedbackKind;
}

interface FeedbackStudyReportItem {
  readonly scenarioId: string;
  readonly selectedKind: ArenaV2WeaponHitFeedbackKind;
  readonly expectedKind: ArenaV2WeaponHitFeedbackKind;
  readonly passed: boolean;
}

interface FeedbackStudyState {
  readonly answers: readonly FeedbackStudyAnswer[] | null;
  readonly report: readonly FeedbackStudyReportItem[] | null;
}

interface FeedbackStudyDataset {
  readonly sourceProbeCount: number;
  readonly scenarios: readonly FeedbackStudyScenario[];
}

const FEEDBACK_KINDS: readonly ArenaV2WeaponHitFeedbackKind[] = Object.freeze([
  'hit-confirm',
  'hit-surface-transfer',
  'hit-ring-out',
  'attack-evaded',
  'movement-fall',
]);

const FEEDBACK_OPTION_LABEL: Readonly<Record<ArenaV2WeaponHitFeedbackKind, string>> = Object.freeze({
  'hit-confirm': '命中成立，位置改变但仍保有支撑面',
  'hit-surface-transfer': '命中成立，目标落点转移到另一处支撑面',
  'hit-ring-out': '命中成立，目标失去支撑面并被击落',
  'attack-evaded': '目标避开攻击线，武器没有命中',
  'movement-fall': '玩家先因路线失误掉落，不是武器命中造成',
});

const FEEDBACK_CUE_LABEL: Readonly<Record<string, string>> = Object.freeze({
  'impact-confirm': '冲击确认',
  'impact-surface-transfer': '落点转移',
  'ring-out': '边缘击落',
  'evaded-warning': '攻击线被避开',
  'movement-fall-warning': '路线失误警告',
});

const AUDIO_CUE_LABEL: Readonly<Record<string, string>> = Object.freeze({
  'weapon-hit': '命中音',
  'weapon-transfer': '转移音',
  'weapon-ring-out': '击落音',
  'weapon-evaded': '闪避音',
  'movement-fall': '掉落音',
});

const WEAPON_LABEL: Readonly<Record<string, string>> = Object.freeze({
  'research-line-pressure': '直线压制',
  'research-zone-denial': '封路',
  'research-delayed-heavy': '延迟重击',
  'research-read-punish': '读招反制',
  'research-flank': '绕后',
});

const SEGMENT_LABEL: Readonly<Record<string, string>> = Object.freeze({
  'segment-01-platform': '平台 · 宽面',
  'segment-02-gap': '断层 · 起跳',
  'segment-03-vertical': '垂直 · 恢复',
  'segment-04-maze': '迷宫 · 分叉',
  'segment-05-bhop': '连续跳 · 节奏',
  'segment-06-wire': '走钢丝 · 窄线',
});

const RESPONSE_LABEL: Readonly<Record<string, string>> = Object.freeze({
  hold: '原地承受',
  'step-out': '侧移离开',
  jump: '起跳躲避',
});

const EMPHASIS_LABEL: Readonly<Record<string, string>> = Object.freeze({
  normal: '普通强调',
  strong: '强强调',
  warning: '警告强调',
});

function required<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`武器反馈研究页缺少 ${selector}。`);
  return node;
}

function setText(node: Element, value: string): void {
  node.textContent = value;
}

function probeId(kind: ArenaV2WeaponHitFeedbackKind): string {
  return `weapon-feedback-${kind}`;
}

function kindLabel(kind: ArenaV2WeaponHitFeedbackKind): string {
  return FEEDBACK_OPTION_LABEL[kind];
}

function createDataset(): FeedbackStudyDataset {
  const result = runArenaV2KzLanguageConsequencePrototype();
  const scenarios = FEEDBACK_KINDS.map((kind, sequence) => {
    const probe = result.probes.find(({ feedback }) => feedback.kind === kind);
    if (!probe) throw new Error(`KZ 反馈研究缺少 ${kind} 的真实探针。`);
    const presentation = projectArenaV2WeaponFeedbackPresentationEvent({
      id: `kz-feedback-study:${kind}:${probe.segmentId}:${probe.weaponId}`,
      tick: probe.firstHitTick ?? probe.firstActiveTick ?? 0,
      sequence,
      action: probe.actionDefinitionId,
      targetId: 'language-route-player',
      attackerId: 'language-route-attacker',
      feedback: probe.feedback,
    });
    return Object.freeze({
      id: probeId(kind),
      probe,
      presentation,
      options: FEEDBACK_KINDS,
    });
  });
  return Object.freeze({
    sourceProbeCount: result.probeCount,
    scenarios: Object.freeze(scenarios),
  });
}

function renderCue(
  documentValue: Document,
  scenario: FeedbackStudyScenario,
): HTMLElement {
  const cue = documentValue.createElement('div');
  cue.className = 'feedback-cue';
  cue.dataset.feedbackCue = scenario.presentation.visualCue;
  const mark = documentValue.createElement('span');
  mark.className = 'feedback-cue-mark';
  mark.setAttribute('aria-hidden', 'true');
  const label = documentValue.createElement('strong');
  setText(label, FEEDBACK_CUE_LABEL[scenario.presentation.visualCue] ?? scenario.presentation.visualCue);
  const audio = documentValue.createElement('small');
  setText(
    audio,
    `${AUDIO_CUE_LABEL[scenario.presentation.audioCue] ?? scenario.presentation.audioCue} · ${EMPHASIS_LABEL[scenario.presentation.emphasis] ?? scenario.presentation.emphasis}`,
  );
  cue.append(mark, label, audio);
  return cue;
}

function renderOption(
  documentValue: Document,
  scenario: FeedbackStudyScenario,
  kind: ArenaV2WeaponHitFeedbackKind,
): HTMLLabelElement {
  const label = documentValue.createElement('label');
  label.className = 'feedback-option';
  const input = documentValue.createElement('input');
  input.type = 'radio';
  input.name = `feedback-answer-${scenario.id}`;
  input.value = kind;
  input.required = true;
  const copy = documentValue.createElement('span');
  setText(copy, kindLabel(kind));
  label.append(input, copy);
  return label;
}

function renderScenario(
  documentValue: Document,
  scenario: FeedbackStudyScenario,
  index: number,
): HTMLFieldSetElement {
  const fieldset = documentValue.createElement('fieldset');
  fieldset.className = 'feedback-case';
  fieldset.dataset.feedbackCaseId = scenario.id;
  const legend = documentValue.createElement('legend');
  const indexLabel = documentValue.createElement('span');
  indexLabel.className = 'feedback-case-index';
  setText(indexLabel, `CASE ${String(index + 1).padStart(2, '0')}`);
  const title = documentValue.createElement('strong');
  setText(title, `${WEAPON_LABEL[scenario.probe.weaponId] ?? scenario.probe.weaponId} · ${SEGMENT_LABEL[scenario.probe.segmentId] ?? scenario.probe.segmentId}`);
  legend.append(indexLabel, title);
  fieldset.append(legend);

  const metadata = documentValue.createElement('div');
  metadata.className = 'feedback-case-meta';
  for (const value of [
    `回应：${RESPONSE_LABEL[scenario.probe.responsePolicy] ?? scenario.probe.responsePolicy}`,
    `视觉：${FEEDBACK_CUE_LABEL[scenario.presentation.visualCue] ?? scenario.presentation.visualCue}`,
    `音频：${AUDIO_CUE_LABEL[scenario.presentation.audioCue] ?? scenario.presentation.audioCue}`,
  ]) {
    const item = documentValue.createElement('span');
    setText(item, value);
    metadata.append(item);
  }
  fieldset.append(metadata);

  const cue = renderCue(documentValue, scenario);
  fieldset.append(cue);

  const prompt = documentValue.createElement('p');
  prompt.className = 'feedback-case-prompt';
  setText(prompt, '只根据这次表现信号，玩家下一秒应该知道什么？');
  fieldset.append(prompt);

  const options = documentValue.createElement('div');
  options.className = 'feedback-options';
  for (const kind of scenario.options) options.append(renderOption(documentValue, scenario, kind));
  fieldset.append(options);
  return fieldset;
}

function selectedKind(root: ParentNode, scenario: FeedbackStudyScenario): ArenaV2WeaponHitFeedbackKind | null {
  const value = root.querySelector<HTMLInputElement>(
    `input[name="feedback-answer-${scenario.id}"]:checked`,
  )?.value;
  return value && FEEDBACK_KINDS.includes(value as ArenaV2WeaponHitFeedbackKind)
    ? value as ArenaV2WeaponHitFeedbackKind
    : null;
}

function readAnswers(
  root: ParentNode,
  scenarios: readonly FeedbackStudyScenario[],
): readonly FeedbackStudyAnswer[] {
  return Object.freeze(scenarios.map((scenario) => {
    const selected = selectedKind(root, scenario);
    if (!selected) throw new Error(`请完成 ${scenario.id} 的反馈判断。`);
    return Object.freeze({ scenarioId: scenario.id, selectedKind: selected });
  }));
}

function evaluate(
  answers: readonly FeedbackStudyAnswer[],
  scenarios: readonly FeedbackStudyScenario[],
): readonly FeedbackStudyReportItem[] {
  return Object.freeze(scenarios.map((scenario) => {
    const answer = answers.find(({ scenarioId }) => scenarioId === scenario.id);
    if (!answer) throw new Error(`反馈研究缺少回答 ${scenario.id}。`);
    return Object.freeze({
      scenarioId: scenario.id,
      selectedKind: answer.selectedKind,
      expectedKind: scenario.probe.feedback.kind,
      passed: answer.selectedKind === scenario.probe.feedback.kind,
    });
  }));
}

function renderReport(
  documentValue: Document,
  report: readonly FeedbackStudyReportItem[],
  scenarios: readonly FeedbackStudyScenario[],
): void {
  const root = required<HTMLElement>(documentValue, '#feedback-study-result');
  const summary = required<HTMLElement>(root, '#feedback-result-summary');
  const list = required<HTMLOListElement>(root, '#feedback-result-list');
  const passed = report.filter(({ passed: value }) => value).length;
  root.hidden = false;
  setText(summary, `${passed} / ${report.length} 类因果反馈判断正确；这只是研究任务结果，不代表真人解释率。`);
  list.replaceChildren();
  for (const item of report) {
    const scenario = scenarios.find(({ id }) => id === item.scenarioId);
    if (!scenario) throw new Error(`反馈研究缺少结果场景 ${item.scenarioId}。`);
    const node = documentValue.createElement('li');
    node.className = item.passed ? 'is-pass' : 'is-fail';
    setText(
      node,
      `${WEAPON_LABEL[scenario.probe.weaponId] ?? scenario.probe.weaponId}：${item.passed ? '判断正确' : '判断需要复习'}。${scenario.presentation.title}：${scenario.presentation.explanation}`,
    );
    list.append(node);
  }
}

function downloadReport(
  documentValue: FeedbackStudyDocument,
  state: FeedbackStudyState,
  scenarios: readonly FeedbackStudyScenario[],
): void {
  if (!state.answers || !state.report) throw new Error('请先提交反馈判断。');
  const view = documentValue.defaultView;
  if (!view || typeof view.Blob !== 'function' || !view.URL?.createObjectURL) {
    throw new Error('当前研究环境不支持结果下载。');
  }
  const payload = JSON.stringify({
    schemaVersion: 1,
    source: 'arena-v2-kz-language-consequence-prototype',
    scenarioCount: scenarios.length,
    answers: state.answers,
    report: state.report,
  }, null, 2);
  const blob = new view.Blob([payload], { type: 'application/json;charset=utf-8' });
  const url = view.URL.createObjectURL(blob);
  const anchor = documentValue.createElement('a');
  anchor.href = url;
  anchor.download = 'arena-weapon-feedback-study.json';
  anchor.click();
  view.URL.revokeObjectURL(url);
}

function start(): void {
  const documentValue = globalThis.document as FeedbackStudyDocument;
  const root = required<HTMLElement>(documentValue, '#weapon-feedback-study');
  const form = required<HTMLFormElement>(root, '#feedback-task-form');
  const exportButton = required<HTMLButtonElement>(root, '#feedback-export');
  const error = required<HTMLElement>(root, '#feedback-error');
  const dataset = createDataset();
  const scenarios = dataset.scenarios;
  const sourceProbeCount = dataset.sourceProbeCount;
  setText(required<HTMLElement>(root, '#feedback-scenario-count'), `${scenarios.length} 类`);
  setText(required<HTMLElement>(root, '#feedback-source-count'), `${sourceProbeCount} 个真实探针`);
  setText(required<HTMLElement>(root, '#feedback-status'), '可开始');
  form.replaceChildren(...scenarios.map((scenario, index) => renderScenario(documentValue, scenario, index)));

  let state: FeedbackStudyState = Object.freeze({ answers: null, report: null });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    error.hidden = true;
    try {
      const answers = readAnswers(form, scenarios);
      const report = evaluate(answers, scenarios);
      state = Object.freeze({ answers, report });
      renderReport(documentValue, report, scenarios);
      exportButton.disabled = false;
      setText(required<HTMLElement>(root, '#feedback-status'), '已评估（非真人结论）');
    } catch (caught) {
      setText(error, caught instanceof Error ? caught.message : String(caught));
      error.hidden = false;
    }
  });
  exportButton.addEventListener('click', () => {
    error.hidden = true;
    try {
      downloadReport(documentValue, state, scenarios);
    } catch (caught) {
      setText(error, caught instanceof Error ? caught.message : String(caught));
      error.hidden = false;
    }
  });
}

if (typeof document !== 'undefined') start();
