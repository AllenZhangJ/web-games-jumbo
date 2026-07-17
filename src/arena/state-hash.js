import {
  createDeterministicDataHash,
  createFnv1aHash,
} from '../shared/deterministic-data-hash.js';

function finiteInteger(value, scale = 1_000_000) {
  if (!Number.isFinite(value)) throw new TypeError('状态 hash 不能包含非有限数。');
  const quantized = Math.round(value * scale);
  if (!Number.isSafeInteger(quantized)) {
    throw new RangeError('状态数值超出可确定量化范围。');
  }
  return Object.is(quantized, -0) ? 0 : quantized;
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function createArenaConfigHash(config) {
  if (!config || typeof config !== 'object') throw new TypeError('config 必须是对象。');
  return createDeterministicDataHash(config, 'Arena config');
}

export function createMatchStateHash(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError('snapshot 必须是对象。');
  const fields = [
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
  for (const equipment of [...snapshot.equipment].sort((left, right) => {
    if (left.instanceId < right.instanceId) return -1;
    if (left.instanceId > right.instanceId) return 1;
    return 0;
  })) {
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
