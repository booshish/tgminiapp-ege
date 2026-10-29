"""Production solver geometry, both modes; no bank or user-data migration."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--phase', choices=['before', 'after'], required=True)
args = parser.parse_args()
output = Path('/workspace/scratch/solver-width-' + args.phase)
output.mkdir(exist_ok=True)
base = os.environ.get('TOCHKA_QA_BASE_URL', 'http://127.0.0.1:3002/tgminiapp-ege')
rows, errors = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for theme in ['light', 'dark']:
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(base + '/#catalog?exam=ОГЭ&subject=math&mode=number', wait_until='networkidle')
        page.locator('[data-catalog-number="9"]').click()
        expect(page.locator('#task-answer')).to_be_visible()
        page.locator('#task-answer').fill('2718')
        page.evaluate('(t) => document.documentElement.dataset.theme=t', theme)
        for width in [320, 375, 390, 768, 820, 1024, 1440, 1920]:
            page.set_viewport_size({'width': width, 'height': 900})
            for sidebar in (['compact'] if width < 768 else ['expanded', 'hidden']):
                page.evaluate('(s) => document.querySelector(".app-shell").dataset.sidebar=s', sidebar)
                for mode in ['По одному', 'Лента']:
                    page.get_by_role('button', name=mode, exact=True).click()
                    selector = '.task-card' if mode == 'По одному' else '.practice-feed-card'
                    expect(page.locator(selector).first).to_be_visible()
                    row = page.evaluate('''s => {
                      const card=document.querySelector(s), w=document.querySelector('.workspace');
                      return {viewport:innerWidth,workspace:w.clientWidth,card:card.getBoundingClientRect().width,
                      overflow:document.documentElement.scrollWidth>innerWidth,
                      inputOverflow:[...document.querySelectorAll('.task-answer-form input')].some(e=>e.getBoundingClientRect().right>innerWidth)};
                    }''', selector)
                    row.update(theme=theme, sidebar=sidebar, mode=mode)
                    rows.append(row)
                    assert not row['overflow'] and not row['inputOverflow'], row
                    if args.phase == 'after':
                        assert row['workspace'] - row['card'] <= 49, row
                    if width in [390, 820, 1920]:
                        page.locator(selector).first.scroll_into_view_if_needed()
                        page.screenshot(path=str(output / f'{theme}-{width}-{sidebar}-{mode}.png'))
                page.get_by_role('button', name='По одному', exact=True).click()
                expect(page.locator('#task-answer')).to_have_value('2718')
        page.reload(wait_until='networkidle')
        expect(page.locator('#task-answer')).to_have_value('2718')
        for route, resource in [
            ('exam=ОГЭ&subject=math&number=15&task=triangle-sine', '.task-diagram-wrap svg'),
            ('exam=ОГЭ&subject=russian&number=2&task=oge-russian-2027-n2-harbour-analysis-2-r1', '.task-source-text'),
            ('exam=ЕГЭ&subject=informatics&number=9', 'a[download]'),
        ]:
            page.goto(base + '/#tasks?mode=number&' + route, wait_until='networkidle')
            page.get_by_role('button', name='По одному', exact=True).click()
            expect(page.locator(resource).first).to_be_visible()
            for width, height in [(320, 844), (820, 1180), (1180, 820), (1920, 1080)]:
                page.set_viewport_size({'width': width, 'height': height})
                for sidebar in ['expanded', 'hidden']:
                    page.evaluate('(s) => document.querySelector(".app-shell").dataset.sidebar=s', sidebar)
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), route
                    if args.phase == 'after':
                        assert page.evaluate('document.querySelector(".workspace").clientWidth-document.querySelector(".task-screen").clientWidth <= 49'), route
            # Existing concentration mode also fills the working area.
            page.get_by_role('button', name='Фокус: включить режим концентрации', exact=True).click()
            if args.phase == 'after':
                # Focus reserves only the compact exit's side lane (64px + gap).
                assert page.evaluate('innerWidth-document.querySelector(".task-screen").clientWidth <= 125')
            page.get_by_role('button', name='Выйти из режима концентрации', exact=True).click()
            if resource == 'a[download]':
                with page.expect_download() as download:
                    page.locator('a[download]').first.click()
                assert Path(download.value.path()).stat().st_size > 0
        ctx.close()
    browser.close()
assert not errors, errors
(output / 'measurements.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
print(json.dumps({'phase': args.phase, 'cases': len(rows), 'errors': errors}))
