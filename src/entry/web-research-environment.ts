import { createRuntimeInstanceId } from '@number-strategy-jump/arena-platform-runtime';

export interface WebResearchEnvironment {
  readonly platform: 'web';
  readonly formFactor: 'desktop' | 'phone' | 'tablet';
  readonly orientation: 'portrait' | 'landscape';
  readonly inputMode: 'mouse' | 'touch';
}

function hostProperty(value: unknown, key: PropertyKey): unknown {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return undefined;
  try {
    return Reflect.get(value, key);
  } catch {
    return undefined;
  }
}

function finitePositive(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function mediaMatches(root: unknown, query: string): boolean {
  const matchMedia = hostProperty(root, 'matchMedia');
  if (typeof matchMedia !== 'function') return false;
  try {
    const result = Reflect.apply(matchMedia, root, [query]);
    return hostProperty(result, 'matches') === true;
  } catch {
    return false;
  }
}

export function detectWebResearchEnvironment(
  root: unknown = globalThis,
): Readonly<WebResearchEnvironment> {
  const width = finitePositive(hostProperty(root, 'innerWidth'), 1280);
  const height = finitePositive(hostProperty(root, 'innerHeight'), 720);
  const navigatorObject = hostProperty(root, 'navigator');
  const screenObject = hostProperty(root, 'screen');
  const screenShortEdge = Math.min(
    finitePositive(hostProperty(screenObject, 'width'), width),
    finitePositive(hostProperty(screenObject, 'height'), height),
  );
  const maximumTouchPoints = hostProperty(navigatorObject, 'maxTouchPoints');
  const hasTouch = (
    typeof maximumTouchPoints === 'number'
    && Number.isFinite(maximumTouchPoints)
    && maximumTouchPoints > 0
  ) || mediaMatches(root, '(pointer: coarse)');
  const userAgentData = hostProperty(navigatorObject, 'userAgentData');
  const declaredMobile = hostProperty(userAgentData, 'mobile') === true;
  let formFactor: WebResearchEnvironment['formFactor'] = 'desktop';
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
  root: unknown = globalThis,
  prefix: unknown = 'research-page',
): string {
  return createRuntimeInstanceId(root, prefix);
}
