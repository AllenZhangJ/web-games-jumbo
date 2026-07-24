import {
  EQUIPMENT_LOCATION_STATE,
  type EquipmentPosition,
  type EquipmentRegistryContract,
  type EquipmentRuntimeSnapshot,
} from './equipment-runtime.js';
import { equipmentPickupDistanceSquared } from './equipment-collision.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';

const RESOLVE_KEYS = new Set(['participants', 'equipment', 'contestSeed']);

export interface EquipmentPickupParticipant {
  readonly id: string;
  readonly eligible: boolean;
  readonly position: Readonly<EquipmentPosition>;
}

export interface EquipmentPickupDecision {
  readonly participantId: string;
  readonly equipmentInstanceId: string;
  readonly distanceSquared: number;
}

interface EquipmentPickupPair extends EquipmentPickupDecision {
  readonly contestScore: number;
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function contestScore(seed: number, equipmentInstanceId: string, participantId: string): number {
  let hash = (0x811c9dc5 ^ seed) >>> 0;
  const text = `${equipmentInstanceId}\u0000${participantId}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function assertParticipant(value: unknown, index: number): EquipmentPickupParticipant {
  const participant = value as Partial<EquipmentPickupParticipant> | null;
  const id = assertNonEmptyString(participant?.id, `pickup participant[${index}].id`);
  if (typeof participant?.eligible !== 'boolean') {
    throw new TypeError(`pickup participant[${index}].eligible 必须是布尔值。`);
  }
  return { id, eligible: participant.eligible, position: participant.position as EquipmentPosition };
}

export class EquipmentPickupResolver {
  readonly #equipmentRegistry: EquipmentRegistryContract;

  constructor({ equipmentRegistry }: { readonly equipmentRegistry: unknown }) {
    const registry = equipmentRegistry as Partial<EquipmentRegistryContract> | null;
    if (!registry || typeof registry.require !== 'function') {
      throw new TypeError('EquipmentPickupResolver 需要只读 EquipmentRegistry。');
    }
    this.#equipmentRegistry = registry as EquipmentRegistryContract;
    Object.freeze(this);
  }

  resolve(options: unknown): readonly EquipmentPickupDecision[] {
    assertKnownKeys(options, RESOLVE_KEYS, 'EquipmentPickupResolver options');
    const { participants, equipment, contestSeed } = options;
    if (!Array.isArray(participants) || !Array.isArray(equipment)) {
      throw new TypeError('pickup participants/equipment 必须是数组。');
    }
    const seed = assertIntegerAtLeast(contestSeed, 0, 'pickup contestSeed');
    if (seed > 0xffffffff) throw new RangeError('pickup contestSeed 必须是 uint32。');
    const normalizedParticipants = participants.map(assertParticipant);
    if (new Set(normalizedParticipants.map(({ id }) => id)).size !== normalizedParticipants.length) {
      throw new RangeError('pickup participants 不能包含重复 ID。');
    }
    const equipmentIds = new Set<string>();
    const pairs: EquipmentPickupPair[] = [];
    for (const runtimeValue of equipment) {
      const runtime = runtimeValue as Partial<EquipmentRuntimeSnapshot> | null;
      const instanceId = assertNonEmptyString(runtime?.instanceId, 'pickup equipment.instanceId');
      if (equipmentIds.has(instanceId)) throw new RangeError(`重复 equipment instance ${instanceId}。`);
      equipmentIds.add(instanceId);
      if (
        runtime?.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
        && runtime?.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
      ) continue;
      const definitionId = assertNonEmptyString(
        runtime?.definitionId,
        'pickup equipment.definitionId',
      );
      const definition = this.#equipmentRegistry.require(definitionId);
      for (const participant of normalizedParticipants) {
        if (!participant.eligible) continue;
        const distanceSquared = equipmentPickupDistanceSquared(
          participant.position,
          runtime?.position,
        );
        if (distanceSquared > definition.pickup.radius * definition.pickup.radius) continue;
        pairs.push({
          participantId: participant.id,
          equipmentInstanceId: instanceId,
          distanceSquared,
          contestScore: contestScore(seed, instanceId, participant.id),
        });
      }
    }
    pairs.sort((left, right) => (
      left.distanceSquared - right.distanceSquared
      || left.contestScore - right.contestScore
      || compareStrings(left.equipmentInstanceId, right.equipmentInstanceId)
      || compareStrings(left.participantId, right.participantId)
    ));
    const assignedParticipants = new Set<string>();
    const assignedEquipment = new Set<string>();
    const decisions: EquipmentPickupDecision[] = [];
    for (const pair of pairs) {
      if (
        assignedParticipants.has(pair.participantId)
        || assignedEquipment.has(pair.equipmentInstanceId)
      ) continue;
      assignedParticipants.add(pair.participantId);
      assignedEquipment.add(pair.equipmentInstanceId);
      decisions.push(Object.freeze({
        participantId: pair.participantId,
        equipmentInstanceId: pair.equipmentInstanceId,
        distanceSquared: pair.distanceSquared,
      }));
    }
    decisions.sort((left, right) => (
      compareStrings(left.participantId, right.participantId)
      || compareStrings(left.equipmentInstanceId, right.equipmentInstanceId)
    ));
    return Object.freeze(decisions);
  }
}
