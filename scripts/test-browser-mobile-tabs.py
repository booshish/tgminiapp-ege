"""Restored phone tabs; tablet/desktop and entitlements are not spoofed."""
import json
from playwright.sync_api import sync_playwright, expect

errors, cases = [], 0
base = 'http://127.0.0.1:3002/tgminiapp-ege'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for theme in ['light', 'dark']:
        for width, height, sw, sh in [(320, 700, 320, 700), (375, 812, 375, 812), (390, 844, 390, 844), (430, 932, 430, 932), (393, 851, 393, 851), (844, 390, 390, 844)]:
            ctx = browser.new_context(viewport={'width': width, 'height': height}, screen={'width': sw, 'height': sh}, has_touch=True, is_mobile=True)
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(base + '/#catalog?exam=ОГЭ&subject=math&mode=number', wait_until='networkidle')
            shell = page.locator('.app-shell')
            expect(shell).to_have_attribute('data-navigation-layout', 'phone')
            if theme == 'dark':
                page.goto(base + '/#profile', wait_until='networkidle')
                page.get_by_role('button', name='Тёмная', exact=True).tap()
                page.goto(base + '/#catalog?exam=ОГЭ&subject=math&mode=number', wait_until='networkidle')
            expect(page.locator('html')).to_have_attribute('data-theme', theme)
            nav = page.get_by_role('navigation', name='Нижняя навигация', exact=True)
            expect(nav).to_be_visible()
            assert nav.get_by_role('button').all_text_contents() == ['Теория', 'Задания', 'Прогресс', 'Плюс', 'Ещё']
            expect(page.locator('.sidebar')).not_to_be_visible()
            expect(page.locator('.plus-dock')).to_have_count(0)
            expect(page.get_by_role('button', name='Меню', exact=True)).to_have_count(0)
            for _ in range(2):
                for title, view in [('Теория', 'theory'), ('Задания', 'catalog'), ('Прогресс', 'progress'), ('Плюс', 'premium')]:
                    button = nav.get_by_role('button', name=title, exact=True)
                    box = button.bounding_box()
                    assert box['width'] >= 44 and box['height'] >= 44
                    # Native touch near the right edge, not only the icon centre.
                    page.touchscreen.tap(box['x'] + box['width'] - 3, box['y'] + box['height'] / 2)
                    expect(shell).to_have_attribute('data-view', view)
                    expect(button).to_have_attribute('aria-current', 'page')
                    expect(nav.locator('button.active')).to_have_count(1)
                    expect(page.locator('.plus-dock')).to_have_count(0)
            expect(page.locator('#premium-trial-title')).to_have_text('7 дней Плюса')
            join = page.get_by_role('button', name='Подключить Плюс', exact=True)
            expect(join).to_have_count(1)
            expect(join).to_be_disabled()  # No fake trial activation without server.
            for title in ['Профиль', 'Мой тренер', 'Мои ошибки']:
                nav.get_by_role('button', name='Ещё', exact=True).tap()
                drawer = page.locator('#mobile-menu')
                expect(drawer).to_be_visible()
                assert drawer.get_by_role('button').all_text_contents() == ['Мои ошибки', 'Избранное', 'Учебный вариант', 'Профиль', 'Мой тренер', 'Помощь и объяснения']
                drawer.get_by_role('button', name=title, exact=True).tap()
                expect(drawer).not_to_be_visible()
                expect(page.locator('.plus-dock')).to_have_count(0)
            page.get_by_role('button', name='Перейти на главную', exact=True).filter(visible=True).tap()
            expect(shell).to_have_attribute('data-view', 'home')
            nav.get_by_role('button', name='Задания', exact=True).tap()
            page.locator('[data-catalog-number="9"]').tap()
            answer = page.locator('#task-answer')
            answer.fill('2718')
            # Controlled visual viewport models keyboard geometry, not real Safari.
            page.evaluate('Object.defineProperty(visualViewport,"height",{configurable:true,get:()=>300});visualViewport.dispatchEvent(new Event("resize"))')
            page.wait_for_function('document.querySelector(".workspace").getBoundingClientRect().height<=301')
            assert nav.bounding_box()['y'] + nav.bounding_box()['height'] <= 301
            assert page.evaluate('document.querySelector(".main-content").getBoundingClientRect().bottom <= document.querySelector(".mobile-nav").getBoundingClientRect().top+1')
            answer.scroll_into_view_if_needed()
            assert answer.bounding_box()['y'] + answer.bounding_box()['height'] <= nav.bounding_box()['y'] + 1
            page.get_by_role('button', name='Фокус: включить режим концентрации', exact=True).tap()
            expect(nav).not_to_be_visible()
            assert page.locator('.workspace').bounding_box()['height'] <= 301
            page.get_by_role('button', name='Выйти из режима концентрации', exact=True).tap()
            expect(nav).to_be_visible()
            answer.focus()
            nav.get_by_role('button', name='Плюс', exact=True).tap()
            expect(shell).to_have_attribute('data-view', 'premium')
            page.go_back(wait_until='networkidle')
            expect(answer).to_have_value('2718')
            page.evaluate('delete visualViewport.height;visualViewport.dispatchEvent(new Event("resize"))')
            expect(answer).to_have_value('2718')
            page.reload(wait_until='networkidle')
            expect(answer).to_have_value('2718')
            expect(page.locator('html')).to_have_attribute('data-theme', theme)
            expect(nav.get_by_role('button', name='Задания', exact=True)).to_have_attribute('aria-current', 'page')
            # Resize the SAME session across the breakpoint, then return to phone.
            page.set_viewport_size({'width': 820, 'height': 1180})
            expect(shell).to_have_attribute('data-navigation-layout', 'wide')
            expect(nav).not_to_be_visible()
            expect(page.locator('.sidebar')).to_be_visible()
            expect(answer).to_have_value('2718')
            page.set_viewport_size({'width': width, 'height': height})
            expect(shell).to_have_attribute('data-navigation-layout', 'phone')
            expect(nav).to_be_visible()
            expect(page.locator('.plus-dock')).to_have_count(0)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if width == 390:
                page.screenshot(path=f'/workspace/scratch/mobile-tabs-{theme}.png')
            cases += 1
            ctx.close()
    browser.close()
assert not errors, errors
print(json.dumps({'cases': cases, 'errors': errors, 'keyboard': 'controlled visualViewport, not physical', 'paidBrowser': 'unavailable: existing trusted subscription adapter absent'}))
