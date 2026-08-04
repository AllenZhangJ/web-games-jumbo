import { lstat, mkdir, mkdtemp, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  build as esbuild,
  transform as esbuildTransform,
  type Metafile,
  type Plugin,
} from 'esbuild';
import ts from 'typescript';
import {
  assertArenaProductionErrorCatalogV1,
  createArenaProductionErrorCatalogForProductEntriesV1,
  createArenaProductionErrorCatalogEsbuildPluginV1,
  type ArenaProductionErrorCatalogV1,
} from './arena-production-error-catalog-v1.js';

const RUNTIME_PATH = 'game-runtime.js';
const ANCHOR_PATH = '__arena_three_anchor.js';
const MEMORY_OUTPUT_DIRECTORY = '.arena-mini-game-memory-output';
const THREE_ANCHOR_SPECIFIER = 'arena-mini-game-three-anchor';
const THREE_ANCHOR_NAMESPACE = 'arena-mini-game-three-anchor';
const JAVASCRIPT_EXTENSION = '.js';

export const ARENA_MINI_GAME_LAUNCHER_SOURCE = '(()=>{require("./game-runtime.js");})();\n';

export interface ArenaMiniGamePublishedJavaScript {
  readonly relativePath: string;
  readonly source: string;
}

export interface ArenaMiniGameChunkBuildResult {
  readonly files: readonly ArenaMiniGamePublishedJavaScript[];
  readonly runtimePath: typeof RUNTIME_PATH;
  readonly sharedChunkPaths: readonly string[];
  readonly sourceInputs: readonly string[];
}

export interface ArenaMiniGameChunkBuildOptions {
  readonly errorCatalog?: ArenaProductionErrorCatalogV1;
  readonly repositoryRoot: string;
  readonly entryPoint: string;
  readonly target?: 'douyin' | 'wechat';
}

export interface ArenaMiniGameCandidatePublicationOptions {
  readonly parentDirectory: string;
  readonly targetName: 'douyin' | 'wechat';
  readonly populate: (candidateDirectory: string) => Promise<void>;
}

interface ParsedModule {
  readonly relativePath: string;
  readonly requires: readonly string[];
}

function stableStringCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function ownDataOptions<T extends object>(value: T, label: string): Readonly<Record<PropertyKey, unknown>> {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} 必须是普通对象。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key === 'symbol')) throw new TypeError(`${label} 不允许 Symbol 键。`);
  const stringKeys = keys.filter((key): key is string => typeof key === 'string');
  for (const key of stringKeys) {
    const descriptor = descriptors[key];
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`${label}.${String(key)} 必须是可枚举数据字段。`);
    }
  }
  return Object.freeze(Object.fromEntries(stringKeys.map((key) => [key, descriptors[key]?.value])));
}

function exactKeys(
  record: Readonly<Record<PropertyKey, unknown>>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${label} 字段必须精确为 ${wanted.join(', ')}。`);
  }
}

function absoluteDirectory(value: unknown, label: string): string {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.trim() !== value) {
    throw new TypeError(`${label} 必须是绝对路径。`);
  }
  return path.resolve(value);
}

function normalizedRelativeJavaScriptPath(value: unknown, label: string): string {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.includes('\\')
    || value.includes('\0')
    || path.posix.isAbsolute(value)
    || path.posix.normalize(value) !== value
    || value === '..'
    || value.startsWith('../')
    || !value.endsWith(JAVASCRIPT_EXTENSION)
  ) {
    throw new TypeError(`${label} 必须是无逃逸的 POSIX 相对 JavaScript 路径。`);
  }
  return value;
}

function clonePublishedFile(
  value: ArenaMiniGamePublishedJavaScript,
  index: number,
): ArenaMiniGamePublishedJavaScript {
  const record = ownDataOptions(value, `小游戏 JavaScript[${index}]`);
  exactKeys(record, ['relativePath', 'source'], `小游戏 JavaScript[${index}]`);
  const relativePath = normalizedRelativeJavaScriptPath(
    record.relativePath,
    `小游戏 JavaScript[${index}].relativePath`,
  );
  if (typeof record.source !== 'string' || record.source.length === 0) {
    throw new TypeError(`小游戏 JavaScript ${relativePath} 不允许空产物。`);
  }
  return Object.freeze({ relativePath, source: record.source });
}

function parseCommonJsModule(
  file: ArenaMiniGamePublishedJavaScript,
  availablePaths: ReadonlySet<string>,
): ParsedModule {
  const sourceFile = ts.createSourceFile(
    file.relativePath,
    file.source,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.JS,
  );
  const parseDiagnostics = (sourceFile as ts.SourceFile & {
    readonly parseDiagnostics?: readonly ts.Diagnostic[];
  }).parseDiagnostics ?? [];
  if (parseDiagnostics.length > 0) {
    throw new SyntaxError(`小游戏 JavaScript ${file.relativePath} 不是有效 ES2020 JavaScript。`);
  }
  const requires: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node)
      || ts.isImportEqualsDeclaration(node)
      || ts.isExportDeclaration(node)
      || ts.isExportAssignment(node)
      || (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(
        (modifier: ts.Modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ))
    ) {
      throw new SyntaxError(`小游戏 JavaScript ${file.relativePath} 不允许 import/export。`);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      throw new SyntaxError(`小游戏 JavaScript ${file.relativePath} 不允许动态 import。`);
    }
    if (
      ts.isIdentifier(node)
      && node.text === 'require'
      && !(ts.isCallExpression(node.parent) && node.parent.expression === node)
      && !(
        (
          ts.isMethodDeclaration(node.parent)
          || ts.isPropertyDeclaration(node.parent)
          || ts.isPropertyAssignment(node.parent)
          || ts.isGetAccessorDeclaration(node.parent)
          || ts.isSetAccessorDeclaration(node.parent)
        )
        && node.parent.name === node
      )
      && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)
    ) {
      throw new SyntaxError(`小游戏 JavaScript ${file.relativePath} 不允许间接或重绑定 require。`);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      const argument = node.arguments[0];
      if (node.arguments.length !== 1 || argument === undefined || !ts.isStringLiteral(argument)) {
        throw new SyntaxError(`小游戏 JavaScript ${file.relativePath} 的 require 必须是单一字符串静态 require。`);
      }
      const specifier = argument.text;
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        throw new SyntaxError(`小游戏 JavaScript ${file.relativePath} 的 require 必须使用相对路径。`);
      }
      if (!specifier.endsWith(JAVASCRIPT_EXTENSION)) {
        throw new SyntaxError(`小游戏 JavaScript ${file.relativePath} 的 require 必须指向 .js。`);
      }
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file.relativePath), specifier));
      if (resolved === '..' || resolved.startsWith('../') || !availablePaths.has(resolved)) {
        throw new SyntaxError(`小游戏 JavaScript ${file.relativePath} 的 require 目标 ${specifier} 不存在于同批产物。`);
      }
      requires.push(resolved);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return Object.freeze({ relativePath: file.relativePath, requires: Object.freeze(requires) });
}

export function validateArenaMiniGamePublishedJavaScript(
  values: readonly ArenaMiniGamePublishedJavaScript[],
): readonly ArenaMiniGamePublishedJavaScript[] {
  if (!Array.isArray(values) || values.length < 3) {
    throw new TypeError('小游戏 JavaScript 批次必须包含 game.js、runtime 与至少一个共享块。');
  }
  const files = values.map(clonePublishedFile).sort((left, right) => (
    stableStringCompare(left.relativePath, right.relativePath)
  ));
  const paths = files.map(({ relativePath }) => relativePath);
  if (new Set(paths).size !== paths.length) throw new TypeError('小游戏 JavaScript 路径不得重复。');
  const byPath = new Map(files.map((file) => [file.relativePath, file]));
  const launcher = byPath.get('game.js');
  if (launcher?.source !== ARENA_MINI_GAME_LAUNCHER_SOURCE) {
    throw new TypeError('game.js 必须是只同步 require game-runtime.js 的极薄 IIFE。');
  }
  if (!byPath.has(RUNTIME_PATH)) throw new TypeError('小游戏 JavaScript 批次缺少唯一 game-runtime.js。');
  if (paths.some((relativePath) => relativePath.includes('arena_three_anchor'))) {
    throw new TypeError('Three anchor 只能参与共享边界计算，不得发布。');
  }
  const sharedPaths = paths.filter((relativePath) => relativePath !== 'game.js' && relativePath !== RUNTIME_PATH);
  if (sharedPaths.length === 0) throw new TypeError('小游戏 JavaScript 批次至少需要一个共享块。');
  const availablePaths = new Set(paths);
  const modules = files.map((file) => parseCommonJsModule(file, availablePaths));
  const moduleByPath = new Map(modules.map((module) => [module.relativePath, module]));
  const runtime = moduleByPath.get(RUNTIME_PATH);
  if (runtime === undefined || !runtime.requires.some((requiredPath) => sharedPaths.includes(requiredPath))) {
    throw new TypeError('game-runtime.js 必须静态 require 至少一个共享块。');
  }
  const visited = new Set<string>();
  const pending = ['game.js'];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    const module = moduleByPath.get(current);
    if (module === undefined) throw new TypeError(`小游戏 JavaScript 依赖 ${current} 不存在。`);
    pending.push(...module.requires);
  }
  const unreachable = paths.filter((relativePath) => !visited.has(relativePath));
  if (unreachable.length > 0) {
    throw new TypeError(`小游戏 JavaScript 存在不可达产物：${unreachable.join(', ')}。`);
  }
  const gameIndex = files.findIndex(({ relativePath }) => relativePath === 'game.js');
  const ordered = [files[gameIndex]!, ...files.slice(0, gameIndex), ...files.slice(gameIndex + 1)];
  return Object.freeze(ordered);
}

function threeAnchorPlugin(): Plugin {
  return {
    name: 'arena-mini-game-three-anchor',
    setup(build) {
      const resolveDir = build.initialOptions.absWorkingDir;
      if (resolveDir === undefined) throw new Error('Three anchor 构建缺少 absWorkingDir。');
      build.onResolve({ filter: /^arena-mini-game-three-anchor$/ }, () => ({
        path: THREE_ANCHOR_SPECIFIER,
        namespace: THREE_ANCHOR_NAMESPACE,
      }));
      build.onLoad({ filter: /.*/, namespace: THREE_ANCHOR_NAMESPACE }, () => ({
        contents: 'export { Scene as ArenaMiniGameSharedSceneAnchor } from "three";',
        loader: 'js',
        resolveDir,
      }));
    },
  };
}

function metafileOutputForPath(
  metafile: Metafile,
  repositoryRoot: string,
  absoluteOutputPath: string,
): Metafile['outputs'][string] | undefined {
  return Object.entries(metafile.outputs).find(([outputPath]) => (
    path.resolve(repositoryRoot, outputPath) === absoluteOutputPath
  ))?.[1];
}

export async function transformArenaMiniGameEsmJavaScript(
  relativePathValue: string,
  source: string,
): Promise<ArenaMiniGamePublishedJavaScript> {
  const relativePath = normalizedRelativeJavaScriptPath(relativePathValue, 'ESM transform 路径');
  if (typeof source !== 'string' || source.length === 0) {
    throw new TypeError(`小游戏 ESM ${relativePath} 不允许空产物。`);
  }
  const output = await esbuildTransform(source, {
    sourcefile: relativePath,
    loader: 'js',
    format: 'cjs',
    target: 'es2020',
    charset: 'utf8',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
  });
  if (output.code.length === 0) throw new Error(`小游戏 CJS transform 产生空产物：${relativePath}。`);
  return Object.freeze({ relativePath, source: output.code });
}

export async function buildArenaMiniGameChunkBuild(
  options: ArenaMiniGameChunkBuildOptions,
): Promise<ArenaMiniGameChunkBuildResult> {
  const record = ownDataOptions(options, '小游戏共享块构建选项');
  const hasExplicitCatalog = Object.prototype.hasOwnProperty.call(record, 'errorCatalog');
  const hasExplicitTarget = Object.prototype.hasOwnProperty.call(record, 'target');
  if (hasExplicitCatalog !== hasExplicitTarget) {
    throw new TypeError('小游戏共享块构建 errorCatalog 与 target 必须同时提供。');
  }
  exactKeys(
    record,
    hasExplicitCatalog
      ? ['entryPoint', 'errorCatalog', 'repositoryRoot', 'target']
      : ['entryPoint', 'repositoryRoot'],
    '小游戏共享块构建选项',
  );
  const repositoryRoot = absoluteDirectory(record.repositoryRoot, 'repositoryRoot');
  const entryPoint = typeof record.entryPoint === 'string' && path.isAbsolute(record.entryPoint)
    ? path.resolve(record.entryPoint)
    : (() => { throw new TypeError('entryPoint 必须是绝对路径。'); })();
  const relativeEntryPoint = path.relative(repositoryRoot, entryPoint);
  if (relativeEntryPoint === '..' || relativeEntryPoint.startsWith(`..${path.sep}`)) {
    throw new RangeError('entryPoint 必须位于 repositoryRoot 内。');
  }
  const inferredTarget = relativeEntryPoint.split(path.sep).join('/') === 'src/entry/wechat.ts'
    ? 'wechat'
    : relativeEntryPoint.split(path.sep).join('/') === 'src/entry/douyin.ts'
      ? 'douyin'
      : null;
  const target = hasExplicitTarget ? record.target : inferredTarget;
  if (target !== 'wechat' && target !== 'douyin') {
    throw new TypeError('小游戏共享块构建 target 必须是 wechat 或 douyin Product entry。');
  }
  const errorCatalog = hasExplicitCatalog
    ? assertArenaProductionErrorCatalogV1(record.errorCatalog)
    : await createArenaProductionErrorCatalogForProductEntriesV1({
      repositoryRoot,
      entryPoints: Object.freeze({
        douyin: path.join(repositoryRoot, 'src/entry/douyin.ts'),
        web: path.join(repositoryRoot, 'src/entry/web.ts'),
        wechat: path.join(repositoryRoot, 'src/entry/wechat.ts'),
      }),
    });
  const outputDirectory = path.join(repositoryRoot, MEMORY_OUTPUT_DIRECTORY);
  const diagnosticTransform = createArenaProductionErrorCatalogEsbuildPluginV1({
    catalog: errorCatalog,
    repositoryRoot,
    target,
  });
  const result = await esbuild({
    absWorkingDir: repositoryRoot,
    entryPoints: [
      { in: entryPoint, out: 'game-runtime' },
      { in: THREE_ANCHOR_SPECIFIER, out: '__arena_three_anchor' },
    ],
    outdir: outputDirectory,
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2020',
    treeShaking: true,
    charset: 'utf8',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    entryNames: '[name]',
    chunkNames: 'chunks/[name]-[hash]',
    metafile: true,
    write: false,
    plugins: [threeAnchorPlugin(), diagnosticTransform.plugin],
  });
  diagnosticTransform.assertComplete();
  if (result.metafile === undefined) throw new Error('小游戏共享块构建缺少 metafile。');
  const intermediate = result.outputFiles.map((file) => {
    const relativePath = normalizedRelativeJavaScriptPath(
      path.relative(outputDirectory, file.path).split(path.sep).join('/'),
      'esbuild 输出路径',
    );
    return Object.freeze({
      absolutePath: file.path,
      relativePath,
      source: file.text,
      metadata: metafileOutputForPath(result.metafile!, repositoryRoot, file.path),
    });
  });
  if (intermediate.some(({ metadata }) => metadata === undefined)) {
    throw new Error('小游戏共享块构建存在未被 metafile 记录的输出。');
  }
  const runtimeOutputs = intermediate.filter(({ relativePath }) => relativePath === RUNTIME_PATH);
  const anchorOutputs = intermediate.filter(({ relativePath }) => relativePath === ANCHOR_PATH);
  const sharedOutputs = intermediate.filter(({ metadata, relativePath }) => (
    relativePath !== RUNTIME_PATH && relativePath !== ANCHOR_PATH && metadata?.entryPoint === undefined
  ));
  if (runtimeOutputs.length !== 1) throw new Error('小游戏共享块构建必须恰好生成一个 runtime entry。');
  if (anchorOutputs.length !== 1) throw new Error('小游戏共享块构建必须恰好生成一个未发布 anchor entry。');
  if (sharedOutputs.length < 1) throw new Error('小游戏共享块构建未生成共享 chunk。');
  const entryOutputs = intermediate.filter(({ metadata }) => metadata?.entryPoint !== undefined);
  if (
    entryOutputs.length !== 2
    || runtimeOutputs[0]?.metadata?.entryPoint === undefined
    || anchorOutputs[0]?.metadata?.entryPoint === undefined
  ) {
    throw new Error('小游戏共享块构建 entry/metafile 身份不一致。');
  }
  const transformed = await Promise.all(intermediate
    .filter(({ relativePath }) => relativePath !== ANCHOR_PATH)
    .map(({ relativePath, source }) => transformArenaMiniGameEsmJavaScript(relativePath, source)));
  const files = validateArenaMiniGamePublishedJavaScript([
    Object.freeze({ relativePath: 'game.js', source: ARENA_MINI_GAME_LAUNCHER_SOURCE }),
    ...transformed,
  ]);
  const sourceInputs = Object.freeze(Object.keys(result.metafile.inputs).sort(stableStringCompare));
  const sharedChunkPaths = Object.freeze(sharedOutputs
    .map(({ relativePath }) => relativePath)
    .sort(stableStringCompare));
  return Object.freeze({
    files,
    runtimePath: RUNTIME_PATH,
    sharedChunkPaths,
    sourceInputs,
  });
}

async function assertRealDirectory(absolutePath: string, label: string): Promise<string> {
  const metadata = await lstat(absolutePath);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new TypeError(`${label} 必须是非符号链接目录。`);
  }
  const canonical = await realpath(absolutePath);
  if (canonical !== absolutePath) throw new TypeError(`${label} 必须使用 canonical 路径。`);
  return canonical;
}

export async function writeArenaMiniGameJavaScriptBatch(
  candidateDirectory: string,
  files: readonly ArenaMiniGamePublishedJavaScript[],
): Promise<void> {
  const canonicalCandidate = await assertRealDirectory(
    absoluteDirectory(candidateDirectory, 'candidateDirectory'),
    'candidateDirectory',
  );
  const validated = validateArenaMiniGamePublishedJavaScript(files);
  for (const file of validated) {
    const destination = path.join(canonicalCandidate, ...file.relativePath.split('/'));
    const parent = path.dirname(destination);
    await mkdir(parent, { recursive: true });
    const canonicalParent = await realpath(parent);
    if (
      canonicalParent !== parent
      || (canonicalParent !== canonicalCandidate && !canonicalParent.startsWith(`${canonicalCandidate}${path.sep}`))
    ) {
      throw new TypeError(`小游戏 JavaScript ${file.relativePath} 的父目录不安全。`);
    }
    await writeFile(destination, file.source, { encoding: 'utf8', flag: 'wx' });
  }
}

export async function publishArenaMiniGameCandidateDirectory(
  options: ArenaMiniGameCandidatePublicationOptions,
): Promise<string> {
  const record = ownDataOptions(options, '小游戏候选发布选项');
  exactKeys(record, ['parentDirectory', 'populate', 'targetName'], '小游戏候选发布选项');
  const parentDirectory = await assertRealDirectory(
    absoluteDirectory(record.parentDirectory, 'parentDirectory'),
    'parentDirectory',
  );
  if (record.targetName !== 'wechat' && record.targetName !== 'douyin') {
    throw new TypeError('targetName 必须是 wechat 或 douyin。');
  }
  if (typeof record.populate !== 'function') throw new TypeError('populate 必须是函数。');
  const populate = record.populate as (candidateDirectory: string) => Promise<void>;
  const candidate = await mkdtemp(path.join(parentDirectory, `.${record.targetName}-candidate-`));
  const target = path.join(parentDirectory, record.targetName);
  let published = false;
  let primaryFailure: unknown = null;
  try {
    await populate(candidate);
    await assertRealDirectory(candidate, '小游戏候选目录');
    try {
      await lstat(target);
      throw new Error(`小游戏发布目标已存在：${record.targetName}。`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await rename(candidate, target);
    published = true;
    return target;
  } catch (error) {
    primaryFailure = error;
    throw error;
  } finally {
    if (!published) {
      try {
        await rm(candidate, { recursive: true, force: true });
      } catch (cleanupError) {
        if (primaryFailure !== null) {
          throw new AggregateError([primaryFailure, cleanupError], '小游戏候选失败且清理失败。');
        }
        throw cleanupError;
      }
    }
  }
}
