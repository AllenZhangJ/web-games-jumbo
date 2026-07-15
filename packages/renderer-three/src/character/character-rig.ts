import * as THREE from 'three';
import { clamp, dampFactor, easeOutCubic, RENDER3D_COLORS } from '../constants.js';

function shadow<T extends THREE.Mesh>(mesh: T): T {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class CharacterRig extends THREE.Group {
  [key: string]: any;
  constructor(definition: any = null) {
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

    this.primaryMaterial = new THREE.MeshStandardMaterial({
      color: definition?.primaryColor ?? RENDER3D_COLORS.red,
      roughness: 0.72,
      metalness: 0,
    });
    this.secondaryMaterial = new THREE.MeshStandardMaterial({
      color: definition?.appearance?.secondaryColor ?? 0xffcdd2,
      roughness: 0.58,
      metalness: definition?.appearance?.bodyShape === 'bot' ? 0.18 : 0,
    });
    this.geometries = [];
    this.materials = [this.primaryMaterial, this.secondaryMaterial];
    this.createBody(definition?.appearance?.bodyShape ?? 'jumbo');
    this.createAccessory(definition?.appearance?.accessory ?? 'none');
    this.definition = definition;
    this.motionStyle = definition?.appearance?.motionStyle ?? 'balanced';
    this.scale.setScalar(Number.isFinite(definition?.visualScale) ? definition.visualScale : 1);
    this.currentYaw = 0;
    this.initialized = false;
    this.elapsed = 0;
  }

  addPart(geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]) {
    this.geometries.push(geometry);
    const part = shadow(new THREE.Mesh(geometry, material));
    part.position.set(...position);
    this.bodyRoot.add(part);
    return part;
  }

  createBody(shape: string) {
    switch (shape) {
      case 'capsule': {
        this.addPart(new THREE.CapsuleGeometry(0.38, 0.72, 6, 18), this.primaryMaterial, [0, 0.74, 0]);
        this.addPart(new THREE.SphereGeometry(0.34, 20, 14), this.secondaryMaterial, [0, 1.44, 0]);
        break;
      }
      case 'orb': {
        this.addPart(new THREE.SphereGeometry(0.62, 24, 16), this.primaryMaterial, [0, 0.72, 0]);
        this.addPart(new THREE.SphereGeometry(0.31, 20, 14), this.secondaryMaterial, [0, 1.42, 0]);
        break;
      }
      case 'bot': {
        this.addPart(new THREE.BoxGeometry(0.78, 0.92, 0.58), this.primaryMaterial, [0, 0.58, 0]);
        this.addPart(new THREE.BoxGeometry(0.68, 0.56, 0.58), this.secondaryMaterial, [0, 1.36, 0]);
        break;
      }
      case 'cone': {
        this.addPart(new THREE.ConeGeometry(0.56, 1.08, 20), this.primaryMaterial, [0, 0.56, 0]);
        this.addPart(new THREE.SphereGeometry(0.35, 20, 14), this.secondaryMaterial, [0, 1.38, 0]);
        break;
      }
      default: {
        this.addPart(new THREE.CylinderGeometry(0.28, 0.5, 1.02, 24), this.primaryMaterial, [0, 0.51, 0]);
        this.addPart(new THREE.SphereGeometry(0.43, 22, 14), this.primaryMaterial, [0, 1.34, 0]);
      }
    }
  }

  createAccessory(accessory: string) {
    switch (accessory) {
      case 'antenna': {
        this.addPart(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 10), this.secondaryMaterial, [0, 1.88, 0]);
        this.addPart(new THREE.SphereGeometry(0.11, 12, 8), this.primaryMaterial, [0, 2.08, 0]);
        break;
      }
      case 'visor': {
        this.addPart(new THREE.BoxGeometry(0.52, 0.14, 0.08), this.secondaryMaterial, [0, 1.43, 0.31]);
        break;
      }
      case 'ears': {
        const left = this.addPart(new THREE.ConeGeometry(0.14, 0.42, 10), this.secondaryMaterial, [-0.22, 1.82, 0]);
        const right = this.addPart(new THREE.ConeGeometry(0.14, 0.42, 10), this.secondaryMaterial, [0.22, 1.82, 0]);
        left.rotation.z = -0.16;
        right.rotation.z = 0.16;
        break;
      }
      case 'ring': {
        const ring = this.addPart(new THREE.TorusGeometry(0.52, 0.045, 10, 28), this.secondaryMaterial, [0, 1.4, 0]);
        ring.rotation.x = Math.PI / 2;
        break;
      }
      case 'crown': {
        this.addPart(new THREE.CylinderGeometry(0.22, 0.34, 0.34, 5, 1, true), this.secondaryMaterial, [0, 1.85, 0]);
        break;
      }
    }
  }

  update(player: any, context: any = {}, deltaSeconds = 0) {
    if (!player?.position) {
      this.visible = false;
      return;
    }
    this.visible = true;
    this.elapsed += Math.max(0, deltaSeconds);
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
    const flipTurns = this.motionStyle === 'swift' ? 1.35 : this.motionStyle === 'heavy' ? 0.7 : 1;
    this.flipPivot.rotation.x = context.isJumping && !context.reducedMotion
      ? -Math.PI * 2 * flipTurns * easeOutCubic(jumpProgress)
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
    const springFactor = this.motionStyle === 'spring' ? 1.32 : this.motionStyle === 'heavy' ? 0.72 : 1;
    const desiredScale = {
      x: 1 + charge * 0.18 * springFactor + landingPulse * 0.1 * springFactor,
      y: 1 - charge * 0.3 * springFactor - landingPulse * 0.14 * springFactor,
      z: 1 + charge * 0.18 * springFactor + landingPulse * 0.1 * springFactor,
    };
    const scaleBlend = context.reducedMotion ? 1 : dampFactor(deltaSeconds, context.isCharging ? 15 : 22);
    this.bodyRoot.scale.x += (desiredScale.x - this.bodyRoot.scale.x) * scaleBlend;
    this.bodyRoot.scale.y += (desiredScale.y - this.bodyRoot.scale.y) * scaleBlend;
    this.bodyRoot.scale.z += (desiredScale.z - this.bodyRoot.scale.z) * scaleBlend;
    this.bodyRoot.position.y = this.motionStyle === 'float' && !context.reducedMotion
      ? Math.sin(this.elapsed * 2.4) * 0.06
      : 0;
  }

  dispose() {
    this.geometries.forEach((geometry: THREE.BufferGeometry) => geometry.dispose());
    this.materials.forEach((material: THREE.Material) => material.dispose());
    this.removeFromParent();
    this.clear();
  }
}
