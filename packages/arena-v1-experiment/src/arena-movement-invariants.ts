import { MOVEMENT_MODE } from '@number-strategy-jump/arena-movement';
import { assertArenaMatchCoreSnapshotInvariants } from '@number-strategy-jump/arena-experiment';
import type { ArenaMatchSnapshot } from '@number-strategy-jump/arena-contracts';

interface ArenaMovementCharacterDefinition {
  readonly jump: Readonly<{
    maximumAirJumps: number;
    maximumCrouchChargeTicks: number;
  }>;
}

export function assertArenaMovementSnapshotInvariants(
  snapshot: ArenaMatchSnapshot,
  config: Parameters<typeof assertArenaMatchCoreSnapshotInvariants>[1],
  resolveCharacterDefinition: (participantId: string) => ArenaMovementCharacterDefinition,
) {
  assertArenaMatchCoreSnapshotInvariants(snapshot, config);
  const finite = [];
  for (const participant of snapshot.participants) {
    const definition = resolveCharacterDefinition(participant.id);
    finite.push(
      participant.movement.coyoteTicksRemaining,
      participant.movement.jumpBufferTicksRemaining,
      participant.movement.airJumpsUsed,
      participant.movement.crouchChargeTicks,
      participant.movement.revision,
    );
    if (participant.movement.airJumpsUsed > definition.jump.maximumAirJumps) {
      throw new Error(`tick ${snapshot.tick} ${participant.id} 空中跳预算越界。`);
    }
    if (participant.movement.crouchChargeTicks > definition.jump.maximumCrouchChargeTicks) {
      throw new Error(`tick ${snapshot.tick} ${participant.id} 蹲跳蓄力越界。`);
    }
    if (participant.movement.mode === MOVEMENT_MODE.STANDARD && (
      participant.movement.crouchActionId !== null
      || participant.movement.downSmashActionId !== null
      || participant.movement.crouchChargeTicks !== 0
    )) {
      throw new Error(`tick ${snapshot.tick} ${participant.id} standard 模式残留临时状态。`);
    }
    const actionAffordance = participant.actionAffordance as Readonly<{
      tick?: unknown;
      participantId?: unknown;
    }> | undefined;
    if (
      actionAffordance?.tick !== snapshot.tick
      || actionAffordance.participantId !== participant.id
    ) {
      throw new Error(`tick ${snapshot.tick} ${participant.id} ActionAffordance 身份失配。`);
    }
  }
  if (!finite.every(Number.isFinite)) throw new Error(`tick ${snapshot.tick} 出现非有限移动状态。`);
  return snapshot;
}

export function createArenaMovementExperimentSnapshot(snapshot: ArenaMatchSnapshot) {
  return Object.freeze({
    tick: snapshot.tick,
    activeParticipantIds: Object.freeze(snapshot.participants
      .filter(({ status }) => status === 'active')
      .map(({ id }) => id)
      .sort()),
  });
}
