import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const PRODUCTION_ROOTS = Object.freeze([
  'src/arena',
  'packages/arena-v1-composition/src',
  'packages/arena-v1-application-launch/src',
  'packages/arena-v1-application-session/src',
  'packages/arena-product-composition/src',
  'packages/arena-product-presentation-three/src',
  'packages/arena-product-v1-content/src',
]);

const P4_AUTHORITY_FILES = Object.freeze([
  'packages/arena-bot/src/survival-enemy-weapon-affordance-v1.ts',
  'packages/arena-contracts/src/weapon-feedback-semantic-v1.ts',
  'packages/arena-contracts/src/weapon-feedback-result-direction-v2.ts',
  'packages/arena-contracts/src/weapon-feedback-direction-fact-v2.ts',
  'packages/arena-contracts/src/action-feedback-outcome-consistency-v1.ts',
  'packages/arena-contracts/src/competitive-equipment-action-eligibility-v1.ts',
  'packages/arena-contracts/src/survival-equipment-action-eligibility-v1.ts',
  'packages/arena-core/src/weapon-feedback-resolver-v1.ts',
  'packages/arena-core/src/weapon-feedback-result-direction-resolver-v2.ts',
  'packages/arena-core/src/begin-down-smash-action-effect-handler-v1.ts',
  'packages/arena-core/src/default-targeting-handlers.ts',
  'packages/arena-definitions/src/arena-gameplay-v2-tuning.ts',
  'packages/arena-definitions/src/weapon-combat-grammar-definition-v1.ts',
  'packages/arena-equipment/src/equipment-supply-timeline-system.ts',
  'packages/arena-match/src/survival-match-read-frame-v3-adapter.ts',
  'packages/arena-match/src/match-core-weapon-feedback-adapter-v1.ts',
  'packages/arena-match/src/match-core-weapon-feedback-bundle-owner-v2.ts',
  'packages/arena-match/src/match-core-weapon-feedback-direction-checkpoint-v2.ts',
  'packages/arena-match/src/match-core-weapon-feedback-direction-owner-v2.ts',
  'packages/arena-match/src/survival-pressure-resolver-v1.ts',
  'packages/arena-presentation-runtime/src/arena-v2-weapon-feedback-presentation.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-read-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-adapter-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-port-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-direction-read-plan-candidate-v2.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v2.ts',
  'packages/arena-product-presentation/src/arena-v2-weapon-impact-strength-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-validated-presentation-host-v1.ts',
  'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
  'packages/arena-product-content/src/arena-v2-baseline-weapon-candidate-support-v1.ts',
  'packages/arena-product-content/src/arena-v2-heavy-hammer-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-gravity-chain-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-charge-shield-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-line-suppressor-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-read-counter-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-flank-blade-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-launch-weapon-catalog-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-expanded-weapon-candidates-v1.ts',
  'packages/arena-product-content/src/arena-v2-collection-weapon-catalog-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-unarmed-action-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-survival-baseline-weapon-tiers-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-survival-pressure-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-single-weapon-production-readiness-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-single-weapon-registration-configuration-envelope-candidate-v1.ts',
  'packages/arena-regression/src/arena-baseline-weapon-consequence-verification-v1.ts',
  'packages/arena-regression/src/arena-baseline-weapon-matchcore-replay-verification-v1.ts',
  'packages/arena-regression/src/arena-expanded-weapon-counterplay-verification-v1.ts',
  'packages/arena-regression/src/arena-expanded-weapon-spatial-counterplay-verification-v1.ts',
  'packages/arena-regression/src/arena-expanded-weapon-verification-v1.ts',
  'packages/arena-regression/src/arena-line-suppressor-verification-v1.ts',
  'packages/arena-regression/src/arena-read-counter-verification-v1.ts',
  'packages/arena-regression/src/arena-flank-blade-verification-v1.ts',
  'packages/arena-regression/src/arena-survival-baseline-weapon-supply-verification-v1.ts',
  'packages/arena-regression/src/arena-survival-weapon-tier-consequence-verification-v1.ts',
  'packages/arena-regression/src/arena-survival-weapon-bot-affordance-verification-v1.ts',
  'packages/arena-regression/src/arena-survival-tiered-supply-matchcore-verification-v1.ts',
  'packages/arena-regression/src/arena-survival-pressure-bot-long-run-verification-v1.ts',
  'packages/arena-regression/src/arena-three-mode-weapon-feedback-checkpoint-capability-v1.ts',
  'packages/arena-regression/src/arena-three-mode-weapon-feedback-direction-capability-v2.ts',
  'packages/arena-regression/src/arena-three-mode-weapon-feedback-restore-suffix-candidate-v1.ts',
  'packages/arena-regression/src/arena-three-mode-weapon-feedback-failure-injection-candidate-v1.ts',
  'packages/arena-regression/src/arena-three-mode-content-selection-checkpoint-capability-v1.ts',
  'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
]);

const CANDIDATE_FILES = Object.freeze([
  'packages/arena-contracts/src/weapon-feedback-result-direction-v2.ts',
  'packages/arena-contracts/src/weapon-feedback-direction-fact-v2.ts',
  'packages/arena-contracts/src/action-feedback-outcome-consistency-v1.ts',
  'packages/arena-contracts/src/competitive-equipment-action-eligibility-v1.ts',
  'packages/arena-contracts/src/survival-equipment-action-eligibility-v1.ts',
  'packages/arena-core/src/weapon-feedback-result-direction-resolver-v2.ts',
  'packages/arena-match/src/match-core-weapon-feedback-direction-checkpoint-v2.ts',
  'packages/arena-match/src/match-core-weapon-feedback-direction-owner-v2.ts',
  'packages/arena-match/src/match-core-weapon-feedback-bundle-owner-v2.ts',
  'packages/arena-product-content/src/arena-v2-heavy-hammer-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-gravity-chain-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-charge-shield-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-line-suppressor-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-read-counter-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-flank-blade-weapon-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-launch-weapon-catalog-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-expanded-weapon-candidates-v1.ts',
  'packages/arena-product-content/src/arena-v2-collection-weapon-catalog-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-unarmed-action-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-survival-baseline-weapon-tiers-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-survival-pressure-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-single-weapon-registration-configuration-envelope-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-read-plan-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-adapter-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-port-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-direction-read-plan-candidate-v2.ts',
  'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v2.ts',
  'packages/arena-product-presentation/src/arena-v2-weapon-impact-strength-projection-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-mode-hud-validated-presentation-host-v1.ts',
  'packages/arena-regression/src/arena-three-mode-weapon-feedback-restore-suffix-candidate-v1.ts',
  'packages/arena-regression/src/arena-three-mode-weapon-feedback-direction-capability-v2.ts',
  'packages/arena-regression/src/arena-three-mode-weapon-feedback-failure-injection-candidate-v1.ts',
  'packages/arena-regression/src/arena-three-mode-content-selection-checkpoint-capability-v1.ts',
  'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
]);

const CANDIDATE_METADATA_FILES = Object.freeze(CANDIDATE_FILES.filter((file) => (
  file.includes('-candidate-')
)));

const EXPECTED_EXPORTS = Object.freeze([
  ['packages/arena-bot/src/index.ts', './survival-enemy-weapon-affordance-v1.js'],
  ['packages/arena-contracts/src/index.ts', './weapon-feedback-semantic-v1.js'],
  ['packages/arena-contracts/src/index.ts', './weapon-feedback-result-direction-v2.js'],
  ['packages/arena-contracts/src/index.ts', './weapon-feedback-direction-fact-v2.js'],
  ['packages/arena-contracts/src/index.ts', './action-feedback-outcome-consistency-v1.js'],
  ['packages/arena-contracts/src/index.ts', './competitive-equipment-action-eligibility-v1.js'],
  ['packages/arena-contracts/src/index.ts', './survival-equipment-action-eligibility-v1.js'],
  ['packages/arena-core/src/index.ts', './weapon-feedback-resolver-v1.js'],
  ['packages/arena-core/src/index.ts', './weapon-feedback-result-direction-resolver-v2.js'],
  ['packages/arena-core/src/index.ts', './begin-down-smash-action-effect-handler-v1.js'],
  [
    'packages/arena-product-composition/src/index.ts',
    './arena-v2-single-weapon-registration-configuration-envelope-candidate-v1.js',
  ],
  ['packages/arena-definitions/src/index.ts', './weapon-combat-grammar-definition-v1.js'],
  ['packages/arena-match/src/index.ts', './survival-match-read-frame-v3-adapter.js'],
  ['packages/arena-match/src/index.ts', './match-core-weapon-feedback-adapter-v1.js'],
  ['packages/arena-match/src/index.ts', './match-core-weapon-feedback-bundle-owner-v2.js'],
  ['packages/arena-match/src/index.ts', './match-core-weapon-feedback-direction-checkpoint-v2.js'],
  ['packages/arena-match/src/index.ts', './match-core-weapon-feedback-direction-owner-v2.js'],
  ['packages/arena-match/src/index.ts', './survival-pressure-resolver-v1.js'],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-heavy-hammer-weapon-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-gravity-chain-weapon-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-charge-shield-weapon-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-line-suppressor-weapon-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-read-counter-weapon-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-flank-blade-weapon-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-launch-weapon-catalog-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-expanded-weapon-candidates-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-collection-weapon-catalog-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-unarmed-action-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-survival-baseline-weapon-tiers-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-survival-pressure-candidate-v1.js',
  ],
  [
    'packages/arena-product-presentation/src/index.ts',
    './arena-v2-mode-hud-feedback-effect-consumer-v1.js',
  ],
  [
    'packages/arena-product-presentation/src/index.ts',
    './arena-v2-twenty-weapon-feedback-read-plan-candidate-v1.js',
  ],
  [
    'packages/arena-product-presentation/src/index.ts',
    './arena-v2-twenty-weapon-feedback-hud-adapter-candidate-v1.js',
  ],
  [
    'packages/arena-product-presentation/src/index.ts',
    './arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.js',
  ],
  [
    'packages/arena-product-presentation/src/index.ts',
    './arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v1.js',
  ],
  [
    'packages/arena-product-presentation/src/index.ts',
    './arena-v2-twenty-weapon-feedback-vfx-port-candidate-v1.js',
  ],
  [
    'packages/arena-product-presentation/src/index.ts',
    './arena-v2-twenty-weapon-feedback-direction-read-plan-candidate-v2.js',
  ],
  [
    'packages/arena-product-presentation/src/index.ts',
    './arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v2.js',
  ],
  [
    'packages/arena-product-presentation/src/index.ts',
    './arena-v2-weapon-impact-strength-projection-candidate-v1.js',
  ],
  [
    'packages/arena-product-presentation/src/index.ts',
    './arena-v2-mode-hud-validated-presentation-host-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-baseline-weapon-consequence-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-baseline-weapon-matchcore-replay-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-expanded-weapon-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-line-suppressor-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-read-counter-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-flank-blade-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-survival-baseline-weapon-supply-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-survival-weapon-tier-consequence-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-survival-weapon-bot-affordance-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-survival-tiered-supply-matchcore-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-survival-pressure-bot-long-run-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-three-mode-weapon-feedback-checkpoint-capability-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-three-mode-weapon-feedback-direction-capability-v2.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-three-mode-weapon-feedback-restore-suffix-candidate-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-three-mode-weapon-feedback-failure-injection-candidate-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-three-mode-content-selection-checkpoint-capability-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-three-mode-authoritative-quick-match-composition-candidate-v1.js',
  ],
] as const);

const P4_REACHABILITY = new RegExp([
  '\\b(?:createSurvivalEnemyPrimaryActionAffordanceV1|createArenaWeaponFeedbackSemanticEventV1|resolveArenaWeaponFeedbackSemanticV1|MatchCoreWeaponFeedbackAdapterV1|projectArenaWeaponFeedbackEventV6PresentationEvent|WEAPON_FEEDBACK_RESOLVED|getPublicSupplyProjectionV3|composeSurvivalMatchReadFrameV3|SurvivalPressureResolverV1|waveEquipmentOverrides|createWeaponCombatGrammarDefinitionV1|ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1',
  '|createArenaWeaponFeedbackResultDirectionV2',
  '|createArenaWeaponFeedbackDirectionFactV2',
  '|resolveArenaWeaponFeedbackResultDirectionV2',
  '|createMatchCoreWeaponFeedbackDirectionCheckpointV2',
  '|MatchCoreWeaponFeedbackDirectionOwnerV2',
  '|MatchCoreWeaponFeedbackBundleOwnerV2',
  '|ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_FLANK_BLADE_WEAPON_CANDIDATE_V1',
  '|ARENA_V2_LAUNCH_WEAPON_CATALOG_CANDIDATE_V1',
  '|ARENA_V2_EXPANDED_WEAPON_CATALOG_CANDIDATE_V1',
  '|ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1',
  '|ARENA_V2_UNARMED_ACTION_CANDIDATE_V1',
  '|ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1',
  '|ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1',
  '|createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1',
  '|runArenaBaselineWeaponConsequenceVerificationCandidateV1',
  '|runArenaBaselineWeaponMatchCoreReplayVerificationCandidateV1',
  '|runArenaExpandedWeaponCounterplayVerificationCandidateV1',
  '|runArenaExpandedWeaponSpatialCounterplayVerificationCandidateV1',
  '|runArenaExpandedWeaponVerificationCandidateV1',
  '|runArenaLineSuppressorVerificationCandidateV1',
  '|runArenaReadCounterVerificationCandidateV1',
  '|runArenaFlankBladeVerificationCandidateV1',
  '|runArenaSurvivalBaselineWeaponSupplyVerificationCandidateV1',
  '|runArenaSurvivalWeaponTierConsequenceVerificationCandidateV1',
  '|runArenaSurvivalWeaponBotAffordanceVerificationCandidateV1',
  '|runArenaSurvivalTieredSupplyMatchCoreVerificationCandidateV1',
  '|runArenaSurvivalTenWaveMatchCoreVerificationCandidateV1',
  '|runArenaSurvivalPressureBotLongRunVerificationCandidateV1)\\b',
  '|runArenaThreeModeWeaponFeedbackRestoreSuffixCandidateV1\\b',
  '|createArenaThreeModeWeaponFeedbackFailureInjectionRuntimeV1\\b',
  '|createArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2\\b',
  '|createArenaThreeModeContentSelectionCheckpointCapabilityV1\\b',
  '|ArenaV2ModeHudFeedbackEffectConsumerV1\\b',
  '|projectArenaV2TwentyWeaponFeedbackReadPlanCandidateV1\\b',
  '|specializeArenaV2TwentyWeaponFeedbackHudCandidateV1\\b',
  '|ArenaV2TwentyWeaponFeedbackHudHostCandidateV1\\b',
  '|resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1\\b',
  '|ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_(?:CUE_RECORDS|RESOLUTION|PORT)_CANDIDATE_V1\\b',
  '|ArenaV2TwentyWeaponFeedbackVfxPortCandidateV1\\b',
  '|projectArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2\\b',
  '|resolveArenaV2TwentyWeaponFeedbackVfxCandidateV2\\b',
  '|projectArenaV2WeaponImpactStrengthCandidateV1\\b',
  '|ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1\\b',
  '|/(?:weapon-feedback-semantic-v1',
  '|weapon-feedback-resolver-v1',
  '|weapon-feedback-result-direction-v2',
  '|weapon-feedback-direction-fact-v2',
  '|weapon-feedback-result-direction-resolver-v2',
  '|arena-v2-mode-hud-feedback-effect-consumer-v1',
  '|match-core-weapon-feedback-direction-checkpoint-v2',
  '|match-core-weapon-feedback-direction-owner-v2',
  '|match-core-weapon-feedback-bundle-owner-v2',
  '|match-core-weapon-feedback-adapter-v1',
  '|weapon-combat-grammar-definition-v1',
  '|survival-match-read-frame-v3-adapter',
  '|survival-pressure-resolver-v1',
  '|arena-v2-heavy-hammer-weapon-candidate-v1',
  '|arena-v2-gravity-chain-weapon-candidate-v1',
  '|arena-v2-charge-shield-weapon-candidate-v1',
  '|arena-v2-line-suppressor-weapon-candidate-v1',
  '|arena-v2-read-counter-weapon-candidate-v1',
  '|arena-v2-flank-blade-weapon-candidate-v1',
  '|arena-v2-launch-weapon-catalog-candidate-v1',
  '|arena-v2-expanded-weapon-candidates-v1',
  '|arena-v2-collection-weapon-catalog-candidate-v1',
  '|arena-v2-unarmed-action-candidate-v1',
  '|arena-v2-survival-baseline-weapon-tiers-candidate-v1',
  '|arena-v2-survival-pressure-candidate-v1',
  '|arena-baseline-weapon-consequence-verification-v1',
  '|arena-baseline-weapon-matchcore-replay-verification-v1',
  '|arena-expanded-weapon-counterplay-verification-v1',
  '|arena-expanded-weapon-spatial-counterplay-verification-v1',
  '|arena-expanded-weapon-verification-v1',
  '|arena-line-suppressor-verification-v1',
  '|arena-read-counter-verification-v1',
  '|arena-flank-blade-verification-v1',
  '|arena-survival-baseline-weapon-supply-verification-v1',
  '|arena-survival-weapon-tier-consequence-verification-v1',
  '|arena-survival-weapon-bot-affordance-verification-v1',
  '|arena-survival-tiered-supply-matchcore-verification-v1',
  '|arena-survival-pressure-bot-long-run-verification-v1',
  '|arena-three-mode-weapon-feedback-restore-suffix-candidate-v1)\\.js',
  '|arena-three-mode-weapon-feedback-failure-injection-candidate-v1\\.js',
  '|arena-three-mode-weapon-feedback-direction-capability-v2\\.js',
  '|arena-three-mode-content-selection-checkpoint-capability-v1\\.js',
  '|arena-v2-twenty-weapon-feedback-read-plan-candidate-v1\\.js',
  '|arena-v2-twenty-weapon-feedback-hud-adapter-candidate-v1\\.js',
  '|arena-v2-twenty-weapon-feedback-hud-host-candidate-v1\\.js',
  '|arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v1\\.js',
  '|arena-v2-twenty-weapon-feedback-vfx-port-candidate-v1\\.js',
  '|arena-v2-twenty-weapon-feedback-direction-read-plan-candidate-v2\\.js',
  '|arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v2\\.js',
  '|arena-v2-weapon-impact-strength-projection-candidate-v1\\.js',
  '|arena-three-mode-authoritative-quick-match-composition-candidate-v1\\.js',
].join(''), 'u');

const FORBIDDEN_AUTHORITY_PATTERNS = Object.freeze([
  ['experiment dependency', /@number-strategy-jump\/arena-v1-experiment/u],
  ['legacy content dependency', /@number-strategy-jump\/arena-v1-content/u],
  ['legacy composition dependency', /@number-strategy-jump\/arena-v1-composition/u],
  ['Three.js', /(?:from\s+['"]three['"]|arena-presentation-three)/u],
  ['DOM window', /\bwindow(?:\.(?!js(?:['"]|$))|\[)/u],
  ['DOM document', /\bdocument(?:\.|\[)/u],
  ['platform navigator', /\bnavigator(?:\.|\[)/u],
  ['unseeded random', /\bMath\.random\s*\(/u],
  ['wall clock', /\b(?:Date|performance)\.now\s*\(/u],
  ['async timer', /\bset(?:Timeout|Interval)\s*\(/u],
] as const);

const CANDIDATE_COMPOSITION_ALLOWLIST = new Set([
  'packages/arena-product-composition/src/arena-v2-learning-evidence-composition-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-in-memory-registry-publication-port-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-local-counterplay-bot-current-facts-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-registry-publication-envelope-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-single-weapon-registry-snapshot-candidate-v1.ts',
  'packages/arena-product-presentation-three/src/arena-v2-a4-weapon-attachment-production-review-preparation-candidate-v1.ts',
  'packages/arena-product-presentation-three/src/arena-v2-a5-core-feedback-vfx-production-review-preparation-candidate-v1.ts',
]);

async function typescriptFiles(root: string): Promise<readonly string[]> {
  const result: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...await typescriptFiles(candidate));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(candidate);
  }
  return result;
}

async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  for (const [file, expectedExport] of EXPECTED_EXPORTS) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    if (!source.includes(expectedExport)) throw new Error(`${file} 缺少 ${expectedExport}。`);
  }
  for (const file of P4_AUTHORITY_FILES) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    for (const [label, pattern] of FORBIDDEN_AUTHORITY_PATTERNS) {
      if (pattern.test(source)) throw new Error(`${file} 包含禁止的 ${label}。`);
    }
  }
  for (const root of PRODUCTION_ROOTS) {
    for (const file of await typescriptFiles(path.join(repositoryRoot, root))) {
      const relative = path.relative(repositoryRoot, file);
      if (CANDIDATE_COMPOSITION_ALLOWLIST.has(relative)) continue;
      const source = await readFile(file, 'utf8');
      if (P4_REACHABILITY.test(source)) {
        throw new Error(`${file} 在P4门批准前接入了武器候选。`);
      }
    }
  }
  for (const file of CANDIDATE_METADATA_FILES) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    for (const marker of [
      "status: 'production-unreachable'",
      'hardGate: false',
      'defaultRegistryWired: false',
    ]) {
      if (!source.includes(marker)) throw new Error(`${file} 缺少 ${marker}。`);
    }
  }
  const shield = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-content/src/arena-v2-charge-shield-weapon-candidate-v1.ts',
  ), 'utf8');
  if (!shield.includes('guardEnabled: false') || !shield.includes('forbiddenEffectKinds:')) {
    throw new Error('Charge Shield候选必须显式关闭格挡并声明禁止effect集合。');
  }
  const directionOwner = await readFile(path.join(
    repositoryRoot,
    'packages/arena-match/src/match-core-weapon-feedback-direction-owner-v2.ts',
  ), 'utf8');
  for (const marker of [
    "const FEEDBACK_EVENT_ID_PREFIX = 'feedback:'",
    'hitSourceEventIdFromFeedbackEventId(event.id)',
    'openHitSourceEventIdsByTargetAndAttacker',
    'groupedHitEventsCanPrecedeKnockbacks: true',
    'sameTargetRepeatedHitsUseDeterministicFifo: true',
    'uncreditedEliminationTargets.has(entry.targetId)',
    'movementFallTargets.has(entry.targetId)',
    'nextFeedbackCheckpoint.pendingHits.map(({ sourceEventId }) => sourceEventId)',
  ]) {
    if (!directionOwner.includes(marker)) {
      throw new Error(`P4 feedback direction owner缺少闭环标记：${marker}。`);
    }
  }
  const feedbackAdapter = await readFile(path.join(
    repositoryRoot,
    'packages/arena-match/src/match-core-weapon-feedback-adapter-v1.ts',
  ), 'utf8');
  for (const marker of [
    'const supersededFinalSupportSurfaceId = participant.supportSurfaceId',
    '?? lastSupportedSurfaceIds.get(targetId)',
    '?? previous.initialSupportSurfaceId',
  ]) {
    if (!feedbackAdapter.includes(marker)) {
      throw new Error(`P4 feedback adapter缺少连续命中归因标记：${marker}。`);
    }
  }
  const effectConsumer = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#consumedVisualIdentities',
    'visualItemsToPresent',
    '!this.#activeVisualIds.has(sourceEventId)',
    '!consumedVisualIdentitiesById.has(sourceEventId)',
    'ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.seenIdentityCount',
    'sameTickDistinctFeedbackIdsPreserved: true',
    'laterRevisionDoesNotReplayConsumedVisualIdentity: true',
    'consumedVisualIdentityDriftFailsClosed: true',
  ]) {
    if (!effectConsumer.includes(marker)) {
      throw new Error(`P4 feedback effect consumer缺少一次性身份标记：${marker}。`);
    }
  }
  for (const file of [
    'packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts',
    'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
  ]) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    for (const marker of [
      'pendingFeedbackHitsByTarget',
      'multiTargetFeedbackUsesPerTargetFifo: true',
    ]) {
      if (!source.includes(marker)) {
        throw new Error(`${file} 缺少多目标反馈因果闭环标记：${marker}。`);
      }
    }
    if (source.includes('let openFeedbackHit:')) {
      throw new Error(`${file} 不得恢复会覆盖同tick多目标命中的单槽反馈状态。`);
    }
  }
  const replayLearning = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
  ), 'utf8');
  for (const marker of [
    'createParticipantEquipmentUsageV3FromEvents',
    'assertArenaV6ActionFeedbackOutcomeConsistencyV1',
    'assertArenaV6CompetitiveEquipmentActionEligibilityV1',
    'assertArenaV6SurvivalEquipmentActionEligibilityV1',
    'const usedWeapons = new Set',
    'effectiveWeapons.add(binding.weaponDefinitionId)',
    'WeaponFeedback缺少同动作同tick的权威起手',
  ]) {
    if (!replayLearning.includes(marker)) {
      throw new Error(`P4 Replay Learning缺少真实反馈归因标记：${marker}。`);
    }
  }
  const survivalActionEligibility = await readFile(path.join(
    repositoryRoot,
    'packages/arena-contracts/src/survival-equipment-action-eligibility-v1.ts',
  ), 'utf8');
  for (const marker of [
    'Survival equipment ActionStarted不能来自非active参与者。',
    'Survival enemy slot change与当前generation不闭合。',
    'not judge delayed feedback',
  ]) {
    if (!survivalActionEligibility.includes(marker)) {
      throw new Error(`P4.4cl Survival装备动作资格缺少${marker}。`);
    }
  }
  const competitiveActionEligibility = await readFile(path.join(
    repositoryRoot,
    'packages/arena-contracts/src/competitive-equipment-action-eligibility-v1.ts',
  ), 'utf8');
  for (const marker of [
    'Competitive equipment ActionStarted不能来自非active参与者。',
    'Race respawn schedule必须闭合当前掉落与固定延迟。',
    'does not re-evaluate hit outcomes',
  ]) {
    if (!competitiveActionEligibility.includes(marker)) {
      throw new Error(`P4.4cm Duel/Race装备动作资格缺少${marker}。`);
    }
  }
  for (const file of [
    'packages/arena-match/src/replay-v6.ts',
    'packages/arena-product-match/src/mode-product-result-assembler-v3.ts',
    'packages/arena-product-match/src/product-result-replay-settlement-evidence-v1.ts',
  ]) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    if (!source.includes('assertArenaV6CompetitiveEquipmentActionEligibilityV1')) {
      throw new Error(`P4.4cm ${file}缺少Duel/Race动作资格重算。`);
    }
  }
  const actionFeedbackConsistency = await readFile(path.join(
    repositoryRoot,
    'packages/arena-contracts/src/action-feedback-outcome-consistency-v1.ts',
  ), 'utf8');
  for (const marker of [
    'Action feedback outcome缺少同攻击者、动作与起手tick的先行权威起手。',
    '同一权威动作的attack-evaded不能重复或与命中结果共存。',
    'delayed hit outcomes stay legal',
  ]) {
    if (!actionFeedbackConsistency.includes(marker)) {
      throw new Error(`P4.4cn 动作反馈结果一致性缺少${marker}。`);
    }
  }
  for (const file of [
    'packages/arena-match/src/replay-v6.ts',
    'packages/arena-product-match/src/mode-product-result-assembler-v3.ts',
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
  ]) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    if (!source.includes('assertArenaV6ActionFeedbackOutcomeConsistencyV1')) {
      throw new Error(`P4.4cn ${file}缺少动作反馈因果重算。`);
    }
  }
  const firstWeaponProvisioningOwner = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-first-weapon-registry-provisioning-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'failedRuntimeBootstrapCleanupRetainsOwner: true',
    'runtimeBootstrapRetryCleansPriorFailedInstance: true',
    'destroyRetriesOnlyOwnedChildren: true',
    'this.#runtimeBootstrap = cleanupIncomplete ? bootstrap : null',
    'failedBootstrap.destroy()',
    'if (this.#runtimeBootstrap === failedBootstrap) this.#runtimeBootstrap = null',
    'if (this.#initializationOwner === owner) this.#initializationOwner = null',
    'if (this.#runtimeBootstrap === bootstrap) this.#runtimeBootstrap = null',
  ]) {
    if (!firstWeaponProvisioningOwner.includes(marker)) {
      throw new Error(`P4首把Registry provisioning缺少失败清理所有权标记：${marker}。`);
    }
  }
  const singleWeaponReadiness = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-single-weapon-production-readiness-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'isArenaV2FormalAssetProductionApprovedCandidateV1',
    'isArenaV2FormalModelLoadPermittedCandidateV1',
    'productionApprovalUsesSharedLedgerIndex: true',
    'modelApprovalRequiresExternalTextureDependencyClosure: true',
    'productionResolutionApproved: resolution.approved',
  ]) {
    if (!singleWeaponReadiness.includes(marker)) {
      throw new Error(`P4逐武器准入缺少共享生产批准索引标记：${marker}。`);
    }
  }
  for (const forbidden of [
    'intakeResolutionApproved:',
    'productionApproved: attachment.productionApproved',
    'productionApproved: asset.productionApproved',
  ]) {
    if (singleWeaponReadiness.includes(forbidden)) {
      throw new Error(`P4逐武器准入仍包含旧批准旁路：${forbidden}。`);
    }
  }
  const registryPromotionCoordinator = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-single-weapon-registry-promotion-coordinator-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'destroyRejectsUnsealedPersistentPublicationBeforeAnyCleanup: true',
    'destroyAttemptsIndependentOwnedChildren: true',
    'destroyClearsOnlySuccessfullyReleasedChildren: true',
    'if (this.#registryReference === reference) this.#registryReference = null',
    'if (this.#registrationHost === host) this.#registrationHost = null',
    'Arena V2 Registry promotion coordinator清理不完整',
  ]) {
    if (!registryPromotionCoordinator.includes(marker)) {
      throw new Error(`P4 Registry promotion coordinator缺少可重试清理标记：${marker}。`);
    }
  }
  const persistentRegistrationHost = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-single-weapon-persistent-registration-host-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'destroyDependencyOrderPreserved: true',
    'destroyClearsOnlySuccessfullyReleasedChildren: true',
    'failedChildCleanupRemainsRetryable: true',
    'if (this.#owner === owner) this.#owner = null',
    'if (this.#owner === null && this.#port !== null)',
    'if (this.#port === port) this.#port = null',
    'Arena V2 persistent registration host清理不完整',
  ]) {
    if (!persistentRegistrationHost.includes(marker)) {
      throw new Error(`P4 persistent registration host缺少依赖顺序清理标记：${marker}。`);
    }
  }
  const registryBackedLocalPlayableOwner = await readFile(path.join(
    repositoryRoot,
    'packages/arena-regression/src/arena-v2-registry-backed-local-playable-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'activePromotionMustResolveBeforeAnyOuterCleanup: true',
    'destroyAttemptsIndependentDependents: true',
    'registryBootstrapReleasesAfterDependents: true',
    'destroyClearsOnlySuccessfullyReleasedChildren: true',
    'constructionCleanupRetainsNestedLocalPlayableDebt: true',
    'constructionCleanupWaitsForLocalPlayableBeforeRegistryBootstrap: true',
    'constructionCleanupRetriesOnlyIncompleteOwners: true',
    'firstProvisioningFactoryDoesNotDoubleDestroyRetainedBootstrap: true',
    'if (this.#promotionCoordinator === coordinator)',
    'if (this.#localPlayable === localPlayable) this.#localPlayable = null',
    'this.#promotionCoordinator === null',
    '&& this.#localPlayable === null',
    '&& this.#registryBootstrap !== null',
    'Arena V2 Registry-backed local owner清理不完整',
    'Arena V2 Registry-backed local owner必须先收口活动武器晋级',
  ]) {
    if (!registryBackedLocalPlayableOwner.includes(marker)) {
      throw new Error(`P4 Registry-backed local owner缺少依赖清理标记：${marker}。`);
    }
  }
  for (const marker of [
    'assessmentOnlyConfigurationEnvelopeWired: true',
    'callerSuppliedPlanCompatibilityEntryRetained: true',
    'assessmentOnlyCallerSuppliedPlanAllowed: false',
    'availabilityFactPreviousAndNextSequencesRevalidated: true',
    'availabilityFactAppendsNextCatalogWeaponOnly: true',
    'availabilityFactHashAndRevisionClosed: true',
    'outerOptionsDescriptorSnapshotBeforeConstruction: true',
    'localPlayableOptionsDescriptorSnapshotBeforeSpread: true',
    'firstProvisioningOptionsDescriptorSnapshotBeforeHandoff: true',
    'optionAccessorsExecuted: false',
    'const parsedOptions = ownerOptions(options)',
    'const descriptors = Object.getOwnPropertyDescriptors(value)',
    'Object.getOwnPropertySymbols(value).length > 0',
    'Object.defineProperty(snapshot, key, {',
    'const values = new Map<string, unknown>()',
    'values.set(key, descriptor.value)',
    'BEGIN_PROMOTION_FROM_ASSESSMENT_OPTION_KEYS',
    'exactPromotionOptions(',
    'createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1({',
    'registryReference: this.#registryBootstrap!',
    'const previousSequence = projectArenaV2RegistryWeaponSequenceCandidateV1(previousIds)',
    'const nextSequence = projectArenaV2RegistryWeaponSequenceCandidateV1(nextIds)',
    'previousSequence.nextWeaponId !== expectedWeaponId',
    'nextSequence.activeWeaponCount !== previousSequence.activeWeaponCount + 1',
    'previousIds.some((weaponId, index) => nextIds[index] !== weaponId)',
    'nextIds[nextIds.length - 1] !== expectedWeaponId',
  ]) {
    if (!registryBackedLocalPlayableOwner.includes(marker)) {
      throw new Error(`P4 Registry-backed local owner缺少配置封套标记：${marker}。`);
    }
  }
  const registrationConfigurationEnvelope = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-single-weapon-registration-configuration-envelope-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "planSource: 'internally-recomputed-twelve-step-plan'",
    'callerSuppliedPlanAllowed: false',
    'callerSuppliedBaseDefinitionsAllowed: false',
    'const descriptors = Object.getOwnPropertyDescriptors(value)',
    'const portOptionValues = new Map<string, unknown>()',
    "!portOptionValues.has('keyPrefix')",
    "!portOptionValues.has('leaseDurationMs')",
    "!portOptionValues.has('leaseTakeoverSameOwner')",
    'createArenaV2SingleWeaponRuntimeRegistrationAssemblyCandidateV1({',
    'createsHost: false',
    'publishesRegistry: false',
    'defaultEntryWired: false',
  ]) {
    if (!registrationConfigurationEnvelope.includes(marker)) {
      throw new Error(`P4单把注册配置封套缺少静态闭包标记：${marker}。`);
    }
  }
  const runtimeRegistrationAssembly = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-single-weapon-runtime-registration-assembly-candidate-v1.ts',
  ), 'utf8');
  const readHeadMismatchMarker =
    "throw new RangeError('Arena V2 runtime registration read与head不一致。');";
  if (runtimeRegistrationAssembly.split(readHeadMismatchMarker).length !== 2) {
    throw new Error('P4 runtime registration read/head不一致分支必须精确保留一条throw。');
  }
  const adaptiveCounterplayOwner = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-information-host-adaptive-counterplay-bot-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#destroying = false',
    'if (this.#destroying)',
    '#releasePort(): void',
    'if (this.#port === port) this.#port = null',
    'failedPortCleanupRetainsRetryOwnership: true',
    'originalAndCleanupFailuresAreAggregated: true',
    'threatSwitchReleasesPriorPortBeforeReplacement: true',
    'invalidHostStepOutcomeFailsClosed: true',
  ]) {
    if (!adaptiveCounterplayOwner.includes(marker)) {
      throw new Error(`P4自适应反制Bot Owner缺少清理所有权标记：${marker}。`);
    }
  }
  const counterplayPort = await readFile(path.join(
    repositoryRoot,
    'packages/arena-product-composition/src/arena-v2-information-host-counterplay-bot-port-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#destroying = false',
    'Arena V2 Information Host反制Bot Port宿主step结果身份漂移',
    'Arena V2 Information Host反制Bot Port失败且清理不完整',
    'this.#controller.destroy()',
    'controllerCleanupCommitsDestroyedAfterSuccess: true',
    'failedControllerCleanupRemainsRetryable: true',
    'originalAndCleanupFailuresAreAggregated: true',
    'controllerInputFailureFailsClosed: true',
    'authorityFactProjectionFailureFailsClosed: true',
  ]) {
    if (!counterplayPort.includes(marker)) {
      throw new Error(`P4反制Bot Port缺少失败清理闭环标记：${marker}。`);
    }
  }
  for (const file of [
    'packages/arena-product-composition/src/arena-v2-first-weapon-registry-provisioning-owner-candidate-v1.ts',
    'packages/arena-product-composition/src/arena-v2-single-weapon-registry-publication-owner-candidate-v1.ts',
    'packages/arena-product-composition/src/arena-v2-single-weapon-registry-promotion-coordinator-candidate-v1.ts',
    'packages/arena-product-composition/src/arena-v2-single-weapon-persistent-registration-host-candidate-v1.ts',
  ]) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    if (source.includes('String(error)')) {
      throw new Error(`${file} 的Registry失败摘要不得执行任意错误值String转换。`);
    }
  }
  console.log(JSON.stringify({
    status: 'passed',
    authorityFileCount: P4_AUTHORITY_FILES.length,
    productionRootCount: PRODUCTION_ROOTS.length,
  }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
