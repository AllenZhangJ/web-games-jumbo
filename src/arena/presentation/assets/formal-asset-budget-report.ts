import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  FORMAL_ASSET_BUDGET_ARTIFACT_KIND,
  createFormalAssetBudgetPolicy,
  type FormalAssetBudgetArtifactKind,
  type FormalAssetBudgetPolicy,
} from './formal-asset-budget-policy.js';

export const FORMAL_ASSET_BUDGET_REPORT_SCHEMA_VERSION = 1;

const OBSERVATION_KEYS = new Set([
  'id',
  'path',
  'kind',
  'sha256',
  'encodedBytes',
  'nodeCount',
  'jointCount',
  'animationCount',
  'primitiveCount',
  'materialCount',
  'embeddedImageCount',
  'width',
  'height',
  'decodedRgbaBytes',
]);

export interface FormalAssetBudgetObservation {
  readonly id: string;
  readonly path: string;
  readonly kind: FormalAssetBudgetArtifactKind;
  readonly sha256: string;
  readonly encodedBytes: number;
  readonly nodeCount: number | null;
  readonly jointCount: number | null;
  readonly animationCount: number | null;
  readonly primitiveCount: number | null;
  readonly materialCount: number | null;
  readonly embeddedImageCount: number | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly decodedRgbaBytes: number | null;
}

type FormalAssetObservationMetricKey = Exclude<keyof FormalAssetBudgetObservation,
  'id' | 'path' | 'kind' | 'sha256' | 'encodedBytes'>;

export interface FormalAssetBudgetGate {
  readonly id: string;
  readonly value: number;
  readonly threshold: number;
  readonly passed: boolean;
}

export interface FormalAssetBudgetReport {
  readonly schemaVersion: typeof FORMAL_ASSET_BUDGET_REPORT_SCHEMA_VERSION;
  readonly policyId: string;
  readonly policyHash: string;
  readonly status: 'passed' | 'failed';
  readonly artifactCount: number;
  readonly totalEncodedBytes: number;
  readonly totalAudioBytes: number;
  readonly totalDecodedTextureBytes: number;
  readonly failedGateIds: readonly string[];
  readonly gates: readonly FormalAssetBudgetGate[];
  readonly observations: readonly FormalAssetBudgetObservation[];
  readonly resultHash: string;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function optionalInteger(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function cloneObservations(
  policy: FormalAssetBudgetPolicy,
  values: unknown,
): readonly FormalAssetBudgetObservation[] {
  if (!Array.isArray(values) || values.length !== policy.artifacts.length) {
    throw new RangeError('Formal Asset Budget observations 必须与 Policy artifacts 一一对应。');
  }
  const definitions = new Map(policy.artifacts.map((artifact) => [artifact.id, artifact]));
  const seen = new Set<string>();
  const result = values.map((value, index) => {
    const name = `FormalAssetBudgetObservation[${index}]`;
    assertKnownKeys(value, OBSERVATION_KEYS, name);
    const id = assertNonEmptyString(value.id, `${name}.id`);
    const definition = definitions.get(id);
    if (!definition) throw new RangeError(`Policy 未声明 Formal Asset Budget artifact ${id}。`);
    if (seen.has(id)) throw new RangeError(`重复 Formal Asset Budget observation ${id}。`);
    seen.add(id);
    if (value.path !== definition.path || value.kind !== definition.kind) {
      throw new RangeError(`Formal Asset Budget observation ${id} 的 path/kind 与 Policy 不一致。`);
    }
    const observation = Object.freeze({
      id,
      path: definition.path,
      kind: definition.kind,
      sha256: assertNonEmptyString(value.sha256, `${name}.sha256`),
      encodedBytes: assertIntegerAtLeast(value.encodedBytes, 1, `${name}.encodedBytes`),
      nodeCount: optionalInteger(value.nodeCount, `${name}.nodeCount`),
      jointCount: optionalInteger(value.jointCount, `${name}.jointCount`),
      animationCount: optionalInteger(value.animationCount, `${name}.animationCount`),
      primitiveCount: optionalInteger(value.primitiveCount, `${name}.primitiveCount`),
      materialCount: optionalInteger(value.materialCount, `${name}.materialCount`),
      embeddedImageCount: optionalInteger(
        value.embeddedImageCount,
        `${name}.embeddedImageCount`,
      ),
      width: optionalInteger(value.width, `${name}.width`),
      height: optionalInteger(value.height, `${name}.height`),
      decodedRgbaBytes: optionalInteger(value.decodedRgbaBytes, `${name}.decodedRgbaBytes`),
    });
    const model = observation.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.CHARACTER_MODEL
      || observation.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.MODEL_ATTACHMENT;
    const texture = observation.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.TEXTURE;
    const metricExpectations: readonly (readonly [FormalAssetObservationMetricKey, boolean])[] = [
      ['nodeCount', model],
      ['jointCount', model],
      ['animationCount', model],
      ['primitiveCount', model],
      ['materialCount', model],
      ['embeddedImageCount', model],
      ['width', texture],
      ['height', texture],
      ['decodedRgbaBytes', texture],
    ];
    for (const [key, expected] of metricExpectations) {
      if ((observation[key] !== null) !== expected) {
        throw new RangeError(`${name}.${key} 与 artifact kind ${observation.kind} 不一致。`);
      }
    }
    return observation;
  });
  const missing = policy.artifacts.find(({ id }) => !seen.has(id));
  if (missing) throw new RangeError(`Formal Asset Budget 缺少 observation ${missing.id}。`);
  return Object.freeze(result.sort((left, right) => compareText(left.id, right.id)));
}

function sum(
  values: readonly FormalAssetBudgetObservation[],
  field: 'encodedBytes' | 'decodedRgbaBytes',
  name: string,
): number {
  let total = 0;
  for (const value of values) {
    const amount = value[field];
    if (amount === null) throw new RangeError(`${name} 包含空值。`);
    total += amount;
    if (!Number.isSafeInteger(total)) throw new RangeError(`${name} 总量溢出。`);
  }
  return total;
}

function gate(id: string, value: number, threshold: number, passed: boolean): FormalAssetBudgetGate {
  return Object.freeze({ id, value, threshold, passed });
}

function requiredObservationMetric(
  observation: FormalAssetBudgetObservation,
  key: FormalAssetObservationMetricKey,
): number {
  const value = observation[key];
  if (value === null) {
    throw new RangeError(`Formal Asset Budget observation ${observation.id}.${key} 不能为空。`);
  }
  return value;
}

export function createFormalAssetBudgetReport(
  policyValue: unknown,
  observationValues: unknown,
): FormalAssetBudgetReport {
  const policy = createFormalAssetBudgetPolicy(policyValue);
  const observations = cloneObservations(policy, observationValues);
  const definitions = new Map(policy.artifacts.map((artifact) => [artifact.id, artifact]));
  const audio = observations.filter(({ kind }) => kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.AUDIO);
  const textures = observations.filter(({ kind }) => (
    kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.TEXTURE
  ));
  const totalEncodedBytes = sum(observations, 'encodedBytes', 'Formal Asset encoded bytes');
  const totalAudioBytes = sum(audio, 'encodedBytes', 'Formal Asset audio bytes');
  const totalDecodedTextureBytes = sum(
    textures,
    'decodedRgbaBytes',
    'Formal Asset decoded texture bytes',
  );
  const gates = [
    gate(
      'total-encoded-bytes',
      totalEncodedBytes,
      policy.maximumTotalEncodedBytes,
      totalEncodedBytes <= policy.maximumTotalEncodedBytes,
    ),
    gate(
      'total-audio-bytes',
      totalAudioBytes,
      policy.maximumTotalAudioBytes,
      totalAudioBytes <= policy.maximumTotalAudioBytes,
    ),
    gate(
      'total-decoded-texture-bytes',
      totalDecodedTextureBytes,
      policy.maximumTotalDecodedTextureBytes,
      totalDecodedTextureBytes <= policy.maximumTotalDecodedTextureBytes,
    ),
  ];
  for (const observation of observations) {
    const definition = definitions.get(observation.id);
    if (!definition) throw new RangeError(`Policy 未声明 artifact ${observation.id}。`);
    gates.push(gate(
      `${observation.id}:encoded-bytes`,
      observation.encodedBytes,
      definition.maximumEncodedBytes,
      observation.encodedBytes <= definition.maximumEncodedBytes,
    ));
    if (observation.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.CHARACTER_MODEL) {
      const nodeCount = requiredObservationMetric(observation, 'nodeCount');
      const jointCount = requiredObservationMetric(observation, 'jointCount');
      const animationCount = requiredObservationMetric(observation, 'animationCount');
      const primitiveCount = requiredObservationMetric(observation, 'primitiveCount');
      const materialCount = requiredObservationMetric(observation, 'materialCount');
      const embeddedImageCount = requiredObservationMetric(observation, 'embeddedImageCount');
      gates.push(
        gate(`${observation.id}:nodes`, nodeCount, policy.maximumCharacterNodes,
          nodeCount <= policy.maximumCharacterNodes),
        gate(`${observation.id}:joints`, jointCount, policy.maximumCharacterJoints,
          jointCount <= policy.maximumCharacterJoints),
        gate(
          `${observation.id}:animations`,
          animationCount,
          policy.requiredCharacterAnimationCount,
          animationCount === policy.requiredCharacterAnimationCount
            && animationCount <= policy.maximumCharacterAnimationCount,
        ),
        gate(
          `${observation.id}:primitives`,
          primitiveCount,
          policy.maximumCharacterPrimitives,
          primitiveCount <= policy.maximumCharacterPrimitives,
        ),
        gate(
          `${observation.id}:materials`,
          materialCount,
          policy.maximumCharacterMaterials,
          materialCount <= policy.maximumCharacterMaterials,
        ),
        gate(`${observation.id}:embedded-images`, embeddedImageCount, 0,
          embeddedImageCount === 0),
      );
    } else if (observation.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.MODEL_ATTACHMENT) {
      const nodeCount = requiredObservationMetric(observation, 'nodeCount');
      const jointCount = requiredObservationMetric(observation, 'jointCount');
      const animationCount = requiredObservationMetric(observation, 'animationCount');
      const primitiveCount = requiredObservationMetric(observation, 'primitiveCount');
      const materialCount = requiredObservationMetric(observation, 'materialCount');
      const embeddedImageCount = requiredObservationMetric(observation, 'embeddedImageCount');
      gates.push(
        gate(`${observation.id}:nodes`, nodeCount, policy.maximumAttachmentNodes,
          nodeCount <= policy.maximumAttachmentNodes),
        gate(`${observation.id}:joints`, jointCount, 0, jointCount === 0),
        gate(`${observation.id}:animations`, animationCount, 0, animationCount === 0),
        gate(
          `${observation.id}:primitives`,
          primitiveCount,
          policy.maximumAttachmentPrimitives,
          primitiveCount <= policy.maximumAttachmentPrimitives,
        ),
        gate(
          `${observation.id}:materials`,
          materialCount,
          policy.maximumAttachmentMaterials,
          materialCount <= policy.maximumAttachmentMaterials,
        ),
        gate(`${observation.id}:embedded-images`, embeddedImageCount, 0,
          embeddedImageCount === 0),
      );
    } else if (observation.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.TEXTURE) {
      const width = requiredObservationMetric(observation, 'width');
      const height = requiredObservationMetric(observation, 'height');
      const decodedRgbaBytes = requiredObservationMetric(observation, 'decodedRgbaBytes');
      gates.push(
        gate(`${observation.id}:width`, width, policy.maximumTextureDimension,
          width <= policy.maximumTextureDimension),
        gate(`${observation.id}:height`, height, policy.maximumTextureDimension,
          height <= policy.maximumTextureDimension),
        gate(
          `${observation.id}:decoded-rgba-bytes`,
          decodedRgbaBytes,
          policy.maximumDecodedTextureBytesPerArtifact,
          decodedRgbaBytes <= policy.maximumDecodedTextureBytesPerArtifact,
        ),
      );
    }
  }
  const frozenGates = Object.freeze(gates);
  const failedGateIds = Object.freeze(frozenGates.filter(({ passed }) => !passed).map(({ id }) => id));
  const result = cloneFrozenData({
    schemaVersion: FORMAL_ASSET_BUDGET_REPORT_SCHEMA_VERSION,
    policyId: policy.id,
    policyHash: policy.getContentHash(),
    status: failedGateIds.length === 0 ? 'passed' : 'failed',
    artifactCount: observations.length,
    totalEncodedBytes,
    totalAudioBytes,
    totalDecodedTextureBytes,
    failedGateIds,
    gates: frozenGates,
    observations,
  }, 'FormalAssetBudgetReport');
  return cloneFrozenData({
    ...result,
    resultHash: createDeterministicDataHash(result, 'FormalAssetBudgetReport'),
  }, 'FormalAssetBudgetReport with hash') as FormalAssetBudgetReport;
}
