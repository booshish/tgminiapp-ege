# Восстановление телефонной навигации — 03.11.2026

База c42f14b. Источник прежнего компонента: StudyApp из 86f6536, `.mobile-nav`, массив navigation и маршруты существующего open(). Прежний порядок был Главная/Теория/Задания/Прогресс/Ещё; по новому ТЗ удалена Главная и добавлен Плюс перед Ещё. Итог: **Теория → Задания → Прогресс → Плюс → Ещё**. More восстановлен в прежнем порядке: Мои ошибки, Избранное, Учебный вариант, Профиль, Мой тренер, помощь. Не создан второй router/банк/движок навигации.

Причина: предыдущий релиз удалил отдельную bottom-nav и применил общий footer offer к телефону. Кроме того, один width-breakpoint 767 трактовал широкий phone landscape как tablet с боковым отступом. Теперь StudyApp использует navigation-режим существующего usePhoneLayout. Решение централизовано в phoneNavigationLayout: ширина<=767 либо короткий coarse-viewport <=1023×500 на физическом экране с короткой стороной<=767. Последнее условие не даёт экранной клавиатуре iPad превратить нормальный планшетный viewport в phone. UA не используется. Остальные content-вызовы usePhoneLayout() сохраняют прежний breakpoint.

| Viewport / screen | Навигация |
|---|---|
| 320×700, 375×812, 390×844, 430×932, 393×851 | Phone tabs, без sidebar/offer |
| 844×390, screen390×844 | Phone landscape, без sidebar/offer |
| 820×1180 / 1180×820 | Прежний tablet sidebar + free offer |
| 820×360 при screen820×1180 (keyboard model) | Tablet, не phone |
| 1440×900 | Прежний desktop sidebar + free offer |

`data-navigation-layout` управляет видимостью. Desktop-кнопка скрыта на phone, вместо неё старый More-триггер bottom-nav открывает существующий drawer. На wide нижняя навигация display:none и недоступна для касаний/скринридера; на phone sidebar display:none, рабочий margin-left0. JS policy запрещает Plus dock на phone для обоих уровней доступа, включая резервирование во время ввода: нет даже его DOM/пустой рекламной строки. Desktop binary toggle, сохранённый выбор, sidebar-группы и ширина dock не откатывались.

Nav — отдельная flex-строка существующего viewport workspace, а не fixed-overlay. Main прокручивается выше неё. Сохранены safe-area padding, центр иконки/текста, active, touch-target>=44, pointer-events:none у дочерних декоративных элементов. Drawer заканчивается у реальной верхней границы nav по измеренной --phone-nav-height, поэтому More остаётся доступен для закрытия одним тапом. В фокусе bar скрыт как в прежнем интерфейсе, при выходе возвращается. Состояния задач не зависят от layout.

Phone workspace отслеживает visualViewport.height при scale1 (не подменяет pinch zoom); resize обрабатывается CSS-переменной без React-рендера на каждом кадре. Нет принудительного изменения высоты на blur: она следует реальному viewport. Очистка listener/переменной при выходе из phone. Min-height старого focus viewport локально снят на phone, иначе keyboard-sized высота была бы заблокирована. Tablet не затронут.

## Плюс и границы реализации

Вкладка Плюс рендерится независимо от isPremium и всегда ведёт на существующий premium-route. Free видит прежние преимущества/7 дней, active — прежнюю member-ветку с переходом к управлению в профиле. На phone скрыты повторяющиеся disabled CTA трёх планов, осталась одна кнопка подключения в trial-карточке; wide-вид и цены сохранены.

**Реальная активация пробы остаётся недоступной:** прежняя страница прямо говорит, что оплаты, аккаунты и trusted server subscription adapter не подключены. Единственная кнопка по-прежнему disabled; новый UI не выдаёт локальный флаг за покупку и не запускает фиктивные 7 суток. Логика подписок/проверки права на пробу не менялась. Реальный browser-тест оплаченного аккаунта невозможен в текущем проекте. Unit-проверки политики выполняются для premium=false/true, сохранены тесты модели server SubscriptionRecord/active/trial/expired и отсутствия покупки в active карточке; серверная интеграция и настоящие покупки не объявляются готовыми.

## Проверки

Целевые unit: 16/16. Полный npm test: 470/470, failed/skipped0; lint и typecheck успешны. Финальный build:pages успешен. После CSS min-height-уточнения для focus+keyboard повторена только сборка/затронутые браузерные сценарии. Первый browser старт до измерений обнаружил незапущенный локальный static server; он запущен, зависимости/кеши не пересоздавались.

Новый phone browser: 12 сочетаний размеров/темы; реальные touch возле границ вкладок, повторные переходы, одно active-состояние, старый More-порядок, логотип, отсутствие dock и desktop menu, 7 дней/одна недоступная CTA, draft/reload/direct route, phone→tablet→phone в той же сессии, focus. Управляемый visualViewport300px проверяет расположение nav, возможность прокрутить ответ выше неё и focus при оставшейся keyboard geometry. Это НЕ реальная экранная клавиатура.

Wide regression: 6 tablet/desktop сочетаний, sidebar open/hidden/reload, logo, offer width и отсутствие перекрытия, сохранения/фокус. Прежние practice modes: 9 групп/all10 направлений, lazy feed/TSV, XP/self-check. Taps regression: 8 ширин/2 темы, header alignment, single tap/focus/черновики. Все финальные browser проверки — pass, pageErrors0. Screenshots: /workspace/scratch/mobile-tabs-light.png и mobile-tabs-dark.png.

Физические Safari/iPhone/iPad/Android не доступны; Chromium touch/mobile эмуляция, screen/viewport соответствуют указанной модели. Тестирование настоящего Safari и клавиатуры остаётся этапом device QA. Банк, taskId, ответы, XP, прогресс и hooks попыток не менялись (git diff к базе пустой). Новых заданий нет.

В финальной phone/wide QA тема выбирается через реальные настройки профиля, а не только временный data-theme; после reload проверяется сохранённая тема. Отдельно выполнен один touch по Плюсу при сфокусированном ответе и управляемом keyboard viewport, затем browser Back: возвращается тот же черновик. После уточнения этих сценариев повторены только соответствующие браузерные тесты, production-код не менялся.

Изменены: StudyApp, use-phone-layout.ts, navigation-layout.ts/navigation-release.css, только метки disabled CTA в PremiumScreen; тесты navigation policy/mobile layout/wide browser и новый test-browser-mobile-tabs.py. Публикация фиксируется после native Pages.

Публикация подтверждена: source 53c53d7ac834c38e164e3613d9682b519ca298b1, gh-pages 58ffe860b827c0c0a5c315a21f9e63d9dca3ea2f, tree 112c80cd4bbee3934f737228e6373bfc2d357b75. [Native Pages 41701451068](https://github.com/booshish/tgminiapp-ege/actions/runs/41701451068) completed/success. Конфигурация Pages/Actions не менялась. Remote browser smoke github.io ограничен сетевой политикой; точный локальный export проверен отдельно от успешного branch deploy.
