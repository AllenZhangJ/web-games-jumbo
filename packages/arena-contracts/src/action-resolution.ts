export const ACTION_RESOLUTION_KIND = Object.freeze({
  NONE: 'none',
  IGNORED: 'ignored',
  SELECTED: 'selected',
} as const);

export type ActionResolutionKind =
  typeof ACTION_RESOLUTION_KIND[keyof typeof ACTION_RESOLUTION_KIND];
