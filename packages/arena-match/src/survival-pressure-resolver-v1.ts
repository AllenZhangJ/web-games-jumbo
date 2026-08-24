import {
  assertIntegerAtLeast,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  createSurvivalPressurePolicyDefinition,
  type SurvivalPressurePolicyDefinition,
} from '@number-strategy-jump/arena-definitions';

export const SURVIVAL_PRESSURE_RESOLUTION_V1_SCHEMA_VERSION = 1 as const;

export interface SurvivalPressureActiveSlotResolutionV1 {
  readonly activationOrdinal: number;
  readonly slotId: string;
  readonly anchorCapabilityId: string;
}

export interface SurvivalPressureResolutionV1 {
  readonly schemaVersion: typeof SURVIVAL_PRESSURE_RESOLUTION_V1_SCHEMA_VERSION;
  readonly pressurePolicyDefinitionId: string;
  readonly activeTick: number;
  readonly stage: number;
  readonly stageStartActiveTick: number;
  readonly nextStageStartActiveTick: number | null;
  readonly desiredActiveEnemySlots: number;
  readonly reactivationDelayTicks: number;
  readonly activeSlots: readonly SurvivalPressureActiveSlotResolutionV1[];
  readonly contentHash: string;
}

export class SurvivalPressureResolverV1 {
  readonly #policy: SurvivalPressurePolicyDefinition;
  readonly #contentHash: string;
  readonly #entryBySlotId: ReadonlyMap<string, Readonly<{
    readonly slotId: string;
    readonly anchorCapabilityId: string;
  }>>;

  constructor(value: unknown) {
    this.#policy = createSurvivalPressurePolicyDefinition(value);
    this.#contentHash = createDeterministicDataHash(
      this.#policy,
      'SurvivalPressureResolverV1 policy',
    );
    this.#entryBySlotId = new Map(
      this.#policy.slotEntries.map((entry) => [entry.slotId, entry]),
    );
  }

  get definitionId(): string { return this.#policy.id; }
  get contentHash(): string { return this.#contentHash; }

  resolve(activeTickValue: unknown): SurvivalPressureResolutionV1 {
    const activeTick = assertIntegerAtLeast(
      activeTickValue,
      0,
      'SurvivalPressureResolverV1.activeTick',
    );
    if (!Number.isSafeInteger(activeTick)) {
      throw new RangeError('SurvivalPressureResolverV1.activeTick必须是安全整数。');
    }
    let stageIndex = 0;
    for (let index = 1; index < this.#policy.stages.length; index += 1) {
      if (this.#policy.stages[index]!.startActiveTick > activeTick) break;
      stageIndex = index;
    }
    const stage = this.#policy.stages[stageIndex]!;
    const nextStage = this.#policy.stages[stageIndex + 1] ?? null;
    const activeSlots = this.#policy.slotActivationOrder
      .slice(0, stage.desiredActiveEnemySlots)
      .map((slotId, activationOrdinal) => {
        const entry = this.#entryBySlotId.get(slotId);
        if (!entry) throw new Error(`Survival pressure slot ${slotId} 缺少绑定。`);
        return Object.freeze({
          activationOrdinal,
          slotId,
          anchorCapabilityId: entry.anchorCapabilityId,
        });
      });
    const authority = Object.freeze({
      schemaVersion: SURVIVAL_PRESSURE_RESOLUTION_V1_SCHEMA_VERSION,
      pressurePolicyDefinitionId: this.#policy.id,
      activeTick,
      stage: stage.stage,
      stageStartActiveTick: stage.startActiveTick,
      nextStageStartActiveTick: nextStage?.startActiveTick ?? null,
      desiredActiveEnemySlots: stage.desiredActiveEnemySlots,
      reactivationDelayTicks: stage.reactivationDelayTicks,
      activeSlots: Object.freeze(activeSlots),
    });
    return Object.freeze({
      ...authority,
      contentHash: createDeterministicDataHash(
        { policyHash: this.#contentHash, authority },
        'SurvivalPressureResolutionV1',
      ),
    });
  }
}
