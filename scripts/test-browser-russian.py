"""Russian practice QA against an existing static production build; no content writes."""
import json
import os
from playwright.sync_api import sync_playwright

base = os.environ.get("TOCHKA_QA_BASE_URL", "http://127.0.0.1:3002/tgminiapp-ege").rstrip("/")
checks = []
errors = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 375, "height": 900})
    page.on("pageerror", lambda error: errors.append(str(error)))

    def catalog(exam):
        page.goto(base + "/#/catalog?exam=" + exam + "&subject=russian&mode=number", wait_until="networkidle")
        page.locator(".exam-catalog:visible").wait_for()

    def game():
        return page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2')).game")

    def correct(answer):
        page.locator("#task-answer").fill(answer)
        page.get_by_role("button", name="Проверить ответ", exact=True).click()
        page.locator(".task-verdict-correct").wait_for()

    catalog("ОГЭ")
    assert page.locator(".catalog-number-card").count() == 13
    assert page.locator('[data-catalog-number="1"]').is_disabled()
    assert page.locator('[data-catalog-number="13"]').is_disabled()
    for number in range(2, 13):
        assert page.locator(f'[data-catalog-number="{number}"]').is_enabled()
    before = game()
    page.locator('[data-catalog-number="8"]').click()
    correct("полотенец")
    assert game() == before
    stored = page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    checked = next(key for key, value in stored["taskStates"].items() if key.startswith("oge-russian") and value.get("attempt"))
    attempt = stored["taskStates"][checked]["attempt"]["id"]
    page.reload(wait_until="networkidle")
    page.locator(".task-verdict-correct").wait_for()
    assert page.locator("#task-answer").input_value() == "полотенец"
    assert page.evaluate("key => JSON.parse(localStorage.getItem('tochka-practice-v1')).taskStates[key].attempt.id", checked) == attempt
    assert game() == before
    page.get_by_role("button", name="Посмотреть решение", exact=True).click()
    assert "родительный" in page.locator("#task-solution").inner_text().lower()
    page.get_by_role("button", name="Скрыть решение", exact=True).click()
    page.get_by_role("button", name="Следующее задание", exact=True).click()
    assert "братьям" in page.locator(".task-screen").inner_text()
    page.reload(wait_until="networkidle")
    assert "братьям" in page.locator(".task-screen").inner_text()
    checks.append("OGE_13_slots_11_ready_part2_check_explanation_position_reload_no_XP")

    catalog("ЕГЭ")
    assert page.locator(".catalog-number-card").count() == 27
    assert page.locator('[data-catalog-number="27"]').is_disabled()
    page.locator('[data-catalog-number="9"]').click()
    correct("431")
    assert game() == before
    checks.append("EGE_27_slots_26_ready_unordered_answer_no_XP")

    catalog("ЕГЭ")
    page.locator('[data-catalog-number="8"]').click()
    page.locator("#task-answer").fill("21345")
    page.get_by_role("button", name="Проверить ответ", exact=True).click()
    page.locator(".task-verdict-incorrect").wait_for()
    checks.append("EGE_correspondence_order_is_significant")

    catalog("ОГЭ")
    page.locator('[data-catalog-number="2"]').click()
    assert "После ночной бури" in page.locator(".task-screen").inner_text()
    for width in [320, 430, 768, 1024]:
        page.set_viewport_size({"width": width, "height": 900})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), f"Overflow at {width}"
        assert page.locator("#task-answer").is_visible()
    checks.append("own_numbered_text_and_mobile_iPad_desktop_no_overflow")
    browser.close()
assert not errors, errors
print(json.dumps({"passed": checks, "page_errors": errors}, ensure_ascii=False, indent=2))
