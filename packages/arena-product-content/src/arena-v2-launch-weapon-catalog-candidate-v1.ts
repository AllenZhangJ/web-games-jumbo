import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import type {
  ActionDefinition,
  EquipmentDefinition,
  WeaponCombatGrammarDefinitionV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1,
} from './arena-v2-charge-shield-weapon-candidate-v1.js';
import {
  ARENA_V2_FLANK_BLADE_WEAPON_CANDIDATE_V1,
} from './arena-v2-flank-blade-weapon-candidate-v1.js';
import {
  ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1,
} from './arena-v2-gravity-chain-weapon-candidate-v1.js';
import {
  ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1,
} from './arena-v2-heavy-hammer-weapon-candidate-v1.js';
import {
  ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1,
} from './arena-v2-line-suppressor-weapon-candidate-v1.js';
import {
  ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1,
} from './arena-v2-read-counter-weapon-candidate-v1.js';

export const ARENA_V2_LAUNCH_WEAPON_CATALOG_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_V2_LAUNCH_WEAPON_IDS_CANDIDATE_V1 = Object.freeze([
  'charge-shield',
  'heavy-hammer',
  'gravity-chain',
  'line-suppressor',
  'read-counter',
  'flank-blade',
] as const);

export type ArenaV2LaunchWeaponIdCandidateV1 =
  typeof ARENA_V2_LAUNCH_WEAPON_IDS_CANDIDATE_V1[number];

export interface ArenaV2LaunchWeaponBundleCandidateV1 {
  readonly id: ArenaV2LaunchWeaponIdCandidateV1;
  readonly migrationOrder: number;
  readonly actions: readonly ActionDefinition[];
  readonly equipment: EquipmentDefinition;
  readonly grammar: WeaponCombatGrammarDefinitionV1;
  readonly contentHash: string;
}

function weapon(
  id: ArenaV2LaunchWeaponIdCandidateV1,
  migrationOrder: number,
  candidate: Readonly<{
    readonly status: 'production-unreachable';
    readonly defaultRegistryWired: false;
    readonly actions: readonly ActionDefinition[];
    readonly equipment: EquipmentDefinition;
    readonly grammar: WeaponCombatGrammarDefinitionV1;
    readonly contentHash: string;
  }>,
): ArenaV2LaunchWeaponBundleCandidateV1 {
  if (candidate.status !== 'production-unreachable' || candidate.defaultRegistryWired !== false) {
    throw new RangeError(`Launch weapon ${id}不得绕过逐把生产迁移。`);
  }
  if (
    candidate.actions.length !== 2
    || candidate.grammar.equipmentDefinitionId !== candidate.equipment.id
    || candidate.grammar.requiredInput !== 'primary'
    || candidate.actions.some(({ input }) => input.channel !== 'primary')
  ) throw new RangeError(`Launch weapon ${id}没有闭合primary地面/空中合同。`);
  return Object.freeze({
    id,
    migrationOrder,
    actions: candidate.actions,
    equipment: candidate.equipment,
    grammar: candidate.grammar,
    contentHash: candidate.contentHash,
  });
}

export const ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1 = Object.freeze([
  weapon('charge-shield', 1, ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1),
  weapon('heavy-hammer', 2, ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1),
  weapon('gravity-chain', 3, ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1),
  weapon('line-suppressor', 4, ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1),
  weapon('read-counter', 5, ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1),
  weapon('flank-blade', 6, ARENA_V2_FLANK_BLADE_WEAPON_CANDIDATE_V1),
]);

function assertCatalogClosure(): void {
  const identitySets = [
    ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1.map(({ id }) => id),
    ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1.map(({ equipment }) => equipment.id),
    ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1.map(({ grammar }) => grammar.id),
    ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1.flatMap(({ actions }) => actions.map(({ id }) => id)),
  ];
  for (const identities of identitySets) {
    if (new Set(identities).size !== identities.length) {
      throw new RangeError('Arena V2首发六武器目录包含重复权威身份。');
    }
  }
  if (new Set(ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1.map(
    ({ grammar }) => grammar.coreVerb,
  )).size !== 6) {
    throw new RangeError('Arena V2首发六武器必须保持六种独立战斗语言。');
  }
}

assertCatalogClosure();

const AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_LAUNCH_WEAPON_CATALOG_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  requiredInputChannels: Object.freeze(['direction', 'jump', 'primary'] as const),
  weaponCount: 6 as const,
  migrationOrder: ARENA_V2_LAUNCH_WEAPON_IDS_CANDIDATE_V1,
  weapons: ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1,
});

export const ARENA_V2_LAUNCH_WEAPON_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Launch Weapon Catalog Candidate V1',
  ),
});
