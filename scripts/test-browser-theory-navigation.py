"""Production-export QA. Chromium device emulation, not physical Safari/iPad."""
import json
import os
from playwright.sync_api import sync_playwright, expect

base = os.environ.get("TOCHKA_QA_BASE_URL", "http://127.0.0.1:3002/tgminiapp-ege").rstrip("/")
errors = []
checks = []

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(base + "/#theory?exam=ЕГЭ&subject=math&level=profile", wait_until="networkidle")
    page.locator(".theory-topic-card").first.wait_for()
    expect(page.get_by_label("Уровень математики в теории")).to_have_value("profile")
    search = page.locator('input[type="search"]')
    section = page.get_by_label("Раздел теории", exact=True)
    section.select_option("algebra")
    search.fill("уравнения")
    expect(page.locator(".theory-topic-card")).to_have_count(2)
    page.locator(".theory-topic-card").filter(has_text="Квадратные уравнения").click()
    expect(page.locator('.lesson-breadcrumbs [aria-current="page"]')).to_have_text("Квадратные уравнения")
    expect(page.locator(".lesson-breadcrumbs button")).to_have_count(3)
    page.get_by_role("button", name="Разобрать подробнее", exact=True).click()
    page.locator(".topic-lesson").wait_for()
    assert "material=" in page.url and "level=profile" in page.url
    expect(page.get_by_role("heading", name="Особенности применения: ЕГЭ профиль", exact=True)).to_be_visible()
    expect(page.get_by_role("heading", name="Особенности применения: ОГЭ", exact=True)).to_have_count(0)
    # Bookmark, refresh and root crumb preserve the existing identity and list state.
    page.get_by_role("button", name="Сохранить в избранное", exact=True).click()
    page.reload(wait_until="networkidle")
    expect(page.get_by_role("button", name="Сохранено — убрать из избранного", exact=True)).to_have_attribute("aria-pressed", "true")
    page.locator(".lesson-breadcrumbs").get_by_role("button", name="Теория", exact=True).click()
    expect(section).to_have_value("algebra")
    expect(search).to_have_value("уравнения")
    expect(page.locator(".theory-topic-card")).to_have_count(2)
    page.reload(wait_until="networkidle")
    expect(search).to_have_value("уравнения")
    expect(section).to_have_value("algebra")
    checks.append("shared article, full URL, bookmark, root crumb, filtered list reload")

    # Real main-content scrolling, captured by the existing catalogue scroll hook.
    search.fill("")
    section.select_option("")
    page.evaluate("document.querySelector('#main-content').scrollTop=850")
    page.wait_for_timeout(350)
    candidates = page.locator(".theory-topic-card")
    candidates.nth(5).click()
    snapshot = page.evaluate("JSON.parse(localStorage.getItem('tochka-theory-scroll-v1'))")
    saved = next(e["top"] for e in snapshot["entries"] if e["locator"] == "id:main-content")
    assert saved > 0, snapshot
    # Restoring after a reload inside the article must also work.
    page.reload(wait_until="networkidle")
    page.locator(".lesson-breadcrumbs").get_by_role("button", name="Математика", exact=True).click()
    page.wait_for_function("top=>Math.abs(document.querySelector('#main-content').scrollTop-top)<2", arg=saved)
    checks.append({"restoredMainScroll": saved})

    # Section crumb explicitly chooses the section; all other filters stay intact.
    section.select_option("algebra")
    page.locator(".theory-topic-card").filter(has_text="Квадратные уравнения").click()
    page.locator(".lesson-breadcrumbs").get_by_role("button", name="Алгебра", exact=True).click()
    expect(section).to_have_value("algebra")
    search.fill("нет-такого-материала")
    expect(page.locator(".theory-topic-card")).to_have_count(0)
    page.get_by_role("button", name="К базовым темам", exact=True).click()
    expect(section).to_have_value("")
    expect(search).to_have_value("")
    checks.append("section breadcrumb and recoverable empty search")

    # Independent exam/level scopes, honest empty unsupported subjects, legacy aliases.
    for exam, subject, level in [("ОГЭ", s, "") for s in ["math", "russian", "informatics", "biology", "chemistry", "social-studies"]] + [("ЕГЭ", "math", "base"), ("ЕГЭ", "math", "profile"), ("ЕГЭ", "russian", ""), ("ЕГЭ", "informatics", "")]:
        page.goto(base + f"/#theory?exam={exam}&subject={subject}&level={level}", wait_until="networkidle")
        if subject in ["math", "informatics"]:
            assert page.locator(".theory-topic-card").count() > 0, (exam, subject, level)
            if subject == "math":
                text = page.locator(".topic-grid").inner_text()
                if exam == "ЕГЭ" and level == "base":
                    assert "№21" in text and "№20. Теория чисел" not in text
        else:
            expect(page.locator(".theory-topic-card")).to_have_count(0)
            expect(page.locator(".info-note").filter(has_text="Математика не подставляется")).to_be_visible()
        checks.append(f"scope: {exam}/{subject}/{level}")
    page.goto(base + "/#theory?exam=ЕГЭ&subject=math&level=base&topic=ege-profile-number-13", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Материал не найден", exact=True)).to_be_visible()
    page.goto(base + "/#theory?exam=ЕГЭ&subject=math&level=profile&topic=trigonometric-equations", wait_until="networkidle")
    expect(page.locator(".lesson-breadcrumbs")).to_contain_text("№14")
    context.close()

    # Both themes, responsive chain and actual compact mobile link, plus keyboard access.
    for device in ["iPhone 13", "iPad (gen 7)"]:
        config = dict(p.devices[device])
        ctx = browser.new_context(**config)
        page = ctx.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(base + "/#theory?exam=ЕГЭ&subject=math&level=profile&topic=quadratic-equations&material=quadratic-equations-basics", wait_until="networkidle")
        for theme in ["light", "dark"]:
            page.evaluate("t=>document.documentElement.dataset.theme=t", theme)
            widths = [320, 375, 390, 844] if device == "iPhone 13" else [768, 820, 1024, 1440, 1920]
            for width in widths:
                page.set_viewport_size({"width": width, "height": 390 if width == 844 else 1024})
                page.locator(".topic-lesson").wait_for()
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+1"), (device, width, theme)
                nav = page.locator(".lesson-breadcrumbs")
                expect(nav).to_be_visible()
                visible = nav.locator("button:visible")
                assert visible.count() == (1 if width < 768 else 3)
                for button in visible.all():
                    rect = button.bounding_box()
                    assert rect["height"] >= 44 and rect["width"] >= 44, rect
                if width < 768:
                    expect(page.locator(".mobile-nav").get_by_role("button", name="Плюс", exact=True)).to_be_visible()
                checks.append(f"layout: {device}/{width}/{theme}")
        # Simulated increased text size; same source and mobile back handler.
        page.evaluate("document.querySelector('.app-shell').classList.add('font-huge')")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+1")
        page.set_viewport_size({"width": 390, "height": 844})
        back = page.locator(".lesson-breadcrumbs button:visible")
        back.focus()
        assert back.evaluate("e=>getComputedStyle(e).outlineStyle!=='none'")
        back.click()
        expect(page.get_by_label("Раздел теории", exact=True)).to_have_value("algebra")
        ctx.close()
    browser.close()

assert not errors, errors
print(json.dumps({"checks": checks, "browserErrors": errors, "realSafari": False}, ensure_ascii=False))
