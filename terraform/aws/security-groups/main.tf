/**
 * Creates basic security groups to be used by instances
 */

variable "vpc_id" {
  description = "The VPC ID"
}

variable "garden" {
  description = "The name of the garden"
}

variable "cidr" {
  description = "The cidr block to use for internal security groups"
}

resource "aws_security_group" "bastion" {
  name        = "${format("%s-bastion", var.garden)}"
  description = "Allows ssh from the world"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags {
    Name    = "${format("%s bastion", var.garden)}"
    Garden  = "${var.garden}"
  }
}

resource "aws_security_group" "internal_ssh" {
  name        = "${format("%s-internal-ssh", var.garden)}"
  description = "Allows ssh from bastion"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = ["${aws_security_group.bastion.id}"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "tcp"
    cidr_blocks = ["${var.cidr}"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags {
    Name    = "${format("%s internal ssh", var.garden)}"
    Garden  = "${var.garden}"
  }
}

// External SSH allows ssh connections on port 22 from the world.
output "bastion" {
  value = "${aws_security_group.bastion.id}"
}

// Internal SSH allows ssh connections from the bastion security group.
output "internal_ssh" {
  value = "${aws_security_group.internal_ssh.id}"
}