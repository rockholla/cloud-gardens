#!/bin/bash

function get_container_host_ips() {
  garden_name="$1"
  ips=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=${garden_name}-ecs-cluster-host" --query "Reservations[].Instances[].PrivateIpAddress" --output text)
  echo $ips
}

function get_container_host_ip() {
  garden_name="$1"
  subdomain="$2"
  public_ip=$(ecs-cli ps -c "${garden_name}-ecs-cluster" | grep -e "RUNNING.*${subdomain}" | awk '{print $3}' | awk -F ":" '{print $1}')
  private_ip=$(aws ec2 describe-instances --filters "Name=ip-address,Values=${public_ip}" --query "Reservations[0].Instances[0].PrivateIpAddress" --output text)
  echo $private_ip
}
