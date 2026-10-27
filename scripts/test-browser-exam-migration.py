"""Local production-export migration QA; real task IDs, browser-only test attempts."""
import json
import os
import subprocess
from urllib.parse import urlsplit
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).resolve().parents[1]
base=os.environ.get("TOCHKA_QA_BASE_URL","http://127.0.0.1:3002/tgminiapp-ege").rstrip("/")
fixture=json.loads(subprocess.check_output(["node","--input-type=module","-e",r'''
import {createContentLoader} from "./scripts/content-source-loader.mjs";
const l=createContentLoader(),{tasks}=l("src/lib/tasks.ts"),exams=l("src/lib/exams.ts"),mock=l("src/lib/mock-exam.ts");
const task=tasks.find(t=>t.level==="profile"&&t.examNumber===6&&t.answerRule.type==="number");
const archived=tasks.find(t=>t.level==="profile"&&t.examNumber===16);
const selection={exam:"ЕГЭ",subjectId:"math",level:"profile",mode:"number",examNumber:6,part:1};
const practice={version:2,catalog:selection,sessions:{"legacy-practice":{id:"legacy-practice",selection,taskIds:[task.id],lastTaskId:task.id,lastPosition:0,states:{}}},activeId:"legacy-practice",taskStates:{[task.id]:{...l("src/lib/practice.ts").emptyTaskState(),answer:"-"}}};
let session=mock.createMockSession("legacy-mock",exams.getLegacyExamDefinition({examType:"ЕГЭ",subjectId:"math",level:"profile"}),tasks,[],Date.now(),1);
session=mock.updateMockAnswer(session,session.taskIds[0],"3",session.startedAt+1);
console.log(JSON.stringify({task,archived,practice,mock:{version:1,activeId:session.id,sessions:[session]},mockKey:mock.mockExamStorageKey}));
'''],cwd=root,text=True))
checks=[]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path="/usr/bin/chromium",headless=True,args=["--no-sandbox"])
    ctx=browser.new_context(viewport={"width":1024,"height":768})
    page=ctx.new_page()
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.goto(base+"/",wait_until="networkidle")
    page.goto(base+"/#catalog?exam=ЕГЭ&subject=math&level=profile&mode=number",wait_until="networkidle")
    expect(page.locator('[data-catalog-number]')).to_have_count(20)
    for n in [6,13,17]:expect(page.locator(f'[data-catalog-number="{n}"]')).to_be_disabled()
    expect(page.get_by_role("button",name="Начать вариант →",exact=False)).to_have_count(0)
    checks.append("profile_20_slots_and_no_false_full_variant")

    # Seed before mounting: changing storage under a mounted app would race its
    # legitimate pagehide persistence and would not test real startup migration.
    origin=urlsplit(base)
    ctx=browser.new_context(viewport={"width":1024,"height":768},storage_state={"cookies":[],"origins":[{"origin":f"{origin.scheme}://{origin.netloc}","localStorage":[{"name":"tochka-practice-v1","value":json.dumps(fixture["practice"])},{"name":fixture["mockKey"],"value":json.dumps(fixture["mock"])}]}]})
    page=ctx.new_page()
    page.on("pageerror",lambda e:errors.append(str(e)))
    tid=fixture["task"]["id"]
    page.goto(f"{base}/#tasks?exam=ЕГЭ&subject=math&level=profile&mode=number&number=6&task={tid}&session=legacy-practice",wait_until="networkidle")
    expect(page.locator("#task-heading")).to_have_text("Задание №7")
    expect(page.locator("#task-answer")).to_have_value("-")
    page.locator("#task-answer").fill(fixture["task"]["answerRule"]["value"])
    page.get_by_role("button",name="Проверить ответ",exact=True).click()
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    state=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
    event=next(e for e in state["events"] if e["taskId"]==tid and e["kind"]=="answer_checked")
    assert event["examNumber"]==6 and event["examVersionId"]=="ege-math-profile-2026"
    xp=state["game"]["xpEvents"]
    page.reload(wait_until="networkidle")
    expect(page.locator("#task-heading")).to_have_text("Задание №7")
    assert page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2')).game.xpEvents")==xp
    stored=page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    assert stored["sessions"]["legacy-practice"]["selection"]["examNumber"]==7
    checks.append("legacy_url_stable_id_draft_journal_identity_XP_and_idempotent_reload")

    archived=fixture["archived"]
    page.goto(f'{base}/#tasks?exam=ЕГЭ&subject=math&level=profile&mode=topic&topic={archived["topicId"]}&task={archived["id"]}',wait_until="networkidle")
    expect(page.locator("#task-heading")).to_have_text("Сохранённое задание")
    expect(page.get_by_role("note")).to_contain_text("вне актуальной номерной практики")
    checks.append("held_extended_finance_accessible_with_explicit_legacy_label")

    page.goto(base+"/#mock?exam=ЕГЭ&subject=math&level=profile&session=legacy-mock",wait_until="networkidle")
    page.reload(wait_until="networkidle")
    expect(page.locator(".mock-number-list button")).to_have_count(19)
    expect(page.locator(".mock-page")).to_contain_text("исходном составе")
    assert page.evaluate("key=>JSON.parse(localStorage.getItem(key)).sessions.find(s=>s.id==='legacy-mock').deadline",fixture["mockKey"])==fixture["mock"]["sessions"][0]["deadline"]
    checks.append("legacy_19_task_mock_restores_original_deadline_and_answers")

    page.goto(base+"/#catalog?exam=ЕГЭ&subject=math&level=base&mode=number",wait_until="networkidle")
    expect(page.locator('[data-catalog-number]')).to_have_count(21)
    page.locator(".variant-launch-new button").click()
    expect(page.locator(".mock-number-list button")).to_have_count(21)
    current=page.evaluate("key=>{const s=JSON.parse(localStorage.getItem(key));return s.sessions.find(a=>a.id===s.activeId)}",fixture["mockKey"])
    assert current["examVersionId"]=="ege-math-base-2027-draft" and current["durationMinutes"]==180
    page.reload(wait_until="networkidle")
    assert page.evaluate("key=>JSON.parse(localStorage.getItem(key)).activeId",fixture["mockKey"])==current["id"]
    checks.append("current_21_task_base_variant_180_minutes_reload_without_duplicate_attempt")

    page.goto(base+"/#tasks?exam=ЕГЭ&subject=informatics&mode=number&number=23&task=multi-subject-20261026-25",wait_until="networkidle")
    expect(page.locator("#task-heading")).to_have_text("Задание №13")
    expect(page.locator(".task-topic")).to_contain_text("Количество программ")
    page.locator("#task-answer").fill("6")
    page.get_by_role("button",name="Проверить ответ",exact=True).click()
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    checks.append("legacy_lazy_algorithm_link_opens_13_not_graph_23_with_correct_theory_and_answer")

    for width in [320,390,768,1024]:
        page.set_viewport_size({"width":width,"height":844})
        page.goto(base+"/#catalog?exam=ЕГЭ&subject=math&level=profile&mode=number",wait_until="networkidle")
        expect(page.locator('[data-catalog-number]')).to_have_count(20)
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),width
    checks.append("current_profile_catalogue_320_390_768_1024_no_page_overflow")
    assert not errors,errors
    browser.close()
print(json.dumps({"checks":checks,"pageErrors":errors},ensure_ascii=False))
