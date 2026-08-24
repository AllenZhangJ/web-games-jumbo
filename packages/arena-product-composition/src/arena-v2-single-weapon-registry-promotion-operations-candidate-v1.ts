import type {
  ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1,
  ArenaV2SingleWeaponRegistryPromotionCoordinatorStateCandidateV1,
} from './arena-v2-single-weapon-registry-promotion-coordinator-candidate-v1.js';

export const ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_OPERATIONS_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export type ArenaV2SingleWeaponRegistryPromotionNextOperationCandidateV1 =
  | 'begin'
  | 'publish-and-promote'
  | 'retry-reference'
  | 'retry-seal'
  | 'close'
  | 'wait'
  | 'none';

export interface ArenaV2SingleWeaponRegistryPromotionOperationsCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly ownerAvailable: boolean;
  readonly promotionState:
    ArenaV2SingleWeaponRegistryPromotionCoordinatorStateCandidateV1 | null;
  readonly activePromotionOwned: boolean;
  readonly nextRequiredOperation:
    ArenaV2SingleWeaponRegistryPromotionNextOperationCandidateV1;
  readonly canBegin: boolean;
  readonly canPublishAndPromote: boolean;
  readonly canRetryReference: boolean;
  readonly canRetrySeal: boolean;
  readonly canRenewLease: boolean;
  readonly canClose: boolean;
  readonly blocksNewMatchCreation: boolean;
  readonly diagnosticReason: string;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
}

export const ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_OPERATIONS_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_OPERATIONS_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.single-weapon-registry-promotion-operations.candidate.v1' as const,
    status: 'production-unreachable' as const,
    source: 'coordinator-readonly-snapshot' as const,
    authorityMutation: false as const,
    ambiguousActionPolicy: 'expose-one-required-operation' as const,
    unresolvedPromotionBlocksMatchCreation: true as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    validationStatus: 'not-run' as const,
  });

function projection(
  ownerAvailable: boolean,
  promotionState:
    ArenaV2SingleWeaponRegistryPromotionCoordinatorStateCandidateV1 | null,
  nextRequiredOperation: ArenaV2SingleWeaponRegistryPromotionNextOperationCandidateV1,
  values: Readonly<{
    canBegin?: boolean;
    canPublishAndPromote?: boolean;
    canRetryReference?: boolean;
    canRetrySeal?: boolean;
    canRenewLease?: boolean;
    canClose?: boolean;
    blocksNewMatchCreation?: boolean;
    diagnosticReason: string;
  }>,
): Readonly<ArenaV2SingleWeaponRegistryPromotionOperationsCandidateV1> {
  return Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_OPERATIONS_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    ownerAvailable,
    promotionState,
    activePromotionOwned: promotionState !== null && promotionState !== 'destroyed',
    nextRequiredOperation,
    canBegin: values.canBegin ?? false,
    canPublishAndPromote: values.canPublishAndPromote ?? false,
    canRetryReference: values.canRetryReference ?? false,
    canRetrySeal: values.canRetrySeal ?? false,
    canRenewLease: values.canRenewLease ?? false,
    canClose: values.canClose ?? false,
    blocksNewMatchCreation: values.blocksNewMatchCreation ?? false,
    diagnosticReason: values.diagnosticReason,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
  });
}

export function projectArenaV2SingleWeaponRegistryPromotionOperationsCandidateV1(
  snapshot: Readonly<
    ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1
  > | null,
  ownerAvailable = true,
): Readonly<ArenaV2SingleWeaponRegistryPromotionOperationsCandidateV1> {
  if (!ownerAvailable) {
    return projection(false, snapshot?.state ?? null, 'none', {
      diagnosticReason: '当前Registry Owner不可用。',
    });
  }
  if (snapshot === null) {
    return projection(true, null, 'begin', {
      canBegin: true,
      diagnosticReason: '可开始一个新的单把武器晋级。',
    });
  }
  if (snapshot.transitioning) {
    return projection(true, snapshot.state, 'wait', {
      canRenewLease: snapshot.state !== 'failed' && snapshot.state !== 'destroyed',
      blocksNewMatchCreation: true,
      diagnosticReason: '当前单把武器晋级操作正在同步执行。',
    });
  }
  switch (snapshot.state) {
    case 'ready':
      return projection(true, snapshot.state, 'publish-and-promote', {
        canPublishAndPromote: true,
        canRenewLease: true,
        canClose: true,
        blocksNewMatchCreation: true,
        diagnosticReason: '准入装配已完成，等待显式发布与晋级。',
      });
    case 'published':
      return projection(true, snapshot.state, 'wait', {
        canRenewLease: true,
        blocksNewMatchCreation: true,
        diagnosticReason: '持久generation已发布，但尚未取得可安全触发的后续操作。',
      });
    case 'activated-reference-stale':
      return projection(true, snapshot.state, 'retry-reference', {
        canRetryReference: true,
        canRenewLease: true,
        blocksNewMatchCreation: true,
        diagnosticReason: 'durable active已切换，必须在原Owner上重试运行时引用交换。',
      });
    case 'reference-promoted-unsealed':
      return projection(true, snapshot.state, 'retry-seal', {
        canRetrySeal: true,
        canRenewLease: true,
        blocksNewMatchCreation: true,
        diagnosticReason: '运行时引用已交换，必须在原Owner上重试封存。',
      });
    case 'rolled-back':
      return projection(true, snapshot.state, 'close', {
        canRenewLease: true,
        canClose: true,
        blocksNewMatchCreation: true,
        diagnosticReason: '本次发布已精确回滚，关闭Owner后可重新装配。',
      });
    case 'promoted':
      return projection(true, snapshot.state, 'close', {
        canRenewLease: true,
        canClose: true,
        blocksNewMatchCreation: true,
        diagnosticReason: '本次晋级已完成，关闭Owner后才能进入新对局或下一把。',
      });
    case 'failed':
      return projection(true, snapshot.state, 'close', {
        canClose: true,
        blocksNewMatchCreation: true,
        diagnosticReason: '晋级已失败关闭，必须先关闭并依持久头重建。',
      });
    case 'destroyed':
      return projection(true, snapshot.state, 'begin', {
        canBegin: true,
        diagnosticReason: '上一个晋级Owner已销毁，可开始新单把。',
      });
  }
}
