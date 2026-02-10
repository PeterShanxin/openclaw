# Schedule a MoltBot restart task (Windows Task Scheduler) to recover from planned network outages.
# IMPORTANT: Install/disable/remove operations MUST be run as Administrator.
# Task Scheduler runs in the Windows local timezone (set your Windows timezone to SGT if you want SGT times).

[CmdletBinding()]
param(
    # Default: install a weekly restart on Mondays shortly after a planned 03:00-04:00 outage window.
    [ValidateSet("install-weekly-monday", "install-daily", "disable", "enable", "remove", "status")]
    [string]$Mode = "install-weekly-monday",

    # Trigger time in local Windows time (e.g. 04:05AM).
    [string]$At = "04:05AM",

    # Container name to restart.
    [string]$Container = "openclaw-gateway-1"
)

$taskName = "Restart MoltBot (Network Recovery)"
$legacyTaskName = "Restart MoltBot Daily"

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
    Write-Host "MoltBot restart task status:" -ForegroundColor Cyan
    Show-TaskStatus $taskName
    Show-TaskStatus $legacyTaskName
    exit 0
}

if (-not (Test-IsAdmin)) {
    Write-Host "ERROR: This script must be run as Administrator for '$Mode'." -ForegroundColor Red
    Write-Host "Re-open PowerShell as Administrator, then run:" -ForegroundColor Yellow
    Write-Host "  cd D:\\MeowMoltBot" -ForegroundColor Yellow
    Write-Host "  .\\restart-moltbot-daily.ps1 -Mode $Mode" -ForegroundColor Yellow
    exit 1
}

if ($Mode -eq "disable") {
    Write-Host "Disabling MoltBot restart scheduled task(s)..." -ForegroundColor Cyan
    $disabled = 0
    if (Disable-TaskIfExists $taskName) { $disabled++ }
    if (Disable-TaskIfExists $legacyTaskName) { $disabled++ }
    if ($disabled -eq 0) {
        Write-Host "No matching scheduled tasks found to disable." -ForegroundColor DarkGray
    } else {
        Write-Host "✓ Disabled $disabled task(s)." -ForegroundColor Green
    }
    exit 0
}

if ($Mode -eq "enable") {
    Write-Host "Enabling MoltBot restart scheduled task(s)..." -ForegroundColor Cyan
    $enabled = 0
    if (Enable-TaskIfExists $taskName) { $enabled++ }
    if (Enable-TaskIfExists $legacyTaskName) { $enabled++ }
    if ($enabled -eq 0) {
        Write-Host "No matching scheduled tasks found to enable." -ForegroundColor DarkGray
    } else {
        Write-Host "✓ Enabled $enabled task(s)." -ForegroundColor Green
    }
    exit 0
}

if ($Mode -eq "remove") {
    Write-Host "Removing MoltBot restart scheduled task(s)..." -ForegroundColor Cyan
    $removed = 0
    if (Remove-TaskIfExists $taskName) { $removed++ }
    if (Remove-TaskIfExists $legacyTaskName) { $removed++ }
    if ($removed -eq 0) {
        Write-Host "No matching scheduled tasks found to remove." -ForegroundColor DarkGray
    } else {
        Write-Host "✓ Removed $removed task(s)." -ForegroundColor Green
    }
    exit 0
}

Write-Host "Configuring scheduled task for MoltBot restart..." -ForegroundColor Cyan
Write-Host "  Mode: $Mode" -ForegroundColor White
Write-Host "  At:   $At (local Windows time)" -ForegroundColor White
Write-Host ""

# Prefer recover-moltbot.ps1 so we can restart Docker Desktop if the engine is wedged
# (common after VPN/network flaps) before restarting the container.
$recoverScript = Join-Path $PSScriptRoot "recover-moltbot.ps1"
if (-not (Test-Path $recoverScript)) {
    Write-Host "ERROR: Missing required script: $recoverScript" -ForegroundColor Red
    exit 1
}

$actionArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$recoverScript`"",
    "-Mode", "restart-container",
    "-Container", $Container,
    "-ComposeDir", "`"$PSScriptRoot`""
) -join " "

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $actionArgs

switch ($Mode) {
    "install-weekly-monday" {
        $trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 1 -DaysOfWeek Monday -At $At
        $scheduleLabel = "Weekly on Monday at $At"
    }
    "install-daily" {
        $trigger = New-ScheduledTaskTrigger -Daily -At $At
        $scheduleLabel = "Daily at $At"
    }
}

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

try {
    # Migrate away from the legacy name (if it exists) to avoid confusion when switching schedules.
    if (Get-TaskOrNull $legacyTaskName) {
        Write-Host "Legacy task found ($legacyTaskName). Removing it before installing the new schedule..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $legacyTaskName -Confirm:$false | Out-Null
    }

    if (Get-TaskOrNull $taskName) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
    }

    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Description "Restart MoltBot container after planned network outage window" -ErrorAction Stop | Out-Null

    Write-Host "✓ Scheduled task installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name:     $taskName" -ForegroundColor White
    Write-Host "  Schedule: $scheduleLabel" -ForegroundColor White
    Write-Host "  Run as:   SYSTEM" -ForegroundColor White
    Write-Host "  Command:  powershell.exe $actionArgs" -ForegroundColor White
    Write-Host ""
    Write-Host "Management Commands:" -ForegroundColor Cyan
    Write-Host "  Status:   .\\restart-moltbot-daily.ps1 -Mode status" -ForegroundColor Yellow
    Write-Host "  Disable:  .\\restart-moltbot-daily.ps1 -Mode disable" -ForegroundColor Yellow
    Write-Host "  Enable:   .\\restart-moltbot-daily.ps1 -Mode enable" -ForegroundColor Yellow
    Write-Host "  Remove:   .\\restart-moltbot-daily.ps1 -Mode remove" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "See TROUBLESHOOTING-HEARTBEAT.md for details." -ForegroundColor Gray
}
catch {
    Write-Host "ERROR: Failed to configure scheduled task" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "1. Permission denied (ensure running as Administrator)" -ForegroundColor Yellow
    Write-Host "2. Docker not in system PATH (Task Scheduler runs as SYSTEM)" -ForegroundColor Yellow
    Write-Host "3. Invalid time format for -At (try e.g. 04:05AM)" -ForegroundColor Yellow
    exit 1
}
