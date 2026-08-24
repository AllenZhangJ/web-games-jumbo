import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const PRODUCTION_ROOTS = Object.freeze([
  'src/arena',
  'packages/arena-v1-composition/src',
  'packages/arena-v1-application-launch/src',
  'packages/arena-v1-application-session/src',
  'packages/arena-product-presentation-three/src',
  'packages/arena-product-v1-content/src',
]);

const P2_VERSIONED_SURFACE = new RegExp([
  '\\b(?:createMatchContentSelectionV2|createMatchEquipmentUsageV3',
  '|createMatchRosterAssignmentV2|finalizeMatchParticipantAssignmentV2',
  '|createArenaMatchEventV6|createArenaPublicSupplyProjectionV3|createMatchReadFrameV3',
  '|createModeDefinition|createModePolicyDefinition|ModeRegistry|ModePolicyRegistry',
  '|createArenaMatchConfigV6|MatchParticipantSystemV2|ModePolicyResolver|MatchModeSystem',
  '|DuelModeAdapterV6|RaceModeSystem|SurvivalModeSystem|ModeMatchRuntimeV6',
  '|createModeMatchRuntimeCheckpointV[123]|validateModeMatchRuntimeCheckpointV[123]',
  '|createModeMatchRuntimeTerminalEvidenceV1|validateModeMatchRuntimeTerminalEvidenceV1',
  '|createArenaReplayV6|validateArenaReplayV6|createArenaModeCheckpointV2',
  '|restoreArenaModeCheckpointV2|createModeMatchAssignmentPlanV2',
  '|createFrozenModeMatchContentPoolV2|ProductPublicMatchInfoV2|ProductMatchResultV3',
  '|ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1',
  '|ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1',
  '|resolveArenaV2RaceRespawnFallbackAnchorCandidateV1',
  '|ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1',
  '|ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1',
  '|resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1',
  '|ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1',
  '|ModeProductResultAssemblerV3|ProductResultReplaySettlementEvidenceV1',
  '|ProductResultRuntimeSettlementEvidenceV2',
  '|createProductResultReplaySettlementEvidenceV1',
  '|createProductResultRuntimeSettlementEvidenceV2',
  '|ArenaV2ProductAuthorityRegistryCandidateV1',
  '|ModeProgressionRegistryV2|ModeRewardCommitterV2',
  '|ModeQuickMatchServiceV2|ModeLocalMatchSessionV2|ModeProductSessionV2',
  '|createModeProductSessionCompositionV2',
  '|createArenaReplayV6ModeCheckpointV2RegressionCandidate',
  '|createArenaModeGoldenManifestV2|createArenaModeVerificationPlanV1',
  '|runArenaModeVerificationPlanV1|validateArenaModeVerificationReportV1',
  '|createArenaModeVerificationFixtureV1|createArenaModeVerificationRuntimeFactoryV1)\\b',
  '|/(?:match-content-selection-v2|match-equipment-usage-v3',
  '|match-participant-assignment-v2|match-event-v6|arena-public-supply-projection-v3',
  '|match-read-frame-v3|mode-definition|mode-policy-definition|mode-registry',
  '|match-config-v6|match-participant-system-v2|mode-policy-resolver|match-mode-system',
  '|mode-runtime-contracts-v1|duel-mode-adapter-v6|race-mode-system',
  '|survival-mode-system|mode-checkpoint-v2|replay-v6|mode-match-runtime-v6',
  '|mode-match-runtime-checkpoint-v[123]|mode-match-runtime-terminal-evidence-v1',
  '|mode-match-assignment-v2',
  '|frozen-mode-match-content-pool-v2|arena-v2-race-respawn-capability-id-v1',
  '|arena-v2-race-respawn-tuning-candidate-v1|arena-v2-survival-respawn-capability-id-v1',
  '|arena-v2-survival-first-respawn-tuning-candidate-v1|product-participant-contract-v2',
  '|arena-v2-three-mode-timeline-product-proposal-candidate-v1',
  '|product-public-match-info-v2|product-match-result-v3',
  '|mode-product-result-assembler-v3|product-result-replay-settlement-evidence-v1',
  '|product-result-runtime-settlement-evidence-v2',
  '|arena-v2-product-authority-registry-candidate-v1',
  '|mode-match-reward-definition-v2',
  '|mode-progression-registry-v2|mode-reward-resolver-v2|mode-reward-committer-v2',
  '|mode-quick-match-service-v2|mode-local-match-session-v2|mode-product-session-v2',
  '|mode-product-session-composition-v2|arena-replay-v6-mode-checkpoint-v2-regression',
  '|arena-mode-golden-manifest-v2|arena-mode-verification-plan-v1',
  '|arena-mode-verification-runner-v1|arena-mode-verification-fixture-v1',
  '|arena-mode-verification-runtime-factory-v1)\\.js',
].join(''), 'u');

function typescriptFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...typescriptFiles(candidate));
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(candidate);
  }
  return files;
}

test('P2 versioned candidates remain unreachable until the P2 gate approves production wiring', () => {
  for (const root of PRODUCTION_ROOTS) {
    for (const file of typescriptFiles(root)) {
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        P2_VERSIONED_SURFACE,
        `${file} 不得在P2总门批准前接入版本化P2候选。`,
      );
    }
  }
});

test('P2 candidates are exported only through explicit versioned package surfaces', () => {
  const expectedExports = Object.freeze([
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-race-respawn-capability-id-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-race-respawn-tuning-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-survival-respawn-capability-id-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-survival-first-respawn-tuning-candidate-v1\.js/,
    ],
    [
      'packages/arena-product-content/src/index.ts',
      /\.\/arena-v2-three-mode-timeline-product-proposal-candidate-v1\.js/,
    ],
    ['packages/arena-match/src/index.ts', /\.\/replay-v6\.js/],
    ['packages/arena-match/src/index.ts', /\.\/mode-checkpoint-v2\.js/],
    ['packages/arena-match/src/index.ts', /\.\/mode-match-runtime-v6\.js/],
    ['packages/arena-match/src/index.ts', /\.\/mode-match-runtime-checkpoint-v1\.js/],
    ['packages/arena-match/src/index.ts', /\.\/mode-match-runtime-checkpoint-v2\.js/],
    ['packages/arena-match/src/index.ts', /\.\/mode-match-runtime-checkpoint-v3\.js/],
    ['packages/arena-match/src/index.ts', /\.\/mode-match-runtime-terminal-evidence-v1\.js/],
    [
      'packages/arena-product-match/src/index.ts',
      /\.\/product-result-replay-settlement-evidence-v1\.js/,
    ],
    [
      'packages/arena-product-match/src/index.ts',
      /\.\/product-result-runtime-settlement-evidence-v2\.js/,
    ],
    [
      'packages/arena-product-match/src/index.ts',
      /\.\/arena-v2-product-authority-registry-candidate-v1\.js/,
    ],
    ['packages/arena-session/src/index.ts', /\.\/mode-local-match-session-v2\.js/],
    ['packages/arena-quick-match/src/index.ts', /\.\/mode-quick-match-service-v2\.js/],
    ['packages/arena-product-session/src/index.ts', /\.\/mode-product-session-v2\.js/],
    [
      'packages/arena-product-composition/src/index.ts',
      /\.\/mode-product-session-composition-v2\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-replay-v6-mode-checkpoint-v2-regression\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-mode-golden-manifest-v2\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-mode-verification-plan-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-mode-verification-runner-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-mode-verification-fixture-v1\.js/,
    ],
    [
      'packages/arena-regression/src/index.ts',
      /\.\/arena-mode-verification-runtime-factory-v1\.js/,
    ],
  ] as const);
  for (const [file, expected] of expectedExports) {
    assert.match(readFileSync(file, 'utf8'), expected, `${file} 缺少显式版本化导出。`);
  }
});

test('P2.0w keeps legacy Timeline shape compatibility while variant proposals stay unwired', () => {
  const definitions = readFileSync(
    'packages/arena-definitions/src/mode-policy-definition.ts',
    'utf8',
  );
  const proposal = readFileSync(
    'packages/arena-product-content/src/arena-v2-three-mode-timeline-product-proposal-candidate-v1.ts',
    'utf8',
  );
  const binding = readFileSync(
    'packages/arena-regression/src/arena-three-mode-runtime-policy-binding-candidate-v1.ts',
    'utf8',
  );
  assert.match(definitions, /if \(Object\.hasOwn\(record, 'variants'\)\) return normalizeTimelineV2/u);
  assert.doesNotMatch(
    definitions.slice(
      definitions.indexOf('function normalizeTimelineV1'),
      definitions.indexOf('function cloneTimelineVariantSelectorV2'),
    ),
    /contentVersion\s*!==\s*1/u,
  );
  assert.match(proposal, /source: SOURCE/u);
  assert.match(proposal, /proposalStatus: 'proposed-not-approved'/u);
  assert.match(proposal, /balanceApprovalStatus: 'not-run'/u);
  assert.match(proposal, /timelineRuntimePolicyConsumptionWired: false/u);
  assert.match(binding, /timelineIsV2[\s\S]*nonTimelineContentVersion === 1/u);
  assert.match(binding, /Timeline V1投影不能消费Timeline Policy V2/u);
});
