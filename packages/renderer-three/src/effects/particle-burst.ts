import * as THREE from 'three';

const MAX_PARTICLES = 72;

export class ParticleBurst {
  [key: string]: any;
  constructor(root: THREE.Object3D) {
    this.root = root;
    this.geometry = new THREE.TetrahedronGeometry(0.075, 0);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_PARTICLES);
    this.mesh.name = 'LandingParticles';
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.count = MAX_PARTICLES;
    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 0,
      life: 0,
      spin: 0,
    }));
    this.matrix = new THREE.Matrix4();
    this.quaternion = new THREE.Quaternion();
    this.scale = new THREE.Vector3();
    this.hiddenScale = new THREE.Vector3(0, 0, 0);
    this.root.add(this.mesh);
    this.refreshInstances();
  }

  emit(position: any, { color = 0xe53935, count = 18, reducedMotion = false } = {}) {
    if (!position) return;
    const requested = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    const amount = reducedMotion ? Math.min(5, requested) : requested;
    let emitted = 0;
    for (let index = 0; index < this.particles.length && emitted < amount; index += 1) {
      const particle = this.particles[index];
      if (particle.active) continue;
      const angle = (emitted / Math.max(1, amount)) * Math.PI * 2 + (emitted % 3) * 0.31;
      const speed = 0.9 + (emitted % 5) * 0.16;
      particle.active = true;
      particle.position.set(
        Number.isFinite(position.x) ? position.x : 0,
        (Number.isFinite(position.y) ? position.y : 0) + 0.13,
        Number.isFinite(position.z) ? position.z : 0,
      );
      particle.velocity.set(Math.cos(angle) * speed, 1.25 + (emitted % 4) * 0.22, Math.sin(angle) * speed);
      particle.age = 0;
      particle.life = reducedMotion ? 0.26 : 0.58 + (emitted % 3) * 0.08;
      particle.spin = angle;
      this.mesh.setColorAt(index, new THREE.Color(color));
      emitted += 1;
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(deltaSeconds: number) {
    this.particles.forEach((particle: any) => {
      if (!particle.active) return;
      particle.age += deltaSeconds;
      if (particle.age >= particle.life) {
        particle.active = false;
        return;
      }
      particle.velocity.y -= 4.8 * deltaSeconds;
      particle.position.addScaledVector(particle.velocity, deltaSeconds);
      particle.spin += deltaSeconds * 7;
    });
    this.refreshInstances();
  }

  refreshInstances() {
    this.particles.forEach((particle: any, index: number) => {
      if (!particle.active) {
        this.matrix.compose(particle.position, this.quaternion, this.hiddenScale);
      } else {
        const life = 1 - particle.age / particle.life;
        this.quaternion.setFromEuler(new THREE.Euler(particle.spin, particle.spin * 0.7, 0));
        this.scale.setScalar(Math.max(0, life));
        this.matrix.compose(particle.position, this.quaternion, this.scale);
      }
      this.mesh.setMatrixAt(index, this.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  activeCount() {
    return this.particles.reduce((count: number, particle: any) => count + (particle.active ? 1 : 0), 0);
  }

  clear() {
    this.particles.forEach((particle: any) => { particle.active = false; });
    this.refreshInstances();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose?.();
    this.mesh.removeFromParent();
  }
}
