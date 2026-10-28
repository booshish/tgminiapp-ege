from playwright.sync_api import sync_playwright, expect
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page()
    base='http://127.0.0.1:3002/tgminiapp-ege/'
    for exam,count in [('ОГЭ',6),('ЕГЭ',3)]:
        page.goto(base+f'#catalog?exam={exam}&subject=math&mode=number',wait_until='networkidle')
        select=page.locator('select').filter(has=page.locator('option[value="math"]')).first
        expect(select.locator('option')).to_have_count(count)
    for exam,subject in [('ОГЭ','physics'),('ЕГЭ','chemistry'),('ЕГЭ','biology'),('ЕГЭ','history'),('ЕГЭ','english')]:
        page.goto(base+f'#catalog?exam={exam}&subject={subject}&mode=number',wait_until='networkidle')
        expect(page.get_by_role('heading',name='Направление временно недоступно')).to_be_visible()
        page.get_by_role('button',name='Выбрать направление',exact=True).click()
        expect(page.locator('[data-catalog-number="1"]')).to_be_visible()
    page.goto(base+'#catalog?exam=ОГЭ&subject=math&mode=number',wait_until='networkidle')
    page.locator('[data-catalog-number="6"]').click()
    page.locator('#task-answer').fill('87')
    saved=page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    page.goto('about:blank')
    page.add_init_script("""if(location.protocol.startsWith('http') && !sessionStorage.getItem('legacy-choice-seeded')) {let s=JSON.parse(localStorage.getItem('tochka-practice-v1'));s.catalog.subjectId='physics';localStorage.setItem('tochka-practice-v1',JSON.stringify(s));sessionStorage.setItem('legacy-choice-seeded','1');} """)
    page.goto(base+'#catalog',wait_until='networkidle')
    expect(page.get_by_role('heading',name='Направление временно недоступно')).to_be_visible()
    page.get_by_role('button',name='Выбрать направление',exact=True).click()
    expect(page.locator('[data-catalog-number="1"]')).to_be_visible()
    restored=page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    assert restored['taskStates']==saved['taskStates']
    assert set(restored['sessions'])==set(saved['sessions'])
    browser.close()
print('Passed: 6 OGE / 3 EGE subjects (4 EGE directions with math levels), hidden/planned links and return to active catalogue')
