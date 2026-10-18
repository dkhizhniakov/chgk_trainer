# Имена outputs используются в scripts/infra.ps1 для генерации .env.local.

output "aws_region" {
  value = var.aws_region
}

output "table_prefix" {
  value = local.name_prefix
}

output "tables" {
  value = module.dynamodb.table_names
}

output "media_bucket" {
  value = module.media.bucket_name
}

output "cognito_user_pool_id" {
  value = module.cognito.user_pool_id
}

output "cognito_client_id" {
  value = module.cognito.client_id
}

output "cognito_issuer" {
  value = module.cognito.issuer
}
