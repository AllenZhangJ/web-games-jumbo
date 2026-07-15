import * as THREE from 'three';
import { RENDER3D_COLORS, RENDER3D_DESIGN } from '../constants.js';
import { createTextureSprite, type DynamicCanvasTexture } from '../resources/texture-manager.js';

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
  const material = sprite.material as THREE.SpriteMaterial;
  if (material.map !== texture) {
    textureManager.release(material.map);
    textureManager.acquire(texture);
    material.map = texture;
  }
  material.color.set(texture ? 0xffffff : fallbackColor);
  material.opacity = texture ? 1 : 0.88;
  material.needsUpdate = true;
  sprite.userData.textureFallback = texture == null;
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
    this.contentMenu = createTextureSprite(null, { color: 0xffffff, textureManager });
    this.contentMenu.name = 'HudContentMenu';
    this.contentMenu.visible = false;
    this.leftControl = createTextureSprite(null, { color: 0xffffff, textureManager });
    this.leftControl.name = 'HudChoiceLeft';
    this.rightControl = createTextureSprite(null, { color: 0xffffff, textureManager });
    this.rightControl.name = 'HudChoiceRight';

    [this.top, this.status, this.modal, this.contentMenu, this.leftControl, this.rightControl].forEach((sprite: THREE.Sprite) => {
      sprite.renderOrder = 100;
      this.scene.add(sprite);
    });

    this.viewport = { width: 1, height: 1, safeArea: null };
    this.safeRect = normalizeSafeRect(this.viewport);
    this.layoutScale = 1;
    this.controlRects = {
      left: null, right: null, pause: null, restart: null, menu: null,
      gameplayPrev: null, gameplayNext: null, taskPrev: null, taskNext: null,
      characterPrev: null, characterNext: null, apply: null, close: null,
      qualityPrev: null, qualityNext: null,
    };
    this.controlState = {
      phase: 'ready', selectedChoice: null, overlayVisible: false, contentMenuOpen: false,
    };
    this.topKey = '';
    this.statusKey = '';
    this.modalKey = '';
    this.contentMenuKey = '';
    this.contentMenuSurface = null as DynamicCanvasTexture | null;
    this.leftControlKey = '';
    this.rightControlKey = '';
    this.resize(this.viewport);
    this.prewarmControls();
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
    const contentMenuHeight = Math.min(this.safeRect.height - 36, 610 * scale);
    const contentMenuRect = {
      x: centerX - modalWidth / 2,
      y: this.safeRect.top + (this.safeRect.height - contentMenuHeight) / 2,
      width: modalWidth,
      height: contentMenuHeight,
    };
    screenRect(this.contentMenu, contentMenuRect, height, 2);

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
    const menuCenterX = topRect.x + topRect.width * (1155 / 1420);
    this.controlRects.menu = {
      x: menuCenterX - topControlSize / 2,
      y: topRect.y + (topRect.height - topControlSize) / 2,
      width: topControlSize,
      height: topControlSize,
    };
    const arrowWidth = contentMenuRect.width * 0.15;
    const rowHeight = contentMenuRect.height * 0.16;
    const rowCenters = [0.25, 0.42, 0.59, 0.74]
      .map((ratio) => contentMenuRect.y + contentMenuRect.height * ratio);
    const rowKeys = ['gameplay', 'task', 'character', 'quality'];
    rowKeys.forEach((key, index) => {
      this.controlRects[`${key}Prev`] = {
        x: contentMenuRect.x + contentMenuRect.width * 0.035,
        y: rowCenters[index] - rowHeight / 2,
        width: arrowWidth,
        height: rowHeight,
      };
      this.controlRects[`${key}Next`] = {
        x: contentMenuRect.x + contentMenuRect.width * 0.815,
        y: rowCenters[index] - rowHeight / 2,
        width: arrowWidth,
        height: rowHeight,
      };
    });
    this.controlRects.apply = {
      x: contentMenuRect.x + contentMenuRect.width * 0.25,
      y: contentMenuRect.y + contentMenuRect.height * 0.84,
      width: contentMenuRect.width * 0.5,
      height: contentMenuRect.height * 0.1,
    };
    this.controlRects.close = {
      x: contentMenuRect.x + contentMenuRect.width * 0.84,
      y: contentMenuRect.y + contentMenuRect.height * 0.035,
      width: contentMenuRect.width * 0.12,
      height: contentMenuRect.height * 0.1,
    };
  }

  update(state: any = {}, presentation: any = {}) {
    const contentMenuOpen = Boolean(presentation.contentMenu?.open);
    this.controlState = {
      phase: state.phase ?? 'ready',
      selectedChoice: presentation.selectedChoice ?? state.selectedChoice ?? null,
      overlayVisible: contentMenuOpen || ['paused', 'won', 'lost'].includes(state.phase),
      contentMenuOpen,
    };
    this.updateTop(state, presentation);
    this.updateStatus(state, presentation);
    this.updateControls(state, presentation);
    this.updateModal(state);
    this.updateContentMenu(presentation.contentMenu);
  }

  updateTop(state: any, presentation: any = {}) {
    const summary = presentation.contentSummary ?? {};
    const summaryText = `${summary.gameplayName ?? ''} · ${summary.taskName ?? ''}`;
    const mode = state.phase === 'paused' ? 'paused' : 'active';
    const key = `hud-top:${state.currentValue}:${state.targetValue}:${state.movesRemaining}:${mode}:${summaryText}`;
    if (key === this.topKey) return;
    this.topKey = key;
    const texture = this.textureManager.get(key, 1420, 176, (context: any) => {
      metric(context, '当前', state.currentValue ?? '—', 34, '#263238');
      metric(context, '目标', state.targetValue ?? '—', 478, '#263238');
      metric(context, '剩余', state.movesRemaining ?? '—', 894, '#263238');
      context.fillStyle = '#546E7A';
      context.font = '650 28px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.textAlign = 'left';
      context.fillText(summaryText, 38, 150);
      context.fillStyle = '#263238';
      context.font = '750 76px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.lineWidth = 12;
      context.lineCap = 'round';
      [58, 80, 102].forEach((y) => {
        context.beginPath();
        context.moveTo(1137, y);
        context.lineTo(1173, y);
        context.stroke();
      });
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
    const visible = !presentation.contentMenu?.open
      && ['ready', 'charging', 'jumping', 'landing'].includes(state.phase);
    this.status.visible = visible;
    if (!visible) {
      this.statusKey = '';
      return;
    }
    const key = `hud-status:${copy}:${selected ?? 'none'}:${state.phase}`;
    if (key === this.statusKey) return;
    this.statusKey = key;
    const texture = this.statusTexture(key, copy, selected, state.phase);
    setSpriteTexture(this.status, texture, 0x263238, this.textureManager);
    if (state.phase === 'charging') {
      const jumpingKey = `hud-status:${PHASE_COPY.jumping}:${selected ?? 'none'}:jumping`;
      this.statusTexture(jumpingKey, PHASE_COPY.jumping, selected, 'jumping');
    }
  }

  statusTexture(key: string, copy: string, selected: unknown, phase: string) {
    return this.textureManager.get(key, 1040, 128, (context: any, width: number, height: number) => {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = selected == null ? '#263238' : '#16A6A1';
      context.globalAlpha = phase === 'ready' ? 0.68 : 1;
      context.font = '700 42px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(copy, width / 2, height / 2 + 1);
      context.globalAlpha = 1;
    });
  }

  updateControls(state: any, presentation: any) {
    const selected = presentation.selectedChoice ?? state.selectedChoice ?? null;
    const choiceControlMap = presentation.choiceControlMap ?? { left: 0, right: 1 };
    const leftSelected = selected === choiceControlMap.left;
    const rightSelected = selected === choiceControlMap.right;
    const overlayVisible = Boolean(presentation.contentMenu?.open)
      || ['paused', 'won', 'lost'].includes(state.phase);
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
    const texture = this.controlTexture(side, active, disabled);
    setSpriteTexture(sprite, texture, active ? 0x16a6a1 : 0xffffff, this.textureManager);
  }

  controlTexture(side: 'left' | 'right', active: boolean, disabled: boolean) {
    const key = `hud-control:${side}:${active ? 1 : 0}:${disabled ? 1 : 0}`;
    return this.textureManager.get(key, 368, 256, (context: any, width: number, height: number, path: any) => {
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
  }

  prewarmControls() {
    (['left', 'right'] as const).forEach((side) => {
      [false, true].forEach((active) => {
        [false, true].forEach((disabled) => this.controlTexture(side, active, disabled));
      });
    });
  }

  updateModal(state: any) {
    const visible = !this.controlState.contentMenuOpen && ['paused', 'won', 'lost'].includes(state.phase);
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

  updateContentMenu(menu: any) {
    const visible = Boolean(menu?.open);
    this.contentMenu.visible = visible;
    if (!visible) {
      this.contentMenuKey = '';
      this.releaseContentMenuSurface();
      return;
    }
    const key = `hud-content:${menu.gameplay?.id}:${menu.task?.id}:${menu.character?.id}:${menu.quality?.id}`;
    if (key === this.contentMenuKey) return;
    this.contentMenuKey = key;
    const surface = this.ensureContentMenuSurface();
    if (!surface) return;
    const painted = surface.paint((context: any, width: number, height: number, path: any) => {
      path(context, 20, 20, width - 40, height - 40, 56);
      context.fillStyle = 'rgba(255,255,255,0.98)';
      context.fill();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#263238';
      context.font = '850 66px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText('选择跃迁内容', width / 2, 104);
      context.font = '700 62px sans-serif';
      context.fillText('×', width * 0.9, 96);
      const rows = [
        ['玩法', menu.gameplay],
        ['任务', menu.task],
        ['角色', menu.character],
        ['画质', menu.quality],
      ];
      rows.forEach(([label, entry]: any, index: number) => {
        const centerY = height * [0.25, 0.42, 0.59, 0.74][index]!;
        context.fillStyle = '#78909C';
        context.font = '700 30px "PingFang SC", "Microsoft YaHei", sans-serif';
        context.fillText(`${label}  ${entry.index}/${entry.total}`, width / 2, centerY - 60);
        context.fillStyle = '#263238';
        context.font = '850 54px "PingFang SC", "Microsoft YaHei", sans-serif';
        context.fillText(entry.name, width / 2, centerY);
        context.fillStyle = '#607D8B';
        context.font = '600 27px "PingFang SC", "Microsoft YaHei", sans-serif';
        context.fillText(entry.description, width / 2, centerY + 56);
        context.strokeStyle = '#263238';
        context.lineWidth = 14;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        const arrow = (x: number, direction: number) => {
          context.beginPath();
          context.moveTo(x + direction * 18, centerY - 30);
          context.lineTo(x - direction * 18, centerY);
          context.lineTo(x + direction * 18, centerY + 30);
          context.stroke();
        };
        arrow(width * 0.1, 1);
        arrow(width * 0.9, -1);
      });
      path(context, width * 0.25, height * 0.84, width * 0.5, height * 0.1, 50);
      context.fillStyle = RENDER3D_COLORS.red;
      context.fill();
      context.fillStyle = '#FFFFFF';
      context.font = '800 42px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText('开始游戏', width / 2, height * 0.89);
    });
    if (!painted) this.releaseContentMenuSurface();
  }

  ensureContentMenuSurface(): DynamicCanvasTexture | null {
    if (this.contentMenuSurface) return this.contentMenuSurface;
    this.contentMenuSurface = this.textureManager.createDynamic?.('hud-content', 1024, 1024) ?? null;
    setSpriteTexture(
      this.contentMenu,
      this.contentMenuSurface?.texture ?? null,
      0xffffff,
      this.textureManager,
    );
    return this.contentMenuSurface;
  }

  releaseContentMenuSurface() {
    if (!this.contentMenuSurface) return;
    const surface = this.contentMenuSurface;
    this.contentMenuSurface = null;
    setSpriteTexture(this.contentMenu, null, 0xffffff, this.textureManager);
    surface.dispose();
  }

  hitTest(point: any) {
    if (this.controlState.contentMenuOpen) {
      const contentControls: readonly (readonly [string, string])[] = [
        ['gameplayPrev', 'content-gameplay-prev'], ['gameplayNext', 'content-gameplay-next'],
        ['taskPrev', 'content-task-prev'], ['taskNext', 'content-task-next'],
        ['characterPrev', 'content-character-prev'], ['characterNext', 'content-character-next'],
        ['qualityPrev', 'content-quality-prev'], ['qualityNext', 'content-quality-next'],
        ['apply', 'content-apply'], ['close', 'content-close'],
      ];
      for (const [rect, control] of contentControls) {
        if (rectContains(this.controlRects[rect], point)) return control;
      }
      return null;
    }
    if (rectContains(this.controlRects.menu, point)) return 'content-menu';
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
      contentMenuVisible: this.contentMenu.visible,
      controlsVisible: this.leftControl.visible && this.rightControl.visible,
      controlRects: {
        left: this.controlRects.left ? { ...this.controlRects.left } : null,
        right: this.controlRects.right ? { ...this.controlRects.right } : null,
      },
    };
  }

  dispose() {
    this.releaseContentMenuSurface();
    [this.top, this.status, this.modal, this.contentMenu, this.leftControl, this.rightControl].forEach((sprite: THREE.Sprite) => {
      this.textureManager.release(sprite.material?.map);
      sprite.material?.dispose?.();
      sprite.removeFromParent();
    });
    this.scene.clear();
  }
}
