variable "account_id" {
  description = "AWS Account ID currently in use (personal account today, office account after migration)"
  type        = string
}

variable "aws_region" {
  description = "AWS region for state resources and the OIDC-authenticated deploy roles"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
  default     = "sppg-dashboard"
}

variable "github_org" {
  description = "GitHub organization or username that owns the repository"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (without org prefix)"
  type        = string
}

# GitHub's OIDC thumbprint. AWS now verifies the token signature itself and
# largely ignores this value, but the provider resource still requires one.
# See: https://github.blog/changelog/2023-06-27-github-actions-update-on-oidc-integration-with-aws/
variable "github_oidc_thumbprint" {
  type    = string
  default = "6938fd4d98bab03faadb97b34396831e3780aea1"
}
