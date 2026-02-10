# Nova (MeowMoltBot) - VM Quick Reference

## Services

```bash
sudo systemctl status openclaw-gateway.service chrome-headless.service --no-pager
sudo systemctl restart openclaw-gateway.service
sudo systemctl restart chrome-headless.service
```

## Logs

```bash
sudo journalctl -u openclaw-gateway.service -n 200 --no-pager
sudo journalctl -u openclaw-gateway.service -f

sudo journalctl -u chrome-headless.service -n 200 --no-pager
sudo journalctl -u chrome-headless.service -f
```

## Browser (CDP)

```bash
curl -fsS http://127.0.0.1:9222/json/version | jq .
ls -la /var/lib/openclaw/media/browser | tail -n 20
```

## OpenClaw CLI (Explicit Production Paths)

```bash
sudo -iu openclaw env \
  OPENCLAW_STATE_DIR=/var/lib/openclaw \
  OPENCLAW_WORKSPACE_DIR=/var/lib/openclaw/workspace \
  OPENCLAW_CONFIG_PATH=/var/lib/openclaw/openclaw.json \
  openclaw status
```

## Edit Workspace (Nova Brain)

```bash
sudo -iu openclaw nano /var/lib/openclaw/workspace/SOUL.md
sudo systemctl restart openclaw-gateway.service
```

## Edit Secrets

```bash
sudoedit /etc/openclaw/moltbot.env
sudo systemctl restart openclaw-gateway.service
```

## Patch Config For Linux

```bash
node /opt/meowmoltbot/scripts/cloud/patch-openclaw-json-for-linux.mjs /var/lib/openclaw/openclaw.json
sudo systemctl restart openclaw-gateway.service
```

## Key Paths

- `/opt/meowmoltbot`: ops docs/templates/scripts
- `/opt/openclaw`: OpenClaw build
- `/var/lib/openclaw`: state dir (includes `openclaw.json`, media, credentials)
- `/var/lib/openclaw/workspace`: Nova workspace
- `/var/lib/openclaw/chrome-profile`: Chromium profile
- `/etc/openclaw/moltbot.env`: secrets env (root `0600`)

