import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map-js';
import {
  ARENA_PRODUCTION_ERROR_CATALOG_MAX_UNCOMPRESSED_BYTES,
  ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION,
  ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID,
  composeArenaProductionErrorSourceMapV1,
  createArenaProductionErrorCatalogFromModulesV1,
  createArenaProductionErrorCatalogForProductEntriesV1,
  createArenaProductionErrorCatalogGzipV1,
  createArenaProductionErrorCatalogReferenceV1,
  parseArenaProductionErrorCatalogV1,
  parseArenaProductionErrorCatalogReferenceV1,
  parseArenaProductionErrorCatalogGzipV1,
  rewriteArenaProductionErrorWebSourceMapsV1,
  serializeArenaProductionErrorCatalogReferenceV1,
  serializeArenaProductionErrorCatalogV1,
  transformArenaProductionErrorModuleV1,
} from '../../../scripts/lib/arena-production-error-catalog-v1.js';

const MODULE_PATH = 'packages/arena-fixture/dist/example.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('production error catalog assigns stable seven-character codes and preserves template evaluation', () => {
  const source = [
    'const observed = [];',
    'const error = new TypeError(`before ${observed.push("left")} middle ${observed.push("right")} after`, { cause: 7 });',
  ].join('\n');
  const catalog = createArenaProductionErrorCatalogFromModulesV1([
    Object.freeze({ modulePath: MODULE_PATH, source }),
  ]);
  assert.equal(catalog.schemaVersion, ARENA_PRODUCTION_ERROR_CATALOG_SCHEMA_VERSION);
  assert.equal(catalog.transformId, ARENA_PRODUCTION_ERROR_CATALOG_TRANSFORM_ID);
  assert.equal(catalog.entries.length, 1);
  assert.match(catalog.entries[0]!.code, /^E[A-Za-z0-9_-]{6}$/);
  const transformed = transformArenaProductionErrorModuleV1({
    catalog,
    modulePath: MODULE_PATH,
    source,
  });
  assert.notEqual(transformed.map, null);
  assert.match(transformed.code, new RegExp(catalog.entries[0]!.code));
  assert.match(transformed.code, /observed\.push\("left"\).*observed\.push\("right"\)/s);
  const execution = Function(`${transformed.code}\nreturn { error, observed };`)() as {
    readonly error: TypeError;
    readonly observed: readonly string[];
  };
  assert.equal(execution.error instanceof TypeError, true);
  assert.equal(execution.error.name, 'TypeError');
  assert.equal(execution.error.cause, 7);
  assert.deepEqual(execution.observed, ['left', 'right']);
  assert.equal(execution.error.message, `${catalog.entries[0]!.code}12`);
  const sourceMap = JSON.parse(transformed.map) as Readonly<Record<string, unknown>>;
  assert.deepEqual(sourceMap.sources, [MODULE_PATH]);
  assert.deepEqual(sourceMap.sourcesContent, [source]);
  assert.equal(typeof sourceMap.mappings, 'string');
  assert.notEqual(sourceMap.mappings, '');
});

test('catalog and mini-game reference use strict canonical identities', () => {
  const catalog = createArenaProductionErrorCatalogFromModulesV1([
    Object.freeze({ modulePath: MODULE_PATH, source: 'throw new Error("diagnostic");' }),
  ]);
  const parsed = parseArenaProductionErrorCatalogV1(serializeArenaProductionErrorCatalogV1(catalog));
  assert.deepEqual(parsed, catalog);
  const reference = createArenaProductionErrorCatalogReferenceV1(catalog);
  assert.deepEqual(
    parseArenaProductionErrorCatalogReferenceV1(
      serializeArenaProductionErrorCatalogReferenceV1(reference),
    ),
    reference,
  );
  assert.deepEqual(Object.keys(reference).sort(), [
    'catalogHash',
    'schemaVersion',
    'sourceInventoryHash',
    'transformId',
  ]);
});

test('complete catalog gzip is deterministic, bounded and rejects tamper or non-canonical payloads', () => {
  const catalog = createArenaProductionErrorCatalogFromModulesV1([Object.freeze({
    modulePath: MODULE_PATH,
    source: 'new Error(`${value}`);',
  })]);
  const first = createArenaProductionErrorCatalogGzipV1(catalog);
  const second = createArenaProductionErrorCatalogGzipV1(catalog);
  assert.deepEqual(first, second);
  assert.equal(first.readUInt32LE(4), 0);
  assert.deepEqual(parseArenaProductionErrorCatalogGzipV1(first), catalog);
  assert.throws(() => parseArenaProductionErrorCatalogGzipV1(Buffer.from('not-gzip')), /gzip/);
  assert.throws(() => parseArenaProductionErrorCatalogGzipV1(first.subarray(0, -8)), /损坏/);
  const tampered = Buffer.from(first);
  tampered[Math.floor(tampered.length / 2)]! ^= 0x01;
  assert.throws(() => parseArenaProductionErrorCatalogGzipV1(tampered), /损坏|catalog|规范/);

  const serialized = serializeArenaProductionErrorCatalogV1(catalog);
  const extra = JSON.parse(serialized) as Record<string, unknown>;
  extra.unexpected = true;
  assert.throws(
    () => parseArenaProductionErrorCatalogGzipV1(gzipSync(`${JSON.stringify(extra)}\n`, { level: 9 })),
    /字段不精确/,
  );
  const missing = JSON.parse(serialized) as Record<string, unknown>;
  delete missing.entries;
  assert.throws(
    () => parseArenaProductionErrorCatalogGzipV1(gzipSync(`${JSON.stringify(missing)}\n`, { level: 9 })),
    /字段不精确/,
  );
  const wrongHash = JSON.parse(serialized) as Record<string, unknown>;
  wrongHash.catalogHash = '0'.repeat(64);
  assert.throws(
    () => parseArenaProductionErrorCatalogGzipV1(gzipSync(`${JSON.stringify(wrongHash)}\n`, { level: 9 })),
    /catalogHash/,
  );
  const bomb = gzipSync(Buffer.alloc(
    ARENA_PRODUCTION_ERROR_CATALOG_MAX_UNCOMPRESSED_BYTES + 1,
    0x61,
  ), { level: 9 });
  assert.throws(() => parseArenaProductionErrorCatalogGzipV1(bomb), /损坏|越界/);
});

test('MagicString hires maps compose deterministically to TypeScript with bounded source identities', async () => {
  const lexicalRoot = await mkdtemp(path.join(os.tmpdir(), 'arena-error-source-map-'));
  const repositoryRoot = await realpath(lexicalRoot);
  const modulePath = 'packages/arena-fixture/dist/example.js';
  const moduleDirectory = path.join(repositoryRoot, 'packages/arena-fixture/dist');
  const sourceDirectory = path.join(repositoryRoot, 'packages/arena-fixture/src');
  const mapPath = path.join(repositoryRoot, `${modulePath}.map`);
  const sourcePath = path.join(sourceDirectory, 'example.ts');
  const source = 'throw new Error(`fixture ${value}`);';
  try {
    await mkdir(moduleDirectory, { recursive: true });
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(sourcePath, source);
    const catalog = createArenaProductionErrorCatalogFromModulesV1([Object.freeze({
      modulePath,
      source,
    })]);
    const transformed = transformArenaProductionErrorModuleV1({ catalog, modulePath, source });

    const upstreamMap = (sourceName: string, includeSourceContent: boolean): string => {
      const generator = new SourceMapGenerator({ file: 'example.js', sourceRoot: '' });
      for (let column = 0; column < source.length; column += 1) {
        generator.addMapping({
          generated: { line: 1, column },
          original: { line: 1, column },
          source: sourceName,
        });
      }
      if (includeSourceContent) generator.setSourceContent(sourceName, source);
      return generator.toString();
    };
    const compose = () => composeArenaProductionErrorSourceMapV1({
      modulePath,
      repositoryRoot,
      transformedMap: transformed.map,
      upstreamMapPath: mapPath,
    });

    await writeFile(mapPath, upstreamMap('../src/example.ts', false));
    const posixFirst = await compose();
    const posixSecond = await compose();
    assert.equal(posixFirst, posixSecond);
    const consumer = new SourceMapConsumer(JSON.parse(posixFirst));
    assert.equal(consumer.sources.length, 1);
    assert.match(consumer.sources[0]!, /packages\/arena-fixture\/src\/example\.ts$/);
    assert.equal(consumer.hasContentsOfAllSources(), true);
    assert.equal(consumer.sourceContentFor(consumer.sources[0]!), source);
    const codeColumn = transformed.code.indexOf(catalog.entries[0]!.code);
    const original = consumer.originalPositionFor({ line: 1, column: codeColumn });
    assert.match(original.source, /packages\/arena-fixture\/src\/example\.ts$/);
    assert.equal(original.line, 1);

    await writeFile(path.join(moduleDirectory, 'example.js'), transformed.code);
    const webDirectory = path.join(repositoryRoot, 'dist/web');
    const assetsDirectory = path.join(webDirectory, 'assets');
    const bundleMapPath = path.join(assetsDirectory, 'game-fixture.js.map');
    await mkdir(assetsDirectory, { recursive: true });
    const bundleSource = '../../../packages/arena-fixture/dist/example.js';
    const bundleGenerator = new SourceMapGenerator({ file: 'game-fixture.js' });
    for (let column = 0; column < transformed.code.length; column += 1) {
      bundleGenerator.addMapping({
        generated: { line: 1, column },
        original: { line: 1, column },
        source: bundleSource,
      });
    }
    bundleGenerator.setSourceContent(bundleSource, transformed.code);
    const bundleMap = bundleGenerator.toString();
    await writeFile(bundleMapPath, bundleMap);
    await rewriteArenaProductionErrorWebSourceMapsV1({ outputDirectory: webDirectory, repositoryRoot });
    const rewrittenFirst = await readFile(bundleMapPath, 'utf8');
    const bundleConsumer = new SourceMapConsumer(JSON.parse(rewrittenFirst));
    const bundleOriginal = bundleConsumer.originalPositionFor({ line: 1, column: codeColumn });
    assert.match(bundleOriginal.source, /packages\/arena-fixture\/src\/example\.ts$/);
    assert.equal(bundleConsumer.sourceContentFor(bundleOriginal.source!), source);
    assert.equal(bundleConsumer.sources.some((item) => item.includes('/dist/')), false);
    await writeFile(bundleMapPath, bundleMap);
    await rewriteArenaProductionErrorWebSourceMapsV1({ outputDirectory: webDirectory, repositoryRoot });
    assert.equal(await readFile(bundleMapPath, 'utf8'), rewrittenFirst);

    await writeFile(mapPath, upstreamMap('..\\src\\example.ts', true));
    const windows = await compose();
    assert.equal(windows, posixFirst);

    await writeFile(mapPath, JSON.stringify({
      version: 3,
      file: 'example.js',
      sourceRoot: '',
      sources: [],
      names: [],
      mappings: 'AAAA',
    }));
    await assert.rejects(compose(), /source map|sources/);
    await writeFile(mapPath, '{');
    await assert.rejects(compose(), /JSON|解析/);
    await writeFile(mapPath, JSON.stringify({
      version: 3,
      file: 'example.js',
      sourceRoot: '',
      sources: ['../src/example.ts'],
      names: [],
      mappings: 'ACAA',
    }));
    await assert.rejects(compose(), /越界|解析|组合/);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
});

test('inventory classifies every supported Error construction without rewriting dynamic, aggregate or custom errors', () => {
  const catalog = createArenaProductionErrorCatalogFromModulesV1([Object.freeze({
    modulePath: MODULE_PATH,
    source: [
      'const value = "dynamic";',
      'new Error("static");',
      'new RangeError(value);',
      'new AggregateError([], "aggregate");',
      'class FixtureError extends Error {}',
      'new FixtureError("custom");',
    ].join('\n'),
  })]);
  assert.deepEqual(catalog.dispositionCounts, {
    aggregateError: 1,
    customError: 1,
    dynamicApproved: 1,
    semanticPreserve: 0,
    transformed: 1,
    unsupported: 0,
  });
  assert.equal(catalog.entries.length, 1);
});

test('inventory fails closed on unsupported global Error references and honors named class-expression shadowing', () => {
  assert.throws(
    () => createArenaProductionErrorCatalogFromModulesV1([Object.freeze({
      modulePath: MODULE_PATH,
      source: 'new globalThis.Error("not proven equivalent");',
    })]),
    /unsupported/,
  );

  const catalog = createArenaProductionErrorCatalogFromModulesV1([Object.freeze({
    modulePath: MODULE_PATH,
    source: [
      'const Fixture = class Error {',
      '  create() { return new Error("custom"); }',
      '};',
      'new (TypeError)("global");',
    ].join('\n'),
  })]);
  assert.deepEqual(catalog.dispositionCounts, {
    aggregateError: 0,
    customError: 1,
    dynamicApproved: 0,
    semanticPreserve: 0,
    transformed: 1,
    unsupported: 0,
  });
});

test('stable identity ignores module, line and target traversal order but binds constructor and expression AST', () => {
  const firstSource = 'new Error(`same ${value}`);';
  const secondSource = '\n\nnew Error(`same ${value}`);';
  const catalog = createArenaProductionErrorCatalogFromModulesV1([
    Object.freeze({ modulePath: 'packages/arena-zeta/dist/z.js', source: secondSource }),
    Object.freeze({ modulePath: 'packages/arena-alpha/dist/a.js', source: firstSource }),
  ], {
    targetModulePaths: Object.freeze({
      web: Object.freeze(['packages/arena-zeta/dist/z.js', 'packages/arena-alpha/dist/a.js']),
      wechat: Object.freeze(['packages/arena-alpha/dist/a.js']),
    }),
  });
  assert.equal(catalog.entries.length, 1);
  assert.equal(catalog.entries[0]!.sites.length, 2);
  assert.equal(catalog.entries[0]!.code.length, 7);
  assert.deepEqual(catalog.targets.map(({ target }) => target), ['web', 'wechat']);

  const differentConstructor = createArenaProductionErrorCatalogFromModulesV1([Object.freeze({
    modulePath: MODULE_PATH,
    source: 'new TypeError(`same ${value}`);',
  })]);
  const differentExpression = createArenaProductionErrorCatalogFromModulesV1([Object.freeze({
    modulePath: MODULE_PATH,
    source: 'new Error(`same ${other}`);',
  })]);
  assert.notEqual(catalog.entries[0]!.code, differentConstructor.entries[0]!.code);
  assert.notEqual(catalog.entries[0]!.code, differentExpression.entries[0]!.code);
});

test('catalog fails closed on stale source, malformed data surfaces and path escape', () => {
  const source = 'new Error("registered");';
  const catalog = createArenaProductionErrorCatalogFromModulesV1([
    Object.freeze({ modulePath: MODULE_PATH, source }),
  ]);
  assert.throws(
    () => transformArenaProductionErrorModuleV1({
      catalog,
      modulePath: MODULE_PATH,
      source: 'new Error("drifted");',
    }),
    /source 漂移/,
  );
  assert.throws(
    () => createArenaProductionErrorCatalogFromModulesV1([
      Object.freeze({ modulePath: '../escape.js', source }),
    ]),
    /packages\/arena/,
  );

  const sparse = new Array(1) as ArenaProductionErrorModuleInput[];
  assert.throws(
    () => createArenaProductionErrorCatalogFromModulesV1(sparse),
    /稠密/,
  );
  let getterCalls = 0;
  const accessor = Object.defineProperty({ modulePath: MODULE_PATH }, 'source', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return source;
    },
  });
  assert.throws(
    () => createArenaProductionErrorCatalogFromModulesV1([accessor as never]),
    /数据字段/,
  );
  assert.equal(getterCalls, 0);

  const serialized = serializeArenaProductionErrorCatalogV1(catalog);
  const extra = JSON.parse(serialized) as Record<string, unknown>;
  extra.unexpected = true;
  assert.throws(
    () => parseArenaProductionErrorCatalogV1(`${JSON.stringify(extra, null, 2)}\n`),
    /字段不精确/,
  );
  const future = JSON.parse(serialized) as Record<string, unknown>;
  future.schemaVersion = 2;
  assert.throws(
    () => parseArenaProductionErrorCatalogV1(`${JSON.stringify(future, null, 2)}\n`),
    /schemaVersion/,
  );
  assert.throws(() => parseArenaProductionErrorCatalogV1(serialized.slice(0, -3)), /JSON/);
});

interface ArenaProductionErrorModuleInput {
  readonly modulePath: string;
  readonly source: string;
}

test('real Product entries produce one closed three-target machine inventory', async () => {
  const catalog = await createArenaProductionErrorCatalogForProductEntriesV1({
    repositoryRoot: ROOT,
    entryPoints: Object.freeze({
      douyin: path.join(ROOT, 'src/entry/douyin.ts'),
      web: path.join(ROOT, 'src/entry/web.ts'),
      wechat: path.join(ROOT, 'src/entry/wechat.ts'),
    }),
  });
  assert.equal(catalog.dispositionCounts.unsupported, 0);
  assert.equal(catalog.dispositionCounts.semanticPreserve, 0);
  assert.ok(catalog.dispositionCounts.transformed > 2_000);
  assert.equal(
    catalog.dispositionCounts.transformed,
    catalog.entries.reduce((total, entry) => total + entry.sites.length, 0),
  );
  assert.deepEqual(catalog.targets.map(({ target }) => target), ['douyin', 'web', 'wechat']);
  const union = new Set(catalog.sourceModules.map(({ modulePath }) => modulePath));
  for (const target of catalog.targets) {
    assert.ok(target.modulePaths.length > 0);
    assert.ok(target.modulePaths.every((modulePath) => union.has(modulePath)));
    assert.ok(target.transformedOccurrences > 0);
  }
  const quickMatchSource = await readFile(
    path.join(ROOT, 'packages/arena-quick-match/src/quick-match-service.ts'),
    'utf8',
  );
  assert.doesNotMatch(quickMatchSource, /error\.message/);
});
