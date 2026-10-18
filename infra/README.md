# Infra

Terraform для chgk_trainer. Подробности — [docs/07-infrastructure.md](../docs/07-infrastructure.md).

```text
infra/
├── bootstrap/        # S3-бакет для state (локальный state, запускается один раз)
├── modules/
│   ├── dynamodb/     # таблицы content, knowledge, userdata
│   ├── cognito/      # user pool, SPA client, группы admin/editor
│   └── media/        # приватный S3-бакет для изображений
└── envs/
    └── dev/          # ресурсы для локальной разработки
```

Запуск — только через [`scripts/infra.ps1`](../scripts/infra.ps1): он вычисляет имя state-бакета (`chgk-tfstate-<account_id>`), передаёт backend-config и после `apply` пишет `.env.local` для backend и frontend.

```powershell
./scripts/infra.ps1 -Env bootstrap -Action apply   # один раз
./scripts/infra.ps1 -Env dev -Action plan
./scripts/infra.ps1 -Env dev -Action apply
```

> `infra/bootstrap/terraform.tfstate` хранится локально и не коммитится. Если он потерян — бакет можно импортировать обратно: `terraform -chdir=infra/bootstrap import aws_s3_bucket.state chgk-tfstate-<account_id>`.
