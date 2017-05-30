/**
 * The bastion serves as an entrypoint for the ECS cluster.  You can ssh to the ECS cluster instances through it and it also acts as the
 * HTTP proxy/load balancer for services
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

resource "aws_instance" "bastion" {
  count                  = "${var.instance_count}"
  ami                    = "${var.ami_id}"
  source_dest_check      = false
  instance_type          = "${var.instance_type}"
  subnet_id              = "${var.subnet_id}"
  key_name               = "${var.key_name}"
  vpc_security_group_ids = ["${split(",",var.security_groups)}"]
  monitoring             = true

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
      private_key = "${file(format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name))}"
    }
  }

  provisioner "file" {
    content = <<EOF
aws_access_key_id: ${var.aws_admin_id}
aws_secret_access_key: ${var.aws_admin_secret}
traefik_ci_subdomain: ${var.ci_subdomain}
traefik_status_subdomain: ${var.status_subdomain}
aws_config_directories:
  - { path: /home/ubuntu/.aws, owner: ubuntu }
  - { path: /root/.aws, owner: root }
EOF
    destination = "/home/ubuntu/ansible/vars/overrides/aws.yml"
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name))}"
    }
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mv /home/ubuntu/ansible /srv/ansible",
      "until [ -f /var/lib/cloud/instance/boot-finished ]; do sleep 1; done",
      "sudo chmod +x /srv/ansible/provision.sh",
      "sudo /srv/ansible/provision.sh bastion.yml"
    ]
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file(format("../../.gardens/%s/%s/.keys/%s", var.profile, var.garden, var.key_name))}"
    }
  }
}

resource "aws_route53_record" "ci" {
  zone_id = "${var.hosted_zone_id}"
  name    = "${var.ci_subdomain}.${var.domain}"
  type    = "A"
  ttl     = "300"
  records = ["${aws_instance.bastion.*.public_ip}"]
}

resource "aws_route53_record" "status" {
  zone_id = "${var.hosted_zone_id}"
  name    = "${var.status_subdomain}.${var.domain}"
  type    = "A"
  ttl     = "300"
  records = ["${aws_instance.bastion.*.public_ip}"]
}

output "external_ips" {
  value = ["${aws_instance.bastion.*.public_ip}"]
}

output "ci_url" {
  value = "https://${aws_route53_record.ci.fqdn}"
}

output "status_url" {
  value = "https://${aws_route53_record.status.fqdn}"
}