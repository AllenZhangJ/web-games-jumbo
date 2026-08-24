import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';

export const ARENA_V2_FORMAL_MAP_ENVIRONMENT_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2FormalMapEnvironmentCandidateV1 {
  readonly schemaVersion: typeof ARENA_V2_FORMAL_MAP_ENVIRONMENT_CANDIDATE_V1_SCHEMA_VERSION;
  readonly mapDefinitionId: string;
  readonly identity: 'cool-linear-depth' | 'warm-cardinal-turns';
  readonly backgroundColor: number;
  readonly fogColor: number;
  readonly fogNear: number;
  readonly fogFar: number;
  readonly keyColor: number;
  readonly keyIntensity: number;
  readonly keyPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly routeAccentColor: number;
  readonly routeAccentIntensity: number;
  readonly routeAccentPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly contentHash: string;
}

const INPUTS = Object.freeze([
  Object.freeze({
    mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
    identity: 'cool-linear-depth' as const,
    backgroundColor: 0x13_24_31,
    fogColor: 0x1c_3b_49,
    fogNear: 26,
    fogFar: 112,
    keyColor: 0xb8_ed_ff,
    keyIntensity: 0.65,
    keyPosition: Object.freeze({ x: -18, y: 20, z: 11 }),
    routeAccentColor: 0x36_d8_f0,
    routeAccentIntensity: 9,
    routeAccentPosition: Object.freeze({ x: -44, y: 8, z: -2 }),
  }),
  Object.freeze({
    mapDefinitionId: 'arena-v2-kz-switchback-map.candidate.v1',
    identity: 'warm-cardinal-turns' as const,
    backgroundColor: 0x2a_20_25,
    fogColor: 0x49_32_30,
    fogNear: 15,
    fogFar: 68,
    keyColor: 0xff_e1_b3,
    keyIntensity: 0.7,
    keyPosition: Object.freeze({ x: -8, y: 16, z: 12 }),
    routeAccentColor: 0xff_9d_52,
    routeAccentIntensity: 11,
    routeAccentPosition: Object.freeze({ x: -7, y: 6, z: 8 }),
  }),
]);

export const ARENA_V2_FORMAL_MAP_ENVIRONMENTS_CANDIDATE_V1 = Object.freeze(
  INPUTS.map((input) => Object.freeze({
    schemaVersion: ARENA_V2_FORMAL_MAP_ENVIRONMENT_CANDIDATE_V1_SCHEMA_VERSION,
    ...input,
    contentHash: createDeterministicDataHash(
      input,
      `Arena V2 formal map environment ${input.mapDefinitionId}`,
    ),
  })),
);

if (
  ARENA_V2_FORMAL_MAP_ENVIRONMENTS_CANDIDATE_V1.length !== 2
  || new Set(ARENA_V2_FORMAL_MAP_ENVIRONMENTS_CANDIDATE_V1.map(
    ({ mapDefinitionId }) => mapDefinitionId,
  )).size !== 2
  || new Set(ARENA_V2_FORMAL_MAP_ENVIRONMENTS_CANDIDATE_V1.map(
    ({ identity }) => identity,
  )).size !== 2
) throw new RangeError('Arena V2两张正式地图必须具有不同环境身份。');

export function requireArenaV2FormalMapEnvironmentCandidateV1(
  mapDefinitionId: string,
): ArenaV2FormalMapEnvironmentCandidateV1 {
  const environment = ARENA_V2_FORMAL_MAP_ENVIRONMENTS_CANDIDATE_V1.find((candidate) => (
    candidate.mapDefinitionId === mapDefinitionId
  ));
  if (!environment) throw new RangeError(`未知Arena V2正式地图环境${mapDefinitionId}。`);
  return environment;
}

export const ARENA_V2_FORMAL_MAP_ENVIRONMENT_CATALOG_CANDIDATE_V1 = Object.freeze({
  schemaVersion: ARENA_V2_FORMAL_MAP_ENVIRONMENT_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  mapCount: 2 as const,
  changesRuleCollisionOrRoute: false as const,
  requiresFormalMapAsset: true as const,
  environments: ARENA_V2_FORMAL_MAP_ENVIRONMENTS_CANDIDATE_V1,
  validationStatus: 'not-run' as const,
});
