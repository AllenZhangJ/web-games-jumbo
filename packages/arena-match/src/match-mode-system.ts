import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
  type ArenaMatchModeKindV6,
} from './match-config-v6.js';
import {
  MATCH_MODE_FALL_DISPOSITION,
  ModePolicyResolver,
  type MatchModeParticipantFallCommandV1,
  type MatchModePolicyResolverDefinitionBundleV1,
} from './mode-policy-resolver.js';

export const MATCH_MODE_SYSTEM_STATE = Object.freeze({
  CREATED: 'created',
  ACTIVE: 'active',
  PAUSED: 'paused',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type MatchModeSystemState =
  typeof MATCH_MODE_SYSTEM_STATE[keyof typeof MATCH_MODE_SYSTEM_STATE];

export interface MatchModeObjectiveFallCountV1 {
  readonly participantId: string;
  readonly count: number;
}

export interface MatchModeStateSnapshotV1 {
  readonly schemaVersion: 1;
  readonly modeDefinitionId: string;
  readonly modeKind: ArenaMatchModeKindV6;
  readonly revision: number;
  readonly lastProcessedTick: number;
  readonly objectiveFallCounts: readonly MatchModeObjectiveFallCountV1[];
}

export interface MatchModeReadonlyProjectionV1 {
  readonly schemaVersion: 1;
  readonly modeDefinitionId: string;
  readonly revision: number;
  readonly state: Readonly<{
    readonly kind: ArenaMatchModeKindV6;
    readonly objectiveFallCounts: readonly MatchModeObjectiveFallCountV1[];
  }>;
}

export interface MatchModeTickFactsV1 {
  readonly tick: number;
  readonly participantFalls: readonly string[];
}

export interface MatchModeTickResolutionV1 {
  readonly tick: number;
  readonly commands: readonly MatchModeParticipantFallCommandV1[];
  readonly state: MatchModeStateSnapshotV1;
  readonly projection: MatchModeReadonlyProjectionV1;
}

const FACT_KEYS = new Set(['tick', 'participantFalls']);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function cloneFallCounts(
  counts: ReadonlyMap<string, number>,
): readonly MatchModeObjectiveFallCountV1[] {
  return Object.freeze([...counts.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([participantId, count]) => Object.freeze({ participantId, count })));
}

export class MatchModeSystem {
  readonly #config: ArenaMatchConfigV6;
  readonly #resolver: ModePolicyResolver;
  readonly #objectiveFallCounts = new Map<string, number>();
  #state: MatchModeSystemState = MATCH_MODE_SYSTEM_STATE.CREATED;
  #revision = 0;
  #lastProcessedTick = -1;
  #processing = false;
  #reentryAttempted = false;

  constructor(config: unknown, definitionBundle: unknown) {
    this.#config = createArenaMatchConfigV6(config);
    this.#resolver = new ModePolicyResolver(this.#config, definitionBundle);
  }

  get state(): MatchModeSystemState {
    return this.#state;
  }

  get definitionBundle(): MatchModePolicyResolverDefinitionBundleV1 {
    return this.#resolver.definitionBundle;
  }

  #assertUsable(): void {
    if (this.#state === MATCH_MODE_SYSTEM_STATE.DESTROYED) {
      throw new Error('MatchModeSystem 已销毁。');
    }
    if (this.#state === MATCH_MODE_SYSTEM_STATE.FAILED) {
      throw new Error('MatchModeSystem 已失败关闭。');
    }
  }

  #assertLifecycleIdle(operation: string): void {
    if (this.#processing) {
      this.#reentryAttempted = true;
      throw new Error(`${operation} 不能在 MatchModeSystem tick 事务期间重入。`);
    }
  }

  start(): void {
    this.#assertLifecycleIdle('start');
    this.#assertUsable();
    if (this.#state !== MATCH_MODE_SYSTEM_STATE.CREATED) {
      throw new Error('MatchModeSystem 只能从 created 启动。');
    }
    this.#state = MATCH_MODE_SYSTEM_STATE.ACTIVE;
  }

  pause(): void {
    this.#assertLifecycleIdle('pause');
    this.#assertUsable();
    if (this.#state !== MATCH_MODE_SYSTEM_STATE.ACTIVE) {
      throw new Error('MatchModeSystem 只能从 active 暂停。');
    }
    this.#state = MATCH_MODE_SYSTEM_STATE.PAUSED;
  }

  resume(): void {
    this.#assertLifecycleIdle('resume');
    this.#assertUsable();
    if (this.#state !== MATCH_MODE_SYSTEM_STATE.PAUSED) {
      throw new Error('MatchModeSystem 只能从 paused 恢复。');
    }
    this.#state = MATCH_MODE_SYSTEM_STATE.ACTIVE;
  }

  getStateSnapshot(): MatchModeStateSnapshotV1 {
    this.#assertUsable();
    return Object.freeze({
      schemaVersion: 1,
      modeDefinitionId: this.#config.modeDefinitionId,
      modeKind: this.#config.modeKind,
      revision: this.#revision,
      lastProcessedTick: this.#lastProcessedTick,
      objectiveFallCounts: cloneFallCounts(this.#objectiveFallCounts),
    });
  }

  getReadonlyProjection(): MatchModeReadonlyProjectionV1 {
    this.#assertUsable();
    return Object.freeze({
      schemaVersion: 1,
      modeDefinitionId: this.#config.modeDefinitionId,
      revision: this.#revision,
      state: Object.freeze({
        kind: this.#config.modeKind,
        objectiveFallCounts: cloneFallCounts(this.#objectiveFallCounts),
      }),
    });
  }

  processTick(value: unknown): MatchModeTickResolutionV1 {
    this.#assertUsable();
    if (this.#state !== MATCH_MODE_SYSTEM_STATE.ACTIVE) {
      throw new Error('MatchModeSystem 只在 active 状态接受 tick。');
    }
    if (this.#processing) {
      this.#reentryAttempted = true;
      throw new Error('MatchModeSystem tick 不可重入。');
    }
    this.#processing = true;
    this.#reentryAttempted = false;
    try {
      const source = cloneFrozenData(value, 'MatchModeSystem tick facts');
      assertKnownKeys(source, FACT_KEYS, 'MatchModeSystem tick facts');
      for (const key of FACT_KEYS) {
        if (!Object.hasOwn(source, key)) {
          throw new TypeError(`MatchModeSystem tick facts.${key} 为必填字段。`);
        }
      }
      const tick = assertIntegerAtLeast(source.tick, 0, 'MatchModeSystem tick');
      if (tick !== this.#lastProcessedTick + 1) {
        throw new RangeError('MatchModeSystem tick 必须从 0 开始并严格递增 1。');
      }
      if (!Array.isArray(source.participantFalls)) {
        throw new TypeError('MatchModeSystem participantFalls 必须是数组。');
      }
      if (source.participantFalls.length > this.#config.participantAssignments.length) {
        throw new RangeError('MatchModeSystem participantFalls 超过 participant 上限。');
      }
      const participantFalls = source.participantFalls.map((entry, index) => (
        assertNonEmptyString(entry, `MatchModeSystem participantFalls[${index}]`)
      )).sort(compareText);
      if (new Set(participantFalls).size !== participantFalls.length) {
        throw new RangeError('MatchModeSystem 同 tick participant fall 不能重复。');
      }
      const commands = participantFalls.map((participantId) => (
        this.#resolver.resolveParticipantFall(participantId, tick)
      ));
      const nextFallCounts = new Map(this.#objectiveFallCounts);
      for (const command of commands) {
        if (command.fallDisposition !== MATCH_MODE_FALL_DISPOSITION.COUNT_FOR_OBJECTIVE) continue;
        const next = (nextFallCounts.get(command.participantId) ?? 0) + 1;
        if (!Number.isSafeInteger(next)) {
          throw new RangeError(`participant ${command.participantId} fall count 超出安全整数。`);
        }
        nextFallCounts.set(command.participantId, next);
      }
      if (this.#reentryAttempted) throw new Error('MatchModeSystem tick 期间发生重入。');

      const modeChanged = [...nextFallCounts.entries()].some(
        ([participantId, count]) => this.#objectiveFallCounts.get(participantId) !== count,
      );
      this.#objectiveFallCounts.clear();
      for (const [participantId, count] of nextFallCounts) {
        this.#objectiveFallCounts.set(participantId, count);
      }
      this.#lastProcessedTick = tick;
      if (modeChanged) this.#revision += 1;
      return Object.freeze({
        tick,
        commands: Object.freeze(commands),
        state: this.getStateSnapshot(),
        projection: this.getReadonlyProjection(),
      });
    } catch (error) {
      if (this.#reentryAttempted) this.#state = MATCH_MODE_SYSTEM_STATE.FAILED;
      throw error;
    } finally {
      this.#processing = false;
    }
  }

  destroy(): void {
    if (this.#state === MATCH_MODE_SYSTEM_STATE.DESTROYED) return;
    if (this.#processing) {
      this.#reentryAttempted = true;
      throw new Error('MatchModeSystem destroy 不可在 tick 期间重入。');
    }
    this.#objectiveFallCounts.clear();
    this.#state = MATCH_MODE_SYSTEM_STATE.DESTROYED;
  }
}
