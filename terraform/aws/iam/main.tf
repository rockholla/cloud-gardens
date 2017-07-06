/**
 * Creates IAM users/roles/profiles used in managing the garden
 */

variable "garden" {
  description = "the name of the garden"
}

resource "aws_iam_role" "ecs" {
  name = "${var.garden}-ecs-role"
  path = "/"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement":
  {
    "Effect": "Allow",
    "Principal": {
      "Service": [
        "ecs.amazonaws.com",
        "ec2.amazonaws.com"
      ]
    },
    "Action": "sts:AssumeRole"
  }
}
EOF
}

resource "aws_iam_instance_profile" "ecs" {
  name  = "${var.garden}-ecs-profile"
  role = "${aws_iam_role.ecs.name}"
}

resource "aws_iam_user" "admin" {
  name = "${var.garden}-admin"
}

resource "aws_iam_user_policy" "admin" {
  name   = "${var.garden}-admin-policy"
  user   = "${aws_iam_user.admin.name}"
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "ecs_service_role_policy" {
  name = "${var.garden}-ecs-service-role-policy"
  role = "${aws_iam_role.ecs.id}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:Describe*",
        "elasticloadbalancing:DeregisterInstancesFromLoadBalancer",
        "elasticloadbalancing:Describe*",
        "elasticloadbalancing:RegisterInstancesWithLoadBalancer"
      ],
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "ecs_instance_role_policy" {
  name = "${var.garden}-ecs-instance-role-policy"
  role = "${aws_iam_role.ecs.id}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:CreateCluster",
        "ecs:DeregisterContainerInstance",
        "ecs:DiscoverPollEndpoint",
        "ecs:Poll",
        "ecs:RegisterContainerInstance",
        "ecs:StartTelemetrySession",
        "ecs:Submit*",
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecs:StartTask",
        "autoscaling:*",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
EOF
}

output "ecs_role_id" {
  value = "${aws_iam_role.ecs.id}"
}

output "admin_user_id" {
  value = "${aws_iam_access_key.admin.id}"
}

resource "aws_iam_access_key" "admin" {
  user = "${aws_iam_user.admin.name}"
}

output "admin_user_secret" {
  value = "${aws_iam_access_key.admin.secret}"
}

output "admin_role_arn" {
  value = "${aws_iam_role.ecs.arn}"
}

output "ecs_profile_id" {
  value = "${aws_iam_instance_profile.ecs.id}"
}