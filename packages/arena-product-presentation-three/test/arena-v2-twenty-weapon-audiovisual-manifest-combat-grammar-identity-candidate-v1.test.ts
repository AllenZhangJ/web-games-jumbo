import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1,
  ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1,
  ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_METADATA_CANDIDATE_V1,
  requireArenaV2WeaponAudiovisualProductionManifestCombatGrammarIdentityCandidateV1,
} from '../src/index.js';

describe('Arena V2 audiovisual manifest combat grammar identity candidate V1 (not run)', () => {
  it('binds 20 impact records by formal Definition and the same 40 identities', () => {
    const source = ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1;
    const manifest = ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1;
    const impactRecords = ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter((record) => (
      record.weaponDefinitionId !== null && record.actionSemantic !== null
    ));
    expect(manifest).toHaveLength(20);
    expect(impactRecords).toHaveLength(20);
    expect(manifest.map(({ equipmentDefinitionId }) => equipmentDefinitionId)).toEqual(
      source.entries.map(({ weaponDefinitionId }) => weaponDefinitionId),
    );
    for (const entry of manifest) {
      const sourceEntry = source.entries.find(
        ({ weaponDefinitionId }) => weaponDefinitionId === entry.equipmentDefinitionId,
      );
      const audio = impactRecords.find(
        ({ weaponDefinitionId }) => weaponDefinitionId === entry.equipmentDefinitionId,
      );
      expect(sourceEntry).toBeDefined();
      expect(audio).toBeDefined();
      expect(entry.impactAudio).toEqual({
        audioAssetId: audio!.audioAssetId,
        weaponDefinitionId: audio!.weaponDefinitionId,
        semantic: audio!.actionSemantic,
        maturity: audio!.maturity,
        productionApproved: false,
      });
      expect(entry.combatGrammarIdentities).toHaveLength(2);
      entry.combatGrammarIdentities.forEach((identity, contextIndex) => {
        const context = sourceEntry!.contexts[contextIndex]!;
        expect(identity).toEqual({
          sourceContentHash: source.contentHash,
          weaponDefinitionId: sourceEntry!.weaponDefinitionId,
          context: context.context,
          actionDefinitionId: context.actionDefinitionId,
          coreVerb: sourceEntry!.coreVerb,
          failureRisk: context.failureRisk,
          counterInputs: context.counterInputs,
        });
        expect(Object.isFrozen(identity)).toBe(true);
        expect(Object.isFrozen(identity.counterInputs)).toBe(true);
        const recipes = entry.feedbackRecipes.filter(
          (recipe) => recipe.actionContext === context.context,
        );
        expect(recipes).toHaveLength(12);
        expect(recipes.every((recipe) => recipe.combatGrammarIdentity === identity)).toBe(true);
      });
      expect(entry.feedbackRecipes).toHaveLength(24);
      expect(entry.authoredPhaseAudioSlots).toHaveLength(3);
      expect(entry.authoredPhaseAudioSlots.every(
        ({ combatGrammarIdentity }) => combatGrammarIdentity === null,
      )).toBe(true);
    }
  });

  it('rejects coherent weapon, context, field and future substitutions', () => {
    const manifest = ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1;
    const first = manifest[0]!;
    const second = manifest[1]!;
    const ground = first.combatGrammarIdentities[0]!;
    const aerial = first.combatGrammarIdentities[1]!;
    expect(() => requireArenaV2WeaponAudiovisualProductionManifestCombatGrammarIdentityCandidateV1(
      first.equipmentDefinitionId,
      ground.context,
      second.combatGrammarIdentities[0],
    )).toThrow(/语法身份漂移/);
    expect(() => requireArenaV2WeaponAudiovisualProductionManifestCombatGrammarIdentityCandidateV1(
      first.equipmentDefinitionId,
      ground.context,
      aerial,
    )).toThrow(/语法身份漂移/);
    expect(() => requireArenaV2WeaponAudiovisualProductionManifestCombatGrammarIdentityCandidateV1(
      first.equipmentDefinitionId,
      ground.context,
      { ...ground, failureRisk: 'forged-failure-risk' },
    )).toThrow(/战斗语法|语法身份漂移/);
    expect(() => requireArenaV2WeaponAudiovisualProductionManifestCombatGrammarIdentityCandidateV1(
      first.equipmentDefinitionId,
      ground.context,
      { ...ground, futureField: true },
    )).toThrow(/不支持字段/);
  });

  it('keeps media counts, non-impact null grammar and production gates unchanged', () => {
    expect(ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1).toHaveLength(98);
    expect(ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(
      ({ actionSemantic }) => actionSemantic === 'base-push',
    )).toHaveLength(1);
    expect(ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(
      ({ cueId }) => cueId === 'participant-fell-movement',
    )).toHaveLength(1);
    expect(ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(
      ({ cueId }) => cueId?.startsWith('arena.cue.audio.weapon-phase.') === true,
    )).toHaveLength(60);
    expect(ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1).toMatchObject({
      registeredAudioIdentityCount: 98,
      registeredImpactAudioIdentityCount: 21,
      registeredWeaponImpactAudioIdentityCount: 20,
      registeredWeaponPhaseAudioIdentityCount: 60,
      registeredModeFeedbackAudioIdentityCount: 13,
      registeredSupplyFeedbackAudioIdentityCount: 4,
      phaseCombatGrammarIdentity: null,
      nonWeaponCombatGrammarIdentity: null,
      hardGate: false,
      validationStatus: 'not-run',
    });
    expect(ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_METADATA_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        weaponCombatGrammarIdentityCount: 40,
        impactAudioLookupPolicy: 'exact-weapon-definition-id',
        phaseCombatGrammarIdentity: null,
        modeSupplyMovementUnarmedCombatGrammarIdentity: null,
        registeredAudioIdentityCount: 98,
        registeredImpactAudioCount: 20,
        authoredPhaseAudioCandidateTotal: 60,
        defaultSurfaceWired: false,
        defaultEntryWired: false,
        defaultNavigationWired: false,
        productionReady: false,
      });
  });

  it('contains no local weapon semantic table or substring action lookup', () => {
    const source = readFileSync(new URL(
      '../src/arena-v2-twenty-weapon-audiovisual-production-manifest-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(source).not.toContain('AUDIO_SEMANTIC_BY_WEAPON_ID');
    expect(source).not.toContain('actionDefinitionId.includes(');
    expect(source).toContain('item.weaponDefinitionId === equipmentDefinitionId');
    expect(source).toContain(
      'requireArenaV2WeaponCombatGrammarSourceIdentityByActionDefinitionIdCandidateV1',
    );
  });
});
