import {
  ARENA_ACTION_PHASE,
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  ARENA_PHYSICS,
} from '../config.js';
import { EQUIPMENT_LOCATION_STATE } from '@number-strategy-jump/arena-equipment';
import { serializeMapRuntimeSnapshot } from '../map/map-serializer.js';
import {
  MOVEMENT_MODE,
  MOVEMENT_RUNTIME_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-movement';

const MATCH_PHASES = new Set(Object.values(ARENA_MATCH_PHASE));
const PARTICIPANT_STATUSES = new Set(Object.values(ARENA_PARTICIPANT_STATUS));
const ACTION_PHASES = new Set(Object.values(ARENA_ACTION_PHASE));
const MOVEMENT_MODES = new Set(Object.values(MOVEMENT_MODE));
const AFFORDANCE_KINDS = new Set(['none', 'ignored', 'selected']);
const AFFORDANCE_CHANNELS = Object.freeze(['primary', 'primaryHold', 'jump', 'slam']);
const ACTION_LANES = new Set(['combat', 'locomotion', 'interaction']);

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function cloneReadonlyValue(value, name, ancestors = new Set()) {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
  ) return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${name} 数值必须有限。`);
    return value;
  }
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${name} 只能包含可复制的只读数据。`);
  }
  if (ancestors.has(value)) throw new TypeError(`${name} 不能包含循环引用。`);
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 只能包含普通对象或数组。`);
  }
  ancestors.add(value);
  const result = Array.isArray(value)
    ? value.map((child, index) => cloneReadonlyValue(child, `${name}[${index}]`, ancestors))
    : Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key,
      cloneReadonlyValue(child, `${name}.${key}`, ancestors),
    ]));
  ancestors.delete(value);
  return result;
}

function nonNegativeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value;
}

function finiteVector(value, name) {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是向量。`);
  for (const axis of ['x', 'y', 'z']) {
    if (!Number.isFinite(value[axis])) throw new TypeError(`${name}.${axis} 必须是有限数。`);
  }
  return { x: value.x, y: value.y, z: value.z };
}

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function copyHeldEquipment(value, name) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须为空或装备快照。`);
  }
  return {
    instanceId: nonEmptyString(value.instanceId, `${name}.instanceId`),
    definitionId: nonEmptyString(value.definitionId, `${name}.definitionId`),
    cooldownRemainingTicks: nonNegativeInteger(
      value.cooldownRemainingTicks,
      `${name}.cooldownRemainingTicks`,
    ),
  };
}

function copyVisibleEquipment(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是装备快照。`);
  }
  if (
    value.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
    && value.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
  ) throw new RangeError(`${name}.locationState 不是可见世界状态。`);
  return {
    instanceId: nonEmptyString(value.instanceId, `${name}.instanceId`),
    definitionId: nonEmptyString(value.definitionId, `${name}.definitionId`),
    locationState: value.locationState,
    position: finiteVector(value.position, `${name}.position`),
  };
}

function copyActionRule(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是公开动作规则。`);
  }
  for (const field of ['range', 'minimumFacingDot', 'maximumVerticalDifference']) {
    if (!Number.isFinite(value[field])) throw new TypeError(`${name}.${field} 必须是有限数。`);
  }
  if (value.range <= 0 || value.maximumVerticalDifference <= 0) {
    throw new RangeError(`${name} 距离必须大于 0。`);
  }
  if (value.minimumFacingDot < -1 || value.minimumFacingDot > 1) {
    throw new RangeError(`${name}.minimumFacingDot 必须位于 [-1, 1]。`);
  }
  const activeTicks = nonNegativeInteger(value.activeTicks, `${name}.activeTicks`);
  if (activeTicks < 1) throw new RangeError(`${name}.activeTicks 必须大于 0。`);
  return {
    definitionId: nonEmptyString(value.definitionId, `${name}.definitionId`),
    targetingKind: nonEmptyString(value.targetingKind, `${name}.targetingKind`),
    range: value.range,
    minimumFacingDot: value.minimumFacingDot,
    maximumVerticalDifference: value.maximumVerticalDifference,
    windupTicks: nonNegativeInteger(value.windupTicks, `${name}.windupTicks`),
    activeTicks,
    recoveryTicks: nonNegativeInteger(value.recoveryTicks, `${name}.recoveryTicks`),
  };
}

function copyMovement(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是公开 MovementSnapshot。`);
  }
  if (value.schemaVersion !== MOVEMENT_RUNTIME_SCHEMA_VERSION) {
    throw new RangeError(`${name}.schemaVersion 无效。`);
  }
  if (!MOVEMENT_MODES.has(value.mode)) throw new RangeError(`${name}.mode 无效。`);
  if (typeof value.grounded !== 'boolean') {
    throw new TypeError(`${name}.grounded 必须是布尔值。`);
  }
  return {
    schemaVersion: MOVEMENT_RUNTIME_SCHEMA_VERSION,
    mode: value.mode,
    airJumpsUsed: nonNegativeInteger(value.airJumpsUsed, `${name}.airJumpsUsed`),
    crouchChargeTicks: nonNegativeInteger(
      value.crouchChargeTicks,
      `${name}.crouchChargeTicks`,
    ),
    grounded: value.grounded,
  };
}

function copyAffordanceOutcome(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是公开 ActionAffordance outcome。`);
  }
  if (!AFFORDANCE_KINDS.has(value.kind)) throw new RangeError(`${name}.kind 无效。`);
  const lane = value.lane ?? null;
  if (lane !== null && !ACTION_LANES.has(lane)) throw new RangeError(`${name}.lane 无效。`);
  const actionDefinitionId = value.actionDefinitionId ?? null;
  const source = value.source ?? null;
  if (actionDefinitionId !== null) {
    nonEmptyString(actionDefinitionId, `${name}.actionDefinitionId`);
  }
  if (source !== null) nonEmptyString(source, `${name}.source`);
  return {
    kind: value.kind,
    actionDefinitionId,
    lane,
    source,
    reason: nonEmptyString(value.reason, `${name}.reason`),
  };
}

function copyActionAffordance(value, participantId, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是公开 ActionAffordance。`);
  }
  const affordanceParticipantId = nonEmptyString(
    value.participantId,
    `${name}.participantId`,
  );
  if (affordanceParticipantId !== participantId) {
    throw new RangeError(`${name}.participantId 与 participant 不一致。`);
  }
  if (!value.channels || typeof value.channels !== 'object' || Array.isArray(value.channels)) {
    throw new TypeError(`${name}.channels 无效。`);
  }
  const primaryActionDefinitionId = value.primaryActionDefinitionId ?? null;
  if (primaryActionDefinitionId !== null) {
    nonEmptyString(primaryActionDefinitionId, `${name}.primaryActionDefinitionId`);
  }
  return {
    tick: nonNegativeInteger(value.tick, `${name}.tick`),
    participantId: affordanceParticipantId,
    primaryActionDefinitionId,
    channels: Object.fromEntries(AFFORDANCE_CHANNELS.map((channel) => [
      channel,
      copyAffordanceOutcome(value.channels[channel], `${name}.channels.${channel}`),
    ])),
  };
}

function copyParticipant(participant, name) {
  if (!participant || typeof participant !== 'object') throw new TypeError(`${name} 不存在。`);
  if (typeof participant.id !== 'string' || participant.id.length === 0) {
    throw new TypeError(`${name}.id 必须是非空字符串。`);
  }
  for (const field of [
    'lives',
    'eliminations',
    'deaths',
    'hitstunTicks',
    'invulnerableTicks',
    'respawnTicks',
  ]) {
    nonNegativeInteger(participant[field], `${name}.${field}`);
  }
  if (!PARTICIPANT_STATUSES.has(participant.status)) {
    throw new RangeError(`${name}.status 无效。`);
  }
  if (!participant.action || !ACTION_PHASES.has(participant.action.phase)) {
    throw new RangeError(`${name}.action.phase 无效。`);
  }
  nonNegativeInteger(participant.action.ticksRemaining, `${name}.action.ticksRemaining`);
  if (
    participant.action.definitionId !== null
    && participant.action.definitionId !== undefined
  ) nonEmptyString(participant.action.definitionId, `${name}.action.definitionId`);
  if (typeof participant.grounded !== 'boolean') {
    throw new TypeError(`${name}.grounded 必须是布尔值。`);
  }
  if (
    participant.supportSurfaceId !== null
    && participant.supportSurfaceId !== undefined
    && (typeof participant.supportSurfaceId !== 'string'
      || participant.supportSurfaceId.length === 0)
  ) {
    throw new TypeError(`${name}.supportSurfaceId 必须为空或非空字符串。`);
  }
  return {
    id: participant.id,
    characterDefinitionId: nonEmptyString(
      participant.characterDefinitionId,
      `${name}.characterDefinitionId`,
    ),
    status: participant.status,
    lives: participant.lives,
    eliminations: participant.eliminations,
    deaths: participant.deaths,
    hitstunTicks: participant.hitstunTicks,
    invulnerableTicks: participant.invulnerableTicks,
    respawnTicks: participant.respawnTicks,
    action: {
      definitionId: participant.action.definitionId ?? null,
      phase: participant.action?.phase,
      ticksRemaining: participant.action?.ticksRemaining,
    },
    actionRule: copyActionRule(participant.actionRule, `${name}.actionRule`),
    movement: copyMovement(participant.movement, `${name}.movement`),
    actionAffordance: copyActionAffordance(
      participant.actionAffordance,
      participant.id,
      `${name}.actionAffordance`,
    ),
    equipment: copyHeldEquipment(participant.equipment, `${name}.equipment`),
    position: finiteVector(participant.position, `${name}.position`),
    velocity: finiteVector(participant.velocity, `${name}.velocity`),
    facing: (() => {
      const x = participant.facing?.x;
      const z = participant.facing?.z;
      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        throw new TypeError(`${name}.facing 必须包含有限 x/z。`);
      }
      return { x, z };
    })(),
    grounded: participant.grounded,
    supportSurfaceId: participant.supportSurfaceId ?? null,
  };
}

function copyMapSnapshot(value, name) {
  try {
    return serializeMapRuntimeSnapshot(value);
  } catch (error) {
    const ErrorType = error instanceof RangeError ? RangeError : TypeError;
    const wrapped = new ErrorType(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    wrapped.originalError = error;
    throw wrapped;
  }
}

function validateSourceSnapshot(snapshot, name) {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError(`${name} 必须是快照。`);
  if (!Number.isSafeInteger(snapshot.tick) || snapshot.tick < 0) {
    throw new RangeError(`${name}.tick 必须是非负安全整数。`);
  }
  nonNegativeInteger(snapshot.activeTick, `${name}.activeTick`);
  nonNegativeInteger(snapshot.remainingTicks, `${name}.remainingTicks`);
  if (!MATCH_PHASES.has(snapshot.phase)) throw new RangeError(`${name}.phase 无效。`);
  if (!Array.isArray(snapshot.participants) || snapshot.participants.length !== 2) {
    throw new RangeError(`${name} 必须包含两名参赛者。`);
  }
  const ids = snapshot.participants.map((participant) => participant?.id);
  if (new Set(ids).size !== ids.length) throw new RangeError(`${name} 参赛者 ID 必须唯一。`);
  for (const [index, participant] of snapshot.participants.entries()) {
    if (participant?.actionAffordance?.tick !== snapshot.tick) {
      throw new RangeError(
        `${name}.participants[${index}].actionAffordance.tick 必须与快照 tick 一致。`,
      );
    }
  }
  if (!Array.isArray(snapshot.equipment)) throw new TypeError(`${name}.equipment 必须是数组。`);
  copyMapSnapshot(snapshot.map, `${name}.map`);
  return snapshot;
}

export function cloneBotSourceSnapshot(snapshot) {
  validateSourceSnapshot(snapshot, 'Bot source snapshot');
  return deepFreeze({
    tick: snapshot.tick,
    activeTick: snapshot.activeTick,
    phase: snapshot.phase,
    remainingTicks: snapshot.remainingTicks,
    participants: snapshot.participants.map((participant, index) => (
      copyParticipant(participant, `participants[${index}]`)
    )),
    equipment: snapshot.equipment
      .filter(({ locationState }) => (
        locationState === EQUIPMENT_LOCATION_STATE.SPAWNED
        || locationState === EQUIPMENT_LOCATION_STATE.DROPPED
      ))
      .map((equipment, index) => copyVisibleEquipment(equipment, `equipment[${index}]`))
      .sort((left, right) => compareText(left.instanceId, right.instanceId)),
    map: copyMapSnapshot(snapshot.map, 'map'),
  });
}

export function createBotArenaView(
  arena,
  characterRadius,
  maximumStepHeight = ARENA_PHYSICS.maxStepHeight,
) {
  if (
    !arena
    || typeof arena !== 'object'
    || !Array.isArray(arena.surfaces)
    || arena.surfaces.length === 0
  ) {
    throw new TypeError('Bot arena 必须包含非空 surfaces。');
  }
  if (!Number.isFinite(arena.killY)) throw new TypeError('Bot arena.killY 必须是有限数。');
  if (!Number.isFinite(characterRadius) || characterRadius <= 0) {
    throw new RangeError('Bot characterRadius 必须大于 0。');
  }
  if (!Number.isFinite(maximumStepHeight) || maximumStepHeight <= 0) {
    throw new RangeError('Bot maximumStepHeight 必须大于 0。');
  }
  const surfaceIds = new Set();
  return deepFreeze({
    killY: arena.killY,
    characterRadius,
    maximumStepHeight,
    surfaces: arena.surfaces.map((surface, index) => {
      if (!surface || typeof surface.id !== 'string' || surface.id.length === 0) {
        throw new TypeError(`arena.surfaces[${index}].id 必须是非空字符串。`);
      }
      if (surfaceIds.has(surface.id)) {
        throw new RangeError(`arena.surfaces[${index}].id 必须唯一。`);
      }
      surfaceIds.add(surface.id);
      const halfExtents = finiteVector(
        surface.halfExtents,
        `arena.surfaces[${index}].halfExtents`,
      );
      if (Object.values(halfExtents).some((value) => value <= 0)) {
        throw new RangeError(`arena.surfaces[${index}].halfExtents 必须全部大于 0。`);
      }
      return {
        id: surface.id,
        center: finiteVector(surface.center, `arena.surfaces[${index}].center`),
        halfExtents,
      };
    }),
  });
}

export function createBotObservation({
  commandSnapshot,
  delayedSnapshot,
  selfId,
  arena,
  objectives = [],
}) {
  validateSourceSnapshot(commandSnapshot, 'commandSnapshot');
  validateSourceSnapshot(delayedSnapshot, 'delayedSnapshot');
  if (delayedSnapshot.tick > commandSnapshot.tick) {
    throw new RangeError('机器人不能观察未来快照。');
  }
  if (typeof selfId !== 'string' || selfId.length === 0) {
    throw new TypeError('Bot selfId 必须是非空字符串。');
  }
  if (!Array.isArray(objectives)) throw new TypeError('Bot objectives 必须是数组。');
  const self = commandSnapshot.participants.find((participant) => participant.id === selfId);
  const opponentId = commandSnapshot.participants.find(
    (participant) => participant.id !== selfId,
  )?.id;
  const delayedIds = new Set(delayedSnapshot.participants.map((participant) => participant.id));
  if (
    !self
    || !opponentId
    || !delayedIds.has(selfId)
    || !delayedIds.has(opponentId)
  ) throw new RangeError('Bot observation 前后快照的参赛者身份不一致。');
  const opponent = delayedSnapshot.participants.find((participant) => participant.id === opponentId);
  const copiedSelf = copyParticipant(self, 'observation.self');
  const copiedOpponent = copyParticipant(opponent, 'observation.opponent');
  return deepFreeze({
    schemaVersion: 4,
    commandTick: commandSnapshot.tick,
    observedTick: delayedSnapshot.tick,
    phase: commandSnapshot.phase,
    remainingTicks: commandSnapshot.remainingTicks,
    self: copiedSelf,
    opponent: copiedOpponent,
    // World resources and the opponent are delayed by the same observation
    // budget. The bot may read its own current equipment/cooldown only.
    equipment: delayedSnapshot.equipment.map((value, index) => (
      copyVisibleEquipment(value, `observation.equipment[${index}]`)
    )),
    map: copyMapSnapshot(delayedSnapshot.map, 'observation.map'),
    arena,
    actionRule: copiedSelf.actionRule,
    opponentActionRule: copiedOpponent.actionRule,
    objectives: objectives.map((objective, index) => (
      cloneReadonlyValue(objective, `Bot objectives[${index}]`)
    )),
  });
}
