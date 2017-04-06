FROM ubuntu:16.04

RUN apt-get update
RUN apt-get install -y software-properties-common
RUN apt-add-repository -y ppa:ansible/ansible
RUN apt-get update
RUN apt-get -y dist-upgrade
RUN apt-get install -y ansible

CMD /lib/systemd/systemd