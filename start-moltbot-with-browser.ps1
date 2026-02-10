Write-Host "🔧 Starting MeowMoltBot with headless browser..."
Write-Host ""

# Check if running as Administrator for port forwarding
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Not running as Administrator." -ForegroundColor Yellow
    Write-Host "Port forwarding may not be configured. For full functionality, run as Administrator." -ForegroundColor Yellow
    Write-Host ""
} else {
    # Set up port forwarding
    Write-Host "0️⃣  Checking port forwarding..."
    $existingRule = netsh interface portproxy show all | Select-String "172.28.224.1.*9222"
    if (-not $existingRule) {
        Write-Host "Setting up port forwarding for Chrome DevTools Protocol..."
        netsh interface portproxy add v4tov4 listenport=9222 listenaddress=172.28.224.1 connectport=9222 connectaddress=127.0.0.1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Port forwarding configured." -ForegroundColor Green
        } else {
            Write-Host "⚠️  Failed to set up port forwarding. Browser may not work." -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ Port forwarding already configured." -ForegroundColor Green
    }
    Write-Host ""
}

# Start Chrome headless
Write-Host "1️⃣  Starting Chrome headless..."
.\start-headless-chrome.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Chrome. Exiting." -ForegroundColor Red
    exit 1
}

# Start Docker container
Write-Host ""
Write-Host "2️⃣  Starting OpenClaw container..."
docker-compose down
docker-compose up -d

# Wait for container to be ready
Write-Host ""
Write-Host "3️⃣  Waiting for container to initialize..."
Start-Sleep -Seconds 5

# Check status
Write-Host ""
Write-Host "4️⃣  Checking browser connection..."
$browserStatus = docker exec openclaw-gateway-1 node dist/index.js browser status 2>&1
Write-Host $browserStatus

if ($browserStatus -match "running:\s*true") {
    Write-Host ""
    Write-Host "✅ MeowMoltBot is ready with browser access!" -ForegroundColor Green
    Write-Host "📱 Send messages to @meow_molt_bot on Telegram"
    Write-Host ""
    Write-Host "Try these commands:"
    Write-Host "  - ""Open https://example.com"""
    Write-Host "  - ""Take a screenshot"""
    Write-Host "  - ""What's on this page?"""
} else {
    Write-Host ""
    Write-Host "⚠️  Browser may not be connected. Check port forwarding configuration." -ForegroundColor Yellow
    Write-Host "Run: .\setup-browser-portforwarding.ps1 (as Administrator)" -ForegroundColor Yellow
}
