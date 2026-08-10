output "alb_dns_name" {
  value = module.compute.alb_dns_name
}

output "ecs_cluster_name" {
  value = module.compute.ecs_cluster_name
}

output "ecr_frontend_repository_url" {
  value = module.ecr.frontend_repository_url
}

output "ecr_backend_repository_url" {
  value = module.ecr.backend_repository_url
}

output "db_endpoint" {
  value = module.database.db_endpoint
}

output "assets_bucket_name" {
  value = module.storage.bucket_name
}
