# 08 — Локальная разработка

Приложение (frontend + backend) запускается локально; DynamoDB, Cognito и S3 — **настоящие**, из окружения `dev` в AWS. Локальных эмуляторов БД нет.

## Требования

| Инструмент | Версия |
|---|---|
| PowerShell | 7+ (`pwsh`) |
| Go | 1.23+ |
| Node.js | 22 LTS (+ pnpm или npm) |
| Terraform | 1.10+ |
| AWS CLI | v2 |
| Docker Desktop | опционально — для проверки образа |

## 1. Доступ к AWS

Настроить профиль `chgk-dev` (предпочтительно IAM Identity Center / SSO):

```powershell
aws configure sso --profile chgk-dev
aws sso login --profile chgk-dev
aws sts get-caller-identity --profile chgk-dev
```

## 2. Инфраструктура dev (один раз и при изменениях)

```powershell
# только при первом запуске — бакет для state
./scripts/infra.ps1 -Env bootstrap -Action apply

# таблицы, Cognito, S3 media
./scripts/infra.ps1 -Env dev -Action apply
```

Скрипт после `apply` записывает outputs Terraform в `backend/.env.local` и `frontend/.env.local` (ID пула Cognito, клиента, имена таблиц и бакета).

## 3. Пользователи

```powershell
# создать пользователя и добавить в группу admin
./scripts/dev-user.ps1 -Email me@example.com -Groups admin,editor
```

## 4. Запуск

```powershell
./scripts/dev.ps1
```

Скрипт:

1. проверяет активную SSO-сессию (`aws sts get-caller-identity`);
2. генерирует код из `api/openapi.yaml` (Go и TS), если спецификация изменилась;
3. запускает backend (`go run ./cmd/api`, порт 8080) и frontend (`npm run dev`, порт 5173) параллельно.

Открыть http://localhost:5173.

## Переменные окружения

`backend/.env.local`:

```dotenv
APP_ENV=local
HTTP_ADDR=:8080
AWS_PROFILE=chgk-dev
AWS_REGION=eu-central-1
DDB_TABLE_PREFIX=chgk-dev
MEDIA_BUCKET=chgk-dev-media-<suffix>
COGNITO_USER_POOL_ID=eu-central-1_XXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXX
AUTH_DEV_BYPASS=false
LOG_LEVEL=debug
```

`frontend/.env.local`:

```dotenv
VITE_COGNITO_USER_POOL_ID=eu-central-1_XXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXX
VITE_AWS_REGION=eu-central-1
```

Файлы `.env.local` в `.gitignore`; в репозитории — `.env.example`.

## Данные для разработки

```powershell
# импорт нескольких турниров из db.chgk.info
go run ./backend/cmd/importer chgkdb --ids <id1>,<id2>

# или из файла
go run ./backend/cmd/importer file ./samples/tournament.txt
```

## Изоляция данных разработчиков

Если разработчиков несколько, каждый может поднять свой набор таблиц: `terraform apply -var "name_suffix=alice"` → `chgk-dev-alice-*`, и указать `DDB_TABLE_PREFIX=chgk-dev-alice`.

Интеграционные тесты создают временные таблицы с префиксом `chgk-test-<random>` и удаляют их по завершении.

## Проверка контейнера локально (опционально)

```powershell
docker compose up --build api
```

`compose.yaml` монтирует `~/.aws` только для чтения и передаёт `AWS_PROFILE` — контейнер работает с теми же dev-таблицами.

## Скрипты

| Скрипт | Назначение |
|---|---|
| `scripts/infra.ps1` | `terraform init/plan/apply` для окружения, экспорт outputs в `.env.local` |
| `scripts/dev.ps1` | Генерация кода + запуск backend и frontend |
| `scripts/dev-user.ps1` | Создание пользователя Cognito и назначение групп |
| `scripts/gen.ps1` | Генерация кода из OpenAPI |
| `scripts/lint.ps1` | `golangci-lint`, `eslint`, `tsc --noEmit` |
| `scripts/deploy.ps1` | Ручной деплой в prod |
