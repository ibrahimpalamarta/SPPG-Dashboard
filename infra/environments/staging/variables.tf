variable "env" {
  type    = string
  default = "staging"
}

variable "project_name" {
  type    = string
  default = "sppg-dashboard"
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-3"
}

# --- Network ---

variable "vpc_cidr" {
  type    = string
  default = "10.10.0.0/16"
}

# CI passes no tfvars file — terraform.tfvars is gitignored — so these defaults
# are what the deploy workflow actually builds with. They must match the region
# the state bucket and the live VPC are in (ap-southeast-3), or Terraform will
# try to move every subnet into an AZ that doesn't exist there.
variable "azs" {
  type    = list(string)
  default = ["ap-southeast-3a", "ap-southeast-3b"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.10.0.0/24", "10.10.1.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.10.10.0/24", "10.10.11.0/24"]
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
  default = 256
}

variable "frontend_memory" {
  type    = number
  default = 512
}

variable "backend_cpu" {
  type    = number
  default = 256
}

variable "backend_memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  type    = number
  default = 1
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

# 7 rather than the module default of 30: staging logs older than a week are
# never read, and CloudWatch bills for stored volume.
variable "log_retention_in_days" {
  type    = number
  default = 7
}

# --- Database ---

variable "db_name" {
  type    = string
  default = "sppg_dashboard"
}

variable "db_master_username" {
  # RDS master username must be letters/numbers only (no underscores/hyphens).
  type    = string
  default = "sppgadmin"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_engine_version" {
  type    = string
  default = "16.14"
}

variable "db_multi_az" {
  type    = bool
  default = false
}

variable "db_backup_retention_period" {
  type    = number
  default = 1
}

variable "auth0_domain" {
  description = "Auth0 tenant domain for this environment (staging and prod use separate Auth0 APIs)."
  type        = string
}

variable "auth0_audience" {
  description = "Auth0 API identifier the backend validates access tokens against."
  type        = string
}

variable "auth0_roles_claim" {
  description = "Namespaced custom claim on the access token carrying the user's roles."
  type        = string
}
