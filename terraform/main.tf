resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project_name}"
  location = var.location

  tags = {
    project = var.project_name
  }
}

# Standard tier required for hybrid Next.js rendering (SSR + API routes)
resource "azurerm_static_web_app" "main" {
  name                = "swa-${var.project_name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku_tier            = "Standard"
  sku_size            = "Standard"

  tags = {
    project = var.project_name
  }
}

resource "github_actions_secret" "deployment_token" {
  repository      = var.github_repo
  secret_name     = "AZURE_STATIC_WEB_APPS_API_TOKEN"
  plaintext_value = azurerm_static_web_app.main.api_key
}
