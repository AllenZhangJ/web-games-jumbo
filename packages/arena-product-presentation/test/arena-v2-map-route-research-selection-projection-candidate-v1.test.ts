import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_MAP_ROUTE_RESEARCH_SELECTION_PROJECTION_CANDIDATE_V1,
  projectArenaV2MapRouteResearchSelectionCandidateV1,
} from '../src/index.js';

const MAPS = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps;

function selection() {
  return {
    kind: 'map' as const,
    selectedId: MAPS[0]!.mapDefinitionId,
    items: MAPS.map((map, index) => ({
      id: map.mapDefinitionId,
      label: `map-${index + 1}`,
      description: `${index === 0 ? '当前目标 · ' : ''}已收藏 · 路线理解 ${index}/${map.segments.length}｜${map.participantRange}`,
    })),
  };
}

function facts(overrides: Readonly<Record<number, Readonly<Record<string, unknown>>>> = {}) {
  return MAPS.map((map, index) => ({
    mapDefinitionId: map.mapDefinitionId,
    evidencePerSegmentTarget: 1,
    segments: map.segments.map((segment, segmentIndex) => ({
      segmentDefinitionId: segment.segmentDefinitionId,
      displayName: segment.displayName,
      completionEvidenceCount: segmentIndex < index ? 1 : 0,
    })),
    ...overrides[index],
  }));
}

function segmentsWithCompletedPrefix(mapIndex: number, completedCount: number) {
  return MAPS[mapIndex]!.segments.map((segment, segmentIndex) => ({
    segmentDefinitionId: segment.segmentDefinitionId,
    displayName: segment.displayName,
    completionEvidenceCount: segmentIndex < completedCount ? 1 : 0,
  }));
}

describe('Arena V2 map route research selection projection candidate V1', () => {
  it('adds the existing route stage and next milestone while preserving target copy', () => {
    const source = selection();
    const firstSegmentCount = MAPS[0]!.segments.length;
    const result = projectArenaV2MapRouteResearchSelectionCandidateV1({
      schemaVersion: 1,
      profileRevision: 0,
      replayWeaponRotationSpan: 20,
      selection: source,
      mapResearchFacts: facts({
        0: {
          segments: segmentsWithCompletedPrefix(0, Math.ceil(firstSegmentCount / 2)),
        },
      }),
    });
    expect(result.kind).toBe('map');
    expect(result.selectedId).toBe(source.selectedId);
    expect(result.items[0]!.description).toContain('当前目标 · 已收藏');
    expect(result.items[0]!.description).toContain(
      `熟练 · 路线理解 ${Math.ceil(firstSegmentCount / 2)}/${firstSegmentCount}`,
    );
    expect(result.items[0]!.description).toContain(
      `下一段${Math.ceil(firstSegmentCount / 2) + 1}.`,
    );
    expect(result.items[0]!.description).toContain('75%还需');
    expect(result.items[1]!.description).toContain('初识 · 路线理解 1/');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.items)).toBe(true);
  });

  it('shows route completion without adding a second progress field', () => {
    const source = selection();
    source.items[0]!.description = `已收藏 · 路线理解 ${MAPS[0]!.segments.length}/${MAPS[0]!.segments.length}`;
    const result = projectArenaV2MapRouteResearchSelectionCandidateV1({
      schemaVersion: 1,
      profileRevision: 0,
      replayWeaponRotationSpan: 20,
      selection: source,
      mapResearchFacts: facts({
        0: {
          segments: segmentsWithCompletedPrefix(0, MAPS[0]!.segments.length),
        },
      }),
    });
    expect(result.items[0]!.description).toContain('路线全通');
    expect(result.items[0]!.description).toContain('全部路段已理解');
    expect(result.items[0]!.description).toContain('里程碑完成');
  });

  it('uses the shared least-practiced segment instead of the first incomplete segment', () => {
    const source = selection();
    source.items[0]!.description = `当前目标 · 已收藏 · 路线理解 0/${
      MAPS[0]!.segments.length
    }｜${MAPS[0]!.participantRange}`;
    const result = projectArenaV2MapRouteResearchSelectionCandidateV1({
      schemaVersion: 1,
      profileRevision: 0,
      replayWeaponRotationSpan: 20,
      selection: source,
      mapResearchFacts: facts({
        0: {
          evidencePerSegmentTarget: 2,
          segments: MAPS[0]!.segments.map((segment, segmentIndex) => ({
            segmentDefinitionId: segment.segmentDefinitionId,
            displayName: segment.displayName,
            completionEvidenceCount: segmentIndex === 0 ? 1 : 0,
          })),
        },
      }),
    });
    expect(result.items[0]!.description).toContain(
      `下一段2.${MAPS[0]!.segments[1]!.displayName} 0/2`,
    );
  });

  it('rejects directory order, contradictory evidence and description drift', () => {
    expect(() => projectArenaV2MapRouteResearchSelectionCandidateV1({
      schemaVersion: 1,
      profileRevision: 0,
      replayWeaponRotationSpan: 20,
      selection: selection(),
      mapResearchFacts: facts().slice().reverse(),
    })).toThrow(/顺序/);
    expect(() => projectArenaV2MapRouteResearchSelectionCandidateV1({
      schemaVersion: 1,
      profileRevision: 0,
      replayWeaponRotationSpan: 20,
      selection: selection(),
      mapResearchFacts: facts({
        0: {
          segments: MAPS[0]!.segments.map((segment, segmentIndex) => ({
            segmentDefinitionId: segment.segmentDefinitionId,
            displayName: segment.displayName,
            completionEvidenceCount: segmentIndex === 0 ? 2 : 0,
          })),
        },
      }),
    })).toThrow(/越界/);
    const source = selection();
    source.items[0]!.description = '已收藏｜2–4人';
    expect(() => projectArenaV2MapRouteResearchSelectionCandidateV1({
      schemaVersion: 1,
      profileRevision: 0,
      replayWeaponRotationSpan: 20,
      selection: source,
      mapResearchFacts: facts(),
    })).toThrow(/路线理解片段/);
  });

  it('rotates one replay map after all route research is complete without new state', () => {
    const source = selection();
    source.items.forEach((item, index) => {
      item.description = `已收藏 · 路线理解 ${MAPS[index]!.segments.length}/${
        MAPS[index]!.segments.length
      }｜${MAPS[index]!.participantRange}`;
    });
    const eligibleSource = {
      ...source,
      items: source.items.map((item, index) => ({
        ...item,
        available: index === 0,
        unavailableReason: index === 0 ? null : '本轮暂未开放',
      })),
    };
    const result = projectArenaV2MapRouteResearchSelectionCandidateV1({
      schemaVersion: 1,
      profileRevision: 20,
      replayWeaponRotationSpan: 20,
      selection: eligibleSource,
      mapResearchFacts: facts({
        0: { segments: segmentsWithCompletedPrefix(0, MAPS[0]!.segments.length) },
        1: { segments: segmentsWithCompletedPrefix(1, MAPS[1]!.segments.length) },
      }),
    });
    expect(result.items[0]!.description).toContain('本轮复练地图');
    expect(result.items[1]!.description).not.toContain('本轮复练地图');
    const allAvailableResult = projectArenaV2MapRouteResearchSelectionCandidateV1({
      schemaVersion: 1,
      profileRevision: 20,
      replayWeaponRotationSpan: 20,
      selection: source,
      mapResearchFacts: facts({
        0: { segments: segmentsWithCompletedPrefix(0, MAPS[0]!.segments.length) },
        1: { segments: segmentsWithCompletedPrefix(1, MAPS[1]!.segments.length) },
      }),
    });
    expect(allAvailableResult.items[0]!.description).not.toContain('本轮复练地图');
    expect(allAvailableResult.items[1]!.description).toContain('本轮复练地图');
  });

  it('keeps the production path closed and owns no progression state', () => {
    expect(ARENA_V2_MAP_ROUTE_RESEARCH_SELECTION_PROJECTION_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        defaultSurfaceWired: false,
        mutatesProfile: false,
        grantsRewards: false,
        addsSelectionFields: false,
        reusesMapRouteResearchMilestoneProjector: true,
        nextSegmentUsesSharedLeastPracticedResolver: true,
        completedRouteReplayRotationUsesProfileRevisionWeaponEpochModuloCatalog: true,
        completedRouteReplayWeaponEpochLengthSource: 'validated-eligible-weapon-count',
        completedRouteReplayRotationExcludesUnavailableMaps: true,
        completedRouteReplayRotationAddsPersistedState: false,
      });
  });
});
