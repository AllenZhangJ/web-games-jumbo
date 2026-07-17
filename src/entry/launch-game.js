const STARTUP_STATE = Symbol.for('number-strategy-jump.startup-state');

function coordinator(root) {
  let state = root[STARTUP_STATE];
  if (!state || typeof state !== 'object') {
    state = {
      generation: 0,
      game: null,
      starting: null,
    };
    root[STARTUP_STATE] = state;
  }
  return state;
}

function safeDestroy(game) {
  if (!game) return;
  try {
    game.destroy?.();
  } catch {
    // A broken cleanup must not prevent a replacement instance from starting.
  }
}

function exposeGame(root, game) {
  try {
    root.__NUMBER_STRATEGY_GAME__ = game;
  } catch {
    // Debug exposure is optional and must never decide whether startup succeeds.
  }
}

/**
 * Serializes entry startup across HMR/re-evaluation and converts synchronous
 * platform/renderer failures into a handled result. A stale async launch is
 * always destroyed before a newer generation is allowed to start.
 */
export function launchGame(createPlatform, {
  root = globalThis,
  createGame,
  gameOptions,
  onError,
  onSuccess,
} = {}) {
  const platformFactory = typeof createPlatform === 'function'
    ? createPlatform
    : () => { throw new TypeError('launchGame 需要 createPlatform 函数'); };
  const gameFactory = typeof createGame === 'function'
    ? createGame
    : () => { throw new TypeError('launchGame 需要 createGame 函数'); };
  const state = coordinator(root);
  const generation = state.generation + 1;
  state.generation = generation;

  const previous = state.game ?? root.__NUMBER_STRATEGY_GAME__;
  state.game = null;
  if (previous) {
    safeDestroy(previous);
    exposeGame(root, null);
  }
  if (state.starting && state.starting !== previous) safeDestroy(state.starting);
  state.starting = null;

  const run = async () => {
    if (generation !== state.generation) return null;
    let game = null;
    try {
      const platform = await platformFactory();
      if (generation !== state.generation) return null;
      game = gameFactory(platform, gameOptions);
      state.starting = game;
      await game.start();
      if (generation !== state.generation) {
        safeDestroy(game);
        return null;
      }
      state.game = game;
      exposeGame(root, game);
      try {
        onSuccess?.(game);
      } catch {
        // UI cleanup after a successful start is non-critical.
      }
      return game;
    } catch (error) {
      safeDestroy(game);
      if (generation === state.generation) {
        state.game = null;
        exposeGame(root, null);
        try {
          onError?.(error);
        } catch {
          // Error presentation itself must not create an unhandled rejection.
        }
      }
      return null;
    } finally {
      if (state.starting === game) state.starting = null;
    }
  };

  return Promise.resolve().then(run);
}

export function stopLaunchedGame(root = globalThis) {
  const state = coordinator(root);
  state.generation += 1;
  const game = state.game;
  state.game = null;
  safeDestroy(game);
  if (state.starting && state.starting !== game) safeDestroy(state.starting);
  state.starting = null;
  exposeGame(root, null);
}
