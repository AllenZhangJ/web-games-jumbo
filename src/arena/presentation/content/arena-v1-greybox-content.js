import { ARENA_V1_CHARACTER_ID } from '../../content/arena-v1-character-ids.js';
import {
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_DEFINITIONS,
} from '../../content/stage4-equipment.js';
import { STAGE5_MAP_DEFINITION } from '../../content/stage5-map.js';
import { STAGE6_MOVEMENT_ACTION_ID } from '../../content/stage6-movement-actions.js';
import {
  ARENA_ANIMATION_ACTION_CATEGORY,
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
} from '../animation/animation-semantics.js';
import {
  PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
  PRESENTATION_ASSET_KIND,
} from '../assets/presentation-asset-definition.js';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '../assets/presentation-asset-provider-ids.js';
import { PresentationAssetRegistry } from '../assets/presentation-asset-registry.js';
import {
  CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
  CHARACTER_PRESENTATION_DIRECTION_STRATEGY,
  CHARACTER_PRESENTATION_FRONT_AXIS,
  CHARACTER_PRESENTATION_SLOT_ID,
} from './character-presentation-definition.js';
import { CharacterPresentationRegistry } from './character-presentation-registry.js';

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

const actions = freezeRecord({
  [STAGE4_ACTION_ID.BASE_PUSH]: {
    semantic: 'push', label: '推击', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.ATTACK,
  },
  [STAGE4_ACTION_ID.HAMMER_SMASH]: {
    semantic: 'heavy-smash', label: '重锤', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
  },
  [STAGE4_ACTION_ID.CHAIN_PULL]: {
    semantic: 'chain-pull', label: '锁链', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
  },
  [STAGE4_ACTION_ID.SHIELD_CHARGE]: {
    semantic: 'shield-charge', label: '冲撞', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.DEFEND,
  },
  [STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP]: {
    semantic: 'jump', label: '跳跃', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
  },
  [STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP]: {
    semantic: 'air-jump', label: '二段跳', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
  },
  [STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN]: {
    semantic: 'crouch-charge', label: '蓄力', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
  },
  [STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE]: {
    semantic: 'crouch-jump', label: '蹲跳', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
  },
  [STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP]: {
    semantic: 'jump', label: '跳跃', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
  },
  [STAGE6_MOVEMENT_ACTION_ID.CONTEXT_AIR_JUMP]: {
    semantic: 'air-jump', label: '二段跳', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
  },
  [STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN]: {
    semantic: 'crouch-charge', label: '蓄力', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
  },
  [STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_RELEASE]: {
    semantic: 'crouch-jump', label: '蹲跳', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
  },
  [STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH]: {
    semantic: 'down-smash', label: '下砸', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
  },
});

const equipment = freezeRecord(Object.fromEntries(STAGE4_EQUIPMENT_DEFINITIONS.map((definition) => [
  definition.id,
  {
    semantic: definition.presentationSemantic,
    geometry: definition.id,
  },
])));

const CHARACTER_ASSET_ID = Object.freeze({
  PARKOUR_APPRENTICE: 'arena.asset.character.parkour-apprentice.programmatic.v1',
  WIND_UP_CUBE: 'arena.asset.character.wind-up-cube.programmatic.v1',
});

const assetRegistry = new PresentationAssetRegistry([
  {
    schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
    id: CHARACTER_ASSET_ID.PARKOUR_APPRENTICE,
    kind: PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
    providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1,
    sourceKey: 'chibi-runner',
    contentVersion: 1,
    tags: ['greybox', 'humanoid'],
  },
  {
    schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
    id: CHARACTER_ASSET_ID.WIND_UP_CUBE,
    kind: PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
    providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1,
    sourceKey: 'wind-up-robot',
    contentVersion: 1,
    tags: ['greybox', 'robot'],
  },
]);

function proceduralAnimationMap() {
  const fallback = {
    'attack-active': ['attack-windup', 'idle'],
    'attack-windup': ['idle'],
    'crouch-charge': ['idle'],
    'crouch-jump': ['jump', 'idle'],
    defend: ['idle'],
    'double-jump': ['jump', 'idle'],
    'down-smash': ['jump', 'idle'],
    draw: ['idle'],
    eliminated: ['idle'],
    equipment: ['attack-active', 'idle'],
    hitstun: ['idle'],
    idle: [],
    jump: ['idle'],
    knockback: ['hitstun', 'idle'],
    land: ['idle'],
    lose: ['idle'],
    run: ['walk', 'idle'],
    walk: ['idle'],
    win: ['idle'],
  };
  const looping = new Set(['idle', 'walk', 'run', 'crouch-charge', 'defend']);
  return Object.fromEntries(ARENA_ANIMATION_SEMANTIC_IDS.map((semantic) => [semantic, {
    sourceKind: ARENA_ANIMATION_SOURCE_KIND.PROCEDURAL,
    sourceKey: semantic,
    loop: looping.has(semantic),
    fallbackSemantics: fallback[semantic],
  }]));
}

function attachmentSlots(prefix) {
  return Object.values(CHARACTER_PRESENTATION_SLOT_ID).map((id) => ({
    id,
    nodeName: `${prefix}:${id}`,
    allowedAssetIds: [],
    defaultAssetId: null,
  }));
}

function characterPresentation({ id, characterDefinitionId, modelAssetId, rigProfileId, tags }) {
  return {
    schemaVersion: CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
    id,
    characterDefinitionId,
    defaultForCharacter: true,
    contentVersion: 1,
    modelAssetId,
    rigProfileId,
    materialProfileId: 'arena.material.low-poly-toy.v1',
    outlineProfileId: 'arena.outline.hand-drawn.v1',
    direction: {
      strategy: CHARACTER_PRESENTATION_DIRECTION_STRATEGY.SIX_SECTOR_CAMERA_RELATIVE,
      defaultFrontAxis: CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_Z,
      hysteresisDegrees: 6,
    },
    locomotion: {
      walkSpeedThreshold: 0.15,
      runSpeedThreshold: 4.5,
      knockbackSpeedThreshold: 7,
    },
    animationMap: proceduralAnimationMap(),
    attachmentSlots: attachmentSlots(id),
    tags,
  };
}

const characterPresentationRegistry = new CharacterPresentationRegistry({
  assetRegistry,
  definitions: [
    characterPresentation({
      id: 'arena.character-presentation.parkour-apprentice.greybox.v1',
      characterDefinitionId: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
      modelAssetId: CHARACTER_ASSET_ID.PARKOUR_APPRENTICE,
      rigProfileId: 'arena.rig.humanoid-chibi.v1',
      tags: ['greybox', 'local-runner'],
    }),
    characterPresentation({
      id: 'arena.character-presentation.wind-up-cube.greybox.v1',
      characterDefinitionId: ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
      modelAssetId: CHARACTER_ASSET_ID.WIND_UP_CUBE,
      rigProfileId: 'arena.rig.wind-up-cube.v1',
      tags: ['greybox', 'opponent-runner'],
    }),
  ],
});

const characters = freezeRecord(Object.fromEntries(
  characterPresentationRegistry.list().map((definition) => [
    definition.characterDefinitionId,
    {
      presentationId: definition.id,
      definitionHash: definition.getContentHash(),
      modelAssetId: definition.modelAssetId,
    },
  ]),
));

/**
 * Stage 7 S7.1 keeps the existing primitive views behind the same versioned
 * asset, character-presentation and animation contracts used by future GLB views.
 */
export const ARENA_V1_GREYBOX_CONTENT = Object.freeze({
  schemaVersion: 2,
  map,
  characters,
  actions,
  equipment,
  assetRegistry,
  characterPresentationRegistry,
});
