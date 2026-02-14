# Nova (MeowMoltBot) Admin Guide (Cloud VM)

## What This Repo Is

`/opt/meowmoltbot` is an ops repo: runbooks, templates, and helper scripts.
Nova's live state/workspace live under `/var/lib/openclaw`, not inside this git repo.

## Most Common Ops Commands

```bash
sudo systemctl status openclaw-gateway.service chrome-headless.service --no-pager
sudo journalctl -u openclaw-gateway.service -n 200 --no-pager
sudo journalctl -u chrome-headless.service -n 200 --no-pager
curl -fsS http://127.0.0.1:9222/json/version | jq .
```

## Key Docs

- `CLOUD_MIGRATION_GCP.md`: VM bootstrap, restore, systemd install
- `CLAUDE.md`: admin assistant guide (VM-first)
- `QUICKREF.md`: command cheat sheet (VM-first)
- `ARCHITECTURE.md`: system overview (VM-first)

## Key Paths (Production)

- `/opt/meowmoltbot/openclaw`: OpenClaw build
- `/var/lib/openclaw`: state dir
- `/var/lib/openclaw/workspace`: Nova workspace (SOUL/IDENTITY/HEARTBEAT/memory/skills)
- `/var/lib/openclaw/chrome-profile`: Chromium profile
- `/etc/openclaw/moltbot.env`: secrets env (root `0600`)

## Legacy

Windows/Docker scripts and docs remain for rollback/history only.

