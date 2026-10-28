import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createContentLoader} from './content-source-loader.mjs';
import {publishedCorpus} from './import-tasks.mjs';
import {contentFingerprint} from './content-review-evidence.mjs';
import {refillRows} from './refill-priority-generators.mjs';
test('priority refill uses independently computed keys, exact classified fingerprints and original immutable IDs',()=>{
 const rows=refillRows(),r=JSON.parse(readFileSync('docs/priority-refill-release.json')),l=createContentLoader(),prior=createContentLoader({revision:'05695c2'});
 const v=spawnSync('python',['scripts/verify-priority-refill.py'],{input:rows.map(JSON.stringify).join('\n')+'\n',encoding:'utf8'});assert.equal(v.status,0,v.stderr);assert.equal(JSON.parse(v.stdout).verified,rows.length);
 const tasks=publishedCorpus(),map=new Map(rows.map(r=>[r.task.id,r.task]));
 assert.equal(r.approvedIds.length,1171);
 for(const id of r.approvedIds){assert.equal(contentFingerprint(tasks.find(t=>t.id===id)),contentFingerprint(map.get(id)));const c=l('src/lib/task-taxonomy.ts').getTaskClassification(id);assert.ok(c.subtypeId&&c.topicId&&c.subtopicId);}
 for(const n of [4,5,11,13])assert.ok(r.stats.find(s=>s.exam==='ЕГЭ'&&s.number===n).added>=100);
 const old=prior('src/lib/task-package-index.ts').taskPackageIndex;assert.deepEqual(l('src/lib/task-package-index.ts').taskPackageIndex.slice(0,old.length),old);
 assert.deepEqual(l('src/lib/tasks.ts').practiceBank,prior('src/lib/tasks.ts').practiceBank);
 const broken=structuredClone(rows[0]);broken.task.answerDisplay='-999';assert.notEqual(spawnSync('python',['scripts/verify-priority-refill.py'],{input:JSON.stringify(broken)+'\n',encoding:'utf8'}).status,0);
});
