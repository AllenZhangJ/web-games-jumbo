import test from 'node:test';
import assert from 'node:assert/strict';
import { BOT_DIFFICULTY_IDS } from '@number-strategy-jump/arena-bot';
import {
  createMatchAssignment,
  OPPONENT_PROFILES,
  SequentialMatchSeedSource,
} from '@number-strategy-jump/arena-matchmaking';

test('quick-match assignment is deterministic and keeps named streams isolated', () => {
  const first = createMatchAssignment({ matchSeed: 0x12345678 });
  const second = createMatchAssignment({ matchSeed: 0x12345678 });
  assert.deepEqual(first, second);

  const overridden = createMatchAssignment({
    matchSeed: 0x12345678,
    difficultyOverride: first.selectedDifficultyId === 'hard' ? 'easy' : 'hard',
  });
  assert.equal(overridden.opponent.id, first.opponent.id);
  assert.deepEqual(overridden.seeds, first.seeds);
  assert.equal(overridden.selectedDifficultyId, first.selectedDifficultyId);
  assert.notEqual(overridden.effectiveDifficultyId, first.effectiveDifficultyId);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.seeds));
});

test('10,000 consecutive seeds keep hidden difficulty within the 1:1:1 gate', () => {
  const counts: Map<(typeof BOT_DIFFICULTY_IDS)[number], number> = new Map(
    BOT_DIFFICULTY_IDS.map((id) => [id, 0] as const),
  );
  const profileDifficulties = new Map(OPPONENT_PROFILES.map((profile) => [
    profile.id,
    new Set<(typeof BOT_DIFFICULTY_IDS)[number]>(),
  ] as const));
  for (let seed = 0; seed < 10_000; seed += 1) {
    const assignment = createMatchAssignment({ matchSeed: seed });
    counts.set(
      assignment.selectedDifficultyId,
      (counts.get(assignment.selectedDifficultyId) ?? 0) + 1,
    );
    const difficulties = profileDifficulties.get(assignment.opponent.id);
    assert.ok(difficulties);
    difficulties.add(assignment.selectedDifficultyId);
  }
  for (const id of BOT_DIFFICULTY_IDS) {
    const share = (counts.get(id) ?? 0) / 10_000;
    assert.ok(share >= 0.313 && share <= 0.353, `${id} 分布为 ${share}`);
  }
  for (const [profileId, difficulties] of profileDifficulties) {
    assert.equal(difficulties.size, 3, `${profileId} 与难度形成固定映射`);
  }
});

test('sequential seed source is reproducible and validates uint32 input', () => {
  const first = new SequentialMatchSeedSource(7);
  const second = new SequentialMatchSeedSource(7);
  assert.deepEqual(
    Array.from({ length: 8 }, () => first.nextSeed()),
    Array.from({ length: 8 }, () => second.nextSeed()),
  );
  assert.throws(() => new SequentialMatchSeedSource(-1), /uint32/);
});
