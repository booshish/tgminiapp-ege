"""Actual accepted tasks on the production export; never creates public fixtures."""
import json,os,re,subprocess
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright,expect
expect.set_options(timeout=15000)
root=Path(__file__).resolve().parents[1]
base=os.environ.get('TOCHKA_QA_BASE_URL','http://127.0.0.1:3002/tgminiapp-ege').rstrip('/')
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',r'''
import{readFileSync}from'node:fs';import{publishedCorpus}from'./scripts/import-tasks.mjs';import{createContentLoader}from'./scripts/content-source-loader.mjs';
const ids=JSON.parse(readFileSync('docs/coverage-cycle-release.json','utf8')).approvedIds,tax=createContentLoader()('src/lib/task-taxonomy.ts');
const entries=publishedCorpus().filter(t=>ids.includes(t.id));const first=new Map();for(const t of entries){const key=t.examVersionId+':'+t.examNumber;if(!first.has(key))first.set(key,t);}
const selected=[...first.values(),...entries.filter(t=>t.subjectId==='informatics'&&first.get(t.examVersionId+':'+t.examNumber).id!==t.id)];
console.log(JSON.stringify(selected.map(t=>({id:t.id,exam:t.examType[0],subject:t.subjectId,number:t.examNumber,prompt:t.prompt,answer:t.answerDisplay,resources:t.resources??[],classification:tax.getTaskClassification(t.id)}))));
'''],cwd=root,text=True))

checks=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
 page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
 for item in fixture:
  c=item['classification'];query={'exam':item['exam'],'subject':item['subject'],'mode':'number','number':item['number'],'task':item['id'],'subtypeId':c['subtypeId'],'taxonomyTopicId':c['topicId'],'subtopicId':c['subtopicId'],'sourceCategoryId':'tochka-original'}
  page.goto(base+'/#tasks?'+urlencode(query),wait_until='networkidle')
  page.get_by_role('button',name='По одному',exact=True).click()
  page.get_by_label('Скрыть решённые',exact=True).uncheck()
  expect(page.locator('#task-heading')).to_have_text(f"Задание №{item['number']}")
  expect(page.locator('.task-prompt')).to_have_text(item['prompt'])
  expect(page.locator('#task-solution')).to_have_count(0)
  page.locator('#task-answer').fill(item['answer'])
  page.get_by_role('button',name='Проверить ответ',exact=True).click()
  expect(page.locator('.task-verdict-correct')).to_be_visible()
  page.get_by_role('button',name='Посмотреть решение',exact=True).click()
  expect(page.locator('#task-solution')).to_be_visible()
  for resource in item['resources']:
   with page.expect_download() as d:page.get_by_role('link',name=resource['name']+' · скачать',exact=True).click()
   download=d.value
   assert download.suggested_filename==resource['name']
   assert Path(download.path()).read_text()==resource['content']
  page.get_by_role('button',name='Лента',exact=True).click()
  expect(page.locator(f'[data-feed-task="{item["id"]}"]')).to_contain_text('Решено')
  assert page.locator('.practice-feed-card').count()<=12
  page.get_by_role('button',name=re.compile('^Выбрать тему')).click()
  expect(page.get_by_label('Тема заданий',exact=True)).to_have_value(c['topicId'])
  expect(page.get_by_label('Подтип заданий',exact=True)).to_have_value(c['subtypeId'])
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  checks.append(item['id']);print('passed: '+item['id'],flush=True)
 # Reload one actual new task, retaining its checked answer, draft, bookmark and XP ledger.
 sample=fixture[-1]
 page.get_by_role('button',name=re.compile('^Выбрать тему')).click()
 page.get_by_role('button',name='По одному',exact=True).click()
 page.get_by_role('button',name='Сохранить в избранное',exact=True).click()
 previous=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
 page.reload(wait_until='networkidle')
 expect(page.locator('.task-verdict-correct')).to_be_visible()
 expect(page.locator('#task-answer')).to_have_value(sample['answer'])
 expect(page.get_by_role('button',name='В избранном — убрать',exact=True)).to_have_attribute('aria-pressed','true')
 after=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
 assert previous['game']==after['game'] and previous['events']==after['events']
 for width in [320,430,768,1024]:
  page.set_viewport_size({'width':width,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 assert len(checks)==38 and not errors,(len(checks),errors)
 print(json.dumps({'newNumbers':35,'realTasksChecked':len(checks),'downloadedFiles':sum(len(t['resources'])for t in fixture),'pageErrors':errors,'widths':[320,390,430,768,1024]}),flush=True)
 browser.close()
