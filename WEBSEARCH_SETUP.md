# Nova Web Search Setup (Production VM)

Nova's production services load secrets from `/etc/openclaw/moltbot.env` (root-owned `0600`).

## Brave Search (Recommended)

1. Create a Brave Search API key:
   - https://api-dashboard.search.brave.com/register

2. Add it to the systemd env file:

```bash
sudoedit /etc/openclaw/moltbot.env
```

Add:

```bash
BRAVE_API_KEY=your_actual_api_key_here
```

3. Restart the gateway:

```bash
sudo systemctl restart openclaw-gateway.service
sudo journalctl -u openclaw-gateway.service -n 120 --no-pager
```

4. Test via Telegram:

Send to Nova:
- `Search the web for the latest AI news and summarize it.`

## Troubleshooting

```bash
sudo systemctl status openclaw-gateway.service --no-pager
sudo journalctl -u openclaw-gateway.service -n 200 --no-pager
```

Legacy note:
- Older Docker-based instructions that used `.env` are deprecated for production.

