import { MetricCollectorRegistry, SimulationWorkloadRegistry } from '@number-strategy-jump/arena-experiment';
import { createArenaBalanceCandidateCollectorEntry } from './arena-balance-candidate-collector.js';
import { createArenaBotAssignmentDistributionCollectorEntry } from '@number-strategy-jump/arena-v1-experiment';
import { createArenaBotCapabilityCollectorEntry } from './arena-bot-capability-collector.js';
import { createArenaV1BotCapabilityWorkloadEntry } from './arena-v1-bot-capability-workload.js';

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
