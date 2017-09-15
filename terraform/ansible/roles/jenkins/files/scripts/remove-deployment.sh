#!/bin/bash

set -e

source $JENKINS_HOME/.profile
source $JENKINS_HOME/scripts/common-variables.sh
source $JENKINS_HOME/scripts/garden-helper.sh

subdomain="$Deployment"
deployment_cache_path="/var/lib/jenkins/.garden/deployments/$subdomain"

echo "Removing ECS resources..."
cd $JENKINS_HOME/.garden/deployments/$subdomain

eval_id="$subdomain"
eval_path="deployments/${eval_id}"
eval_config_path="$eval_path"
eval_type="before_remove"
. "${scripts_dir}/eval.sh"

echo "Removing volume on the ECS host"
private_ip=$(get_container_host_ip $GARDEN_NAME $subdomain)
ssh -i $JENKINS_HOME/.ssh/bastion_rsa "ec2-user@${private_ip}" '
  sudo rm -rf /opt/deployments/'"${subdomain}"'
'
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
rm -rf $JENKINS_HOME/.garden/deployments/$subdomain
