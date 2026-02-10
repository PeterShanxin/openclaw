#!/bin/sh
# fix-ntfs-auth.sh - Workaround for NTFS chmod issue with OAuth auth-profiles.json
#
# Problem: OpenClaw tries chmod 600 on auth-profiles.json after token refresh.
#          This fails on NTFS mounts, crashing the agent.
#
# Solution: Move auth-profiles.json to container's /tmp (ext4 filesystem where
#           chmod works), keep a backup on NTFS for persistence across recreates,
#           and create symlinks from the original locations to /tmp.

AUTH_TMP="/tmp/openclaw-auth"
mkdir -p "$AUTH_TMP"

for agent in nova assistbot securityhawk; do
  src="/home/node/.openclaw/agents/$agent/agent/auth-profiles.json"
  bak="${src}.ntfs-bak"
  dst="$AUTH_TMP/${agent}-auth-profiles.json"
  dir="$(dirname "$src")"

  # Skip if agent directory doesn't exist
  [ -d "$dir" ] || continue

  if [ -f "$src" ] && [ ! -L "$src" ]; then
    # Case 1: Regular file on NTFS (first run or fresh login)
    # Copy to tmpfs, backup on NTFS, replace with symlink
    cp "$src" "$dst"
    cp "$src" "$bak" 2>/dev/null
    rm -f "$src"
    ln -s "$dst" "$src"
    echo "[fix-ntfs-auth] $agent: moved auth-profiles.json to tmpfs"

  elif [ -L "$src" ] && [ ! -f "$dst" ] && [ -f "$bak" ]; then
    # Case 2: Stale symlink after container recreate (tmpfs lost, backup exists)
    # Restore from NTFS backup to tmpfs, fix symlink
    rm -f "$src"
    cp "$bak" "$dst"
    ln -s "$dst" "$src"
    echo "[fix-ntfs-auth] $agent: restored auth-profiles.json from backup"

  elif [ -L "$src" ] && [ -f "$dst" ]; then
    # Case 3: Everything already set up (container restart without recreate)
    # Sync backup from tmpfs (may have refreshed tokens)
    cp "$dst" "$bak" 2>/dev/null
    echo "[fix-ntfs-auth] $agent: auth-profiles.json already on tmpfs"

  elif [ ! -e "$src" ] && [ -f "$bak" ]; then
    # Case 4: File was deleted but backup exists
    cp "$bak" "$dst"
    ln -s "$dst" "$src"
    echo "[fix-ntfs-auth] $agent: restored from backup (file was missing)"

  else
    echo "[fix-ntfs-auth] $agent: no auth-profiles.json (not yet authenticated)"
  fi
done

# Start OpenClaw via the original entrypoint
echo "[fix-ntfs-auth] Starting OpenClaw..."
exec docker-entrypoint.sh node dist/index.js gateway --allow-unconfigured
