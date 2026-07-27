import type {
  ActionDefinition,
  EquipmentDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  type ArenaInputFrame,
  createNeutralInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  type ArenaRuleEngineContract,
  type RuleActor,
} from '@number-strategy-jump/arena-core';
import {
  createArenaV1MatchConfig,
  createArenaV1RuleEngine,
} from '@number-strategy-jump/arena-v1-composition';
import {
  createArenaV1CharacterRegistry,
  createArenaV1MapRegistry,
  createArenaV2WeaponCandidateContentRegistries,
  ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS,
} from '@number-strategy-jump/arena-v1-content';
import { ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID } from './arena-v2-weapon-function-language.js';

const PARTICIPANT_IDS = Object.freeze(['player-1', 'player-2']);
const PROBE_TICKS = 180;
type ResearchAuthorityContent = NonNullable<
  Parameters<typeof createArenaV1RuleEngine>[0]['authorityContent']
>;

export type ArenaV2WeaponLanguageProbePolicy = 'hold' | 'step-out';

export type ArenaV2WeaponLanguageProbeOutcome = 'hit' | 'miss';

export interface ArenaV2WeaponLanguageProbeResult {
  readonly weaponId: string;
  readonly languageId: string;
  readonly actionDefinitionId: string;
  readonly policy: ArenaV2WeaponLanguageProbePolicy;
  readonly responseTicks: number;
  readonly actionStartedTick: number | null;
  readonly firstActiveTick: number | null;
  readonly firstHitTick: number | null;
  readonly horizontalImpulse: number;
  readonly outcome: ArenaV2WeaponLanguageProbeOutcome;
}

export interface ArenaV2WeaponLanguagePrototypeResult {
  readonly candidateCount: number;
  readonly policies: readonly ArenaV2WeaponLanguageProbePolicy[];
  readonly results: readonly ArenaV2WeaponLanguageProbeResult[];
  readonly persistentAreaEffectImplemented: false;
}

export interface ArenaV2WeaponLanguageCandidate {
  readonly weaponId: string;
  readonly languageId: string;
  readonly groundAction: ActionDefinition;
  readonly aerialAction: ActionDefinition;
  readonly equipment: EquipmentDefinition;
  readonly targetDistance: number;
  readonly responseTicks: number;
}

export function createArenaV2WeaponLanguageCandidates(): readonly ArenaV2WeaponLanguageCandidate[] {
  return Object.freeze(ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS.map((candidate) => (
    Object.freeze({ ...candidate })
  )));
}

const CANDIDATES = createArenaV2WeaponLanguageCandidates();

export function createArenaV2WeaponLanguageResearchContent(): ResearchAuthorityContent {
  const base = createArenaV2WeaponCandidateContentRegistries();
  return Object.freeze({
    actionRegistry: base.actionRegistry,
    equipmentRegistry: base.equipmentRegistry,
    mapRegistry: createArenaV1MapRegistry(),
    characterRegistry: createArenaV1CharacterRegistry(),
  });
}

function createActors(targetX: number, targetFacingX = -1): readonly RuleActor[] {
  return Object.freeze([
    Object.freeze({
      id: 'player-1',
      canAct: true,
      targetable: true,
      position: Object.freeze({ x: 0, y: 1, z: 0 }),
      facing: Object.freeze({ x: 1, z: 0 }),
    }),
    Object.freeze({
      id: 'player-2',
      canAct: true,
      targetable: true,
      position: Object.freeze({ x: targetX, y: 1, z: 0 }),
      facing: Object.freeze({ x: targetFacingX, z: 0 }),
    }),
  ]);
}

function targetXForPolicy(
  candidate: ArenaV2WeaponLanguageCandidate,
  policy: ArenaV2WeaponLanguageProbePolicy,
  tick: number,
): number {
  if (policy === 'hold' || tick < candidate.responseTicks - 4) return candidate.targetDistance;
  return candidate.targetDistance + 3;
}

function createFrames(
  tick: number,
  candidate: ArenaV2WeaponLanguageCandidate,
  policy: ArenaV2WeaponLanguageProbePolicy,
): readonly ArenaInputFrame[] {
  const commitment = candidate.groundAction.commitment;
  const primaryHeld = commitment
    ? policy === 'hold'
      ? tick < commitment.commitTicks
      : tick < Math.max(1, commitment.commitTicks - 4)
    : false;
  return Object.freeze([
    Object.freeze({
      ...createNeutralInputFrame(tick, 'player-1'),
      primaryPressed: tick === 0,
      primaryHeld,
    }),
    createNeutralInputFrame(tick, 'player-2'),
  ]);
}

function runProbe(
  candidate: ArenaV2WeaponLanguageCandidate,
  policy: ArenaV2WeaponLanguageProbePolicy,
): ArenaV2WeaponLanguageProbeResult {
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds: PARTICIPANT_IDS,
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
    authorityContent: createArenaV2WeaponLanguageResearchContent(),
  });
  let actionStartedTick: number | null = null;
  let firstActiveTick: number | null = null;
  let firstHitTick: number | null = null;
  let horizontalImpulse = 0;
  try {
    engine.spawnEquipment({
      instanceId: `v2-language:${candidate.weaponId}`,
      definitionId: candidate.weaponId,
      spawnId: `v2-language:${candidate.weaponId}`,
      position: { x: 0, y: 1, z: 0 },
    });
    engine.resolveEquipmentPickups({
      participants: [
        { id: 'player-1', eligible: true, position: { x: 0, y: 1, z: 0 } },
        { id: 'player-2', eligible: true, position: { x: candidate.targetDistance, y: 1, z: 0 } },
      ],
      contestSeed: 20260727,
    });
    const ports = Object.freeze({
      recordHit: () => undefined,
      applyHitstun: () => undefined,
      applyImpulse: () => undefined,
    });
    for (let tick = 0; tick < PROBE_TICKS; tick += 1) {
      engine.advanceTimers();
      const actors = createActors(
        targetXForPolicy(candidate, policy, tick),
        candidate.languageId === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK ? 1 : -1,
      );
      const batch = engine.resolveActions({
        tick,
        actors,
        inputFrames: createFrames(tick, candidate, policy),
        additionalCandidates: Object.freeze([]),
      });
      if (batch.starts.some(({ participantId }) => participantId === 'player-1')) {
        actionStartedTick ??= tick;
        firstActiveTick ??= tick + candidate.groundAction.timing.windupTicks;
      }
      engine.commit(batch, ports);
      const activeBatch = engine.resolveActiveActions({ actors });
      if (activeBatch.hits.some(({ attackerId }) => attackerId === 'player-1')) {
        firstHitTick ??= tick;
      }
      for (const event of activeBatch.events) {
        if (event.type !== 'KnockbackApplied') continue;
        const impulse = event.impulse;
        if (!impulse || typeof impulse !== 'object') continue;
        const record = impulse as Readonly<Record<string, unknown>>;
        if (typeof record.x === 'number' && typeof record.z === 'number') {
          horizontalImpulse = Math.hypot(record.x, record.z);
        }
      }
      engine.commit(activeBatch, ports);
      if (firstHitTick !== null) break;
    }
  } finally {
    engine.destroy();
  }
  return Object.freeze({
    weaponId: candidate.weaponId,
    languageId: candidate.languageId,
    actionDefinitionId: candidate.groundAction.id,
    policy,
    responseTicks: candidate.responseTicks,
    actionStartedTick,
    firstActiveTick,
    firstHitTick,
    horizontalImpulse,
    outcome: firstHitTick === null ? 'miss' : 'hit',
  });
}

export function runArenaV2WeaponLanguagePrototype(): ArenaV2WeaponLanguagePrototypeResult {
  const policies: readonly ArenaV2WeaponLanguageProbePolicy[] = Object.freeze(['hold', 'step-out']);
  const results = CANDIDATES.flatMap((candidate) => policies.map((policy) => runProbe(candidate, policy)));
  return Object.freeze({
    candidateCount: CANDIDATES.length,
    policies,
    results: Object.freeze(results),
    persistentAreaEffectImplemented: false,
  });
}
