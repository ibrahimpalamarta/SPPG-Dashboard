variable "env" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
}

variable "ecs_cluster_name" {
  type = string
}

# A map rather than a single service: every Fargate service in the environment
# has to be scaled down, or the ones left out quietly bill around the clock and
# undo the saving. The key is only used to name the schedules.
variable "ecs_services" {
  description = "ECS services to scale out of hours: key => { name, arn, desired_count }"
  type = map(object({
    name          = string
    arn           = string
    desired_count = number
  }))
}

variable "db_instance_identifier" {
  type = string
}

variable "db_instance_arn" {
  type = string
}

# Cron expressions are written in local time via schedule_expression_timezone,
# so they read the way the team thinks about them and need no DST arithmetic.
variable "timezone" {
  description = "IANA timezone the cron expressions below are interpreted in"
  type        = string
  default     = "Asia/Jakarta"
}

variable "start_cron" {
  description = "When to start RDS. Runs ~10 minutes before the ECS start, because a stopped instance takes several minutes to reach 'available'."
  type        = string
  default     = "cron(50 6 ? * MON-FRI *)"
}

variable "ecs_start_cron" {
  type    = string
  default = "cron(0 7 ? * MON-FRI *)"
}

variable "ecs_stop_cron" {
  type    = string
  default = "cron(0 21 ? * MON-FRI *)"
}

variable "stop_cron" {
  description = "When to stop RDS. Runs after the ECS stop so nothing is holding a connection open."
  type        = string
  default     = "cron(5 21 ? * MON-FRI *)"
}
