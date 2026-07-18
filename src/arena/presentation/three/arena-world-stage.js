import * as THREE from 'three';
import {
  createArenaWorldBounds,
  createOrthographicArenaCamera,
} from '../camera/orthographic-arena-camera.js';
import { ARENA_V1_GREYBOX_CONTENT } from '../content/arena-v1-greybox-content.js';
import { CharacterViewRegistry } from './character-view-registry.js';
import { disposeThreeObject } from './dispose-three-resources.js';
import { EquipmentViewRegistry } from './equipment-view-registry.js';
import { GreyboxEventEffects } from './greybox-event-effects.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';
import { SurfaceViewRegistry } from './surface-view-registry.js';
import { ProgrammaticCharacterViewFactory } from './programmatic-character-view-factory.js';

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
  #cameraModel;
  #lastMatchSeed;
  #lastTick;
  #lastEffectSequence;
  #disposed;

  constructor({
    content = ARENA_V1_GREYBOX_CONTENT,
    characterViewFactory = null,
    maximumEffects = ARENA_GREYBOX_DESIGN.maximumEffects,
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
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
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
    this.#cameraModel = null;
    this.#lastMatchSeed = null;
    this.#lastTick = -1;
    this.#lastEffectSequence = -1;
    this.#disposed = false;
    try {
      this.#surfaces = new SurfaceViewRegistry(this.surfaceRoot, content.map.surfaces);
      this.#characters = new CharacterViewRegistry(this.characterRoot, {
        presentationRegistry: content.characterPresentationRegistry,
        viewFactory: characterViewFactory ?? new ProgrammaticCharacterViewFactory({
          assetRegistry: content.assetRegistry,
        }),
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

  resize(viewport) {
    this.#assertUsable();
    this.#cameraModel = createOrthographicArenaCamera({
      viewport,
      worldBounds: createArenaWorldBounds(this.#content.map.surfaces),
    });
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
    return this.#cameraModel;
  }

  sync(frame) {
    this.#assertUsable();
    if (!frame?.world || !frame?.source) throw new TypeError('ArenaWorldStage 需要 presentation frame。');
    const matchChanged = this.#lastMatchSeed !== frame.source.matchSeed
      || frame.source.tick < this.#lastTick;
    if (matchChanged) {
      this.#effects.clear();
      this.#lastEffectSequence = -1;
    }
    this.#surfaces.sync(frame.world.map, { snap: this.#lastTick < 0 || matchChanged });
    this.#characters.sync(frame, {
      snap: this.#lastTick < 0 || matchChanged,
      cameraModel: this.#cameraModel,
    });
    this.#equipment.sync(frame.world.equipment, { snap: this.#lastTick < 0 || matchChanged });
    const unseenEvents = frame.events.filter(({ sequence }) => sequence > this.#lastEffectSequence);
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
    this.#surfaces.update(deltaSeconds);
    this.#characters.update(deltaSeconds);
    this.#equipment.update(deltaSeconds);
    this.#effects.update(deltaSeconds);
  }

  resetTransient() {
    this.#assertUsable();
    this.#effects.clear();
    this.#lastMatchSeed = null;
    this.#lastTick = -1;
    this.#lastEffectSequence = -1;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      lastMatchSeed: this.#lastMatchSeed,
      lastTick: this.#lastTick,
      lastEffectSequence: this.#lastEffectSequence,
      objectCount: countObjects(this.scene),
      cameraModel: this.#cameraModel,
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
