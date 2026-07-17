function validateMethods(value, methods, label) {
  if (!value || typeof value !== 'object') {
    throw new TypeError(`ProductSessionController 需要 ${label}。`);
  }
  for (const method of methods) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`ProductSession ${label} 缺少 ${method}()。`);
    }
  }
  return value;
}
export function validateProductSessionStateMachine(value) {
  return validateMethods(value, [
    'dispatch',
    'suspend',
    'resume',
    'failRecoverable',
    'retry',
    'failFatal',
    'destroy',
    'getSnapshot',
  ], 'StateMachine');
}

export function validateProductProfileService(value) {
  return validateMethods(value, [
    'open',
    'getSnapshot',
    'renewLease',
    'selectCharacter',
    'commitProgressionGrant',
    'destroy',
  ], 'ProfileService');
}

export function validateProductRewardCommitter(value) {
  return validateMethods(value, ['commit'], 'RewardCommitter');
}

export function validateProductMatchCoordinator(value) {
  return validateMethods(value, [
    'prepare',
    'start',
    'setPaused',
    'step',
    'getMatchSnapshot',
    'getResult',
    'release',
    'resetFailure',
    'destroy',
    'getSnapshot',
  ], 'MatchCoordinator');
}

export function validateProductDiagnosticSink(value) {
  if (value !== null && typeof value !== 'function') {
    throw new TypeError('ProductSession diagnosticSink 必须是函数。');
  }
  return value;
}
