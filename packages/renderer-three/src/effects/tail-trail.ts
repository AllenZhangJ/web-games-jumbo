import * as THREE from 'three';

const MAX_POINTS = 18;

export class TailTrail {
  [key: string]: any;
  constructor(root) {
    this.root = root;
    this.positions = new Float32Array(MAX_POINTS * 3);
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
    this.points = [];
    this.sampleElapsed = 0;
    this.wasActive = false;
    this.root.add(this.line);
  }

  update(position, { active = false, reducedMotion = false } = {}, deltaSeconds) {
    if (reducedMotion || !position) {
      this.clear();
      return;
    }
    if (!active) {
      if (this.wasActive && this.points.length > 0) this.points.shift();
      else this.points.length = 0;
      this.wasActive = false;
      this.writeGeometry();
      return;
    }
    this.wasActive = true;
    this.sampleElapsed += deltaSeconds;
    const previous = this.points[this.points.length - 1];
    const moved = !previous || previous.distanceToSquared(position) > 0.018;
    if ((this.sampleElapsed >= 1 / 60 && moved) || !previous) {
      this.sampleElapsed = 0;
      this.points.push(new THREE.Vector3(
        Number.isFinite(position.x) ? position.x : 0,
        Number.isFinite(position.y) ? position.y : 0,
        Number.isFinite(position.z) ? position.z : 0,
      ));
      if (this.points.length > MAX_POINTS) this.points.shift();
    }
    this.writeGeometry();
  }

  writeGeometry() {
    this.points.forEach((point, index) => {
      const offset = index * 3;
      this.positions[offset] = point.x;
      this.positions[offset + 1] = point.y + 0.72;
      this.positions[offset + 2] = point.z;
    });
    this.geometry.setDrawRange(0, this.points.length);
    this.geometry.attributes.position.needsUpdate = true;
  }

  clear() {
    this.points.length = 0;
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
