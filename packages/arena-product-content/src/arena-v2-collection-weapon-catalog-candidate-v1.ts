import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import type {
  ActionDefinition,
  EquipmentDefinition,
  WeaponCombatGrammarDefinitionV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1,
} from './arena-v2-expanded-weapon-candidates-v1.js';
import {
  ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1,
} from './arena-v2-launch-weapon-catalog-candidate-v1.js';

export interface ArenaV2CollectionWeaponBundleCandidateV1 {
  readonly id: string;
  readonly collectionOrder: number;
  readonly sourceBatch: 'launch-six' | 'collection-expansion';
  readonly learningProblem: string;
  readonly actions: readonly ActionDefinition[];
  readonly equipment: EquipmentDefinition;
  readonly grammar: WeaponCombatGrammarDefinitionV1;
  readonly contentHash: string;
}

const LAUNCH_LEARNING_PROBLEMS = Object.freeze({
  'charge-shield': 'self-charge-versus-overshoot',
  'heavy-hammer': 'heavy-push-versus-long-recovery',
  'gravity-chain': 'long-pull-versus-aim-commitment',
  'line-suppressor': 'thin-line-pressure-versus-side-step',
  'read-counter': 'hold-punish-versus-early-exit',
  'flank-blade': 'rear-angle-versus-facing-read',
} as const);

export const ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1 = Object.freeze([
  ...ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1.map((weapon) => Object.freeze({
    id: weapon.id,
    collectionOrder: weapon.migrationOrder,
    sourceBatch: 'launch-six' as const,
    learningProblem: LAUNCH_LEARNING_PROBLEMS[weapon.id],
    actions: weapon.actions,
    equipment: weapon.equipment,
    grammar: weapon.grammar,
    contentHash: weapon.contentHash,
  })),
  ...ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1.map((weapon) => Object.freeze({
    id: weapon.id,
    collectionOrder: weapon.collectionOrder,
    sourceBatch: 'collection-expansion' as const,
    learningProblem: weapon.learningProblem,
    actions: weapon.actions,
    equipment: weapon.equipment,
    grammar: weapon.grammar,
    contentHash: weapon.contentHash,
  })),
] satisfies readonly ArenaV2CollectionWeaponBundleCandidateV1[]);

function assertClosure(): void {
  if (ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.length !== 20) {
    throw new RangeError('Arena V2收藏武器目录必须精确包含20把武器。');
  }
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.forEach((weapon, index) => {
    if (weapon.collectionOrder !== index + 1
      || weapon.actions.length !== 2
      || weapon.grammar.requiredInput !== 'primary'
      || weapon.actions.some(({ input }) => input.channel !== 'primary')) {
      throw new RangeError(`Arena V2收藏武器${weapon.id}顺序或输入合同不闭合。`);
    }
  });
  const identities = [
    ...ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ id }) => id),
    ...ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ equipment }) => equipment.id),
    ...ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ grammar }) => grammar.id),
    ...ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.flatMap(({ actions }) => (
      actions.map(({ id }) => id)
    )),
  ];
  if (new Set(identities).size !== identities.length) {
    throw new RangeError('Arena V2收藏武器目录存在重复权威身份。');
  }
  if (new Set(ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(
    ({ learningProblem }) => learningProblem,
  )).size !== 20) {
    throw new RangeError('Arena V2收藏武器必须提供20个不同学习问题。');
  }
}

assertClosure();

const AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  requiredInputChannels: Object.freeze(['direction', 'jump', 'primary'] as const),
  launchWeaponCount: 6 as const,
  collectionWeaponCount: 20 as const,
  weapons: ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
});

export const ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Collection Weapon Catalog Candidate V1',
  ),
});
