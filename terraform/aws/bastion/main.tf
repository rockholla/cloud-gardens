/**
 *
 * The bastion serves as an entrypoint for the garden.  You can ssh to the ECS cluster instances through it and it also acts as the
 * HTTP proxy/load balancer for services.  Additionally handles the following:
 *
 * 1) SSL cert management
 * 2) CI/CD services
 */

variable "garden" {
  description = "the garden name"
}

variable "profile" {
  description = "the AWS profile to use"
}

variable "domain" {
  description = "the top level domain name"
}

variable "hosted_zone_id" {
  description = "the AWS Route53 hosted zone ID"
}

variable "instance_type" {
  default     = "t2.micro"
  description = "Instance type, see a list at: https://aws.amazon.com/ec2/instance-types/"
}

variable "disk_size" {
  default     = 25
  description = "disk size of a bastion instance"
}

variable "instance_count" {
  description = "the number of bastion instances to stand up"
}

variable "security_groups" {
  description = "a comma separated lists of security group IDs"
}

variable "key_name" {
  description = "the SSH key pair name"
}

variable "subnet_id" {
  description = "an external subnet id"
}

variable "aws_admin_id" {
  description = "the AWS admin user access key id"
}

variable "aws_admin_secret" {
  description = "the AWS admin user secret access key"
}

variable "ci_subdomain" {
  description = "the subdomain to use for the CI server URL"
}

variable "status_subdomain" {
  description = "the subdomain to use for the status server URL"
}

variable "ami_id" {
  description = "the AMI ID to use for the bastion instance(s)"
}

variable "letsencrypt_ca" {
  description = "the uri to the LetsEncrypt certificate authority, useful in setting for production vs staging"
}

variable "letsencrypt_registration_info_base64" {
  description = "registration info base64 encoded"
}

variable "letsencrypt_account_key_base64" {
  description = "pem key based64 encoded"
}

variable "ecs_cluster_name" {
  description = "The name of the ECS cluster for this garden"
}

variable "region" {
  description = "The AWS region"
}

variable "ansible_tags" {
  description = "A comma-delimited list of ansible tags"
  default = "all"
}

resource "aws_instance" "bastion" {
  count                  = "${var.instance_count}"
  ami                    = "${var.ami_id}"
  source_dest_check      = false
  instance_type          = "${var.instance_type}"
  subnet_id              = "${var.subnet_id}"
  key_name               = "${var.key_name}"
  vpc_security_group_ids = ["${split(",",var.security_groups)}"]
  monitoring             = true

  root_block_device {
    volume_type = "gp2"
    volume_size = "${var.disk_size}"
  }

  tags {
    Name    = "${var.garden}-bastion-${count.index + 1}"
    Garden  = "${var.garden}"
  }
}

resource "null_resource" "bastion_setup" {
  depends_on = ["aws_instance.bastion"]
  count = "${aws_instance.bastion.count}"
  triggers {
    always_run = "${uuid()}"
  }

  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name))}"
      host        = "${element(aws_instance.bastion.*.public_ip, count.index)}"
    }
    inline = [
      "sudo mkdir -p /home/ubuntu/ansible",
      "sudo chown ubuntu:ubuntu /home/ubuntu/ansible"
    ]
  }
}

resource "null_resource" "bastion_copy_files" {
  depends_on = ["null_resource.bastion_setup"]
  count = "${aws_instance.bastion.count}"
  triggers {
    always_run = "${uuid()}"
  }

  provisioner "file" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name))}"
      host        = "${element(aws_instance.bastion.*.public_ip, count.index)}"
    }
    source = "../ansible/"
    destination = "/home/ubuntu/ansible/"
  }
}

resource "null_resource" "bastion_copy_key" {
  depends_on = ["null_resource.bastion_copy_files"]
  count = "${aws_instance.bastion.count}"
  triggers {
    always_run = "${uuid()}"
  }

  provisioner "file" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name))}"
      host        = "${element(aws_instance.bastion.*.public_ip, count.index)}"
    }
    source = "${format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name)}"
    destination = "/home/ubuntu/.ssh/bastion_rsa"
  }
}

resource "null_resource" "bastion_set_terraform_overrides" {
  depends_on = ["null_resource.bastion_copy_key"]
  count = "${aws_instance.bastion.count}"
  triggers {
    always_run = "${uuid()}"
  }

  provisioner "file" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name))}"
      host        = "${element(aws_instance.bastion.*.public_ip, count.index)}"
    }
    content = <<EOF
domain: "${var.domain}"
hosted_zone_id: "${var.hosted_zone_id}"
garden: "${var.garden}"
aws_access_key_id: "${var.aws_admin_id}"
aws_secret_access_key: "${var.aws_admin_secret}"
aws_user_paths:
  - { path: /home/ubuntu, owner: ubuntu, group: ubuntu }
  - { path: /root, owner: root, group: ubuntu }
traefik_ci_subdomain: "${var.ci_subdomain}"
traefik_status_subdomain: "${var.status_subdomain}"
traefik_ecs_region: "${var.region}"
traefik_ecs_cluster_name: "${var.ecs_cluster_name}"
letsencrypt_ca: "${var.letsencrypt_ca}"
letsencrypt_registration_info_base64: "${var.letsencrypt_registration_info_base64}"
letsencrypt_account_key_base64: "${var.letsencrypt_account_key_base64}"
bastion_is_master: ${count.index == 0 ? "yes" : "no"}
EOF
    destination = "/home/ubuntu/ansible/vars/overrides/terraform.yml"
  }
}

resource "null_resource" "bastion_provision" {
  depends_on = ["null_resource.bastion_set_terraform_overrides"]
  count = "${aws_instance.bastion.count}"
  triggers {
    always_run = "${uuid()}"
  }

  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name))}"
      host        = "${element(aws_instance.bastion.*.public_ip, count.index)}"
    }
    inline = [
      "until [ -f /var/lib/cloud/instance/boot-finished ]; do sleep 1; done",
      "sudo chmod 0600 /home/ubuntu/.ssh/bastion_rsa",
      "sudo chmod +x /home/ubuntu/ansible/provision.sh",
      "sudo /home/ubuntu/ansible/provision.sh --tags ${var.ansible_tags} bastion.yml"
    ]
  }
}

resource "null_resource" "bastion_set_ssl_overrides" {
  depends_on = ["null_resource.bastion_provision"]
  count = "${aws_instance.bastion.count}"
  triggers {
    always_run = "${uuid()}"
  }

  provisioner "file" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name))}"
      host        = "${element(aws_instance.bastion.*.public_ip, count.index)}"
    }
    content = <<EOF
bastion_master_ip: "${count.index == 0 ? "" : aws_instance.bastion.0.public_ip}"
bastion_master_ready: yes
EOF
    destination = "/home/ubuntu/ansible/vars/overrides/ssl.yml"
  }
}

resource "null_resource" "bastion_certs_sync" {
  depends_on = ["null_resource.bastion_set_ssl_overrides"]
  count = "${aws_instance.bastion.count}"
  triggers {
    always_run = "${uuid()}"
  }

  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name))}"
      host        = "${element(aws_instance.bastion.*.public_ip, count.index)}"
    }
    inline = [
      "cd /home/ubuntu/ansible && sudo ansible-playbook -i inventory/localhost --tags=ssl bastion.yml"
    ]
  }
}

data "external" "done" {
  depends_on = ["null_resource.bastion_certs_sync"]
  program = ["echo", "{\"message\": \"done\"}"]
}

resource "aws_route53_record" "catchall" {
  zone_id = "${var.hosted_zone_id}"
  name    = "*.${var.domain}"
  type    = "A"
  ttl     = "300"
  records = ["${aws_instance.bastion.*.public_ip}"]
}

resource "aws_route53_record" "mx" {
  zone_id = "${var.hosted_zone_id}"
  name    = "${var.domain}"
  type    = "MX"
  ttl     = "300"
  records = ["10 mx1.${var.domain}"]
}

output "external_ips" {
  value = ["${aws_instance.bastion.*.public_ip}"]
}

output "ci_url" {
  value = "https://${var.ci_subdomain}.${var.domain}"
}

output "status_url" {
  value = "https://${var.status_subdomain}.${var.domain}"
}

output "done_output" {
  value = "${data.external.done.result}"
}