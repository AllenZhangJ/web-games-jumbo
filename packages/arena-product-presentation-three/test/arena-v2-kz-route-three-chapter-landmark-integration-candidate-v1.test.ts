import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1,
  type ArenaV2KzRouteChapterLandmarkMapCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_KZ_ROUTE_THREE_READABILITY_CANDIDATE_V1 as READABILITY_CATALOG,
  ArenaV2KzRouteThreeReadabilityCandidateV1,
} from '../src/index.js';

const ROUTES = ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1;

function surfaceId(segmentId: string): string {
  return `${segmentId}.static-test-surface`;
}

function anchorId(segmentId: string): string {
  return `${segmentId}.static-test-entry-anchor`;
}

function finishAnchorId(route: ArenaV2KzRouteChapterLandmarkMapCandidateV1): string {
  return `${route.mapDefinitionId}.static-test-finish-anchor`;
}

function mesh(name: string, userData: Record<string, unknown>): THREE.Mesh {
  const result = new THREE.Mesh();
  result.name = name;
  result.userData = userData;
  return result;
}

function mapObject(route: ArenaV2KzRouteChapterLandmarkMapCandidateV1): THREE.Group {
  const root = new THREE.Group();
  for (const segmentId of route.segmentIds) {
    root.add(mesh(`ArenaV2TopCap:${surfaceId(segmentId)}`, {
      surfaceId: surfaceId(segmentId),
      segmentId,
      presentationOnly: true,
    }));
    root.add(mesh(`ArenaV2SegmentEntryCue:${segmentId}`, {
      segmentId,
      anchorId: anchorId(segmentId),
      presentationOnly: true,
    }));
  }
  for (const part of ['left', 'right', 'header']) {
    root.add(mesh(`ArenaV2FinishGate:${part}`, {
      anchorId: finishAnchorId(route),
      presentationOnly: true,
    }));
  }
  return root;
}

function projection(
  route: ArenaV2KzRouteChapterLandmarkMapCandidateV1,
  options: {
    tick?: number;
    currentSegmentOrdinal?: number | null;
    cues?: readonly Record<string, unknown>[];
    modeKind?: 'race' | 'survival';
  } = {},
): Record<string, unknown> {
  const currentOrdinal = options.currentSegmentOrdinal ?? null;
  const currentSegmentId = currentOrdinal === null ? null : route.segmentIds[currentOrdinal - 1]!;
  const currentChapter = currentSegmentId === null ? null : route.chapters.find(({ segmentIds }) => (
    segmentIds.includes(currentSegmentId)
  ))!;
  const currentIndexInChapter = currentSegmentId === null || currentChapter === null
    ? -1
    : currentChapter.segmentIds.indexOf(currentSegmentId);
  return {
    schemaVersion: 1,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    source: {
      matchSeed: 7,
      tick: options.tick ?? 20,
      eventSequence: options.cues?.length ?? 0,
      modeDefinitionId: 'arena-v2.mode.race.candidate.v1',
      mapDefinitionId: route.mapDefinitionId,
    },
    route: {
      routeDefinitionId: route.routeDefinitionId,
      routeContentHash: route.routeContentHash,
      mapExperienceCatalogContentHash: route.mapExperienceCatalogContentHash,
      mapDefinitionId: route.mapDefinitionId,
      segmentCount: route.segmentIds.length,
      segmentIds: [...route.segmentIds],
      segmentShapeCatalog: route.segmentIds.map((segmentId, index) => ({
        segmentId,
        ordinal: index + 1,
        landmarkSurfaceId: surfaceId(segmentId),
        guidanceShape: 'stable-platform',
        riskShape: 'solid-safe',
        colorIsNeverSoleSignal: true,
      })),
      surfaceIds: route.segmentIds.map(surfaceId),
      finishAnchorId: finishAnchorId(route),
      environmentIdentity: route.segmentIds.length === 12
        ? 'cool-linear-depth'
        : 'warm-cardinal-turns',
      environmentContentHash: `environment-${route.mapDefinitionId}`,
      routeAccentColor: 0x36_d8_f0,
      mapVisualAssetId: `arena.asset.${route.mapDefinitionId}`,
      mapAssetMaturity: 'authored-candidate-not-approved',
    },
    local: {
      participantId: 'player-1',
      participantStatus: 'active',
      grounded: currentSegmentId !== null,
      supportSurfaceId: currentSegmentId === null ? null : surfaceId(currentSegmentId),
      currentSegment: currentSegmentId === null || currentChapter === null ? null : {
        id: currentSegmentId,
        ordinal: currentOrdinal,
        segmentCount: route.segmentIds.length,
        kind: 'basic-platform',
        lessonId: `lesson-${currentSegmentId}`,
        remixId: `remix-${currentSegmentId}`,
        survivalRole: 'safe',
        responseOptions: ['hold', 'jump'],
        responseWindowTicks: 10,
        hitRecovery: 'same-segment',
        respawnAnchorId: anchorId(currentSegmentId),
        currentBranchId: null,
        pacingArc: route.segmentIds.length === 12
          ? 'two-cycle-branch-escalation'
          : 'cardinal-switchback-sawtooth',
        cycleOrdinal: currentOrdinal! <= route.segmentIds.length / 2 ? 1 : 2,
        experienceBeat: currentChapter.experienceBeatSequence[currentIndexInChapter]!,
        experienceIntensity: 2,
        landmarkCue: `landmark-${currentSegmentId}`,
        landmarkAnchorId: anchorId(currentSegmentId),
        landmarkSurfaceId: surfaceId(currentSegmentId),
        leadingLineCue: `line-${currentSegmentId}`,
        memoryHook: `memory-${currentSegmentId}`,
        raceRead: `race-${currentSegmentId}`,
        survivalRead: `survival-${currentSegmentId}`,
        colorIsNeverSoleSignal: true,
        guidanceShape: 'stable-platform',
        riskShape: 'solid-safe',
      },
    },
    mode: { kind: options.modeKind ?? 'race' },
    cues: options.cues ?? [],
    governance: {
      ownsRuleOrMatchAuthority: false,
      writesAuthorityState: false,
      infersCurrentSegmentFromPosition: false,
      currentSegmentUsesExactSupportSurfaceOnly: true,
      infersAnchorOrFinish: false,
      cuesUseStableEventsOnly: true,
      usesWallClockOrRandom: false,
      importsThreeOrDom: false,
      programmaticAssetFallbackAllowed: false,
    },
  };
}

function entry(root: THREE.Object3D, segmentId: string): THREE.Object3D {
  return root.getObjectByName(`ArenaV2SegmentEntryCue:${segmentId}`)!;
}

function relativeSignature(node: THREE.Object3D): string {
  return JSON.stringify({
    scale: [node.scale.x, node.scale.y, node.scale.z],
    quaternion: [node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w],
  });
}

function maximumScale(node: THREE.Object3D): number {
  return Math.max(node.scale.x, node.scale.y, node.scale.z);
}

function safeAnchorCue(
  route: ArenaV2KzRouteChapterLandmarkMapCandidateV1,
  segmentOrdinal: number,
): Record<string, unknown> {
  const segmentId = route.segmentIds[segmentOrdinal - 1]!;
  return {
    id: `chapter-safe-${segmentOrdinal}`,
    kind: 'safe-anchor-committed',
    sourceEventId: `chapter-safe-event-${segmentOrdinal}`,
    tick: 20,
    sequence: 0,
    participantId: 'player-1',
    anchorId: anchorId(segmentId),
    supportSurfaceId: null,
    readyTick: null,
    progressOrdinal: segmentOrdinal,
    fallCount: null,
    terminal: null,
    shape: 'small-return-anchor',
    text: '已确认安全锚点',
    colorIsNeverSoleSignal: true,
  };
}

describe('Arena V2 KZ route Three chapter landmark integration candidate V1 (not run)', () => {
  it('composes four stable chapters over the authored 12/8 entry cues with no scene additions', () => {
    for (const route of ROUTES) {
      const map = mapObject(route);
      let nodeCount = 0;
      map.traverse(() => { nodeCount += 1; });
      const positions = new Map(route.segmentIds.map((segmentId) => (
        [segmentId, entry(map, segmentId).position.clone()]
      )));
      const owner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
        mapObject: map,
        projection: projection(route),
      });
      const chapterSignatures = route.chapters.map((chapter) => (
        relativeSignature(entry(map, chapter.segmentIds[1]!))
      ));
      expect(new Set(chapterSignatures).size).toBe(4);
      expect(owner.getSnapshot()).toMatchObject({
        chapterCatalogContentHash: route.contentHash,
        chapterCount: 4,
        chapterShapedSegmentCount: route.segmentIds.length,
        createsGeometryOrMaterials: false,
      });
      for (const chapter of route.chapters) {
        const boundary = entry(map, chapter.chapterBoundarySegmentId);
        const member = entry(map, chapter.segmentIds[1]!);
        expect(maximumScale(boundary)).toBeGreaterThan(maximumScale(member));
        if (chapter.segmentIds.length === 3) {
          expect(relativeSignature(entry(map, chapter.segmentIds[2]!)))
            .toBe(relativeSignature(member));
        }
      }
      let nodeCountAfter = 0;
      map.traverse(() => { nodeCountAfter += 1; });
      expect(nodeCountAfter).toBe(nodeCount);
      for (const segmentId of route.segmentIds) {
        expect(entry(map, segmentId).position.equals(positions.get(segmentId)!)).toBe(true);
      }
      owner.destroy();
    }
    expect(READABILITY_CATALOG).toMatchObject({
      routeWideChapterLandmarkCatalogWired: true,
      chapterLandmarkUsesExistingSegmentEntryCueOnly: true,
      chapterLandmarkCreatesGeometryMaterialsTexturesOrDrawCalls: false,
      chapterBoundaryUniformMultiplier: 1.04,
      visualCompositionOrder: [
        'authored-baseline',
        'segment-shape',
        'chapter-landmark',
        'current-segment',
        'safe-anchor-or-respawn-cue',
      ],
      validationStatus: 'not-run',
    });
  });

  it('recomputes baseline, chapter, current segment and one deduplicated anchor cue in order', () => {
    const route = ROUTES[0]!;
    const baselineMap = mapObject(route);
    const currentMap = mapObject(route);
    const cueMap = mapObject(route);
    const baselineOwner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: baselineMap,
      projection: projection(route),
    });
    const currentOwner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: currentMap,
      projection: projection(route),
    });
    const cueOwner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: cueMap,
      projection: projection(route),
    });
    const ordinal = 4;
    baselineOwner.sync(projection(route, { tick: 20 }), false);
    currentOwner.sync(projection(route, { tick: 20, currentSegmentOrdinal: ordinal }), false);
    const cue = safeAnchorCue(route, ordinal);
    cueOwner.sync(projection(route, {
      tick: 20,
      currentSegmentOrdinal: ordinal,
      cues: [cue, { ...cue }],
    }), false);
    const segmentId = route.segmentIds[ordinal - 1]!;
    expect(maximumScale(entry(currentMap, segmentId)))
      .toBeGreaterThan(maximumScale(entry(baselineMap, segmentId)));
    expect(maximumScale(entry(cueMap, segmentId)))
      .toBeGreaterThan(maximumScale(entry(currentMap, segmentId)));
    expect(cueOwner.getSnapshot()).toMatchObject({
      currentSegmentId: segmentId,
      currentChapterOrdinal: 2,
      activeCueCount: 1,
      recentCueIdentityCount: 1,
    });
  });

  it('keeps chapter geometry under reduced motion and restores authored transforms', () => {
    const route = ROUTES[1]!;
    const normalMap = mapObject(route);
    const reducedMap = mapObject(route);
    const target = entry(normalMap, route.segmentIds[4]!);
    const reducedTarget = entry(reducedMap, route.segmentIds[4]!);
    target.scale.set(1.2, 0.9, 1.1);
    target.rotation.set(0.08, -0.15, 0.04);
    reducedTarget.scale.copy(target.scale);
    reducedTarget.quaternion.copy(target.quaternion);
    const authoredScale = target.scale.clone();
    const authoredQuaternion = target.quaternion.clone();
    const normal = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: normalMap,
      projection: projection(route),
    });
    const reduced = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: reducedMap,
      projection: projection(route),
    });
    normal.sync(projection(route, { tick: 21 }), false);
    reduced.sync(projection(route, { tick: 21, modeKind: 'survival' }), true);
    expect(target.scale.x / target.scale.z).toBeCloseTo(
      reducedTarget.scale.x / reducedTarget.scale.z,
    );
    expect(target.quaternion.equals(authoredQuaternion)).toBe(false);
    normal.clear();
    expect(target.scale.equals(authoredScale)).toBe(true);
    expect(target.quaternion.equals(authoredQuaternion)).toBe(true);
    normal.destroy();
    reduced.destroy();
  });

  it('rejects formal route identity drift before mutating authored nodes', () => {
    const route = ROUTES[0]!;
    const map = mapObject(route);
    const target = entry(map, route.segmentIds[0]!);
    const baselineScale = target.scale.clone();
    const drift = projection(route);
    (drift.route as Record<string, unknown>).routeContentHash = 'forged-route-content-hash';
    expect(() => new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: map,
      projection: drift,
    })).toThrow(/来源Definition或体验目录身份漂移/);
    expect(target.scale.equals(baselineScale)).toBe(true);
  });
});
