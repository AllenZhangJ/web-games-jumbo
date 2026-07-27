export type ArenaV2WeaponCommitmentFacing = -1 | 1;

export type ArenaV2WeaponCommitmentOutcome =
  | 'committed'
  | 'early-cancel'
  | 'expired-cancel'
  | 'auto-release'
  | 'in-progress';

export interface ArenaV2WeaponCommitmentProfile {
  readonly id: string;
  readonly commitTicks: number;
  readonly expireTicks: number;
  readonly expireOutcome: 'cancel' | 'release';
  readonly canTurn: boolean;
  readonly levelThresholds: readonly number[];
}

export interface ArenaV2WeaponCommitmentInput {
  readonly tick: number;
  readonly primaryDown: boolean;
  readonly facing: ArenaV2WeaponCommitmentFacing;
}

export interface ArenaV2WeaponCommitmentProbe {
  readonly profileId: string;
  readonly caseId: string;
  readonly outcome: ArenaV2WeaponCommitmentOutcome;
  readonly chargeTicks: number;
  readonly chargeLevel: number;
  readonly facingAtStart: ArenaV2WeaponCommitmentFacing;
  readonly facingAtResult: ArenaV2WeaponCommitmentFacing;
  readonly resultTick: number | null;
}

export interface ArenaV2WeaponCommitmentPrototypeResult {
  readonly profileCount: number;
  readonly profiles: readonly ArenaV2WeaponCommitmentProfile[];
  readonly probes: readonly ArenaV2WeaponCommitmentProbe[];
}

export const ARENA_V2_WEAPON_COMMITMENT_PROFILES = Object.freeze([
  Object.freeze({
    id: 'read-punish-charge',
    commitTicks: 12,
    expireTicks: 18,
    expireOutcome: 'cancel',
    canTurn: true,
    levelThresholds: Object.freeze([6, 12]),
  }),
  Object.freeze({
    id: 'delayed-heavy-charge',
    commitTicks: 24,
    expireTicks: 30,
    expireOutcome: 'cancel',
    canTurn: false,
    levelThresholds: Object.freeze([12, 24]),
  }),
] as const);

function resolveChargeLevel(
  profile: ArenaV2WeaponCommitmentProfile,
  chargeTicks: number,
): number {
  return profile.levelThresholds.reduce(
    (level, threshold) => chargeTicks >= threshold ? level + 1 : level,
    0,
  );
}

function simulateCommitment(
  profile: ArenaV2WeaponCommitmentProfile,
  caseId: string,
  inputs: readonly ArenaV2WeaponCommitmentInput[],
): ArenaV2WeaponCommitmentProbe {
  if (inputs.length === 0) {
    throw new Error('蓄力原型至少需要一个输入帧。');
  }
  let previousTick = -1;
  let started = false;
  let startTick = inputs[0]!.tick;
  let facingAtStart = inputs[0]!.facing;
  let facingAtResult = facingAtStart;
  let outcome: ArenaV2WeaponCommitmentOutcome = 'in-progress';
  let resultTick: number | null = null;
  let chargeTicks = 0;

  for (const input of inputs) {
    if (!Number.isInteger(input.tick) || input.tick <= previousTick) {
      throw new Error('蓄力原型输入帧必须按严格递增的整数 tick 提供。');
    }
    previousTick = input.tick;

    if (!started) {
      if (!input.primaryDown) {
        continue;
      }
      started = true;
      startTick = input.tick;
      facingAtStart = input.facing;
      facingAtResult = input.facing;
      continue;
    }

    chargeTicks = input.tick - startTick;
    if (profile.canTurn) {
      facingAtResult = input.facing;
    }

    if (chargeTicks >= profile.expireTicks) {
      resultTick = input.tick;
      outcome = profile.expireOutcome === 'release' ? 'auto-release' : 'expired-cancel';
      break;
    }
    if (!input.primaryDown) {
      resultTick = input.tick;
      outcome = chargeTicks >= profile.commitTicks ? 'committed' : 'early-cancel';
      break;
    }
  }

  return Object.freeze({
    profileId: profile.id,
    caseId,
    outcome,
    chargeTicks,
    chargeLevel: resolveChargeLevel(profile, chargeTicks),
    facingAtStart,
    facingAtResult,
    resultTick,
  });
}

function holdUntil(
  profile: ArenaV2WeaponCommitmentProfile,
  releaseTick: number | null,
  facingAtRelease: ArenaV2WeaponCommitmentFacing,
): readonly ArenaV2WeaponCommitmentInput[] {
  const endTick = releaseTick ?? profile.expireTicks;
  return Object.freeze([
    Object.freeze({ tick: 0, primaryDown: true, facing: -1 as const }),
    ...Array.from({ length: endTick }, (_, index) => Object.freeze({
      tick: index + 1,
      primaryDown: releaseTick === null ? true : index + 1 < releaseTick,
      facing: facingAtRelease,
    })),
  ]);
}

function createProbeInputs(
  profile: ArenaV2WeaponCommitmentProfile,
  caseId: string,
): readonly ArenaV2WeaponCommitmentInput[] {
  switch (caseId) {
    case 'early-release':
      return holdUntil(profile, Math.max(1, profile.commitTicks - 4), 1);
    case 'committed-turn':
      return holdUntil(profile, profile.commitTicks, 1);
    case 'expiry':
      return holdUntil(profile, null, 1);
    default:
      throw new Error(`未知蓄力原型探针：${caseId}`);
  }
}

export function runArenaV2WeaponCommitmentPrototype(): ArenaV2WeaponCommitmentPrototypeResult {
  const probes = ARENA_V2_WEAPON_COMMITMENT_PROFILES.flatMap((profile) => (
    ['early-release', 'committed-turn', 'expiry'].map((caseId) => (
      simulateCommitment(profile, caseId, createProbeInputs(profile, caseId))
    ))
  ));
  return Object.freeze({
    profileCount: ARENA_V2_WEAPON_COMMITMENT_PROFILES.length,
    profiles: ARENA_V2_WEAPON_COMMITMENT_PROFILES,
    probes: Object.freeze(probes),
  });
}
