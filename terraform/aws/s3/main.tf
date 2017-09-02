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
    prefix  = ""
    enabled = true
    expiration {
      days = 30
    }
  }
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