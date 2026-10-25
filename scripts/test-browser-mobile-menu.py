"""Real touchscreen hit testing of the existing phone dialog and iPad rail."""
import json
import os
import re
from playwright.sync_api import sync_playwright, expect

base = os.environ.get("TOCHKA_QA_BASE_URL", "http://127.0.0.1:3003").rstrip("/")
checks = []
errors = []
tap_count = 0
point_count = 0

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])

    def context(device, width, height):
        config = dict(p.devices[device])
        config["viewport"] = {"width": width, "height": height}
        ctx = browser.new_context(**config)
        page = ctx.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(base + "/", wait_until="networkidle")
        page.locator('#main-content[aria-busy="false"]').wait_for()
        return ctx, page

    def tap(page, button, sample=0):
        global tap_count, point_count
        button.scroll_into_view_if_needed()
        rect = button.bounding_box()
        assert rect and rect["height"] >= 44, rect
        points = [
            [rect["x"] + rect["width"] / 2, rect["y"] + rect["height"] / 2],
            [rect["x"] + 6, rect["y"] + 6],
            [rect["x"] + rect["width"] - 6, rect["y"] + 6],
            [rect["x"] + 6, rect["y"] + rect["height"] - 6],
            [rect["x"] + rect["width"] - 6, rect["y"] + rect["height"] - 6],
            [rect["x"] + 2, rect["y"] + rect["height"] / 2],
            [rect["x"] + rect["width"] - 2, rect["y"] + rect["height"] / 2],
            [rect["x"] + rect["width"] / 2, rect["y"] + 2],
            [rect["x"] + rect["width"] / 2, rect["y"] + rect["height"] - 2],
        ]
        # Checks rendered hit targets, including edges, not just React handlers.
        hits = button.evaluate("""(button, points) => points.map(([x,y]) => {
            const hit = document.elementFromPoint(x,y);
            return {x,y,ok:hit?.closest('button') === button,hit:hit?.tagName};
        })""", points)
        assert all(hit["ok"] for hit in hits), {"button": button.inner_text(), "hits": hits}
        point_count += len(points)
        page.touchscreen.tap(*points[sample % len(points)])
        tap_count += 1

    def more(page):
        button = page.locator('.mobile-nav button[aria-haspopup="dialog"]')
        tap(page, button)
        expect(page.locator(".navigation-dialog")).to_be_visible()
        expect(button).to_have_attribute("aria-expanded", "true")

    def closed(page):
        expect(page.locator(".navigation-dialog")).to_be_hidden()
        page.wait_for_function("document.querySelectorAll('dialog:modal').length === 0")
        expect(page.locator('.mobile-nav button[aria-haspopup="dialog"]')).to_have_attribute("aria-expanded", "false")

    def select(page, label, view, sample=0):
        if page.locator(".sidebar").is_visible():
            button = page.locator(".desktop-nav").get_by_role("button", name=label, exact=True)
        else:
            more(page)
            name = re.compile("^Мой тренер") if label == "Мой тренер" else label
            button = page.locator(".navigation-dialog").get_by_role("button", name=name, exact=label != "Мой тренер")
        tap(page, button, sample)
        page.wait_for_function("view => location.hash.split('?')[0] === '#/' + view", arg=view)
        closed(page)

    # Before the fix: resizing kept :modal; a tap on the rail hit DIALOG,
    # dismissed the backdrop and left the route unchanged. Back also kept :modal.
    ctx, page = context("iPhone 13", 390, 844)
    more(page)
    page.set_viewport_size({"width": 768, "height": 1024})
    expect(page.locator(".sidebar")).to_be_visible()
    closed(page)
    select(page, "Профиль", "profile")
    select(page, "Плюс", "premium", 2)
    page.set_viewport_size({"width": 390, "height": 844})
    more(page)
    page.go_back()
    page.wait_for_function("location.hash === '#/profile'")
    closed(page)
    select(page, "Плюс", "premium", 4)
    # An old native close notification must not dismiss a freshly reopened menu.
    more(page)
    page.locator(".navigation-dialog").dispatch_event("close")
    expect(page.locator(".navigation-dialog")).to_be_visible()
    expect(page.locator('.mobile-nav button[aria-haspopup="dialog"]')).to_have_attribute("aria-expanded", "true")
    tap(page, page.locator(".navigation-dialog").get_by_role("button", name="Профиль", exact=True))
    closed(page)
    more(page)
    tap(page, page.get_by_role("button", name="Закрыть меню", exact=True))
    closed(page)
    more(page)
    # Real touch on the backdrop rather than a synthetic button click.
    page.touchscreen.tap(2, 2)
    tap_count += 1
    closed(page)
    select(page, "Плюс", "premium")
    checks.append("history_rotation_stale_close_backdrop_and_reopen_no_modal_overlay")
    ctx.close()

    sequence = [("Профиль", "profile"), ("Плюс", "premium"), ("Профиль", "profile"),
                ("Мой тренер", "trainer"), ("Мои ошибки", "mistakes"),
                ("Профиль", "profile"), ("Плюс", "premium")]
    for device, width, height in [("iPhone SE", 320, 568), ("iPhone 13", 390, 844),
                                  ("iPhone 13", 430, 932), ("iPhone 13", 844, 390), ("iPad Mini", 768, 1024),
                                  ("iPad Mini", 1024, 768)]:
        ctx, page = context(device, width, height)
        saved_game = page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2')).game")
        if page.locator(".sidebar").is_visible():
            tap(page, page.get_by_role("button", name="Развернуть меню", exact=True))
        for index, (label, view) in enumerate(sequence):
            select(page, label, view, index)
        # Consecutive taps without sleeps or reloads, across adjacent entries.
        for index in range(12):
            select(page, "Профиль" if index % 2 == 0 else "Плюс", "profile" if index % 2 == 0 else "premium", index)
        expect(page.get_by_role("heading", name="Точка Плюс", exact=True)).to_be_visible()
        for button in page.locator(".premium-plan-grid button").all():
            expect(button).to_have_text(re.compile("Подключить Плюс"))
            expect(button).to_be_disabled()
        assert not re.search(r"premium|премиум", page.locator("body").inner_text(), re.I)
        # Scroll the document, then hit-test and tap the actual fixed navigation.
        page.evaluate("window.scrollTo(0, 600)")
        page.wait_for_function("window.scrollY > 0")
        select(page, "Профиль", "profile", 8)
        expect(page.get_by_role("heading", name="Подписка «Плюс»", exact=True)).to_be_visible()
        select(page, "Плюс", "premium", 1)
        if width >= 768:
            tap(page, page.get_by_role("button", name="Свернуть меню", exact=True))
            for index, (label, view) in enumerate(sequence):
                select(page, label, view, index)
        assert page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2')).game") == saved_game
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        checks.append(f"touch_{width}x{height}_all_hit_points_rapid_switches_scroll_plus_profile")
        ctx.close()
    browser.close()
assert not errors, errors
print(json.dumps({"passed": checks, "touch_taps": tap_count, "hit_points": point_count,
                  "page_errors": errors, "engine": "Chromium touch emulation (iPhone/iPad viewports)"}, ensure_ascii=False, indent=2))
