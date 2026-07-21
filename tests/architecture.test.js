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
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) result.push(target);
  }
  return result;
}

function withoutStaticImports(source) {
  return source.replace(/^\s*import[\s\S]*?;\s*$/gm, '');
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
    'src/entry/douyin-greybox.js',
    'src/entry/wechat-greybox.js',
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
    assert.ok(inputs.some((input) => input.endsWith(
      'src/arena/presentation/canvas/product-canvas-ui-surface.js',
    )));
    assert.ok(inputs.some((input) => input.endsWith(
      'src/arena/presentation/session/product-presentation-session.js',
    )));
    assert.doesNotMatch(result.outputFiles[0].text, /^\s*(?:import|export)\b/m);
  }
});

test('mini-game greybox rollback entries remain independently executable', async () => {
  for (const entryPoint of [
    'src/entry/douyin-greybox.js',
    'src/entry/wechat-greybox.js',
  ]) {
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
    assert.ok(inputs.some((input) => input.endsWith(
      'src/arena/presentation/session/arena-presentation-session.js',
    )));
    assert.ok(!inputs.some((input) => input.endsWith(
      'src/arena/presentation/canvas/product-canvas-ui-surface.js',
    )));
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
      /(?:from\s+['"](?:node:|three|[^'"]*(?:renderer|session|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\s*(?:\.|\[)|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 应保持为无宿主、无渲染的设备证据数据层。`,
    );
  }
});

test('Arena quality and performance contracts remain host-free and cannot own rendering', async () => {
  const files = (await Promise.all([
    'src/arena/presentation/quality',
    'src/arena/presentation/performance',
  ].map((directory) => listJavaScript(path.resolve(directory))))).flat();
  assert.ok(files.length >= 8);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"](?:node:|three|[^'"]*(?:\/platform\/|\/entry\/|\/session\/|\/renderer\/|\/three\/)[^'"]*)['"]/,
      `${file} 不应拥有 Node、宿主、Session 或 Renderer。`,
    );
    assert.doesNotMatch(
      withoutStaticImports(source),
      /(?:Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 不应直接读取墙钟、随机或宿主全局。`,
    );
  }
});

test('Arena Evidence Value Contract stays scalar-only and outside authority dependencies', async () => {
  const evidenceRoot = path.resolve('src/arena/evidence');
  const evidenceFiles = await listJavaScript(evidenceRoot);
  assert.ok(evidenceFiles.length >= 1);
  for (const file of evidenceFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"](?:node:|three|[^'"]*(?:presentation|study|experiment|regression|product|release|platform|entry|session|renderer)[^'"]*)['"]|Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\./,
      `${file} 必须保持为只依赖 Rule 数据工具的证据标量合同。`,
    );
  }
  const authorityDirectories = [
    'src/arena/action',
    'src/arena/ai',
    'src/arena/character',
    'src/arena/composition',
    'src/arena/content',
    'src/arena/equipment',
    'src/arena/map',
    'src/arena/matchmaking',
    'src/arena/movement',
    'src/arena/physics',
    'src/arena/rules',
    'src/arena/runtime',
    'src/arena/session',
  ];
  const authorityFiles = (await Promise.all(authorityDirectories.map((directory) => (
    listJavaScript(path.resolve(directory))
  )))).flat();
  for (const file of authorityFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"][^'"]*(?:\/|^)evidence\//,
      `${file} 的权威、Bot 或 Session 代码不应依赖验收证据。`,
    );
  }

  const evidenceConsumerDirectories = [
    'src/arena-release',
    'src/arena/experiment',
    'src/arena/presentation/acceptance',
    'src/arena/presentation/assets',
    'src/arena/presentation/performance',
    'src/arena/presentation/pilot',
    'src/arena/regression',
    'src/arena/study',
  ];
  const evidenceConsumerFiles = (await Promise.all(
    evidenceConsumerDirectories.map((directory) => listJavaScript(path.resolve(directory))),
  )).flat();
  for (const file of evidenceConsumerFiles) {
    const source = await readFile(file, 'utf8');
    assert.equal(
      source.includes('/^[0-9a-f]{40}$/'),
      false,
      `${file} 不得复制 Git commit 正则，应使用 Evidence Value Contract。`,
    );
    assert.doesNotMatch(
      source,
      /\b(?:UTC_)?ISO_INSTANT_PATTERN\b|Date\.parse\(/,
      `${file} 不得复制 UTC instant 解析，应使用 Evidence Value Contract。`,
    );
  }
});

test('Arena Stage 9 experiment orchestration stays headless and outside presentation/platform code', async () => {
  const experimentFiles = await listJavaScript(path.resolve('src/arena/experiment'));
  assert.ok(experimentFiles.length >= 7);
  for (const file of experimentFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:node:|three|[^'"]*(?:presentation|renderer|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\s*(?:\.|\[)|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 应保持为无宿主、无渲染、无墙钟的 Stage 9 实验层。`,
    );
  }
});

test('Arena Stage 9 regression corpus stays headless and keeps Node IO in scripts', async () => {
  const regressionFiles = await listJavaScript(path.resolve('src/arena/regression'));
  assert.ok(regressionFiles.length >= 5);
  for (const file of regressionFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:node:|three|[^'"]*(?:presentation|renderer|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\s*(?:\.|\[)|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 应保持为无宿主、无渲染的 Stage 9 回归层。`,
    );
  }
});

test('Arena Stage 9 human study stays headless, host-free and outside authority ownership', async () => {
  const arenaRoot = path.resolve('src/arena');
  const studyRoot = path.join(arenaRoot, 'study');
  const studyFiles = await listJavaScript(studyRoot);
  assert.ok(studyFiles.length >= 7);
  for (const file of studyFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"](?:node:|three|[^'"]*(?:presentation|renderer|platform|entry|\/session\/)[^'"]*)['"]/,
      `${file} 不应拥有 Node、宿主、Session、Renderer 或入口。`,
    );
    assert.doesNotMatch(
      withoutStaticImports(source),
      /(?:Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\bperformance\s*(?:\.|\[)|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 不应直接读取墙钟、随机或宿主全局。`,
    );
  }
  const nonStudyFiles = (await listJavaScript(arenaRoot)).filter(
    (file) => !file.startsWith(`${studyRoot}${path.sep}`),
  );
  for (const file of nonStudyFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"][^'"]*(?:\/|^)study\//,
      `${file} 不应让权威、Bot、产品或表现层反向依赖 Study。`,
    );
  }
});

test('Arena release handoff stays outside authority and only composes host-free evidence contracts', async () => {
  const releaseRoot = path.resolve('src/arena-release');
  const releaseFiles = await listJavaScript(releaseRoot);
  assert.ok(releaseFiles.length >= 5);
  for (const file of releaseFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"](?:node:|three|[^'"]*(?:\/platform\/|\/entry\/|\/session\/|\/renderer\/|\/three\/)[^'"]*)['"]/,
      `${file} 只能组合无宿主证据合同，不能拥有 Node、平台、Session 或 Renderer。`,
    );
    assert.doesNotMatch(
      withoutStaticImports(source),
      /(?:Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\bperformance\s*(?:\.|\[)|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 不应直接读取墙钟、随机或宿主全局。`,
    );
  }
  const arenaFiles = await listJavaScript(path.resolve('src/arena'));
  for (const file of arenaFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"][^'"]*arena-release\//,
      `${file} 不应从权威、Bot、产品或表现层反向依赖 Release 交接层。`,
    );
  }
});

test('Arena Stage 7 contracts remain host-free behind an injected Three view factory', async () => {
  const directories = [
    'src/arena/evidence',
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

test('Arena Stage 8 product orchestration remains host-free and outside match authority', async () => {
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
      /(?:from\s+['"](?:three|node:|[^'"]*(?:presentation|renderer|\/session\/|match-core|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 应保持为注入存储、墙钟与匹配端口的 Stage 8 产品层。`,
    );
  }
});

test('Arena Stage 8 product sublayers preserve state/profile/match/composition dependency direction', async () => {
  const restrictedDirectories = [
    'src/arena/product/state',
    'src/arena/product/profile',
    'src/arena/product/persistence',
  ].map((directory) => path.resolve(directory));
  const files = (await Promise.all(restrictedDirectories.map(listJavaScript))).flat();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/product\/)?(?:composition|matchmaking)\//,
      `${file} 不应反向依赖产品组合根或匹配运行时。`,
    );
  }
  const matchmakingFiles = await listJavaScript(path.resolve('src/arena/product/matchmaking'));
  for (const file of matchmakingFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/product\/)?(?:composition|profile|persistence)\//,
      `${file} 不应反向持有产品组合根或 Profile 聚合。`,
    );
  }
  const progressionFiles = await listJavaScript(path.resolve('src/arena/product/progression'));
  for (const file of progressionFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/product\/)?(?:composition|persistence)\//,
      `${file} 不应持有产品组合根或直接写入 Repository。`,
    );
  }

  const contentPoolFiles = await listJavaScript(
    path.resolve('src/arena/product/content-pool'),
  );
  for (const file of contentPoolFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/product\/)?(?:composition|persistence|matchmaking)\/|\/session\/|\/presentation\//,
      `${file} 不应反向持有产品组合、持久化、匹配运行时或表现层。`,
    );
  }
  const authoritySelection = await readFile(
    path.resolve('src/arena/content/match-content-selection.js'),
    'utf8',
  );
  assert.doesNotMatch(
    authoritySelection,
    /(?:\/product\/|\/ai\/|\/session\/|\/matchmaking\/|\/presentation\/|Date\.now|Math\.random)/,
    'MatchContentSelection 必须保持为无产品聚合、无 Bot、无宿主的权威数据合同。',
  );
});

test('Arena S8.5 product presentation contracts remain host-free and do not own Product composition', async () => {
  const files = await listJavaScript(path.resolve('src/arena/presentation/product'));
  assert.ok(files.length >= 8);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"](?:three|node:|[^'"]*(?:\/composition\/|renderer|\/session\/|platform|entry|quick-match-service|match-core)[^'"]*)['"]/,
      `${file} 应保持为无宿主、无 Renderer、无产品组合根的 S8.5 表现合同。`,
    );
    assert.doesNotMatch(
      withoutStaticImports(source),
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 应保持为无宿主的 S8.5 表现合同。`,
    );
  }
});

test('Arena S8.5 Product Session is the injected host root and never reuses Stage 6 ownership', async () => {
  const files = [
    path.resolve('src/arena/presentation/session/product-presentation-session.js'),
    path.resolve('src/arena/presentation/session/product-presentation-session-composition.js'),
  ];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"](?:three|[^'"]*(?:\/platform\/|\/entry\/|arena-presentation-session|arena-greybox-renderer)[^'"]*)['"]/,
      `${file} 必须注入 Platform/Renderer，且不能复用 Stage 6 的 Match 所有权根。`,
    );
    assert.doesNotMatch(
      withoutStaticImports(source),
      /(?:Date\.now|Math\.random|\bperformance\s*(?:\.|\[)|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 不应绕过注入合同读取宿主能力。`,
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
    'packages/arena-contracts/src/input-frame.ts',
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
    path.resolve('packages/arena-core/src/action-resolver.ts'),
    'utf8',
  );
  assert.doesNotMatch(
    resolverSource,
    /(?:hammer|chain|shield|EquipmentRuntime|EquipmentSystem)/i,
    'ActionResolver 不应知道具体装备或装备运行时实现。',
  );
});
