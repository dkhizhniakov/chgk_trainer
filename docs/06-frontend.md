# 06 — Frontend (React)

## Технологии

| Задача | Выбор |
|---|---|
| Сборка | Vite + TypeScript (strict) |
| UI-кит | MUI (`@mui/material`, `@mui/icons-material`), Emotion |
| Таблицы | `material-react-table` (поверх TanStack Table) |
| Серверное состояние | `@tanstack/react-query` |
| Клиентское состояние | `@tanstack/store` + `@tanstack/react-store` |
| Роутинг | `@tanstack/react-router` (file-based, типобезопасные параметры и search params) |
| API-клиент | `openapi-fetch` + типы из `openapi-typescript` |
| Формы | `react-hook-form` + `zod` |
| Аутентификация | `aws-amplify` (только модуль `auth`) |
| Локализация (i18n) | `i18next` + `react-i18next` + `i18next-browser-languagedetector` |
| Markdown | `react-markdown` (описания сущностей, комментарии) |
| Линт / формат | ESLint (flat config): `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@tanstack/eslint-plugin-query`, `eslint-plugin-import`; Prettier |
| Тесты | Vitest + Testing Library; e2e — Playwright (позже) |

## Структура

```text
frontend/
├── src/
│   ├── api/
│   │   ├── schema.d.ts       # сгенерировано из api/openapi.yaml
│   │   ├── client.ts         # openapi-fetch + подстановка токена + обработка problem+json
│   │   └── queries/          # queryOptions-фабрики и мутации по доменам
│   ├── auth/                 # Amplify config, AuthProvider, хуки useAuth/useRoles
│   ├── stores/               # TanStack Store: trainingStore, uiStore
│   ├── i18n/                 # Конфигурация i18n и словари переводов по неймспейсам
│   │   ├── index.ts          # Инициализация i18next, определение языка, маппинг MRT
│   │   └── locales/          # ru/, en/, etc. (common.json, dashboard.json, auth.json)
│   ├── routes/               # TanStack Router (file-based)
│   ├── features/
│   │   ├── questions/        # таблица, карточка, редактор вопроса
│   │   ├── tournaments/
│   │   ├── knowledge/        # список сущностей, карточка, граф связей
│   │   ├── training/         # блиц, отыгрыш пакета, экран результата
│   │   ├── review/           # очередь повторения
│   │   └── stats/
│   ├── components/           # общие компоненты (Timer, AnswerReveal, LanguageSelector…)
│   ├── theme/                # MUI-тема: светлая/тёмная, типографика
│   └── main.tsx
├── eslint.config.js
├── vite.config.ts            # proxy /api → http://localhost:8080
└── package.json
```

## Разделение состояния

| Тип состояния | Где | Примеры |
|---|---|---|
| Серверное | React Query | турниры, вопросы, сущности, очередь повторения, статистика |
| Клиентское, сквозное | TanStack Store | текущая тренировка (индекс, таймер, фаза), настройки UI (тема, плотность таблиц) |
| URL | TanStack Router search params | фильтры и сортировка таблиц, вкладки — чтобы ссылкой можно было поделиться |
| Локальное | `useState` | открытые диалоги, поля ввода |

### `trainingStore` (пример формы)

```ts
type TrainingPhase = 'reading' | 'thinking' | 'writing' | 'revealed' | 'finished';

interface TrainingState {
  sessionId: string | null;
  mode: 'blitz' | 'tournament' | 'review' | null;
  index: number;
  total: number;
  phase: TrainingPhase;
  deadline: number | null; // epoch ms окончания текущей фазы
  answerDraft: string;
}
```

Таймер считается от `deadline` (а не декрементом счётчика) — устойчиво к фоновым вкладкам. Состояние персистится в `sessionStorage`, чтобы перезагрузка страницы не обнуляла тренировку.

## React Query: соглашения

- Ключи и запросы описываются через `queryOptions()` в `api/queries/<domain>.ts`; компоненты используют фабрики, а не литералы ключей.
- Иерархия ключей: `['questions', 'list', filters]`, `['questions', 'detail', qid]` — инвалидация по префиксу.
- Курсорная пагинация: `useInfiniteQuery` (лента) или «страница = курсор» для таблиц (храним стек курсоров для кнопки «назад»).
- `staleTime`: контент — 5 мин, пользовательские данные — 0–30 с.
- Мутации инвалидируют затронутые ключи; для оценки карточки повторения — optimistic update.

## material-react-table

- Режим `manualPagination`, `manualFiltering`, `manualSorting` — данные приходят с сервера.
- Состояние таблицы (фильтры, сортировка, страница) синхронизируется с search params роутера.
- Только фильтры, которые поддерживает API (см. [04 — API](04-api.md)); остальные колонки — без фильтра.
- Общая обёртка `<DataTable>` с динамической локализацией (`getMrtLocalization(lang)`) и единым стилем.

## Локализация (i18n)

Приложение построено с поддержкой мультиязычности на стеке `i18next` + `react-i18next` + `i18next-browser-languagedetector`.

### Архитектура словарей

Словари разделены по неймспейсам для масштабируемости и удобства поддержки:
- `common` — общие элементы интерфейса, навигация, статусы, действия, роли;
- `dashboard` — дашборд, карточки инфоструктуры, заголовки секций;
- `auth` — формы входа, регистрации, подтверждения, валидационные сообщения;
- `questions`, `knowledge`, `training` — доменные модули.

Файловая структура:
```text
src/i18n/
├── index.ts                # Инициализация i18next, детекция языка, хелперы
└── locales/
    ├── ru/                 # Базовый язык
    │   ├── common.json
    │   ├── dashboard.json
    │   └── auth.json
    └── en/                 # Английский язык (шаблоны для будущего расширения)
        ├── common.json
        ├── dashboard.json
        └── auth.json
```

### Переключение языка и сохранение выбора

- Выбранный пользователем язык сохраняется в `localStorage` (ключ `chgk_language`).
- При первом входе язык определяется автоматически (браузер / локаль системы), с откатом на `ru`.
- Компонент `<LanguageSelector />` в `AppBar` позволяет сменить язык на лету без перезагрузки страницы.

### Интеграция с Material React Table

Для таблиц используется хелпер `getMrtLocalization(lang)`:
- При `ru` возвращается встроенный пакет локализации `MRT_Localization_RU` из `material-react-table/locales/ru/index.js`;
- При других языках возвращается `undefined` (MRT по умолчанию на английском) либо соответствующий языковой пакет MRT.

### Добавление нового языка

Чтобы добавить новый язык (например, `de`):
1. Создать каталог `src/i18n/locales/de/` с файлами `common.json`, `dashboard.json`, `auth.json` (скопировав из `en/` или `ru/`).
2. В `src/i18n/index.ts` импортировать файлы, добавить в объект `resources` и зарегистрировать в массиве `supportedLanguages`:
   ```ts
   { code: 'de', label: 'Deutsch', flag: '🇩🇪' }
   ```
3. При необходимости добавить пакет локализации таблицы в `getMrtLocalization(lang)`.

## Аутентификация

- Amplify Auth (Cognito, SRP): вход, регистрация, подтверждение email, сброс пароля — собственные формы на MUI.
- `client.ts` перед каждым запросом берёт актуальный access token (`fetchAuthSession()`), Amplify сам обновляет его по refresh token.
- Роли из `cognito:groups` управляют видимостью кнопок редактирования; реальная проверка — на сервере.
- Защищённые маршруты — через `beforeLoad` в TanStack Router.

## Экраны

| Маршрут | Экран |
|---|---|
| `/` | Дашборд: к повторению сегодня, быстрый старт блица, последние сессии |
| `/train/blitz` | Настройка и прохождение блица |
| `/train/tournament/$tid` | Отыгрыш пакета |
| `/review` | Очередь повторения |
| `/questions` | Таблица вопросов |
| `/questions/$qid` | Карточка вопроса |
| `/tournaments`, `/tournaments/$tid` | Турниры |
| `/knowledge`, `/knowledge/$eid` | База знаний |
| `/stats` | Статистика |
| `/admin/import` | Импорт (admin) |
| `/login`, `/signup` | Аутентификация |

## Дизайн

- Тёмная тема по умолчанию + светлая; акцентная палитра в стиле «зелёного сукна» ЧГК (тёмно-зелёный + золото).
- Шрифты: Inter (интерфейс), серифный (например, PT Serif) — для текста вопросов, ближе к печатному пакету.
- Экран тренировки — минималистичный, крупный текст, заметный таймер, горячие клавиши (`Enter` — ответить, `1/2` — верно/неверно, `Space` — показать ответ).
