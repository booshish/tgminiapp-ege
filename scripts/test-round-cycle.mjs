import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {roundCycleRows} from './round-cycle-originals.mjs';
import {checkRoundRows} from './release-round-cycle.mjs';
import {publishedCorpus} from './import-tasks.mjs';
import {createContentLoader} from './content-source-loader.mjs';
import {contentFingerprint} from './content-review-evidence.mjs';
const json=f=>JSON.parse(readFileSync(f,'utf8'));
test('round cycle independently checks numeric models and narrowly reviewed editorial keys, excludes wrong keys',()=>{
 const rows=roundCycleRows();assert.equal(checkRoundRows(rows).verified,1373);
 for(const family of ['inflection-context-review','spreadsheet-one-pair-sum','posterior-from-two-groups']){
  const changed=structuredClone(rows.find(r=>r.family===family));changed.task.answerDisplay='wrong';assert.throws(()=>checkRoundRows([changed]));
 }
});
test('all ten active directions have actual new public records, verified fingerprints and semantic labels',()=>{
 const r=json('docs/round-cycle-release.json'),before=json('docs/round-cycle-before.json'),rows=roundCycleRows(),byId=new Map(rows.map(r=>[r.task.id,r])),tasks=publishedCorpus(),l=createContentLoader();
 assert.equal(r.approvedIds.length,1036);assert.deepEqual(r.counts,{found:1373,rightsAllowed:1036,staged:1036,duplicates:337,rejected:0,review:0});
 assert.equal(r.after.length,10);assert.ok(r.after.every(d=>d.tasks>before.find(b=>b.id===d.id).tasks));
 for(const id of r.approvedIds){assert.equal(contentFingerprint(tasks.find(t=>t.id===id)),contentFingerprint(byId.get(id).task));const c=l('src/lib/task-taxonomy.ts').getTaskClassification(id);assert.ok(c.subtypeId&&c.topicId&&c.subtopicId);}
 const info=r.after.find(d=>d.id==='ege-informatics');assert.equal(before.find(d=>d.id===info.id).numbers.find(n=>n.number===9).count,0);assert.equal(info.numbers.find(n=>n.number===9).count,20);
});
test('all former 5174 records and 152 immutable shards retain bodies, identities and order',()=>{
 const l=createContentLoader(),old=createContentLoader({revision:'25a391a'}),prior=old('src/lib/task-package-index.ts').taskPackageIndex,index=l('src/lib/task-package-index.ts').taskPackageIndex;
 assert.deepEqual(index.slice(0,prior.length),prior);assert.equal(prior.length,152);
 for(const shard of prior)assert.equal(createHash('sha256').update(readFileSync(`public/task-packages/${shard.file}`)).digest('hex'),shard.sha256);
 assert.deepEqual(l('src/lib/tasks.ts').practiceBank,old('src/lib/tasks.ts').practiceBank);
});
