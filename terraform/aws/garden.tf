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

variable "account_id" {
  description = "the AWS account ID"
}

variable "letsencrypt_ca" {
  description = "the uri to the LetsEncrypt certificate authority, useful in setting for production vs staging"
}

variable "letsencrypt_registration_info_base64" {
  description = "registration info base64 encoded"
  default = ""
}

variable "letsencrypt_account_key_base64" {
  description = "pem key based64 encoded"
  default = ""
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

variable "bastion_disk_size" {
  description = "the root device disk size for a bastion instance (in GBs)"
  default     = 25
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

  // create 2 instances in our cluster by default
  // 1 instances to run our service with high-availability
  // 1 extra instance so we can deploy without port collisions
  default = 2
}

variable "ecs_max_size" {
  description = "the maximum number of instances to use in the default ecs cluster"
  default     = 5
}

variable "ecs_desired_capacity" {
  description = "the desired number of instances to use in the default ecs cluster"
  default     = 2
}

variable "ecs_root_volume_size" {
  description = "the size of the ecs instance root volume"
  default     = 50
}

variable "ecs_docker_volume_size" {
  description = "the size of the ecs instance docker volume"
  default     = 50
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
  description = "a comma separated list of security groups from which all ingest traffic will be allowed on the ECS cluster"
  default     = ""
}

data "aws_ami" "default_ami" {
  most_recent = true
  filter {
    name    = "name"
    values  = ["ubuntu/images/hvm-ssd/ubuntu-xenial-16.04-amd64-server-*"]
  }
}

variable "ecs_ami" {
  description = "The AMI that will be used to launch EC2 instances in the ECS cluster"
  default     = ""
}

variable "default_ecs_ami" {
  default = {
    us-east-1       = "ami-0e297018"
    us-east-2       = "ami-43d0f626"
    us-west-1       = "ami-fcd7f59c"
    us-west-2       = "ami-596d6520"
    eu-west-1       = "ami-5ae4f83c"
    eu-west-2       = "ami-ada6b1c9"
    eu-central-1    = "ami-25a4004a"
    ap-northeast-1  = "ami-3a000e5d"
    ap-southeast-1  = "ami-2428ab47"
    ap-southeast-2  = "ami-ac5849cf"
    ca-central-1    = "ami-8cfb44e8"
  }
}

variable "extra_cloud_config_type" {
  description = "extra cloud config type"
  default     = "text/cloud-config"
}

variable "extra_cloud_config_content" {
  description = "extra cloud config content"
  default     = ""
}

variable "ansible_tags" {
  description = "A comma-delimited list of ansible tags to use"
  default = "all"
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

module "ecs_cluster" {
  source                      = "./ecs-cluster"
  name                        = "${var.name}-ecs-cluster"
  environment                 = "default"
  vpc_id                      = "${module.vpc.id}"
  image_id                    = "${coalesce(var.ecs_ami, lookup(var.default_ecs_ami, var.region))}"
  subnet_ids                  = "${module.vpc.internal_subnets}"
  key_name                    = "${var.key_name}"
  instance_type               = "${var.ecs_instance_type}"
  instance_ebs_optimized      = "${var.ecs_instance_ebs_optimized}"
  iam_instance_profile        = "${module.iam.ecs_profile_id}"
  min_size                    = "${var.ecs_min_size}"
  max_size                    = "${var.ecs_max_size}"
  desired_capacity            = "${var.ecs_desired_capacity}"
  region                      = "${var.region}"
  availability_zones          = "${module.vpc.availability_zones}"
  root_volume_size            = "${var.ecs_root_volume_size}"
  docker_volume_size          = "${var.ecs_docker_volume_size}"
  docker_auth_type            = "${var.ecs_docker_auth_type}"
  docker_auth_data            = "${var.ecs_docker_auth_data}"
  security_groups             = "${coalesce(var.ecs_security_groups, format("%s", module.security_groups.internal_ssh))}"
  extra_cloud_config_type     = "${var.extra_cloud_config_type}"
  extra_cloud_config_content  = "${var.extra_cloud_config_content}"
}

module "bastion" {
  source                                = "./bastion"
  garden                                = "${var.name}"
  profile                               = "${var.profile}"
  domain                                = "${var.domain}"
  security_groups                       = "${module.security_groups.bastion},${module.security_groups.internal_ssh}"
  ami_id                                = "${data.aws_ami.default_ami.id}"
  subnet_id                             = "${element(module.vpc.external_subnets, 0)}"
  key_name                              = "${var.key_name}"
  ci_subdomain                          = "${var.ci_subdomain}"
  status_subdomain                      = "${var.status_subdomain}"
  hosted_zone_id                        = "${var.hosted_zone_id}"
  instance_type                         = "${var.bastion_instance_type}"
  disk_size                             = "${var.bastion_disk_size}"
  instance_count                        = "${var.bastion_count}"
  aws_admin_id                          = "${module.iam.admin_user_id}"
  aws_admin_secret                      = "${module.iam.admin_user_secret}"
  letsencrypt_ca                        = "${var.letsencrypt_ca}"
  letsencrypt_registration_info_base64  = "${var.letsencrypt_registration_info_base64}"
  letsencrypt_account_key_base64        = "${var.letsencrypt_account_key_base64}"
  region                                = "${var.region}"
  ecs_cluster_name                      = "${module.ecs_cluster.name}"
  ansible_tags                          = "${var.ansible_tags}"
}

module "customizations" {
  source                  = "./.custom"
  garden                  = "${var.name}"
  profile                 = "${var.profile}"
  domain                  = "${var.domain}"
  hosted_zone_id          = "${var.hosted_zone_id}"
  key_name                = "${var.key_name}"
  vpc_id                  = "${module.vpc.id}"
  vpc_internal_subnets    = "${module.vpc.internal_subnets}"
  vpc_external_subnets    = "${module.vpc.external_subnets}"
  bastion_security_group  = "${module.security_groups.bastion}"
  ecs_security_group      = "${module.ecs_cluster.security_group}"
  bastion_ips             = "${module.bastion.external_ips}"
  bastion_done_output     = "${module.bastion.done_output}"
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

// Comma separated list of internal route table IDs.
output "internal_route_tables" {
  value = "${module.vpc.internal_rtb_id}"
}

// The external route table ID.
output "external_route_tables" {
  value = "${module.vpc.external_rtb_id}"
}

// The default ECS cluster name.
output "ecs_cluster" {
  value = "${module.ecs_cluster.name}"
}

// The default ECS cluster security group ID.
output "ecs_cluster_security_group_id" {
  value = "${module.ecs_cluster.security_group}"
}