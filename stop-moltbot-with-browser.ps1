Write-Host "🛑 Stopping MeowMoltBot and headless Chrome..."

# Stop Docker container
Write-Host "1️⃣  Stopping OpenClaw container..."
docker-compose down

# Stop Chrome
Write-Host "2️⃣  Stopping Chrome headless..."
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "✅ All services stopped."
