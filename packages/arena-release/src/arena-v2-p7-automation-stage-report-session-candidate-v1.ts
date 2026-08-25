import {
  createArenaV2P7AutomationEvidenceProducerCandidateV1,
  type ArenaV2P7AutomationEvidenceProducerCandidateV1,
  type ArenaV2P7AutomationEvidenceProducerOptionsCandidateV1,
} from './arena-v2-p7-automation-evidence-producer-candidate-v1.js';
import type {
  ArenaV2P7AutomationExecutionEvidenceCandidateV1,
} from './arena-v2-p7-automation-execution-evidence-candidate-v1.js';
import {
  validateArenaV2P7EvidenceEvaluationCandidateV1,
  type ArenaV2P7EvidenceEvaluationCandidateV1,
} from './arena-v2-p7-evidence-evaluation-candidate-v1.js';
import {
  createArenaV2P7StageReportCandidateV2,
  type ArenaV2P7StageReportCandidateV2,
} from './arena-v2-p7-stage-report-candidate-v2.js';

export const ARENA_V2_P7_AUTOMATION_STAGE_REPORT_SESSION_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export type ArenaV2P7AutomationStageReportSessionStateCandidateV1 =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'destroyed';

export interface ArenaV2P7AutomationStageReportSessionOptionsCandidateV1 {
  readonly evaluation: ArenaV2P7EvidenceEvaluationCandidateV1;
  readonly producerOptions: ArenaV2P7AutomationEvidenceProducerOptionsCandidateV1;
}

export interface ArenaV2P7AutomationStageReportSessionResultCandidateV1 {
  readonly automationEvidence: ArenaV2P7AutomationExecutionEvidenceCandidateV1;
  readonly report: ArenaV2P7StageReportCandidateV2;
}

const SESSION_OPTION_KEYS = new Set(['evaluation', 'producerOptions']);
const PRODUCER_OPTION_KEYS = new Set([
  'sourceCommit', 'sourceDirty', 'contentIdentityHash',
  'preregistrationIdentityHash', 'evaluationIdentityHash',
  'packageJsonSha256', 'packageLockSha256', 'toolchain',
  'toolchainIdentitySha256', 'runOrdinal', 'attempt', 'commandRunner',
]);

function captureExactDataRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw new TypeError(`${name}不得包含Symbol字段。`);
  }
  const stringKeys = ownKeys as string[];
  if (
    stringKeys.length !== keys.size
    || stringKeys.some((key) => !keys.has(key))
  ) throw new TypeError(`${name}字段集合不匹配。`);
  const captured: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
    captured[key] = descriptor.value;
  }
  return Object.freeze(captured);
}

function assertEvaluationIdentity(
  evaluation: ArenaV2P7EvidenceEvaluationCandidateV1,
  producerOptions: Readonly<Record<string, unknown>>,
): void {
  if (
    producerOptions.sourceCommit !== evaluation.sourceCommit
    || producerOptions.contentIdentityHash !== evaluation.contentIdentityHash
    || producerOptions.preregistrationIdentityHash !== evaluation.preregistrationIdentityHash
    || producerOptions.evaluationIdentityHash !== evaluation.evaluationIdentityHash
  ) throw new RangeError('P7 automation/report session评价与producer执行身份不一致。');
}

function canonicalProducerOptions(
  value: unknown,
  evaluation: ArenaV2P7EvidenceEvaluationCandidateV1,
): Readonly<Record<string, unknown>> {
  const source = captureExactDataRecord(
    value,
    PRODUCER_OPTION_KEYS,
    'P7 automation/report session producerOptions',
  );
  assertEvaluationIdentity(evaluation, source);
  return Object.freeze({
    sourceCommit: source.sourceCommit,
    sourceDirty: source.sourceDirty,
    contentIdentityHash: source.contentIdentityHash,
    preregistrationIdentityHash: source.preregistrationIdentityHash,
    evaluationIdentityHash: source.evaluationIdentityHash,
    packageJsonSha256: source.packageJsonSha256,
    packageLockSha256: source.packageLockSha256,
    toolchain: source.toolchain,
    toolchainIdentitySha256: source.toolchainIdentitySha256,
    runOrdinal: source.runOrdinal,
    attempt: source.attempt,
    commandRunner: source.commandRunner,
  });
}

export class ArenaV2P7AutomationStageReportSessionCandidateV1 {
  #state: ArenaV2P7AutomationStageReportSessionStateCandidateV1 = 'created';
  #evaluation: ArenaV2P7EvidenceEvaluationCandidateV1 | null;
  #producer: ArenaV2P7AutomationEvidenceProducerCandidateV1 | null;
  #result: Readonly<ArenaV2P7AutomationStageReportSessionResultCandidateV1> | null = null;

  constructor(value: unknown) {
    const source = captureExactDataRecord(
      value,
      SESSION_OPTION_KEYS,
      'P7 automation/report session options',
    );
    const evaluation = validateArenaV2P7EvidenceEvaluationCandidateV1(source.evaluation);
    const producerOptions = canonicalProducerOptions(source.producerOptions, evaluation);
    this.#evaluation = evaluation;
    this.#producer = createArenaV2P7AutomationEvidenceProducerCandidateV1(producerOptions);
  }

  get state(): ArenaV2P7AutomationStageReportSessionStateCandidateV1 {
    return this.#state;
  }

  start(): Promise<Readonly<ArenaV2P7AutomationStageReportSessionResultCandidateV1>> {
    if (this.#state !== 'created') {
      throw new Error(`P7 automation/report session不能从${this.#state}重复start。`);
    }
    this.#state = 'running';
    return this.#run();
  }

  getResult(): Readonly<ArenaV2P7AutomationStageReportSessionResultCandidateV1> {
    if (this.#state !== 'completed' || this.#result === null) {
      throw new Error('P7 automation/report session尚无可读的完整结果。');
    }
    return this.#result;
  }

  destroy(): void {
    if (this.#state === 'running') {
      throw new Error('P7 automation/report session运行中不得destroy。');
    }
    if (this.#state === 'destroyed') return;
    this.#producer?.destroy();
    this.#producer = null;
    this.#evaluation = null;
    this.#result = null;
    this.#state = 'destroyed';
  }

  async #run(): Promise<Readonly<ArenaV2P7AutomationStageReportSessionResultCandidateV1>> {
    try {
      const producer = this.#producer;
      const evaluation = this.#evaluation;
      if (producer === null || evaluation === null) {
        throw new Error('P7 automation/report session运行依赖已释放。');
      }
      const automationEvidence = await producer.start();
      const report = createArenaV2P7StageReportCandidateV2({
        evaluation,
        automationEvidence,
      });
      const result = Object.freeze({ automationEvidence, report });
      producer.destroy();
      this.#producer = null;
      this.#evaluation = null;
      this.#result = result;
      this.#state = 'completed';
      return result;
    } catch (error) {
      this.#result = null;
      const producer = this.#producer;
      if (producer !== null && producer.state !== 'running') {
        try {
          producer.destroy();
        } catch {
          // Preserve the original runner/report failure; this producer owns no external cleanup port.
        }
        this.#producer = null;
      }
      this.#evaluation = null;
      this.#state = 'failed';
      throw error;
    }
  }
}

export function createArenaV2P7AutomationStageReportSessionCandidateV1(
  value: unknown,
): ArenaV2P7AutomationStageReportSessionCandidateV1 {
  return new ArenaV2P7AutomationStageReportSessionCandidateV1(value);
}

export const ARENA_V2_P7_AUTOMATION_STAGE_REPORT_SESSION_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  defaultReleaseBundleWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  consumesStoredEvaluationOnly: true as const,
  injectsCanonicalAutomationProducerOnly: true as const,
  stageReportV2Wired: true as const,
  releasesProducerAfterSettlement: true as const,
});
