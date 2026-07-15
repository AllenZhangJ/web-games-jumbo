import type { GroundPoint } from './geometry.js';
import type { Position3 } from './physics.js';
import type { RandomSource } from './rng.js';

export interface PlatformSize {
  readonly halfWidth: number;
  readonly halfDepth: number;
  readonly topY: number;
  readonly height: number;
}

export interface WorldLayout {
  readonly forwardMin: number;
  readonly forwardMax: number;
  readonly lateralMin: number;
  readonly lateralMax: number;
  readonly commonRangeMin: number;
  readonly commonRangeMax: number;
}

export const PLATFORM_ROLE = Object.freeze({
  HISTORY: 'history',
  CURRENT: 'current',
  CANDIDATE: 'candidate',
} as const);

export type PlatformRole = typeof PLATFORM_ROLE[keyof typeof PLATFORM_ROLE];

export const BRANCH_SIDE = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
} as const);

export type BranchSide = typeof BRANCH_SIDE[keyof typeof BRANCH_SIDE];

export interface WorldOperation {
  readonly id?: string;
  readonly label?: string;
  readonly kind?: string;
  readonly amount?: number;
}

export interface CandidateDescriptor {
  readonly operation?: WorldOperation | null;
  readonly preview?: unknown;
}

export interface WorldPlatform extends PlatformSize {
  readonly id: string;
  role: PlatformRole;
  side: BranchSide | null;
  readonly center: GroundPoint;
  heading: GroundPoint;
  readonly operation: WorldOperation | null;
  readonly preview: unknown;
  readonly payload: CandidateDescriptor;
  readonly createdAtStep: number;
}

export interface WorldPlayer {
  supportPlatformId: string | null;
  position: MutablePosition3;
}

export interface MutablePosition3 {
  x: number;
  y: number;
  z: number;
}

export interface WorldSnapshot {
  readonly step: number;
  readonly heading: GroundPoint;
  readonly history: WorldPlatform[];
  readonly current: WorldPlatform;
  readonly candidates: WorldPlatform[];
  readonly platforms: WorldPlatform[];
  readonly player: WorldPlayer;
}

const DEFAULT_PLATFORM: Readonly<PlatformSize> = Object.freeze({
  halfWidth: 1.05,
  halfDepth: 0.75,
  topY: 0,
  height: 0.34,
});

const DEFAULT_LAYOUT: Readonly<WorldLayout> = Object.freeze({
  forwardMin: 3.8,
  forwardMax: 4.25,
  lateralMin: 1.25,
  lateralMax: 1.65,
  commonRangeMin: 2.6,
  commonRangeMax: 6,
});

type RngSource = RandomSource | (() => number);

function clonePoint(point: GroundPoint): GroundPoint {
  return { x: point.x, z: point.z };
}

function clonePosition(position: Position3): MutablePosition3 {
  return { x: position.x, y: position.y, z: position.z };
}

function assertFinitePoint(
  point: unknown,
  name: string,
  includeY = false,
): asserts point is Position3 {
  if (!point || typeof point !== 'object') throw new TypeError(`${name} 必须是坐标对象。`);
  const candidate = point as Partial<Position3>;
  for (const [axis, value] of [
    ['x', candidate.x],
    ['z', candidate.z],
    ...(includeY ? [['y', candidate.y] as const] : []),
  ] as const) {
    if (!Number.isFinite(value)) throw new TypeError(`${name}.${axis} 必须是有限数。`);
  }
}

function clonePlatform(platform: WorldPlatform): WorldPlatform {
  const operation = platform.operation ? { ...platform.operation } : null;
  return {
    ...platform,
    center: clonePoint(platform.center),
    heading: clonePoint(platform.heading),
    operation,
    payload: { ...platform.payload, ...(operation ? { operation } : {}) },
  };
}

function normalizedHeading(heading: unknown, fallback: unknown = { x: 0, z: 1 }): GroundPoint {
  assertFinitePoint(heading, 'heading');
  assertFinitePoint(fallback, 'fallback heading');
  const magnitude = Math.hypot(heading.x, heading.z);
  if (magnitude < Number.EPSILON) {
    const fallbackMagnitude = Math.hypot(fallback.x, fallback.z);
    if (fallbackMagnitude < Number.EPSILON) throw new RangeError('fallback heading 不能为零向量。');
    return { x: fallback.x / fallbackMagnitude, z: fallback.z / fallbackMagnitude };
  }
  return { x: heading.x / magnitude, z: heading.z / magnitude };
}

function randomUnit(rng: RngSource): number {
  const value = typeof rng === 'function' ? rng() : rng.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new TypeError('rng 必须返回 [0, 1) 内的有限数。');
  }
  return value;
}

function randomBetween(rng: RngSource, min: number, max: number): number {
  return min + (max - min) * randomUnit(rng);
}

function normalizeCandidateDescriptors(value: unknown): CandidateDescriptor[] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new RangeError('每个当前平台必须绑定恰好两个候选分支。');
  }
  if (value.some((descriptor) => !descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor))) {
    throw new TypeError('候选分支描述必须是对象。');
  }
  return value.map((descriptor) => ({ ...(descriptor as CandidateDescriptor) }));
}

function validatePlatformSize(platform: PlatformSize): void {
  for (const key of ['halfWidth', 'halfDepth', 'topY', 'height'] as const) {
    if (!Number.isFinite(platform[key])) throw new TypeError(`platform.${key} 必须是有限数。`);
  }
  if (platform.halfWidth <= 0 || platform.halfDepth <= 0 || platform.height <= 0) {
    throw new RangeError('平台半宽、半深和高度必须为正数。');
  }
}

function validateLayout(layout: WorldLayout, platform: PlatformSize): void {
  validatePlatformSize(platform);
  const pairs: readonly [keyof WorldLayout, keyof WorldLayout][] = [
    ['forwardMin', 'forwardMax'],
    ['lateralMin', 'lateralMax'],
    ['commonRangeMin', 'commonRangeMax'],
  ];
  for (const [minKey, maxKey] of pairs) {
    if (!Number.isFinite(layout[minKey]) || !Number.isFinite(layout[maxKey])) {
      throw new TypeError(`layout.${minKey} 和 layout.${maxKey} 必须是有限数。`);
    }
    if (layout[minKey] < 0 || layout[minKey] > layout[maxKey]) {
      throw new RangeError(`layout.${minKey} 必须介于 0 和 layout.${maxKey} 之间。`);
    }
  }
  const sourceRadius = Math.hypot(platform.halfWidth, platform.halfDepth);
  const nearestCenter = Math.hypot(layout.forwardMin, layout.lateralMin);
  const farthestCenter = Math.hypot(layout.forwardMax, layout.lateralMax);
  if (nearestCenter - sourceRadius < layout.commonRangeMin
    || farthestCenter + sourceRadius > layout.commonRangeMax) {
    throw new RangeError('平台布局无法保证从当前平台任意边缘落点到候选中心仍位于常用射程。');
  }
}

function platformRadius(platform: PlatformSize): number {
  return Math.hypot(platform.halfWidth, platform.halfDepth);
}

export function candidateDistanceRange(source: WorldPlatform, target: WorldPlatform): {
  readonly min: number;
  readonly max: number;
} {
  assertFinitePoint(source?.center, 'source.center');
  assertFinitePoint(target?.center, 'target.center');
  validatePlatformSize(source);
  const centerDistance = Math.hypot(
    target.center.x - source.center.x,
    target.center.z - source.center.z,
  );
  const radius = platformRadius(source);
  return { min: Math.max(0, centerDistance - radius), max: centerDistance + radius };
}

export function isPointOnPlatform(platform: unknown, position: unknown, margin = 0): boolean {
  if (!platform || typeof platform !== 'object' || !position || typeof position !== 'object') return false;
  const candidate = platform as Partial<WorldPlatform>;
  const point = position as Partial<Position3>;
  if (!candidate.center || !Number.isFinite(point.x) || !Number.isFinite(point.z)
    || !Number.isFinite(candidate.center.x) || !Number.isFinite(candidate.center.z)
    || !Number.isFinite(candidate.halfWidth) || !Number.isFinite(candidate.halfDepth)
    || !Number.isFinite(margin) || margin < 0) return false;
  return Math.abs((point.x as number) - candidate.center.x) <= (candidate.halfWidth as number) + margin
    && Math.abs((point.z as number) - candidate.center.z) <= (candidate.halfDepth as number) + margin;
}

function boundPayload(payload: unknown = {}): {
  readonly operation: WorldOperation | null;
  readonly preview: unknown;
  readonly payload: CandidateDescriptor;
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('平台 payload 必须是对象。');
  }
  const source = payload as CandidateDescriptor;
  const operation = source.operation && typeof source.operation === 'object'
    ? { ...source.operation }
    : null;
  const safePayload = { ...source, operation };
  return { operation, preview: safePayload.preview ?? null, payload: safePayload };
}

export interface WorldStateOptions {
  readonly rng?: RngSource;
  readonly historyLimit?: number;
  readonly platform?: Partial<PlatformSize>;
  readonly layout?: Partial<WorldLayout>;
  readonly initialCenter?: GroundPoint;
  readonly initialHeading?: GroundPoint;
  readonly initialCurrent?: CandidateDescriptor;
  readonly initialCandidates?: readonly CandidateDescriptor[];
}

export class WorldState {
  readonly rng: RngSource;
  readonly historyLimit: number;
  readonly platformSize: Readonly<PlatformSize>;
  readonly layout: Readonly<WorldLayout>;
  readonly #initialCenter: GroundPoint;
  readonly #initialHeading: GroundPoint;
  #nextPlatformNumber = 1;
  step = 0;
  heading: GroundPoint;
  history: WorldPlatform[] = [];
  current!: WorldPlatform;
  candidates: WorldPlatform[] = [];
  platforms: WorldPlatform[] = [];
  player!: WorldPlayer;

  constructor({
    rng = Math.random,
    historyLimit = 3,
    platform = {},
    layout = {},
    initialCenter = { x: 0, z: 0 },
    initialHeading = { x: 0, z: 1 },
    initialCurrent = {},
    initialCandidates = [{}, {}],
  }: WorldStateOptions = {}) {
    if (!Number.isInteger(historyLimit) || historyLimit < 0) {
      throw new RangeError('historyLimit 必须是大于等于 0 的整数。');
    }
    this.rng = rng;
    this.historyLimit = historyLimit;
    this.platformSize = Object.freeze({ ...DEFAULT_PLATFORM, ...platform });
    this.layout = Object.freeze({ ...DEFAULT_LAYOUT, ...layout });
    validateLayout(this.layout, this.platformSize);
    assertFinitePoint(initialCenter, 'initialCenter');
    this.#initialCenter = clonePoint(initialCenter);
    this.#initialHeading = normalizedHeading(initialHeading);
    this.heading = clonePoint(this.#initialHeading);
    this.reset({ current: initialCurrent, candidates: initialCandidates });
  }

  reset({
    current = {},
    candidates = [{}, {}],
  }: {
    readonly current?: CandidateDescriptor;
    readonly candidates?: readonly CandidateDescriptor[];
  } = {}): WorldSnapshot {
    const candidateDescriptors = normalizeCandidateDescriptors(candidates);
    if (!current || typeof current !== 'object') throw new TypeError('current 必须是对象。');
    const nextPlatformNumber = this.#nextPlatformNumber;
    const rngSnapshot = typeof this.rng === 'function' ? undefined : this.rng.snapshot?.();
    const heading = clonePoint(this.#initialHeading);
    try {
      const stagedCurrent = this.createPlatform({
        role: PLATFORM_ROLE.CURRENT,
        center: this.#initialCenter,
        heading,
        payload: current,
        createdAtStep: 0,
      });
      const stagedCandidates = this.createCandidates(stagedCurrent, candidateDescriptors, {
        heading,
        createdAtStep: 0,
      });
      this.step = 0;
      this.heading = heading;
      this.history = [];
      this.current = stagedCurrent;
      this.candidates = stagedCandidates;
      this.player = {
        supportPlatformId: stagedCurrent.id,
        position: { x: stagedCurrent.center.x, y: stagedCurrent.topY, z: stagedCurrent.center.z },
      };
      this.rebuildPlatforms();
      return this.snapshot();
    } catch (error) {
      this.#nextPlatformNumber = nextPlatformNumber;
      if (rngSnapshot !== undefined && typeof this.rng !== 'function') this.rng.restore?.(rngSnapshot);
      throw error;
    }
  }

  commitLanding({
    platformId,
    position,
    nextCandidates,
  }: {
    readonly platformId: string;
    readonly position: unknown;
    readonly nextCandidates: readonly CandidateDescriptor[];
  }): {
    readonly previous: WorldPlatform;
    readonly current: WorldPlatform;
    readonly rejected: WorldPlatform | null;
    readonly removedHistory: WorldPlatform[];
    readonly candidates: WorldPlatform[];
    readonly player: WorldPlayer;
  } {
    const candidateDescriptors = normalizeCandidateDescriptors(nextCandidates);
    const selected = this.candidates.find((platform) => platform.id === platformId);
    if (!selected) throw new RangeError(`平台 ${platformId} 不是当前可选候选。`);
    assertFinitePoint(position, 'position');
    const candidatePosition = position as Position3;
    if (candidatePosition.y != null && !Number.isFinite(candidatePosition.y)) {
      throw new TypeError('position.y 必须是有限数。');
    }
    if (!isPointOnPlatform(selected, candidatePosition)) throw new RangeError('落点不在所选平台的顶面内。');
    const landingY = candidatePosition.y ?? selected.topY;
    if (Math.abs(landingY - selected.topY) > 1e-7) throw new RangeError('落点高度不在所选平台的顶面。');

    const previous = this.current;
    const rejected = this.candidates.find((platform) => platform.id !== platformId) ?? null;
    const nextHeading = normalizedHeading({
      x: selected.center.x - previous.center.x,
      z: selected.center.z - previous.center.z,
    }, this.heading);
    const nextPlatformNumber = this.#nextPlatformNumber;
    const rngSnapshot = typeof this.rng === 'function' ? undefined : this.rng.snapshot?.();
    let stagedCandidates: WorldPlatform[];
    try {
      stagedCandidates = this.createCandidates(selected, candidateDescriptors, {
        heading: nextHeading,
        createdAtStep: this.step + 1,
      });
    } catch (error) {
      this.#nextPlatformNumber = nextPlatformNumber;
      if (rngSnapshot !== undefined && typeof this.rng !== 'function') this.rng.restore?.(rngSnapshot);
      throw error;
    }

    previous.role = PLATFORM_ROLE.HISTORY;
    previous.side = null;
    this.history.push(previous);
    selected.role = PLATFORM_ROLE.CURRENT;
    selected.side = null;
    selected.heading = clonePoint(nextHeading);
    this.current = selected;
    this.heading = nextHeading;
    this.player = {
      supportPlatformId: selected.id,
      position: { x: candidatePosition.x, y: selected.topY, z: candidatePosition.z },
    };
    const removedHistory = this.history.length > this.historyLimit
      ? this.history.splice(0, this.history.length - this.historyLimit)
      : [];
    this.step += 1;
    this.candidates = stagedCandidates;
    this.rebuildPlatforms();
    return {
      previous: clonePlatform(previous),
      current: clonePlatform(selected),
      rejected: rejected ? clonePlatform(rejected) : null,
      removedHistory: removedHistory.map(clonePlatform),
      candidates: this.candidates.map(clonePlatform),
      player: {
        supportPlatformId: this.player.supportPlatformId,
        position: clonePosition(this.player.position),
      },
    };
  }

  snapshot(): WorldSnapshot {
    const clones = new Map(this.platforms.map((platform) => [platform.id, clonePlatform(platform)]));
    const get = (id: string): WorldPlatform => {
      const platform = clones.get(id);
      if (!platform) throw new Error(`平台快照缺少 ${id}`);
      return platform;
    };
    return {
      step: this.step,
      heading: clonePoint(this.heading),
      history: this.history.map(({ id }) => get(id)),
      current: get(this.current.id),
      candidates: this.candidates.map(({ id }) => get(id)),
      platforms: this.platforms.map(({ id }) => get(id)),
      player: {
        supportPlatformId: this.player.supportPlatformId,
        position: clonePosition(this.player.position),
      },
    };
  }

  private createPlatform({
    role,
    center,
    heading,
    side = null,
    payload = {},
    createdAtStep = this.step,
  }: {
    readonly role: PlatformRole;
    readonly center: GroundPoint;
    readonly heading: GroundPoint;
    readonly side?: BranchSide | null;
    readonly payload?: CandidateDescriptor;
    readonly createdAtStep?: number;
  }): WorldPlatform {
    assertFinitePoint(center, 'platform center');
    const binding = boundPayload(payload);
    return {
      id: `platform-${this.#nextPlatformNumber++}`,
      role,
      side,
      center: clonePoint(center),
      heading: normalizedHeading(heading),
      ...this.platformSize,
      operation: binding.operation,
      preview: binding.preview,
      payload: binding.payload,
      createdAtStep,
    };
  }

  private createCandidates(
    origin: WorldPlatform,
    descriptors: readonly CandidateDescriptor[],
    {
      heading = this.heading,
      createdAtStep = this.step,
    }: { readonly heading?: GroundPoint; readonly createdAtStep?: number } = {},
  ): WorldPlatform[] {
    const forward = normalizedHeading(heading);
    const right = { x: forward.z, z: -forward.x };
    const sides = [BRANCH_SIDE.LEFT, BRANCH_SIDE.RIGHT] as const;
    return descriptors.map((payload, index) => {
      const side = sides[index];
      if (!side) throw new RangeError('候选分支索引越界。');
      const sign = side === BRANCH_SIDE.LEFT ? -1 : 1;
      const forwardDistance = randomBetween(this.rng, this.layout.forwardMin, this.layout.forwardMax);
      const lateralDistance = randomBetween(this.rng, this.layout.lateralMin, this.layout.lateralMax);
      const offset = {
        x: forward.x * forwardDistance + right.x * lateralDistance * sign,
        z: forward.z * forwardDistance + right.z * lateralDistance * sign,
      };
      const candidate = this.createPlatform({
        role: PLATFORM_ROLE.CANDIDATE,
        side,
        center: { x: origin.center.x + offset.x, z: origin.center.z + offset.z },
        heading: offset,
        payload,
        createdAtStep,
      });
      const distanceRange = candidateDistanceRange(origin, candidate);
      if (distanceRange.min < this.layout.commonRangeMin - Number.EPSILON
        || distanceRange.max > this.layout.commonRangeMax + Number.EPSILON) {
        throw new RangeError('生成的候选平台超出常用射程，请检查布局参数。');
      }
      return candidate;
    });
  }

  private rebuildPlatforms(): void {
    this.platforms = [...this.history, this.current, ...this.candidates];
  }
}
