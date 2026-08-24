import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
} from './match-config-v6.js';
import {
  ModePolicyResolver,
  type MatchModeParticipantFallCommandV1,
} from './mode-policy-resolver.js';

export interface DuelModeProjectionV1 {
  readonly kind: 'duel';
  readonly suddenDeath: boolean;
}

export interface DuelModeResultV3Candidate {
  readonly kind: 'duel';
  readonly winnerParticipantIds: readonly string[];
  readonly isDraw: boolean;
  readonly reason:
    | 'last-participant-standing'
    | 'simultaneous-elimination'
    | 'timeout-score'
    | 'timeout-draw';
  readonly endedAtTick: number;
}

const PHASE_KEYS = new Set(['phase']);
const RESULT_KEYS = new Set(['winnerId', 'reason', 'isDraw', 'endedAtTick']);
const DUEL_REASONS: ReadonlySet<unknown> = new Set([
  'last-participant-standing',
  'simultaneous-elimination',
  'timeout-score',
  'timeout-draw',
]);

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

export class DuelModeAdapterV6 {
  readonly #config: ArenaMatchConfigV6;
  readonly #resolver: ModePolicyResolver;
  readonly #definitionBundleContentHash: string;

  constructor(config: unknown, definitionBundle: unknown) {
    this.#config = createArenaMatchConfigV6(config);
    if (this.#config.modeKind !== 'duel') {
      throw new RangeError('DuelModeAdapterV6 只接受显式 Duel MatchConfig V6。');
    }
    this.#resolver = new ModePolicyResolver(this.#config, definitionBundle);
    this.#definitionBundleContentHash = createDeterministicDataHash(
      this.#resolver.definitionBundle,
      'DuelModeAdapterV6 normalized definition bundle',
    );
  }

  get definitionBundleContentHash(): string {
    return this.#definitionBundleContentHash;
  }

  mapV5Phase(value: unknown): DuelModeProjectionV1 {
    const source = cloneFrozenData(value, 'DuelModeAdapterV6 V5 phase');
    exactRecord(source, PHASE_KEYS, 'DuelModeAdapterV6 V5 phase');
    if (
      source.phase !== 'preparing'
      && source.phase !== 'running'
      && source.phase !== 'sudden-death'
    ) throw new RangeError('DuelModeAdapterV6 只映射 V5 非终局 phase。');
    return Object.freeze({
      kind: 'duel',
      suddenDeath: source.phase === 'sudden-death',
    });
  }

  mapV5ParticipantFall(participantId: unknown, tick: unknown): MatchModeParticipantFallCommandV1 {
    return this.#resolver.resolveParticipantFall(participantId, tick);
  }

  mapV5Result(value: unknown): DuelModeResultV3Candidate {
    const source = cloneFrozenData(value, 'DuelModeAdapterV6 V5 result');
    exactRecord(source, RESULT_KEYS, 'DuelModeAdapterV6 V5 result');
    const winnerId = source.winnerId === null
      ? null
      : assertNonEmptyString(source.winnerId, 'DuelModeAdapterV6 V5 result.winnerId');
    if (winnerId !== null && !this.#config.participantAssignments.some(
      ({ participantId }) => participantId === winnerId,
    )) throw new RangeError('DuelModeAdapterV6 V5 winner 不属于当局 participant。');
    if (typeof source.isDraw !== 'boolean') {
      throw new TypeError('DuelModeAdapterV6 V5 result.isDraw 必须是布尔值。');
    }
    if ((winnerId === null) !== source.isDraw) {
      throw new RangeError('DuelModeAdapterV6 V5 winner/isDraw 不一致。');
    }
    if (!DUEL_REASONS.has(source.reason)) {
      throw new RangeError('DuelModeAdapterV6 V5 result.reason 不受支持。');
    }
    const reason = source.reason as DuelModeResultV3Candidate['reason'];
    if ((reason === 'simultaneous-elimination' || reason === 'timeout-draw') !== source.isDraw) {
      throw new RangeError('DuelModeAdapterV6 V5 reason/draw 不一致。');
    }
    return Object.freeze({
      kind: 'duel',
      winnerParticipantIds: winnerId === null ? Object.freeze([]) : Object.freeze([winnerId]),
      isDraw: source.isDraw,
      reason,
      endedAtTick: assertIntegerAtLeast(
        source.endedAtTick,
        0,
        'DuelModeAdapterV6 V5 result.endedAtTick',
      ),
    });
  }
}
