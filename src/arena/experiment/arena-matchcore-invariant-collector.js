import { assertNonEmptyString, cloneFrozenData } from '../rules/definition-utils.js';
import { createArenaMetricGate } from './metric-gate.js';
import { assertArenaExperimentReplaySeedsPlanned } from './experiment-seed-utils.js';
import {
  createSortedMetricCountRecord,
  incrementMetricCount,
  metricRatioOrNull,
} from './experiment-metric-utils.js';

export const ARENA_MATCHCORE_INVARIANT_COLLECTOR_ID =
  'arena.stage9.matchcore-invariants';
export const ARENA_MATCHCORE_INVARIANT_COLLECTOR_VERSION = 1;

class ArenaMatchCoreInvariantCollector {
  #plannedCases;
  #plannedReplaySeeds;
  #active;
  #completedCases;
  #failedCases;
  #verifiedReplays;
  #totalTicks;
  #minimumTicks;
  #maximumTicks;
  #totalEvents;
  #eventCounts;
  #resultReasons;
  #winners;
  #failureNames;
  #finalHashes;
  #destroyed;

  constructor(definition) {
    const plannedSeeds = definition.getSeeds();
    const replaySeeds = definition.workload.parameters.replaySeeds;
    if (!Array.isArray(replaySeeds)) {
      throw new TypeError('MatchCore invariant collector 需要 workload replaySeeds。');
    }
    assertArenaExperimentReplaySeedsPlanned(
      replaySeeds,
      plannedSeeds,
      'MatchCore invariant replay',
    );
    this.#plannedCases = plannedSeeds.length;
    this.#plannedReplaySeeds = new Set(replaySeeds);
    this.#active = null;
    this.#completedCases = 0;
    this.#failedCases = 0;
    this.#verifiedReplays = 0;
    this.#totalTicks = 0;
    this.#minimumTicks = null;
    this.#maximumTicks = 0;
    this.#totalEvents = 0;
    this.#eventCounts = new Map();
    this.#resultReasons = new Map();
    this.#winners = new Map();
    this.#failureNames = new Map();
    this.#finalHashes = new Set();
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaMatchCoreInvariantCollector 已销毁。');
  }

  beginCase(context) {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('MatchCore invariant collector 已有活动 case。');
    this.#active = {
      seed: context.seed,
      initialTick: context.initialSnapshot.tick,
      lastTick: context.initialSnapshot.tick,
      steps: 0,
      eventCount: 0,
      events: new Map(),
    };
  }

  observeStep(observation) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== observation.seed) {
      throw new Error('MatchCore invariant observation 没有对应活动 case。');
    }
    this.#active.steps += 1;
    this.#active.lastTick = observation.snapshot.tick;
    for (const event of observation.events) {
      const type = assertNonEmptyString(event.type, 'MatchCore invariant event.type');
      incrementMetricCount(this.#active.events, type);
      this.#active.eventCount += 1;
    }
  }

  completeCase(context) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== context.seed) {
      throw new Error('MatchCore invariant completion 没有对应活动 case。');
    }
    if (this.#active.eventCount !== context.eventCount) {
      throw new Error('MatchCore invariant collector 事件分母与 Runner 不一致。');
    }
    if (
      this.#active.lastTick !== context.ticks
      || this.#active.initialTick + this.#active.steps !== context.ticks
    ) {
      throw new Error('MatchCore invariant collector tick 分母与 Runner 不一致。');
    }
    if (typeof context.result.replayVerified !== 'boolean') {
      throw new TypeError('MatchCore invariant result.replayVerified 必须是布尔值。');
    }
    const replayExpected = this.#plannedReplaySeeds.has(context.seed);
    if (context.result.replayVerified !== replayExpected) {
      throw new Error(`MatchCore invariant seed ${context.seed} 回放验证状态与 Definition 不一致。`);
    }
    const reason = assertNonEmptyString(context.result.reason, 'MatchCore invariant result.reason');
    const winner = context.result.winnerId === null
      ? 'draw'
      : assertNonEmptyString(context.result.winnerId, 'MatchCore invariant result.winnerId');
    this.#completedCases += 1;
    if (context.result.replayVerified) this.#verifiedReplays += 1;
    this.#totalTicks += context.ticks;
    this.#minimumTicks = this.#minimumTicks === null
      ? context.ticks
      : Math.min(this.#minimumTicks, context.ticks);
    this.#maximumTicks = Math.max(this.#maximumTicks, context.ticks);
    this.#totalEvents += context.eventCount;
    for (const [type, count] of this.#active.events) {
      incrementMetricCount(this.#eventCounts, type, count);
    }
    incrementMetricCount(this.#resultReasons, reason);
    incrementMetricCount(this.#winners, winner);
    this.#finalHashes.add(context.finalHash);
    this.#active = null;
  }

  failCase(context) {
    this.#assertUsable();
    if (this.#active !== null && this.#active.seed !== context.seed) {
      throw new Error('MatchCore invariant failure 与活动 case 不一致。');
    }
    const failureName = assertNonEmptyString(
      context.failure.name,
      'MatchCore invariant failure.name',
    );
    this.#failedCases += 1;
    incrementMetricCount(this.#failureNames, failureName);
    this.#active = null;
  }

  getResult() {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('活动 case 完成前不能导出 MatchCore invariant 指标。');
    const executedCases = this.#completedCases + this.#failedCases;
    const allFinalHashesUnique = this.#completedCases === 0
      ? null
      : this.#finalHashes.size === this.#completedCases;
    return cloneFrozenData({
      gate: createArenaMetricGate([
        {
          id: 'replay.samples-verified',
          passed: this.#verifiedReplays === this.#plannedReplaySeeds.size,
        },
        {
          id: 'seed.final-hashes-unique',
          passed: allFinalHashesUnique === true,
        },
      ]),
      denominators: {
        plannedCases: this.#plannedCases,
        executedCases,
        completedCases: this.#completedCases,
        plannedReplaySamples: this.#plannedReplaySeeds.size,
        totalTicks: this.#totalTicks,
      },
      raw: {
        failedCases: this.#failedCases,
        verifiedReplays: this.#verifiedReplays,
        totalEvents: this.#totalEvents,
        minimumTicks: this.#minimumTicks,
        maximumTicks: this.#completedCases === 0 ? null : this.#maximumTicks,
        uniqueFinalHashes: this.#finalHashes.size,
        eventCounts: createSortedMetricCountRecord(this.#eventCounts),
        resultReasons: createSortedMetricCountRecord(this.#resultReasons),
        winners: createSortedMetricCountRecord(this.#winners),
        failureNames: createSortedMetricCountRecord(this.#failureNames),
      },
      derived: {
        completionRate: metricRatioOrNull(this.#completedCases, executedCases),
        replayVerificationRate: metricRatioOrNull(
          this.#verifiedReplays,
          this.#plannedReplaySeeds.size,
        ),
        averageTicksPerCompletedCase: metricRatioOrNull(
          this.#totalTicks,
          this.#completedCases,
        ),
        averageEventsPerCompletedCase: metricRatioOrNull(
          this.#totalEvents,
          this.#completedCases,
        ),
        allFinalHashesUnique,
      },
    }, 'ArenaMatchCoreInvariantCollector result');
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#active = null;
    this.#plannedReplaySeeds.clear();
    this.#eventCounts.clear();
    this.#resultReasons.clear();
    this.#winners.clear();
    this.#failureNames.clear();
    this.#finalHashes.clear();
  }
}

export function createArenaMatchCoreInvariantCollectorEntry() {
  return Object.freeze({
    id: ARENA_MATCHCORE_INVARIANT_COLLECTOR_ID,
    version: ARENA_MATCHCORE_INVARIANT_COLLECTOR_VERSION,
    create: ({ definition }) => new ArenaMatchCoreInvariantCollector(definition),
  });
}
