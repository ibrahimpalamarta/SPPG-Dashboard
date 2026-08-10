variable "oidc_provider_arn" {
  description = "ARN of the account's GitHub Actions OIDC provider (created once, outside this module)"
  type        = string
}

variable "env" {
  description = "Environment this deploy role is for (staging, production)"
  type        = string
}

variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
}

variable "account_id" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "github_org" {
  description = "GitHub organization or user that owns the repository"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (without org prefix)"
  type        = string
}

variable "trusted_ref_patterns" {
  description = "Git ref patterns (e.g. refs/heads/staging, refs/tags/v*) allowed to assume this role via OIDC"
  type        = list(string)
}

variable "state_bucket_arn" {
  description = "ARN of this environment's Terraform state S3 bucket"
  type        = string
}

variable "lock_table_arn" {
  description = "ARN of this environment's Terraform state lock DynamoDB table"
  type        = string
}
