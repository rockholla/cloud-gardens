/**
 * Creates users for automating tasks from AWS resources
 */

variable "garden" {
  description = "the name of the garden"
}

resource "aws_iam_user" "admin" {
  name = "${var.garden}-admin"
}

resource "aws_iam_user_policy_attachment" "admin" {
  user        = "${aws_iam_user.admin.name}"
  policy_arn  = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_access_key" "admin" {
  user = "${aws_iam_user.admin.name}"
}

output "admin_user_id" {
  value = "${aws_iam_access_key.admin.id}"
}

output "admin_user_secret" {
  value = "${aws_iam_access_key.admin.secret}"
}