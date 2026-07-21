import { assertNonEmptyString, cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  createSortedMetricCountRecord,
  incrementMetricCount,
  metricRatioOrNull,
} from './experiment-metric-utils.js';

export const ARENA_MATCH_SUMMARY_COLLECTOR_ID = 'arena.stage9.match-summary';
export const ARENA_MATCH_SUMMARY_COLLECTOR_VERSION = 1;

class ArenaMatchSummaryCollector {
  #plannedCases;
  #active;
  #completedCases;
  #failedCases;
  #totalTicks;
  #minimumTicks;
  #maximumTicks;
  #totalEvents;
  #totalInputFrames;
  #primaryPresses;
  #jumpPresses;
  #slamPresses;
  #eventCounts;
  #resultReasons;
  #winners;
  #failureNames;
  #finalHashes;
  #destroyed;

  constructor(definition) {
    this.#plannedCases = definition.getSeeds().length;
    this.#active = null;
    this.#completedCases = 0;
    this.#failedCases = 0;
    this.#totalTicks = 0;
    this.#minimumTicks = null;
    this.#maximumTicks = 0;
    this.#totalEvents = 0;
    this.#totalInputFrames = 0;
    this.#primaryPresses = 0;
    this.#jumpPresses = 0;
    this.#slamPresses = 0;
    this.#eventCounts = new Map();
    this.#resultReasons = new Map();
    this.#winners = new Map();
    this.#failureNames = new Map();
    this.#finalHashes = new Set();
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaMatchSummaryCollector 已销毁。');
  }

  beginCase(context) {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('ArenaMatchSummaryCollector 已有活动 case。');
    this.#active = {
      seed: context.seed,
      events: new Map(),
      eventCount: 0,
      inputFrames: 0,
      primaryPresses: 0,
      jumpPresses: 0,
      slamPresses: 0,
    };
  }

  observeStep(observation) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== observation.seed) {
      throw new Error('ArenaMatchSummaryCollector observation 没有对应活动 case。');
    }
    for (const event of observation.events) {
      const type = assertNonEmptyString(event.type, 'Arena match summary event.type');
      incrementMetricCount(this.#active.events, type);
      this.#active.eventCount += 1;
    }
    for (const frame of observation.inputFrames) {
      this.#active.inputFrames += 1;
      if (frame.primaryPressed) this.#active.primaryPresses += 1;
      if (frame.jumpPressed) this.#active.jumpPresses += 1;
      if (frame.slamPressed) this.#active.slamPresses += 1;
    }
  }

  completeCase(context) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== context.seed) {
      throw new Error('ArenaMatchSummaryCollector completion 没有对应活动 case。');
    }
    const result = context.result;
    const reason = assertNonEmptyString(result.reason, 'Arena match summary result.reason');
    const winner = result.winnerId === null
      ? 'draw'
      : assertNonEmptyString(result.winnerId, 'Arena match summary result.winnerId');
    this.#completedCases += 1;
    this.#totalTicks += context.ticks;
    this.#minimumTicks = this.#minimumTicks === null
      ? context.ticks
      : Math.min(this.#minimumTicks, context.ticks);
    this.#maximumTicks = Math.max(this.#maximumTicks, context.ticks);
    this.#totalEvents += this.#active.eventCount;
    this.#totalInputFrames += this.#active.inputFrames;
    this.#primaryPresses += this.#active.primaryPresses;
    this.#jumpPresses += this.#active.jumpPresses;
    this.#slamPresses += this.#active.slamPresses;
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
      throw new Error('ArenaMatchSummaryCollector failure 与活动 case 不一致。');
    }
    const failureName = assertNonEmptyString(
      context.failure.name,
      'Arena match summary failure.name',
    );
    this.#failedCases += 1;
    incrementMetricCount(this.#failureNames, failureName);
    this.#active = null;
  }

  getResult() {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('活动 case 完成前不能导出 match summary。');
    const executedCases = this.#completedCases + this.#failedCases;
    return cloneFrozenData({
      denominators: {
        plannedCases: this.#plannedCases,
        executedCases,
        completedCases: this.#completedCases,
        totalTicks: this.#totalTicks,
        totalInputFrames: this.#totalInputFrames,
      },
      raw: {
        failedCases: this.#failedCases,
        totalEvents: this.#totalEvents,
        primaryPresses: this.#primaryPresses,
        jumpPresses: this.#jumpPresses,
        slamPresses: this.#slamPresses,
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
        averageTicksPerCompletedCase: metricRatioOrNull(
          this.#totalTicks,
          this.#completedCases,
        ),
        averageEventsPerCompletedCase: metricRatioOrNull(
          this.#totalEvents,
          this.#completedCases,
        ),
        primaryPressRatePerInputFrame: metricRatioOrNull(
          this.#primaryPresses,
          this.#totalInputFrames,
        ),
      },
    }, 'ArenaMatchSummaryCollector result');
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#active = null;
    this.#eventCounts.clear();
    this.#resultReasons.clear();
    this.#winners.clear();
    this.#failureNames.clear();
    this.#finalHashes.clear();
  }
}

export function createArenaMatchSummaryCollectorEntry() {
  return Object.freeze({
    id: ARENA_MATCH_SUMMARY_COLLECTOR_ID,
    version: ARENA_MATCH_SUMMARY_COLLECTOR_VERSION,
    create: ({ definition }) => new ArenaMatchSummaryCollector(definition),
  });
}
