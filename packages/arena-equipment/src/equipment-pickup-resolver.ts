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
const SUPPLY_RESOLVE_KEYS = new Set(['participants', 'supplies', 'contestSeed']);
const SUPPLY_ENTRY_KEYS = new Set(['equipment', 'pickupRadius']);

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

interface EquipmentPickupCandidate {
  readonly equipment: EquipmentRuntimeSnapshot;
  readonly pickupRadius: number;
}

export interface EquipmentSupplyPickupCandidate {
  readonly equipment: EquipmentRuntimeSnapshot;
  readonly pickupRadius: number;
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
    const candidates: EquipmentPickupCandidate[] = equipment.map((runtimeValue) => {
      const runtime = runtimeValue as Partial<EquipmentRuntimeSnapshot> | null;
      const definitionId = assertNonEmptyString(
        runtime?.definitionId,
        'pickup equipment.definitionId',
      );
      return {
        equipment: runtimeValue as EquipmentRuntimeSnapshot,
        pickupRadius: this.#equipmentRegistry.require(definitionId).pickup.radius,
      };
    });
    return this.#resolveCandidates(normalizedParticipants(participants), candidates, seed);
  }

  resolveSupply(options: unknown): readonly EquipmentPickupDecision[] {
    assertKnownKeys(options, SUPPLY_RESOLVE_KEYS, 'EquipmentPickupResolver supply options');
    const { participants, supplies, contestSeed } = options;
    if (!Array.isArray(participants) || !Array.isArray(supplies)) {
      throw new TypeError('supply pickup participants/supplies 必须是数组。');
    }
    const seed = assertIntegerAtLeast(contestSeed, 0, 'supply pickup contestSeed');
    if (seed > 0xffffffff) throw new RangeError('supply pickup contestSeed 必须是 uint32。');
    const candidates = supplies.map((value, index): EquipmentPickupCandidate => {
      assertKnownKeys(value, SUPPLY_ENTRY_KEYS, `supply pickup[${index}]`);
      if (!Number.isFinite(value.pickupRadius) || (value.pickupRadius as number) <= 0) {
        throw new RangeError(`supply pickup[${index}].pickupRadius 必须是有限正数。`);
      }
      return {
        equipment: value.equipment as EquipmentRuntimeSnapshot,
        pickupRadius: value.pickupRadius as number,
      };
    });
    return this.#resolveCandidates(normalizedParticipants(participants), candidates, seed);
  }

  #resolveCandidates(
    normalizedParticipants: readonly EquipmentPickupParticipant[],
    candidates: readonly EquipmentPickupCandidate[],
    seed: number,
  ): readonly EquipmentPickupDecision[] {
    if (new Set(normalizedParticipants.map(({ id }) => id)).size !== normalizedParticipants.length) {
      throw new RangeError('pickup participants 不能包含重复 ID。');
    }
    const equipmentIds = new Set<string>();
    const pairs: EquipmentPickupPair[] = [];
    for (const candidate of candidates) {
      const runtime = candidate.equipment as Partial<EquipmentRuntimeSnapshot> | null;
      const instanceId = assertNonEmptyString(runtime?.instanceId, 'pickup equipment.instanceId');
      if (equipmentIds.has(instanceId)) throw new RangeError(`重复 equipment instance ${instanceId}。`);
      equipmentIds.add(instanceId);
      if (
        runtime?.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
        && runtime?.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
      ) continue;
      for (const participant of normalizedParticipants) {
        if (!participant.eligible) continue;
        const distanceSquared = equipmentPickupDistanceSquared(
          participant.position,
          runtime?.position,
        );
        if (distanceSquared > candidate.pickupRadius * candidate.pickupRadius) continue;
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

function normalizedParticipants(values: readonly unknown[]): readonly EquipmentPickupParticipant[] {
  return values.map(assertParticipant);
}
