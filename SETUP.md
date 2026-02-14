# Nova (MeowMoltBot) Setup (Production VM)

Production is a GCP Compute Engine Linux VM running OpenClaw "bare metal" with systemd and a local headless Chromium (CDP on `127.0.0.1:9222`).

The canonical end-to-end runbook is `CLOUD_MIGRATION_GCP.md`. This file is a short checklist.

## Checklist

1. Install prerequisites:
```bash
sudo apt-get update
sudo apt-get install -y git ca-certificates curl jq build-essential
```

2. Install Node.js >= 22 and pnpm (via Corepack).

3. Build OpenClaw from the merged monorepo path `/opt/meowmoltbot/openclaw`.

4. Restore runtime data to:
- `/var/lib/openclaw/`
- `/var/lib/openclaw/workspace/`
- `/var/lib/openclaw/chrome-profile/`

5. Patch config for Linux:
```bash
node /opt/meowmoltbot/scripts/cloud/patch-openclaw-json-for-linux.mjs /var/lib/openclaw/openclaw.json
```

6. Install Chromium and systemd units:
- Units: `/opt/meowmoltbot/cloud/gcp/systemd/*.service` -> `/etc/systemd/system/`
- Env template: `/opt/meowmoltbot/cloud/gcp/moltbot.env.template` -> `/etc/openclaw/moltbot.env` (root `0600`)

7. Start services and verify:
```bash
sudo systemctl daemon-reload
sudo systemctl enable chrome-headless.service openclaw-gateway.service
sudo systemctl restart chrome-headless.service
sudo systemctl restart openclaw-gateway.service
curl -fsS http://127.0.0.1:9222/json/version | jq .
```

## Legacy (Windows + Docker)

Older Docker Desktop setup instructions have been deprecated in favor of VM + systemd.
