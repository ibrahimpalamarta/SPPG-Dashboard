output "alb_dns_name" {
  value = module.compute.alb_dns_name
}

output "ecs_cluster_name" {
  value = module.compute.ecs_cluster_name
}

# Consumed by the deploy workflow to wait out the ECS rollout.
output "backend_service_name" {
  value = module.compute.backend_service_name
}

# Consumed by the deploy workflow to run the one-off migration task.
output "migrate_task_definition_family" {
  value = module.compute.migrate_task_definition_family
}

output "backend_log_group_name" {
  value = module.compute.backend_log_group_name
}

output "private_subnet_ids" {
  value = module.network.private_subnet_ids
}

output "ecs_tasks_security_group_id" {
  value = module.network.ecs_tasks_security_group_id
}

output "frontend_admin_service_name" {
  value = module.compute.frontend_admin_service_name
}

output "frontend_public_service_name" {
  value = module.compute.frontend_public_service_name
}

output "ecr_frontend_admin_repository_url" {
  value = module.ecr.frontend_admin_repository_url
}

output "ecr_frontend_public_repository_url" {
  value = module.ecr.frontend_public_repository_url
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
