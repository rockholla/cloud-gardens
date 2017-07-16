# Just a basic terraform config so we can test against it

variable "one" {
  description = "One"
  default = "default when null"
}

output "one" {
  value = "${var.one}"
}