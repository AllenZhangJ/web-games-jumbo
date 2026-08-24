import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const KZ_ROUTE_DEFINITION_SCHEMA_VERSION = 2 as const;

export const KZ_ROUTE_INPUT = Object.freeze({
  DIRECTION: 'direction',
  JUMP: 'jump',
} as const);

export const KZ_ROUTE_SEGMENT_KIND = Object.freeze({
  BASIC_PLATFORM: 'basic-platform',
  GAP: 'gap',
  STAIRS: 'stairs',
  MAZE: 'maze',
  NARROW_PATH: 'narrow-path',
  WIRE: 'wire',
} as const);

export const KZ_ROUTE_SURVIVAL_ROLE = Object.freeze({
  SAFE: 'safe',
  PRESSURE: 'pressure',
  CHOICE: 'choice',
  RECOVERY: 'recovery',
} as const);

export const KZ_ROUTE_RESPONSE_OPTION = Object.freeze({
  HOLD: 'hold',
  STRAFE: 'strafe',
  JUMP: 'jump',
} as const);

export const KZ_ROUTE_HIT_RECOVERY = Object.freeze({
  SAME_SEGMENT: 'same-segment',
  ADJACENT_SEGMENT: 'adjacent-segment',
  RESPAWN_ANCHOR: 'respawn-anchor',
} as const);

export const KZ_ROUTE_BRANCH_ROLE = Object.freeze({
  FAST_EXPOSED: 'fast-exposed',
  SAFE_RECOVERY: 'safe-recovery',
} as const);

export type KzRouteInput = typeof KZ_ROUTE_INPUT[keyof typeof KZ_ROUTE_INPUT];
export type KzRouteSegmentKind = typeof KZ_ROUTE_SEGMENT_KIND[keyof typeof KZ_ROUTE_SEGMENT_KIND];
export type KzRouteSurvivalRole = typeof KZ_ROUTE_SURVIVAL_ROLE[keyof typeof KZ_ROUTE_SURVIVAL_ROLE];
export type KzRouteResponseOption = typeof KZ_ROUTE_RESPONSE_OPTION[keyof typeof KZ_ROUTE_RESPONSE_OPTION];
export type KzRouteHitRecovery = typeof KZ_ROUTE_HIT_RECOVERY[keyof typeof KZ_ROUTE_HIT_RECOVERY];
export type KzRouteBranchRole = typeof KZ_ROUTE_BRANCH_ROLE[keyof typeof KZ_ROUTE_BRANCH_ROLE];

export interface KzRoutePositionV2 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface KzRouteAnchorV2 {
  readonly id: string;
  readonly surfaceId: string;
  readonly position: KzRoutePositionV2;
}

export interface KzRouteDifficultyV2 {
  readonly distance: number;
  readonly rhythm: number;
  readonly turn: number;
  readonly route: number;
  readonly recovery: number;
  readonly combat: number;
}

export interface KzRouteBranchV2 {
  readonly id: string;
  readonly role: KzRouteBranchRole;
  readonly surfaceIds: readonly string[];
  readonly pathAnchorIds: readonly string[];
  readonly recoveryAnchorId: string;
  readonly expectedTraversalTicks: number;
  readonly exposureWindowTicks: number;
}

export interface KzRouteSegmentV2 {
  readonly id: string;
  readonly kind: KzRouteSegmentKind;
  readonly lessonId: string;
  readonly remixId: string;
  readonly surfaceIds: readonly string[];
  readonly pathAnchorIds: readonly string[];
  readonly entryAnchorId: string;
  readonly exitAnchorId: string;
  readonly respawnAnchorId: string;
  readonly survivalRole: KzRouteSurvivalRole;
  readonly responseOptions: readonly KzRouteResponseOption[];
  readonly responseWindowTicks: number;
  readonly hitRecovery: KzRouteHitRecovery;
  readonly difficulty: KzRouteDifficultyV2;
  readonly branches: readonly KzRouteBranchV2[];
}

export interface KzRouteSupplyPointV2 {
  readonly equipmentSpawnPointId: string;
  readonly anchorId: string;
  readonly segmentId: string;
}

export interface KzRouteSurvivalLinkV2 {
  readonly fromSegmentId: string;
  readonly toSegmentId: string;
}

export interface KzRouteDefinitionV2 {
  readonly schemaVersion: typeof KZ_ROUTE_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly mapDefinitionId: string;
  readonly requiredInputs: readonly KzRouteInput[];
  readonly minimumParticipants: number;
  readonly maximumParticipants: number;
  readonly respawnDelayTicks: number;
  readonly startAnchorIds: readonly string[];
  readonly finishAnchorId: string;
  readonly anchors: readonly KzRouteAnchorV2[];
  readonly segments: readonly KzRouteSegmentV2[];
  readonly supplyPoints: readonly KzRouteSupplyPointV2[];
  readonly survivalLinks: readonly KzRouteSurvivalLinkV2[];
}

const DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'mapDefinitionId', 'requiredInputs',
  'minimumParticipants', 'maximumParticipants', 'respawnDelayTicks',
  'startAnchorIds', 'finishAnchorId', 'anchors', 'segments',
  'supplyPoints', 'survivalLinks',
]);
const ANCHOR_KEYS = new Set(['id', 'surfaceId', 'position']);
const POSITION_KEYS = new Set(['x', 'y', 'z']);
const SEGMENT_KEYS = new Set([
  'id', 'kind', 'lessonId', 'remixId', 'surfaceIds', 'pathAnchorIds',
  'entryAnchorId', 'exitAnchorId', 'respawnAnchorId', 'survivalRole',
  'responseOptions', 'responseWindowTicks', 'hitRecovery', 'difficulty', 'branches',
]);
const DIFFICULTY_KEYS = new Set(['distance', 'rhythm', 'turn', 'route', 'recovery', 'combat']);
const BRANCH_KEYS = new Set([
  'id', 'role', 'surfaceIds', 'pathAnchorIds', 'recoveryAnchorId',
  'expectedTraversalTicks', 'exposureWindowTicks',
]);
const SUPPLY_KEYS = new Set(['equipmentSpawnPointId', 'anchorId', 'segmentId']);
const SURVIVAL_LINK_KEYS = new Set(['fromSegmentId', 'toSegmentId']);
const SEGMENT_KINDS: ReadonlySet<unknown> = new Set(Object.values(KZ_ROUTE_SEGMENT_KIND));
const SURVIVAL_ROLES: ReadonlySet<unknown> = new Set(Object.values(KZ_ROUTE_SURVIVAL_ROLE));
const RESPONSE_OPTIONS: ReadonlySet<unknown> = new Set(Object.values(KZ_ROUTE_RESPONSE_OPTION));
const HIT_RECOVERIES: ReadonlySet<unknown> = new Set(Object.values(KZ_ROUTE_HIT_RECOVERY));
const BRANCH_ROLES: ReadonlySet<unknown> = new Set(Object.values(KZ_ROUTE_BRANCH_ROLE));

function assertExactKeys(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function cloneUniqueStringArray(value: unknown, name: string, minimumLength = 1): readonly string[] {
  if (!Array.isArray(value) || value.length < minimumLength) {
    throw new RangeError(`${name} 至少需要 ${minimumLength} 项。`);
  }
  const values = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(values).size !== values.length) throw new RangeError(`${name} 不能包含重复项。`);
  return Object.freeze(values);
}

function clonePosition(value: unknown, name: string): KzRoutePositionV2 {
  assertExactKeys(value, POSITION_KEYS, name);
  const result: Record<string, number> = {};
  for (const axis of POSITION_KEYS) {
    const component = value[axis];
    if (!Number.isFinite(component)) throw new TypeError(`${name}.${axis} 必须是有限数。`);
    result[axis] = component as number;
  }
  return Object.freeze(result) as unknown as KzRoutePositionV2;
}

function cloneDifficulty(value: unknown, name: string): KzRouteDifficultyV2 {
  assertExactKeys(value, DIFFICULTY_KEYS, name);
  const result: Record<string, number> = {};
  for (const axis of DIFFICULTY_KEYS) {
    const score = assertIntegerAtLeast(value[axis], 1, `${name}.${axis}`);
    if (score > 4) throw new RangeError(`${name}.${axis} 必须位于 1–4。`);
    result[axis] = score;
  }
  return Object.freeze(result) as unknown as KzRouteDifficultyV2;
}

function assertEnum<T extends string>(
  value: unknown,
  values: ReadonlySet<unknown>,
  name: string,
): T {
  if (!values.has(value)) throw new RangeError(`${name} 不受支持：${String(value)}。`);
  return value as T;
}

function assertReferences(ids: readonly string[], known: ReadonlySet<string>, name: string): void {
  for (const id of ids) {
    if (!known.has(id)) throw new RangeError(`${name} 引用未知 ID ${id}。`);
  }
}

function assertPathEndpoints(
  pathAnchorIds: readonly string[],
  entryAnchorId: string,
  exitAnchorId: string,
  name: string,
): void {
  if (pathAnchorIds[0] !== entryAnchorId || pathAnchorIds.at(-1) !== exitAnchorId) {
    throw new RangeError(`${name} 必须从 entryAnchorId 连到 exitAnchorId。`);
  }
}

function assertStronglyConnected(
  segmentIds: readonly string[],
  links: readonly KzRouteSurvivalLinkV2[],
): void {
  const adjacency = new Map(segmentIds.map((id) => [id, [] as string[]]));
  for (const link of links) adjacency.get(link.fromSegmentId)!.push(link.toSegmentId);
  for (const origin of segmentIds) {
    const visited = new Set([origin]);
    const queue = [origin];
    for (let index = 0; index < queue.length; index += 1) {
      for (const next of adjacency.get(queue[index]!) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    if (visited.size !== segmentIds.length) {
      throw new RangeError(`KzRouteDefinitionV2.survivalLinks 无法从 ${origin} 到达全部段落。`);
    }
  }
}

export function createKzRouteDefinitionV2(value: unknown): KzRouteDefinitionV2 {
  const source = cloneFrozenData(value, 'KzRouteDefinitionV2');
  assertExactKeys(source, DEFINITION_KEYS, 'KzRouteDefinitionV2');
  if (source.schemaVersion !== KZ_ROUTE_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(
      `KzRouteDefinitionV2.schemaVersion 必须是 ${KZ_ROUTE_DEFINITION_SCHEMA_VERSION}。`,
    );
  }

  const requiredInputs = cloneUniqueStringArray(
    source.requiredInputs,
    'KzRouteDefinitionV2.requiredInputs',
    2,
  );
  if (
    requiredInputs.length !== 2
    || requiredInputs[0] !== KZ_ROUTE_INPUT.DIRECTION
    || requiredInputs[1] !== KZ_ROUTE_INPUT.JUMP
  ) {
    throw new RangeError('KzRouteDefinitionV2 只能依次使用 direction 与 jump。');
  }

  const minimumParticipants = assertIntegerAtLeast(
    source.minimumParticipants,
    1,
    'KzRouteDefinitionV2.minimumParticipants',
  );
  const maximumParticipants = assertIntegerAtLeast(
    source.maximumParticipants,
    minimumParticipants,
    'KzRouteDefinitionV2.maximumParticipants',
  );
  if (maximumParticipants > 4) {
    throw new RangeError('KzRouteDefinitionV2.maximumParticipants 不能超过首批上限 4。');
  }

  if (!Array.isArray(source.anchors) || source.anchors.length === 0) {
    throw new RangeError('KzRouteDefinitionV2.anchors 必须是非空数组。');
  }
  const anchorIds = new Set<string>();
  const anchors = source.anchors.map((entry, index) => {
    const name = `KzRouteDefinitionV2.anchors[${index}]`;
    assertExactKeys(entry, ANCHOR_KEYS, name);
    const id = assertNonEmptyString(entry.id, `${name}.id`);
    if (anchorIds.has(id)) throw new RangeError(`KzRouteDefinitionV2 包含重复 anchor ${id}。`);
    anchorIds.add(id);
    return Object.freeze({
      id,
      surfaceId: assertNonEmptyString(entry.surfaceId, `${name}.surfaceId`),
      position: clonePosition(entry.position, `${name}.position`),
    });
  });

  if (!Array.isArray(source.segments) || source.segments.length === 0) {
    throw new RangeError('KzRouteDefinitionV2.segments 必须是非空数组。');
  }
  const segmentIds = new Set<string>();
  const ownedSurfaceIds = new Set<string>();
  const branchIds = new Set<string>();
  const segments = source.segments.map((entry, index) => {
    const name = `KzRouteDefinitionV2.segments[${index}]`;
    assertExactKeys(entry, SEGMENT_KEYS, name);
    const id = assertNonEmptyString(entry.id, `${name}.id`);
    if (segmentIds.has(id)) throw new RangeError(`KzRouteDefinitionV2 包含重复 segment ${id}。`);
    segmentIds.add(id);
    const surfaceIds = cloneUniqueStringArray(entry.surfaceIds, `${name}.surfaceIds`);
    for (const surfaceId of surfaceIds) {
      if (ownedSurfaceIds.has(surfaceId)) {
        throw new RangeError(`KzRouteDefinitionV2 surface ${surfaceId} 被多个段落持有。`);
      }
      ownedSurfaceIds.add(surfaceId);
    }
    const pathAnchorIds = cloneUniqueStringArray(entry.pathAnchorIds, `${name}.pathAnchorIds`, 2);
    assertReferences(pathAnchorIds, anchorIds, `${name}.pathAnchorIds`);
    const entryAnchorId = assertNonEmptyString(entry.entryAnchorId, `${name}.entryAnchorId`);
    const exitAnchorId = assertNonEmptyString(entry.exitAnchorId, `${name}.exitAnchorId`);
    const respawnAnchorId = assertNonEmptyString(entry.respawnAnchorId, `${name}.respawnAnchorId`);
    assertReferences([entryAnchorId, exitAnchorId, respawnAnchorId], anchorIds, name);
    assertPathEndpoints(pathAnchorIds, entryAnchorId, exitAnchorId, `${name}.pathAnchorIds`);

    if (!Array.isArray(entry.responseOptions) || entry.responseOptions.length === 0) {
      throw new RangeError(`${name}.responseOptions 必须是非空数组。`);
    }
    const responseOptions = entry.responseOptions.map((option, optionIndex) => assertEnum<KzRouteResponseOption>(
      option,
      RESPONSE_OPTIONS,
      `${name}.responseOptions[${optionIndex}]`,
    ));
    if (new Set(responseOptions).size !== responseOptions.length) {
      throw new RangeError(`${name}.responseOptions 不能重复。`);
    }

    if (!Array.isArray(entry.branches)) throw new TypeError(`${name}.branches 必须是数组。`);
    const branches = entry.branches.map((branch, branchIndex) => {
      const branchName = `${name}.branches[${branchIndex}]`;
      assertExactKeys(branch, BRANCH_KEYS, branchName);
      const branchId = assertNonEmptyString(branch.id, `${branchName}.id`);
      if (branchIds.has(branchId)) throw new RangeError(`KzRouteDefinitionV2 包含重复 branch ${branchId}。`);
      branchIds.add(branchId);
      const branchSurfaceIds = cloneUniqueStringArray(branch.surfaceIds, `${branchName}.surfaceIds`);
      assertReferences(branchSurfaceIds, new Set(surfaceIds), `${branchName}.surfaceIds`);
      const branchPathAnchorIds = cloneUniqueStringArray(
        branch.pathAnchorIds,
        `${branchName}.pathAnchorIds`,
        2,
      );
      assertReferences(branchPathAnchorIds, anchorIds, `${branchName}.pathAnchorIds`);
      assertPathEndpoints(branchPathAnchorIds, entryAnchorId, exitAnchorId, `${branchName}.pathAnchorIds`);
      const recoveryAnchorId = assertNonEmptyString(
        branch.recoveryAnchorId,
        `${branchName}.recoveryAnchorId`,
      );
      assertReferences([recoveryAnchorId], anchorIds, branchName);
      return Object.freeze({
        id: branchId,
        role: assertEnum<KzRouteBranchRole>(branch.role, BRANCH_ROLES, `${branchName}.role`),
        surfaceIds: branchSurfaceIds,
        pathAnchorIds: branchPathAnchorIds,
        recoveryAnchorId,
        expectedTraversalTicks: assertIntegerAtLeast(
          branch.expectedTraversalTicks,
          1,
          `${branchName}.expectedTraversalTicks`,
        ),
        exposureWindowTicks: assertIntegerAtLeast(
          branch.exposureWindowTicks,
          1,
          `${branchName}.exposureWindowTicks`,
        ),
      });
    });
    const survivalRole = assertEnum<KzRouteSurvivalRole>(
      entry.survivalRole,
      SURVIVAL_ROLES,
      `${name}.survivalRole`,
    );
    if (survivalRole === KZ_ROUTE_SURVIVAL_ROLE.CHOICE) {
      const roles = new Set(branches.map(({ role }) => role));
      if (
        branches.length < 2
        || !roles.has(KZ_ROUTE_BRANCH_ROLE.FAST_EXPOSED)
        || !roles.has(KZ_ROUTE_BRANCH_ROLE.SAFE_RECOVERY)
      ) {
        throw new RangeError(`${name} 的 choice 段必须同时提供快线与恢复线。`);
      }
    } else if (branches.length > 0) {
      throw new RangeError(`${name} 只有 choice 段可以声明 branches。`);
    }

    return Object.freeze({
      id,
      kind: assertEnum<KzRouteSegmentKind>(entry.kind, SEGMENT_KINDS, `${name}.kind`),
      lessonId: assertNonEmptyString(entry.lessonId, `${name}.lessonId`),
      remixId: assertNonEmptyString(entry.remixId, `${name}.remixId`),
      surfaceIds,
      pathAnchorIds,
      entryAnchorId,
      exitAnchorId,
      respawnAnchorId,
      survivalRole,
      responseOptions: Object.freeze(responseOptions),
      responseWindowTicks: assertIntegerAtLeast(
        entry.responseWindowTicks,
        1,
        `${name}.responseWindowTicks`,
      ),
      hitRecovery: assertEnum<KzRouteHitRecovery>(
        entry.hitRecovery,
        HIT_RECOVERIES,
        `${name}.hitRecovery`,
      ),
      difficulty: cloneDifficulty(entry.difficulty, `${name}.difficulty`),
      branches: Object.freeze(branches),
    });
  });

  for (let index = 1; index < segments.length; index += 1) {
    if (segments[index - 1]!.exitAnchorId !== segments[index]!.entryAnchorId) {
      throw new RangeError(`KzRouteDefinitionV2.segments[${index}] 未连接前一段出口。`);
    }
  }

  const startAnchorIds = cloneUniqueStringArray(
    source.startAnchorIds,
    'KzRouteDefinitionV2.startAnchorIds',
    minimumParticipants,
  );
  if (startAnchorIds.length !== maximumParticipants) {
    throw new RangeError('KzRouteDefinitionV2.startAnchorIds 必须覆盖 maximumParticipants。');
  }
  assertReferences(startAnchorIds, anchorIds, 'KzRouteDefinitionV2.startAnchorIds');
  const firstSegment = segments[0]!;
  const firstSurfaceIds = new Set(firstSegment.surfaceIds);
  const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  if (startAnchorIds.some((id) => !firstSurfaceIds.has(anchorById.get(id)!.surfaceId))) {
    throw new RangeError('KzRouteDefinitionV2.startAnchorIds 必须位于首段 surface。');
  }
  const finishAnchorId = assertNonEmptyString(source.finishAnchorId, 'KzRouteDefinitionV2.finishAnchorId');
  assertReferences([finishAnchorId], anchorIds, 'KzRouteDefinitionV2.finishAnchorId');
  if (segments.at(-1)!.exitAnchorId !== finishAnchorId) {
    throw new RangeError('KzRouteDefinitionV2.finishAnchorId 必须是末段出口。');
  }

  if (!Array.isArray(source.supplyPoints) || source.supplyPoints.length === 0) {
    throw new RangeError('KzRouteDefinitionV2.supplyPoints 必须是非空数组。');
  }
  const equipmentSpawnPointIds = new Set<string>();
  const supplyAnchorIds = new Set<string>();
  const suppliedSegmentIds = new Set<string>();
  const supplies = source.supplyPoints.map((entry, index) => {
    const name = `KzRouteDefinitionV2.supplyPoints[${index}]`;
    assertExactKeys(entry, SUPPLY_KEYS, name);
    const equipmentSpawnPointId = assertNonEmptyString(
      entry.equipmentSpawnPointId,
      `${name}.equipmentSpawnPointId`,
    );
    const anchorId = assertNonEmptyString(entry.anchorId, `${name}.anchorId`);
    const segmentId = assertNonEmptyString(entry.segmentId, `${name}.segmentId`);
    if (equipmentSpawnPointIds.has(equipmentSpawnPointId)) {
      throw new RangeError(`KzRouteDefinitionV2 包含重复 equipment spawn ${equipmentSpawnPointId}。`);
    }
    if (supplyAnchorIds.has(anchorId)) {
      throw new RangeError(`KzRouteDefinitionV2 supply anchor ${anchorId} 被重复使用。`);
    }
    if (suppliedSegmentIds.has(segmentId)) {
      throw new RangeError(`KzRouteDefinitionV2 segment ${segmentId} 包含多个首批 supply。`);
    }
    assertReferences([anchorId], anchorIds, name);
    assertReferences([segmentId], segmentIds, name);
    const segment = segments.find(({ id }) => id === segmentId)!;
    if (!segment.surfaceIds.includes(anchorById.get(anchorId)!.surfaceId)) {
      throw new RangeError(`${name}.anchorId 不在 segment ${segmentId} 内。`);
    }
    equipmentSpawnPointIds.add(equipmentSpawnPointId);
    supplyAnchorIds.add(anchorId);
    suppliedSegmentIds.add(segmentId);
    return Object.freeze({ equipmentSpawnPointId, anchorId, segmentId });
  });
  if (suppliedSegmentIds.size !== segments.length) {
    throw new RangeError('KzRouteDefinitionV2 每个段落必须精确声明一个首批 supply。');
  }

  if (!Array.isArray(source.survivalLinks) || source.survivalLinks.length === 0) {
    throw new RangeError('KzRouteDefinitionV2.survivalLinks 必须是非空数组。');
  }
  const survivalLinkKeys = new Set<string>();
  const survivalLinks = source.survivalLinks.map((entry, index) => {
    const name = `KzRouteDefinitionV2.survivalLinks[${index}]`;
    assertExactKeys(entry, SURVIVAL_LINK_KEYS, name);
    const fromSegmentId = assertNonEmptyString(entry.fromSegmentId, `${name}.fromSegmentId`);
    const toSegmentId = assertNonEmptyString(entry.toSegmentId, `${name}.toSegmentId`);
    assertReferences([fromSegmentId, toSegmentId], segmentIds, name);
    if (fromSegmentId === toSegmentId) throw new RangeError(`${name} 不能自环。`);
    const key = `${fromSegmentId}\u0000${toSegmentId}`;
    if (survivalLinkKeys.has(key)) throw new RangeError(`${name} 重复。`);
    survivalLinkKeys.add(key);
    return Object.freeze({ fromSegmentId, toSegmentId });
  });
  assertStronglyConnected([...segmentIds], survivalLinks);

  const definition = Object.freeze({
    schemaVersion: KZ_ROUTE_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'KzRouteDefinitionV2.id'),
    mapDefinitionId: assertNonEmptyString(
      source.mapDefinitionId,
      'KzRouteDefinitionV2.mapDefinitionId',
    ),
    requiredInputs: requiredInputs as readonly KzRouteInput[],
    minimumParticipants,
    maximumParticipants,
    respawnDelayTicks: assertIntegerAtLeast(
      source.respawnDelayTicks,
      1,
      'KzRouteDefinitionV2.respawnDelayTicks',
    ),
    startAnchorIds,
    finishAnchorId,
    anchors: Object.freeze(anchors),
    segments: Object.freeze(segments),
    supplyPoints: Object.freeze(supplies),
    survivalLinks: Object.freeze(survivalLinks),
  });
  return definition;
}
