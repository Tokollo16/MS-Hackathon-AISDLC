# Observability and SRE Runbook

## Signals

- API liveness: `GET /health/live` returns `200` when the process is running.
- API readiness: `GET /health/ready` runs `SELECT 1` against SQLite and returns `200` only when the database is reachable.
- Frontend probes: Container Apps checks `/` for liveness and `/api/health/ready` for readiness through nginx.
- Logs: the API emits structured `http_request` JSON logs with method, path, status code, and duration. Container Apps forwards stdout/stderr to the configured Log Analytics workspace.
- Metrics: Container Apps provides replica, request, latency, restart, and ingress metrics; the HTTP concurrency rule scales each app from one to three replicas.

## SRE Agent Setup

After deployment, use the Azure SRE Agent resource in the target subscription and connect it to the application resource group and Log Analytics workspace. Grant the agent least-privilege read access to the resource group, Container Apps, and workspace. Verify the connector before creating an investigation thread.

The local repository cannot complete this step without an Azure subscription, resource group, SRE Agent resource, and authenticated Azure identity. The intended sequence is:

1. List the SRE Agent resources and select the agent in the deployment subscription.
2. Connect the agent to the Container Apps resource group and Log Analytics workspace.
3. Start an investigation thread scoped to the frontend and API Container Apps.
4. Ask the agent to monitor `/api/health/ready`, request failures, restarts, and readiness transitions.

## Fault Exercise

Use a reversible deployment fault rather than editing production data. Deploy an API revision with an invalid `DB_FILE` path or temporarily scale the API revision to zero while the frontend remains available. The readiness probe should fail, the frontend `/api/health/ready` check should return a non-2xx response, and Container Apps should emit revision/readiness events.

Ask the SRE Agent to investigate the time window and capture:

- What signal it surfaced first.
- The likely root cause and supporting logs/metrics.
- The remediation it recommends.
- Any manual investigation still required.

Restore the previous image/configuration or scale settings, wait for readiness to return, then ask the agent to confirm the healthy state. Do not use real customer data or permanent credential changes for the exercise.
