# 03 — Модель данных (DynamoDB)

## Принципы

- **Проектирование от access patterns**: сначала список запросов, затем ключи.
- **Три таблицы по доменам** (а не одна single-table) — см. [ADR-0003](adr/0003-dynamodb-tables.md):
  - `chgk-{env}-content` — турниры и вопросы;
  - `chgk-{env}-knowledge` — база знаний;
  - `chgk-{env}-userdata` — всё, что принадлежит пользователю.
- В каждой таблице одинаковая схема ключей: `PK`, `SK` (строки) + перегруженные индексы `GSI1PK/GSI1SK`, `GSI2PK/GSI2SK` (projection `ALL`, если не указано иное).
- Атрибут `type` в каждом элементе (`Tournament`, `Question`, `Entity`, …) — для десериализации и отладки.
- Идентификаторы — **ULID** (сортируемые по времени, без координации).
- Общие атрибуты: `createdAt`, `updatedAt` (ISO-8601 UTC), `createdBy` (Cognito `sub`), `version` (число, оптимистичная блокировка через condition expression).
- Режим оплаты — **on-demand**. В prod: PITR, deletion protection. TTL-атрибут — `expiresAt` (epoch seconds).
- Пагинация — `LastEvaluatedKey`, сериализованный в непрозрачный base64-курсор.

---

## Таблица `content`

### Элементы

| Сущность | PK | SK | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
|---|---|---|---|---|---|---|
| Турнир | `TOURNAMENT#<tid>` | `META` | `TOURNAMENTS` | `<playedAt>#<tid>` | — | — |
| Вопрос | `QUESTION#<qid>` | `META` | `TOURNAMENT#<tid>` | `Q#<tour:02>#<num:03>` | `POOL#<difficulty>` | `<rnd>` |
| Индекс-элемент (тег, автор, год) | `IDX#<kind>#<value>` | `QUESTION#<qid>` | — | — | — | — |
| Каталог тегов | `TAGS` | `<slug>` | — | — | — | — |
| Внешний источник | `SOURCE#<system>#<externalId>` | `META` | — | — | — | — |
| Задание импорта | `IMPORTJOB#<jobId>` | `META` | — | — | — | — |

`<kind>` ∈ `TAG`, `AUTHOR`, `YEAR`. `<rnd>` — случайная hex-строка (8 символов), назначается при записи.

### Атрибуты

**Турнир**: `title`, `playedAt` (дата), `editors[]`, `difficulty` (1–5, опц.), `tours[]` (`{number, title, editors[]}` — туров мало, храним внутри), `questionCount`, `source` (`{system, externalId, url}`), `license`/`notes`.

**Вопрос**: `tournamentId`, `tourNumber`, `number`, `text`, `handout` (`{text?, imageKey?}`), `answer`, `accepted[]` (зачёт), `rejected[]` (незачёт), `comment`, `sources[]`, `authors[]`, `tags[]`, `difficulty`, `rnd`, `stats` (`{plays, correct}` — глобальная статистика взятий в приложении).

**Задание импорта**: `status` (`running|done|failed`), `report`, `startedBy`, `expiresAt` (TTL 7 дней).

**Внешний источник**: `tournamentId` — нужен для идемпотентного импорта (conditional put `attribute_not_exists(PK)`).

### Access patterns

| # | Запрос | Реализация |
|---|---|---|
| C1 | Турнир по id | `GetItem PK=TOURNAMENT#tid, SK=META` |
| C2 | Список турниров по дате (новые сверху) | `Query GSI1 PK=TOURNAMENTS`, `ScanIndexForward=false`; фильтр по году — `GSI1SK begins_with <yyyy>` / `BETWEEN` |
| C3 | Вопросы турнира по порядку | `Query GSI1 PK=TOURNAMENT#tid, SK begins_with Q#` (параллельно с C1) |
| C4 | Вопрос по id | `GetItem PK=QUESTION#qid, SK=META` |
| C5 | Вопросы по тегу / автору / году | `Query PK=IDX#TAG#slug` → `BatchGetItem` вопросов |
| C6 | N случайных вопросов заданной сложности | `Query GSI2 PK=POOL#d, SK >= <random>`, `Limit=N`; если не хватило — дозапрос с начала диапазона |
| C7 | Проверка, импортирован ли внешний турнир | `GetItem PK=SOURCE#chgkdb#<id>` |
| C8 | Список тегов с количеством | `Query PK=TAGS` |

> [!NOTE]
> Комбинированные фильтры (тег + год + сложность) в MVP решаются так: выбирается самый селективный индекс (обычно тег), остальные условия применяются в Go после `BatchGetItem`. Для полноценного поиска — см. [ADR-0004](adr/0004-search.md).

Запись вопроса = транзакция: элемент вопроса + индекс-элементы (теги, авторы, год) + инкремент `questionCount` турнира и счётчиков тегов.

---

## Таблица `knowledge`

### Элементы

| Сущность | PK | SK | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
|---|---|---|---|---|---|---|
| Сущность | `ENTITY#<eid>` | `META` | `TYPE#<type>` | `<normName>` | `NAME#<prefix2>` | `<normName>#<eid>` |
| Алиас | `ENTITY#<eid>` | `ALIAS#<normAlias>` | — | — | `NAME#<prefix2>` | `<normAlias>#<eid>` |
| Факт | `ENTITY#<eid>` | `FACT#<fid>` | — | — | — | — |
| Связь (прямая) | `ENTITY#<a>` | `REL#<relType>#<b>` | — | — | — | — |
| Связь (обратная) | `ENTITY#<b>` | `RELINV#<relType>#<a>` | — | — | — | — |
| Связь с вопросом | `ENTITY#<eid>` | `QUESTION#<qid>` | `QUESTION#<qid>` | `ENTITY#<eid>` | — | — |

- `normName` — нормализованное имя: нижний регистр, `ё→е`, без диакритики и пунктуации.
- `prefix2` — первые 2 символа `normName` (шардирование для префиксного поиска).
- Прямая и обратная связи пишутся одной транзакцией.

### Атрибуты

**Сущность**: `entityType` (`person|event|place|work|organization|concept|other`), `name`, `summary` (markdown), `dates` (`{start?, end?, precision}` — например, годы жизни или даты события), `imageKey`, `links[]` (`{title, url}`), `factCount`, `questionCount`.

**Факт**: `text`, `prompt` (формулировка для лицевой стороны карточки повторения, опц.), `source` (`{title, url}`), `questionIds[]` (вопросы, где факт «сработал»).

**Связь**: `relType` (`authored`, `participated`, `located_in`, `related_to`, …), `note`; денормализованные `targetName`, `targetType` — чтобы рисовать список связей без доп. запросов.

**Связь с вопросом**: денормализованные `entityName`, `entityType`, `questionPreview`.

### Access patterns

| # | Запрос | Реализация |
|---|---|---|
| K1 | Карточка сущности целиком (meta, алиасы, факты, связи, вопросы) | `Query PK=ENTITY#eid` (с пагинацией по `SK begins_with QUESTION#` при большом числе вопросов) |
| K2 | Список сущностей типа по алфавиту | `Query GSI1 PK=TYPE#person` |
| K3 | Автодополнение по имени/алиасу | `Query GSI2 PK=NAME#<prefix2>, SK begins_with <normQuery>` |
| K4 | Сущности, связанные с вопросом | `Query GSI1 PK=QUESTION#qid` |
| K5 | Вопросы, связанные с сущностью | `Query PK=ENTITY#eid, SK begins_with QUESTION#` |
| K6 | Связи сущности | `Query PK=ENTITY#eid, SK begins_with REL` |

---

## Таблица `userdata`

Все элементы пользователя лежат в одной партиции `USER#<sub>` — данные изолированы, удаление аккаунта = удаление партиции.

### Элементы

| Сущность | PK | SK | GSI1PK | GSI1SK |
|---|---|---|---|---|
| Профиль и настройки | `USER#<sub>` | `PROFILE` | — | — |
| Сессия тренировки | `USER#<sub>` | `SESSION#<sessionUlid>` | — | — |
| Попытка ответа | `USER#<sub>` | `ATTEMPT#<sessionUlid>#<seq:03>` | `USER#<sub>#Q#<qid>` | `<answeredAt>` |
| Отметка «видел вопрос» | `USER#<sub>` | `SEEN#<qid>` | — | — |
| Карточка повторения | `USER#<sub>` | `CARD#<kind>#<refId>` | `USER#<sub>#DUE` | `<dueAt>#<kind>#<refId>` |
| Лог повторения | `USER#<sub>` | `REVIEW#<ulid>` | — | — |
| Агрегаты статистики | `USER#<sub>` | `STATS#<scope>` | — | — |
| Лучший результат по турниру | `USER#<sub>` | `TPLAY#<tid>` | — | — |
| Заметка | `USER#<sub>` | `NOTE#<kind>#<refId>` | — | — |

- `<kind>` для карточек и заметок: `Q` (вопрос) или `F` (факт; `refId = <eid>:<fid>`).
- `<scope>` статистики: `ALL`, `TAG#<slug>`, `DAY#<yyyy-mm-dd>`, `MONTH#<yyyy-mm>`. Обновляются атомарно `UpdateItem ADD plays :1, correct :x`.

### Атрибуты

**Сессия**: `mode` (`blitz|tournament|review`), `filters`, `tournamentId?`, `questionIds[]`, `status` (`active|finished|abandoned`), `startedAt`, `finishedAt`, `score` (`{correct, total}`), `timerSec`.

**Попытка**: `qid`, `answerText`, `autoVerdict` (`match|close|miss`), `verdict` (`correct|incorrect` — итоговое, после самопроверки), `timeMs`, `answeredAt`.

**Карточка (FSRS)**: `due`, `stability`, `difficulty`, `elapsedDays`, `scheduledDays`, `reps`, `lapses`, `state` (`new|learning|review|relearning`), `lastReview`, `suspended`.

**Лог повторения**: `cardKey`, `rating` (`again|hard|good|easy`), `reviewedAt`, снимок состояния до/после — для последующей оптимизации параметров FSRS. Опционально TTL 1 год.

### Access patterns

| # | Запрос | Реализация |
|---|---|---|
| U1 | Профиль | `GetItem PK=USER#sub, SK=PROFILE` |
| U2 | История сессий (новые сверху) | `Query PK=USER#sub, SK begins_with SESSION#`, `ScanIndexForward=false` |
| U3 | Попытки сессии | `Query PK=USER#sub, SK begins_with ATTEMPT#<sessionUlid>#` |
| U4 | История ответов на вопрос | `Query GSI1 PK=USER#sub#Q#qid` |
| U5 | Исключить уже виденные вопросы | `BatchGetItem SEEN#<qid>` для кандидатов из C6 |
| U6 | Очередь повторения на сегодня | `Query GSI1 PK=USER#sub#DUE, SK <= <now>#~` |
| U7 | Карточка по вопросу/факту (есть ли в повторении) | `GetItem SK=CARD#Q#qid` |
| U8 | Статистика за период / по тегам | `Query PK=USER#sub, SK BETWEEN STATS#DAY#from AND STATS#DAY#to` / `begins_with STATS#TAG#` |

> [!IMPORTANT]
> Приостановленные карточки (`suspended=true`) удаляют атрибуты `GSI1PK/GSI1SK` — тогда они выпадают из sparse-индекса очереди.

---

## Streams

На таблицах `content` и `knowledge` включается DynamoDB Streams (`NEW_AND_OLD_IMAGES`) — задел для инкрементального обновления поискового индекса (этап 2 в [ADR-0004](adr/0004-search.md)). До этого этапа стримы не потребляются.

## Миграции

Схема ключей фиксирована в Terraform; изменения формата элементов — через поле `schemaVersion` и ленивую миграцию при чтении либо одноразовые CLI-команды в `backend/cmd/migrate`.
