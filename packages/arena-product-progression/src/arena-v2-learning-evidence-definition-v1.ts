import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
  RACE_MODE_PREPARING_TICKS_V1,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2LearningProfileDefinitionV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  MODE_KIND,
  type ModeKind,
} from '@number-strategy-jump/arena-definitions';

export interface ArenaV2LearningWeaponActionEvidenceBindingV1 {
  readonly actionDefinitionId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly context: 'ground' | 'aerial';
  readonly modeKinds: readonly ModeKind[];
  readonly survivalLevel: number | null;
}

export interface ArenaV2LearningWeaponEvidenceBindingV1 {
  readonly weaponDefinitionId: string;
  readonly groundActionDefinitionIds: readonly string[];
  readonly aerialActionDefinitionIds: readonly string[];
  readonly actionBindings?: readonly ArenaV2LearningWeaponActionEvidenceBindingV1[];
}

export interface ArenaV2LearningSegmentEvidenceBindingV1 {
  readonly segmentDefinitionId: string;
  readonly progressOrdinal: number;
  readonly safeAnchorId?: string;
  readonly surfaceIds: readonly string[];
  readonly edgeSurfaceIds: readonly string[];
}

export interface ArenaV2LearningMapEvidenceBindingV1 {
  readonly mapDefinitionId: string;
  readonly raceStartAnchorIds?: readonly string[];
  readonly segments: readonly ArenaV2LearningSegmentEvidenceBindingV1[];
}

export interface ArenaV2LearningEvidenceDefinitionV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly racePreparingTicks?: typeof RACE_MODE_PREPARING_TICKS_V1;
  readonly weaponBindings: readonly ArenaV2LearningWeaponEvidenceBindingV1[];
  readonly mapBindings: readonly ArenaV2LearningMapEvidenceBindingV1[];
  readonly contentHash: string;
}

const LEGACY_CREATE_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'weaponBindings', 'mapBindings',
]);
const CREATE_KEYS = new Set([...LEGACY_CREATE_KEYS, 'racePreparingTicks']);
const LEGACY_VALUE_KEYS = new Set([...LEGACY_CREATE_KEYS, 'contentHash']);
const VALUE_KEYS = new Set([...CREATE_KEYS, 'contentHash']);
const LEGACY_WEAPON_KEYS = new Set([
  'weaponDefinitionId', 'groundActionDefinitionIds', 'aerialActionDefinitionIds',
]);
const WEAPON_KEYS = new Set([...LEGACY_WEAPON_KEYS, 'actionBindings']);
const WEAPON_ACTION_KEYS = new Set([
  'actionDefinitionId', 'runtimeEquipmentDefinitionId', 'context', 'modeKinds', 'survivalLevel',
]);
const WEAPON_ACTION_CONTEXTS = new Set<unknown>(['ground', 'aerial']);
const MODE_KINDS = new Set<unknown>(Object.values(MODE_KIND));
const LEGACY_MAP_KEYS = new Set(['mapDefinitionId', 'segments']);
const MAP_KEYS = new Set([...LEGACY_MAP_KEYS, 'raceStartAnchorIds']);
const LEGACY_SEGMENT_KEYS = new Set([
  'segmentDefinitionId', 'progressOrdinal', 'surfaceIds', 'edgeSurfaceIds',
]);
const SEGMENT_KEYS = new Set([
  ...LEGACY_SEGMENT_KEYS, 'safeAnchorId',
]);

function exact(value: unknown, keys: ReadonlySet<string>, name: string): asserts value is PlainRecord {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少${key}。`);
  }
}

function id(value: unknown, maximum: number, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximum) throw new RangeError(`${name}超出长度上限。`);
  return result;
}

function ids(value: unknown, maximum: number, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  const result = cloneFrozenStringSet(value, name);
  if (result.length > 512) throw new RangeError(`${name}超出数量上限。`);
  result.forEach((entry, index) => id(entry, maximum, `${name}[${index}]`));
  return result;
}

function orderedIds(value: unknown, maximum: number, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  if (value.length > 512) throw new RangeError(`${name}超出数量上限。`);
  const result = value.map((entry, index) => id(entry, maximum, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不能包含重复项。`);
  return Object.freeze(result);
}

function modeKinds(value: unknown, name: string): readonly ModeKind[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError(`${name}必须是非空模式数组。`);
  }
  const result = value.map((entry, index) => {
    if (!MODE_KINDS.has(entry)) throw new RangeError(`${name}[${index}]模式无效。`);
    return entry as ModeKind;
  });
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不能包含重复模式。`);
  return Object.freeze(Object.values(MODE_KIND).filter((kind) => result.includes(kind)));
}

function racePreparingTicks(value: unknown): typeof RACE_MODE_PREPARING_TICKS_V1 {
  const ticks = assertIntegerAtLeast(
    value,
    1,
    'ArenaV2LearningEvidenceDefinitionV1.racePreparingTicks',
  );
  if (ticks !== RACE_MODE_PREPARING_TICKS_V1) {
    throw new RangeError(
      `Learning Evidence Race准备期必须精确为${RACE_MODE_PREPARING_TICKS_V1} tick。`,
    );
  }
  return RACE_MODE_PREPARING_TICKS_V1;
}

export function createArenaV2LearningEvidenceDefinitionV1(
  profileDefinitionValue: unknown,
  value: unknown,
): ArenaV2LearningEvidenceDefinitionV1 {
  const profileDefinition = createArenaV2LearningProfileDefinitionV1(profileDefinitionValue);
  const source = cloneFrozenData(value, 'ArenaV2LearningEvidenceDefinitionV1');
  const includesHash = typeof source === 'object'
    && source !== null
    && Object.hasOwn(source, 'contentHash');
  const includesRacePreparingTicks = typeof source === 'object'
    && source !== null
    && Object.hasOwn(source, 'racePreparingTicks');
  exact(
    source,
    includesRacePreparingTicks
      ? (includesHash ? VALUE_KEYS : CREATE_KEYS)
      : (includesHash ? LEGACY_VALUE_KEYS : LEGACY_CREATE_KEYS),
    'ArenaV2LearningEvidenceDefinitionV1',
  );
  if (source.schemaVersion !== 1 || source.status !== 'production-unreachable' || source.hardGate !== false) {
    throw new RangeError('Learning Evidence Definition不得提前进入生产。');
  }
  if (!Array.isArray(source.weaponBindings)
    || source.weaponBindings.length !== profileDefinition.weaponDefinitionIds.length) {
    throw new RangeError('weaponBindings必须覆盖Profile全部武器。');
  }
  const weaponBindings = source.weaponBindings.map((candidate, index) => {
    const name = `weaponBindings[${index}]`;
    const includesActionBindings = typeof candidate === 'object'
      && candidate !== null
      && Object.hasOwn(candidate, 'actionBindings');
    exact(candidate, includesActionBindings ? WEAPON_KEYS : LEGACY_WEAPON_KEYS, name);
    const groundActionDefinitionIds = ids(
      candidate.groundActionDefinitionIds,
      profileDefinition.limits.maxIdentifierLength,
      `${name}.groundActionDefinitionIds`,
    );
    const aerialActionDefinitionIds = ids(
      candidate.aerialActionDefinitionIds,
      profileDefinition.limits.maxIdentifierLength,
      `${name}.aerialActionDefinitionIds`,
    );
    if (groundActionDefinitionIds.length === 0 || aerialActionDefinitionIds.length === 0) {
      throw new RangeError(`${name}必须同时绑定地面和空中动作。`);
    }
    const actionBindings = includesActionBindings
      ? (() => {
        if (!Array.isArray(candidate.actionBindings)) {
          throw new TypeError(`${name}.actionBindings必须是数组。`);
        }
        const bindings = candidate.actionBindings.map((actionValue, actionIndex) => {
          const actionName = `${name}.actionBindings[${actionIndex}]`;
          exact(actionValue, WEAPON_ACTION_KEYS, actionName);
          if (!WEAPON_ACTION_CONTEXTS.has(actionValue.context)) {
            throw new RangeError(`${actionName}.context无效。`);
          }
          const context = actionValue.context as 'ground' | 'aerial';
          const actionDefinitionId = id(
            actionValue.actionDefinitionId,
            profileDefinition.limits.maxIdentifierLength,
            `${actionName}.actionDefinitionId`,
          );
          const actionModeKinds = modeKinds(actionValue.modeKinds, `${actionName}.modeKinds`);
          const survivalLevel = actionValue.survivalLevel === null
            ? null
            : assertIntegerAtLeast(
              actionValue.survivalLevel,
              1,
              `${actionName}.survivalLevel`,
            );
          const survivalOnly = actionModeKinds.length === 1
            && actionModeKinds[0] === MODE_KIND.SURVIVAL;
          const duelAndRaceOnly = actionModeKinds.length === 2
            && actionModeKinds.includes(MODE_KIND.DUEL)
            && actionModeKinds.includes(MODE_KIND.RACE);
          if ((survivalLevel === null && !duelAndRaceOnly)
            || (survivalLevel !== null && !survivalOnly)) {
            throw new RangeError(
              `${actionName}普通动作只允许Duel/Race，强化动作只允许Survival。`,
            );
          }
          const expectedContextIds = context === 'ground'
            ? groundActionDefinitionIds
            : aerialActionDefinitionIds;
          if (!expectedContextIds.includes(actionDefinitionId)) {
            throw new RangeError(`${actionName}与地面/空中动作集合不一致。`);
          }
          return Object.freeze({
            actionDefinitionId,
            runtimeEquipmentDefinitionId: id(
              actionValue.runtimeEquipmentDefinitionId,
              profileDefinition.limits.maxIdentifierLength,
              `${actionName}.runtimeEquipmentDefinitionId`,
            ),
            context,
            modeKinds: actionModeKinds,
            survivalLevel,
          });
        }).sort((left, right) => (
          left.actionDefinitionId < right.actionDefinitionId
            ? -1
            : left.actionDefinitionId > right.actionDefinitionId ? 1 : 0
        ));
        const expectedActionIds = [
          ...groundActionDefinitionIds,
          ...aerialActionDefinitionIds,
        ].sort();
        if (bindings.length !== expectedActionIds.length
          || bindings.some((entry, actionIndex) => (
            entry.actionDefinitionId !== expectedActionIds[actionIndex]
          ))) {
          throw new RangeError(`${name}.actionBindings必须精确覆盖全部学习动作。`);
        }
        const runtimeGroups = new Map<string, Array<(typeof bindings)[number]>>();
        for (const binding of bindings) {
          const group = runtimeGroups.get(binding.runtimeEquipmentDefinitionId) ?? [];
          runtimeGroups.set(
            binding.runtimeEquipmentDefinitionId,
            [...group, binding],
          );
        }
        for (const [runtimeEquipmentDefinitionId, group] of runtimeGroups) {
          if (group.length !== 2
            || new Set(group.map(({ context: bindingContext }) => bindingContext)).size !== 2
            || group[0]!.survivalLevel !== group[1]!.survivalLevel
            || group[0]!.modeKinds.join('|') !== group[1]!.modeKinds.join('|')) {
            throw new RangeError(
              `${name}运行时武器${runtimeEquipmentDefinitionId}必须成对绑定地面/空中动作。`,
            );
          }
        }
        const baseGroups = [...runtimeGroups.entries()].filter(([, group]) => (
          group[0]!.survivalLevel === null
        ));
        if (baseGroups.length !== 1 || baseGroups[0]![0] !== candidate.weaponDefinitionId) {
          throw new RangeError(`${name}必须由收藏武器身份提供唯一Duel/Race动作对。`);
        }
        const survivalLevels = [...runtimeGroups.values()].flatMap((group) => (
          group[0]!.survivalLevel === null ? [] : [group[0]!.survivalLevel]
        )).sort((left, right) => left - right);
        if (survivalLevels.length === 0
          || survivalLevels.some((level, levelIndex) => level !== levelIndex + 1)) {
          throw new RangeError(`${name}的Survival运行时等级必须从1连续递增。`);
        }
        return Object.freeze(bindings);
      })()
      : null;
    return Object.freeze({
      weaponDefinitionId: id(candidate.weaponDefinitionId, profileDefinition.limits.maxIdentifierLength, `${name}.weaponDefinitionId`),
      groundActionDefinitionIds,
      aerialActionDefinitionIds,
      ...(actionBindings === null ? {} : { actionBindings }),
    });
  }).sort((left, right) => (
    left.weaponDefinitionId < right.weaponDefinitionId
      ? -1
      : left.weaponDefinitionId > right.weaponDefinitionId ? 1 : 0
  ));
  if (weaponBindings.some((entry, index) => (
    entry.weaponDefinitionId !== profileDefinition.weaponDefinitionIds[index]
  ))) throw new RangeError('weaponBindings与Profile武器集合不一致。');
  const actionBindingCount = weaponBindings.filter((entry) => (
    entry.actionBindings !== undefined
  )).length;
  if (actionBindingCount !== 0 && actionBindingCount !== weaponBindings.length) {
    throw new RangeError('weaponBindings必须全部提供运行时动作身份或全部使用旧格式。');
  }
  if (actionBindingCount !== 0) {
    const runtimeEquipmentDefinitionIds = weaponBindings.flatMap((entry) => (
      entry.actionBindings!
        .filter(({ context }) => context === 'ground')
        .map(({ runtimeEquipmentDefinitionId }) => runtimeEquipmentDefinitionId)
    ));
    if (new Set(runtimeEquipmentDefinitionIds).size !== runtimeEquipmentDefinitionIds.length) {
      throw new RangeError('学习运行时武器身份不能跨收藏武器重复。');
    }
  }
  const actionIds = weaponBindings.flatMap((entry) => [
    ...entry.groundActionDefinitionIds,
    ...entry.aerialActionDefinitionIds,
  ]);
  if (new Set(actionIds).size !== actionIds.length) throw new RangeError('学习动作绑定身份重复。');

  if (!Array.isArray(source.mapBindings)
    || source.mapBindings.length !== profileDefinition.mapDefinitions.length) {
    throw new RangeError('mapBindings必须覆盖Profile全部地图。');
  }
  const allSurfaceIds = new Set<string>();
  const mapBindings = source.mapBindings.map((candidate, mapIndex) => {
    const name = `mapBindings[${mapIndex}]`;
    const includesRaceStartAnchorIds = typeof candidate === 'object'
      && candidate !== null
      && Object.hasOwn(candidate, 'raceStartAnchorIds');
    exact(candidate, includesRaceStartAnchorIds ? MAP_KEYS : LEGACY_MAP_KEYS, name);
    const mapDefinitionId = id(candidate.mapDefinitionId, profileDefinition.limits.maxIdentifierLength, `${name}.mapDefinitionId`);
    const map = profileDefinition.mapDefinitions.find((entry) => entry.mapDefinitionId === mapDefinitionId);
    if (!map || !Array.isArray(candidate.segments)
      || candidate.segments.length !== map.segmentDefinitionIds.length) {
      throw new RangeError(`${name}与Profile地图段落不一致。`);
    }
    const segments = candidate.segments.map((segmentValue, segmentIndex) => {
      const segmentName = `${name}.segments[${segmentIndex}]`;
      const includesSafeAnchorId = typeof segmentValue === 'object'
        && segmentValue !== null
        && Object.hasOwn(segmentValue, 'safeAnchorId');
      exact(
        segmentValue,
        includesSafeAnchorId ? SEGMENT_KEYS : LEGACY_SEGMENT_KEYS,
        segmentName,
      );
      const segmentDefinitionId = id(
        segmentValue.segmentDefinitionId,
        profileDefinition.limits.maxIdentifierLength,
        `${segmentName}.segmentDefinitionId`,
      );
      if (!map.segmentDefinitionIds.includes(segmentDefinitionId)) {
        throw new RangeError(`${segmentName}引用未知地图段落。`);
      }
      const surfaceIds = ids(
        segmentValue.surfaceIds,
        profileDefinition.limits.maxIdentifierLength,
        `${segmentName}.surfaceIds`,
      );
      if (surfaceIds.length === 0) throw new RangeError(`${segmentName}缺少surface。`);
      for (const surfaceId of surfaceIds) {
        if (allSurfaceIds.has(surfaceId)) throw new RangeError('surface不能跨段落重复绑定。');
        allSurfaceIds.add(surfaceId);
      }
      const edgeSurfaceIds = ids(
        segmentValue.edgeSurfaceIds,
        profileDefinition.limits.maxIdentifierLength,
        `${segmentName}.edgeSurfaceIds`,
      );
      if (edgeSurfaceIds.some((surfaceId) => !surfaceIds.includes(surfaceId))) {
        throw new RangeError(`${segmentName}.edgeSurfaceIds必须属于本段surface。`);
      }
      return Object.freeze({
        segmentDefinitionId,
        progressOrdinal: assertIntegerAtLeast(segmentValue.progressOrdinal, 1, `${segmentName}.progressOrdinal`),
        ...(includesSafeAnchorId ? {
          safeAnchorId: id(
            segmentValue.safeAnchorId,
            profileDefinition.limits.maxIdentifierLength,
            `${segmentName}.safeAnchorId`,
          ),
        } : {}),
        surfaceIds,
        edgeSurfaceIds,
      });
    }).sort((left, right) => left.progressOrdinal - right.progressOrdinal);
    if (segments.some((entry, index) => entry.progressOrdinal !== index + 1)
      || segments.some((entry, index) => entry.segmentDefinitionId !== map.segmentDefinitionIds[index])) {
      throw new RangeError(`${name}.segments必须按Profile段落顺序使用连续progressOrdinal。`);
    }
    const safeAnchorIds = segments.flatMap(({ safeAnchorId }) => (
      safeAnchorId === undefined ? [] : [safeAnchorId]
    ));
    if (safeAnchorIds.length !== 0 && safeAnchorIds.length !== segments.length) {
      throw new RangeError(`${name}.segments必须全部提供safeAnchorId或全部使用旧格式。`);
    }
    if (new Set(safeAnchorIds).size !== safeAnchorIds.length) {
      throw new RangeError(`${name}.segments的safeAnchorId不能重复。`);
    }
    const raceStartAnchorIds = includesRaceStartAnchorIds
      ? orderedIds(
        candidate.raceStartAnchorIds,
        profileDefinition.limits.maxIdentifierLength,
        `${name}.raceStartAnchorIds`,
      )
      : null;
    if (raceStartAnchorIds !== null && (
      raceStartAnchorIds.length < 2
      || raceStartAnchorIds.length > 4
      || raceStartAnchorIds.some((anchorId) => safeAnchorIds.includes(anchorId))
    )) throw new RangeError(`${name}.raceStartAnchorIds必须包含2–4个独立起跑锚点。`);
    return Object.freeze({
      mapDefinitionId,
      ...(raceStartAnchorIds === null ? {} : { raceStartAnchorIds }),
      segments: Object.freeze(segments),
    });
  }).sort((left, right) => (
    left.mapDefinitionId < right.mapDefinitionId
      ? -1
      : left.mapDefinitionId > right.mapDefinitionId ? 1 : 0
  ));
  if (mapBindings.some((entry, index) => (
    entry.mapDefinitionId !== profileDefinition.mapDefinitions[index]?.mapDefinitionId
  ))) throw new RangeError('mapBindings与Profile地图集合不一致。');
  const racePreparingTicksValue = includesRacePreparingTicks
    ? racePreparingTicks(source.racePreparingTicks)
    : null;
  const authority = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    ...(racePreparingTicksValue === null ? {} : {
      racePreparingTicks: racePreparingTicksValue,
    }),
    weaponBindings: Object.freeze(weaponBindings),
    mapBindings: Object.freeze(mapBindings),
  });
  const result = Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(authority, 'ArenaV2LearningEvidenceDefinitionV1'),
  });
  if (includesHash && source.contentHash !== result.contentHash) {
    throw new RangeError('Learning Evidence Definition contentHash不一致。');
  }
  return result;
}
