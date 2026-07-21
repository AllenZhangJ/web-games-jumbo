import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_INPUT_MAPPER_ID } from '../input/input-mapper-contract.js';

export const INPUT_PILOT_DEFINITION_SCHEMA_VERSION = 2;

export const INPUT_PILOT_PLATFORM = Object.freeze({
  WEB: 'web',
  WECHAT: 'wechat',
  DOUYIN: 'douyin',
});

export const INPUT_PILOT_FORM_FACTOR = Object.freeze({
  PHONE: 'phone',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
});

export const INPUT_PILOT_ORIENTATION = Object.freeze({
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape',
});

export const INPUT_PILOT_INPUT_MODE = Object.freeze({
  TOUCH: 'touch',
  MOUSE: 'mouse',
});

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

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function rate(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} 必须位于 [0, 1]。`);
  }
  return value;
}

function positiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} 必须是有限正数。`);
  }
  return value;
}

function uint32(value, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value;
}

function cloneVariants(values) {
  if (!Array.isArray(values) || values.length !== 2) {
    throw new RangeError('InputPilotDefinition.variants 必须恰好包含两个方案。');
  }
  const ids = new Set();
  const mapperIds = new Set();
  const variants = values.map((value, index) => {
    const name = `InputPilotDefinition.variants[${index}]`;
    assertKnownKeys(value, VARIANT_KEYS, name);
    const id = assertNonEmptyString(value.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`InputPilotDefinition 包含重复 variant ${id}。`);
    ids.add(id);
    const mapperId = enumValue(
      value.mapperId,
      ARENA_INPUT_MAPPER_ID,
      `${name}.mapperId`,
    );
    if (mapperIds.has(mapperId)) {
      throw new RangeError(`InputPilotDefinition 重复使用 mapper ${mapperId}。`);
    }
    mapperIds.add(mapperId);
    return Object.freeze({ id, mapperId });
  });
  return Object.freeze(variants);
}

function cloneEnvironment(value) {
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

function cloneThresholds(value) {
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

export class InputPilotDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'InputPilotDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'InputPilotDefinition');
    if (source.schemaVersion !== INPUT_PILOT_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 InputPilotDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: INPUT_PILOT_DEFINITION_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: assertNonEmptyString(source.id, 'InputPilotDefinition.id'),
        enumerable: true,
      },
      taskPrompt: {
        value: assertNonEmptyString(source.taskPrompt, 'InputPilotDefinition.taskPrompt'),
        enumerable: true,
      },
      assignmentSeed: {
        value: uint32(source.assignmentSeed, 'InputPilotDefinition.assignmentSeed'),
        enumerable: true,
      },
      variants: { value: cloneVariants(source.variants), enumerable: true },
      environment: {
        value: cloneEnvironment(source.environment),
        enumerable: true,
      },
      thresholds: {
        value: cloneThresholds(source.thresholds),
        enumerable: true,
      },
    });
    Object.freeze(this);
  }

  toJSON() {
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

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `InputPilotDefinition ${this.id}`);
  }
}

export function createInputPilotDefinition(value) {
  return value instanceof InputPilotDefinition ? value : new InputPilotDefinition(value);
}
