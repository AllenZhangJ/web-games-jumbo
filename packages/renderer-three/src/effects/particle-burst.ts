import * as THREE from 'three';

const MAX_PARTICLES = 72;

export class ParticleBurst {
  [key: string]: any;
  constructor(root: THREE.Object3D, { maxParticles = MAX_PARTICLES } = {}) {
    this.root = root;
    this.capacity = Math.max(1, Math.min(MAX_PARTICLES, Math.floor(maxParticles)));
    this.geometry = new THREE.TetrahedronGeometry(0.075, 0);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.capacity);
    this.mesh.name = 'LandingParticles';
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.particles = Array.from({ length: this.capacity }, () => ({
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
    this.rotation = new THREE.Euler();
    this.color = new THREE.Color();
    this.activeParticleCount = 0;
    this.root.add(this.mesh);
  }

  emit(position: any, { color = 0xe53935, count = 18, reducedMotion = false } = {}) {
    if (!position) return;
    const requested = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    const amount = reducedMotion ? Math.min(5, requested) : requested;
    let emitted = 0;
    while (this.activeParticleCount < this.particles.length && emitted < amount) {
      const index = this.activeParticleCount;
      const particle = this.particles[index];
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
      this.mesh.setColorAt(index, this.color.set(color));
      this.activeParticleCount += 1;
      emitted += 1;
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(deltaSeconds: number) {
    if (this.activeParticleCount === 0) return;
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.activeParticleCount; readIndex += 1) {
      const particle = this.particles[readIndex];
      particle.age += deltaSeconds;
      if (particle.age >= particle.life) {
        particle.active = false;
        continue;
      }
      particle.velocity.y -= 4.8 * deltaSeconds;
      particle.position.addScaledVector(particle.velocity, deltaSeconds);
      particle.spin += deltaSeconds * 7;
      if (writeIndex !== readIndex) {
        const displaced = this.particles[writeIndex];
        this.particles[writeIndex] = particle;
        this.particles[readIndex] = displaced;
      }
      writeIndex += 1;
    }
    this.activeParticleCount = writeIndex;
    this.refreshInstances();
  }

  refreshInstances() {
    for (let index = 0; index < this.activeParticleCount; index += 1) {
      const particle = this.particles[index];
      const life = 1 - particle.age / particle.life;
      this.rotation.set(particle.spin, particle.spin * 0.7, 0);
      this.quaternion.setFromEuler(this.rotation);
      this.scale.setScalar(Math.max(0, life));
      this.matrix.compose(particle.position, this.quaternion, this.scale);
      this.mesh.setMatrixAt(index, this.matrix);
    }
    this.mesh.count = this.activeParticleCount;
    if (this.activeParticleCount > 0) this.mesh.instanceMatrix.needsUpdate = true;
  }

  activeCount() {
    return this.activeParticleCount;
  }

  clear() {
    for (let index = 0; index < this.activeParticleCount; index += 1) {
      this.particles[index].active = false;
    }
    this.activeParticleCount = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose?.();
    this.mesh.removeFromParent();
  }
}
