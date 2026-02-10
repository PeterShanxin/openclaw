param(
    # If the localhost debug port is already owned by a Chrome process, kill it and restart.
    [switch]$Restart
)

$ErrorActionPreference = "Stop"

# Configuration
$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$DebugPort = 9222
$UserDataDir = "D:\MeowMoltBot\chrome-headless-profile"

# Ensure user data directory exists
New-Item -ItemType Directory -Force -Path $UserDataDir | Out-Null

# Check whether *localhost* is already listening.
# Note: Windows portproxy often listens on a Docker/NAT IP (e.g. 172.x.x.x) on the same port; that should not block Chrome.
$listeners = Get-NetTCPConnection -LocalPort $DebugPort -State Listen -ErrorAction SilentlyContinue
$localhostListener = $listeners | Where-Object { $_.LocalAddress -in @("127.0.0.1", "0.0.0.0", "::") } | Select-Object -First 1

if ($localhostListener) {
    $owner = Get-Process -Id $localhostListener.OwningProcess -ErrorAction SilentlyContinue
    if ($owner -and $owner.ProcessName -ieq "chrome") {
        if ($Restart) {
            Write-Host "⚠️  Port $DebugPort is already bound by Chrome (PID $($owner.Id)). Restarting..."
            Stop-Process -Id $owner.Id -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        } else {
            Write-Host "✅ Chrome appears to already be running on localhost:$DebugPort (PID $($owner.Id))."
            exit 0
        }
    } else {
        $procName = if ($owner) { $owner.ProcessName } else { "<unknown>" }
        throw "Port $DebugPort is already in use on localhost by $procName (PID $($localhostListener.OwningProcess))."
    }
}

# Start Chrome with remote debugging
Write-Host "🚀 Starting Chrome headless with remote debugging on port $DebugPort..."
Start-Process $ChromePath -ArgumentList @(
    "--remote-debugging-port=$DebugPort",
    "--remote-debugging-address=0.0.0.0",
    "--headless=new",
    "--user-data-dir=`"$UserDataDir`"",
    "--no-first-run",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-gpu"
) -WindowStyle Hidden

# Wait for Chrome to start
Write-Host "⏳ Waiting for Chrome to initialize..."
Start-Sleep -Seconds 3

# Test connection
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$DebugPort/json/version" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Chrome is running and accessible on port $DebugPort"
    Write-Host "Browser: $($response.Content | ConvertFrom-Json).Browser"
} catch {
    Write-Host "❌ Failed to connect to Chrome: $_"
    exit 1
}

Write-Host "✅ Chrome headless is ready for OpenClaw connection!"
Write-Host "To stop Chrome later: use Task Manager or run: Stop-Process -Name chrome -Force"
