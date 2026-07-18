const COLOR = Object.freeze({
  paper: '#F2EEE5',
  ink: '#253238',
  muted: '#6E7778',
  coral: '#E85D4A',
  coralDark: '#B93E33',
  teal: '#16A6A1',
  tealDark: '#0B7775',
  cream: '#FFF9EE',
  white: '#FFFFFF',
  line: 'rgba(37,50,56,0.16)',
});

function roundedRect(context, target, radius) {
  const r = Math.min(Math.max(0, radius), target.width / 2, target.height / 2);
  context.beginPath();
  context.moveTo(target.x + r, target.y);
  context.lineTo(target.x + target.width - r, target.y);
  context.quadraticCurveTo(
    target.x + target.width,
    target.y,
    target.x + target.width,
    target.y + r,
  );
  context.lineTo(target.x + target.width, target.y + target.height - r);
  context.quadraticCurveTo(
    target.x + target.width,
    target.y + target.height,
    target.x + target.width - r,
    target.y + target.height,
  );
  context.lineTo(target.x + r, target.y + target.height);
  context.quadraticCurveTo(
    target.x,
    target.y + target.height,
    target.x,
    target.y + target.height - r,
  );
  context.lineTo(target.x, target.y + r);
  context.quadraticCurveTo(target.x, target.y, target.x + r, target.y);
  context.closePath();
}

function font(size, weight = 700) {
  return `${weight} ${Math.max(10, size)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
}

function drawLine(context, startX, startY, endX, endY, color, width) {
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
}

function drawCharacter(context, characterId, centerX, bottomY, scale = 1, facing = 1) {
  const isCube = characterId === 'wind-up-cube';
  if (isCube) {
    const size = 84 * scale;
    const body = {
      x: centerX - size / 2,
      y: bottomY - size,
      width: size,
      height: size,
    };
    roundedRect(context, body, 18 * scale);
    context.fillStyle = COLOR.teal;
    context.fill();
    context.strokeStyle = COLOR.ink;
    context.lineWidth = Math.max(2, 4 * scale);
    context.stroke();
    context.fillStyle = COLOR.cream;
    context.beginPath();
    context.arc(centerX - 18 * scale, bottomY - 51 * scale, 6 * scale, 0, Math.PI * 2);
    context.arc(centerX + 18 * scale, bottomY - 51 * scale, 6 * scale, 0, Math.PI * 2);
    context.fill();
    drawLine(
      context,
      centerX - 15 * scale,
      bottomY - 27 * scale,
      centerX + 15 * scale,
      bottomY - 27 * scale,
      COLOR.cream,
      4 * scale,
    );
    drawLine(
      context,
      centerX,
      bottomY - size,
      centerX,
      bottomY - size - 24 * scale,
      COLOR.ink,
      4 * scale,
    );
    context.beginPath();
    context.arc(centerX, bottomY - size - 29 * scale, 8 * scale, 0, Math.PI * 2);
    context.fillStyle = COLOR.coral;
    context.fill();
    return;
  }

  const headY = bottomY - 112 * scale;
  context.beginPath();
  context.arc(centerX + 7 * facing * scale, headY, 25 * scale, 0, Math.PI * 2);
  context.fillStyle = '#FFD2AA';
  context.fill();
  context.strokeStyle = COLOR.ink;
  context.lineWidth = Math.max(2, 3 * scale);
  context.stroke();
  context.beginPath();
  context.moveTo(centerX - 18 * scale, headY - 12 * scale);
  context.lineTo(centerX + 8 * facing * scale, headY - 32 * scale);
  context.lineTo(centerX + 32 * facing * scale, headY - 8 * scale);
  context.closePath();
  context.fillStyle = COLOR.coral;
  context.fill();

  context.beginPath();
  context.moveTo(centerX - 30 * scale, bottomY - 90 * scale);
  context.lineTo(centerX + 28 * scale, bottomY - 88 * scale);
  context.lineTo(centerX + 20 * scale, bottomY - 33 * scale);
  context.lineTo(centerX - 22 * scale, bottomY - 35 * scale);
  context.closePath();
  context.fillStyle = COLOR.coral;
  context.fill();
  context.strokeStyle = COLOR.ink;
  context.stroke();
  drawLine(
    context,
    centerX - 12 * scale,
    bottomY - 36 * scale,
    centerX - 34 * facing * scale,
    bottomY,
    COLOR.ink,
    8 * scale,
  );
  drawLine(
    context,
    centerX + 13 * scale,
    bottomY - 36 * scale,
    centerX + 35 * facing * scale,
    bottomY - 4 * scale,
    COLOR.ink,
    8 * scale,
  );
  drawLine(
    context,
    centerX - 21 * scale,
    bottomY - 78 * scale,
    centerX - 48 * facing * scale,
    bottomY - 54 * scale,
    COLOR.tealDark,
    8 * scale,
  );
}

function drawPaper(context, viewport, layout) {
  context.fillStyle = COLOR.paper;
  context.fillRect(0, 0, viewport.width, viewport.height);
  const railX = layout.safe.x + 13 * layout.scale;
  drawLine(
    context,
    railX,
    layout.safe.y + 20 * layout.scale,
    railX,
    layout.safe.y + layout.safe.height - 20 * layout.scale,
    COLOR.line,
    Math.max(1, layout.scale),
  );
  context.fillStyle = 'rgba(22,166,161,0.06)';
  for (let y = layout.safe.y + 10; y < layout.safe.y + layout.safe.height; y += 48 * layout.scale) {
    context.fillRect(layout.safe.x, y, layout.safe.width, Math.max(1, layout.scale * 0.5));
  }
}

function drawHeader(context, model, layout) {
  const { header, scale } = layout;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillStyle = COLOR.tealDark;
  context.font = font(11 * scale, 800);
  context.fillText(model.kicker, header.x, header.y);
  context.fillStyle = COLOR.ink;
  context.font = font(34 * scale, 900);
  context.fillText(model.title, header.x, header.y + 24 * scale);
  drawLine(
    context,
    header.x,
    header.y + 68 * scale,
    header.x + Math.min(header.width, 94 * scale),
    header.y + 68 * scale,
    COLOR.coral,
    5 * scale,
  );
  if (model.body) {
    context.fillStyle = COLOR.muted;
    context.font = font(15 * scale, 600);
    context.fillText(model.body, header.x, header.y + 82 * scale);
  }
}

function drawHome(context, layout) {
  const { visual, scale } = layout;
  const floorY = visual.y + visual.height * 0.82;
  const center = visual.x + visual.width / 2;
  context.fillStyle = 'rgba(255,255,255,0.66)';
  roundedRect(context, {
    x: visual.x + 4 * scale,
    y: visual.y + 8 * scale,
    width: visual.width - 8 * scale,
    height: Math.max(1, visual.height - 16 * scale),
  }, 28 * scale);
  context.fill();
  drawCharacter(context, 'parkour-apprentice', center - 62 * scale, floorY, scale * 0.9, 1);
  drawCharacter(context, 'wind-up-cube', center + 72 * scale, floorY, scale * 0.86, -1);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = COLOR.ink;
  context.font = font(14 * scale, 800);
  context.fillText('1V1  ·  装备  ·  地图  ·  击飞', center, visual.y + visual.height - 22 * scale);
}

function drawCharacterCards(context, layout) {
  for (const card of layout.cards) {
    roundedRect(context, card.rect, 20 * layout.scale);
    context.fillStyle = card.selected ? 'rgba(22,166,161,0.16)' : 'rgba(255,255,255,0.72)';
    context.fill();
    context.strokeStyle = card.selected ? COLOR.teal : COLOR.line;
    context.lineWidth = card.selected ? 4 * layout.scale : 2 * layout.scale;
    context.stroke();
    drawCharacter(
      context,
      card.id,
      card.rect.x + card.rect.width / 2,
      card.rect.y + card.rect.height - 48 * layout.scale,
      layout.scale * 0.72,
    );
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = COLOR.ink;
    context.font = font(15 * layout.scale, 800);
    context.fillText(
      card.name,
      card.rect.x + card.rect.width / 2,
      card.rect.y + card.rect.height - 20 * layout.scale,
    );
  }
}

function drawMatching(context, model, layout) {
  const { visual, scale } = layout;
  const centerX = visual.x + visual.width / 2;
  const floorY = visual.y + visual.height * 0.72;
  drawCharacter(
    context,
    model.selectedCharacter?.id ?? 'parkour-apprentice',
    centerX - 78 * scale,
    floorY,
    scale * 0.8,
    1,
  );
  drawCharacter(context, 'wind-up-cube', centerX + 78 * scale, floorY, scale * 0.76, -1);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = COLOR.coral;
  context.font = font(34 * scale, 900);
  context.fillText('VS', centerX, visual.y + visual.height * 0.42);
  context.fillStyle = COLOR.ink;
  context.font = font(13 * scale, 800);
  context.fillText(model.selectedCharacter?.name ?? '挑战者', centerX - 78 * scale, floorY + 26 * scale);
  context.fillText(model.opponentName, centerX + 78 * scale, floorY + 26 * scale);
}

function drawResult(context, model, layout) {
  const { visual, scale } = layout;
  const centerX = visual.x + visual.width / 2;
  const centerY = visual.y + visual.height / 2;
  const mark = model.outcome === 'win' ? 'WIN' : model.outcome === 'draw' ? 'DRAW' : 'NEXT';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = model.outcome === 'win' ? COLOR.coral : COLOR.teal;
  context.font = font(54 * scale, 900);
  context.fillText(mark, centerX, centerY - 70 * scale);
  drawCharacter(
    context,
    model.selectedCharacter?.id ?? 'parkour-apprentice',
    centerX,
    centerY + 92 * scale,
    scale * 0.88,
  );
  if (model.experienceDelta !== null) {
    context.fillStyle = COLOR.ink;
    context.font = font(18 * scale, 900);
    context.fillText(`EXP +${model.experienceDelta}`, centerX, visual.y + visual.height - 22 * scale);
  }
}

function drawUnlock(context, model, layout) {
  const { visual, scale } = layout;
  const centerX = visual.x + visual.width / 2;
  const centerY = visual.y + visual.height / 2;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = COLOR.coral;
  context.font = font(20 * scale, 900);
  context.fillText('NEW', centerX, centerY - 96 * scale);
  drawCharacter(
    context,
    model.unlock?.id ?? 'wind-up-cube',
    centerX,
    centerY + 54 * scale,
    scale * 0.9,
  );
  context.fillStyle = COLOR.ink;
  context.font = font(18 * scale, 900);
  context.fillText(model.unlock?.name ?? '新内容', centerX, centerY + 92 * scale);
}

function drawStatus(context, model, layout) {
  const { visual, scale } = layout;
  const centerX = visual.x + visual.width / 2;
  const centerY = visual.y + visual.height / 2;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const isError = model.scene.includes('error');
  context.fillStyle = isError ? COLOR.coral : COLOR.teal;
  context.beginPath();
  context.arc(centerX, centerY - 34 * scale, 38 * scale, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLOR.white;
  context.font = font(30 * scale, 900);
  context.fillText(isError ? '!' : '•••', centerX, centerY - 34 * scale);
  context.fillStyle = COLOR.muted;
  context.font = font(14 * scale, 700);
  context.fillText(
    model.errorMessage || model.body || model.announcement,
    centerX,
    centerY + 42 * scale,
  );
}

function drawVisual(context, model, layout) {
  if (model.scene === 'home') drawHome(context, layout);
  else if (model.scene === 'character-select') drawCharacterCards(context, layout);
  else if (model.scene === 'matching') drawMatching(context, model, layout);
  else if (model.scene === 'result' || model.scene === 'reward') drawResult(context, model, layout);
  else if (model.scene === 'unlock') drawUnlock(context, model, layout);
  else drawStatus(context, model, layout);
}

function drawActions(context, layout) {
  for (const action of layout.actions) {
    roundedRect(context, action.rect, action.rect.height / 2);
    if (!action.enabled) context.fillStyle = 'rgba(110,119,120,0.34)';
    else context.fillStyle = action.kind === 'primary' ? COLOR.coral : COLOR.cream;
    context.fill();
    context.strokeStyle = action.kind === 'primary' ? COLOR.coralDark : COLOR.ink;
    context.lineWidth = Math.max(1, 2 * layout.scale);
    context.stroke();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = action.kind === 'primary' ? COLOR.white : COLOR.ink;
    context.font = font(17 * layout.scale, 900);
    context.fillText(
      action.label,
      action.rect.x + action.rect.width / 2,
      action.rect.y + action.rect.height / 2,
    );
  }
}

export function paintProductCanvasScene(context, model, layout, viewport) {
  if (!context || !model || !layout || !viewport) {
    throw new TypeError('paintProductCanvasScene 需要 context、model、layout 与 viewport。');
  }
  drawPaper(context, viewport, layout);
  drawHeader(context, model, layout);
  drawVisual(context, model, layout);
  drawActions(context, layout);
}
