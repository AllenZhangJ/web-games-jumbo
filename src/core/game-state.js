import { GAME_RULES } from '../config.js';
import { createRng } from './rng.js';
import { applyOperation, findOperationPath, generateChoices } from './operations.js';

export const GAME_PHASE = Object.freeze({
  READY: 'ready',
  CHARGING: 'charging',
  JUMPING: 'jumping',
  LANDING: 'landing',
  PAUSED: 'paused',
  WON: 'won',
  LOST: 'lost',
});

function createRound(rng, round) {
  const start = rng.int(GAME_RULES.startingValueMin, GAME_RULES.startingValueMax);
  const targetBase = rng.int(GAME_RULES.targetMin, GAME_RULES.targetMax);
  const scaledTarget = Math.max(targetBase, start + 12 + round * 2);
  const preferredTarget = Math.min(GAME_RULES.maxValue, scaledTarget);

  // Long-running sessions used to produce targets above maxValue. Even below
  // that ceiling a greedy target can be unreachable in seven operations. Pick
  // the nearest target at or below the requested difficulty that has an actual
  // legal solution within the round budget.
  for (let target = preferredTarget; target > start; target -= 1) {
    const path = findOperationPath({
      value: start,
      target,
      maxMoves: GAME_RULES.movesPerRound,
      minValue: GAME_RULES.minValue,
      maxValue: GAME_RULES.maxValue,
    });
    if (path) return { start, target };
  }
  throw new Error('无法在当前规则内生成可完成的回合。');
}

function isValidChoice(choice, value) {
  if (!choice || typeof choice !== 'object') return false;
  try {
    const result = applyOperation(value, choice);
    return result >= GAME_RULES.minValue && result <= GAME_RULES.maxValue;
  } catch {
    return false;
  }
}

export class GameState {
  constructor({ seed = Date.now() } = {}) {
    this.rng = createRng(seed);
    this.round = 1;
    this.resetRound();
  }

  resetRound() {
    const { start, target } = createRound(this.rng, this.round);
    this.phase = GAME_PHASE.READY;
    this.previousPhase = GAME_PHASE.READY;
    this.currentValue = start;
    this.targetValue = target;
    this.movesRemaining = GAME_RULES.movesPerRound;
    this.selectedChoice = null;
    this.chargeMs = 0;
    this.jumpProgress = 0;
    this.landingProgress = 0;
    this.chargeWindow = null;
    this.lastOperation = null;
    this.message = '按住下方箭头选择运算路线';
    this.choices = this.createChoices();
  }

  createChoices({
    value = this.currentValue,
    movesRemaining = this.movesRemaining,
  } = {}) {
    return generateChoices({
      value,
      target: this.targetValue,
      rng: this.rng,
      minValue: GAME_RULES.minValue,
      maxValue: GAME_RULES.maxValue,
      movesRemaining,
    });
  }

  startCharge(choiceIndex) {
    if (
      this.phase !== GAME_PHASE.READY
      || this.movesRemaining <= 0
      || !Number.isInteger(choiceIndex)
      || !isValidChoice(this.choices[choiceIndex], this.currentValue)
    ) return false;
    this.phase = GAME_PHASE.CHARGING;
    this.selectedChoice = choiceIndex;
    this.chargeMs = 0;
    this.message = choiceIndex === 0 ? '左路蓄力' : '右路蓄力';
    return true;
  }

  updateCharge(deltaMs) {
    if (this.phase !== GAME_PHASE.CHARGING) return;
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.chargeMs = Math.min(GAME_RULES.chargeMaxMs, this.chargeMs + deltaMs);
  }

  setChargeDuration(durationMs) {
    if (this.phase !== GAME_PHASE.CHARGING || !Number.isFinite(durationMs)) return false;
    this.chargeMs = Math.min(GAME_RULES.chargeMaxMs, Math.max(0, durationMs));
    return true;
  }

  cancelCharge() {
    if (this.phase === GAME_PHASE.CHARGING) {
      this.phase = GAME_PHASE.READY;
    } else if (this.phase === GAME_PHASE.PAUSED && this.previousPhase === GAME_PHASE.CHARGING) {
      this.previousPhase = GAME_PHASE.READY;
    } else {
      return false;
    }
    this.selectedChoice = null;
    this.chargeMs = 0;
    this.chargeWindow = null;
    this.message = '按住下方箭头选择运算路线';
    return true;
  }

  releaseCharge(_feedback = 'normal') {
    if (this.phase !== GAME_PHASE.CHARGING) return { accepted: false };
    if (!isValidChoice(this.choices[this.selectedChoice], this.currentValue)) {
      this.cancelCharge();
      return { accepted: false, reason: 'invalid-choice' };
    }
    this.phase = GAME_PHASE.JUMPING;
    this.jumpProgress = 0;
    this.message = '跃迁中';
    return { accepted: true, choiceIndex: this.selectedChoice, chargeMs: this.chargeMs };
  }

  setJumpProgress(progress) {
    if (this.phase !== GAME_PHASE.JUMPING) return;
    if (!Number.isFinite(progress)) return;
    this.jumpProgress = Math.min(1, Math.max(0, progress));
  }

  resolveJump(landing) {
    if (this.phase !== GAME_PHASE.JUMPING) return null;
    const landed = typeof landing === 'boolean' ? landing : landing?.landed === true;
    if (!landed) {
      this.phase = GAME_PHASE.LOST;
      this.message = landing?.reason === 'overshoot'
        ? '力度过大，越过平台'
        : '力度不足，坠入数域';
      return { type: 'miss', reason: landing?.reason ?? 'outside' };
    }

    const operation = this.choices[this.selectedChoice];
    if (!operation) throw new Error('跳跃结算缺少已选择的运算。');
    const previousValue = this.currentValue;
    const result = applyOperation(this.currentValue, operation);
    if (result < GAME_RULES.minValue || result > GAME_RULES.maxValue) {
      throw new RangeError('跳跃结算结果超出允许的数值范围。');
    }
    this.currentValue = result;
    this.movesRemaining -= 1;
    this.lastOperation = { ...operation, previousValue, result: this.currentValue };
    this.phase = GAME_PHASE.LANDING;
    this.landingProgress = 0;
    return { type: 'land', operation, result: this.currentValue };
  }

  updateLanding(deltaMs) {
    if (this.phase !== GAME_PHASE.LANDING) return null;
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return null;
    this.landingProgress = Math.min(1, this.landingProgress + deltaMs / GAME_RULES.landingDurationMs);
    if (this.landingProgress < 1) return null;

    if (this.currentValue === this.targetValue) {
      this.phase = GAME_PHASE.WON;
      this.message = '目标命中';
      return { type: 'won' };
    }
    if (this.movesRemaining <= 0) {
      this.phase = GAME_PHASE.LOST;
      this.message = `相差 ${Math.abs(this.targetValue - this.currentValue)}，再试一次`;
      return { type: 'lost' };
    }

    this.phase = GAME_PHASE.READY;
    this.selectedChoice = null;
    this.chargeMs = 0;
    this.jumpProgress = 0;
    this.landingProgress = 0;
    this.chargeWindow = null;
    this.message = '按住下方箭头选择下一条路线';
    return { type: 'continue' };
  }

  useChoices(choices) {
    if (
      !Array.isArray(choices)
      || choices.length !== 2
      || choices.some((choice) => !isValidChoice(choice, this.currentValue))
      || `${choices[0].kind}:${choices[0].amount}` === `${choices[1].kind}:${choices[1].amount}`
    ) return false;
    this.choices = choices;
    return true;
  }

  nextRound() {
    if (this.phase !== GAME_PHASE.WON) return false;
    this.round += 1;
    this.resetRound();
    return true;
  }

  restart() {
    this.round = 1;
    this.resetRound();
  }

  togglePause() {
    if (this.phase === GAME_PHASE.PAUSED) {
      this.phase = this.previousPhase;
      return false;
    }
    if ([GAME_PHASE.WON, GAME_PHASE.LOST].includes(this.phase)) return false;
    this.previousPhase = this.phase;
    this.phase = GAME_PHASE.PAUSED;
    return true;
  }
}
