locals {
  prefix = "${var.project_name}-${var.env}"

  sub_conditions = [
    for pattern in var.trusted_ref_patterns :
    "repo:${var.github_org}/${var.github_repo}:ref:${pattern}"
  ]

  # Application-infra resources are provisioned by a separate Terraform state
  # (infra/environments/<env>) and don't exist yet when this role is created
  # in backend-bootstrap. ARNs are therefore built from the shared naming
  # convention (dashboard-sppg-<env>-<resource>) rather than resource
  # references, so bootstrap has no dependency on the environment stacks.
  ecr_repo_arn_pattern     = "arn:aws:ecr:${var.aws_region}:${var.account_id}:repository/${local.prefix}-*"
  ecs_cluster_arn          = "arn:aws:ecs:${var.aws_region}:${var.account_id}:cluster/${local.prefix}-cluster"
  ecs_service_arn_pattern  = "arn:aws:ecs:${var.aws_region}:${var.account_id}:service/${local.prefix}-cluster/${local.prefix}-*"
  ecs_task_def_arn_pattern = "arn:aws:ecs:${var.aws_region}:${var.account_id}:task-definition/${local.prefix}-*"
  ecs_role_arn_pattern     = "arn:aws:iam::${var.account_id}:role/${local.prefix}-ecs-*"
  s3_assets_bucket_arn     = "arn:aws:s3:::${local.prefix}-assets"
  secrets_arn_pattern      = "arn:aws:secretsmanager:${var.aws_region}:${var.account_id}:secret:${local.prefix}-*"
  logs_arn_pattern         = "arn:aws:logs:${var.aws_region}:${var.account_id}:log-group:/ecs/${local.prefix}-*"
  rds_instance_arn         = "arn:aws:rds:${var.aws_region}:${var.account_id}:db:${local.prefix}-db"
  rds_subnet_group_arn     = "arn:aws:rds:${var.aws_region}:${var.account_id}:subgrp:${local.prefix}-db-subnet-group"
}

resource "aws_iam_role" "deploy" {
  name = "${var.project_name}-github-actions-deploy-${var.env}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Federated = var.oidc_provider_arn }
        Action    = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.sub_conditions
          }
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-github-actions-deploy-${var.env}"
  }
}

# Tightly-scoped permissions for the "build image, deploy to ECS" path.
resource "aws_iam_policy" "deploy_app" {
  name = "${local.prefix}-deploy-app-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EcrAuth"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "EcrPushPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:DescribeImages"
        ]
        Resource = local.ecr_repo_arn_pattern
      },
      {
        Sid    = "EcsDeploy"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks"
        ]
        Resource = [
          local.ecs_cluster_arn,
          local.ecs_service_arn_pattern,
          local.ecs_task_def_arn_pattern,
        ]
      },
      {
        # ecs:RegisterTaskDefinition does not support resource-level
        # restriction (the resulting ARN includes a revision number that
        # isn't known ahead of time) — this is a documented AWS limitation,
        # not an oversight.
        Sid      = "EcsRegisterTaskDefinition"
        Effect   = "Allow"
        Action   = ["ecs:RegisterTaskDefinition"]
        Resource = "*"
      },
      {
        Sid      = "PassEcsRoles"
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = local.ecs_role_arn_pattern
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Broader permissions needed only when `terraform apply` runs from CI to
# manage the application infrastructure itself (VPC, ALB, RDS, etc).
# Many EC2/RDS/ELB actions don't support resource-level IAM conditions, so
# those are granted on "*" but scoped down to the specific action list this
# stack actually uses — this is the realistic ceiling of "least privilege"
# for a role that also runs Terraform, distinct from the strictly
# ARN-scoped ECR/ECS/PassRole permissions above.
resource "aws_iam_policy" "deploy_infra" {
  name = "${local.prefix}-deploy-infra-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Ec2Network"
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "ec2:CreateVpc", "ec2:DeleteVpc", "ec2:ModifyVpcAttribute",
          "ec2:CreateSubnet", "ec2:DeleteSubnet", "ec2:ModifySubnetAttribute",
          "ec2:CreateInternetGateway", "ec2:DeleteInternetGateway",
          "ec2:AttachInternetGateway", "ec2:DetachInternetGateway",
          "ec2:CreateNatGateway", "ec2:DeleteNatGateway",
          "ec2:AllocateAddress", "ec2:ReleaseAddress", "ec2:AssociateAddress", "ec2:DisassociateAddress",
          "ec2:CreateRouteTable", "ec2:DeleteRouteTable", "ec2:CreateRoute", "ec2:DeleteRoute",
          "ec2:AssociateRouteTable", "ec2:DisassociateRouteTable",
          "ec2:CreateSecurityGroup", "ec2:DeleteSecurityGroup",
          "ec2:AuthorizeSecurityGroupIngress", "ec2:AuthorizeSecurityGroupEgress",
          "ec2:RevokeSecurityGroupIngress", "ec2:RevokeSecurityGroupEgress",
          "ec2:CreateTags", "ec2:DeleteTags"
        ]
        Resource = "*"
      },
      {
        Sid    = "Elb"
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:*"
        ]
        Resource = "*"
      },
      {
        Sid    = "EcsInfra"
        Effect = "Allow"
        Action = [
          "ecs:CreateCluster", "ecs:DeleteCluster", "ecs:DescribeClusters",
          "ecs:CreateService", "ecs:DeleteService",
          "ecs:DeregisterTaskDefinition", "ecs:TagResource", "ecs:ListTagsForResource"
        ]
        Resource = "*"
      },
      {
        Sid    = "RdsInfra"
        Effect = "Allow"
        Action = [
          "rds:Describe*",
          "rds:CreateDBInstance", "rds:DeleteDBInstance", "rds:ModifyDBInstance",
          "rds:CreateDBSubnetGroup", "rds:DeleteDBSubnetGroup", "rds:ModifyDBSubnetGroup",
          "rds:AddTagsToResource", "rds:RemoveTagsFromResource", "rds:ListTagsForResource"
        ]
        Resource = [
          local.rds_instance_arn,
          local.rds_subnet_group_arn,
        ]
      },
      {
        Sid    = "S3AssetsBucket"
        Effect = "Allow"
        Action = [
          "s3:CreateBucket", "s3:DeleteBucket", "s3:GetBucketPolicy", "s3:PutBucketPolicy",
          "s3:PutBucketVersioning", "s3:GetBucketVersioning",
          "s3:PutEncryptionConfiguration", "s3:GetEncryptionConfiguration",
          "s3:PutBucketPublicAccessBlock", "s3:GetBucketPublicAccessBlock",
          "s3:GetObject", "s3:PutObject", "s3:ListBucket", "s3:PutBucketTagging", "s3:GetBucketTagging"
        ]
        Resource = [
          local.s3_assets_bucket_arn,
          "${local.s3_assets_bucket_arn}/*",
        ]
      },
      {
        Sid    = "SecretsManager"
        Effect = "Allow"
        Action = [
          "secretsmanager:CreateSecret", "secretsmanager:DeleteSecret",
          "secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue", "secretsmanager:TagResource"
        ]
        Resource = local.secrets_arn_pattern
      },
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup", "logs:DeleteLogGroup",
          "logs:PutRetentionPolicy", "logs:DescribeLogGroups", "logs:TagResource", "logs:TagLogGroup"
        ]
        Resource = local.logs_arn_pattern
      },
      {
        Sid    = "IamEcsRoles"
        Effect = "Allow"
        Action = [
          "iam:CreateRole", "iam:DeleteRole", "iam:GetRole",
          "iam:PutRolePolicy", "iam:DeleteRolePolicy", "iam:GetRolePolicy",
          "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListAttachedRolePolicies",
          "iam:TagRole"
        ]
        Resource = local.ecs_role_arn_pattern
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "deploy_app" {
  role       = aws_iam_role.deploy.name
  policy_arn = aws_iam_policy.deploy_app.arn
}

resource "aws_iam_role_policy_attachment" "deploy_infra" {
  role       = aws_iam_role.deploy.name
  policy_arn = aws_iam_policy.deploy_infra.arn
}

# Terraform state access for this environment (needed since terraform
# init/apply runs from CI using this same role).
resource "aws_iam_policy" "deploy_state" {
  name = "${local.prefix}-deploy-state-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "StateBucket"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [var.state_bucket_arn, "${var.state_bucket_arn}/*"]
      },
      {
        Sid      = "StateLock"
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = var.lock_table_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "deploy_state" {
  role       = aws_iam_role.deploy.name
  policy_arn = aws_iam_policy.deploy_state.arn
}
