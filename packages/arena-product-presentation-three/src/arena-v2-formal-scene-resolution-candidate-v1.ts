import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  isArenaV2FormalModelLoadPermittedCandidateV1,
  type ArenaV2MatchSceneReadFrameCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';

export interface ArenaV2FormalSceneCharacterResolutionCandidateV1 {
  readonly participantId: string;
  readonly characterDefinitionId: string;
  readonly presentationDefinitionId: string | null;
  readonly presentationDefinitionHash: string | null;
  readonly modelAssetId: string | null;
  readonly equipmentDefinitionId: string | null;
  readonly attachmentAssetId: string | null;
}

export interface ArenaV2FormalSceneEquipmentResolutionCandidateV1 {
  readonly instanceId: string;
  readonly equipmentDefinitionId: string;
  readonly attachmentAssetId: string | null;
}

export interface ArenaV2FormalSceneResolutionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly source: Readonly<{
    readonly matchSeed: number;
    readonly tick: number;
    readonly modeDefinitionId: string;
    readonly mapDefinitionId: string;
  }>;
  readonly readiness: Readonly<{
    readonly frameReady: boolean;
    readonly catalogReady: boolean;
    readonly productionReady: boolean;
    readonly missingCharacterDefinitionIds: readonly string[];
    readonly missingEquipmentDefinitionIds: readonly string[];
    readonly missingMapDefinitionIds: readonly string[];
    readonly unapprovedCharacterAssetIds: readonly string[];
    readonly unapprovedEquipmentAssetIds: readonly string[];
    readonly unapprovedMapAssetIds: readonly string[];
    readonly catalogCoverage: typeof ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.coverage;
  }>;
  readonly characters: readonly ArenaV2FormalSceneCharacterResolutionCandidateV1[];
  readonly worldEquipment: readonly ArenaV2FormalSceneEquipmentResolutionCandidateV1[];
  readonly mapAssetId: string | null;
  readonly programmaticFallbackUsed: false;
}

const FRAME_KEYS = new Set([
  'schemaVersion', 'status', 'source', 'world', 'localAction',
  'localParticipantId', 'events', 'result',
]);
const SOURCE_KEYS = new Set(['matchSeed', 'tick', 'eventSequence', 'modeDefinitionId', 'mapDefinitionId']);
const WORLD_KEYS = new Set([
  'phase', 'remainingTicks', 'map', 'participants', 'equipment',
  'activeSupplyProjection', 'modeProjection',
]);
const PARTICIPANT_KEYS = new Set([
  'id', 'characterDefinitionId', 'appearanceKey', 'displayName', 'identityOrdinal',
  'identityGlyphKey', 'identityPatternKey', 'modeRole', 'local', 'status', 'lives',
  'position', 'velocity', 'facing', 'grounded', 'supportSurfaceId', 'hitstunTicks',
  'invulnerableTicks', 'respawnTicks', 'action', 'movement', 'equipment',
]);
const PARTICIPANT_EQUIPMENT_KEYS = new Set([
  'instanceId', 'definitionId', 'runtimeEquipmentDefinitionId',
  'collectionEquipmentDefinitionId', 'survivalLevel', 'cooldownRemainingTicks',
]);
const WORLD_EQUIPMENT_KEYS = new Set([
  'instanceId', 'definitionId', 'runtimeEquipmentDefinitionId',
  'collectionEquipmentDefinitionId', 'survivalLevel', 'locationState', 'ownerId',
  'position', 'cooldownRemainingTicks', 'revision',
]);

function integerAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的安全整数。`);
  }
  return value as number;
}

function dataArray(value: unknown, name: string): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new TypeError(`${name}[${index}]必须是对象。`);
    }
    return item as Record<string, unknown>;
  });
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function requireFrame(value: unknown): ArenaV2MatchSceneReadFrameCandidateV1 {
  const frame = cloneFrozenData(value, 'Arena V2 formal scene resolution frame');
  assertKnownKeys(frame, FRAME_KEYS, 'Arena V2 formal scene resolution frame');
  if (frame.schemaVersion !== 1 || frame.status !== 'production-unreachable') {
    throw new RangeError('Arena V2 formal scene resolution只接受V1候选Scene Read Frame。');
  }
  assertKnownKeys(frame.source, SOURCE_KEYS, 'Arena V2 formal scene resolution frame.source');
  assertKnownKeys(frame.world, WORLD_KEYS, 'Arena V2 formal scene resolution frame.world');
  integerAtLeast(frame.source.matchSeed, 0, 'Arena V2 formal scene matchSeed');
  integerAtLeast(frame.source.tick, 0, 'Arena V2 formal scene tick');
  integerAtLeast(frame.source.eventSequence, 0, 'Arena V2 formal scene eventSequence');
  assertNonEmptyString(frame.source.modeDefinitionId, 'Arena V2 formal scene modeDefinitionId');
  assertNonEmptyString(frame.source.mapDefinitionId, 'Arena V2 formal scene mapDefinitionId');
  assertNonEmptyString(frame.localParticipantId, 'Arena V2 formal scene localParticipantId');
  const participants = dataArray(frame.world.participants, 'Arena V2 formal scene participants');
  if (participants.length === 0) throw new RangeError('Arena V2 formal scene participants不能为空。');
  for (const [index, participant] of participants.entries()) {
    const name = `Arena V2 formal scene participants[${index}]`;
    assertKnownKeys(participant, PARTICIPANT_KEYS, name);
    assertNonEmptyString(participant.id, `${name}.id`);
    assertNonEmptyString(participant.characterDefinitionId, `${name}.characterDefinitionId`);
    if (participant.equipment !== null) {
      assertKnownKeys(participant.equipment, PARTICIPANT_EQUIPMENT_KEYS, `${name}.equipment`);
      assertNonEmptyString(
        participant.equipment.collectionEquipmentDefinitionId,
        `${name}.equipment.collectionEquipmentDefinitionId`,
      );
    }
  }
  for (const [index, equipment] of dataArray(
    frame.world.equipment,
    'Arena V2 formal scene equipment',
  ).entries()) {
    const name = `Arena V2 formal scene equipment[${index}]`;
    assertKnownKeys(equipment, WORLD_EQUIPMENT_KEYS, name);
    assertNonEmptyString(equipment.instanceId, `${name}.instanceId`);
    assertNonEmptyString(
      equipment.collectionEquipmentDefinitionId,
      `${name}.collectionEquipmentDefinitionId`,
    );
  }
  return frame as unknown as ArenaV2MatchSceneReadFrameCandidateV1;
}

/**
 * Resolves only registry-backed formal-intake or explicitly tagged authored
 * candidates. Missing or unapproved content stays explicit and blocks
 * production; no runtime box, primitive mesh or old greybox asset is
 * substituted for a missing character, weapon or map.
 */
export function resolveArenaV2FormalSceneFrameCandidateV1(
  value: unknown,
): ArenaV2FormalSceneResolutionCandidateV1 {
  const frame = requireFrame(value);
  const catalog = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1;
  const equipmentAssetByDefinitionId: ReadonlyMap<string, string> = new Map(
    catalog.equipmentAssetBindings.map((binding) => (
      [binding.equipmentDefinitionId, binding.attachmentAssetId] as const
    )),
  );
  const mapAssetByDefinitionId: ReadonlyMap<string, string> = new Map(
    catalog.mapAssetBindings.map((binding) => (
      [binding.mapDefinitionId, binding.mapVisualAssetId] as const
    )),
  );
  const missingCharacterDefinitionIds = new Set<string>();
  const missingEquipmentDefinitionIds = new Set<string>();
  const unapprovedCharacterAssetIds = new Set<string>();
  const unapprovedEquipmentAssetIds = new Set<string>();
  const characters = Object.freeze(frame.world.participants.map((participant) => {
    let presentationDefinitionId: string | null = null;
    let presentationDefinitionHash: string | null = null;
    let modelAssetId: string | null = null;
    try {
      const presentation = catalog.characterPresentationRegistry
        .requireDefaultForCharacter(participant.characterDefinitionId);
      presentationDefinitionId = presentation.id;
      presentationDefinitionHash = presentation.getContentHash();
      modelAssetId = catalog.visualAssetRegistry.require(presentation.modelAssetId).id;
      if (!isArenaV2FormalModelLoadPermittedCandidateV1(modelAssetId)) {
        unapprovedCharacterAssetIds.add(modelAssetId);
      }
    } catch {
      missingCharacterDefinitionIds.add(participant.characterDefinitionId);
    }
    const equipmentDefinitionId = participant.equipment?.collectionEquipmentDefinitionId ?? null;
    const attachmentAssetId = equipmentDefinitionId === null
      ? null
      : equipmentAssetByDefinitionId.get(equipmentDefinitionId) ?? null;
    if (equipmentDefinitionId !== null && attachmentAssetId === null) {
      missingEquipmentDefinitionIds.add(equipmentDefinitionId);
    }
    if (
      attachmentAssetId !== null
      && !isArenaV2FormalModelLoadPermittedCandidateV1(attachmentAssetId)
    ) unapprovedEquipmentAssetIds.add(attachmentAssetId);
    return Object.freeze({
      participantId: participant.id,
      characterDefinitionId: participant.characterDefinitionId,
      presentationDefinitionId,
      presentationDefinitionHash,
      modelAssetId,
      equipmentDefinitionId,
      attachmentAssetId,
    });
  }));
  const worldEquipment = Object.freeze(frame.world.equipment.map((equipment) => {
    const equipmentDefinitionId = equipment.collectionEquipmentDefinitionId;
    const attachmentAssetId = equipmentAssetByDefinitionId.get(equipmentDefinitionId) ?? null;
    if (attachmentAssetId === null) missingEquipmentDefinitionIds.add(equipmentDefinitionId);
    if (
      attachmentAssetId !== null
      && !isArenaV2FormalModelLoadPermittedCandidateV1(attachmentAssetId)
    ) unapprovedEquipmentAssetIds.add(attachmentAssetId);
    return Object.freeze({
      instanceId: equipment.instanceId,
      equipmentDefinitionId,
      attachmentAssetId,
    });
  }));
  const mapAssetId = mapAssetByDefinitionId.get(frame.source.mapDefinitionId) ?? null;
  const missingMapDefinitionIds = mapAssetId === null
    ? uniqueSorted([frame.source.mapDefinitionId])
    : Object.freeze([]);
  const missingCharacters = uniqueSorted(missingCharacterDefinitionIds);
  const missingEquipment = uniqueSorted(missingEquipmentDefinitionIds);
  const unapprovedCharacters = uniqueSorted(unapprovedCharacterAssetIds);
  const unapprovedEquipment = uniqueSorted(unapprovedEquipmentAssetIds);
  const unapprovedMapAssetIds = mapAssetId !== null
    && !isArenaV2FormalModelLoadPermittedCandidateV1(mapAssetId)
      ? uniqueSorted([mapAssetId])
      : Object.freeze([]);
  const frameReady = missingCharacters.length === 0
    && missingEquipment.length === 0
    && missingMapDefinitionIds.length === 0;
  // Scene resolution owns only formal visual identity. Audio has an independent
  // authority-action resolver and is closed by the top-level production gate.
  const catalogReady = ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1
    .productionApprovedModelAssetIds.length
    === catalog.visualAssetRegistry.list().length;
  const frameAssetsApproved = unapprovedCharacters.length === 0
    && unapprovedEquipment.length === 0
    && unapprovedMapAssetIds.length === 0;
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    source: Object.freeze({
      matchSeed: frame.source.matchSeed,
      tick: frame.source.tick,
      modeDefinitionId: frame.source.modeDefinitionId,
      mapDefinitionId: frame.source.mapDefinitionId,
    }),
    readiness: Object.freeze({
      frameReady,
      catalogReady,
      productionReady: frameReady && frameAssetsApproved && catalogReady,
      missingCharacterDefinitionIds: missingCharacters,
      missingEquipmentDefinitionIds: missingEquipment,
      missingMapDefinitionIds,
      unapprovedCharacterAssetIds: unapprovedCharacters,
      unapprovedEquipmentAssetIds: unapprovedEquipment,
      unapprovedMapAssetIds,
      catalogCoverage: catalog.coverage,
    }),
    characters,
    worldEquipment,
    mapAssetId,
    programmaticFallbackUsed: false as const,
  });
}

export function requireArenaV2FormalSceneFrameCandidateV1(
  value: unknown,
): ArenaV2FormalSceneResolutionCandidateV1 {
  const resolved = resolveArenaV2FormalSceneFrameCandidateV1(value);
  if (!resolved.readiness.productionReady) {
    const missing = [
      ...resolved.readiness.missingCharacterDefinitionIds.map((id) => `character:${id}`),
      ...resolved.readiness.missingEquipmentDefinitionIds.map((id) => `equipment:${id}`),
      ...resolved.readiness.missingMapDefinitionIds.map((id) => `map:${id}`),
      ...resolved.readiness.unapprovedCharacterAssetIds.map((id) => `unapproved-character:${id}`),
      ...resolved.readiness.unapprovedEquipmentAssetIds.map((id) => `unapproved-equipment:${id}`),
      ...resolved.readiness.unapprovedMapAssetIds.map((id) => `unapproved-map:${id}`),
    ];
    throw new RangeError(
      `Arena V2正式Scene资产未闭合：${missing.length > 0 ? missing.join(', ') : 'catalog gate'}。`,
    );
  }
  return resolved;
}

/**
 * Explicit development-only resolver for an isolated candidate host. It still
 * requires complete registry-backed character, equipment and map identities
 * and never creates a fallback, while keeping unapproved assets out of the
 * production-ready claim.
 */
export function requireArenaV2FormalSceneFrameForIsolatedDevelopmentCandidateV1(
  value: unknown,
): ArenaV2FormalSceneResolutionCandidateV1 {
  const resolved = resolveArenaV2FormalSceneFrameCandidateV1(value);
  if (!resolved.readiness.frameReady) {
    const missing = [
      ...resolved.readiness.missingCharacterDefinitionIds.map((id) => `character:${id}`),
      ...resolved.readiness.missingEquipmentDefinitionIds.map((id) => `equipment:${id}`),
      ...resolved.readiness.missingMapDefinitionIds.map((id) => `map:${id}`),
    ];
    throw new RangeError(`Arena V2隔离开发Scene资产未闭合：${missing.join(', ')}。`);
  }
  return resolved;
}

export const ARENA_V2_FORMAL_SCENE_RESOLUTION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  consumesRendererNeutralSceneReadFrame: true as const,
  ownsFormalVisualGateOnly: true as const,
  ownsFormalAudioGate: false as const,
  productionApprovalUsesSharedLedgerIndex: true as const,
  reportsFrameSpecificUnapprovedAssetIds: true as const,
  programmaticFallbackAllowed: false as const,
  isolatedDevelopmentMayUseCompleteUnapprovedRegistryCandidates: true as const,
  missingAssetPolicy: 'fail-closed' as const,
  validationStatus: 'not-run' as const,
});
