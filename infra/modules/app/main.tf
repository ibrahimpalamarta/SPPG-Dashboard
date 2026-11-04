terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
    }
    random = {
      source = "hashicorp/random"
    }
  }
}

data "google_project" "this" {}

locals {
  prefix = "sppg-dashboard-${var.env}"

  # Created by infra/bootstrap.
  run_sa       = "sppg-${var.env}-run@${var.project_id}.iam.gserviceaccount.com"
  scheduler_sa = "sppg-sql-scheduler@${var.project_id}.iam.gserviceaccount.com"

  registry = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.this.repository_id}"

  # Cloud Run URLs are deterministic, which is what lets backend and admin
  # point at each other without a dependency cycle.
  url         = { for s in ["backend", "frontend-admin", "frontend-public"] : s => "https://${local.prefix}-${s}-${data.google_project.this.number}.${var.region}.run.app" }
  is_staging  = var.env == "staging"
  sql_volume  = "/cloudsql"
  db_password = urlencode(random_password.db.result)
  db_url      = "postgresql://sppg:${local.db_password}@localhost/sppg_dashboard?host=${local.sql_volume}/${google_sql_database_instance.this.connection_name}"

  # Optional secrets: an empty variable = not created, feature off.
  optional_secrets = {
    SMTP_URL            = var.smtp_url
    AI_API_KEY          = var.ai_api_key
    DATABASE_URL_PUBLIC = var.public_db_url
  }
  secrets = merge(local.optional_secrets, {
    DATABASE_URL       = local.db_url
    MFA_ENCRYPTION_KEY = random_id.mfa_key.b64_std
  })
  # Decided from the input variables only, so it is known at plan time (the
  # generated values are not). Reveals *which* secrets are set, never a value.
  secret_names = toset(concat(
    ["DATABASE_URL", "MFA_ENCRYPTION_KEY"],
    nonsensitive([for k, v in local.optional_secrets : k if v != ""]),
  ))
}

# --- Images -----------------------------------------------------------------

resource "google_artifact_registry_repository" "this" {
  repository_id = local.prefix
  location      = var.region
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }
  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      older_than = "2592000s" # 30 days; the 10 newest are kept regardless
    }
  }
}

# --- Uploads ------------------------------------------------------------------

resource "google_storage_bucket" "assets" {
  name                        = "${var.project_id}-${local.prefix}-assets"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }
}

resource "google_storage_bucket_iam_member" "assets" {
  bucket = google_storage_bucket.assets.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${local.run_sa}"
}

# --- Database -----------------------------------------------------------------

resource "random_password" "db" {
  length  = 32
  special = false
}

# Public IP with no authorized networks: the only way in is the Cloud SQL
# connector (the /cloudsql socket in Cloud Run), which authenticates with IAM
# (roles/cloudsql.client on the runtime service account) and encrypts the hop.
resource "google_sql_database_instance" "this" {
  name                = local.prefix
  database_version    = "POSTGRES_16"
  region              = var.region
  deletion_protection = var.db_deletion_protection

  settings {
    edition           = "ENTERPRISE"
    tier              = var.db_tier
    availability_type = var.db_availability
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = !local.is_staging
    }
  }

  # Staging's scheduler (below) and the deploy workflow flip this between
  # ALWAYS and NEVER; Terraform must not fight them.
  lifecycle {
    ignore_changes = [settings[0].activation_policy]
  }
}

resource "google_sql_database" "this" {
  name     = "sppg_dashboard"
  instance = google_sql_database_instance.this.name
}

resource "google_sql_user" "app" {
  name     = "sppg"
  instance = google_sql_database_instance.this.name
  password = random_password.db.result
}

# --- Secrets ------------------------------------------------------------------

# Encrypts TOTP secrets at rest and signs the MFA challenge. Generated here so
# it never passes through a person or a CI log. Replacing it un-enrols every
# authenticator.
resource "random_id" "mfa_key" {
  byte_length = 32
}

resource "google_secret_manager_secret" "this" {
  for_each  = local.secret_names
  secret_id = "${local.prefix}-${lower(replace(each.key, "_", "-"))}"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "this" {
  for_each    = local.secret_names
  secret      = google_secret_manager_secret.this[each.key].id
  secret_data = local.secrets[each.key]
}

resource "google_secret_manager_secret_iam_member" "this" {
  for_each  = local.secret_names
  secret_id = google_secret_manager_secret.this[each.key].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.run_sa}"
}

# --- Backend --------------------------------------------------------------------

resource "google_cloud_run_v2_service" "backend" {
  name                = "${local.prefix}-backend"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = local.run_sa

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.this.connection_name]
      }
    }

    containers {
      image = "${local.registry}/backend:${var.image_tag}"

      ports {
        container_port = 8080
      }

      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }

      startup_probe {
        http_get {
          path = "/health"
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = local.sql_volume
      }

      dynamic "env" {
        for_each = merge(
          {
            NODE_ENV = "production"
            # client -> GFE -> admin frontend -> GFE -> API. See TRUST_PROXY_HOPS in env.ts.
            TRUST_PROXY_HOPS   = "2"
            MFA_REQUIRED_ROLES = var.mfa_required_roles
            GCS_BUCKET         = google_storage_bucket.assets.name
            ADMIN_BASE_URL     = "${local.url["frontend-admin"]}/admin"
          },
          var.email_from == "" ? {} : { EMAIL_FROM = var.email_from },
          # Staging only: no sppg_public role yet, and dev-mode delete in Upload History.
          local.is_staging ? { ALLOW_SHARED_PUBLIC_DB = "true", ALLOW_DEV_DELETE = "true" } : {},
        )
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.secret_names
        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.this[env.value].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  depends_on = [google_secret_manager_secret_iam_member.this, google_secret_manager_secret_version.this]
}

# Same image, different command: run by the deploy workflow before the new
# revision serves traffic. The seed is idempotent (seed_history dedup, see
# prisma/seed.ts), so reference data lands exactly once per environment.
resource "google_cloud_run_v2_job" "migrate" {
  name                = "${local.prefix}-migrate"
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = local.run_sa
      max_retries     = 0
      timeout         = "600s"

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.this.connection_name]
        }
      }

      containers {
        image   = "${local.registry}/backend:${var.image_tag}"
        command = ["sh", "-c"]
        args    = ["npx prisma migrate deploy && node --import tsx prisma/seed.ts --force"]

        volume_mounts {
          name       = "cloudsql"
          mount_path = local.sql_volume
        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.this["DATABASE_URL"].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  depends_on = [google_secret_manager_secret_iam_member.this, google_secret_manager_secret_version.this]
}

# --- Frontends ------------------------------------------------------------------

resource "google_cloud_run_v2_service" "frontend" {
  for_each            = var.enable_frontends ? toset(["frontend-admin", "frontend-public"]) : toset([])
  name                = "${local.prefix}-${each.key}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = local.run_sa

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances
    }

    containers {
      image = "${local.registry}/${each.key}:${var.image_tag}"

      ports {
        container_port = 3000
      }

      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }

      # frontend-public reads no configuration at runtime. frontend-admin calls
      # the API from its server, never from the browser, so a separate origin
      # needs no CORS.
      dynamic "env" {
        for_each = each.key != "frontend-admin" ? {} : merge(
          { API_BASE_URL = local.url["backend"] },
          local.is_staging ? { ALLOW_DEV_DELETE = "true" } : {},
        )
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }
}

# All three are public web apps; auth is the app's own.
resource "google_cloud_run_v2_service_iam_member" "public" {
  for_each = merge(
    { backend = google_cloud_run_v2_service.backend.name },
    { for k, s in google_cloud_run_v2_service.frontend : k => s.name },
  )
  name     = each.value
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --- Staging off-hours ------------------------------------------------------------

# Cloud Run bills nothing at zero traffic, so only Cloud SQL needs stopping.
# Cloud Scheduler calls the SQL Admin API directly: no function to maintain.
resource "google_cloud_scheduler_job" "sql" {
  for_each = var.db_stop_overnight ? {
    start = { cron = "50 7 * * 1-5", policy = "ALWAYS" }
    stop  = { cron = "0 21 * * 1-5", policy = "NEVER" }
  } : {}

  name      = "${local.prefix}-sql-${each.key}"
  region    = var.region
  schedule  = each.value.cron
  time_zone = "Asia/Jakarta"

  http_target {
    http_method = "PATCH"
    uri         = "https://sqladmin.googleapis.com/v1/projects/${var.project_id}/instances/${google_sql_database_instance.this.name}"
    headers     = { "Content-Type" = "application/json" }
    body        = base64encode(jsonencode({ settings = { activationPolicy = each.value.policy } }))

    oauth_token {
      service_account_email = local.scheduler_sa
    }
  }
}
