# One-time, applied by a person with Owner on the project (see infra/README.md).
# Everything GitHub Actions needs before it can authenticate at all: the APIs,
# the state bucket, Workload Identity Federation, and the service accounts.
# The environments never touch IAM at project level; that all happens here.

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

variable "project_id" {
  description = "GCP project ID (the string id, not projects/<number>)"
  type        = string
}

variable "region" {
  type    = string
  default = "asia-southeast2"
}

variable "github_repo" {
  description = "owner/repo allowed to deploy"
  type        = string
  default     = "ibrahimpalamarta/SPPG-Dashboard"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  envs = toset(["staging", "production"])

  # ponytail: both environments share one project, so these are project-wide
  # and the staging deployer could touch production. Split into two projects
  # when that isolation matters; nothing below changes except project_id.
  deploy_roles = [
    "roles/run.admin",
    "roles/cloudsql.admin",
    "roles/artifactregistry.admin",
    "roles/storage.admin",
    "roles/secretmanager.admin",
    "roles/cloudscheduler.admin",
    "roles/iam.serviceAccountUser",
    "roles/serviceusage.serviceUsageConsumer",
  ]
}

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "aiplatform.googleapis.com",
    "storage.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# One bucket, one prefix per environment. GCS locks state natively, so there
# is no lock table.
resource "google_storage_bucket" "tfstate" {
  name                        = "${var.project_id}-sppg-tfstate"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  depends_on                = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  # Nothing outside this repository can even exchange a token.
  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# --- Per environment: deployer (CI) and runtime (Cloud Run) ---------------

resource "google_service_account" "deploy" {
  for_each   = local.envs
  account_id = "sppg-${each.key}-deploy"
  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "deploy" {
  for_each = { for pair in setproduct(local.envs, local.deploy_roles) : "${pair[0]}/${pair[1]}" => pair }
  project  = var.project_id
  role     = each.value[1]
  member   = "serviceAccount:${google_service_account.deploy[each.value[0]].email}"
}

# Every deploy job sets `environment:`, so GitHub's sub claim is
# repo:<owner>/<repo>:environment:<env>. Which branches may use an
# environment is enforced in GitHub (Settings -> Environments).
resource "google_service_account_iam_member" "deploy_wif" {
  for_each           = local.envs
  service_account_id = google_service_account.deploy[each.key].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principal://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/subject/repo:${var.github_repo}:environment:${each.key}"
}

# Identity of the Cloud Run services and the migrate job. Bucket and secret
# access are granted on those resources by the environment; only Cloud SQL
# needs a project-level role.
resource "google_service_account" "run" {
  for_each   = local.envs
  account_id = "sppg-${each.key}-run"
  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "run_sql" {
  for_each = local.envs
  project  = var.project_id
  role     = "roles/cloudsql.client"
  member   = "serviceAccount:${google_service_account.run[each.key].email}"
}

# Used by staging's Cloud Scheduler jobs to stop/start Cloud SQL overnight.
resource "google_service_account" "sql_scheduler" {
  account_id = "sppg-sql-scheduler"
  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "sql_scheduler" {
  project = var.project_id
  role    = "roles/cloudsql.editor"
  member  = "serviceAccount:${google_service_account.sql_scheduler.email}"
}

# --- Values for GitHub Environment variables --------------------------------

output "tf_state_bucket" {
  value = google_storage_bucket.tfstate.name
}

output "wif_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "deploy_service_accounts" {
  value = { for env, sa in google_service_account.deploy : env => sa.email }
}
