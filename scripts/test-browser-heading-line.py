"""Measure actual text ranges, not margin boxes, in the shared heading row."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--phase', choices=['before', 'after'], required=True)
args = parser.parse_args()
rows, errors = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, has_touch=True)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:3002/tgminiapp-ege/#catalog?exam=ЕГЭ&subject=math&level=profile&mode=number', wait_until='networkidle')
    page.locator('[data-catalog-number="9"]').click()
    expect(page.locator('#task-heading')).to_be_visible()
    for theme in ['light', 'dark']:
        page.evaluate('(t)=>document.documentElement.dataset.theme=t', theme)
        for focus in [False, True]:
            if focus:
                page.get_by_role('button', name='Фокус: включить режим концентрации', exact=True).click()
            for font in ['normal', 'large', 'huge']:
                page.evaluate('''font=>{const e=document.querySelector('.app-shell'); e.classList.remove('font-normal','font-large','font-huge');e.classList.add('font-'+font)}''', font)
                for width in [320, 375, 390, 768, 820, 1024, 1440, 1920]:
                    page.set_viewport_size({'width': width, 'height': 768 if width == 1024 else 1000})
                    row = page.evaluate('''() => {
                      const parent=document.querySelector('.practice-heading-row'),button=parent.querySelector('.back-link'),meta=parent.querySelector(':scope > span');
                      const range=document.createRange();range.selectNode([...button.childNodes].find(n=>n.nodeType===3&&n.textContent.trim()));const a=range.getBoundingClientRect();
                      range.selectNodeContents(meta);const b=range.getBoundingClientRect();
                      const br=button.getBoundingClientRect(),mr=meta.getBoundingClientRect(),pr=parent.getBoundingClientRect();
                      return {width:innerWidth,delta:Math.abs((a.top+a.bottom-b.top-b.bottom)/2),wrapped:mr.top>=br.bottom-1,overlap:mr.top<br.bottom&&mr.bottom>br.top&&mr.left<br.right&&mr.right>br.left,overflow:document.documentElement.scrollWidth>innerWidth,margin:getComputedStyle(button).marginBottom,gap:getComputedStyle(parent).columnGap,metaLeft:mr.left,parentLeft:pr.left};
                    }''')
                    row.update(theme=theme, focus=focus, font=font)
                    rows.append(row)
                    if args.phase == 'after':
                        assert row['wrapped'] or row['delta'] <= 1, row
                        assert not row['overlap'] and not row['overflow'], row
            if focus:
                page.get_by_role('button', name='Выйти из режима концентрации', exact=True).click()
    browser.close()
assert not errors, errors
Path('/workspace/scratch/heading-line-' + args.phase + '.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
print(json.dumps({'phase': args.phase, 'cases': len(rows), 'unwrappedMaxDelta': max(r['delta'] for r in rows if not r['wrapped']), 'errors': errors}))
