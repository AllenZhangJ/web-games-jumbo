import {
  createDeterministicDataHash,
  createFnv1aHash,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';

export interface ArenaInternalEquipmentSupplyLifecycle {
  readonly schemaVersion: number;
  readonly supplyDefinitionId: string;
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly spawnTick: number;
  readonly expireTick: number;
}

export interface ArenaInternalEquipmentSupplyTimelineSnapshot {
  readonly schemaVersion: number;
  readonly supplyDefinitionId: string;
  readonly nextTick: number;
  readonly activeSupplies: readonly ArenaInternalEquipmentSupplyLifecycle[];
}

export const ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION = 1 as const;

export interface ArenaInternalEquipmentSupplyDispositionSnapshot {
  readonly schemaVersion: typeof ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION;
  readonly expiredHeldSupplyEquipmentInstanceIds: readonly string[];
}

export type ArenaInternalMatchSnapshot = ArenaMatchSnapshot & Readonly<{
  rngStates: Readonly<Record<string, number>>;
  equipmentSupplyTimeline?: ArenaInternalEquipmentSupplyTimelineSnapshot;
  equipmentSupplyDisposition?: ArenaInternalEquipmentSupplyDispositionSnapshot;
}>;

function finiteInteger(value: number, scale = 1_000_000): number {
  if (!Number.isFinite(value)) throw new TypeError('状态 hash 不能包含非有限数。');
  const quantized = Math.round(value * scale);
  if (!Number.isSafeInteger(quantized)) {
    throw new RangeError('状态数值超出可确定量化范围。');
  }
  return Object.is(quantized, -0) ? 0 : quantized;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function createArenaConfigHash(config: unknown): string {
  if (!config || typeof config !== 'object') throw new TypeError('config 必须是对象。');
  return createDeterministicDataHash(config, 'Arena config');
}

export function createMatchStateHash(snapshot: ArenaInternalMatchSnapshot): string {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError('snapshot 必须是对象。');
  const fields: Array<string | number> = [
    snapshot.schemaVersion,
    snapshot.physicsBackendVersion,
    snapshot.configHash,
    snapshot.ruleContentHash,
    snapshot.matchSeed,
    snapshot.tick,
    snapshot.activeTick,
    snapshot.phase,
    snapshot.remainingTicks,
    snapshot.eventSequence,
  ];
  for (const participant of snapshot.participants) {
    fields.push(
      participant.id,
      participant.characterDefinitionId,
      participant.status,
      participant.lives,
      participant.eliminations,
      participant.deaths,
      participant.hitstunTicks,
      participant.invulnerableTicks,
      participant.respawnTicks,
      participant.action.definitionId ?? '',
      participant.action.phase,
      participant.action.ticksRemaining,
      participant.movement.schemaVersion,
      participant.movement.characterDefinitionId,
      participant.movement.mode,
      participant.movement.coyoteTicksRemaining,
      participant.movement.jumpBufferTicksRemaining,
      participant.movement.airJumpsUsed,
      participant.movement.crouchChargeTicks,
      participant.movement.crouchActionId ?? '',
      participant.movement.downSmashActionId ?? '',
      participant.movement.revision,
      participant.equipment?.instanceId ?? '',
      participant.equipment?.definitionId ?? '',
      participant.equipment?.cooldownRemainingTicks ?? 0,
      participant.lastHitBy ?? '',
      participant.lastHitTick,
      finiteInteger(participant.position.x),
      finiteInteger(participant.position.y),
      finiteInteger(participant.position.z),
      finiteInteger(participant.velocity.x),
      finiteInteger(participant.velocity.y),
      finiteInteger(participant.velocity.z),
      finiteInteger(participant.facing.x),
      finiteInteger(participant.facing.z),
      participant.grounded ? 1 : 0,
      participant.supportSurfaceId ?? '',
    );
  }
  for (const equipment of [...snapshot.equipment].sort((left, right) => (
    compareText(left.instanceId, right.instanceId)
  ))) {
    fields.push(
      equipment.schemaVersion,
      equipment.instanceId,
      equipment.definitionId,
      equipment.spawnId,
      equipment.locationState,
      equipment.ownerId ?? '',
      equipment.position ? finiteInteger(equipment.position.x) : '',
      equipment.position ? finiteInteger(equipment.position.y) : '',
      equipment.position ? finiteInteger(equipment.position.z) : '',
      equipment.lastSafePosition ? finiteInteger(equipment.lastSafePosition.x) : '',
      equipment.lastSafePosition ? finiteInteger(equipment.lastSafePosition.y) : '',
      equipment.lastSafePosition ? finiteInteger(equipment.lastSafePosition.z) : '',
      equipment.cooldownRemainingTicks,
      equipment.revision,
    );
  }
  if (snapshot.equipmentSupplyTimeline !== undefined) {
    const supply = snapshot.equipmentSupplyTimeline;
    fields.push(
      'equipment-supply-timeline',
      supply.schemaVersion,
      supply.supplyDefinitionId,
      supply.nextTick,
    );
    for (const lifecycle of [...supply.activeSupplies].sort((left, right) => (
      compareText(left.supplyId, right.supplyId)
    ))) {
      fields.push(
        lifecycle.schemaVersion,
        lifecycle.supplyDefinitionId,
        lifecycle.supplyId,
        lifecycle.equipmentInstanceId,
        lifecycle.spawnTick,
        lifecycle.expireTick,
      );
    }
    const disposition = snapshot.equipmentSupplyDisposition;
    if (
      disposition === undefined
      || disposition.schemaVersion !== ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION
      || !Array.isArray(disposition.expiredHeldSupplyEquipmentInstanceIds)
    ) throw new TypeError('状态 hash 缺少有效 equipment supply disposition。');
    const dispositionIds = disposition.expiredHeldSupplyEquipmentInstanceIds;
    if (dispositionIds.length > snapshot.participants.length) {
      throw new RangeError('equipment supply disposition 数量不能超过 participant 数量。');
    }
    const equipmentById = new Map<string, ArenaMatchSnapshot['equipment'][number]>();
    for (const equipment of snapshot.equipment) {
      if (equipmentById.has(equipment.instanceId)) {
        throw new RangeError(`equipment runtime ${equipment.instanceId} 在状态 hash 中重复。`);
      }
      equipmentById.set(equipment.instanceId, equipment);
    }
    const participantById = new Map(
      snapshot.participants.map((participant) => [participant.id, participant]),
    );
    for (let index = 0; index < dispositionIds.length; index += 1) {
      const instanceId = dispositionIds[index];
      if (typeof instanceId !== 'string' || instanceId.length === 0) {
        throw new TypeError('equipment supply disposition instanceId 无效。');
      }
      if (index > 0 && dispositionIds[index - 1]! >= instanceId) {
        throw new RangeError('equipment supply disposition instanceId 必须严格排序且唯一。');
      }
      const equipment = equipmentById.get(instanceId);
      if (
        equipment === undefined
        || equipment.locationState !== 'held'
        || equipment.ownerId === null
      ) throw new RangeError(`equipment supply disposition ${instanceId} 未绑定 held runtime。`);
      const owner = participantById.get(equipment.ownerId);
      if (owner === undefined || owner.equipment?.instanceId !== instanceId) {
        throw new RangeError(`equipment supply disposition ${instanceId} 与 participant slot 不一致。`);
      }
    }
    // Empty disposition is equivalent to the legacy empty state, preserving
    // ordinary/survival hashes until a future-affecting disposition exists.
    if (dispositionIds.length > 0) {
      fields.push(
        'equipment-supply-disposition',
        disposition.schemaVersion,
        ...dispositionIds,
      );
    }
  } else if (snapshot.equipmentSupplyDisposition !== undefined) {
    throw new TypeError('普通 MatchCore 不能携带 equipment supply disposition。');
  }
  if (!snapshot.map || !Array.isArray(snapshot.map.surfaces) || !Array.isArray(snapshot.map.occurrences)) {
    throw new TypeError('状态 hash 缺少 map runtime 快照。');
  }
  fields.push(
    snapshot.map.schemaVersion,
    snapshot.map.definitionId,
    snapshot.map.nextActiveTick,
    snapshot.map.revision,
  );
  for (const surface of [...snapshot.map.surfaces].sort((left, right) => (
    compareText(left.id, right.id)
  ))) {
    fields.push(surface.id, surface.enabled ? 1 : 0, surface.revision);
  }
  for (const occurrence of [...snapshot.map.occurrences].sort((left, right) => (
    compareText(left.occurrenceId, right.occurrenceId)
  ))) {
    fields.push(
      occurrence.occurrenceId,
      occurrence.eventId,
      occurrence.kind,
      occurrence.warningTick,
      occurrence.startTick,
      occurrence.endTick ?? -1,
      occurrence.phase,
      occurrence.revision,
      createDeterministicDataHash(occurrence.publicPayload, 'map occurrence public payload'),
      createDeterministicDataHash(occurrence.privatePlan ?? null, 'map occurrence private plan'),
    );
  }
  for (const [name, state] of Object.entries(snapshot.rngStates).sort(([a], [b]) => (
    compareText(a, b)
  ))) {
    fields.push(name, state);
  }
  fields.push(
    snapshot.result?.winnerId ?? '',
    snapshot.result?.reason ?? '',
    snapshot.result?.isDraw ? 1 : 0,
    snapshot.result?.endedAtTick ?? -1,
  );
  return createFnv1aHash(JSON.stringify(fields));
}
