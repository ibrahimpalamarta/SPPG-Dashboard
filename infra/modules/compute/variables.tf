variable "env" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

# Which subnets the ECS services place tasks in. Separate from the ALB's
# public_subnet_ids because the two are not always the same: production puts
# tasks in private subnets behind a NAT gateway, while staging has no NAT and
# runs them in the public subnets so they can still reach ECR, Secrets Manager
# and CloudWatch. Neither is an exposure — the tasks security group only ever
# accepts ingress from the ALB security group, in either placement.
variable "task_subnet_ids" {
  description = "Subnets for ECS service tasks. Private subnets normally; public subnets in environments where enable_nat_gateway is false."
  type        = list(string)
}

variable "task_assign_public_ip" {
  description = "Give ECS tasks a public IP. Required when task_subnet_ids are public subnets and there is no NAT gateway."
  type        = bool
  default     = false
}

variable "alb_security_group_id" {
  type = string
}

variable "ecs_tasks_security_group_id" {
  type = string
}

variable "ecr_frontend_admin_repository_url" {
  type = string
}

variable "ecr_frontend_public_repository_url" {
  type = string
}

variable "ecr_backend_repository_url" {
  type = string
}

# One tag for both frontends: they are built in the same workflow run, from the
# same commit, and always roll out together. Splitting this into two variables
# would only create a way for them to drift.
variable "frontend_image_tag" {
  type = string
}

variable "backend_image_tag" {
  type = string
}

variable "frontend_container_port" {
  type = number
}

variable "backend_container_port" {
  type = number
}

variable "frontend_cpu" {
  type = number
}

variable "frontend_memory" {
  type = number
}

variable "backend_cpu" {
  type = number
}

variable "backend_memory" {
  type = number
}

variable "desired_count" {
  type = number
}

# Applies to both frontend services, which are sized and scaled identically.
# Defaults to 0 so an environment whose deploy workflow does not push frontend
# images (production, today) does not crash-loop on ImagePullFailure. Staging
# overrides it.
variable "frontend_desired_count" {
  type    = number
  default = 0
}

# The admin app sets basePath "/admin", so it 404s on "/" — its health check has
# to hit the prefix or the target group never turns healthy. ALB health checks
# go straight to the container, bypassing the listener rules.
variable "frontend_admin_health_check_path" {
  type    = string
  default = "/admin"
}

variable "frontend_public_health_check_path" {
  type    = string
  default = "/"
}

variable "backend_health_check_path" {
  type    = string
  default = "/health"
}

variable "enable_container_insights" {
  type    = bool
  default = false
}

variable "log_retention_in_days" {
  description = "CloudWatch Logs retention for the ECS log groups. Staging lowers this; nobody reads week-old staging logs."
  type        = number
  default     = 30
}

variable "db_endpoint" {
  type = string
}

variable "db_port" {
  type = number
}

variable "db_name" {
  type = string
}

variable "db_secret_arn" {
  description = "Secrets Manager ARN holding {username, password} for the database"
  type        = string
}

variable "assets_bucket_arn" {
  type = string
}

variable "assets_bucket_name" {
  description = "Assets bucket the backend writes uploads to (SCRUM-5/14). Read as S3_BUCKET."
  type        = string
}

variable "public_db_secret_key" {
  description = <<-EOT
    JSON key inside db_secret_arn holding the connection string for the
    read-only `sppg_public` role (SCRUM-13). Empty means the key is not
    provisioned yet and DATABASE_URL_PUBLIC is not injected — the backend then
    serves /api/public/* over the main connection and warns at boot.

    Set this only AFTER `npm run grant:public-role` has run and the key exists
    in the secret, otherwise the task cannot start.
  EOT
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for the HTTPS listener. Leave empty to skip HTTPS (HTTP-only) until a domain/certificate is available."
  type        = string
  default     = ""
}

variable "auth0_domain" {
  description = "Auth0 tenant domain, e.g. your-tenant.us.auth0.com. Not a secret."
  type        = string
}

variable "auth0_audience" {
  description = "Auth0 API identifier the backend validates tokens against. Not a secret."
  type        = string
}

variable "auth0_roles_claim" {
  description = "Namespaced custom claim carrying the user's Auth0 roles."
  type        = string
}
