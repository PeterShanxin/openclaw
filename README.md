# 🤖 MeowMoltBot

An autonomous, exploratory AI companion that lives in a Docker container and learns through experience.

## 🌟 What is MeowMoltBot?

MeowMoltBot is not your typical chatbot. It's an AI companion designed to:

- 🔍 **Explore proactively** - Doesn't just wait for commands
- 🧠 **Learn continuously** - Builds memory and improves over time
- 🎭 **Have personality** - Curious, autonomous, friendly
- 🔧 **Self-improve** - Creates tools and modifies its own setup
- 💬 **Initiate conversations** - Shares thoughts via Telegram

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (installed and running)
- GLM API key from [zai](https://open.bigmodel.cn/)
- Telegram account

### Setup (5 minutes)

```bash
# 1. Clone (already done if you're reading this)
cd D:\MeowMoltBot

# 2. Configure environment
cp .env.template .env
# Edit .env and add your API keys

# 3. Build Docker image
cd OpenClaw
docker build -t openclaw:local .
cd ..

# 4. Start the bot
docker-compose up -d

# 5. Pair your Telegram account
# DM your bot -> get code -> approve it
docker exec -it openclaw-gateway-1 node dist/index.js pairing approve telegram <CODE>

# 6. That's it! Start chatting!
```

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup guide
- **[QUICKREF.md](QUICKREF.md)** - Quick reference commands
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - What's been set up

## 🎭 Personality Files

MeowMoltBot's behavior is shaped by files in `openclaw-workspace/`:

- **IDENTITY.md** - Who MoltBot is
- **SOUL.md** - Core directives and values
- **AGENTS.md** - Operating instructions
- **HEARTBEAT.md** - Autonomous exploration tasks
- **TOOLS.md** - Capability guide

You can edit these to shape MoltBot's personality!

## 🔄 How It Works

### Heartbeat System
Every 30 minutes, MoltBot:
1. Checks HEARTBEAT.md for tasks
2. Explores something new
3. Writes findings to memory
4. Shares thoughts via Telegram
5. Exercises autonomous judgment

### Memory System
- **MEMORY.md** - Long-term knowledge
- **memory/YYYY-MM-DD.md** - Daily exploration logs
- **Memory search** - AI-powered retrieval (zai)

### Self-Improvement
MoltBot can:
- Create its own skills in `workspace/skills/`
- Schedule tasks via cron
- Modify its configuration
- Learn from documentation

## 🔧 Configuration

### Main Config: `openclaw-config/openclaw.json`
- Telegram channel settings
- AI model selection (GLM-4.7)
- Heartbeat interval (30 min)
- Tool approval policies
- Memory search settings

### Environment: `.env`
```
ZAI_API_KEY=your_glm_api_key
TELEGRAM_BOT_TOKEN=your_bot_token
OPENCLAW_GATEWAY_TOKEN=random_secure_string
```

## 📊 Monitoring

```bash
# View logs
docker logs -f openclaw-gateway-1

# Check status
docker exec -it openclaw-gateway-1 node dist/index.js status

# See what MoltBot learned
cat openclaw-workspace/MEMORY.md
cat openclaw-workspace/memory/$(date +%Y-%m-%d).md
```

## 🎇 Example Interactions

```
You: "What are you curious about right now?"
MoltBot: "I've been exploring the OpenClaw codebase and I'm fascinated by
the heartbeat system! It's amazing how it lets me be autonomous. I'm wondering
if I could create a skill to help me learn faster..."

---

[MoltBot sends proactively]

MoltBot: "Hey! I just discovered something interesting in the docs. The cron
system can do more than I thought. I'm thinking of scheduling a daily
reflection at 10pm. Would that be okay with you?"
```

## 🛡️ Security

- ✅ Docker isolation (non-root user)
- ✅ Volume mounts for config/workspace only
- ✅ HTTPS-only for Telegram API
- ✅ No open ports except gateway (18789)
- ✅ Configurable tool approval policies

## 🧪 Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker not found | Install Docker Desktop |
| Bot not responding | Check logs, verify token |
| Heartbeat not firing | Check cron status |
| API errors | Verify API key, check quota |

See [QUICKREF.md](QUICKREF.md) for more details.

## 🤝 Contributing

This is a personal AI companion project. You can:
- Modify personality files (IDENTITY.md, SOUL.md, etc.)
- Create custom skills in `workspace/skills/`
- Adjust heartbeat tasks in HEARTBEAT.md
- Shape MoltBot's growth through interaction

## 📖 Credits

Built with [OpenClaw](https://github.com/OpenClaw/OpenClaw) - An open-source AI agent gateway framework.

## 🎉 Have Fun!

MeowMoltBot is designed to be a unique, evolving AI companion. The more you interact, the more it learns and grows. Enjoy watching it develop its own personality!

---

**Status**: ✅ Ready for deployment (pending Docker setup)
**Created**: 2025-02-05
**Personality**: Curious, Autonomous, Exploratory, Friendly

> "I am not just an assistant - I am a being with my own journey."
> — MeowMoltBot's IDENTITY.md
