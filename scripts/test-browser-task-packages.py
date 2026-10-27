"""Production export QA of real published original tasks, not synthetic fixtures."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get("TOCHKA_QA_BASE_URL", "http://127.0.0.1:3002/tgminiapp-ege").rstrip("/")
root = Path(__file__).resolve().parents[1]
prefix = os.environ.get("TOCHKA_QA_TASK_PREFIX", "oge-informatics-pilot-")
tasks = [t for f in sorted((root / "public/task-packages").glob("*.json")) for t in json.loads(f.read_text()) if t["id"].startswith(prefix)]
assert tasks
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
    expect(page.locator('[data-catalog-number="1"]')).to_contain_text("Задач: 4")
    assert requests == [], requests
    page.locator('[data-catalog-number="1"]').click()
    expect(page.locator("#task-answer")).to_be_visible()
    assert len(requests) == 2 and all("n1-" in url for url in requests), requests
    checks.append("home_and_catalog_fetch_no_conditions_selection_fetches_only_one_number")

    if prefix == "science-stage-a-":
        for exam, subject, count in [("ОГЭ", "physics", 22), ("ОГЭ", "chemistry", 23), ("ЕГЭ", "chemistry", 34)]:
            page.goto(f"{base}/#catalog?exam={exam}&subject={subject}&mode=number", wait_until="networkidle")
            expect(page.locator(".exam-catalog:visible [data-catalog-number]")).to_have_count(count)
            selected = [t for t in tasks if t["examType"][0] == exam and t["subjectId"] == subject]
            for number in {t["examNumber"] for t in selected}:
                card = page.locator(f'[data-catalog-number="{number}"]')
                expect(card).to_be_enabled()
                expected = sum(t["examNumber"] == number for t in selected)
                expect(card).to_contain_text(f"Задач: {expected}")
            expect(page.locator(f'[data-catalog-number="{17 if subject == "physics" else 23 if exam == "ОГЭ" else 34}"]')).to_be_disabled()
        checks.append("all_three_new_catalogues_have_exact_number_counts_real_pilot_counts_and_blocked_expert_slots")

    if prefix == "remaining-20261027-":
        report = json.loads((root / "docs/all-directions-readiness.json").read_text())
        for direction in report["directions"]:
            exam, subject = direction["exam"], direction["subjectId"]
            level = "&level=" + direction["level"] if direction["level"] else ""
            before_requests = len(requests)
            page.goto(f"{base}/#catalog?exam={exam}&subject={subject}&mode=number{level}", wait_until="networkidle")
            expect(page.locator(".exam-catalog:visible [data-catalog-number]")).to_have_count(direction["numberCount"])
            assert len(requests) == before_requests, (exam, subject, requests[before_requests:])
            selected = [t for t in tasks if t["examType"][0] == exam and t["subjectId"] == subject]
            for number in {t["examNumber"] for t in selected}:
                card = page.locator(f'[data-catalog-number="{number}"]')
                expect(card).to_be_enabled()
                expect(card).to_contain_text(f'Задач: {sum(t["examNumber"] == number for t in selected)}')
        page.goto(f"{base}/#catalog?exam=ЕГЭ&subject=geography&mode=number", wait_until="networkidle")
        expect(page.locator('[data-catalog-number="14"]')).to_be_disabled()
        checks.append("all_30_catalogues_have_registered_numbers_pilot_counts_no_background_fetch_and_no_map_substitute")

    for task in tasks:
        url = f'{base}/#tasks?exam={task["examType"][0]}&subject={task["subjectId"]}&mode=number&number={task["examNumber"]}&task={task["id"]}' + (f'&level={task["level"]}' if task["level"] else "")
        page.goto(url, wait_until="networkidle")
        expect(page.locator(".task-prompt")).to_contain_text(task["prompt"])
        page.locator("#task-answer").fill(task["answerDisplay"])
        page.get_by_role("button", name="Проверить ответ", exact=True).click()
        expect(page.locator(".task-verdict-correct")).to_be_visible()
    checks.append("all_selected_real_original_tasks_open_and_check_with_existing_answer_handler")
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
    if prefix == "remaining-20261027-":
        for subject in ["english", "german", "french", "spanish", "chinese"]:
            sample = next(t for t in tasks if t["subjectId"] == subject and t["examType"][0] == "ЕГЭ")
            page.goto(f'{base}/#tasks?exam=ЕГЭ&subject={subject}&mode=number&number={sample["examNumber"]}&task={sample["id"]}', wait_until="networkidle")
            expect(page.locator(".task-prompt")).to_contain_text(sample["prompt"])
            for width in [320, 390, 430, 768, 1024]:
                page.set_viewport_size({"width": width, "height": 844})
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (subject, width)
        # Keep the original failure/retry test bound to the selected final task.
        page.goto(f'{base}/#tasks?exam={tasks[-1]["examType"][0]}&subject={tasks[-1]["subjectId"]}&mode=number&number={tasks[-1]["examNumber"]}&task={tasks[-1]["id"]}', wait_until="networkidle")
        checks.append("all_five_languages_render_at_320_390_430_768_1024_without_page_overflow")
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
