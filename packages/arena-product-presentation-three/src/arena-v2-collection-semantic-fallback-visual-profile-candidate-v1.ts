import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1,
  type ArenaV2UiRectV1,
  type ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1,
} from './arena-v2-character-weapon-first-screen-readability-candidate-v1.js';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';

type FallbackKind = 'weapon' | 'map';
type FallbackGeometry =
  | 'disc'
  | 'top-heavy'
  | 'long-axis'
  | 'open-wedge'
  | 'rear-point'
  | 'compact-block'
  | 'wide-crossbar'
  | 'hook'
  | 'radial'
  | 'downward-point'
  | 'thin-arc'
  | 'branched-route'
  | 'switchback-route';
type ValueHierarchy = 'light-open' | 'medium-axis' | 'heavy-anchor' | 'route-depth';

export interface ArenaV2CollectionSemanticFallbackVisualProfileCandidateV1 {
  readonly schemaVersion: 1;
  readonly profileId: string;
  readonly kind: FallbackKind;
  readonly definitionId: string;
  readonly assetId: string;
  readonly collectionOrder: number;
  readonly primaryShape: Readonly<{
    readonly semantic: string;
    readonly geometry: FallbackGeometry;
  }>;
  readonly secondaryShape: Readonly<{
    readonly semantic: string;
    readonly geometry: 'notch' | 'endpoint' | 'counterweight' | 'route-turn';
  }>;
  readonly linePattern: Readonly<{
    readonly semantic: string;
    readonly glyph: string;
  }>;
  readonly stableGlyphLabel: string;
  readonly learningSemantic: string;
  readonly valueHierarchy: ValueHierarchy;
  readonly visualSignature: string;
  readonly colorIsNeverSoleSignal: true;
  readonly reducedMotionPolicy: 'static-no-auto-rotate-no-flash';
  readonly mutedPolicy: 'identical-visual-information';
  readonly formalReady: false;
  readonly assetUsePermitted: false;
  readonly requestToken: null;
  readonly programmaticGeometryNormalPath: false;
}

export interface ArenaV2CollectionSemanticFallbackPrimitiveInputV1 {
  readonly schemaVersion: 1;
  readonly prefix: string;
  readonly rect: ArenaV2UiRectV1;
  readonly clipRect: ArenaV2UiRectV1;
  readonly kind: FallbackKind;
  readonly definitionId: string;
  readonly assetId: string;
  readonly displayName: string;
}

export interface ArenaV2CollectionSemanticFallbackPrimitiveGeometrySignatureInputV1 {
  readonly schemaVersion: 1;
  readonly kind: FallbackKind;
  readonly definitionId: string;
  readonly assetId: string;
  readonly rect: ArenaV2UiRectV1;
}

export interface ArenaV2CollectionSemanticFallbackPrimitiveGeometryClosureEntryV1 {
  readonly kind: FallbackKind;
  readonly definitionId: string;
  readonly assetId: string;
  readonly collectionOrder: number;
  readonly geometryIdentityOrdinal: number;
  readonly signatures: readonly [
    Readonly<{ readonly standardSlotCssPixels: 72; readonly signature: string }>,
    Readonly<{ readonly standardSlotCssPixels: 96; readonly signature: string }>,
    Readonly<{ readonly standardSlotCssPixels: 168; readonly signature: string }>,
    Readonly<{ readonly standardSlotCssPixels: 240; readonly signature: string }>,
  ];
}

const CORE_VERB_LABEL = Object.freeze({
  push: '推',
  pull: '拉',
  charge: '冲',
  suppress: '压',
  counter: '反',
  flank: '绕',
} as const);

function weaponGeometry(family: string): FallbackGeometry {
  switch (family) {
    case 'broad-front-disc':
    case 'spiked-anchor-disc': return 'disc';
    case 'top-heavy-block':
    case 'double-heavy-wedge': return 'top-heavy';
    case 'line-and-endpoint':
    case 'long-straight-staff':
    case 'hooked-long-pole':
    case 'long-lance':
    case 'short-baton': return 'long-axis';
    case 'open-book-wedge': return 'open-wedge';
    case 'short-rear-blade':
    case 'rear-pivot-saber': return 'rear-point';
    case 'compact-fist-block':
    case 'compact-held-volume': return 'compact-block';
    case 'wide-crossbar': return 'wide-crossbar';
    case 'crescent-edge':
    case 'looped-hook-bundle': return 'hook';
    case 'radial-fan': return 'radial';
    case 'downward-claw-point': return 'downward-point';
    case 'thin-arc-and-line': return 'thin-arc';
    default: throw new RangeError(`A6.18未知武器轮廓语义：${family}。`);
  }
}

function patternGlyph(pattern: string): string {
  switch (pattern) {
    case 'quartered-face': return '⊞';
    case 'double-band-head': return '═';
    case 'alternating-link-dashes': return '—·—';
    case 'three-spaced-rings': return '○○○';
    case 'paired-page-stripes': return '≪';
    case 'single-diagonal-cut': return '╱';
    case 'hook-tip-band': return '⌝';
    case 'single-center-badge': return '⊙';
    case 'forward-chevron-bands': return '≫';
    case 'three-spoke-muzzle': return '╪';
    case 'vertical-spike-stack': return '⇣';
    case 'crescent-edge-stripes': return '◖';
    case 'return-arrow': return '↩';
    case 'single-tip-ring': return '—○';
    case 'double-warning-band': return '≠';
    case 'alternating-radial-sectors': return '✣';
    case 'three-claw-marks': return '///';
    case 'parallel-route-lines': return '∥';
    case 'pivot-half-ring': return '◒';
    case 'hold-progress-bars': return '▮▮';
    default: throw new RangeError(`A6.18未知武器纹理语义：${pattern}。`);
  }
}

function hierarchyForMass(mass: 'light' | 'medium' | 'heavy'): ValueHierarchy {
  if (mass === 'light') return 'light-open';
  if (mass === 'medium') return 'medium-axis';
  return 'heavy-anchor';
}

function weaponProfiles(): readonly ArenaV2CollectionSemanticFallbackVisualProfileCandidateV1[] {
  const readabilityByDefinition = new Map(
    ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1.map((profile) => (
      [profile.equipmentDefinitionId, profile] as const
    )),
  );
  return Object.freeze(
    ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1.weapons.map((source) => {
      const readability = readabilityByDefinition.get(source.weaponDefinitionId);
      const binding = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings.find((entry) => (
        entry.kind === 'weapon' && entry.definitionId === source.weaponDefinitionId
      ));
      if (readability === undefined || binding === undefined || binding.assetId !== readability.asset.assetId) {
        throw new RangeError(`A6.18武器来源身份未闭合：${source.weaponDefinitionId}。`);
      }
      const stableGlyphLabel = `武${String(source.collectionOrder).padStart(2, '0')}·${CORE_VERB_LABEL[source.coreVerb]}`;
      const primaryShape = Object.freeze({
        semantic: readability.silhouette.shapeCue,
        geometry: weaponGeometry(readability.silhouette.family),
      });
      const secondaryShape = Object.freeze({
        semantic: readability.groundPickup.markerShape,
        geometry: readability.silhouette.mass === 'heavy'
          ? 'counterweight' as const
          : readability.silhouette.mass === 'medium'
            ? 'endpoint' as const
            : 'notch' as const,
      });
      const linePattern = Object.freeze({
        semantic: `${readability.silhouette.patternCue}+${readability.groundPickup.markerPattern}`,
        glyph: patternGlyph(readability.silhouette.patternCue),
      });
      const visualSignature = [
        primaryShape.geometry,
        secondaryShape.semantic,
        linePattern.semantic,
        stableGlyphLabel,
      ].join('|');
      return Object.freeze({
        schemaVersion: 1 as const,
        profileId: `arena-v2.a6.18.weapon.${String(source.collectionOrder).padStart(2, '0')}.v1`,
        kind: 'weapon' as const,
        definitionId: source.weaponDefinitionId,
        assetId: binding.assetId,
        collectionOrder: source.collectionOrder,
        primaryShape,
        secondaryShape,
        linePattern,
        stableGlyphLabel,
        learningSemantic: `existing-core-verb:${source.coreVerb}`,
        valueHierarchy: hierarchyForMass(readability.silhouette.mass),
        visualSignature,
        colorIsNeverSoleSignal: true as const,
        reducedMotionPolicy: 'static-no-auto-rotate-no-flash' as const,
        mutedPolicy: 'identical-visual-information' as const,
        formalReady: false as const,
        assetUsePermitted: false as const,
        requestToken: null,
        programmaticGeometryNormalPath: false as const,
      });
    }),
  );
}

function mapProfiles(): readonly ArenaV2CollectionSemanticFallbackVisualProfileCandidateV1[] {
  return Object.freeze(
    ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1.maps.map((source) => {
      const binding = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings.find((entry) => (
        entry.kind === 'map' && entry.definitionId === source.mapDefinitionId
      ));
      if (binding === undefined) {
        throw new RangeError(`A6.18地图来源身份未闭合：${source.mapDefinitionId}。`);
      }
      const isBranch = source.pacingArc === 'two-cycle-branch-escalation';
      const primaryShape = Object.freeze({
        semantic: source.pacingArc,
        geometry: isBranch ? 'branched-route' as const : 'switchback-route' as const,
      });
      const secondaryShape = Object.freeze({
        semantic: source.peakLandmarkCue,
        geometry: 'route-turn' as const,
      });
      const linePattern = Object.freeze({
        semantic: source.primaryLeadingLineCue,
        glyph: isBranch ? '⑴╱⑵' : '┐└',
      });
      const stableGlyphLabel = `图${source.collectionOrder}·${isBranch ? '双环' : '折返'}`;
      const visualSignature = [
        primaryShape.geometry,
        source.routeRhythm.join('/'),
        source.landmarkCues.join('/'),
        source.leadingLineCues.join('/'),
        stableGlyphLabel,
      ].join('|');
      return Object.freeze({
        schemaVersion: 1 as const,
        profileId: `arena-v2.a6.18.map.${source.collectionOrder}.v1`,
        kind: 'map' as const,
        definitionId: source.mapDefinitionId,
        assetId: binding.assetId,
        collectionOrder: source.collectionOrder,
        primaryShape,
        secondaryShape,
        linePattern,
        stableGlyphLabel,
        learningSemantic: `existing-route-pacing:${source.pacingArc}`,
        valueHierarchy: 'route-depth' as const,
        visualSignature,
        colorIsNeverSoleSignal: true as const,
        reducedMotionPolicy: 'static-no-auto-rotate-no-flash' as const,
        mutedPolicy: 'identical-visual-information' as const,
        formalReady: false as const,
        assetUsePermitted: false as const,
        requestToken: null,
        programmaticGeometryNormalPath: false as const,
      });
    }),
  );
}

const PROFILES = Object.freeze([...weaponProfiles(), ...mapProfiles()]);
if (
  PROFILES.length !== 22
  || new Set(PROFILES.map(({ definitionId }) => definitionId)).size !== 22
  || new Set(PROFILES.map(({ profileId }) => profileId)).size !== 22
  || new Set(PROFILES.map(({ visualSignature }) => visualSignature)).size !== 22
) throw new RangeError('A6.18必须形成22项唯一语义回退视觉身份。');

const AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  stage: 'A6.18' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  profileCount: 22 as const,
  weaponProfileCount: 20 as const,
  mapProfileCount: 2 as const,
  maximumPrimitiveCountPerSlot: 4 as const,
  maximumTextPrimitiveCountPerSlot: 1 as const,
  pageCountAdded: 0 as const,
  actionCountAdded: 0 as const,
  createsThreeResources: false as const,
  loadsAssetBytes: false as const,
  createsLeaseOrMount: false as const,
  claimsFormalAssetApproval: false as const,
  sourceSemanticContentHash:
    ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1.contentHash,
  sourceFormalPreviewCatalogContentHash:
    ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.contentHash,
  profiles: PROFILES,
});

export const ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1 =
  Object.freeze({
    ...AUTHORITY,
    contentHash: createDeterministicDataHash(
      AUTHORITY,
      'Arena V2 A6.18 Collection Semantic Fallback Visual Profile Candidate V1',
    ),
  });

export function requireArenaV2CollectionSemanticFallbackVisualProfileCandidateV1(
  kind: FallbackKind,
  definitionId: string,
  assetId: string,
): ArenaV2CollectionSemanticFallbackVisualProfileCandidateV1 {
  const profile = PROFILES.find((entry) => entry.kind === kind && entry.definitionId === definitionId);
  if (profile === undefined || profile.assetId !== assetId) {
    throw new RangeError(`A6.18回退视觉身份未知或漂移：${kind}/${definitionId}/${assetId}。`);
  }
  return profile;
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'prefix', 'rect', 'clipRect', 'kind', 'definitionId', 'assetId', 'displayName',
]);
const GEOMETRY_SIGNATURE_INPUT_KEYS = new Set([
  'schemaVersion', 'kind', 'definitionId', 'assetId', 'rect',
]);
const RECT_KEYS = new Set(['x', 'y', 'width', 'height']);
const STANDARD_SLOT_CSS_PIXELS = Object.freeze([72, 96, 168, 240] as const);

function rectValue(value: unknown, name: string): ArenaV2UiRectV1 {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, RECT_KEYS, name);
  const parsed = ['x', 'y', 'width', 'height'].map((key) => {
    const field = source[key];
    if (typeof field !== 'number' || !Number.isFinite(field)) {
      throw new TypeError(`${name}.${key}必须是有限number。`);
    }
    return field;
  });
  if (parsed[2]! <= 0 || parsed[3]! <= 0) throw new RangeError(`${name}宽高必须为正。`);
  if (!Number.isFinite(parsed[0]! + parsed[2]!) || !Number.isFinite(parsed[1]! + parsed[3]!)) {
    throw new RangeError(`${name}右/下边界不得发生number溢出。`);
  }
  return Object.freeze({ x: parsed[0]!, y: parsed[1]!, width: parsed[2]!, height: parsed[3]! });
}

function geometryIdentityOrdinal(
  profile: ArenaV2CollectionSemanticFallbackVisualProfileCandidateV1,
): number {
  if (!Number.isSafeInteger(profile.collectionOrder)) {
    throw new RangeError(`A6.18b ${profile.profileId} collectionOrder必须是安全整数。`);
  }
  if (profile.kind === 'weapon') {
    if (profile.collectionOrder < 1 || profile.collectionOrder > 20) {
      throw new RangeError(`A6.18b ${profile.profileId}武器顺序必须位于1..20。`);
    }
    return profile.collectionOrder;
  }
  const semanticSource = ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1.maps.find(
    ({ mapDefinitionId }) => mapDefinitionId === profile.definitionId,
  );
  if (semanticSource === undefined
    || semanticSource.collectionOrder !== profile.collectionOrder
    || (semanticSource.collectionOrder === 1
      && (semanticSource.segmentCount !== 12
        || semanticSource.pacingArc !== 'two-cycle-branch-escalation'))
    || (semanticSource.collectionOrder === 2
      && (semanticSource.segmentCount !== 8
        || semanticSource.pacingArc !== 'cardinal-switchback-sawtooth'))) {
    throw new RangeError(`A6.18b ${profile.profileId}地图12+8节奏身份未闭合。`);
  }
  return semanticSource.segmentCount === 12 ? 21 : 22;
}

function assertStandardPreviewRectMinimum(rect: ArenaV2UiRectV1, name: string): void {
  if (rect.width < STANDARD_SLOT_CSS_PIXELS[0] || rect.height < STANDARD_SLOT_CSS_PIXELS[0]) {
    throw new RangeError(`${name}必须至少满足A6.4的72px标准preview slot下限。`);
  }
}

interface PanelGeometryV1 {
  readonly rect: ArenaV2UiRectV1;
  readonly cornerRadiusCssPixels: number;
}

interface PrimitivePanelGeometrySetV1 {
  readonly primary: PanelGeometryV1;
  readonly secondary: PanelGeometryV1;
  readonly pattern: PanelGeometryV1;
}

function assertGeometryWithinRect(
  geometry: PanelGeometryV1,
  rect: ArenaV2UiRectV1,
  name: string,
): void {
  const right = geometry.rect.x + geometry.rect.width;
  const bottom = geometry.rect.y + geometry.rect.height;
  if (!Number.isFinite(geometry.cornerRadiusCssPixels)
    || geometry.cornerRadiusCssPixels < 0
    || geometry.rect.width <= 0
    || geometry.rect.height <= 0
    || geometry.rect.x < rect.x
    || geometry.rect.y < rect.y
    || right > rect.x + rect.width
    || bottom > rect.y + rect.height) {
    throw new RangeError(`A6.18b ${name}几何越出标准preview rect。`);
  }
}

function panelGeometry(
  profile: ArenaV2CollectionSemanticFallbackVisualProfileCandidateV1,
  rect: ArenaV2UiRectV1,
): PrimitivePanelGeometrySetV1 {
  const inset = Math.max(6, Math.round(Math.min(rect.width, rect.height) * 0.08));
  const labelHeight = Math.max(20, Math.min(28, Math.round(rect.height * 0.24)));
  const area = Object.freeze({
    x: rect.x + inset,
    y: rect.y + inset,
    width: Math.max(12, rect.width - inset * 2),
    height: Math.max(12, rect.height - inset * 2 - labelHeight),
  });
  const identityOrdinal = geometryIdentityOrdinal(profile);
  const identityBand = (identityOrdinal - 1) % 5;
  const identityTier = Math.floor((identityOrdinal - 1) / 5);
  const horizontal = profile.primaryShape.geometry === 'long-axis'
    || profile.primaryShape.geometry === 'wide-crossbar'
    || profile.primaryShape.geometry === 'thin-arc'
    || profile.primaryShape.geometry === 'branched-route';
  const vertical = profile.primaryShape.geometry === 'top-heavy'
    || profile.primaryShape.geometry === 'downward-point'
    || profile.primaryShape.geometry === 'switchback-route';
  const primaryWidthRatio = horizontal
    ? 0.62
    : vertical
      ? 0.28
      : 0.42;
  const primaryHeightRatio = horizontal
    ? 0.18
    : vertical
      ? 0.62
      : 0.42;
  const primaryWidth = Math.max(
    4,
    Math.round(area.width * (primaryWidthRatio + identityBand * 0.025)),
  );
  const primaryHeight = Math.max(
    4,
    Math.round(area.height * (primaryHeightRatio + (identityTier % 3) * 0.025)),
  );
  const primary = Object.freeze({
    x: Math.round(area.x + (area.width - primaryWidth) * (0.12 + identityTier * 0.16)),
    y: Math.round(area.y + (area.height - primaryHeight) * (0.12 + identityBand * 0.13)),
    width: primaryWidth,
    height: primaryHeight,
  });
  const secondarySize = Math.max(
    5,
    Math.round(Math.min(area.width, area.height) * (0.16 + (identityTier % 4) * 0.025)),
  );
  const secondaryWidth = profile.secondaryShape.geometry === 'endpoint'
    ? Math.max(4, Math.round(secondarySize * 0.65))
    : secondarySize;
  const secondaryHeight = profile.secondaryShape.geometry === 'counterweight'
    ? Math.max(4, Math.round(secondarySize * 0.72))
    : secondarySize;
  const secondary = Object.freeze({
    x: Math.round(area.x + (area.width - secondaryWidth) * (identityBand * 0.19 + 0.04)),
    y: Math.round(area.y + (area.height - secondaryHeight) * (identityTier * 0.18 + 0.04)),
    width: secondaryWidth,
    height: secondaryHeight,
  });
  const patternWidthRatio = 0.2 + identityOrdinal * 0.025;
  const patternHeight = Math.max(3, Math.round(area.height * (0.055 + (identityTier % 2) * 0.025)));
  const patternWidth = Math.max(8, Math.round(area.width * patternWidthRatio));
  const pattern = Object.freeze({
    x: Math.round(area.x + (area.width - patternWidth) * (identityTier % 2 === 0 ? 0 : 0.24)),
    y: Math.round(area.y + area.height - patternHeight),
    width: patternWidth,
    height: patternHeight,
  });
  const result = Object.freeze({
    primary: Object.freeze({
      rect: primary,
      cornerRadiusCssPixels: profile.primaryShape.geometry === 'disc'
        || profile.primaryShape.geometry === 'radial'
        ? Math.round(Math.min(primary.width, primary.height) / 2)
        : 4,
    }),
    secondary: Object.freeze({
      rect: secondary,
      cornerRadiusCssPixels: profile.secondaryShape.geometry === 'endpoint'
        ? Math.round(Math.min(secondary.width, secondary.height) / 2)
        : 2,
    }),
    pattern: Object.freeze({
      rect: pattern,
      cornerRadiusCssPixels: 1,
    }),
  });
  assertGeometryWithinRect(result.primary, rect, `${profile.profileId}.primary`);
  assertGeometryWithinRect(result.secondary, rect, `${profile.profileId}.secondary`);
  assertGeometryWithinRect(result.pattern, rect, `${profile.profileId}.pattern`);
  return result;
}

function geometrySignature(
  geometry: PrimitivePanelGeometrySetV1,
  rect: ArenaV2UiRectV1,
): string {
  return (['primary', 'secondary', 'pattern'] as const).map((role) => {
    const panel = geometry[role];
    const { x, y, width, height } = panel.rect;
    return `${role}:${x - rect.x},${y - rect.y},${width},${height},${panel.cornerRadiusCssPixels}`;
  }).join('|');
}

export function createArenaV2CollectionSemanticFallbackPrimitiveGeometrySignatureCandidateV1(
  value: ArenaV2CollectionSemanticFallbackPrimitiveGeometrySignatureInputV1,
): string {
  const source = cloneFrozenData(value, 'A6.18b primitive geometry signature input');
  assertKnownKeys(
    source,
    GEOMETRY_SIGNATURE_INPUT_KEYS,
    'A6.18b primitive geometry signature input',
  );
  if (source.schemaVersion !== 1 || (source.kind !== 'weapon' && source.kind !== 'map')) {
    throw new RangeError('A6.18b primitive geometry signature input版本或kind不受支持。');
  }
  const definitionId = assertNonEmptyString(source.definitionId, 'A6.18b definitionId');
  const assetId = assertNonEmptyString(source.assetId, 'A6.18b assetId');
  const rect = rectValue(source.rect, 'A6.18b rect');
  assertStandardPreviewRectMinimum(rect, 'A6.18b rect');
  const profile = requireArenaV2CollectionSemanticFallbackVisualProfileCandidateV1(
    source.kind,
    definitionId,
    assetId,
  );
  return geometrySignature(panelGeometry(profile, rect), rect);
}

function standardGeometrySignatures(
  profile: ArenaV2CollectionSemanticFallbackVisualProfileCandidateV1,
): ArenaV2CollectionSemanticFallbackPrimitiveGeometryClosureEntryV1['signatures'] {
  const signatureFor = <Size extends 72 | 96 | 168 | 240>(standardSlotCssPixels: Size) => (
    Object.freeze({
      standardSlotCssPixels,
      signature: createArenaV2CollectionSemanticFallbackPrimitiveGeometrySignatureCandidateV1({
        schemaVersion: 1,
        kind: profile.kind,
        definitionId: profile.definitionId,
        assetId: profile.assetId,
        rect: Object.freeze({
          x: 0,
          y: 0,
          width: standardSlotCssPixels,
          height: standardSlotCssPixels,
        }),
      }),
    })
  );
  return Object.freeze([
    signatureFor(72),
    signatureFor(96),
    signatureFor(168),
    signatureFor(240),
  ]);
}

const GEOMETRY_CLOSURE_ENTRIES = Object.freeze(PROFILES.map((profile) => Object.freeze({
  kind: profile.kind,
  definitionId: profile.definitionId,
  assetId: profile.assetId,
  collectionOrder: profile.collectionOrder,
  geometryIdentityOrdinal: geometryIdentityOrdinal(profile),
  signatures: standardGeometrySignatures(profile),
})));

if (new Set(GEOMETRY_CLOSURE_ENTRIES.map(({ geometryIdentityOrdinal }) => (
  geometryIdentityOrdinal
))).size !== 22) {
  throw new RangeError('A6.18b 20武器与2地图的geometry identity ordinal必须唯一。');
}

STANDARD_SLOT_CSS_PIXELS.forEach((standardSlotCssPixels, signatureIndex) => {
  const signatures = GEOMETRY_CLOSURE_ENTRIES.map(({ signatures: entrySignatures }) => (
    entrySignatures[signatureIndex]!.signature
  ));
  if (new Set(signatures).size !== 22) {
    throw new RangeError(
      `A6.18b ${standardSlotCssPixels}px标准槽的22项非文字panel几何signature必须唯一。`,
    );
  }
});

const GEOMETRY_CLOSURE_AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  stage: 'A6.18b' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  standardSlotCssPixels: STANDARD_SLOT_CSS_PIXELS,
  profileCount: 22 as const,
  panelCountPerProfile: 3 as const,
  textCountPerProfile: 1 as const,
  colorParticipatesInGeometryIdentity: false as const,
  createsResources: false as const,
  loadsAssetBytes: false as const,
  createsLeaseOrMount: false as const,
  defaultSurfaceWired: false as const,
  sourceProfileCatalogContentHash:
    ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1.contentHash,
  entries: GEOMETRY_CLOSURE_ENTRIES,
});

export const ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_PRIMITIVE_GEOMETRY_CLOSURE_CANDIDATE_V1 =
  Object.freeze({
    ...GEOMETRY_CLOSURE_AUTHORITY,
    contentHash: createDeterministicDataHash(
      GEOMETRY_CLOSURE_AUTHORITY,
      'Arena V2 A6.18b Collection Semantic Fallback Primitive Geometry Closure Candidate V1',
    ),
  });

export function createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1(
  value: ArenaV2CollectionSemanticFallbackPrimitiveInputV1,
): readonly ArenaV2UiRenderPrimitiveV1[] {
  const source = cloneFrozenData(value, 'A6.18 fallback primitive input');
  assertKnownKeys(source, INPUT_KEYS, 'A6.18 fallback primitive input');
  if (source.schemaVersion !== 1 || (source.kind !== 'weapon' && source.kind !== 'map')) {
    throw new RangeError('A6.18 fallback primitive input版本或kind不受支持。');
  }
  const prefix = assertNonEmptyString(source.prefix, 'A6.18 prefix');
  const definitionId = assertNonEmptyString(source.definitionId, 'A6.18 definitionId');
  const assetId = assertNonEmptyString(source.assetId, 'A6.18 assetId');
  const displayName = assertNonEmptyString(source.displayName, 'A6.18 displayName');
  const rect = rectValue(source.rect, 'A6.18 rect');
  const clipRect = rectValue(source.clipRect, 'A6.18 clipRect');
  assertStandardPreviewRectMinimum(rect, 'A6.18 rect');
  const profile = requireArenaV2CollectionSemanticFallbackVisualProfileCandidateV1(
    source.kind,
    definitionId,
    assetId,
  );
  const geometry = panelGeometry(profile, rect);
  const { primary, secondary, pattern } = geometry;
  const glyphText = `${profile.stableGlyphLabel} ${profile.linePattern.glyph}`;
  const accessibilityText = [
    displayName,
    profile.stableGlyphLabel,
    profile.primaryShape.semantic,
    profile.secondaryShape.semantic,
    profile.linePattern.semantic,
    '正式三维预览尚未获得生产批准，当前显示文字、形状与图案回退。',
  ].join('；');
  return Object.freeze([
    Object.freeze({
      kind: 'panel' as const,
      id: `${prefix}:fallback-pattern:1`,
      rect: primary.rect,
      clipRect,
      tone: 'strong' as const,
      cornerRadiusCssPixels: primary.cornerRadiusCssPixels,
      zIndex: 2,
    }),
    Object.freeze({
      kind: 'panel' as const,
      id: `${prefix}:fallback-pattern:2`,
      rect: secondary.rect,
      clipRect,
      tone: 'secondary' as const,
      cornerRadiusCssPixels: secondary.cornerRadiusCssPixels,
      zIndex: 2,
    }),
    Object.freeze({
      kind: 'panel' as const,
      id: `${prefix}:fallback-pattern:3`,
      rect: pattern.rect,
      clipRect,
      tone: 'muted' as const,
      cornerRadiusCssPixels: pattern.cornerRadiusCssPixels,
      zIndex: 2,
    }),
    Object.freeze({
      kind: 'text' as const,
      id: `${prefix}:fallback`,
      rect: Object.freeze({
        x: rect.x + 6,
        y: rect.y + Math.max(1, rect.height - Math.max(22, Math.round(rect.height * 0.25))),
        width: Math.max(1, rect.width - 12),
        height: Math.max(20, Math.round(rect.height * 0.22)),
      }),
      clipRect,
      text: glyphText,
      accessibilityText,
      tone: 'secondary' as const,
      role: 'value' as const,
      alignment: 'center' as const,
      maximumLines: 1,
      fixedWidthNumeric: true,
      zIndex: 3,
    }),
  ]);
}
