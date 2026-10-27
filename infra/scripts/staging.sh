#!/usr/bin/env bash
# Manual staging on/off, outside the 09:00-17:00 schedule.
#   bash infra/scripts/staging.sh off   # scale ECS to 0, stop RDS
#   bash infra/scripts/staging.sh on    # start RDS, wait, scale ECS to 1
# The ALB keeps billing either way; only `terraform destroy` removes it.
set -euo pipefail

export AWS_DEFAULT_REGION=ap-southeast-3
PREFIX=sppg-dashboard-staging
CLUSTER=$PREFIX-cluster
DB=$PREFIX-db
SERVICES=(backend frontend-admin frontend-public)

scale() {
  for s in "${SERVICES[@]}"; do
    aws ecs update-service --cluster "$CLUSTER" --service "$PREFIX-$s" --desired-count "$1" --query 'service.serviceName' --output text
  done
}

case "${1:-}" in
  off)
    scale 0
    # Fails harmlessly if RDS is already stopped.
    aws rds stop-db-instance --db-instance-identifier "$DB" --query 'DBInstance.DBInstanceStatus' --output text || true
    ;;
  on)
    aws rds start-db-instance --db-instance-identifier "$DB" --query 'DBInstance.DBInstanceStatus' --output text || true
    aws rds wait db-instance-available --db-instance-identifier "$DB"
    scale 1
    ;;
  *)
    echo "usage: $0 on|off" >&2
    exit 1
    ;;
esac
