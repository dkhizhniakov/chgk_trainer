# ADR-0002: Go API в ECS Fargate за ALB, без NAT

**Статус**: принято

## Контекст

Рассматривались Lambda + API Gateway, App Runner и ECS Fargate. Выбран постоянно работающий контейнер.

## Решение

- Backend — Docker-образ (linux/arm64) в ECS Fargate, за Application Load Balancer.
- CloudFront — единая точка входа: SPA, `/api/*` → ALB, `/media/*` → S3.
- Задачи в публичных подсетях с публичным IP; входящий трафик только от SG ALB. NAT Gateway не используется; DynamoDB и S3 — через Gateway VPC Endpoints.

## Последствия

- (+) Обычный долгоживущий HTTP-сервер: in-memory кэши, фоновые задачи (импорт), в будущем — WebSocket и встроенный поисковый индекс.
- (+) Нет холодных стартов; локальный запуск идентичен продовому.
- (+) Экономия ~$35/мес на NAT.
- (−) Базовая стоимость ALB + Fargate (~$40–50/мес) даже без нагрузки.
- (−) Публичный IP у задачи — нужно следить за security group (только ALB).
