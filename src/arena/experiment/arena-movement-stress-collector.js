import { STAGE6_MOVEMENT_ACTION_ID } from '../content/stage6-movement-actions.js';
import { assertNonEmptyString, cloneFrozenData } from '../rules/definition-utils.js';
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

export const ARENA_MOVEMENT_STRESS_COLLECTOR_ID = 'arena.stage9.movement-stress';
export const ARENA_MOVEMENT_STRESS_COLLECTOR_VERSION = 1;

const REQUIRED_ACTIONS = Object.freeze([
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN,
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE,
  STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH,
]);

class ArenaMovementStressCollector {
  #plannedCases;
  #replaySeeds;
  #active;
  #completedCases;
  #failedCases;
  #verifiedReplays;
  #totalTicks;
  #totalEvents;
  #inputCounts;
  #actionCounts;
  #eventCounts;
  #downSmashLandings;
  #failureNames;
  #finalHashes;
  #destroyed;

  constructor(definition) {
    const plannedSeeds = definition.getSeeds();
    const replaySeeds = cloneArenaExperimentReplaySeeds(
      definition.workload.parameters.replaySeeds,
      'Movement stress collector replaySeeds',
    );
    assertArenaExperimentReplaySeedsPlanned(
      replaySeeds,
      plannedSeeds,
      'Movement stress replay',
    );
    this.#plannedCases = plannedSeeds.length;
    this.#replaySeeds = new Set(replaySeeds);
    this.#active = null;
    this.#completedCases = 0;
    this.#failedCases = 0;
    this.#verifiedReplays = 0;
    this.#totalTicks = 0;
    this.#totalEvents = 0;
    this.#inputCounts = new Map();
    this.#actionCounts = new Map();
    this.#eventCounts = new Map();
    this.#downSmashLandings = 0;
    this.#failureNames = new Map();
    this.#finalHashes = new Set();
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaMovementStressCollector 已销毁。');
  }

  beginCase(context) {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('Movement stress collector 已有活动 case。');
    this.#active = {
      seed: context.seed,
      inputs: new Map(),
      actions: new Map(),
      events: new Map(),
      eventCount: 0,
      downSmashLandings: 0,
      previousJumpHeld: new Map(),
    };
  }

  observeStep(observation) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== observation.seed) {
      throw new Error('Movement stress observation 没有对应活动 case。');
    }
    const activeIds = new Set(observation.snapshot.activeParticipantIds);
    for (const frame of observation.inputFrames) {
      const previousJumpHeld = this.#active.previousJumpHeld.get(frame.participantId) ?? false;
      this.#active.previousJumpHeld.set(frame.participantId, frame.jumpHeld);
      if (!activeIds.has(frame.participantId)) continue;
      const magnitude = Math.hypot(frame.moveX, frame.moveZ);
      incrementMetricCount(this.#active.inputs, magnitude < 0.65 ? 'walk' : 'run');
      if (frame.jumpPressed) incrementMetricCount(this.#active.inputs, 'jumpPressed');
      if (frame.jumpHeld && !frame.jumpPressed && !previousJumpHeld) {
        incrementMetricCount(this.#active.inputs, 'crouchHoldStarted');
      }
      if (frame.slamPressed) incrementMetricCount(this.#active.inputs, 'slamPressed');
      if (frame.primaryPressed) incrementMetricCount(this.#active.inputs, 'primaryPressed');
    }
    for (const event of observation.events) {
      const type = assertNonEmptyString(event.type, 'Movement stress event.type');
      incrementMetricCount(this.#active.events, type);
      this.#active.eventCount += 1;
      if (type === 'ActionStarted') incrementMetricCount(this.#active.actions, event.action);
      if (type === 'DownSmashLanded') this.#active.downSmashLandings += 1;
    }
  }

  completeCase(context) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== context.seed) {
      throw new Error('Movement stress completion 没有对应活动 case。');
    }
    if (this.#active.eventCount !== context.eventCount) {
      throw new Error('Movement stress collector 事件分母与 Runner 不一致。');
    }
    const expectedReplay = this.#replaySeeds.has(context.seed);
    if (context.result.replayVerified !== expectedReplay) {
      throw new Error(`Movement stress seed ${context.seed} 回放状态与 Definition 不一致。`);
    }
    this.#completedCases += 1;
    if (context.result.replayVerified) this.#verifiedReplays += 1;
    this.#totalTicks += context.ticks;
    this.#totalEvents += context.eventCount;
    for (const [key, count] of this.#active.inputs) {
      incrementMetricCount(this.#inputCounts, key, count);
    }
    for (const [key, count] of this.#active.actions) {
      incrementMetricCount(this.#actionCounts, key, count);
    }
    for (const [key, count] of this.#active.events) {
      incrementMetricCount(this.#eventCounts, key, count);
    }
    this.#downSmashLandings += this.#active.downSmashLandings;
    this.#finalHashes.add(context.finalHash);
    this.#active = null;
  }

  failCase(context) {
    this.#assertUsable();
    if (this.#active !== null && this.#active.seed !== context.seed) {
      throw new Error('Movement stress failure 与活动 case 不一致。');
    }
    incrementMetricCount(
      this.#failureNames,
      assertNonEmptyString(context.failure.name, 'Movement stress failure.name'),
    );
    this.#failedCases += 1;
    this.#active = null;
  }

  getResult() {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('活动 case 完成前不能导出 Movement stress 指标。');
    const downSmashStarts = this.#actionCounts.get(STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH) ?? 0;
    const allFinalHashesUnique = this.#completedCases > 0
      && this.#finalHashes.size === this.#completedCases;
    return cloneFrozenData({
      gate: createArenaMetricGate([
        {
          id: 'replay.samples-verified',
          passed: this.#verifiedReplays === this.#replaySeeds.size,
        },
        { id: 'seed.final-hashes-unique', passed: allFinalHashesUnique },
        ...REQUIRED_ACTIONS.map((actionId) => ({
          id: `actions.${actionId}.covered`,
          passed: (this.#actionCounts.get(actionId) ?? 0) > 0,
        })),
        { id: 'inputs.walk.covered', passed: (this.#inputCounts.get('walk') ?? 0) > 0 },
        { id: 'inputs.run.covered', passed: (this.#inputCounts.get('run') ?? 0) > 0 },
        { id: 'down-smash.landing-covered', passed: this.#downSmashLandings > 0 },
        {
          id: 'down-smash.landings-bounded-by-starts',
          passed: this.#downSmashLandings <= downSmashStarts,
        },
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
        downSmashLandings: this.#downSmashLandings,
        inputCounts: createSortedMetricCountRecord(this.#inputCounts),
        actionCounts: createSortedMetricCountRecord(this.#actionCounts),
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
        allFinalHashesUnique: this.#completedCases === 0 ? null : allFinalHashesUnique,
      },
    }, 'ArenaMovementStressCollector result');
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#active = null;
    this.#replaySeeds.clear();
    this.#inputCounts.clear();
    this.#actionCounts.clear();
    this.#eventCounts.clear();
    this.#failureNames.clear();
    this.#finalHashes.clear();
  }
}

export function createArenaMovementStressCollectorEntry() {
  return Object.freeze({
    id: ARENA_MOVEMENT_STRESS_COLLECTOR_ID,
    version: ARENA_MOVEMENT_STRESS_COLLECTOR_VERSION,
    create: ({ definition }) => new ArenaMovementStressCollector(definition),
  });
}
