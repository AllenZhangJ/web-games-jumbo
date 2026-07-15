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
  readonly color: number;
}

export class CoreEffectsRuntime implements EffectRuntime<CoreEffectsFrame> {
  readonly id = 'three-core-effects';
  readonly particles: ParticleBurst;
  readonly trail: TailTrail;

  constructor(root: THREE.Object3D, profile: RenderQualityProfile) {
    this.particles = new ParticleBurst(root, { maxParticles: profile.particleLimit });
    this.trail = new TailTrail(root, { maxPoints: profile.trailPointLimit });
  }

  update(frame: CoreEffectsFrame): void {
    this.trail.update(frame.characterPosition, {
      active: frame.isJumping,
      reducedMotion: frame.reducedMotion,
    }, frame.deltaSeconds);
    if (frame.stepAdvanced) {
      this.particles.emit(frame.landingPosition, {
        color: frame.color,
        count: 20,
        reducedMotion: frame.reducedMotion,
      });
    }
    if (frame.stepReset) this.clear();
    this.particles.update(frame.deltaSeconds);
  }

  clear(): void {
    this.particles.clear();
    this.trail.clear();
  }

  snapshot() {
    return Object.freeze({
      id: this.id,
      particles: this.particles.activeCount(),
      trailPoints: this.trail.pointCount,
    });
  }

  dispose(): void {
    this.trail.dispose();
    this.particles.dispose();
  }
}
