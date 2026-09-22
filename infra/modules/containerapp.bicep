// =============================================================================
// Module: containerapp.bicep  (generic Container App — reused for api + frontend)
// -----------------------------------------------------------------------------
// One reusable module for BOTH workloads:
//   - api:      target port 3000, internal ingress
//   - frontend: target port 80, external ingress, with API_HOST/API_PORT env
//               vars pointing at the api app so nginx can proxy /api.
//
// Configured for the low-cost demo deployment profile.
// =============================================================================

@description('Azure region for the app.')
param location string

@description('Name of the container app (also its DNS label within the environment).')
param appName string

@description('Resource ID of the Container Apps managed environment.')
param environmentId string

@description('Fully-qualified image reference, e.g. myregistry.azurecr.io/api:latest.')
param image string

@description('The port the container listens on (api=3000, frontend=80).')
param targetPort int

@description('Whether ingress is exposed externally (public). Set false for internal-only.')
param externalIngress bool = true

@description('Login server of the ACR the image is pulled from.')
param registryLoginServer string

@description('Environment variables for the container. Array of { name, value } objects.')
param env array = []

@description('Tags applied to the app.')
param tags object = {}

// Keep one replica warm for predictable demo latency and scale to three on load.
@minValue(0)
param minReplicas int = 1

@minValue(1)
param maxReplicas int = 3

// 0.5 vCPU / 1 GiB is appropriate for this demo workload.
param cpu string = '0.5'
param memory string = '1.0Gi'

// -----------------------------------------------------------------------------
// Registry authentication
// -----------------------------------------------------------------------------
// System-assigned identity pulls images through the AcrPull role assignment.
@description('ACR admin username (leave empty when using managed identity).')
param registryUsername string = ''

@description('ACR admin password (leave empty when using managed identity).')
@secure()
param registryPassword string = ''

@description('Resource ID of the user-assigned identity used for ACR pulls.')
param registryIdentityResourceId string = ''

var useAdminCreds = !empty(registryUsername)
var useManagedIdentity = !empty(registryIdentityResourceId)

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: tags
  identity: useManagedIdentity ? {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${registryIdentityResourceId}': {}
    }
  } : {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: {
        external: externalIngress
        targetPort: targetPort
        transport: 'http'
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      // Only attach registry credentials when using admin creds. With a managed
      // identity you would set `identity` here and omit the secret.
      registries: useAdminCreds ? [
        {
          server: registryLoginServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ] : [
        {
          server: registryLoginServer
          identity: registryIdentityResourceId
        }
      ]
      secrets: useAdminCreds ? [
        {
          name: 'registry-password'
          value: registryPassword
        }
      ] : []
    }
    template: {
      containers: [
        {
          name: appName
          image: image
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: env
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/'
                port: targetPort
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-concurrency'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
      // SQLite remains intentionally ephemeral for this low-cost demonstration.
    }
  }
}

@description('The fully-qualified domain name of the app (empty when ingress is disabled).')
output fqdn string = containerApp.properties.configuration.ingress.fqdn

@description('The name of the container app.')
output appName string = containerApp.name

