"""Production export QA of real published original tasks, not synthetic fixtures."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get("TOCHKA_QA_BASE_URL", "http://127.0.0.1:3002/tgminiapp-ege").rstrip("/")
root = Path(__file__).resolve().parents[1]
tasks = [t for f in sorted((root / "public/task-packages").glob("*.json")) for t in json.loads(f.read_text())]
checks = []
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1024, "height": 768})
    page = ctx.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    requests = []
    page.on("request", lambda req: requests.append(req.url) if "/task-packages/" in req.url else None)
    page.goto(base + "/", wait_until="networkidle")
    expect(page.locator('#main-content[aria-busy="false"]')).to_be_visible()
    assert requests == [], requests
    page.goto(base + "/#catalog?exam=ОГЭ&subject=informatics&mode=number", wait_until="networkidle")
    expect(page.locator('[data-catalog-number="1"]')).to_contain_text("Задач: 3")
    assert requests == [], requests
    page.locator('[data-catalog-number="1"]').click()
    expect(page.locator("#task-answer")).to_be_visible()
    assert len(requests) == 1 and "n1-" in requests[0], requests
    checks.append("home_and_catalog_fetch_no_conditions_selection_fetches_only_one_number")

    for task in tasks:
        url = f'{base}/#tasks?exam=ОГЭ&subject=informatics&mode=number&number={task["examNumber"]}&task={task["id"]}'
        page.goto(url, wait_until="networkidle")
        expect(page.locator(".task-prompt")).to_contain_text(task["prompt"])
        page.locator("#task-answer").fill(task["answerDisplay"])
        page.get_by_role("button", name="Проверить ответ", exact=True).click()
        expect(page.locator(".task-verdict-correct")).to_be_visible()
    checks.append("all_12_real_original_tasks_open_and_check_with_existing_answer_handler")
    ledger = page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
    recorded_ids = {e["taskId"] for e in ledger["events"]}
    assert all(t["id"] in recorded_ids for t in tasks), recorded_ids
    page.get_by_role("button", name="Сохранить в избранное", exact=True).click()
    page.reload(wait_until="networkidle")
    expect(page.locator("#task-answer")).to_have_value(tasks[-1]["answerDisplay"])
    expect(page.locator(".task-verdict-correct")).to_be_visible()
    restored = page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
    assert restored["events"] == ledger["events"]
    assert restored["game"] == ledger["game"]
    expect(page.get_by_role("button", name="В избранном — убрать", exact=True)).to_have_attribute("aria-pressed", "true")
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    checks.append("reload_keeps_all_new_task_events_checked_answers_and_XP_no_duplicate_award")
    checks.append("new_task_bookmark_survives_reload_and_mobile_has_no_page_overflow")
    saved = ctx.storage_state()
    broken_ctx = browser.new_context(storage_state=saved)
    broken = broken_ctx.new_page()
    broken.route("**/task-packages/**", lambda route: route.abort())
    broken.goto(base + "/", wait_until="networkidle")
    expect(broken.locator("#main-content [role=alert]")).to_contain_text("Сохранённые ответы не изменены")
    values = broken.evaluate("Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('tochka')))")
    expected_values = {v["name"]: v["value"] for v in saved["origins"][0]["localStorage"] if v["name"].startswith("tochka")}
    assert values == expected_values
    checks.append("unavailable_package_on_restore_does_not_overwrite_learning_practice_or_bookmarks")
    assert not errors, errors
    browser.close()
print(json.dumps({"passed": checks, "actual_original_tasks": len(tasks), "page_errors": errors}, ensure_ascii=False))
