#!/bin/bash

cd "$(dirname "$0")"
DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confnew" install software-properties-common
DEBIAN_FRONTEND=noninteractive apt-add-repository -y ppa:ansible/ansible
DEBIAN_FRONTEND=noninteractive apt-get update
DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confnew" dist-upgrade
DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confnew" install ansible
ansible-galaxy install -r requirements.yml
ansible-playbook -i inventory/localhost $1