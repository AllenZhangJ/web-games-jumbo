import * as THREE from 'three';
import {
  createArenaWorldBounds,
  createLocalFollowArenaCamera,
  createOrthographicArenaCamera,
} from '../camera/orthographic-arena-camera.js';
import { ARENA_V1_GREYBOX_CONTENT } from '../content/arena-v1-greybox-content.js';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '../assets/presentation-asset-provider-ids.js';
import { CharacterViewRegistry } from './character-view-registry.js';
import { disposeThreeObject } from './dispose-three-resources.js';
import { EquipmentViewRegistry } from './equipment-view-registry.js';
import { GreyboxEventEffects } from './greybox-event-effects.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';
import { SurfaceViewRegistry } from './surface-view-registry.js';
import { ProgrammaticCharacterViewFactory } from './programmatic-character-view-factory.js';
import { GltfCharacterViewFactory } from './gltf-character-view-factory.js';

const EMPTY_EVENTS = Object.freeze([]);

function eventsAfter(events, sequence) {
  let result = null;
  for (const event of events) {
    if (event.sequence <= sequence) continue;
    if (result === null) result = [];
    result.push(event);
  }
  return result ?? EMPTY_EVENTS;
}

function countObjects(root) {
  let count = 0;
  root.traverse(() => { count += 1; });
  return count;
}

export class ArenaWorldStage {
  #content;
  #surfaces;
  #characters;
  #equipment;
  #effects;
  #characterViewFactory;
  #ownsCharacterViewFactory;
  #cameraModel;
  #worldBounds;
  #followCamera;
  #cameraTarget;
  #cameraVisual;
  #cameraImpactTime;
  #cameraImpactDuration;
  #cameraImpactStrength;
  #cameraZoom;
  #hitStopTime;
  #lastMatchSeed;
  #lastTick;
  #lastEffectSequence;
  #disposed;

  constructor({
    content = ARENA_V1_GREYBOX_CONTENT,
    characterViewFactory = null,
    maximumEffects = ARENA_GREYBOX_DESIGN.maximumEffects,
    presentationAssetLoader = null,
  } = {}) {
    this.#content = content;
    this.scene = new THREE.Scene();
    this.scene.name = 'ArenaGreyboxScene';
    this.scene.background = new THREE.Color(ARENA_GREYBOX_COLOR.background);
    this.scene.fog = new THREE.Fog(ARENA_GREYBOX_COLOR.background, 25, 55);
    this.camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80);
    this.worldRoot = new THREE.Group();
    this.worldRoot.name = 'ArenaWorldRoot';
    this.surfaceRoot = new THREE.Group();
    this.surfaceRoot.name = 'ArenaSurfaceRoot';
    this.characterRoot = new THREE.Group();
    this.characterRoot.name = 'ArenaCharacterRoot';
    this.equipmentRoot = new THREE.Group();
    this.equipmentRoot.name = 'ArenaEquipmentRoot';
    this.effectRoot = new THREE.Group();
    this.effectRoot.name = 'ArenaEffectRoot';
    this.worldRoot.add(
      this.surfaceRoot,
      this.characterRoot,
      this.equipmentRoot,
      this.effectRoot,
    );
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x9ca7ae, 2.2);
    hemisphere.name = 'ArenaHemisphereLight';
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.name = 'ArenaKeyLight';
    key.position.set(-8, 14, -8);
    key.castShadow = true;
    key.shadow.mapSize.set(
      ARENA_GREYBOX_DESIGN.shadowMapSize,
      ARENA_GREYBOX_DESIGN.shadowMapSize,
    );
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 24;
    key.shadow.camera.top = 24;
    key.shadow.camera.bottom = -24;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    const abyssGeometry = new THREE.PlaneGeometry(80, 80);
    const abyssMaterial = new THREE.MeshStandardMaterial({
      color: ARENA_GREYBOX_COLOR.abyss,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.32,
    });
    this.abyss = new THREE.Mesh(abyssGeometry, abyssMaterial);
    this.abyss.name = 'ArenaAbyssReceiver';
    this.abyss.rotation.x = -Math.PI / 2;
    this.abyss.position.y = content.map.killY - 0.2;
    this.abyss.receiveShadow = true;
    this.scene.add(this.worldRoot, hemisphere, key, this.abyss);
    this.#surfaces = null;
    this.#characters = null;
    this.#equipment = null;
    this.#effects = null;
    this.#characterViewFactory = null;
    this.#ownsCharacterViewFactory = characterViewFactory === null;
    this.#cameraModel = null;
    this.#worldBounds = createArenaWorldBounds(content.map.surfaces);
    this.#followCamera = (this.#worldBounds.maxX - this.#worldBounds.minX) > 22
      || (this.#worldBounds.maxZ - this.#worldBounds.minZ) > 22;
    this.#cameraTarget = new THREE.Vector3(0, 0, 0);
    this.#cameraVisual = new THREE.Vector3(0, 0, 0);
    this.#cameraImpactTime = 0;
    this.#cameraImpactDuration = 0;
    this.#cameraImpactStrength = 0;
    this.#cameraZoom = 1;
    this.#hitStopTime = 0;
    this.#lastMatchSeed = null;
    this.#lastTick = -1;
    this.#lastEffectSequence = -1;
    this.#disposed = false;
    try {
      const usesGltfCharacters = content.assetRegistry.list().some((asset) => (
        asset.providerId === ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1
      ));
      this.#characterViewFactory = characterViewFactory ?? (
        usesGltfCharacters
          ? new GltfCharacterViewFactory({
            assetRegistry: content.assetRegistry,
            actionPresentations: content.actions,
            ...(presentationAssetLoader === null ? {} : { loader: presentationAssetLoader }),
          })
          : new ProgrammaticCharacterViewFactory({
            assetRegistry: content.assetRegistry,
            actionPresentations: content.actions,
          })
      );
      this.#surfaces = new SurfaceViewRegistry(this.surfaceRoot, content.map.surfaces);
      this.#characters = new CharacterViewRegistry(this.characterRoot, {
        presentationRegistry: content.characterPresentationRegistry,
        viewFactory: this.#characterViewFactory,
        actionPresentations: content.actions,
      });
      this.#equipment = new EquipmentViewRegistry(this.equipmentRoot);
      this.#effects = new GreyboxEventEffects(this.effectRoot, { maximumEffects });
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('ArenaWorldStage 已销毁。');
  }

  async load() {
    this.#assertUsable();
    await this.#characterViewFactory?.load?.();
    return this;
  }

  resize(viewport) {
    this.#assertUsable();
    this.#cameraModel = this.#followCamera
      ? createLocalFollowArenaCamera({ viewport, worldBounds: this.#worldBounds })
      : createOrthographicArenaCamera({ viewport, worldBounds: this.#worldBounds });
    const { frustum, position, target } = this.#cameraModel;
    this.camera.left = frustum.left;
    this.camera.right = frustum.right;
    this.camera.top = frustum.top;
    this.camera.bottom = frustum.bottom;
    this.camera.near = this.#cameraModel.near;
    this.camera.far = this.#cameraModel.far;
    this.camera.position.set(-position.x, position.y, position.z);
    this.camera.lookAt(-target.x, target.y, target.z);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.#cameraTarget.set(-target.x, target.y, target.z);
    this.#cameraVisual.copy(this.#cameraTarget);
    return this.#cameraModel;
  }

  #setFollowTarget(frame, snap) {
    if (!this.#followCamera) return;
    const localId = frame.hud?.local?.participantId;
    const local = frame.world.participants.find(({ id }) => id === localId);
    if (!local) return;
    this.#cameraTarget.set(-local.position.x, Math.max(0, local.position.y * 0.18), local.position.z);
    if (snap) this.#cameraVisual.copy(this.#cameraTarget);
  }

  #consumeCameraImpact(events, reducedMotion) {
    for (const event of events) {
      if (event.type !== 'HitResolved') continue;
      if (reducedMotion) {
        this.#cameraImpactTime = 0;
        this.#cameraImpactDuration = 0;
        this.#cameraImpactStrength = 0;
        this.#hitStopTime = Math.max(this.#hitStopTime, 0.025);
        continue;
      }
      const strength = event.action === 'hammer-smash'
        ? 0.34
        : event.action === 'shield-charge' ? 0.24 : event.action === 'chain-pull' ? 0.2 : 0.16;
      if (strength < this.#cameraImpactStrength && this.#cameraImpactTime > 0) continue;
      this.#cameraImpactStrength = strength;
      this.#cameraImpactDuration = event.action === 'hammer-smash' ? 0.24 : 0.16;
      this.#cameraImpactTime = this.#cameraImpactDuration;
      this.#hitStopTime = Math.max(
        this.#hitStopTime,
        event.action === 'hammer-smash' ? 0.075 : event.action === 'shield-charge' ? 0.055 : 0.042,
      );
    }
  }

  #applyCameraTransform() {
    const impact = this.#cameraImpactDuration > 0
      ? this.#cameraImpactTime / this.#cameraImpactDuration
      : 0;
    const shakeX = Math.sin(this.#cameraImpactTime * 145) * this.#cameraImpactStrength * impact;
    const shakeZ = Math.sin(this.#cameraImpactTime * 103 + 0.8)
      * this.#cameraImpactStrength * 0.55 * impact;
    this.camera.position.set(
      this.#cameraVisual.x + shakeX,
      16 + this.#cameraVisual.y,
      this.#cameraVisual.z - 16 + shakeZ,
    );
    this.camera.lookAt(
      this.#cameraVisual.x,
      this.#cameraVisual.y,
      this.#cameraVisual.z,
    );
    const zoom = 1 + impact * this.#cameraImpactStrength * 0.13;
    if (Math.abs(zoom - this.#cameraZoom) > 1e-6) {
      this.camera.zoom = zoom;
      this.camera.updateProjectionMatrix();
      this.#cameraZoom = zoom;
    }
    this.camera.updateMatrixWorld(true);
  }

  sync(frame, { reducedMotion = false } = {}) {
    this.#assertUsable();
    if (!frame?.world || !frame?.source) throw new TypeError('ArenaWorldStage 需要 presentation frame。');
    if (typeof reducedMotion !== 'boolean') {
      throw new TypeError('ArenaWorldStage.reducedMotion 必须是布尔值。');
    }
    const matchChanged = this.#lastMatchSeed !== frame.source.matchSeed
      || frame.source.tick < this.#lastTick;
    if (matchChanged) {
      this.#effects.clear();
      this.#lastEffectSequence = -1;
    }
    this.#setFollowTarget(frame, this.#lastTick < 0 || matchChanged);
    this.#surfaces.sync(frame.world.map, { snap: this.#lastTick < 0 || matchChanged });
    this.#characters.sync(frame, {
      snap: this.#lastTick < 0 || matchChanged,
      cameraModel: this.#cameraModel,
    });
    this.#equipment.sync(frame.world.equipment, { snap: this.#lastTick < 0 || matchChanged });
    const unseenEvents = eventsAfter(frame.events, this.#lastEffectSequence);
    this.#consumeCameraImpact(unseenEvents, reducedMotion);
    this.#effects.consume(
      unseenEvents,
      (participantId) => this.#characters.getParticipantVisualPosition(participantId),
    );
    for (const event of unseenEvents) {
      this.#lastEffectSequence = Math.max(this.#lastEffectSequence, event.sequence);
    }
    this.#lastMatchSeed = frame.source.matchSeed;
    this.#lastTick = frame.source.tick;
  }

  update(deltaSeconds) {
    this.#assertUsable();
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    const hitStopped = this.#hitStopTime > 0;
    this.#hitStopTime = Math.max(0, this.#hitStopTime - delta);
    this.#surfaces.update(deltaSeconds);
    this.#characters.update(hitStopped ? 0 : deltaSeconds);
    this.#equipment.update(hitStopped ? 0 : deltaSeconds);
    this.#effects.update(deltaSeconds);
    const followBlend = 1 - Math.exp(-8.5 * delta);
    this.#cameraVisual.lerp(this.#cameraTarget, followBlend);
    this.#cameraImpactTime = Math.max(0, this.#cameraImpactTime - delta);
    if (this.#cameraImpactTime === 0) this.#cameraImpactStrength = 0;
    this.#applyCameraTransform();
  }

  resetTransient() {
    this.#assertUsable();
    this.#effects.clear();
    this.#lastMatchSeed = null;
    this.#lastTick = -1;
    this.#lastEffectSequence = -1;
    this.#cameraImpactTime = 0;
    this.#cameraImpactDuration = 0;
    this.#cameraImpactStrength = 0;
    this.#cameraZoom = 1;
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.#hitStopTime = 0;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      lastMatchSeed: this.#lastMatchSeed,
      lastTick: this.#lastTick,
      lastEffectSequence: this.#lastEffectSequence,
      objectCount: countObjects(this.scene),
      cameraModel: this.#cameraModel,
      followCamera: this.#followCamera,
      cameraTarget: Object.freeze({
        x: this.#cameraTarget.x,
        y: this.#cameraTarget.y,
        z: this.#cameraTarget.z,
      }),
      cameraImpactStrength: this.#cameraImpactStrength,
      hitStopTime: this.#hitStopTime,
      characterAssets: this.#characterViewFactory?.getDebugSnapshot?.() ?? null,
      ...this.#surfaces.getDebugSnapshot(),
      ...this.#characters.getDebugSnapshot(),
      ...this.#equipment.getDebugSnapshot(),
      ...this.#effects.getDebugSnapshot(),
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors = [];
    for (const value of [this.#effects, this.#equipment, this.#characters, this.#surfaces]) {
      try { value?.dispose(); } catch (error) { errors.push(error); }
    }
    if (this.#ownsCharacterViewFactory) {
      try { this.#characterViewFactory?.dispose?.(); } catch (error) { errors.push(error); }
    }
    this.#characterViewFactory = null;
    // Registries already own their child resources. Dispose only the stage's
    // remaining plane; lights have no disposable GPU resources.
    try { disposeThreeObject(this.abyss); } catch (error) { errors.push(error); }
    try { this.scene.clear(); } catch (error) { errors.push(error); }
    if (errors.length > 0) {
      const failure = new Error('ArenaWorldStage 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
