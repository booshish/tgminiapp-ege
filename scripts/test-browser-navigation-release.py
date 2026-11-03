"""Real production navigation/dock gestures, no entitlement spoofing."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

errors = []
rows = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for theme in ['light', 'dark']:
        for width, height in [(320, 1000), (390, 1000), (820, 1180), (1180, 820), (1440, 900), (844, 390)]:
            ctx = browser.new_context(viewport={'width': width, 'height': height}, has_touch=True)
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto('http://127.0.0.1:3002/tgminiapp-ege/#catalog?exam=ОГЭ&subject=math&mode=number', wait_until='networkidle')
            expect(page.locator('[data-catalog-number="9"]')).to_be_visible()
            page.evaluate('(t)=>document.documentElement.dataset.theme=t', theme)
            dock = page.locator('.plus-dock')
            expect(dock).to_be_visible()
            rows.append({'theme': theme, 'viewport': [width, height], 'dock': dock.bounding_box()})
            toggle = page.get_by_role('button', name='Меню', exact=True)
            for _ in range(3):
                for _ in range(2):
                    toggle.tap()
                    if width >= 768:
                        page.wait_for_function('Math.abs(document.querySelector(".plus-dock").getBoundingClientRect().left-document.querySelector(".workspace").getBoundingClientRect().left)<1')
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if width < 768:
                toggle.tap()
                expect(page.locator('#mobile-menu')).to_be_visible()
                page.keyboard.press('Escape')
                expect(page.locator('#mobile-menu')).not_to_be_visible()
                expect(toggle).to_be_focused()
                toggle.tap()
                nav = page.locator('#mobile-menu nav')
            else:
                nav = page.locator('.desktop-nav')
            expect(nav.get_by_role('button')).to_have_count(6)
            assert nav.get_by_role('button').all_text_contents() == ['Задания', 'Теория', 'Конспекты', 'Мой тренер', 'Мои ошибки', 'Профиль']
            for b in nav.get_by_role('button').all():
                box = b.bounding_box()
                assert box['height'] >= 44 and box['width'] >= 44
            nav.get_by_role('button', name='Теория', exact=True).tap()
            if width < 768:
                expect(page.locator('#mobile-menu')).not_to_be_visible()
            page.get_by_role('button', name='Перейти на главную', exact=True).filter(visible=True).tap()
            expect(page.locator('.premium-summary,.home-premium-link')).to_have_count(0)
            expect(page.get_by_role('button', name='Узнать больше', exact=True)).to_have_count(1)
            # The dock has its own flex row, never an overlay on the scrollport.
            page.wait_for_function('document.querySelector(".main-content").getBoundingClientRect().bottom <= document.querySelector(".plus-dock").getBoundingClientRect().top+1')
            page.evaluate('const e=document.querySelector(".main-content");e.scrollTop=e.scrollHeight')
            assert page.evaluate('document.querySelector(".main-content").getBoundingClientRect().bottom <= document.querySelector(".plus-dock").getBoundingClientRect().top+1')
            page.goto('http://127.0.0.1:3002/tgminiapp-ege/#trainer', wait_until='networkidle')
            expect(dock).to_have_count(0)
            expect(page.get_by_role('button', name='Подключить Плюс', exact=True)).to_have_count(1)
            page.goto('http://127.0.0.1:3002/tgminiapp-ege/#catalog?exam=ОГЭ&subject=math&mode=number', wait_until='networkidle')
            if width >= 768:
                toggle.tap()
                expect(toggle).to_have_attribute('aria-expanded', 'false')
                page.reload(wait_until='networkidle')
                expect(toggle).to_have_attribute('aria-expanded', 'false')
                toggle.tap()
            page.locator('[data-catalog-number="9"]').tap()
            reserved = page.locator('.main-content').evaluate('e=>e.clientHeight')
            page.locator('#task-answer').fill('2718')
            expect(dock).not_to_be_visible()
            assert abs(page.locator('.main-content').evaluate('e=>e.clientHeight') - reserved) < 1
            if width < 768:
                toggle.tap()
                expect(page.locator('#mobile-menu')).to_be_visible()
            page.get_by_role('button', name='Фокус: включить режим концентрации', exact=True).tap()
            expect(page.locator('#mobile-menu')).not_to_be_visible()
            expect(dock).to_have_count(0)
            page.get_by_role('button', name='Выйти из режима концентрации', exact=True).tap()
            expect(page.locator('#task-answer')).to_have_value('2718')
            if width >= 768:
                expect(toggle).to_have_attribute('aria-expanded', 'true')
            page.get_by_role('button', name='Перейти на главную', exact=True).filter(visible=True).tap()
            expect(dock).to_be_visible()
            page.get_by_role('button', name='Скрыть предложение Плюса на эту сессию', exact=True).tap()
            expect(dock).to_have_count(0)
            page.reload(wait_until='networkidle')
            expect(dock).to_have_count(0)
            ctx.close()
    browser.close()
assert not errors, errors
Path('/workspace/scratch/navigation-dock-measurements.json').write_text(json.dumps(rows, indent=2))
print(json.dumps({'cases': len(rows), 'pageErrors': errors, 'entitledBrowser': 'unavailable: no trusted server adapter; policy/unit tested'}))
