import { BOT_DIFFICULTY_IDS } from '@number-strategy-jump/arena-bot';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { createArenaBalancePolicy } from '@number-strategy-jump/arena-experiment';
import {
  createSortedMetricCountRecord,
  incrementMetricCount,
  metricRatioOrNull,
} from '@number-strategy-jump/arena-experiment';
import { createArenaMetricGate } from '@number-strategy-jump/arena-experiment';
import {
  ARENA_BALANCE_CANDIDATE_COLLECTOR_ID,
  ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION,
} from '@number-strategy-jump/arena-balance';

export {
  ARENA_BALANCE_CANDIDATE_COLLECTOR_ID,
  ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION,
} from '@number-strategy-jump/arena-balance';

const PARAMETER_KEYS = new Set(['policy']);

export function createArenaBalanceCandidateCollectorParameters(value) {
  const source = cloneFrozenData(value, 'ArenaBalanceCandidateCollector parameters');
  assertKnownKeys(source, PARAMETER_KEYS, 'ArenaBalanceCandidateCollector parameters');
  return Object.freeze({ policy: createArenaBalancePolicy(source.policy) });
}

function createEquipmentStats(policy) {
  return new Map(policy.equipment.actionBindings.map((binding) => [
    binding.equipmentDefinitionId,
    {
      actionDefinitionId: binding.actionDefinitionId,
      pickups: 0,
      actions: 0,
      hits: 0,
      attributedEliminations: 0,
    },
  ]));
}

function createDifficultyStats(policy) {
  return {
    matches: 0,
    ticks: 0,
    durations: [],
    targetDurationMatches: 0,
    ultraShortMatches: 0,
    timeoutMatches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    eventCount: 0,
    eliminations: 0,
    creditedEliminations: 0,
    equipmentAttributedEliminations: 0,
    baseAttackAttributedEliminations: 0,
    otherCreditedEliminations: 0,
    uncreditedEnvironmentEliminations: 0,
    resultReasons: new Map(),
    equipment: createEquipmentStats(policy),
    untrackedEquipmentEvents: new Map(),
    lastHits: new Map(),
  };
}

function mergeDifficultyStats(target, source) {
  for (const field of [
    'matches',
    'ticks',
    'targetDurationMatches',
    'ultraShortMatches',
    'timeoutMatches',
    'wins',
    'draws',
    'losses',
    'eventCount',
    'eliminations',
    'creditedEliminations',
    'equipmentAttributedEliminations',
    'baseAttackAttributedEliminations',
    'otherCreditedEliminations',
    'uncreditedEnvironmentEliminations',
  ]) target[field] += source[field];
  target.durations.push(...source.durations);
  for (const [reason, count] of source.resultReasons) {
    incrementMetricCount(target.resultReasons, reason, count);
  }
  for (const [definitionId, sourceEquipment] of source.equipment) {
    const targetEquipment = target.equipment.get(definitionId);
    for (const field of ['pickups', 'actions', 'hits', 'attributedEliminations']) {
      targetEquipment[field] += sourceEquipment[field];
    }
  }
  for (const [event, count] of source.untrackedEquipmentEvents) {
    incrementMetricCount(target.untrackedEquipmentEvents, event, count);
  }
}

function addResult(stats, result, policy) {
  const ticks = assertIntegerAtLeast(
    result.ticks,
    0,
    'Balance candidate result.ticks',
  );
  const reason = assertNonEmptyString(
    result.outcome?.reason,
    'Balance candidate result.outcome.reason',
  );
  if (typeof result.outcome.isDraw !== 'boolean') {
    throw new TypeError('Balance candidate result.outcome.isDraw 必须是布尔值。');
  }
  if (
    result.outcome.winnerId !== null
    && (typeof result.outcome.winnerId !== 'string'
      || result.outcome.winnerId.trim().length === 0)
  ) {
    throw new TypeError('Balance candidate result.outcome.winnerId 必须是 null 或非空字符串。');
  }
  if (result.outcome.isDraw !== (result.outcome.winnerId === null)) {
    throw new Error('Balance candidate result.outcome 胜者与平局状态不一致。');
  }
  stats.matches += 1;
  stats.ticks += ticks;
  stats.durations.push(ticks);
  if (
    ticks >= policy.duration.targetMinimumTicks
    && ticks <= policy.duration.targetMaximumTicks
  ) stats.targetDurationMatches += 1;
  if (ticks <= policy.duration.ultraShortMaximumTicks) stats.ultraShortMatches += 1;
  if (reason.startsWith('timeout')) stats.timeoutMatches += 1;
  incrementMetricCount(stats.resultReasons, reason);
  if (result.outcome.isDraw) stats.draws += 1;
  else if (result.outcome.winnerId === 'player-2') stats.wins += 1;
  else stats.losses += 1;
}

function quantile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) * fraction)];
}

function summarizeEquipment(stats) {
  const totalPickups = [...stats.equipment.values()].reduce(
    (sum, value) => sum + value.pickups,
    0,
  );
  const totalActions = [...stats.equipment.values()].reduce(
    (sum, value) => sum + value.actions,
    0,
  );
  const totalHits = [...stats.equipment.values()].reduce(
    (sum, value) => sum + value.hits,
    0,
  );
  return Object.freeze({
    totals: Object.freeze({ totalPickups, totalActions, totalHits }),
    definitions: Object.freeze(Object.fromEntries([...stats.equipment.entries()]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([definitionId, value]) => [definitionId, Object.freeze({
        actionDefinitionId: value.actionDefinitionId,
        pickups: value.pickups,
        pickupShare: metricRatioOrNull(value.pickups, totalPickups),
        actions: value.actions,
        actionShare: metricRatioOrNull(value.actions, totalActions),
        hits: value.hits,
        hitShare: metricRatioOrNull(value.hits, totalHits),
        attributedEliminations: value.attributedEliminations,
      })]))),
  });
}

function summarizeDifficulty(difficultyId, stats) {
  const score = stats.wins + stats.draws * 0.5;
  return Object.freeze({
    difficultyId,
    matches: stats.matches,
    wins: stats.wins,
    draws: stats.draws,
    losses: stats.losses,
    scoreRate: metricRatioOrNull(score, stats.matches),
    averageTicks: metricRatioOrNull(stats.ticks, stats.matches),
    p10Ticks: quantile(stats.durations, 0.1),
    medianTicks: quantile(stats.durations, 0.5),
    p90Ticks: quantile(stats.durations, 0.9),
    targetDurationShare: metricRatioOrNull(stats.targetDurationMatches, stats.matches),
    ultraShortShare: metricRatioOrNull(stats.ultraShortMatches, stats.matches),
    timeoutShare: metricRatioOrNull(stats.timeoutMatches, stats.matches),
    eliminations: stats.eliminations,
    creditedEliminations: stats.creditedEliminations,
    equipmentAttributedEliminations: stats.equipmentAttributedEliminations,
    baseAttackAttributedEliminations: stats.baseAttackAttributedEliminations,
    otherCreditedEliminations: stats.otherCreditedEliminations,
    uncreditedEnvironmentEliminations: stats.uncreditedEnvironmentEliminations,
    resultReasons: createSortedMetricCountRecord(stats.resultReasons),
    equipment: summarizeEquipment(stats),
    untrackedEquipmentEvents: createSortedMetricCountRecord(stats.untrackedEquipmentEvents),
  });
}

function createGateChecks({ policy, completedPairedCases, overall, difficulties }) {
  const checks = [
    {
      id: 'sample.completed-paired-cases',
      passed: completedPairedCases >= policy.minimumCompletedPairedCases,
    },
    {
      id: 'duration.target-share',
      passed: overall.targetDurationShare !== null
        && overall.targetDurationShare >= policy.duration.minimumTargetShare,
    },
    {
      id: 'duration.median-in-target',
      passed: overall.medianTicks !== null
        && overall.medianTicks >= policy.duration.targetMinimumTicks
        && overall.medianTicks <= policy.duration.targetMaximumTicks,
    },
    {
      id: 'duration.ultra-short-share',
      passed: overall.ultraShortShare !== null
        && overall.ultraShortShare <= policy.duration.maximumUltraShortShare,
    },
    {
      id: 'duration.timeout-share',
      passed: overall.timeoutShare !== null
        && overall.timeoutShare <= policy.duration.maximumTimeoutShare,
    },
    {
      id: 'equipment.no-untracked-events',
      passed: Object.keys(overall.untrackedEquipmentEvents).length === 0,
    },
  ];
  for (const [definitionId, result] of Object.entries(overall.equipment.definitions)) {
    checks.push(
      {
        id: `equipment.${definitionId}.pickups.minimum`,
        passed: result.pickups >= policy.equipment.minimumPickupsPerDefinition,
      },
      {
        id: `equipment.${definitionId}.pickups.share`,
        passed: result.pickupShare !== null
          && result.pickupShare >= policy.equipment.minimumPickupSharePerDefinition
          && result.pickupShare <= policy.equipment.maximumPickupSharePerDefinition,
      },
      {
        id: `equipment.${definitionId}.actions.minimum`,
        passed: result.actions >= policy.equipment.minimumActionsPerDefinition,
      },
      {
        id: `equipment.${definitionId}.actions.share`,
        passed: result.actionShare !== null
          && result.actionShare >= policy.equipment.minimumActionSharePerDefinition
          && result.actionShare <= policy.equipment.maximumActionSharePerDefinition,
      },
      {
        id: `equipment.${definitionId}.hits.minimum`,
        passed: result.hits >= policy.equipment.minimumHitsPerDefinition,
      },
      {
        id: `equipment.${definitionId}.hits.share`,
        passed: result.hitShare !== null
          && result.hitShare >= policy.equipment.minimumHitSharePerDefinition
          && result.hitShare <= policy.equipment.maximumHitSharePerDefinition,
      },
    );
  }
  checks.push(
    {
      id: 'elimination.credited-share',
      passed: overall.creditedEliminationShare !== null
        && overall.creditedEliminationShare >= policy.elimination.minimumCreditedShare,
    },
    {
      id: 'elimination.equipment-attributed-share',
      passed: overall.equipmentAttributedEliminationShare !== null
        && overall.equipmentAttributedEliminationShare
          >= policy.elimination.minimumEquipmentAttributedShare
        && overall.equipmentAttributedEliminationShare
          <= policy.elimination.maximumEquipmentAttributedShare,
    },
    {
      id: 'elimination.environment-share',
      passed: overall.uncreditedEnvironmentEliminationShare !== null
        && overall.uncreditedEnvironmentEliminationShare
          >= policy.elimination.minimumEnvironmentShare,
    },
  );
  for (const difficulty of difficulties) {
    checks.push({
      id: `difficulty.${difficulty.difficultyId}.sample-complete`,
      passed: difficulty.matches === completedPairedCases,
    });
  }
  return checks;
}

class ArenaBalanceCandidateCollector {
  #plannedPairedCases;
  #lastHitCreditTicks;
  #policy;
  #actionToEquipment;
  #active;
  #stats;
  #completedPairedCases;
  #failedPairedCases;
  #failureNames;
  #destroyed;

  constructor(definition, parameters) {
    this.#policy = createArenaBalanceCandidateCollectorParameters(parameters).policy;
    this.#plannedPairedCases = definition.getSeeds().length;
    this.#lastHitCreditTicks = assertIntegerAtLeast(
      definition.candidate.matchConfig.lastHitCreditTicks,
      0,
      'Balance candidate matchConfig.lastHitCreditTicks',
    );
    this.#actionToEquipment = new Map(this.#policy.equipment.actionBindings.map((binding) => [
      binding.actionDefinitionId,
      binding.equipmentDefinitionId,
    ]));
    this.#active = null;
    this.#stats = new Map(BOT_DIFFICULTY_IDS.map((id) => [
      id,
      createDifficultyStats(this.#policy),
    ]));
    this.#completedPairedCases = 0;
    this.#failedPairedCases = 0;
    this.#failureNames = new Map();
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaBalanceCandidateCollector 已销毁。');
  }

  beginCase(context) {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('Balance candidate collector 已有活动 case。');
    this.#active = {
      seed: context.seed,
      eventCount: 0,
      currentDifficultyId: null,
      stats: new Map(BOT_DIFFICULTY_IDS.map((id) => [
        id,
        createDifficultyStats(this.#policy),
      ])),
    };
  }

  observeStep(observation) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== observation.seed) {
      throw new Error('Balance candidate observation 没有对应活动 case。');
    }
    const difficultyId = observation.snapshot.difficultyId;
    const stats = this.#active.stats.get(difficultyId);
    if (!stats) throw new Error(`Balance candidate 未知难度 ${String(difficultyId)}。`);
    if (this.#active.currentDifficultyId !== difficultyId) {
      stats.lastHits.clear();
      this.#active.currentDifficultyId = difficultyId;
    }
    for (const event of observation.events) {
      const type = assertNonEmptyString(event.type, 'Balance candidate event.type');
      stats.eventCount += 1;
      this.#active.eventCount += 1;
      if (type === 'EquipmentSpawned') {
        if (!stats.equipment.has(event.equipmentDefinitionId)) {
          incrementMetricCount(
            stats.untrackedEquipmentEvents,
            `spawn:${String(event.equipmentDefinitionId)}`,
          );
        }
      } else if (type === 'EquipmentPickedUp') {
        const equipment = stats.equipment.get(event.equipmentDefinitionId);
        if (equipment) equipment.pickups += 1;
        else incrementMetricCount(
          stats.untrackedEquipmentEvents,
          `pickup:${String(event.equipmentDefinitionId)}`,
        );
      } else if (type === 'ActionStarted') {
        const equipmentDefinitionId = this.#actionToEquipment.get(event.action);
        if (equipmentDefinitionId) stats.equipment.get(equipmentDefinitionId).actions += 1;
      } else if (type === 'HitResolved') {
        const equipmentDefinitionId = this.#actionToEquipment.get(event.action);
        if (equipmentDefinitionId) stats.equipment.get(equipmentDefinitionId).hits += 1;
        const targetId = assertNonEmptyString(
          event.targetId,
          'Balance candidate HitResolved.targetId',
        );
        stats.lastHits.set(targetId, {
          tick: assertIntegerAtLeast(
            event.tick,
            0,
            'Balance candidate HitResolved.tick',
          ),
          attackerId: assertNonEmptyString(
            event.attackerId,
            'Balance candidate HitResolved.attackerId',
          ),
          actionDefinitionId: assertNonEmptyString(
            event.action,
            'Balance candidate HitResolved.action',
          ),
        });
      } else if (type === 'PlayerEliminated') {
        const participantId = assertNonEmptyString(
          event.participantId,
          'Balance candidate PlayerEliminated.participantId',
        );
        const tick = assertIntegerAtLeast(
          event.tick,
          0,
          'Balance candidate PlayerEliminated.tick',
        );
        if (
          event.creditedAttackerId !== null
          && (typeof event.creditedAttackerId !== 'string'
            || event.creditedAttackerId.trim().length === 0)
        ) {
          throw new TypeError(
            'Balance candidate PlayerEliminated.creditedAttackerId 必须是 null 或非空字符串。',
          );
        }
        stats.eliminations += 1;
        if (event.creditedAttackerId === null) {
          stats.uncreditedEnvironmentEliminations += 1;
        } else {
          stats.creditedEliminations += 1;
          const hit = stats.lastHits.get(participantId);
          if (
            hit
            && hit.attackerId === event.creditedAttackerId
            && tick >= hit.tick
            && tick - hit.tick <= this.#lastHitCreditTicks
          ) {
            const equipmentDefinitionId = this.#actionToEquipment.get(
              hit.actionDefinitionId,
            );
            if (equipmentDefinitionId) {
              stats.equipmentAttributedEliminations += 1;
              stats.equipment.get(equipmentDefinitionId).attributedEliminations += 1;
            } else if (hit.actionDefinitionId === 'base-push') {
              stats.baseAttackAttributedEliminations += 1;
            } else stats.otherCreditedEliminations += 1;
          } else stats.otherCreditedEliminations += 1;
        }
        stats.lastHits.delete(participantId);
      }
    }
  }

  completeCase(context) {
    this.#assertUsable();
    if (this.#active === null || this.#active.seed !== context.seed) {
      throw new Error('Balance candidate completion 没有对应活动 case。');
    }
    if (this.#active.eventCount !== context.eventCount) {
      throw new Error('Balance candidate 事件分母与 Runner 不一致。');
    }
    if (
      !Array.isArray(context.result.difficulties)
      || context.result.difficulties.length !== BOT_DIFFICULTY_IDS.length
    ) throw new Error('Balance candidate result 未覆盖三档难度。');
    for (let index = 0; index < BOT_DIFFICULTY_IDS.length; index += 1) {
      const difficultyId = BOT_DIFFICULTY_IDS[index];
      const result = context.result.difficulties[index];
      if (result.difficultyId !== difficultyId) {
        throw new Error(`Balance candidate 难度顺序错误：${result.difficultyId}。`);
      }
      const source = this.#active.stats.get(difficultyId);
      addResult(source, result, this.#policy);
      mergeDifficultyStats(this.#stats.get(difficultyId), source);
    }
    this.#completedPairedCases += 1;
    this.#active = null;
  }

  failCase(context) {
    this.#assertUsable();
    if (this.#active !== null && this.#active.seed !== context.seed) {
      throw new Error('Balance candidate failure 与活动 case 不一致。');
    }
    incrementMetricCount(
      this.#failureNames,
      assertNonEmptyString(context.failure.name, 'Balance candidate failure.name'),
    );
    this.#failedPairedCases += 1;
    this.#active = null;
  }

  getResult() {
    this.#assertUsable();
    if (this.#active !== null) throw new Error('活动 case 完成前不能导出 Balance 指标。');
    const aggregate = createDifficultyStats(this.#policy);
    for (const stats of this.#stats.values()) mergeDifficultyStats(aggregate, stats);
    const difficulties = BOT_DIFFICULTY_IDS.map((id) => (
      summarizeDifficulty(id, this.#stats.get(id))
    ));
    const overallBase = summarizeDifficulty('all', aggregate);
    const overall = Object.freeze({
      ...overallBase,
      creditedEliminationShare: metricRatioOrNull(
        aggregate.creditedEliminations,
        aggregate.eliminations,
      ),
      equipmentAttributedEliminationShare: metricRatioOrNull(
        aggregate.equipmentAttributedEliminations,
        aggregate.eliminations,
      ),
      uncreditedEnvironmentEliminationShare: metricRatioOrNull(
        aggregate.uncreditedEnvironmentEliminations,
        aggregate.eliminations,
      ),
    });
    return cloneFrozenData({
      gate: createArenaMetricGate(createGateChecks({
        policy: this.#policy,
        completedPairedCases: this.#completedPairedCases,
        overall,
        difficulties,
      })),
      policy: this.#policy,
      denominators: {
        plannedPairedCases: this.#plannedPairedCases,
        executedPairedCases: this.#completedPairedCases + this.#failedPairedCases,
        completedPairedCases: this.#completedPairedCases,
        completedMatches: this.#completedPairedCases * BOT_DIFFICULTY_IDS.length,
        totalEliminations: aggregate.eliminations,
      },
      raw: {
        failedPairedCases: this.#failedPairedCases,
        failureNames: createSortedMetricCountRecord(this.#failureNames),
      },
      derived: { overall, difficulties },
    }, 'ArenaBalanceCandidateCollector result');
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#active = null;
    this.#policy = null;
    this.#actionToEquipment.clear();
    this.#actionToEquipment = null;
    for (const stats of this.#stats.values()) {
      stats.resultReasons.clear();
      stats.equipment.clear();
      stats.untrackedEquipmentEvents.clear();
      stats.lastHits.clear();
    }
    this.#stats.clear();
    this.#failureNames.clear();
  }
}

export function createArenaBalanceCandidateCollectorEntry() {
  return Object.freeze({
    id: ARENA_BALANCE_CANDIDATE_COLLECTOR_ID,
    version: ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION,
    validateParameters: createArenaBalanceCandidateCollectorParameters,
    create: ({ definition, parameters }) => (
      new ArenaBalanceCandidateCollector(definition, parameters)
    ),
  });
}
