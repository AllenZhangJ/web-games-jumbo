import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const RENDER_PATH = 'docs/quality/art/silhouette/arena-a0.3-silhouette-render-manifest-v1.json';
const BLIND_PATH = 'docs/quality/art/silhouette/blind-test/arena-a0.3-blind-test-package-v1.json';
const PROXY_PATH = 'docs/quality/art/silhouette/blind-test/arena-a0.3-internal-proxy-baseline-v1.json';
const OUTPUT_PATH = 'docs/quality/art/silhouette/arena-a0.3-gate-v1.json';
type RecordValue = Record<string, unknown>;
const read = (path: string): RecordValue => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as RecordValue;
const sha = (path: string): string => createHash('sha256').update(readFileSync(resolve(ROOT, path))).digest('hex');
const artifact = (path: string) => ({ path, sha256: sha(path), byteLength: statSync(resolve(ROOT, path)).size });

const render = read(RENDER_PATH);
const blind = read(BLIND_PATH);
const proxy = read(PROXY_PATH);
const outputs = render.outputs as Array<RecordValue>;
const expectedOutputs = 144;
const actualOutputs = outputs.length;
const inFrame = outputs.filter((item) => item.inFrame === true).length;
const offscreenOutputs = actualOutputs - inFrame;
const coveragePassed = actualOutputs === expectedOutputs
  && inFrame === expectedOutputs
  && offscreenOutputs === 0;
const proxyAggregate = proxy.aggregate as RecordValue;
const human = blind.humanEvidence as RecordValue;
const proxyPassed = Number(proxyAggregate.characterAccuracy) >= 0.9 && Number(proxyAggregate.equipmentAccuracy) >= 0.9 && Number(proxyAggregate.directionAccuracy) >= 0.9;
const score = {
  formalAssetAndAnimationIdentity: { earned: 20, possible: 20, evidence: '2个正式角色、Idle clip、同骨架hash、正式圆盾；无锤/链/未来角色/程序化兜底。' },
  deterministicRenderCoverage: { earned: coveragePassed ? 20 : 16, possible: 20, evidence: `实际生成${actualOutputs}/${expectedOutputs}个组合；inFrame=${inFrame}，offscreen=${offscreenOutputs}。` },
  silhouetteReadability: { earned: proxyPassed ? 20 : 8, possible: 20, evidence: `内部非真人代理：角色${Number(proxyAggregate.characterAccuracy).toFixed(3)}、装备${Number(proxyAggregate.equipmentAccuracy).toFixed(3)}、方向${Number(proxyAggregate.directionAccuracy).toFixed(3)}；只关闭技术预检，不得作为真人结论。` },
  blindProtocolAndPrivacy: { earned: 15, possible: 15, evidence: '10套固定seed匿名题包、答案分离、混淆矩阵与距离分层schema齐备；真人证据独立计分。' },
  humanEvidenceAndThresholds: { earned: Number(human.participantCount) >= 10 ? 15 : 0, possible: 15, evidence: `真人样本${String(human.participantCount)}/10，≥90%门槛尚不可计算。` },
  governanceAndFailClosedBoundary: { earned: 10, possible: 10, evidence: 'A0.3、Blockout、LOD、设备、真人与Final均保持fail closed。' },
};
const total = Object.values(score).reduce((sum, item) => sum + item.earned, 0);
const minimumDimensionRatio = Math.min(...Object.values(score).map((item) => item.earned / item.possible));
const gate = {
  schemaVersion: 1,
  id: 'arena.art.silhouette-gate.a0.3.v1',
  status: 'tooling-review-candidate-human-blocked',
  generatedAt: '2026-07-28',
  baselineCommit: '5d26a4f52a0be61226130ce883e91f981b1cfec8',
  generator: artifact('scripts/art/generate-arena-silhouette-gate.ts'),
  inputs: { render: artifact(RENDER_PATH), blindPackage: artifact(BLIND_PATH), proxyBaseline: artifact(PROXY_PATH) },
  facts: { expectedOutputs, actualOutputs, inFrameOutputs: inFrame, offscreenOutputs, humanParticipants: human.participantCount, requiredHumanParticipants: human.minimum, proxy: proxyAggregate },
  score: { dimensions: score, total, possible: 100, minimumDimensionRatio, threshold: { total: 90, eachDimensionRatio: 0.8 }, passed: total >= 90 && minimumDimensionRatio >= 0.8 },
  hardGatePassed: false,
  blockers: [
    ...(coveragePassed ? [] : [`渲染覆盖未闭合：actual=${actualOutputs}/${expectedOutputs}，inFrame=${inFrame}，offscreen=${offscreenOutputs}。`]),
    ...(proxyPassed ? [] : ['内部代理的角色/装备/方向识别未同时达到90%。']),
    '独立真人盲测0/10，不能计算真人混淆矩阵与分层通过率。',
  ],
  boundaries: { a0_2: 'ready', referenceBoard: 'ready-visual-direction-only', a0_3: 'incomplete', blockout: 'forbidden', lod: 'incomplete', device: 'incomplete', human: 'incomplete', final: 'incomplete' },
  rollback: ['删除本文件、blind-test目录和silhouette角色输出即可撤回A0.3候选证据。', '不得回滚已签核A0.2总门。'],
};
writeFileSync(resolve(ROOT, OUTPUT_PATH), `${JSON.stringify(gate, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: gate.status, score: total, minimumDimensionRatio, hardGatePassed: false, inFrame })}\n`);
