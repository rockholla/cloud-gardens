FROM ubuntu:16.04

RUN apt-get update
RUN apt-get install -y software-properties-common
RUN apt-add-repository -y ppa:ansible/ansible
RUN apt-get update
RUN apt-get -y dist-upgrade
RUN apt-get install -y ansible

RUN mkdir -p /root/.ssh && chmod 0700 /root/.ssh
COPY ./bastion_rsa /root/.ssh/bastion_rsa
RUN chmod 0600 /root/.ssh/bastion_rsa

ENTRYPOINT ["tail", "-f", "/dev/null"]