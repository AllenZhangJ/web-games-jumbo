function finiteInteger(value, scale = 1_000_000) {
  if (!Number.isFinite(value)) throw new TypeError('状态 hash 不能包含非有限数。');
  const quantized = Math.round(value * scale);
  if (!Number.isSafeInteger(quantized)) {
    throw new RangeError('状态数值超出可确定量化范围。');
  }
  return Object.is(quantized, -0) ? 0 : quantized;
}

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function canonicalize(value) {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('配置签名不能包含非有限数。');
    return `n:${Object.is(value, -0) ? 0 : value}`;
  }
  if (typeof value === 'string') return `s:${JSON.stringify(value)}`;
  if (typeof value === 'boolean') return value ? 'b:1' : 'b:0';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalize(value[key])}`
    )).join(',')}}`;
  }
  throw new TypeError(`配置签名不支持 ${typeof value}。`);
}

export function createArenaConfigHash(config) {
  if (!config || typeof config !== 'object') throw new TypeError('config 必须是对象。');
  return fnv1a(canonicalize(config));
}

export function createMatchStateHash(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError('snapshot 必须是对象。');
  const fields = [
    snapshot.schemaVersion,
    snapshot.physicsBackendVersion,
    snapshot.configHash,
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
      participant.status,
      participant.lives,
      participant.eliminations,
      participant.deaths,
      participant.hitstunTicks,
      participant.invulnerableTicks,
      participant.respawnTicks,
      participant.action.phase,
      participant.action.ticksRemaining,
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
  for (const [name, state] of Object.entries(snapshot.rngStates).sort(([a], [b]) => a.localeCompare(b))) {
    fields.push(name, state);
  }
  fields.push(
    snapshot.result?.winnerId ?? '',
    snapshot.result?.reason ?? '',
    snapshot.result?.isDraw ? 1 : 0,
    snapshot.result?.endedAtTick ?? -1,
  );
  return fnv1a(JSON.stringify(fields));
}
