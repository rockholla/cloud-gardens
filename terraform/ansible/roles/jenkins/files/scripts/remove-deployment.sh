#!/bin/bash

set -e

source ~/.profile
cd ~/scripts
source common-variables.sh

subdomain="$Deployment"
deployment_cache_path="/var/lib/jenkins/.garden/deployments/$subdomain"

echo "Removing ECS resources..."
cd ~/.garden/deployments/$subdomain

eval_id="$subdomain"
eval_path="deployments/${eval_id}"
eval_config_path="$eval_path"
eval_type="before_remove"
. "${scripts_dir}/eval.sh"

ECS_CLUSTER="${GARDEN_NAME}-ecs-cluster" ecs-cli compose --file "docker-compose.yml" --project-name "${subdomain}" service rm
aws ecs list-task-definitions --output text | grep "/${subdomain}" | awk '{print $2}' | while read line; do
  aws ecs deregister-task-definition --task-definition $line
done

eval_id="$subdomain"
eval_path="deployments/${eval_id}"
eval_config_path="$eval_path"
eval_type="after_remove"
. "${scripts_dir}/eval.sh"

echo "Removing local deployment directory..."
rm -rf ~/.garden/deployments/$subdomain
