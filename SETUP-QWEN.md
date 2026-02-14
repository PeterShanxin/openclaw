# Qwen OAuth Notes (Production VM)

Production is VM + systemd (no Docker). Provider authentication and model selection are managed via OpenClaw config/state under `/var/lib/openclaw`.

## Interactive Setup

Run the OpenClaw configuration wizard as the `openclaw` user, explicitly targeting production paths:

```bash
sudo -iu openclaw env \
  OPENCLAW_STATE_DIR=/var/lib/openclaw \
  OPENCLAW_WORKSPACE_DIR=/var/lib/openclaw/workspace \
  OPENCLAW_CONFIG_PATH=/var/lib/openclaw/openclaw.json \
  openclaw configure --section model
```

Follow the prompts to authenticate Qwen (device code flow) and set defaults.

## Apply Changes

After changing model/provider settings, restart the gateway:

```bash
sudo systemctl restart openclaw-gateway.service
sudo journalctl -u openclaw-gateway.service -n 120 --no-pager
```

## Legacy (Windows + Docker)

Older Windows/Docker instructions that used `docker exec ... models auth login` are deprecated for production.

