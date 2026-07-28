import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Product weapon quick comparison explains numeric direction before the full matrix', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/product-styles.css', 'utf8');

  assert.match(html, /class="product-weapon-comparison"[\s\S]*aria-describedby="product-weapon-comparison-legend"/);
  assert.match(
    html,
    /id="product-weapon-comparison-legend" class="product-comparison-legend"[\s\S]*↑ 越高越有利　↓ 越低越有利　⚠ 越高风险越大/,
  );
  assert.match(css, /\.product-comparison-legend\s*\{[\s\S]*line-height:\s*1\.4;/);
});
