# Headless Browser Setup - Complete ✅

## Status: FULLY OPERATIONAL

MeowMoltBot now has fully functional headless browser capabilities through Chrome running on the Windows host.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Windows Host                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Chrome Headless (port 9222)                        │  │
│  │   - CDP Server: http://127.0.0.1:9222               │  │
│  │   - User Data: D:\MeowMoltBot\chrome-headless-profile│  │
│  └───────────────────┬──────────────────────────────────┘  │
│                      │                                       │
│              Windows Port Forwarding                        │
│         (netsh: 172.28.224.1:9222 → 127.0.0.1:9222)        │
│                      │                                       │
├──────────────────────┼──────────────────────────────────────┤
│                      │         Docker (WSL2)                │
│                      │                                       │
│  ┌───────────────────▼──────────────────────────────────┐  │
│  │   openclaw-gateway-1 Container                       │  │
│  │                                                      │  │
│  │   OpenClaw Browser Control:                         │  │
│  │   - Profile: windows                                │  │
│  │   - CDP URL: http://172.28.224.1:9222              │  │
│  │   - Status: running ✅                              │  │
│  │                                                      │  │
│  │   Agent Tools:                                      │  │
│  │   - browser: open, screenshot, snapshot, status     │  │
│  │                                                      │  │
│  │   Communication:                                    │  │
│  │   - Telegram: @meow_molt_bot                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration Files

### 1. Chrome Launcher Script
**File**: `start-headless-chrome.ps1`

Starts Chrome with remote debugging enabled on port 9222.

**Key Features**:
- Checks for existing Chrome instances
- Creates isolated user profile
- Waits for Chrome to be ready
- Tests connection before returning

**Usage**:
```powershell
.\start-headless-chrome.ps1
```

### 2. OpenClaw Browser Config
**File**: `openclaw-config/openclaw.json`

```json
{
  "browser": {
    "enabled": true,
    "headless": true,
    "attachOnly": true,
    "defaultProfile": "windows",
    "profiles": {
      "windows": {
        "cdpUrl": "http://172.28.224.1:9222",
        "color": "#00AA00"
      }
    }
  }
}
```

**Configuration Notes**:
- `attachOnly: true` - Don't launch Chrome from container
- `cdpUrl` - Points to Docker gateway IP with port forwarding
- `color` - Visual indicator in logs (green)

### 3. Docker Compose
**File**: `docker-compose.yml`

**Key Addition**:
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

This allows the container to resolve the Windows host IP.

### 4. Port Forwarding Rule
**File**: `setup-browser-portforwarding.ps1`

Sets up Windows port forwarding using netsh.

**Rule Applied**:
```
172.28.224.1:9222 → 127.0.0.1:9222
```

**Requires**: Administrator privileges

---

## Usage Instructions

### Quick Start (All Services)
```powershell
# Run as Administrator
cd D:\MeowMoltBot
.\start-moltbot-with-browser.ps1
```

This will:
1. Start Chrome headless
2. Set up port forwarding (if not already done)
3. Start Docker container
4. Verify browser connection

### Manual Step-by-Step

#### Step 1: Start Chrome Headless
```powershell
.\start-headless-chrome.ps1
```

**Expected Output**:
```
🚀 Starting Chrome headless with remote debugging on port 9222...
⏳ Waiting for Chrome to initialize...
✅ Chrome is running and accessible on port 9222
Browser: Chrome/144.0.7559.133
✅ Chrome headless is ready for OpenClaw connection!
```

#### Step 2: Set Up Port Forwarding (One-Time)
```powershell
# Right-click PowerShell → Run as Administrator
.\setup-browser-portforwarding.ps1
```

#### Step 3: Start Docker Container
```powershell
docker-compose up -d
```

#### Step 4: Verify Connection
```powershell
docker exec openclaw-gateway-1 node dist/index.js browser status
```

**Expected Output**:
```
profile: windows
enabled: true
running: true
cdpPort: 9222
cdpUrl: http://172.28.224.1:9222
...
```

---

## Testing Browser Capabilities

### 1. Open a Webpage
```powershell
docker exec openclaw-gateway-1 node dist/index.js browser open https://example.com
```

**Output**:
```
opened: https://example.com/
id: BAA35B05E128A98BACC2213272EA8CC1
```

### 2. Take a Screenshot
```powershell
docker exec openclaw-gateway-1 node dist/index.js browser screenshot
```

**Output**:
```
MEDIA:~/.openclaw/media/browser/626a32f5-f95d-4ccf-90fb-7e8e41077773.png
```

Screenshot is saved in: `openclaw-workspace/.openclaw/media/browser/`

### 3. Get Page Snapshot (Accessibility Tree)
```powershell
docker exec openclaw-gateway-1 node dist/index.js browser snapshot
```

**Output**:
```
- generic [ref=e2]:
  - heading "Example Domain" [level=1] [ref=e3]
  - paragraph [ref=e4]: This domain is for use in documentation examples...
  - link "Learn more" [ref=e6] [cursor=pointer]:
    - /url: https://iana.org/domains/example
```

### 4. Test via Telegram
Send message to @meow_molt_bot:
```
Open https://github.com and take a screenshot
```

The bot will:
1. Navigate to the URL
2. Wait for page load
3. Capture screenshot
4. Send it back via Telegram

---

## Troubleshooting

### Issue: Browser status shows `running: false`

**Cause**: Chrome not running or not accessible

**Solution**:
```powershell
# Check if Chrome is running
powershell.exe -Command "Get-NetTCPConnection -LocalPort 9222"

# If not running, start Chrome
.\start-headless-chrome.ps1

# Check port forwarding
powershell.exe -Command "netsh interface portproxy show all"

# If missing, set up port forwarding (as Admin)
.\setup-browser-portforwarding.ps1
```

### Issue: "Remote CDP not reachable"

**Cause**: Port forwarding not configured or Docker gateway IP changed

**Solution**:
```powershell
# Get current Docker gateway IP
ipconfig | grep "IPv4" | grep "172."

# If IP changed, update openclaw-config/openclaw.json:
# "cdpUrl": "http://<NEW_IP>:9222"

# Recreate port forwarding rule (as Admin)
netsh interface portproxy reset
.\setup-browser-portforwarding.ps1

# Restart container
docker-compose restart
```

### Issue: Connection refused to 172.28.224.1:9222

**Cause**: Windows firewall blocking connection

**Solution**:
```powershell
# Add firewall rule (as Administrator)
New-NetFirewallRule -DisplayName "OpenClaw Chrome CDP" -Direction Inbound -LocalPort 9222 -Protocol TCP -Action Allow
```

### Issue: Multiple Chrome instances running

**Cause**: Script started multiple times

**Solution**:
```powershell
# Stop all Chrome
powershell.exe -Command "Stop-Process -Name chrome -Force"

# Start fresh
.\start-headless-chrome.ps1
```

---

## Network Configuration

### Docker Gateway IP
The IP address `172.28.224.1` is the Docker network gateway. This may change if:

- Docker network is recreated
- Docker Desktop is updated
- Computer is rebooted

**To find current gateway IP**:
```powershell
ipconfig | findstr "172."
```

**If IP changes**:
1. Update `openclaw-config/openclaw.json` with new IP
2. Recreate port forwarding rule
3. Restart Docker container

---

## Advanced Usage

### Running Chrome Visible (Non-Headless)

For debugging or development, you might want to see Chrome's UI:

Edit `start-headless-chrome.ps1`:
```powershell
# Remove this line:
"--headless=new",

# And change -WindowStyle to:
Start-Process $ChromePath -ArgumentList @(...) -WindowStyle Normal
```

### Multiple Browser Profiles

You can configure multiple Chrome instances on different ports:

**openclaw.json**:
```json
{
  "browser": {
    "profiles": {
      "chrome-1": {
        "cdpUrl": "http://172.28.224.1:9222",
        "color": "#00AA00"
      },
      "chrome-2": {
        "cdpUrl": "http://172.28.224.1:9223",
        "color": "#0000FF"
      }
    }
  }
}
```

Start Chrome with different ports:
```powershell
# Instance 1
chrome --remote-debugging-port=9222 --user-data-dir="D:\chrome-profile-1"

# Instance 2
chrome --remote-debugging-port=9223 --user-data-dir="D:\chrome-profile-2"
```

Add port forwarding for each:
```powershell
netsh interface portproxy add v4tov4 listenport=9222 listenaddress=172.28.224.1 connectport=9222 connectaddress=127.0.0.1
netsh interface portproxy add v4tov4 listenport=9223 listenaddress=172.28.224.1 connectport=9223 connectaddress=127.0.0.1
```

---

## Performance Notes

### Resource Usage
- **Chrome Headless**: ~100-200MB RAM
- **Screenshot Capture**: ~50-100MB RAM temporarily
- **Page Load**: Variable based on content

### Optimization Tips
1. **Close unused tabs**: Chrome keeps all pages in memory
2. **Regular restarts**: Restart Chrome daily to free memory
3. **Screenshot cleanup**: Delete old screenshots from workspace
4. **User data profile**: Periodically clean `chrome-headless-profile` folder

---

## Security Considerations

### Current Setup
✅ Chrome only accessible from container (via port forwarding)
✅ Isolated user profile (no main Chrome data)
✅ No extensions installed
✅ Headless mode (no visible UI)

### Recommendations
- Keep Chrome updated
- Monitor screenshot directory for unexpected files
- Review browser activity logs regularly
- Don't expose port 9222 to external network

### If Exposing to External Network
If you need to access Chrome from outside the host:
1. Use authentication proxy
2. Enable HTTPS/WSS encryption
3. Implement access control
4. Monitor usage logs

---

## Maintenance

### Scheduled Restart (Optional)
The container can be scheduled to restart via Windows Task Scheduler (default: weekly on Monday at 04:05 local time; see `restart-moltbot-daily.ps1`). This script restarts the Docker container, not the Windows Chrome process.

### Weekly Tasks
- Clean up old screenshots
- Check for Chrome updates
- Review port forwarding rules
- Monitor disk usage

### Monthly Tasks
- Archive old browser media files
- Review security settings
- Update documentation

---

## File Locations

### Chrome Data
- **User Profile**: `D:\MeowMoltBot\chrome-headless-profile\`
- **Screenshots**: `openclaw-workspace\.openclaw\media\browser\`

### Configuration
- **Browser Config**: `openclaw-config\openclaw.json`
- **Docker Config**: `docker-compose.yml`
- **Environment**: `.env`

### Scripts
- **Chrome Launcher**: `start-headless-chrome.ps1`
- **Port Forwarding**: `setup-browser-portforwarding.ps1`
- **All Services**: `start-moltbot-with-browser.ps1`
- **Stop All**: `stop-moltbot-with-browser.ps1`

---

## Success Criteria - ALL MET ✅

- [x] Chrome starts successfully on port 9222
- [x] Port forwarding configured (172.28.224.1:9222 → 127.0.0.1:9222)
- [x] Docker container can reach Chrome via CDP
- [x] `browser status` shows "running: true"
- [x] Can open webpages via browser tool
- [x] Can take screenshots
- [x] Can get page snapshots
- [x] Bot can perform browser actions via Telegram

---

## Quick Reference

| Task | Command |
|------|---------|
| Start all services | `.\start-moltbot-with-browser.ps1` |
| Stop all services | `.\stop-moltbot-with-browser.ps1` |
| Check browser status | `docker exec openclaw-gateway-1 node dist/index.js browser status` |
| Open URL | `docker exec openclaw-gateway-1 node dist/index.js browser open <URL>` |
| Take screenshot | `docker exec openclaw-gateway-1 node dist/index.js browser screenshot` |
| Get snapshot | `docker exec openclaw-gateway-1 node dist/index.js browser snapshot` |
| Restart Chrome | `.\start-headless-chrome.ps1` |
| Check port forwarding | `netsh interface portproxy show all` |
| View logs | `docker logs -f openclaw-gateway-1` |

---

**Implementation Date**: 2026-02-06
**Status**: ✅ FULLY OPERATIONAL
**Tested By**: Claude Code
**Last Updated**: 2026-02-06
