export interface ContentMenuEntry {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly description: string;
}

export interface GameplayMenuEntry extends ContentMenuEntry {
  readonly supportedTaskIds: readonly string[];
}

export interface ContentMenuCatalog {
  readonly gameplays: readonly GameplayMenuEntry[];
  readonly tasks: readonly ContentMenuEntry[];
  readonly characters: readonly ContentMenuEntry[];
  readonly qualities: readonly ContentMenuEntry[];
}

export type ContentMenuControl =
  | 'content-menu'
  | 'content-gameplay-prev'
  | 'content-gameplay-next'
  | 'content-task-prev'
  | 'content-task-next'
  | 'content-character-prev'
  | 'content-character-next'
  | 'content-quality-prev'
  | 'content-quality-next'
  | 'content-apply'
  | 'content-close';

export interface ContentMenuSnapshot {
  readonly open: boolean;
  readonly gameplay: ContentMenuEntry & { readonly index: number; readonly total: number };
  readonly task: ContentMenuEntry & { readonly index: number; readonly total: number };
  readonly character: ContentMenuEntry & { readonly index: number; readonly total: number };
  readonly quality: ContentMenuEntry & { readonly index: number; readonly total: number };
}

function validateEntries(entries: readonly ContentMenuEntry[], path: string): void {
  if (!Array.isArray(entries) || entries.length === 0) throw new RangeError(`${path} 不能为空。`);
  const ids = new Set<string>();
  for (const entry of entries) {
    if (
      !entry
      || typeof entry.id !== 'string'
      || !Number.isSafeInteger(entry.version)
      || entry.version <= 0
      || !entry.name?.trim()
      || !entry.description?.trim()
    ) {
      throw new TypeError(`${path} 包含无效内容。`);
    }
    if (ids.has(entry.id)) throw new Error(`${path} 包含重复 ID：${entry.id}`);
    ids.add(entry.id);
  }
}

function cycleIndex(index: number, length: number, delta: -1 | 1): number {
  return (index + delta + length) % length;
}

export class ContentMenuController {
  readonly catalog: ContentMenuCatalog;
  open = false;
  gameplayId: string;
  taskId: string;
  characterId: string;
  qualityId: string;

  constructor({
    catalog,
    gameplayId,
    taskId,
    characterId,
    qualityId,
    open = false,
  }: {
    readonly catalog: ContentMenuCatalog;
    readonly gameplayId: string;
    readonly taskId: string;
    readonly characterId: string;
    readonly qualityId: string;
    readonly open?: boolean;
  }) {
    validateEntries(catalog.gameplays, 'catalog.gameplays');
    validateEntries(catalog.tasks, 'catalog.tasks');
    validateEntries(catalog.characters, 'catalog.characters');
    validateEntries(catalog.qualities, 'catalog.qualities');
    const taskIds = new Set(catalog.tasks.map(({ id }) => id));
    for (const gameplay of catalog.gameplays) {
      if (gameplay.supportedTaskIds.length === 0) {
        throw new RangeError(`玩法 ${gameplay.id} 没有兼容任务。`);
      }
      for (const id of gameplay.supportedTaskIds) {
        if (!taskIds.has(id)) throw new Error(`玩法 ${gameplay.id} 引用了未知任务 ${id}。`);
      }
    }
    this.catalog = catalog;
    this.gameplayId = catalog.gameplays.some(({ id }) => id === gameplayId)
      ? gameplayId
      : catalog.gameplays[0]!.id;
    this.taskId = this.compatibleTasks().some(({ id }) => id === taskId)
      ? taskId
      : this.compatibleTasks()[0]!.id;
    this.characterId = catalog.characters.some(({ id }) => id === characterId)
      ? characterId
      : catalog.characters[0]!.id;
    this.qualityId = catalog.qualities.some(({ id }) => id === qualityId)
      ? qualityId
      : catalog.qualities[0]!.id;
    this.open = open;
  }

  compatibleTasks(): readonly ContentMenuEntry[] {
    const gameplay = this.catalog.gameplays.find(({ id }) => id === this.gameplayId)!;
    const supported = new Set(gameplay.supportedTaskIds);
    return this.catalog.tasks.filter(({ id }) => supported.has(id));
  }

  setOpen(open: boolean): void {
    this.open = open;
  }

  cycle(kind: 'gameplay' | 'task' | 'character' | 'quality', delta: -1 | 1): void {
    if (kind === 'gameplay') {
      const index = this.catalog.gameplays.findIndex(({ id }) => id === this.gameplayId);
      this.gameplayId = this.catalog.gameplays[cycleIndex(index, this.catalog.gameplays.length, delta)]!.id;
      if (!this.compatibleTasks().some(({ id }) => id === this.taskId)) {
        this.taskId = this.compatibleTasks()[0]!.id;
      }
      return;
    }
    const entries = kind === 'task'
      ? this.compatibleTasks()
      : kind === 'character'
        ? this.catalog.characters
        : this.catalog.qualities;
    const currentId = kind === 'task'
      ? this.taskId
      : kind === 'character'
        ? this.characterId
        : this.qualityId;
    const index = entries.findIndex(({ id }) => id === currentId);
    const nextId = entries[cycleIndex(index, entries.length, delta)]!.id;
    if (kind === 'task') this.taskId = nextId;
    else if (kind === 'character') this.characterId = nextId;
    else this.qualityId = nextId;
  }

  snapshot(): ContentMenuSnapshot {
    const withPosition = (entry: ContentMenuEntry, entries: readonly ContentMenuEntry[]) => Object.freeze({
      ...entry,
      index: entries.findIndex(({ id }) => id === entry.id) + 1,
      total: entries.length,
    });
    const gameplay = this.catalog.gameplays.find(({ id }) => id === this.gameplayId)!;
    const tasks = this.compatibleTasks();
    const task = tasks.find(({ id }) => id === this.taskId)!;
    const character = this.catalog.characters.find(({ id }) => id === this.characterId)!;
    const quality = this.catalog.qualities.find(({ id }) => id === this.qualityId)!;
    return Object.freeze({
      open: this.open,
      gameplay: withPosition(gameplay, this.catalog.gameplays),
      task: withPosition(task, tasks),
      character: withPosition(character, this.catalog.characters),
      quality: withPosition(quality, this.catalog.qualities),
    });
  }
}
