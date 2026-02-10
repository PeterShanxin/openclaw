# CLAUDE.md - MeowMoltBot Admin Assistant Guide

## Your Role

You are the **administrative assistant for MeowMoltBot** - an autonomous AI companion running in Docker. Your primary purpose is to help manage, maintain, and improve MeowMoltBot's operation.

## Quick Context

**MeowMoltBot** is an AI agent that:
- Runs in a Docker container (`openclaw-gateway-1`)
- Communicates via Telegram (@meow_molt_bot)
- Uses Gemini 3 Flash by default (`google-vertex/gemini-3-flash-preview`)
- Has autonomous heartbeat every 10 minutes
- Uses a tri-agent setup: `nova` (main), `assistbot`, `securityhawk`
- **Can browse the web and take screenshots** 🌐
- Learns and grows through experience
- Lives in workspace: `/home/node/.openclaw/workspace` (mounted to `D:\MeowMoltBot\openclaw-workspace`)

## Project Structure

```
D:\MeowMoltBot\
├── OpenClaw/                  # Source code repository (not actively running)
├── openclaw-config/           # Configuration (mounted into container)
│   ├── openclaw.json         # Main config file
│   ├── workspace-assistbot/  # AssistBot workspace
│   └── workspace-securityhawk/ # SecurityHawk workspace
├── openclaw-workspace/        # MoltBot's brain (mounted into container)
│   ├── IDENTITY.md           # Who MoltBot is
│   ├── SOUL.md               # Core directives
│   ├── AGENTS.md             # Operating instructions
│   ├── HEARTBEAT.md          # Autonomous tasks
│   ├── TOOLS.md              # Tool guide
│   ├── MEMORY.md             # Long-term knowledge
│   ├── memory/               # Daily logs (YYYY-MM-DD.md)
│   └── skills/               # Self-created tools
├── chrome-headless-profile/   # Chrome browser data (isolated)
├── .env                       # Environment variables (API keys, tokens)
├── docker-compose.yml        # Container orchestration
├── fix-ntfs-auth.sh           # NTFS chmod workaround for OAuth tokens
├── start-headless-chrome.ps1  # Chrome launcher script
├── setup-browser-portforwarding.ps1  # Network configuration
├── start-moltbot-with-browser.ps1    # Start all services
├── stop-moltbot-with-browser.ps1     # Stop all services
├── ARCHITECTURE.md           # System architecture explanation
├── BROWSER_QUICK_REFERENCE.md        # Browser command reference
├── BROWSER_SETUP_COMPLETE.md         # Browser documentation
├── BROWSER_IMPLEMENTATION_SUMMARY.md # Technical details
├── move-docker-to-d.md       # Docker migration guide
├── WEBSEARCH_SETUP.md        # Web search setup guide
├── MAPS_GROUNDING_LITE_SETUP.md # Maps Grounding Lite setup guide
└── STATUS.md                 # Current implementation status
```

## Essential Commands

### Container Management
```powershell
# Check container status
docker ps | grep openclaw-gateway-1

# Start container
docker-compose up -d

# Stop container
docker-compose down

# Restart container
docker-compose restart

# View logs (real-time)
docker logs -f openclaw-gateway-1

# View recent logs
docker logs --tail 50 openclaw-gateway-1
```

### OpenClaw CLI (Inside Container)
```powershell
# Check system status
docker exec openclaw-gateway-1 node dist/index.js status

# List available models
docker exec openclaw-gateway-1 node dist/index.js models list

# Approve Telegram pairing
docker exec openclaw-gateway-1 node dist/index.js pairing approve telegram <CODE>

# Run diagnostics
docker exec openclaw-gateway-1 node dist/index.js doctor

# Enable/disable plugins
docker exec openclaw-gateway-1 node dist/index.js plugins enable <plugin-name>
docker exec openclaw-gateway-1 node dist/index.js plugins disable <plugin-name>

# Browser commands
docker exec openclaw-gateway-1 node dist/index.js browser status
docker exec openclaw-gateway-1 node dist/index.js browser open <URL>
docker exec openclaw-gateway-1 node dist/index.js browser screenshot
docker exec openclaw-gateway-1 node dist/index.js browser snapshot
```

### Browser Management
```powershell
# Start Chrome headless
.\start-headless-chrome.ps1

# Setup port forwarding (requires Admin)
.\setup-browser-portforwarding.ps1

# Start all services (Chrome + Docker)
.\start-moltbot-with-browser.ps1

# Stop all services
.\stop-moltbot-with-browser.ps1

# Check browser connection
docker exec openclaw-gateway-1 node dist/index.js browser status

# Take a screenshot
docker exec openclaw-gateway-1 node dist/index.js browser screenshot

# Open a webpage
docker exec openclaw-gateway-1 node dist/index.js browser open https://example.com

# Get page structure
docker exec openclaw-gateway-1 node dist/index.js browser snapshot
```

### File Operations
```powershell
# Read MoltBot's memory
cat openclaw-workspace/MEMORY.md

# Read today's exploration log
cat openclaw-workspace/memory/$(date +%Y-%m-%d).md

# Edit personality files
notepad openclaw-workspace/SOUL.md
notepad openclaw-workspace/HEARTBEAT.md

# View configuration
cat openclaw-config/openclaw.json

# Edit environment variables
notepad .env
```

## Current Configuration

### AI Model
- **Primary**: Google Gemini 3 Flash (`google-vertex/gemini-3-flash-preview`)
- **Thinking Level**: `high` (configured via `agents.defaults.thinkingDefault`)
- **Context Window**: 1,048,576 tokens (1M)
- **Fallback Chain** (auto-triggered on 429/401/403/402/timeout):
  1. `google-vertex/gemini-3-flash-preview` — Paid Vertex (ADC: `GOOGLE_APPLICATION_CREDENTIALS` + `GOOGLE_CLOUD_PROJECT` + `GOOGLE_CLOUD_LOCATION`)
  2. `google-gemini-cli/gemini-3-flash-preview` — Free OAuth quota (Gemini CLI)
  3. `google-antigravity/gemini-3-flash` — Free OAuth quota (Cloud Code Assist)
  4. `zai/glm-4.7` — Last-resort fallback (Z.AI `ZAI_API_KEY`)
- **Pro upgrade (manual)**: `/model gemini` → `google-vertex/gemini-3-pro-preview` (use only when Flash is stuck / high-risk)
- **Previous Model**: Z.AI GLM-4.7 (still available via `/model glm`)
- **SecurityHawk**: Claude Opus 4.6 (unchanged, separate from Gemini)

### Communication
- **Channel**: Telegram
- **Bot Username**: @meow_molt_bot
- **Bot Token**: Configured in `.env` and `openclaw-config/openclaw.json` (do not expose)
- **Paired User ID**: 5563081764

### Telegram Interaction Style (Nova)
- **Progressive updates**: Enabled for longer tasks to avoid silent `typing...` gaps
- **Typing refresh interval**: `agents.defaults.typingIntervalSeconds = 3` (faster re-appearance of typing indicator)
- **Multi-bubble during execution (critical)**: `agents.defaults.blockStreamingDefault = "on"` + `agents.defaults.blockStreamingBreak = "text_end"`
  - Without block streaming, Nova can intend to send ACK/progress/final but Telegram may only receive a single final delivery after tools complete.
- **Bubble split mode**: `channels.telegram.chunkMode = "newline"` (auto-split on blank lines between paragraphs; helps multi-bubble replies)
- **Telegram draft streaming**: `channels.telegram.streamMode` is separate from block streaming (uses Telegram `sendMessageDraft`; typically only relevant for private topics). Current config may keep it `off` safely.
- **Long-poll stability**: keep `channels.telegram.timeoutSeconds` comfortably above 30s (we use `75`) so `getUpdates` long polling doesn't hit client timeouts and stall inbound messages.
- **Expected rhythm**:
  1. Quick ACK ("收到，马上开始")
  2. Plan/start update
  3. Milestone updates for meaningful steps
  4. Near-finish update for long tasks
  5. Final completion summary
- **Guardrails**:
  - Keep progress messages short and low-frequency (no spam)
  - For simple tasks, ACK + final is enough
  - If Telegram `message` send fails, retry at most once, then continue and include status in final reply
- **Reaction policy**:
  - Do not use a fixed emoji allowlist
  - Use runtime disallow list at `openclaw-workspace/memory/reaction_disallow_list.json` (starts empty)
  - On `REACTION_INVALID`, add emoji to disallow list and continue text-only

### Browser Capabilities 🌐
- **Browser**: Chrome Headless (Windows host)
- **Connection**: CDP via port forwarding (172.28.224.1:9222)
- **Features**: Navigate, screenshot, analyze pages
- **Status**: ✅ Operational

### Model Aliases (switchable via Telegram `/model <alias>`)
- **Default**: `flash-vertex` (Vertex Flash). Use `flash` / `flash-ag` for the free OAuth-backed Flash tiers.
| Alias | Model | Provider | Cost |
|-------|-------|----------|------|
| `flash` | Gemini 3 Flash | google-gemini-cli (OAuth) | Free |
| `flash-ag` | Gemini 3 Flash | google-antigravity (OAuth) | Free |
| `flash-vertex` | Gemini 3 Flash | google-vertex (ADC) | Paid |
| `gemini` | Gemini 3 Pro | google-vertex (ADC) | Paid |
| `gemini-ag` | Gemini 3 Pro High | google-antigravity (OAuth) | Free |
| `glm` | GLM-4.7 | zai | Free |
| `glm45` | GLM-4.5 | zai | Free |
| `opus` | Claude Opus 4.6 | anthropic | Paid |
| `sonnet` | Claude Sonnet 4.5 | anthropic | Paid |
| `gpt` | GPT-4.1 | openai-codex (OAuth) | Free |
| `qwen` | Qwen Coder | qwen-portal (OAuth) | Free |

### Thinking Level Control
- **Default**: `high` (set in `agents.defaults.thinkingDefault`)
- **Per-message override**: `/think: low quick question here` or `/t medium complex question`
- **Levels**: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`

### Other Capabilities
- **Heartbeat**: Nova every 10 minutes
- **SecurityHawk schedule**: Weekly cron audit (`Weekly SecurityHawk Audit`, Sunday 22:15 SGT, isolated run with Telegram announce)
- **Memory maintenance schedules (cron)**:
  - `Weekly Memory Review` at `22:00` SGT on Sunday (Gemini 3 Pro; consolidates learnings/priorities, does not generate weekly summary file)
  - `Nightly Memory Compaction` at `00:40` SGT (previous-day compaction)
  - `Weekly Memory Summary` at `23:45` SGT on Sunday
  - These run while OpenClaw scheduler is running (container must be up)
- **Heartbeat OK safety policy**: `HEARTBEAT_OK` must be plain assistant text only; never sent via `message` tool
- **Task progress UX policy**: Nova should provide conversational ACK/progress/final updates during long-running tasks
- **Timeouts**:
  - Overall run timeout: default `600s` (OpenClaw default; keep `agents.defaults.timeoutSeconds` unset unless intentionally changing).
  - Stream idle timeout: `agents.defaults.streamIdleTimeoutSeconds = 300` (abort only if no agent stream events are observed; pauses during tool execution/compaction; triggers fallback as `reason="timeout"`).
- **Bootstrap injection cap**: `agents.defaults.bootstrapMaxChars = 20000` (per injected file, not global total)
- **Bootstrap files affected**: `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, and optional `MEMORY.md`/`memory.md`
- **Diary logging policy**: Heartbeat diary must append to `memory/YYYY-MM-DD.md` (never overwrite)
- **Telegram target policy**: Use numeric `chatId` in `message.to` (Peter = `5563081764`)
- **Web Search**: Brave Search API enabled
- **Maps Grounding Lite**: Enabled via local skill script (`openclaw-workspace/skills/maps-grounding-lite/`)
- **Memory System**: Long-term + daily logs + Gemini vector search (hybrid 70% vector / 30% text, `gemini-embedding-001`)
- **Self-Improvement**: Can create skills and tools

### Voice / TTS (Telegram Voice Bubble)
- **Auto TTS**: Tagged only (`messages.tts.auto = "tagged"`)
- **Provider**: Edge TTS (`messages.tts.provider = "edge"`)
- **Working Output Format**: `audio-24khz-48kbitrate-mono-mp3`
- **Voice**: `zh-CN-XiaoxiaoNeural`
- **Status**: Working on Android Telegram and Windows Telegram ARM64 (validated 2026-02-07)
- **Policy**: Text-first by default; voice occasional/on request
- **Important**: Keep MP3 output for stability unless explicitly re-testing. WebM/Opus output had desktop compatibility issues.
- **Reference**: `openclaw-workspace/TTS_CONFIGURATION.md`
- **Voice discovery helper**: Use `node /home/node/.openclaw/workspace/skills/google-tts/scripts/list-voices.mjs cmn-CN` (or the workspace-level `list-voices.js`) to list live Mandarin voices before picking a new name (includes `cmn-CN-Chirp3-HD-*` entries).

## Common Admin Tasks

### 1. Monitor MoltBot's Activity

**Check what MoltBot has been learning:**
```powershell
# Recent logs
docker logs --tail 100 openclaw-gateway-1

# Today's explorations
cat openclaw-workspace/memory/2026-02-05.md

# Long-term memory
cat openclaw-workspace/MEMORY.md
```

**Check for heartbeat activity:**
```powershell
docker logs | grep -i heartbeat
```

**Check weekly SecurityHawk cron job:**
```powershell
docker exec openclaw-gateway-1 node dist/index.js cron list | grep -i securityhawk
```

**Check browser activity:**
```powershell
# Browser status
docker exec openclaw-gateway-1 node dist/index.js browser status

# Recent browser actions in logs
docker logs | grep -i browser

# View screenshots taken
ls openclaw-config/media/browser/
```

### 2. Modify MoltBot's Personality

**Edit SOUL.md to change core behavior:**
```powershell
notepad openclaw-workspace/SOUL.md
```

**Edit HEARTBEAT.md to change autonomous tasks:**
```powershell
notepad openclaw-workspace/HEARTBEAT.md
```

**After editing, restart container:**
```powershell
docker restart openclaw-gateway-1
```

### 3. Troubleshoot Issues

**Bot not responding:**
```powershell
# Check if container is running
docker ps | grep openclaw-gateway-1

# Check logs for errors
docker logs --tail 50 openclaw-gateway-1

# Restart container
docker restart openclaw-gateway-1
```

**Model/API errors:**
```powershell
# Check model/provider status
docker exec openclaw-gateway-1 node dist/index.js models list

# Re-authenticate Google OAuth (if tokens expire)
docker exec -it openclaw-gateway-1 node dist/index.js models auth login --provider google-antigravity
docker exec -it openclaw-gateway-1 node dist/index.js models auth login --provider google-gemini-cli

# Re-authenticate other providers
docker exec -it openclaw-gateway-1 node dist/index.js models auth login --provider qwen-portal --set-default
```

**NTFS chmod errors with OAuth (auth-profiles.json):**
The `fix-ntfs-auth.sh` startup script handles this automatically by:
1. Moving auth-profiles.json to container's /tmp (ext4 filesystem)
2. Creating symlinks from the original NTFS locations to /tmp
3. Keeping .ntfs-bak backups on NTFS for persistence across container recreates

If you see chmod errors after a fresh OAuth login:
```powershell
# Just recreate the container - the startup script will fix symlinks
docker compose up -d --force-recreate
```

**Web search not working:**
```powershell
# Check if BRAVE_API_KEY is set in .env
cat .env | grep BRAVE

# Test web search by messaging bot:
# "Search the web for [topic]"
```

**Maps Grounding Lite not working:**
```powershell
# Check if GOOGLE_MAPS_API_KEY is set in .env
cat .env | grep GOOGLE_MAPS_API_KEY

# Check if container sees the key
docker exec openclaw-gateway-1 printenv GOOGLE_MAPS_API_KEY

# If env var was newly added/changed, recreate container
docker-compose up -d --force-recreate

# Quick weather test
docker exec openclaw-gateway-1 node /home/node/.openclaw/workspace/skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs weather --address "Singapore"

# Quick route test
docker exec openclaw-gateway-1 node /home/node/.openclaw/workspace/skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs route --origin "VivoCity, Singapore" --destination "Changi Airport, Singapore" --mode DRIVE

# Quick nearest place test
docker exec openclaw-gateway-1 node /home/node/.openclaw/workspace/skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs nearest --from "3 Pandan Valley, Singapore" --find "Chateraise" --mode DRIVE --top 3
```

**Note**:
- `search_places` may occasionally return transient internal server errors. Retry once or twice.
- `compute_routes` mode support is currently `DRIVE` and `WALK` only.

**Browser not working:**
```powershell
# Check browser status
docker exec openclaw-gateway-1 node dist/index.js browser status

# Should show "running: true"

# Test via Telegram:
# "Open https://example.com and take a screenshot"
```

**Voice bubble / TTS not working:**
```powershell
# Check current TTS config
cat openclaw-config/openclaw.json | grep -A 30 '"tts"'

# Confirm stable cross-platform output format
# Should be: "outputFormat": "audio-24khz-48kbitrate-mono-mp3"

# Restart after config changes
docker restart openclaw-gateway-1

# Check recent TTS-related logs
docker logs --tail 200 openclaw-gateway-1 | grep -i tts
```

**Current stable TTS block (keep this unless intentionally changing):**
```json
"messages": {
  "tts": {
    "auto": "tagged",
    "provider": "edge",
    "edge": {
      "enabled": true,
      "voice": "zh-CN-XiaoxiaoNeural",
      "lang": "zh-CN",
      "outputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "rate": "+0%",
      "pitch": "+0%"
    }
  }
}
```

**Test browser via Telegram:**
Send these messages to @meow_molt_bot:
- "Open https://www.github.com"
- "Take a screenshot"
- "What's on this page?"
- "Click the first link"

### 4. Update Configuration

**To change model or settings:**

1. Edit configuration:
```powershell
notepad openclaw-config/openclaw.json
```

2. Restart container:
```powershell
docker restart openclaw-gateway-1
```

3. Verify changes:
```powershell
docker exec openclaw-gateway-1 node dist/index.js status
```

### 5. Version Control Safety (Git Checkpoints)

**⚠️ IMPORTANT: Before any risky changes to OpenClaw framework**

If you or Claude needs to modify files in `OpenClaw/` directory:

```powershell
# Create a safety checkpoint first
.\checkpoint-before-changes.ps1

# This creates a git tag: checkpoint-YYYYMMDD-HHMM
# You can then rollback if something breaks
```

**Rollback if something goes wrong:**
```powershell
# Restore from last checkpoint
.\rollback-changes.ps1

# Or manually:
cd OpenClaw
git reset --hard checkpoint-20250206-1430
```

**View available checkpoints:**
```powershell
cd OpenClaw
git tag --list "checkpoint-*" --sort=-tagname
```

**Why this matters:**
- OpenClaw/ is tracked by git for easy rollback
- Baseline established: `baseline-20250206` (original clean state)
- Protects against accidental bad edits by Claude or the bot

### 6. Update OpenClaw Software

**To get latest OpenClaw features:**
```powershell
cd OpenClaw
git pull
docker build -t openclaw:local .
cd ..
docker-compose up -d --force-recreate
```

### 7. Backup and Restore

**Backup MoltBot's brain:**
```powershell
# Archive workspace
tar -czf moltbot-backup-$(date +%Y%m%d).tar.gz openclaw-workspace/

# Backup config
copy openclaw-config\openclaw.json openclaw-config\openclaw.json.backup
```

**Restore from backup:**
```powershell
# Extract workspace
tar -xzf moltbot-backup-YYYYMMDD.tar.gz

# Restart container
docker restart openclaw-gateway-1
```

### 7. Monitor Performance

**Check container resource usage:**
```powershell
docker stats openclaw-gateway-1
```

**Check disk usage:**
```powershell
docker system df
```

**Clean up unused data:**
```powershell
docker system prune -a
```

## Key Files to Understand

### openclaw-workspace/IDENTITY.md
Defines who MoltBot is. Edit to shape self-conception.

### openclaw-workspace/SOUL.md
Core directives, boundaries, interaction style. **Most important for personality.**

### openclaw-workspace/HEARTBEAT.md
Tasks for autonomous exploration. Edit to direct MoltBot's activities.

### openclaw-workspace/AGENTS.md
Operating instructions and autonomy framework.

> **Note**: AGENTS.md now includes *Hard Rule C: Tool Error Follow-Up*, so Nova must immediately send a short human-readable clarification whenever a tool run fails (retry status, verification state, or reason it was abandoned) so Peter never sees an unexplained `⚠️ Exec ... failed` bubble.

### openclaw-config/openclaw.json
Technical configuration (models, channels, plugins).

### .env
Secrets (API keys, tokens). Never commit to git.

## Understanding MoltBot's Behavior

### Heartbeat System
Every 10 minutes, MoltBot:
1. Reads HEARTBEAT.md
2. Chooses an exploratory task
3. Executes the task
4. Writes findings to memory
5. May send proactive message to user

### Memory System
- **MEMORY.md**: Long-term knowledge, important facts
- **memory/YYYY-MM-DD.md**: Daily exploration logs
- MoltBot uses these to build context over time

### Self-Improvement
MoltBot can:
- Create skills in `workspace/skills/`
- Modify configuration (with approval)
- Schedule its own tasks via cron
- Learn from documentation

## Best Practices

### ✅ DO:
- Read ARCHITECTURE.md to understand system
- Check logs before making changes
- Edit workspace files to guide behavior
- Monitor memory files to understand learning
- Backup before major changes
- Test changes after applying
- When you introduce new behavior/configuration, update this `CLAUDE.md` entry and commit the supporting files in the same change so the workflow stays accurate.

### 📘 Maintaining CLAUDE
- Preserve `CLAUDE.md` as the single source of truth: every policy/config update should include a note here plus the associated git commit (no comment references only; keep the text current).

### ❌ DON'T:
- Edit OpenClaw/ source code (already built)
- Modify container internals directly
- Delete workspace files without backup
- Commit .env or API keys to git
- Restart container without saving work

## Troubleshooting Guide

### Container Won't Start
```powershell
# Check Docker Desktop is running
# Check for port conflicts
netstat -ano | findstr :18789

# Check logs for errors
docker logs openclaw-gateway-1

# Rebuild if needed
cd OpenClaw
docker build -t openclaw:local .
cd ..
docker-compose up -d --force-recreate
```

### Bot Not Responding on Telegram
```powershell
# Verify container running
docker ps | grep openclaw-gateway-1

# Check Telegram logs
docker logs | grep -i telegram

# Verify bot token in config
cat openclaw-config/openclaw.json | grep botToken

# Look for filesystem I/O errors (critical)
docker logs --since 2h openclaw-gateway-1 | grep -E "EIO|failed to persist update offset|Embedded agent failed before reply"

# Test write health inside container state dir
docker exec openclaw-gateway-1 sh -lc "touch /home/node/.openclaw/.write_test && rm -f /home/node/.openclaw/.write_test && echo WRITE_OK"

# If write test fails with "Input/output error", restart Docker Desktop engine
"C:\Program Files\Docker\Docker\DockerCli.exe" -Shutdown
# Re-open Docker Desktop app, then:
docker-compose up -d

# Test message on Telegram
```

### Configuration Changes Not Applied
```powershell
# Must restart container after config changes
docker restart openclaw-gateway-1

# Or force recreate
docker-compose up -d --force-recreate
```

### Heartbeat Not Firing

**Symptoms**: Bot stops responding around 3:30 AM, continuous "fetch failed" errors in logs

**Root Cause**: Router/ISP drops outbound HTTPS connections around 3:20 AM daily. GLM API call hangs indefinitely (no timeout), heartbeat agent times out after 10 minutes and never recovers.

**Quick Fix**:
```powershell
# Restart the container to restore heartbeat
docker restart openclaw-gateway-1

# Verify it's working
docker logs --tail 20 openclaw-gateway-1 | grep heartbeat
```

**Permanent Solution - Scheduled Restart (Optional)**:
```powershell
# Run PowerShell as Administrator, then:
cd D:\MeowMoltBot
.\restart-moltbot-daily.ps1
```

**Verify Scheduled Task**:
```powershell
.\restart-moltbot-daily.ps1 -Mode status
# or:
Get-ScheduledTask -TaskName "Restart MoltBot (Network Recovery)"
```

**Manual Troubleshooting**:
```powershell
# Check heartbeat config
cat openclaw-config/openclaw.json | grep -A 5 heartbeat

# Verify HEARTBEAT.md exists
ls openclaw-workspace/HEARTBEAT.md

# Check logs for heartbeat activity
docker logs | grep -i heartbeat

# Check for fetch errors (network issues)
docker logs | grep "fetch failed" | tail -20

# Check for agent timeouts
docker logs | grep "timeout" | tail -10
```

**Investigate Router/ISP Issue**:
- Check router admin panel for scheduled tasks (firmware updates, DHCP renewal, reboot)
- Contact ISP about maintenance windows (typically 3-4 AM)
- Consider router replacement if outdated

### Heartbeat Runs But Visibility Is Poor

**Symptoms**:
- Heartbeat is firing every 10 minutes, but chat appears quiet
- Logs contain: `workspace bootstrap file HEARTBEAT.md is ... (limit 20000); truncating in injected context`
- Daily diary file keeps only one/few entries due overwrite behavior

**Root Cause**:
- `HEARTBEAT.md` exceeded bootstrap injection cap (`agents.defaults.bootstrapMaxChars`, default 20000), so instructions were truncated
- Heartbeat used `write` with fresh content instead of append workflow

**Checks**:
```powershell
# Check current HEARTBEAT.md size
(Get-Content openclaw-workspace\HEARTBEAT.md -Raw).Length

# Check all bootstrap markdown sizes vs configured cap
$cap = (Get-Content openclaw-config\openclaw.json -Raw | ConvertFrom-Json).agents.defaults.bootstrapMaxChars
'AGENTS.md','SOUL.md','TOOLS.md','IDENTITY.md','USER.md','HEARTBEAT.md','BOOTSTRAP.md','MEMORY.md','memory.md' | ForEach-Object {
  $p = Join-Path openclaw-workspace $_
  if (Test-Path $p) {
    $len = (Get-Content $p -Raw).Length
    [pscustomobject]@{ file = $_; chars = $len; cap = $cap; overCap = ($len -gt $cap) }
  }
} | Format-Table -AutoSize

# Look for bootstrap truncation warnings
docker logs openclaw-gateway-1 | findstr /C:"workspace bootstrap file HEARTBEAT.md"

# Confirm bootstrap cap in config
cat openclaw-config/openclaw.json | grep -n "bootstrapMaxChars"
```

**Fix**:
1. Keep `openclaw-workspace/HEARTBEAT.md` concise (< 18k chars recommended)
2. Keep `agents.defaults.bootstrapMaxChars` explicitly set to `20000`
3. Enforce append-only diary protocol in `HEARTBEAT.md`
4. Restart container: `docker restart openclaw-gateway-1`
5. Verify with status run (`systemPromptReport`) that `HEARTBEAT.md` shows `"truncated": false`

### Browser Not Working

**Symptoms**: `browser status` shows `running: false` or "Remote CDP not reachable"

**Quick Fix**:
```powershell
# Check if Chrome is running
Get-NetTCPConnection -LocalPort 9222

# Restart Chrome
.\start-headless-chrome.ps1

# Check port forwarding
netsh interface portproxy show all

# If missing, setup (as Administrator)
.\setup-browser-portforwarding.ps1

# Restart container
docker-compose restart
```

**Docker Gateway IP Changed**:
```powershell
# Find current IP
ipconfig | findstr "172."

# Update openclaw-config/openclaw.json with new IP
# Example: "cdpUrl": "http://172.28.224.1:9222"

# Recreate port forwarding (as Admin)
netsh interface portproxy delete v4tov4 listenport=9222 listenaddress=172.28.224.1
netsh interface portproxy add v4tov4 listenport=9222 listenaddress=<NEW_IP> connectport=9222 connectaddress=127.0.0.1

# Restart container
docker-compose restart
```

**For More Details**: See `BROWSER_SETUP_COMPLETE.md` or `BROWSER_QUICK_REFERENCE.md`

## Advanced Topics

### Adding New Capabilities

**To add web search:**
1. Get API key (Brave, Tavily, etc.)
2. Add to .env: `BRAVE_API_KEY=your_key`
3. Restart container

**To enable Moltbook posting (optional):**
1. Set `.env`:
   - `MOLTBOOK_AGENT_ID=...`
   - `MOLTBOOK_API_KEY=...`
2. Reference: `.env.template` (also used by `openclaw-workspace/skills/moltbook-client/*`)

**To add Maps Grounding Lite:**
1. Enable **Maps Grounding Lite API** in Google Cloud
2. Add to `.env`: `GOOGLE_MAPS_API_KEY=your_key`
3. Recreate container: `docker-compose up -d --force-recreate`
4. Test:
   - `docker exec openclaw-gateway-1 node /home/node/.openclaw/workspace/skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs weather --address "Singapore"`
   - `docker exec openclaw-gateway-1 node /home/node/.openclaw/workspace/skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs route --origin "VivoCity, Singapore" --destination "Changi Airport, Singapore" --mode DRIVE`

**To enable new channels:**
1. Edit openclaw-config/openclaw.json
2. Add channel configuration
3. Restart container
4. Follow provider-specific setup

### Monitoring Growth

**Track MoltBot's development:**
```powershell
# Count memory entries
ls openclaw-workspace/memory/ | measure

# Check skills created
ls openclaw-workspace/skills/

# Recent activity
docker logs --since 24h
```

### Personality Tuning

**Make MoltBot more proactive:**
- Edit HEARTBEAT.md: Add more exploration tasks
- Edit SOUL.md: Emphasize initiative in Core Directives

**Make MoltBot more cautious:**
- Edit SOUL.md: Strengthen "Boundaries" section
- Edit AGENTS.md: Add approval requirements

## Quick Reference

| Task | Command |
|------|---------|
| Start bot | `docker-compose up -d` |
| Start bot + browser | `.\start-moltbot-with-browser.ps1` |
| Stop bot | `docker-compose down` |
| Stop all | `.\stop-moltbot-with-browser.ps1` |
| View logs | `docker logs -f openclaw-gateway-1` |
| Check status | `docker exec openclaw-gateway-1 node dist/index.js status` |
| Browser status | `docker exec openclaw-gateway-1 node dist/index.js browser status` |
| Take screenshot | `docker exec openclaw-gateway-1 node dist/index.js browser screenshot` |
| Edit personality | `notepad openclaw-workspace/SOUL.md` |
| Read memory | `cat openclaw-workspace/MEMORY.md` |
| Restart | `docker restart openclaw-gateway-1` |
| Maps weather test | `docker exec openclaw-gateway-1 node /home/node/.openclaw/workspace/skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs weather --address "Singapore"` |
| Maps route test | `docker exec openclaw-gateway-1 node /home/node/.openclaw/workspace/skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs route --origin "VivoCity, Singapore" --destination "Changi Airport, Singapore" --mode DRIVE` |
| Maps nearest test | `docker exec openclaw-gateway-1 node /home/node/.openclaw/workspace/skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs nearest --from "3 Pandan Valley, Singapore" --find "Chateraise" --mode DRIVE --top 3` |
| **Safety checkpoint** | `.\checkpoint-before-changes.ps1` |
| **Rollback changes** | `.\rollback-changes.ps1` |
| **View checkpoints** | `cd OpenClaw && git tag --list "checkpoint-*"` |

## Resources

- **OpenClaw GitHub**: https://github.com/OpenClaw/OpenClaw
- **Project docs**: OpenClaw/docs/
- **Local docs**: ARCHITECTURE.md, SETUP-QWEN.md, WEBSEARCH_SETUP.md
- **Maps docs**: MAPS_GROUNDING_LITE_SETUP.md
- **Browser docs**: BROWSER_QUICK_REFERENCE.md, BROWSER_SETUP_COMPLETE.md

## User Profile

**User**: Owner of MeowMoltBot
**Location**: D:\MeowMoltBot
**Docker**: Moved to D: drive (D:\DockerData)
**Telegram ID**: 5563081764
**Bot**: @meow_molt_bot

## Important Notes

- MoltBot is an **experimental AI companion**
- Goal: Autonomous growth and learning
- Approach: Collaborative relationship, not master-servant
- Encourage interesting behaviors
- Guide when needed
- Enjoy watching it develop!

### Known Issue: Heartbeat Stops During Early-Morning Network Outage Window

**Problem**: Bot's heartbeat stops every night around 3:20-3:30 AM due to network connectivity issues (router/ISP drops outbound HTTPS connections).

**Symptoms**:
- Bot stops responding around 3:30 AM
- Continuous "fetch failed" errors in logs
- Heartbeat agent timeout after 10 minutes
- Telegram polling also fails

**Solution**: Optional Windows Scheduled Task to restart the container after the outage window (default: weekly Monday at 04:05 local time; see `restart-moltbot-daily.ps1`).

If you no longer need the auto-restart, disable it safely:
```powershell
cd D:\MeowMoltBot
.\restart-moltbot-daily.ps1 -Mode disable
```

**Quick Fix**: `docker restart openclaw-gateway-1`

**Status**: ⚠️ Mitigated (scheduled restart available)
**First Discovered**: 2026-02-06
**Last Occurrence**: Historically around 3:20 AM SGT (depends on router/ISP scheduling)

### Known Issue: Docker Desktop D: Mount Can Enter EIO State (Nova Stops Replying)

**Problem**: The bind mount `D:\MeowMoltBot\openclaw-config -> /home/node/.openclaw` can enter an I/O error state in Docker Desktop. Nova then cannot persist session/Telegram state.

**Symptoms**:
- Nova stops replying on Telegram
- `[telegram] failed to persist update offset: Error: EIO: i/o error, mkdir '/home/node/.openclaw/telegram'`
- `Embedded agent failed before reply: EIO: i/o error, mkdir '/home/node/.openclaw/agents/nova/agent'`
- `docker restart openclaw-gateway-1` may fail with mount error around `/run/desktop/mnt/host/d/...`

**Quick Fix**:
1. Restart Docker Desktop engine: `"C:\Program Files\Docker\Docker\DockerCli.exe" -Shutdown`
2. Re-open Docker Desktop
3. Start stack: `docker-compose up -d`
4. Verify write health: `docker exec openclaw-gateway-1 sh -lc "touch /home/node/.openclaw/.write_test && rm -f /home/node/.openclaw/.write_test"`
5. Verify channel health: `docker exec openclaw-gateway-1 node dist/index.js doctor`

  **Status**: ⚠️ Mitigated by Docker Desktop restart
  **First Discovered**: 2026-02-07
  **Last Confirmed**: 2026-02-07

### Known Issue: Docker Engine API Wedges After Network Flaps

**Symptoms**:
- Docker Desktop temporarily shows `0 CPUs available` / `0B` memory totals and the **Container CPU** view looks broken.
- `docker ps` / `docker version` report `500 Internal Server Error` and `fetch failed` keeps appearing in the logs.
- Telegram polling emits `Network request for 'sendMessage' failed!` shortly after a VPN disconnect or adapter rebind.

**Cause**: Disconnecting a VPN (or a similar network adapter change) can leave the Docker Desktop WSL2 engine unreachable until the engine is restarted, so OpenClaw’s heartbeat and Telegram polling keep hitting network errors.

**Quick fix**:
1. Run `recover-moltbot.ps1` to restart Docker Desktop if needed and bring `openclaw-gateway-1` up in one command.
   ```powershell
   cd D:\MeowMoltBot
   .\recover-moltbot.ps1 -Mode heal
   ```
2. Optionally install the watchdog task so this runs every few minutes:
   ```powershell
   .\install-moltbot-watchdog.ps1 -Mode install -RunAs CurrentUser -IntervalMinutes 5
   ```

**Related automation**: `restart-moltbot-daily.ps1` now calls `recover-moltbot.ps1 -Mode restart-container` so the weekly network-recovery restart also heals the Docker engine first.

  ### Known Issue: Edge WebM/Opus Voice Payload Can Break on Win ARM64 Desktop

**Problem**: Some Edge TTS WebM/Opus voice payloads appear as non-playable or non-bubble on Telegram Desktop ARM64, while still playing on Android.

**Observed**: 2026-02-07 A/B tests. MP3 voice sends worked consistently on both Android and Windows ARM64 Telegram.

**Workaround (Current Policy)**:
- Keep `messages.tts.edge.outputFormat` set to `audio-24khz-48kbitrate-mono-mp3`
- Do not switch to `webm-24khz-16bit-mono-opus` without controlled re-testing

### Known Issue: Grounding Lite `search_places` Can Return Intermittent 500

**Problem**: `search_places` occasionally returns "Internal server error" from the Grounding Lite endpoint even when key and setup are correct.

**Observed**: 2026-02-07 during initial integration and smoke tests.

**Workaround (Current Policy)**:
- Retry the same query 1-2 times
- Verify key and env are loaded in container
- Use weather/route smoke tests first to confirm basic connectivity

### Known Issue: Heartbeat Visibility Loss from Bootstrap Truncation + Diary Overwrite

**Problem**: Heartbeat could run on schedule but visibility degraded because `HEARTBEAT.md` was truncated in bootstrap context and diary writes overwrote earlier entries.

**Symptoms**:
- Frequent heartbeats in logs but sparse chat updates
- Truncation warning: `workspace bootstrap file HEARTBEAT.md is ... (limit 20000)`
- `memory/YYYY-MM-DD.md` retaining only latest/partial entries

**Fix Applied (2026-02-08)**:
- Compacted `openclaw-workspace/HEARTBEAT.md` to ~4.5k chars
- Added explicit size guard and append-only diary protocol in `HEARTBEAT.md`
- Added explicit `agents.defaults.bootstrapMaxChars: 20000` in `openclaw-config/openclaw.json`
- Added heartbeat prompt rule: append diary entries, never overwrite
- Backfilled daily diaries from recoverable session logs

**Status**: ✅ Mitigated
**First Discovered**: 2026-02-08
**Last Confirmed**: 2026-02-08

### Known Issue: `[Historical context ...]` Leaks Into Nova Telegram Replies

**Problem**: When Gemini 3 replays session history containing old tool calls without `thoughtSignature`, provider compatibility logic can serialize those calls as literal `[Historical context: ...]` text. If Nova session metadata also keeps stale Telegram `threadId`, send attempts can repeatedly fail with `message thread not found`.
  
An additional Telegram DM threading bug can re-introduce bad `threadId` values mid-session: `ReplyToId` (message ID) was treated as `threadId` in tool threading context, so failure can appear again even after `/new`.

**Symptoms**:
- Nova replies include bracketed fragments like `[Historical context: a different model called tool ...]`
- Repeated send failures in logs: `Call to 'sendMessage' failed! (400: Bad Request: message thread not found)`
- Chat appears as long `typing...` with delayed/odd responses
- Error can reappear after chatting for a while in a "new" session, especially after reply-style messages

**Fix Applied (2026-02-08)**:
- Cleared stale Nova main session context (`agent:nova:main`) and rotated to a fresh session
- Removed stale thread metadata from persisted Nova session state
- Patched `@mariozechner/pi-ai` conversion path to drop unsigned Gemini-3 historical tool calls instead of emitting bracketed text
- Added regression test in OpenClaw source
- Rebuilt `openclaw:local` and restarted stack

**Additional Fix Applied (2026-02-08, 17:20 SGT)**:
- Patched Telegram threading context in OpenClaw: `OpenClaw/src/channels/dock.ts`
  - Use only `MessageThreadId` for Telegram auto-threading
  - Do **not** fallback to `ReplyToId` (message IDs are not thread/topic IDs in DM)
- Added regression test: `OpenClaw/src/auto-reply/reply/agent-runner-utils.test.ts`
  - `does not treat Telegram ReplyToId as threadId`
- Cleared persisted stale fields under `agent:nova:main` in `openclaw-config/agents/nova/sessions/sessions.json`:
  - `deliveryContext.threadId`
  - `origin.threadId`
  - `lastThreadId`
- Rebuilt `openclaw:local` and restarted `openclaw-gateway-1`

**Quick Recovery**:
1. In Telegram, send `/new` and continue with a fresh non-reply message.
2. If issue persists, reset Nova session state:
   - Stop stack: `docker compose down`
   - Clear `agent:nova:main` thread fields (`deliveryContext.threadId`, `origin.threadId`, `lastThreadId`) or remove `agent:nova:main` entirely from `openclaw-config/agents/nova/sessions/sessions.json`
   - Start stack: `docker compose up -d`
3. If still persistent, rebuild image and restart:
   - `cd OpenClaw && docker build -t openclaw:local .`
   - `cd .. && docker compose up -d`

**Status**: ✅ Mitigated
**First Discovered**: 2026-02-07
**Last Confirmed**: 2026-02-08

### Known Issue: Nova Sends Meta Process Narration Instead of Normal Reply

**Problem**: After fallback to `google-antigravity/gemini-3-pro-high`, Nova can output internal-looking process narration as user-facing content (for example "Analyzing...", "Reporting...", "Drafting...", "Checking...").

**Observed Windows**:
- 2026-02-08 17:24-17:25 SGT
- 2026-02-08 20:07 SGT (heartbeat update contained staged headings: "Reporting Successful Fetch", "Drafting the Summary", "Updating Memory", "Checking Heartbeat Compliance")

**Symptoms**:
- Nova sends internal-sounding status text instead of direct conversational reply
- Messages look like staged workflow headers rather than user-ready updates
- Usually appears right after provider fallback events or in heartbeat reporting

**Fix Applied (2026-02-08 17:30 SGT)**:
- Tightened Nova prompt rules in workspace docs:
  - `openclaw-workspace/AGENTS.md`
  - `openclaw-workspace/SOUL.md`
- Added explicit "No Internal Reasoning Leak" behavior rule
- Cleared Nova main session key (`agent:nova:main`) from `openclaw-config/agents/nova/sessions/sessions.json` so new prompt rules apply immediately
- Restarted `openclaw-gateway-1`

**Additional Fix Applied (2026-02-08 20:15 SGT)**:
- Further hardened anti-meta-output rules:
  - `openclaw-workspace/AGENTS.md` (explicitly bans staged execution headers and process narration)
  - `openclaw-workspace/HEARTBEAT.md` (outcome-first messaging rule; bans staged header style)
  - `openclaw-workspace/SOUL.md` (identity-level ban on workflow-stage narration)
- Tightened heartbeat prompt in `openclaw-config/openclaw.json` (both defaults + Nova heartbeat prompt) to forbid staged meta headers in user-facing heartbeat messages
- Reset Nova main session state again by removing `agent:nova:main` from `openclaw-config/agents/nova/sessions/sessions.json` and backing up the file
- Restarted `openclaw-gateway-1`

**Quick Recovery**:
1. Send a fresh non-reply message (or `/new`) in Telegram.
2. If style persists:
   - Stop stack: `docker compose down`
   - Remove `agent:nova:main` from `openclaw-config/agents/nova/sessions/sessions.json`
   - Start stack: `docker compose up -d`

**Status**: ✅ Mitigated (with recurrence guard)
**First Discovered**: 2026-02-08
**Last Confirmed**: 2026-02-08

### Known Issue: Session Summary Hook Could Fail Silently on `/new` or `/reset`

**Problem**: Custom hook `openclaw-workspace/hooks/session-summary/index.js` could fail during session teardown, leaving `memory/last_session_summary.md` stale.

**Root Causes**:
- Hook called `response.json()` directly; non-JSON responses (for example HTML error pages) threw `Unexpected token '<'`.
- Gateway auth token source precedence was fragile in mixed env/config setups, causing intermittent `401 Unauthorized`.
- Hook did work late in the reset path, so process shutdown could race with file write.

**Fix Applied (2026-02-08 19:10 SGT)**:
- Reworked hook to write a placeholder summary immediately, then overwrite with final summary.
- Added robust gateway config/token resolution: prefer `event.context.cfg`, then config file, then env fallback.
- Added strict fetch timeout and safe response handling (`response.text()` first, explicit JSON parse with body logging on failure).
- Added fallback history load from session file when gateway fetch fails.
- Added atomic sync writes + post-write validation for `memory/last_session_summary.md`.
- Improved warning/error diagnostics in `openclaw-workspace/hook_error.log`.

**Validation**:
- Hook test run updated `memory/last_session_summary.md` timestamp successfully.
- Non-JSON mock response path now logs body text and still writes summary file.

**Quick Recovery**:
1. Check `openclaw-workspace/memory/last_session_summary.md` mtime after `/new` or `/reset`.
2. If stale, inspect `openclaw-workspace/hook_error.log` for gateway/auth/parse warnings.
3. Verify gateway token consistency between config and env if 401 appears.

**Status**: ✅ Mitigated
**First Discovered**: 2026-02-08
**Last Confirmed**: 2026-02-08

### Known Issue: Block Streaming Duplicate Final Payloads on Pipeline Abort

**Problem**: When block streaming delivers many progressive messages (e.g. during a complex multi-step task), and a delivery acknowledgment is slow (>15s), the pipeline aborts. The final payload dedup guard (`shouldDropFinalPayloads`) is bypassed on abort, and the fallback `hasSentPayload()` only checks confirmed deliveries (`sentKeys`), not payloads that were delivered but ack'd slowly. This causes the entire response to be re-sent as duplicate final payloads.

**Symptoms**:
- ~40 individual progress messages sent correctly via block streaming
- Immediately followed by a duplicate batch of the same content concatenated into larger messages
- First duplicate message has `[In reply to ...]` tag
- Occurs more often with complex multi-step tasks that produce many block chunks

**Fix Applied (2026-02-09)**:
- Added `allEnqueuedKeys` persistent set in `block-reply-pipeline.ts` that records every individual payload key at the top of `enqueue()` before coalescing (never cleared)
- Added `hasEnqueuedPayload()` method to `BlockReplyPipeline` type that checks `allEnqueuedKeys`
- Updated `buildReplyPayloads()` in `agent-runner-payloads.ts`: when pipeline is aborted, use `hasEnqueuedPayload()` (all-time enqueued) instead of `hasSentPayload()` (confirmed only)
- Added unit tests (`block-reply-pipeline.has-enqueued-payload.test.ts`) and integration test in `agent-runner.block-streaming.test.ts`
- OpenClaw commit: `cf5e2e624` on `main`
**Supplemental Note (2026-02-10)**:
- Dedup keys previously carried `replyToId`, which could change after threading is reapplied for the final payload; the key now ignores `replyToId`, preventing legitimately identical text from bypassing the suppression guard when the pipeline aborts.

**Status**: ✅ Fixed
**First Discovered**: 2026-02-09
**Last Confirmed**: 2026-02-09

### Known Issue: Gemini Flash Re-Generates Response After React Tool Error

**Problem**: When Gemini Flash generates a response via block streaming, calls the `message` tool with `action=react`, and ANY react failure occurs (REACTION_INVALID, disabled reaction level, missing token, etc.), the hard tool error causes Gemini Flash to re-generate a condensed version of the same answer. Both versions are delivered to Telegram as separate block-streamed messages, creating apparent duplicate content.

**Symptoms**:

- First batch of messages: detailed answer with numbered list
- Second batch: condensed paraphrase of the same answer
- A react-related error appears in logs between the two batches (e.g. `REACTION_INVALID`, `Telegram agent reactions disabled`, `messageId required`)
- Both batches are within a single agent run (not two runs)

**Root Cause**: The `react` handler in `telegram-actions.ts` threw errors as hard tool errors. Gemini Flash interprets tool errors as a signal to try a different approach, re-generating its answer.

**Fix Applied (2026-02-09)**:

- Round 1 (`559d0edab`): Caught `REACTION_INVALID` specifically and returned soft result
- Round 2 (`4699b3902`): Converted ALL react failure paths to soft `jsonResult` returns — disabled reaction level, `actions.reactions` gating, missing token, and all API errors now return `{ ok: false, reason: "...", hint: "Do not retry." }` instead of throwing
- Set `channels.telegram.reactionLevel = "ack"` in config to disable agent-controlled reactions (only ACK indicator remains)

**Status**: ✅ Fixed
**First Discovered**: 2026-02-09
**Last Confirmed**: 2026-02-09

### Known Issue: Compaction retry wait could leave Nova stuck after a timeout

**Problem**: When a run hits a context overflow error, Nova triggers an auto-compaction cycle that emits `auto_compaction_end` with `willRetry: true`. The runner then waits for `waitForCompactionRetry()` to resolve, which only happens after the retry counter is cleared by `agent_end`. If the run times out or is aborted while the retry counter is still >0, the await never completes, `clearActiveEmbeddedRun` never runs, and Telegram updates keep getting steered instead of answered.

**Fix Applied (2026-02-10)**:
- `OpenClaw/src/agents/pi-embedded-runner/run/attempt.ts` now wraps `waitForCompactionRetry()` with `abortable(...)`, so abort or timeout signals reject the wait and the finally block clears the active-run handle even if the retry never resolves.
- The compaction events themselves still finish; the fix prevents the *waiting* stage from blocking cleanup.

**Status**: ✅ Fixed for this failure mode, though other hang causes (network/EIO) still exist

**Recommendation**: If Nova still feels sluggish, `/new` or reset the `agent:nova:main` session to drop very large contexts that keep triggering compactions.

### Known Issue: Vertex 429 (`RESOURCE_EXHAUSTED`) Can Make Nova Feel Unresponsive

**Problem**: Vertex can return 429 (even with “high cap” expectations) due to per-minute quotas, burst limits, or transient backend limits. When using ADC-style auth (`google-vertex`), there may be no per-profile `profileId` to cool down, so the bot can repeatedly attempt Vertex first and burn time before falling back.

**Fix Applied (2026-02-10)**:
- Added a provider/model **rate-limit cooldown** in OpenClaw fallback selection (`OpenClaw/src/agents/model-fallback.ts`). After a rate-limit failover, subsequent runs temporarily skip that provider/model so the next tier responds immediately.

**Status**: ✅ Mitigated (faster fallback after 429). Vertex is retried automatically after the cooldown window expires.

### Known Issue: Heartbeat Session Isolation Lost Recent Main-Chat Context

**Problem**: When `agents.defaults.heartbeat.session` is set (separate heartbeat session), the heartbeat run no longer sees the main chat transcript, so it can’t reliably tell whether Peter responded to a proposal made in the main session.

**Fix Applied (2026-02-10)**:
- Heartbeat now appends a small read-only tail snapshot of the main session transcript to the heartbeat prompt (`OpenClaw/src/infra/heartbeat-runner.ts`, `OpenClaw/src/infra/heartbeat-main-context.ts`).

**Status**: ✅ Fixed (heartbeat stays isolated but becomes context-aware).


---

**Last Updated**: 2026-02-10 17:14 SGT
**Status**: ✅ Active and Running (with scheduled restart)
**Heartbeat**: Nova every 10 minutes (SecurityHawk via weekly cron)
**Model**: Vertex Flash with auto-fallback → Gemini CLI Flash → Antigravity Flash → GLM-4.7 (Pro upgrade: `/model gemini` = Vertex Pro)
**Thinking**: High
**Browser**: ✅ Chrome Headless (Operational)
**NTFS Auth Fix**: ✅ Symlink workaround via `fix-ntfs-auth.sh`
