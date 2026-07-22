import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';

let core = null;
try {
  core = createArenaV1MatchCore({
    seed: 0xa11e5eed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 480,
      hardLimitTicks: 600,
    },
  });
  const maximumTicks = core.config.preparingTicks + core.config.hardLimitTicks + 1;
  while (core.phase !== 'ended' && core.tick < maximumTicks) {
    const frames = core.config.participantIds.map((participantId, index) => ({
      ...createNeutralInputFrame(core.tick, participantId),
      moveX: index === 0 ? 0.65 : -0.6,
      moveZ: core.tick % 120 < 60 ? 0.2 : -0.2,
      primaryPressed: core.tick % (index === 0 ? 37 : 53) === 0,
    }));
    core.step(frames);
  }
  if (core.phase !== 'ended') throw new Error(`POC 未能在 ${maximumTicks} tick 内结束。`);

  const snapshot = core.getSnapshot();
  globalThis.__arenaMatchPoc = {
    ok: snapshot.participants.every((participant) => [
      participant.position.x,
      participant.position.y,
      participant.position.z,
      participant.velocity.x,
      participant.velocity.y,
      participant.velocity.z,
    ].every(Number.isFinite)),
    backend: snapshot.physicsBackendVersion,
    tickRate: core.config.tickRate,
    simulatedTicks: snapshot.tick,
    finalHash: core.getStateHash(),
    result: core.result,
  };
} catch (error) {
  globalThis.__arenaMatchPoc = {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
} finally {
  core?.destroy();
}
