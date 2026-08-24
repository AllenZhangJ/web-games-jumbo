import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
  CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
  CHARACTER_PRESENTATION_DIRECTION_STRATEGY,
  CHARACTER_PRESENTATION_FRONT_AXIS,
  CHARACTER_PRESENTATION_SLOT_ID,
  CharacterPresentationRegistry,
  PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
  PRESENTATION_ASSET_KIND,
  PresentationAssetRegistry,
  createCharacterPresentationDefinition,
  type ArenaAnimationSemantic,
  type CharacterAnimationBinding,
  type CharacterPresentationDefinition,
  type PresentationAssetDefinitionJson,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_PRESENTATION_ASSET_PROVIDER_ID,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';

type FormalVisualRole =
  | 'playable-character-model'
  | 'survival-enemy-model'
  | 'weapon-attachment-model'
  | 'map-model';

interface ThirdPartyFormalAssetProvenanceCandidateV1 {
  readonly sourceLocator: string;
  readonly sourceRevision: string;
  readonly licenseId: 'CC0-1.0';
  readonly rightsHolder: string;
  readonly approvedBy: 'Allen';
  readonly approvedAt: '2026-07-23';
  readonly proofDocument: string;
}

interface ProjectAuthoredFormalAssetProvenanceCandidateV1 {
  readonly sourceLocator: string;
  readonly sourceRevision: string;
  readonly licenseId: 'Project-Owned';
  readonly rightsHolder: 'Number Strategy Jump project';
  readonly approvedBy: null;
  readonly approvedAt: null;
  readonly proofDocument: string;
}

type FormalAssetProvenanceCandidateV1 =
  | ThirdPartyFormalAssetProvenanceCandidateV1
  | ProjectAuthoredFormalAssetProvenanceCandidateV1
  | Readonly<{
    readonly sourceLocator: string;
    readonly sourceRevision: string;
    readonly licenseId: 'CC0-1.0';
    readonly rightsHolder: string;
    readonly approvedBy: null;
    readonly approvedAt: null;
    readonly proofDocument: string;
  }>;

export interface ArenaV2FormalVisualAssetRecordCandidateV1 {
  readonly role: FormalVisualRole;
  readonly maturity: 'verified-intake-only' | 'authored-candidate-not-approved';
  readonly encodedMediaFormat: 'glb';
  readonly artifactPath: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly provenance: FormalAssetProvenanceCandidateV1;
  readonly runtimeDefinition: PresentationAssetDefinitionJson;
}

export interface ArenaV2FormalAudioAssetRecordCandidateV1 {
  readonly audioAssetId: string;
  readonly weaponDefinitionId: string | null;
  readonly actionSemantic:
    | 'base-push'
    | 'chain-pull'
    | 'hammer-smash'
    | 'shield-charge'
    | 'line-suppressor'
    | 'read-counter'
    | 'flank-blade'
    | 'hook-spear'
    | 'burst-gauntlet'
    | 'vault-lance'
    | 'scatter-cannon'
    | 'sky-anchor'
    | 'edge-scythe'
    | 'rebound-hook'
    | 'pulse-baton'
    | 'siege-axe'
    | 'twin-fan'
    | 'diving-claw'
    | 'route-bow'
    | 'pivot-blade'
    | 'commitment-fist'
    | null;
  readonly cueId:
    | 'mode-started'
    | 'participant-fell-credited-hit'
    | 'participant-fell-movement'
    | 'participant-fell-environment'
    | 'respawn-scheduled'
    | 'respawned'
    | 'safe-anchor-committed'
    | 'race-finish-claimed'
    | 'enemy-pressure'
    | 'enemy-left'
    | 'survival-first-fall'
    | 'survival-terminal-fall'
    | 'match-ended'
    | 'supply-spawned'
    | 'supply-picked-up'
    | 'supply-replaced'
    | 'supply-expired'
    | `arena.cue.audio.weapon-phase.${string}.${'windup' | 'release' | 'recovery'}.v1`
    | null;
  readonly maturity: 'verified-intake-only' | 'authored-candidate-not-approved';
  readonly encodedMediaFormat: 'ogg';
  readonly artifactPath: string;
  readonly runtimeSourceKey: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly provenance: FormalAssetProvenanceCandidateV1;
}

export interface ArenaV2FormalVfxTextureAssetRecordCandidateV1 {
  readonly vfxAssetId: string;
  readonly cueId:
    | 'impact-confirm'
    | 'impact-surface-transfer'
    | 'ring-out'
    | 'evaded-warning'
    | 'movement-fall-warning';
  readonly maturity: 'verified-intake-only' | 'authored-candidate-not-approved';
  readonly encodedMediaFormat: 'png';
  readonly artifactPath: string;
  readonly runtimeSourceKey: string;
  readonly decodedTextureFormat: 'rgba8';
  readonly width: 128;
  readonly height: 128;
  readonly byteLength: number;
  readonly sha256: string;
  readonly provenance: FormalAssetProvenanceCandidateV1;
}

export interface ArenaV2FormalMaterialTextureAssetRecordCandidateV1 {
  readonly schemaVersion: 1;
  readonly contentVersion: 3;
  readonly textureAssetId: string;
  readonly role: 'character-material-texture' | 'attachment-material-texture';
  readonly maturity: 'verified-intake-only';
  readonly productionApproved: false;
  readonly encodedMediaFormat: 'png';
  readonly artifactPath: string;
  readonly runtimeSourceKey: string;
  readonly decodedTextureFormat: 'rgba8';
  readonly width: 1024;
  readonly height: 1024;
  readonly byteLength: number;
  readonly sha256: string;
  readonly provenance: ThirdPartyFormalAssetProvenanceCandidateV1;
}

export interface ArenaV2FormalMaterialTextureBindingCandidateV1 {
  readonly schemaVersion: 1;
  readonly contentVersion: 1;
  readonly bindingId: string;
  readonly consumerVisualAssetId: string;
  readonly textureAssetId: string;
  readonly relationship: 'external-gltf-image-uri';
  readonly gltfImageUri: string;
  readonly maturity: 'verified-intake-only';
  readonly productionApproved: false;
}

export interface ArenaV2FormalCharacterPresentationRecordCandidateV1 {
  readonly role: 'playable-character-model' | 'survival-enemy-model';
  readonly maturity: 'verified-intake-only';
  readonly presentation: CharacterPresentationDefinition;
}

export interface ArenaV2FormalCharacterMaterialProfileCandidateV1 {
  readonly id: string;
  readonly maturity: 'verified-intake-only';
  readonly tintHex: number;
  readonly emissiveHex: number;
  readonly emissiveIntensity: number;
  readonly valuePattern: Readonly<{
    readonly id: string;
    readonly meshValueMultipliers: readonly Readonly<{
      readonly meshName: string;
      readonly multiplier: number;
    }>[];
    readonly colorIsNeverSoleSignal: true;
    readonly addsGeometry: false;
    readonly addsDrawCalls: false;
    readonly evidenceStatus: 'specified-not-captured';
  }>;
}

export interface ArenaV2FormalMapAssetBindingCandidateV1 {
  readonly mapDefinitionId: string;
  readonly mapVisualAssetId: string;
  readonly maturity: 'verified-intake-only' | 'authored-candidate-not-approved';
}

const KAYKIT_ADVENTURERS_PROVENANCE = Object.freeze({
  sourceLocator: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0',
  sourceRevision: '672074b73ba276876a19e8816ecdc5241817ab47',
  licenseId: 'CC0-1.0' as const,
  rightsHolder: 'KayKit Game Assets / Kay Lousberg',
  approvedBy: 'Allen' as const,
  approvedAt: '2026-07-23' as const,
  proofDocument: 'docs/research/arena-kaykit-adventurers-intake.md',
});

const KAYKIT_SKELETONS_PROVENANCE = Object.freeze({
  sourceLocator: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0',
  sourceRevision: '15b62b9bad122f72926c10fb14d622c73819fa54',
  licenseId: 'CC0-1.0' as const,
  rightsHolder: 'KayKit Game Assets / Kay Lousberg',
  approvedBy: 'Allen' as const,
  approvedAt: '2026-07-23' as const,
  proofDocument: 'docs/research/arena-kaykit-skeletons-intake.md',
});

const KENNEY_IMPACT_PROVENANCE = Object.freeze({
  sourceLocator: 'https://www.kenney.nl/assets/impact-sounds',
  sourceRevision: '1.0',
  licenseId: 'CC0-1.0' as const,
  rightsHolder: 'Kenney',
  approvedBy: 'Allen' as const,
  approvedAt: '2026-07-23' as const,
  proofDocument: 'docs/research/arena-kenney-impact-sounds-intake.md',
});

const PROJECT_AUTHORED_KZ_MAP_PROVENANCE = Object.freeze({
  sourceLocator: 'packages/arena-product-content/src/arena-v2-kz-*-map-candidate-v1.ts',
  sourceRevision: 'arena-v2-authored-kz-map-builder.candidate.v2',
  licenseId: 'Project-Owned' as const,
  rightsHolder: 'Number Strategy Jump project' as const,
  approvedBy: null,
  approvedAt: null,
  proofDocument: 'docs/research/arena-authored-kz-map-assets.md',
});

const PROJECT_AUTHORED_WEAPON_AUDIO_PROVENANCE = Object.freeze({
  sourceLocator:
    'scripts/arena-build-authored-weapon-audio-candidates.ts + Kenney Impact Sounds 1.0',
  sourceRevision: 'arena-v2-authored-weapon-audio-builder.candidate.v1',
  licenseId: 'CC0-1.0' as const,
  rightsHolder: 'Kenney / Number Strategy Jump project derivative candidates',
  approvedBy: null,
  approvedAt: null,
  proofDocument: 'docs/research/arena-authored-weapon-audio-candidates.md',
});

const PROJECT_AUTHORED_WEAPON_PHASE_AUDIO_PROVENANCE = Object.freeze({
  sourceLocator:
    'scripts/arena-build-authored-weapon-phase-audio-candidates.ts + registered weapon impact candidates',
  sourceRevision: 'arena-v2-authored-weapon-phase-audio-builder.candidate.v1',
  licenseId: 'CC0-1.0' as const,
  rightsHolder: 'Kenney / Number Strategy Jump project derivative candidates',
  approvedBy: null,
  approvedAt: null,
  proofDocument: 'docs/research/arena-authored-weapon-phase-audio-candidates.md',
});

const PROJECT_AUTHORED_MODE_SUPPLY_AUDIO_PROVENANCE = Object.freeze({
  sourceLocator:
    'scripts/arena-build-authored-mode-supply-audio-candidates.ts + Kenney Impact Sounds 1.0',
  sourceRevision: 'arena-v2-authored-mode-supply-audio-builder.candidate.v1',
  licenseId: 'CC0-1.0' as const,
  rightsHolder: 'Kenney / Number Strategy Jump project derivative candidates',
  approvedBy: null,
  approvedAt: null,
  proofDocument: 'docs/research/arena-authored-mode-supply-audio-candidates.md',
});

const PROJECT_AUTHORED_VFX_TEXTURE_PROVENANCE = Object.freeze({
  sourceLocator: 'scripts/arena-build-authored-vfx-texture-candidates.ts',
  sourceRevision: 'arena-v2-authored-vfx-texture-builder.candidate.v1',
  licenseId: 'Project-Owned' as const,
  rightsHolder: 'Number Strategy Jump project' as const,
  approvedBy: null,
  approvedAt: null,
  proofDocument: 'docs/research/arena-authored-vfx-texture-candidates.md',
});

const AUTHORED_MAP_CANDIDATE_INPUTS = Object.freeze([
  Object.freeze({
    mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
    slug: 'kz-base',
    byteLength: 37_248,
    sha256: 'c70ac5f8d01d960c399b9433bbb05b34720841594e1116b42dd0f2ce062e30ef',
  }),
  Object.freeze({
    mapDefinitionId: 'arena-v2-kz-switchback-map.candidate.v1',
    slug: 'kz-switchback',
    byteLength: 27_292,
    sha256: '32732dac39379cb9009f7f0c4d95de7ca214bb11ae74c7458751d76cbf2ebc54',
  }),
]);

const WEAPON_ATTACHMENT_CANDIDATE_INPUTS = Object.freeze([
  Object.freeze({ weaponId: 'heavy-hammer', sourceName: 'axe_2handed', byteLength: 38_440, sha256: 'cecfb0cd3c89f11d80c2947f6e5c6bdd36721917d83968d29ba77f7e12fc74e4' }),
  Object.freeze({ weaponId: 'gravity-chain', sourceName: 'crossbow_1handed', byteLength: 43_256, sha256: 'ab5de123ed622c1df24fa559f7b73354183885ea6783e16c6ad6511e13915d68' }),
  Object.freeze({ weaponId: 'line-suppressor', sourceName: 'staff', byteLength: 36_260, sha256: 'ed6a9a096c421501ae0d41beb688ac9b58ee76a2de8444583a0f3fe1d755b9f8' }),
  Object.freeze({ weaponId: 'read-counter', sourceName: 'spellbook_open', byteLength: 32_820, sha256: '4180675597116ea56334dc835fbe047340e09c3b0d47fa59d97d9905f7204448' }),
  Object.freeze({ weaponId: 'flank-blade', sourceName: 'dagger', byteLength: 25_704, sha256: '994e1a03eb7e6e088961683cd757c4c58df6bd5bad7a987136f635818999a66e' }),
  Object.freeze({ weaponId: 'hook-spear', sourceName: 'sword_2handed', byteLength: 35_472, sha256: '9b195e8028942ce08b62f3af65fda667d37f9e4f89fd154c9fde5ca9154da276' }),
  Object.freeze({ weaponId: 'burst-gauntlet', sourceName: 'shield_badge_color', byteLength: 26_060, sha256: '9a27a73cf24224a811abda9a788deb75f7d9176afdb5ace348f76aed8144d392' }),
  Object.freeze({ weaponId: 'vault-lance', sourceName: 'sword_2handed_color', byteLength: 35_444, sha256: 'c1b17c71a43bd48ecede3589da9c2018f5fff35018b732341c35923684450670' }),
  Object.freeze({ weaponId: 'scatter-cannon', sourceName: 'crossbow_2handed', byteLength: 52_948, sha256: '5768c5a2b954d2f6195e24f5953ef0ef08d2bdf0b86e8c9218eb971148216bd7' }),
  Object.freeze({ weaponId: 'sky-anchor', sourceName: 'shield_spikes', byteLength: 37_024, sha256: 'e4d210517937f6ee74d1b047da2bba45c6e69605e80ad2348531c2323b83fd5a' }),
  Object.freeze({ weaponId: 'edge-scythe', sourceName: 'axe_1handed', byteLength: 29_004, sha256: '4f57ce0baef0176e576ae04231ba3fc8e1f8be772f2b14f8792c051d4151e72a' }),
  Object.freeze({ weaponId: 'rebound-hook', sourceName: 'arrow_bundle', byteLength: 33_400, sha256: '58a99c5c49e74f13c2e6b59443d62d5cf89e3bf51337df118a3afd73d9013339' }),
  Object.freeze({ weaponId: 'pulse-baton', sourceName: 'wand', byteLength: 23_644, sha256: 'f2faa495e45e34b2db60542e4c8520c61310e883475f0b7ab9cbcc1068abbd85' }),
  Object.freeze({ weaponId: 'siege-axe', sourceName: 'shield_spikes_color', byteLength: 37_032, sha256: 'c10657ac0ead435f34df2779daa0748f79a188715cf53dd4c9ea6a254842fae2' }),
  Object.freeze({ weaponId: 'twin-fan', sourceName: 'shield_badge', byteLength: 26_184, sha256: 'a03fd7105cd434c3d4783bec29efdcdc1992645b7de34fb2627774771fab875e' }),
  Object.freeze({ weaponId: 'diving-claw', sourceName: 'arrow', byteLength: 20_692, sha256: '2f10e01ced917bd7da0c37e6345d7993511e9bdb7d5c578e1161fb457cafee9a' }),
  Object.freeze({ weaponId: 'route-bow', sourceName: 'quiver', byteLength: 31_936, sha256: '148de5df220be81b33b76b72b3603881c0589b6fa3d1d2f63f97b893c3217617' }),
  Object.freeze({ weaponId: 'pivot-blade', sourceName: 'sword_1handed', byteLength: 28_816, sha256: '71d9422b28b2296ed85262a2d139338005a13d3fcb9aa1621b2955727f6c3194' }),
  Object.freeze({ weaponId: 'commitment-fist', sourceName: 'mug_full', byteLength: 32_252, sha256: 'd7435ad682548dfbb40b8385501a8dfecb406b233d9b434903b32f409fac5562' }),
]);

function weaponAttachmentAssetId(weaponId: string): string {
  return `arena.asset.attachment.weapon.${weaponId}.kaykit-candidate.v1`;
}

function runtimeVisualAsset(
  id: string,
  kind: PresentationAssetDefinitionJson['kind'],
  providerId: string,
  sourceKey: string,
  tags: readonly string[],
): PresentationAssetDefinitionJson {
  return Object.freeze({
    schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
    id,
    kind,
    providerId,
    sourceKey,
    contentVersion: 1,
    tags: Object.freeze([...tags]),
  });
}

function clip(
  sourceKey: string,
  options: Readonly<{
    readonly loop?: boolean;
    readonly fallbackSemantics?: readonly ArenaAnimationSemantic[];
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
    throw new RangeError('Arena V2 KayKit动作语义未完整覆盖。');
  }
  return Object.freeze(values);
}

function attachmentSlots(): readonly Readonly<{
  readonly id: typeof CHARACTER_PRESENTATION_SLOT_ID[keyof typeof CHARACTER_PRESENTATION_SLOT_ID];
  readonly nodeName: string;
  readonly allowedAssetIds: readonly string[];
  readonly defaultAssetId: string | null;
}>[] {
  const shieldAssetId = 'arena.asset.attachment.shield.kaykit-round.v1';
  const weaponAssetIds = WEAPON_ATTACHMENT_CANDIDATE_INPUTS.map(({ weaponId }) => (
    weaponAttachmentAssetId(weaponId)
  ));
  return Object.freeze([
    Object.freeze({ id: CHARACTER_PRESENTATION_SLOT_ID.ACCESSORY, nodeName: 'accessory', allowedAssetIds: Object.freeze([]), defaultAssetId: null }),
    Object.freeze({ id: CHARACTER_PRESENTATION_SLOT_ID.BODY, nodeName: 'body', allowedAssetIds: Object.freeze([]), defaultAssetId: null }),
    Object.freeze({ id: CHARACTER_PRESENTATION_SLOT_ID.EQUIPMENT, nodeName: 'handslot.r', allowedAssetIds: Object.freeze([shieldAssetId, ...weaponAssetIds]), defaultAssetId: null }),
    Object.freeze({ id: CHARACTER_PRESENTATION_SLOT_ID.OUTFIT, nodeName: 'outfit', allowedAssetIds: Object.freeze([]), defaultAssetId: null }),
    Object.freeze({ id: CHARACTER_PRESENTATION_SLOT_ID.TRAIL, nodeName: 'trail', allowedAssetIds: Object.freeze([]), defaultAssetId: null }),
    Object.freeze({ id: CHARACTER_PRESENTATION_SLOT_ID.WINGS, nodeName: 'wings', allowedAssetIds: Object.freeze([]), defaultAssetId: null }),
  ]);
}

function formalCharacterPresentation(value: Readonly<{
  readonly id: string;
  readonly characterDefinitionId: string;
  readonly modelAssetId: string;
  readonly rigProfileId: string;
  readonly materialProfileId: string;
  readonly tags: readonly string[];
}>): CharacterPresentationDefinition {
  return createCharacterPresentationDefinition({
    schemaVersion: CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
    id: value.id,
    characterDefinitionId: value.characterDefinitionId,
    defaultForCharacter: true,
    contentVersion: 1,
    modelAssetId: value.modelAssetId,
    rigProfileId: value.rigProfileId,
    materialProfileId: value.materialProfileId,
    outlineProfileId: 'arena.outline.ink-readable.v1',
    direction: {
      strategy: CHARACTER_PRESENTATION_DIRECTION_STRATEGY.SIX_SECTOR_CAMERA_RELATIVE,
      defaultFrontAxis: CHARACTER_PRESENTATION_FRONT_AXIS.NEGATIVE_Z,
      hysteresisDegrees: 6,
    },
    locomotion: {
      walkSpeedThreshold: 0.8,
      runSpeedThreshold: 4.4,
      knockbackSpeedThreshold: 6.5,
    },
    animationMap: kayKitAnimationMap(),
    attachmentSlots: attachmentSlots(),
    tags: value.tags,
  });
}

export const ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1 = Object.freeze([
  Object.freeze({
    role: 'playable-character-model' as const,
    maturity: 'verified-intake-only' as const,
    encodedMediaFormat: 'glb' as const,
    artifactPath:
      'public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
    byteLength: 922_332,
    sha256: '3ee71059eef32d9a6259c5cfd4121f31dffda0a9667509b5f24129fb2c7a1cab',
    provenance: KAYKIT_ADVENTURERS_PROVENANCE,
    runtimeDefinition: runtimeVisualAsset(
      'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
      PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
      ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
      './assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
      ['formal-intake', 'humanoid', 'kaykit', 'playable-candidate', 'eighteen-clips'],
    ),
  }),
  Object.freeze({
    role: 'survival-enemy-model' as const,
    maturity: 'verified-intake-only' as const,
    encodedMediaFormat: 'glb' as const,
    artifactPath: 'public/assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
    byteLength: 974_548,
    sha256: '1a424efda14e7875180989a66186fafcc94a12ac85ebdfdc7e3f998a00584e39',
    provenance: KAYKIT_SKELETONS_PROVENANCE,
    runtimeDefinition: runtimeVisualAsset(
      'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
      PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
      ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
      './assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
      ['formal-intake', 'enemy-family', 'kaykit', 'skeleton', 'eighteen-clips'],
    ),
  }),
  Object.freeze({
    role: 'weapon-attachment-model' as const,
    maturity: 'verified-intake-only' as const,
    encodedMediaFormat: 'glb' as const,
    artifactPath: 'public/assets/arena/equipment/kaykit-adventurers/shield-round.glb',
    byteLength: 13_084,
    sha256: 'a61bcd83ccac9bc8596bf09894867ca491487d7a4b0662bb64dca2d1b19e790d',
    provenance: KAYKIT_ADVENTURERS_PROVENANCE,
    runtimeDefinition: runtimeVisualAsset(
      'arena.asset.attachment.shield.kaykit-round.v1',
      PRESENTATION_ASSET_KIND.ATTACHMENT,
      ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_ATTACHMENT_V1,
      './assets/arena/equipment/kaykit-adventurers/shield-round.glb',
      ['formal-intake', 'equipment', 'kaykit', 'shield', 'offhand'],
    ),
  }),
  ...WEAPON_ATTACHMENT_CANDIDATE_INPUTS.map((input) => Object.freeze({
    role: 'weapon-attachment-model' as const,
    maturity: 'verified-intake-only' as const,
    encodedMediaFormat: 'glb' as const,
    artifactPath:
      `public/assets/arena/equipment/kaykit-adventurers/weapon-candidates/${input.weaponId}.glb`,
    byteLength: input.byteLength,
    sha256: input.sha256,
    provenance: KAYKIT_ADVENTURERS_PROVENANCE,
    runtimeDefinition: runtimeVisualAsset(
      weaponAttachmentAssetId(input.weaponId),
      PRESENTATION_ASSET_KIND.ATTACHMENT,
      ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_ATTACHMENT_V1,
      `./assets/arena/equipment/kaykit-adventurers/weapon-candidates/${input.weaponId}.glb`,
      [
        'formal-intake',
        'equipment',
        'kaykit',
        input.weaponId,
        `upstream-${input.sourceName}`,
        'silhouette-candidate-not-device-approved',
      ],
    ),
  })),
  ...AUTHORED_MAP_CANDIDATE_INPUTS.map((input) => Object.freeze({
    role: 'map-model' as const,
    maturity: 'authored-candidate-not-approved' as const,
    encodedMediaFormat: 'glb' as const,
    artifactPath: `public/assets/arena/maps/authored-candidates/${input.slug}.glb`,
    byteLength: input.byteLength,
    sha256: input.sha256,
    provenance: PROJECT_AUTHORED_KZ_MAP_PROVENANCE,
    runtimeDefinition: runtimeVisualAsset(
      `arena.asset.map.${input.slug}.authored-candidate.v1`,
      PRESENTATION_ASSET_KIND.MAP_MODEL,
      ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_MAP_V1,
      `./assets/arena/maps/authored-candidates/${input.slug}.glb`,
      [
        'project-authored',
        'arena-v2',
        'kz-inspired-not-copied',
        input.slug,
        'static-gltf-candidate-not-device-approved',
      ],
    ),
  })),
] satisfies readonly ArenaV2FormalVisualAssetRecordCandidateV1[]);

if (ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1.some((record) => (
  record.encodedMediaFormat !== 'glb' || !record.artifactPath.endsWith('.glb')
))) {
  throw new RangeError('Arena V2正式模型的编码媒体格式必须与GLB路径后缀闭合。');
}

export const ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1:
readonly ArenaV2FormalMaterialTextureAssetRecordCandidateV1[] = Object.freeze([
  Object.freeze({
    schemaVersion: 1 as const,
    contentVersion: 3 as const,
    textureAssetId: 'arena.texture.attachment.shield.v1',
    role: 'attachment-material-texture' as const,
    maturity: 'verified-intake-only' as const,
    productionApproved: false as const,
    encodedMediaFormat: 'png' as const,
    artifactPath: 'public/assets/arena/equipment/kaykit-adventurers/shield_texture.png',
    runtimeSourceKey: './assets/arena/equipment/kaykit-adventurers/shield_texture.png',
    decodedTextureFormat: 'rgba8' as const,
    width: 1024 as const,
    height: 1024 as const,
    byteLength: 14_172,
    sha256: '5d250ccc5da020e6126bfa3839f83bd9a465a951ed223e4d13c08b1925e154d4',
    provenance: KAYKIT_ADVENTURERS_PROVENANCE,
  }),
  Object.freeze({
    schemaVersion: 1 as const,
    contentVersion: 3 as const,
    textureAssetId: 'arena.texture.character.rogue.v1',
    role: 'character-material-texture' as const,
    maturity: 'verified-intake-only' as const,
    productionApproved: false as const,
    encodedMediaFormat: 'png' as const,
    artifactPath:
      'public/assets/arena/characters/kaykit-adventurers/rogue_texture.png',
    runtimeSourceKey: './assets/arena/characters/kaykit-adventurers/rogue_texture.png',
    decodedTextureFormat: 'rgba8' as const,
    width: 1024 as const,
    height: 1024 as const,
    byteLength: 16_670,
    sha256: 'a4032e877c3b91939f5cdbb630349c1998fdbc3211bbd587c111125500fe4cc5',
    provenance: KAYKIT_ADVENTURERS_PROVENANCE,
  }),
  Object.freeze({
    schemaVersion: 1 as const,
    contentVersion: 3 as const,
    textureAssetId: 'arena.texture.character.skeleton.v1',
    role: 'character-material-texture' as const,
    maturity: 'verified-intake-only' as const,
    productionApproved: false as const,
    encodedMediaFormat: 'png' as const,
    artifactPath: 'public/assets/arena/characters/kaykit-skeletons/skeleton_texture.png',
    runtimeSourceKey: './assets/arena/characters/kaykit-skeletons/skeleton_texture.png',
    decodedTextureFormat: 'rgba8' as const,
    width: 1024 as const,
    height: 1024 as const,
    byteLength: 17_037,
    sha256: '15741a25c53e04fa9bf3beac3bc0de442359404b1ff9be863b892cb551ad3657',
    provenance: KAYKIT_SKELETONS_PROVENANCE,
  }),
]);

const FORMAL_MATERIAL_TEXTURE_IDS = new Set<string>();
const FORMAL_MATERIAL_TEXTURE_PATHS = new Set<string>();
const FORMAL_MATERIAL_TEXTURE_SOURCE_KEYS = new Set<string>();
const FORMAL_MATERIAL_TEXTURE_HASHES = new Set<string>();
let previousFormalMaterialTextureId: string | null = null;
for (const record of ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1) {
  if (
    FORMAL_MATERIAL_TEXTURE_IDS.has(record.textureAssetId)
    || FORMAL_MATERIAL_TEXTURE_PATHS.has(record.artifactPath)
    || FORMAL_MATERIAL_TEXTURE_SOURCE_KEYS.has(record.runtimeSourceKey)
    || FORMAL_MATERIAL_TEXTURE_HASHES.has(record.sha256)
    || record.encodedMediaFormat !== 'png'
    || !record.artifactPath.endsWith('.png')
    || (previousFormalMaterialTextureId !== null
      && record.textureAssetId <= previousFormalMaterialTextureId)
  ) {
    throw new RangeError(`Arena V2正式材质纹理身份重复或未按ID升序：${record.textureAssetId}。`);
  }
  FORMAL_MATERIAL_TEXTURE_IDS.add(record.textureAssetId);
  FORMAL_MATERIAL_TEXTURE_PATHS.add(record.artifactPath);
  FORMAL_MATERIAL_TEXTURE_SOURCE_KEYS.add(record.runtimeSourceKey);
  FORMAL_MATERIAL_TEXTURE_HASHES.add(record.sha256);
  previousFormalMaterialTextureId = record.textureAssetId;
}
if (ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length !== 3) {
  throw new RangeError('Arena V2正式材质纹理必须精确登记3/3。');
}

export const ARENA_V2_FORMAL_MATERIAL_TEXTURE_BINDINGS_CANDIDATE_V1:
readonly ArenaV2FormalMaterialTextureBindingCandidateV1[] = Object.freeze([
  Object.freeze({
    schemaVersion: 1 as const,
    contentVersion: 1 as const,
    bindingId: 'arena.binding.material-texture.attachment.shield.v1',
    consumerVisualAssetId: 'arena.asset.attachment.shield.kaykit-round.v1',
    textureAssetId: 'arena.texture.attachment.shield.v1',
    relationship: 'external-gltf-image-uri' as const,
    gltfImageUri: 'shield_texture.png',
    maturity: 'verified-intake-only' as const,
    productionApproved: false as const,
  }),
  Object.freeze({
    schemaVersion: 1 as const,
    contentVersion: 1 as const,
    bindingId: 'arena.binding.material-texture.character.rogue.v1',
    consumerVisualAssetId: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
    textureAssetId: 'arena.texture.character.rogue.v1',
    relationship: 'external-gltf-image-uri' as const,
    gltfImageUri: 'rogue_texture.png',
    maturity: 'verified-intake-only' as const,
    productionApproved: false as const,
  }),
  Object.freeze({
    schemaVersion: 1 as const,
    contentVersion: 1 as const,
    bindingId: 'arena.binding.material-texture.character.skeleton.v1',
    consumerVisualAssetId:
      'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
    textureAssetId: 'arena.texture.character.skeleton.v1',
    relationship: 'external-gltf-image-uri' as const,
    gltfImageUri: 'skeleton_texture.png',
    maturity: 'verified-intake-only' as const,
    productionApproved: false as const,
  }),
]);

const FORMAL_VISUAL_BY_ID = new Map(
  ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1.map((record) => (
    [record.runtimeDefinition.id, record] as const
  )),
);
const FORMAL_MATERIAL_TEXTURE_BY_ID = new Map(
  ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.map((record) => (
    [record.textureAssetId, record] as const
  )),
);
const FORMAL_MATERIAL_TEXTURE_BINDING_IDS = new Set<string>();
const FORMAL_MATERIAL_TEXTURE_BINDING_CONSUMERS = new Set<string>();
const FORMAL_MATERIAL_TEXTURE_BINDING_TEXTURES = new Set<string>();
let previousFormalMaterialTextureBindingId: string | null = null;
for (const binding of ARENA_V2_FORMAL_MATERIAL_TEXTURE_BINDINGS_CANDIDATE_V1) {
  if (
    FORMAL_MATERIAL_TEXTURE_BINDING_IDS.has(binding.bindingId)
    || FORMAL_MATERIAL_TEXTURE_BINDING_CONSUMERS.has(binding.consumerVisualAssetId)
    || FORMAL_MATERIAL_TEXTURE_BINDING_TEXTURES.has(binding.textureAssetId)
    || (previousFormalMaterialTextureBindingId !== null
      && binding.bindingId <= previousFormalMaterialTextureBindingId)
  ) {
    throw new RangeError(`Arena V2正式材质纹理绑定重复或未按ID升序：${binding.bindingId}。`);
  }
  const consumer = FORMAL_VISUAL_BY_ID.get(binding.consumerVisualAssetId);
  const texture = FORMAL_MATERIAL_TEXTURE_BY_ID.get(binding.textureAssetId);
  if (consumer === undefined || texture === undefined) {
    throw new RangeError(`Arena V2正式材质纹理绑定缺少模型或纹理：${binding.bindingId}。`);
  }
  const sourceKeySeparator = consumer.runtimeDefinition.sourceKey.lastIndexOf('/');
  const resolvedTextureSourceKey = sourceKeySeparator < 0
    ? binding.gltfImageUri
    : `${consumer.runtimeDefinition.sourceKey.slice(0, sourceKeySeparator + 1)}${binding.gltfImageUri}`;
  const expectedTextureRole = consumer.role === 'weapon-attachment-model'
    ? 'attachment-material-texture'
    : 'character-material-texture';
  if (
    resolvedTextureSourceKey !== texture.runtimeSourceKey
    || texture.role !== expectedTextureRole
    || consumer.maturity !== binding.maturity
    || texture.maturity !== binding.maturity
    || consumer.provenance.sourceRevision !== texture.provenance.sourceRevision
    || consumer.provenance.licenseId !== texture.provenance.licenseId
  ) {
    throw new RangeError(`Arena V2正式材质纹理依赖身份不闭合：${binding.bindingId}。`);
  }
  FORMAL_MATERIAL_TEXTURE_BINDING_IDS.add(binding.bindingId);
  FORMAL_MATERIAL_TEXTURE_BINDING_CONSUMERS.add(binding.consumerVisualAssetId);
  FORMAL_MATERIAL_TEXTURE_BINDING_TEXTURES.add(binding.textureAssetId);
  previousFormalMaterialTextureBindingId = binding.bindingId;
}
if (ARENA_V2_FORMAL_MATERIAL_TEXTURE_BINDINGS_CANDIDATE_V1.length !== 3) {
  throw new RangeError('Arena V2正式材质纹理依赖必须精确闭合3/3。');
}

const AUDIO_INPUTS = Object.freeze([
  Object.freeze({
    audioAssetId: 'arena.audio.impact.base-push.v1', actionSemantic: 'base-push' as const,
    weaponId: null,
    filename: 'base-push.ogg', byteLength: 8_800,
    sha256: '486988aa2d6440ffc4c62a0e8ccf3c23673ba84424bd4723378d451b7255eb5c',
  }),
  Object.freeze({
    audioAssetId: 'arena.audio.impact.chain-pull.v1', actionSemantic: 'chain-pull' as const,
    weaponId: 'gravity-chain',
    filename: 'chain-pull.ogg', byteLength: 7_651,
    sha256: '33b5e6e37c6e9d54e07bf5a89b12c76e879f40c1ea83cdd82714df1d6f9fec6d',
  }),
  Object.freeze({
    audioAssetId: 'arena.audio.impact.hammer-smash.v1', actionSemantic: 'hammer-smash' as const,
    weaponId: 'heavy-hammer',
    filename: 'hammer-smash.ogg', byteLength: 6_110,
    sha256: 'e07045693e4a2b3d165c424e3dab4c781d9ff8880a386880ac89a51315d7f831',
  }),
  Object.freeze({
    audioAssetId: 'arena.audio.impact.shield-charge.v1', actionSemantic: 'shield-charge' as const,
    weaponId: 'charge-shield',
    filename: 'shield-charge.ogg', byteLength: 10_032,
    sha256: '112d4f93ddcc370b410630f971c0f5d991856102da9c76bc5c5540d388e75aaa',
  }),
]);

const FORMAL_WEAPON_DEFINITION_BY_CATALOG_ID: ReadonlyMap<string, string> = new Map(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map((weapon) => (
    [weapon.id, weapon.equipment.id] as const
  )),
);
if (FORMAL_WEAPON_DEFINITION_BY_CATALOG_ID.size !== 20) {
  throw new RangeError('Arena V2正式音频媒体绑定必须精确闭合20把武器Definition。');
}

function formalWeaponDefinitionId(weaponId: string | null): string | null {
  if (weaponId === null) return null;
  const definitionId = FORMAL_WEAPON_DEFINITION_BY_CATALOG_ID.get(weaponId);
  if (definitionId === undefined) {
    throw new RangeError(`Arena V2正式音频媒体绑定未登记武器${weaponId}。`);
  }
  return definitionId;
}

const AUTHORED_WEAPON_AUDIO_CANDIDATE_INPUTS = Object.freeze([
  Object.freeze({ weaponId: 'line-suppressor', source: 'base-push', designIntent: 'wide-muted-pressure', byteLength: 5_678, sha256: '5c3e101bee65d89c379e2b92bb2b95b32124721c6195e4bb6ca5a96dbf794509' }),
  Object.freeze({ weaponId: 'read-counter', source: 'shield-charge', designIntent: 'short-metal-answer', byteLength: 6_164, sha256: '951e2787f1794d596725478b4c93a2af2cc843eff7810e56b9565fddb8c6bd01' }),
  Object.freeze({ weaponId: 'flank-blade', source: 'chain-pull', designIntent: 'fast-side-cut', byteLength: 5_240, sha256: 'f9fa5ddf7a3a079ba5ef4fb23c96ea7ea14636905b33f4f6286a5910e32743c7' }),
  Object.freeze({ weaponId: 'hook-spear', source: 'chain-pull', designIntent: 'hook-then-drag', byteLength: 5_188, sha256: 'aeae39b5a16c5400005afad66c6dddc7436e0f28d2de0e6e4ad6bcc641bf6a5b' }),
  Object.freeze({ weaponId: 'burst-gauntlet', source: 'base-push', designIntent: 'compact-burst', byteLength: 6_233, sha256: '958243463d8d17ebcdd6cc40a0c82cc17df922e0da0103de3ddd3403895591d3' }),
  Object.freeze({ weaponId: 'vault-lance', source: 'chain-pull', designIntent: 'long-clean-thrust', byteLength: 5_121, sha256: '777582413386821b1bc817f3c4bf31e7cda8df286eae8260bb5e98be9a4c205f' }),
  Object.freeze({ weaponId: 'scatter-cannon', source: 'hammer-smash', designIntent: 'broad-scatter-blast', byteLength: 4_523, sha256: 'cbcdaabd6028f39db3b8c2be83bc87aa44556eef8036ecb4d3ed37922e2eaf9e' }),
  Object.freeze({ weaponId: 'sky-anchor', source: 'shield-charge', designIntent: 'dense-downward-lock', byteLength: 6_845, sha256: 'd91d2ffcafd2882dec31d5b753dc25e75ab183039e388ac80882d9fa323e1965' }),
  Object.freeze({ weaponId: 'edge-scythe', source: 'chain-pull', designIntent: 'thin-edge-sweep', byteLength: 5_031, sha256: 'c3d089d6a9c1cadc22540c02238ff9ffb0268623a2af2c25031daf995d9a472c' }),
  Object.freeze({ weaponId: 'rebound-hook', source: 'chain-pull', designIntent: 'elastic-return', byteLength: 5_729, sha256: '689f717fb3391b9fe1b2db6cd66362192918d2d6e0087ef0bce7d28e50f6956e' }),
  Object.freeze({ weaponId: 'pulse-baton', source: 'shield-charge', designIntent: 'bright-pulse', byteLength: 5_568, sha256: '766e36cf96f99cacd9212ddc5427adbace72ce85a04a18ae1adac8e80a2ec6ac' }),
  Object.freeze({ weaponId: 'siege-axe', source: 'hammer-smash', designIntent: 'slow-heavy-cleave', byteLength: 4_479, sha256: 'ffa32331ee96ae3cd4c5fcd9e2a02156ab1fd25b6e6ccbab5763f896c083fd27' }),
  Object.freeze({ weaponId: 'twin-fan', source: 'base-push', designIntent: 'paired-air-slap', byteLength: 5_725, sha256: '7539b5c295060c1df94f9c478f5a304a10a57c926732b439cdd09d64a96b9019' }),
  Object.freeze({ weaponId: 'diving-claw', source: 'base-push', designIntent: 'sharp-downward-grab', byteLength: 5_572, sha256: '9fdfedd38218b18afb70377a44cb0cb4a1cad272e17891056812edaa40c16401' }),
  Object.freeze({ weaponId: 'route-bow', source: 'chain-pull', designIntent: 'light-ranged-twang', byteLength: 5_166, sha256: 'b31bbb8c5ad3dd311439cce0877899658458dbee7d631ac82c826c848e6173b2' }),
  Object.freeze({ weaponId: 'pivot-blade', source: 'chain-pull', designIntent: 'balanced-turning-cut', byteLength: 5_158, sha256: 'd2f89abf1afef0e8a281e63f3743af1c1efd28fbf9e910e5ffaabfde549dce01' }),
  Object.freeze({ weaponId: 'commitment-fist', source: 'base-push', designIntent: 'committed-heavy-punch', byteLength: 5_961, sha256: 'c2d829e2bea6e83e3d5c633c15b5102f09e298be5989d5bfc621cde42919ad51' }),
]);

const AUTHORED_WEAPON_PHASE_AUDIO_CANDIDATE_INPUTS = Object.freeze([
  Object.freeze({ weaponId: 'charge-shield', windup: [6056, '37af721e06891f4e67e0cb5c6860aed6985949099257b262b3978b5f3ceb41bb'], release: [6044, '5a938b52631c370e5788be011b5ccecb57686d03e1106cc14d62c0ad65b0395d'], recovery: [6092, 'a2442bf8d90e4a4980e9d4ec2390791095cdefe7fc371962f7ba8f13fe7e21a1'] }),
  Object.freeze({ weaponId: 'heavy-hammer', windup: [4407, 'd5d0029eb26d0480d295d99a8795d37ebca8c2cedb9f887266640464b46f3714'], release: [4444, 'b9c9055deff3fb7ebf33394a6266e598920703451268896faefc3d76b83c8d1c'], recovery: [4385, '40119347b95e50df30b6207499dc1a2a4cef270ef8e03b4d24d5082c005f0894'] }),
  Object.freeze({ weaponId: 'gravity-chain', windup: [5166, '71917a7c55a502dff55df23ba3a4fffd92d7db1f0f5c150e5b40d8503a18df97'], release: [5028, '293f48b423d3760c19172fe6ae22efa6e8c9fdd0351bf74f524dcf252b0622e3'], recovery: [4952, 'e82f9fb1bbb7f6d869e6eaa517e24ce6ac0b47186f92fe794e735a54118f7816'] }),
  Object.freeze({ weaponId: 'line-suppressor', windup: [5170, '7c6ad811f712f9af157fd2b3943029ae800bce6d03ccd7e12578a300af6ae085'], release: [5148, '7b1ae5e3563050cc80b1a909aec8b6aef67b84afa48922c00b832a27268c5517'], recovery: [5274, '78441331fe6cd77d28149169a3fae195a10e54f2f2d4f24c9d0389c51d6371af'] }),
  Object.freeze({ weaponId: 'read-counter', windup: [5557, '68bf3643791d7fdc0ac37ae51f7828127d02087fccdbb7edf8ccc8e2f0c8a10d'], release: [5501, '0fa0dea542eff8594ce4246504bf1e89b85e558d334e38cc110921a79d08bc7d'], recovery: [5531, '0f85b5ece83c017876c2461d0bdc5f2dd3031ba7b71df31517a3f179b56fb3bc'] }),
  Object.freeze({ weaponId: 'flank-blade', windup: [4679, '69b8d9ef1f7ba07e12a56b7affa14f5f7249493f8ce5a19dd842654c14eaf60e'], release: [4688, '538bd142278ce8d8b001d1c33db4a81c97281822fcc6156b5a53d8e0780b60c3'], recovery: [4633, '95146236c74c48ba7563b5486ca4c3e1731e00536dc5855e86d9e4bf97ee28d9'] }),
  Object.freeze({ weaponId: 'hook-spear', windup: [4926, '5a5b48217891f273e2825c7491235a04a4ff412b360d40505f560135121e3cd2'], release: [4760, '6865739927290176fc379c4e8baf65920fbf529bef71a6e7fc55584e47a67694'], recovery: [4895, 'e6737ea41a6442030861a8e00e15fd5d29e730c4acdad6b4c04cefe0f6a1935a'] }),
  Object.freeze({ weaponId: 'burst-gauntlet', windup: [5351, '301e84bf60044d312de130fb899f9d7e70bf44f9737b94161e004cf1d6de49e1'], release: [5321, '42f3a49ec7c55bfa8155c486c94ebe39209bab6ae5a6119bf19b762255eca5fd'], recovery: [5181, '92ebbf7ccd2de593e66c91de2ca431c7cf579b65bfea75dc2331338ee4e0471d'] }),
  Object.freeze({ weaponId: 'vault-lance', windup: [4885, '393c8771ea40257d91f827b6323d8b535dba721232f1fa78d8650acd055f6a0d'], release: [4766, 'e106ef1cb66d643965f346322261f3ce26e5dc86922dcd620b19cc0ca8b08d4e'], recovery: [4854, 'bd486e4cce356e2784c3bfc917ce8879bf5904566965f547e6b969815d86dd52'] }),
  Object.freeze({ weaponId: 'scatter-cannon', windup: [4472, 'fa4b1f5261c3ede75ee0d1f07e436e5a9d4c6e01b8e0b95c39d04a26964ae842'], release: [4399, '8b0abd8026ae616b0610fdd5d353bc51663dd0e4f0250432c94075496d65d791'], recovery: [4316, '640a41d10b1a4e2b7e2bfeec554ffa639462828d539aed37f5378ba8e5b4846d'] }),
  Object.freeze({ weaponId: 'sky-anchor', windup: [5420, '3ffea957eda37a6bbf3f4e30675ad3be3529803589b9f2d2fef0d87c05a85972'], release: [5569, 'a339914ed83b472a95a35673101a98dc8ec8c932e054c5e63a6c64dec0c37f31'], recovery: [5699, '57385556da5e0ab14ca4398c4e489461e58aa75b934376c0f8701670e26a78b4'] }),
  Object.freeze({ weaponId: 'edge-scythe', windup: [4813, '272816f80c141b8ada6721f5062e67c14c2b75fc2c7411fce5eeed5de90bac1b'], release: [4612, '89e1f3b46589feefd5dea024c5cda3b5f5dd4cbf4360f0066c795611fed4b71e'], recovery: [4658, 'fa9f111da15618254b2952a42ed608ae03ae43ef076811c2a6113d2693268e5e'] }),
  Object.freeze({ weaponId: 'rebound-hook', windup: [5108, 'c33c484baaa778c50c127a196b5a0d9c8687830cf4dc0792b0d1515ab1f13d03'], release: [5055, 'f257126ee38db805cec6dcfd8d05f87cf92a49fb1e54da14e8f2c4209737c598'], recovery: [5095, 'cd880d0c43b72f2cfbc565482bf884053bbc34fbddd775e6a4ce8411a31ac559'] }),
  Object.freeze({ weaponId: 'pulse-baton', windup: [5171, '9f278a917279357fcf586b16ebb32df80097415b370d238e360b529c610bf295'], release: [5123, '2c6cc3da62c907df533691992e3f779aa197efddcb784f398b7c06d21291fa2e'], recovery: [5031, 'e13961673dfcc449e4b1760f1eec0f17010a20317018911458635194c4101d77'] }),
  Object.freeze({ weaponId: 'siege-axe', windup: [4467, '73928b7773fb3a929e3c3671d3bb35728365eb67ab0c2372c5cd763646f109db'], release: [4403, '1f3c52eb25c927b35a25d89163e9167907e676f519579717ea050f6ca31d0923'], recovery: [4373, 'd5db3bda3f1d72a8d678b9d573f01c48969cb4f138f1c9812e09a29e277b800b'] }),
  Object.freeze({ weaponId: 'twin-fan', windup: [5087, '9a073c6821c57bcafcca159c6b9e26b9dbd31fba1a720b30c38e42b0c3d8f6ec'], release: [5169, '3fe56487b1c4747157a3781a59f9128ecbf47ff3edbf3749d423755c4332925a'], recovery: [5077, '898deb7fca41a6a2b6a760d06234fdb6334317b405ca974d4cae21264c0293ca'] }),
  Object.freeze({ weaponId: 'diving-claw', windup: [5100, '4c35f3dc269121eb6880033e41f46e16134d85c90f349849adbb1b82cdfcea57'], release: [5076, '4687c1aff3c0a6fd2646db4940c2be976162d446711d5309b8d5090312398915'], recovery: [5080, 'd01cbfb8d1b8bdce094befca7c155b174bb56949d90af770a5d5940a4b79a5c5'] }),
  Object.freeze({ weaponId: 'route-bow', windup: [5022, '24ba085d9f668c1b23a2e978be932fe92a5e966489330a62b48a02cf771d1c7e'], release: [4804, '4f6b4ed10457a41a084d44719c6613eead285ea7684a8d2a692bec8dd72a69c2'], recovery: [4800, 'b78a13eea5c49e198ba3736fd30008d9ae2c0a8c5c7229691df1f805266c825c'] }),
  Object.freeze({ weaponId: 'pivot-blade', windup: [4871, 'c22954523daf3fd54992153e84e1832be990aa81937e6938d3c5349cfe9cd0fe'], release: [4796, '8a4360284e8ec03ab38a5e6f3aa5b652a756973b4c3f7ddc2339668ea14c71cd'], recovery: [4818, '2b85202672af6ea038131da0b6b7727284f9c50c1a91345c848c43b998163eef'] }),
  Object.freeze({ weaponId: 'commitment-fist', windup: [5196, 'cdeffc1898caeb0b45d405f86bfc75d01e0638b4f4f1c39f464f48ce80dfa4c3'], release: [5245, '43fdbd51d153ef29ced7efc0accd74494c3350af0664235b1934044374903c0e'], recovery: [5429, '91302ffa79875db8d4d26bf2bec1c26c1e4add76e0dc247fba9df5404f91bd65'] }),
] as const);

const WEAPON_PHASE_AUDIO_PHASES = Object.freeze(['windup', 'release', 'recovery'] as const);

export const ARENA_V2_FORMAL_WEAPON_PHASE_AUDIO_CUE_IDS_CANDIDATE_V1 = Object.freeze(
  AUTHORED_WEAPON_PHASE_AUDIO_CANDIDATE_INPUTS.flatMap(({ weaponId }) => (
    WEAPON_PHASE_AUDIO_PHASES.map((phase) => (
      `arena.cue.audio.weapon-phase.${weaponId}.${phase}.v1` as const
    ))
  )),
);

if (AUTHORED_WEAPON_PHASE_AUDIO_CANDIDATE_INPUTS.length !== 20
  || ARENA_V2_FORMAL_WEAPON_PHASE_AUDIO_CUE_IDS_CANDIDATE_V1.length !== 60
  || new Set(ARENA_V2_FORMAL_WEAPON_PHASE_AUDIO_CUE_IDS_CANDIDATE_V1).size !== 60) {
  throw new RangeError('Arena V2武器阶段音频目录必须闭合20把×3阶段。');
}

const AUTHORED_MODE_SUPPLY_AUDIO_CANDIDATE_INPUTS = Object.freeze([
  Object.freeze({ cueId: 'mode-started', category: 'mode', source: 'shield-charge', designIntent: 'clear-round-open', byteLength: 6_440, sha256: '7e22872ed48b5342ee4a64f5a5a83af427708c5835d20014a6f02ca056247d27' }),
  Object.freeze({ cueId: 'participant-fell-credited-hit', category: 'mode', source: 'hammer-smash', designIntent: 'credited-heavy-drop', byteLength: 4_460, sha256: 'a0b3424254ff5c4277ff9d8dd76e8d6f7f4022b3ba6cc03f97bcf3362063d936' }),
  Object.freeze({ cueId: 'participant-fell-movement', category: 'mode', source: 'base-push', designIntent: 'light-route-miss', byteLength: 5_613, sha256: 'eb682dc780d934c3e1e3999cb291922b296ed48140d9a5f4f953dab0844f223e' }),
  Object.freeze({ cueId: 'participant-fell-environment', category: 'mode', source: 'hammer-smash', designIntent: 'dark-world-drop', byteLength: 4_462, sha256: 'f94f67f0202288f24f688f46e3824f2a096379e54c17a597fd7bcb7648da1af2' }),
  Object.freeze({ cueId: 'respawn-scheduled', category: 'mode', source: 'shield-charge', designIntent: 'soft-pending-pulse', byteLength: 6_770, sha256: '108c870450343c3368177ce525ad3873dd173575626e81c922b6c67f91b12070' }),
  Object.freeze({ cueId: 'respawned', category: 'mode', source: 'shield-charge', designIntent: 'bright-return-confirm', byteLength: 5_938, sha256: 'f5fe4a9e2b9c0e097d2c2060119d4021ef804a55ba2f309e8859ecfb8c3ad51a' }),
  Object.freeze({ cueId: 'safe-anchor-committed', category: 'mode', source: 'chain-pull', designIntent: 'precise-checkpoint-lock', byteLength: 4_908, sha256: 'a713de29e9a6dcbd813c7d5d6cd26e1aff3301a0be04466ddbb9fdc8c66cb4ab' }),
  Object.freeze({ cueId: 'race-finish-claimed', category: 'mode', source: 'base-push', designIntent: 'wide-finish-release', byteLength: 6_152, sha256: '9def72f1f464cf97f99dcee960631d6aa0491bc5eb8a68fbec0ce4ab7e3c1237' }),
  Object.freeze({ cueId: 'enemy-pressure', category: 'mode', source: 'hammer-smash', designIntent: 'low-threat-entry', byteLength: 4_522, sha256: '78a38ebde41e37029441d74da8c05040144711f82bcf50ed8e2154106bc1ab6c' }),
  Object.freeze({ cueId: 'enemy-left', category: 'mode', source: 'base-push', designIntent: 'pressure-release', byteLength: 5_317, sha256: 'f139eedf2b0c4db00403e93265ceea2bba4084522d08b2598966d14a040fe0cb' }),
  Object.freeze({ cueId: 'survival-first-fall', category: 'mode', source: 'hammer-smash', designIntent: 'warning-with-recovery', byteLength: 4_724, sha256: 'c1bfe7e97de02a9f3cf5b55cfa817b49cb4a3a05abe8603c130aa20dfba4883c' }),
  Object.freeze({ cueId: 'survival-terminal-fall', category: 'mode', source: 'hammer-smash', designIntent: 'terminal-heavy-stop', byteLength: 4_547, sha256: 'c063c940d3a9dac184933f752479cf20f6230bcfe4ed8fee89cb5ed521210ede' }),
  Object.freeze({ cueId: 'match-ended', category: 'mode', source: 'shield-charge', designIntent: 'neutral-round-close', byteLength: 7_049, sha256: '0724f7c034f47cd77895cb809932b0c5a7ff5e61712536ea65400cde1d871dba' }),
  Object.freeze({ cueId: 'supply-spawned', category: 'supply', source: 'shield-charge', designIntent: 'visible-world-arrival', byteLength: 6_009, sha256: '92af8a59d7939ccbf231687c5ab0b268eee93e19a9a8f19dbb9a0fed500d90a5' }),
  Object.freeze({ cueId: 'supply-picked-up', category: 'supply', source: 'chain-pull', designIntent: 'quick-ownership-confirm', byteLength: 4_754, sha256: '24b1a992f5761967e9e3bfa824d53c87f20564ba03e4c41764a810a325145cde' }),
  Object.freeze({ cueId: 'supply-replaced', category: 'supply', source: 'chain-pull', designIntent: 'two-stage-swap-confirm', byteLength: 5_259, sha256: '89e45d12532a96e3e4c5d92480544547a044de19bcb02b84f1a1d8bed6d874be' }),
  Object.freeze({ cueId: 'supply-expired', category: 'supply', source: 'base-push', designIntent: 'quiet-lifecycle-close', byteLength: 5_153, sha256: '8934825466dc626c757b747c18394e8a31cb33f0b2d272487cdd06c6aae7d843' }),
]);

export const ARENA_V2_FORMAL_MODE_SUPPLY_AUDIO_CUE_IDS_CANDIDATE_V1 = Object.freeze(
  AUTHORED_MODE_SUPPLY_AUDIO_CANDIDATE_INPUTS.map(({ cueId }) => cueId),
);

const AUTHORED_VFX_TEXTURE_CANDIDATE_INPUTS = Object.freeze([
  Object.freeze({ cueId: 'impact-confirm', designIntent: 'compact-readable-hit-star', byteLength: 7_563, sha256: '8f6913f33d44ba83ca87c6e11e88b96f511afb453c7741d563bba20a5673c299' }),
  Object.freeze({ cueId: 'impact-surface-transfer', designIntent: 'directional-ground-sweep', byteLength: 3_378, sha256: '5ed885373d4e29eae6f22721e79cd503331bb449310e5a86753d1031fc82a41f' }),
  Object.freeze({ cueId: 'ring-out', designIntent: 'outward-broken-ring', byteLength: 4_332, sha256: 'ec94e8106da26a62a75dcd371629538a5bba1aef1013faf6328900e0df7d08df' }),
  Object.freeze({ cueId: 'evaded-warning', designIntent: 'open-crescent-near-miss', byteLength: 4_152, sha256: '64eb5d1afbe6063e7e49faad6a4ae1bfd61d148e838f2caac4937faa51f0efbb' }),
  Object.freeze({ cueId: 'movement-fall-warning', designIntent: 'downward-route-loss', byteLength: 2_114, sha256: '9537122259a17d5d235ba2afbf37c41a615b2a4390ae3dde3ff25a3d36840e94' }),
]);

export const ARENA_V2_FORMAL_CORE_FEEDBACK_VFX_CUE_IDS_CANDIDATE_V1 = Object.freeze(
  AUTHORED_VFX_TEXTURE_CANDIDATE_INPUTS.map(({ cueId }) => cueId),
);

export const ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1:
readonly ArenaV2FormalVfxTextureAssetRecordCandidateV1[] = Object.freeze(
  AUTHORED_VFX_TEXTURE_CANDIDATE_INPUTS.map((input) => Object.freeze({
    vfxAssetId: `arena.vfx.texture.${input.cueId}.authored-candidate.v1`,
    cueId: input.cueId,
    maturity: 'authored-candidate-not-approved' as const,
    encodedMediaFormat: 'png' as const,
    artifactPath: `public/assets/arena/vfx/authored-candidates/${input.cueId}.png`,
    runtimeSourceKey: `./assets/arena/vfx/authored-candidates/${input.cueId}.png`,
    decodedTextureFormat: 'rgba8' as const,
    width: 128 as const,
    height: 128 as const,
    byteLength: input.byteLength,
    sha256: input.sha256,
    provenance: PROJECT_AUTHORED_VFX_TEXTURE_PROVENANCE,
  })),
);

const VFX_ASSET_IDS = new Set<string>();
const VFX_CUE_IDS = new Set<string>();
for (const record of ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1) {
  if (
    VFX_ASSET_IDS.has(record.vfxAssetId)
    || VFX_CUE_IDS.has(record.cueId)
    || record.encodedMediaFormat !== 'png'
    || !record.artifactPath.endsWith('.png')
  ) {
    throw new RangeError(`Arena V2 VFX纹理身份重复：${record.vfxAssetId}/${record.cueId}。`);
  }
  VFX_ASSET_IDS.add(record.vfxAssetId);
  VFX_CUE_IDS.add(record.cueId);
}

export const ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1 = Object.freeze(
  [
    ...AUDIO_INPUTS.map((input) => Object.freeze({
      audioAssetId: input.audioAssetId,
      weaponDefinitionId: formalWeaponDefinitionId(input.weaponId),
      actionSemantic: input.actionSemantic,
      cueId: null,
      maturity: 'verified-intake-only' as const,
      encodedMediaFormat: 'ogg' as const,
      artifactPath: `public/assets/arena/audio/kenney-impact-sounds/${input.filename}`,
      runtimeSourceKey: `./assets/arena/audio/kenney-impact-sounds/${input.filename}`,
      byteLength: input.byteLength,
      sha256: input.sha256,
      provenance: KENNEY_IMPACT_PROVENANCE,
    })),
    ...AUTHORED_WEAPON_AUDIO_CANDIDATE_INPUTS.map((input) => Object.freeze({
      audioAssetId: `arena.audio.impact.weapon.${input.weaponId}.authored-candidate.v1`,
      weaponDefinitionId: formalWeaponDefinitionId(input.weaponId),
      actionSemantic: input.weaponId,
      cueId: null,
      maturity: 'authored-candidate-not-approved' as const,
      encodedMediaFormat: 'ogg' as const,
      artifactPath:
        `public/assets/arena/audio/authored-weapon-candidates/${input.weaponId}.ogg`,
      runtimeSourceKey: `./assets/arena/audio/authored-weapon-candidates/${input.weaponId}.ogg`,
      byteLength: input.byteLength,
      sha256: input.sha256,
      provenance: PROJECT_AUTHORED_WEAPON_AUDIO_PROVENANCE,
    })),
    ...AUTHORED_WEAPON_PHASE_AUDIO_CANDIDATE_INPUTS.flatMap((input) => (
      WEAPON_PHASE_AUDIO_PHASES.map((phase) => {
        const candidate = input[phase];
        const byteLength = candidate[0];
        const sha256 = candidate[1];
        if (
          candidate.length !== 2
          || typeof byteLength !== 'number'
          || !Number.isSafeInteger(byteLength)
          || byteLength <= 0
          || typeof sha256 !== 'string'
        ) {
          throw new RangeError(
            `Arena V2武器阶段音频${input.weaponId}.${phase}元数据无效。`,
          );
        }
        return Object.freeze({
          audioAssetId: `arena.audio.weapon.${input.weaponId}.${phase}.authored.v1`,
          weaponDefinitionId: formalWeaponDefinitionId(input.weaponId),
          actionSemantic: null,
          cueId: `arena.cue.audio.weapon-phase.${input.weaponId}.${phase}.v1` as const,
          maturity: 'authored-candidate-not-approved' as const,
          encodedMediaFormat: 'ogg' as const,
          artifactPath:
            `public/assets/arena/audio/authored-weapon-phase-candidates/${input.weaponId}-${phase}.ogg`,
          runtimeSourceKey:
            `./assets/arena/audio/authored-weapon-phase-candidates/${input.weaponId}-${phase}.ogg`,
          byteLength,
          sha256,
          provenance: PROJECT_AUTHORED_WEAPON_PHASE_AUDIO_PROVENANCE,
        });
      })
    )),
    ...AUTHORED_MODE_SUPPLY_AUDIO_CANDIDATE_INPUTS.map((input) => Object.freeze({
      audioAssetId: `arena.audio.feedback.${input.category}.${input.cueId}.authored-candidate.v1`,
      weaponDefinitionId: null,
      actionSemantic: null,
      cueId: input.cueId,
      maturity: 'authored-candidate-not-approved' as const,
      encodedMediaFormat: 'ogg' as const,
      artifactPath:
        `public/assets/arena/audio/authored-mode-supply-candidates/${input.cueId}.ogg`,
      runtimeSourceKey:
        `./assets/arena/audio/authored-mode-supply-candidates/${input.cueId}.ogg`,
      byteLength: input.byteLength,
      sha256: input.sha256,
      provenance: PROJECT_AUTHORED_MODE_SUPPLY_AUDIO_PROVENANCE,
    })),
  ] satisfies readonly ArenaV2FormalAudioAssetRecordCandidateV1[],
);

const AUDIO_ASSET_IDS = new Set<string>();
const AUDIO_SEMANTIC_KEYS = new Set<string>();
const WEAPON_IMPACT_AUDIO_DEFINITION_IDS = new Set<string>();
const WEAPON_PHASE_AUDIO_DEFINITION_COUNTS = new Map<string, number>();
for (const record of ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1) {
  if (record.encodedMediaFormat !== 'ogg' || !record.artifactPath.endsWith('.ogg')) {
    throw new RangeError(`Arena V2音频${record.audioAssetId}的编码媒体格式与路径不闭合。`);
  }
  if ((record.actionSemantic === null) === (record.cueId === null)) {
    throw new RangeError(
      `Arena V2音频${record.audioAssetId}必须且只能声明actionSemantic或cueId之一。`,
    );
  }
  if (AUDIO_ASSET_IDS.has(record.audioAssetId)) {
    throw new RangeError(`Arena V2音频资产ID重复：${record.audioAssetId}。`);
  }
  AUDIO_ASSET_IDS.add(record.audioAssetId);
  const semanticKey = record.actionSemantic === null
    ? `cue:${record.cueId}`
    : `action:${record.actionSemantic}`;
  if (AUDIO_SEMANTIC_KEYS.has(semanticKey)) {
    throw new RangeError(`Arena V2音频语义重复：${semanticKey}。`);
  }
  AUDIO_SEMANTIC_KEYS.add(semanticKey);
  if (record.actionSemantic !== null && record.actionSemantic !== 'base-push') {
    if (record.weaponDefinitionId === null
      || WEAPON_IMPACT_AUDIO_DEFINITION_IDS.has(record.weaponDefinitionId)) {
      throw new RangeError(`Arena V2武器命中音频Definition身份重复或缺失：${record.audioAssetId}。`);
    }
    WEAPON_IMPACT_AUDIO_DEFINITION_IDS.add(record.weaponDefinitionId);
  } else if (record.cueId?.startsWith('arena.cue.audio.weapon-phase.') === true) {
    if (record.weaponDefinitionId === null) {
      throw new RangeError(`Arena V2武器阶段音频缺少Definition身份：${record.audioAssetId}。`);
    }
    WEAPON_PHASE_AUDIO_DEFINITION_COUNTS.set(
      record.weaponDefinitionId,
      (WEAPON_PHASE_AUDIO_DEFINITION_COUNTS.get(record.weaponDefinitionId) ?? 0) + 1,
    );
  } else if (record.weaponDefinitionId !== null) {
    throw new RangeError(`Arena V2非武器音频不得声明Definition身份：${record.audioAssetId}。`);
  }
}
if (WEAPON_IMPACT_AUDIO_DEFINITION_IDS.size !== 20
  || WEAPON_PHASE_AUDIO_DEFINITION_COUNTS.size !== 20
  || [...WEAPON_PHASE_AUDIO_DEFINITION_COUNTS.values()].some((count) => count !== 3)) {
  throw new RangeError('Arena V2正式音频必须闭合20份命中与20把×3阶段Definition身份。');
}

const VISUAL_ASSET_REGISTRY = new PresentationAssetRegistry(
  ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1.map(
    ({ runtimeDefinition }) => runtimeDefinition,
  ),
);

const PLAYABLE_CHARACTER_PRESENTATION_INPUTS = Object.freeze([
  Object.freeze({
    handlingKind: 'balanced',
    characterDefinitionId: 'arena-v2-kz-verification-character.candidate.v1',
    materialProfileId: 'arena.material.kaykit-runner-coral.v1',
  }),
  Object.freeze({
    handlingKind: 'sprint',
    characterDefinitionId: 'arena-v2-character-sprint.candidate.v1',
    materialProfileId: 'arena.material.kaykit-runner-cyan.v1',
  }),
  Object.freeze({
    handlingKind: 'air-control',
    characterDefinitionId: 'arena-v2-character-air-control.candidate.v1',
    materialProfileId: 'arena.material.kaykit-runner-violet.v1',
  }),
  Object.freeze({
    handlingKind: 'high-jump',
    characterDefinitionId: 'arena-v2-character-high-jump.candidate.v1',
    materialProfileId: 'arena.material.kaykit-runner-lime.v1',
  }),
  Object.freeze({
    handlingKind: 'quick-start',
    characterDefinitionId: 'arena-v2-character-quick-start.candidate.v1',
    materialProfileId: 'arena.material.kaykit-runner-amber.v1',
  }),
  Object.freeze({
    handlingKind: 'forgiving',
    characterDefinitionId: 'arena-v2-character-forgiving.candidate.v1',
    materialProfileId: 'arena.material.kaykit-runner-blue.v1',
  }),
]);

const ROGUE_VALUE_MESH_NAMES = Object.freeze([
  'Rogue_ArmLeft',
  'Rogue_ArmRight',
  'Rogue_Body',
  'Rogue_Head',
  'Rogue_LegLeft',
  'Rogue_LegRight',
  'Rogue_Cape',
] as const);

function characterValuePattern(
  id: string,
  multipliers: readonly number[],
): ArenaV2FormalCharacterMaterialProfileCandidateV1['valuePattern'] {
  if (multipliers.length !== ROGUE_VALUE_MESH_NAMES.length) {
    throw new RangeError(`Arena V2角色明暗分区${id}没有覆盖共享Rogue模型全部部件。`);
  }
  return Object.freeze({
    id,
    meshValueMultipliers: Object.freeze(ROGUE_VALUE_MESH_NAMES.map((meshName, index) => {
      const multiplier = multipliers[index];
      if (multiplier === undefined || !Number.isFinite(multiplier)
        || multiplier < 0.5 || multiplier > 1) {
        throw new RangeError(`Arena V2角色明暗分区${id}.${meshName}必须位于0.5..1。`);
      }
      return Object.freeze({ meshName, multiplier });
    })),
    colorIsNeverSoleSignal: true as const,
    addsGeometry: false as const,
    addsDrawCalls: false as const,
    evidenceStatus: 'specified-not-captured' as const,
  });
}

const ENEMY_VALUE_PATTERN = Object.freeze({
  id: 'arena.character-value-pattern.enemy-uniform.v1',
  meshValueMultipliers: Object.freeze([]),
  colorIsNeverSoleSignal: true as const,
  addsGeometry: false as const,
  addsDrawCalls: false as const,
  evidenceStatus: 'specified-not-captured' as const,
});

export const ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1 = Object.freeze([
  Object.freeze({ id: 'arena.material.kaykit-runner-coral.v1', maturity: 'verified-intake-only' as const, tintHex: 0xef_6a_64, emissiveHex: 0x28_0d_0b, emissiveIntensity: 0.04, valuePattern: characterValuePattern('arena.character-value-pattern.center-core.v1', [0.68, 0.68, 1, 0.82, 0.68, 0.68, 0.54]) }),
  Object.freeze({ id: 'arena.material.kaykit-runner-cyan.v1', maturity: 'verified-intake-only' as const, tintHex: 0x35_c5_d8, emissiveHex: 0x07_25_2a, emissiveIntensity: 0.04, valuePattern: characterValuePattern('arena.character-value-pattern.fast-legs.v1', [0.78, 0.78, 0.62, 0.74, 1, 1, 0.52]) }),
  Object.freeze({ id: 'arena.material.kaykit-runner-violet.v1', maturity: 'verified-intake-only' as const, tintHex: 0x9b_78_e8, emissiveHex: 0x1e_12_35, emissiveIntensity: 0.04, valuePattern: characterValuePattern('arena.character-value-pattern.air-wings.v1', [1, 1, 0.66, 0.78, 0.56, 0.56, 0.84]) }),
  Object.freeze({ id: 'arena.material.kaykit-runner-lime.v1', maturity: 'verified-intake-only' as const, tintHex: 0xa2_d8_55, emissiveHex: 0x1b_2b_09, emissiveIntensity: 0.04, valuePattern: characterValuePattern('arena.character-value-pattern.jump-springs.v1', [0.58, 0.58, 0.68, 0.88, 1, 1, 0.6]) }),
  Object.freeze({ id: 'arena.material.kaykit-runner-amber.v1', maturity: 'verified-intake-only' as const, tintHex: 0xf2_b8_43, emissiveHex: 0x31_20_06, emissiveIntensity: 0.04, valuePattern: characterValuePattern('arena.character-value-pattern.start-diagonal.v1', [0.52, 1, 0.72, 0.82, 1, 0.52, 0.62]) }),
  Object.freeze({ id: 'arena.material.kaykit-runner-blue.v1', maturity: 'verified-intake-only' as const, tintHex: 0x4d_8f_e8, emissiveHex: 0x09_1b_35, emissiveIntensity: 0.04, valuePattern: characterValuePattern('arena.character-value-pattern.stable-bracket.v1', [0.92, 0.92, 1, 0.72, 0.62, 0.62, 0.52]) }),
  Object.freeze({ id: 'arena.material.kaykit-skeleton-clockwork.v1', maturity: 'verified-intake-only' as const, tintHex: 0xd8_dd_e7, emissiveHex: 0x12_18_20, emissiveIntensity: 0.02, valuePattern: ENEMY_VALUE_PATTERN }),
] satisfies readonly ArenaV2FormalCharacterMaterialProfileCandidateV1[]);

const PLAYABLE_VALUE_PATTERNS = ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1
  .slice(0, PLAYABLE_CHARACTER_PRESENTATION_INPUTS.length)
  .map(({ valuePattern }) => valuePattern);
if (
  PLAYABLE_VALUE_PATTERNS.length !== 6
  || new Set(PLAYABLE_VALUE_PATTERNS.map(({ id }) => id)).size !== 6
  || new Set(PLAYABLE_VALUE_PATTERNS.map(({ meshValueMultipliers }) => (
    JSON.stringify(meshValueMultipliers.map(({ multiplier }) => multiplier))
  ))).size !== 6
  || PLAYABLE_VALUE_PATTERNS.some(({ meshValueMultipliers }) => (
    meshValueMultipliers.length !== ROGUE_VALUE_MESH_NAMES.length
    || meshValueMultipliers.some(({ meshName }, index) => meshName !== ROGUE_VALUE_MESH_NAMES[index])
  ))
) throw new RangeError('Arena V2六角色必须拥有六种不同且完整的共享模型明暗分区。');

export const ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1 = Object.freeze([
  ...PLAYABLE_CHARACTER_PRESENTATION_INPUTS.map((input) => Object.freeze({
    role: 'playable-character-model' as const,
    maturity: 'verified-intake-only' as const,
    presentation: formalCharacterPresentation({
      id: `arena-v2.character-presentation.${input.handlingKind}.kaykit-rogue.candidate.v1`,
      characterDefinitionId: input.characterDefinitionId,
      modelAssetId: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
      rigProfileId: 'arena.rig.kaykit-humanoid.v1',
      materialProfileId: input.materialProfileId,
      tags: [
        'formal-intake',
        'arena-v2',
        input.handlingKind,
        'kaykit',
        'playable-candidate',
        'shared-rig-distinct-material-identity',
      ],
    }),
  })),
  Object.freeze({
    role: 'survival-enemy-model' as const,
    maturity: 'verified-intake-only' as const,
    presentation: formalCharacterPresentation({
      id: 'arena-v2.character-presentation.survival-enemy.kaykit-skeleton.candidate.v1',
      characterDefinitionId: 'arena-v2.character.survival-enemy-family.candidate.v1',
      modelAssetId: 'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
      rigProfileId: 'arena.rig.kaykit-skeleton.v1',
      materialProfileId: 'arena.material.kaykit-skeleton-clockwork.v1',
      tags: ['formal-intake', 'arena-v2', 'enemy-family', 'kaykit', 'skeleton'],
    }),
  }),
] satisfies readonly ArenaV2FormalCharacterPresentationRecordCandidateV1[]);

const CHARACTER_PRESENTATION_REGISTRY = new CharacterPresentationRegistry({
  assetRegistry: VISUAL_ASSET_REGISTRY,
  definitions: ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1.map(
    ({ presentation }) => presentation,
  ),
});

const MATERIAL_PROFILE_IDS: ReadonlySet<string> = new Set(
  ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1.map(({ id }) => id),
);
for (const { presentation } of ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1) {
  if (!MATERIAL_PROFILE_IDS.has(presentation.materialProfileId)) {
    throw new RangeError(
      `Arena V2正式角色${presentation.id}缺少材质Profile ${presentation.materialProfileId}。`,
    );
  }
}

export const ARENA_V2_FORMAL_EQUIPMENT_ASSET_BINDINGS_CANDIDATE_V1 = Object.freeze([
  Object.freeze({
    equipmentDefinitionId: 'arena-v2.weapon.charge-shield.candidate.v1',
    attachmentAssetId: 'arena.asset.attachment.shield.kaykit-round.v1',
    maturity: 'verified-intake-only' as const,
  }),
  ...WEAPON_ATTACHMENT_CANDIDATE_INPUTS.map(({ weaponId }) => Object.freeze({
    equipmentDefinitionId: `arena-v2.weapon.${weaponId}.candidate.v1`,
    attachmentAssetId: weaponAttachmentAssetId(weaponId),
    maturity: 'verified-intake-only' as const,
  })),
]);

export const ARENA_V2_FORMAL_MAP_ASSET_BINDINGS_CANDIDATE_V1:
readonly ArenaV2FormalMapAssetBindingCandidateV1[] = Object.freeze(
  AUTHORED_MAP_CANDIDATE_INPUTS.map((input) => Object.freeze({
    mapDefinitionId: input.mapDefinitionId,
    mapVisualAssetId: `arena.asset.map.${input.slug}.authored-candidate.v1`,
    maturity: 'authored-candidate-not-approved' as const,
  })),
);

const COVERAGE = Object.freeze({
  playableCharacterSilhouettes: Object.freeze({ implemented: 1, required: 1 }),
  playableCharacterPresentationIdentities: Object.freeze({ implemented: 6, required: 6 }),
  survivalEnemySilhouettes: Object.freeze({ implemented: 1, required: 1 }),
  formalMaterialTextureIdentities: Object.freeze({ implemented: 3, required: 3 }),
  formalMaterialTextureBindings: Object.freeze({ implemented: 3, required: 3 }),
  weaponAttachmentIdentities: Object.freeze({ implemented: 20, required: 20 }),
  mapVisualIdentities: Object.freeze({ implemented: 2, required: 2 }),
  coreFeedbackVisualCues: Object.freeze({ implemented: 5, required: 5 }),
  approvedCoreFeedbackVisualCues: Object.freeze({ implemented: 0, required: 5 }),
  weaponImpactAudioIdentities: Object.freeze({ implemented: 20, required: 20 }),
  approvedWeaponImpactAudioIdentities: Object.freeze({ implemented: 0, required: 20 }),
  additionalUnarmedImpactAudioIdentities: Object.freeze({ implemented: 1, required: 1 }),
  weaponPhaseAudioIdentities: Object.freeze({ implemented: 60, required: 60 }),
  approvedWeaponPhaseAudioIdentities: Object.freeze({ implemented: 0, required: 60 }),
  modeFeedbackAudioIdentities: Object.freeze({ implemented: 13, required: 13 }),
  supplyFeedbackAudioIdentities: Object.freeze({ implemented: 4, required: 4 }),
  approvedModeAndSupplyAudioIdentities: Object.freeze({ implemented: 0, required: 17 }),
});

const AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  assetMaturity: 'mixed-verified-intake-and-unapproved-authored-candidates' as const,
  formalVisualAssetsReady: false as const,
  formalAudioAssetsReady: false as const,
  programmaticNormalPathAllowed: false as const,
  animatedCharacterCloneStrategy: 'SkeletonUtils.clone' as const,
  requiredCharacterAnimationCount: 18 as const,
  visualRecords: ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1,
  materialTextureRecords: ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1,
  materialTextureBindings: ARENA_V2_FORMAL_MATERIAL_TEXTURE_BINDINGS_CANDIDATE_V1,
  characterMaterialProfiles: ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1,
  characterPresentationRecords: ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1,
  equipmentAssetBindings: ARENA_V2_FORMAL_EQUIPMENT_ASSET_BINDINGS_CANDIDATE_V1,
  mapAssetBindings: ARENA_V2_FORMAL_MAP_ASSET_BINDINGS_CANDIDATE_V1,
  audioRecords: ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1,
  vfxTextureRecords: ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1,
  coverage: COVERAGE,
});

const HASH_AUTHORITY = Object.freeze({
  ...AUTHORITY,
  characterPresentationRecords: Object.freeze(
    AUTHORITY.characterPresentationRecords.map(({ role, maturity, presentation }) => Object.freeze({
      role,
      maturity,
      presentation: presentation.toJSON(),
    })),
  ),
});

export const ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  visualAssetRegistry: VISUAL_ASSET_REGISTRY,
  characterPresentationRegistry: CHARACTER_PRESENTATION_REGISTRY,
  contentHash: createDeterministicDataHash(
    HASH_AUTHORITY,
    'Arena V2 Formal Presentation Asset Catalog Candidate V1',
  ),
  validationStatus: 'not-run' as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
});

export const ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1_IDENTITY =
  Object.freeze({
    catalogId: 'arena-v2-formal-presentation-assets.candidate.v1' as const,
    catalogRevision: 'candidate-v1' as const,
    catalogContentHash:
      ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.contentHash,
    expectedAssetCount:
      ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1.length
      + ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length
      + ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.length
      + ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    validationStatus: 'not-run' as const,
  });

if (
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1_IDENTITY.expectedAssetCount
  !== 130
) {
  throw new RangeError('Arena V2正式表现目录身份必须精确绑定当前130项资产。');
}
