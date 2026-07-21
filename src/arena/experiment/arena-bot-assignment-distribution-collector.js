import { BOT_DIFFICULTY_IDS } from '@number-strategy-jump/arena-bot';
import { createMatchAssignment } from '@number-strategy-jump/arena-matchmaking';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { createArenaMetricGate } from './metric-gate.js';

export const ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_ID =
  'arena.stage9.bot-assignment-distribution';
export const ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_VERSION = 1;

const SAMPLE_COUNT = 10_000;
const MINIMUM_SHARE = 0.313;
const MAXIMUM_SHARE = 0.353;

class ArenaBotAssignmentDistributionCollector {
  #destroyed = false;

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaBotAssignmentDistributionCollector 已销毁。');
  }

  beginCase() { this.#assertUsable(); }

  observeStep() { this.#assertUsable(); }

  completeCase() { this.#assertUsable(); }

  failCase() { this.#assertUsable(); }

  getResult() {
    this.#assertUsable();
    const counts = Object.fromEntries(BOT_DIFFICULTY_IDS.map((id) => [id, 0]));
    for (let seed = 0; seed < SAMPLE_COUNT; seed += 1) {
      counts[createMatchAssignment({ matchSeed: seed }).selectedDifficultyId] += 1;
    }
    const shares = Object.fromEntries(BOT_DIFFICULTY_IDS.map((id) => [
      id,
      counts[id] / SAMPLE_COUNT,
    ]));
    return cloneFrozenData({
      gate: createArenaMetricGate(BOT_DIFFICULTY_IDS.map((id) => ({
        id: `difficulty.${id}.share-bounded`,
        passed: shares[id] >= MINIMUM_SHARE && shares[id] <= MAXIMUM_SHARE,
      }))),
      denominators: { assignmentSamples: SAMPLE_COUNT },
      raw: { counts },
      derived: { shares, minimumShare: MINIMUM_SHARE, maximumShare: MAXIMUM_SHARE },
    }, 'ArenaBotAssignmentDistributionCollector result');
  }

  destroy() {
    this.#destroyed = true;
  }
}

export function createArenaBotAssignmentDistributionCollectorEntry() {
  return Object.freeze({
    id: ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_ID,
    version: ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_VERSION,
    create: () => new ArenaBotAssignmentDistributionCollector(),
  });
}
