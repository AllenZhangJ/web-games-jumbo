import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';

type ArenaMatchPocResult = Readonly<Record<string, unknown>>;
const pocGlobal = globalThis as typeof globalThis & {
  __arenaMatchPoc?: ArenaMatchPocResult;
};
let core: ReturnType<typeof createArenaV1MatchCore> | null = null;
try {
  const activeCore = createArenaV1MatchCore({
    seed: 0xa11e5eed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 480,
      hardLimitTicks: 600,
    },
  });
  core = activeCore;
  const maximumTicks = activeCore.config.preparingTicks + activeCore.config.hardLimitTicks + 1;
  while (activeCore.phase !== 'ended' && activeCore.tick < maximumTicks) {
    const frames = activeCore.config.participantIds.map((participantId, index) => ({
      ...createNeutralInputFrame(activeCore.tick, participantId),
      moveX: index === 0 ? 0.65 : -0.6,
      moveZ: activeCore.tick % 120 < 60 ? 0.2 : -0.2,
      primaryPressed: activeCore.tick % (index === 0 ? 37 : 53) === 0,
    }));
    activeCore.step(frames);
  }
  if (activeCore.phase !== 'ended') throw new Error(`POC 未能在 ${maximumTicks} tick 内结束。`);

  const snapshot = activeCore.getSnapshot();
  pocGlobal.__arenaMatchPoc = {
    ok: snapshot.participants.every((participant) => [
      participant.position.x,
      participant.position.y,
      participant.position.z,
      participant.velocity.x,
      participant.velocity.y,
      participant.velocity.z,
    ].every(Number.isFinite)),
    backend: snapshot.physicsBackendVersion,
    tickRate: activeCore.config.tickRate,
    simulatedTicks: snapshot.tick,
    finalHash: activeCore.getStateHash(),
    result: activeCore.result,
  };
} catch (error) {
  pocGlobal.__arenaMatchPoc = {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
} finally {
  core?.destroy();
}
