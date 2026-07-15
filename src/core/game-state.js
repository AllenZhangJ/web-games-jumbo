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

function normalizeRules(overrides) {
  const rules = { ...GAME_RULES, ...overrides };
  const positiveIntegers = [
    'movesPerRound',
    'roundTargetOffset',
    'chargeMinMs',
    'chargeMaxMs',
    'landingDurationMs',
  ];
  for (const key of positiveIntegers) {
    if (!Number.isSafeInteger(rules[key]) || rules[key] <= 0) {
      throw new RangeError(`rules.${key} 必须是正安全整数。`);
    }
  }
  if (!Number.isSafeInteger(rules.roundTargetGrowth) || rules.roundTargetGrowth < 0) {
    throw new RangeError('rules.roundTargetGrowth 必须是大于等于 0 的安全整数。');
  }
  for (const key of [
    'startingValueMin',
    'startingValueMax',
    'targetMin',
    'targetMax',
    'minValue',
    'maxValue',
  ]) {
    if (!Number.isSafeInteger(rules[key])) throw new TypeError(`rules.${key} 必须是安全整数。`);
  }
  if (
    rules.startingValueMin > rules.startingValueMax
    || rules.targetMin > rules.targetMax
    || rules.minValue > rules.maxValue
    || rules.chargeMinMs > rules.chargeMaxMs
  ) throw new RangeError('rules 包含倒置的范围。');
  if (
    rules.startingValueMin < rules.minValue
    || rules.startingValueMax > rules.maxValue
    || rules.targetMin < rules.minValue
    || rules.targetMax > rules.maxValue
  ) throw new RangeError('起始值和目标值必须位于允许数值范围内。');
  if (!Array.isArray(rules.allowedOperations) || rules.allowedOperations.length < 2) {
    throw new RangeError('rules.allowedOperations 至少需要两种运算。');
  }
  const allowedOperations = new Set(rules.allowedOperations);
  if (allowedOperations.size !== rules.allowedOperations.length) {
    throw new RangeError('rules.allowedOperations 不能包含重复运算。');
  }
  for (const kind of allowedOperations) {
    if (!['add', 'subtract', 'multiply', 'divide'].includes(kind)) {
      throw new RangeError(`rules.allowedOperations 包含未知运算：${String(kind)}。`);
    }
  }
  return Object.freeze({
    ...rules,
    allowedOperations: Object.freeze([...allowedOperations]),
  });
}

function createRound(rng, round, rules) {
  const start = rng.int(rules.startingValueMin, rules.startingValueMax);
  const targetBase = rng.int(rules.targetMin, rules.targetMax);
  const scaledTarget = Math.max(
    targetBase,
    start + rules.roundTargetOffset + round * rules.roundTargetGrowth,
  );
  const preferredTarget = Math.min(rules.maxValue, scaledTarget);

  // Long-running sessions used to produce targets above maxValue. Even below
  // that ceiling a greedy target can be unreachable in seven operations. Pick
  // the nearest target at or below the requested difficulty that has an actual
  // legal solution within the round budget.
  for (let target = preferredTarget; target > start; target -= 1) {
    const path = findOperationPath({
      value: start,
      target,
      maxMoves: rules.movesPerRound,
      minValue: rules.minValue,
      maxValue: rules.maxValue,
      allowedOperations: rules.allowedOperations,
    });
    if (path) return { start, target };
  }
  throw new Error('无法在当前规则内生成可完成的回合。');
}

function isValidChoice(choice, value, rules) {
  if (!choice || typeof choice !== 'object') return false;
  if (!rules.allowedOperations.includes(choice.kind)) return false;
  try {
    const result = applyOperation(value, choice);
    return result >= rules.minValue && result <= rules.maxValue;
  } catch {
    return false;
  }
}

export class GameState {
  constructor({ seed = Date.now(), rules = GAME_RULES } = {}) {
    this.rules = normalizeRules(rules);
    this.rng = createRng(seed);
    this.round = 1;
    this.resetRound();
  }

  resetRound() {
    const { start, target } = createRound(this.rng, this.round, this.rules);
    this.phase = GAME_PHASE.READY;
    this.previousPhase = GAME_PHASE.READY;
    this.currentValue = start;
    this.targetValue = target;
    this.movesRemaining = this.rules.movesPerRound;
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
      minValue: this.rules.minValue,
      maxValue: this.rules.maxValue,
      movesRemaining,
      allowedOperations: this.rules.allowedOperations,
    });
  }

  startCharge(choiceIndex) {
    if (
      this.phase !== GAME_PHASE.READY
      || this.movesRemaining <= 0
      || !Number.isInteger(choiceIndex)
      || !isValidChoice(this.choices[choiceIndex], this.currentValue, this.rules)
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
    this.chargeMs = Math.min(this.rules.chargeMaxMs, this.chargeMs + deltaMs);
  }

  setChargeDuration(durationMs) {
    if (this.phase !== GAME_PHASE.CHARGING || !Number.isFinite(durationMs)) return false;
    this.chargeMs = Math.min(this.rules.chargeMaxMs, Math.max(0, durationMs));
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
    if (!isValidChoice(this.choices[this.selectedChoice], this.currentValue, this.rules)) {
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
    if (result < this.rules.minValue || result > this.rules.maxValue) {
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
    this.landingProgress = Math.min(
      1,
      this.landingProgress + deltaMs / this.rules.landingDurationMs,
    );
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
      || choices.some((choice) => !isValidChoice(choice, this.currentValue, this.rules))
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
