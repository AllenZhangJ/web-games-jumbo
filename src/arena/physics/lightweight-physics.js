import { ARENA_FIXED_DT, ARENA_PHYSICS } from '../config.js';
import {
  assertFiniteNumber,
  assertPhysicsWorld,
  assertPositiveNumber,
  assertVector3,
  cloneCharacterState,
  moveToward,
  normalizeMovementIntent,
  validateArenaDefinition,
  validateCharacterDefinition,
} from './physics-adapter.js';

const CONTACT_EPSILON = 1e-7;
const PHYSICS_CHARACTER_MUTATION_KIND = Object.freeze({
  APPLY_IMPULSE: 'apply-impulse',
  SET_VERTICAL_SPEED: 'set-vertical-speed',
  ACCELERATE_DOWNWARD: 'accelerate-downward',
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function limitHorizontalVelocity(vx, vz, limit) {
  if (!Number.isFinite(vx) || !Number.isFinite(vz)) {
    throw new RangeError('水平速度计算结果必须是有限数。');
  }
  const scale = Math.max(Math.abs(vx), Math.abs(vz));
  if (scale === 0) return { x: 0, z: 0 };
  const normalizedX = vx / scale;
  const normalizedZ = vz / scale;
  const normalizedLength = Math.hypot(normalizedX, normalizedZ);
  const speed = scale * normalizedLength;
  if (speed <= limit) return { x: vx, z: vz };
  return {
    x: normalizedX / normalizedLength * limit,
    z: normalizedZ / normalizedLength * limit,
  };
}

function isOverSurface(body, surface) {
  return surface.enabled
    && Math.abs(body.x - surface.center.x) <= surface.halfExtents.x + CONTACT_EPSILON
    && Math.abs(body.z - surface.center.z) <= surface.halfExtents.z + CONTACT_EPSILON;
}

function verticalOverlaps(bodyA, bodyB) {
  const extentA = bodyA.halfHeight + bodyA.radius;
  const extentB = bodyB.halfHeight + bodyB.radius;
  return Math.abs(bodyA.y - bodyB.y) < extentA + extentB;
}

function chooseStableSeparationDirection(bodyA, bodyB) {
  const dx = bodyB.x - bodyA.x;
  const dz = bodyB.z - bodyA.z;
  const distance = Math.hypot(dx, dz);
  if (distance > CONTACT_EPSILON) return { x: dx / distance, z: dz / distance, distance };
  return bodyA.id < bodyB.id
    ? { x: 1, z: 0, distance: 0 }
    : { x: -1, z: 0, distance: 0 };
}

class LightweightPhysicsWorld {
  #arena;
  #config;
  #characters;
  #characterOrder;
  #destroyed;

  constructor({ arena, config = ARENA_PHYSICS } = {}) {
    this.#arena = validateArenaDefinition(arena);
    this.#config = {
      gravity: assertFiniteNumber(config.gravity, 'config.gravity'),
      maxHorizontalSpeed: assertPositiveNumber(
        config.maxHorizontalSpeed,
        'config.maxHorizontalSpeed',
      ),
      maxVerticalSpeed: assertPositiveNumber(config.maxVerticalSpeed, 'config.maxVerticalSpeed'),
      groundProbeTolerance: assertPositiveNumber(
        config.groundProbeTolerance,
        'config.groundProbeTolerance',
      ),
      maxStepHeight: assertPositiveNumber(config.maxStepHeight, 'config.maxStepHeight'),
      groundSnapDistance: assertPositiveNumber(
        config.groundSnapDistance,
        'config.groundSnapDistance',
      ),
      substeps: Math.max(1, Math.floor(assertPositiveNumber(config.substeps, 'config.substeps'))),
    };
    this.#characters = new Map();
    this.#characterOrder = [];
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('physics world 已销毁。');
  }

  addCharacter(definition) {
    this.#assertUsable();
    const value = validateCharacterDefinition(definition);
    if (this.#characters.has(value.id)) throw new RangeError(`角色 ${value.id} 已存在。`);
    const body = {
      ...value,
      x: value.position.x,
      y: value.position.y,
      z: value.position.z,
      vx: 0,
      vy: 0,
      vz: 0,
      intentX: 0,
      intentZ: 0,
      facingX: 1,
      facingZ: 0,
      grounded: false,
      supportSurfaceId: null,
    };
    this.#characters.set(value.id, body);
    this.#characterOrder.push(value.id);
    this.#characterOrder.sort();
    this.#resolveGroundContact(body, body.y, true);
    return value.id;
  }

  #requireCharacter(id) {
    this.#assertUsable();
    const body = this.#characters.get(id);
    if (!body) throw new RangeError(`未知角色 ${id}。`);
    return body;
  }

  setMovementIntent(id, moveX, moveZ) {
    const body = this.#requireCharacter(id);
    const intent = normalizeMovementIntent(moveX, moveZ);
    body.intentX = intent.x;
    body.intentZ = intent.z;
    if (Math.hypot(intent.x, intent.z) > CONTACT_EPSILON) {
      body.facingX = intent.x;
      body.facingZ = intent.z;
    }
  }

  applyImpulse(id, impulse) {
    return this.applyCharacterMutationBatch([{
      kind: PHYSICS_CHARACTER_MUTATION_KIND.APPLY_IMPULSE,
      participantId: id,
      impulse,
    }]);
  }

  applyCharacterMutationBatch(mutations) {
    this.#assertUsable();
    if (!Array.isArray(mutations)) {
      throw new TypeError('physics character mutations 必须是数组。');
    }
    const drafts = new Map();
    const seenParticipants = new Set();
    for (let index = 0; index < mutations.length; index += 1) {
      const mutation = mutations[index];
      if (!mutation || typeof mutation !== 'object') {
        throw new TypeError(`physics character mutations[${index}] 必须是对象。`);
      }
      const participantId = mutation.participantId;
      if (typeof participantId !== 'string' || participantId.length === 0) {
        throw new TypeError(`physics character mutations[${index}].participantId 无效。`);
      }
      if (seenParticipants.has(participantId)) {
        throw new RangeError(`physics character mutations 重复 ${participantId}。`);
      }
      seenParticipants.add(participantId);
      const body = this.#requireCharacter(participantId);
      const draft = {
        body,
        vx: body.vx,
        vy: body.vy,
        vz: body.vz,
        grounded: body.grounded,
        supportSurfaceId: body.supportSurfaceId,
      };
      if (mutation.kind === PHYSICS_CHARACTER_MUTATION_KIND.APPLY_IMPULSE) {
        assertVector3(mutation.impulse, `physics character mutations[${index}].impulse`);
        const deltaX = mutation.impulse.x / body.mass;
        const deltaY = mutation.impulse.y / body.mass;
        const deltaZ = mutation.impulse.z / body.mass;
        if (![deltaX, deltaY, deltaZ].every(Number.isFinite)) {
          throw new RangeError('impulse 与角色质量组合后必须产生有限速度。');
        }
        const horizontal = limitHorizontalVelocity(
          body.vx + deltaX,
          body.vz + deltaZ,
          this.#config.maxHorizontalSpeed,
        );
        draft.vx = horizontal.x;
        draft.vy = clamp(
          body.vy + deltaY,
          -this.#config.maxVerticalSpeed,
          this.#config.maxVerticalSpeed,
        );
        draft.vz = horizontal.z;
        if (Math.abs(deltaY) > CONTACT_EPSILON) {
          draft.grounded = false;
          draft.supportSurfaceId = null;
        }
      } else if (mutation.kind === PHYSICS_CHARACTER_MUTATION_KIND.SET_VERTICAL_SPEED) {
        assertFiniteNumber(
          mutation.speed,
          `physics character mutations[${index}].speed`,
        );
        draft.vy = clamp(
          mutation.speed,
          -this.#config.maxVerticalSpeed,
          this.#config.maxVerticalSpeed,
        );
        if (Math.abs(draft.vy) > CONTACT_EPSILON) {
          draft.grounded = false;
          draft.supportSurfaceId = null;
        }
      } else if (mutation.kind === PHYSICS_CHARACTER_MUTATION_KIND.ACCELERATE_DOWNWARD) {
        assertPositiveNumber(
          mutation.acceleration,
          `physics character mutations[${index}].acceleration`,
        );
        assertPositiveNumber(
          mutation.maximumSpeed,
          `physics character mutations[${index}].maximumSpeed`,
        );
        draft.vy = Math.max(
          body.vy - mutation.acceleration,
          -mutation.maximumSpeed,
        );
        draft.grounded = false;
        draft.supportSurfaceId = null;
      } else {
        throw new RangeError(
          `未知 physics character mutation ${String(mutation.kind)}。`,
        );
      }
      drafts.set(participantId, draft);
    }
    for (const draft of drafts.values()) {
      draft.body.vx = draft.vx;
      draft.body.vy = draft.vy;
      draft.body.vz = draft.vz;
      draft.body.grounded = draft.grounded;
      draft.body.supportSurfaceId = draft.supportSurfaceId;
    }
  }

  setSurfaceEnabled(surfaceId, enabled) {
    this.#assertUsable();
    if (typeof surfaceId !== 'string' || surfaceId.length === 0) {
      throw new TypeError('surfaceId 必须是非空字符串。');
    }
    if (typeof enabled !== 'boolean') throw new TypeError('surface enabled 必须是布尔值。');
    const surface = this.#arena.surfaces.find(({ id }) => id === surfaceId);
    if (!surface) throw new RangeError(`未知 physics surface ${surfaceId}。`);
    if (surface.enabled === enabled) return false;
    surface.enabled = enabled;
    if (!enabled) {
      for (const body of this.#characters.values()) {
        if (body.supportSurfaceId !== surfaceId) continue;
        body.grounded = false;
        body.supportSurfaceId = null;
      }
    }
    return true;
  }

  step(deltaSeconds) {
    this.#assertUsable();
    assertPositiveNumber(deltaSeconds, 'deltaSeconds');
    if (Math.abs(deltaSeconds - ARENA_FIXED_DT) > 1e-12) {
      throw new RangeError(`lightweight physics 只接受固定步长 ${ARENA_FIXED_DT}。`);
    }
    const substep = deltaSeconds / this.#config.substeps;
    for (let index = 0; index < this.#config.substeps; index += 1) {
      for (const id of this.#characterOrder) {
        this.#integrateCharacter(this.#characters.get(id), substep);
      }
      this.#resolveCharacterPairs();
    }
  }

  #integrateCharacter(body, deltaSeconds) {
    const wasGrounded = body.grounded;
    const acceleration = body.grounded ? body.groundAcceleration : body.airAcceleration;
    const maxDelta = acceleration * deltaSeconds;
    body.vx = moveToward(body.vx, body.intentX * body.moveSpeed, maxDelta);
    body.vz = moveToward(body.vz, body.intentZ * body.moveSpeed, maxDelta);

    const horizontal = limitHorizontalVelocity(
      body.vx,
      body.vz,
      this.#config.maxHorizontalSpeed,
    );
    body.vx = horizontal.x;
    body.vz = horizontal.z;
    body.vy = clamp(
      body.vy + this.#config.gravity * deltaSeconds,
      -this.#config.maxVerticalSpeed,
      this.#config.maxVerticalSpeed,
    );

    const previousY = body.y;
    body.x += body.vx * deltaSeconds;
    body.y += body.vy * deltaSeconds;
    body.z += body.vz * deltaSeconds;
    this.#resolveGroundContact(body, previousY, false, wasGrounded);
  }

  #resolveGroundContact(body, previousY, allowProbe, allowStep = body.grounded) {
    const lowerExtent = body.halfHeight + body.radius;
    const previousFoot = previousY - lowerExtent;
    const currentFoot = body.y - lowerExtent;
    let support = null;
    for (const surface of this.#arena.surfaces) {
      if (!isOverSurface(body, surface)) continue;
      const crossedTop = body.vy <= 0
        && previousFoot >= surface.topY - this.#config.groundProbeTolerance
        && currentFoot <= surface.topY + this.#config.groundProbeTolerance;
      const probingTop = allowProbe
        && body.vy <= 0
        && Math.abs(currentFoot - surface.topY) <= this.#config.groundProbeTolerance;
      const stepHeight = surface.topY - previousFoot;
      const steppingUp = allowStep
        && body.vy <= 0
        && stepHeight > this.#config.groundProbeTolerance
        && stepHeight <= this.#config.maxStepHeight + CONTACT_EPSILON;
      const snappingDown = allowStep
        && body.vy <= 0
        && stepHeight <= this.#config.groundProbeTolerance
        && stepHeight >= -this.#config.groundSnapDistance - CONTACT_EPSILON;
      if (
        (crossedTop || probingTop || steppingUp || snappingDown)
        && (!support || surface.topY > support.topY)
      ) support = surface;
    }
    if (support) {
      body.y = support.topY + lowerExtent;
      body.vy = 0;
      body.grounded = true;
      body.supportSurfaceId = support.id;
      return;
    }
    body.grounded = false;
    body.supportSurfaceId = null;
  }

  #resolveCharacterPairs() {
    for (let first = 0; first < this.#characterOrder.length; first += 1) {
      const bodyA = this.#characters.get(this.#characterOrder[first]);
      for (let second = first + 1; second < this.#characterOrder.length; second += 1) {
        const bodyB = this.#characters.get(this.#characterOrder[second]);
        if (!verticalOverlaps(bodyA, bodyB)) continue;
        const direction = chooseStableSeparationDirection(bodyA, bodyB);
        const minimumDistance = bodyA.radius + bodyB.radius;
        if (direction.distance >= minimumDistance) continue;
        const penetration = minimumDistance - direction.distance;
        const totalInverseMass = 1 / bodyA.mass + 1 / bodyB.mass;
        const moveA = penetration * (1 / bodyA.mass) / totalInverseMass;
        const moveB = penetration * (1 / bodyB.mass) / totalInverseMass;
        bodyA.x -= direction.x * moveA;
        bodyA.z -= direction.z * moveA;
        bodyB.x += direction.x * moveB;
        bodyB.z += direction.z * moveB;

        const relativeNormalVelocity = (bodyB.vx - bodyA.vx) * direction.x
          + (bodyB.vz - bodyA.vz) * direction.z;
        if (relativeNormalVelocity >= 0) continue;
        const impulse = -relativeNormalVelocity / totalInverseMass;
        bodyA.vx -= direction.x * impulse / bodyA.mass;
        bodyA.vz -= direction.z * impulse / bodyA.mass;
        bodyB.vx += direction.x * impulse / bodyB.mass;
        bodyB.vz += direction.z * impulse / bodyB.mass;
      }
    }
    for (const id of this.#characterOrder) {
      const body = this.#characters.get(id);
      if (body.grounded) this.#resolveGroundContact(body, body.y, true, true);
    }
  }

  getCharacterState(id) {
    return cloneCharacterState(this.#requireCharacter(id));
  }

  resetCharacter(id, state) {
    const body = this.#requireCharacter(id);
    if (!state || typeof state !== 'object') throw new TypeError('reset state 必须是对象。');
    assertVector3(state.position, 'reset state.position');
    const velocity = state.velocity ?? { x: 0, y: 0, z: 0 };
    assertVector3(velocity, 'reset state.velocity');
    body.x = state.position.x;
    body.y = state.position.y;
    body.z = state.position.z;
    const horizontal = limitHorizontalVelocity(
      velocity.x,
      velocity.z,
      this.#config.maxHorizontalSpeed,
    );
    body.vx = horizontal.x;
    body.vy = clamp(velocity.y, -this.#config.maxVerticalSpeed, this.#config.maxVerticalSpeed);
    body.vz = horizontal.z;
    body.intentX = 0;
    body.intentZ = 0;
    if (state.facing) {
      const facing = normalizeMovementIntent(state.facing.x, state.facing.z);
      if (Math.hypot(facing.x, facing.z) > CONTACT_EPSILON) {
        body.facingX = facing.x;
        body.facingZ = facing.z;
      }
    }
    body.grounded = false;
    body.supportSurfaceId = null;
    this.#resolveGroundContact(body, body.y, true);
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#characters.clear();
    this.#characterOrder.length = 0;
  }
}

export function createLightweightPhysicsWorld(options) {
  return assertPhysicsWorld(new LightweightPhysicsWorld(options));
}
