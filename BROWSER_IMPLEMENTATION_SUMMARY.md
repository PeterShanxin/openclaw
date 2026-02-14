# Browser Implementation Summary (Production VM)

## What Was Done

Nova's browser capability is implemented as a local headless Chromium instance on the VM, exposed via CDP on `127.0.0.1:9222`, and attached to by OpenClaw's Browser tool.

This is a VM-native design (systemd), not Docker-based.

## Key Pieces

1. `chrome-headless.service`
   - launches Chromium with remote debugging bound to localhost
   - persists session cookies and logins in `/var/lib/openclaw/chrome-profile`

2. OpenClaw config (`/var/lib/openclaw/openclaw.json`)
   - `browser.defaultProfile = "linux"`
   - `browser.profiles.linux.cdpUrl = "http://127.0.0.1:9222"`
   - `attachOnly = true` (gateway attaches to an existing browser process)

3. Verification
   - `curl -fsS http://127.0.0.1:9222/json/version | jq .`
   - `sudo journalctl -u chrome-headless.service -n 200 --no-pager`

## Operational Notes

- Screenshots are stored under `/var/lib/openclaw/media/browser`.
- Keep CDP loopback-only. Do not expose port `9222` publicly.

Legacy note:
- The previous Windows Docker deployment used port forwarding (Docker gateway IP -> localhost). That approach is deprecated for production.

