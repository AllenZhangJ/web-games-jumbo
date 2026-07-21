import { ACTION_RESOLUTION_KIND } from '@number-strategy-jump/arena-core';
import { ARENA_MATCH_PHASE, ARENA_TICK_RATE } from '@number-strategy-jump/arena-match';
import { ARENA_V1_GREYBOX_CONTENT } from '../content/arena-v1-greybox-content.js';

function cloneFrozen(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFrozen));
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    cloneFrozen(child),
  ])));
}

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function integerAtLeast(value, minimum, name) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value;
}

function finiteVector3(value, name) {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是向量。`);
  const result = {};
  for (const axis of ['x', 'y', 'z']) {
    if (!Number.isFinite(value[axis])) throw new TypeError(`${name}.${axis} 必须是有限数。`);
    result[axis] = value[axis];
  }
  return Object.freeze(result);
}

function finiteFacing(value, name) {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是朝向向量。`);
  if (!Number.isFinite(value.x) || !Number.isFinite(value.z)) {
    throw new TypeError(`${name}.x/z 必须是有限数。`);
  }
  return Object.freeze({ x: value.x, z: value.z });
}

function requireParticipant(snapshot, participantId) {
  if (!Array.isArray(snapshot.participants)) throw new TypeError('snapshot.participants 必须是数组。');
  const participant = snapshot.participants.find(({ id }) => id === participantId);
  if (!participant) throw new RangeError(`snapshot 缺少 participant ${participantId}。`);
  return participant;
}

function phaseLabel(phase) {
  if (phase === ARENA_MATCH_PHASE.PREPARING) return '准备';
  if (phase === ARENA_MATCH_PHASE.RUNNING) return '对决';
  if (phase === ARENA_MATCH_PHASE.SUDDEN_DEATH) return '决胜';
  if (phase === ARENA_MATCH_PHASE.ENDED) return '结束';
  throw new RangeError(`未知 Arena match phase ${String(phase)}。`);
}

function actionView(participant, tick, content) {
  const affordance = participant.actionAffordance;
  if (!affordance || typeof affordance !== 'object') {
    throw new TypeError(`${participant.id}.actionAffordance 不存在。`);
  }
  if (affordance.tick !== tick || affordance.participantId !== participant.id) {
    throw new RangeError(`${participant.id}.actionAffordance 身份无效。`);
  }
  const definitionId = affordance.primaryActionDefinitionId;
  const definition = definitionId === null ? null : content.actions[definitionId];
  if (definitionId !== null && !definition) {
    throw new RangeError(`缺少 action presentation ${definitionId}。`);
  }
  const primary = affordance.channels?.primary;
  const primaryHold = affordance.channels?.primaryHold;
  if (!primary || !primaryHold) throw new TypeError('ActionAffordance 缺少 primary 通道。');
  return Object.freeze({
    definitionId,
    semantic: definition?.semantic ?? 'none',
    label: definition?.label ?? '行动',
    available:
      primary.kind === ACTION_RESOLUTION_KIND.SELECTED
      || primaryHold.kind === ACTION_RESOLUTION_KIND.SELECTED,
    pressOutcome: cloneFrozen(primary),
    holdOutcome: cloneFrozen(primaryHold),
  });
}

function participantActionView(participant, content) {
  if (!participant.action || typeof participant.action !== 'object') {
    throw new TypeError(`${participant.id}.action 不存在。`);
  }
  const definitionId = participant.action.definitionId;
  const presentation = definitionId === null ? null : content.actions[definitionId];
  if (definitionId !== null && !presentation) {
    throw new RangeError(`缺少 action presentation ${definitionId}。`);
  }
  return Object.freeze({
    ...cloneFrozen(participant.action),
    presentationSemantic: presentation?.semantic ?? null,
    animationCategory: presentation?.animationCategory ?? null,
  });
}

function participantView(participant, content) {
  if (!content.characterPresentationRegistry?.requireDefaultForCharacter) {
    throw new TypeError('presentation content 缺少 CharacterPresentationRegistry。');
  }
  const definition = content.characterPresentationRegistry.requireDefaultForCharacter(
    participant.characterDefinitionId,
  );
  return Object.freeze({
    id: nonEmptyString(participant.id, 'participant.id'),
    characterDefinitionId: participant.characterDefinitionId,
    appearance: Object.freeze({
      presentationId: definition.id,
      definitionHash: definition.getContentHash(),
      modelAssetId: definition.modelAssetId,
      rigProfileId: definition.rigProfileId,
      materialProfileId: definition.materialProfileId,
      outlineProfileId: definition.outlineProfileId,
      direction: definition.direction,
    }),
    status: participant.status,
    lives: integerAtLeast(participant.lives, 0, `${participant.id}.lives`),
    eliminations: integerAtLeast(
      participant.eliminations,
      0,
      `${participant.id}.eliminations`,
    ),
    hitstunTicks: integerAtLeast(participant.hitstunTicks, 0, `${participant.id}.hitstunTicks`),
    invulnerableTicks: integerAtLeast(
      participant.invulnerableTicks,
      0,
      `${participant.id}.invulnerableTicks`,
    ),
    position: finiteVector3(participant.position, `${participant.id}.position`),
    velocity: finiteVector3(participant.velocity, `${participant.id}.velocity`),
    facing: finiteFacing(participant.facing, `${participant.id}.facing`),
    grounded: Boolean(participant.grounded),
    action: participantActionView(participant, content),
    movement: cloneFrozen(participant.movement),
    equipment: cloneFrozen(participant.equipment),
  });
}

function equipmentView(item, content) {
  const definition = content.equipment[item.definitionId];
  if (!definition) throw new RangeError(`缺少 equipment presentation ${item.definitionId}。`);
  return Object.freeze({
    instanceId: nonEmptyString(item.instanceId, 'equipment.instanceId'),
    definitionId: item.definitionId,
    appearance: definition,
    locationState: item.locationState,
    ownerId: item.ownerId,
    position: item.position ? finiteVector3(item.position, `${item.instanceId}.position`) : null,
    cooldownRemainingTicks: integerAtLeast(
      item.cooldownRemainingTicks,
      0,
      `${item.instanceId}.cooldownRemainingTicks`,
    ),
  });
}

function mapView(snapshotMap, content) {
  if (!snapshotMap || typeof snapshotMap !== 'object') throw new TypeError('snapshot.map 不存在。');
  if (snapshotMap.definitionId !== content.map.id) {
    throw new RangeError(`缺少 map presentation ${String(snapshotMap.definitionId)}。`);
  }
  if (!Array.isArray(snapshotMap.surfaces) || !Array.isArray(snapshotMap.occurrences)) {
    throw new TypeError('snapshot.map surfaces/occurrences 必须是数组。');
  }
  const stateById = new Map(snapshotMap.surfaces.map((surface) => [surface.id, surface]));
  if (stateById.size !== content.map.surfaces.length) {
    throw new RangeError('snapshot.map surfaces 与表现 Definition 数量不一致。');
  }
  const surfaces = content.map.surfaces.map((definition) => {
    const state = stateById.get(definition.id);
    if (!state) throw new RangeError(`snapshot.map 缺少 surface ${definition.id}。`);
    if (typeof state.enabled !== 'boolean') {
      throw new TypeError(`snapshot.map surface ${definition.id}.enabled 必须是布尔值。`);
    }
    return Object.freeze({
      ...definition,
      enabled: state.enabled,
      revision: integerAtLeast(state.revision, 0, `${definition.id}.revision`),
    });
  });
  return Object.freeze({
    definitionId: snapshotMap.definitionId,
    revision: integerAtLeast(snapshotMap.revision, 0, 'snapshot.map.revision'),
    surfaces: Object.freeze(surfaces),
    occurrences: cloneFrozen(snapshotMap.occurrences),
  });
}

function publicOpponentInfo(publicMatchInfo) {
  if (!publicMatchInfo?.opponent) throw new TypeError('publicMatchInfo.opponent 不存在。');
  const opponent = publicMatchInfo.opponent;
  return Object.freeze({
    id: nonEmptyString(opponent.id, 'publicMatchInfo.opponent.id'),
    displayName: nonEmptyString(
      opponent.displayName,
      'publicMatchInfo.opponent.displayName',
    ),
    portraitKey: nonEmptyString(
      opponent.portraitKey,
      'publicMatchInfo.opponent.portraitKey',
    ),
    appearanceKey: nonEmptyString(
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
  content = ARENA_V1_GREYBOX_CONTENT,
} = {}) {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError('Arena snapshot 不存在。');
  if (!Array.isArray(events)) throw new TypeError('Arena presentation events 必须是数组。');
  const tick = integerAtLeast(snapshot.tick, 0, 'snapshot.tick');
  integerAtLeast(snapshot.matchSeed, 0, 'snapshot.matchSeed');
  if (snapshot.matchSeed > 0xffffffff) throw new RangeError('snapshot.matchSeed 必须是 uint32。');
  if (publicMatchInfo?.matchSeed !== snapshot.matchSeed) {
    throw new RangeError('publicMatchInfo.matchSeed 与 snapshot 不一致。');
  }
  const local = requireParticipant(snapshot, localParticipantId);
  const opponent = requireParticipant(snapshot, opponentParticipantId);
  const opponentInfo = publicOpponentInfo(publicMatchInfo);
  const action = actionView(local, tick, content);
  if (!Array.isArray(snapshot.equipment)) throw new TypeError('snapshot.equipment 必须是数组。');
  const participants = Object.freeze(snapshot.participants.map((participant) => (
    participantView(participant, content)
  )));
  return Object.freeze({
    schemaVersion: 1,
    source: Object.freeze({
      matchSeed: snapshot.matchSeed,
      tick,
      activeTick: snapshot.activeTick,
      configHash: snapshot.configHash,
      ruleContentHash: snapshot.ruleContentHash,
    }),
    phase: snapshot.phase,
    world: Object.freeze({
      map: mapView(snapshot.map, content),
      participants,
      equipment: Object.freeze(snapshot.equipment.map((item) => equipmentView(item, content))),
    }),
    hud: Object.freeze({
      phase: snapshot.phase,
      phaseLabel: phaseLabel(snapshot.phase),
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
      result: cloneFrozen(snapshot.result),
    }),
    events: Object.freeze(events.map(cloneFrozen)),
  });
}
