"""Targeted subject QA, using an existing production build and installed Chromium."""
import json
import os
import subprocess
import atexit
from pathlib import Path
from time import time, sleep
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
base_url = os.environ.get("TOCHKA_QA_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
server = None if "TOCHKA_QA_BASE_URL" in os.environ else subprocess.Popen(["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3000"], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
if server:
    atexit.register(server.terminate)
deadline = time() + 30
while True:
    try:
        with urlopen(base_url, timeout=2) as response:
            if response.status == 200:
                break
    except Exception:
        if (server is not None and server.poll() is not None) or time() > deadline:
            raise RuntimeError("Production server not ready")
        sleep(.2)

result = {"passed": [], "page_errors": [], "screenshots": []}
artifacts = Path("/workspace/scratch/qa-subjects")
artifacts.mkdir(parents=True, exist_ok=True)
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    context = browser.new_context(viewport={"width": 375, "height": 900}, accept_downloads=True)
    page = context.new_page()
    page.on("pageerror", lambda error: result["page_errors"].append(str(error)))

    def visit(route):
        page.goto(base_url + "/#/" + route, wait_until="networkidle")
        page.locator(".exam-catalog:visible").wait_for()

    def game():
        return page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2')).game")

    visit("catalog?exam=ОГЭ&subject=russian&mode=number")
    assert "Русский язык" in page.locator(".info-note").first.inner_text()
    assert page.locator(".catalog-number-card").count() == 0
    assert page.locator(".variant-launch-card").count() == 0
    page.locator(".catalog-subjects > summary").click()
    assert page.locator(".catalog-subjects .feature-card").count() == 14
    assert page.locator('[aria-label="Выберите предмет"] option[value="chinese"]').count() == 0
    result["passed"].append("all_OGE_cards_and_honest_unreviewed_subject")

    page.get_by_role("combobox", name="Выберите предмет", exact=True).select_option("informatics")
    assert page.locator(".catalog-number-card").count() == 16
    assert page.locator('[data-catalog-number="13"]').is_disabled()
    before = game()
    page.locator('[data-catalog-number="2"]').click()
    page.locator('#task-answer').fill("абва")
    page.get_by_role("button", name="Проверить ответ", exact=True).click()
    page.locator(".task-verdict-correct").wait_for()
    assert game() == before, "New subject changed the math game ledger"
    stored = page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    checked = next((key for key, value in stored["taskStates"].items() if key.startswith("oge-informatics") and value.get("attempt")), None)
    assert checked is not None
    attempt_id = stored["taskStates"][checked]["attempt"]["id"]
    page.reload(wait_until="networkidle")
    page.locator(".task-verdict-correct").wait_for()
    assert page.locator('#task-answer').input_value() == "абва"
    assert page.evaluate("key => JSON.parse(localStorage.getItem('tochka-practice-v1')).taskStates[key].attempt.id", checked) == attempt_id
    assert game() == before
    result["passed"].append("subject_text_answer_reload_and_unchanged_XP_streak")

    visit("catalog?exam=ОГЭ&subject=informatics&mode=number")
    page.locator('[data-catalog-number="11"]').click()
    with page.expect_download() as download:
        page.get_by_role("link", name="notes.txt · скачать").click()
    assert download.value.suggested_filename == "notes.txt"
    assert "мост" in Path(download.value.path()).read_text()
    result["passed"].append("original_resource_really_downloads")

    visit("catalog?exam=ЕГЭ&subject=informatics&mode=number")
    assert page.locator(".catalog-number-card").count() == 27
    assert page.locator('[aria-label="Выберите предмет"] option').count() == 15
    assert page.locator('.catalog-level-switch').count() == 0
    page.locator('[data-catalog-number="10"]').click()
    page.locator('#task-answer').fill("16")
    page.get_by_role("button", name="Проверить ответ", exact=True).click()
    page.locator(".task-verdict-correct").wait_for()
    assert "Информатика" in page.locator('.task-heading-block').inner_text()
    result["passed"].append("EGE_2027_mask_at_number10_and_numeric_check")

    for width in [320, 430, 1024]:
        page.set_viewport_size({"width": width, "height": 900})
        visit("catalog?exam=ЕГЭ&subject=informatics&mode=number")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), f"Overflow at {width}"
    page.screenshot(path=str(artifacts / "informatics-desktop.png"))
    result["screenshots"].append(str(artifacts / "informatics-desktop.png"))
    result["passed"].append("subject_mobile_and_desktop_layout")

    visit("catalog?exam=ЕГЭ&subject=math&level=base&mode=number")
    assert page.locator(".variant-launch-card option").count() == 5
    assert page.locator(".catalog-number-card").count() == 21
    visit("catalog?exam=ЕГЭ&subject=math&level=profile&mode=number")
    assert page.locator(".catalog-number-card").count() == 19
    result["passed"].append("math_base_profile_catalogues_unchanged")
    browser.close()
assert not result["page_errors"], result["page_errors"]
(artifacts / "results.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(json.dumps(result, ensure_ascii=False, indent=2))
