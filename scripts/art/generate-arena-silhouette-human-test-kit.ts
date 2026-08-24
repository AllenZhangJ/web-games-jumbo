import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateArenaSilhouetteInheritedSourceFreeze } from './arena-silhouette-source-freeze.js';

const ROOT = resolve(import.meta.dirname, '../..');
const QUESTIONS_PATH = 'docs/quality/art/silhouette/blind-test/arena-a0.3-blind-questions-v1.json';
const BLIND_PACKAGE_PATH = 'docs/quality/art/silhouette/blind-test/arena-a0.3-blind-test-package-v1.json';
const ANSWER_KEY_PATH = 'docs/quality/art/silhouette/blind-test/arena-a0.3-blind-answer-key-v1.json';
const OUTPUT_ROOT = 'docs/quality/art/silhouette/human-test-kit';
const MANIFEST_PATH = `${OUTPUT_ROOT}/arena-a0.3-human-test-kit-v1.json`;
const GENERATOR_PATH = 'scripts/art/generate-arena-silhouette-human-test-kit.ts';
const INTAKE_LEDGER_PATH = `${OUTPUT_ROOT}/arena-a0.3-human-response-intake-ledger-v1.json`;
const RESPONSE_POLICY_PATH = `${OUTPUT_ROOT}/responses/.gitignore`;
const CALIBRATION = [
  { character: 'C01', label: '角色A（C01）', source: 'docs/quality/art/reference-sources/project-character-renders/character-b01-rogue-front-side.png', file: 'calibration-c01.png' },
  { character: 'C02', label: '角色B（C02）', source: 'docs/quality/art/reference-sources/project-character-renders/character-b02-skeleton-front-three-quarter.png', file: 'calibration-c02.png' },
] as const;
type Questions = Readonly<{ id: string; forms: readonly Readonly<{ formId: string; questions: readonly Readonly<{ questionId: string; imagePath: string }>[] }>[]; aggregateCoverage: Readonly<{ uniqueQuestions: number; minimumAppearances: number; maximumAppearances: number }> }>;
const sha = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex');
const shaFile = (path: string): string => sha(readFileSync(resolve(ROOT, path)));
const artifact = (path: string) => ({ path, byteLength: statSync(resolve(ROOT, path)).size, sha256: shaFile(path) });
const questions = JSON.parse(readFileSync(resolve(ROOT, QUESTIONS_PATH), 'utf8')) as Questions;
const blindPackage = JSON.parse(readFileSync(resolve(ROOT, BLIND_PACKAGE_PATH), 'utf8')) as Record<string, unknown>;
const sourceFreeze = validateArenaSilhouetteInheritedSourceFreeze(blindPackage.sourceFreeze, GENERATOR_PATH);
if (blindPackage.sourceCommit !== sourceFreeze.sourceCommit) throw new Error('human kit refuses stale blind-package sourceCommit');
if (questions.forms.length !== 10 || questions.aggregateCoverage.uniqueQuestions !== 144 || questions.aggregateCoverage.minimumAppearances !== 1 || questions.aggregateCoverage.maximumAppearances !== 2) throw new Error('human kit requires balanced 10-form, 144-question coverage');
if (existsSync(resolve(ROOT, `${OUTPUT_ROOT}/responses`)) && readdirSync(resolve(ROOT, `${OUTPUT_ROOT}/responses`)).some((name) => name.endsWith('.json'))) throw new Error('human kit regeneration refuses to reuse ignored raw human responses');
if (existsSync(resolve(ROOT, INTAKE_LEDGER_PATH))) {
  const existingIntake = JSON.parse(readFileSync(resolve(ROOT, INTAKE_LEDGER_PATH), 'utf8')) as { participantCount?: unknown; entries?: unknown[] };
  if (existingIntake.participantCount !== 0 || existingIntake.entries?.length !== 0) throw new Error('human kit regeneration refuses to reuse existing human responses');
}

function html(formId: string, assignmentHash: string, assignmentQuestions: string): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arena 剪影盲测 ${formId}</title><style>
body{font:16px/1.5 system-ui,sans-serif;max-width:760px;margin:auto;padding:20px;background:#f4f1eb;color:#20252b}button{font:inherit;padding:10px 16px}.cal{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cal img,.question img{width:100%;background:#808080}.question{margin:28px 0;padding:16px;background:white;border-radius:12px}.group{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.group label{border:1px solid #aaa;padding:7px;border-radius:7px}.hidden{display:none}.error{color:#a21d28}</style></head><body>
<section id="intro"><h1>Arena 黑色剪影独立盲测</h1><p>只根据画面回答角色、装备和朝向。不要查看仓库、答案键、文件属性或向制作人员询问。测试不收集姓名、邮箱、IP等身份信息。</p><div class="cal"><figure><img src="calibration-c01.png" alt="角色A校准图"><figcaption>角色A（C01）</figcaption></figure><figure><img src="calibration-c02.png" alt="角色B校准图"><figcaption>角色B（C02）</figcaption></figure></div>
<p>开始后校准图会隐藏。请独立完成全部24题；不确定时也请选择最接近答案。</p><label>匿名参与者编号（由协调者分配，不使用姓名）：<input id="code" pattern="P-[A-Z0-9]{6,16}" placeholder="P-ABC123" required></label><p><label><input type="checkbox" id="consent"> 我同意提交匿名测试结果。</label><br><label><input type="checkbox" id="independent"> 我未参与Arena角色、美术或本测试包制作。</label><br><label><input type="checkbox" id="blind"> 我未查看答案键、源文件名或其他参与者答案。</label></p><button id="start">开始测试</button><p id="introError" class="error"></p></section>
<main id="test" class="hidden"><h1>Arena剪影盲测</h1><p>角色A/角色B；赤手/圆盾；正面/右前/右后/背面/左后/左前。</p><form id="answers"></form><button id="finish">完成并下载原始答卷</button><p id="testError" class="error"></p></main>
<script>const FORM='${formId}',ASSIGNMENT='${assignmentHash}';let startedAt='',startedMs=0,questions=${assignmentQuestions};const labels={character:[['C01','角色A'],['C02','角色B']],equipment:[['unarmed','赤手'],['shield','圆盾']],direction:[['front','正面'],['front-right','右前'],['back-right','右后'],['back','背面'],['back-left','左后'],['front-left','左前']]};
function group(q,k){return '<div class="group" data-kind="'+k+'">'+labels[k].map(x=>'<label><input required type="radio" name="'+q+'__'+k+'" value="'+x[0]+'"> '+x[1]+'</label>').join('')+'</div>'}document.querySelector('#start').onclick=()=>{const code=document.querySelector('#code').value.trim().toUpperCase();if(!/^P-[A-Z0-9]{6,16}$/.test(code)||!['consent','independent','blind'].every(x=>document.querySelector('#'+x).checked)){document.querySelector('#introError').textContent='请填写合规匿名编号并勾选三项声明。';return}document.querySelector('#answers').innerHTML=questions.map((q,i)=>'<section class="question"><h2>题 '+(i+1)+'/24</h2><img src="'+q.image+'" alt="匿名黑色剪影"><strong>角色</strong>'+group(q.questionId,'character')+'<strong>装备</strong>'+group(q.questionId,'equipment')+'<strong>朝向</strong>'+group(q.questionId,'direction')+'</section>').join('');startedAt=new Date().toISOString();startedMs=Date.now();document.querySelector('#intro').classList.add('hidden');document.querySelector('#test').classList.remove('hidden')};
document.querySelector('#finish').onclick=()=>{const form=document.querySelector('#answers');if(!form.reportValidity())return;const answers=questions.map(q=>({questionId:q.questionId,character:new FormData(form).get(q.questionId+'__character'),equipment:new FormData(form).get(q.questionId+'__equipment'),direction:new FormData(form).get(q.questionId+'__direction')}));const result={schemaVersion:1,kind:'arena-a0.3-independent-human-response',kitId:'arena.art.silhouette-human-test-kit.a0.3.v1',assignmentSha256:ASSIGNMENT,formId:FORM,participantCode:document.querySelector('#code').value.trim().toUpperCase(),startedAt,completedAt:new Date().toISOString(),durationMs:Date.now()-startedMs,attestations:{consent:true,independentFromProduction:true,noAnswerAccess:true,noPersonalDataSubmitted:true},answers};const blob=new Blob([JSON.stringify(result,null,2)+'\\n'],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=result.participantCode+'__'+FORM+'__raw.json';a.click();URL.revokeObjectURL(a.href);document.querySelector('#testError').textContent='答卷已下载。请原样交给协调者，不要编辑。'};</script></body></html>`;
}

mkdirSync(resolve(ROOT, OUTPUT_ROOT, 'participant'), { recursive: true });
mkdirSync(resolve(ROOT, OUTPUT_ROOT, 'responses'), { recursive: true });
writeFileSync(resolve(ROOT, RESPONSE_POLICY_PATH), '*\n!.gitignore\n!.gitkeep\n');
if (!existsSync(resolve(ROOT, INTAKE_LEDGER_PATH))) {
  writeFileSync(resolve(ROOT, INTAKE_LEDGER_PATH), `${JSON.stringify({ schemaVersion: 1, id: 'arena.art.silhouette-human-response-intake.a0.3.v1', status: 'awaiting-external-human-input', kitId: 'arena.art.silhouette-human-test-kit.a0.3.v1', participantCount: 0, minimumParticipants: 10, entries: [], hardGatePassed: false, coordinatorSignOff: null, downstream: { a0_3: 'incomplete', blockout: 'forbidden', final: 'incomplete' } }, null, 2)}\n`);
}
const formArtifacts = [];
for (const form of questions.forms) {
  const formRoot = `${OUTPUT_ROOT}/participant/${form.formId}`; mkdirSync(resolve(ROOT, formRoot, 'images'), { recursive: true });
  for (const calibration of CALIBRATION) copyFileSync(resolve(ROOT, calibration.source), resolve(ROOT, formRoot, calibration.file));
  const assignment = { schemaVersion: 1, kitId: 'arena.art.silhouette-human-test-kit.a0.3.v1', formId: form.formId, questionCount: form.questions.length, questions: form.questions.map((item) => { const file = `${item.questionId}.png`; copyFileSync(resolve(ROOT, item.imagePath), resolve(ROOT, formRoot, 'images', file)); return { questionId: item.questionId, image: `images/${file}`, sha256: shaFile(item.imagePath) }; }) };
  const formPath = `${formRoot}/form.json`; writeFileSync(resolve(ROOT, formPath), `${JSON.stringify(assignment, null, 2)}\n`); const assignmentHash = shaFile(formPath);
  const htmlPath = `${formRoot}/index.html`; writeFileSync(resolve(ROOT, htmlPath), html(form.formId, assignmentHash, JSON.stringify(assignment.questions).replaceAll('<', '\\u003c')));
  formArtifacts.push({ formId: form.formId, assignment: artifact(formPath), runner: artifact(htmlPath), calibration: CALIBRATION.map((item) => ({ character: item.character, ...artifact(`${formRoot}/${item.file}`), sourcePath: item.source, sourceSha256: shaFile(item.source) })), images: assignment.questions.map((item) => ({ questionId: item.questionId, path: `${formRoot}/${item.image}`, sha256: item.sha256, byteLength: statSync(resolve(ROOT, formRoot, item.image)).size })) });
}
const manifest = { schemaVersion: 1, id: 'arena.art.silhouette-human-test-kit.a0.3.v1', status: 'ready-for-external-human-input', generatedAt: blindPackage.generatedAt, sourceCommit: sourceFreeze.sourceCommit, sourceFreeze: blindPackage.sourceFreeze, generator: artifact(GENERATOR_PATH), sourceQuestions: artifact(QUESTIONS_PATH), restrictedEvaluator: { status: 'restricted-evaluator-only', participantAccessible: false, blindPackage: artifact(BLIND_PACKAGE_PATH), questions: artifact(QUESTIONS_PATH), answerKey: artifact(ANSWER_KEY_PATH) }, intakeLedgerPath: INTAKE_LEDGER_PATH, answerKeyIncluded: false, personalDataRequested: false, participantCount: 0, minimumParticipants: 10, formCount: 10, questionsPerForm: 24, aggregateCoverage: questions.aggregateCoverage, requiredAttestations: ['consent', 'independentFromProduction', 'noAnswerAccess', 'noPersonalDataSubmitted'], forms: formArtifacts, responseDropPath: `${OUTPUT_ROOT}/responses`, responseDropPolicy: artifact(RESPONSE_POLICY_PATH), hardGatePassed: false, downstream: { a0_3: 'incomplete', blockout: 'forbidden', final: 'incomplete' } };
writeFileSync(resolve(ROOT, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: manifest.status, forms: 10, questionsPerForm: 24, aggregateCoverage: manifest.aggregateCoverage, humanParticipants: 0 })}\n`);
