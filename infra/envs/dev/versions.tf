terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # bucket и region передаются через -backend-config в scripts/infra.ps1
  # (имя бакета зависит от ID аккаунта: chgk-tfstate-<account_id>).
  backend "s3" {
    key          = "chgk/dev/terraform.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "chgk-trainer"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}
