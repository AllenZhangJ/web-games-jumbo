import * as THREE from 'three';

const MAX_POINTS = 18;

export class TailTrail {
  [key: string]: any;
  constructor(root: THREE.Object3D, { maxPoints = MAX_POINTS } = {}) {
    this.root = root;
    this.maxPoints = Math.max(2, Math.min(MAX_POINTS, Math.floor(maxPoints)));
    this.positions = new Float32Array(this.maxPoints * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.LineBasicMaterial({
      color: 0xf06a63,
      transparent: true,
      opacity: 0.54,
      depthWrite: false,
      toneMapped: false,
    });
    this.line = new THREE.Line(this.geometry, this.material);
    this.line.name = 'JumpTrail';
    this.line.frustumCulled = false;
    this.line.renderOrder = 3;
    this.points = Array.from({ length: this.maxPoints }, () => new THREE.Vector3());
    this.pointCount = 0;
    this.sampleElapsed = 0;
    this.wasActive = false;
    this.root.add(this.line);
  }

  update(position: any, { active = false, reducedMotion = false } = {}, deltaSeconds: number) {
    if (reducedMotion || !position) {
      this.clear();
      return;
    }
    if (!active) {
      if (this.wasActive && this.pointCount > 0) this.shiftLeft();
      else this.pointCount = 0;
      this.wasActive = false;
      this.writeGeometry();
      return;
    }
    this.wasActive = true;
    this.sampleElapsed += deltaSeconds;
    const previous = this.pointCount > 0 ? this.points[this.pointCount - 1] : null;
    const moved = !previous || previous.distanceToSquared(position) > 0.018;
    if ((this.sampleElapsed >= 1 / 60 && moved) || !previous) {
      this.sampleElapsed = 0;
      if (this.pointCount >= this.maxPoints) this.shiftLeft();
      this.points[this.pointCount]?.set(
        Number.isFinite(position.x) ? position.x : 0,
        Number.isFinite(position.y) ? position.y : 0,
        Number.isFinite(position.z) ? position.z : 0,
      );
      this.pointCount += 1;
    }
    this.writeGeometry();
  }

  shiftLeft() {
    for (let index = 1; index < this.pointCount; index += 1) {
      this.points[index - 1]?.copy(this.points[index]!);
    }
    this.pointCount = Math.max(0, this.pointCount - 1);
  }

  writeGeometry() {
    for (let index = 0; index < this.pointCount; index += 1) {
      const point = this.points[index]!;
      const offset = index * 3;
      this.positions[offset] = point.x;
      this.positions[offset + 1] = point.y + 0.72;
      this.positions[offset + 2] = point.z;
    }
    this.geometry.setDrawRange(0, this.pointCount);
    this.geometry.attributes.position.needsUpdate = true;
  }

  clear() {
    this.pointCount = 0;
    this.sampleElapsed = 0;
    this.wasActive = false;
    this.geometry.setDrawRange(0, 0);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.line.removeFromParent();
  }
}
