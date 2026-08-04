import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

type JsonRecord = Record<string, unknown>;
type SourceExpectation = Readonly<{
  path: string;
  role: string;
  byteLength: number;
  sha256: string;
}>;
type FixtureExpectation = Readonly<{
  id: string;
  testName: string;
  nodeEvidence: string;
  artReview: string;
}>;

const ROOT = resolve(
  process.env.ARENA_A10_V2_CHECK_ROOT ?? resolve(import.meta.dirname, '../..'),
);
const CONTRACT_PATH =
  'docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v2.json';
const V1_PATH =
  'docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v1.json';
const PP0_PATH =
  'packages/arena-presentation-contracts/src/arena-supply-presentation-contract.ts';
const PP1_PATH =
  'packages/arena-presentation-runtime/src/arena-supply-presentation-adapter.ts';
const JOINT_TEST_PATH =
  'tests/arena/presentation/arena-supply-presentation-adapter.test.ts';

const AUTHORIZED_V2_PATHS = [
  CONTRACT_PATH,
  'scripts/art/check-arena-supply-presentation-contract-v2.ts',
  'scripts/art/test-arena-supply-presentation-contract-v2-fail-closed.ts',
] as const;

const MARKER_KEYS = [
  'schemaVersion', 'supplyDefinitionId', 'supplyId', 'equipmentInstanceId',
  'equipmentDefinitionId', 'position', 'spawnTick', 'expireTick', 'remainingTicks',
  'labelSeconds',
] as const;
const CUE_KEYS = [
  'schemaVersion', 'id', 'kind', 'sourceEventIds', 'tick', 'sequenceStart',
  'sequenceEnd', 'supplyId', 'equipmentInstanceId', 'participantId',
  'previousEquipmentInstanceId', 'nextEquipmentInstanceId',
] as const;
const VIEW_KEYS = [
  'schemaVersion', 'streamId', 'status', 'snapshotTick', 'snapshotEventSequence',
  'nextExpectedEventSequence', 'resyncedFromSnapshot', 'markers', 'cues',
] as const;
const OPTIONS_KEYS = [
  'schemaVersion', 'streamId', 'ticksPerSecond', 'lifecycleContract',
  'recentEventCapacity',
] as const;
const START_KEYS = [
  'schemaVersion', 'snapshotTick', 'snapshotEventSequence', 'equipment',
  'activeSupplyProjection',
] as const;
const UPDATE_KEYS = [...START_KEYS, 'events'] as const;
const DEBUG_KEYS = [
  'schemaVersion', 'streamId', 'lifecycleState', 'snapshotTick',
  'nextExpectedEventSequence', 'markerCount', 'pendingReplacementPairCount',
  'recentEventHashCount', 'acceptedEventCount', 'duplicateEventCount', 'resyncCount',
  'terminalFailureKind',
] as const;
const COMMON_ENVELOPE = ['id', 'sequence', 'tick', 'type'] as const;
const STRICT_IDENTITY = [
  'schemaVersion', 'supplyDefinitionId', 'supplyId', 'equipmentInstanceId',
  'spawnTick', 'expireTick', 'tick',
] as const;

const EXPECTED_CONTRACT_SURFACE = {
  schemaVersion: 1,
  markerKeys: MARKER_KEYS,
  cueKeys: CUE_KEYS,
  viewKeys: VIEW_KEYS,
  optionsKeys: OPTIONS_KEYS,
  startInputKeys: START_KEYS,
  updateInputKeys: UPDATE_KEYS,
  debugKeys: DEBUG_KEYS,
  adapterMethods: ['constructor', 'destroy', 'getDebugSnapshot', 'start', 'update'],
  cueKinds: ['spawned', 'picked-up', 'replaced', 'expired'],
  viewStatuses: ['ready', 'resync-required'],
  lifecycleStates: ['created', 'active', 'resync-required', 'failed', 'destroyed'],
  terminalFailureKinds: [
    'input-invalid', 'event-identity-conflict', 'reentrant-call', 'internal-invariant',
  ],
  updateOutcomes: ['committed', 'snapshot-resync', 'terminal-failed'],
  invariants: {
    ticksPerSecond: 60,
    maximumMarkers: 3,
    recentEventCapacity: 64,
    maximumSemanticEventsPerUpdate: 64,
    maximumStructuralResyncEventsPerUpdate: 256,
    maximumPendingReplacementPairs: 3,
    maximumCuesPerView: 64,
    startOnce: true,
    destroyIdempotent: true,
    sequenceWindow: '[previousNextExpectedEventSequence,postSnapshotEventSequence)',
  },
} as const;

const EXPECTED_EVENT_ROUTING = {
  commonEnvelopeKeys: COMMON_ENVELOPE,
  shapes: [
    {
      id: 'supply-spawned-strict',
      type: 'EquipmentSpawned',
      outerKeys: [...COMMON_ENVELOPE, 'payload'],
      payloadKeys: [...STRICT_IDENTITY, 'equipmentDefinitionId', 'spawnId', 'position'],
      disposition: 'consume-strict-supply',
      cueKind: 'spawned',
      terminalRule: 'create-or-refresh-one-validated-active-marker',
    },
    {
      id: 'ordinary-spawned-flat-bypass',
      type: 'EquipmentSpawned',
      outerKeys: [
        ...COMMON_ENVELOPE, 'equipmentInstanceId', 'equipmentDefinitionId', 'spawnId',
        'position',
      ],
      payloadKeys: [],
      disposition: 'bypass-known-ordinary-equipment-event',
      cueKind: null,
      terminalRule: 'never-create-or-remove-a-supply-marker',
    },
    {
      id: 'ordinary-picked-up-flat-conditional',
      type: 'EquipmentPickedUp',
      outerKeys: [
        ...COMMON_ENVELOPE, 'participantId', 'equipmentInstanceId',
        'equipmentDefinitionId',
      ],
      payloadKeys: [],
      disposition:
        'consume-only-unique-active-identity-and-definition-match-otherwise-safe-bypass-or-resync',
      cueKind: 'picked-up-or-none',
      terminalRule:
        'unique-active-match-removes-one-marker-unmatched-removes-none-conflict-resyncs',
    },
    {
      id: 'supply-recycled-strict',
      type: 'EquipmentRecycled',
      outerKeys: [...COMMON_ENVELOPE, 'payload'],
      payloadKeys: [
        ...STRICT_IDENTITY, 'participantId', 'recycledEquipmentInstanceId',
        'replacementEquipmentInstanceId', 'reason',
      ],
      disposition: 'start-contiguous-replacement-pair',
      cueKind: null,
      terminalRule:
        'hold-bounded-pending-pair-only-until-immediately-following-matched-replaced',
    },
    {
      id: 'supply-replaced-strict',
      type: 'EquipmentReplaced',
      outerKeys: [...COMMON_ENVELOPE, 'payload'],
      payloadKeys: [
        ...STRICT_IDENTITY, 'participantId', 'previousEquipmentInstanceId',
        'nextEquipmentInstanceId',
      ],
      disposition: 'close-contiguous-replacement-pair',
      cueKind: 'replaced',
      terminalRule: 'remove-marker-on-paired-replaced-without-waiting-for-picked-up',
    },
    {
      id: 'supply-expired-strict',
      type: 'EquipmentExpired',
      outerKeys: [...COMMON_ENVELOPE, 'payload'],
      payloadKeys: [...STRICT_IDENTITY, 'expiredEquipmentInstanceId', 'reason'],
      disposition: 'consume-strict-terminal',
      cueKind: 'expired',
      terminalRule: 'remove-one-matched-marker-at-authority-expire-tick',
    },
  ],
  knownOrdinaryEventRule:
    'registered non-equipment authority events participate in sequence continuity and canonical identity but never create supply markers or cues',
  unknownEventRule:
    'unregistered type or malformed, mixed, missing, extra, future or ambiguous equipment shape fails closed before publication',
  canonicalHashRule:
    'copy the complete event to frozen plain data and hash the entire normalized value before semantic processing; same id and sequence with identical hash is idempotent, any conflicting binding is terminal',
  terminalPositionRule:
    'terminal cues contain no position; PP3a may resolve supplyId plus equipmentInstanceId only against the previous committed View, otherwise it must use a generic non-spatial accessible fallback or safe hide',
} as const;

const EXPECTED_SEQUENCE_AND_RECOVERY = {
  continuousUpdate:
    'new non-duplicate events must cover the complete half-open sequence window in monotonic order before one atomic commit',
  batch65To256:
    'structurally valid batches of 65 through 256 events snapshot-resync before canonical event hashing or event semantics and emit no cues',
  batchAbove256: 'more than 256 events is input-invalid and terminal-failed',
  gapStaleOrUnpaired:
    'gap, stale ordering, event outside the recent ring, or an incomplete/reversed replacement pair snapshot-resyncs without replaying a one-shot',
  resyncReady:
    'a complete ready post projection rebuilds sorted markers with no cues and resyncedFromSnapshot true',
  resyncNotReady:
    'not-ready projection publishes resync-required with empty markers and cues; countdown stays hidden',
  pauseResume:
    'only integer authority snapshotTick changes remainingTicks; wall clock and presentation cadence never advance or delete supply',
  replay:
    'seek or reset creates a new stream adapter and clears recent hashes, pending replacement state and prior one-shot history',
  destroy:
    'destroy is idempotent, clears adapter-owned bounded data and owns no GPU, DOM, timer, listener, particle or audio resources',
} as const;

const EXPECTED_FIXTURES: readonly FixtureExpectation[] = ([
  ['spawn-three-physical-entities-without-modal', 'PP1 A1 #1 strict spawn creates exactly three sorted markers and one-shot cues', 'three-entity-marker-and-spawn-cue-contract'],
  ['ordinary-flat-equipment-spawn-bypasses-supply-adapter', 'PP1 A1 #2 ordinary flat spawn bypasses supply markers and cues', 'authority-bypass-boundary'],
  ['mixed-flat-and-payload-spawn-fails-closed', 'PP1 A1 #3 mixed flat and payload spawn fails terminal before publication', 'authority-bypass-boundary'],
  ['active-supply-flat-pickup-terminates-exactly-one-marker', 'PP1 A1 #4 active pickup removes exactly one marker and emits picked-up once', 'pickup-cue-and-marker-terminal-contract'],
  ['flat-pickup-not-matching-active-bypasses-without-cue-or-marker-change', 'PP1 A1 #5 unmatched ordinary pickup bypasses without marker or cue mutation', 'no-false-cue-contract'],
  ['definition-conflict-or-multiple-active-pickup-fails-closed', 'PP1 A1 #6 pickup identity ambiguity snapshot-resyncs for ready and not-ready posts', 'resync-hide-contract'],
  ['missing-history-or-bound-active-projection-enters-resync-before-any-event', 'PP1 A1 #7 missing history and initial not-ready snapshots enter explicit resync', 'resync-hide-contract'],
  ['replacement-pair-terminates-without-waiting-for-picked-up', 'PP1 A1 #8 replacement pair terminates immediately without waiting for pickup', 'replacement-cue-terminal-contract'],
  ['strict-replacement-without-active-match-fails-closed', 'PP1 A1 #9 strict replacement without an active match snapshot-resyncs', 'no-false-cue-contract'],
  ['strict-expiry-without-active-match-fails-closed', 'PP1 A1 #10 strict expiry without an active match snapshot-resyncs', 'no-false-cue-contract'],
  ['remaining-tick-599-600-601', 'PP1 A1 #11 remaining tick 600/599/+601 boundaries never expire early', 'ten-second-countdown-and-terminal-boundary'],
  ['same-tick-expire-before-pickup', 'PP1 A1 #12 same-tick expiry before pickup emits only expired', 'expiry-cue-order'],
  ['same-tick-recycle-before-replace-and-pickup-before-action', 'PP1 A1 #13 recycle-replace-pickup authority order emits one replacement cue', 'replacement-single-cue-order'],
  ['duplicate-identical-event-idempotent', 'PP1 A1 #14 identical duplicate is idempotent and never replays a cue', 'one-shot-no-replay-contract'],
  ['duplicate-conflicting-event-fail-closed', 'PP1 A1 #15 duplicate id or sequence with another hash fails terminal atomically', 'no-conflicting-cue-publication'],
  ['event-older-than-recent-ring-never-applies-or-replays-one-shot', 'PP1 A1 #16 an event evicted from the 64-entry ring resyncs without replay', 'one-shot-no-replay-contract'],
  ['sequence-gap-and-out-of-order-resync', 'PP1 A1 #17 sequence gaps and stale ordering snapshot-resync without sorting', 'resync-hide-contract'],
  ['missing-required-and-future-field-rejected', 'PP1 A1 #18 missing and future input schemas fail terminal', 'exact-key-fail-closed-boundary'],
  ['pause-resume-no-wall-clock-progress', 'PP1 A1 #19 pause/resume uses only integer snapshots and emits no stale cues', 'tick-only-countdown-contract'],
  ['30fps-terminal-state-exact', 'PP1 A1 #20 adapter terminal state is tick-exact and independent of presentation cadence', 'cadence-independent-terminal-contract'],
  ['replay-forward-and-catch-up-no-double-one-shot', 'PP1 A1 #21 catch-up rebuilds from snapshot and never double-emits one-shot cues', 'one-shot-no-replay-contract'],
  ['replay-seek-or-reset-starts-new-epoch-and-clears-ring-and-pending', 'PP1 A1 #22 replay seek uses a new stream instance with cleared ring and pending state', 'stream-epoch-contract'],
  ['asset-failure-accessible-fallback-does-not-pass-asset-gate', 'PP1 A1 #23 asset fallback stays outside adapter authority and gate claims', 'fallback-is-not-production-asset-evidence'],
  ['reduced-motion-and-silent-equivalence', 'PP1 A1 #24 reduced-motion and silent hosts consume identical adapter authority data', 'silent-and-reduced-motion-equivalence-contract'],
  ['destroy-twice-no-live-resources', 'PP1 A1 #25 destroy is idempotent and clears adapter-owned state only', 'adapter-lifecycle-boundary'],
] as const).map(([id, testName, artReview]) => ({
  id,
  testName,
  nodeEvidence: 'frozen-candidate-passed',
  artReview,
}));

const EXPECTED_ART_COUNTEREVIDENCE = {
  cueContracts: [
    {
      kind: 'spawned',
      shape: 'three-prong-ground-marker-plus-equipment-silhouette',
      timing: 'one-shot-on-committed-strict-spawn',
      reducedMotion: 'stable-marker-appearance-without-expansion-or-travel',
      silentEquivalent: 'shape-icon-and-single-state-announcement',
      assetFailureFallback: 'diagnostic-three-prong-plus-text-or-screen-reader-only',
    },
    {
      kind: 'picked-up',
      shape: 'inward-bracket-closes-on-held-slot',
      timing: 'one-shot-on-unique-authoritative-active-pickup',
      reducedMotion: 'instant-bracket-state-swap',
      silentEquivalent: 'pickup-icon-state-and-single-announcement',
      assetFailureFallback: 'generic-non-spatial-pickup-confirmation',
    },
    {
      kind: 'replaced',
      shape: 'paired-exchange-arrows-old-cross-new-solid',
      timing: 'one-shot-on-contiguous-recycled-plus-replaced-pair',
      reducedMotion: 'instant-old-cross-new-solid-swap',
      silentEquivalent: 'exchange-icon-and-single-replacement-announcement',
      assetFailureFallback: 'generic-non-spatial-replacement-confirmation',
    },
    {
      kind: 'expired',
      shape: 'segmented-perimeter-to-crossed-hourglass-endpoint',
      timing: 'one-shot-on-authoritative-expire-tick',
      reducedMotion: 'instant-crossed-hourglass-endpoint-without-collapse',
      silentEquivalent: 'expired-icon-and-single-announcement',
      assetFailureFallback: 'generic-non-spatial-expiry-announcement-or-safe-hide',
    },
  ],
  terminalCuePosition: {
    cueContainsPosition: false,
    lookupIdentity: ['supplyId', 'equipmentInstanceId'],
    onlySpatialSource: 'previous-committed-view',
    fallback: 'generic-non-spatial-accessible-cue-or-safe-hide',
    forbiddenSources: [
      'current-post-marker', 'parsed-instance-id', 'participant-distance', 'authority-reread',
    ],
    pp3aRuntimeEvidencePassed: false,
  },
  markerCountdown: {
    formula: 'remainingTicks=expireTick-snapshotTick',
    labelFormula: 'ceil(remainingTicks/60)',
    offset599: 'one-tick-world-marker-remains-visible-and-pickup-eligible',
    offset600:
      'marker-hidden-and-pickup-ineligible-with-expiry-identity-carried-by-authority-contract',
    offset601: 'ready-with-no-marker-and-no-duplicate-expiry-cue',
    wallClockForbidden: true,
  },
  resyncPresentation: {
    markerPolicy: 'hide-all-supply-markers-and-countdowns',
    cuePolicy: 'emit-no-cues-until-ready-projection-rebuild',
    assetPolicy: 'do-not-retain-stale-or-fallback-marker-as-authority',
  },
  assetFailureBoundary: {
    fallbackIsAccessibilityOnly: true,
    fallbackMayUseDiagnosticGeometry: true,
    fallbackMayClaimRepresentativeAssetGate: false,
    representativeAssetGatePassed: false,
    formalVfxGatePassed: false,
    formalAudioGatePassed: false,
  },
  authoritySeparation: {
    colorIsNeverSoleEncoding: true,
    reducedMotionFieldInView: false,
    silentFieldInView: false,
    assetGateFieldInView: false,
    rendererFallbackFieldInView: false,
    newGameplayInputAllowed: false,
    wallClockDeletionAllowed: false,
  },
} as const;

const EXPECTED_EXTERNAL_EVIDENCE_BOUNDARY = {
  nodeCanProve: [
    'exact-key-data-contracts',
    'event-routing-and-canonical-deduplication',
    '599-600-601-tick-semantics',
    'resync-replay-and-destroy-state',
    'silent-and-reduced-motion-authority-data-equivalence',
    'fallback-does-not-open-asset-gates',
  ],
  pp3aMustProve: [
    'single-runtime-owner-wiring',
    'pre-step-to-atomic-post-frame-consumption',
    'previous-committed-view-terminal-cue-origin-or-non-spatial-fallback',
    'host-commit-failure-terminal-cleanup',
    'retry-and-destroy-resource-ownership',
  ],
  pp3bDeviceMustProve: [
    'shared-runtime-across-web-wechat-douyin',
    'isolated-output-and-no-product-reachability',
    'desktop-and-390x844-readable-capture',
    'approved-browser-gpu-overdraw-memory-and-voice-measurement',
    'real-ios-and-android-behavior',
  ],
  a1MustProve: [
    'approved-equipment-silhouette-and-icon-provenance',
    'approved-vfx-and-audio-source-license-and-sha256',
    'representative-specimen-visual-and-audio-quality',
    'measured-budget-and-lifecycle-release',
  ],
  humanMustProve: [
    'a0.3-ten-qualified-participant-blind-test-at-or-above-threshold',
  ],
  allExternalEvidencePassed: false,
} as const;

const EXPECTED_HARD_GATES = {
  sourceAuditVerified: true,
  fixtureMappingVerified: true,
  artContractSelfCheckPassed: true,
  a1_0V2CoordinatorSignOff: false,
  a1_0V2JointGatePassed: false,
  pp1Completed: false,
  pp2Authorized: false,
  pp3aAuthorized: false,
  pp3bAuthorized: false,
  a0_3Passed: false,
  a1_1Passed: false,
  representativeSpecimenStarted: false,
  a1Passed: false,
  blockoutAllowed: false,
  productionVfxIntegrated: false,
  productionAudioIntegrated: false,
  browserVerified: false,
  deviceVerified: false,
  humanVerified: false,
  formalPerformancePassed: false,
  finalPassed: false,
} as const;

const EXPECTED_SCORE = {
  basis:
    'A1.0-v2 current-source contract, PP0/PP1 candidate identity, 25-fixture mapping and art counterevidence only; no PP3, asset, device, human or final maturity',
  total: 94,
  maximum: 100,
  hardGatePassed: false,
  dimensions: [
    { id: 'robustness-closure', score: 16, maximum: 17 },
    { id: 'race-determinism', score: 16, maximum: 17 },
    { id: 'fallback-fail-closed', score: 16, maximum: 17 },
    { id: 'boundary-malicious-input', score: 16, maximum: 17 },
    { id: 'lifecycle-cleanup', score: 15, maximum: 16 },
    { id: 'production-path-isolation', score: 15, maximum: 16 },
  ],
  governance: {
    authorizedFiles: AUTHORIZED_V2_PATHS,
    modifiedOutsideAuthorizedFiles: false,
    v1Preserved: true,
    pp0Pp1AndTestsPreserved: true,
    latestHashesRecomputed: true,
    commitOrPushPerformed: false,
    coordinatorReviewPending: true,
  },
} as const;

const EXPECTED_SOURCES: readonly SourceExpectation[] = [
  { path: 'packages/arena-contracts/src/match-event-types.ts', role: 'authority-event-types', byteLength: 840, sha256: 'ba3033f6d784c5e989288e3854f18ab8c082f494480d52669eb59f1bfe3d4d85' },
  { path: 'packages/arena-contracts/src/equipment-supply-event-payload.ts', role: 'strict-supply-payload', byteLength: 9788, sha256: '2dc466abb5bae193aab091b084a835fd45e2c430daa3b0b194356618a177aa9c' },
  { path: 'packages/arena-contracts/src/match-snapshot.ts', role: 'public-world-snapshot', byteLength: 19417, sha256: '89ca74403445cbe8333e68e0e907a914500dce51b3bcf3cbce8ebb928e51fe38' },
  { path: 'packages/arena-contracts/src/arena-public-supply-projection.ts', role: 'active-supply-projection', byteLength: 29094, sha256: 'b1ad32bc9e3d023af0cfbcbac41c31efee69d291de856e1914e5622dfa5ec7ec' },
  { path: 'packages/arena-contracts/src/match-read-frame-v2.ts', role: 'readonly-match-frame-v2', byteLength: 31017, sha256: '6f18c6cc18934e8b97147a63a87ff12c7b976bef4e5df29c7d1fa965844ed144' },
  { path: 'packages/arena-definitions/src/equipment-supply-definition.ts', role: 'supply-definition', byteLength: 5281, sha256: 'ef3d42d29141cb128a782be31f395c34b8320de1c646aa7265ed18fe774ab1f3' },
  { path: 'packages/arena-v1-content/src/arena-v2-survival-supply.ts', role: 'formal-survival-supply-content', byteLength: 1039, sha256: '0007b0b8e11feda8721162cf4c22a7a574a4f66e2f5fc7de8213082097b12cee' },
  { path: 'packages/arena-equipment/src/equipment-supply-lifecycle.ts', role: 'lifecycle-contract', byteLength: 3847, sha256: '79dac98ed7bf04699dcaad963f93dc44ccd0e78f235e0ca04d7aac120c23da5c' },
  { path: 'packages/arena-equipment/src/equipment-supply-timeline-system.ts', role: 'authority-timeline', byteLength: 26241, sha256: '57bf117fb918724e77bd3ec0bb2f3dc0727803747b335f6039d13aab29937d0e' },
  { path: 'packages/arena-equipment/src/equipment-system.ts', role: 'world-equipment-system', byteLength: 40775, sha256: 'fd04f4c51873ec7a91461e6b836aa3a2aa8f854794d1e2365266ca6afc7ef580' },
  { path: 'packages/arena-match/src/match-core.ts', role: 'match-authority', byteLength: 85977, sha256: '6d024b18ddba7bddbe6ccbcfb226581fe53a81b8f1a6789696f0cd4a1c5daf04' },
  { path: 'packages/arena-match/src/match-read-frame.ts', role: 'post-frame-projector', byteLength: 9174, sha256: 'd7b104964d7d39d7c4844b4ffde2196a94d4aad132a82935e544fdf592d7739c' },
  { path: 'packages/arena-match/src/replay.ts', role: 'replay', byteLength: 22555, sha256: '3921cc6cd0d713877f875c9922f0060541743a41630703372bb41c0c67fb6a87' },
  { path: 'packages/arena-session/src/local-match-session.ts', role: 'session', byteLength: 30619, sha256: '5ee25b71979ea9c2c429374d94f2534b079429b1189efd8ce46e46a0a3c6776f' },
  { path: 'packages/arena-v1-composition/src/arena-v2-survival-supply-match-core.ts', role: 'formal-composition-root', byteLength: 3933, sha256: '1e41a4734333df096dc5cfc3877b94641d4177daffc0d8abb8be304b16644caa' },
  { path: 'tests/arena/equipment-supply-timeline.test.ts', role: 'timeline-599-600-601-tests', byteLength: 22512, sha256: 'c9f86bfe1f71d6d09d11e7939f560364da0d969a4178f2b6cbc88e01710ca680' },
  { path: 'tests/arena/match-core-survival-supply.test.ts', role: 'matchcore-supply-tests', byteLength: 25313, sha256: '1e2b40c0fd2ae419f8891766b5dd38753bf2a5024823f01c8bf3c9e672a611b0' },
  { path: 'tests/arena/match-read-frame-v2-contract.test.ts', role: 'read-frame-projection-tests', byteLength: 24958, sha256: '1a9c7b6278d72ff79e91c0e5ad86a8eda68e9a744c261b34a9212bef870d550d' },
  { path: 'tests/arena/replay.test.ts', role: 'replay-tests', byteLength: 17156, sha256: 'ac5e42e1a546e6f611d30cad9d05d516969197d6ed3a9b468c6df4272bf8a4f4' },
  { path: 'tests/arena/local-match-session.test.ts', role: 'session-tests', byteLength: 20752, sha256: '7f41b8d56eaaf92cd5e179758be2f1e68d5d2eee09b3e599d31893cd9b53f8f2' },
  { path: 'tests/arena/pa4a-session-read-frame.test.ts', role: 'pa4a-read-frame-tests', byteLength: 31616, sha256: 'faa0141939e893304dada456b67b36f058118bd4fc6624a42e8b967ce7ea566d' },
  { path: 'docs/decisions/108-arena-v2-survival-auto-replace-and-expiry.md', role: 'adr-108-authority', byteLength: 4680, sha256: '9a400fb5ec45fa04c3ea3f3aa26217c3ba2281c7e15eedb789402c6b12a6aaa9' },
  { path: 'docs/decisions/110-arena-v2-expired-held-release-disposition.md', role: 'adr-110-expired-held', byteLength: 4534, sha256: '9d56a2a139499a42d8654143ca33c8b59bd93aa412c9b0d71d07abaa2476b47d' },
  { path: 'docs/decisions/113-arena-v2-supply-presentation-adapter-boundary.md', role: 'adr-113-adapter-boundary', byteLength: 21125, sha256: '0ccce7df97a8e505e2212cea5da155190edd13b7de26d808fbdc3c84a8943653' },
  { path: 'docs/decisions/114-arena-v2-art-evidence-versioning-and-joint-gate.md', role: 'adr-114-joint-gate', byteLength: 10908, sha256: '580efe43771b09552bf481066d3380719dec53aad88d77b5883e1b0bcb185cd5' },
  { path: PP0_PATH, role: 'pp0-presentation-contract', byteLength: 61277, sha256: '42ce6bcda78981effe41141ae5f0aa70642b8ff3c5dba72280e3788eaeaaae46' },
  { path: PP1_PATH, role: 'pp1-presentation-adapter', byteLength: 38153, sha256: '9e8b6102b9a7c4d18f31b4c8132f573425024fa37da62ead0d4a53e1396d6014' },
  { path: JOINT_TEST_PATH, role: 'pp0-pp1-joint-tests', byteLength: 61240, sha256: 'cefaa8e80b226f0a5ba726b970a01ed4d681a436d63b5c1fe0c0449b142d7270' },
] as const;

const EXPECTED_ROLLBACK = {
  action: 'delete-only-the-three-uncommitted-v2-files',
  allowedPaths: AUTHORIZED_V2_PATHS,
  preservePaths: [V1_PATH, PP0_PATH, PP1_PATH, JOINT_TEST_PATH],
  condition: 'before-coordinator-sign-off',
  resetOrCheckoutAllowed: false,
} as const;

function fail(message: string): never {
  throw new Error(`A1.0-v2 supply presentation contract failed: ${message}`);
}

function record(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value as JsonRecord;
}

function records(value: unknown, label: string): JsonRecord[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value.map((item, index) => record(item, `${label}[${index}]`));
}

function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    fail(`${label} must be a string array`);
  }
  return value as string[];
}

function exactKeys(value: JsonRecord, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} contains missing, extra or future fields`);
  }
}

function exactValue(value: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(`${label} drift`);
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function repositoryFile(pathValue: unknown, label: string): string {
  if (typeof pathValue !== 'string' || pathValue.length === 0 || isAbsolute(pathValue)) {
    fail(`${label} must be a non-empty repository-relative path`);
  }
  const segments = pathValue.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    fail(`${label} contains an unsafe path segment`);
  }
  const absolute = resolve(ROOT, pathValue);
  const lexical = relative(ROOT, absolute);
  if (lexical.startsWith('..') || isAbsolute(lexical)) fail(`${label} escapes repository`);
  let cursor = ROOT;
  for (const segment of segments) {
    cursor = resolve(cursor, segment);
    try {
      if (lstatSync(cursor).isSymbolicLink()) fail(`${label} traverses a symbolic link`);
    } catch {
      fail(`${label} does not exist: ${pathValue}`);
    }
  }
  const actual = realpathSync(absolute);
  const actualRelative = relative(realpathSync(ROOT), actual);
  if (actualRelative.startsWith('..') || isAbsolute(actualRelative)) {
    fail(`${label} escapes repository after realpath`);
  }
  if (!lstatSync(actual).isFile()) fail(`${label} must resolve to a regular file`);
  return actual;
}

function textOccurrenceCount(text: string, needle: string): number {
  if (needle.length === 0) return 0;
  return text.split(needle).length - 1;
}

function requireTextOnce(text: string, needle: string, label: string): void {
  if (textOccurrenceCount(text, needle) !== 1) fail(`${label} must appear exactly once`);
}

const contractFile = repositoryFile(CONTRACT_PATH, 'contract');
const contract = record(JSON.parse(readFileSync(contractFile, 'utf8')), 'contract');
exactKeys(contract, [
  'schemaVersion', 'id', 'status', 'reviewedAt', 'supersedes', 'scope',
  'contractSurface', 'eventRouting', 'sequenceAndRecovery', 'fixtureCoverage',
  'artCounterevidence', 'externalEvidenceBoundary', 'hardGates', 'score',
  'sourceAudit', 'missingMandatorySkillReferences', 'rollback',
], 'contract');
if (contract.schemaVersion !== 2
  || contract.id !== 'arena.art.supply-presentation.a1.0.v2'
  || contract.status !== 'joint-gate-candidate'
  || contract.reviewedAt !== '2026-08-03'
  || contract.scope !== 'current-source-art-contract-and-node-evidence-only') {
  fail('identity, status, date or scope drift');
}

const supersedes = record(contract.supersedes, 'supersedes');
const expectedSupersedes = {
  id: 'arena.art.supply-presentation.a1.0.v1',
  path: V1_PATH,
  sha256: '719e68766a03c82d76ef1eb49eeab29bc5045c57dad450032f96db26f410ed1e',
  baselineCommit: 'dd786a922625472643b2f6c96f80c7049a57d3e2',
};
exactKeys(supersedes, Object.keys(expectedSupersedes), 'supersedes');
exactValue(supersedes, expectedSupersedes, 'supersedes');
const v1Bytes = readFileSync(repositoryFile(supersedes.path, 'supersedes.path'));
if (sha256(v1Bytes) !== supersedes.sha256) fail('superseded v1 identity drift');

exactValue(record(contract.contractSurface, 'contractSurface'),
  EXPECTED_CONTRACT_SURFACE, 'contractSurface');
exactValue(record(contract.eventRouting, 'eventRouting'),
  EXPECTED_EVENT_ROUTING, 'eventRouting');
exactValue(record(contract.sequenceAndRecovery, 'sequenceAndRecovery'),
  EXPECTED_SEQUENCE_AND_RECOVERY, 'sequenceAndRecovery');
exactValue(record(contract.artCounterevidence, 'artCounterevidence'),
  EXPECTED_ART_COUNTEREVIDENCE, 'artCounterevidence');
exactValue(record(contract.externalEvidenceBoundary, 'externalEvidenceBoundary'),
  EXPECTED_EXTERNAL_EVIDENCE_BOUNDARY, 'externalEvidenceBoundary');
exactValue(record(contract.hardGates, 'hardGates'), EXPECTED_HARD_GATES, 'hardGates');
exactValue(record(contract.score, 'score'), EXPECTED_SCORE, 'score');
exactValue(record(contract.rollback, 'rollback'), EXPECTED_ROLLBACK, 'rollback');

const dimensions = records(record(contract.score, 'score').dimensions, 'score.dimensions');
const dimensionScore = dimensions.reduce((sum, dimension) => sum + Number(dimension.score), 0);
const dimensionMaximum = dimensions.reduce(
  (sum, dimension) => sum + Number(dimension.maximum),
  0,
);
if (dimensionScore !== 94 || dimensionMaximum !== 100) fail('score arithmetic drift');
for (const dimension of dimensions) {
  const scoreValue = Number(dimension.score);
  const maximumValue = Number(dimension.maximum);
  if (!Number.isFinite(scoreValue) || !Number.isFinite(maximumValue)
    || maximumValue <= 0
    || scoreValue / maximumValue < 0.8) {
    fail(`score dimension ${String(dimension.id)} is below 80% or invalid`);
  }
}

const fixtureCoverage = record(contract.fixtureCoverage, 'fixtureCoverage');
exactKeys(fixtureCoverage, [
  'testPath', 'candidateReportedTestCount', 'runtimeAdapterTested', 'fixtures',
], 'fixtureCoverage');
if (fixtureCoverage.testPath !== JOINT_TEST_PATH
  || fixtureCoverage.candidateReportedTestCount !== 51
  || fixtureCoverage.runtimeAdapterTested !== true) {
  fail('fixture evidence identity/status drift');
}
const fixtures = records(fixtureCoverage.fixtures, 'fixtureCoverage.fixtures');
for (const [index, fixture] of fixtures.entries()) {
  exactKeys(fixture, ['id', 'testName', 'nodeEvidence', 'artReview'], `fixture[${index}]`);
}
exactValue(fixtures, EXPECTED_FIXTURES, 'fixtureCoverage.fixtures');
if (fixtures.length !== 25
  || new Set(fixtures.map((fixture) => fixture.id)).size !== 25
  || new Set(fixtures.map((fixture) => fixture.testName)).size !== 25) {
  fail('fixture coverage must be a one-to-one set of 25 identities and tests');
}

const sourceAudit = records(contract.sourceAudit, 'sourceAudit');
for (const [index, source] of sourceAudit.entries()) {
  exactKeys(source, ['path', 'role', 'byteLength', 'sha256'], `sourceAudit[${index}]`);
  if (!Number.isSafeInteger(source.byteLength) || Number(source.byteLength) <= 0
    || typeof source.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(source.sha256)) {
    fail(`sourceAudit[${index}] contains invalid size or hash`);
  }
}
exactValue(sourceAudit, EXPECTED_SOURCES, 'sourceAudit stable identity and order');
if (sourceAudit.length !== 28
  || new Set(sourceAudit.map((source) => source.path)).size !== 28
  || new Set(sourceAudit.map((source) => source.role)).size !== 28) {
  fail('sourceAudit requires 28 unique paths and roles');
}
for (const source of sourceAudit) {
  const bytes = readFileSync(repositoryFile(source.path, `source.${String(source.path)}`));
  if (bytes.length !== source.byteLength || sha256(bytes) !== source.sha256) {
    fail(`source identity drift: ${String(source.path)}`);
  }
}

const pp0Text = readFileSync(repositoryFile(PP0_PATH, 'PP0 source'), 'utf8');
const pp1Text = readFileSync(repositoryFile(PP1_PATH, 'PP1 source'), 'utf8');
const jointTestText = readFileSync(repositoryFile(JOINT_TEST_PATH, 'joint test source'), 'utf8');
for (const fixture of EXPECTED_FIXTURES) {
  requireTextOnce(pp0Text, `'${fixture.id}'`, `PP0 fixture id ${fixture.id}`);
  requireTextOnce(
    jointTestText,
    `test('${fixture.testName}',`,
    `joint test ${fixture.testName}`,
  );
}
if (textOccurrenceCount(jointTestText, 'test(') !== 51) {
  fail('joint test file no longer contains the frozen 51 test declarations');
}
for (const needle of [
  'ARENA_SUPPLY_PRESENTATION_MAX_EVENTS_PER_UPDATE = 64',
  'ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE = 256',
  'ARENA_SUPPLY_PRESENTATION_MAX_PENDING_REPLACEMENT_PAIRS = 3',
  'createArenaSupplyPresentationEventCanonicalHashV1',
  'const MARKER_KEYS = new Set([',
  'const CUE_KEYS = new Set([',
  'const VIEW_KEYS = new Set([',
  'const OPTIONS_KEYS = new Set([',
  'const START_KEYS = new Set([',
  'const UPDATE_KEYS = new Set([...START_KEYS, \'events\']);',
  'const DEBUG_KEYS = new Set([',
]) {
  if (!pp0Text.includes(needle)) fail(`PP0 source assertion missing: ${needle}`);
}
for (const needle of [
  'export class ArenaSupplyPresentationAdapter',
  'start(input: unknown): ArenaSupplyPresentationViewV1',
  'update(input: unknown): ArenaSupplyPresentationViewV1',
  'getDebugSnapshot(): ArenaSupplyPresentationDebugSnapshotV1',
  'destroy(): void',
  'input.events.length > ARENA_SUPPLY_PRESENTATION_MAX_EVENTS_PER_UPDATE',
  'createArenaSupplyPresentationEventCanonicalHashV1(event)',
]) {
  if (!pp1Text.includes(needle)) fail(`PP1 source assertion missing: ${needle}`);
}

const missingReferences = strings(
  contract.missingMandatorySkillReferences,
  'missingMandatorySkillReferences',
);
exactValue(
  missingReferences,
  ['docs/collaboration-protocol.md', 'docs/game-design-theory.md'],
  'missingMandatorySkillReferences',
);
if (missingReferences.some((path) => existsSync(resolve(ROOT, path)))) {
  fail('missing mandatory skill reference ledger is stale');
}

process.stdout.write(`${JSON.stringify({
  status: contract.status,
  score: record(contract.score, 'score').total,
  hardGatePassed: false,
  sources: sourceAudit.length,
  fixtureMappings: fixtures.length,
  runtimeAdapterTested: true,
  runtimeAdapterStatus: 'joint-gate-candidate',
  artContractSelfCheckPassed: true,
  coordinatorSignOff: false,
  pp2Authorized: false,
  pp3aAuthorized: false,
  pp3bAuthorized: false,
  a1Passed: false,
  blockoutAllowed: false,
})}\n`);
