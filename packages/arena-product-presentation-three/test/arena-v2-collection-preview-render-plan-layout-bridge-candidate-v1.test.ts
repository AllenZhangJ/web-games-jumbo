import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  addArenaV2InformationSelectionToRenderPlanCandidateV1,
  createArenaV2UiDomSurfaceModelV1,
  paintArenaV2UiRenderPlanV1,
  type ArenaV2InformationScreenPipelineResultV1,
  type ArenaV2InformationSelectionProjectionCandidateV1,
  type ArenaV2UiCanvasPaintPortV1,
  type ArenaV2UiRectV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';
import { projectArenaV2MapRouteResearchMilestoneV1 } from '@number-strategy-jump/arena-product-progression';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  ArenaV2CollectionFormalAssetReuseBindingCandidateV1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
  type ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import type {
  ArenaV2CollectionFourScreenIdV1,
  ArenaV2CollectionFourScreenReadSnapshotV1,
} from '../src/arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import {
  ARENA_V2_COLLECTION_PREVIEW_RENDER_PLAN_LAYOUT_BRIDGE_CANDIDATE_V1,
  ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1,
} from '../src/arena-v2-collection-preview-render-plan-layout-bridge-candidate-v1.js';
import type {
  ArenaV2A6WeaponPreviewViewportV1,
} from '../src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';

const WEAPON_BINDINGS = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
  .filter(({ kind }) => kind === 'weapon');
const MAP_BINDINGS = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
  .filter(({ kind }) => kind === 'map');

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function viewport(id: '390x844' | '1440x900'): ArenaV2A6WeaponPreviewViewportV1 {
  return id === '390x844'
    ? Object.freeze({ viewportId: id, widthCssPixels: 390, heightCssPixels: 844 })
    : Object.freeze({ viewportId: id, widthCssPixels: 1440, heightCssPixels: 900 });
}

function collectionContent() {
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons: WEAPON_BINDINGS.map(({ definitionId }, index) => ({
      weaponDefinitionId: definitionId,
      collectionOrder: index + 1,
      displayName: `A6.15 武器 ${index + 1}`,
      learningFocus: `武器学习重点 ${index + 1}`,
      coreVerb: 'control-space',
    })),
    maps: MAP_BINDINGS.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.15 地图 ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.15.map.${mapIndex + 1}.segment.${segmentIndex + 1}`,
        ordinal: segmentIndex + 1,
        displayName: `地图${mapIndex + 1}段${segmentIndex + 1}`,
        learningFocus: 'route-control',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a615-content-source',
  };
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function bindingSnapshot(
  epochId: string,
  tick: number,
  missingAssetIds: readonly string[] = [],
): ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 {
  const content = collectionContent();
  const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({ epochId });
  const snapshot = owner.consume({
    schemaVersion: 1,
    collectionProgressInput: {
      schemaVersion: 1,
      epochId,
      tick,
      locale: 'zh-CN',
      sourceState: 'ready',
      profileIdentity: {
        profileSchemaVersion: 1,
        profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
        profileDefinitionContentVersion: 5,
        profileId: 'a6.15.profile.local',
        profileRevision: 7,
      },
      collectionContent: content,
      progressFacts: {
        schemaVersion: 1,
        weapons: content.weapons.map(({ weaponDefinitionId }) => ({
          weaponDefinitionId,
          collected: false,
          collectionEvidenceCount: 0,
          collectionEvidenceTarget: 120,
          completedContextCount: 0,
          mastered: false,
        })),
        maps: content.maps.map(({ mapDefinitionId, segments }) => ({
          mapDefinitionId,
          collected: false,
          completedSegmentCount: 0,
          totalSegmentCount: segments.length,
          routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
            evidenceCount: 0,
            completedSegmentCount: 0,
            segmentCount: segments.length,
            evidencePerSegmentTarget: 1,
          }),
        })),
        weaponJourney: {
          currentMainResearch: 0,
          targetMainResearch: 2_400,
          remainingMainResearch: 2_400,
          collectedWeaponCount: 0,
          weaponCount: 20,
          averageMatchMinutesAssumption: 5,
          estimatedRemainingMinutes: 12_000,
          estimateKind: 'capacity-hypothesis-not-player-promise',
        },
      },
      nextGoalIdentity: null,
      diagnosticCode: null,
      observedProfileSchemaVersion: 1,
      reducedMotion: false,
      muted: false,
      decorativeAssetState: 'ready',
    },
    formalAssetCatalog: clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1),
    availability: clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1(missingAssetIds)),
  });
  owner.destroy();
  return snapshot;
}

function currentSlots(
  binding: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
  screenId: ArenaV2CollectionFourScreenIdV1,
) {
  const kind = screenId.startsWith('weapon') ? 'weapon' : 'map';
  const detail = screenId.endsWith('-detail');
  return binding.slots
    .filter((slot) => slot.kind === kind)
    .filter((_, index) => !detail || index === 0)
    .map((slot) => {
      const previewStrategy = slot.previewStrategies.find(
        (strategy) => strategy.screenId === screenId,
      )!;
      const { previewStrategies: _previewStrategies, ...base } = slot;
      void _previewStrategies;
      return Object.freeze({ ...base, previewStrategy });
    });
}

function progressItem(slot: ReturnType<typeof currentSlots>[number]) {
  const collectionResearchCount = slot.kind === 'weapon' && slot.ordinal === 1 ? 30 : 0;
  const routeResearch = slot.kind === 'map'
    ? projectArenaV2MapRouteResearchMilestoneV1({
      evidenceCount: slot.ordinal === 1 ? 3 : 0,
      completedSegmentCount: slot.ordinal === 1 ? 3 : 0,
      segmentCount: 10,
      evidencePerSegmentTarget: 1,
    })
    : null;
  return {
    kind: slot.kind,
    definitionId: slot.definitionId,
    ordinal: slot.ordinal,
    displayName: slot.displayName,
    collected: false,
    collectionResearch: slot.kind === 'weapon' ? {
      current: collectionResearchCount,
      target: 120,
      complete: false,
      labelText: '主研究',
      stage: collectionResearchCount === 30 ? '熟悉' : '初识',
      milestones: [30, 60, 90, 120].map((threshold) => ({
        threshold,
        reached: collectionResearchCount >= threshold,
      })),
      nextMilestone: {
        threshold: collectionResearchCount === 30 ? 60 : 30,
        remainingMainResearch: 30,
        valueText: `下一里程碑 ${collectionResearchCount === 30 ? 60 : 30}/120，还需30次主研究`,
        accessibilityText: `下一主研究里程碑为${collectionResearchCount === 30 ? 60 : 30}/120，还需30次主研究。`,
      },
      valueText: `${collectionResearchCount}/120`,
      accessibilityText: `主研究进度${collectionResearchCount}/120，当前阶段${
        collectionResearchCount === 30 ? '熟悉' : '初识'
      }。`,
      fixedWidthNumeric: true,
      numericSlotCharacterColumns: 7,
    } : null,
    routeResearch,
    mastery: {
      completed: 0,
      total: slot.kind === 'weapon' ? 5 : 10,
      complete: false,
      valueText: slot.kind === 'weapon' ? '0/5' : '0/10',
      accessibilityText: '尚未开始',
      fixedWidthNumeric: true,
      numericSlotCharacterColumns: 5,
    },
    isCurrentUniqueGoal: false,
    semantic: {},
    action: {
      intentId: `arena.v2.selection.${slot.kind}.${encodeURIComponent(slot.definitionId)}`,
      screenId: slot.kind === 'weapon' ? 'weapon-index' : 'map-index',
      targetDefinitionId: slot.definitionId,
      labelText: slot.displayName,
      accessibilityText: `查看${slot.displayName}`,
      enabled: true,
      minimumTouchTargetCssPixels: 48,
      mutatesProfileOrRules: false,
    },
  };
}

function readSnapshot(
  screenId: ArenaV2CollectionFourScreenIdV1,
  tick: number,
  options: Readonly<{ epochId?: string; missingFirstWeapon?: boolean }> = {},
): ArenaV2CollectionFourScreenReadSnapshotV1 {
  const epochId = options.epochId ?? 'epoch-a6.15';
  const missing = options.missingFirstWeapon ? [WEAPON_BINDINGS[0]!.assetId] : [];
  const binding = bindingSnapshot(epochId, tick, missing);
  const slots = currentSlots(binding, screenId);
  const index = screenId.endsWith('-index');
  const detail = index ? null : {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    validationStatus: 'not-run',
    epochId,
    tick,
    locale: 'zh-CN',
    sourceState: 'ready',
    screenId,
    kind: slots[0]!.kind,
    targetDefinitionId: slots[0]!.definitionId,
    stateMessage: null,
    profileIdentity: {
      profileSchemaVersion: 1,
      profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
      profileDefinitionContentVersion: 5,
      profileId: 'a6.15.profile.local',
      profileRevision: 7,
    },
    contentIdentity: {
      collectionSourceContentHash: 'a615-content-source',
      collectionContentHash: collectionContent().contentHash,
      p5DetailContentHash: 'a615-detail',
    },
    p5DetailFields: [],
    summary: {
      displayName: slots[0]!.displayName,
      collected: false,
      completed: 0,
      total: slots[0]!.kind === 'weapon' ? 5 : 10,
      valueText: '0/5',
      accessibilityText: '尚未开始',
      collectionEvidenceCurrent: slots[0]!.kind === 'weapon' ? 30 : null,
      collectionEvidenceTarget: slots[0]!.kind === 'weapon' ? 120 : null,
      mainResearchStage: slots[0]!.kind === 'weapon' ? '熟悉' : null,
      nextMainResearchMilestoneText: slots[0]!.kind === 'weapon'
        ? '下一里程碑 60/120，还需30次主研究'
        : null,
      nextMainResearchMilestoneAccessibilityText: slots[0]!.kind === 'weapon'
        ? '下一主研究里程碑为60/120，还需要30次主研究。'
        : null,
      routeResearch: slots[0]!.kind === 'map'
        ? projectArenaV2MapRouteResearchMilestoneV1({
          evidenceCount: 3,
          completedSegmentCount: 3,
          segmentCount: 10,
          evidencePerSegmentTarget: 1,
        })
        : null,
      nextMapRouteResearchMilestoneText: slots[0]!.kind === 'map'
        ? '下一里程碑50%，还需2次有效路线练习'
        : null,
      nextMapRouteResearchMilestoneAccessibilityText: slots[0]!.kind === 'map'
        ? '下一地图路线研究里程碑为50%，还需要2次有效路线练习。'
        : null,
      fixedWidthNumeric: true,
      numericSlotCharacterColumns: 5,
      isCurrentUniqueGoal: false,
    },
    rows: [],
    currentGoalMarker: null,
    selectionAction: {},
    layouts: [],
    accessibility: {},
    fallback: {},
  };
  const indexPage = index ? {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    validationStatus: 'not-run',
    epochId,
    tick,
    locale: 'zh-CN',
    sourceState: 'ready',
    profileIdentity: {
      profileSchemaVersion: 1,
      profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
      profileDefinitionContentVersion: 5,
      profileId: 'a6.15.profile.local',
      profileRevision: 7,
    },
    weaponIndex: {
      screenId: 'weapon-index',
      state: 'ready',
      directoryCount: 20,
      itemCount: binding.slots.filter(({ kind }) => kind === 'weapon').length,
      stateMessage: null,
      weaponJourney: {
        currentMainResearch: 0,
        targetMainResearch: 2_400,
        remainingMainResearch: 2_400,
        collectedWeaponCount: 0,
        weaponCount: 20,
        averageMatchMinutesAssumption: 5,
        estimatedRemainingMinutes: 12_000,
        estimateKind: 'capacity-hypothesis-not-player-promise',
        valueText: '武器收藏 0/20 · 主研究 0/2400 · 容量估算约剩200小时',
        accessibilityText: '武器收藏旅程设计估算。',
        fixedWidthNumeric: true,
      },
      items: binding.slots.filter(({ kind }) => kind === 'weapon').map(progressItem),
      addsPrimaryAction: false,
      nestedCards: false,
    },
    mapIndex: {
      screenId: 'map-index',
      state: 'ready',
      directoryCount: 2,
      itemCount: binding.slots.filter(({ kind }) => kind === 'map').length,
      stateMessage: null,
      weaponJourney: null,
      items: binding.slots.filter(({ kind }) => kind === 'map').map(progressItem),
      addsPrimaryAction: false,
      nestedCards: false,
    },
  } : null;
  return Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    validationStatus: 'not-run',
    epochId,
    tick,
    screenId,
    sourceState: 'ready',
    indexPage,
    detailPage: detail,
    previewSlots: Object.freeze(slots),
    formalAssetLeaseBinding: binding,
    formalAssetGovernance: Object.freeze({
      contentIdentity: binding.contentIdentity,
      budget: binding.budget,
      layouts: binding.layouts,
      accessibility: binding.accessibility,
      governance: binding.governance,
      loadsResourcesHere: false,
      ownsThreeResourcesHere: false,
    }),
  }) as unknown as ArenaV2CollectionFourScreenReadSnapshotV1;
}

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  return Object.freeze({ x, y, width, height });
}

function canvasPort(): ArenaV2UiCanvasPaintPortV1 {
  return {
    fillStyle: null,
    strokeStyle: null,
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    closePath: () => {},
    rect: () => {},
    clip: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    fillText: () => {},
    measureText: (value) => ({ width: Array.from(value).length * 8 }),
  };
}

function basePlan(
  screenId: ArenaV2CollectionFourScreenIdV1,
  viewportId: '390x844' | '1440x900',
  revision = 1,
): ArenaV2UiRenderPlanV1 {
  const narrow = viewportId === '390x844';
  const view = viewport(viewportId);
  const clip = narrow ? rect(16, 16, 358, 636) : rect(24, 24, 1392, 680);
  const question = narrow ? rect(16, 16, 358, 96) : rect(24, 24, 1392, 112);
  const first = narrow ? rect(16, 124, 358, 72) : rect(24, 152, 1392, 96);
  const primary = narrow ? rect(16, 672, 358, 56) : rect(24, 728, 1392, 56);
  const navigation = narrow ? rect(0, 780, 97.5, 64) : rect(0, 836, 360, 64);
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [
    Object.freeze({
      kind: 'panel', id: 'page-background', rect: rect(0, 0, view.widthCssPixels, view.heightCssPixels),
      clipRect: null, tone: 'background', cornerRadiusCssPixels: 16, zIndex: 0,
    }),
    Object.freeze({
      kind: 'text', id: 'page-question', rect: question, clipRect: clip,
      text: '这一页回答什么？', accessibilityText: '这一页回答什么？', tone: 'strong',
      role: 'question', alignment: 'left', maximumLines: 3, fixedWidthNumeric: false, zIndex: 2,
    }),
    Object.freeze({
      kind: 'panel', id: 'first:summary:panel', rect: first, clipRect: clip,
      tone: 'surface', cornerRadiusCssPixels: 16, zIndex: 1,
    }),
    Object.freeze({
      kind: 'text', id: 'first:summary:label', rect: rect(first.x + 12, first.y + 10, first.width - 24, 20),
      clipRect: clip, text: '收藏摘要', accessibilityText: '收藏摘要', tone: 'secondary',
      role: 'label', alignment: 'left', maximumLines: 1, fixedWidthNumeric: false, zIndex: 2,
    }),
    Object.freeze({
      kind: 'text', id: 'first:summary:value', rect: rect(first.x + 12, first.y + 32, first.width - 24, first.height - 42),
      clipRect: clip, text: '只读事实', accessibilityText: '只读事实', tone: 'strong',
      role: 'value', alignment: 'left', maximumLines: 2, fixedWidthNumeric: false, zIndex: 2,
    }),
    Object.freeze({
      kind: 'action', id: 'primary-action', rect: primary, clipRect: null,
      intentId: 'open-quick-match', label: '快速开局', accessibilityText: '快速开局',
      enabled: true, disabledReason: null, minimumTouchTargetCssPixels: 48,
      tone: 'primary', zIndex: 4,
    }),
    Object.freeze({
      kind: 'panel', id: 'navigation:weapons:panel', rect: navigation, clipRect: null,
      tone: screenId.startsWith('weapon') ? 'secondary' : 'background',
      cornerRadiusCssPixels: 16, zIndex: 3,
    }),
    Object.freeze({
      kind: 'text', id: 'navigation:weapons:label', rect: navigation, clipRect: null,
      text: '武器', accessibilityText: '武器', tone: 'strong', role: 'navigation',
      alignment: 'center', maximumLines: 1, fixedWidthNumeric: false, zIndex: 4,
    }),
    Object.freeze({
      kind: 'action', id: 'navigation:weapons:action', rect: navigation, clipRect: null,
      intentId: 'arena.v2.bottom-navigation.weapons', label: '武器', accessibilityText: '打开武器',
      enabled: !screenId.startsWith('weapon'), disabledReason: screenId.startsWith('weapon') ? '当前入口' : null,
      minimumTouchTargetCssPixels: 48, tone: 'transparent', zIndex: 5,
    }),
  ];
  const contentHeight = first.y + first.height - clip.y;
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'information',
    identity: screenId,
    revision,
    status: 'layout-candidate',
    productionReady: false,
    primitives: Object.freeze(primitives),
    scrollRegion: Object.freeze({
      viewport: clip,
      contentHeight,
      verticalScrollRequired: contentHeight > clip.height,
    }),
    liveAnnouncements: Object.freeze([`打开${screenId}`]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([]),
  });
}

function pipelineResult(
  screenId: ArenaV2CollectionFourScreenIdV1,
  viewportId: '390x844' | '1440x900',
  revision = 1,
): ArenaV2InformationScreenPipelineResultV1 {
  const renderPlan = basePlan(screenId, viewportId, revision);
  return Object.freeze({
    schemaVersion: 1,
    status: 'surface-pipeline-candidate',
    productionReady: false,
    viewModel: { schemaVersion: 1, screenId, revision },
    renderModel: { schemaVersion: 1, screenId, revision },
    layout: {
      schemaVersion: 1,
      screenId,
      contentViewport: renderPlan.scrollRegion!.viewport,
      contentHeight: renderPlan.scrollRegion!.contentHeight,
    },
    renderPlan,
  }) as unknown as ArenaV2InformationScreenPipelineResultV1;
}

function projection(
  snapshot: ArenaV2CollectionFourScreenReadSnapshotV1,
): ArenaV2InformationSelectionProjectionCandidateV1 | null {
  if (!snapshot.screenId.endsWith('-index')) return null;
  const kind = snapshot.screenId.startsWith('weapon') ? 'weapon' as const : 'map' as const;
  return Object.freeze({
    kind,
    selectedId: snapshot.previewSlots[0]!.definitionId,
    items: Object.freeze(snapshot.previewSlots.map((slot) => Object.freeze({
      id: slot.definitionId,
      label: slot.displayName,
      description: `${slot.displayName}的只读收藏说明`,
    }))),
  });
}

function composeInput(
  screenId: ArenaV2CollectionFourScreenIdV1,
  viewportId: '390x844' | '1440x900',
  tick: number,
  options: Readonly<{
    epochId?: string;
    scrollOffsetCssPixels?: number;
    revision?: number;
    missingFirstWeapon?: boolean;
  }> = {},
) {
  const epochId = options.epochId ?? 'epoch-a6.15';
  const read = readSnapshot(screenId, tick, {
    epochId,
    missingFirstWeapon: options.missingFirstWeapon,
  });
  const pipeline = pipelineResult(screenId, viewportId, options.revision ?? 1);
  const selection = projection(read);
  const sourceRenderPlan = selection === null
    ? pipeline.renderPlan
    : addArenaV2InformationSelectionToRenderPlanCandidateV1(pipeline.renderPlan, selection);
  return {
    schemaVersion: 1,
    epochId,
    tick,
    viewport: viewport(viewportId),
    scrollOffsetCssPixels: options.scrollOffsetCssPixels ?? 0,
    scrollSourceRenderPlanIdentity: sourceRenderPlan.identity,
    scrollSourceRenderPlanRevision: sourceRenderPlan.revision,
    pipelineResult: pipeline,
    selectionProjection: selection,
    sourceRenderPlan,
    readSnapshot: read,
  };
}

describe('Arena V2 A6.15 collection preview RenderPlan layout bridge candidate V1', () => {
  it('composes all four pages for both fixed viewports without adding actions', () => {
    for (const viewportId of ['390x844', '1440x900'] as const) {
      for (const screenId of ['weapon-index', 'map-index', 'weapon-detail', 'map-detail'] as const) {
        const epochId = `epoch-${viewportId}-${screenId}`;
        const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
          schemaVersion: 1,
          epochId,
        });
        const input = composeInput(screenId, viewportId, 1, { epochId });
        const result = owner.compose(input);
        const expectedCount = screenId === 'weapon-index' ? 20
          : screenId === 'map-index' ? 2 : 1;
        expect(result.a6_12cLayoutInput.slotLayouts).toHaveLength(expectedCount);
        expect(result.diagnostics.sourceActionCount).toBe(result.diagnostics.outputActionCount);
        expect(result.diagnostics.addsAction).toBe(false);
        expect(result.previewAwareRenderPlan.identity).toBe(
          `${result.sourceRenderPlanIdentity}:a6.15-preview-aware:${viewportId}`,
        );
        expect(result.sourceRenderPlanIdentity).toBe(input.sourceRenderPlan.identity);
        expect(result.validationStatus).toBe('not-run');
        owner.destroy();
      }
    }
    expect(ARENA_V2_COLLECTION_PREVIEW_RENDER_PLAN_LAYOUT_BRIDGE_CANDIDATE_V1)
      .toMatchObject({ readsDom: false, createsThreeResources: false, loadsAssetBytes: false });
  });

  it('reuses the actual 20/2 selection card rectangles and keeps the encoded action', () => {
    for (const screenId of ['weapon-index', 'map-index'] as const) {
      const input = composeInput(screenId, '390x844', 1);
      const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
        schemaVersion: 1,
        epochId: input.epochId,
      });
      const firstSlot = input.readSnapshot.previewSlots[0]!;
      const prefix = `selection:${firstSlot.kind}:${firstSlot.definitionId}`;
      const sourcePanel = input.sourceRenderPlan.primitives.find(({ id }) => id === `${prefix}:panel`)!;
      const sourceAction = input.sourceRenderPlan.primitives.find(({ id }) => id === `${prefix}:action`)!;
      const result = owner.compose(input);
      const panel = result.previewAwareRenderPlan.primitives.find(({ id }) => id === `${prefix}:panel`)!;
      const action = result.previewAwareRenderPlan.primitives.find(({ id }) => id === `${prefix}:action`)!;
      expect(panel.rect.x).toBe(sourcePanel.rect.x);
      expect(panel.rect.width).toBe(sourcePanel.rect.width);
      expect(panel.rect.height).toBeGreaterThan(sourcePanel.rect.height);
      expect(action.kind).toBe('action');
      expect(action.kind === 'action' ? action.intentId : null).toBe(
        `arena.v2.selection.${firstSlot.kind}.${encodeURIComponent(firstSlot.definitionId)}`,
      );
      expect(sourceAction.kind).toBe('action');
      expect(result.diagnostics.sourceSelectionCardsReused)
        .toBe(screenId === 'weapon-index' ? 20 : 2);
      owner.destroy();
    }
  });

  it('preserves optional weapon availability while expanding collection preview cards', () => {
    const input = composeInput('weapon-index', '390x844', 1, {
      epochId: 'epoch-a6.15-availability',
    });
    const originalSelection = input.selectionProjection!;
    const unavailableId = originalSelection.items[1]!.id;
    const selection = Object.freeze({
      ...originalSelection,
      items: Object.freeze(originalSelection.items.map((item) => (
        item.id === unavailableId
          ? Object.freeze({
            ...item,
            available: false,
            unavailableReason: '这把武器尚未进入当前可玩武器池',
          })
          : Object.freeze({ ...item, available: true, unavailableReason: null })
      ))),
    });
    const sourceRenderPlan = addArenaV2InformationSelectionToRenderPlanCandidateV1(
      input.pipelineResult.renderPlan,
      selection,
    );
    const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: input.epochId,
    });
    const result = owner.compose({
      ...input,
      selectionProjection: selection,
      sourceRenderPlan,
      scrollSourceRenderPlanIdentity: sourceRenderPlan.identity,
      scrollSourceRenderPlanRevision: sourceRenderPlan.revision,
    });
    const action = result.previewAwareRenderPlan.primitives.find(({ id }) => (
      id === `selection:weapon:${unavailableId}:action`
    ));
    expect(action).toMatchObject({
      kind: 'action',
      enabled: false,
      disabledReason: '这把武器尚未进入当前可玩武器池',
    });
    expect(result.diagnostics.sourceSelectionCardsReused).toBe(20);
    owner.destroy();
  });

  it('projects one research line and one compact four-tick milestone line per weapon through DOM and Canvas', () => {
    const input = composeInput('weapon-index', '390x844', 1);
    const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: input.epochId,
    });
    const result = owner.compose(input);
    const firstDefinitionId = input.readSnapshot.previewSlots[0]!.definitionId;
    const prefix = `selection:weapon:${firstDefinitionId}`;
    const progress = result.previewAwareRenderPlan.primitives.find(
      ({ id }) => id === `${prefix}:main-research`,
    );
    const milestones = result.previewAwareRenderPlan.primitives.find(
      ({ id }) => id === `${prefix}:main-research-milestones`,
    );
    expect(progress).toMatchObject({
      kind: 'text',
      text: '主研究 30/120 · 熟悉',
      fixedWidthNumeric: true,
    });
    expect(milestones).toMatchObject({
      kind: 'text',
      text: '■30·□60·□90·□120',
      maximumLines: 1,
      accessibilityText: '主研究里程碑：30已达，60未达，90未达，120未达。',
    });
    expect(result.previewAwareRenderPlan.primitives.filter(
      ({ id }) => id.endsWith(':main-research-milestones'),
    )).toHaveLength(20);
    expect(result.previewAwareRenderPlan.primitives.length).toBeLessThanOrEqual(256);
    expect(result.diagnostics.outputActionCount).toBe(result.diagnostics.sourceActionCount);

    const dom = createArenaV2UiDomSurfaceModelV1(result.previewAwareRenderPlan);
    expect(dom.nodes.filter(({ id }) => id.endsWith(':main-research-milestones')))
      .toHaveLength(20);
    expect(dom.nodes.find(({ id }) => id === `${prefix}:main-research`))
      .toMatchObject({ text: '主研究 30/120 · 熟悉', intentId: null });
    const canvas = paintArenaV2UiRenderPlanV1(canvasPort(), result.previewAwareRenderPlan);
    expect(canvas.paintedPrimitiveIds).toContain(`${prefix}:main-research`);
    expect(canvas.paintedPrimitiveIds).toContain(`${prefix}:main-research-milestones`);
    owner.destroy();

    const desktopInput = composeInput('weapon-index', '1440x900', 1, {
      epochId: 'epoch-a6.15-research-desktop',
    });
    const desktopOwner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: desktopInput.epochId,
    });
    const desktop = desktopOwner.compose(desktopInput);
    expect(desktop.previewAwareRenderPlan.primitives.find(
      ({ id }) => id.endsWith(':main-research-milestones'),
    )).toMatchObject({ kind: 'text', text: '■30·□60·□90·□120', maximumLines: 1 });
    desktopOwner.destroy();
  });

  it('projects one non-interactive map route progress and 25/50/75/100 milestone line', () => {
    const input = composeInput('map-index', '390x844', 1, {
      epochId: 'epoch-a6.15-map-route-index',
    });
    const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: input.epochId,
    });
    const result = owner.compose(input);
    const definitionId = input.readSnapshot.previewSlots[0]!.definitionId;
    const id = `selection:map:${definitionId}:map-route-research-milestones`;
    const milestone = result.previewAwareRenderPlan.primitives.find(
      (primitive) => primitive.id === id,
    );
    expect(milestone).toMatchObject({
      kind: 'text',
      text: '路线研究 3/10 · 熟悉 · ■25·□50·□75·□100',
      maximumLines: 1,
      fixedWidthNumeric: true,
      accessibilityText: '地图路线研究进度3/10，当前阶段熟悉；路线研究里程碑：25%已达，50%未达，75%未达，100%未达。',
    });
    expect(result.previewAwareRenderPlan.primitives.filter(
      ({ id: primitiveId }) => primitiveId.endsWith(':map-route-research-milestones'),
    )).toHaveLength(2);
    expect(result.previewAwareRenderPlan.primitives.filter(
      ({ id: primitiveId }) => primitiveId.includes(':non-color-route-identity:'),
    )).toHaveLength(6);
    expect(result.previewAwareRenderPlan.primitives.length).toBeLessThanOrEqual(128);
    expect(result.diagnostics.outputActionCount).toBe(result.diagnostics.sourceActionCount);
    expect(createArenaV2UiDomSurfaceModelV1(result.previewAwareRenderPlan).nodes.find(
      ({ id: nodeId }) => nodeId === id,
    )).toMatchObject({ intentId: null });
    expect(paintArenaV2UiRenderPlanV1(canvasPort(), result.previewAwareRenderPlan)
      .paintedPrimitiveIds).toContain(id);
    owner.destroy();
  });

  it('keeps one upstream identity while viewport-qualified output resets mobile and desktop scroll domains', () => {
    const epochId = 'epoch-viewport-switch';
    const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId,
    });
    const mobile = owner.compose(composeInput('weapon-index', '390x844', 1, { epochId }));
    const desktop = owner.compose(composeInput('weapon-index', '1440x900', 2, { epochId }));

    expect(desktop.sourceRenderPlanIdentity).toBe(mobile.sourceRenderPlanIdentity);
    expect(mobile.previewAwareRenderPlan.identity).toBe(
      `${mobile.sourceRenderPlanIdentity}:a6.15-preview-aware:390x844`,
    );
    expect(desktop.previewAwareRenderPlan.identity).toBe(
      `${desktop.sourceRenderPlanIdentity}:a6.15-preview-aware:1440x900`,
    );
    expect(desktop.scrollOffsetCssPixels).toBe(0);
    expect(owner.getSnapshot().sourceRenderPlanIdentityCount).toBe(1);

    const rollbackOwner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: 'epoch-viewport-revision-rollback',
    });
    rollbackOwner.compose(composeInput('weapon-index', '390x844', 1, {
      epochId: 'epoch-viewport-revision-rollback',
      revision: 2,
    }));
    expect(() => rollbackOwner.compose(composeInput('weapon-index', '1440x900', 2, {
      epochId: 'epoch-viewport-revision-rollback',
      revision: 1,
    }))).toThrow(/跨视口回退/);
    rollbackOwner.destroy();
    owner.destroy();
  });

  it('inserts one detail preview after the question and shifts only clipped information fields', () => {
    const input = composeInput('weapon-detail', '1440x900', 1);
    const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: input.epochId,
    });
    const sourceField = input.sourceRenderPlan.primitives.find(({ id }) => id === 'first:summary:panel')!;
    const sourcePrimary = input.sourceRenderPlan.primitives.find(({ id }) => id === 'primary-action')!;
    const result = owner.compose(input);
    const outputField = result.previewAwareRenderPlan.primitives.find(({ id }) => id === 'first:summary:panel')!;
    const outputPrimary = result.previewAwareRenderPlan.primitives.find(({ id }) => id === 'primary-action')!;
    const slot = result.a6_12cLayoutInput.slotLayouts[0]!;
    expect(outputField.rect.y).toBeGreaterThan(sourceField.rect.y);
    expect(outputPrimary.rect).toEqual(sourcePrimary.rect);
    expect(slot.previewRectCssPixels).toMatchObject({ width: 260, height: 260 });
    expect(result.diagnostics.insertedDetailPanelCount).toBe(1);
    owner.destroy();
  });

  it('adds one upstream next milestone line to each existing weapon/map detail summary', () => {
    const weaponInput = composeInput('weapon-detail', '390x844', 1);
    const weaponOwner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: weaponInput.epochId,
    });
    const weapon = weaponOwner.compose(weaponInput);
    const milestone = weapon.previewAwareRenderPlan.primitives.filter(
      ({ id }) => id.endsWith(':next-main-research-milestone'),
    );
    expect(milestone).toHaveLength(1);
    expect(milestone[0]).toMatchObject({
      kind: 'text',
      text: '下一里程碑 60/120，还需30次主研究',
      maximumLines: 1,
    });
    const dom = createArenaV2UiDomSurfaceModelV1(weapon.previewAwareRenderPlan);
    expect(dom.nodes.find(({ id }) => id.endsWith(':next-main-research-milestone')))
      .toMatchObject({ text: '下一里程碑 60/120，还需30次主研究', intentId: null });
    const canvas = paintArenaV2UiRenderPlanV1(canvasPort(), weapon.previewAwareRenderPlan);
    expect(canvas.paintedPrimitiveIds.some((id) => (
      id.endsWith(':next-main-research-milestone')
    ))).toBe(true);
    weaponOwner.destroy();

    const mapInput = composeInput('map-detail', '390x844', 1, { epochId: 'epoch-map-detail' });
    const mapOwner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: mapInput.epochId,
    });
    const map = mapOwner.compose(mapInput);
    const mapMilestone = map.previewAwareRenderPlan.primitives.filter(
      ({ id }) => id.endsWith(':next-map-route-research-milestone'),
    );
    expect(mapMilestone).toHaveLength(1);
    expect(mapMilestone[0]).toMatchObject({
      kind: 'text',
      text: '下一里程碑50%，还需2次有效路线练习',
      maximumLines: 1,
    });
    expect(createArenaV2UiDomSurfaceModelV1(map.previewAwareRenderPlan).nodes.find(
      ({ id }) => id.endsWith(':next-map-route-research-milestone'),
    )).toMatchObject({ intentId: null });
    expect(paintArenaV2UiRenderPlanV1(canvasPort(), map.previewAwareRenderPlan)
      .paintedPrimitiveIds.some((id) => id.endsWith(':next-map-route-research-milestone')))
      .toBe(true);
    mapOwner.destroy();
  });

  it('projects top, middle and maximum scroll offsets without moving stored RenderPlan coordinates', () => {
    const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: 'epoch-a6.15',
    });
    const top = owner.compose(composeInput('weapon-index', '390x844', 1));
    const storedY = top.diagnostics.slots[0]!.storedPreviewRectCssPixels.y;
    const middleOffset = Math.floor(top.maximumScrollOffsetCssPixels / 2);
    const middle = owner.compose(composeInput('weapon-index', '390x844', 2, {
      scrollOffsetCssPixels: middleOffset,
    }));
    const bottom = owner.compose(composeInput('weapon-index', '390x844', 3, {
      scrollOffsetCssPixels: top.maximumScrollOffsetCssPixels,
    }));
    expect(middle.diagnostics.slots[0]!.storedPreviewRectCssPixels.y).toBe(storedY);
    expect(middle.a6_12cLayoutInput.slotLayouts[0]!.previewRectCssPixels.y)
      .toBe(storedY - middleOffset);
    expect(bottom.a6_12cLayoutInput.slotLayouts[0]!.previewRectCssPixels.y)
      .toBe(storedY - top.maximumScrollOffsetCssPixels);
    expect(middle.a6_12cLayoutInput.contentClipRectCssPixels)
      .toEqual(middle.previewAwareRenderPlan.scrollRegion!.viewport);
    owner.destroy();
  });

  it('keeps all current weapon and map previews on unique A6.18 static fallback', () => {
    const weaponOwner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: 'epoch-a6.15',
    });
    const weapon = weaponOwner.compose(composeInput('weapon-index', '390x844', 1));
    expect(weapon.diagnostics.formalWeaponTransparentPreviewCount).toBe(0);
    expect(weapon.diagnostics.staticFallbackPreviewCount).toBe(20);
    expect(weapon.previewAwareRenderPlan.primitives.find(
      ({ id }) => id.startsWith('formal-preview:weapon:') && id.endsWith(':panel'),
    )).toMatchObject({ kind: 'panel', tone: 'muted' });
    expect(weapon.previewAwareRenderPlan.primitives.filter(({ id }) => id.includes(':preview-border:')))
      .toHaveLength(0);
    const weaponFallbackLabels = weapon.previewAwareRenderPlan.primitives.filter(
      (primitive): primitive is Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'text' }> => (
        primitive.kind === 'text' && primitive.id.endsWith(':fallback')
      ),
    );
    expect(weaponFallbackLabels).toHaveLength(20);
    expect(new Set(weaponFallbackLabels.map(({ text }) => text)).size).toBe(20);
    expect(weaponFallbackLabels.every(({ text, accessibilityText }) => (
      text.startsWith('武')
      && accessibilityText.includes('文字、形状与图案回退')
    ))).toBe(true);
    const weaponDom = createArenaV2UiDomSurfaceModelV1(weapon.previewAwareRenderPlan);
    expect(weaponDom.nodes.filter(({ id }) => id.endsWith(':fallback'))).toHaveLength(20);
    const weaponCanvas = paintArenaV2UiRenderPlanV1(
      canvasPort(),
      weapon.previewAwareRenderPlan,
    );
    expect(weaponCanvas.paintedPrimitiveIds.filter((id) => id.endsWith(':fallback')))
      .toHaveLength(20);
    weaponOwner.destroy();

    const mapOwner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: 'epoch-map',
    });
    const map = mapOwner.compose(composeInput('map-index', '390x844', 1, { epochId: 'epoch-map' }));
    expect(map.diagnostics.staticFallbackPreviewCount).toBe(2);
    const mapFallbackLabels = map.previewAwareRenderPlan.primitives.filter(
      (primitive): primitive is Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'text' }> => (
        primitive.kind === 'text' && primitive.id.endsWith(':fallback')
      ),
    );
    expect(mapFallbackLabels).toHaveLength(2);
    expect(new Set(mapFallbackLabels.map(({ text }) => text)).size).toBe(2);
    expect(mapFallbackLabels.every(({ text }) => text.startsWith('图'))).toBe(true);
    expect(map.previewAwareRenderPlan.primitives.filter(({ id }) => id.includes(':fallback-pattern:')))
      .toHaveLength(6);
    mapOwner.destroy();

    const missingOwner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: 'epoch-missing',
    });
    const missing = missingOwner.compose(composeInput('weapon-index', '390x844', 1, {
      epochId: 'epoch-missing',
      missingFirstWeapon: true,
    }));
    expect(missing.diagnostics.staticFallbackPreviewCount).toBe(20);
    expect(missing.a6_12cLayoutInput.slotLayouts).toHaveLength(20);
    missingOwner.destroy();
  });

  it('returns the same result for exact replay and rejects same-tick layout conflict', () => {
    const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: 'epoch-a6.15',
    });
    const input = composeInput('map-index', '1440x900', 1);
    const first = owner.compose(input);
    expect(owner.compose(clone(input))).toBe(first);
    expect(() => owner.compose({ ...input, scrollOffsetCssPixels: 1 })).toThrow(/同tick/);
    expect(owner.getSnapshot().hasCommittedResult).toBe(true);
    owner.destroy();
  });

  it('rejects forged cards, selected identity, revision rollback and overflow before output', () => {
    const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: 'epoch-a6.15',
    });
    const initial = composeInput('weapon-index', '390x844', 1, { revision: 2 });
    const committed = owner.compose(initial);
    const before = owner.getSnapshot();

    const forgedCard = clone(composeInput('weapon-index', '390x844', 2, { revision: 3 }));
    const action = forgedCard.sourceRenderPlan.primitives.find(
      ({ id }) => id.endsWith(':action') && id.startsWith('selection:'),
    ) as unknown as { intentId: string };
    action.intentId = 'arena.v2.selection.weapon.forged%2Fidentity';
    expect(() => owner.compose(forgedCard)).toThrow(/真实组合结果/);

    const selectedDrift = clone(composeInput('weapon-index', '390x844', 2, { revision: 3 }));
    (selectedDrift.selectionProjection as unknown as { selectedId: string }).selectedId =
      'unknown-selection';
    expect(() => owner.compose(selectedDrift)).toThrow(/selectedId/);

    expect(() => owner.compose(composeInput('weapon-index', '390x844', 2, { revision: 1 })))
      .toThrow(/revision回退/);
    const overflow = composeInput('weapon-index', '390x844', 2, {
      revision: 3,
      scrollOffsetCssPixels: committed.maximumScrollOffsetCssPixels + 1,
    });
    expect(() => owner.compose(overflow)).toThrow(/scrollOffset/);
    const detachedScroll = composeInput('weapon-index', '390x844', 2, { revision: 3 });
    detachedScroll.scrollSourceRenderPlanRevision = 99;
    expect(() => owner.compose(detachedScroll)).toThrow(/没有绑定/);

    const injectedIdCollision = clone(composeInput('weapon-index', '390x844', 2, {
      revision: 3,
    }));
    const firstDefinitionId = injectedIdCollision.readSnapshot.previewSlots[0]!.definitionId;
    const basePlan = injectedIdCollision.pipelineResult.renderPlan;
    const forgedBasePlan = Object.freeze({
      ...basePlan,
      primitives: Object.freeze([...basePlan.primitives, Object.freeze({
        kind: 'text' as const,
        id: `formal-preview:weapon:${firstDefinitionId}:panel`,
        rect: Object.freeze({ x: 20, y: 80, width: 120, height: 20 }),
        clipRect: basePlan.scrollRegion!.viewport,
        text: '伪造字段',
        accessibilityText: '伪造字段',
        tone: 'muted' as const,
        role: 'label' as const,
        alignment: 'left' as const,
        maximumLines: 1,
        fixedWidthNumeric: false,
        zIndex: 1,
      })]),
    });
    (injectedIdCollision.pipelineResult as unknown as {
      renderPlan: ArenaV2UiRenderPlanV1;
    }).renderPlan = forgedBasePlan;
    (injectedIdCollision as unknown as {
      sourceRenderPlan: ArenaV2UiRenderPlanV1;
    }).sourceRenderPlan = addArenaV2InformationSelectionToRenderPlanCandidateV1(
      forgedBasePlan,
      injectedIdCollision.selectionProjection!,
    );
    expect(() => owner.compose(injectedIdCollision)).toThrow(/重复primitive/);
    expect(owner.getSnapshot()).toEqual(before);
    owner.destroy();
  });

  it('rejects forged research stage, progress closure and reached facts before publishing layout', () => {
    const mutations: readonly ((research: Record<string, unknown>) => void)[] = [
      (research) => { research.stage = 'future-stage'; },
      (research) => { research.stage = '精通'; },
      (research) => { research.labelText = '次研究'; },
      (research) => { research.valueText = '29/120'; },
      (research) => { research.complete = true; },
      (research) => {
        const milestones = research.milestones as Record<string, unknown>[];
        milestones[0]!.reached = false;
      },
    ];
    for (const mutate of mutations) {
      const input = clone(composeInput('weapon-index', '390x844', 1));
      const page = input.readSnapshot.indexPage!;
      const item = page.weaponIndex.items[0] as unknown as {
        collectionResearch: Record<string, unknown>;
      };
      mutate(item.collectionResearch);
      const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
        schemaVersion: 1,
        epochId: input.epochId,
      });
      expect(() => owner.compose(input)).toThrow(/A6\.15 weapon item/);
      expect(owner.getSnapshot()).toMatchObject({ lastTick: -1, hasCommittedResult: false });
      owner.destroy();
    }

    const detailInput = clone(composeInput('weapon-detail', '390x844', 1));
    (detailInput.readSnapshot.detailPage!.summary as unknown as {
      mainResearchStage: string;
    }).mainResearchStage = '精通';
    const detailOwner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: detailInput.epochId,
    });
    expect(() => detailOwner.compose(detailInput)).toThrow(/下一里程碑事实漂移/);
    expect(detailOwner.getSnapshot()).toMatchObject({ lastTick: -1, hasCommittedResult: false });
    detailOwner.destroy();

    const mapInput = clone(composeInput('map-index', '390x844', 1, {
      epochId: 'epoch-a6.15-map-route-drift',
    }));
    const routeResearch = mapInput.readSnapshot.indexPage!.mapIndex.items[0]!
      .routeResearch as unknown as { stage: string; milestones: Array<{ reached: boolean }> };
    routeResearch.stage = 'future-stage';
    routeResearch.milestones[0]!.reached = false;
    const mapOwner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: mapInput.epochId,
    });
    expect(() => mapOwner.compose(mapInput)).toThrow(/路线研究聚合事实漂移/);
    expect(mapOwner.getSnapshot()).toMatchObject({ lastTick: -1, hasCommittedResult: false });
    mapOwner.destroy();
  });

  it('rejects missing/duplicate selection primitives and destroys without retained history', () => {
    const owner = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: 'epoch-a6.15',
    });
    const missing = clone(composeInput('map-index', '390x844', 1));
    (missing.sourceRenderPlan as unknown as {
      primitives: ArenaV2UiRenderPrimitiveV1[];
    }).primitives = [...missing.sourceRenderPlan.primitives.slice(1)];
    expect(() => owner.compose(missing)).toThrow(/真实组合结果/);

    const duplicate = clone(composeInput('map-index', '390x844', 1));
    (duplicate.sourceRenderPlan.primitives as unknown as ArenaV2UiRenderPrimitiveV1[])
      .push(duplicate.sourceRenderPlan.primitives[0]!);
    expect(() => owner.compose(duplicate)).toThrow(/重复primitive/);
    expect(owner.getSnapshot()).toMatchObject({ lastTick: -1, hasCommittedResult: false });
    owner.destroy();
    owner.destroy();
    expect(owner.getSnapshot()).toMatchObject({ state: 'destroyed', sourceRenderPlanIdentityCount: 0 });
    expect(() => owner.compose(composeInput('map-index', '390x844', 2))).toThrow(/destroyed/);
  });
});
