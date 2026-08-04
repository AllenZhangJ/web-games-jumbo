import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
  constants as zlibConstants,
  gunzipSync,
  gzipSync,
} from 'node:zlib';
import { build as esbuild, type Plugin as EsbuildPlugin } from 'esbuild';
import MagicString from 'magic-string';
import {
  SourceMapConsumer,
  SourceMapGenerator,
  type RawSourceMap,
} from 'source-map-js';
import ts from 'typescript';
import type { Plugin as VitePlugin } from 'vite';

export const ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION = 1 as const;
export const ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID = 'arena.production-error-catalog-transform.v1';
export const ARENA_PRODUCTION_ERROR_CATALOG_RELATIVE_PATH =
  'assets/diagnostics/arena-production-error-catalog-v1.json.gz';
export const ARENA_PRODUCTION_ERROR_REFERENCE_RELATIVE_PATH =
  'assets/diagnostics/arena-production-error-catalog-reference-v1.json';
export const ARENA_PRODUCTION_ERROR_CATALOG_MAX_COMPRESSED_BYTES = 2 * 1024 * 1024;
export const ARENA_PRODUCTION_ERROR_CATALOG_MAX_UNCOMPRESSED_BYTES = 8 * 1024 * 1024;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ERROR_CODE_PATTERN = /^E[A-Za-z0-9_-]{6}$/;
const GLOBAL_ERROR_CONSTRUCTORS = new Set(['Error', 'RangeError', 'TypeError']);
export const ARENA_PRODUCTION_ERROR_DISPOSITION_KINDS = Object.freeze([
  'aggregate-error',
  'custom-error',
  'dynamic-approved',
  'semantic-preserve',
  'transformed',
  'unsupported',
] as const);
const TARGETS = Object.freeze(['douyin', 'web', 'wechat'] as const);
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const VALIDATED_CATALOGS = new WeakSet<object>();

export type ArenaProductionErrorTargetV1 = typeof TARGETS[number];
export type ArenaProductionErrorDispositionKindV1 = typeof ARENA_PRODUCTION_ERROR_DISPOSITION_KINDS[number];

export interface ArenaProductionErrorSourceModuleV1 {
  readonly modulePath: string;
  readonly sourceHash: string;
}

export interface ArenaProductionErrorCatalogSiteV1 {
  readonly column: number;
  readonly line: number;
  readonly modulePath: string;
}

export interface ArenaProductionErrorCatalogEntryV1 {
  readonly code: string;
  readonly constructorName: 'Error' | 'RangeError' | 'TypeError';
  readonly expressionAsts: readonly string[];
  readonly identityHash: string;
  readonly placeholderCount: number;
  readonly sites: readonly ArenaProductionErrorCatalogSiteV1[];
  readonly staticSegments: readonly string[];
}

export interface ArenaProductionErrorDispositionCountsV1 {
  readonly aggregateError: number;
  readonly customError: number;
  readonly dynamicApproved: number;
  readonly semanticPreserve: number;
  readonly transformed: number;
  readonly unsupported: number;
}

export interface ArenaProductionErrorTargetInventoryV1 {
  readonly modulePaths: readonly string[];
  readonly target: ArenaProductionErrorTargetV1;
  readonly transformedOccurrences: number;
}

export interface ArenaProductionErrorCatalogV1 {
  readonly catalogHash: string;
  readonly dispositionCounts: ArenaProductionErrorDispositionCountsV1;
  readonly entries: readonly ArenaProductionErrorCatalogEntryV1[];
  readonly schemaVersion: typeof ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION;
  readonly sourceInventoryHash: string;
  readonly sourceModules: readonly ArenaProductionErrorSourceModuleV1[];
  readonly targets: readonly ArenaProductionErrorTargetInventoryV1[];
  readonly transformId: typeof ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID;
}

export interface ArenaProductionErrorCatalogReferenceV1 {
  readonly catalogHash: string;
  readonly schemaVersion: typeof ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION;
  readonly sourceInventoryHash: string;
  readonly transformId: typeof ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID;
}

export interface ArenaProductionErrorModuleInputV1 {
  readonly modulePath: string;
  readonly source: string;
}

export interface ArenaProductionErrorProductEntryPointsV1 {
  readonly douyin: string;
  readonly web: string;
  readonly wechat: string;
}

interface ScannedDisposition {
  readonly category: ArenaProductionErrorDispositionKindV1;
  readonly constructorName: string;
  readonly end: number;
  readonly identityHash: string | null;
  readonly modulePath: string;
  readonly start: number;
}

interface ScannedTransform {
  readonly constructorName: 'Error' | 'RangeError' | 'TypeError';
  readonly end: number;
  readonly expressionAsts: readonly string[];
  readonly expressionSources: readonly string[];
  readonly identityHash: string;
  readonly placeholderCount: number;
  readonly start: number;
  readonly staticSegments: readonly string[];
}

interface ScannedModule {
  readonly dispositions: readonly ScannedDisposition[];
  readonly modulePath: string;
  readonly sourceHash: string;
  readonly transforms: readonly ScannedTransform[];
}

interface CreateCatalogOptions {
  readonly targetModulePaths?: Readonly<Partial<Record<ArenaProductionErrorTargetV1, readonly string[]>>>;
}

interface TransformModuleOptions {
  readonly catalog: ArenaProductionErrorCatalogV1;
  readonly modulePath: string;
  readonly source: string;
}

interface ProductCatalogOptions {
  readonly entryPoints: ArenaProductionErrorProductEntryPointsV1;
  readonly repositoryRoot: string;
}

interface CatalogPluginOptions {
  readonly catalog: ArenaProductionErrorCatalogV1;
  readonly repositoryRoot: string;
  readonly target: ArenaProductionErrorTargetV1;
}

interface ComposeSourceMapOptions {
  readonly modulePath: string;
  readonly repositoryRoot: string;
  readonly transformedMap: string;
  readonly upstreamMapPath: string;
}

interface RewriteWebSourceMapsOptions {
  readonly outputDirectory: string;
  readonly repositoryRoot: string;
}

interface StableFile {
  readonly bytes: Buffer;
  readonly canonicalPath: string;
}

function stableStringCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function deepFreeze<T>(value: T, visited = new Set<object>()): T {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return value;
  const object = value as object;
  if (visited.has(object)) return value;
  visited.add(object);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(object))) {
    if ('value' in descriptor) deepFreeze(descriptor.value, visited);
  }
  return Object.freeze(value);
}

function canonicalJson(value: unknown, ancestors: ReadonlySet<object> = new Set()): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('canonical JSON 不允许非有限数。');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new TypeError('canonical JSON 不允许循环引用。');
    const nestedAncestors = new Set(ancestors).add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key === 'symbol')) {
      throw new TypeError('canonical JSON 数组不允许 Symbol 键。');
    }
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        throw new TypeError('canonical JSON 数组必须稠密且只含数据项。');
      }
    }
    const allowed = new Set(['length', ...Array.from({ length: value.length }, (_, index) => String(index))]);
    if (Object.keys(descriptors).some((key) => !allowed.has(key))) {
      throw new TypeError('canonical JSON 数组不允许额外字段。');
    }
    return `[${Array.from({ length: value.length }, (_, index) => (
      canonicalJson(
        (descriptors[String(index)] as PropertyDescriptor & { value: unknown }).value,
        nestedAncestors,
      )
    )).join(',')}]`;
  }
  if (typeof value !== 'object') throw new TypeError('canonical JSON 只接受 JSON 数据。');
  if (ancestors.has(value)) throw new TypeError('canonical JSON 不允许循环引用。');
  const nestedAncestors = new Set(ancestors).add(value);
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError('canonical JSON 对象必须使用 Object.prototype。');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key === 'symbol')) throw new TypeError('canonical JSON 不允许 Symbol 键。');
  const stringKeys = (keys as string[]).sort(stableStringCompare);
  return `{${stringKeys.map((key) => {
    const descriptor = descriptors[key];
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`canonical JSON.${key} 必须是可枚举数据字段。`);
    }
    return `${JSON.stringify(key)}:${canonicalJson(descriptor.value, nestedAncestors)}`;
  }).join(',')}}`;
}

function ownDataRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} 必须是普通对象。`);
  }
  let prototype: object | null;
  let descriptors: PropertyDescriptorMap;
  try {
    prototype = Object.getPrototypeOf(value) as object | null;
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    throw new TypeError(`${label} 无法安全反射。`);
  }
  if (prototype !== Object.prototype) throw new TypeError(`${label} 必须使用 Object.prototype。`);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key === 'symbol')) throw new TypeError(`${label} 不允许 Symbol 键。`);
  const result: Record<string, unknown> = {};
  for (const key of keys as string[]) {
    const descriptor = descriptors[key];
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

function exactKeys(record: Readonly<Record<string, unknown>>, expected: readonly string[], label: string): void {
  const actual = Object.keys(record).sort(stableStringCompare);
  const wanted = [...expected].sort(stableStringCompare);
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${label} 字段不精确。`);
  }
}

function denseArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} 必须是数组。`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key === 'symbol')) {
    throw new TypeError(`${label} 不允许 Symbol 键。`);
  }
  const allowed = new Set(['length', ...Array.from({ length: value.length }, (_, index) => String(index))]);
  if (Object.keys(descriptors).some((key) => !allowed.has(key))) throw new TypeError(`${label} 不允许额外字段。`);
  return Object.freeze(Array.from({ length: value.length }, (_, index) => {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`${label} 必须是稠密数据数组。`);
    }
    return descriptor.value;
  }));
}

function safeCount(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new TypeError(`${label} 必须是非负安全整数。`);
  return value as number;
}

function exactSha256(value: unknown, label: string): string {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) throw new TypeError(`${label} 必须是 SHA-256。`);
  return value;
}

function normalizedModulePath(value: unknown, label = 'modulePath'): string {
  if (
    typeof value !== 'string'
    || value.includes('\\')
    || value.includes('\0')
    || path.posix.isAbsolute(value)
    || path.posix.normalize(value) !== value
    || value === '..'
    || value.startsWith('../')
    || !/^packages\/arena-[^/]+\/dist\/.+\.js$/.test(value)
  ) throw new TypeError(`${label} 必须是 packages/arena-*/dist 内的规范 JavaScript 路径。`);
  return value;
}

function parseSourceFile(modulePath: string, source: string): ts.SourceFile {
  const sourceFile = ts.createSourceFile(modulePath, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const diagnostics = (sourceFile as ts.SourceFile & {
    readonly parseDiagnostics?: readonly ts.Diagnostic[];
  }).parseDiagnostics ?? [];
  if (diagnostics.length > 0) throw new SyntaxError(`${modulePath} 不是有效 JavaScript。`);
  return sourceFile;
}

function declarationNames(name: ts.BindingName): readonly string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) => (
    ts.isOmittedExpression(element) ? [] : declarationNames(element.name)
  ));
}

function isLexicalScope(node: ts.Node): boolean {
  return ts.isSourceFile(node)
    || ts.isBlock(node)
    || ts.isCaseBlock(node)
    || ts.isCatchClause(node)
    || ts.isForStatement(node)
    || ts.isForInStatement(node)
    || ts.isForOfStatement(node)
    || ts.isFunctionLike(node);
}

function nearestScope(node: ts.Node | undefined, variableScope: boolean): ts.Node {
  let current = node;
  while (current !== undefined) {
    if (ts.isSourceFile(current) || (variableScope && ts.isFunctionLike(current))) return current;
    if (!variableScope && isLexicalScope(current)) return current;
    current = current.parent;
  }
  throw new Error('Error constructor scope 缺少 SourceFile。');
}

function lexicalBindings(sourceFile: ts.SourceFile): ReadonlyMap<ts.Node, ReadonlySet<string>> {
  const mutable = new Map<ts.Node, Set<string>>();
  const add = (scope: ts.Node, names: readonly string[]): void => {
    const bindings = mutable.get(scope) ?? new Set<string>();
    names.forEach((name) => bindings.add(name));
    mutable.set(scope, bindings);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportClause(node)) {
      if (node.name) add(sourceFile, [node.name.text]);
      if (node.namedBindings) {
        if (ts.isNamespaceImport(node.namedBindings)) add(sourceFile, [node.namedBindings.name.text]);
        else add(sourceFile, node.namedBindings.elements.map((element) => element.name.text));
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      add(sourceFile, [node.name.text]);
    } else if (ts.isVariableDeclaration(node)) {
      const list = node.parent;
      const blockScoped = ts.isVariableDeclarationList(list)
        && (list.flags & ts.NodeFlags.BlockScoped) !== 0;
      add(nearestScope(node.parent, !blockScoped), declarationNames(node.name));
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      add(nearestScope(node.parent, false), [node.name.text]);
    } else if (ts.isClassDeclaration(node) && node.name) {
      add(nearestScope(node.parent, false), [node.name.text]);
    } else if ((ts.isFunctionExpression(node) || ts.isClassExpression(node)) && node.name) {
      add(node, [node.name.text]);
    } else if (ts.isParameter(node)) {
      const scope = nearestScope(node.parent, true);
      add(scope, declarationNames(node.name));
    } else if (ts.isCatchClause(node) && node.variableDeclaration) {
      add(node, declarationNames(node.variableDeclaration.name));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return new Map([...mutable].map(([scope, names]) => [scope, new Set(names)]));
}

function isUnshadowedGlobal(
  identifier: ts.Identifier,
  bindings: ReadonlyMap<ts.Node, ReadonlySet<string>>,
): boolean {
  let current: ts.Node | undefined = identifier;
  while (current !== undefined) {
    if (bindings.get(current)?.has(identifier.text)) return false;
    current = current.parent;
  }
  return true;
}

function normalizedExpressionAst(expression: ts.Expression, sourceFile: ts.SourceFile): string {
  return ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
    .printNode(ts.EmitHint.Expression, expression, sourceFile)
    .replace(/\r\n/g, '\n');
}

function staticTemplateParts(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): Readonly<{
  expressionAsts: readonly string[];
  expressionSources: readonly string[];
  staticSegments: readonly string[];
}> | null {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return Object.freeze({
      expressionAsts: Object.freeze([]),
      expressionSources: Object.freeze([]),
      staticSegments: Object.freeze([expression.text]),
    });
  }
  if (!ts.isTemplateExpression(expression)) return null;
  const expressionAsts = expression.templateSpans.map((span) => (
    normalizedExpressionAst(span.expression, sourceFile)
  ));
  const expressionSources = expression.templateSpans.map((span) => (
    sourceFile.text.slice(span.expression.getStart(sourceFile), span.expression.end)
  ));
  return Object.freeze({
    expressionAsts: Object.freeze(expressionAsts),
    expressionSources: Object.freeze(expressionSources),
    staticSegments: Object.freeze([
      expression.head.text,
      ...expression.templateSpans.map((span) => span.literal.text),
    ]),
  });
}

function canonicalIdentity(
  constructorName: string,
  staticSegments: readonly string[],
  expressionAsts: readonly string[],
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    constructorName,
    expressionAsts,
    placeholderCount: expressionAsts.length,
    schemaVersion: ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION,
    staticSegments,
    transformId: ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID,
  });
}

function diagnosticCode(identityJson: string): string {
  return `E${createHash('sha256').update(identityJson).digest('base64url').slice(0, 6)}`;
}

function constructorText(expression: ts.Expression, sourceFile: ts.SourceFile): string | null {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return sourceFile.text.slice(expression.getStart(sourceFile), expression.end);
}

function unwrappedConstructorExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function isPotentialUnsupportedErrorConstructor(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): boolean {
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text === 'AggregateError'
      || GLOBAL_ERROR_CONSTRUCTORS.has(expression.name.text);
  }
  if (ts.isElementAccessExpression(expression)) {
    const argument = expression.argumentExpression;
    return argument !== undefined
      && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
      && (argument.text === 'AggregateError' || GLOBAL_ERROR_CONSTRUCTORS.has(argument.text));
  }
  return /(?:^|[^A-Za-z0-9_$])(?:AggregateError|RangeError|TypeError|Error)(?:$|[^A-Za-z0-9_$])/
    .test(sourceFile.text.slice(expression.getStart(sourceFile), expression.end));
}

function scanModule(modulePathValue: string, sourceValue: string): ScannedModule {
  const modulePath = normalizedModulePath(modulePathValue);
  if (typeof sourceValue !== 'string' || sourceValue.length === 0) {
    throw new TypeError(`${modulePath} source 必须是非空字符串。`);
  }
  const sourceFile = parseSourceFile(modulePath, sourceValue);
  const bindings = lexicalBindings(sourceFile);
  const dispositions: ScannedDisposition[] = [];
  const transforms: ScannedTransform[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isNewExpression(node)) {
      const constructorExpression = unwrappedConstructorExpression(node.expression);
      const name = constructorText(constructorExpression, sourceFile);
      const exactIdentifier = ts.isIdentifier(constructorExpression);
      const isGlobal = exactIdentifier
        && GLOBAL_ERROR_CONSTRUCTORS.has(constructorExpression.text)
        && isUnshadowedGlobal(constructorExpression, bindings);
      let category: ArenaProductionErrorDispositionKindV1 | null = null;
      let identityHash: string | null = null;
      if (exactIdentifier && constructorExpression.text === 'AggregateError' && isUnshadowedGlobal(constructorExpression, bindings)) {
        category = 'aggregate-error';
      } else if (isGlobal) {
        const firstArgument = node.arguments?.[0];
        const parts = firstArgument === undefined ? null : staticTemplateParts(firstArgument, sourceFile);
        if (parts === null) {
          category = 'dynamic-approved';
        } else {
          category = 'transformed';
          const identityJson = canonicalJson(canonicalIdentity(
            constructorExpression.text,
            parts.staticSegments,
            parts.expressionAsts,
          ));
          identityHash = sha256(identityJson);
          transforms.push(Object.freeze({
            constructorName: constructorExpression.text as 'Error' | 'RangeError' | 'TypeError',
            end: firstArgument!.end,
            expressionAsts: parts.expressionAsts,
            expressionSources: parts.expressionSources,
            identityHash,
            placeholderCount: parts.expressionAsts.length,
            start: firstArgument!.getStart(sourceFile),
            staticSegments: parts.staticSegments,
          }));
        }
      } else if (exactIdentifier && name !== null && name.endsWith('Error')) {
        category = 'custom-error';
      } else if (isPotentialUnsupportedErrorConstructor(constructorExpression, sourceFile)) {
        category = 'unsupported';
      } else if (name !== null && name.endsWith('Error')) {
        category = 'custom-error';
      }
      if (category !== null) {
        dispositions.push(Object.freeze({
          category,
          constructorName: name ?? '<expression>',
          end: node.end,
          identityHash,
          modulePath,
          start: node.getStart(sourceFile),
        }));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return Object.freeze({
    dispositions: Object.freeze(dispositions),
    modulePath,
    sourceHash: sha256(sourceValue),
    transforms: Object.freeze(transforms),
  });
}

function cloneModuleInput(value: ArenaProductionErrorModuleInputV1, index: number): ArenaProductionErrorModuleInputV1 {
  const record = ownDataRecord(value, `modules[${index}]`);
  exactKeys(record, ['modulePath', 'source'], `modules[${index}]`);
  const modulePath = normalizedModulePath(record.modulePath, `modules[${index}].modulePath`);
  if (typeof record.source !== 'string' || record.source.length === 0) {
    throw new TypeError(`modules[${index}].source 必须是非空字符串。`);
  }
  return Object.freeze({ modulePath, source: record.source });
}

function dispositionCounts(dispositions: readonly ScannedDisposition[]): ArenaProductionErrorDispositionCountsV1 {
  const count = (category: ArenaProductionErrorDispositionKindV1): number => (
    dispositions.filter((disposition) => disposition.category === category).length
  );
  return Object.freeze({
    aggregateError: count('aggregate-error'),
    customError: count('custom-error'),
    dynamicApproved: count('dynamic-approved'),
    semanticPreserve: count('semantic-preserve'),
    transformed: count('transformed'),
    unsupported: count('unsupported'),
  });
}

function sourceInventoryIdentity(
  modules: readonly ScannedModule[],
  targetModulePaths: Readonly<Partial<Record<ArenaProductionErrorTargetV1, readonly string[]>>>,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    dispositions: Object.freeze(modules.flatMap((module) => module.dispositions.map((disposition) => Object.freeze({
      category: disposition.category,
      constructorName: disposition.constructorName,
      end: disposition.end,
      identityHash: disposition.identityHash,
      modulePath: disposition.modulePath,
      start: disposition.start,
    })))),
    modules: Object.freeze(modules.map(({ modulePath, sourceHash }) => Object.freeze({ modulePath, sourceHash }))),
    schemaVersion: ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION,
    targets: Object.freeze(TARGETS.filter((target) => targetModulePaths[target] !== undefined).map((target) => Object.freeze({
      modulePaths: targetModulePaths[target],
      target,
    }))),
    transformId: ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID,
  });
}

export function createArenaProductionErrorCatalogFromModulesV1(
  moduleValues: readonly ArenaProductionErrorModuleInputV1[],
  options: CreateCatalogOptions = {},
): ArenaProductionErrorCatalogV1 {
  const modules = denseArray(moduleValues, 'modules').map((value, index) => (
    cloneModuleInput(value as ArenaProductionErrorModuleInputV1, index)
  )).sort((left, right) => stableStringCompare(left.modulePath, right.modulePath));
  if (modules.length === 0) throw new TypeError('生产错误 inventory 至少需要一个模块。');
  if (new Set(modules.map(({ modulePath }) => modulePath)).size !== modules.length) {
    throw new TypeError('生产错误 inventory 模块路径不得重复。');
  }
  const scanned = modules.map(({ modulePath, source }) => scanModule(modulePath, source));
  const allDispositions = scanned.flatMap(({ dispositions }) => dispositions);
  const counts = dispositionCounts(allDispositions);
  if (counts.unsupported !== 0) throw new TypeError('生产错误 inventory 存在 unsupported 构造。');

  const targetModulePaths: Partial<Record<ArenaProductionErrorTargetV1, readonly string[]>> = {};
  for (const target of TARGETS) {
    const rawPaths = options.targetModulePaths?.[target];
    if (rawPaths === undefined) continue;
    const paths = denseArray(rawPaths, `${target}.modulePaths`).map((value, index) => (
      normalizedModulePath(value, `${target}.modulePaths[${index}]`)
    )).sort(stableStringCompare);
    if (new Set(paths).size !== paths.length) throw new TypeError(`${target}.modulePaths 不得重复。`);
    const known = new Set(scanned.map(({ modulePath }) => modulePath));
    if (paths.some((modulePath) => !known.has(modulePath))) {
      throw new TypeError(`${target}.modulePaths 必须是联合 inventory 子集。`);
    }
    targetModulePaths[target] = Object.freeze(paths);
  }

  const entryDrafts = new Map<string, {
    constructorName: 'Error' | 'RangeError' | 'TypeError';
    expressionAsts: readonly string[];
    placeholderCount: number;
    sites: ArenaProductionErrorCatalogSiteV1[];
    staticSegments: readonly string[];
  }>();
  for (let moduleIndex = 0; moduleIndex < scanned.length; moduleIndex += 1) {
    const module = scanned[moduleIndex]!;
    const sourceFile = parseSourceFile(module.modulePath, modules[moduleIndex]!.source);
    for (const transform of module.transforms) {
      const position = sourceFile.getLineAndCharacterOfPosition(transform.start);
      const draft = entryDrafts.get(transform.identityHash) ?? {
        constructorName: transform.constructorName,
        expressionAsts: transform.expressionAsts,
        placeholderCount: transform.placeholderCount,
        sites: [],
        staticSegments: transform.staticSegments,
      };
      draft.sites.push(Object.freeze({
        column: position.character + 1,
        line: position.line + 1,
        modulePath: module.modulePath,
      }));
      entryDrafts.set(transform.identityHash, draft);
    }
  }
  const collisionByCode = new Map<string, string>();
  const entries = [...entryDrafts].map(([identityHash, draft]) => {
    const identityJson = canonicalJson(canonicalIdentity(
      draft.constructorName,
      draft.staticSegments,
      draft.expressionAsts,
    ));
    if (sha256(identityJson) !== identityHash) throw new Error('生产错误 canonical identity 漂移。');
    const code = diagnosticCode(identityJson);
    const collision = collisionByCode.get(code);
    if (collision !== undefined && collision !== identityHash) {
      throw new Error(`生产错误码碰撞：${code}。`);
    }
    collisionByCode.set(code, identityHash);
    return Object.freeze({
      code,
      constructorName: draft.constructorName,
      expressionAsts: draft.expressionAsts,
      identityHash,
      placeholderCount: draft.placeholderCount,
      sites: Object.freeze(draft.sites.sort((left, right) => (
        stableStringCompare(left.modulePath, right.modulePath)
        || left.line - right.line
        || left.column - right.column
      ))),
      staticSegments: draft.staticSegments,
    });
  }).sort((left, right) => stableStringCompare(left.code, right.code));

  const sourceModules = Object.freeze(scanned.map(({ modulePath, sourceHash }) => Object.freeze({
    modulePath,
    sourceHash,
  })));
  const sourceInventoryHash = sha256(canonicalJson(sourceInventoryIdentity(scanned, targetModulePaths)));
  const targets = Object.freeze(TARGETS.filter((target) => targetModulePaths[target] !== undefined).map((target) => {
    const modulePaths = targetModulePaths[target]!;
    const included = new Set(modulePaths);
    return Object.freeze({
      modulePaths,
      target,
      transformedOccurrences: scanned
        .filter(({ modulePath }) => included.has(modulePath))
        .reduce((total, module) => total + module.transforms.length, 0),
    });
  }));
  const body = Object.freeze({
    dispositionCounts: counts,
    entries: Object.freeze(entries),
    schemaVersion: ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION,
    sourceInventoryHash,
    sourceModules,
    targets,
    transformId: ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID,
  });
  const catalog = deepFreeze({
    catalogHash: sha256(canonicalJson(body)),
    ...body,
  });
  VALIDATED_CATALOGS.add(catalog);
  return catalog;
}

function replacementForTransform(code: string, transform: ScannedTransform): string {
  if (transform.placeholderCount === 0) return JSON.stringify(code);
  return `\`${code}${transform.expressionSources.map((expression) => `\${${expression}}`).join('')}\``;
}

export function transformArenaProductionErrorModuleV1(
  optionsValue: TransformModuleOptions,
): Readonly<{ code: string; encounteredOccurrences: number; map: string }> {
  const options = ownDataRecord(optionsValue, '生产错误 transform 选项');
  exactKeys(options, ['catalog', 'modulePath', 'source'], '生产错误 transform 选项');
  const catalog = assertArenaProductionErrorCatalogV1(options.catalog);
  const modulePath = normalizedModulePath(options.modulePath);
  if (typeof options.source !== 'string' || options.source.length === 0) {
    throw new TypeError('生产错误 transform source 必须是非空字符串。');
  }
  const expectedModule = catalog.sourceModules.find((module) => module.modulePath === modulePath);
  if (expectedModule === undefined || sha256(options.source) !== expectedModule.sourceHash) {
    throw new Error(`生产错误 transform source 漂移或不在 inventory：${modulePath}。`);
  }
  const scanned = scanModule(modulePath, options.source);
  const entryByIdentity = new Map(catalog.entries.map((entry) => [entry.identityHash, entry]));
  const magic = new MagicString(options.source, { filename: modulePath });
  for (const transform of scanned.transforms) {
    const entry = entryByIdentity.get(transform.identityHash);
    if (entry === undefined) throw new Error(`生产错误 transform 遇到未登记 identity：${modulePath}。`);
    magic.overwrite(transform.start, transform.end, replacementForTransform(entry.code, transform));
  }
  const generatedMap = magic.generateMap({
    file: path.posix.basename(modulePath),
    hires: true,
    includeContent: true,
    source: modulePath,
  });
  return Object.freeze({
    code: magic.toString(),
    encounteredOccurrences: scanned.transforms.length,
    map: generatedMap.toString(),
  });
}

function parseSourceMapRecord(source: string, label: string): Readonly<Record<string, unknown>> {
  let parsed: unknown;
  try { parsed = JSON.parse(source) as unknown; } catch { throw new SyntaxError(`${label} 不是有效 JSON。`); }
  const record = ownDataRecord(parsed, label);
  const allowed = new Set(['file', 'mappings', 'names', 'sourceRoot', 'sources', 'sourcesContent', 'version']);
  if (Object.keys(record).some((key) => !allowed.has(key))) throw new TypeError(`${label} 包含未知字段。`);
  for (const required of ['mappings', 'names', 'sources', 'version']) {
    if (!Object.prototype.hasOwnProperty.call(record, required)) throw new TypeError(`${label} 缺少 ${required}。`);
  }
  if (
    record.version !== 3
    || typeof record.mappings !== 'string'
    || record.mappings.length === 0
  ) throw new TypeError(`${label} V3 合同无效。`);
  if (record.file !== undefined && (typeof record.file !== 'string' || record.file.length === 0)) {
    throw new TypeError(`${label}.file 无效。`);
  }
  if (record.sourceRoot !== undefined && typeof record.sourceRoot !== 'string') {
    throw new TypeError(`${label}.sourceRoot 无效。`);
  }
  const names = denseArray(record.names, `${label}.names`);
  if (names.some((name) => typeof name !== 'string')) throw new TypeError(`${label}.names 必须是字符串数组。`);
  const sources = denseArray(record.sources, `${label}.sources`);
  if (sources.length === 0 || sources.some((sourcePath) => typeof sourcePath !== 'string' || sourcePath.length === 0)) {
    throw new TypeError(`${label}.sources 必须是非空字符串数组。`);
  }
  if (record.sourcesContent !== undefined) {
    const contents = denseArray(record.sourcesContent, `${label}.sourcesContent`);
    if (contents.length !== sources.length || contents.some((content) => typeof content !== 'string')) {
      throw new TypeError(`${label}.sourcesContent 必须与 sources 一一对应。`);
    }
  }
  return record;
}

function normalizedSourceMapRelativePath(value: string, label: string): string {
  const normalizedSeparators = value.replaceAll('\\', '/');
  if (
    normalizedSeparators.includes('\0')
    || /^[A-Za-z][A-Za-z+.-]*:/.test(normalizedSeparators)
    || path.posix.isAbsolute(normalizedSeparators)
  ) throw new TypeError(`${label} 必须是相对文件路径。`);
  const normalized = path.posix.normalize(normalizedSeparators);
  if (normalized === '.' || normalized.length === 0) throw new TypeError(`${label} 不能为空。`);
  return normalized;
}

async function normalizedUpstreamSourceMap(
  upstreamMapPath: string,
  repositoryRoot: string,
): Promise<RawSourceMap> {
  const upstreamBytes = await readStableRegularFile(upstreamMapPath);
  const upstream = parseSourceMapRecord(
    upstreamBytes.bytes.toString('utf8'),
    'TypeScript source map',
  );
  if (typeof upstream.file !== 'string') throw new TypeError('TypeScript source map 缺少 file。');
  const sourceRootValue = upstream.sourceRoot === undefined ? '' : upstream.sourceRoot as string;
  const sourceRoot = sourceRootValue === ''
    ? ''
    : normalizedSourceMapRelativePath(sourceRootValue, 'TypeScript source map.sourceRoot');
  const sourceValues = denseArray(upstream.sources, 'TypeScript source map.sources') as readonly string[];
  const upstreamNames = denseArray(upstream.names, 'TypeScript source map.names') as readonly string[];
  const embeddedContents = upstream.sourcesContent === undefined
    ? null
    : denseArray(upstream.sourcesContent, 'TypeScript source map.sourcesContent') as readonly string[];
  const absoluteSources: string[] = [];
  const sourceContents: string[] = [];
  for (let index = 0; index < sourceValues.length; index += 1) {
    const normalizedSource = normalizedSourceMapRelativePath(
      sourceValues[index]!,
      `TypeScript source map.sources[${index}]`,
    );
    const absoluteSource = path.resolve(
      path.dirname(upstreamMapPath),
      ...path.posix.join(sourceRoot || '.', normalizedSource).split('/'),
    );
    const relative = path.relative(repositoryRoot, absoluteSource).split(path.sep).join('/');
    if (!/^packages\/arena-[^/]+\/src\/.+\.ts$/.test(relative)) {
      throw new RangeError(`TypeScript source map.sources[${index}] 必须位于对应 Arena src。`);
    }
    const stable = await readStableRegularFile(absoluteSource);
    if (stable.canonicalPath !== absoluteSource) {
      throw new TypeError(`TypeScript source map.sources[${index}] 必须是 canonical 路径。`);
    }
    const actualContent = stable.bytes.toString('utf8');
    const embedded = embeddedContents?.[index];
    if (embedded !== undefined && embedded !== actualContent) {
      throw new Error(`TypeScript source map.sourcesContent[${index}] 与源码漂移。`);
    }
    absoluteSources.push(absoluteSource.split(path.sep).join('/'));
    sourceContents.push(actualContent);
  }
  return Object.freeze({
    version: '3',
    file: upstream.file as string,
    sourceRoot: '',
    sources: Object.freeze(absoluteSources) as unknown as string[],
    sourcesContent: Object.freeze(sourceContents) as unknown as string[],
    names: Object.freeze([...upstreamNames]) as unknown as string[],
    mappings: upstream.mappings as string,
  });
}

export async function composeArenaProductionErrorSourceMapV1(
  optionsValue: ComposeSourceMapOptions,
): Promise<string> {
  const options = ownDataRecord(optionsValue, '生产错误 source map 组合选项');
  exactKeys(
    options,
    ['modulePath', 'repositoryRoot', 'transformedMap', 'upstreamMapPath'],
    '生产错误 source map 组合选项',
  );
  const repositoryRoot = absoluteDirectory(options.repositoryRoot, 'repositoryRoot');
  if (await realpath(repositoryRoot) !== repositoryRoot) throw new TypeError('repositoryRoot 必须是 canonical 路径。');
  const modulePath = normalizedModulePath(options.modulePath);
  const expectedMapPath = path.join(repositoryRoot, ...`${modulePath}.map`.split('/'));
  if (typeof options.upstreamMapPath !== 'string' || path.resolve(options.upstreamMapPath) !== expectedMapPath) {
    throw new TypeError('upstreamMapPath 必须精确匹配 modulePath 的同目录 .map。');
  }
  if (typeof options.transformedMap !== 'string') throw new TypeError('transformedMap 必须是字符串。');
  const transformed = parseSourceMapRecord(options.transformedMap, 'MagicString source map');
  const transformedSources = denseArray(transformed.sources, 'MagicString source map.sources');
  const transformedContents = denseArray(
    transformed.sourcesContent,
    'MagicString source map.sourcesContent',
  );
  if (
    transformedSources.length !== 1
    || transformedSources[0] !== modulePath
    || transformedContents.length !== 1
    || typeof transformedContents[0] !== 'string'
  ) throw new TypeError('MagicString source map 必须绑定一个完整 dist source。');

  let downstreamConsumer: SourceMapConsumer;
  let upstreamConsumer: SourceMapConsumer;
  try {
    downstreamConsumer = new SourceMapConsumer(transformed as unknown as RawSourceMap);
    upstreamConsumer = new SourceMapConsumer(await normalizedUpstreamSourceMap(
      expectedMapPath,
      repositoryRoot,
    ));
  } catch {
    throw new TypeError('生产错误 source map 无法解析或 mapping 越界。');
  }
  if (downstreamConsumer.sources.length !== 1 || downstreamConsumer.sources[0] !== modulePath) {
    throw new TypeError('MagicString source map source identity 漂移。');
  }
  if (upstreamConsumer.sources.length === 0 || !upstreamConsumer.hasContentsOfAllSources()) {
    throw new TypeError('TypeScript source map 缺少 source/sourceContent。');
  }
  let generator: SourceMapGenerator;
  try {
    generator = new SourceMapGenerator({
      file: typeof transformed.file === 'string' ? transformed.file : path.posix.basename(modulePath),
    });
    const usedSources = new Set<string>();
    downstreamConsumer.eachMapping((mapping) => {
      if (mapping.originalLine === null || mapping.originalColumn === null) return;
      let original = upstreamConsumer.originalPositionFor({
        line: mapping.originalLine,
        column: mapping.originalColumn,
        bias: SourceMapConsumer.GREATEST_LOWER_BOUND,
      });
      if (original.source === null) {
        original = upstreamConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn,
          bias: SourceMapConsumer.LEAST_UPPER_BOUND,
        });
      }
      if (original.source === null) return;
      usedSources.add(original.source);
      generator.addMapping({
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn,
        },
        original: {
          line: original.line,
          column: original.column,
        },
        source: original.source,
        name: original.name ?? mapping.name,
      });
    }, undefined, SourceMapConsumer.GENERATED_ORDER);
    if (usedSources.size === 0) throw new Error('组合 source map 没有可追溯 mapping。');
    for (const sourcePath of [...usedSources].sort(stableStringCompare)) {
      const content = upstreamConsumer.sourceContentFor(sourcePath, true);
      if (content === null) throw new Error('组合 source map 缺少 sourceContent。');
      generator.setSourceContent(sourcePath, content);
    }
  } catch {
    throw new TypeError('生产错误 source map 组合失败。');
  }
  const composed = generator.toJSON();
  if (
    composed.sources.length === 0
    || composed.sourcesContent === undefined
    || composed.sourcesContent.length !== composed.sources.length
    || composed.sources.some((sourcePath) => {
      const normalized = sourcePath.replaceAll('\\', '/');
      const relative = path.relative(repositoryRoot, normalized).split(path.sep).join('/');
      return !/^packages\/arena-[^/]+\/src\/.+\.ts$/.test(relative);
    })
    || composed.sourcesContent.some((content) => typeof content !== 'string')
  ) throw new TypeError('组合 source map 未完整回到 Arena TypeScript source。');
  return JSON.stringify(composed);
}

function absoluteSourceMapSource(
  sourceMapPath: string,
  sourceRootValue: unknown,
  sourceValue: string,
  label: string,
): string {
  const sourceRoot = sourceRootValue === undefined || sourceRootValue === ''
    ? '.'
    : normalizedSourceMapRelativePath(sourceRootValue as string, `${label}.sourceRoot`);
  const source = normalizedSourceMapRelativePath(sourceValue, `${label}.source`);
  return path.resolve(
    path.dirname(sourceMapPath),
    ...path.posix.join(sourceRoot, source).split('/'),
  );
}

function repositoryRelativeSource(
  repositoryRoot: string,
  sourceMapPath: string,
  absoluteSource: string,
): string {
  const repositoryRelative = path.relative(repositoryRoot, absoluteSource).split(path.sep).join('/');
  if (
    repositoryRelative === '..'
    || repositoryRelative.startsWith('../')
    || path.isAbsolute(repositoryRelative)
  ) throw new RangeError('Web source map source 逃逸仓库。');
  return path.relative(path.dirname(sourceMapPath), absoluteSource).split(path.sep).join('/');
}

async function rewriteArenaProductionErrorBundleMap(
  sourceMapPath: string,
  repositoryRoot: string,
): Promise<string> {
  const sourceMapBytes = await readStableRegularFile(sourceMapPath);
  const sourceMap = parseSourceMapRecord(
    sourceMapBytes.bytes.toString('utf8'),
    'Web bundle source map',
  );
  const bundleConsumer = new SourceMapConsumer(sourceMap as unknown as RawSourceMap);
  if (!bundleConsumer.hasContentsOfAllSources()) {
    throw new TypeError('Web bundle source map 缺少 sourceContent。');
  }
  const upstreamByBundleSource = new Map<string, SourceMapConsumer>();
  for (const source of bundleConsumer.sources) {
    const absoluteSource = absoluteSourceMapSource(
      sourceMapPath,
      sourceMap.sourceRoot,
      source,
      'Web bundle source map',
    );
    const repositoryRelative = path.relative(repositoryRoot, absoluteSource).split(path.sep).join('/');
    if (!/^packages\/arena-[^/]+\/dist\/.+\.js$/.test(repositoryRelative)) continue;
    upstreamByBundleSource.set(source, new SourceMapConsumer(await normalizedUpstreamSourceMap(
      `${absoluteSource}.map`,
      repositoryRoot,
    )));
  }
  if (upstreamByBundleSource.size === 0) {
    throw new TypeError('Web game source map 没有 Arena dist source。');
  }

  const generator = new SourceMapGenerator({
    file: typeof sourceMap.file === 'string' ? sourceMap.file : path.basename(sourceMapPath, '.map'),
  });
  const contentByOutputSource = new Map<string, string>();
  let tracedArenaMappingCount = 0;
  try {
    bundleConsumer.eachMapping((mapping) => {
      if (
        mapping.source === null
        || mapping.originalLine === null
        || mapping.originalColumn === null
      ) return;
      const upstream = upstreamByBundleSource.get(mapping.source);
      if (upstream === undefined) {
        const absoluteSource = absoluteSourceMapSource(
          sourceMapPath,
          sourceMap.sourceRoot,
          mapping.source,
          'Web bundle source map',
        );
        const outputSource = repositoryRelativeSource(repositoryRoot, sourceMapPath, absoluteSource);
        const content = bundleConsumer.sourceContentFor(mapping.source, true);
        if (content === null) throw new Error('Web bundle source map 缺少 sourceContent。');
        const priorContent = contentByOutputSource.get(outputSource);
        if (priorContent !== undefined && priorContent !== content) {
          throw new Error('Web bundle source map sourceContent 冲突。');
        }
        contentByOutputSource.set(outputSource, content);
        generator.addMapping({
          generated: { line: mapping.generatedLine, column: mapping.generatedColumn },
          original: { line: mapping.originalLine, column: mapping.originalColumn },
          source: outputSource,
          name: mapping.name,
        });
        return;
      }
      let original = upstream.originalPositionFor({
        line: mapping.originalLine,
        column: mapping.originalColumn,
        bias: SourceMapConsumer.GREATEST_LOWER_BOUND,
      });
      if (original.source === null) {
        original = upstream.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn,
          bias: SourceMapConsumer.LEAST_UPPER_BOUND,
        });
      }
      if (original.source === null) return;
      const absoluteSource = path.resolve(original.source.replaceAll('\\', '/'));
      const repositoryRelative = path.relative(repositoryRoot, absoluteSource).split(path.sep).join('/');
      if (!/^packages\/arena-[^/]+\/src\/.+\.ts$/.test(repositoryRelative)) {
        throw new Error('Web Arena source map 未上溯到 TypeScript。');
      }
      const outputSource = repositoryRelativeSource(repositoryRoot, sourceMapPath, absoluteSource);
      const content = upstream.sourceContentFor(original.source, true);
      if (content === null) throw new Error('Web Arena TypeScript sourceContent 缺失。');
      const priorContent = contentByOutputSource.get(outputSource);
      if (priorContent !== undefined && priorContent !== content) {
        throw new Error('Web Arena TypeScript sourceContent 冲突。');
      }
      contentByOutputSource.set(outputSource, content);
      tracedArenaMappingCount += 1;
      generator.addMapping({
        generated: { line: mapping.generatedLine, column: mapping.generatedColumn },
        original: { line: original.line, column: original.column },
        source: outputSource,
        name: original.name ?? mapping.name,
      });
    }, undefined, SourceMapConsumer.GENERATED_ORDER);
  } catch {
    throw new TypeError('Web bundle source map 组合失败。');
  }
  if (tracedArenaMappingCount === 0) throw new Error('Web bundle source map 没有可追溯 Arena mapping。');
  for (const [source, content] of [...contentByOutputSource].sort(([left], [right]) => (
    stableStringCompare(left, right)
  ))) generator.setSourceContent(source, content);
  const rewritten = generator.toJSON();
  if (
    rewritten.sources.length === 0
    || rewritten.sourcesContent === undefined
    || rewritten.sourcesContent.length !== rewritten.sources.length
    || rewritten.sources.some((source) => /packages\/arena-[^/]+\/dist\/.+\.js$/.test(
      source.replaceAll('\\', '/'),
    ))
    || !rewritten.sources.some((source) => /packages\/arena-[^/]+\/src\/.+\.ts$/.test(
      source.replaceAll('\\', '/'),
    ))
  ) throw new TypeError('Web bundle source map 未完整消除 Arena dist source。');
  return JSON.stringify(rewritten);
}

export async function rewriteArenaProductionErrorWebSourceMapsV1(
  optionsValue: RewriteWebSourceMapsOptions,
): Promise<void> {
  const options = ownDataRecord(optionsValue, 'Web source map 重写选项');
  exactKeys(options, ['outputDirectory', 'repositoryRoot'], 'Web source map 重写选项');
  const repositoryRoot = absoluteDirectory(options.repositoryRoot, 'repositoryRoot');
  const outputDirectory = absoluteDirectory(options.outputDirectory, 'outputDirectory');
  if (await realpath(repositoryRoot) !== repositoryRoot || await realpath(outputDirectory) !== outputDirectory) {
    throw new TypeError('Web source map 重写目录必须是 canonical 路径。');
  }
  const relativeOutput = path.relative(repositoryRoot, outputDirectory);
  if (relativeOutput === '..' || relativeOutput.startsWith(`..${path.sep}`)) {
    throw new RangeError('Web source map 输出目录逃逸仓库。');
  }
  const assetsDirectory = path.join(outputDirectory, 'assets');
  if (await realpath(assetsDirectory) !== assetsDirectory) throw new TypeError('Web assets 目录不安全。');
  const gameMaps = (await readdir(assetsDirectory)).filter((name) => (
    /^game-[A-Za-z0-9_-]+\.js\.map$/.test(name)
  ));
  if (gameMaps.length !== 1) throw new Error('Web 必须精确生成一个 game source map。');
  const sourceMapPath = path.join(assetsDirectory, gameMaps[0]!);
  const rewritten = await rewriteArenaProductionErrorBundleMap(sourceMapPath, repositoryRoot);
  const temporaryPath = `${sourceMapPath}.arena-errors.tmp`;
  let renamed = false;
  try {
    await writeFile(temporaryPath, rewritten, { encoding: 'utf8', flag: 'wx' });
    const reread = await readStableRegularFile(temporaryPath);
    if (reread.bytes.toString('utf8') !== rewritten) throw new Error('Web source map 临时字节重读不一致。');
    await rename(temporaryPath, sourceMapPath);
    renamed = true;
    const finalBytes = await readStableRegularFile(sourceMapPath);
    const finalMap = parseSourceMapRecord(finalBytes.bytes.toString('utf8'), 'Web 最终 source map');
    const finalSources = denseArray(finalMap.sources, 'Web 最终 source map.sources') as readonly string[];
    if (
      finalSources.some((source) => /packages\/arena-[^/]+\/dist\/.+\.js$/.test(source.replaceAll('\\', '/')))
      || !finalSources.some((source) => /packages\/arena-[^/]+\/src\/.+\.ts$/.test(source.replaceAll('\\', '/')))
    ) throw new Error('Web 最终 source map source identity 未闭合。');
  } finally {
    if (!renamed) await rm(temporaryPath, { force: true });
  }
}

function compareStats(left: Awaited<ReturnType<typeof lstat>>, right: Awaited<ReturnType<typeof lstat>>): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

async function readStableRegularFile(
  absolutePath: string,
  maximumBytes = MAX_FILE_BYTES,
): Promise<StableFile> {
  const before = await lstat(absolutePath);
  if (!before.isFile() || before.isSymbolicLink() || before.size > maximumBytes) {
    throw new TypeError(`生产错误 source 必须是有界普通文件：${absolutePath}。`);
  }
  const canonicalPath = await realpath(absolutePath);
  if (canonicalPath !== absolutePath) throw new TypeError(`生产错误 source 必须使用 canonical 路径：${absolutePath}。`);
  const handle = await open(absolutePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const fdBefore = await handle.stat();
    if (!fdBefore.isFile() || !compareStats(before, fdBefore)) throw new Error('生产错误 source 打开前发生漂移。');
    const bytes = await handle.readFile();
    const fdAfter = await handle.stat();
    const after = await lstat(absolutePath);
    if (!compareStats(fdBefore, fdAfter) || !compareStats(fdAfter, after)) {
      throw new Error('生产错误 source 读取期间发生漂移。');
    }
    return Object.freeze({ bytes, canonicalPath });
  } finally {
    await handle.close();
  }
}

function absoluteDirectory(value: unknown, label: string): string {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.trim() !== value) {
    throw new TypeError(`${label} 必须是绝对路径。`);
  }
  return path.resolve(value);
}

async function reachableArenaModules(
  repositoryRoot: string,
  entryPoint: string,
): Promise<readonly string[]> {
  const result = await esbuild({
    absWorkingDir: repositoryRoot,
    bundle: true,
    entryPoints: [entryPoint],
    format: 'esm',
    legalComments: 'none',
    logLevel: 'silent',
    metafile: true,
    outdir: path.join(repositoryRoot, '.arena-production-error-inventory-memory'),
    platform: 'browser',
    sourcemap: false,
    splitting: false,
    treeShaking: true,
    write: false,
  });
  if (result.metafile === undefined) throw new Error('生产错误 reachability 缺少 metafile。');
  const modulePaths = new Set<string>();
  for (const inputPath of Object.keys(result.metafile.inputs)) {
    const absoluteInput = path.resolve(repositoryRoot, inputPath);
    let canonical: string;
    try {
      canonical = await realpath(absoluteInput);
    } catch {
      continue;
    }
    const relative = path.relative(repositoryRoot, canonical).split(path.sep).join('/');
    if (/^packages\/arena-[^/]+\/dist\/.+\.js$/.test(relative)) modulePaths.add(normalizedModulePath(relative));
  }
  if (modulePaths.size === 0) throw new Error(`生产入口未发现 arena dist 模块：${entryPoint}。`);
  return Object.freeze([...modulePaths].sort(stableStringCompare));
}

export async function createArenaProductionErrorCatalogForProductEntriesV1(
  optionsValue: ProductCatalogOptions,
): Promise<ArenaProductionErrorCatalogV1> {
  const options = ownDataRecord(optionsValue, '生产错误 Product inventory 选项');
  exactKeys(options, ['entryPoints', 'repositoryRoot'], '生产错误 Product inventory 选项');
  const repositoryRoot = absoluteDirectory(options.repositoryRoot, 'repositoryRoot');
  if (await realpath(repositoryRoot) !== repositoryRoot) throw new TypeError('repositoryRoot 必须是 canonical 路径。');
  const entryRecord = ownDataRecord(options.entryPoints, 'entryPoints');
  exactKeys(entryRecord, ['douyin', 'web', 'wechat'], 'entryPoints');
  const entryPoints = Object.fromEntries(TARGETS.map((target) => {
    const value = entryRecord[target];
    if (typeof value !== 'string' || !path.isAbsolute(value)) throw new TypeError(`entryPoints.${target} 必须是绝对路径。`);
    const absolute = path.resolve(value);
    const relative = path.relative(repositoryRoot, absolute);
    if (relative === '..' || relative.startsWith(`..${path.sep}`)) throw new RangeError(`entryPoints.${target} 逃逸仓库。`);
    return [target, absolute];
  })) as unknown as Record<ArenaProductionErrorTargetV1, string>;
  const targetPairs = await Promise.all(TARGETS.map(async (target) => Object.freeze([
    target,
    await reachableArenaModules(repositoryRoot, entryPoints[target]),
  ] as const)));
  const targetModulePaths = Object.fromEntries(targetPairs) as Record<ArenaProductionErrorTargetV1, readonly string[]>;
  const union = [...new Set(targetPairs.flatMap(([, modulePaths]) => modulePaths))].sort(stableStringCompare);
  const modules = await Promise.all(union.map(async (modulePath) => {
    const absolutePath = path.join(repositoryRoot, ...modulePath.split('/'));
    const stable = await readStableRegularFile(absolutePath);
    if (stable.canonicalPath !== absolutePath) throw new TypeError(`生产错误 source 逃逸仓库：${modulePath}。`);
    return Object.freeze({ modulePath, source: stable.bytes.toString('utf8') });
  }));
  return createArenaProductionErrorCatalogFromModulesV1(modules, { targetModulePaths });
}

function expectedTarget(catalog: ArenaProductionErrorCatalogV1, target: ArenaProductionErrorTargetV1) {
  const expected = catalog.targets.find((item) => item.target === target);
  if (expected === undefined) throw new Error(`生产错误 catalog 缺少 ${target} inventory。`);
  return expected;
}

function verifyEncountered(
  expected: ArenaProductionErrorTargetInventoryV1,
  encounteredModules: ReadonlySet<string>,
  encounteredOccurrences: number,
): void {
  const actual = [...encounteredModules].sort(stableStringCompare);
  if (
    actual.length !== expected.modulePaths.length
    || actual.some((modulePath, index) => modulePath !== expected.modulePaths[index])
    || encounteredOccurrences !== expected.transformedOccurrences
  ) throw new Error(`生产错误 ${expected.target} encountered inventory 不闭合。`);
}

function canonicalModulePath(repositoryRoot: string, absolutePath: string): string | null {
  const relative = path.relative(repositoryRoot, absolutePath).split(path.sep).join('/');
  if (!/^packages\/arena-[^/]+\/dist\/.+\.js$/.test(relative)) return null;
  return normalizedModulePath(relative);
}

export function createArenaProductionErrorCatalogVitePluginV1(
  optionsValue: CatalogPluginOptions,
): VitePlugin {
  const options = ownDataRecord(optionsValue, 'Vite 生产错误插件选项');
  exactKeys(options, ['catalog', 'repositoryRoot', 'target'], 'Vite 生产错误插件选项');
  const catalog = assertArenaProductionErrorCatalogV1(options.catalog);
  const repositoryRoot = absoluteDirectory(options.repositoryRoot, 'repositoryRoot');
  if (options.target !== 'web') throw new TypeError('Vite 生产错误插件只接受 web。');
  const expected = expectedTarget(catalog, 'web');
  const expectedModules = new Set(expected.modulePaths);
  const encounteredModules = new Set<string>();
  let encounteredOccurrences = 0;
  return {
    enforce: 'pre',
    name: ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID,
    async transform(source, id) {
      if (id.startsWith('\0')) return null;
      const cleanId = id.split('?', 1)[0]!;
      if (!path.isAbsolute(cleanId)) return null;
      const canonical = await realpath(cleanId).catch(() => null);
      if (canonical === null) return null;
      const modulePath = canonicalModulePath(repositoryRoot, canonical);
      if (modulePath === null) return null;
      if (!expectedModules.has(modulePath)) throw new Error(`Web 遇到未登记 arena source：${modulePath}。`);
      const transformed = transformArenaProductionErrorModuleV1({ catalog, modulePath, source });
      await composeArenaProductionErrorSourceMapV1({
        modulePath,
        repositoryRoot,
        transformedMap: transformed.map,
        upstreamMapPath: `${canonical}.map`,
      });
      encounteredModules.add(modulePath);
      encounteredOccurrences += transformed.encounteredOccurrences;
      return {
        code: transformed.code,
        map: JSON.parse(transformed.map) as {
          file?: string;
          mappings: string;
          names: string[];
          sourceRoot?: string;
          sources: string[];
          sourcesContent?: string[];
          version: number;
        },
      };
    },
    generateBundle() {
      verifyEncountered(expected, encounteredModules, encounteredOccurrences);
      this.emitFile({
        fileName: ARENA_PRODUCTION_ERROR_CATALOG_RELATIVE_PATH,
        source: createArenaProductionErrorCatalogGzipV1(catalog),
        type: 'asset',
      });
    },
  };
}

export function createArenaProductionErrorCatalogEsbuildPluginV1(
  optionsValue: CatalogPluginOptions,
): Readonly<{ assertComplete: () => void; plugin: EsbuildPlugin }> {
  const options = ownDataRecord(optionsValue, 'esbuild 生产错误插件选项');
  exactKeys(options, ['catalog', 'repositoryRoot', 'target'], 'esbuild 生产错误插件选项');
  const catalog = assertArenaProductionErrorCatalogV1(options.catalog);
  const repositoryRoot = absoluteDirectory(options.repositoryRoot, 'repositoryRoot');
  if (options.target !== 'wechat' && options.target !== 'douyin') {
    throw new TypeError('esbuild 生产错误插件 target 必须是 wechat 或 douyin。');
  }
  const expected = expectedTarget(catalog, options.target);
  const expectedModules = new Set(expected.modulePaths);
  const encounteredModules = new Set<string>();
  let encounteredOccurrences = 0;
  const plugin: EsbuildPlugin = {
    name: ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID,
    setup(build) {
      build.onLoad({ filter: /packages[\\/]arena-[^\\/]+[\\/]dist[\\/].+\.js$/ }, async (args) => {
        const canonical = await realpath(args.path);
        const modulePath = canonicalModulePath(repositoryRoot, canonical);
        if (modulePath === null || !expectedModules.has(modulePath)) {
          throw new Error(`小游戏遇到未登记 arena source：${args.path}。`);
        }
        const stable = await readStableRegularFile(canonical);
        const source = stable.bytes.toString('utf8');
        const transformed = transformArenaProductionErrorModuleV1({ catalog, modulePath, source });
        encounteredModules.add(modulePath);
        encounteredOccurrences += transformed.encounteredOccurrences;
        return { contents: transformed.code, loader: 'js', resolveDir: path.dirname(canonical) };
      });
    },
  };
  return Object.freeze({
    assertComplete: () => verifyEncountered(expected, encounteredModules, encounteredOccurrences),
    plugin,
  });
}

function cloneStringArray(
  value: unknown,
  label: string,
  allowEmpty = false,
): readonly string[] {
  return Object.freeze(denseArray(value, label).map((item, index) => {
    if (typeof item !== 'string' || (!allowEmpty && item.length === 0)) {
      throw new TypeError(`${label}[${index}] 必须是${allowEmpty ? '' : '非空'}字符串。`);
    }
    return item;
  }));
}

function parseCatalogObject(value: unknown): ArenaProductionErrorCatalogV1 {
  const record = ownDataRecord(value, '生产错误 catalog');
  exactKeys(record, [
    'catalogHash', 'dispositionCounts', 'entries', 'schemaVersion', 'sourceInventoryHash',
    'sourceModules', 'targets', 'transformId',
  ], '生产错误 catalog');
  if (record.schemaVersion !== ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION) throw new TypeError('生产错误 catalog schemaVersion 不受支持。');
  if (record.transformId !== ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID) throw new TypeError('生产错误 catalog transformId 不受支持。');
  const countsRecord = ownDataRecord(record.dispositionCounts, '生产错误 dispositionCounts');
  exactKeys(countsRecord, ['aggregateError', 'customError', 'dynamicApproved', 'semanticPreserve', 'transformed', 'unsupported'], '生产错误 dispositionCounts');
  const counts = Object.freeze({
    aggregateError: safeCount(countsRecord.aggregateError, 'aggregateError'),
    customError: safeCount(countsRecord.customError, 'customError'),
    dynamicApproved: safeCount(countsRecord.dynamicApproved, 'dynamicApproved'),
    semanticPreserve: safeCount(countsRecord.semanticPreserve, 'semanticPreserve'),
    transformed: safeCount(countsRecord.transformed, 'transformed'),
    unsupported: safeCount(countsRecord.unsupported, 'unsupported'),
  });
  if (counts.unsupported !== 0) throw new TypeError('生产错误 catalog unsupported 必须为 0。');
  const sourceModules = Object.freeze(denseArray(record.sourceModules, 'sourceModules').map((item, index) => {
    const module = ownDataRecord(item, `sourceModules[${index}]`);
    exactKeys(module, ['modulePath', 'sourceHash'], `sourceModules[${index}]`);
    return Object.freeze({
      modulePath: normalizedModulePath(module.modulePath),
      sourceHash: exactSha256(module.sourceHash, `sourceModules[${index}].sourceHash`),
    });
  }));
  if (new Set(sourceModules.map(({ modulePath }) => modulePath)).size !== sourceModules.length) {
    throw new TypeError('生产错误 catalog sourceModules 不得重复。');
  }
  if (sourceModules.some((module, index) => (
    index > 0 && stableStringCompare(sourceModules[index - 1]!.modulePath, module.modulePath) >= 0
  ))) throw new TypeError('生产错误 catalog sourceModules 必须稳定排序。');
  const entries = Object.freeze(denseArray(record.entries, 'entries').map((item, index) => {
    const entry = ownDataRecord(item, `entries[${index}]`);
    exactKeys(entry, ['code', 'constructorName', 'expressionAsts', 'identityHash', 'placeholderCount', 'sites', 'staticSegments'], `entries[${index}]`);
    if (typeof entry.code !== 'string' || !ERROR_CODE_PATTERN.test(entry.code)) throw new TypeError(`entries[${index}].code 无效。`);
    if (typeof entry.constructorName !== 'string' || !GLOBAL_ERROR_CONSTRUCTORS.has(entry.constructorName)) {
      throw new TypeError(`entries[${index}].constructorName 无效。`);
    }
    const expressionAsts = cloneStringArray(entry.expressionAsts, `entries[${index}].expressionAsts`);
    const staticSegments = cloneStringArray(
      entry.staticSegments,
      `entries[${index}].staticSegments`,
      true,
    );
    const placeholderCount = safeCount(entry.placeholderCount, `entries[${index}].placeholderCount`);
    if (placeholderCount !== expressionAsts.length || staticSegments.length !== placeholderCount + 1) {
      throw new TypeError(`entries[${index}] template shape 无效。`);
    }
    const sites = Object.freeze(denseArray(entry.sites, `entries[${index}].sites`).map((siteValue, siteIndex) => {
      const site = ownDataRecord(siteValue, `entries[${index}].sites[${siteIndex}]`);
      exactKeys(site, ['column', 'line', 'modulePath'], `entries[${index}].sites[${siteIndex}]`);
      const line = safeCount(site.line, 'site.line');
      const column = safeCount(site.column, 'site.column');
      if (line < 1 || column < 1) throw new TypeError('catalog site line/column 必须从 1 开始。');
      return Object.freeze({ column, line, modulePath: normalizedModulePath(site.modulePath) });
    }));
    if (sites.length === 0) throw new TypeError('catalog entry 至少需要一个 site。');
    if (sites.some((site, siteIndex) => siteIndex > 0 && (
      stableStringCompare(sites[siteIndex - 1]!.modulePath, site.modulePath)
      || sites[siteIndex - 1]!.line - site.line
      || sites[siteIndex - 1]!.column - site.column
    ) >= 0)) throw new TypeError('catalog entry sites 必须稳定排序且不重复。');
    const identityJson = canonicalJson(canonicalIdentity(
      entry.constructorName as string,
      staticSegments,
      expressionAsts,
    ));
    const identityHash = exactSha256(entry.identityHash, `entries[${index}].identityHash`);
    if (sha256(identityJson) !== identityHash || diagnosticCode(identityJson) !== entry.code) {
      throw new TypeError(`entries[${index}] identity/code 不闭合。`);
    }
    return Object.freeze({
      code: entry.code,
      constructorName: entry.constructorName as 'Error' | 'RangeError' | 'TypeError',
      expressionAsts,
      identityHash,
      placeholderCount,
      sites,
      staticSegments,
    });
  }));
  if (new Set(entries.map(({ identityHash }) => identityHash)).size !== entries.length) throw new TypeError('catalog identityHash 不得重复。');
  if (new Set(entries.map(({ code }) => code)).size !== entries.length) throw new TypeError('catalog code 碰撞。');
  if (entries.some((entry, index) => index > 0 && stableStringCompare(entries[index - 1]!.code, entry.code) >= 0)) {
    throw new TypeError('catalog entries 必须按 code 稳定排序。');
  }
  const targets = Object.freeze(denseArray(record.targets, 'targets').map((item, index) => {
    const target = ownDataRecord(item, `targets[${index}]`);
    exactKeys(target, ['modulePaths', 'target', 'transformedOccurrences'], `targets[${index}]`);
    if (!TARGETS.includes(target.target as ArenaProductionErrorTargetV1)) throw new TypeError(`targets[${index}].target 无效。`);
    const modulePaths = cloneStringArray(target.modulePaths, `targets[${index}].modulePaths`).map((modulePath) => normalizedModulePath(modulePath));
    if (modulePaths.some((modulePath, moduleIndex) => (
      moduleIndex > 0 && stableStringCompare(modulePaths[moduleIndex - 1]!, modulePath) >= 0
    ))) throw new TypeError(`targets[${index}].modulePaths 必须稳定排序且不重复。`);
    return Object.freeze({
      modulePaths: Object.freeze(modulePaths),
      target: target.target as ArenaProductionErrorTargetV1,
      transformedOccurrences: safeCount(target.transformedOccurrences, `targets[${index}].transformedOccurrences`),
    });
  }));
  if (new Set(targets.map(({ target }) => target)).size !== targets.length) throw new TypeError('catalog target 不得重复。');
  if (targets.some((target, index) => index > 0 && (
    TARGETS.indexOf(targets[index - 1]!.target) >= TARGETS.indexOf(target.target)
  ))) throw new TypeError('catalog targets 必须按正式目标稳定排序。');
  const knownModules = new Set(sourceModules.map(({ modulePath }) => modulePath));
  if (entries.some((entry) => entry.sites.some((site) => !knownModules.has(site.modulePath)))) {
    throw new TypeError('catalog entry site 必须绑定联合 sourceModules。');
  }
  if (targets.some((target) => target.modulePaths.some((modulePath) => !knownModules.has(modulePath)))) {
    throw new TypeError('catalog target modulePaths 必须是联合 sourceModules 子集。');
  }
  for (const target of targets) {
    const included = new Set(target.modulePaths);
    const expectedOccurrences = entries.reduce((total, entry) => (
      total + entry.sites.filter((site) => included.has(site.modulePath)).length
    ), 0);
    if (target.transformedOccurrences !== expectedOccurrences) {
      throw new TypeError(`catalog ${target.target} transformedOccurrences 不闭合。`);
    }
  }
  const body = Object.freeze({
    dispositionCounts: counts,
    entries,
    schemaVersion: ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION,
    sourceInventoryHash: exactSha256(record.sourceInventoryHash, 'sourceInventoryHash'),
    sourceModules,
    targets,
    transformId: ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID,
  });
  const catalogHash = exactSha256(record.catalogHash, 'catalogHash');
  if (sha256(canonicalJson(body)) !== catalogHash) throw new TypeError('生产错误 catalogHash 不匹配。');
  if (counts.transformed !== entries.reduce((total, entry) => total + entry.sites.length, 0)) {
    throw new TypeError('生产错误 transformed disposition 数不闭合。');
  }
  const catalog = deepFreeze({ catalogHash, ...body });
  VALIDATED_CATALOGS.add(catalog);
  return catalog;
}

export function assertArenaProductionErrorCatalogV1(value: unknown): ArenaProductionErrorCatalogV1 {
  if (typeof value === 'object' && value !== null && VALIDATED_CATALOGS.has(value)) {
    return value as ArenaProductionErrorCatalogV1;
  }
  return parseCatalogObject(value);
}

export function serializeArenaProductionErrorCatalogV1(value: unknown): string {
  return `${canonicalJson(assertArenaProductionErrorCatalogV1(value))}\n`;
}

export function parseArenaProductionErrorCatalogV1(
  source: unknown,
): ArenaProductionErrorCatalogV1 {
  if (typeof source !== 'string') throw new TypeError('生产错误 catalog source 必须是字符串。');
  if (Buffer.byteLength(source, 'utf8') > ARENA_PRODUCTION_ERROR_CATALOG_MAX_UNCOMPRESSED_BYTES) {
    throw new RangeError('生产错误 catalog 解压后超过上限。');
  }
  let parsed: unknown;
  try { parsed = JSON.parse(source) as unknown; } catch { throw new SyntaxError('生产错误 catalog 不是有效 JSON。'); }
  const catalog = assertArenaProductionErrorCatalogV1(parsed);
  if (`${canonicalJson(catalog)}\n` !== source) throw new TypeError('生产错误 catalog 必须是 canonical JSON。');
  return catalog;
}

export function createArenaProductionErrorCatalogGzipV1(catalogValue: unknown): Buffer {
  const source = serializeArenaProductionErrorCatalogV1(catalogValue);
  const sourceBytes = Buffer.from(source, 'utf8');
  if (sourceBytes.byteLength > ARENA_PRODUCTION_ERROR_CATALOG_MAX_UNCOMPRESSED_BYTES) {
    throw new RangeError('生产错误 catalog 未压缩字节超过上限。');
  }
  const compressed = gzipSync(sourceBytes, {
    level: 9,
    memLevel: 9,
    strategy: zlibConstants.Z_DEFAULT_STRATEGY,
  });
  if (compressed.byteLength > ARENA_PRODUCTION_ERROR_CATALOG_MAX_COMPRESSED_BYTES) {
    throw new RangeError('生产错误 catalog gzip 超过上限。');
  }
  if (
    compressed[0] !== 0x1f
    || compressed[1] !== 0x8b
    || compressed[2] !== 0x08
    || compressed[3] !== 0
    || compressed.readUInt32LE(4) !== 0
  ) throw new Error('生产错误 catalog gzip header 不确定。');
  return compressed;
}

export function parseArenaProductionErrorCatalogGzipV1(value: unknown): ArenaProductionErrorCatalogV1 {
  if (!Buffer.isBuffer(value)) throw new TypeError('生产错误 catalog gzip 必须是 Buffer。');
  if (value.byteLength === 0 || value.byteLength > ARENA_PRODUCTION_ERROR_CATALOG_MAX_COMPRESSED_BYTES) {
    throw new RangeError('生产错误 catalog gzip 字节越界。');
  }
  if (value[0] !== 0x1f || value[1] !== 0x8b || value[2] !== 0x08) {
    throw new TypeError('生产错误 catalog 不是 gzip。');
  }
  let uncompressed: Buffer;
  try {
    uncompressed = gunzipSync(value, {
      maxOutputLength: ARENA_PRODUCTION_ERROR_CATALOG_MAX_UNCOMPRESSED_BYTES,
    });
  } catch {
    throw new TypeError('生产错误 catalog gzip 损坏或解压越界。');
  }
  const catalog = parseArenaProductionErrorCatalogV1(uncompressed.toString('utf8'));
  const expectedBytes = createArenaProductionErrorCatalogGzipV1(catalog);
  if (!expectedBytes.equals(value)) throw new TypeError('生产错误 catalog gzip 不是确定性规范字节。');
  return catalog;
}

export function createArenaProductionErrorCatalogReferenceV1(
  catalogValue: unknown,
): ArenaProductionErrorCatalogReferenceV1 {
  const catalog = assertArenaProductionErrorCatalogV1(catalogValue);
  return Object.freeze({
    catalogHash: catalog.catalogHash,
    schemaVersion: ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION,
    sourceInventoryHash: catalog.sourceInventoryHash,
    transformId: ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID,
  });
}

function parseReferenceObject(value: unknown): ArenaProductionErrorCatalogReferenceV1 {
  const record = ownDataRecord(value, '生产错误 catalog reference');
  exactKeys(record, ['catalogHash', 'schemaVersion', 'sourceInventoryHash', 'transformId'], '生产错误 catalog reference');
  if (record.schemaVersion !== ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION) throw new TypeError('reference schemaVersion 无效。');
  if (record.transformId !== ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID) throw new TypeError('reference transformId 无效。');
  return Object.freeze({
    catalogHash: exactSha256(record.catalogHash, 'reference.catalogHash'),
    schemaVersion: ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION,
    sourceInventoryHash: exactSha256(record.sourceInventoryHash, 'reference.sourceInventoryHash'),
    transformId: ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID,
  });
}

export function serializeArenaProductionErrorCatalogReferenceV1(value: unknown): string {
  return `${canonicalJson(parseReferenceObject(value))}\n`;
}

export function parseArenaProductionErrorCatalogReferenceV1(source: unknown): ArenaProductionErrorCatalogReferenceV1 {
  if (typeof source !== 'string') throw new TypeError('reference source 必须是字符串。');
  let parsed: unknown;
  try { parsed = JSON.parse(source) as unknown; } catch { throw new SyntaxError('reference 不是有效 JSON。'); }
  const reference = parseReferenceObject(parsed);
  if (serializeArenaProductionErrorCatalogReferenceV1(reference) !== source) throw new TypeError('reference 必须是 canonical JSON。');
  return reference;
}

export async function writeArenaProductionErrorCatalogReferenceFileV1(
  outputDirectoryValue: string,
  catalogValue: unknown,
): Promise<void> {
  const outputDirectory = absoluteDirectory(outputDirectoryValue, 'outputDirectory');
  if (await realpath(outputDirectory) !== outputDirectory) throw new TypeError('outputDirectory 必须是 canonical 路径。');
  const diagnosticsDirectory = path.join(outputDirectory, 'assets', 'diagnostics');
  await mkdir(diagnosticsDirectory, { recursive: true });
  if (await realpath(diagnosticsDirectory) !== diagnosticsDirectory) throw new TypeError('diagnostics 目录不安全。');
  const reference = createArenaProductionErrorCatalogReferenceV1(catalogValue);
  const destination = path.join(outputDirectory, ...ARENA_PRODUCTION_ERROR_REFERENCE_RELATIVE_PATH.split('/'));
  const source = serializeArenaProductionErrorCatalogReferenceV1(reference);
  await writeFile(destination, source, { encoding: 'utf8', flag: 'wx' });
  const reread = await readStableRegularFile(destination);
  const parsed = parseArenaProductionErrorCatalogReferenceV1(reread.bytes.toString('utf8'));
  if (canonicalJson(parsed) !== canonicalJson(reference)) throw new Error('小游戏 catalog reference 落盘重读不一致。');
}

export async function verifyArenaProductionErrorCatalogFileV1(
  filePathValue: string,
  expectedValue: unknown,
): Promise<void> {
  const filePath = absoluteDirectory(filePathValue, 'catalog filePath');
  const expected = assertArenaProductionErrorCatalogV1(expectedValue);
  const reread = await readStableRegularFile(
    filePath,
    ARENA_PRODUCTION_ERROR_CATALOG_MAX_COMPRESSED_BYTES,
  );
  const parsed = parseArenaProductionErrorCatalogGzipV1(reread.bytes);
  if (canonicalJson(parsed) !== canonicalJson(expected)) {
    throw new Error('Web catalog 最终落盘字节不一致。');
  }
}
