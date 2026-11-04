output "registry" {
  value = local.registry
}

output "migrate_job" {
  value = google_cloud_run_v2_job.migrate.name
}

output "sql_instance" {
  value = google_sql_database_instance.this.name
}

output "assets_bucket_name" {
  value = google_storage_bucket.assets.name
}

output "urls" {
  value = {
    api    = local.url["backend"]
    admin  = "${local.url["frontend-admin"]}/admin"
    public = local.url["frontend-public"]
  }
}
