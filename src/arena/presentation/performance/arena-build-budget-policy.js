import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
} from '@number-strategy-jump/arena-device-acceptance';

export const ARENA_BUILD_BUDGET_POLICY_SCHEMA_VERSION = 1;
export const ARENA_STAGE9_BUILD_BUDGET_V1_ID = 'arena.stage9.build-budget.v1';

const POLICY_KEYS = new Set(['schemaVersion', 'id', 'contentVersion', 'targets']);
const TARGET_KEYS = new Set([
  'platform',
  'excludedDeliverySuffixes',
  'maximumDeliveryBytes',
  'maximumJavaScriptBytes',
  'maximumLargestDeliveryArtifactBytes',
  'maximumArtifactCount',
]);

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function cloneTargets(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaBuildBudgetPolicy.targets 不能为空。');
  }
  const platforms = new Set();
  return Object.freeze(values.map((value, index) => {
    const name = `ArenaBuildBudgetPolicy.targets[${index}]`;
    assertKnownKeys(value, TARGET_KEYS, name);
    const platform = enumValue(value.platform, ARENA_DEVICE_ACCEPTANCE_PLATFORM, `${name}.platform`);
    if (platforms.has(platform)) throw new RangeError(`重复 Build Budget platform ${platform}。`);
    platforms.add(platform);
    const excludedDeliverySuffixes = cloneFrozenStringSet(
      value.excludedDeliverySuffixes,
      `${name}.excludedDeliverySuffixes`,
    );
    if (excludedDeliverySuffixes.some((suffix) => !suffix.startsWith('.'))) {
      throw new RangeError(`${name}.excludedDeliverySuffixes 必须是以 . 开头的扩展名。`);
    }
    return Object.freeze({
      platform,
      excludedDeliverySuffixes,
      maximumDeliveryBytes: assertIntegerAtLeast(
        value.maximumDeliveryBytes,
        1,
        `${name}.maximumDeliveryBytes`,
      ),
      maximumJavaScriptBytes: assertIntegerAtLeast(
        value.maximumJavaScriptBytes,
        1,
        `${name}.maximumJavaScriptBytes`,
      ),
      maximumLargestDeliveryArtifactBytes: assertIntegerAtLeast(
        value.maximumLargestDeliveryArtifactBytes,
        1,
        `${name}.maximumLargestDeliveryArtifactBytes`,
      ),
      maximumArtifactCount: assertIntegerAtLeast(
        value.maximumArtifactCount,
        1,
        `${name}.maximumArtifactCount`,
      ),
    });
  }).sort((left, right) => (
    left.platform < right.platform ? -1 : left.platform > right.platform ? 1 : 0
  )));
}

export class ArenaBuildBudgetPolicy {
  constructor(value) {
    const source = cloneFrozenData(value, 'ArenaBuildBudgetPolicy');
    assertKnownKeys(source, POLICY_KEYS, 'ArenaBuildBudgetPolicy');
    if (source.schemaVersion !== ARENA_BUILD_BUDGET_POLICY_SCHEMA_VERSION) {
      throw new RangeError(`不支持 ArenaBuildBudgetPolicy schema ${String(source.schemaVersion)}。`);
    }
    Object.defineProperties(this, {
      schemaVersion: { value: ARENA_BUILD_BUDGET_POLICY_SCHEMA_VERSION, enumerable: true },
      id: {
        value: assertNonEmptyString(source.id, 'ArenaBuildBudgetPolicy.id'),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(source.contentVersion, 1, 'ArenaBuildBudgetPolicy.contentVersion'),
        enumerable: true,
      },
      targets: { value: cloneTargets(source.targets), enumerable: true },
    });
    Object.freeze(this);
  }

  getTarget(platform) {
    return this.targets.find((target) => target.platform === platform) ?? null;
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      targets: this.targets,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `ArenaBuildBudgetPolicy ${this.id}`);
  }
}

export function createArenaBuildBudgetPolicy(value) {
  return value instanceof ArenaBuildBudgetPolicy ? value : new ArenaBuildBudgetPolicy(value);
}

export function createArenaStage9BuildBudgetV1Policy() {
  const fourMiB = 4 * 1024 * 1024;
  return createArenaBuildBudgetPolicy({
    schemaVersion: ARENA_BUILD_BUDGET_POLICY_SCHEMA_VERSION,
    id: ARENA_STAGE9_BUILD_BUDGET_V1_ID,
    contentVersion: 1,
    targets: [
      {
        platform: ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB,
        excludedDeliverySuffixes: ['.map'],
        maximumDeliveryBytes: fourMiB,
        maximumJavaScriptBytes: 1_572_864,
        maximumLargestDeliveryArtifactBytes: 2 * 1024 * 1024,
        maximumArtifactCount: 256,
      },
      {
        platform: ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        excludedDeliverySuffixes: [],
        maximumDeliveryBytes: fourMiB,
        maximumJavaScriptBytes: 3_670_016,
        maximumLargestDeliveryArtifactBytes: 1_572_864,
        maximumArtifactCount: 128,
      },
      {
        platform: ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        excludedDeliverySuffixes: [],
        maximumDeliveryBytes: fourMiB,
        maximumJavaScriptBytes: 3_670_016,
        maximumLargestDeliveryArtifactBytes: 1_572_864,
        maximumArtifactCount: 128,
      },
    ],
  });
}
