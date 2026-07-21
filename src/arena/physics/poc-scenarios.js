import { ARENA_FIXED_DT, PHYSICS_POC_ARENA, PHYSICS_POC_CHARACTER } from '../config.js';
import { assertPhysicsWorld } from '@number-strategy-jump/arena-physics';

function finiteState(state) {
  return [
    state.position.x,
    state.position.y,
    state.position.z,
    state.velocity.x,
    state.velocity.y,
    state.velocity.z,
    state.facing.x,
    state.facing.z,
  ].every(Number.isFinite);
}

function roundedState(state) {
  const round = (value) => Math.round(value * 1e6) / 1e6;
  return [
    state.id,
    round(state.position.x),
    round(state.position.y),
    round(state.position.z),
    round(state.velocity.x),
    round(state.velocity.y),
    round(state.velocity.z),
    state.grounded ? 1 : 0,
    state.supportSurfaceId ?? '',
  ].join(':');
}

function hashText(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function addDefaultCharacters(world) {
  for (let index = 0; index < 2; index += 1) {
    world.addCharacter({
      id: `player-${index + 1}`,
      position: PHYSICS_POC_ARENA.spawns[index],
      ...PHYSICS_POC_CHARACTER,
    });
  }
}

function stepMany(world, ticks, onTick, metrics) {
  for (let tick = 0; tick < ticks; tick += 1) {
    onTick?.(tick, world);
    const startedAt = performance.now();
    world.step(ARENA_FIXED_DT);
    const duration = performance.now() - startedAt;
    metrics.steps += 1;
    metrics.totalStepMs += duration;
    metrics.maxStepMs = Math.max(metrics.maxStepMs, duration);
    for (const id of ['player-1', 'player-2']) {
      const state = world.getCharacterState(id);
      if (!finiteState(state)) metrics.nonFiniteStates += 1;
    }
  }
}

function resetPair(world) {
  for (let index = 0; index < 2; index += 1) {
    world.resetCharacter(`player-${index + 1}`, {
      position: PHYSICS_POC_ARENA.spawns[index],
      velocity: { x: 0, y: 0, z: 0 },
      facing: { x: index === 0 ? 1 : -1, z: 0 },
    });
  }
}

/**
 * Runs the same deterministic movement, collision, impulse, edge, reset and
 * long-running workloads against every physics adapter candidate.
 */
export async function runPhysicsPoc({ backend, createWorld, stressTicks = 20_000 } = {}) {
  if (typeof backend !== 'string' || backend.length === 0) throw new TypeError('backend 必须是名称。');
  if (typeof createWorld !== 'function') throw new TypeError('createWorld 必须是函数。');
  if (!Number.isSafeInteger(stressTicks) || stressTicks < 1) {
    throw new RangeError('stressTicks 必须是正安全整数。');
  }
  const initStartedAt = performance.now();
  const world = assertPhysicsWorld(await createWorld({ arena: PHYSICS_POC_ARENA }));
  const initializationMs = performance.now() - initStartedAt;
  const metrics = {
    backend,
    initializationMs,
    steps: 0,
    totalStepMs: 0,
    maxStepMs: 0,
    nonFiniteStates: 0,
    idleGroundError: null,
    accelerationDistance: null,
    stoppingDistance: null,
    stepPeakGroundY: Number.NEGATIVE_INFINITY,
    stepGroundedTicks: 0,
    impulsePeakY: null,
    impulseLandingTick: null,
    pairMinimumDistance: Number.POSITIVE_INFINITY,
    edgeFallTick: null,
    resetVelocityError: null,
    finalStateHash: null,
  };

  try {
    addDefaultCharacters(world);

    stepMany(world, 180, null, metrics);
    const idle = world.getCharacterState('player-1');
    metrics.idleGroundError = Math.abs(idle.position.y - PHYSICS_POC_ARENA.spawns[0].y);

    resetPair(world);
    const accelerationStart = world.getCharacterState('player-1').position.x;
    world.setMovementIntent('player-1', 1, 0);
    stepMany(world, 60, null, metrics);
    const accelerationEnd = world.getCharacterState('player-1').position.x;
    metrics.accelerationDistance = accelerationEnd - accelerationStart;
    world.setMovementIntent('player-1', 0, 0);
    stepMany(world, 60, null, metrics);
    metrics.stoppingDistance = world.getCharacterState('player-1').position.x - accelerationEnd;

    resetPair(world);
    world.resetCharacter('player-1', {
      position: { x: 1.8, y: PHYSICS_POC_ARENA.spawns[0].y, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    });
    world.resetCharacter('player-2', {
      position: { x: -4.5, y: PHYSICS_POC_ARENA.spawns[1].y, z: 4.5 },
      velocity: { x: 0, y: 0, z: 0 },
    });
    world.setMovementIntent('player-1', 1, 0);
    for (let tick = 0; tick < 45; tick += 1) {
      stepMany(world, 1, null, metrics);
      const state = world.getCharacterState('player-1');
      if (state.grounded) {
        metrics.stepGroundedTicks += 1;
        metrics.stepPeakGroundY = Math.max(metrics.stepPeakGroundY, state.position.y);
      }
    }

    resetPair(world);
    world.applyImpulse('player-1', { x: 7.5, y: 7, z: 0 });
    let peakY = Number.NEGATIVE_INFINITY;
    for (let tick = 0; tick < 180; tick += 1) {
      stepMany(world, 1, null, metrics);
      const state = world.getCharacterState('player-1');
      peakY = Math.max(peakY, state.position.y);
      if (tick > 2 && state.grounded && metrics.impulseLandingTick === null) {
        metrics.impulseLandingTick = tick + 1;
      }
    }
    metrics.impulsePeakY = peakY;

    resetPair(world);
    world.resetCharacter('player-1', {
      position: { x: -0.55, y: PHYSICS_POC_ARENA.spawns[0].y, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    });
    world.resetCharacter('player-2', {
      position: { x: 0.55, y: PHYSICS_POC_ARENA.spawns[1].y, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    });
    world.setMovementIntent('player-1', 1, 0);
    world.setMovementIntent('player-2', -1, 0);
    stepMany(world, 180, (_tick, currentWorld) => {
      const first = currentWorld.getCharacterState('player-1');
      const second = currentWorld.getCharacterState('player-2');
      metrics.pairMinimumDistance = Math.min(
        metrics.pairMinimumDistance,
        Math.hypot(second.position.x - first.position.x, second.position.z - first.position.z),
      );
    }, metrics);

    resetPair(world);
    world.resetCharacter('player-1', {
      position: { x: 5.55, y: PHYSICS_POC_ARENA.spawns[0].y, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    });
    world.setMovementIntent('player-1', 1, 0);
    world.applyImpulse('player-1', { x: 12, y: 2, z: 0 });
    for (let tick = 0; tick < 240; tick += 1) {
      stepMany(world, 1, null, metrics);
      if (world.getCharacterState('player-1').position.y < PHYSICS_POC_ARENA.killY) {
        metrics.edgeFallTick = tick + 1;
        break;
      }
    }

    resetPair(world);
    world.applyImpulse('player-1', { x: 8, y: 5, z: 3 });
    stepMany(world, 10, null, metrics);
    world.resetCharacter('player-1', {
      position: PHYSICS_POC_ARENA.spawns[0],
      velocity: { x: 0, y: 0, z: 0 },
    });
    const resetState = world.getCharacterState('player-1');
    metrics.resetVelocityError = Math.hypot(
      resetState.velocity.x,
      resetState.velocity.y,
      resetState.velocity.z,
    );

    stepMany(world, stressTicks, (tick, currentWorld) => {
      const phase = tick % 360;
      currentWorld.setMovementIntent('player-1', phase < 180 ? 0.8 : -0.8, phase < 90 ? 0.4 : -0.4);
      currentWorld.setMovementIntent('player-2', phase < 180 ? -0.7 : 0.7, phase < 270 ? -0.35 : 0.35);
      if (tick > 0 && tick % 600 === 0) {
        resetPair(currentWorld);
      } else if (tick > 0 && tick % 173 === 0) {
        currentWorld.applyImpulse('player-1', { x: 4, y: 3.5, z: -2 });
      }
    }, metrics);

    const finalStates = ['player-1', 'player-2'].map((id) => world.getCharacterState(id));
    metrics.finalStateHash = hashText(finalStates.map(roundedState).join('|'));
    metrics.averageStepMs = metrics.totalStepMs / metrics.steps;
    delete metrics.totalStepMs;
    return metrics;
  } finally {
    world.destroy();
  }
}
