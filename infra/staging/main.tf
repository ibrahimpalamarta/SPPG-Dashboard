terraform {
  required_version = ">= 1.6.0"

  # Bucket comes from `terraform init -backend-config=bucket=...` (output
  # tf_state_bucket of infra/bootstrap).
  backend "gcs" {
    prefix = "staging"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "asia-southeast2"
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "smtp_url" {
  type      = string
  default   = ""
  sensitive = true
}

variable "ai_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "app" {
  source = "../modules/app"

  project_id = var.project_id
  region     = var.region
  env        = "staging"
  image_tag  = var.image_tag

  db_tier                = "db-f1-micro"
  db_availability        = "ZONAL"
  db_deletion_protection = false
  db_stop_overnight      = true

  email_from = "zerostuntingteam@gmail.com"
  smtp_url   = var.smtp_url
  ai_api_key = var.ai_api_key
}

output "registry" {
  value = module.app.registry
}

output "migrate_job" {
  value = module.app.migrate_job
}

output "sql_instance" {
  value = module.app.sql_instance
}

output "urls" {
  value = module.app.urls
}
