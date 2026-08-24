import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  assertSynchronousReturn,
  combineCleanupFailure,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { ArenaV2LearningProfileServiceV1 } from '@number-strategy-jump/arena-profile-service';
import {
  ArenaV2ProductAuthorityRegistryCandidateV1,
} from '@number-strategy-jump/arena-product-match';
import {
  ArenaV2LearningModeSessionBridgeCandidateV1,
} from './arena-v2-learning-mode-session-bridge-candidate-v1.js';
import {
  ArenaV2HudReadyLearningModeSessionCandidateV1,
} from './arena-v2-hud-ready-learning-mode-session-candidate-v1.js';
import {
  ArenaV2LearningTerminalHandoffCandidateV1,
} from './arena-v2-learning-terminal-handoff-candidate-v1.js';
import { createModeProductSessionCompositionV2 } from './mode-product-session-composition-v2.js';

export type ArenaV2ModeLearningSessionFactoryModeKindCandidateV1 =
  'duel' | 'race' | 'survival';

export interface ArenaV2ModeLearningSessionFactoryRequestCandidateV1 {
  readonly schemaVersion: 1;
  readonly generation: number;
  readonly modeKind: ArenaV2ModeLearningSessionFactoryModeKindCandidateV1;
}

export interface ArenaV2ModeLearningMatchBundleCandidateV1 {
  readonly schemaVersion: 1;
  readonly generation: number;
  readonly modeKind: ArenaV2ModeLearningSessionFactoryModeKindCandidateV1;
  readonly modeDefinitionId: string;
  readonly matchSession: unknown;
  readonly publicMatchInfo: unknown;
  readonly authorityIdentity: unknown;
  readonly authorityRegistry: ArenaV2ProductAuthorityRegistryCandidateV1 | null;
  readonly authorityAdmission: unknown | null;
  readonly recipientParticipantId: string;
}

export interface ArenaV2ModeLearningMatchBundleFactoryPortCandidateV1 {
  createMatchBundle(
    request: ArenaV2ModeLearningSessionFactoryRequestCandidateV1,
  ): ArenaV2ModeLearningMatchBundleCandidateV1;
}

type PortMethod = (...args: readonly unknown[]) => unknown;

interface PendingCleanupResource {
  readonly target: unknown;
  readonly name: string;
}
type ModeLearningSessionFactoryOperation = 'create-session' | 'destroy';

const OPTION_KEYS = new Set([
  'matchBundleFactory',
  'progressionRegistry',
  'rewardProfileDefinition',
  'rewardProfileService',
  'learningProfileDefinition',
  'learningEvidenceDefinition',
  'learningProfileService',
  'maxEventCount',
  'onSettlementIntentPrepared',
]);
const OPTION_REQUIRED_KEYS = new Set([
  'matchBundleFactory',
  'progressionRegistry',
  'rewardProfileDefinition',
  'rewardProfileService',
  'learningProfileDefinition',
  'learningEvidenceDefinition',
  'learningProfileService',
  'maxEventCount',
]);
const DEPENDENCY_PREFLIGHT_KEYS = new Set([
  'progressionRegistry',
  'rewardProfileDefinition',
  'rewardProfileService',
  'learningProfileDefinition',
  'learningEvidenceDefinition',
  'learningProfileService',
  'maxEventCount',
  'onSettlementIntentPrepared',
]);
const DEPENDENCY_PREFLIGHT_REQUIRED_KEYS = new Set([
  'progressionRegistry',
  'rewardProfileDefinition',
  'rewardProfileService',
  'learningProfileDefinition',
  'learningEvidenceDefinition',
  'learningProfileService',
  'maxEventCount',
]);
const REQUEST_KEYS = new Set(['schemaVersion', 'generation', 'modeKind']);
const BUNDLE_KEYS = new Set([
  'schemaVersion',
  'generation',
  'modeKind',
  'modeDefinitionId',
  'matchSession',
  'publicMatchInfo',
  'authorityIdentity',
  'authorityRegistry',
  'authorityAdmission',
  'recipientParticipantId',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);

function exact(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
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

function field(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function method(target: unknown, key: string, name: string): PortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const value = descriptor.value as PortMethod;
      return (...args: readonly unknown[]) => Reflect.apply(value, target, args);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${name}.${key}不存在。`);
}

function call(portMethod: PortMethod, args: readonly unknown[], name: string): unknown {
  const value = portMethod(...args);
  assertSynchronousReturn(value, name);
  return value;
}

function wrapped(error: unknown, message: string): Error {
  const result = new Error(message);
  Object.defineProperty(result, 'cause', { value: error, enumerable: false });
  return result;
}

function modeKind(value: unknown, name: string): ArenaV2ModeLearningSessionFactoryModeKindCandidateV1 {
  if (!MODE_KINDS.has(value)) throw new RangeError(`${name}不受支持。`);
  return value as ArenaV2ModeLearningSessionFactoryModeKindCandidateV1;
}

function validatePublicIdentity(
  publicMatchInfo: unknown,
  modeDefinitionId: string,
  recipientParticipantId: string,
): void {
  const source = assertPlainRecord(
    publicMatchInfo,
    'Mode Learning Session Factory publicMatchInfo',
  );
  if (field(source, 'modeDefinitionId', 'Mode Learning Session Factory publicMatchInfo')
    !== modeDefinitionId) {
    throw new RangeError('Mode Learning Session Factory public mode身份漂移。');
  }
  if (field(source, 'localParticipantId', 'Mode Learning Session Factory publicMatchInfo')
    !== recipientParticipantId) {
    throw new RangeError('Mode Learning Session Factory recipient必须是本地participant。');
  }
}

export interface ArenaV2ModeLearningSessionFactoryDependencyPreflightCandidateV1 {
  readonly progressionRegistry: unknown;
  readonly rewardProfileDefinition: unknown;
  readonly rewardProfileService: unknown;
  readonly learningProfileDefinition: unknown;
  readonly learningEvidenceDefinition: unknown;
  readonly learningProfileService: ArenaV2LearningProfileServiceV1;
  readonly onSettlementIntentPrepared: (...args: readonly unknown[]) => unknown;
  readonly maxEventCount: number;
}

export function preflightArenaV2ModeLearningSessionFactoryDependenciesCandidateV1(
  value: unknown,
): ArenaV2ModeLearningSessionFactoryDependencyPreflightCandidateV1 {
  const source = (() => {
    const options = assertPlainRecord(
      value,
      'Mode Learning Session Factory dependency preflight',
    );
    assertKnownKeys(
      options,
      DEPENDENCY_PREFLIGHT_KEYS,
      'Mode Learning Session Factory dependency preflight',
    );
    for (const key of DEPENDENCY_PREFLIGHT_REQUIRED_KEYS) {
      field(options, key, 'Mode Learning Session Factory dependency preflight');
    }
    return options;
  })();
  const learningProfileService = field(
    source,
    'learningProfileService',
    'Mode Learning Session Factory dependency preflight',
  );
  if (!(learningProfileService instanceof ArenaV2LearningProfileServiceV1)) {
    throw new TypeError('Mode Learning Session Factory需要Learning Profile Service V1。');
  }
  const onSettlementIntentPrepared = Object.hasOwn(source, 'onSettlementIntentPrepared')
    ? field(
      source,
      'onSettlementIntentPrepared',
      'Mode Learning Session Factory dependency preflight',
    )
    : () => undefined;
  if (typeof onSettlementIntentPrepared !== 'function') {
    throw new TypeError('Mode Learning Session Factory onSettlementIntentPrepared必须是函数。');
  }
  const maxEventCount = assertIntegerAtLeast(
    field(source, 'maxEventCount', 'Mode Learning Session Factory dependency preflight'),
    1,
    'Mode Learning Session Factory maxEventCount',
  );
  if (maxEventCount > 1_000_000) {
    throw new RangeError('Mode Learning Session Factory maxEventCount超过上限。');
  }
  return Object.freeze({
    progressionRegistry: field(
      source,
      'progressionRegistry',
      'Mode Learning Session Factory dependency preflight',
    ),
    rewardProfileDefinition: field(
      source,
      'rewardProfileDefinition',
      'Mode Learning Session Factory dependency preflight',
    ),
    rewardProfileService: field(
      source,
      'rewardProfileService',
      'Mode Learning Session Factory dependency preflight',
    ),
    learningProfileDefinition: field(
      source,
      'learningProfileDefinition',
      'Mode Learning Session Factory dependency preflight',
    ),
    learningEvidenceDefinition: field(
      source,
      'learningEvidenceDefinition',
      'Mode Learning Session Factory dependency preflight',
    ),
    learningProfileService,
    onSettlementIntentPrepared: onSettlementIntentPrepared as PortMethod,
    maxEventCount,
  });
}

/**
 * Candidate-only factory used by the information host. A bundle factory owns
 * mode-specific Match construction; this class only joins that authority to
 * the existing reward session and complete-event learning handoff.
 */
export class ArenaV2ModeLearningSessionFactoryCandidateV1 {
  readonly #createMatchBundle: PortMethod;
  readonly #progressionRegistry: unknown;
  readonly #rewardProfileDefinition: unknown;
  readonly #rewardProfileService: unknown;
  readonly #learningProfileDefinition: unknown;
  readonly #learningEvidenceDefinition: unknown;
  readonly #learningProfileService: ArenaV2LearningProfileServiceV1;
  readonly #onSettlementIntentPrepared: PortMethod;
  readonly #maxEventCount: number;
  #nextGeneration = 1;
  #operation: ModeLearningSessionFactoryOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #pendingCleanupResources: PendingCleanupResource[] = [];
  #destroyed = false;

  constructor(value: unknown) {
    const source = (() => {
      const options = assertPlainRecord(value, 'Mode Learning Session Factory options');
      assertKnownKeys(options, OPTION_KEYS, 'Mode Learning Session Factory options');
      for (const key of OPTION_REQUIRED_KEYS) {
        field(options, key, 'Mode Learning Session Factory options');
      }
      return options;
    })();
    this.#createMatchBundle = method(
      field(source, 'matchBundleFactory', 'Mode Learning Session Factory options'),
      'createMatchBundle',
      'Mode Learning Session Factory matchBundleFactory',
    );
    const dependencies = preflightArenaV2ModeLearningSessionFactoryDependenciesCandidateV1({
      progressionRegistry: field(
        source,
        'progressionRegistry',
        'Mode Learning Session Factory options',
      ),
      rewardProfileDefinition: field(
        source,
        'rewardProfileDefinition',
        'Mode Learning Session Factory options',
      ),
      rewardProfileService: field(
        source,
        'rewardProfileService',
        'Mode Learning Session Factory options',
      ),
      learningProfileDefinition: field(
        source,
        'learningProfileDefinition',
        'Mode Learning Session Factory options',
      ),
      learningEvidenceDefinition: field(
        source,
        'learningEvidenceDefinition',
        'Mode Learning Session Factory options',
      ),
      learningProfileService: field(
        source,
        'learningProfileService',
        'Mode Learning Session Factory options',
      ),
      maxEventCount: field(source, 'maxEventCount', 'Mode Learning Session Factory options'),
      ...(Object.hasOwn(source, 'onSettlementIntentPrepared')
        ? {
          onSettlementIntentPrepared: field(
            source,
            'onSettlementIntentPrepared',
            'Mode Learning Session Factory options',
          ),
        }
        : {}),
    });
    this.#progressionRegistry = dependencies.progressionRegistry;
    this.#rewardProfileDefinition = dependencies.rewardProfileDefinition;
    this.#rewardProfileService = dependencies.rewardProfileService;
    this.#learningProfileDefinition = dependencies.learningProfileDefinition;
    this.#learningEvidenceDefinition = dependencies.learningEvidenceDefinition;
    this.#learningProfileService = dependencies.learningProfileService;
    this.#onSettlementIntentPrepared = dependencies.onSettlementIntentPrepared;
    this.#maxEventCount = dependencies.maxEventCount;
  }

  #rejectReentry(operation: string): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Mode Learning Session Factory操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) this.#rejectReentry(operation);
  }

  #beginOperation(operation: ModeLearningSessionFactoryOperation): number {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    return this.#reentrySequence;
  }

  #assertCurrentOperationCommit(operation: string): void {
    if (this.#operation === null) throw new Error(`${operation}缺少当前操作所有权。`);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #callChecked(methodValue: PortMethod, args: readonly unknown[], name: string): unknown {
    try {
      const result = call(methodValue, args, name);
      this.#assertCurrentOperationCommit(name);
      return result;
    } catch (error) {
      this.#assertCurrentOperationCommit(name);
      throw error;
    }
  }

  #destroyChecked(target: unknown, name: string): Error[] {
    try {
      const destroy = method(target, 'destroy', name);
      this.#assertCurrentOperationCommit(`${name}.destroy端口捕获`);
      this.#callChecked(destroy, [], `${name}.destroy`);
      return [];
    } catch (error) {
      try {
        this.#assertCurrentOperationCommit(`${name}.destroy失败`);
      } catch (reentryError) {
        return [wrapped(reentryError, `${name}清理反调。`)];
      }
      return [wrapped(error, `${name}清理失败。`)];
    }
  }

  #retainCleanupResource(target: unknown, name: string): void {
    if (this.#pendingCleanupResources.some((resource) => Object.is(resource.target, target))) {
      return;
    }
    this.#pendingCleanupResources.push(Object.freeze({ target, name }));
  }

  #releaseOrRetain(target: unknown, name: string): Error[] {
    const errors = this.#destroyChecked(target, name);
    if (errors.length > 0) this.#retainCleanupResource(target, name);
    return errors;
  }

  #releasePendingCleanupResources(): Error[] {
    const errors: Error[] = [];
    const retained: PendingCleanupResource[] = [];
    const pending = this.#pendingCleanupResources;
    for (let index = 0; index < pending.length; index += 1) {
      const resource = pending[index]!;
      const resourceErrors = this.#destroyChecked(resource.target, resource.name);
      if (resourceErrors.length > 0) {
        retained.push(resource);
        errors.push(...resourceErrors);
      }
      this.#pendingCleanupResources = [
        ...retained,
        ...pending.slice(index + 1),
      ];
      if (this.#reentryError !== null) {
        if (this.#reentryError !== null && !errors.includes(this.#reentryError)) {
          errors.push(this.#reentryError);
        }
        return errors;
      }
    }
    this.#pendingCleanupResources = retained;
    return errors;
  }

  createSession(value: unknown): ArenaV2HudReadyLearningModeSessionCandidateV1 {
    const reentrySequence = this.#beginOperation('create-session');
    let generation: number;
    let requestedModeKind: ArenaV2ModeLearningSessionFactoryModeKindCandidateV1;
    try {
      if (this.#destroyed) throw new Error('Mode Learning Session Factory已销毁。');
      const request = exact(value, REQUEST_KEYS, 'Mode Learning Session Factory request');
      if (field(request, 'schemaVersion', 'Mode Learning Session Factory request') !== 1) {
        throw new RangeError('Mode Learning Session Factory request.schemaVersion必须是1。');
      }
      generation = assertIntegerAtLeast(
        field(request, 'generation', 'Mode Learning Session Factory request'),
        1,
        'Mode Learning Session Factory request.generation',
      );
      if (generation !== this.#nextGeneration) {
        throw new RangeError(
          `Mode Learning Session Factory generation漂移；expected=${this.#nextGeneration} actual=${generation}。`,
        );
      }
      requestedModeKind = modeKind(
        field(request, 'modeKind', 'Mode Learning Session Factory request'),
        'Mode Learning Session Factory request.modeKind',
      );
      this.#assertCurrentOperationCommit('Mode Learning Session Factory request validation');
    } catch (error) {
      this.#operation = null;
      throw error;
    }
    let matchSession: unknown = null;
    let modeSession: ReturnType<typeof createModeProductSessionCompositionV2> | null = null;
    let learningHandoff: ArenaV2LearningTerminalHandoffCandidateV1 | null = null;
    let bridge: ArenaV2LearningModeSessionBridgeCandidateV1 | null = null;
    let result: ArenaV2HudReadyLearningModeSessionCandidateV1 | null = null;
    try {
      const priorCleanupErrors = this.#releasePendingCleanupResources();
      if (priorCleanupErrors.length > 0) {
        throw combineCleanupFailure(
          new Error('Mode Learning Session Factory存在未收口的历史资源。'),
          priorCleanupErrors,
          'Mode Learning Session Factory历史资源清理不完整。',
        );
      }
      this.#assertCurrentOperationCommit('Mode Learning Session Factory historical cleanup');
      const rawBundle = this.#callChecked(
        this.#createMatchBundle,
        [Object.freeze({ schemaVersion: 1 as const, generation, modeKind: requestedModeKind })],
        'Mode Learning Session Factory createMatchBundle',
      );
      const preliminaryBundle = assertPlainRecord(
        rawBundle,
        'Mode Learning Session Factory bundle',
      );
      matchSession = field(
        preliminaryBundle,
        'matchSession',
        'Mode Learning Session Factory bundle',
      );
      this.#assertCurrentOperationCommit('Mode Learning Session Factory match bundle owner capture');
      method(matchSession, 'destroy', 'Mode Learning Session Factory matchSession');
      this.#assertCurrentOperationCommit('Mode Learning Session Factory matchSession destroy端口预检');
      const bundle = exact(rawBundle, BUNDLE_KEYS, 'Mode Learning Session Factory bundle');
      this.#assertCurrentOperationCommit('Mode Learning Session Factory match bundle validation');
      if (field(bundle, 'schemaVersion', 'Mode Learning Session Factory bundle') !== 1) {
        throw new RangeError('Mode Learning Session Factory bundle.schemaVersion必须是1。');
      }
      if (field(bundle, 'generation', 'Mode Learning Session Factory bundle') !== generation) {
        throw new RangeError('Mode Learning Session Factory bundle generation漂移。');
      }
      const bundledModeKind = modeKind(
        field(bundle, 'modeKind', 'Mode Learning Session Factory bundle'),
        'Mode Learning Session Factory bundle.modeKind',
      );
      if (bundledModeKind !== requestedModeKind) {
        throw new RangeError('Mode Learning Session Factory bundle modeKind漂移。');
      }
      const modeDefinitionId = assertNonEmptyString(
        field(bundle, 'modeDefinitionId', 'Mode Learning Session Factory bundle'),
        'Mode Learning Session Factory bundle.modeDefinitionId',
      );
      const recipientParticipantId = assertNonEmptyString(
        field(bundle, 'recipientParticipantId', 'Mode Learning Session Factory bundle'),
        'Mode Learning Session Factory bundle.recipientParticipantId',
      );
      const publicMatchInfo = field(
        bundle,
        'publicMatchInfo',
        'Mode Learning Session Factory bundle',
      );
      validatePublicIdentity(publicMatchInfo, modeDefinitionId, recipientParticipantId);
      const authorityRegistry = field(
        bundle,
        'authorityRegistry',
        'Mode Learning Session Factory bundle',
      );
      const authorityAdmission = field(
        bundle,
        'authorityAdmission',
        'Mode Learning Session Factory bundle',
      );
      if ((authorityRegistry === null) !== (authorityAdmission === null)) {
        throw new RangeError('Mode Learning Session Factory Authority Registry与Admission必须成对出现。');
      }
      if (authorityRegistry !== null
        && !(authorityRegistry instanceof ArenaV2ProductAuthorityRegistryCandidateV1)) {
        throw new TypeError('Mode Learning Session Factory bundle Authority Registry类型无效。');
      }
      if (authorityRegistry !== null) {
        const admission = authorityRegistry.validateAdmissionV2(authorityAdmission);
        this.#assertCurrentOperationCommit('Mode Learning Session Factory authority admission');
        if (admission.modeKind !== bundledModeKind
          || admission.modeDefinitionId !== modeDefinitionId) {
          throw new RangeError('Mode Learning Session Factory Authority Admission模式漂移。');
        }
      }
      this.#assertCurrentOperationCommit('Mode Learning Session Factory authority admission');

      modeSession = createModeProductSessionCompositionV2({
        modeDefinitionId,
        modeKind: bundledModeKind,
        matchSession,
        publicMatchInfo,
        authorityIdentity: field(
          bundle,
          'authorityIdentity',
          'Mode Learning Session Factory bundle',
        ),
        progressionRegistry: this.#progressionRegistry,
        profileDefinition: this.#rewardProfileDefinition,
        profileService: this.#rewardProfileService,
        recipientParticipantId,
      });
      matchSession = null;
      this.#assertCurrentOperationCommit('Mode Learning Session Factory mode session composition');
      learningHandoff = new ArenaV2LearningTerminalHandoffCandidateV1({
        profileDefinition: this.#learningProfileDefinition,
        evidenceDefinition: this.#learningEvidenceDefinition,
        learningProfileService: this.#learningProfileService,
        authorityRegistry,
        authorityAdmission,
        recipientParticipantId,
        maxEventCount: this.#maxEventCount,
      });
      this.#assertCurrentOperationCommit('Mode Learning Session Factory learning handoff construction');

      bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
        session: modeSession,
        learningHandoff,
        onSettlementIntentPrepared: this.#onSettlementIntentPrepared,
      });
      modeSession = null;
      learningHandoff = null;
      this.#assertCurrentOperationCommit('Mode Learning Session Factory bridge construction');
      result = new ArenaV2HudReadyLearningModeSessionCandidateV1({
        session: bridge,
        publicMatchInfo,
      });
      bridge = null;
      this.#assertCurrentOperationCommit('Mode Learning Session Factory HUD-ready construction');
      this.#assertCurrentOperationCommit('Mode Learning Session Factory session publication');
      this.#nextGeneration += 1;
      const transferredResult = result;
      result = null;
      return transferredResult;
    } catch (error) {
      const cleanupErrors: Error[] = [];
      const cleanupCandidates: PendingCleanupResource[] = result !== null
        ? [Object.freeze({
          target: result,
          name: 'Mode Learning Session Factory HUD-ready session',
        })]
        : bridge !== null
          ? [Object.freeze({
            target: bridge,
            name: 'Mode Learning Session Factory bridge',
          })]
          : [
            ...(learningHandoff === null ? [] : [Object.freeze({
              target: learningHandoff,
              name: 'Mode Learning Session Factory learningHandoff',
            })]),
            ...(modeSession === null ? [] : [Object.freeze({
              target: modeSession,
              name: 'Mode Learning Session Factory modeSession',
            })]),
            ...(matchSession === null ? [] : [Object.freeze({
              target: matchSession,
              name: 'Mode Learning Session Factory matchSession',
            })]),
          ];
      if (this.#reentryError !== null) {
        for (const candidate of cleanupCandidates) {
          this.#retainCleanupResource(candidate.target, candidate.name);
        }
      } else {
        for (let index = 0; index < cleanupCandidates.length; index += 1) {
          const candidate = cleanupCandidates[index]!;
          cleanupErrors.push(...this.#releaseOrRetain(candidate.target, candidate.name));
          if (this.#reentryError !== null) {
            for (const remaining of cleanupCandidates.slice(index + 1)) {
              this.#retainCleanupResource(remaining.target, remaining.name);
            }
            break;
          }
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
        wrapped(error, 'Mode Learning Session Factory创建失败。'),
        cleanupErrors,
        'Mode Learning Session Factory创建失败且清理不完整。',
      );
    } finally {
      this.#operation = null;
    }
  }

  destroy(): void {
    this.#assertNoOperation('destroy');
    if (this.#destroyed) return;
    this.#beginOperation('destroy');
    try {
      const cleanupErrors = this.#releasePendingCleanupResources();
      if (cleanupErrors.length > 0) {
        throw combineCleanupFailure(
          new Error('Mode Learning Session Factory销毁失败。'),
          cleanupErrors,
          'Mode Learning Session Factory销毁清理不完整。',
        );
      }
      this.#destroyed = true;
    } finally {
      this.#operation = null;
    }
  }
}

export const ARENA_V2_MODE_LEARNING_SESSION_FACTORY_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultCompositionWired: false as const,
  defaultNavigationWired: false as const,
  supportedModeKinds: Object.freeze(['duel', 'race', 'survival'] as const),
  ownsRuleOrMatchAuthority: false as const,
  settlementOrder: 'mode-reward-then-learning-grant' as const,
  registeredAuthorityAdmissionVersion: 2 as const,
  registeredAuthorityAdmissionValidatedBeforeMatchTransfer: true as const,
  preparedRewardAndLearningSettlementIntentPublisherWired: true as const,
  preservesAuthorityAuditForHud: true as const,
  exposesValidatedHudProjection: true as const,
  dependencyPreflightCapturesBeforeSessionCreation: true as const,
  sharedSynchronousReturnBoundaryWired: true as const,
  failedConstructionCleanupRetainsRetryOwnership: true as const,
  nextCreationClosesHistoricalCleanupDebtFirst: true as const,
  operationGuardPrecedesStateAndRequestValidation: true as const,
  childOwnershipTransfersCheckedBeforeNextConstructionStage: true as const,
  swallowedCleanupReentryRetainsAllUnprocessedOwners: true as const,
  successfulCleanupWatermarkPrecedesReentryRejection: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  constructionCallbacksCheckedBeforeGenerationCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterFactoryOwners: true as const,
  outerOwnerMustDestroyFactoryAfterSessionHost: true as const,
  validationStatus: 'not-run' as const,
});
