const TICK_RATE_HZ = 60;
const GRAVITY_MAGNITUDE = 24;
const GROUND_DECELERATION = 42;

function positiveFinite(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return value as number;
}

function nonNegativeFinite(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) < 0) throw new RangeError(`${name} 必须大于等于 0。`);
  return value as number;
}

function integerAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value as number;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

export function compileJumpImpulseFromHeight(targetHeight: number, {
  gravityMagnitude = GRAVITY_MAGNITUDE,
}: { readonly gravityMagnitude?: number } = {}): number {
  const height = positiveFinite(targetHeight, 'targetJumpHeight');
  const gravity = positiveFinite(gravityMagnitude, 'gravityMagnitude');
  return Math.sqrt(2 * gravity * height);
}

export function compileHorizontalImpulseFromDistance(targetDistance: number, {
  deceleration = GROUND_DECELERATION,
  mass = 1,
}: { readonly deceleration?: number; readonly mass?: number } = {}): number {
  const distance = positiveFinite(targetDistance, 'targetKnockbackDistance');
  const stoppingAcceleration = positiveFinite(deceleration, 'knockbackDeceleration');
  const characterMass = positiveFinite(mass, 'characterMass');
  return Math.sqrt(2 * stoppingAcceleration * distance) * characterMass;
}

interface AttackTargetingInput {
  readonly kind: string;
  readonly range: number;
  readonly maximumVerticalDifference: number;
  readonly minimumFacingDot?: number;
  readonly radius?: number;
  readonly minimumVerticalDrop?: number;
}

interface AttackInput {
  readonly targeting: AttackTargetingInput;
  readonly windupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
  readonly cooldownTicks: number;
  readonly targetGroundKnockbackDistance: number;
  readonly verticalImpulse: number;
  readonly hitstunTicks: number;
  readonly guard?: Readonly<{ minimumFacingDot: number; impulseMultiplier: number }> | null;
  readonly selfMovement?: Readonly<{ horizontalImpulse: number }> | null;
}

interface NormalizedAttackTargeting {
  kind: string;
  range: number;
  maximumVerticalDifference: number;
  minimumFacingDot?: number;
  radius?: number;
  minimumVerticalDrop?: number;
}

function attack({
  targeting,
  windupTicks,
  activeTicks,
  recoveryTicks,
  cooldownTicks,
  targetGroundKnockbackDistance,
  verticalImpulse,
  hitstunTicks,
  guard = null,
  selfMovement = null,
}: AttackInput) {
  const timing = {
    windupTicks: integerAtLeast(windupTicks, 0, 'attack.windupTicks'),
    activeTicks: integerAtLeast(activeTicks, 1, 'attack.activeTicks'),
    recoveryTicks: integerAtLeast(recoveryTicks, 0, 'attack.recoveryTicks'),
    cooldownTicks: integerAtLeast(cooldownTicks, 0, 'attack.cooldownTicks'),
  };
  const actionDurationTicks = timing.windupTicks + timing.activeTicks + timing.recoveryTicks;
  const repeatIntervalTicks = Math.max(actionDurationTicks, timing.cooldownTicks);
  const normalizedTargeting: NormalizedAttackTargeting = {
    kind: targeting.kind,
    range: positiveFinite(targeting.range, 'attack.targeting.range'),
    maximumVerticalDifference: positiveFinite(
      targeting.maximumVerticalDifference,
      'attack.targeting.maximumVerticalDifference',
    ),
  };
  if (targeting.minimumFacingDot !== undefined) {
    const minimumFacingDot = targeting.minimumFacingDot;
    if (!Number.isFinite(minimumFacingDot) || minimumFacingDot < -1 || minimumFacingDot > 1) {
      throw new RangeError('attack.targeting.minimumFacingDot 必须在 -1 到 1 之间。');
    }
    normalizedTargeting.minimumFacingDot = minimumFacingDot;
  }
  if (targeting.radius !== undefined) {
    normalizedTargeting.radius = positiveFinite(targeting.radius, 'attack.targeting.radius');
  }
  if (targeting.minimumVerticalDrop !== undefined) {
    normalizedTargeting.minimumVerticalDrop = nonNegativeFinite(
      targeting.minimumVerticalDrop,
      'attack.targeting.minimumVerticalDrop',
    );
  }
  const groundDistance = positiveFinite(
    targetGroundKnockbackDistance,
    'attack.targetGroundKnockbackDistance',
  );
  return deepFreeze({
    targeting: normalizedTargeting,
    timing,
    cadence: {
      windupSeconds: timing.windupTicks / TICK_RATE_HZ,
      activeSeconds: timing.activeTicks / TICK_RATE_HZ,
      recoverySeconds: timing.recoveryTicks / TICK_RATE_HZ,
      cooldownSeconds: timing.cooldownTicks / TICK_RATE_HZ,
      actionDurationTicks,
      actionDurationSeconds: actionDurationTicks / TICK_RATE_HZ,
      repeatIntervalTicks,
      repeatIntervalSeconds: repeatIntervalTicks / TICK_RATE_HZ,
      maximumStartsPerSecond: TICK_RATE_HZ / repeatIntervalTicks,
    },
    knockback: {
      targetGroundDistance: groundDistance,
      horizontalImpulse: compileHorizontalImpulseFromDistance(groundDistance),
      verticalImpulse: positiveFinite(verticalImpulse, 'attack.verticalImpulse'),
    },
    hitstunTicks: integerAtLeast(hitstunTicks, 1, 'attack.hitstunTicks'),
    guard,
    selfMovement,
  });
}

export const ARENA_GAMEPLAY_V2_TUNING = deepFreeze({
  schemaVersion: 2,
  units: {
    tickRateHz: TICK_RATE_HZ,
    distance: 'world-unit',
    linearSpeed: 'world-unit-per-second',
    acceleration: 'world-unit-per-second-squared',
    impulse: 'mass-world-unit-per-second',
  },
  physics: {
    gravityMagnitude: GRAVITY_MAGNITUDE,
    standardGroundDeceleration: GROUND_DECELERATION,
    groundProbeTolerance: 0.035,
    groundSnapDistance: 0.35,
    substeps: 2,
  },
  character: {
    collision: {
      radius: 0.45,
      halfHeight: 0.55,
      mass: 1,
    },
    movement: {
      walkSpeed: 3.2,
      runSpeed: 6,
      runInputThreshold: 0.65,
      groundAcceleration: 42,
      airAcceleration: 14,
      maximumHorizontalSpeed: 18,
      automaticStepHeight: 0.35,
    },
    jump: {
      targetGroundHeight: 1.171875,
      targetChargedHeight: 1.8802083333333333,
      targetAirHeight: 1.0208333333333333,
      airHorizontalImpulse: 3.6,
      downAttackStartSpeed: 16,
      downAttackAccelerationPerTick: 0.55,
      maximumDownAttackSpeed: 22,
      coyoteTicks: 6,
      bufferTicks: 6,
      maximumAirJumps: 1,
      maximumCrouchChargeTicks: 24,
    },
  },
  equipment: {
    automaticPickupRadius: 0.8,
  },
  attacks: {
    'base-push': attack({
      targeting: {
        kind: 'facing-cone',
        range: 1.5,
        minimumFacingDot: 0.35,
        maximumVerticalDifference: 1.5,
      },
      windupTicks: 8,
      activeTicks: 3,
      recoveryTicks: 15,
      cooldownTicks: 0,
      targetGroundKnockbackDistance: 0.8601190476190477,
      verticalImpulse: 4.8,
      hitstunTicks: 24,
    }),
    'hammer-smash': attack({
      targeting: {
        kind: 'facing-cone',
        range: 1.8,
        minimumFacingDot: 0.4,
        maximumVerticalDifference: 1.5,
      },
      windupTicks: 18,
      activeTicks: 3,
      recoveryTicks: 24,
      cooldownTicks: 72,
      targetGroundKnockbackDistance: 2.6785714285714284,
      verticalImpulse: 6.2,
      hitstunTicks: 30,
    }),
    'chain-pull': attack({
      targeting: {
        kind: 'facing-cone',
        range: 5,
        minimumFacingDot: 0.55,
        maximumVerticalDifference: 2,
      },
      windupTicks: 12,
      activeTicks: 4,
      recoveryTicks: 20,
      cooldownTicks: 90,
      targetGroundKnockbackDistance: 1.1904761904761905,
      verticalImpulse: 2.5,
      hitstunTicks: 20,
    }),
    'shield-charge': attack({
      targeting: {
        kind: 'facing-capsule',
        range: 1.6,
        radius: 0.65,
        maximumVerticalDifference: 1.5,
      },
      windupTicks: 5,
      activeTicks: 16,
      recoveryTicks: 18,
      cooldownTicks: 96,
      targetGroundKnockbackDistance: 0.6696428571428571,
      verticalImpulse: 2.8,
      hitstunTicks: 18,
      guard: {
        minimumFacingDot: 0.25,
        impulseMultiplier: 0.2,
      },
      selfMovement: {
        horizontalImpulse: 6.5,
      },
    }),
    'base-air-strike': attack({
      targeting: {
        kind: 'downward-cylinder',
        range: 2.1,
        radius: 0.9,
        minimumVerticalDrop: 0,
        maximumVerticalDifference: 2.1,
      },
      windupTicks: 5,
      activeTicks: 4,
      recoveryTicks: 16,
      cooldownTicks: 0,
      targetGroundKnockbackDistance: 1.0744047619047619,
      verticalImpulse: 5.5,
      hitstunTicks: 24,
    }),
    'hammer-air-smash': attack({
      targeting: {
        kind: 'downward-cylinder',
        range: 2.5,
        radius: 1.25,
        minimumVerticalDrop: 0,
        maximumVerticalDifference: 2.5,
      },
      windupTicks: 10,
      activeTicks: 5,
      recoveryTicks: 26,
      cooldownTicks: 72,
      targetGroundKnockbackDistance: 3.0476190476190474,
      verticalImpulse: 7,
      hitstunTicks: 32,
    }),
    'chain-air-lash': attack({
      targeting: {
        kind: 'downward-cylinder',
        range: 3.6,
        radius: 1.65,
        minimumVerticalDrop: 0,
        maximumVerticalDifference: 3.6,
      },
      windupTicks: 7,
      activeTicks: 6,
      recoveryTicks: 20,
      cooldownTicks: 90,
      targetGroundKnockbackDistance: 1.4404761904761905,
      verticalImpulse: 3,
      hitstunTicks: 22,
    }),
    'shield-air-drop': attack({
      targeting: {
        kind: 'downward-cylinder',
        range: 1.9,
        radius: 1.05,
        minimumVerticalDrop: 0,
        maximumVerticalDifference: 1.9,
      },
      windupTicks: 4,
      activeTicks: 10,
      recoveryTicks: 20,
      cooldownTicks: 96,
      targetGroundKnockbackDistance: 0.7619047619047619,
      verticalImpulse: 3.4,
      hitstunTicks: 20,
    }),
  },
});
