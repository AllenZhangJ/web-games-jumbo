import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { build as esbuild } from 'esbuild';

async function directoryExists(directory) {
  try {
    return (await stat(directory)).isDirectory();
  } catch {
    return false;
  }
}

async function listJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listJavaScript(target));
    else if (entry.name.endsWith('.js')) result.push(target);
  }
  return result;
}

test('core and runtime layers never call tt.* or wx.* directly', async () => {
  const root = path.resolve('src');
  const directories = ['core', 'runtime', 'render', 'render3d']
    .map((directory) => path.join(root, directory));
  const existingDirectories = [];
  for (const directory of directories) {
    if (await directoryExists(directory)) existingDirectories.push(directory);
  }
  const files = (await Promise.all(existingDirectories.map(listJavaScript))).flat();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /\b(?:tt|wx)\s*\./, `${file} 泄漏了平台 API`);
  }
});

test('mini-game platform and entries do not depend on browser DOM globals', async () => {
  const files = [
    'src/platform/mini-game.js',
    'src/platform/douyin.js',
    'src/platform/wechat.js',
    'src/entry/douyin.js',
    'src/entry/wechat.js',
  ];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /\b(?:window|document|navigator|localStorage|sessionStorage|HTMLElement)\b/,
      `${file} 不应依赖浏览器 DOM/BOM`,
    );
  }
});

test('Three.js can be bundled as a mini-game IIFE', async () => {
  const result = await esbuild({
    stdin: {
      contents: "import { Scene, WebGLRenderer } from 'three'; globalThis.__threeSmoke = { Scene, WebGLRenderer };",
      resolveDir: path.resolve('.'),
      sourcefile: 'three-mini-game-smoke.js',
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    target: 'es2020',
    treeShaking: true,
    logLevel: 'silent',
  });
  assert.equal(result.outputFiles.length, 1);
  assert.match(result.outputFiles[0].text, /WebGLRenderer/);
  assert.doesNotMatch(result.outputFiles[0].text, /^\s*(?:import|export)\b/m);
});

test('mini-game entries bundle without importing the web platform', async () => {
  for (const entryPoint of ['src/entry/douyin.js', 'src/entry/wechat.js']) {
    const result = await esbuild({
      entryPoints: [path.resolve(entryPoint)],
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'neutral',
      target: 'es2020',
      metafile: true,
      logLevel: 'silent',
    });
    const inputs = Object.keys(result.metafile.inputs);
    assert.ok(!inputs.some((input) => input.endsWith('src/platform/web.js')));
    assert.doesNotMatch(result.outputFiles[0].text, /^\s*(?:import|export)\b/m);
  }
});

test('Arena authority has no renderer, browser, platform or host API dependency', async () => {
  const arenaRoot = path.resolve('src/arena');
  const files = await listJavaScript(arenaRoot);
  const presentationSegment = `${path.sep}presentation${path.sep}`;
  const authorityFiles = files.filter((file) => !file.includes(presentationSegment));
  for (const file of authorityFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:three|[^'"]*(?:render3d|presentation|platform)[^'"]*)['"]|(?:^|[^\w$'"\/-])(?:window|document|navigator)(?=$|[^\w$'"\/-])|\b(?:tt|wx)\s*\.)/m,
      `${file} 泄漏了渲染、浏览器或平台依赖`,
    );
  }
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /@dimforge\/rapier/, `${file} 仍依赖已拒绝的 Rapier POC`);
    assert.doesNotMatch(
      source,
      /(?:\.at\s*\(|\bAggregateError\b|\bstructuredClone\b|\bObject\.hasOwn\b)/,
      `${file} 使用了超出 ES2020 且未提供 polyfill 的内建 API`,
    );
  }
});

test('Arena presentation keeps host APIs injected and cannot be imported by authority', async () => {
  const arenaRoot = path.resolve('src/arena');
  const files = await listJavaScript(arenaRoot);
  const presentationSegment = `${path.sep}presentation${path.sep}`;
  const presentationFiles = files.filter((file) => file.includes(presentationSegment));
  assert.ok(presentationFiles.length > 0);
  for (const file of presentationFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"][^'"]*platform[^'"]*['"]|(?:^|[^\w$'"\/-])(?:window|document|navigator)(?=$|[^\w$'"\/-])|\b(?:tt|wx)\s*\.)/m,
      `${file} 应通过注入合同使用平台能力`,
    );
  }
});

test('Arena input pilot remains an optional headless presentation adapter', async () => {
  const pilotFiles = await listJavaScript(path.resolve('src/arena/presentation/pilot'));
  assert.ok(pilotFiles.length > 0);
  for (const file of pilotFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"]three['"]|arena-greybox-renderer|arena-presentation-session|quick-match-service|\/platform\/|\/entry\/)/,
      `${file} 不应绑定具体 Renderer、Session 组合根、匹配实现或平台入口。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 不应读取墙钟、非确定性随机或宿主全局。`,
    );
  }
});

test('Arena device acceptance remains pure evidence data behind a Node-only CLI', async () => {
  const acceptanceFiles = await listJavaScript(
    path.resolve('src/arena/presentation/acceptance'),
  );
  assert.ok(acceptanceFiles.length > 0);
  for (const file of acceptanceFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:node:|three|[^'"]*(?:renderer|session|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\b|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 应保持为无宿主、无渲染的设备证据数据层。`,
    );
  }
});

test('Arena Stage 7 contracts remain host-free behind an injected Three view factory', async () => {
  const directories = [
    'src/arena/presentation/animation',
    'src/arena/presentation/assets',
    'src/arena/presentation/character',
  ].map((directory) => path.resolve(directory));
  const files = (await Promise.all(directories.map(listJavaScript))).flat();
  files.push(
    path.resolve('src/arena/presentation/content/character-presentation-definition.js'),
    path.resolve('src/arena/presentation/content/character-presentation-registry.js'),
  );
  assert.ok(files.length > 5);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:three|node:|[^'"]*(?:renderer|session|platform|entry|match-core)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\b|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 应保持为可无渲染测试的 Stage 7 合同层。`,
    );
  }
});

test('Arena Stage 8 profile persistence remains host-free and outside match authority', async () => {
  const directories = [
    'src/arena/product',
    'src/arena/storage',
  ].map((directory) => path.resolve(directory));
  const files = (await Promise.all(directories.map(listJavaScript))).flat();
  assert.ok(files.length >= 8);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:three|node:|[^'"]*(?:presentation|renderer|session|match-core|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 应保持为注入存储与墙钟的 Stage 8 产品数据层。`,
    );
  }
});

test('Arena MatchCore POC bundles and executes as a standalone mini-game IIFE', async () => {
  const result = await esbuild({
    entryPoints: [path.resolve('src/arena/entry/match-core-poc.js')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    target: 'es2020',
    treeShaking: true,
    minify: true,
    logLevel: 'silent',
  });
  assert.equal(result.outputFiles.length, 1);
  assert.doesNotMatch(result.outputFiles[0].text, /^\s*(?:import|export)\b/m);
  const previous = globalThis.__arenaMatchPoc;
  try {
    Function(result.outputFiles[0].text)();
    assert.equal(globalThis.__arenaMatchPoc?.ok, true);
    assert.equal(globalThis.__arenaMatchPoc?.backend, 'lightweight-v3');
  } finally {
    if (previous === undefined) delete globalThis.__arenaMatchPoc;
    else globalThis.__arenaMatchPoc = previous;
  }
});

test('Arena local quick match bundles and executes without a browser or renderer', async () => {
  const result = await esbuild({
    stdin: {
      contents: `
        import { QuickMatchService } from './src/arena/matchmaking/quick-match-service.js';
        const match = new QuickMatchService().create({ matchSeed: 20260717 });
        match.session.start();
        match.session.step();
        globalThis.__arenaLocalMatchPoc = {
          ok: match.session.getSnapshot().tick === 1,
          opponentId: match.opponent.id,
        };
        match.session.destroy();
      `,
      resolveDir: path.resolve('.'),
      sourcefile: 'arena-local-match-smoke.js',
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    target: 'es2020',
    treeShaking: true,
    minify: true,
    logLevel: 'silent',
  });
  assert.equal(result.outputFiles.length, 1);
  const previous = globalThis.__arenaLocalMatchPoc;
  try {
    Function(result.outputFiles[0].text)();
    assert.equal(globalThis.__arenaLocalMatchPoc?.ok, true);
    assert.match(globalThis.__arenaLocalMatchPoc?.opponentId, /^opponent-/);
  } finally {
    if (previous === undefined) delete globalThis.__arenaLocalMatchPoc;
    else globalThis.__arenaLocalMatchPoc = previous;
  }
});

test('Arena bot layers preserve dependency direction and tick determinism', async () => {
  const aiFiles = await listJavaScript(path.resolve('src/arena/ai'));
  for (const file of aiFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:match-core|movement-system|movement-physics|\/physics\/|\/replay|\/session|\/matchmaking|render3d|\/platform)/,
      `${file} 越过了 BotPolicy 的受限输入边界`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|localeCompare)/,
      `${file} 使用了墙钟或非确定性随机源`,
    );
  }

  const authorityFiles = [
    'src/arena/config.js',
    'src/arena/input-frame.js',
    'src/arena/match-core.js',
    'src/arena/replay.js',
    'src/arena/state-hash.js',
    ...await listJavaScript(path.resolve('src/arena/physics')),
  ];
  for (const file of authorityFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/ai\/|\/matchmaking\/|\/session\/)/,
      `${file} 反向依赖了机器人或匹配编排`,
    );
    assert.doesNotMatch(
      source,
      /localeCompare/,
      `${file} 使用了受运行环境 locale 影响的排序`,
    );
  }
});

test('Arena Rule/Core foundation preserves dependency direction and deterministic APIs', async () => {
  const directories = ['rules', 'action', 'equipment', 'map']
    .map((directory) => path.resolve('src/arena', directory));
  const files = (await Promise.all(directories.map(listJavaScript))).flat();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/ai\/|\/session\/|\/matchmaking\/|\/content\/|match-core|replay|render3d|\/platform\/|from\s+['"]three['"])/,
      `${file} 违反了 Rule/Core 单向依赖。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const resolverSource = await readFile(
    path.resolve('src/arena/action/action-resolver.js'),
    'utf8',
  );
  assert.doesNotMatch(
    resolverSource,
    /(?:hammer|chain|shield|EquipmentRuntime|EquipmentSystem)/i,
    'ActionResolver 不应知道具体装备或装备运行时实现。',
  );
});
