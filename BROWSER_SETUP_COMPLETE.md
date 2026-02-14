# Headless Browser Setup (Production VM)

Nova uses headless Chromium for web navigation and screenshots via the OpenClaw Browser tool.

Production design: Chromium runs on the same Linux VM as the gateway (no Docker, no port forwarding). CDP is bound to loopback only.

## Architecture (Current)

```
chrome-headless.service
  chromium --headless=new
  --remote-debugging-address=127.0.0.1
  --remote-debugging-port=9222
  --user-data-dir=/var/lib/openclaw/chrome-profile

openclaw-gateway.service
  OpenClaw browser profile "linux"
  cdpUrl: http://127.0.0.1:9222
```

## Files

- Chromium systemd unit template: `/opt/meowmoltbot/cloud/gcp/systemd/chrome-headless.service`
- Gateway systemd unit template: `/opt/meowmoltbot/cloud/gcp/systemd/openclaw-gateway.service`
- Secrets env template: `/opt/meowmoltbot/cloud/gcp/moltbot.env.template`

Live runtime:
- Config: `/var/lib/openclaw/openclaw.json`
- Chromium profile: `/var/lib/openclaw/chrome-profile`
- Screenshots: `/var/lib/openclaw/media/browser`

## Verify

```bash
curl -fsS http://127.0.0.1:9222/json/version | jq .
sudo systemctl status chrome-headless.service --no-pager
sudo systemctl status openclaw-gateway.service --no-pager
```

## Patch Config (If Migrated)

```bash
node /opt/meowmoltbot/scripts/cloud/patch-openclaw-json-for-linux.mjs /var/lib/openclaw/openclaw.json
sudo systemctl restart openclaw-gateway.service
```

This ensures:
- `browser.defaultProfile = "linux"`
- `browser.profiles.linux.cdpUrl = "http://127.0.0.1:9222"`

## Troubleshooting

1. CDP not reachable:
```bash
sudo journalctl -u chrome-headless.service -n 200 --no-pager
sudo systemctl restart chrome-headless.service
curl -fsS http://127.0.0.1:9222/json/version | jq .
```

2. Browser tool still says `running: false`:
```bash
sudo journalctl -u openclaw-gateway.service -n 200 --no-pager
sudo systemctl restart openclaw-gateway.service
```

Legacy note:
- Older Windows Docker host docs used portproxy and a Docker gateway IP. That design is deprecated for production.

