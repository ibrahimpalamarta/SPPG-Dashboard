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

  env                  = var.env
  project_name         = var.project_name
  vpc_cidr             = var.vpc_cidr
  azs                  = var.azs
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  # No NAT gateway in staging: it cost ~$45/month to give a single 0.25 vCPU
  # task egress to ECR. The tasks run in the public subnets instead (see
  # task_subnet_ids below), which is free and equally locked down — the tasks
  # security group still only accepts traffic from the ALB. Production keeps
  # its NAT gateway.
  enable_nat_gateway = false

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
  apply_immediately             = true
}

module "compute" {
  source = "../../modules/compute"

  env                                = var.env
  project_name                       = var.project_name
  aws_region                         = var.aws_region
  vpc_id                             = module.network.vpc_id
  public_subnet_ids                  = module.network.public_subnet_ids
  alb_security_group_id              = module.network.alb_security_group_id
  ecs_tasks_security_group_id        = module.network.ecs_tasks_security_group_id
  task_subnet_ids                    = module.network.public_subnet_ids
  task_assign_public_ip              = true
  log_retention_in_days              = var.log_retention_in_days
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
  frontend_desired_count             = var.frontend_desired_count
  db_endpoint                        = module.database.db_endpoint
  db_port                            = module.database.db_port
  db_name                            = module.database.db_name
  db_secret_arn                      = module.database.secret_arn
  assets_bucket_arn                  = module.storage.bucket_arn
  assets_bucket_name                 = module.storage.bucket_name
  acm_certificate_arn                = var.acm_certificate_arn
  auth0_domain                       = var.auth0_domain
  auth0_audience                     = var.auth0_audience
  auth0_roles_claim                  = var.auth0_roles_claim
}

# Staging only. Production is expected to serve traffic around the clock.
module "scheduler" {
  source = "../../modules/scheduler"

  env          = var.env
  project_name = var.project_name

  ecs_cluster_name = module.compute.ecs_cluster_name

  # Parked until UAT. Flip to false to put staging back on its daily schedule;
  # the services and the database also have to be started once by hand, because
  # the schedules only fire at their next cron time.
  suspended = true

  ecs_services = {
    "backend" = {
      name          = module.compute.backend_service_name
      arn           = module.compute.backend_service_arn
      desired_count = var.desired_count
    }
    "frontend-admin" = {
      name          = module.compute.frontend_admin_service_name
      arn           = module.compute.frontend_admin_service_arn
      desired_count = var.frontend_desired_count
    }
    "frontend-public" = {
      name          = module.compute.frontend_public_service_name
      arn           = module.compute.frontend_public_service_arn
      desired_count = var.frontend_desired_count
    }
  }

  db_instance_identifier = module.database.db_instance_identifier
  db_instance_arn        = module.database.db_instance_arn
}
