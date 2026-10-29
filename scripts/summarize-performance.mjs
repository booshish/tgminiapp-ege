import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const median=values=>{const v=[...values].sort((a,b)=>a-b);return v.length?(v[Math.floor((v.length-1)/2)]+v[Math.ceil((v.length-1)/2)])/2:null;};
const stats=values=>{const v=values.filter(Number.isFinite).sort((a,b)=>a-b);return {n:v.length,median:median(v),p95:v.length?v[Math.min(v.length-1,Math.floor(v.length*.95))]:null};};
function summarize(data){
 const runs=data.runs,actions=runs.flatMap(r=>r.actions);
 return {method:data.method,coldCatalogMs:stats(runs.map(r=>r.coldCatalogMs)),
  actions:Object.fromEntries([...new Set(actions.map(a=>a.name))].filter(n=>n!=='reload').map(name=>[name,stats(actions.filter(a=>a.name===name).map(a=>a.ms))])),
  inputToTwoFramesMs:stats(runs.flatMap(r=>r.instrumentation.inputs.map(e=>e.ms))),
  longTasksPerRun:stats(runs.map(r=>r.instrumentation.long.length)),longTaskTimePerRunMs:stats(runs.map(r=>r.instrumentation.long.reduce((n,e)=>n+e.ms,0))),
  practiceWritesPerRun:stats(runs.map(r=>r.instrumentation.writes.filter(w=>w.key==='tochka-practice-v1').length)),
  practiceWriteMs:stats(runs.flatMap(r=>r.instrumentation.writes.filter(w=>w.key==='tochka-practice-v1').map(w=>w.ms))),
  practiceSerializationMs:stats(runs.flatMap(r=>r.instrumentation.serializations.map(s=>s.ms))),
  heapInitialBytes:stats(runs.map(r=>r.heapInitialBytes)),heapAfter40Bytes:stats(runs.map(r=>r.heapAfter40Bytes)),heapAfterReloadBytes:stats(runs.map(r=>r.heapAfterReloadBytes)),
  initialAssets:runs[0].initialAssets,bundledTasks:runs[0].bundledTasks,initialDataRequests:runs[0].initialDataRequests,
  workloadDataRequests:runs.map(r=>r.workloadDataRequests),workloadDataBytes:runs.map(r=>r.workloadDataBytes),workloadTaskBodies:runs.map(r=>r.workloadTaskBodies),pageErrors:runs.flatMap(r=>r.pageErrors),
  reload:'State/draft restore asserted; no comparative latency reported because the original before-run timer used different document origins.'};
}
const before=summarize(read(process.argv[2])),after=summarize(read(process.argv[3]));
const output={baselineCommit:'49a1fd7',before,after,modelBefore:read(process.argv[4]),modelAfter:read(process.argv[5])};
if(process.argv[7]){
 const r=read(process.argv[7]),counts=v=>Object.fromEntries(Object.entries(v).map(([target,types])=>[target,Object.values(types).reduce((n,count)=>n+count,0)]));
 output.retentionCheck={modeRoundTrips:r.modeRoundTrips,heapBeforeBytes:r.before.heapBytes,heapAfterBytes:r.after.heapBytes,heapDeltaBytes:r.heapDeltaBytes,listenerCountsBefore:counts(r.before.listeners),listenerCountsAfter:counts(r.after.listeners),listenerTypesEqual:JSON.stringify(r.before.listeners)===JSON.stringify(r.after.listeners),additionalShardRequests:r.additionalShardRequests,feedCards:r.feedCards,pageErrors:r.pageErrors,scope:r.scope};
}
if(process.argv[6])writeFileSync(process.argv[6],JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
