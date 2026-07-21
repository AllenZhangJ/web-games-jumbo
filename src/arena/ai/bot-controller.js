import { ARENA_PARTICIPANT_STATUS } from '../config.js';
import { normalizeInputFrame } from '@number-strategy-jump/arena-contracts';
import { createRng } from '@number-strategy-jump/arena-contracts';
import { getBotDifficultyProfile } from './bot-difficulty.js';
import { getArenaBotEvaluators, BOT_GOAL_ID } from './bot-goals.js';
import {
  cloneBotSourceSnapshot,
  createBotArenaView,
  createBotObservation,
} from './bot-observation.js';
import { createBotPersonality } from './bot-personality.js';
import { selectHighestUtility } from './utility-arbitrator.js';
import {
  BOT_MOBILITY_INTENT,
  selectBotMobilityIntent,
} from './bot-mobility-policy.js';
import { BotMobilityScheduler } from './bot-mobility-scheduler.js';

function uint32(value, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value;
}

export class BotController {
  #participantId;
  #difficulty;
  #personality;
  #rng;
  #arena;
  #sourceSnapshots;
  #currentPlan;
  #directionOffsetRadians;
  #nextPlanTick;
  #pauseUntilTick;
  #actionTick;
  #mobilityScheduler;
  #lastMobilityIntent;
  #lastCommandTick;
  #destroyed;

  constructor({
    participantId,
    difficultyId,
    behaviorSeed,
    personalitySeed,
    arena,
    characterRadius,
    maximumStepHeight,
  }) {
    if (typeof participantId !== 'string' || participantId.length === 0) {
      throw new TypeError('Bot participantId 必须是非空字符串。');
    }
    this.#participantId = participantId;
    this.#difficulty = getBotDifficultyProfile(difficultyId);
    this.#personality = createBotPersonality(uint32(personalitySeed, 'personalitySeed'));
    this.#rng = createRng(uint32(behaviorSeed, 'behaviorSeed'));
    this.#arena = createBotArenaView(arena, characterRadius, maximumStepHeight);
    this.#sourceSnapshots = [];
    this.#currentPlan = null;
    this.#directionOffsetRadians = 0;
    this.#nextPlanTick = 0;
    this.#pauseUntilTick = 0;
    this.#actionTick = -1;
    this.#mobilityScheduler = new BotMobilityScheduler({
      minimumIntervalTicks: this.#difficulty.minimumMobilityIntervalTicks,
      crouchHoldTicks: this.#difficulty.crouchHoldTicks,
    });
    this.#lastMobilityIntent = BOT_MOBILITY_INTENT.NONE;
    this.#lastCommandTick = -1;
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('BotController 已销毁。');
  }

  #capture(snapshot) {
    const source = cloneBotSourceSnapshot(snapshot);
    if (this.#lastCommandTick >= 0 && source.tick !== this.#lastCommandTick + 1) {
      throw new RangeError(
        `BotController tick 必须连续：上次 ${this.#lastCommandTick}，本次 ${source.tick}。`,
      );
    }
    this.#sourceSnapshots.push(source);
    const maximum = this.#difficulty.observationDelayTicks + 2;
    if (this.#sourceSnapshots.length > maximum) this.#sourceSnapshots.shift();
    return source;
  }

  #observation(commandSnapshot) {
    const delayedIndex = Math.max(
      0,
      this.#sourceSnapshots.length - 1 - this.#difficulty.observationDelayTicks,
    );
    return createBotObservation({
      commandSnapshot,
      delayedSnapshot: this.#sourceSnapshots[delayedIndex],
      selfId: this.#participantId,
      arena: this.#arena,
    });
  }

  #replan(observation) {
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
    this.#mobilityScheduler.schedule({
      tick: observation.commandTick,
      intent: this.#lastMobilityIntent,
      committed: this.#lastMobilityIntent !== BOT_MOBILITY_INTENT.NONE
        && this.#rng.next() < this.#difficulty.actionCommitChance,
      canMove,
    });
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

  createInput(snapshot) {
    this.#assertUsable();
    const commandSnapshot = this.#capture(snapshot);
    const observation = this.#observation(commandSnapshot);
    if (!this.#currentPlan || observation.commandTick >= this.#nextPlanTick) {
      this.#replan(observation);
    }
    let moveX = 0;
    let moveZ = 0;
    if (
      observation.commandTick >= this.#pauseUntilTick
      && this.#currentPlan.plan.speedScale > 0
    ) {
      const dx = this.#currentPlan.plan.target.x - observation.self.position.x;
      const dz = this.#currentPlan.plan.target.z - observation.self.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 1e-6) {
        const cosine = Math.cos(this.#directionOffsetRadians);
        const sine = Math.sin(this.#directionOffsetRadians);
        const directionX = dx / distance;
        const directionZ = dz / distance;
        const magnitude = this.#difficulty.maximumInputMagnitude
          * this.#currentPlan.plan.speedScale;
        moveX = (directionX * cosine - directionZ * sine) * magnitude;
        moveZ = (directionX * sine + directionZ * cosine) * magnitude;
      }
    }
    const primaryPressed = observation.commandTick === this.#actionTick;
    const canMove = observation.self.status === ARENA_PARTICIPANT_STATUS.ACTIVE
      && observation.self.hitstunTicks === 0;
    const mobility = this.#mobilityScheduler.sample(observation.commandTick, { canMove });
    const frame = normalizeInputFrame({
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
    this.#lastCommandTick = observation.commandTick;
    return frame;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    const delayedIndex = Math.max(
      0,
      this.#sourceSnapshots.length - 1 - this.#difficulty.observationDelayTicks,
    );
    return {
      participantId: this.#participantId,
      difficultyId: this.#difficulty.id,
      personality: { ...this.#personality },
      lastCommandTick: this.#lastCommandTick,
      observedTick: this.#sourceSnapshots[delayedIndex]?.tick ?? null,
      nextPlanTick: this.#nextPlanTick,
      pauseUntilTick: this.#pauseUntilTick,
      goalId: this.#currentPlan?.goalId ?? null,
      goalScore: this.#currentPlan?.score ?? null,
      mobilityIntent: this.#lastMobilityIntent,
      mobility: this.#mobilityScheduler.getDebugSnapshot(),
    };
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#sourceSnapshots.length = 0;
    this.#currentPlan = null;
    this.#mobilityScheduler.destroy();
  }
}
