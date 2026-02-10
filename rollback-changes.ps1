# Git Rollback Script - Restore from Checkpoint
# Use this to undo changes after a risky operation

$OpenClawPath = "D:\MeowMoltBot\OpenClaw"

Write-Host "=== Git Rollback ===" -ForegroundColor Cyan
Write-Host "Location: $OpenClawPath" -ForegroundColor Gray
Write-Host ""

Push-Location $OpenClawPath

# Show current state
Write-Host "Current state:" -ForegroundColor Yellow
git log --oneline -1
$Uncommitted = git status --porcelain
if ($Uncommitted) {
    Write-Host "  ⚠ Uncommitted changes present:" -ForegroundColor Red
    git status --short
}
Write-Host ""

# Show available checkpoints
Write-Host "Available checkpoints:" -ForegroundColor Cyan
$Checkpoints = git tag -l "checkpoint-*" | Sort-Object -Descending | Select-Object -First 10
if (-not $Checkpoints) {
    Write-Host "  No checkpoints found!" -ForegroundColor Red
    Pop-Location
    exit 1
}

$Index = 1
$Checkpoints | ForEach-Object {
    $Date = $_.Replace("checkpoint-", "").Replace("-", " ").Substring(0, 10)
    $Info = git log $_ --oneline -1 2>$null
    Write-Host "  [$Index] $_  ($Date)" -ForegroundColor Gray
    Write-Host "      $Info" -ForegroundColor DarkGray
    $Index++
}
Write-Host "  [B] baseline-20250206 (initial)" -ForegroundColor Gray
Write-Host ""

# Get user selection
$Selection = Read-Host "Select checkpoint to rollback to (1-$($Checkpoints.Count), or B for baseline)"

if ($Selection -eq 'B' -or $Selection -eq 'b') {
    $TargetTag = "baseline-20250206"
} elseif ($Selection -match "^\d+$" -and [int]$Selection -ge 1 -and [int]$Selection -le $Checkpoints.Count) {
    $TargetTag = $Checkpoints[[int]$Selection - 1]
} else {
    Write-Host "⚠ Invalid selection. Aborting." -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host ""
Write-Host "Target: $TargetTag" -ForegroundColor Yellow
$Confirm = Read-Host "⚠ WARNING: This will discard all changes. Confirm? (yes/no)"

if ($Confirm -eq 'yes') {
    git reset --hard $TargetTag
    Write-Host ""
    Write-Host "✓ Rollback complete!" -ForegroundColor Green
    Write-Host "Current state:" -ForegroundColor Yellow
    git log --oneline -1
} else {
    Write-Host "⚠ Rollback cancelled." -ForegroundColor Yellow
}

Pop-Location
