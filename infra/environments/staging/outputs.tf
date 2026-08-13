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

# The subnets ECS actually places tasks in — public here, because staging has no
# NAT gateway. The deploy workflow reads this for the one-off migration task:
# run in the private subnets it would have no route to ECR and would hang.
output "task_subnet_ids" {
  value = module.network.public_subnet_ids
}

output "db_instance_identifier" {
  value = module.database.db_instance_identifier
}

# The ECS service ignores desired_count after creation (the off-hours scheduler
# owns it), so the deploy workflow has to scale the service back up itself.
output "backend_desired_count" {
  value = var.desired_count
}

output "ecs_tasks_security_group_id" {
  value = module.network.ecs_tasks_security_group_id
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
