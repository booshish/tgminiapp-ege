"""Real task filtering on the production export; no generated/public test records."""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

root=Path(__file__).resolve().parents[1]
base=os.environ.get("TOCHKA_QA_BASE_URL","http://127.0.0.1:3002/tgminiapp-ege").rstrip("/")
fixture=json.loads(subprocess.check_output(["node","--input-type=module","-e",r'''
import{createContentLoader}from"./scripts/content-source-loader.mjs";
const l=createContentLoader(),t=l("src/lib/tasks.ts"),tax=l("src/lib/task-taxonomy.ts");
const selection={examType:"ЕГЭ",subjectId:"math",level:"profile",examNumber:9};
const subtypeId=tax.getNumberTaxonomyOptions(selection).subtypes[0].id;
const filtered=t.getPracticeTasks({...selection,subtypeId}),c=tax.getTaskClassification(filtered[0].id);
console.log(JSON.stringify({subtypeId,topicId:c.topicId,subtopicId:c.subtopicId,expected:filtered.map(t=>t.id),answers:Object.fromEntries(filtered.map(t=>[t.id,t.answerRule.value])),allCount:t.getPracticeTaskCount(selection)}));
'''],cwd=root,text=True))
checks=[]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path="/usr/bin/chromium",headless=True,args=["--no-sandbox"])
    ctx=browser.new_context(viewport={"width":1024,"height":768})
    page=ctx.new_page()
    page.on("pageerror",lambda e:errors.append(str(e)))
    requests=[]
    page.on("request",lambda r:requests.append(r.url) if "/task-packages/" in r.url else None)
    page.goto(base+"/#catalog?exam=ЕГЭ&subject=math&level=profile&mode=number",wait_until="networkidle")
    expect(page.locator('[data-catalog-number]')).to_have_count(20)
    assert not requests
    page.locator('[data-catalog-number="9"]').click()
    expect(page.locator("#task-heading")).to_have_text("Задание №9")
    original=page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    old_id=original["sessions"][original["activeId"]]["lastTaskId"]
    page.locator("#task-answer").fill("123")
    page.get_by_role("button",name="Сохранить в избранное",exact=True).click()
    page.locator(".number-training-filters summary").click()
    expect(page.get_by_label("Подтип заданий")).to_be_visible()
    assert page.get_by_label("Подтип заданий").locator("option").count()>=5
    expect(page.get_by_label("Источник заданий").locator('option[value="fipi-open-bank"]')).to_have_attribute("disabled","")
    checks.append("one_compact_shared_disclosure_real_subtypes_no_fake_FIPI_source")

    page.get_by_label("Тема заданий",exact=True).select_option(fixture["topicId"])
    page.get_by_label("Подтема заданий",exact=True).select_option(fixture["subtopicId"])
    page.get_by_label("Подтип заданий",exact=True).select_option(fixture["subtypeId"])
    page.get_by_label("Источник заданий",exact=True).select_option("tochka-original")
    page.get_by_role("button",name="Применить фильтры",exact=True).click()
    expect(page).to_have_url(__import__("re").compile("subtypeId="))
    current=page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    selected=current["sessions"][current["activeId"]]
    assert set(selected["taskIds"])==set(fixture["expected"])
    assert selected["selection"]["subtypeId"]==fixture["subtypeId"]
    assert current["taskStates"][old_id]["answer"]=="123"
    selected_id=selected["lastTaskId"]
    page.locator("#task-answer").fill(fixture["answers"][selected_id])
    page.get_by_role("button",name="Проверить ответ",exact=True).click()
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    ledger=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
    page.reload(wait_until="networkidle")
    expect(page.get_by_label("Подтип заданий",exact=True)).to_have_value(fixture["subtypeId"])
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    restored=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
    assert restored["events"]==ledger["events"] and restored["game"]==ledger["game"]
    checks.append("composed_filters_exact_task_ids_original_draft_preserved_reload_no_duplicate_XP")

    page.get_by_role("button",name="Все задания номера",exact=True).click()
    expect(page.locator("#task-answer")).to_have_value("123")
    saved=page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    assert saved["sessions"][saved["activeId"]]["lastTaskId"]==old_id
    expect(page.get_by_role("button",name="В избранном — убрать",exact=True)).to_have_attribute("aria-pressed","true")
    checks.append("return_to_all_number_resumes_original_position_draft_and_bookmark")

    for width in [320,390,430,768,1024]:
        page.set_viewport_size({"width":width,"height":844})
        page.locator(".number-training-filters").evaluate("e=>e.open=true")
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),width
        for el in page.locator(".number-training-filters select").all():assert el.bounding_box()["height"]>=44
    checks.append("filters_320_390_430_768_1024_no_page_overflow_44px_controls")

    page.goto(base+"/#catalog?exam=ЕГЭ&subject=russian&mode=number",wait_until="networkidle")
    page.locator('[data-catalog-number="4"]').click()
    page.locator(".number-training-filters summary").click()
    expect(page.get_by_label("Подтип заданий",exact=True)).to_be_disabled()
    expect(page.locator(".number-training-filters")).to_contain_text("ещё уточняется")
    checks.append("unreviewed_Russian_categories_remain_explicit_not_invented")
    assert not errors,errors
    browser.close()
print(json.dumps({"groups":checks,"pageErrors":errors},ensure_ascii=False))
