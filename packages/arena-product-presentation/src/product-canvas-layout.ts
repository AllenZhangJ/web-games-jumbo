import {
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ProductUiSceneCharacterCard,
  ProductUiSceneModel,
} from './product-ui-scene-model.js';
import { isTrustedProductUiSceneModel } from './product-ui-scene-model-trust.js';

export interface ProductCanvasRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ProductCanvasPoint {
  readonly x: number;
  readonly y: number;
}

export interface ProductCanvasLayout {
  readonly safe: ProductCanvasRect;
  readonly scale: number;
  readonly header: ProductCanvasRect;
  readonly visual: ProductCanvasRect;
  readonly actions: readonly Readonly<{
    kind: 'primary' | 'secondary';
    label: string;
    enabled: boolean;
    intent: Readonly<Record<string, unknown>>;
    rect: ProductCanvasRect;
  }>[];
  readonly cards: readonly Readonly<ProductUiSceneCharacterCard & {
    rect: ProductCanvasRect;
  }>[];
  readonly hits: readonly Readonly<{
    kind: 'character' | 'primary' | 'secondary';
    rect: ProductCanvasRect;
    intent: Readonly<Record<string, unknown>>;
  }>[];
}

function finite(value: unknown, fallback = 0): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function rect(x: number, y: number, width: number, height: number): ProductCanvasRect {
  return Object.freeze({ x, y, width, height });
}

function ownFiniteNumber(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object') return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || !Number.isFinite(descriptor.value)) {
    return null;
  }
  return descriptor.value as number;
}

function viewportRecord(value: unknown): PlainRecord {
  return assertPlainRecord(
    cloneFrozenData(value, 'Product Canvas viewport'),
    'Product Canvas viewport',
  );
}

function normalizeSafeRect(viewportValue: unknown): ProductCanvasRect {
  const viewport = viewportRecord(viewportValue);
  const width = Math.max(1, finite(viewport.width, 1));
  const height = Math.max(1, finite(viewport.height, 1));
  const safe = viewport.safeArea === null || viewport.safeArea === undefined
    ? {}
    : assertPlainRecord(viewport.safeArea, 'Product Canvas viewport.safeArea');
  const left = Math.max(0, Math.min(width - 1, finite(safe.left, 0)));
  const top = Math.max(0, Math.min(height - 1, finite(safe.top, 0)));
  const right = Math.max(left + 1, Math.min(width, finite(
    safe.right,
    safe.width !== null && safe.width !== undefined
      ? left + finite(safe.width, width - left)
      : width,
  )));
  const bottom = Math.max(top + 1, Math.min(height, finite(
    safe.bottom,
    safe.height !== null && safe.height !== undefined
      ? top + finite(safe.height, height - top)
      : height,
  )));
  return rect(left, top, right - left, bottom - top);
}

function sceneModel(value: unknown): ProductUiSceneModel {
  if (isTrustedProductUiSceneModel(value)) return value;
  const clone = cloneFrozenData(value, 'Product Canvas scene model');
  const source = assertPlainRecord(clone, 'Product Canvas scene model');
  if (!Array.isArray(source.characterCards)) {
    throw new TypeError('Product Canvas scene model.characterCards 必须是数组。');
  }
  if (typeof source.scene !== 'string' || typeof source.body !== 'string') {
    throw new TypeError('Product Canvas scene model 的 scene/body 无效。');
  }
  return clone as unknown as ProductUiSceneModel;
}

function actionLayout(
  model: ProductUiSceneModel,
  safe: ProductCanvasRect,
  scale: number,
): ProductCanvasLayout['actions'] {
  const actions = [
    { action: model.primaryAction, kind: 'primary' as const },
    { action: model.secondaryAction, kind: 'secondary' as const },
  ].filter((entry): entry is {
    action: NonNullable<typeof entry.action>;
    kind: typeof entry.kind;
  } => entry.action !== null);
  if (actions.length === 0) return Object.freeze([]);
  const gap = 10 * scale;
  const buttonHeight = Math.max(52, 58 * scale);
  const maximumWidth = Math.max(1, Math.min(380 * scale, safe.width - 28 * scale));
  const x = safe.x + (safe.width - maximumWidth) / 2;
  const bottom = safe.y + safe.height - 18 * scale;
  return Object.freeze(actions.map(({ action, kind }, index) => Object.freeze({
    kind,
    label: action.label,
    enabled: action.enabled,
    intent: action.intent,
    rect: rect(
      x,
      bottom - (index + 1) * buttonHeight - index * gap,
      maximumWidth,
      buttonHeight,
    ),
  })));
}

function cardLayout(
  model: ProductUiSceneModel,
  visual: ProductCanvasRect,
  scale: number,
): ProductCanvasLayout['cards'] {
  if (model.scene !== 'character-select' || model.characterCards.length === 0) {
    return Object.freeze([]);
  }
  const gap = 12 * scale;
  const count = model.characterCards.length;
  const columns = Math.min(2, count);
  const cardWidth = (visual.width - gap * (columns - 1)) / columns;
  const cardHeight = Math.min(230 * scale, visual.height);
  return Object.freeze(model.characterCards.map((card, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    return Object.freeze({
      ...card,
      rect: rect(
        visual.x + column * (cardWidth + gap),
        visual.y + row * (cardHeight + gap),
        cardWidth,
        cardHeight,
      ),
    });
  }));
}

export function createProductCanvasLayout(
  modelValue: unknown,
  viewportValue: unknown,
): ProductCanvasLayout {
  const model = sceneModel(modelValue);
  const safe = normalizeSafeRect(viewportValue);
  const scale = Math.max(0.72, Math.min(1.35, Math.min(safe.width / 430, safe.height / 820)));
  const actions = actionLayout(model, safe, scale);
  const actionTop = actions.length === 0
    ? safe.y + safe.height - 24 * scale
    : Math.min(...actions.map((action) => action.rect.y)) - 14 * scale;
  const headerHeight = model.body ? 118 * scale : 88 * scale;
  const header = rect(
    safe.x + 28 * scale,
    safe.y + 24 * scale,
    Math.max(1, safe.width - 56 * scale),
    headerHeight,
  );
  const visualTop = header.y + header.height + 14 * scale;
  const visual = rect(
    safe.x + 24 * scale,
    visualTop,
    Math.max(1, safe.width - 48 * scale),
    Math.max(1, actionTop - visualTop),
  );
  const cards = cardLayout(model, visual, scale);
  const hits: ProductCanvasLayout['hits'] = Object.freeze([
    ...cards.filter(({ enabled }) => enabled).map((card) => Object.freeze({
      kind: 'character' as const,
      rect: card.rect,
      intent: card.intent,
    })),
    ...actions.filter(({ enabled }) => enabled).map((action) => Object.freeze({
      kind: action.kind,
      rect: action.rect,
      intent: action.intent,
    })),
  ]);
  return Object.freeze({ safe, scale, header, visual, actions, cards, hits });
}

export function pointInProductCanvasRect(
  pointValue: unknown,
  targetValue: unknown,
): boolean {
  const pointX = ownFiniteNumber(pointValue, 'x');
  const pointY = ownFiniteNumber(pointValue, 'y');
  const targetX = ownFiniteNumber(targetValue, 'x');
  const targetY = ownFiniteNumber(targetValue, 'y');
  const targetWidth = ownFiniteNumber(targetValue, 'width');
  const targetHeight = ownFiniteNumber(targetValue, 'height');
  if (
    pointX === null
    || pointY === null
    || targetX === null
    || targetY === null
    || targetWidth === null
    || targetHeight === null
  ) {
    return false;
  }
  if (targetWidth < 0 || targetHeight < 0) return false;
  return pointX >= targetX
    && pointX <= targetX + targetWidth
    && pointY >= targetY
    && pointY <= targetY + targetHeight;
}
