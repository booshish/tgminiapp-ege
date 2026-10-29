"""Real current tasks and production-compatible UI. No imported/synthetic tasks."""
import json
import os
import re
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
expect.set_options(timeout=15000)

root=Path(__file__).resolve().parents[1]
base=os.environ.get("TOCHKA_QA_BASE_URL","http://127.0.0.1:3002/tgminiapp-ege").rstrip("/")
fixture=json.loads(subprocess.check_output(["node","--input-type=module","-e",r'''
import {readFileSync} from "node:fs";
import {createContentLoader} from "./scripts/content-source-loader.mjs";
const l=createContentLoader(),b=l("src/lib/tasks.ts"),p=l("src/lib/practice.ts"),t=l("src/lib/task-taxonomy.ts"),place=l("src/lib/task-placement.ts"),scores=l("src/lib/exam-scores.ts");
const index=l("src/lib/task-package-index.ts").taskPackageIndex;
const task=id=>b.getPracticeBankView().find(t=>t.id===id)??place.getTaskView(JSON.parse(readFileSync("public/task-packages/"+index.find(p=>p.tasks.some(t=>t.id===id)).file,"utf8")).find(t=>t.id===id));
const selected=p.normalizeCatalogSelection({exam:"ОГЭ",subjectId:"math",mode:"number",examNumber:9});
const ids=p.practiceTaskIds(selected),original=task(ids[0]);
const self=b.getPracticeBankView().find(t=>t.subjectId==="math"&&t.examType[0]==="ОГЭ"&&t.answerRule.type==="self"&&scores.getTaskXPScoringRule(t));
const taxonomy=t.getNumberTaxonomyOptions({...selected,examType:selected.exam});
const directions=[["ОГЭ","math",9],["ОГЭ","russian",8],["ОГЭ","informatics",10],["ОГЭ","biology",7],["ОГЭ","chemistry",19],["ОГЭ","social-studies",9],["ЕГЭ","math",17,"base"],["ЕГЭ","math",13,"profile"],["ЕГЭ","russian",7],["ЕГЭ","informatics",9]].map(([exam,subjectId,examNumber,level])=>{
 const s=p.normalizeCatalogSelection({exam,subjectId,examNumber,level,mode:"number"});const ids=p.practiceTaskIds(s);return {...s,id:ids[0],prompt:task(ids[0]).prompt};
});
const profile=directions.find(d=>d.level==="profile"),profileIds=p.practiceTaskIds(profile);
const bio=directions.find(d=>d.subjectId==="biology"),bioAnswers=Object.fromEntries(p.practiceTaskIds(bio).map(id=>[id,task(id).answerDisplay]));
const firstPackage=index.find(e=>e.tasks.some(t=>t.examType[0]==="ЕГЭ"&&t.subjectId==="math"&&t.level==="profile"&&place.getMetadataPlacement(t).number===13));
console.log(JSON.stringify({original:{id:original.id,answer:original.answerDisplay},ids,bioAnswers,self:{id:self.id,number:self.examNumber,max:scores.getTaskXPScoringRule(self).maxPrimaryScore},topic:taxonomy.topics[0]?.id,subtopic:taxonomy.subtopics.find(s=>s.parentId===taxonomy.topics[0]?.id)?.id,directions,allowedInitialPackages:[...new Set([firstPackage.file,...index.filter(e=>e.tasks.some(t=>profileIds.slice(0,12).includes(t.id))).map(e=>e.file)])],allProfilePackages:index.filter(e=>e.tasks.some(t=>profileIds.includes(t.id))).length}));
'''],cwd=root,text=True))

class Checks(list):
    def append(self,value):
        super().append(value)
        print("passed: "+value,flush=True)
checks=Checks()
errors=[]
def ledger(page):return page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
def unchanged(before,after):assert before["events"]==after["events"] and before["game"]==after["game"]
def current(page):
    return page.evaluate("(()=>{let s=JSON.parse(localStorage.getItem('tochka-practice-v1'));return s.sessions[s.activeId].lastTaskId})()")
def scroll(page):return page.evaluate("(()=>{let a=[];for(let e=document.getElementById('main-content');e;e=e.parentElement)a.push(e.scrollTop);return [scrollY,...a]})()")
def near(a,b):assert len(a)==len(b) and all(abs(x-y)<8 for x,y in zip(a,b)),(a,b)
def feed(page):
    page.get_by_role("button",name="Лента",exact=True).click()
    expect(page.locator(".practice-feed-card").first).to_be_visible()
def topic_picker(page):
    button=page.get_by_role("button",name=re.compile("^Выбрать тему"))
    if button.get_attribute("aria-expanded")=="false":button.click()

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path="/usr/bin/chromium",args=["--no-sandbox"])
    ctx=browser.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
    page=ctx.new_page()
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.goto(base+"/#catalog?exam=ОГЭ&subject=math&mode=number",wait_until="networkidle")
    page.locator('[data-catalog-number="9"]').click()
    expect(page.locator("#task-answer")).to_be_visible()
    expect(page.get_by_label("Скрыть решённые",exact=True)).to_be_checked()
    original=current(page)
    before=ledger(page)
    page.locator("#task-answer").fill("123")
    page.locator(".task-skip-button").click()
    expect(page.locator("#task-answer")).to_have_value("")
    assert current(page)!=original
    unchanged(before,ledger(page))
    page.locator(".task-sequence-navigation .task-previous-button").click()
    expect(page.locator("#task-answer")).to_have_value("123")
    assert current(page)==original
    unchanged(before,ledger(page))
    checks.append("skip_without_answer_or_XP_back_restores_draft_and_stable_cursor")

    feed(page)
    active_color=page.get_by_role("button",name="Лента",exact=True).evaluate("el=>getComputedStyle(el).backgroundColor")
    inactive_color=page.get_by_role("button",name="По одному",exact=True).evaluate("el=>getComputedStyle(el).backgroundColor")
    assert active_color!=inactive_color
    expect(page.locator(".practice-feed-card")).to_have_count(12)
    expect(page.locator("#task-answer")).to_have_count(0)
    expect(page.locator("#task-solution")).to_have_count(0)
    first_ids=page.locator("[data-feed-task]").evaluate_all("els=>els.map(e=>e.dataset.feedTask)")
    card=page.locator(".practice-feed-card").nth(5)
    card.scroll_into_view_if_needed()
    viewed=card.get_attribute("data-feed-task")
    previous_scroll=scroll(page)
    card.get_by_role("button",name=re.compile("^Решить задание")).click()
    expect(page.locator("#task-answer")).to_be_visible()
    assert current(page)==viewed
    page.locator("#task-answer").fill("66")
    unchanged(before,ledger(page))
    page.get_by_role("button",name="Вернуться в ленту",exact=True).click()
    expect(page.locator(".practice-feed-card")).to_have_count(12)
    page.wait_for_timeout(250)
    near(scroll(page),previous_scroll)
    page.reload(wait_until="networkidle")
    try:expect(page.locator(".practice-feed-card")).to_have_count(12,timeout=15000)
    except AssertionError:
        print(json.dumps({"body":page.locator("body").inner_text()[:3500],"view":page.evaluate("localStorage.getItem('tochka-practice-view-v1')"),"errors":errors,"url":page.url},ensure_ascii=False),flush=True)
        raise
    page.wait_for_timeout(250)
    near(scroll(page),previous_scroll)
    unchanged(before,ledger(page))
    page.get_by_role("button",name="Дальше по ленте",exact=True).click()
    expect(page.locator(".practice-feed-pagination")).to_contain_text("Страница 2")
    expect(page.locator(".practice-feed-card")).to_have_count(12)
    second_ids=page.locator("[data-feed-task]").evaluate_all("els=>els.map(e=>e.dataset.feedTask)")
    assert not set(first_ids)&set(second_ids)
    page.get_by_role("button",name="Назад по ленте",exact=True).click()
    expect(page.locator(".practice-feed-pagination")).to_contain_text("Страница 1")
    checks.append("bounded_full_condition_feed_same_task_solver_mode_and_scroll_reload_pagination")

    topic_picker(page)
    page.get_by_label("Тема заданий",exact=True).select_option(fixture["topic"])
    expect(page).to_have_url(re.compile("taxonomyTopicId="))
    expect(page.locator(".practice-feed-card").first).to_be_visible()
    expect(page.locator(".practice-feed-pagination")).to_contain_text("Страница 1")
    if fixture["subtopic"]:
        page.get_by_label("Подтема заданий",exact=True).select_option(fixture["subtopic"])
        expect(page).to_have_url(re.compile("subtopicId="))
    page.get_by_role("button",name="Все темы",exact=True).click()
    expect(page.locator(".number-topic-current")).to_have_text("Все темы")
    page.get_by_role("button",name="По одному",exact=True).click()
    expect(page.locator("#task-answer")).to_have_value("123")
    checks.append("theme_subtheme_filter_shared_across_modes_resets_only_list_position")

    page.locator("#task-answer").fill("987654321")
    page.get_by_role("button",name="Проверить ответ",exact=True).click()
    expect(page.locator(".task-verdict-incorrect")).to_be_visible()
    feed(page)
    expect(page.locator(f'[data-feed-task="{original}"]')).to_contain_text("Неверный ответ")
    page.locator(f'[data-feed-task="{original}"]').get_by_role("button",name=re.compile("^Решить задание")).click()
    page.locator("#task-answer").fill(fixture["original"]["answer"])
    page.get_by_role("button",name="Проверить ответ",exact=True).click()
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    correct_ledger=ledger(page)
    page.get_by_role("button",name="Посмотреть решение",exact=True).click()
    expect(page.locator("#task-solution")).to_be_visible()
    solved_ledger=ledger(page)
    feed(page)
    expect(page.locator(f'[data-feed-task="{original}"]')).to_have_count(0)
    page.get_by_label("Скрыть решённые",exact=True).uncheck()
    expect(page.locator(f'[data-feed-task="{original}"]')).to_contain_text("Решено")
    page.locator(f'[data-feed-task="{original}"]').get_by_role("button",name=re.compile("^Решить задание")).click()
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    page.reload(wait_until="networkidle")
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    unchanged(solved_ledger,ledger(page))
    assert len(ledger(page)["events"])==len(correct_ledger["events"])+1
    checks.append("wrong_answers_stay_correct_answers_hide_unhide_preserves_checked_result_no_repeat_XP")

    # A real confirmed zero-point self-check is completion of self-check, not expert correctness.
    s=fixture["self"]
    page.goto(base+f'/#tasks?exam=ОГЭ&subject=math&mode=number&number={s["number"]}&task={s["id"]}',wait_until="networkidle")
    expect(page.locator("#self-work")).to_be_visible()
    page.get_by_label("Скрыть решённые",exact=True).check()
    page.locator("#self-work").fill("Авторский черновик решения")
    before_self=ledger(page)
    page.locator(".task-skip-button").click()
    page.locator(".task-sequence-navigation .task-previous-button").click()
    expect(page.locator("#self-work")).to_have_value("Авторский черновик решения")
    unchanged(before_self,ledger(page))
    page.get_by_role("button",name="Проверить самостоятельно",exact=True).click()
    page.get_by_role("button",name="Подтвердить самопроверку",exact=True).click()
    expect(page.locator(".self-assessment-feedback")).to_contain_text("сохранена")
    assert ledger(page)["game"]["checks"]==before_self["game"]["checks"]
    feed(page)
    expect(page.locator(f'[data-feed-task="{s["id"]}"]')).to_have_count(0)
    page.get_by_label("Скрыть решённые",exact=True).uncheck()
    expect(page.locator(f'[data-feed-task="{s["id"]}"]')).to_contain_text("Самопроверка: 0")
    checks.append("self_check_draft_skip_zero_confirmation_is_labelled_self_check_not_expert_or_streak")

    for id,answer in fixture["bioAnswers"].items():
        page.goto(base+f'/#tasks?exam=ОГЭ&subject=biology&mode=number&number=7&task={id}',wait_until="networkidle")
        page.get_by_role("button",name="По одному",exact=True).click()
        page.get_by_label("Скрыть решённые",exact=True).check()
        expect(page.locator("#task-answer")).to_be_visible()
        page.locator("#task-answer").fill(answer)
        page.get_by_role("button",name="Проверить ответ",exact=True).click()
        expect(page.locator(".task-verdict-correct")).to_be_visible()
    page.get_by_role("button",name="Лента",exact=True).click()
    expect(page.get_by_role("heading",name="Нерешённых заданий в этой подборке больше нет",exact=True)).to_be_visible()
    expect(page.locator(".practice-feed-card")).to_have_count(0)
    complete_ledger=ledger(page)
    page.get_by_role("button",name="Показать решённые",exact=True).click()
    expect(page.locator(".practice-feed-card")).to_have_count(len(fixture["bioAnswers"]))
    unchanged(complete_ledger,ledger(page))
    checks.append("all_real_tasks_completed_empty_state_unhide_without_wrapping_or_erasing_history")

    # All ten active directions, current real conditions, resources, mobile + desktop themes.
    for direction in fixture["directions"]:
        url=f'/#tasks?exam={direction["exam"]}&subject={direction["subjectId"]}&mode=number&number={direction["examNumber"]}&task={direction["id"]}'
        if direction.get("level"):url+=f'&level={direction["level"]}'
        page.goto(base+url,wait_until="networkidle")
        feed(page)
        found=page.locator(f'[data-feed-task="{direction["id"]}"]')
        expect(found.locator(".task-prompt")).to_have_text(direction["prompt"])
        expect(found.locator("#task-answer,#task-solution")).to_have_count(0)
        if direction["subjectId"]=="informatics" and direction["exam"]=="ЕГЭ":
            expect(found.locator("a[download]")).to_have_count(1)
    checks.append("all_ten_directions_share_complete_condition_feed_and_real_TSV_download")
    for theme in ["light","dark"]:
        page.goto(base+"/#profile",wait_until="networkidle")
        page.get_by_role("button",name="Тёмная" if theme=="dark" else "Светлая",exact=True).click()
        page.goto(base+"/#tasks?exam=ЕГЭ&subject=informatics&mode=number&number=9",wait_until="networkidle")
        feed(page)
        for width in [320,390,430,768,1024]:
            page.set_viewport_size({"width":width,"height":844})
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),(theme,width)
            for button in page.locator(".practice-view-controls button,.practice-feed-card button").all():
                assert button.bounding_box()["height"]>=44 and button.bounding_box()["width"]>=44
        page.screenshot(path=f'/tmp/practice-feed-{theme}.png',full_page=False)
    checks.append("light_dark_320_390_430_768_1024_no_overflow_large_touch_controls")

    lazy=browser.new_context(viewport={"width":1024,"height":768})
    lp=lazy.new_page();requests=[]
    lp.on("pageerror",lambda e:errors.append(str(e)))
    lp.on("request",lambda r:requests.append(r.url.rsplit("/",1)[-1]) if "/task-packages/" in r.url else None)
    lp.goto(base+"/#tasks?exam=ЕГЭ&subject=math&level=profile&mode=number&number=13",wait_until="networkidle")
    feed(lp)
    expect(lp.locator(".practice-feed-card")).to_have_count(12)
    assert set(requests)<=set(fixture["allowedInitialPackages"]),(requests,fixture["allowedInitialPackages"])
    assert len(set(requests))<fixture["allProfilePackages"]
    checks.append("fresh_feed_fetches_only_page_shards_not_all_number_conditions")
    lazy.close()
    assert not errors,errors
    browser.close()
print(json.dumps({"groups":checks,"pageErrors":errors},ensure_ascii=False))
