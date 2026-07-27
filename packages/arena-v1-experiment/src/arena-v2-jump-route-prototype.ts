export const ARENA_V2_JUMP_ROUTE_INPUTS = Object.freeze(['direction', 'jump']);

type SegmentKind = 'basic-platform' | 'gap' | 'stairs' | 'maze' | 'narrow-path' | 'wire';
type SurvivalLoopRole = 'safe' | 'pressure' | 'choice' | 'recovery';

interface JumpRouteSegment {
  readonly segmentId: string;
  readonly kind: SegmentKind;
  readonly lesson: string;
  readonly remix: string;
  readonly difficulty: Readonly<{
    distance: number;
    rhythm: number;
    turn: number;
    route: number;
    recovery: number;
    combat: number;
  }>;
  readonly entryAnchor: string;
  readonly exitAnchor: string;
  readonly respawnAnchor: string;
  readonly survivalLoopRole: SurvivalLoopRole;
}

export interface ArenaV2JumpRoutePrototype {
  readonly routeId: string;
  readonly segmentIds: readonly string[];
  readonly segments: readonly JumpRouteSegment[];
  readonly finishAnchor: string;
  readonly respawnSeconds: number;
  readonly surfacesCanCollapse: false;
  readonly usesOnlyBaseInputs: true;
  readonly survivalChoiceSegmentIds: readonly string[];
  readonly permanentRecoverySegmentIds: readonly string[];
}

const ROUTE_SEGMENTS: readonly JumpRouteSegment[] = Object.freeze([
  Object.freeze({
    segmentId: 'segment-01-platform',
    kind: 'basic-platform',
    lesson: '理解起跳距离和落点',
    remix: '把单次跳跃接到短连续跳',
    difficulty: Object.freeze({ distance: 1, rhythm: 1, turn: 1, route: 1, recovery: 1, combat: 1 }),
    entryAnchor: 'anchor-start',
    exitAnchor: 'anchor-platform-end',
    respawnAnchor: 'anchor-start',
    survivalLoopRole: 'safe',
  }),
  Object.freeze({
    segmentId: 'segment-02-gap',
    kind: 'gap',
    lesson: '保持方向通过断层',
    remix: '在落点前完成一次方向修正',
    difficulty: Object.freeze({ distance: 2, rhythm: 2, turn: 2, route: 1, recovery: 2, combat: 1 }),
    entryAnchor: 'anchor-platform-end',
    exitAnchor: 'anchor-gap-end',
    respawnAnchor: 'anchor-platform-end',
    survivalLoopRole: 'recovery',
  }),
  Object.freeze({
    segmentId: 'segment-03-stairs',
    kind: 'stairs',
    lesson: '建立连续起跳节奏',
    remix: '连续三次跳跃不改变操作语法',
    difficulty: Object.freeze({ distance: 2, rhythm: 3, turn: 2, route: 1, recovery: 2, combat: 2 }),
    entryAnchor: 'anchor-gap-end',
    exitAnchor: 'anchor-stairs-end',
    respawnAnchor: 'anchor-gap-end',
    survivalLoopRole: 'pressure',
  }),
  Object.freeze({
    segmentId: 'segment-04-maze',
    kind: 'maze',
    lesson: '读懂主路线与错误路线',
    remix: '用一次回头修正路线判断',
    difficulty: Object.freeze({ distance: 2, rhythm: 2, turn: 3, route: 3, recovery: 2, combat: 2 }),
    entryAnchor: 'anchor-stairs-end',
    exitAnchor: 'anchor-maze-end',
    respawnAnchor: 'anchor-stairs-end',
    survivalLoopRole: 'choice',
  }),
  Object.freeze({
    segmentId: 'segment-05-narrow',
    kind: 'narrow-path',
    lesson: '在窄路上微调方向和落点',
    remix: '把移动和跳跃连续交替',
    difficulty: Object.freeze({ distance: 2, rhythm: 3, turn: 3, route: 2, recovery: 3, combat: 4 }),
    entryAnchor: 'anchor-maze-end',
    exitAnchor: 'anchor-narrow-end',
    respawnAnchor: 'anchor-maze-end',
    survivalLoopRole: 'pressure',
  }),
  Object.freeze({
    segmentId: 'segment-06-wire',
    kind: 'wire',
    lesson: '在终段保持微小方向修正',
    remix: '在最长连续段中维持稳定节奏',
    difficulty: Object.freeze({ distance: 3, rhythm: 4, turn: 4, route: 2, recovery: 3, combat: 3 }),
    entryAnchor: 'anchor-narrow-end',
    exitAnchor: 'anchor-finish',
    respawnAnchor: 'anchor-narrow-end',
    survivalLoopRole: 'choice',
  }),
]);

function assertPrototypeShape(): void {
  if (ROUTE_SEGMENTS.length !== 6) throw new Error('V2 跳跃路线必须包含六个首批段落。');
  const ids = ROUTE_SEGMENTS.map(({ segmentId }) => segmentId);
  if (new Set(ids).size !== ids.length) throw new Error('V2 跳跃路线段落 ID 不能重复。');
  for (const segment of ROUTE_SEGMENTS) {
    for (const value of Object.values(segment.difficulty)) {
      if (!Number.isInteger(value) || value < 1 || value > 4) {
        throw new RangeError(`V2 跳跃路线难度必须位于 1-4：${segment.segmentId}`);
      }
    }
  }
}

assertPrototypeShape();

export function createArenaV2JumpRoutePrototype(): ArenaV2JumpRoutePrototype {
  const segments = Object.freeze([...ROUTE_SEGMENTS]);
  return Object.freeze({
    routeId: 'arena-v2-kz-base-route-prototype-v1',
    segmentIds: Object.freeze(segments.map(({ segmentId }) => segmentId)),
    segments,
    finishAnchor: 'anchor-finish',
    respawnSeconds: 3,
    surfacesCanCollapse: false,
    usesOnlyBaseInputs: true,
    survivalChoiceSegmentIds: Object.freeze(
      segments.filter(({ survivalLoopRole }) => survivalLoopRole === 'choice')
        .map(({ segmentId }) => segmentId),
    ),
    permanentRecoverySegmentIds: Object.freeze(
      segments.filter(({ survivalLoopRole }) => survivalLoopRole === 'safe' || survivalLoopRole === 'recovery')
        .map(({ segmentId }) => segmentId),
    ),
  });
}
