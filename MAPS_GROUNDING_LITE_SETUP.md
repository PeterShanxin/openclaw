# Maps Grounding Lite Setup (Production VM)

Nova's production services load secrets from `/etc/openclaw/moltbot.env` (root-owned `0600`).

## Configure

1. Add `GOOGLE_MAPS_API_KEY`:

```bash
sudoedit /etc/openclaw/moltbot.env
```

Add:

```bash
GOOGLE_MAPS_API_KEY=your_actual_key_here
```

2. Restart the gateway:

```bash
sudo systemctl restart openclaw-gateway.service
```

## Quick Test (From Telegram)

Ask Nova:
- `Use Maps Grounding Lite to get the weather at "Singapore".`
- `Find the nearest coffee shops from "VivoCity, Singapore".`

## Notes

- Some Maps APIs can return transient 5xx errors; retry once or twice.
- Older Docker-based instructions that used `.env` are deprecated for production.

