// =============================================================================
// main.bicep — Challenge 5 starter scaffold (OPTIONAL, SKELETON — not an answer key)
// -----------------------------------------------------------------------------
// Target architecture expressed here (Azure Container Apps):
//
//   ACR ──images──> ┌─────────────── Container Apps Environment ───────────────┐
//                   │  frontend (nginx, :80, external)  ──proxy──>  api (:3000) │
//                   └───────────────────────────────────────────────────────────┘
//                                    │ logs
//                            Log Analytics workspace
//
// The frontend's nginx proxies /api to the api app using API_HOST / API_PORT
// (see src/frontend/entrypoint.sh + nginx.conf). Within one Container Apps
// environment, apps can address each other by app name, which is what makes
// that service discovery work.
//
// Deployment policy: Basic ACR, 30-day logs, internal API ingress, managed
// user-assigned identity image pulls, HTTP scaling, and intentionally ephemeral SQLite.
//
// Deploy manually:
//   az group create -n <rg> -l <location>
//   az deployment group create -g <rg> -f infra/main.bicep -p infra/main.parameters.json
// =============================================================================

targetScope = 'resourceGroup'

@description('Azure region for all resources. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Short prefix used to derive resource names (lowercase letters/numbers).')
@minLength(2)
@maxLength(12)
param namePrefix string = 'octocat'

@description('Environment name / suffix (e.g. dev, test, hack). Keeps names unique per env.')
param environmentName string = 'dev'

@description('Container image reference for the API (e.g. <acr>.azurecr.io/api:<tag>).')
param apiImage string

@description('Container image reference for the frontend (e.g. <acr>.azurecr.io/frontend:<tag>).')
param frontendImage string

@description('Minimum replicas for each app.')
@minValue(0)
param minReplicas int = 1

@description('Maximum replicas for each app.')
@minValue(1)
param maxReplicas int = 3

// Optional compatibility parameters. The default deployment uses a user-assigned
// identity and AcrPull role assignments instead of registry admin credentials.
@description('ACR admin username (leave empty to switch modules to managed identity).')
param registryUsername string = ''

@description('ACR admin password (leave empty to switch modules to managed identity).')
@secure()
param registryPassword string = ''

// -----------------------------------------------------------------------------
// Derived names. Registry names must be globally unique and alphanumeric only.
// -----------------------------------------------------------------------------
var baseName = '${namePrefix}-${environmentName}'
var registryName = toLower(replace('${namePrefix}${environmentName}acr', '-', ''))
var logAnalyticsName = '${baseName}-logs'
var environmentResourceName = '${baseName}-env'
var apiAppName = '${baseName}-api'
var frontendAppName = '${baseName}-frontend'
var pullIdentityName = '${baseName}-pull'

var commonTags = {
  project: 'octocat-supply'
  challenge: 'challenge-5-azure-deploy'
  managedBy: 'bicep'
  environment: environmentName
}

// -----------------------------------------------------------------------------
// Container Registry
// -----------------------------------------------------------------------------
module registry 'modules/registry.bicep' = {
  name: 'registry'
  params: {
    location: location
    registryName: registryName
    tags: commonTags
  }
}

resource registryResource 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: registryName
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: pullIdentityName
  location: location
  tags: commonTags
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.outputs.registryId, pullIdentity.id, 'acrpull')
  scope: registryResource
  properties: {
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  }
}

// -----------------------------------------------------------------------------
// Log Analytics (dependency of the Container Apps environment)
// -----------------------------------------------------------------------------
module logAnalytics 'modules/loganalytics.bicep' = {
  name: 'loganalytics'
  params: {
    location: location
    workspaceName: logAnalyticsName
    tags: commonTags
  }
}

// -----------------------------------------------------------------------------
// Container Apps managed environment
// -----------------------------------------------------------------------------
module environment 'modules/containerapp-env.bicep' = {
  name: 'containerapp-env'
  params: {
    location: location
    environmentName: environmentResourceName
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    tags: commonTags
  }
}

// -----------------------------------------------------------------------------
// API container app — listens on 3000 and is internal to the environment.
// -----------------------------------------------------------------------------
module apiApp 'modules/containerapp.bicep' = {
  name: 'api-app'
  dependsOn: [acrPull]
  params: {
    location: location
    appName: apiAppName
    environmentId: environment.outputs.environmentId
    image: apiImage
    targetPort: 3000
    externalIngress: false
    registryLoginServer: registry.outputs.loginServer
    registryUsername: registryUsername
    registryPassword: registryPassword
    registryIdentityResourceId: pullIdentity.id
    minReplicas: minReplicas
    maxReplicas: maxReplicas
    tags: commonTags
    env: []
  }
}

// -----------------------------------------------------------------------------
// Frontend container app — nginx on 80, external, proxying to the api.
// -----------------------------------------------------------------------------
// The API_HOST/API_PORT env vars tell nginx where the api lives. Using the api
// app name resolves inside the environment for service discovery.
module frontendApp 'modules/containerapp.bicep' = {
  name: 'frontend-app'
  dependsOn: [acrPull]
  params: {
    location: location
    appName: frontendAppName
    environmentId: environment.outputs.environmentId
    image: frontendImage
    targetPort: 80
    externalIngress: true
    registryLoginServer: registry.outputs.loginServer
    registryUsername: registryUsername
    registryPassword: registryPassword
    registryIdentityResourceId: pullIdentity.id
    minReplicas: minReplicas
    maxReplicas: maxReplicas
    tags: commonTags
    env: [
      {
        name: 'API_HOST'
        value: apiAppName
      }
      {
        name: 'API_PORT'
        value: '3000'
      }
      {
        name: 'API_PROTOCOL'
        value: 'http'
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------
@description('ACR login server — push images here and reference them in the apps.')
output acrLoginServer string = registry.outputs.loginServer

@description('Public URL of the frontend app.')
output frontendUrl string = 'https://${frontendApp.outputs.fqdn}'

@description('Internal FQDN of the api app.')
output apiFqdn string = apiApp.outputs.fqdn
