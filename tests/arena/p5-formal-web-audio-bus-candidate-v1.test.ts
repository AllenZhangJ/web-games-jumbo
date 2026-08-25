import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE_PATH = 'src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts';

function source(): string {
  return readFileSync(SOURCE_PATH, 'utf8');
}

function section(value: string, start: string, end: string): string {
  const startIndex = value.indexOf(start);
  const endIndex = value.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `missing section start: ${start}`);
  assert.notEqual(endIndex, -1, `missing section end: ${end}`);
  return value.slice(startIndex, endIndex);
}

test('P4.4ad routes every one-shot through bounded SFX and Master buses', () => {
  const value = source();
  const constructor = section(value, 'constructor(value: unknown)', '\n\n  get state');
  assert.match(constructor, /const createdSfxBus = context\.createGain\(\)/u);
  assert.match(constructor, /const createdMasterBus = context\.createGain\(\)/u);
  assert.match(constructor, /const createdLimiter = context\.createDynamicsCompressor\(\)/u);
  assert.match(constructor, /createdSfxBus\.connect\(createdMasterBus\)/u);
  assert.match(constructor, /createdMasterBus\.connect\(createdLimiter\)/u);
  assert.match(constructor, /createdLimiter\.connect\(context\.destination\)/u);

  const play = section(value, 'play(value: unknown): void', '\n\n  stopAll(): void');
  assert.match(play, /source\.connect\(gain\)/u);
  assert.match(play, /gain\.connect\(this\.#sfxBus\)/u);
  assert.doesNotMatch(play, /gain\.connect\(this\.#context\.destination\)/u);
});

test('P4.4ad keeps fixed headroom and limiter settings out of per-cue gameplay data', () => {
  const value = source();
  assert.match(value, /const MASTER_HEADROOM_DB = -6;/u);
  assert.match(value, /const SFX_BUS_GAIN_DB = 0;/u);
  assert.match(value, /const LIMITER_THRESHOLD_DB = -3;/u);
  assert.match(value, /const LIMITER_RATIO = 20;/u);
  assert.match(value, /createdMasterBus\.gain\.value = dbToLinear\(MASTER_HEADROOM_DB\)/u);
  assert.match(value, /createdLimiter\.threshold\.value = LIMITER_THRESHOLD_DB/u);
  assert.match(value, /createdLimiter\.ratio\.value = LIMITER_RATIO/u);
});

test('P4.4ad rolls back partial bus construction and disposes each owned node once', () => {
  const value = source();
  const constructionCleanup = section(
    value,
    'function cleanupFormalWebAudioConstructionResourcesCandidateV1(',
    '\n\nexport class ArenaV2FormalWebAudioConstructionCleanupFailureCandidateV1',
  );
  assert.match(constructionCleanup, /resources\.limiter\.disconnect\(\)/u);
  assert.match(constructionCleanup, /resources\.masterBus\.disconnect\(\)/u);
  assert.match(constructionCleanup, /resources\.sfxBus\.disconnect\(\)/u);
  assert.match(constructionCleanup, /const closing = resources\.context\.close\(\)/u);

  const disconnect = section(value, '#disconnectBusGraph()', '\n\n  #fail(');
  for (const node of ['sfxBus', 'masterBus', 'limiter']) {
    assert.match(disconnect, new RegExp(`if \\(!this\\.#${node}Disconnected\\)`, 'u'));
    assert.match(disconnect, new RegExp(`this\\.#${node}\\.disconnect\\(\\)`, 'u'));
    assert.match(disconnect, new RegExp(`this\\.#${node}Disconnected = true`, 'u'));
  }
  const dispose = section(
    value,
    '#attemptRequestedDisposal(): readonly unknown[]',
    '\n\n  #continueRequestedDisposal',
  );
  assert.match(dispose, /#cleanupVoices\(true\)/u);
  assert.match(dispose, /#disconnectBusGraph\(\)/u);
  assert.equal(
    dispose.indexOf('#cleanupVoices(true)') < dispose.indexOf('#disconnectBusGraph()'),
    true,
    'active voices must release before their shared bus graph',
  );
});

test('P5.3zy binds late ended callbacks to the original voice identity', () => {
  const value = source();
  const release = section(value, '#releaseVoice(', '\n\n  #stopVoice(');
  assert.match(release, /expectedVoice: ActiveVoice/u);
  assert.match(release, /voice === undefined \|\| voice !== expectedVoice/u);

  const play = section(value, 'play(value: unknown): void', '\n\n  stopAll(): void');
  assert.match(
    play,
    /const endedListener:[\s\S]*this\.#settleEndedVoiceEventually\(cue\.sourceEventId, voice\)/u,
  );
  assert.match(value, /#settleEndedVoiceEventually\(sourceEventId: string, voice: ActiveVoice\)/u);
  assert.match(value, /this\.#releaseVoice\(sourceEventId, voice, true\)/u);
  assert.match(value, /lateEndedCallbackCannotReleaseReplacementVoice: true/u);
  assert.doesNotMatch(value, /#releaseVoice\(cue\.sourceEventId\);/u);
});

test('P5.3zzh retains partial voice cleanup and closes shared audio dependencies last', () => {
  const value = source();
  const release = section(value, '#releaseVoice(', '\n\n  #stopVoice(');
  assert.match(release, /voice\.cleanup\.playbackTerminated/u);
  assert.match(release, /if \(!voice\.cleanup\.sourceDisconnected\)/u);
  assert.match(release, /if \(!voice\.cleanup\.gainDisconnected\)/u);
  assert.match(
    release,
    /voice\.cleanup\.playbackTerminated[\s\S]*voice\.cleanup\.sourceDisconnected[\s\S]*voice\.cleanup\.gainDisconnected[\s\S]*this\.#voices\.delete/u,
  );

  const dispose = section(
    value,
    '#attemptRequestedDisposal(): readonly unknown[]',
    '\n\n  #continueRequestedDisposal',
  );
  assert.match(dispose, /if \(this\.#voices\.size === 0\)/u);
  assert.match(dispose, /busGraphDisconnected/u);
  assert.match(dispose, /!this\.#loadPending/u);
  assert.match(dispose, /!this\.#contextCloseRequested/u);
  assert.match(dispose, /this\.#contextCloseRequested = false/u);
  assert.match(dispose, /this\.#contextCloseCompleted = true/u);
  assert.match(dispose, /this\.#state = 'failed'/u);
  assert.match(value, /busAndContextCleanupWaitForAllVoices: true/u);
  assert.match(value, /asynchronousContextCloseFailureReopensCleanupOwnership: true/u);
});

test('P5.3zzq waits for the complete audio load batch before terminal close', () => {
  const value = source();
  const load = section(value, 'load(): Promise<this>', '\n\n  activate(): Promise<this>');
  assert.match(load, /this\.#loadPending = true/u);
  assert.match(load, /let loadingOperations: Promise<void>\[\] = \[\]/u);
  assert.match(load, /for \(const record of records\)/u);
  assert.match(load, /Promise\.allSettled\(loadingOperations\)/u);
  assert.match(load, /throwSettledBatchFailures\(/u);
  assert.match(load, /this\.#loadPending = false/u);

  const dispose = section(
    value,
    '#attemptRequestedDisposal(): readonly unknown[]',
    '\n\n  #continueRequestedDisposal',
  );
  assert.match(
    dispose,
    /!this\.#loadPending[\s\S]*this\.#context\.close\(\)/u,
  );
  const terminalComplete = section(
    value,
    '#terminalCleanupComplete(): boolean',
    '\n\n  #notifyTerminalCleanupProgress',
  );
  assert.match(
    terminalComplete,
    /&& !this\.#loadPending[\s\S]*&& this\.#contextCloseCompleted/u,
  );
  assert.match(value, /waitsForEntireAudioLoadBatchSettlement: true/u);
  assert.match(value, /reportsEveryRejectedAudioLoadInSettledBatch: true/u);
  assert.match(value, /contextCloseWaitsForAudioLoadingToSettle: true/u);
});

test('P5.3zzzzze/P6.519 aborts pending audio fetch owners before terminal graph cleanup', () => {
  const value = source();
  const load = section(value, 'load(): Promise<this>', '\n\n  activate(): Promise<this>');
  const abort = section(value, '#abortPendingLoads()', '\n\n  #terminalCleanupComplete');
  const disposal = section(
    value,
    '#attemptRequestedDisposal(): readonly unknown[]',
    '\n\n  #continueRequestedDisposal',
  );
  const terminalComplete = section(
    value,
    '#terminalCleanupComplete(): boolean',
    '\n\n  #notifyTerminalCleanupProgress',
  );

  assert.match(value, /#pendingLoadAbortControllers = new Map<string, AbortController>\(\)/u);
  assert.match(load, /const abortController = new AbortController\(\)/u);
  assert.match(load, /this\.#pendingLoadAbortControllers\.set\(record\.audioAssetId, abortController\)/u);
  assert.match(load, /\{ signal: abortController\.signal \}/u);
  assert.match(load, /响应迟到，拒绝继续读取/u);
  assert.match(load, /字节迟到，拒绝开始解码/u);
  assert.match(load, /this\.#pendingLoadAbortControllers\.delete\(record\.audioAssetId\)/u);
  assert.match(abort, /controller\.abort\(\)/u);
  assert.match(abort, /controller\.signal\.aborted/u);
  assert.equal(
    disposal.indexOf('this.#abortPendingLoads()')
      < disposal.indexOf('this.#cleanupVoiceConstructionDebts()'),
    true,
    'pending network owners must be cancelled before voice and shared graph cleanup',
  );
  assert.match(terminalComplete, /this\.#pendingLoadAbortControllers\.size === 0/u);
  assert.match(value, /pendingAudioFetchesOwnAbortControllers: true/u);
  assert.match(value, /disposalAbortsPendingAudioFetchesBeforeGraphCleanup: true/u);
  assert.match(value, /responseAndDecodeLaunchRejectClosedOwner: true/u);
});

test('P5.3zzzul automatically continues requested audio disposal from real async settlement', () => {
  const value = source();
  const load = section(value, 'load(): Promise<this>', '\n\n  activate(): Promise<this>');
  const activate = section(value, 'activate(): Promise<this>', '\n\n  play(value: unknown)');
  const disposal = section(
    value,
    '#attemptRequestedDisposal(): readonly unknown[]',
    '\n\n  #continueRequestedDisposal',
  );
  assert.match(load, /\.finally\(\(\) => \{[\s\S]*this\.#continueRequestedDisposal\(\)/u);
  assert.match(activate, /this\.#activationPending = true/u);
  assert.match(activate, /\.finally\(\(\) => \{[\s\S]*this\.#activationPending = false/u);
  assert.match(activate, /this\.#continueRequestedDisposal\(\)/u);
  assert.match(disposal, /!this\.#activationPending/u);
  assert.match(disposal, /this\.#notifyTerminalCleanupProgress\(\)/u);
  assert.match(value, /terminalContinuationUsesAsyncSettlementNotPolling: true/u);
  assert.match(value, /contextCloseFailureRequiresExplicitOwnerRetry: true/u);
});

test('P5.3zzzvr lets the newest equal-priority authority event replace the oldest voice', () => {
  const value = source();
  const order = section(value, 'function voiceOrder(', '\n\nfunction aggregateFailure');
  assert.match(order, /left\.priority - right\.priority/u);
  assert.match(order, /left\.ordinal - right\.ordinal/u);
  assert.match(order, /compareText\(left\.sourceEventId, right\.sourceEventId\)/u);

  const play = section(value, 'play(value: unknown): void', '\n\n  stopAll(): void');
  assert.match(play, /this\.#voices\.size > MAXIMUM_CONCURRENT_VOICES/u);
  assert.match(play, /this\.#voices\.size === MAXIMUM_CONCURRENT_VOICES/u);
  assert.match(play, /if \(cue\.priority < lowest\.priority\)/u);
  assert.doesNotMatch(play, /cue\.priority <= lowest\.priority/u);
  assert.match(play, /evictionCandidate = lowest/u);
  assert.match(play, /const currentVoiceOrdinal = this\.#nextVoiceOrdinal/u);
  assert.match(play, /const nextVoiceOrdinal = currentVoiceOrdinal \+ 1/u);
  assert.match(play, /Number\.isSafeInteger\(currentVoiceOrdinal\)/u);
  assert.match(play, /Number\.isSafeInteger\(nextVoiceOrdinal\)/u);

  const ordinalValidationIndex = play.indexOf('Number.isSafeInteger(nextVoiceOrdinal)');
  const cleanupIndex = play.indexOf('this.#stopVoice(evictionCandidate.sourceEventId)');
  const retainedDebtIndex = play.indexOf('this.#voices.has(evictionCandidate.sourceEventId)');
  const createIndex = play.indexOf('this.#context.createBufferSource()');
  assert.notEqual(ordinalValidationIndex, -1);
  assert.notEqual(cleanupIndex, -1);
  assert.notEqual(retainedDebtIndex, -1);
  assert.notEqual(createIndex, -1);
  assert.equal(ordinalValidationIndex < cleanupIndex, true);
  assert.equal(cleanupIndex < retainedDebtIndex, true);
  assert.equal(retainedDebtIndex < createIndex, true);
  assert.match(play, /ordinal: currentVoiceOrdinal/u);
  assert.match(play, /this\.#nextVoiceOrdinal = nextVoiceOrdinal/u);

  const lowerPriorityBranch = play.indexOf('if (cue.priority < lowest.priority)');
  const droppedRecentCommit = play.indexOf('this.#recentSourceEventIds = [', lowerPriorityBranch);
  const droppedReturn = play.indexOf('return;', droppedRecentCommit);
  const startIndex = play.indexOf('source.start(0)');
  const playedRecentCommit = play.indexOf('this.#recentSourceEventIds = [', startIndex);
  assert.notEqual(lowerPriorityBranch, -1);
  assert.equal(lowerPriorityBranch < droppedRecentCommit, true);
  assert.equal(droppedRecentCommit < droppedReturn, true);
  assert.equal(startIndex < playedRecentCommit, true);

  assert.match(value, /maximumConcurrentVoices: MAXIMUM_CONCURRENT_VOICES/u);
  assert.match(value, /equalPriorityOverflowPolicy: 'evict-oldest-for-newest-authority-event'/u);
  assert.match(value, /lowerPriorityIncomingPolicy: 'consume-and-drop-incoming'/u);
  assert.match(
    value,
    /voiceSelectionOrder: 'priority-ascending→ordinal-ascending→sourceEventId-ascending'/u,
  );
  assert.match(value, /evictionCleanupCompletesBeforeVoiceConstruction: true/u);
  assert.match(value, /voiceOrdinalAdvanceValidatedBeforeEviction: true/u);
  assert.match(value, /droppedAndPlayedSourceEventsEnterRecentWindow: true/u);
  assert.match(value, /recentSourceEventLimit: RECENT_SOURCE_EVENT_LIMIT/u);
});
