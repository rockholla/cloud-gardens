/**
 * See https://github.com/segmentio/stack for more info on the basis of this terraform strategy
 */

terraform {
  backend "s3" {
    bucket = "cloud-gardens" // this is just a basic default, will be set dynamically when tending gardens
    key = "garden" // this is just a basic default, will be set dynamically when tending gardens
    region = "us-west-2" // this is just a basic default, will be set dynamically when tending gardens
  }
}

variable "profile" {
  description = "the AWS profile to use"
}

variable "region" {
  description = "the AWS region in which resources are created, you must set the availability_zones variable as well if you define this value to something other than the default"
}

provider "aws" {
  profile = "${var.profile}"
  region = "${var.region}"
}

variable "name" {
  description = "the name of your garden, e.g. \"segment\""
}

variable "domain" {
  description = "the base domain name to use (top and second level e.g. \"gardens.local\")"
}

variable "ci_subdomain" {
  description = "the subdomain to use for the CI server URL"
  default = "ci"
}

variable "status_subdomain" {
  description = "the subdomain to use for the status server URL"
  default = "status"
}

variable "hosted_zone_id" {
  description = "the AWS Route53 hosted zone ID"
}

variable "key_name" {
  description = "the name of the ssh key pair to use, e.g. \"internal-key\""
}

variable "cidr" {
  description = "the CIDR block to provision for the VPC, if set to something other than the default, both internal_subnet_pattern and external_subnet_pattern have to be defined as well"
  default     = "10.30.0.0/16"
}

variable "internal_subnet_pattern" {
  description = "a pattern for setting internal subnets, x starts with 0, increments by 64 for each subnet, one in each availability zone"
  default     = "10.30.x.0/19"
}

variable "external_subnet_pattern" {
  description = "a pattern for setting external subnets, x starts with 32, increments by 64 for each subnet, one in each availability zone"
  default     = "10.30.x.0/20"
}

variable "bastion_count" {
  description = "the number of bastion instances"
  default     = 1
}

variable "bastion_instance_type" {
  description = "the instance type for the bastion"
  default = "t2.micro"
}

variable "ecs_cluster_name" {
  description = "the name of the cluster, if not specified the variable name will be used"
  default = ""
}

variable "ecs_instance_type" {
  description = "the instance type to use for your default ecs cluster"
  default     = "m4.large"
}

variable "ecs_instance_ebs_optimized" {
  description = "use EBS - not all instance types support EBS"
  default     = true
}

variable "ecs_min_size" {
  description = "the minimum number of instances to use in the default ecs cluster"

  // create 3 instances in our cluster by default
  // 2 instances to run our service with high-availability
  // 1 extra instance so we can deploy without port collisions
  default = 3
}

variable "ecs_max_size" {
  description = "the maximum number of instances to use in the default ecs cluster"
  default     = 100
}

variable "ecs_desired_capacity" {
  description = "the desired number of instances to use in the default ecs cluster"
  default     = 3
}

variable "ecs_root_volume_size" {
  description = "the size of the ecs instance root volume"
  default     = 25
}

variable "ecs_docker_volume_size" {
  description = "the size of the ecs instance docker volume"
  default     = 25
}

variable "ecs_docker_auth_type" {
  description = "the docker auth type, see https://godoc.org/github.com/aws/amazon-ecs-agent/agent/engine/dockerauth for the possible values"
  default     = ""
}

variable "ecs_docker_auth_data" {
  description = "a JSON object providing the docker auth data, see https://godoc.org/github.com/aws/amazon-ecs-agent/agent/engine/dockerauth for the supported formats"
  default     = ""
}

variable "ecs_security_groups" {
  description = "a comma separated list of security groups from which ingest traffic will be allowed on the ECS cluster, it defaults to allowing ingress traffic on port 22 and coming grom the ELBs"
  default     = ""
}

variable "ecs_ami" {
  description = "the AMI that will be used to launch EC2 instances in the ECS cluster"
  default     = ""
}

variable "extra_cloud_config_type" {
  description = "extra cloud config type"
  default     = "text/cloud-config"
}

variable "extra_cloud_config_content" {
  description = "extra cloud config content"
  default     = ""
}

data "aws_availability_zones" "available" {}

module "iam" {
  source  = "./iam"
  garden  = "${var.name}"
}

module "vpc" {
  source                  = "./vpc"
  garden                  = "${var.name}"
  cidr                    = "${var.cidr}"
  internal_subnet_pattern = "${var.internal_subnet_pattern}"
  external_subnet_pattern = "${var.external_subnet_pattern}"
  availability_zones      = "${data.aws_availability_zones.available.names}"
}

module "security_groups" {
  source      = "./security-groups"
  garden      = "${var.name}"
  vpc_id      = "${module.vpc.id}"
  cidr        = "${var.cidr}"
}

module "bastion" {
  source            = "./bastion"
  garden            = "${var.name}"
  domain            = "${var.domain}"
  ci_subdomain      = "${var.ci_subdomain}"
  status_subdomain  = "${var.status_subdomain}"
  region            = "${var.region}"
  hosted_zone_id    = "${var.hosted_zone_id}"
  instance_type     = "${var.bastion_instance_type}"
  instance_count    = "${var.bastion_count}"
  security_groups   = "${module.security_groups.bastion},${module.security_groups.internal_ssh}"
  vpc_id            = "${module.vpc.id}"
  subnet_id         = "${element(module.vpc.external_subnets, 0)}"
  key_name          = "${var.key_name}"
  aws_admin_id      = "${module.iam.admin_user_id}"
  aws_admin_secret  = "${module.iam.admin_user_secret}"
}

// The region in which the infra lives.
output "region" {
  value = "${var.region}"
}

// The bastion host IPs.
output "bastion_ips" {
  value = ["${module.bastion.external_ips}"]
}

// The URL of the status, the control center for the garden
output "status_url" {
  value = ["${module.bastion.status_url}"]
}

// The CI server URL
output "ci_url" {
  value = ["${module.bastion.ci_url}"]
}

// Comma separated list of internal subnet IDs.
output "internal_subnets" {
  value = "${module.vpc.internal_subnets}"
}

// Comma separated list of external subnet IDs.
output "external_subnets" {
  value = "${module.vpc.external_subnets}"
}

// ECS Service IAM role.
# output "iam_role" {
#   value = "${module.iam_role.arn}"
# }

# // Default ECS role ID. Useful if you want to add a new policy to that role.
# output "iam_role_default_ecs_role_id" {
#   value = "${module.iam_role.default_ecs_role_id}"
# }

# // S3 bucket ID for ELB logs.
# output "log_bucket_id" {
#   value = "${module.s3_logs.id}"
# }

# // The internal domain name, e.g "stack.local".
# output "domain_name" {
#   value = "${module.dns.name}"
# }

# // The default ECS cluster name.
# output "cluster" {
#   value = "${module.ecs_cluster.name}"
# }

// The VPC availability zones.
output "availability_zones" {
  value = "${module.vpc.availability_zones}"
}

// The VPC security group ID.
output "vpc_security_group" {
  value = "${module.vpc.security_group}"
}

// The VPC ID.
output "vpc_id" {
  value = "${module.vpc.id}"
}

// The default ECS cluster security group ID.
# output "ecs_cluster_security_group_id" {
#   value = "${module.ecs_cluster.security_group_id}"
# }

// Comma separated list of internal route table IDs.
output "internal_route_tables" {
  value = "${module.vpc.internal_rtb_id}"
}

// The external route table ID.
output "external_route_tables" {
  value = "${module.vpc.external_rtb_id}"
}