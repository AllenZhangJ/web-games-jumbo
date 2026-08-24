import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1,
  ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1,
  projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1,
  resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1,
  resolveArenaV2TwentyWeaponFeedbackVfxCandidateV2,
  type ArenaV2ModeHudFeedbackVisualCommandV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  composeArenaV2FormalVfxCameraEdgeSafeCandidateV1,
  composeArenaV2FormalVfxSameAnchorCandidateV1,
  requireArenaV2FormalPassthroughVfxSemanticCandidateV1,
  resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1,
  type ArenaV2FormalPassthroughVfxSemanticCandidateV1,
  type ArenaV2FormalThreeCharacterImpactCommandCandidateV1,
  type ArenaV2FormalThreeCameraImpactCommandCandidateV1,
  type ArenaV2FormalThreeCameraImpactKindCandidateV1,
  type ArenaV2TwentyWeaponFormalVfxStyleCandidateV1,
  type ArenaV2WeaponFeedbackParticlePatternCandidateV1,
} from '@number-strategy-jump/arena-product-presentation-three';
import {
  PlatformTextureLoader,
} from '@number-strategy-jump/arena-presentation-three';
import * as THREE from 'three';

export const ARENA_V2_FORMAL_THREE_VFX_PORT_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  LOADING: 'loading',
  READY: 'ready',
  DISPOSING: 'disposing',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type VfxPortState = typeof ARENA_V2_FORMAL_THREE_VFX_PORT_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_FORMAL_THREE_VFX_PORT_STATE_CANDIDATE_V1
];
type SyncFunction = (...args: readonly unknown[]) => unknown;
type FeedbackAnchorKind = 'body-impact' | 'held-weapon-tip';

function throwSettledBatchFailures(
  results: readonly PromiseSettledResult<unknown>[],
  message: string,
): void {
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(({ reason }) => reason);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, message);
}

function deferred<T>(): Readonly<{
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return Object.freeze({ promise, resolve, reject });
}

interface ActiveEffect {
  readonly command: ArenaV2ModeHudFeedbackVisualCommandV1;
  readonly fingerprint: string;
  readonly styleId: string | null;
  readonly root: THREE.Group;
  readonly materials: readonly Readonly<{
    readonly material: THREE.Material;
    readonly peakOpacity: number;
  }>[];
  readonly geometries: readonly THREE.BufferGeometry[];
  readonly directionLayer: THREE.Object3D | null;
  readonly worldDirection: Readonly<{ readonly x: number; readonly z: number }> | null;
  readonly impactScaleMultiplier: 0.9 | 1 | 1.12;
  readonly compositionRank: 0 | 1 | 2 | 3;
  readonly feedbackAnchorKind: FeedbackAnchorKind;
  readonly timing: EffectTimingProfile;
  readonly cleanup: {
    rootRemoved: boolean;
    readonly disposedGeometryIndices: Set<number>;
    readonly disposedMaterialIndices: Set<number>;
  };
}

interface EffectTimingProfile {
  readonly reactionTicks: number;
  readonly holdUntilTick: number;
  readonly lifetimeTicks: number;
  readonly startScale: number;
  readonly peakScale: number;
  readonly followThroughScale: number;
}

interface DirectionRenderState {
  readonly worldDirection: Readonly<{ readonly x: number; readonly z: number }> | null;
  readonly horizontalImpulseMagnitude: number | null;
  readonly impactStrength: 'light' | 'medium' | 'heavy' | null;
  readonly effectScaleMultiplier: 0.9 | 1 | 1.12;
  readonly directionArrowScaleMultiplier: 0.9 | 1.12 | 1.28;
  readonly cameraImpactScaleMultiplier: 0.82 | 1 | 1.18;
  readonly characterImpactScaleMultiplier: 0.85 | 1 | 1.12;
}

interface CameraImpactPort {
  readonly getEpochId: SyncFunction;
  readonly present: SyncFunction;
  readonly remove: SyncFunction;
  readonly clear: SyncFunction;
}

interface CharacterImpactPort {
  readonly getEpochId: SyncFunction;
  readonly present: SyncFunction;
  readonly remove: SyncFunction;
  readonly clear: SyncFunction;
}

const OPTION_KEYS = new Set([
  'scene',
  'camera',
  'baseUrl',
  'createImage',
  'allowUnapprovedCandidateTextures',
  'cameraImpact',
  'characterImpact',
]);
const PRODUCTION_APPROVED_VFX_TEXTURE_ASSET_IDS = Object.freeze([
  ...ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1
    .productionApprovedTextureAssetIds,
]);
const PRODUCTION_APPROVED_VFX_TEXTURE_ASSET_ID_SET = new Set(
  PRODUCTION_APPROVED_VFX_TEXTURE_ASSET_IDS,
);
const COMMAND_KEYS = new Set([
  'sourceEventId',
  'cueId',
  'anchorParticipantId',
  'attackerParticipantId',
  'targetParticipantId',
  'anchorWorldPosition',
  'title',
  'explanation',
  'perspective',
  'emphasis',
  'motionPolicy',
  'qualityTier',
  'timingLanguage',
  'valueContrastPolicy',
  'maximumLayers',
  'maximumParticles',
  'maximumAverageOverdraw',
  'distortionAllowed',
  'explicitOffSwitch',
  'tick',
  'sequence',
]);
const SYNC_KEYS = new Set([
  'currentTick',
  'localParticipantId',
  'resolveParticipantPosition',
  'resolveParticipantFeedbackAnchor',
]);
const STANDARD_EFFECT_LIFETIME_TICKS = 42;
const MAXIMUM_ACTIVE_EFFECTS = 3;
const FORMAL_TEXTURE_CUE_IDS = new Set<string>(
  ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.map(({ cueId }) => cueId),
);
const SPECIALIZED_CUE_PREFIX = 'arena.cue.vfx.weapon-feedback.';

function baseUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Arena V2 formal Three VFX baseUrl必须是非空字符串。');
  }
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new RangeError('Arena V2 formal Three VFX baseUrl只允许HTTP(S)。');
  }
  return parsed.href;
}

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function safeTick(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function nullableId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function visualCommand(value: unknown): ArenaV2ModeHudFeedbackVisualCommandV1 {
  const source = cloneFrozenData(value, 'Arena V2 formal Three VFX command');
  assertKnownKeys(source, COMMAND_KEYS, 'Arena V2 formal Three VFX command');
  for (const key of COMMAND_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 formal Three VFX command缺少${key}。`);
    }
  }
  const maximumLayers = source.maximumLayers;
  const maximumParticles = source.maximumParticles;
  const perspective = source.perspective;
  if (perspective !== 'local-involved'
    && perspective !== 'global'
    && perspective !== 'remote-only') {
    throw new RangeError('Arena V2 formal Three VFX command.perspective无效。');
  }
  if (
    (source.emphasis !== 'normal' && source.emphasis !== 'strong' && source.emphasis !== 'warning')
    || (source.motionPolicy !== 'standard' && source.motionPolicy !== 'static')
    || (source.qualityTier !== 'low' && source.qualityTier !== 'medium' && source.qualityTier !== 'high')
    || (source.timingLanguage !== 'reaction-action-follow-through'
      && source.timingLanguage !== 'static-result-only')
    || source.valueContrastPolicy !== 'bright-core-dark-edge'
    || (maximumLayers !== 1 && maximumLayers !== 2 && maximumLayers !== 3)
    || (maximumParticles !== 0
      && maximumParticles !== 24
      && maximumParticles !== 48
      && maximumParticles !== 96)
    || source.maximumAverageOverdraw !== 2
    || source.distortionAllowed !== false
    || source.explicitOffSwitch !== true
  ) throw new RangeError('Arena V2 formal Three VFX预算合同无效。');
  if (
    (source.motionPolicy === 'static')
    !== (source.timingLanguage === 'static-result-only' && maximumParticles === 0)
  ) throw new RangeError('Arena V2 formal Three VFX低动效合同不一致。');
  return Object.freeze({
    sourceEventId: assertNonEmptyString(
      source.sourceEventId,
      'Arena V2 formal Three VFX command.sourceEventId',
    ),
    cueId: assertNonEmptyString(source.cueId, 'Arena V2 formal Three VFX command.cueId'),
    anchorParticipantId: nullableId(
      source.anchorParticipantId,
      'Arena V2 formal Three VFX command.anchorParticipantId',
    ),
    attackerParticipantId: nullableId(
      source.attackerParticipantId,
      'Arena V2 formal Three VFX command.attackerParticipantId',
    ),
    targetParticipantId: nullableId(
      source.targetParticipantId,
      'Arena V2 formal Three VFX command.targetParticipantId',
    ),
    anchorWorldPosition: source.anchorWorldPosition === null
      ? null
      : position(
        source.anchorWorldPosition,
        'Arena V2 formal Three VFX command.anchorWorldPosition',
      ),
    title: assertNonEmptyString(source.title, 'Arena V2 formal Three VFX command.title'),
    explanation: assertNonEmptyString(
      source.explanation,
      'Arena V2 formal Three VFX command.explanation',
    ),
    perspective,
    emphasis: source.emphasis,
    motionPolicy: source.motionPolicy,
    qualityTier: source.qualityTier,
    timingLanguage: source.timingLanguage,
    valueContrastPolicy: 'bright-core-dark-edge' as const,
    maximumLayers,
    maximumParticles,
    maximumAverageOverdraw: 2 as const,
    distortionAllowed: false as const,
    explicitOffSwitch: true as const,
    tick: safeTick(source.tick, 'Arena V2 formal Three VFX command.tick'),
    sequence: safeTick(source.sequence, 'Arena V2 formal Three VFX command.sequence'),
  } as ArenaV2ModeHudFeedbackVisualCommandV1);
}

function commandFingerprint(
  value: ArenaV2ModeHudFeedbackVisualCommandV1,
  direction: DirectionRenderState | null,
  feedbackAnchorKind: FeedbackAnchorKind,
  style: ArenaV2TwentyWeaponFormalVfxStyleCandidateV1 | null,
  passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null,
): string {
  return JSON.stringify({
    command: value,
    direction,
    feedbackAnchorKind,
    styleId: style?.styleId ?? null,
    passthroughSemanticIdentity: passthroughSemantic?.semanticIdentity ?? null,
  });
}

function feedbackAnchorKind(
  feedbackKind: unknown,
  passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null,
): FeedbackAnchorKind {
  if (passthroughSemantic !== null) return passthroughSemantic.feedbackAnchorKind;
  return feedbackKind === 'attack-evaded' ? 'held-weapon-tip' : 'body-impact';
}

function effectTiming(
  style: ArenaV2TwentyWeaponFormalVfxStyleCandidateV1 | null,
  passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null,
): EffectTimingProfile {
  const feedbackKind = style?.feedbackKind ?? null;
  const timingKind = passthroughSemantic?.timingKind ?? null;
  if (feedbackKind === 'hit-confirm' || timingKind === 'hit-confirm') {
    return Object.freeze({
      reactionTicks: 3, holdUntilTick: 7, lifetimeTicks: 18,
      startScale: 0.56, peakScale: 1.06, followThroughScale: 1.18,
    });
  }
  if (feedbackKind === 'hit-surface-transfer' || timingKind === 'surface-transfer') {
    return Object.freeze({
      reactionTicks: 4, holdUntilTick: 11, lifetimeTicks: 28,
      startScale: 0.52, peakScale: 1.09, followThroughScale: 1.28,
    });
  }
  if (feedbackKind === 'hit-ring-out' || timingKind === 'ring-out') {
    return Object.freeze({
      reactionTicks: 5, holdUntilTick: 16, lifetimeTicks: 42,
      startScale: 0.46, peakScale: 1.12, followThroughScale: 1.42,
    });
  }
  if (feedbackKind === 'attack-evaded' || timingKind === 'evaded') {
    return Object.freeze({
      reactionTicks: 3, holdUntilTick: 9, lifetimeTicks: 24,
      startScale: 0.62, peakScale: 1.04, followThroughScale: 1.2,
    });
  }
  return Object.freeze({
    reactionTicks: 5, holdUntilTick: 24, lifetimeTicks: STANDARD_EFFECT_LIFETIME_TICKS,
    startScale: 0.48, peakScale: 1.08, followThroughScale: 1.42,
  });
}

function effectCompositionRank(
  style: ArenaV2TwentyWeaponFormalVfxStyleCandidateV1 | null,
  passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null,
): 0 | 1 | 2 | 3 {
  if (style !== null) return style.resultHierarchy.rank;
  const shapeKind = passthroughSemantic?.shapeKind ?? null;
  if (shapeKind === 'ring-out') return 3;
  if (shapeKind === 'surface-transfer') return 2;
  if (shapeKind === 'impact-confirm') return 1;
  return 0;
}

function hashText(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function unitSequence(seedValue: number): () => number {
  let seed = seedValue || 0x9e_37_79_b9;
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0x1_00_00_00_00;
  };
}

function palette(
  command: ArenaV2ModeHudFeedbackVisualCommandV1,
  style: ArenaV2TwentyWeaponFormalVfxStyleCandidateV1 | null,
): Readonly<{
  core: number;
  edge: number;
}> {
  if (command.emphasis === 'warning') return Object.freeze({ core: 0xff_e7_75, edge: 0xe8_5d_4a });
  if (command.emphasis === 'strong') {
    return Object.freeze({ core: 0xff_f4_c2, edge: style?.palette.edge ?? 0x16_a6_a1 });
  }
  if (style !== null) return style.palette;
  return Object.freeze({ core: 0xf6_fb_ff, edge: 0x58_b9_d5 });
}

function material(
  color: number,
  opacity: number,
  blendRole: 'core' | 'edge',
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    blending: blendRole === 'core' ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function effectShape(
  style: ArenaV2TwentyWeaponFormalVfxStyleCandidateV1 | null,
  passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null,
): Readonly<{
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  arc: number;
  rotation: number;
  secondaryRotation: number;
  thetaSegments: number;
  scaleX: number;
  scaleY: number;
}> {
  if (style !== null) return Object.freeze({
    innerRadius: style.shape.innerRadius,
    outerRadius: style.shape.outerRadius,
    startAngle: style.shape.startAngle,
    arc: style.shape.arc,
    rotation: style.shape.rotation,
    secondaryRotation: style.shape.secondaryRotation,
    thetaSegments: style.shape.thetaSegments,
    scaleX: style.shape.scaleX,
    scaleY: style.shape.scaleY,
  });
  if (passthroughSemantic === null) {
    throw new RangeError('Arena V2 formal Three VFX缺少精确透传Cue语义。');
  }
  if (passthroughSemantic.shapeKind === 'ring-out') {
    return Object.freeze({
      innerRadius: 0.46,
      outerRadius: 0.72,
      startAngle: Math.PI * 0.18,
      arc: Math.PI * 1.42,
      rotation: -Math.PI * 0.18,
      secondaryRotation: 0,
      thetaSegments: 32,
      scaleX: 1,
      scaleY: 1,
    });
  }
  if (passthroughSemantic.shapeKind === 'surface-transfer') {
    return Object.freeze({
      innerRadius: 0.5,
      outerRadius: 0.63,
      startAngle: 0,
      arc: Math.PI * 1.78,
      rotation: Math.PI * 0.22,
      secondaryRotation: 0,
      thetaSegments: 32,
      scaleX: 1,
      scaleY: 1,
    });
  }
  if (passthroughSemantic.shapeKind === 'evaded-warning') {
    return Object.freeze({
      innerRadius: 0.58,
      outerRadius: 0.66,
      startAngle: Math.PI * 0.12,
      arc: Math.PI * 1.24,
      rotation: Math.PI * 0.38,
      secondaryRotation: 0,
      thetaSegments: 32,
      scaleX: 1,
      scaleY: 1,
    });
  }
  if (passthroughSemantic.shapeKind === 'movement-fall-warning') {
    return Object.freeze({
      innerRadius: 0.3,
      outerRadius: 0.52,
      startAngle: Math.PI * 1.15,
      arc: Math.PI * 0.72,
      rotation: 0,
      secondaryRotation: 0,
      thetaSegments: 32,
      scaleX: 1,
      scaleY: 1,
    });
  }
  return Object.freeze({
    innerRadius: 0.42,
    outerRadius: 0.62,
    startAngle: 0,
    arc: Math.PI * 2,
    rotation: 0,
    secondaryRotation: 0,
    thetaSegments: 32,
    scaleX: 1,
    scaleY: 1,
  });
}

function writeParticlePosition(
  pattern: ArenaV2WeaponFeedbackParticlePatternCandidateV1,
  random: () => number,
  index: number,
  positions: Float32Array,
  offset: number,
  spreadX: number,
  spreadY: number,
): void {
  let x = 0;
  let y = 0;
  if (pattern === 'forward-fan') {
    const angle = (random() - 0.5) * Math.PI * 0.72;
    const radius = 0.62 + random() * 0.92;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;
  } else if (pattern === 'tether-line') {
    const progress = random();
    x = -0.78 + progress * 1.72;
    y = Math.sin(progress * Math.PI) * 0.22 + (random() - 0.5) * 0.14;
  } else if (pattern === 'lane-line') {
    x = 0.18 + random() * 1.48;
    y = ((index % 3) - 1) * 0.16 + (random() - 0.5) * 0.06;
  } else if (pattern === 'rebound-diamond') {
    const corner = Math.floor(random() * 4);
    const angle = Math.PI * 0.25 + corner * Math.PI * 0.5;
    const radius = 0.68 + random() * 0.56;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;
  } else if (pattern === 'rear-sweep') {
    const angle = Math.PI * (0.62 + random() * 0.82);
    const radius = 0.68 + random() * 0.82;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;
  } else if (pattern === 'paired-fan') {
    const side = index % 2 === 0 ? -1 : 1;
    const angle = side * (0.14 + random() * 0.42);
    const radius = 0.6 + random() * 0.9;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;
  } else if (pattern === 'three-prong') {
    const prong = (index % 3) - 1;
    const angle = prong * 0.24;
    const radius = 0.55 + random() * 1.02;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius + (random() - 0.5) * 0.08;
  } else if (pattern === 'downward-burst') {
    const angle = -Math.PI * 0.5 + (random() - 0.5) * 0.72;
    const radius = 0.58 + random() * 0.98;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;
  } else {
    const angle = random() * Math.PI * 2;
    const radius = 0.7 + random() * 0.85;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;
  }
  positions[offset] = x * spreadX;
  positions[offset + 1] = y * spreadY;
  positions[offset + 2] = (random() - 0.5) * 0.24;
}

function createEffect(
  command: ArenaV2ModeHudFeedbackVisualCommandV1,
  texture: THREE.Texture | null,
  retainCleanupDebt: (effect: ActiveEffect) => void,
  direction: DirectionRenderState | null = null,
  anchorKind: FeedbackAnchorKind = 'body-impact',
  style: ArenaV2TwentyWeaponFormalVfxStyleCandidateV1 | null = null,
  passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null = null,
): ActiveEffect {
  const root = new THREE.Group();
  root.name = `ArenaV2FormalVfx:${command.sourceEventId}`;
  root.renderOrder = 40;
  const colors = palette(command, style);
  const shape = effectShape(style, passthroughSemantic);
  const timing = effectTiming(style, passthroughSemantic);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: Array<Readonly<{
    readonly material: THREE.Material;
    readonly peakOpacity: number;
  }>> = [];
  const rememberMaterial = (value: THREE.Material, peakOpacity: number): void => {
    materials.push(Object.freeze({ material: value, peakOpacity }));
  };
  let directionLayer: THREE.Object3D | null = null;
  const draft: ActiveEffect = {
    command,
    fingerprint: commandFingerprint(
      command,
      direction,
      anchorKind,
      style,
      passthroughSemantic,
    ),
    styleId: style?.styleId ?? null,
    root,
    materials,
    geometries,
    directionLayer,
    worldDirection: direction?.worldDirection ?? null,
    impactScaleMultiplier: direction?.effectScaleMultiplier ?? 1,
    compositionRank: effectCompositionRank(style, passthroughSemantic),
    feedbackAnchorKind: anchorKind,
    timing,
    cleanup: {
      rootRemoved: false,
      disposedGeometryIndices: new Set<number>(),
      disposedMaterialIndices: new Set<number>(),
    },
  };
  try {
    if (texture !== null) {
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        color: colors.core,
        transparent: true,
        opacity: 0.96,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        rotation: style?.shape.rotation ?? 0,
      });
      rememberMaterial(spriteMaterial, 0.96);
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.name = `ArenaV2FormalVfxTexture:${command.cueId}`;
      sprite.scale.set(
        1.7 * (style?.shape.spriteScaleX ?? 1),
        1.7 * (style?.shape.spriteScaleY ?? 1),
        1,
      );
      root.add(sprite);
    }
    const addRing = (
      radiusScale: number,
      color: number,
      opacity: number,
      blendRole: 'core' | 'edge',
      rotationOffset = 0,
    ): void => {
      const geometry = new THREE.RingGeometry(
        shape.innerRadius * radiusScale,
        shape.outerRadius * radiusScale,
        shape.thetaSegments,
        1,
        shape.startAngle,
        shape.arc,
      );
      geometries.push(geometry);
      const ringMaterial = material(color, opacity, blendRole);
      rememberMaterial(ringMaterial, opacity);
      const mesh = new THREE.Mesh(geometry, ringMaterial);
      mesh.rotation.z = shape.rotation + rotationOffset;
      mesh.scale.set(shape.scaleX, shape.scaleY, 1);
      root.add(mesh);
    };
    addRing(1, colors.core, 0.9, 'core');
    if (command.maximumLayers >= 2) {
      addRing(1.24, colors.edge, 0.66, 'edge', shape.secondaryRotation);
    }
    if (command.maximumLayers >= 3 && command.maximumParticles > 0) {
      const random = unitSequence(hashText(command.sourceEventId));
      const positions = new Float32Array(command.maximumParticles * 3);
      const spreadX = style?.particles.spreadX ?? 1;
      const spreadY = style?.particles.spreadY ?? 1;
      for (let index = 0; index < command.maximumParticles; index += 1) {
        writeParticlePosition(
          style?.particles.pattern ?? 'radial-burst',
          random,
          index,
          positions,
          index * 3,
          spreadX,
          spreadY,
        );
      }
      const geometry = new THREE.BufferGeometry();
      geometries.push(geometry);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pointMaterial = new THREE.PointsMaterial({
        color: colors.core,
        size: style?.particles.size ?? 0.08,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.78,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      rememberMaterial(pointMaterial, 0.78);
      root.add(new THREE.Points(geometry, pointMaterial));
    }
    if (direction?.worldDirection !== null && direction?.worldDirection !== undefined) {
      const directionLength = style?.direction.lengthScale ?? 1;
      const directionThickness = style?.direction.thicknessScale ?? 1;
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(-0.54 * directionLength, -0.09 * directionThickness);
      arrowShape.lineTo(0.16 * directionLength, -0.09 * directionThickness);
      arrowShape.lineTo(0.16 * directionLength, -0.24 * directionThickness);
      arrowShape.lineTo(0.62 * directionLength, 0);
      arrowShape.lineTo(0.16 * directionLength, 0.24 * directionThickness);
      arrowShape.lineTo(0.16 * directionLength, 0.09 * directionThickness);
      arrowShape.lineTo(-0.54 * directionLength, 0.09 * directionThickness);
      arrowShape.closePath();
      const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
      geometries.push(arrowGeometry);
      const arrowOpacity = command.motionPolicy === 'static' ? 0.9 : 0.78;
      const arrowMaterial = material(colors.edge, arrowOpacity, 'edge');
      rememberMaterial(arrowMaterial, arrowOpacity);
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrow.name = `ArenaV2FormalVfxAuthorityDirection:${command.sourceEventId}`;
      arrow.scale.x = direction.directionArrowScaleMultiplier;
      arrow.position.z = 0.02;
      root.add(arrow);
      directionLayer = arrow;
    }
    return Object.freeze({
      ...draft,
      materials: Object.freeze(materials),
      geometries: Object.freeze(geometries),
      directionLayer,
    });
  } catch (error) {
    const cleanupErrors = disposeEffect(draft);
    if (!effectCleanupComplete(draft)) retainCleanupDebt(draft);
    throw cleanupErrors.length === 0
      ? error
      : new AggregateError(
        [error, ...cleanupErrors],
        'Arena V2 formal Three VFX效果构造失败且回收不完整。',
      );
  }
}

function disposeEffect(effect: ActiveEffect): readonly unknown[] {
  const errors: unknown[] = [];
  if (!effect.cleanup.rootRemoved) {
    try {
      rejectThenable(
        effect.root.removeFromParent(),
        'Arena V2 formal Three VFX effect root removeFromParent',
      );
      effect.cleanup.rootRemoved = true;
    } catch (error) {
      errors.push(error);
      return Object.freeze(errors);
    }
  }
  for (const [index, geometry] of effect.geometries.entries()) {
    if (effect.cleanup.disposedGeometryIndices.has(index)) continue;
    try {
      rejectThenable(
        geometry.dispose(),
        'Arena V2 formal Three VFX effect geometry dispose',
      );
      effect.cleanup.disposedGeometryIndices.add(index);
    } catch (error) {
      errors.push(error);
      return Object.freeze(errors);
    }
  }
  for (const [index, item] of effect.materials.entries()) {
    if (effect.cleanup.disposedMaterialIndices.has(index)) continue;
    try {
      rejectThenable(
        item.material.dispose(),
        'Arena V2 formal Three VFX effect material dispose',
      );
      effect.cleanup.disposedMaterialIndices.add(index);
    } catch (error) {
      errors.push(error);
      return Object.freeze(errors);
    }
  }
  return Object.freeze(errors);
}

function effectCleanupComplete(effect: ActiveEffect): boolean {
  return effect.cleanup.rootRemoved
    && effect.cleanup.disposedGeometryIndices.size === effect.geometries.length
    && effect.cleanup.disposedMaterialIndices.size === effect.materials.length;
}

function opacityForAge(
  command: ArenaV2ModeHudFeedbackVisualCommandV1,
  timing: EffectTimingProfile,
  ageTicks: number,
): number {
  if (command.motionPolicy === 'static') return 0.82;
  if (ageTicks <= timing.reactionTicks) {
    return 0.36 + 0.64 * (ageTicks / timing.reactionTicks);
  }
  if (ageTicks <= timing.holdUntilTick) return 1;
  return Math.max(
    0,
    1 - (ageTicks - timing.holdUntilTick)
      / (timing.lifetimeTicks - timing.holdUntilTick),
  );
}

function scaleForAge(
  command: ArenaV2ModeHudFeedbackVisualCommandV1,
  timing: EffectTimingProfile,
  ageTicks: number,
): number {
  if (command.motionPolicy === 'static') return 1;
  if (ageTicks <= timing.reactionTicks) {
    const progress = ageTicks / timing.reactionTicks;
    return timing.startScale + (timing.peakScale - timing.startScale) * progress;
  }
  const followThroughProgress = Math.min(
    1,
    (ageTicks - timing.reactionTicks)
      / (timing.lifetimeTicks - timing.reactionTicks),
  );
  return timing.peakScale
    + (timing.followThroughScale - timing.peakScale) * followThroughProgress;
}

function position(value: unknown, name: string): Readonly<{ x: number; y: number; z: number }> {
  const source = assertPlainRecord(value, name);
  const coordinates = ['x', 'y', 'z'].map((axis) => dataField(source, axis, name));
  if (coordinates.some((coordinate) => (
    typeof coordinate !== 'number' || !Number.isFinite(coordinate)
  ))) throw new TypeError(`${name}必须是有限三维位置。`);
  return Object.freeze({
    x: coordinates[0] as number,
    y: coordinates[1] as number,
    z: coordinates[2] as number,
  });
}

function syncFunction(value: unknown, name: string): SyncFunction {
  if (typeof value !== 'function') throw new TypeError(`${name}必须是函数。`);
  return value as SyncFunction;
}

function boundDataMethod(target: unknown, key: string, name: string): SyncFunction {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是同步数据方法。`);
      }
      const method = descriptor.value as SyncFunction;
      return (...args: readonly unknown[]) => Reflect.apply(method, target, args);
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  throw new TypeError(`${name}.${key}不存在。`);
}

function cameraImpactPort(value: unknown): CameraImpactPort {
  return Object.freeze({
    getEpochId: boundDataMethod(
      value,
      'getCameraImpactEpochId',
      'Arena V2 formal Three camera impact port',
    ),
    present: boundDataMethod(
      value,
      'presentCameraImpact',
      'Arena V2 formal Three camera impact port',
    ),
    remove: boundDataMethod(
      value,
      'removeCameraImpact',
      'Arena V2 formal Three camera impact port',
    ),
    clear: boundDataMethod(
      value,
      'clearCameraImpacts',
      'Arena V2 formal Three camera impact port',
    ),
  });
}

function characterImpactPort(value: unknown): CharacterImpactPort {
  return Object.freeze({
    getEpochId: boundDataMethod(
      value,
      'getCharacterImpactEpochId',
      'Arena V2 formal Three character impact port',
    ),
    present: boundDataMethod(
      value,
      'presentCharacterImpact',
      'Arena V2 formal Three character impact port',
    ),
    remove: boundDataMethod(
      value,
      'removeCharacterImpact',
      'Arena V2 formal Three character impact port',
    ),
    clear: boundDataMethod(
      value,
      'clearCharacterImpacts',
      'Arena V2 formal Three character impact port',
    ),
  });
}

function cameraImpactKind(
  feedbackKind: unknown,
  passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null,
): ArenaV2FormalThreeCameraImpactKindCandidateV1 | null {
  if (feedbackKind === 'hit-confirm') return 'hit-confirm';
  if (feedbackKind === 'hit-surface-transfer') {
    return 'surface-transfer';
  }
  if (feedbackKind === 'hit-ring-out') return 'ring-out';
  return passthroughSemantic?.cameraImpactKind ?? null;
}

interface FormalThreeVfxConstructionResourcesCandidateV1 {
  root: THREE.Group | null;
}

function formalThreeVfxConstructionCleanupCompleteCandidateV1(
  resources: FormalThreeVfxConstructionResourcesCandidateV1,
): boolean {
  return resources.root === null;
}

function cleanupFormalThreeVfxConstructionResourcesCandidateV1(
  resources: FormalThreeVfxConstructionResourcesCandidateV1,
): void {
  if (resources.root === null) return;
  rejectThenable(
    resources.root.removeFromParent(),
    'Arena V2 formal Three VFX construction root removeFromParent',
  );
  resources.root = null;
}

export class ArenaV2FormalThreeVfxConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: FormalThreeVfxConstructionResourcesCandidateV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: FormalThreeVfxConstructionResourcesCandidateV1,
  ) {
    super(
      [originalError, cleanupError],
      'Arena V2 formal Three VFX构造失败且Root清理未收敛。',
    );
    this.name = 'ArenaV2FormalThreeVfxConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return formalThreeVfxConstructionCleanupCompleteCandidateV1(this.#resources);
  }

  retryCleanup(): void {
    cleanupFormalThreeVfxConstructionResourcesCandidateV1(this.#resources);
  }
}

/**
 * Tick-driven Three VFX executor for the formal candidate surface. It consumes
 * only presentation commands and visual positions supplied by the character
 * runtime; it never re-runs hit, fall, pickup or result rules. Five core weapon
 * cues require preloaded authored texture candidates; bounded rings and points
 * remain supporting presentation layers. Unapproved textures do not close the
 * formal VFX asset gate.
 */
export class ArenaV2FormalThreeVfxPortCandidateV1 {
  readonly #scene: THREE.Scene;
  readonly #camera: THREE.Camera;
  readonly #baseUrl: string;
  readonly #allowUnapprovedCandidateTextures: boolean;
  readonly #cameraImpact: CameraImpactPort;
  readonly #characterImpact: CharacterImpactPort;
  readonly #textureLoader: PlatformTextureLoader;
  readonly #root = new THREE.Group();
  readonly #effects = new Map<string, ActiveEffect>();
  readonly #effectCleanupDebts = new Set<ActiveEffect>();
  readonly #textures = new Map<string, THREE.Texture>();
  readonly #pendingTextures = new Set<THREE.Texture>();
  readonly #inverseCameraQuaternion = new THREE.Quaternion();
  readonly #projectedDirection = new THREE.Vector3();
  readonly #compositionOffset = new THREE.Vector3();
  readonly #projectedCompositionAnchor = new THREE.Vector3();
  #state: VfxPortState = 'created';
  #loadOperation: Promise<this> | null = null;
  #loadPending = false;
  #disposeRequested = false;
  #lastError: unknown = null;
  #lastTick: number | null = null;
  #terminalCameraImpactCleared = false;
  #terminalCharacterImpactCleared = false;
  #rootRemoved = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 formal Three VFX options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 formal Three VFX options');
    for (const key of OPTION_KEYS) dataField(source, key, 'Arena V2 formal Three VFX options');
    if (!(source.scene instanceof THREE.Scene)) {
      throw new TypeError('Arena V2 formal Three VFX需要Three Scene。');
    }
    if (!(source.camera instanceof THREE.Camera)) {
      throw new TypeError('Arena V2 formal Three VFX需要Three Camera。');
    }
    const allowUnapprovedCandidateTextures = dataField(
      source,
      'allowUnapprovedCandidateTextures',
      'Arena V2 formal Three VFX options',
    );
    if (typeof allowUnapprovedCandidateTextures !== 'boolean') {
      throw new TypeError('Arena V2 formal Three VFX allowUnapprovedCandidateTextures必须是boolean。');
    }
    this.#scene = source.scene;
    this.#camera = source.camera;
    this.#baseUrl = baseUrl(dataField(source, 'baseUrl', 'Arena V2 formal Three VFX options'));
    const createImage = dataField(
      source,
      'createImage',
      'Arena V2 formal Three VFX options',
    );
    if (typeof createImage !== 'function') {
      throw new TypeError('Arena V2 formal Three VFX createImage必须是函数。');
    }
    this.#allowUnapprovedCandidateTextures = allowUnapprovedCandidateTextures;
    this.#cameraImpact = cameraImpactPort(
      dataField(source, 'cameraImpact', 'Arena V2 formal Three VFX options'),
    );
    this.#characterImpact = characterImpactPort(
      dataField(source, 'characterImpact', 'Arena V2 formal Three VFX options'),
    );
    this.#root.name = 'ArenaV2FormalVfxRoot';
    let textureLoader: PlatformTextureLoader;
    try {
      rejectThenable(
        this.#scene.add(this.#root),
        'Arena V2 formal Three VFX construction scene.add(root)',
      );
      textureLoader = new PlatformTextureLoader({
        createImage,
        baseUrl: this.#baseUrl,
      });
    } catch (error) {
      const resources: FormalThreeVfxConstructionResourcesCandidateV1 = {
        root: this.#root,
      };
      try {
        cleanupFormalThreeVfxConstructionResourcesCandidateV1(resources);
      } catch (cleanupError) {
        throw new ArenaV2FormalThreeVfxConstructionCleanupFailureCandidateV1(
          error,
          cleanupError,
          resources,
        );
      }
      throw error;
    }
    this.#textureLoader = textureLoader;
  }

  get state(): VfxPortState {
    return this.#runSynchronousOperation('state-read', () => this.#state);
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`${operation}不可重入${this.#operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertReady(operation: string): void {
    this.#assertNoOperation(operation);
    if (this.#state !== 'ready') throw new Error(`${operation}拒绝状态${this.#state}。`);
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    const reentrySequence = this.#reentrySequence;
    try {
      let result: T;
      try {
        result = run();
      } catch (error) {
        if (this.#reentrySequence !== reentrySequence) {
          return this.#failOperationReentry(operation, error);
        }
        throw error;
      }
      if (this.#reentrySequence !== reentrySequence) {
        return this.#failOperationReentry(operation);
      }
      return result;
    } finally {
      if (this.#operation === operation) this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 formal Three VFX提交缺少操作所有权。');
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #failOperationReentry(operation: string, operationFailure?: unknown): never {
    const reentryError = this.#reentryError ?? new Error(
      `Arena V2 formal Three VFX ${operation}检测到被Texture、Three或Impact吞掉的同步重入。`,
    );
    return this.#commitFailure(
      operationFailure === undefined || operationFailure === reentryError
        ? reentryError
        : new AggregateError(
          [operationFailure, reentryError],
          `Arena V2 formal Three VFX ${operation}失败且检测到同步重入。`,
        ),
    );
  }

  #clearEffects(): readonly unknown[] {
    const errors: unknown[] = [];
    for (const effect of this.#effectCleanupDebts) {
      const reentrySequence = this.#reentrySequence;
      const cleanupErrors = disposeEffect(effect);
      errors.push(...cleanupErrors);
      if (this.#reentrySequence !== reentrySequence) {
        errors.push(this.#reentryError ?? new Error(
          'Arena V2 formal Three VFX效果债务清理期间发生同步重入。',
        ));
        return Object.freeze(errors);
      }
      if (cleanupErrors.length > 0) return Object.freeze(errors);
      if (effectCleanupComplete(effect)) this.#effectCleanupDebts.delete(effect);
    }
    for (const [sourceEventId, effect] of this.#effects) {
      const reentrySequence = this.#reentrySequence;
      const cleanupErrors = disposeEffect(effect);
      errors.push(...cleanupErrors);
      if (this.#reentrySequence !== reentrySequence) {
        errors.push(this.#reentryError ?? new Error(
          'Arena V2 formal Three VFX活动效果清理期间发生同步重入。',
        ));
        return Object.freeze(errors);
      }
      if (cleanupErrors.length > 0) return Object.freeze(errors);
      if (effectCleanupComplete(effect)) this.#effects.delete(sourceEventId);
    }
    this.#lastTick = null;
    return Object.freeze(errors);
  }

  #retainEffectCleanupDebt(effect: ActiveEffect): void {
    if (!effectCleanupComplete(effect)) this.#effectCleanupDebts.add(effect);
  }

  #clearTextures(): readonly unknown[] {
    const errors: unknown[] = [];
    for (const [cueId, texture] of this.#textures) {
      const reentrySequence = this.#reentrySequence;
      try {
        rejectThenable(texture.dispose(), `Arena V2 formal Three VFX纹理${cueId} dispose`);
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            `Arena V2 formal Three VFX纹理${cueId}清理期间发生同步重入。`,
          ));
          return Object.freeze(errors);
        }
        this.#textures.delete(cueId);
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    return Object.freeze(errors);
  }

  #clearPendingTextures(): readonly unknown[] {
    const errors: unknown[] = [];
    for (const texture of this.#pendingTextures) {
      const reentrySequence = this.#reentrySequence;
      try {
        rejectThenable(texture.dispose(), 'Arena V2 formal Three VFX待发布纹理 dispose');
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            'Arena V2 formal Three VFX待发布纹理清理期间发生同步重入。',
          ));
          return Object.freeze(errors);
        }
        this.#pendingTextures.delete(texture);
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    return Object.freeze(errors);
  }

  #destroyTextureLoader(): readonly unknown[] {
    if (this.#textureLoader.isCleanupComplete()) return Object.freeze([]);
    const reentrySequence = this.#reentrySequence;
    try {
      rejectThenable(
        this.#textureLoader.destroy(),
        'Arena V2 formal Three VFX PlatformTextureLoader.destroy()',
      );
      if (this.#reentrySequence !== reentrySequence) {
        return Object.freeze([this.#reentryError ?? new Error(
          'Arena V2 formal Three VFX纹理加载Owner清理期间发生同步重入。',
        )]);
      }
      if (!this.#textureLoader.isCleanupComplete()) {
        return Object.freeze([new Error(
          'Arena V2 formal Three VFX纹理加载Owner清理尚未收敛。',
        )]);
      }
      return Object.freeze([]);
    } catch (error) {
      return Object.freeze([error]);
    }
  }

  #terminalCleanup(): readonly unknown[] {
    const errors: unknown[] = [
      ...this.#clearEffects(),
    ];
    if (errors.length > 0 || this.#reentryError !== null) return Object.freeze(errors);
    errors.push(...this.#destroyTextureLoader());
    if (errors.length > 0 || this.#reentryError !== null) return Object.freeze(errors);
    errors.push(...this.#clearTextures());
    if (errors.length > 0 || this.#reentryError !== null) return Object.freeze(errors);
    errors.push(...this.#clearPendingTextures());
    if (errors.length > 0 || this.#reentryError !== null) return Object.freeze(errors);
    if (!this.#terminalCameraImpactCleared) {
      const reentrySequence = this.#reentrySequence;
      try {
        rejectThenable(
          this.#cameraImpact.clear(),
          'Arena V2 formal Three camera impact terminal clear',
        );
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            'Arena V2 formal Three camera impact终态清理期间发生同步重入。',
          ));
          return Object.freeze(errors);
        }
        this.#terminalCameraImpactCleared = true;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (!this.#terminalCharacterImpactCleared) {
      const reentrySequence = this.#reentrySequence;
      try {
        rejectThenable(
          this.#characterImpact.clear(),
          'Arena V2 formal Three character impact terminal clear',
        );
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            'Arena V2 formal Three character impact终态清理期间发生同步重入。',
          ));
          return Object.freeze(errors);
        }
        this.#terminalCharacterImpactCleared = true;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (!this.#rootRemoved) {
      const reentrySequence = this.#reentrySequence;
      try {
        rejectThenable(
          this.#root.removeFromParent(),
          'Arena V2 formal Three VFX root removeFromParent',
        );
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            'Arena V2 formal Three VFX根节点清理期间发生同步重入。',
          ));
          return Object.freeze(errors);
        }
        this.#rootRemoved = true;
      } catch (error) {
        errors.push(error);
      }
    }
    return Object.freeze(errors);
  }

  #terminalCleanupComplete(): boolean {
    return this.#effects.size === 0
      && this.#effectCleanupDebts.size === 0
      && this.#textures.size === 0
      && this.#pendingTextures.size === 0
      && this.#textureLoader.isCleanupComplete()
      && !this.#loadPending
      && this.#terminalCameraImpactCleared
      && this.#terminalCharacterImpactCleared
      && this.#rootRemoved;
  }

  #continueRequestedDisposal(): void {
    if (!this.#disposeRequested || this.#state === 'disposed') return;
    this.#runSynchronousOperation('Arena V2 formal Three VFX异步续接清理', () => {
      const errors = [...this.#terminalCleanup()];
      if (errors.length > 0) {
        this.#lastError = new AggregateError(
          errors,
          'Arena V2 formal Three VFX异步续接清理不完整。',
        );
        this.#state = 'failed';
        return;
      }
      this.#state = this.#terminalCleanupComplete() ? 'disposed' : 'disposing';
    });
  }

  #commitFailure(error: unknown): never {
    this.#lastError = error;
    const cleanupErrors = this.#terminalCleanup();
    this.#state = 'failed';
    throw cleanupErrors.length === 0
      ? error
      : new AggregateError(
        [error, ...cleanupErrors],
        'Arena V2 formal Three VFX失败且清理不完整。',
      );
  }

  #fail(error: unknown): never {
    if (this.#operation !== null) return this.#commitFailure(error);
    return this.#runSynchronousOperation(
      'Arena V2 formal Three VFX失败提交',
      () => this.#commitFailure(error),
    );
  }

  load(): Promise<this> {
    this.#assertNoOperation('Arena V2 formal Three VFX load');
    if (this.#state === 'loading' && this.#loadOperation !== null) {
      return this.#loadOperation;
    }
    if (this.#state === 'disposed') {
      return Promise.reject(new Error('Arena V2 formal Three VFX已销毁。'));
    }
    if (this.#state === 'failed') {
      const error = new Error('Arena V2 formal Three VFX已失败。');
      error.cause = this.#lastError;
      return Promise.reject(error);
    }
    if (this.#state === 'ready') return Promise.resolve(this);
    if (this.#loadOperation !== null) return this.#loadOperation;
    if (this.#state !== 'created') {
      return Promise.reject(new Error(`Arena V2 formal Three VFX不能在${this.#state}加载。`));
    }
    const records = ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.filter(
      ({ vfxAssetId }) => PRODUCTION_APPROVED_VFX_TEXTURE_ASSET_ID_SET.has(vfxAssetId)
        || this.#allowUnapprovedCandidateTextures,
    );
    if (records.length !== ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length) {
      const error = new RangeError(
        'Arena V2正式核心VFX纹理尚未全部批准；默认路径不会发起任何PNG加载。',
      );
      this.#lastError = error;
      this.#state = 'failed';
      this.#loadOperation = Promise.reject(error);
      return this.#loadOperation;
    }
    this.#state = 'loading';
    this.#loadPending = true;
    const loadOwner = deferred<this>();
    this.#loadOperation = loadOwner.promise;
    let loadingOperations: Promise<void>[] = [];
    try {
      this.#runSynchronousOperation(
        'Arena V2 formal Three VFX纹理加载启动',
        () => {
          for (const record of records) {
            if (this.#state !== 'loading') {
              throw new Error(`Arena V2 formal Three VFX ${record.cueId}启动时Owner已不可接收。`);
            }
            const textureOwner = deferred<THREE.Texture>();
            loadingOperations.push(textureOwner.promise.then((texture) => {
              this.#runSynchronousOperation(
                `Arena V2 formal Three VFX ${record.cueId} texture settlement`,
                () => {
                  this.#pendingTextures.add(texture);
                  if (this.#state !== 'loading') {
                    const lateError = new Error(
                      `Arena V2 formal Three VFX ${record.cueId}迟到加载被拒绝。`,
                    );
                    const cleanupErrors = this.#clearPendingTextures();
                    throw cleanupErrors.length === 0
                      ? lateError
                      : new AggregateError(
                        [lateError, ...cleanupErrors],
                        `Arena V2 formal Three VFX ${record.cueId}迟到纹理清理不完整。`,
                      );
                  }
                  texture.name = record.vfxAssetId;
                  texture.colorSpace = THREE.SRGBColorSpace;
                  texture.generateMipmaps = true;
                  texture.minFilter = THREE.LinearMipmapLinearFilter;
                  texture.magFilter = THREE.LinearFilter;
                  texture.wrapS = THREE.ClampToEdgeWrapping;
                  texture.wrapT = THREE.ClampToEdgeWrapping;
                  texture.needsUpdate = true;
                  this.#assertCurrentOperationCommit();
                  this.#textures.set(record.cueId, texture);
                  this.#pendingTextures.delete(texture);
                },
              );
            }));
            this.#textureLoader.load(
              record.runtimeSourceKey,
              (texture) => { textureOwner.resolve(texture); },
              undefined,
              (error) => { textureOwner.reject(error); },
            );
            this.#assertCurrentOperationCommit();
          }
        },
      );
    } catch (error) {
      let launchFailure = error;
      try {
        this.#runSynchronousOperation(
          'Arena V2 formal Three VFX启动失败取消纹理加载Owner',
          () => {
            const cancellationErrors = this.#destroyTextureLoader();
            if (cancellationErrors.length > 0) {
              throw new AggregateError(
                [error, ...cancellationErrors],
                'Arena V2 formal Three VFX启动失败且纹理加载Owner取消不完整。',
              );
            }
          },
        );
      } catch (cancellationFailure) {
        launchFailure = cancellationFailure;
      }
      const execution = Promise.allSettled(loadingOperations).then(() => {
        if (this.#state !== 'loading') throw launchFailure;
        return this.#fail(launchFailure);
      }).finally(() => {
        try {
          this.#runSynchronousOperation(
            'Arena V2 formal Three VFX启动失败终态水位',
            () => { this.#loadPending = false; },
          );
        } finally {
          this.#continueRequestedDisposal();
        }
      });
      void execution.then(loadOwner.resolve, loadOwner.reject);
      return this.#loadOperation;
    }
    const execution = Promise.allSettled(loadingOperations).then((results) => {
      return this.#runSynchronousOperation(
        'Arena V2 formal Three VFX纹理加载成功提交',
        () => {
          throwSettledBatchFailures(
            results,
            'Arena V2 formal Three VFX纹理加载批次存在多项失败。',
          );
          if (this.#state !== 'loading') {
            throw new Error('Arena V2 formal Three VFX加载完成时Owner已不可接收。');
          }
          if (this.#textures.size !== records.length) {
            throw new RangeError('Arena V2 formal Three VFX纹理预载数量不闭合。');
          }
          this.#state = 'ready';
          return this;
        },
      );
    }).catch((error: unknown) => {
      if (this.#state !== 'loading') throw error;
      return this.#fail(error);
    }).finally(() => {
      try {
        this.#runSynchronousOperation(
          'Arena V2 formal Three VFX纹理加载终态水位',
          () => { this.#loadPending = false; },
        );
      } finally {
        this.#continueRequestedDisposal();
      }
    });
    void execution.then(loadOwner.resolve, loadOwner.reject);
    return this.#loadOperation;
  }

  #presentEffect(
    command: ArenaV2ModeHudFeedbackVisualCommandV1,
    textureCueId: string,
    direction: DirectionRenderState | null,
    anchorKind: FeedbackAnchorKind,
    style: ArenaV2TwentyWeaponFormalVfxStyleCandidateV1 | null,
    passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null,
  ): void {
    const fingerprint = commandFingerprint(
      command,
      direction,
      anchorKind,
      style,
      passthroughSemantic,
    );
    const existing = this.#effects.get(command.sourceEventId);
    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint) {
        throw new RangeError(`Arena V2 formal Three VFX ${command.sourceEventId}语义漂移。`);
      }
      return;
    }
    if (this.#effects.size >= MAXIMUM_ACTIVE_EFFECTS) {
      throw new RangeError('Arena V2 formal Three VFX超出3项同屏预算。');
    }
    const texture = this.#textures.get(textureCueId) ?? null;
    if (FORMAL_TEXTURE_CUE_IDS.has(textureCueId) && texture === null) {
      throw new RangeError(`Arena V2 formal Three VFX缺少${textureCueId}纹理。`);
    }
    const effect = createEffect(
      command,
      texture,
      (candidate) => this.#retainEffectCleanupDebt(candidate),
      direction,
      anchorKind,
      style,
      passthroughSemantic,
    );
    try {
      this.#root.add(effect.root);
      this.#assertCurrentOperationCommit();
      this.#effects.set(command.sourceEventId, effect);
    } catch (error) {
      const cleanupErrors = [...disposeEffect(effect)];
      this.#retainEffectCleanupDebt(effect);
      throw cleanupErrors.length === 0
        ? error
        : new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal Three VFX效果挂载失败且回收不完整。',
        );
    }
  }

  #presentCameraImpact(
    command: ArenaV2ModeHudFeedbackVisualCommandV1,
    feedbackKind: unknown,
    direction: DirectionRenderState | null,
    passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null,
  ): void {
    const kind = cameraImpactKind(feedbackKind, passthroughSemantic);
    if (kind === null || command.perspective !== 'local-involved') return;
    const epochId = this.#cameraImpact.getEpochId();
    rejectThenable(epochId, 'Arena V2 formal Three camera impact epoch');
    this.#assertCurrentOperationCommit();
    const impactCommand: ArenaV2FormalThreeCameraImpactCommandCandidateV1 = Object.freeze({
      schemaVersion: 1 as const,
      epochId: assertNonEmptyString(epochId, 'Arena V2 formal Three camera impact epoch'),
      sourceEventId: command.sourceEventId,
      kind,
      tick: command.tick,
      motionPolicy: command.motionPolicy,
      worldDirection: direction?.worldDirection ?? null,
      impactScaleMultiplier: direction?.cameraImpactScaleMultiplier ?? 1,
    });
    rejectThenable(
      this.#cameraImpact.present(impactCommand),
      'Arena V2 formal Three camera impact present',
    );
    this.#assertCurrentOperationCommit();
  }

  #presentCharacterImpact(
    command: ArenaV2ModeHudFeedbackVisualCommandV1,
    feedbackKind: unknown,
    direction: DirectionRenderState | null,
    passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null,
  ): void {
    const kind = passthroughSemantic?.characterImpactKind
      ?? cameraImpactKind(feedbackKind, null);
    if (kind === null) return;
    this.#assertCharacterImpactIdentity(command, feedbackKind, passthroughSemantic);
    const targetParticipantId = command.targetParticipantId;
    if (targetParticipantId === null) {
      throw new RangeError(
        `Arena V2 formal Three character impact ${command.sourceEventId}受击者预检漂移。`,
      );
    }
    const epochId = this.#characterImpact.getEpochId();
    rejectThenable(epochId, 'Arena V2 formal Three character impact epoch');
    this.#assertCurrentOperationCommit();
    const impactCommand: ArenaV2FormalThreeCharacterImpactCommandCandidateV1 = Object.freeze({
      schemaVersion: 1 as const,
      epochId: assertNonEmptyString(epochId, 'Arena V2 formal Three character impact epoch'),
      sourceEventId: command.sourceEventId,
      participantId: targetParticipantId,
      contactParticipantId: command.attackerParticipantId,
      kind,
      tick: command.tick,
      motionPolicy: command.motionPolicy,
      worldDirection: direction?.worldDirection ?? null,
      impactScaleMultiplier: direction?.characterImpactScaleMultiplier ?? 1,
    });
    rejectThenable(
      this.#characterImpact.present(impactCommand),
      'Arena V2 formal Three character impact present',
    );
    this.#assertCurrentOperationCommit();
  }

  #assertCharacterImpactIdentity(
    command: ArenaV2ModeHudFeedbackVisualCommandV1,
    feedbackKind: unknown,
    passthroughSemantic: ArenaV2FormalPassthroughVfxSemanticCandidateV1 | null,
  ): void {
    const kind = passthroughSemantic?.characterImpactKind
      ?? cameraImpactKind(feedbackKind, null);
    if (kind !== null && command.targetParticipantId === null) {
      throw new RangeError(
        `Arena V2 formal Three character impact ${command.sourceEventId}缺少权威受击者身份。`,
      );
    }
  }

  present(value: unknown): void {
    this.#assertReady('Arena V2 formal Three VFX present');
    this.#runSynchronousOperation('Arena V2 formal Three VFX present', () => {
      try {
        const command = visualCommand(value);
        const resolution = command.cueId.startsWith(SPECIALIZED_CUE_PREFIX)
          ? resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(command)
          : null;
        const style = resolution === null
          ? null
          : resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1(resolution);
        const passthroughSemantic = resolution === null
          ? requireArenaV2FormalPassthroughVfxSemanticCandidateV1(command.cueId)
          : null;
        this.#assertCharacterImpactIdentity(
          command,
          resolution?.feedbackKind,
          passthroughSemantic,
        );
        this.#presentEffect(
          command,
          resolution?.formalTexture.cueId ?? command.cueId,
          null,
          feedbackAnchorKind(resolution?.feedbackKind, passthroughSemantic),
          style,
          passthroughSemantic,
        );
        this.#presentCameraImpact(
          command,
          resolution?.feedbackKind,
          null,
          passthroughSemantic,
        );
        this.#presentCharacterImpact(
          command,
          resolution?.feedbackKind,
          null,
          passthroughSemantic,
        );
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  presentDirectional(value: unknown): void {
    this.#assertReady('Arena V2 formal Three VFX presentDirectional');
    this.#runSynchronousOperation('Arena V2 formal Three VFX presentDirectional', () => {
      try {
        const source = cloneFrozenData(value, 'Arena V2 formal Three VFX directional input');
        const resolution = resolveArenaV2TwentyWeaponFeedbackVfxCandidateV2(source);
        const command = visualCommand(source.command);
        const style = resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1(resolution.base);
        const direction = Object.freeze({
          worldDirection: resolution.directionRenderRecipe.worldDirection,
          horizontalImpulseMagnitude:
            resolution.directionRenderRecipe.horizontalImpulseMagnitude,
          impactStrength: resolution.directionRenderRecipe.impactStrength,
          effectScaleMultiplier: resolution.directionRenderRecipe.effectScaleMultiplier,
          directionArrowScaleMultiplier:
            resolution.directionRenderRecipe.directionArrowScaleMultiplier,
          cameraImpactScaleMultiplier:
            resolution.directionRenderRecipe.cameraImpactScaleMultiplier,
          characterImpactScaleMultiplier:
            resolution.directionRenderRecipe.characterImpactScaleMultiplier,
        });
        this.#assertCharacterImpactIdentity(command, resolution.base.feedbackKind, null);
        this.#presentEffect(
          command,
          resolution.base.formalTexture.cueId,
          direction,
          feedbackAnchorKind(resolution.base.feedbackKind, null),
          style,
          null,
        );
        this.#presentCameraImpact(command, resolution.base.feedbackKind, direction, null);
        this.#presentCharacterImpact(command, resolution.base.feedbackKind, direction, null);
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  presentPassthroughDirectional(value: unknown): void {
    this.#assertReady('Arena V2 formal Three VFX presentPassthroughDirectional');
    this.#runSynchronousOperation(
      'Arena V2 formal Three VFX presentPassthroughDirectional',
      () => {
        try {
          const resolution =
            projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1(value);
          const command = visualCommand(resolution.command);
          const passthroughSemantic =
            requireArenaV2FormalPassthroughVfxSemanticCandidateV1(command.cueId);
          const direction = Object.freeze({
            worldDirection: resolution.directionRenderRecipe.worldDirection,
            horizontalImpulseMagnitude:
              resolution.directionRenderRecipe.horizontalImpulseMagnitude,
            impactStrength: resolution.directionRenderRecipe.impactStrength,
            effectScaleMultiplier: resolution.directionRenderRecipe.effectScaleMultiplier,
            directionArrowScaleMultiplier:
              resolution.directionRenderRecipe.directionArrowScaleMultiplier,
            cameraImpactScaleMultiplier:
              resolution.directionRenderRecipe.cameraImpactScaleMultiplier,
            characterImpactScaleMultiplier:
              resolution.directionRenderRecipe.characterImpactScaleMultiplier,
          });
          this.#assertCharacterImpactIdentity(command, null, passthroughSemantic);
          this.#presentEffect(
            command,
            command.cueId,
            direction,
            passthroughSemantic.feedbackAnchorKind,
            null,
            passthroughSemantic,
          );
          this.#presentCameraImpact(command, null, direction, passthroughSemantic);
          this.#presentCharacterImpact(command, null, direction, passthroughSemantic);
        } catch (error) {
          this.#fail(error);
        }
      },
    );
  }

  remove(sourceEventIdValue: unknown): void {
    this.#assertNoOperation('Arena V2 formal Three VFX remove');
    if (this.#state === 'disposed') return;
    this.#runSynchronousOperation('Arena V2 formal Three VFX remove', () => {
      const sourceEventId = assertNonEmptyString(
        sourceEventIdValue,
        'Arena V2 formal Three VFX remove sourceEventId',
      );
      const errors: unknown[] = [];
      const effect = this.#effects.get(sourceEventId);
      if (effect !== undefined) {
        errors.push(...disposeEffect(effect));
        this.#assertCurrentOperationCommit();
        if (effectCleanupComplete(effect)) this.#effects.delete(sourceEventId);
      }
      try {
        rejectThenable(
          this.#cameraImpact.remove(sourceEventId),
          'Arena V2 formal Three camera impact remove',
        );
      } catch (error) { errors.push(error); }
      this.#assertCurrentOperationCommit();
      try {
        rejectThenable(
          this.#characterImpact.remove(sourceEventId),
          'Arena V2 formal Three character impact remove',
        );
      } catch (error) { errors.push(error); }
      this.#assertCurrentOperationCommit();
      if (errors.length > 0) {
        this.#fail(new AggregateError(errors, 'Arena V2 formal Three VFX移除失败。'));
      }
    });
  }

  clear(): void {
    this.#assertNoOperation('Arena V2 formal Three VFX clear');
    if (this.#state === 'disposed') return;
    this.#runSynchronousOperation('Arena V2 formal Three VFX clear', () => {
      const errors: unknown[] = [...this.#clearEffects()];
      this.#assertCurrentOperationCommit();
      try {
        rejectThenable(
          this.#cameraImpact.clear(),
          'Arena V2 formal Three camera impact clear',
        );
      } catch (error) { errors.push(error); }
      this.#assertCurrentOperationCommit();
      try {
        rejectThenable(
          this.#characterImpact.clear(),
          'Arena V2 formal Three character impact clear',
        );
      } catch (error) { errors.push(error); }
      this.#assertCurrentOperationCommit();
      if (errors.length > 0) {
        this.#state = 'failed';
        throw new AggregateError(errors, 'Arena V2 formal Three VFX清理不完整。');
      }
    });
  }

  sync(value: unknown): void {
    this.#assertReady('Arena V2 formal Three VFX sync');
    this.#runSynchronousOperation('Arena V2 formal Three VFX sync', () => {
      try {
        const source = assertPlainRecord(value, 'Arena V2 formal Three VFX sync input');
        assertKnownKeys(source, SYNC_KEYS, 'Arena V2 formal Three VFX sync input');
        for (const key of SYNC_KEYS) dataField(source, key, 'Arena V2 formal Three VFX sync input');
        const currentTick = safeTick(source.currentTick, 'Arena V2 formal Three VFX currentTick');
        if (this.#lastTick !== null && currentTick < this.#lastTick) {
          throw new RangeError('Arena V2 formal Three VFX拒绝tick倒退。');
        }
        const localParticipantId = assertNonEmptyString(
          source.localParticipantId,
          'Arena V2 formal Three VFX localParticipantId',
        );
        const resolveParticipantPosition = syncFunction(
          source.resolveParticipantPosition,
          'Arena V2 formal Three VFX resolveParticipantPosition',
        );
        const resolveParticipantFeedbackAnchor = syncFunction(
          source.resolveParticipantFeedbackAnchor,
          'Arena V2 formal Three VFX resolveParticipantFeedbackAnchor',
        );
        const stagedEffects: Array<Readonly<{
          effect: ActiveEffect;
          anchor: Readonly<{ x: number; y: number; z: number }> | null;
          compositionAnchorIdentity: string | null;
          legacyParticipantCenterOffset: number;
          displayVisible: boolean;
        }>> = [];
        for (const effect of this.#effects.values()) {
          const ageTicks = Math.max(0, currentTick - effect.command.tick);
          const displayVisible = effect.command.motionPolicy === 'static'
            || ageTicks <= effect.timing.lifetimeTicks;
          if (!displayVisible) {
            stagedEffects.push(Object.freeze({
              effect,
              anchor: null,
              compositionAnchorIdentity: null,
              legacyParticipantCenterOffset: 0,
              displayVisible: false,
            }));
            continue;
          }
          const worldPosition = effect.command.anchorWorldPosition;
          const anchorParticipantId = effect.command.anchorParticipantId ?? localParticipantId;
          let resolvedFeedbackAnchor: unknown = null;
          if (worldPosition === null) {
            resolvedFeedbackAnchor = resolveParticipantFeedbackAnchor(
              anchorParticipantId,
              effect.feedbackAnchorKind,
            );
            this.#assertCurrentOperationCommit();
          }
          let rawPosition = worldPosition ?? resolvedFeedbackAnchor;
          if (rawPosition === null) {
            rawPosition = resolveParticipantPosition(anchorParticipantId);
            this.#assertCurrentOperationCommit();
          }
          if (rawPosition === null) {
            stagedEffects.push(Object.freeze({
              effect,
              anchor: null,
              compositionAnchorIdentity: null,
              legacyParticipantCenterOffset: 0,
              displayVisible: false,
            }));
            continue;
          }
          const unresolvedAnchor = position(
            rawPosition,
            worldPosition === null
              ? `Arena V2 formal Three VFX participant ${anchorParticipantId} ${effect.feedbackAnchorKind}`
              : 'Arena V2 formal Three VFX authority world position',
          );
          const anchor = worldPosition === null
            ? unresolvedAnchor
            : Object.freeze({
              x: -unresolvedAnchor.x,
              y: unresolvedAnchor.y,
              z: unresolvedAnchor.z,
            });
          stagedEffects.push(Object.freeze({
            effect,
            anchor,
            compositionAnchorIdentity: worldPosition === null
              ? JSON.stringify([
                'participant',
                anchorParticipantId,
                effect.feedbackAnchorKind,
              ])
              : JSON.stringify([
                'world',
                worldPosition.x,
                worldPosition.y,
                worldPosition.z,
              ]),
            legacyParticipantCenterOffset: worldPosition === null
              && resolvedFeedbackAnchor === null
              ? 1.55
              : 0,
            displayVisible,
          }));
        }
        const composition = composeArenaV2FormalVfxSameAnchorCandidateV1({
          schemaVersion: 1,
          entries: stagedEffects.flatMap(({
            effect,
            anchor,
            compositionAnchorIdentity,
            displayVisible,
          }) => (
            !displayVisible || anchor === null || compositionAnchorIdentity === null
              ? []
              : [Object.freeze({
                  sourceEventId: effect.command.sourceEventId,
                  anchorIdentity: compositionAnchorIdentity,
                  tick: effect.command.tick,
                  sequence: effect.command.sequence,
                  semanticRank: effect.compositionRank,
                })]
          )),
        });
        const compositionBySourceEventId = new Map(
          composition.map((lane) => [lane.sourceEventId, lane] as const),
        );
        const edgeSafeComposition = composeArenaV2FormalVfxCameraEdgeSafeCandidateV1({
          schemaVersion: 1,
          entries: stagedEffects.flatMap(({
            effect,
            anchor,
            compositionAnchorIdentity,
            legacyParticipantCenterOffset,
            displayVisible,
          }) => {
            if (!displayVisible || anchor === null || compositionAnchorIdentity === null) return [];
            const lane = compositionBySourceEventId.get(effect.command.sourceEventId);
            if (lane === undefined) {
              throw new RangeError('Arena V2 formal Three VFX相机边缘组合缺少基础分槽。');
            }
            this.#projectedCompositionAnchor
              .set(
                anchor.x,
                anchor.y + legacyParticipantCenterOffset,
                anchor.z,
              )
              .project(this.#camera);
            return [Object.freeze({
              sourceEventId: effect.command.sourceEventId,
              anchorIdentity: compositionAnchorIdentity,
              lane: lane.lane,
              projectedAnchorNdc: Object.freeze({
                x: this.#projectedCompositionAnchor.x,
                y: this.#projectedCompositionAnchor.y,
                z: this.#projectedCompositionAnchor.z,
              }),
            })];
          }),
        });
        const edgeSafeCompositionBySourceEventId = new Map(
          edgeSafeComposition.map((lane) => [lane.sourceEventId, lane] as const),
        );
        for (const {
          effect,
          anchor,
          legacyParticipantCenterOffset,
          displayVisible,
        } of stagedEffects) {
          if (anchor === null || !displayVisible) {
            effect.root.visible = false;
            continue;
          }
          const lane = edgeSafeCompositionBySourceEventId.get(effect.command.sourceEventId);
          if (lane === undefined) {
            throw new RangeError('Arena V2 formal Three VFX相机边缘组合缺少活动效果。');
          }
          const ageTicks = Math.max(0, currentTick - effect.command.tick);
          const opacity = opacityForAge(effect.command, effect.timing, ageTicks);
          effect.root.visible = true;
          effect.root.position.set(
            anchor.x,
            anchor.y + legacyParticipantCenterOffset,
            anchor.z,
          );
          this.#compositionOffset
            .set(lane.offsetCameraX, lane.offsetCameraY, 0)
            .applyQuaternion(this.#camera.quaternion);
          effect.root.position.add(this.#compositionOffset);
          effect.root.quaternion.copy(this.#camera.quaternion);
          if (effect.directionLayer !== null && effect.worldDirection !== null) {
            this.#inverseCameraQuaternion.copy(this.#camera.quaternion).invert();
            this.#projectedDirection
              .set(-effect.worldDirection.x, 0, effect.worldDirection.z)
              .applyQuaternion(this.#inverseCameraQuaternion);
            if (Math.hypot(this.#projectedDirection.x, this.#projectedDirection.y) > 1e-7) {
              effect.directionLayer.rotation.z = Math.atan2(
                this.#projectedDirection.y,
                this.#projectedDirection.x,
              );
            }
          }
          effect.root.scale.setScalar(
            scaleForAge(effect.command, effect.timing, ageTicks) * effect.impactScaleMultiplier,
          );
          for (const item of effect.materials) {
            if (item.material instanceof THREE.MeshBasicMaterial
              || item.material instanceof THREE.PointsMaterial
              || item.material instanceof THREE.SpriteMaterial) {
              item.material.opacity = opacity * item.peakOpacity;
            }
          }
        }
        this.#assertCurrentOperationCommit();
        this.#lastTick = currentTick;
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return this.#runSynchronousOperation('snapshot-read', () => Object.freeze({
      state: this.#state,
      activeSourceEventIds: Object.freeze([...this.#effects.keys()].sort()),
      effectCleanupDebtCount: this.#effectCleanupDebts.size,
      authorityDirectionalSourceEventIds: Object.freeze([...this.#effects]
        .filter(([, effect]) => effect.worldDirection !== null)
        .map(([sourceEventId]) => sourceEventId)
        .sort()),
      activeWeaponStyleIds: Object.freeze([...this.#effects.values()]
        .map(({ styleId }) => styleId)
        .filter((styleId): styleId is string => styleId !== null)
        .sort()),
      loadedTextureCueIds: Object.freeze([...this.#textures.keys()].sort()),
      approvalMode: this.#allowUnapprovedCandidateTextures
        ? 'isolated-unapproved-candidates'
        : 'production-approved-only',
      productionApprovedTextureAssetIds: PRODUCTION_APPROVED_VFX_TEXTURE_ASSET_IDS,
      blockedTextureAssetIds: Object.freeze(this.#allowUnapprovedCandidateTextures
        ? []
        : ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1
          .map(({ vfxAssetId }) => vfxAssetId)
          .filter((assetId) => !PRODUCTION_APPROVED_VFX_TEXTURE_ASSET_ID_SET.has(assetId))
          .sort()),
      pendingTextureCleanupCount: this.#pendingTextures.size,
      textureLoaderPendingRequestCount:
        this.#textureLoader.getSnapshot().pendingRequestCount,
      textureLoaderCleanupComplete: this.#textureLoader.isCleanupComplete(),
      loadPending: this.#loadPending,
      disposeRequested: this.#disposeRequested,
      lastError: this.#lastError,
      lastTick: this.#lastTick,
      cameraImpactWired: true,
      characterImpactReadabilityWired: true,
      authorityImpactStrengthWired: true,
      registeredCandidateTextureGateClosed:
        this.#textures.size === ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length,
      formalAssetGateClosed: false,
    }));
  }

  dispose(): void {
    this.#assertNoOperation('Arena V2 formal Three VFX dispose');
    if (this.#state === 'disposed') return;
    this.#runSynchronousOperation('Arena V2 formal Three VFX dispose', () => {
      this.#disposeRequested = true;
      const errors = [...this.#terminalCleanup()];
      const cleanupComplete = this.#terminalCleanupComplete();
      this.#state = errors.length > 0
        ? 'failed'
        : cleanupComplete
          ? 'disposed'
          : 'disposing';
      if (errors.length === 0 && !cleanupComplete) {
        errors.push(new Error('Arena V2 formal Three VFX终态清理依赖尚未收敛。'));
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 formal Three VFX销毁不完整。');
      }
    });
  }
}

export const ARENA_V2_FORMAL_THREE_VFX_PORT_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  productionApprovalCheckedBeforeTextureLoaderInvocation: true as const,
  productionApprovalUsesSharedLedgerIndex: true as const,
  defaultUnapprovedCandidateLoadingAllowed: false as const,
  isolatedCandidateLoadingRequiresExplicitOptIn: true as const,
  currentProductionApprovedVfxTextureAssetCount: 0 as const,
  loadOperationPublishedBeforeTextureLoaderInvocation: true as const,
  repeatedLoadChecksReentryBeforeOwnerReuse: true as const,
  allPublicLifecycleCommitsGuarded: true as const,
  publicReadsRejectedDuringOperationCommit: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  textureThreeAndImpactCallbacksCheckedBeforeCrossOwnerOrStateCommit: true as const,
  terminalCleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true as const,
  terminalOrdinaryFailureRetainsCurrentOwnerAndStopsLaterOwners: true as const,
  effectCleanupUsesRootGeometryMaterialWatermarks: true as const,
  constructorFailureExposesRetryableSceneRootOwner: true as const,
  syncResolversCheckedBeforeFrameWatermarkCommit: true as const,
  swallowedTextureThreeOrImpactReentryFailsClosed: true as const,
  eachTextureSettlementCommitsUnderOperationGuard: true as const,
  textureBatchAndTerminalWatermarksCommitUnderOperationGuard: true as const,
  synchronousLaunchFailureSettlesPublishedLoadOwner: true as const,
  synchronousLaunchFailureCancelsStartedTextureOwnersBeforeSettlementWait: true as const,
  lateTexturesAreDisposedBeforeSettlementRejects: true as const,
  pendingTextureLoadsOwnedByPlatformTextureLoader: true as const,
  disposalCancelsPendingTextureLoadsBeforeTextureCleanup: true as const,
  textureSourceResolutionUsesValidatedBaseUrl: true as const,
  authorityTimeSource: 'integer-tick' as const,
  maximumActiveEffects: MAXIMUM_ACTIVE_EFFECTS,
  sameAnchorCompositionWired: true as const,
  sameAnchorCompositionMaximumLanes: 3 as const,
  sameAnchorCompositionAddsResourcesOrDrawCalls: false as const,
  cameraEdgeSafeCompositionWired: true as const,
  cameraEdgeSafeCompositionUsesForwardProjectionOnly: true as const,
  cameraEdgeSafeCompositionAddsResourcesOrDrawCalls: false as const,
  maximumParticlesPerEffect: 96 as const,
  maximumAverageOverdraw: 2 as const,
  distortionAllowed: false as const,
  cameraImpactRequiresLocalInvolvement: true as const,
  remoteWeaponImpactKeepsWorldAndCharacterFeedback: true as const,
  syntheticRuleFactsAllowed: false as const,
  consumesAuthorityDirectionFactsV2: true as const,
  unarmedPassthroughConsumesAuthorityDirectionFactsV2: true as const,
  unarmedPassthroughReusesGenericCueAndAssetBudget: true as const,
  consumesFormalCharacterAndWeaponFeedbackAnchors: true as const,
  infersDirectionFromPositionOrAnimation: false as const,
  authoredTextureMappingForSpecializedCues: true as const,
  exactTwentyWeaponShapeLanguageWired: true as const,
  stableWeaponStyleIdentityCount: 480 as const,
  exactPassthroughCueSemanticResolutionWired: true as const,
  exactPassthroughCueSemanticIdentityCount: 22 as const,
  substringCueSemanticInferenceAllowed: false as const,
  ringOutAndMovementFallCausalShapesDistinct: true as const,
  supportingGeometryAddsLayer: false as const,
  supportingGeometryRaisesParticleBudget: false as const,
  brightCoreUsesAdditiveBlend: true as const,
  darkEdgeUsesNormalBlend: true as const,
  preservesPerLayerPeakOpacity: true as const,
  semanticTimingProfiles: Object.freeze({
    hitConfirmLifetimeTicks: 18 as const,
    surfaceTransferLifetimeTicks: 28 as const,
    ringOutLifetimeTicks: 42 as const,
    evadedLifetimeTicks: 24 as const,
  }),
  reducedMotionKeepsWeaponShapeIdentity: true as const,
  stablePresentationCameraImpactWired: true as const,
  stableTargetCharacterImpactReadabilityWired: true as const,
  authorityTargetIdentityDrivesCharacterImpact: true as const,
  authorityAttackerIdentityDrivesOneTickContactHold: true as const,
  combatIdentityInferredFromVisualAnchor: false as const,
  characterImpactIdentityPreflightRunsBeforeVisualOrCameraSideEffects: true as const,
  authorityImpactStrengthProjectionWired: true as const,
  impactStrengthAddsParticleOrLayerBudget: false as const,
  authoredTextureIdentityCount: 5 as const,
  registeredCandidateTextureGateClosed: true as const,
  failedEffectCleanupRetainsOriginalEffectOwnership: true as const,
  failedEffectConstructionRetainsRetryableCleanupDebt: true as const,
  effectMountIsTransactional: true as const,
  effectCleanupRetriesOnlyIncompleteResources: true as const,
  terminalCleanupRetriesOnlyIncompleteOwnedResources: true as const,
  lateTextureCleanupRetainsRetryOwnership: true as const,
  disposalWaitsForTextureLoadingToSettle: true as const,
  textureSettlementAutomaticallyContinuesRequestedDisposal: true as const,
  terminalContinuationUsesAsyncSettlementNotPolling: true as const,
  textureBatchSettlementCannotCompleteOnFirstFailure: true as const,
  reportsEveryRejectedTextureInSettledBatch: true as const,
  lateLoadFailureCannotRefailClosedOwner: true as const,
  closesFormalVfxAssetGate: false as const,
  validationStatus: 'not-run' as const,
});
