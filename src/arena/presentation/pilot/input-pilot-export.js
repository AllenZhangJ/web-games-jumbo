import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import { createInputPilotReport } from './input-pilot-report.js';
import { createInputPilotWorkspace } from './input-pilot-workspace.js';

export const INPUT_PILOT_EXPORT_SCHEMA_VERSION = 1;

export const INPUT_PILOT_EXPORT_PRIVACY_CLASS = Object.freeze({
  PSEUDONYMOUS_RESEARCH_DATA: 'pseudonymous-research-data',
  IDENTITY_FREE_AGGREGATE: 'identity-free-aggregate',
});

const AUDIT_EXPORT_KEYS = new Set([
  'schemaVersion',
  'privacyClass',
  'definition',
  'definitionHash',
  'workspaceRevision',
  'recordCount',
  'sourceDataHash',
  'records',
  'report',
]);
const CONTENT_HASH_PATTERN = /^[0-9a-f]{8}$/;
const MAXIMUM_AUDIT_RECORDS = 10_000;

function sameDeterministicData(left, right, label) {
  return createDeterministicDataHash(left, `${label} actual`)
    === createDeterministicDataHash(right, `${label} expected`);
}

export function validateInputPilotAuditExport(definitionValue, value) {
  const definition = createInputPilotDefinition(definitionValue);
  const source = cloneFrozenData(value, 'InputPilotAuditExport');
  assertKnownKeys(source, AUDIT_EXPORT_KEYS, 'InputPilotAuditExport');
  if (source.schemaVersion !== INPUT_PILOT_EXPORT_SCHEMA_VERSION) {
    throw new RangeError(`不支持 InputPilotAuditExport schema ${String(source.schemaVersion)}。`);
  }
  if (source.privacyClass !== INPUT_PILOT_EXPORT_PRIVACY_CLASS.PSEUDONYMOUS_RESEARCH_DATA) {
    throw new RangeError('InputPilotAuditExport 必须是 pseudonymous research data。');
  }
  const embeddedDefinition = createInputPilotDefinition(source.definition);
  if (
    embeddedDefinition.id !== definition.id
    || embeddedDefinition.getContentHash() !== definition.getContentHash()
    || !sameDeterministicData(embeddedDefinition.toJSON(), definition.toJSON(), 'Pilot definition')
  ) throw new RangeError('InputPilotAuditExport Definition 与固定试验合同不一致。');
  if (
    typeof source.definitionHash !== 'string'
    || !CONTENT_HASH_PATTERN.test(source.definitionHash)
    || source.definitionHash !== definition.getContentHash()
  ) throw new RangeError('InputPilotAuditExport.definitionHash 与固定试验合同不一致。');
  const workspaceRevision = assertIntegerAtLeast(
    source.workspaceRevision,
    0,
    'InputPilotAuditExport.workspaceRevision',
  );
  if (!Array.isArray(source.records) || source.records.length > MAXIMUM_AUDIT_RECORDS) {
    throw new RangeError(
      `InputPilotAuditExport.records 必须是不超过 ${MAXIMUM_AUDIT_RECORDS} 项的数组。`,
    );
  }
  const report = createInputPilotReport(definition, source.records);
  const records = Object.freeze(source.records.map((record) => cloneFrozenData(
    record,
    'InputPilotAuditExport record',
  )));
  for (let index = 1; index < records.length; index += 1) {
    if (
      records[index - 1].assignment.enrollmentIndex
      >= records[index].assignment.enrollmentIndex
    ) throw new RangeError('InputPilotAuditExport.records 必须按 enrollmentIndex 严格递增。');
  }
  if (source.recordCount !== records.length) {
    throw new RangeError('InputPilotAuditExport.recordCount 与 records 不一致。');
  }
  if (workspaceRevision < records.length) {
    throw new RangeError('InputPilotAuditExport.workspaceRevision 不能小于 recordCount。');
  }
  const sourceDataHash = createDeterministicDataHash(records, 'InputPilot audit records');
  if (source.sourceDataHash !== sourceDataHash) {
    throw new RangeError('InputPilotAuditExport.sourceDataHash 无法由 records 重建。');
  }
  if (!sameDeterministicData(source.report, report, 'InputPilot audit report')) {
    throw new RangeError('InputPilotAuditExport.report 无法由 records 重建。');
  }
  return cloneFrozenData({
    schemaVersion: INPUT_PILOT_EXPORT_SCHEMA_VERSION,
    privacyClass: INPUT_PILOT_EXPORT_PRIVACY_CLASS.PSEUDONYMOUS_RESEARCH_DATA,
    definition: definition.toJSON(),
    definitionHash: definition.getContentHash(),
    workspaceRevision,
    recordCount: records.length,
    sourceDataHash,
    records,
    report,
  }, 'validated InputPilotAuditExport');
}

export function createInputPilotAuditExport(definitionValue, workspaceValue) {
  const definition = createInputPilotDefinition(definitionValue);
  const workspace = createInputPilotWorkspace(definition, workspaceValue);
  if (workspace.activeTrial !== null) {
    throw new Error('存在 active pilot trial 时不能导出终态审计包。');
  }
  const records = workspace.records;
  return validateInputPilotAuditExport(definition, {
    schemaVersion: INPUT_PILOT_EXPORT_SCHEMA_VERSION,
    privacyClass: INPUT_PILOT_EXPORT_PRIVACY_CLASS.PSEUDONYMOUS_RESEARCH_DATA,
    definition: definition.toJSON(),
    definitionHash: definition.getContentHash(),
    workspaceRevision: workspace.revision,
    recordCount: records.length,
    sourceDataHash: createDeterministicDataHash(records, 'InputPilot audit records'),
    records,
    report: createInputPilotReport(definition, records),
  });
}

export function createInputPilotAggregateExport(definitionValue, workspaceValue) {
  const definition = createInputPilotDefinition(definitionValue);
  const workspace = createInputPilotWorkspace(definition, workspaceValue);
  return cloneFrozenData({
    schemaVersion: INPUT_PILOT_EXPORT_SCHEMA_VERSION,
    privacyClass: INPUT_PILOT_EXPORT_PRIVACY_CLASS.IDENTITY_FREE_AGGREGATE,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    workspaceRevision: workspace.revision,
    report: createInputPilotReport(definition, workspace.records),
  }, 'InputPilotAggregateExport');
}
