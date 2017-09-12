#!/bin/bash

set -e

source ~/.profile
cd ~/scripts
source common-variables.sh
source repo-branch-parser.sh

echo "Deploying ${repo_branch_id}..."

if [ $Pull == true ] || [ ! -d ~/.garden/repos-branches/$repo_branch_id ]; then
  . ~/scripts/clone.sh
fi

clone=false

if $Build; then
  . ~/scripts/build.sh
fi

if $Test; then
  . ~/scripts/test.sh
fi

echo "Determining alias/subdomain for the deployment..."
cd $scripts_dir
alias=$(./yaml-reader.py ~/.garden/repos-branches/$repo_branch_id/.gardens/config.yml alias)
subdomain="${alias}-${branch_formatted}"
echo "Set subdomain for deployment as $subdomain"

echo "Initializing local cache for the deployment..."
cd ~/.garden/repos-branches/$repo_branch_id
mkdir -p ~/.garden/deployments/$subdomain
cp .gardens/config.yml ~/.garden/deployments/$subdomain/
local_image="${repo_formatted}:${branch_formatted}"
custom_image_build=false
deployment_cache_path="/var/lib/jenkins/.garden/deployments/$subdomain"

eval_id="$repo_branch_id"
eval_path="repos-branches/${eval_id}"
eval_config_path="repos-branches/${eval_id}/.gardens"
eval_type="before_deploy"
. "${scripts_dir}/eval.sh"

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
cp docker-compose.yml ~/.garden/deployments/$subdomain/

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
while ! curl --insecure -s -o /dev/null -w "%{http_code}" "https://${subdomain}.${GARDEN_DOMAIN}/wp-login.php" | grep "200"; do
  sleep 5
done

echo "Deployment ready at https://${subdomain}.${GARDEN_DOMAIN}"

eval_id="$repo_branch_id"
eval_path="repos-branches/${eval_id}"
eval_config_path="repos-branches/${eval_id}/.gardens"
eval_type="after_deploy"
. "${scripts_dir}/eval.sh"
