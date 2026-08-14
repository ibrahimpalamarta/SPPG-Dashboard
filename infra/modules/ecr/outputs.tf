output "frontend_admin_repository_url" {
  value = aws_ecr_repository.frontend_admin.repository_url
}

output "frontend_public_repository_url" {
  value = aws_ecr_repository.frontend_public.repository_url
}

output "backend_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "frontend_admin_repository_arn" {
  value = aws_ecr_repository.frontend_admin.arn
}

output "frontend_public_repository_arn" {
  value = aws_ecr_repository.frontend_public.arn
}

output "backend_repository_arn" {
  value = aws_ecr_repository.backend.arn
}
