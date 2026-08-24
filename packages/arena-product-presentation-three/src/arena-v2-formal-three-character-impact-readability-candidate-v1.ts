import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';

export type ArenaV2FormalThreeCharacterImpactKindCandidateV1 =
  | 'hit-confirm'
  | 'surface-transfer'
  | 'ring-out';

export interface ArenaV2FormalThreeCharacterImpactCommandCandidateV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly sourceEventId: string;
  readonly participantId: string;
  readonly contactParticipantId: string | null;
  readonly kind: ArenaV2FormalThreeCharacterImpactKindCandidateV1;
  readonly tick: number;
  readonly motionPolicy: 'standard' | 'static';
  readonly worldDirection: Readonly<{ readonly x: number; readonly z: number }> | null;
  readonly impactScaleMultiplier: 0.85 | 1 | 1.12;
}

export interface ArenaV2FormalThreeCharacterImpactResolutionCandidateV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly tick: number;
  readonly participants: readonly Readonly<{
    readonly participantId: string;
    readonly intensity: number;
    readonly animationHeld: boolean;
  }>[];
  readonly hitDirections: readonly Readonly<{
    readonly participantId: string;
    readonly worldDirection: Readonly<{ readonly x: number; readonly z: number }>;
  }>[];
}

interface ImpactRecord {
  readonly command: ArenaV2FormalThreeCharacterImpactCommandCandidateV1;
  readonly canonical: string;
}

interface TargetImpactRecord {
  readonly participantId: string;
  readonly contributors: readonly ImpactRecord[];
  readonly winner: ImpactRecord;
  readonly globalCapacityRepresentative: ImpactRecord;
}

const COMMAND_KEYS = new Set([
  'schemaVersion',
  'epochId',
  'sourceEventId',
  'participantId',
  'contactParticipantId',
  'kind',
  'tick',
  'motionPolicy',
  'worldDirection',
  'impactScaleMultiplier',
]);
const IMPACT_RULES = Object.freeze({
  'hit-confirm': Object.freeze({
    durationTicks: 3,
    animationHoldTicks: 2,
    peakIntensity: 0.55,
    priority: 1,
  }),
  'surface-transfer': Object.freeze({
    durationTicks: 4,
    animationHoldTicks: 3,
    peakIntensity: 0.75,
    priority: 2,
  }),
  'ring-out': Object.freeze({
    durationTicks: 5,
    animationHoldTicks: 4,
    peakIntensity: 0.95,
    priority: 3,
  }),
} as const);
const IMPACT_KINDS = new Set<ArenaV2FormalThreeCharacterImpactKindCandidateV1>([
  'hit-confirm',
  'surface-transfer',
  'ring-out',
]);
const MAXIMUM_ACTIVE_IMPACTS = 3;
const MAXIMUM_PRESENTED_PARTICIPANTS = MAXIMUM_ACTIVE_IMPACTS * 2;
const MAXIMUM_RECENT_IDENTITIES = 64;
const ATTACKER_CONTACT_HOLD_TICKS = 1;
const EPOCH_PREFIX = 'arena-v2.formal-three.character-impact.epoch';

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

function worldDirection(
  value: unknown,
): Readonly<{ readonly x: number; readonly z: number }> | null {
  if (value === null) return null;
  const source = assertPlainRecord(value, 'Arena V2 formal Three character impact worldDirection');
  assertKnownKeys(
    source,
    new Set(['x', 'z']),
    'Arena V2 formal Three character impact worldDirection',
  );
  const x = dataField(source, 'x', 'Arena V2 formal Three character impact worldDirection');
  const z = dataField(source, 'z', 'Arena V2 formal Three character impact worldDirection');
  if (typeof x !== 'number' || !Number.isFinite(x) || typeof z !== 'number' || !Number.isFinite(z)) {
    throw new TypeError('Arena V2 formal Three character impact worldDirection必须是有限数。');
  }
  const magnitude = Math.hypot(x, z);
  if (magnitude < 0.0001) return null;
  return Object.freeze({ x: x / magnitude, z: z / magnitude });
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

function compareImpactKindPriority(left: ImpactRecord, right: ImpactRecord): number {
  return IMPACT_RULES[right.command.kind].priority
    - IMPACT_RULES[left.command.kind].priority;
}

function compareGlobalCapacityRepresentative(left: ImpactRecord, right: ImpactRecord): number {
  const priority = compareImpactKindPriority(left, right);
  return priority !== 0
    ? priority
    : compareUtf8(left.command.sourceEventId, right.command.sourceEventId);
}

function compareSameTargetWinner(left: ImpactRecord, right: ImpactRecord): number {
  const priority = compareImpactKindPriority(left, right);
  if (priority !== 0) return priority;
  if (left.command.tick !== right.command.tick) {
    return left.command.tick > right.command.tick ? -1 : 1;
  }
  if (left.command.impactScaleMultiplier !== right.command.impactScaleMultiplier) {
    return left.command.impactScaleMultiplier > right.command.impactScaleMultiplier ? -1 : 1;
  }
  return compareUtf8(left.command.sourceEventId, right.command.sourceEventId);
}

function animationHoldTicks(
  commandValue: ArenaV2FormalThreeCharacterImpactCommandCandidateV1,
): number {
  const rule = IMPACT_RULES[commandValue.kind];
  return Math.min(
    rule.durationTicks,
    Math.ceil(rule.animationHoldTicks * commandValue.impactScaleMultiplier),
  );
}

function targetImpactRecord(
  participantId: string,
  contributorsValue: readonly ImpactRecord[],
): TargetImpactRecord {
  const contributors = contributorsValue.slice().sort(compareSameTargetWinner);
  const winner = contributors[0];
  const globalCapacityRepresentative = contributorsValue.slice()
    .sort(compareGlobalCapacityRepresentative)[0];
  if (winner === undefined || globalCapacityRepresentative === undefined) {
    throw new RangeError('Arena V2 formal Three character impact目标缺少贡献事件。');
  }
  if (contributors.some(({ command: item }) => item.participantId !== participantId)) {
    throw new RangeError('Arena V2 formal Three character impact目标贡献者身份漂移。');
  }
  return Object.freeze({
    participantId,
    contributors: Object.freeze(contributors),
    winner,
    globalCapacityRepresentative,
  });
}

function command(value: unknown): ArenaV2FormalThreeCharacterImpactCommandCandidateV1 {
  const source = assertPlainRecord(value, 'Arena V2 formal Three character impact command');
  assertKnownKeys(source, COMMAND_KEYS, 'Arena V2 formal Three character impact command');
  for (const key of COMMAND_KEYS) dataField(
    source,
    key,
    'Arena V2 formal Three character impact command',
  );
  const schemaVersion = dataField(
    source,
    'schemaVersion',
    'Arena V2 formal Three character impact command',
  );
  if (schemaVersion !== 1) {
    throw new RangeError('Arena V2 formal Three character impact只接受V1 command。');
  }
  const kind = dataField(source, 'kind', 'Arena V2 formal Three character impact command');
  if (!IMPACT_KINDS.has(kind as ArenaV2FormalThreeCharacterImpactKindCandidateV1)) {
    throw new RangeError('Arena V2 formal Three character impact kind无效。');
  }
  const motionPolicy = dataField(
    source,
    'motionPolicy',
    'Arena V2 formal Three character impact command',
  );
  if (motionPolicy !== 'standard' && motionPolicy !== 'static') {
    throw new RangeError('Arena V2 formal Three character impact motionPolicy无效。');
  }
  const impactScaleMultiplier = dataField(
    source,
    'impactScaleMultiplier',
    'Arena V2 formal Three character impact command',
  );
  if (impactScaleMultiplier !== 0.85
    && impactScaleMultiplier !== 1
    && impactScaleMultiplier !== 1.12) {
    throw new RangeError('Arena V2 formal Three character impact力度倍率无效。');
  }
  const contactParticipantIdValue = dataField(
    source,
    'contactParticipantId',
    'Arena V2 formal Three character impact command',
  );
  return Object.freeze({
    schemaVersion: 1 as const,
    epochId: assertNonEmptyString(
      dataField(source, 'epochId', 'Arena V2 formal Three character impact command'),
      'Arena V2 formal Three character impact command.epochId',
    ),
    sourceEventId: assertNonEmptyString(
      dataField(source, 'sourceEventId', 'Arena V2 formal Three character impact command'),
      'Arena V2 formal Three character impact command.sourceEventId',
    ),
    participantId: assertNonEmptyString(
      dataField(source, 'participantId', 'Arena V2 formal Three character impact command'),
      'Arena V2 formal Three character impact command.participantId',
    ),
    contactParticipantId: contactParticipantIdValue === null
      ? null
      : assertNonEmptyString(
        contactParticipantIdValue,
        'Arena V2 formal Three character impact command.contactParticipantId',
      ),
    kind: kind as ArenaV2FormalThreeCharacterImpactKindCandidateV1,
    tick: safeTick(
      dataField(source, 'tick', 'Arena V2 formal Three character impact command'),
      'Arena V2 formal Three character impact command.tick',
    ),
    motionPolicy,
    worldDirection: worldDirection(dataField(
      source,
      'worldDirection',
      'Arena V2 formal Three character impact command',
    )),
    impactScaleMultiplier,
  });
}

export class ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1 {
  readonly #active = new Map<string, TargetImpactRecord>();
  readonly #recent = new Map<string, string>();
  #epochOrdinal = 0;
  #lastCommandTick: number | null = null;
  #lastResolvedTick: number | null = null;
  #disposed = false;

  get epochId(): string { return `${EPOCH_PREFIX}.${this.#epochOrdinal}`; }

  getCharacterImpactEpochId(): string {
    if (this.#disposed) throw new Error('Arena V2 formal Three character impact已销毁。');
    return this.epochId;
  }

  presentCharacterImpact(value: unknown): void {
    if (this.#disposed) throw new Error('Arena V2 formal Three character impact已销毁。');
    const next = command(value);
    if (next.epochId !== this.epochId) {
      throw new RangeError('Arena V2 formal Three character impact拒绝旧epoch command。');
    }
    const canonical = JSON.stringify(next);
    const known = this.#recent.get(next.sourceEventId);
    if (known !== undefined) {
      if (known !== canonical) {
        throw new RangeError(
          `Arena V2 formal Three character impact ${next.sourceEventId}语义漂移。`,
        );
      }
      return;
    }
    if (
      (this.#lastCommandTick !== null && next.tick < this.#lastCommandTick)
      || (this.#lastResolvedTick !== null && next.tick < this.#lastResolvedTick)
    ) throw new RangeError('Arena V2 formal Three character impact拒绝tick倒退。');
    const grouped = new Map<string, ImpactRecord[]>();
    const nextRecord = Object.freeze({ command: next, canonical });
    for (const record of [
      ...[...this.#active.values()].flatMap(({ contributors }) => contributors),
      nextRecord,
    ]) {
      const ageAtIncomingTick = next.tick - record.command.tick;
      if (ageAtIncomingTick >= IMPACT_RULES[record.command.kind].durationTicks) continue;
      const target = grouped.get(record.command.participantId) ?? [];
      target.push(record);
      grouped.set(record.command.participantId, target);
    }
    const candidates = [...grouped]
      .map(([participantId, contributors]) => targetImpactRecord(participantId, contributors))
      .sort((left, right) => compareGlobalCapacityRepresentative(
        left.globalCapacityRepresentative,
        right.globalCapacityRepresentative,
      ))
      .slice(0, MAXIMUM_ACTIVE_IMPACTS);
    const activeContributorCount = candidates.reduce(
      (total, target) => total + target.contributors.length,
      0,
    );
    if (activeContributorCount > MAXIMUM_RECENT_IDENTITIES) {
      throw new RangeError('Arena V2 formal Three character impact活动贡献事件超出64项硬上限。');
    }
    const protectedSourceEventIds = new Set(candidates.flatMap(
      ({ contributors }) => contributors.map(({ command: item }) => item.sourceEventId),
    ));
    const nextRecent = new Map(this.#recent);
    nextRecent.set(next.sourceEventId, canonical);
    while (nextRecent.size > MAXIMUM_RECENT_IDENTITIES) {
      const evictable = [...nextRecent.keys()].find(
        (sourceEventId) => !protectedSourceEventIds.has(sourceEventId),
      );
      if (evictable === undefined) {
        throw new RangeError('Arena V2 formal Three character impact recent水位无可淘汰身份。');
      }
      nextRecent.delete(evictable);
    }
    this.#recent.clear();
    for (const [sourceEventId, recentCanonical] of nextRecent) {
      this.#recent.set(sourceEventId, recentCanonical);
    }
    this.#active.clear();
    for (const record of candidates) this.#active.set(record.participantId, record);
    this.#lastCommandTick = next.tick;
  }

  removeCharacterImpact(sourceEventIdValue: unknown): void {
    if (this.#disposed) return;
    const sourceEventId = assertNonEmptyString(
      sourceEventIdValue,
      'Arena V2 formal Three character impact remove sourceEventId',
    );
    for (const [participantId, target] of this.#active) {
      const contributors = target.contributors.filter(
        ({ command: item }) => item.sourceEventId !== sourceEventId,
      );
      if (contributors.length === target.contributors.length) continue;
      if (contributors.length === 0) this.#active.delete(participantId);
      else this.#active.set(participantId, targetImpactRecord(participantId, contributors));
      return;
    }
  }

  resolveCharacterImpacts(
    currentTickValue: unknown,
    reducedMotionValue: unknown,
  ): ArenaV2FormalThreeCharacterImpactResolutionCandidateV1 {
    if (this.#disposed) throw new Error('Arena V2 formal Three character impact已销毁。');
    const currentTick = safeTick(
      currentTickValue,
      'Arena V2 formal Three character impact currentTick',
    );
    if (typeof reducedMotionValue !== 'boolean') {
      throw new TypeError('Arena V2 formal Three character impact reducedMotion必须是boolean。');
    }
    if (this.#lastResolvedTick !== null && currentTick < this.#lastResolvedTick) {
      throw new RangeError('Arena V2 formal Three character impact拒绝resolve tick倒退。');
    }
    const intensities = new Map<string, number>();
    const animationHolds = new Set<string>();
    const hitDirections = new Map<string, Readonly<{ readonly x: number; readonly z: number }>>();
    const survivingTargets: TargetImpactRecord[] = [];
    for (const target of this.#active.values()) {
      const contributors = target.contributors.filter(({ command: item }) => {
        if (item.tick > currentTick) {
          throw new RangeError(
            `Arena V2 formal Three character impact ${item.sourceEventId}来自未来tick。`,
          );
        }
        return currentTick - item.tick < IMPACT_RULES[item.kind].durationTicks;
      });
      if (contributors.length === 0) continue;
      const survivingTarget = targetImpactRecord(target.participantId, contributors);
      survivingTargets.push(survivingTarget);
      const directionWinner = survivingTarget.winner.command;
      if (directionWinner.worldDirection !== null) {
        hitDirections.set(target.participantId, directionWinner.worldDirection);
      }
      for (const { command: item } of contributors) {
        if (reducedMotionValue || item.motionPolicy === 'static') continue;
        const rule = IMPACT_RULES[item.kind];
        const age = currentTick - item.tick;
        const envelope = ((rule.durationTicks - age) / rule.durationTicks) ** 2;
        const intensity = Math.min(
          1,
          rule.peakIntensity * item.impactScaleMultiplier * envelope,
        );
        intensities.set(
          item.participantId,
          Math.max(intensities.get(item.participantId) ?? 0, intensity),
        );
        if (age < animationHoldTicks(item)) animationHolds.add(item.participantId);
        if (item.contactParticipantId !== null && age < ATTACKER_CONTACT_HOLD_TICKS) {
          animationHolds.add(item.contactParticipantId);
        }
      }
    }
    const presentedParticipantIds = new Set([
      ...intensities.keys(),
      ...animationHolds,
    ]);
    if (presentedParticipantIds.size > MAXIMUM_PRESENTED_PARTICIPANTS) {
      throw new RangeError('Arena V2 formal Three character impact表现角色超出6个硬上限。');
    }
    const participants = [...presentedParticipantIds]
      .sort(compareUtf8)
      .map((participantId) => Object.freeze({
        participantId,
        intensity: intensities.get(participantId) ?? 0,
        animationHeld: animationHolds.has(participantId),
      }));
    this.#active.clear();
    for (const target of survivingTargets) this.#active.set(target.participantId, target);
    this.#lastResolvedTick = currentTick;
    return Object.freeze({
      schemaVersion: 1 as const,
      epochId: this.epochId,
      tick: currentTick,
      participants: Object.freeze(participants),
      hitDirections: Object.freeze([...hitDirections]
        .sort(([left], [right]) => compareUtf8(left, right))
        .map(([participantId, direction]) => Object.freeze({
          participantId,
          worldDirection: direction,
        }))),
    });
  }

  clearCharacterImpacts(): void {
    if (this.#disposed) return;
    if (this.#epochOrdinal >= Number.MAX_SAFE_INTEGER) {
      throw new RangeError('Arena V2 formal Three character impact epoch已耗尽。');
    }
    this.#active.clear();
    this.#recent.clear();
    this.#lastCommandTick = null;
    this.#lastResolvedTick = null;
    this.#epochOrdinal += 1;
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      epochId: this.epochId,
      activeSourceEventIds: Object.freeze(
        [...this.#active.values()].map(({ winner }) => winner.command.sourceEventId),
      ),
      activeContributorSourceEventIds: Object.freeze([...this.#active.values()]
        .flatMap(({ contributors }) => contributors)
        .map(({ command: item }) => item.sourceEventId)
        .sort(compareUtf8)),
      activeTargetCount: this.#active.size,
      activeContributorCount: [...this.#active.values()].reduce(
        (total, target) => total + target.contributors.length,
        0,
      ),
      recentSourceEventIds: Object.freeze([...this.#recent.keys()]),
      lastCommandTick: this.#lastCommandTick,
      lastResolvedTick: this.#lastResolvedTick,
      disposed: this.#disposed,
    });
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#active.clear();
    this.#recent.clear();
    this.#lastCommandTick = null;
    this.#lastResolvedTick = null;
    this.#disposed = true;
  }
}

export const ARENA_V2_FORMAL_THREE_CHARACTER_IMPACT_READABILITY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  maximumActiveImpacts: MAXIMUM_ACTIVE_IMPACTS,
  maximumActiveTargets: MAXIMUM_ACTIVE_IMPACTS,
  maximumPresentedParticipants: MAXIMUM_PRESENTED_PARTICIPANTS,
  maximumActiveContributors: MAXIMUM_RECENT_IDENTITIES,
  maximumRecentIdentities: MAXIMUM_RECENT_IDENTITIES,
  hitConfirmDurationTicks: IMPACT_RULES['hit-confirm'].durationTicks,
  surfaceTransferDurationTicks: IMPACT_RULES['surface-transfer'].durationTicks,
  ringOutDurationTicks: IMPACT_RULES['ring-out'].durationTicks,
  hitConfirmAnimationHoldTicks: IMPACT_RULES['hit-confirm'].animationHoldTicks,
  surfaceTransferAnimationHoldTicks: IMPACT_RULES['surface-transfer'].animationHoldTicks,
  ringOutAnimationHoldTicks: IMPACT_RULES['ring-out'].animationHoldTicks,
  authorityTimeSource: 'integer-tick' as const,
  supportsTargetScopedAnimationHold: true as const,
  supportsAttackerContactAnimationHold: true as const,
  attackerContactAnimationHoldTicks: ATTACKER_CONTACT_HOLD_TICKS,
  attackerContactHoldScalesWithImpactStrength: false as const,
  attackerContactHoldAddsReadabilityIntensity: false as const,
  attackerContactHoldUsesPresentationTimeOnly: true as const,
  supportsAuthorityHitDirectionSelection: true as const,
  freezesAuthorityOrAllCharacterAnimation: false as const,
  allocatesParticlesOrTransparentLayers: false as const,
  ownsRuleOrMatchAuthority: false as const,
  usesWallClock: false as const,
  usesRandom: false as const,
  authorityImpactStrengthScaleSupported: true as const,
  authorityImpactStrengthScalesAnimationHoldTicks: true as const,
  heavyImpactAnimationHoldAddsAtMostOneTick: true as const,
  lightImpactNeverExtendsBaseAnimationHold: true as const,
  coalescesSameTargetBeforeGlobalCapacity: true as const,
  sameTargetContributorsPreserveMaximumEnvelopeAndHold: true as const,
  sameTargetWinnerOrder: Object.freeze([
    'impact-kind-priority-desc',
    'tick-desc',
    'impact-scale-multiplier-desc',
    'source-event-id-utf8-asc',
  ] as const),
  globalTargetCapacityOrder: Object.freeze([
    'impact-kind-priority-desc',
    'source-event-id-utf8-asc',
  ] as const),
  terminalDisposalDoesNotAllocateEpoch: true as const,
  validationStatus: 'not-run' as const,
});
