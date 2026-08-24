import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createModeResultV3Payload,
  type DeepReadonly,
  type ModeResultV3Payload,
  type RaceModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
  type ArenaMatchModeKindV6,
} from './match-config-v6.js';

export const MATCH_MODE_RESULT_POLICY_RESOLVER_V1_SCHEMA_VERSION = 1 as const;

export type MatchModeResultProjectionPolicyV1 =
  | 'winner-ids-draw'
  | 'finish-then-progress-with-ties'
  | 'ticks-stage-falls';

export interface MatchModeResultPolicyViewV1 {
  readonly definitionId: string;
  readonly resultKind: ArenaMatchModeKindV6;
  readonly allowedReasons: readonly string[];
  readonly projectionPolicy: MatchModeResultProjectionPolicyV1;
}

export interface MatchModeResultPolicyResolverDefinitionBundleV1 {
  readonly schemaVersion: typeof MATCH_MODE_RESULT_POLICY_RESOLVER_V1_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly modeKind: ArenaMatchModeKindV6;
  readonly contentHash: string;
  readonly result: MatchModeResultPolicyViewV1;
}

const BUNDLE_KEYS = new Set([
  'schemaVersion',
  'modeDefinitionId',
  'modeKind',
  'contentHash',
  'result',
]);
const RESULT_KEYS = new Set([
  'definitionId',
  'resultKind',
  'allowedReasons',
  'projectionPolicy',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);
const PROJECTION_BY_MODE = Object.freeze({
  duel: 'winner-ids-draw',
  race: 'finish-then-progress-with-ties',
  survival: 'ticks-stage-falls',
} as const);
const REASONS_BY_MODE: Readonly<Record<ArenaMatchModeKindV6, readonly string[]>> = Object.freeze({
  duel: Object.freeze([
    'last-participant-standing',
    'simultaneous-elimination',
    'timeout-draw',
    'timeout-score',
  ]),
  race: Object.freeze(['finish-claimed', 'no-finisher']),
  survival: Object.freeze(['survival-time-cap', 'terminal-player-fall']),
});

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

function assertSameOrderedValues(
  actual: readonly string[],
  expected: readonly string[],
  name: string,
): void {
  if (actual.length !== expected.length
    || actual.some((entry, index) => entry !== expected[index])) {
    throw new RangeError(`${name}与当前Mode结果合同不一致。`);
  }
}

function cloneBundle(value: unknown): MatchModeResultPolicyResolverDefinitionBundleV1 {
  const source = cloneFrozenData(value, 'ModeResultPolicyResolver definition bundle');
  exactRecord(source, BUNDLE_KEYS, 'ModeResultPolicyResolver definition bundle');
  if (source.schemaVersion !== MATCH_MODE_RESULT_POLICY_RESOLVER_V1_SCHEMA_VERSION) {
    throw new RangeError(
      `ModeResultPolicyResolver schemaVersion 必须是 ${MATCH_MODE_RESULT_POLICY_RESOLVER_V1_SCHEMA_VERSION}。`,
    );
  }
  const normalizedModeKind = modeKind(
    source.modeKind,
    'ModeResultPolicyResolver definition bundle.modeKind',
  );
  exactRecord(source.result, RESULT_KEYS, 'ModeResultPolicyResolver result');
  const resultKind = modeKind(
    source.result.resultKind,
    'ModeResultPolicyResolver result.resultKind',
  );
  if (resultKind !== normalizedModeKind) {
    throw new RangeError('ModeResultPolicyResolver resultKind与modeKind不一致。');
  }
  const projectionPolicy = PROJECTION_BY_MODE[normalizedModeKind];
  if (source.result.projectionPolicy !== projectionPolicy) {
    throw new RangeError('ModeResultPolicyResolver projectionPolicy与Mode不一致。');
  }
  const allowedReasons = cloneFrozenStringSet(
    source.result.allowedReasons as readonly unknown[],
    'ModeResultPolicyResolver result.allowedReasons',
  );
  assertSameOrderedValues(
    allowedReasons,
    REASONS_BY_MODE[normalizedModeKind],
    'ModeResultPolicyResolver result.allowedReasons',
  );
  return Object.freeze({
    schemaVersion: MATCH_MODE_RESULT_POLICY_RESOLVER_V1_SCHEMA_VERSION,
    modeDefinitionId: assertNonEmptyString(
      source.modeDefinitionId,
      'ModeResultPolicyResolver definition bundle.modeDefinitionId',
    ),
    modeKind: normalizedModeKind,
    contentHash: dataHash(
      source.contentHash,
      'ModeResultPolicyResolver definition bundle.contentHash',
    ),
    result: Object.freeze({
      definitionId: assertNonEmptyString(
        source.result.definitionId,
        'ModeResultPolicyResolver result.definitionId',
      ),
      resultKind,
      allowedReasons,
      projectionPolicy,
    }),
  });
}

function assertRaceProjection(
  result: DeepReadonly<RaceModeResultV3Payload>,
  participantIds: readonly string[],
): void {
  const resultParticipantIds = result.rankings.map(({ participantId }) => participantId).sort(
    compareText,
  );
  if (resultParticipantIds.length !== participantIds.length
    || resultParticipantIds.some((participantId, index) => participantId !== participantIds[index])) {
    throw new RangeError('Race Result rankings必须精确覆盖本局participant。');
  }
  const finishers = result.rankings.filter(({ finishTick }) => finishTick !== null);
  if (finishers.some(({ rank, finishTick }) => (
    rank !== 1 || finishTick !== result.endedAtTick
  ))) {
    throw new RangeError('Race finish-claimed必须把本终局tick的finishers投影为共享rank 1。');
  }
  const unfinished = result.rankings
    .filter(({ finishTick }) => finishTick === null)
    .sort((left, right) => (
      right.progressOrdinal - left.progressOrdinal
      || compareText(left.participantId, right.participantId)
    ));
  let previousProgress: number | null = null;
  let expectedRank = finishers.length + 1;
  for (let index = 0; index < unfinished.length; index += 1) {
    const ranking = unfinished[index]!;
    if (previousProgress !== null && ranking.progressOrdinal !== previousProgress) {
      expectedRank = finishers.length + index + 1;
    }
    if (ranking.rank !== expectedRank) {
      throw new RangeError('Race Result未按finish优先、progress降序与同进度并列投影。');
    }
    previousProgress = ranking.progressOrdinal;
  }
}

export class ModeResultPolicyResolverV1 {
  readonly #config: ArenaMatchConfigV6;
  readonly #bundle: MatchModeResultPolicyResolverDefinitionBundleV1;
  readonly #participantIds: readonly string[];

  constructor(config: unknown, definitionBundle: unknown) {
    this.#config = createArenaMatchConfigV6(config);
    this.#bundle = cloneBundle(definitionBundle);
    if (
      this.#bundle.modeDefinitionId !== this.#config.modeDefinitionId
      || this.#bundle.modeKind !== this.#config.modeKind
      || this.#bundle.contentHash !== this.#config.modePolicyContentHash
    ) {
      throw new RangeError(
        'ModeResultPolicyResolver 的 Mode/Policy identity 与 MatchConfig V6 不一致。',
      );
    }
    this.#participantIds = Object.freeze(
      this.#config.participantAssignments
        .map(({ participantId }) => participantId)
        .sort(compareText),
    );
  }

  get definitionBundle(): MatchModeResultPolicyResolverDefinitionBundleV1 {
    return this.#bundle;
  }

  assertResult(value: unknown, terminalTick: unknown): DeepReadonly<ModeResultV3Payload> {
    const result = createModeResultV3Payload(value);
    const expectedTerminalTick = assertIntegerAtLeast(
      terminalTick,
      0,
      'ModeResultPolicyResolver terminalTick',
    );
    if (result.endedAtTick !== expectedTerminalTick) {
      throw new RangeError('ModeResult endedAtTick必须等于当前权威终局tick。');
    }
    if (result.kind !== this.#bundle.modeKind
      || !this.#bundle.result.allowedReasons.includes(result.reason)) {
      throw new RangeError('ModeResult与本局resolved Result Policy不一致。');
    }
    if (result.kind === 'duel') {
      if (result.winnerParticipantIds.some((participantId) => (
        !this.#participantIds.includes(participantId)
      ))) throw new RangeError('Duel Result winner不属于本局participant。');
      return result;
    }
    if (result.kind === 'race') {
      assertRaceProjection(result, this.#participantIds);
      return result;
    }
    const players = this.#config.participantAssignments.filter(
      ({ modeRole }) => modeRole === 'player',
    );
    if (players.length !== 1 || result.playerParticipantId !== players[0]!.participantId) {
      throw new RangeError('Survival Result player必须是本局唯一player participant。');
    }
    if (result.reason === 'survival-time-cap' && result.fallCount >= 2) {
      throw new RangeError('Survival time-cap不能覆盖已经达到第二次掉落的终局。');
    }
    return result;
  }
}
