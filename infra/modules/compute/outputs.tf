output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "frontend_admin_service_name" {
  value = aws_ecs_service.frontend_admin.name
}

output "frontend_public_service_name" {
  value = aws_ecs_service.frontend_public.name
}

output "backend_service_name" {
  value = aws_ecs_service.backend.name
}

# aws_ecs_service exposes its ARN as `id`. Consumed by the scheduler module so
# its IAM policy can scope ecs:UpdateService to exactly these services.
output "frontend_admin_service_arn" {
  value = aws_ecs_service.frontend_admin.id
}

output "frontend_public_service_arn" {
  value = aws_ecs_service.frontend_public.id
}

output "backend_service_arn" {
  value = aws_ecs_service.backend.id
}

output "migrate_task_definition_family" {
  value = aws_ecs_task_definition.migrate.family
}

output "backend_log_group_name" {
  value = aws_cloudwatch_log_group.backend.name
}

output "ecs_task_execution_role_arn" {
  value = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  value = aws_iam_role.ecs_task.arn
}
