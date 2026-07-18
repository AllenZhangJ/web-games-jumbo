import { createRuntimeInstanceId } from './runtime-instance-id.js';

function finitePositive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function mediaMatches(root, query) {
  try {
    return root.matchMedia?.(query)?.matches === true;
  } catch {
    return false;
  }
}

export function detectWebResearchEnvironment(root = globalThis) {
  const width = finitePositive(root.innerWidth, 1280);
  const height = finitePositive(root.innerHeight, 720);
  const navigatorObject = root.navigator;
  const screenObject = root.screen;
  const screenShortEdge = Math.min(
    finitePositive(screenObject?.width, width),
    finitePositive(screenObject?.height, height),
  );
  const hasTouch = Number(navigatorObject?.maxTouchPoints ?? 0) > 0
    || mediaMatches(root, '(pointer: coarse)');
  const declaredMobile = navigatorObject?.userAgentData?.mobile === true;
  let formFactor = 'desktop';
  if (declaredMobile || (hasTouch && screenShortEdge <= 600)) formFactor = 'phone';
  else if (hasTouch && screenShortEdge <= 1024) formFactor = 'tablet';
  return Object.freeze({
    platform: 'web',
    formFactor,
    orientation: height >= width ? 'portrait' : 'landscape',
    inputMode: hasTouch ? 'touch' : 'mouse',
  });
}

export function createWebResearchPageOwnerId(
  root = globalThis,
  prefix = 'research-page',
) {
  return createRuntimeInstanceId(root, prefix);
}
