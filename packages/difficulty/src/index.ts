import {
  OPERATION_KINDS,
  definitionKey,
  type OperationKind,
  type ValidationIssue,
  type ValidationResult,
  type VersionedDefinition,
} from '@number-strategy/game-contracts';

export interface IntegerRange {
  readonly min: number;
  readonly max: number;
}

export interface DifficultyProfile extends VersionedDefinition {
  readonly exposed: boolean;
  readonly gameplay: {
    readonly startingValue: IntegerRange;
    readonly targetValue: IntegerRange;
    readonly movesPerRound: number;
    readonly valueBounds: IntegerRange;
    readonly roundTargetOffset: number;
    readonly roundTargetGrowth: number;
    readonly allowedOperations: readonly OperationKind[];
  };
  readonly timing: {
    readonly chargeMinMs: number;
    readonly chargeMaxMs: number;
    readonly landingDurationMs: number;
  };
  readonly jump: {
    readonly minRange: number;
    readonly maxRange: number;
    readonly rangeExponent: number;
    readonly durationMinMs: number;
    readonly durationMaxMs: number;
    readonly heightMin: number;
    readonly heightMax: number;
  };
  readonly world: {
    readonly historyLimit: number;
    readonly platform: {
      readonly halfWidth: number;
      readonly halfDepth: number;
      readonly topY: number;
      readonly height: number;
    };
    readonly layout: {
      readonly forwardMin: number;
      readonly forwardMax: number;
      readonly lateralMin: number;
      readonly lateralMax: number;
      readonly commonRangeMin: number;
      readonly commonRangeMax: number;
    };
  };
}

export interface LegacyGameRules {
  readonly startingValueMin: number;
  readonly startingValueMax: number;
  readonly targetMin: number;
  readonly targetMax: number;
  readonly movesPerRound: number;
  readonly minValue: number;
  readonly maxValue: number;
  readonly roundTargetOffset: number;
  readonly roundTargetGrowth: number;
  readonly allowedOperations: readonly OperationKind[];
  readonly chargeMinMs: number;
  readonly chargeMaxMs: number;
  readonly landingDurationMs: number;
}

export interface LegacyJumpPhysics {
  readonly minChargeMs: number;
  readonly maxChargeMs: number;
  readonly minRange: number;
  readonly maxRange: number;
  readonly rangeExponent: number;
  readonly durationMinMs: number;
  readonly durationMaxMs: number;
  readonly heightMin: number;
  readonly heightMax: number;
}

export interface LegacyWorldOptions {
  readonly historyLimit: number;
  readonly platform: DifficultyProfile['world']['platform'];
  readonly layout: DifficultyProfile['world']['layout'];
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function deepClone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => deepClone(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, deepClone(item)]),
    ) as T;
  }
  return value;
}

function issue(issues: ValidationIssue[], path: string, message: string): void {
  issues.push({ path, message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(
  issues: ValidationIssue[],
  owner: Record<string, unknown>,
  key: string,
  path = key,
): Record<string, unknown> | null {
  const value = owner[key];
  if (!isRecord(value)) {
    issue(issues, path, '必须是对象');
    return null;
  }
  return value;
}

function validateRange(
  issues: ValidationIssue[],
  path: string,
  range: IntegerRange,
  integer = true,
): void {
  const validNumber = integer ? Number.isSafeInteger : Number.isFinite;
  if (!validNumber(range.min)) issue(issues, `${path}.min`, integer ? '必须是安全整数' : '必须是有限数');
  if (!validNumber(range.max)) issue(issues, `${path}.max`, integer ? '必须是安全整数' : '必须是有限数');
  if (Number.isFinite(range.min) && Number.isFinite(range.max) && range.min > range.max) {
    issue(issues, path, 'min 不能大于 max');
  }
}

function positive(issues: ValidationIssue[], path: string, value: number, integer = false): void {
  const valid = integer ? Number.isSafeInteger(value) : Number.isFinite(value);
  if (!valid || value <= 0) issue(issues, path, integer ? '必须是正安全整数' : '必须是正有限数');
}

export function validateDifficultyProfile(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return { valid: false, issues: [{ path: '', message: '必须是对象' }] };

  try {
    definitionKey(value);
  } catch (error) {
    issue(issues, 'id/version', error instanceof Error ? error.message : String(error));
  }

  if (typeof value.exposed !== 'boolean') issue(issues, 'exposed', '必须是布尔值');
  const gameplay = requireRecord(issues, value, 'gameplay');
  const timing = requireRecord(issues, value, 'timing');
  const jump = requireRecord(issues, value, 'jump');
  const world = requireRecord(issues, value, 'world');
  const startingValue = gameplay && requireRecord(issues, gameplay, 'startingValue', 'gameplay.startingValue');
  const targetValue = gameplay && requireRecord(issues, gameplay, 'targetValue', 'gameplay.targetValue');
  const valueBounds = gameplay && requireRecord(issues, gameplay, 'valueBounds', 'gameplay.valueBounds');
  const platform = world && requireRecord(issues, world, 'platform', 'world.platform');
  const layoutRecord = world && requireRecord(issues, world, 'layout', 'world.layout');
  if (!gameplay || !timing || !jump || !world || !startingValue || !targetValue
    || !valueBounds || !platform || !layoutRecord) {
    return { valid: false, issues };
  }
  if (!Array.isArray(gameplay.allowedOperations)) {
    issue(issues, 'gameplay.allowedOperations', '必须是数组');
    return { valid: false, issues };
  }

  const profile = value as unknown as DifficultyProfile;

  validateRange(issues, 'gameplay.startingValue', profile.gameplay.startingValue);
  validateRange(issues, 'gameplay.targetValue', profile.gameplay.targetValue);
  validateRange(issues, 'gameplay.valueBounds', profile.gameplay.valueBounds);
  positive(issues, 'gameplay.movesPerRound', profile.gameplay.movesPerRound, true);
  positive(issues, 'gameplay.roundTargetOffset', profile.gameplay.roundTargetOffset, true);
  if (!Number.isSafeInteger(profile.gameplay.roundTargetGrowth) || profile.gameplay.roundTargetGrowth < 0) {
    issue(issues, 'gameplay.roundTargetGrowth', '必须是大于等于 0 的安全整数');
  }
  if (
    profile.gameplay.startingValue.min < profile.gameplay.valueBounds.min
    || profile.gameplay.startingValue.max > profile.gameplay.valueBounds.max
  ) issue(issues, 'gameplay.startingValue', '必须位于 valueBounds 内');
  if (
    profile.gameplay.targetValue.min < profile.gameplay.valueBounds.min
    || profile.gameplay.targetValue.max > profile.gameplay.valueBounds.max
  ) issue(issues, 'gameplay.targetValue', '必须位于 valueBounds 内');

  const operationSet = new Set<unknown>(profile.gameplay.allowedOperations);
  if (operationSet.size < 2) issue(issues, 'gameplay.allowedOperations', '至少需要两种运算');
  if (operationSet.size !== profile.gameplay.allowedOperations.length) {
    issue(issues, 'gameplay.allowedOperations', '不能包含重复运算');
  }
  for (const kind of operationSet) {
    if (typeof kind !== 'string' || !OPERATION_KINDS.includes(kind as OperationKind)) {
      issue(issues, 'gameplay.allowedOperations', `未知运算 ${String(kind)}`);
    }
  }

  positive(issues, 'timing.chargeMinMs', profile.timing.chargeMinMs, true);
  positive(issues, 'timing.chargeMaxMs', profile.timing.chargeMaxMs, true);
  positive(issues, 'timing.landingDurationMs', profile.timing.landingDurationMs, true);
  if (profile.timing.chargeMinMs > profile.timing.chargeMaxMs) {
    issue(issues, 'timing', 'chargeMinMs 不能大于 chargeMaxMs');
  }

  positive(issues, 'jump.minRange', profile.jump.minRange);
  positive(issues, 'jump.maxRange', profile.jump.maxRange);
  positive(issues, 'jump.rangeExponent', profile.jump.rangeExponent);
  positive(issues, 'jump.durationMinMs', profile.jump.durationMinMs);
  positive(issues, 'jump.durationMaxMs', profile.jump.durationMaxMs);
  positive(issues, 'jump.heightMin', profile.jump.heightMin);
  positive(issues, 'jump.heightMax', profile.jump.heightMax);
  if (profile.jump.minRange >= profile.jump.maxRange) issue(issues, 'jump', 'minRange 必须小于 maxRange');
  if (profile.jump.durationMinMs > profile.jump.durationMaxMs) issue(issues, 'jump', 'durationMinMs 不能大于 durationMaxMs');
  if (profile.jump.heightMin > profile.jump.heightMax) issue(issues, 'jump', 'heightMin 不能大于 heightMax');

  positive(issues, 'world.platform.halfWidth', profile.world.platform.halfWidth);
  positive(issues, 'world.platform.halfDepth', profile.world.platform.halfDepth);
  positive(issues, 'world.platform.height', profile.world.platform.height);
  if (!Number.isFinite(profile.world.platform.topY)) issue(issues, 'world.platform.topY', '必须是有限数');
  if (!Number.isSafeInteger(profile.world.historyLimit) || profile.world.historyLimit < 0) {
    issue(issues, 'world.historyLimit', '必须是大于等于 0 的安全整数');
  }

  const layout = profile.world.layout;
  for (const name of [
    'forwardMin',
    'forwardMax',
    'lateralMin',
    'lateralMax',
    'commonRangeMin',
    'commonRangeMax',
  ] as const) {
    positive(issues, `world.layout.${name}`, layout[name]);
  }
  if (layout.forwardMin > layout.forwardMax) issue(issues, 'world.layout', 'forwardMin 不能大于 forwardMax');
  if (layout.lateralMin > layout.lateralMax) issue(issues, 'world.layout', 'lateralMin 不能大于 lateralMax');
  if (layout.commonRangeMin > layout.commonRangeMax) issue(issues, 'world.layout', 'commonRangeMin 不能大于 commonRangeMax');
  const sourceRadius = Math.hypot(profile.world.platform.halfWidth, profile.world.platform.halfDepth);
  const nearest = Math.hypot(layout.forwardMin, layout.lateralMin) - sourceRadius;
  const farthest = Math.hypot(layout.forwardMax, layout.lateralMax) + sourceRadius;
  if (nearest < layout.commonRangeMin || farthest > layout.commonRangeMax) {
    issue(issues, 'world.layout', '无法保证平台任意边缘到候选中心位于 commonRange 内');
  }
  if (profile.jump.maxRange < layout.commonRangeMax) {
    issue(issues, 'jump.maxRange', '必须覆盖 world.layout.commonRangeMax');
  }

  return issues.length === 0 ? { valid: true, issues: [] } : { valid: false, issues };
}

export function defineDifficultyProfile(profile: unknown): Readonly<DifficultyProfile> {
  const result = validateDifficultyProfile(profile);
  if (!result.valid) {
    throw new TypeError(`难度配置无效：${result.issues.map(({ path, message }) => `${path} ${message}`).join('；')}`);
  }
  return deepFreeze(deepClone(profile) as DifficultyProfile);
}

const sharedWorld = {
  historyLimit: 3,
  platform: { halfWidth: 1.05, halfDepth: 0.75, topY: 0, height: 0.34 },
  layout: {
    forwardMin: 3.8,
    forwardMax: 4.25,
    lateralMin: 1.25,
    lateralMax: 1.65,
    commonRangeMin: 2.6,
    commonRangeMax: 6,
  },
} as const;

const sharedJump = {
  minRange: 0.8,
  maxRange: 7.6,
  rangeExponent: 1.18,
  durationMinMs: 520,
  durationMaxMs: 820,
  heightMin: 1.1,
  heightMax: 2.2,
} as const;

export const EASY_DIFFICULTY = defineDifficultyProfile({
  id: 'easy',
  version: 1,
  exposed: false,
  gameplay: {
    startingValue: { min: 6, max: 15 },
    targetValue: { min: 20, max: 52 },
    movesPerRound: 8,
    valueBounds: { min: -99, max: 199 },
    roundTargetOffset: 8,
    roundTargetGrowth: 1,
    allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
  },
  timing: { chargeMinMs: 80, chargeMaxMs: 1200, landingDurationMs: 520 },
  jump: sharedJump,
  world: sharedWorld,
});

export const NORMAL_DIFFICULTY = defineDifficultyProfile({
  id: 'normal',
  version: 1,
  exposed: true,
  gameplay: {
    startingValue: { min: 6, max: 18 },
    targetValue: { min: 28, max: 72 },
    movesPerRound: 7,
    valueBounds: { min: -99, max: 199 },
    roundTargetOffset: 12,
    roundTargetGrowth: 2,
    allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
  },
  timing: { chargeMinMs: 80, chargeMaxMs: 1200, landingDurationMs: 520 },
  jump: sharedJump,
  world: sharedWorld,
});

export const HARD_DIFFICULTY = defineDifficultyProfile({
  id: 'hard',
  version: 1,
  exposed: false,
  gameplay: {
    startingValue: { min: 8, max: 20 },
    targetValue: { min: 42, max: 90 },
    movesPerRound: 6,
    valueBounds: { min: -99, max: 199 },
    roundTargetOffset: 16,
    roundTargetGrowth: 3,
    allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
  },
  timing: { chargeMinMs: 80, chargeMaxMs: 1200, landingDurationMs: 520 },
  jump: sharedJump,
  world: sharedWorld,
});

export const BUILTIN_DIFFICULTIES = [EASY_DIFFICULTY, NORMAL_DIFFICULTY, HARD_DIFFICULTY] as const;
export const DEFAULT_DIFFICULTY = NORMAL_DIFFICULTY;

export class DifficultyRegistry {
  readonly #definitions = new Map<string, Readonly<DifficultyProfile>>();

  register(profile: DifficultyProfile): this {
    const validated = defineDifficultyProfile(profile);
    const key = definitionKey(validated);
    if (this.#definitions.has(key)) throw new Error(`难度配置重复注册：${key}`);
    this.#definitions.set(key, validated);
    return this;
  }

  get(id: string, version?: number): Readonly<DifficultyProfile> {
    if (version !== undefined) {
      const found = this.#definitions.get(`${id}@${version}`);
      if (!found) throw new Error(`未注册难度：${id}@${version}`);
      return found;
    }
    const matches = [...this.#definitions.values()]
      .filter((profile) => profile.id === id)
      .sort((left, right) => right.version - left.version);
    const found = matches[0];
    if (!found) throw new Error(`未注册难度：${id}`);
    return found;
  }

  list(): readonly Readonly<DifficultyProfile>[] {
    return [...this.#definitions.values()];
  }
}

export function createBuiltinDifficultyRegistry(): DifficultyRegistry {
  const registry = new DifficultyRegistry();
  for (const profile of BUILTIN_DIFFICULTIES) registry.register(profile);
  return registry;
}

export function toLegacyGameRules(profile: DifficultyProfile): Readonly<LegacyGameRules> {
  return deepFreeze({
    startingValueMin: profile.gameplay.startingValue.min,
    startingValueMax: profile.gameplay.startingValue.max,
    targetMin: profile.gameplay.targetValue.min,
    targetMax: profile.gameplay.targetValue.max,
    movesPerRound: profile.gameplay.movesPerRound,
    minValue: profile.gameplay.valueBounds.min,
    maxValue: profile.gameplay.valueBounds.max,
    roundTargetOffset: profile.gameplay.roundTargetOffset,
    roundTargetGrowth: profile.gameplay.roundTargetGrowth,
    allowedOperations: profile.gameplay.allowedOperations,
    chargeMinMs: profile.timing.chargeMinMs,
    chargeMaxMs: profile.timing.chargeMaxMs,
    landingDurationMs: profile.timing.landingDurationMs,
  });
}

export function toLegacyJumpPhysics(profile: DifficultyProfile): Readonly<LegacyJumpPhysics> {
  return deepFreeze({
    minChargeMs: profile.timing.chargeMinMs,
    maxChargeMs: profile.timing.chargeMaxMs,
    ...profile.jump,
  });
}

export function toLegacyWorldOptions(profile: DifficultyProfile): Readonly<LegacyWorldOptions> {
  return deepFreeze({
    historyLimit: profile.world.historyLimit,
    platform: profile.world.platform,
    layout: profile.world.layout,
  });
}
