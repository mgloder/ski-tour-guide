variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = "fed0653c-9efd-4964-8583-4bd8c5783679"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "West Europe"
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "ski-tour-guide"
}

variable "github_token" {
  description = "GitHub personal access token with repo scope"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "mgloder"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "ski-tour-guide"
}
