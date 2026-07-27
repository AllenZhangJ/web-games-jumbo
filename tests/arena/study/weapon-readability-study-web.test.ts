import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

test('weapon readability study page stays separate from the production product entry', async () => {
  const html = await readFile(resolve(repositoryRoot, 'readability.html'), 'utf8');
  const entry = await readFile(
    resolve(repositoryRoot, 'src/entry/weapon-readability-study.ts'),
    'utf8',
  );
  const build = await readFile(resolve(repositoryRoot, 'scripts/build.ts'), 'utf8');

  assert.match(html, /meta name="robots" content="noindex,nofollow"/);
  assert.match(html, /id="readability-task-form"/);
  assert.match(html, /id="readability-overview"/);
  assert.match(html, /六件逐件研究武器概览/);
  assert.match(html, /src="\/src\/entry\/weapon-readability-study\.ts"/);
  assert.doesNotMatch(html, /web-human-match-study\.ts/);
  assert.match(entry, /projectArenaV2WeaponReadabilityParticipantTasks/);
  assert.match(entry, /createArenaV2WeaponCaseStudyReadabilityMatrix/);
  assert.match(entry, /readability-overview-table/);
  assert.match(entry, /evaluateArenaV2WeaponReadabilityAttempt/);
  assert.doesNotMatch(entry, /expectedOptionId/);
  assert.doesNotMatch(entry, /localStorage|sessionStorage|MatchCore/);
  assert.match(build, /input:\s*\{\s*game:\s*path\.join\(root, 'index\.html'\)/s);
  assert.doesNotMatch(build, /readability\.html/);
});
