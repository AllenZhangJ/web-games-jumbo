import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { BOT_MOBILITY_INTENT } from './bot-mobility-policy.js';

const INTENTS: ReadonlySet<string> = new Set(Object.values(BOT_MOBILITY_INTENT));
const SCHEDULER_OPTION_KEYS = new Set(['minimumIntervalTicks', 'crouchHoldTicks']);

export interface BotMobilitySchedulerOptions {
  readonly minimumIntervalTicks: number;
  readonly crouchHoldTicks: number;
}

export interface BotMobilitySample {
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
  readonly slamPressed: boolean;
}

export interface BotMobilityDebugSnapshot {
  readonly nextMobilityTick: number;
  readonly jumpHoldUntilTick: number;
  readonly jumpPressedTick: number;
  readonly slamPressedTick: number;
  readonly lastSampleTick: number;
}

function positiveInteger(value: unknown, name: string, minimum = 1): number {
  const numeric = value as number;
  if (!Number.isSafeInteger(numeric) || numeric < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return numeric;
}

function tickValue(value: unknown, name: string): number {
  const numeric = value as number;
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return numeric;
}

function normalizeSchedulerOptions(options: unknown): BotMobilitySchedulerOptions {
  const copied = cloneFrozenData(options, 'BotMobilityScheduler options');
  assertKnownKeys(copied, SCHEDULER_OPTION_KEYS, 'BotMobilityScheduler options');
  const record = assertPlainRecord(copied, 'BotMobilityScheduler options');
  return Object.freeze({
    minimumIntervalTicks: positiveInteger(
      record.minimumIntervalTicks,
      'BotMobilityScheduler.minimumIntervalTicks',
      4,
    ),
    crouchHoldTicks: positiveInteger(
      record.crouchHoldTicks,
      'BotMobilityScheduler.crouchHoldTicks',
      2,
    ),
  });
}

export class BotMobilityScheduler {
  #minimumIntervalTicks;
  #crouchHoldTicks;
  #nextMobilityTick;
  #jumpPressedTick;
  #slamPressedTick;
  #jumpHoldUntilTick;
  #lastSampleTick;
  #lastScheduledTick;
  #destroyed;

  constructor(options: BotMobilitySchedulerOptions);
  constructor(options: unknown) {
    const normalized = normalizeSchedulerOptions(options);
    this.#minimumIntervalTicks = normalized.minimumIntervalTicks;
    this.#crouchHoldTicks = normalized.crouchHoldTicks;
    this.#nextMobilityTick = 0;
    this.#jumpPressedTick = -1;
    this.#slamPressedTick = -1;
    this.#jumpHoldUntilTick = -1;
    this.#lastSampleTick = -1;
    this.#lastScheduledTick = -1;
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('BotMobilityScheduler 已销毁。');
  }

  cancel() {
    this.#assertUsable();
    this.#jumpPressedTick = -1;
    this.#slamPressedTick = -1;
    this.#jumpHoldUntilTick = -1;
  }

  schedule(
    tick: unknown,
    intent: unknown,
    committed: unknown,
    canMove: unknown,
  ): boolean {
    this.#assertUsable();
    const currentTick = tickValue(tick, 'BotMobilityScheduler.tick');
    const hasPendingSchedule = this.#lastScheduledTick > this.#lastSampleTick;
    if (hasPendingSchedule && currentTick === this.#lastScheduledTick) {
      throw new RangeError(`BotMobilityScheduler tick ${currentTick} 已调度。`);
    }
    if (hasPendingSchedule) {
      throw new RangeError(
        `BotMobilityScheduler 上次调度 tick ${this.#lastScheduledTick} 尚未采样。`,
      );
    }
    if (this.#lastSampleTick >= 0 && currentTick !== this.#lastSampleTick + 1) {
      throw new RangeError(
        `BotMobilityScheduler schedule tick 必须是下一未采样 tick：`
        + `上次 ${this.#lastSampleTick}，本次 ${currentTick}。`,
      );
    }
    if (typeof intent !== 'string' || !INTENTS.has(intent)) {
      throw new RangeError(`未知 Bot mobility intent ${String(intent)}。`);
    }
    if (typeof committed !== 'boolean' || typeof canMove !== 'boolean') {
      throw new TypeError('BotMobilityScheduler committed/canMove 必须是布尔值。');
    }
    this.#lastScheduledTick = currentTick;
    if (!canMove) {
      this.cancel();
      return false;
    }
    if (
      !committed
      || intent === BOT_MOBILITY_INTENT.NONE
      || currentTick < this.#nextMobilityTick
      || currentTick < this.#jumpHoldUntilTick
    ) return false;
    if (intent === BOT_MOBILITY_INTENT.JUMP) {
      this.#jumpPressedTick = currentTick;
      this.#nextMobilityTick = currentTick + this.#minimumIntervalTicks;
    } else if (intent === BOT_MOBILITY_INTENT.SLAM) {
      this.#slamPressedTick = currentTick;
      this.#nextMobilityTick = currentTick + this.#minimumIntervalTicks;
    } else {
      this.#jumpHoldUntilTick = currentTick + this.#crouchHoldTicks;
      this.#nextMobilityTick = this.#jumpHoldUntilTick + this.#minimumIntervalTicks;
    }
    return true;
  }

  sample(tick: unknown, canMove: unknown): BotMobilitySample {
    this.#assertUsable();
    const currentTick = tickValue(tick, 'BotMobilityScheduler sample tick');
    if (typeof canMove !== 'boolean') {
      throw new TypeError('BotMobilityScheduler sample canMove 必须是布尔值。');
    }
    if (
      this.#lastScheduledTick > this.#lastSampleTick
      && currentTick !== this.#lastScheduledTick
    ) {
      throw new RangeError(
        `BotMobilityScheduler sample tick 必须匹配已调度 tick ${this.#lastScheduledTick}。`,
      );
    }
    if (this.#lastSampleTick >= 0 && currentTick !== this.#lastSampleTick + 1) {
      throw new RangeError(
        `BotMobilityScheduler sample tick 必须连续：上次 ${this.#lastSampleTick}，本次 ${currentTick}。`,
      );
    }
    this.#lastSampleTick = currentTick;
    if (!canMove) {
      this.cancel();
      return Object.freeze({ jumpPressed: false, jumpHeld: false, slamPressed: false });
    }
    return Object.freeze({
      jumpPressed: currentTick === this.#jumpPressedTick,
      jumpHeld: currentTick < this.#jumpHoldUntilTick,
      slamPressed: currentTick === this.#slamPressedTick,
    });
  }

  getDebugSnapshot(): BotMobilityDebugSnapshot {
    this.#assertUsable();
    return Object.freeze({
      nextMobilityTick: this.#nextMobilityTick,
      jumpHoldUntilTick: this.#jumpHoldUntilTick,
      jumpPressedTick: this.#jumpPressedTick,
      slamPressedTick: this.#slamPressedTick,
      lastSampleTick: this.#lastSampleTick,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#jumpPressedTick = -1;
    this.#slamPressedTick = -1;
    this.#jumpHoldUntilTick = -1;
    this.#lastSampleTick = -1;
    this.#lastScheduledTick = -1;
  }
}
