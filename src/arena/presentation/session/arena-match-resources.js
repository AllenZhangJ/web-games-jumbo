function validateSession(value) {
  if (!value || typeof value !== 'object') throw new TypeError('快速匹配缺少 session。');
  for (const method of [
    'start',
    'setPaused',
    'step',
    'getSnapshot',
    'getPublicMatchInfo',
    'destroy',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`快速匹配 session 缺少 ${method}()。`);
    }
  }
  return value;
}

function cleanup(value, errors) {
  if (!value || typeof value.destroy !== 'function') return;
  try { value.destroy(); } catch (error) { errors.push(error); }
}

export function destroyArenaMatchCandidate(candidate) {
  if (!candidate) return;
  const errors = [];
  cleanup(candidate.eventWindow, errors);
  cleanup(candidate.sampler, errors);
  cleanup(candidate.session, errors);
  if (errors.length > 0) {
    const failure = new Error('Arena match candidate 清理未完整完成。');
    failure.causes = errors;
    throw failure;
  }
}

export function createArenaMatchResources(composition, inputViewport) {
  let session = null;
  let sampler = null;
  let eventWindow = null;
  try {
    const match = composition.matchService.create({ config: composition.matchConfig });
    session = validateSession(match?.session);
    const publicMatchInfo = session.getPublicMatchInfo();
    const snapshot = session.getSnapshot();
    if (publicMatchInfo.matchSeed !== snapshot.matchSeed || match.matchSeed !== snapshot.matchSeed) {
      throw new RangeError('快速匹配 matchSeed 在 bundle/session/snapshot 之间不一致。');
    }
    const mapper = composition.mapperFactory(composition.mapperId);
    if (!mapper || mapper.id !== composition.mapperId || typeof mapper.map !== 'function') {
      throw new TypeError('mapperFactory 返回值不符合 InputMapper 合同。');
    }
    sampler = composition.samplerFactory({
      participantId: 'player-1',
      viewport: inputViewport,
      mapper,
    });
    eventWindow = composition.eventWindowFactory({ capacity: 512 });
    if (!eventWindow || typeof eventWindow.consume !== 'function' || typeof eventWindow.destroy !== 'function') {
      throw new TypeError('eventWindowFactory 返回值不符合合同。');
    }
    return {
      matchSeed: snapshot.matchSeed,
      session,
      sampler,
      eventWindow,
      publicMatchInfo,
      snapshot,
    };
  } catch (error) {
    const cleanupErrors = [];
    cleanup(eventWindow, cleanupErrors);
    cleanup(sampler, cleanupErrors);
    cleanup(session, cleanupErrors);
    if (cleanupErrors.length > 0) {
      const failure = new Error('Arena match resources 创建失败且清理未完整完成。');
      failure.cause = error;
      failure.cleanupCauses = cleanupErrors;
      throw failure;
    }
    throw error;
  }
}
