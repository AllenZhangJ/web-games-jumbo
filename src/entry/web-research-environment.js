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
  try {
    if (typeof root.crypto?.randomUUID === 'function') {
      return `${prefix}-${root.crypto.randomUUID()}`;
    }
    if (typeof root.crypto?.getRandomValues === 'function') {
      const values = new Uint32Array(4);
      root.crypto.getRandomValues(values);
      return `${prefix}-${[...values].map(
        (value) => value.toString(16).padStart(8, '0'),
      ).join('')}`;
    }
  } catch {
    // A deterministic fallback still lets the lease fail closed on collision.
  }
  const wall = Number.isFinite(root.Date?.now?.()) ? root.Date.now() : Date.now();
  const monotonic = Number.isFinite(root.performance?.now?.())
    ? Math.floor(root.performance.now() * 1000)
    : 0;
  return `${prefix}-fallback-${wall}-${monotonic}`;
}
