param(
  [switch]$IncludeEnv,
  [switch]$IncludeBackups,
  [switch]$IncludeWorkspaceNodeModules
)

$ErrorActionPreference = "Stop"

function Ensure-Exists($Path) {
  if (-not (Test-Path $Path)) {
    throw "Missing path: $Path"
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
Set-Location $repoRoot | Out-Null

Ensure-Exists (Join-Path $repoRoot "openclaw-config")
Ensure-Exists (Join-Path $repoRoot "openclaw-workspace")
Ensure-Exists (Join-Path $repoRoot "chrome-headless-profile")

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $repoRoot "backups"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$bundleName = "moltbot-migration-bundle-$timestamp.tar.gz"
$bundlePath = Join-Path $outDir $bundleName

$tempDir = Join-Path $env:TEMP "moltbot-migrate-$timestamp"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

try {
  Copy-Item (Join-Path $repoRoot "openclaw-config") -Destination $tempDir -Recurse -Force
  Copy-Item (Join-Path $repoRoot "openclaw-workspace") -Destination $tempDir -Recurse -Force
  Copy-Item (Join-Path $repoRoot "chrome-headless-profile") -Destination $tempDir -Recurse -Force

  # The Windows+Docker setup may contain NTFS workaround symlinks (ReparsePoints) for auth-profiles.
  # Replace them with the corresponding *.ntfs-bak real files so the bundle is portable to Linux.
  foreach ($agentId in @("nova", "assistbot", "securityhawk")) {
    $agentDir = Join-Path $tempDir ("openclaw-config\\agents\\$agentId\\agent")
    $linkPath = Join-Path $agentDir "auth-profiles.json"
    $bakPath = Join-Path $agentDir "auth-profiles.json.ntfs-bak"

    if (Test-Path $linkPath) {
      $item = Get-Item -Force $linkPath
      $isReparse = [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
      if ($isReparse -and (Test-Path $bakPath)) {
        Remove-Item -Force $linkPath
        Copy-Item -Force $bakPath $linkPath
      }
    }
  }

  if (-not $IncludeWorkspaceNodeModules) {
    $nm = Join-Path $tempDir "openclaw-workspace\\node_modules"
    if (Test-Path $nm) {
      Remove-Item $nm -Recurse -Force
    }
  }

  if ($IncludeEnv) {
    $envFile = Join-Path $repoRoot ".env"
    if (Test-Path $envFile) {
      Copy-Item $envFile -Destination $tempDir -Force
    } else {
      Write-Warning ".env not found; continuing"
    }
  }

  if ($IncludeBackups) {
    $bk = Join-Path $repoRoot "backups"
    if (Test-Path $bk) {
      Copy-Item $bk -Destination $tempDir -Recurse -Force
    }
  }

  # Create tar.gz using system tar (bsdtar on Windows is fine).
  Push-Location $tempDir
  try {
    $extra = @()
    if ($IncludeEnv) { $extra += ".env" }
    if ($IncludeBackups -and (Test-Path (Join-Path $tempDir "backups"))) { $extra += "backups" }

    & tar -czf $bundlePath openclaw-config openclaw-workspace chrome-headless-profile @extra
  } finally {
    Pop-Location
  }

  Write-Host "Created: $bundlePath"
  Write-Host "Tip: upload via scp, then extract on the VM."
} finally {
  if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
  }
}
