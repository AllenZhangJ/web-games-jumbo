import {
  type DeepReadonly,
  type ArenaMatchReadProfile,
  type ArenaMapSnapshot,
  type ArenaMatchSnapshot,
  type ArenaPublicSupplyProjection,
  type WorldParticipantSnapshotV2,
  MATCH_READ_FRAME_V2_SCHEMA_VERSION,
  ARENA_MATCH_READ_PROFILE,
  type WorldSnapshotV2,
  type LocalActionSidecarV2,
  type BotMobilitySidecarV2,
  type FullAuditSidecarV2,
  type MatchReadFrameV2,
} from '@number-strategy-jump/arena-contracts';
import type {
  ActionAffordance,
  BotMobilityAffordance,
  LocalActionAffordance,
} from '@number-strategy-jump/arena-core';
import type { MatchReadIdentityMemo } from './match-read-port.js';

/**
 * The Core-only source for the V2 world read model. It is deliberately not a
 * public snapshot: MatchCore constructs it from its own subsystem snapshots,
 * then this module copies and freezes the public result.
 */
export type MatchReadWorldSource = Omit<
  ArenaMatchSnapshot,
  'schemaVersion' | 'participants' | 'activeSupplyProjection' | 'rngStates'
> & {
  readonly schemaVersion: number;
  readonly participants: readonly WorldParticipantSnapshotV2[];
  readonly activeSupplyProjection?: ArenaPublicSupplyProjection;
  readonly map: ArenaMapSnapshot;
};

export type MatchReadModelIdentity = Pick<
  MatchReadIdentityMemo,
  'compositionHash' | 'generation' | 'tick' | 'eventSequence' | 'phase'
>;

export interface MatchReadFrameReader {
  read(): DeepReadonly<MatchReadFrameV2>;
}

export interface MatchReadSidecarReader<T extends BotMobilitySidecarV2 | FullAuditSidecarV2> {
  read(): DeepReadonly<T>;
}

export type MatchReadModelBuildCandidate<T> =
  | {
    readonly result: DeepReadonly<T>;
    readonly publishWorld: true;
    readonly worldSnapshot: DeepReadonly<WorldSnapshotV2>;
  }
  | {
    readonly result: DeepReadonly<T>;
    readonly publishWorld: false;
    readonly worldSnapshot?: DeepReadonly<WorldSnapshotV2>;
  };

function freezePlainReadModel(
  value: unknown,
  active = new WeakSet<object>(),
): void {
  if (value === null || typeof value !== 'object') return;
  const object = value as object;
  const prototype = Object.getPrototypeOf(object);
  if (!Array.isArray(object) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('MatchRead V2 只能包含 plain object 或 array。');
  }
  if (active.has(object)) throw new TypeError('MatchRead V2 不能包含循环引用。');
  active.add(object);
  for (const key of Reflect.ownKeys(object)) {
    if (typeof key === 'symbol') throw new TypeError('MatchRead V2 不允许 Symbol 字段。');
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new TypeError('MatchRead V2 不允许 accessor 字段。');
    }
    freezePlainReadModel(descriptor.value, active);
  }
  Object.freeze(object);
  active.delete(object);
}

function assertIdentityValue(
  source: { readonly tick: number; readonly eventSequence: number; readonly phase?: string },
  identity: MatchReadModelIdentity,
  name: string,
): void {
  if (source.tick !== identity.tick || source.eventSequence !== identity.eventSequence) {
    throw new RangeError(`${name} 与 MatchRead authority identity 不一致。`);
  }
  if (source.phase !== undefined && source.phase !== identity.phase) {
    throw new RangeError(`${name} phase 与 MatchRead authority identity 不一致。`);
  }
}

function projectOutcome(outcome: {
  readonly kind: LocalActionAffordance['channels']['primary']['kind'];
  readonly actionDefinitionId: string | null;
  readonly lane: string | null;
  readonly source: string | null;
  readonly reason: string;
} | undefined) {
  if (outcome === undefined) throw new TypeError('MatchRead action outcome 缺失。');
  return Object.freeze({
    kind: outcome.kind,
    actionDefinitionId: outcome.actionDefinitionId,
    lane: outcome.lane,
    source: outcome.source,
    reason: outcome.reason,
  });
}

function assertProfileIdentity(
  result: { readonly tick: number; readonly participantId: string },
  identity: MatchReadModelIdentity,
  participantId: string,
  profile: ArenaMatchReadProfile,
): void {
  if (result.tick !== identity.tick) {
    throw new RangeError(`MatchRead ${profile} profile tick 与 authority identity 不一致。`);
  }
  if (result.participantId !== participantId) {
    throw new RangeError(`MatchRead ${profile} participantId 与 reader 不一致。`);
  }
}

function stripPrivateMapPlan(source: ArenaMapSnapshot): ArenaMapSnapshot {
  return {
    schemaVersion: source.schemaVersion,
    definitionId: source.definitionId,
    nextActiveTick: source.nextActiveTick,
    revision: source.revision,
    surfaces: source.surfaces.map((surface) => ({ ...surface })),
    occurrences: source.occurrences.map((occurrence) => {
      const {
        privatePlan: _privatePlan,
        ...publicOccurrence
      } = occurrence;
      return publicOccurrence;
    }),
  };
}

export function composeWorldSnapshotV2(
  source: MatchReadWorldSource,
  identity: MatchReadModelIdentity,
  { requireActiveSupplyProjection = false } = {},
): DeepReadonly<WorldSnapshotV2> {
  assertIdentityValue(source, identity, 'WorldSnapshotV2');
  if (
    requireActiveSupplyProjection
    && (source.activeSupplyProjection === undefined || source.activeSupplyProjection === null)
  ) {
    throw new Error('正式生存 read world 缺少 activeSupplyProjection。');
  }
  const world = {
    authoritySchemaVersion: source.schemaVersion,
    physicsBackendVersion: source.physicsBackendVersion,
    configHash: source.configHash,
    ruleContentHash: source.ruleContentHash,
    matchSeed: source.matchSeed,
    tick: source.tick,
    activeTick: source.activeTick,
    phase: source.phase,
    remainingTicks: source.remainingTicks,
    eventSequence: source.eventSequence,
    participants: source.participants,
    equipment: source.equipment,
    activeSupplyProjection: source.activeSupplyProjection ?? null,
    map: stripPrivateMapPlan(source.map),
    result: source.result,
  };
  freezePlainReadModel(world);
  return world as DeepReadonly<WorldSnapshotV2>;
}

export function composeLocalActionSidecarV2(
  result: LocalActionAffordance,
  identity: MatchReadModelIdentity,
  participantId: string,
): DeepReadonly<LocalActionSidecarV2> {
  assertProfileIdentity(
    result,
    identity,
    participantId,
    ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
  );
  const sidecar = {
    schemaVersion: MATCH_READ_FRAME_V2_SCHEMA_VERSION,
    tick: identity.tick,
    eventSequence: identity.eventSequence,
    participantId,
    profile: ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
    primaryActionDefinitionId: result.primaryActionDefinitionId,
    channels: {
      primary: projectOutcome(result.channels.primary),
      primaryHold: projectOutcome(result.channels.primaryHold),
    },
  };
  freezePlainReadModel(sidecar);
  return sidecar as DeepReadonly<LocalActionSidecarV2>;
}

export function composeBotMobilitySidecarV2(
  result: BotMobilityAffordance,
  identity: MatchReadModelIdentity,
  participantId: string,
): DeepReadonly<BotMobilitySidecarV2> {
  assertProfileIdentity(
    result,
    identity,
    participantId,
    ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
  );
  const sidecar = {
    schemaVersion: MATCH_READ_FRAME_V2_SCHEMA_VERSION,
    tick: identity.tick,
    eventSequence: identity.eventSequence,
    participantId,
    profile: ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
    channels: {
      jump: projectOutcome(result.channels.jump),
      slam: projectOutcome(result.channels.slam),
    },
  };
  freezePlainReadModel(sidecar);
  return sidecar as DeepReadonly<BotMobilitySidecarV2>;
}

export function composeFullAuditSidecarV2(
  result: ActionAffordance,
  identity: MatchReadModelIdentity,
  participantId: string,
): DeepReadonly<FullAuditSidecarV2> {
  assertProfileIdentity(
    result,
    identity,
    participantId,
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
  );
  const sidecar = {
    schemaVersion: MATCH_READ_FRAME_V2_SCHEMA_VERSION,
    tick: identity.tick,
    eventSequence: identity.eventSequence,
    participantId,
    profile: ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
    primaryActionDefinitionId: result.primaryActionDefinitionId,
    channels: {
      primary: projectOutcome(result.channels.primary),
      primaryHold: projectOutcome(result.channels.primaryHold),
      jump: projectOutcome(result.channels.jump),
      slam: projectOutcome(result.channels.slam),
    },
  };
  freezePlainReadModel(sidecar);
  return sidecar as DeepReadonly<FullAuditSidecarV2>;
}

export function composeMatchReadFrameV2(
  worldSnapshot: DeepReadonly<WorldSnapshotV2>,
  localActionSidecar: DeepReadonly<LocalActionSidecarV2>,
  identity: MatchReadModelIdentity,
): DeepReadonly<MatchReadFrameV2> {
  assertIdentityValue(worldSnapshot, identity, 'MatchReadFrameV2.worldSnapshot');
  assertIdentityValue(localActionSidecar, identity, 'MatchReadFrameV2.localActionSidecar');
  return Object.freeze({
    schemaVersion: MATCH_READ_FRAME_V2_SCHEMA_VERSION,
    worldSnapshot,
    localActionSidecar,
  }) as DeepReadonly<MatchReadFrameV2>;
}
