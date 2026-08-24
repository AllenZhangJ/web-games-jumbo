import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1,
  ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_KZ_ROUTE_THREE_READABILITY_CANDIDATE_V1 as CATALOG,
  ArenaV2KzRouteThreeReadabilityCandidateV1,
  resolveArenaV2KzRouteThreeShapeLanguageCandidateV1,
} from '../src/index.js';

const ROUTE = Object.freeze({
  id: 'arena-v2-kz-test-route.candidate.v2',
  mapDefinitionId: 'arena-v2-kz-test-map.candidate.v1',
  finishAnchorId: 'test-anchor-finish',
  segments: Object.freeze([
    Object.freeze({
      id: 'test-segment-platform',
      kind: 'basic-platform',
      lessonId: 'test.lesson.platform',
      remixId: 'test.remix.platform',
      survivalRole: 'safe',
      responseOptions: Object.freeze(['hold', 'jump']),
      responseWindowTicks: 10,
      hitRecovery: 'same-segment',
      respawnAnchorId: 'test-anchor-start',
      entryAnchorId: 'test-anchor-start',
      surfaceIds: Object.freeze(['test-surface-start']),
    }),
    Object.freeze({
      id: 'test-segment-gap',
      kind: 'gap',
      lessonId: 'test.lesson.gap',
      remixId: 'test.remix.gap',
      survivalRole: 'recovery',
      responseOptions: Object.freeze(['jump']),
      responseWindowTicks: 8,
      hitRecovery: 'respawn-anchor',
      respawnAnchorId: 'test-anchor-start',
      entryAnchorId: 'test-anchor-gap',
      surfaceIds: Object.freeze(['test-surface-landing', 'test-surface-finish']),
    }),
  ]),
});

function mesh(name: string, userData: Record<string, unknown>): THREE.Mesh {
  const result = new THREE.Mesh();
  result.name = name;
  result.userData = userData;
  return result;
}

function mapObject(): THREE.Group {
  const root = new THREE.Group();
  for (const segment of ROUTE.segments) {
    for (const surfaceId of segment.surfaceIds) {
      root.add(mesh(`ArenaV2TopCap:${surfaceId}`, {
        surfaceId,
        segmentId: segment.id,
        segmentKind: segment.kind,
        presentationOnly: true,
      }));
    }
    root.add(mesh(`ArenaV2SegmentEntryCue:${segment.id}`, {
      segmentId: segment.id,
      segmentKind: segment.kind,
      anchorId: segment.entryAnchorId,
      presentationOnly: true,
    }));
  }
  for (const part of ['left', 'right', 'header']) {
    root.add(mesh(`ArenaV2FinishGate:${part}`, {
      anchorId: ROUTE.finishAnchorId,
      presentationOnly: true,
    }));
  }
  return root;
}

function currentSegment(segmentIndex: number): Record<string, unknown> {
  const segment = ROUTE.segments[segmentIndex]!;
  const guidanceShape = segment.kind === 'basic-platform' ? 'stable-platform' : 'broken-gap';
  const riskShape = segment.survivalRole === 'safe' ? 'solid-safe' : 'open-recovery';
  return {
    id: segment.id,
    ordinal: segmentIndex + 1,
    segmentCount: ROUTE.segments.length,
    kind: segment.kind,
    lessonId: segment.lessonId,
    remixId: segment.remixId,
    survivalRole: segment.survivalRole,
    responseOptions: segment.responseOptions,
    responseWindowTicks: segment.responseWindowTicks,
    hitRecovery: segment.hitRecovery,
    respawnAnchorId: segment.respawnAnchorId,
    currentBranchId: null,
    pacingArc: 'two-cycle-branch-escalation',
    cycleOrdinal: segmentIndex === 0 ? 1 : 2,
    experienceBeat: segmentIndex === 0 ? 'introduce' : 'test',
    experienceIntensity: segmentIndex === 0 ? 1 : 4,
    landmarkCue: segmentIndex === 0 ? 'start-deck' : 'landing-island',
    landmarkAnchorId: segment.entryAnchorId,
    landmarkSurfaceId: segment.surfaceIds[0],
    leadingLineCue: segmentIndex === 0 ? 'forward-spine' : 'broken-axis',
    memoryHook: segmentIndex === 0 ? 'open-deck-launch' : 'first-air-commit',
    raceRead: segmentIndex === 0 ? 'establish-forward-commit' : 'confirm-jump-distance',
    survivalRead: segmentIndex === 0 ? 'open-reset-pocket' : 'single-recovery-edge',
    colorIsNeverSoleSignal: true,
    guidanceShape,
    riskShape,
  };
}

function safeAnchorCue(
  sourceEventId = 'safe-event-1',
  anchorId = ROUTE.segments[1]!.entryAnchorId,
): Record<string, unknown> {
  return anchorCue('safe-anchor-committed', sourceEventId, 1, anchorId);
}

function anchorCue(
  kind: 'respawn-scheduled' | 'respawned' | 'safe-anchor-committed',
  sourceEventId: string,
  sequence: number,
  anchorId = ROUTE.segments[1]!.entryAnchorId,
): Record<string, unknown> {
  const shape = kind === 'respawn-scheduled'
    ? 'open-reentry-arch'
    : kind === 'respawned'
      ? 'solid-reentry-arch'
      : 'small-return-anchor';
  return {
    id: `arena.cue.kz-route.${sourceEventId}.candidate.v1`,
    kind,
    sourceEventId,
    tick: 10,
    sequence,
    participantId: 'player-1',
    anchorId,
    supportSurfaceId: null,
    readyTick: null,
    progressOrdinal: 1,
    fallCount: null,
    terminal: null,
    shape,
    text: `路线Anchor强调：${kind}`,
    colorIsNeverSoleSignal: true,
  };
}

function projectionWithCurrentShape(
  guidanceShape: string,
  riskShape: string,
  cues: readonly Record<string, unknown>[],
  tick = 20,
): Record<string, unknown> {
  const value = projection({ tick, currentSegmentIndex: 1, cues });
  const route = value.route as Record<string, unknown>;
  const segmentShapes = route.segmentShapeCatalog as Record<string, unknown>[];
  segmentShapes[1] = { ...segmentShapes[1]!, guidanceShape, riskShape };
  const current = (value.local as Record<string, unknown>).currentSegment as Record<string, unknown>;
  current.guidanceShape = guidanceShape;
  current.riskShape = riskShape;
  return value;
}

function projection(
  options: {
    tick?: number;
    currentSegmentIndex?: number | null;
    cues?: readonly Record<string, unknown>[];
    routeContentHash?: string;
  } = {},
): Record<string, unknown> {
  const currentSegmentIndex = options.currentSegmentIndex === undefined
    ? 0
    : options.currentSegmentIndex;
  return {
    schemaVersion: 1,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    source: {
      matchSeed: 7,
      tick: options.tick ?? 11,
      eventSequence: 2,
      modeDefinitionId: 'arena-v2.mode.race.candidate.v1',
      mapDefinitionId: ROUTE.mapDefinitionId,
    },
    route: {
      routeDefinitionId: ROUTE.id,
      routeContentHash: options.routeContentHash ?? 'route-hash',
      mapExperienceCatalogContentHash: 'map-experience-catalog-hash',
      mapDefinitionId: ROUTE.mapDefinitionId,
      segmentCount: ROUTE.segments.length,
      segmentIds: ROUTE.segments.map(({ id }) => id),
      segmentShapeCatalog: ROUTE.segments.map((segment, index) => {
        const current = currentSegment(index);
        return {
          segmentId: segment.id,
          ordinal: index + 1,
          landmarkSurfaceId: current.landmarkSurfaceId,
          guidanceShape: current.guidanceShape,
          riskShape: current.riskShape,
          colorIsNeverSoleSignal: true,
        };
      }),
      surfaceIds: ROUTE.segments.flatMap(({ surfaceIds }) => surfaceIds),
      finishAnchorId: ROUTE.finishAnchorId,
      environmentIdentity: 'cool-linear-depth',
      environmentContentHash: 'environment-hash',
      routeAccentColor: 0x36_d8_f0,
      mapVisualAssetId: 'arena.asset.map.kz-base.authored-candidate.v1',
      mapAssetMaturity: 'authored-candidate-not-approved',
    },
    local: {
      participantId: 'player-1',
      participantStatus: 'active',
      grounded: currentSegmentIndex !== null,
      supportSurfaceId: currentSegmentIndex === null
        ? null
        : ROUTE.segments[currentSegmentIndex]!.surfaceIds[0]!,
      currentSegment: currentSegmentIndex === null ? null : currentSegment(currentSegmentIndex),
    },
    mode: { kind: 'race' },
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

describe('Arena V2 KZ route Three readability candidate V1 (not run)', () => {
  it('binds every authored route node without creating geometry or materials', () => {
    const map = mapObject();
    const owner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: map,
      projection: projection(),
    });
    expect(owner.getSnapshot()).toMatchObject({
      state: 'active',
      topCapCount: 3,
      segmentEntryCount: 2,
      shapedSegmentCount: 2,
      finishGateNodeCount: 3,
      createsGeometryOrMaterials: false,
      currentExperienceBeat: null,
      currentExperienceIntensity: null,
    });
    expect(map.getObjectByName(
      `ArenaV2SegmentEntryCue:${ROUTE.segments[0]!.id}`,
    )!.scale.x).toBeGreaterThan(1);
    expect(CATALOG).toMatchObject({
      consumesAuthoredMapNodesOnly: true,
      createsGeometryOrMaterials: false,
      mutatesCollisionOrRoute: false,
      usesAuthorityTickOnly: true,
      consumesFrozenMapExperienceOnly: true,
      currentGuidanceAndRiskShapeLanguageWired: true,
      routeWideSegmentShapeCatalogWired: true,
      anchorCueBoostUsesPostShapeScale: true,
      anchorCueBoostAggregatesPerTargetNode: true,
      normalUniformCueRelativeMaximumDelta: 0.28,
      reducedMotionUniformCueRelativeMaximumDelta: 0.12,
      formalStageConsumerWired: true,
      guidanceShapeCount: 6,
      riskShapeCount: 4,
      routeOrDangerInferenceAllowed: false,
      validationStatus: 'not-run',
    });
  });

  it('reshapes only existing route and stable-event nodes, then restores baselines', () => {
    const map = mapObject();
    const owner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: map,
      projection: projection(),
    });
    const current = map.getObjectByName(`ArenaV2SegmentEntryCue:${ROUTE.segments[0]!.id}`)!;
    const safe = map.getObjectByName(`ArenaV2SegmentEntryCue:${ROUTE.segments[1]!.id}`)!;
    owner.sync(projection({ cues: [safeAnchorCue()] }), false);
    expect(current.scale.x).toBeGreaterThan(1);
    expect(current.scale.x).toBeCloseTo(current.scale.z);
    expect(safe.scale.x).toBeGreaterThan(1.62);
    expect(owner.getSnapshot()).toMatchObject({
      currentSegmentId: ROUTE.segments[0]!.id,
      currentExperienceBeat: 'introduce',
      currentExperienceIntensity: 1,
      currentGuidanceShape: 'stable-platform',
      currentRiskShape: 'solid-safe',
      activeCueCount: 1,
      recentCueIdentityCount: 1,
    });

    owner.sync(projection({ tick: 30, currentSegmentIndex: null }), false);
    expect(current.scale.x).toBeGreaterThan(1);
    expect(safe.scale.x).toBeGreaterThan(1);
    expect(owner.getSnapshot()).toMatchObject({
      currentSegmentId: null,
      currentGuidanceShape: null,
      currentRiskShape: null,
      activeCueCount: 0,
    });
    owner.destroy();
    expect(owner.state).toBe('destroyed');
    expect(current.scale.x).toBe(1);
    expect(safe.scale.x).toBe(1);
  });

  it('projects guidance and risk into authored entry geometry without adding scene resources', () => {
    const map = mapObject();
    const entry = map.getObjectByName(`ArenaV2SegmentEntryCue:${ROUTE.segments[1]!.id}`)!;
    entry.scale.set(1.2, 0.9, 1.1);
    entry.rotation.set(0.1, -0.2, 0.05);
    const baselineScale = entry.scale.clone();
    const baselineQuaternion = entry.quaternion.clone();
    let nodeCount = 0;
    map.traverse(() => { nodeCount += 1; });
    const owner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: map,
      projection: projection(),
    });
    owner.sync(projection({ tick: 20, currentSegmentIndex: 1 }), false);
    expect(entry.scale.x / baselineScale.x).toBeGreaterThan(entry.scale.z / baselineScale.z);
    expect(entry.quaternion.equals(baselineQuaternion)).toBe(false);
    expect(owner.getSnapshot()).toMatchObject({
      currentSegmentId: ROUTE.segments[1]!.id,
      currentGuidanceShape: 'broken-gap',
      currentRiskShape: 'open-recovery',
      createsGeometryOrMaterials: false,
    });
    let nodeCountAfter = 0;
    map.traverse(() => { nodeCountAfter += 1; });
    expect(nodeCountAfter).toBe(nodeCount);

    owner.clear();
    expect(entry.scale.equals(baselineScale)).toBe(true);
    expect(entry.quaternion.equals(baselineQuaternion)).toBe(true);
  });

  it('keeps the same non-color shape ratios under reduced motion', () => {
    const normalMap = mapObject();
    const reducedMap = mapObject();
    const normal = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: normalMap,
      projection: projection(),
    });
    const reduced = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: reducedMap,
      projection: projection(),
    });
    normal.sync(projection({ tick: 20, currentSegmentIndex: 1 }), false);
    reduced.sync(projection({ tick: 20, currentSegmentIndex: 1 }), true);
    const normalEntry = normalMap.getObjectByName(
      `ArenaV2SegmentEntryCue:${ROUTE.segments[1]!.id}`,
    )!;
    const reducedEntry = reducedMap.getObjectByName(
      `ArenaV2SegmentEntryCue:${ROUTE.segments[1]!.id}`,
    )!;
    expect(normalEntry.scale.x / normalEntry.scale.z).toBeCloseTo(
      reducedEntry.scale.x / reducedEntry.scale.z,
    );
    expect(normalEntry.rotation.z).toBeCloseTo(reducedEntry.rotation.z);
  });

  it('makes all three anchor cues visible once across all 24 shapes without stacking', () => {
    const anchorKinds = [
      'respawn-scheduled',
      'respawned',
      'safe-anchor-committed',
    ] as const;
    for (const guidanceShape of ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1) {
      for (const riskShape of ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1) {
        const individualMaximums: number[] = [];
        const shape = resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({
          guidanceShape,
          riskShape,
        });
        const shapedMaximum = Math.max(
          shape.transform.scaleX,
          shape.transform.scaleY,
          shape.transform.scaleZ,
        ) * 1.12;
        for (const [index, kind] of anchorKinds.entries()) {
          const individualMap = mapObject();
          const individualOwner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
            mapObject: individualMap,
            projection: projection(),
          });
          individualOwner.sync(projectionWithCurrentShape(
            guidanceShape,
            riskShape,
            [anchorCue(kind, `individual-${kind}`, index + 1)],
          ), false);
          const individualEntry = individualMap.getObjectByName(
            `ArenaV2SegmentEntryCue:${ROUTE.segments[1]!.id}`,
          )!;
          const individualMaximum = Math.max(
            individualEntry.scale.x,
            individualEntry.scale.y,
            individualEntry.scale.z,
          );
          expect(individualMaximum).toBeCloseTo(shapedMaximum + 0.28);
          individualMaximums.push(individualMaximum);
        }

        const threeMap = mapObject();
        const reducedMap = mapObject();
        const threeOwner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
          mapObject: threeMap,
          projection: projection(),
        });
        const reducedOwner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
          mapObject: reducedMap,
          projection: projection(),
        });
        const oneCue = [anchorCue('safe-anchor-committed', 'safe-one', 1)];
        const allAnchorCues = [
          anchorCue('respawn-scheduled', 'scheduled-one', 1),
          anchorCue('respawned', 'respawned-one', 2),
          anchorCue('safe-anchor-committed', 'safe-one', 3),
        ];
        threeOwner.sync(projectionWithCurrentShape(
          guidanceShape,
          riskShape,
          allAnchorCues,
        ), false);
        reducedOwner.sync(projectionWithCurrentShape(
          guidanceShape,
          riskShape,
          oneCue,
        ), true);

        const threeEntry = threeMap.getObjectByName(
          `ArenaV2SegmentEntryCue:${ROUTE.segments[1]!.id}`,
        )!;
        const reducedEntry = reducedMap.getObjectByName(
          `ArenaV2SegmentEntryCue:${ROUTE.segments[1]!.id}`,
        )!;
        const threeMaximum = Math.max(
          threeEntry.scale.x,
          threeEntry.scale.y,
          threeEntry.scale.z,
        );
        const reducedMaximum = Math.max(
          reducedEntry.scale.x,
          reducedEntry.scale.y,
          reducedEntry.scale.z,
        );
        expect(threeMaximum).toBeCloseTo(individualMaximums[0]!);
        expect(reducedMaximum).toBeLessThan(individualMaximums[0]!);
      }
    }
  });

  it('keeps reduced-motion static and supports idempotent pause/resume/clear/destroy', () => {
    const map = mapObject();
    const owner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: map,
      projection: projection(),
    });
    owner.sync(projection({ cues: [safeAnchorCue()] }), true);
    const safe = map.getObjectByName(`ArenaV2SegmentEntryCue:${ROUTE.segments[1]!.id}`)!;
    expect(safe.scale.x).toBeGreaterThan(1.62);
    owner.pause();
    owner.pause();
    expect(() => owner.sync(projection({ tick: 12 }), true)).toThrow(/暂停owner/);
    owner.resume();
    owner.resume();
    owner.clear();
    expect(safe.scale.x).toBe(1);
    owner.destroy();
    owner.destroy();
  });

  it('fails closed before visual mutation on missing nodes, tick rollback and cue identity drift', () => {
    const incomplete = mapObject();
    incomplete.remove(incomplete.getObjectByName(`ArenaV2TopCap:${ROUTE.segments[0]!.surfaceIds[0]!}`)!);
    expect(() => new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: incomplete,
      projection: projection(),
    })).toThrow(/TopCap集合/);

    const map = mapObject();
    const owner = new ArenaV2KzRouteThreeReadabilityCandidateV1({
      mapObject: map,
      projection: projection(),
    });
    owner.sync(projection({ tick: 20, cues: [safeAnchorCue()] }), false);
    expect(() => owner.sync(projection({ tick: 19 }), false)).toThrow(/tick回退/);

    const driftedCue = { ...safeAnchorCue(), text: '伪造后的不同语义' };
    expect(() => owner.sync(projection({ tick: 21, cues: [driftedCue] }), false)).toThrow(/Cue身份漂移/);
    expect(() => owner.sync(projection({ tick: 21, routeContentHash: 'forged' }), false))
      .toThrow(/路线身份漂移/);
    const experienceDrift = projection({ tick: 21 });
    (experienceDrift.route as Record<string, unknown>).mapExperienceCatalogContentHash = 'forged';
    expect(() => owner.sync(experienceDrift, false)).toThrow(/路线身份漂移/);

    const unknownGuidance = projection({ tick: 21 });
    const unknownCurrent = (unknownGuidance.local as Record<string, unknown>)
      .currentSegment as Record<string, unknown>;
    unknownCurrent.guidanceShape = 'future-guidance';
    const current = map.getObjectByName(`ArenaV2SegmentEntryCue:${ROUTE.segments[0]!.id}`)!;
    const scaleBeforeReject = current.scale.clone();
    const quaternionBeforeReject = current.quaternion.clone();
    expect(() => owner.sync(unknownGuidance, false)).toThrow(/未知guidanceShape/);
    expect(current.scale.equals(scaleBeforeReject)).toBe(true);
    expect(current.quaternion.equals(quaternionBeforeReject)).toBe(true);

    const mismatchedLandmark = projection({ tick: 22, currentSegmentIndex: 1 });
    const mismatchedCurrent = (mismatchedLandmark.local as Record<string, unknown>)
      .currentSegment as Record<string, unknown>;
    mismatchedCurrent.landmarkSurfaceId = ROUTE.segments[0]!.surfaceIds[0]!;
    expect(() => owner.sync(mismatchedLandmark, false)).toThrow(/与路线形状目录漂移/);

    const coherentShapeDrift = projection({ tick: 23, currentSegmentIndex: 1 });
    const driftedCatalog = (coherentShapeDrift.route as Record<string, unknown>)
      .segmentShapeCatalog as Record<string, unknown>[];
    driftedCatalog[1] = { ...driftedCatalog[1]!, riskShape: 'solid-safe' };
    expect(() => owner.sync(coherentShapeDrift, false)).toThrow(/与路线形状目录漂移/);

    const partialCatalog = projection({ tick: 23 });
    ((partialCatalog.route as Record<string, unknown>)
      .segmentShapeCatalog as Record<string, unknown>[]).pop();
    expect(() => owner.sync(partialCatalog, false)).toThrow(/必须逐段闭合/);

    const futureCatalogField = projection({ tick: 23 });
    const futureCatalog = (futureCatalogField.route as Record<string, unknown>)
      .segmentShapeCatalog as Record<string, unknown>[];
    futureCatalog[0] = { ...futureCatalog[0]!, inferredRoute: true };
    expect(() => owner.sync(futureCatalogField, false)).toThrow(/不支持字段/);
  });
});
