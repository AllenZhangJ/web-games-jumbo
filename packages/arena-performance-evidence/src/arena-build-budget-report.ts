import {
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
  createArenaBuildManifest,
} from '@number-strategy-jump/arena-device-acceptance';
import type { ArenaBuildArtifact } from '@number-strategy-jump/arena-device-acceptance';
import { createArenaBuildBudgetPolicy } from './arena-build-budget-policy.js';

export const ARENA_BUILD_BUDGET_REPORT_SCHEMA_VERSION = 1;

interface ArenaBuildBudgetGate {
  readonly id: string;
  readonly value: number | string;
  readonly threshold: number | string;
  readonly passed: boolean;
}

function sumArtifactBytes(values: readonly ArenaBuildArtifact[], name: string): number {
  let result = 0;
  for (const { byteLength } of values) {
    result += byteLength;
    if (!Number.isSafeInteger(result)) throw new RangeError(`${name} 总字节数溢出。`);
  }
  return result;
}

export function createArenaBuildBudgetReport(policyValue: unknown, manifestValue: unknown) {
  const policy = createArenaBuildBudgetPolicy(policyValue);
  const manifest = createArenaBuildManifest(manifestValue);
  const target = policy.getTarget(manifest.target);
  if (!target) throw new RangeError(`Build Budget Policy 未定义平台 ${manifest.target}。`);
  const deliveryArtifacts = manifest.artifacts.filter(({ path }) => (
    !target.excludedDeliverySuffixes.some((suffix) => path.endsWith(suffix))
  ));
  const deliveryBytes = sumArtifactBytes(deliveryArtifacts, 'Build delivery');
  const javaScriptBytes = sumArtifactBytes(
    deliveryArtifacts.filter(({ path }) => path.endsWith('.js')),
    'Build JavaScript',
  );
  const largestDeliveryArtifact = deliveryArtifacts.reduce<ArenaBuildArtifact | null>(
    (largest, artifact) => (
      largest === null || artifact.byteLength > largest.byteLength ? artifact : largest
    ),
    null,
  );
  const gates: readonly ArenaBuildBudgetGate[] = Object.freeze([
    {
      id: 'artifact-count',
      value: manifest.artifacts.length,
      threshold: target.maximumArtifactCount,
      passed: manifest.artifacts.length <= target.maximumArtifactCount,
    },
    {
      id: 'delivery-bytes',
      value: deliveryBytes,
      threshold: target.maximumDeliveryBytes,
      passed: deliveryBytes <= target.maximumDeliveryBytes,
    },
    {
      id: 'javascript-bytes',
      value: javaScriptBytes,
      threshold: target.maximumJavaScriptBytes,
      passed: javaScriptBytes <= target.maximumJavaScriptBytes,
    },
    {
      id: 'largest-delivery-artifact-bytes',
      value: largestDeliveryArtifact?.byteLength ?? 0,
      threshold: target.maximumLargestDeliveryArtifactBytes,
      passed: (largestDeliveryArtifact?.byteLength ?? 0) <= target.maximumLargestDeliveryArtifactBytes,
    },
    {
      id: 'product-default-entry',
      value: manifest.defaultEntry,
      threshold: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
      passed: manifest.defaultEntry === ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
    },
  ].map((gate) => Object.freeze(gate)));
  const failedGateIds = gates.filter(({ passed }) => !passed).map(({ id }) => id);
  const result = cloneFrozenData({
    schemaVersion: ARENA_BUILD_BUDGET_REPORT_SCHEMA_VERSION,
    policyId: policy.id,
    policyHash: policy.getContentHash(),
    manifestHash: manifest.getContentHash(),
    buildId: manifest.buildId,
    commit: manifest.commit,
    sourceDirty: manifest.sourceDirty,
    platform: manifest.target,
    deliveryArtifactCount: deliveryArtifacts.length,
    deliveryBytes,
    javaScriptBytes,
    largestDeliveryArtifact: largestDeliveryArtifact === null
      ? null
      : { path: largestDeliveryArtifact.path, byteLength: largestDeliveryArtifact.byteLength },
    status: failedGateIds.length === 0 ? 'passed' : 'failed',
    freezeEligible: failedGateIds.length === 0 && !manifest.sourceDirty,
    failedGateIds,
    gates,
  }, 'ArenaBuildBudgetReport');
  return cloneFrozenData({
    ...result,
    resultHash: createDeterministicDataHash(result, 'ArenaBuildBudgetReport'),
  }, 'ArenaBuildBudgetReport with hash');
}
