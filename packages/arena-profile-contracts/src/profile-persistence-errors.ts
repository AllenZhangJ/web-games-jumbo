class PlayerProfilePersistenceError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class PlayerProfileFutureSchemaError extends PlayerProfilePersistenceError {
  constructor(message = 'PlayerProfile 存档来自未来版本，当前版本拒绝覆盖。') {
    super(message, 'PLAYER_PROFILE_FUTURE_SCHEMA');
  }
}

export class PlayerProfileRepositoryBusyError extends PlayerProfilePersistenceError {
  constructor(message = 'PlayerProfile 数据正被另一个页面占用。') {
    super(message, 'PLAYER_PROFILE_REPOSITORY_BUSY');
  }
}

export class PlayerProfileSaveConflictError extends PlayerProfilePersistenceError {
  constructor(message = 'PlayerProfile 双槽存档发生冲突。') {
    super(message, 'PLAYER_PROFILE_SAVE_CONFLICT');
  }
}

export class PlayerProfileIndeterminateWriteError extends PlayerProfilePersistenceError {
  constructor(message = 'PlayerProfile 写入结果无法确认，仓储已关闭写入。') {
    super(message, 'PLAYER_PROFILE_INDETERMINATE_WRITE');
  }
}

class ArenaV2LearningProfilePersistenceError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class ArenaV2LearningProfileFutureSchemaError
  extends ArenaV2LearningProfilePersistenceError {
  constructor(message = 'Arena V2学习档案来自未来版本，当前候选拒绝覆盖。') {
    super(message, 'ARENA_V2_LEARNING_PROFILE_FUTURE_SCHEMA');
  }
}

export class ArenaV2LearningProfileRepositoryBusyError
  extends ArenaV2LearningProfilePersistenceError {
  constructor(message = 'Arena V2学习档案正被另一个持有者占用。') {
    super(message, 'ARENA_V2_LEARNING_PROFILE_REPOSITORY_BUSY');
  }
}

export class ArenaV2LearningProfileSaveConflictError
  extends ArenaV2LearningProfilePersistenceError {
  constructor(message = 'Arena V2学习档案双槽出现同generation不同payload。') {
    super(message, 'ARENA_V2_LEARNING_PROFILE_SAVE_CONFLICT');
  }
}

export class ArenaV2LearningProfileIndeterminateWriteError
  extends ArenaV2LearningProfilePersistenceError {
  constructor(message = 'Arena V2学习档案写入结果无法确认，仓储已失败关闭。') {
    super(message, 'ARENA_V2_LEARNING_PROFILE_INDETERMINATE_WRITE');
  }
}
