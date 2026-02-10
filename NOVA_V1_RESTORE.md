# Nova V1 Backup + Restore (MeowMoltBot)

This doc captures how to restore the currently-working "nova" setup as of **2026-02-09**.

## What "Nova" Includes (Practical Definition)

- Docker stack (`docker-compose.yml`)
- Runtime config (`openclaw-config/`)
- Nova brain / workspaces (`openclaw-workspace/`)
- Chrome headless profile for browser tool (`chrome-headless-profile/`)
- Host scripts/docs in this repo (`*.ps1`, `*.md`, etc.)
- OpenClaw framework source (`OpenClaw/`) including its git metadata (so you can reproduce the exact code state)

Notes:
- `.env` is included in the backup archive so the stack can be restored. Treat the archive as **secret** material.
- OAuth `auth-profiles.json` for some agents is a Windows reparse-point/symlink (NTFS workaround). The backup captures the `*.ntfs-bak` copies which are the portable source-of-truth.

## Backup Artifact (V1)

Created on **2026-02-09**.

- Archive: `D:\MeowMoltBot\backups\nova-full-20260209-215749.tar.gz`
- SHA256: `AC10684DBADDBE03FABA2CB4C60A36DBB8C8E78234E6AE0388BFE30888E1004A`
  - Recorded in: `D:\MeowMoltBot\backups\nova-full-20260209-215749.sha256.txt`

Reference state:
- Docker image: `openclaw:local` = `sha256:2cd11978391be4e45d3de6e83c3c6f13a4f1ca09730a98119c6d9f415de2da40`
- OpenClaw repo HEAD (at backup time): `224126a0d` (short)

## Restore Procedure (To a Fresh Machine or Fresh Folder)

1. Install prerequisites:
   - Docker Desktop (Windows)
   - Git (optional but recommended)
   - PowerShell 7 (recommended)
   - Google Chrome (for headless browser)

2. Choose a restore location:
   - Recommended target path: `D:\MeowMoltBot`
   - If restoring elsewhere, update paths in scripts/config as needed (especially browser CDP URL / portproxy settings).

3. Stop anything currently running (if this is an in-place restore):
```powershell
Set-Location D:\MeowMoltBot
docker compose down
```

4. Extract the archive (into the parent of your target folder):
```powershell
# Example: restore to D:\MeowMoltBot (extract in D:\)
Set-Location D:\
tar -xzf D:\MeowMoltBot\backups\nova-full-20260209-215749.tar.gz
```

5. Restore/verify secrets:
   - Confirm `D:\MeowMoltBot\.env` exists and has correct keys/tokens for your environment.
   - If moving across machines, you may need to re-login OAuth providers and/or re-pair Telegram.

6. Build the OpenClaw image (optional if you already have `openclaw:local`):
```powershell
Set-Location D:\MeowMoltBot\OpenClaw
git rev-parse --short HEAD
docker build -t openclaw:local .
```

7. Start Chrome headless + network port-forwarding:
```powershell
Set-Location D:\MeowMoltBot
.\start-headless-chrome.ps1

# If browser cannot be reached from Docker, re-add portproxy (Admin required):
.\setup-browser-portforwarding.ps1
```

8. Start the stack:
```powershell
Set-Location D:\MeowMoltBot
docker compose up -d
```

9. Verify health:
```powershell
docker ps | Select-String openclaw
docker logs --tail 80 openclaw-gateway-1
docker exec openclaw-gateway-1 node dist/index.js status
docker exec openclaw-gateway-1 node dist/index.js browser status
```

## CDP URL (Browser Connectivity)

If `browser status` shows `running: false` even though Chrome is up, the container may not be able to reach the host IP used by `cdpUrl`.

Current known-good pattern (Docker Desktop): use the IPv4 behind `host.docker.internal`:
- `http://192.168.65.254:9222`

Quick verification from inside the container:
```powershell
docker exec openclaw-gateway-1 sh -lc "curl -sS --max-time 3 http://192.168.65.254:9222/json/version | head"
```

## OAuth / NTFS Symlink Notes (auth-profiles.json)

On Windows NTFS mounts, OpenClaw uses a workaround (`fix-ntfs-auth.sh`) that:
- keeps `auth-profiles.json` as a reparse-point/symlink
- persists a portable backup as `auth-profiles.json.ntfs-bak`

If you restore onto a fresh Docker container and auth breaks, do:
```powershell
Set-Location D:\MeowMoltBot
docker compose up -d --force-recreate
```
