import {
  assertIntegerAtLeast,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type { ArenaInputFrame, PlainRecord } from '@number-strategy-jump/arena-contracts';
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
import type { ArenaAuthorityEvent } from '@number-strategy-jump/arena-match';
import { createArenaMetricGate } from '@number-strategy-jump/arena-experiment';
import {
  createSortedMetricCountRecord,
  incrementMetricCount,
  metricRatioOrNull,
} from '@number-strategy-jump/arena-experiment';

export const ARENA_MAP_TIMELINE_COLLECTOR_ID = 'arena.stage9.map-timeline';
export const ARENA_MAP_TIMELINE_COLLECTOR_VERSION = 1;

type ArenaMapTimelineCaseResult = PlainRecord & {
  readonly replayVerified: boolean;
  readonly eventCounts: Readonly<Record<string, number>>;
};
interface ArenaMapTimelineActiveCase {
  readonly seed: number;
  readonly events: Map<string, number>;
  eventCount: number;
}

function cloneExpectedEventCounts(value: unknown): Readonly<Record<string, number>> {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'Map timeline collector expectedEventCounts'),
    'Map timeline collector expectedEventCounts',
  );
  return Object.freeze(Object.fromEntries(Object.entries(source).map(([type, count]) => [
    assertNonEmptyString(type, 'Map timeline collector expected event type'),
    assertIntegerAtLeast(count, 0, `Map timeline collector expectedEventCounts.${type}`),
  ])));
}

class ArenaMapTimelineCollector {
  #plannedCases: number;
  #replaySeeds: Set<number>;
  #expectedEventCounts: Readonly<Record<string, number>>;
  #active: ArenaMapTimelineActiveCase | null;
  #completedCases: number;
  #failedCases: number;
  #verifiedReplays: number;
  #totalTicks: number;
  #totalEvents: number;
  #eventCounts: Map<string, number>;
  #failureNames: Map<string, number>;
  #finalHashes: Set<string>;
  #destroyed: boolean;

  constructor(definition: ArenaExperimentDefinition) {
    const plannedSeeds = definition.getSeeds();
    const replaySeeds = cloneArenaExperimentReplaySeeds(
      definition.workload.parameters.replaySeeds,
      'Map timeline collector replaySeeds',
    );
    assertArenaExperimentReplaySeedsPlanned(
      replaySeeds,
      plannedSeeds,
      'Map timeline replay',
    );
    this.#replaySeeds = new Set(replaySeeds);
    this.#expectedEventCounts = cloneExpectedEventCounts(
      definition.workload.parameters.expectedEventCounts,
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

  beginCase(context: Readonly<ArenaMetricCollectorBeginContext>) {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('Map timeline collector 已有活动 case。');
    this.#active = { seed: context.seed, events: new Map(), eventCount: 0 };
  }

  observeStep(observation: Readonly<ArenaMetricCollectorStepContext<
    ArenaSimulationSnapshot,
    ArenaInputFrame,
    ArenaAuthorityEvent
  >>) {
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

  completeCase(context: Readonly<ArenaMetricCollectorCompleteContext<
    ArenaSimulationSnapshot,
    ArenaMapTimelineCaseResult
  >>) {
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

  failCase(context: Readonly<ArenaMetricCollectorFailureContext>) {
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
    create: ({ definition }: ArenaMetricCollectorFactoryOptions) => (
      new ArenaMapTimelineCollector(definition)
    ),
  });
}
