#!/bin/bash

set -e

source $JENKINS_HOME/.profile
source $JENKINS_HOME/scripts/common-variables.sh
source $JENKINS_HOME/scripts/repo-branch-parser.sh
source $JENKINS_HOME/scripts/garden-helper.sh

echo "Deploying ${repo_branch_id}..."

if [ ! -d $JENKINS_HOME/.garden/repos-branches/$repo_branch_id ]; then
  Build=true
  Pull=true
fi

if $Pull; then
  . $JENKINS_HOME/scripts/clone.sh
fi

echo "Determining alias/subdomain for the deployment..."
alias=$($JENKINS_HOME/scripts/yaml-reader.py $JENKINS_HOME/.garden/repos-branches/$repo_branch_id/.gardens/config.yml alias)
if [ -z "$alias" ]; then
  alias="$repo_formatted"
fi
subdomain="${alias}-${branch_formatted}"
echo "Set subdomain for deployment as $subdomain"
if [ ! -d "$JENKINS_HOME/.garden/deployments/$subdomain" ]; then
  Build=true
fi

clone=false

if $Build; then
  . $JENKINS_HOME/scripts/build.sh false
fi

if $Test; then
  . $JENKINS_HOME/scripts/test.sh false
fi

echo "Initializing local cache for the deployment..."
cd $JENKINS_HOME/.garden/repos-branches/$repo_branch_id
mkdir -p $JENKINS_HOME/.garden/deployments/$subdomain
cp .gardens/config.yml $JENKINS_HOME/.garden/deployments/$subdomain/
local_image="${repo_formatted}:${branch_formatted}"
custom_image_build=false
deployment_cache_path="/var/lib/jenkins/.garden/deployments/$subdomain"
echo "$repo_branch_id" > $deployment_cache_path/repo_branch_id
echo "$repo_formatted" > $deployment_cache_path/repo_formatted

eval_id="$repo_branch_id"
eval_path="repos-branches/${eval_id}"
eval_config_path="repos-branches/${eval_id}/.gardens"
eval_type="before_deploy"
. "${scripts_dir}/eval.sh"

echo "Syncing project source code to our ECS host(s)"
for ip in $(get_container_host_ips $GARDEN_NAME); do
  rsync --rsync-path="sudo rsync" -av -e "ssh -i $JENKINS_HOME/.ssh/bastion_rsa" "$JENKINS_HOME/.garden/repos-branches/$repo_branch_id/" ec2-user@$ip:/opt/deployments/$subdomain/ | sed '0,/^$/d' &
done
wait

if $Build; then
  cp .gardens/Dockerfile Dockerfile
  ecr_login_cmd=$(aws ecr get-login)
  ecr_login_cmd=${ecr_login_cmd/\-e none/}
  eval $ecr_login_cmd
  if ! aws ecr describe-repositories --output text | grep -e "\\s$repo_formatted\\s"; then
    echo "Creating new EC2 container repository for $repo_formatted..."
    aws ecr create-repository --repository-name "$repo_formatted"
  fi
  if ! $custom_image_build; then
    echo "Building $local_image docker image..."
    docker build -f ./Dockerfile --pull -t "$local_image" .
  fi
  account_id=$(aws ec2 describe-security-groups --group-names 'Default' --query 'SecurityGroups[0].OwnerId' --output text)
  ecr_image_name="${account_id}.dkr.ecr.${GARDEN_AWS_REGION}.amazonaws.com/${repo_formatted}:${branch_formatted}"
  docker tag "$local_image" "$ecr_image_name"
  docker push "$ecr_image_name"

  echo "Use docker-compose to start the deployment to ECS..."
  cp .gardens/docker-compose.yml docker-compose.yml
  perl -pi -e "s@\{\{ image \}\}@${ecr_image_name}@g" docker-compose.yml
  perl -pi -e "s@\{\{ domain \}\}@${GARDEN_DOMAIN}@g" docker-compose.yml
  perl -pi -e "s@\{\{ subdomain \}\}@${subdomain}@g" docker-compose.yml
  perl -pi -e "s@\{\{ timestamp \}\}@${timestamp}@g" docker-compose.yml
  cp docker-compose.yml $JENKINS_HOME/.garden/deployments/$subdomain/

  set +e

  echo "Creating an ECS service for the deploy if it's not already created..."
  ECS_CLUSTER="${GARDEN_NAME}-ecs-cluster" ecs-cli compose --file "docker-compose.yml" --project-name "${subdomain}" service create &>/dev/null
  echo "Bringing up the ECS service..."
  service_up_result=$(ECS_CLUSTER="${GARDEN_NAME}-ecs-cluster" ecs-cli compose --file "docker-compose.yml" --project-name "${subdomain}" service up 2>&1)

  if [ $? -ne 0 ]; then
    printf "Error bringing up the ECS service:\n${service_up_result}"
    exit 1
  fi

  set -e

  # Wait for the service/site/deployment to be ready
  echo "Waiting for the deployment to become ready..."
  while curl --insecure -s -o /dev/null -w "%{http_code}" "https://${subdomain}.${GARDEN_DOMAIN}" | grep -e "404" -e "502" -e "503"; do
    sleep 5
  done
fi

eval_id="$repo_branch_id"
eval_path="repos-branches/${eval_id}"
eval_config_path="repos-branches/${eval_id}/.gardens"
eval_type="after_deploy"
. "${scripts_dir}/eval.sh"

echo "Deployment is done and the environment is ready at https://${subdomain}.${GARDEN_DOMAIN}"
