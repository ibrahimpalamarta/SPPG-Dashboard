locals {
  prefix = "${var.project_name}-${var.env}"
}

resource "random_password" "master" {
  length           = 24
  special          = true
  override_special = "!#$%^&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "${local.prefix}-db-password"

  tags = {
    Name = "${local.prefix}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
  })
}

resource "aws_db_subnet_group" "this" {
  name       = "${local.prefix}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${local.prefix}-db-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name        = "${local.prefix}-rds-sg"
  description = "Allow Postgres access from ECS backend tasks only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Postgres from ECS backend"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_backend_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.prefix}-rds-sg"
  }
}

resource "aws_db_instance" "this" {
  identifier     = "${local.prefix}-db"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage = var.allocated_storage
  storage_encrypted = true

  db_name  = var.db_name
  username = var.master_username
  password = random_password.master.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  multi_az                = var.multi_az
  backup_retention_period = var.backup_retention_period

  skip_final_snapshot       = var.env == "staging"
  final_snapshot_identifier = var.env == "staging" ? null : "${local.prefix}-db-final-snapshot"

  tags = {
    Name = "${local.prefix}-db"
  }
}
