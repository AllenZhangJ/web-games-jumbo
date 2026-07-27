import {
  ARENA_V2_WEAPON_DEFINITION_MIGRATION_AUDITS,
  type ArenaV2WeaponDefinitionMigrationAudit,
} from './arena-v2-weapon-definition-migration-audit.js';
import {
  ARENA_V2_WEAPON_LAUNCH_CANDIDATES,
  type ArenaV2WeaponLaunchCandidate,
} from './arena-v2-weapon-launch-candidate-contract.js';
import { runArenaV2KzLanguageConsequencePrototype } from './arena-v2-kz-language-consequence-prototype.js';
import { runArenaV2WeaponLaunchReplayPrototype } from './arena-v2-weapon-launch-replay-prototype.js';
import { runArenaV2WeaponMapPrototype } from './arena-v2-weapon-map-prototype.js';

export type ArenaV2WeaponProductionMigrationGateId =
  | 'production-definition'
  | 'formal-action-state'
  | 'replay'
  | 'map-consequence'
  | 'feedback-presentation';

export type ArenaV2WeaponProductionMigrationGateStatus = 'passed' | 'blocked';

export interface ArenaV2WeaponProductionMigrationGateResult {
  readonly gateId: ArenaV2WeaponProductionMigrationGateId;
  readonly status: ArenaV2WeaponProductionMigrationGateStatus;
  readonly evidence: string;
}

export interface ArenaV2WeaponProductionMigrationCandidateResult {
  readonly candidateId: string;
  readonly displayName: string;
  readonly source: ArenaV2WeaponLaunchCandidate['source'];
  readonly languageId: ArenaV2WeaponLaunchCandidate['languageId'];
  readonly productionReady: boolean;
  readonly gates: readonly ArenaV2WeaponProductionMigrationGateResult[];
  readonly blockers: readonly ArenaV2WeaponProductionMigrationGateId[];
}

export interface ArenaV2WeaponProductionMigrationGateReport {
  readonly candidateCount: number;
  readonly productionReadyCount: number;
  readonly blockedCount: number;
  readonly candidates: readonly ArenaV2WeaponProductionMigrationCandidateResult[];
}

const GATE_IDS: readonly ArenaV2WeaponProductionMigrationGateId[] = Object.freeze([
  'production-definition',
  'formal-action-state',
  'replay',
  'map-consequence',
  'feedback-presentation',
]);

function auditFor(
  candidate: ArenaV2WeaponLaunchCandidate,
): ArenaV2WeaponDefinitionMigrationAudit {
  const audit = ARENA_V2_WEAPON_DEFINITION_MIGRATION_AUDITS.find(({ candidateId }) => (
    candidateId === candidate.candidateId
  ));
  if (!audit) throw new RangeError(`首发候选缺少 Definition 迁移审计：${candidate.candidateId}`);
  return audit;
}

function passed(
  gateId: ArenaV2WeaponProductionMigrationGateId,
  evidence: string,
): ArenaV2WeaponProductionMigrationGateResult {
  return Object.freeze({ gateId, status: 'passed', evidence });
}

function blocked(
  gateId: ArenaV2WeaponProductionMigrationGateId,
  evidence: string,
): ArenaV2WeaponProductionMigrationGateResult {
  return Object.freeze({ gateId, status: 'blocked', evidence });
}

function hasDistinctMapConsequences(
  candidate: ArenaV2WeaponLaunchCandidate,
  audit: ArenaV2WeaponDefinitionMigrationAudit,
  mapResults: ReturnType<typeof runArenaV2WeaponMapPrototype>,
  languageResults: ReturnType<typeof runArenaV2KzLanguageConsequencePrototype>,
): boolean {
  if (candidate.source === 'production-baseline') {
    const probes = mapResults.filter(({ weaponId }) => (
      weaponId === audit.productionEquipmentDefinitionId
    ));
    return probes.length > 0
      && probes.some(({ outcome }) => outcome === 'hit-safe')
      && probes.some(({ outcome }) => outcome === 'hit-ring-out');
  }
  const probes = languageResults.probes.filter(({ languageId }) => languageId === candidate.languageId);
  return probes.length === 18
    && probes.some(({ outcome }) => outcome === 'hit-safe')
    && probes.some(({ outcome }) => outcome === 'hit-ring-out');
}

function createCandidateResult(
  candidate: ArenaV2WeaponLaunchCandidate,
  mapResults: ReturnType<typeof runArenaV2WeaponMapPrototype>,
  languageResults: ReturnType<typeof runArenaV2KzLanguageConsequencePrototype>,
  lineReplayResult: ReturnType<typeof runArenaV2WeaponLaunchReplayPrototype>,
): ArenaV2WeaponProductionMigrationCandidateResult {
  const audit = auditFor(candidate);
  const isProductionDefinition = audit.implementationStatus === 'production-authority';
  const hasProductionActionState = isProductionDefinition
    && audit.groundActionDefinitionId !== null
    && audit.aerialActionDefinitionId !== null
    && audit.contexts.every(({ missingAxes }) => missingAxes.length === 0);
  const hasResearchActionState = candidate.candidateId === lineReplayResult.candidateId
    && lineReplayResult.actionPhaseSequence.join(',') === 'idle,windup,active,recovery';
  const hasActionState = hasProductionActionState || hasResearchActionState;
  const hasCandidateReplay = candidate.candidateId === lineReplayResult.candidateId
    && lineReplayResult.replayVerified;
  const hasMapConsequence = hasDistinctMapConsequences(
    candidate,
    audit,
    mapResults,
    languageResults,
  );
  const hasCandidateFeedback = isProductionDefinition;
  const gates = Object.freeze([
    isProductionDefinition
      ? passed('production-definition', '地面/空中动作均来自正式 EquipmentDefinition 与权威调优。')
      : blocked('production-definition', '当前仍是 research-only Definition，尚未进入正式 EquipmentRegistry。'),
    hasActionState
      ? passed('formal-action-state', hasProductionActionState
        ? '正式动作身份具备地面/空中上下文、前摇、有效、收招和冷却时间。'
        : '直线压制已通过正式 ActionExecutionSystem 的 idle→windup→active→recovery 生命周期探针。')
      : blocked('formal-action-state', '研究动作只有原型时序，尚未完成正式动作状态、取消和冲突规则接入。'),
    hasCandidateReplay
      ? passed('replay', `直线压制候选已通过 MatchReplay schema、${lineReplayResult.checkpointCount} 个 checkpoint 和最终 hash 验证。`)
      : blocked('replay', '尚无该候选的 MatchReplay fixture、checkpoint 和最终 hash 证据；确定性原型不能替代正式回放。'),
    hasMapConsequence
      ? passed('map-consequence', candidate.source === 'production-baseline'
        ? '宽平台、窄路和边缘平台均产生可区分的命中安全/击落结果。'
        : '六段 KZ 灰盒、三种回应和该战斗语言均产生可区分的命中安全/击落结果。')
      : blocked('map-consequence', '尚未形成至少两类可解释地图后果，不能证明武器改变路线决策。'),
    hasCandidateFeedback
      ? passed('feedback-presentation', '正式命中反馈已通过 WeaponFeedbackPresented 事件进入表现层。')
      : blocked('feedback-presentation', '研究候选尚无正式动作来源事件，不能把灰盒反馈当作生产表现完成。'),
  ]);
  const blockers = Object.freeze(gates
    .filter(({ status }) => status === 'blocked')
    .map(({ gateId }) => gateId));
  return Object.freeze({
    candidateId: candidate.candidateId,
    displayName: candidate.displayName,
    source: candidate.source,
    languageId: candidate.languageId,
    productionReady: blockers.length === 0,
    gates,
    blockers,
  });
}

export function runArenaV2WeaponProductionMigrationGate(): ArenaV2WeaponProductionMigrationGateReport {
  const mapResults = runArenaV2WeaponMapPrototype();
  const languageResults = runArenaV2KzLanguageConsequencePrototype();
  const lineReplayResult = runArenaV2WeaponLaunchReplayPrototype();
  const candidates = Object.freeze(ARENA_V2_WEAPON_LAUNCH_CANDIDATES.map((candidate) => (
    createCandidateResult(candidate, mapResults, languageResults, lineReplayResult)
  )));
  if (candidates.some(({ gates }) => gates.length !== GATE_IDS.length)) {
    throw new Error('首发武器迁移门禁必须为每个候选提供完整五项证据。');
  }
  return Object.freeze({
    candidateCount: candidates.length,
    productionReadyCount: candidates.filter(({ productionReady }) => productionReady).length,
    blockedCount: candidates.filter(({ productionReady }) => !productionReady).length,
    candidates,
  });
}
