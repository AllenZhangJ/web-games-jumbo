import { QuickMatchService } from '../../matchmaking/quick-match-service.js';
import { ARENA_V1_BALANCE_DEFINITION } from '../../content/arena-v1-balance.js';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_V1_PLAYER_PROFILE_DEFINITION } from '../content/arena-v1-player-profile-definition.js';
import {
  ARENA_V1_CONTENT_REPLACEMENT_REGISTRY,
  ARENA_V1_MATCH_CONTENT_CATALOG,
  ARENA_V1_MATCH_CONTENT_POOL_DEFINITION,
} from '../content/arena-v1-match-content.js';
import { MatchContentPoolResolver } from '../content-pool/match-content-pool-resolver.js';
import { ProfileContentPoolProvider } from '../content-pool/profile-content-pool-provider.js';
import {
  ARENA_V1_MATCH_REWARD_ID,
  ARENA_V1_PROGRESSION_REGISTRY,
} from '../content/arena-v1-progression-content.js';
import { ProductMatchCoordinator } from '../matchmaking/product-match-coordinator.js';
import { QuickMatchProductFactory } from '../matchmaking/quick-match-product-factory.js';
import { PlayerProfileRepository } from '../persistence/player-profile-repository.js';
import { PlayerProfileService } from '../profile/player-profile-service.js';
import { RewardCommitter } from '../progression/reward-committer.js';
import { ProductSessionStateMachine } from '@number-strategy-jump/arena-product-state';
import { ProductSessionController } from './product-session-controller.js';

function validateDiagnosticSink(value) {
  if (value !== null && typeof value !== 'function') {
    throw new TypeError('Arena V1 Product diagnosticSink 必须是函数。');
  }
  return value;
}

function report(sink, value) {
  try {
    sink?.(Object.freeze(value));
  } catch {
    // Diagnostics cannot gain ownership of product or match lifecycle.
  }
}

function createProductMatchConfig(value) {
  const overrides = value === undefined
    ? Object.freeze({})
    : cloneFrozenData(value, 'Arena V1 Product matchConfig');
  assertPlainRecord(overrides, 'Arena V1 Product matchConfig');
  return cloneFrozenData({
    ...ARENA_V1_BALANCE_DEFINITION.matchConfig,
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
    ...overrides,
    // Product gameplay owns a dedicated attack button and a dedicated jump
    // button. Never allow a caller override to restore the retired contextual
    // primary behavior, because that behavior gates attacks on nearby targets.
    contextPrimaryMobilityEnabled: false,
  }, 'Arena V1 Product resolved matchConfig');
}

function cleanupOwned(values) {
  const errors = [];
  for (const value of values) {
    if (!value || typeof value.destroy !== 'function') continue;
    try {
      value.destroy();
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

export function createArenaV1ProductSession({
  storage,
  ownerId,
  profileLeaseHolderId = ownerId,
  wallNow,
  seedSource,
  matchConfig,
  matchCompletionSink = null,
  keyPrefix,
  profileLeaseTakeoverSameOwner = false,
  diagnosticSink = null,
} = {}) {
  const sink = validateDiagnosticSink(diagnosticSink);
  const resolvedMatchConfig = createProductMatchConfig(matchConfig);
  if (!seedSource || typeof seedSource.nextSeed !== 'function') {
    throw new TypeError('Arena V1 Product 需要 match seedSource.nextSeed()。');
  }

  let repository = null;
  let profileService = null;
  let matchCoordinator = null;
  let controller = null;
  try {
    repository = new PlayerProfileRepository({
      definition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
      storage,
      ownerId,
      leaseHolderId: profileLeaseHolderId,
      wallNow,
      keyPrefix,
      leaseTakeoverSameOwner: profileLeaseTakeoverSameOwner,
    });
    profileService = new PlayerProfileService({
      definition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
      repository,
    });
    repository = null;

    const contentPoolResolver = new MatchContentPoolResolver({
      definition: ARENA_V1_MATCH_CONTENT_POOL_DEFINITION,
      catalog: ARENA_V1_MATCH_CONTENT_CATALOG,
      replacementRegistry: ARENA_V1_CONTENT_REPLACEMENT_REGISTRY,
      profileDefinition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    });
    const contentPoolProvider = new ProfileContentPoolProvider({
      profileService,
      resolver: contentPoolResolver,
    });
    const quickMatchService = new QuickMatchService({
      seedSource,
      contentPoolProvider,
      diagnosticSink: (detail) => report(sink, { type: 'match-assignment', detail }),
    });
    const matchFactory = new QuickMatchProductFactory({
      quickMatchService,
      matchConfig: resolvedMatchConfig,
      completionSink: matchCompletionSink,
    });
    matchCoordinator = new ProductMatchCoordinator({ matchFactory });
    const rewardCommitter = new RewardCommitter({
      registry: ARENA_V1_PROGRESSION_REGISTRY,
      rewardDefinitionId: ARENA_V1_MATCH_REWARD_ID,
      profileDefinition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
      profileService,
    });
    controller = new ProductSessionController({
      stateMachine: new ProductSessionStateMachine(),
      profileService,
      matchCoordinator,
      rewardCommitter,
      diagnosticSink: (detail) => report(sink, { type: 'product-lifecycle', detail }),
    });
    profileService = null;
    matchCoordinator = null;
    return controller;
  } catch (error) {
    const cleanupErrors = cleanupOwned([
      controller,
      matchCoordinator,
      profileService,
      repository,
    ]);
    throw combineCleanupFailure(
      normalizeThrownError(error, 'Arena V1 Product 组合失败'),
      cleanupErrors,
      'Arena V1 Product 组合失败且清理未完整完成。',
    );
  }
}
