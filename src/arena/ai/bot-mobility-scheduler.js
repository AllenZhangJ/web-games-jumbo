import { BOT_MOBILITY_INTENT } from './bot-mobility-policy.js';

const INTENTS = new Set(Object.values(BOT_MOBILITY_INTENT));

function positiveInteger(value, name, minimum = 1) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value;
}

function tickValue(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value;
}

export class BotMobilityScheduler {
  #minimumIntervalTicks;
  #crouchHoldTicks;
  #nextMobilityTick;
  #jumpPressedTick;
  #slamPressedTick;
  #jumpHoldUntilTick;
  #lastSampleTick;
  #destroyed;

  constructor({ minimumIntervalTicks, crouchHoldTicks }) {
    this.#minimumIntervalTicks = positiveInteger(
      minimumIntervalTicks,
      'BotMobilityScheduler.minimumIntervalTicks',
      4,
    );
    this.#crouchHoldTicks = positiveInteger(
      crouchHoldTicks,
      'BotMobilityScheduler.crouchHoldTicks',
      2,
    );
    this.#nextMobilityTick = 0;
    this.#jumpPressedTick = -1;
    this.#slamPressedTick = -1;
    this.#jumpHoldUntilTick = -1;
    this.#lastSampleTick = -1;
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

  schedule({ tick, intent, committed, canMove }) {
    this.#assertUsable();
    const currentTick = tickValue(tick, 'BotMobilityScheduler.tick');
    if (this.#lastSampleTick >= 0 && currentTick !== this.#lastSampleTick + 1) {
      throw new RangeError(
        `BotMobilityScheduler schedule tick 必须是下一未采样 tick：`
        + `上次 ${this.#lastSampleTick}，本次 ${currentTick}。`,
      );
    }
    if (!INTENTS.has(intent)) throw new RangeError(`未知 Bot mobility intent ${String(intent)}。`);
    if (typeof committed !== 'boolean' || typeof canMove !== 'boolean') {
      throw new TypeError('BotMobilityScheduler committed/canMove 必须是布尔值。');
    }
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

  sample(tick, { canMove }) {
    this.#assertUsable();
    const currentTick = tickValue(tick, 'BotMobilityScheduler sample tick');
    if (typeof canMove !== 'boolean') {
      throw new TypeError('BotMobilityScheduler sample canMove 必须是布尔值。');
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

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      nextMobilityTick: this.#nextMobilityTick,
      jumpHoldUntilTick: this.#jumpHoldUntilTick,
      jumpPressedTick: this.#jumpPressedTick,
      slamPressedTick: this.#slamPressedTick,
      lastSampleTick: this.#lastSampleTick,
    });
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#jumpPressedTick = -1;
    this.#slamPressedTick = -1;
    this.#jumpHoldUntilTick = -1;
    this.#lastSampleTick = -1;
  }
}
