/**
 * Creates all general s3 buckets for garden use
 */

variable "garden" {
  description = "the name of the garden"
}

variable "account_id" {
  description = "the AWS account ID"
}

variable "region" {
  description = "the AWS region in which resources are created, you must set the availability_zones variable as well if you define this value to something other than the default"
}

resource "aws_s3_bucket" "garden_primary" {
  bucket = "${var.account_id}-${var.garden}"
  acl    = "private"
  region = "${var.region}"
}

resource "aws_s3_bucket" "garden_backups" {
  bucket = "${var.account_id}-${var.garden}-backups"
  acl    = "private"
  region = "${var.region}"
  lifecycle_rule {
    id      = "backups"
    prefix  = "*"
    enabled = true
    expiration {
      days = 14
    }
  }
  lifecycle_rule {
    id      = "jenkins-backups"
    prefix  = "jenkins-"
    enabled = true
    expiration {
      days = 5
    }
  }
}

resource "aws_iam_user" "s3_garden_user" {
  name = "${var.garden}-s3-user"
}

resource "aws_iam_access_key" "s3_garden_user" {
  user = "${aws_iam_user.s3_garden_user.name}"
}

resource "aws_iam_user_policy" "s3_garden_user" {
  name = "test"
    user = "${aws_iam_user.s3_garden_user.name}"
    policy= <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::${aws_s3_bucket.garden_primary.id}",
                "arn:aws:s3:::${aws_s3_bucket.garden_primary.id}/*",
                "arn:aws:s3:::${aws_s3_bucket.garden_backups.id}",
                "arn:aws:s3:::${aws_s3_bucket.garden_backups.id}/*"
            ]
        }
   ]
}
EOF
}

output "bucket_uris" {
  value = {
    "primary" = "${aws_s3_bucket.garden_primary.bucket_domain_name}",
    "backups" = "${aws_s3_bucket.garden_backups.bucket_domain_name}"
  }
}

output "bucket_names" {
  value = {
    "primary" = "${aws_s3_bucket.garden_primary.id}",
    "backups" = "${aws_s3_bucket.garden_backups.id}"
  }
}

output "user_id" {
  value = "${aws_iam_access_key.s3_garden_user.id}"
}

output "user_secret" {
  value = "${aws_iam_access_key.s3_garden_user.secret}"
}
