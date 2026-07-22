import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { assertEvidenceGitCommit } from '@number-strategy-jump/arena-evidence-contracts';
import { createInputPilotDefinition } from '@number-strategy-jump/arena-input-pilot';
import { validateInputPilotAuditExport } from './input-pilot-export.js';

export const INPUT_PILOT_EVIDENCE_BUNDLE_SCHEMA_VERSION = 1;

const BUNDLE_KEYS = new Set([
  'schemaVersion',
  'commit',
  'buildId',
  'buildManifestHash',
  'audit',
]);
const CONTENT_HASH_PATTERN = /^[0-9a-f]{8}$/;
const BUILD_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export function createInputPilotEvidenceBundle(definitionValue, value) {
  const definition = createInputPilotDefinition(definitionValue);
  const source = cloneFrozenData(value, 'InputPilotEvidenceBundle');
  assertKnownKeys(source, BUNDLE_KEYS, 'InputPilotEvidenceBundle');
  if (source.schemaVersion !== INPUT_PILOT_EVIDENCE_BUNDLE_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 InputPilotEvidenceBundle schema ${String(source.schemaVersion)}。`,
    );
  }
  const commit = assertEvidenceGitCommit(source.commit, 'InputPilotEvidenceBundle.commit');
  const buildId = assertNonEmptyString(source.buildId, 'InputPilotEvidenceBundle.buildId');
  if (!BUILD_ID_PATTERN.test(buildId)) {
    throw new RangeError('InputPilotEvidenceBundle.buildId 包含不受支持的字符。');
  }
  if (
    typeof source.buildManifestHash !== 'string'
    || !CONTENT_HASH_PATTERN.test(source.buildManifestHash)
  ) throw new TypeError('InputPilotEvidenceBundle.buildManifestHash 必须是 8 位内容 hash。');
  return cloneFrozenData({
    schemaVersion: INPUT_PILOT_EVIDENCE_BUNDLE_SCHEMA_VERSION,
    commit,
    buildId,
    buildManifestHash: source.buildManifestHash,
    audit: validateInputPilotAuditExport(definition, source.audit),
  }, 'validated InputPilotEvidenceBundle');
}
