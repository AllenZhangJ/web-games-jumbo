import { QuickMatchService } from '../../matchmaking/quick-match-service.js';
import {
  combineCleanupFailure,
  normalizeThrownError,
} from '../../lifecycle-error.js';
import { ARENA_V1_PLAYER_PROFILE_DEFINITION } from '../content/arena-v1-player-profile-definition.js';
import { ProductMatchCoordinator } from '../matchmaking/product-match-coordinator.js';
import { QuickMatchProductFactory } from '../matchmaking/quick-match-product-factory.js';
import { PlayerProfileRepository } from '../persistence/player-profile-repository.js';
import { PlayerProfileSelectionService } from '../profile/player-profile-selection-service.js';
import { ProductSessionStateMachine } from '../state/product-session-state-machine.js';
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
  wallNow,
  seedSource,
  matchConfig = {},
  keyPrefix,
  diagnosticSink = null,
} = {}) {
  const sink = validateDiagnosticSink(diagnosticSink);
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
      wallNow,
      keyPrefix,
    });
    profileService = new PlayerProfileSelectionService({
      definition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
      repository,
    });
    repository = null;

    const quickMatchService = new QuickMatchService({
      seedSource,
      diagnosticSink: (detail) => report(sink, { type: 'match-assignment', detail }),
    });
    const matchFactory = new QuickMatchProductFactory({ quickMatchService, matchConfig });
    matchCoordinator = new ProductMatchCoordinator({ matchFactory });
    controller = new ProductSessionController({
      stateMachine: new ProductSessionStateMachine(),
      profileService,
      matchCoordinator,
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
