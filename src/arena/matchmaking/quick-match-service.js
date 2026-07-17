import { BotController } from '../ai/bot-controller.js';
import { combineCleanupFailure, normalizeThrownError } from '../lifecycle-error.js';
import { MatchCore } from '../match-core.js';
import { LocalMatchSession } from '../session/local-match-session.js';
import {
  copyMatchAssignmentDiagnostics,
  createMatchAssignment,
} from './match-assignment.js';

function validateFactory(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function cleanupPartials(values) {
  const errors = [];
  for (const value of values) {
    if (!value || typeof value.destroy !== 'function') continue;
    try {
      value.destroy();
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

function validateSession(session) {
  if (!session || typeof session !== 'object') {
    throw new TypeError('sessionFactory 必须返回 LocalMatchSession 合同。');
  }
  for (const method of [
    'start',
    'setPaused',
    'step',
    'runUntilEnded',
    'getSnapshot',
    'getPublicMatchInfo',
    'exportReplay',
    'destroy',
  ]) {
    if (typeof session[method] !== 'function') {
      throw new TypeError(`sessionFactory 返回值缺少 ${method}()。`);
    }
  }
  return session;
}

export class QuickMatchService {
  #seedSource;
  #coreFactory;
  #botControllerFactory;
  #sessionFactory;
  #diagnosticSink;
  #allowDifficultyOverride;

  constructor({
    seedSource = null,
    coreFactory = (options) => new MatchCore(options),
    botControllerFactory = (options) => new BotController(options),
    sessionFactory = (options) => new LocalMatchSession(options),
    diagnosticSink = null,
    allowDifficultyOverride = false,
  } = {}) {
    if (seedSource !== null && typeof seedSource.nextSeed !== 'function') {
      throw new TypeError('seedSource 必须实现 nextSeed()。');
    }
    if (diagnosticSink !== null && typeof diagnosticSink !== 'function') {
      throw new TypeError('diagnosticSink 必须是函数。');
    }
    this.#seedSource = seedSource;
    this.#coreFactory = validateFactory(coreFactory, 'coreFactory');
    this.#botControllerFactory = validateFactory(botControllerFactory, 'botControllerFactory');
    this.#sessionFactory = validateFactory(sessionFactory, 'sessionFactory');
    this.#diagnosticSink = diagnosticSink;
    this.#allowDifficultyOverride = Boolean(allowDifficultyOverride);
  }

  #nextSeed(explicitSeed) {
    if (explicitSeed !== undefined) return explicitSeed;
    if (!this.#seedSource) throw new Error('快速匹配需要显式 matchSeed 或 seedSource。');
    return this.#seedSource.nextSeed();
  }

  create({ matchSeed, config = {}, difficultyOverride = null } = {}) {
    if (difficultyOverride !== null && !this.#allowDifficultyOverride) {
      throw new Error('生产 QuickMatchService 不允许覆盖隐藏难度。');
    }
    const assignment = createMatchAssignment({
      matchSeed: this.#nextSeed(matchSeed),
      difficultyOverride,
    });
    const publicMatchInfo = {
      matchSeed: assignment.matchSeed,
      opponent: { ...assignment.opponent },
    };
    let core = null;
    let controller = null;
    let session = null;
    try {
      core = this.#coreFactory({ seed: assignment.matchSeed, config });
      if (!(core instanceof MatchCore)) throw new TypeError('coreFactory 必须返回 MatchCore。');
      controller = this.#botControllerFactory({
        participantId: 'player-2',
        difficultyId: assignment.effectiveDifficultyId,
        behaviorSeed: assignment.seeds.botBehavior,
        personalitySeed: assignment.seeds.botPersonality,
        arena: core.config.arena,
        characterRadius: core.config.character.radius,
        basePush: core.config.basePush,
      });
      session = this.#sessionFactory({
        core,
        botController: controller,
        playerParticipantId: 'player-1',
        botParticipantId: 'player-2',
        publicMatchInfo,
      });
      validateSession(session);
      core = null;
      controller = null;
      // Diagnostics are observational. A broken logger must never gain the
      // authority to cancel an otherwise valid local match.
      try {
        this.#diagnosticSink?.(copyMatchAssignmentDiagnostics(assignment));
      } catch {
        // The injected sink owns reporting/retry policy; gameplay stays alive.
      }
      return Object.freeze({
        matchSeed: assignment.matchSeed,
        opponent: Object.freeze({ ...assignment.opponent }),
        session,
      });
    } catch (error) {
      const cleanupErrors = cleanupPartials([session, controller, core]);
      const failure = normalizeThrownError(error, 'QuickMatchService 创建失败');
      throw combineCleanupFailure(
        failure,
        cleanupErrors,
        'QuickMatchService 创建失败且清理未完整完成。',
      );
    }
  }
}
