# Browser Quick Reference Card

## Status: ✅ OPERATIONAL

## One-Command Start (Run as Administrator)
```powershell
cd D:\MeowMoltBot
.\start-moltbot-with-browser.ps1
```

## Essential Commands

### Check Browser Status
```powershell
docker exec openclaw-gateway-1 node dist/index.js browser status
```

### Open Webpage
```powershell
docker exec openclaw-gateway-1 node dist/index.js browser open <URL>
```

### Take Screenshot
```powershell
docker exec openclaw-gateway-1 node dist/index.js browser screenshot
```

### Get Page Structure
```powershell
docker exec openclaw-gateway-1 node dist/index.js browser snapshot
```

## Telegram Examples
Send to @meow_molt_bot:
- "Open https://github.com"
- "Take a screenshot"
- "What's on this page?"
- "Click the first link"

## Troubleshooting

### Browser Not Connected?
```powershell
# Restart Chrome
.\start-headless-chrome.ps1

# Check port forwarding (as Admin)
netsh interface portproxy show all

# If missing, setup forwarding (as Admin)
.\setup-browser-portforwarding.ps1

# Restart container
docker-compose restart
```

### View Container Logs
```powershell
docker logs -f openclaw-gateway-1
```

## Network Info
- **Docker Gateway IP**: 172.28.224.1
- **Chrome Port**: 9222
- **CDP URL**: http://172.28.224.1:9222
- **Port Forward**: 172.28.224.1:9222 → 127.0.0.1:9222

## File Locations
- **Chrome Profile**: `D:\MeowMoltBot\chrome-headless-profile\`
- **Screenshots**: `openclaw-workspace\.openclaw\media\browser\`
- **Config**: `openclaw-config\openclaw.json`
- **Docs**: `BROWSER_SETUP_COMPLETE.md`

## Stop All Services
```powershell
.\stop-moltbot-with-browser.ps1
```

---
**For detailed documentation**: See `BROWSER_SETUP_COMPLETE.md`
