import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';

type StudyAction = () => unknown;

interface StudyActions {
  readonly enroll: StudyAction;
  readonly start: StudyAction;
  readonly invalidateEnrolled: StudyAction;
  readonly abandon: StudyAction;
  readonly exportPackage: StudyAction;
  readonly confirmExport: StudyAction;
  readonly fileLost: StudyAction;
  readonly exportWorkspace: StudyAction;
}

interface StudyEnvironmentModel {
  readonly platform: string;
  readonly formFactor: string;
  readonly orientation: string;
  readonly inputMode: string;
}

interface StudyWorkbenchModel {
  readonly phase: string;
  readonly terminalStatus: string | null;
  readonly statusText: string;
  readonly participantId: string | null;
  readonly completedMatchCount: number;
  readonly totalMatchCount: number;
  readonly receiptCount: number;
  readonly packageReceipt: Readonly<{ fileName: string; sha256: string }> | null;
  readonly environment: StudyEnvironmentModel;
  readonly buildId: string | null;
  readonly collectable: boolean;
  readonly canEnroll: boolean;
  readonly canStart: boolean;
  readonly error: string | null;
}

interface StudyNodes {
  readonly operatorShell: HTMLElement;
  readonly participantShell: HTMLElement;
  readonly runningBar: HTMLElement;
  readonly phase: HTMLElement;
  readonly status: HTMLElement;
  readonly build: HTMLElement;
  readonly environment: HTMLElement;
  readonly progress: HTMLElement;
  readonly count: HTMLElement;
  readonly participant: HTMLElement;
  readonly error: HTMLElement;
  readonly enrollment: HTMLElement;
  readonly enrolled: HTMLElement;
  readonly review: HTMLElement;
  readonly exportPending: HTMLElement;
  readonly operatorId: HTMLInputElement;
  readonly consent: HTMLInputElement;
  readonly priorArena: HTMLInputElement;
  readonly priorStudy: HTMLInputElement;
  readonly briefingDeviation: HTMLInputElement;
  readonly operatorAssistance: HTMLInputElement;
  readonly exportWorkspaceButton: HTMLButtonElement;
  readonly enrollButton: HTMLButtonElement;
  readonly startButton: HTMLButtonElement;
  readonly invalidateButton: HTMLButtonElement;
  readonly abandonButton: HTMLButtonElement;
  readonly exportButton: HTMLButtonElement;
  readonly confirmButton: HTMLButtonElement;
  readonly lostButton: HTMLButtonElement;
  readonly reviewQuestions: HTMLElement;
  readonly fairness: HTMLSelectElement;
  readonly naturalness: HTMLSelectElement;
  readonly wouldRematch: HTMLInputElement;
  readonly packageName: HTMLElement;
  readonly packageHash: HTMLElement;
}

const ACTION_KEYS = new Set<keyof StudyActions>([
  'enroll', 'start', 'invalidateEnrolled', 'abandon',
  'exportPackage', 'confirmExport', 'fileLost', 'exportWorkspace',
]);
const MODEL_KEYS = new Set([
  'phase', 'terminalStatus', 'statusText', 'participantId',
  'completedMatchCount', 'totalMatchCount', 'receiptCount', 'packageReceipt',
  'environment', 'buildId', 'collectable', 'canEnroll', 'canStart', 'error',
]);
const ENVIRONMENT_KEYS = new Set(['platform', 'formFactor', 'orientation', 'inputMode']);
const OPPONENT_GUESSES = new Set(['human', 'bot', 'unsure']);

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`真人研究工作台缺少 ${selector}。`);
  return element;
}

function checkedValue(root: ParentNode, name: string): string | null {
  return root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? null;
}

function numberValue(element: HTMLInputElement | HTMLSelectElement, name: string): number {
  const value = Number(element.value);
  if (!Number.isSafeInteger(value) || value < 1 || value > 5) {
    throw new TypeError(`${name} 必须是 1～5 的整数。`);
  }
  return value;
}

function setText(element: Element, value: unknown): void {
  element.textContent = value === null || value === undefined ? '' : String(value);
}

function setHidden(element: HTMLElement, hidden: unknown): void {
  element.hidden = Boolean(hidden);
}

function ownActions(value: unknown): StudyActions {
  const record = assertPlainRecord(value, '真人研究工作台 actions');
  assertKnownKeys(record, ACTION_KEYS, '真人研究工作台 actions');
  const result: Partial<Record<keyof StudyActions, StudyAction>> = {};
  for (const key of ACTION_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`真人研究工作台 actions.${key} 必须是数据字段。`);
    }
    if (typeof descriptor.value !== 'function') {
      throw new TypeError(`真人研究工作台 actions.${key} 必须是函数。`);
    }
    result[key] = descriptor.value as StudyAction;
  }
  return Object.freeze(result as unknown as StudyActions);
}

function finiteCount(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value as number;
}

function nullableString(value: unknown, name: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new TypeError(`${name} 必须是字符串或 null。`);
  return value;
}

function studyModel(value: unknown): StudyWorkbenchModel {
  const source = cloneFrozenData(value, '真人研究工作台 model');
  assertKnownKeys(source, MODEL_KEYS, '真人研究工作台 model');
  const environment = assertPlainRecord(source.environment, '真人研究工作台 environment');
  assertKnownKeys(environment, ENVIRONMENT_KEYS, '真人研究工作台 environment');
  for (const key of ENVIRONMENT_KEYS) {
    if (typeof environment[key] !== 'string' || environment[key].length === 0) {
      throw new TypeError(`真人研究工作台 environment.${key} 必须是非空字符串。`);
    }
  }
  let packageReceipt: Readonly<{ fileName: string; sha256: string }> | null = null;
  if (source.packageReceipt !== null) {
    const receipt = assertPlainRecord(source.packageReceipt, '真人研究工作台 packageReceipt');
    if (typeof receipt.fileName !== 'string' || typeof receipt.sha256 !== 'string') {
      throw new TypeError('真人研究工作台 packageReceipt 无效。');
    }
    packageReceipt = Object.freeze({ fileName: receipt.fileName, sha256: receipt.sha256 });
  }
  if (typeof source.phase !== 'string' || typeof source.statusText !== 'string') {
    throw new TypeError('真人研究工作台 phase/statusText 无效。');
  }
  for (const key of ['collectable', 'canEnroll', 'canStart'] as const) {
    if (typeof source[key] !== 'boolean') throw new TypeError(`真人研究工作台 ${key} 无效。`);
  }
  return Object.freeze({
    phase: source.phase,
    terminalStatus: nullableString(source.terminalStatus, '真人研究工作台 terminalStatus'),
    statusText: source.statusText,
    participantId: nullableString(source.participantId, '真人研究工作台 participantId'),
    completedMatchCount: finiteCount(source.completedMatchCount, 'completedMatchCount'),
    totalMatchCount: finiteCount(source.totalMatchCount, 'totalMatchCount'),
    receiptCount: finiteCount(source.receiptCount, 'receiptCount'),
    packageReceipt,
    environment: Object.freeze({
      platform: environment.platform as string,
      formFactor: environment.formFactor as string,
      orientation: environment.orientation as string,
      inputMode: environment.inputMode as string,
    }),
    buildId: nullableString(source.buildId, '真人研究工作台 buildId'),
    collectable: source.collectable as boolean,
    canEnroll: source.canEnroll as boolean,
    canStart: source.canStart as boolean,
    error: nullableString(source.error, '真人研究工作台 error'),
  });
}

export class HumanMatchStudyWorkbenchView {
  #root: HTMLElement | null;
  #nodes: StudyNodes | null;
  readonly #cleanups: Array<() => void>;
  #bound: boolean;
  #busy: boolean;
  #destroying: boolean;
  #lastError: string | null;
  #lastModel: StudyWorkbenchModel | null;

  constructor(optionsValue: unknown) {
    const options = assertPlainRecord(optionsValue, 'HumanMatchStudyWorkbenchView options');
    assertKnownKeys(options, new Set(['root']), 'HumanMatchStudyWorkbenchView options');
    const root = options.root;
    if (!root || typeof root !== 'object' || typeof (root as HTMLElement).querySelector !== 'function') {
      throw new TypeError('HumanMatchStudyWorkbenchView.root 必须是 DOM Element。');
    }
    const rootElement = root as HTMLElement;
    this.#root = rootElement;
    this.#nodes = Object.freeze({
      operatorShell: required<HTMLElement>(rootElement, '#study-operator-shell'),
      participantShell: required<HTMLElement>(rootElement, '#study-participant-shell'),
      runningBar: required<HTMLElement>(rootElement, '#study-running-bar'),
      phase: required<HTMLElement>(rootElement, '#study-phase'),
      status: required<HTMLElement>(rootElement, '#study-status'),
      build: required<HTMLElement>(rootElement, '#study-build'),
      environment: required<HTMLElement>(rootElement, '#study-environment'),
      progress: required<HTMLElement>(rootElement, '#study-progress'),
      count: required<HTMLElement>(rootElement, '#study-record-count'),
      participant: required<HTMLElement>(rootElement, '#study-participant-id'),
      error: required<HTMLElement>(rootElement, '#study-error'),
      enrollment: required<HTMLElement>(rootElement, '#study-enrollment'),
      enrolled: required<HTMLElement>(rootElement, '#study-enrolled'),
      review: required<HTMLElement>(rootElement, '#study-review'),
      exportPending: required<HTMLElement>(rootElement, '#study-export-pending'),
      operatorId: required<HTMLInputElement>(rootElement, '#study-operator-id'),
      consent: required<HTMLInputElement>(rootElement, '#study-consent'),
      priorArena: required<HTMLInputElement>(rootElement, '#study-prior-arena'),
      priorStudy: required<HTMLInputElement>(rootElement, '#study-prior-study'),
      briefingDeviation: required<HTMLInputElement>(rootElement, '#study-briefing-deviation'),
      operatorAssistance: required<HTMLInputElement>(rootElement, '#study-operator-assistance'),
      exportWorkspaceButton: required<HTMLButtonElement>(rootElement, '#study-export-workspace'),
      enrollButton: required<HTMLButtonElement>(rootElement, '#study-enroll'),
      startButton: required<HTMLButtonElement>(rootElement, '#study-start'),
      invalidateButton: required<HTMLButtonElement>(rootElement, '#study-invalidate-enrolled'),
      abandonButton: required<HTMLButtonElement>(rootElement, '#study-abandon'),
      exportButton: required<HTMLButtonElement>(rootElement, '#study-export'),
      confirmButton: required<HTMLButtonElement>(rootElement, '#study-confirm'),
      lostButton: required<HTMLButtonElement>(rootElement, '#study-file-lost'),
      reviewQuestions: required<HTMLElement>(rootElement, '#study-review-questions'),
      fairness: required<HTMLSelectElement>(rootElement, '#study-fairness'),
      naturalness: required<HTMLSelectElement>(rootElement, '#study-naturalness'),
      wouldRematch: required<HTMLInputElement>(rootElement, '#study-would-rematch'),
      packageName: required<HTMLElement>(rootElement, '#study-package-name'),
      packageHash: required<HTMLElement>(rootElement, '#study-package-hash'),
    });
    this.#cleanups = [];
    this.#bound = false;
    this.#busy = false;
    this.#destroying = false;
    this.#lastError = null;
    this.#lastModel = null;
    Object.freeze(this);
  }

  #listen(element: Element, eventName: string, callback: EventListener): void {
    try {
      element.addEventListener(eventName, callback);
    } catch (error) {
      try {
        element.removeEventListener(eventName, callback);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          `真人研究工作台监听 ${eventName} 注册与回滚均失败。`,
        );
      }
      throw error;
    }
    let active = true;
    this.#cleanups.push(() => {
      if (!active) return;
      element.removeEventListener(eventName, callback);
      active = false;
    });
  }

  bind(actionsValue: unknown): void {
    if (this.#bound) throw new Error('真人研究工作台 actions 已绑定。');
    if (this.#destroying || this.#cleanups.length > 0) {
      throw new Error('真人研究工作台存在未完成清理，不能重新绑定。');
    }
    const actions = ownActions(actionsValue);
    const invoke = (action: StudyAction): EventListener => async (event) => {
      event.preventDefault();
      if (this.#busy || this.#destroying) return;
      this.#busy = true;
      this.#lastError = null;
      this.#setButtonsDisabled(true);
      try {
        await action();
      } catch (error) {
        this.#lastError = normalizeThrownError(error, '真人研究工作台 action 失败').message;
      } finally {
        this.#busy = false;
        if (this.#nodes === null || this.#destroying) return;
        if (this.#lastModel !== null) this.render(this.#lastModel);
      }
    };
    const nodes = this.#nodes;
    if (!nodes) throw new Error('真人研究工作台已销毁。');
    try {
      this.#listen(nodes.enrollButton, 'click', invoke(actions.enroll));
      this.#listen(nodes.startButton, 'click', invoke(actions.start));
      this.#listen(nodes.invalidateButton, 'click', invoke(actions.invalidateEnrolled));
      this.#listen(nodes.abandonButton, 'click', invoke(actions.abandon));
      this.#listen(nodes.exportButton, 'click', invoke(actions.exportPackage));
      this.#listen(nodes.confirmButton, 'click', invoke(actions.confirmExport));
      this.#listen(nodes.lostButton, 'click', invoke(actions.fileLost));
      this.#listen(nodes.exportWorkspaceButton, 'click', invoke(actions.exportWorkspace));
      this.#bound = true;
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      for (let index = this.#cleanups.length - 1; index >= 0; index -= 1) {
        const cleanup = this.#cleanups[index];
        if (!cleanup) continue;
        try {
          cleanup();
          this.#cleanups.splice(index, 1);
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          '真人研究工作台 actions 绑定失败且回滚未完整完成。',
        );
      }
      throw error;
    }
  }

  #setButtonsDisabled(value: boolean): void {
    if (this.#nodes === null) return;
    for (const button of [
      this.#nodes.enrollButton,
      this.#nodes.startButton,
      this.#nodes.invalidateButton,
      this.#nodes.abandonButton,
      this.#nodes.exportButton,
      this.#nodes.confirmButton,
      this.#nodes.lostButton,
      this.#nodes.exportWorkspaceButton,
    ]) button.disabled = Boolean(value);
  }

  getEnrollment() {
    if (this.#destroying) throw new Error('真人研究工作台正在销毁。');
    const nodes = this.#nodes;
    if (!nodes) throw new Error('真人研究工作台已销毁。');
    const operatorId = nodes.operatorId.value.trim();
    if (operatorId.length === 0) throw new Error('请输入去标识操作员编号。');
    if (operatorId.length > 128) throw new Error('操作员编号不能超过 128 字符。');
    return Object.freeze({
      operatorId,
      eligibility: Object.freeze({
        consentConfirmed: nodes.consent.checked,
        priorArenaExperience: nodes.priorArena.checked,
        priorStudyExposure: nodes.priorStudy.checked,
        briefingDeviation: nodes.briefingDeviation.checked,
        operatorAssistance: nodes.operatorAssistance.checked,
      }),
    });
  }

  getSelfReport() {
    if (this.#destroying) throw new Error('真人研究工作台正在销毁。');
    const root = this.#root;
    const nodes = this.#nodes;
    if (!root || !nodes) throw new Error('真人研究工作台已销毁。');
    const opponentTypeGuess = checkedValue(root, 'study-opponent-guess');
    if (opponentTypeGuess === null || !OPPONENT_GUESSES.has(opponentTypeGuess)) {
      throw new Error('请选择有效的对手类型判断。');
    }
    return Object.freeze({
      opponentTypeGuess,
      fairnessRating: numberValue(nodes.fairness, '公平感评分'),
      naturalnessRating: numberValue(nodes.naturalness, '自然度评分'),
      wouldRematch: nodes.wouldRematch.checked,
    });
  }

  resetEnrollment(): void {
    if (this.#destroying) throw new Error('真人研究工作台正在销毁。');
    const root = this.#root;
    const nodes = this.#nodes;
    if (!root || !nodes) throw new Error('真人研究工作台已销毁。');
    nodes.consent.checked = false;
    nodes.priorArena.checked = false;
    nodes.priorStudy.checked = false;
    nodes.briefingDeviation.checked = false;
    nodes.operatorAssistance.checked = false;
    for (const element of root.querySelectorAll<HTMLInputElement>(
      'input[name="study-opponent-guess"]',
    )) element.checked = false;
    nodes.fairness.value = '3';
    nodes.naturalness.value = '3';
    nodes.wouldRematch.checked = false;
  }

  showFatalError(message: unknown): void {
    if (this.#nodes === null || this.#destroying) return;
    const root = this.#root;
    if (!root) return;
    this.#lastError = String(message);
    root.dataset.studyMode = 'operator';
    setHidden(this.#nodes.participantShell, true);
    setHidden(this.#nodes.operatorShell, false);
    setHidden(this.#nodes.runningBar, true);
    setText(this.#nodes.error, this.#lastError);
    setHidden(this.#nodes.error, false);
    this.#setButtonsDisabled(true);
  }

  render(modelValue: unknown): void {
    if (this.#destroying) throw new Error('真人研究工作台正在销毁。');
    const root = this.#root;
    const nodes = this.#nodes;
    if (!root || !nodes) throw new Error('真人研究工作台已销毁。');
    const model = studyModel(modelValue);
    this.#lastModel = model;
    const phase = model.phase;
    root.dataset.studyMode = phase === 'running' ? 'participant' : 'operator';
    setHidden(nodes.participantShell, phase !== 'running');
    setHidden(nodes.operatorShell, phase === 'running');
    setHidden(nodes.runningBar, phase !== 'running');
    setHidden(nodes.enrollment, phase !== 'idle');
    setHidden(nodes.enrolled, phase !== 'enrolled');
    const reviewing = phase === 'reviewing' || phase === 'recovery-required';
    setHidden(nodes.review, !reviewing);
    setHidden(nodes.exportPending, phase !== 'export-pending');
    setHidden(
      nodes.reviewQuestions,
      !(phase === 'reviewing' && model.terminalStatus === 'completed'),
    );
    setText(nodes.phase, phase.toUpperCase());
    setText(nodes.status, model.statusText);
    setText(
      nodes.build,
      model.buildId === null
        ? '未绑定正式构建'
        : `${model.buildId}${model.collectable ? ' · CLEAN' : ' · BLOCKED'}`,
    );
    setText(
      nodes.environment,
      `${model.environment.platform} / ${model.environment.formFactor} / `
      + `${model.environment.orientation} / ${model.environment.inputMode}`,
    );
    setText(
      nodes.progress,
      `${model.completedMatchCount} / ${model.totalMatchCount}`,
    );
    setText(nodes.count, String(model.receiptCount));
    setText(nodes.participant, model.participantId ?? '尚未入组');
    setText(nodes.packageName, model.packageReceipt?.fileName ?? '—');
    setText(nodes.packageHash, model.packageReceipt?.sha256 ?? '—');
    nodes.enrollButton.disabled = this.#busy || !model.canEnroll;
    nodes.startButton.disabled = this.#busy || !model.canStart;
    nodes.invalidateButton.disabled = this.#busy || phase !== 'enrolled';
    nodes.abandonButton.disabled = this.#busy || phase !== 'running';
    nodes.exportButton.disabled = this.#busy || !reviewing;
    nodes.confirmButton.disabled = this.#busy || phase !== 'export-pending';
    nodes.lostButton.disabled = this.#busy || phase !== 'export-pending';
    nodes.exportWorkspaceButton.disabled = this.#busy;
    setHidden(nodes.error, model.error === null && this.#lastError === null);
    setText(nodes.error, model.error ?? this.#lastError ?? '');
  }

  destroy(): void {
    if (this.#root === null && this.#nodes === null) return;
    this.#destroying = true;
    const errors: unknown[] = [];
    for (let index = this.#cleanups.length - 1; index >= 0; index -= 1) {
      const cleanup = this.#cleanups[index];
      if (!cleanup) continue;
      try {
        cleanup();
        this.#cleanups.splice(index, 1);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, '真人研究工作台清理未完整完成。');
    }
    this.#nodes = null;
    this.#root = null;
    this.#lastModel = null;
    this.#bound = false;
  }
}
