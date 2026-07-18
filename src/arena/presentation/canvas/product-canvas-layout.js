function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function rect(x, y, width, height) {
  return Object.freeze({ x, y, width, height });
}

function normalizeSafeRect(viewport) {
  const width = Math.max(1, finite(viewport?.width, 1));
  const height = Math.max(1, finite(viewport?.height, 1));
  const safe = viewport?.safeArea ?? {};
  const left = Math.max(0, Math.min(width - 1, finite(safe.left, 0)));
  const top = Math.max(0, Math.min(height - 1, finite(safe.top, 0)));
  const right = Math.max(left + 1, Math.min(width, finite(
    safe.right,
    safe.width != null ? left + finite(safe.width, width - left) : width,
  )));
  const bottom = Math.max(top + 1, Math.min(height, finite(
    safe.bottom,
    safe.height != null ? top + finite(safe.height, height - top) : height,
  )));
  return rect(left, top, right - left, bottom - top);
}

function actionLayout(model, safe, scale) {
  const actions = [
    { action: model.primaryAction, kind: 'primary' },
    { action: model.secondaryAction, kind: 'secondary' },
  ].filter(({ action }) => action !== null && action !== undefined);
  if (actions.length === 0) return Object.freeze([]);
  const gap = 10 * scale;
  const buttonHeight = Math.max(52, 58 * scale);
  const maximumWidth = Math.min(380 * scale, safe.width - 28 * scale);
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

function cardLayout(model, visual, scale) {
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

export function createProductCanvasLayout(model, viewport) {
  if (!model || typeof model !== 'object') throw new TypeError('Canvas Product layout 需要 scene model。');
  const safe = normalizeSafeRect(viewport);
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
  const hits = [
    ...cards.filter(({ enabled }) => enabled).map((card) => Object.freeze({
      kind: 'character',
      rect: card.rect,
      intent: card.intent,
    })),
    ...actions.filter(({ enabled }) => enabled).map((action) => Object.freeze({
      kind: action.kind,
      rect: action.rect,
      intent: action.intent,
    })),
  ];
  return Object.freeze({ safe, scale, header, visual, actions, cards, hits: Object.freeze(hits) });
}

export function pointInProductCanvasRect(point, target) {
  return point.x >= target.x
    && point.x <= target.x + target.width
    && point.y >= target.y
    && point.y <= target.y + target.height;
}
