import { performance } from 'node:perf_hooks';
import { BOT_DIFFICULTY_IDS } from '../src/arena/ai/bot-difficulty.js';
import { createArenaMatchConfig } from '../src/arena/config.js';
import { createNeutralInputFrame, normalizeInputFrame } from '../src/arena/input-frame.js';
import { QuickMatchService } from '../src/arena/matchmaking/quick-match-service.js';
import { createMatchAssignment } from '../src/arena/matchmaking/match-assignment.js';
import { replayMatch } from '../src/arena/replay.js';

function readPositiveInteger(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value;
}

function finiteInput(frame) {
  return Number.isFinite(frame.moveX)
    && Number.isFinite(frame.moveZ)
    && Math.hypot(frame.moveX, frame.moveZ) <= 1 + 1e-12;
}

function createStats(id) {
  return {
    difficultyId: id,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    ticks: 0,
    actions: 0,
    hits: 0,
    eliminations: 0,
    replayChecks: 0,
    hashes: new Set(),
  };
}

function finishStats(stats) {
  const score = stats.wins + stats.draws * 0.5;
  const hitRatePerThousandTicks = stats.hits / stats.ticks * 1_000;
  const eliminationRatePerThousandTicks = stats.eliminations / stats.ticks * 1_000;
  return {
    difficultyId: stats.difficultyId,
    matches: stats.matches,
    wins: stats.wins,
    draws: stats.draws,
    losses: stats.losses,
    scoreRate: score / stats.matches,
    averageTicks: stats.ticks / stats.matches,
    averageActions: stats.actions / stats.matches,
    averageHits: stats.hits / stats.matches,
    averageEliminations: stats.eliminations / stats.matches,
    hitRatePerThousandTicks,
    eliminationRatePerThousandTicks,
    capabilityIndex: hitRatePerThousandTicks + eliminationRatePerThousandTicks * 2,
    replayChecks: stats.replayChecks,
    uniqueFinalHashes: stats.hashes.size,
  };
}

function verifyDifficultyDistribution(sampleCount = 10_000) {
  const counts = Object.fromEntries(BOT_DIFFICULTY_IDS.map((id) => [id, 0]));
  for (let seed = 0; seed < sampleCount; seed += 1) {
    counts[createMatchAssignment({ matchSeed: seed }).selectedDifficultyId] += 1;
  }
  const shares = Object.fromEntries(BOT_DIFFICULTY_IDS.map((id) => [
    id,
    counts[id] / sampleCount,
  ]));
  for (const id of BOT_DIFFICULTY_IDS) {
    if (shares[id] < 0.313 || shares[id] > 0.353) {
      throw new Error(`${id} 难度分布 ${shares[id]} 超出 33.3% ± 2%。`);
    }
  }
  return { sampleCount, counts, shares };
}

function createHumanBaseline(config) {
  const history = [];
  let nextDecisionTick = 0;
  let moveX = 0;
  let moveZ = 0;
  return (snapshot) => {
    history.push(snapshot);
    if (history.length > 11) history.shift();
    const self = snapshot.participants.find((participant) => participant.id === 'player-1');
    if (self.status !== 'active') return createNeutralInputFrame(snapshot.tick, 'player-1');
    let actionPressed = false;
    if (snapshot.tick >= nextDecisionTick) {
      nextDecisionTick = snapshot.tick + 8;
      const delayed = history[0];
      const opponent = delayed.participants.find((participant) => participant.id === 'player-2');
      const surface = config.arena.surfaces.find((value) => value.id === self.supportSurfaceId)
        ?? config.arena.surfaces[0];
      const clearance = Math.min(
        surface.halfExtents.x - Math.abs(self.position.x - surface.center.x),
        surface.halfExtents.z - Math.abs(self.position.z - surface.center.z),
      ) - config.character.radius;
      const target = clearance < 1.25 ? surface.center : opponent.position;
      const dx = target.x - self.position.x;
      const dz = target.z - self.position.z;
      const distance = Math.hypot(dx, dz);
      moveX = distance > 1e-6 ? dx / distance * 0.92 : 0;
      moveZ = distance > 1e-6 ? dz / distance * 0.92 : 0;
      if (
        self.action.phase === 'idle'
        && self.hitstunTicks === 0
        && opponent.status === 'active'
        && opponent.invulnerableTicks === 0
      ) {
        const opponentDistance = Math.hypot(
          opponent.position.x - self.position.x,
          opponent.position.z - self.position.z,
        );
        const directionX = opponentDistance > 1e-6
          ? (opponent.position.x - self.position.x) / opponentDistance
          : self.facing.x;
        const directionZ = opponentDistance > 1e-6
          ? (opponent.position.z - self.position.z) / opponentDistance
          : self.facing.z;
        const facingDot = directionX * self.facing.x + directionZ * self.facing.z;
        actionPressed = opponentDistance <= config.basePush.range * 0.92
          && facingDot >= config.basePush.minimumFacingDot;
      }
    }
    return normalizeInputFrame({
      tick: snapshot.tick,
      participantId: 'player-1',
      moveX,
      moveZ,
      actionPressed,
      actionHeld: actionPressed,
    }, {
      expectedTick: snapshot.tick,
      participantIds: ['player-1'],
    });
  };
}

function runBenchmarkMatch(seed, difficultyId, replaySample) {
  const configOverrides = { preparingTicks: 0 };
  const config = createArenaMatchConfig(configOverrides);
  const match = new QuickMatchService({ allowDifficultyOverride: true }).create({
    matchSeed: seed,
    difficultyOverride: difficultyId,
    config: configOverrides,
  });
  const benchmarkPlayer = createHumanBaseline(config);
  const metrics = { actions: 0, hits: 0, eliminations: 0 };
  try {
    match.session.start();
    while (match.session.state !== 'ended') {
      const playerFrame = benchmarkPlayer(match.session.getSnapshot());
      if (!finiteInput(playerFrame)) throw new Error(`seed ${seed} 产生非法基准输入。`);
      const { events } = match.session.step(playerFrame);
      for (const event of events) {
        if (event.type === 'ActionStarted' && event.participantId === 'player-2') {
          metrics.actions += 1;
        } else if (event.type === 'HitResolved' && event.attackerId === 'player-2') {
          metrics.hits += 1;
        } else if (
          event.type === 'PlayerEliminated'
          && event.creditedAttackerId === 'player-2'
        ) metrics.eliminations += 1;
      }
    }
    const replay = match.session.exportReplay();
    if (replaySample) {
      const replayed = replayMatch(replay);
      if (replayed.finalHash !== replay.finalHash) throw new Error(`seed ${seed} 回放分叉。`);
    }
    return {
      ticks: replay.result.endedAtTick + 1,
      result: replay.result,
      finalHash: replay.finalHash,
      replayChecked: replaySample,
      ...metrics,
    };
  } finally {
    match.session.destroy();
  }
}

const matchesPerDifficulty = readPositiveInteger('matches', 300);
const distribution = verifyDifficultyDistribution();
const startedAt = performance.now();
const results = [];

for (const difficultyId of BOT_DIFFICULTY_IDS) {
  const stats = createStats(difficultyId);
  for (let index = 0; index < matchesPerDifficulty; index += 1) {
    const seed = (index * 2_654_435_761 + 0x6d2b79f5) >>> 0;
    const result = runBenchmarkMatch(seed, difficultyId, index < 3);
    stats.matches += 1;
    stats.ticks += result.ticks;
    stats.actions += result.actions;
    stats.hits += result.hits;
    stats.eliminations += result.eliminations;
    stats.replayChecks += result.replayChecked ? 1 : 0;
    stats.hashes.add(result.finalHash);
    if (result.result.isDraw) stats.draws += 1;
    else if (result.result.winnerId === 'player-2') stats.wins += 1;
    else stats.losses += 1;
  }
  results.push(finishStats(stats));
}

const report = {
  generatedAt: new Date().toISOString(),
  matchesPerDifficulty,
  totalMatches: matchesPerDifficulty * BOT_DIFFICULTY_IDS.length,
  durationMs: performance.now() - startedAt,
  distribution,
  difficulties: results,
};
console.log(JSON.stringify(report, null, 2));

for (let index = 1; index < results.length; index += 1) {
  if (results[index].capabilityIndex + 1e-12 < results[index - 1].capabilityIndex) {
    throw new Error(
      `难度能力指数未保持顺序：${results[index - 1].difficultyId} `
      + `${results[index - 1].capabilityIndex} > ${results[index].difficultyId} `
      + `${results[index].capabilityIndex}`,
    );
  }
}
