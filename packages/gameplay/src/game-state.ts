import {
  DEFAULT_DIFFICULTY,
  toLegacyGameRules,
  type LegacyGameRules,
} from '@number-strategy/difficulty';
import {
  createRng,
  type ChargeWindow,
  type DeterministicRng,
} from '@number-strategy/jump-engine';
import {
  OPERATION_KINDS,
  type OperationKind,
  type TaskResult,
} from '@number-strategy/game-contracts';
import {
  applyOperation,
  findOperationPath,
  generateChoices,
  type OperationChoice,
} from './operations.js';

const DEFAULT_GAME_RULES = toLegacyGameRules(DEFAULT_DIFFICULTY);

export const GAME_PHASE = Object.freeze({
  READY: 'ready',
  CHARGING: 'charging',
  JUMPING: 'jumping',
  LANDING: 'landing',
  PAUSED: 'paused',
  WON: 'won',
  LOST: 'lost',
} as const);

export type GamePhase = typeof GAME_PHASE[keyof typeof GAME_PHASE];
export type GameRules = LegacyGameRules;

export interface LastOperation extends OperationChoice {
  readonly previousValue: number;
  readonly result: number;
}

export type JumpResolution =
  | { readonly type: 'miss'; readonly reason: string }
  | { readonly type: 'land'; readonly operation: OperationChoice; readonly result: number };

export type LandingUpdate =
  | { readonly type: 'won' | 'lost' | 'continue' }
  | null;

const POSITIVE_RULE_KEYS = [
  'movesPerRound',
  'roundTargetOffset',
  'chargeMinMs',
  'chargeMaxMs',
  'landingDurationMs',
] as const;

const INTEGER_RULE_KEYS = [
  'startingValueMin',
  'startingValueMax',
  'targetMin',
  'targetMax',
  'minValue',
  'maxValue',
] as const;

function normalizeRules(overrides: unknown): Readonly<GameRules> {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new TypeError('rules 必须是对象。');
  }
  const rules = { ...DEFAULT_GAME_RULES, ...(overrides as Partial<GameRules>) };
  for (const key of POSITIVE_RULE_KEYS) {
    if (!Number.isSafeInteger(rules[key]) || rules[key] <= 0) {
      throw new RangeError(`rules.${key} 必须是正安全整数。`);
    }
  }
  if (!Number.isSafeInteger(rules.roundTargetGrowth) || rules.roundTargetGrowth < 0) {
    throw new RangeError('rules.roundTargetGrowth 必须是大于等于 0 的安全整数。');
  }
  for (const key of INTEGER_RULE_KEYS) {
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
  const allowedOperations = new Set<OperationKind>();
  for (const kind of rules.allowedOperations) {
    if (!OPERATION_KINDS.includes(kind)) {
      throw new RangeError(`rules.allowedOperations 包含未知运算：${String(kind)}。`);
    }
    allowedOperations.add(kind);
  }
  if (allowedOperations.size !== rules.allowedOperations.length) {
    throw new RangeError('rules.allowedOperations 不能包含重复运算。');
  }
  return Object.freeze({
    ...rules,
    allowedOperations: Object.freeze([...allowedOperations]),
  });
}

function createRound(rng: DeterministicRng, round: number, rules: GameRules): {
  readonly start: number;
  readonly target: number;
} {
  const start = rng.int(rules.startingValueMin, rules.startingValueMax);
  const targetBase = rng.int(rules.targetMin, rules.targetMax);
  const scaledTarget = Math.max(
    targetBase,
    start + rules.roundTargetOffset + round * rules.roundTargetGrowth,
  );
  const preferredTarget = Math.min(rules.maxValue, scaledTarget);
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

function isValidChoice(choice: unknown, value: number, rules: GameRules): choice is OperationChoice {
  if (!choice || typeof choice !== 'object') return false;
  const candidate = choice as Partial<OperationChoice>;
  if (!candidate.kind || !rules.allowedOperations.includes(candidate.kind)) return false;
  try {
    const result = applyOperation(value, choice);
    return result >= rules.minValue && result <= rules.maxValue;
  } catch {
    return false;
  }
}

export class GameState {
  readonly rules: Readonly<GameRules>;
  readonly rng: DeterministicRng;
  round = 1;
  phase: GamePhase = GAME_PHASE.READY;
  previousPhase: GamePhase = GAME_PHASE.READY;
  currentValue = 0;
  targetValue = 0;
  movesRemaining = 0;
  selectedChoice: number | null = null;
  chargeMs = 0;
  jumpProgress = 0;
  landingProgress = 0;
  chargeWindow: ChargeWindow | null = null;
  lastOperation: LastOperation | null = null;
  operationHistory: LastOperation[] = [];
  message = '';
  choices: OperationChoice[] = [];

  constructor({
    seed = Date.now(),
    rules = DEFAULT_GAME_RULES,
  }: {
    readonly seed?: number;
    readonly rules?: unknown;
  } = {}) {
    this.rules = normalizeRules(rules);
    this.rng = createRng(seed);
    this.resetRound();
  }

  resetRound(): void {
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
    this.operationHistory = [];
    this.message = '按住下方箭头选择运算路线';
    this.choices = this.createChoices();
  }

  createChoices({
    value = this.currentValue,
    movesRemaining = this.movesRemaining,
  }: {
    readonly value?: number;
    readonly movesRemaining?: number;
  } = {}): OperationChoice[] {
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

  startCharge(choiceIndex: unknown): boolean {
    if (
      this.phase !== GAME_PHASE.READY
      || this.movesRemaining <= 0
      || !Number.isInteger(choiceIndex)
      || !isValidChoice(this.choices[choiceIndex as number], this.currentValue, this.rules)
    ) return false;
    this.phase = GAME_PHASE.CHARGING;
    this.selectedChoice = choiceIndex as number;
    this.chargeMs = 0;
    this.message = choiceIndex === 0 ? '左路蓄力' : '右路蓄力';
    return true;
  }

  updateCharge(deltaMs: unknown): void {
    if (this.phase !== GAME_PHASE.CHARGING || !Number.isFinite(deltaMs) || (deltaMs as number) <= 0) return;
    this.chargeMs = Math.min(this.rules.chargeMaxMs, this.chargeMs + (deltaMs as number));
  }

  setChargeDuration(durationMs: unknown): boolean {
    if (this.phase !== GAME_PHASE.CHARGING || !Number.isFinite(durationMs)) return false;
    this.chargeMs = Math.min(this.rules.chargeMaxMs, Math.max(0, durationMs as number));
    return true;
  }

  cancelCharge(): boolean {
    if (this.phase === GAME_PHASE.CHARGING) this.phase = GAME_PHASE.READY;
    else if (this.phase === GAME_PHASE.PAUSED && this.previousPhase === GAME_PHASE.CHARGING) {
      this.previousPhase = GAME_PHASE.READY;
    } else return false;
    this.selectedChoice = null;
    this.chargeMs = 0;
    this.chargeWindow = null;
    this.message = '按住下方箭头选择运算路线';
    return true;
  }

  releaseCharge(feedback = 'normal'):
    | { readonly accepted: false; readonly reason?: string }
    | { readonly accepted: true; readonly choiceIndex: number; readonly chargeMs: number } {
    void feedback;
    if (this.phase !== GAME_PHASE.CHARGING) return { accepted: false };
    const selected = this.selectedChoice;
    if (selected === null || !isValidChoice(this.choices[selected], this.currentValue, this.rules)) {
      this.cancelCharge();
      return { accepted: false, reason: 'invalid-choice' };
    }
    this.phase = GAME_PHASE.JUMPING;
    this.jumpProgress = 0;
    this.message = '跃迁中';
    return { accepted: true, choiceIndex: selected, chargeMs: this.chargeMs };
  }

  setJumpProgress(progress: unknown): void {
    if (this.phase !== GAME_PHASE.JUMPING || !Number.isFinite(progress)) return;
    this.jumpProgress = Math.min(1, Math.max(0, progress as number));
  }

  resolveJump(landing: boolean | { readonly landed?: boolean; readonly reason?: string }): JumpResolution | null {
    if (this.phase !== GAME_PHASE.JUMPING) return null;
    const landed = typeof landing === 'boolean' ? landing : landing?.landed === true;
    if (!landed) {
      const reason = typeof landing === 'object' ? landing.reason ?? 'outside' : 'outside';
      this.phase = GAME_PHASE.LOST;
      this.message = reason === 'overshoot' ? '力度过大，越过平台' : '力度不足，坠入数域';
      return { type: 'miss', reason };
    }
    const operation = this.selectedChoice === null ? undefined : this.choices[this.selectedChoice];
    if (!operation) throw new Error('跳跃结算缺少已选择的运算。');
    const previousValue = this.currentValue;
    const result = applyOperation(previousValue, operation);
    if (result < this.rules.minValue || result > this.rules.maxValue) {
      throw new RangeError('跳跃结算结果超出允许的数值范围。');
    }
    this.currentValue = result;
    this.movesRemaining -= 1;
    this.lastOperation = { ...operation, previousValue, result };
    this.operationHistory.push(this.lastOperation);
    this.phase = GAME_PHASE.LANDING;
    this.landingProgress = 0;
    return { type: 'land', operation, result };
  }

  updateLanding(deltaMs: unknown, taskResult?: TaskResult): LandingUpdate {
    if (this.phase !== GAME_PHASE.LANDING || !Number.isFinite(deltaMs) || (deltaMs as number) <= 0) return null;
    this.landingProgress = Math.min(
      1,
      this.landingProgress + (deltaMs as number) / this.rules.landingDurationMs,
    );
    if (this.landingProgress < 1) return null;
    const resolvedTask = taskResult ?? (
      this.currentValue === this.targetValue
        ? { status: 'completed' as const, message: '目标命中' }
        : this.movesRemaining <= 0
          ? { status: 'failed' as const, reason: 'moves-exhausted' }
          : { status: 'active' as const }
    );
    if (resolvedTask.status === 'completed') {
      this.phase = GAME_PHASE.WON;
      this.message = resolvedTask.message ?? '任务完成';
      return { type: 'won' };
    }
    if (resolvedTask.status === 'failed' || this.movesRemaining <= 0) {
      this.phase = GAME_PHASE.LOST;
      this.message = resolvedTask.message
        ?? `相差 ${Math.abs(this.targetValue - this.currentValue)}，再试一次`;
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

  useChoices(choices: unknown): boolean {
    if (!Array.isArray(choices) || choices.length !== 2) return false;
    const [first, second] = choices;
    if (!isValidChoice(first, this.currentValue, this.rules)
      || !isValidChoice(second, this.currentValue, this.rules)
      || `${first.kind}:${first.amount}` === `${second.kind}:${second.amount}`) return false;
    this.choices = [first, second];
    return true;
  }

  nextRound(): boolean {
    if (this.phase !== GAME_PHASE.WON) return false;
    this.round += 1;
    this.resetRound();
    return true;
  }

  restart(): void {
    this.round = 1;
    this.resetRound();
  }

  togglePause(): boolean {
    if (this.phase === GAME_PHASE.PAUSED) {
      this.phase = this.previousPhase;
      return false;
    }
    if (this.phase === GAME_PHASE.WON || this.phase === GAME_PHASE.LOST) return false;
    this.previousPhase = this.phase;
    this.phase = GAME_PHASE.PAUSED;
    return true;
  }
}
