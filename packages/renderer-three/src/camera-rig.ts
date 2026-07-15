import * as THREE from 'three';
import { CAMERA_DEFAULTS, dampFactor } from './constants.js';

export class CameraRig {
  [key: string]: any;
  constructor() {
    const { viewHeight, near, far } = CAMERA_DEFAULTS;
    this.camera = new THREE.OrthographicCamera(-viewHeight / 2, viewHeight / 2, viewHeight / 2, -viewHeight / 2, near, far);
    this.focus = new THREE.Vector3();
    this.desiredFocus = new THREE.Vector3();
    this.offset = new THREE.Vector3(
      CAMERA_DEFAULTS.offset.x,
      CAMERA_DEFAULTS.offset.y,
      CAMERA_DEFAULTS.offset.z,
    );
    this.aspect = 1;
    this.viewHeight = /** @type {number} */ (viewHeight);
    this.initialized = false;
    this.resize(1, 1);
  }

  resize(width: number, height: number) {
    const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
    const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
    this.aspect = Math.max(0.1, safeWidth / safeHeight);
    const portraitAdjustment = this.aspect < 0.72 ? (0.72 - this.aspect) * 17 : 0;
    this.viewHeight = CAMERA_DEFAULTS.viewHeight + portraitAdjustment;
    const halfHeight = this.viewHeight / 2;
    const halfWidth = halfHeight * this.aspect;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  calculateFocus(
    { current, candidates = [], player, origin, jumping = false }: any,
    target = new THREE.Vector3(),
  ) {
    const originX = Number.isFinite(origin?.x) ? origin.x : 0;
    const originZ = Number.isFinite(origin?.z) ? origin.z : 0;
    const heading = current?.heading ?? { x: 0, z: 1 };
    const currentX = (Number.isFinite(current?.center?.x) ? current.center.x : 0) - originX;
    const currentZ = (Number.isFinite(current?.center?.z) ? current.center.z : 0) - originZ;
    let targetX = currentX + (Number.isFinite(heading.x) ? heading.x : 0) * CAMERA_DEFAULTS.lookAhead;
    let targetZ = currentZ + (Number.isFinite(heading.z) ? heading.z : 1) * CAMERA_DEFAULTS.lookAhead;

    const visibleCandidates: any[] = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
    if (visibleCandidates.length > 0) {
      const candidateCenter = visibleCandidates.reduce((sum, item) => ({
        x: sum.x + (Number.isFinite(item?.center?.x) ? item.center.x : 0),
        z: sum.z + (Number.isFinite(item?.center?.z) ? item.center.z : 0),
      }), { x: 0, z: 0 });
      targetX = ((currentX * 1.35) + candidateCenter.x / visibleCandidates.length - originX) / 2.35;
      targetZ = ((currentZ * 1.35) + candidateCenter.z / visibleCandidates.length - originZ) / 2.35;
    }

    if (jumping && player?.position) {
      const playerX = (Number.isFinite(player.position.x) ? player.position.x : 0) - originX;
      const playerZ = (Number.isFinite(player.position.z) ? player.position.z : 0) - originZ;
      targetX = targetX * 0.48 + playerX * 0.52;
      targetZ = targetZ * 0.48 + playerZ * 0.52;
    }

    return target.set(targetX, 0.45, targetZ);
  }

  update(context: any, deltaSeconds: number, transition: any = null) {
    const { reducedMotion = false } = context;
    this.calculateFocus(context, this.desiredFocus);
    if (!this.initialized || reducedMotion) {
      this.focus.copy(this.desiredFocus);
      this.initialized = true;
    } else if (transition?.fromFocus && transition?.toFocus) {
      this.focus.copy(transition.fromFocus).lerp(transition.toFocus, transition.progress);
    } else {
      this.focus.lerp(this.desiredFocus, dampFactor(deltaSeconds, 5.8));
    }
    this.camera.position.copy(this.focus).add(this.offset);
    this.camera.lookAt(this.focus);
    this.camera.updateMatrixWorld();
    return this.focus;
  }

  snapshot() {
    return {
      focus: { x: this.focus.x, y: this.focus.y, z: this.focus.z },
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      viewHeight: this.viewHeight,
      aspect: this.aspect,
    };
  }
}
