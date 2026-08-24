import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
  type ArenaMatchModeKindV6,
} from './match-config-v6.js';

export const MATCH_MODE_TIMELINE_POLICY_RESOLVER_V1_SCHEMA_VERSION = 1 as const;

export interface MatchModeTimelinePolicyViewV1 {
  readonly definitionId: string;
  readonly preparingTicks: number;
  readonly hardLimitActiveTicks: number;
  readonly suddenDeathStartActiveTick: number | null;
}

export interface MatchModeTimelinePolicyResolverDefinitionBundleV1 {
  readonly schemaVersion: typeof MATCH_MODE_TIMELINE_POLICY_RESOLVER_V1_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly modeKind: ArenaMatchModeKindV6;
  readonly matchPolicyContentHash: string;
  readonly contentHash: string;
  readonly timeline: MatchModeTimelinePolicyViewV1;
}

export interface MatchModeTimelineRuntimeMirrorV1 {
  readonly preparingTicks: number;
  readonly hardLimitActiveTicks: number;
  readonly suddenDeathStartActiveTick: number | null;
}

export interface DuelModeTimelineObservationV1 {
  readonly totalTick: number;
  readonly activeTick: number;
  readonly phase: 'preparing' | 'running' | 'sudden-death';
  readonly preparationRemainingTicks: number | null;
}

const BUNDLE_KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'modeKind', 'matchPolicyContentHash', 'contentHash',
  'timeline',
]);
const TIMELINE_KEYS = new Set([
  'definitionId', 'preparingTicks', 'hardLimitActiveTicks', 'suddenDeathStartActiveTick',
]);
const MIRROR_KEYS = new Set([
  'preparingTicks', 'hardLimitActiveTicks', 'suddenDeathStartActiveTick',
]);
const DUEL_OBSERVATION_KEYS = new Set([
  'totalTick', 'activeTick', 'phase', 'preparationRemainingTicks',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);
const DUEL_PHASES: ReadonlySet<unknown> = new Set(['preparing', 'running', 'sudden-death']);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function modeKind(value: unknown, name: string): ArenaMatchModeKindV6 {
  if (!MODE_KINDS.has(value)) throw new RangeError(`${name} 不受支持。`);
  return value as ArenaMatchModeKindV6;
}

function dataHash(value: unknown, name: string): string {
  const hash = assertNonEmptyString(value, name);
  if (!/^[0-9a-f]+$/u.test(hash)) throw new RangeError(`${name} 必须是小写十六进制数据 hash。`);
  return hash;
}

function nullableTick(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function cloneTimeline(
  value: unknown,
  expectedModeKind: ArenaMatchModeKindV6,
): MatchModeTimelinePolicyViewV1 {
  exactRecord(value, TIMELINE_KEYS, 'ModeTimelinePolicyResolver timeline');
  const preparingTicks = assertIntegerAtLeast(
    value.preparingTicks,
    0,
    'ModeTimelinePolicyResolver timeline.preparingTicks',
  );
  const hardLimitActiveTicks = assertIntegerAtLeast(
    value.hardLimitActiveTicks,
    1,
    'ModeTimelinePolicyResolver timeline.hardLimitActiveTicks',
  );
  if (hardLimitActiveTicks <= preparingTicks) {
    throw new RangeError('Timeline Policy hard limit必须大于preparingTicks。');
  }
  const suddenDeathStartActiveTick = nullableTick(
    value.suddenDeathStartActiveTick,
    'ModeTimelinePolicyResolver timeline.suddenDeathStartActiveTick',
  );
  if (expectedModeKind === 'duel') {
    if (suddenDeathStartActiveTick === null
      || suddenDeathStartActiveTick >= hardLimitActiveTicks) {
      throw new RangeError('Duel Timeline Policy必须声明早于hard limit的sudden death tick。');
    }
  } else if (suddenDeathStartActiveTick !== null) {
    throw new RangeError('Race/Survival Timeline Policy不能声明sudden death。');
  }
  return Object.freeze({
    definitionId: assertNonEmptyString(
      value.definitionId,
      'ModeTimelinePolicyResolver timeline.definitionId',
    ),
    preparingTicks,
    hardLimitActiveTicks,
    suddenDeathStartActiveTick,
  });
}

function cloneBundle(value: unknown): MatchModeTimelinePolicyResolverDefinitionBundleV1 {
  const source = cloneFrozenData(value, 'ModeTimelinePolicyResolver definition bundle');
  exactRecord(source, BUNDLE_KEYS, 'ModeTimelinePolicyResolver definition bundle');
  if (source.schemaVersion !== MATCH_MODE_TIMELINE_POLICY_RESOLVER_V1_SCHEMA_VERSION) {
    throw new RangeError(
      `ModeTimelinePolicyResolver schemaVersion 必须是 ${MATCH_MODE_TIMELINE_POLICY_RESOLVER_V1_SCHEMA_VERSION}。`,
    );
  }
  const normalizedModeKind = modeKind(
    source.modeKind,
    'ModeTimelinePolicyResolver definition bundle.modeKind',
  );
  return Object.freeze({
    schemaVersion: MATCH_MODE_TIMELINE_POLICY_RESOLVER_V1_SCHEMA_VERSION,
    modeDefinitionId: assertNonEmptyString(
      source.modeDefinitionId,
      'ModeTimelinePolicyResolver definition bundle.modeDefinitionId',
    ),
    modeKind: normalizedModeKind,
    matchPolicyContentHash: dataHash(
      source.matchPolicyContentHash,
      'ModeTimelinePolicyResolver definition bundle.matchPolicyContentHash',
    ),
    contentHash: dataHash(
      source.contentHash,
      'ModeTimelinePolicyResolver definition bundle.contentHash',
    ),
    timeline: cloneTimeline(source.timeline, normalizedModeKind),
  });
}

export class ModeTimelinePolicyResolverV1 {
  readonly #config: ArenaMatchConfigV6;
  readonly #bundle: MatchModeTimelinePolicyResolverDefinitionBundleV1;

  constructor(config: unknown, definitionBundle: unknown) {
    this.#config = createArenaMatchConfigV6(config);
    this.#bundle = cloneBundle(definitionBundle);
    if (this.#bundle.modeDefinitionId !== this.#config.modeDefinitionId
      || this.#bundle.modeKind !== this.#config.modeKind
      || this.#bundle.matchPolicyContentHash !== this.#config.modePolicyContentHash) {
      throw new RangeError(
        'ModeTimelinePolicyResolver 的 Mode/Policy identity 与 MatchConfig V6 不一致。',
      );
    }
  }

  get definitionBundle(): MatchModeTimelinePolicyResolverDefinitionBundleV1 {
    return this.#bundle;
  }

  get timeline(): MatchModeTimelinePolicyViewV1 {
    return this.#bundle.timeline;
  }

  assertRuntimeMirror(value: unknown): MatchModeTimelineRuntimeMirrorV1 {
    const source = cloneFrozenData(value, 'ModeTimelinePolicyResolver runtime mirror');
    exactRecord(source, MIRROR_KEYS, 'ModeTimelinePolicyResolver runtime mirror');
    const mirror = Object.freeze({
      preparingTicks: assertIntegerAtLeast(
        source.preparingTicks,
        0,
        'ModeTimelinePolicyResolver runtime mirror.preparingTicks',
      ),
      hardLimitActiveTicks: assertIntegerAtLeast(
        source.hardLimitActiveTicks,
        1,
        'ModeTimelinePolicyResolver runtime mirror.hardLimitActiveTicks',
      ),
      suddenDeathStartActiveTick: nullableTick(
        source.suddenDeathStartActiveTick,
        'ModeTimelinePolicyResolver runtime mirror.suddenDeathStartActiveTick',
      ),
    });
    const timeline = this.#bundle.timeline;
    if (mirror.preparingTicks !== timeline.preparingTicks
      || mirror.hardLimitActiveTicks !== timeline.hardLimitActiveTicks
      || mirror.suddenDeathStartActiveTick !== timeline.suddenDeathStartActiveTick) {
      throw new RangeError('Mode Timeline runtime镜像与resolved Timeline Policy不一致。');
    }
    return mirror;
  }

  assertDuelObservation(
    value: unknown,
    terminalResultPresent: boolean,
  ): DuelModeTimelineObservationV1 {
    if (this.#bundle.modeKind !== 'duel') {
      throw new Error('只有Duel Timeline Policy可校验Duel phase observation。');
    }
    if (typeof terminalResultPresent !== 'boolean') {
      throw new TypeError('Duel Timeline terminalResultPresent必须是布尔值。');
    }
    const source = cloneFrozenData(value, 'Duel Timeline observation');
    exactRecord(source, DUEL_OBSERVATION_KEYS, 'Duel Timeline observation');
    const totalTick = assertIntegerAtLeast(source.totalTick, 0, 'Duel Timeline totalTick');
    const activeTick = assertIntegerAtLeast(source.activeTick, 0, 'Duel Timeline activeTick');
    if (!DUEL_PHASES.has(source.phase)) throw new RangeError('Duel Timeline phase不受支持。');
    const phase = source.phase as DuelModeTimelineObservationV1['phase'];
    const preparationRemainingTicks = nullableTick(
      source.preparationRemainingTicks,
      'Duel Timeline preparationRemainingTicks',
    );
    const timeline = this.#bundle.timeline;
    const suddenDeathStartActiveTick = timeline.suddenDeathStartActiveTick;
    if (suddenDeathStartActiveTick === null) {
      throw new Error('Duel Timeline Policy内部缺少sudden death tick。');
    }
    const preparing = totalTick < timeline.preparingTicks;
    const expectedActiveTick = Math.max(0, totalTick - timeline.preparingTicks);
    const terminalBeforeActiveAdvance = terminalResultPresent
      && expectedActiveTick > 0
      && activeTick < timeline.hardLimitActiveTicks
      && activeTick === expectedActiveTick - 1;
    const terminalAtHardLimit = terminalResultPresent
      && activeTick === expectedActiveTick
      && activeTick === timeline.hardLimitActiveTicks;
    const expectedPhase = preparing
      ? 'preparing'
      : activeTick >= suddenDeathStartActiveTick
        ? 'sudden-death'
        : 'running';
    const expectedPreparationRemainingTicks = preparing
      ? timeline.preparingTicks - totalTick
      : null;
    const activeTickMatches = terminalResultPresent
      ? terminalBeforeActiveAdvance || terminalAtHardLimit
      : activeTick === expectedActiveTick;
    if (!activeTickMatches
      || phase !== expectedPhase
      || preparationRemainingTicks !== expectedPreparationRemainingTicks) {
      throw new RangeError('Duel Timeline observation与resolved Timeline Policy不一致。');
    }
    if (terminalResultPresent && totalTick <= timeline.preparingTicks) {
      throw new RangeError('Duel首个active step前不能产生终局结果。');
    }
    if (activeTick > timeline.hardLimitActiveTicks
      || (!terminalResultPresent && activeTick >= timeline.hardLimitActiveTicks)) {
      throw new RangeError('Duel Timeline hard limit终局边界漂移。');
    }
    return Object.freeze({
      totalTick,
      activeTick,
      phase,
      preparationRemainingTicks,
    });
  }
}
