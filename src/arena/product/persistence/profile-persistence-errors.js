class PlayerProfilePersistenceError extends Error {
  constructor(message, code) {
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
