# Browser Quick Reference (Production VM)

Production runs headless Chromium as `chrome-headless.service` with CDP on localhost.

## Verify CDP Is Up

```bash
curl -fsS http://127.0.0.1:9222/json/version | jq .
```

## Restart Browser Service

```bash
sudo systemctl restart chrome-headless.service
sudo journalctl -u chrome-headless.service -n 200 --no-pager
```

## Check From OpenClaw CLI

```bash
sudo -iu openclaw env OPENCLAW_STATE_DIR=/var/lib/openclaw OPENCLAW_WORKSPACE_DIR=/var/lib/openclaw/workspace OPENCLAW_CONFIG_PATH=/var/lib/openclaw/openclaw.json \
  openclaw browser status
```

## Telegram Examples

Send to Nova:
- `Open https://example.com and take a screenshot.`
- `Take a screenshot.`
- `What do you see on the page?`

## File Locations

- Chromium profile: `/var/lib/openclaw/chrome-profile`
- Screenshots: `/var/lib/openclaw/media/browser`
- Config: `/var/lib/openclaw/openclaw.json`

