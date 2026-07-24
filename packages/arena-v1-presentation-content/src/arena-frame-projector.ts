import {
  ACTION_RESOLUTION_KIND,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  type ArenaEquipmentSnapshot,
  type ArenaMapSnapshot,
  type ArenaMatchSnapshot,
  type ArenaParticipantSnapshot,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_MATCH_PHASE, ARENA_TICK_RATE } from '@number-strategy-jump/arena-match';
import type { ArenaV1PresentationContent } from './arena-v1-presentation-content.js';

export interface ArenaPresentationPublicMatchInfo {
  readonly matchSeed: number;
  readonly opponent: Readonly<{
    id: string;
    displayName: string;
    portraitKey: string;
    appearanceKey: string;
  }>;
}

export interface ProjectArenaPresentationFrameOptions {
  readonly snapshot: ArenaMatchSnapshot;
  readonly events?: readonly unknown[];
  readonly publicMatchInfo: ArenaPresentationPublicMatchInfo;
  readonly localParticipantId?: string;
  readonly opponentParticipantId?: string;
  readonly content: ArenaV1PresentationContent;
}

function integerAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value as number;
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function dataProperty(record: PlainRecord, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key} 必须是自有数据字段。`);
  }
  return descriptor.value;
}

function record(value: unknown, name: string): PlainRecord {
  return assertPlainRecord(value, name);
}

function finiteVector3(value: unknown, name: string): Readonly<{ x: number; y: number; z: number }> {
  const source = record(value, name);
  const result = { x: 0, y: 0, z: 0 };
  for (const axis of ['x', 'y', 'z'] as const) {
    const item = dataProperty(source, axis, name);
    if (!Number.isFinite(item)) throw new TypeError(`${name}.${axis} 必须是有限数。`);
    result[axis] = item as number;
  }
  return Object.freeze(result);
}

function finiteFacing(value: unknown, name: string): Readonly<{ x: number; z: number }> {
  const source = record(value, name);
  const x = dataProperty(source, 'x', name);
  const z = dataProperty(source, 'z', name);
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    throw new TypeError(`${name}.x/z 必须是有限数。`);
  }
  return Object.freeze({ x: x as number, z: z as number });
}

function requireParticipant(
  participants: readonly ArenaParticipantSnapshot[],
  participantId: string,
): ArenaParticipantSnapshot {
  const matches = participants.filter(({ id }) => id === participantId);
  if (matches.length !== 1) {
    throw new RangeError(`snapshot participant ${participantId} 必须且只能出现一次。`);
  }
  return matches[0]!;
}

function phaseLabel(phase: string): string {
  if (phase === ARENA_MATCH_PHASE.PREPARING) return '准备';
  if (phase === ARENA_MATCH_PHASE.RUNNING) return '对决';
  if (phase === ARENA_MATCH_PHASE.SUDDEN_DEATH) return '决胜';
  if (phase === ARENA_MATCH_PHASE.ENDED) return '结束';
  throw new RangeError(`未知 Arena match phase ${phase}。`);
}

function actionView(
  participant: ArenaParticipantSnapshot,
  tick: number,
  content: ArenaV1PresentationContent,
): Readonly<Record<string, unknown>> {
  const affordance = record(participant.actionAffordance, `${participant.id}.actionAffordance`);
  const affordanceTick = dataProperty(affordance, 'tick', `${participant.id}.actionAffordance`);
  const participantId = dataProperty(
    affordance,
    'participantId',
    `${participant.id}.actionAffordance`,
  );
  if (affordanceTick !== tick || participantId !== participant.id) {
    throw new RangeError(`${participant.id}.actionAffordance 身份无效。`);
  }
  const definitionIdValue = dataProperty(
    affordance,
    'primaryActionDefinitionId',
    `${participant.id}.actionAffordance`,
  );
  if (definitionIdValue !== null && typeof definitionIdValue !== 'string') {
    throw new TypeError(`${participant.id}.primaryActionDefinitionId 必须是字符串或 null。`);
  }
  const definitionId = definitionIdValue as string | null;
  const definition = definitionId === null ? undefined : content.actions[definitionId];
  if (definitionId !== null && !definition) {
    throw new RangeError(`缺少 action presentation ${definitionId}。`);
  }
  const channels = record(
    dataProperty(affordance, 'channels', `${participant.id}.actionAffordance`),
    `${participant.id}.actionAffordance.channels`,
  );
  const primary = record(
    dataProperty(channels, 'primary', `${participant.id}.actionAffordance.channels`),
    `${participant.id}.actionAffordance.channels.primary`,
  );
  const primaryHold = record(
    dataProperty(channels, 'primaryHold', `${participant.id}.actionAffordance.channels`),
    `${participant.id}.actionAffordance.channels.primaryHold`,
  );
  const primaryKind = dataProperty(primary, 'kind', `${participant.id}.primary`);
  const primaryHoldKind = dataProperty(primaryHold, 'kind', `${participant.id}.primaryHold`);
  return Object.freeze({
    definitionId,
    semantic: definition?.semantic ?? 'none',
    label: definition?.label ?? '行动',
    available:
      primaryKind === ACTION_RESOLUTION_KIND.SELECTED
      || primaryHoldKind === ACTION_RESOLUTION_KIND.SELECTED,
    pressOutcome: cloneFrozenData(primary, `${participant.id}.primary outcome`),
    holdOutcome: cloneFrozenData(primaryHold, `${participant.id}.primaryHold outcome`),
  });
}

function participantActionView(
  participant: ArenaParticipantSnapshot,
  content: ArenaV1PresentationContent,
): Readonly<Record<string, unknown>> {
  const action = record(participant.action, `${participant.id}.action`);
  const definitionIdValue = dataProperty(action, 'definitionId', `${participant.id}.action`);
  if (definitionIdValue !== null && typeof definitionIdValue !== 'string') {
    throw new TypeError(`${participant.id}.action.definitionId 必须是字符串或 null。`);
  }
  const definitionId = definitionIdValue as string | null;
  const presentation = definitionId === null ? undefined : content.actions[definitionId];
  if (definitionId !== null && !presentation) {
    throw new RangeError(`缺少 action presentation ${definitionId}。`);
  }
  return Object.freeze({
    ...cloneFrozenData(action, `${participant.id}.action`),
    presentationSemantic: presentation?.semantic ?? null,
    animationCategory: presentation?.animationCategory ?? null,
  });
}

function participantView(
  participant: ArenaParticipantSnapshot,
  content: ArenaV1PresentationContent,
): Readonly<Record<string, unknown>> {
  const definition = content.characterPresentationRegistry.requireDefaultForCharacter(
    assertNonEmptyString(participant.characterDefinitionId, `${participant.id}.characterDefinitionId`),
  );
  return Object.freeze({
    id: assertNonEmptyString(participant.id, 'participant.id'),
    characterDefinitionId: definition.characterDefinitionId,
    appearance: Object.freeze({
      presentationId: definition.id,
      definitionHash: definition.getContentHash(),
      modelAssetId: definition.modelAssetId,
      rigProfileId: definition.rigProfileId,
      materialProfileId: definition.materialProfileId,
      outlineProfileId: definition.outlineProfileId,
      direction: definition.direction,
    }),
    status: assertNonEmptyString(participant.status, `${participant.id}.status`),
    lives: integerAtLeast(participant.lives, 0, `${participant.id}.lives`),
    eliminations: integerAtLeast(participant.eliminations, 0, `${participant.id}.eliminations`),
    hitstunTicks: integerAtLeast(participant.hitstunTicks, 0, `${participant.id}.hitstunTicks`),
    invulnerableTicks: integerAtLeast(
      participant.invulnerableTicks,
      0,
      `${participant.id}.invulnerableTicks`,
    ),
    position: finiteVector3(participant.position, `${participant.id}.position`),
    velocity: finiteVector3(participant.velocity, `${participant.id}.velocity`),
    facing: finiteFacing(participant.facing, `${participant.id}.facing`),
    grounded: booleanValue(participant.grounded, `${participant.id}.grounded`),
    action: participantActionView(participant, content),
    movement: cloneFrozenData(participant.movement, `${participant.id}.movement`),
    equipment: cloneFrozenData(participant.equipment, `${participant.id}.equipment`),
  });
}

function equipmentView(
  item: ArenaEquipmentSnapshot,
  content: ArenaV1PresentationContent,
): Readonly<Record<string, unknown>> {
  const definition = content.equipment[item.definitionId];
  if (!definition) throw new RangeError(`缺少 equipment presentation ${item.definitionId}。`);
  if (item.ownerId !== null && typeof item.ownerId !== 'string') {
    throw new TypeError(`${item.instanceId}.ownerId 必须是字符串或 null。`);
  }
  return Object.freeze({
    instanceId: assertNonEmptyString(item.instanceId, 'equipment.instanceId'),
    definitionId: assertNonEmptyString(item.definitionId, `${item.instanceId}.definitionId`),
    appearance: definition,
    locationState: assertNonEmptyString(item.locationState, `${item.instanceId}.locationState`),
    ownerId: item.ownerId,
    position: item.position ? finiteVector3(item.position, `${item.instanceId}.position`) : null,
    cooldownRemainingTicks: integerAtLeast(
      item.cooldownRemainingTicks,
      0,
      `${item.instanceId}.cooldownRemainingTicks`,
    ),
  });
}

function mapView(
  snapshotMap: ArenaMapSnapshot,
  content: ArenaV1PresentationContent,
): Readonly<Record<string, unknown>> {
  if (snapshotMap.definitionId !== content.map.id) {
    throw new RangeError(`缺少 map presentation ${snapshotMap.definitionId}。`);
  }
  if (!Array.isArray(snapshotMap.surfaces) || !Array.isArray(snapshotMap.occurrences)) {
    throw new TypeError('snapshot.map surfaces/occurrences 必须是数组。');
  }
  const stateById = new Map(snapshotMap.surfaces.map((surface) => [surface.id, surface]));
  if (stateById.size !== snapshotMap.surfaces.length) {
    throw new RangeError('snapshot.map surfaces 不能包含重复 id。');
  }
  if (stateById.size !== content.map.surfaces.length) {
    throw new RangeError('snapshot.map surfaces 与表现 Definition 数量不一致。');
  }
  const surfaces = content.map.surfaces.map((definition) => {
    const state = stateById.get(definition.id);
    if (!state) throw new RangeError(`snapshot.map 缺少 surface ${definition.id}。`);
    return Object.freeze({
      ...definition,
      enabled: booleanValue(state.enabled, `snapshot.map surface ${definition.id}.enabled`),
      revision: integerAtLeast(state.revision, 0, `${definition.id}.revision`),
    });
  });
  return Object.freeze({
    definitionId: snapshotMap.definitionId,
    revision: integerAtLeast(snapshotMap.revision, 0, 'snapshot.map.revision'),
    surfaces: Object.freeze(surfaces),
    occurrences: cloneFrozenData(snapshotMap.occurrences, 'snapshot.map.occurrences'),
  });
}

function publicOpponentInfo(
  publicMatchInfo: ArenaPresentationPublicMatchInfo,
): ArenaPresentationPublicMatchInfo['opponent'] {
  const opponent = publicMatchInfo.opponent;
  if (!opponent || typeof opponent !== 'object') {
    throw new TypeError('publicMatchInfo.opponent 不存在。');
  }
  return Object.freeze({
    id: assertNonEmptyString(opponent.id, 'publicMatchInfo.opponent.id'),
    displayName: assertNonEmptyString(opponent.displayName, 'publicMatchInfo.opponent.displayName'),
    portraitKey: assertNonEmptyString(opponent.portraitKey, 'publicMatchInfo.opponent.portraitKey'),
    appearanceKey: assertNonEmptyString(
      opponent.appearanceKey,
      'publicMatchInfo.opponent.appearanceKey',
    ),
  });
}

export function projectArenaPresentationFrame({
  snapshot,
  events = [],
  publicMatchInfo,
  localParticipantId = 'player-1',
  opponentParticipantId = 'player-2',
  content,
}: ProjectArenaPresentationFrameOptions): Readonly<Record<string, unknown>> {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError('Arena snapshot 不存在。');
  if (!content || typeof content !== 'object') throw new TypeError('Arena presentation content 不存在。');
  if (!Array.isArray(events)) throw new TypeError('Arena presentation events 必须是数组。');
  const localId = assertNonEmptyString(localParticipantId, 'localParticipantId');
  const opponentId = assertNonEmptyString(opponentParticipantId, 'opponentParticipantId');
  if (localId === opponentId) throw new RangeError('本地与对手 participant id 不能相同。');
  const tick = integerAtLeast(snapshot.tick, 0, 'snapshot.tick');
  const matchSeed = integerAtLeast(snapshot.matchSeed, 0, 'snapshot.matchSeed');
  if (matchSeed > 0xffffffff) throw new RangeError('snapshot.matchSeed 必须是 uint32。');
  if (publicMatchInfo?.matchSeed !== matchSeed) {
    throw new RangeError('publicMatchInfo.matchSeed 与 snapshot 不一致。');
  }
  if (!Array.isArray(snapshot.participants) || !Array.isArray(snapshot.equipment)) {
    throw new TypeError('snapshot participants/equipment 必须是数组。');
  }
  const participantIds = snapshot.participants.map((participant) => participant.id);
  if (new Set(participantIds).size !== participantIds.length) {
    throw new RangeError('snapshot.participants 不能包含重复 id。');
  }
  const local = requireParticipant(snapshot.participants, localId);
  const opponent = requireParticipant(snapshot.participants, opponentId);
  const opponentInfo = publicOpponentInfo(publicMatchInfo);
  const action = actionView(local, tick, content);
  const participants = Object.freeze(snapshot.participants.map((participant) => (
    participantView(participant, content)
  )));
  const phase = assertNonEmptyString(snapshot.phase, 'snapshot.phase');
  const projectedEvents = cloneFrozenData(events, 'Arena presentation events');
  return Object.freeze({
    schemaVersion: 1,
    source: Object.freeze({
      matchSeed,
      tick,
      activeTick: integerAtLeast(snapshot.activeTick, 0, 'snapshot.activeTick'),
      configHash: assertNonEmptyString(snapshot.configHash, 'snapshot.configHash'),
      ruleContentHash: assertNonEmptyString(snapshot.ruleContentHash, 'snapshot.ruleContentHash'),
    }),
    phase,
    world: Object.freeze({
      map: mapView(snapshot.map, content),
      participants,
      equipment: Object.freeze(snapshot.equipment.map((item) => equipmentView(item, content))),
    }),
    hud: Object.freeze({
      phase,
      phaseLabel: phaseLabel(phase),
      remainingSeconds: Math.ceil(
        integerAtLeast(snapshot.remainingTicks, 0, 'snapshot.remainingTicks') / ARENA_TICK_RATE,
      ),
      local: Object.freeze({
        participantId: local.id,
        lives: integerAtLeast(local.lives, 0, `${local.id}.lives`),
      }),
      opponent: Object.freeze({
        participantId: opponent.id,
        displayName: opponentInfo.displayName,
        portraitKey: opponentInfo.portraitKey,
        appearanceKey: opponentInfo.appearanceKey,
        lives: integerAtLeast(opponent.lives, 0, `${opponent.id}.lives`),
      }),
      action,
      result: cloneFrozenData(snapshot.result, 'snapshot.result'),
    }),
    events: projectedEvents,
  });
}
