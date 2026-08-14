locals {
  prefix = "${var.project_name}-${var.env}"
}

# Shuts the environment down outside working hours. RDS compute and Fargate are
# the only two line items here that can be turned off — the ALB has to stay up
# to keep its DNS name stable, and RDS storage is billed whether the instance
# runs or not.
#
# EventBridge Scheduler calls the AWS APIs directly through its "universal
# target" (arn:aws:scheduler:::aws-sdk:<service>:<operation>), so this needs no
# Lambda and no code to maintain. At ~90 invocations a month the scheduler
# itself is free in practice.

resource "aws_iam_role" "scheduler" {
  name = "${local.prefix}-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "${local.prefix}-scheduler-role"
  }
}

resource "aws_iam_role_policy" "scheduler" {
  name = "${local.prefix}-scheduler-policy"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ScaleEcsService"
        Effect   = "Allow"
        Action   = ["ecs:UpdateService"]
        Resource = [for s in var.ecs_services : s.arn]
      },
      {
        Sid      = "StartStopDatabase"
        Effect   = "Allow"
        Action   = ["rds:StartDBInstance", "rds:StopDBInstance"]
        Resource = var.db_instance_arn
      }
    ]
  })
}

resource "aws_scheduler_schedule" "ecs_start" {
  for_each = var.ecs_services

  name       = "${local.prefix}-ecs-start-${each.key}"
  group_name = "default"

  # OFF, not a flexible window: these fire in a fixed order relative to each
  # other (RDS up, then tasks up), and a flexible window could invert it.
  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = var.ecs_start_cron
  schedule_expression_timezone = var.timezone

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ecs:updateService"
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      Cluster      = var.ecs_cluster_name
      Service      = each.value.name
      DesiredCount = each.value.desired_count
    })
  }
}

resource "aws_scheduler_schedule" "ecs_stop" {
  for_each = var.ecs_services

  name       = "${local.prefix}-ecs-stop-${each.key}"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = var.ecs_stop_cron
  schedule_expression_timezone = var.timezone

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ecs:updateService"
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      Cluster      = var.ecs_cluster_name
      Service      = each.value.name
      DesiredCount = 0
    })
  }
}

resource "aws_scheduler_schedule" "rds_start" {
  name       = "${local.prefix}-rds-start"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = var.start_cron
  schedule_expression_timezone = var.timezone

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:startDBInstance"
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      DbInstanceIdentifier = var.db_instance_identifier
    })
  }
}

resource "aws_scheduler_schedule" "rds_stop" {
  name       = "${local.prefix}-rds-stop"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = var.stop_cron
  schedule_expression_timezone = var.timezone

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:stopDBInstance"
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      DbInstanceIdentifier = var.db_instance_identifier
    })
  }
}
