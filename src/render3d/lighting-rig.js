import * as THREE from 'three';
import { SHADOW_DEFAULTS } from './constants.js';

export class LightingRig extends THREE.Group {
  constructor({ shadowMapSize = SHADOW_DEFAULTS.mapSize } = {}) {
    super();
    this.name = 'LightingRig';
    this.hemisphere = new THREE.HemisphereLight(0xffffff, 0xc9ced6, 2.15);
    this.key = new THREE.DirectionalLight(0xffffff, 3.25);
    this.key.castShadow = true;
    this.key.position.set(-7.5, 12.5, -6.5);
    this.key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    this.key.shadow.bias = -0.00035;
    this.key.shadow.normalBias = 0.035;
    this.key.shadow.camera.near = 1;
    this.key.shadow.camera.far = 35;
    const extent = SHADOW_DEFAULTS.cameraExtent;
    this.key.shadow.camera.left = -extent;
    this.key.shadow.camera.right = extent;
    this.key.shadow.camera.top = extent;
    this.key.shadow.camera.bottom = -extent;
    this.key.target.position.set(0, 0, 0);
    this.add(this.hemisphere, this.key, this.key.target);
  }

  update(focus) {
    if (!focus) return;
    this.key.position.set(focus.x - 7.5, focus.y + 12.5, focus.z - 6.5);
    this.key.target.position.set(focus.x, 0, focus.z);
    this.key.target.updateMatrixWorld();
  }

  dispose() {
    this.key.shadow.map?.dispose?.();
    this.removeFromParent();
  }
}
