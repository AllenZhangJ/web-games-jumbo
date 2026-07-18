import { loadCleanWebBuildIdentity } from './web-build-identity.js';

export async function loadHumanMatchStudyBuildIdentity(root = globalThis) {
  return loadCleanWebBuildIdentity(root, {
    requiredArtifact: 'study.html',
    label: '真人研究 Web 工作台',
  });
}
