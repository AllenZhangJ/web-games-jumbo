import type * as THREE from 'three';
import type { RenderQualityProfile } from '../diagnostics/performance-budget.js';
import type { EffectRuntime } from './effect-runtime.js';
import { ParticleBurst } from './particle-burst.js';
import { TailTrail } from './tail-trail.js';

export interface CoreEffectsFrame {
  readonly characterPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly landingPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly deltaSeconds: number;
  readonly isJumping: boolean;
  readonly reducedMotion: boolean;
  readonly stepAdvanced: boolean;
  readonly stepReset: boolean;
  readonly deferLandingBurst?: boolean;
  readonly color: number;
}

export class CoreEffectsRuntime implements EffectRuntime<CoreEffectsFrame> {
  readonly id = 'three-core-effects';
  readonly particles: ParticleBurst;
  readonly trail: TailTrail;
  pendingLandingBurst: {
    position: { x: number; y: number; z: number };
    color: number;
    reducedMotion: boolean;
  } | null = null;
  landingBurstEmittedThisFrame = false;

  constructor(root: THREE.Object3D, profile: RenderQualityProfile) {
    this.particles = new ParticleBurst(root, { maxParticles: profile.particleLimit });
    this.trail = new TailTrail(root, { maxPoints: profile.trailPointLimit });
  }

  update(frame: CoreEffectsFrame): void {
    this.landingBurstEmittedThisFrame = false;
    if (frame.stepReset) this.clear();
    if (this.pendingLandingBurst && !frame.deferLandingBurst) {
      this.particles.emit(this.pendingLandingBurst.position, {
        color: this.pendingLandingBurst.color,
        count: 20,
        reducedMotion: this.pendingLandingBurst.reducedMotion,
      });
      this.pendingLandingBurst = null;
      this.landingBurstEmittedThisFrame = true;
    }
    this.trail.update(frame.characterPosition, {
      active: frame.isJumping,
      reducedMotion: frame.reducedMotion,
    }, frame.deltaSeconds);
    if (frame.stepAdvanced) {
      this.pendingLandingBurst = {
        position: { ...frame.landingPosition },
        color: frame.color,
        reducedMotion: frame.reducedMotion,
      };
    }
    this.particles.update(frame.deltaSeconds);
  }

  clear(): void {
    this.pendingLandingBurst = null;
    this.landingBurstEmittedThisFrame = false;
    this.particles.clear();
    this.trail.clear();
  }

  snapshot() {
    return Object.freeze({
      id: this.id,
      particles: this.particles.activeCount(),
      particleCapacity: this.particles.capacity,
      trailPoints: this.trail.pointCount,
      trailCapacity: this.trail.maxPoints,
      pendingLandingBurst: Boolean(this.pendingLandingBurst),
      landingBurstEmittedThisFrame: this.landingBurstEmittedThisFrame,
    });
  }

  dispose(): void {
    this.trail.dispose();
    this.particles.dispose();
  }
}
