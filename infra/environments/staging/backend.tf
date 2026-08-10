# Partial backend config on purpose: no bucket/account values here.
# Actual values are supplied at `terraform init -backend-config=...` time,
# from GitHub Environment variables in CI or a gitignored *.hcl file locally.
# See infra/README.md and backend-staging.hcl.example.
terraform {
  backend "s3" {}
}
