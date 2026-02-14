# Nova (MeowMoltBot) - Cloud VM Ops

Nova is an autonomous AI companion running on a Linux VM (GCP Compute Engine). The production stack is OpenClaw + systemd + headless Chromium (CDP on `127.0.0.1:9222`).

This repository contains the ops docs and deployment templates. Runtime state and the live workspace live outside the repo on the VM.

## Production Layout (VM)

- OpenClaw source/build: `/opt/meowmoltbot/openclaw`
- State dir (credentials/sessions/cron/media/etc): `/var/lib/openclaw`
- Workspace dir (SOUL/IDENTITY/HEARTBEAT/memory/skills): `/var/lib/openclaw/workspace`
- Chromium profile: `/var/lib/openclaw/chrome-profile`
- Service env (secrets): `/etc/openclaw/moltbot.env` (root-owned, `0600`)

Services:

- `openclaw-gateway.service` (loopback only, `ws://127.0.0.1:18789`)
- `chrome-headless.service` (loopback only, `http://127.0.0.1:9222`)

## Quick Ops

```bash
sudo systemctl status openclaw-gateway.service chrome-headless.service --no-pager
sudo journalctl -u openclaw-gateway.service -n 200 --no-pager
sudo journalctl -u chrome-headless.service -n 200 --no-pager
curl -fsS http://127.0.0.1:9222/json/version | jq .
```

## Docs

- `CLOUD_MIGRATION_GCP.md`: migration + VM bootstrap + restore
- `CLAUDE.md`: admin assistant guide (VM-first)
- `QUICKREF.md`: command cheat sheet (VM-first)

## Legacy (Windows + Docker)

The project originally ran on a Windows Docker host. Docker/PowerShell docs and scripts remain for rollback/history and are marked as legacy in the updated docs.
