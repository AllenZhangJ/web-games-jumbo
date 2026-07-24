import {
  SimulationExperimentRunner,
  type ArenaExperimentReport,
  type MetricCollectorRegistry,
  type SimulationWorkloadRegistry,
} from '@number-strategy-jump/arena-experiment';
import {
  assertArenaGitSourceIdentityStable,
  readArenaGitSourceIdentity,
  type ArenaGitSourceIdentity,
} from './arena-git-source-identity.js';

export async function runArenaNodeExperiment({
  root,
  source,
  definition,
  registries,
  generatedAt = new Date().toISOString(),
}: Readonly<{
  root: string;
  source: ArenaGitSourceIdentity;
  definition: unknown;
  registries: Readonly<{
    workloadRegistry: SimulationWorkloadRegistry;
    collectorRegistry: MetricCollectorRegistry;
  }>;
  generatedAt?: string;
}>): Promise<Readonly<ArenaExperimentReport>> {
  const runner = new SimulationExperimentRunner({ definition, ...registries });
  try {
    const report = runner.run({
      generatedAt,
      environment: {
        runtimeName: 'node',
        runtimeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
      },
    });
    assertArenaGitSourceIdentityStable(source, await readArenaGitSourceIdentity(root));
    return report;
  } finally {
    runner.destroy();
  }
}
