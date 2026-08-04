import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { build as esbuild } from 'esbuild';
import {
  ARENA_MINI_GAME_LAUNCHER_SOURCE,
  buildArenaMiniGameChunkBuild,
  validateArenaMiniGamePublishedJavaScript,
} from '../scripts/lib/arena-mini-game-chunk-build.js';

declare global {
  var __arenaMatchPoc: Readonly<{ ok?: boolean; backend?: string }> | undefined;
  var __arenaLocalMatchPoc: Readonly<{ ok?: boolean; opponentId?: string }> | undefined;
}

function required<T>(value: T | null | undefined, name: string): T {
  assert.ok(value !== null && value !== undefined, `${name} 不存在。`);
  return value;
}

async function directoryExists(directory: string): Promise<boolean> {
  try {
    return (await stat(directory)).isDirectory();
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function listJavaScript(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listJavaScript(target));
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) result.push(target);
  }
  return result;
}

async function listJavaScriptIfPresent(directory: string): Promise<string[]> {
  try {
    return await listJavaScript(directory);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

function withoutStaticImports(source: string): string {
  return source.replace(/^\s*import[\s\S]*?;\s*$/gm, '');
}

test('optional migration scans treat an absent retired directory as empty', async () => {
  assert.deepEqual(
    await listJavaScriptIfPresent(path.resolve('src/arena/__missing_migration_fixture__')),
    [],
  );
});

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
    'src/entry/douyin-greybox.ts',
    'src/entry/wechat-greybox.ts',
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
  const output = required(result.outputFiles[0], 'Three.js smoke output');
  assert.match(output.text, /WebGLRenderer/);
  assert.doesNotMatch(output.text, /^\s*(?:import|export)\b/m);
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
    const inputs = Object.keys(required(result.metafile, 'mini-game metafile').inputs);
    assert.ok(!inputs.some((input) => input.endsWith(
      'packages/arena-platform-runtime/dist/web-platform.js',
    )));
    assert.ok(inputs.some((input) => input.endsWith(
      'packages/arena-product-presentation-three/dist/product-canvas-ui-surface.js',
    )));
    assert.ok(inputs.some((input) => input.endsWith(
      'packages/arena-product-presentation/dist/product-presentation-session.js',
    )));
    assert.doesNotMatch(
      required(result.outputFiles[0], 'mini-game output').text,
      /^\s*(?:import|export)\b/m,
    );
  }
});

test('production mini-game packages use a closed CommonJS chunk graph from the Product entry', async () => {
  for (const entryPoint of ['src/entry/douyin.ts', 'src/entry/wechat.ts']) {
    const result = await buildArenaMiniGameChunkBuild({
      repositoryRoot: path.resolve('.'),
      entryPoint: path.resolve(entryPoint),
    });
    const files = validateArenaMiniGamePublishedJavaScript(result.files);
    assert.equal(files[0]?.relativePath, 'game.js');
    assert.equal(files[0]?.source, ARENA_MINI_GAME_LAUNCHER_SOURCE);
    assert.equal(files.filter(({ relativePath }) => relativePath === 'game-runtime.js').length, 1);
    assert.ok(result.sharedChunkPaths.length >= 1);

    const inputs = result.sourceInputs.map((input) => input.replaceAll('\\', '/'));
    assert.ok(inputs.some((input) => input.includes(
      'packages/arena-v1-application-launch/dist/product-game-composition.js',
    )));
    for (const forbidden of [
      'arena-device-acceptance/src',
      'arena-input-pilot',
      'arena-p1-supply-acceptance',
      'arena-v1-experiment',
      'arena-v1-greybox-session',
      'src/entry/web.ts',
      'web-platform',
    ]) {
      assert.equal(
        inputs.some((input) => input.includes(forbidden)),
        false,
        `${entryPoint} 不得把 ${forbidden} 带入生产小游戏依赖图`,
      );
    }
  }
});

test('Web entry imports only the Web launch composition and excludes Canvas UI', async () => {
  const result = await esbuild({
    entryPoints: [path.resolve('src/entry/web.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    treeShaking: true,
    loader: { '.css': 'empty' },
    metafile: true,
    logLevel: 'silent',
  });
  const inputs = Object.keys(required(result.metafile, 'Web metafile').inputs);
  assert.ok(inputs.some((input) => input.endsWith(
    'packages/arena-v1-application-launch/dist/product-game-composition.js',
  )));
  assert.ok(inputs.some((input) => input.endsWith(
    'packages/arena-v1-application-launch/dist/product-renderer-composition.js',
  )));
  assert.ok(inputs.some((input) => input.endsWith(
    'packages/arena-v1-application-launch/dist/presentation-launch.js',
  )));
  assert.ok(!inputs.some((input) => input.endsWith(
    'packages/arena-v1-application-launch/dist/canvas-product-game-composition.js',
  )));
  assert.ok(!inputs.some((input) => input.endsWith(
    'packages/arena-product-presentation-three/dist/product-canvas-ui-surface.js',
  )));
});

test('mini-game greybox rollback entries remain independently executable', async () => {
  for (const entryPoint of [
    'src/entry/douyin-greybox.ts',
    'src/entry/wechat-greybox.ts',
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
    const inputs = Object.keys(required(result.metafile, 'greybox metafile').inputs);
    assert.ok(inputs.some((input) => input.endsWith(
      'packages/arena-v1-greybox-session/dist/greybox-presentation-session.js',
    )));
    assert.ok(!inputs.some((input) => input.endsWith(
      'packages/arena-product-presentation-three/dist/product-canvas-ui-surface.js',
    )));
    assert.ok(!inputs.some((input) => input.endsWith(
      'packages/arena-platform-runtime/dist/web-platform.js',
    )));
    assert.doesNotMatch(
      required(result.outputFiles[0], 'greybox output').text,
      /^\s*(?:import|export)\b/m,
    );
  }
});

test('P1 supply acceptance stays platform-neutral, cross-platform thin and production unreachable', async () => {
  const hostPath = 'src/entry/arena-p1-supply-acceptance-host.ts';
  const runtimePath = 'src/entry/arena-p1-supply-acceptance-runtime.ts';
  const acceptanceEntries = [
    'src/entry/web-p1-supply-acceptance.ts',
    'src/entry/wechat-p1-supply-acceptance.ts',
    'src/entry/douyin-p1-supply-acceptance.ts',
  ] as const;
  const host = await readFile(hostPath, 'utf8');
  assert.match(host, /\.\/arena-p1-supply-acceptance-runtime\.js/);
  assert.doesNotMatch(
    host,
    /(?:from\s+['"](?:three|[^'"]*(?:arena-session|arena-match|arena-presentation-runtime|platform-runtime)[^'"]*)['"]|\b(?:window|document|navigator|localStorage|sessionStorage)\b|\b(?:wx|tt)\s*\.|\b(?:setTimeout|clearTimeout|setInterval|clearInterval|Math\.random)\b)/,
  );

  for (const [index, entryPath] of acceptanceEntries.entries()) {
    const source = await readFile(entryPath, 'utf8');
    assert.match(source, /\.\/arena-p1-supply-acceptance-host\.js/);
    assert.doesNotMatch(
      source,
      /(?:arena-session|arena-match|arena-presentation-runtime|LocalMatchSession|MatchCore|ArenaSupplyPresentationAdapter)/,
    );
    for (const [otherIndex, otherPath] of acceptanceEntries.entries()) {
      if (otherIndex === index) continue;
      assert.doesNotMatch(source, new RegExp(path.basename(otherPath, '.ts')));
    }
  }

  const forbiddenAcceptanceInputs = new Set([
    hostPath,
    runtimePath,
    ...acceptanceEntries,
  ].map((value) => path.resolve(value)));
  for (const productionEntry of [
    'src/entry/web.ts',
    'src/entry/wechat.ts',
    'src/entry/douyin.ts',
  ]) {
    const result = await esbuild({
      entryPoints: [path.resolve(productionEntry)],
      outdir: path.resolve('dist/.architecture-p1-supply-reachability-audit'),
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'neutral',
      target: 'es2020',
      treeShaking: true,
      preserveSymlinks: true,
      metafile: true,
      logLevel: 'silent',
    });
    const inputs = Object.keys(required(result.metafile, `${productionEntry} metafile`).inputs)
      .map((input) => path.resolve(input));
    for (const forbidden of forbiddenAcceptanceInputs) {
      assert.ok(!inputs.includes(forbidden), `${productionEntry} 不得传递到达 ${forbidden}`);
    }
  }

  const defaultBuild = await readFile('scripts/build.ts', 'utf8');
  assert.doesNotMatch(defaultBuild, /arena-p1-supply-acceptance|p1-supply-acceptance-host/);
  const packageValue = JSON.parse(await readFile('package.json', 'utf8')) as {
    scripts?: Record<string, unknown>;
  };
  const scripts = required(packageValue.scripts, 'package scripts');
  assert.equal(scripts.build, 'node --import tsx scripts/build.ts');
  assert.equal(
    scripts['arena:p1:supply:build'],
    'node --import tsx scripts/build-arena-p1-supply-acceptance.ts --mode=development-isolated',
  );
  assert.equal(
    scripts['arena:p1:supply:build:formal'],
    'node --import tsx scripts/build-arena-p1-supply-acceptance.ts --mode=formal-clean-evidence',
  );
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

test('Arena input pilot domain remains optional and host-free', async () => {
  const pilotFiles = await listJavaScript(path.resolve('packages/arena-input-pilot/src'));
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
  const acceptanceFiles = await listJavaScriptIfPresent(
    path.resolve('src/arena/presentation/acceptance'),
  );
  assert.equal(acceptanceFiles.length, 0);
});

test('legacy Arena presentation performance composition has fully migrated', async () => {
  const files = (await Promise.all([
    'src/arena/presentation/quality',
    'src/arena/presentation/performance',
  ].map((directory) => listJavaScriptIfPresent(path.resolve(directory))))).flat();
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
    listJavaScriptIfPresent(path.resolve(directory))
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
    evidenceConsumerDirectories.map((directory) => listJavaScriptIfPresent(path.resolve(directory))),
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
  assert.deepEqual(
    files.map((file) => path.basename(file)).sort(),
    [
      'arena-build-manifest.ts',
      'arena-device-acceptance-bundle.ts',
      'arena-device-acceptance-definition.ts',
      'arena-device-acceptance-record.ts',
      'arena-p1-supply-device-acceptance-v1.ts',
      'arena-stage6-device-acceptance-v1.ts',
      'arena-stage8-product-device-acceptance-v1.ts',
      'index.ts',
    ],
    'arena-device-acceptance 源码清单必须显式受控，新增合同不得只放宽数量断言。',
  );
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
  assert.equal(files.length, 8);
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
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-experiment/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-evidence-contracts',
      '@number-strategy-jump/arena-match',
    ],
    'arena-experiment 基础包只能依赖权威基础契约、证据值契约和严格 Match。',
  );
  const experimentFiles = [
    ...await listJavaScriptIfPresent(path.resolve('src/arena/experiment')),
    ...await listJavaScript(path.resolve('packages/arena-experiment/src')),
  ];
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

test('Arena balance composition stays headless and depends only on strict content and experiment contracts', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-balance/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-bot',
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-experiment',
      '@number-strategy-jump/arena-v1-composition',
      '@number-strategy-jump/arena-v1-content',
    ],
    'arena-balance 只能依赖严格 Bot、契约、实验基础与 V1 组合内容。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-balance/src'));
  assert.ok(files.length >= 2);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:node:|three|[^'"]*(?:presentation|renderer|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\s*(?:\.|\[)|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 应保持为无宿主、无渲染、无墙钟的平衡实验组合层。`,
    );
  }
});

test('Arena V1 experiment runtime stays headless behind strict V1 composition', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-v1-experiment/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-balance',
      '@number-strategy-jump/arena-bot',
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-definitions',
      '@number-strategy-jump/arena-experiment',
      '@number-strategy-jump/arena-match',
      '@number-strategy-jump/arena-matchmaking',
      '@number-strategy-jump/arena-movement',
      '@number-strategy-jump/arena-physics',
      '@number-strategy-jump/arena-v1-composition',
      '@number-strategy-jump/arena-v1-content',
    ],
  );
  const files = await listJavaScript(path.resolve('packages/arena-v1-experiment/src'));
  assert.ok(files.length >= 3);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:from\s+['"](?:node:|three|[^'"]*(?:presentation|renderer|platform|entry)[^'"]*)['"]|Date\.now|Math\.random|\bperformance\s*(?:\.|\[)|setTimeout|setInterval|requestAnimationFrame|\b(?:window|document|navigator)\b|\b(?:tt|wx)\s*\.)/,
      `${file} 应保持为无宿主、无渲染、无墙钟的 V1 实验运行层。`,
    );
  }
});

test('Arena Stage 9 regression corpus stays headless and keeps Node IO in scripts', async () => {
  const packageDefinition = JSON.parse(await readFile(
    path.resolve('packages/arena-regression/package.json'),
    'utf8',
  ));
  assert.deepEqual(
    Object.keys(packageDefinition.dependencies).sort(),
    [
      '@number-strategy-jump/arena-contracts',
      '@number-strategy-jump/arena-evidence-contracts',
      '@number-strategy-jump/arena-experiment',
      '@number-strategy-jump/arena-match',
      '@number-strategy-jump/arena-v1-composition',
      '@number-strategy-jump/arena-v1-content',
    ],
    'arena-regression 包只能依赖已审核的实验、Match/Replay 与 V1 组合内容。',
  );
  const regressionFiles = [
    ...await listJavaScriptIfPresent(path.resolve('src/arena/regression')),
    ...await listJavaScript(path.resolve('packages/arena-regression/src')),
  ];
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
  const strictStudyRoot = path.resolve('packages/arena-human-match-study/src');
  const studyFiles = [
    ...await listJavaScriptIfPresent(studyRoot),
    ...await listJavaScript(strictStudyRoot),
  ];
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
  const strictReleaseRoot = path.resolve('packages/arena-release/src');
  const releaseFiles = [
    ...await listJavaScriptIfPresent(releaseRoot),
    ...await listJavaScript(strictReleaseRoot),
  ];
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
  const retiredDirectories = [
    'src/arena/presentation/animation',
    'src/arena/presentation/character',
  ].map((directory) => path.resolve(directory));
  const files = [
    ...(await Promise.all(retiredDirectories.map(listJavaScriptIfPresent))).flat(),
    ...await listJavaScript(path.resolve('src/arena/presentation/assets')),
    ...await listJavaScript(path.resolve('packages/arena-presentation-contracts/src')),
  ];
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
  assert.equal(files.length, 10);
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
      '@number-strategy-jump/arena-bot',
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
      '@number-strategy-jump/arena-session',
      '@number-strategy-jump/arena-v1-content',
    ],
    'arena-v1-composition 只能组合已治理的规则、内容、比赛与产品边界。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-v1-composition/src'));
  assert.equal(files.length, 12);
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
      '@number-strategy-jump/arena-match',
      '@number-strategy-jump/arena-matchmaking',
      '@number-strategy-jump/arena-presentation-runtime',
      '@number-strategy-jump/arena-presentation-three',
      '@number-strategy-jump/arena-v1-composition',
      '@number-strategy-jump/arena-v1-presentation-content',
    ],
    'arena-v1-greybox-session 只能组合灰盒回退所需的已治理边界。',
  );
  const files = await listJavaScript(path.resolve('packages/arena-v1-greybox-session/src'));
  assert.equal(files.length, 3);
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
  const retiredDirectories = [
    'src/arena/product',
    'src/arena/storage',
  ].map((directory) => path.resolve(directory));
  const packageDirectories = [
    'packages/arena-product-content/src',
    'packages/arena-product-composition/src',
    'packages/arena-product-contracts/src',
    'packages/arena-product-match/src',
    'packages/arena-product-progression/src',
    'packages/arena-product-session/src',
    'packages/arena-product-state/src',
    'packages/arena-product-v1-content/src',
  ].map((directory) => path.resolve(directory));
  const files = [
    ...(await Promise.all(retiredDirectories.map(listJavaScriptIfPresent))).flat(),
    ...(await Promise.all(packageDirectories.map(listJavaScript))).flat(),
  ];
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
  const files = (await Promise.all(restrictedDirectories.map(listJavaScriptIfPresent))).flat();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/product\/)?(?:composition|matchmaking)\//,
      `${file} 不应反向依赖产品组合根或匹配运行时。`,
    );
  }
  const matchmakingFiles = await listJavaScriptIfPresent(path.resolve('src/arena/product/matchmaking'));
  for (const file of matchmakingFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /(?:\/product\/)?(?:composition|profile|persistence)\//,
      `${file} 不应反向持有产品组合根或 Profile 聚合。`,
    );
  }
  const progressionFiles = await listJavaScriptIfPresent(path.resolve('src/arena/product/progression'));
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
    entryPoints: [path.resolve('src/arena/entry/match-core-poc.ts')],
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
  const output = required(result.outputFiles[0], 'MatchCore POC output');
  assert.doesNotMatch(output.text, /^\s*(?:import|export)\b/m);
  const previous = globalThis.__arenaMatchPoc;
  try {
    Function(output.text)();
    assert.equal(globalThis.__arenaMatchPoc?.ok, true);
    assert.equal(globalThis.__arenaMatchPoc?.backend, 'lightweight-v3');
  } finally {
    if (previous === undefined) Reflect.deleteProperty(globalThis, '__arenaMatchPoc');
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
        match.session.stepWithLegacySnapshotForAudit();
        globalThis.__arenaLocalMatchPoc = {
          ok: match.session.getLegacyFullSnapshotForAudit().tick === 1,
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
  const output = required(result.outputFiles[0], 'local match POC output');
  const previous = globalThis.__arenaLocalMatchPoc;
  try {
    Function(output.text)();
    assert.equal(globalThis.__arenaLocalMatchPoc?.ok, true);
    assert.match(
      required(globalThis.__arenaLocalMatchPoc?.opponentId, 'local opponent id'),
      /^opponent-/,
    );
  } finally {
    if (previous === undefined) Reflect.deleteProperty(globalThis, '__arenaLocalMatchPoc');
    else globalThis.__arenaLocalMatchPoc = previous;
  }
});

test('Arena bot layers preserve dependency direction and tick determinism', async () => {
  const aiFiles = await listJavaScriptIfPresent(path.resolve('src/arena/ai'));
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
    'src/arena/replay.ts',
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

test('PA2a read-frame audits stay out of authority and hot-path packages', async () => {
  const forbiddenAudit = /(?:createMatchReadFrameV2Audit|createWorldSnapshotV2Audit|createLocalActionSidecarV2Audit|createBotMobilitySidecarV2Audit|createFullAuditSidecarV2Audit|requireArenaSurvivalSupplyProjectionV2)/;
  const hotPathDirectories = [
    'packages/arena-core/src',
    'packages/arena-match/src',
    'packages/arena-session/src',
    'packages/arena-bot/src',
    'packages/arena-product-match/src',
    'packages/arena-product-session/src',
    'packages/arena-product-presentation/src',
    'packages/arena-presentation-runtime/src',
  ];
  const files = (await Promise.all(hotPathDirectories.map((directory) => (
    listJavaScriptIfPresent(path.resolve(directory))
  )))).flat();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, forbiddenAudit, `${file} 不得依赖 PA2a 昂贵 read-frame audit`);
  }
});

test('PA2c read-frame hot path stays direct and composer helpers remain Core-bound', async () => {
  const composerPath = path.resolve('packages/arena-match/src/match-read-frame.ts');
  const composerSource = await readFile(composerPath, 'utf8');
  assert.doesNotMatch(composerSource, /cloneFrozenData|create(?:MatchRead|WorldSnapshot|LocalAction|BotMobility|FullAudit).*Audit/);
  assert.doesNotMatch(composerSource, /\.getSnapshot\s*\(/);

  const indexPath = path.resolve('packages/arena-match/src/index.ts');
  const indexSource = await readFile(indexPath, 'utf8');
  assert.doesNotMatch(
    indexSource,
    /(?:composeWorldSnapshotV2|composeLocalActionSidecarV2|composeBotMobilitySidecarV2|composeFullAuditSidecarV2|composeMatchReadFrameV2|MatchReadModelBuildCandidate)/,
    'arena-match package index 不得导出 PA2c composer/runtime helper。',
  );

  const allowedFiles = new Set([
    path.resolve('packages/arena-match/src/match-core.ts'),
    indexPath,
    composerPath,
  ]);
  const packageDirectories = (await readdir(path.resolve('packages'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(path.resolve('packages'), entry.name, 'src'));
  const files = (await Promise.all(packageDirectories.map(listJavaScriptIfPresent))).flat();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (!/from ['"][^'"]*match-read-frame\.js['"]/.test(source)) continue;
    assert.equal(
      allowedFiles.has(path.resolve(file)),
      true,
      `${file} 不得绕过 MatchCore 深导入 PA2c composer。`,
    );
  }
});

test('PA2b MatchRead owner helpers stay behind the MatchCore boundary', async () => {
  const helperNames = /(?:createMatchReadBindingForOwner|createMatchReadOwnerPort|createMatchReadReaderForOwner|invalidateMatchReadOwner)/;
  const allowedFiles = new Set([
    path.resolve('packages/arena-match/src/match-core.ts'),
    path.resolve('packages/arena-match/src/match-read-port.ts'),
  ]);
  const packageDirectories = (await readdir(path.resolve('packages'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(path.resolve('packages'), entry.name, 'src'));
  const files = (await Promise.all(packageDirectories.map(listJavaScriptIfPresent))).flat();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (!helperNames.test(source)) continue;
    assert.equal(
      allowedFiles.has(path.resolve(file)),
      true,
      `${file} 不得绕过 MatchCore 使用 PA2b Core-only helper。`,
    );
  }
});

test('PA2b MatchRead port deep imports stay behind MatchCore or type-only index exports', async () => {
  const allowedFiles = new Set([
    path.resolve('packages/arena-match/src/match-core.ts'),
    path.resolve('packages/arena-match/src/index.ts'),
    path.resolve('packages/arena-match/src/match-read-frame.ts'),
    path.resolve('packages/arena-match/src/match-read-port.ts'),
  ]);
  const packageDirectories = (await readdir(path.resolve('packages'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(path.resolve('packages'), entry.name, 'src'));
  const files = (await Promise.all(packageDirectories.map(listJavaScriptIfPresent))).flat();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (!/from ['"][^'"]*match-read-port\.js['"]/.test(source)) continue;
    assert.equal(
      allowedFiles.has(path.resolve(file)),
      true,
      `${file} 不得通过相对深导入绕过 MatchCore owner 生命周期。`,
    );
  }
});

test('Arena Rule/Core foundation preserves dependency direction and deterministic APIs', async () => {
  const retiredDirectories = ['rules', 'action', 'equipment', 'map']
    .map((directory) => path.resolve('src/arena', directory));
  const packageDirectories = [
    path.resolve('packages/arena-definitions/src'),
    path.resolve('packages/arena-core/src'),
    path.resolve('packages/arena-equipment/src'),
    path.resolve('packages/arena-map/src'),
    path.resolve('packages/arena-movement/src'),
    path.resolve('packages/arena-physics/src'),
  ];
  const files = [
    ...(await Promise.all(retiredDirectories.map(listJavaScriptIfPresent))).flat(),
    ...(await Promise.all(packageDirectories.map(listJavaScript))).flat(),
  ];
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

test('Arena Bot only consumes restricted snapshots and emits InputFrames', async () => {
  const botSourceFiles = await listJavaScript(path.resolve('packages/arena-bot/src'));
  for (const file of botSourceFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /\bMatchCore\b|arena-session|arena-replay|Replay V5/,
      `${file} 的 Bot 不得持有 Core/Session/Replay 具体依赖。`,
    );
    assert.doesNotMatch(
      source,
      /(?:createTrustedInputFrameBatch|stepTrustedInputFrameBatch|readConsumedTrustedInputFrameBatch|MatchCoreTrustedInputFrameBatch)/,
      `${file} 的 Bot 不得接触 MatchCore trusted InputFrame batch port。`,
    );
  }
});

test('PA3a mobility policy consumes only the V5 mobility sidecar', async () => {
  const file = path.resolve('packages/arena-bot/src/bot-mobility-policy.ts');
  const source = await readFile(file, 'utf8');
  assert.doesNotMatch(
    source,
    /\bactionAffordance\b|\bprimary\b|\bprimaryHold\b|\bprimaryActionDefinitionId\b/,
    `${file} 不得回读 generic actionAffordance 或 primary 身份字段。`,
  );
  assert.match(
    source,
    /observation\.botMobility\.channels\.jump/,
    `${file} 必须直接读取 botMobility.channels.jump。`,
  );
  assert.match(
    source,
    /observation\.botMobility\.channels\.slam/,
    `${file} 必须直接读取 botMobility.channels.slam。`,
  );
});

test('PA3b Session V5 uses only the bundle handshake and never builds MatchRead readers', async () => {
  const file = path.resolve('packages/arena-session/src/local-match-session.ts');
  const source = await readFile(file, 'utf8');
  const sessionFiles = await listJavaScript(path.resolve('packages/arena-session/src'));
  const readCreationNames = [
    'createMatchReadBinding',
    'createMatchReadFrameReader',
    'createMatchReadSidecarReader',
  ];
  const creationCallers: string[] = [];
  for (const sessionFile of sessionFiles) {
    const sessionSource = await readFile(sessionFile, 'utf8');
    if (readCreationNames.some((name) => sessionSource.includes(name))) {
      creationCallers.push(path.relative(process.cwd(), sessionFile));
    }
  }
  assert.deepEqual(
    creationCallers.sort(),
    ['packages/arena-session/src/bot-match-read-bundle.ts'],
    'PA3b 三类 Core MatchRead 创建 API 只能由 bundle factory 所在文件使用。',
  );
  assert.doesNotMatch(
    source,
    /createMatchReadBinding|createMatchReadFrameReader|createMatchReadSidecarReader/,
    `${file} 不得创建 MatchRead binding/frame/sidecar reader。`,
  );
  const indexSource = await readFile(path.resolve('packages/arena-session/src/index.ts'), 'utf8');
  assert.doesNotMatch(
    indexSource,
    /(?:armBotMatchReadTransaction|resolveBotMatchReadBundle|invalidateBotMatchReadBundle|buildBotCommandSourceV5ForBundle)/,
    'arena-session index 不得导出 PA3b transaction/provenance/build helper。',
  );
  const botFiles = await listJavaScript(path.resolve('packages/arena-bot/src'));
  for (const botFile of botFiles) {
    const botSource = await readFile(botFile, 'utf8');
    assert.doesNotMatch(
      botSource,
      /(?:arena-session|bot-match-read-bundle)/,
      `${botFile} 不得深导入 Session/bundle。`,
    );
  }
  assert.match(source, /resolveBotMatchReadBundle/);
  assert.match(source, /armBotMatchReadTransaction/);
  const privateMethod = (name: string, nextName: string): string => {
    const start = source.indexOf(`  ${name}(`);
    const end = source.indexOf(`  ${nextName}(`, start + 1);
    assert.ok(start >= 0, `${name} 必须存在且可独立切片。`);
    assert.ok(end > start, `${name} 必须在 ${nextName} 之前结束。`);
    return source.slice(start, end);
  };
  const v5BotArm = privateMethod('#createV5BotFrame', '#createLegacyBotFrame');
  const legacyBotArm = privateMethod('#createLegacyBotFrame', '#stepInternal');
  assert.match(v5BotArm, /createInputFromTrustedCommandSource\(\)/);
  assert.doesNotMatch(
    v5BotArm,
    /get(?:LegacyFullSnapshotForAudit|Snapshot)\s*\(|createInput\s*\(/,
    `${file} 的 V5 Bot arm 不得构造 legacy full snapshot 或调用普通 createInput。`,
  );
  assert.match(legacyBotArm, /getLegacyFullSnapshotForAudit\(\)/);
  assert.match(legacyBotArm, /botController\.createInput\(/);
  assert.doesNotMatch(
    legacyBotArm,
    /createInputFromTrustedCommandSource/,
    `${file} 的 legacy Bot arm 不得混入 V5 command-source reader。`,
  );
  const botArmSelectionStart = source.indexOf('const botFrame =');
  const normalizedBotStart = source.indexOf('const normalizedBot =', botArmSelectionStart);
  assert.ok(botArmSelectionStart >= 0 && normalizedBotStart > botArmSelectionStart);
  const botArmSelection = source.slice(botArmSelectionStart, normalizedBotStart);
  assert.match(botArmSelection, /this\.#createV5BotFrame\(botController\)/);
  assert.match(botArmSelection, /this\.#createLegacyBotFrame\(core, botController\)/);
  assert.doesNotMatch(
    botArmSelection,
    /get(?:LegacyFullSnapshotForAudit|Snapshot)\s*\(|createInput\s*\(/,
    `${file} 的 V5/legacy selector 不得直接读取 full snapshot。`,
  );
});

test('PA3b outer compositions have one bundle factory boundary and no public test seam', async () => {
  const quickMatchFile = path.resolve('packages/arena-quick-match/src/quick-match-service.ts');
  const survivalFile = path.resolve(
    'packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts',
  );
  const v1AdapterFile = path.resolve('packages/arena-v1-composition/src/quick-match-service.ts');
  const quickMatch = await readFile(quickMatchFile, 'utf8');
  const survival = await readFile(survivalFile, 'utf8');
  const v1Adapter = await readFile(v1AdapterFile, 'utf8');
  const directReaderCreation = /createMatchReadBinding|createMatchReadFrameReader|createMatchReadSidecarReader/;
  assert.match(quickMatch, /createMatchReadBotBundleV2/);
  assert.match(survival, /createMatchReadBotBundleV2/);
  assert.doesNotMatch(quickMatch, directReaderCreation);
  assert.doesNotMatch(survival, directReaderCreation);
  assert.doesNotMatch(quickMatch, /trustedBinding|trustedBotBinding/);
  assert.doesNotMatch(survival, /trustedBinding|trustedBotBinding/);
  const bundleCalls = (source: string): number => (
    source.match(/createMatchReadBotBundleV2\s*\(/g)?.length ?? 0
  );
  assert.equal(bundleCalls(quickMatch), 1, 'QuickMatch outer 必须恰好调用一次 bundle factory。');
  assert.equal(bundleCalls(survival), 1, 'survival outer 必须恰好调用一次 bundle factory。');
  assert.match(survival, /projectionContract:\s*supplyProjectionContract/);
  assert.match(survival, /trustedCommandSourceHandle:\s*botMatchReadBundle/);
  assert.match(survival, /botMatchReadBundle,\s*publicMatchInfo/);
  assert.doesNotMatch(
    v1Adapter,
    /createMatchReadBotBundleV2|botMatchReadBundle|trustedCommandSourceHandle/,
    'V1 quick-match adapter 仍只是既有 strict service 转发，不应无理由接线 PA3b bundle。',
  );
  const compositionIndex = await readFile(
    path.resolve('packages/arena-v1-composition/src/index.ts'),
    'utf8',
  );
  assert.doesNotMatch(
    compositionIndex,
    /createArenaV2SurvivalSupplyBotSessionForTest|coreSupplyObserver|bundleFactory|buildArenaV2SurvivalBotCompositionContract|createArenaV2SurvivalBotCompositionContractHash/,
    'survival outer 的 deep-only test seam 不得进入 package index。',
  );
});

test('PA4a Session owns only a readonly frame adapter and preserves the PA4b boundary', async () => {
  const sessionPath = path.resolve('packages/arena-session/src/local-match-session.ts');
  const bundlePath = path.resolve('packages/arena-session/src/bot-match-read-bundle.ts');
  const sessionIndexPath = path.resolve('packages/arena-session/src/index.ts');
  const sessionSource = await readFile(sessionPath, 'utf8');
  const bundleSource = await readFile(bundlePath, 'utf8');
  const sessionIndex = await readFile(sessionIndexPath, 'utf8');
  assert.match(sessionSource, /getPresentationReadFrame/);
  assert.match(sessionSource, /stepWithPresentationReadFrame/);
  assert.match(bundleSource, /readPresentationFrameForSession/);
  const frameHelperStart = bundleSource.indexOf('export function readPresentationFrameForSession');
  const frameHelperEnd = bundleSource.indexOf(
    '/** Package-private session transaction arm',
    frameHelperStart,
  );
  assert.equal(frameHelperStart >= 0 && frameHelperEnd > frameHelperStart, true);
  const frameHelperSource = bundleSource.slice(frameHelperStart, frameHelperEnd);
  assert.match(frameHelperSource, /readNativeCoreReadIdentity/);
  assert.doesNotMatch(
    frameHelperSource,
    /core\.(?:tick|phase)/,
    'PA4a frame helper 必须使用捕获的 native identity getter，不得动态读取 Core 属性。',
  );
  assert.doesNotMatch(
    sessionSource,
    /createMatchReadBinding|createMatchReadFrameReader|createMatchReadSidecarReader/,
    'LocalMatchSession 不得创建或替换 PA2 binding/reader。',
  );
  assert.doesNotMatch(
    sessionIndex,
    /readPresentationFrameForSession|resolveBotMatchReadBundle|armBotMatchReadTransaction|invalidateBotMatchReadBundle/,
    'Session deep helper 与 provenance helper 不得从 package index 导出。',
  );
  const authorityStepIndex = sessionSource.indexOf(
    'const events = runner.stepTrustedInputFrameBatch(batch);',
  );
  const presentationStart = sessionSource.indexOf(
    "if (projection === 'presentation') {",
    authorityStepIndex,
  );
  const legacySnapshotIndex = sessionSource.indexOf(
    'const snapshot = core.getLegacyFullSnapshotForAudit();',
    presentationStart,
  );
  assert.equal(authorityStepIndex >= 0 && presentationStart > authorityStepIndex, true);
  assert.equal(legacySnapshotIndex > presentationStart, true);
  const presentationProjection = sessionSource.slice(presentationStart, legacySnapshotIndex);
  assert.match(
    presentationProjection,
    /return Object\.freeze\(\{ events, readFrame, input: normalizedPlayer \}\);/,
    'V2 step 必须是共享 authority step 的只读投影分支。',
  );
  assert.doesNotMatch(presentationProjection, /getSnapshot\s*\(/);
  assert.equal(
    (sessionSource.match(/#stepInternal\(/g)?.length ?? 0) >= 4,
    true,
    'legacy 与 V2 必须调用同一个 #stepInternal 内核。',
  );
  const productRuntimeSource = await readFile(
    path.resolve('packages/arena-product-match/src/product-match-runtime.ts'),
    'utf8',
  );
  assert.match(productRuntimeSource, /getPresentationReadFrame/);
  assert.match(productRuntimeSource, /stepWithPresentationReadFrame/);
  const productV2Start = productRuntimeSource.indexOf('startWithReadFrame():');
  const productV2End = productRuntimeSource.indexOf('destroy():', productV2Start);
  assert.equal(productV2Start >= 0 && productV2End > productV2Start, true);
  const productV2Source = productRuntimeSource.slice(productV2Start, productV2End);
  assert.doesNotMatch(productV2Source, /getSnapshot\s*\(/);
  assert.doesNotMatch(
    productV2Source,
    /createMatchReadBinding|createMatchReadFrameReader|createMatchReadSidecarReader|bot-match-read-bundle|MatchCore/,
    'Product V2 runtime 只经 Session adapter 读取，不创建 reader/bundle/Core 依赖。',
  );
  const productPresentationFiles = [
    'packages/arena-product-session/src/product-session-controller.ts',
    'packages/arena-product-presentation/src/product-match-presentation-runtime.ts',
    'packages/arena-presentation-runtime/src/arena-input-mapper.ts',
  ];
  for (const file of productPresentationFiles) {
    const source = await readFile(path.resolve(file), 'utf8');
    assert.doesNotMatch(source, /getPresentationReadFrame|stepWithPresentationReadFrame/);
  }
  const productSessionSource = await readFile(
    path.resolve('packages/arena-product-session/src/product-session-controller.ts'),
    'utf8',
  );
  const productSessionV2Start = productSessionSource.indexOf('beginMatchWithReadFrame():');
  const productSessionV2End = productSessionSource.indexOf('getSnapshot(): ProductSessionSnapshot', productSessionV2Start);
  assert.equal(productSessionV2Start >= 0 && productSessionV2End > productSessionV2Start, true);
  const productSessionV2Source = productSessionSource.slice(productSessionV2Start, productSessionV2End);
  assert.doesNotMatch(productSessionV2Source, /getActiveMatchSnapshot\s*\(|getSnapshot\s*\(/);
  assert.doesNotMatch(
    productSessionV2Source,
    /createMatchReadBinding|createMatchReadFrameReader|createMatchReadSidecarReader|bot-match-read-bundle|MatchCore/,
    'ProductSession V2 只消费 Session V2 port，不创建 reader/bundle/Core 依赖。',
  );
});

test('PA4b-2 input runtime keeps LocalActionSidecarV2 separate from legacy affordance', async () => {
  const mapperPath = path.resolve('packages/arena-presentation-runtime/src/arena-input-mapper.ts');
  const samplerPath = path.resolve('packages/arena-presentation-runtime/src/input-sampler.ts');
  const routerPath = path.resolve('packages/arena-presentation-runtime/src/arena-input-router.ts');
  const mapperSource = await readFile(mapperPath, 'utf8');
  const samplerSource = await readFile(samplerPath, 'utf8');
  const routerSource = await readFile(routerPath, 'utf8');

  assert.match(mapperSource, /LocalActionSidecarV2/);
  assert.match(mapperSource, /local-context-primary/);
  assert.match(mapperSource, /SIDECAR_CHANNEL_KEYS/);
  assert.match(mapperSource, /primaryHold/);
  assert.match(mapperSource, /copyLocalActionSidecarV2/);
  const sidecarMappingStart = mapperSource.indexOf('localActionSidecar');
  const sidecarMappingEnd = mapperSource.indexOf('actionAffordance', sidecarMappingStart);
  assert.equal(sidecarMappingStart >= 0 && sidecarMappingEnd > sidecarMappingStart, true);
  const firstSidecarSegment = mapperSource.slice(sidecarMappingStart, sidecarMappingEnd);
  assert.doesNotMatch(firstSidecarSegment, /channels\.(?:jump|slam)/);

  assert.match(samplerSource, /ARENA_INPUT_SOURCE_MODE/);
  assert.match(samplerSource, /local-sidecar-v2/);
  assert.match(samplerSource, /不得同时携带 legacy affordance 与 V2 local sidecar/);
  assert.match(samplerSource, /legacy InputSampler 路径不得携带 eventSequence/);
  assert.match(samplerSource, /localActionSidecar/);
  assert.match(samplerSource, /this\.#sampling = true/);
  const preSamplingValidation = samplerSource.indexOf('copyLocalActionSidecarV2(');
  const samplingStart = samplerSource.indexOf('this.#sampling = true');
  assert.equal(preSamplingValidation >= 0 && preSamplingValidation < samplingStart, true);

  assert.match(routerSource, /sampler\.sample[\s\S]{0,120}tick, options/);
  assert.doesNotMatch(routerSource, /copyLocalActionSidecarV2|actionAffordance|localActionSidecar/);

});

test('PA4b-3 Product/Presentation production path consumes only the V2 read-frame contract', async () => {
  const runtimePath = path.resolve(
    'packages/arena-product-presentation/src/product-match-presentation-runtime.ts',
  );
  const flowPath = path.resolve(
    'packages/arena-product-presentation/src/product-presentation-flow.ts',
  );
  const projectorPath = path.resolve(
    'packages/arena-v1-presentation-content/src/arena-frame-projector.ts',
  );
  const compositionPath = path.resolve(
    'packages/arena-v1-application-session/src/product-presentation-session-composition.ts',
  );
  const runtime = await readFile(runtimePath, 'utf8');
  const flow = await readFile(flowPath, 'utf8');
  const projector = await readFile(projectorPath, 'utf8');
  const composition = await readFile(compositionPath, 'utf8');

  assert.match(runtime, /beginMatchWithReadFrame/);
  assert.match(runtime, /stepMatchWithReadFrame/);
  assert.match(runtime, /getActiveMatchReadFrame/);
  assert.match(runtime, /localActionSidecar/);
  assert.doesNotMatch(runtime, /getActiveMatchSnapshot|participant\.actionAffordance/);
  assert.doesNotMatch(
    runtime,
    /createMatchReadBinding|createMatchReadFrameReader|createMatchReadSidecarReader|MatchCore/,
  );
  const flowControllerStart = flow.indexOf('function normalizeController');
  const flowControllerEnd = flow.indexOf('function normalizeInputSource', flowControllerStart);
  assert.ok(flowControllerStart >= 0 && flowControllerEnd > flowControllerStart);
  const flowController = flow.slice(flowControllerStart, flowControllerEnd);
  assert.doesNotMatch(flowController, /\bbeginMatch\s*\(|\bstepMatch\s*\(|getActiveMatchSnapshot/);
  assert.match(flowController, /beginMatchWithReadFrame|stepMatchWithReadFrame|getActiveMatchReadFrame/);

  const v2ProjectorStart = projector.indexOf('export function projectArenaPresentationFrameV2');
  assert.ok(v2ProjectorStart >= 0, 'V2 projector 必须存在。');
  const v2Projector = projector.slice(v2ProjectorStart);
  assert.match(v2Projector, /worldSnapshot/);
  assert.match(v2Projector, /localActionSidecar/);
  assert.doesNotMatch(v2Projector, /actionAffordance|ActionResolver|canAct/);
  assert.match(composition, /projectArenaPresentationFrameV2/);
  assert.doesNotMatch(
    composition,
    /projectArenaPresentationFrame\s+as|participant\.actionAffordance|getActiveMatchSnapshot|getSnapshot\(\)/,
  );

  const mapperSource = await readFile(
    path.resolve('packages/arena-presentation-runtime/src/arena-input-mapper.ts'),
    'utf8',
  );
  assert.match(mapperSource, /LOCAL_SIDECAR_V2/);
  const contextMapperStart = mapperSource.indexOf('export function createContextInputMapperB');
  const contextMapperEnd = mapperSource.indexOf(
    'export function createExplicitCombatJumpMapper',
    contextMapperStart,
  );
  assert.ok(contextMapperStart >= 0 && contextMapperEnd > contextMapperStart);
  const contextMapper = mapperSource.slice(contextMapperStart, contextMapperEnd);
  assert.doesNotMatch(
    contextMapper,
    /channels\.(?:jump|slam)/,
    'PA4b-3 不得为 local sidecar 伪造 jump/slam。',
  );
});

test('PA5b keeps one bundle owner, runner-only schedule, and a separate measurement schema', async () => {
  const bundlePath = path.resolve('packages/arena-session/src/bot-match-read-bundle.ts');
  const sessionPath = path.resolve('packages/arena-session/src/local-match-session.ts');
  const sessionIndexPath = path.resolve('packages/arena-session/src/index.ts');
  const measurementPath = path.resolve(
    'packages/arena-performance-evidence/src/arena-read-step-measurement-v2.ts',
  );
  const runnerPath = path.resolve('scripts/lib/arena-read-step-runner-v2.ts');
  const pressurePath = path.resolve('scripts/arena-formal-survival-bot-pressure.ts');
  const bundle = await readFile(bundlePath, 'utf8');
  const session = await readFile(sessionPath, 'utf8');
  const sessionIndex = await readFile(sessionIndexPath, 'utf8');
  const measurement = await readFile(measurementPath, 'utf8');
  const runner = await readFile(runnerPath, 'utf8');
  const pressure = await readFile(pressurePath, 'utf8');

  assert.match(bundle, /fullAuditReaders/);
  assert.match(bundle, /'full-audit'/);
  assert.match(bundle, /readFullAuditForSession/);
  assert.equal((bundle.match(/const BUNDLE_RECORDS = new WeakMap/g) ?? []).length, 1, 'PA5b 不得创建第二个 Bundle WeakMap。');
  assert.equal((bundle.match(/const CONSUMED_CORES = new WeakSet/g) ?? []).length, 1, 'PA5b 不得创建第二个 Core owner WeakSet。');
  assert.match(bundle, /CONSUMED_CORES\.add\(core\)/);
  assert.doesNotMatch(
    bundle,
    /initialFullAudit|readFullAuditResultForRecord\(bundleRecord\)\s*;/,
    'Bundle factory 不得在 publish 前无条件读取 full-audit。',
  );
  assert.doesNotMatch(
    bundle,
    /FULL_AUDIT_READER_FACTORY_FOR_TEST|fullAuditReadCount|getFullAuditReadCountForTest|withFullAuditReaderFactoryForTest/,
    'PA5b 生产 bundle 不得包含测试 factory、计数器或测试导出。',
  );
  assert.doesNotMatch(session, /createMatchReadBinding|createMatchReadFrameReader|createMatchReadSidecarReader/);
  assert.match(session, /readFullAuditForEvidence/);
  assert.doesNotMatch(session, /tick0|interval-60|boundary-599|measurementSchemaVersion/);
  assert.doesNotMatch(
    sessionIndex,
    /readFullAuditForSession|BotMatchReadFullAuditResultV2|armBotMatchReadTransaction|resolveBotMatchReadBundle|invalidateBotMatchReadBundle|getFullAuditReadCountForTest|withFullAuditReaderFactoryForTest/,
  );
  assert.match(measurement, /ARENA_READ_STEP_MEASUREMENT_SCHEMA_VERSION = 2/);
  assert.doesNotMatch(
    measurement,
    /MATCH_READ_FRAME_V2_SCHEMA_VERSION|from\s+['"][^'"]*arena-session|process\.|Date\.now|Math\.random/,
  );
  assert.match(runner, /createArenaReadStepScheduleV2/);
  assert.match(runner, /readFullAuditForEvidence/);
  assert.match(runner, /ARENA_READ_STEP_EVENT_TYPES/);
  assert.match(runner, /assertFullAuditRecomposesLegacy/);
  assert.match(runner, /getLegacyFullSnapshotForAudit/);
  assert.doesNotMatch(runner, /measurementMicros/, 'PA5b 不得绕过唯一 measurement v2 合同使用裸时长。');
  assert.match(runner, /createReadStepMeasurementV2/);
  assert.match(runner, /fullAuditMicros/);
  assert.match(runner, /differentialMicros/);
  assert.match(runner, /botInputAuthorityPostFrameMicros/);
  assert.doesNotMatch(pressure, /session\.getSnapshot\s*\(/);
  assert.doesNotMatch(pressure, /measurementMicros/);
  assert.match(pressure, /initialAudit\.measurement\.totalMicros/);
  assert.match(pressure, /runArenaReadStepV2/);
  assert.match(pressure, /readArenaFullAuditAtCurrentV2/);
});

test('PA5c removes ambiguous legacy reachability while preserving explicit audit and own-state APIs', async () => {
  const localSession = await readFile(
    path.resolve('packages/arena-session/src/local-match-session.ts'),
    'utf8',
  );
  const runtime = await readFile(
    path.resolve('packages/arena-product-match/src/product-match-runtime.ts'),
    'utf8',
  );
  const coordinator = await readFile(
    path.resolve('packages/arena-product-match/src/product-match-coordinator.ts'),
    'utf8',
  );
  const controller = await readFile(
    path.resolve('packages/arena-product-session/src/product-session-controller.ts'),
    'utf8',
  );
  const quickMatch = await readFile(
    path.resolve('packages/arena-quick-match/src/quick-match-service.ts'),
    'utf8',
  );
  const survival = await readFile(
    path.resolve('packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts'),
    'utf8',
  );
  assert.match(localSession, /stepWithLegacySnapshotForAudit\(/);
  assert.match(localSession, /getLegacyFullSnapshotForAudit\(/);
  assert.match(localSession, /runLegacyUntilEndedForAudit\(/);
  assert.doesNotMatch(localSession, /^\s+(?:step|getSnapshot|runUntilEnded)\s*\(/m);
  assert.doesNotMatch(runtime, /^\s+(?:start|step|getSnapshot)\s*\(/m);
  assert.doesNotMatch(coordinator, /^\s+(?:start|step|getMatchSnapshot)\s*\(/m);
  assert.doesNotMatch(controller, /^\s+(?:beginMatch|stepMatch|getActiveMatchSnapshot)\s*\(/m);
  assert.match(coordinator, /getSnapshot\(\): ProductMatchCoordinatorSnapshot/);
  assert.match(controller, /getSnapshot\(\): ProductSessionSnapshot/);
  for (const source of [quickMatch, survival]) {
    assert.doesNotMatch(
      source,
      /['"](?:step|runUntilEnded|getSnapshot)['"]|\.(?:step|runUntilEnded|getSnapshot)\(\)/,
      'QuickMatch/survival production surface 不得捕获模糊 LocalSession API。',
    );
    assert.match(source, /getPresentationReadFrame|stepWithPresentationReadFrame/);
  }
  const productMatchIndex = await readFile(
    path.resolve('packages/arena-product-match/src/index.ts'),
    'utf8',
  );
  const productSessionIndex = await readFile(
    path.resolve('packages/arena-product-session/src/index.ts'),
    'utf8',
  );
  assert.doesNotMatch(productMatchIndex, /ProductMatchStepOutcome/);
  assert.doesNotMatch(productSessionIndex, /ProductSessionStepOutcome/);
  const productPresentation = await readFile(
    path.resolve('packages/arena-product-presentation/src/product-match-presentation-runtime.ts'),
    'utf8',
  );
  assert.doesNotMatch(productPresentation, /getActiveMatchSnapshot|participant\.actionAffordance/);
});

test('PA5c static gates isolate Product ports, production paths, research adapters, and legal same-name APIs', async () => {
  const read = async (relativePath: string): Promise<string> => readFile(path.resolve(relativePath), 'utf8');
  const matchPort = await read('packages/arena-product-match/src/ports.ts');
  const sessionPort = await read('packages/arena-product-session/src/ports.ts');
  const oldPortNames = /['"](?:start|step|getMatchSnapshot|beginMatch|stepMatch|getActiveMatchSnapshot)['"]/;
  assert.doesNotMatch(matchPort, oldPortNames);
  assert.doesNotMatch(sessionPort, oldPortNames);
  assert.doesNotMatch(matchPort, /ProductMatchStepOutcome/);
  assert.doesNotMatch(sessionPort, /ProductSessionStepOutcome/);
  for (const indexPath of [
    'packages/arena-product-match/src/index.ts',
    'packages/arena-product-session/src/index.ts',
  ]) {
    const indexSource = await read(indexPath);
    assert.doesNotMatch(indexSource, /Product(?:Match|Session)StepOutcome/);
    assert.doesNotMatch(indexSource, oldPortNames);
  }

  const productionPaths = [
    'packages/arena-product-match/src/product-match-runtime.ts',
    'packages/arena-product-match/src/product-match-coordinator.ts',
    'packages/arena-product-session/src/product-session-controller.ts',
    'packages/arena-product-presentation/src/product-match-presentation-runtime.ts',
    'packages/arena-product-presentation/src/product-presentation-flow.ts',
    'packages/arena-product-presentation/src/product-presentation-session.ts',
    'packages/arena-product-presentation/src/product-input-router.ts',
    'packages/arena-v1-presentation-content/src/arena-frame-projector.ts',
    'packages/arena-v1-application-session/src/product-presentation-session-composition.ts',
    'packages/arena-presentation-runtime/src/arena-input-mapper.ts',
    'packages/arena-presentation-runtime/src/input-sampler.ts',
    'packages/arena-presentation-runtime/src/arena-input-router.ts',
  ];
  const forbiddenProductionAudit = /(?:getLegacyFullSnapshotForAudit|stepWithLegacySnapshotForAudit|runLegacyUntilEndedForAudit|(?:core|matchCore|session)\.get(?:LegacyFullSnapshotForAudit|Snapshot)\s*\()/;
  for (const productionPath of productionPaths) {
    assert.doesNotMatch(await read(productionPath), forbiddenProductionAudit, productionPath);
  }

  const researchRules = [
    ['packages/arena-regression/src/arena-v1-golden-replay-scenarios.ts', /session\.stepWithLegacySnapshotForAudit\(|session\.runLegacyUntilEndedForAudit\(/, /session\.(?:step|runUntilEnded|getSnapshot)\s*\(|['"](?:step|runUntilEnded|getSnapshot)['"]/],
    ['packages/arena-v1-experiment/src/arena-v1-bot-capability-workload.ts', /this\.\#session\.stepWithLegacySnapshotForAudit\(|this\.\#session\.getLegacyFullSnapshotForAudit\(/, /this\.\#session\.(?:step|runUntilEnded|getSnapshot)\s*\(|['"](?:step|runUntilEnded|getSnapshot)['"]/],
    ['packages/arena-v1-greybox-session/src/greybox-presentation-session.ts', /matchSession\.stepWithLegacySnapshotForAudit|matchSession\.getLegacyFullSnapshotForAudit/, /matchSession\.(?:step|runUntilEnded|getSnapshot)\s*\(|['"](?:step|runUntilEnded|getSnapshot)['"]/],
    ['packages/arena-presentation-runtime/src/arena-match-resources.ts', /stepWithLegacySnapshotForAudit|getLegacyFullSnapshotForAudit|legacySnapshotForAudit/, /(?:session|matchSession)\.(?:step|runUntilEnded|getSnapshot)\s*\(|['"](?:step|runUntilEnded|getSnapshot)['"]/],
    ['packages/arena-input-pilot/src/input-pilot-observed-session.ts', /stepWithLegacySnapshotForAudit|getLegacyFullSnapshotForAudit|runLegacyUntilEndedForAudit/, /(?:delegate|session)\.(?:step|runUntilEnded|getSnapshot)\s*\(/],
  ] as const;
  for (const [relativePath, required, forbidden] of researchRules) {
    const researchSource = await read(relativePath);
    assert.match(researchSource, required, relativePath);
    assert.doesNotMatch(researchSource, forbidden, relativePath);
  }

  const productFlow = await read('packages/arena-product-presentation/src/product-presentation-flow.ts');
  assert.match(productFlow, /^  stepMatch\(\): ProductPresentationFlowSnapshot \{/m);
  const experimentContract = await read('packages/arena-experiment/src/simulation-workload-registry.ts');
  assert.match(experimentContract, /readonly getSnapshot: \(\) => unknown;/);
  const headless = await read('packages/arena-match/src/replay.ts');
  assert.match(headless, /^  step\(frames: unknown = \[\]\): readonly ArenaAuthorityEvent\[\] \{/m);
  assert.match(headless, /^  runLegacyUntilEndedForAudit\(/m);
});

test('PA5d static gates keep manifest/evidence generation single-owner and verifier recomputed', async () => {
  const read = async (relativePath: string): Promise<string> => readFile(path.resolve(relativePath), 'utf8');
  const manifest = await read('packages/arena-regression/src/golden-replay-manifest.ts');
  const verifier = await read('packages/arena-regression/src/golden-replay-verifier.ts');
  const components = await read('packages/arena-regression/src/arena-regression-evidence-components.ts');
  const goldenScript = await read('scripts/arena-golden-replay.ts');
  const survivalScript = await read('scripts/arena-survival-golden-replay.ts');
  const evidenceProducer = await read('scripts/lib/arena-regression-evidence-producer.ts');

  assert.match(manifest, /ARENA_GOLDEN_REPLAY_MANIFEST_SCHEMA_VERSION/);
  assert.match(manifest, /cloneFrozenData\(value, 'ArenaGoldenReplayManifest'\)/);
  assert.match(verifier, /validateArenaReplay\(replay\)/);
  assert.match(verifier, /captureExactDataFields\(options/);
  assert.doesNotMatch(verifier, /options\.(manifest|fixtures|scenarioRegistry|coreFactory)/);
  assert.match(verifier, /captureExactDataFields\(scenario, SCENARIO_SOURCE_KEYS/);
  assert.doesNotMatch(verifier, /createLegacyFullSnapshotAuditReader|createTrustedPublicSnapshotReader/);
  assert.match(verifier, /replayMatch\(replay, \{ coreFactory \}\)/);
  assert.match(components, /cloneFrozenData\(values, 'ArenaRegressionEvidence\.components'\)/);
  assert.doesNotMatch(components, /Reflect\.ownKeys\(value as object\)\.filter/);
  assert.match(goldenScript, /staging = path\.join/);
  assert.match(goldenScript, /publicationLock = path\.join/);
  assert.match(goldenScript, /resolveExternalCandidateDirectory/);
  assert.match(goldenScript, /await realpath\(root\)/);
  assert.match(goldenScript, /canonicalParent = await realpath\(lexicalParent\)/);
  assert.match(goldenScript, /parent 必须预先存在，canonical 校验前不得自动创建/);
  assert.doesNotMatch(goldenScript, /mkdir\(lexicalParent/);
  assert.match(goldenScript, /await verifyDirectory\(staging, \{ enforceDirectoryName: false \}\)/);
  assert.match(goldenScript, /await rename\(staging, directory\)/);
  assert.doesNotMatch(goldenScript, /createArenaGoldenReplayManifestEntry\(scenario,/);
  assert.doesNotMatch(goldenScript, /await rm\(directory, \{ recursive: true, force: true \}\)/);
  assert.match(survivalScript, /verifyArenaGoldenReplayCorpus/);
  assert.match(evidenceProducer, /for \(const definition of processDefinitions\(\)\)/);
  assert.doesNotMatch(evidenceProducer, /Promise\.all\(.*processDefinitions/s);

  const allowed = [
    'packages/arena-regression/src/golden-replay-manifest.ts',
    'packages/arena-regression/src/golden-replay-verifier.ts',
    'packages/arena-regression/src/arena-regression-evidence.ts',
    'packages/arena-regression/src/arena-regression-evidence-validation.ts',
    'packages/arena-regression/src/arena-regression-evidence-components.ts',
    'packages/arena-regression/src/index.ts',
    'scripts/arena-golden-replay.ts',
    'scripts/arena-survival-golden-replay.ts',
    'scripts/arena-regression-evidence.ts',
    'scripts/lib/arena-regression-evidence-producer.ts',
    'scripts/lib/arena-stage9-release-producers.ts',
    'packages/arena-regression/test/pa5d-golden-evidence.test.ts',
    'tests/arena/pa5d-manifest-tamper.test.ts',
  ];
  for (const relativePath of allowed) {
    assert.ok(await directoryExists(path.dirname(path.resolve(relativePath))), relativePath);
  }
});

test('PA6 ABBA runner uses attested source redirects and mutually exclusive loader variants', async () => {
  const read = async (relativePath: string): Promise<string> => readFile(path.resolve(relativePath), 'utf8');
  const variants = await read('scripts/lib/arena-pa6-read-step-variants-v1.ts');
  const abba = await read('scripts/lib/arena-pa6-read-step-abba-v1.ts');
  const entry = await read('scripts/arena-pa6-read-step-abba.ts');
  const pressure = await read('scripts/arena-formal-survival-bot-pressure.ts');
  const register = await read('scripts/lib/arena-pa6-source-transform-register-v2.ts');
  const hook = await read('scripts/lib/arena-pa6-source-transform-hook-v2.ts');
  const variantWorker = await read('scripts/arena-pa6-read-step-variant-worker.ts');
  const combined = [variants, abba, entry, register, hook, variantWorker].join('\n');

  assert.match(variants, /profileRead: 'broad'/);
  assert.match(variants, /profileRead: 'split'/);
  assert.match(variants, /resolverRead: 'sequential'/);
  assert.match(variants, /resolverRead: 'multi-intent'/);
  assert.match(pressure, /runArenaReadStepV2/);
  assert.match(pressure, /runArenaPa6FormalReadStepRoundV2/);
  assert.match(register, /register\(hookUrl/);
  assert.match(register, /validateArenaPa6LoaderAttestationV2/);
  assert.match(register, /buildArenaPa6WorkspaceSourceEntryManifestV2/);
  assert.match(register, /workspaceSourceEntries/);
  assert.match(hook, /workspaceRedirectHits\.set/);
  assert.match(hook, /workspaceSourceModules\.set/);
  assert.match(hook, /sourceModuleSetSha256/);
  assert.match(hook, /isWorkspaceDistUrl/);
  assert.match(hook, /locateWorkspaceSourceUrl/);
  assert.match(hook, /const executable = await transform\(source/);
  assert.equal([...hook.matchAll(/return nextLoad\(url, context\)/g)].length, 1);
  assert.match(hook, /未纳入 manifest 的 workspace specifier\/subpath/);
  assert.match(hook, /distLoads: active\.distLoads/);
  assert.match(hook, /replacementCount: options\.enabled \? count : 0/);
  assert.match(hook, /const previewPort = null/);
  assert.match(hook, /'full-audit'/);
  assert.match(variantWorker, /registryRequireCalls/);
  assert.match(variantWorker, /runArenaPa6FormalReadStepRoundV2/);
  assert.match(abba, /sequence: 'A1'/);
  assert.match(abba, /sequence: 'B1'/);
  assert.match(abba, /sequence: 'B2'/);
  assert.match(abba, /sequence: 'A2'/);
  const workerBoundary = abba.slice(
    abba.indexOf('export function runArenaPa6GroupWorkerV1'),
    abba.indexOf('interface ArenaPa6ValidatedPercentilesV1'),
  );
  const parentBoundary = abba.slice(
    abba.indexOf('export async function runArenaPa6AbbaV1'),
    abba.indexOf('export interface ArenaPa6CliOptionsV1'),
  );
  assert.match(workerBoundary, /runArenaPa6StableSourceWindowV1/);
  assert.match(workerBoundary, /timeoutMs,/);
  assert.match(workerBoundary, /outputCapBytes,/);
  assert.doesNotMatch(workerBoundary, /timeoutMs: ARENA_PA6_ABBA_DEFAULT_TIMEOUT_MS/);
  assert.doesNotMatch(workerBoundary, /outputCapBytes: ARENA_PA6_ABBA_DEFAULT_OUTPUT_CAP_BYTES/);
  assert.match(parentBoundary, /runArenaPa6StableSourceWindowV1/);
  assert.match(parentBoundary, /expected-fingerprint/);
  assert.match(parentBoundary, /--timeout-ms=/);
  assert.match(parentBoundary, /--output-cap-bytes=/);
  assert.match(entry, /timeoutMs: options\.timeoutMs/);
  assert.match(entry, /outputCapBytes: options\.outputCapBytes/);
  assert.doesNotMatch(
    [variants, abba, pressure, hook].join('\n'),
    /(?:runArenaPa6FormalReadStepRoundV1|runArenaPa6ReadStepVariantV1|withoutC|withoutD|observePa6SequentialChannels|ARENA_PA6_TRUE_ABLATION_BLOCK_REASON)/,
  );
  assert.doesNotMatch(
    [variants, abba].join('\n'),
    /(?:readFullAuditForEvidence|arena-read-step-runner-v2|@number-strategy-jump\/arena-match|@number-strategy-jump\/arena-session)/,
  );
  assert.doesNotMatch(
    combined,
    /(?:stepWithLegacySnapshotForAudit|runLegacyUntilEndedForAudit|prototype\s*\.|Object\.setPrototypeOf)/,
  );
  assert.doesNotMatch(
    combined,
    /(?:product-input-router|product-session-intent-dispatcher|arena-impact-audio|presentation-frame-loop|presentation-asset-load-task)/,
  );
  assert.doesNotMatch(combined, /arena-read-step-runner-v2[^'"\n]*['"]\s*[,)]?\s*=/);
});
