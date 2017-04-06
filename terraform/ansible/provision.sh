#!/bin/bash

cd "$(dirname "$0")"
apt-get install software-properties-common
apt-add-repository -y ppa:ansible/ansible
apt-get update
apt-get -y dist-upgrade
apt-get install -y ansible
ansible-galaxy install -r requirements.yml
ansible-playbook -i inventory/localhost $1