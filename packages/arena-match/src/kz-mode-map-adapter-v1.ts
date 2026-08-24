import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  KZ_ROUTE_SURVIVAL_ROLE,
  createKzRouteDefinitionV2,
  type KzRouteDefinitionV2,
} from '@number-strategy-jump/arena-definitions';
import {
  RACE_MODE_PREPARING_TICKS_V1,
  type RaceModeTickFactsV1,
} from './race-mode-system.js';

export const KZ_MODE_MAP_ADAPTER_V1_CANDIDATE_STATUS = 'production-unreachable' as const;

export interface KzRaceModeMapAdapterV1Options {
  readonly routeDefinition: unknown;
  readonly participantIds: readonly string[];
}

export interface KzRaceParticipantMapFactV1 {
  readonly participantId: string;
  readonly supportSurfaceId: string | null;
  readonly fell: boolean;
  readonly finishGateCrossed: boolean;
}

export interface KzRaceMapTickObservationV1 {
  readonly tick: number;
  readonly activeTick: number | null;
  readonly preparationRemainingTicks: number | null;
  readonly participants: readonly KzRaceParticipantMapFactV1[];
}

export interface KzSurvivalLegalTransitionV1 {
  readonly toSegmentId: string;
  readonly anchorId: string;
  readonly traversal: 'walk' | 'jump';
}

export interface KzSurvivalRouteObservationV1 {
  readonly currentSegmentId: string;
  readonly playerSegmentId: string | null;
  readonly legalTransitions: readonly KzSurvivalLegalTransitionV1[];
}

export interface KzSurvivalRouteTargetProjectionV1 {
  readonly segmentId: string;
  readonly anchorId: string;
  readonly position: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  readonly intent: 'pursuit' | 'intercept' | 'recovery';
  readonly traversal: 'walk' | 'jump';
  readonly priority: number;
}

const OPTION_KEYS = new Set(['routeDefinition', 'participantIds']);
const RACE_OBSERVATION_KEYS = new Set([
  'tick', 'activeTick', 'preparationRemainingTicks', 'participants',
]);
const RACE_PARTICIPANT_KEYS = new Set([
  'participantId', 'supportSurfaceId', 'fell', 'finishGateCrossed',
]);
const SURVIVAL_OBSERVATION_KEYS = new Set([
  'currentSegmentId', 'playerSegmentId', 'legalTransitions',
]);
const TRANSITION_KEYS = new Set(['toSegmentId', 'anchorId', 'traversal']);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function nullableTick(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function nullableId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function sortedParticipantIds(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 4) {
    throw new RangeError(`${name}必须包含2–4人。`);
  }
  const ids = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(ids).size !== ids.length) throw new RangeError(`${name}不能重复。`);
  return Object.freeze(ids.sort(compareText));
}

export class KzRaceModeMapAdapterV1 {
  readonly #route: KzRouteDefinitionV2;
  readonly #participantIds: readonly string[];
  readonly #surfaceSegmentIndex: ReadonlyMap<string, number>;
  readonly #safeAnchorIds: readonly string[];
  readonly #finishSurfaceIds: ReadonlySet<string>;
  readonly finishGateId: string;

  constructor(options: KzRaceModeMapAdapterV1Options);
  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'KzRaceModeMapAdapterV1 options');
    exactRecord(source, OPTION_KEYS, 'KzRaceModeMapAdapterV1 options');
    this.#route = createKzRouteDefinitionV2(source.routeDefinition);
    this.#participantIds = sortedParticipantIds(
      source.participantIds,
      'KzRaceModeMapAdapterV1.participantIds',
    );
    if (
      this.#participantIds.length < this.#route.minimumParticipants
      || this.#participantIds.length > this.#route.maximumParticipants
    ) throw new RangeError('KzRaceModeMapAdapterV1 participant数量超出route能力。');
    this.#surfaceSegmentIndex = new Map(this.#route.segments.flatMap((segment, index) => (
      segment.surfaceIds.map((surfaceId) => [surfaceId, index] as const)
    )));
    this.#safeAnchorIds = Object.freeze([
      ...new Set([
        ...this.#route.startAnchorIds,
        ...this.#route.segments.map(({ respawnAnchorId }) => respawnAnchorId),
      ]),
    ].sort(compareText));
    this.#finishSurfaceIds = new Set(this.#route.segments.at(-1)!.surfaceIds);
    this.finishGateId = `${this.#route.id}:finish-gate`;
  }

  get safeAnchorIds(): readonly string[] { return this.#safeAnchorIds; }

  get fallbackSafeAnchorId(): string { return this.#route.segments[0]!.respawnAnchorId; }

  createInitialSafeAnchors(): readonly Readonly<{
    readonly participantId: string;
    readonly anchorId: string;
  }>[] {
    return Object.freeze(this.#participantIds.map((participantId, index) => Object.freeze({
      participantId,
      anchorId: this.#route.startAnchorIds[index]!,
    })));
  }

  createTickFacts(value: unknown): RaceModeTickFactsV1 {
    const source = cloneFrozenData(value, 'KzRaceMapTickObservationV1');
    exactRecord(source, RACE_OBSERVATION_KEYS, 'KzRaceMapTickObservationV1');
    const tick = assertIntegerAtLeast(source.tick, 0, 'KzRaceMapTickObservationV1.tick');
    const activeTick = nullableTick(source.activeTick, 'KzRaceMapTickObservationV1.activeTick');
    const preparationRemainingTicks = nullableTick(
      source.preparationRemainingTicks,
      'KzRaceMapTickObservationV1.preparationRemainingTicks',
    );
    if (!Array.isArray(source.participants)) {
      throw new TypeError('KzRaceMapTickObservationV1.participants必须是数组。');
    }
    const participants = source.participants.map((entry, index) => {
      const name = `KzRaceMapTickObservationV1.participants[${index}]`;
      exactRecord(entry, RACE_PARTICIPANT_KEYS, name);
      if (typeof entry.fell !== 'boolean' || typeof entry.finishGateCrossed !== 'boolean') {
        throw new TypeError(`${name}.fell/finishGateCrossed必须是boolean。`);
      }
      const participantId = assertNonEmptyString(entry.participantId, `${name}.participantId`);
      const supportSurfaceId = nullableId(entry.supportSurfaceId, `${name}.supportSurfaceId`);
      if (supportSurfaceId !== null && !this.#surfaceSegmentIndex.has(supportSurfaceId)) {
        throw new RangeError(`${name}.supportSurfaceId不属于KZ route。`);
      }
      if (entry.finishGateCrossed && (
        supportSurfaceId === null || !this.#finishSurfaceIds.has(supportSurfaceId)
      )) throw new RangeError(`${name}未在末段surface穿越finish gate。`);
      if (entry.fell && entry.finishGateCrossed) {
        throw new RangeError(`${name}不能同tick同时掉落和完成。`);
      }
      return Object.freeze({
        participantId,
        supportSurfaceId,
        fell: entry.fell,
        finishGateCrossed: entry.finishGateCrossed,
      });
    }).sort((left, right) => compareText(left.participantId, right.participantId));
    if (
      participants.length !== this.#participantIds.length
      || participants.some(({ participantId }, index) => participantId !== this.#participantIds[index])
    ) throw new RangeError('KzRaceMapTickObservationV1 participant集合不闭合。');
    const preparing = tick < RACE_MODE_PREPARING_TICKS_V1;
    const expectedPreparation = tick <= RACE_MODE_PREPARING_TICKS_V1
      ? RACE_MODE_PREPARING_TICKS_V1 - tick
      : null;
    const expectedActiveTick = preparing ? null : tick - RACE_MODE_PREPARING_TICKS_V1;
    if (
      preparationRemainingTicks !== expectedPreparation
      || activeTick !== expectedActiveTick
    ) throw new RangeError('KZ Race准备/运行时间线与RaceModeSystem不一致。');
    if (preparing && participants.some(({ fell, finishGateCrossed }) => (
      fell || finishGateCrossed
    ))) throw new RangeError('KZ Race准备期不能发布比赛事实。');

    const safeAnchorClaims = preparing ? [] : participants.flatMap((participant) => {
      if (participant.fell || participant.supportSurfaceId === null) return [];
      const segmentIndex = this.#surfaceSegmentIndex.get(participant.supportSurfaceId)!;
      return [Object.freeze({
        participantId: participant.participantId,
        anchorId: this.#route.segments[segmentIndex]!.respawnAnchorId,
        progressOrdinal: segmentIndex + 1,
      })];
    });
    const finishClaims = preparing ? [] : participants.flatMap((participant) => (
      participant.finishGateCrossed
        ? [Object.freeze({
            participantId: participant.participantId,
            finishGateId: this.finishGateId,
            progressOrdinal: this.#route.segments.length + 1,
          })]
        : []
    ));
    return Object.freeze({
      tick,
      activeTick,
      preparationRemainingTicks,
      validSafeAnchorIds: this.#safeAnchorIds,
      safeAnchorClaims: Object.freeze(safeAnchorClaims),
      finishClaims: Object.freeze(finishClaims),
      participantFalls: Object.freeze(
        participants.filter(({ fell }) => fell).map(({ participantId }) => participantId),
      ),
    });
  }
}

function projectionIntent(
  role: KzRouteDefinitionV2['segments'][number]['survivalRole'],
  isPlayerSegment: boolean,
): KzSurvivalRouteTargetProjectionV1['intent'] {
  if (isPlayerSegment) return 'pursuit';
  if (role === KZ_ROUTE_SURVIVAL_ROLE.PRESSURE || role === KZ_ROUTE_SURVIVAL_ROLE.CHOICE) {
    return 'intercept';
  }
  return 'recovery';
}

export function createKzSurvivalRouteTargetProjectionV1(
  routeValue: unknown,
  observationValue: unknown,
): readonly Readonly<KzSurvivalRouteTargetProjectionV1>[] {
  const route = createKzRouteDefinitionV2(routeValue);
  const source = cloneFrozenData(observationValue, 'KzSurvivalRouteObservationV1');
  exactRecord(source, SURVIVAL_OBSERVATION_KEYS, 'KzSurvivalRouteObservationV1');
  const currentSegmentId = assertNonEmptyString(
    source.currentSegmentId,
    'KzSurvivalRouteObservationV1.currentSegmentId',
  );
  const playerSegmentId = nullableId(
    source.playerSegmentId,
    'KzSurvivalRouteObservationV1.playerSegmentId',
  );
  const segmentById = new Map(route.segments.map((segment) => [segment.id, segment]));
  const anchorById = new Map(route.anchors.map((anchor) => [anchor.id, anchor]));
  if (!segmentById.has(currentSegmentId)) {
    throw new RangeError('KzSurvivalRouteObservationV1 currentSegmentId未知。');
  }
  if (playerSegmentId !== null && !segmentById.has(playerSegmentId)) {
    throw new RangeError('KzSurvivalRouteObservationV1 playerSegmentId未知。');
  }
  if (!Array.isArray(source.legalTransitions) || source.legalTransitions.length === 0) {
    throw new RangeError('KzSurvivalRouteObservationV1 legalTransitions必须非空。');
  }
  const knownLinks = new Set(route.survivalLinks
    .filter(({ fromSegmentId }) => fromSegmentId === currentSegmentId)
    .map(({ toSegmentId }) => toSegmentId));
  const targetIds = new Set<string>();
  const playerAlreadyOnCurrentSegment = playerSegmentId === currentSegmentId;
  const targets = source.legalTransitions.map((entry, index) => {
    const name = `KzSurvivalRouteObservationV1.legalTransitions[${index}]`;
    exactRecord(entry, TRANSITION_KEYS, name);
    const toSegmentId = assertNonEmptyString(entry.toSegmentId, `${name}.toSegmentId`);
    const anchorId = assertNonEmptyString(entry.anchorId, `${name}.anchorId`);
    if (!knownLinks.has(toSegmentId)) throw new RangeError(`${name}不是当前route合法换线。`);
    if (targetIds.has(anchorId)) throw new RangeError(`${name}.anchorId重复。`);
    targetIds.add(anchorId);
    if (entry.traversal !== 'walk' && entry.traversal !== 'jump') {
      throw new RangeError(`${name}.traversal不受支持。`);
    }
    const segment = segmentById.get(toSegmentId)!;
    const anchor = anchorById.get(anchorId);
    if (!anchor || !segment.surfaceIds.includes(anchor.surfaceId)) {
      throw new RangeError(`${name}.anchorId不属于目标segment。`);
    }
    const intent = projectionIntent(
      segment.survivalRole,
      playerAlreadyOnCurrentSegment || toSegmentId === playerSegmentId,
    );
    return Object.freeze({
      segmentId: toSegmentId,
      anchorId,
      position: anchor.position,
      intent,
      traversal: entry.traversal,
      priority: intent === 'pursuit' ? 100 : intent === 'intercept' ? 75 : 45,
    });
  }).sort((left, right) => right.priority - left.priority || compareText(left.anchorId, right.anchorId));
  return Object.freeze(targets);
}
