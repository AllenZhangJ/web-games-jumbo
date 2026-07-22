import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
  CHARACTER_PRESENTATION_SLOT_ID,
  CharacterPresentationRegistry,
  PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
  PRESENTATION_ASSET_KIND,
  PresentationAssetRegistry,
  createCharacterPresentationDefinition,
} from '@number-strategy-jump/arena-presentation-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';

export const ARENA_GAMEPLAY_V2_ASSET_ID = Object.freeze({
  PARKOUR_APPRENTICE: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
  CLOCKWORK_WARRIOR: 'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
  HEAVY_HAMMER: 'arena.asset.attachment.heavy-hammer.project-authored.v2',
  SHIELD: 'arena.asset.attachment.shield.kaykit-round.v1',
  CHAIN: 'arena.asset.attachment.chain.programmatic.v2',
});

const ASSET_SOURCE = Object.freeze({
  PARKOUR_APPRENTICE:
    './assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
  CLOCKWORK_WARRIOR:
    './assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
  SHIELD: './assets/arena/equipment/kaykit-adventurers/shield-round.glb',
});

function asset({ id, kind, providerId, sourceKey, tags }) {
  return {
    schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
    id,
    kind,
    providerId,
    sourceKey,
    contentVersion: 1,
    tags,
  };
}

function clip(sourceKey, { loop = false, fallbackSemantics = ['idle'] } = {}) {
  return Object.freeze({
    sourceKind: ARENA_ANIMATION_SOURCE_KIND.CLIP,
    sourceKey,
    loop,
    fallbackSemantics,
  });
}

function kayKitAnimationMap() {
  const values = {
    'attack-active': clip('Unarmed_Melee_Attack_Punch_A'),
    'attack-windup': clip('Unarmed_Melee_Attack_Punch_A'),
    'crouch-charge': clip('Unarmed_Pose', { loop: true }),
    'crouch-jump': clip('Jump_Start'),
    defend: clip('Blocking', { loop: true }),
    'double-jump': clip('Jump_Full_Short'),
    'down-smash': clip('2H_Melee_Attack_Chop'),
    draw: clip('Idle', { loop: true, fallbackSemantics: [] }),
    eliminated: clip('Death_A'),
    equipment: clip('2H_Melee_Attack_Chop'),
    hitstun: clip('Hit_A'),
    idle: clip('Idle', { loop: true, fallbackSemantics: [] }),
    jump: clip('Jump_Idle', { loop: true }),
    knockback: clip('Hit_B'),
    land: clip('Jump_Land'),
    lose: clip('Death_B'),
    run: clip('Running_A', { loop: true }),
    walk: clip('Walking_A', { loop: true }),
    win: clip('Cheer', { loop: true }),
  };
  if (Object.keys(values).length !== ARENA_ANIMATION_SEMANTIC_IDS.length) {
    throw new Error('KayKit animation map 未覆盖全部 Arena animation semantic。');
  }
  return values;
}

function formalKayKitPresentation({
  baseDefinition,
  id,
  modelAssetId,
  rigProfileId,
  materialProfileId,
  tags,
}) {
  const value = baseDefinition.toJSON();
  value.id = id;
  value.contentVersion = 1;
  value.modelAssetId = modelAssetId;
  value.rigProfileId = rigProfileId;
  value.materialProfileId = materialProfileId;
  value.animationMap = kayKitAnimationMap();
  value.attachmentSlots = value.attachmentSlots.map((slot) => {
    if (slot.id !== CHARACTER_PRESENTATION_SLOT_ID.EQUIPMENT) return slot;
    return {
      ...slot,
      nodeName: 'handslot.r',
      allowedAssetIds: [
        ARENA_GAMEPLAY_V2_ASSET_ID.CHAIN,
        ARENA_GAMEPLAY_V2_ASSET_ID.HEAVY_HAMMER,
        ARENA_GAMEPLAY_V2_ASSET_ID.SHIELD,
      ],
      defaultAssetId: null,
    };
  });
  value.tags = tags;
  return createCharacterPresentationDefinition(value);
}

export function createArenaGameplayV2CharacterContent(greyboxContent) {
  const assets = [
    ...greyboxContent.assetRegistry.list(),
    asset({
      id: ARENA_GAMEPLAY_V2_ASSET_ID.PARKOUR_APPRENTICE,
      kind: PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
      sourceKey: ASSET_SOURCE.PARKOUR_APPRENTICE,
      tags: ['formal', 'humanoid', 'kaykit', 'local-runner'],
    }),
    asset({
      id: ARENA_GAMEPLAY_V2_ASSET_ID.CLOCKWORK_WARRIOR,
      kind: PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
      sourceKey: ASSET_SOURCE.CLOCKWORK_WARRIOR,
      tags: ['formal', 'skeleton', 'kaykit', 'robot', 'opponent-runner'],
    }),
    asset({
      id: ARENA_GAMEPLAY_V2_ASSET_ID.HEAVY_HAMMER,
      kind: PRESENTATION_ASSET_KIND.ATTACHMENT,
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_ATTACHMENT_V1,
      sourceKey: 'hammer',
      tags: ['formal', 'equipment', 'two-handed', 'project-authored'],
    }),
    asset({
      id: ARENA_GAMEPLAY_V2_ASSET_ID.SHIELD,
      kind: PRESENTATION_ASSET_KIND.ATTACHMENT,
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_ATTACHMENT_V1,
      sourceKey: ASSET_SOURCE.SHIELD,
      tags: ['formal', 'equipment', 'offhand', 'kaykit'],
    }),
    asset({
      id: ARENA_GAMEPLAY_V2_ASSET_ID.CHAIN,
      kind: PRESENTATION_ASSET_KIND.ATTACHMENT,
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_ATTACHMENT_V1,
      sourceKey: 'chain',
      tags: ['project-authored', 'equipment', 'mainhand'],
    }),
  ];
  const assetRegistry = new PresentationAssetRegistry(assets);
  const baseHuman = greyboxContent.characterPresentationRegistry
    .requireDefaultForCharacter(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const baseRobot = greyboxContent.characterPresentationRegistry
    .requireDefaultForCharacter(ARENA_V1_CHARACTER_ID.WIND_UP_CUBE);
  const characterPresentationRegistry = new CharacterPresentationRegistry({
    assetRegistry,
    definitions: [
      formalKayKitPresentation({
        baseDefinition: baseHuman,
        id: 'arena.character-presentation.parkour-apprentice.kaykit-rogue.v1',
        modelAssetId: ARENA_GAMEPLAY_V2_ASSET_ID.PARKOUR_APPRENTICE,
        rigProfileId: 'arena.rig.kaykit-humanoid.v1',
        materialProfileId: 'arena.material.kaykit-runner-red.v1',
        tags: ['formal', 'humanoid', 'kaykit', 'local-runner'],
      }),
      formalKayKitPresentation({
        baseDefinition: baseRobot,
        id: 'arena.character-presentation.wind-up-cube.kaykit-skeleton-warrior.v1',
        modelAssetId: ARENA_GAMEPLAY_V2_ASSET_ID.CLOCKWORK_WARRIOR,
        rigProfileId: 'arena.rig.kaykit-skeleton.v1',
        materialProfileId: 'arena.material.kaykit-skeleton-clockwork.v1',
        tags: ['formal', 'skeleton', 'kaykit', 'robot', 'opponent-runner'],
      }),
    ],
  });
  const characters = Object.freeze(Object.fromEntries(
    characterPresentationRegistry.list().map((definition) => [
      definition.characterDefinitionId,
      Object.freeze({
        presentationId: definition.id,
        definitionHash: definition.getContentHash(),
        modelAssetId: definition.modelAssetId,
      }),
    ]),
  ));
  return Object.freeze({ assetRegistry, characterPresentationRegistry, characters });
}
