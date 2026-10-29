"""Real task filtering on the production export; no generated/public test records."""
import json
import os
import re
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
expect.set_options(timeout=15000)  # Bounded wait for shard-backed reload/bootstrap, not just DOM hydration.

root=Path(__file__).resolve().parents[1]
base=os.environ.get("TOCHKA_QA_BASE_URL","http://127.0.0.1:3002/tgminiapp-ege").rstrip("/")
fixture=json.loads(subprocess.check_output(["node","--input-type=module","-e",r'''
import{createContentLoader}from"./scripts/content-source-loader.mjs";
const l=createContentLoader(),t=l("src/lib/tasks.ts"),tax=l("src/lib/task-taxonomy.ts");
const selection={examType:"ЕГЭ",subjectId:"math",level:"profile",examNumber:9};
// A disjoint bundled family: checking it must not overwrite the original task's
// shared draft by selecting and answering that SAME stable ID in both contexts.
const subtypeId="math-subtype-parallel-tangent";
const filtered=t.getPracticeTasks({...selection,subtypeId}),c=tax.getTaskClassification(filtered[0].id);
console.log(JSON.stringify({subtypeId,topicId:c.topicId,subtopicId:c.subtopicId,expected:filtered.map(t=>t.id),answers:Object.fromEntries(filtered.map(t=>[t.id,t.answerRule.value])),allCount:t.getPracticeTaskCount(selection)}));
'''],cwd=root,text=True))
checks=[]
errors=[]
def open_picker(page):
    button=page.get_by_role("button",name=re.compile("^Выбрать тему"))
    try:
        expect(button).to_be_visible()
    except AssertionError:
        print(json.dumps({"url":page.url,"body":page.locator("body").inner_text()[:5000],"checks":checks,"errors":errors},ensure_ascii=False),flush=True)
        page.screenshot(path="/tmp/topic-picker-failure.png",full_page=True)
        raise
    if button.get_attribute("aria-expanded")=="false":button.click()
    expect(page.locator(".number-filter-panel")).to_be_visible()

def choose(page,label,value):
    field=page.get_by_label(label,exact=True)
    expect(field).to_be_enabled()
    field.select_option(value)
    expect(field).to_have_value(value)
    expect(page.locator(".number-filter-panel")).to_have_attribute("aria-busy","false")
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
    # This regression suite deliberately revisits checked cards; practice now
    # defaults to hiding them, so explicitly opt into the existing full bank.
    page.get_by_label("Скрыть решённые",exact=True).uncheck()
    original=page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    old_id=original["sessions"][original["activeId"]]["lastTaskId"]
    page.locator("#task-answer").fill("123")
    page.get_by_role("button",name="Сохранить в избранное",exact=True).click()
    toggle=page.get_by_role("button",name=re.compile("^Выбрать тему"))
    expect(toggle).to_have_attribute("aria-expanded","false")
    assert toggle.bounding_box()["y"]<page.locator(".task-prompt").bounding_box()["y"]
    open_picker(page)
    expect(page.get_by_label("Подтип заданий")).to_be_visible()
    assert page.get_by_label("Подтип заданий").locator("option").count()>=5
    expect(page.get_by_label("Источник заданий").locator('option[value="fipi-open-bank"]')).to_have_count(0)
    page.get_by_role("button",name="Закрыть выбор темы",exact=True).click()
    expect(page.locator(".number-filter-panel")).to_be_hidden()
    expect(toggle).to_be_focused()
    expect(page.locator("#task-answer")).to_have_value("123")
    open_picker(page)
    page.keyboard.press("Escape")
    expect(toggle).to_have_attribute("aria-expanded","false")
    open_picker(page)
    checks.append("one_inline_button_open_close_escape_focus_real_categories_no_fake_FIPI")

    choose(page,"Тема заданий",fixture["topicId"])
    expect(page).to_have_url(re.compile("taxonomyTopicId="))
    choose(page,"Подтема заданий",fixture["subtopicId"])
    expect(page).to_have_url(re.compile("subtopicId="))
    choose(page,"Подтип заданий",fixture["subtypeId"])
    choose(page,"Источник заданий","tochka-original")
    expect(page).to_have_url(__import__("re").compile("subtypeId="))
    current=page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    selected=current["sessions"][current["activeId"]]
    assert set(selected["taskIds"])==set(fixture["expected"])
    assert selected["selection"]["subtypeId"]==fixture["subtypeId"]
    assert str(len(fixture["expected"])) in page.locator(".number-filter-count").inner_text()
    expect(page.locator(".number-topic-current")).not_to_have_text("Все темы")
    assert current["taskStates"][old_id]["answer"]=="123"
    selected_id=selected["lastTaskId"]
    page.locator("#task-answer").fill(fixture["answers"][selected_id])
    page.get_by_role("button",name="Проверить ответ",exact=True).click()
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    ledger=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
    page.reload(wait_until="networkidle")
    open_picker(page)
    expect(page.get_by_label("Подтип заданий",exact=True)).to_have_value(fixture["subtypeId"])
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    restored=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
    assert restored["events"]==ledger["events"] and restored["game"]==ledger["game"]
    page.get_by_role("button",name="К выбору заданий",exact=True).click()
    expect(page.locator('[data-catalog-number="9"]')).to_be_visible()
    page.locator('[data-catalog-number="9"]').click()
    open_picker(page)
    expect(page.get_by_label("Подтип заданий",exact=True)).to_have_value(fixture["subtypeId"])
    page.get_by_role("button",name="К выбору заданий",exact=True).click()
    page.go_back(wait_until="networkidle")
    open_picker(page)
    expect(page.get_by_label("Подтип заданий",exact=True)).to_have_value(fixture["subtypeId"])
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    checks.append("composed_filters_exact_task_ids_original_draft_preserved_reload_no_duplicate_XP")

    page.get_by_role("button",name="Все темы",exact=True).click()
    expect(page.locator(".number-topic-current")).to_have_text("Все темы")
    expect(page).to_have_url(re.compile("sourceCategoryId=tochka-original"))
    assert "subtypeId=" not in page.url and "taxonomyTopicId=" not in page.url and "subtopicId=" not in page.url
    # A provenance-only context can have its own last position; restoring all
    # filters resumes the original general-number session, not a copied draft.
    page.get_by_role("button",name="Сбросить все фильтры",exact=True).click()
    expect(page.locator("#task-answer")).to_have_value("123")
    saved=page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    assert saved["sessions"][saved["activeId"]]["lastTaskId"]==old_id
    expect(page.get_by_role("button",name="В избранном — убрать",exact=True)).to_have_attribute("aria-pressed","true")
    checks.append("return_to_all_number_resumes_original_position_draft_and_bookmark")

    for theme in ["light","dark"]:
        page.goto(base+"/#profile",wait_until="networkidle")
        page.get_by_role("button",name="Тёмная" if theme=="dark" else "Светлая",exact=True).click()
        page.goto(base+"/#tasks?exam=ЕГЭ&subject=math&level=profile&mode=number&number=9",wait_until="networkidle")
        expect(page.locator("html")).to_have_attribute("data-theme",theme)
        for width in [320,375,390,430,768,1024]:
            page.set_viewport_size({"width":width,"height":844})
            open_picker(page)
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),(theme,width)
            for el in page.locator(".number-training-filters select,.number-training-filters button").all():
                if el.is_visible():assert el.bounding_box()["height"]>=44 and el.bounding_box()["width"]>=44
            # The panel is in normal document flow, never over the answer area.
            panel=page.locator(".number-filter-panel").bounding_box()
            answer=page.locator("#task-answer").bounding_box()
            assert panel["y"]+panel["height"]<=answer["y"],(theme,width)
            if width==390:
                page.locator(".number-topic-toggle").scroll_into_view_if_needed()
                page.screenshot(path=f"/tmp/topic-picker-{theme}.png",full_page=False)
    checks.append("light_dark_320_375_390_430_768_1024_no_overflow_44px_no_answer_overlay")

    page.goto(base+"/#catalog?exam=ЕГЭ&subject=russian&mode=number",wait_until="networkidle")
    page.locator('[data-catalog-number="4"]').click()
    open_picker(page)
    expect(page.get_by_label("Тема заданий",exact=True)).to_be_disabled()
    expect(page.get_by_label("Подтип заданий",exact=True)).to_be_disabled()
    expect(page.locator(".number-training-filters")).to_contain_text("Тематическая разбивка пока готовится")
    expect(page.get_by_label("Тема заданий",exact=True).locator("option")).to_have_count(1)
    expect(page.locator(".task-prompt")).to_be_visible()
    checks.append("unreviewed_Russian_categories_remain_explicit_not_invented")

    page.goto(base+"/#tasks?exam=ЕГЭ&subject=math&level=profile&mode=number&number=9&subtopicId=unavailable-subtopic",wait_until="networkidle")
    expect(page.get_by_role("heading",name="По выбранным фильтрам заданий нет",exact=True)).to_be_visible()
    expect(page.locator(".task-prompt")).to_have_count(0)
    page.get_by_role("button",name="Все темы",exact=True).click()
    expect(page.locator("#task-heading")).to_have_text("Задание №9")
    expect(page.locator("#task-answer")).to_have_value("123")
    expect(page.get_by_role("button",name="В избранном — убрать",exact=True)).to_have_attribute("aria-pressed","true")
    checks.append("empty_filtered_selection_returns_to_same_number_draft_and_bookmark")

    open_picker(page)
    choose(page,"Подтип заданий",fixture["subtypeId"])
    page.goto(base+"/#catalog?exam=ЕГЭ&subject=math&level=profile&mode=number",wait_until="networkidle")
    page.locator('[data-catalog-number="10"]').click()
    expect(page.locator("#task-heading")).to_have_text("Задание №10")
    expect(page.locator(".number-topic-current")).to_have_text("Все темы")
    assert "subtypeId=" not in page.url
    page.goto(base+"/#catalog?exam=ОГЭ&subject=informatics&mode=number",wait_until="networkidle")
    page.locator('[data-catalog-number="1"]').click()
    expect(page.locator(".number-topic-current")).to_have_text("Все темы")
    assert "subtypeId=" not in page.url and "taxonomyTopicId=" not in page.url
    checks.append("number_and_subject_changes_reset_incompatible_filters")

    touch=browser.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
    phone=touch.new_page()
    phone.on("pageerror",lambda e:errors.append(str(e)))
    phone.goto(base+"/#tasks?exam=ЕГЭ&subject=math&level=profile&mode=number&number=9",wait_until="networkidle")
    tap=phone.get_by_role("button",name=re.compile("^Выбрать тему"))
    for _ in range(3):
        tap.tap()
        expect(tap).to_have_attribute("aria-expanded","true")
        phone.get_by_role("button",name="Закрыть выбор темы",exact=True).tap()
        expect(tap).to_have_attribute("aria-expanded","false")
    checks.append("touch_open_close_repeat_and_direct_number_link_without_task_id")
    touch.close()
    assert not errors,errors
    browser.close()
print(json.dumps({"groups":checks,"pageErrors":errors},ensure_ascii=False))
