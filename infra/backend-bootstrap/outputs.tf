output "state_bucket_names" {
  value = { for env, b in aws_s3_bucket.state : env => b.bucket }
}

output "lock_table_names" {
  value = { for env, t in aws_dynamodb_table.lock : env => t.name }
}

output "oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.github.arn
}

output "staging_role_arn" {
  value = module.iam_oidc_staging.role_arn
}

output "production_role_arn" {
  value = module.iam_oidc_production.role_arn
}
