import {
  assertKnownKeys,
  assertSynchronousReturn,
} from '@number-strategy-jump/arena-contracts';
import { snapshotMethod } from '@number-strategy-jump/arena-presentation-runtime/capability-utils';
import type { ArenaV2ModeHudLayoutV1 } from './arena-v2-mode-hud-layout-v1.js';
import type { ArenaV2UiRectV1 } from './arena-v2-information-screen-layout-v1.js';
import type { ArenaV2UiRenderPlanV1 } from './arena-v2-ui-render-plan-v1.js';

export const ARENA_V2_MODE_HUD_WORLD_MARKER_PROJECTION_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2ModeHudCameraProjectionPortV1 {
  readonly project: (position: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }>) => Readonly<{
    readonly normalizedX: number;
    readonly normalizedY: number;
    readonly depth: number;
    readonly behindCamera: boolean;
    readonly occluded: boolean;
  }>;
}

export interface ArenaV2ModeHudWorldMarkerV1 {
  readonly id: string;
  readonly label: string;
  readonly accessibilityText: string;
  readonly sourcePosition: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  readonly visibility: 'visible' | 'behind-camera' | 'occluded' | 'blocked-by-hud';
  readonly placement: 'onscreen' | 'edge-clamped' | null;
  readonly centerCssPixels: Readonly<{ readonly x: number; readonly y: number }> | null;
  readonly touchTargetCssPixels: 48;
  readonly depth: number;
}

export interface ArenaV2ModeHudWorldMarkerProjectionV1 {
  readonly schemaVersion: typeof ARENA_V2_MODE_HUD_WORLD_MARKER_PROJECTION_V1_SCHEMA_VERSION;
  readonly modelIdentity: string;
  readonly modelRevision: number;
  readonly markers: readonly ArenaV2ModeHudWorldMarkerV1[];
}

const CAMERA_PROJECTION_RESULT_KEYS: ReadonlySet<string> = new Set([
  'normalizedX',
  'normalizedY',
  'depth',
  'behindCamera',
  'occluded',
]);

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${name}必须是有限数。`);
  }
  return value;
}

function intersectsAt(centerX: number, centerY: number, rect: ArenaV2UiRectV1): boolean {
  const half = 24;
  return centerX + half > rect.x
    && centerX - half < rect.x + rect.width
    && centerY + half > rect.y
    && centerY - half < rect.y + rect.height;
}

function sameRect(left: ArenaV2UiRectV1 | null, right: ArenaV2UiRectV1 | null): boolean {
  if (left === null || right === null) return left === right;
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}

function placementCandidates(
  x: number,
  y: number,
  safe: ArenaV2UiRectV1,
): readonly Readonly<{ readonly x: number; readonly y: number }>[] {
  const minimumX = safe.x + 24;
  const maximumX = safe.x + safe.width - 24;
  const minimumY = safe.y + 24;
  const maximumY = safe.y + safe.height - 24;
  const base = Object.freeze({
    x: Math.max(minimumX, Math.min(maximumX, x)),
    y: Math.max(minimumY, Math.min(maximumY, y)),
  });
  const offsets = [0, -56, 56, -112, 112];
  return Object.freeze(offsets.flatMap((offsetY) => [
    Object.freeze({ x: base.x, y: Math.max(minimumY, Math.min(maximumY, base.y + offsetY)) }),
    Object.freeze({
      x: Math.max(minimumX, Math.min(maximumX, base.x - 56)),
      y: Math.max(minimumY, Math.min(maximumY, base.y + offsetY)),
    }),
    Object.freeze({
      x: Math.max(minimumX, Math.min(maximumX, base.x + 56)),
      y: Math.max(minimumY, Math.min(maximumY, base.y + offsetY)),
    }),
  ]));
}

function exclusionRects(layout: ArenaV2ModeHudLayoutV1): readonly ArenaV2UiRectV1[] {
  return Object.freeze([
    layout.primaryTimerRect,
    ...(layout.preparationTimerRect === null ? [] : [layout.preparationTimerRect]),
    layout.localStatusRect,
    layout.modeStatusRect,
    ...(layout.supplyRailRect === null ? [] : [layout.supplyRailRect]),
    ...(layout.feedbackRect === null ? [] : [layout.feedbackRect]),
    ...(layout.inputReservedRect === null ? [] : [layout.inputReservedRect]),
  ]);
}

function normalizeProjectionResult(value: unknown): Readonly<{
  readonly normalizedX: number;
  readonly normalizedY: number;
  readonly depth: number;
  readonly behindCamera: boolean;
  readonly occluded: boolean;
}> {
  assertSynchronousReturn(value, 'Arena V2 HUD World Marker相机投影');
  assertKnownKeys(value, CAMERA_PROJECTION_RESULT_KEYS, 'Arena V2 HUD marker相机投影结果');
  for (const key of CAMERA_PROJECTION_RESULT_KEYS) {
    if (!Object.hasOwn(value, key)) {
      throw new TypeError(`Arena V2 HUD marker相机投影结果.${key}为必填字段。`);
    }
  }
  const source = value as Record<string, unknown>;
  const behindCamera = source.behindCamera;
  const occluded = source.occluded;
  if (typeof behindCamera !== 'boolean' || typeof occluded !== 'boolean') {
    throw new TypeError('Arena V2 HUD marker相机可见性必须是布尔值。');
  }
  return Object.freeze({
    normalizedX: finite(source.normalizedX, 'Arena V2 HUD marker normalizedX'),
    normalizedY: finite(source.normalizedY, 'Arena V2 HUD marker normalizedY'),
    depth: finite(source.depth, 'Arena V2 HUD marker depth'),
    behindCamera,
    occluded,
  });
}

/**
 * Converts already-authoritative world anchors into overlay positions. Camera
 * projection and occlusion are supplied by the renderer; this code never
 * infers pickup distance, ownership or availability.
 */
export function projectArenaV2ModeHudWorldMarkersV1(
  plan: ArenaV2UiRenderPlanV1,
  layout: ArenaV2ModeHudLayoutV1,
  camera: ArenaV2ModeHudCameraProjectionPortV1,
): ArenaV2ModeHudWorldMarkerProjectionV1 {
  if (plan.schemaVersion !== 1 || plan.surfaceKind !== 'hud' || plan.productionReady !== false) {
    throw new RangeError('Arena V2 HUD World Marker只接受未晋级HUD RenderPlan V1。');
  }
  if (layout.schemaVersion !== 1 || !sameRect(plan.inputExclusionRect, layout.inputReservedRect)) {
    throw new RangeError('Arena V2 HUD World Marker RenderPlan与Layout不闭合。');
  }
  if (plan.worldAnchors.length > 3) {
    throw new RangeError('Arena V2 HUD World Marker最多接受3个权威锚点。');
  }
  const project = snapshotMethod(
    camera,
    'Arena V2 HUD World Marker相机投影端口',
    'project',
  );
  const blocked = exclusionRects(layout);
  const occupied: ArenaV2UiRectV1[] = [];
  const markers = [...plan.worldAnchors].sort((left, right) => (
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  )).map((anchor) => {
    const projected = normalizeProjectionResult(project(anchor.position));
    const hiddenVisibility = projected.behindCamera
      ? 'behind-camera' as const
      : projected.occluded ? 'occluded' as const : null;
    if (hiddenVisibility !== null) return Object.freeze({
      id: anchor.id,
      label: anchor.label,
      accessibilityText: anchor.accessibilityText,
      sourcePosition: anchor.position,
      visibility: hiddenVisibility,
      placement: null,
      centerCssPixels: null,
      touchTargetCssPixels: 48 as const,
      depth: projected.depth,
    });
    const rawX = layout.safeRect.x + (projected.normalizedX + 1) * 0.5 * layout.safeRect.width;
    const rawY = layout.safeRect.y + (1 - (projected.normalizedY + 1) * 0.5)
      * layout.safeRect.height;
    const placement = Math.abs(projected.normalizedX) <= 1 && Math.abs(projected.normalizedY) <= 1
      ? 'onscreen' as const
      : 'edge-clamped' as const;
    const center = placementCandidates(rawX, rawY, layout.safeRect).find((candidate) => (
      blocked.every((rect) => !intersectsAt(candidate.x, candidate.y, rect))
      && occupied.every((rect) => !intersectsAt(candidate.x, candidate.y, rect))
    )) ?? null;
    if (center === null) return Object.freeze({
      id: anchor.id,
      label: anchor.label,
      accessibilityText: anchor.accessibilityText,
      sourcePosition: anchor.position,
      visibility: 'blocked-by-hud' as const,
      placement: null,
      centerCssPixels: null,
      touchTargetCssPixels: 48 as const,
      depth: projected.depth,
    });
    occupied.push(Object.freeze({
      x: center.x - 24,
      y: center.y - 24,
      width: 48,
      height: 48,
    }));
    return Object.freeze({
      id: anchor.id,
      label: anchor.label,
      accessibilityText: anchor.accessibilityText,
      sourcePosition: anchor.position,
      visibility: 'visible' as const,
      placement,
      centerCssPixels: center,
      touchTargetCssPixels: 48 as const,
      depth: projected.depth,
    });
  });
  return Object.freeze({
    schemaVersion: ARENA_V2_MODE_HUD_WORLD_MARKER_PROJECTION_V1_SCHEMA_VERSION,
    modelIdentity: plan.identity,
    modelRevision: plan.revision,
    markers: Object.freeze(markers),
  });
}

export const ARENA_V2_MODE_HUD_WORLD_MARKER_PROJECTION_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRendererWired: false as const,
  maximumMarkerCount: 3 as const,
  minimumMarkerSizeCssPixels: 48 as const,
  ownsAuthorityState: false as const,
});
