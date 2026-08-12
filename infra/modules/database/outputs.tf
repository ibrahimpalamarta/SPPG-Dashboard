output "db_endpoint" {
  value = aws_db_instance.this.address
}

output "db_port" {
  value = aws_db_instance.this.port
}

output "db_name" {
  value = aws_db_instance.this.db_name
}

output "security_group_id" {
  value = aws_security_group.rds.id
}

# Deliberately the version's ARN, not the secret's — identical string, but it
# makes every task definition that reads a key out of this secret depend on the
# version that actually contains that key. Without it, a targeted apply of the
# migrate task definition would register a task pointing at a `url` key that
# hasn't been written yet.
output "secret_arn" {
  value = aws_secretsmanager_secret_version.db_password.arn
}
