import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  assertSynchronousReturn,
  combineCleanupFailure,
  validateFinalizedMatchAssignmentV2,
  validateMatchContentSelectionV2,
  type DeepReadonly,
  type FinalizedMatchAssignmentV2,
  type MatchContentSelectionV2,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_PUBLIC_MATCH_INFO_V2_SCHEMA_VERSION,
  assertProductMatchSeed,
  createProductPublicMatchInfoV2,
  projectProductParticipantAssignmentsV2,
  type ProductPublicMatchInfoV2,
} from '@number-strategy-jump/arena-product-contracts';
import type { ModeAuthoritativeQuickMatchServiceV3 } from '@number-strategy-jump/arena-quick-match';
import {
  ArenaV2ProductAuthorityRegistryCandidateV1,
} from '@number-strategy-jump/arena-product-match';
import type {
  ArenaV2ModeLearningMatchBundleCandidateV1,
  ArenaV2ModeLearningMatchBundleFactoryPortCandidateV1,
  ArenaV2ModeLearningSessionFactoryModeKindCandidateV1,
  ArenaV2ModeLearningSessionFactoryRequestCandidateV1,
} from './arena-v2-mode-learning-session-factory-candidate-v1.js';

export const ARENA_V2_QUICK_MATCH_BUNDLE_FACTORY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1,
  status: 'production-unreachable',
  hardGate: false,
  defaultEntryWired: false,
  defaultCompositionWired: false,
  defaultNavigationWired: false,
  validationStatus: 'not-run',
  quickMatchContract: 'ModeAuthoritativeQuickMatchServiceV3',
  authorityIdentitySource: 'terminal-session-only',
  replayIdentitySource: 'terminal-session-replay-v6-only',
  runtimeTerminalEvidenceSource: 'terminal-session-mode-driver-bound-v1-compatibility',
  runtimeTerminalSupplyEvidenceSource: 'terminal-session-complete-supply-facts-v2-only',
  authorityRegistrySource: 'explicit-match-bundle-factory-option-only',
  authorityAdmissionSource:
    'validated-selection-and-runtime-mode-driver-before-bundle-transfer-v2',
  legacyModeQuickMatchServiceV2Accepted: false,
  sharedSynchronousReturnBoundaryWired: true,
  returnedRawSessionOwnedBeforeDestroyPortCapture: true,
  invalidDestroyPortRetainsRawSessionCleanupOwnership: true,
  operationGuardPrecedesStateAndRequestValidation: true,
  quickMatchParticipantAndAdmissionPortsCheckedBeforeTransfer: true,
  sessionOwnershipRetainedUntilBundlePublicationCommits: true,
  successfulPendingCleanupWatermarkPrecedesReentryRejection: true,
  stickyReentryUsesSequenceAndFirstError: true,
  supportedModeKinds: Object.freeze(['duel', 'race', 'survival'] as const),
});

export interface ArenaV2QuickMatchBundleProviderRequestCandidateV1 {
  readonly schemaVersion: 1;
  readonly generation: number;
  readonly modeKind: ArenaV2ModeLearningSessionFactoryModeKindCandidateV1;
  readonly modeDefinitionId: string;
  readonly matchSeed: number;
  readonly selection: DeepReadonly<MatchContentSelectionV2>;
  readonly finalAssignment: DeepReadonly<FinalizedMatchAssignmentV2>;
  readonly localParticipantId: string;
}

export interface ArenaV2QuickMatchBundleFactoryCandidateV1Options {
  readonly duelModeDefinitionId: unknown;
  readonly raceModeDefinitionId: unknown;
  readonly survivalModeDefinitionId: unknown;
  readonly quickMatchService: ModeAuthoritativeQuickMatchServiceV3;
  readonly authorityRegistry?: ArenaV2ProductAuthorityRegistryCandidateV1;
  readonly publicParticipantProvider: Readonly<{
    createPublicParticipants(
      request: ArenaV2QuickMatchBundleProviderRequestCandidateV1,
    ): unknown;
  }>;
}

type PortMethod = (...arguments_: readonly unknown[]) => unknown;
interface OwnedSession {
  readonly value: unknown;
  readonly destroy: PortMethod | null;
}
type QuickMatchBundleFactoryOperation = 'create-match-bundle' | 'destroy';

const OPTION_KEYS = new Set([
  'duelModeDefinitionId',
  'raceModeDefinitionId',
  'survivalModeDefinitionId',
  'quickMatchService',
  'authorityRegistry',
  'publicParticipantProvider',
]);
const REQUEST_KEYS = new Set(['schemaVersion', 'generation', 'modeKind']);
const QUICK_MATCH_KEYS = new Set([
  'modeDefinitionId',
  'matchSeed',
  'assignmentPlan',
  'selection',
  'finalAssignment',
  'session',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);

function optionRecord(value: unknown): PlainRecord {
  const name = 'Quick Match Bundle Factory options';
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, OPTION_KEYS, name);
  for (const key of [
    'duelModeDefinitionId',
    'raceModeDefinitionId',
    'survivalModeDefinitionId',
    'quickMatchService',
    'publicParticipantProvider',
  ] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
  if (Object.hasOwn(source, 'authorityRegistry')) {
    const descriptor = Object.getOwnPropertyDescriptor(source, 'authorityRegistry');
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.authorityRegistry必须是可枚举数据字段。`);
    }
  }
  return source;
}

function opaqueError(value: unknown, message: string): Error {
  const error = new Error(message);
  Object.defineProperty(error, 'cause', {
    value,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return error;
}

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
  return source;
}

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function dataMethod(target: unknown, key: string, name: string): PortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}()不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) {
      throw new TypeError(`${name}原型链无效。`);
    }
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const method = descriptor.value as PortMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(method, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${name}.${key}()不存在。`);
}

function assertSynchronous<T>(value: T, name: string): T {
  assertSynchronousReturn(value, name);
  return value;
}

function callSynchronous(
  method: PortMethod,
  arguments_: readonly unknown[],
  name: string,
): unknown {
  return assertSynchronous(method(...arguments_), name);
}

function destroyOwnedSession(owned: OwnedSession, name: string): void {
  const destroy = owned.destroy ?? dataMethod(owned.value, 'destroy', name);
  callSynchronous(destroy, [], `${name}.destroy`);
}

function modeKind(
  value: unknown,
  name: string,
): ArenaV2ModeLearningSessionFactoryModeKindCandidateV1 {
  if (!MODE_KINDS.has(value)) throw new RangeError(`${name}不受支持。`);
  return value as ArenaV2ModeLearningSessionFactoryModeKindCandidateV1;
}

function validateQuickMatch(
  value: unknown,
  expectedModeDefinitionId: string,
): Readonly<{
  matchSeed: number;
  selection: DeepReadonly<MatchContentSelectionV2>;
  finalAssignment: DeepReadonly<FinalizedMatchAssignmentV2>;
  localParticipantId: string;
}> {
  const source = exactRecord(value, QUICK_MATCH_KEYS, 'Quick Match Bundle quickMatch');
  const modeDefinitionId = assertNonEmptyString(
    dataField(source, 'modeDefinitionId', 'Quick Match Bundle quickMatch'),
    'Quick Match Bundle quickMatch.modeDefinitionId',
  );
  if (modeDefinitionId !== expectedModeDefinitionId) {
    throw new RangeError('Quick Match Bundle quickMatch Mode身份漂移。');
  }
  const matchSeed = assertProductMatchSeed(
    dataField(source, 'matchSeed', 'Quick Match Bundle quickMatch'),
    'Quick Match Bundle quickMatch.matchSeed',
  );
  const selection = validateMatchContentSelectionV2(
    dataField(source, 'selection', 'Quick Match Bundle quickMatch'),
  );
  const finalAssignment = validateFinalizedMatchAssignmentV2(
    dataField(source, 'finalAssignment', 'Quick Match Bundle quickMatch'),
  );
  if (
    selection.modeDefinitionId !== expectedModeDefinitionId
    || finalAssignment.modeDefinitionId !== expectedModeDefinitionId
    || finalAssignment.contentHash !== selection.contentHash
  ) throw new RangeError('Quick Match Bundle selection/assignment Mode或content身份漂移。');
  const humans = finalAssignment.participants.filter(
    ({ controllerKind }) => controllerKind === 'human',
  );
  if (humans.length !== 1) {
    throw new RangeError('Quick Match Bundle必须精确包含1名human。');
  }
  return Object.freeze({
    matchSeed,
    selection,
    finalAssignment,
    localParticipantId: humans[0]!.participantId,
  });
}

function providerRequest(
  generation: number,
  modeKindValue: ArenaV2ModeLearningSessionFactoryModeKindCandidateV1,
  modeDefinitionId: string,
  quickMatch: ReturnType<typeof validateQuickMatch>,
): ArenaV2QuickMatchBundleProviderRequestCandidateV1 {
  return Object.freeze({
    schemaVersion: 1,
    generation,
    modeKind: modeKindValue,
    modeDefinitionId,
    matchSeed: quickMatch.matchSeed,
    selection: quickMatch.selection,
    finalAssignment: quickMatch.finalAssignment,
    localParticipantId: quickMatch.localParticipantId,
  });
}

export class ArenaV2QuickMatchBundleFactoryCandidateV1
implements ArenaV2ModeLearningMatchBundleFactoryPortCandidateV1 {
  readonly #modeDefinitionIds: Readonly<Record<
    ArenaV2ModeLearningSessionFactoryModeKindCandidateV1,
    string
  >>;
  readonly #createQuickMatch: PortMethod;
  readonly #createPublicParticipants: PortMethod;
  readonly #authorityRegistry: ArenaV2ProductAuthorityRegistryCandidateV1 | null;
  #nextGeneration = 1;
  #operation: QuickMatchBundleFactoryOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #destroyed = false;
  #pendingCleanup: OwnedSession | null = null;

  constructor(options: ArenaV2QuickMatchBundleFactoryCandidateV1Options);
  constructor(value: unknown) {
    const source = optionRecord(value);
    const modeDefinitionIds = Object.freeze({
      duel: assertNonEmptyString(
        dataField(source, 'duelModeDefinitionId', 'Quick Match Bundle Factory options'),
        'Quick Match Bundle Factory duelModeDefinitionId',
      ),
      race: assertNonEmptyString(
        dataField(source, 'raceModeDefinitionId', 'Quick Match Bundle Factory options'),
        'Quick Match Bundle Factory raceModeDefinitionId',
      ),
      survival: assertNonEmptyString(
        dataField(source, 'survivalModeDefinitionId', 'Quick Match Bundle Factory options'),
        'Quick Match Bundle Factory survivalModeDefinitionId',
      ),
    });
    if (new Set(Object.values(modeDefinitionIds)).size !== 3) {
      throw new RangeError('Quick Match Bundle Factory三个modeDefinitionId必须唯一。');
    }
    this.#modeDefinitionIds = modeDefinitionIds;
    this.#createQuickMatch = dataMethod(
      dataField(source, 'quickMatchService', 'Quick Match Bundle Factory options'),
      'create',
      'Quick Match Bundle Factory quickMatchService',
    );
    const authorityRegistry = Object.hasOwn(source, 'authorityRegistry')
      ? dataField(source, 'authorityRegistry', 'Quick Match Bundle Factory options')
      : null;
    if (authorityRegistry !== null
      && !(authorityRegistry instanceof ArenaV2ProductAuthorityRegistryCandidateV1)) {
      throw new TypeError('Quick Match Bundle Factory authorityRegistry类型无效。');
    }
    this.#authorityRegistry = authorityRegistry;
    this.#createPublicParticipants = dataMethod(
      dataField(source, 'publicParticipantProvider', 'Quick Match Bundle Factory options'),
      'createPublicParticipants',
      'Quick Match Bundle Factory publicParticipantProvider',
    );
  }

  #rejectReentry(operation: string): never {
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `Quick Match Bundle Factory操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) this.#rejectReentry(operation);
  }

  #beginOperation(operation: QuickMatchBundleFactoryOperation): number {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    return this.#reentrySequence;
  }

  #assertReentryFree(_operation: string): void {
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  createMatchBundle(
    value: ArenaV2ModeLearningSessionFactoryRequestCandidateV1,
  ): ArenaV2ModeLearningMatchBundleCandidateV1;
  createMatchBundle(value: unknown): ArenaV2ModeLearningMatchBundleCandidateV1 {
    const reentrySequence = this.#beginOperation('create-match-bundle');
    let generation: number;
    let requestedModeKind: ArenaV2ModeLearningSessionFactoryModeKindCandidateV1;
    let modeDefinitionId: string;
    try {
      if (this.#destroyed) throw new Error('Quick Match Bundle Factory已销毁。');
      if (this.#pendingCleanup !== null) {
        throw new Error('Quick Match Bundle Factory存在未完成清理。');
      }
      const request = exactRecord(value, REQUEST_KEYS, 'Quick Match Bundle Factory request');
      if (dataField(request, 'schemaVersion', 'Quick Match Bundle Factory request') !== 1) {
        throw new RangeError('Quick Match Bundle Factory request.schemaVersion必须是1。');
      }
      generation = assertIntegerAtLeast(
        dataField(request, 'generation', 'Quick Match Bundle Factory request'),
        1,
        'Quick Match Bundle Factory request.generation',
      );
      if (generation !== this.#nextGeneration) {
        throw new RangeError(
          `Quick Match Bundle Factory generation漂移；expected=${this.#nextGeneration} actual=${generation}。`,
        );
      }
      if (generation >= Number.MAX_SAFE_INTEGER) {
        throw new RangeError('Quick Match Bundle Factory generation不能再安全递增。');
      }
      requestedModeKind = modeKind(
        dataField(request, 'modeKind', 'Quick Match Bundle Factory request'),
        'Quick Match Bundle Factory request.modeKind',
      );
      modeDefinitionId = this.#modeDefinitionIds[requestedModeKind];
      this.#assertReentryFree('Quick Match Bundle Factory request validation');
    } catch (error) {
      this.#operation = null;
      throw error;
    }
    let ownedSession: OwnedSession | null = null;
    try {
      const rawQuickMatch = callSynchronous(
        this.#createQuickMatch,
        [Object.freeze({ modeDefinitionId })],
        'Quick Match Bundle Factory quickMatchService.create',
      );
      const preliminary = assertPlainRecord(rawQuickMatch, 'Quick Match Bundle quickMatch');
      const session = dataField(preliminary, 'session', 'Quick Match Bundle quickMatch');
      ownedSession = Object.freeze({
        value: session,
        destroy: null,
      });
      this.#assertReentryFree('Quick Match Bundle Factory quickMatch owner capture');
      ownedSession = Object.freeze({
        value: session,
        destroy: dataMethod(session, 'destroy', 'Quick Match Bundle session'),
      });
      const terminalIdentity = dataMethod(
        session,
        'getTerminalAuthorityIdentity',
        'Quick Match Bundle authoritative V3 session',
      );
      const getModeDriverContentHash = dataMethod(
        session,
        'getModeDriverContentHash',
        'Quick Match Bundle authoritative V3 session',
      );
      dataMethod(
        session,
        'getTerminalReplayV6',
        'Quick Match Bundle authoritative V3 session',
      );
      dataMethod(
        session,
        'getTerminalRuntimeEvidenceV1',
        'Quick Match Bundle authoritative V3 session',
      );
      dataMethod(
        session,
        'getTerminalRuntimeEvidenceV2',
        'Quick Match Bundle authoritative V3 session',
      );
      const quickMatch = validateQuickMatch(rawQuickMatch, modeDefinitionId);
      this.#assertReentryFree('Quick Match Bundle Factory quickMatch validation');
      const context = providerRequest(
        generation,
        requestedModeKind,
        modeDefinitionId,
        quickMatch,
      );
      const publicParticipants = callSynchronous(
        this.#createPublicParticipants,
        [context],
        'Quick Match Bundle Factory publicParticipantProvider',
      );
      this.#assertReentryFree('Quick Match Bundle Factory publicParticipantProvider');
      const publicMatchInfo: DeepReadonly<ProductPublicMatchInfoV2> =
        createProductPublicMatchInfoV2({
          schemaVersion: PRODUCT_PUBLIC_MATCH_INFO_V2_SCHEMA_VERSION,
          modeDefinitionId,
          matchSeed: quickMatch.matchSeed,
          localParticipantId: quickMatch.localParticipantId,
          content: quickMatch.selection,
          participantAssignments: projectProductParticipantAssignmentsV2(
            quickMatch.finalAssignment,
          ),
          publicParticipants,
        });
      if (publicMatchInfo.localParticipantId !== quickMatch.localParticipantId) {
        throw new RangeError('Quick Match Bundle recipient与human local participant漂移。');
      }
      this.#assertReentryFree('Quick Match Bundle Factory public match projection');
      const authorityIdentity = Object.freeze({ getTerminalAuthorityIdentity: terminalIdentity });
      const modeDriverContentHash = callSynchronous(
        getModeDriverContentHash,
        [],
        'Quick Match Bundle authoritative V3 mode driver content hash',
      );
      this.#assertReentryFree('Quick Match Bundle Factory mode driver content hash');
      const authorityAdmission = this.#authorityRegistry === null
        ? null
        : this.#authorityRegistry.admitMatchV2({
          modeKind: requestedModeKind,
          modeDefinitionId,
          matchSeed: quickMatch.matchSeed,
          content: quickMatch.selection,
          finalAssignment: quickMatch.finalAssignment,
          modeDriverContentHash,
        });
      this.#assertReentryFree('Quick Match Bundle Factory authority admission');
      const bundle = Object.freeze({
        schemaVersion: 1 as const,
        generation,
        modeKind: requestedModeKind,
        modeDefinitionId,
        matchSession: ownedSession.value,
        publicMatchInfo,
        authorityIdentity,
        authorityRegistry: this.#authorityRegistry,
        authorityAdmission,
        recipientParticipantId: quickMatch.localParticipantId,
      });
      this.#nextGeneration += 1;
      this.#assertReentryFree('Quick Match Bundle Factory bundle publication');
      ownedSession = null;
      return bundle;
    } catch (error) {
      const original = opaqueError(error, 'Quick Match Bundle Factory创建失败。');
      const cleanupErrors: Error[] = [];
      if (ownedSession !== null) {
        try {
          destroyOwnedSession(ownedSession, 'Quick Match Bundle Factory session');
        } catch (cleanupError) {
          this.#pendingCleanup = ownedSession;
          cleanupErrors.push(opaqueError(
            cleanupError,
            'Quick Match Bundle Factory session清理失败。',
          ));
        }
      }
      if (
        this.#reentrySequence !== reentrySequence
        && this.#reentryError !== null
        && !cleanupErrors.includes(this.#reentryError)
      ) {
        cleanupErrors.push(this.#reentryError);
      }
      throw combineCleanupFailure(
        original,
        cleanupErrors,
        'Quick Match Bundle Factory创建失败且清理不完整。',
      );
    } finally {
      this.#operation = null;
    }
  }

  destroy(): void {
    this.#assertNoOperation('destroy');
    if (this.#destroyed && this.#pendingCleanup === null) return;
    this.#beginOperation('destroy');
    try {
      const pending = this.#pendingCleanup;
      if (pending !== null) {
        destroyOwnedSession(pending, 'Quick Match Bundle Factory pending session');
        this.#pendingCleanup = null;
      }
      this.#destroyed = true;
      this.#assertReentryFree('Quick Match Bundle Factory pending cleanup');
      this.#assertReentryFree('Quick Match Bundle Factory destroy publication');
    } catch (error) {
      throw opaqueError(error, 'Quick Match Bundle Factory destroy失败，保留清理所有权。');
    } finally {
      this.#operation = null;
    }
  }
}
