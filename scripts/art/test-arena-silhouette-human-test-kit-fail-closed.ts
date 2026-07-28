import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '../..');
const SOURCE = 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-test-kit-v1.json';
type Json = ReturnType<typeof JSON.parse>;
const base = JSON.parse(readFileSync(resolve(ROOT, SOURCE), 'utf8')) as Json;
const temp = mkdtempSync(resolve(ROOT, 'docs/quality/art/silhouette/human-test-kit/.fail-closed-'));
function probe(name: string, mutate: (value: Json) => void): void {
  const value = structuredClone(base); mutate(value); const path = resolve(temp, `${name}.json`); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  const relativePath = path.slice(ROOT.length + 1); const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/art/check-arena-silhouette-human-test-kit.ts'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ARENA_SILHOUETTE_HUMAN_KIT: relativePath } });
  if (result.status === 0) throw new Error(`probe unexpectedly passed: ${name}`); process.stdout.write(`PASS ${name}\n`);
}
try {
  probe('status', (x) => { x.status = 'human-verified'; });
  probe('answer-key', (x) => { x.answerKeyIncluded = true; });
  probe('personal-data', (x) => { x.personalDataRequested = true; });
  probe('forged-human-count', (x) => { x.participantCount = 10; });
  probe('form-count', (x) => { x.forms.pop(); });
  probe('coverage', (x) => { x.aggregateCoverage.uniqueQuestions = 143; });
  probe('blind-package-drift', (x) => { x.restrictedEvaluator.blindPackage.sha256 = '0'.repeat(64); });
  probe('answer-key-drift', (x) => { x.restrictedEvaluator.answerKey.sha256 = '0'.repeat(64); });
  probe('assignment-drift', (x) => { x.forms[0].assignment.sha256 = '0'.repeat(64); });
  probe('artifact-hash', (x) => { x.forms[0].runner.sha256 = '0'.repeat(64); });
  probe('image-hash', (x) => { x.forms[0].images[0].sha256 = '0'.repeat(64); });
  const leakedRunner = resolve(temp, 'leaked-runner.html'); writeFileSync(leakedRunner, '<script>const correctAnswer="front"</script>');
  probe('answer-leak', (x) => { x.forms[0].runner = { path: leakedRunner.slice(ROOT.length + 1), sha256: createHash('sha256').update(readFileSync(leakedRunner)).digest('hex'), byteLength: statSync(leakedRunner).size }; });
  probe('blockout-leak', (x) => { x.downstream.blockout = 'ready'; });
  const evaluation = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/art/evaluate-arena-silhouette-human-responses.ts'], { cwd: ROOT, encoding: 'utf8' });
  if (evaluation.status === 0 || !`${evaluation.stderr}${evaluation.stdout}`.includes('0')) throw new Error('0/10 evaluator must reject');
  process.stdout.write('PASS evaluator-0-of-10\n14/14 fail-closed probes passed\n');
} finally { rmSync(temp, { recursive: true, force: true }); }
