variable "env" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "azs" {
  description = "Availability zones to spread subnets across (exactly 2)"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (one per AZ)"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (one per AZ)"
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Provision a NAT gateway so private subnets have egress. Defaults true; staging sets it false and runs its ECS tasks in the public subnets instead."
  type        = bool
  default     = true
}

variable "frontend_container_port" {
  description = "Container port the frontend listens on (used for the ECS tasks security group)"
  type        = number
}

variable "backend_container_port" {
  description = "Container port the backend listens on (used for the ECS tasks security group)"
  type        = number
}
