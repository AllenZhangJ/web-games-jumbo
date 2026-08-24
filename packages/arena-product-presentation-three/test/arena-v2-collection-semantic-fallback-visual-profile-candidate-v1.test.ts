import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_PRIMITIVE_GEOMETRY_CLOSURE_CANDIDATE_V1,
  ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1,
  createArenaV2CollectionSemanticFallbackPrimitiveGeometrySignatureCandidateV1,
  createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1,
} from '../src/arena-v2-collection-semantic-fallback-visual-profile-candidate-v1.js';

const RECT = Object.freeze({ x: 12, y: 20, width: 168, height: 168 });
const CLIP = Object.freeze({ x: 0, y: 0, width: 390, height: 600 });

describe('Arena V2 A6.18 collection semantic fallback visual profile candidate V1', () => {
  it('闭合20武器与2地图的唯一非纯颜色视觉身份', () => {
    const catalog = ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1;
    expect(catalog.profiles).toHaveLength(22);
    expect(catalog.profiles.filter(({ kind }) => kind === 'weapon')).toHaveLength(20);
    expect(catalog.profiles.filter(({ kind }) => kind === 'map')).toHaveLength(2);
    expect(new Set(catalog.profiles.map(({ profileId }) => profileId)).size).toBe(22);
    expect(new Set(catalog.profiles.map(({ definitionId }) => definitionId)).size).toBe(22);
    expect(new Set(catalog.profiles.map(({ visualSignature }) => visualSignature)).size).toBe(22);
    expect(catalog.profiles.every((profile) => (
      profile.primaryShape.semantic.length > 0
      && profile.secondaryShape.semantic.length > 0
      && profile.linePattern.semantic.length > 0
      && profile.linePattern.glyph.length > 0
      && profile.stableGlyphLabel.length > 0
      && profile.colorIsNeverSoleSignal
    ))).toBe(true);
  });

  it('同输入产生相同四primitive且不签发任何资源许可', () => {
    const glyphs: string[] = [];
    for (const profile of ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1.profiles) {
      const input = {
        schemaVersion: 1 as const,
        prefix: `formal-preview:${profile.kind}:${profile.definitionId}`,
        rect: RECT,
        clipRect: CLIP,
        kind: profile.kind,
        definitionId: profile.definitionId,
        assetId: profile.assetId,
        displayName: profile.stableGlyphLabel,
      };
      const first = createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1(input);
      const replay = createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1(input);
      expect(first).toEqual(replay);
      expect(first).toHaveLength(4);
      expect(first.filter(({ kind }) => kind === 'panel')).toHaveLength(3);
      expect(first.filter(({ kind }) => kind === 'text')).toHaveLength(1);
      glyphs.push((first.find(({ kind }) => kind === 'text') as { readonly text: string }).text);
      expect(profile.formalReady).toBe(false);
      expect(profile.assetUsePermitted).toBe(false);
      expect(profile.requestToken).toBeNull();
      expect(profile.programmaticGeometryNormalPath).toBe(false);
    }
    expect(new Set(glyphs).size).toBe(22);
    expect(ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1)
      .toMatchObject({
        maximumPrimitiveCountPerSlot: 4,
        maximumTextPrimitiveCountPerSlot: 1,
        createsThreeResources: false,
        loadsAssetBytes: false,
        createsLeaseOrMount: false,
        claimsFormalAssetApproval: false,
      });
  });

  it('让22项实际三panel几何在A6.4四种标准槽内均唯一且不越界', () => {
    const catalog = ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1;
    const closure =
      ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_PRIMITIVE_GEOMETRY_CLOSURE_CANDIDATE_V1;
    expect(closure.standardSlotCssPixels).toEqual([72, 96, 168, 240]);
    expect(closure.entries).toHaveLength(22);
    expect(closure.entries.filter(({ geometryIdentityOrdinal }) => (
      geometryIdentityOrdinal === 21 || geometryIdentityOrdinal === 22
    )).map(({ geometryIdentityOrdinal }) => geometryIdentityOrdinal)).toEqual([21, 22]);
    closure.standardSlotCssPixels.forEach((size, signatureIndex) => {
      const rect = Object.freeze({ x: 0, y: 0, width: size, height: size });
      const clipRect = Object.freeze({ ...rect });
      const signatures = catalog.profiles.map((profile) => {
        const primitives = createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1({
          schemaVersion: 1,
          prefix: `geometry:${size}:${profile.profileId}`,
          rect,
          clipRect,
          kind: profile.kind,
          definitionId: profile.definitionId,
          assetId: profile.assetId,
          displayName: profile.stableGlyphLabel,
        });
        const panels = primitives.filter((primitive) => primitive.kind === 'panel');
        expect(panels).toHaveLength(3);
        panels.forEach((panel) => {
          expect(panel.rect.x).toBeGreaterThanOrEqual(rect.x);
          expect(panel.rect.y).toBeGreaterThanOrEqual(rect.y);
          expect(panel.rect.x + panel.rect.width).toBeLessThanOrEqual(rect.x + rect.width);
          expect(panel.rect.y + panel.rect.height).toBeLessThanOrEqual(rect.y + rect.height);
          expect(panel.clipRect).toEqual(clipRect);
        });
        const signature = createArenaV2CollectionSemanticFallbackPrimitiveGeometrySignatureCandidateV1({
          schemaVersion: 1,
          kind: profile.kind,
          definitionId: profile.definitionId,
          assetId: profile.assetId,
          rect,
        });
        const actualPanelSignature = panels.map((panel, panelIndex) => {
          const role = (['primary', 'secondary', 'pattern'] as const)[panelIndex]!;
          return `${role}:${panel.rect.x - rect.x},${panel.rect.y - rect.y},${panel.rect.width},${panel.rect.height},${panel.cornerRadiusCssPixels}`;
        }).join('|');
        expect(actualPanelSignature).toBe(signature);
        const closureEntry = closure.entries.find(({ definitionId }) => (
          definitionId === profile.definitionId
        ))!;
        expect(signature).toBe(closureEntry.signatures[signatureIndex]!.signature);
        return signature;
      });
      expect(new Set(signatures).size).toBe(22);
    });
    expect(closure).toMatchObject({
      panelCountPerProfile: 3,
      textCountPerProfile: 1,
      colorParticipatesInGeometryIdentity: false,
      createsResources: false,
      loadsAssetBytes: false,
      createsLeaseOrMount: false,
      defaultSurfaceWired: false,
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
    });
    expect(catalog.profiles.every(({ reducedMotionPolicy, mutedPolicy }) => (
      reducedMotionPolicy === 'static-no-auto-rotate-no-flash'
      && mutedPolicy === 'identical-visual-information'
    ))).toBe(true);
  });

  it('在未知、资产漂移与未来字段进入RenderPlan前失败关闭', () => {
    const profile = ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1.profiles[0]!;
    const base = {
      schemaVersion: 1 as const,
      prefix: 'formal-preview:test',
      rect: RECT,
      clipRect: CLIP,
      kind: profile.kind,
      definitionId: profile.definitionId,
      assetId: profile.assetId,
      displayName: '测试',
    };
    expect(() => createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1({
      ...base,
      definitionId: 'unknown-definition',
    })).toThrow();
    expect(() => createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1({
      ...base,
      assetId: 'coherent-substitution',
    })).toThrow();
    expect(() => createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1({
      ...base,
      futureField: true,
    } as never)).toThrow();
    expect(() => createArenaV2CollectionSemanticFallbackPrimitiveGeometrySignatureCandidateV1({
      schemaVersion: 1,
      kind: profile.kind,
      definitionId: profile.definitionId,
      assetId: profile.assetId,
      rect: { x: 0, y: 0, width: 0, height: 168 },
    })).toThrow();
    expect(() => createArenaV2CollectionSemanticFallbackPrimitiveGeometrySignatureCandidateV1({
      schemaVersion: 1,
      kind: profile.kind,
      definitionId: profile.definitionId,
      assetId: profile.assetId,
      rect: { x: 0, y: 0, width: 71, height: 72 },
    })).toThrow();
    expect(() => createArenaV2CollectionSemanticFallbackPrimitiveGeometrySignatureCandidateV1({
      schemaVersion: 1,
      kind: profile.kind,
      definitionId: profile.definitionId,
      assetId: profile.assetId,
      rect: RECT,
      futureField: true,
    } as never)).toThrow();
    expect(() => createArenaV2CollectionSemanticFallbackPrimitiveGeometrySignatureCandidateV1({
      schemaVersion: 1,
      kind: profile.kind,
      definitionId: profile.definitionId,
      assetId: profile.assetId,
      rect: { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 168 },
    })).toThrow();
  });
});
