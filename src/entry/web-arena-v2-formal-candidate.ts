import '../arena-v2-formal-candidate.css';
import {
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import { SequentialMatchSeedSource } from '@number-strategy-jump/arena-matchmaking';
import {
  ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1,
  ArenaV2FormalWebPlayableCompositionCandidateV1,
  type ArenaV2FormalWebWeaponResearchPacePageBaselineTokenCandidateV1,
} from './arena-v2-formal-web-playable-composition-candidate-v1.js';

const DEFAULT_INITIAL_SEED = 0x4152454e;
const LOCAL_RETENTION_SUBJECT_KEY =
  'arena.v2.formal-web-development.retention-subject.v1';
const LOCAL_RETENTION_JOURNAL_KEY_PREFIX =
  'arena.v2.formal-web-development.retention-journal.v1';
const LOCAL_RETENTION_WEAPON_RESEARCH_PACE_BASELINE_KEY =
  `${LOCAL_RETENTION_JOURNAL_KEY_PREFIX}.weapon-research-pace-baseline`;

type LocalStoragePort = Readonly<{
  storageRead(key: string): Readonly<{ ok: boolean; found: boolean; value: unknown }>;
  storageWrite(key: string, value: unknown): boolean;
  storageDelete(key: string): boolean;
}>;

type EntrySynchronousOperation =
  | 'bootstrap'
  | 'failure-commit'
  | 'preparation-start'
  | 'preparation-success'
  | 'preparation-owner-publication'
  | 'preparation-owner-settlement'
  | 'activation-start'
  | 'activation-success'
  | 'activation-owner-publication'
  | 'activation-owner-settlement'
  | 'pagehide'
  | 'pageshow'
  | 'retention-read'
  | 'retention-calibration-read'
  | 'retention-weapon-pace-read'
  | 'dispose';

function deferred<T>(): Readonly<{
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return Object.freeze({ promise, resolve, reject });
}

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = globalThis.document?.querySelector<T>(selector);
  if (!element) throw new Error(`Arena V2 formal candidate缺少${selector}。`);
  return element;
}

function initialSeed(search: string): number {
  const raw = new URLSearchParams(search).get('seed');
  if (raw === null) return DEFAULT_INITIAL_SEED;
  const value = /^0x[\da-f]+$/iu.test(raw) ? Number.parseInt(raw.slice(2), 16) : Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError('Arena V2 formal candidate seed必须是uint32。');
  }
  return value;
}

function inputMode(search: string): 'adaptive' | 'keyboard' | 'pointer' {
  const value = new URLSearchParams(search).get('input') ?? 'adaptive';
  if (value !== 'adaptive' && value !== 'keyboard' && value !== 'pointer') {
    throw new RangeError('Arena V2 formal candidate input必须是adaptive、keyboard或pointer。');
  }
  return value;
}

function retentionMode(search: string): 'off' | 'local' {
  const value = new URLSearchParams(search).get('retention') ?? 'local';
  if (value !== 'off' && value !== 'local') {
    throw new RangeError('Arena V2 formal candidate retention必须是off或local。');
  }
  return value;
}

function localStoragePort(windowObject: Window): LocalStoragePort {
  let storage: Storage | null;
  try { storage = windowObject.localStorage; } catch { storage = null; }
  return Object.freeze({
    storageRead(key: string) {
      try {
        const value = storage?.getItem(key) ?? null;
        return value === null
          ? Object.freeze({ ok: true, found: false, value: undefined })
          : Object.freeze({ ok: true, found: true, value: JSON.parse(value) });
      } catch {
        return Object.freeze({ ok: false, found: false, value: undefined });
      }
    },
    storageWrite(key: string, value: unknown) {
      try {
        if (storage === null) return false;
        const serialized = JSON.stringify(value);
        if (typeof serialized !== 'string') return false;
        storage.setItem(key, serialized);
        return true;
      } catch {
        return false;
      }
    },
    storageDelete(key: string) {
      try {
        if (storage === null) return false;
        storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  });
}

function retainedSubjectId(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 3
    || !keys.includes('schemaVersion')
    || !keys.includes('status')
    || !keys.includes('subjectId')) return null;
  const source = value as Record<string, unknown>;
  if (source.schemaVersion !== 1 || source.status !== 'pseudonymous-local-development') {
    return null;
  }
  return typeof source.subjectId === 'string'
    && /^arena-v2-local-[\da-f]{32}$/u.test(source.subjectId)
    ? source.subjectId
    : null;
}

function createRandomSubjectId(windowObject: Window): string | null {
  let cryptoObject: Crypto;
  try { cryptoObject = windowObject.crypto; } catch { return null; }
  if (typeof cryptoObject?.getRandomValues !== 'function') return null;
  const bytes = new Uint8Array(16);
  try { cryptoObject.getRandomValues(bytes); } catch { return null; }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  return `arena-v2-local-${[...bytes]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

function localRetentionJournalOptions(
  storage: LocalStoragePort,
  windowObject: Window,
  enabled: boolean,
  leaseTakeoverSameOwner: boolean,
): Readonly<{
  readonly options: Readonly<Record<string, unknown>> | null;
  readonly status: 'off' | 'ready' | 'storage-unavailable' | 'identity-unavailable';
}> {
  if (!enabled) return Object.freeze({ options: null, status: 'off' as const });
  const read = storage.storageRead(LOCAL_RETENTION_SUBJECT_KEY);
  if (!read.ok) {
    return Object.freeze({ options: null, status: 'storage-unavailable' as const });
  }
  let subjectId = read.found ? retainedSubjectId(read.value) : null;
  if (read.found && subjectId === null) {
    return Object.freeze({ options: null, status: 'identity-unavailable' as const });
  }
  if (subjectId === null) {
    const orphanedJournal = storage.storageRead(`${LOCAL_RETENTION_JOURNAL_KEY_PREFIX}.journal`);
    const orphanedWeaponPaceBaseline = storage.storageRead(
      LOCAL_RETENTION_WEAPON_RESEARCH_PACE_BASELINE_KEY,
    );
    if (!orphanedJournal.ok || !orphanedWeaponPaceBaseline.ok) {
      return Object.freeze({ options: null, status: 'storage-unavailable' as const });
    }
    if (orphanedJournal.found || orphanedWeaponPaceBaseline.found) {
      return Object.freeze({ options: null, status: 'identity-unavailable' as const });
    }
    subjectId = createRandomSubjectId(windowObject);
    if (subjectId === null) {
      return Object.freeze({ options: null, status: 'identity-unavailable' as const });
    }
    const stored = Object.freeze({
      schemaVersion: 1 as const,
      status: 'pseudonymous-local-development' as const,
      subjectId,
    });
    if (!storage.storageWrite(LOCAL_RETENTION_SUBJECT_KEY, stored)) {
      return Object.freeze({ options: null, status: 'storage-unavailable' as const });
    }
    const confirmed = storage.storageRead(LOCAL_RETENTION_SUBJECT_KEY);
    if (!confirmed.ok || !confirmed.found || retainedSubjectId(confirmed.value) !== subjectId) {
      return Object.freeze({ options: null, status: 'storage-unavailable' as const });
    }
  }
  return Object.freeze({
    options: Object.freeze({
      cohortSubjectId: subjectId,
      capacity: 2_048,
      keyPrefix: LOCAL_RETENTION_JOURNAL_KEY_PREFIX,
      leaseDurationMs: 60_000,
      leaseTakeoverSameOwner,
    }),
    status: 'ready' as const,
  });
}

function pageLeaseIdentity(windowObject: Window): Readonly<{
  readonly ownerId: string;
  readonly leaseTakeoverSameOwner: boolean;
}> {
  const randomIdentity = createRandomSubjectId(windowObject);
  if (randomIdentity === null) {
    return Object.freeze({
      ownerId: 'arena-v2-formal-web-development-owner-v1',
      leaseTakeoverSameOwner: false,
    });
  }
  return Object.freeze({
    ownerId: randomIdentity.replace(
      'arena-v2-local-',
      'arena-v2-formal-web-development-owner-',
    ),
    leaseTakeoverSameOwner: true,
  });
}

const root = requiredElement<HTMLElement>('#arena-v2-formal-candidate-root');
const gate = requiredElement<HTMLElement>('#arena-v2-candidate-gate');
const status = requiredElement<HTMLElement>('#arena-v2-candidate-status');
const enter = requiredElement<HTMLButtonElement>('#arena-v2-candidate-enter');
const windowObject = root.ownerDocument.defaultView;
if (!windowObject) throw new Error('Arena V2 formal candidate缺少Window。');
const storage = localStoragePort(windowObject);
const pageLease = pageLeaseIdentity(windowObject);

let composition: ArenaV2FormalWebPlayableCompositionCandidateV1 | null = null;
let constructionCleanupDebt:
  ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1 | null = null;
let seedSource: SequentialMatchSeedSource | null = null;
let localRetention: ReturnType<typeof localRetentionJournalOptions> | null = null;
let selectedLocalRetentionMode: 'off' | 'local' | null = null;
let weaponResearchPacePageBaselineToken:
  ArenaV2FormalWebWeaponResearchPacePageBaselineTokenCandidateV1 | null = null;
let disposed = false;
let generation = 0;
let preparationOperation: Promise<void> | null = null;
let activationOperation: Promise<void> | null = null;
let entryState: 'preparing' | 'ready' | 'entering' | 'active' | 'failed' | 'disposed' =
  'preparing';
let localRetentionJournalConnected = false;
let synchronousOperation: EntrySynchronousOperation | null = null;
let synchronousReentrySequence = 0;
let synchronousReentryError: Error | null = null;
let synchronousOperationFailure: unknown = null;
let enterListenerBound = false;
let pageHideListenerBound = false;
let pageShowListenerBound = false;

function readyStatus(
  retention: ReturnType<typeof localRetentionJournalOptions>,
): string {
  return retention.status === 'storage-unavailable'
    ? '资源已准备；本地留存日志不可用，不影响进入竞技场'
    : retention.status === 'identity-unavailable'
      ? '资源已准备；匿名身份不可用，不影响进入竞技场'
      : retention.status === 'ready' && localRetentionJournalConnected
        ? '资源已准备；本地匿名留存日志已启用'
        : retention.status === 'ready'
          ? '资源已准备；本地留存日志未连接，不影响进入竞技场'
          : '资源已准备，可以进入竞技场';
}

function commitFailure(error: unknown, failedGeneration = generation): void {
  if (disposed || failedGeneration !== generation) return;
  const failedDuringOwnedOperation = entryState === 'preparing' || entryState === 'entering';
  entryState = 'failed';
  let sequence = synchronousReentrySequence;
  gate.hidden = false;
  assertExternalCommitSequence(sequence, 'Arena V2 formal candidate failure gate visibility');
  sequence = synchronousReentrySequence;
  gate.dataset.tone = 'error';
  assertExternalCommitSequence(sequence, 'Arena V2 formal candidate failure gate tone');
  sequence = synchronousReentrySequence;
  status.textContent = error instanceof Error ? error.message : '候选版启动失败。';
  assertExternalCommitSequence(sequence, 'Arena V2 formal candidate failure status');
  sequence = synchronousReentrySequence;
  enter.textContent = failedDuringOwnedOperation ? '正在结束本次操作' : '重新准备';
  assertExternalCommitSequence(sequence, 'Arena V2 formal candidate failure action label');
  sequence = synchronousReentrySequence;
  enter.disabled = failedDuringOwnedOperation
    || preparationOperation !== null
    || activationOperation !== null;
  assertExternalCommitSequence(sequence, 'Arena V2 formal candidate failure action state');
}

function showFailure(error: unknown, failedGeneration = generation): void {
  if (disposed || failedGeneration !== generation) return;
  if (synchronousOperation !== null) {
    synchronousOperationFailure ??= error;
    assertNoSynchronousOperation('composition failure callback');
  }
  runSynchronousOperation('failure-commit', () => {
    commitFailure(error, failedGeneration);
  });
}

function publishRetryIfOperationsSettled(): void {
  if (disposed || entryState !== 'failed'
    || preparationOperation !== null || activationOperation !== null) return;
  let sequence = synchronousReentrySequence;
  enter.textContent = '重新准备';
  assertExternalCommitSequence(sequence, 'Arena V2 formal candidate retry label');
  sequence = synchronousReentrySequence;
  enter.disabled = false;
  assertExternalCommitSequence(sequence, 'Arena V2 formal candidate retry action state');
}

function disposeCurrentComposition(): void {
  if (constructionCleanupDebt !== null) {
    const cleanupSequence = synchronousReentrySequence;
    rejectThenable(
      constructionCleanupDebt.retryCleanup(),
      'Arena V2 formal candidate construction cleanup debt.retryCleanup',
    );
    assertExternalCommitSequence(
      cleanupSequence,
      'Arena V2 formal candidate construction cleanup debt',
    );
    if (!constructionCleanupDebt.cleanupComplete) {
      throw new Error('Arena V2 formal candidate构造清理尚未完成，拒绝创建新宿主。');
    }
    constructionCleanupDebt = null;
  }
  if (composition === null) return;
  const ownedComposition = composition;
  const cleanupSequence = synchronousReentrySequence;
  rejectThenable(
    ownedComposition.dispose(),
    'Arena V2 formal candidate composition.dispose',
  );
  assertExternalCommitSequence(cleanupSequence, 'Arena V2 formal candidate composition cleanup');
  if (composition !== ownedComposition) {
    throw new Error('Arena V2 formal candidate Composition清理期间Owner身份已漂移。');
  }
  composition = null;
  localRetentionJournalConnected = false;
}

function assertNoSynchronousOperation(operation: string): void {
  if (synchronousOperation === null) return;
  const error = new Error(
    `Arena V2 formal candidate拒绝${synchronousOperation}期间同步重入${operation}。`,
  );
  synchronousReentrySequence += 1;
  synchronousReentryError ??= error;
  throw synchronousReentryError;
}

function assertSynchronousOperationCommit(operation: EntrySynchronousOperation): void {
  if (synchronousOperation !== operation) {
    throw new Error(`Arena V2 formal candidate缺少${operation}操作所有权。`);
  }
  if (synchronousReentryError !== null) throw synchronousReentryError;
}

function assertCurrentSynchronousOperationCommit(): void {
  if (synchronousOperation === null) {
    throw new Error('Arena V2 formal candidate缺少当前操作所有权。');
  }
  assertSynchronousOperationCommit(synchronousOperation);
}

function assertExternalCommitSequence(sequence: number, operation: string): void {
  if (synchronousReentrySequence === sequence) return;
  const error = synchronousReentryError ?? new Error(`${operation}期间发生同步重入。`);
  synchronousOperationFailure ??= error;
  throw error;
}

function runSynchronousOperation<T>(
  operation: EntrySynchronousOperation,
  action: () => T,
): T {
  assertNoSynchronousOperation(operation);
  synchronousOperation = operation;
  synchronousReentryError = null;
  synchronousOperationFailure = null;
  try {
    const result = action();
    assertSynchronousOperationCommit(operation);
    return result;
  } catch (error) {
    synchronousOperationFailure ??= error;
    throw error;
  } finally {
    const reentryError = synchronousReentryError;
    const operationFailure = synchronousOperationFailure;
    if (reentryError !== null) {
      const failure = operationFailure === null || operationFailure === reentryError
        ? reentryError
        : new AggregateError(
          [operationFailure, reentryError],
          `Arena V2 formal candidate ${operation}`
          + '失败且检测到被Composition、DOM或Observer吞掉的同步重入。',
        );
      try {
        failOperationReentry(operation, failure);
      } finally {
        if (synchronousOperation === operation) synchronousOperation = null;
        synchronousReentryError = null;
        synchronousOperationFailure = null;
      }
    }
    if (synchronousOperation === operation) synchronousOperation = null;
    synchronousReentryError = null;
    synchronousOperationFailure = null;
  }
}

function failOperationReentry(
  operation: EntrySynchronousOperation,
  cause: unknown,
): never {
  const reentryError = synchronousReentryError ?? new Error(
    `Arena V2 formal candidate ${operation}检测到同步重入。`,
  );
  generation += 1;
  const errors: unknown[] = cause === reentryError
    ? [reentryError]
    : [cause, reentryError];
  try { commitFailure(reentryError); } catch (error) { errors.push(error); }
  try { disposeCurrentComposition(); } catch (error) { errors.push(error); }
  if (errors.length === 1) throw reentryError;
  throw new AggregateError(errors, 'Arena V2 formal candidate同步重入失败关闭不完整。');
}

function recordDetachedFailure(
  error: unknown,
  message: string,
  failedGeneration = generation,
): void {
  try {
    showFailure(error, failedGeneration);
  } catch (commitError) {
    try {
      console.error(new AggregateError([error, commitError], message));
    } catch { /* 终态诊断不得制造新的未接管异常。 */ }
  }
}

function launchDetachedOperation(
  label: string,
  start: () => Promise<void>,
): void {
  let operation: Promise<void>;
  try {
    operation = start();
  } catch (error) {
    recordDetachedFailure(error, `${label}同步启动失败。`);
    return;
  }
  const operationGeneration = generation;
  void operation.then(
    () => undefined,
    (error: unknown) => {
      recordDetachedFailure(
        error,
        `${label}异步执行失败。`,
        operationGeneration,
      );
    },
  );
}

function cleanupEntryListeners(): readonly unknown[] {
  const errors: unknown[] = [];
  const cleanup = (
    bound: boolean,
    label: string,
    remove: () => unknown,
    commit: () => void,
  ): boolean => {
    if (!bound) return true;
    const sequence = synchronousReentrySequence;
    try {
      rejectThenable(remove(), label);
      assertExternalCommitSequence(sequence, label);
      commit();
      return true;
    } catch (error) {
      errors.push(error);
      return false;
    }
  };
  if (!cleanup(
    pageShowListenerBound,
    'Arena V2 formal candidate pageshow listener cleanup',
    () => windowObject.removeEventListener('pageshow', handlePageShow),
    () => { pageShowListenerBound = false; },
  )) return Object.freeze(errors);
  if (!cleanup(
    pageHideListenerBound,
    'Arena V2 formal candidate pagehide listener cleanup',
    () => windowObject.removeEventListener('pagehide', handlePageHide),
    () => { pageHideListenerBound = false; },
  )) return Object.freeze(errors);
  cleanup(
    enterListenerBound,
    'Arena V2 formal candidate enter listener cleanup',
    () => enter.removeEventListener('click', handleGateAction),
    () => { enterListenerBound = false; },
  );
  return Object.freeze(errors);
}

function dispose(): void {
  assertNoSynchronousOperation('dispose');
  if (disposed) return;
  runSynchronousOperation('dispose', () => {
    generation += 1;
    preparationOperation = null;
    activationOperation = null;
    const listenerCleanupErrors = cleanupEntryListeners();
    if (listenerCleanupErrors.length > 0) {
      entryState = 'failed';
      throw new AggregateError(
        listenerCleanupErrors,
        'Arena V2 formal candidate入口监听清理不完整。',
      );
    }
    try {
      disposeCurrentComposition();
    } catch (error) {
      entryState = 'failed';
      try { console.error(error); } catch { /* 页面终止清理不依赖诊断端口。 */ }
      throw error;
    }
    assertCurrentSynchronousOperationCommit();
    disposed = true;
    entryState = 'disposed';
  });
}

function handlePageHide(event: PageTransitionEvent): void {
  if (!event.persisted) {
    try {
      dispose();
    } catch (error) {
      recordDetachedFailure(error, 'Arena V2 formal candidate页面终止清理失败。');
    }
    return;
  }
  try {
    runSynchronousOperation('pagehide', () => {
      generation += 1;
      preparationOperation = null;
      activationOperation = null;
      entryState = 'preparing';
      let sequence = synchronousReentrySequence;
      gate.hidden = false;
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate pagehide gate visibility');
      sequence = synchronousReentrySequence;
      delete gate.dataset.tone;
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate pagehide gate tone');
      sequence = synchronousReentrySequence;
      status.textContent = '页面暂存，返回后将重新准备竞技场';
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate pagehide status');
      sequence = synchronousReentrySequence;
      enter.textContent = '等待页面恢复';
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate pagehide action label');
      sequence = synchronousReentrySequence;
      enter.disabled = true;
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate pagehide action state');
      try {
        disposeCurrentComposition();
      } catch (error) {
        commitFailure(error);
        try { console.error(error); } catch { /* BFCache清理失败已由入口状态接管。 */ }
      }
    });
  } catch (error) {
    recordDetachedFailure(error, 'Arena V2 formal candidate pagehide失败提交异常。');
  }
}

function handlePageShow(event: PageTransitionEvent): void {
  if (!event.persisted || disposed) return;
  launchDetachedOperation('Arena V2 formal candidate页面恢复准备', () => {
    runSynchronousOperation('pageshow', () => {
      entryState = 'failed';
    });
    return prepare();
  });
}

async function runActivation(): Promise<void> {
  const activeComposition = composition;
  const activeGeneration = generation;
  try {
    if (activeComposition === null) {
      throw new Error('Arena V2 formal candidate激活缺少当前Composition。');
    }
    const execution = runSynchronousOperation('activation-start', () => {
      if (disposed || entryState !== 'ready' || composition !== activeComposition) {
        throw new Error('Arena V2 formal candidate激活启动状态已失效。');
      }
      entryState = 'entering';
      let sequence = synchronousReentrySequence;
      enter.disabled = true;
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate activation action state');
      sequence = synchronousReentrySequence;
      enter.textContent = '正在进入';
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate activation action label');
      sequence = synchronousReentrySequence;
      status.textContent = '正在启用游戏音频';
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate activation status');
      const activation = activeComposition.activateAudioAndEnterHome();
      assertCurrentSynchronousOperationCommit();
      return activation;
    });
    await execution;
    runSynchronousOperation('activation-success', () => {
      if (disposed
        || activeGeneration !== generation
        || composition !== activeComposition) {
        throw new Error('Arena V2 formal candidate激活结果所属代际已失效。');
      }
      if (entryState !== 'entering') {
        throw new Error(`Arena V2 formal candidate激活成功时入口状态已是${entryState}。`);
      }
      gate.hidden = true;
      assertCurrentSynchronousOperationCommit();
      entryState = 'active';
    });
  } catch (error) {
    let failure: unknown = error;
    try { showFailure(error, activeGeneration); } catch (commitError) {
      failure = new AggregateError(
        [error, commitError],
        'Arena V2 formal candidate激活失败提交不完整。',
      );
    }
    throw failure;
  }
}

function handleEnter(): Promise<void> {
  assertNoSynchronousOperation('handleEnter');
  if (disposed) return Promise.resolve();
  if (activationOperation !== null) return activationOperation;
  if (preparationOperation !== null) return preparationOperation;
  if (entryState !== 'ready') return Promise.resolve();
  const activationOwner = deferred<void>();
  const operation = activationOwner.promise;
  runSynchronousOperation('activation-owner-publication', () => {
    activationOperation = operation;
  });
  const activationExecution = runActivation();
  const operationGeneration = generation;
  const settle = (): void => {
    try {
      runSynchronousOperation('activation-owner-settlement', () => {
        if (activationOperation !== operation) return;
        activationOperation = null;
        publishRetryIfOperationsSettled();
      });
    } catch (error) {
      recordDetachedFailure(
        error,
        'Arena V2 formal candidate激活Owner结算失败提交异常。',
        operationGeneration,
      );
    }
  };
  void activationExecution.then(activationOwner.resolve, activationOwner.reject);
  void operation.then(settle, settle);
  return operation;
}

async function runPreparation(): Promise<void> {
  const activeGeneration = generation + 1;
  try {
    let nextLocalRetention: ReturnType<typeof localRetentionJournalOptions> | null = null;
    let nextComposition: ArenaV2FormalWebPlayableCompositionCandidateV1 | null = null;
    const execution = runSynchronousOperation('preparation-start', () => {
      generation = activeGeneration;
      entryState = 'preparing';
      let sequence = synchronousReentrySequence;
      gate.hidden = false;
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate preparation gate visibility');
      sequence = synchronousReentrySequence;
      delete gate.dataset.tone;
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate preparation gate tone');
      sequence = synchronousReentrySequence;
      status.textContent = '正在准备角色、武器与地图';
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate preparation status');
      sequence = synchronousReentrySequence;
      enter.textContent = '准备资源中';
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate preparation action label');
      sequence = synchronousReentrySequence;
      enter.disabled = true;
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate preparation action state');
      disposeCurrentComposition();
      assertCurrentSynchronousOperationCommit();
      const nextRetentionMode = selectedLocalRetentionMode
        ?? retentionMode(windowObject.location.search);
      nextLocalRetention = localRetentionJournalOptions(
        storage,
        windowObject,
        nextRetentionMode === 'local',
        pageLease.leaseTakeoverSameOwner,
      );
      if (nextLocalRetention.status === 'off' || nextLocalRetention.status === 'ready') {
        selectedLocalRetentionMode ??= nextRetentionMode;
      }
      localRetention = nextLocalRetention;
      const nextSeedSource = seedSource
        ?? new SequentialMatchSeedSource(initialSeed(windowObject.location.search));
      seedSource = nextSeedSource;
      nextComposition = new ArenaV2FormalWebPlayableCompositionCandidateV1({
        hostRoot: root,
        seedSource: nextSeedSource,
        inputMode: inputMode(windowObject.location.search),
        storage,
        ownerId: pageLease.ownerId,
        wallNow: () => globalThis.Date['now'](),
        keyPrefix: 'arena.v2.formal-web-development.v1',
        leaseTakeoverSameOwner: pageLease.leaseTakeoverSameOwner,
        ...(nextLocalRetention.options === null
          ? {}
          : { offlineRetentionObservationJournal: nextLocalRetention.options }),
        ...(weaponResearchPacePageBaselineToken === null
          ? {}
          : { weaponResearchPacePageBaselineToken }),
        onError: (error: unknown) => {
          if (synchronousOperation !== null) synchronousOperationFailure ??= error;
          showFailure(error, activeGeneration);
        },
      });
      assertCurrentSynchronousOperationCommit();
      composition = nextComposition;
      const nextWeaponResearchPacePageBaselineToken = nextComposition
        .getOfflineWeaponResearchPacePageBaselineTokenForEntryCandidateV1();
      assertCurrentSynchronousOperationCommit();
      if (weaponResearchPacePageBaselineToken === null) {
        weaponResearchPacePageBaselineToken =
          nextWeaponResearchPacePageBaselineToken;
      } else if (nextWeaponResearchPacePageBaselineToken
        !== weaponResearchPacePageBaselineToken) {
        throw new RangeError('Arena V2 formal candidate页面研究节奏基线Token身份漂移。');
      }
      const snapshot = nextComposition.getSnapshot();
      assertCurrentSynchronousOperationCommit();
      localRetentionJournalConnected = snapshot.offlineRetentionObservationJournal !== null;
      const preparation = nextComposition.loadAndPrepare();
      assertCurrentSynchronousOperationCommit();
      return preparation;
    });
    await execution;
    runSynchronousOperation('preparation-success', () => {
      if (nextLocalRetention === null || nextComposition === null) {
        throw new Error('Arena V2 formal candidate准备结果缺少已发布Owner。');
      }
      if (disposed
        || activeGeneration !== generation
        || composition !== nextComposition) {
        throw new Error('Arena V2 formal candidate准备结果所属代际已失效。');
      }
      if (entryState !== 'preparing') {
        throw new Error(`Arena V2 formal candidate准备成功时入口状态已是${entryState}。`);
      }
      let sequence = synchronousReentrySequence;
      status.textContent = readyStatus(nextLocalRetention);
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate ready status');
      sequence = synchronousReentrySequence;
      enter.textContent = '进入竞技场';
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate ready action label');
      sequence = synchronousReentrySequence;
      enter.disabled = false;
      assertExternalCommitSequence(sequence, 'Arena V2 formal candidate ready action state');
      entryState = 'ready';
    });
  } catch (error) {
    if (error
      instanceof ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1) {
      constructionCleanupDebt = error;
    }
    let failure: unknown = error;
    try { showFailure(error, activeGeneration); } catch (commitError) {
      failure = new AggregateError(
        [error, commitError],
        'Arena V2 formal candidate准备失败提交不完整。',
      );
    }
    throw failure;
  }
}

function prepare(): Promise<void> {
  assertNoSynchronousOperation('prepare');
  if (disposed) return Promise.resolve();
  if (preparationOperation !== null) return preparationOperation;
  if (activationOperation !== null) return activationOperation;
  if (entryState === 'entering') return Promise.resolve();
  const preparationOwner = deferred<void>();
  const operation = preparationOwner.promise;
  runSynchronousOperation('preparation-owner-publication', () => {
    preparationOperation = operation;
  });
  const preparationExecution = runPreparation();
  const operationGeneration = generation;
  const settle = (): void => {
    try {
      runSynchronousOperation('preparation-owner-settlement', () => {
        if (preparationOperation !== operation) return;
        preparationOperation = null;
        publishRetryIfOperationsSettled();
      });
    } catch (error) {
      recordDetachedFailure(
        error,
        'Arena V2 formal candidate准备Owner结算失败提交异常。',
        operationGeneration,
      );
    }
  };
  void preparationExecution.then(preparationOwner.resolve, preparationOwner.reject);
  void operation.then(settle, settle);
  return operation;
}

function handleGateAction(): void {
  try {
    assertNoSynchronousOperation('handleGateAction');
  } catch (error) {
    recordDetachedFailure(error, 'Arena V2 formal candidate入口动作同步失败。');
    return;
  }
  if (entryState === 'failed') {
    launchDetachedOperation('Arena V2 formal candidate入口重试', prepare);
  } else if (entryState === 'ready') {
    launchDetachedOperation('Arena V2 formal candidate进入游戏', handleEnter);
  }
}

runSynchronousOperation('bootstrap', () => {
  entryState = 'failed';
  try {
    let sequence = synchronousReentrySequence;
    enterListenerBound = true;
    rejectThenable(
      enter.addEventListener('click', handleGateAction),
      'Arena V2 formal candidate enter listener bind',
    );
    assertExternalCommitSequence(sequence, 'Arena V2 formal candidate enter listener bind');
    sequence = synchronousReentrySequence;
    pageHideListenerBound = true;
    rejectThenable(
      windowObject.addEventListener('pagehide', handlePageHide),
      'Arena V2 formal candidate pagehide listener bind',
    );
    assertExternalCommitSequence(sequence, 'Arena V2 formal candidate pagehide listener bind');
    sequence = synchronousReentrySequence;
    pageShowListenerBound = true;
    rejectThenable(
      windowObject.addEventListener('pageshow', handlePageShow),
      'Arena V2 formal candidate pageshow listener bind',
    );
    assertExternalCommitSequence(sequence, 'Arena V2 formal candidate pageshow listener bind');
  } catch (error) {
    const cleanupErrors = cleanupEntryListeners();
    throw cleanupErrors.length === 0
      ? error
      : new AggregateError(
        [error, ...cleanupErrors],
        'Arena V2 formal candidate入口监听绑定失败且回滚不完整。',
      );
  }
});
launchDetachedOperation('Arena V2 formal candidate首次准备', prepare);

export function readArenaV2FormalWebDevelopmentRetentionExportCandidateV1(): ReturnType<
  ArenaV2FormalWebPlayableCompositionCandidateV1['getOfflineRetentionObservationExportRead']
> {
  assertNoSynchronousOperation(
    'readArenaV2FormalWebDevelopmentRetentionExportCandidateV1',
  );
  const activeComposition = composition;
  if (disposed || activeComposition === null
    || (entryState !== 'ready' && entryState !== 'active')) return null;
  return runSynchronousOperation(
    'retention-read',
    () => {
      const exportBundle = activeComposition.getOfflineRetentionObservationExportRead();
      assertCurrentSynchronousOperationCommit();
      return exportBundle;
    },
  );
}

export function readArenaV2FormalWebDevelopmentLearningPaceCalibrationCandidateV1(): ReturnType<
  ArenaV2FormalWebPlayableCompositionCandidateV1['getOfflineLearningPaceCalibrationRead']
> {
  assertNoSynchronousOperation(
    'readArenaV2FormalWebDevelopmentLearningPaceCalibrationCandidateV1',
  );
  const activeComposition = composition;
  if (disposed || activeComposition === null
    || (entryState !== 'ready' && entryState !== 'active')) return null;
  return runSynchronousOperation(
    'retention-calibration-read',
    () => {
      const calibration = activeComposition.getOfflineLearningPaceCalibrationRead();
      assertCurrentSynchronousOperationCommit();
      return calibration;
    },
  );
}

export function readArenaV2FormalWebDevelopmentWeaponResearchPaceCalibrationCandidateV1():
ReturnType<
  ArenaV2FormalWebPlayableCompositionCandidateV1[
    'getOfflineWeaponResearchPaceCalibrationRead'
  ]
> {
  assertNoSynchronousOperation(
    'readArenaV2FormalWebDevelopmentWeaponResearchPaceCalibrationCandidateV1',
  );
  const activeComposition = composition;
  if (disposed || activeComposition === null
    || (entryState !== 'ready' && entryState !== 'active')) return null;
  return runSynchronousOperation(
    'retention-weapon-pace-read',
    () => {
      const calibration =
        activeComposition.getOfflineWeaponResearchPaceCalibrationRead();
      assertCurrentSynchronousOperationCommit();
      return calibration;
    },
  );
}

export const ARENA_V2_FORMAL_WEB_DEVELOPMENT_ENTRY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  isolatedHtmlEntry: 'arena-v2-formal-candidate.html' as const,
  fixedSeedQuerySupported: true as const,
  inputModeQuerySupported: true as const,
  localRetentionJournalQuery: 'retention=local' as const,
  localRetentionJournalDisableQuery: 'retention=off' as const,
  localRetentionJournalDefaultEnabled: true as const,
  localRetentionAvailabilityReevaluatedEachPreparationGeneration: true as const,
  localRetentionModeFrozenAfterFirstSuccessfulResolution: true as const,
  localRetentionUsesDeviceFingerprint: false as const,
  localRetentionUsesWallClockPayload: false as const,
  localRetentionFailureBlocksGame: false as const,
  startupFailureOffersInPlaceRetry: true as const,
  retryRequiresPriorCompositionDispose: true as const,
  constructionCleanupDebtRetainedForRetry: true as const,
  detachedEntryOperationsObserveSynchronousAndAsyncFailure: true as const,
  detachedEntryAsyncFailureCannotRefailNewGeneration: true as const,
  detachedOperationGenerationCapturedAfterSynchronousLaunch: true as const,
  operationOwnerSettlementFailureCannotRefailNewGeneration: true as const,
  operationOwnerGenerationCapturedAfterSynchronousLaunch: true as const,
  pageLifecycleCallbacksContainDetachedFailures: true as const,
  retryPreservesMatchSeedSequence: true as const,
  startupQueryParsingOccursInsideRetryBoundary: true as const,
  crossTabLeaseOwnerUsesEphemeralCryptoIdentity: true as const,
  fixedOwnerFallbackDisablesSameOwnerTakeover: true as const,
  localRetentionExportReadAvailableOnlyWhenReadyOrActive: true as const,
  localRetentionExportReadTriggersDownloadOrUpload: false as const,
  localLearningPaceCalibrationReadAvailableOnlyWhenReadyOrActive: true as const,
  localLearningPaceCalibrationReadMutatesProgression: false as const,
  localLearningPaceCalibrationClaimsObservedRetention: false as const,
  localWeaponResearchPaceCalibrationReadAvailableOnlyWhenReadyOrActive: true as const,
  localWeaponResearchPaceCalibrationUsesPageLifetimeBaselineToken: true as const,
  localWeaponResearchPaceCalibrationPreservesBaselineAcrossRetry: true as const,
  localWeaponResearchPaceCalibrationPreservesBaselineAcrossBfcacheRestore: true as const,
  localWeaponResearchPaceCalibrationPersistsBaselineAcrossPageReload: true as const,
  localWeaponResearchPaceCalibrationDurableBaselineUsesLeaseAndReadBack: true as const,
  localWeaponResearchPaceCalibrationDurableFailureFallsBackToPageBaseline: true as const,
  localRetentionIdentityCreationRejectsOrphanedWeaponPaceBaseline: true as const,
  localWeaponResearchPaceCalibrationRequiresContiguousProfileWindow: true as const,
  localWeaponResearchPaceCalibrationMutatesProgression: false as const,
  localWeaponResearchPaceCalibrationClaimsObservedRetention: false as const,
  staleAsyncGenerationCannotPublishGateState: true as const,
  preparationSingleFlightPerGeneration: true as const,
  preparationOwnerPublishedBeforeRunPreparation: true as const,
  preparationFailureRetryWaitsForOperationSettlement: true as const,
  activationSingleFlightPerGeneration: true as const,
  activationOwnerPublishedBeforeRunActivation: true as const,
  repeatedEntryRequestsReusePublishedOwnerBeforeStateGate: true as const,
  ownerSettlementCleanupHandlesResolveAndRejectWithoutDetachedFinally: true as const,
  preparationAndActivationFailuresRejectPublishedOwners: true as const,
  stalePreparationAndActivationGenerationsRejectPublishedOwners: true as const,
  asyncSuccessAndOwnerSettlementCommitUnderEntryOperationGuard: true as const,
  swallowedCompositionDomOrObserverReentryFailsClosed: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  compositionAndDomCallbacksCheckedBeforeStateOrOwnerCommit: true as const,
  compositionCleanupReentryRetainsCurrentOwner: true as const,
  asyncChildOwnersCapturedBeforeGenerationCheckedSettlement: true as const,
  bootstrapAndPageLifecycleCallbacksUseEntryOperationGuard: true as const,
  bootstrapListenerRollbackRetainsExactRetryWatermarks: true as const,
  entryListenerCleanupStopsAtFirstIncompleteOwner: true as const,
  entryAndCompositionCleanupMustCompleteSynchronously: true as const,
  disposedStatePublishesAfterListenerAndCompositionCleanup: true as const,
  detachedOwnerSettlementFailureCommitIsContained: true as const,
  pageLifecycleAndRetentionReadUseEntryOperationGuard: true as const,
  failureRetryWaitsForPreparationAndActivationSettlement: true as const,
  pageLifecycleInvalidatesStalePreparationOwnership: true as const,
  pageLifecycleInvalidatesStaleActivationOwnership: true as const,
  backForwardCacheRestoreRepreparesCandidate: true as const,
  retryAddsPageOrGameplayAction: false as const,
  validationStatus: 'not-run' as const,
});
