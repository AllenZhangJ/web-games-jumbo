import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  WEAPON_ACTION_CONTEXT_V1,
  WEAPON_CORE_VERB_V1,
  WEAPON_COUNTER_INPUT_V1,
  WEAPON_FAILURE_RISK_V1,
  type WeaponActionContextKindV1,
  type WeaponCoreVerbV1,
  type WeaponCounterInputV1,
  type WeaponFailureRiskV1,
} from '@number-strategy-jump/arena-definitions';
/* The imported definitions are the sole enum authority. This projection only
 * fixes current cardinality and ground-before-aerial product order. */
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';

export interface ArenaV2WeaponCollectionCombatGrammarContextVisualSourceCandidateV1 {
  readonly context: WeaponActionContextKindV1;
  readonly actionDefinitionId: string;
  readonly failureRisk: WeaponFailureRiskV1;
  readonly counterInputs: readonly WeaponCounterInputV1[];
}

export interface ArenaV2WeaponCollectionCombatGrammarVisualSourceEntryCandidateV1 {
  readonly weaponDefinitionId: string;
  /**
   * Stable collection-directory key used by feedback read plans. Keeping it
   * beside the formal definition ID makes the cross-projection join explicit
   * rather than relying on a coincidental spelling convention.
   */
  readonly catalogId: string;
  readonly collectionOrder: number;
  readonly coreVerb: WeaponCoreVerbV1;
  readonly contexts: readonly [
    ArenaV2WeaponCollectionCombatGrammarContextVisualSourceCandidateV1,
    ArenaV2WeaponCollectionCombatGrammarContextVisualSourceCandidateV1,
  ];
}

export interface ArenaV2WeaponCombatGrammarSourceIdentityCandidateV1 {
  readonly sourceContentHash: string;
  readonly weaponDefinitionId: string;
  readonly context: WeaponActionContextKindV1;
  readonly actionDefinitionId: string;
  readonly coreVerb: WeaponCoreVerbV1;
  readonly failureRisk: WeaponFailureRiskV1;
  readonly counterInputs: readonly WeaponCounterInputV1[];
}

const CONTEXTS = Object.freeze([
  WEAPON_ACTION_CONTEXT_V1.GROUND,
  WEAPON_ACTION_CONTEXT_V1.AERIAL,
] as const);
const CORE_VERBS = new Set<WeaponCoreVerbV1>(Object.values(WEAPON_CORE_VERB_V1));
const FAILURE_RISKS = new Set<WeaponFailureRiskV1>(Object.values(WEAPON_FAILURE_RISK_V1));
const COUNTER_INPUTS = new Set<WeaponCounterInputV1>(Object.values(WEAPON_COUNTER_INPUT_V1));

if (CORE_VERBS.size !== Object.values(WEAPON_CORE_VERB_V1).length
  || FAILURE_RISKS.size !== Object.values(WEAPON_FAILURE_RISK_V1).length
  || COUNTER_INPUTS.size !== Object.values(WEAPON_COUNTER_INPUT_V1).length
  || new Set(Object.values(WEAPON_ACTION_CONTEXT_V1)).size !== CONTEXTS.length) {
  throw new RangeError('A5/A6武器语法正式Definition值域数量或唯一性漂移。');
}

function contextSource(
  weaponDefinitionId: string,
  action: (typeof ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons)[number]['actions'][number],
  expectedContext: WeaponActionContextKindV1,
): ArenaV2WeaponCollectionCombatGrammarContextVisualSourceCandidateV1 {
  if (action.context !== expectedContext
    || !FAILURE_RISKS.has(action.failureRisk)
    || action.counterInputs.length < 1
    || action.counterInputs.length > 2
    || new Set(action.counterInputs).size !== action.counterInputs.length
    || action.counterInputs.some((input) => !COUNTER_INPUTS.has(input))) {
    throw new RangeError(
      `A5/A6武器${weaponDefinitionId}的${expectedContext}战斗语法来源不闭合。`,
    );
  }
  return Object.freeze({
    context: expectedContext,
    actionDefinitionId: action.actionDefinitionId,
    failureRisk: action.failureRisk,
    counterInputs: Object.freeze([...action.counterInputs]),
  });
}

const ENTRIES = Object.freeze(
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.map((weapon, index) => {
    if (weapon.collectionOrder !== index + 1
      || !CORE_VERBS.has(weapon.coreVerb)
      || weapon.actions.length !== CONTEXTS.length) {
      throw new RangeError(`A5/A6武器${weapon.weaponDefinitionId}目录顺序或核心动词漂移。`);
    }
    const contexts = Object.freeze(CONTEXTS.map((context, contextIndex) => contextSource(
      weapon.weaponDefinitionId,
      weapon.actions[contextIndex]!,
      context,
    ))) as ArenaV2WeaponCollectionCombatGrammarVisualSourceEntryCandidateV1['contexts'];
    return Object.freeze({
      weaponDefinitionId: weapon.weaponDefinitionId,
      catalogId: weapon.catalogId,
      collectionOrder: weapon.collectionOrder,
      coreVerb: weapon.coreVerb,
      contexts,
    });
  }),
);

if (ENTRIES.length !== 20
  || new Set(ENTRIES.map(({ weaponDefinitionId }) => weaponDefinitionId)).size !== 20
  || new Set(ENTRIES.map(({ catalogId }) => catalogId)).size !== 20
  || ENTRIES.some(({ catalogId }) => catalogId.length === 0)
  || new Set(ENTRIES.map(({ collectionOrder }) => collectionOrder)).size !== 20) {
  throw new RangeError('A5/A6武器战斗语法视觉来源必须精确闭合20把武器。');
}

const AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  stage: 'A5/A6.weapon-combat-grammar-visual-source' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  ownerId: 'arena-v2-information-content-read-catalog' as const,
  sourceCatalogContentHash:
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.contentHash,
  weaponCount: 20 as const,
  contextOrder: CONTEXTS,
  projectsCoreVerb: true as const,
  projectsGroundAerialFailureRisk: true as const,
  projectsCounterInputs: true as const,
  projectsDistanceBand: false as const,
  distanceBandOmittedBecauseNoApprovedStableCategoryExists: true as const,
  copiesCombatNumbers: false as const,
  readsRuntimeRules: false as const,
  grantsAssetApproval: false as const,
  entries: ENTRIES,
});

export const ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1 =
  Object.freeze({
    ...AUTHORITY,
    contentHash: createDeterministicDataHash(
      AUTHORITY,
      'Arena V2 A5/A6 Weapon Collection Combat Grammar Visual Source Candidate V1',
    ),
  });

/**
 * Same immutable source under a consumer-neutral name. This is an alias, not a
 * copied weapon directory, so UI, VFX and audio cannot drift between sources.
 */
export const ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1 =
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1;

const SOURCE_IDENTITY_BY_ACTION_DEFINITION_ID = new Map<string,
ArenaV2WeaponCombatGrammarSourceIdentityCandidateV1>();
for (const entry of ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.entries) {
  for (const context of entry.contexts) {
    const identity = Object.freeze({
      sourceContentHash:
        ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.contentHash,
      weaponDefinitionId: entry.weaponDefinitionId,
      context: context.context,
      actionDefinitionId: context.actionDefinitionId,
      coreVerb: entry.coreVerb,
      failureRisk: context.failureRisk,
      counterInputs: Object.freeze([...context.counterInputs]),
    });
    if (SOURCE_IDENTITY_BY_ACTION_DEFINITION_ID.has(identity.actionDefinitionId)) {
      throw new RangeError(
        `A5/A6武器战斗语法动作身份重复：${identity.actionDefinitionId}。`,
      );
    }
    SOURCE_IDENTITY_BY_ACTION_DEFINITION_ID.set(identity.actionDefinitionId, identity);
  }
}
if (SOURCE_IDENTITY_BY_ACTION_DEFINITION_ID.size !== 40) {
  throw new RangeError('A5/A6武器战斗语法必须精确闭合20把×2个动作身份。');
}

export function resolveArenaV2WeaponCombatGrammarSourceIdentityByActionDefinitionIdCandidateV1(
  actionDefinitionId: unknown,
): ArenaV2WeaponCombatGrammarSourceIdentityCandidateV1 | null {
  if (typeof actionDefinitionId !== 'string' || actionDefinitionId.length === 0) return null;
  return SOURCE_IDENTITY_BY_ACTION_DEFINITION_ID.get(actionDefinitionId) ?? null;
}

export function requireArenaV2WeaponCombatGrammarSourceIdentityByActionDefinitionIdCandidateV1(
  actionDefinitionId: unknown,
): ArenaV2WeaponCombatGrammarSourceIdentityCandidateV1 {
  const identity =
    resolveArenaV2WeaponCombatGrammarSourceIdentityByActionDefinitionIdCandidateV1(
      actionDefinitionId,
    );
  if (identity === null) {
    throw new RangeError(`A5/A6武器战斗语法未登记动作${String(actionDefinitionId)}。`);
  }
  return identity;
}
