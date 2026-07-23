import { MetricCollectorRegistry, SimulationWorkloadRegistry } from '@number-strategy-jump/arena-experiment';
import { createArenaBalanceCandidateCollectorEntry } from '@number-strategy-jump/arena-v1-experiment';
import { createArenaBotAssignmentDistributionCollectorEntry } from '@number-strategy-jump/arena-v1-experiment';
import { createArenaBotCapabilityCollectorEntry } from '@number-strategy-jump/arena-v1-experiment';
import { createArenaV1BotCapabilityWorkloadEntry } from '@number-strategy-jump/arena-v1-experiment';

export { createArenaBalanceCandidateExperimentDefinition } from '@number-strategy-jump/arena-balance';

export function createArenaBalanceCandidateExperimentRegistries() {
  return Object.freeze({
    workloadRegistry: new SimulationWorkloadRegistry([
      createArenaV1BotCapabilityWorkloadEntry(),
    ]),
    collectorRegistry: new MetricCollectorRegistry([
      createArenaBotAssignmentDistributionCollectorEntry(),
      createArenaBotCapabilityCollectorEntry(),
      createArenaBalanceCandidateCollectorEntry(),
    ]),
  });
}
