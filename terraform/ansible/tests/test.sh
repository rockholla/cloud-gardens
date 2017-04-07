#!/bin/bash

playbook=${1:-"all"}
container_id=cloud-gardens-ansible-tests
tests_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ansible_dir=$(realpath $tests_dir/../)
image_name=cloud-gardens:ansible-tests

red='\033[0;31m'
green='\033[0;32m'
neutral='\033[0m'

timestamp=$(date +%s)

cleanup () {
    docker rm -f $container_id
    exit $1
}

{
    printf ${green}"Building base docker image and starting it up...\n"${neutral}
    docker build -t $image_name "$tests_dir" || exit 1
    docker run --detach --volume="$ansible_dir":/etc/ansible/cloud-gardens-tests:rw --name $container_id --privileged $image_name /lib/systemd/systemd || exit 1

    printf "\n"

    docker exec --tty $container_id env TERM=xterm ansible-galaxy install -r /etc/ansible/cloud-gardens-tests/requirements.yml || cleanup 1

    printf "\n"

    # Test Ansible syntax.
    printf ${green}"Checking Ansible playbook syntax...\n"${neutral}
    docker exec --tty $container_id env TERM=xterm ansible-playbook -i /etc/ansible/cloud-gardens-tests/inventory/localhost /etc/ansible/cloud-gardens-tests/$playbook --syntax-check || cleanup 1

    printf "\n"

    # Run Ansible playbook.
    printf ${green}"Running full playbook...\n"${neutral}
    docker exec $container_id env TERM=xterm env ANSIBLE_FORCE_COLOR=1 ansible-playbook -i /etc/ansible/cloud-gardens-tests/inventory/localhost /etc/ansible/cloud-gardens-tests/$playbook || cleanup 1

    # Run Ansible playbook again (idempotence test).
    printf ${green}"Running playbook again: idempotence test...\n"${neutral}
    idempotence=$(mktemp)
    docker exec $container_id ansible-playbook -i /etc/ansible/cloud-gardens-tests/inventory/localhost /etc/ansible/cloud-gardens-tests/$playbook | tee -a $idempotence
    tail $idempotence \
      | grep -q 'changed=0.*failed=0' \
      && (printf ${green}'Idempotence test: pass'${neutral}"\n") \
      || (printf ${red}'Idempotence test: fail'${neutral}"\n" && cleanup 1)
}

 cleanup 0