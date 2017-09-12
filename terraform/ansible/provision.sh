#!/bin/bash

cd "$(dirname "$0")"
DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confnew" install software-properties-common
DEBIAN_FRONTEND=noninteractive apt-add-repository -y ppa:ansible/ansible
DEBIAN_FRONTEND=noninteractive apt-get update
DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confnew" dist-upgrade
DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confnew" install ansible
if [ -f requirements.yml ]; then
  ansible-galaxy install -r requirements.yml
fi
ansible-playbook -i inventory/localhost "$@"
