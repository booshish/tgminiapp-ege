"""Native listener/heap check over repeated practice mounts; no production telemetry."""
import json,os
from collections import Counter
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
expect.set_options(timeout=15000)
base=os.environ.get('TOCHKA_QA_BASE_URL','http://127.0.0.1:3002/tgminiapp-ege').rstrip('/')
def snapshot(cdp):
 cdp.send('HeapProfiler.collectGarbage')
 metrics={m['name']:m['value']for m in cdp.send('Performance.getMetrics')['metrics']}
 listeners={}
 for target in ['window','document']:
  obj=cdp.send('Runtime.evaluate',{'expression':target,'objectGroup':'retention-check'})['result']['objectId']
  result=cdp.send('DOMDebugger.getEventListeners',{'objectId':obj})['listeners']
  listeners[target]=dict(sorted(Counter(f"{r['type']}:{r['useCapture']}:{r['passive']}"for r in result).items()))
 cdp.send('Runtime.releaseObjectGroup',{'objectGroup':'retention-check'})
 return {'heapBytes':metrics['JSHeapUsedSize'],'listeners':listeners}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page=ctx.new_page();errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:requests.append(r.url)if'/task-packages/'in r.url else None)
 cdp=ctx.new_cdp_session(page);cdp.send('Performance.enable')
 page.goto(base+'/#tasks?exam=ОГЭ&subject=math&mode=number&number=9',wait_until='networkidle')
 expect(page.locator('#task-answer')).to_be_visible()
 for _ in range(2):
  page.get_by_role('button',name='Лента',exact=True).click();expect(page.locator('.practice-feed-card')).to_have_count(12)
  page.get_by_role('button',name='По одному',exact=True).click();expect(page.locator('#task-answer')).to_be_visible()
 page.get_by_role('button',name='Лента',exact=True).click();expect(page.locator('.practice-feed-card')).to_have_count(12)
 before=snapshot(cdp);initial_requests=len(requests)
 for _ in range(20):
  page.get_by_role('button',name='По одному',exact=True).click();expect(page.locator('#task-answer')).to_be_visible()
  page.get_by_role('button',name='Лента',exact=True).click();expect(page.locator('.practice-feed-card')).to_have_count(12)
 page.wait_for_timeout(250)
 after=snapshot(cdp)
 assert before['listeners']==after['listeners'],(before,after)
 assert len(requests)==initial_requests
 assert page.locator('.practice-feed-card').count()==12
 assert not errors,errors
 result={'modeRoundTrips':20,'before':before,'after':after,'heapDeltaBytes':after['heapBytes']-before['heapBytes'],'additionalShardRequests':len(requests)-initial_requests,'feedCards':12,'pageErrors':errors,'scope':'window/document listeners and collected JS heap, not a complete heap-snapshot leak proof'}
 Path('/workspace/scratch/performance-retention.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result))
 browser.close()
