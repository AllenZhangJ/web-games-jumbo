import { describe, expect, it } from 'vitest';
import {
  addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1,
  type ArenaV2UiRenderPlanV1,
} from '../src/index.js';

const VIEWPORT = Object.freeze({ x: 16, y: 100, width: 358, height: 200 });

function resultPlan(): ArenaV2UiRenderPlanV1 {
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'information',
    identity: 'result-reward',
    revision: 7,
    status: 'layout-candidate',
    productionReady: false,
    primitives: Object.freeze([Object.freeze({
      kind: 'action' as const,
      id: 'primary-action',
      rect: Object.freeze({ x: 16, y: 320, width: 358, height: 52 }),
      clipRect: null,
      intentId: 'play-again-or-next',
      label: '继续长期目标',
      accessibilityText: '继续长期目标',
      enabled: true,
      disabledReason: null,
      minimumTouchTargetCssPixels: 48 as const,
      tone: 'primary' as const,
      zIndex: 4,
    })]),
    scrollRegion: Object.freeze({
      viewport: VIEWPORT,
      contentHeight: 300,
      verticalScrollRequired: true,
    }),
    liveAnnouncements: Object.freeze([]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([] as const),
  });
}

describe('Arena V2 result new collection detail render plan candidate V1', () => {
  it('preserves the primary action and appends ordered optional detail actions', () => {
    const plan = addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(
      resultPlan(),
      [
        { kind: 'weapon', definitionId: 'weapon.a', displayName: '冲锋盾' },
        { kind: 'map', definitionId: 'map.a', displayName: '空港断层' },
      ],
    );
    expect(plan.primitives.filter(({ id }) => id === 'primary-action')).toHaveLength(1);
    expect(plan.primitives.slice(-2)).toMatchObject([
      {
        kind: 'action',
        label: '查看并选择新武器：冲锋盾',
        intentId: 'arena.v2.result-new-collection.weapon.weapon.a',
        rect: { y: 412, height: 48 },
        minimumTouchTargetCssPixels: 48,
        tone: 'muted',
      },
      {
        kind: 'action',
        label: '查看并选择新地图：空港断层',
        intentId: 'arena.v2.result-new-collection.map.map.a',
        rect: { y: 468, height: 48 },
        minimumTouchTargetCssPixels: 48,
        tone: 'muted',
      },
    ]);
    expect(plan.scrollRegion).toMatchObject({
      contentHeight: 416,
      verticalScrollRequired: true,
    });
  });

  it('returns the original plan when the committed result has no new collection', () => {
    const plan = resultPlan();
    expect(addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(plan, []))
      .toBe(plan);
  });

  it('fails closed on duplicate, sparse, accessor and repeated decoration inputs', () => {
    expect(() => addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(
      Object.freeze({ ...resultPlan(), primitives: Object.freeze([]) }),
      [],
    )).toThrow(/精确一个主动作/);
    expect(() => addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(
      resultPlan(),
      [
        { kind: 'weapon', definitionId: 'weapon.a', displayName: '冲锋盾' },
        { kind: 'weapon', definitionId: 'weapon.a', displayName: '冲锋盾' },
      ],
    )).toThrow(/重复/);
    expect(() => addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(
      resultPlan(),
      new Array(1),
    )).toThrow(/空槽|访问器/);
    let accessorReads = 0;
    const accessor: unknown[] = [];
    accessor.length = 1;
    Object.defineProperty(accessor, '0', {
      enumerable: true,
      get: () => {
        accessorReads += 1;
        return { kind: 'map', definitionId: 'map.a', displayName: '空港断层' };
      },
    });
    expect(() => addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(
      resultPlan(),
      accessor,
    )).toThrow(/空槽|访问器/);
    expect(accessorReads).toBe(0);
    let itemAccessorReads = 0;
    const itemAccessor: Record<string, unknown> = {
      definitionId: 'map.a',
      displayName: '空港断层',
    };
    Object.defineProperty(itemAccessor, 'kind', {
      enumerable: true,
      get: () => {
        itemAccessorReads += 1;
        return 'map';
      },
    });
    expect(() => addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(
      resultPlan(),
      [itemAccessor],
    )).toThrow(/数据字段/);
    expect(itemAccessorReads).toBe(0);
    const decorated = addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(
      resultPlan(),
      [{ kind: 'map', definitionId: 'map.a', displayName: '空港断层' }],
    );
    expect(() => addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(
      decorated,
      [{ kind: 'map', definitionId: 'map.a', displayName: '空港断层' }],
    )).toThrow(/不得重复接入/);
  });
});
