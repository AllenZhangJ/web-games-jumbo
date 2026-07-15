import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');

async function collectMarkdown(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdown(absolute));
    else if (entry.name.endsWith('.md')) files.push(absolute);
  }
  return files;
}

function localLinkTargets(markdown) {
  const targets = [];
  const pattern = /!?(?:\[[^\]]*\])\(([^)]+)\)/g;
  for (const match of markdown.matchAll(pattern)) {
    const raw = match[1].trim().replace(/^<|>$/g, '');
    if (!raw || raw.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(raw)) continue;
    const [pathname] = raw.split('#', 1);
    if (pathname) targets.push(decodeURIComponent(pathname));
  }
  return targets;
}

test('all local Markdown links resolve inside the repository', async () => {
  const markdownFiles = await collectMarkdown(projectRoot);
  const missing = [];

  for (const file of markdownFiles) {
    const markdown = await readFile(file, 'utf8');
    for (const target of localLinkTargets(markdown)) {
      const absolute = path.resolve(path.dirname(file), target);
      if (absolute !== projectRoot && !absolute.startsWith(`${projectRoot}${path.sep}`)) {
        missing.push(`${path.relative(projectRoot, file)} -> ${target}（越出仓库）`);
        continue;
      }
      try {
        await stat(absolute);
      } catch {
        missing.push(`${path.relative(projectRoot, file)} -> ${target}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});

test('batch 0 project documentation entry points exist', async () => {
  const required = [
    'docs/README.md',
    'docs/project-overview.md',
    'docs/repository-structure.md',
    'docs/runtime-flow.md',
    'docs/testing-and-release.md',
    'docs/governance/roadmap.md',
    'docs/governance/status.md',
    'docs/governance/batch-checklist.md',
    'docs/decisions/004-modular-governance-roadmap.md',
    'CONTRIBUTING.md',
    'AGENTS.md',
  ];

  await Promise.all(required.map(async (relativePath) => {
    const info = await stat(path.join(projectRoot, relativePath));
    assert.equal(info.isFile(), true, `${relativePath} should be a file`);
  }));
});
