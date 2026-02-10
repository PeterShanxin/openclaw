# Heartbeat Troubleshooting (Production VM)

Nova runs on a Linux VM with systemd. Heartbeat issues should be debugged via `journalctl` and service restarts (not Docker Desktop).

## Quick Checks

```bash
sudo systemctl status openclaw-gateway.service --no-pager
sudo journalctl -u openclaw-gateway.service -n 200 --no-pager
sudo journalctl -u openclaw-gateway.service -f
```

## Common Fix

If heartbeat appears stuck or the gateway is wedged:

```bash
sudo systemctl restart openclaw-gateway.service
sudo journalctl -u openclaw-gateway.service -n 120 --no-pager
```

## What To Look For In Logs

- provider auth failures (401/403) that trigger model fallback
- repeated timeouts from a single provider
- filesystem permission errors under `/var/lib/openclaw`

## Legacy (Windows + Docker)

Older docs about Docker Desktop engine flaps, WSL2, and Windows Task Scheduler restarts are deprecated for production.

