"""Single native touch gestures, not synthetic double-click workarounds."""
import json
from playwright.sync_api import sync_playwright, expect

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for theme in ['light', 'dark']:
        ctx = browser.new_context(viewport={'width': 820, 'height': 1180}, has_touch=True, is_mobile=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:3002/tgminiapp-ege/#catalog?exam=ОГЭ&subject=math&mode=number', wait_until='networkidle')
        page.locator('[data-catalog-number="9"]').tap()
        answer = page.locator('#task-answer')
        expect(answer).to_be_visible()
        def current():
            return page.url
        def ledger():
            return page.evaluate('JSON.parse(localStorage.getItem("tochka-learning-v2"))')
        page.evaluate('(t)=>document.documentElement.dataset.theme=t', theme)
        initial = ledger()
        original = current()
        answer.focus()
        page.locator('.task-skip-button').tap()
        expect(page).not_to_have_url(original)
        assert ledger()['events'] == initial['events']
        page.locator('.task-previous-button').tap()
        expect(page).to_have_url(original)
        answer.fill('2718')
        for _ in range(3):
            previous = current()
            page.locator('.task-skip-button').tap()
            expect(page).not_to_have_url(previous)
        for _ in range(3):
            previous = current()
            page.locator('.task-previous-button').tap()
            expect(page).not_to_have_url(previous)
        expect(answer).to_have_value('2718')
        for width in [320, 375, 390, 768, 820, 1024, 1440, 1920]:
            page.set_viewport_size({'width': width, 'height': 768 if width == 1024 else 900})
            for sidebar in ['expanded', 'hidden']:
                page.evaluate('(s)=>document.querySelector(".app-shell").dataset.sidebar=s', sidebar)
                for mode in ['Лента', 'По одному']:
                    page.get_by_role('button', name=mode, exact=True).tap()
                expect(answer).to_have_value('2718')
                assert page.evaluate('Math.abs(document.querySelector(".number-training-filters").getBoundingClientRect().left-document.querySelector(".task-card").getBoundingClientRect().left)<1')
                answer.focus()
                page.get_by_role('button', name='Фокус: включить режим концентрации', exact=True).tap()
                answer.scroll_into_view_if_needed()
                answer.focus()
                exit_button = page.get_by_role('button', name='Выйти из режима концентрации', exact=True)
                bounds = exit_button.bounding_box()
                assert bounds['y'] >= 0 and bounds['y'] + bounds['height'] <= 900
                page.get_by_role('button', name='Выйти из режима концентрации', exact=True).tap()
                expect(page.locator('.app-shell')).not_to_have_class(__import__('re').compile(r'focus-mode'))
                expect(answer).to_have_value('2718')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert ledger()['events'] == initial['events']
        page.reload(wait_until='networkidle')
        expect(answer).to_have_value('2718')
        page.get_by_role('button', name='Проверить ответ', exact=True).tap()
        expect(page.locator('.task-verdict')).to_be_visible()
        checked = page.evaluate('localStorage.getItem("tochka-practice-v1")')
        checked_events = ledger()['events']
        page.get_by_role('button', name='Фокус: включить режим концентрации', exact=True).tap()
        page.get_by_role('button', name='Выйти из режима концентрации', exact=True).tap()
        assert page.evaluate('localStorage.getItem("tochka-practice-v1")') == checked
        assert ledger()['events'] == checked_events
        ctx.close()
    browser.close()
assert not errors, errors
print(json.dumps({'themes': 2, 'widths': 8, 'singleTouch': 'passed', 'pageErrors': errors}))
