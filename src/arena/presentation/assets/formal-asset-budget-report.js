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

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function optionalInteger(value, name) {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function cloneObservations(policy, values) {
  if (!Array.isArray(values) || values.length !== policy.artifacts.length) {
    throw new RangeError('Formal Asset Budget observations 必须与 Policy artifacts 一一对应。');
  }
  const definitions = new Map(policy.artifacts.map((artifact) => [artifact.id, artifact]));
  const seen = new Set();
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
    for (const [key, expected] of Object.entries({
      nodeCount: model,
      jointCount: model,
      animationCount: model,
      primitiveCount: model,
      materialCount: model,
      embeddedImageCount: model,
      width: texture,
      height: texture,
      decodedRgbaBytes: texture,
    })) {
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

function sum(values, field, name) {
  let total = 0;
  for (const value of values) {
    total += value[field];
    if (!Number.isSafeInteger(total)) throw new RangeError(`${name} 总量溢出。`);
  }
  return total;
}

function gate(id, value, threshold, passed) {
  return Object.freeze({ id, value, threshold, passed });
}

export function createFormalAssetBudgetReport(policyValue, observationValues) {
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
    gates.push(gate(
      `${observation.id}:encoded-bytes`,
      observation.encodedBytes,
      definition.maximumEncodedBytes,
      observation.encodedBytes <= definition.maximumEncodedBytes,
    ));
    if (observation.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.CHARACTER_MODEL) {
      gates.push(
        gate(`${observation.id}:nodes`, observation.nodeCount, policy.maximumCharacterNodes,
          observation.nodeCount <= policy.maximumCharacterNodes),
        gate(`${observation.id}:joints`, observation.jointCount, policy.maximumCharacterJoints,
          observation.jointCount <= policy.maximumCharacterJoints),
        gate(
          `${observation.id}:animations`,
          observation.animationCount,
          policy.requiredCharacterAnimationCount,
          observation.animationCount === policy.requiredCharacterAnimationCount
            && observation.animationCount <= policy.maximumCharacterAnimationCount,
        ),
        gate(
          `${observation.id}:primitives`,
          observation.primitiveCount,
          policy.maximumCharacterPrimitives,
          observation.primitiveCount <= policy.maximumCharacterPrimitives,
        ),
        gate(
          `${observation.id}:materials`,
          observation.materialCount,
          policy.maximumCharacterMaterials,
          observation.materialCount <= policy.maximumCharacterMaterials,
        ),
        gate(`${observation.id}:embedded-images`, observation.embeddedImageCount, 0,
          observation.embeddedImageCount === 0),
      );
    } else if (observation.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.MODEL_ATTACHMENT) {
      gates.push(
        gate(`${observation.id}:nodes`, observation.nodeCount, policy.maximumAttachmentNodes,
          observation.nodeCount <= policy.maximumAttachmentNodes),
        gate(`${observation.id}:joints`, observation.jointCount, 0,
          observation.jointCount === 0),
        gate(`${observation.id}:animations`, observation.animationCount, 0,
          observation.animationCount === 0),
        gate(
          `${observation.id}:primitives`,
          observation.primitiveCount,
          policy.maximumAttachmentPrimitives,
          observation.primitiveCount <= policy.maximumAttachmentPrimitives,
        ),
        gate(
          `${observation.id}:materials`,
          observation.materialCount,
          policy.maximumAttachmentMaterials,
          observation.materialCount <= policy.maximumAttachmentMaterials,
        ),
        gate(`${observation.id}:embedded-images`, observation.embeddedImageCount, 0,
          observation.embeddedImageCount === 0),
      );
    } else if (observation.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.TEXTURE) {
      gates.push(
        gate(`${observation.id}:width`, observation.width, policy.maximumTextureDimension,
          observation.width <= policy.maximumTextureDimension),
        gate(`${observation.id}:height`, observation.height, policy.maximumTextureDimension,
          observation.height <= policy.maximumTextureDimension),
        gate(
          `${observation.id}:decoded-rgba-bytes`,
          observation.decodedRgbaBytes,
          policy.maximumDecodedTextureBytesPerArtifact,
          observation.decodedRgbaBytes <= policy.maximumDecodedTextureBytesPerArtifact,
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
  }, 'FormalAssetBudgetReport with hash');
}
