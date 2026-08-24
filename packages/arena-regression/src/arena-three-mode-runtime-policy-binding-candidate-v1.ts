import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  validateFinalizedMatchAssignmentV2,
  validateMatchContentSelectionV2,
} from '@number-strategy-jump/arena-contracts';
import {
  MODE_POLICY_TYPE,
  createModeDefinition,
  createModePolicyDefinition,
  getModePolicyType,
  resolveTimelinePolicyRuntimeVariantV2,
  type EliminationPolicyDefinition,
  type ModeKind,
  type ObjectivePolicyDefinition,
  type ParticipantPolicyDefinition,
  type RelationshipPolicyDefinition,
  type ResolvedModePolicyBundle,
  type RespawnPolicyDefinition,
  type ResultPolicyDefinition,
  type SurvivalEquipmentTierPolicyDefinition,
  type SurvivalPressurePolicyDefinition,
  type TimelinePolicyDefinition,
  type TimelinePolicyDefinitionV1,
  type TimelinePolicyDefinitionV2,
  type TimelinePolicyVariantSelectorV2,
} from '@number-strategy-jump/arena-definitions';
import type {
  MatchModeObjectivePolicyResolverDefinitionBundleV1,
  MatchModePolicyResolverDefinitionBundleV1,
  MatchModeResultPolicyResolverDefinitionBundleV1,
  MatchModeTimelinePolicyResolverDefinitionBundleV1,
} from '@number-strategy-jump/arena-match';

const BINDING_KEYS = new Set([
  'schemaVersion',
  'status',
  'hardGate',
  'registryContentHash',
  'bundle',
  'timelineConsumption',
  'objectiveConsumption',
  'resultConsumption',
  'contentHash',
]);
const BUNDLE_KEYS = new Set([
  'mode',
  'contentVersion',
  'participant',
  'timeline',
  'objective',
  'elimination',
  'respawn',
  'relationship',
  'result',
  'survivalPressure',
  'survivalEquipmentTier',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

export interface ArenaThreeModeRuntimePolicyBindingCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly registryContentHash: string;
  readonly bundle: ResolvedModePolicyBundle;
  readonly timelineConsumption: 'identity-only-until-balance-approved';
  readonly objectiveConsumption: 'runtime-terminal-objective-asserted';
  readonly resultConsumption: 'runtime-terminal-result-asserted';
  readonly contentHash: string;
}

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string) {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举自有数据字段。`);
    }
  }
  return source;
}

function policy<T>(
  value: unknown,
  expectedType: typeof MODE_POLICY_TYPE[keyof typeof MODE_POLICY_TYPE],
  modeKind: ModeKind,
  name: string,
): T {
  const definition = createModePolicyDefinition(value);
  if (getModePolicyType(definition) !== expectedType || definition.modeKind !== modeKind) {
    throw new RangeError(`${name}类型或Mode身份漂移。`);
  }
  return definition as unknown as T;
}

function normalizedBundle(value: unknown): ResolvedModePolicyBundle {
  const source = exactRecord(value, BUNDLE_KEYS, 'Arena runtime policy binding bundle');
  const mode = createModeDefinition(source.mode);
  const contentVersion = assertIntegerAtLeast(
    source.contentVersion,
    1,
    'Arena runtime policy binding bundle.contentVersion',
  );
  const participant = policy<ParticipantPolicyDefinition>(
    source.participant,
    MODE_POLICY_TYPE.PARTICIPANT,
    mode.kind,
    'Arena runtime participant policy',
  );
  const timeline = policy<TimelinePolicyDefinition>(
    source.timeline,
    MODE_POLICY_TYPE.TIMELINE,
    mode.kind,
    'Arena runtime timeline policy',
  );
  const objective = policy<ObjectivePolicyDefinition>(
    source.objective,
    MODE_POLICY_TYPE.OBJECTIVE,
    mode.kind,
    'Arena runtime objective policy',
  );
  const elimination = policy<EliminationPolicyDefinition>(
    source.elimination,
    MODE_POLICY_TYPE.ELIMINATION,
    mode.kind,
    'Arena runtime elimination policy',
  );
  const respawn = policy<RespawnPolicyDefinition>(
    source.respawn,
    MODE_POLICY_TYPE.RESPAWN,
    mode.kind,
    'Arena runtime respawn policy',
  );
  const relationship = policy<RelationshipPolicyDefinition>(
    source.relationship,
    MODE_POLICY_TYPE.RELATIONSHIP,
    mode.kind,
    'Arena runtime relationship policy',
  );
  const result = policy<ResultPolicyDefinition>(
    source.result,
    MODE_POLICY_TYPE.RESULT,
    mode.kind,
    'Arena runtime result policy',
  );
  const survivalPressure = source.survivalPressure === null
    ? null
    : policy<SurvivalPressurePolicyDefinition>(
      source.survivalPressure,
      MODE_POLICY_TYPE.SURVIVAL_PRESSURE,
      mode.kind,
      'Arena runtime Survival pressure policy',
    );
  const survivalEquipmentTier = source.survivalEquipmentTier === null
    ? null
    : policy<SurvivalEquipmentTierPolicyDefinition>(
      source.survivalEquipmentTier,
      MODE_POLICY_TYPE.SURVIVAL_EQUIPMENT_TIER,
      mode.kind,
      'Arena runtime Survival tier policy',
    );
  if (mode.participantPolicyDefinitionId !== participant.id
    || mode.timelinePolicyDefinitionId !== timeline.id
    || mode.objectivePolicyDefinitionId !== objective.id
    || mode.eliminationPolicyDefinitionId !== elimination.id
    || mode.respawnPolicyDefinitionId !== respawn.id
    || mode.relationshipPolicyDefinitionId !== relationship.id
    || mode.resultPolicyDefinitionId !== result.id
    || mode.survivalPressurePolicyDefinitionId !== (survivalPressure?.id ?? null)
    || mode.survivalEquipmentTierPolicyDefinitionId !== (survivalEquipmentTier?.id ?? null)) {
    throw new RangeError('Arena runtime policy binding的Mode与Policy引用闭包漂移。');
  }
  if (mode.kind === 'survival') {
    if (survivalPressure === null || survivalEquipmentTier === null) {
      throw new RangeError('Arena Survival runtime policy binding缺少压力或装备等级Policy。');
    }
  } else if (survivalPressure !== null || survivalEquipmentTier !== null) {
    throw new RangeError('Arena非Survival runtime policy binding不能携带Survival Policy。');
  }
  const nonTimelinePolicies = Object.freeze([
    participant,
    objective,
    elimination,
    respawn,
    relationship,
    result,
    ...(survivalPressure === null ? [] : [survivalPressure]),
    ...(survivalEquipmentTier === null ? [] : [survivalEquipmentTier]),
  ]);
  const nonTimelineContentVersion = nonTimelinePolicies[0]!.contentVersion;
  if (nonTimelinePolicies.some(({ contentVersion: version }) => (
    version !== nonTimelineContentVersion
  ))) {
    throw new RangeError('Arena runtime policy binding基础Policy contentVersion不一致。');
  }
  const timelineIsV2 = Object.hasOwn(timeline, 'variants');
  const expectedContentVersion = timelineIsV2
    ? timeline.contentVersion === 2 && nonTimelineContentVersion === 1
      ? 2
      : null
    : timeline.contentVersion === nonTimelineContentVersion
      ? nonTimelineContentVersion
      : null;
  if (expectedContentVersion === null || contentVersion !== expectedContentVersion) {
    throw new RangeError('Arena runtime policy binding Policy contentVersion组合或bundle版本漂移。');
  }
  return Object.freeze({
    mode,
    contentVersion,
    participant,
    timeline,
    objective,
    elimination,
    respawn,
    relationship,
    result,
    survivalPressure,
    survivalEquipmentTier,
  });
}

function payload(
  registryContentHash: string,
  bundle: ResolvedModePolicyBundle,
) {
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    registryContentHash,
    bundle,
    timelineConsumption: 'identity-only-until-balance-approved' as const,
    objectiveConsumption: 'runtime-terminal-objective-asserted' as const,
    resultConsumption: 'runtime-terminal-result-asserted' as const,
  });
}

export function createArenaThreeModeRuntimePolicyBindingCandidateV1(
  registryContentHashValue: unknown,
  bundleValue: ResolvedModePolicyBundle,
): ArenaThreeModeRuntimePolicyBindingCandidateV1 {
  const registryContentHash = typeof registryContentHashValue === 'string'
    ? registryContentHashValue
    : '';
  if (!HASH_PATTERN.test(registryContentHash)) {
    throw new RangeError('Arena runtime policy binding Registry hash必须是8位小写hash。');
  }
  const bundle = normalizedBundle(bundleValue);
  const body = payload(registryContentHash, bundle);
  return Object.freeze({
    ...body,
    contentHash: createDeterministicDataHash(body, 'Arena runtime policy binding candidate V1'),
  });
}

export function validateArenaThreeModeRuntimePolicyBindingCandidateV1(
  value: unknown,
  expectedModeDefinitionId: string,
  expectedModeKind: ModeKind,
): ArenaThreeModeRuntimePolicyBindingCandidateV1 {
  const source = exactRecord(
    cloneFrozenData(value, 'Arena runtime policy binding candidate V1'),
    BINDING_KEYS,
    'Arena runtime policy binding candidate V1',
  );
  if (source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.hardGate !== false
    || source.timelineConsumption !== 'identity-only-until-balance-approved'
    || source.objectiveConsumption !== 'runtime-terminal-objective-asserted'
    || source.resultConsumption !== 'runtime-terminal-result-asserted') {
    throw new RangeError('Arena runtime policy binding封套或消费边界漂移。');
  }
  const normalized = createArenaThreeModeRuntimePolicyBindingCandidateV1(
    source.registryContentHash,
    normalizedBundle(source.bundle),
  );
  if (source.contentHash !== normalized.contentHash) {
    throw new RangeError('Arena runtime policy binding contentHash漂移。');
  }
  if (normalized.bundle.mode.id !== expectedModeDefinitionId
    || normalized.bundle.mode.kind !== expectedModeKind) {
    throw new RangeError('Arena runtime policy binding目标Mode身份漂移。');
  }
  return normalized;
}

export function assertArenaThreeModeRuntimePolicyParticipantAssignmentCandidateV1(
  binding: ArenaThreeModeRuntimePolicyBindingCandidateV1,
  finalAssignmentValue: unknown,
): void {
  const assignment = validateFinalizedMatchAssignmentV2(finalAssignmentValue);
  const policyDefinition = binding.bundle.participant;
  if (assignment.modeDefinitionId !== binding.bundle.mode.id
    || assignment.participants.length < policyDefinition.minimumParticipants
    || assignment.participants.length > policyDefinition.maximumParticipants) {
    throw new RangeError('Arena runtime participant assignment不符合resolved Participant Policy。');
  }
  for (const role of policyDefinition.roles) {
    const participants = assignment.participants.filter(({ modeRole }) => modeRole === role.modeRole);
    if (participants.length < role.minimumCount || participants.length > role.maximumCount) {
      throw new RangeError(`Arena runtime role ${role.modeRole}人数不符合resolved Policy。`);
    }
    for (const participant of participants) {
      if (!role.allowedControllerKinds.includes(participant.controllerKind)) {
        throw new RangeError(`Arena runtime participant ${participant.participantId} controller漂移。`);
      }
      if (role.teamRule.kind === 'none' ? participant.teamId !== null
        : participant.teamId !== role.teamRule.teamId) {
        throw new RangeError(`Arena runtime participant ${participant.participantId} team漂移。`);
      }
      if (role.slotRule.kind === 'none' ? participant.slotId !== null
        : participant.slotId === null || !role.slotRule.slotIds.includes(participant.slotId)) {
        throw new RangeError(`Arena runtime participant ${participant.participantId} slot漂移。`);
      }
    }
  }
  const declaredRoles = new Set(policyDefinition.roles.map(({ modeRole }) => modeRole));
  for (const participant of assignment.participants) {
    if (!declaredRoles.has(participant.modeRole)) {
      throw new RangeError(
        `Arena runtime participant ${participant.participantId}使用未声明的Mode role。`,
      );
    }
  }
  for (const bound of policyDefinition.controllerKindBounds) {
    const count = assignment.participants.filter(
      ({ controllerKind }) => controllerKind === bound.controllerKind,
    ).length;
    if (count < bound.minimumCount || count > bound.maximumCount) {
      throw new RangeError(`Arena runtime controller ${bound.controllerKind}人数不符合resolved Policy。`);
    }
  }
}

export function assertArenaThreeModeRuntimePolicyContentSelectionCandidateV1(
  binding: ArenaThreeModeRuntimePolicyBindingCandidateV1,
  selectionValue: unknown,
): void {
  const selection = validateMatchContentSelectionV2(selectionValue);
  if (selection.modeDefinitionId !== binding.bundle.mode.id
    || !selection.contentDefinitionId.endsWith(
      `.mode-registry-${binding.registryContentHash}`,
    )) {
    throw new RangeError('Arena runtime Policy binding与本局Content Registry身份不一致。');
  }
}

export function projectArenaRuntimePolicyResolverBundleCandidateV1(
  bindingValue: unknown,
  expectedModeDefinitionId: string,
  expectedModeKind: ModeKind,
): MatchModePolicyResolverDefinitionBundleV1 {
  const binding = validateArenaThreeModeRuntimePolicyBindingCandidateV1(
    bindingValue,
    expectedModeDefinitionId,
    expectedModeKind,
  );
  const bundleWithoutHash = Object.freeze({
    schemaVersion: 1 as const,
    modeDefinitionId: binding.bundle.mode.id,
    modeKind: binding.bundle.mode.kind,
    participant: Object.freeze({
      definitionId: binding.bundle.participant.id,
      minimumParticipants: binding.bundle.participant.minimumParticipants,
      maximumParticipants: binding.bundle.participant.maximumParticipants,
      roles: Object.freeze(binding.bundle.participant.roles.map((role) => Object.freeze({
        modeRole: role.modeRole,
        minimumCount: role.minimumCount,
        maximumCount: role.maximumCount,
        allowedControllerKinds: role.allowedControllerKinds,
        teamId: role.teamRule.kind === 'none' ? null : role.teamRule.teamId,
        slotIds: role.slotRule.kind === 'none' ? Object.freeze([]) : role.slotRule.slotIds,
      }))),
      controllerKindBounds: binding.bundle.participant.controllerKindBounds,
    }),
    elimination: Object.freeze({
      definitionId: binding.bundle.elimination.id,
      roleDispositions: binding.bundle.elimination.roleDispositions,
    }),
    respawn: Object.freeze({
      definitionId: binding.bundle.respawn.id,
      rolePolicies: Object.freeze(binding.bundle.respawn.rolePolicies.map((role) => Object.freeze({
        modeRole: role.modeRole,
        enabled: role.enabled,
        delayTicks: role.delayTicks,
        maximumRespawns: role.maximumRespawns,
        anchorPolicy: Object.freeze({
          kind: role.anchorPolicy.kind,
          anchorCapabilityId: role.anchorPolicy.kind === 'disabled'
            ? null
            : role.anchorPolicy.kind === 'fixed-anchor'
              ? role.anchorPolicy.anchorCapabilityId
              : role.anchorPolicy.fallbackAnchorCapabilityId,
        }),
        protectionTicks: role.protectionTicks,
      }))),
    }),
    relationship: Object.freeze({
      definitionId: binding.bundle.relationship.id,
      selfTargeting: binding.bundle.relationship.selfTargeting,
      relations: binding.bundle.relationship.relations,
    }),
  });
  return Object.freeze({
    ...bundleWithoutHash,
    contentHash: createDeterministicDataHash(
      Object.freeze({ bundleWithoutHash, runtimePolicyBindingContentHash: binding.contentHash }),
      expectedModeKind === 'duel'
        ? 'Arena Duel resolved runtime policy resolver bundle'
        : `Arena ${expectedModeKind} resolved runtime policy resolver bundle`,
    ),
  });
}

export function projectArenaDuelRuntimePolicyResolverBundleCandidateV1(
  bindingValue: unknown,
  expectedModeDefinitionId: string,
): MatchModePolicyResolverDefinitionBundleV1 {
  return projectArenaRuntimePolicyResolverBundleCandidateV1(
    bindingValue,
    expectedModeDefinitionId,
    'duel',
  );
}

export function projectArenaRuntimeObjectivePolicyResolverBundleCandidateV1(
  bindingValue: unknown,
  expectedModeDefinitionId: string,
  expectedModeKind: ModeKind,
  matchPolicyContentHash: string,
): MatchModeObjectivePolicyResolverDefinitionBundleV1 {
  const binding = validateArenaThreeModeRuntimePolicyBindingCandidateV1(
    bindingValue,
    expectedModeDefinitionId,
    expectedModeKind,
  );
  const authorityBundle = projectArenaRuntimePolicyResolverBundleCandidateV1(
    binding,
    expectedModeDefinitionId,
    expectedModeKind,
  );
  if (!HASH_PATTERN.test(matchPolicyContentHash)) {
    throw new RangeError('Arena Objective resolver match Policy hash必须是8位小写hash。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    modeDefinitionId: binding.bundle.mode.id,
    modeKind: binding.bundle.mode.kind,
    matchPolicyContentHash,
    contentHash: authorityBundle.contentHash,
    objective: Object.freeze({
      definitionId: binding.bundle.objective.id,
      ...binding.bundle.objective.objective,
    }) as MatchModeObjectivePolicyResolverDefinitionBundleV1['objective'],
  });
}

export function projectArenaRuntimeTimelinePolicyResolverBundleCandidateV1(
  bindingValue: unknown,
  expectedModeDefinitionId: string,
  expectedModeKind: ModeKind,
  matchPolicyContentHash: string,
): MatchModeTimelinePolicyResolverDefinitionBundleV1 {
  const binding = validateArenaThreeModeRuntimePolicyBindingCandidateV1(
    bindingValue,
    expectedModeDefinitionId,
    expectedModeKind,
  );
  const authorityBundle = projectArenaRuntimePolicyResolverBundleCandidateV1(
    binding,
    expectedModeDefinitionId,
    expectedModeKind,
  );
  if (!HASH_PATTERN.test(matchPolicyContentHash)) {
    throw new RangeError('Arena Timeline resolver match Policy hash必须是8位小写hash。');
  }
  if (Object.hasOwn(binding.bundle.timeline, 'variants')) {
    throw new RangeError('Arena Timeline V1投影不能消费Timeline Policy V2变体。');
  }
  const timeline = binding.bundle.timeline as TimelinePolicyDefinitionV1;
  return Object.freeze({
    schemaVersion: 1 as const,
    modeDefinitionId: binding.bundle.mode.id,
    modeKind: binding.bundle.mode.kind,
    matchPolicyContentHash,
    contentHash: authorityBundle.contentHash,
    timeline: Object.freeze({
      definitionId: timeline.id,
      preparingTicks: timeline.preparingTicks,
      hardLimitActiveTicks: timeline.hardLimitTicks,
      suddenDeathStartActiveTick: timeline.suddenDeathStartActiveTick,
    }),
  });
}

export function projectArenaRuntimeTimelinePolicyResolverBundleCandidateV2(
  bindingValue: unknown,
  expectedModeDefinitionId: string,
  expectedModeKind: ModeKind,
  matchPolicyContentHash: string,
  selector: TimelinePolicyVariantSelectorV2,
): MatchModeTimelinePolicyResolverDefinitionBundleV1 {
  const binding = validateArenaThreeModeRuntimePolicyBindingCandidateV1(
    bindingValue,
    expectedModeDefinitionId,
    expectedModeKind,
  );
  if (!HASH_PATTERN.test(matchPolicyContentHash)) {
    throw new RangeError('Arena Timeline V2 resolver match Policy hash必须是8位小写hash。');
  }
  if (!Object.hasOwn(binding.bundle.timeline, 'variants')) {
    throw new RangeError('Arena Timeline V2投影必须消费Timeline Policy V2变体。');
  }
  const policy = binding.bundle.timeline as TimelinePolicyDefinitionV2;
  const selected = resolveTimelinePolicyRuntimeVariantV2(policy, selector);
  const body = Object.freeze({
    schemaVersion: 1 as const,
    modeDefinitionId: binding.bundle.mode.id,
    modeKind: binding.bundle.mode.kind,
    matchPolicyContentHash,
    timeline: Object.freeze({
      definitionId: policy.id,
      preparingTicks: selected.preparingTicks,
      hardLimitActiveTicks: selected.hardLimitActiveTicks,
      suddenDeathStartActiveTick: selected.suddenDeathStartActiveTick,
    }),
  });
  return Object.freeze({
    ...body,
    contentHash: createDeterministicDataHash(Object.freeze({
      body,
      runtimePolicyBindingContentHash: binding.contentHash,
      timelinePolicyContentVersion: policy.contentVersion,
      selector: selected.selector,
    }), 'Arena resolved Timeline Policy V2 variant bundle'),
  });
}

export function projectArenaRuntimeResultPolicyResolverBundleCandidateV1(
  bindingValue: unknown,
  expectedModeDefinitionId: string,
  expectedModeKind: ModeKind,
): MatchModeResultPolicyResolverDefinitionBundleV1 {
  const binding = validateArenaThreeModeRuntimePolicyBindingCandidateV1(
    bindingValue,
    expectedModeDefinitionId,
    expectedModeKind,
  );
  const authorityBundle = projectArenaRuntimePolicyResolverBundleCandidateV1(
    binding,
    expectedModeDefinitionId,
    expectedModeKind,
  );
  return Object.freeze({
    schemaVersion: 1 as const,
    modeDefinitionId: binding.bundle.mode.id,
    modeKind: binding.bundle.mode.kind,
    contentHash: authorityBundle.contentHash,
    result: Object.freeze({
      definitionId: binding.bundle.result.id,
      resultKind: binding.bundle.result.resultKind,
      allowedReasons: binding.bundle.result.allowedReasons,
      projectionPolicy: binding.bundle.result.projectionPolicy,
    }),
  });
}

function assertExactOrderedValues(
  actual: readonly string[],
  expected: readonly string[],
  name: string,
): void {
  if (actual.length !== expected.length
    || actual.some((value, index) => value !== expected[index])) {
    throw new RangeError(`${name}与现有runtime语义不一致。`);
  }
}

export function assertArenaRuntimeExistingModeSemanticsCandidateV1(
  bindingValue: unknown,
  expectedModeDefinitionId: string,
  expectedModeKind: 'race' | 'survival',
): ArenaThreeModeRuntimePolicyBindingCandidateV1 {
  const binding = validateArenaThreeModeRuntimePolicyBindingCandidateV1(
    bindingValue,
    expectedModeDefinitionId,
    expectedModeKind,
  );
  const objective = binding.bundle.objective.objective;
  const result = binding.bundle.result;
  if (expectedModeKind === 'race') {
    if (objective.kind !== 'race'
      || objective.validClaimEndPolicy !== 'claim-tick'
      || objective.sameTickRankPolicy !== 'shared-rank-1'
      || objective.hardLimitPolicy !== 'no-finisher'
      || result.resultKind !== 'race'
      || result.projectionPolicy !== 'finish-then-progress-with-ties') {
      throw new RangeError('Arena Race resolved Objective/Result与现有runtime语义不一致。');
    }
    assertExactOrderedValues(
      result.allowedReasons,
      Object.freeze(['finish-claimed', 'no-finisher']),
      'Arena Race Result reasons',
    );
  } else {
    if (objective.kind !== 'survival'
      || objective.terminalPlayerFallCount !== 2
      || objective.hardLimitPolicy !== 'survival-time-cap'
      || result.resultKind !== 'survival'
      || result.projectionPolicy !== 'ticks-stage-falls') {
      throw new RangeError('Arena Survival resolved Objective/Result与现有runtime语义不一致。');
    }
    assertExactOrderedValues(
      result.allowedReasons,
      Object.freeze(['survival-time-cap', 'terminal-player-fall']),
      'Arena Survival Result reasons',
    );
  }
  return binding;
}

export function resolveArenaRuntimeRespawnRolePolicyCandidateV1(
  bindingValue: unknown,
  expectedModeDefinitionId: string,
  expectedModeKind: 'race' | 'survival',
  modeRole: 'competitor' | 'player',
) {
  const binding = validateArenaThreeModeRuntimePolicyBindingCandidateV1(
    bindingValue,
    expectedModeDefinitionId,
    expectedModeKind,
  );
  const rolePolicy = binding.bundle.respawn.rolePolicies.find(
    (candidate) => candidate.modeRole === modeRole,
  );
  if (rolePolicy === undefined || !rolePolicy.enabled) {
    throw new RangeError(`Arena ${expectedModeKind} runtime缺少已启用的${modeRole}重生Policy。`);
  }
  return Object.freeze({ binding, rolePolicy });
}

export const ARENA_THREE_MODE_RUNTIME_POLICY_BINDING_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  resolvedParticipantPolicyConsumedByRuntime: true as const,
  resolvedRespawnPolicyConsumedByRuntime: true as const,
  duelEliminationAndRelationshipPolicyConsumedByRuntime: true as const,
  raceEliminationAndRelationshipPolicyConsumedByRuntime: true as const,
  survivalEliminationAndRelationshipPolicyConsumedByRuntime: true as const,
  survivalPressureSlotOrderAndStagesConsumedByRuntime: true as const,
  survivalTierPolicyConstrainsActiveWeaponRegistrySubset: true as const,
  timelinePolicyConsumption: 'identity-only-until-balance-approved' as const,
  explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true as const,
  explicitTimelinePolicyRuntimeMirrorWired: false as const,
  objectivePolicyConsumption: 'runtime-terminal-objective-asserted' as const,
  resultPolicyConsumption: 'runtime-terminal-result-asserted' as const,
  threeModeObjectivePolicyAssertedAtTerminal: true as const,
  threeModeResultPolicyAssertedAtTerminal: true as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
});
