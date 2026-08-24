import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_V2_FORMAL_THREE_CAMERA_IMPACT_KINDS_CANDIDATE_V1 = Object.freeze([
  'hit-confirm',
  'surface-transfer',
  'ring-out',
] as const);

export type ArenaV2FormalThreeCameraImpactKindCandidateV1 =
  typeof ARENA_V2_FORMAL_THREE_CAMERA_IMPACT_KINDS_CANDIDATE_V1[number];

export interface ArenaV2FormalThreeCameraImpactCommandCandidateV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly sourceEventId: string;
  readonly kind: ArenaV2FormalThreeCameraImpactKindCandidateV1;
  readonly tick: number;
  readonly motionPolicy: 'standard' | 'static';
  readonly worldDirection: Readonly<{ readonly x: number; readonly z: number }> | null;
  readonly impactScaleMultiplier: 0.82 | 1 | 1.18;
}

export interface ArenaV2FormalThreeCameraImpactSampleCandidateV1 {
  readonly sourceEventId: string;
  readonly displacementFraction: number;
  readonly zoomFraction: number;
  readonly direction: Readonly<
    | { readonly kind: 'world'; readonly x: number; readonly z: number }
    | { readonly kind: 'screen'; readonly right: number; readonly up: number }
  >;
}

export interface ArenaV2FormalThreeCameraImpactResolutionCandidateV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly tick: number;
  readonly samples: readonly ArenaV2FormalThreeCameraImpactSampleCandidateV1[];
  readonly zoomFraction: number;
}

interface ImpactRecord {
  readonly command: ArenaV2FormalThreeCameraImpactCommandCandidateV1;
  readonly canonical: string;
}

const COMMAND_KEYS = new Set([
  'schemaVersion',
  'epochId',
  'sourceEventId',
  'kind',
  'tick',
  'motionPolicy',
  'worldDirection',
  'impactScaleMultiplier',
]);
const DIRECTION_KEYS = new Set(['x', 'z']);
const IMPACT_RULES = Object.freeze({
  'hit-confirm': Object.freeze({ durationTicks: 5, displacementFraction: 0.0035, zoomFraction: 0.0018, priority: 1 }),
  'surface-transfer': Object.freeze({ durationTicks: 7, displacementFraction: 0.007, zoomFraction: 0.003, priority: 2 }),
  'ring-out': Object.freeze({ durationTicks: 9, displacementFraction: 0.01, zoomFraction: 0.0045, priority: 3 }),
} as const);
const MAXIMUM_ACTIVE_IMPACTS = 3;
const MAXIMUM_RECENT_IDENTITIES = 64;
const MAXIMUM_DISPLACEMENT_FRACTION = 0.012;
const MAXIMUM_ZOOM_FRACTION = 0.0055;

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function safeTick(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function compareUtf8(left: string, right: string): number {
  const a = utf8(left);
  const b = utf8(right);
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return (a[index] as number) - (b[index] as number);
  }
  return a.length - b.length;
}

function fallbackDirection(sourceEventId: string): Readonly<{
  readonly kind: 'screen';
  readonly right: number;
  readonly up: number;
}> {
  const bytes = utf8(sourceEventId);
  let phaseIndex = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    phaseIndex = (phaseIndex + (bytes[index] as number) * (index + 1)) % 8;
  }
  const angle = phaseIndex * Math.PI / 4;
  return Object.freeze({ kind: 'screen' as const, right: Math.cos(angle), up: Math.sin(angle) });
}

function cameraImpactCommand(value: unknown): ArenaV2FormalThreeCameraImpactCommandCandidateV1 {
  const source = assertPlainRecord(value, 'Arena V2 formal Three camera impact command');
  assertKnownKeys(source, COMMAND_KEYS, 'Arena V2 formal Three camera impact command');
  for (const key of COMMAND_KEYS) dataField(source, key, 'Arena V2 formal Three camera impact command');
  const kind = dataField(source, 'kind', 'Arena V2 formal Three camera impact command');
  if (!ARENA_V2_FORMAL_THREE_CAMERA_IMPACT_KINDS_CANDIDATE_V1.includes(
    kind as ArenaV2FormalThreeCameraImpactKindCandidateV1,
  )) throw new RangeError('Arena V2 formal Three camera impact kind无效。');
  const motionPolicy = dataField(source, 'motionPolicy', 'Arena V2 formal Three camera impact command');
  if (motionPolicy !== 'standard' && motionPolicy !== 'static') {
    throw new RangeError('Arena V2 formal Three camera impact motionPolicy无效。');
  }
  const rawDirection = dataField(source, 'worldDirection', 'Arena V2 formal Three camera impact command');
  let worldDirection: Readonly<{ readonly x: number; readonly z: number }> | null = null;
  if (rawDirection !== null) {
    const direction = assertPlainRecord(rawDirection, 'Arena V2 formal Three camera impact direction');
    assertKnownKeys(direction, DIRECTION_KEYS, 'Arena V2 formal Three camera impact direction');
    const x = dataField(direction, 'x', 'Arena V2 formal Three camera impact direction');
    const z = dataField(direction, 'z', 'Arena V2 formal Three camera impact direction');
    if (
      typeof x !== 'number'
      || !Number.isFinite(x)
      || typeof z !== 'number'
      || !Number.isFinite(z)
    ) throw new RangeError('Arena V2 formal Three camera impact direction必须是有限二维向量。');
    worldDirection = Math.hypot(x, z) <= 1e-7
      ? null
      : Object.freeze({ x, z });
  }
  if (dataField(source, 'schemaVersion', 'Arena V2 formal Three camera impact command') !== 1) {
    throw new RangeError('Arena V2 formal Three camera impact只接受V1 command。');
  }
  const impactScaleMultiplier = dataField(
    source,
    'impactScaleMultiplier',
    'Arena V2 formal Three camera impact command',
  );
  if (impactScaleMultiplier !== 0.82
    && impactScaleMultiplier !== 1
    && impactScaleMultiplier !== 1.18) {
    throw new RangeError('Arena V2 formal Three camera impact力度倍率无效。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    epochId: assertNonEmptyString(
      dataField(source, 'epochId', 'Arena V2 formal Three camera impact command'),
      'Arena V2 formal Three camera impact command.epochId',
    ),
    sourceEventId: assertNonEmptyString(
      dataField(source, 'sourceEventId', 'Arena V2 formal Three camera impact command'),
      'Arena V2 formal Three camera impact command.sourceEventId',
    ),
    kind: kind as ArenaV2FormalThreeCameraImpactKindCandidateV1,
    tick: safeTick(
      dataField(source, 'tick', 'Arena V2 formal Three camera impact command'),
      'Arena V2 formal Three camera impact command.tick',
    ),
    motionPolicy,
    worldDirection,
    impactScaleMultiplier,
  });
}

export class ArenaV2FormalThreeCameraImpactStateCandidateV1 {
  readonly #active = new Map<string, ImpactRecord>();
  readonly #recent = new Map<string, string>();
  #epochId: string;
  #lastCommandTick: number | null = null;
  #lastResolvedTick: number | null = null;
  #disposed = false;

  constructor(epochIdValue: unknown) {
    this.#epochId = assertNonEmptyString(
      epochIdValue,
      'Arena V2 formal Three camera impact epochId',
    );
  }

  get epochId(): string { return this.#epochId; }

  present(value: unknown): void {
    if (this.#disposed) throw new Error('Arena V2 formal Three camera impact已销毁。');
    const command = cameraImpactCommand(value);
    if (command.epochId !== this.#epochId) {
      throw new RangeError('Arena V2 formal Three camera impact拒绝旧epoch command。');
    }
    const canonical = JSON.stringify(command);
    const known = this.#recent.get(command.sourceEventId);
    if (known !== undefined) {
      if (known !== canonical) {
        throw new RangeError(`Arena V2 formal Three camera impact ${command.sourceEventId}语义漂移。`);
      }
      return;
    }
    if (
      (this.#lastCommandTick !== null && command.tick < this.#lastCommandTick)
      || (this.#lastResolvedTick !== null && command.tick < this.#lastResolvedTick)
    ) throw new RangeError('Arena V2 formal Three camera impact拒绝tick倒退。');
    const nextRecords = [...this.#active.values(), Object.freeze({ command, canonical })]
      .sort((left, right) => {
        const priority = IMPACT_RULES[right.command.kind].priority
          - IMPACT_RULES[left.command.kind].priority;
        return priority !== 0
          ? priority
          : compareUtf8(left.command.sourceEventId, right.command.sourceEventId);
      })
      .slice(0, MAXIMUM_ACTIVE_IMPACTS);
    this.#recent.set(command.sourceEventId, canonical);
    while (this.#recent.size > MAXIMUM_RECENT_IDENTITIES) {
      const oldest = this.#recent.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.#recent.delete(oldest);
    }
    this.#active.clear();
    for (const record of nextRecords) this.#active.set(record.command.sourceEventId, record);
    this.#lastCommandTick = command.tick;
  }

  remove(sourceEventIdValue: unknown): void {
    if (this.#disposed) return;
    const sourceEventId = assertNonEmptyString(
      sourceEventIdValue,
      'Arena V2 formal Three camera impact remove sourceEventId',
    );
    this.#active.delete(sourceEventId);
  }

  resolve(currentTickValue: unknown, reducedMotionValue: unknown): ArenaV2FormalThreeCameraImpactResolutionCandidateV1 {
    if (this.#disposed) throw new Error('Arena V2 formal Three camera impact已销毁。');
    const currentTick = safeTick(currentTickValue, 'Arena V2 formal Three camera impact currentTick');
    if (typeof reducedMotionValue !== 'boolean') {
      throw new TypeError('Arena V2 formal Three camera impact reducedMotion必须是boolean。');
    }
    if (this.#lastResolvedTick !== null && currentTick < this.#lastResolvedTick) {
      throw new RangeError('Arena V2 formal Three camera impact拒绝resolve tick倒退。');
    }
    const samples: ArenaV2FormalThreeCameraImpactSampleCandidateV1[] = [];
    const expiredSourceEventIds: string[] = [];
    let zoomFraction = 0;
    for (const [sourceEventId, record] of this.#active) {
      const { command } = record;
      if (command.tick > currentTick) {
        throw new RangeError(`Arena V2 formal Three camera impact ${sourceEventId}来自未来tick。`);
      }
      const rule = IMPACT_RULES[command.kind];
      const age = currentTick - command.tick;
      if (age >= rule.durationTicks) {
        expiredSourceEventIds.push(sourceEventId);
        continue;
      }
      if (reducedMotionValue || command.motionPolicy === 'static') continue;
      const envelope = ((rule.durationTicks - age) / rule.durationTicks) ** 2;
      const sign = age % 2 === 0 ? 1 : -1;
      const direction = command.worldDirection === null
        ? fallbackDirection(sourceEventId)
        : Object.freeze({ kind: 'world' as const, ...command.worldDirection });
      const sample = Object.freeze({
        sourceEventId,
        displacementFraction:
          rule.displacementFraction * command.impactScaleMultiplier * envelope * sign,
        zoomFraction: rule.zoomFraction * command.impactScaleMultiplier * envelope,
        direction,
      });
      samples.push(sample);
      zoomFraction += sample.zoomFraction;
    }
    for (const sourceEventId of expiredSourceEventIds) this.#active.delete(sourceEventId);
    this.#lastResolvedTick = currentTick;
    return Object.freeze({
      schemaVersion: 1 as const,
      epochId: this.#epochId,
      tick: currentTick,
      samples: Object.freeze(samples),
      zoomFraction: Math.min(MAXIMUM_ZOOM_FRACTION, zoomFraction),
    });
  }

  clear(nextEpochIdValue?: unknown): void {
    if (this.#disposed) return;
    const nextEpochId = nextEpochIdValue === undefined
      ? this.#epochId
      : assertNonEmptyString(nextEpochIdValue, 'Arena V2 formal Three camera impact nextEpochId');
    this.#active.clear();
    this.#recent.clear();
    this.#lastCommandTick = null;
    this.#lastResolvedTick = null;
    this.#epochId = nextEpochId;
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      epochId: this.#epochId,
      activeSourceEventIds: Object.freeze([...this.#active.keys()]),
      recentSourceEventIds: Object.freeze([...this.#recent.keys()]),
      lastCommandTick: this.#lastCommandTick,
      lastResolvedTick: this.#lastResolvedTick,
      disposed: this.#disposed,
    });
  }

  dispose(): void {
    if (this.#disposed) return;
    this.clear();
    this.#disposed = true;
  }
}

export const ARENA_V2_FORMAL_THREE_CAMERA_IMPACT_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  maximumActiveImpacts: MAXIMUM_ACTIVE_IMPACTS,
  maximumRecentIdentities: MAXIMUM_RECENT_IDENTITIES,
  maximumDisplacementFraction: MAXIMUM_DISPLACEMENT_FRACTION,
  maximumZoomFraction: MAXIMUM_ZOOM_FRACTION,
  authorityTimeSource: 'integer-tick' as const,
  ownsRuleOrMatchAuthority: false as const,
  usesWallClock: false as const,
  usesRandom: false as const,
  authorityImpactStrengthScaleSupported: true as const,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_FORMAL_THREE_CAMERA_IMPACT_MAXIMUM_DISPLACEMENT_FRACTION_CANDIDATE_V1 =
  MAXIMUM_DISPLACEMENT_FRACTION;
