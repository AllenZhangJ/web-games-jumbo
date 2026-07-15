import * as THREE from 'three';
import { RENDER3D_COLORS, RENDER3D_DESIGN } from '../constants.js';
import { createTextureSprite } from '../texture-manager.js';

const PHASE_COPY = Object.freeze({
  ready: '按住下方箭头蓄力，松开起跳',
  charging: '蓄力中 · 松开起跳',
  jumping: '跃迁中',
  landing: '稳定落点',
  paused: '已暂停',
  won: '目标命中',
  lost: '跃迁失败',
});

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function rectContains(rect: any, point: any): boolean {
  return Boolean(
    rect
    && point
    && Number.isFinite(point.x)
    && Number.isFinite(point.y)
    && point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
  );
}

function screenRect(sprite: THREE.Sprite, rect: any, viewportHeight: number, z = 0) {
  sprite.position.set(
    rect.x + rect.width / 2,
    viewportHeight - rect.y - rect.height / 2,
    z,
  );
  sprite.scale.set(rect.width, rect.height, 1);
}

function setSpriteTexture(
  sprite: THREE.Sprite,
  texture: any,
  fallbackColor: THREE.ColorRepresentation,
  textureManager: any,
) {
  const oldMaterial = sprite.material;
  textureManager.release(oldMaterial?.map);
  textureManager.acquire(texture);
  sprite.material = new THREE.SpriteMaterial({
    map: texture,
    color: texture ? 0xffffff : fallbackColor,
    transparent: true,
    opacity: texture ? 1 : 0.88,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  sprite.userData.textureFallback = texture == null;
  oldMaterial?.dispose?.();
}

function metric(context: any, label: string, value: unknown, x: number, color: string) {
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.font = '750 80px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText(`${label} ${value}`, x, 80);
}

function normalizeSafeRect(viewport: any = {}) {
  const width = Math.max(1, finite(viewport.width, 1));
  const height = Math.max(1, finite(viewport.height, 1));
  const safe = viewport.safeArea ?? {};
  const left = Math.min(width - 1, Math.max(0, finite(safe.left, 0)));
  const top = Math.min(height - 1, Math.max(0, finite(safe.top, 0)));
  const right = Math.min(width, Math.max(left + 1, finite(
    safe.right,
    safe.width != null ? left + finite(safe.width, width - left) : width,
  )));
  const bottom = Math.min(height, Math.max(top + 1, finite(
    safe.bottom,
    safe.height != null ? top + finite(safe.height, height - top) : height,
  )));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export class HudScene {
  [key: string]: any;
  constructor(textureManager: any) {
    this.textureManager = textureManager;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
    this.camera.position.z = 1;

    this.top = createTextureSprite(null, { color: 0xffffff, textureManager });
    this.top.name = 'HudTop';
    this.status = createTextureSprite(null, { color: 0xffffff, textureManager });
    this.status.name = 'HudStatus';
    this.modal = createTextureSprite(null, { color: 0xffffff, textureManager });
    this.modal.name = 'HudModal';
    this.modal.visible = false;
    this.leftControl = createTextureSprite(null, { color: 0xffffff, textureManager });
    this.leftControl.name = 'HudChoiceLeft';
    this.rightControl = createTextureSprite(null, { color: 0xffffff, textureManager });
    this.rightControl.name = 'HudChoiceRight';

    [this.top, this.status, this.modal, this.leftControl, this.rightControl].forEach((sprite: THREE.Sprite) => {
      sprite.renderOrder = 100;
      this.scene.add(sprite);
    });

    this.viewport = { width: 1, height: 1, safeArea: null };
    this.safeRect = normalizeSafeRect(this.viewport);
    this.layoutScale = 1;
    this.controlRects = { left: null, right: null, pause: null, restart: null };
    this.controlState = { phase: 'ready', selectedChoice: null, overlayVisible: false };
    this.topKey = '';
    this.statusKey = '';
    this.modalKey = '';
    this.leftControlKey = '';
    this.rightControlKey = '';
    this.resize(this.viewport);
  }

  resize(viewport: any = {}) {
    const width = Math.max(1, finite(viewport.width, 1));
    const height = Math.max(1, finite(viewport.height, 1));
    this.viewport = { width, height, safeArea: viewport.safeArea ?? null };
    this.safeRect = normalizeSafeRect(this.viewport);
    this.layoutScale = Math.min(
      1,
      this.safeRect.width / RENDER3D_DESIGN.width,
      this.safeRect.height / 720,
    );
    const scale = Math.max(0.35, this.layoutScale);
    this.camera.left = 0;
    this.camera.right = width;
    this.camera.top = height;
    this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();

    const centerX = this.safeRect.left + this.safeRect.width / 2;
    const topWidth = Math.min(this.safeRect.width, 710 * scale);
    const topHeight = 88 * scale;
    const topRect = {
      x: centerX - topWidth / 2,
      y: this.safeRect.top + 10 * scale,
      width: topWidth,
      height: topHeight,
    };
    screenRect(this.top, topRect, height);

    const controlWidth = 184 * scale;
    const controlHeight = 128 * scale;
    const bottomMargin = Math.max(18, 24 * scale);
    const controlY = this.safeRect.bottom - bottomMargin - controlHeight;
    const leftCenterX = this.safeRect.left + this.safeRect.width * 0.28;
    const rightCenterX = this.safeRect.left + this.safeRect.width * 0.72;
    this.controlRects.left = {
      x: leftCenterX - controlWidth / 2,
      y: controlY,
      width: controlWidth,
      height: controlHeight,
    };
    this.controlRects.right = {
      x: rightCenterX - controlWidth / 2,
      y: controlY,
      width: controlWidth,
      height: controlHeight,
    };
    screenRect(this.leftControl, this.controlRects.left, height);
    screenRect(this.rightControl, this.controlRects.right, height);

    const statusWidth = Math.min(this.safeRect.width - 24, 520 * scale);
    const statusHeight = 64 * scale;
    const statusRect = {
      x: centerX - statusWidth / 2,
      y: controlY - statusHeight - 42 * scale,
      width: statusWidth,
      height: statusHeight,
    };
    screenRect(this.status, statusRect, height);

    const modalWidth = Math.min(this.safeRect.width - 24, 610 * scale);
    const modalHeight = Math.min(this.safeRect.height - 48, 300 * scale);
    const modalRect = {
      x: centerX - modalWidth / 2,
      y: this.safeRect.top + (this.safeRect.height - modalHeight) / 2,
      width: modalWidth,
      height: modalHeight,
    };
    screenRect(this.modal, modalRect, height, 1);

    const pauseCenterX = topRect.x + topRect.width * (1265 / 1420);
    const restartCenterX = topRect.x + topRect.width * (1370 / 1420);
    const topControlSize = Math.max(24, 52 * scale);
    this.controlRects.pause = {
      x: pauseCenterX - topControlSize / 2,
      y: topRect.y + (topRect.height - topControlSize) / 2,
      width: topControlSize,
      height: topControlSize,
    };
    this.controlRects.restart = {
      x: restartCenterX - topControlSize / 2,
      y: topRect.y + (topRect.height - topControlSize) / 2,
      width: topControlSize,
      height: topControlSize,
    };
  }

  update(state: any = {}, presentation: any = {}) {
    this.controlState = {
      phase: state.phase ?? 'ready',
      selectedChoice: presentation.selectedChoice ?? state.selectedChoice ?? null,
      overlayVisible: ['paused', 'won', 'lost'].includes(state.phase),
    };
    this.updateTop(state);
    this.updateStatus(state, presentation);
    this.updateControls(state, presentation);
    this.updateModal(state);
  }

  updateTop(state: any) {
    const key = `hud-top:${state.currentValue}:${state.targetValue}:${state.movesRemaining}:${state.phase}`;
    if (key === this.topKey) return;
    this.topKey = key;
    const texture = this.textureManager.get(key, 1420, 176, (context: any) => {
      metric(context, '当前', state.currentValue ?? '—', 34, '#263238');
      metric(context, '目标', state.targetValue ?? '—', 478, '#263238');
      metric(context, '剩余', state.movesRemaining ?? '—', 894, '#263238');
      context.fillStyle = '#263238';
      context.font = '750 76px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(state.phase === 'paused' ? '▶' : 'Ⅱ', 1265, 80);
      context.font = '700 80px sans-serif';
      context.fillText('↻', 1370, 80);
    });
    setSpriteTexture(this.top, texture, 0xffffff, this.textureManager);
  }

  updateStatus(state: any, presentation: any) {
    const copy = presentation.statusText
      ?? (PHASE_COPY as Readonly<Record<string, string>>)[state.phase]
      ?? state.message
      ?? '';
    const selected = presentation.selectedChoice ?? state.selectedChoice;
    const visible = ['ready', 'charging', 'jumping', 'landing'].includes(state.phase);
    this.status.visible = visible;
    if (!visible) {
      this.statusKey = '';
      return;
    }
    const key = `hud-status:${copy}:${selected ?? 'none'}:${state.phase}`;
    if (key === this.statusKey) return;
    this.statusKey = key;
    const texture = this.textureManager.get(key, 1040, 128, (context: any, width: number, height: number) => {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = selected == null ? '#263238' : '#16A6A1';
      context.globalAlpha = state.phase === 'ready' ? 0.68 : 1;
      context.font = '700 42px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(copy, width / 2, height / 2 + 1);
      context.globalAlpha = 1;
    });
    setSpriteTexture(this.status, texture, 0x263238, this.textureManager);
  }

  updateControls(state: any, presentation: any) {
    const selected = presentation.selectedChoice ?? state.selectedChoice ?? null;
    const choiceControlMap = presentation.choiceControlMap ?? { left: 0, right: 1 };
    const leftSelected = selected === choiceControlMap.left;
    const rightSelected = selected === choiceControlMap.right;
    const overlayVisible = ['paused', 'won', 'lost'].includes(state.phase);
    const visible = !overlayVisible;
    const disabled = !['ready', 'charging'].includes(state.phase);
    this.leftControl.visible = visible;
    this.rightControl.visible = visible;
    if (!visible) return;
    this.paintControl(this.leftControl, 'left', leftSelected, disabled);
    this.paintControl(this.rightControl, 'right', rightSelected, disabled);

    const pressedScale = state.phase === 'charging' ? 0.95 : 1;
    const leftRect = this.controlRects.left;
    const rightRect = this.controlRects.right;
    if (leftRect) {
      const factor = leftSelected ? pressedScale : 1;
      this.leftControl.scale.set(leftRect.width * factor, leftRect.height * factor, 1);
    }
    if (rightRect) {
      const factor = rightSelected ? pressedScale : 1;
      this.rightControl.scale.set(rightRect.width * factor, rightRect.height * factor, 1);
    }
  }

  paintControl(sprite: THREE.Sprite, side: 'left' | 'right', active: boolean, disabled: boolean) {
    const key = `hud-control:${side}:${active ? 1 : 0}:${disabled ? 1 : 0}`;
    const keyField = side === 'left' ? 'leftControlKey' : 'rightControlKey';
    if (this[keyField] === key) return;
    this[keyField] = key;
    const texture = this.textureManager.get(key, 368, 256, (context: any, width: number, height: number, path: any) => {
      path(context, 18, 18, width - 36, height - 36, 28);
      context.shadowColor = 'rgba(38,50,56,0.18)';
      context.shadowBlur = 12;
      context.shadowOffsetY = 7;
      context.fillStyle = active
        ? RENDER3D_COLORS.cyan
        : disabled
          ? 'rgba(255,255,255,0.52)'
          : 'rgba(255,255,255,0.96)';
      context.fill();
      context.shadowColor = 'rgba(0,0,0,0)';
      context.shadowBlur = 0;
      context.shadowOffsetY = 0;
      context.strokeStyle = active ? '#FFFFFF' : disabled ? 'rgba(38,50,56,0.30)' : '#263238';
      context.lineWidth = 18;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      const direction = side === 'left' ? -1 : 1;
      const tailX = width / 2 - direction * 48;
      const tailY = height / 2 + 44;
      const tipX = width / 2 + direction * 58;
      const tipY = height / 2 - 50;
      context.beginPath();
      context.moveTo(tailX, tailY);
      context.lineTo(tipX, tipY);
      context.moveTo(tipX, tipY);
      context.lineTo(tipX - direction * 58, tipY);
      context.moveTo(tipX, tipY);
      context.lineTo(tipX, tipY + 58);
      context.stroke();
    });
    setSpriteTexture(sprite, texture, active ? 0x16a6a1 : 0xffffff, this.textureManager);
  }

  updateModal(state: any) {
    const visible = ['paused', 'won', 'lost'].includes(state.phase);
    this.modal.visible = visible;
    if (!visible) {
      this.modalKey = '';
      return;
    }
    const key = `hud-modal:${state.phase}:${state.message ?? ''}:${state.currentValue}:${state.targetValue}`;
    if (key === this.modalKey) return;
    this.modalKey = key;
    const texture = this.textureManager.get(key, 1220, 600, (context: any, width: number, height: number, path: any) => {
      const title = state.phase === 'paused' ? '已暂停' : state.phase === 'won' ? '目标命中' : '跃迁失败';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = state.phase === 'lost' ? '#E53935' : '#263238';
      context.font = '850 76px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(title, width / 2, 118);
      context.fillStyle = '#263238';
      context.font = '600 37px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(state.message ?? '', width / 2, 222);
      path(context, 282, 336, width - 564, 126, 60);
      context.fillStyle = '#E53935';
      context.fill();
      context.fillStyle = '#ffffff';
      context.font = '750 42px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(state.phase === 'paused' ? '点击继续' : state.phase === 'won' ? '进入下一轮' : '重新开始', width / 2, 400);
    });
    setSpriteTexture(this.modal, texture, state.phase === 'lost' ? 0xe53935 : 0xffffff, this.textureManager);
  }

  hitTest(point: any) {
    if (rectContains(this.controlRects.pause, point)) return 'pause';
    if (rectContains(this.controlRects.restart, point)) return 'restart';
    if (this.controlState.overlayVisible || this.controlState.phase !== 'ready') return null;
    if (rectContains(this.controlRects.left, point)) return 'choice-left';
    if (rectContains(this.controlRects.right, point)) return 'choice-right';
    return null;
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }

  snapshot() {
    return {
      topFallback: Boolean(this.top.userData.textureFallback),
      statusFallback: Boolean(this.status.userData.textureFallback),
      controlsFallback: Boolean(
        this.leftControl.userData.textureFallback || this.rightControl.userData.textureFallback
      ),
      modalVisible: this.modal.visible,
      controlsVisible: this.leftControl.visible && this.rightControl.visible,
      controlRects: {
        left: this.controlRects.left ? { ...this.controlRects.left } : null,
        right: this.controlRects.right ? { ...this.controlRects.right } : null,
      },
    };
  }

  dispose() {
    [this.top, this.status, this.modal, this.leftControl, this.rightControl].forEach((sprite: THREE.Sprite) => {
      this.textureManager.release(sprite.material?.map);
      sprite.material?.dispose?.();
      sprite.removeFromParent();
    });
    this.scene.clear();
  }
}
