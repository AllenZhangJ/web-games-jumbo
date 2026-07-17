export const INPUT_PILOT_RUNTIME_STATE = Object.freeze({
  CREATED: 'created',
  STARTING: 'starting',
  RUNNING: 'running',
  RESULT: 'result',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

export function validateInputPilotRuntimeFactory(value) {
  if (typeof value !== 'function') {
    throw new TypeError('InputPilotTrialController.runtimeFactory 必须是函数。');
  }
  return value;
}

export function validateInputPilotRuntime(value) {
  if (!value || typeof value !== 'object') throw new TypeError('pilot runtime 无效。');
  for (const method of [
    'start',
    'setPaused',
    'getStatus',
    'finalizeMetrics',
    'destroy',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`pilot runtime 缺少 ${method}()。`);
    }
  }
  return value;
}

export function validateInputPilotRuntimeStatus(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('pilot runtime status 无效。');
  }
  if (!Object.values(INPUT_PILOT_RUNTIME_STATE).includes(value.state)) {
    throw new RangeError(`pilot runtime state 不受支持：${String(value.state)}。`);
  }
  if (typeof value.timedOut !== 'boolean') {
    throw new TypeError('pilot runtime status.timedOut 必须是布尔值。');
  }
  return Object.freeze({ state: value.state, timedOut: value.timedOut });
}
