terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

variable "name_prefix" {
  description = "Префикс имён таблиц, например chgk-dev → chgk-dev-content."
  type        = string
}

variable "point_in_time_recovery" {
  type    = bool
  default = false
}

variable "deletion_protection" {
  type    = bool
  default = false
}

variable "enable_streams" {
  description = "DynamoDB Streams на content/knowledge (задел под поисковый индекс)."
  type        = bool
  default     = true
}

locals {
  # Схема описана в docs/03-data-model.md.
  tables = {
    content = {
      gsis   = ["GSI1", "GSI2"]
      stream = true
    }
    knowledge = {
      gsis   = ["GSI1", "GSI2"]
      stream = true
    }
    userdata = {
      gsis   = ["GSI1"]
      stream = false
    }
  }
}

resource "aws_dynamodb_table" "this" {
  for_each = local.tables

  name         = "${var.name_prefix}-${each.key}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  dynamic "attribute" {
    for_each = flatten([for g in each.value.gsis : ["${g}PK", "${g}SK"]])
    content {
      name = attribute.value
      type = "S"
    }
  }

  dynamic "global_secondary_index" {
    for_each = each.value.gsis
    content {
      name            = global_secondary_index.value
      projection_type = "ALL"

      key_schema {
        attribute_name = "${global_secondary_index.value}PK"
        key_type       = "HASH"
      }

      key_schema {
        attribute_name = "${global_secondary_index.value}SK"
        key_type       = "RANGE"
      }
    }
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.point_in_time_recovery
  }

  deletion_protection_enabled = var.deletion_protection

  stream_enabled   = each.value.stream && var.enable_streams
  stream_view_type = each.value.stream && var.enable_streams ? "NEW_AND_OLD_IMAGES" : null
}

output "table_names" {
  value = { for k, t in aws_dynamodb_table.this : k => t.name }
}

output "table_arns" {
  value = { for k, t in aws_dynamodb_table.this : k => t.arn }
}
