"""Browser QA against an already-running app; uses the installed Chromium only.

Run: python scripts/test-browser-variants.py [http://127.0.0.1:3000]
Artifacts are written outside the checkout to /workspace/scratch/qa-variants.
"""

import json
import re
import subprocess
import sys
import traceback
import atexit
from decimal import Decimal
from fractions import Fraction
from pathlib import Path
from time import time, sleep
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path("/workspace/scratch/qa-variants")
ARTIFACTS.mkdir(parents=True, exist_ok=True)
BASE = (next((value for value in sys.argv[1:] if value.startswith("http")), "http://127.0.0.1:3000")).rstrip("/")
if "--serve" in sys.argv:
    server = subprocess.Popen(["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3000"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    atexit.register(server.terminate)
    deadline = time() + 30
    while True:
        try:
            with urlopen(BASE, timeout=2) as response:
                if response.status == 200:
                    break
        except Exception:
            if server.poll() is not None or time() > deadline:
                raise RuntimeError("Production preview failed to start")
            sleep(0.2)
STARTED = time()
RESULTS = {"base_url": BASE, "browser": "/usr/bin/chromium", "checks": [], "page_errors": [], "limitations": ["Chromium only; physical iPad Safari and Telegram WebView were not available."]}
DATA = json.loads(subprocess.check_output([
    "node", "--input-type=module", "-e",
    "import {loadContent} from './scripts/content-source-loader.mjs'; const c=loadContent(); console.log(JSON.stringify({tasks:Object.fromEntries(c.tasks.map(t=>[t.id,{id:t.id,number:t.examNumber,part:t.part,rule:t.answerRule,max:t.scoring.maxPrimaryScore}])),theory:c.theoryTopics.filter(t=>t.level==='base').map(t=>({id:t.id,material:t.materialId,title:t.title}))}));",
], cwd=ROOT, text=True))


def check(name, action):
    began = time()
    try:
        details = action() or {}
        RESULTS["checks"].append({"name": name, "status": "passed", "seconds": round(time() - began, 2), **details})
        print(f"PASS {name}", flush=True)
        return True
    except Exception as error:
        RESULTS["checks"].append({"name": name, "status": "failed", "seconds": round(time() - began, 2), "error": str(error), "traceback": traceback.format_exc()})
        print(f"FAIL {name}: {error}", flush=True)
        return False


def expect(condition, message):
    if not condition:
        raise AssertionError(message)


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('tochka-mock-exams-v1'))")


def active(page):
    state = saved(page)
    return next(entry for entry in state["sessions"] if entry["id"] == state["activeId"])


def game(page):
    return page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2')).game")


def answer_text(task_id):
    value = DATA["tasks"][task_id]["rule"]["value"].replace(",", ".")
    if "/" in value:
        fraction = Fraction(value)
        decimal = str(Decimal(fraction.numerator) / Decimal(fraction.denominator))
        return decimal.rstrip("0").rstrip(".") if "." in decimal else decimal
    return value


def visit(page, fragment):
    page.goto(f"{BASE}/#{fragment}", wait_until="networkidle")
    page.locator(".app-shell").wait_for()


def catalogue(page):
    page.locator(".mobile-nav").get_by_role("button", name="Задания", exact=True).click()
    page.locator(".exam-catalog:visible").wait_for()
    return page.locator(".exam-catalog .variant-launch-card")


def scope(page, exam, level=None):
    page.locator(".exam-catalog .course-picker").get_by_role("button", name=exam, exact=True).click()
    if exam == "ЕГЭ":
        page.locator(".catalog-level-switch").get_by_role("button", name="База" if level == "base" else "Профиль", exact=True).click()
    return page.locator(".exam-catalog .variant-launch-card")


def start_card(page, card, number):
    card.locator("select").select_option(str(number))
    card.get_by_role("button", name="Начать вариант", exact=True).click()
    page.locator(".mock-task").wait_for()


def jump(page, index):
    disclosure = page.locator(".mock-number-disclosure")
    if disclosure.count() and not disclosure.evaluate("element => element.open"):
        disclosure.locator("summary").click()
    page.locator(".mock-number-list button").nth(index).click()


def finish(page):
    page.get_by_role("button", name="Завершить вариант", exact=True).click()
    expect(active(page)["finishedAt"] is None, "First finish click must ask for confirmation")
    page.get_by_role("button", name="Завершить и проверить", exact=True).click()
    page.wait_for_function("() => { const s=JSON.parse(localStorage.getItem('tochka-mock-exams-v1')); return s.sessions.find(x=>x.id===s.activeId).finishedAt!==null; }")


def no_overflow(page, label):
    measure = page.evaluate("""() => ({width:innerWidth, documentWidth:document.documentElement.scrollWidth, bodyWidth:document.body.scrollWidth,
        overflowing:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0 && (r.right>innerWidth+1 || r.left < -1);}).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width}))})""")
    expect(measure["documentWidth"] <= measure["width"] + 1, f"Page overflow in {label}: {measure}")
    return measure


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])

    def layout_matrix():
        measures = []
        for width in [320, 375, 430, 768, 1024]:
            context = browser.new_context(viewport={"width": width, "height": 900})
            page = context.new_page()
            page.on("pageerror", lambda error: RESULTS["page_errors"].append(str(error)))
            visit(page, "/catalog?exam=ОГЭ&subject=math&mode=number")
            page.locator(".exam-catalog:visible").wait_for()
            for exam, level in [("ОГЭ", None), ("ЕГЭ", "base"), ("ЕГЭ", "profile")]:
                card = scope(page, exam, level)
                card.get_by_role("button", name="Начать вариант", exact=True).wait_for()
                expect(card.locator("option").count() == 5, f"Expected five real variants for {exam}/{level}")
                measure = no_overflow(page, f"catalog {width}/{exam}/{level}")
                box = card.get_by_role("button", name="Начать вариант", exact=True).bounding_box()
                expect(box["height"] >= 44, f"Small button tap target: {box}")
                ordering = page.evaluate("""() => {const c=document.querySelector('.exam-catalog .variant-launch-card'); const n=document.querySelector('[data-catalog-number]'); return c.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING;}""")
                expect(ordering, "Variant card must be above individual task numbers")
                measures.append({"width": width, "exam": exam, "level": level, "measure": measure, "button": box})
            page.screenshot(path=str(ARTIFACTS / f"catalog-{width}.png"), full_page=False)
            start_card(page, card, 1)
            measures.append({"width": width, "screen": "running-profile", "measure": no_overflow(page, f"running {width}")})
            expect(len(active(page)["taskIds"]) == 19, "Profile variant must contain all 19 current baseline tasks")
            page.screenshot(path=str(ARTIFACTS / f"running-{width}.png"), full_page=False)
            context.close()
        return {"measurements": measures}

    check("responsive_layout_320_375_430_768_1024_three_exams", layout_matrix)

    context = browser.new_context(viewport={"width": 375, "height": 900})
    page = context.new_page()
    page.on("pageerror", lambda error: RESULTS["page_errors"].append(str(error)))
    scenario = {}

    def start_and_reload():
        visit(page, "/catalog?exam=ОГЭ&subject=math&mode=number")
        page.locator(".exam-catalog:visible").wait_for()
        card = scope(page, "ОГЭ")
        start_card(page, card, 5)
        first = active(page)
        expect(first["variantNumber"] == 5 and len(first["taskIds"]) == 25, "OGE #5 must be full")
        expect(first.get("answerFormatVersion") == 1, "New named variants must use decimal exam input")
        expect("Обыкновенная" not in page.locator("#mock-answer-format").inner_text(), "New short answers must not advertise ordinary fractions")
        task_id = first["taskIds"][0]
        page.locator("#mock-answer").fill(answer_text(task_id))
        page.locator(".mock-task-navigation").get_by_role("button", name="Следующее", exact=True).click()
        page.get_by_role("button", name="Пропустить", exact=True).click()
        before = active(page)
        expect(before["position"] == 2 and before["skippedTaskIds"] == [first["taskIds"][1]], "Skip must advance and persist status")
        page.reload(wait_until="networkidle")
        page.locator(".mock-task").wait_for()
        after = active(page)
        expect(after["id"] == before["id"] and len(saved(page)["sessions"]) == 1, "Reload created a duplicate attempt")
        expect(after["answers"] == before["answers"] and after["skippedTaskIds"] == before["skippedTaskIds"] and after["position"] == 2, "Reload lost progress")
        card = catalogue(page)
        expect("Вариант №5" in card.inner_text() and "ответов 1 из 25" in card.inner_text(), "Resume card must name correct attempt and progress")
        card.get_by_role("button", name="Продолжить вариант", exact=True).click()
        page.locator(".mock-task").wait_for()
        expect(active(page)["id"] == first["id"], "Resume created another attempt")
        scenario["oge_id"] = first["id"]
        return {"attempt_id": first["id"], "task_count": 25, "position": after["position"], "session_count_after_reload": len(saved(page)["sessions"])}

    if check("start_variant5_draft_skip_reload_and_catalogue_resume", start_and_reload):
        def isolated_scopes():
            card = catalogue(page)
            card = scope(page, "ЕГЭ", "profile")
            expect(card.get_by_role("button", name="Продолжить вариант", exact=True).count() == 0, "Profile must not resume OGE")
            start_card(page, card, 1)
            scenario["profile_old_id"] = active(page)["id"]
            card = catalogue(page)
            card = scope(page, "ЕГЭ", "base")
            expect(card.get_by_role("button", name="Продолжить вариант", exact=True).count() == 0, "Base must not resume profile")
            expect("180 минут" in card.inner_text(), "Base timer should use base-specific baseline")
            start_card(page, card, 2)
            base = active(page)
            expect(len(base["taskIds"]) == 21 and base["variantNumber"] == 2, "Base #2 should have 21 tasks")
            scenario["base_id"] = base["id"]
            card = catalogue(page)
            card = scope(page, "ЕГЭ", "profile")
            card.get_by_role("button", name="Продолжить вариант", exact=True).click()
            page.locator(".mock-task").wait_for()
            expect(active(page)["id"] == scenario["profile_old_id"], "Profile resumed wrong level")
            card = catalogue(page)
            card.locator("select").select_option("3")
            card.get_by_role("button", name="Начать новый вариант", exact=True).click()
            expect(len(saved(page)["sessions"]) == 3, "First new click must ask confirmation")
            confirm = card.get_by_role("group", name="Подтверждение нового варианта")
            expect("останется" in confirm.inner_text(), "Confirmation must describe retained progress")
            confirm.get_by_role("button", name="Начать новый", exact=True).click()
            page.locator(".mock-task").wait_for()
            current = active(page)
            expect(current["variantNumber"] == 3 and len(saved(page)["sessions"]) == 4, "New intentional attempt must be created once")
            old = next(s for s in saved(page)["sessions"] if s["id"] == scenario["profile_old_id"])
            expect(old["finishedAt"] is None, "Starting new must preserve unfinished old attempt")
            scenario["profile_current_id"] = current["id"]
            return {"oge": scenario["oge_id"], "profile_old": old["id"], "base": base["id"], "new_profile": current["id"], "session_count": 4}

        if check("exam_level_scoped_resume_and_confirmed_new_attempt_preserves_old", isolated_scopes):
            def finish_and_self_check():
                before = active(page)
                correct_id = before["taskIds"][0]
                scenario["correct_id"] = correct_id
                page.locator("#mock-answer").fill(answer_text(correct_id))
                jump(page, 1)
                page.locator("#mock-answer").fill("1/2")
                extended_index = next(i for i, id_ in enumerate(before["taskIds"]) if DATA["tasks"][id_]["part"] == 2)
                extended_id = before["taskIds"][extended_index]
                jump(page, extended_index)
                page.locator("#mock-answer").fill("Черновик решения: выписать ограничения и проверить корни.")
                finish(page)
                result = active(page)
                expect(result["results"][correct_id]["correct"], "Known correct answer was rejected")
                fraction = result["results"][before["taskIds"][1]]
                expect(not fraction["valid"] and fraction.get("message"), "Fraction format should be rejected with an explanation")
                score = sum(item["primaryScore"] for item in result["results"].values())
                expect(score == DATA["tasks"][correct_id]["max"], "Automatic primary sum is incorrect")
                game_before_self = game(page)
                page.get_by_role("button", name="Проверить самостоятельно", exact=True).click()
                page.locator(".mock-solution").wait_for()
                maximum = DATA["tasks"][extended_id]["max"]
                page.locator(f'.mock-score-options input[value="{maximum}"]').check()
                page.get_by_role("button", name="Подтвердить самооценку", exact=True).click()
                expect(active(page)["selfScores"][extended_id] == maximum, "Self score was not persisted")
                expect(game(page)["checks"] == game_before_self["checks"], "Self assessment changed first-answer streak journal")
                ledger = game(page)["xpEvents"]
                page.get_by_role("button", name="Подтвердить самооценку", exact=True).click()
                expect(game(page)["xpEvents"] == ledger, "Confirming the same self score awarded duplicate XP")
                expect("баллы самопроверки второй части" in page.locator(".mock-session-header").inner_text(), "Self scores must be labelled")
                page.reload(wait_until="networkidle")
                page.locator(".mock-self-assessment").wait_for()
                expect(game(page)["xpEvents"] == ledger, "Reload republished XP")
                expect(active(page)["id"] == before["id"] and len(saved(page)["sessions"]) == 4, "Reload duplicated finished attempt")
                no_overflow(page, "finished self-assessment phone")
                page.screenshot(path=str(ARTIFACTS / "self-assessment-375.png"), full_page=False)
                jump(page, 1)
                expect("Обыкновенная дробь" in page.locator(".mock-verdict").inner_text(), "Final format error must be visible")
                scenario["ledger"] = ledger
                scenario["checks"] = game(page)["checks"]
                return {"automatic_primary": score, "self_primary": maximum, "xp_events": len(ledger), "win_streak_check_count": len(game(page)["checks"]), "strict_fraction_rejected": True}

            if check("finish_primary_points_strict_input_self_check_and_no_reload_duplicate_xp", finish_and_self_check):
                def repeat_no_xp():
                    card = catalogue(page)
                    card.locator("select").select_option("3")
                    card.get_by_role("button", name="Начать новый вариант", exact=True).click()
                    card.get_by_role("group", name="Подтверждение нового варианта").get_by_role("button", name="Начать новый", exact=True).click()
                    page.locator(".mock-task").wait_for()
                    expect(active(page)["taskIds"][0] == scenario["correct_id"], "Same numbered variant must retain task identity")
                    page.locator("#mock-answer").fill(answer_text(scenario["correct_id"]))
                    finish(page)
                    expect(game(page)["xpEvents"] == scenario["ledger"], "Repeated task awarded duplicate XP")
                    expect(game(page)["checks"] == scenario["checks"], "Repeated answer changed first-answer streak")
                    return {"same_task": scenario["correct_id"], "session_count": len(saved(page)["sessions"]), "xp_unchanged": True}
                check("same_task_across_variants_does_not_duplicate_xp_or_streak", repeat_no_xp)

    def base_theory():
        visit(page, "/theory?exam=ЕГЭ&level=base")
        picker = page.get_by_role("combobox", name="Уровень математики в теории")
        picker.wait_for()
        expect(picker.input_value() == "base", "Theory lost base level")
        topic = DATA["theory"][0]
        page.locator(".theory-topic-card").filter(has_text=topic["title"]).first.click()
        page.get_by_role("button", name="Разобрать подробнее", exact=True).click()
        checks = page.get_by_role("region", name="Самопроверка знаний")
        checks.wait_for()
        expect("level=base" in page.url, "Opening full theory lost base level")
        checks.locator("summary").first.click()
        expect(checks.locator("details[open]").count() == 1, "Knowledge-check explanation did not open")
        no_overflow(page, "base theory at375")
        page.screenshot(path=str(ARTIFACTS / "base-theory-375.png"), full_page=False)
        page.get_by_role("button", name="Перейти к заданиям", exact=True).click()
        page.locator(".task-screen, .task-page").first.wait_for()
        expect("level=base" in page.url, "Theory practice started the wrong EGE level")
        return {"topic": topic["id"], "practice_url": page.url, "knowledge_checks_open": True}

    check("base_theory_navigation_knowledge_check_and_correct_level_practice", base_theory)
    context.close()

    def complete_base():
        context = browser.new_context(viewport={"width": 430, "height": 900})
        page = context.new_page()
        page.on("pageerror", lambda error: RESULTS["page_errors"].append(str(error)))
        visit(page, "/catalog?exam=ЕГЭ&subject=math&level=base&mode=number")
        page.locator(".exam-catalog:visible").wait_for()
        card = page.locator(".exam-catalog .variant-launch-card")
        start_card(page, card, 1)
        attempt = active(page)
        for index, task_id in enumerate(attempt["taskIds"]):
            if index:
                jump(page, index)
            page.locator("#mock-answer").fill(answer_text(task_id))
        finish(page)
        result = active(page)
        maximum = sum(DATA["tasks"][id_]["max"] for id_ in result["taskIds"])
        score = sum(item["primaryScore"] for item in result["results"].values())
        expect(len(result["results"]) == 21 and score == maximum == 21, f"Full base answer checking failed: {score}/{maximum}")
        expect(page.locator(".mock-self-assessment").count() == 0, "Base must not invent second-part self assessment")
        no_overflow(page, "finished full base430")
        page.screenshot(path=str(ARTIFACTS / "base-result-430.png"), full_page=False)
        context.close()
        return {"correct_answers": 21, "primary_score": score, "maximum": maximum}

    check("complete_base_variant_all21_short_answers_primary21", complete_base)

    def dark_theme_and_shared_storage():
        shared = browser.new_context(viewport={"width": 375, "height": 900})
        first = shared.new_page()
        second = shared.new_page()
        visit(first, "/profile")
        first.get_by_role("button", name="Тёмная", exact=True).click()
        first.wait_for_function("document.documentElement.dataset.theme === 'dark'")
        visit(first, "/catalog?exam=ОГЭ&subject=math&mode=number")
        card = first.locator(".exam-catalog .variant-launch-card")
        start_card(first, card, 1)
        first.locator("#mock-answer").fill("42")
        visit(second, "/catalog?exam=ОГЭ&subject=math&mode=number")
        second.locator(".variant-launch-card").get_by_role("button", name="Продолжить вариант", exact=True).wait_for()
        expect(second.evaluate("document.documentElement.dataset.theme") == "dark", "Theme did not survive navigation/reload")
        no_overflow(second, "dark catalogue375")
        second.screenshot(path=str(ARTIFACTS / "dark-catalog-375.png"), full_page=False)
        first.evaluate("localStorage.removeItem('tochka-mock-exams-v1')")
        second.wait_for_function("document.querySelector('.variant-launch-resume') === null")
        expect(second.locator(".variant-launch-card").get_by_role("button", name="Продолжить вариант", exact=True).count() == 0, "Other tab retained a deleted live attempt")
        future = '{"version":999,"sessions":[]}'
        first.evaluate("raw => localStorage.setItem('tochka-mock-exams-v1', raw)", future)
        # The storage event is asynchronous; allow it to reach the second tab before start.
        second.wait_for_timeout(100)
        start_card(second, second.locator(".exam-catalog .variant-launch-card"), 2)
        expect(second.evaluate("localStorage.getItem('tochka-mock-exams-v1')") == future, "Unknown future storage schema was overwritten")
        expect(second.locator(".mock-page").get_by_role("alert").count() > 0, "Unavailable persistence needs a visible warning")
        no_overflow(second, "dark mock375")
        shared.close()
        return {"dark_theme": True, "cross_tab_reset": True, "future_schema_preserved": True}

    check("dark_theme_cross_tab_reset_and_future_schema_preservation", dark_theme_and_shared_storage)
    browser.close()

RESULTS["seconds"] = round(time() - STARTED, 2)
RESULTS["passed"] = sum(item["status"] == "passed" for item in RESULTS["checks"])
RESULTS["failed"] = sum(item["status"] == "failed" for item in RESULTS["checks"])
RESULTS["page_errors"] = sorted(set(RESULTS["page_errors"]))
(ARTIFACTS / "results.json").write_text(json.dumps(RESULTS, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"passed": RESULTS["passed"], "failed": RESULTS["failed"], "page_errors": RESULTS["page_errors"], "report": str(ARTIFACTS / "results.json")}, ensure_ascii=False), flush=True)
sys.exit(1 if RESULTS["failed"] or RESULTS["page_errors"] else 0)
