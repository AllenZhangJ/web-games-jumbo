import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type {
  WeaponActionContextKindV1,
  WeaponCoreVerbV1,
  WeaponCounterInputV1,
  WeaponFailureRiskV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  isArenaV2FormalAssetProductionApprovedCandidateV1,
} from './arena-v2-formal-asset-production-approval-candidate-v1.js';
import {
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  type ArenaV2FormalAudioAssetRecordCandidateV1,
} from './arena-v2-formal-presentation-asset-catalog-candidate-v1.js';
import type { ArenaV2ModeHudFeedbackAudioCommandV1 } from './arena-v2-mode-hud-feedback-effect-consumer-v1.js';
import {
  resolveArenaV2WeaponFeedbackActionReadBindingCandidateV1,
  type ArenaV2WeaponFeedbackActionReadBindingCandidateV1,
} from './arena-v2-twenty-weapon-feedback-read-plan-candidate-v1.js';
import {
  ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1,
  requireArenaV2WeaponCombatGrammarSourceIdentityByActionDefinitionIdCandidateV1,
} from './arena-v2-weapon-collection-combat-grammar-visual-source-candidate-v1.js';

export interface ArenaV2FormalAudioCombatGrammarIdentityCandidateV1 {
  readonly sourceContentHash: string;
  readonly weaponDefinitionId: string;
  readonly context: WeaponActionContextKindV1;
  readonly actionDefinitionId: string;
  readonly coreVerb: WeaponCoreVerbV1;
  readonly failureRisk: WeaponFailureRiskV1;
  readonly counterInputs: readonly WeaponCounterInputV1[];
}

export interface ArenaV2FormalAudioCueResolutionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly ready: boolean;
  readonly sourceEventId: string;
  readonly cueId: string;
  readonly actionDefinitionId: string | null;
  readonly combatGrammarIdentity: ArenaV2FormalAudioCombatGrammarIdentityCandidateV1 | null;
  readonly audioAssetId: string | null;
  readonly runtimeSourceKey: string | null;
  readonly actionSemantic: ArenaV2FormalAudioAssetRecordCandidateV1['actionSemantic'] | null;
  readonly weaponId: string | null;
  readonly weaponPhase: 'windup' | 'release' | 'recovery' | null;
  readonly maturity: ArenaV2FormalAudioAssetRecordCandidateV1['maturity'] | null;
  readonly approved: boolean;
  readonly playbackRate: 0.96 | 1 | 1.04;
  readonly gainDb: -6 | -3 | -2;
  readonly priority: 1 | 2 | 3;
  readonly missingReason:
    | 'action-family-not-recorded'
    | 'cue-not-recorded'
    | 'weapon-phase-not-recorded'
    | null;
  readonly syntheticAudioFallbackUsed: false;
}

const COMMAND_KEYS = new Set([
  'sourceEventId', 'cueId', 'actionDefinitionId', 'bus', 'gainDb', 'priority',
  'deterministicVariantIndex', 'maximumConcurrentVoices', 'overflowPolicy',
]);
const COMBAT_GRAMMAR_IDENTITY_KEYS = new Set([
  'sourceContentHash', 'weaponDefinitionId', 'context', 'actionDefinitionId',
  'coreVerb', 'failureRisk', 'counterInputs',
]);

const UNARMED_ACTION_DEFINITION_IDS: ReadonlySet<string> = new Set(
  ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1.map(({ id }) => id),
);
if (UNARMED_ACTION_DEFINITION_IDS.size !== 2) {
  throw new RangeError('Arena V2正式音频必须精确闭合2个徒手动作身份。');
}

const WEAPON_PHASE_CUE_PATTERN =
  /^arena\.cue\.audio\.weapon-phase\.([a-z][a-z0-9-]*)\.(windup|release|recovery)\.v1$/;
const WEAPON_FEEDBACK_CUE_PATTERN =
  /^arena\.cue\.audio\.weapon-feedback\.([a-z][a-z0-9-]*)\.(ground|aerial)\.(hit-confirm|hit-surface-transfer|hit-ring-out|attack-evaded)\.(duel|race|survival)\.candidate\.v1$/;
const MOVEMENT_FALL_FEEDBACK_CUE_PATTERN =
  /^arena\.cue\.audio\.weapon-feedback\.movement-global\.movement-fall\.(duel|race|survival)\.candidate\.v1$/;
const WEAPON_FEEDBACK_CUE_PREFIX = 'arena.cue.audio.weapon-feedback.';

function weaponPhaseCue(value: string): Readonly<{
  readonly weaponId: string;
  readonly phase: 'windup' | 'release' | 'recovery';
}> | null {
  const match = WEAPON_PHASE_CUE_PATTERN.exec(value);
  if (match === null) return null;
  return Object.freeze({
    weaponId: match[1]!,
    phase: match[2] as 'windup' | 'release' | 'recovery',
  });
}

function weaponFeedbackCue(value: string): Readonly<{
  readonly weaponId: string;
  readonly context: WeaponActionContextKindV1;
}> | null {
  const match = WEAPON_FEEDBACK_CUE_PATTERN.exec(value);
  if (match === null) return null;
  return Object.freeze({
    weaponId: match[1]!,
    context: match[2] as WeaponActionContextKindV1,
  });
}

interface WeaponActionGrammarResolution {
  readonly binding: ArenaV2WeaponFeedbackActionReadBindingCandidateV1;
  readonly identity: ArenaV2FormalAudioCombatGrammarIdentityCandidateV1;
}

export function requireArenaV2FormalAudioCombatGrammarIdentityCandidateV1(
  value: unknown,
): ArenaV2FormalAudioCombatGrammarIdentityCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 formal audio combat grammar identity');
  assertKnownKeys(
    source,
    COMBAT_GRAMMAR_IDENTITY_KEYS,
    'Arena V2 formal audio combat grammar identity',
  );
  for (const key of COMBAT_GRAMMAR_IDENTITY_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 formal audio combat grammar identity缺少${key}。`);
    }
  }
  const actionDefinitionId = assertNonEmptyString(
    source.actionDefinitionId,
    'Arena V2 formal audio combat grammar identity.actionDefinitionId',
  );
  const expected =
    requireArenaV2WeaponCombatGrammarSourceIdentityByActionDefinitionIdCandidateV1(
      actionDefinitionId,
    );
  if (!Array.isArray(source.counterInputs)
    || source.sourceContentHash !== expected.sourceContentHash
    || source.weaponDefinitionId !== expected.weaponDefinitionId
    || source.context !== expected.context
    || source.coreVerb !== expected.coreVerb
    || source.failureRisk !== expected.failureRisk
    || source.counterInputs.length !== expected.counterInputs.length
    || source.counterInputs.some((input, index) => input !== expected.counterInputs[index])) {
    throw new RangeError(
      `Arena V2正式音频动作${actionDefinitionId}战斗语法身份漂移。`,
    );
  }
  return Object.freeze({
    sourceContentHash: expected.sourceContentHash,
    weaponDefinitionId: expected.weaponDefinitionId,
    context: expected.context,
    actionDefinitionId: expected.actionDefinitionId,
    coreVerb: expected.coreVerb,
    failureRisk: expected.failureRisk,
    counterInputs: Object.freeze([...expected.counterInputs]),
  });
}

function weaponActionGrammar(
  actionDefinitionId: string,
): WeaponActionGrammarResolution | null {
  const binding = resolveArenaV2WeaponFeedbackActionReadBindingCandidateV1(actionDefinitionId);
  if (binding === null) return null;
  const sourceIdentity =
    requireArenaV2WeaponCombatGrammarSourceIdentityByActionDefinitionIdCandidateV1(
      binding.collectionActionDefinitionId,
    );
  if (sourceIdentity.sourceContentHash
      !== ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.contentHash
    || sourceIdentity.weaponDefinitionId !== binding.equipmentDefinitionId
    || sourceIdentity.context !== binding.actionContext
    || sourceIdentity.actionDefinitionId !== binding.collectionActionDefinitionId
    || sourceIdentity.coreVerb !== binding.coreVerb
    || sourceIdentity.failureRisk !== binding.failureRisk) {
    throw new RangeError(
      `Arena V2正式音频动作${actionDefinitionId}与唯一战斗语法源漂移。`,
    );
  }
  return Object.freeze({
    binding,
    identity: requireArenaV2FormalAudioCombatGrammarIdentityCandidateV1({
      sourceContentHash: sourceIdentity.sourceContentHash,
      weaponDefinitionId: sourceIdentity.weaponDefinitionId,
      context: sourceIdentity.context,
      actionDefinitionId: sourceIdentity.actionDefinitionId,
      coreVerb: sourceIdentity.coreVerb,
      failureRisk: sourceIdentity.failureRisk,
      counterInputs: sourceIdentity.counterInputs,
    }),
  });
}

function singleAudioRecord(
  records: readonly ArenaV2FormalAudioAssetRecordCandidateV1[],
  name: string,
): ArenaV2FormalAudioAssetRecordCandidateV1 {
  if (records.length !== 1) throw new RangeError(`${name}必须精确命中1份音频。`);
  return records[0]!;
}

function weaponImpactRecord(
  grammar: WeaponActionGrammarResolution,
): ArenaV2FormalAudioAssetRecordCandidateV1 {
  return singleAudioRecord(
    ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.audioRecords.filter((record) => (
      record.weaponDefinitionId === grammar.identity.weaponDefinitionId
      && record.actionSemantic !== null
    )),
    `Arena V2武器${grammar.identity.weaponDefinitionId}命中音频`,
  );
}

function unarmedImpactRecord(): ArenaV2FormalAudioAssetRecordCandidateV1 {
  return singleAudioRecord(
    ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.audioRecords.filter((record) => (
      record.weaponDefinitionId === null && record.actionSemantic === 'base-push'
    )),
    'Arena V2徒手命中音频',
  );
}

function command(value: unknown): ArenaV2ModeHudFeedbackAudioCommandV1 {
  const source = cloneFrozenData(value, 'Arena V2 formal audio command');
  assertKnownKeys(source, COMMAND_KEYS, 'Arena V2 formal audio command');
  const sourceEventId = assertNonEmptyString(
    source.sourceEventId,
    'Arena V2 formal audio command.sourceEventId',
  );
  const cueId = assertNonEmptyString(source.cueId, 'Arena V2 formal audio command.cueId');
  const actionDefinitionId = source.actionDefinitionId === null
    ? null
    : assertNonEmptyString(
      source.actionDefinitionId,
      'Arena V2 formal audio command.actionDefinitionId',
    );
  if (source.bus !== 'SFX'
    || (source.gainDb !== -6 && source.gainDb !== -3 && source.gainDb !== -2)
    || (source.priority !== 1 && source.priority !== 2 && source.priority !== 3)
    || (source.deterministicVariantIndex !== 0
      && source.deterministicVariantIndex !== 1
      && source.deterministicVariantIndex !== 2)
    || source.maximumConcurrentVoices !== 8
    || source.overflowPolicy !== 'drop-lowest-priority') {
    throw new RangeError('Arena V2 formal audio command预算合同无效。');
  }
  return Object.freeze({
    sourceEventId,
    cueId,
    actionDefinitionId,
    bus: 'SFX' as const,
    gainDb: source.gainDb,
    priority: source.priority,
    deterministicVariantIndex: source.deterministicVariantIndex,
    maximumConcurrentVoices: 8 as const,
    overflowPolicy: 'drop-lowest-priority' as const,
  });
}

/**
 * Resolves approved intake and explicitly registered authored candidates
 * without guessing from visual state. Production callers can require approval;
 * isolated development can audition candidates. No runtime oscillator or
 * unrelated fallback sound is substituted.
 */
export function resolveArenaV2FormalAudioCueCandidateV1(
  value: unknown,
): ArenaV2FormalAudioCueResolutionCandidateV1 {
  const input = command(value);
  const phaseCue = weaponPhaseCue(input.cueId);
  const feedbackCue = weaponFeedbackCue(input.cueId);
  const movementFallFeedbackCue = MOVEMENT_FALL_FEEDBACK_CUE_PATTERN.test(input.cueId);
  if (input.cueId.startsWith(WEAPON_FEEDBACK_CUE_PREFIX)
    && feedbackCue === null
    && !movementFallFeedbackCue) {
    throw new RangeError(`Arena V2正式音频专用反馈Cue身份无效：${input.cueId}。`);
  }
  const actionGrammar = input.actionDefinitionId === null
    ? null
    : weaponActionGrammar(input.actionDefinitionId);
  if (movementFallFeedbackCue && input.actionDefinitionId !== null) {
    throw new RangeError('Arena V2移动失足音频不得携带武器动作身份。');
  }
  if (feedbackCue !== null && (
    actionGrammar === null
    || feedbackCue.weaponId !== actionGrammar.binding.weaponId
    || feedbackCue.context !== actionGrammar.identity.context
  )) {
    throw new RangeError('Arena V2武器反馈音频Cue与精确动作/情境身份不一致。');
  }
  const exactCueRecords = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.audioRecords
    .filter(({ cueId }) => cueId === input.cueId);
  if (exactCueRecords.length > 1) {
    throw new RangeError(`Arena V2正式音频Cue重复：${input.cueId}。`);
  }
  const exactCueRecord = exactCueRecords[0] ?? null;
  if (phaseCue !== null) {
    if (input.actionDefinitionId === null
      || actionGrammar === null
      || actionGrammar.binding.weaponId !== phaseCue.weaponId
      || exactCueRecord === null
      || exactCueRecord.weaponDefinitionId !== actionGrammar.identity.weaponDefinitionId
      || exactCueRecord.actionSemantic !== null) {
      throw new RangeError('Arena V2武器阶段音频Cue与精确动作/Definition身份不一致。');
    }
  } else if (exactCueRecord !== null && input.actionDefinitionId !== null) {
    throw new RangeError('Arena V2模式/供给音频Cue不得携带武器动作身份。');
  }
  const unarmedImpact = input.actionDefinitionId !== null
    && UNARMED_ACTION_DEFINITION_IDS.has(input.actionDefinitionId);
  const record = phaseCue !== null
    ? exactCueRecord
    : input.actionDefinitionId === null
      ? exactCueRecord
      : actionGrammar !== null
        ? weaponImpactRecord(actionGrammar)
        : unarmedImpact
          ? unarmedImpactRecord()
          : null;
  const playbackRate = ([0.96, 1, 1.04] as const)[input.deterministicVariantIndex]!;
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    ready: record !== null,
    sourceEventId: input.sourceEventId,
    cueId: input.cueId,
    actionDefinitionId: input.actionDefinitionId,
    combatGrammarIdentity: phaseCue === null ? actionGrammar?.identity ?? null : null,
    audioAssetId: record?.audioAssetId ?? null,
    runtimeSourceKey: record?.runtimeSourceKey ?? null,
    actionSemantic: record?.actionSemantic ?? null,
    weaponId: phaseCue?.weaponId ?? actionGrammar?.binding.weaponId ?? null,
    weaponPhase: phaseCue?.phase ?? null,
    maturity: record?.maturity ?? null,
    approved: record !== null
      && isArenaV2FormalAssetProductionApprovedCandidateV1(record.audioAssetId),
    playbackRate,
    gainDb: input.gainDb,
    priority: input.priority,
    missingReason: record !== null
      ? null
      : phaseCue !== null
        ? 'weapon-phase-not-recorded' as const
        : input.actionDefinitionId === null
        ? 'cue-not-recorded' as const
        : 'action-family-not-recorded' as const,
    syntheticAudioFallbackUsed: false as const,
  });
}

export function requireArenaV2FormalAudioCueCandidateV1(
  value: unknown,
): ArenaV2FormalAudioCueResolutionCandidateV1 {
  const resolved = resolveArenaV2FormalAudioCueCandidateV1(value);
  if (!resolved.ready || !resolved.approved) {
    throw new RangeError(
      `Arena V2正式音频未批准覆盖${resolved.actionDefinitionId ?? resolved.cueId}。`,
    );
  }
  return resolved;
}

export const ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  registeredAudioIdentityCount: 98 as const,
  registeredImpactAudioIdentityCount: 21 as const,
  registeredWeaponImpactAudioIdentityCount: 20 as const,
  weaponCombatGrammarSourceContentHash:
    ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.contentHash,
  weaponCombatGrammarIdentityCount: 40 as const,
  impactActionLookupPolicy: 'exact-action-definition-id' as const,
  phaseCombatGrammarIdentity: null,
  nonWeaponCombatGrammarIdentity: null,
  approvedWeaponImpactAudioIdentityCount: 0 as const,
  approvedAdditionalUnarmedImpactAudioIdentityCount: 0 as const,
  registeredWeaponPhaseAudioIdentityCount: 60 as const,
  approvedWeaponPhaseAudioIdentityCount: 0 as const,
  registeredModeFeedbackAudioIdentityCount: 13 as const,
  registeredSupplyFeedbackAudioIdentityCount: 4 as const,
  approvedModeAndSupplyAudioIdentityCount: 0 as const,
  syntheticAudioFallbackAllowed: false as const,
  validationStatus: 'not-run' as const,
});
