import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1,
} from './arena-v2-single-weapon-production-readiness-candidate-v1.js';
import {
  validateArenaV2SingleWeaponProductionAssessmentCandidateV1,
} from './arena-v2-single-weapon-production-assessment-candidate-v1.js';

export const ARENA_V2_SINGLE_WEAPON_REGISTRATION_PLAN_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const CONTENT_HASH_PATTERN = /^[0-9a-f]{8}$/u;
const VALIDATION_OPTION_KEYS = new Set(['assessment', 'plan']);
const STORED_PLAN_KEYS = new Set([
  'schemaVersion', 'id', 'status', 'implementationStatus', 'validationStatus',
  'executionStatus', 'weaponId', 'equipmentDefinitionId', 'assessmentContentHash',
  'readinessContentHash', 'policyContentHash', 'definitionRegistrations',
  'presentationPromotions', 'sharedPresentationRequirements',
  'compositionRegistrations', 'forwardOperationIds', 'rollbackOperationIds',
  'atomicity', 'rollbackUnit', 'mayRollbackOtherWeapons',
  'groupRegistrationPermitted', 'registryApplyImplemented', 'defaultRegistryWired',
  'defaultCompositionWired', 'contentHash',
]);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function contentHash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!CONTENT_HASH_PATTERN.test(result)) throw new RangeError(`${name}必须是8位小写hash。`);
  return result;
}

const POLICY_AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_SINGLE_WEAPON_REGISTRATION_PLAN_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.single-weapon-registration-plan-policy.candidate.v1' as const,
  status: 'production-unreachable' as const,
  registrationUnit: 'single-weapon' as const,
  commitBoundary: 'one-weapon-one-commit' as const,
  applyMode: 'atomic-new-registry-snapshots-required' as const,
  failurePolicy: 'discard-new-snapshots-keep-current-defaults' as const,
  forwardLayerOrder: Object.freeze([
    'definition',
    'registry',
    'presentation',
    'composition',
  ] as const),
  rollbackOrder: 'exact-reverse-forward-order' as const,
  groupRegistrationPermitted: false as const,
  partialCommitPermitted: false as const,
  mutatesExistingDefinitions: false as const,
  registryApplyImplemented: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
});

export const ARENA_V2_SINGLE_WEAPON_REGISTRATION_PLAN_POLICY_CANDIDATE_V1 =
  Object.freeze({
    ...POLICY_AUTHORITY,
    contentHash: createDeterministicDataHash(
      POLICY_AUTHORITY,
      'Arena V2 single weapon registration plan policy candidate V1',
    ),
  });

/**
 * Builds a data-only migration plan after a stored assessment has been fully
 * recomputed and passed. Applying registry snapshots remains a later, separate
 * production batch; this function never mutates a registry or default entry.
 */
export function createArenaV2SingleWeaponRegistrationPlanCandidateV1(
  value: unknown,
) {
  const assessment = validateArenaV2SingleWeaponProductionAssessmentCandidateV1(value);
  if (!assessment.productionRegistrationPermitted
    || assessment.hardGate !== 'PASS'
    || assessment.independentAudit.decision !== 'advance') {
    throw new RangeError(`Arena V2武器${assessment.weaponId}尚未获准生成生产注册计划。`);
  }
  const readiness = ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1
    .weapons.find(({ weaponId }) => weaponId === assessment.weaponId);
  const weapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(
    ({ id }) => id === assessment.weaponId,
  );
  if (readiness === undefined || weapon === undefined) {
    throw new RangeError(`Arena V2武器${assessment.weaponId}注册来源不存在。`);
  }
  if (assessment.readinessContentHash !== readiness.readinessContentHash
    || assessment.equipmentDefinitionId !== weapon.equipment.id
    || assessment.rollbackUnit.weaponId !== weapon.id
    || assessment.rollbackUnit.equipmentDefinitionId !== weapon.equipment.id) {
    throw new RangeError(`Arena V2武器${assessment.weaponId}注册身份漂移。`);
  }
  const groundAction = weapon.actions.find(
    ({ id }) => id === readiness.identities.groundActionDefinitionId,
  );
  const aerialAction = weapon.actions.find(
    ({ id }) => id === readiness.identities.aerialActionDefinitionId,
  );
  if (groundAction === undefined || aerialAction === undefined) {
    throw new RangeError(`Arena V2武器${weapon.id}注册动作不闭合。`);
  }
  if (readiness.impactAudio.audioAssetId === null
    || readiness.phaseAudio.some(({ audioAssetId }) => audioAssetId === null)
    || !assessment.allProductionAssetsApproved) {
    throw new RangeError(`Arena V2武器${weapon.id}正式表现资产未闭合。`);
  }

  const definitionRegistrations = Object.freeze([
    Object.freeze({
      operationId: `register-definition:${weapon.grammar.id}`,
      layer: 'definition' as const,
      kind: 'weapon-combat-grammar' as const,
      definitionId: weapon.grammar.id,
      definitionHash: readiness.identities.grammarDefinitionHash,
      definition: weapon.grammar,
    }),
    Object.freeze({
      operationId: `register-definition:${groundAction.id}`,
      layer: 'definition' as const,
      kind: 'ground-action' as const,
      definitionId: groundAction.id,
      definitionHash: readiness.identities.actionDefinitionHashes[0]!,
      definition: groundAction,
    }),
    Object.freeze({
      operationId: `register-definition:${aerialAction.id}`,
      layer: 'definition' as const,
      kind: 'aerial-action' as const,
      definitionId: aerialAction.id,
      definitionHash: readiness.identities.actionDefinitionHashes[1]!,
      definition: aerialAction,
    }),
    Object.freeze({
      operationId: `register-definition:${weapon.equipment.id}`,
      layer: 'registry' as const,
      kind: 'equipment' as const,
      definitionId: weapon.equipment.id,
      definitionHash: readiness.identities.equipmentDefinitionHash,
      definition: weapon.equipment,
    }),
  ]);
  const presentationPromotions = Object.freeze([
    ...readiness.actionContexts.map((context) => Object.freeze({
      operationId: `promote-presentation:action:${context.actionDefinitionId}`,
      layer: 'presentation' as const,
      kind: 'action-presentation' as const,
      presentationIdentity: context.actionDefinitionId,
    })),
    Object.freeze({
      operationId: `promote-presentation:attachment:${readiness.attachment.attachmentAssetId}`,
      layer: 'presentation' as const,
      kind: 'weapon-attachment' as const,
      presentationIdentity: readiness.attachment.attachmentAssetId,
    }),
    Object.freeze({
      operationId: `promote-presentation:impact-audio:${readiness.impactAudio.audioAssetId}`,
      layer: 'presentation' as const,
      kind: 'weapon-impact-audio' as const,
      presentationIdentity: readiness.impactAudio.audioAssetId,
    }),
    ...readiness.phaseAudio.map((phase) => Object.freeze({
      operationId: `promote-presentation:phase-audio:${phase.audioAssetId}`,
      layer: 'presentation' as const,
      kind: 'weapon-phase-audio' as const,
      presentationIdentity: phase.audioAssetId!,
    })),
  ]);
  const compositionRegistrations = Object.freeze([
    Object.freeze({
      operationId: `register-composition:collection-weapon:${weapon.id}`,
      layer: 'composition' as const,
      kind: 'collection-weapon-membership' as const,
      compositionIdentity: weapon.id,
      sourceContentHash: weapon.contentHash,
    }),
  ]);
  const sharedPresentationRequirements = Object.freeze(
    readiness.coreFeedbackVfx.map((record) => Object.freeze({
      kind: 'shared-core-feedback-vfx' as const,
      cueId: record.cueId,
      vfxAssetId: record.vfxAssetId,
      productionApproved: record.productionApproved,
      ownedByThisRollbackUnit: false as const,
    })),
  );
  if (sharedPresentationRequirements.some(({ productionApproved }) => !productionApproved)) {
    throw new RangeError(`Arena V2武器${weapon.id}共享VFX批准状态发生漂移。`);
  }
  const forwardOperationIds = Object.freeze([
    ...definitionRegistrations.map(({ operationId }) => operationId),
    ...presentationPromotions.map(({ operationId }) => operationId),
    ...compositionRegistrations.map(({ operationId }) => operationId),
  ]);
  if (forwardOperationIds.length !== 12
    || new Set(forwardOperationIds).size !== forwardOperationIds.length) {
    throw new RangeError(`Arena V2武器${weapon.id}注册操作未闭合12个唯一步骤。`);
  }
  const rollbackOperationIds = Object.freeze([...forwardOperationIds].reverse());
  const authority = Object.freeze({
    schemaVersion: ARENA_V2_SINGLE_WEAPON_REGISTRATION_PLAN_CANDIDATE_V1_SCHEMA_VERSION,
    id: `arena-v2.single-weapon-registration-plan.${weapon.id}.candidate.v1`,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    executionStatus: 'not-run' as const,
    weaponId: weapon.id,
    equipmentDefinitionId: weapon.equipment.id,
    assessmentContentHash: assessment.assessmentContentHash,
    readinessContentHash: readiness.readinessContentHash,
    policyContentHash:
      ARENA_V2_SINGLE_WEAPON_REGISTRATION_PLAN_POLICY_CANDIDATE_V1.contentHash,
    definitionRegistrations,
    presentationPromotions,
    sharedPresentationRequirements,
    compositionRegistrations,
    forwardOperationIds,
    rollbackOperationIds,
    atomicity: Object.freeze({
      applyMode: 'atomic-new-registry-snapshots-required' as const,
      publishOnlyAfterEveryStepSucceeds: true as const,
      failureKeepsCurrentDefaults: true as const,
      partialCommitPermitted: false as const,
    }),
    rollbackUnit: assessment.rollbackUnit,
    mayRollbackOtherWeapons: false as const,
    groupRegistrationPermitted: false as const,
    registryApplyImplemented: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      `Arena V2 single weapon registration plan ${weapon.id}`,
    ),
  });
}

export type ArenaV2SingleWeaponRegistrationPlanCandidateV1 = ReturnType<
  typeof createArenaV2SingleWeaponRegistrationPlanCandidateV1
>;

/** Recomputes a plan from its exact passed assessment and rejects plan drift. */
export function validateArenaV2SingleWeaponRegistrationPlanCandidateV1(
  value: unknown,
): ArenaV2SingleWeaponRegistrationPlanCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 single weapon registration plan validation');
  exactRecord(
    source,
    VALIDATION_OPTION_KEYS,
    'Arena V2 single weapon registration plan validation',
  );
  const assessment = validateArenaV2SingleWeaponProductionAssessmentCandidateV1(
    source.assessment,
  );
  const plan = source.plan;
  exactRecord(plan, STORED_PLAN_KEYS, 'Arena V2 stored single weapon registration plan');
  const storedHash = contentHash(
    plan.contentHash,
    'Arena V2 stored single weapon registration plan.contentHash',
  );
  const { contentHash: _contentHash, ...storedAuthority } = plan;
  const actualStoredHash = createDeterministicDataHash(
    storedAuthority,
    `Arena V2 single weapon registration plan ${String(plan.weaponId)}`,
  );
  if (actualStoredHash !== storedHash) {
    throw new RangeError('Arena V2单把注册计划存储内容hash漂移。');
  }
  const recomputed = createArenaV2SingleWeaponRegistrationPlanCandidateV1(assessment);
  if (recomputed.contentHash !== storedHash) {
    throw new RangeError('Arena V2单把注册计划派生结果漂移。');
  }
  return recomputed;
}
