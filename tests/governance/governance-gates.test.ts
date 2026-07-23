import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifyJavaScriptMigration } from '../../scripts/governance/check-js-migration.js';
import { verifyDocumentation } from '../../scripts/governance/check-documentation.js';
import { verifyRetiredProductBoundaries } from '../../scripts/governance/check-product-boundaries.js';
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
