import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { BotController } from '@number-strategy-jump/arena-bot';
import { BOT_DIFFICULTY_PROFILES } from '@number-strategy-jump/arena-bot';
import { createArenaV1MatchCore } from '../arena-v1-match-core.js';
import { ARENA_V1_BALANCE_DEFINITION } from '../content/arena-v1-balance.js';
import { createMatchAssignment } from '@number-strategy-jump/arena-matchmaking';
import {
  createProductMatchResult,
} from '../product/matchmaking/product-match-result.js';
import { replayMatch } from '../replay.js';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { createHumanMatchStudyDefinition } from './human-match-study-definition.js';
import { createHumanMatchStudyRecord } from './human-match-study-record.js';

function assertCandidateIdentity(definition) {
  const balanceHash = createDeterministicDataHash(
    ARENA_V1_BALANCE_DEFINITION,
    'Arena V1 balance definition',
  );
  const profilesHash = createDeterministicDataHash(
    BOT_DIFFICULTY_PROFILES,
    'Arena Bot difficulty profiles',
  );
  if (
    definition.candidate.balanceDefinitionId !== ARENA_V1_BALANCE_DEFINITION.id
    || definition.candidate.balanceDefinitionHash !== balanceHash
    || definition.candidate.botDifficultyProfilesHash !== profilesHash
  ) throw new RangeError('Human Match Study candidate 与当前 Product/Bot 内容不一致。');
}

function sameResult(left, right) {
  return createDeterministicDataHash(left, 'Human Match Study stored result')
    === createDeterministicDataHash(right, 'Human Match Study replay result');
}

function expectedProductConfigHash(replay) {
  const core = createArenaV1MatchCore({
    seed: replay.matchSeed,
    config: {
      ...ARENA_V1_BALANCE_DEFINITION.matchConfig,
      contentSelection: replay.config?.contentSelection,
    },
  });
  try {
    return core.configHash;
  } finally {
    core.destroy();
  }
}

function createBotVerifier(replay, difficultyId) {
  const assignment = createMatchAssignment({ matchSeed: replay.matchSeed });
  if (
    assignment.selectedDifficultyId !== difficultyId
    || assignment.effectiveDifficultyId !== difficultyId
  ) throw new RangeError('Human Match Study replay seed 没有天然选择预注册隐藏难度。');
  const probeCore = createArenaV1MatchCore({ seed: replay.matchSeed, config: replay.config });
  let controller;
  try {
    const character = probeCore.getCharacterDefinition('player-2');
    controller = new BotController({
      participantId: 'player-2',
      difficultyId,
      behaviorSeed: assignment.seeds.botBehavior,
      personalitySeed: assignment.seeds.botPersonality,
      arena: probeCore.config.arena,
      characterRadius: character.collision.radius,
      maximumStepHeight: character.movement.automaticStepHeight,
    });
  } finally {
    probeCore.destroy();
  }
  return Object.freeze({
    assignment,
    verify({ snapshot, frames }) {
      const recorded = frames.find(({ participantId }) => participantId === 'player-2');
      if (!recorded) throw new RangeError(`Human Match Study tick ${snapshot.tick} 缺少 Bot 输入。`);
      const expected = controller.createInput(snapshot);
      if (
        createDeterministicDataHash(recorded, 'recorded Human Match Study Bot input')
        !== createDeterministicDataHash(expected, 'expected Human Match Study Bot input')
      ) throw new RangeError(`Human Match Study Bot 输入在 tick ${snapshot.tick} 不匹配。`);
    },
    destroy() {
      controller.destroy();
      controller = null;
    },
  });
}

export function verifyHumanMatchStudyReplay({
  definition: definitionValue,
  record: recordValue,
  matchIndex,
  replay: replayValue,
}) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  assertCandidateIdentity(definition);
  const record = createHumanMatchStudyRecord(definition, recordValue);
  if (!Number.isSafeInteger(matchIndex) || matchIndex < 0) {
    throw new RangeError('Human Match Study replay matchIndex 必须是非负安全整数。');
  }
  const match = record.matches[matchIndex];
  if (!match || match.matchIndex !== matchIndex) {
    throw new RangeError(`Human Match Study record 不包含 match ${matchIndex}。`);
  }
  const replay = cloneFrozenData(replayValue, 'Human Match Study replay');
  if (replay.replaySchemaVersion !== definition.candidate.replaySchemaVersion) {
    throw new RangeError('Human Match Study replay schema 与 Definition 不一致。');
  }
  if (replay.matchSeed !== match.result.matchSeed) {
    throw new RangeError('Human Match Study replay seed 与 Record 不一致。');
  }
  if (replay.configHash !== expectedProductConfigHash(replay)) {
    throw new RangeError('Human Match Study replay 没有使用冻结的 Product Match config。');
  }
  const botVerifier = createBotVerifier(replay, record.assignment.difficultyId);
  let replayed;
  try {
    replayed = replayMatch(replay, {
      beforeStep: (step) => botVerifier.verify(step),
    });
  } finally {
    botVerifier.destroy();
  }
  const result = createProductMatchResult({
    matchSeed: replay.matchSeed,
    opponent: botVerifier.assignment.opponent,
    content: replay.config.contentSelection,
    replay,
  });
  if (!sameResult(result, match.result)) {
    throw new RangeError('Human Match Study replay 重建的 Product 结果与 Record 不一致。');
  }
  return Object.freeze({
    recordId: record.recordId,
    assignmentId: record.assignment.assignmentId,
    participantId: record.assignment.participantId,
    armId: record.assignment.armId,
    difficultyId: record.assignment.difficultyId,
    matchIndex,
    matchSeed: replay.matchSeed,
    replayHash: createDeterministicDataHash(replay, 'Human Match Study replay evidence'),
    finalHash: replayed.finalHash,
    authorityHash: result.authorityHash,
    endedAtTick: result.authorityResult.endedAtTick,
  });
}
