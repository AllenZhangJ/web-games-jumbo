import * as THREE from 'three';
import {
  ContentSelection,
  DEFAULT_CHARACTER,
  DEFAULT_SCENE,
  createBuiltinCharacterRegistry,
  createBuiltinSceneRegistry,
} from '@number-strategy/content';
import { createBuiltinCharacterRendererRegistry } from './character-renderer-registry.js';
import { ContextLifecycle } from './context-lifecycle.js';
import {
  CAMERA_DEFAULTS,
  clamp,
  dampFactor,
  easeInOutCubic,
  RENDER3D_COLORS,
  RENDER3D_DESIGN,
} from './constants.js';
import { ParticleBurst } from './effects/particle-burst.js';
import { TailTrail } from './effects/tail-trail.js';
import { HudScene } from './hud/hud-scene.js';
import { PlatformMeshFactory } from './platform-mesh-factory.js';
import { PlatformViewRegistry } from './platform-view-registry.js';
import { createBuiltinSceneRendererRegistry } from './scene-renderer-registry.js';
import { TextureManager } from './texture-manager.js';

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function worldSnapshot(world) {
  if (!world) return null;
  if (typeof world.snapshot === 'function') return world.snapshot();
  return world;
}

function worldPlatforms(world) {
  if (Array.isArray(world?.platforms)) return world.platforms;
  return [
    ...(Array.isArray(world?.history) ? world.history : []),
    world?.current,
    ...(Array.isArray(world?.candidates) ? world.candidates : []),
  ].filter(Boolean);
}

export function screenChoiceControlMap(candidates = [], camera, origin: any = {}) {
  const fallback = { left: 0, right: 1 };
  if (!camera || !Array.isArray(candidates) || candidates.length < 2) return fallback;
  const originX = finite(origin?.x);
  const originZ = finite(origin?.z);
  try {
    camera.updateMatrixWorld?.();
    const projected = candidates.slice(0, 2).map((candidate, index) => {
      const point = new THREE.Vector3(
        finite(candidate?.center?.x) - originX,
        finite(candidate?.topY),
        finite(candidate?.center?.z) - originZ,
      ).project(camera);
      return { index, x: point.x };
    });
    if (projected.some((entry) => !Number.isFinite(entry.x))) return fallback;
    projected.sort((left, right) => left.x - right.x);
    if (Math.abs(projected[0].x - projected[1].x) < Number.EPSILON) return fallback;
    return { left: projected[0].index, right: projected[1].index };
  } catch {
    return fallback;
  }
}

function normalizePresentation(state, presentation, missProgress) {
  const phase = state?.phase ?? 'ready';
  const selectedChoice = presentation.selectedChoice ?? state?.selectedChoice ?? null;
  const inferredPower = finite(state?.chargeMs) / 1200;
  const chargePower = clamp(presentation.chargePower ?? state?.chargePower ?? inferredPower);
  let missVisual = presentation.missVisual ?? null;
  if (missVisual && typeof missVisual === 'object' && !Number.isFinite(missVisual.progress)) {
    missVisual = { ...missVisual, progress: missProgress };
  }
  if (!missVisual && phase === 'lost' && missProgress > 0) {
    const message = String(state?.message ?? '');
    missVisual = {
      progress: missProgress,
      reason: message.includes('不足') ? 'short' : message.includes('越过') ? 'overshoot' : 'outside',
    };
  }
  return {
    ...presentation,
    selectedChoice,
    chargePower,
    jumpProgress: clamp(presentation.jumpProgress ?? state?.jumpProgress ?? 0),
    landingProgress: clamp(presentation.landingProgress ?? state?.landingProgress ?? 0),
    missVisual,
    reducedMotion: Boolean(presentation.reducedMotion),
    isCharging: phase === 'charging',
    isJumping: phase === 'jumping',
    isLanding: phase === 'landing',
  };
}

/**
 * A platform-neutral Three.js facade. Core state is treated as immutable input:
 * every render-side animation lives below `worldRoot` and never writes back to
 * the supplied game or world objects.
 */
export class Renderer3D {
  [key: string]: any;
  constructor(canvas, platform, options: any = {}) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new TypeError('Renderer3D 需要可用的 Canvas。');
    }
    if (!platform || typeof platform.getViewport !== 'function') {
      throw new TypeError('Renderer3D 需要平台适配层。');
    }
    this.canvas = canvas;
    this.platform = platform;
    this.renderer = null;
    this.stage = null;
    this.textureManager = null;
    this.platformFactory = null;
    this.platforms = null;
    this.character = null;
    this.particles = null;
    this.trail = null;
    this.hud = null;
    this.ready = false;
    this.disposed = false;
    this.contextLost = false;
    this.contextLifecycle = null;
    this.transform = null;
    this.viewport = null;
    this.visualOrigin = new THREE.Vector3();
    this.desiredOrigin = new THREE.Vector3();
    this.originInitialized = false;
    this.lastTime = null;
    this.lastWorldStep = null;
    this.worldTransition = null;
    this.worldTransitionProgress = 1;
    this.lastPhase = null;
    this.missElapsed = 0;
    this.lastDrawState = null;
    this.errorCount = 0;
    this.consecutiveDrawErrors = 0;
    this.lastError = null;
    this.sceneRegistry = options.sceneRegistry ?? createBuiltinSceneRegistry();
    this.sceneRendererRegistry = options.sceneRendererRegistry ?? createBuiltinSceneRendererRegistry();
    this.characterRegistry = options.characterRegistry ?? createBuiltinCharacterRegistry();
    this.characterRendererRegistry = options.characterRendererRegistry
      ?? createBuiltinCharacterRendererRegistry();
    this.sceneSelection = this.sceneRegistry.resolve(
      options.sceneId ?? DEFAULT_SCENE.id,
      DEFAULT_SCENE.id,
    );
    this.characterSelection = null;

    try {
      const contextAttributes: THREE.WebGLRendererParameters = {
        alpha: false,
        antialias: true,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      };
      const context = this.platform.getWebGLContext?.(canvas, contextAttributes) ?? null;
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        ...(context ? { context } : {}),
        ...contextAttributes,
      });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.renderer.setClearColor(RENDER3D_COLORS.background, 1);
      this.renderer.autoClear = false;

      try {
        this.stage = this.sceneRendererRegistry.create(this.renderer, this.sceneSelection.definition);
      } catch (error) {
        if (this.sceneSelection.definition.id === DEFAULT_SCENE.id) throw error;
        this.sceneSelection = {
          definition: this.sceneRegistry.get(DEFAULT_SCENE.id),
          usedFallback: true,
        };
        this.stage = this.sceneRendererRegistry.create(this.renderer, this.sceneSelection.definition);
      }
      this.textureManager = new TextureManager(platform);
      this.platformFactory = new PlatformMeshFactory(this.textureManager);
      this.platforms = new PlatformViewRegistry(this.stage.worldRoot, this.platformFactory);
      this.characterSelection = new ContentSelection({
        registry: this.characterRegistry,
        fallbackId: DEFAULT_CHARACTER.id,
        factory: (definition) => this.characterRendererRegistry.create(definition),
      });
      this.character = this.characterSelection.select(options.characterId ?? DEFAULT_CHARACTER.id);
      this.stage.worldRoot.add(this.character);
      this.particles = new ParticleBurst(this.stage.worldRoot);
      this.trail = new TailTrail(this.stage.worldRoot);
      this.hud = new HudScene(this.textureManager);

      this.contextLifecycle = new ContextLifecycle(this.canvas, {
        onLost: () => { this.contextLost = true; },
        onRestored: () => {
          this.contextLost = false;
          this.lastTime = null;
          if (this.renderer?.shadowMap) this.renderer.shadowMap.needsUpdate = true;
        },
      });
      this.contextLifecycle.bind();
    } catch (cause) {
      this.captureError('initialize', cause);
      this.dispose();
      const error = new Error('Renderer3D 初始化失败，请确认设备支持 WebGL2。');
      error.cause = cause;
      throw error;
    }
  }

  captureError(phase, error) {
    this.errorCount += 1;
    this.lastError = {
      phase,
      name: error?.name ?? 'Error',
      message: error?.message ?? String(error ?? '未知渲染错误'),
      count: this.errorCount,
    };
  }

  async load() {
    if (this.disposed) throw new Error('Renderer3D 已销毁。');
    if (this.ready) return this;
    if (!this.textureManager?.supportsTextTextures()) {
      throw new Error('当前平台无法创建 HUD 所需的 2D Canvas，游戏无法安全显示数值与操作提示。');
    }
    this.ready = true;
    return this;
  }

  resize() {
    if (this.disposed || !this.renderer || !this.stage) return false;
    let viewport: any = {};
    try {
      viewport = this.platform.getViewport() ?? {};
    } catch (error) {
      this.captureError('viewport', error);
      viewport = this.viewport ?? {};
    }
    const width = Math.max(1, finite(viewport.width, 1280));
    const height = Math.max(1, finite(viewport.height, 720));
    const pixelRatio = clamp(finite(viewport.pixelRatio, 1), 0.5, 2);
    this.viewport = { width, height, pixelRatio, safeArea: viewport.safeArea ?? null };

    const safe = viewport.safeArea ?? {};
    const safeLeft = clamp(finite(safe.left, 0), 0, Math.max(0, width - 1));
    const safeTop = clamp(finite(safe.top, 0), 0, Math.max(0, height - 1));
    const inferredSafeWidth = finite(safe.right, width) - safeLeft;
    const inferredSafeHeight = finite(safe.bottom, height) - safeTop;
    const safeWidth = clamp(finite(safe.width, inferredSafeWidth), 1, Math.max(1, width - safeLeft));
    const safeHeight = clamp(finite(safe.height, inferredSafeHeight), 1, Math.max(1, height - safeTop));
    const scale = Math.min(
      safeWidth / RENDER3D_DESIGN.width,
      safeHeight / RENDER3D_DESIGN.height,
    );
    this.transform = {
      scale,
      offsetX: safeLeft + (safeWidth - RENDER3D_DESIGN.width * scale) / 2,
      // Retained for legacy design-coordinate fallbacks. The live HUD itself
      // is anchored directly to the full viewport and safe area.
      offsetY: safeTop,
      pixelRatio,
    };
    try {
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(width, height, false);
      if (this.canvas.style) {
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
      }
      this.stage.resize(width, height);
      this.hud.resize(this.viewport);
      return true;
    } catch (error) {
      this.captureError('resize', error);
      return false;
    }
  }

  toDesignPoint(rawPoint) {
    if (!this.transform) this.resize();
    const { pixelRatio, scale, offsetX, offsetY } = this.transform ?? {
      pixelRatio: 1,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
    return {
      x: (finite(rawPoint?.x) / pixelRatio - offsetX) / scale,
      y: (finite(rawPoint?.y) / pixelRatio - offsetY) / scale,
    };
  }

  toViewportPoint(rawPoint) {
    if (!this.transform) this.resize();
    const pixelRatio = this.transform?.pixelRatio ?? 1;
    return {
      x: finite(rawPoint?.x) / pixelRatio,
      y: finite(rawPoint?.y) / pixelRatio,
    };
  }

  hitTest(rawPoint) {
    return this.hud?.hitTest?.(this.toViewportPoint(rawPoint)) ?? null;
  }

  choiceIndexForControl(control, candidates = []) {
    const map = screenChoiceControlMap(
      candidates,
      this.stage?.cameraRig?.camera,
      this.visualOrigin,
    );
    if (control === 'choice-left') return map.left;
    if (control === 'choice-right') return map.right;
    return null;
  }

  draw(state, world, presentation = {}) {
    if (!this.ready || this.disposed || this.contextLost) return;
    try {
      this.drawFrame(state, world, presentation);
      this.consecutiveDrawErrors = 0;
      return true;
    } catch (error) {
      this.consecutiveDrawErrors += 1;
      this.captureError('draw', error);
      return false;
    }
  }

  render(snapshot, _events = []) {
    void _events;
    return this.draw(snapshot?.state, snapshot?.world, snapshot?.presentation ?? {});
  }

  selectCharacter(characterId) {
    if (!this.characterSelection || !this.stage) return false;
    const character = this.characterSelection.select(characterId);
    this.character = character;
    this.stage.worldRoot.add(character);
    return this.characterSelection.snapshot;
  }

  drawFrame(state, world, presentation = {}) {
    if (!this.transform) this.resize();
    if (!this.transform) return;
    const snapshot = worldSnapshot(world);
    if (!snapshot?.current || !snapshot?.player) return;

    const now = finite(this.platform.now?.(), 0);
    const deltaSeconds = this.lastTime == null
      ? 1 / 60
      : clamp((now - this.lastTime) / 1000, 0, 0.1);
    this.lastTime = now;
    const phase = state?.phase ?? 'ready';
    if (phase === 'lost' && snapshot.player.supportPlatformId == null) {
      this.missElapsed += deltaSeconds;
    } else {
      this.missElapsed = 0;
    }
    const visual = normalizePresentation(state, presentation, clamp(this.missElapsed / 0.68));

    const worldStep = Number.isFinite(snapshot.step) ? snapshot.step : null;
    const stepAdvanced = this.lastWorldStep != null
      && worldStep != null
      && worldStep > this.lastWorldStep;
    const stepReset = this.lastWorldStep != null
      && worldStep != null
      && worldStep < this.lastWorldStep;
    const currentCenter = snapshot.current.center ?? { x: 0, z: 0 };
    this.desiredOrigin.set(finite(currentCenter.x), 0, finite(currentCenter.z));
    const cameraContext = {
      current: snapshot.current,
      candidates: snapshot.candidates ?? [],
      player: snapshot.player,
      origin: this.visualOrigin,
      jumping: visual.isJumping,
      reducedMotion: visual.reducedMotion,
    };
    if (!this.originInitialized || stepReset) {
      this.visualOrigin.copy(this.desiredOrigin);
      this.originInitialized = true;
      this.worldTransition = null;
      this.worldTransitionProgress = 1;
    } else if (stepAdvanced) {
      const toFocus = this.stage.cameraRig.calculateFocus({
        ...cameraContext,
        origin: this.desiredOrigin,
        jumping: false,
      }, new THREE.Vector3());
      this.worldTransition = {
        elapsed: 0,
        duration: visual.reducedMotion
          ? CAMERA_DEFAULTS.reducedTransitionDurationSeconds
          : CAMERA_DEFAULTS.transitionDurationSeconds,
        delay: visual.reducedMotion ? 0 : CAMERA_DEFAULTS.transitionDelaySeconds,
        fromOrigin: this.visualOrigin.clone(),
        toOrigin: this.desiredOrigin.clone(),
        fromFocus: this.stage.cameraRig.focus.clone(),
        toFocus,
      };
      this.worldTransitionProgress = 0;
    }

    let cameraTransition = null;
    if (this.worldTransition) {
      this.worldTransition.elapsed += deltaSeconds;
      const totalProgress = clamp(this.worldTransition.elapsed / this.worldTransition.duration);
      const travelDuration = Math.max(0.001, this.worldTransition.duration - this.worldTransition.delay);
      const travelProgress = clamp(
        (this.worldTransition.elapsed - this.worldTransition.delay) / travelDuration,
      );
      const easedProgress = easeInOutCubic(travelProgress);
      this.worldTransitionProgress = totalProgress;
      this.visualOrigin.copy(this.worldTransition.fromOrigin)
        .lerp(this.worldTransition.toOrigin, easedProgress);
      cameraTransition = {
        fromFocus: this.worldTransition.fromFocus,
        toFocus: this.worldTransition.toFocus,
        progress: easedProgress,
      };
    } else {
      this.visualOrigin.lerp(this.desiredOrigin, dampFactor(deltaSeconds, visual.isLanding ? 5.4 : 7.5));
      this.worldTransitionProgress = 1;
    }
    this.stage.worldRoot.position.set(-this.visualOrigin.x, 0, -this.visualOrigin.z);

    const platforms = worldPlatforms(snapshot);
    const renderContext = {
      ...visual,
      current: snapshot.current,
      candidates: snapshot.candidates ?? [],
      player: snapshot.player,
      currentValue: state?.currentValue,
      worldTransitionProgress: this.worldTransitionProgress,
      overlayVisible: ['paused', 'won', 'lost'].includes(phase),
    };
    this.platforms.sync(platforms, renderContext, deltaSeconds);
    renderContext.supportHeight = this.platforms.get(snapshot.player.supportPlatformId)?.height
      ?? snapshot.current.height;
    this.character.update(snapshot.player, renderContext, deltaSeconds);
    this.trail.update(this.character.position, {
      active: visual.isJumping,
      reducedMotion: visual.reducedMotion,
    }, deltaSeconds);

    if (stepAdvanced) {
      this.particles.emit(snapshot.player.position, {
        color: RENDER3D_COLORS.red,
        count: 20,
        reducedMotion: visual.reducedMotion,
      });
    }
    if (stepReset) {
      this.particles.clear();
      this.trail.clear();
    }
    this.lastWorldStep = worldStep;
    this.particles.update(deltaSeconds);

    cameraContext.origin = this.visualOrigin;
    this.stage.updateCamera(cameraContext, deltaSeconds, cameraTransition);
    if (this.worldTransitionProgress >= 1) this.worldTransition = null;
    visual.choiceControlMap = screenChoiceControlMap(
      snapshot.candidates ?? [],
      this.stage.cameraRig.camera,
      this.visualOrigin,
    );
    this.hud.update(state ?? {}, visual);
    this.renderPasses();

    this.lastPhase = phase;
    this.lastDrawState = {
      phase,
      selectedChoice: visual.selectedChoice,
      chargePower: visual.chargePower,
      jumpProgress: visual.jumpProgress,
      worldStep,
      worldTransitionProgress: this.worldTransitionProgress,
      choiceControlMap: { ...visual.choiceControlMap },
      player: {
        x: finite(snapshot.player.position?.x),
        y: finite(snapshot.player.position?.y),
        z: finite(snapshot.player.position?.z),
      },
    };
  }

  renderPasses() {
    const width = this.viewport?.width ?? (this.canvas.width / (this.transform?.pixelRatio ?? 1));
    const height = this.viewport?.height ?? (this.canvas.height / (this.transform?.pixelRatio ?? 1));
    this.renderer.setRenderTarget(null);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.clear(true, true, true);
    this.stage.render();

    this.renderer.setViewport(0, 0, width, height);
    this.renderer.setScissorTest(false);
    this.hud.render(this.renderer);
  }

  getDebugSnapshot() {
    const info = this.renderer?.info ?? {
      render: { calls: 0, triangles: 0 },
      memory: { geometries: 0, textures: 0 },
    };
    return {
      ready: this.ready,
      disposed: this.disposed,
      contextLost: this.contextLost,
      viewport: this.viewport ? { ...this.viewport, safeArea: this.viewport.safeArea ? { ...this.viewport.safeArea } : null } : null,
      transform: this.transform ? { ...this.transform } : null,
      worldOrigin: {
        x: this.visualOrigin.x,
        z: this.visualOrigin.z,
      },
      worldTransition: {
        active: Boolean(this.worldTransition),
        progress: this.worldTransitionProgress,
      },
      camera: this.stage?.cameraRig?.snapshot?.() ?? null,
      platformIds: this.platforms?.ids?.() ?? [],
      platformKinds: (this.platforms?.ids?.() ?? []).map((id) => ({ id, kind: this.platforms.get(id)?.kind ?? 'unknown' })),
      hud: this.hud?.snapshot?.() ?? null,
      textureFallbackCount: this.textureManager?.fallbackCount ?? 0,
      effects: {
        particles: this.particles?.activeCount?.() ?? 0,
        trailPoints: this.trail?.points?.length ?? 0,
      },
      renderer: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      content: {
        scene: {
          requestedId: this.sceneSelection?.definition?.id ?? DEFAULT_SCENE.id,
          selectedId: this.sceneSelection?.definition?.id ?? DEFAULT_SCENE.id,
          usedFallback: this.sceneSelection?.usedFallback ?? false,
        },
        character: this.characterSelection?.snapshot ?? null,
      },
      errors: {
        count: this.errorCount,
        consecutiveDrawErrors: this.consecutiveDrawErrors,
        last: this.lastError ? { ...this.lastError } : null,
      },
      lastDraw: this.lastDrawState ? { ...this.lastDrawState, player: { ...this.lastDrawState.player } } : null,
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.ready = false;
    this.contextLost = false;

    const safely = (phase, operation) => {
      try {
        operation?.();
      } catch (error) {
        this.captureError(`dispose:${phase}`, error);
      }
    };

    safely('context-lifecycle', () => this.contextLifecycle?.dispose?.());
    safely('hud', () => this.hud?.dispose?.());
    safely('trail', () => this.trail?.dispose?.());
    safely('particles', () => this.particles?.dispose?.());
    safely('character', () => this.characterSelection?.dispose?.());
    if (this.platforms) safely('platforms', () => this.platforms.dispose());
    else safely('platform-factory', () => this.platformFactory?.dispose?.());
    safely('textures', () => this.textureManager?.dispose?.());
    safely('stage', () => this.stage?.dispose?.());
    safely('render-lists', () => this.renderer?.renderLists?.dispose?.());
    safely('renderer', () => this.renderer?.dispose?.());
  }

  destroy() {
    this.dispose();
  }
}

export default Renderer3D;
