# Just a basic terraform config so we can test against it

variable "one" {
    description = "One"
}

output "one" {
    value = "${var.one}"
}