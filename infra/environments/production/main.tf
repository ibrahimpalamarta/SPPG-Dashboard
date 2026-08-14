terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.env
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  }
}

module "network" {
  source = "../../modules/network"

  env                     = var.env
  project_name            = var.project_name
  vpc_cidr                = var.vpc_cidr
  azs                     = var.azs
  public_subnet_cidrs     = var.public_subnet_cidrs
  private_subnet_cidrs    = var.private_subnet_cidrs
  frontend_container_port = var.frontend_container_port
  backend_container_port  = var.backend_container_port
}

module "ecr" {
  source = "../../modules/ecr"

  env          = var.env
  project_name = var.project_name
}

module "storage" {
  source = "../../modules/storage"

  env          = var.env
  project_name = var.project_name
}

module "database" {
  source = "../../modules/database"

  env                           = var.env
  project_name                  = var.project_name
  vpc_id                        = module.network.vpc_id
  private_subnet_ids            = module.network.private_subnet_ids
  ecs_backend_security_group_id = module.network.ecs_tasks_security_group_id
  db_name                       = var.db_name
  master_username               = var.db_master_username
  instance_class                = var.db_instance_class
  allocated_storage             = var.db_allocated_storage
  engine_version                = var.db_engine_version
  multi_az                      = var.db_multi_az
  backup_retention_period       = var.db_backup_retention_period
}

module "compute" {
  source = "../../modules/compute"

  env                         = var.env
  project_name                = var.project_name
  aws_region                  = var.aws_region
  vpc_id                      = module.network.vpc_id
  public_subnet_ids           = module.network.public_subnet_ids
  alb_security_group_id       = module.network.alb_security_group_id
  ecs_tasks_security_group_id = module.network.ecs_tasks_security_group_id
  # Production keeps its NAT gateway, so tasks stay in the private subnets with
  # no public IP. Staging differs — see the comment in its main.tf.
  task_subnet_ids                    = module.network.private_subnet_ids
  task_assign_public_ip              = false
  ecr_frontend_admin_repository_url  = module.ecr.frontend_admin_repository_url
  ecr_frontend_public_repository_url = module.ecr.frontend_public_repository_url
  ecr_backend_repository_url         = module.ecr.backend_repository_url
  frontend_image_tag                 = var.frontend_image_tag
  backend_image_tag                  = var.backend_image_tag
  frontend_container_port            = var.frontend_container_port
  backend_container_port             = var.backend_container_port
  frontend_cpu                       = var.frontend_cpu
  frontend_memory                    = var.frontend_memory
  backend_cpu                        = var.backend_cpu
  backend_memory                     = var.backend_memory
  desired_count                      = var.desired_count
  # frontend_desired_count is deliberately left at the module default of 0:
  # deploy-prod.yml does not build or push frontend images yet, so any task
  # started here would crash-loop on ImagePullFailure. The repositories, target
  # groups, listener rules and services still get provisioned — they cost
  # nothing while no tasks run — so enabling production later is a one-line
  # change here plus the build steps in the workflow.
  enable_container_insights = true
  db_endpoint               = module.database.db_endpoint
  db_port                   = module.database.db_port
  db_name                   = module.database.db_name
  db_secret_arn             = module.database.secret_arn
  assets_bucket_arn         = module.storage.bucket_arn
  acm_certificate_arn       = var.acm_certificate_arn
  auth0_domain              = var.auth0_domain
  auth0_audience            = var.auth0_audience
  auth0_roles_claim         = var.auth0_roles_claim
}
