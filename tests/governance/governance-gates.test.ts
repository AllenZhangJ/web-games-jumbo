import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createWorkspaceBuildPlan } from '../../scripts/build-workspace-packages.js';
import { verifyJavaScriptMigration } from '../../scripts/governance/check-js-migration.js';
import { verifyDocumentation } from '../../scripts/governance/check-documentation.js';
import {
  RETIRED_PRODUCT_PATHS,
  verifyRetiredProductBoundaries,
} from '../../scripts/governance/check-product-boundaries.js';
import { verifyPresentationThreeBoundaries } from '../../scripts/governance/check-presentation-three-boundaries.js';
import { verifyRepositorySecurity } from '../../scripts/governance/check-repository-security.js';
import { verifySupplyChain } from '../../scripts/governance/check-supply-chain.js';
import { verifyThirdPartyAssets } from '../../scripts/governance/check-third-party-assets.js';
import { verifyFormalAssets } from '../../scripts/governance/check-formal-assets.js';

describe('enterprise governance gates', () => {
  it('keeps the repository free of JavaScript source files', async () => {
    const report = await verifyJavaScriptMigration();
    expect(report.currentCount).toBe(0);
  });

  it('rejects every new JavaScript source file without an allowlist escape hatch', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-zero-js-gate-'));
    try {
      await writeFile(path.join(directory, 'regression.js'), 'export const regression = true;\n');
      await expect(verifyJavaScriptMigration(directory)).rejects.toThrow(
        /禁止提交 JavaScript 源文件：regression\.js/,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('keeps the retired product outside the active repository', async () => {
    await expect(verifyRetiredProductBoundaries()).resolves.toBeUndefined();
    expect(RETIRED_PRODUCT_PATHS).toEqual(expect.arrayContaining([
      'packages/application',
      'packages/content',
      'packages/difficulty',
      'packages/feedback',
      'packages/game-contracts',
      'packages/gameplay',
      'packages/jump-engine',
      'packages/persistence',
      'packages/platform',
      'packages/renderer-three',
      'scripts/audit-assets.ts',
      'scripts/check-zero-js.ts',
      'src/entry/compose-game.ts',
    ]));
  });

  it('keeps Three presentation dependencies and authority boundaries exact', async () => {
    await expect(verifyPresentationThreeBoundaries()).resolves.toEqual({
      sourceFileCount: 21,
      productSourceFileCount: 2,
    });
  });

  it('rejects unpinned dependency declarations', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-supply-chain-gate-'));
    try {
      await mkdir(path.join(directory, 'packages'));
      await writeFile(path.join(directory, 'package.json'), JSON.stringify({
        name: 'fixture',
        version: '1.0.0',
        dependencies: { three: '^0.185.1' },
      }));
      await expect(verifySupplyChain(directory)).rejects.toThrow(/three 必须固定到精确 semver/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects unpinned transitive dependency overrides', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-override-gate-'));
    try {
      await mkdir(path.join(directory, 'packages'));
      await writeFile(path.join(directory, 'package.json'), JSON.stringify({
        name: 'fixture',
        version: '1.0.0',
        overrides: { sharp: '^0.35.3' },
      }));
      await expect(verifySupplyChain(directory)).rejects.toThrow(
        /overrides\.sharp 必须固定到精确 semver/,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('builds internal workspace packages before clean-install governance checks', async () => {
    const manifest = JSON.parse(
      await readFile(path.resolve('package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
      engines?: Record<string, string>;
    };
    expect(manifest.engines?.node).toBe('>=20.9.0');
    expect(manifest.scripts?.predev).toBe('npm run build:packages');
    expect(manifest.scripts?.['predev:lan']).toBe('npm run build:packages');
    expect(manifest.scripts?.pretest).toBe('npm run build:packages');
    expect(manifest.scripts?.['prepreview:lan']).toBe('npm run build');
    expect(manifest.scripts?.['check:governance']).toMatch(/^npm run build:packages && /);
    expect(manifest.scripts?.typecheck).toBe('npm run build:packages && npm run typecheck:app');
    expect(manifest.scripts?.['audit:dependencies']).toBe(
      'npm audit --omit=dev --audit-level=high',
    );
    expect(manifest.scripts?.check?.match(/npm run audit:dependencies/g)).toHaveLength(1);
  });

  it('derives an acyclic workspace build order from declared internal dependencies', async () => {
    const plan = await createWorkspaceBuildPlan();
    const waveByPackage = new Map(
      plan.waves.flatMap((wave, waveIndex) => (
        wave.map((workspacePackage) => [workspacePackage.name, waveIndex] as const)
      )),
    );
    expect(plan.packageCount).toBe(52);
    expect(waveByPackage.get('@number-strategy-jump/arena-presentation-runtime')).toBeLessThan(
      waveByPackage.get('@number-strategy-jump/arena-product-presentation') ?? -1,
    );
    expect(waveByPackage.get('@number-strategy-jump/arena-release-contracts')).toBeLessThan(
      waveByPackage.get('@number-strategy-jump/arena-release') ?? -1,
    );
  });

  it('keeps root TypeScript project references aligned with every workspace build project', async () => {
    const repositoryRoot = path.resolve('.');
    const plan = await createWorkspaceBuildPlan(repositoryRoot);
    const rootConfig = JSON.parse(
      await readFile(path.join(repositoryRoot, 'tsconfig.json'), 'utf8'),
    ) as { references?: unknown };
    if (!Array.isArray(rootConfig.references)) {
      throw new TypeError('root tsconfig references 必须是数组。');
    }
    const normalizedReferences = rootConfig.references.map((value, index) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new TypeError(`root tsconfig references[${index}] 必须是对象。`);
      }
      expect(Object.keys(value)).toEqual(['path']);
      const referencePath = (value as { path?: unknown }).path;
      if (typeof referencePath !== 'string' || referencePath.length === 0) {
        throw new TypeError(`root tsconfig references[${index}].path 必须是非空字符串。`);
      }
      return path.relative(
        repositoryRoot,
        path.resolve(repositoryRoot, referencePath),
      ).split(path.sep).join('/');
    });
    expect(new Set(normalizedReferences).size).toBe(normalizedReferences.length);

    const plannedProjectPaths = plan.waves.flatMap((wave) => (
      wave.map((workspacePackage) => path.relative(
        repositoryRoot,
        workspacePackage.projectPath,
      ).split(path.sep).join('/'))
    )).sort();
    expect([...normalizedReferences].sort()).toEqual(plannedProjectPaths);
  });

  it('keeps the Formal Web Mode Registry adapter pure and default entry unwired', async () => {
    const source = await readFile(path.resolve(
      'src/entry/arena-v2-formal-web-mode-registry-preflight-adapter-candidate-v1.ts',
    ), 'utf8');
    expect(source).toContain('adapterWired: true as const');
    expect(source).toContain('topLevelConsumerWired: true as const');
    expect(source).toContain('runtimePolicyConsumptionWired: false as const');
    expect(source).toContain('return preflightArenaThreeModeModeRegistryCandidateV1({');
    expect(source).toContain('raceParticipantCount,\n    survivalEnemyCount,');
    expect(source).not.toContain('survivalParticipantCount');
    expect(source).not.toMatch(/survivalEnemyCount\s*[+-]/u);
    expect(source).not.toMatch(/\b(?:document|window|localStorage|Math\.random|Date\.now)\b/u);
    const composition = await readFile(path.resolve(
      'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
    ), 'utf8');
    expect(composition).toContain(
      'explicitModeRegistryPreflightBeforeHostRootDomStorageSeedAndPresentation: true as const',
    );
    expect(composition.indexOf('adaptArenaV2FormalWebModeRegistryPreflightCandidateV1({'))
      .toBeLessThan(composition.indexOf('const mount = hostRoot(source.hostRoot);'));
    const defaultEntry = await readFile(path.resolve(
      'src/entry/web-arena-v2-formal-candidate.ts',
    ), 'utf8');
    expect(defaultEntry).not.toContain('modeRegistryCandidate');
  });

  it('keeps invalid MatchCore factory cleanup bounded and descriptor-only', async () => {
    const sources = await Promise.all([
      'packages/arena-match/src/replay.ts',
      'packages/arena-match/src/match-checkpoint.ts',
    ].map((file) => readFile(path.resolve(file), 'utf8')));
    for (const source of sources) {
      expect(source).toContain('MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH = 32');
      expect(source).toContain('CAPTURED_PROMISE_SPECIES_DESCRIPTOR');
      expect(source).toContain('new Set<object>()');
      expect(source).not.toMatch(/\.then\s*\(/u);
    }
    expect(sources[0]).not.toContain('if (candidate instanceof MatchCore)');
    expect(sources[1]).not.toContain('if (value instanceof MatchCore)');
    expect(sources[0]).toContain("findDataMethod(\n      candidate,\n      'destroy'");
    expect(sources[1]).toContain("Object.getOwnPropertyDescriptor(target, 'destroy')");
  });

  it('rejects secret-bearing environment files', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-security-gate-'));
    try {
      await writeFile(path.join(directory, '.env'), 'EXAMPLE=value\n');
      await expect(verifyRepositorySecurity(directory)).rejects.toThrow(/禁止提交密钥或环境文件/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('requires third-party asset approval from the configured owner', async () => {
    await expect(verifyThirdPartyAssets({ expectedApprover: 'not-the-owner' })).rejects.toThrow(
      /approvedBy 必须是项目负责人/,
    );
  });

  it('binds approved formal assets to the current runtime definitions and bytes', async () => {
    await expect(verifyFormalAssets()).resolves.toEqual({
      bundleId: 'arena.stage7.formal-assets.v1',
      bundleHash: 'e03ff2b4',
      assetCount: 3,
      artifactCount: 10,
    });
  });

  it('rejects broken local documentation links', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-documentation-gate-'));
    try {
      await writeFile(path.join(directory, 'package.json'), JSON.stringify({
        name: 'fixture',
        version: '1.0.0',
        scripts: {},
      }));
      await writeFile(path.join(directory, 'README.md'), '[missing](./missing.md)\n');
      await expect(verifyDocumentation({
        repositoryRoot: directory,
        markdownPaths: ['README.md'],
        enforceCurrentTruth: false,
      })).rejects.toThrow(/README\.md 包含断链：\.\/missing\.md/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects documentation commands that are absent from package scripts', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-documentation-command-gate-'));
    try {
      await writeFile(path.join(directory, 'package.json'), JSON.stringify({
        name: 'fixture',
        version: '1.0.0',
        scripts: {},
      }));
      await writeFile(path.join(directory, 'README.md'), 'Run `npm run removed-command`.\n');
      await expect(verifyDocumentation({
        repositoryRoot: directory,
        markdownPaths: ['README.md'],
        enforceCurrentTruth: false,
      })).rejects.toThrow(/README\.md 引用不存在的 npm 命令：removed-command/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
