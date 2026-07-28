import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('KZ map study page stays research-only and exposes the route canvas contracts', async () => {
    const html = await readFile(path.join(root, 'kz-map-study.html'), 'utf8');
    const entry = await readFile(path.join(root, 'src/entry/kz-map-study.ts'), 'utf8');
    const css = await readFile(path.join(root, 'src/kz-map-study.css'), 'utf8');

    assert.ok(html.includes('RESEARCH ONLY'));
    assert.ok(html.includes('id="kz-map-canvas"'));
    assert.ok(html.includes('data-mode="race"'));
    assert.ok(html.includes('data-mode="survival"'));
    assert.ok(html.includes('data-branch="fast"'));
    assert.ok(html.includes('data-branch="safe"'));
    assert.ok(entry.includes('createArenaV2JumpRoutePrototype'));
    assert.ok(entry.includes('runArenaV2KzBranchWeaponConsequencePrototype'));
    assert.ok(entry.includes('ARENA_V2_KZ_MAP_RESEARCH_CATALOG'));
    assert.ok(entry.includes('canvas.addEventListener'));
    assert.ok(entry.includes('ATTACK_POINT_LABELS'));
    assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
    assert.ok(css.includes('#kz-map-canvas'));
});
