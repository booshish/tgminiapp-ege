"""Single physical taps, layering, keyboard-dismissal simulation and wide Plus dock.
Run against a production export; Chromium emulation is not a real Safari device.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get("TOCHKA_QA_BASE_URL", "http://127.0.0.1:3002/tgminiapp-ege").rstrip("/")
artifacts = Path(os.environ.get("TOCHKA_QA_ARTIFACTS", "/workspace/scratch/navigation-repair"))
artifacts.mkdir(parents=True, exist_ok=True)
errors, checks, measurements = [], [], []
scope = os.environ.get("TOCHKA_QA_SCOPE", "all")
themes = [os.environ["TOCHKA_QA_THEME"]] if "TOCHKA_QA_THEME" in os.environ else ["light", "dark"]
expect.set_options(timeout=15000)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    def goto(page, route=""):
        page.goto(base + "/" + route, wait_until="networkidle")
        page.locator('#main-content[aria-busy="false"]').wait_for()
        if ":3003" in base:
            # The development tools portal is not part of the production site.
            page.add_style_tag(content="nextjs-portal{display:none}")

    def tap(page, button):
        box = button.bounding_box()
        assert box and box["width"] >= 44 and box["height"] >= 44, box
        x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        assert button.evaluate("(b,p)=>b===document.elementFromPoint(...p)?.closest('button')", [x,y]), button.inner_text()
        page.touchscreen.tap(x, y)  # Not Locator.click/tap: never retries a swallowed action.

    def nav(page, label):
        return page.locator(".mobile-nav").get_by_role("button", name=label, exact=True)

    def closed(page):
        expect(page.locator(".navigation-dialog")).to_be_hidden()
        expect(nav(page,"Ещё")).to_have_attribute("aria-expanded", "false")
        assert page.evaluate("getComputedStyle(document.body).overflow!=='hidden' && !document.querySelector('main').inert")

    def has_route(page, route):
        page.wait_for_function("v=>location.hash.split('?')[0].split('/')[1]===v", arg=route)

    def set_theme(page, theme):
        goto(page, "#profile")
        page.get_by_role("button", name="Тёмная" if theme=="dark" else "Светлая", exact=True).click()
        page.get_by_role("button", name="Перейти на главную", exact=True).filter(visible=True).click()
        expect(page.locator("html")).to_have_attribute("data-theme",theme)

    def enter_task(page):
        goto(page, "#catalog?exam=ОГЭ&subject=math&mode=number")
        page.locator('[data-catalog-number="9"]').tap()
        expect(page.locator("#task-answer")).to_be_visible()
        return page.url

    for width in ([] if scope == "wide" else [320,375,390,430]):
        cfg = dict(p.devices["iPhone 13"])
        cfg["viewport"] = {"width":width,"height":844}
        for theme in themes:
            ctx = browser.new_context(**cfg)
            page = ctx.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            goto(page)
            set_theme(page,theme)
            expect(page.locator(".plus-dock")).to_have_count(0)
            expect(page.locator(".sidebar")).to_be_hidden()
            assert page.locator(".mobile-nav > button").all_text_contents() == ["Теория","Задания","Прогресс","Плюс","Ещё"]
            # Real menu layering: page descendants may never paint over a menu item.
            tap(page, nav(page,"Ещё"))
            expect(page.locator(".navigation-dialog")).to_be_visible()
            assert page.evaluate("document.querySelector('main').inert && getComputedStyle(document.querySelector('main')).overflow==='hidden' && document.body.style.overflow==='hidden'")
            for button in page.locator(".navigation-dialog nav button").all():
                button.scroll_into_view_if_needed()
                box=button.bounding_box()
                assert button.evaluate("(b,p)=>b===document.elementFromPoint(...p)?.closest('button')", [box["x"]+box["width"]/2,box["y"]+box["height"]/2])
            before = page.locator("main").evaluate("e=>e.scrollTop")
            page.mouse.wheel(0,700)
            assert page.locator("main").evaluate("e=>e.scrollTop") == before
            if width == 390:
                page.screenshot(path=str(artifacts/f"phone-menu-{theme}.png"))
                page.set_viewport_size({"width":844,"height":390})
                expect(page.locator(".mobile-nav")).to_be_visible()
                menu=page.locator(".navigation-dialog")
                menu.evaluate("e=>e.scrollTop=e.scrollHeight")
                assert menu.evaluate("e=>e.scrollTop>0 && e.scrollHeight>e.clientHeight")
                page.screenshot(path=str(artifacts/f"phone-landscape-{theme}.png"))
                page.set_viewport_size({"width":width,"height":844})
            tap(page, nav(page,"Ещё")); closed(page)
            expect(nav(page,"Ещё")).to_be_focused()
            for _ in range(3):
                tap(page,nav(page,"Ещё"));tap(page,nav(page,"Ещё"));closed(page)
            tap(page,nav(page,"Ещё"));page.touchscreen.tap(2,2);closed(page)
            tap(page,nav(page,"Ещё"));page.keyboard.press("Escape");closed(page)
            expect(nav(page,"Ещё")).to_be_focused()
            # Breakpoint transition must release inert/scroll locks and close the old layer.
            tap(page,nav(page,"Ещё"));page.set_viewport_size({"width":820,"height":1180})
            expect(page.locator(".navigation-dialog")).to_be_hidden()
            assert page.evaluate("document.body.style.overflow!=='hidden' && !document.querySelector('main').inert")
            page.set_viewport_size({"width":width,"height":844})
            # Every other tab is activated by exactly one real touch from Tasks.
            task_url=enter_task(page)
            for mode in ["По одному","Лента"]:
                for label,route in [("Теория","theory"),("Прогресс","progress"),("Плюс","premium"),("Ещё",None)]:
                    page.goto(task_url,wait_until="networkidle")
                    if ":3003" in base: page.add_style_tag(content="nextjs-portal{display:none}")
                    page.get_by_role("button",name="По одному",exact=True).click()
                    answer=page.locator("#task-answer")
                    answer.fill("137")
                    if label in ["Плюс","Ещё"]:
                        page.get_by_role("button",name="Выбрать тему",exact=False).click()
                    if mode=="Лента": page.get_by_role("button",name="Лента",exact=True).click()
                    else: answer.focus()
                    learning=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
                    tap(page,nav(page,label))
                    if route: has_route(page,route)
                    else:
                        expect(page.locator(".navigation-dialog")).to_be_visible()
                        tap(page,nav(page,"Ещё"));closed(page)
                    after=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
                    assert learning["game"]==after["game"] and learning["events"]==after["events"]
                    page.goto(task_url,wait_until="networkidle")
                    if ":3003" in base: page.add_style_tag(content="nextjs-portal{display:none}")
                    page.get_by_role("button",name="По одному",exact=True).click()
                    expect(page.locator("#task-answer")).to_have_value("137")
                    expect(page.locator(".task-verdict-correct,.task-verdict-incorrect")).to_have_count(0)
            # Deterministically simulate the layout shift caused by keyboard dismissal.
            answer=page.locator("#task-answer");answer.fill("137")
            page.evaluate("""()=>document.querySelector('#task-answer').addEventListener('blur',()=>{
                document.querySelector('.app-shell').style.setProperty('--phone-visible-height',(innerHeight+180)+'px');
            },{once:true})""")
            tap(page,nav(page,"Теория"));has_route(page,"theory")
            page.evaluate("document.querySelector('.app-shell').style.removeProperty('--phone-visible-height')")
            # Empty answers and already checked attempts also navigate without new events.
            page.goto(task_url,wait_until="networkidle")
            if ":3003" in base: page.add_style_tag(content="nextjs-portal{display:none}")
            page.locator("#task-answer").fill("")
            tap(page,nav(page,"Плюс"));has_route(page,"premium")
            page.goto(task_url,wait_until="networkidle")
            if ":3003" in base: page.add_style_tag(content="nextjs-portal{display:none}")
            page.locator("#task-answer").fill("137")
            page.get_by_role("button",name="Проверить ответ",exact=True).click()
            expect(page.locator(".task-verdict")).to_be_visible()
            checked=page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
            tap(page,nav(page,"Прогресс"));has_route(page,"progress")
            assert page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2')).events") == checked["events"]
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
            checks.append(f"phone {width}/{theme}: menu, lock, breakpoint, 8 task-tab taps, drafts/XP, keyboard simulation")
            ctx.close()

    # Wide dock uses the workspace, never an assumed fixed sidebar coordinate.
    for width,height in ([] if scope == "phone" else [(768,1024),(820,1180),(1180,820),(1366,768),(1920,1080)]):
        ctx=browser.new_context(viewport={"width":width,"height":height},has_touch=True)
        page=ctx.new_page();page.on("pageerror",lambda error:errors.append(str(error)))
        goto(page)
        for theme in themes:
            set_theme(page,theme)
            for state in ["expanded","hidden"]:
                if page.locator(".app-shell").get_attribute("data-sidebar") != state:
                    tap(page,page.get_by_role("button",name="Меню",exact=True))
                    page.wait_for_timeout(220)
                expect(page.locator(".mobile-nav")).to_be_hidden()
                dock=page.locator(".plus-dock");expect(dock).to_be_visible()
                expect(dock).to_contain_text("7 дней бесплатно")
                assert dock.get_by_role("button").count()==2
                m=page.evaluate("""()=>{
                    const d=document.querySelector('.plus-dock'),r=d.getBoundingClientRect(),w=document.querySelector('.workspace').getBoundingClientRect(),main=document.querySelector('main').getBoundingClientRect();
                    return {x:r.x,right:r.right,width:r.width,height:r.height,workspaceX:w.x,workspaceRight:w.right,mainBottom:main.bottom,top:r.top,gradient:getComputedStyle(d).backgroundImage,overflow:document.documentElement.scrollWidth>innerWidth};
                }""")
                assert m["x"]>=m["workspaceX"] and m["right"]<=m["workspaceRight"]+1 and m["mainBottom"]<=m["top"] and not m["overflow"],m
                assert "linear-gradient" in m["gradient"] and m["height"] <= 72,m
                measurements.append(dict(viewport=[width,height],theme=theme,sidebar=state,**m))
                if width in [820,1366] and state=="expanded": page.screenshot(path=str(artifacts/f"wide-{width}-{theme}.png"))
        tap(page,page.get_by_role("button",name="Скрыть предложение Плюса на эту сессию",exact=True))
        expect(page.locator(".plus-dock")).to_have_count(0)
        page.reload(wait_until="networkidle");expect(page.locator(".plus-dock")).to_have_count(0)
        checks.append(f"wide {width}: dock layout, themes, sidebar, dismissal")
        ctx.close()
    browser.close()

assert not errors,errors
result={"checks":checks,"measurements":measurements,"browserErrors":errors,"realSafari":False,"realOnscreenKeyboard":False}
(artifacts/f"results-{scope}.json").write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False))
