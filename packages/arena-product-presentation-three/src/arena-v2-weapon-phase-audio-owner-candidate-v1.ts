import {
  resolveArenaV2WeaponFeedbackActionReadBindingCandidateV1,
  type ArenaV2MatchSceneReadFrameCandidateV1,
  type ArenaV2ModeHudFeedbackAudioCommandV1,
  type ArenaV2WeaponFeedbackActionReadBindingCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import type { ActionStartedEventV6 } from '@number-strategy-jump/arena-contracts';

type AudioPhase = 'windup' | 'release' | 'recovery';

interface ActiveAction {
  readonly startEventId: string;
  readonly startTick: number;
  readonly startSequence: number;
  readonly sourceActionDefinitionId: string;
  readonly collectionActionDefinitionId: string;
  readonly weaponId: string;
  readonly equipmentInstanceId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly survivalLevel: number | null;
  readonly emittedPhases: Set<AudioPhase>;
}

interface StartEventIdentity {
  readonly tick: number;
  readonly sequence: number;
  readonly participantId: string;
  readonly action: string;
  readonly sourceKind: ActionStartedEventV6['sourceKind'];
  readonly equipmentInstanceId: string | null;
  readonly runtimeEquipmentDefinitionId: string | null;
  readonly collectionEquipmentDefinitionId: string | null;
  readonly survivalLevel: number | null;
}

type ParticipantEquipment = NonNullable<
  ArenaV2MatchSceneReadFrameCandidateV1['world']['participants'][number]['equipment']
>;

const MAX_REMEMBERED_START_EVENTS = 64;

function audioPhase(value: string): AudioPhase | null {
  if (value === 'windup') return 'windup';
  if (value === 'active') return 'release';
  if (value === 'recovery') return 'recovery';
  return null;
}

function stableVariantIndex(sourceEventId: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < sourceEventId.length; index += 1) {
    hash ^= sourceEventId.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % 3;
}

function cloneActiveAction(action: ActiveAction | null): ActiveAction | null {
  return action === null
    ? null
    : {
      ...action,
      emittedPhases: new Set(action.emittedPhases),
    };
}

function startEventIdentity(event: ActionStartedEventV6): StartEventIdentity {
  return {
    tick: event.tick,
    sequence: event.sequence,
    participantId: event.participantId,
    action: event.action,
    sourceKind: event.sourceKind,
    equipmentInstanceId: event.equipmentInstanceId,
    runtimeEquipmentDefinitionId: event.runtimeEquipmentDefinitionId,
    collectionEquipmentDefinitionId: event.collectionEquipmentDefinitionId,
    survivalLevel: event.survivalLevel,
  };
}

function sameStartEventIdentity(
  left: StartEventIdentity,
  right: StartEventIdentity,
): boolean {
  return left.tick === right.tick
    && left.sequence === right.sequence
    && left.participantId === right.participantId
    && left.action === right.action
    && left.sourceKind === right.sourceKind
    && left.equipmentInstanceId === right.equipmentInstanceId
    && left.runtimeEquipmentDefinitionId === right.runtimeEquipmentDefinitionId
    && left.collectionEquipmentDefinitionId === right.collectionEquipmentDefinitionId
    && left.survivalLevel === right.survivalLevel;
}

function rememberStartEvent(
  seen: Map<string, StartEventIdentity>,
  event: ActionStartedEventV6,
): void {
  const identity = startEventIdentity(event);
  const previous = seen.get(event.id);
  if (previous !== undefined && !sameStartEventIdentity(previous, identity)) {
    throw new RangeError('Arena V2武器阶段音频拒绝ActionStarted ID语义漂移。');
  }
  if (previous !== undefined) return;
  seen.set(event.id, identity);
  if (seen.size > MAX_REMEMBERED_START_EVENTS) {
    const oldest = seen.keys().next().value as string | undefined;
    if (oldest !== undefined) seen.delete(oldest);
  }
}

function assertFrameWaterline(
  frame: ArenaV2MatchSceneReadFrameCandidateV1,
  lastTick: number | null,
  lastEventSequence: number | null,
): void {
  if (!Number.isSafeInteger(frame.source.tick) || frame.source.tick < 0) {
    throw new RangeError('Arena V2武器阶段音频tick必须是非负安全整数。');
  }
  if (!Number.isSafeInteger(frame.source.eventSequence) || frame.source.eventSequence < 0) {
    throw new RangeError('Arena V2武器阶段音频eventSequence必须是非负安全整数。');
  }
  if (lastTick !== null && frame.source.tick < lastTick) {
    throw new RangeError('Arena V2武器阶段音频拒绝tick倒退。');
  }
  if (lastEventSequence !== null && frame.source.eventSequence < lastEventSequence) {
    throw new RangeError('Arena V2武器阶段音频拒绝eventSequence倒退。');
  }
  if (lastTick !== null
    && frame.source.tick === lastTick
    && frame.source.eventSequence !== lastEventSequence) {
    throw new RangeError('Arena V2武器阶段音频拒绝同tick事件水位漂移。');
  }
}

function assertEquipmentClosure(
  binding: ArenaV2WeaponFeedbackActionReadBindingCandidateV1,
  equipment: ParticipantEquipment,
): void {
  if (equipment.definitionId !== binding.equipmentDefinitionId
    || equipment.collectionEquipmentDefinitionId !== binding.equipmentDefinitionId
    || equipment.survivalLevel !== binding.survivalLevel) {
    throw new RangeError('Arena V2武器阶段音频动作与当前装备身份不闭合。');
  }
}

function assertStartEventClosure(
  event: ActionStartedEventV6,
  frame: ArenaV2MatchSceneReadFrameCandidateV1,
  binding: ArenaV2WeaponFeedbackActionReadBindingCandidateV1,
  equipment: ParticipantEquipment,
): void {
  if (!Number.isSafeInteger(event.tick)
    || event.tick < 0
    || !Number.isSafeInteger(event.sequence)
    || event.sequence < 0
    || event.tick >= frame.source.tick
    || event.sequence >= frame.source.eventSequence) {
    throw new RangeError('Arena V2武器阶段音频ActionStarted与post-step水位不闭合。');
  }
  if (event.sourceKind !== 'equipment'
    || event.equipmentInstanceId !== equipment.instanceId
    || event.runtimeEquipmentDefinitionId !== equipment.runtimeEquipmentDefinitionId
    || event.collectionEquipmentDefinitionId !== equipment.collectionEquipmentDefinitionId
    || event.collectionEquipmentDefinitionId !== binding.equipmentDefinitionId
    || event.survivalLevel !== equipment.survivalLevel
    || event.survivalLevel !== binding.survivalLevel) {
    throw new RangeError('Arena V2武器阶段音频ActionStarted装备/等级身份漂移。');
  }
}

function activeActionMatches(
  action: ActiveAction,
  sourceActionDefinitionId: string,
  binding: ArenaV2WeaponFeedbackActionReadBindingCandidateV1,
  equipment: ParticipantEquipment,
): boolean {
  return action.sourceActionDefinitionId === sourceActionDefinitionId
    && action.collectionActionDefinitionId === binding.collectionActionDefinitionId
    && action.weaponId === binding.weaponId
    && action.equipmentInstanceId === equipment.instanceId
    && action.runtimeEquipmentDefinitionId === equipment.runtimeEquipmentDefinitionId
    && action.collectionEquipmentDefinitionId === equipment.collectionEquipmentDefinitionId
    && action.survivalLevel === equipment.survivalLevel;
}

function activeActionDefinitionMatches(
  action: ActiveAction,
  sourceActionDefinitionId: string,
  binding: ArenaV2WeaponFeedbackActionReadBindingCandidateV1,
): boolean {
  return action.sourceActionDefinitionId === sourceActionDefinitionId
    && action.collectionActionDefinitionId === binding.collectionActionDefinitionId
    && action.weaponId === binding.weaponId;
}

function assertActiveStartIdentity(
  action: ActiveAction,
  event: ActionStartedEventV6,
): void {
  if (action.startTick !== event.tick
    || action.startSequence !== event.sequence
    || action.sourceActionDefinitionId !== event.action
    || action.equipmentInstanceId !== event.equipmentInstanceId
    || action.runtimeEquipmentDefinitionId !== event.runtimeEquipmentDefinitionId
    || action.collectionEquipmentDefinitionId !== event.collectionEquipmentDefinitionId
    || action.survivalLevel !== event.survivalLevel) {
    throw new RangeError('Arena V2武器阶段音频活动动作与重复ActionStarted不闭合。');
  }
}

function command(
  action: ActiveAction,
  phase: AudioPhase,
): ArenaV2ModeHudFeedbackAudioCommandV1 {
  const release = phase === 'release';
  const sourceEventId = `${action.startEventId}:weapon-phase-audio:${phase}`;
  return Object.freeze({
    sourceEventId,
    cueId: `arena.cue.audio.weapon-phase.${action.weaponId}.${phase}.v1`,
    actionDefinitionId: action.collectionActionDefinitionId,
    bus: 'SFX' as const,
    gainDb: release ? -3 as const : -6 as const,
    priority: release ? 2 as const : 1 as const,
    deterministicVariantIndex: stableVariantIndex(sourceEventId),
    maximumConcurrentVoices: 8 as const,
    overflowPolicy: 'drop-lowest-priority' as const,
  });
}

/**
 * Converts the local participant's authoritative ActionStarted identity and
 * authoritative action phase into one-shot weapon phase audio commands. It
 * does not infer hits, timing or direction from animation and it intentionally
 * stays silent when a restored mid-action frame has no observed start event.
 */
export class ArenaV2WeaponPhaseAudioOwnerCandidateV1 {
  #activeAction: ActiveAction | null = null;
  #lastTick: number | null = null;
  #lastEventSequence: number | null = null;
  #lastAcceptedStartTick: number | null = null;
  #lastAcceptedStartSequence: number | null = null;
  #seenStartEvents = new Map<string, StartEventIdentity>();
  #lastCommand: ArenaV2ModeHudFeedbackAudioCommandV1 | null = null;
  #emittedCommandCount = 0;
  #mutedCommandCount = 0;

  advance(
    frame: ArenaV2MatchSceneReadFrameCandidateV1,
    soundEnabled: boolean,
  ): readonly ArenaV2ModeHudFeedbackAudioCommandV1[] {
    if (typeof soundEnabled !== 'boolean') {
      throw new TypeError('Arena V2武器阶段音频soundEnabled必须是boolean。');
    }
    assertFrameWaterline(frame, this.#lastTick, this.#lastEventSequence);
    const localParticipants = frame.world.participants.filter(
      ({ id, local }) => id === frame.localParticipantId || local,
    );
    const participant = localParticipants[0];
    if (localParticipants.length !== 1
      || participant === undefined
      || participant.id !== frame.localParticipantId
      || participant.local !== true) {
      throw new RangeError('Arena V2武器阶段音频本地参与者身份不唯一。');
    }
    let nextActiveAction = cloneActiveAction(this.#activeAction);
    const nextSeenStartEvents = new Map(this.#seenStartEvents);
    let nextLastAcceptedStartTick = this.#lastAcceptedStartTick;
    let nextLastAcceptedStartSequence = this.#lastAcceptedStartSequence;
    let nextLastCommand = this.#lastCommand;
    let emittedCommandDelta = 0;
    let mutedCommandDelta = 0;
    let output: readonly ArenaV2ModeHudFeedbackAudioCommandV1[] = Object.freeze([]);
    const sourceActionDefinitionId = participant.action.definitionId;
    const phase = audioPhase(participant.action.phase);
    if (sourceActionDefinitionId === null || phase === null) {
      nextActiveAction = null;
    } else {
      const binding = resolveArenaV2WeaponFeedbackActionReadBindingCandidateV1(
        sourceActionDefinitionId,
      );
      if (binding === null) {
        nextActiveAction = null;
      } else {
        const equipment = participant.equipment;
        if (equipment === null) {
          throw new RangeError('Arena V2武器阶段音频已注册武器动作缺少当前装备。');
        }
        assertEquipmentClosure(binding, equipment);
        const matchingStarts = frame.events.filter((event): event is ActionStartedEventV6 => (
          event.type === 'ActionStarted'
          && event.participantId === frame.localParticipantId
          && event.action === sourceActionDefinitionId
        ));
        if (matchingStarts.length > 1) {
          throw new RangeError('Arena V2武器阶段音频同帧存在多个当前动作开始事件。');
        }
        const started = matchingStarts[0];
        if (started !== undefined) {
          assertStartEventClosure(started, frame, binding, equipment);
          rememberStartEvent(nextSeenStartEvents, started);
          if (nextActiveAction?.startEventId === started.id) {
            assertActiveStartIdentity(nextActiveAction, started);
          } else {
            if (nextLastAcceptedStartSequence !== null
              && nextLastAcceptedStartTick !== null
              && (started.sequence <= nextLastAcceptedStartSequence
                || started.tick < nextLastAcceptedStartTick)) {
              throw new RangeError('Arena V2武器阶段音频拒绝陈旧或乱序ActionStarted。');
            }
            nextActiveAction = {
              startEventId: started.id,
              startTick: started.tick,
              startSequence: started.sequence,
              sourceActionDefinitionId,
              collectionActionDefinitionId: binding.collectionActionDefinitionId,
              weaponId: binding.weaponId,
              equipmentInstanceId: equipment.instanceId,
              runtimeEquipmentDefinitionId: equipment.runtimeEquipmentDefinitionId,
              collectionEquipmentDefinitionId: equipment.collectionEquipmentDefinitionId,
              survivalLevel: equipment.survivalLevel,
              emittedPhases: new Set<AudioPhase>(),
            };
            nextLastAcceptedStartTick = started.tick;
            nextLastAcceptedStartSequence = started.sequence;
          }
        }
        if (nextActiveAction !== null) {
          if (!activeActionDefinitionMatches(
            nextActiveAction,
            sourceActionDefinitionId,
            binding,
          )) {
            nextActiveAction = null;
          } else if (!activeActionMatches(
            nextActiveAction,
            sourceActionDefinitionId,
            binding,
            equipment,
          )) {
            throw new RangeError('Arena V2武器阶段音频活动动作期间装备身份漂移。');
          }
        }
        if (nextActiveAction !== null) {
          if (frame.source.tick <= nextActiveAction.startTick) {
            throw new RangeError('Arena V2武器阶段音频ActionStarted未早于post-step帧。');
          }
          if (!nextActiveAction.emittedPhases.has(phase)) {
            const next = command(nextActiveAction, phase);
            nextActiveAction.emittedPhases.add(phase);
            if (soundEnabled) {
              nextLastCommand = next;
              emittedCommandDelta = 1;
              output = Object.freeze([next]);
            } else {
              mutedCommandDelta = 1;
            }
          }
        }
      }
    }
    this.#activeAction = nextActiveAction;
    this.#seenStartEvents = nextSeenStartEvents;
    this.#lastAcceptedStartTick = nextLastAcceptedStartTick;
    this.#lastAcceptedStartSequence = nextLastAcceptedStartSequence;
    this.#lastCommand = nextLastCommand;
    this.#lastTick = frame.source.tick;
    this.#lastEventSequence = frame.source.eventSequence;
    this.#emittedCommandCount += emittedCommandDelta;
    this.#mutedCommandCount += mutedCommandDelta;
    return output;
  }

  reset(): void {
    this.#activeAction = null;
    this.#lastTick = null;
    this.#lastEventSequence = null;
    this.#lastAcceptedStartTick = null;
    this.#lastAcceptedStartSequence = null;
    this.#seenStartEvents.clear();
    this.#lastCommand = null;
    this.#emittedCommandCount = 0;
    this.#mutedCommandCount = 0;
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      activeActionStartEventId: this.#activeAction?.startEventId ?? null,
      activeWeaponId: this.#activeAction?.weaponId ?? null,
      activeEquipmentInstanceId: this.#activeAction?.equipmentInstanceId ?? null,
      activeRuntimeEquipmentDefinitionId:
        this.#activeAction?.runtimeEquipmentDefinitionId ?? null,
      activeSurvivalLevel: this.#activeAction?.survivalLevel ?? null,
      emittedPhases: Object.freeze(
        this.#activeAction === null ? [] : [...this.#activeAction.emittedPhases],
      ),
      lastTick: this.#lastTick,
      lastEventSequence: this.#lastEventSequence,
      lastAcceptedStartSequence: this.#lastAcceptedStartSequence,
      rememberedStartEventCount: this.#seenStartEvents.size,
      lastCommand: this.#lastCommand,
      emittedCommandCount: this.#emittedCommandCount,
      mutedCommandCount: this.#mutedCommandCount,
    });
  }
}

export const ARENA_V2_WEAPON_PHASE_AUDIO_OWNER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  localParticipantOnly: true as const,
  authoritySource: 'ActionStarted+participant.action.phase' as const,
  authorityPhaseCount: 3 as const,
  weaponCount: 20 as const,
  stableCueCount: 60 as const,
  infersHitOrDirection: false as const,
  restoredMidActionWithoutStartEventPlaysAudio: false as const,
  requiresExactEquipmentAndSurvivalTierIdentity: true as const,
  rejectsStartEventIdentityDrift: true as const,
  rememberedStartEventLimit: MAX_REMEMBERED_START_EVENTS,
  resetClearsCrossMatchMetrics: true as const,
  maximumConcurrentVoices: 8 as const,
  validationStatus: 'not-run' as const,
});
