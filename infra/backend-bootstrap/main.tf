terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # No backend block: this stack's state is local by design. It provisions
  # the very state buckets/lock tables the other stacks depend on, so it
  # can't depend on one itself. Run rarely, by hand, with admin credentials.
  # Keep terraform.tfstate somewhere safe (see infra/README.md).
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
      Stack     = "backend-bootstrap"
    }
  }
}

locals {
  environments = ["staging", "production"]
}

resource "aws_s3_bucket" "state" {
  for_each = toset(local.environments)
  bucket   = "${var.project_name}-terraform-state-${each.key}"

  tags = {
    Name        = "${var.project_name}-terraform-state-${each.key}"
    Environment = each.key
  }
}

resource "aws_s3_bucket_versioning" "state" {
  for_each = aws_s3_bucket.state
  bucket   = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  for_each = aws_s3_bucket.state
  bucket   = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  for_each = aws_s3_bucket.state
  bucket   = each.value.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "state_deny_insecure_transport" {
  for_each = aws_s3_bucket.state
  bucket   = each.value.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        each.value.arn,
        "${each.value.arn}/*",
      ]
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}

resource "aws_dynamodb_table" "lock" {
  for_each     = toset(local.environments)
  name         = "${var.project_name}-terraform-lock-${each.key}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-terraform-lock-${each.key}"
    Environment = each.key
  }
}

# Account-level singleton — must only ever be created once per AWS account.
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [var.github_oidc_thumbprint]
}

# The sub claim is `environment:<name>`, not `ref:refs/heads/<branch>`: every
# deploy job declares `environment:`, and GitHub swaps the ref form out for the
# environment form when it does. Which branches may reach an environment is
# therefore enforced by GitHub (Settings -> Environments -> Deployment branches),
# not here: staging <- staging, production <- main and v* tags.
module "iam_oidc_staging" {
  source = "../modules/iam-oidc"

  env                  = "staging"
  project_name         = var.project_name
  account_id           = var.account_id
  aws_region           = var.aws_region
  github_org           = var.github_org
  github_repo          = var.github_repo
  oidc_provider_arn    = aws_iam_openid_connect_provider.github.arn
  trusted_sub_patterns = ["environment:staging"]
  state_bucket_arn     = aws_s3_bucket.state["staging"].arn
  lock_table_arn       = aws_dynamodb_table.lock["staging"].arn
}

module "iam_oidc_production" {
  source = "../modules/iam-oidc"

  env                  = "production"
  project_name         = var.project_name
  account_id           = var.account_id
  aws_region           = var.aws_region
  github_org           = var.github_org
  github_repo          = var.github_repo
  oidc_provider_arn    = aws_iam_openid_connect_provider.github.arn
  trusted_sub_patterns = ["environment:production"]
  state_bucket_arn     = aws_s3_bucket.state["production"].arn
  lock_table_arn       = aws_dynamodb_table.lock["production"].arn
}
