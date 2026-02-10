# Phase 4: Migrate Nova to GCP (Compute Engine, bare metal)

Goal: move the **running** Nova system (state + workspace + browser profile) from this Windows+Docker host to a Linux VM on GCP, without losing identity/memory/sessions.

## What to migrate (“Nova core files”)

- `openclaw-config/` (this is the **state dir**: credentials, sessions, cron jobs/runs, device identity, media cache, etc.)
- `openclaw-workspace/` (SOUL/IDENTITY/HEARTBEAT/skills/memory)
- `chrome-headless-profile/` (so browser stays logged in)
- `.env` (optional; only if you still rely on env vars for some providers/tools)
- `backups/` (optional)

## 0) Pick a VM shape (recommended defaults)

- OS: **Ubuntu 24.04 LTS** (22.04 is fine too)
- Machine: start with **e2-standard-4 (4 vCPU / 16 GB)** if you want Chrome + heavy models; go smaller later if stable
- Disk: **80–150 GB** balanced PD (bigger if you keep lots of inbound media)
- Networking: SSH only. Keep the OpenClaw gateway bound to loopback (no public port needed).

## 1) Create the GCE instance (console is fine)

Minimum checkboxes:
- Allow SSH (default)
- Leave HTTP/HTTPS unchecked (not needed)
- Use a persistent disk

If you plan to use **Vertex** (`google-vertex` provider):
- Enable **Vertex AI API** in the project
- Ensure the VM’s service account has a role like **Vertex AI User**

## 2) Bootstrap the VM (run on the VM)

```bash
sudo apt-get update
sudo apt-get install -y git ca-certificates curl jq build-essential
```

Install Node.js **≥ 22** (pick one):

Option A (nvm, simplest to reason about):
```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
corepack enable
corepack prepare pnpm@latest --activate
```

Option B (system node via distro / nodesource) also works, but keep it ≥ 22.

Create a dedicated user + directories:
```bash
sudo useradd -m -s /bin/bash openclaw || true
sudo mkdir -p /opt/openclaw /var/lib/openclaw
sudo chown -R openclaw:openclaw /opt/openclaw /var/lib/openclaw
```

Clone the ops repo (this repo) for templates + helper scripts:
```bash
sudo git clone https://github.com/PeterShanxin/MeowMoltBot.git /opt/meowmoltbot || true
sudo chown -R "${USER}:${USER}" /opt/meowmoltbot || true
```

## 3) Build OpenClaw from your fork (run on the VM)

```bash
sudo -iu openclaw
cd /opt/openclaw

# Use YOUR fork/branch that contains the 2026-02-10 integration work
git clone https://github.com/PeterShanxin/openclaw.git .
git checkout main

pnpm install
pnpm build
```

## 4) Create a migration bundle on Windows (run locally)

From `D:\MeowMoltBot`:
```powershell
mkdir -Force backups | Out-Null
.\scripts\cloud\make-migration-bundle.ps1
```

This creates a tarball under `backups\` containing:
- `openclaw-config/`
- `openclaw-workspace/` (excluding `openclaw-workspace/node_modules/` by default)
- `chrome-headless-profile/`
- `.env` (optional; controlled by a switch)

## 5) Upload bundle to the VM (run locally)

```powershell
# Replace:
# - USER (usually: openclaw or your own linux user)
# - IP
scp .\backups\moltbot-migration-bundle-*.tar.gz openclaw@IP:~/
```

## 6) Restore on the VM (run on the VM)

```bash
sudo -iu openclaw
mkdir -p ~/migrate
cd ~/migrate
tar -xzf ~/moltbot-migration-bundle-*.tar.gz

# Stop services if you rerun this (safe if they don't exist yet)
sudo systemctl stop openclaw-gateway.service 2>/dev/null || true
sudo systemctl stop chrome-headless.service 2>/dev/null || true

# Restore state/workspace/browser profile
sudo rsync -a --delete ./openclaw-config/ /var/lib/openclaw/
sudo rsync -a --delete ./openclaw-workspace/ /var/lib/openclaw/workspace/
sudo rsync -a --delete ./chrome-headless-profile/ /var/lib/openclaw/chrome-profile/

sudo chown -R openclaw:openclaw /var/lib/openclaw
```

## 7) Patch config paths + browser CDP URL for Linux (run on the VM)

Your current config points the browser to a Docker Desktop host IP. On Linux, use localhost:

```bash
node /opt/meowmoltbot/scripts/cloud/patch-openclaw-json-for-linux.mjs /var/lib/openclaw/openclaw.json
```

### Optional compatibility symlink (recommended)

Some older workspace scripts (or migrated config fragments) may still reference `/home/node/.openclaw/...`.
If you see errors like `EACCES: permission denied, mkdir '/home/node'`, create a compatibility home:

```bash
sudo mkdir -p /home/node
sudo ln -sfn /var/lib/openclaw /home/node/.openclaw
sudo chmod 755 /home/node
```

## 8) Install Chromium + systemd services (run on the VM)

Install a browser (pick one that works in your Ubuntu image):

```bash
sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium || true
```

If Ubuntu routes Chromium to Snap and you prefer that path:
```bash
sudo snap install chromium
```

Install service files:
```bash
sudo mkdir -p /etc/openclaw
sudo cp /opt/meowmoltbot/cloud/gcp/systemd/openclaw-gateway.service /etc/systemd/system/openclaw-gateway.service
sudo cp /opt/meowmoltbot/cloud/gcp/systemd/chrome-headless.service /etc/systemd/system/chrome-headless.service
sudo cp /opt/meowmoltbot/cloud/gcp/moltbot.env.template /etc/openclaw/moltbot.env
sudo chmod 600 /etc/openclaw/moltbot.env
sudo nano /etc/openclaw/moltbot.env

sudo systemctl daemon-reload
sudo systemctl enable chrome-headless.service openclaw-gateway.service
sudo systemctl restart chrome-headless.service
sudo systemctl restart openclaw-gateway.service
```

## 9) Verify (run on the VM)

```bash
sudo systemctl status chrome-headless.service --no-pager
sudo systemctl status openclaw-gateway.service --no-pager

sudo journalctl -u chrome-headless.service -n 200 --no-pager
sudo journalctl -u openclaw-gateway.service -n 200 --no-pager

curl -fsS http://127.0.0.1:9222/json/version | jq .
```

Then send Nova a Telegram DM and confirm:
- replies work
- heartbeat starts
- `browser screenshot` works
- memory search still works (should rebuild/refresh automatically if needed)

## 10) Cutover (safe)

Once cloud Nova is confirmed stable:
- stop local Docker: `docker-compose down`
- keep local backups for rollback

## Rollback

If anything looks wrong:
- keep cloud VM running but stop services
- restart local: `docker-compose up -d`
