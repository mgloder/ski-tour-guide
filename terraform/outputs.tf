output "url" {
  description = "URL of the deployed Azure Static Web App"
  value       = "https://${azurerm_static_web_app.main.default_host_name}"
}

output "resource_group" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}

output "static_web_app_name" {
  description = "Static Web App resource name"
  value       = azurerm_static_web_app.main.name
}

output "api_key" {
  description = "Deployment API key (also stored as GitHub Actions secret)"
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}
