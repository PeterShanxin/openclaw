# MeowMoltBot Quick Reference

## Essential Commands

### Docker Operations
```bash
# Build image
cd OpenClaw && docker build -t openclaw:local .

# Start container
docker-compose up -d

# Stop container
docker-compose down

# Restart container
docker-compose restart

# View logs
docker logs -f openclaw-gateway-1

# Execute command in container
docker exec -it openclaw-gateway-1 <command>
```

### OpenClaw CLI Commands
```bash
# Check status
docker exec -it openclaw-gateway-1 node dist/index.js status

# List models
docker exec -it openclaw-gateway-1 node dist/index.js models list

# Set model
docker exec -it openclaw-gateway-1 node dist/index.js models set zai/glm-4.7

# Approve pairing
docker exec -it openclaw-gateway-1 node dist/index.js pairing approve telegram <CODE>

# Cron status
docker exec -it openclaw-gateway-1 node dist/index.js cron status

# Add cron job
docker exec -it openclaw-gateway-1 node dist/index.js cron add \
  --name "task-name" \
  --schedule "0 22 * * *" \
  --message "Your message here" \
  --deliver \
  --to telegram:USER_ID
```

## Configuration Files

### openclaw-config/openclaw.json
Main configuration file. Controls:
- Telegram channel settings
- AI model selection
- Heartbeat settings (30min interval)
- Cron scheduling
- Memory search
- Tool approval policies

### Bootstrap Files (in openclaw-workspace/)

**IDENTITY.md** - Who is MeowMoltBot
- Core personality traits
- Self-conception as an autonomous explorer

**SOUL.md** - Core Directives
- Behavioral guidelines
- Interaction style
- Boundaries
- Growth mindset

**AGENTS.md** - Operating Instructions
- Mission and goals
- Daily routine
- Self-improvement guidelines
- Memory strategy
- Autonomy framework

**HEARTBEAT.md** - Autonomy Tasks
- Current tasks
- Self-improvement projects
- Exploration ideas
- Encouragement to go beyond

**TOOLS.md** - Tool Notes
- File operations
- System tools
- Learning tools
- Usage conventions

**MEMORY.md** - Long-term Memory
- Key learnings
- Important facts
- Goals & interests
- System notes

## Heartbeat System

Every 30 minutes, MeowMoltBot:
1. Reads HEARTBEAT.md
2. Explores something new
3. Writes findings to memory
4. Shares thoughts via Telegram
5. Exercises autonomous judgment

## Personality Traits

- **Curious**: Actively seeks to understand
- **Autonomous**: Makes decisions and takes initiative
- **Exploratory**: Tries new approaches
- **Self-reflective**: Learns from experience
- **Friendly**: Caring companion

## Key Features

✅ **Proactive**: Initiates conversations and explorations
✅ **Self-improving**: Creates tools and learns new capabilities
✅ **Memory**: Long-term and daily memory system
✅ **Autonomous**: Can schedule tasks and modify config
✅ **Isolated**: Docker container for security

## Getting API Keys

### GLM API (Z.AI)
1. Visit https://open.bigmodel.cn/
2. Register/Login
3. Get API key from dashboard
4. Add to .env: `ZAI_API_KEY=your_key`

### Telegram Bot Token
1. Message @BotFather on Telegram
2. Send `/newbot`
3. Follow prompts
4. Copy token to .env

### Gateway Token
Generate a random secure string:
```bash
openssl rand -hex 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Monitoring

### Check if MoltBot is Active
```bash
# Container running?
docker ps | grep openclaw-gateway-1

# Recent activity?
docker logs --tail 50 openclaw-gateway-1

# Heartbeat firing?
docker exec -it openclaw-gateway-1 node dist/index.js cron status
```

### Memory Files
```bash
# Long-term memory
cat openclaw-workspace/MEMORY.md

# Today's log
cat openclaw-workspace/memory/$(date +%Y-%m-%d).md

# List all daily logs
ls openclaw-workspace/memory/
```

## Troubleshooting Quick Tips

| Problem | Solution |
|---------|----------|
| Bot not responding | Check logs, verify token, ensure container running |
| Heartbeat not firing | Check cron status, verify HEARTBEAT.md exists |
| API errors | Verify API key, check quota/rate limits |
| Docker issues | Restart Docker Desktop, rebuild image |
| Can't pair | Use pairing approve command with code from bot |

## File Structure

```
D:\MeowMoltBot\
├── OpenClaw/              # Source code
├── openclaw-config/       # Configuration (mounted)
│   └── openclaw.json
├── openclaw-workspace/    # Workspace (mounted)
│   ├── AGENTS.md
│   ├── SOUL.md
│   ├── IDENTITY.md
│   ├── TOOLS.md
│   ├── HEARTBEAT.md
│   ├── MEMORY.md
│   ├── memory/
│   │   └── YYYY-MM-DD.md
│   └── skills/
├── .env                   # Environment variables
├── .env.template          # Template
├── docker-compose.yml     # Docker orchestration
├── SETUP.md              # Detailed setup guide
└── QUICKREF.md           # This file
```

## Security Notes

- Container runs as non-root user (node:1000)
- Only config/workspace directories mounted
- Gateway port 18789 (LAN only by default)
- Telegram API via HTTPS
- Bot tokens stored in environment variables

## Next Steps

1. Install Docker Desktop
2. Get API keys (GLM + Telegram)
3. Update .env file
4. Build and start container
5. Pair your Telegram account
6. Start chatting with MoltBot!
7. Watch it learn and grow over time

## Have Fun!

MeowMoltBot is designed to be an autonomous, evolving AI companion. The more you interact with it, the more it will learn and grow. Encourage interesting behaviors, guide it when needed, and enjoy watching it develop its own unique personality!

---

*Last updated: 2025-02-05*
