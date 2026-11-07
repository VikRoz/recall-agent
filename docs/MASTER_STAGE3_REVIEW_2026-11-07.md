# Проверка этапа 3 и допуск следующей offline-подготовки

Дата: 7 ноября 2026, Europe/Moscow.

## Цель

Принять frozen evaluation и проверить границы следующего real-admission increment без обращения к реальным аккаунтам.

## Исходные предпосылки

HEAD `5d1fc4f`, реализация `c34571b`; рабочее дерево перед проверкой чистое. Гипотеза первого задания принадлежит пользователю/протоколу. Старые live-лимиты исчерпаны; новый ключ не захвачен. У мастера есть прямое поручение пользователя утверждать обычные решения в рамках roadmap.

## Основные выводы

- Повторены 7/7 `app/agent.test.mjs`, frozen-evaluation verifier, source verifier (160 файлов на момент проверки) и diff check. Ошибок нет.
- Frozen evidence подтверждает два независимых процесса, 2 simulated Tatum batches / 2 writes / 2 recalls / 36 SDK requests и четыре отрицательных applicability controls плюс opt-out. Новых model/provider calls — ноль.
- Literal payer memory теперь ограничена exact digest/network/source/current observed payer/sponsorship class. Исправление устраняет реальную возможность неверного переноса адреса.
- Этап 3 принимается как подготовка и protocol evidence. Он не подтверждает собственную ошибку модели, причинную пользу памяти или реальную интеграцию ordinary-launcher.

## Self-review и решение

Утверждена только offline-реализация `ORDINARY_LIVE_ADMISSION_PROPOSAL_2026-11-07.md`: отдельный реальный режим с отличимым account-bound admission, reuse существующих адаптеров, стабильными namespaces/receipts и durable native permit максимум на два turns. Проверки выполняются на фиктивных профилях и перехваченных транспортах; реальный profile/key/model не читается и не вызывается.

Подмена fixture transport реальным без отдельного допуска отклонена: синтетическое разрешение открыло бы доступ к аккаунтам. Расширение старого seed-bound trial отклонено: изменило бы исторический контракт и связало запуск продукта с предписанной ошибкой. Fallback сохраняется, если проверяемый реальный запуск не готов вовремя.

Обязательные проверки: отказ до real factory при missing/stale/synthetic/mismatched approval; привязка native permit к frozen plan и общему счётчику; неизвестный retained journal блокирует новую run; default launcher offline; live facts source=tatum; endpoint/method/retry ограничения прежние; закрытие каналов и очистка только новой временной Tatum key при любом выходе. Старый Walrus profile и ledgers не удаляются и не переписываются.

## Разрешения и открытые вопросы

- Нового live-допуска, key capture, публикации или расхода этим решением нет. Предлагаемые 2 native turns / 2 Tatum attempts / 2 Walrus writes / 2 content reads / 64 service requests пока только границы будущего допуска; расходы $0.
- Прочитана только несекретная metadata `/private/tmp/recall-agent-next-key-destination.json`. Предложенный destination: `/private/var/folders/4w/fx7_g8fj6fx972rf_9yxjj140000gn/T/recall-agent-tatum-capture-ocrapurh/tatum.key`; source — существующий Mainnet key того же аккаунта на Tatum dashboard. Ключа пока нет. Прямое разрешение человека на перенос секрета необходимо непосредственно перед capture после готовности проверяемого real boundary.
- Состав полезных записей до десяти и возможность обоснованно учесть исторические записи остаются открыты. Восемь волн и восемь новых записей не утверждены.

## Источники

- `docs/ORDINARY_LIVE_ADMISSION_PROPOSAL_2026-11-07.md`, `docs/EVALUATION_PREPARATION_2026-11-07.md`, `docs/LIVE_GATES_DRAFT_2026-11-07.md`.
- `evidence/candidate-evaluation-2026-11-07/{plan,run}.json`, `evidence/verify-candidate-evaluation.mjs`.
- `app/agent-session.ts`, `app/agent.test.mjs`; фактические результаты независимых команд мастера и отчёт исполнителя.

Этот документ создан после source check; исполнитель включит его в manifest при следующем штатном обновлении. Мастер не выполнял commit, push, live-вызовы, публикацию или deployment.

## Приёмка завершённого этапа 4A

7 ноября мастер независимо повторил 12 managed-boundary tests и три Tatum tests: 15/15, fail/skip 0. `verify-ordinary-managed.mjs` подтвердил два независимых MCP-процесса, simulated Tatum2/writes2/reads2/SDK50, actual model/provider0; source verifier подтвердил 171 файл до этой записи, diff check прошёл. Полные 130 тестов — отдельно записанный результат исполнителя.

Offline 4A принят. Исполнителю разрешено сохранить проверенную реализацию в локальном commit и закрепить historical evidence pin; push/deployment не разрешались. Код и подготовленные live-plan/context hashes не меняются ради приёмки. Новый реальный grant и ключ отсутствуют. Перед конкретным вопросом человеку требуется закончить фиксацию revision и подтвердить неизменность подготовленного context. Ни эти offline-тесты, ни предстоящее согласие не разрешают превышать frozen лимиты.

Принята граница scope: evaluation runner на два native turns допустим только после отдельного live-допуска; интерактивный TUI этим grant не открывается. Первичный judge/user путь с собственными credentials остаётся непроверенным этапом 6, а не скрытой готовностью продукта.
