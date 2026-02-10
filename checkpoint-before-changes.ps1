# Git Checkpoint Script - Safety Before Risky Changes
# Run this before letting Claude or the bot modify OpenClaw files

$OpenClawPath = "D:\MeowMoltBot\OpenClaw"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$CheckpointTag = "checkpoint-$Timestamp"

Write-Host "=== Creating Git Checkpoint ===" -ForegroundColor Cyan
Write-Host "Location: $OpenClawPath" -ForegroundColor Gray
Write-Host "Tag: $CheckpointTag" -ForegroundColor Gray
Write-Host ""

Push-Location $OpenClawPath

# Check if there are any changes
$Status = git status --porcelain
if (-not $Status) {
    Write-Host "No changes detected. Creating time-based checkpoint anyway." -ForegroundColor Yellow
    git tag $CheckpointTag
    Write-Host "✓ Time-based checkpoint created: $CheckpointTag" -ForegroundColor Green
} else {
    Write-Host "Uncommitted changes detected:" -ForegroundColor Yellow
    git status --short
    Write-Host ""

    $Response = Read-Host "Commit these changes? (y/n)"
    if ($Response -eq 'y') {
        $CommitMsg = Read-Host "Enter commit message (or press Enter for default)"
        if ([string]::IsNullOrWhiteSpace($CommitMsg)) {
            $CommitMsg = "Checkpoint before changes - $Timestamp"
        }

        git add .
        git commit -m $CommitMsg
        git tag $CheckpointTag

        Write-Host ""
        Write-Host "✓ Committed and tagged: $CheckpointTag" -ForegroundColor Green
    } else {
        Write-Host "⚠ No checkpoint created. Aborting." -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

# Show recent checkpoints
Write-Host ""
Write-Host "=== Recent Checkpoints ===" -ForegroundColor Cyan
$Checkpoints = git tag -l "checkpoint-*" | Sort-Object -Descending | Select-Object -First 5
if ($Checkpoints) {
    $Checkpoints | ForEach-Object {
        $Date = $_.Replace("checkpoint-", "").Replace("-", " ").Substring(0, 10)
        $Info = git log $_ --oneline -1 2>$null
        Write-Host "  $_  ($Date)" -ForegroundColor Gray
    }
} else {
    Write-Host "  No previous checkpoints" -ForegroundColor Gray
}

Pop-Location
Write-Host ""
Write-Host "To rollback: git reset --hard $CheckpointTag" -ForegroundColor Yellow
