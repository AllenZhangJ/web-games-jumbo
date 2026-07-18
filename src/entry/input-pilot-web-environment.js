import {
  createWebResearchPageOwnerId,
  detectWebResearchEnvironment,
} from './web-research-environment.js';

export function detectInputPilotWebEnvironment(root = globalThis) {
  return detectWebResearchEnvironment(root);
}

export function createInputPilotPageOwnerId(root = globalThis) {
  return createWebResearchPageOwnerId(root, 'pilot-page');
}
