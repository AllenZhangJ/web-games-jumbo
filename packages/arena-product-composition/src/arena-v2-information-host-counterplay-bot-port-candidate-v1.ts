import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPositiveFinite,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2InformationModeSessionHostCandidateV1,
  type ArenaV2InformationModeSessionHostStepOutcomeCandidateV1,
} from './arena-v2-information-mode-session-host-candidate-v1.js';
import {
  ArenaV2WeaponCounterplayBotProbeControllerCandidateV1,
  type ArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1,
  type ArenaV2WeaponCounterplayBotProbeControllerSnapshotCandidateV1,
} from './arena-v2-weapon-counterplay-bot-probe-controller-candidate-v1.js';
import type {
  ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1,
} from './arena-v2-weapon-counterplay-bot-probe-composition-candidate-v1.js';
import {
  projectArenaV2LocalCounterplayBotCurrentFactsCandidateV1,
  type ArenaV2LocalCounterplayBotCurrentFactsCandidateV1,
} from './arena-v2-local-counterplay-bot-current-facts-candidate-v1.js';
import {
  selectArenaV2CurrentWeaponThreatOpponentCandidateV1,
} from './arena-v2-current-weapon-threat-opponent-selector-candidate-v1.js';

export interface ArenaV2InformationHostCounterplayBotPortOptionsCandidateV1 {
  readonly host: ArenaV2InformationModeSessionHostCandidateV1;
  readonly opponentParticipantId: string;
}

export interface ArenaV2InformationHostCounterplayBotPortStepCandidateV1 {
  readonly selfPrimaryReady: boolean;
  readonly selfPrimaryRange: number;
  readonly selfJumpAvailable: boolean;
  readonly currentLegalRouteTargets:
    readonly ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1[];
}

export interface ArenaV2InformationHostCounterplayBotPortStepOutcomeCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly generation: number;
  readonly input: ArenaInputFrame;
  readonly hostOutcome: ArenaV2InformationModeSessionHostStepOutcomeCandidateV1;
  readonly controller: ArenaV2WeaponCounterplayBotProbeControllerSnapshotCandidateV1;
}

export interface ArenaV2InformationHostCounterplayBotPortSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly generation: number;
  readonly localParticipantId: string;
  readonly opponentParticipantId: string;
  readonly destroyed: boolean;
  readonly controller: ArenaV2WeaponCounterplayBotProbeControllerSnapshotCandidateV1;
}

const OPTION_KEYS = new Set(['host', 'opponentParticipantId']);
const STEP_KEYS = new Set([
  'selfPrimaryReady', 'selfPrimaryRange', 'selfJumpAvailable',
  'currentLegalRouteTargets',
]);

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

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name}必须是布尔值。`);
  return value;
}

/**
 * Explicit developer-only wiring from the existing three-mode information
 * host to the restricted counterplay controller. Construction requires an
 * already running match and controls only that host generation's local input.
 * No default factory creates this port.
 */
export class ArenaV2InformationHostCounterplayBotPortCandidateV1 {
  readonly #host: ArenaV2InformationModeSessionHostCandidateV1;
  readonly #generation: number;
  readonly #localParticipantId: string;
  readonly #opponentParticipantId: string;
  readonly #controller: ArenaV2WeaponCounterplayBotProbeControllerCandidateV1;
  #destroying = false;
  #destroyed = false;

  constructor(options: ArenaV2InformationHostCounterplayBotPortOptionsCandidateV1);
  constructor(value: unknown) {
    exactRecord(value, OPTION_KEYS, 'Arena V2 Information Host反制Bot Port options');
    if (!(value.host instanceof ArenaV2InformationModeSessionHostCandidateV1)) {
      throw new TypeError('Arena V2 Information Host反制Bot Port要求真实隔离Host实例。');
    }
    const context = value.host.getMatchInputContext();
    if (context.state !== 'running') {
      throw new Error('Arena V2 Information Host反制Bot Port只能绑定running对局。');
    }
    const opponentParticipantId = assertNonEmptyString(
      value.opponentParticipantId,
      'Arena V2 Information Host反制Bot Port opponentParticipantId',
    );
    const scene = value.host.getMatchSceneReadFrameCandidateV1();
    if (!scene.world.participants.some(({ id }) => id === opponentParticipantId)) {
      throw new RangeError('Arena V2 Information Host反制Bot Port对手不在当前Scene。');
    }
    if (opponentParticipantId === context.localParticipantId) {
      throw new RangeError('Arena V2 Information Host反制Bot Port不能以本地玩家为对手。');
    }
    this.#host = value.host;
    this.#generation = context.generation;
    this.#localParticipantId = context.localParticipantId;
    this.#opponentParticipantId = opponentParticipantId;
    this.#controller = new ArenaV2WeaponCounterplayBotProbeControllerCandidateV1({
      participantId: context.localParticipantId,
      opponentParticipantId,
    });
  }

  step(
    value: ArenaV2InformationHostCounterplayBotPortStepCandidateV1,
  ): ArenaV2InformationHostCounterplayBotPortStepOutcomeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena V2 Information Host反制Bot Port已销毁。');
    exactRecord(value, STEP_KEYS, 'Arena V2 Information Host反制Bot Port step');
    let context: ReturnType<
      ArenaV2InformationModeSessionHostCandidateV1['getMatchInputContext']
    >;
    try {
      context = this.#host.getMatchInputContext();
    } catch (error) {
      return this.#fail(error);
    }
    if (
      context.state !== 'running'
      || context.generation !== this.#generation
      || context.localParticipantId !== this.#localParticipantId
    ) {
      return this.#fail(
        new RangeError('Arena V2 Information Host反制Bot Port宿主generation或状态漂移。'),
      );
    }
    let input: ArenaInputFrame;
    try {
      input = this.#controller.createInput({
        scene: this.#host.getMatchSceneReadFrameCandidateV1(),
        selfPrimaryReady: booleanValue(
          value.selfPrimaryReady,
          'Arena V2 Information Host反制Bot Port selfPrimaryReady',
        ),
        selfPrimaryRange: assertPositiveFinite(
          value.selfPrimaryRange,
          'Arena V2 Information Host反制Bot Port selfPrimaryRange',
        ),
        selfJumpAvailable: booleanValue(
          value.selfJumpAvailable,
          'Arena V2 Information Host反制Bot Port selfJumpAvailable',
        ),
        currentLegalRouteTargets: value.currentLegalRouteTargets as readonly (
          ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1
        )[],
      });
    } catch (error) {
      return this.#fail(error);
    }
    let hostOutcome: ArenaV2InformationModeSessionHostStepOutcomeCandidateV1;
    try {
      hostOutcome = this.#host.stepMatch(input);
    } catch (error) {
      return this.#fail(error);
    }
    if (
      hostOutcome.snapshot.generation !== this.#generation
      || hostOutcome.snapshot.state !== 'match-running'
    ) {
      return this.#fail(
        new RangeError('Arena V2 Information Host反制Bot Port宿主step结果身份漂移。'),
      );
    }
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      generation: this.#generation,
      input,
      hostOutcome,
      controller: this.#controller.getSnapshotCandidateV1(),
    });
  }

  /** Canonical no-parameter development path: all affordances and routes come
   * from the current validated Scene Read Frame rather than host guesses. */
  stepFromAuthorityCandidateV1(): ArenaV2InformationHostCounterplayBotPortStepOutcomeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena V2 Information Host反制Bot Port已销毁。');
    let facts: ArenaV2LocalCounterplayBotCurrentFactsCandidateV1;
    try {
      facts = projectArenaV2LocalCounterplayBotCurrentFactsCandidateV1(
        this.#host.getMatchSceneReadFrameCandidateV1(),
      );
    } catch (error) {
      return this.#fail(error);
    }
    if (facts.participantId !== this.#localParticipantId) {
      return this.#fail(
        new RangeError('Arena V2 Information Host反制Bot Port权威事实参与者漂移。'),
      );
    }
    return this.step({
      selfPrimaryReady: facts.selfPrimaryReady,
      selfPrimaryRange: facts.selfPrimaryRange,
      selfJumpAvailable: facts.selfJumpAvailable,
      currentLegalRouteTargets: facts.currentLegalRouteTargets,
    });
  }

  exportControllerCheckpointCandidateV1():
  ArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1 {
    if (this.#destroyed) throw new Error('Arena V2 Information Host反制Bot Port已销毁。');
    return this.#controller.exportCheckpointCandidateV1();
  }

  getSnapshotCandidateV1(): ArenaV2InformationHostCounterplayBotPortSnapshotCandidateV1 {
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      generation: this.#generation,
      localParticipantId: this.#localParticipantId,
      opponentParticipantId: this.#opponentParticipantId,
      destroyed: this.#destroyed,
      controller: this.#controller.getSnapshotCandidateV1(),
    });
  }

  #fail(error: unknown): never {
    try {
      this.destroy();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Arena V2 Information Host反制Bot Port失败且清理不完整。',
      );
    }
    throw error;
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#destroying) {
      throw new Error('Arena V2 Information Host反制Bot Port销毁不可重入。');
    }
    this.#destroying = true;
    try {
      this.#controller.destroy();
      this.#destroyed = true;
    } finally {
      this.#destroying = false;
    }
  }
}

/**
 * Explicit convenience factory for 2–4 player race and multi-enemy survival
 * development sessions. It binds the single highest current armed threat and
 * returns null when no eligible armed opponent exists; callers must then use
 * their normal input path rather than inventing a target.
 */
export function createArenaV2InformationHostCurrentThreatCounterplayBotPortCandidateV1(
  host: ArenaV2InformationModeSessionHostCandidateV1,
): ArenaV2InformationHostCounterplayBotPortCandidateV1 | null {
  if (!(host instanceof ArenaV2InformationModeSessionHostCandidateV1)) {
    throw new TypeError('Arena V2当前威胁反制Bot Port要求真实隔离Host实例。');
  }
  const threat = selectArenaV2CurrentWeaponThreatOpponentCandidateV1(
    host.getMatchSceneReadFrameCandidateV1(),
  );
  return threat === null ? null : new ArenaV2InformationHostCounterplayBotPortCandidateV1({
    host,
    opponentParticipantId: threat.participantId,
  });
}

export const ARENA_V2_INFORMATION_HOST_COUNTERPLAY_BOT_PORT_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  constructionRequiresRunningMatch: true as const,
  controlsCurrentGenerationLocalInputOnly: true as const,
  controllerReceivesExplicitCurrentAffordancesAndLegalRoutes: true as const,
  canonicalAuthorityStepRequiresHostParameters: false as const,
  currentThreatFactoryReturnsNullWithoutArmedOpponent: true as const,
  controllerCleanupCommitsDestroyedAfterSuccess: true as const,
  failedControllerCleanupRemainsRetryable: true as const,
  originalAndCleanupFailuresAreAggregated: true as const,
  controllerInputFailureFailsClosed: true as const,
  authorityFactProjectionFailureFailsClosed: true as const,
  defaultHostFactoryWired: false as const,
  defaultBotRegistryWired: false as const,
  validationStatus: 'not-run' as const,
});
