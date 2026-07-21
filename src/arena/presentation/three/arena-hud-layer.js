import * as THREE from 'three';
import {
  DEFAULT_ARENA_CONTROL_LAYOUT,
  actionButtonRadius,
} from '../input/control-layout.js';
import { disposeThreeObject } from './dispose-three-resources.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeSafeRect(viewport) {
  const width = Math.max(1, finite(viewport.width, 1));
  const height = Math.max(1, finite(viewport.height, 1));
  const safe = viewport.safeArea ?? {};
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
  return Object.freeze({ left, top, right, bottom, width: right - left, height: bottom - top });
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(Math.max(0, radius), width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function createSurface(platform) {
  if (typeof platform?.createOffscreenCanvas !== 'function') {
    throw new TypeError('ArenaHudLayer 需要 createOffscreenCanvas。');
  }
  let canvas;
  try {
    canvas = platform.createOffscreenCanvas(2, 2);
  } catch {
    canvas = platform.createOffscreenCanvas({ width: 2, height: 2 });
  }
  const context = canvas?.getContext?.('2d');
  const required = [
    'setTransform',
    'clearRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'quadraticCurveTo',
    'closePath',
    'fill',
    'stroke',
    'arc',
    'fillRect',
    'fillText',
  ];
  if (!context || required.some((name) => typeof context[name] !== 'function')) {
    throw new Error('Arena HUD 需要完整的 2D Canvas 文本与路径能力。');
  }
  return { canvas, context };
}

function font(size, weight = 700) {
  return `${weight} ${Math.max(10, size)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
}

function drawLives(context, { x, y, lives, align, color, scale }) {
  const radius = 7 * scale;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = lives > 0 ? color : 'rgba(38,50,56,0.16)';
  context.fill();
  context.font = font(14 * scale, 800);
  context.textBaseline = 'middle';
  context.textAlign = align === 'right' ? 'right' : 'left';
  context.fillStyle = '#263238';
  context.fillText(
    `×${lives}`,
    x + (align === 'right' ? -12 : 12) * scale,
    y + 0.5 * scale,
  );
}

function drawControlRing(context, x, y, radius, { active = false } = {}) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = active ? 'rgba(22,166,161,0.14)' : 'rgba(255,255,255,0.22)';
  context.fill();
  context.strokeStyle = active ? 'rgba(22,166,161,0.68)' : 'rgba(38,50,56,0.22)';
  context.lineWidth = Math.max(2, radius * 0.035);
  context.stroke();
}

function presentationSignature(frame, state) {
  const localId = frame?.hud?.local?.participantId;
  const opponentId = frame?.hud?.opponent?.participantId;
  const local = frame?.world?.participants?.find?.(({ id }) => id === localId);
  const opponent = frame?.world?.participants?.find?.(({ id }) => id === opponentId);
  return JSON.stringify([
    frame?.source?.matchSeed,
    frame?.phase,
    frame?.hud?.remainingSeconds,
    frame?.hud?.local?.lives,
    frame?.hud?.opponent?.lives,
    frame?.hud?.opponent?.displayName,
    frame?.hud?.action?.definitionId,
    frame?.hud?.action?.available,
    frame?.hud?.result,
    local ? [Math.round(local.position.x * 2), Math.round(local.position.z * 2)] : null,
    opponent ? [Math.round(opponent.position.x * 2), Math.round(opponent.position.z * 2)] : null,
    state.mode,
    state.mapperLabel,
  ]);
}

function drawOffscreenOpponent(context, frame, safe, scale) {
  const local = frame.world.participants.find(({ id }) => id === frame.hud.local.participantId);
  const opponent = frame.world.participants.find(({ id }) => id === frame.hud.opponent.participantId);
  if (!local || !opponent || opponent.status !== 'active') return;
  const dx = opponent.position.x - local.position.x;
  const dz = opponent.position.z - local.position.z;
  const distance = Math.hypot(dx, dz);
  const localWindowRadius = safe.width < safe.height ? 4.2 : 6;
  if (distance <= localWindowRadius) return;
  const nx = dx / distance;
  const ny = -dz / distance;
  const centerX = safe.left + safe.width / 2;
  const centerY = safe.top + safe.height / 2;
  const edgeX = Math.max(34 * scale, safe.width / 2 - 28 * scale);
  const edgeY = Math.max(64 * scale, safe.height / 2 - 118 * scale);
  const ratio = Math.min(
    edgeX / Math.max(0.001, Math.abs(nx)),
    edgeY / Math.max(0.001, Math.abs(ny)),
  );
  const x = centerX + nx * ratio;
  const y = centerY + ny * ratio;
  const tipX = x + nx * 13 * scale;
  const tipY = y + ny * 13 * scale;
  const baseX = x - nx * 9 * scale;
  const baseY = y - ny * 9 * scale;
  const px = -ny;
  const py = nx;
  context.beginPath();
  context.moveTo(tipX, tipY);
  context.lineTo(baseX + px * 9 * scale, baseY + py * 9 * scale);
  context.lineTo(baseX - px * 9 * scale, baseY - py * 9 * scale);
  context.closePath();
  context.fillStyle = 'rgba(22,166,161,0.94)';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.9)';
  context.lineWidth = Math.max(1.5, 2 * scale);
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = ny > 0.45 ? 'top' : 'bottom';
  context.fillStyle = '#263238';
  context.font = font(11 * scale, 800);
  context.fillText(`对手 ${Math.round(distance)}m`, x, y + (ny > 0.45 ? 18 : -17) * scale);
}

export class ArenaHudLayer {
  #canvas;
  #context;
  #texture;
  #viewport;
  #safeRect;
  #textureScale;
  #frame;
  #state;
  #signature;
  #rematchRect;
  #disposed;

  constructor(platform) {
    const surface = createSurface(platform);
    this.#canvas = surface.canvas;
    this.#context = surface.context;
    this.#texture = new THREE.CanvasTexture(this.#canvas);
    this.#texture.name = 'ArenaHudTexture';
    this.#texture.colorSpace = THREE.SRGBColorSpace;
    this.#texture.minFilter = THREE.LinearFilter;
    this.#texture.magFilter = THREE.LinearFilter;
    this.#texture.generateMipmaps = false;
    this.scene = new THREE.Scene();
    this.scene.name = 'ArenaHudScene';
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    this.camera.position.z = 1;
    const material = new THREE.MeshBasicMaterial({
      map: this.#texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    this.quad.name = 'ArenaHudQuad';
    this.quad.renderOrder = 1000;
    this.scene.add(this.quad);
    this.#viewport = Object.freeze({ width: 1, height: 1, pixelRatio: 1, safeArea: null });
    this.#safeRect = normalizeSafeRect(this.#viewport);
    this.#textureScale = 1;
    this.#frame = null;
    this.#state = Object.freeze({ mode: 'match', mapperLabel: '' });
    this.#signature = '';
    this.#rematchRect = null;
    this.#disposed = false;
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('ArenaHudLayer 已销毁。');
  }

  resize(viewport) {
    this.#assertUsable();
    const width = Math.max(1, finite(viewport?.width, 1));
    const height = Math.max(1, finite(viewport?.height, 1));
    const pixelRatio = Math.max(0.5, Math.min(2, finite(viewport?.pixelRatio, 1)));
    const textureScale = Math.max(0.5, Math.min(
      pixelRatio,
      ARENA_GREYBOX_DESIGN.maximumHudTextureSide / Math.max(width, height),
    ));
    this.#viewport = Object.freeze({
      width,
      height,
      pixelRatio,
      safeArea: viewport?.safeArea ?? null,
    });
    this.#safeRect = normalizeSafeRect(this.#viewport);
    this.#textureScale = textureScale;
    this.#canvas.width = Math.max(1, Math.round(width * textureScale));
    this.#canvas.height = Math.max(1, Math.round(height * textureScale));
    this.#texture.needsUpdate = true;
    this.#signature = '';
    this.#draw();
  }

  sync(frame, state = {}) {
    this.#assertUsable();
    this.#frame = frame;
    this.#state = Object.freeze({
      mode: typeof state.mode === 'string' ? state.mode : 'match',
      mapperLabel: typeof state.mapperLabel === 'string' ? state.mapperLabel : '',
    });
    this.#draw();
  }

  #drawTop(context, frame, scale) {
    const safe = this.#safeRect;
    const pad = 18 * scale;
    const y = safe.top + 24 * scale;
    const centerX = safe.left + safe.width / 2;
    context.textBaseline = 'middle';
    context.fillStyle = '#263238';
    context.font = font(18 * scale, 800);
    context.textAlign = 'left';
    context.fillText('YOU', safe.left + pad, y);
    drawLives(context, {
      x: safe.left + pad,
      y: y + 25 * scale,
      lives: frame.hud.local.lives,
      align: 'left',
      color: '#E53935',
      scale,
    });
    context.textAlign = 'right';
    context.fillText(frame.hud.opponent.displayName, safe.right - pad, y);
    drawLives(context, {
      x: safe.right - pad,
      y: y + 25 * scale,
      lives: frame.hud.opponent.lives,
      align: 'right',
      color: '#16A6A1',
      scale,
    });

    const pillWidth = 116 * scale;
    const pillHeight = 44 * scale;
    roundedRect(context, centerX - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, 22 * scale);
    context.fillStyle = 'rgba(255,255,255,0.82)';
    context.fill();
    context.strokeStyle = 'rgba(38,50,56,0.10)';
    context.lineWidth = Math.max(1, 1.5 * scale);
    context.stroke();
    context.textAlign = 'center';
    context.fillStyle = '#263238';
    context.font = font(17 * scale, 800);
    const seconds = frame.hud.remainingSeconds;
    context.fillText(`${frame.hud.phaseLabel}  ${seconds}s`, centerX, y + 1 * scale);
  }

  #drawControls(context, frame, scale) {
    const safe = this.#safeRect;
    const radius = Math.max(42, Math.min(72, Math.min(safe.width, safe.height) * 0.09));
    const bottom = safe.bottom - Math.max(24, 28 * scale) - radius;
    const moveX = safe.left + Math.max(radius + 18, safe.width * 0.2);
    drawControlRing(context, moveX, bottom, radius);
    context.beginPath();
    context.arc(moveX, bottom, radius * 0.34, 0, Math.PI * 2);
    context.fillStyle = 'rgba(38,50,56,0.22)';
    context.fill();
    const actionRadius = actionButtonRadius({
      width: this.#viewport.width,
      height: this.#viewport.height,
    });
    const actionX = this.#viewport.width * DEFAULT_ARENA_CONTROL_LAYOUT.primaryCenterXFraction;
    const actionY = this.#viewport.height * DEFAULT_ARENA_CONTROL_LAYOUT.primaryCenterYFraction;
    const jumpX = this.#viewport.width * DEFAULT_ARENA_CONTROL_LAYOUT.jumpCenterXFraction;
    const jumpY = this.#viewport.height * DEFAULT_ARENA_CONTROL_LAYOUT.jumpCenterYFraction;
    drawControlRing(context, actionX, actionY, actionRadius, {
      active: frame.hud.action.available,
    });
    context.beginPath();
    context.arc(actionX, actionY, actionRadius * 0.75, 0, Math.PI * 2);
    context.fillStyle = frame.hud.action.available
      ? 'rgba(229,57,53,0.88)'
      : 'rgba(112,121,128,0.52)';
    context.fill();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#FFFFFF';
    context.font = font(Math.max(13, actionRadius * 0.24), 800);
    context.fillText(frame.hud.action.label, actionX, actionY);
    drawControlRing(context, jumpX, jumpY, actionRadius * 0.86, { active: true });
    context.beginPath();
    context.arc(jumpX, jumpY, actionRadius * 0.62, 0, Math.PI * 2);
    context.fillStyle = 'rgba(22,166,161,0.88)';
    context.fill();
    context.fillStyle = '#FFFFFF';
    context.font = font(Math.max(12, actionRadius * 0.22), 800);
    context.fillText('跳跃', jumpX, jumpY);
    if (this.#state.mapperLabel) {
      context.fillStyle = 'rgba(38,50,56,0.5)';
      context.font = font(12 * scale, 600);
      context.fillText(this.#state.mapperLabel, safe.left + safe.width / 2, safe.bottom - 20 * scale);
    }
  }

  #drawOverlay(context, frame, scale) {
    const safe = this.#safeRect;
    const centerX = safe.left + safe.width / 2;
    const centerY = safe.top + safe.height / 2;
    if (this.#state.mode === 'matching') {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#263238';
      context.font = font(30 * scale, 900);
      context.fillText('正在匹配对手', centerX, centerY - 18 * scale);
      context.fillStyle = 'rgba(38,50,56,0.58)';
      context.font = font(15 * scale, 600);
      context.fillText('准备争夺神器并把对手击出平台', centerX, centerY + 24 * scale);
      return;
    }
    if (frame.phase === 'preparing') {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#263238';
      context.font = font(42 * scale, 900);
      context.fillText('准备', centerX, centerY - 14 * scale);
      context.fillStyle = 'rgba(38,50,56,0.58)';
      context.font = font(16 * scale, 650);
      context.fillText('左摇杆移动 · 红键攻击 · 青键跳跃', centerX, centerY + 30 * scale);
      return;
    }
    if (frame.phase !== 'ended') return;
    context.fillStyle = 'rgba(38,50,56,0.28)';
    context.fillRect(0, 0, this.#viewport.width, this.#viewport.height);
    const modalWidth = Math.min(safe.width - 28 * scale, 420 * scale);
    const modalHeight = 220 * scale;
    const modalX = centerX - modalWidth / 2;
    const modalY = centerY - modalHeight / 2;
    roundedRect(context, modalX, modalY, modalWidth, modalHeight, 28 * scale);
    context.fillStyle = 'rgba(255,255,255,0.94)';
    context.fill();
    const result = frame.hud.result;
    const won = result?.winnerId === frame.hud.local.participantId;
    const title = result?.isDraw ? '平局' : won ? '胜利' : '再接再厉';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = won ? '#E53935' : '#263238';
    context.font = font(36 * scale, 900);
    context.fillText(title, centerX, modalY + 58 * scale);
    const buttonWidth = Math.min(modalWidth - 48 * scale, 250 * scale);
    const buttonHeight = 58 * scale;
    this.#rematchRect = Object.freeze({
      x: centerX - buttonWidth / 2,
      y: modalY + modalHeight - buttonHeight - 28 * scale,
      width: buttonWidth,
      height: buttonHeight,
    });
    roundedRect(
      context,
      this.#rematchRect.x,
      this.#rematchRect.y,
      this.#rematchRect.width,
      this.#rematchRect.height,
      buttonHeight / 2,
    );
    context.fillStyle = '#E53935';
    context.fill();
    context.fillStyle = '#FFFFFF';
    context.font = font(18 * scale, 800);
    context.fillText('再来一局', centerX, this.#rematchRect.y + buttonHeight / 2);
  }

  #draw() {
    if (!this.#frame) return;
    const signature = `${this.#viewport.width}x${this.#viewport.height}:${presentationSignature(
      this.#frame,
      this.#state,
    )}`;
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.#rematchRect = null;
    const context = this.#context;
    const scale = Math.max(0.6, Math.min(1.4, Math.min(
      this.#safeRect.width / 430,
      this.#safeRect.height / 760,
    )));
    context.setTransform(this.#textureScale, 0, 0, this.#textureScale, 0, 0);
    context.clearRect(0, 0, this.#viewport.width, this.#viewport.height);
    this.#drawTop(context, this.#frame, scale);
    drawOffscreenOpponent(context, this.#frame, this.#safeRect, scale);
    this.#drawControls(context, this.#frame, scale);
    this.#drawOverlay(context, this.#frame, scale);
    this.#texture.needsUpdate = true;
  }

  hitTestRematch(point, inputViewport = this.#viewport) {
    this.#assertUsable();
    if (!this.#rematchRect || !point) return false;
    const width = Math.max(1, finite(inputViewport.width, this.#viewport.width));
    const height = Math.max(1, finite(inputViewport.height, this.#viewport.height));
    const x = finite(point.x, -1) / width * this.#viewport.width;
    const y = finite(point.y, -1) / height * this.#viewport.height;
    return x >= this.#rematchRect.x
      && x <= this.#rematchRect.x + this.#rematchRect.width
      && y >= this.#rematchRect.y
      && y <= this.#rematchRect.y + this.#rematchRect.height;
  }

  render(renderer) {
    this.#assertUsable();
    renderer.render(this.scene, this.camera);
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      textureWidth: this.#canvas.width,
      textureHeight: this.#canvas.height,
      hasFrame: this.#frame !== null,
      hasRematchControl: this.#rematchRect !== null,
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    disposeThreeObject(this.quad);
    this.scene.clear();
    this.#frame = null;
    this.#rematchRect = null;
  }
}
