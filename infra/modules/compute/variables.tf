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

variable "private_subnet_ids" {
  type = list(string)
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
