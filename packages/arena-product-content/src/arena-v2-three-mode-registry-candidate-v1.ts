import {
  MODE_DEFINITION_SCHEMA_VERSION,
  MODE_KIND,
  MODE_POLICY_TYPE,
  ModeRegistry,
  createModePolicyDefinition,
  getModePolicyType,
  type ModeKind,
  type ModePolicyDefinition,
  type ModePolicyType,
  type ObjectivePolicyDefinition,
  type RespawnPolicyDefinition,
  type TimelinePolicyDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-switchback-map-candidate-v1.js';
import {
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
} from './arena-v2-learning-profile-definition-candidate-v1.js';
import {
  ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
} from './arena-v2-race-finish-capability-id-v1.js';
import {
  ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1,
} from './arena-v2-race-respawn-tuning-candidate-v1.js';
import {
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1,
} from './arena-v2-survival-baseline-weapon-tiers-candidate-v1.js';
import {
  ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1,
} from './arena-v2-survival-pressure-candidate-v1.js';
import {
  ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1,
} from './arena-v2-survival-first-respawn-tuning-candidate-v1.js';
import {
  ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1,
} from './arena-v2-three-mode-timeline-product-proposal-candidate-v1.js';

export const ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2ThreeModePolicyCandidateEnvelopeV1 {
  readonly status: 'production-unreachable';
  readonly definition: unknown;
}

export interface ArenaV2ThreeModeRegistryCandidateV1Options {
  readonly schemaVersion: typeof ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly policyDefinitions: readonly ArenaV2ThreeModePolicyCandidateEnvelopeV1[];
}

export interface ArenaV2ThreeModeRegistryCandidateV1 {
  readonly schemaVersion: typeof ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
  readonly defaultEntryWired: false;
  readonly validationStatus: 'not-run';
  readonly modeDefinitionIds: Readonly<{
    readonly duel: string;
    readonly race: string;
    readonly survival: string;
  }>;
  readonly mapDefinitionIds: readonly string[];
  readonly requiredBasePolicyDefinitionCount: 21;
  readonly registeredPolicyDefinitionCount: 23;
  readonly raceRespawnTuningContentHash: string;
  readonly survivalFirstRespawnTuningContentHash: string;
  readonly timelineProductProposalContentHash: string;
  readonly timelineProposalStatus: 'proposed-not-approved';
  readonly timelineBalanceApprovalStatus: 'not-run';
  readonly registryContentHash: string;
  readonly registry: ModeRegistry;
}

const OPTIONS_KEYS = new Set([
  'schemaVersion',
  'status',
  'hardGate',
  'policyDefinitions',
]);
const POLICY_ENVELOPE_KEYS = new Set(['status', 'definition']);
const BASE_POLICY_TYPES = Object.freeze([
  MODE_POLICY_TYPE.PARTICIPANT,
  MODE_POLICY_TYPE.TIMELINE,
  MODE_POLICY_TYPE.OBJECTIVE,
  MODE_POLICY_TYPE.ELIMINATION,
  MODE_POLICY_TYPE.RESPAWN,
  MODE_POLICY_TYPE.RELATIONSHIP,
  MODE_POLICY_TYPE.RESULT,
] as const);
const MODE_KINDS = Object.freeze([
  MODE_KIND.DUEL,
  MODE_KIND.RACE,
  MODE_KIND.SURVIVAL,
] as const);
const EXPECTED_BASE_POLICY_COUNT = 21 as const;
const EXPECTED_REGISTERED_POLICY_COUNT = 23 as const;

const MAP_DEFINITION_IDS = Object.freeze([
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
]);
const MAP_CAPABILITY_IDS = Object.freeze([...new Set([
  ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
  ...ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.anchors.flatMap(({ id }) => (
    id === ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.finishAnchorId ? [] : [id]
  )),
  ...ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.anchors.flatMap(({ id }) => (
    id === ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.finishAnchorId ? [] : [id]
  )),
])].sort(compareText));
const SURVIVAL_CATALOG = ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1;
const SURVIVAL_SUPPLY_DEFINITION_ID = SURVIVAL_CATALOG.supplyDefinition.id;
const SURVIVAL_TIER_POLICY = SURVIVAL_CATALOG.tierPolicyDefinition;
const EQUIPMENT_DEFINITION_IDS = Object.freeze([...new Set(
  SURVIVAL_TIER_POLICY.tiers.flatMap(({ variants }) => variants.flatMap((variant) => [
    variant.collectionEquipmentDefinitionId,
    variant.runtimeEquipmentDefinitionId,
  ])),
)].sort(compareText));

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
  return record;
}

function policyKey(modeKind: ModeKind, policyType: ModePolicyType): string {
  return `${modeKind}\u0000${policyType}`;
}

function assertProductionCandidatePolicyIdentity(
  definition: ModePolicyDefinition,
  policyType: ModePolicyType,
): void {
  const expectedPrefix = `arena-v2.mode-policy.${definition.modeKind}.`;
  if (
    !definition.id.startsWith(expectedPrefix)
    || !definition.id.includes('.candidate.')
    || definition.id.includes('.test.')
    || definition.id.endsWith('.test')
  ) {
    throw new RangeError(
      `${definition.modeKind} ${policyType} Policy必须使用非.test.的具名candidate身份。`,
    );
  }
}

function normalizeBasePolicies(value: unknown): readonly ModePolicyDefinition[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Arena V2 three-mode registry policyDefinitions必须是数组。');
  }
  if (value.length !== EXPECTED_BASE_POLICY_COUNT) {
    throw new RangeError(
      `Arena V2 three-mode registry必须显式提交${EXPECTED_BASE_POLICY_COUNT}项基础Policy。`,
    );
  }
  const definitions = value.map((item, index) => {
    const name = `Arena V2 three-mode registry policyDefinitions[${index}]`;
    const envelope = exactRecord(item, POLICY_ENVELOPE_KEYS, name);
    if (envelope.status !== 'production-unreachable') {
      throw new RangeError(`${name}.status必须为production-unreachable。`);
    }
    const definition = createModePolicyDefinition(envelope.definition);
    const policyType = getModePolicyType(definition);
    if (!(BASE_POLICY_TYPES as readonly ModePolicyType[]).includes(policyType)) {
      throw new RangeError('Survival Pressure/Tier必须由冻结产品内容绑定，调用方不得替换。');
    }
    assertProductionCandidatePolicyIdentity(definition, policyType);
    return definition;
  });

  const definitionsByKey = new Map<string, ModePolicyDefinition>();
  for (const definition of definitions) {
    const type = getModePolicyType(definition);
    const key = policyKey(definition.modeKind, type);
    if (definitionsByKey.has(key)) {
      throw new RangeError(`${definition.modeKind} ${type} Policy重复。`);
    }
    definitionsByKey.set(key, definition);
  }
  for (const modeKind of MODE_KINDS) {
    for (const policyType of BASE_POLICY_TYPES) {
      if (!definitionsByKey.has(policyKey(modeKind, policyType))) {
        throw new RangeError(`${modeKind}缺少${policyType} Policy。`);
      }
    }
  }
  return Object.freeze(definitions);
}

function requirePolicy<T extends ModePolicyDefinition>(
  definitions: readonly ModePolicyDefinition[],
  modeKind: ModeKind,
  policyType: ModePolicyType,
): T {
  const definition = definitions.find((candidate) => (
    candidate.modeKind === modeKind && getModePolicyType(candidate) === policyType
  ));
  if (!definition) throw new RangeError(`${modeKind}缺少${policyType} Policy。`);
  return definition as T;
}

function assertSingleSourceRespawnPolicies(
  definitions: readonly ModePolicyDefinition[],
): void {
  const raceRespawn = requirePolicy<RespawnPolicyDefinition>(
    definitions,
    MODE_KIND.RACE,
    MODE_POLICY_TYPE.RESPAWN,
  );
  const raceRespawnPolicyContentHash = createDeterministicDataHash(
    raceRespawn,
    'Arena V2 Race submitted respawn policy',
  );
  if (raceRespawnPolicyContentHash
    !== ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.respawnPolicyContentHash) {
    throw new RangeError('Race Respawn Policy必须绑定统一重生候选调优。');
  }
  const respawn = requirePolicy<RespawnPolicyDefinition>(
    definitions,
    MODE_KIND.SURVIVAL,
    MODE_POLICY_TYPE.RESPAWN,
  );
  const respawnPolicyContentHash = createDeterministicDataHash(
    respawn,
    'Arena V2 Survival first respawn submitted policy',
  );
  if (respawnPolicyContentHash
    !== ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.respawnPolicyContentHash) {
    throw new RangeError('Survival Respawn Policy必须绑定统一首次复活候选调优。');
  }
}

function assertSingleSourceTimelinePolicies(
  definitions: readonly ModePolicyDefinition[],
): void {
  for (const modeKind of MODE_KINDS) {
    const actual = requirePolicy<TimelinePolicyDefinition>(
      definitions,
      modeKind,
      MODE_POLICY_TYPE.TIMELINE,
    );
    const expected = ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1
      .policyDefinitions[modeKind];
    const hashName = `Arena V2 ${modeKind} submitted Timeline product proposal`;
    if (createDeterministicDataHash(actual, hashName)
      !== createDeterministicDataHash(expected, hashName)) {
      throw new RangeError(
        `${modeKind} Timeline Policy必须绑定保留当前Runtime数值的唯一未批准产品提案。`,
      );
    }
  }
}

function assertSingleSourceRaceObjective(
  definitions: readonly ModePolicyDefinition[],
): void {
  const objective = requirePolicy<ObjectivePolicyDefinition>(
    definitions,
    MODE_KIND.RACE,
    MODE_POLICY_TYPE.OBJECTIVE,
  ).objective;
  if (objective.kind !== MODE_KIND.RACE
    || objective.finishGateCapabilityId !== ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1) {
    throw new RangeError('Race Objective必须绑定跨地图统一终点能力。');
  }
  for (const content of [
    ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
    ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1,
  ]) {
    if (content.raceFinishCapability.capabilityId
        !== ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1
      || content.raceFinishCapability.anchorId !== content.routeDefinition.finishAnchorId
      || !content.routeDefinition.anchors.some(
        ({ id }) => id === content.raceFinishCapability.anchorId,
      )) {
      throw new RangeError(`Race地图${content.mapDefinition.id}终点能力映射漂移。`);
    }
  }
}

function referencedMapCapabilities(
  objective: ObjectivePolicyDefinition,
  respawn: RespawnPolicyDefinition,
): readonly string[] {
  const ids: string[] = [];
  if (objective.objective.kind === MODE_KIND.RACE) {
    ids.push(objective.objective.finishGateCapabilityId);
  }
  for (const role of respawn.rolePolicies) {
    if (role.anchorPolicy.kind === 'latest-valid-safe-anchor') {
      ids.push(role.anchorPolicy.fallbackAnchorCapabilityId);
    } else if (role.anchorPolicy.kind === 'fixed-anchor') {
      ids.push(role.anchorPolicy.anchorCapabilityId);
    }
  }
  return Object.freeze([...new Set(ids)].sort(compareText));
}

function modeDefinition(
  modeKind: ModeKind,
  definitions: readonly ModePolicyDefinition[],
): Readonly<Record<string, unknown>> {
  const participant = requirePolicy(definitions, modeKind, MODE_POLICY_TYPE.PARTICIPANT);
  const timeline = requirePolicy(definitions, modeKind, MODE_POLICY_TYPE.TIMELINE);
  const objective = requirePolicy<ObjectivePolicyDefinition>(
    definitions,
    modeKind,
    MODE_POLICY_TYPE.OBJECTIVE,
  );
  const elimination = requirePolicy(definitions, modeKind, MODE_POLICY_TYPE.ELIMINATION);
  const respawn = requirePolicy<RespawnPolicyDefinition>(
    definitions,
    modeKind,
    MODE_POLICY_TYPE.RESPAWN,
  );
  const relationship = requirePolicy(definitions, modeKind, MODE_POLICY_TYPE.RELATIONSHIP);
  const result = requirePolicy(definitions, modeKind, MODE_POLICY_TYPE.RESULT);
  const isSurvival = modeKind === MODE_KIND.SURVIVAL;
  const policyCapabilities = referencedMapCapabilities(objective, respawn);
  const requiredMapCapabilities = modeKind === MODE_KIND.DUEL
    ? policyCapabilities
    : MAP_CAPABILITY_IDS;
  return Object.freeze({
    schemaVersion: MODE_DEFINITION_SCHEMA_VERSION,
    id: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1[modeKind],
    kind: modeKind,
    participantPolicyDefinitionId: participant.id,
    timelinePolicyDefinitionId: timeline.id,
    objectivePolicyDefinitionId: objective.id,
    eliminationPolicyDefinitionId: elimination.id,
    respawnPolicyDefinitionId: respawn.id,
    relationshipPolicyDefinitionId: relationship.id,
    resultPolicyDefinitionId: result.id,
    requiredMapCapabilities,
    equipmentSupplyDefinitionId: isSurvival ? SURVIVAL_SUPPLY_DEFINITION_ID : null,
    survivalPressurePolicyDefinitionId: isSurvival
      ? ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1.id
      : null,
    survivalEquipmentTierPolicyDefinitionId: isSurvival ? SURVIVAL_TIER_POLICY.id : null,
  });
}

export function createArenaV2ThreeModeRegistryCandidateV1(
  value: unknown,
): ArenaV2ThreeModeRegistryCandidateV1 {
  const source = exactRecord(
    cloneFrozenData(value, 'Arena V2 three-mode registry options'),
    OPTIONS_KEYS,
    'Arena V2 three-mode registry options',
  );
  if (source.schemaVersion !== ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena V2 three-mode registry schemaVersion必须为1。');
  }
  if (source.status !== 'production-unreachable' || source.hardGate !== false) {
    throw new RangeError('Arena V2 three-mode registry只能作为production-unreachable候选构造。');
  }
  const basePolicies = normalizeBasePolicies(source.policyDefinitions);
  assertSingleSourceTimelinePolicies(basePolicies);
  assertSingleSourceRaceObjective(basePolicies);
  assertSingleSourceRespawnPolicies(basePolicies);
  const registry = new ModeRegistry({
    modeDefinitions: MODE_KINDS.map((modeKind) => modeDefinition(modeKind, basePolicies)),
    policyDefinitions: [
      ...basePolicies,
      ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1,
      SURVIVAL_TIER_POLICY,
    ],
    mapCapabilityIds: MAP_CAPABILITY_IDS,
    equipmentSupplyDefinitionIds: [SURVIVAL_SUPPLY_DEFINITION_ID],
    equipmentDefinitionIds: EQUIPMENT_DEFINITION_IDS,
  });

  return Object.freeze({
    schemaVersion: ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    hardGate: false,
    defaultRegistryWired: false,
    defaultCompositionWired: false,
    defaultEntryWired: false,
    validationStatus: 'not-run',
    modeDefinitionIds: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
    mapDefinitionIds: MAP_DEFINITION_IDS,
    requiredBasePolicyDefinitionCount: EXPECTED_BASE_POLICY_COUNT,
    registeredPolicyDefinitionCount: EXPECTED_REGISTERED_POLICY_COUNT,
    raceRespawnTuningContentHash:
      ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.contentHash,
    survivalFirstRespawnTuningContentHash:
      ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.contentHash,
    timelineProductProposalContentHash:
      ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1.contentHash,
    timelineProposalStatus:
      ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1.proposalStatus,
    timelineBalanceApprovalStatus: 'not-run',
    registryContentHash: registry.contentHash,
    registry,
  });
}

export const ARENA_V2_THREE_MODE_REGISTRY_ASSEMBLY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  createsDefaultRegistryInstance: false as const,
  requiresExplicitBasePolicyDefinitions: true as const,
  requiredBasePolicyDefinitionCount: EXPECTED_BASE_POLICY_COUNT,
  bindsFrozenSurvivalPressureAndTierPolicies: true as const,
  bindsSingleSourceRaceRespawnTuning: true as const,
  bindsSingleSourceRaceFinishCapability: true as const,
  raceRespawnProtectionBalanceApprovalStatus: 'not-run' as const,
  bindsSingleSourceSurvivalFirstRespawnTuning: true as const,
  survivalFirstRespawnBalanceApprovalStatus: 'not-run' as const,
  bindsSingleSourceThreeModeTimelineProductProposal: true as const,
  timelineProposalStatus: 'proposed-not-approved' as const,
  timelineBalanceApprovalStatus: 'not-run' as const,
  timelineRuntimePolicyConsumptionWired: false as const,
  bindsCurrentTwoMapCapabilityCatalog: true as const,
});
