# Recover MeowMoltBot after network/VPN/Docker Desktop hiccups.
# Goals:
# - Detect "Docker engine is wedged" (docker CLI returns 500 / cannot reach server)
# - Optionally restart Docker Desktop engine
# - Ensure the OpenClaw container is running
#
# This script is safe to run multiple times.

[CmdletBinding()]
param(
  [ValidateSet("heal", "status", "restart-container", "restart-docker-desktop", "watch")]
  [string]$Mode = "heal",

  [string]$Container = "openclaw-gateway-1",

  # Repo root that contains docker-compose.yml
  [string]$ComposeDir = $PSScriptRoot,

  # Max time to wait for Docker engine after restarting Desktop
  [int]$DockerReadyTimeoutSeconds = 120,

  # Also verify the gateway port is reachable on localhost (best-effort).
  [int]$GatewayPort = 18789,

  # Watch loop interval (seconds)
  [int]$IntervalSeconds = 15
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Warn([string]$msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Ok([string]$msg) { Write-Host $msg -ForegroundColor Green }

function Resolve-DockerExe {
  $cmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source -and (Test-Path $cmd.Source)) {
    return $cmd.Source
  }

  $pf = [Environment]::GetFolderPath("ProgramFiles")
  $candidates = @(
    (Join-Path $pf "Docker\\Docker\\resources\\bin\\docker.exe"),
    "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"
  ) | Select-Object -Unique

  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }

  throw "docker.exe not found. Install Docker Desktop or ensure 'docker' is in PATH."
}

$DockerExe = Resolve-DockerExe

function Get-DockerCliPaths {
  $pf = [Environment]::GetFolderPath("ProgramFiles")
  $cli = Join-Path $pf "Docker\\Docker\\DockerCli.exe"
  $desktop = Join-Path $pf "Docker\\Docker\\Docker Desktop.exe"
  return [pscustomobject]@{
    Cli = $cli
    Desktop = $desktop
  }
}

function Test-DockerOk {
  try {
    $out = & $DockerExe version 2>&1
    if ($LASTEXITCODE -ne 0) { return $false }
    return ($out -join "`n") -match "Server:"
  } catch {
    return $false
  }
}

function Wait-Docker([int]$timeoutSeconds) {
  $deadline = (Get-Date).AddSeconds([math]::Max(1, $timeoutSeconds))
  while ((Get-Date) -lt $deadline) {
    if (Test-DockerOk) { return $true }
    Start-Sleep -Seconds 2
  }
  return $false
}

function Restart-DockerDesktop {
  $paths = Get-DockerCliPaths
  if (-not (Test-Path $paths.Cli)) {
    throw "DockerCli.exe not found at '$($paths.Cli)'."
  }
  Write-Info "Restarting Docker Desktop engine..."

  # Shut down Docker Desktop backend.
  & $paths.Cli -Shutdown | Out-Null
  Start-Sleep -Seconds 2

  # Start Docker Desktop UI/backend if the EXE exists.
  if (Test-Path $paths.Desktop) {
    Start-Process -FilePath $paths.Desktop | Out-Null
  } else {
    Write-Warn "Docker Desktop EXE not found at '$($paths.Desktop)'. If Docker does not come back, start Docker Desktop manually."
  }

  Write-Info "Waiting for Docker engine to become ready (timeout=${DockerReadyTimeoutSeconds}s)..."
  if (-not (Wait-Docker -timeoutSeconds $DockerReadyTimeoutSeconds)) {
    throw "Docker engine did not become ready within ${DockerReadyTimeoutSeconds}s."
  }
  Write-Ok "Docker engine is ready."
}

function Get-ContainerStatus([string]$name) {
  try {
    $status = & $DockerExe inspect -f "{{.State.Status}}" $name 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return ($status | Select-Object -First 1).Trim()
  } catch {
    return $null
  }
}

function Ensure-ContainerRunning([string]$name, [string]$dir) {
  $status = Get-ContainerStatus $name
  if ($status -eq "running") {
    Write-Ok "Container '$name' is running."
    return
  }

  if (-not (Test-Path (Join-Path $dir "docker-compose.yml"))) {
    throw "docker-compose.yml not found in '$dir'."
  }

  Write-Warn "Container '$name' is not running (status='$status'). Starting via docker compose..."
  Push-Location $dir
  try {
    & $DockerExe compose up -d | Out-Null
  } finally {
    Pop-Location
  }

  $status = Get-ContainerStatus $name
  if ($status -ne "running") {
    throw "Failed to start container '$name' (status='$status')."
  }
  Write-Ok "Container '$name' is running."
}

function Test-GatewayPort([int]$port) {
  try {
    $result = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
    return [bool]$result.TcpTestSucceeded
  } catch {
    return $false
  }
}

function Show-Status([string]$name) {
  Write-Info "Docker:"
  try { & $DockerExe version } catch { Write-Warn "docker version failed: $($_.Exception.Message)" }
  Write-Info ""
  Write-Info "Container:"
  try {
    & $DockerExe ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
  } catch {
    Write-Warn "docker ps failed: $($_.Exception.Message)"
  }
  Write-Info ""
  try {
    & $DockerExe stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.PIDs}}" $name
  } catch {
    # ignore
  }

  if ($GatewayPort -gt 0) {
    $ok = Test-GatewayPort -port $GatewayPort
    if ($ok) {
      Write-Ok "Gateway port: 127.0.0.1:${GatewayPort} reachable"
    } else {
      Write-Warn "Gateway port: 127.0.0.1:${GatewayPort} NOT reachable"
    }
  }
}

switch ($Mode) {
  "status" {
    Show-Status -name $Container
    exit 0
  }
  "restart-docker-desktop" {
    Restart-DockerDesktop
    exit 0
  }
  "restart-container" {
    if (-not (Test-DockerOk)) {
      Restart-DockerDesktop
    }
    Write-Info "Restarting container '$Container'..."
    & $DockerExe restart $Container | Out-Null
    Ensure-ContainerRunning -name $Container -dir $ComposeDir
    Show-Status -name $Container
    exit 0
  }
  "heal" {
    if (-not (Test-DockerOk)) {
      Restart-DockerDesktop
    }
    Ensure-ContainerRunning -name $Container -dir $ComposeDir
    Show-Status -name $Container
    exit 0
  }
  "watch" {
    Write-Info "Watching Docker + '$Container' (interval=${IntervalSeconds}s). Ctrl+C to stop."
    while ($true) {
      try {
        if (-not (Test-DockerOk)) {
          Restart-DockerDesktop
        }
        Ensure-ContainerRunning -name $Container -dir $ComposeDir
      } catch {
        Write-Warn "Heal attempt failed: $($_.Exception.Message)"
      }
      Start-Sleep -Seconds ([math]::Max(1, $IntervalSeconds))
    }
  }
}
