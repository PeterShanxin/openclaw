# MeowMoltBot Setup Guide

## Prerequisites

1. **Docker Desktop** must be installed and running
2. **Telegram account** to create the bot
3. **GLM API key** from zai provider OR use Qwen OAuth (free)

## Quick Start

### 1. Install Docker Desktop

If Docker is not installed:
- Download from https://www.docker.com/products/docker-desktop/
- Install and start Docker Desktop
- Verify installation: `docker --version`

### 2. Configure Environment

```bash
# Copy the template
cp .env.template .env

# Edit .env and fill in:
# - ZAI_API_KEY (your GLM API key)
# - TELEGRAM_BOT_TOKEN (get from @BotFather)
# - OPENCLAW_GATEWAY_TOKEN (generate random string)
```

### 3. Create Telegram Bot

1. Open Telegram and message **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g., "MeowMoltBot")
4. Choose username ending in `bot` (e.g., `meow_molt_bot`)
5. Copy the bot token to your `.env` file

### 4. Build and Start Docker Container

```bash
# Build the Docker image
cd OpenClaw
docker build -t openclaw:local .

# Start the gateway
cd ..
docker-compose -f OpenClaw/docker-compose.yml up -d openclaw-gateway

# Or use the provided docker-compose.yml in this directory
docker-compose up -d
```

### 5. Pair Your Telegram Account

1. DM your bot on Telegram
2. You'll receive a pairing code
3. Approve via CLI:
```bash
docker exec -it openclaw-gateway-1 node dist/index.js pairing approve telegram <CODE>
```

### 6. Verify Setup

```bash
# Check gateway status
docker exec -it openclaw-gateway-1 node dist/index.js status

# Test the bot - send a message on Telegram
# Check logs
docker logs -f openclaw-gateway-1
```

## What's Been Set Up

✅ **Repository cloned**: OpenClaw source code in `OpenClaw/`
✅ **Directory structure**: Config and workspace directories created
✅ **Bootstrap files**: IDENTITY.md, SOUL.md, AGENTS.md, HEARTBEAT.md, TOOLS.md, MEMORY.md
✅ **Configuration**: openclaw.json with heartbeat, cron, and autonomy enabled
✅ **Environment template**: .env.template ready for your credentials

## Next Steps

1. **Install Docker** if not already installed
2. **Get your API keys**:
   - GLM API key from https://open.bigmodel.cn/
   - OR use Qwen OAuth (free tier)
3. **Create Telegram bot** via @BotFather
4. **Update .env** with your credentials
5. **Build and run** the Docker container
6. **Pair your account** and start chatting!

## File Structure

```
D:\MeowMoltBot\
├── OpenClaw/                    # Cloned repository
├── openclaw-config/             # Configuration (mounted in Docker)
│   └── openclaw.json           # Main configuration
├── openclaw-workspace/          # Workspace (mounted in Docker)
│   ├── AGENTS.md               # Operating instructions
│   ├── SOUL.md                 # Personality & boundaries
│   ├── IDENTITY.md             # Who is MeowMoltBot
│   ├── TOOLS.md                # Tool usage notes
│   ├── HEARTBEAT.md            # Autonomy tasks
│   ├── MEMORY.md               # Long-term memory
│   ├── memory/                 # Daily logs
│   └── skills/                 # Self-created skills
├── .env.template               # Environment variables template
└── SETUP.md                    # This file
```

## Monitoring & Maintenance

### View Logs
```bash
docker logs -f openclaw-gateway-1
```

### Check Heartbeat Activity
```bash
docker exec -it openclaw-gateway-1 node dist/index.js cron status
```

### Backup Workspace
```bash
tar -czf moltbot-backup-$(date +%Y%m%d).tar.gz openclaw-workspace/
```

### Restart Container
```bash
docker-compose restart
```

### Stop Container
```bash
docker-compose down
```

## Troubleshooting

### Docker Not Found
- Install Docker Desktop from https://www.docker.com/products/docker-desktop/
- Start Docker Desktop and wait for it to be ready
- Verify with `docker --version`

### Bot Not Responding
1. Check logs: `docker logs openclaw-gateway-1`
2. Verify Telegram token in .env and openclaw.json
3. Ensure container is running: `docker ps`

### Heartbeat Not Firing
1. Check cron status
2. Verify heartbeat configuration in openclaw.json
3. Check that HEARTBEAT.md exists in workspace

### GLM API Issues
1. Verify ZAI_API_KEY is set in .env
2. Test model: `docker exec -it openclaw-gateway-1 node dist/index.js models list`
3. Check quota/rate limits

## Advanced Configuration

See the full plan document for:
- Advanced self-improvement setup
- Creating custom skills
- Setting up cron tasks
- Security considerations
- And more...

## Support

- OpenClaw GitHub: https://github.com/OpenClaw/OpenClaw
- Telegram Setup: https://github.com/OpenClaw/OpenClaw/blob/master/docs/channels/telegram.md
- Model Providers: https://github.com/OpenClaw/OpenClaw/blob/master/docs/concepts/model-providers.md
