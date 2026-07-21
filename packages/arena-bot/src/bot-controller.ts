import {
  assertKnownKeys,
  assertPlainRecord,
  createRng,
  normalizeInputFrame,
  type ArenaInputFrame,
  type DeterministicRng,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_PARTICIPANT_STATUS } from '@number-strategy-jump/arena-match';
import {
  getBotDifficultyProfile,
  type BotDifficultyId,
  type BotDifficultyProfile,
} from './bot-difficulty.js';
import {
  BOT_GOAL_ID,
  getArenaBotEvaluators,
  type BotGoalId,
  type BotGoalPlan,
} from './bot-goals.js';
import {
  BOT_MOBILITY_INTENT,
  selectBotMobilityIntent,
  type BotMobilityIntent,
} from './bot-mobility-policy.js';
import {
  BotMobilityScheduler,
  type BotMobilityDebugSnapshot,
} from './bot-mobility-scheduler.js';
import {
  cloneBotSourceSnapshot,
  createBotArenaView,
  createBotObservation,
  type BotArenaView,
  type BotObservation,
  type BotSourceSnapshot,
} from './bot-observation.js';
import { createBotPersonality, type BotPersonality } from './bot-personality.js';
import { selectHighestUtility, type UtilityDecision } from './utility-arbitrator.js';

const CONTROLLER_OPTION_KEYS = new Set([
  'participantId',
  'difficultyId',
  'behaviorSeed',
  'personalitySeed',
  'arena',
  'characterRadius',
  'maximumStepHeight',
]);

export interface BotControllerOptions {
  readonly participantId: string;
  readonly difficultyId: BotDifficultyId;
  readonly behaviorSeed: number;
  readonly personalitySeed: number;
  readonly arena: unknown;
  readonly characterRadius: number;
  readonly maximumStepHeight?: number;
}

export interface BotControllerDebugSnapshot {
  readonly participantId: string;
  readonly difficultyId: BotDifficultyId;
  readonly personality: BotPersonality;
  readonly lastCommandTick: number;
  readonly observedTick: number | null;
  readonly nextPlanTick: number;
  readonly pauseUntilTick: number;
  readonly goalId: BotGoalId | null;
  readonly goalScore: number | null;
  readonly mobilityIntent: BotMobilityIntent;
  readonly mobility: BotMobilityDebugSnapshot;
}

interface NormalizedBotControllerOptions {
  readonly participantId: string;
  readonly difficulty: BotDifficultyProfile;
  readonly behaviorSeed: number;
  readonly personalitySeed: number;
  readonly arena: BotArenaView;
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function readDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function readOptionalDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return undefined;
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function normalizeOptions(options: unknown): NormalizedBotControllerOptions {
  assertKnownKeys(options, CONTROLLER_OPTION_KEYS, 'BotController options');
  const record = assertPlainRecord(options, 'BotController options');
  const participantId = readDataProperty(record, 'participantId', 'BotController options');
  if (typeof participantId !== 'string' || participantId.length === 0) {
    throw new TypeError('Bot participantId 必须是非空字符串。');
  }
  const difficulty = getBotDifficultyProfile(
    readDataProperty(record, 'difficultyId', 'BotController options'),
  );
  const behaviorSeed = uint32(
    readDataProperty(record, 'behaviorSeed', 'BotController options'),
    'behaviorSeed',
  );
  const personalitySeed = uint32(
    readDataProperty(record, 'personalitySeed', 'BotController options'),
    'personalitySeed',
  );
  const arena = createBotArenaView(
    readDataProperty(record, 'arena', 'BotController options'),
    readDataProperty(record, 'characterRadius', 'BotController options'),
    readOptionalDataProperty(record, 'maximumStepHeight', 'BotController options'),
  );
  return Object.freeze({ participantId, difficulty, behaviorSeed, personalitySeed, arena });
}

export class BotController {
  #participantId: string;
  #difficulty: BotDifficultyProfile;
  #personality: BotPersonality;
  #rng: DeterministicRng;
  #arena: BotArenaView;
  #sourceSnapshots: BotSourceSnapshot[];
  #currentPlan: UtilityDecision<BotGoalPlan> | null;
  #directionOffsetRadians: number;
  #nextPlanTick: number;
  #pauseUntilTick: number;
  #actionTick: number;
  #mobilityScheduler: BotMobilityScheduler;
  #lastMobilityIntent: BotMobilityIntent;
  #lastCommandTick: number;
  #creatingInput: boolean;
  #destroyed: boolean;

  constructor(options: BotControllerOptions);
  constructor(options: unknown) {
    const normalized = normalizeOptions(options);
    const personality = createBotPersonality(normalized.personalitySeed);
    const rng = createRng(normalized.behaviorSeed);
    const mobilityScheduler = new BotMobilityScheduler({
      minimumIntervalTicks: normalized.difficulty.minimumMobilityIntervalTicks,
      crouchHoldTicks: normalized.difficulty.crouchHoldTicks,
    });
    this.#participantId = normalized.participantId;
    this.#difficulty = normalized.difficulty;
    this.#personality = personality;
    this.#rng = rng;
    this.#arena = normalized.arena;
    this.#sourceSnapshots = [];
    this.#currentPlan = null;
    this.#directionOffsetRadians = 0;
    this.#nextPlanTick = 0;
    this.#pauseUntilTick = 0;
    this.#actionTick = -1;
    this.#mobilityScheduler = mobilityScheduler;
    this.#lastMobilityIntent = BOT_MOBILITY_INTENT.NONE;
    this.#lastCommandTick = -1;
    this.#creatingInput = false;
    this.#destroyed = false;
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('BotController 已销毁。');
  }

  #prepareObservation(snapshot: unknown): Readonly<{
    source: BotSourceSnapshot;
    observation: BotObservation;
  }> {
    const source = cloneBotSourceSnapshot(snapshot);
    if (this.#lastCommandTick >= 0 && source.tick !== this.#lastCommandTick + 1) {
      throw new RangeError(
        `BotController tick 必须连续：上次 ${this.#lastCommandTick}，本次 ${source.tick}。`,
      );
    }
    const maximum = this.#difficulty.observationDelayTicks + 2;
    const shiftOffset = this.#sourceSnapshots.length >= maximum ? 1 : 0;
    const prospectiveLength = Math.min(this.#sourceSnapshots.length + 1, maximum);
    const delayedIndex = Math.max(
      0,
      prospectiveLength - 1 - this.#difficulty.observationDelayTicks,
    );
    const existingIndex = delayedIndex + shiftOffset;
    const delayedSnapshot = existingIndex < this.#sourceSnapshots.length
      ? this.#sourceSnapshots[existingIndex] as BotSourceSnapshot
      : source;
    const observation = createBotObservation({
      commandSnapshot: source,
      delayedSnapshot,
      selfId: this.#participantId,
      arena: this.#arena,
    });
    return { source, observation };
  }

  #commitSourceSnapshot(source: BotSourceSnapshot): void {
    this.#sourceSnapshots.push(source);
    const maximum = this.#difficulty.observationDelayTicks + 2;
    if (this.#sourceSnapshots.length > maximum) this.#sourceSnapshots.shift();
  }

  #replan(observation: BotObservation): void {
    const decision = selectHighestUtility(getArenaBotEvaluators(), {
      observation,
      profile: this.#difficulty,
      personality: this.#personality,
    });
    this.#currentPlan = decision;
    this.#directionOffsetRadians = (
      this.#rng.next() * 2 - 1
    ) * this.#difficulty.directionJitterRadians;
    const interval = Math.max(
      1,
      this.#difficulty.replanIntervalTicks + this.#rng.int(
        -this.#difficulty.replanJitterTicks,
        this.#difficulty.replanJitterTicks,
      ),
    );
    this.#nextPlanTick = observation.commandTick + interval;
    this.#actionTick = decision.plan.actionCandidate
      && this.#rng.next() < this.#difficulty.actionCommitChance
      ? observation.commandTick
      : -1;
    const canMove = observation.self.status === ARENA_PARTICIPANT_STATUS.ACTIVE
      && observation.self.hitstunTicks === 0;
    this.#lastMobilityIntent = selectBotMobilityIntent({ observation, decision });
    this.#mobilityScheduler.schedule(
      observation.commandTick,
      this.#lastMobilityIntent,
      this.#lastMobilityIntent !== BOT_MOBILITY_INTENT.NONE
        && this.#rng.next() < this.#difficulty.actionCommitChance,
      canMove,
    );
    if (
      decision.goalId !== BOT_GOAL_ID.RECOVER_EDGE
      && decision.goalId !== BOT_GOAL_ID.AVOID_MAP_HAZARD
      && decision.goalId !== BOT_GOAL_ID.EVADE_THREAT
      && decision.goalId !== BOT_GOAL_ID.ACQUIRE_EQUIPMENT
      && decision.goalId !== BOT_GOAL_ID.ATTACK
      && this.#rng.next() < this.#difficulty.shortPauseChance
    ) {
      this.#pauseUntilTick = observation.commandTick
        + this.#rng.int(2, this.#difficulty.maximumPauseTicks);
    }
  }

  #createFrame(observation: BotObservation): ArenaInputFrame {
    if (!this.#currentPlan || observation.commandTick >= this.#nextPlanTick) {
      this.#replan(observation);
    }
    const currentPlan = this.#currentPlan;
    if (!currentPlan) throw new Error('BotController 规划未产生决策。');
    let moveX = 0;
    let moveZ = 0;
    if (
      observation.commandTick >= this.#pauseUntilTick
      && currentPlan.plan.speedScale > 0
    ) {
      const dx = currentPlan.plan.target.x - observation.self.position.x;
      const dz = currentPlan.plan.target.z - observation.self.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 1e-6) {
        const cosine = Math.cos(this.#directionOffsetRadians);
        const sine = Math.sin(this.#directionOffsetRadians);
        const directionX = dx / distance;
        const directionZ = dz / distance;
        const magnitude = this.#difficulty.maximumInputMagnitude
          * currentPlan.plan.speedScale;
        moveX = (directionX * cosine - directionZ * sine) * magnitude;
        moveZ = (directionX * sine + directionZ * cosine) * magnitude;
      }
    }
    const primaryPressed = observation.commandTick === this.#actionTick;
    const canMove = observation.self.status === ARENA_PARTICIPANT_STATUS.ACTIVE
      && observation.self.hitstunTicks === 0;
    const mobility = this.#mobilityScheduler.sample(observation.commandTick, canMove);
    return normalizeInputFrame({
      tick: observation.commandTick,
      participantId: this.#participantId,
      moveX,
      moveZ,
      primaryPressed,
      primaryHeld: primaryPressed,
      jumpPressed: mobility.jumpPressed,
      jumpHeld: mobility.jumpHeld,
      slamPressed: mobility.slamPressed,
    }, {
      expectedTick: observation.commandTick,
      participantIds: [this.#participantId],
    });
  }

  createInput(snapshot: unknown): ArenaInputFrame {
    this.#assertUsable();
    if (this.#creatingInput) throw new Error('BotController createInput 不允许重入。');
    this.#creatingInput = true;
    let internalPhase = false;
    try {
      const prepared = this.#prepareObservation(snapshot);
      this.#assertUsable();
      internalPhase = true;
      const frame = this.#createFrame(prepared.observation);
      this.#commitSourceSnapshot(prepared.source);
      this.#lastCommandTick = prepared.observation.commandTick;
      return frame;
    } catch (error) {
      if (internalPhase && !this.#destroyed) this.#destroyOwnedState();
      throw error;
    } finally {
      this.#creatingInput = false;
    }
  }

  getDebugSnapshot(): BotControllerDebugSnapshot {
    this.#assertUsable();
    const delayedIndex = Math.max(
      0,
      this.#sourceSnapshots.length - 1 - this.#difficulty.observationDelayTicks,
    );
    return Object.freeze({
      participantId: this.#participantId,
      difficultyId: this.#difficulty.id,
      personality: this.#personality,
      lastCommandTick: this.#lastCommandTick,
      observedTick: this.#sourceSnapshots[delayedIndex]?.tick ?? null,
      nextPlanTick: this.#nextPlanTick,
      pauseUntilTick: this.#pauseUntilTick,
      goalId: this.#currentPlan ? this.#currentPlan.goalId as BotGoalId : null,
      goalScore: this.#currentPlan?.score ?? null,
      mobilityIntent: this.#lastMobilityIntent,
      mobility: this.#mobilityScheduler.getDebugSnapshot(),
    });
  }

  #destroyOwnedState(): void {
    this.#destroyed = true;
    this.#sourceSnapshots.length = 0;
    this.#currentPlan = null;
    this.#mobilityScheduler.destroy();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyOwnedState();
  }
}
