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
  type ArenaAnimationSemantic,
  type CharacterAnimationBinding,
  type CharacterPresentationDefinition,
  type CharacterPresentationDefinitionJson,
  type PresentationAssetDefinitionJson,
} from '@number-strategy-jump/arena-presentation-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import type { ArenaV1PresentationContent } from './arena-v1-presentation-content.js';

export const ARENA_GAMEPLAY_V2_ASSET_ID = Object.freeze({
  PARKOUR_APPRENTICE: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
  CLOCKWORK_WARRIOR: 'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
  HEAVY_HAMMER: 'arena.asset.attachment.heavy-hammer.project-authored.v2',
  SHIELD: 'arena.asset.attachment.shield.kaykit-round.v1',
  CHAIN: 'arena.asset.attachment.chain.programmatic.v2',
} as const);

const ASSET_SOURCE = Object.freeze({
  PARKOUR_APPRENTICE: './assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
  CLOCKWORK_WARRIOR: './assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
  SHIELD: './assets/arena/equipment/kaykit-adventurers/shield-round.glb',
});

function asset(options: Omit<PresentationAssetDefinitionJson, 'schemaVersion' | 'contentVersion'>): PresentationAssetDefinitionJson {
  return {
    schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
    contentVersion: 1,
    ...options,
  };
}

function clip(
  sourceKey: string,
  options: Readonly<{
    loop?: boolean;
    fallbackSemantics?: readonly ArenaAnimationSemantic[];
  }> = {},
): CharacterAnimationBinding {
  return Object.freeze({
    sourceKind: ARENA_ANIMATION_SOURCE_KIND.CLIP,
    sourceKey,
    loop: options.loop ?? false,
    fallbackSemantics: Object.freeze([...(options.fallbackSemantics ?? ['idle'])]),
  });
}

function kayKitAnimationMap(): Readonly<Record<ArenaAnimationSemantic, CharacterAnimationBinding>> {
  const values: Record<ArenaAnimationSemantic, CharacterAnimationBinding> = {
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
  return Object.freeze(values);
}

function formalKayKitPresentation(options: Readonly<{
  baseDefinition: CharacterPresentationDefinition;
  id: string;
  modelAssetId: string;
  rigProfileId: string;
  materialProfileId: string;
  tags: readonly string[];
}>): CharacterPresentationDefinition {
  const base = options.baseDefinition.toJSON();
  const attachmentSlots = base.attachmentSlots.map((slot) => (
    slot.id === CHARACTER_PRESENTATION_SLOT_ID.EQUIPMENT
      ? {
        ...slot,
        nodeName: 'handslot.r',
        allowedAssetIds: [
          ARENA_GAMEPLAY_V2_ASSET_ID.CHAIN,
          ARENA_GAMEPLAY_V2_ASSET_ID.HEAVY_HAMMER,
          ARENA_GAMEPLAY_V2_ASSET_ID.SHIELD,
        ],
        defaultAssetId: null,
      }
      : slot
  ));
  const definition: CharacterPresentationDefinitionJson = {
    ...base,
    id: options.id,
    contentVersion: 1,
    modelAssetId: options.modelAssetId,
    rigProfileId: options.rigProfileId,
    materialProfileId: options.materialProfileId,
    animationMap: kayKitAnimationMap(),
    attachmentSlots,
    tags: options.tags,
  };
  return createCharacterPresentationDefinition(definition);
}

export function createArenaGameplayV2CharacterContent(
  greyboxContent: ArenaV1PresentationContent,
): Readonly<Pick<
  ArenaV1PresentationContent,
  'assetRegistry' | 'characterPresentationRegistry' | 'characters'
>> {
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
