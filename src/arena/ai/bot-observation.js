import {
  ARENA_ACTION_PHASE,
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
} from '../config.js';

const MATCH_PHASES = new Set(Object.values(ARENA_MATCH_PHASE));
const PARTICIPANT_STATUSES = new Set(Object.values(ARENA_PARTICIPANT_STATUS));
const ACTION_PHASES = new Set(Object.values(ARENA_ACTION_PHASE));

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
    status: participant.status,
    lives: participant.lives,
    eliminations: participant.eliminations,
    deaths: participant.deaths,
    hitstunTicks: participant.hitstunTicks,
    invulnerableTicks: participant.invulnerableTicks,
    respawnTicks: participant.respawnTicks,
    action: {
      phase: participant.action?.phase,
      ticksRemaining: participant.action?.ticksRemaining,
    },
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
  });
}

export function createBotArenaView(arena, characterRadius) {
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
  const surfaceIds = new Set();
  return deepFreeze({
    killY: arena.killY,
    characterRadius,
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

export function createBotActionRuleView(basePush) {
  if (!basePush || typeof basePush !== 'object') throw new TypeError('Bot action rule 不存在。');
  for (const field of ['range', 'minimumFacingDot', 'maximumVerticalDifference']) {
    if (!Number.isFinite(basePush[field])) throw new TypeError(`Bot action rule.${field} 必须是有限数。`);
  }
  if (basePush.range <= 0 || basePush.maximumVerticalDifference <= 0) {
    throw new RangeError('Bot action rule 距离必须大于 0。');
  }
  if (basePush.minimumFacingDot < -1 || basePush.minimumFacingDot > 1) {
    throw new RangeError('Bot action rule.minimumFacingDot 必须位于 [-1, 1]。');
  }
  return deepFreeze({
    id: 'base-push',
    range: basePush.range,
    minimumFacingDot: basePush.minimumFacingDot,
    maximumVerticalDifference: basePush.maximumVerticalDifference,
  });
}

export function createBotObservation({
  commandSnapshot,
  delayedSnapshot,
  selfId,
  arena,
  actionRule,
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
  return deepFreeze({
    schemaVersion: 1,
    commandTick: commandSnapshot.tick,
    observedTick: delayedSnapshot.tick,
    phase: commandSnapshot.phase,
    remainingTicks: commandSnapshot.remainingTicks,
    self: copyParticipant(self, 'observation.self'),
    opponent: copyParticipant(opponent, 'observation.opponent'),
    arena,
    actionRule,
    objectives: objectives.map((objective, index) => (
      cloneReadonlyValue(objective, `Bot objectives[${index}]`)
    )),
  });
}
