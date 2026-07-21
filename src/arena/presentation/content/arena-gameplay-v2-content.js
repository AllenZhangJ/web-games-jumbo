import { ARENA_GAMEPLAY_V2_MAP_DEFINITION } from '../../content/arena-gameplay-v2-map.js';
import { ARENA_V1_GREYBOX_CONTENT } from './arena-v1-greybox-content.js';
import { createArenaGameplayV2CharacterContent } from './arena-gameplay-v2-character-content.js';

function freezeVector3(value) {
  return Object.freeze({ x: value.x, y: value.y, z: value.z });
}

const map = Object.freeze({
  id: ARENA_GAMEPLAY_V2_MAP_DEFINITION.id,
  killY: ARENA_GAMEPLAY_V2_MAP_DEFINITION.arena.killY,
  surfaces: Object.freeze(ARENA_GAMEPLAY_V2_MAP_DEFINITION.arena.surfaces.map((surface) => (
    Object.freeze({
      id: surface.id,
      center: freezeVector3(surface.center),
      halfExtents: freezeVector3(surface.halfExtents),
    })
  ))),
});

const characterContent = createArenaGameplayV2CharacterContent(ARENA_V1_GREYBOX_CONTENT);

export const ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT = Object.freeze({
  ...ARENA_V1_GREYBOX_CONTENT,
  schemaVersion: 3,
  map,
  ...characterContent,
});
