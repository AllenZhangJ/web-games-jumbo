import { loadCleanWebBuildIdentity } from './web-build-identity.js';

export async function loadInputPilotBuildIdentity(root = globalThis) {
  return loadCleanWebBuildIdentity(root, {
    requiredArtifact: 'pilot.html',
    label: 'Input Pilot Web 工作台',
  });
}
