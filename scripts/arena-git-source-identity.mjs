import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function gitText(cwd, args) {
  const result = await execFileAsync('git', args, { cwd, encoding: 'utf8' });
  return result.stdout.trim();
}

export async function readArenaGitSourceIdentity(cwd) {
  const sourceCommit = await gitText(cwd, ['rev-parse', 'HEAD']);
  const sourceDirty = (await gitText(cwd, ['status', '--porcelain'])) !== '';
  return Object.freeze({ sourceCommit, sourceDirty });
}

export function assertArenaGitSourceIdentityStable(before, after) {
  if (
    before?.sourceCommit !== after?.sourceCommit
    || before?.sourceDirty !== after?.sourceDirty
  ) {
    throw new Error('校验运行期间 Git commit 或工作区 dirty 状态发生变化，拒绝发布结果。');
  }
}
