terraform {
  required_version = ">= 1.6.0"

  # Bucket comes from `terraform init -backend-config=bucket=...` (output
  # tf_state_bucket of infra/bootstrap).
  backend "gcs" {
    prefix = "production"
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

# Required: production refuses to boot without the restricted public role
# (backend env.ts). postgresql://sppg_public:<pw>@localhost/sppg_dashboard?host=/cloudsql/<connection name>
variable "public_db_url" {
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
  env        = "production"
  image_tag  = var.image_tag

  # deploy-prod.yml does not build the frontend images yet. Turning them on is
  # this line plus the two build steps from deploy-staging.yml.
  enable_frontends = false
  max_instances    = 4

  # High availability needs a dedicated-core tier (not f1-micro/g1-small).
  db_tier         = "db-custom-1-3840"
  db_availability = "REGIONAL"

  smtp_url      = var.smtp_url
  ai_api_key    = var.ai_api_key
  public_db_url = var.public_db_url
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
