# Heartbeat Troubleshooting Guide

## Issue: VPN / Network Flap (Docker Desktop Shows 0 CPUs / Docker CLI Returns 500)

### Symptoms
- Docker Desktop shows container CPU% but also shows **`0 CPUs available`** or memory totals as `0B`
- `docker ps` / `docker version` fails with `500 Internal Server Error`
- Bot logs show bursts of:
  - `TypeError: fetch failed`
  - `Network request for 'sendMessage' failed!`

### Likely Cause
VPN connect/disconnect (or other network adapter changes) can temporarily break WSL2/Docker Desktop networking and, in some cases, wedge the Docker engine API.

### Quick Fix
Run the repo recovery script (it restarts Docker Desktop if the engine is wedged, then brings the container back up):

```powershell
cd D:\MeowMoltBot
.\recover-moltbot.ps1 -Mode heal
```

### Hardening Option (Recommended)
Install a watchdog Scheduled Task to run `recover-moltbot.ps1` every few minutes:

```powershell
cd D:\MeowMoltBot
# Safer default: runs as your user (works better with Docker Desktop UI mode)
.\install-moltbot-watchdog.ps1 -Mode install -RunAs CurrentUser -IntervalMinutes 5
```

## Issue: Bot Stops Beating at 3:30 AM

### Symptoms
- Bot becomes unresponsive around 3:20-3:30 AM daily
- Continuous "TypeError: fetch failed" errors in logs
- Telegram polling also fails with "Network request for 'getUpdates' failed"
- Heartbeat agent times out after 10 minutes (600000ms)
- Bot never recovers without manual restart

### Root Cause
Router or ISP drops outbound HTTPS connections around 3:20 AM. The GLM API call hangs indefinitely (no timeout configured in OpenClaw), causing the heartbeat agent to timeout and never recover.

**Timeline**:
- 3:20 AM: Fetch failures start
- 3:27 AM: Telegram network errors begin
- 3:47 AM: WebSocket still works (local connection fine)
- 3:55 AM: Agent run timeout (heartbeat dies after 10 min)
- Continuing: No recovery until manual restart

### Quick Fix

**Restart the container**:
```powershell
docker restart openclaw-gateway-1
```

**Verify it's working**:
```powershell
docker logs --tail 20 openclaw-gateway-1 | grep heartbeat
docker exec openclaw-gateway-1 node dist/index.js status
```

### Permanent Solution

**Automatic restart (weekly Monday by default)** using Windows Task Scheduler.

Note: Task Scheduler uses your Windows local timezone. If you want SGT times, set your Windows timezone to Singapore.

1. **Open PowerShell as Administrator** (right-click → "Run as Administrator")

2. **Run the setup script**:
```powershell
cd D:\MeowMoltBot
.\restart-moltbot-daily.ps1
```

3. **Verify the task was created**:
```powershell
.\restart-moltbot-daily.ps1 -Mode status
# or:
Get-ScheduledTask -TaskName "Restart MoltBot (Network Recovery)"
```

### Turning It Off (Safe)

If you no longer need the auto-restart (for example your router power-off schedule is disabled), disable the task:

```powershell
cd D:\MeowMoltBot
.\restart-moltbot-daily.ps1 -Mode disable
```

### Manual Setup (Alternative)

If the script doesn't work, create the task manually:

```powershell
$taskName = "Restart MoltBot (Network Recovery)"
$action = New-ScheduledTaskAction -Execute "docker" -Argument "restart openclaw-gateway-1"
$trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 1 -DaysOfWeek Monday -At "04:05AM"
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal
```

### Managing the Scheduled Task

**Check status (recommended)**:
```powershell
cd D:\MeowMoltBot
.\restart-moltbot-daily.ps1 -Mode status
```

**Disable / enable**:
```powershell
.\restart-moltbot-daily.ps1 -Mode disable
.\restart-moltbot-daily.ps1 -Mode enable
```

**Test the task manually**:
```powershell
docker restart openclaw-gateway-1
```

**Delete (remove) the task**:
```powershell
.\restart-moltbot-daily.ps1 -Mode remove
```

### Diagnostic Commands

**Check for fetch errors**:
```powershell
docker logs --since 24h | grep "fetch failed" | tail -20
```

**Check for timeouts**:
```powershell
docker logs --since 24h | grep "timeout" | tail -10
```

**Check last heartbeat**:
```powershell
docker logs --since 24h | grep "heartbeat" | tail -10
```

**Check bot status**:
```powershell
docker exec openclaw-gateway-1 node dist/index.js status
```

**View recent logs**:
```powershell
docker logs --tail 50 openclaw-gateway-1
```

**Follow logs in real-time**:
```powershell
docker logs -f openclaw-gateway-1
```

### Investigation: Router/ISP Issue

To investigate the root cause:

**Check router settings**:
- Log into router admin panel (usually 192.168.1.1 or 192.168.0.1)
- Look for "Administration", "Maintenance", or "System" settings
- Check for scheduled tasks:
  - Firmware updates
  - DHCP renewal
  - Auto-reboot
  - Parental controls
- Check logs around 3:20 AM for any events

**Contact ISP**:
- Ask if they do maintenance between 3-4 AM
- Check if there are known outages in your area
- Inquire about equipment upgrades if router is old

**Consider router upgrade**:
- Old routers may have issues maintaining stable connections
- Look for models with better reliability
- Consider mesh systems if coverage is an issue

### Why This Happens

**Technical Details**:
1. OpenClaw uses the `undici` fetch library for HTTP requests
2. When the GLM API becomes unreachable, the fetch hangs indefinitely
3. No timeout is configured for these requests
4. The heartbeat agent waits 10 minutes before timing out
5. After timeout, the heartbeat system doesn't auto-retry
6. All subsequent API calls also fail (Telegram, GLM, etc.)
7. WebSocket connections still work (local network is fine)

**Why 3:30 AM?**
Common causes:
- ISP maintenance windows (typically 3-4 AM)
- Router firmware auto-update
- DHCP lease renewal issues
- Scheduled network tasks
- Parental controls or filtering schedules

### Prevention Tips

1. **Update router firmware** to latest version
2. **Disable auto-restart** in router settings if set for early morning
3. **Check ISP maintenance schedule** and plan accordingly
4. **Monitor logs regularly** to catch issues early
5. **Keep backup of scheduled tasks** for quick recovery

### Related Documentation

- `CLAUDE.md` - Main admin guide
- `restart-moltbot-daily.ps1` - Scheduled restart script
- `ARCHITECTURE.md` - System architecture
- OpenClaw docs: https://docs.openclaw.ai/

### History

| Date | Issue | Resolution |
|------|-------|------------|
| 2025-02-06 | Heartbeat stops at 3:30 AM | Created scheduled restart at 4 AM |
| | | |

---

**Last Updated**: 2026-02-09
**Status**: ⚠️ Mitigated (optional scheduled restart)
**Priority**: Medium (investigate router/ISP root cause when possible)
