import { BOT_DIFFICULTY_IDS } from '../ai/bot-difficulty.js';
import { createArenaV1CharacterRegistry } from '../content/arena-v1-characters.js';
import { assertNonEmptyString, cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  assertArenaExperimentReplaySeedsPlanned,
  cloneArenaExperimentReplaySeeds,
} from './experiment-seed-utils.js';
import { createArenaMetricGate } from './metric-gate.js';
import {
  createSortedMetricCountRecord,
  incrementMetricCount,
  metricRatioOrNull,
} from './experiment-metric-utils.js';
import {
  ARENA_BOT_CAPABILITY_MAP_EVENT_TYPES,
  ARENA_BOT_CAPABILITY_PARTICIPANT_ID,
  ARENA_BOT_CAPABILITY_DEFAULT_GATE_POLICY,
  createArenaBotCapabilityGatePolicy,
  createArenaBotCapabilityGatePolicyDefinition,
  createArenaBotDifficultyMetricState,
  finishArenaBotDifficultyMetricState,
} from './arena-bot-capability-metrics.js';

export const ARENA_BOT_CAPABILITY_COLLECTOR_ID = 'arena.stage9.bot-capability';
export const ARENA_BOT_CAPABILITY_COLLECTOR_VERSION = 1;
export const ARENA_BOT_CAPABILITY_COLLECTOR_DEFAULT_PARAMETERS = Object.freeze({
  gatePolicy: ARENA_BOT_CAPABILITY_DEFAULT_GATE_POLICY,
});

const PARAMETER_KEYS = new Set(['gatePolicy']);

export function createArenaBotCapabilityCollectorParameters(value = {}) {
  const source = cloneFrozenData(value, 'ArenaBotCapabilityCollector parameters');
  for (const key of Object.keys(source)) {
    if (!PARAMETER_KEYS.has(key)) {
      throw new RangeError(`ArenaBotCapabilityCollector parameters 不支持字段 ${key}。`);
    }
  }
  return Object.freeze({
    gatePolicy: createArenaBotCapabilityGatePolicyDefinition(source.gatePolicy ?? {}),
  });
}

class ArenaBotCapabilityCollector {
  #plannedCases;
  #replaySeeds;
  #botRunInputThreshold;
  #gatePolicy;
  #active;
  #stats;
  #completedCases;
  #failedCases;
  #totalEvents;
  #failureNames;
  #destroyed;

  constructor(definition, parameters) {
    const plannedSeeds = definition.getSeeds();
    const replaySeeds = cloneArenaExperimentReplaySeeds(
      definition.workload.parameters.replaySeeds,
      'Bot capability collector replaySeeds',
    );
    assertArenaExperimentReplaySeedsPlanned(
      replaySeeds,
      plannedSeeds,
      'Bot capability replay',
    );
    const botCharacterId = definition.candidate.matchConfig.participantCharacters.find(
      ({ participantId }) => participantId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID,
    )?.definitionId;
    this.#botRunInputThreshold = createArenaV1CharacterRegistry()
      .require(botCharacterId).movement.runInputThreshold;
    this.#gatePolicy = createArenaBotCapabilityCollectorParameters(parameters).gatePolicy;
    this.#plannedCases = plannedSeeds.length;
    this.#replaySeeds = new Set(replaySeeds);
    this.#active = null;
    this.#stats = new Map(BOT_DIFFICULTY_IDS.map((id) => [
      id,
      createArenaBotDifficultyMetricState(id),
    ]));
    this.#completedCases = 0;
    this.#failedCases = 0;
    this.#totalEvents = 0;
    this.#failureNames = new Map();
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaBotCapabilityCollector 已销毁。');
  }

  beginCase(context) {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('Bot capability collector 已有活动 case。');
    this.#active = {
      seed: context.seed,
      eventCount: 0,
      stats: new Map(BOT_DIFFICULTY_IDS.map((id) => [
        id,
        createArenaBotDifficultyMetricState(id),
      ])),
    };
  }

  observeStep(observation) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== observation.seed) {
      throw new Error('Bot capability observation 没有对应活动 case。');
    }
    const stats = this.#active.stats.get(observation.snapshot.difficultyId);
    if (!stats) throw new Error(`Bot capability 未知难度 ${observation.snapshot.difficultyId}。`);
    const botFrame = observation.inputFrames.find(
      ({ participantId }) => participantId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID,
    );
    if (!botFrame) throw new Error('Bot capability observation 缺少 Bot InputFrame。');
    const magnitude = Math.hypot(botFrame.moveX, botFrame.moveZ);
    if (botFrame.jumpPressed) stats.movementInputs.jumpPressed += 1;
    if (botFrame.slamPressed) stats.movementInputs.slamPressed += 1;
    if (botFrame.jumpHeld && !stats.previousJumpHeld) {
      stats.movementInputs.crouchHoldStarted += 1;
    }
    stats.previousJumpHeld = botFrame.jumpHeld;
    if (magnitude > 1e-7) {
      if (magnitude < this.#botRunInputThreshold) stats.movementInputs.walkTicks += 1;
      else stats.movementInputs.runTicks += 1;
    }
    for (const event of observation.events) {
      const type = assertNonEmptyString(event.type, 'Bot capability event.type');
      this.#active.eventCount += 1;
      if (
        type === 'ActionStarted'
        && event.participantId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID
      ) {
        stats.actions += 1;
        if (event.action.startsWith('movement.')) {
          incrementMetricCount(stats.movementActions, event.action);
        } else if (event.action !== 'base-push') stats.equipmentActions += 1;
      } else if (
        type === 'EquipmentPickedUp'
        && event.participantId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID
      ) {
        stats.equipmentPickups += 1;
      } else if (
        type === 'HitResolved'
        && event.attackerId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID
      ) {
        stats.hits += 1;
      } else if (
        type === 'PlayerEliminated'
        && event.creditedAttackerId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID
      ) stats.eliminations += 1;
      if (
        type === 'DownSmashLanded'
        && event.participantId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID
      ) {
        stats.downSmashLandings += 1;
      }
      if (ARENA_BOT_CAPABILITY_MAP_EVENT_TYPES.includes(type)) {
        incrementMetricCount(stats.mapEvents, type);
      }
      if (
        type === 'PlayerEliminated'
        && event.participantId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID
      ) {
        stats.botDeaths += 1;
        if (event.creditedAttackerId === null) stats.botUncreditedDeaths += 1;
      } else if (type === 'PlayerEliminated' && event.participantId === 'player-1') {
        stats.playerDeaths += 1;
      }
    }
  }

  completeCase(context) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== context.seed) {
      throw new Error('Bot capability completion 没有对应活动 case。');
    }
    if (this.#active.eventCount !== context.eventCount) {
      throw new Error('Bot capability collector 事件分母与 Runner 不一致。');
    }
    if (
      !Array.isArray(context.result.difficulties)
      || context.result.difficulties.length !== BOT_DIFFICULTY_IDS.length
    ) throw new Error('Bot capability result 未覆盖三档难度。');
    const expectedReplay = this.#replaySeeds.has(context.seed);
    for (let index = 0; index < BOT_DIFFICULTY_IDS.length; index += 1) {
      const difficultyId = BOT_DIFFICULTY_IDS[index];
      const result = context.result.difficulties[index];
      if (result.difficultyId !== difficultyId) {
        throw new Error(`Bot capability result 难度顺序错误：${result.difficultyId}。`);
      }
      if (result.replayVerified !== expectedReplay) {
        throw new Error(`Bot capability ${difficultyId} 回放状态与 Definition 不一致。`);
      }
      const source = this.#active.stats.get(difficultyId);
      const target = this.#stats.get(difficultyId);
      source.matches = 1;
      source.ticks = result.ticks;
      source.replayChecks = result.replayVerified ? 1 : 0;
      source.hashes.add(result.finalHash);
      if (result.outcome.isDraw) source.draws = 1;
      else if (
        result.outcome.winnerId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID
      ) source.wins = 1;
      else source.losses = 1;
      for (const field of [
        'matches',
        'wins',
        'draws',
        'losses',
        'ticks',
        'actions',
        'equipmentActions',
        'equipmentPickups',
        'hits',
        'eliminations',
        'botDeaths',
        'botUncreditedDeaths',
        'playerDeaths',
        'downSmashLandings',
        'replayChecks',
      ]) target[field] += source[field];
      for (const [key, count] of Object.entries(source.movementInputs)) {
        target.movementInputs[key] += count;
      }
      for (const [key, count] of source.movementActions) {
        incrementMetricCount(target.movementActions, key, count);
      }
      for (const [key, count] of source.mapEvents) {
        incrementMetricCount(target.mapEvents, key, count);
      }
      target.hashes.add(result.finalHash);
    }
    this.#completedCases += 1;
    this.#totalEvents += context.eventCount;
    this.#active = null;
  }

  failCase(context) {
    this.#assertUsable();
    if (this.#active !== null && this.#active.seed !== context.seed) {
      throw new Error('Bot capability failure 与活动 case 不一致。');
    }
    incrementMetricCount(
      this.#failureNames,
      assertNonEmptyString(context.failure.name, 'Bot capability failure.name'),
    );
    this.#failedCases += 1;
    this.#active = null;
  }

  getResult() {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('活动 case 完成前不能导出 Bot capability 指标。');
    const difficulties = BOT_DIFFICULTY_IDS.map((id) => (
      finishArenaBotDifficultyMetricState(this.#stats.get(id))
    ));
    const policy = createArenaBotCapabilityGatePolicy({
      difficulties,
      completedCases: this.#completedCases,
      replaySeedCount: this.#replaySeeds.size,
      gatePolicy: this.#gatePolicy,
    });
    return cloneFrozenData({
      gate: createArenaMetricGate(policy.checks),
      denominators: {
        plannedPairedCases: this.#plannedCases,
        executedPairedCases: this.#completedCases + this.#failedCases,
        completedPairedCases: this.#completedCases,
        matchesPerDifficulty: this.#completedCases,
        totalCompletedMatches: this.#completedCases * BOT_DIFFICULTY_IDS.length,
        plannedReplaySeeds: this.#replaySeeds.size,
      },
      raw: {
        failedPairedCases: this.#failedCases,
        totalEvents: this.#totalEvents,
        failureNames: createSortedMetricCountRecord(this.#failureNames),
      },
      derived: {
        completionRate: metricRatioOrNull(
          this.#completedCases,
          this.#completedCases + this.#failedCases,
        ),
        scoreRateTolerance: policy.scoreRateTolerance,
        gatePolicy: policy.gatePolicy,
        difficulties,
      },
    }, 'ArenaBotCapabilityCollector result');
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#active = null;
    this.#gatePolicy = null;
    this.#replaySeeds.clear();
    for (const stats of this.#stats.values()) {
      stats.movementActions.clear();
      stats.mapEvents.clear();
      stats.hashes.clear();
    }
    this.#stats.clear();
    this.#failureNames.clear();
  }
}

export function createArenaBotCapabilityCollectorEntry() {
  return Object.freeze({
    id: ARENA_BOT_CAPABILITY_COLLECTOR_ID,
    version: ARENA_BOT_CAPABILITY_COLLECTOR_VERSION,
    validateParameters: createArenaBotCapabilityCollectorParameters,
    create: ({ definition, parameters }) => (
      new ArenaBotCapabilityCollector(definition, parameters)
    ),
  });
}
