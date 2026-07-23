import { BOT_DIFFICULTY_IDS } from '@number-strategy-jump/arena-bot';
import type { BotDifficultyId } from '@number-strategy-jump/arena-bot';
import { createArenaV1CharacterRegistry } from '@number-strategy-jump/arena-v1-content';
import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type { ArenaInputFrame, PlainRecord } from '@number-strategy-jump/arena-contracts';
import { createArenaMatchConfig } from '@number-strategy-jump/arena-match';
import type { ArenaAuthorityEvent } from '@number-strategy-jump/arena-match';
import {
  assertArenaExperimentReplaySeedsPlanned,
  cloneArenaExperimentReplaySeeds,
} from '@number-strategy-jump/arena-experiment';
import type {
  ArenaExperimentDefinition,
  ArenaMetricCollectorBeginContext,
  ArenaMetricCollectorCompleteContext,
  ArenaMetricCollectorFactoryOptions,
  ArenaMetricCollectorFailureContext,
  ArenaMetricCollectorStepContext,
  ArenaSimulationSnapshot,
} from '@number-strategy-jump/arena-experiment';
import { createArenaMetricGate } from '@number-strategy-jump/arena-experiment';
import {
  createSortedMetricCountRecord,
  incrementMetricCount,
  metricRatioOrNull,
} from '@number-strategy-jump/arena-experiment';
import {
  ARENA_BOT_CAPABILITY_MAP_EVENT_TYPES,
  ARENA_BOT_CAPABILITY_PARTICIPANT_ID,
  ARENA_BOT_CAPABILITY_DEFAULT_GATE_POLICY,
  createArenaBotCapabilityGatePolicy,
  createArenaBotCapabilityGatePolicyDefinition,
  createArenaBotDifficultyMetricState,
  finishArenaBotDifficultyMetricState,
} from './arena-bot-capability-metrics.js';
import type { ArenaBotDifficultyMetricState } from './arena-bot-capability-metrics.js';
import {
  ARENA_BOT_CAPABILITY_COLLECTOR_ID,
  ARENA_BOT_CAPABILITY_COLLECTOR_VERSION,
} from '@number-strategy-jump/arena-balance';

export {
  ARENA_BOT_CAPABILITY_COLLECTOR_ID,
  ARENA_BOT_CAPABILITY_COLLECTOR_VERSION,
} from '@number-strategy-jump/arena-balance';
export const ARENA_BOT_CAPABILITY_COLLECTOR_DEFAULT_PARAMETERS = Object.freeze({
  gatePolicy: ARENA_BOT_CAPABILITY_DEFAULT_GATE_POLICY,
});

const PARAMETER_KEYS = new Set(['gatePolicy']);

export function createArenaBotCapabilityCollectorParameters(value: unknown = {}) {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'ArenaBotCapabilityCollector parameters'),
    'ArenaBotCapabilityCollector parameters',
  );
  assertKnownKeys(source, PARAMETER_KEYS, 'ArenaBotCapabilityCollector parameters');
  return Object.freeze({
    gatePolicy: createArenaBotCapabilityGatePolicyDefinition(source.gatePolicy ?? {}),
  });
}

interface ArenaBotCapabilitySnapshot extends ArenaSimulationSnapshot {
  readonly difficultyId: BotDifficultyId;
  readonly matchTick: number;
}
interface ArenaBotCapabilityDifficultyResult {
  readonly difficultyId: BotDifficultyId;
  readonly ticks: number;
  readonly outcome: Readonly<{ readonly winnerId: string | null; readonly isDraw: boolean }>;
  readonly finalHash: string;
  readonly replayVerified: boolean;
}
type ArenaBotCapabilityCaseResult = PlainRecord & {
  readonly difficulties: readonly Readonly<ArenaBotCapabilityDifficultyResult>[];
};
interface ArenaBotCapabilityActiveCase {
  readonly seed: number;
  eventCount: number;
  readonly stats: Map<BotDifficultyId, ArenaBotDifficultyMetricState>;
}
const NUMERIC_STAT_FIELDS = Object.freeze([
  'matches', 'wins', 'draws', 'losses', 'ticks', 'actions', 'equipmentActions',
  'equipmentPickups', 'hits', 'eliminations', 'botDeaths', 'botUncreditedDeaths',
  'playerDeaths', 'downSmashLandings', 'replayChecks',
] as const);
type MovementInputField = keyof ArenaBotDifficultyMetricState['movementInputs'];

class ArenaBotCapabilityCollector {
  #plannedCases: number;
  #replaySeeds: Set<number>;
  #botRunInputThreshold: number;
  #gatePolicy: ReturnType<typeof createArenaBotCapabilityGatePolicyDefinition> | null;
  #active: ArenaBotCapabilityActiveCase | null;
  #stats: Map<BotDifficultyId, ArenaBotDifficultyMetricState>;
  #completedCases: number;
  #failedCases: number;
  #totalEvents: number;
  #failureNames: Map<string, number>;
  #destroyed: boolean;

  constructor(definition: ArenaExperimentDefinition, parameters: unknown) {
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
    const matchConfig = createArenaMatchConfig(definition.candidate.matchConfig);
    const botCharacterId = matchConfig.participantCharacters.find(
      ({ participantId }) => participantId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID,
    )?.definitionId;
    if (!botCharacterId) throw new Error('Bot capability collector 缺少 Bot 角色定义。');
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

  #requireGatePolicy() {
    this.#assertUsable();
    if (!this.#gatePolicy) throw new Error('ArenaBotCapabilityCollector 缺少 gate policy。');
    return this.#gatePolicy;
  }

  beginCase(context: Readonly<ArenaMetricCollectorBeginContext>) {
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

  observeStep(observation: Readonly<ArenaMetricCollectorStepContext<
    ArenaBotCapabilitySnapshot,
    ArenaInputFrame,
    ArenaAuthorityEvent
  >>) {
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
        const action = assertNonEmptyString(event.action, 'Bot capability ActionStarted.action');
        if (action.startsWith('movement.')) {
          incrementMetricCount(stats.movementActions, action);
        } else if (action !== 'base-push') stats.equipmentActions += 1;
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
      if ((ARENA_BOT_CAPABILITY_MAP_EVENT_TYPES as readonly string[]).includes(type)) {
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

  completeCase(context: Readonly<ArenaMetricCollectorCompleteContext<
    ArenaBotCapabilitySnapshot,
    ArenaBotCapabilityCaseResult
  >>) {
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
      if (!difficultyId || !result) throw new Error('Bot capability result 难度项缺失。');
      if (result.difficultyId !== difficultyId) {
        throw new Error(`Bot capability result 难度顺序错误：${result.difficultyId}。`);
      }
      if (result.replayVerified !== expectedReplay) {
        throw new Error(`Bot capability ${difficultyId} 回放状态与 Definition 不一致。`);
      }
      const source = this.#active.stats.get(difficultyId);
      const target = this.#stats.get(difficultyId);
      if (!source || !target) throw new Error(`Bot capability 缺少 ${difficultyId} 指标状态。`);
      source.matches = 1;
      source.ticks = result.ticks;
      source.replayChecks = result.replayVerified ? 1 : 0;
      source.hashes.add(result.finalHash);
      if (result.outcome.isDraw) source.draws = 1;
      else if (
        result.outcome.winnerId === ARENA_BOT_CAPABILITY_PARTICIPANT_ID
      ) source.wins = 1;
      else source.losses = 1;
      for (const field of NUMERIC_STAT_FIELDS) target[field] += source[field];
      for (const [key, count] of Object.entries(source.movementInputs) as Array<[
        MovementInputField,
        number,
      ]>) {
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

  failCase(context: Readonly<ArenaMetricCollectorFailureContext<ArenaBotCapabilitySnapshot>>) {
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
      finishArenaBotDifficultyMetricState(this.#stats.get(id) ?? (() => {
        throw new Error(`Bot capability 缺少 ${id} 汇总指标。`);
      })())
    ));
    const policy = createArenaBotCapabilityGatePolicy({
      difficulties,
      completedCases: this.#completedCases,
      replaySeedCount: this.#replaySeeds.size,
      gatePolicy: this.#requireGatePolicy(),
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
    create: ({ definition, parameters }: ArenaMetricCollectorFactoryOptions) => (
      new ArenaBotCapabilityCollector(definition, parameters)
    ),
  });
}
