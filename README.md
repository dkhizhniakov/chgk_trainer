# ЧГК Тренажёр (chgk_trainer)

Веб-приложение для тренировки к «Что? Где? Когда?»: база вопросов, база знаний (люди, события, места, произведения, понятия) и режимы тренировки — игра на время, отыгрыш пакетов целиком, интервальное повторение.

## Стек

| Слой | Технологии |
|---|---|
| Frontend | React, TypeScript, Vite, MUI, material-react-table, TanStack Query, TanStack Store, TanStack Router, ESLint |
| Backend | Go, chi, aws-sdk-go-v2, oapi-codegen |
| База данных | Amazon DynamoDB (всегда, включая локальную разработку) |
| Аутентификация | Amazon Cognito |
| Инфраструктура | AWS (ECS Fargate, ALB, S3, CloudFront, ECR), Terraform |

## Документация

| Документ | Содержание |
|---|---|
| [01 — Продукт](docs/01-product.md) | Цели, функции, пользовательские сценарии, глоссарий ЧГК |
| [02 — Архитектура](docs/02-architecture.md) | Компоненты системы, локальный и облачный режимы |
| [03 — Модель данных](docs/03-data-model.md) | Таблицы DynamoDB, ключи, индексы, access patterns |
| [04 — API](docs/04-api.md) | REST API, контракт OpenAPI, ошибки, пагинация |
| [05 — Backend](docs/05-backend.md) | Структура Go-сервиса, слои, конфигурация |
| [06 — Frontend](docs/06-frontend.md) | Структура React-приложения, состояние, UI |
| [07 — Инфраструктура](docs/07-infrastructure.md) | Terraform-модули, окружения, деплой |
| [08 — Локальная разработка](docs/08-local-development.md) | Как запустить всё локально |
| [09 — Импорт вопросов](docs/09-import.md) | Импорт из db.chgk.info и файлов |
| [10 — Тренировки и повторение](docs/10-training.md) | Режимы тренировки, проверка ответов, алгоритм повторения |
| [11 — Roadmap](docs/11-roadmap.md) | Этапы разработки |
| [Решения (ADR)](docs/adr/README.md) | Журнал архитектурных решений |

## Структура репозитория (целевая)

```text
chgk_trainer/
├── api/                 # OpenAPI-спецификация — единый контракт frontend ↔ backend
├── backend/             # Go-сервис (API + CLI импорта)
├── frontend/            # React-приложение
├── infra/               # Terraform: модули и окружения
├── scripts/             # PowerShell-скрипты для локальной разработки и деплоя
└── docs/                # Документация
```

## Быстрый старт

См. [Локальная разработка](docs/08-local-development.md). Кратко:

```powershell
# 1. Поднять dev-ресурсы в AWS (DynamoDB + Cognito + S3 для медиа)
./scripts/infra.ps1 -Env dev -Action apply

# 2. Запустить backend и frontend
./scripts/dev.ps1
```