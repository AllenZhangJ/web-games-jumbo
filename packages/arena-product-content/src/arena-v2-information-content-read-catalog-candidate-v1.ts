import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import type {
  ActionDefinition,
  KzRouteDifficultyV2,
  KzRouteHitRecovery,
  KzRouteResponseOption,
  KzRouteSegmentKind,
  KzRouteSurvivalRole,
  WeaponActionContextKindV1,
  WeaponCoreVerbV1,
  WeaponCounterInputV1,
  WeaponFailureRiskV1,
  WeaponMapSituationV1,
  WeaponModeKindV1,
  KzRouteDefinitionV2,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from './arena-v2-collection-weapon-catalog-candidate-v1.js';
import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-switchback-map-candidate-v1.js';
import {
  requireArenaV2KzMapExperienceSegmentCandidateV1,
} from './arena-v2-kz-map-experience-catalog-candidate-v1.js';

export interface ArenaV2InformationWeaponActionReadEntryCandidateV1 {
  readonly context: WeaponActionContextKindV1;
  readonly actionDefinitionId: string;
  readonly resultMessageId: string;
  readonly failureRisk: WeaponFailureRiskV1;
  readonly counterInputs: readonly WeaponCounterInputV1[];
  readonly mapSituations: readonly WeaponMapSituationV1[];
  readonly targetingKind: string;
  readonly range: number;
  readonly coverageKind: 'radius' | 'facing-dot';
  readonly coverageValue: number;
  readonly windupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
  readonly cooldownTicks: number;
  readonly primaryGesture: 'press' | 'hold-release';
  readonly commitment: Readonly<{
    readonly commitTicks: number;
    readonly expireTicks: number;
    readonly expireOutcome: 'cancel' | 'release';
    readonly canTurn: boolean;
    readonly levelThresholds: readonly number[];
  }> | null;
}

export interface ArenaV2InformationWeaponModeReadEntryCandidateV1 {
  readonly modeKind: WeaponModeKindV1;
  readonly mapSituations: readonly WeaponMapSituationV1[];
}

export interface ArenaV2InformationWeaponReadEntryCandidateV1 {
  readonly weaponDefinitionId: string;
  readonly catalogId: string;
  readonly collectionOrder: number;
  readonly sourceBatch: 'launch-six' | 'collection-expansion';
  readonly nameMessageId: string;
  readonly learningProblemMessageId: string;
  readonly coreVerb: WeaponCoreVerbV1;
  readonly actions: readonly ArenaV2InformationWeaponActionReadEntryCandidateV1[];
  readonly modeConsequences: readonly ArenaV2InformationWeaponModeReadEntryCandidateV1[];
}

export interface ArenaV2InformationMapSegmentReadEntryCandidateV1 {
  readonly segmentDefinitionId: string;
  readonly ordinal: number;
  readonly nameMessageId: string;
  readonly lessonMessageId: string;
  readonly kind: KzRouteSegmentKind;
  readonly survivalRole: KzRouteSurvivalRole;
  readonly responseOptions: readonly KzRouteResponseOption[];
  readonly responseWindowTicks: number;
  readonly hitRecovery: KzRouteHitRecovery;
  readonly difficulty: KzRouteDifficultyV2;
  readonly branchCount: number;
  readonly supplyPointId: string;
  readonly pacingArc: 'two-cycle-branch-escalation' | 'cardinal-switchback-sawtooth';
  readonly cycleOrdinal: 1 | 2;
  readonly experienceBeat:
    | 'introduce'
    | 'develop'
    | 'twist'
    | 'test'
    | 'climax'
    | 'release'
    | 'resolution';
  readonly experienceIntensity: 1 | 2 | 3 | 4 | 5;
  readonly landmarkCue: string;
  readonly leadingLineCue: string;
  readonly memoryHook: string;
  readonly raceRead: string;
  readonly survivalRead: string;
}

export interface ArenaV2InformationMapReadEntryCandidateV1 {
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly nameMessageId: string;
  readonly minimumParticipants: number;
  readonly maximumParticipants: number;
  readonly respawnDelayTicks: number;
  readonly weaponSituationOpportunityCounts: readonly Readonly<{
    readonly situation: WeaponMapSituationV1;
    readonly segmentCount: number;
    readonly exampleSegment: Readonly<{
      readonly segmentDefinitionId: string;
      readonly ordinal: number;
      readonly nameMessageId: string;
    }> | null;
  }>[];
  readonly segments: readonly ArenaV2InformationMapSegmentReadEntryCandidateV1[];
}

const WEAPON_MAP_SITUATIONS = Object.freeze([
  'edge',
  'narrow-path',
  'height-transition',
  'platform-entry',
  'gap',
  'open-platform',
] as const satisfies readonly WeaponMapSituationV1[]);

export function isArenaV2WeaponSituationOpportunityCandidateV1(
  kind: KzRouteSegmentKind,
  situation: WeaponMapSituationV1,
): boolean {
  if (situation === 'edge') {
    return kind === 'gap' || kind === 'narrow-path' || kind === 'wire';
  }
  if (situation === 'narrow-path') {
    return kind === 'narrow-path';
  }
  if (situation === 'height-transition') {
    return kind === 'stairs';
  }
  if (situation === 'platform-entry') {
    return kind === 'basic-platform' || kind === 'maze';
  }
  if (situation === 'gap') {
    return kind === 'gap';
  }
  return kind === 'basic-platform';
}

function segmentNameMessageId(
  slug: 'kz-base' | 'kz-switchback',
  ordinal: number,
): string {
  return `arena.v2.map.${slug}.segment-${String(ordinal).padStart(2, '0')}.name`;
}

function weaponSituationOpportunity(
  route: KzRouteDefinitionV2,
  slug: 'kz-base' | 'kz-switchback',
  situation: WeaponMapSituationV1,
) {
  const matches = route.segments.flatMap((segment, index) => (
    isArenaV2WeaponSituationOpportunityCandidateV1(segment.kind, situation)
      ? [Object.freeze({
        segmentDefinitionId: segment.id,
        ordinal: index + 1,
        nameMessageId: segmentNameMessageId(slug, index + 1),
      })]
      : []
  ));
  return Object.freeze({
    situation,
    segmentCount: matches.length,
    exampleSegment: matches[0] ?? null,
  });
}

function finiteTargetingNumber(action: ActionDefinition, key: string): number {
  const parameters = action.targeting.parameters;
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    throw new TypeError(`动作${action.id}的targeting parameters必须是对象。`);
  }
  const value = (parameters as Readonly<Record<string, unknown>>)[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`动作${action.id}缺少有限正数${key}。`);
  }
  return value;
}

function coverage(action: ActionDefinition): Readonly<{
  coverageKind: 'radius' | 'facing-dot';
  coverageValue: number;
}> {
  const parameters = action.targeting.parameters as Readonly<Record<string, unknown>>;
  const radius = parameters.radius;
  if (typeof radius === 'number' && Number.isFinite(radius) && radius > 0) {
    return Object.freeze({ coverageKind: 'radius' as const, coverageValue: radius });
  }
  const minimumFacingDot = parameters.minimumFacingDot;
  if (typeof minimumFacingDot === 'number' && Number.isFinite(minimumFacingDot)
    && minimumFacingDot >= -1 && minimumFacingDot <= 1) {
    return Object.freeze({
      coverageKind: 'facing-dot' as const,
      coverageValue: minimumFacingDot,
    });
  }
  throw new RangeError(`动作${action.id}缺少可读的覆盖参数。`);
}

function assertClosure(): void {
  const segments = MAPS.flatMap((map) => [...map.segments]);
  if (WEAPONS.length !== 20 || MAPS.length !== 2 || segments.length !== 20) {
    throw new RangeError('Arena V2信息内容目录必须精确覆盖20把武器和2张地图的20个段落。');
  }
  if (new Set(WEAPONS.map(({ weaponDefinitionId }) => weaponDefinitionId)).size !== 20
    || new Set(WEAPONS.map(({ nameMessageId }) => nameMessageId)).size !== 20
    || new Set(segments.map(({ segmentDefinitionId }) => segmentDefinitionId)).size !== 20) {
    throw new RangeError('Arena V2信息内容目录存在重复身份。');
  }
  WEAPONS.forEach((weapon, index) => {
    if (weapon.collectionOrder !== index + 1 || weapon.actions.length !== 2
      || weapon.actions[0]?.context !== 'ground'
      || weapon.actions[1]?.context !== 'aerial'
      || weapon.modeConsequences.length !== 3) {
      throw new RangeError(`Arena V2武器${weapon.catalogId}的信息顺序或上下文不闭合。`);
    }
    for (const action of weapon.actions) {
      if ((action.primaryGesture === 'hold-release') !== (action.commitment !== null)) {
        throw new RangeError(`Arena V2武器${weapon.catalogId}的攻击手势与承诺合同不闭合。`);
      }
    }
  });
  MAPS.forEach((map) => map.segments.forEach((segment, index) => {
    if (segment.ordinal !== index + 1) {
      throw new RangeError(`Arena V2地图段落${segment.segmentDefinitionId}的阅读顺序不闭合。`);
    }
  }));
  MAPS.forEach((map) => {
    if (map.weaponSituationOpportunityCounts.length !== WEAPON_MAP_SITUATIONS.length
      || map.weaponSituationOpportunityCounts.some(({
        situation,
        segmentCount,
        exampleSegment,
      }, index) => {
        const earliestIndex = map.segments.findIndex(({ kind }) => (
          isArenaV2WeaponSituationOpportunityCandidateV1(kind, situation)
        ));
        return situation !== WEAPON_MAP_SITUATIONS[index]
          || !Number.isSafeInteger(segmentCount)
          || segmentCount < 0
          || (segmentCount === 0) !== (exampleSegment === null)
          || segmentCount !== map.segments.filter(({ kind }) => (
            isArenaV2WeaponSituationOpportunityCandidateV1(kind, situation)
          )).length
          || (exampleSegment !== null && (
            !Number.isSafeInteger(exampleSegment.ordinal)
            || exampleSegment.ordinal !== earliestIndex + 1
            || map.segments[exampleSegment.ordinal - 1]?.segmentDefinitionId
              !== exampleSegment.segmentDefinitionId
            || map.segments[exampleSegment.ordinal - 1]?.nameMessageId
              !== exampleSegment.nameMessageId
          ));
      })) {
      throw new RangeError(`Arena V2地图${map.mapDefinitionId}的武器地形机会目录不闭合。`);
    }
  });
}

const WEAPONS = Object.freeze(ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map((weapon) => (
  Object.freeze({
    weaponDefinitionId: weapon.equipment.id,
    catalogId: weapon.id,
    collectionOrder: weapon.collectionOrder,
    sourceBatch: weapon.sourceBatch,
    nameMessageId: `arena.v2.weapon.${weapon.id}.name`,
    learningProblemMessageId: `arena.v2.weapon.${weapon.id}.learning-problem`,
    coreVerb: weapon.grammar.coreVerb,
    actions: Object.freeze(weapon.grammar.contexts.map((context, index) => {
      const action = weapon.actions[index];
      if (!action || action.id !== context.actionDefinitionId) {
        throw new RangeError(`Arena V2武器${weapon.id}的动作阅读身份不闭合。`);
      }
      const actionCoverage = coverage(action);
      return Object.freeze({
        context: context.kind,
        actionDefinitionId: action.id,
        resultMessageId: `arena.v2.weapon.${weapon.id}.${context.kind}-result`,
        failureRisk: context.failureRisk,
        counterInputs: context.counterInputs,
        mapSituations: context.mapSituations,
        targetingKind: action.targeting.kind,
        range: finiteTargetingNumber(action, 'range'),
        coverageKind: actionCoverage.coverageKind,
        coverageValue: actionCoverage.coverageValue,
        windupTicks: action.timing.windupTicks,
        activeTicks: action.timing.activeTicks,
        recoveryTicks: action.timing.recoveryTicks,
        cooldownTicks: action.timing.cooldownTicks,
        primaryGesture: action.commitment === undefined ? 'press' as const : 'hold-release' as const,
        commitment: action.commitment === undefined ? null : action.commitment,
      });
    })),
    modeConsequences: Object.freeze(weapon.grammar.modeConsequences.map((consequence) => (
      Object.freeze({
        modeKind: consequence.modeKind,
        mapSituations: consequence.mapSituations,
      })
    ))),
  }) satisfies ArenaV2InformationWeaponReadEntryCandidateV1
)));

function mapReadEntry(
  mapDefinitionId: string,
  slug: 'kz-base' | 'kz-switchback',
  route: KzRouteDefinitionV2,
): ArenaV2InformationMapReadEntryCandidateV1 {
  return Object.freeze({
    mapDefinitionId,
    routeDefinitionId: route.id,
    nameMessageId: `arena.v2.map.${slug}.name`,
    minimumParticipants: route.minimumParticipants,
    maximumParticipants: route.maximumParticipants,
    respawnDelayTicks: route.respawnDelayTicks,
    weaponSituationOpportunityCounts: Object.freeze(WEAPON_MAP_SITUATIONS.map(
      (situation) => weaponSituationOpportunity(route, slug, situation),
    )),
    segments: Object.freeze(route.segments.map(
      (segment, index) => {
        const supply = route.supplyPoints.find(
          ({ segmentId }) => segmentId === segment.id,
        );
        if (!supply) throw new RangeError(`Arena V2地图段落${segment.id}缺少供给点阅读绑定。`);
        const experience = requireArenaV2KzMapExperienceSegmentCandidateV1(
          mapDefinitionId,
          segment.id,
        );
        return Object.freeze({
          segmentDefinitionId: segment.id,
          ordinal: index + 1,
          nameMessageId: segmentNameMessageId(slug, index + 1),
          lessonMessageId: `arena.v2.map.${slug}.segment-${String(index + 1).padStart(2, '0')}.lesson`,
          kind: segment.kind,
          survivalRole: segment.survivalRole,
          responseOptions: segment.responseOptions,
          responseWindowTicks: segment.responseWindowTicks,
          hitRecovery: segment.hitRecovery,
          difficulty: segment.difficulty,
          branchCount: segment.branches.length,
          supplyPointId: supply.equipmentSpawnPointId,
          pacingArc: experience.pacingArc,
          cycleOrdinal: experience.cycleOrdinal,
          experienceBeat: experience.experienceBeat,
          experienceIntensity: experience.experienceIntensity,
          landmarkCue: experience.landmarkCue,
          leadingLineCue: experience.leadingLineCue,
          memoryHook: experience.memoryHook,
          raceRead: experience.raceRead,
          survivalRead: experience.survivalRead,
        });
      },
    )),
  });
}

const MAPS = Object.freeze([
  mapReadEntry(
    ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
    'kz-base',
    ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ),
  mapReadEntry(
    ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
    'kz-switchback',
    ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
  ),
]);

assertClosure();

const AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  formalVisualAssetsReady: false as const,
  ownerId: 'p5-content' as const,
  weaponCount: 20 as const,
  mapCount: 2 as const,
  mapSegmentCount: 20 as const,
  weaponMapSituationCount: 6 as const,
  weaponSituationOpportunityCountsOwnedByContent: true as const,
  weaponSituationExampleSegmentPolicy: 'earliest-route-ordinal' as const,
  weapons: WEAPONS,
  maps: MAPS,
});

export const ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Information Content Read Catalog Candidate V1',
  ),
});
