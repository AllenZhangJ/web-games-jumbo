import {
  createNeutralInputFrame,
  type ArenaInputFrame,
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
  ARENA_V1_CHARACTER_ID,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_FIXED_DT,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  type PhysicsWorld,
} from '@number-strategy-jump/arena-physics';
import {
  createArenaV1CharacterRegistry,
} from '@number-strategy-jump/arena-v1-content';
import {
  createArenaV2WeaponLanguageCandidates,
  createArenaV2WeaponLanguageResearchContent,
  type ArenaV2WeaponLanguageCandidate,
} from './arena-v2-weapon-language-prototype.js';
import {
  createArenaV2KzBranchGreyboxSurfaceSets,
  type ArenaV2KzBranchGreyboxSurface,
  type ArenaV2KzBranchGreyboxSurfaceSet,
} from './arena-v2-kz-branch-greybox-prototype.js';
import {
  runArenaV2KzRouteChoiceReentryPrototype,
  type ArenaV2KzRouteChoiceReentryScenario,
} from './arena-v2-kz-route-choice-return-prototype.js';
import {
  type ArenaV2KzLanguageResponsePolicy,
  type ArenaV2WeaponHitFeedback,
} from './arena-v2-kz-language-consequence-prototype.js';

const ATTACKER_ID = 'kz-crowding-attacker';
const PARTICIPANT_COUNTS: readonly number[] = Object.freeze([2, 3, 4]);
const RESPONSE_POLICY: ArenaV2KzLanguageResponsePolicy = 'hold';
const KILL_Y = -6;
const PROBE_TICKS = 120;

export interface ArenaV2KzMultiplayerCrowdingTargetResult {
  readonly participantId: string;
  readonly spawnPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly firstHitTick: number | null;
  readonly horizontalImpulse: number;
  readonly targetHorizontalDisplacement: number;
  readonly targetFell: boolean;
  readonly fallTick: number | null;
  readonly finalSupportSurfaceId: string | null;
  readonly feedback: ArenaV2WeaponHitFeedback;
}

export interface ArenaV2KzMultiplayerCrowdingProbeResult {
  readonly branchId: string;
  readonly segmentId: string;
  readonly branchRole: ArenaV2KzBranchGreyboxSurfaceSet['branchRole'];
  readonly surfaceId: string;
  readonly weaponId: string;
  readonly languageId: string;
  readonly actionDefinitionId: string;
  readonly participantCount: number;
  readonly targetCount: number;
  readonly responsePolicy: ArenaV2KzLanguageResponsePolicy;
  readonly surfaceWidth: number;
  readonly surfaceDepth: number;
  readonly estimatedLaneCapacity: number;
  readonly crowdingOverflow: boolean;
  readonly firstActiveTick: number | null;
  readonly hitTargetIds: readonly string[];
  readonly hitCount: number;
  readonly multipleTargetHit: boolean;
  readonly feedbackTargetAmbiguous: boolean;
  readonly targetResults: readonly ArenaV2KzMultiplayerCrowdingTargetResult[];
  readonly reentry: Readonly<{
    readonly respawnWaitTicks: number;
    readonly reentryTick: number;
    readonly reentryAnchorId: string;
    readonly reentryLabel: string;
    readonly reentryReadable: boolean;
  }> | null;
}

export interface ArenaV2KzMultiplayerCrowdingBranchSummary {
  readonly branchId: string;
  readonly segmentId: string;
  readonly branchRole: ArenaV2KzBranchGreyboxSurfaceSet['branchRole'];
  readonly surfaceDepth: number;
  readonly estimatedLaneCapacity: number;
  readonly crowdingOverflowCounts: Readonly<Record<string, number>>;
  readonly maxHitCount: number;
  readonly ambiguousFeedbackCount: number;
  readonly readableReentryCount: number;
}

export interface ArenaV2KzMultiplayerCrowdingPrototypeResult {
  readonly routeId: string;
  readonly productionStatus: 'research-only';
  readonly usesSharedRuleAndPhysics: true;
  readonly participantCounts: readonly number[];
  readonly candidateCount: number;
  readonly branchCount: number;
  readonly probeCount: number;
  readonly probes: readonly ArenaV2KzMultiplayerCrowdingProbeResult[];
  readonly summaries: readonly ArenaV2KzMultiplayerCrowdingBranchSummary[];
}

interface MutableTargetState {
  readonly participantId: string;
  readonly spawnPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly initialX: number;
  readonly initialZ: number;
  finalPosition: { x: number; y: number; z: number };
  firstHitTick: number | null;
  horizontalImpulse: number;
  fallTick: number | null;
  finalSupportSurfaceId: string | null;
}

function participantId(index: number): string {
  return `kz-crowding-player-${index}`;
}

function targetFacing(candidate: ArenaV2WeaponLanguageCandidate): number {
  return candidate.languageId === 'flank' ? 1 : -1;
}

function horizontalMagnitude(value: Readonly<{ x: number; z: number }>): number {
  return Math.hypot(value.x, value.z);
}

function actorSnapshot(
  physics: PhysicsWorld,
  participantIds: readonly string[],
  candidate: ArenaV2WeaponLanguageCandidate,
  fallen: ReadonlySet<string>,
): readonly RuleActor[] {
  return Object.freeze(participantIds.map((id) => {
    const state = physics.getCharacterState(id);
    return Object.freeze({
      id,
      canAct: true,
      targetable: !fallen.has(id),
      position: Object.freeze({ ...state.position }),
      facing: Object.freeze({
        x: id === ATTACKER_ID ? 1 : targetFacing(candidate),
        z: 0,
      }),
    });
  }));
}

function inputFrames(
  tick: number,
  participantIds: readonly string[],
  candidate: ArenaV2WeaponLanguageCandidate,
): readonly ArenaInputFrame[] {
  const commitment = candidate.groundAction.commitment;
  return Object.freeze(participantIds.map((id) => Object.freeze({
    ...createNeutralInputFrame(tick, id),
    primaryPressed: id === ATTACKER_ID && tick === 0,
    primaryHeld: id === ATTACKER_ID && commitment !== undefined
      ? tick < commitment.commitTicks
      : false,
  })));
}

function laneCapacity(surface: ArenaV2KzBranchGreyboxSurface, radius: number): number {
  return Math.max(1, Math.floor((surface.halfExtents.z * 2 + 0.05) / (radius * 2)));
}

function targetZOffsets(targetCount: number, surface: ArenaV2KzBranchGreyboxSurface, radius: number): readonly number[] {
  const halfSpan = Math.max(0, surface.halfExtents.z - radius - 0.04);
  if (targetCount <= 1) return Object.freeze([0]);
  if (halfSpan < 0.01) return Object.freeze(Array.from({ length: targetCount }, () => 0));
  return Object.freeze(Array.from({ length: targetCount }, (_, index) => {
    const ratio = index / (targetCount - 1);
    return -halfSpan + ratio * halfSpan * 2;
  }));
}

function feedbackFor(
  firstHitTick: number | null,
  targetFell: boolean,
  finalSupportSurfaceId: string | null,
  surfaceId: string,
): ArenaV2WeaponHitFeedback {
  if (firstHitTick === null) {
    return Object.freeze({
      kind: targetFell ? 'movement-fall' : 'attack-evaded',
      title: targetFell ? '路线失误·先于命中掉落' : '未命中·已避开攻击线',
      explanation: targetFell
        ? '玩家在武器命中前失去支撑面，当前结果不能归因于武器命中。'
        : '目标在有效判定前没有进入攻击线，使用者承担本次空放窗口。',
    });
  }
  if (targetFell) {
    return Object.freeze({
      kind: 'hit-ring-out',
      title: '击落·失去支撑面',
      explanation: '命中产生的控制把目标推出当前多人分叉的安全支撑面。',
    });
  }
  if (finalSupportSurfaceId !== null && finalSupportSurfaceId !== surfaceId) {
    return Object.freeze({
      kind: 'hit-surface-transfer',
      title: '命中·落点改变',
      explanation: '命中改变了目标最终支撑面，目标仍未淘汰但路线位置发生转移。',
    });
  }
  return Object.freeze({
    kind: 'hit-confirm',
    title: '命中·位置被改变',
    explanation: '命中成立，目标仍有支撑面；多人拥挤下仍需根据目标身份判断下一步。',
  });
}

function reentryFor(
  branchId: string,
  reentryScenarios: readonly ArenaV2KzRouteChoiceReentryScenario[],
): ArenaV2KzMultiplayerCrowdingProbeResult['reentry'] {
  const scenario = reentryScenarios.find(({ branchId: value }) => value === branchId);
  if (!scenario) return null;
  return Object.freeze({
    respawnWaitTicks: scenario.respawnTick - scenario.failureTick,
    reentryTick: scenario.reentryTick,
    reentryAnchorId: scenario.reentryAnchorId,
    reentryLabel: scenario.reentryLabel,
    reentryReadable: scenario.reentryReadable,
  });
}

function runProbe(
  surfaceSet: ArenaV2KzBranchGreyboxSurfaceSet,
  surface: ArenaV2KzBranchGreyboxSurface,
  candidate: ArenaV2WeaponLanguageCandidate,
  participantCount: number,
  reentryScenarios: readonly ArenaV2KzRouteChoiceReentryScenario[],
): ArenaV2KzMultiplayerCrowdingProbeResult {
  const participantIds = Object.freeze([
    ATTACKER_ID,
    ...Array.from({ length: participantCount - 1 }, (_, index) => participantId(index + 1)),
  ]);
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const margin = profile.radius + 0.08;
  const spawnY = surface.center.y + surface.halfExtents.y + profile.halfHeight + profile.radius;
  const targetX = surface.center.x + Math.min(
    Math.max(0, surface.halfExtents.x - margin),
    Math.max(0.35, surface.halfExtents.x * 0.55),
  );
  const attackerX = Math.max(
    surface.center.x - surface.halfExtents.x + margin,
    targetX - candidate.targetDistance,
  );
  const offsets = targetZOffsets(participantCount - 1, surface, profile.radius);
  const targets: MutableTargetState[] = offsets.map((offset, index) => {
    const position = Object.freeze({ x: targetX, y: spawnY, z: surface.center.z + offset });
    return {
      participantId: participantId(index + 1),
      spawnPosition: position,
      initialX: position.x,
      initialZ: position.z,
      finalPosition: { ...position },
      firstHitTick: null,
      horizontalImpulse: 0,
      fallTick: null,
      finalSupportSurfaceId: surface.id,
    };
  });
  const targetById = new Map(targets.map((target) => [target.participantId, target]));
  const fallen = new Set<string>();
  const hitTargetIds = new Set<string>();
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds,
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
    authorityContent: createArenaV2WeaponLanguageResearchContent(),
  });
  const physics = createLightweightPhysicsWorld({
    arena: {
      killY: KILL_Y,
      surfaces: surfaceSet.surfaces.map(({ id, center, halfExtents }) => ({ id, center, halfExtents })),
    },
  });
  physics.addCharacter({
    id: ATTACKER_ID,
    position: { x: attackerX, y: spawnY, z: surface.center.z },
    ...profile,
  });
  for (const target of targets) {
    physics.addCharacter({ id: target.participantId, position: target.spawnPosition, ...profile });
  }
  let firstActiveTick: number | null = null;
  try {
    const instanceId = `v2-kz-crowding:${surfaceSet.branchId}:${candidate.weaponId}:${participantCount}`;
    engine.spawnEquipment({
      instanceId,
      definitionId: candidate.weaponId,
      spawnId: instanceId,
      position: { x: attackerX, y: spawnY, z: surface.center.z },
    });
    engine.resolveEquipmentPickups({
      participants: participantIds.map((id) => ({
        id,
        eligible: true,
        position: physics.getCharacterState(id).position,
      })),
      contestSeed: 20260729 + participantCount,
    });
    const ports = Object.freeze({
      recordHit: () => undefined,
      applyHitstun: () => undefined,
      applyImpulse: (participantId: string, impulse: Readonly<{ x: number; y: number; z: number }>) => {
        const target = targetById.get(participantId);
        if (target) target.horizontalImpulse += horizontalMagnitude(impulse);
        physics.applyImpulse(participantId, impulse);
      },
    });
    for (let tick = 0; tick < PROBE_TICKS; tick += 1) {
      engine.advanceTimers();
      const actors = actorSnapshot(physics, participantIds, candidate, fallen);
      const batch = engine.resolveActions({
        tick,
        actors,
        inputFrames: inputFrames(tick, participantIds, candidate),
      });
      if (batch.starts.some(({ participantId }) => participantId === ATTACKER_ID)) {
        firstActiveTick ??= tick + candidate.groundAction.timing.windupTicks;
      }
      engine.commit(batch, ports);
      const activeBatch = engine.resolveActiveActions({
        actors: actorSnapshot(physics, participantIds, candidate, fallen),
      });
      for (const hit of activeBatch.hits) {
        const target = targetById.get(hit.targetId);
        if (hit.attackerId === ATTACKER_ID && target) {
          hitTargetIds.add(hit.targetId);
          target.firstHitTick ??= tick;
        }
      }
      engine.commit(activeBatch, ports);
      physics.step(ARENA_FIXED_DT);
      for (const target of targets) {
        const state = physics.getCharacterState(target.participantId);
        target.finalPosition = { ...state.position };
        target.finalSupportSurfaceId = state.supportSurfaceId;
        if (state.position.y < KILL_Y) {
          target.fallTick ??= tick;
          fallen.add(target.participantId);
        }
      }
      if (fallen.size === targets.length) break;
    }
  } finally {
    engine.destroy();
    physics.destroy();
  }
  const targetResults = Object.freeze(targets.map((target) => {
    const displacement = Math.hypot(
      target.finalPosition.x - target.initialX,
      target.finalPosition.z - target.initialZ,
    );
    const targetFell = target.fallTick !== null;
    return Object.freeze({
      participantId: target.participantId,
      spawnPosition: target.spawnPosition,
      firstHitTick: target.firstHitTick,
      horizontalImpulse: target.horizontalImpulse,
      targetHorizontalDisplacement: displacement,
      targetFell,
      fallTick: target.fallTick,
      finalSupportSurfaceId: target.finalSupportSurfaceId,
      feedback: feedbackFor(
        target.firstHitTick,
        targetFell,
        target.finalSupportSurfaceId,
        surface.id,
      ),
    });
  }));
  const participantTargetCount = participantCount - 1;
  const multipleTargetHit = hitTargetIds.size > 1;
  return Object.freeze({
    branchId: surfaceSet.branchId,
    segmentId: surfaceSet.segmentId,
    branchRole: surfaceSet.branchRole,
    surfaceId: surface.id,
    weaponId: candidate.weaponId,
    languageId: candidate.languageId,
    actionDefinitionId: candidate.groundAction.id,
    participantCount,
    targetCount: participantTargetCount,
    responsePolicy: RESPONSE_POLICY,
    surfaceWidth: surface.halfExtents.x * 2,
    surfaceDepth: surface.halfExtents.z * 2,
    estimatedLaneCapacity: laneCapacity(surface, profile.radius),
    crowdingOverflow: participantTargetCount > laneCapacity(surface, profile.radius),
    firstActiveTick,
    hitTargetIds: Object.freeze([...hitTargetIds].sort()),
    hitCount: hitTargetIds.size,
    multipleTargetHit,
    feedbackTargetAmbiguous: multipleTargetHit,
    targetResults,
    reentry: reentryFor(surfaceSet.branchId, reentryScenarios),
  });
}

function summarize(
  probes: readonly ArenaV2KzMultiplayerCrowdingProbeResult[],
): ArenaV2KzMultiplayerCrowdingBranchSummary {
  const first = probes[0];
  if (!first) throw new Error('KZ 多人拥挤汇总缺少探针。');
  const overflow = Object.fromEntries(PARTICIPANT_COUNTS.map((count) => [
    String(count), probes.filter(({ participantCount, crowdingOverflow }) => (
      participantCount === count && crowdingOverflow
    )).length,
  ]));
  return Object.freeze({
    branchId: first.branchId,
    segmentId: first.segmentId,
    branchRole: first.branchRole,
    surfaceDepth: first.surfaceDepth,
    estimatedLaneCapacity: first.estimatedLaneCapacity,
    crowdingOverflowCounts: Object.freeze(overflow),
    maxHitCount: Math.max(...probes.map(({ hitCount }) => hitCount)),
    ambiguousFeedbackCount: probes.filter(({ feedbackTargetAmbiguous }) => feedbackTargetAmbiguous).length,
    readableReentryCount: probes.filter(({ reentry }) => reentry?.reentryReadable === true).length,
  });
}

/**
 * Runs a research-only multi-participant crowding probe against the same
 * branch surfaces, Rule engine and lightweight PhysicsWorld used by the
 * single-target KZ studies. It measures target multiplicity and route reentry
 * vocabulary; it does not claim to be a race mode, network simulation or
 * final multiplayer balance.
 */
export function runArenaV2KzMultiplayerCrowdingPrototype(): ArenaV2KzMultiplayerCrowdingPrototypeResult {
  const surfaceSets = createArenaV2KzBranchGreyboxSurfaceSets();
  const candidates = createArenaV2WeaponLanguageCandidates();
  const reentry = runArenaV2KzRouteChoiceReentryPrototype();
  const probes = surfaceSets.flatMap((surfaceSet) => {
    const surface = surfaceSet.surfaces[Math.floor((surfaceSet.surfaces.length - 1) / 2)];
    if (!surface) throw new Error(`KZ 多人拥挤缺少中段 surface：${surfaceSet.branchId}`);
    return candidates.flatMap((candidate) => PARTICIPANT_COUNTS.map((participantCount) => (
      runProbe(surfaceSet, surface, candidate, participantCount, reentry.scenarios)
    )));
  });
  const summaries = surfaceSets.map((surfaceSet) => (
    summarize(probes.filter(({ branchId }) => branchId === surfaceSet.branchId))
  ));
  return Object.freeze({
    routeId: reentry.routeId,
    productionStatus: 'research-only',
    usesSharedRuleAndPhysics: true,
    participantCounts: PARTICIPANT_COUNTS,
    candidateCount: candidates.length,
    branchCount: surfaceSets.length,
    probeCount: probes.length,
    probes: Object.freeze(probes),
    summaries: Object.freeze(summaries),
  });
}
