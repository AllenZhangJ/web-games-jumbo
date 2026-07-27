import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import type { ActionDefinition } from '@number-strategy-jump/arena-definitions';
import {
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_EQUIPMENT_DEFINITIONS,
} from '@number-strategy-jump/arena-v1-content';
import {
  ARENA_V2_WEAPON_LAUNCH_CANDIDATES,
  type ArenaV2WeaponLaunchCandidate,
} from './arena-v2-weapon-launch-candidate-contract.js';
import {
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
  ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS,
  type ArenaV2WeaponPublicAxisId,
} from './arena-v2-weapon-public-axis-contract.js';
import {
  findArenaV2WeaponLaunchResearchDefinitionPrototype,
} from './arena-v2-weapon-launch-research-definition-prototype.js';
import { projectArenaV2ActionDefinitionPublicNumbers } from './arena-v2-weapon-action-public-projection.js';

export interface ArenaV2WeaponPublicAxisAuthoritySource {
  readonly axisId: ArenaV2WeaponPublicAxisId;
  readonly sourceFieldPath: string;
  readonly projection: 'direct' | 'derived';
  readonly authorityUnit: 'world-unit' | 'tick' | 'second' | 'impulse' | 'degree';
}

export interface ArenaV2WeaponDefinitionMigrationContextAudit {
  readonly context: 'ground' | 'aerial';
  readonly actionDefinitionId: string | null;
  readonly availableAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly missingAxes: readonly ArenaV2WeaponPublicAxisId[];
}

export interface ArenaV2WeaponDefinitionMigrationAudit {
  readonly candidateId: string;
  readonly displayName: string;
  readonly languageId: ArenaV2WeaponLaunchCandidate['languageId'];
  readonly source: ArenaV2WeaponLaunchCandidate['source'];
  readonly productionEquipmentDefinitionId: string | null;
  readonly candidateEquipmentDefinitionId: string | null;
  readonly groundActionDefinitionId: string | null;
  readonly aerialActionDefinitionId: string | null;
  readonly requiredOverviewAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly availableOverviewAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly missingOverviewAxes: readonly ArenaV2WeaponPublicAxisId[];
  readonly contexts: readonly ArenaV2WeaponDefinitionMigrationContextAudit[];
  readonly authorityFieldPaths: readonly string[];
  readonly structuralGaps: readonly string[];
  readonly implementationStatus: 'production-authority' | 'candidate-definition' | 'missing';
  readonly status: 'ready' | 'needs-definition';
}

const authoritySources: readonly ArenaV2WeaponPublicAxisAuthoritySource[] = [
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE,
    sourceFieldPath: 'action.tuning.targeting.range',
    projection: 'direct',
    authorityUnit: 'world-unit',
  },
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE,
    sourceFieldPath: 'action.tuning.targeting.radius | minimumFacingDot',
    projection: 'derived',
    authorityUnit: 'world-unit',
  },
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP,
    sourceFieldPath: 'action.tuning.cadence.windupSeconds',
    projection: 'direct',
    authorityUnit: 'second',
  },
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY,
    sourceFieldPath: 'action.tuning.cadence.recoverySeconds',
    projection: 'direct',
    authorityUnit: 'second',
  },
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT,
    sourceFieldPath: 'action.tuning.knockback.targetGroundDistance',
    projection: 'direct',
    authorityUnit: 'world-unit',
  },
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL,
    sourceFieldPath: 'action.tuning.knockback.verticalImpulse',
    projection: 'direct',
    authorityUnit: 'impulse',
  },
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL,
    sourceFieldPath: 'action.tuning.hitstunTicks / units.tickRateHz',
    projection: 'derived',
    authorityUnit: 'second',
  },
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT,
    sourceFieldPath: 'action.tuning.selfMovement.horizontalImpulse',
    projection: 'direct',
    authorityUnit: 'impulse',
  },
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN,
    sourceFieldPath: 'action.tuning.cadence.cooldownSeconds',
    projection: 'direct',
    authorityUnit: 'second',
  },
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES,
    sourceFieldPath: 'action.tuning.cadence.activeSeconds',
    projection: 'derived',
    authorityUnit: 'second',
  },
  {
    axisId: ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE,
    sourceFieldPath: 'action.tuning.targeting.minimumFacingDot | radius',
    projection: 'derived',
    authorityUnit: 'degree',
  },
];

export const ARENA_V2_WEAPON_PUBLIC_AXIS_AUTHORITY_SOURCES = Object.freeze(
  authoritySources.map((source) => Object.freeze(source)),
);

const authoritySourceByAxisId = new Map(
  authoritySources.map((source) => [source.axisId, source]),
);

type AttackTuning = typeof ARENA_GAMEPLAY_V2_TUNING.attacks[
  keyof typeof ARENA_GAMEPLAY_V2_TUNING.attacks
];

function hasAxisValue(tuning: AttackTuning, axisId: ArenaV2WeaponPublicAxisId): boolean {
  switch (axisId) {
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE:
      return Number.isFinite(tuning.targeting.range);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE:
      return Number.isFinite(tuning.targeting.radius) || Number.isFinite(tuning.targeting.minimumFacingDot);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP:
      return Number.isFinite(tuning.cadence.windupSeconds);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY:
      return Number.isFinite(tuning.cadence.recoverySeconds);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT:
      return Number.isFinite(tuning.knockback.targetGroundDistance);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL:
      return Number.isFinite(tuning.knockback.verticalImpulse);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL:
      return Number.isFinite(tuning.hitstunTicks);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT:
      return tuning.selfMovement !== null && Number.isFinite(tuning.selfMovement?.horizontalImpulse);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN:
      return Number.isFinite(tuning.cadence.cooldownSeconds);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES:
      return Number.isFinite(tuning.cadence.activeSeconds);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE:
      return Number.isFinite(tuning.targeting.minimumFacingDot) || Number.isFinite(tuning.targeting.radius);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP:
      return Number.isFinite(tuning.targeting.maximumVerticalDifference);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY:
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING:
      return false;
    default:
      return false;
  }
}

function resolveAttackTuning(actionDefinitionId: string | null): AttackTuning | null {
  if (actionDefinitionId === null) return null;
  const tuning = ARENA_GAMEPLAY_V2_TUNING.attacks[
    actionDefinitionId as keyof typeof ARENA_GAMEPLAY_V2_TUNING.attacks
  ];
  return tuning ?? null;
}

function structuralGaps(candidate: ArenaV2WeaponLaunchCandidate): readonly string[] {
  if (candidate.source === 'production-baseline') return Object.freeze([]);
  switch (candidate.languageId) {
    case 'line-pressure':
      return Object.freeze([
        '直线投射或刺击的目标策略',
        '固定重复间隔与空放后的可读恢复',
      ]);
    case 'read-punish':
      return Object.freeze([
        '蓄力承诺、提前取消和到期取消状态',
        '不引入真正格挡的高回报命中效果',
      ]);
    case 'flank':
      return Object.freeze([
        '侧向/后方目标判定策略',
        '基于目标朝向的方向性击退',
      ]);
    default:
      return Object.freeze(['未声明的研究候选结构缺口']);
  }
}

function createProductionContextAudit(
  actionDefinitionId: string,
): ArenaV2WeaponDefinitionMigrationContextAudit {
  const tuning = resolveAttackTuning(actionDefinitionId);
  if (!tuning) {
    return Object.freeze({
      context: actionDefinitionId.includes('air') ? 'aerial' : 'ground',
      actionDefinitionId,
      availableAxes: Object.freeze([]),
      missingAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS]),
    });
  }
  const availableAxes = Object.freeze(ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS.filter((axisId) => (
    hasAxisValue(tuning, axisId)
  )));
  return Object.freeze({
    context: actionDefinitionId.includes('air') ? 'aerial' : 'ground',
    actionDefinitionId,
    availableAxes,
    missingAxes: Object.freeze(ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS.filter((axisId) => (
      !availableAxes.includes(axisId)
    ))),
  });
}

function createResearchContextAudit(
  context: 'ground' | 'aerial',
): ArenaV2WeaponDefinitionMigrationContextAudit {
  return Object.freeze({
    context,
    actionDefinitionId: null,
    availableAxes: Object.freeze([]),
    missingAxes: Object.freeze([...ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS]),
  });
}

function hasActionAxis(action: ActionDefinition, axisId: ArenaV2WeaponPublicAxisId): boolean {
  const projection = projectArenaV2ActionDefinitionPublicNumbers(action);
  switch (axisId) {
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE:
      return Number.isFinite(projection.range);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE:
      return Number.isFinite(projection.coverage);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP:
      return Number.isFinite(projection.windupTicks);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY:
      return Number.isFinite(projection.recoveryTicks);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT:
      return Number.isFinite(projection.impactDistance);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL:
      return Number.isFinite(projection.verticalImpulse);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL:
      return Number.isFinite(projection.hitstunTicks);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT:
      return Number.isFinite(projection.selfMovementImpulse);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN:
      return Number.isFinite(projection.cooldownTicks);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP:
      return Number.isFinite(projection.heightGap);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES:
      return Number.isFinite(projection.activeTicks);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE:
      return Number.isFinite(projection.directionToleranceDegrees);
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY:
    case ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING:
      return false;
    default:
      return false;
  }
}

function createResearchDefinitionContextAudit(
  context: 'ground' | 'aerial',
  action: ActionDefinition,
): ArenaV2WeaponDefinitionMigrationContextAudit {
  const availableAxes = Object.freeze(ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS.filter((axisId) => (
    hasActionAxis(action, axisId)
  )));
  return Object.freeze({
    context,
    actionDefinitionId: action.id,
    availableAxes,
    missingAxes: Object.freeze(ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS.filter((axisId) => (
      !availableAxes.includes(axisId)
    ))),
  });
}

function createMigrationAudit(
  candidate: ArenaV2WeaponLaunchCandidate,
): ArenaV2WeaponDefinitionMigrationAudit {
  if (candidate.source === 'research-candidate') {
    const prototype = findArenaV2WeaponLaunchResearchDefinitionPrototype(candidate.candidateId);
    if (prototype) {
      const availableAxes = Object.freeze([
        ...prototype.publicOverviewAxes,
        ...prototype.publicBehaviorAxes,
      ]);
      const availableOverviewAxes = Object.freeze(candidate.requiredPublicAxes.filter((axisId) => (
        availableAxes.includes(axisId)
      )));
      const contexts = Object.freeze([
        createResearchDefinitionContextAudit('ground', prototype.groundAction),
        createResearchDefinitionContextAudit('aerial', prototype.aerialAction),
      ]);
      const authorityFieldPaths = Object.freeze(candidate.requiredPublicAxes.map((axisId) => {
        const source = authoritySourceByAxisId.get(axisId);
        if (!source) throw new RangeError(`公开数值轴缺少权威来源：${axisId}`);
        return source.sourceFieldPath;
      }));
      const missingOverviewAxes = Object.freeze(candidate.requiredPublicAxes.filter((axisId) => (
        !availableOverviewAxes.includes(axisId)
      )));
      const contextMissing = contexts.some(({ missingAxes }) => missingAxes.length > 0);
      return Object.freeze({
        candidateId: candidate.candidateId,
        displayName: candidate.displayName,
        languageId: candidate.languageId,
        source: candidate.source,
        productionEquipmentDefinitionId: null,
        candidateEquipmentDefinitionId: prototype.equipment.id,
        groundActionDefinitionId: prototype.groundActionDefinitionId,
        aerialActionDefinitionId: prototype.aerialActionDefinitionId,
        requiredOverviewAxes: candidate.requiredPublicAxes,
        availableOverviewAxes,
        missingOverviewAxes,
        contexts,
        authorityFieldPaths,
        structuralGaps: Object.freeze([]),
        implementationStatus: 'candidate-definition',
        status: missingOverviewAxes.length === 0 && !contextMissing ? 'ready' : 'needs-definition',
      });
    }
    return Object.freeze({
      candidateId: candidate.candidateId,
      displayName: candidate.displayName,
      languageId: candidate.languageId,
      source: candidate.source,
      productionEquipmentDefinitionId: null,
      candidateEquipmentDefinitionId: null,
      groundActionDefinitionId: null,
      aerialActionDefinitionId: null,
      requiredOverviewAxes: candidate.requiredPublicAxes,
      availableOverviewAxes: Object.freeze([]),
      missingOverviewAxes: candidate.requiredPublicAxes,
      contexts: Object.freeze([
        createResearchContextAudit('ground'),
        createResearchContextAudit('aerial'),
      ]),
      authorityFieldPaths: Object.freeze([]),
      structuralGaps: structuralGaps(candidate),
      implementationStatus: 'missing',
      status: 'needs-definition',
    });
  }

  const equipmentDefinition = STAGE4_EQUIPMENT_DEFINITIONS.find(({ id }) => (
    id === candidate.productionEquipmentDefinitionId
  ));
  if (!equipmentDefinition) {
    throw new RangeError(`生产候选缺少 EquipmentDefinition：${candidate.candidateId}`);
  }
  const actionDefinitionIds = [
    equipmentDefinition.actionDefinitionId,
    equipmentDefinition.aerialActionDefinitionId,
  ];
  for (const actionDefinitionId of actionDefinitionIds) {
    if (!STAGE4_ACTION_DEFINITIONS.some(({ id }) => id === actionDefinitionId)) {
      throw new RangeError(`生产候选缺少 ActionDefinition：${actionDefinitionId}`);
    }
  }
  const groundTuning = resolveAttackTuning(equipmentDefinition.actionDefinitionId);
  const availableOverviewAxes = Object.freeze(candidate.requiredPublicAxes.filter((axisId) => (
    groundTuning !== null && hasAxisValue(groundTuning, axisId)
  )));
  const contexts = Object.freeze([
    createProductionContextAudit(equipmentDefinition.actionDefinitionId),
    createProductionContextAudit(equipmentDefinition.aerialActionDefinitionId),
  ]);
  const authorityFieldPaths = Object.freeze(candidate.requiredPublicAxes.map((axisId) => {
    const source = authoritySourceByAxisId.get(axisId);
    if (!source) throw new RangeError(`公开数值轴缺少权威来源：${axisId}`);
    return source.sourceFieldPath;
  }));
  const missingOverviewAxes = Object.freeze(candidate.requiredPublicAxes.filter((axisId) => (
    !availableOverviewAxes.includes(axisId)
  )));
  const contextMissing = contexts.some(({ missingAxes }) => missingAxes.length > 0);
  return Object.freeze({
    candidateId: candidate.candidateId,
    displayName: candidate.displayName,
    languageId: candidate.languageId,
    source: candidate.source,
    productionEquipmentDefinitionId: equipmentDefinition.id,
    candidateEquipmentDefinitionId: null,
    groundActionDefinitionId: equipmentDefinition.actionDefinitionId,
    aerialActionDefinitionId: equipmentDefinition.aerialActionDefinitionId,
    requiredOverviewAxes: candidate.requiredPublicAxes,
    availableOverviewAxes,
    missingOverviewAxes,
    contexts,
    authorityFieldPaths,
    structuralGaps: Object.freeze([]),
    implementationStatus: 'production-authority',
    status: missingOverviewAxes.length === 0 && !contextMissing ? 'ready' : 'needs-definition',
  });
}

export const ARENA_V2_WEAPON_DEFINITION_MIGRATION_AUDITS = Object.freeze(
  ARENA_V2_WEAPON_LAUNCH_CANDIDATES.map(createMigrationAudit),
);
