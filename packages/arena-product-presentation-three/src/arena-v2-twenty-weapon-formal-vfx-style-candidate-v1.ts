import {
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
  requireArenaV2WeaponFeedbackFamilyShapeForCoreVerbCandidateV1,
  type ArenaV2WeaponCombatGrammarIdentityCandidateV1,
  type ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';

type WeaponId = NonNullable<ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1['weaponId']>;

export type ArenaV2WeaponFeedbackParticlePatternCandidateV1 =
  | 'radial-burst'
  | 'forward-fan'
  | 'tether-line'
  | 'lane-line'
  | 'rebound-diamond'
  | 'rear-sweep'
  | 'paired-fan'
  | 'three-prong'
  | 'downward-burst';

interface WeaponShapeProfile {
  readonly identity: string;
  readonly thetaSegments: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number;
  readonly secondaryRotation: number;
  readonly bandScale: number;
  readonly spriteScaleX: number;
  readonly spriteScaleY: number;
  readonly particlePattern: ArenaV2WeaponFeedbackParticlePatternCandidateV1;
  readonly particleSize: number;
  readonly directionLengthScale: number;
  readonly directionThicknessScale: number;
}

export interface ArenaV2TwentyWeaponFormalVfxStyleCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly styleId: string;
  readonly weaponId: WeaponId;
  readonly feedbackKind: ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1['feedbackKind'];
  readonly actionContext: NonNullable<
    ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1['actionContext']
  >;
  readonly modeKind: ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1['modeKind'];
  readonly combatGrammarIdentity: ArenaV2WeaponCombatGrammarIdentityCandidateV1;
  readonly resultHierarchy: Readonly<{
    readonly role: 'non-hit-whiff' | 'contact-confirm' | 'directional-transfer' | 'terminal-ring-out';
    readonly rank: 0 | 1 | 2 | 3;
    readonly shapeExtentMultiplier: 0.82 | 0.88 | 1 | 1.16;
    readonly particleExtentMultiplier: 0 | 0.8 | 1 | 1.15;
    readonly directionExtentMultiplier: 0.82 | 0.86 | 1.15 | 1.3;
  }>;
  readonly identity: Readonly<{
    readonly familyShape: string;
    readonly contactAccent: string;
    readonly tailGesture: string;
    readonly contactGeometry: string;
  }>;
  readonly palette: Readonly<{
    readonly core: number;
    readonly edge: number;
  }>;
  readonly shape: Readonly<{
    readonly innerRadius: number;
    readonly outerRadius: number;
    readonly startAngle: number;
    readonly arc: number;
    readonly rotation: number;
    readonly secondaryRotation: number;
    readonly thetaSegments: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly spriteScaleX: number;
    readonly spriteScaleY: number;
  }>;
  readonly particles: Readonly<{
    readonly pattern: ArenaV2WeaponFeedbackParticlePatternCandidateV1;
    readonly size: number;
    readonly spreadX: number;
    readonly spreadY: number;
  }>;
  readonly direction: Readonly<{
    readonly lengthScale: number;
    readonly thicknessScale: number;
  }>;
  readonly accessibility: Readonly<{
    readonly weaponIdentitySurvivesStaticMotionPolicy: true;
    readonly resultShapeDoesNotDependOnColor: true;
  }>;
  readonly governance: Readonly<{
    readonly consumesResolvedPresentationIdentityOnly: true;
    readonly ownsRuleOrHitAuthority: false;
    readonly infersOutcomeOrDirection: false;
    readonly authoredCoreTextureRemainsRequired: true;
    readonly generatedGeometryIsSupportingLayerOnly: true;
  }>;
}

const WEAPON_SHAPE_PROFILES = Object.freeze({
  'charge-shield': Object.freeze({
    identity: 'wide-round-front-face', thetaSegments: 32, scaleX: 1.34, scaleY: 0.82,
    rotation: 0, secondaryRotation: 0, bandScale: 1.12,
    spriteScaleX: 1.22, spriteScaleY: 0.92, particlePattern: 'forward-fan',
    particleSize: 0.09, directionLengthScale: 1.08, directionThicknessScale: 1.3,
  }),
  'heavy-hammer': Object.freeze({
    identity: 'square-heavy-head', thetaSegments: 4, scaleX: 1.08, scaleY: 1.08,
    rotation: Math.PI * 0.25, secondaryRotation: Math.PI * 0.25, bandScale: 1.28,
    spriteScaleX: 1, spriteScaleY: 1, particlePattern: 'downward-burst',
    particleSize: 0.12, directionLengthScale: 0.92, directionThicknessScale: 1.55,
  }),
  'gravity-chain': Object.freeze({
    identity: 'hooked-tether-endpoint', thetaSegments: 24, scaleX: 1.5, scaleY: 0.62,
    rotation: 0, secondaryRotation: Math.PI * 0.08, bandScale: 0.82,
    spriteScaleX: 1.28, spriteScaleY: 0.78, particlePattern: 'tether-line',
    particleSize: 0.075, directionLengthScale: 1.25, directionThicknessScale: 0.82,
  }),
  'line-suppressor': Object.freeze({
    identity: 'needle-line-pulse', thetaSegments: 4, scaleX: 1.72, scaleY: 0.38,
    rotation: Math.PI * 0.25, secondaryRotation: 0, bandScale: 0.72,
    spriteScaleX: 1.42, spriteScaleY: 0.68, particlePattern: 'lane-line',
    particleSize: 0.055, directionLengthScale: 1.45, directionThicknessScale: 0.58,
  }),
  'read-counter': Object.freeze({
    identity: 'notched-rebound-diamond', thetaSegments: 4, scaleX: 0.9, scaleY: 0.9,
    rotation: 0, secondaryRotation: Math.PI * 0.25, bandScale: 0.74,
    spriteScaleX: 0.94, spriteScaleY: 0.94, particlePattern: 'rebound-diamond',
    particleSize: 0.075, directionLengthScale: 0.86, directionThicknessScale: 0.92,
  }),
  'flank-blade': Object.freeze({
    identity: 'rear-crescent-cut', thetaSegments: 32, scaleX: 1.36, scaleY: 0.66,
    rotation: Math.PI * 0.48, secondaryRotation: -Math.PI * 0.18, bandScale: 0.7,
    spriteScaleX: 1.2, spriteScaleY: 0.8, particlePattern: 'rear-sweep',
    particleSize: 0.07, directionLengthScale: 1.02, directionThicknessScale: 0.68,
  }),
  'hook-spear': Object.freeze({
    identity: 'long-hook-point', thetaSegments: 5, scaleX: 1.62, scaleY: 0.54,
    rotation: Math.PI * 0.1, secondaryRotation: -Math.PI * 0.12, bandScale: 0.8,
    spriteScaleX: 1.38, spriteScaleY: 0.72, particlePattern: 'tether-line',
    particleSize: 0.065, directionLengthScale: 1.48, directionThicknessScale: 0.64,
  }),
  'burst-gauntlet': Object.freeze({
    identity: 'compact-double-burst', thetaSegments: 8, scaleX: 0.9, scaleY: 0.9,
    rotation: Math.PI * 0.125, secondaryRotation: -Math.PI * 0.125, bandScale: 1.15,
    spriteScaleX: 0.9, spriteScaleY: 0.9, particlePattern: 'paired-fan',
    particleSize: 0.105, directionLengthScale: 0.82, directionThicknessScale: 1.18,
  }),
  'vault-lance': Object.freeze({
    identity: 'long-lance-wedge', thetaSegments: 3, scaleX: 1.68, scaleY: 0.58,
    rotation: -Math.PI * 0.5, secondaryRotation: Math.PI * 0.08, bandScale: 0.86,
    spriteScaleX: 1.42, spriteScaleY: 0.72, particlePattern: 'forward-fan',
    particleSize: 0.07, directionLengthScale: 1.55, directionThicknessScale: 0.66,
  }),
  'scatter-cannon': Object.freeze({
    identity: 'broad-fragmented-fan', thetaSegments: 6, scaleX: 1.36, scaleY: 0.9,
    rotation: 0, secondaryRotation: Math.PI / 6, bandScale: 1.08,
    spriteScaleX: 1.3, spriteScaleY: 0.96, particlePattern: 'forward-fan',
    particleSize: 0.1, directionLengthScale: 1.08, directionThicknessScale: 1.32,
  }),
  'sky-anchor': Object.freeze({
    identity: 'vertical-anchor-mark', thetaSegments: 5, scaleX: 0.72, scaleY: 1.48,
    rotation: -Math.PI * 0.5, secondaryRotation: Math.PI * 0.5, bandScale: 1.2,
    spriteScaleX: 0.82, spriteScaleY: 1.3, particlePattern: 'downward-burst',
    particleSize: 0.11, directionLengthScale: 0.9, directionThicknessScale: 1.42,
  }),
  'edge-scythe': Object.freeze({
    identity: 'wide-edge-crescent', thetaSegments: 32, scaleX: 1.52, scaleY: 0.76,
    rotation: Math.PI * 0.34, secondaryRotation: Math.PI * 0.18, bandScale: 0.62,
    spriteScaleX: 1.34, spriteScaleY: 0.84, particlePattern: 'rear-sweep',
    particleSize: 0.08, directionLengthScale: 1.18, directionThicknessScale: 0.62,
  }),
  'rebound-hook': Object.freeze({
    identity: 'curled-return-hook', thetaSegments: 12, scaleX: 1.08, scaleY: 0.82,
    rotation: Math.PI * 0.2, secondaryRotation: -Math.PI * 0.32, bandScale: 0.68,
    spriteScaleX: 1.02, spriteScaleY: 0.88, particlePattern: 'rebound-diamond',
    particleSize: 0.08, directionLengthScale: 0.94, directionThicknessScale: 0.8,
  }),
  'pulse-baton': Object.freeze({
    identity: 'compact-repeat-bars', thetaSegments: 8, scaleX: 1.34, scaleY: 0.48,
    rotation: Math.PI * 0.125, secondaryRotation: Math.PI * 0.25, bandScale: 0.64,
    spriteScaleX: 1.12, spriteScaleY: 0.76, particlePattern: 'lane-line',
    particleSize: 0.06, directionLengthScale: 1.18, directionThicknessScale: 0.7,
  }),
  'siege-axe': Object.freeze({
    identity: 'blocky-split-wedge', thetaSegments: 6, scaleX: 1.38, scaleY: 1.06,
    rotation: Math.PI / 6, secondaryRotation: -Math.PI / 6, bandScale: 1.3,
    spriteScaleX: 1.24, spriteScaleY: 1.04, particlePattern: 'downward-burst',
    particleSize: 0.12, directionLengthScale: 1, directionThicknessScale: 1.58,
  }),
  'twin-fan': Object.freeze({
    identity: 'paired-soft-fans', thetaSegments: 16, scaleX: 1.38, scaleY: 0.78,
    rotation: Math.PI * 0.16, secondaryRotation: -Math.PI * 0.32, bandScale: 0.74,
    spriteScaleX: 1.24, spriteScaleY: 0.88, particlePattern: 'paired-fan',
    particleSize: 0.075, directionLengthScale: 1.04, directionThicknessScale: 0.72,
  }),
  'diving-claw': Object.freeze({
    identity: 'diagonal-three-prong', thetaSegments: 3, scaleX: 1.18, scaleY: 1.02,
    rotation: Math.PI * 0.42, secondaryRotation: -Math.PI * 0.12, bandScale: 0.78,
    spriteScaleX: 1.08, spriteScaleY: 1, particlePattern: 'three-prong',
    particleSize: 0.078, directionLengthScale: 1.18, directionThicknessScale: 0.68,
  }),
  'route-bow': Object.freeze({
    identity: 'needle-arrow-line', thetaSegments: 24, scaleX: 1.64, scaleY: 0.5,
    rotation: 0, secondaryRotation: Math.PI * 0.5, bandScale: 0.58,
    spriteScaleX: 1.38, spriteScaleY: 0.7, particlePattern: 'lane-line',
    particleSize: 0.052, directionLengthScale: 1.62, directionThicknessScale: 0.52,
  }),
  'pivot-blade': Object.freeze({
    identity: 'pivot-chevron-cut', thetaSegments: 4, scaleX: 1.18, scaleY: 0.74,
    rotation: Math.PI * 0.25, secondaryRotation: -Math.PI * 0.25, bandScale: 0.72,
    spriteScaleX: 1.08, spriteScaleY: 0.84, particlePattern: 'rear-sweep',
    particleSize: 0.068, directionLengthScale: 1.02, directionThicknessScale: 0.66,
  }),
  'commitment-fist': Object.freeze({
    identity: 'held-square-fist', thetaSegments: 4, scaleX: 1, scaleY: 1,
    rotation: Math.PI * 0.25, secondaryRotation: 0, bandScale: 1.2,
    spriteScaleX: 0.96, spriteScaleY: 0.96, particlePattern: 'radial-burst',
    particleSize: 0.11, directionLengthScale: 0.9, directionThicknessScale: 1.38,
  }),
} as const satisfies Readonly<Record<WeaponId, WeaponShapeProfile>>);

const FAMILY_PALETTES = Object.freeze({
  'solid-outward-wedge': Object.freeze({ core: 0xff_f1_c4, edge: 0xf2_76_49 }),
  'tension-line-with-endpoint': Object.freeze({ core: 0xe8_fb_ff, edge: 0x27_b6_c8 }),
  'broad-leading-arc-wedge': Object.freeze({ core: 0xff_e7_a1, edge: 0xff_8b_3d }),
  'thin-lane-line-with-ticks': Object.freeze({ core: 0xe5_fb_ff, edge: 0x3d_91_ff }),
  'compact-rebound-diamond': Object.freeze({ core: 0xef_ff_df, edge: 0x72_c8_62 }),
  'asymmetric-rear-arc': Object.freeze({ core: 0xf7_e7_ff, edge: 0xb4_72_e6 }),
} as const);

const RESULT_HIERARCHY = Object.freeze({
  'attack-evaded': Object.freeze({
    role: 'non-hit-whiff',
    rank: 0,
    shapeExtentMultiplier: 0.88,
    particleExtentMultiplier: 0,
    directionExtentMultiplier: 0.82,
  }),
  'hit-confirm': Object.freeze({
    role: 'contact-confirm',
    rank: 1,
    shapeExtentMultiplier: 0.82,
    particleExtentMultiplier: 0.8,
    directionExtentMultiplier: 0.86,
  }),
  'hit-surface-transfer': Object.freeze({
    role: 'directional-transfer',
    rank: 2,
    shapeExtentMultiplier: 1,
    particleExtentMultiplier: 1,
    directionExtentMultiplier: 1.15,
  }),
  'hit-ring-out': Object.freeze({
    role: 'terminal-ring-out',
    rank: 3,
    shapeExtentMultiplier: 1.16,
    particleExtentMultiplier: 1.15,
    directionExtentMultiplier: 1.3,
  }),
} as const satisfies Readonly<Record<
  Exclude<
    ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1['feedbackKind'],
    'movement-fall'
  >,
  ArenaV2TwentyWeaponFormalVfxStyleCandidateV1['resultHierarchy']
>>);

const COMBAT_GRAMMAR_IDENTITY_KEYS = new Set([
  'sourceContentHash', 'weaponId', 'context', 'actionDefinitionId',
  'coreVerb', 'failureRisk', 'counterInputs',
]);
const GRAMMAR_SOURCE =
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1;
const EXPECTED_FAMILY_SHAPES = new Set(
  GRAMMAR_SOURCE.entries.map(({ coreVerb }) => (
    requireArenaV2WeaponFeedbackFamilyShapeForCoreVerbCandidateV1(coreVerb)
  )),
);
const GRAMMAR_CATALOG_IDS: ReadonlySet<string> = new Set<string>(
  GRAMMAR_SOURCE.entries.map(({ catalogId }) => catalogId),
);
const GRAMMAR_DEFINITION_IDS: ReadonlySet<string> = new Set<string>(
  GRAMMAR_SOURCE.entries.map(({ weaponDefinitionId }) => weaponDefinitionId),
);
const SHAPE_PROFILE_WEAPON_IDS = Object.keys(WEAPON_SHAPE_PROFILES);
const SHAPE_PROFILE_WEAPON_ID_SET: ReadonlySet<string> = new Set<string>(
  SHAPE_PROFILE_WEAPON_IDS,
);

if (EXPECTED_FAMILY_SHAPES.size !== 6
  || Object.keys(FAMILY_PALETTES).length !== EXPECTED_FAMILY_SHAPES.size
  || Object.keys(FAMILY_PALETTES).some((familyShape) => !EXPECTED_FAMILY_SHAPES.has(familyShape))
  || GRAMMAR_CATALOG_IDS.size !== 20
  || GRAMMAR_DEFINITION_IDS.size !== 20
  || GRAMMAR_SOURCE.entries.some(({ catalogId, weaponDefinitionId }) => (
    catalogId.length === 0
    || weaponDefinitionId.length === 0
    || catalogId === weaponDefinitionId
    || GRAMMAR_DEFINITION_IDS.has(catalogId)
    || GRAMMAR_CATALOG_IDS.has(weaponDefinitionId)
  ))
  || SHAPE_PROFILE_WEAPON_IDS.length !== 20
  || SHAPE_PROFILE_WEAPON_IDS.some((weaponId) => !GRAMMAR_CATALOG_IDS.has(weaponId))
  || GRAMMAR_SOURCE.entries.some(({ catalogId }) => !SHAPE_PROFILE_WEAPON_ID_SET.has(catalogId))
  || new Set(Object.values(WEAPON_SHAPE_PROFILES).map(({ identity }) => identity)).size !== 20) {
  throw new RangeError('Arena V2 formal VFX语法家族与20把接触轮廓目录未双向闭合。');
}

function combatGrammarIdentity(
  resolution: ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1,
): ArenaV2WeaponCombatGrammarIdentityCandidateV1 {
  if (resolution.combatGrammarIdentity === null) {
    throw new RangeError('Arena V2 formal VFX武器反馈缺少combatGrammarIdentity。');
  }
  const source = cloneFrozenData(
    resolution.combatGrammarIdentity,
    'Arena V2 formal VFX combatGrammarIdentity',
  );
  assertKnownKeys(
    source,
    COMBAT_GRAMMAR_IDENTITY_KEYS,
    'Arena V2 formal VFX combatGrammarIdentity',
  );
  for (const key of COMBAT_GRAMMAR_IDENTITY_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 formal VFX combatGrammarIdentity缺少${key}。`);
    }
  }
  if (resolution.weaponId === null || resolution.actionContext === null) {
    throw new RangeError('Arena V2 formal VFX武器语法缺少武器或情境身份。');
  }
  const entry = GRAMMAR_SOURCE.entries.find(({ catalogId }) => (
    catalogId === resolution.weaponId
  ));
  const context = entry?.contexts.find((candidate) => (
    candidate.context === resolution.actionContext
  ));
  if (entry === undefined
    || context === undefined
    || entry.catalogId !== resolution.weaponId
    || entry.weaponDefinitionId === resolution.weaponId
    || source.sourceContentHash !== GRAMMAR_SOURCE.contentHash
    || source.weaponId !== resolution.weaponId
    || source.context !== resolution.actionContext
    || source.actionDefinitionId !== context.actionDefinitionId
    || source.coreVerb !== entry.coreVerb
    || source.failureRisk !== context.failureRisk
    || !Array.isArray(source.counterInputs)
    || source.counterInputs.length !== context.counterInputs.length
    || source.counterInputs.some((input, index) => input !== context.counterInputs[index])) {
    throw new RangeError(
      `Arena V2 formal VFX ${resolution.weaponId}/${resolution.actionContext}战斗语法身份漂移。`,
    );
  }
  return Object.freeze({
    sourceContentHash: GRAMMAR_SOURCE.contentHash,
    weaponId: resolution.weaponId,
    context: resolution.actionContext,
    actionDefinitionId: context.actionDefinitionId,
    coreVerb: entry.coreVerb,
    failureRisk: context.failureRisk,
    counterInputs: Object.freeze([...context.counterInputs]),
  });
}

function semanticShape(
  feedbackKind: ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1['feedbackKind'],
): Readonly<{
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly startAngle: number;
  readonly arc: number;
  readonly rotation: number;
}> {
  if (feedbackKind === 'hit-surface-transfer') return Object.freeze({
    innerRadius: 0.48, outerRadius: 0.65, startAngle: 0,
    arc: Math.PI * 1.68, rotation: Math.PI * 0.16,
  });
  if (feedbackKind === 'hit-ring-out') return Object.freeze({
    innerRadius: 0.44, outerRadius: 0.74, startAngle: Math.PI * 0.16,
    arc: Math.PI * 1.34, rotation: -Math.PI * 0.2,
  });
  if (feedbackKind === 'attack-evaded') return Object.freeze({
    innerRadius: 0.55, outerRadius: 0.66, startAngle: Math.PI * 0.1,
    arc: Math.PI * 1.16, rotation: Math.PI * 0.34,
  });
  return Object.freeze({
    innerRadius: 0.38, outerRadius: 0.64, startAngle: 0,
    arc: Math.PI * 2, rotation: 0,
  });
}

function familyPalette(familyShape: string): Readonly<{ core: number; edge: number }> {
  const palette = FAMILY_PALETTES[familyShape as keyof typeof FAMILY_PALETTES];
  if (palette === undefined) {
    throw new RangeError(`Arena V2武器VFX未知家族形状：${familyShape}。`);
  }
  return palette;
}

export function resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1(
  resolution: ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1,
): ArenaV2TwentyWeaponFormalVfxStyleCandidateV1 | null {
  if (resolution.schemaVersion !== 1
    || resolution.status !== 'production-unreachable'
    || resolution.implementationStatus !== 'code-written-not-run'
    || resolution.validationStatus !== 'not-run'
    || resolution.hardGate !== false) {
    throw new RangeError('Arena V2 formal VFX resolution治理状态漂移。');
  }
  if (!resolution.weaponSpecific) {
    if (resolution.feedbackKind !== 'movement-fall'
      || resolution.weaponId !== null
      || resolution.actionContext !== null
      || resolution.combatGrammarIdentity !== null
      || resolution.specializedCueId
        !== `arena.cue.vfx.weapon-feedback.movement-global.movement-fall.${resolution.modeKind}.candidate.v1`) {
      throw new RangeError('Arena V2 movement-fall不得携带武器战斗语法身份。');
    }
    return null;
  }
  if (resolution.weaponId === null || resolution.feedbackKind === 'movement-fall') {
    throw new RangeError('Arena V2武器VFX身份与反馈语义不闭合。');
  }
  if (resolution.actionContext === null) {
    throw new RangeError(`Arena V2武器${resolution.weaponId}反馈缺少动作上下文。`);
  }
  const weapon = WEAPON_SHAPE_PROFILES[resolution.weaponId];
  if (weapon === undefined) {
    throw new RangeError(`Arena V2 formal VFX未知武器轮廓：${resolution.weaponId}。`);
  }
  const grammarIdentity = combatGrammarIdentity(resolution);
  const expectedCueId = `arena.cue.vfx.weapon-feedback.${resolution.weaponId}.${
    resolution.actionContext
  }.${resolution.feedbackKind}.${resolution.modeKind}.candidate.v1`;
  if (resolution.specializedCueId !== expectedCueId) {
    throw new RangeError('Arena V2 formal VFX Cue与武器/情境/结果/模式身份漂移。');
  }
  const expectedFamilyShape = requireArenaV2WeaponFeedbackFamilyShapeForCoreVerbCandidateV1(
    grammarIdentity.coreVerb,
  );
  if (resolution.shapeTimingColor.familyShape !== expectedFamilyShape) {
    throw new RangeError(
      `Arena V2 formal VFX ${resolution.weaponId} familyShape与coreVerb矛盾。`,
    );
  }
  const semantic = semanticShape(resolution.feedbackKind);
  const resultHierarchy = RESULT_HIERARCHY[resolution.feedbackKind];
  const modeScale = resolution.modeKind === 'duel'
    ? 1
    : resolution.modeKind === 'race'
      ? 0.94
      : 0.88;
  const aerialRotation = resolution.actionContext === 'aerial' ? Math.PI * 0.1 : 0;
  const aerialScaleY = resolution.actionContext === 'aerial' ? 1.08 : 1;
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    styleId: `${resolution.specializedCueId}.formal-style.v1`,
    weaponId: resolution.weaponId,
    feedbackKind: resolution.feedbackKind,
    actionContext: resolution.actionContext,
    modeKind: resolution.modeKind,
    combatGrammarIdentity: grammarIdentity,
    resultHierarchy,
    identity: Object.freeze({
      familyShape: resolution.shapeTimingColor.familyShape,
      contactAccent: resolution.shapeTimingColor.contactAccent,
      tailGesture: resolution.shapeTimingColor.tailGesture,
      contactGeometry: weapon.identity,
    }),
    palette: familyPalette(resolution.shapeTimingColor.familyShape),
    shape: Object.freeze({
      innerRadius: semantic.innerRadius,
      outerRadius: semantic.innerRadius
        + (semantic.outerRadius - semantic.innerRadius) * weapon.bandScale,
      startAngle: semantic.startAngle,
      arc: semantic.arc,
      rotation: semantic.rotation + weapon.rotation + aerialRotation,
      secondaryRotation: weapon.secondaryRotation,
      thetaSegments: weapon.thetaSegments,
      scaleX: weapon.scaleX * modeScale * resultHierarchy.shapeExtentMultiplier,
      scaleY: weapon.scaleY * modeScale * aerialScaleY
        * resultHierarchy.shapeExtentMultiplier,
      spriteScaleX: weapon.spriteScaleX * modeScale
        * resultHierarchy.shapeExtentMultiplier,
      spriteScaleY: weapon.spriteScaleY * modeScale * aerialScaleY
        * resultHierarchy.shapeExtentMultiplier,
    }),
    particles: Object.freeze({
      pattern: weapon.particlePattern,
      size: weapon.particleSize * resultHierarchy.particleExtentMultiplier,
      spreadX: weapon.scaleX * modeScale * resultHierarchy.particleExtentMultiplier,
      spreadY: weapon.scaleY * modeScale * aerialScaleY
        * resultHierarchy.particleExtentMultiplier,
    }),
    direction: Object.freeze({
      lengthScale: weapon.directionLengthScale * resultHierarchy.directionExtentMultiplier,
      thicknessScale: weapon.directionThicknessScale
        * resultHierarchy.directionExtentMultiplier,
    }),
    accessibility: Object.freeze({
      weaponIdentitySurvivesStaticMotionPolicy: true as const,
      resultShapeDoesNotDependOnColor: true as const,
    }),
    governance: Object.freeze({
      consumesResolvedPresentationIdentityOnly: true as const,
      ownsRuleOrHitAuthority: false as const,
      infersOutcomeOrDirection: false as const,
      authoredCoreTextureRemainsRequired: true as const,
      generatedGeometryIsSupportingLayerOnly: true as const,
    }),
  });
}

export const ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  exactWeaponIdentityCount: 20 as const,
  actionContextCount: 2 as const,
  feedbackResultCount: 4 as const,
  impactResultHierarchyCount: 3 as const,
  attackEvadedImpactRank: 0 as const,
  shapeTimingValueHierarchyAppliedToConsumedFields: true as const,
  modeCount: 3 as const,
  stableStyleIdentityCount: 480 as const,
  particlePatternCount: 9 as const,
  addsVfxLayer: false as const,
  raisesParticleBudget: false as const,
  raisesOverdrawBudget: false as const,
  authoredCoreTextureRemainsRequired: true as const,
  ownsRuleOrHitAuthority: false as const,
  combatGrammarSourceContentHash: GRAMMAR_SOURCE.contentHash,
  combatGrammarIdentityExposed: true as const,
  coreVerbFamilyShapeBijectionCount: 6 as const,
  movementFallCombatGrammarIdentity: null,
  hardGate: false as const,
  validationStatus: 'not-run' as const,
});
