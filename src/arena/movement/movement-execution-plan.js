import { createMovementCommand, MOVEMENT_COMMAND_KIND } from './movement-command.js';
import {
  createMovementMutation,
  MOVEMENT_MUTATION_KIND,
} from './movement-mutation.js';
import { MOVEMENT_MODE } from './movement-runtime.js';

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function createContextMap(contexts) {
  const byId = new Map();
  for (const context of contexts) {
    if (byId.has(context.participantId)) {
      throw new RangeError(`Movement execution context 重复 ${context.participantId}。`);
    }
    byId.set(context.participantId, context);
  }
  return byId;
}

function planCommand(command, context) {
  const { definition, capabilities, state } = context;
  if (command.kind === MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP) {
    if (!capabilities.canGroundJump) throw new Error(`${command.participantId} 当前不能地面跳。`);
    return { command, verticalImpulse: definition.jump.groundImpulse };
  }
  if (command.kind === MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP) {
    if (!capabilities.canAirJump) throw new Error(`${command.participantId} 当前不能二段跳。`);
    const moveX = context.input?.moveX ?? 0;
    const moveZ = context.input?.moveZ ?? 0;
    const magnitude = Math.hypot(moveX, moveZ);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    const horizontal = context.airJumpHorizontalImpulse ?? 0;
    return {
      command,
      verticalImpulse: definition.jump.airImpulse,
      impulse: {
        x: moveX * scale * horizontal,
        y: definition.jump.airImpulse,
        z: moveZ * scale * horizontal,
      },
    };
  }
  if (command.kind === MOVEMENT_COMMAND_KIND.BEGIN_CROUCH_JUMP) {
    if (!capabilities.canBeginCrouchJump) {
      throw new Error(`${command.participantId} 当前不能开始蹲跳。`);
    }
    return { command };
  }
  if (command.kind === MOVEMENT_COMMAND_KIND.RELEASE_CROUCH_JUMP) {
    if (!capabilities.canReleaseCrouchJump) {
      throw new Error(`${command.participantId} 当前不能释放蹲跳。`);
    }
    const maximum = definition.jump.maximumCrouchChargeTicks;
    const ratio = maximum > 0 ? state.crouchChargeTicks / maximum : 0;
    return {
      command,
      verticalImpulse: definition.jump.groundImpulse
        + (definition.jump.crouchImpulse - definition.jump.groundImpulse) * ratio,
      crouchChargeTicks: state.crouchChargeTicks,
    };
  }
  if (!capabilities.canBeginDownSmash) {
    throw new Error(`${command.participantId} 当前不能下砸。`);
  }
  return { command, verticalSpeed: -definition.jump.downSmashSpeed };
}

export function createMovementExecutionPlan(commands, contexts) {
  if (!Array.isArray(commands)) throw new TypeError('MovementSystem commands 必须是数组。');
  if (!Array.isArray(contexts)) throw new TypeError('Movement execution contexts 必须是数组。');
  const contextById = createContextMap(contexts);
  const normalized = commands.map(createMovementCommand).sort((left, right) => (
    compareText(left.participantId, right.participantId)
    || compareText(left.actionDefinitionId, right.actionDefinitionId)
    || compareText(left.kind, right.kind)
  ));
  const seenParticipants = new Set();
  const operations = normalized.map((command) => {
    if (seenParticipants.has(command.participantId)) {
      throw new RangeError(`MovementSystem 同 tick 重复命令 ${command.participantId}。`);
    }
    seenParticipants.add(command.participantId);
    const context = contextById.get(command.participantId);
    if (!context) throw new RangeError(`未知 movement participant ${command.participantId}。`);
    return Object.freeze(planCommand(command, context));
  });
  const mutations = operations.flatMap((operation) => {
    if (operation.verticalImpulse !== undefined) {
      return [createMovementMutation({
        kind: MOVEMENT_MUTATION_KIND.APPLY_IMPULSE,
        participantId: operation.command.participantId,
        impulse: operation.impulse ?? { x: 0, y: operation.verticalImpulse, z: 0 },
      })];
    }
    if (operation.verticalSpeed !== undefined) {
      return [createMovementMutation({
        kind: MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED,
        participantId: operation.command.participantId,
        speed: operation.verticalSpeed,
      })];
    }
    return [];
  });
  const executions = operations.map((operation) => Object.freeze({
    kind: operation.command.kind,
    participantId: operation.command.participantId,
    actionDefinitionId: operation.command.actionDefinitionId,
    verticalImpulse: operation.verticalImpulse ?? null,
    verticalSpeed: operation.verticalSpeed ?? null,
    crouchChargeTicks: operation.crouchChargeTicks ?? null,
  }));
  return Object.freeze({
    operations: Object.freeze(operations),
    mutations: Object.freeze(mutations),
    executions: Object.freeze(executions),
  });
}

export function createDownSmashContinuationMutations(contexts, commandParticipantIds = []) {
  if (!Array.isArray(contexts)) throw new TypeError('Movement execution contexts 必须是数组。');
  if (!Array.isArray(commandParticipantIds)) {
    throw new TypeError('commandParticipantIds 必须是数组。');
  }
  const commanded = new Set(commandParticipantIds);
  return Object.freeze(contexts
    .filter(({ participantId, state }) => (
      state.mode === MOVEMENT_MODE.DOWN_SMASH && !commanded.has(participantId)
    ))
    .map(({ participantId, definition }) => createMovementMutation({
      kind: MOVEMENT_MUTATION_KIND.ACCELERATE_DOWNWARD,
      participantId,
      acceleration: definition.jump.downSmashAccelerationPerTick,
      maximumSpeed: definition.jump.maximumDownSmashSpeed,
    })));
}
