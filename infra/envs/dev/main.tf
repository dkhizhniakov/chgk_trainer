variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "name_suffix" {
  description = "Опциональный суффикс для персонального набора ресурсов (chgk-dev-<suffix>-*)."
  type        = string
  default     = ""
}

variable "local_origins" {
  description = "Origins локального frontend (CORS для S3 presigned upload)."
  type        = list(string)
  default     = ["http://localhost:5173"]
}

locals {
  name_prefix = var.name_suffix == "" ? "chgk-dev" : "chgk-dev-${var.name_suffix}"
}

module "dynamodb" {
  source = "../../modules/dynamodb"

  name_prefix            = local.name_prefix
  point_in_time_recovery = false
  deletion_protection    = false
}

module "cognito" {
  source = "../../modules/cognito"

  name_prefix         = local.name_prefix
  deletion_protection = false
  allow_password_auth = true
}

module "media" {
  source = "../../modules/media"

  name_prefix          = local.name_prefix
  cors_allowed_origins = var.local_origins
  force_destroy        = true
}
