import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createModeResultV3Payload,
  type DeepReadonly,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
  type ArenaMatchModeKindV6,
} from './match-config-v6.js';

export const MATCH_MODE_OBJECTIVE_POLICY_RESOLVER_V1_SCHEMA_VERSION = 1 as const;

export type MatchModeObjectivePolicyViewV1 =
  | Readonly<{
    readonly definitionId: string;
    readonly kind: 'duel';
    readonly timeoutPolicy: 'score-or-draw';
  }>
  | Readonly<{
    readonly definitionId: string;
    readonly kind: 'race';
    readonly finishGateCapabilityId: string;
    readonly validClaimEndPolicy: 'claim-tick';
    readonly sameTickRankPolicy: 'shared-rank-1';
    readonly hardLimitPolicy: 'no-finisher';
  }>
  | Readonly<{
    readonly definitionId: string;
    readonly kind: 'survival';
    readonly terminalPlayerFallCount: 2;
    readonly hardLimitPolicy: 'survival-time-cap';
  }>;

export interface MatchModeObjectivePolicyResolverDefinitionBundleV1 {
  readonly schemaVersion: typeof MATCH_MODE_OBJECTIVE_POLICY_RESOLVER_V1_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly modeKind: ArenaMatchModeKindV6;
  readonly matchPolicyContentHash: string;
  readonly contentHash: string;
  readonly objective: MatchModeObjectivePolicyViewV1;
}

export interface DuelModeObjectiveFactsV1 {
  readonly kind: 'duel';
  readonly tick: number;
  readonly participants: readonly Readonly<{
    readonly participantId: string;
    readonly status: 'active' | 'respawning' | 'eliminated';
    readonly lives: number;
    readonly eliminations: number;
  }>[];
}

export interface RaceModeObjectiveFactsV1 {
  readonly kind: 'race';
  readonly tick: number;
  readonly activeTick: number;
  readonly hardLimitActiveTicks: number;
  readonly finishClaimParticipantIds: readonly string[];
}

export interface SurvivalModeObjectiveFactsV1 {
  readonly kind: 'survival';
  readonly tick: number;
  readonly activeTick: number;
  readonly hardLimitActiveTicks: number;
  readonly playerFell: boolean;
  readonly fallCount: number;
}

export type MatchModeObjectiveFactsV1 =
  | DuelModeObjectiveFactsV1
  | RaceModeObjectiveFactsV1
  | SurvivalModeObjectiveFactsV1;

const BUNDLE_KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'modeKind', 'matchPolicyContentHash', 'contentHash',
  'objective',
]);
const DUEL_OBJECTIVE_KEYS = new Set(['definitionId', 'kind', 'timeoutPolicy']);
const RACE_OBJECTIVE_KEYS = new Set([
  'definitionId', 'kind', 'finishGateCapabilityId', 'validClaimEndPolicy',
  'sameTickRankPolicy', 'hardLimitPolicy',
]);
const SURVIVAL_OBJECTIVE_KEYS = new Set([
  'definitionId', 'kind', 'terminalPlayerFallCount', 'hardLimitPolicy',
]);
const DUEL_FACT_KEYS = new Set(['kind', 'tick', 'participants']);
const DUEL_PARTICIPANT_KEYS = new Set([
  'participantId', 'status', 'lives', 'eliminations',
]);
const RACE_FACT_KEYS = new Set([
  'kind', 'tick', 'activeTick', 'hardLimitActiveTicks', 'finishClaimParticipantIds',
]);
const SURVIVAL_FACT_KEYS = new Set([
  'kind', 'tick', 'activeTick', 'hardLimitActiveTicks', 'playerFell', 'fallCount',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);
const PARTICIPANT_STATUSES: ReadonlySet<unknown> = new Set([
  'active', 'respawning', 'eliminated',
]);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function modeKind(value: unknown, name: string): ArenaMatchModeKindV6 {
  if (!MODE_KINDS.has(value)) throw new RangeError(`${name} 不受支持。`);
  return value as ArenaMatchModeKindV6;
}

function dataHash(value: unknown, name: string): string {
  const hash = assertNonEmptyString(value, name);
  if (!/^[0-9a-f]+$/u.test(hash)) throw new RangeError(`${name} 必须是小写十六进制数据 hash。`);
  return hash;
}

function sortedUniqueStrings(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const result = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name} 不能重复。`);
  return Object.freeze(result.sort(compareText));
}

function cloneObjective(
  value: unknown,
  expectedModeKind: ArenaMatchModeKindV6,
): MatchModeObjectivePolicyViewV1 {
  if (expectedModeKind === 'duel') {
    exactRecord(value, DUEL_OBJECTIVE_KEYS, 'ModeObjectivePolicyResolver objective');
    if (value.kind !== 'duel' || value.timeoutPolicy !== 'score-or-draw') {
      throw new RangeError('Duel Objective Policy语义漂移。');
    }
    return Object.freeze({
      definitionId: assertNonEmptyString(
        value.definitionId,
        'ModeObjectivePolicyResolver objective.definitionId',
      ),
      kind: 'duel',
      timeoutPolicy: 'score-or-draw',
    });
  }
  if (expectedModeKind === 'race') {
    exactRecord(value, RACE_OBJECTIVE_KEYS, 'ModeObjectivePolicyResolver objective');
    if (value.kind !== 'race'
      || value.validClaimEndPolicy !== 'claim-tick'
      || value.sameTickRankPolicy !== 'shared-rank-1'
      || value.hardLimitPolicy !== 'no-finisher') {
      throw new RangeError('Race Objective Policy语义漂移。');
    }
    return Object.freeze({
      definitionId: assertNonEmptyString(
        value.definitionId,
        'ModeObjectivePolicyResolver objective.definitionId',
      ),
      kind: 'race',
      finishGateCapabilityId: assertNonEmptyString(
        value.finishGateCapabilityId,
        'ModeObjectivePolicyResolver objective.finishGateCapabilityId',
      ),
      validClaimEndPolicy: 'claim-tick',
      sameTickRankPolicy: 'shared-rank-1',
      hardLimitPolicy: 'no-finisher',
    });
  }
  exactRecord(value, SURVIVAL_OBJECTIVE_KEYS, 'ModeObjectivePolicyResolver objective');
  if (value.kind !== 'survival'
    || value.terminalPlayerFallCount !== 2
    || value.hardLimitPolicy !== 'survival-time-cap') {
    throw new RangeError('Survival Objective Policy语义漂移。');
  }
  return Object.freeze({
    definitionId: assertNonEmptyString(
      value.definitionId,
      'ModeObjectivePolicyResolver objective.definitionId',
    ),
    kind: 'survival',
    terminalPlayerFallCount: 2,
    hardLimitPolicy: 'survival-time-cap',
  });
}

function cloneBundle(value: unknown): MatchModeObjectivePolicyResolverDefinitionBundleV1 {
  const source = cloneFrozenData(value, 'ModeObjectivePolicyResolver definition bundle');
  exactRecord(source, BUNDLE_KEYS, 'ModeObjectivePolicyResolver definition bundle');
  if (source.schemaVersion !== MATCH_MODE_OBJECTIVE_POLICY_RESOLVER_V1_SCHEMA_VERSION) {
    throw new RangeError(
      `ModeObjectivePolicyResolver schemaVersion 必须是 ${MATCH_MODE_OBJECTIVE_POLICY_RESOLVER_V1_SCHEMA_VERSION}。`,
    );
  }
  const normalizedModeKind = modeKind(
    source.modeKind,
    'ModeObjectivePolicyResolver definition bundle.modeKind',
  );
  return Object.freeze({
    schemaVersion: MATCH_MODE_OBJECTIVE_POLICY_RESOLVER_V1_SCHEMA_VERSION,
    modeDefinitionId: assertNonEmptyString(
      source.modeDefinitionId,
      'ModeObjectivePolicyResolver definition bundle.modeDefinitionId',
    ),
    modeKind: normalizedModeKind,
    matchPolicyContentHash: dataHash(
      source.matchPolicyContentHash,
      'ModeObjectivePolicyResolver definition bundle.matchPolicyContentHash',
    ),
    contentHash: dataHash(
      source.contentHash,
      'ModeObjectivePolicyResolver definition bundle.contentHash',
    ),
    objective: cloneObjective(source.objective, normalizedModeKind),
  });
}

function assertSameIds(actual: readonly string[], expected: readonly string[], name: string): void {
  if (actual.length !== expected.length
    || actual.some((participantId, index) => participantId !== expected[index])) {
    throw new RangeError(`${name}与权威Objective事实不一致。`);
  }
}

export class ModeObjectivePolicyResolverV1 {
  readonly #config: ArenaMatchConfigV6;
  readonly #bundle: MatchModeObjectivePolicyResolverDefinitionBundleV1;
  readonly #participantIds: readonly string[];

  constructor(config: unknown, definitionBundle: unknown) {
    this.#config = createArenaMatchConfigV6(config);
    this.#bundle = cloneBundle(definitionBundle);
    if (this.#bundle.modeDefinitionId !== this.#config.modeDefinitionId
      || this.#bundle.modeKind !== this.#config.modeKind
      || this.#bundle.matchPolicyContentHash !== this.#config.modePolicyContentHash) {
      throw new RangeError(
        'ModeObjectivePolicyResolver 的 Mode/Policy identity 与 MatchConfig V6 不一致。',
      );
    }
    this.#participantIds = Object.freeze(
      this.#config.participantAssignments
        .map(({ participantId }) => participantId)
        .sort(compareText),
    );
  }

  get definitionBundle(): MatchModeObjectivePolicyResolverDefinitionBundleV1 {
    return this.#bundle;
  }

  assertTerminalObjective(
    factsValue: unknown,
    resultValue: unknown,
  ): DeepReadonly<ModeResultV3Payload> {
    const facts = cloneFrozenData(factsValue, 'ModeObjectivePolicyResolver facts');
    const result = createModeResultV3Payload(resultValue);
    if (result.kind !== this.#bundle.modeKind) {
      throw new RangeError('ModeObjectivePolicyResolver result kind与本局Mode不一致。');
    }
    if (result.kind === 'duel') {
      exactRecord(facts, DUEL_FACT_KEYS, 'Duel Objective facts');
      if (facts.kind !== 'duel') throw new RangeError('Duel Objective facts.kind漂移。');
      const tick = assertIntegerAtLeast(facts.tick, 0, 'Duel Objective facts.tick');
      if (result.endedAtTick !== tick) throw new RangeError('Duel Objective终局tick漂移。');
      if (!Array.isArray(facts.participants) || facts.participants.length !== 2) {
        throw new RangeError('Duel Objective facts必须精确包含两名participant。');
      }
      const participants = facts.participants.map((entry, index) => {
        const name = `Duel Objective facts.participants[${index}]`;
        exactRecord(entry, DUEL_PARTICIPANT_KEYS, name);
        if (!PARTICIPANT_STATUSES.has(entry.status)) {
          throw new RangeError(`${name}.status不受支持。`);
        }
        return Object.freeze({
          participantId: assertNonEmptyString(entry.participantId, `${name}.participantId`),
          status: entry.status as DuelModeObjectiveFactsV1['participants'][number]['status'],
          lives: assertIntegerAtLeast(entry.lives, 0, `${name}.lives`),
          eliminations: assertIntegerAtLeast(entry.eliminations, 0, `${name}.eliminations`),
        });
      }).sort((left, right) => compareText(left.participantId, right.participantId));
      assertSameIds(
        participants.map(({ participantId }) => participantId),
        this.#participantIds,
        'Duel Objective participant集合',
      );
      const eliminated = participants.filter(({ status }) => status === 'eliminated');
      let expectedReason: typeof result.reason;
      let expectedWinnerIds: readonly string[];
      if (eliminated.length === 2) {
        expectedReason = 'simultaneous-elimination';
        expectedWinnerIds = Object.freeze([]);
      } else if (eliminated.length === 1) {
        expectedReason = 'last-participant-standing';
        expectedWinnerIds = Object.freeze(participants
          .filter(({ participantId }) => participantId !== eliminated[0]!.participantId)
          .map(({ participantId }) => participantId));
      } else {
        const ranked = [...participants].sort((left, right) => (
          right.lives - left.lives
          || right.eliminations - left.eliminations
          || compareText(left.participantId, right.participantId)
        ));
        const tied = ranked[0]!.lives === ranked[1]!.lives
          && ranked[0]!.eliminations === ranked[1]!.eliminations;
        expectedReason = tied ? 'timeout-draw' : 'timeout-score';
        expectedWinnerIds = tied ? Object.freeze([]) : Object.freeze([ranked[0]!.participantId]);
      }
      if (result.reason !== expectedReason) {
        throw new RangeError('Duel Result reason与独立参与者Objective事实不一致。');
      }
      assertSameIds(result.winnerParticipantIds, expectedWinnerIds, 'Duel Objective winner');
      return result;
    }
    if (result.kind === 'race') {
      exactRecord(facts, RACE_FACT_KEYS, 'Race Objective facts');
      if (facts.kind !== 'race') throw new RangeError('Race Objective facts.kind漂移。');
      const tick = assertIntegerAtLeast(facts.tick, 0, 'Race Objective facts.tick');
      const activeTick = assertIntegerAtLeast(
        facts.activeTick,
        0,
        'Race Objective facts.activeTick',
      );
      const hardLimitActiveTicks = assertIntegerAtLeast(
        facts.hardLimitActiveTicks,
        1,
        'Race Objective facts.hardLimitActiveTicks',
      );
      const finishClaimParticipantIds = sortedUniqueStrings(
        facts.finishClaimParticipantIds,
        'Race Objective facts.finishClaimParticipantIds',
      );
      if (finishClaimParticipantIds.some(
        (participantId) => !this.#participantIds.includes(participantId),
      )) {
        throw new RangeError('Race Objective finish claim只能引用本局participant。');
      }
      if (result.endedAtTick !== tick) throw new RangeError('Race Objective终局tick漂移。');
      if (finishClaimParticipantIds.length > 0) {
        if (result.reason !== 'finish-claimed') {
          throw new RangeError('Race有效终点声明必须在声明tick结束比赛。');
        }
        assertSameIds(
          result.winnerParticipantIds,
          finishClaimParticipantIds,
          'Race Objective finish winners',
        );
      } else if (activeTick < hardLimitActiveTicks || result.reason !== 'no-finisher') {
        throw new RangeError('Race无终点声明只能由本局显式hard limit产生no-finisher。');
      }
      return result;
    }
    exactRecord(facts, SURVIVAL_FACT_KEYS, 'Survival Objective facts');
    if (facts.kind !== 'survival') throw new RangeError('Survival Objective facts.kind漂移。');
    const tick = assertIntegerAtLeast(facts.tick, 0, 'Survival Objective facts.tick');
    const activeTick = assertIntegerAtLeast(
      facts.activeTick,
      0,
      'Survival Objective facts.activeTick',
    );
    const hardLimitActiveTicks = assertIntegerAtLeast(
      facts.hardLimitActiveTicks,
      1,
      'Survival Objective facts.hardLimitActiveTicks',
    );
    const fallCount = assertIntegerAtLeast(facts.fallCount, 0, 'Survival Objective facts.fallCount');
    if (fallCount > 2) {
      throw new RangeError('Survival Objective facts.fallCount不能超过终局上限2。');
    }
    if (typeof facts.playerFell !== 'boolean') {
      throw new TypeError('Survival Objective facts.playerFell必须是布尔值。');
    }
    if (result.endedAtTick !== tick
      || result.survivedTicks !== activeTick
      || result.fallCount !== fallCount) {
      throw new RangeError('Survival Result与当前tick Objective事实不一致。');
    }
    if (fallCount === 2) {
      if (!facts.playerFell || result.reason !== 'terminal-player-fall') {
        throw new RangeError('Survival第二次玩家掉落必须产生terminal-player-fall。');
      }
    } else if (activeTick < hardLimitActiveTicks || result.reason !== 'survival-time-cap') {
      throw new RangeError('Survival未达第二次掉落只能由本局显式hard limit结束。');
    }
    return result;
  }
}
