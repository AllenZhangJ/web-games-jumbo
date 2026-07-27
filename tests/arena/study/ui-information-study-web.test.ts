import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

test('11-page UI information study stays separate from the production entry', async () => {
  const html = await readFile(resolve(repositoryRoot, 'ui-information.html'), 'utf8');
  const entry = await readFile(resolve(repositoryRoot, 'src/entry/ui-information-study.ts'), 'utf8');
  const css = await readFile(resolve(repositoryRoot, 'src/ui-information-study.css'), 'utf8');
  const build = await readFile(resolve(repositoryRoot, 'scripts/build.ts'), 'utf8');

  assert.match(html, /meta name="robots" content="noindex,nofollow"/);
  assert.match(html, /id="ui-page-nav"/);
  assert.match(html, /id="ui-flow-preview"/);
  assert.match(html, /id="ui-touch-target"/);
  assert.match(html, /src="\/src\/entry\/ui-information-study\.ts"/);
  assert.match(entry, /runArenaV2UiInformationPrototype/);
  assert.match(entry, /maximumActionsBeforeNextStep/);
  assert.match(entry, /firstViewInformation/);
  assert.match(entry, /interactionAudit/);
  assert.doesNotMatch(entry, /MatchCore|localStorage|sessionStorage/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /min-height: 48px/);
  assert.doesNotMatch(build, /ui-information\.html/);
});
