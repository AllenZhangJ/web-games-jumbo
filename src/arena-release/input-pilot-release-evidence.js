import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  INPUT_PILOT_ASSESSMENT_STATUS,
  createArenaInputPilotV1Definition,
} from '@number-strategy-jump/arena-input-pilot';
import {
  createInputPilotEvidenceBundle,
} from '../arena/presentation/pilot/input-pilot-evidence-bundle.js';
import {
  createArenaBuildManifest,
} from '@number-strategy-jump/arena-device-acceptance';
import { ARENA_RELEASE_EVIDENCE_STATUS } from './release-evidence-statement.js';

const RESULT_HASH_PATTERN = /^(?:[0-9a-f]{8}|[0-9a-f]{64})$/;

function pilotStatus(assessmentStatus) {
  if (assessmentStatus === INPUT_PILOT_ASSESSMENT_STATUS.CANDIDATE_WINNER) {
    return ARENA_RELEASE_EVIDENCE_STATUS.READY;
  }
  if (assessmentStatus === INPUT_PILOT_ASSESSMENT_STATUS.INSUFFICIENT_DATA) {
    return ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE;
  }
  return ARENA_RELEASE_EVIDENCE_STATUS.FAILED;
}

function combineStatus(pilot, device) {
  if (
    pilot === ARENA_RELEASE_EVIDENCE_STATUS.FAILED
    || device === ARENA_RELEASE_EVIDENCE_STATUS.FAILED
  ) return ARENA_RELEASE_EVIDENCE_STATUS.FAILED;
  if (
    pilot === ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE
    || device === ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE
  ) return ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE;
  return ARENA_RELEASE_EVIDENCE_STATUS.READY;
}

export function createArenaInputPilotReleaseResult({
  evidenceBundle: evidenceBundleValue,
  buildManifest: buildManifestValue,
  stage6DeviceResult,
}) {
  const producerId = 'arena:input-pilot:evidence';
  const definition = createArenaInputPilotV1Definition();
  const evidenceBundle = createInputPilotEvidenceBundle(definition, evidenceBundleValue);
  const buildManifest = createArenaBuildManifest(buildManifestValue);
  if (
    buildManifest.target !== 'web'
    || buildManifest.defaultEntry !== 'product'
    || buildManifest.getArtifact('pilot.html') === null
  ) throw new Error('Input Pilot 必须绑定包含 pilot.html 的 Product Web 构建。');
  if (buildManifest.sourceDirty) {
    throw new Error('Input Pilot 正式证据不能绑定 dirty Web 构建。');
  }
  if (
    evidenceBundle.commit !== buildManifest.commit
    || evidenceBundle.buildId !== buildManifest.buildId
    || evidenceBundle.buildManifestHash !== buildManifest.getContentHash()
  ) throw new Error('Input Pilot Evidence Bundle 与 Web Build Manifest 不一致。');
  if (
    !stage6DeviceResult
    || stage6DeviceResult.commit !== evidenceBundle.commit
    || stage6DeviceResult.buildId !== evidenceBundle.buildId
    || !Object.values(ARENA_RELEASE_EVIDENCE_STATUS).includes(stage6DeviceResult.status)
    || typeof stage6DeviceResult.resultHash !== 'string'
    || !RESULT_HASH_PATTERN.test(stage6DeviceResult.resultHash)
  ) throw new Error('Input Pilot 缺少同候选 Stage 6 Device producer 结果。');
  const assessment = evidenceBundle.audit.report.assessment;
  const status = combineStatus(pilotStatus(assessment.status), stage6DeviceResult.status);
  const summary = cloneFrozenData({
    producerId,
    commit: evidenceBundle.commit,
    buildId: evidenceBundle.buildId,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    buildManifestHash: buildManifest.getContentHash(),
    auditSourceDataHash: evidenceBundle.audit.sourceDataHash,
    reportSourceDataHash: evidenceBundle.audit.report.sourceDataHash,
    assessment,
    stage6DeviceStatus: stage6DeviceResult.status,
    stage6DeviceResultHash: stage6DeviceResult.resultHash,
  }, 'Input Pilot release summary');
  return cloneFrozenData({
    commit: evidenceBundle.commit,
    buildId: evidenceBundle.buildId,
    status,
    resultHash: createDeterministicDataHash(summary, `Release producer ${producerId}`),
  }, 'Input Pilot release result');
}
