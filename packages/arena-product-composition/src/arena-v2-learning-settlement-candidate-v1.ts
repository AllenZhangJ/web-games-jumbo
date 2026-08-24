import {
  assertKnownKeys,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2ProductAuthorityRegistryCandidateV1,
  validateProductResultReplaySettlementEvidenceV1,
  validateProductResultRuntimeSettlementEvidenceV2,
  validateProductResultRuntimeSettlementEvidenceV3,
} from '@number-strategy-jump/arena-product-match';
import {
  resolveArenaV2ReplayLearningGrantV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  ArenaV2LearningProfileServiceV1,
} from '@number-strategy-jump/arena-profile-service';
import {
  bindArenaV2LearningGrantToReplayEvidenceV1,
  type ArenaV2LearningGrantV1,
} from '@number-strategy-jump/arena-profile-contracts';

export interface SettleArenaV2LearningMatchCandidateV1Options {
  readonly profileDefinition: unknown;
  readonly evidenceDefinition: unknown;
  readonly learningProfileService: ArenaV2LearningProfileServiceV1;
  readonly result: unknown;
  readonly recipientParticipantId: unknown;
  readonly events: unknown;
}

export interface SettleArenaV2LearningMatchWithReplayCandidateV1Options {
  readonly profileDefinition: unknown;
  readonly evidenceDefinition: unknown;
  readonly learningProfileService: ArenaV2LearningProfileServiceV1;
  readonly settlementEvidence: unknown;
  readonly recipientParticipantId: unknown;
}

export interface SettleArenaV2LearningMatchWithRegisteredAuthorityCandidateV1Options {
  readonly profileDefinition: unknown;
  readonly evidenceDefinition: unknown;
  readonly learningProfileService: ArenaV2LearningProfileServiceV1;
  readonly authorityRegistry: ArenaV2ProductAuthorityRegistryCandidateV1;
  readonly registeredSettlementEvidence: unknown;
  readonly recipientParticipantId: unknown;
}

export interface SettleArenaV2LearningMatchWithRuntimeEvidenceCandidateV2Options {
  readonly profileDefinition: unknown;
  readonly evidenceDefinition: unknown;
  readonly learningProfileService: ArenaV2LearningProfileServiceV1;
  readonly settlementEvidence: unknown;
  readonly recipientParticipantId: unknown;
}

export interface SettleArenaV2LearningMatchWithRegisteredAuthorityCandidateV2Options {
  readonly profileDefinition: unknown;
  readonly evidenceDefinition: unknown;
  readonly learningProfileService: ArenaV2LearningProfileServiceV1;
  readonly authorityRegistry: ArenaV2ProductAuthorityRegistryCandidateV1;
  readonly registeredSettlementEvidence: unknown;
  readonly recipientParticipantId: unknown;
}

export interface PrepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV2Options {
  readonly profileDefinition: unknown;
  readonly evidenceDefinition: unknown;
  readonly settlementEvidence: unknown;
  readonly recipientParticipantId: unknown;
}

export interface PrepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV2Options {
  readonly profileDefinition: unknown;
  readonly evidenceDefinition: unknown;
  readonly authorityRegistry: ArenaV2ProductAuthorityRegistryCandidateV1;
  readonly registeredSettlementEvidence: unknown;
  readonly recipientParticipantId: unknown;
}

export type PrepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV3Options =
  PrepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV2Options;

export type PrepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV3Options =
  PrepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV2Options;

export type SettleArenaV2LearningMatchWithRuntimeEvidenceCandidateV3Options =
  SettleArenaV2LearningMatchWithRuntimeEvidenceCandidateV2Options;

export type SettleArenaV2LearningMatchWithRegisteredAuthorityCandidateV3Options =
  SettleArenaV2LearningMatchWithRegisteredAuthorityCandidateV2Options;

const OPTION_KEYS = new Set([
  'profileDefinition', 'evidenceDefinition', 'learningProfileService',
  'result', 'recipientParticipantId', 'events',
]);
const REPLAY_OPTION_KEYS = new Set([
  'profileDefinition', 'evidenceDefinition', 'learningProfileService',
  'settlementEvidence', 'recipientParticipantId',
]);
const REGISTERED_AUTHORITY_OPTION_KEYS = new Set([
  'profileDefinition', 'evidenceDefinition', 'learningProfileService',
  'authorityRegistry', 'registeredSettlementEvidence', 'recipientParticipantId',
]);
const PREPARE_REPLAY_OPTION_KEYS = new Set([
  'profileDefinition', 'evidenceDefinition', 'settlementEvidence',
  'recipientParticipantId',
]);
const PREPARE_REGISTERED_AUTHORITY_OPTION_KEYS = new Set([
  'profileDefinition', 'evidenceDefinition', 'authorityRegistry',
  'registeredSettlementEvidence', 'recipientParticipantId',
]);

function assertHumanRecipient(
  settlementEvidence: Readonly<{
    readonly replay: Readonly<{
      readonly participantAssignments: readonly Readonly<{
        readonly participantId: string;
        readonly controllerKind: string;
      }>[];
    }>;
  }>,
  value: unknown,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('Learning Replay Settlement recipient必须是非空字符串。');
  }
  const replayRecipient = settlementEvidence.replay.participantAssignments.find(
    ({ participantId }) => participantId === value,
  );
  if (replayRecipient?.controllerKind !== 'human') {
    throw new RangeError('Learning Replay Settlement只能授予当局human参与者。');
  }
  return value;
}

function resolveReplayGrant(
  options: Readonly<{
    readonly profileDefinition: unknown;
    readonly evidenceDefinition: unknown;
    readonly settlementEvidence: Readonly<{
      readonly result: unknown;
      readonly replay: Readonly<{ readonly events: unknown }>;
      readonly replayIdentityHash: string;
    }>;
    readonly recipientParticipantId: string;
    readonly bindingEvidenceHash: string;
  }>,
) {
  const unboundGrant = resolveArenaV2ReplayLearningGrantV1({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    result: options.settlementEvidence.result,
    recipientParticipantId: options.recipientParticipantId,
    events: options.settlementEvidence.replay.events,
  });
  return bindArenaV2LearningGrantToReplayEvidenceV1(
    options.profileDefinition,
    unboundGrant,
    options.settlementEvidence.replayIdentityHash,
    options.bindingEvidenceHash,
  );
}

/**
 * Resolves and freezes the complete Learning Grant before any reward Profile
 * write begins. This is the formal Runtime V2 preflight path; it performs no
 * Profile mutation.
 */
export function prepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV2(
  value: PrepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV2Options,
): ArenaV2LearningGrantV1 {
  const options = assertPlainRecord(
    value,
    'PrepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV2 options',
  );
  assertKnownKeys(
    options,
    PREPARE_REPLAY_OPTION_KEYS,
    'PrepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV2 options',
  );
  for (const key of PREPARE_REPLAY_OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Learning Runtime Evidence Preparation缺少${key}。`);
    }
  }
  const settlementEvidence = validateProductResultRuntimeSettlementEvidenceV2(
    options.settlementEvidence,
  );
  const recipientParticipantId = assertHumanRecipient(
    settlementEvidence,
    options.recipientParticipantId,
  );
  return resolveReplayGrant({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    settlementEvidence,
    recipientParticipantId,
    bindingEvidenceHash: settlementEvidence.settlementEvidenceHash,
  });
}

/**
 * Registry-bound variant of the Runtime V2 preflight. Admission, Result,
 * Replay and Mode Driver identity are validated before returning the Grant.
 */
export function prepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV2(
  value: PrepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV2Options,
): ArenaV2LearningGrantV1 {
  const options = assertPlainRecord(
    value,
    'PrepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV2 options',
  );
  assertKnownKeys(
    options,
    PREPARE_REGISTERED_AUTHORITY_OPTION_KEYS,
    'PrepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV2 options',
  );
  for (const key of PREPARE_REGISTERED_AUTHORITY_OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Learning Registered Authority V2 Preparation缺少${key}。`);
    }
  }
  if (!(options.authorityRegistry instanceof ArenaV2ProductAuthorityRegistryCandidateV1)) {
    throw new TypeError('Learning Registered Authority V2 Preparation需要产品Authority Registry。');
  }
  const registered = options.authorityRegistry.validateRegisteredSettlementEvidenceV2(
    options.registeredSettlementEvidence,
  );
  const recipientParticipantId = assertHumanRecipient(
    registered.settlementEvidence,
    options.recipientParticipantId,
  );
  return resolveReplayGrant({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    settlementEvidence: registered.settlementEvidence,
    recipientParticipantId,
    bindingEvidenceHash: registered.registeredSettlementEvidenceHash,
  });
}

/** Complete Survival supply ownership is validated before any durable write. */
export function prepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV3(
  value: PrepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV3Options,
): ArenaV2LearningGrantV1 {
  const options = assertPlainRecord(
    value,
    'PrepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV3 options',
  );
  assertKnownKeys(
    options,
    PREPARE_REPLAY_OPTION_KEYS,
    'PrepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV3 options',
  );
  for (const key of PREPARE_REPLAY_OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Learning Runtime Evidence V3 Preparation缺少${key}。`);
    }
  }
  const settlementEvidence = validateProductResultRuntimeSettlementEvidenceV3(
    options.settlementEvidence,
  );
  const recipientParticipantId = assertHumanRecipient(
    settlementEvidence,
    options.recipientParticipantId,
  );
  return resolveReplayGrant({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    settlementEvidence,
    recipientParticipantId,
    bindingEvidenceHash: settlementEvidence.settlementEvidenceHash,
  });
}

/** Registry admission plus complete Survival supply ownership preflight. */
export function prepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV3(
  value: PrepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV3Options,
): ArenaV2LearningGrantV1 {
  const options = assertPlainRecord(
    value,
    'PrepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV3 options',
  );
  assertKnownKeys(
    options,
    PREPARE_REGISTERED_AUTHORITY_OPTION_KEYS,
    'PrepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV3 options',
  );
  for (const key of PREPARE_REGISTERED_AUTHORITY_OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Learning Registered Authority V3 Preparation缺少${key}。`);
    }
  }
  if (!(options.authorityRegistry instanceof ArenaV2ProductAuthorityRegistryCandidateV1)) {
    throw new TypeError('Learning Registered Authority V3 Preparation需要产品Authority Registry。');
  }
  const registered = options.authorityRegistry.validateRegisteredSettlementEvidenceV3(
    options.registeredSettlementEvidence,
  );
  const recipientParticipantId = assertHumanRecipient(
    registered.settlementEvidence,
    options.recipientParticipantId,
  );
  return resolveReplayGrant({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    settlementEvidence: registered.settlementEvidence,
    recipientParticipantId,
    bindingEvidenceHash: registered.registeredSettlementEvidenceHash,
  });
}

/** Explicit P6 opt-in only; no default session invokes this settlement. */
export function settleArenaV2LearningMatchCandidateV1(
  value: SettleArenaV2LearningMatchCandidateV1Options,
): ReturnType<ArenaV2LearningProfileServiceV1['commitGrant']> {
  const options = assertPlainRecord(value, 'ArenaV2LearningSettlementCandidateV1 options');
  assertKnownKeys(options, OPTION_KEYS, 'ArenaV2LearningSettlementCandidateV1 options');
  for (const key of OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) throw new TypeError(`Learning Settlement缺少${key}。`);
  }
  if (!(options.learningProfileService instanceof ArenaV2LearningProfileServiceV1)) {
    throw new TypeError('Learning Settlement需要ArenaV2LearningProfileServiceV1。');
  }
  const grant = resolveArenaV2ReplayLearningGrantV1({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    result: options.result,
    recipientParticipantId: options.recipientParticipantId,
    events: options.events,
  });
  return options.learningProfileService.commitGrant(grant);
}

/** Preferred candidate path: Result and the complete Replay V6 are already bound. */
export function settleArenaV2LearningMatchWithReplayCandidateV1(
  value: SettleArenaV2LearningMatchWithReplayCandidateV1Options,
): ReturnType<ArenaV2LearningProfileServiceV1['commitGrant']> {
  const options = assertPlainRecord(
    value,
    'ArenaV2LearningMatchWithReplaySettlementCandidateV1 options',
  );
  assertKnownKeys(
    options,
    REPLAY_OPTION_KEYS,
    'ArenaV2LearningMatchWithReplaySettlementCandidateV1 options',
  );
  for (const key of REPLAY_OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Learning Replay Settlement缺少${key}。`);
    }
  }
  if (!(options.learningProfileService instanceof ArenaV2LearningProfileServiceV1)) {
    throw new TypeError('Learning Replay Settlement需要ArenaV2LearningProfileServiceV1。');
  }
  const settlementEvidence = validateProductResultReplaySettlementEvidenceV1(
    options.settlementEvidence,
  );
  const recipientParticipantId = assertHumanRecipient(
    settlementEvidence,
    options.recipientParticipantId,
  );
  const grant = resolveReplayGrant({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    settlementEvidence,
    recipientParticipantId,
    bindingEvidenceHash: settlementEvidence.settlementEvidenceHash,
  });
  return options.learningProfileService.commitGrant(grant);
}

/** Preferred P6.44 path: stable Registry admission and per-match Replay evidence are one proof. */
export function settleArenaV2LearningMatchWithRegisteredAuthorityCandidateV1(
  value: SettleArenaV2LearningMatchWithRegisteredAuthorityCandidateV1Options,
): ReturnType<ArenaV2LearningProfileServiceV1['commitGrant']> {
  const options = assertPlainRecord(
    value,
    'ArenaV2LearningMatchWithRegisteredAuthorityCandidateV1 options',
  );
  assertKnownKeys(
    options,
    REGISTERED_AUTHORITY_OPTION_KEYS,
    'ArenaV2LearningMatchWithRegisteredAuthorityCandidateV1 options',
  );
  for (const key of REGISTERED_AUTHORITY_OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Learning Registered Authority Settlement缺少${key}。`);
    }
  }
  if (!(options.learningProfileService instanceof ArenaV2LearningProfileServiceV1)) {
    throw new TypeError('Learning Registered Authority Settlement需要Learning Profile Service。');
  }
  if (!(options.authorityRegistry instanceof ArenaV2ProductAuthorityRegistryCandidateV1)) {
    throw new TypeError('Learning Registered Authority Settlement需要产品Authority Registry。');
  }
  const registered = options.authorityRegistry.validateRegisteredSettlementEvidence(
    options.registeredSettlementEvidence,
  );
  const recipientParticipantId = assertHumanRecipient(
    registered.settlementEvidence,
    options.recipientParticipantId,
  );
  const grant = resolveReplayGrant({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    settlementEvidence: registered.settlementEvidence,
    recipientParticipantId,
    bindingEvidenceHash: registered.registeredSettlementEvidenceHash,
  });
  return options.learningProfileService.commitGrant(grant);
}

/** Preferred candidate path: Product Result, Replay and actual Mode Driver are bound. */
export function settleArenaV2LearningMatchWithRuntimeEvidenceCandidateV2(
  value: SettleArenaV2LearningMatchWithRuntimeEvidenceCandidateV2Options,
): ReturnType<ArenaV2LearningProfileServiceV1['commitGrant']> {
  const options = assertPlainRecord(
    value,
    'ArenaV2LearningMatchWithRuntimeEvidenceCandidateV2 options',
  );
  assertKnownKeys(
    options,
    REPLAY_OPTION_KEYS,
    'ArenaV2LearningMatchWithRuntimeEvidenceCandidateV2 options',
  );
  for (const key of REPLAY_OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Learning Runtime Evidence Settlement缺少${key}。`);
    }
  }
  if (!(options.learningProfileService instanceof ArenaV2LearningProfileServiceV1)) {
    throw new TypeError('Learning Runtime Evidence Settlement需要Learning Profile Service。');
  }
  const grant = prepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV2({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    settlementEvidence: options.settlementEvidence,
    recipientParticipantId: options.recipientParticipantId,
  });
  return options.learningProfileService.commitGrant(grant);
}

/** Registry admission plus Result/Replay/Mode Driver terminal evidence. */
export function settleArenaV2LearningMatchWithRegisteredAuthorityCandidateV2(
  value: SettleArenaV2LearningMatchWithRegisteredAuthorityCandidateV2Options,
): ReturnType<ArenaV2LearningProfileServiceV1['commitGrant']> {
  const options = assertPlainRecord(
    value,
    'ArenaV2LearningMatchWithRegisteredAuthorityCandidateV2 options',
  );
  assertKnownKeys(
    options,
    REGISTERED_AUTHORITY_OPTION_KEYS,
    'ArenaV2LearningMatchWithRegisteredAuthorityCandidateV2 options',
  );
  for (const key of REGISTERED_AUTHORITY_OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Learning Registered Authority V2 Settlement缺少${key}。`);
    }
  }
  if (!(options.learningProfileService instanceof ArenaV2LearningProfileServiceV1)) {
    throw new TypeError('Learning Registered Authority V2 Settlement需要Learning Profile Service。');
  }
  const authorityRegistry = options.authorityRegistry;
  if (!(authorityRegistry instanceof ArenaV2ProductAuthorityRegistryCandidateV1)) {
    throw new TypeError('Learning Registered Authority V2 Settlement需要产品Authority Registry。');
  }
  const grant = prepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV2({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    authorityRegistry,
    registeredSettlementEvidence: options.registeredSettlementEvidence,
    recipientParticipantId: options.recipientParticipantId,
  });
  return options.learningProfileService.commitGrant(grant);
}

export function settleArenaV2LearningMatchWithRuntimeEvidenceCandidateV3(
  value: SettleArenaV2LearningMatchWithRuntimeEvidenceCandidateV3Options,
): ReturnType<ArenaV2LearningProfileServiceV1['commitGrant']> {
  const options = assertPlainRecord(
    value,
    'ArenaV2LearningMatchWithRuntimeEvidenceCandidateV3 options',
  );
  assertKnownKeys(
    options,
    REPLAY_OPTION_KEYS,
    'ArenaV2LearningMatchWithRuntimeEvidenceCandidateV3 options',
  );
  for (const key of REPLAY_OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Learning Runtime Evidence V3 Settlement缺少${key}。`);
    }
  }
  if (!(options.learningProfileService instanceof ArenaV2LearningProfileServiceV1)) {
    throw new TypeError('Learning Runtime Evidence V3 Settlement需要Learning Profile Service。');
  }
  const grant = prepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV3({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    settlementEvidence: options.settlementEvidence,
    recipientParticipantId: options.recipientParticipantId,
  });
  return options.learningProfileService.commitGrant(grant);
}

export function settleArenaV2LearningMatchWithRegisteredAuthorityCandidateV3(
  value: SettleArenaV2LearningMatchWithRegisteredAuthorityCandidateV3Options,
): ReturnType<ArenaV2LearningProfileServiceV1['commitGrant']> {
  const options = assertPlainRecord(
    value,
    'ArenaV2LearningMatchWithRegisteredAuthorityCandidateV3 options',
  );
  assertKnownKeys(
    options,
    REGISTERED_AUTHORITY_OPTION_KEYS,
    'ArenaV2LearningMatchWithRegisteredAuthorityCandidateV3 options',
  );
  for (const key of REGISTERED_AUTHORITY_OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Learning Registered Authority V3 Settlement缺少${key}。`);
    }
  }
  if (!(options.learningProfileService instanceof ArenaV2LearningProfileServiceV1)) {
    throw new TypeError('Learning Registered Authority V3 Settlement需要Learning Profile Service。');
  }
  const authorityRegistry = options.authorityRegistry;
  if (!(authorityRegistry instanceof ArenaV2ProductAuthorityRegistryCandidateV1)) {
    throw new TypeError('Learning Registered Authority V3 Settlement需要产品Authority Registry。');
  }
  const grant = prepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV3({
    profileDefinition: options.profileDefinition,
    evidenceDefinition: options.evidenceDefinition,
    authorityRegistry,
    registeredSettlementEvidence: options.registeredSettlementEvidence,
    recipientParticipantId: options.recipientParticipantId,
  });
  return options.learningProfileService.commitGrant(grant);
}

export const ARENA_V2_LEARNING_SETTLEMENT_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSessionWired: false as const,
  resolver: 'result-replay-v6-bound-learning-grant-v1' as const,
  registeredAuthorityResolver: 'registry-admission-result-replay-v6-bound-grant-v1' as const,
  preferredRuntimeResolver:
    'result-replay-v6-mode-driver-supply-ownership-bound-learning-grant-v3' as const,
  preferredRegisteredAuthorityResolver:
    'registry-admission-result-replay-v6-mode-driver-supply-ownership-bound-grant-v3' as const,
  runtimeV2CompatibilityResolverRetained: true as const,
  runtimeV2GrantPreparedBeforeRewardWrite: true as const,
  runtimeV3CompleteSupplyOwnershipPreparedBeforeRewardWrite: true as const,
  legacyUnboundSettlementDefaultWired: false as const,
  persistence: 'dual-slot-cas-lease-v1' as const,
});
