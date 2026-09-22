# `infra/` — Challenge 5 Azure deployment

> This is the low-cost demo deployment profile for [Challenge 5 — Deploy into Azure](../challenges/challenge-05.md).
> It uses Bicep, Container Apps, ACR, Log Analytics, OIDC, and a disposable
> SQLite database. Configure the documented GitHub/Azure prerequisites before use.

## Intended topology

Azure **Container Apps** as the compute target:

```
        Azure Container Registry (ACR)
                 │  (holds api + frontend images)
                 ▼
   ┌──────────── Container Apps Environment ────────────┐
   │                                                    │
   │   frontend (nginx)            api (Node/Express)   │
   │   external ingress :80  ────► ingress :3000        │
   │   proxies /api via nginx      (internal OR external)│
   │                                                    │
   └────────────────────┬───────────────────────────────┘
                        │ logs
                        ▼
             Log Analytics workspace
```

- **ACR** — stores the two images the apps pull.
- **Log Analytics workspace** — a hard dependency of the Container Apps
  environment; provisioned first.
- **Container Apps Environment** — the shared boundary both apps run in. Apps in
  the same environment can address each other by app name (service discovery).
- **`api` Container App** — target port **3000** (matches `src/api-ts/Dockerfile`,
  which `EXPOSE`s 3000 and runs `npm start`).
- **`frontend` Container App** — external ingress on port **80** (matches
  `src/frontend/Dockerfile`, nginx). It is configured with `API_HOST` /
  `API_PORT` env vars pointing at the `api` app so nginx can reverse-proxy `/api`
  (see `src/frontend/nginx.conf` + `src/frontend/entrypoint.sh`).

## How the Bicep maps to the two Dockerfiles

| Dockerfile | Port | Container App | Notes |
| --- | --- | --- | --- |
| `src/api-ts/Dockerfile` | `EXPOSE 3000` | `<prefix>-<env>-api` | `targetPort: 3000`, internal ingress. |
| `src/frontend/Dockerfile` | `EXPOSE 80` | `<prefix>-<env>-frontend` | `targetPort: 80`, external. Gets `API_HOST` = the api app name and `API_PORT` = `3000`. The entrypoint also honours `API_PROTOCOL` (default `https`). |

The workflow builds each image from its own context (`src/api-ts` and
`src/frontend`) and pushes to ACR; the Bicep then references those image tags.

## Files

| File | Purpose |
| --- | --- |
| `main.bicep` | `targetScope = 'resourceGroup'`. Wires ACR, Log Analytics, the environment, and the two apps by calling the modules. Declares parameters + outputs. |
| `modules/registry.bicep` | Basic ACR with admin and anonymous pulls disabled. |
| `modules/loganalytics.bicep` | Log Analytics workspace with 30-day retention. |
| `modules/containerapp-env.bicep` | Container Apps managed environment. |
| `modules/containerapp.bicep` | Generic app module, reused for **both** api and frontend. |
| `main.parameters.json` | Deployment parameters and managed-identity guidance. |

## Deployment decisions

**Provided (so you don't start from a blank page):**

- Module structure and the wiring between them.
- Sensible parameters (`location`, `namePrefix`, `environmentName`, image
  references, `minReplicas` / `maxReplicas`) and outputs (ACR login server,
  frontend URL, api FQDN).
- The port mapping (api `3000`, frontend `80`) and the `API_HOST` / `API_PORT`
  proxy wiring between frontend and api.
- OIDC-based CI/CD plumbing in the workflow (no long-lived secrets).

The completed demo profile uses:

- **Basic ACR**, 30-day Log Analytics retention, and 0.5 vCPU / 1 GiB containers.
- **Internal API ingress**; only the frontend is public.
- **Ephemeral SQLite**, explicitly accepted for a disposable demo. Use Azure Files
  or a managed database before production use.
- **User-assigned managed identity** with `AcrPull`; ACR admin credentials and
  anonymous pulls are disabled.
- **HTTP concurrency scaling** with one warm replica and a maximum of three.
- **HTTP service discovery** from the frontend to the internal API on port 3000.

## Deploy it manually

```bash
# 1. Sanity-check the template compiles
az bicep build --file infra/main.bicep        # or: bicep build infra/main.bicep

# 2. Create a resource group
az group create --name <rg-name> --location <region>

# 3. Deploy after the images exist in ACR
az deployment group create \
  --resource-group <rg-name> \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --parameters \
      apiImage="<acr>.azurecr.io/api:<tag>" \
      frontendImage="<acr>.azurecr.io/frontend:<tag>"

# 4. Read the outputs (e.g. the public frontend URL)
az deployment group show -g <rg-name> -n main \
  --query properties.outputs.frontendUrl.value -o tsv
```

> The workflow resolves the bootstrap ordering by creating the Basic ACR first,
> building both images with `az acr build`, and then deploying the Bicep template.

## Deploy it via the workflow

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) is an OIDC-wired
manual deployment workflow: checkout → install/test/build → `azure/login` →
resource group/ACR bootstrap → `az acr build` → Bicep `what-if`/deployment →
HTTP smoke tests. Run it from the
**Actions** tab (`workflow_dispatch`) after configuring the OIDC secrets below.

Required GitHub **secrets**: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
`AZURE_SUBSCRIPTION_ID`. Required **variables**: `AZURE_RESOURCE_GROUP`,
`AZURE_LOCATION`. See the header comment in the workflow for the federated-
credential subject (`repo:<owner>/<repo>:ref:refs/heads/main`). The federated
identity needs Contributor plus permission to create the `AcrPull` role
assignment, such as User Access Administrator scoped to the resource group. No
client secret is stored — auth is OIDC only. **Setting up the OIDC federated
credential is the single most common stumbling block — do it first and verify
with a trivial login.**

## Tooling note

The repo's `.vscode/mcp.json` preconfigures an **Azure MCP Server**
(`@azure/mcp`). You can use it during the challenge to explore/verify Azure
resources — it's handy but not required by this scaffold.
