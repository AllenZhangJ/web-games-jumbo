import {
  assertKnownKeys,
  cloneFrozenData,
  type ArenaWeaponFeedbackDirectionFactV2,
  type DeepReadonly,
  type WeaponFeedbackResolvedEventV6,
} from '@number-strategy-jump/arena-contracts';
import {
  MatchCoreWeaponFeedbackAdapterV1,
  type MatchCoreWeaponFeedbackAdapterCheckpointV1,
  type MatchCoreWeaponFeedbackAdapterV1Options,
} from './match-core-weapon-feedback-adapter-v1.js';
import {
  type MatchCoreWeaponFeedbackDirectionCheckpointV2,
} from './match-core-weapon-feedback-direction-checkpoint-v2.js';
import {
  MatchCoreWeaponFeedbackDirectionOwnerV2,
} from './match-core-weapon-feedback-direction-owner-v2.js';

export interface MatchCoreWeaponFeedbackBundleOwnerV2StepInput {
  readonly sequenceStart: number;
  readonly sourceEvents: readonly Readonly<Record<string, unknown>>[];
  readonly observation: unknown;
}

export interface MatchCoreWeaponFeedbackBundleOwnerV2StepResult {
  readonly schemaVersion: 2;
  readonly feedbackEvents: readonly DeepReadonly<WeaponFeedbackResolvedEventV6>[];
  readonly directionFacts: readonly ArenaWeaponFeedbackDirectionFactV2[];
  readonly feedbackCheckpoint: MatchCoreWeaponFeedbackAdapterCheckpointV1;
  readonly directionCheckpoint: MatchCoreWeaponFeedbackDirectionCheckpointV2;
}

export interface MatchCoreWeaponFeedbackBundleOwnerV2RestoreInput {
  readonly feedbackCheckpoint: MatchCoreWeaponFeedbackAdapterCheckpointV1;
  readonly directionCheckpoint: MatchCoreWeaponFeedbackDirectionCheckpointV2;
}

const STEP_KEYS = new Set(['sequenceStart', 'sourceEvents', 'observation']);
const RESTORE_KEYS = new Set(['feedbackCheckpoint', 'directionCheckpoint']);

function requireKeys(
  value: Readonly<Record<string, unknown>>,
  keys: ReadonlySet<string>,
  name: string,
): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少${key}。`);
  }
}

/**
 * Atomic owner for the V1 feedback result and its V2 authority direction fact.
 * A step is evaluated on checkpoint forks and only replaces the live pair after
 * both owners accept the exact same MatchCore authority batch.
 */
export class MatchCoreWeaponFeedbackBundleOwnerV2 {
  #feedback: MatchCoreWeaponFeedbackAdapterV1;
  #direction: MatchCoreWeaponFeedbackDirectionOwnerV2;
  #destroyed = false;

  constructor(options: MatchCoreWeaponFeedbackAdapterV1Options) {
    const feedback = new MatchCoreWeaponFeedbackAdapterV1(options);
    const feedbackCheckpoint = feedback.exportCheckpointV1();
    let direction: MatchCoreWeaponFeedbackDirectionOwnerV2;
    try {
      direction = new MatchCoreWeaponFeedbackDirectionOwnerV2({
        feedbackCheckpoint,
        directionCheckpoint: null,
      });
    } catch (error) {
      feedback.destroy();
      throw error;
    }
    this.#feedback = feedback;
    this.#direction = direction;
  }

  static restoreFromCheckpointsV2(
    value: MatchCoreWeaponFeedbackBundleOwnerV2RestoreInput,
  ): MatchCoreWeaponFeedbackBundleOwnerV2 {
    const source = cloneFrozenData(value, 'feedback bundle restore input');
    assertKnownKeys(source, RESTORE_KEYS, 'feedback bundle restore input');
    requireKeys(source, RESTORE_KEYS, 'feedback bundle restore input');
    const feedback = MatchCoreWeaponFeedbackAdapterV1.restoreFromCheckpointV1(
      source.feedbackCheckpoint,
    );
    const feedbackCheckpoint = feedback.exportCheckpointV1();
    let direction: MatchCoreWeaponFeedbackDirectionOwnerV2;
    try {
      direction = new MatchCoreWeaponFeedbackDirectionOwnerV2({
        feedbackCheckpoint,
        directionCheckpoint: source.directionCheckpoint,
      });
    } catch (error) {
      feedback.destroy();
      throw error;
    }
    const supportSurfaceIds = new Map(
      feedbackCheckpoint.lastSupportedSurfaceIds.map((entry) => [
        entry.participantId,
        entry.supportSurfaceId,
      ] as const),
    );
    let owner: MatchCoreWeaponFeedbackBundleOwnerV2;
    try {
      owner = new MatchCoreWeaponFeedbackBundleOwnerV2({
        participantIds: feedbackCheckpoint.participantIds,
        outcomeWindowTicks: feedbackCheckpoint.outcomeWindowTicks,
        initialObservation: {
          tick: feedbackCheckpoint.tick,
          eventSequence: feedbackCheckpoint.sourceEventSequence,
          participants: feedbackCheckpoint.participantIds.map((participantId) => ({
            participantId,
            active: false,
            actionDefinitionId: null,
            supportSurfaceId: supportSurfaceIds.get(participantId) ?? null,
          })),
        },
      });
    } catch (error) {
      feedback.destroy();
      direction.destroy();
      throw error;
    }
    owner.#feedback.destroy();
    owner.#direction.destroy();
    owner.#feedback = feedback;
    owner.#direction = direction;
    return owner;
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('feedback bundle owner已销毁。');
  }

  get pendingActionCount(): number {
    this.#assertUsable();
    return this.#feedback.pendingActionCount;
  }

  get pendingHitCount(): number {
    this.#assertUsable();
    return this.#feedback.pendingHitCount;
  }

  step(value: MatchCoreWeaponFeedbackBundleOwnerV2StepInput):
  MatchCoreWeaponFeedbackBundleOwnerV2StepResult {
    this.#assertUsable();
    const source = cloneFrozenData(value, 'feedback bundle step');
    assertKnownKeys(source, STEP_KEYS, 'feedback bundle step');
    requireKeys(source, STEP_KEYS, 'feedback bundle step');
    if (!Array.isArray(source.sourceEvents)) {
      throw new TypeError('feedback bundle step.sourceEvents必须是数组。');
    }

    const previousFeedbackCheckpoint = this.#feedback.exportCheckpointV1();
    const previousDirectionCheckpoint = this.#direction.exportCheckpointV2();
    const feedbackFork = MatchCoreWeaponFeedbackAdapterV1.restoreFromCheckpointV1(
      previousFeedbackCheckpoint,
    );
    let directionFork: MatchCoreWeaponFeedbackDirectionOwnerV2 | null = null;

    try {
      directionFork = new MatchCoreWeaponFeedbackDirectionOwnerV2({
        feedbackCheckpoint: previousFeedbackCheckpoint,
        directionCheckpoint: previousDirectionCheckpoint,
      });
      const feedbackEvents = feedbackFork.step(source);
      const feedbackCheckpoint = feedbackFork.exportCheckpointV1();
      const directionResult = directionFork.step({
        sourceEvents: source.sourceEvents,
        feedbackEvents,
        feedbackCheckpoint,
      });
      this.#feedback.destroy();
      this.#direction.destroy();
      this.#feedback = feedbackFork;
      this.#direction = directionFork;
      return Object.freeze({
        schemaVersion: 2 as const,
        feedbackEvents,
        directionFacts: directionResult.facts,
        feedbackCheckpoint,
        directionCheckpoint: directionResult.checkpoint,
      });
    } catch (error) {
      feedbackFork.destroy();
      directionFork?.destroy();
      throw error;
    }
  }

  exportFeedbackCheckpointV1(): MatchCoreWeaponFeedbackAdapterCheckpointV1 {
    this.#assertUsable();
    return this.#feedback.exportCheckpointV1();
  }

  exportDirectionCheckpointV2(): MatchCoreWeaponFeedbackDirectionCheckpointV2 {
    this.#assertUsable();
    return this.#direction.exportCheckpointV2();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#feedback.destroy();
    this.#direction.destroy();
  }
}

export const MATCH_CORE_WEAPON_FEEDBACK_BUNDLE_OWNER_V2 = Object.freeze({
  schemaVersion: 2 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  ownsFeedbackAdapterV1: true as const,
  ownsDirectionOwnerV2: true as const,
  evaluatesOnCheckpointForks: true as const,
  atomicPairCommit: true as const,
  consumesSameAuthorityBatch: true as const,
  presentationAuthority: false as const,
});
