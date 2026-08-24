import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PRELOADER_PATH =
  'packages/arena-product-presentation-three/src/arena-v2-formal-three-asset-preloader-candidate-v1.ts';
const HOST_PATH = 'src/entry/arena-v2-formal-web-match-host-candidate-v1.ts';

test('P5.3zzzuj checks production approval before any formal GLB task is created', () => {
  const source = readFileSync(PRELOADER_PATH, 'utf8');
  const preflight = source.indexOf('this.#assertDefinitionsPermitted(definitions)');
  const taskCreation = source.indexOf('new PresentationAssetLoadTask({');
  assert.equal(preflight !== -1 && taskCreation !== -1 && preflight < taskCreation, true);
  assert.match(source, /ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1/u);
  assert.match(source, /productionApprovalUsesSharedLedgerIndex: true/u);
  assert.match(source, /this\.#state = 'failed';[\s\S]*Promise\.reject\(error\)/u);
  assert.match(source, /默认路径不会发起任何GLB加载/u);
  assert.match(source, /productionApprovalCheckedBeforeLoaderInvocation: true/u);
  assert.match(source, /defaultUnapprovedCandidateLoadingAllowed: false/u);
  assert.match(source, /currentProductionApprovedVisualAssetCount: 0/u);
});

test('P5.3zzzuj keeps unapproved loading exclusive to the isolated development host', () => {
  const preloader = readFileSync(PRELOADER_PATH, 'utf8');
  const host = readFileSync(HOST_PATH, 'utf8');
  assert.match(preloader, /source\.allowUnapprovedCandidates === true/u);
  assert.match(preloader, /isolatedCandidateLoadingRequiresExplicitOptIn: true/u);
  assert.match(host, /readAssetBytes: async \(sourceKey: string, signal: AbortSignal\)/u);
  assert.match(host, /createImage: \(\) => rendererCanvas\.ownerDocument\.createElement\('img'\)/u);
  assert.match(host, /formalModelFetchesUseAbortableOwnedAssetReadPort: true/u);
  assert.match(host, /formalModelSourcePathRestrictedToProjectAssets: true/u);
  assert.match(host, /\{ loader: source\.assetLoader, allowUnapprovedCandidates: true \}/u);
  assert.match(host, /preloaderExplicitlyOptsIntoUnapprovedCandidateLoading: true/u);
  assert.match(host, /status: 'production-unreachable'/u);
  assert.match(host, /hardGate: false/u);
  assert.match(host, /defaultEntryWired: false/u);
});

test('P5.3zzzuj exposes approval truth without promoting candidate assets', () => {
  const source = readFileSync(PRELOADER_PATH, 'utf8');
  assert.match(source, /approvalMode: 'production-approved-only' \| 'isolated-unapproved-candidates'/u);
  assert.match(source, /productionApprovedAssetIds: readonly string\[\]/u);
  assert.match(source, /blockedAssetIds: readonly string\[\]/u);
  assert.match(source, /validationStatus: 'not-run'/u);
  assert.doesNotMatch(source, /hardGate: true/u);
  assert.doesNotMatch(source, /defaultEntryWired: true/u);
});
