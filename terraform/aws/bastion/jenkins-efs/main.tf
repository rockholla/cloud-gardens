variable "garden" {
  description = "the garden name"
}

variable "vpc_id" {
  description = "the VPC where the EFS resources will go"
}

variable "subnet_id" {
  description = "The subnet where the EFS resources will be used"
}

variable "bastion_security_group_id" {
  description = "the security group id of the bastion instance"
}

resource "aws_security_group" "mount" {
  name        = "${var.garden}-efs-mount"
  description = "A security group for the EFS mount in the bastion"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port         = 2049
    to_port           = 2049
    protocol          = "tcp"
    security_groups   = ["${var.bastion_security_group_id}"]
  }

  egress {
    from_port         = 2049
    to_port           = 2049
    protocol          = "tcp"
    security_groups   = ["${var.bastion_security_group_id}"]
  }

  tags {
    Name    = "${var.garden}-efs-mount"
    Garden  = "${var.garden}"
  }
}

resource "random_id" "creation_token" {
  byte_length   = 8
  prefix        = "${var.garden}-"
}

resource "aws_efs_file_system" "efs" {
  creation_token = "${random_id.creation_token.hex}"
  tags {
    Name = "${var.garden}-bastion-jenkins"
  }
}

resource "aws_efs_mount_target" "efs" {
  count           = 1
  file_system_id  = "${aws_efs_file_system.efs.id}"
  subnet_id       = "${var.subnet_id}"
  security_groups = ["${aws_security_group.mount.id}"]
}

output "file_system_id" {
  value = "${aws_efs_file_system.efs.id}"
}

output "mount_target" {
  value = "${aws_efs_mount_target.efs.dns_name}"
}