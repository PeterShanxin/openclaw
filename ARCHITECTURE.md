# Nova (MeowMoltBot) Architecture (GCP VM, systemd)

## Overview

Nova runs "bare metal" on a single GCP Compute Engine Linux VM. Production uses:
- `openclaw-gateway.service` for the OpenClaw gateway (Telegram + agents + tools)
- `chrome-headless.service` for headless Chromium (CDP on localhost)

Both services are bound to loopback only (no public ports).

## Architecture Diagram (Current)

```
┌────────────────────────────────────────────────────────────────────┐
│                         GCE Linux VM                                │
│                                                                    │
│  systemd                                                           │
│  ┌───────────────────────────────┐     ┌─────────────────────────┐ │
│  │ openclaw-gateway.service      │     │ chrome-headless.service │ │
│  │                               │     │                         │ │
│  │ node /opt/openclaw/dist/...   │     │ chromium --headless     │ │
│  │ bind: 127.0.0.1:18789         │<--->│ CDP: 127.0.0.1:9222     │ │
│  └───────────────────────────────┘     └─────────────────────────┘ │
│                 │                                   │               │
│                 │ reads/writes                       │ uses profile  │
│                 ▼                                   ▼               │
│          /var/lib/openclaw                    /var/lib/openclaw      │
│          - openclaw.json                      - chrome-profile/      │
│          - credentials/                       - media/browser/       │
│          - sessions/                          - workspace/           │
│                                                                    │
└───────────────────────────────┬────────────────────────────────────┘
                                │ outbound HTTPS
                                ▼
                    Telegram API + Model Providers + Web
```

## What Lives Where

This repo:
- `/opt/meowmoltbot`: runbooks/templates/scripts (not runtime state)

Live runtime:
- `/opt/openclaw`: OpenClaw source/build (fork)
- `/var/lib/openclaw`: state dir (config, credentials, media, cron runs)
- `/var/lib/openclaw/workspace`: Nova brain (IDENTITY/SOUL/HEARTBEAT/memory/skills)
- `/var/lib/openclaw/chrome-profile`: Chromium profile
- `/etc/openclaw/moltbot.env`: secrets for systemd (root `0600`)

Compatibility:
- `/home/node/.openclaw` is a symlink to `/var/lib/openclaw` for older paths.

## How To Change Nova's Behavior

Edit the workspace files under `/var/lib/openclaw/workspace` (as user `openclaw`), then restart `openclaw-gateway.service`.

## Legacy (Windows + Docker)

The project originally ran on a Windows Docker host with volume mounts and port-forwarded CDP. That architecture is no longer production.

