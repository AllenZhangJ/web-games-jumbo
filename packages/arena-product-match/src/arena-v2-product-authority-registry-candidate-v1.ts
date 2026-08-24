import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createFinalizedMatchAssignmentV2,
  createDeterministicDataHash,
  validateFinalizedMatchAssignmentV2,
  validateMatchContentSelectionV2,
  type DeepReadonly,
  type MatchContentSelectionV2,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  validateProductResultReplaySettlementEvidenceV1,
  type ProductResultReplaySettlementEvidenceV1,
} from './product-result-replay-settlement-evidence-v1.js';
import {
  validateProductResultRuntimeSettlementEvidenceV2,
  type ProductResultRuntimeSettlementEvidenceV2,
} from './product-result-runtime-settlement-evidence-v2.js';
import {
  validateProductResultRuntimeSettlementEvidenceV3,
  type ProductResultRuntimeSettlementEvidenceV3,
} from './product-result-runtime-settlement-evidence-v3.js';

export const ARENA_V2_PRODUCT_AUTHORITY_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export type ArenaV2ProductAuthorityModeKindCandidateV1 = 'duel' | 'race' | 'survival';

export interface ArenaV2ProductAuthorityDefinitionCandidateV1 {
  readonly modeKind: ArenaV2ProductAuthorityModeKindCandidateV1;
  readonly modeDefinitionId: string;
  readonly replaySchemaVersion: 6;
  readonly ruleSchemaVersion: 6;
  readonly physicsBackendVersion: string;
}

export interface ArenaV2ProductAuthorityRegistryCandidateV1Options {
  readonly schemaVersion:
    typeof ARENA_V2_PRODUCT_AUTHORITY_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly modeRegistryContentHash: string;
  readonly authorities: readonly ArenaV2ProductAuthorityDefinitionCandidateV1[];
}

export interface ArenaV2ProductAuthorityAdmissionCandidateV1 {
  readonly schemaVersion: 1;
  readonly authorityRegistryIdentityHash: string;
  readonly modeRegistryContentHash: string;
  readonly modeKind: ArenaV2ProductAuthorityModeKindCandidateV1;
  readonly modeDefinitionId: string;
  readonly replaySchemaVersion: 6;
  readonly ruleSchemaVersion: 6;
  readonly physicsBackendVersion: string;
  readonly matchSeed: number;
  readonly matchContentHash: string;
  readonly matchAssignmentHash: string;
  readonly contentDefinitionId: string;
  readonly admissionHash: string;
}

export interface ArenaV2ProductAuthorityAdmissionCandidateV2 {
  readonly schemaVersion: 2;
  readonly authorityRegistryIdentityHash: string;
  readonly modeRegistryContentHash: string;
  readonly modeKind: ArenaV2ProductAuthorityModeKindCandidateV1;
  readonly modeDefinitionId: string;
  readonly replaySchemaVersion: 6;
  readonly ruleSchemaVersion: 6;
  readonly physicsBackendVersion: string;
  readonly matchSeed: number;
  readonly matchContentHash: string;
  readonly matchAssignmentHash: string;
  readonly contentDefinitionId: string;
  readonly modeDriverContentHash: string;
  readonly admissionHash: string;
}

export type ArenaV2ProductAuthorityAdmissionCandidate =
  | ArenaV2ProductAuthorityAdmissionCandidateV1
  | ArenaV2ProductAuthorityAdmissionCandidateV2;

export interface ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV1 {
  readonly schemaVersion: 1;
  readonly authorityRegistryIdentityHash: string;
  readonly authorityAdmissionHash: string;
  readonly admission: ArenaV2ProductAuthorityAdmissionCandidateV1;
  readonly settlementEvidence: ProductResultReplaySettlementEvidenceV1;
  readonly registeredSettlementEvidenceHash: string;
}

export interface ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV2 {
  readonly schemaVersion: 2;
  readonly authorityRegistryIdentityHash: string;
  readonly authorityAdmissionHash: string;
  readonly admission: ArenaV2ProductAuthorityAdmissionCandidateV2;
  readonly settlementEvidence: ProductResultRuntimeSettlementEvidenceV2;
  readonly registeredSettlementEvidenceHash: string;
}

export interface ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV3 {
  readonly schemaVersion: 3;
  readonly authorityRegistryIdentityHash: string;
  readonly authorityAdmissionHash: string;
  readonly admission: ArenaV2ProductAuthorityAdmissionCandidateV2;
  readonly settlementEvidence: ProductResultRuntimeSettlementEvidenceV3;
  readonly registeredSettlementEvidenceHash: string;
}

const REGISTRY_OPTION_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'modeRegistryContentHash', 'authorities',
]);
const AUTHORITY_KEYS = new Set([
  'modeKind', 'modeDefinitionId', 'replaySchemaVersion', 'ruleSchemaVersion',
  'physicsBackendVersion',
]);
const ADMISSION_REQUEST_KEYS = new Set([
  'modeKind', 'modeDefinitionId', 'matchSeed', 'content', 'finalAssignment',
]);
const ADMISSION_V2_REQUEST_KEYS = new Set([
  ...ADMISSION_REQUEST_KEYS,
  'modeDriverContentHash',
]);
const ADMISSION_KEYS = new Set([
  'schemaVersion', 'authorityRegistryIdentityHash', 'modeRegistryContentHash',
  'modeKind', 'modeDefinitionId', 'replaySchemaVersion', 'ruleSchemaVersion',
  'physicsBackendVersion', 'matchSeed', 'matchContentHash', 'contentDefinitionId',
  'matchAssignmentHash',
  'admissionHash',
]);
const ADMISSION_V2_KEYS = new Set([
  ...ADMISSION_KEYS,
  'modeDriverContentHash',
]);
const REGISTERED_SETTLEMENT_CREATE_KEYS = new Set(['admission', 'settlementEvidence']);
const REGISTERED_SETTLEMENT_KEYS = new Set([
  'schemaVersion', 'authorityRegistryIdentityHash', 'authorityAdmissionHash',
  'admission', 'settlementEvidence', 'registeredSettlementEvidenceHash',
]);
const MODE_KINDS = Object.freeze(['duel', 'race', 'survival'] as const);
const MODE_KIND_SET: ReadonlySet<unknown> = new Set(MODE_KINDS);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
  return source;
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash。`);
  }
  return value;
}

function modeKind(
  value: unknown,
  name: string,
): ArenaV2ProductAuthorityModeKindCandidateV1 {
  if (!MODE_KIND_SET.has(value)) throw new RangeError(`${name}不受支持。`);
  return value as ArenaV2ProductAuthorityModeKindCandidateV1;
}

function matchSeed(value: unknown, name: string): number {
  const normalized = assertIntegerAtLeast(value, 0, name);
  if (normalized > 0xffff_ffff) throw new RangeError(`${name}必须是uint32。`);
  return normalized;
}

function assertAssignmentMatchesContent(
  finalAssignment: ReturnType<typeof validateFinalizedMatchAssignmentV2>,
  content: ReturnType<typeof validateMatchContentSelectionV2>,
): void {
  if (finalAssignment.participants.length !== content.participantCharacters.length) {
    throw new RangeError('Arena V2 Product Authority admission参与者分配与内容角色数量不一致。');
  }
  for (let index = 0; index < finalAssignment.participants.length; index += 1) {
    const assigned = finalAssignment.participants[index];
    const selected = content.participantCharacters[index];
    if (assigned === undefined
      || selected === undefined
      || assigned.participantId !== selected.participantId
      || assigned.characterDefinitionId !== selected.definitionId) {
      throw new RangeError('Arena V2 Product Authority admission参与者分配与内容角色不一致。');
    }
  }
}

function normalizeAuthority(
  value: unknown,
  index: number,
): ArenaV2ProductAuthorityDefinitionCandidateV1 {
  const name = `Arena V2 Product Authority Registry authorities[${index}]`;
  const source = exactRecord(value, AUTHORITY_KEYS, name);
  if (source.replaySchemaVersion !== 6 || source.ruleSchemaVersion !== 6) {
    throw new RangeError(`${name}只接受Replay/Rule schema 6。`);
  }
  return Object.freeze({
    modeKind: modeKind(source.modeKind, `${name}.modeKind`),
    modeDefinitionId: assertNonEmptyString(source.modeDefinitionId, `${name}.modeDefinitionId`),
    replaySchemaVersion: 6 as const,
    ruleSchemaVersion: 6 as const,
    physicsBackendVersion: assertNonEmptyString(
      source.physicsBackendVersion,
      `${name}.physicsBackendVersion`,
    ),
  });
}

function normalizeAdmissionCore(value: PlainRecord) {
  if (value.schemaVersion !== 1) {
    throw new RangeError('Arena V2 Product Authority admission schemaVersion必须是1。');
  }
  if (value.replaySchemaVersion !== 6 || value.ruleSchemaVersion !== 6) {
    throw new RangeError('Arena V2 Product Authority admission只接受Replay/Rule schema 6。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    authorityRegistryIdentityHash: hash(
      value.authorityRegistryIdentityHash,
      'Arena V2 Product Authority admission authorityRegistryIdentityHash',
    ),
    modeRegistryContentHash: hash(
      value.modeRegistryContentHash,
      'Arena V2 Product Authority admission modeRegistryContentHash',
    ),
    modeKind: modeKind(value.modeKind, 'Arena V2 Product Authority admission modeKind'),
    modeDefinitionId: assertNonEmptyString(
      value.modeDefinitionId,
      'Arena V2 Product Authority admission modeDefinitionId',
    ),
    replaySchemaVersion: 6 as const,
    ruleSchemaVersion: 6 as const,
    physicsBackendVersion: assertNonEmptyString(
      value.physicsBackendVersion,
      'Arena V2 Product Authority admission physicsBackendVersion',
    ),
    matchSeed: matchSeed(value.matchSeed, 'Arena V2 Product Authority admission matchSeed'),
    matchContentHash: hash(
      value.matchContentHash,
      'Arena V2 Product Authority admission matchContentHash',
    ),
    matchAssignmentHash: hash(
      value.matchAssignmentHash,
      'Arena V2 Product Authority admission matchAssignmentHash',
    ),
    contentDefinitionId: assertNonEmptyString(
      value.contentDefinitionId,
      'Arena V2 Product Authority admission contentDefinitionId',
    ),
  });
}

function normalizeAdmissionCoreV2(value: PlainRecord) {
  if (value.schemaVersion !== 2) {
    throw new RangeError('Arena V2 Product Authority admission V2 schemaVersion必须是2。');
  }
  if (value.replaySchemaVersion !== 6 || value.ruleSchemaVersion !== 6) {
    throw new RangeError('Arena V2 Product Authority admission V2只接受Replay/Rule schema 6。');
  }
  return Object.freeze({
    schemaVersion: 2 as const,
    authorityRegistryIdentityHash: hash(
      value.authorityRegistryIdentityHash,
      'Arena V2 Product Authority admission V2 authorityRegistryIdentityHash',
    ),
    modeRegistryContentHash: hash(
      value.modeRegistryContentHash,
      'Arena V2 Product Authority admission V2 modeRegistryContentHash',
    ),
    modeKind: modeKind(value.modeKind, 'Arena V2 Product Authority admission V2 modeKind'),
    modeDefinitionId: assertNonEmptyString(
      value.modeDefinitionId,
      'Arena V2 Product Authority admission V2 modeDefinitionId',
    ),
    replaySchemaVersion: 6 as const,
    ruleSchemaVersion: 6 as const,
    physicsBackendVersion: assertNonEmptyString(
      value.physicsBackendVersion,
      'Arena V2 Product Authority admission V2 physicsBackendVersion',
    ),
    matchSeed: matchSeed(value.matchSeed, 'Arena V2 Product Authority admission V2 matchSeed'),
    matchContentHash: hash(
      value.matchContentHash,
      'Arena V2 Product Authority admission V2 matchContentHash',
    ),
    matchAssignmentHash: hash(
      value.matchAssignmentHash,
      'Arena V2 Product Authority admission V2 matchAssignmentHash',
    ),
    contentDefinitionId: assertNonEmptyString(
      value.contentDefinitionId,
      'Arena V2 Product Authority admission V2 contentDefinitionId',
    ),
    modeDriverContentHash: hash(
      value.modeDriverContentHash,
      'Arena V2 Product Authority admission V2 modeDriverContentHash',
    ),
  });
}

/**
 * Product-level single source for stable Authority compatibility. Per-match
 * config/rule/final hashes deliberately stay in Replay/Result evidence and are
 * never copied into this registry.
 */
export class ArenaV2ProductAuthorityRegistryCandidateV1 {
  readonly schemaVersion = ARENA_V2_PRODUCT_AUTHORITY_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION;
  readonly status = 'production-unreachable' as const;
  readonly implementationStatus = 'code-written-not-run' as const;
  readonly hardGate = false as const;
  readonly defaultRegistryWired = false as const;
  readonly defaultCompositionWired = false as const;
  readonly defaultEntryWired = false as const;
  readonly validationStatus = 'not-run' as const;
  readonly modeRegistryContentHash: string;
  readonly registryIdentityHash: string;
  readonly authorities: readonly ArenaV2ProductAuthorityDefinitionCandidateV1[];
  readonly #authoritiesByKind: ReadonlyMap<
    ArenaV2ProductAuthorityModeKindCandidateV1,
    ArenaV2ProductAuthorityDefinitionCandidateV1
  >;

  constructor(value: ArenaV2ProductAuthorityRegistryCandidateV1Options);
  constructor(value: unknown) {
    const source = exactRecord(
      cloneFrozenData(value, 'Arena V2 Product Authority Registry options'),
      REGISTRY_OPTION_KEYS,
      'Arena V2 Product Authority Registry options',
    );
    if (source.schemaVersion
      !== ARENA_V2_PRODUCT_AUTHORITY_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION) {
      throw new RangeError('Arena V2 Product Authority Registry schemaVersion必须是1。');
    }
    if (source.status !== 'production-unreachable' || source.hardGate !== false) {
      throw new RangeError('Arena V2 Product Authority Registry只能构造生产不可达候选。');
    }
    if (!Array.isArray(source.authorities) || source.authorities.length !== MODE_KINDS.length) {
      throw new RangeError('Arena V2 Product Authority Registry必须精确登记三种模式。');
    }
    const authorities = source.authorities.map(normalizeAuthority).sort((left, right) => (
      left.modeKind < right.modeKind ? -1 : left.modeKind > right.modeKind ? 1 : 0
    ));
    const byKind = new Map(authorities.map((authority) => [authority.modeKind, authority]));
    if (byKind.size !== MODE_KINDS.length
      || MODE_KINDS.some((kind) => !byKind.has(kind))
      || new Set(authorities.map(({ modeDefinitionId }) => modeDefinitionId)).size
        !== MODE_KINDS.length) {
      throw new RangeError('Arena V2 Product Authority Registry模式kind与Definition必须一一对应。');
    }
    this.modeRegistryContentHash = hash(
      source.modeRegistryContentHash,
      'Arena V2 Product Authority Registry modeRegistryContentHash',
    );
    this.authorities = Object.freeze(authorities);
    this.#authoritiesByKind = byKind;
    this.registryIdentityHash = createDeterministicDataHash(Object.freeze({
      schemaVersion: this.schemaVersion,
      modeRegistryContentHash: this.modeRegistryContentHash,
      authorities: this.authorities,
    }), 'Arena V2 Product Authority Registry identity');
    Object.freeze(this);
  }

  admitMatch(value: unknown): ArenaV2ProductAuthorityAdmissionCandidateV1 {
    const source = exactRecord(
      cloneFrozenData(value, 'Arena V2 Product Authority admission request'),
      ADMISSION_REQUEST_KEYS,
      'Arena V2 Product Authority admission request',
    );
    const requestedKind = modeKind(
      source.modeKind,
      'Arena V2 Product Authority admission request modeKind',
    );
    const authority = this.#authoritiesByKind.get(requestedKind)!;
    const requestedModeDefinitionId = assertNonEmptyString(
      source.modeDefinitionId,
      'Arena V2 Product Authority admission request modeDefinitionId',
    );
    const content = validateMatchContentSelectionV2(source.content);
    const finalAssignment = validateFinalizedMatchAssignmentV2(source.finalAssignment);
    assertAssignmentMatchesContent(finalAssignment, content);
    const expectedRegistrySuffix = `.mode-registry-${this.modeRegistryContentHash}`;
    if (
      authority.modeDefinitionId !== requestedModeDefinitionId
      || content.modeDefinitionId !== requestedModeDefinitionId
      || finalAssignment.modeDefinitionId !== requestedModeDefinitionId
      || finalAssignment.contentHash !== content.contentHash
      || !content.contentDefinitionId.endsWith(expectedRegistrySuffix)
      || content.contentDefinitionId.length === expectedRegistrySuffix.length
    ) {
      throw new RangeError('Arena V2 Product Authority admission未闭合同一Mode Registry内容身份。');
    }
    const core = Object.freeze({
      schemaVersion: 1 as const,
      authorityRegistryIdentityHash: this.registryIdentityHash,
      modeRegistryContentHash: this.modeRegistryContentHash,
      ...authority,
      matchSeed: matchSeed(source.matchSeed, 'Arena V2 Product Authority admission matchSeed'),
      matchContentHash: content.contentHash,
      matchAssignmentHash: finalAssignment.assignmentHash,
      contentDefinitionId: content.contentDefinitionId,
    });
    return Object.freeze({
      ...core,
      admissionHash: createDeterministicDataHash(
        core,
        'Arena V2 Product Authority admission identity',
      ),
    });
  }

  admitMatchV2(value: unknown): ArenaV2ProductAuthorityAdmissionCandidateV2 {
    const source = exactRecord(
      cloneFrozenData(value, 'Arena V2 Product Authority admission V2 request'),
      ADMISSION_V2_REQUEST_KEYS,
      'Arena V2 Product Authority admission V2 request',
    );
    const v1Admission = this.admitMatch({
      modeKind: source.modeKind,
      modeDefinitionId: source.modeDefinitionId,
      matchSeed: source.matchSeed,
      content: source.content,
      finalAssignment: source.finalAssignment,
    });
    const core = Object.freeze({
      schemaVersion: 2 as const,
      authorityRegistryIdentityHash: v1Admission.authorityRegistryIdentityHash,
      modeRegistryContentHash: v1Admission.modeRegistryContentHash,
      modeKind: v1Admission.modeKind,
      modeDefinitionId: v1Admission.modeDefinitionId,
      replaySchemaVersion: v1Admission.replaySchemaVersion,
      ruleSchemaVersion: v1Admission.ruleSchemaVersion,
      physicsBackendVersion: v1Admission.physicsBackendVersion,
      matchSeed: v1Admission.matchSeed,
      matchContentHash: v1Admission.matchContentHash,
      matchAssignmentHash: v1Admission.matchAssignmentHash,
      contentDefinitionId: v1Admission.contentDefinitionId,
      modeDriverContentHash: hash(
        source.modeDriverContentHash,
        'Arena V2 Product Authority admission V2 request modeDriverContentHash',
      ),
    });
    return Object.freeze({
      ...core,
      admissionHash: createDeterministicDataHash(
        core,
        'Arena V2 Product Authority admission V2 identity',
      ),
    });
  }

  validateAdmission(value: unknown): ArenaV2ProductAuthorityAdmissionCandidateV1 {
    const source = exactRecord(
      cloneFrozenData(value, 'Arena V2 Product Authority admission'),
      ADMISSION_KEYS,
      'Arena V2 Product Authority admission',
    );
    const expectedAdmissionHash = hash(
      source.admissionHash,
      'Arena V2 Product Authority admission admissionHash',
    );
    const core = normalizeAdmissionCore(source);
    const authority = this.#authoritiesByKind.get(core.modeKind)!;
    if (
      core.authorityRegistryIdentityHash !== this.registryIdentityHash
      || core.modeRegistryContentHash !== this.modeRegistryContentHash
      || core.modeDefinitionId !== authority.modeDefinitionId
      || core.replaySchemaVersion !== authority.replaySchemaVersion
      || core.ruleSchemaVersion !== authority.ruleSchemaVersion
      || core.physicsBackendVersion !== authority.physicsBackendVersion
      || !core.contentDefinitionId.endsWith(`.mode-registry-${this.modeRegistryContentHash}`)
      || core.contentDefinitionId.length
        === `.mode-registry-${this.modeRegistryContentHash}`.length
    ) {
      throw new RangeError('Arena V2 Product Authority admission与当前Registry不一致。');
    }
    const admissionHash = createDeterministicDataHash(
      core,
      'Arena V2 Product Authority admission identity',
    );
    if (admissionHash !== expectedAdmissionHash) {
      throw new RangeError('Arena V2 Product Authority admission hash重算不一致。');
    }
    return Object.freeze({ ...core, admissionHash });
  }

  validateAdmissionV2(value: unknown): ArenaV2ProductAuthorityAdmissionCandidateV2 {
    const source = exactRecord(
      cloneFrozenData(value, 'Arena V2 Product Authority admission V2'),
      ADMISSION_V2_KEYS,
      'Arena V2 Product Authority admission V2',
    );
    const expectedAdmissionHash = hash(
      source.admissionHash,
      'Arena V2 Product Authority admission V2 admissionHash',
    );
    const core = normalizeAdmissionCoreV2(source);
    const authority = this.#authoritiesByKind.get(core.modeKind)!;
    if (
      core.authorityRegistryIdentityHash !== this.registryIdentityHash
      || core.modeRegistryContentHash !== this.modeRegistryContentHash
      || core.modeDefinitionId !== authority.modeDefinitionId
      || core.replaySchemaVersion !== authority.replaySchemaVersion
      || core.ruleSchemaVersion !== authority.ruleSchemaVersion
      || core.physicsBackendVersion !== authority.physicsBackendVersion
      || !core.contentDefinitionId.endsWith(`.mode-registry-${this.modeRegistryContentHash}`)
      || core.contentDefinitionId.length
        === `.mode-registry-${this.modeRegistryContentHash}`.length
    ) {
      throw new RangeError('Arena V2 Product Authority admission V2与当前Registry不一致。');
    }
    const admissionHash = createDeterministicDataHash(
      core,
      'Arena V2 Product Authority admission V2 identity',
    );
    if (admissionHash !== expectedAdmissionHash) {
      throw new RangeError('Arena V2 Product Authority admission V2 hash重算不一致。');
    }
    return Object.freeze({ ...core, admissionHash });
  }

  validateAdmissionCandidate(value: unknown): ArenaV2ProductAuthorityAdmissionCandidate {
    const source = assertPlainRecord(
      cloneFrozenData(value, 'Arena V2 Product Authority admission candidate'),
      'Arena V2 Product Authority admission candidate',
    );
    const descriptor = Object.getOwnPropertyDescriptor(source, 'schemaVersion');
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError('Arena V2 Product Authority admission candidate.schemaVersion必须是数据字段。');
    }
    if (descriptor.value === 1) return this.validateAdmission(source);
    if (descriptor.value === 2) return this.validateAdmissionV2(source);
    throw new RangeError('Arena V2 Product Authority admission candidate schemaVersion不受支持。');
  }

  createRegisteredSettlementEvidence(
    value: unknown,
  ): ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV1 {
    const source = exactRecord(
      cloneFrozenData(
        value,
        'Arena V2 Product Authority registered settlement create options',
      ),
      REGISTERED_SETTLEMENT_CREATE_KEYS,
      'Arena V2 Product Authority registered settlement create options',
    );
    const admission = this.validateAdmission(source.admission);
    const settlementEvidence = validateProductResultReplaySettlementEvidenceV1(
      source.settlementEvidence,
    );
    const { result, replay } = settlementEvidence;
    const terminalAssignment = createFinalizedMatchAssignmentV2({
      schemaVersion: 2,
      modeDefinitionId: result.modeDefinitionId,
      contentHash: result.content.contentHash,
      participants: replay.participantAssignments,
    });
    if (
      result.modeDefinitionId !== admission.modeDefinitionId
      || result.matchSeed !== admission.matchSeed
      || result.content.contentHash !== admission.matchContentHash
      || result.content.contentDefinitionId !== admission.contentDefinitionId
      || terminalAssignment.assignmentHash !== admission.matchAssignmentHash
      || replay.config.modeKind !== admission.modeKind
      || replay.replaySchemaVersion !== admission.replaySchemaVersion
      || replay.authoritySchemaVersion !== admission.ruleSchemaVersion
      || replay.physicsBackendVersion !== admission.physicsBackendVersion
    ) {
      throw new RangeError('Arena V2 Product Authority结算证据不符合开局Registry准入身份。');
    }
    const core = Object.freeze({
      schemaVersion: 1 as const,
      authorityRegistryIdentityHash: this.registryIdentityHash,
      authorityAdmissionHash: admission.admissionHash,
      admission,
      settlementEvidence,
    });
    return Object.freeze({
      ...core,
      registeredSettlementEvidenceHash: createDeterministicDataHash(Object.freeze({
        schemaVersion: core.schemaVersion,
        authorityRegistryIdentityHash: core.authorityRegistryIdentityHash,
        authorityAdmissionHash: core.authorityAdmissionHash,
        settlementEvidenceHash: settlementEvidence.settlementEvidenceHash,
      }), 'Arena V2 Product Authority registered settlement identity'),
    });
  }

  validateRegisteredSettlementEvidence(
    value: unknown,
  ): ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV1 {
    const source = exactRecord(
      cloneFrozenData(value, 'Arena V2 Product Authority registered settlement evidence'),
      REGISTERED_SETTLEMENT_KEYS,
      'Arena V2 Product Authority registered settlement evidence',
    );
    if (source.schemaVersion !== 1) {
      throw new RangeError('Arena V2 Product Authority registered settlement schemaVersion必须是1。');
    }
    const expectedRegistryIdentity = hash(
      source.authorityRegistryIdentityHash,
      'Arena V2 Product Authority registered settlement authorityRegistryIdentityHash',
    );
    const expectedAdmissionHash = hash(
      source.authorityAdmissionHash,
      'Arena V2 Product Authority registered settlement authorityAdmissionHash',
    );
    const expectedEvidenceHash = hash(
      source.registeredSettlementEvidenceHash,
      'Arena V2 Product Authority registered settlement evidenceHash',
    );
    if (expectedRegistryIdentity !== this.registryIdentityHash) {
      throw new RangeError('Arena V2 Product Authority registered settlement Registry漂移。');
    }
    const admission = this.validateAdmission(source.admission);
    if (admission.admissionHash !== expectedAdmissionHash) {
      throw new RangeError('Arena V2 Product Authority registered settlement Admission漂移。');
    }
    const settlementEvidence = validateProductResultReplaySettlementEvidenceV1(
      source.settlementEvidence,
    );
    const recreated = this.createRegisteredSettlementEvidence({ admission, settlementEvidence });
    const expectedHash = createDeterministicDataHash(Object.freeze({
      schemaVersion: 1,
      authorityRegistryIdentityHash: expectedRegistryIdentity,
      authorityAdmissionHash: expectedAdmissionHash,
      settlementEvidenceHash: settlementEvidence.settlementEvidenceHash,
    }), 'Arena V2 Product Authority registered settlement identity');
    if (expectedHash !== expectedEvidenceHash
      || recreated.registeredSettlementEvidenceHash !== expectedEvidenceHash) {
      throw new RangeError('Arena V2 Product Authority registered settlement hash重算不一致。');
    }
    return Object.freeze({
      schemaVersion: 1 as const,
      authorityRegistryIdentityHash: expectedRegistryIdentity,
      authorityAdmissionHash: expectedAdmissionHash,
      admission,
      settlementEvidence,
      registeredSettlementEvidenceHash: expectedEvidenceHash,
    });
  }

  createRegisteredSettlementEvidenceV2(
    value: unknown,
  ): ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV2 {
    const source = exactRecord(
      cloneFrozenData(
        value,
        'Arena V2 Product Authority registered settlement V2 create options',
      ),
      REGISTERED_SETTLEMENT_CREATE_KEYS,
      'Arena V2 Product Authority registered settlement V2 create options',
    );
    const admission = this.validateAdmissionV2(source.admission);
    const settlementEvidence = validateProductResultRuntimeSettlementEvidenceV2(
      source.settlementEvidence,
    );
    const { result, replay } = settlementEvidence;
    const terminalAssignment = createFinalizedMatchAssignmentV2({
      schemaVersion: 2,
      modeDefinitionId: result.modeDefinitionId,
      contentHash: result.content.contentHash,
      participants: replay.participantAssignments,
    });
    if (
      result.modeDefinitionId !== admission.modeDefinitionId
      || result.matchSeed !== admission.matchSeed
      || result.content.contentHash !== admission.matchContentHash
      || result.content.contentDefinitionId !== admission.contentDefinitionId
      || terminalAssignment.assignmentHash !== admission.matchAssignmentHash
      || replay.config.modeKind !== admission.modeKind
      || replay.replaySchemaVersion !== admission.replaySchemaVersion
      || replay.authoritySchemaVersion !== admission.ruleSchemaVersion
      || replay.physicsBackendVersion !== admission.physicsBackendVersion
      || settlementEvidence.modeDriverContentHash !== admission.modeDriverContentHash
    ) {
      throw new RangeError('Arena V2 Product Authority V2结算证据不符合开局Registry准入身份。');
    }
    const core = Object.freeze({
      schemaVersion: 2 as const,
      authorityRegistryIdentityHash: this.registryIdentityHash,
      authorityAdmissionHash: admission.admissionHash,
      admission,
      settlementEvidence,
    });
    return Object.freeze({
      ...core,
      registeredSettlementEvidenceHash: createDeterministicDataHash(Object.freeze({
        schemaVersion: core.schemaVersion,
        authorityRegistryIdentityHash: core.authorityRegistryIdentityHash,
        authorityAdmissionHash: core.authorityAdmissionHash,
        settlementEvidenceHash: settlementEvidence.settlementEvidenceHash,
      }), 'Arena V2 Product Authority registered settlement V2 identity'),
    });
  }

  validateRegisteredSettlementEvidenceV2(
    value: unknown,
  ): ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV2 {
    const source = exactRecord(
      cloneFrozenData(value, 'Arena V2 Product Authority registered settlement V2 evidence'),
      REGISTERED_SETTLEMENT_KEYS,
      'Arena V2 Product Authority registered settlement V2 evidence',
    );
    if (source.schemaVersion !== 2) {
      throw new RangeError('Arena V2 Product Authority registered settlement V2 schemaVersion必须是2。');
    }
    const expectedRegistryIdentity = hash(
      source.authorityRegistryIdentityHash,
      'Arena V2 Product Authority registered settlement V2 authorityRegistryIdentityHash',
    );
    const expectedAdmissionHash = hash(
      source.authorityAdmissionHash,
      'Arena V2 Product Authority registered settlement V2 authorityAdmissionHash',
    );
    const expectedEvidenceHash = hash(
      source.registeredSettlementEvidenceHash,
      'Arena V2 Product Authority registered settlement V2 evidenceHash',
    );
    if (expectedRegistryIdentity !== this.registryIdentityHash) {
      throw new RangeError('Arena V2 Product Authority registered settlement V2 Registry漂移。');
    }
    const admission = this.validateAdmissionV2(source.admission);
    if (admission.admissionHash !== expectedAdmissionHash) {
      throw new RangeError('Arena V2 Product Authority registered settlement V2 Admission漂移。');
    }
    const settlementEvidence = validateProductResultRuntimeSettlementEvidenceV2(
      source.settlementEvidence,
    );
    const recreated = this.createRegisteredSettlementEvidenceV2({
      admission,
      settlementEvidence,
    });
    const expectedHash = createDeterministicDataHash(Object.freeze({
      schemaVersion: 2,
      authorityRegistryIdentityHash: expectedRegistryIdentity,
      authorityAdmissionHash: expectedAdmissionHash,
      settlementEvidenceHash: settlementEvidence.settlementEvidenceHash,
    }), 'Arena V2 Product Authority registered settlement V2 identity');
    if (expectedHash !== expectedEvidenceHash
      || recreated.registeredSettlementEvidenceHash !== expectedEvidenceHash) {
      throw new RangeError('Arena V2 Product Authority registered settlement V2 hash重算不一致。');
    }
    return Object.freeze({
      schemaVersion: 2 as const,
      authorityRegistryIdentityHash: expectedRegistryIdentity,
      authorityAdmissionHash: expectedAdmissionHash,
      admission,
      settlementEvidence,
      registeredSettlementEvidenceHash: expectedEvidenceHash,
    });
  }

  createRegisteredSettlementEvidenceV3(
    value: unknown,
  ): ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV3 {
    const source = exactRecord(
      cloneFrozenData(
        value,
        'Arena V2 Product Authority registered settlement V3 create options',
      ),
      REGISTERED_SETTLEMENT_CREATE_KEYS,
      'Arena V2 Product Authority registered settlement V3 create options',
    );
    const admission = this.validateAdmissionV2(source.admission);
    const settlementEvidence = validateProductResultRuntimeSettlementEvidenceV3(
      source.settlementEvidence,
    );
    const { result, replay } = settlementEvidence;
    const terminalAssignment = createFinalizedMatchAssignmentV2({
      schemaVersion: 2,
      modeDefinitionId: result.modeDefinitionId,
      contentHash: result.content.contentHash,
      participants: replay.participantAssignments,
    });
    if (result.modeDefinitionId !== admission.modeDefinitionId
      || result.matchSeed !== admission.matchSeed
      || result.content.contentHash !== admission.matchContentHash
      || result.content.contentDefinitionId !== admission.contentDefinitionId
      || terminalAssignment.assignmentHash !== admission.matchAssignmentHash
      || replay.config.modeKind !== admission.modeKind
      || replay.replaySchemaVersion !== admission.replaySchemaVersion
      || replay.authoritySchemaVersion !== admission.ruleSchemaVersion
      || replay.physicsBackendVersion !== admission.physicsBackendVersion
      || settlementEvidence.modeDriverContentHash !== admission.modeDriverContentHash) {
      throw new RangeError('Arena V2 Product Authority V3结算证据不符合开局Registry准入身份。');
    }
    const core = Object.freeze({
      schemaVersion: 3 as const,
      authorityRegistryIdentityHash: this.registryIdentityHash,
      authorityAdmissionHash: admission.admissionHash,
      admission,
      settlementEvidence,
    });
    return Object.freeze({
      ...core,
      registeredSettlementEvidenceHash: createDeterministicDataHash(Object.freeze({
        schemaVersion: core.schemaVersion,
        authorityRegistryIdentityHash: core.authorityRegistryIdentityHash,
        authorityAdmissionHash: core.authorityAdmissionHash,
        settlementEvidenceHash: settlementEvidence.settlementEvidenceHash,
      }), 'Arena V2 Product Authority registered settlement V3 identity'),
    });
  }

  validateRegisteredSettlementEvidenceV3(
    value: unknown,
  ): ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV3 {
    const source = exactRecord(
      cloneFrozenData(value, 'Arena V2 Product Authority registered settlement V3 evidence'),
      REGISTERED_SETTLEMENT_KEYS,
      'Arena V2 Product Authority registered settlement V3 evidence',
    );
    if (source.schemaVersion !== 3) {
      throw new RangeError('Arena V2 Product Authority registered settlement V3 schemaVersion必须是3。');
    }
    const expectedRegistryIdentity = hash(
      source.authorityRegistryIdentityHash,
      'Arena V2 Product Authority registered settlement V3 authorityRegistryIdentityHash',
    );
    const expectedAdmissionHash = hash(
      source.authorityAdmissionHash,
      'Arena V2 Product Authority registered settlement V3 authorityAdmissionHash',
    );
    const expectedEvidenceHash = hash(
      source.registeredSettlementEvidenceHash,
      'Arena V2 Product Authority registered settlement V3 evidenceHash',
    );
    if (expectedRegistryIdentity !== this.registryIdentityHash) {
      throw new RangeError('Arena V2 Product Authority registered settlement V3 Registry漂移。');
    }
    const admission = this.validateAdmissionV2(source.admission);
    if (admission.admissionHash !== expectedAdmissionHash) {
      throw new RangeError('Arena V2 Product Authority registered settlement V3 Admission漂移。');
    }
    const settlementEvidence = validateProductResultRuntimeSettlementEvidenceV3(
      source.settlementEvidence,
    );
    const recreated = this.createRegisteredSettlementEvidenceV3({
      admission,
      settlementEvidence,
    });
    const expectedHash = createDeterministicDataHash(Object.freeze({
      schemaVersion: 3,
      authorityRegistryIdentityHash: expectedRegistryIdentity,
      authorityAdmissionHash: expectedAdmissionHash,
      settlementEvidenceHash: settlementEvidence.settlementEvidenceHash,
    }), 'Arena V2 Product Authority registered settlement V3 identity');
    if (expectedHash !== expectedEvidenceHash
      || recreated.registeredSettlementEvidenceHash !== expectedEvidenceHash) {
      throw new RangeError('Arena V2 Product Authority registered settlement V3 hash重算不一致。');
    }
    return Object.freeze({
      schemaVersion: 3 as const,
      authorityRegistryIdentityHash: expectedRegistryIdentity,
      authorityAdmissionHash: expectedAdmissionHash,
      admission,
      settlementEvidence,
      registeredSettlementEvidenceHash: expectedEvidenceHash,
    });
  }
}

export const ARENA_V2_PRODUCT_AUTHORITY_REGISTRY_ASSEMBLY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  stableIdentityFields: Object.freeze([
    'modeRegistryContentHash', 'modeKind', 'modeDefinitionId',
    'replaySchemaVersion', 'ruleSchemaVersion', 'physicsBackendVersion',
  ] as const),
  matchAdmissionV1IdentityFields: Object.freeze([
    'modeKind', 'modeDefinitionId', 'matchSeed', 'matchContentHash',
    'contentDefinitionId', 'matchAssignmentHash',
  ] as const),
  matchAdmissionV2AdditionalIdentityFields: Object.freeze([
    'modeDriverContentHash',
  ] as const),
  perMatchDynamicHashesStoredInRegistry: false as const,
  matchAdmissionRequiredBeforeRegisteredSettlement: true as const,
  runtimeModeDriverIdentityRequiredBySettlementV2: true as const,
  completeSupplyFactIdentityRequiredBySettlementV3: true as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
});

export type ArenaV2ProductAuthorityRegisteredSettlementEvidenceReadonlyCandidateV1 =
  DeepReadonly<ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV1>;

export type ArenaV2ProductAuthorityRegisteredSettlementEvidenceReadonlyCandidateV2 =
  DeepReadonly<ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV2>;

export type ArenaV2ProductAuthorityRegisteredSettlementEvidenceReadonlyCandidateV3 =
  DeepReadonly<ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV3>;

export type ArenaV2ProductAuthorityMatchContentCandidateV1 =
  DeepReadonly<MatchContentSelectionV2>;
