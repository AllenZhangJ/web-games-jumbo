export interface LaunchableGame {
  start(): unknown | Promise<unknown>;
  destroy?(): void;
}

export interface StartupRoot {
  __NUMBER_STRATEGY_GAME__?: LaunchableGame | null;
}

export interface LaunchGameOptions<TPlatform, TGame extends LaunchableGame, TOptions = unknown> {
  readonly root?: StartupRoot;
  readonly createGame?: (platform: TPlatform, options?: TOptions) => TGame;
  readonly gameOptions?: TOptions;
  readonly onError?: (error: unknown) => void;
  readonly onSuccess?: (game: TGame) => void;
}

interface StartupState {
  generation: number;
  game: LaunchableGame | null;
  starting: LaunchableGame | null;
}

const startupStates = new WeakMap<StartupRoot, StartupState>();

function coordinator(root: StartupRoot): StartupState {
  const current = startupStates.get(root);
  if (current) return current;
  const state = { generation: 0, game: null, starting: null };
  startupStates.set(root, state);
  return state;
}

function safeDestroy(game: LaunchableGame | null | undefined): void {
  if (!game) return;
  try {
    game.destroy?.();
  } catch {
    // A broken cleanup must not prevent a replacement instance from starting.
  }
}

function exposeGame(root: StartupRoot, game: LaunchableGame | null): void {
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
export function launchGame<TPlatform, TGame extends LaunchableGame, TOptions = unknown>(
  createPlatform: (() => TPlatform | Promise<TPlatform>) | unknown,
  {
    root = globalThis as StartupRoot,
    createGame,
    gameOptions,
    onError,
    onSuccess,
  }: LaunchGameOptions<TPlatform, TGame, TOptions> = {},
): Promise<TGame | null> {
  const platformFactory = typeof createPlatform === 'function'
    ? createPlatform as () => TPlatform | Promise<TPlatform>
    : () => { throw new TypeError('launchGame 需要 createPlatform 函数'); };
  const gameFactory = typeof createGame === 'function'
    ? createGame
    : () => { throw new TypeError('launchGame 需要由入口注入 createGame 组合根'); };
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

  const run = async (): Promise<TGame | null> => {
    if (generation !== state.generation) return null;
    let game: TGame | null = null;
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

export function stopLaunchedGame(root: StartupRoot = globalThis as StartupRoot): void {
  const state = coordinator(root);
  state.generation += 1;
  const game = state.game;
  state.game = null;
  safeDestroy(game);
  if (state.starting && state.starting !== game) safeDestroy(state.starting);
  state.starting = null;
  exposeGame(root, null);
}
