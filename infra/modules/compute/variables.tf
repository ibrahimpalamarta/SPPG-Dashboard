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

variable "ecr_frontend_repository_url" {
  type = string
}

variable "ecr_backend_repository_url" {
  type = string
}

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

# Separate from desired_count, and 0, because frontend/ has no app yet: no
# frontend image has ever been pushed, so any task ECS starts here just
# crash-loops on ImagePullFailure. Raise this once frontend/ has a Dockerfile
# and the deploy workflows push a frontend image.
variable "frontend_desired_count" {
  type    = number
  default = 0
}

variable "frontend_health_check_path" {
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
