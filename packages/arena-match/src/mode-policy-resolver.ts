import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_CONTROLLER_KIND_V2,
  ARENA_MATCH_PARTICIPANT_ROLE_V2,
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
  type ArenaMatchControllerKindV2,
  type ArenaMatchModeKindV6,
  type ArenaMatchParticipantAssignmentV2,
  type ArenaMatchParticipantRoleV2,
} from './match-config-v6.js';

export const MATCH_MODE_POLICY_RESOLVER_SCHEMA_VERSION = 1 as const;

export const MATCH_MODE_FALL_DISPOSITION = Object.freeze({
  ELIMINATE: 'eliminate',
  COUNT_FOR_OBJECTIVE: 'count-for-objective',
  SCHEDULE_RESPAWN: 'schedule-respawn',
  DEACTIVATE_SLOT: 'deactivate-slot',
} as const);

export const MATCH_MODE_RELATIONSHIP = Object.freeze({
  HOSTILE: 'hostile',
  ALLY: 'ally',
  NEUTRAL: 'neutral',
} as const);

export type MatchModeFallDisposition =
  typeof MATCH_MODE_FALL_DISPOSITION[keyof typeof MATCH_MODE_FALL_DISPOSITION];
export type MatchModeRelationship =
  typeof MATCH_MODE_RELATIONSHIP[keyof typeof MATCH_MODE_RELATIONSHIP];

export interface MatchModeRoleConstraintV1 {
  readonly modeRole: ArenaMatchParticipantRoleV2;
  readonly minimumCount: number;
  readonly maximumCount: number;
  readonly allowedControllerKinds: readonly ArenaMatchControllerKindV2[];
  readonly teamId: string | null;
  readonly slotIds: readonly string[];
}

export interface MatchModeControllerBoundV1 {
  readonly controllerKind: ArenaMatchControllerKindV2;
  readonly minimumCount: number;
  readonly maximumCount: number;
}

export interface MatchModeParticipantPolicyViewV1 {
  readonly definitionId: string;
  readonly minimumParticipants: number;
  readonly maximumParticipants: number;
  readonly roles: readonly MatchModeRoleConstraintV1[];
  readonly controllerKindBounds: readonly MatchModeControllerBoundV1[];
}

export interface MatchModeEliminationPolicyViewV1 {
  readonly definitionId: string;
  readonly roleDispositions: readonly Readonly<{
    readonly modeRole: ArenaMatchParticipantRoleV2;
    readonly fallDisposition: MatchModeFallDisposition;
  }>[];
}

export interface MatchModeRespawnPolicyViewV1 {
  readonly definitionId: string;
  readonly rolePolicies: readonly Readonly<{
    readonly modeRole: ArenaMatchParticipantRoleV2;
    readonly enabled: boolean;
    readonly delayTicks: number;
    readonly maximumRespawns: number | null;
    readonly anchorPolicy: Readonly<{
      readonly kind: 'disabled' | 'latest-valid-safe-anchor' | 'fixed-anchor';
      readonly anchorCapabilityId: string | null;
    }>;
    readonly protectionTicks: number;
  }>[];
}

export interface MatchModeRelationshipPolicyViewV1 {
  readonly definitionId: string;
  readonly selfTargeting: 'forbidden';
  readonly relations: readonly Readonly<{
    readonly sourceRole: ArenaMatchParticipantRoleV2;
    readonly targetRole: ArenaMatchParticipantRoleV2;
    readonly relationship: MatchModeRelationship;
  }>[];
}

export interface MatchModePolicyResolverDefinitionBundleV1 {
  readonly schemaVersion: typeof MATCH_MODE_POLICY_RESOLVER_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly modeKind: ArenaMatchModeKindV6;
  readonly contentHash: string;
  readonly participant: MatchModeParticipantPolicyViewV1;
  readonly elimination: MatchModeEliminationPolicyViewV1;
  readonly respawn: MatchModeRespawnPolicyViewV1;
  readonly relationship: MatchModeRelationshipPolicyViewV1;
}

export interface MatchModeParticipantFallCommandV1 {
  readonly kind: 'participant-fall';
  readonly tick: number;
  readonly participantId: string;
  readonly modeRole: ArenaMatchParticipantRoleV2;
  readonly fallDisposition: MatchModeFallDisposition;
  readonly slotId: string | null;
  readonly slotGeneration: number;
  readonly respawn: Readonly<{
    readonly delayTicks: number;
    readonly maximumRespawns: number | null;
    readonly anchorPolicy: Readonly<{
      readonly kind: 'latest-valid-safe-anchor' | 'fixed-anchor';
      readonly anchorCapabilityId: string;
    }>;
    readonly protectionTicks: number;
  }> | null;
}

const BUNDLE_KEYS = new Set([
  'schemaVersion',
  'modeDefinitionId',
  'modeKind',
  'contentHash',
  'participant',
  'elimination',
  'respawn',
  'relationship',
]);
const PARTICIPANT_KEYS = new Set([
  'definitionId',
  'minimumParticipants',
  'maximumParticipants',
  'roles',
  'controllerKindBounds',
]);
const ROLE_KEYS = new Set([
  'modeRole',
  'minimumCount',
  'maximumCount',
  'allowedControllerKinds',
  'teamId',
  'slotIds',
]);
const CONTROLLER_BOUND_KEYS = new Set([
  'controllerKind',
  'minimumCount',
  'maximumCount',
]);
const ELIMINATION_KEYS = new Set(['definitionId', 'roleDispositions']);
const DISPOSITION_KEYS = new Set(['modeRole', 'fallDisposition']);
const RESPAWN_KEYS = new Set(['definitionId', 'rolePolicies']);
const RESPAWN_ROLE_KEYS = new Set([
  'modeRole',
  'enabled',
  'delayTicks',
  'maximumRespawns',
  'anchorPolicy',
  'protectionTicks',
]);
const ANCHOR_KEYS = new Set(['kind', 'anchorCapabilityId']);
const RELATIONSHIP_KEYS = new Set(['definitionId', 'selfTargeting', 'relations']);
const RELATION_KEYS = new Set(['sourceRole', 'targetRole', 'relationship']);
const ROLES: ReadonlySet<unknown> = new Set(Object.values(ARENA_MATCH_PARTICIPANT_ROLE_V2));
const CONTROLLERS: ReadonlySet<unknown> = new Set(Object.values(ARENA_MATCH_CONTROLLER_KIND_V2));
const DISPOSITIONS: ReadonlySet<unknown> = new Set(Object.values(MATCH_MODE_FALL_DISPOSITION));
const RELATIONSHIPS: ReadonlySet<unknown> = new Set(Object.values(MATCH_MODE_RELATIONSHIP));

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

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

function role(value: unknown, name: string): ArenaMatchParticipantRoleV2 {
  if (!ROLES.has(value)) throw new RangeError(`${name} 不受支持。`);
  return value as ArenaMatchParticipantRoleV2;
}

function controller(value: unknown, name: string): ArenaMatchControllerKindV2 {
  if (!CONTROLLERS.has(value)) throw new RangeError(`${name} 不受支持。`);
  return value as ArenaMatchControllerKindV2;
}

function stringArray(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const normalized = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(normalized).size !== normalized.length) throw new RangeError(`${name} 不能重复。`);
  return Object.freeze(normalized.sort(compareText));
}

function dataHash(value: unknown, name: string): string {
  const hash = assertNonEmptyString(value, name);
  if (!/^[0-9a-f]+$/u.test(hash)) throw new RangeError(`${name} 必须是小写十六进制数据 hash。`);
  return hash;
}

function cloneRoleConstraint(value: unknown, index: number): MatchModeRoleConstraintV1 {
  const name = `ModePolicyResolver participant.roles[${index}]`;
  exactRecord(value, ROLE_KEYS, name);
  const minimumCount = assertIntegerAtLeast(value.minimumCount, 0, `${name}.minimumCount`);
  const maximumCount = assertIntegerAtLeast(value.maximumCount, 0, `${name}.maximumCount`);
  if (minimumCount > maximumCount) throw new RangeError(`${name} 数量上下限颠倒。`);
  const allowedControllerKinds = stringArray(
    value.allowedControllerKinds,
    `${name}.allowedControllerKinds`,
  ).map((entry) => controller(entry, `${name}.allowedControllerKinds`));
  if (allowedControllerKinds.length === 0) {
    throw new RangeError(`${name}.allowedControllerKinds 不能为空。`);
  }
  return Object.freeze({
    modeRole: role(value.modeRole, `${name}.modeRole`),
    minimumCount,
    maximumCount,
    allowedControllerKinds: Object.freeze(allowedControllerKinds),
    teamId: value.teamId === null
      ? null
      : assertNonEmptyString(value.teamId, `${name}.teamId`),
    slotIds: stringArray(value.slotIds, `${name}.slotIds`),
  });
}

function cloneParticipantPolicy(value: unknown): MatchModeParticipantPolicyViewV1 {
  const name = 'ModePolicyResolver participant';
  exactRecord(value, PARTICIPANT_KEYS, name);
  const minimumParticipants = assertIntegerAtLeast(
    value.minimumParticipants,
    2,
    `${name}.minimumParticipants`,
  );
  const maximumParticipants = assertIntegerAtLeast(
    value.maximumParticipants,
    minimumParticipants,
    `${name}.maximumParticipants`,
  );
  if (maximumParticipants > 17) throw new RangeError(`${name}.maximumParticipants 不能超过 17。`);
  if (!Array.isArray(value.roles) || value.roles.length === 0) {
    throw new RangeError(`${name}.roles 必须是非空数组。`);
  }
  const roles = value.roles.map(cloneRoleConstraint).sort(
    (left, right) => compareText(left.modeRole, right.modeRole),
  );
  if (new Set(roles.map(({ modeRole }) => modeRole)).size !== roles.length) {
    throw new RangeError(`${name}.roles 不能重复。`);
  }
  if (!Array.isArray(value.controllerKindBounds) || value.controllerKindBounds.length === 0) {
    throw new RangeError(`${name}.controllerKindBounds 必须是非空数组。`);
  }
  const controllerKindBounds = value.controllerKindBounds.map((entry, index) => {
    const entryName = `${name}.controllerKindBounds[${index}]`;
    exactRecord(entry, CONTROLLER_BOUND_KEYS, entryName);
    const minimumCount = assertIntegerAtLeast(entry.minimumCount, 0, `${entryName}.minimumCount`);
    const maximumCount = assertIntegerAtLeast(entry.maximumCount, 0, `${entryName}.maximumCount`);
    if (minimumCount > maximumCount) throw new RangeError(`${entryName} 数量上下限颠倒。`);
    return Object.freeze({
      controllerKind: controller(entry.controllerKind, `${entryName}.controllerKind`),
      minimumCount,
      maximumCount,
    });
  }).sort((left, right) => compareText(left.controllerKind, right.controllerKind));
  if (
    new Set(controllerKindBounds.map(({ controllerKind }) => controllerKind)).size
    !== controllerKindBounds.length
  ) throw new RangeError(`${name}.controllerKindBounds 不能重复。`);
  return Object.freeze({
    definitionId: assertNonEmptyString(value.definitionId, `${name}.definitionId`),
    minimumParticipants,
    maximumParticipants,
    roles: Object.freeze(roles),
    controllerKindBounds: Object.freeze(controllerKindBounds),
  });
}

function cloneEliminationPolicy(value: unknown): MatchModeEliminationPolicyViewV1 {
  const name = 'ModePolicyResolver elimination';
  exactRecord(value, ELIMINATION_KEYS, name);
  if (!Array.isArray(value.roleDispositions) || value.roleDispositions.length === 0) {
    throw new RangeError(`${name}.roleDispositions 必须是非空数组。`);
  }
  const roleDispositions = value.roleDispositions.map((entry, index) => {
    const entryName = `${name}.roleDispositions[${index}]`;
    exactRecord(entry, DISPOSITION_KEYS, entryName);
    if (!DISPOSITIONS.has(entry.fallDisposition)) {
      throw new RangeError(`${entryName}.fallDisposition 不受支持。`);
    }
    return Object.freeze({
      modeRole: role(entry.modeRole, `${entryName}.modeRole`),
      fallDisposition: entry.fallDisposition as MatchModeFallDisposition,
    });
  }).sort((left, right) => compareText(left.modeRole, right.modeRole));
  if (new Set(roleDispositions.map(({ modeRole }) => modeRole)).size !== roleDispositions.length) {
    throw new RangeError(`${name}.roleDispositions 不能重复。`);
  }
  return Object.freeze({
    definitionId: assertNonEmptyString(value.definitionId, `${name}.definitionId`),
    roleDispositions: Object.freeze(roleDispositions),
  });
}

function cloneRespawnPolicy(value: unknown): MatchModeRespawnPolicyViewV1 {
  const name = 'ModePolicyResolver respawn';
  exactRecord(value, RESPAWN_KEYS, name);
  if (!Array.isArray(value.rolePolicies) || value.rolePolicies.length === 0) {
    throw new RangeError(`${name}.rolePolicies 必须是非空数组。`);
  }
  const rolePolicies = value.rolePolicies.map((entry, index) => {
    const entryName = `${name}.rolePolicies[${index}]`;
    exactRecord(entry, RESPAWN_ROLE_KEYS, entryName);
    if (typeof entry.enabled !== 'boolean') throw new TypeError(`${entryName}.enabled 必须是布尔值。`);
    exactRecord(entry.anchorPolicy, ANCHOR_KEYS, `${entryName}.anchorPolicy`);
    if (
      entry.anchorPolicy.kind !== 'disabled'
      && entry.anchorPolicy.kind !== 'latest-valid-safe-anchor'
      && entry.anchorPolicy.kind !== 'fixed-anchor'
    ) throw new RangeError(`${entryName}.anchorPolicy.kind 不受支持。`);
    const anchorCapabilityId = entry.anchorPolicy.anchorCapabilityId === null
      ? null
      : assertNonEmptyString(
        entry.anchorPolicy.anchorCapabilityId,
        `${entryName}.anchorPolicy.anchorCapabilityId`,
      );
    if ((entry.anchorPolicy.kind === 'disabled') !== (anchorCapabilityId === null)) {
      throw new RangeError(`${entryName}.anchorPolicy identity 不一致。`);
    }
    const maximumRespawns = entry.maximumRespawns === null
      ? null
      : assertIntegerAtLeast(entry.maximumRespawns, 0, `${entryName}.maximumRespawns`);
    const delayTicks = assertIntegerAtLeast(entry.delayTicks, 0, `${entryName}.delayTicks`);
    const protectionTicks = assertIntegerAtLeast(
      entry.protectionTicks,
      0,
      `${entryName}.protectionTicks`,
    );
    if (!entry.enabled && (delayTicks !== 0 || protectionTicks !== 0 || maximumRespawns !== 0)) {
      throw new RangeError(`${entryName} disabled respawn 必须使用零值并禁止重生。`);
    }
    if (entry.enabled && entry.anchorPolicy.kind === 'disabled') {
      throw new RangeError(`${entryName} enabled respawn 必须使用显式权威锚点。`);
    }
    return Object.freeze({
      modeRole: role(entry.modeRole, `${entryName}.modeRole`),
      enabled: entry.enabled,
      delayTicks,
      maximumRespawns,
      anchorPolicy: Object.freeze({
        kind: entry.anchorPolicy.kind,
        anchorCapabilityId,
      }),
      protectionTicks,
    });
  }).sort((left, right) => compareText(left.modeRole, right.modeRole));
  if (new Set(rolePolicies.map(({ modeRole }) => modeRole)).size !== rolePolicies.length) {
    throw new RangeError(`${name}.rolePolicies 不能重复。`);
  }
  return Object.freeze({
    definitionId: assertNonEmptyString(value.definitionId, `${name}.definitionId`),
    rolePolicies: Object.freeze(rolePolicies),
  });
}

function cloneRelationshipPolicy(value: unknown): MatchModeRelationshipPolicyViewV1 {
  const name = 'ModePolicyResolver relationship';
  exactRecord(value, RELATIONSHIP_KEYS, name);
  if (value.selfTargeting !== 'forbidden') {
    throw new RangeError(`${name}.selfTargeting 必须是 forbidden。`);
  }
  if (!Array.isArray(value.relations) || value.relations.length === 0) {
    throw new RangeError(`${name}.relations 必须是非空数组。`);
  }
  const relations = value.relations.map((entry, index) => {
    const entryName = `${name}.relations[${index}]`;
    exactRecord(entry, RELATION_KEYS, entryName);
    if (!RELATIONSHIPS.has(entry.relationship)) {
      throw new RangeError(`${entryName}.relationship 不受支持。`);
    }
    return Object.freeze({
      sourceRole: role(entry.sourceRole, `${entryName}.sourceRole`),
      targetRole: role(entry.targetRole, `${entryName}.targetRole`),
      relationship: entry.relationship as MatchModeRelationship,
    });
  }).sort((left, right) => (
    compareText(left.sourceRole, right.sourceRole)
    || compareText(left.targetRole, right.targetRole)
  ));
  const relationKeys = relations.map(({ sourceRole, targetRole }) => `${sourceRole}\0${targetRole}`);
  if (new Set(relationKeys).size !== relationKeys.length) {
    throw new RangeError(`${name}.relations 不能重复。`);
  }
  return Object.freeze({
    definitionId: assertNonEmptyString(value.definitionId, `${name}.definitionId`),
    selfTargeting: 'forbidden',
    relations: Object.freeze(relations),
  });
}

function cloneBundle(value: unknown): MatchModePolicyResolverDefinitionBundleV1 {
  const source = cloneFrozenData(value, 'ModePolicyResolver definition bundle');
  exactRecord(source, BUNDLE_KEYS, 'ModePolicyResolver definition bundle');
  if (source.schemaVersion !== MATCH_MODE_POLICY_RESOLVER_SCHEMA_VERSION) {
    throw new RangeError(
      `ModePolicyResolver schemaVersion 必须是 ${MATCH_MODE_POLICY_RESOLVER_SCHEMA_VERSION}。`,
    );
  }
  if (source.modeKind !== 'duel' && source.modeKind !== 'race' && source.modeKind !== 'survival') {
    throw new RangeError('ModePolicyResolver modeKind 不受支持。');
  }
  return Object.freeze({
    schemaVersion: MATCH_MODE_POLICY_RESOLVER_SCHEMA_VERSION,
    modeDefinitionId: assertNonEmptyString(
      source.modeDefinitionId,
      'ModePolicyResolver modeDefinitionId',
    ),
    modeKind: source.modeKind,
    contentHash: dataHash(source.contentHash, 'ModePolicyResolver contentHash'),
    participant: cloneParticipantPolicy(source.participant),
    elimination: cloneEliminationPolicy(source.elimination),
    respawn: cloneRespawnPolicy(source.respawn),
    relationship: cloneRelationshipPolicy(source.relationship),
  });
}

function requireAssignment(
  assignmentsById: ReadonlyMap<string, ArenaMatchParticipantAssignmentV2>,
  participantId: unknown,
  name: string,
): ArenaMatchParticipantAssignmentV2 {
  const id = assertNonEmptyString(participantId, name);
  const assignment = assignmentsById.get(id);
  if (!assignment) throw new RangeError(`未知 participant ${id}。`);
  return assignment;
}

export class ModePolicyResolver {
  readonly #config: ArenaMatchConfigV6;
  readonly #bundle: MatchModePolicyResolverDefinitionBundleV1;
  readonly #assignmentsById: ReadonlyMap<string, ArenaMatchParticipantAssignmentV2>;
  readonly #fallDispositionByRole: ReadonlyMap<ArenaMatchParticipantRoleV2, MatchModeFallDisposition>;
  readonly #respawnByRole: ReadonlyMap<
    ArenaMatchParticipantRoleV2,
    MatchModeRespawnPolicyViewV1['rolePolicies'][number]
  >;
  readonly #relationshipByRoles: ReadonlyMap<string, MatchModeRelationship>;

  constructor(config: unknown, definitionBundle: unknown) {
    this.#config = createArenaMatchConfigV6(config);
    this.#bundle = cloneBundle(definitionBundle);
    if (
      this.#bundle.modeDefinitionId !== this.#config.modeDefinitionId
      || this.#bundle.modeKind !== this.#config.modeKind
      || this.#bundle.contentHash !== this.#config.modePolicyContentHash
    ) throw new RangeError('ModePolicyResolver 的 Mode/Policy identity 与 MatchConfig V6 不一致。');
    const assignments = this.#config.participantAssignments;
    if (
      assignments.length < this.#bundle.participant.minimumParticipants
      || assignments.length > this.#bundle.participant.maximumParticipants
    ) throw new RangeError('ModePolicyResolver participant 数量不符合 Participant Policy。');

    const rolesById = new Map(this.#bundle.participant.roles.map((entry) => [entry.modeRole, entry]));
    for (const assignment of assignments) {
      const constraint = rolesById.get(assignment.modeRole);
      if (!constraint) throw new RangeError(`Participant Policy 缺少 role ${assignment.modeRole}。`);
      if (!constraint.allowedControllerKinds.includes(assignment.controllerKind)) {
        throw new RangeError(`participant ${assignment.participantId} controller 不符合 role policy。`);
      }
      if (constraint.teamId !== assignment.teamId) {
        throw new RangeError(`participant ${assignment.participantId} team 不符合 role policy。`);
      }
      if (
        constraint.slotIds.length === 0
          ? assignment.slotId !== null
          : assignment.slotId === null || !constraint.slotIds.includes(assignment.slotId)
      ) throw new RangeError(`participant ${assignment.participantId} slot 不符合 role policy。`);
    }
    for (const constraint of this.#bundle.participant.roles) {
      const count = assignments.filter(({ modeRole }) => modeRole === constraint.modeRole).length;
      if (count < constraint.minimumCount || count > constraint.maximumCount) {
        throw new RangeError(`role ${constraint.modeRole} 数量不符合 Participant Policy。`);
      }
    }
    for (const bound of this.#bundle.participant.controllerKindBounds) {
      const count = assignments.filter(
        ({ controllerKind }) => controllerKind === bound.controllerKind,
      ).length;
      if (count < bound.minimumCount || count > bound.maximumCount) {
        throw new RangeError(`controller ${bound.controllerKind} 数量不符合 Participant Policy。`);
      }
    }
    for (const controllerKind of new Set(assignments.map((entry) => entry.controllerKind))) {
      if (!this.#bundle.participant.controllerKindBounds.some((entry) => (
        entry.controllerKind === controllerKind
      ))) throw new RangeError(`Participant Policy 缺少 controller ${controllerKind} bound。`);
    }

    const roles = this.#bundle.participant.roles.map(({ modeRole }) => modeRole);
    const dispositionByRole = new Map(
      this.#bundle.elimination.roleDispositions.map((entry) => [entry.modeRole, entry.fallDisposition]),
    );
    const respawnByRole = new Map(
      this.#bundle.respawn.rolePolicies.map((entry) => [entry.modeRole, entry]),
    );
    for (const modeRole of roles) {
      if (!dispositionByRole.has(modeRole) || !respawnByRole.has(modeRole)) {
        throw new RangeError(`ModePolicyResolver 缺少 role ${modeRole} 的淘汰或重生 Policy。`);
      }
      for (const targetRole of roles) {
        if (!this.#bundle.relationship.relations.some((entry) => (
          entry.sourceRole === modeRole && entry.targetRole === targetRole
        ))) throw new RangeError(`Relationship Policy 未闭合 ${modeRole}→${targetRole}。`);
      }
    }
    this.#assignmentsById = new Map(assignments.map((entry) => [entry.participantId, entry]));
    this.#fallDispositionByRole = dispositionByRole;
    this.#respawnByRole = respawnByRole;
    this.#relationshipByRoles = new Map(this.#bundle.relationship.relations.map((entry) => [
      `${entry.sourceRole}\0${entry.targetRole}`,
      entry.relationship,
    ]));
  }

  get definitionBundle(): MatchModePolicyResolverDefinitionBundleV1 {
    return this.#bundle;
  }

  relationshipBetween(sourceParticipantId: unknown, targetParticipantId: unknown): MatchModeRelationship {
    const source = requireAssignment(
      this.#assignmentsById,
      sourceParticipantId,
      'sourceParticipantId',
    );
    const target = requireAssignment(
      this.#assignmentsById,
      targetParticipantId,
      'targetParticipantId',
    );
    if (source.participantId === target.participantId) {
      throw new RangeError('Relationship Policy 禁止 self targeting。');
    }
    const relationship = this.#relationshipByRoles.get(`${source.modeRole}\0${target.modeRole}`);
    if (!relationship) throw new Error('Relationship Policy 闭包漂移。');
    if (source.teamId !== null && source.teamId === target.teamId && relationship === 'hostile') {
      throw new RangeError('相同 team participant 不能解析为 hostile。');
    }
    return relationship;
  }

  resolveParticipantFall(participantId: unknown, tick: unknown): MatchModeParticipantFallCommandV1 {
    const assignment = requireAssignment(this.#assignmentsById, participantId, 'participantId');
    const normalizedTick = assertIntegerAtLeast(tick, 0, 'participant fall tick');
    const fallDisposition = this.#fallDispositionByRole.get(assignment.modeRole);
    const respawnPolicy = this.#respawnByRole.get(assignment.modeRole);
    if (!fallDisposition || !respawnPolicy) throw new Error('Mode Policy role 闭包漂移。');
    const respawn = respawnPolicy.enabled
      ? Object.freeze({
        delayTicks: respawnPolicy.delayTicks,
        maximumRespawns: respawnPolicy.maximumRespawns,
        anchorPolicy: Object.freeze({
          kind: respawnPolicy.anchorPolicy.kind as 'latest-valid-safe-anchor' | 'fixed-anchor',
          anchorCapabilityId: respawnPolicy.anchorPolicy.anchorCapabilityId as string,
        }),
        protectionTicks: respawnPolicy.protectionTicks,
      })
      : null;
    return Object.freeze({
      kind: 'participant-fall',
      tick: normalizedTick,
      participantId: assignment.participantId,
      modeRole: assignment.modeRole,
      fallDisposition,
      slotId: assignment.slotId,
      slotGeneration: assignment.slotGeneration,
      respawn,
    });
  }
}
