import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import { cloneFrozenData } from '../../rules/definition-utils.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import { createInputPilotReport } from './input-pilot-report.js';
import { createInputPilotWorkspace } from './input-pilot-workspace.js';

export const INPUT_PILOT_EXPORT_SCHEMA_VERSION = 1;

export const INPUT_PILOT_EXPORT_PRIVACY_CLASS = Object.freeze({
  PSEUDONYMOUS_RESEARCH_DATA: 'pseudonymous-research-data',
  IDENTITY_FREE_AGGREGATE: 'identity-free-aggregate',
});

export function createInputPilotAuditExport(definitionValue, workspaceValue) {
  const definition = createInputPilotDefinition(definitionValue);
  const workspace = createInputPilotWorkspace(definition, workspaceValue);
  if (workspace.activeTrial !== null) {
    throw new Error('存在 active pilot trial 时不能导出终态审计包。');
  }
  const records = workspace.records;
  return cloneFrozenData({
    schemaVersion: INPUT_PILOT_EXPORT_SCHEMA_VERSION,
    privacyClass: INPUT_PILOT_EXPORT_PRIVACY_CLASS.PSEUDONYMOUS_RESEARCH_DATA,
    definition: definition.toJSON(),
    definitionHash: definition.getContentHash(),
    workspaceRevision: workspace.revision,
    recordCount: records.length,
    sourceDataHash: createDeterministicDataHash(records, 'InputPilot audit records'),
    records,
    report: createInputPilotReport(definition, records),
  }, 'InputPilotAuditExport');
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
