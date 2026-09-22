// =============================================================================
// Module: registry.bicep  (Azure Container Registry)
// -----------------------------------------------------------------------------
// Holds the two application images (api, frontend) that the Container Apps pull.
//
// This is a STARTER SKELETON. The core resource + key params are wired so the
// Configured for the low-cost demo deployment profile.
// =============================================================================

@description('Azure region for the registry.')
param location string

@description('Globally-unique name for the container registry (alphanumeric, 5-50 chars).')
param registryName string

@description('Tags applied to the registry.')
param tags object = {}

// Basic is sufficient for the single-region hackathon deployment.
//       Ask Copilot for Well-Architected guidance if unsure.
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param sku string = 'Basic'

// Admin access remains disabled; Container Apps use managed identities with
// AcrPull role assignments.
param adminUserEnabled bool = false

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: registryName
  location: location
  tags: tags
  sku: {
    name: sku
  }
  properties: {
    adminUserEnabled: adminUserEnabled
    publicNetworkAccess: 'Enabled'
    anonymousPullEnabled: false
  }
}

@description('The login server host name of the registry (e.g. myregistry.azurecr.io).')
output loginServer string = registry.properties.loginServer

@description('The resource ID of the registry (useful for role assignments).')
output registryId string = registry.id

@description('The name of the registry.')
output registryName string = registry.name
