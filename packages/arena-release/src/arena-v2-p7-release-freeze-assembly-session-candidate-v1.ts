import {
  createArenaV2P7AutomationStageReportSessionCandidateV1,
  type ArenaV2P7AutomationStageReportSessionCandidateV1,
  type ArenaV2P7AutomationStageReportSessionOptionsCandidateV1,
  type ArenaV2P7AutomationStageReportSessionResultCandidateV1,
} from './arena-v2-p7-automation-stage-report-session-candidate-v1.js';
import {
  createArenaV2P7ReleaseFreezeManifestCandidateV1,
  type ArenaV2P7ReleaseFreezeManifestCandidateV1,
} from './arena-v2-p7-release-freeze-manifest-candidate-v1.js';
import {
  assertArenaV2A7CurrentFormalAssetCatalogLegacyBindingCandidateV2,
} from './arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v2.js';
import {
  validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
  type ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
} from './arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.js';
import {
  validateArenaV2P7EvidenceEvaluationCandidateV1,
} from './arena-v2-p7-evidence-evaluation-candidate-v1.js';

export const ARENA_V2_P7_RELEASE_FREEZE_ASSEMBLY_SESSION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export type ArenaV2P7ReleaseFreezeAssemblySessionStateCandidateV1 =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'destroyed';

export type ArenaV2P7ReleaseFreezeAssemblyDispositionCandidateV1 =
  | 'release-freeze-eligible'
  | 'release-freeze-not-eligible';

export interface ArenaV2P7ReleaseFreezeAssemblySessionOptionsCandidateV1
extends ArenaV2P7AutomationStageReportSessionOptionsCandidateV1 {
  readonly formalVisualMediaEvidence:
    ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3;
}

export interface ArenaV2P7ReleaseFreezeAssemblySessionResultCandidateV1
  extends ArenaV2P7AutomationStageReportSessionResultCandidateV1 {
  readonly schemaVersion:
    typeof ARENA_V2_P7_RELEASE_FREEZE_ASSEMBLY_SESSION_CANDIDATE_V1_SCHEMA_VERSION;
  readonly disposition: ArenaV2P7ReleaseFreezeAssemblyDispositionCandidateV1;
  readonly formalVisualMediaEvidence:
    ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3;
  readonly releaseFreezeManifest: ArenaV2P7ReleaseFreezeManifestCandidateV1 | null;
}

const ASSEMBLY_OPTION_KEYS = new Set([
  'evaluation', 'producerOptions', 'formalVisualMediaEvidence',
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

function assertFormalVisualMediaIdentity(
  evidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
  evaluation: ArenaV2P7AutomationStageReportSessionOptionsCandidateV1['evaluation'],
): void {
  if (
    evidence.legacyEvidence.evidence.sourceIdentity.sourceDirty !== false
    || evidence.legacyEvidence.evidence.sourceIdentity.sourceCommit !== evaluation.sourceCommit
    || evidence.legacyEvidence.evidence.sourceIdentity.contentIdentityHash
      !== evaluation.contentIdentityHash
  ) throw new RangeError('P7 release-freeze assembly的A7与评价源码或内容身份漂移。');
  const expectedBuilds = evaluation.preregistration.environmentBuilds;
  const actualBuilds = evidence.legacyEvidence.evidence.environmentBuilds;
  if (
    actualBuilds.length !== expectedBuilds.length
    || expectedBuilds.some((entry, index) => (
      actualBuilds[index]?.environmentId !== entry.environmentId
      || actualBuilds[index]?.buildIdentitySha256 !== entry.buildIdentitySha256
    ))
  ) throw new RangeError('P7 release-freeze assembly的A7与评价六环境构建身份漂移。');
}

function reportAllowsFreeze(
  result: ArenaV2P7AutomationStageReportSessionResultCandidateV1,
  formalVisualMediaEvidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
): boolean {
  return result.report.hardGate === 'PASS'
    && result.report.reportStatus === 'PASS'
    && result.report.reportDecision === 'advance'
    && String(formalVisualMediaEvidence.evidenceStatus) === 'PASS'
    && Boolean(formalVisualMediaEvidence.hardGate)
    && formalVisualMediaEvidence.formalVisualMediaReady;
}

function assertFormalVisualMediaBuildSourceIdentity(
  evidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
  report: ArenaV2P7AutomationStageReportSessionResultCandidateV1['report'],
): void {
  const approvedPolicySource =
    evidence.approvedPolicyAssembly.approvedPolicyCandidate.sourceIdentity;
  if (
    approvedPolicySource.packageLockSha256
      !== report.candidateIdentity.packageLockSha256
    || approvedPolicySource.toolchainIdentitySha256
      !== report.candidateIdentity.toolchainIdentityHash
  ) {
    throw new RangeError('P7 release-freeze assembly的A7与功能报告package lock或toolchain身份漂移。');
  }
}

export class ArenaV2P7ReleaseFreezeAssemblySessionCandidateV1 {
  #state: ArenaV2P7ReleaseFreezeAssemblySessionStateCandidateV1 = 'created';
  #reportSession: ArenaV2P7AutomationStageReportSessionCandidateV1 | null;
  #formalVisualMediaEvidence:
    ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3 | null;
  #result: Readonly<ArenaV2P7ReleaseFreezeAssemblySessionResultCandidateV1> | null = null;

  constructor(value: unknown) {
    const source = captureExactDataRecord(
      value,
      ASSEMBLY_OPTION_KEYS,
      'P7 release-freeze assembly session options',
    );
    const formalVisualMediaEvidence =
      validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
        source.formalVisualMediaEvidence,
      );
    const evaluation = validateArenaV2P7EvidenceEvaluationCandidateV1(
      source.evaluation,
    );
    assertArenaV2A7CurrentFormalAssetCatalogLegacyBindingCandidateV2(
      formalVisualMediaEvidence.legacyEvidence,
    );
    const reportOptions = Object.freeze({
      evaluation,
      producerOptions: source.producerOptions,
    });
    assertFormalVisualMediaIdentity(
      formalVisualMediaEvidence,
      reportOptions.evaluation,
    );
    this.#formalVisualMediaEvidence = formalVisualMediaEvidence;
    this.#reportSession = createArenaV2P7AutomationStageReportSessionCandidateV1(
      reportOptions,
    );
  }

  get state(): ArenaV2P7ReleaseFreezeAssemblySessionStateCandidateV1 {
    return this.#state;
  }

  start(): Promise<Readonly<ArenaV2P7ReleaseFreezeAssemblySessionResultCandidateV1>> {
    if (this.#state !== 'created') {
      throw new Error(`P7 release-freeze assembly session不能从${this.#state}重复start。`);
    }
    this.#state = 'running';
    return this.#run();
  }

  getResult(): Readonly<ArenaV2P7ReleaseFreezeAssemblySessionResultCandidateV1> {
    if (this.#state !== 'completed' || this.#result === null) {
      throw new Error('P7 release-freeze assembly session尚无可读的完整结果。');
    }
    return this.#result;
  }

  destroy(): void {
    if (this.#state === 'running') {
      throw new Error('P7 release-freeze assembly session运行中不得destroy。');
    }
    if (this.#state === 'destroyed') return;
    const reportSession = this.#reportSession;
    if (reportSession !== null) {
      reportSession.destroy();
      this.#reportSession = null;
    }
    this.#result = null;
    this.#formalVisualMediaEvidence = null;
    this.#state = 'destroyed';
  }

  async #run(): Promise<Readonly<ArenaV2P7ReleaseFreezeAssemblySessionResultCandidateV1>> {
    try {
      const reportSession = this.#reportSession;
      if (reportSession === null) {
        throw new Error('P7 release-freeze assembly session运行依赖已释放。');
      }
      const formalVisualMediaEvidence = this.#formalVisualMediaEvidence;
      if (formalVisualMediaEvidence === null) {
        throw new Error('P7 release-freeze assembly session正式视觉/媒体证据已释放。');
      }
      const reportResult = await reportSession.start();
      assertFormalVisualMediaBuildSourceIdentity(
        formalVisualMediaEvidence,
        reportResult.report,
      );
      const releaseFreezeManifest = reportAllowsFreeze(
        reportResult,
        formalVisualMediaEvidence,
      )
        ? createArenaV2P7ReleaseFreezeManifestCandidateV1({
          report: reportResult.report,
          formalVisualMediaEvidence,
        })
        : null;
      const result = Object.freeze({
        schemaVersion:
          ARENA_V2_P7_RELEASE_FREEZE_ASSEMBLY_SESSION_CANDIDATE_V1_SCHEMA_VERSION,
        automationEvidence: reportResult.automationEvidence,
        report: reportResult.report,
        formalVisualMediaEvidence,
        disposition: releaseFreezeManifest === null
          ? 'release-freeze-not-eligible' as const
          : 'release-freeze-eligible' as const,
        releaseFreezeManifest,
      });
      reportSession.destroy();
      this.#reportSession = null;
      this.#formalVisualMediaEvidence = null;
      this.#result = result;
      this.#state = 'completed';
      return result;
    } catch (error) {
      this.#result = null;
      const reportSession = this.#reportSession;
      if (reportSession !== null && reportSession.state !== 'running') {
        try {
          reportSession.destroy();
          this.#reportSession = null;
        } catch (cleanupError) {
          this.#state = 'failed';
          throw new AggregateError(
            [error, cleanupError],
            'P7 release-freeze assembly session失败且子会话清理不完整。',
          );
        }
      }
      this.#formalVisualMediaEvidence = null;
      this.#state = 'failed';
      throw error;
    }
  }
}

export function createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1(
  value: unknown,
): ArenaV2P7ReleaseFreezeAssemblySessionCandidateV1 {
  return new ArenaV2P7ReleaseFreezeAssemblySessionCandidateV1(value);
}

export const ARENA_V2_P7_RELEASE_FREEZE_ASSEMBLY_SESSION_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  defaultReleaseBundleWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  automationStageReportSessionWired: true as const,
  formalVisualMediaEvidenceWired: true as const,
  formalVisualMediaPassRequiredForFreeze: true as const,
  formalVisualMediaEvidenceSchemaRequired: 3 as const,
  approvedFormalAssetBudgetPolicyAssemblyRequired: true as const,
  approvedFormalAssetBudgetStructuralLimitsRequired: true as const,
  currentV2BudgetPolicyCannotQualifyFreeze: true as const,
  formalVisualMediaSameSourceContentAndBuildSetRequired: true as const,
  formalVisualMediaSamePackageLockAndToolchainRequired: true as const,
  currentFormalAssetCatalogRequired: true as const,
  currentFormalAssetCatalogExactAssetIdentityRequired: true as const,
  releaseFreezeQualificationManifestWired: true as const,
  publishes: false as const,
  readsOrWritesFiles: false as const,
  modifiesBranch: false as const,
  writesGitTag: false as const,
  uploadsArtifacts: false as const,
  signsArtifacts: false as const,
});
