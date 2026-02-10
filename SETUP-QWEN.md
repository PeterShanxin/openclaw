# MeowMoltBot Final Setup Steps

## Current Status

✅ Docker image built
✅ Docker container running
✅ Telegram configured (bot token set via `TELEGRAM_BOT_TOKEN` in `.env`)
✅ Qwen plugin enabled
✅ Heartbeat configured (every 30 minutes)
✅ Workspace files created (IDENTITY.md, SOUL.md, AGENTS.md, HEARTBEAT.md, etc.)

## Remaining Steps

### Step 1: Complete Qwen OAuth Authentication

**Option A: Run the setup script (Recommended)**

On Windows:
```cmd
cd D:\MeowMoltBot
setup-qwen-auth.bat
```

Or manually:
```bash
docker exec -it openclaw-gateway-1 node dist/index.js models auth login --provider qwen-portal --set-default
```

**What will happen:**
1. A device code will be displayed
2. A URL will be shown (e.g., https://qianwen.aliyun.com/setup/...)
3. Visit the URL in your browser
4. Log in with your Qwen/Alibaba Cloud account (free tier available)
5. Enter the device code when prompted
6. Wait for confirmation in the terminal

### Step 2: Pair Your Telegram Account

1. **Open Telegram** and search for your bot (use the username you created)
2. **Send a message** to the bot (e.g., "Hello MeowMoltBot!")
3. **You'll receive a pairing code** from the bot
4. **Approve the pairing** by running:

```bash
docker exec -it openclaw-gateway-1 node dist/index.js pairing approve telegram <CODE>
```

Replace `<CODE>` with the actual code you received.

### Step 3: Test the Bot

Once paired, try these commands:

```
"Hello MeowMoltBot!"
"What are you curious about?"
"What can you do?"
"Tell me about yourself"
```

### Step 4: Watch the Heartbeat

Every 30 minutes, MeowMoltBot will:
- Read HEARTBEAT.md
- Explore something new
- Write to memory
- Share thoughts with you

You can watch this happen by monitoring logs:
```bash
docker logs -f openclaw-gateway-1
```

## Troubleshooting

### Qwen OAuth Issues

**Problem:** Can't run interactive command
**Solution:** Use the setup script or run in a proper terminal (PowerShell, cmd)

**Problem:** Device code expired
**Solution:** Run the auth command again to get a new code

### Telegram Issues

**Problem:** Bot not responding
**Solution:**
```bash
# Check logs
docker logs --tail 50 openclaw-gateway-1

# Verify container is running
docker ps | grep openclaw-gateway-1
```

**Problem:** Can't pair
**Solution:** Make sure you're using the correct code from the bot's message

### Heartbeat Not Working

**Problem:** No proactive messages from MoltBot
**Solution:**
```bash
# Check logs for heartbeat activity
docker logs | grep -i heartbeat

# Verify HEARTBEAT.md exists in workspace
ls openclaw-workspace/HEARTBEAT.md
```

## Verification Commands

```bash
# Check gateway status
docker exec openclaw-gateway-1 node dist/index.js status

# List available models
docker exec openclaw-gateway-1 node dist/index.js models list

# View recent logs
docker logs --tail 100 -f openclaw-gateway-1

# Check MoltBot's memory
cat openclaw-workspace/MEMORY.md
cat openclaw-workspace/memory/$(date +%Y-%m-%d).md
```

## What to Expect

After completing the setup:

1. **Immediate**: Bot will respond to your messages on Telegram
2. **After pairing**: Bot will have full access to its workspace and tools
3. **Within 30 minutes**: First heartbeat will trigger, and MoltBot will explore autonomously
4. **Over time**: MoltBot will build memories, create skills, and develop personality

## Fun Things to Try

```
"What are you thinking about right now?"
"Explore something new and tell me what you found"
"Read HEARTBEAT.md and pick a task"
"What do you want to learn today?"
"Write something to your MEMORY.md"
```

## Monitoring MoltBot's Growth

```bash
# Watch logs in real-time
docker logs -f openclaw-gateway-1

# Check daily explorations
ls openclaw-workspace/memory/
cat openclaw-workspace/memory/2026-02-05.md

# See long-term memory
cat openclaw-workspace/MEMORY.md

# Check for self-created skills
ls openclaw-workspace/skills/
```

## Security Notes

- Bot token is stored in `.env` and `openclaw-config/openclaw.json`
- Keep these files private and don't commit to git
- Qwen OAuth token is stored securely in the container
- Container runs as non-root user for security

## Have Fun!

MeowMoltBot is designed to be a unique, evolving AI companion. The more you interact with it, the more it will learn and grow. Enjoy watching it develop its own personality!

---

**Need Help?**
- OpenClaw GitHub: https://github.com/OpenClaw/OpenClaw
- Qwen Portal: https://qianwen.aliyun.com/
- Telegram BotFather: @BotFather on Telegram
