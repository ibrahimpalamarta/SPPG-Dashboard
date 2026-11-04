variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "env" {
  description = "staging or production"
  type        = string
}

variable "image_tag" {
  description = "Tag of all three images; CI passes the commit SHA."
  type        = string
  default     = "latest"
}

variable "enable_frontends" {
  description = "Deploy frontend-admin and frontend-public. Off where CI does not build their images yet."
  type        = bool
  default     = true
}

variable "max_instances" {
  type    = number
  default = 2
}

# --- Database ---

variable "db_tier" {
  type    = string
  default = "db-f1-micro"
}

variable "db_availability" {
  description = "ZONAL or REGIONAL (high availability)"
  type        = string
  default     = "ZONAL"
}

variable "db_deletion_protection" {
  type    = bool
  default = true
}

variable "db_stop_overnight" {
  description = "Stop Cloud SQL outside working hours (Mon-Fri 07:50-21:00 WIB). Cloud Run already scales to zero by itself."
  type        = bool
  default     = false
}

# --- App config ---

variable "mfa_required_roles" {
  type    = string
  default = ""
}

variable "email_from" {
  description = "Sender address. Email is sent only when smtp_url is set too."
  type        = string
  default     = ""
}

# Sensitive values below land in Secret Manager (and, like the DB password, in
# Terraform state). CI passes them as TF_VAR_* from GitHub secrets. Empty = not
# wired, and the backend treats the feature as off.

variable "smtp_url" {
  type      = string
  default   = ""
  sensitive = true
}

variable "ai_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "public_db_url" {
  description = "DATABASE_URL_PUBLIC for the read-only sppg_public role (SCRUM-13). Required by the backend in production."
  type        = string
  default     = ""
  sensitive   = true
}
