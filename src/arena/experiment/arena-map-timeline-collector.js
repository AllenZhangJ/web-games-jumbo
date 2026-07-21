import {
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';
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

export const ARENA_MAP_TIMELINE_COLLECTOR_ID = 'arena.stage9.map-timeline';
export const ARENA_MAP_TIMELINE_COLLECTOR_VERSION = 1;

class ArenaMapTimelineCollector {
  #plannedCases;
  #replaySeeds;
  #expectedEventCounts;
  #active;
  #completedCases;
  #failedCases;
  #verifiedReplays;
  #totalTicks;
  #totalEvents;
  #eventCounts;
  #failureNames;
  #finalHashes;
  #destroyed;

  constructor(definition) {
    const plannedSeeds = definition.getSeeds();
    this.#replaySeeds = new Set(cloneArenaExperimentReplaySeeds(
      definition.workload.parameters.replaySeeds,
      'Map timeline collector replaySeeds',
    ));
    assertArenaExperimentReplaySeedsPlanned(
      this.#replaySeeds,
      plannedSeeds,
      'Map timeline replay',
    );
    this.#expectedEventCounts = cloneFrozenData(
      definition.workload.parameters.expectedEventCounts,
      'Map timeline collector expectedEventCounts',
    );
    this.#plannedCases = plannedSeeds.length;
    this.#active = null;
    this.#completedCases = 0;
    this.#failedCases = 0;
    this.#verifiedReplays = 0;
    this.#totalTicks = 0;
    this.#totalEvents = 0;
    this.#eventCounts = new Map();
    this.#failureNames = new Map();
    this.#finalHashes = new Set();
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaMapTimelineCollector 已销毁。');
  }

  beginCase(context) {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('Map timeline collector 已有活动 case。');
    this.#active = { seed: context.seed, events: new Map(), eventCount: 0 };
  }

  observeStep(observation) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== observation.seed) {
      throw new Error('Map timeline observation 没有对应活动 case。');
    }
    for (const event of observation.events) {
      const type = assertNonEmptyString(event.type, 'Map timeline event.type');
      incrementMetricCount(this.#active.events, type);
      this.#active.eventCount += 1;
    }
  }

  completeCase(context) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== context.seed) {
      throw new Error('Map timeline completion 没有对应活动 case。');
    }
    if (this.#active.eventCount !== context.eventCount) {
      throw new Error('Map timeline collector 事件分母与 Runner 不一致。');
    }
    const expectedReplay = this.#replaySeeds.has(context.seed);
    if (context.result.replayVerified !== expectedReplay) {
      throw new Error(`Map timeline seed ${context.seed} 回放状态与 Definition 不一致。`);
    }
    const resultEventCounts = context.result.eventCounts;
    for (const [type, count] of this.#active.events) {
      if (resultEventCounts[type] !== count) {
        throw new Error(`Map timeline seed ${context.seed} ${type} 指标与 case 不一致。`);
      }
    }
    this.#completedCases += 1;
    if (context.result.replayVerified) this.#verifiedReplays += 1;
    this.#totalTicks += context.ticks;
    this.#totalEvents += context.eventCount;
    for (const [type, count] of this.#active.events) {
      incrementMetricCount(this.#eventCounts, type, count);
    }
    this.#finalHashes.add(context.finalHash);
    this.#active = null;
  }

  failCase(context) {
    this.#assertUsable();
    if (this.#active !== null && this.#active.seed !== context.seed) {
      throw new Error('Map timeline failure 与活动 case 不一致。');
    }
    incrementMetricCount(
      this.#failureNames,
      assertNonEmptyString(context.failure.name, 'Map timeline failure.name'),
    );
    this.#failedCases += 1;
    this.#active = null;
  }

  getResult() {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('活动 case 完成前不能导出 Map timeline 指标。');
    const eventChecks = Object.entries(this.#expectedEventCounts).map(([type, count]) => ({
      id: `events.${type}.exact`,
      passed: (this.#eventCounts.get(type) ?? 0) === count * this.#completedCases,
    }));
    const allFinalHashesUnique = this.#completedCases > 0
      && this.#finalHashes.size === this.#completedCases;
    return cloneFrozenData({
      gate: createArenaMetricGate([
        {
          id: 'replay.samples-verified',
          passed: this.#verifiedReplays === this.#replaySeeds.size,
        },
        { id: 'seed.final-hashes-unique', passed: allFinalHashesUnique },
        ...eventChecks,
      ]),
      denominators: {
        plannedCases: this.#plannedCases,
        executedCases: this.#completedCases + this.#failedCases,
        completedCases: this.#completedCases,
        plannedReplaySamples: this.#replaySeeds.size,
        totalTicks: this.#totalTicks,
      },
      raw: {
        failedCases: this.#failedCases,
        verifiedReplays: this.#verifiedReplays,
        totalEvents: this.#totalEvents,
        uniqueFinalHashes: this.#finalHashes.size,
        eventCounts: createSortedMetricCountRecord(this.#eventCounts),
        failureNames: createSortedMetricCountRecord(this.#failureNames),
      },
      derived: {
        completionRate: metricRatioOrNull(
          this.#completedCases,
          this.#completedCases + this.#failedCases,
        ),
        replayVerificationRate: metricRatioOrNull(
          this.#verifiedReplays,
          this.#replaySeeds.size,
        ),
        averageTicksPerCompletedCase: metricRatioOrNull(
          this.#totalTicks,
          this.#completedCases,
        ),
        averageEventsPerCompletedCase: metricRatioOrNull(
          this.#totalEvents,
          this.#completedCases,
        ),
        allFinalHashesUnique: this.#completedCases === 0 ? null : allFinalHashesUnique,
      },
    }, 'ArenaMapTimelineCollector result');
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#active = null;
    this.#replaySeeds.clear();
    this.#eventCounts.clear();
    this.#failureNames.clear();
    this.#finalHashes.clear();
  }
}

export function createArenaMapTimelineCollectorEntry() {
  return Object.freeze({
    id: ARENA_MAP_TIMELINE_COLLECTOR_ID,
    version: ARENA_MAP_TIMELINE_COLLECTOR_VERSION,
    create: ({ definition }) => new ArenaMapTimelineCollector(definition),
  });
}
