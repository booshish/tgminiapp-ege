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

    # New entries must open by their stable ID rather than falling back to old tasks.
    for exam, number, slug, answer in [
        ("ОГЭ", 8, "socks", "носков"),
        ("ОГЭ", 4, "dash-subject", "312"),
        ("ОГЭ", 7, "shore-a", "46"),
        ("ОГЭ", 12, "russian-museum-label-12", "бережно"),
        ("ЕГЭ", 9, "roots-meanings", "43"),
        ("ЕГЭ", 8, "syntax-conference", "41235"),
        ("ЕГЭ", 22, "devices-ocean", "53142"),
        ("ЕГЭ", 26, "russian-queue-help-26", "5"),
        ("ЕГЭ", 4, "stress-f", "1235"),
        ("ЕГЭ", 13, "not-pronouns", "124"),
    ]:
        prefix = "oge" if exam == "ОГЭ" else "ege"
        task_id = f"{prefix}-russian-2027-n{number}-p2-{slug}-r1"
        part = 2 if exam == "ОГЭ" else 1
        page.goto(base + f"/#/tasks/0?exam={exam}&subject=russian&number={number}&mode=number&part={part}&task={task_id}", wait_until="networkidle")
        page.locator("#task-answer").wait_for()
        assert task_id in page.url
        correct(answer)
        assert game() == before
        page.reload(wait_until="networkidle")
        page.locator(".task-verdict-correct").wait_for()
        assert page.locator("#task-answer").input_value() == answer
        for width in [320, 430, 768, 1024]:
            page.set_viewport_size({"width": width, "height": 900})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), f"Overflow: {task_id} at {width}"
    for exam, count in [("ОГЭ", 41), ("ЕГЭ", 18)]:
        catalog(exam)
        assert f"Задач: {count}" in page.locator('[data-catalog-number="8"]').inner_text()
    checks.append("pack2_ten_preserved_IDs_answers_reload_mobile")
    for exam, number, slug, answer in [
        ("ОГЭ", 4, "rules-materials", "425"),
        ("ОГЭ", 6, "orth-adjective-n", "35"),
        ("ОГЭ", 7, "letters-fields", "12456"),
        ("ОГЭ", 8, "norm-friends", "друзей"),
        ("ОГЭ", 9, "phrase-bird-song", "птичьепение"),
        ("ОГЭ", 12, "russian-school-radio-12", "вдохновенно"),
        ("ЕГЭ", 4, "accent-terms", "124"),
        ("ЕГЭ", 6, "lex-horizons", "расширила"),
        ("ЕГЭ", 8, "syntax-ecology", "31425"),
        ("ЕГЭ", 9, "root-speech-weather", "1245"),
        ("ЕГЭ", 11, "suffix-clothes-flowers", "1234"),
        ("ЕГЭ", 13, "ne-short-adjectives", "124"),
        ("ЕГЭ", 15, "nn-speech-short", "34"),
        ("ЕГЭ", 20, "mixed-colon-condition", "13"),
        ("ЕГЭ", 22, "devices-transfers", "21453"),
        ("ЕГЭ", 26, "russian-beach-sculpture-26", "6"),
    ]:
        prefix = "oge" if exam == "ОГЭ" else "ege"
        task_id = f"{prefix}-russian-2027-n{number}-p3-{slug}-r1"
        part = 2 if exam == "ОГЭ" else 1
        page.goto(base + f"/#/tasks/0?exam={exam}&subject=russian&number={number}&mode=number&part={part}&task={task_id}", wait_until="networkidle")
        page.locator("#task-answer").wait_for()
        assert task_id in page.url
        correct(answer)
        assert game() == before
        page.reload(wait_until="networkidle")
        page.locator(".task-verdict-correct").wait_for()
        assert page.locator("#task-answer").input_value() == answer
        for width in [320, 430, 768, 1024]:
            page.set_viewport_size({"width": width, "height": 900})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), f"Overflow: {task_id} at {width}"
    catalog("ОГЭ")
    assert "Задач: 41" in page.locator('[data-catalog-number="7"]').inner_text()
    catalog("ЕГЭ")
    for number, count in [(4, 17), (8, 18), (13, 18), (22, 17), (26, 17)]:
        assert f"Задач: {count}" in page.locator(f'[data-catalog-number="{number}"]').inner_text()
    checks.append("pack3_sixteen_new_IDs_answers_reload_320_430_768_1024_and_real_counts")
    for exam, number, slug, answer in [
        ("ОГЭ", 2, "russian-night-observatory-2", "123"),
        ("ОГЭ", 3, "russian-seed-envelopes-3", "245"),
        ("ОГЭ", 4, "rules-tour", "421"),
        ("ОГЭ", 5, "comma-park", "1234"),
        ("ОГЭ", 6, "explain-prefixes", "135"),
        ("ОГЭ", 7, "letters-rain", "1245"),
        ("ОГЭ", 8, "norm-possessive", "ее"),
        ("ОГЭ", 8, "norm-shoes", "туфель"),
        ("ОГЭ", 8, "norm-nine", "девяти"),
        ("ОГЭ", 9, "phrase-bronze", "медальизбронзы"),
        ("ОГЭ", 9, "phrase-respect", "относилсясуважением"),
        ("ОГЭ", 10, "russian-ceramic-mosaic-10", "134"),
        ("ОГЭ", 11, "russian-crossing-signal-11", "3"),
        ("ОГЭ", 12, "russian-music-rest-12", "терпеливо"),
        ("ЕГЭ", 1, "russian-map-scale-1", "тем"),
        ("ЕГЭ", 2, "russian-dictionary-entry-2", "135"),
        ("ЕГЭ", 3, "russian-shadow-observation-3", "134"),
        ("ЕГЭ", 4, "accent-movement", "235"),
        ("ЕГЭ", 5, "paronym-stone", "каменистой"),
        ("ЕГЭ", 6, "lex-memorial", "памятному"),
        ("ЕГЭ", 7, "morph-hundred-rubles", "пятистах"),
        ("ЕГЭ", 8, "syntax-route", "26573"),
        ("ЕГЭ", 9, "roots-forest", "134"),
        ("ЕГЭ", 10, "prefix-hard-sign", "124"),
        ("ЕГЭ", 11, "suffix-ova-yva", "124"),
        ("ЕГЭ", 12, "verbs-spring", "1235"),
        ("ЕГЭ", 13, "ne-pronouns", "135"),
        ("ЕГЭ", 14, "hyphen-indefinite", "124"),
        ("ЕГЭ", 15, "nn-garden", "34"),
        ("ЕГЭ", 16, "one-comma-market", "35"),
        ("ЕГЭ", 17, "detached-double-gerund", "23"),
        ("ЕГЭ", 18, "intro-result", "145"),
        ("ЕГЭ", 19, "relative-nested", "1234"),
        ("ЕГЭ", 20, "mixed-if-to", "13"),
        ("ЕГЭ", 21, "same-colon-cause", "14"),
        ("ЕГЭ", 22, "devices-city", "32451"),
        ("ЕГЭ", 23, "russian-photo-consent-23", "135"),
        ("ЕГЭ", 24, "russian-slow-reading-24", "123"),
        ("ЕГЭ", 25, "russian-race-last-runner-25", "отвсейдуши"),
        ("ЕГЭ", 26, "russian-group-credit-26", "7"),
    ]:
        prefix = "oge" if exam == "ОГЭ" else "ege"
        task_id = f"{prefix}-russian-2027-n{number}-p4-{slug}-r1"
        part = 2 if exam == "ОГЭ" else 1
        page.goto(base + f"/#/tasks/0?exam={exam}&subject=russian&number={number}&mode=number&part={part}&task={task_id}", wait_until="networkidle")
        page.locator(".task-screen:visible").wait_for()
        assert task_id in page.url
        before = game()
        correct(answer)
        assert game() == before
        page.reload(wait_until="networkidle")
        page.locator(".task-verdict-correct").wait_for()
        assert page.locator("#task-answer").input_value() == answer
        for width in [320, 430, 768, 1024]:
            page.set_viewport_size({"width": width, "height": 900})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), f"Overflow: {task_id} at {width}"
    catalog("ОГЭ")
    for number in range(2, 13):
        count = 40 if number == 9 else 41
        assert f"Задач: {count}" in page.locator(f'[data-catalog-number="{number}"]').inner_text()
    catalog("ЕГЭ")
    for number in range(1, 27):
        count = 18 if number in [8, 13, 16, 17, 18, 19, 20, 21] else 17
        assert f"Задач: {count}" in page.locator(f'[data-catalog-number="{number}"]').inner_text()
    checks.append("pack4_all_37_slots_new_IDs_grading_reload_no_XP_320_430_768_1024_450_each")
    browser.close()
assert not errors, errors
print(json.dumps({"passed": checks, "page_errors": errors}, ensure_ascii=False, indent=2))
