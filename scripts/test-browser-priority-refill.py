import json
import os
from urllib.parse import unquote
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
release=json.loads((root/os.environ.get('TOCHKA_RELEASE_REPORT','docs/priority-refill-release.json')).read_text())
ids=set(release['approvedIds'])
tasks=[t for f in (root/'public/task-packages').glob('*.json') for t in json.loads(f.read_text()) if t['id'] in ids]
classes={r['taskId']:r for r in json.loads((root/'docs/task-classification-map.json').read_text())['records']}
samples={(t['examVersionId'],t['examNumber'],classes[t['id']]['subtypeId']):t for t in tasks}
errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page()
 page.on('pageerror',lambda e:errors.append(str(e)))
 for t in samples.values():
  subtype=classes[t['id']]['subtypeId']
  url=f"http://127.0.0.1:3002/tgminiapp-ege/#tasks?exam={t['examType'][0]}&subject={t['subjectId']}&mode=number&number={t['examNumber']}&task={t['id']}&subtypeId={subtype}&sourceCategoryId=tochka-original"+(f"&level={t['level']}" if t['level'] else '')
  page.goto(url,wait_until='networkidle')
  expect(page.locator('.task-prompt')).to_have_text(t['prompt'])
  if t.get('resources'):
   link=page.locator('a[download]').first
   assert link.get_attribute('download')==t['resources'][0]['name']
   assert unquote(link.get_attribute('href').split(',',1)[1])==t['resources'][0]['content']
  page.locator('#task-answer').fill(t['answerDisplay'])
  page.get_by_role('button',name='Проверить ответ',exact=True).click()
  expect(page.locator('.task-verdict-correct')).to_be_visible()
  page.get_by_role('button',name='Посмотреть решение',exact=True).click()
  expect(page.locator('#task-solution')).to_contain_text(t['solution'][-1]['text'])
 ledger=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
 page.reload(wait_until='networkidle')
 expect(page.locator('.task-verdict-correct')).to_be_visible()
 restored=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
 assert ledger['events']==restored['events'] and ledger['game']==restored['game']
 assert not errors,errors
 b.close()
print(json.dumps({'families':len(samples),'releasedTasks':len(tasks),'pageErrors':errors,'filtersSolutionsAndReload':'passed'}))
