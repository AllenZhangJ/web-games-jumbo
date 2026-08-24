export const ARENA_PRESENTATION_ASSET_PROVIDER_ID = Object.freeze({
  GLTF_ATTACHMENT_V1: 'arena.gltf-attachment.v1',
  GLTF_CHARACTER_V1: 'arena.gltf-character.v1',
  GLTF_MAP_V1: 'arena.gltf-map.v1',
  PROGRAMMATIC_ATTACHMENT_V1: 'arena.programmatic-attachment.v1',
  PROGRAMMATIC_CHARACTER_V1: 'arena.programmatic-character.v1',
} as const);

export type ArenaPresentationAssetProviderId =
  typeof ARENA_PRESENTATION_ASSET_PROVIDER_ID[keyof typeof ARENA_PRESENTATION_ASSET_PROVIDER_ID];
