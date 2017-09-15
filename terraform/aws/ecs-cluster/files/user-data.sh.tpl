#!/bin/sh

sudo echo 'SERVER_ENVIRONMENT=${environment}' >> /etc/environment
sudo echo 'SERVER_GROUP=${name}' >> /etc/environment
sudo echo 'SERVER_REGION=${region}' >> /etc/environment
sudo mkdir -p /etc/ecs
sudo echo 'ECS_CLUSTER=${name}' >> /etc/ecs/ecs.config
sudo echo 'ECS_ENGINE_AUTH_TYPE=${docker_auth_type}' >> /etc/ecs/ecs.config
sudo echo 'ECS_ENGINE_AUTH_DATA=${docker_auth_data}' >> /etc/ecs/ecs.config
sudo yum -y install rsync
sudo mkdir -p /opt/deployments
sudo chown ec2-user:ec2-user /opt/deployments
