import * as THREE from 'three';
import { clamp, dampFactor, easeOutCubic, RENDER3D_COLORS } from './constants.js';

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class CharacterRig extends THREE.Group {
  constructor() {
    super();
    this.name = 'CharacterRig';
    this.headingRoot = new THREE.Group();
    this.actionRoot = new THREE.Group();
    this.flipPivot = new THREE.Group();
    this.bodyRoot = new THREE.Group();
    this.flipPivot.position.y = 0.86;
    this.bodyRoot.position.y = -0.86;
    this.add(this.headingRoot);
    this.headingRoot.add(this.actionRoot);
    this.actionRoot.add(this.flipPivot);
    this.flipPivot.add(this.bodyRoot);

    this.redMaterial = new THREE.MeshStandardMaterial({
      color: RENDER3D_COLORS.red,
      roughness: 0.72,
      metalness: 0,
    });

    this.torsoGeometry = new THREE.CylinderGeometry(0.28, 0.5, 1.02, 24, 1, false);
    this.headGeometry = new THREE.SphereGeometry(0.43, 22, 14);

    const torso = shadow(new THREE.Mesh(this.torsoGeometry, this.redMaterial));
    torso.position.y = 0.51;
    const head = shadow(new THREE.Mesh(this.headGeometry, this.redMaterial));
    head.position.y = 1.34;
    this.bodyRoot.add(torso, head);
    this.currentYaw = 0;
    this.initialized = false;
  }

  update(player, context = {}, deltaSeconds = 0) {
    if (!player?.position) {
      this.visible = false;
      return;
    }
    this.visible = true;
    const position = player.position;
    const supportHeight = Number.isFinite(context.supportHeight)
      ? context.supportHeight
      : Number.isFinite(context.current?.height) ? context.current.height : 0.34;
    const platformCompression = context.isCharging
      ? supportHeight * clamp(context.chargePower) * 0.22
      : 0;
    this.position.set(
      Number.isFinite(position.x) ? position.x : 0,
      (Number.isFinite(position.y) ? position.y : 0) - platformCompression,
      Number.isFinite(position.z) ? position.z : 0,
    );

    const target = context.selectedChoice == null
      ? null
      : context.candidates?.[context.selectedChoice];
    const heading = target?.center
      ? {
        x: (Number.isFinite(target.center.x) ? target.center.x : 0) - this.position.x,
        z: (Number.isFinite(target.center.z) ? target.center.z : 0) - this.position.z,
      }
      : context.current?.heading ?? { x: 0, z: 1 };
    const desiredYaw = Math.atan2(
      Number.isFinite(heading.x) ? heading.x : 0,
      Number.isFinite(heading.z) ? heading.z : 1,
    );
    if (!this.initialized || context.reducedMotion) {
      this.currentYaw = desiredYaw;
      this.initialized = true;
    } else {
      const deltaYaw = Math.atan2(Math.sin(desiredYaw - this.currentYaw), Math.cos(desiredYaw - this.currentYaw));
      this.currentYaw += deltaYaw * dampFactor(deltaSeconds, 13);
    }
    this.headingRoot.rotation.y = this.currentYaw;

    const jumpProgress = clamp(context.jumpProgress);
    this.flipPivot.rotation.x = context.isJumping && !context.reducedMotion
      ? -Math.PI * 2 * easeOutCubic(jumpProgress)
      : 0;

    const missProgress = clamp(
      typeof context.missVisual === 'number'
        ? context.missVisual
        : context.missVisual?.progress ?? 0,
    );
    const missReason = context.missVisual && typeof context.missVisual === 'object'
      ? context.missVisual.reason
      : null;
    this.actionRoot.rotation.x = missProgress > 0
      ? (missReason === 'short' ? -1 : 1) * Math.PI * 0.52 * easeOutCubic(missProgress)
      : 0;
    this.actionRoot.rotation.z = missProgress > 0 ? Math.sin(missProgress * Math.PI) * 0.16 : 0;

    const landingPulse = context.isLanding && !context.reducedMotion
      ? Math.sin(clamp(context.landingProgress) * Math.PI) : 0;
    const charge = context.isCharging ? clamp(context.chargePower) : 0;
    const desiredScale = {
      x: 1 + charge * 0.18 + landingPulse * 0.1,
      y: 1 - charge * 0.3 - landingPulse * 0.14,
      z: 1 + charge * 0.18 + landingPulse * 0.1,
    };
    const scaleBlend = context.reducedMotion ? 1 : dampFactor(deltaSeconds, context.isCharging ? 15 : 22);
    this.bodyRoot.scale.x += (desiredScale.x - this.bodyRoot.scale.x) * scaleBlend;
    this.bodyRoot.scale.y += (desiredScale.y - this.bodyRoot.scale.y) * scaleBlend;
    this.bodyRoot.scale.z += (desiredScale.z - this.bodyRoot.scale.z) * scaleBlend;
  }

  dispose() {
    this.torsoGeometry.dispose();
    this.headGeometry.dispose();
    this.redMaterial.dispose();
    this.removeFromParent();
    this.clear();
  }
}
