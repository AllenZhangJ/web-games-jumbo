import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2WeaponResearchOverviewMatrix,
  type ArenaV2WeaponResearchOverviewContextId,
  type ArenaV2WeaponResearchOverviewMatrix,
  type ArenaV2WeaponResearchOverviewRow,
  type ArenaV2WeaponResearchOverviewStat,
} from './arena-v2-weapon-research-overview-prototype.js';
import type { ArenaV2WeaponPublicAxisId } from './arena-v2-weapon-public-axis-contract.js';

export const ARENA_V2_WEAPON_READABILITY_TASK_SCHEMA_VERSION = 1 as const;

export type ArenaV2WeaponReadabilityTaskKind =
  | 'direct-axis'
  | 'direction-semantics'
  | 'map-choice'
  | 'context-difference';

export type ArenaV2WeaponReadabilityTaskStatus = 'ready' | 'blocked';

export interface ArenaV2WeaponReadabilityOption {
  readonly id: string;
  readonly label: string;
}

export interface ArenaV2WeaponReadabilityEvidenceValue {
  readonly optionId: string;
  readonly value: number | null;
  readonly unit: string | null;
  readonly direction: string | null;
}

export interface ArenaV2WeaponReadabilityTask {
  readonly id: string;
  readonly kind: ArenaV2WeaponReadabilityTaskKind;
  readonly prompt: string;
  readonly status: ArenaV2WeaponReadabilityTaskStatus;
  readonly contextId: ArenaV2WeaponResearchOverviewContextId | null;
  readonly axisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly options: readonly ArenaV2WeaponReadabilityOption[];
  /** Operator-only answer; never pass this object directly to a participant renderer. */
  readonly expectedOptionId: string | null;
  /** Operator-only context answer for tasks that compare ground/aerial values. */
  readonly expectedContextId: ArenaV2WeaponResearchOverviewContextId | null;
  /** Operator-only axes that must appear in a map/context explanation. */
  readonly expectedReasonAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly evidence: readonly ArenaV2WeaponReadabilityEvidenceValue[];
  readonly blockedReason: string | null;
}

export interface ArenaV2WeaponReadabilityParticipantTask {
  readonly id: string;
  readonly kind: ArenaV2WeaponReadabilityTaskKind;
  readonly prompt: string;
  readonly status: ArenaV2WeaponReadabilityTaskStatus;
  readonly contextId: ArenaV2WeaponResearchOverviewContextId | null;
  readonly axisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly options: readonly ArenaV2WeaponReadabilityOption[];
}

export interface ArenaV2WeaponReadabilityTaskSet {
  readonly schemaVersion: typeof ARENA_V2_WEAPON_READABILITY_TASK_SCHEMA_VERSION;
  readonly sourceMatrixHash: string;
  readonly taskSetHash: string;
  readonly sourceWeaponIds: readonly string[];
  readonly tasks: readonly ArenaV2WeaponReadabilityTask[];
  readonly participantReady: boolean;
}

export interface ArenaV2WeaponReadabilityAttemptAnswer {
  readonly taskId: string;
  readonly selectedOptionId: string | null;
  readonly selectedContextId?: ArenaV2WeaponResearchOverviewContextId | null;
  readonly reasonAxisIds?: readonly ArenaV2WeaponPublicAxisId[];
}

export interface ArenaV2WeaponReadabilityTaskResult {
  readonly taskId: string;
  readonly selectionCorrect: boolean;
  readonly contextCorrect: boolean;
  readonly reasonCorrect: boolean;
  readonly passed: boolean;
}

export interface ArenaV2WeaponReadabilityAttemptReport {
  readonly schemaVersion: typeof ARENA_V2_WEAPON_READABILITY_TASK_SCHEMA_VERSION;
  readonly taskSetHash: string;
  readonly status: 'evaluated' | 'blocked';
  readonly answeredTaskCount: number;
  readonly readyTaskCount: number;
  readonly passedTaskCount: number;
  readonly passRate: number;
  readonly results: readonly ArenaV2WeaponReadabilityTaskResult[];
}

function freezeOption(id: string, label: string): ArenaV2WeaponReadabilityOption {
  return Object.freeze({ id, label });
}

function contextFor(
  row: ArenaV2WeaponResearchOverviewRow,
  contextId: ArenaV2WeaponResearchOverviewContextId,
) {
  const context = row.contexts.find(({ id }) => id === contextId);
  if (!context) throw new RangeError(`研究可读性任务缺少上下文：${row.weaponId}/${contextId}`);
  return context;
}

function statFor(
  row: ArenaV2WeaponResearchOverviewRow,
  contextId: ArenaV2WeaponResearchOverviewContextId,
  axisId: ArenaV2WeaponPublicAxisId,
): ArenaV2WeaponResearchOverviewStat {
  const stat = contextFor(row, contextId).stats.find(({ id }) => id === axisId);
  if (!stat) throw new RangeError(`研究可读性任务缺少数值轴：${row.weaponId}/${contextId}/${axisId}`);
  return stat;
}

function weaponOptions(
  rows: readonly ArenaV2WeaponResearchOverviewRow[],
): readonly ArenaV2WeaponReadabilityOption[] {
  return Object.freeze(rows.map(({ weaponId, displayName }) => freezeOption(weaponId, displayName)));
}

function evidenceFor(
  rows: readonly ArenaV2WeaponResearchOverviewRow[],
  contextId: ArenaV2WeaponResearchOverviewContextId,
  axisId: ArenaV2WeaponPublicAxisId,
): readonly ArenaV2WeaponReadabilityEvidenceValue[] {
  return Object.freeze(rows.map((row) => {
    const stat = statFor(row, contextId, axisId);
    return Object.freeze({
      optionId: row.weaponId,
      value: stat.value,
      unit: stat.unit,
      direction: stat.direction,
    });
  }));
}

function uniqueWinner(
  rows: readonly ArenaV2WeaponResearchOverviewRow[],
  contextId: ArenaV2WeaponResearchOverviewContextId,
  axisId: ArenaV2WeaponPublicAxisId,
  direction: 'max' | 'min',
): string | null {
  const values = rows.map((row) => ({
    weaponId: row.weaponId,
    value: statFor(row, contextId, axisId).value,
  }));
  const target = direction === 'max'
    ? Math.max(...values.map(({ value }) => value))
    : Math.min(...values.map(({ value }) => value));
  const winners = values.filter(({ value }) => value === target);
  return winners.length === 1 ? winners[0]!.weaponId : null;
}

function taskWithWinner({
  id,
  kind,
  prompt,
  contextId,
  axisIds,
  rows,
  expectedOptionId,
  expectedReasonAxisIds = [],
}: Readonly<{
  id: string;
  kind: ArenaV2WeaponReadabilityTaskKind;
  prompt: string;
  contextId: ArenaV2WeaponResearchOverviewContextId;
  axisIds: readonly ArenaV2WeaponPublicAxisId[];
  rows: readonly ArenaV2WeaponResearchOverviewRow[];
  expectedOptionId: string | null;
  expectedReasonAxisIds?: readonly ArenaV2WeaponPublicAxisId[];
}>): ArenaV2WeaponReadabilityTask {
  const blockedReason = expectedOptionId === null
    ? `当前研究矩阵的 ${axisIds.join('、')} 没有唯一答案，不能进入真人任务。`
    : null;
  return Object.freeze({
    id,
    kind,
    prompt,
    status: blockedReason === null ? 'ready' : 'blocked',
    contextId,
    axisIds: Object.freeze([...axisIds]),
    options: weaponOptions(rows),
    expectedOptionId,
    expectedContextId: null,
    expectedReasonAxisIds: Object.freeze([...expectedReasonAxisIds]),
    evidence: Object.freeze(axisIds.flatMap((axisId) => evidenceFor(rows, contextId, axisId))),
    blockedReason,
  });
}

function createTasks(rows: readonly ArenaV2WeaponResearchOverviewRow[]): readonly ArenaV2WeaponReadabilityTask[] {
  const groundRange = taskWithWinner({
    id: 'ground-range-highest',
    kind: 'direct-axis',
    prompt: '只看地面动作，哪把武器的有效距离最高？',
    contextId: 'ground',
    axisIds: ['range'],
    rows,
    expectedOptionId: uniqueWinner(rows, 'ground', 'range', 'max'),
  });
  const groundCoverage = taskWithWinner({
    id: 'ground-coverage-highest',
    kind: 'direct-axis',
    prompt: '只看地面动作，哪把武器的覆盖宽度最高？',
    contextId: 'ground',
    axisIds: ['coverage'],
    rows,
    expectedOptionId: uniqueWinner(rows, 'ground', 'coverage', 'max'),
  });
  const riskTask = Object.freeze({
    id: 'ground-risk-direction',
    kind: 'direction-semantics',
    prompt: '看到“自身位移风险”时，哪种方向语义正确？',
    status: 'ready',
    contextId: 'ground',
    axisIds: Object.freeze(['self-movement'] as const),
    options: Object.freeze([
      freezeOption('higher-is-risk', '数值越高，风险越大'),
      freezeOption('higher-is-better', '数值越高，收益越大'),
    ]),
    expectedOptionId: 'higher-is-risk',
    expectedContextId: null,
    expectedReasonAxisIds: Object.freeze([]),
    evidence: evidenceFor(rows, 'ground', 'self-movement'),
    blockedReason: null,
  } satisfies ArenaV2WeaponReadabilityTask);
  const edgeChoice = taskWithWinner({
    id: 'ground-narrow-edge-choice',
    kind: 'map-choice',
    prompt: '在窄路边缘优先选择哪把武器？请至少指出一个数值理由。',
    contextId: 'ground',
    axisIds: ['impact', 'recovery'],
    rows,
    expectedOptionId: uniqueWinner(rows, 'ground', 'impact', 'max'),
    expectedReasonAxisIds: ['impact'],
  });
  const contextValues = rows.map((row) => {
    const ground = statFor(row, 'ground', 'range').value;
    const aerial = statFor(row, 'aerial', 'range').value;
    return { weaponId: row.weaponId, difference: Math.abs(ground - aerial) };
  });
  const contextMaximum = Math.max(...contextValues.map(({ difference }) => difference));
  const contextWinners = contextValues.filter(({ difference }) => difference === contextMaximum);
  const contextTask = Object.freeze({
    id: 'ground-aerial-range-difference',
    kind: 'context-difference',
    prompt: '哪把武器的地面与空中有效距离差异最大？并指出数值较高的上下文。',
    status: contextWinners.length === 1 ? 'ready' : 'blocked',
    contextId: null,
    axisIds: Object.freeze(['range'] as const),
    options: weaponOptions(rows),
    expectedOptionId: contextWinners.length === 1 ? contextWinners[0]!.weaponId : null,
    expectedContextId: contextWinners.length === 1
      ? (statFor(rows.find(({ weaponId }) => weaponId === contextWinners[0]!.weaponId)!, 'ground', 'range').value
        >= statFor(rows.find(({ weaponId }) => weaponId === contextWinners[0]!.weaponId)!, 'aerial', 'range').value
        ? 'ground' : 'aerial')
      : null,
    expectedReasonAxisIds: Object.freeze(['range'] as const),
    evidence: Object.freeze(rows.flatMap((row) => [
      ...evidenceFor([row], 'ground', 'range'),
      ...evidenceFor([row], 'aerial', 'range'),
    ])),
    blockedReason: contextWinners.length === 1
      ? null
      : '当前研究矩阵的地面/空中有效距离差异没有唯一答案，不能进入真人任务。',
  } satisfies ArenaV2WeaponReadabilityTask);
  return Object.freeze([groundRange, groundCoverage, riskTask, edgeChoice, contextTask]);
}

function taskSetCore(
  sourceMatrixHash: string,
  sourceWeaponIds: readonly string[],
  tasks: readonly ArenaV2WeaponReadabilityTask[],
) {
  return Object.freeze({
    schemaVersion: ARENA_V2_WEAPON_READABILITY_TASK_SCHEMA_VERSION,
    sourceMatrixHash,
    sourceWeaponIds: Object.freeze([...sourceWeaponIds]),
    tasks: Object.freeze(tasks.map((task) => Object.freeze({
      id: task.id,
      kind: task.kind,
      prompt: task.prompt,
      status: task.status,
      contextId: task.contextId,
      axisIds: task.axisIds,
      options: task.options,
    }))),
  });
}

export function createArenaV2WeaponReadabilityTaskSet(
  matrix: ArenaV2WeaponResearchOverviewMatrix = createArenaV2WeaponResearchOverviewMatrix(),
): ArenaV2WeaponReadabilityTaskSet {
  const sourceMatrixHash = createDeterministicDataHash(matrix, 'Arena V2 weapon research overview');
  const tasks = createTasks(matrix.rows);
  const core = taskSetCore(sourceMatrixHash, matrix.rows.map(({ weaponId }) => weaponId), tasks);
  return Object.freeze({
    ...core,
    taskSetHash: createDeterministicDataHash(core, 'Arena V2 weapon readability task set'),
    tasks,
    participantReady: tasks.every(({ status }) => status === 'ready'),
  });
}

export function projectArenaV2WeaponReadabilityParticipantTasks(
  taskSet: ArenaV2WeaponReadabilityTaskSet,
): readonly ArenaV2WeaponReadabilityParticipantTask[] {
  return Object.freeze(taskSet.tasks.map((task) => Object.freeze({
    id: task.id,
    kind: task.kind,
    prompt: task.prompt,
    status: task.status,
    contextId: task.contextId,
    axisIds: task.axisIds,
    options: task.options,
  })));
}

export function evaluateArenaV2WeaponReadabilityAttempt(
  taskSet: ArenaV2WeaponReadabilityTaskSet,
  answers: readonly ArenaV2WeaponReadabilityAttemptAnswer[],
): ArenaV2WeaponReadabilityAttemptReport {
  if (!taskSet.participantReady) {
    return Object.freeze({
      schemaVersion: ARENA_V2_WEAPON_READABILITY_TASK_SCHEMA_VERSION,
      taskSetHash: taskSet.taskSetHash,
      status: 'blocked',
      answeredTaskCount: 0,
      readyTaskCount: taskSet.tasks.filter(({ status }) => status === 'ready').length,
      passedTaskCount: 0,
      passRate: 0,
      results: Object.freeze([]),
    });
  }
  const taskById = new Map(taskSet.tasks.map((task) => [task.id, task]));
  const seen = new Set<string>();
  for (const answer of answers) {
    if (seen.has(answer.taskId)) throw new RangeError(`研究可读性答案重复：${answer.taskId}`);
    if (!taskById.has(answer.taskId)) throw new RangeError(`研究可读性答案未知任务：${answer.taskId}`);
    seen.add(answer.taskId);
  }
  const results = Object.freeze(taskSet.tasks.map((task) => {
    const answer = answers.find(({ taskId }) => taskId === task.id);
    const selectionCorrect = (answer?.selectedOptionId ?? null) === task.expectedOptionId;
    const contextCorrect = (answer?.selectedContextId ?? null) === task.expectedContextId;
    const reasonIds = new Set(answer?.reasonAxisIds ?? []);
    const reasonCorrect = task.expectedReasonAxisIds.every((axisId) => reasonIds.has(axisId));
    return Object.freeze({
      taskId: task.id,
      selectionCorrect,
      contextCorrect,
      reasonCorrect,
      passed: task.status === 'ready' && selectionCorrect && contextCorrect && reasonCorrect,
    });
  }));
  const readyTaskCount = taskSet.tasks.filter(({ status }) => status === 'ready').length;
  const passedTaskCount = results.filter(({ passed }) => passed).length;
  return Object.freeze({
    schemaVersion: ARENA_V2_WEAPON_READABILITY_TASK_SCHEMA_VERSION,
    taskSetHash: taskSet.taskSetHash,
    status: 'evaluated',
    answeredTaskCount: answers.filter(({ taskId }) => taskById.has(taskId)).length,
    readyTaskCount,
    passedTaskCount,
    passRate: readyTaskCount === 0 ? 0 : passedTaskCount / readyTaskCount,
    results,
  });
}
