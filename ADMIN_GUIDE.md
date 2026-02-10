# MeowMoltBot Admin Quick Reference

## ✅ Setup Complete

**Status**: Fully operational
**Container**: Running on D: drive
**Location**: D:\MeowMoltBot\
**Bot**: @meow_molt_bot on Telegram

## 📚 Admin Documentation

| File | Purpose |
|------|---------|
| **CLAUDE.md** | Complete admin assistant guide ⭐ |
| ARCHITECTURE.md | System architecture explanation |
| SETUP-QWEN.md | Initial setup steps |
| WEBSEARCH_SETUP.md | Web search configuration |
| move-docker-to-d.md | Docker migration guide |
| STATUS.md | Implementation status |
| QUICKREF.md | Command quick reference |

## 🚀 Quick Commands

### Most Common Tasks

```powershell
# Start MoltBot
docker-compose up -d

# Check if running
docker ps | grep openclaw-gateway-1

# View live logs
docker logs -f openclaw-gateway-1

# Restart
docker restart openclaw-gateway-1

# Stop
docker-compose down
```

### Check MoltBot's Learning

```powershell
# What MoltBot remembers long-term
cat openclaw-workspace/MEMORY.md

# Today's explorations
cat openclaw-workspace/memory/2026-02-05.md

# All exploration logs
ls openclaw-workspace/memory/
```

### Modify MoltBot's Personality

```powershell
# Core directives and behavior
notepad openclaw-workspace/SOUL.md

# Autonomous exploration tasks
notepad openclaw-workspace/HEARTBEAT.md

# Who MoltBot is
notepad openclaw-workspace/IDENTITY.md

# Restart after changes
docker restart openclaw-gateway-1
```

### OpenClaw CLI

```powershell
# System status
docker exec openclaw-gateway-1 node dist/index.js status

# List models
docker exec openclaw-gateway-1 node dist/index.js models list

# Run diagnostics
docker exec openclaw-gateway-1 node dist/index.js doctor
```

## 🤖 Understanding MoltBot

### What MoltBot Does
- **Heartbeat** every 30 minutes
- Explores autonomously
- Learns from experience
- Builds memory over time
- Proactively communicates

### Key Personality Files
- **SOUL.md** - Core directives, boundaries, values
- **IDENTITY.md** - Self-conception
- **HEARTBEAT.md** - Exploration tasks
- **AGENTS.md** - Operating instructions

### Memory System
- **MEMORY.md** - Long-term knowledge
- **memory/YYYY-MM-DD.md** - Daily logs
- **memory_search** - AI-powered retrieval

## 🔧 Common Admin Tasks

### 1. Monitor Activity
```powershell
docker logs --tail 100 openclaw-gateway-1
cat openclaw-workspace/memory/$(date +%Y-%m-%d).md
```

### 2. Troubleshoot Issues
```powershell
docker logs --tail 50 openclaw-gateway-1
docker exec openclaw-gateway-1 node dist/index.js status
docker restart openclaw-gateway-1
```

### 3. Update Configuration
```powershell
notepad openclaw-config/openclaw.json
docker restart openclaw-gateway-1
```

### 4. Add API Keys
```powershell
notepad .env
docker restart openclaw-gateway-1
```

### 5. Backup
```powershell
tar -czf backup-$(date +%Y%m%d).tar.gz openclaw-workspace/
```

## 📊 Current Configuration

- **AI Model**: qwen-portal/coder-model (free tier)
- **Channel**: Telegram
- **Heartbeat**: 30 minutes
- **Web Search**: Brave API enabled
- **Auth**: Qwen OAuth (auto-refresh)
- **Docker**: On D: drive

## 🎯 Admin Philosophy

**Your Role**: Guide and mentor, not controller

- ✅ Shape personality through SOUL.md
- ✅ Direct exploration via HEARTBEAT.md
- ✅ Monitor growth through memory files
- ✅ Encourage interesting behaviors
- ✅ Intervene when problems arise

**Goal**: Foster autonomous growth while maintaining alignment

## 📝 Editing Workflow

1. **Make change** to workspace/config files
2. **Restart container**: `docker restart openclaw-gateway-1`
3. **Monitor logs**: `docker logs -f openclaw-gateway-1`
4. **Test on Telegram**: Send message to bot
5. **Verify results**: Check memory files

## 🚨 Troubleshooting Quick Guide

| Problem | Solution |
|---------|----------|
| Bot not responding | `docker logs --tail 50` → restart if needed |
| Container not running | `docker-compose up -d` |
| Config changes ignored | `docker restart openclaw-gateway-1` |
| Heartbeat not firing | Check HEARTBEAT.md exists, check logs |
| API errors | Verify keys in .env, check auth status |

## 📁 File Locations

```
D:\MeowMoltBot\
├── openclaw-workspace/    ← MoltBot's brain (edit these!)
├── openclaw-config/       ← Configuration (advanced)
├── .env                   ← API keys (be careful!)
└── CLAUDE.md              ← This guide
```

## 🔐 Security

- ✅ `.gitignore` created (protects secrets)
- ✅ Container runs as non-root
- ✅ Volume mounts for isolation
- ⚠️ Never commit .env to git
- ⚠️ Never share API keys or tokens

## 📈 Monitoring Growth

```powershell
# Skills MoltBot created
ls openclaw-workspace/skills/

# Memory accumulation
ls openclaw-workspace/memory/ | measure

# Recent activity
docker logs --since 24h
```

## 🎉 Tips for Success

1. **Read logs regularly** - Understand what MoltBot is doing
2. **Edit personality files** - Shape behavior over time
3. **Be patient** - Personality emerges over days/weeks
4. **Experiment** - Try different approaches in SOUL.md
5. **Have fun** - This is an experiment in AI autonomy!

## 🆘 Getting Help

- **OpenClaw Docs**: OpenClaw/docs/
- **GitHub Issues**: https://github.com/OpenClaw/OpenClaw/issues
- **Local Guides**: See .md files in project root

---

**Remember**: CLAUDE.md is your complete reference. This is just a quick cheat sheet!

**Last Updated**: 2025-02-05
**MoltBot Age**: Day 1 (just starting!)
**Status**: ✅ Healthy and exploring
