/**
 * The bastion serves as an entrypoint for the ECS cluster.  You can ssh to the ECS cluster instances through it and it also acts as the
 * HTTP proxy/load balancer for services
 */

variable "garden" {
  description = "The garden name"
}

variable "instance_type" {
  default     = "t2.micro"
  description = "Instance type, see a list at: https://aws.amazon.com/ec2/instance-types/"
}

variable "instance_count" {
  description = "the number of bastion instances to stand up"
}

variable "region" {
  description = "AWS Region, e.g us-west-2"
}

variable "security_groups" {
  description = "a comma separated lists of security group IDs"
}

variable "vpc_id" {
  description = "VPC ID"
}

variable "key_name" {
  description = "The SSH key pair name"
}

variable "subnet_id" {
  description = "A external subnet id"
}

module "ami" {
  source        = "github.com/terraform-community-modules/tf_aws_ubuntu_ami/ebs"
  region        = "${var.region}"
  distribution  = "xenial"
  instance_type = "${var.instance_type}"
  storagetype   = "ebs-ssd"
}

resource "aws_instance" "bastion" {
  count                  = "${var.instance_count}"
  ami                    = "${module.ami.ami_id}"
  source_dest_check      = false
  instance_type          = "${var.instance_type}"
  subnet_id              = "${var.subnet_id}"
  key_name               = "${var.key_name}"
  vpc_security_group_ids = ["${split(",",var.security_groups)}"]
  monitoring             = true
  user_data              = "${file(format("%s/user_data.sh", path.module))}"

  tags {
    Name    = "${var.garden}-bastion-${count.index + 1}"
    Garden  = "${var.garden}"
  }

  provisioner "file" {
    source = "../ansible"
    destination = "/home/ubuntu/ansible"
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.keys/%s", var.key_name))}"
    }
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mv /home/ubuntu/ansible /srv/ansible",
      "until [ -f /var/lib/cloud/instance/boot-finished ]; do sleep 1; done",
      "sudo apt-add-repository -y ppa:ansible/ansible",
      "sudo apt-get update",
      "sudo apt-get -y dist-upgrade",
      "sudo apt-get install -y ansible",
      "sudo bash -c 'cd /srv/ansible; ansible-galaxy install -r requirements.yml; ansible-playbook -i inventory/localhost bastion.yml'"
    ]
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.keys/%s", var.key_name))}"
    }
  }
}

resource "aws_eip" "bastion" {
  count    = "${var.instance_count}"
  instance = "${element(aws_instance.bastion.*.id, count.index)}"
  vpc      = true
}

// Bastion external IP addresses.
output "external_ips" {
  value = ["${aws_eip.bastion.*.public_ip}"]
}