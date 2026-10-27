variable "env" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "ecs_backend_security_group_id" {
  description = "Security group of the ECS tasks that need to reach Postgres on port 5432"
  type        = string
}

variable "db_name" {
  type = string
}

variable "master_username" {
  type = string
}

variable "instance_class" {
  type = string
}

variable "allocated_storage" {
  type = number
}

variable "engine_version" {
  type = string
}

variable "multi_az" {
  type = bool
}

variable "backup_retention_period" {
  type = number
}

variable "apply_immediately" {
  description = "Apply RDS modifications at once instead of deferring to the maintenance window. Safe for online changes like gp2->gp3; kept false in production."
  type        = bool
  default     = false
}
