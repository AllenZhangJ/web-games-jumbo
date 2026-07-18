import { spawn } from 'node:child_process';

function positiveSafeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value;
}

function nonEmptyText(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

export async function runArenaChildProcess({
  command,
  args = [],
  cwd,
  timeoutMs = 300_000,
  maximumStdoutBytes = 16 * 1024 * 1024,
  maximumStderrBytes = 4 * 1024 * 1024,
}) {
  nonEmptyText(command, 'Arena child process command');
  nonEmptyText(cwd, 'Arena child process cwd');
  if (!Array.isArray(args) || args.some((argument) => typeof argument !== 'string')) {
    throw new TypeError('Arena child process args 必须是字符串数组。');
  }
  positiveSafeInteger(timeoutMs, 'Arena child process timeoutMs');
  positiveSafeInteger(maximumStdoutBytes, 'Arena child process maximumStdoutBytes');
  positiveSafeInteger(maximumStderrBytes, 'Arena child process maximumStderrBytes');

  return new Promise((resolve, reject) => {
    let child;
    let finished = false;
    let terminalFailure = null;
    let timeoutToken = null;
    let forceKillToken = null;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const stdoutChunks = [];
    const stderrChunks = [];

    const clearTimers = () => {
      if (timeoutToken !== null) clearTimeout(timeoutToken);
      if (forceKillToken !== null) clearTimeout(forceKillToken);
      timeoutToken = null;
      forceKillToken = null;
    };
    const fail = (error) => {
      if (terminalFailure || finished) return;
      terminalFailure = error;
      child?.kill('SIGTERM');
      forceKillToken = setTimeout(() => {
        if (!finished) child?.kill('SIGKILL');
      }, 1_000);
      forceKillToken.unref?.();
    };
    const collect = (streamName, chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (streamName === 'stdout') {
        stdoutBytes += buffer.byteLength;
        if (stdoutBytes > maximumStdoutBytes) {
          fail(new RangeError(`Arena child process stdout 超过 ${maximumStdoutBytes} bytes 上限。`));
          return;
        }
        stdoutChunks.push(buffer);
        return;
      }
      stderrBytes += buffer.byteLength;
      if (stderrBytes > maximumStderrBytes) {
        fail(new RangeError(`Arena child process stderr 超过 ${maximumStderrBytes} bytes 上限。`));
        return;
      }
      stderrChunks.push(buffer);
    };

    try {
      child = spawn(command, args, {
        cwd,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      reject(error);
      return;
    }
    child.stdout.on('data', (chunk) => collect('stdout', chunk));
    child.stderr.on('data', (chunk) => collect('stderr', chunk));
    child.once('error', (error) => fail(error));
    child.once('close', (exitCode, signal) => {
      if (finished) return;
      finished = true;
      clearTimers();
      if (terminalFailure) {
        reject(terminalFailure);
        return;
      }
      resolve(Object.freeze({
        command,
        args: Object.freeze([...args]),
        exitCode,
        signal,
        stdout: Buffer.concat(stdoutChunks, stdoutBytes).toString('utf8'),
        stderr: Buffer.concat(stderrChunks, stderrBytes).toString('utf8'),
        stdoutBytes,
        stderrBytes,
      }));
    });
    timeoutToken = setTimeout(() => {
      fail(new Error(`Arena child process 在 ${timeoutMs}ms 内未结束。`));
    }, timeoutMs);
    timeoutToken.unref?.();
  });
}
