# Навигация и единое предложение Плюса — 03.11.2026

База: 86f6536. Банк, taskId, ответы, модели, hooks попыток/черновиков и XP не менялись.

## Причина и реализация

Старое desktop-управление имело compact/expanded/hidden и две разные кнопки (смена compact/expanded и отдельное скрытие). Phone More имел другой порядок/набор ссылок и отдельный нижний триггер. Теперь один видимый кнопочный переключатель «Меню» в topbar. Desktop переключает только expanded/hidden, сохраняет прежний ключ tochka-sidebar-v1. Legacy compact мигрирует в expanded, hidden сохраняется. Фокус не меняет этот выбор; CSS временно скрывает sidebar и после выхода восстанавливает его. Drawer закрывается при навигации, смене breakpoint и входе в фокус.

Общий список: Учёба → Задания, Теория, Конспекты; Развитие → Мой тренер, Мои ошибки; Аккаунт → Профиль. Логотип с aria-label «Перейти на главную» и title «На главную» доступен в sidebar или topbar при скрытом меню. Главная/Плюс больше не являются пунктами меню; помощь остаётся через профиль, варианты/закладки/повторение — через существующие страницы. Маршруты не удалялись.

На телефоне используется прежний dialog как non-modal drawer (`show()`, aria-modal=false), а не новая система навигации. Это оставляет единственную кнопку в header интерактивной для закрытия: нет modal inert-слоя, который блокировал бы эту кнопку. Escape закрывает drawer и возвращает фокус переключателю. Дополнительная кнопка закрытия и нижняя More-навигация удалены; все строки имеют текст, min44px, hover/active/focus, current-marker с pointer-events:none. Верх drawer привязан к реально измеренной высоте topbar, не к координате под один скриншот.

## Нижний блок без перекрытия

Удалены две одинаковые покупки на Home и пункт Плюс. Единственный нижний блок находится в отдельной flex-строке workspace. Workspace высотой100dvh состоит из topbar, прокручиваемого main-content (flex1/min-height0/overflow:auto) и предложения (flex0). Поэтому никакие фиксированные overlay/спейсеры не закрывают середину длинного задания: bottom main совпадает с top dock. Ширина следует за тем же workspace, который отступает от sidebar; используется существующий --sidebar-width и анимация margin-left, нет отдельного расчёта left для рекламы. Safe-area учтена в padding самого блока. При увеличенном/узком тексте высота растёт без обрезания; measured desktop/tablet ~72.5px, phones320/390 ~78.2px без физического safe-area. Это не искусственное ограничение max-height72.

Во время редактирования предложение скрыто (visibility:hidden, inert и aria-hidden), но его строка сохраняет место. Ранний fixed-вариант с исчезающим padding воспроизвёл потерю первого клика «Вернуться в ленту»: blur менял высоту страницы между down/click. Он НЕ опубликован; flex-строка и сохранение места устранили регрессию без pointerdown-хаков и повторных кликов. В фокусе, при открытом drawer, на premium/profile/trainer/progress/review блок не рендерится. Контекстный paywall остаётся единственным предложением на своей странице. Закрытие сохраняется в sessionStorage tochka-plus-dismissed-v1, в новой сессии предложение снова появляется. При недоступном storage остаётся in-memory закрытие.

Main — существующий именованный scroll-контейнер: имеющиеся capture/restore уже отслеживали main и ancestors. Новые схемы сохранений не нужны. Регрессии подтверждают позицию ленты после reload и переходов, фильтры, самопроверку, отсутствие повторного XP. У sticky-выхода фокуса inset0 относительно нового main-scrollport; safe-area вынесена наружу scrollport, чтобы не удваивать прежний window-inset и не опускать кнопку ниже первого ряда. Размер/содержимое банка не менялись.

## Подписка: подтверждённые границы

В текущем StudyApp isPremium по-прежнему получается ТОЛЬКО из разрешённого developer preview, а SubscriptionStatusCard прямо документирует отсутствие trusted server adapter. Не добавлялись локальные «оплаты», доверие localStorage или новые права. Политика показа принимает существующий isPremium: реклама отсутствует при true, планы на прямой premium-ссылке заменяются переходом к профилю, CTA «Подключить Плюс» не показывается у активного/expiring серверного record в существующей карточке и у developer preview. Статусы/сроки/ценовые идентификаторы не изменялись.

РЕАЛЬНЫЕ after-purchase entitlement, управление оплатой и синхронизация между устройствами остаются заблокированы отсутствующим серверным адаптером. Тренер при preview показывает существующие рабочие рекомендации/интервалы, но полноценная диагностика/персональный план уже раньше были помечены разработкой. Это не было заменено фиктивным «готовым» платным сервисом. Browser-тест настоящего платного пользователя не заявляется; unit проверяет premium-policy и настоящую модель server SubscriptionRecord в изолированных fixture.

## Проверки

Целевые: 14/14 (navigation policy, общая структура шести пунктов, subscription UI). Полный npm test: 468/468, failed/skipped0. После найденной UI-регрессии повторены затронутые target/lint/typecheck/build и браузерные проверки. Один ранний параллельный typecheck столкнулся с пересозданием .next/types; окончательные lint → typecheck → build выполнены последовательно и прошли. Ошибки не подавлялись, зависимости не переустанавливались.

Production Chromium: 12 сочетаний темы/viewport (320×1000,390×1000,820×1180,1180×820,1440×900,844×390); по три пары одиночных переключений, 6 строк/размеры, логотип, footer bounds, reload hidden, Escape, drawer auto-close при выборе/фокусе, сессия закрытия, сохранённый ввод. Footer/main не пересекаются. Отдельный taps — 8 ширин, две темы, enlarged fonts/CSS zoom из прежнего набора, focus geometry и реальные main-scroll переходы. Practice modes — 9 групп, все10 направлений, файлы, bounded feed, reload, XP, self-check. Все финальные browser checks — pass/pageErrors0. JSON размеров: /workspace/scratch/navigation-dock-measurements.json.

Физический Safari/iPad/экранная клавиатура не доступны: проверен Chromium с touch и мобильной эмуляцией. Широкий landscape следует существующему viewport breakpoint; не утверждается аппаратное определение iPhone. Прямой remote browser smoke github.io ограничен сетевой политикой; проверяется точный локальный export и native Pages отдельно.

Изменены: StudyApp, HomeScreen, SubscriptionStatusCard; новые navigation-release.css и presentation policy navigation-layout.ts; обновлены test-mobile-learning-layout.mjs/test-subscription-ui.mjs/test-browser-practice-taps.py, добавлены test-navigation-release.mjs и test-browser-navigation-release.py. Этот документ — контрольная точка. Дальнейшая работа по реальным платным пользователям начинается с trusted server subscription adapter, а не с client-side grant.

## Публикация подтверждена

Source: 108ea81e01a93afe0b5b456e224424f3890ca026 в main. Точный проверенный export: gh-pages 0c2a5269d816b517827d488b366a3292002fc22c, tree 14e7838426e489c2cf88f80be899dcc203b9b54c. [Native Pages 41690731035](https://github.com/booshish/tgminiapp-ege/actions/runs/41690731035): completed/success, build/deploy/report-build-status — success. Конфигурация Actions и Pages не менялась. Это публикация UI/layout, не запуск настоящих платежей и не проверка физического Safari.
