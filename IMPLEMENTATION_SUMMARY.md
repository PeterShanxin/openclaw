# Nova (MeowMoltBot) Implementation Summary (Cloud VM)

This repo is an ops/documentation repo for Nova's production deployment on a GCP Compute Engine Linux VM.

## Production Layout

- OpenClaw build: `/opt/openclaw`
- State dir: `/var/lib/openclaw`
  - Config: `/var/lib/openclaw/openclaw.json`
  - Media (screenshots): `/var/lib/openclaw/media/browser`
- Workspace: `/var/lib/openclaw/workspace`
- Chromium profile: `/var/lib/openclaw/chrome-profile`
- Secrets env: `/etc/openclaw/moltbot.env` (root `0600`)

## Services (systemd)

- `openclaw-gateway.service` (loopback only)
- `chrome-headless.service` (loopback only)

Templates live in:
- `/opt/meowmoltbot/cloud/gcp/systemd/`

## Migration/Restore

See `CLOUD_MIGRATION_GCP.md`. Restore uses `rsync` into `/var/lib/openclaw` and patches config with:

```bash
node /opt/meowmoltbot/scripts/cloud/patch-openclaw-json-for-linux.mjs /var/lib/openclaw/openclaw.json
```

## Legacy

Older Windows + Docker setup steps have been deprecated for production.

