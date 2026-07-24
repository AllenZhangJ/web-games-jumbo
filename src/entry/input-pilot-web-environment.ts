import {
  createWebResearchPageOwnerId,
  detectWebResearchEnvironment,
} from './web-research-environment.js';

export function detectInputPilotWebEnvironment(root: unknown = globalThis) {
  return detectWebResearchEnvironment(root);
}

export function createInputPilotPageOwnerId(root: unknown = globalThis): string {
  return createWebResearchPageOwnerId(root, 'pilot-page');
}
