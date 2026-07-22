import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  STAGE4_ACTION_ID,
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_EQUIPMENT_DEFINITIONS,
} from '../../content/stage4-equipment.js';
import { STAGE5_MAP_DEFINITION } from '../../content/stage5-map.js';
import { STAGE6_MOVEMENT_ACTION_ID } from '../../content/stage6-movement-actions.js';
import {
  CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
  CHARACTER_PRESENTATION_DIRECTION_STRATEGY,
  CHARACTER_PRESENTATION_FRONT_AXIS,
  CHARACTER_PRESENTATION_SLOT_ID,
  ARENA_ANIMATION_ACTION_CATEGORY,
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
  CharacterPresentationRegistry,
  PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
  PRESENTATION_ASSET_KIND,
  PresentationAssetRegistry,
} from '@number-strategy-jump/arena-presentation-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';

function freezeVector3(value) {
  return Object.freeze({ x: value.x, y: value.y, z: value.z });
}

function deepFreezePresentation(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezePresentation(child);
  return Object.freeze(value);
}

function freezeRecord(record) {
  return deepFreezePresentation(record);
}

function combatPresentation({ semantic, label, animationCategory, actionId, clipName, phases, scale }) {
  return {
    semantic,
    label,
    animationCategory,
    timing: stage4TimingById.get(actionId),
    clipName,
    overlayMask: 'upper-body',
    visualPhases: {
      anticipationEnd: phases.anticipationEnd,
      followThroughEnd: phases.followThroughEnd,
    },
    weaponScale: {
      idle: 1,
      windupPeak: scale.windupPeak,
      activePeak: scale.activePeak,
      followThroughPeak: scale.followThroughPeak,
    },
  };
}

const stage4TimingById = new Map(STAGE4_ACTION_DEFINITIONS.map((definition) => [
  definition.id,
  definition.timing,
]));

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
  [STAGE4_ACTION_ID.BASE_PUSH]: combatPresentation({
    semantic: 'push', label: '推击', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.ATTACK,
    actionId: STAGE4_ACTION_ID.BASE_PUSH, clipName: 'Unarmed_Melee_Attack_Punch_A',
    phases: { anticipationEnd: 0.72, followThroughEnd: 0.38 },
    scale: { windupPeak: 1, activePeak: 1, followThroughPeak: 1 },
  }),
  [STAGE4_ACTION_ID.HAMMER_SMASH]: combatPresentation({
    semantic: 'heavy-smash', label: '重锤', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
    actionId: STAGE4_ACTION_ID.HAMMER_SMASH, clipName: '2H_Melee_Attack_Chop',
    phases: { anticipationEnd: 0.8, followThroughEnd: 0.46 },
    scale: { windupPeak: 1.08, activePeak: 1.28, followThroughPeak: 1.15 },
  }),
  [STAGE4_ACTION_ID.CHAIN_PULL]: combatPresentation({
    semantic: 'chain-pull', label: '锁链', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
    actionId: STAGE4_ACTION_ID.CHAIN_PULL, clipName: 'Throw',
    phases: { anticipationEnd: 0.68, followThroughEnd: 0.52 },
    scale: { windupPeak: 1.06, activePeak: 1.2, followThroughPeak: 1.12 },
  }),
  [STAGE4_ACTION_ID.SHIELD_CHARGE]: combatPresentation({
    semantic: 'shield-charge', label: '冲撞', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.DEFEND,
    actionId: STAGE4_ACTION_ID.SHIELD_CHARGE, clipName: 'Block_Attack',
    phases: { anticipationEnd: 0.58, followThroughEnd: 0.62 },
    scale: { windupPeak: 1.05, activePeak: 1.18, followThroughPeak: 1.1 },
  }),
  [STAGE4_ACTION_ID.BASE_AIR_STRIKE]: combatPresentation({
    semantic: 'air-strike', label: '空中踢击', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.ATTACK,
    actionId: STAGE4_ACTION_ID.BASE_AIR_STRIKE, clipName: 'Unarmed_Melee_Attack_Punch_A',
    phases: { anticipationEnd: 0.62, followThroughEnd: 0.48 },
    scale: { windupPeak: 1, activePeak: 1, followThroughPeak: 1 },
  }),
  [STAGE4_ACTION_ID.HAMMER_AIR_SMASH]: combatPresentation({
    semantic: 'air-heavy-smash', label: '坠空重锤', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
    actionId: STAGE4_ACTION_ID.HAMMER_AIR_SMASH, clipName: '2H_Melee_Attack_Chop',
    phases: { anticipationEnd: 0.78, followThroughEnd: 0.56 },
    scale: { windupPeak: 1.12, activePeak: 1.38, followThroughPeak: 1.2 },
  }),
  [STAGE4_ACTION_ID.CHAIN_AIR_LASH]: combatPresentation({
    semantic: 'air-chain-lash', label: '坠空锁链', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
    actionId: STAGE4_ACTION_ID.CHAIN_AIR_LASH, clipName: 'Throw',
    phases: { anticipationEnd: 0.64, followThroughEnd: 0.58 },
    scale: { windupPeak: 1.1, activePeak: 1.3, followThroughPeak: 1.16 },
  }),
  [STAGE4_ACTION_ID.SHIELD_AIR_DROP]: combatPresentation({
    semantic: 'air-shield-drop', label: '坠空盾击', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.DEFEND,
    actionId: STAGE4_ACTION_ID.SHIELD_AIR_DROP, clipName: 'Block_Attack',
    phases: { anticipationEnd: 0.52, followThroughEnd: 0.68 },
    scale: { windupPeak: 1.08, activePeak: 1.25, followThroughPeak: 1.14 },
  }),
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
