import type {
  ArenaV2UiRectV1,
} from './arena-v2-information-screen-layout-v1.js';
import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';
import {
  ARENA_V2_UI_VISUAL_TOKENS_V1,
  requireArenaV2UiVisualToneTokenV1,
} from './arena-v2-ui-visual-tokens-v1.js';

export interface ArenaV2UiCanvasTextMetricsV1 {
  readonly width: number;
}

export interface ArenaV2UiCanvasPaintPortV1 {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  closePath(): void;
  rect(x: number, y: number, width: number, height: number): void;
  clip(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): ArenaV2UiCanvasTextMetricsV1;
}

export interface ArenaV2UiCanvasPaintResultV1 {
  readonly status: 'painted-candidate';
  readonly productionReady: false;
  readonly identity: string;
  readonly revision: number;
  readonly scrollOffsetCssPixels: number;
  readonly paintedPrimitiveIds: readonly string[];
  readonly clippedPrimitiveIds: readonly string[];
  readonly truncatedTextPrimitiveIds: readonly string[];
  readonly formalAssetIds: readonly [];
}

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name}必须是有限数。`);
  }
  return value;
}

function scrollOffset(plan: ArenaV2UiRenderPlanV1, value: unknown): number {
  const requested = finite(value, 'Arena V2 Canvas scrollOffsetCssPixels');
  if (requested < 0) throw new RangeError('Arena V2 Canvas滚动位置不能为负数。');
  if (plan.scrollRegion === null) {
    if (requested !== 0) throw new RangeError('Arena V2 HUD不接受页面滚动位置。');
    return 0;
  }
  const maximum = Math.max(0, plan.scrollRegion.contentHeight - plan.scrollRegion.viewport.height);
  if (requested > maximum) throw new RangeError('Arena V2 Canvas滚动位置超过内容边界。');
  return requested;
}

function shiftedRect(
  target: ArenaV2UiRectV1,
  clipped: boolean,
  offset: number,
): ArenaV2UiRectV1 {
  return clipped && offset !== 0
    ? Object.freeze({ ...target, y: target.y - offset })
    : target;
}

function roundedRect(
  context: ArenaV2UiCanvasPaintPortV1,
  target: ArenaV2UiRectV1,
  radius: number,
): void {
  const normalizedRadius = Math.min(
    Math.max(0, radius),
    target.width / 2,
    target.height / 2,
  );
  context.beginPath();
  context.moveTo(target.x + normalizedRadius, target.y);
  context.lineTo(target.x + target.width - normalizedRadius, target.y);
  context.quadraticCurveTo(
    target.x + target.width,
    target.y,
    target.x + target.width,
    target.y + normalizedRadius,
  );
  context.lineTo(target.x + target.width, target.y + target.height - normalizedRadius);
  context.quadraticCurveTo(
    target.x + target.width,
    target.y + target.height,
    target.x + target.width - normalizedRadius,
    target.y + target.height,
  );
  context.lineTo(target.x + normalizedRadius, target.y + target.height);
  context.quadraticCurveTo(
    target.x,
    target.y + target.height,
    target.x,
    target.y + target.height - normalizedRadius,
  );
  context.lineTo(target.x, target.y + normalizedRadius);
  context.quadraticCurveTo(target.x, target.y, target.x + normalizedRadius, target.y);
  context.closePath();
}

function fontSize(primitive: Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'text' }>): number {
  if (primitive.role === 'question') return Math.max(22, Math.min(32, primitive.rect.height * 0.32));
  if (primitive.role === 'hud-primary') return Math.max(20, Math.min(30, primitive.rect.height * 0.48));
  if (primitive.role === 'feedback-primary') {
    if (primitive.maximumLines > 1) {
      return Math.max(14, Math.min(
        19,
        primitive.rect.height
          / (primitive.maximumLines * ARENA_V2_UI_VISUAL_TOKENS_V1.typography.lineHeight),
      ));
    }
    return Math.max(17, Math.min(24, primitive.rect.height * 0.62));
  }
  if (primitive.role === 'feedback-kicker') return 11;
  if (primitive.role === 'feedback-learning') return 11;
  if (primitive.role === 'feedback' || primitive.role === 'feedback-secondary') {
    return Math.max(12, Math.min(16, primitive.rect.height * 0.32));
  }
  if (primitive.role === 'label' || primitive.role === 'navigation') return 13;
  return Math.max(14, Math.min(18, primitive.rect.height * 0.28));
}

function lineFits(
  context: ArenaV2UiCanvasPaintPortV1,
  value: string,
  maximumWidth: number,
): boolean {
  return context.measureText(value).width <= maximumWidth;
}

function truncateLine(
  context: ArenaV2UiCanvasPaintPortV1,
  value: string,
  maximumWidth: number,
  forceEllipsis = false,
): string {
  if (!forceEllipsis && lineFits(context, value, maximumWidth)) return value;
  const characters = Array.from(value);
  while (characters.length > 0 && !lineFits(context, `${characters.join('')}…`, maximumWidth)) {
    characters.pop();
  }
  return `${characters.join('')}…`;
}

function wrapText(
  context: ArenaV2UiCanvasPaintPortV1,
  value: string,
  maximumWidth: number,
  maximumLines: number,
): Readonly<{ lines: readonly string[]; truncated: boolean }> {
  const lines: string[] = [];
  let truncated = false;
  const explicitLines = value.split('\n');
  for (const [explicitIndex, explicitLine] of explicitLines.entries()) {
    let current = '';
    const characters = Array.from(explicitLine);
    if (characters.length === 0) {
      lines.push('');
      if (lines.length === maximumLines) {
        truncated = explicitIndex < explicitLines.length - 1;
        break;
      }
      continue;
    }
    for (const character of characters) {
      const candidate = `${current}${character}`;
      if (current.length === 0 || lineFits(context, candidate, maximumWidth)) {
        current = candidate;
        continue;
      }
      lines.push(current);
      current = character;
      if (lines.length === maximumLines) {
        truncated = true;
        break;
      }
    }
    if (truncated) break;
    if (current.length > 0) lines.push(current);
    if (lines.length >= maximumLines && explicitIndex < explicitLines.length - 1) {
      truncated = true;
      break;
    }
  }
  if (lines.length > maximumLines) {
    lines.length = maximumLines;
    truncated = true;
  }
  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = truncateLine(
      context,
      lines[lines.length - 1]!,
      maximumWidth,
      true,
    );
  }
  return Object.freeze({ lines: Object.freeze(lines), truncated });
}

function paintText(
  context: ArenaV2UiCanvasPaintPortV1,
  primitive: Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'text' }>,
  target: ArenaV2UiRectV1,
): boolean {
  const size = fontSize(primitive);
  const tokens = ARENA_V2_UI_VISUAL_TOKENS_V1;
  const lineHeight = size * tokens.typography.lineHeight;
  context.fillStyle = requireArenaV2UiVisualToneTokenV1(primitive.tone).text;
  context.font = `${primitive.fixedWidthNumeric
    ? tokens.typography.canvasNumericWeight
    : tokens.typography.canvasStandardWeight} ${size}px ${
    primitive.fixedWidthNumeric
      ? tokens.typography.numericFontStack
      : tokens.typography.chineseFontStack
  }`;
  context.textAlign = primitive.alignment;
  context.textBaseline = 'top';
  const maximumLinesByHeight = Math.max(1, Math.floor(target.height / lineHeight));
  const wrapped = wrapText(
    context,
    primitive.text,
    Math.max(1, target.width),
    Math.min(primitive.maximumLines, maximumLinesByHeight),
  );
  const x = primitive.alignment === 'center'
    ? target.x + target.width / 2
    : primitive.alignment === 'right'
      ? target.x + target.width
      : target.x;
  const totalHeight = wrapped.lines.length * lineHeight;
  const firstY = target.y + Math.max(0, (target.height - totalHeight) / 2);
  wrapped.lines.forEach((line, index) => {
    context.fillText(line, x, firstY + index * lineHeight);
  });
  return wrapped.truncated;
}

function withClip(
  context: ArenaV2UiCanvasPaintPortV1,
  clipRect: ArenaV2UiRectV1 | null,
  paint: () => void,
): void {
  context.save();
  if (clipRect !== null) {
    context.beginPath();
    context.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
    context.clip();
  }
  paint();
  context.restore();
}

/** Paints the host-agnostic V2 plan through a minimal 2D canvas port. */
export function paintArenaV2UiRenderPlanV1(
  context: ArenaV2UiCanvasPaintPortV1,
  plan: ArenaV2UiRenderPlanV1,
  scrollOffsetCssPixels = 0,
  focusedActionPrimitiveId: string | null = null,
): ArenaV2UiCanvasPaintResultV1 {
  if (plan.schemaVersion !== 1 || plan.productionReady !== false
    || plan.status !== 'layout-candidate') {
    throw new RangeError('Arena V2 Canvas只接受未晋级的RenderPlan V1。');
  }
  for (const primitive of plan.primitives) {
    requireArenaV2UiVisualToneTokenV1(primitive.tone);
  }
  const offset = scrollOffset(plan, scrollOffsetCssPixels);
  const painted: string[] = [];
  const clipped: string[] = [];
  const truncated: string[] = [];
  const ordered = [...plan.primitives].sort((left, right) => (
    left.zIndex - right.zIndex || left.id.localeCompare(right.id)
  ));
  for (const primitive of ordered) {
    const usesScrollClip = primitive.clipRect !== null;
    const target = shiftedRect(primitive.rect, usesScrollClip, offset);
    if (usesScrollClip) clipped.push(primitive.id);
    withClip(context, primitive.clipRect, () => {
      if (primitive.kind === 'panel') {
        roundedRect(context, target, primitive.cornerRadiusCssPixels);
        context.fillStyle = requireArenaV2UiVisualToneTokenV1(primitive.tone).fill;
        context.fill();
        const stroke = primitive.tone === 'primary'
          ? ARENA_V2_UI_VISUAL_TOKENS_V1.strokes.primaryPanel
          : ARENA_V2_UI_VISUAL_TOKENS_V1.strokes.panel;
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.widthCssPixels;
        context.stroke();
      } else if (primitive.kind === 'action') {
        if (primitive.tone !== 'transparent') {
          roundedRect(context, target, ARENA_V2_UI_VISUAL_TOKENS_V1.radiiCssPixels.action);
          context.fillStyle = requireArenaV2UiVisualToneTokenV1(primitive.tone).fill;
          context.fill();
          const actionText: Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'text' }> = {
            kind: 'text', id: `${primitive.id}:label`, rect: target, clipRect: null,
            text: primitive.label, accessibilityText: primitive.accessibilityText,
            tone: primitive.enabled ? 'primary' : 'muted', role: 'navigation', alignment: 'center',
            maximumLines: 2, fixedWidthNumeric: false, zIndex: primitive.zIndex,
          };
          if (paintText(context, actionText, target)) truncated.push(primitive.id);
        }
        if (primitive.id === focusedActionPrimitiveId) {
          roundedRect(context, target, ARENA_V2_UI_VISUAL_TOKENS_V1.radiiCssPixels.action);
          context.strokeStyle = ARENA_V2_UI_VISUAL_TOKENS_V1.strokes.focus.color;
          context.lineWidth = ARENA_V2_UI_VISUAL_TOKENS_V1.strokes.focus.widthCssPixels;
          context.stroke();
        }
      } else if (paintText(context, primitive, target)) {
        truncated.push(primitive.id);
      }
    });
    painted.push(primitive.id);
  }
  return Object.freeze({
    status: 'painted-candidate' as const,
    productionReady: false as const,
    identity: plan.identity,
    revision: plan.revision,
    scrollOffsetCssPixels: offset,
    paintedPrimitiveIds: Object.freeze(painted),
    clippedPrimitiveIds: Object.freeze(clipped),
    truncatedTextPrimitiveIds: Object.freeze(truncated),
    formalAssetIds: [] as const,
  });
}

export const ARENA_V2_UI_CANVAS_PAINTER_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  visualTokenContractId: ARENA_V2_UI_VISUAL_TOKENS_V1.id,
  usesDom: false as const,
  usesThree: false as const,
  formalVisualAssetsReady: false as const,
});
