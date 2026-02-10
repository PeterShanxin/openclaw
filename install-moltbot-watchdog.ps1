# Install/disable/remove a periodic watchdog task that runs recover-moltbot.ps1.
# Purpose: auto-heal after VPN/network flaps or Docker Desktop engine hiccups.
#
# IMPORTANT: Install/disable/remove operations MUST be run as Administrator if you choose RunAs=SYSTEM.
# Task Scheduler runs in the Windows local timezone.

[CmdletBinding()]
param(
  [ValidateSet("install", "disable", "enable", "remove", "status")]
  [string]$Mode = "install",

  # How often to run the heal check.
  [int]$IntervalMinutes = 5,

  # Container name to heal.
  [string]$Container = "openclaw-gateway-1",

  # Repo directory containing docker-compose.yml and recover-moltbot.ps1
  [string]$RepoDir = $PSScriptRoot,

  # Run as SYSTEM (requires Admin to install) or current user (no Admin required, but only runs while logged in).
  [ValidateSet("SYSTEM", "CurrentUser")]
  [string]$RunAs = "CurrentUser"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$taskName =
  if ($RunAs -eq "SYSTEM") { "Heal MoltBot (SYSTEM)" } else { "Heal MoltBot (User)" }

function Test-IsAdmin {
  return ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-TaskOrNull([string]$name) {
  try { return Get-ScheduledTask -TaskName $name -ErrorAction Stop } catch { return $null }
}

function Disable-TaskIfExists([string]$name) {
  $t = Get-TaskOrNull $name
  if ($null -eq $t) { return $false }
  Disable-ScheduledTask -TaskName $name | Out-Null
  return $true
}

function Enable-TaskIfExists([string]$name) {
  $t = Get-TaskOrNull $name
  if ($null -eq $t) { return $false }
  Enable-ScheduledTask -TaskName $name | Out-Null
  return $true
}

function Remove-TaskIfExists([string]$name) {
  $t = Get-TaskOrNull $name
  if ($null -eq $t) { return $false }
  Unregister-ScheduledTask -TaskName $name -Confirm:$false | Out-Null
  return $true
}

function Show-TaskStatus([string]$name) {
  $t = Get-TaskOrNull $name
  if ($null -eq $t) {
    Write-Host "  - ${name}: (not found)" -ForegroundColor DarkGray
    return
  }
  $info = Get-ScheduledTaskInfo -TaskName $name
  Write-Host "  - ${name}: $($t.State) (LastRun=$($info.LastRunTime), NextRun=$($info.NextRunTime))" -ForegroundColor White
}

if ($Mode -eq "status") {
  Write-Host "MoltBot watchdog task status:" -ForegroundColor Cyan
  Show-TaskStatus $taskName
  exit 0
}

if ($RunAs -eq "SYSTEM" -and -not (Test-IsAdmin)) {
  Write-Host "ERROR: This script must be run as Administrator for RunAs=SYSTEM." -ForegroundColor Red
  Write-Host "Re-open PowerShell as Administrator, then run:" -ForegroundColor Yellow
  Write-Host "  cd D:\\MeowMoltBot" -ForegroundColor Yellow
  Write-Host "  .\\install-moltbot-watchdog.ps1 -Mode $Mode -RunAs SYSTEM" -ForegroundColor Yellow
  exit 1
}

if ($Mode -eq "disable") {
  if (Disable-TaskIfExists $taskName) {
    Write-Host "✓ Disabled '$taskName'." -ForegroundColor Green
  } else {
    Write-Host "No matching task found to disable: '$taskName'." -ForegroundColor DarkGray
  }
  exit 0
}

if ($Mode -eq "enable") {
  if (Enable-TaskIfExists $taskName) {
    Write-Host "✓ Enabled '$taskName'." -ForegroundColor Green
  } else {
    Write-Host "No matching task found to enable: '$taskName'." -ForegroundColor DarkGray
  }
  exit 0
}

if ($Mode -eq "remove") {
  if (Remove-TaskIfExists $taskName) {
    Write-Host "✓ Removed '$taskName'." -ForegroundColor Green
  } else {
    Write-Host "No matching task found to remove: '$taskName'." -ForegroundColor DarkGray
  }
  exit 0
}

# install
$interval = [math]::Max(1, [int]$IntervalMinutes)
$scriptPath = Join-Path $RepoDir "recover-moltbot.ps1"
if (-not (Test-Path $scriptPath)) {
  throw "Missing '$scriptPath'."
}

$args = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$scriptPath`"",
  "-Mode", "heal",
  "-Container", $Container,
  "-ComposeDir", "`"$RepoDir`""
) -join " "

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $args

# Start in 1 minute, repeat forever-ish.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $interval) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

$principal =
  if ($RunAs -eq "SYSTEM") {
    New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  } else {
    # Run for current user only (more reliable with Docker Desktop UI mode).
    $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    New-ScheduledTaskPrincipal -UserId $user -LogonType InteractiveToken -RunLevel Highest
  }

if (Get-TaskOrNull $taskName) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
}

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description "Periodically runs recover-moltbot.ps1 to heal Docker Desktop + openclaw-gateway-1 after network/VPN flaps." | Out-Null

Write-Host "✓ Watchdog task installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Task Details:" -ForegroundColor Cyan
Write-Host "  Name:     $taskName" -ForegroundColor White
Write-Host "  Interval: every $interval minute(s)" -ForegroundColor White
Write-Host "  Run as:   $RunAs" -ForegroundColor White
Write-Host "  Action:   powershell.exe $args" -ForegroundColor White
Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Cyan
Write-Host "  Status:   .\\install-moltbot-watchdog.ps1 -Mode status -RunAs $RunAs" -ForegroundColor Yellow
Write-Host "  Disable:  .\\install-moltbot-watchdog.ps1 -Mode disable -RunAs $RunAs" -ForegroundColor Yellow
Write-Host "  Enable:   .\\install-moltbot-watchdog.ps1 -Mode enable -RunAs $RunAs" -ForegroundColor Yellow
Write-Host "  Remove:   .\\install-moltbot-watchdog.ps1 -Mode remove -RunAs $RunAs" -ForegroundColor Yellow

