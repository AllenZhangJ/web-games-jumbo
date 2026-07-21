import { BotController } from '@number-strategy-jump/arena-bot';
import { combineCleanupFailure, normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import { MatchCore } from '@number-strategy-jump/arena-match';
import { createArenaV1MatchCore } from '../arena-v1-match-core.js';
import {
  createMatchContentPublicView,
  createMatchContentSelection,
} from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { LocalMatchSession } from '@number-strategy-jump/arena-session';
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

function validateContentPoolProvider(value) {
  if (value !== null && (!value || typeof value.resolve !== 'function')) {
    throw new TypeError('contentPoolProvider 必须实现 resolve()。');
  }
  return value;
}

function resolveContentPool(provider, matchSeed, config) {
  if (provider === null) return Object.freeze({ config, content: null });
  const baseConfig = cloneFrozenData(config, 'QuickMatch config');
  if (Object.prototype.hasOwnProperty.call(baseConfig, 'contentSelection')) {
    throw new RangeError(
      '启用 contentPoolProvider 时不能由调用者覆盖 contentSelection。',
    );
  }
  const pool = cloneFrozenData(
    provider.resolve({ matchSeed }),
    'QuickMatch frozen content pool',
  );
  if (pool.matchSeed !== matchSeed) {
    throw new RangeError('QuickMatch content pool matchSeed 与匹配分配不一致。');
  }
  const selection = createMatchContentSelection(pool.selection);
  return Object.freeze({
    config: Object.freeze({ ...baseConfig, contentSelection: selection }),
    content: createMatchContentPublicView(selection),
  });
}

export class QuickMatchService {
  #seedSource;
  #coreFactory;
  #botControllerFactory;
  #sessionFactory;
  #diagnosticSink;
  #allowDifficultyOverride;
  #contentPoolProvider;

  constructor({
    seedSource = null,
    coreFactory = createArenaV1MatchCore,
    botControllerFactory = (options) => new BotController(options),
    sessionFactory = (options) => new LocalMatchSession(options),
    diagnosticSink = null,
    allowDifficultyOverride = false,
    contentPoolProvider = null,
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
    this.#contentPoolProvider = validateContentPoolProvider(contentPoolProvider);
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
      const resolvedContent = resolveContentPool(
        this.#contentPoolProvider,
        assignment.matchSeed,
        config,
      );
      core = this.#coreFactory({
        seed: assignment.matchSeed,
        config: resolvedContent.config,
      });
      if (!(core instanceof MatchCore)) throw new TypeError('coreFactory 必须返回 MatchCore。');
      const botCharacter = core.getCharacterDefinition('player-2');
      controller = this.#botControllerFactory({
        participantId: 'player-2',
        difficultyId: assignment.effectiveDifficultyId,
        behaviorSeed: assignment.seeds.botBehavior,
        personalitySeed: assignment.seeds.botPersonality,
        arena: core.config.arena,
        characterRadius: botCharacter.collision.radius,
        maximumStepHeight: botCharacter.movement.automaticStepHeight,
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
        content: resolvedContent.content,
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
