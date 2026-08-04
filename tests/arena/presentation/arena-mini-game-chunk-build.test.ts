import assert from 'node:assert/strict';
import {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ARENA_MINI_GAME_LAUNCHER_SOURCE,
  buildArenaMiniGameChunkBuild,
  publishArenaMiniGameCandidateDirectory,
  transformArenaMiniGameEsmJavaScript,
  validateArenaMiniGamePublishedJavaScript,
  writeArenaMiniGameJavaScriptBatch,
  type ArenaMiniGamePublishedJavaScript,
} from '../../../scripts/lib/arena-mini-game-chunk-build.js';
import {
  ARENA_PRODUCTION_ERROR_CATALOG_RELATIVE_PATH,
  ARENA_PRODUCTION_ERROR_REFERENCE_RELATIVE_PATH,
  createArenaProductionErrorCatalogFromModulesV1,
  createArenaProductionErrorCatalogForProductEntriesV1,
  parseArenaProductionErrorCatalogReferenceV1,
  writeArenaProductionErrorCatalogReferenceFileV1,
} from '../../../scripts/lib/arena-production-error-catalog-v1.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

let productErrorCatalogPromise: ReturnType<typeof createArenaProductionErrorCatalogForProductEntriesV1> | null = null;

function productErrorCatalog() {
  productErrorCatalogPromise ??= createArenaProductionErrorCatalogForProductEntriesV1({
    repositoryRoot: ROOT,
    entryPoints: Object.freeze({
      douyin: path.join(ROOT, 'src/entry/douyin.ts'),
      web: path.join(ROOT, 'src/entry/web.ts'),
      wechat: path.join(ROOT, 'src/entry/wechat.ts'),
    }),
  });
  return productErrorCatalogPromise;
}

function javascript(relativePath: string, source: string): ArenaMiniGamePublishedJavaScript {
  return Object.freeze({
    relativePath,
    source,
  });
}

function validSyntheticBatch(): readonly ArenaMiniGamePublishedJavaScript[] {
  return Object.freeze([
    javascript('game.js', ARENA_MINI_GAME_LAUNCHER_SOURCE),
    javascript(
      'game-runtime.js',
      '"use strict";var a=require("./chunks/shared.js");var b=require("./chunks/shared.js");globalThis.__arenaMiniResult=[a.next(),b.next(),a===b];',
    ),
    javascript(
      'chunks/shared.js',
      '"use strict";let value=0;module.exports={next(){value+=1;return value}};',
    ),
  ]);
}

function executeCommonJsBatch(files: readonly ArenaMiniGamePublishedJavaScript[]) {
  const sourceByPath = new Map(files.map((file) => [
    file.relativePath,
    file.source,
  ]));
  const moduleByPath = new Map<string, { exports: unknown }>();
  const globals: Record<string, unknown> = {};
  const load = (relativePath: string): unknown => {
    const cached = moduleByPath.get(relativePath);
    if (cached !== undefined) return cached.exports;
    const source = sourceByPath.get(relativePath);
    if (source === undefined) throw new Error(`missing module ${relativePath}`);
    const module = { exports: {} as unknown };
    moduleByPath.set(relativePath, module);
    const localRequire = (specifier: string) => {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), specifier));
      return load(resolved);
    };
    Function('require', 'module', 'exports', 'globalThis', source)(
      localRequire,
      module,
      module.exports,
      globals,
    );
    return module.exports;
  };
  load('game.js');
  return { globals, moduleByPath };
}

test('mini-game CommonJS batch keeps game.js as a thin IIFE and caches shared modules', () => {
  const files = validateArenaMiniGamePublishedJavaScript(validSyntheticBatch());
  const execution = executeCommonJsBatch(files);
  assert.deepEqual(execution.globals.__arenaMiniResult, [1, 2, true]);
  assert.equal(execution.moduleByPath.size, 3);
  assert.equal(Object.isFrozen(files), true);
  assert.ok(files.every((file) => Object.isFrozen(file)));
});

test('mini-game CommonJS batch rejects malformed paths, imports, dynamic or external requires and missing chunks', () => {
  const replace = (
    relativePath: string,
    source: string,
  ): readonly ArenaMiniGamePublishedJavaScript[] => validSyntheticBatch().map((file) => (
    file.relativePath === relativePath ? javascript(relativePath, source) : file
  ));
  assert.throws(
    () => validateArenaMiniGamePublishedJavaScript([
      ...validSyntheticBatch(),
      javascript('../escape.js', 'module.exports=1;'),
    ]),
    /路径/,
  );
  assert.throws(
    () => validateArenaMiniGamePublishedJavaScript(replace(
      'game-runtime.js',
      'import "./chunks/shared.js";',
    )),
    /import|export/,
  );
  assert.throws(
    () => validateArenaMiniGamePublishedJavaScript(replace(
      'game-runtime.js',
      'require("./chunks/"+name);',
    )),
    /静态 require/,
  );
  assert.throws(
    () => validateArenaMiniGamePublishedJavaScript(replace(
      'game-runtime.js',
      'const load=require;load("./chunks/shared.js");',
    )),
    /重绑定 require/,
  );
  assert.throws(
    () => validateArenaMiniGamePublishedJavaScript(replace(
      'game-runtime.js',
      'require("three");',
    )),
    /相对路径/,
  );
  assert.throws(
    () => validateArenaMiniGamePublishedJavaScript(replace(
      'game-runtime.js',
      'require("./chunks/missing.js");',
    )),
    /不存在/,
  );
  assert.throws(
    () => validateArenaMiniGamePublishedJavaScript(replace('chunks/shared.js', '')),
    /空产物/,
  );
});

test('mini-game chunk transform rejects malformed modules and real Product graphs stay in production reachability', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'arena-mini-chunk-test-'));
  try {
    await assert.rejects(
      transformArenaMiniGameEsmJavaScript('malformed.js', 'export {'),
      /Expected|Unexpected|error/i,
    );

    const errorCatalog = await productErrorCatalog();
    for (const entryPoint of ['src/entry/wechat.ts', 'src/entry/douyin.ts'] as const) {
      const target = entryPoint.includes('wechat') ? 'wechat' : 'douyin';
      const built = await buildArenaMiniGameChunkBuild({
        errorCatalog,
        repositoryRoot: ROOT,
        entryPoint: path.join(ROOT, entryPoint),
        target,
      });
      assert.equal(built.files[0]?.relativePath, 'game.js');
      assert.ok(built.files.some(({ relativePath }) => relativePath === 'game-runtime.js'));
      assert.ok(built.sharedChunkPaths.length >= 1);
      assert.ok(built.files.every(({ source }) => Buffer.byteLength(source) <= 1_572_864));
      assert.ok(built.files.reduce((total, { source }) => total + Buffer.byteLength(source), 0) <= 3_670_016);
      assert.ok(built.sourceInputs.some((input) => input.includes('arena-v1-application-launch')));
      for (const forbidden of [
        'arena-p1-supply-acceptance',
        'arena-input-pilot',
        'greybox-session',
        'arena-device-acceptance/src',
        'src/entry/web.ts',
        'web-platform',
      ]) {
        assert.equal(built.sourceInputs.some((input) => input.includes(forbidden)), false);
      }
      validateArenaMiniGamePublishedJavaScript(built.files);
    }

    await mkdir(path.join(temporary, 'deterministic'), { recursive: true });
    const first = await buildArenaMiniGameChunkBuild({
      errorCatalog,
      repositoryRoot: ROOT,
      entryPoint: path.join(ROOT, 'src/entry/wechat.ts'),
      target: 'wechat',
    });
    const second = await buildArenaMiniGameChunkBuild({
      errorCatalog,
      repositoryRoot: ROOT,
      entryPoint: path.join(ROOT, 'src/entry/wechat.ts'),
      target: 'wechat',
    });
    assert.deepEqual(
      first.files.map((file) => [file.relativePath, file.source]),
      second.files.map((file) => [file.relativePath, file.source]),
    );
    await writeFile(
      path.join(temporary, 'deterministic', 'paths.txt'),
      first.files.map(({ relativePath }) => relativePath).join('\n'),
    );
    assert.ok((await readFile(path.join(temporary, 'deterministic', 'paths.txt'), 'utf8')).includes('game.js'));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('mini-game candidates publish atomically per platform and remove failed or unsafe candidates', async () => {
  const lexicalParent = await mkdtemp(path.join(os.tmpdir(), 'arena-mini-publish-'));
  const parent = await realpath(lexicalParent);
  try {
    const candidates = new Set<string>();
    await Promise.all((['wechat', 'douyin'] as const).map((targetName) => (
      publishArenaMiniGameCandidateDirectory({
        parentDirectory: parent,
        targetName,
        async populate(candidateDirectory) {
          assert.equal(candidates.has(candidateDirectory), false);
          candidates.add(candidateDirectory);
          await writeArenaMiniGameJavaScriptBatch(candidateDirectory, validSyntheticBatch());
          await writeFile(path.join(candidateDirectory, 'game.json'), '{}\n');
        },
      })
    )));
    assert.equal(candidates.size, 2);
    for (const targetName of ['wechat', 'douyin']) {
      assert.equal((await lstat(path.join(parent, targetName))).isDirectory(), true);
      assert.equal(await readFile(path.join(parent, targetName, 'game.js'), 'utf8'), ARENA_MINI_GAME_LAUNCHER_SOURCE);
    }
    assert.deepEqual((await readdir(parent)).filter((name) => name.includes('-candidate-')), []);

    const failedParent = await realpath(await mkdtemp(path.join(os.tmpdir(), 'arena-mini-failure-')));
    try {
      await assert.rejects(
        publishArenaMiniGameCandidateDirectory({
          parentDirectory: failedParent,
          targetName: 'wechat',
          async populate(candidateDirectory) {
            await writeFile(path.join(candidateDirectory, 'partial.txt'), 'partial');
            throw new Error('controlled population failure');
          },
        }),
        /controlled population failure/,
      );
      assert.deepEqual(await readdir(failedParent), []);

      const outside = await realpath(await mkdtemp(path.join(os.tmpdir(), 'arena-mini-outside-')));
      try {
        await assert.rejects(
          publishArenaMiniGameCandidateDirectory({
            parentDirectory: failedParent,
            targetName: 'douyin',
            async populate(candidateDirectory) {
              await symlink(outside, path.join(candidateDirectory, 'chunks'));
              await writeArenaMiniGameJavaScriptBatch(candidateDirectory, validSyntheticBatch());
            },
          }),
          /父目录不安全/,
        );
        assert.deepEqual(await readdir(failedParent), []);
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    } finally {
      await rm(failedParent, { recursive: true, force: true });
    }
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('mini-game publishes only the exact catalog reference and refuses overwrite', async () => {
  const lexical = await mkdtemp(path.join(os.tmpdir(), 'arena-mini-error-reference-'));
  const directory = await realpath(lexical);
  try {
    const catalog = createArenaProductionErrorCatalogFromModulesV1([Object.freeze({
      modulePath: 'packages/arena-fixture/dist/example.js',
      source: 'new Error("fixture");',
    })]);
    await writeArenaProductionErrorCatalogReferenceFileV1(directory, catalog);
    const referencePath = path.join(
      directory,
      ...ARENA_PRODUCTION_ERROR_REFERENCE_RELATIVE_PATH.split('/'),
    );
    const reference = parseArenaProductionErrorCatalogReferenceV1(
      await readFile(referencePath, 'utf8'),
    );
    assert.equal(reference.catalogHash, catalog.catalogHash);
    assert.equal(reference.sourceInventoryHash, catalog.sourceInventoryHash);
    await assert.rejects(
      writeArenaProductionErrorCatalogReferenceFileV1(directory, catalog),
      /EEXIST|exist/i,
    );
    await assert.rejects(
      readFile(path.join(directory, ...ARENA_PRODUCTION_ERROR_CATALOG_RELATIVE_PATH.split('/'))),
      /ENOENT/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
