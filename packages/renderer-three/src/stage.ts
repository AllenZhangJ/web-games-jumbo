import * as THREE from 'three';
import { RENDER3D_COLORS } from './constants.js';
import { CameraRig } from './camera-rig.js';
import { LightingRig } from './lighting-rig.js';

export class Stage {
  [key: string]: any;
  constructor(renderer, sceneDefinition: any = null) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    const background = sceneDefinition?.theme?.background ?? RENDER3D_COLORS.background;
    this.scene.background = new THREE.Color(background);
    this.scene.fog = new THREE.Fog(
      background,
      sceneDefinition?.theme?.fogNear ?? 24,
      sceneDefinition?.theme?.fogFar ?? 48,
    );
    this.cameraRig = new CameraRig();
    this.lighting = new LightingRig({ definition: sceneDefinition?.lighting });
    this.worldRoot = new THREE.Group();
    this.worldRoot.name = 'WorldRoot';

    const floorGeometry = new THREE.PlaneGeometry(160, 160);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: sceneDefinition?.theme?.floor ?? RENDER3D_COLORS.floor,
      roughness: 1,
      metalness: 0,
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.name = 'ShadowReceiver';
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -1.2;
    this.floor.receiveShadow = true;
    this.floor.frustumCulled = false;

    this.scene.add(this.worldRoot, this.floor, this.lighting);
  }

  resize(width, height) {
    this.cameraRig.resize(width, height);
  }

  updateCamera(context, deltaSeconds, transition = null) {
    const focus = this.cameraRig.update(context, deltaSeconds, transition);
    this.lighting.update(focus);
  }

  render() {
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  dispose() {
    this.floor.geometry.dispose();
    this.floor.material.dispose();
    this.floor.removeFromParent();
    this.lighting.dispose();
    this.worldRoot.clear();
    this.scene.clear();
  }
}
