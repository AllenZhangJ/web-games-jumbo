import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_INPUT_MAPPER_ID } from '@number-strategy-jump/arena-presentation-runtime';

export const INPUT_PILOT_DEFINITION_SCHEMA_VERSION = 2;

export const INPUT_PILOT_PLATFORM = Object.freeze({
  WEB: 'web',
  WECHAT: 'wechat',
  DOUYIN: 'douyin',
} as const);

export const INPUT_PILOT_FORM_FACTOR = Object.freeze({
  PHONE: 'phone',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
} as const);

export const INPUT_PILOT_ORIENTATION = Object.freeze({
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape',
} as const);

export const INPUT_PILOT_INPUT_MODE = Object.freeze({
  TOUCH: 'touch',
  MOUSE: 'mouse',
} as const);

export type InputPilotPlatform = typeof INPUT_PILOT_PLATFORM[keyof typeof INPUT_PILOT_PLATFORM];
export type InputPilotFormFactor = typeof INPUT_PILOT_FORM_FACTOR[
  keyof typeof INPUT_PILOT_FORM_FACTOR
];
export type InputPilotOrientation = typeof INPUT_PILOT_ORIENTATION[
  keyof typeof INPUT_PILOT_ORIENTATION
];
export type InputPilotInputMode = typeof INPUT_PILOT_INPUT_MODE[
  keyof typeof INPUT_PILOT_INPUT_MODE
];

export interface InputPilotVariant {
  readonly id: string;
  readonly mapperId: string;
}

export interface InputPilotEnvironment {
  readonly platform: InputPilotPlatform;
  readonly formFactor: InputPilotFormFactor;
  readonly orientation: InputPilotOrientation;
  readonly inputMode: InputPilotInputMode;
}

export interface InputPilotThresholds {
  readonly minimumEligibleSamplesPerVariant: number;
  readonly successWindowMs: number;
  readonly maximumTrialDurationMs: number;
  readonly effectiveMovementDistance: number;
  readonly targetSuccessRate: number;
  readonly winnerMarginRate: number;
}

export interface InputPilotDefinitionData {
  readonly schemaVersion: number;
  readonly id: string;
  readonly taskPrompt: string;
  readonly assignmentSeed: number;
  readonly variants: readonly InputPilotVariant[];
  readonly environment: InputPilotEnvironment;
  readonly thresholds: InputPilotThresholds;
}

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'taskPrompt',
  'assignmentSeed',
  'variants',
  'environment',
  'thresholds',
]);
const VARIANT_KEYS = new Set(['id', 'mapperId']);
const ENVIRONMENT_KEYS = new Set(['platform', 'formFactor', 'orientation', 'inputMode']);
const THRESHOLD_KEYS = new Set([
  'minimumEligibleSamplesPerVariant',
  'successWindowMs',
  'maximumTrialDurationMs',
  'effectiveMovementDistance',
  'targetSuccessRate',
  'winnerMarginRate',
]);

function enumValue<T extends string>(
  value: unknown,
  values: Readonly<Record<string, T>>,
  name: string,
): T {
  const knownValues = new Set<string>(Object.values(values));
  if (typeof value !== 'string' || !knownValues.has(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value as T;
}

function rate(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) < 0 || (value as number) > 1) {
    throw new RangeError(`${name} 必须位于 [0, 1]。`);
  }
  return value as number;
}

function positiveFinite(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) <= 0) {
    throw new RangeError(`${name} 必须是有限正数。`);
  }
  return value as number;
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function cloneVariants(values: unknown): readonly InputPilotVariant[] {
  if (!Array.isArray(values) || values.length !== 2) {
    throw new RangeError('InputPilotDefinition.variants 必须恰好包含两个方案。');
  }
  const ids = new Set<string>();
  const mapperIds = new Set<string>();
  const variants = values.map((value, index) => {
    const name = `InputPilotDefinition.variants[${index}]`;
    assertKnownKeys(value, VARIANT_KEYS, name);
    const id = assertNonEmptyString(value.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`InputPilotDefinition 包含重复 variant ${id}。`);
    ids.add(id);
    const mapperId = enumValue(value.mapperId, ARENA_INPUT_MAPPER_ID, `${name}.mapperId`);
    if (mapperIds.has(mapperId)) {
      throw new RangeError(`InputPilotDefinition 重复使用 mapper ${mapperId}。`);
    }
    mapperIds.add(mapperId);
    return Object.freeze({ id, mapperId });
  });
  return Object.freeze(variants);
}

function cloneEnvironment(value: unknown): InputPilotEnvironment {
  assertKnownKeys(value, ENVIRONMENT_KEYS, 'InputPilotDefinition.environment');
  return Object.freeze({
    platform: enumValue(
      value.platform,
      INPUT_PILOT_PLATFORM,
      'InputPilotDefinition.environment.platform',
    ),
    formFactor: enumValue(
      value.formFactor,
      INPUT_PILOT_FORM_FACTOR,
      'InputPilotDefinition.environment.formFactor',
    ),
    orientation: enumValue(
      value.orientation,
      INPUT_PILOT_ORIENTATION,
      'InputPilotDefinition.environment.orientation',
    ),
    inputMode: enumValue(
      value.inputMode,
      INPUT_PILOT_INPUT_MODE,
      'InputPilotDefinition.environment.inputMode',
    ),
  });
}

function cloneThresholds(value: unknown): InputPilotThresholds {
  assertKnownKeys(value, THRESHOLD_KEYS, 'InputPilotDefinition.thresholds');
  const thresholds = {
    minimumEligibleSamplesPerVariant: assertIntegerAtLeast(
      value.minimumEligibleSamplesPerVariant,
      1,
      'InputPilotDefinition.thresholds.minimumEligibleSamplesPerVariant',
    ),
    successWindowMs: assertIntegerAtLeast(
      value.successWindowMs,
      1,
      'InputPilotDefinition.thresholds.successWindowMs',
    ),
    maximumTrialDurationMs: assertIntegerAtLeast(
      value.maximumTrialDurationMs,
      1,
      'InputPilotDefinition.thresholds.maximumTrialDurationMs',
    ),
    effectiveMovementDistance: positiveFinite(
      value.effectiveMovementDistance,
      'InputPilotDefinition.thresholds.effectiveMovementDistance',
    ),
    targetSuccessRate: rate(
      value.targetSuccessRate,
      'InputPilotDefinition.thresholds.targetSuccessRate',
    ),
    winnerMarginRate: rate(
      value.winnerMarginRate,
      'InputPilotDefinition.thresholds.winnerMarginRate',
    ),
  };
  if (thresholds.winnerMarginRate === 0) {
    throw new RangeError('InputPilotDefinition.thresholds.winnerMarginRate 必须大于 0。');
  }
  if (thresholds.maximumTrialDurationMs < thresholds.successWindowMs) {
    throw new RangeError(
      'InputPilotDefinition.thresholds.maximumTrialDurationMs 不能小于 successWindowMs。',
    );
  }
  return Object.freeze(thresholds);
}

export class InputPilotDefinition implements InputPilotDefinitionData {
  readonly schemaVersion = INPUT_PILOT_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly taskPrompt: string;
  readonly assignmentSeed: number;
  readonly variants: readonly InputPilotVariant[];
  readonly environment: InputPilotEnvironment;
  readonly thresholds: InputPilotThresholds;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'InputPilotDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'InputPilotDefinition');
    if (source.schemaVersion !== INPUT_PILOT_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(`不支持 InputPilotDefinition schema ${String(source.schemaVersion)}。`);
    }
    this.id = assertNonEmptyString(source.id, 'InputPilotDefinition.id');
    this.taskPrompt = assertNonEmptyString(source.taskPrompt, 'InputPilotDefinition.taskPrompt');
    this.assignmentSeed = uint32(source.assignmentSeed, 'InputPilotDefinition.assignmentSeed');
    this.variants = cloneVariants(source.variants);
    this.environment = cloneEnvironment(source.environment);
    this.thresholds = cloneThresholds(source.thresholds);
    Object.freeze(this);
  }

  toJSON(): InputPilotDefinitionData {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      taskPrompt: this.taskPrompt,
      assignmentSeed: this.assignmentSeed,
      variants: this.variants,
      environment: this.environment,
      thresholds: this.thresholds,
    };
  }

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON(), `InputPilotDefinition ${this.id}`);
  }
}

export function createInputPilotDefinition(value: unknown): InputPilotDefinition {
  return value instanceof InputPilotDefinition ? value : new InputPilotDefinition(value);
}
