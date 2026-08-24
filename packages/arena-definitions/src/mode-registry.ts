import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  createModeDefinition,
  MODE_KIND,
  type ModeDefinition,
} from './mode-definition.js';
import {
  createModePolicyDefinition,
  getModePolicyType,
  MODE_POLICY_TYPE,
  MODE_RESPAWN_ANCHOR_POLICY_KIND,
  MODE_ROLE,
  MODE_SLOT_RULE_KIND,
  type EliminationPolicyDefinition,
  type ModePolicyDefinition,
  type ModePolicyType,
  type ObjectivePolicyDefinition,
  type ParticipantPolicyDefinition,
  type RelationshipPolicyDefinition,
  type RespawnPolicyDefinition,
  type ResultPolicyDefinition,
  type SurvivalEquipmentTierPolicyDefinition,
  type SurvivalPressurePolicyDefinition,
  type TimelinePolicyDefinition,
} from './mode-policy-definition.js';

export interface ModePolicyRegistryContract {
  readonly size: number;
  has(id: string): boolean;
  get(id: string): ModePolicyDefinition | undefined;
  require(id: string): ModePolicyDefinition;
  list(): readonly ModePolicyDefinition[];
}

export interface ModeRegistrySource {
  readonly modeDefinitions: readonly unknown[];
  readonly policyDefinitions: readonly unknown[];
  readonly mapCapabilityIds: readonly string[];
  readonly equipmentSupplyDefinitionIds: readonly string[];
  readonly equipmentDefinitionIds: readonly string[];
}

export interface ResolvedModePolicyBundle {
  readonly mode: ModeDefinition;
  readonly contentVersion: number;
  readonly participant: ParticipantPolicyDefinition;
  readonly timeline: TimelinePolicyDefinition;
  readonly objective: ObjectivePolicyDefinition;
  readonly elimination: EliminationPolicyDefinition;
  readonly respawn: RespawnPolicyDefinition;
  readonly relationship: RelationshipPolicyDefinition;
  readonly result: ResultPolicyDefinition;
  readonly survivalPressure: SurvivalPressurePolicyDefinition | null;
  readonly survivalEquipmentTier: SurvivalEquipmentTierPolicyDefinition | null;
}

export interface ModeRegistryContract {
  readonly size: number;
  readonly contentHash: string;
  has(id: string): boolean;
  get(id: string): ModeDefinition | undefined;
  require(id: string): ModeDefinition;
  list(): readonly ModeDefinition[];
  resolve(id: string): ResolvedModePolicyBundle;
}

function referencedPolicyIds(definitions: readonly ModeDefinition[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const definition of definitions) {
    ids.add(definition.participantPolicyDefinitionId);
    ids.add(definition.timelinePolicyDefinitionId);
    ids.add(definition.objectivePolicyDefinitionId);
    ids.add(definition.eliminationPolicyDefinitionId);
    ids.add(definition.respawnPolicyDefinitionId);
    ids.add(definition.relationshipPolicyDefinitionId);
    ids.add(definition.resultPolicyDefinitionId);
    if (definition.survivalPressurePolicyDefinitionId !== null) {
      ids.add(definition.survivalPressurePolicyDefinitionId);
    }
    if (definition.survivalEquipmentTierPolicyDefinitionId !== null) {
      ids.add(definition.survivalEquipmentTierPolicyDefinitionId);
    }
  }
  return ids;
}

const REGISTRY_SOURCE_KEYS = new Set([
  'modeDefinitions',
  'policyDefinitions',
  'mapCapabilityIds',
  'equipmentSupplyDefinitionIds',
  'equipmentDefinitionIds',
]);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function compareById(left: Readonly<{ id: string }>, right: Readonly<{ id: string }>): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requirePolicy<T extends ModePolicyDefinition>(
  registry: ModePolicyRegistry,
  id: string,
  expectedType: ModePolicyType,
  referenceName: string,
): T {
  const policy = registry.require(id);
  if (getModePolicyType(policy) !== expectedType) {
    throw new RangeError(`${referenceName} 未引用 ${expectedType} Policy。`);
  }
  return policy as T;
}

function assertRegistered(id: string, registered: ReadonlySet<string>, name: string): void {
  if (!registered.has(id)) throw new RangeError(`${name} 引用未注册 ID ${id}。`);
}

function assertMapCapability(
  id: string,
  mode: ModeDefinition,
  knownMapCapabilities: ReadonlySet<string>,
  name: string,
): void {
  assertRegistered(id, knownMapCapabilities, name);
  if (!mode.requiredMapCapabilities.includes(id)) {
    throw new RangeError(`${name} 未进入 ModeDefinition.requiredMapCapabilities 闭包。`);
  }
}

function assertSameValues(actual: readonly string[], expected: readonly string[], name: string): void {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new RangeError(`${name} 引用闭包不一致。`);
  }
}

export class ModePolicyRegistry implements ModePolicyRegistryContract {
  readonly #definitionsById: Map<string, ModePolicyDefinition>;
  readonly #definitions: readonly ModePolicyDefinition[];

  constructor(definitions: unknown = []) {
    const source = cloneFrozenData(definitions, 'ModePolicyRegistry definitions');
    if (!Array.isArray(source)) throw new TypeError('ModePolicyRegistry definitions 必须是数组。');
    const normalized = source.map(createModePolicyDefinition).sort(compareById);
    this.#definitionsById = new Map();
    for (const definition of normalized) {
      if (this.#definitionsById.has(definition.id)) {
        throw new RangeError(`ModePolicyRegistry 包含重复 id ${definition.id}。`);
      }
      this.#definitionsById.set(definition.id, definition);
    }
    this.#definitions = Object.freeze(normalized);
    Object.freeze(this);
  }

  get size(): number { return this.#definitions.length; }
  has(id: string): boolean { return this.#definitionsById.has(id); }
  get(id: string): ModePolicyDefinition | undefined { return this.#definitionsById.get(id); }

  require(id: string): ModePolicyDefinition {
    const normalizedId = assertNonEmptyString(id, 'ModePolicyRegistry id');
    const definition = this.get(normalizedId);
    if (!definition) throw new RangeError('未知 ModePolicyDefinition。');
    return definition;
  }

  list(): readonly ModePolicyDefinition[] { return this.#definitions; }
}

function validatePolicyContentVersion(bundle: Omit<ResolvedModePolicyBundle, 'contentVersion'>): number {
  const nonTimelinePolicies = [
    bundle.participant,
    bundle.objective,
    bundle.elimination,
    bundle.respawn,
    bundle.relationship,
    bundle.result,
    ...(bundle.survivalPressure ? [bundle.survivalPressure] : []),
    ...(bundle.survivalEquipmentTier ? [bundle.survivalEquipmentTier] : []),
  ];
  const contentVersion = nonTimelinePolicies[0]!.contentVersion;
  if (nonTimelinePolicies.some((policy) => policy.contentVersion !== contentVersion)) {
    throw new RangeError(`ModeDefinition ${bundle.mode.id} 的 Policy contentVersion 不一致。`);
  }
  if (!Object.hasOwn(bundle.timeline, 'variants')
    && bundle.timeline.contentVersion === contentVersion) return contentVersion;
  if (Object.hasOwn(bundle.timeline, 'variants')
    && bundle.timeline.contentVersion === 2
    && contentVersion === 1) return 2;
  throw new RangeError(
    `ModeDefinition ${bundle.mode.id} 只允许全V1或基础Policy V1 + Timeline V2的版本组合。`,
  );
}

function validatePolicyModeKind(bundle: Omit<ResolvedModePolicyBundle, 'contentVersion'>): void {
  const policies = [
    bundle.participant,
    bundle.timeline,
    bundle.objective,
    bundle.elimination,
    bundle.respawn,
    bundle.relationship,
    bundle.result,
    ...(bundle.survivalPressure ? [bundle.survivalPressure] : []),
    ...(bundle.survivalEquipmentTier ? [bundle.survivalEquipmentTier] : []),
  ];
  if (policies.some((policy) => policy.modeKind !== bundle.mode.kind)) {
    throw new RangeError(`ModeDefinition ${bundle.mode.id} 的 Policy modeKind 不一致。`);
  }
}

function validateRoleClosure(bundle: Omit<ResolvedModePolicyBundle, 'contentVersion'>): void {
  const roles = bundle.participant.roles.map((role) => role.modeRole).sort(compareText);
  assertSameValues(
    bundle.elimination.roleDispositions.map((item) => item.modeRole).sort(compareText),
    roles,
    'EliminationPolicyDefinition roles',
  );
  assertSameValues(
    bundle.respawn.rolePolicies.map((item) => item.modeRole).sort(compareText),
    roles,
    'RespawnPolicyDefinition roles',
  );
  const relationPairs = bundle.relationship.relations
    .map((item) => `${item.sourceRole}\u0000${item.targetRole}`)
    .sort(compareText);
  const expectedPairs = roles.flatMap((sourceRole) => roles.map((targetRole) => (
    `${sourceRole}\u0000${targetRole}`
  ))).sort(compareText);
  assertSameValues(relationPairs, expectedPairs, 'RelationshipPolicyDefinition roles');
}

function validateMapClosure(
  bundle: Omit<ResolvedModePolicyBundle, 'contentVersion'>,
  knownMapCapabilities: ReadonlySet<string>,
): void {
  for (const id of bundle.mode.requiredMapCapabilities) {
    assertRegistered(id, knownMapCapabilities, `ModeDefinition ${bundle.mode.id} map capability`);
  }
  if (bundle.objective.objective.kind === MODE_KIND.RACE) {
    assertMapCapability(
      bundle.objective.objective.finishGateCapabilityId,
      bundle.mode,
      knownMapCapabilities,
      'Race finish gate',
    );
  }
  for (const policy of bundle.respawn.rolePolicies) {
    if (policy.anchorPolicy.kind === MODE_RESPAWN_ANCHOR_POLICY_KIND.LATEST_VALID_SAFE_ANCHOR) {
      assertMapCapability(
        policy.anchorPolicy.fallbackAnchorCapabilityId,
        bundle.mode,
        knownMapCapabilities,
        'Respawn fallback anchor',
      );
    } else if (policy.anchorPolicy.kind === MODE_RESPAWN_ANCHOR_POLICY_KIND.FIXED_ANCHOR) {
      assertMapCapability(
        policy.anchorPolicy.anchorCapabilityId,
        bundle.mode,
        knownMapCapabilities,
        'Respawn fixed anchor',
      );
    }
  }
  for (const entry of bundle.survivalPressure?.slotEntries ?? []) {
    assertMapCapability(
      entry.anchorCapabilityId,
      bundle.mode,
      knownMapCapabilities,
      'Survival pressure anchor',
    );
  }
}

function validateSurvivalClosure(
  bundle: Omit<ResolvedModePolicyBundle, 'contentVersion'>,
  knownSupplyDefinitions: ReadonlySet<string>,
  knownEquipmentDefinitions: ReadonlySet<string>,
): void {
  const mode = bundle.mode;
  if (mode.equipmentSupplyDefinitionId !== null) {
    assertRegistered(
      mode.equipmentSupplyDefinitionId,
      knownSupplyDefinitions,
      `ModeDefinition ${mode.id} equipment supply`,
    );
  }
  if (mode.kind !== MODE_KIND.SURVIVAL) {
    if (bundle.survivalPressure !== null || bundle.survivalEquipmentTier !== null) {
      throw new RangeError('非 Survival Mode 不得解析 Survival Policy。');
    }
    return;
  }
  if (
    !bundle.survivalPressure
    || !bundle.survivalEquipmentTier
    || mode.equipmentSupplyDefinitionId === null
  ) {
    throw new RangeError('Survival Mode Policy 闭包不完整。');
  }
  if (bundle.survivalEquipmentTier.supplyDefinitionId !== mode.equipmentSupplyDefinitionId) {
    throw new RangeError('Survival tier supply 与 Mode equipment supply 不一致。');
  }
  const enemyRole = bundle.participant.roles.find((role) => role.modeRole === MODE_ROLE.ENEMY);
  if (!enemyRole || enemyRole.slotRule.kind !== MODE_SLOT_RULE_KIND.FIXED) {
    throw new RangeError('Survival participant enemy slot 闭包缺失。');
  }
  assertSameValues(
    [...bundle.survivalPressure.slotActivationOrder].sort(compareText),
    [...enemyRole.slotRule.slotIds].sort(compareText),
    'Survival pressure/participant slots',
  );
  for (const tier of bundle.survivalEquipmentTier.tiers) {
    for (const variant of tier.variants) {
      assertRegistered(
        variant.collectionEquipmentDefinitionId,
        knownEquipmentDefinitions,
        'Survival tier collection equipment',
      );
      assertRegistered(
        variant.runtimeEquipmentDefinitionId,
        knownEquipmentDefinitions,
        'Survival tier runtime equipment',
      );
    }
  }
}

function createBundle(
  mode: ModeDefinition,
  policies: ModePolicyRegistry,
  knownMapCapabilities: ReadonlySet<string>,
  knownSupplyDefinitions: ReadonlySet<string>,
  knownEquipmentDefinitions: ReadonlySet<string>,
): ResolvedModePolicyBundle {
  const participant = requirePolicy<ParticipantPolicyDefinition>(
    policies,
    mode.participantPolicyDefinitionId,
    MODE_POLICY_TYPE.PARTICIPANT,
    'ModeDefinition.participantPolicyDefinitionId',
  );
  const timeline = requirePolicy<TimelinePolicyDefinition>(
    policies,
    mode.timelinePolicyDefinitionId,
    MODE_POLICY_TYPE.TIMELINE,
    'ModeDefinition.timelinePolicyDefinitionId',
  );
  const objective = requirePolicy<ObjectivePolicyDefinition>(
    policies,
    mode.objectivePolicyDefinitionId,
    MODE_POLICY_TYPE.OBJECTIVE,
    'ModeDefinition.objectivePolicyDefinitionId',
  );
  const elimination = requirePolicy<EliminationPolicyDefinition>(
    policies,
    mode.eliminationPolicyDefinitionId,
    MODE_POLICY_TYPE.ELIMINATION,
    'ModeDefinition.eliminationPolicyDefinitionId',
  );
  const respawn = requirePolicy<RespawnPolicyDefinition>(
    policies,
    mode.respawnPolicyDefinitionId,
    MODE_POLICY_TYPE.RESPAWN,
    'ModeDefinition.respawnPolicyDefinitionId',
  );
  const relationship = requirePolicy<RelationshipPolicyDefinition>(
    policies,
    mode.relationshipPolicyDefinitionId,
    MODE_POLICY_TYPE.RELATIONSHIP,
    'ModeDefinition.relationshipPolicyDefinitionId',
  );
  const result = requirePolicy<ResultPolicyDefinition>(
    policies,
    mode.resultPolicyDefinitionId,
    MODE_POLICY_TYPE.RESULT,
    'ModeDefinition.resultPolicyDefinitionId',
  );
  const survivalPressure = mode.survivalPressurePolicyDefinitionId === null
    ? null
    : requirePolicy<SurvivalPressurePolicyDefinition>(
      policies,
      mode.survivalPressurePolicyDefinitionId,
      MODE_POLICY_TYPE.SURVIVAL_PRESSURE,
      'ModeDefinition.survivalPressurePolicyDefinitionId',
    );
  const survivalEquipmentTier = mode.survivalEquipmentTierPolicyDefinitionId === null
    ? null
    : requirePolicy<SurvivalEquipmentTierPolicyDefinition>(
      policies,
      mode.survivalEquipmentTierPolicyDefinitionId,
      MODE_POLICY_TYPE.SURVIVAL_EQUIPMENT_TIER,
      'ModeDefinition.survivalEquipmentTierPolicyDefinitionId',
    );
  const incomplete = Object.freeze({
    mode,
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
  validatePolicyModeKind(incomplete);
  validateRoleClosure(incomplete);
  validateMapClosure(incomplete, knownMapCapabilities);
  validateSurvivalClosure(incomplete, knownSupplyDefinitions, knownEquipmentDefinitions);
  return Object.freeze({
    ...incomplete,
    contentVersion: validatePolicyContentVersion(incomplete),
  });
}

export class ModeRegistry implements ModeRegistryContract {
  readonly #definitionsById: Map<string, ModeDefinition>;
  readonly #definitions: readonly ModeDefinition[];
  readonly #bundlesById: Map<string, ResolvedModePolicyBundle>;
  readonly contentHash: string;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'ModeRegistry source');
    exactRecord(source, REGISTRY_SOURCE_KEYS, 'ModeRegistry source');
    if (!Array.isArray(source.modeDefinitions)) {
      throw new TypeError('ModeRegistry source.modeDefinitions 必须是数组。');
    }
    const definitions = source.modeDefinitions.map(createModeDefinition).sort(compareById);
    const policies = new ModePolicyRegistry(source.policyDefinitions);
    const mapCapabilityIds = cloneFrozenStringSet(
      source.mapCapabilityIds as readonly unknown[],
      'ModeRegistry source.mapCapabilityIds',
    );
    const equipmentSupplyDefinitionIds = cloneFrozenStringSet(
      source.equipmentSupplyDefinitionIds as readonly unknown[],
      'ModeRegistry source.equipmentSupplyDefinitionIds',
    );
    const equipmentDefinitionIds = cloneFrozenStringSet(
      source.equipmentDefinitionIds as readonly unknown[],
      'ModeRegistry source.equipmentDefinitionIds',
    );
    const knownMapCapabilities = new Set(mapCapabilityIds);
    const knownSupplyDefinitions = new Set(equipmentSupplyDefinitionIds);
    const knownEquipmentDefinitions = new Set(equipmentDefinitionIds);

    this.#definitionsById = new Map();
    this.#bundlesById = new Map();
    for (const definition of definitions) {
      if (this.#definitionsById.has(definition.id)) {
        throw new RangeError(`ModeRegistry 包含重复 id ${definition.id}。`);
      }
      this.#definitionsById.set(definition.id, definition);
      this.#bundlesById.set(definition.id, createBundle(
        definition,
        policies,
        knownMapCapabilities,
        knownSupplyDefinitions,
        knownEquipmentDefinitions,
      ));
    }
    const referencedPolicies = referencedPolicyIds(definitions);
    for (const policy of policies.list()) {
      if (!referencedPolicies.has(policy.id)) {
        throw new RangeError(`ModeRegistry 包含未被任何Mode引用的Policy ${policy.id}。`);
      }
    }
    this.#definitions = Object.freeze(definitions);
    this.contentHash = createDeterministicDataHash(Object.freeze({
      modeDefinitions: this.#definitions,
      policyDefinitions: policies.list(),
      mapCapabilityIds,
      equipmentSupplyDefinitionIds,
      equipmentDefinitionIds,
    }), 'ModeRegistry content');
    Object.freeze(this);
  }

  get size(): number { return this.#definitions.length; }
  has(id: string): boolean { return this.#definitionsById.has(id); }
  get(id: string): ModeDefinition | undefined { return this.#definitionsById.get(id); }

  require(id: string): ModeDefinition {
    const normalizedId = assertNonEmptyString(id, 'ModeRegistry id');
    const definition = this.get(normalizedId);
    if (!definition) throw new RangeError('未知 ModeDefinition。');
    return definition;
  }

  list(): readonly ModeDefinition[] { return this.#definitions; }

  resolve(id: string): ResolvedModePolicyBundle {
    const normalizedId = assertNonEmptyString(id, 'ModeRegistry id');
    const bundle = this.#bundlesById.get(normalizedId);
    if (!bundle) throw new RangeError('未知 ModeDefinition。');
    return bundle;
  }
}
