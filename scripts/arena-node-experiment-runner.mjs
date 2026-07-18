import { SimulationExperimentRunner } from '../src/arena/experiment/simulation-runner.js';
import {
  assertArenaGitSourceIdentityStable,
  readArenaGitSourceIdentity,
} from './arena-git-source-identity.mjs';

export async function runArenaNodeExperiment({
  root,
  source,
  definition,
  registries,
  generatedAt = new Date().toISOString(),
}) {
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
