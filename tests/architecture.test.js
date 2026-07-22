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
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
    'packages/arena-platform-runtime/src/douyin-platform.ts',
    'packages/arena-platform-runtime/src/wechat-platform.ts',
    'src/entry/douyin.ts',
    'src/entry/wechat.ts',
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
  for (const entryPoint of ['src/entry/douyin.ts', 'src/entry/wechat.ts']) {
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
    assert.ok(!inputs.some((input) => input.endsWith(
      'packages/arena-platform-runtime/dist/web-platform.js',
    )));
    assert.ok(inputs.some((input) => input.endsWith(
      'packages/arena-product-presentation-three/dist/product-canvas-ui-surface.js',
    )));
    assert.ok(inputs.some((input) => input.endsWith(
      'packages/arena-product-presentation/dist/product-presentation-session.js',
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
      'packages/arena-product-presentation-three/dist/product-canvas-ui-surface.js',
    )));
    assert.ok(!inputs.some((input) => input.endsWith(
      'packages/arena-platform-runtime/dist/web-platform.js',
    )));
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

test('legacy Arena device acceptance composition has fully migrated', async () => {
  const acceptanceFiles = await listJavaScript(
    path.resolve('src/arena/presentation/acceptance'),
  );
  assert.equal(acceptanceFiles.length, 0);
});

test('legacy Arena presentation performance composition has fully migrated', async () => {
  const files = (await Promise.all([
    'src/arena/presentation/quality',
    'src/arena/presentation/performance',
  ].map((directory) => listJavaScript(path.resolve(directory))))).flat();
  assert.equal(files.length, 0);
});

test('Arena Evidence Value Contract stays scalar-only and outside authority dependencies', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-evidence-contracts/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    ['@number-strategy-jump/arena-contracts'],
    'arena-evidence-contracts 只能依赖底层不可变数据合同。',
  );
  const evidenceRoot = path.resolve('packages/arena-evidence-contracts/src');
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

test('Arena device acceptance definitions stay immutable and host-free', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-device-acceptance/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-evidence-contracts',
    ],
    'arena-device-acceptance 只能依赖底层不可变数据和证据标量合同。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-device-acceptance/src'));
  assert.equal(files.length, 7);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"](?:node:|three|@number-strategy-jump\/(?!(?:arena-contracts|arena-evidence-contracts)['"]))[^'"]*['"]/,
      `${file} 只能导入自身文件、arena-contracts 与 arena-evidence-contracts。`,
    );
    assert.doesNotMatch(
      withoutStaticImports(source),
      /(?:Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\bperformance\s*(?:\.|\[)|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能定义宿主无关的设备验收数据。`,
    );
  }
});

test('Arena performance evidence stays immutable, host-free, and outside runtime collection', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-performance-evidence/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-device-acceptance',
      '@number-strategy-jump/arena-evidence-contracts',
    ],
    'arena-performance-evidence 只能依赖底层不可变数据、证据标量和设备验收合同。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-performance-evidence/src'));
  assert.equal(files.length, 7);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"](?:node:|three|@number-strategy-jump\/(?!(?:arena-contracts|arena-device-acceptance|arena-evidence-contracts)['"]))[^'"]*['"]/,
      `${file} 只能导入自身文件、arena-contracts、arena-evidence-contracts 与 arena-device-acceptance。`,
    );
    assert.doesNotMatch(
      withoutStaticImports(source),
      /(?:Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\bperformance\s*(?:\.|\[)|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能重算注入的性能证据，不得采集宿主指标。`,
    );
  }
});

test('Arena Stage 9 evidence content stays host-free and only composes approved contracts', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-stage9-evidence-content/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-device-acceptance',
      '@number-strategy-jump/arena-performance-evidence',
      '@number-strategy-jump/arena-presentation-runtime',
    ],
    'arena-stage9-evidence-content 只能组合已审核的证据与质量 Definition。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-stage9-evidence-content/src'));
  assert.equal(files.length, 5);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"](?:node:|three|@number-strategy-jump\/(?!(?:arena-contracts|arena-device-acceptance|arena-performance-evidence|arena-presentation-runtime)['"]))[^'"]*['"]/,
      `${file} 只能导入自身文件与已审核的上游包。`,
    );
    assert.doesNotMatch(
      withoutStaticImports(source),
      /(?:Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\bperformance\s*\.\s*(?:now|memory)\b|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能组合版本化内容，不得采集宿主指标或持有生命周期。`,
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
    'src/arena/presentation/animation',
    'src/arena/presentation/assets',
    'src/arena/presentation/character',
    'packages/arena-presentation-contracts/src',
  ].map((directory) => path.resolve(directory));
  const files = (await Promise.all(directories.map(listJavaScript))).flat();
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

test('Arena Presentation contracts have one host-free dependency and no authority imports', async () => {
  const presentationPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-presentation-contracts/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(presentationPackage.dependencies).sort(),
    ['@number-strategy-jump/arena-contracts'],
    'arena-presentation-contracts 只能依赖底层不可变数据合同。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-presentation-contracts/src'));
  assert.ok(files.length >= 7);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:three|node:|[^'"]*(?:core|match|bot|session|renderer|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能描述只读表现数据和确定性语义。`,
    );
  }
});

test('Arena Presentation runtime owns only host-free pacing and event lifecycles', async () => {
  const runtimePackage = JSON.parse(await readFile(
    path.resolve('packages/arena-presentation-runtime/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(runtimePackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-match',
      '@number-strategy-jump/arena-presentation-contracts',
    ],
    'arena-presentation-runtime 只能依赖底层数据合同与公开 tick 配置。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-presentation-runtime/src'));
  assert.ok(files.length >= 7);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:three|node:|[^'"]*(?:core|bot|product|session|renderer|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|(?<![-/])\bperformance\s*[.[]|setTimeout|setInterval|requestAnimationFrame|(?<![-/])\b(?:window|document|navigator)\s*[.[]|\b(?:tt|wx)\s*\.)/,
      `${file} 只能拥有注入调度、事件窗口和表现节拍。`,
    );
  }
});

test('Arena Product Presentation remains host-free and cannot write match authority', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-product-presentation/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-definitions',
      '@number-strategy-jump/arena-presentation-contracts',
      '@number-strategy-jump/arena-presentation-runtime',
      '@number-strategy-jump/arena-product-contracts',
      '@number-strategy-jump/arena-product-state',
      '@number-strategy-jump/arena-progression',
    ],
    'arena-product-presentation 只能依赖已治理的底层定义、表现与产品公开合同。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-product-presentation/src'));
  assert.ok(files.length >= 13);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?!\.\/product-renderer\.js['"])(?:three|node:|[^'"]*(?:core|bot|match-core|renderer|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能编排只读产品表现、输入路由和公开 Product 状态。`,
    );
  }
});

test('Arena V1 authority content stays immutable and outside runtime ownership', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-v1-content/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-definitions',
      '@number-strategy-jump/arena-map',
      '@number-strategy-jump/arena-match',
      '@number-strategy-jump/arena-movement',
    ],
    'arena-v1-content 只能依赖底层数据、规则常量和 Definition/Registry。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-v1-content/src'));
  assert.equal(files.length, 8);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:three|node:|[^'"]*(?:core|bot|product|presentation|session|renderer|platform|entry|experiment|study|regression|release|match-core)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能发布不可变 Arena V1 权威内容。`,
    );
  }
});

test('Arena V1 presentation content only projects injected authority into readonly frames', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-v1-presentation-content/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-definitions',
      '@number-strategy-jump/arena-match',
      '@number-strategy-jump/arena-presentation-contracts',
      '@number-strategy-jump/arena-presentation-runtime',
      '@number-strategy-jump/arena-product-presentation',
      '@number-strategy-jump/arena-v1-content',
    ],
    'arena-v1-presentation-content 只能依赖只读 Definition、快照与表现合同。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-v1-presentation-content/src'));
  assert.equal(files.length, 6);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?!(?:@number-strategy-jump\/arena-product-presentation|\.\/arena-v1-product-presentation-content\.js)['"])(?:three|node:|[^'"]*(?:core|bot|product|session|renderer|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能创建只读表现内容或投影公开权威快照。`,
    );
  }
});

test('Arena V1 application composition only wires governed authority and product packages', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-v1-composition/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-core',
      '@number-strategy-jump/arena-definitions',
      '@number-strategy-jump/arena-equipment',
      '@number-strategy-jump/arena-map',
      '@number-strategy-jump/arena-match',
      '@number-strategy-jump/arena-movement',
      '@number-strategy-jump/arena-product-composition',
      '@number-strategy-jump/arena-product-v1-content',
      '@number-strategy-jump/arena-quick-match',
      '@number-strategy-jump/arena-v1-content',
    ],
    'arena-v1-composition 只能组合已治理的规则、内容、比赛与产品边界。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-v1-composition/src'));
  assert.equal(files.length, 10);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:three|node:|[^'"]*(?:presentation|renderer|platform|entry|experiment|study|regression|release)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能执行无宿主的 Arena V1 应用组合。`,
    );
  }
});

test('Arena V1 application session only composes governed product and presentation ports', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-v1-application-session/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-match',
      '@number-strategy-jump/arena-matchmaking',
      '@number-strategy-jump/arena-presentation-runtime',
      '@number-strategy-jump/arena-product-presentation',
      '@number-strategy-jump/arena-v1-composition',
      '@number-strategy-jump/arena-v1-presentation-content',
    ],
    'arena-v1-application-session 只能组合已治理的应用、产品与表现端口。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-v1-application-session/src'));
  assert.equal(files.length, 2);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:three|node:|[^'"]*(?:presentation-three|platform-runtime|entry|experiment|study|regression|release)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\s*(?:\.|\[)|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能通过注入端口建立 Arena V1 应用 Session。`,
    );
  }
});

test('Arena V1 application launch is the bounded top-level product composition', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-v1-application-launch/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-platform-runtime',
      '@number-strategy-jump/arena-presentation-runtime',
      '@number-strategy-jump/arena-presentation-three',
      '@number-strategy-jump/arena-product-presentation',
      '@number-strategy-jump/arena-product-presentation-three',
      '@number-strategy-jump/arena-v1-application-session',
      '@number-strategy-jump/arena-v1-presentation-content',
    ],
    'arena-v1-application-launch 只能组合已治理的平台、表现和应用 Session。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-v1-application-launch/src'));
  assert.equal(files.length, 6);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:node:|[^'"]*(?:entry|experiment|study|regression|release)[^'"]*)['"]|Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\b(?:document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能建立顶层 Product Launch，不能持有页面、研究或发布工具。`,
    );
  }
});

test('Arena V1 greybox session is an isolated rollback application boundary', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-v1-greybox-session/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-definitions',
      '@number-strategy-jump/arena-matchmaking',
      '@number-strategy-jump/arena-presentation-runtime',
      '@number-strategy-jump/arena-presentation-three',
      '@number-strategy-jump/arena-v1-composition',
      '@number-strategy-jump/arena-v1-presentation-content',
    ],
    'arena-v1-greybox-session 只能组合灰盒回退所需的已治理边界。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-v1-greybox-session/src'));
  assert.equal(files.length, 2);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:node:|[^'"]*(?:entry|experiment|study|regression|release)[^'"]*)['"]|Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能建立独立 Greybox Session，不能持有页面、研究或发布工具。`,
    );
  }
});

test('Arena Stage 8 product orchestration remains host-free and outside match authority', async () => {
  const directories = [
    'src/arena/product',
    'src/arena/storage',
    'packages/arena-product-content/src',
    'packages/arena-product-composition/src',
    'packages/arena-product-contracts/src',
    'packages/arena-product-match/src',
    'packages/arena-product-progression/src',
    'packages/arena-product-session/src',
    'packages/arena-product-state/src',
    'packages/arena-product-v1-content/src',
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
    path.resolve('packages/arena-product-content/src'),
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
    path.resolve('packages/arena-contracts/src/match-content-selection.ts'),
    'utf8',
  );
  assert.doesNotMatch(
    authoritySelection,
    /(?:\/product\/|\/ai\/|\/session\/|\/matchmaking\/|\/presentation\/|Date\.now|Math\.random)/,
    'MatchContentSelection 必须保持为无产品聚合、无 Bot、无宿主的权威数据合同。',
  );
});

test('Arena S8.5 product presentation and compositor remain host-free and do not own Product composition', async () => {
  const files = await listJavaScript(path.resolve('packages/arena-product-presentation/src'));
  assert.ok(files.includes(path.resolve(
    'packages/arena-product-presentation/src/product-ui-scene-model.ts',
  )));
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"](?!\.\/product-renderer\.js['"])(?:three|node:|[^'"]*(?:\/composition\/|renderer|\/session\/|platform|entry|quick-match-service|match-core)[^'"]*)['"]/,
      `${file} 应保持为无宿主、无 Three、无产品组合根的 S8.5 表现层。`,
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
    path.resolve('packages/arena-product-presentation/src/product-presentation-session.ts'),
    path.resolve('packages/arena-v1-application-session/src/product-presentation-session-composition.ts'),
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
        import { QuickMatchService } from '@number-strategy-jump/arena-v1-composition';
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
    'packages/arena-match/src/match-config.ts',
    'packages/arena-contracts/src/input-frame.ts',
    'packages/arena-match/src/match-core.ts',
    'src/arena/replay.js',
    'packages/arena-match/src/state-hash.ts',
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
  directories.push(
    path.resolve('packages/arena-core/src'),
    path.resolve('packages/arena-equipment/src'),
    path.resolve('packages/arena-map/src'),
    path.resolve('packages/arena-movement/src'),
    path.resolve('packages/arena-physics/src'),
  );
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

  const matchFiles = await listJavaScript(path.resolve('packages/arena-match/src'));
  for (const file of matchFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/ai\/|\/session\/|\/matchmaking\/|\/presentation\/|\/platform\/|from\s+['"]three['"]|\b(?:window|document|navigator)\b)/,
      `${file} 越过了 Match 权威编排边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const botFiles = await listJavaScript(path.resolve('packages/arena-bot/src'));
  for (const file of botFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:match-core|\/session\/|\/matchmaking\/|\/presentation\/|\/platform\/|from\s+['"]three['"]|\b(?:window|document|navigator)\b)/,
      `${file} 越过了 Bot 的受限输入边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const sessionFiles = await listJavaScript(path.resolve('packages/arena-session/src'));
  for (const file of sessionFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/matchmaking\/|\/product\/|\/presentation\/|\/platform\/|from\s+['"]three['"]|\b(?:window|document|navigator)\b)/,
      `${file} 越过了 Session 生命周期编排边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const matchmakingFiles = await listJavaScript(path.resolve('packages/arena-matchmaking/src'));
  for (const file of matchmakingFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:match-core|\/session\/|\/product\/|\/presentation\/|\/platform\/|from\s+['"]three['"]|\b(?:window|document|navigator)\b)/,
      `${file} 越过了 Matchmaking 确定性数据边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const quickMatchFiles = await listJavaScript(path.resolve('packages/arena-quick-match/src'));
  for (const file of quickMatchFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/product\/|\/presentation\/|\/platform\/|from\s+['"]three['"]|\b(?:window|document|navigator)\b)/,
      `${file} 越过了 Quick Match 无宿主组合边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const productStateFiles = await listJavaScript(path.resolve('packages/arena-product-state/src'));
  for (const file of productStateFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/profile\/|\/persistence\/|\/matchmaking\/|\/composition\/|\/presentation\/|\/platform\/|from\s+['"]three['"]|\b(?:window|document|navigator)\b)/,
      `${file} 越过了 Product State 纯状态边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const progressionFiles = await listJavaScript(path.resolve('packages/arena-progression/src'));
  for (const file of progressionFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/product\/|\/profile\/|\/persistence\/|\/matchmaking\/|\/composition\/|\/presentation\/|\/platform\/|from\s+['"]three['"]|\b(?:window|document|navigator)\b)/,
      `${file} 越过了 Progression 纯成长合同边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const productContractFiles = await listJavaScript(path.resolve('packages/arena-product-contracts/src'));
  for (const file of productContractFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/profile\/|\/progression\/|\/persistence\/|\/matchmaking\/|\/composition\/|\/presentation\/|\/platform\/|from\s+['"]three['"]|\b(?:window|document|navigator)\b)/,
      `${file} 越过了 Product 结果纯合同边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const productProgressionFiles = await listJavaScript(
    path.resolve('packages/arena-product-progression/src'),
  );
  for (const file of productProgressionFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/composition\/|\/persistence\/|\/matchmaking\/|\/presentation\/|\/platform\/|from\s+['"]three['"]|\b(?:window|document|navigator)\b)/,
      `${file} 越过了 Product Progression 事务编排边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const productMatchFiles = await listJavaScript(
    path.resolve('packages/arena-product-match/src'),
  );
  assert.ok(productMatchFiles.length >= 4);
  for (const file of productMatchFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/profile\/|\/progression\/|\/persistence\/|\/composition\/|\/presentation\/|\/platform\/|from\s+['"]three['"]|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 越过了 Product Match 单局所有权边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const productSessionFiles = await listJavaScript(
    path.resolve('packages/arena-product-session/src'),
  );
  assert.ok(productSessionFiles.length >= 3);
  for (const file of productSessionFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:node:|three|[^'"]*(?:persistence|presentation|platform|entry|study|pilot)[^'"]*)['"]|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 越过了 Product Session 编排边界。`,
    );
    assert.doesNotMatch(
      source,
      /(?:Date\.now|Math\.random|\bperformance\b|setTimeout|setInterval|requestAnimationFrame|localeCompare)/,
      `${file} 使用了墙钟、非确定性随机或表现调度。`,
    );
  }

  const storageFiles = await listJavaScript(path.resolve('packages/arena-storage/src'));
  assert.ok(storageFiles.length >= 2);
  for (const file of storageFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:node:|three|[^'"]*(?:product|study|pilot|presentation|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能依赖同步存储合同与注入的墙钟。`,
    );
  }

  const profilePersistenceFiles = await listJavaScript(
    path.resolve('packages/arena-profile-persistence/src'),
  );
  assert.ok(profilePersistenceFiles.length >= 2);
  for (const file of profilePersistenceFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:node:|three|[^'"]*(?:product-state|profile-service|match|study|pilot|presentation|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 只能组合 Profile 数据合同、同步存储合同与租约。`,
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

  const movementPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-movement/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(movementPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-definitions',
    ],
    'arena-movement 只能依赖底层合同与 Definition。',
  );

  const equipmentPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-equipment/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(equipmentPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-core',
      '@number-strategy-jump/arena-definitions',
    ],
    'arena-equipment 只能依赖底层合同、Core action 候选合同与 Definition。',
  );

  const physicsPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-physics/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(physicsPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-definitions',
      '@number-strategy-jump/arena-movement',
    ],
    'arena-physics 只能依赖底层合同、Definition 与 Movement mutation 合同。',
  );

  const mapPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-map/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(mapPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-definitions',
    ],
    'arena-map 基础层只能依赖底层合同与 Definition。',
  );

  const matchPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-match/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(matchPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-core',
      '@number-strategy-jump/arena-definitions',
      '@number-strategy-jump/arena-map',
      '@number-strategy-jump/arena-movement',
      '@number-strategy-jump/arena-physics',
    ],
    'arena-match 编排层只能依赖底层合同、Core、Definition、Map、Movement 与 Physics。',
  );

  const botPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-bot/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(botPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-equipment',
      '@number-strategy-jump/arena-map',
      '@number-strategy-jump/arena-match',
      '@number-strategy-jump/arena-movement',
    ],
    'arena-bot 只能依赖公开合同、装备/地图公开状态、Match 枚举与 Movement 枚举。',
  );

  const sessionPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-session/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(sessionPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-match',
    ],
    'arena-session 只能依赖公开合同与 Match，不得依赖具体 Bot、Product 或表现层。',
  );

  const matchmakingPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-matchmaking/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(matchmakingPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-bot',
      '@number-strategy-jump/arena-contracts',
    ],
    'arena-matchmaking 只能依赖确定性合同与 Bot 公开难度 Definition。',
  );

  const quickMatchPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-quick-match/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(quickMatchPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-bot',
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-match',
      '@number-strategy-jump/arena-matchmaking',
      '@number-strategy-jump/arena-session',
    ],
    'arena-quick-match 只能组合 Bot、合同、Match、Matchmaking 与 Session。',
  );

  const productStatePackage = JSON.parse(await readFile(
    path.resolve('packages/arena-product-state/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(productStatePackage.dependencies).sort(),
    ['@number-strategy-jump/arena-contracts'],
    'arena-product-state 只能依赖底层确定性合同。',
  );

  const progressionPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-progression/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(progressionPackage.dependencies).sort(),
    ['@number-strategy-jump/arena-contracts'],
    'arena-progression 只能依赖底层确定性合同。',
  );

  const productContractsPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-product-contracts/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(productContractsPackage.dependencies).sort(),
    ['@number-strategy-jump/arena-contracts'],
    'arena-product-contracts 只能依赖底层确定性合同。',
  );

  const productContentPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-product-content/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(productContentPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-profile-contracts',
    ],
    'arena-product-content 只能依赖底层确定性合同与 Profile 数据合同。',
  );

  const productV1ContentPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-product-v1-content/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(productV1ContentPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-definitions',
      '@number-strategy-jump/arena-product-content',
      '@number-strategy-jump/arena-profile-contracts',
      '@number-strategy-jump/arena-progression',
    ],
    'arena-product-v1-content 只能组合稳定 ID、内容池、Profile 与成长 Definition。',
  );

  const productCompositionPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-product-composition/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(productCompositionPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-product-content',
      '@number-strategy-jump/arena-product-match',
      '@number-strategy-jump/arena-product-progression',
      '@number-strategy-jump/arena-product-session',
      '@number-strategy-jump/arena-product-state',
      '@number-strategy-jump/arena-profile-persistence',
      '@number-strategy-jump/arena-profile-service',
    ],
    'arena-product-composition 只能组合已治理的 Product、Profile 与 Quick Match 边界。',
  );

  const productProgressionPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-product-progression/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(productProgressionPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-product-contracts',
      '@number-strategy-jump/arena-profile-contracts',
      '@number-strategy-jump/arena-progression',
    ],
    'arena-product-progression 只能组合纯结果、Profile 合同与成长合同。',
  );

  const productMatchPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-product-match/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(productMatchPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-product-contracts',
    ],
    'arena-product-match 只能依赖底层数据合同与 Product 公开结果合同。',
  );

  const productSessionPackage = JSON.parse(await readFile(
    path.resolve('packages/arena-product-session/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(productSessionPackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-product-contracts',
      '@number-strategy-jump/arena-product-match',
      '@number-strategy-jump/arena-product-progression',
      '@number-strategy-jump/arena-product-state',
      '@number-strategy-jump/arena-profile-contracts',
      '@number-strategy-jump/arena-profile-service',
      '@number-strategy-jump/arena-progression',
    ],
    'arena-product-session 只能编排 Product 状态、单局、Profile 与奖励公开合同。',
  );

  const storagePackage = JSON.parse(await readFile(
    path.resolve('packages/arena-storage/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(storagePackage.dependencies).sort(),
    ['@number-strategy-jump/arena-contracts'],
    'arena-storage 只能依赖底层同步存储合同。',
  );

  const profilePersistencePackage = JSON.parse(await readFile(
    path.resolve('packages/arena-profile-persistence/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(profilePersistencePackage.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-profile-contracts',
      '@number-strategy-jump/arena-storage',
    ],
    'arena-profile-persistence 只能组合 Profile 数据合同与同步存储所有权。',
  );

  const matchCoreSource = await readFile(
    path.resolve('packages/arena-match/src/match-core.ts'),
    'utf8',
  );
  assert.match(matchCoreSource, /MatchParticipantSystem/);
  assert.match(matchCoreSource, /MatchTimelineSystem/);
  assert.doesNotMatch(
    matchCoreSource,
    /from\s+['"][^'"]*src\/arena\//,
    'strict MatchCore 不得反向依赖 src\/arena 私有权威原语。',
  );
  assert.doesNotMatch(
    matchCoreSource,
    /#participants\s*(?::|=|;)|function\s+createParticipant\b|#(?:tick|activeTick|phase|result|started)\s*(?::|=|;)/,
    'MatchCore 不得重新持有 participant Map、私有 participant 构造器或 timeline 可写字段。',
  );
});
