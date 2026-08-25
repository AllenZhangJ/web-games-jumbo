import {
  assertKnownKeys,
  normalizeInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2InformationModeSessionHostCandidateV1,
  type ArenaV2InformationModeSessionHostStepOutcomeCandidateV1,
} from './arena-v2-information-mode-session-host-candidate-v1.js';
import {
  ArenaV2InformationHostCounterplayBotPortCandidateV1,
} from './arena-v2-information-host-counterplay-bot-port-candidate-v1.js';
import {
  projectArenaV2LocalCounterplayBotCurrentFactsCandidateV1,
  type ArenaV2LocalCounterplayBotCurrentFactsCandidateV1,
} from './arena-v2-local-counterplay-bot-current-facts-candidate-v1.js';
import {
  rankArenaV2CurrentWeaponThreatOpponentsCandidateV1,
  type ArenaV2CurrentWeaponThreatOpponentCandidateV1,
} from './arena-v2-current-weapon-threat-opponent-selector-candidate-v1.js';

export const ARENA_V2_ADAPTIVE_COUNTERPLAY_THREAT_SWITCH_SCORE_DELTA_CANDIDATE_V1 = 12;

export interface ArenaV2InformationHostAdaptiveCounterplayBotOwnerOptionsCandidateV1 {
  readonly host: ArenaV2InformationModeSessionHostCandidateV1;
}

export type ArenaV2AdaptiveCounterplayBotStrategyCandidateV1 =
  | 'weapon-counterplay'
  | 'current-route-fallback'
  | 'neutral-fallback';

export interface ArenaV2InformationHostAdaptiveCounterplayBotStepOutcomeCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly generation: number;
  readonly strategy: ArenaV2AdaptiveCounterplayBotStrategyCandidateV1;
  readonly selectedThreat: ArenaV2CurrentWeaponThreatOpponentCandidateV1 | null;
  readonly input: ArenaInputFrame;
  readonly hostOutcome: ArenaV2InformationModeSessionHostStepOutcomeCandidateV1;
  readonly threatSwitchCount: number;
}

export interface ArenaV2InformationHostAdaptiveCounterplayBotSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly generation: number;
  readonly localParticipantId: string;
  readonly destroyed: boolean;
  readonly currentOpponentParticipantId: string | null;
  readonly threatSwitchCount: number;
}

const OPTION_KEYS = new Set(['host']);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function selectedThreat(
  ranked: readonly ArenaV2CurrentWeaponThreatOpponentCandidateV1[],
  currentOpponentParticipantId: string | null,
): ArenaV2CurrentWeaponThreatOpponentCandidateV1 | null {
  const highest = ranked[0] ?? null;
  if (highest === null || currentOpponentParticipantId === null) return highest;
  const current = ranked.find(({ participantId }) => (
    participantId === currentOpponentParticipantId
  ));
  if (current === undefined || current.participantId === highest.participantId) return highest;
  return highest.score >= current.score
    + ARENA_V2_ADAPTIVE_COUNTERPLAY_THREAT_SWITCH_SCORE_DELTA_CANDIDATE_V1
    ? highest
    : current;
}

function routeFallbackInput(
  facts: ArenaV2LocalCounterplayBotCurrentFactsCandidateV1,
): Readonly<{
  readonly strategy: 'current-route-fallback' | 'neutral-fallback';
  readonly input: ArenaInputFrame;
}> {
  const target = facts.currentLegalRouteTargets[0] ?? null;
  let moveX = 0;
  let moveZ = 0;
  let jumpPressed = false;
  if (target !== null) {
    const dx = target.position.x - facts.selfPosition.x;
    const dz = target.position.z - facts.selfPosition.z;
    const length = Math.hypot(dx, dz);
    if (length > Number.EPSILON) {
      moveX = dx / length;
      moveZ = dz / length;
    }
    jumpPressed = facts.selfJumpAvailable && target.traversal === 'jump';
  }
  return Object.freeze({
    strategy: target === null ? 'neutral-fallback' as const : 'current-route-fallback' as const,
    input: normalizeInputFrame({
      tick: facts.tick,
      participantId: facts.participantId,
      moveX,
      moveZ,
      primaryPressed: false,
      primaryHeld: false,
      jumpPressed,
      jumpHeld: jumpPressed,
      slamPressed: false,
    }, { expectedTick: facts.tick, participantIds: [facts.participantId] }),
  });
}

/**
 * Explicit adaptive owner for development sessions. It can replace its
 * candidate-only counterplay controller when a materially stronger current
 * armed threat appears. Without an armed threat it advances the match using
 * only the highest-priority current legal route, or neutral input when no
 * current route is observable.
 */
export class ArenaV2InformationHostAdaptiveCounterplayBotOwnerCandidateV1 {
  readonly #host: ArenaV2InformationModeSessionHostCandidateV1;
  readonly #generation: number;
  readonly #localParticipantId: string;
  #port: ArenaV2InformationHostCounterplayBotPortCandidateV1 | null = null;
  #currentOpponentParticipantId: string | null = null;
  #threatSwitchCount = 0;
  #destroying = false;
  #destroyed = false;

  constructor(options: ArenaV2InformationHostAdaptiveCounterplayBotOwnerOptionsCandidateV1);
  constructor(value: unknown) {
    exactRecord(value, OPTION_KEYS, 'Arena V2自适应反制Bot Owner options');
    if (!(value.host instanceof ArenaV2InformationModeSessionHostCandidateV1)) {
      throw new TypeError('Arena V2自适应反制Bot Owner要求真实隔离Host实例。');
    }
    const context = value.host.getMatchInputContext();
    if (context.state !== 'running') {
      throw new Error('Arena V2自适应反制Bot Owner只能绑定running对局。');
    }
    this.#host = value.host;
    this.#generation = context.generation;
    this.#localParticipantId = context.localParticipantId;
  }

  #releasePort(): void {
    if (this.#port === null) return;
    const port = this.#port;
    port.destroy();
    if (this.#port === port) this.#port = null;
  }

  stepFromAuthorityCandidateV1():
  ArenaV2InformationHostAdaptiveCounterplayBotStepOutcomeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena V2自适应反制Bot Owner已销毁。');
    const context = this.#host.getMatchInputContext();
    if (
      context.state !== 'running'
      || context.generation !== this.#generation
      || context.localParticipantId !== this.#localParticipantId
    ) {
      return this.#fail(
        new RangeError('Arena V2自适应反制Bot Owner宿主generation或状态漂移。'),
      );
    }
    try {
      const scene = this.#host.getMatchSceneReadFrameCandidateV1();
      const facts = projectArenaV2LocalCounterplayBotCurrentFactsCandidateV1(scene);
      const threat = selectedThreat(
        rankArenaV2CurrentWeaponThreatOpponentsCandidateV1(scene),
        this.#currentOpponentParticipantId,
      );
      let strategy: ArenaV2AdaptiveCounterplayBotStrategyCandidateV1;
      let input: ArenaInputFrame;
      let hostOutcome: ArenaV2InformationModeSessionHostStepOutcomeCandidateV1;
      if (threat !== null) {
        if (threat.participantId !== this.#currentOpponentParticipantId || this.#port === null) {
          const switched = this.#currentOpponentParticipantId !== null;
          this.#releasePort();
          const nextPort = new ArenaV2InformationHostCounterplayBotPortCandidateV1({
            host: this.#host,
            opponentParticipantId: threat.participantId,
          });
          this.#port = nextPort;
          this.#currentOpponentParticipantId = threat.participantId;
          if (switched) this.#threatSwitchCount += 1;
        }
        const outcome = this.#port.stepFromAuthorityCandidateV1();
        strategy = 'weapon-counterplay';
        input = outcome.input;
        hostOutcome = outcome.hostOutcome;
      } else {
        this.#releasePort();
        this.#currentOpponentParticipantId = null;
        const fallback = routeFallbackInput(facts);
        strategy = fallback.strategy;
        input = fallback.input;
        hostOutcome = this.#host.stepMatch(input);
      }
      if (
        hostOutcome.snapshot.generation !== this.#generation
        || hostOutcome.snapshot.state !== 'match-running'
      ) {
        throw new RangeError('Arena V2自适应反制Bot Owner宿主step结果身份漂移。');
      }
      return Object.freeze({
        schemaVersion: 1 as const,
        status: 'production-unreachable' as const,
        generation: this.#generation,
        strategy,
        selectedThreat: threat,
        input,
        hostOutcome,
        threatSwitchCount: this.#threatSwitchCount,
      });
    } catch (error) {
      return this.#fail(error);
    }
  }

  #fail(error: unknown): never {
    try {
      this.destroy();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Arena V2自适应反制Bot Owner失败且清理不完整。',
      );
    }
    throw error;
  }

  getSnapshotCandidateV1():
  ArenaV2InformationHostAdaptiveCounterplayBotSnapshotCandidateV1 {
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      generation: this.#generation,
      localParticipantId: this.#localParticipantId,
      destroyed: this.#destroyed,
      currentOpponentParticipantId: this.#currentOpponentParticipantId,
      threatSwitchCount: this.#threatSwitchCount,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#destroying) throw new Error('Arena V2自适应反制Bot Owner销毁不可重入。');
    this.#destroying = true;
    try {
      this.#releasePort();
      this.#currentOpponentParticipantId = null;
      this.#destroyed = true;
    } finally {
      this.#destroying = false;
    }
  }
}

export const ARENA_V2_INFORMATION_HOST_ADAPTIVE_COUNTERPLAY_BOT_OWNER_CANDIDATE_V1 =
  Object.freeze({
    status: 'production-unreachable' as const,
    hardGate: false as const,
    currentThreatSwitchScoreDelta:
      ARENA_V2_ADAPTIVE_COUNTERPLAY_THREAT_SWITCH_SCORE_DELTA_CANDIDATE_V1,
    currentArmedThreatSelectionOnly: true as const,
    failsClosedWhenProjectionControllerOrHostStepFails: true as const,
    failedPortCleanupRetainsRetryOwnership: true as const,
    originalAndCleanupFailuresAreAggregated: true as const,
    threatSwitchReleasesPriorPortBeforeReplacement: true as const,
    invalidHostStepOutcomeFailsClosed: true as const,
    fallsBackToCurrentLegalRouteThenNeutral: true as const,
    emitsPrimaryDuringFallback: false as const,
    defaultHostFactoryWired: false as const,
    defaultBotRegistryWired: false as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    validationStatus: 'not-run' as const,
  });
