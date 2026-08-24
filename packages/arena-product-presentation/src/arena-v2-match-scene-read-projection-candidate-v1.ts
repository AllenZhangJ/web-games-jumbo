import {
  ARENA_MATCH_EVENT_V6,
  assertKnownKeys,
  cloneFrozenData,
  createArenaMatchEventV6,
  createArenaLocalJumpAvailabilityV1,
  createMatchReadFrameV3Audit,
  type ArenaMatchEventV6,
  type ArenaLocalJumpAvailabilityV1,
  type DeepReadonly,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  createProductPublicMatchInfoV2,
  type ProductModeRole,
  type ProductPublicMatchInfoV2,
} from '@number-strategy-jump/arena-product-contracts';
import {
  projectArenaWeaponFeedbackEventV6PresentationEvent,
  type ArenaV2WeaponFeedbackPresentationEvent,
} from '@number-strategy-jump/arena-presentation-runtime';

export interface ArenaV2MatchSceneParticipantReadV1 {
  readonly id: string;
  readonly characterDefinitionId: string;
  readonly appearanceKey: string;
  readonly displayName: string;
  readonly identityOrdinal: number;
  readonly identityGlyphKey: string;
  readonly identityPatternKey: string;
  readonly modeRole: ProductModeRole;
  readonly local: boolean;
  readonly status: string;
  readonly lives: number;
  readonly position: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  readonly velocity: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  readonly facing: Readonly<{ readonly x: number; readonly z: number }>;
  readonly grounded: boolean;
  readonly supportSurfaceId: string | null;
  readonly hitstunTicks: number;
  readonly invulnerableTicks: number;
  readonly respawnTicks: number;
  readonly action: DeepReadonly<MatchReadFrameV3['worldSnapshot']['participants'][number]['action']>;
  readonly movement: DeepReadonly<MatchReadFrameV3['worldSnapshot']['participants'][number]['movement']>;
  readonly equipment: Readonly<{
    readonly instanceId: string;
    readonly definitionId: string;
    readonly runtimeEquipmentDefinitionId: string;
    readonly collectionEquipmentDefinitionId: string;
    readonly survivalLevel: number | null;
    readonly cooldownRemainingTicks: number;
  }> | null;
}

export interface ArenaV2MatchSceneEquipmentReadV1 {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly survivalLevel: number | null;
  readonly locationState: string;
  readonly ownerId: string | null;
  readonly position: Readonly<{ readonly x: number; readonly y: number; readonly z: number }> | null;
  readonly cooldownRemainingTicks: number;
  readonly revision: number;
}

export type ArenaV2MatchScenePresentationEventV1 =
  | DeepReadonly<ArenaMatchEventV6>
  | ArenaV2WeaponFeedbackPresentationEvent;

export interface ArenaV2MatchSceneReadFrameCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly source: Readonly<{
    readonly matchSeed: number;
    readonly tick: number;
    readonly eventSequence: number;
    readonly modeDefinitionId: string;
    readonly mapDefinitionId: string;
  }>;
  readonly world: Readonly<{
    readonly phase: string;
    readonly remainingTicks: number;
    readonly map: DeepReadonly<MatchReadFrameV3['worldSnapshot']['map']>;
    readonly participants: readonly ArenaV2MatchSceneParticipantReadV1[];
    readonly equipment: readonly ArenaV2MatchSceneEquipmentReadV1[];
    readonly activeSupplyProjection: DeepReadonly<
      MatchReadFrameV3['worldSnapshot']['activeSupplyProjection']
    >;
    readonly modeProjection: DeepReadonly<MatchReadFrameV3['worldSnapshot']['modeProjection']>;
  }>;
  readonly localAction: DeepReadonly<MatchReadFrameV3['localActionSidecar']>;
  readonly localJumpAvailability: ArenaLocalJumpAvailabilityV1;
  readonly localParticipantId: string;
  readonly events: readonly ArenaV2MatchScenePresentationEventV1[];
  readonly result: DeepReadonly<ModeResultV3Payload> | null;
}

const INPUT_KEYS = new Set([
  'events', 'supplyCues', 'readFrame', 'readFrameAudit', 'publicMatchInfo',
  'localJumpAvailability',
]);

function validateIdentity(
  frame: DeepReadonly<MatchReadFrameV3>,
  info: DeepReadonly<ProductPublicMatchInfoV2>,
): void {
  const world = frame.worldSnapshot;
  if (
    world.modeDefinitionId !== info.modeDefinitionId
    || world.matchSeed !== info.matchSeed
    || frame.localActionSidecar.participantId !== info.localParticipantId
  ) throw new RangeError('Arena V2 scene read frame的Mode/seed/local身份不一致。');
  const worldIds = world.participants.map(({ id }) => id);
  const assignmentIds = info.participantAssignments.map(({ participantId }) => participantId);
  if (
    worldIds.length !== assignmentIds.length
    || worldIds.some((id, index) => id !== assignmentIds[index])
  ) throw new RangeError('Arena V2 scene read frame参与者集合与PublicInfo不一致。');
  const characterByParticipant = new Map(
    info.content.participantCharacters.map(({ participantId, definitionId }) => (
      [participantId, definitionId] as const
    )),
  );
  for (const participant of world.participants) {
    if (characterByParticipant.get(participant.id) !== participant.characterDefinitionId) {
      throw new RangeError(`Arena V2 scene participant ${participant.id}角色身份漂移。`);
    }
  }
}

function presentationEvents(
  values: unknown,
  frame: DeepReadonly<MatchReadFrameV3>,
): readonly ArenaV2MatchScenePresentationEventV1[] {
  if (!Array.isArray(values)) throw new TypeError('Arena V2 scene events必须是数组。');
  const events = Object.freeze(values.map(createArenaMatchEventV6));
  const firstSequence = frame.worldSnapshot.eventSequence - events.length;
  if (firstSequence < 0) throw new RangeError('Arena V2 scene event水位小于事件批次。');
  return Object.freeze(events.map((event, index) => {
    if (
      event.sequence !== firstSequence + index
      || event.tick >= frame.worldSnapshot.tick
    ) throw new RangeError('Arena V2 scene event与post-step Frame不闭合。');
    return event.type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED
      ? projectArenaWeaponFeedbackEventV6PresentationEvent(event)
      : event;
  }));
}

/**
 * Renderer-neutral scene model. It keeps authority positions, character and
 * equipment identities intact while attaching only public display identity
 * and authority-owned presentation cues. It never resolves a Three asset or
 * re-runs hit, pickup, fall, checkpoint or result rules.
 */
export function projectArenaV2MatchSceneReadFrameCandidateV1(
  value: unknown,
): ArenaV2MatchSceneReadFrameCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 match scene read projection input');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2 match scene read projection input');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 match scene read projection缺少${key}。`);
    }
  }
  const frame = createMatchReadFrameV3Audit(
    source.readFrame,
    source.readFrameAudit as MatchReadFrameV3AuditOptions,
  );
  const publicInfo = createProductPublicMatchInfoV2(source.publicMatchInfo);
  validateIdentity(frame, publicInfo);
  const localJumpAvailability = createArenaLocalJumpAvailabilityV1(
    source.localJumpAvailability,
  );
  if (
    localJumpAvailability.tick !== frame.worldSnapshot.tick
    || localJumpAvailability.eventSequence !== frame.worldSnapshot.eventSequence
    || localJumpAvailability.participantId !== publicInfo.localParticipantId
  ) throw new RangeError('Arena V2 scene jump availability与Frame/PublicInfo身份漂移。');
  const assignmentById = new Map(
    publicInfo.participantAssignments.map((assignment) => [assignment.participantId, assignment]),
  );
  const publicById = new Map(
    publicInfo.publicParticipants.map((participant) => [participant.participantId, participant]),
  );
  const participants = Object.freeze(frame.worldSnapshot.participants.map((participant) => {
    const assignment = assignmentById.get(participant.id);
    const publicIdentity = publicById.get(participant.id);
    if (assignment === undefined || publicIdentity === undefined) {
      throw new RangeError(`Arena V2 scene participant ${participant.id}缺少公开身份。`);
    }
    const equipment = participant.equipment === null
      ? null
      : Object.freeze({
        instanceId: participant.equipment.instanceId,
        definitionId: participant.equipment.collectionEquipmentDefinitionId,
        runtimeEquipmentDefinitionId: participant.equipment.runtimeEquipmentDefinitionId,
        collectionEquipmentDefinitionId: participant.equipment.collectionEquipmentDefinitionId,
        survivalLevel: participant.equipment.survivalLevel,
        cooldownRemainingTicks: participant.equipment.cooldownRemainingTicks,
      });
    return Object.freeze({
      id: participant.id,
      characterDefinitionId: participant.characterDefinitionId,
      appearanceKey: publicIdentity.appearanceKey,
      displayName: publicIdentity.displayName,
      identityOrdinal: publicIdentity.identityOrdinal,
      identityGlyphKey: publicIdentity.identityGlyphKey,
      identityPatternKey: publicIdentity.identityPatternKey,
      modeRole: assignment.modeRole,
      local: participant.id === publicInfo.localParticipantId,
      status: participant.status,
      lives: participant.lives,
      position: participant.position,
      velocity: participant.velocity,
      facing: participant.facing,
      grounded: participant.grounded,
      supportSurfaceId: participant.supportSurfaceId,
      hitstunTicks: participant.hitstunTicks,
      invulnerableTicks: participant.invulnerableTicks,
      respawnTicks: participant.respawnTicks,
      action: participant.action,
      movement: participant.movement,
      equipment,
    });
  }));
  const equipment = Object.freeze(frame.worldSnapshot.equipment.map((item) => Object.freeze({
    instanceId: item.instanceId,
    definitionId: item.collectionEquipmentDefinitionId,
    runtimeEquipmentDefinitionId: item.runtimeEquipmentDefinitionId,
    collectionEquipmentDefinitionId: item.collectionEquipmentDefinitionId,
    survivalLevel: item.survivalLevel,
    locationState: item.locationState,
    ownerId: item.ownerId,
    position: item.position,
    cooldownRemainingTicks: item.cooldownRemainingTicks,
    revision: item.revision,
  })));
  const world = frame.worldSnapshot;
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    source: Object.freeze({
      matchSeed: world.matchSeed,
      tick: world.tick,
      eventSequence: world.eventSequence,
      modeDefinitionId: world.modeDefinitionId,
      mapDefinitionId: world.map.definitionId,
    }),
    world: Object.freeze({
      phase: world.phase,
      remainingTicks: world.remainingTicks,
      map: world.map,
      participants,
      equipment,
      activeSupplyProjection: world.activeSupplyProjection,
      modeProjection: world.modeProjection,
    }),
    localAction: frame.localActionSidecar,
    localJumpAvailability,
    localParticipantId: publicInfo.localParticipantId,
    events: presentationEvents(source.events, frame),
    result: world.result,
  });
}

export const ARENA_V2_MATCH_SCENE_READ_PROJECTION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  rendererNeutral: true as const,
  preservesAuditedLocalActionSidecar: true as const,
  localJumpAvailabilityUsesStandaloneAuthorityCapability: true as const,
  requiresExplicitLocalJumpAvailabilityAtSceneProjection: true as const,
  expandsMatchReadFrameV3LocalActionSidecar: false as const,
  ownsRuleOrMatchAuthority: false as const,
  resolvesThreeAssets: false as const,
  programmaticAssetFallbackAllowed: false as const,
  validationStatus: 'not-run' as const,
});
