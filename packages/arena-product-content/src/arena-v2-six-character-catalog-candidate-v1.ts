import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  createCharacterDefinition,
  type CharacterDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
} from './arena-v2-kz-verification-character-candidate-v1.js';

export type ArenaV2CharacterHandlingKindCandidateV1 =
  | 'balanced'
  | 'sprint'
  | 'air-control'
  | 'high-jump'
  | 'quick-start'
  | 'forgiving';

export interface ArenaV2CharacterCatalogEntryCandidateV1 {
  readonly catalogId: string;
  readonly collectionOrder: number;
  readonly handlingKind: ArenaV2CharacterHandlingKindCandidateV1;
  readonly nameMessageId: string;
  readonly handlingSummaryMessageId: string;
  readonly movementDifferenceMessageId: string;
  readonly definition: CharacterDefinition;
}

const BASE = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;

function character(
  id: string,
  movement: Partial<CharacterDefinition['movement']>,
  jump: Partial<CharacterDefinition['jump']>,
  handlingKind: ArenaV2CharacterHandlingKindCandidateV1,
): CharacterDefinition {
  return createCharacterDefinition({
    schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
    id,
    collision: BASE.collision,
    movement: { ...BASE.movement, ...movement },
    jump: { ...BASE.jump, ...jump },
    tags: ['arena-v2', 'playable', 'same-input-contract', `handling-${handlingKind}`],
  });
}

const DEFINITIONS = Object.freeze({
  balanced: BASE,
  sprint: character(
    'arena-v2-character-sprint.candidate.v1',
    {
      walkSpeed: 3.36,
      runSpeed: 6.42,
      groundAcceleration: 46.2,
      airAcceleration: 13.3,
    },
    {},
    'sprint',
  ),
  airControl: character(
    'arena-v2-character-air-control.candidate.v1',
    {
      walkSpeed: 3.1,
      runSpeed: 5.7,
      groundAcceleration: 39.9,
      airAcceleration: 17.5,
    },
    {},
    'air-control',
  ),
  highJump: character(
    'arena-v2-character-high-jump.candidate.v1',
    {
      walkSpeed: 3.04,
      runSpeed: 5.64,
      groundAcceleration: 39.5,
      airAcceleration: 14.7,
    },
    {
      groundImpulse: BASE.jump.groundImpulse * 1.055,
      crouchImpulse: BASE.jump.crouchImpulse * 1.055,
      airImpulse: BASE.jump.airImpulse * 1.04,
    },
    'high-jump',
  ),
  quickStart: character(
    'arena-v2-character-quick-start.candidate.v1',
    {
      runSpeed: 5.85,
      runInputThreshold: 0.55,
      groundAcceleration: 50.4,
      airAcceleration: 13.3,
    },
    {},
    'quick-start',
  ),
  forgiving: character(
    'arena-v2-character-forgiving.candidate.v1',
    {
      walkSpeed: 3,
      runSpeed: 5.55,
      groundAcceleration: 37.8,
      airAcceleration: 15.4,
    },
    {
      coyoteTicks: 9,
      bufferTicks: 9,
    },
    'forgiving',
  ),
});

function entry(
  collectionOrder: number,
  handlingKind: ArenaV2CharacterHandlingKindCandidateV1,
  definition: CharacterDefinition,
): ArenaV2CharacterCatalogEntryCandidateV1 {
  const prefix = `arena.v2.character.${handlingKind}`;
  return Object.freeze({
    catalogId: `arena-v2-character-${handlingKind}.candidate.v1`,
    collectionOrder,
    handlingKind,
    nameMessageId: `${prefix}.name`,
    handlingSummaryMessageId: `${prefix}.handling-summary`,
    movementDifferenceMessageId: `${prefix}.movement-difference`,
    definition,
  });
}

export const ARENA_V2_SIX_CHARACTER_CATALOG_ENTRIES_CANDIDATE_V1 = Object.freeze([
  entry(1, 'balanced', DEFINITIONS.balanced),
  entry(2, 'sprint', DEFINITIONS.sprint),
  entry(3, 'air-control', DEFINITIONS.airControl),
  entry(4, 'high-jump', DEFINITIONS.highJump),
  entry(5, 'quick-start', DEFINITIONS.quickStart),
  entry(6, 'forgiving', DEFINITIONS.forgiving),
]);

export const ARENA_V2_SIX_CHARACTER_DEFINITIONS_CANDIDATE_V1 = Object.freeze(
  ARENA_V2_SIX_CHARACTER_CATALOG_ENTRIES_CANDIDATE_V1.map(({ definition }) => definition),
);

export const ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1 = Object.freeze(
  ARENA_V2_SIX_CHARACTER_DEFINITIONS_CANDIDATE_V1.map(({ id }) => id),
);

const AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  formalVisualAssetsReady: false as const,
  inputContract: Object.freeze(['direction', 'jump', 'primary-attack'] as const),
  characterCount: 6 as const,
  sharedCollision: BASE.collision,
  sharedMaximumAirJumps: BASE.jump.maximumAirJumps,
  entries: ARENA_V2_SIX_CHARACTER_CATALOG_ENTRIES_CANDIDATE_V1,
});

export const ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Six Character Catalog Candidate V1',
  ),
  validationStatus: 'not-run' as const,
});
