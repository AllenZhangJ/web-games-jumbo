function required(root, selector) {
  const element = root.querySelector?.(selector);
  if (!element) throw new Error(`真人研究工作台缺少 ${selector}。`);
  return element;
}

function checkedValue(root, name) {
  return root.querySelector?.(`input[name="${name}"]:checked`)?.value ?? null;
}

function numberValue(element, name) {
  const value = Number(element.value);
  if (!Number.isSafeInteger(value)) throw new TypeError(`${name} 必须是整数。`);
  return value;
}

function setText(element, value) {
  element.textContent = value ?? '';
}

function setHidden(element, hidden) {
  element.hidden = Boolean(hidden);
}

export class HumanMatchStudyWorkbenchView {
  #root;
  #nodes;
  #cleanups;
  #bound;
  #busy;
  #lastError;
  #lastModel;

  constructor({ root }) {
    this.#root = root;
    this.#nodes = Object.freeze({
      operatorShell: required(root, '#study-operator-shell'),
      participantShell: required(root, '#study-participant-shell'),
      runningBar: required(root, '#study-running-bar'),
      phase: required(root, '#study-phase'),
      status: required(root, '#study-status'),
      build: required(root, '#study-build'),
      environment: required(root, '#study-environment'),
      progress: required(root, '#study-progress'),
      count: required(root, '#study-record-count'),
      participant: required(root, '#study-participant-id'),
      error: required(root, '#study-error'),
      enrollment: required(root, '#study-enrollment'),
      enrolled: required(root, '#study-enrolled'),
      review: required(root, '#study-review'),
      exportPending: required(root, '#study-export-pending'),
      operatorId: required(root, '#study-operator-id'),
      consent: required(root, '#study-consent'),
      priorArena: required(root, '#study-prior-arena'),
      priorStudy: required(root, '#study-prior-study'),
      briefingDeviation: required(root, '#study-briefing-deviation'),
      operatorAssistance: required(root, '#study-operator-assistance'),
      exportWorkspaceButton: required(root, '#study-export-workspace'),
      enrollButton: required(root, '#study-enroll'),
      startButton: required(root, '#study-start'),
      invalidateButton: required(root, '#study-invalidate-enrolled'),
      abandonButton: required(root, '#study-abandon'),
      exportButton: required(root, '#study-export'),
      confirmButton: required(root, '#study-confirm'),
      lostButton: required(root, '#study-file-lost'),
      reviewQuestions: required(root, '#study-review-questions'),
      fairness: required(root, '#study-fairness'),
      naturalness: required(root, '#study-naturalness'),
      wouldRematch: required(root, '#study-would-rematch'),
      packageName: required(root, '#study-package-name'),
      packageHash: required(root, '#study-package-hash'),
    });
    this.#cleanups = [];
    this.#bound = false;
    this.#busy = false;
    this.#lastError = null;
    this.#lastModel = null;
    Object.freeze(this);
  }

  #listen(element, eventName, callback) {
    element.addEventListener(eventName, callback);
    this.#cleanups.push(() => element.removeEventListener(eventName, callback));
  }

  bind(actions) {
    if (this.#bound) throw new Error('真人研究工作台 actions 已绑定。');
    const invoke = (action) => async (event) => {
      event?.preventDefault?.();
      if (this.#busy) return;
      this.#busy = true;
      this.#lastError = null;
      this.#setButtonsDisabled(true);
      try {
        await action();
      } catch (error) {
        this.#lastError = error?.message ?? String(error);
      } finally {
        this.#busy = false;
        if (this.#nodes === null) return;
        if (this.#lastModel !== null) this.render(this.#lastModel);
      }
    };
    this.#listen(this.#nodes.enrollButton, 'click', invoke(actions.enroll));
    this.#listen(this.#nodes.startButton, 'click', invoke(actions.start));
    this.#listen(this.#nodes.invalidateButton, 'click', invoke(actions.invalidateEnrolled));
    this.#listen(this.#nodes.abandonButton, 'click', invoke(actions.abandon));
    this.#listen(this.#nodes.exportButton, 'click', invoke(actions.exportPackage));
    this.#listen(this.#nodes.confirmButton, 'click', invoke(actions.confirmExport));
    this.#listen(this.#nodes.lostButton, 'click', invoke(actions.fileLost));
    this.#listen(
      this.#nodes.exportWorkspaceButton,
      'click',
      invoke(actions.exportWorkspace),
    );
    this.#bound = true;
  }

  #setButtonsDisabled(value) {
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
    const operatorId = this.#nodes.operatorId.value.trim();
    if (operatorId.length === 0) throw new Error('请输入去标识操作员编号。');
    if (operatorId.length > 128) throw new Error('操作员编号不能超过 128 字符。');
    return Object.freeze({
      operatorId,
      eligibility: Object.freeze({
        consentConfirmed: this.#nodes.consent.checked,
        priorArenaExperience: this.#nodes.priorArena.checked,
        priorStudyExposure: this.#nodes.priorStudy.checked,
        briefingDeviation: this.#nodes.briefingDeviation.checked,
        operatorAssistance: this.#nodes.operatorAssistance.checked,
      }),
    });
  }

  getSelfReport() {
    const opponentTypeGuess = checkedValue(this.#root, 'study-opponent-guess');
    if (opponentTypeGuess === null) throw new Error('请选择对手类型判断。');
    return Object.freeze({
      opponentTypeGuess,
      fairnessRating: numberValue(this.#nodes.fairness, '公平感评分'),
      naturalnessRating: numberValue(this.#nodes.naturalness, '自然度评分'),
      wouldRematch: this.#nodes.wouldRematch.checked,
    });
  }

  resetEnrollment() {
    this.#nodes.consent.checked = false;
    this.#nodes.priorArena.checked = false;
    this.#nodes.priorStudy.checked = false;
    this.#nodes.briefingDeviation.checked = false;
    this.#nodes.operatorAssistance.checked = false;
    for (const element of this.#root.querySelectorAll?.(
      'input[name="study-opponent-guess"]',
    ) ?? []) element.checked = false;
    this.#nodes.fairness.value = '3';
    this.#nodes.naturalness.value = '3';
    this.#nodes.wouldRematch.checked = false;
  }

  showFatalError(message) {
    if (this.#nodes === null) return;
    this.#lastError = message;
    this.#root.dataset.studyMode = 'operator';
    setHidden(this.#nodes.participantShell, true);
    setHidden(this.#nodes.operatorShell, false);
    setHidden(this.#nodes.runningBar, true);
    setText(this.#nodes.error, message);
    setHidden(this.#nodes.error, false);
    this.#setButtonsDisabled(true);
  }

  render(model) {
    this.#lastModel = model;
    const phase = model.phase;
    this.#root.dataset.studyMode = phase === 'running' ? 'participant' : 'operator';
    setHidden(this.#nodes.participantShell, phase !== 'running');
    setHidden(this.#nodes.operatorShell, phase === 'running');
    setHidden(this.#nodes.runningBar, phase !== 'running');
    setHidden(this.#nodes.enrollment, phase !== 'idle');
    setHidden(this.#nodes.enrolled, phase !== 'enrolled');
    const reviewing = phase === 'reviewing' || phase === 'recovery-required';
    setHidden(this.#nodes.review, !reviewing);
    setHidden(this.#nodes.exportPending, phase !== 'export-pending');
    setHidden(
      this.#nodes.reviewQuestions,
      !(phase === 'reviewing' && model.terminalStatus === 'completed'),
    );
    setText(this.#nodes.phase, phase.toUpperCase());
    setText(this.#nodes.status, model.statusText);
    setText(
      this.#nodes.build,
      model.buildId === null
        ? '未绑定正式构建'
        : `${model.buildId}${model.collectable ? ' · CLEAN' : ' · BLOCKED'}`,
    );
    setText(
      this.#nodes.environment,
      `${model.environment.platform} / ${model.environment.formFactor} / `
      + `${model.environment.orientation} / ${model.environment.inputMode}`,
    );
    setText(
      this.#nodes.progress,
      `${model.completedMatchCount} / ${model.totalMatchCount}`,
    );
    setText(this.#nodes.count, String(model.receiptCount));
    setText(this.#nodes.participant, model.participantId ?? '尚未入组');
    setText(this.#nodes.packageName, model.packageReceipt?.fileName ?? '—');
    setText(this.#nodes.packageHash, model.packageReceipt?.sha256 ?? '—');
    this.#nodes.enrollButton.disabled = this.#busy || !model.canEnroll;
    this.#nodes.startButton.disabled = this.#busy || !model.canStart;
    this.#nodes.invalidateButton.disabled = this.#busy || phase !== 'enrolled';
    this.#nodes.abandonButton.disabled = this.#busy || phase !== 'running';
    this.#nodes.exportButton.disabled = this.#busy || !reviewing;
    this.#nodes.confirmButton.disabled = this.#busy || phase !== 'export-pending';
    this.#nodes.lostButton.disabled = this.#busy || phase !== 'export-pending';
    this.#nodes.exportWorkspaceButton.disabled = this.#busy;
    setHidden(this.#nodes.error, model.error === null && this.#lastError === null);
    setText(this.#nodes.error, model.error ?? this.#lastError ?? '');
  }

  destroy() {
    for (const cleanup of this.#cleanups.splice(0).reverse()) {
      try { cleanup(); } catch { /* DOM teardown remains best-effort. */ }
    }
    this.#nodes = null;
    this.#root = null;
    this.#lastModel = null;
    this.#bound = false;
  }
}
