import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  KZ_ROUTE_INPUT,
  KZ_ROUTE_RESPONSE_OPTION,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from './arena-v2-collection-weapon-catalog-candidate-v1.js';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-switchback-map-candidate-v1.js';
import {
  ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1,
} from './arena-v2-six-character-catalog-candidate-v1.js';

export const ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1 = Object.freeze({
  DIRECTION: 'direction',
  JUMP: 'jump',
  PRIMARY_ATTACK: 'primary-attack',
} as const);

export type ArenaV2InputConceptCandidateV1 =
  typeof ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1[
    keyof typeof ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1
  ];

const CONCEPTS = Object.freeze([
  ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.DIRECTION,
  ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.JUMP,
  ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.PRIMARY_ATTACK,
] as const);
const ROUTE_INPUTS = Object.freeze([
  KZ_ROUTE_INPUT.DIRECTION,
  KZ_ROUTE_INPUT.JUMP,
] as const);
const ROUTE_RESPONSE_OPTIONS = new Set([
  KZ_ROUTE_RESPONSE_OPTION.HOLD,
  KZ_ROUTE_RESPONSE_OPTION.STRAFE,
  KZ_ROUTE_RESPONSE_OPTION.JUMP,
]);
const ROUTES = Object.freeze([
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
]);

function exactSequence(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function assertCharacterClosure(): void {
  if (ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.characterCount !== 6
    || !exactSequence(
      ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.inputContract,
      CONCEPTS,
    )) {
    throw new RangeError('Arena V2六角色必须共享方向、跳跃、主攻击三概念输入。');
  }
}

function assertWeaponClosure(): number {
  if (ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.length !== 20) {
    throw new RangeError('Arena V2三概念输入必须精确覆盖20把收藏武器。');
  }
  let commitmentActionCount = 0;
  for (const weapon of ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1) {
    const [groundAction, aerialAction] = weapon.actions;
    if (!groundAction || !aerialAction
      || weapon.actions.length !== 2
      || weapon.grammar.requiredInput !== ACTION_INPUT_CHANNEL.PRIMARY
      || groundAction.id !== weapon.equipment.actionDefinitionId
      || aerialAction.id !== weapon.equipment.aerialActionDefinitionId
      || weapon.actions.some((action) => (
        action.input.channel !== ACTION_INPUT_CHANNEL.PRIMARY
        || action.input.trigger !== ACTION_INPUT_TRIGGER.PRESSED
      ))) {
      throw new RangeError(`Arena V2武器${weapon.id}引入了三概念合同外的动作输入。`);
    }
    commitmentActionCount += weapon.actions.filter((action) => (
      action.commitment !== undefined
    )).length;
  }
  if (commitmentActionCount === 0) {
    throw new RangeError('Arena V2三概念输入必须保留主攻击按住与松开的承诺语义。');
  }
  return commitmentActionCount;
}

function assertMapClosure(): number {
  const routeIds = new Set<string>();
  let segmentCount = 0;
  for (const route of ROUTES) {
    if (routeIds.has(route.id)) throw new RangeError(`Arena V2路线${route.id}身份重复。`);
    routeIds.add(route.id);
    if (!exactSequence(route.requiredInputs, ROUTE_INPUTS)) {
      throw new RangeError(`Arena V2路线${route.id}需要三概念合同外的移动输入。`);
    }
    for (const segment of route.segments) {
      if (segment.responseOptions.some((option) => !ROUTE_RESPONSE_OPTIONS.has(option))) {
        throw new RangeError(`Arena V2路段${segment.id}需要三概念合同外的路线响应。`);
      }
      segmentCount += 1;
    }
  }
  if (ROUTES.length !== 2 || segmentCount !== 20) {
    throw new RangeError('Arena V2三概念输入必须精确覆盖2张地图与20个路线段。');
  }
  return segmentCount;
}

assertCharacterClosure();
const COMMITMENT_ACTION_COUNT = assertWeaponClosure();
const MAP_SEGMENT_COUNT = assertMapClosure();

const AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultCompositionWired: false as const,
  concepts: CONCEPTS,
  inputFrameProjection: Object.freeze({
    direction: Object.freeze(['moveX', 'moveZ'] as const),
    jump: Object.freeze(['jumpPressed', 'jumpHeld'] as const),
    primaryAttack: Object.freeze(['primaryPressed', 'primaryHeld'] as const),
    forcedInactive: Object.freeze(['slamPressed'] as const),
  }),
  primaryAttackSemantics: Object.freeze({
    pressStartsGroundOrAerialAction: true as const,
    holdSupportsCommitment: true as const,
    releaseCommitsOrCancelsByAuthorityTicks: true as const,
    contextAddsButtons: false as const,
  }),
  routeResponseProjection: Object.freeze({
    hold: ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.DIRECTION,
    strafe: ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.DIRECTION,
    jump: ARENA_V2_INPUT_CONCEPT_CANDIDATE_V1.JUMP,
  }),
  characterCount: 6 as const,
  weaponCount: 20 as const,
  weaponActionCount: 40 as const,
  commitmentActionCount: COMMITMENT_ACTION_COUNT,
  mapCount: 2 as const,
  mapSegmentCount: MAP_SEGMENT_COUNT,
  crouchEnabled: false as const,
  blockEnabled: false as const,
  dashEnabled: false as const,
  slamEnabled: false as const,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Three Concept Input Contract Candidate V1',
  ),
});
