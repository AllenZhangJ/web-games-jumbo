import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_FORMAL_ACTION_PRESENTATIONS_CANDIDATE_V1,
  ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1,
  ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import * as THREE from 'three';

export const ARENA_V2_FIRST_SCREEN_READABILITY_STATUS_CANDIDATE_V1 = Object.freeze({
  IMPLEMENTATION_CANDIDATE_NOT_RUN: 'implementation-candidate-not-run',
  STATIC_CATALOG_ONLY: 'static-catalog-only',
} as const);

export const ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1 = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DISPOSE_INCOMPLETE: 'dispose-incomplete',
  DESTROYED: 'destroyed',
} as const);

type ReadabilityViewState = typeof ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1
];

type ReadabilityStatus = typeof ARENA_V2_FIRST_SCREEN_READABILITY_STATUS_CANDIDATE_V1[
  keyof typeof ARENA_V2_FIRST_SCREEN_READABILITY_STATUS_CANDIDATE_V1
];
type WeaponPlacement = 'held' | 'ground';
type AuthorityActionPhase = 'idle' | 'windup' | 'active' | 'recovery';
type AssetLoadState = 'ready' | 'missing';
type Vector3Tuple = readonly [number, number, number];

const REDUCED_MOTION_STATIC_PHASE_SCALE_AXES = Object.freeze({
  windup: Object.freeze([0.96, 1.06, 1] as const),
  active: Object.freeze([1.08, 0.95, 1.04] as const),
  recovery: Object.freeze([0.98, 1.01, 0.96] as const),
});

const reducedMotionPhaseShapeSignatures = Object.values(
  REDUCED_MOTION_STATIC_PHASE_SCALE_AXES,
).map((axes) => axes.join(','));
if (
  new Set(reducedMotionPhaseShapeSignatures).size !== reducedMotionPhaseShapeSignatures.length
  || Object.values(REDUCED_MOTION_STATIC_PHASE_SCALE_AXES).some((axes) => (
    axes.some((axis) => !Number.isFinite(axis) || axis < 0.95 || axis > 1.08)
    || axes.every((axis) => axis === 1)
  ))
) throw new Error('Arena V2 reduced-motion武器阶段静态形状合同无效。');

export interface ArenaV2WeaponPhasePoseCandidateV1 {
  readonly windup: Readonly<{ readonly rotationX: number; readonly rotationZ: number; readonly scale: number }>;
  readonly active: Readonly<{ readonly rotationX: number; readonly rotationZ: number; readonly scale: number }>;
  readonly recovery: Readonly<{ readonly rotationX: number; readonly rotationZ: number; readonly scale: number }>;
}

const WEAPON_PHASE_POSES = Object.freeze({
  'charge-shield': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.14, scale: 1.04 }), active: Object.freeze({ rotationX: -0.06, rotationZ: 0, scale: 1.06 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.1, scale: 0.98 }) }),
  'heavy-hammer': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.22, scale: 1.05 }), active: Object.freeze({ rotationX: -0.16, rotationZ: -0.08, scale: 1.1 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.16, scale: 0.96 }) }),
  'gravity-chain': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.16, scale: 1.03 }), active: Object.freeze({ rotationX: -0.04, rotationZ: 0, scale: 1.08 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.12, scale: 0.98 }) }),
  'line-suppressor': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.08, scale: 1.02 }), active: Object.freeze({ rotationX: -0.03, rotationZ: 0, scale: 1.09 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.06, scale: 0.99 }) }),
  'read-counter': Object.freeze({ windup: Object.freeze({ rotationX: 0.02, rotationZ: 0.03, scale: 1.02 }), active: Object.freeze({ rotationX: -0.02, rotationZ: 0, scale: 1.04 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.03, scale: 0.99 }) }),
  'flank-blade': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: -0.16, scale: 1.03 }), active: Object.freeze({ rotationX: -0.04, rotationZ: 0.18, scale: 1.08 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.1, scale: 0.97 }) }),
  'hook-spear': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.16, scale: 1.04 }), active: Object.freeze({ rotationX: -0.08, rotationZ: 0, scale: 1.1 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.1, scale: 0.97 }) }),
  'burst-gauntlet': Object.freeze({ windup: Object.freeze({ rotationX: 0.05, rotationZ: 0.08, scale: 1.05 }), active: Object.freeze({ rotationX: -0.12, rotationZ: 0, scale: 1.12 }), recovery: Object.freeze({ rotationX: 0.04, rotationZ: -0.04, scale: 0.96 }) }),
  'vault-lance': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.12, scale: 1.03 }), active: Object.freeze({ rotationX: -0.1, rotationZ: 0, scale: 1.11 }), recovery: Object.freeze({ rotationX: -0.02, rotationZ: -0.08, scale: 0.97 }) }),
  'scatter-cannon': Object.freeze({ windup: Object.freeze({ rotationX: 0.04, rotationZ: 0.08, scale: 1.05 }), active: Object.freeze({ rotationX: -0.08, rotationZ: 0, scale: 1.09 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.1, scale: 0.96 }) }),
  'sky-anchor': Object.freeze({ windup: Object.freeze({ rotationX: 0.12, rotationZ: 0, scale: 1.04 }), active: Object.freeze({ rotationX: -0.18, rotationZ: 0, scale: 1.1 }), recovery: Object.freeze({ rotationX: -0.06, rotationZ: 0, scale: 0.96 }) }),
  'edge-scythe': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.18, scale: 1.04 }), active: Object.freeze({ rotationX: -0.05, rotationZ: -0.16, scale: 1.09 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.12, scale: 0.97 }) }),
  'rebound-hook': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.12, scale: 1.03 }), active: Object.freeze({ rotationX: 0, rotationZ: -0.12, scale: 1.07 }), recovery: Object.freeze({ rotationX: 0, rotationZ: 0.08, scale: 0.98 }) }),
  'pulse-baton': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.08, scale: 1.02 }), active: Object.freeze({ rotationX: -0.04, rotationZ: 0, scale: 1.06 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.03, scale: 1 }) }),
  'siege-axe': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.24, scale: 1.06 }), active: Object.freeze({ rotationX: -0.18, rotationZ: -0.1, scale: 1.12 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.18, scale: 0.95 }) }),
  'twin-fan': Object.freeze({ windup: Object.freeze({ rotationX: 0.04, rotationZ: 0.14, scale: 1.04 }), active: Object.freeze({ rotationX: 0, rotationZ: -0.1, scale: 1.08 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.08, scale: 0.98 }) }),
  'diving-claw': Object.freeze({ windup: Object.freeze({ rotationX: 0.12, rotationZ: 0.1, scale: 1.04 }), active: Object.freeze({ rotationX: -0.2, rotationZ: -0.12, scale: 1.1 }), recovery: Object.freeze({ rotationX: -0.08, rotationZ: 0, scale: 0.97 }) }),
  'route-bow': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.08, scale: 1.03 }), active: Object.freeze({ rotationX: -0.03, rotationZ: 0, scale: 1.1 }), recovery: Object.freeze({ rotationX: 0, rotationZ: -0.06, scale: 0.98 }) }),
  'pivot-blade': Object.freeze({ windup: Object.freeze({ rotationX: 0, rotationZ: 0.16, scale: 1.03 }), active: Object.freeze({ rotationX: -0.04, rotationZ: -0.18, scale: 1.08 }), recovery: Object.freeze({ rotationX: 0, rotationZ: 0.12, scale: 0.97 }) }),
  'commitment-fist': Object.freeze({ windup: Object.freeze({ rotationX: 0.02, rotationZ: 0.04, scale: 1.06 }), active: Object.freeze({ rotationX: -0.1, rotationZ: 0, scale: 1.12 }), recovery: Object.freeze({ rotationX: 0.04, rotationZ: 0, scale: 0.96 }) }),
} as const satisfies Readonly<Record<string, ArenaV2WeaponPhasePoseCandidateV1>>);

export type WeaponPhasePoseWeaponId = keyof typeof WEAPON_PHASE_POSES;

export interface ArenaV2FirstScreenAssetEvidenceCandidateV1 {
  readonly assetId: string;
  readonly artifactPath: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly sourceName: string;
  readonly sourceLocator: string;
  readonly sourceRevision: string;
  readonly licenseId: 'CC0-1.0';
  readonly rightsHolder: string;
  readonly proofDocument: string;
  readonly rightsIntakeApprovedBy: 'Allen';
  readonly rightsIntakeApprovedAt: '2026-07-23';
  readonly byteBudgetBytes: 65_536;
  readonly withinCandidateByteBudget: true;
  readonly geometryMaterialTextureBudgetStatus: 'not-run';
  readonly productionAssetApproved: false;
}

export interface ArenaV2CharacterFirstScreenIdentityCandidateV1 {
  readonly handlingKind:
    | 'balanced'
    | 'sprint'
    | 'air-control'
    | 'high-jump'
    | 'quick-start'
    | 'forgiving';
  readonly characterDefinitionId: string;
  readonly presentationDefinitionId: string;
  readonly sharedRigProfileId: 'arena.rig.kaykit-humanoid.v1';
  readonly sharedModelAssetId: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1';
  readonly materialProfileId: string;
  readonly bodyTintHex: string;
  readonly handlingShapeAxis: string;
  readonly selectionPose: Readonly<{
    readonly semantic: 'idle' | 'run' | 'jump' | 'land';
    readonly sampleRatio: number;
    readonly intent: string;
  }>;
  readonly valuePattern: Readonly<{
    readonly id: string;
    readonly cue: string;
    readonly meshNames: readonly string[];
    readonly colorIsNeverSoleSignal: true;
    readonly evidenceStatus: 'specified-not-captured';
  }>;
  readonly nearMidIdentityCue: 'body-value-pattern-plus-held-weapon-silhouette';
  readonly farIdentityCue: 'participant-glyph-plus-body-value-pattern-candidate';
  readonly nonColorParticipantIdentitySource:
    'PublicMatchInfoV2.identityGlyphKey+identityPatternKey';
  readonly nonColorCharacterIdentitySource: 'character-material-profile.valuePattern';
  readonly maturity: 'verified-intake-only';
  readonly productionAssetApproved: false;
}

export interface ArenaV2WeaponFirstScreenReadabilityCandidateV1 {
  readonly weaponId: WeaponPhasePoseWeaponId;
  readonly equipmentDefinitionId: string;
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly status: ReadabilityStatus;
  readonly asset: ArenaV2FirstScreenAssetEvidenceCandidateV1;
  readonly silhouette: Readonly<{
    readonly family: string;
    readonly mass: 'light' | 'medium' | 'heavy';
    readonly shapeCue: string;
    readonly patternCue: string;
    readonly identityScaleAxes: Vector3Tuple;
    readonly identityScaleSource: 'shared-held-and-ground-local-silhouette-profile';
    readonly addsGeometry: false;
    readonly modifiesCollision: false;
    readonly evidenceStatus: 'code-written-not-run';
  }>;
  readonly palette: Readonly<{
    readonly primaryHex: string;
    readonly dangerHex: '#FFB020';
    readonly activeHex: '#FF5C5C';
    readonly impactHex: '#FFF4B8';
    readonly colorIsNeverSoleSignal: true;
  }>;
  readonly grip: Readonly<{
    readonly slotId: 'handslot.r';
    readonly handedness: 'right';
    readonly forwardAxis: '-Z';
    readonly directionCue: string;
    readonly heldEulerRadians: Vector3Tuple;
    readonly heldScale: number;
    readonly transformProof: 'candidate-local-transform-not-render-verified';
  }>;
  readonly groundPickup: Readonly<{
    readonly eulerRadians: Vector3Tuple;
    readonly scale: number;
    readonly heightOffset: number;
    readonly markerShape: string;
    readonly markerPattern: string;
    readonly motionRequired: false;
  }>;
  readonly actionReadability: Readonly<{
    readonly windup: string;
    readonly active: string;
    readonly recovery: string;
    readonly phasePose: ArenaV2WeaponPhasePoseCandidateV1;
    readonly timingSource: 'ActionDefinition.timing+MatchReadFrameV3.participant.action.phase';
    readonly oneShotSource:
      'ArenaMatchEventV6.ActionStarted+WeaponFeedbackPresented(source:WeaponFeedbackResolved)';
    readonly noHitInference: true;
  }>;
  readonly cameraBands: readonly Readonly<{
    readonly distanceMeters: 0 | 5 | 12;
    readonly requiredSignal: string;
    readonly evidenceStatus: 'specified-not-captured';
  }>[];
  readonly accessibility: Readonly<{
    readonly reducedMotion: string;
    readonly silent: 'visual-state-does-not-depend-on-audio-playback';
    readonly assetFailure: 'hide-missing-attachment-and-request-non-spatial-status-cue';
  }>;
  readonly productionAssetApproved: false;
  readonly validationStatus: 'not-run';
}

interface WeaponVisualSpec {
  readonly weaponId: WeaponPhasePoseWeaponId;
  readonly sourceName: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly silhouetteFamily: string;
  readonly mass: ArenaV2WeaponFirstScreenReadabilityCandidateV1['silhouette']['mass'];
  readonly shapeCue: string;
  readonly patternCue: string;
  readonly identityScaleAxes: Vector3Tuple;
  readonly primaryHex: string;
  readonly directionCue: string;
  readonly heldEulerRadians: Vector3Tuple;
  readonly heldScale: number;
  readonly groundEulerRadians: Vector3Tuple;
  readonly groundScale: number;
  readonly groundHeightOffset: number;
  readonly markerShape: string;
  readonly markerPattern: string;
  readonly windup: string;
  readonly active: string;
  readonly recovery: string;
}

function weaponVisualSpec(value: WeaponVisualSpec): Readonly<WeaponVisualSpec> {
  return Object.freeze(value);
}

const KAYKIT_SOURCE = Object.freeze({
  sourceLocator: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0',
  sourceRevision: '672074b73ba276876a19e8816ecdc5241817ab47',
  licenseId: 'CC0-1.0' as const,
  rightsHolder: 'KayKit Game Assets / Kay Lousberg',
  proofDocument: 'docs/research/arena-kaykit-adventurers-intake.md',
  rightsIntakeApprovedBy: 'Allen' as const,
  rightsIntakeApprovedAt: '2026-07-23' as const,
});

const CHARACTER_ASSET_EVIDENCE = Object.freeze({
  assetId: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
  artifactPath: 'public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
  byteLength: 922_332,
  sha256: '3ee71059eef32d9a6259c5cfd4121f31dffda0a9667509b5f24129fb2c7a1cab',
  ...KAYKIT_SOURCE,
  byteBudgetBytes: 1_048_576 as const,
  withinCandidateByteBudget: true as const,
  geometryMaterialTextureBudgetStatus: 'not-run' as const,
  productionAssetApproved: false as const,
});

const WEAPON_SPECS: readonly WeaponVisualSpec[] = Object.freeze([
  weaponVisualSpec({
    weaponId: 'charge-shield', sourceName: 'shield_round', byteLength: 13_084,
    sha256: 'a61bcd83ccac9bc8596bf09894867ca491487d7a4b0662bb64dca2d1b19e790d',
    silhouetteFamily: 'broad-front-disc', mass: 'heavy',
    shapeCue: 'large circular front plane with a short rear grip',
    patternCue: 'quartered-face', primaryHex: '#35B8FF',
    identityScaleAxes: [1.18, 1.18, 0.86],
    directionCue: 'disc face stays perpendicular to committed travel',
    heldEulerRadians: [0, 0, 0], heldScale: 1.08,
    groundEulerRadians: [Math.PI / 2, 0, 0], groundScale: 1.12, groundHeightOffset: 0.22,
    markerShape: 'circle-with-forward-notch', markerPattern: 'quartered',
    windup: 'bring the broad face forward and compress the body line',
    active: 'hold the disc face ahead of travel; never imply guard or invulnerability',
    recovery: 'show overshoot with the disc trailing the facing line',
  }),
  weaponVisualSpec({
    weaponId: 'heavy-hammer', sourceName: 'axe_2handed', byteLength: 38_440,
    sha256: 'cecfb0cd3c89f11d80c2947f6e5c6bdd36721917d83968d29ba77f7e12fc74e4',
    silhouetteFamily: 'top-heavy-block', mass: 'heavy',
    shapeCue: 'oversized head above a long straight handle',
    patternCue: 'double-band-head', primaryHex: '#273451',
    identityScaleAxes: [1.08, 1.2, 0.96],
    directionCue: 'head leads the attack arc and handle remains legible behind it',
    heldEulerRadians: [0, 0, -0.22], heldScale: 1.12,
    groundEulerRadians: [0, 0, Math.PI / 2], groundScale: 1.16, groundHeightOffset: 0.18,
    markerShape: 'square-head-with-stem', markerPattern: 'double-band',
    windup: 'raise the top-heavy head outside the torso silhouette',
    active: 'drive a single broad arc without adding a second impact authority',
    recovery: 'leave the head low and separated from the ready pose',
  }),
  weaponVisualSpec({
    weaponId: 'gravity-chain', sourceName: 'crossbow_1handed', byteLength: 43_256,
    sha256: 'ab5de123ed622c1df24fa559f7b73354183885ea6783e16c6ad6511e13915d68',
    silhouetteFamily: 'line-and-endpoint', mass: 'medium',
    shapeCue: 'compact grip plus a clearly directed long endpoint',
    patternCue: 'alternating-link-dashes', primaryHex: '#8B6DFF',
    identityScaleAxes: [1.16, 0.94, 1.08],
    directionCue: 'endpoint points along the committed pull line',
    heldEulerRadians: [0, -Math.PI / 2, 0], heldScale: 1.04,
    groundEulerRadians: [0, 0, -Math.PI / 4], groundScale: 1.1, groundHeightOffset: 0.2,
    markerShape: 'line-with-solid-endpoint', markerPattern: 'dash-dot',
    windup: 'separate grip and endpoint from the torso before release',
    active: 'show one straight pull direction; do not infer a target or hit',
    recovery: 'collapse the endpoint toward the grip and expose facing reset',
  }),
  weaponVisualSpec({
    weaponId: 'line-suppressor', sourceName: 'staff', byteLength: 36_260,
    sha256: 'ed6a9a096c421501ae0d41beb688ac9b58ee76a2de8444583a0f3fe1d755b9f8',
    silhouetteFamily: 'long-straight-staff', mass: 'medium',
    shapeCue: 'thin symmetric staff with an uninterrupted center line',
    patternCue: 'three-spaced-rings', primaryHex: '#45D483',
    identityScaleAxes: [0.88, 1.24, 0.88],
    directionCue: 'staff aligns with the narrow pressure lane',
    heldEulerRadians: [0, 0, -Math.PI / 3], heldScale: 1.08,
    groundEulerRadians: [0, Math.PI / 2, 0], groundScale: 1.12, groundHeightOffset: 0.16,
    markerShape: 'long-bar', markerPattern: 'three-rings',
    windup: 'extend the staff into a thin line outside the shoulder width',
    active: 'hold a narrow straight axis rather than a broad hit fan',
    recovery: 'lower the line and preserve a visible cooldown gap',
  }),
  weaponVisualSpec({
    weaponId: 'read-counter', sourceName: 'spellbook_open', byteLength: 32_820,
    sha256: '4180675597116ea56334dc835fbe047340e09c3b0d47fa59d97d9905f7204448',
    silhouetteFamily: 'open-book-wedge', mass: 'light',
    shapeCue: 'open V-shaped pages with a centered grip',
    patternCue: 'paired-page-stripes', primaryHex: '#FFF4B8',
    identityScaleAxes: [1.18, 0.9, 1.06],
    directionCue: 'open page wedge faces the committed read direction',
    heldEulerRadians: [0, 0, 0.18], heldScale: 1.06,
    groundEulerRadians: [-Math.PI / 2, 0, 0], groundScale: 1.14, groundHeightOffset: 0.18,
    markerShape: 'open-chevron', markerPattern: 'paired-lines',
    windup: 'keep the open wedge fixed and visibly held through commitment',
    active: 'release only when the authority phase changes to active',
    recovery: 'close the body line and expose the hold-release punish window',
  }),
  weaponVisualSpec({
    weaponId: 'flank-blade', sourceName: 'dagger', byteLength: 25_704,
    sha256: '994e1a03eb7e6e088961683cd757c4c58df6bd5bad7a987136f635818999a66e',
    silhouetteFamily: 'short-rear-blade', mass: 'light',
    shapeCue: 'short triangular blade offset behind the hand',
    patternCue: 'single-diagonal-cut', primaryHex: '#FF5C5C',
    identityScaleAxes: [0.88, 1.16, 0.92],
    directionCue: 'blade offset makes the rear-facing threat readable',
    heldEulerRadians: [0, Math.PI / 2, 0.35], heldScale: 1.08,
    groundEulerRadians: [0, 0, -Math.PI / 4], groundScale: 1.18, groundHeightOffset: 0.14,
    markerShape: 'rear-pointing-triangle', markerPattern: 'diagonal',
    windup: 'move the short blade outside the rear hip silhouette',
    active: 'cross the facing line without changing authority facing',
    recovery: 'return through a clearly exposed facing-reset pose',
  }),
  weaponVisualSpec({
    weaponId: 'hook-spear', sourceName: 'sword_2handed', byteLength: 35_472,
    sha256: '9b195e8028942ce08b62f3af65fda667d37f9e4f89fd154c9fde5ca9154da276',
    silhouetteFamily: 'hooked-long-pole', mass: 'medium',
    shapeCue: 'long shaft ending in a directional hooked point',
    patternCue: 'hook-tip-band', primaryHex: '#8B6DFF',
    identityScaleAxes: [0.92, 1.22, 0.94],
    directionCue: 'hook tip leads the long thin pull line',
    heldEulerRadians: [0, 0, -0.42], heldScale: 1.12,
    groundEulerRadians: [0, Math.PI / 2, 0], groundScale: 1.16, groundHeightOffset: 0.16,
    markerShape: 'hooked-line', markerPattern: 'tip-band',
    windup: 'project the hook beyond the shoulder before commitment',
    active: 'keep the threat thin and directional', recovery: 'drop the tip to reveal aim commitment',
  }),
  weaponVisualSpec({
    weaponId: 'burst-gauntlet', sourceName: 'shield_badge_color', byteLength: 26_060,
    sha256: '9a27a73cf24224a811abda9a788deb75f7d9176afdb5ace348f76aed8144d392',
    silhouetteFamily: 'compact-fist-block', mass: 'light',
    shapeCue: 'small dense block close to the hand', patternCue: 'single-center-badge',
    identityScaleAxes: [0.92, 0.92, 0.88],
    primaryHex: '#FFB020', directionCue: 'compact block extends just beyond the leading fist',
    heldEulerRadians: [0, 0, 0], heldScale: 0.92,
    groundEulerRadians: [Math.PI / 2, 0, 0], groundScale: 1.22, groundHeightOffset: 0.14,
    markerShape: 'small-square-burst', markerPattern: 'center-dot',
    windup: 'tight hand-level compression', active: 'short forward burst with no range exaggeration',
    recovery: 'snap back to expose the short-range limitation',
  }),
  weaponVisualSpec({
    weaponId: 'vault-lance', sourceName: 'sword_2handed_color', byteLength: 35_444,
    sha256: 'c1b17c71a43bd48ecede3589da9c2018f5fff35018b732341c35923684450670',
    silhouetteFamily: 'long-lance', mass: 'medium',
    shapeCue: 'long uninterrupted thrust axis with a narrow point',
    patternCue: 'forward-chevron-bands', primaryHex: '#35B8FF',
    identityScaleAxes: [0.86, 1.24, 0.9],
    directionCue: 'point and body travel share one forward line',
    heldEulerRadians: [0, 0, -Math.PI / 2], heldScale: 1.18,
    groundEulerRadians: [0, Math.PI / 2, 0], groundScale: 1.2, groundHeightOffset: 0.16,
    markerShape: 'long-chevron-line', markerPattern: 'forward-chevrons',
    windup: 'draw the point behind the body while preserving the thrust axis',
    active: 'extend one long line in the authority facing direction',
    recovery: 'leave the point ahead of the body to communicate overshoot',
  }),
  weaponVisualSpec({
    weaponId: 'scatter-cannon', sourceName: 'crossbow_2handed', byteLength: 52_948,
    sha256: '5768c5a2b954d2f6195e24f5953ef0ef08d2bdf0b86e8c9218eb971148216bd7',
    silhouetteFamily: 'wide-crossbar', mass: 'heavy',
    shapeCue: 'wide horizontal crossbar on a dense central stock',
    patternCue: 'three-spoke-muzzle', primaryHex: '#273451',
    identityScaleAxes: [1.24, 0.94, 1.04],
    directionCue: 'central stock points forward while the crossbar signals broad coverage',
    heldEulerRadians: [0, -Math.PI / 2, 0], heldScale: 1.14,
    groundEulerRadians: [0, 0, 0], groundScale: 1.16, groundHeightOffset: 0.2,
    markerShape: 'wide-t-bar', markerPattern: 'three-spokes',
    windup: 'square the wide crossbar outside the torso silhouette',
    active: 'briefly widen the stance; do not spawn inferred projectiles',
    recovery: 'lower the crossbar and show the long cooldown gap',
  }),
  weaponVisualSpec({
    weaponId: 'sky-anchor', sourceName: 'shield_spikes', byteLength: 37_024,
    sha256: 'e4d210517937f6ee74d1b047da2bba45c6e69605e80ad2348531c2323b83fd5a',
    silhouetteFamily: 'spiked-anchor-disc', mass: 'heavy',
    shapeCue: 'dense center with downward radial spikes', patternCue: 'vertical-spike-stack',
    identityScaleAxes: [0.94, 1.22, 0.9],
    primaryHex: '#273451', directionCue: 'lowest spike defines the vertical stop direction',
    heldEulerRadians: [Math.PI / 2, 0, 0], heldScale: 1.1,
    groundEulerRadians: [0, 0, 0], groundScale: 1.12, groundHeightOffset: 0.2,
    markerShape: 'down-spiked-disc', markerPattern: 'vertical-bars',
    windup: 'lift the dense center above the silhouette', active: 'present one strong downward axis',
    recovery: 'hold the anchor low through landing recovery',
  }),
  weaponVisualSpec({
    weaponId: 'edge-scythe', sourceName: 'axe_1handed', byteLength: 29_004,
    sha256: '4f57ce0baef0176e576ae04231ba3fc8e1f8be772f2b14f8792c051d4151e72a',
    silhouetteFamily: 'crescent-edge', mass: 'medium',
    shapeCue: 'one-handed shaft with a broad asymmetric crescent head',
    patternCue: 'crescent-edge-stripes', primaryHex: '#45D483',
    identityScaleAxes: [1.14, 1.12, 0.92],
    directionCue: 'open crescent faces the sweep direction',
    heldEulerRadians: [0, 0, -0.55], heldScale: 1.16,
    groundEulerRadians: [0, 0, Math.PI / 2], groundScale: 1.2, groundHeightOffset: 0.16,
    markerShape: 'crescent-with-stem', markerPattern: 'edge-stripes',
    windup: 'open the crescent outside the hip line', active: 'trace one broad edge arc',
    recovery: 'finish with the crescent behind the facing line',
  }),
  weaponVisualSpec({
    weaponId: 'rebound-hook', sourceName: 'arrow_bundle', byteLength: 33_400,
    sha256: '58a99c5c49e74f13c2e6b59443d62d5cf89e3bf51337df118a3afd73d9013339',
    silhouetteFamily: 'looped-hook-bundle', mass: 'light',
    shapeCue: 'compact bundle with one returning hook direction', patternCue: 'return-arrow',
    identityScaleAxes: [1.12, 1.02, 1.1],
    primaryHex: '#8B6DFF', directionCue: 'return notch points back toward the user',
    heldEulerRadians: [0, Math.PI / 2, 0], heldScale: 1.08,
    groundEulerRadians: [0, 0, 0], groundScale: 1.16, groundHeightOffset: 0.14,
    markerShape: 'u-turn-hook', markerPattern: 'return-arrow',
    windup: 'open a short hook outside the hand', active: 'show one close return direction',
    recovery: 'collapse the hook and expose the whiff window',
  }),
  weaponVisualSpec({
    weaponId: 'pulse-baton', sourceName: 'wand', byteLength: 23_644,
    sha256: 'f2faa495e45e34b2db60542e4c8520c61310e883475f0b7ab9cbcc1068abbd85',
    silhouetteFamily: 'short-baton', mass: 'light',
    shapeCue: 'short straight rod with an enlarged pulse tip', patternCue: 'single-tip-ring',
    identityScaleAxes: [0.9, 1.18, 0.86],
    primaryHex: '#45D483', directionCue: 'enlarged tip marks the interrupt direction',
    heldEulerRadians: [0, 0, -0.25], heldScale: 1.12,
    groundEulerRadians: [0, 0, Math.PI / 3], groundScale: 1.22, groundHeightOffset: 0.14,
    markerShape: 'short-line-with-ring', markerPattern: 'tip-ring',
    windup: 'pull the tip back a short readable distance', active: 'single compact pulse accent',
    recovery: 'return immediately without suggesting high displacement',
  }),
  weaponVisualSpec({
    weaponId: 'siege-axe', sourceName: 'shield_spikes_color', byteLength: 37_032,
    sha256: 'c10657ac0ead435f34df2779daa0748f79a188715cf53dd4c9ea6a254842fae2',
    silhouetteFamily: 'double-heavy-wedge', mass: 'heavy',
    shapeCue: 'large dense head with opposing wedge points', patternCue: 'double-warning-band',
    identityScaleAxes: [1.22, 1.02, 0.9],
    primaryHex: '#273451', directionCue: 'leading wedge stays outside the torso silhouette',
    heldEulerRadians: [0, 0, -0.3], heldScale: 1.18,
    groundEulerRadians: [0, 0, Math.PI / 2], groundScale: 1.2, groundHeightOffset: 0.2,
    markerShape: 'double-wedge', markerPattern: 'double-band',
    windup: 'hold the large head high for the full visible commitment',
    active: 'one maximum-force arc only after authority active phase',
    recovery: 'keep the head grounded through long recovery',
  }),
  weaponVisualSpec({
    weaponId: 'twin-fan', sourceName: 'shield_badge', byteLength: 26_184,
    sha256: 'a03fd7105cd434c3d4783bec29efdcdc1992645b7de34fb2627774771fab875e',
    silhouetteFamily: 'radial-fan', mass: 'light',
    shapeCue: 'single radial face suggesting broad soft coverage', patternCue: 'alternating-radial-sectors',
    identityScaleAxes: [1.22, 1.14, 0.86],
    primaryHex: '#FFF4B8', directionCue: 'radial face stays broad to camera without implying a second asset',
    heldEulerRadians: [Math.PI / 2, 0, 0], heldScale: 1.12,
    groundEulerRadians: [Math.PI / 2, 0, 0], groundScale: 1.18, groundHeightOffset: 0.16,
    markerShape: 'radial-fan', markerPattern: 'alternating-sectors',
    windup: 'open the radial face beside the torso', active: 'hold broad coverage for the authority active phase',
    recovery: 'close the face toward the hand and expose cooldown',
  }),
  weaponVisualSpec({
    weaponId: 'diving-claw', sourceName: 'arrow', byteLength: 20_692,
    sha256: '2f10e01ced917bd7da0c37e6345d7993511e9bdb7d5c578e1161fb457cafee9a',
    silhouetteFamily: 'downward-claw-point', mass: 'light',
    shapeCue: 'small hooked point with a strong downward axis', patternCue: 'three-claw-marks',
    identityScaleAxes: [0.86, 1.2, 0.92],
    primaryHex: '#FF5C5C', directionCue: 'point rotates down only from the aerial authority phase',
    heldEulerRadians: [0, 0, -Math.PI / 2], heldScale: 1.16,
    groundEulerRadians: [0, 0, 0], groundScale: 1.24, groundHeightOffset: 0.14,
    markerShape: 'down-hook', markerPattern: 'claw-marks',
    windup: 'separate the point above the shoulder', active: 'commit one downward diagonal',
    recovery: 'hold the point low through landing commitment',
  }),
  weaponVisualSpec({
    weaponId: 'route-bow', sourceName: 'quiver', byteLength: 31_936,
    sha256: '148de5df220be81b33b76b72b3603881c0589b6fa3d1d2f63f97b893c3217617',
    silhouetteFamily: 'thin-arc-and-line', mass: 'light',
    shapeCue: 'narrow arc paired with a long route axis', patternCue: 'parallel-route-lines',
    identityScaleAxes: [0.94, 1.18, 1.04],
    primaryHex: '#35B8FF', directionCue: 'route line points forward without spawning a projectile',
    heldEulerRadians: [0, 0, -0.35], heldScale: 1.14,
    groundEulerRadians: [0, Math.PI / 2, 0], groundScale: 1.18, groundHeightOffset: 0.16,
    markerShape: 'thin-arc', markerPattern: 'parallel-lines',
    windup: 'open a thin long-range line', active: 'preserve narrow coverage at maximum visual length',
    recovery: 'drop the line to show the cooldown gap',
  }),
  weaponVisualSpec({
    weaponId: 'pivot-blade', sourceName: 'sword_1handed', byteLength: 28_816,
    sha256: '71d9422b28b2296ed85262a2d139338005a13d3fcb9aa1621b2955727f6c3194',
    silhouetteFamily: 'rear-pivot-saber', mass: 'light',
    shapeCue: 'single curved blade crossing the body line', patternCue: 'pivot-half-ring',
    identityScaleAxes: [0.9, 1.2, 0.94],
    primaryHex: '#FF5C5C', directionCue: 'blade crosses to the rear side while facing remains authority-owned',
    heldEulerRadians: [0, Math.PI / 2, 0.2], heldScale: 1.12,
    groundEulerRadians: [0, 0, -Math.PI / 4], groundScale: 1.18, groundHeightOffset: 0.14,
    markerShape: 'half-ring-blade', markerPattern: 'pivot-ring',
    windup: 'move the blade across the center line', active: 'brief rear-facing cut shape',
    recovery: 'show a facing-reset pose without rotating authority facing',
  }),
  weaponVisualSpec({
    weaponId: 'commitment-fist', sourceName: 'mug_full', byteLength: 32_252,
    sha256: 'd7435ad682548dfbb40b8385501a8dfecb406b233d9b434903b32f409fac5562',
    silhouetteFamily: 'compact-held-volume', mass: 'medium',
    shapeCue: 'dense hand-level volume with no long threat line', patternCue: 'hold-progress-bars',
    identityScaleAxes: [1.08, 0.96, 1.12],
    primaryHex: '#FFB020', directionCue: 'compact volume remains centered on the committed hand',
    heldEulerRadians: [0, 0, 0], heldScale: 1.04,
    groundEulerRadians: [0, 0, 0], groundScale: 1.18, groundHeightOffset: 0.16,
    markerShape: 'compact-octagon', markerPattern: 'progress-bars',
    windup: 'hold the compact volume visibly through commitment', active: 'single short release shape',
    recovery: 'remove danger accent immediately after authority recovery starts',
  }),
]);

function weaponAssetId(weaponId: string): string {
  return weaponId === 'charge-shield'
    ? 'arena.asset.attachment.shield.kaykit-round.v1'
    : `arena.asset.attachment.weapon.${weaponId}.kaykit-candidate.v1`;
}

function weaponArtifactPath(weaponId: string): string {
  return weaponId === 'charge-shield'
    ? 'public/assets/arena/equipment/kaykit-adventurers/shield-round.glb'
    : `public/assets/arena/equipment/kaykit-adventurers/weapon-candidates/${weaponId}.glb`;
}

function assertCatalogAssetIdentity(
  assetId: string,
  artifactPath: string,
  byteLength: number,
  sha256: string,
): void {
  const record = ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1.find(({ runtimeDefinition }) => (
    runtimeDefinition.id === assetId
  ));
  if (
    record === undefined
    || record.artifactPath !== artifactPath
    || record.byteLength !== byteLength
    || record.sha256 !== sha256
    || record.provenance.sourceRevision !== KAYKIT_SOURCE.sourceRevision
    || record.provenance.licenseId !== KAYKIT_SOURCE.licenseId
    || record.provenance.rightsHolder !== KAYKIT_SOURCE.rightsHolder
  ) throw new RangeError(`Arena V2首屏可读性资产身份漂移：${assetId}。`);
}

function assetEvidence(spec: WeaponVisualSpec): ArenaV2FirstScreenAssetEvidenceCandidateV1 {
  const assetId = weaponAssetId(spec.weaponId);
  const artifactPath = weaponArtifactPath(spec.weaponId);
  assertCatalogAssetIdentity(assetId, artifactPath, spec.byteLength, spec.sha256);
  return Object.freeze({
    assetId,
    artifactPath,
    byteLength: spec.byteLength,
    sha256: spec.sha256,
    sourceName: spec.sourceName,
    ...KAYKIT_SOURCE,
    byteBudgetBytes: 65_536 as const,
    withinCandidateByteBudget: true as const,
    geometryMaterialTextureBudgetStatus: 'not-run' as const,
    productionAssetApproved: false as const,
  });
}

function cameraBands(spec: WeaponVisualSpec): ArenaV2WeaponFirstScreenReadabilityCandidateV1['cameraBands'] {
  return Object.freeze([
    Object.freeze({
      distanceMeters: 0 as const,
      requiredSignal: `${spec.shapeCue}; preserve grip direction and character material identity`,
      evidenceStatus: 'specified-not-captured' as const,
    }),
    Object.freeze({
      distanceMeters: 5 as const,
      requiredSignal: `${spec.silhouetteFamily}+${spec.patternCue}; danger uses shape offset plus #FFB020`,
      evidenceStatus: 'specified-not-captured' as const,
    }),
    Object.freeze({
      distanceMeters: 12 as const,
      requiredSignal: `${spec.markerShape}+${spec.markerPattern}; never rely on surface color alone`,
      evidenceStatus: 'specified-not-captured' as const,
    }),
  ]);
}

const MIN_IDENTITY_SCALE_AXIS = 0.84;
const MAX_IDENTITY_SCALE_AXIS = 1.25;

function identityScaleAxes(spec: WeaponVisualSpec): Vector3Tuple {
  if (
    spec.identityScaleAxes.length !== 3
    || spec.identityScaleAxes.some((axis) => (
      !Number.isFinite(axis)
      || axis < MIN_IDENTITY_SCALE_AXIS
      || axis > MAX_IDENTITY_SCALE_AXIS
    ))
  ) throw new RangeError(`Arena V2武器轮廓轴比例越界：${spec.weaponId}。`);
  return Object.freeze([...spec.identityScaleAxes]) as Vector3Tuple;
}

function weaponProfile(spec: WeaponVisualSpec): ArenaV2WeaponFirstScreenReadabilityCandidateV1 {
  const equipmentDefinitionId = `arena-v2.weapon.${spec.weaponId}.candidate.v1`;
  const groundActionDefinitionId = `arena-v2.action.${spec.weaponId}.ground.candidate.v1`;
  const aerialActionDefinitionId = `arena-v2.action.${spec.weaponId}.aerial.candidate.v1`;
  if (
    ARENA_V2_FORMAL_ACTION_PRESENTATIONS_CANDIDATE_V1[groundActionDefinitionId] === undefined
    || ARENA_V2_FORMAL_ACTION_PRESENTATIONS_CANDIDATE_V1[aerialActionDefinitionId] === undefined
  ) throw new RangeError(`Arena V2首屏可读性武器缺少权威动作表现：${spec.weaponId}。`);
  return Object.freeze({
    weaponId: spec.weaponId,
    equipmentDefinitionId,
    groundActionDefinitionId,
    aerialActionDefinitionId,
    status:
      ARENA_V2_FIRST_SCREEN_READABILITY_STATUS_CANDIDATE_V1
        .IMPLEMENTATION_CANDIDATE_NOT_RUN,
    asset: assetEvidence(spec),
    silhouette: Object.freeze({
      family: spec.silhouetteFamily,
      mass: spec.mass,
      shapeCue: spec.shapeCue,
      patternCue: spec.patternCue,
      identityScaleAxes: identityScaleAxes(spec),
      identityScaleSource: 'shared-held-and-ground-local-silhouette-profile' as const,
      addsGeometry: false as const,
      modifiesCollision: false as const,
      evidenceStatus: 'code-written-not-run' as const,
    }),
    palette: Object.freeze({
      primaryHex: spec.primaryHex,
      dangerHex: '#FFB020' as const,
      activeHex: '#FF5C5C' as const,
      impactHex: '#FFF4B8' as const,
      colorIsNeverSoleSignal: true as const,
    }),
    grip: Object.freeze({
      slotId: 'handslot.r' as const,
      handedness: 'right' as const,
      forwardAxis: '-Z' as const,
      directionCue: spec.directionCue,
      heldEulerRadians: Object.freeze([...spec.heldEulerRadians]) as Vector3Tuple,
      heldScale: spec.heldScale,
      transformProof: 'candidate-local-transform-not-render-verified' as const,
    }),
    groundPickup: Object.freeze({
      eulerRadians: Object.freeze([...spec.groundEulerRadians]) as Vector3Tuple,
      scale: spec.groundScale,
      heightOffset: spec.groundHeightOffset,
      markerShape: spec.markerShape,
      markerPattern: spec.markerPattern,
      motionRequired: false as const,
    }),
    actionReadability: Object.freeze({
      windup: spec.windup,
      active: spec.active,
      recovery: spec.recovery,
      phasePose: WEAPON_PHASE_POSES[spec.weaponId],
      timingSource: 'ActionDefinition.timing+MatchReadFrameV3.participant.action.phase' as const,
      oneShotSource:
        'ArenaMatchEventV6.ActionStarted+WeaponFeedbackPresented(source:WeaponFeedbackResolved)' as const,
      noHitInference: true as const,
    }),
    cameraBands: cameraBands(spec),
    accessibility: Object.freeze({
      reducedMotion: 'retain weapon silhouette and snap to bounded static phase shape; remove phase rotation, interpolation and pulse',
      silent: 'visual-state-does-not-depend-on-audio-playback' as const,
      assetFailure: 'hide-missing-attachment-and-request-non-spatial-status-cue' as const,
    }),
    productionAssetApproved: false as const,
    validationStatus: 'not-run' as const,
  });
}

const CHARACTER_INPUTS = Object.freeze([
  Object.freeze({ handlingKind: 'balanced' as const, characterDefinitionId: 'arena-v2-kz-verification-character.candidate.v1', materialProfileId: 'arena.material.kaykit-runner-coral.v1', bodyTintHex: '#EF6A64', handlingShapeAxis: '明亮躯干稳定居中，四肢等重，表达无偏科基准', selectionPose: Object.freeze({ semantic: 'idle' as const, sampleRatio: 0.12, intent: '正面稳定站姿建立全角色比较基准' }), valuePatternCue: 'center-bright-core' }),
  Object.freeze({ handlingKind: 'sprint' as const, characterDefinitionId: 'arena-v2-character-sprint.candidate.v1', materialProfileId: 'arena.material.kaykit-runner-cyan.v1', bodyTintHex: '#35C5D8', handlingShapeAxis: '双腿高明度、上身压暗，表达直线跑速与地面推进', selectionPose: Object.freeze({ semantic: 'run' as const, sampleRatio: 0.34, intent: '完整跨步突出水平推进轴' }), valuePatternCue: 'bright-paired-legs' }),
  Object.freeze({ handlingKind: 'air-control' as const, characterDefinitionId: 'arena-v2-character-air-control.candidate.v1', materialProfileId: 'arena.material.kaykit-runner-violet.v1', bodyTintHex: '#9B78E8', handlingShapeAxis: '双臂与披风高明度展开，表达空中横向修正', selectionPose: Object.freeze({ semantic: 'jump' as const, sampleRatio: 0.58, intent: '跳跃中段突出横向控制姿态' }), valuePatternCue: 'bright-arms-and-cape' }),
  Object.freeze({ handlingKind: 'high-jump' as const, characterDefinitionId: 'arena-v2-character-high-jump.candidate.v1', materialProfileId: 'arena.material.kaykit-runner-lime.v1', bodyTintHex: '#A2D855', handlingShapeAxis: '双腿高明度、头部次亮，表达竖直弹跳轴', selectionPose: Object.freeze({ semantic: 'jump' as const, sampleRatio: 0.18, intent: '离地初段突出向上发力' }), valuePatternCue: 'bright-spring-legs' }),
  Object.freeze({ handlingKind: 'quick-start' as const, characterDefinitionId: 'arena-v2-character-quick-start.candidate.v1', materialProfileId: 'arena.material.kaykit-runner-amber.v1', bodyTintHex: '#F2B843', handlingShapeAxis: '右臂与左腿形成高明度对角线，表达快速起步与变向', selectionPose: Object.freeze({ semantic: 'run' as const, sampleRatio: 0.08, intent: '跑动初帧突出起步而非极速' }), valuePatternCue: 'bright-start-diagonal' }),
  Object.freeze({ handlingKind: 'forgiving' as const, characterDefinitionId: 'arena-v2-character-forgiving.candidate.v1', materialProfileId: 'arena.material.kaykit-runner-blue.v1', bodyTintHex: '#4D8FE8', handlingShapeAxis: '躯干与双臂形成明亮稳定括号，表达落地与输入容错', selectionPose: Object.freeze({ semantic: 'land' as const, sampleRatio: 0.72, intent: '落地后段突出稳定恢复' }), valuePatternCue: 'bright-stable-bracket' }),
]);

assertCatalogAssetIdentity(
  CHARACTER_ASSET_EVIDENCE.assetId,
  CHARACTER_ASSET_EVIDENCE.artifactPath,
  CHARACTER_ASSET_EVIDENCE.byteLength,
  CHARACTER_ASSET_EVIDENCE.sha256,
);

export const ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1 = Object.freeze(
  CHARACTER_INPUTS.map((input): ArenaV2CharacterFirstScreenIdentityCandidateV1 => {
    const material = ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1.find(({ id }) => (
      id === input.materialProfileId
    ));
    if (material === undefined || `#${material.tintHex.toString(16).padStart(6, '0')}`.toUpperCase() !== input.bodyTintHex) {
      throw new RangeError(`Arena V2首屏角色材质身份漂移：${input.handlingKind}。`);
    }
    if (material.valuePattern.meshValueMultipliers.length !== 7) {
      throw new RangeError(`Arena V2首屏角色明暗分区未覆盖七个共享模型部件：${input.handlingKind}。`);
    }
    return Object.freeze({
      handlingKind: input.handlingKind,
      characterDefinitionId: input.characterDefinitionId,
      presentationDefinitionId:
        `arena-v2.character-presentation.${input.handlingKind}.kaykit-rogue.candidate.v1`,
      sharedRigProfileId: 'arena.rig.kaykit-humanoid.v1' as const,
      sharedModelAssetId: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1' as const,
      materialProfileId: input.materialProfileId,
      bodyTintHex: input.bodyTintHex,
      handlingShapeAxis: input.handlingShapeAxis,
      selectionPose: input.selectionPose,
      valuePattern: Object.freeze({
        id: material.valuePattern.id,
        cue: input.valuePatternCue,
        meshNames: Object.freeze(material.valuePattern.meshValueMultipliers.map(({ meshName }) => meshName)),
        colorIsNeverSoleSignal: true as const,
        evidenceStatus: material.valuePattern.evidenceStatus,
      }),
      nearMidIdentityCue: 'body-value-pattern-plus-held-weapon-silhouette' as const,
      farIdentityCue: 'participant-glyph-plus-body-value-pattern-candidate' as const,
      nonColorParticipantIdentitySource:
        'PublicMatchInfoV2.identityGlyphKey+identityPatternKey' as const,
      nonColorCharacterIdentitySource: 'character-material-profile.valuePattern' as const,
      maturity: 'verified-intake-only' as const,
      productionAssetApproved: false as const,
    });
  }),
);

export const ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1 = Object.freeze(
  WEAPON_SPECS.map(weaponProfile),
);

if (
  ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1.length !== 6
  || ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1.length !== 20
  || new Set(ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1.map(
    ({ equipmentDefinitionId }) => equipmentDefinitionId,
  )).size !== 20
  || new Set(ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1.map(
    ({ silhouette }) => silhouette.identityScaleAxes.join(','),
  )).size !== 20
  || ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1.filter(
    ({ status }) => status === 'implementation-candidate-not-run',
  ).length !== 20
) throw new RangeError('Arena V2首屏角色×武器候选目录未闭合6角色/20武器。');

export const ARENA_V2_FIRST_SCREEN_LIGHTING_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'specified-not-device-verified' as const,
  neutralKeyRequired: true as const,
  characterMaterialIdentityMustSurviveMapEnvironment: true as const,
  weaponPrimaryColorMayNotReplaceSilhouetteOrPattern: true as const,
  dangerAccentHex: '#FFB020' as const,
  activeAccentHex: '#FF5C5C' as const,
  impactAccentHex: '#FFF4B8' as const,
  backgroundDepthHex: '#273451' as const,
  desktopCaptureRequired: true as const,
  mobile390x844CaptureRequired: true as const,
  validationStatus: 'not-run' as const,
});

const INPUT_KEYS = new Set([
  'schemaVersion',
  'tick',
  'participantId',
  'equipmentDefinitionId',
  'placement',
  'actionDefinitionId',
  'actionPhase',
  'actionStartedCue',
  'weaponFeedbackCue',
  'reducedMotion',
  'muted',
  'assetLoadState',
]);
const ACTION_CUE_KEYS = new Set([
  'sourceEventId', 'tick', 'sequence', 'participantId', 'actionDefinitionId',
  'equipmentDefinitionId',
]);
const FEEDBACK_CUE_KEYS = new Set([
  'sourceEventId', 'tick', 'sequence', 'attackerId', 'actionDefinitionId',
  'visualCue', 'emphasis',
]);
const OPTION_KEYS = new Set(['object', 'equipmentDefinitionId', 'placement']);
const PHASES = new Set<unknown>(['idle', 'windup', 'active', 'recovery']);
const PLACEMENTS = new Set<unknown>(['held', 'ground']);
const LOAD_STATES = new Set<unknown>(['ready', 'missing']);
const FEEDBACK_VISUAL_CUES = new Set<unknown>([
  'impact-confirm', 'impact-surface-transfer', 'ring-out', 'evaded-warning',
]);
const FEEDBACK_EMPHASIS = new Set<unknown>(['normal', 'strong', 'warning']);

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name}必须是boolean。`);
  return value;
}

function nullableString(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

export function requireArenaV2WeaponFirstScreenReadabilityProfileCandidateV1(
  equipmentDefinitionId: string,
): ArenaV2WeaponFirstScreenReadabilityCandidateV1 {
  const profile = ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1.find((item) => (
    item.equipmentDefinitionId === equipmentDefinitionId
  ));
  if (profile === undefined) throw new RangeError(`未知首屏武器身份：${equipmentDefinitionId}。`);
  return profile;
}

interface ParsedCue {
  readonly sourceEventId: string;
  readonly tick: number;
  readonly sequence: number;
}

function parseActionCue(
  value: unknown,
  inputTick: number,
  participantId: string,
  profile: ArenaV2WeaponFirstScreenReadabilityCandidateV1,
  actionDefinitionId: string,
): ParsedCue | null {
  if (value === null) return null;
  const source = cloneFrozenData(value, 'Arena V2首屏ActionStarted Cue');
  assertKnownKeys(source, ACTION_CUE_KEYS, 'Arena V2首屏ActionStarted Cue');
  const cue = Object.freeze({
    sourceEventId: assertNonEmptyString(source.sourceEventId, 'ActionStarted Cue.sourceEventId'),
    tick: assertIntegerAtLeast(source.tick, 0, 'ActionStarted Cue.tick'),
    sequence: assertIntegerAtLeast(source.sequence, 0, 'ActionStarted Cue.sequence'),
  });
  if (
    source.participantId !== participantId
    || source.actionDefinitionId !== actionDefinitionId
    || source.equipmentDefinitionId !== profile.equipmentDefinitionId
    || cue.tick >= inputTick
  ) throw new RangeError('Arena V2首屏ActionStarted Cue与post-step角色/武器/动作身份不闭合。');
  return cue;
}

function parseFeedbackCue(
  value: unknown,
  inputTick: number,
  participantId: string | null,
  profile: ArenaV2WeaponFirstScreenReadabilityCandidateV1,
  actionDefinitionId: string | null,
): Readonly<ParsedCue & {
  readonly attackerId: string;
  readonly actionDefinitionId: string;
  readonly visualCue: string;
  readonly emphasis: string;
}> | null {
  if (value === null) return null;
  const source = cloneFrozenData(value, 'Arena V2首屏WeaponFeedback Cue');
  assertKnownKeys(source, FEEDBACK_CUE_KEYS, 'Arena V2首屏WeaponFeedback Cue');
  if (!FEEDBACK_VISUAL_CUES.has(source.visualCue) || !FEEDBACK_EMPHASIS.has(source.emphasis)) {
    throw new RangeError('Arena V2首屏WeaponFeedback Cue枚举不受支持。');
  }
  const cue = Object.freeze({
    sourceEventId: assertNonEmptyString(source.sourceEventId, 'WeaponFeedback Cue.sourceEventId'),
    tick: assertIntegerAtLeast(source.tick, 0, 'WeaponFeedback Cue.tick'),
    sequence: assertIntegerAtLeast(source.sequence, 0, 'WeaponFeedback Cue.sequence'),
    attackerId: assertNonEmptyString(source.attackerId, 'WeaponFeedback Cue.attackerId'),
    actionDefinitionId: assertNonEmptyString(
      source.actionDefinitionId,
      'WeaponFeedback Cue.actionDefinitionId',
    ),
    visualCue: source.visualCue as string,
    emphasis: source.emphasis as string,
  });
  if (
    participantId === null
    || cue.attackerId !== participantId
    || cue.actionDefinitionId !== actionDefinitionId
    || ![profile.groundActionDefinitionId, profile.aerialActionDefinitionId].includes(
      cue.actionDefinitionId,
    )
    || cue.tick >= inputTick
  ) throw new RangeError('Arena V2首屏WeaponFeedback Cue与post-step攻击者/武器动作身份不闭合。');
  return cue;
}

interface ParsedInput {
  readonly tick: number;
  readonly participantId: string | null;
  readonly equipmentDefinitionId: string;
  readonly placement: WeaponPlacement;
  readonly actionDefinitionId: string | null;
  readonly actionPhase: AuthorityActionPhase;
  readonly actionStartedCue: ParsedCue | null;
  readonly weaponFeedbackCue: Readonly<ParsedCue & {
    readonly attackerId: string;
    readonly actionDefinitionId: string;
    readonly visualCue: string;
    readonly emphasis: string;
  }> | null;
  readonly reducedMotion: boolean;
  readonly muted: boolean;
  readonly assetLoadState: AssetLoadState;
}

function parseInput(
  value: unknown,
  profile: ArenaV2WeaponFirstScreenReadabilityCandidateV1,
  placement: WeaponPlacement,
): ParsedInput {
  const source = cloneFrozenData(value, 'Arena V2首屏可读性输入');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2首屏可读性输入');
  if (source.schemaVersion !== 1) throw new RangeError('Arena V2首屏可读性输入只接受schemaVersion 1。');
  const tick = assertIntegerAtLeast(source.tick, 0, 'Arena V2首屏可读性输入.tick');
  const participantId = nullableString(source.participantId, 'Arena V2首屏可读性输入.participantId');
  const equipmentDefinitionId = assertNonEmptyString(
    source.equipmentDefinitionId,
    'Arena V2首屏可读性输入.equipmentDefinitionId',
  );
  if (equipmentDefinitionId !== profile.equipmentDefinitionId) {
    throw new RangeError('Arena V2首屏可读性输入武器身份漂移。');
  }
  if (!PLACEMENTS.has(source.placement) || source.placement !== placement) {
    throw new RangeError('Arena V2首屏可读性输入placement漂移。');
  }
  if (!PHASES.has(source.actionPhase)) throw new RangeError('Arena V2首屏可读性输入actionPhase未知。');
  if (!LOAD_STATES.has(source.assetLoadState)) throw new RangeError('Arena V2首屏可读性输入assetLoadState未知。');
  const actionDefinitionId = nullableString(
    source.actionDefinitionId,
    'Arena V2首屏可读性输入.actionDefinitionId',
  );
  const actionPhase = source.actionPhase as AuthorityActionPhase;
  if (
    placement === 'ground'
    && (participantId !== null || actionDefinitionId !== null || actionPhase !== 'idle')
  ) throw new RangeError('Arena V2地面拾取武器不能携带角色或动作阶段。');
  if (placement === 'held' && participantId === null) {
    throw new RangeError('Arena V2持握武器必须绑定participantId。');
  }
  if ((actionDefinitionId === null) !== (actionPhase === 'idle')) {
    throw new RangeError('Arena V2首屏动作身份与authority phase不闭合。');
  }
  if (
    actionDefinitionId !== null
    && actionDefinitionId !== profile.groundActionDefinitionId
    && actionDefinitionId !== profile.aerialActionDefinitionId
  ) throw new RangeError('Arena V2首屏动作不属于当前武器Definition。');
  const actionStartedCue = actionDefinitionId === null || participantId === null
    ? source.actionStartedCue === null
      ? null
      : (() => { throw new RangeError('idle/ground不能消费ActionStarted Cue。'); })()
    : parseActionCue(source.actionStartedCue, tick, participantId, profile, actionDefinitionId);
  const weaponFeedbackCue = parseFeedbackCue(
    source.weaponFeedbackCue,
    tick,
    participantId,
    profile,
    actionDefinitionId,
  );
  return Object.freeze({
    tick,
    participantId,
    equipmentDefinitionId,
    placement,
    actionDefinitionId,
    actionPhase,
    actionStartedCue,
    weaponFeedbackCue,
    reducedMotion: booleanValue(source.reducedMotion, 'Arena V2首屏可读性输入.reducedMotion'),
    muted: booleanValue(source.muted, 'Arena V2首屏可读性输入.muted'),
    assetLoadState: source.assetLoadState as AssetLoadState,
  });
}

interface MaterialRecord {
  readonly mesh: THREE.Mesh;
  readonly original: THREE.Material | THREE.Material[];
  readonly owned: THREE.Material[];
  readonly disposed: boolean[];
  assigned: boolean;
  restored: boolean;
}

interface EventIdentityRecord {
  readonly kind: 'action-started' | 'weapon-feedback';
  readonly sourceEventId: string;
  readonly tick: number;
  readonly sequence: number;
  readonly canonicalIdentity: string;
}

interface LocalVisualState {
  readonly position: THREE.Vector3;
  readonly rotation: THREE.Euler;
  readonly scale: THREE.Vector3;
  readonly visible: boolean;
}

function colorMaterial(material: THREE.Material): THREE.Material & {
  color?: THREE.Color;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
} {
  return material as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
  };
}

function restoreMaterialRecord(record: MaterialRecord): void {
  if (record.restored) return;
  record.mesh.material = record.original;
  record.assigned = false;
  record.restored = true;
}

function disposeMaterialRecord(record: MaterialRecord): readonly unknown[] {
  if (!record.restored) return Object.freeze([]);
  const errors: unknown[] = [];
  for (const [index, material] of record.owned.entries()) {
    if (record.disposed[index]) continue;
    try {
      material.dispose();
      record.disposed[index] = true;
    } catch (error) {
      errors.push(error);
      return Object.freeze(errors);
    }
  }
  return Object.freeze(errors);
}

function cleanupMaterialRecords(records: readonly MaterialRecord[]): readonly unknown[] {
  const errors: unknown[] = [];
  for (const record of [...records].reverse()) {
    if (record.restored) continue;
    if (!record.assigned) {
      record.restored = true;
      continue;
    }
    try {
      restoreMaterialRecord(record);
    } catch (error) {
      errors.push(error);
      return Object.freeze(errors);
    }
  }
  for (const record of records) {
    const disposeErrors = disposeMaterialRecord(record);
    errors.push(...disposeErrors);
    if (disposeErrors.length > 0) return Object.freeze(errors);
  }
  return Object.freeze(errors);
}

function materialRecordsCleanupComplete(records: readonly MaterialRecord[]): boolean {
  return records.every((record) => record.restored && record.disposed.every(Boolean));
}

export class ArenaV2CharacterWeaponFirstScreenReadabilityConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #records: readonly MaterialRecord[];

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    records: readonly MaterialRecord[],
  ) {
    super(
      [originalError, cleanupError],
      'Arena V2首屏可读性材质构造失败且回滚未收敛。',
    );
    this.name =
      'ArenaV2CharacterWeaponFirstScreenReadabilityConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#records = records;
  }

  get cleanupComplete(): boolean {
    return materialRecordsCleanupComplete(this.#records);
  }

  retryCleanup(): void {
    const errors = cleanupMaterialRecords(this.#records);
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2首屏可读性材质构造债务清理不完整。');
    }
  }
}

function cloneMaterialsTransactional(root: THREE.Object3D): readonly MaterialRecord[] {
  const sources: Array<Readonly<{
    mesh: THREE.Mesh;
    original: THREE.Material | THREE.Material[];
    borrowed: readonly THREE.Material[];
  }>> = [];
  const borrowedIdentities = new Set<THREE.Material>();
  const records: MaterialRecord[] = [];
  const ownedIdentities = new Set<THREE.Material>();
  try {
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const original = node.material;
      const borrowed = Array.isArray(original) ? [...original] : [original];
      for (const material of borrowed) {
        if (!(material instanceof THREE.Material)) {
          throw new TypeError('Arena V2首屏宿主Mesh含非Material借入值。');
        }
        borrowedIdentities.add(material);
      }
      sources.push(Object.freeze({
        mesh: node,
        original,
        borrowed: Object.freeze(borrowed),
      }));
    });
    for (const source of sources) {
      const record: MaterialRecord = {
        mesh: source.mesh,
        original: source.original,
        owned: [],
        disposed: [],
        assigned: false,
        restored: false,
      };
      records.push(record);
      for (const material of source.borrowed) {
        const owned = material.clone();
        if (!(owned instanceof THREE.Material)) {
          throw new TypeError('Arena V2首屏material.clone必须返回THREE.Material。');
        }
        if (borrowedIdentities.has(owned)) {
          throw new RangeError('Arena V2首屏material.clone不得返回任何借入材质。');
        }
        if (ownedIdentities.has(owned)) {
          throw new RangeError('Arena V2首屏material.clone必须为每个槽位返回独立材质。');
        }
        ownedIdentities.add(owned);
        record.owned.push(owned);
        record.disposed.push(false);
      }
      record.assigned = true;
      source.mesh.material = Array.isArray(source.original) ? record.owned : record.owned[0]!;
    }
    return Object.freeze(records);
  } catch (error) {
    const cleanupErrors = cleanupMaterialRecords(records);
    if (!materialRecordsCleanupComplete(records)) {
      throw new ArenaV2CharacterWeaponFirstScreenReadabilityConstructionCleanupFailureCandidateV1(
        error,
        cleanupErrors.length === 1
          ? cleanupErrors[0]
          : new AggregateError(cleanupErrors, 'Arena V2首屏可读性材质构造回滚不完整。'),
        Object.freeze(records),
      );
    }
    throw error;
  }
}

function captureLocalVisualState(object: THREE.Object3D): LocalVisualState {
  return Object.freeze({
    position: object.position.clone(),
    rotation: object.rotation.clone(),
    scale: object.scale.clone(),
    visible: object.visible,
  });
}

function localVisualStateEquals(object: THREE.Object3D, expected: LocalVisualState): boolean {
  return object.position.equals(expected.position)
    && object.rotation.x === expected.rotation.x
    && object.rotation.y === expected.rotation.y
    && object.rotation.z === expected.rotation.z
    && object.rotation.order === expected.rotation.order
    && object.scale.equals(expected.scale)
    && object.visible === expected.visible;
}

function materialOwnershipIntact(record: MaterialRecord): boolean {
  if (!record.assigned || record.restored) return false;
  const current = Array.isArray(record.mesh.material)
    ? record.mesh.material
    : [record.mesh.material];
  return current.length === record.owned.length
    && current.every((material, index) => material === record.owned[index]);
}

function applyMaterialState(
  records: readonly MaterialRecord[],
  profile: ArenaV2WeaponFirstScreenReadabilityCandidateV1,
  phase: AuthorityActionPhase,
): void {
  const color = new THREE.Color(
    phase === 'windup'
      ? profile.palette.dangerHex
      : phase === 'active'
        ? profile.palette.activeHex
        : profile.palette.primaryHex,
  );
  const emissive = new THREE.Color(
    phase === 'active' ? profile.palette.impactHex : profile.palette.dangerHex,
  );
  for (const record of records) {
    for (const material of record.owned) {
      const target = colorMaterial(material);
      if (target.color instanceof THREE.Color) target.color.copy(color);
      if (target.emissive instanceof THREE.Color) {
        target.emissive.copy(emissive);
        target.emissiveIntensity = phase === 'active' ? 0.12 : phase === 'windup' ? 0.07 : 0.02;
      }
      material.needsUpdate = true;
    }
  }
}

function composeLocalVisualState(
  baseline: LocalVisualState,
  profile: ArenaV2WeaponFirstScreenReadabilityCandidateV1,
  placement: WeaponPlacement,
  phase: AuthorityActionPhase,
  reducedMotion: boolean,
  assetLoadState: AssetLoadState,
): LocalVisualState {
  const basis = placement === 'held' ? profile.grip.heldEulerRadians : profile.groundPickup.eulerRadians;
  const baseScale = placement === 'held' ? profile.grip.heldScale : profile.groundPickup.scale;
  let phaseScale = 1;
  let phaseRotationX = 0;
  let phaseRotationZ = 0;
  let phaseScaleAxes: Vector3Tuple = [1, 1, 1];
  if (placement === 'held' && phase !== 'idle') {
    if (reducedMotion) {
      phaseScaleAxes = REDUCED_MOTION_STATIC_PHASE_SCALE_AXES[phase];
    } else {
      const phasePose = profile.actionReadability.phasePose[phase];
      phaseRotationX = phasePose.rotationX;
      phaseRotationZ = phasePose.rotationZ;
      phaseScale = phasePose.scale;
    }
  }
  return Object.freeze({
    position: new THREE.Vector3(
      baseline.position.x,
      baseline.position.y + (placement === 'ground' ? profile.groundPickup.heightOffset : 0),
      baseline.position.z,
    ),
    rotation: new THREE.Euler(
      baseline.rotation.x + basis[0] + phaseRotationX,
      baseline.rotation.y + basis[1],
      baseline.rotation.z + basis[2] + phaseRotationZ,
      baseline.rotation.order,
    ),
    scale: new THREE.Vector3(
      baseline.scale.x * profile.silhouette.identityScaleAxes[0]
        * baseScale * phaseScale * phaseScaleAxes[0],
      baseline.scale.y * profile.silhouette.identityScaleAxes[1]
        * baseScale * phaseScale * phaseScaleAxes[1],
      baseline.scale.z * profile.silhouette.identityScaleAxes[2]
        * baseScale * phaseScale * phaseScaleAxes[2],
    ),
    visible: assetLoadState === 'ready',
  });
}

function applyLocalVisualState(object: THREE.Object3D, value: LocalVisualState): void {
  object.position.copy(value.position);
  object.rotation.copy(value.rotation);
  object.scale.copy(value.scale);
  object.visible = value.visible;
}

const EVENT_WINDOW_CAPACITY = 64;

interface EventWindowPlan {
  readonly records: readonly EventIdentityRecord[];
  readonly highestSequence: number;
  readonly actionDuplicateSuppressed: boolean;
  readonly feedbackDuplicateSuppressed: boolean;
}

function canonicalInput(input: ParsedInput): string {
  return JSON.stringify({
    tick: input.tick,
    participantId: input.participantId,
    equipmentDefinitionId: input.equipmentDefinitionId,
    placement: input.placement,
    actionDefinitionId: input.actionDefinitionId,
    actionPhase: input.actionPhase,
    actionStartedCue: input.actionStartedCue,
    weaponFeedbackCue: input.weaponFeedbackCue,
    reducedMotion: input.reducedMotion,
    muted: input.muted,
    assetLoadState: input.assetLoadState,
  });
}

function inputEventRecords(input: ParsedInput): readonly EventIdentityRecord[] {
  const records: EventIdentityRecord[] = [];
  if (input.actionStartedCue !== null) {
    const cue = input.actionStartedCue;
    records.push(Object.freeze({
      kind: 'action-started' as const,
      sourceEventId: cue.sourceEventId,
      tick: cue.tick,
      sequence: cue.sequence,
      canonicalIdentity: [
        'action-started', cue.sourceEventId, cue.tick, cue.sequence,
        input.participantId, input.actionDefinitionId, input.equipmentDefinitionId,
      ].join('|'),
    }));
  }
  if (input.weaponFeedbackCue !== null) {
    const cue = input.weaponFeedbackCue;
    records.push(Object.freeze({
      kind: 'weapon-feedback' as const,
      sourceEventId: cue.sourceEventId,
      tick: cue.tick,
      sequence: cue.sequence,
      canonicalIdentity: [
        'weapon-feedback', cue.sourceEventId, cue.tick, cue.sequence,
        cue.attackerId, cue.actionDefinitionId, cue.visualCue, cue.emphasis,
      ].join('|'),
    }));
  }
  return Object.freeze(records.sort((left, right) => (
    left.sequence - right.sequence || left.kind.localeCompare(right.kind)
  )));
}

function stageEventWindow(
  input: ParsedInput,
  current: readonly EventIdentityRecord[],
  highestSequence: number,
): EventWindowPlan {
  const next = [...current];
  let nextHighest = highestSequence;
  let actionDuplicateSuppressed = false;
  let feedbackDuplicateSuppressed = false;
  for (const candidate of inputEventRecords(input)) {
    const sameId = next.find(({ sourceEventId }) => sourceEventId === candidate.sourceEventId);
    if (sameId !== undefined) {
      if (sameId.canonicalIdentity !== candidate.canonicalIdentity) {
        throw new RangeError('Arena V2首屏事件重复ID携带冲突事实。');
      }
      if (candidate.kind === 'action-started') actionDuplicateSuppressed = true;
      else feedbackDuplicateSuppressed = true;
      continue;
    }
    const sameSequence = next.find(({ sequence }) => sequence === candidate.sequence);
    if (sameSequence !== undefined) {
      throw new RangeError('Arena V2首屏事件相同sequence携带不同事实。');
    }
    if (candidate.sequence <= nextHighest) {
      throw new RangeError('Arena V2首屏事件早于64项窗口水位，拒绝重放。');
    }
    next.push(candidate);
    nextHighest = candidate.sequence;
    if (next.length > EVENT_WINDOW_CAPACITY) next.shift();
  }
  return Object.freeze({
    records: Object.freeze(next),
    highestSequence: nextHighest,
    actionDuplicateSuppressed,
    feedbackDuplicateSuppressed,
  });
}

export interface ArenaV2FirstScreenReadabilitySnapshotCandidateV1 {
  readonly tick: number;
  readonly weaponId: string;
  readonly equipmentDefinitionId: string;
  readonly placement: WeaponPlacement;
  readonly actionDefinitionId: string | null;
  readonly actionPhase: AuthorityActionPhase;
  readonly actionStartedSourceEventId: string | null;
  readonly actionStartedDuplicateSuppressed: boolean;
  readonly feedbackSourceEventId: string | null;
  readonly feedbackVisualCue: string | null;
  readonly feedbackDuplicateSuppressed: boolean;
  readonly reducedMotion: boolean;
  readonly muted: boolean;
  readonly visualDependsOnAudioPlayback: false;
  readonly assetLoadState: AssetLoadState;
  readonly fallbackRequested: boolean;
  readonly fallbackKind: 'non-spatial-status-cue' | null;
  readonly eventWindowCapacity: 64;
  readonly productionAssetApproved: false;
  readonly validationStatus: 'not-run';
}

/**
 * Isolated presentation-only decorator for all twenty collection weapons.
 * It consumes already-authoritative action phases and projected cues; it never
 * samples positions, animation completion, wall-clock time or audio duration to
 * decide a hit, pickup, replacement, fall or result.
 */
export class ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1 {
  readonly #object: THREE.Object3D | null;
  readonly #profile: ArenaV2WeaponFirstScreenReadabilityCandidateV1;
  readonly #placement: WeaponPlacement;
  readonly #baseline: LocalVisualState | null;
  readonly #materials: readonly MaterialRecord[];
  readonly #recentEvents: EventIdentityRecord[] = [];
  #state: ReadabilityViewState =
    ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.ACTIVE;
  #expected: LocalVisualState | null;
  #positionRestored: boolean;
  #rotationRestored: boolean;
  #scaleRestored: boolean;
  #visibleRestored: boolean;
  #highestEventSequence = -1;
  #lastAcceptedTick = -1;
  #lastInputCanonical: string | null = null;
  #lastSnapshot: ArenaV2FirstScreenReadabilitySnapshotCandidateV1 | null = null;

  constructor(value: unknown) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Arena V2首屏可读性options必须是普通对象。');
    }
    assertKnownKeys(value, OPTION_KEYS, 'Arena V2首屏可读性options');
    const equipmentDefinitionId = assertNonEmptyString(
      dataField(value, 'equipmentDefinitionId', 'Arena V2首屏可读性options'),
      'Arena V2首屏可读性options.equipmentDefinitionId',
    );
    const placement = dataField(value, 'placement', 'Arena V2首屏可读性options');
    if (!PLACEMENTS.has(placement)) throw new RangeError('Arena V2首屏可读性options.placement未知。');
    const object = dataField(value, 'object', 'Arena V2首屏可读性options');
    if (object !== null && !(object instanceof THREE.Object3D)) {
      throw new TypeError('Arena V2首屏可读性options.object必须是Object3D或null。');
    }
    this.#profile = requireArenaV2WeaponFirstScreenReadabilityProfileCandidateV1(
      equipmentDefinitionId,
    );
    this.#object = object as THREE.Object3D | null;
    this.#placement = placement as WeaponPlacement;
    this.#baseline = this.#object === null ? null : captureLocalVisualState(this.#object);
    this.#expected = this.#baseline;
    this.#positionRestored = this.#object === null;
    this.#rotationRestored = this.#object === null;
    this.#scaleRestored = this.#object === null;
    this.#visibleRestored = this.#object === null;
    this.#materials = this.#object === null
      ? Object.freeze([])
      : cloneMaterialsTransactional(this.#object);
  }

  get state(): ReadabilityViewState { return this.#state; }
  get profile(): ArenaV2WeaponFirstScreenReadabilityCandidateV1 { return this.#profile; }

  #assertActive(operation: string): void {
    if (this.#state !== ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.ACTIVE) {
      throw new Error(`${operation}拒绝状态${this.#state}。`);
    }
  }

  #assertOwnership(): void {
    if (
      this.#object !== null
      && this.#expected !== null
      && !localVisualStateEquals(this.#object, this.#expected)
    ) throw new Error('Arena V2首屏装饰器局部transform唯一所有权被外部写入破坏。');
    if (this.#materials.some((record) => !materialOwnershipIntact(record))) {
      throw new Error('Arena V2首屏装饰器材质引用唯一所有权被外部写入破坏。');
    }
  }

  #cleanup(): readonly unknown[] {
    const errors: unknown[] = [];
    if (this.#object !== null && this.#baseline !== null) {
      if (!this.#positionRestored) {
        try { this.#object.position.copy(this.#baseline.position); this.#positionRestored = true; }
        catch (error) { errors.push(error); return Object.freeze(errors); }
      }
      if (!this.#rotationRestored) {
        try { this.#object.rotation.copy(this.#baseline.rotation); this.#rotationRestored = true; }
        catch (error) { errors.push(error); return Object.freeze(errors); }
      }
      if (!this.#scaleRestored) {
        try { this.#object.scale.copy(this.#baseline.scale); this.#scaleRestored = true; }
        catch (error) { errors.push(error); return Object.freeze(errors); }
      }
      if (!this.#visibleRestored) {
        try { this.#object.visible = this.#baseline.visible; this.#visibleRestored = true; }
        catch (error) { errors.push(error); return Object.freeze(errors); }
      }
    }
    for (const record of [...this.#materials].reverse()) {
      if (!record.restored) {
        try { restoreMaterialRecord(record); } catch (error) {
          errors.push(error);
          return Object.freeze(errors);
        }
      }
    }
    for (const record of this.#materials) {
      const disposeErrors = disposeMaterialRecord(record);
      errors.push(...disposeErrors);
      if (disposeErrors.length > 0) return Object.freeze(errors);
    }
    return Object.freeze(errors);
  }

  #cleanupComplete(): boolean {
    return this.#positionRestored
      && this.#rotationRestored
      && this.#scaleRestored
      && this.#visibleRestored
      && this.#materials.every((record) => (
        record.restored && record.disposed.every(Boolean)
      ));
  }

  #failLifecycle(error: unknown): never {
    const cleanupErrors = this.#cleanup();
    this.#state = this.#cleanupComplete()
      ? ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.FAILED
      : ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.DISPOSE_INCOMPLETE;
    this.#expected = this.#baseline;
    this.#recentEvents.length = 0;
    this.#highestEventSequence = -1;
    this.#lastAcceptedTick = -1;
    this.#lastInputCanonical = null;
    this.#lastSnapshot = null;
    throw cleanupErrors.length === 0
      ? error
      : new AggregateError(
        [error, ...cleanupErrors],
        'Arena V2首屏可读性写入失败且回收不完整。',
      );
  }

  consume(value: unknown): ArenaV2FirstScreenReadabilitySnapshotCandidateV1 {
    this.#assertActive('Arena V2首屏可读性consume');
    const input = parseInput(value, this.#profile, this.#placement);
    if (input.assetLoadState === 'ready' && this.#object === null) {
      throw new RangeError('Arena V2首屏武器声明ready但缺少已加载Object3D。');
    }
    const inputCanonical = canonicalInput(input);
    if (input.tick < this.#lastAcceptedTick) {
      throw new RangeError('Arena V2首屏输入tick回退；仅epoch reset可建立新水位。');
    }
    const sameTick = input.tick === this.#lastAcceptedTick;
    if (sameTick && inputCanonical !== this.#lastInputCanonical) {
      throw new RangeError('Arena V2首屏同tick输入携带冲突事实。');
    }
    const eventPlan = stageEventWindow(
      input,
      this.#recentEvents,
      this.#highestEventSequence,
    );
    try { this.#assertOwnership(); } catch (error) { return this.#failLifecycle(error); }
    if (sameTick) {
      if (this.#lastSnapshot === null) {
        throw new Error('Arena V2首屏同tick幂等状态缺少已提交快照。');
      }
      return this.#lastSnapshot;
    }
    const fallbackRequested = input.assetLoadState === 'missing';
    const nextVisualState = this.#object === null || this.#baseline === null
      ? null
      : composeLocalVisualState(
        this.#baseline,
        this.#profile,
        this.#placement,
        input.actionPhase,
        input.reducedMotion,
        input.assetLoadState,
      );
    try {
      if (this.#object !== null && nextVisualState !== null) {
        applyLocalVisualState(this.#object, nextVisualState);
        if (!fallbackRequested) {
          applyMaterialState(this.#materials, this.#profile, input.actionPhase);
        }
      }
    } catch (error) {
      return this.#failLifecycle(error);
    }
    const snapshot = Object.freeze({
      tick: input.tick,
      weaponId: this.#profile.weaponId,
      equipmentDefinitionId: input.equipmentDefinitionId,
      placement: input.placement,
      actionDefinitionId: input.actionDefinitionId,
      actionPhase: input.actionPhase,
      actionStartedSourceEventId: eventPlan.actionDuplicateSuppressed
        ? null
        : input.actionStartedCue?.sourceEventId ?? null,
      actionStartedDuplicateSuppressed: eventPlan.actionDuplicateSuppressed,
      feedbackSourceEventId: input.weaponFeedbackCue?.sourceEventId ?? null,
      feedbackVisualCue: eventPlan.feedbackDuplicateSuppressed
        ? null
        : input.weaponFeedbackCue?.visualCue ?? null,
      feedbackDuplicateSuppressed: eventPlan.feedbackDuplicateSuppressed,
      reducedMotion: input.reducedMotion,
      muted: input.muted,
      visualDependsOnAudioPlayback: false as const,
      assetLoadState: input.assetLoadState,
      fallbackRequested,
      fallbackKind: fallbackRequested ? 'non-spatial-status-cue' as const : null,
      eventWindowCapacity: EVENT_WINDOW_CAPACITY as 64,
      productionAssetApproved: false as const,
      validationStatus: 'not-run' as const,
    });
    this.#recentEvents.splice(0, this.#recentEvents.length, ...eventPlan.records);
    this.#highestEventSequence = eventPlan.highestSequence;
    this.#lastAcceptedTick = input.tick;
    this.#lastInputCanonical = inputCanonical;
    this.#expected = nextVisualState;
    this.#lastSnapshot = snapshot;
    return snapshot;
  }

  getSnapshot(): ArenaV2FirstScreenReadabilitySnapshotCandidateV1 | null {
    this.#assertActive('Arena V2首屏可读性getSnapshot');
    return this.#lastSnapshot;
  }

  resetPresentationEpoch(): void {
    this.#assertActive('Arena V2首屏可读性resetPresentationEpoch');
    try { this.#assertOwnership(); } catch (error) { return this.#failLifecycle(error); }
    this.#recentEvents.length = 0;
    this.#highestEventSequence = -1;
    this.#lastAcceptedTick = -1;
    this.#lastInputCanonical = null;
    this.#lastSnapshot = null;
  }

  destroy(): void {
    if (this.#state === ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.DESTROYED) {
      return;
    }
    const errors = this.#cleanup();
    if (!this.#cleanupComplete()) {
      this.#state = ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.DISPOSE_INCOMPLETE;
      throw new AggregateError(errors, 'Arena V2首屏可读性销毁不完整，可重试destroy。');
    }
    this.#recentEvents.length = 0;
    this.#highestEventSequence = -1;
    this.#lastAcceptedTick = -1;
    this.#lastInputCanonical = null;
    this.#lastSnapshot = null;
    this.#expected = this.#baseline;
    this.#state = ARENA_V2_FIRST_SCREEN_READABILITY_VIEW_STATE_CANDIDATE_V1.DESTROYED;
  }
}

export const ARENA_V2_CHARACTER_WEAPON_FIRST_SCREEN_READABILITY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  characterCount: 6 as const,
  weaponCount: 20 as const,
  implementedWeaponCount: 20 as const,
  distinctAuthorityPhasePoseCount: 20 as const,
  distinctSharedHeldGroundSilhouetteScaleCount: 20 as const,
  reducedMotionStaticPhaseShapeCount: 3 as const,
  reducedMotionStaticPhaseScaleAxes: REDUCED_MOTION_STATIC_PHASE_SCALE_AXES,
  reducedMotionPhaseShapeUsesAuthorityPhaseOnly: true as const,
  reducedMotionPhaseShapeCreatesResourcesOrDrawCalls: false as const,
  identityScaleAxisBounds: Object.freeze({
    minimum: MIN_IDENTITY_SCALE_AXIS,
    maximum: MAX_IDENTITY_SCALE_AXIS,
  }),
  staticCatalogWeaponCount: 0 as const,
  allTwentyWeaponMountProfilesImplemented: true as const,
  characterAssetEvidence: CHARACTER_ASSET_EVIDENCE,
  characterIdentities: ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1,
  weaponReadabilityCatalog: ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1,
  lighting: ARENA_V2_FIRST_SCREEN_LIGHTING_CANDIDATE_V1,
  authorityInputs: Object.freeze([
    'MatchReadFrameV3.participant.action.phase',
    'ArenaMatchEventV6.ActionStarted',
    'WeaponFeedbackPresented(source:ArenaMatchEventV6.WeaponFeedbackResolved)',
  ] as const),
  forbiddenInferenceInputs: Object.freeze([
    'position-delta', 'animation-completion', 'event-order-guess', 'audio-duration', 'wall-clock',
  ] as const),
  requiredInputConcepts: Object.freeze(['direction', 'jump', 'primary'] as const),
  addsInput: false as const,
  programmaticAssetFallbackUsed: false as const,
  candidateAssetsMayBeCalledApprovedOrFinal: false as const,
  runtimeCaptureStatus: 'not-run' as const,
  deviceStatus: 'not-run' as const,
  humanStatus: 'not-run' as const,
  performanceStatus: 'not-run' as const,
  eventWindowCapacity: EVENT_WINDOW_CAPACITY,
  localTransformOwner:
    'decorator-owns-attachment-root-local-transform-host-may-move-parent-only' as const,
  terminalCleanupUsesTransformMaterialRestoreDisposeWatermarks: true as const,
  ordinaryCleanupFailureRetainsCurrentAndLaterOwners: true as const,
  constructorFailureExposesRetryableMaterialCloneOwner: true as const,
  validationStatus: 'not-run' as const,
});
