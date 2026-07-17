import { ARENA_V1_CHARACTER_ID } from '../../content/arena-v1-character-ids.js';
import {
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_DEFINITIONS,
} from '../../content/stage4-equipment.js';
import { STAGE5_MAP_DEFINITION } from '../../content/stage5-map.js';
import { STAGE6_MOVEMENT_ACTION_ID } from '../../content/stage6-movement-actions.js';

function freezeVector3(value) {
  return Object.freeze({ x: value.x, y: value.y, z: value.z });
}

function freezeRecord(record) {
  return Object.freeze(Object.fromEntries(Object.entries(record).map(([key, value]) => [
    key,
    Object.freeze({ ...value }),
  ])));
}

const map = Object.freeze({
  id: STAGE5_MAP_DEFINITION.id,
  killY: STAGE5_MAP_DEFINITION.arena.killY,
  surfaces: Object.freeze(STAGE5_MAP_DEFINITION.arena.surfaces.map((surface) => Object.freeze({
    id: surface.id,
    center: freezeVector3(surface.center),
    halfExtents: freezeVector3(surface.halfExtents),
  }))),
});

const characters = freezeRecord({
  [ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE]: {
    semantic: 'parkour-apprentice',
    geometry: 'chibi-runner',
    role: 'local-runner',
  },
  [ARENA_V1_CHARACTER_ID.WIND_UP_CUBE]: {
    semantic: 'wind-up-cube',
    geometry: 'wind-up-robot',
    role: 'opponent-runner',
  },
});

const actions = freezeRecord({
  [STAGE4_ACTION_ID.BASE_PUSH]: { semantic: 'push', label: '推击' },
  [STAGE4_ACTION_ID.HAMMER_SMASH]: { semantic: 'heavy-smash', label: '重锤' },
  [STAGE4_ACTION_ID.CHAIN_PULL]: { semantic: 'chain-pull', label: '锁链' },
  [STAGE4_ACTION_ID.SHIELD_CHARGE]: { semantic: 'shield-charge', label: '冲撞' },
  [STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP]: { semantic: 'jump', label: '跳跃' },
  [STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP]: { semantic: 'air-jump', label: '二段跳' },
  [STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN]: { semantic: 'crouch-charge', label: '蓄力' },
  [STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE]: { semantic: 'crouch-jump', label: '蹲跳' },
  [STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP]: { semantic: 'jump', label: '跳跃' },
  [STAGE6_MOVEMENT_ACTION_ID.CONTEXT_AIR_JUMP]: { semantic: 'air-jump', label: '二段跳' },
  [STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN]: { semantic: 'crouch-charge', label: '蓄力' },
  [STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_RELEASE]: { semantic: 'crouch-jump', label: '蹲跳' },
  [STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH]: { semantic: 'down-smash', label: '下砸' },
});

const equipment = freezeRecord(Object.fromEntries(STAGE4_EQUIPMENT_DEFINITIONS.map((definition) => [
  definition.id,
  {
    semantic: definition.presentationSemantic,
    geometry: definition.id,
  },
])));

/**
 * Stage 6 only needs stable presentation semantics and primitive geometry.
 * Formal asset keys, skeletons, clips and attachment slots belong to Stage 7.
 */
export const ARENA_V1_GREYBOX_CONTENT = Object.freeze({
  schemaVersion: 1,
  map,
  characters,
  actions,
  equipment,
});
