import {
  ARENA_V1_DEFAULT_PRESENTATION_QUALITY,
  ARENA_V1_PRESENTATION_QUALITY_ID,
  resolveArenaV1PresentationQuality,
} from '@number-strategy-jump/arena-presentation-runtime';

const TOKEN_TO_ID = Object.freeze({
  high: ARENA_V1_PRESENTATION_QUALITY_ID.HIGH,
  medium: ARENA_V1_PRESENTATION_QUALITY_ID.MEDIUM,
  low: ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
});

function tokenValue(value) {
  if (typeof value !== 'string') return null;
  return TOKEN_TO_ID[value.trim().toLowerCase()] ?? null;
}

function webQueryToken(root) {
  try {
    const search = root?.location?.search;
    if (typeof search !== 'string') return null;
    return tokenValue(new URLSearchParams(search).get('arenaQuality'));
  } catch {
    return null;
  }
}

function miniGameQueryToken(root, platformId) {
  try {
    const api = platformId === 'wechat' ? root?.wx : platformId === 'douyin' ? root?.tt : null;
    return tokenValue(api?.getLaunchOptionsSync?.()?.query?.arenaQuality);
  } catch {
    return null;
  }
}

/**
 * Entry-only launch selection. Unknown or unavailable host values fall back to
 * the immutable high profile; the selected id/hash is still captured by the
 * Product performance trace and checked against the target Policy.
 */
export function resolveArenaPresentationQualityForLaunch({
  root = globalThis,
  platformId,
  explicitToken,
} = {}) {
  const explicit = tokenValue(explicitToken);
  let debug = null;
  try { debug = tokenValue(root?.__ARENA_PRESENTATION_QUALITY__); } catch { debug = null; }
  const host = platformId === 'web'
    ? webQueryToken(root)
    : miniGameQueryToken(root, platformId);
  return resolveArenaV1PresentationQuality(
    explicit ?? debug ?? host ?? ARENA_V1_DEFAULT_PRESENTATION_QUALITY.id,
  );
}
