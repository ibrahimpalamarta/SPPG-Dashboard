variable "env" {
  type    = string
  default = "production"
}

variable "project_name" {
  type    = string
  default = "dashboard-sppg"
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-3"
}

variable "account_id" {
  description = "AWS Account ID currently in use (personal account today, office account after migration)"
  type        = string
}

variable "github_org" {
  description = "GitHub organization or username that owns the repository"
  type        = string
}

variable "github_repo" {
  type = string
}

# --- Network ---

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "azs" {
  type    = list(string)
  default = ["ap-southeast-3a", "ap-southeast-3b"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.0.0/24", "10.20.1.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.10.0/24", "10.20.11.0/24"]
}

# --- Compute ---

variable "frontend_container_port" {
  type    = number
  default = 3000
}

variable "backend_container_port" {
  type    = number
  default = 8080
}

variable "frontend_cpu" {
  type    = number
  default = 512
}

variable "frontend_memory" {
  type    = number
  default = 1024
}

variable "backend_cpu" {
  type    = number
  default = 512
}

variable "backend_memory" {
  type    = number
  default = 1024
}

variable "desired_count" {
  type    = number
  default = 2
}

variable "frontend_image_tag" {
  type    = string
  default = "latest"
}

variable "backend_image_tag" {
  type    = string
  default = "latest"
}

variable "acm_certificate_arn" {
  description = "Leave empty until a domain/ACM certificate is available"
  type        = string
  default     = ""
}

# --- Database ---

variable "db_name" {
  type    = string
  default = "dashboard_sppg"
}

variable "db_master_username" {
  # RDS master username must be letters/numbers only (no underscores/hyphens).
  type    = string
  default = "sppgadmin"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "db_allocated_storage" {
  type    = number
  default = 50
}

variable "db_engine_version" {
  type    = string
  default = "16.4"
}

variable "db_multi_az" {
  type    = bool
  default = true
}

variable "db_backup_retention_period" {
  type    = number
  default = 7
}
