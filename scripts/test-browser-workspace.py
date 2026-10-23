"""Navigation/workspace QA. Existing content and local browser test state only."""
import json
import os
import re
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
base = os.environ.get("TOCHKA_QA_BASE_URL", "http://127.0.0.1:3003").rstrip("/")
artifacts = Path("/workspace/scratch/qa-workspace")
artifacts.mkdir(parents=True, exist_ok=True)
fixture = json.loads(subprocess.check_output([
    "node", "--input-type=module", "-e",
    'import{createContentLoader}from"./scripts/content-source-loader.mjs";const l=createContentLoader();'
    'const{getPracticeTasks}=l("src/lib/tasks.ts");const{getPublishedTheoryTopics}=l("src/lib/theory.ts");'
    'console.log(JSON.stringify({math:getPracticeTasks({examType:"ЕГЭ",subjectId:"math",level:"profile",examNumber:1})[0],'
    'russian:getPracticeTasks({examType:"ЕГЭ",subjectId:"russian",examNumber:23})[0],'
    'theory:getPublishedTheoryTopics().find(t=>t.subjectId==="math"&&t.part===1&&t.examType.includes("ЕГЭ"))}));'
], cwd=root, text=True))
checks = []
errors = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.on("pageerror", lambda error: errors.append(str(error)))

    def visit(hash_value):
        page.goto(base + "/#/" + hash_value, wait_until="networkidle")
        page.locator('#main-content[aria-busy="false"]').wait_for()

    def desktop(label):
        page.locator(".desktop-nav").get_by_role("button", name=label, exact=True).click()

    def game():
        return page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2')).game")

    def no_overflow():
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")

    def task_route(task):
        return f'tasks/0?exam=ЕГЭ&subject={task["subjectId"]}&number={task["examNumber"]}&mode=number&part={task["part"]}&task={task["id"]}' + ("&level=profile" if task["subjectId"] == "math" else "")

    visit("catalog?exam=ЕГЭ&subject=math&level=profile&mode=number")
    labels = page.locator(".desktop-nav button").evaluate_all("els => els.map(el => el.getAttribute('aria-label'))")
    assert labels == ["Главная", "Задания", "Теория", "Конспекты", "Мой тренер", "Мои ошибки", "Профиль", "Плюс"]
    expect(page.locator(".app-shell")).to_have_attribute("data-sidebar", "compact")
    compact_left = page.locator(".workspace").bounding_box()["x"]
    page.get_by_role("button", name="Развернуть меню", exact=True).click()
    expect(page.locator(".app-shell")).to_have_attribute("data-sidebar", "expanded")
    assert page.locator(".workspace").bounding_box()["x"] > compact_left
    page.get_by_role("button", name="Скрыть боковую панель", exact=True).click()
    expect(page.locator(".sidebar")).to_be_hidden()
    assert page.locator(".workspace").bounding_box()["x"] == 0
    page.reload(wait_until="networkidle")
    expect(page.locator(".app-shell")).to_have_attribute("data-sidebar", "hidden")
    page.get_by_role("button", name="Показать меню", exact=True).click()
    page.get_by_role("button", name="Свернуть меню", exact=True).click()
    checks.append("eight_sections_compact_expand_hide_restore_reload_content_reflow")

    math = fixture["math"]
    visit(task_route(math))
    page.locator("#task-answer").fill("999999")
    page.get_by_role("button", name="Проверить ответ", exact=True).click()
    page.locator(".task-verdict-incorrect").wait_for()
    desktop("Мои ошибки")
    expect(page.locator(".study-tools-page")).to_contain_text(math["title"])
    desktop("Задания")
    expect(page.locator(".exam-catalog:visible")).to_be_visible()
    expect(page.locator(".preparation-modes")).to_contain_text("Работа над ошибками")
    page.locator(".preparation-continue").click()
    expect(page.locator("#task-answer")).to_have_value("999999")
    page.locator("#task-answer").fill(math["answerDisplay"])
    page.get_by_role("button", name="Проверить ответ", exact=True).click()
    page.locator(".task-verdict-correct").wait_for()
    saved_game = game()
    page.get_by_role("button", name="Сохранить в избранное", exact=True).click()
    desktop("Задания")
    page.locator(".preparation-modes").get_by_role("button", name=re.compile("^Сохранённые задания")).click()
    expect(page.get_by_role("heading", name="Сохранённые задания", exact=True)).to_be_visible()
    expect(page.locator(".study-tools-page")).to_contain_text(math["title"])
    assert game() == saved_game
    checks.append("task_hub_wrong_history_resume_checked_answer_bookmarks_no_duplicate_XP")

    desktop("Задания")
    page.locator(".preparation-modes").get_by_role("button", name=re.compile("^Решить вариант")).click()
    page.locator(".mock-page").wait_for()
    page.get_by_role("button", name=re.compile("^Начать вариант")).first.click()
    page.locator("#mock-answer").fill("17")
    page.reload(wait_until="networkidle")
    expect(page.locator("#mock-answer")).to_have_value("17")
    mock_state = page.evaluate("JSON.parse(localStorage.getItem('tochka-mock-exams-v1'))")
    desktop("Задания")
    page.get_by_role("button", name="Продолжить вариант", exact=True).click()
    expect(page.locator("#mock-answer")).to_have_value("17")
    restored_mock = page.evaluate("JSON.parse(localStorage.getItem('tochka-mock-exams-v1'))")
    assert len(restored_mock["sessions"]) == len(mock_state["sessions"])
    assert restored_mock["activeId"] == mock_state["activeId"]
    page.get_by_role("button", name="К вариантам и истории", exact=True).click()
    expect(page.locator(".mock-page")).to_contain_text("Завершённые варианты появятся здесь")
    assert game() == saved_game
    checks.append("existing_variant_start_draft_reload_resume_history_no_XP_change")

    desktop("Задания")
    page.get_by_label("Выберите предмет", exact=True).select_option("russian")
    expect(page.locator(".course-label")).to_contain_text("Русский язык")
    expect(page.locator(".preparation-modes").get_by_role("button", name=re.compile("^Решить вариант"))).to_be_disabled()
    page.locator('[data-catalog-number="23"]').click()
    expect(page.locator(".task-source-text")).to_be_visible()
    page.locator("#task-answer").fill("черновик")
    page.get_by_role("button", name="Сохранить в избранное", exact=True).click()
    desktop("Задания")
    page.locator(".preparation-modes").get_by_role("button", name=re.compile("^Сохранённые задания")).click()
    expect(page.locator(".study-tools-list")).to_contain_text("Русский язык")
    russian_card = page.locator(".study-tools-list article").filter(has_text="Русский язык").first
    russian_card.get_by_role("button", name="Открыть", exact=True).click()
    expect(page.locator("#task-answer")).to_have_value("черновик")
    original_text = page.locator(".task-source-text .task-prompt").inner_text()
    page.locator(".task-source-text .task-prompt").evaluate("(el, text) => el.textContent = Array(12).fill(text).join('\\n\\n')", original_text)
    # DOM-only length stress; the content bank and browser storage are not modified.
    for width in [1920, 1440, 1024, 768, 767, 430, 320]:
        page.set_viewport_size({"width": width, "height": 1000})
        no_overflow()
        source = page.locator(".task-source-text").bounding_box()
        answer = page.locator(".task-reading-layout > .task-card").bounding_box()
        if width >= 1024:
            assert answer["x"] >= source["x"] + source["width"] + 10, (width, source, answer)
        else:
            assert answer["y"] >= source["y"] + source["height"], (width, source, answer)
        if width >= 768:
            expect(page.locator(".mobile-nav")).to_be_hidden()
            rail = page.locator(".sidebar").bounding_box()
            assert source["x"] >= rail["x"] + rail["width"]
        else:
            expect(page.locator(".sidebar")).to_be_hidden()
            expect(page.locator(".mobile-nav")).to_be_visible()
        if width in [1440, 768, 320]:
            page.screenshot(path=str(artifacts / f"reading-{width}.png"))
    for width in [768, 1024]:
        page.set_viewport_size({"width": width, "height": 768})
        page.get_by_role("button", name="Развернуть меню", exact=True).click()
        no_overflow()
        source = page.locator(".task-source-text").bounding_box()
        rail = page.locator(".sidebar").bounding_box()
        assert source["x"] >= rail["x"] + rail["width"]
        page.get_by_role("button", name="Свернуть меню", exact=True).click()
    page.get_by_role("button", name="Фокус: включить режим концентрации", exact=True).click()
    expect(page.locator(".sidebar")).to_be_hidden()
    expect(page.locator("#task-answer")).to_have_value("черновик")
    no_overflow()
    page.get_by_role("button", name="Выйти из режима концентрации", exact=True).click()
    expect(page.locator(".sidebar")).to_be_visible()
    page.get_by_role("button", name="Скрыть боковую панель", exact=True).click()
    expect(page.locator("#task-answer")).to_have_value("черновик")
    page.reload(wait_until="networkidle")
    expect(page.locator("#task-answer")).to_have_value("черновик")
    page.get_by_role("button", name="Показать меню", exact=True).click()
    page.get_by_role("button", name="Свернуть меню", exact=True).click()
    assert game() == saved_game
    checks.append("russian_bookmarks_long_text_columns_1920_1440_1024_768_767_430_320_no_overlap_draft_reload")

    desktop("Задания")
    page.locator(".course-picker").get_by_role("button", name="ОГЭ", exact=True).click()
    expect(page.locator(".course-label")).to_contain_text("ОГЭ · Русский язык")
    assert page.locator(".catalog-number-card").count() == 13
    page.get_by_label("Выберите предмет", exact=True).select_option("math")
    page.locator(".preparation-modes").get_by_role("button", name=re.compile("^По номерам")).click()
    page.locator('[data-catalog-number="1"]').click()
    expect(page.locator(".task-screen .eyebrow")).to_contain_text("ОГЭ · Математика")
    page.get_by_role("button", name="К выбору заданий", exact=True).click()
    page.locator(".course-picker").get_by_role("button", name="ЕГЭ", exact=True).click()
    page.locator(".catalog-level-switch").get_by_role("button", name="База", exact=True).click()
    assert page.locator(".catalog-number-card").count() == 21
    page.locator(".catalog-level-switch").get_by_role("button", name="Профиль", exact=True).click()
    assert page.locator(".catalog-number-card").count() == 19
    assert game() == saved_game
    checks.append("OGE_EGE_subject_choice_by_number_base_profile_preserve_learning_state")

    page.set_viewport_size({"width": 1440, "height": 1000})
    topic = fixture["theory"]
    visit(f'theory?topic={topic["id"]}&exam=ЕГЭ&subject=math&level=profile')
    page.get_by_role("button", name="Сохранить в избранное", exact=True).click()
    desktop("Конспекты")
    expect(page.get_by_role("heading", name="Конспекты", exact=True)).to_be_visible()
    expect(page.locator(".study-tools-list")).to_contain_text(topic["title"])
    expect(page.locator(".study-tools-list")).not_to_contain_text(math["title"])
    page.reload(wait_until="networkidle")
    expect(page.get_by_role("heading", name="Конспекты", exact=True)).to_be_visible()
    page.get_by_role("button", name="Открыть", exact=True).click()
    expect(page.locator(".theory-reading-page")).to_be_visible()
    checks.append("notes_reuse_existing_theory_bookmarks_kind_filter_reload_and_open")

    desktop("Мой тренер")
    page.locator(".trainer-section-nav").get_by_role("button", name="Повторение", exact=True).click()
    expect(page.get_by_role("heading", name="Повторение", exact=True)).to_be_visible()
    expect(page.locator('.desktop-nav button[aria-current="page"]')).to_have_attribute("aria-label", "Мой тренер")
    visit("review")
    expect(page.locator(".trainer-section-nav")).to_be_visible()
    expect(page.locator(".premium-gate")).to_contain_text("Плюс")
    assert game() == saved_game
    checks.append("review_nested_in_trainer_old_URL_supported_free_gate_and_learning_state_preserved")

    desktop("Профиль")
    expect(page.get_by_role("heading", name="Подписка «Плюс»", exact=True)).to_be_visible()
    page.get_by_role("button", name="Тёмная", exact=True).click()
    desktop("Плюс")
    expect(page.get_by_role("heading", name="Точка Плюс", exact=True)).to_be_visible()
    expect(page.locator(".premium-plan-grid")).to_contain_text("Точка Плюс · 1 предмет")
    for price in ["199 ₽", "299 ₽", "499 ₽"]:
        expect(page.locator(".premium-plan-grid")).to_contain_text(price)
    for button in page.locator(".premium-plan-grid button").all():
        expect(button).to_be_disabled()
    assert "Premium" not in page.locator("body").inner_text()
    no_overflow()
    page.screenshot(path=str(artifacts / "plus-dark-desktop.png"))
    page.set_viewport_size({"width": 375, "height": 900})
    page.get_by_role("button", name="Ещё", exact=True).click()
    dialog = page.locator(".navigation-dialog")
    expect(dialog).to_be_visible()
    expect(dialog).not_to_contain_text("Умное повторение")
    dialog.get_by_role("button", name=re.compile("^Мой тренер")).click()
    expect(page.get_by_role("heading", name="Мой тренер", exact=True)).to_be_visible()
    no_overflow()
    assert game() == saved_game
    checks.append("plus_name_prices_access_unchanged_dark_theme_mobile_navigation")
    for width in [768, 1024]:
        page.set_viewport_size({"width": width, "height": 900})
        for label in ["Главная", "Задания", "Теория", "Конспекты", "Мой тренер", "Мои ошибки", "Профиль", "Плюс"]:
            desktop(label)
            for mode in ["expanded", "compact"]:
                button = "Развернуть меню" if mode == "expanded" else "Свернуть меню"
                page.get_by_role("button", name=button, exact=True).click()
                no_overflow()
                rail = page.locator(".sidebar").bounding_box()
                main = page.locator("#main-content").bounding_box()
                assert main["x"] >= rail["x"] + rail["width"]
                if label == "Задания" and width == 768 and mode == "expanded":
                    page.screenshot(path=str(artifacts / "catalog-768-expanded-dark.png"))
    assert game() == saved_game
    checks.append("all_eight_sections_at_768_1024_both_rail_modes_no_overflow_or_overlap")
    browser.close()
assert not errors, errors
print(json.dumps({"passed": checks, "page_errors": errors, "screenshots": str(artifacts)}, ensure_ascii=False, indent=2))
