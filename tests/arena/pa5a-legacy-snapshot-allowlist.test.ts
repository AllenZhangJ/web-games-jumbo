import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return readFileSync(path.resolve(relativePath), 'utf8');
}

function privateMethod(sourceText: string, name: string, nextName: string): string {
  const start = sourceText.indexOf(`  ${name}(`);
  const end = sourceText.indexOf(`  ${nextName}(`, start + 1);
  assert.ok(start >= 0, `${name} 私有分支必须存在。`);
  assert.ok(end > start, `${name} 必须能在 ${nextName} 前被独立切片。`);
  return sourceText.slice(start, end);
}

test('PA5a removes ambiguous authority snapshot and trusted-reader production surfaces', () => {
  const matchCore = source('packages/arena-match/src/match-core.ts');
  const matchIndex = source('packages/arena-match/src/index.ts');
  const replay = source('packages/arena-match/src/replay.ts');
  const session = source('packages/arena-session/src/local-match-session.ts');
  const sessionIndex = source('packages/arena-session/src/index.ts');
  const observed = source('packages/arena-input-pilot/src/input-pilot-observed-session.ts');
  const botController = source('packages/arena-bot/src/bot-controller.ts');
  const botObservation = source('packages/arena-bot/src/bot-observation.ts');
  const botIndex = source('packages/arena-bot/src/index.ts');
  const botWorkload = source('packages/arena-v1-experiment/src/arena-v1-bot-capability-workload.ts');

  assert.match(matchCore, /getLegacyFullSnapshotForAudit\(\)/);
  assert.doesNotMatch(
    matchCore,
    /^\s+getSnapshot\(\):\s+DeepReadonly<ArenaMatchSnapshot>/m,
    'MatchCore 不得继续公开模糊 getSnapshot() full snapshot。',
  );
  assert.doesNotMatch(matchCore, /createTrustedPublicSnapshotReader/);
  assert.doesNotMatch(matchIndex, /createTrustedPublicSnapshotReader|MatchCoreTrustedPublicSnapshotReader/);

  assert.match(replay, /runLegacyUntilEndedForAudit\(/);
  assert.doesNotMatch(replay, /^\s+runUntilEnded\(/m);
  assert.match(session, /getLegacyFullSnapshotForAudit\(\)/);
  assert.match(session, /runLegacyUntilEndedForAudit\(/);
  assert.doesNotMatch(session, /createTrustedPublicSnapshotReader|attachTrustedSnapshotReader/);
  assert.doesNotMatch(
    sessionIndex,
    /createTrustedPublicSnapshotReader|MatchCoreTrustedPublicSnapshotReader/,
  );

  assert.match(
    botController,
    /attachTrustedCommandSourceReader[\s\S]*createInputFromTrustedCommandSource/,
    'BotController 必须只保留 V5 command-source handshake。',
  );
  assert.doesNotMatch(
    botController,
    /trustedBinding|TrustedSnapshotReader|assertTrustedBinding|trustedSnapshotReader|attachTrustedSnapshotReader|createInputFromTrustedSnapshot|createTrustedBotSourceSnapshot/,
    'BotController 不得保留旧 full-snapshot trusted reader/binding 面。',
  );
  assert.doesNotMatch(
    botObservation,
    /createTrustedBotSourceSnapshot/,
    'Bot observation 不得保留仅供旧 reader 使用的 trusted snapshot 投影器。',
  );
  assert.doesNotMatch(
    botIndex,
    /trustedBinding|TrustedSnapshotReader|attachTrustedSnapshotReader|createInputFromTrustedSnapshot|createTrustedBotSourceSnapshot/,
  );
  assert.doesNotMatch(
    botWorkload,
    /attachTrustedSnapshotReader|createInputFromTrustedSnapshot/,
    'V1 experiment 不得包装已退出的旧 Bot reader。',
  );

  assert.match(observed, /getLegacyFullSnapshotForAudit/);
  assert.match(observed, /runLegacyUntilEndedForAudit/);
  assert.doesNotMatch(observed, /^\s+(?:getSnapshot|runUntilEnded)\(/m);

});

test('PA5a preserves explicit residuals and excludes Experiment snapshots', () => {
  const localSession = source('packages/arena-session/src/local-match-session.ts');
  const quickMatch = source('packages/arena-quick-match/src/quick-match-service.ts');
  const survival = source(
    'packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts',
  );
  const pressure = source('scripts/arena-formal-survival-bot-pressure.ts');
  const simulationCase = source('packages/arena-experiment/src/simulation-workload-registry.ts');
  const simulationStress = source('scripts/arena-match-stress.ts');
  const bundle = source('packages/arena-session/src/bot-match-read-bundle.ts');

  // PA5c has now removed the fuzzy Session surface; only explicit audit names
  // remain and the V2 arm is still separate from the legacy audit arm.
  assert.doesNotMatch(localSession, /^\s+(?:getSnapshot|runUntilEnded|step)\(/m);
  const v5BotArm = privateMethod(localSession, '#createV5BotFrame', '#createLegacyBotFrame');
  const legacyBotArm = privateMethod(localSession, '#createLegacyBotFrame', '#stepInternal');
  assert.match(v5BotArm, /createInputFromTrustedCommandSource/);
  assert.doesNotMatch(
    v5BotArm,
    /get(?:LegacyFullSnapshotForAudit|Snapshot)\s*\(|createInput\s*\(/,
    'V5 Bot arm 不得读取或构造 legacy full snapshot。',
  );
  assert.match(legacyBotArm, /getLegacyFullSnapshotForAudit\(\)/);
  assert.match(legacyBotArm, /botController\.createInput\(/);
  assert.doesNotMatch(
    legacyBotArm,
    /createInputFromTrustedCommandSource/,
    'legacy Bot arm 不得偷偷切回 V5 command-source reader。',
  );
  const botArmSelectionStart = localSession.indexOf('const botFrame =');
  const normalizedBotStart = localSession.indexOf('const normalizedBot =', botArmSelectionStart);
  assert.ok(botArmSelectionStart >= 0 && normalizedBotStart > botArmSelectionStart);
  const botArmSelection = localSession.slice(botArmSelectionStart, normalizedBotStart);
  assert.match(botArmSelection, /this\.#createV5BotFrame\(botController\)/);
  assert.match(botArmSelection, /this\.#createLegacyBotFrame\(core, botController\)/);
  assert.doesNotMatch(
    botArmSelection,
    /get(?:LegacyFullSnapshotForAudit|Snapshot)\s*\(|createInput\s*\(/,
    'Bot arm selector 不得把 legacy 读取重新混入 V5 选择区。',
  );
  assert.match(quickMatch, /botMatchReadBundle/);
  assert.match(survival, /botMatchReadBundle/);
  assert.doesNotMatch(quickMatch, /trustedBinding|trustedBotBinding/);
  assert.doesNotMatch(survival, /trustedBinding|trustedBotBinding/);
  assert.match(quickMatch, /SESSION_METHODS/);
  assert.doesNotMatch(survival, /['"](?:getSnapshot|runUntilEnded|step)['"]|\.getSnapshot\(|\.runUntilEnded\(/);
  assert.doesNotMatch(pressure, /session\.(?:getSnapshot|runUntilEnded|step)\(/);

  // Experiment's SimulationSnapshot has the same spelling but a different
  // domain contract and is intentionally not renamed by PA5a.
  assert.match(simulationCase, /getSnapshot/);
  assert.match(simulationStress, /simulationCase\.getSnapshot\(/);
  assert.match(bundle, /createMatchReadBotBundleV2/);
  assert.doesNotMatch(bundle, /createTrustedPublicSnapshotReader/);
});
