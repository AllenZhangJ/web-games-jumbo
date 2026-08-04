import {
  ARENA_MATCH_EVENT,
  assertKnownKeys,
  assertPlainRecord,
  createFullAuditSidecarV2Audit,
  isNormalizedInputFrame,
  type ArenaMatchSnapshot,
  type ArenaInputFrame,
  type DeepReadonly,
  type MatchReadFrameV2,
} from '@number-strategy-jump/arena-contracts';
import type { ArenaAuthorityEvent } from '@number-strategy-jump/arena-match';
import type {
  LocalMatchFullAuditReadResultV2,
  LocalMatchPresentationStepResultV2,
} from '@number-strategy-jump/arena-session';
import {
  createReadStepMeasurementV2,
  type ReadStepMeasurementV2,
} from '@number-strategy-jump/arena-performance-evidence';

const FRAME_KEYS = new Set(['schemaVersion', 'worldSnapshot', 'localActionSidecar']);
const WORLD_KEYS = new Set([
  'authoritySchemaVersion', 'physicsBackendVersion', 'configHash', 'ruleContentHash', 'matchSeed',
  'tick', 'activeTick', 'phase', 'remainingTicks', 'eventSequence', 'participants', 'equipment',
  'activeSupplyProjection', 'map', 'result',
]);
const LOCAL_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'participantId', 'profile',
  'primaryActionDefinitionId', 'channels',
]);
const FULL_AUDIT_RESULT_KEYS = new Set(['worldSnapshot', 'sidecars']);
const FULL_AUDIT_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'participantId', 'profile',
  'primaryActionDefinitionId', 'channels',
]);

const READ_STEP_BOUNDARY_TICKS = new Set([
  599, 600, 601,
  1199, 1200, 1201,
  1799, 1800, 1801,
  2399, 2400, 2401,
]);

export interface ArenaReadStepSessionPort {
  readonly getPresentationReadFrame: () => DeepReadonly<MatchReadFrameV2>;
  readonly stepWithPresentationReadFrame: (input?: ArenaInputFrame | null) => LocalMatchPresentationStepResultV2;
  readonly readFullAuditForEvidence: () => LocalMatchFullAuditReadResultV2;
  readonly getLegacyFullSnapshotForAudit: () => DeepReadonly<ArenaMatchSnapshot>;
}

export interface ReadStepAuditDecisionV2 {
  readonly tick: number;
  readonly reasons: readonly string[];
}

export interface ArenaReadStepScheduleV2 {
  readonly initial: (frame: DeepReadonly<MatchReadFrameV2>) => ReadStepAuditDecisionV2 | null;
  readonly afterStep: (
    before: DeepReadonly<MatchReadFrameV2>,
    after: DeepReadonly<MatchReadFrameV2>,
    events: readonly ArenaAuthorityEvent[],
  ) => ReadStepAuditDecisionV2 | null;
}

export interface ArenaReadStepRunnerClock {
  readonly start: () => unknown;
  readonly elapsedMicros: (start: unknown) => number;
}

export const ARENA_READ_STEP_EVENT_TYPES = Object.freeze([
  ARENA_MATCH_EVENT.MATCH_STARTED,
  ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED,
  ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP,
  ARENA_MATCH_EVENT.EQUIPMENT_DROPPED,
  ARENA_MATCH_EVENT.EQUIPMENT_DROP_FALLBACK,
  ARENA_MATCH_EVENT.EQUIPMENT_REPLACED,
  ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED,
  ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED,
  ARENA_MATCH_EVENT.EQUIPMENT_DESPAWNED,
  ARENA_MATCH_EVENT.ACTION_STARTED,
  ARENA_MATCH_EVENT.HIT_RESOLVED,
  ARENA_MATCH_EVENT.KNOCKBACK_APPLIED,
  ARENA_MATCH_EVENT.DOWN_SMASH_LANDED,
  ARENA_MATCH_EVENT.PLAYER_ELIMINATED,
  ARENA_MATCH_EVENT.PLAYER_RESPAWNED,
  ARENA_MATCH_EVENT.SUDDEN_DEATH_STARTED,
  ARENA_MATCH_EVENT.MATCH_ENDED,
] as const);

export interface RunArenaReadStepV2Options {
  readonly session: ArenaReadStepSessionPort;
  readonly playerInput: (frame: DeepReadonly<MatchReadFrameV2>) => ArenaInputFrame;
  readonly schedule?: ArenaReadStepScheduleV2;
  readonly clock?: ArenaReadStepRunnerClock;
  /** Optional extra verifier; the built-in legacy recomposition is mandatory. */
  readonly differential?: (value: ArenaReadStepDifferentialContextV2) => void;
}

export interface ArenaReadStepRunnerResultV2 {
  readonly preFrame: DeepReadonly<MatchReadFrameV2>;
  readonly postFrame: DeepReadonly<MatchReadFrameV2>;
  readonly input: ArenaInputFrame;
  readonly events: readonly ArenaAuthorityEvent[];
  readonly fullAudit: LocalMatchFullAuditReadResultV2 | null;
  readonly auditDecision: ReadStepAuditDecisionV2 | null;
  readonly measurement: ReadStepMeasurementV2;
}

export type ArenaReadStepDifferentialContextV2 = Omit<ArenaReadStepRunnerResultV2, 'measurement'>;

function cpuClock(): ArenaReadStepRunnerClock {
  return {
    start: () => process.cpuUsage(),
    elapsedMicros: (start) => {
      const current = process.cpuUsage(start as ReturnType<typeof process.cpuUsage>);
      const elapsed = current.user + current.system;
      if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('readStep CPU 计时结果无效。');
      return elapsed;
    },
  };
}

function measure<T>(clock: ArenaReadStepRunnerClock, action: () => T): { readonly value: T; readonly micros: number } {
  const start = clock.start();
  const value = action();
  return Object.freeze({ value, micros: clock.elapsedMicros(start) });
}

function requireDataKeys(record: Record<string, unknown>, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (
      descriptor === undefined
      || descriptor.enumerable !== true
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
}

function requireSafeTick(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value as number;
}

function requireFrame(value: unknown, name: string): DeepReadonly<MatchReadFrameV2> {
  if (value === null || typeof value !== 'object' || !Object.isFrozen(value)) {
    throw new TypeError(`${name} 必须是冻结 MatchReadFrameV2。`);
  }
  const frame = assertPlainRecord(value, name);
  assertKnownKeys(frame, FRAME_KEYS, name);
  requireDataKeys(frame, FRAME_KEYS, name);
  if (frame.schemaVersion !== 2) throw new RangeError(`${name}.schemaVersion 必须是 2。`);
  const world = assertPlainRecord(frame.worldSnapshot, `${name}.worldSnapshot`);
  assertKnownKeys(world, WORLD_KEYS, `${name}.worldSnapshot`);
  requireDataKeys(world, WORLD_KEYS, `${name}.worldSnapshot`);
  if (!Object.isFrozen(world)) throw new TypeError(`${name}.worldSnapshot 必须冻结。`);
  const local = assertPlainRecord(frame.localActionSidecar, `${name}.localActionSidecar`);
  assertKnownKeys(local, LOCAL_KEYS, `${name}.localActionSidecar`);
  requireDataKeys(local, LOCAL_KEYS, `${name}.localActionSidecar`);
  if (!Object.isFrozen(local)) throw new TypeError(`${name}.localActionSidecar 必须冻结。`);
  requireSafeTick(world.tick, `${name}.worldSnapshot.tick`);
  requireSafeTick(world.eventSequence, `${name}.worldSnapshot.eventSequence`);
  if (local.tick !== world.tick || local.eventSequence !== world.eventSequence) {
    throw new Error(`${name} local/world identity 不一致。`);
  }
  return value as DeepReadonly<MatchReadFrameV2>;
}

function assertDeepFrozenData(value: unknown, name: string, seen = new Set<object>()): void {
  if (value === null || typeof value !== 'object') return;
  const objectValue = value as object;
  if (seen.has(objectValue)) return;
  seen.add(objectValue);
  if (!Object.isFrozen(objectValue)) throw new TypeError(`${name} 必须递归冻结。`);
  const prototype = Object.getPrototypeOf(objectValue);
  if (!Array.isArray(objectValue) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是 plain data。`);
  }
  for (const key of Reflect.ownKeys(objectValue)) {
    if (Array.isArray(objectValue) && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
    if (
      descriptor === undefined
      || descriptor.enumerable !== true
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError(`${name}.${String(key)} 必须是可枚举数据字段。`);
    assertDeepFrozenData(descriptor.value, `${name}.${String(key)}`, seen);
  }
}

function requireFullAudit(
  value: unknown,
  expectedFrame: DeepReadonly<MatchReadFrameV2>,
): LocalMatchFullAuditReadResultV2 {
  if (value === null || typeof value !== 'object' || !Object.isFrozen(value)) {
    throw new TypeError('full-audit result 必须是冻结对象。');
  }
  const result = assertPlainRecord(value, 'full-audit result');
  assertKnownKeys(result, FULL_AUDIT_RESULT_KEYS, 'full-audit result');
  requireDataKeys(result, FULL_AUDIT_RESULT_KEYS, 'full-audit result');
  const world = requireFrame(Object.freeze({
    schemaVersion: 2,
    worldSnapshot: result.worldSnapshot,
    localActionSidecar: expectedFrame.localActionSidecar,
  }), 'full-audit world').worldSnapshot;
  assertDeepFrozenData(result.worldSnapshot, 'full-audit worldSnapshot');
  assertOrderedDataEqual(world, expectedFrame.worldSnapshot, 'full-audit world 与 post frame');
  if (
    world.tick !== expectedFrame.worldSnapshot.tick
    || world.eventSequence !== expectedFrame.worldSnapshot.eventSequence
    || world.phase !== expectedFrame.worldSnapshot.phase
  ) throw new Error('full-audit world identity 与 post frame 不一致。');
  if (!Array.isArray(result.sidecars) || !Object.isFrozen(result.sidecars)) {
    throw new TypeError('full-audit sidecars 必须是冻结数组。');
  }
  assertDeepFrozenData(result.sidecars, 'full-audit sidecars');
  const sidecars = result.sidecars as readonly Record<string, unknown>[];
  if (sidecars.length !== expectedFrame.worldSnapshot.participants.length) {
    throw new Error('full-audit sidecar 数量必须与 world participant 数量一致。');
  }
  for (const [index, valueAtIndex] of sidecars.entries()) {
    if (valueAtIndex === null || typeof valueAtIndex !== 'object' || !Object.isFrozen(valueAtIndex)) {
      throw new TypeError(`full-audit sidecars[${index}] 必须冻结。`);
    }
    assertKnownKeys(valueAtIndex, FULL_AUDIT_KEYS, `full-audit sidecars[${index}]`);
    requireDataKeys(valueAtIndex, FULL_AUDIT_KEYS, `full-audit sidecars[${index}]`);
    const channels = assertPlainRecord(valueAtIndex.channels, `full-audit sidecars[${index}].channels`);
    assertKnownKeys(channels, new Set(['primary', 'primaryHold', 'jump', 'slam']), `full-audit sidecars[${index}].channels`);
    requireDataKeys(channels, new Set(['primary', 'primaryHold', 'jump', 'slam']), `full-audit sidecars[${index}].channels`);
    createFullAuditSidecarV2Audit(valueAtIndex);
    if (
      valueAtIndex.schemaVersion !== 2
      || valueAtIndex.profile !== 'full-audit'
      || valueAtIndex.participantId !== expectedFrame.worldSnapshot.participants[index]?.id
      || valueAtIndex.tick !== expectedFrame.worldSnapshot.tick
      || valueAtIndex.eventSequence !== expectedFrame.worldSnapshot.eventSequence
    ) throw new Error('full-audit sidecar identity 不一致。');
  }
  if (sidecars.length === 0) throw new Error('full-audit sidecars 不能为空。');
  return value as LocalMatchFullAuditReadResultV2;
}

function assertOrderedDataEqual(actual: unknown, expected: unknown, name: string): void {
  if (Object.is(actual, expected)) return;
  if (typeof actual !== typeof expected || actual === null || expected === null) {
    throw new Error(`${name} 字段值不一致。`);
  }
  if (typeof actual !== 'object' || typeof expected !== 'object') {
    throw new Error(`${name} 字段值不一致。`);
  }
  const actualObject = actual as object;
  const expectedObject = expected as object;
  const actualKeys = Reflect.ownKeys(actualObject);
  const expectedKeys = Reflect.ownKeys(expectedObject);
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`${name} 字段集合或顺序不一致。`);
  }
  for (const key of expectedKeys) {
    const actualDescriptor = Object.getOwnPropertyDescriptor(actualObject, key);
    const expectedDescriptor = Object.getOwnPropertyDescriptor(expectedObject, key);
    if (
      actualDescriptor === undefined
      || expectedDescriptor === undefined
      || !Object.prototype.hasOwnProperty.call(actualDescriptor, 'value')
      || !Object.prototype.hasOwnProperty.call(expectedDescriptor, 'value')
    ) throw new TypeError(`${name}.${String(key)} 必须是数据字段。`);
    assertOrderedDataEqual(actualDescriptor.value, expectedDescriptor.value, `${name}.${String(key)}`);
  }
}

function recomposeLegacyParticipant(
  participant: Record<string, unknown>,
  sidecar: Record<string, unknown>,
): Record<string, unknown> {
  const channels = sidecar.channels as Record<string, unknown>;
  return {
    id: participant.id,
    characterDefinitionId: participant.characterDefinitionId,
    status: participant.status,
    lives: participant.lives,
    eliminations: participant.eliminations,
    deaths: participant.deaths,
    hitstunTicks: participant.hitstunTicks,
    invulnerableTicks: participant.invulnerableTicks,
    respawnTicks: participant.respawnTicks,
    lastHitBy: participant.lastHitBy,
    lastHitTick: participant.lastHitTick,
    action: participant.action,
    actionRule: participant.actionRule,
    movement: participant.movement,
    actionAffordance: {
      tick: sidecar.tick,
      participantId: sidecar.participantId,
      channels: {
        primary: channels.primary,
        primaryHold: channels.primaryHold,
        jump: channels.jump,
        slam: channels.slam,
      },
      primaryActionDefinitionId: sidecar.primaryActionDefinitionId,
    },
    equipment: participant.equipment,
    position: participant.position,
    velocity: participant.velocity,
    facing: participant.facing,
    grounded: participant.grounded,
    supportSurfaceId: participant.supportSurfaceId,
  };
}

function assertFullAuditRecomposesLegacy(
  legacy: DeepReadonly<ArenaMatchSnapshot>,
  fullAudit: LocalMatchFullAuditReadResultV2,
): void {
  const world = fullAudit.worldSnapshot as unknown as Record<string, unknown>;
  const participants = world.participants as readonly Record<string, unknown>[];
  const sidecars = fullAudit.sidecars as readonly Record<string, unknown>[];
  if (participants.length !== sidecars.length) throw new Error('full-audit recomposition participant 数量不一致。');
  const expectedParticipants = participants.map((participant, index) => {
    const sidecar = sidecars[index];
    if (sidecar === undefined) throw new Error('full-audit recomposition sidecar 缺失。');
    return recomposeLegacyParticipant(participant, sidecar);
  });
  const expected: Record<string, unknown> = {
    schemaVersion: world.authoritySchemaVersion,
    physicsBackendVersion: world.physicsBackendVersion,
    configHash: world.configHash,
    ruleContentHash: world.ruleContentHash,
    matchSeed: world.matchSeed,
    tick: world.tick,
    activeTick: world.activeTick,
    phase: world.phase,
    remainingTicks: world.remainingTicks,
    eventSequence: world.eventSequence,
    participants: expectedParticipants,
    equipment: world.equipment,
  };
  if (world.activeSupplyProjection !== null) {
    expected.activeSupplyProjection = world.activeSupplyProjection;
  }
  expected.map = world.map;
  expected.result = world.result;
  assertOrderedDataEqual(legacy, expected, 'legacy full-audit recomposition');
}

function decision(tick: number, reasons: readonly string[]): ReadStepAuditDecisionV2 {
  return Object.freeze({ tick, reasons: Object.freeze([...reasons]) });
}

export function createArenaReadStepScheduleV2(): ArenaReadStepScheduleV2 {
  const auditedTicks = new Set<number>();
  const claim = (tick: number, reasons: readonly string[]): ReadStepAuditDecisionV2 | null => {
    if (auditedTicks.has(tick) || reasons.length === 0) return null;
    auditedTicks.add(tick);
    return decision(tick, reasons);
  };
  return Object.freeze({
    initial: (frame: DeepReadonly<MatchReadFrameV2>) => {
      const tick = requireSafeTick(frame.worldSnapshot.tick, 'readStep initial.tick');
      return tick === 0 ? claim(tick, ['tick0']) : null;
    },
    afterStep: (
      before: DeepReadonly<MatchReadFrameV2>,
      after: DeepReadonly<MatchReadFrameV2>,
      events: readonly ArenaAuthorityEvent[],
    ) => {
      const tick = requireSafeTick(after.worldSnapshot.tick, 'readStep post.tick');
      const reasons: string[] = [];
      if (tick % 60 === 0) reasons.push('interval-60');
      if (READ_STEP_BOUNDARY_TICKS.has(tick)) reasons.push(`boundary-${tick}`);
      if (before.worldSnapshot.phase !== after.worldSnapshot.phase) reasons.push('phase-transition');
      const eventTypes = new Set(events.map((event) => event.type));
      for (const eventType of ARENA_READ_STEP_EVENT_TYPES) {
        if (eventTypes.has(eventType)) reasons.push(`event:${eventType}`);
      }
      if (after.worldSnapshot.phase === 'ended') reasons.push('match-ended-stable-tick');
      return claim(tick, reasons);
    },
  });
}

export function readArenaFullAuditAtCurrentV2(options: {
  readonly session: ArenaReadStepSessionPort;
  readonly schedule?: ArenaReadStepScheduleV2;
  readonly clock?: ArenaReadStepRunnerClock;
}): {
  readonly frame: DeepReadonly<MatchReadFrameV2>;
  readonly fullAudit: LocalMatchFullAuditReadResultV2;
  readonly decision: ReadStepAuditDecisionV2;
  readonly measurement: ReadStepMeasurementV2;
} {
  const schedule = options.schedule ?? createArenaReadStepScheduleV2();
  const clock = options.clock ?? cpuClock();
  const totalStart = clock.start();
  const frameMeasurement = measure(clock, () => requireFrame(
    options.session.getPresentationReadFrame(),
    'readStep current frame',
  ));
  const scheduleMeasurement = measure(clock, () => {
    const auditDecision = schedule.initial(frameMeasurement.value);
    if (auditDecision === null) throw new Error('当前 frame 没有可执行的 full-audit schedule。');
    return auditDecision;
  });
  const fullAuditMeasurement = measure(clock, () => requireFullAudit(
    options.session.readFullAuditForEvidence(),
    frameMeasurement.value,
  ));
  const differentialMeasurement = measure(clock, () => {
    assertFullAuditRecomposesLegacy(
      options.session.getLegacyFullSnapshotForAudit(),
      fullAuditMeasurement.value,
    );
  });
  const totalMicros = clock.elapsedMicros(totalStart);
  const measurement = createReadStepMeasurementV2(Object.freeze({
    schemaVersion: 2,
    tick: frameMeasurement.value.worldSnapshot.tick,
    eventSequence: frameMeasurement.value.worldSnapshot.eventSequence,
    phase: frameMeasurement.value.worldSnapshot.phase,
    preFrameReadMicros: frameMeasurement.micros,
    playerMapperMicros: 0,
    botInputAuthorityPostFrameMicros: 0,
    scheduleMicros: scheduleMeasurement.micros,
    fullAuditMicros: fullAuditMeasurement.micros,
    differentialMicros: differentialMeasurement.micros,
    totalMicros,
    fullAuditPerformed: true,
  }));
  return Object.freeze({
    frame: frameMeasurement.value,
    fullAudit: fullAuditMeasurement.value,
    decision: scheduleMeasurement.value,
    measurement,
  });
}

export function runArenaReadStepV2(options: RunArenaReadStepV2Options): ArenaReadStepRunnerResultV2 {
  const clock = options.clock ?? cpuClock();
  const schedule = options.schedule ?? createArenaReadStepScheduleV2();
  const totalStart = clock.start();
  const preMeasurement = measure(clock, () => requireFrame(
    options.session.getPresentationReadFrame(),
    'readStep pre frame',
  ));
  const inputMeasurement = measure(clock, () => options.playerInput(preMeasurement.value));
  const stepMeasurement = measure(clock, () => options.session.stepWithPresentationReadFrame(inputMeasurement.value));
  const step = stepMeasurement.value;
  if (!Array.isArray(step.events)) throw new TypeError('readStep events 必须是数组。');
  const postFrame = requireFrame(step.readFrame, 'readStep post frame');
  const preTick = preMeasurement.value.worldSnapshot.tick;
  const postTick = postFrame.worldSnapshot.tick;
  if (!Number.isSafeInteger(preTick) || !Number.isSafeInteger(postTick) || postTick !== preTick + 1) {
    throw new Error('readStep 必须恰好推进一个 authority tick。');
  }
  if (
    step.input === null
    || !isNormalizedInputFrame(step.input)
    || step.input.tick !== preTick
    || step.input.participantId !== preMeasurement.value.localActionSidecar.participantId
  ) throw new Error('readStep 返回的 player InputFrame identity 无效。');
  const auditMeasurement = measure(clock, () => schedule.afterStep(
    preMeasurement.value,
    postFrame,
    step.events,
  ));
  const auditDecision = auditMeasurement.value;
  let fullAudit: LocalMatchFullAuditReadResultV2 | null = null;
  let fullAuditMicros = 0;
  if (auditDecision !== null) {
    const measuredAudit = measure(clock, () => requireFullAudit(
      options.session.readFullAuditForEvidence(),
      postFrame,
    ));
    fullAudit = measuredAudit.value;
    fullAuditMicros = measuredAudit.micros;
  }
  const provisional: ArenaReadStepDifferentialContextV2 = Object.freeze({
    preFrame: preMeasurement.value,
    postFrame,
    input: step.input,
    events: step.events,
    fullAudit,
    auditDecision,
  });
  const differentialMeasurement = measure(clock, () => {
    if (auditDecision !== null) {
      if (fullAudit === null) throw new Error('scheduled full-audit result 缺失。');
      assertFullAuditRecomposesLegacy(
        options.session.getLegacyFullSnapshotForAudit(),
        fullAudit,
      );
    }
    if (options.differential !== undefined) options.differential(provisional);
  });
  const totalMicros = clock.elapsedMicros(totalStart);
  const measurement = createReadStepMeasurementV2(Object.freeze({
    schemaVersion: 2,
    tick: postFrame.worldSnapshot.tick,
    eventSequence: postFrame.worldSnapshot.eventSequence,
    phase: postFrame.worldSnapshot.phase,
    preFrameReadMicros: preMeasurement.micros,
    playerMapperMicros: inputMeasurement.micros,
    botInputAuthorityPostFrameMicros: stepMeasurement.micros,
    scheduleMicros: auditMeasurement.micros,
    fullAuditMicros,
    differentialMicros: differentialMeasurement.micros,
    totalMicros,
    fullAuditPerformed: fullAudit !== null,
  }));
  const result = Object.freeze({ ...provisional, measurement });
  return result;
}
