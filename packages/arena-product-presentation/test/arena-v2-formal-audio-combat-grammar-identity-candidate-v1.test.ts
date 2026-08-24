import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  WEAPON_CORE_VERB_V1,
  WEAPON_FAILURE_RISK_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1,
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
  ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1,
  ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_WEAPON_FEEDBACK_ACTION_ALIASES_CANDIDATE_V1,
  requireArenaV2FormalAudioCombatGrammarIdentityCandidateV1,
  resolveArenaV2FormalAudioCueCandidateV1,
} from '../src/index.js';

function command(
  actionDefinitionId: string | null,
  cueId = 'arena.cue.audio.weapon-impact.candidate.v1',
) {
  return Object.freeze({
    sourceEventId: `event:${cueId}:${actionDefinitionId ?? 'none'}`,
    cueId,
    actionDefinitionId,
    bus: 'SFX' as const,
    gainDb: -3 as const,
    priority: 2 as const,
    deterministicVariantIndex: 1 as const,
    maximumConcurrentVoices: 8 as const,
    overflowPolicy: 'drop-lowest-priority' as const,
  });
}

function bindingFor(actionDefinitionId: string) {
  const binding = ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1.find(
    (candidate) => candidate.collectionActionDefinitionId === actionDefinitionId,
  );
  if (binding === undefined) throw new RangeError(`测试动作未闭合：${actionDefinitionId}。`);
  return binding;
}

describe('Arena V2 formal audio combat grammar identity candidate V1 (not run)', () => {
  it('uses the same immutable grammar source for all 20 weapons x 2 contexts', () => {
    expect(ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1).toBe(
      ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
    );
    const identities = ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1
      .entries.flatMap((entry) => entry.contexts.map((context) => {
        const binding = bindingFor(context.actionDefinitionId);
        const resolved = resolveArenaV2FormalAudioCueCandidateV1(command(
          context.actionDefinitionId,
          `arena.cue.audio.weapon-feedback.${binding.weaponId}.${context.context}`
            + '.hit-confirm.duel.candidate.v1',
        ));
        expect(resolved).toMatchObject({
          status: 'production-unreachable',
          implementationStatus: 'code-written-not-run',
          validationStatus: 'not-run',
          hardGate: false,
          ready: true,
          weaponId: binding.weaponId,
          weaponPhase: null,
          combatGrammarIdentity: {
            sourceContentHash:
              ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.contentHash,
            weaponDefinitionId: entry.weaponDefinitionId,
            context: context.context,
            actionDefinitionId: context.actionDefinitionId,
            coreVerb: entry.coreVerb,
            failureRisk: context.failureRisk,
            counterInputs: context.counterInputs,
          },
          playbackRate: 1,
          gainDb: -3,
          priority: 2,
          syntheticAudioFallbackUsed: false,
        });
        expect(Object.isFrozen(resolved.combatGrammarIdentity)).toBe(true);
        expect(Object.isFrozen(resolved.combatGrammarIdentity?.counterInputs)).toBe(true);
        const media = ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.find(
          ({ audioAssetId }) => audioAssetId === resolved.audioAssetId,
        );
        expect(media?.weaponDefinitionId).toBe(entry.weaponDefinitionId);
        return `${entry.weaponDefinitionId}:${context.context}`;
      }));
    expect(identities).toHaveLength(40);
    expect(new Set(identities).size).toBe(40);
  });

  it('keeps phase audio exact by weapon and phase without claiming ground/aerial grammar', () => {
    for (const entry of ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.entries) {
      const ground = entry.contexts[0];
      const binding = bindingFor(ground.actionDefinitionId);
      const cueId = `arena.cue.audio.weapon-phase.${binding.weaponId}.windup.v1`;
      const resolved = resolveArenaV2FormalAudioCueCandidateV1(command(
        ground.actionDefinitionId,
        cueId,
      ));
      expect(resolved).toMatchObject({
        ready: true,
        weaponId: binding.weaponId,
        weaponPhase: 'windup',
        combatGrammarIdentity: null,
      });
      expect(() => resolveArenaV2FormalAudioCueCandidateV1(command(
        ground.actionDefinitionId,
        `arena.cue.audio.weapon-phase.${
          binding.weaponId === 'heavy-hammer' ? 'gravity-chain' : 'heavy-hammer'
        }.windup.v1`,
      ))).toThrow(/阶段音频Cue与精确动作\/Definition身份不一致/);
    }
  });

  it('maps all survival-tier action ids exactly onto the same 40 source identities', () => {
    const resolvedAliases = ARENA_V2_SURVIVAL_WEAPON_FEEDBACK_ACTION_ALIASES_CANDIDATE_V1
      .map((binding) => {
        const resolved = resolveArenaV2FormalAudioCueCandidateV1(command(
          binding.actionDefinitionId,
        ));
        expect(resolved.actionDefinitionId).toBe(binding.actionDefinitionId);
        expect(resolved.combatGrammarIdentity).toMatchObject({
          sourceContentHash:
            ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.contentHash,
          weaponDefinitionId: binding.equipmentDefinitionId,
          context: binding.actionContext,
          actionDefinitionId: binding.collectionActionDefinitionId,
          coreVerb: binding.coreVerb,
          failureRisk: binding.failureRisk,
        });
        return binding.actionDefinitionId;
      });
    expect(resolvedAliases).toHaveLength(400);
    expect(new Set(resolvedAliases).size).toBe(400);
  });

  it.each([
    ['mode-started', null],
    ['supply-spawned', null],
    ['participant-fell-movement', null],
    ['arena.cue.audio.movement-fall.candidate.v1', null],
    ['arena.cue.audio.unarmed-impact.candidate.v1',
      ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1[0]!.id],
  ] as const)('keeps non-weapon cue %s free of weapon grammar', (cueId, actionDefinitionId) => {
    expect(resolveArenaV2FormalAudioCueCandidateV1(command(
      actionDefinitionId,
      cueId,
    )).combatGrammarIdentity).toBeNull();
  });

  it('uses exact action identities and rejects substring, cue and future-field substitution', () => {
    const ground = ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1
      .entries[0]!.contexts[0];
    const forgedSubstring = resolveArenaV2FormalAudioCueCandidateV1(command(
      `forged.${ground.actionDefinitionId}.suffix`,
    ));
    expect(forgedSubstring).toMatchObject({
      ready: false,
      combatGrammarIdentity: null,
      missingReason: 'action-family-not-recorded',
    });
    expect(() => resolveArenaV2FormalAudioCueCandidateV1(command(
      ground.actionDefinitionId,
      'mode-started',
    ))).toThrow(/模式\/供给音频Cue不得携带武器动作身份/);
    const binding = bindingFor(ground.actionDefinitionId);
    expect(() => resolveArenaV2FormalAudioCueCandidateV1(command(
      ground.actionDefinitionId,
      `arena.cue.audio.weapon-feedback.${binding.weaponId}.aerial`
        + '.hit-confirm.duel.candidate.v1',
    ))).toThrow(/Cue与精确动作\/情境身份不一致/);
    expect(() => resolveArenaV2FormalAudioCueCandidateV1(command(
      ground.actionDefinitionId,
      'arena.cue.audio.weapon-feedback.movement-global.movement-fall.duel.candidate.v1',
    ))).toThrow(/移动失足音频不得携带武器动作身份/);
    expect(() => resolveArenaV2FormalAudioCueCandidateV1({
      ...command(ground.actionDefinitionId),
      combatGrammarIdentity: { forged: true },
    })).toThrow(/不支持字段/);
  });

  it('rejects every combat grammar field drift and future fields', () => {
    const entry = ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.entries[0]!;
    const context = entry.contexts[0];
    const identity = {
      sourceContentHash:
        ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.contentHash,
      weaponDefinitionId: entry.weaponDefinitionId,
      context: context.context,
      actionDefinitionId: context.actionDefinitionId,
      coreVerb: entry.coreVerb,
      failureRisk: context.failureRisk,
      counterInputs: context.counterInputs,
    };
    const alternateCoreVerb = Object.values(WEAPON_CORE_VERB_V1).find(
      (value) => value !== entry.coreVerb,
    );
    const alternateFailureRisk = Object.values(WEAPON_FAILURE_RISK_V1).find(
      (value) => value !== context.failureRisk,
    );
    if (alternateCoreVerb === undefined || alternateFailureRisk === undefined) {
      throw new RangeError('测试需要至少两个核心动词与失败风险值。');
    }
    for (const [field, value] of [
      ['sourceContentHash', 'forged-source-content-hash'],
      ['weaponDefinitionId', 'arena-v2.weapon.forged.candidate.v1'],
      ['context', 'aerial'],
      ['actionDefinitionId', 'arena-v2.action.forged.candidate.v1'],
      ['coreVerb', alternateCoreVerb],
      ['failureRisk', alternateFailureRisk],
      ['counterInputs', []],
    ] as const) {
      expect(() => requireArenaV2FormalAudioCombatGrammarIdentityCandidateV1({
        ...identity,
        [field]: value,
      })).toThrow(/战斗语法/);
    }
    expect(() => requireArenaV2FormalAudioCombatGrammarIdentityCandidateV1({
      ...identity,
      futureField: true,
    })).toThrow(/不支持字段/);
  });

  it('preserves the 98-media, variant, voice and bus contracts', () => {
    const impactRecords = ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(
      ({ actionSemantic }) => actionSemantic !== null && actionSemantic !== 'base-push',
    );
    const phaseRecords = ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(
      ({ cueId }) => cueId?.startsWith('arena.cue.audio.weapon-phase.') === true,
    );
    const nonWeaponRecords = ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(
      ({ cueId }) => cueId !== null && !cueId.startsWith('arena.cue.audio.weapon-phase.'),
    );
    expect(ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1).toHaveLength(98);
    expect(impactRecords).toHaveLength(20);
    expect(new Set(impactRecords.map(({ weaponDefinitionId }) => weaponDefinitionId)).size)
      .toBe(20);
    expect(phaseRecords).toHaveLength(60);
    expect(nonWeaponRecords).toHaveLength(17);
    expect(nonWeaponRecords.every(({ weaponDefinitionId }) => weaponDefinitionId === null))
      .toBe(true);
    expect(ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1).toMatchObject({
      registeredAudioIdentityCount: 98,
      registeredWeaponImpactAudioIdentityCount: 20,
      registeredWeaponPhaseAudioIdentityCount: 60,
      weaponCombatGrammarIdentityCount: 40,
      impactActionLookupPolicy: 'exact-action-definition-id',
      phaseCombatGrammarIdentity: null,
      nonWeaponCombatGrammarIdentity: null,
      approvedWeaponImpactAudioIdentityCount: 0,
      approvedWeaponPhaseAudioIdentityCount: 0,
      approvedModeAndSupplyAudioIdentityCount: 0,
      syntheticAudioFallbackAllowed: false,
      hardGate: false,
      validationStatus: 'not-run',
    });
  });
});
