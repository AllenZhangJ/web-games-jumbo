import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

test('weapon feedback study stays research-only and consumes real KZ and Presentation contracts', async () => {
  const html = await readFile(resolve(repositoryRoot, 'feedback.html'), 'utf8');
  const entry = await readFile(resolve(repositoryRoot, 'src/entry/weapon-feedback-study.ts'), 'utf8');
  const css = await readFile(resolve(repositoryRoot, 'src/weapon-feedback-study.css'), 'utf8');
  const build = await readFile(resolve(repositoryRoot, 'scripts/build.ts'), 'utf8');

  assert.match(html, /meta name="robots" content="noindex,nofollow"/);
  assert.match(html, /id="feedback-task-form"/);
  assert.match(html, /id="feedback-study-result"/);
  assert.match(html, /五类表现 Cue/);
  assert.match(html, /src="\/src\/entry\/weapon-feedback-study\.ts"/);
  assert.match(entry, /runArenaV2KzLanguageConsequencePrototype/);
  assert.match(entry, /projectArenaV2WeaponFeedbackPresentationEvent/);
  assert.match(entry, /hit-confirm/);
  assert.match(entry, /hit-surface-transfer/);
  assert.match(entry, /hit-ring-out/);
  assert.match(entry, /attack-evaded/);
  assert.match(entry, /movement-fall/);
  assert.match(entry, /presentation\.title/);
  assert.match(css, /feedback-cue/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(entry, /Math\.random|localStorage|sessionStorage/);
  assert.doesNotMatch(build, /feedback\.html/);
});
