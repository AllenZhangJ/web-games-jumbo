import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_SURVIVAL_WEAPON_FEEDBACK_ACTION_ALIASES_CANDIDATE_V1,
  ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1,
  type ArenaV2MatchSceneReadFrameCandidateV1,
  type ArenaV2WeaponFeedbackActionReadBindingCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ArenaV2WeaponPhaseAudioOwnerCandidateV1,
} from '../src/arena-v2-weapon-phase-audio-owner-candidate-v1.js';

function requireBinding(
  predicate: (binding: ArenaV2WeaponFeedbackActionReadBindingCandidateV1) => boolean,
): ArenaV2WeaponFeedbackActionReadBindingCandidateV1 {
  const binding = [
    ...ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1,
    ...ARENA_V2_SURVIVAL_WEAPON_FEEDBACK_ACTION_ALIASES_CANDIDATE_V1,
  ].find(predicate);
  if (binding === undefined) throw new Error('武器阶段音频测试缺少目标动作绑定。');
  return binding;
}

const COLLECTION_BINDING = requireBinding((binding) => (
  binding.weaponId === 'heavy-hammer'
  && binding.actionContext === 'ground'
  && binding.actionIdentityKind === 'collection'
));

const SURVIVAL_BINDING = requireBinding((binding) => (
  binding.weaponId === 'heavy-hammer'
  && binding.actionContext === 'ground'
  && binding.actionIdentityKind === 'survival-tier'
  && binding.survivalLevel === 3
));

function runtimeEquipmentDefinitionId(
  binding: ArenaV2WeaponFeedbackActionReadBindingCandidateV1,
): string {
  return binding.actionIdentityKind === 'collection'
    ? binding.equipmentDefinitionId
    : `arena-v2.test.runtime-equipment.${binding.weaponId}.level-${String(binding.survivalLevel)}`;
}

function startEvent(
  binding: ArenaV2WeaponFeedbackActionReadBindingCandidateV1,
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    id: 'event.action-start.1',
    sequence: 1,
    tick: 10,
    type: 'ActionStarted',
    participantId: 'local-player',
    action: binding.actionDefinitionId,
    sourceKind: 'equipment',
    equipmentInstanceId: 'equipment.instance.1',
    runtimeEquipmentDefinitionId: runtimeEquipmentDefinitionId(binding),
    collectionEquipmentDefinitionId: binding.equipmentDefinitionId,
    survivalLevel: binding.survivalLevel,
    ...overrides,
  });
}

interface FrameOptions {
  readonly binding?: ArenaV2WeaponFeedbackActionReadBindingCandidateV1;
  readonly actionDefinitionId?: string | null;
  readonly phase?: string;
  readonly tick?: number;
  readonly eventSequence?: number;
  readonly events?: readonly Readonly<Record<string, unknown>>[];
  readonly equipmentOverrides?: Readonly<Record<string, unknown>>;
  readonly equipmentMissing?: boolean;
  readonly extraParticipants?: readonly Readonly<Record<string, unknown>>[];
}

function frame(options: FrameOptions = {}): ArenaV2MatchSceneReadFrameCandidateV1 {
  const binding = options.binding ?? COLLECTION_BINDING;
  const equipment = options.equipmentMissing === true
    ? null
    : {
      instanceId: 'equipment.instance.1',
      definitionId: binding.equipmentDefinitionId,
      runtimeEquipmentDefinitionId: runtimeEquipmentDefinitionId(binding),
      collectionEquipmentDefinitionId: binding.equipmentDefinitionId,
      survivalLevel: binding.survivalLevel,
      cooldownRemainingTicks: 0,
      ...options.equipmentOverrides,
    };
  return {
    schemaVersion: 1,
    status: 'production-unreachable',
    source: {
      matchSeed: 7,
      tick: options.tick ?? 11,
      eventSequence: options.eventSequence ?? 2,
      modeDefinitionId: binding.actionIdentityKind === 'survival-tier'
        ? 'arena-v2.mode.survival.candidate.v1'
        : 'arena-v2.mode.duel.candidate.v1',
      mapDefinitionId: 'arena-v2.map.test.candidate.v1',
    },
    world: {
      phase: 'active',
      remainingTicks: 100,
      map: {},
      participants: [
        {
          id: 'local-player',
          characterDefinitionId: 'arena-v2.character.test.candidate.v1',
          appearanceKey: 'test',
          displayName: '本地玩家',
          identityOrdinal: 1,
          identityGlyphKey: 'triangle',
          identityPatternKey: 'solid',
          modeRole: 'competitor',
          local: true,
          status: 'active',
          lives: 1,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          facing: { x: 1, z: 0 },
          grounded: true,
          supportSurfaceId: 'surface.1',
          hitstunTicks: 0,
          invulnerableTicks: 0,
          respawnTicks: 0,
          action: {
            definitionId: options.actionDefinitionId === undefined
              ? binding.actionDefinitionId
              : options.actionDefinitionId,
            phase: options.phase ?? 'windup',
          },
          movement: {},
          equipment,
        },
        ...(options.extraParticipants ?? []),
      ],
      equipment: [],
      activeSupplyProjection: [],
      modeProjection: {},
    },
    localAction: {},
    localParticipantId: 'local-player',
    events: options.events ?? [startEvent(binding)],
    result: null,
  } as unknown as ArenaV2MatchSceneReadFrameCandidateV1;
}

describe('Arena V2 weapon phase audio owner candidate V1', () => {
  it('emits one deterministic SFX command for each authority phase', () => {
    const owner = new ArenaV2WeaponPhaseAudioOwnerCandidateV1();
    const windupFrame = frame();
    const windup = owner.advance(windupFrame, true);
    expect(windup).toHaveLength(1);
    expect(windup[0]).toMatchObject({
      cueId: 'arena.cue.audio.weapon-phase.heavy-hammer.windup.v1',
      actionDefinitionId: COLLECTION_BINDING.collectionActionDefinitionId,
      bus: 'SFX',
      gainDb: -6,
      maximumConcurrentVoices: 8,
    });
    expect(owner.advance(windupFrame, true)).toEqual([]);
    expect(owner.advance(frame({
      phase: 'active', tick: 12, eventSequence: 2, events: [],
    }), true)[0]?.cueId).toBe(
      'arena.cue.audio.weapon-phase.heavy-hammer.release.v1',
    );
    expect(owner.advance(frame({
      phase: 'recovery', tick: 13, eventSequence: 2, events: [],
    }), true)[0]?.cueId).toBe(
      'arena.cue.audio.weapon-phase.heavy-hammer.recovery.v1',
    );
    expect(owner.getSnapshot()).toMatchObject({
      emittedPhases: ['windup', 'release', 'recovery'],
      emittedCommandCount: 3,
      mutedCommandCount: 0,
    });
  });

  it('suppresses a muted phase without replaying it after sound is enabled', () => {
    const owner = new ArenaV2WeaponPhaseAudioOwnerCandidateV1();
    expect(owner.advance(frame(), false)).toEqual([]);
    expect(owner.advance(frame({
      phase: 'active', tick: 12, eventSequence: 2, events: [],
    }), true).map(({ cueId }) => cueId)).toEqual([
      'arena.cue.audio.weapon-phase.heavy-hammer.release.v1',
    ]);
    expect(owner.getSnapshot()).toMatchObject({
      emittedCommandCount: 1,
      mutedCommandCount: 1,
    });
  });

  it('stays silent for a restored mid-action frame without its start event', () => {
    const owner = new ArenaV2WeaponPhaseAudioOwnerCandidateV1();
    expect(owner.advance(frame({ phase: 'active', events: [] }), true)).toEqual([]);
    expect(owner.getSnapshot()).toMatchObject({
      activeActionStartEventId: null,
      emittedCommandCount: 0,
    });
  });

  it('fails atomically when event equipment identity drifts', () => {
    const owner = new ArenaV2WeaponPhaseAudioOwnerCandidateV1();
    expect(() => owner.advance(frame({
      events: [startEvent(COLLECTION_BINDING, {
        collectionEquipmentDefinitionId: 'arena-v2.weapon.other.candidate.v1',
      })],
    }), true)).toThrow(/装备\/等级身份漂移/u);
    expect(owner.getSnapshot()).toMatchObject({
      activeActionStartEventId: null,
      lastTick: null,
      emittedCommandCount: 0,
      rememberedStartEventCount: 0,
    });
    expect(owner.advance(frame(), true)).toHaveLength(1);
  });

  it('rejects start ID semantic drift, stale starts and same-tick watermark drift', () => {
    const identityOwner = new ArenaV2WeaponPhaseAudioOwnerCandidateV1();
    identityOwner.advance(frame(), true);
    expect(() => identityOwner.advance(frame({
      tick: 12,
      eventSequence: 3,
      events: [startEvent(COLLECTION_BINDING, { tick: 11, sequence: 2 })],
    }), true)).toThrow(/ID语义漂移/u);
    expect(identityOwner.getSnapshot()).toMatchObject({
      lastTick: 11,
      lastEventSequence: 2,
      emittedCommandCount: 1,
    });

    const staleOwner = new ArenaV2WeaponPhaseAudioOwnerCandidateV1();
    staleOwner.advance(frame({
      eventSequence: 6,
      events: [startEvent(COLLECTION_BINDING, { sequence: 5 })],
    }), true);
    expect(() => staleOwner.advance(frame({
      tick: 12,
      eventSequence: 7,
      events: [startEvent(COLLECTION_BINDING, {
        id: 'event.action-start.stale', sequence: 4,
      })],
    }), true)).toThrow(/陈旧或乱序/u);

    expect(() => identityOwner.advance(frame({
      tick: 11, eventSequence: 3, events: [],
    }), true)).toThrow(/同tick事件水位漂移/u);
  });

  it('rejects duplicate current starts and equipment replacement during an action', () => {
    const duplicateOwner = new ArenaV2WeaponPhaseAudioOwnerCandidateV1();
    expect(() => duplicateOwner.advance(frame({
      eventSequence: 3,
      events: [
        startEvent(COLLECTION_BINDING),
        startEvent(COLLECTION_BINDING, { id: 'event.action-start.2', sequence: 2 }),
      ],
    }), true)).toThrow(/多个当前动作开始事件/u);

    const replacementOwner = new ArenaV2WeaponPhaseAudioOwnerCandidateV1();
    replacementOwner.advance(frame(), true);
    expect(() => replacementOwner.advance(frame({
      phase: 'active',
      tick: 12,
      eventSequence: 2,
      events: [],
      equipmentOverrides: { instanceId: 'equipment.instance.replacement' },
    }), true)).toThrow(/活动动作期间装备身份漂移/u);
    expect(replacementOwner.getSnapshot()).toMatchObject({
      activeEquipmentInstanceId: 'equipment.instance.1',
      emittedCommandCount: 1,
    });
  });

  it('closes survival tier identity and clears all cross-match state on reset', () => {
    const owner = new ArenaV2WeaponPhaseAudioOwnerCandidateV1();
    expect(owner.advance(frame({ binding: SURVIVAL_BINDING }), true)).toHaveLength(1);
    expect(owner.getSnapshot()).toMatchObject({
      activeWeaponId: 'heavy-hammer',
      activeSurvivalLevel: 3,
      emittedCommandCount: 1,
      rememberedStartEventCount: 1,
    });
    owner.reset();
    expect(owner.getSnapshot()).toMatchObject({
      activeActionStartEventId: null,
      lastTick: null,
      lastEventSequence: null,
      lastAcceptedStartSequence: null,
      emittedCommandCount: 0,
      mutedCommandCount: 0,
      rememberedStartEventCount: 0,
    });
    expect(owner.advance(frame({ binding: SURVIVAL_BINDING }), true)).toHaveLength(1);
  });
});
