"""Measure the actual number picker in a production export; no content writes."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--phase', choices=['before', 'after'], required=True)
args = parser.parse_args()
output = Path('/workspace/scratch/catalog-width-' + args.phase)
output.mkdir(exist_ok=True)
rows = []
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for theme in ['light', 'dark']:
        context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True,
                                      user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        base = os.environ.get('TOCHKA_QA_BASE_URL', 'http://127.0.0.1:3002/tgminiapp-ege')
        page.goto(base + '/#catalog?exam=ЕГЭ&subject=math&level=profile&mode=number', wait_until='networkidle')
        expect(page.locator('[data-catalog-number]')).to_have_count(20)
        page.evaluate('(theme) => document.documentElement.dataset.theme = theme', theme)
        for width in [320, 360, 375, 390, 414, 430, 768, 820, 1024, 1280, 1366, 1440]:
            page.set_viewport_size({'width': width, 'height': 844 if width < 768 else 900})
            page.wait_for_timeout(80)
            row = page.evaluate('''() => {
              const box = s => { const r=document.querySelector(s).getBoundingClientRect(); return {x:r.x,width:r.width,right:r.right}; };
              return {viewport:innerWidth,main:box('.main-content'),workspace:box('.workspace'),catalog:box('.exam-catalog'),grid:box('.catalog-number-grid'),columns:getComputedStyle(document.querySelector('.catalog-number-grid')).gridTemplateColumns,overflow:document.documentElement.scrollWidth>innerWidth,smallTargets:[...document.querySelectorAll('[data-catalog-number]')].filter(e=>e.getBoundingClientRect().height<44).length};
            }''')
            row['theme'] = theme
            rows.append(row)
            assert not row['overflow'], row
            assert not row['smallTargets'], row
            if args.phase == 'after':
                assert row['workspace']['width'] - row['catalog']['width'] <= 66, row
            if width in [390, 820, 1440]:
                page.locator('.catalog-number-grid').first.scroll_into_view_if_needed()
                page.screenshot(path=str(output / f'{theme}-{width}.png'))
        page.set_viewport_size({'width': 390, 'height': 844})
        page.locator('[data-catalog-number="9"]').click()
        expect(page.locator('#task-heading')).to_have_text('Задание №9')
        page.locator('#task-answer').fill('2718')
        page.go_back()
        expect(page.locator('[data-catalog-number="9"]')).to_be_visible()
        page.locator('[data-catalog-number="9"]').click()
        expect(page.locator('#task-answer')).to_have_value('2718')
        page.set_viewport_size({'width': 844, 'height': 390})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        context.close()
    # Native desktop context and all three real sidebar states, including a
    # wider-than-cap monitor. Subject changes use the existing hash router.
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    for exam, subject in [('ОГЭ', 'social'), ('ОГЭ', 'biology'), ('ЕГЭ', 'russian')]:
        page.goto(base + f'/#catalog?exam={exam}&subject={subject}&mode=number', wait_until='networkidle')
        expect(page.locator('[data-catalog-number]').first).to_be_visible()
        for state in ['expanded', 'compact', 'hidden']:
            page.evaluate('(state) => document.querySelector(".app-shell").dataset.sidebar=state', state)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            if args.phase == 'after':
                assert page.evaluate('document.querySelector(".workspace").clientWidth - document.querySelector(".exam-catalog").clientWidth <= 49')
            rows.append(page.evaluate('''() => ({viewport:innerWidth,subject:location.hash,sidebar:document.querySelector('.app-shell').dataset.sidebar,catalogWidth:document.querySelector('.exam-catalog').clientWidth})'''))
    context.close()
    browser.close()
assert not errors, errors
(output / 'measurements.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
print(json.dumps({'phase': args.phase, 'cases': len(rows), 'errors': errors, 'measurements': str(output / 'measurements.json')}))
