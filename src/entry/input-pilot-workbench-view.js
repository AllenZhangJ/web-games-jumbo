import {
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_TERMINATION_REASON,
} from '../arena/presentation/pilot/input-pilot-record.js';
import {
  INPUT_PILOT_TRIAL_CONTROLLER_STATE,
} from '../arena/presentation/pilot/input-pilot-trial-controller.js';

const COUNTERS = Object.freeze([
  ['intentMismatchCount', '意图不匹配'],
  ['accidentalInputCount', '误触'],
  ['repeatedInputCount', '重复输入'],
  ['abandonedInputCount', '放弃输入'],
  ['correctionCount', '修正次数'],
]);

const COMPREHENSION = Object.freeze([
  ['groundAction', '地面动作'],
  ['airAction', '空中动作'],
  ['equipmentAction', '装备动作'],
]);

const COMPREHENSION_OPTIONS = Object.freeze([
  [INPUT_PILOT_COMPREHENSION.CORRECT, '正确'],
  [INPUT_PILOT_COMPREHENSION.PARTIAL, '部分'],
  [INPUT_PILOT_COMPREHENSION.INCORRECT, '错误'],
  [INPUT_PILOT_COMPREHENSION.NOT_ANSWERED, '未回答'],
]);

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

function stateStep(state) {
  if (state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED) return 1;
  if (
    state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING
    || state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING
  ) return 2;
  if (state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING) return 3;
  if (state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL) return 4;
  return 1;
}

function stateLabel(state) {
  return Object.freeze({
    created: '初始化',
    idle: '待入组',
    enrolled: '待开始',
    starting: '载入中',
    running: '进行中',
    reviewing: '待复核',
    terminal: '已提交',
    failed: '已停止',
    destroyed: '已关闭',
  })[state] ?? state;
}

function environmentText(environment) {
  return [
    environment.platform,
    environment.formFactor,
    environment.orientation,
    environment.inputMode,
  ].map((value) => ENVIRONMENT_LABELS[value] ?? value).join(' · ');
}

function sameEnvironment(left, right) {
  return ['platform', 'formFactor', 'orientation', 'inputMode'].every((key) => (
    left[key] === right[key]
  ));
}

function counterRows(form) {
  return COUNTERS.map(([key, label]) => `
    <div class="pilot-counter-row">
      <span>${label}</span>
      <div class="pilot-stepper" role="group" aria-label="${label}">
        <button type="button" data-counter="${key}" data-delta="-1" aria-label="减少${label}">−</button>
        <output data-counter-value="${key}">${form.observer[key]}</output>
        <button type="button" data-counter="${key}" data-delta="1" aria-label="增加${label}">＋</button>
      </div>
    </div>
  `).join('');
}

function completionRows(form) {
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

function comprehensionRows(form) {
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

function terminalMessage(record) {
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
  #root;
  #formModel;
  #definition;
  #environment;
  #actions;
  #snapshot;
  #busy;
  #error;
  #eligibility;
  #readiness;
  #invalidateReview;
  #restoredTrialId;
  #cleanup;

  constructor({ root, formModel, definition, environment }) {
    if (!root || typeof root.querySelector !== 'function') {
      throw new TypeError('InputPilotWorkbenchView.root 必须是 DOM Element。');
    }
    this.#root = root;
    this.#formModel = formModel;
    this.#definition = definition;
    this.#environment = environment;
    this.#actions = null;
    this.#snapshot = null;
    this.#busy = false;
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
    const gameCanvas = this.#root.querySelector('#game');
    if (!gameCanvas) throw new Error('InputPilotWorkbenchView 缺少 #game Canvas。');
    this.#root.innerHTML = `
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
    const canvasSlot = this.#root.querySelector('[data-pilot-canvas-slot]');
    canvasSlot.replaceWith(gameCanvas);
    gameCanvas.setAttribute('aria-label', '竞技场 1v1 匹配画布');
  }

  bind(actions) {
    if (this.#actions) throw new Error('InputPilotWorkbenchView 已绑定。');
    this.#actions = actions;
    const click = (event) => this.#handleClick(event);
    const change = (event) => this.#handleChange(event);
    this.#root.addEventListener('click', click);
    this.#root.addEventListener('change', change);
    this.#cleanup.push(
      () => this.#root.removeEventListener('click', click),
      () => this.#root.removeEventListener('change', change),
    );
  }

  async #invoke(name) {
    if (this.#busy || typeof this.#actions?.[name] !== 'function') return;
    this.#busy = true;
    this.#error = null;
    this.render(this.#snapshot);
    try {
      await this.#actions[name]();
    } catch (error) {
      this.#error = error instanceof Error ? error.message : String(error);
    } finally {
      this.#busy = false;
      this.render(this.#actions.getSnapshot());
    }
  }

  #handleClick(event) {
    const counter = event.target.closest?.('[data-counter]');
    if (counter) {
      const key = counter.dataset.counter;
      const delta = Number(counter.dataset.delta);
      const value = this.#formModel.adjustCounter(key, delta);
      const output = this.#root.querySelector(`[data-counter-value="${key}"]`);
      if (output) output.textContent = String(value);
      this.#saveReviewDraft();
      return;
    }
    const action = event.target.closest?.('[data-action]')?.dataset.action;
    if (action) void this.#invoke(action);
  }

  #handleChange(event) {
    const target = event.target;
    if (target.dataset.completion) {
      this.#formModel.setCompletion(target.dataset.completion, target.checked);
      this.#saveReviewDraft();
    } else if (target.dataset.comprehension) {
      this.#formModel.setComprehension(target.dataset.comprehension, target.value);
      this.#saveReviewDraft();
    } else if (target.dataset.eligibility) {
      this.#eligibility[target.dataset.eligibility] = target.checked;
    } else if (target.dataset.readiness) {
      this.#readiness[target.dataset.readiness] = target.checked;
    } else if (Object.prototype.hasOwnProperty.call(target.dataset, 'invalidateReview')) {
      this.#invalidateReview = target.checked;
      this.#saveReviewDraft();
    }
  }

  #saveReviewDraft() {
    if (typeof this.#actions?.saveDraft !== 'function') return;
    try {
      this.#actions.saveDraft(this.getReview());
    } catch (error) {
      this.#error = error instanceof Error ? error.message : String(error);
      this.render(this.#actions.getSnapshot());
      const toast = this.#root.querySelector('[data-pilot-toast]');
      toast.hidden = false;
      toast.textContent = this.#error;
    }
  }

  getEnrollment() {
    if (!Object.values(this.#readiness).every(Boolean)) {
      throw new Error('请先完成三项入组确认。');
    }
    return Object.freeze({ ...this.#eligibility });
  }

  getReview() {
    return Object.freeze({
      ...this.#formModel.getSnapshot(),
      invalidate: this.#invalidateReview,
    });
  }

  resetForNextParticipant() {
    this.#formModel.reset();
    this.#eligibility = {
      priorArenaExperience: false,
      priorOtherVariantExposure: false,
    };
    this.#readiness = { taskOnly: false, noControlHint: false, consent: false };
    this.#invalidateReview = false;
    this.#restoredTrialId = null;
    this.#error = null;
  }

  #progressMarkup(state) {
    const current = stateStep(state);
    return ['入组', '进行中', '复核', '已提交'].map((label, index) => {
      const step = index + 1;
      const status = step < current ? 'complete' : step === current ? 'current' : 'pending';
      return `<li data-progress-state="${status}"><span>${step}</span><strong>${label}</strong></li>`;
    }).join('');
  }

  #enrollmentMarkup(snapshot) {
    const index = snapshot.workspace.enrollment.revision + 1;
    const environmentMatches = sameEnvironment(this.#environment, this.#definition.environment);
    return `
      ${snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL ? `
        <section class="pilot-section pilot-terminal-note">
          <h2>本次已收口</h2>
          <p>${terminalMessage(snapshot.lastRecord)}</p>
        </section>
      ` : ''}
      <section class="pilot-section">
        <h2>入组确认</h2>
        <p class="pilot-section-copy">下一位匿名编号 <strong>pilot-${String(index).padStart(4, '0')}</strong>。页面不会记录姓名、账号或原始触点。</p>
        <div class="pilot-environment ${environmentMatches ? 'is-valid' : 'is-warning'}">
          <span>当前环境</span>
          <strong>${environmentText(this.#environment)}</strong>
          <small>${environmentMatches ? '符合本轮目标环境' : `不符合目标：${environmentText(this.#definition.environment)}；记录会自动排除`}</small>
        </div>
        <div class="pilot-check-list">
          <label class="pilot-check-row"><input type="checkbox" data-readiness="consent" ${this.#readiness.consent ? 'checked' : ''}><span>受测者同意参与本轮操作测试</span></label>
          <label class="pilot-check-row"><input type="checkbox" data-readiness="taskOnly" ${this.#readiness.taskOnly ? 'checked' : ''}><span>只告知目标：“${this.#definition.taskPrompt}”</span></label>
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
        <button type="button" class="pilot-primary" data-action="enroll" ${this.#busy ? 'disabled' : ''}>${snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL ? '准备下一位' : '建立匿名记录'}</button>
      </div>
    `;
  }

  #enrolledMarkup(snapshot) {
    const trial = snapshot.workspace.activeTrial;
    return `
      <section class="pilot-section">
        <h2>可以开始</h2>
        <p class="pilot-task">${this.#definition.taskPrompt}</p>
        <dl class="pilot-facts">
          <div><dt>匿名编号</dt><dd>${trial.assignment.participantId}</dd></div>
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

  #observationMarkup(snapshot, reviewing) {
    const form = this.#formModel.getSnapshot();
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

  #panelMarkup(snapshot) {
    if (snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED) {
      return `<section class="pilot-section pilot-fatal"><h2>采集已停止</h2><p>${snapshot.lastError?.message ?? '未知错误'}</p><p>请保留本地数据并刷新页面恢复。</p></section>`;
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

  render(snapshot) {
    if (!snapshot) return;
    this.#snapshot = snapshot;
    const activeTrial = snapshot.workspace?.activeTrial;
    if (
      snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING
      && activeTrial?.reviewDraft
      && this.#restoredTrialId !== activeTrial.trialId
    ) {
      this.#formModel.restore(activeTrial.reviewDraft);
      this.#invalidateReview = activeTrial.reviewDraft.invalidate;
      this.#restoredTrialId = activeTrial.trialId;
    }
    const enrollmentRevision = snapshot.workspace?.enrollment.revision ?? 0;
    const meta = this.#root.querySelector('[data-pilot-meta]');
    const status = this.#root.querySelector('[data-pilot-status]');
    meta.textContent = `记录 ${enrollmentRevision} 份 · 方案隐藏 · ${environmentText(this.#environment)}`;
    status.textContent = this.#busy ? '处理中' : stateLabel(snapshot.state);
    status.dataset.state = snapshot.state;
    this.#root.querySelector('[data-pilot-progress]').innerHTML = this.#progressMarkup(snapshot.state);
    this.#root.querySelector('[data-pilot-panel]').innerHTML = this.#panelMarkup(snapshot);

    const exportBar = this.#root.querySelector('[data-pilot-export]');
    const canAudit = snapshot.workspace?.activeTrial === null;
    exportBar.innerHTML = `
      <button type="button" data-action="exportAggregate" ${snapshot.workspace ? '' : 'disabled'}>导出匿名汇总</button>
      <button type="button" data-action="exportAudit" ${canAudit ? '' : 'disabled'}>导出审计数据</button>
    `;

    const overlay = this.#root.querySelector('[data-pilot-overlay]');
    const playing = snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING
      || snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING;
    overlay.hidden = playing;
    overlay.innerHTML = snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING
      ? '<strong>比赛已结束</strong><span>请在右侧完成复核</span>'
      : snapshot.state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED
        ? '<strong>已完成匿名入组</strong><span>由观察员开始 1v1 匹配</span>'
        : '<strong>输入盲测工作台</strong><span>先在观察面板完成入组</span>';

    const toast = this.#root.querySelector('[data-pilot-toast]');
    toast.hidden = !this.#error;
    toast.textContent = this.#error ?? '';
  }

  destroy() {
    if (!this.#root) return;
    const gameCanvas = this.#root.querySelector('#game');
    for (const cleanup of this.#cleanup.splice(0).reverse()) cleanup();
    this.#root.innerHTML = '';
    if (gameCanvas) this.#root.appendChild(gameCanvas);
    this.#actions = null;
    this.#snapshot = null;
    this.#root = null;
  }
}
