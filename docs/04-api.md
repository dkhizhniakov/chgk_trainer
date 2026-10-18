# 04 — API

## Принципы

- REST + JSON, префикс `/api/v1`.
- **Контракт — `api/openapi.yaml`** (OpenAPI 3.1), источник истины для обеих сторон:
  - Go: `oapi-codegen` генерирует типы и интерфейс strict-сервера (chi);
  - TypeScript: `openapi-typescript` генерирует типы, клиент — `openapi-fetch`.
- Изменение API = изменение `openapi.yaml` → регенерация → компилятор подсвечивает несоответствия.
- Поля в JSON — `camelCase`, даты — ISO-8601 UTC.
- Аутентификация — `Authorization: Bearer <Cognito access token>`. Публичен только `GET /api/health`.

## Пагинация

Курсорная (DynamoDB не умеет offset):

```http
GET /api/v1/tournaments?limit=50&cursor=eyJQSyI6...
```

```json
{ "items": [ ... ], "nextCursor": "eyJQSyI6...", "total": 1234 }
```

`total` возвращается, только если известен из счётчиков (например, `questionCount` турнира).

## Ошибки

Формат RFC 9457 (`application/problem+json`):

```json
{
  "type": "https://chgk-trainer/errors/validation",
  "title": "Validation failed",
  "status": 400,
  "detail": "answer must not be empty",
  "requestId": "01J...",
  "errors": [{ "field": "answer", "message": "required" }]
}
```

| Код | Когда |
|---|---|
| 400 | Невалидный запрос |
| 401 | Нет/невалидный токен |
| 403 | Недостаточно прав (нет группы `editor`/`admin`) |
| 404 | Не найдено |
| 409 | Конфликт версии (`version` не совпал) или дубликат при импорте |
| 429 | Превышен лимит запросов |
| 500 | Внутренняя ошибка |

## Эндпоинты

Роль: **P** — любой аутентифицированный игрок, **E** — editor, **A** — admin.

### Служебные

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/api/health` | — | Liveness для ALB |
| GET | `/api/v1/me` | P | Профиль, роли, настройки |
| PATCH | `/api/v1/me/settings` | P | Настройки (таймер, фильтры по умолчанию) |

### Турниры и вопросы

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/api/v1/tournaments` | P | Список (`year`, `cursor`, `limit`) |
| POST | `/api/v1/tournaments` | E | Создать |
| GET | `/api/v1/tournaments/{tid}` | P | Турнир + туры |
| PATCH | `/api/v1/tournaments/{tid}` | E | Изменить (с `version`) |
| DELETE | `/api/v1/tournaments/{tid}` | A | Удалить вместе с вопросами |
| GET | `/api/v1/tournaments/{tid}/questions` | P | Вопросы по порядку |
| GET | `/api/v1/questions` | P | Поиск/фильтрация (`tag`, `author`, `year`, `difficulty`, `cursor`) |
| POST | `/api/v1/questions` | E | Создать |
| GET | `/api/v1/questions/{qid}` | P | Вопрос + связанные сущности |
| PATCH | `/api/v1/questions/{qid}` | E | Изменить |
| DELETE | `/api/v1/questions/{qid}` | E | Удалить |
| GET | `/api/v1/tags` | P | Каталог тегов |
| POST | `/api/v1/media/upload-url` | E | Presigned PUT URL в S3 для раздатки/изображения |

### База знаний

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/api/v1/entities` | P | Список по типу (`type`, `cursor`) |
| GET | `/api/v1/entities/suggest?q=` | P | Автодополнение по имени и алиасам |
| POST | `/api/v1/entities` | E | Создать |
| GET | `/api/v1/entities/{eid}` | P | Карточка: факты, алиасы, связи, вопросы |
| PATCH | `/api/v1/entities/{eid}` | E | Изменить |
| DELETE | `/api/v1/entities/{eid}` | E | Удалить |
| POST | `/api/v1/entities/{eid}/facts` | E | Добавить факт |
| PATCH / DELETE | `/api/v1/entities/{eid}/facts/{fid}` | E | Изменить / удалить факт |
| PUT / DELETE | `/api/v1/entities/{eid}/relations/{relType}/{targetEid}` | E | Связать / отвязать сущности |
| PUT / DELETE | `/api/v1/entities/{eid}/questions/{qid}` | E | Связать / отвязать вопрос |

### Тренировки

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/api/v1/sessions` | P | Начать сессию: `{mode, filters?, tournamentId?, count?, timerSec?}` → сессия + первый вопрос (без ответа) |
| GET | `/api/v1/sessions` | P | История сессий |
| GET | `/api/v1/sessions/{sid}` | P | Сессия с попытками |
| GET | `/api/v1/sessions/{sid}/questions/{index}` | P | Вопрос сессии **без ответа** |
| POST | `/api/v1/sessions/{sid}/attempts` | P | Отправить ответ `{index, answerText, timeMs}` → `{autoVerdict, answer, accepted, comment, sources}` |
| PATCH | `/api/v1/sessions/{sid}/attempts/{index}` | P | Самопроверка: `{verdict}` — подтвердить/переопределить автоматический вердикт |
| POST | `/api/v1/sessions/{sid}/finish` | P | Завершить, получить итог |

> [!IMPORTANT]
> Ответ на вопрос отдаётся только после отправки попытки — так клиент не может «подсмотреть» его в сети во время таймера.

### Повторение

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/api/v1/review/queue?limit=` | P | Карточки к повторению на сейчас (+ новые по дневному лимиту) |
| GET | `/api/v1/review/summary` | P | Сколько к повторению сегодня/завтра, всего карточек |
| PUT | `/api/v1/review/cards/{kind}/{refId}` | P | Добавить вопрос/факт в повторение |
| DELETE | `/api/v1/review/cards/{kind}/{refId}` | P | Убрать из повторения |
| PATCH | `/api/v1/review/cards/{kind}/{refId}` | P | `{suspended}` — приостановить/возобновить |
| POST | `/api/v1/review/cards/{kind}/{refId}/grade` | P | Оценка `{rating}` → новое состояние и дата |

### Статистика и заметки

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/api/v1/stats/overview` | P | Общие показатели |
| GET | `/api/v1/stats/daily?from=&to=` | P | По дням |
| GET | `/api/v1/stats/tags` | P | По темам |
| PUT / DELETE | `/api/v1/notes/{kind}/{refId}` | P | Личная заметка к вопросу/факту |

### Импорт

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/api/v1/import/chgkdb` | A | `{tournamentRef}` — импорт турнира из db.chgk.info |
| POST | `/api/v1/import/file` | A | multipart: файл в формате 4s / JSON, режим `dryRun` |
| GET | `/api/v1/import/jobs/{jobId}` | A | Статус задания импорта |
