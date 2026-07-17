import { ARENA_MATCH_PHASE } from './config.js';
import { normalizeInputFrames } from './input-frame.js';
import { MatchCore } from './match-core.js';
import { createArenaV1MatchCore } from './arena-v1-match-core.js';

export const ARENA_REPLAY_SCHEMA_VERSION = 3;

function copyInput(frame) {
  return {
    tick: frame.tick,
    participantId: frame.participantId,
    moveX: frame.moveX,
    moveZ: frame.moveZ,
    actionPressed: frame.actionPressed,
    actionHeld: frame.actionHeld,
  };
}

function copyEvent(event) {
  return JSON.parse(JSON.stringify(event));
}

function assertPositiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value;
}

export class HeadlessMatchRunner {
  #core;
  #checkpointInterval;
  #inputFrames;
  #events;
  #checkpoints;
  #destroyed;

  constructor(core, { checkpointInterval = 60 } = {}) {
    if (!(core instanceof MatchCore)) throw new TypeError('HeadlessMatchRunner 需要 MatchCore。');
    this.#core = core;
    this.#checkpointInterval = assertPositiveInteger(checkpointInterval, 'checkpointInterval');
    this.#inputFrames = [];
    this.#events = [];
    this.#checkpoints = [{ tick: core.tick, hash: core.getStateHash() }];
    this.#destroyed = false;
  }

  get core() {
    return this.#core;
  }

  get inputFrames() {
    return this.#inputFrames.map(copyInput);
  }

  get events() {
    return this.#events.map(copyEvent);
  }

  get checkpoints() {
    return this.#checkpoints.map((checkpoint) => ({ ...checkpoint }));
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('HeadlessMatchRunner 已销毁。');
  }

  step(frames = []) {
    this.#assertUsable();
    if (this.#core.phase === ARENA_MATCH_PHASE.ENDED) {
      throw new Error('比赛已经结束，不能继续记录。');
    }
    const normalized = normalizeInputFrames(frames, {
      tick: this.#core.tick,
      participantIds: this.#core.config.participantIds,
    });
    const events = this.#core.step(normalized);
    this.#inputFrames.push(...normalized.map(copyInput));
    this.#events.push(...events.map(copyEvent));
    if (
      this.#core.tick % this.#checkpointInterval === 0
      || this.#core.phase === ARENA_MATCH_PHASE.ENDED
    ) this.#checkpoints.push({ tick: this.#core.tick, hash: this.#core.getStateHash() });
    return events;
  }

  runUntilEnded(inputProvider = () => [], { maxTicks = null } = {}) {
    this.#assertUsable();
    if (typeof inputProvider !== 'function') throw new TypeError('inputProvider 必须是函数。');
    const limit = maxTicks ?? (
      this.#core.config.preparingTicks + this.#core.config.hardLimitTicks + 1
    );
    assertPositiveInteger(limit, 'maxTicks');
    while (this.#core.phase !== ARENA_MATCH_PHASE.ENDED && this.#core.tick < limit) {
      const frames = inputProvider(this.#core.getSnapshot());
      this.step(frames ?? []);
    }
    if (this.#core.phase !== ARENA_MATCH_PHASE.ENDED) {
      throw new Error(`比赛在 ${limit} tick 内未结束。`);
    }
    return this.exportReplay();
  }

  exportReplay() {
    this.#assertUsable();
    if (this.#core.phase !== ARENA_MATCH_PHASE.ENDED || !this.#core.result) {
      throw new Error('只能导出已经结算的完整比赛回放。');
    }
    const metadata = this.#core.getReplayMetadata();
    return {
      replaySchemaVersion: ARENA_REPLAY_SCHEMA_VERSION,
      ...metadata,
      inputFrames: this.#inputFrames.map(copyInput),
      checkpoints: this.#checkpoints.map((checkpoint) => ({ ...checkpoint })),
      events: this.#events.map(copyEvent),
      finalHash: this.#core.getStateHash(),
      result: this.#core.result,
    };
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#inputFrames.length = 0;
    this.#events.length = 0;
    this.#checkpoints.length = 0;
    this.#core = null;
  }
}

function validateReplay(replay) {
  if (!replay || typeof replay !== 'object') throw new TypeError('replay 必须是对象。');
  if (replay.replaySchemaVersion !== ARENA_REPLAY_SCHEMA_VERSION) {
    throw new RangeError(`不支持 replay schema ${replay.replaySchemaVersion}。`);
  }
  if (!Number.isSafeInteger(replay.schemaVersion) || replay.schemaVersion < 1) {
    throw new TypeError('replay.schemaVersion 必须是正安全整数。');
  }
  if (
    typeof replay.physicsBackendVersion !== 'string'
    || replay.physicsBackendVersion.length === 0
  ) throw new TypeError('replay.physicsBackendVersion 必须是非空字符串。');
  for (const field of ['configHash', 'ruleContentHash']) {
    if (typeof replay[field] !== 'string' || !/^[0-9a-f]{8}$/.test(replay[field])) {
      throw new TypeError(`replay.${field} 必须是 8 位十六进制 hash。`);
    }
  }
  if (
    !Number.isSafeInteger(replay.matchSeed)
    || replay.matchSeed < 0
    || replay.matchSeed > 0xffffffff
  ) throw new RangeError('replay.matchSeed 必须是 uint32。');
  if (
    !Array.isArray(replay.inputFrames)
    || !Array.isArray(replay.checkpoints)
    || !Array.isArray(replay.events)
  ) {
    throw new TypeError('replay 缺少 inputFrames、checkpoints 或 events。');
  }
  if (!replay.config || typeof replay.config !== 'object') {
    throw new TypeError('replay 缺少 config。');
  }
  if (!replay.result || typeof replay.result !== 'object') {
    throw new TypeError('replay 必须包含完整结算结果。');
  }
  if (typeof replay.finalHash !== 'string' || !/^[0-9a-f]{8}$/.test(replay.finalHash)) {
    throw new TypeError('replay.finalHash 必须是 8 位十六进制 hash。');
  }
  let previousTick = -1;
  for (const checkpoint of replay.checkpoints) {
    if (
      !checkpoint
      || !Number.isSafeInteger(checkpoint.tick)
      || checkpoint.tick < 0
      || typeof checkpoint.hash !== 'string'
      || !/^[0-9a-f]{8}$/.test(checkpoint.hash)
    ) throw new TypeError('replay checkpoint 无效。');
    if (checkpoint.tick <= previousTick) throw new RangeError('replay checkpoint tick 必须严格递增。');
    previousTick = checkpoint.tick;
  }
  if (replay.checkpoints.length === 0 || replay.checkpoints[0].tick !== 0) {
    throw new RangeError('replay 必须包含 tick 0 的初始 checkpoint。');
  }
  return replay;
}

export function replayMatch(replay, { coreFactory = createArenaV1MatchCore } = {}) {
  validateReplay(replay);
  if (typeof coreFactory !== 'function') throw new TypeError('coreFactory 必须是函数。');
  const core = coreFactory({ seed: replay.matchSeed, config: replay.config });
  if (!(core instanceof MatchCore)) throw new TypeError('coreFactory 必须返回 MatchCore。');
  try {
    if (core.config.schemaVersion !== replay.schemaVersion) {
      throw new Error(
        `回放规则版本 ${replay.schemaVersion} 与当前 ${core.config.schemaVersion} 不一致。`,
      );
    }
    if (core.config.physicsBackendVersion !== replay.physicsBackendVersion) {
      throw new Error(
        `回放物理版本 ${replay.physicsBackendVersion} 与当前 ${core.config.physicsBackendVersion} 不一致。`,
      );
    }
    if (core.configHash !== replay.configHash) {
      throw new Error(`回放配置签名 ${replay.configHash} 与当前 ${core.configHash} 不一致。`);
    }
    if (core.ruleContentHash !== replay.ruleContentHash) {
      throw new Error(
        `回放规则内容签名 ${replay.ruleContentHash} 与当前 ${core.ruleContentHash} 不一致。`,
      );
    }
    const checkpointByTick = new Map(replay.checkpoints.map((checkpoint) => [
      checkpoint.tick,
      checkpoint.hash,
    ]));
    const initialExpected = checkpointByTick.get(core.tick);
    if (core.getStateHash() !== initialExpected) throw new Error('回放初始状态 hash 不一致。');

    let inputIndex = 0;
    const replayedEvents = [];
    while (inputIndex < replay.inputFrames.length) {
      const tick = core.tick;
      const frames = [];
      while (inputIndex < replay.inputFrames.length && replay.inputFrames[inputIndex].tick === tick) {
        frames.push(replay.inputFrames[inputIndex]);
        inputIndex += 1;
      }
      if (frames.length !== core.config.participantIds.length) {
        throw new Error(`回放输入在 tick ${tick} 不完整或不连续。`);
      }
      replayedEvents.push(...core.step(frames));
      const expected = checkpointByTick.get(core.tick);
      if (expected && core.getStateHash() !== expected) {
        const actual = core.getStateHash();
        throw new Error(`回放在 tick ${core.tick} 分叉：期望 ${expected}，实际 ${actual}。`);
      }
    }
    if (core.phase !== ARENA_MATCH_PHASE.ENDED || !core.result) {
      throw new Error('回放输入已耗尽，但比赛尚未结算。');
    }
    const finalCheckpoint = replay.checkpoints[replay.checkpoints.length - 1];
    if (finalCheckpoint.tick !== core.tick) {
      throw new Error(`回放最终 checkpoint tick ${finalCheckpoint.tick} 与比赛 ${core.tick} 不一致。`);
    }
    const finalHash = core.getStateHash();
    const result = core.result;
    if (finalHash !== replay.finalHash) {
      throw new Error(`回放最终 hash 不一致：期望 ${replay.finalHash}，实际 ${finalHash}。`);
    }
    if (JSON.stringify(replayedEvents) !== JSON.stringify(replay.events)) {
      throw new Error('回放事件序列不一致。');
    }
    if (JSON.stringify(result) !== JSON.stringify(replay.result)) {
      throw new Error('回放结算结果不一致。');
    }
    return { finalHash, result, events: replayedEvents };
  } finally {
    core.destroy();
  }
}
