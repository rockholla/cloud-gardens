variable "name" {
  description = "Name tag, e.g stack"
}

variable "cidr" {
  description = "The CIDR block for the VPC."
}

variable "external_subnet_pattern" {
  description = "Pattern to use for external subnet addressing"
}

variable "internal_subnet_pattern" {
  description = "Pattern to use for internal subnet addressing"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = "list"
}

/**
 * VPC
 */

resource "aws_vpc" "main" {
  cidr_block           = "${var.cidr}"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags {
    Name = "${var.name}"
  }
}

/**
 * Gateways
 */

resource "aws_internet_gateway" "main" {
  vpc_id = "${aws_vpc.main.id}"

  tags {
    Name = "${var.name}"
  }
}

resource "aws_nat_gateway" "main" {
  count         = "${length(var.availability_zones)}"
  allocation_id = "${element(aws_eip.nat.*.id, count.index)}"
  subnet_id     = "${element(aws_subnet.external.*.id, count.index)}"
  depends_on    = ["aws_internet_gateway.main", "aws_eip.nat", "aws_subnet.external"]
}

resource "aws_eip" "nat" {
  count = "${length(var.availability_zones)}"
  vpc   = true
}

/**
 * Subnets.
 */

resource "aws_subnet" "internal" {
  vpc_id            = "${aws_vpc.main.id}"
  cidr_block        = "${replace(var.internal_subnet_pattern, "x", (0 + (count.index * 64)))}"
  availability_zone = "${element(var.availability_zones, count.index)}"
  count             = "${length(var.availability_zones)}"

  tags {
    Name = "${var.name}-${format("internal-%03d", count.index+1)}"
  }
}

resource "aws_subnet" "external" {
  vpc_id                  = "${aws_vpc.main.id}"
  cidr_block              = "${replace(var.external_subnet_pattern, "x", (32 + (count.index * 64)))}"
  availability_zone       = "${element(var.availability_zones, count.index)}"
  count                   = "${length(var.availability_zones)}"
  map_public_ip_on_launch = true

  tags {
    Name = "${var.name}-${format("external-%03d", count.index+1)}"
  }
}

/**
 * Route tables
 */

resource "aws_route_table" "external" {
  vpc_id = "${aws_vpc.main.id}"

  tags {
    Name = "${var.name}-external-001"
  }
}

resource "aws_route" "external" {
  route_table_id         = "${aws_route_table.external.id}"
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = "${aws_internet_gateway.main.id}"
}

resource "aws_route_table" "internal" {
  count  = "${length(var.availability_zones)}"
  vpc_id = "${aws_vpc.main.id}"

  tags {
    Name = "${var.name}-${format("internal-%03d", count.index+1)}"
  }
}

resource "aws_route" "internal" {
  count                  = "${length(var.availability_zones)}"
  route_table_id         = "${element(aws_route_table.internal.*.id, count.index)}"
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = "${element(aws_nat_gateway.main.*.id, count.index)}"
}

/**
 * Route associations
 */

resource "aws_route_table_association" "internal" {
  count          = "${length(var.availability_zones)}"
  subnet_id      = "${element(aws_subnet.internal.*.id, count.index)}"
  route_table_id = "${element(aws_route_table.internal.*.id, count.index)}"
}

resource "aws_route_table_association" "external" {
  count          = "${length(var.availability_zones)}"
  subnet_id      = "${element(aws_subnet.external.*.id, count.index)}"
  route_table_id = "${aws_route_table.external.id}"
}

/**
 * Outputs
 */

// The VPC ID
output "id" {
  value = "${aws_vpc.main.id}"
}

// A comma-separated list of subnet IDs.
output "external_subnets" {
  value = ["${aws_subnet.external.*.id}"]
}

// A list of subnet IDs.
output "internal_subnets" {
  value = ["${aws_subnet.internal.*.id}"]
}

// The default VPC security group ID.
output "security_group" {
  value = "${aws_vpc.main.default_security_group_id}"
}

// The list of availability zones of the VPC.
output "availability_zones" {
  value = ["${aws_subnet.external.*.availability_zone}"]
}

// The internal route table ID.
output "internal_rtb_id" {
  value = "${join(",", aws_route_table.internal.*.id)}"
}

// The external route table ID.
output "external_rtb_id" {
  value = "${aws_route_table.external.id}"
}

// The list of EIPs associated with the internal subnets.
output "internal_nat_ips" {
  value = ["${aws_eip.nat.*.public_ip}"]
}