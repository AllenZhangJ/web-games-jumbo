import {
  assertNonEmptyString,
  cloneFrozenData,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_ANIMATION_ACTION_CATEGORY,
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
  type ArenaAnimationSemantic,
  type CharacterAnimationBinding,
  type CharacterPresentationDefinitionJson,
} from '@number-strategy-jump/arena-presentation-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';

export interface ArenaPresentationVector3Input {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ArenaPresentationMapDefinitionInput {
  readonly id: string;
  readonly arena: {
    readonly killY: number;
    readonly surfaces: readonly {
      readonly id: string;
      readonly center: ArenaPresentationVector3Input;
      readonly halfExtents: ArenaPresentationVector3Input;
    }[];
  };
}

export interface ArenaPresentationActionDefinitionInput {
  readonly id: string;
  readonly timing: unknown;
}

export interface ArenaPresentationEquipmentDefinitionInput {
  readonly id: string;
  readonly presentationSemantic: string;
}

export interface ArenaV1CombatActionIds {
  readonly BASE_PUSH: string;
  readonly BASE_AIR_STRIKE: string;
  readonly HAMMER_SMASH: string;
  readonly HAMMER_AIR_SMASH: string;
  readonly CHAIN_PULL: string;
  readonly CHAIN_AIR_LASH: string;
  readonly SHIELD_CHARGE: string;
  readonly SHIELD_AIR_DROP: string;
}

export interface ArenaV1MovementActionIds {
  readonly EXPLICIT_GROUND_JUMP: string;
  readonly EXPLICIT_AIR_JUMP: string;
  readonly EXPLICIT_CROUCH_BEGIN: string;
  readonly EXPLICIT_CROUCH_RELEASE: string;
  readonly CONTEXT_GROUND_JUMP: string;
  readonly CONTEXT_AIR_JUMP: string;
  readonly CONTEXT_CROUCH_BEGIN: string;
  readonly CONTEXT_CROUCH_RELEASE: string;
  readonly DOWN_SMASH: string;
}

export interface ArenaActionPresentation {
  readonly semantic: string;
  readonly label: string;
  readonly animationCategory: string;
  readonly timing?: DeepReadonly<unknown>;
  readonly clipName?: string;
  readonly overlayMask?: string;
  readonly visualPhases?: Readonly<{
    anticipationEnd: number;
    followThroughEnd: number;
  }>;
  readonly weaponScale?: Readonly<{
    idle: number;
    windupPeak: number;
    activePeak: number;
    followThroughPeak: number;
  }>;
}

export interface ArenaV1PresentationContent {
  readonly schemaVersion: number;
  readonly map: Readonly<{
    id: string;
    killY: number;
    surfaces: readonly Readonly<{
      id: string;
      center: Readonly<ArenaPresentationVector3Input>;
      halfExtents: Readonly<ArenaPresentationVector3Input>;
    }>[];
  }>;
  readonly characters: Readonly<Record<string, Readonly<{
    presentationId: string;
    definitionHash: string;
    modelAssetId: string;
  }>>>;
  readonly actions: Readonly<Record<string, ArenaActionPresentation>>;
  readonly equipment: Readonly<Record<string, Readonly<{
    semantic: string;
    geometry: string;
  }>>>;
  readonly assetRegistry: PresentationAssetRegistry;
  readonly characterPresentationRegistry: CharacterPresentationRegistry;
}

export interface CreateArenaV1PresentationContentOptions {
  readonly mapDefinition: ArenaPresentationMapDefinitionInput;
  readonly actionDefinitions: readonly ArenaPresentationActionDefinitionInput[];
  readonly equipmentDefinitions: readonly ArenaPresentationEquipmentDefinitionInput[];
  readonly combatActionIds: ArenaV1CombatActionIds;
  readonly movementActionIds: ArenaV1MovementActionIds;
}

interface CombatPresentationOptions {
  readonly semantic: string;
  readonly label: string;
  readonly animationCategory: string;
  readonly actionId: string;
  readonly clipName: string;
  readonly phases: Readonly<{ anticipationEnd: number; followThroughEnd: number }>;
  readonly scale: Readonly<{
    windupPeak: number;
    activePeak: number;
    followThroughPeak: number;
  }>;
}

type ArenaV1CombatPresentationRole =
  | 'baseAirStrike'
  | 'basePush'
  | 'chainAirLash'
  | 'chainPull'
  | 'hammerAirSmash'
  | 'hammerSmash'
  | 'shieldAirDrop'
  | 'shieldCharge';

type CombatPresentationProfile = Omit<CombatPresentationOptions, 'actionId'>;

export const ARENA_V1_COMBAT_PRESENTATION_CONFIG = cloneFrozenData({
  basePush: {
    semantic: 'push', label: '推击', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.ATTACK,
    clipName: 'Unarmed_Melee_Attack_Punch_A',
    phases: { anticipationEnd: 0.72, followThroughEnd: 0.38 },
    scale: { windupPeak: 1, activePeak: 1, followThroughPeak: 1 },
  },
  hammerSmash: {
    semantic: 'heavy-smash', label: '重锤', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
    clipName: '2H_Melee_Attack_Chop',
    phases: { anticipationEnd: 0.8, followThroughEnd: 0.46 },
    scale: { windupPeak: 1.08, activePeak: 1.28, followThroughPeak: 1.15 },
  },
  chainPull: {
    semantic: 'chain-pull', label: '锁链', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
    clipName: 'Throw',
    phases: { anticipationEnd: 0.68, followThroughEnd: 0.52 },
    scale: { windupPeak: 1.06, activePeak: 1.2, followThroughPeak: 1.12 },
  },
  shieldCharge: {
    semantic: 'shield-charge', label: '冲撞', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.DEFEND,
    clipName: 'Block_Attack',
    phases: { anticipationEnd: 0.58, followThroughEnd: 0.62 },
    scale: { windupPeak: 1.05, activePeak: 1.18, followThroughPeak: 1.1 },
  },
  baseAirStrike: {
    semantic: 'air-strike', label: '空中踢击', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.ATTACK,
    clipName: 'Unarmed_Melee_Attack_Punch_A',
    phases: { anticipationEnd: 0.62, followThroughEnd: 0.48 },
    scale: { windupPeak: 1, activePeak: 1, followThroughPeak: 1 },
  },
  hammerAirSmash: {
    semantic: 'air-heavy-smash', label: '坠空重锤', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
    clipName: '2H_Melee_Attack_Chop',
    phases: { anticipationEnd: 0.78, followThroughEnd: 0.56 },
    scale: { windupPeak: 1.12, activePeak: 1.38, followThroughPeak: 1.2 },
  },
  chainAirLash: {
    semantic: 'air-chain-lash', label: '坠空锁链', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
    clipName: 'Throw',
    phases: { anticipationEnd: 0.64, followThroughEnd: 0.58 },
    scale: { windupPeak: 1.1, activePeak: 1.3, followThroughPeak: 1.16 },
  },
  shieldAirDrop: {
    semantic: 'air-shield-drop', label: '坠空盾击', animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.DEFEND,
    clipName: 'Block_Attack',
    phases: { anticipationEnd: 0.52, followThroughEnd: 0.68 },
    scale: { windupPeak: 1.08, activePeak: 1.25, followThroughPeak: 1.14 },
  },
} satisfies Record<ArenaV1CombatPresentationRole, CombatPresentationProfile>);

export const ARENA_V1_CHARACTER_PRESENTATION_TUNING = Object.freeze({
  directionHysteresisDegrees: 6,
  walkSpeedThreshold: 0.15,
  runSpeedThreshold: 4.5,
  knockbackSpeedThreshold: 7,
} as const);

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value;
}

function vector3(value: ArenaPresentationVector3Input, name: string): Readonly<ArenaPresentationVector3Input> {
  return Object.freeze({
    x: finite(value.x, `${name}.x`),
    y: finite(value.y, `${name}.y`),
    z: finite(value.z, `${name}.z`),
  });
}

function actionDefinitionMap(
  definitions: readonly ArenaPresentationActionDefinitionInput[],
): ReadonlyMap<string, ArenaPresentationActionDefinitionInput> {
  if (!Array.isArray(definitions)) throw new TypeError('actionDefinitions 必须是数组。');
  const result = new Map<string, ArenaPresentationActionDefinitionInput>();
  for (const [index, definition] of definitions.entries()) {
    const id = assertNonEmptyString(definition?.id, `actionDefinitions[${index}].id`);
    if (result.has(id)) throw new RangeError(`actionDefinitions 包含重复 id ${id}。`);
    result.set(id, definition);
  }
  return result;
}

function combatPresentation(
  definitions: ReadonlyMap<string, ArenaPresentationActionDefinitionInput>,
  options: CombatPresentationOptions,
): ArenaActionPresentation {
  const definition = definitions.get(options.actionId);
  if (!definition) throw new RangeError(`缺少权威 ActionDefinition ${options.actionId}。`);
  return Object.freeze({
    semantic: options.semantic,
    label: options.label,
    animationCategory: options.animationCategory,
    timing: cloneFrozenData(definition.timing, `${options.actionId}.timing`),
    clipName: options.clipName,
    overlayMask: 'upper-body',
    visualPhases: Object.freeze({ ...options.phases }),
    weaponScale: Object.freeze({ idle: 1, ...options.scale }),
  });
}

function configuredCombatPresentation(
  definitions: ReadonlyMap<string, ArenaPresentationActionDefinitionInput>,
  actionId: string,
  role: ArenaV1CombatPresentationRole,
): ArenaActionPresentation {
  return combatPresentation(definitions, {
    actionId,
    ...ARENA_V1_COMBAT_PRESENTATION_CONFIG[role],
  });
}

function movementPresentation(
  semantic: string,
  label: string,
): ArenaActionPresentation {
  return Object.freeze({
    semantic,
    label,
    animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
  });
}

function createActions(
  definitions: ReadonlyMap<string, ArenaPresentationActionDefinitionInput>,
  combat: ArenaV1CombatActionIds,
  movement: ArenaV1MovementActionIds,
): Readonly<Record<string, ArenaActionPresentation>> {
  const values: Record<string, ArenaActionPresentation> = {
    [combat.BASE_PUSH]: configuredCombatPresentation(definitions, combat.BASE_PUSH, 'basePush'),
    [combat.HAMMER_SMASH]: configuredCombatPresentation(definitions, combat.HAMMER_SMASH, 'hammerSmash'),
    [combat.CHAIN_PULL]: configuredCombatPresentation(definitions, combat.CHAIN_PULL, 'chainPull'),
    [combat.SHIELD_CHARGE]: configuredCombatPresentation(definitions, combat.SHIELD_CHARGE, 'shieldCharge'),
    [combat.BASE_AIR_STRIKE]: configuredCombatPresentation(definitions, combat.BASE_AIR_STRIKE, 'baseAirStrike'),
    [combat.HAMMER_AIR_SMASH]: configuredCombatPresentation(definitions, combat.HAMMER_AIR_SMASH, 'hammerAirSmash'),
    [combat.CHAIN_AIR_LASH]: configuredCombatPresentation(definitions, combat.CHAIN_AIR_LASH, 'chainAirLash'),
    [combat.SHIELD_AIR_DROP]: configuredCombatPresentation(definitions, combat.SHIELD_AIR_DROP, 'shieldAirDrop'),
    [movement.EXPLICIT_GROUND_JUMP]: movementPresentation('jump', '跳跃'),
    [movement.EXPLICIT_AIR_JUMP]: movementPresentation('air-jump', '二段跳'),
    [movement.EXPLICIT_CROUCH_BEGIN]: movementPresentation('crouch-charge', '蓄力'),
    [movement.EXPLICIT_CROUCH_RELEASE]: movementPresentation('crouch-jump', '蹲跳'),
    [movement.CONTEXT_GROUND_JUMP]: movementPresentation('jump', '跳跃'),
    [movement.CONTEXT_AIR_JUMP]: movementPresentation('air-jump', '二段跳'),
    [movement.CONTEXT_CROUCH_BEGIN]: movementPresentation('crouch-charge', '蓄力'),
    [movement.CONTEXT_CROUCH_RELEASE]: movementPresentation('crouch-jump', '蹲跳'),
    [movement.DOWN_SMASH]: movementPresentation('down-smash', '下砸'),
  };
  if (Object.keys(values).length !== 17) {
    throw new RangeError('Arena V1 action presentation id 必须互不重复。');
  }
  return Object.freeze(values);
}

function proceduralAnimationMap(): Readonly<Record<ArenaAnimationSemantic, CharacterAnimationBinding>> {
  const fallback: Readonly<Record<ArenaAnimationSemantic, readonly ArenaAnimationSemantic[]>> = {
    'attack-active': ['attack-windup', 'idle'], 'attack-windup': ['idle'],
    'crouch-charge': ['idle'], 'crouch-jump': ['jump', 'idle'], defend: ['idle'],
    'double-jump': ['jump', 'idle'], 'down-smash': ['jump', 'idle'], draw: ['idle'],
    eliminated: ['idle'], equipment: ['attack-active', 'idle'], hitstun: ['idle'], idle: [],
    jump: ['idle'], knockback: ['hitstun', 'idle'], land: ['idle'], lose: ['idle'],
    run: ['walk', 'idle'], walk: ['idle'], win: ['idle'],
  };
  const looping = new Set<ArenaAnimationSemantic>(['idle', 'walk', 'run', 'crouch-charge', 'defend']);
  return Object.freeze(Object.fromEntries(ARENA_ANIMATION_SEMANTIC_IDS.map((semantic) => [semantic, Object.freeze({
    sourceKind: ARENA_ANIMATION_SOURCE_KIND.PROCEDURAL,
    sourceKey: semantic,
    loop: looping.has(semantic),
    fallbackSemantics: Object.freeze([...fallback[semantic]]),
  })])) as Record<ArenaAnimationSemantic, CharacterAnimationBinding>);
}

function attachmentSlots(prefix: string): CharacterPresentationDefinitionJson['attachmentSlots'] {
  return Object.freeze(Object.values(CHARACTER_PRESENTATION_SLOT_ID).map((id) => Object.freeze({
    id,
    nodeName: `${prefix}:${id}`,
    allowedAssetIds: Object.freeze([]),
    defaultAssetId: null,
  })));
}

function characterPresentation(options: Readonly<{
  id: string;
  characterDefinitionId: string;
  modelAssetId: string;
  rigProfileId: string;
  tags: readonly string[];
}>): CharacterPresentationDefinitionJson {
  return {
    schemaVersion: CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
    id: options.id,
    characterDefinitionId: options.characterDefinitionId,
    defaultForCharacter: true,
    contentVersion: 1,
    modelAssetId: options.modelAssetId,
    rigProfileId: options.rigProfileId,
    materialProfileId: 'arena.material.low-poly-toy.v1',
    outlineProfileId: 'arena.outline.hand-drawn.v1',
    direction: {
      strategy: CHARACTER_PRESENTATION_DIRECTION_STRATEGY.SIX_SECTOR_CAMERA_RELATIVE,
      defaultFrontAxis: CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_Z,
      hysteresisDegrees: ARENA_V1_CHARACTER_PRESENTATION_TUNING.directionHysteresisDegrees,
    },
    locomotion: {
      walkSpeedThreshold: ARENA_V1_CHARACTER_PRESENTATION_TUNING.walkSpeedThreshold,
      runSpeedThreshold: ARENA_V1_CHARACTER_PRESENTATION_TUNING.runSpeedThreshold,
      knockbackSpeedThreshold: ARENA_V1_CHARACTER_PRESENTATION_TUNING.knockbackSpeedThreshold,
    },
    animationMap: proceduralAnimationMap(),
    attachmentSlots: attachmentSlots(options.id),
    tags: options.tags,
  };
}

export const ARENA_V1_PROGRAMMATIC_CHARACTER_ASSET_ID = Object.freeze({
  PARKOUR_APPRENTICE: 'arena.asset.character.parkour-apprentice.programmatic.v1',
  WIND_UP_CUBE: 'arena.asset.character.wind-up-cube.programmatic.v1',
} as const);

function createCharacterRegistries(): Readonly<{
  assetRegistry: PresentationAssetRegistry;
  characterPresentationRegistry: CharacterPresentationRegistry;
}> {
  const assetRegistry = new PresentationAssetRegistry([
    {
      schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
      id: ARENA_V1_PROGRAMMATIC_CHARACTER_ASSET_ID.PARKOUR_APPRENTICE,
      kind: PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1,
      sourceKey: 'chibi-runner', contentVersion: 1, tags: ['greybox', 'humanoid'],
    },
    {
      schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
      id: ARENA_V1_PROGRAMMATIC_CHARACTER_ASSET_ID.WIND_UP_CUBE,
      kind: PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1,
      sourceKey: 'wind-up-robot', contentVersion: 1, tags: ['greybox', 'robot'],
    },
  ]);
  const characterPresentationRegistry = new CharacterPresentationRegistry({
    assetRegistry,
    definitions: [
      characterPresentation({
        id: 'arena.character-presentation.parkour-apprentice.greybox.v1',
        characterDefinitionId: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
        modelAssetId: ARENA_V1_PROGRAMMATIC_CHARACTER_ASSET_ID.PARKOUR_APPRENTICE,
        rigProfileId: 'arena.rig.humanoid-chibi.v1', tags: ['greybox', 'local-runner'],
      }),
      characterPresentation({
        id: 'arena.character-presentation.wind-up-cube.greybox.v1',
        characterDefinitionId: ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
        modelAssetId: ARENA_V1_PROGRAMMATIC_CHARACTER_ASSET_ID.WIND_UP_CUBE,
        rigProfileId: 'arena.rig.wind-up-cube.v1', tags: ['greybox', 'opponent-runner'],
      }),
    ],
  });
  return Object.freeze({ assetRegistry, characterPresentationRegistry });
}

function createMap(definition: ArenaPresentationMapDefinitionInput): ArenaV1PresentationContent['map'] {
  const id = assertNonEmptyString(definition?.id, 'mapDefinition.id');
  if (!Array.isArray(definition.arena?.surfaces) || definition.arena.surfaces.length === 0) {
    throw new RangeError('mapDefinition.arena.surfaces 不能为空。');
  }
  const ids = new Set<string>();
  const surfaces = definition.arena.surfaces.map((surface, index) => {
    const surfaceId = assertNonEmptyString(surface?.id, `mapDefinition.arena.surfaces[${index}].id`);
    if (ids.has(surfaceId)) throw new RangeError(`mapDefinition 包含重复 surface ${surfaceId}。`);
    ids.add(surfaceId);
    return Object.freeze({
      id: surfaceId,
      center: vector3(surface.center, `${surfaceId}.center`),
      halfExtents: vector3(surface.halfExtents, `${surfaceId}.halfExtents`),
    });
  });
  return Object.freeze({
    id,
    killY: finite(definition.arena.killY, 'mapDefinition.arena.killY'),
    surfaces: Object.freeze(surfaces),
  });
}

export function createArenaV1PresentationContent(
  options: CreateArenaV1PresentationContentOptions,
): ArenaV1PresentationContent {
  const definitions = actionDefinitionMap(options.actionDefinitions);
  const actions = createActions(definitions, options.combatActionIds, options.movementActionIds);
  const equipmentValues: Record<string, Readonly<{ semantic: string; geometry: string }>> = {};
  for (const [index, definition] of options.equipmentDefinitions.entries()) {
    const id = assertNonEmptyString(definition?.id, `equipmentDefinitions[${index}].id`);
    if (equipmentValues[id]) throw new RangeError(`equipmentDefinitions 包含重复 id ${id}。`);
    equipmentValues[id] = Object.freeze({
      semantic: assertNonEmptyString(
        definition.presentationSemantic,
        `equipmentDefinitions[${index}].presentationSemantic`,
      ),
      geometry: id,
    });
  }
  const { assetRegistry, characterPresentationRegistry } = createCharacterRegistries();
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
  return Object.freeze({
    schemaVersion: 2,
    map: createMap(options.mapDefinition),
    characters,
    actions,
    equipment: Object.freeze(equipmentValues),
    assetRegistry,
    characterPresentationRegistry,
  });
}

export function createArenaGameplayV2PresentationContent(
  greyboxContent: ArenaV1PresentationContent,
  mapDefinition: ArenaPresentationMapDefinitionInput,
  characterContent: Readonly<Pick<
    ArenaV1PresentationContent,
    'assetRegistry' | 'characterPresentationRegistry' | 'characters'
  >>,
): ArenaV1PresentationContent {
  return Object.freeze({
    ...greyboxContent,
    schemaVersion: 3,
    map: createMap(mapDefinition),
    ...characterContent,
  });
}
