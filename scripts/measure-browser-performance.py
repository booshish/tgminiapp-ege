"""Same real-content workload before/after. Local files, no telemetry or user data."""
import argparse,gzip,json,os,statistics,subprocess,time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
expect.set_options(timeout=60000)
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--runs',type=int,default=3);args=parser.parse_args()
base=os.environ.get('TOCHKA_QA_BASE_URL','http://127.0.0.1:3002/tgminiapp-ege').rstrip('/')
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',r'''
import{createContentLoader}from'./scripts/content-source-loader.mjs';
const l=createContentLoader(),b=l('src/lib/tasks.ts'),p=l('src/lib/practice.ts'),t=l('src/lib/task-taxonomy.ts'),s=l('src/lib/exam-scores.ts');
const first=b.getPracticeTasks({examType:'ОГЭ',subjectId:'math',examNumber:9})[0];
const self=b.getPracticeBankView().find(t=>t.subjectId==='math'&&t.examType[0]==='ОГЭ'&&t.answerRule.type==='self'&&s.getTaskXPScoringRule(t));
console.log(JSON.stringify({bundledTasks:b.practiceBank.length,files:Object.fromEntries(l('src/lib/task-package-index.ts').taskPackageIndex.map(p=>[p.file,p.tasks.length])),first:{id:first.id,answer:first.answerDisplay},self:{id:self.id,number:self.examNumber},ids:p.practiceTaskIds(p.normalizeCatalogSelection({exam:'ОГЭ',subjectId:'math',mode:'number',examNumber:9}))}));
'''],cwd=root,text=True))
instrument=r'''(()=>{
 const p=window.__perf={long:[],writes:[],serializations:[],inputs:[]};
 new PerformanceObserver(list=>{for(const e of list.getEntries())p.long.push({at:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:true});
 const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){const s=performance.now();try{return set.call(this,k,v);}finally{p.writes.push({at:s,ms:performance.now()-s,key:k,bytes:String(v).length});}};
 const stringify=JSON.stringify;JSON.stringify=function(v,...rest){const tracked=v&&v.version===2&&v.taskStates&&v.sessions;const s=tracked?performance.now():0;const result=stringify.call(this,v,...rest);if(tracked)p.serializations.push({at:s,ms:performance.now()-s,bytes:result.length});return result;};
 document.addEventListener('input',event=>{if(!['task-answer','self-work'].includes(event.target.id))return;const at=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>p.inputs.push({at,ms:performance.now()-at})));},true);
})();'''
def frames(page):page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
def task_id(page):return page.evaluate("new URLSearchParams(location.hash.split('?')[1]).get('task')")
def action(page,label,fn):
 start=page.evaluate('performance.timeOrigin+performance.now()');fn();frames(page);end=page.evaluate('performance.timeOrigin+performance.now()')
 return {'name':label,'start':start,'ms':end-start}
def memory(cdp):
 cdp.send('HeapProfiler.collectGarbage');return {r['name']:r['value']for r in cdp.send('Performance.getMetrics')['metrics']}['JSHeapUsedSize']
def theme(page):
 button=page.get_by_role('button',name=__import__('re').compile('^Выбрать тему'))
 if button.get_attribute('aria-expanded')=='false':button.click()
def pick(page,label):
 field=page.get_by_label(label,exact=True);options=field.locator('option').evaluate_all("els=>els.filter(e=>e.value&&!e.disabled).map(e=>e.value)")
 if options:field.select_option(options[0]);expect(field).to_have_value(options[0]);expect(page.locator('.number-filter-panel')).to_have_attribute('aria-busy','false');expect(page.locator('#task-answer')).to_be_visible()
def stats(values):
 if not values:return {'n':0,'medianMs':0,'p95Ms':0,'totalMs':0}
 values=sorted(values);return {'n':len(values),'medianMs':statistics.median(values),'p95Ms':values[min(len(values)-1,int(len(values)*.95))],'totalMs':sum(values)}

results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-precise-memory-info'])
 for run in range(args.runs):
  ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  ctx.add_init_script(instrument);page=ctx.new_page();page.set_default_timeout(120000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  cdp=ctx.new_cdp_session(page);cdp.send('Emulation.setCPUThrottlingRate',{'rate':4});cdp.send('Network.enable');cdp.send('Network.setCacheDisabled',{'cacheDisabled':True});cdp.send('Performance.enable')
  cold=time.perf_counter();page.goto(base+'/#catalog?exam=ОГЭ&subject=math&mode=number',wait_until='networkidle');expect(page.locator('[data-catalog-number="9"]')).to_be_visible();frames(page);cold_ms=(time.perf_counter()-cold)*1000
  initial=page.evaluate("performance.getEntriesByType('resource').map(e=>({name:e.name,bytes:e.decodedBodySize,encoded:e.encodedBodySize,type:e.initiatorType}))")
  actions=[action(page,'first_task',lambda:(page.locator('[data-catalog-number="9"]').click(),expect(page.locator('#task-answer')).to_be_visible()))]
  expect(page.locator('.task-skip-button')).to_be_enabled()
  heap_initial=memory(cdp)
  cdp.send('Profiler.enable');cdp.send('Profiler.setSamplingInterval',{'interval':1000});cdp.send('Profiler.start')
  page.locator('#task-answer').press_sequentially('123456',delay=40);frames(page)
  typing_profile=cdp.send('Profiler.stop')['profile']
  Path(args.output+f'.typing{run}.cpuprofile').write_text(json.dumps(typing_profile))
  Path(args.output+f'.typing{run}.json').write_text(json.dumps(page.evaluate('window.__perf')))
  cdp.send('Profiler.start')
  # Check and solution only once: real canonical records, never synthetic XP.
  page.locator('#task-answer').fill(fixture['first']['answer'])
  actions.append(action(page,'check_answer',lambda:(page.get_by_role('button',name='Проверить ответ',exact=True).click(),expect(page.locator('.task-verdict-correct')).to_be_visible())))
  actions.append(action(page,'show_solution',lambda:(page.get_by_role('button',name='Посмотреть решение',exact=True).click(),expect(page.locator('#task-solution')).to_be_visible())))
  page.get_by_label('Скрыть решённые',exact=True).uncheck()
  for i in range(40):
   old=task_id(page)
   def skip():
    page.locator('.task-skip-button').click()
    page.wait_for_function("old=>new URLSearchParams(location.hash.split('?')[1]).get('task')!==old",arg=old)
    expect(page.locator('#task-answer')).to_be_editable()
   actions.append(action(page,'skip',skip))
   if i%4==0:page.locator('#task-answer').fill('1234567890')
   if i%10==9:print(f'run {run+1}: {i+1} transitions',flush=True)
  page.locator('#task-answer').press_sequentially('112233',delay=40);frames(page)
  page.get_by_role('button',name='Сохранить в избранное',exact=True).click()
  heap_long=memory(cdp)
  theme(page)
  for label in ['Тема заданий','Подтема заданий','Подтип заданий','Источник заданий']:
   actions.append(action(page,'filter:'+label,lambda label=label:pick(page,label)))
  actions.append(action(page,'all_themes',lambda:page.get_by_role('button',name='Все темы',exact=True).click()))
  page.get_by_role('button',name='Сбросить все фильтры',exact=True).click();expect(page.locator('#task-answer')).to_be_visible()
  actions.append(action(page,'feed',lambda:(page.get_by_role('button',name='Лента',exact=True).click(),expect(page.locator('.practice-feed-card')).to_have_count(12))))
  for i in range(3):
   page.locator('.practice-feed-card').last.scroll_into_view_if_needed();frames(page)
   old=page.locator('[data-feed-task]').first.get_attribute('data-feed-task')
   def turn():
    page.get_by_role('button',name='Дальше по ленте',exact=True).click();expect(page.locator('[data-feed-task]').first).not_to_have_attribute('data-feed-task',old)
   actions.append(action(page,'feed_page',turn));assert page.locator('.practice-feed-card').count()<=12
  page.locator('.practice-feed-card').nth(5).get_by_role('button',name=__import__('re').compile('^Решить задание')).click();expect(page.locator('#task-answer')).to_be_visible()
  page.locator('#task-answer').fill('314159');frames(page)
  active=task_id(page)
  workload_log=page.evaluate('window.__perf')
  resources=page.evaluate("performance.getEntriesByType('resource').map(e=>({name:e.name,bytes:e.decodedBodySize,encoded:e.encodedBodySize,type:e.initiatorType}))")
  profile=cdp.send('Profiler.stop')['profile']
  Path(args.output+f'.run{run}.cpuprofile').write_text(json.dumps(profile))
  counts={}
  for node_id in profile.get('samples',[]):counts[node_id]=counts.get(node_id,0)+1
  top=[{'name':n['callFrame']['functionName'],'url':n['callFrame']['url'],'line':n['callFrame']['lineNumber'],'column':n['callFrame']['columnNumber'],'selfSamples':counts.get(n['id'],0)}for n in profile['nodes']]
  top=sorted(top,key=lambda n:n['selfSamples'],reverse=True)[:25]
  # Immediate reload is intentional: optimisations must flush the pending draft.
  actions.append(action(page,'reload',lambda:(page.reload(wait_until='networkidle'),expect(page.locator('#task-answer')).to_have_value('314159'))))
  assert task_id(page)==active
  heap_final=memory(cdp)
  assert not errors,errors
  logs=page.evaluate('window.__perf')
  asset_sizes={}
  for ext in ['js','css']:
   entries=[r for r in initial if urlparse(r['name']).path.endswith('.'+ext)]
   paths=[root/'out'/urlparse(r['name']).path.split('/tgminiapp-ege/',1)[-1]for r in entries]
   asset_sizes[ext]={'requests':len(entries),'rawBytes':sum(r['bytes']for r in entries),'gzipEstimateBytes':sum(len(gzip.compress(f.read_bytes(),mtime=0))for f in paths)}
  packages=[r for r in resources if '/task-packages/' in r['name']]
  record={'run':run,'coldCatalogMs':cold_ms,'actions':actions,'heapInitialBytes':heap_initial,'heapAfter40Bytes':heap_long,'heapAfterReloadBytes':heap_final,'initialAssets':asset_sizes,'bundledTasks':fixture['bundledTasks'],'initialDataRequests':len([r for r in initial if '/task-packages/'in r['name']]),'workloadDataRequests':len(packages),'workloadDataBytes':sum(r['bytes']for r in packages),'workloadTaskBodies':sum(fixture['files'].get(urlparse(r['name']).path.split('/')[-1],0)for r in packages),'instrumentation':workload_log,'postReloadInstrumentation':logs,'cpuTop':top,'pageErrors':errors}
  results.append(record);print('completed run '+str(run+1),flush=True);ctx.close()
 browser.close()
output={'method':{'cpuThrottle':4,'viewport':[390,844],'chromium':'/usr/bin/chromium','runs':args.runs,'network':'local HTTP, browser cache disabled; no network throttling','latency':'Playwright action through two animation frames; not Web Vitals INP','reactProfiler':'not enabled in production build'},'runs':results}
Path(args.output).write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'output':args.output,'coldCatalog':stats([r['coldCatalogMs']for r in results]),'skips':stats([a['ms']for r in results for a in r['actions']if a['name']=='skip'])}),flush=True)
