"""Browser QA on the production export using actual immutable release records."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
base = os.environ.get('TOCHKA_QA_BASE_URL', 'http://127.0.0.1:3002/tgminiapp-ege').rstrip('/')
release = json.loads((root/'docs/profile-math-release.json').read_text())
taxonomy = json.loads((root/'docs/task-classification-map.json').read_text())
classes = {r['taskId']: r for r in taxonomy['records']}
tasks = [t for path in (root/'public/task-packages').glob('*.json') for t in json.loads(path.read_text()) if t['id'] in set(release['approvedIds'])]
families = {}
for task in tasks:
    families.setdefault(classes[task['id']]['subtypeId'], []).append(task)
assert len(tasks) == 2036 and len(families) == 41
checks, errors = [], []


def url(task, filters=''):
    return f"{base}/#tasks?exam=ЕГЭ&subject=math&level=profile&mode=number&number={task['examNumber']}&task={task['id']}{filters}"


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1024, 'height': 800})
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    requests = []
    page.on('request', lambda request: requests.append(request.url) if '/task-packages/' in request.url else None)
    page.goto(base+'/#catalog?exam=ЕГЭ&subject=math&level=profile&mode=number', wait_until='networkidle')
    expect(page.locator('[data-catalog-number]')).to_have_count(20)
    assert not requests
    for before in release['before']:
        number = before['number']
        count = before['count'] + sum(t['examNumber'] == number for t in tasks)
        card = page.locator(f'[data-catalog-number="{number}"]')
        expect(card).to_be_enabled()
        expect(card).to_contain_text(f'Задач: {count}')
    checks.append('all_20_catalogue_counts_match_2234_actual_tasks_no_background_shard_fetch')

    sample = next(t for t in tasks if classes[t['id']]['subtypeId'] == 'math-subtype-two-point-variance')
    c = classes[sample['id']]
    filters = f"&subtypeId={c['subtypeId']}&taxonomyTopicId={c['topicId']}&subtopicId={c['subtopicId']}&sourceCategoryId=tochka-original"
    page.goto(url(sample, filters), wait_until='networkidle')
    expect(page.locator('.task-prompt')).to_have_text(sample['prompt'])
    assert len(requests) == 1 and 'n6-' in requests[0], requests
    stored = page.evaluate("JSON.parse(localStorage.getItem('tochka-practice-v1'))")
    selected = stored['sessions'][stored['activeId']]
    expected = {t['id'] for t in tasks if classes[t['id']]['subtypeId'] == c['subtypeId']}
    assert set(selected['taskIds']) == expected
    checks.append('four_composed_filters_exact_new_subtype_fetch_only_its_number')

    checked_samples = 0
    for group in families.values():
        # First and last of each family, including fractional/negative keys and all extended types.
        endpoints = [group[0]] if os.environ.get('TOCHKA_QA_ONE_PER_FAMILY') == '1' else [group[0], group[-1]]
        for task in {t['id']: t for t in endpoints}.values():
            page.goto(url(task), wait_until='networkidle')
            expect(page.locator('.task-prompt')).to_have_text(task['prompt'])
            expect(page.locator('.katex-error')).to_have_count(0)
            if task['part'] == 1:
                page.locator('#task-answer').fill(task['answerDisplay'])
                page.get_by_role('button', name='Проверить ответ', exact=True).click()
                expect(page.locator('.task-verdict-correct')).to_be_visible()
                page.get_by_role('button', name='Посмотреть решение', exact=True).click()
            else:
                page.locator('#self-work').fill('Сохранённый собственный черновик решения')
                page.get_by_role('button', name='Проверить самостоятельно', exact=True).click()
                expect(page.locator('#self-work-help')).to_contain_text('не проверяется автоматически')
            expect(page.locator('#task-solution')).to_contain_text(task['solution'][-1]['text'])
            expect(page.locator('#task-solution')).to_contain_text(task['answerDisplay'])
            checked_samples += 1
    checks.append('real_samples_all_41_subtypes_render_check_and_show_complete_solutions_no_fake_automatic_essays')

    sample = next(t for t in tasks if t['examNumber'] == 17)
    page.goto(url(sample), wait_until='networkidle')
    page.locator('#self-work').fill('Моя модель: проверяю допустимость и максимум.')
    page.get_by_role('button', name='Сохранить в избранное', exact=True).click()
    reveal = page.get_by_role('button', name='Проверить самостоятельно', exact=True)
    if reveal.is_visible():
        reveal.click()
    expect(page.locator('#task-solution')).to_contain_text('2 балла самопроверки')
    ledger = page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
    page.reload(wait_until='networkidle')
    expect(page.locator('#self-work')).to_have_value('Моя модель: проверяю допустимость и максимум.')
    expect(page.get_by_role('button', name='В избранном — убрать', exact=True)).to_have_attribute('aria-pressed', 'true')
    restored = page.evaluate("JSON.parse(localStorage.getItem('tochka-learning-v2'))")
    # lastTaskIndex is a legacy ordinal cache and can change when saved shards
    # load in a different order. Stable task ID/draft above and ledger below must not.
    assert restored['events'] == ledger['events']
    assert restored['game'] == ledger['game']
    checks.append('number17_draft_bookmark_review_notes_survive_reload_without_XP_or_streak_mutations')
    for number in [6, 7, 8, 13, 15, 17, 19]:
        sample = next(t for t in tasks if t['examNumber'] == number)
        page.goto(url(sample), wait_until='networkidle')
        for width in [320, 390, 430, 768, 1024, 1440]:
            page.set_viewport_size({'width': width, 'height': 850})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (number, width)
    checks.append('new_formulas_and_extended_texts_fit_320_390_430_768_1024_1440_no_page_overflow')
    assert not errors, errors
    browser.close()
print(json.dumps({'passed': checks, 'samples': checked_samples, 'published_records_in_export': len(tasks), 'page_errors': errors}, ensure_ascii=False))
