# Run this script as Administrator
# This script sets up port forwarding to allow Docker container to connect to Chrome

Write-Host "🔧 Setting up port forwarding for Chrome DevTools Protocol..."
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Get Docker network gateway IP
$dockerGatewayIP = "172.28.224.1"

# Check if rule already exists
$existingRule = netsh interface portproxy show all | Select-String "$dockerGatewayIP.*9222"
if ($existingRule) {
    Write-Host "⚠️  Port forwarding rule already exists." -ForegroundColor Yellow
    $response = Read-Host "Remove and recreate? (y/n)"
    if ($response -eq 'y') {
        netsh interface portproxy delete v4tov4 listenport=9222 listenaddress=$dockerGatewayIP
        Write-Host "✅ Old rule removed."
    } else {
        Write-Host "Exiting without changes."
        exit 0
    }
}

# Add port forwarding rule
Write-Host "Adding port forwarding rule..."
netsh interface portproxy add v4tov4 listenport=9222 listenaddress=$dockerGatewayIP connectport=9222 connectaddress=127.0.0.1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Port forwarding rule added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current port forwarding rules:"
    netsh interface portproxy show all
    Write-Host ""
    Write-Host "The OpenClaw container can now connect to Chrome at $dockerGatewayIP`:9222"
} else {
    Write-Host "❌ Failed to add port forwarding rule." -ForegroundColor Red
    exit 1
}
