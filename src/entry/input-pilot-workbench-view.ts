import {
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_CONTROLLER_STATE,
} from '@number-strategy-jump/arena-input-pilot';
import {
  assertKnownKeys,
  assertPlainRecord,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';

const COUNTERS = Object.freeze([
  ['intentMismatchCount', '意图不匹配'],
  ['accidentalInputCount', '误触'],
  ['repeatedInputCount', '重复输入'],
  ['abandonedInputCount', '放弃输入'],
  ['correctionCount', '修正次数'],
] as const);

const COMPREHENSION = Object.freeze([
  ['groundAction', '地面动作'],
  ['airAction', '空中动作'],
  ['equipmentAction', '装备动作'],
] as const);

const COMPREHENSION_OPTIONS = Object.freeze([
  [INPUT_PILOT_COMPREHENSION.CORRECT, '正确'],
  [INPUT_PILOT_COMPREHENSION.PARTIAL, '部分'],
  [INPUT_PILOT_COMPREHENSION.INCORRECT, '错误'],
  [INPUT_PILOT_COMPREHENSION.NOT_ANSWERED, '未回答'],
] as const);

const ENVIRONMENT_LABELS = Object.freeze({
  web: 'Web',
  phone: '手机',
  tablet: '平板',
  desktop: '桌面',
  portrait: '竖屏',
  landscape: '横屏',
  touch: '触控',
  mouse: '鼠标',
});

type CounterKey = typeof COUNTERS[number][0];
type ComprehensionKey = typeof COMPREHENSION[number][0];
type EligibilityKey = 'priorArenaExperience' | 'priorOtherVariantExposure';
type ReadinessKey = 'taskOnly' | 'noControlHint' | 'consent';

interface PilotEnvironment {
  readonly platform: string;
  readonly formFactor: string;
  readonly orientation: string;
  readonly inputMode: string;
}

interface PilotFormSnapshot {
  readonly observer: Readonly<Record<CounterKey, number>> & Readonly<{
    oneHandCompleted: boolean;
    objectiveCompleted: boolean;
  }>;
  readonly selfReport: Readonly<Record<ComprehensionKey, string>>;
}

interface PilotReview extends PilotFormSnapshot {
  readonly invalidate: boolean;
}

interface PilotFormModelPort {
  readonly adjustCounter: (key: string, delta: number) => unknown;
  readonly setCompletion: (key: string, value: boolean) => unknown;
  readonly setComprehension: (key: string, value: string) => unknown;
  readonly getSnapshot: () => unknown;
  readonly restore: (value: unknown) => unknown;
  readonly reset: () => unknown;
}

interface PilotEvidence {
  readonly collectable: boolean;
  readonly reason: string | null;
  readonly buildId: string | null;
}

interface PilotActiveTrial {
  readonly trialId: string;
  readonly reviewDraft: unknown | null;
  readonly assignment: Readonly<{ participantId: string }>;
}

interface PilotSnapshot {
  readonly state: string;
  readonly workspace: Readonly<{
    enrollment: Readonly<{ revision: number }>;
    activeTrial: PilotActiveTrial | null;
  }> | null;
  readonly lastRecord: Readonly<{ terminationReason: string }> | null;
  readonly lastError: Readonly<{ message: string }> | null;
  readonly evidence: PilotEvidence;
}

interface PilotActions {
  readonly getSnapshot: () => unknown;
  readonly enroll: () => unknown;
  readonly start: () => unknown;
  readonly abandon: () => unknown;
  readonly saveDraft: (value: unknown) => unknown;
  readonly submit: () => unknown;
  readonly exportAggregate: () => unknown;
  readonly exportAudit: () => unknown;
  readonly exportEvidence: () => unknown;
}

const ACTION_KEYS = new Set<keyof PilotActions>([
  'getSnapshot', 'enroll', 'start', 'abandon', 'saveDraft', 'submit',
  'exportAggregate', 'exportAudit', 'exportEvidence',
]);
type InvokableAction = Exclude<keyof PilotActions, 'getSnapshot' | 'saveDraft'>;
const INVOKABLE_ACTION_KEYS = new Set<InvokableAction>([
  'enroll', 'start', 'abandon', 'submit', 'exportAggregate', 'exportAudit', 'exportEvidence',
]);
const SNAPSHOT_KEYS = new Set(['state', 'workspace', 'lastRecord', 'lastError', 'evidence']);
const ENVIRONMENT_KEYS = new Set(['platform', 'formFactor', 'orientation', 'inputMode']);
const EVIDENCE_KEYS = new Set(['collectable', 'reason', 'commit', 'buildId', 'buildManifestHash']);
const WORKSPACE_KEYS = new Set([
  'schemaVersion', 'definitionId', 'definitionHash', 'revision',
  'enrollment', 'activeTrial', 'records',
]);
const ENROLLMENT_KEYS = new Set([
  'schemaVersion', 'definitionId', 'definitionHash', 'revision', 'assignments',
]);
const ACTIVE_TRIAL_KEYS = new Set([
  'schemaVersion', 'trialId', 'assignment', 'phase', 'terminationReason',
  'device', 'eligibility', 'automated', 'reviewDraft',
]);
const ASSIGNMENT_KEYS = new Set([
  'schemaVersion', 'definitionId', 'definitionHash', 'assignmentId',
  'assignmentSeed', 'matchSeed', 'participantId', 'enrollmentIndex',
  'variantId', 'mapperId',
]);
const LAST_RECORD_KEYS = new Set(['terminationReason']);
const LAST_ERROR_KEYS = new Set(['message']);
const REVIEW_KEYS = new Set(['observer', 'selfReport', 'invalidate']);
const OBSERVER_KEYS = new Set([
  ...COUNTERS.map(([key]) => key), 'oneHandCompleted', 'objectiveCompleted',
]);
const SELF_REPORT_KEYS = new Set(COMPREHENSION.map(([key]) => key));

type UnknownMethod = (...args: unknown[]) => unknown;

function descriptorMethod(value: unknown, key: string, name: string): UnknownMethod {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const visited = new Set<object>();
  let current: object | null = value;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as UnknownMethod;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${name}.${key} 缺失。`);
}

function formPort(value: unknown): PilotFormModelPort {
  return Object.freeze({
    adjustCounter: descriptorMethod(value, 'adjustCounter', 'Input Pilot formModel'),
    setCompletion: descriptorMethod(value, 'setCompletion', 'Input Pilot formModel'),
    setComprehension: descriptorMethod(value, 'setComprehension', 'Input Pilot formModel'),
    getSnapshot: descriptorMethod(value, 'getSnapshot', 'Input Pilot formModel'),
    restore: descriptorMethod(value, 'restore', 'Input Pilot formModel'),
    reset: descriptorMethod(value, 'reset', 'Input Pilot formModel'),
  });
}

function ownDataField(value: unknown, key: string, name: string): unknown {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function environmentValue(value: unknown, name: string): PilotEnvironment {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, ENVIRONMENT_KEYS, name);
  const result: Record<string, string> = {};
  for (const key of ENVIRONMENT_KEYS) {
    if (typeof record[key] !== 'string' || record[key].length === 0) {
      throw new TypeError(`${name}.${key} 必须是非空字符串。`);
    }
    result[key] = record[key] as string;
  }
  return Object.freeze(result as unknown as PilotEnvironment);
}

function formSnapshot(value: unknown): PilotFormSnapshot {
  const record = assertPlainRecord(value, 'Input Pilot form snapshot');
  assertKnownKeys(record, new Set(['observer', 'selfReport']), 'Input Pilot form snapshot');
  const observer = assertPlainRecord(record.observer, 'Input Pilot observer');
  assertKnownKeys(observer, OBSERVER_KEYS, 'Input Pilot observer');
  const normalizedObserver: Record<string, number | boolean> = {};
  for (const [key] of COUNTERS) {
    const count = observer[key];
    if (!Number.isSafeInteger(count) || (count as number) < 0 || (count as number) > 999) {
      throw new RangeError(`Input Pilot observer.${key} 必须是 0～999。`);
    }
    normalizedObserver[key] = count as number;
  }
  for (const key of ['oneHandCompleted', 'objectiveCompleted'] as const) {
    if (typeof observer[key] !== 'boolean') throw new TypeError(`Input Pilot observer.${key} 无效。`);
    normalizedObserver[key] = observer[key] as boolean;
  }
  const selfReport = assertPlainRecord(record.selfReport, 'Input Pilot selfReport');
  assertKnownKeys(selfReport, SELF_REPORT_KEYS, 'Input Pilot selfReport');
  const normalizedReport: Record<string, string> = {};
  const knownComprehension = new Set<string>(Object.values(INPUT_PILOT_COMPREHENSION));
  for (const [key] of COMPREHENSION) {
    if (typeof selfReport[key] !== 'string' || !knownComprehension.has(selfReport[key] as string)) {
      throw new RangeError(`Input Pilot selfReport.${key} 无效。`);
    }
    normalizedReport[key] = selfReport[key] as string;
  }
  return Object.freeze({
    observer: Object.freeze(normalizedObserver) as PilotFormSnapshot['observer'],
    selfReport: Object.freeze(normalizedReport) as PilotFormSnapshot['selfReport'],
  });
}

function pilotActions(value: unknown): PilotActions {
  const record = assertPlainRecord(value, 'Input Pilot Workbench actions');
  assertKnownKeys(record, ACTION_KEYS, 'Input Pilot Workbench actions');
  const result: Partial<Record<keyof PilotActions, UnknownMethod>> = {};
  for (const key of ACTION_KEYS) result[key] = descriptorMethod(record, key, 'Input Pilot Workbench actions');
  return Object.freeze(result as unknown as PilotActions);
}

function nullableString(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new TypeError(`${name} 必须是字符串或 null。`);
  return value;
}

function pilotSnapshot(value: unknown): PilotSnapshot {
  const source = assertPlainRecord(value, 'Input Pilot Workbench snapshot');
  assertKnownKeys(source, SNAPSHOT_KEYS, 'Input Pilot Workbench snapshot');
  if (typeof source.state !== 'string') throw new TypeError('Input Pilot snapshot.state 无效。');
  const evidenceSource = assertPlainRecord(source.evidence, 'Input Pilot snapshot.evidence');
  assertKnownKeys(evidenceSource, EVIDENCE_KEYS, 'Input Pilot snapshot.evidence');
  if (typeof evidenceSource.collectable !== 'boolean') {
    throw new TypeError('Input Pilot snapshot.evidence.collectable 无效。');
  }
  nullableString(evidenceSource.commit, 'Input Pilot evidence.commit');
  nullableString(evidenceSource.buildManifestHash, 'Input Pilot evidence.buildManifestHash');
  const evidence = Object.freeze({
    collectable: evidenceSource.collectable,
    reason: nullableString(evidenceSource.reason, 'Input Pilot evidence.reason'),
    buildId: nullableString(evidenceSource.buildId, 'Input Pilot evidence.buildId'),
  });
  let workspace: PilotSnapshot['workspace'] = null;
  if (source.workspace !== null) {
    const workspaceSource = assertPlainRecord(source.workspace, 'Input Pilot workspace');
    assertKnownKeys(workspaceSource, WORKSPACE_KEYS, 'Input Pilot workspace');
    const enrollment = assertPlainRecord(workspaceSource.enrollment, 'Input Pilot enrollment');
    assertKnownKeys(enrollment, ENROLLMENT_KEYS, 'Input Pilot enrollment');
    if (!Number.isSafeInteger(enrollment.revision) || (enrollment.revision as number) < 0) {
      throw new RangeError('Input Pilot enrollment.revision 无效。');
    }
    let activeTrial: PilotActiveTrial | null = null;
    if (workspaceSource.activeTrial !== null) {
      const trial = assertPlainRecord(workspaceSource.activeTrial, 'Input Pilot activeTrial');
      assertKnownKeys(trial, ACTIVE_TRIAL_KEYS, 'Input Pilot activeTrial');
      const assignment = assertPlainRecord(trial.assignment, 'Input Pilot activeTrial.assignment');
      assertKnownKeys(assignment, ASSIGNMENT_KEYS, 'Input Pilot activeTrial.assignment');
      if (typeof trial.trialId !== 'string' || typeof assignment.participantId !== 'string') {
        throw new TypeError('Input Pilot activeTrial identity 无效。');
      }
      activeTrial = Object.freeze({
        trialId: trial.trialId,
        reviewDraft: trial.reviewDraft ?? null,
        assignment: Object.freeze({ participantId: assignment.participantId }),
      });
    }
    workspace = Object.freeze({
      enrollment: Object.freeze({ revision: enrollment.revision as number }),
      activeTrial,
    });
  }
  const lastRecordSource = source.lastRecord === null
    ? null
    : assertPlainRecord(source.lastRecord, 'Input Pilot lastRecord');
  const lastErrorSource = source.lastError === null
    ? null
    : assertPlainRecord(source.lastError, 'Input Pilot lastError');
  if (lastRecordSource !== null) {
    assertKnownKeys(lastRecordSource, LAST_RECORD_KEYS, 'Input Pilot lastRecord');
  }
  if (lastErrorSource !== null) {
    assertKnownKeys(lastErrorSource, LAST_ERROR_KEYS, 'Input Pilot lastError');
  }
  return Object.freeze({
    state: source.state,
    workspace,
    lastRecord: lastRecordSource === null ? null : Object.freeze({
      terminationReason: nullableString(lastRecordSource.terminationReason, 'lastRecord.terminationReason') ?? '',
    }),
    lastError: lastErrorSource === null ? null : Object.freeze({
      message: nullableString(lastErrorSource.message, 'lastError.message') ?? '未知错误',
    }),
    evidence,
  });
}

function pilotReview(value: unknown): PilotReview {
  const record = assertPlainRecord(value, 'Input Pilot review draft');
  assertKnownKeys(record, REVIEW_KEYS, 'Input Pilot review draft');
  if (typeof record.invalidate !== 'boolean') {
    throw new TypeError('Input Pilot review draft.invalidate 必须是布尔值。');
  }
  return Object.freeze({
    ...formSnapshot({ observer: record.observer, selfReport: record.selfReport }),
    invalidate: record.invalidate,
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stateStep(state: string): number {
  if (state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED) return 1;
  if (
    state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING
    || state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING
  ) return 2;
  if (state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING) return 3;
  if (state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL) return 4;
  return 1;
}

function stateLabel(state: string): string {
  const labels: Readonly<Record<string, string>> = Object.freeze({
    created: '初始化',
    idle: '待入组',
    enrolled: '待开始',
    starting: '载入中',
    running: '进行中',
    reviewing: '待复核',
    terminal: '已提交',
    failed: '已停止',
    destroyed: '已关闭',
  });
  return labels[state] ?? state;
}

function environmentText(environment: PilotEnvironment): string {
  return [
    environment.platform,
    environment.formFactor,
    environment.orientation,
    environment.inputMode,
  ].map((value) => (ENVIRONMENT_LABELS as Readonly<Record<string, string>>)[value] ?? value).join(' · ');
}

function sameEnvironment(left: PilotEnvironment, right: PilotEnvironment): boolean {
  return (['platform', 'formFactor', 'orientation', 'inputMode'] as const).every((key) => (
    left[key] === right[key]
  ));
}


function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`InputPilotWorkbenchView 缺少 ${selector}。`);
  return element;
}

function counterRows(form: PilotFormSnapshot): string {
  return COUNTERS.map(([key, label]) => `
    <div class="pilot-counter-row">
      <span>${label}</span>
      <div class="pilot-stepper" role="group" aria-label="${label}">
        <button type="button" data-counter="${key}" data-delta="-1" aria-label="减少${label}">−</button>
        <output data-counter-value="${key}">${String(form.observer[key])}</output>
        <button type="button" data-counter="${key}" data-delta="1" aria-label="增加${label}">＋</button>
      </div>
    </div>
  `).join('');
}

function completionRows(form: PilotFormSnapshot): string {
  return `
    <label class="pilot-check-row">
      <input type="checkbox" data-completion="oneHandCompleted" ${form.observer.oneHandCompleted ? 'checked' : ''}>
      <span>单手完成</span>
    </label>
    <label class="pilot-check-row">
      <input type="checkbox" data-completion="objectiveCompleted" ${form.observer.objectiveCompleted ? 'checked' : ''}>
      <span>完成本局目标</span>
    </label>
  `;
}

function comprehensionRows(form: PilotFormSnapshot): string {
  return COMPREHENSION.map(([key, label]) => `
    <fieldset class="pilot-radio-row">
      <legend>${label}</legend>
      <div>
        ${COMPREHENSION_OPTIONS.map(([value, text]) => `
          <label>
            <input type="radio" name="${key}" data-comprehension="${key}" value="${value}" ${form.selfReport[key] === value ? 'checked' : ''}>
            <span>${text}</span>
          </label>
        `).join('')}
      </div>
    </fieldset>
  `).join('');
}

function terminalMessage(record: PilotSnapshot['lastRecord']): string {
  if (!record) return '本次记录已经安全提交。';
  if (record.terminationReason === INPUT_PILOT_TERMINATION_REASON.RUNNING_RECOVERED) {
    return '检测到刷新前的运行中比赛；已作废该局且未伪造任何证据。';
  }
  if (record.terminationReason === INPUT_PILOT_TERMINATION_REASON.RUNTIME_FAILED) {
    return '运行时未能完成，本局已作废并保留审计记录。';
  }
  if (record.terminationReason === INPUT_PILOT_TERMINATION_REASON.PROTOCOL_DEVIATION) {
    return '本局因流程偏差作废，不进入主要指标。';
  }
  return '本次记录已经安全提交，可以准备下一位受测者。';
}

export class InputPilotWorkbenchView {
  #root: HTMLElement | null;
  #gameCanvas: HTMLCanvasElement | null;
  #formModel: PilotFormModelPort | null;
  #definition: Readonly<{ taskPrompt: string; environment: PilotEnvironment }> | null;
  #environment: PilotEnvironment | null;
  #actions: PilotActions | null;
  #snapshot: PilotSnapshot | null;
  #busy: boolean;
  #destroying: boolean;
  #error: string | null;
  #eligibility: Record<EligibilityKey, boolean>;
  #readiness: Record<ReadinessKey, boolean>;
  #invalidateReview: boolean;
  #restoredTrialId: string | null;
  readonly #cleanup: Array<() => void>;

  constructor(optionsValue: unknown) {
    const options = assertPlainRecord(optionsValue, 'InputPilotWorkbenchView options');
    assertKnownKeys(
      options,
      new Set(['root', 'formModel', 'definition', 'environment']),
      'InputPilotWorkbenchView options',
    );
    const rootValue = ownDataField(options, 'root', 'InputPilotWorkbenchView options');
    const formModelValue = ownDataField(options, 'formModel', 'InputPilotWorkbenchView options');
    const definitionValue = ownDataField(options, 'definition', 'InputPilotWorkbenchView options');
    const environmentSource = ownDataField(options, 'environment', 'InputPilotWorkbenchView options');
    if (!rootValue || typeof rootValue !== 'object' || typeof (rootValue as HTMLElement).querySelector !== 'function') {
      throw new TypeError('InputPilotWorkbenchView.root 必须是 DOM Element。');
    }
    const root = rootValue as HTMLElement;
    const taskPrompt = ownDataField(definitionValue, 'taskPrompt', 'Input Pilot definition');
    if (typeof taskPrompt !== 'string' || taskPrompt.length === 0) {
      throw new TypeError('Input Pilot definition.taskPrompt 必须是非空字符串。');
    }
    const definitionEnvironment = environmentValue(
      ownDataField(definitionValue, 'environment', 'Input Pilot definition'),
      'Input Pilot definition.environment',
    );
    this.#root = root;
    this.#gameCanvas = null;
    this.#formModel = formPort(formModelValue);
    this.#definition = Object.freeze({ taskPrompt, environment: definitionEnvironment });
    this.#environment = environmentValue(environmentSource, 'Input Pilot environment');
    this.#actions = null;
    this.#snapshot = null;
    this.#busy = false;
    this.#destroying = false;
    this.#error = null;
    this.#eligibility = {
      priorArenaExperience: false,
      priorOtherVariantExposure: false,
    };
    this.#readiness = {
      taskOnly: false,
      noControlHint: false,
      consent: false,
    };
    this.#invalidateReview = false;
    this.#restoredTrialId = null;
    this.#cleanup = [];
    const gameCanvas = root.querySelector<HTMLCanvasElement>('#game');
    if (!gameCanvas) throw new Error('InputPilotWorkbenchView 缺少 #game Canvas。');
    this.#gameCanvas = gameCanvas;
    try {
      root.innerHTML = `
        <header class="pilot-header">
          <h1>竞技场输入盲测</h1>
          <p data-pilot-meta></p>
          <div class="pilot-header-status"><span>状态</span><strong data-pilot-status></strong></div>
        </header>
        <main class="pilot-main">
          <section class="pilot-stage" aria-label="1v1 匹配画面">
            <div data-pilot-canvas-slot></div>
            <div class="pilot-stage-overlay" data-pilot-overlay></div>
          </section>
          <aside class="pilot-panel" aria-label="盲测观察与复核">
            <ol class="pilot-progress" data-pilot-progress></ol>
            <div class="pilot-panel-scroll" data-pilot-panel></div>
            <footer class="pilot-export-bar" data-pilot-export></footer>
          </aside>
        </main>
        <div class="pilot-toast" data-pilot-toast role="alert" hidden></div>
      `;
      const canvasSlot = root.querySelector<HTMLElement>('[data-pilot-canvas-slot]');
      if (!canvasSlot) throw new Error('InputPilotWorkbenchView 缺少 Canvas slot。');
      canvasSlot.replaceWith(gameCanvas);
      gameCanvas.setAttribute('aria-label', '竞技场 1v1 匹配画布');
    } catch (error) {
      const failure = normalizeThrownError(error, 'InputPilotWorkbenchView Canvas 挂载失败');
      try {
        root.innerHTML = '';
        root.appendChild(gameCanvas);
      } catch (rollbackError) {
        throw new AggregateError(
          [failure, normalizeThrownError(rollbackError, 'InputPilotWorkbenchView Canvas 回滚失败')],
          'InputPilotWorkbenchView 构造与回滚均失败。',
        );
      }
      throw failure;
    }
  }

  bind(actionsValue: unknown): void {
    if (this.#actions) throw new Error('InputPilotWorkbenchView 已绑定。');
    if (this.#destroying || this.#cleanup.length > 0) {
      throw new Error('InputPilotWorkbenchView 存在未完成清理。');
    }
    const root = this.#root;
    if (!root) throw new Error('InputPilotWorkbenchView 已销毁。');
    const actions = pilotActions(actionsValue);
    const click: EventListener = (event) => this.#handleClick(event);
    const change: EventListener = (event) => this.#handleChange(event);
    const registrations: Array<readonly [string, EventListener]> = [
      ['click', click], ['change', change],
    ];
    try {
      for (const [name, callback] of registrations) {
        root.addEventListener(name, callback);
        let active = true;
        this.#cleanup.push(() => {
          if (!active) return;
          root.removeEventListener(name, callback);
          active = false;
        });
      }
      this.#actions = actions;
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      for (let index = this.#cleanup.length - 1; index >= 0; index -= 1) {
        const cleanup = this.#cleanup[index];
        if (!cleanup) continue;
        try { cleanup(); this.#cleanup.splice(index, 1); } catch (cause) { cleanupErrors.push(cause); }
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError([error, ...cleanupErrors], 'Input Pilot Workbench 绑定与回滚失败。');
      }
      throw error;
    }
  }

  async #invoke(name: InvokableAction): Promise<void> {
    const actions = this.#actions;
    if (this.#busy || this.#destroying || !this.#root || !actions) return;
    this.#busy = true;
    this.#error = null;
    try {
      if (this.#snapshot) this.render(this.#snapshot);
      await actions[name]();
    } catch (error) {
      this.#error = normalizeThrownError(error, `Input Pilot ${name} 失败`).message;
    } finally {
      if (this.#destroying || !this.#root || this.#actions !== actions) return;
      this.#busy = false;
      try {
        this.render(actions.getSnapshot());
      } catch (error) {
        this.#error = normalizeThrownError(error, 'Input Pilot 操作后渲染失败').message;
      }
    }
  }

  #handleClick(event: Event): void {
    if (this.#destroying || !this.#root || !this.#formModel) return;
    const eventTarget = event.target as Element | null;
    if (!eventTarget || typeof eventTarget.closest !== 'function') return;
    const counter = eventTarget.closest<HTMLElement>('[data-counter]');
    if (counter) {
      const key = counter.dataset.counter;
      const delta = Number(counter.dataset.delta);
      if (!key || !COUNTERS.some(([candidate]) => candidate === key) || ![-1, 1].includes(delta)) {
        this.#error = '收到无效的观察计数命令。';
        return;
      }
      const value = this.#formModel.adjustCounter(key, delta);
      const output = this.#root.querySelector<HTMLOutputElement>(`[data-counter-value="${key}"]`);
      if (output) output.textContent = String(value);
      this.#saveReviewDraft();
      return;
    }
    const action = eventTarget.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action && INVOKABLE_ACTION_KEYS.has(action as InvokableAction)) {
      void this.#invoke(action as InvokableAction);
    }
  }

  #handleChange(event: Event): void {
    if (this.#destroying || !this.#formModel) return;
    const target = event.target as HTMLInputElement | null;
    if (!target || typeof target.dataset !== 'object') return;
    if (target.dataset.completion) {
      const key = target.dataset.completion;
      if (key !== 'oneHandCompleted' && key !== 'objectiveCompleted') return;
      this.#formModel.setCompletion(key, target.checked);
      this.#saveReviewDraft();
    } else if (target.dataset.comprehension) {
      const key = target.dataset.comprehension;
      if (!COMPREHENSION.some(([candidate]) => candidate === key)) return;
      this.#formModel.setComprehension(key, target.value);
      this.#saveReviewDraft();
    } else if (target.dataset.eligibility) {
      const key = target.dataset.eligibility;
      if (key !== 'priorArenaExperience' && key !== 'priorOtherVariantExposure') return;
      this.#eligibility[key] = target.checked;
    } else if (target.dataset.readiness) {
      const key = target.dataset.readiness;
      if (key !== 'taskOnly' && key !== 'noControlHint' && key !== 'consent') return;
      this.#readiness[key] = target.checked;
    } else if (Object.prototype.hasOwnProperty.call(target.dataset, 'invalidateReview')) {
      this.#invalidateReview = target.checked;
      this.#saveReviewDraft();
    }
  }

  #saveReviewDraft(): void {
    const actions = this.#actions;
    if (this.#destroying || !this.#root || !actions) return;
    try {
      const result = actions.saveDraft(this.getReview());
      if (result instanceof Promise) {
        void result.catch(() => undefined);
        throw new TypeError('Input Pilot saveDraft 必须同步完成。');
      }
    } catch (error) {
      this.#error = normalizeThrownError(error, 'Input Pilot 草稿保存失败').message;
      this.render(actions.getSnapshot());
      const toast = requiredElement<HTMLElement>(this.#root, '[data-pilot-toast]');
      toast.hidden = false;
      toast.textContent = this.#error;
    }
  }

  getEnrollment(): Readonly<Record<EligibilityKey, boolean>> {
    if (this.#destroying || !this.#root) throw new Error('InputPilotWorkbenchView 已销毁。');
    if (!Object.values(this.#readiness).every(Boolean)) {
      throw new Error('请先完成三项入组确认。');
    }
    return Object.freeze({ ...this.#eligibility });
  }

  getReview(): PilotReview {
    if (this.#destroying || !this.#root || !this.#formModel) {
      throw new Error('InputPilotWorkbenchView 已销毁。');
    }
    const snapshot = formSnapshot(this.#formModel.getSnapshot());
    return Object.freeze({
      ...snapshot,
      invalidate: this.#invalidateReview,
    });
  }

  resetForNextParticipant(): void {
    if (this.#destroying || !this.#root || !this.#formModel) {
      throw new Error('InputPilotWorkbenchView 已销毁。');
    }
    const result = this.#formModel.reset();
    if (result instanceof Promise) {
      void result.catch(() => undefined);
      throw new TypeError('Input Pilot formModel.reset 必须同步完成。');
    }
    this.#eligibility = {
      priorArenaExperience: false,
      priorOtherVariantExposure: false,
    };
    this.#readiness = { taskOnly: false, noControlHint: false, consent: false };
    this.#invalidateReview = false;
    this.#restoredTrialId = null;
    this.#error = null;
  }

  #progressMarkup(state: string): string {
    const current = stateStep(state);
    return ['入组', '进行中', '复核', '已提交'].map((label, index) => {
      const step = index + 1;
      const status = step < current ? 'complete' : step === current ? 'current' : 'pending';
      return `<li data-progress-state="${status}"><span>${step}</span><strong>${label}</strong></li>`;
    }).join('');
  }

  #enrollmentMarkup(snapshot: PilotSnapshot): string {
    const workspace = snapshot.workspace;
    const environment = this.#environment;
    const definition = this.#definition;
    if (!workspace || !environment || !definition) {
      throw new Error('Input Pilot 入组视图缺少必要状态。');
    }
    const index = workspace.enrollment.revision + 1;
    const environmentMatches = sameEnvironment(environment, definition.environment);
    const evidence = snapshot.evidence;
    return `
      ${snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL ? `
        <section class="pilot-section pilot-terminal-note">
          <h2>本次已收口</h2>
          <p>${terminalMessage(snapshot.lastRecord)}</p>
        </section>
      ` : ''}
      <section class="pilot-section">
          <h2>入组确认</h2>
        <div class="pilot-environment ${evidence.collectable ? 'is-valid' : 'is-warning'}">
          <span>证据构建</span>
          <strong>${escapeHtml(evidence.buildId ?? '未识别')}</strong>
          <small>${evidence.collectable ? 'clean build，可形成正式证据' : `已阻断：${escapeHtml(evidence.reason ?? '原因未知')}`}</small>
        </div>
        <p class="pilot-section-copy">下一位匿名编号 <strong>pilot-${String(index).padStart(4, '0')}</strong>。页面不会记录姓名、账号或原始触点。</p>
        <div class="pilot-environment ${environmentMatches ? 'is-valid' : 'is-warning'}">
          <span>当前环境</span>
          <strong>${escapeHtml(environmentText(environment))}</strong>
          <small>${environmentMatches ? '符合本轮目标环境' : `不符合目标：${escapeHtml(environmentText(definition.environment))}；记录会自动排除`}</small>
        </div>
        <div class="pilot-check-list">
          <label class="pilot-check-row"><input type="checkbox" data-readiness="consent" ${this.#readiness.consent ? 'checked' : ''}><span>受测者同意参与本轮操作测试</span></label>
          <label class="pilot-check-row"><input type="checkbox" data-readiness="taskOnly" ${this.#readiness.taskOnly ? 'checked' : ''}><span>只告知目标：“${escapeHtml(definition.taskPrompt)}”</span></label>
          <label class="pilot-check-row"><input type="checkbox" data-readiness="noControlHint" ${this.#readiness.noControlHint ? 'checked' : ''}><span>未讲解具体操作，也未暴露输入方案</span></label>
        </div>
      </section>
      <section class="pilot-section">
        <h2>资格信息</h2>
        <label class="pilot-check-row"><input type="checkbox" data-eligibility="priorArenaExperience" ${this.#eligibility.priorArenaExperience ? 'checked' : ''}><span>此前玩过本项目 Arena</span></label>
        <label class="pilot-check-row"><input type="checkbox" data-eligibility="priorOtherVariantExposure" ${this.#eligibility.priorOtherVariantExposure ? 'checked' : ''}><span>此前接触过另一输入方案</span></label>
        <p class="pilot-footnote">勾选不会阻止测试，但该记录不会进入主要指标。</p>
      </section>
      <div class="pilot-primary-zone">
        <button type="button" class="pilot-primary" data-action="enroll" ${this.#busy || !evidence.collectable ? 'disabled' : ''}>${snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL ? '准备下一位' : '建立匿名记录'}</button>
      </div>
    `;
  }

  #enrolledMarkup(snapshot: PilotSnapshot): string {
    const trial = snapshot.workspace?.activeTrial;
    const definition = this.#definition;
    if (!trial || !definition) throw new Error('Input Pilot 待开始视图缺少 Trial。');
    return `
      <section class="pilot-section">
        <h2>可以开始</h2>
        <p class="pilot-task">${escapeHtml(definition.taskPrompt)}</p>
        <dl class="pilot-facts">
          <div><dt>匿名编号</dt><dd>${escapeHtml(trial.assignment.participantId)}</dd></div>
          <div><dt>对局</dt><dd>本地 1v1 匹配</dd></div>
          <div><dt>输入方案</dt><dd>已隐藏</dd></div>
        </dl>
        <p class="pilot-section-copy">把设备交给受测者。不要解释按钮、手势或可能出现的动作。</p>
      </section>
      <div class="pilot-primary-zone">
        <button type="button" class="pilot-primary" data-action="start" ${this.#busy ? 'disabled' : ''}>开始 1v1 匹配</button>
      </div>
    `;
  }

  #observationMarkup(_snapshot: PilotSnapshot, reviewing: boolean): string {
    if (!this.#formModel) throw new Error('Input Pilot 观察视图缺少 Form Model。');
    const form = formSnapshot(this.#formModel.getSnapshot());
    return `
      <section class="pilot-section">
        <h2>${reviewing ? '复核评分' : '观察计数'}</h2>
        <p class="pilot-section-copy">只记录可见行为，不推测操作意图之外的信息。</p>
        <div class="pilot-counter-list">${counterRows(form)}</div>
        <div class="pilot-completion-list">${completionRows(form)}</div>
      </section>
      ${reviewing ? `
        <section class="pilot-section">
          <h2>参与者理解度</h2>
          <p class="pilot-section-copy">比赛结束后请受测者复述；观察员据实选择。</p>
          ${comprehensionRows(form)}
        </section>
        <section class="pilot-section pilot-invalidation">
          <label class="pilot-check-row"><input type="checkbox" data-invalidate-review ${this.#invalidateReview ? 'checked' : ''}><span>本次存在流程偏差，提交但不进入主要指标</span></label>
        </section>
        <div class="pilot-primary-zone">
          <button type="button" class="pilot-primary" data-action="submit" ${this.#busy ? 'disabled' : ''}>提交本次记录</button>
        </div>
      ` : `
        <div class="pilot-secondary-zone">
          <button type="button" class="pilot-secondary pilot-danger" data-action="abandon" ${this.#busy ? 'disabled' : ''}>受测者主动结束本场</button>
        </div>
      `}
    `;
  }

  #panelMarkup(snapshot: PilotSnapshot): string {
    if (snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED) {
      return `<section class="pilot-section pilot-fatal"><h2>采集已停止</h2><p>${escapeHtml(snapshot.lastError?.message ?? '未知错误')}</p><p>请保留本地数据并刷新页面恢复。</p></section>`;
    }
    if (
      snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.IDLE
      || snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL
    ) return this.#enrollmentMarkup(snapshot);
    if (snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED) {
      return this.#enrolledMarkup(snapshot);
    }
    if (
      snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING
      || snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING
    ) return this.#observationMarkup(snapshot, false);
    if (snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING) {
      return this.#observationMarkup(snapshot, true);
    }
    return '<section class="pilot-section"><p>正在初始化盲测工作区…</p></section>';
  }

  render(snapshotValue: unknown): void {
    if (snapshotValue === null || snapshotValue === undefined) return;
    if (this.#destroying) throw new Error('InputPilotWorkbenchView 正在销毁。');
    if (!this.#root || !this.#formModel || !this.#environment) {
      throw new Error('InputPilotWorkbenchView 已销毁。');
    }
    const snapshot = pilotSnapshot(snapshotValue);
    const activeTrial = snapshot.workspace?.activeTrial;
    if (
      snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING
      && activeTrial?.reviewDraft
      && this.#restoredTrialId !== activeTrial.trialId
    ) {
      const review = pilotReview(activeTrial.reviewDraft);
      const result = this.#formModel.restore(review);
      if (result instanceof Promise) {
        void result.catch(() => undefined);
        throw new TypeError('Input Pilot formModel.restore 必须同步完成。');
      }
      this.#invalidateReview = review.invalidate;
      this.#restoredTrialId = activeTrial.trialId;
    }
    this.#snapshot = snapshot;
    const enrollmentRevision = snapshot.workspace?.enrollment.revision ?? 0;
    const evidence = snapshot.evidence;
    const meta = requiredElement<HTMLElement>(this.#root, '[data-pilot-meta]');
    const status = requiredElement<HTMLElement>(this.#root, '[data-pilot-status]');
    meta.textContent = `记录 ${enrollmentRevision} 份 · 方案隐藏 · ${environmentText(this.#environment)}${evidence.buildId ? ` · ${evidence.buildId}` : ''}`;
    status.textContent = this.#busy ? '处理中' : stateLabel(snapshot.state);
    status.dataset.state = snapshot.state;
    requiredElement<HTMLElement>(this.#root, '[data-pilot-progress]').innerHTML = this.#progressMarkup(snapshot.state);
    requiredElement<HTMLElement>(this.#root, '[data-pilot-panel]').innerHTML = this.#panelMarkup(snapshot);

    const exportBar = requiredElement<HTMLElement>(this.#root, '[data-pilot-export]');
    const canAudit = snapshot.workspace?.activeTrial === null;
    exportBar.innerHTML = `
      <button type="button" data-action="exportAggregate" ${snapshot.workspace ? '' : 'disabled'}>导出匿名汇总</button>
      <button type="button" data-action="exportAudit" ${canAudit ? '' : 'disabled'}>导出原始审计</button>
      <button type="button" data-action="exportEvidence" ${canAudit && evidence.collectable ? '' : 'disabled'}>导出发布证据</button>
    `;

    const overlay = requiredElement<HTMLElement>(this.#root, '[data-pilot-overlay]');
    const playing = snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING
      || snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING;
    overlay.hidden = playing;
    overlay.innerHTML = snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING
      ? '<strong>比赛已结束</strong><span>请在右侧完成复核</span>'
      : snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED
        ? '<strong>已完成匿名入组</strong><span>由观察员开始 1v1 匹配</span>'
        : '<strong>输入盲测工作台</strong><span>先在观察面板完成入组</span>';

    const toast = requiredElement<HTMLElement>(this.#root, '[data-pilot-toast]');
    toast.hidden = !this.#error;
    toast.textContent = this.#error ?? '';
  }

  destroy(): void {
    const root = this.#root;
    if (!root) return;
    this.#destroying = true;
    const cleanupErrors: Error[] = [];
    for (let index = this.#cleanup.length - 1; index >= 0; index -= 1) {
      const cleanup = this.#cleanup[index];
      if (!cleanup) continue;
      try {
        cleanup();
        this.#cleanup.splice(index, 1);
      } catch (error) {
        cleanupErrors.push(normalizeThrownError(error, 'Input Pilot Workbench 监听清理失败'));
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, 'Input Pilot Workbench 清理未完成，可重试。');
    }
    try {
      root.innerHTML = '';
      if (this.#gameCanvas) root.appendChild(this.#gameCanvas);
    } catch (error) {
      throw new AggregateError(
        [normalizeThrownError(error, 'Input Pilot Workbench Canvas 归还失败')],
        'Input Pilot Workbench 清理未完成，可重试。',
      );
    }
    this.#actions = null;
    this.#snapshot = null;
    this.#formModel = null;
    this.#definition = null;
    this.#environment = null;
    this.#gameCanvas = null;
    this.#root = null;
  }
}
