export const SAVE_FORMAT = 'number-strategy-save' as const;
export const CURRENT_SAVE_VERSION = 3 as const;
export const REPLAY_VERSION = 1 as const;
export const MAX_REPLAY_ACTIONS = 10_000;

export type ReplayAction =
  | { readonly type: 'jump'; readonly choiceIndex: 0 | 1; readonly chargeMs: number }
  | { readonly type: 'restart' }
  | { readonly type: 'next-round' };

export interface GameIdentity {
  readonly seed: number;
  readonly difficulty: { readonly id: string; readonly version: number };
  readonly gameplay: { readonly id: string; readonly version: number };
  readonly task: { readonly id: string; readonly version: number };
}

export interface SaveEnvelope {
  readonly format: typeof SAVE_FORMAT;
  readonly version: typeof CURRENT_SAVE_VERSION;
  readonly savedAtMs: number;
  readonly game: GameIdentity;
  readonly replay: {
    readonly version: typeof REPLAY_VERSION;
    readonly actions: readonly ReplayAction[];
  };
}

interface LegacySaveV1 {
  readonly version: 1;
  readonly seed: number;
  readonly difficultyId: string;
  readonly actions: readonly unknown[];
}

interface LegacySaveV2 {
  readonly format: typeof SAVE_FORMAT;
  readonly version: 2;
  readonly savedAtMs?: number;
  readonly game: {
    readonly seed: number;
    readonly difficultyId: string;
    readonly difficultyVersion?: number;
    readonly gameplayId?: string;
    readonly taskId?: string;
  };
  readonly actions: readonly unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertId(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]*$/.test(value)) {
    throw new TypeError(`${path} 必须是小写短横线标识符。`);
  }
}

function assertVersion(value: unknown, path: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new RangeError(`${path} 必须是正安全整数。`);
  }
}

function parseAction(value: unknown, path: string): ReplayAction {
  if (!isRecord(value) || typeof value.type !== 'string') throw new TypeError(`${path} 无效。`);
  if (value.type === 'restart' || value.type === 'next-round') return { type: value.type };
  if (
    value.type !== 'jump'
    || (value.choiceIndex !== 0 && value.choiceIndex !== 1)
    || !Number.isFinite(value.chargeMs)
    || (value.chargeMs as number) < 0
    || (value.chargeMs as number) > 60_000
  ) throw new TypeError(`${path} 跳跃动作无效。`);
  return {
    type: 'jump',
    choiceIndex: value.choiceIndex,
    chargeMs: value.chargeMs as number,
  };
}

function parseActions(value: unknown): readonly ReplayAction[] {
  if (!Array.isArray(value) || value.length > MAX_REPLAY_ACTIONS) {
    throw new RangeError(`replay.actions 必须是不超过 ${MAX_REPLAY_ACTIONS} 项的数组。`);
  }
  return Object.freeze(value.map((action, index) => Object.freeze(parseAction(action, `actions[${index}]`))));
}

function parseIdentity(value: unknown): GameIdentity {
  if (!isRecord(value)) throw new TypeError('game 必须是对象。');
  if (!Number.isSafeInteger(value.seed)) throw new TypeError('game.seed 必须是安全整数。');
  const parseDefinition = (candidate: unknown, path: string): { readonly id: string; readonly version: number } => {
    if (!isRecord(candidate)) throw new TypeError(`${path} 必须是对象。`);
    assertId(candidate.id, `${path}.id`);
    assertVersion(candidate.version, `${path}.version`);
    return Object.freeze({ id: candidate.id, version: candidate.version });
  };
  return Object.freeze({
    seed: value.seed as number,
    difficulty: parseDefinition(value.difficulty, 'game.difficulty'),
    gameplay: parseDefinition(value.gameplay, 'game.gameplay'),
    task: parseDefinition(value.task, 'game.task'),
  });
}

export function defineSaveEnvelope(value: unknown): SaveEnvelope {
  if (!isRecord(value) || value.format !== SAVE_FORMAT || value.version !== CURRENT_SAVE_VERSION) {
    throw new TypeError(`存档必须是 ${SAVE_FORMAT}@${CURRENT_SAVE_VERSION}。`);
  }
  if (!Number.isFinite(value.savedAtMs) || (value.savedAtMs as number) < 0) {
    throw new TypeError('savedAtMs 必须是非负有限数。');
  }
  if (!isRecord(value.replay) || value.replay.version !== REPLAY_VERSION) {
    throw new TypeError(`replay 必须是版本 ${REPLAY_VERSION}。`);
  }
  return Object.freeze({
    format: SAVE_FORMAT,
    version: CURRENT_SAVE_VERSION,
    savedAtMs: value.savedAtMs as number,
    game: parseIdentity(value.game),
    replay: Object.freeze({
      version: REPLAY_VERSION,
      actions: parseActions(value.replay.actions),
    }),
  });
}

function migrateV1(value: LegacySaveV1): SaveEnvelope {
  return defineSaveEnvelope({
    format: SAVE_FORMAT,
    version: CURRENT_SAVE_VERSION,
    savedAtMs: 0,
    game: {
      seed: value.seed,
      difficulty: { id: value.difficultyId, version: 1 },
      gameplay: { id: 'number-strategy-jump', version: 1 },
      task: { id: 'reach-number', version: 1 },
    },
    replay: { version: REPLAY_VERSION, actions: value.actions },
  });
}

function migrateV2(value: LegacySaveV2): SaveEnvelope {
  return defineSaveEnvelope({
    format: SAVE_FORMAT,
    version: CURRENT_SAVE_VERSION,
    savedAtMs: value.savedAtMs ?? 0,
    game: {
      seed: value.game.seed,
      difficulty: {
        id: value.game.difficultyId,
        version: value.game.difficultyVersion ?? 1,
      },
      gameplay: { id: value.game.gameplayId ?? 'number-strategy-jump', version: 1 },
      task: { id: value.game.taskId ?? 'reach-number', version: 1 },
    },
    replay: { version: REPLAY_VERSION, actions: value.actions },
  });
}

export function migrateSaveEnvelope(value: unknown): SaveEnvelope {
  if (!isRecord(value)) throw new TypeError('存档必须是对象。');
  if (value.version === CURRENT_SAVE_VERSION) return defineSaveEnvelope(value);
  if (value.version === 1) return migrateV1(value as unknown as LegacySaveV1);
  if (value.version === 2 && value.format === SAVE_FORMAT) {
    return migrateV2(value as unknown as LegacySaveV2);
  }
  throw new RangeError(`不支持存档版本：${String(value.version)}。`);
}

export function createSaveEnvelope({
  savedAtMs,
  game,
  actions,
}: {
  readonly savedAtMs: number;
  readonly game: GameIdentity;
  readonly actions: readonly ReplayAction[];
}): SaveEnvelope {
  return defineSaveEnvelope({
    format: SAVE_FORMAT,
    version: CURRENT_SAVE_VERSION,
    savedAtMs,
    game,
    replay: { version: REPLAY_VERSION, actions },
  });
}
