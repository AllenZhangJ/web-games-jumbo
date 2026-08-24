import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APPROVAL_PATH =
  'packages/arena-product-presentation/src/arena-v2-formal-asset-production-approval-candidate-v1.ts';
const AUDIO_PATH = 'src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts';
const VFX_PATH = 'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts';
const HOST_PATH = 'src/entry/arena-v2-formal-web-match-host-candidate-v1.ts';

test('P5.3zzzuk keeps one production approval truth for all formal media', () => {
  const source = readFileSync(APPROVAL_PATH, 'utf8');
  assert.match(source, /productionApproved && assetUsePermitted && formalReady/u);
  assert.match(source, /entry\.artifactPath !== asset\.artifactPath/u);
  assert.match(source, /entry\.byteLength !== asset\.byteLength/u);
  assert.match(source, /entry\.sha256 !== asset\.sha256/u);
  assert.match(source, /modelLoadingRequiresApprovedExternalTextureDependencyClosure: true/u);
  assert.match(source, /currentProductionApprovedAssetCount: 0/u);
  assert.doesNotMatch(source, /hardGate: true/u);
});

test('P5.3zzzuk closes OGG and PNG loading before the first network loader call', () => {
  const audio = readFileSync(AUDIO_PATH, 'utf8');
  const vfx = readFileSync(VFX_PATH, 'utf8');
  const audioPreflight = audio.indexOf('this.#assertAudioAssetsPermitted()');
  const audioFetch = audio.indexOf('this.#window.fetch(');
  const vfxPreflight = vfx.indexOf(
    'records.length !== ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length',
  );
  const vfxLoad = vfx.indexOf('this.#textureLoader.load(');
  assert.equal(audioPreflight !== -1 && audioPreflight < audioFetch, true);
  assert.equal(vfxPreflight !== -1 && vfxPreflight < vfxLoad, true);
  assert.match(audio, /默认路径不会发起任何OGG加载/u);
  assert.match(vfx, /默认路径不会发起任何PNG加载/u);
  assert.match(audio, /productionApprovalUsesSharedLedgerIndex: true/u);
  assert.match(vfx, /productionApprovalUsesSharedLedgerIndex: true/u);
});

test('P5.3zzzuk keeps candidate loading explicit and isolated', () => {
  const host = readFileSync(HOST_PATH, 'utf8');
  assert.match(host, /allowUnapprovedCandidateCues: true/u);
  assert.match(host, /allowUnapprovedCandidates: true/u);
  assert.match(host, /allowUnapprovedCandidateTextures: true/u);
  assert.match(host, /audioExplicitlyOptsIntoUnapprovedCandidateLoading: true/u);
  assert.match(host, /preloaderExplicitlyOptsIntoUnapprovedCandidateLoading: true/u);
  assert.match(host, /vfxExplicitlyOptsIntoUnapprovedCandidateLoading: true/u);
  assert.match(host, /stageExplicitlyOptsIntoUnapprovedCandidateRendering: true/u);
  assert.match(host, /status: 'production-unreachable'/u);
  assert.match(host, /defaultEntryWired: false/u);
});
