import test from 'node:test';
import assert from 'node:assert/strict';
import {createContentLoader} from './content-source-loader.mjs';
const l=createContentLoader(),s=l('src/lib/subjects.ts');
test('first release has six OGE and four EGE directions including independent math levels',()=>{
 assert.equal(s.getSubjects('ОГЭ').length,14);assert.equal(s.getSubjects('ЕГЭ').length,15);
 assert.deepEqual(s.getActiveSubjects('ОГЭ').map(([id])=>id).sort(),['math','russian','informatics','biology','chemistry','social-studies'].sort());
 assert.equal(s.getActiveSubjects('ЕГЭ').length+1,4);
 for(const id of ['chemistry','biology','history'])assert.equal(s.directionStatus('ЕГЭ',id),'planned');
 assert.equal(s.directionStatus('ОГЭ','physics'),'hidden');
});
test('internal models and immutable metadata remain available independent of product visibility',()=>{
 const models=l('src/lib/exams.ts');
 assert.ok(models.getExamDefinition({examType:'ЕГЭ',subjectId:'history'}));
 assert.equal(l('src/lib/task-package-index.ts').taskPackageIndex.length,144);
 const c=l('src/lib/subscription-config.ts');assert.ok(c.selectableSubscriptionSubjects.every(s=>c.supportedSubscriptionSubjects.some(p=>p.id===s.id)));
 assert.deepEqual(c.supportedSubscriptionSubjects,createContentLoader({revision:'25555d5'})('src/lib/subscription-config.ts').supportedSubscriptionSubjects);
});
