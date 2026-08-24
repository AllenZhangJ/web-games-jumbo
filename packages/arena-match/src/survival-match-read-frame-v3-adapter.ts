import {
  MATCH_READ_FRAME_V3_SCHEMA_VERSION,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createMatchReadFrameV2Audit,
  createMatchReadFrameV3Audit,
  type ArenaModeProjectionV1,
  type ArenaPublicSupplyProjectionV3,
  type ArenaPublicWorldSupplyIdentityV3,
  type DeepReadonly,
  type MatchReadFrameV2,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  createSurvivalEquipmentTierPolicyDefinition,
  type SurvivalEquipmentTierPolicyDefinition,
} from '@number-strategy-jump/arena-definitions';

export const SURVIVAL_MATCH_READ_FRAME_V3_ADAPTER_SCHEMA_VERSION = 1 as const;

export interface SurvivalMatchReadFrameV3AdapterOptions {
  readonly modeDefinitionId: string;
  readonly tierPolicyDefinition: SurvivalEquipmentTierPolicyDefinition;
  readonly v2Frame: MatchReadFrameV2;
  readonly activeSupplyProjection: ArenaPublicSupplyProjectionV3;
  readonly expectedWorldSupplyIdentities: readonly ArenaPublicWorldSupplyIdentityV3[];
  readonly modeProjection: ArenaModeProjectionV1;
  readonly modeResult: ModeResultV3Payload | null;
}

export interface SurvivalMatchReadFrameV3AdapterResult {
  readonly schemaVersion: typeof SURVIVAL_MATCH_READ_FRAME_V3_ADAPTER_SCHEMA_VERSION;
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
  readonly readFrameAudit: DeepReadonly<MatchReadFrameV3AuditOptions>;
}

const OPTION_KEYS = new Set([
  'modeDefinitionId',
  'tierPolicyDefinition',
  'v2Frame',
  'activeSupplyProjection',
  'expectedWorldSupplyIdentities',
  'modeProjection',
  'modeResult',
]);

function identityResolver(policy: SurvivalEquipmentTierPolicyDefinition): ReadonlyMap<
string,
Readonly<{ collectionEquipmentDefinitionId: string; survivalLevel: number }>
> {
  const result = new Map<
  string,
  Readonly<{ collectionEquipmentDefinitionId: string; survivalLevel: number }>
  >();
  for (const tier of policy.tiers) {
    for (const variant of tier.variants) {
      if (result.has(variant.runtimeEquipmentDefinitionId)) {
        throw new RangeError(
          `Survival V3 adapter runtime ${variant.runtimeEquipmentDefinitionId} 重复。`,
        );
      }
      result.set(variant.runtimeEquipmentDefinitionId, Object.freeze({
        collectionEquipmentDefinitionId: variant.collectionEquipmentDefinitionId,
        survivalLevel: tier.survivalLevel,
      }));
    }
  }
  return result;
}

function requireRuntimeIdentity(
  resolver: ReadonlyMap<
  string,
  Readonly<{ collectionEquipmentDefinitionId: string; survivalLevel: number }>
  >,
  runtimeEquipmentDefinitionId: string,
): Readonly<{ collectionEquipmentDefinitionId: string; survivalLevel: number }> {
  const identity = resolver.get(runtimeEquipmentDefinitionId);
  if (!identity) {
    throw new RangeError(
      `Survival V3 adapter runtime ${runtimeEquipmentDefinitionId} 不属于 tier policy。`,
    );
  }
  return identity;
}

export function composeSurvivalMatchReadFrameV3(
  value: SurvivalMatchReadFrameV3AdapterOptions,
): SurvivalMatchReadFrameV3AdapterResult;
export function composeSurvivalMatchReadFrameV3(value: unknown): SurvivalMatchReadFrameV3AdapterResult {
  const source = cloneFrozenData(value, 'Survival MatchReadFrame V3 adapter options');
  assertKnownKeys(source, OPTION_KEYS, 'Survival MatchReadFrame V3 adapter options');
  for (const key of OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Survival MatchReadFrame V3 adapter 缺少 ${key}。`);
    }
  }
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'Survival MatchReadFrame V3 adapter.modeDefinitionId',
  );
  const policy = createSurvivalEquipmentTierPolicyDefinition(source.tierPolicyDefinition);
  const v2Frame = createMatchReadFrameV2Audit(source.v2Frame);
  if (!Array.isArray(source.expectedWorldSupplyIdentities)) {
    throw new TypeError('Survival V3 adapter expectedWorldSupplyIdentities 必须是数组。');
  }
  const expectedWorldSupplyIdentities = source.expectedWorldSupplyIdentities as unknown as
    readonly ArenaPublicWorldSupplyIdentityV3[];
  for (const identity of expectedWorldSupplyIdentities) {
    if (
      identity.modeDefinitionId !== modeDefinitionId
      || identity.supplyDefinitionId !== policy.supplyDefinitionId
      || identity.tierPolicyDefinitionId !== policy.id
    ) {
      throw new RangeError('Survival V3 adapter supply identity 与 Mode/tier policy 不一致。');
    }
  }
  const resolver = identityResolver(policy);
  const equipment = v2Frame.worldSnapshot.equipment.map((runtime) => {
    const identity = requireRuntimeIdentity(resolver, runtime.definitionId);
    return Object.freeze({
      schemaVersion: runtime.schemaVersion,
      instanceId: runtime.instanceId,
      runtimeEquipmentDefinitionId: runtime.definitionId,
      collectionEquipmentDefinitionId: identity.collectionEquipmentDefinitionId,
      survivalLevel: identity.survivalLevel,
      spawnId: runtime.spawnId,
      locationState: runtime.locationState,
      ownerId: runtime.ownerId,
      position: runtime.position,
      lastSafePosition: runtime.lastSafePosition,
      cooldownRemainingTicks: runtime.cooldownRemainingTicks,
      revision: runtime.revision,
    });
  });
  const participants = v2Frame.worldSnapshot.participants.map((participant) => {
    if (participant.equipment === null) return Object.freeze({ ...participant, equipment: null });
    const runtimeIdentity = requireRuntimeIdentity(
      resolver,
      participant.equipment.definitionId,
    );
    return Object.freeze({
      ...participant,
      equipment: Object.freeze({
        instanceId: participant.equipment.instanceId,
        runtimeEquipmentDefinitionId: participant.equipment.definitionId,
        collectionEquipmentDefinitionId: runtimeIdentity.collectionEquipmentDefinitionId,
        survivalLevel: runtimeIdentity.survivalLevel,
        cooldownRemainingTicks: participant.equipment.cooldownRemainingTicks,
      }),
    });
  });
  const {
    participants: _v2Participants,
    equipment: _v2Equipment,
    activeSupplyProjection: _v2SupplyProjection,
    result: _v2Result,
    ...commonWorld
  } = v2Frame.worldSnapshot;
  const readFrameAudit = Object.freeze({
    worldSupplyEquipmentInstanceIds: Object.freeze(expectedWorldSupplyIdentities
      .map(({ equipmentInstanceId }) => equipmentInstanceId)
      .sort()),
    expectedWorldSupplyIdentities: Object.freeze([...expectedWorldSupplyIdentities]),
  });
  const readFrame = createMatchReadFrameV3Audit({
    schemaVersion: MATCH_READ_FRAME_V3_SCHEMA_VERSION,
    worldSnapshot: {
      ...commonWorld,
      modeDefinitionId,
      participants,
      equipment,
      activeSupplyProjection: source.activeSupplyProjection,
      modeProjection: source.modeProjection,
      result: source.modeResult,
    },
    localActionSidecar: {
      ...v2Frame.localActionSidecar,
      schemaVersion: MATCH_READ_FRAME_V3_SCHEMA_VERSION,
    },
  }, readFrameAudit);
  return Object.freeze({
    schemaVersion: SURVIVAL_MATCH_READ_FRAME_V3_ADAPTER_SCHEMA_VERSION,
    readFrame,
    readFrameAudit,
  });
}
