function positiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} 必须是有限正数。`);
  }
  return value;
}

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

export function validateCharacterSpawnSafety(mapDefinition, {
  characterSpawns,
  permanentSafeSurfaceIds,
  groundProbeTolerance,
}) {
  if (!mapDefinition?.arena || !Array.isArray(mapDefinition.arena.spawns)) {
    throw new TypeError('character spawn safety 需要 MapDefinition arena。');
  }
  if (!Array.isArray(characterSpawns) || characterSpawns.length === 0) {
    throw new RangeError('characterSpawns 必须是非空数组。');
  }
  if (characterSpawns.length > mapDefinition.arena.spawns.length) {
    throw new RangeError('MapDefinition 没有足够的角色出生点。');
  }
  if (!Array.isArray(permanentSafeSurfaceIds) || permanentSafeSurfaceIds.length === 0) {
    throw new RangeError('permanentSafeSurfaceIds 必须是非空数组。');
  }
  const tolerance = positiveFinite(groundProbeTolerance, 'groundProbeTolerance');
  const safeSurfaceIds = new Set(permanentSafeSurfaceIds.map((surfaceId, index) => (
    nonEmptyString(surfaceId, `permanentSafeSurfaceIds[${index}]`)
  )));
  const assignments = characterSpawns.map((entry, index) => {
    const characterId = nonEmptyString(entry?.characterId, `characterSpawns[${index}].characterId`);
    const radius = positiveFinite(entry?.collision?.radius, `characterSpawns[${index}].radius`);
    const halfHeight = positiveFinite(
      entry?.collision?.halfHeight,
      `characterSpawns[${index}].halfHeight`,
    );
    const spawn = mapDefinition.arena.spawns[index];
    const surface = mapDefinition.arena.surfaces.find((candidate) => {
      if (!safeSurfaceIds.has(candidate.id)) return false;
      const availableX = candidate.halfExtents.x - radius;
      const availableZ = candidate.halfExtents.z - radius;
      if (availableX < 0 || availableZ < 0) return false;
      const footprintFits = Math.abs(spawn.x - candidate.center.x) <= availableX
        && Math.abs(spawn.z - candidate.center.z) <= availableZ;
      if (!footprintFits) return false;
      const surfaceTop = candidate.center.y + candidate.halfExtents.y;
      const footY = spawn.y - radius - halfHeight;
      return Math.abs(footY - surfaceTop) <= tolerance;
    });
    if (!surface) {
      throw new RangeError(
        `MapDefinition ${mapDefinition.id} 的 spawn[${index}] 对 CharacterDefinition ${characterId} 不安全。`,
      );
    }
    return Object.freeze({
      characterId,
      spawnIndex: index,
      surfaceId: surface.id,
    });
  });
  return Object.freeze(assignments);
}
