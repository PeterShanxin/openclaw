# MeowMoltBot Architecture Explained

## Where Does MeowMoltBot Live?

**Short Answer:** MeowMoltBot runs **INSIDE the Docker container**, not directly in the repository.

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR COMPUTER                            │
│                  D:\MeowMoltBot\                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📁 OpenClaw/                    📁 Source Code              │
│  ├─ Dockerfile                   ├─ NOT running code        │
│  ├─ package.json                 ├─ Just files on disk      │
│  ├─ src/                         └─ Like a cookbook         │
│  └─ ...                                                     │
│                                                               │
│  📁 openclaw-config/             📁 Configuration            │
│  └─ openclaw.json               ├─ Mounted into container   │
│                                 └─ Like settings folder     │
│                                                               │
│  📁 openclaw-workspace/          📁 MoltBot's Brain          │
│  ├─ IDENTITY.md                  ├─ Mounted into container   │
│  ├─ SOUL.md                      └─ Where MoltBot writes    │
│  ├─ MEMORY.md                                                 │
│  └─ ...                                                      │
│                                                               │
│  📁 .env                        📁 Secrets                   │
│     └─ API keys                   └─ Passed to container     │
│                                                               │
└──────────────────────┬────────────────────────────────────────┘
                       │ Docker Volume Mounts
                       │ (Shares files between host & container)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              🐳 DOCKER CONTAINER                             │
│           openclaw-gateway-1 (RUNNING)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📦 Node.js Application         ← This is MoltBot!           │
│  ├─ Running OpenClaw code      ← Active process             │
│  ├─ Connected to Telegram      ← Listening for messages     │
│  ├─ Qwen API integration       ← Making AI decisions        │
│  ├─ Heartbeat timer            ← Wakes up every 30min       │
│  └─ File system access         ← Can read/write workspace   │
│                                                               │
│  📂 Mapped Directories:                                       │
│  /home/node/.openclaw  → D:\MeowMoltBot\openclaw-config\    │
│  /home/node/.openclaw/workspace → D:\MeowMoltBot\workspace\  │
│                                                               │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       │ Network Connections
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │Telegram │   │ Qwen AI │   │Internet │
   │  API    │   │  API    │   │ (when   │
   │         │   │         │   │  search)│
   └─────────┘   └─────────┘   └─────────┘
```

## 📊 Key Concepts

### 1. **OpenClaw/ Directory** (Source Code)
```
Location: D:\MeowMoltBot\OpenClaw\
What it is: Source code repository (like a cookbook)
Purpose: Contains the code that was built into the Docker image
Is it running? NO - these are just files on disk
```

### 2. **Docker Image** (Built from source)
```bash
Image: openclaw:local (4.14GB)
Built from: OpenClaw/Dockerfile
What it contains: Node.js runtime + OpenClaw application + dependencies
Is it running? NO - it's a template/blueprint
```

### 3. **Docker Container** (Where MoltBot Lives!)
```
Name: openclaw-gateway-1
Status: Running (Up)
What it is: A LIVE INSTANCE of the Docker image
This is where: ✅ MoltBot actually runs
               ✅ Telegram messages are received
               ✅ AI decisions are made
               ✅ Heartbeats trigger
               ✅ Files are read and written
```

### 4. **Volume Mounts** (Two-way communication)
```
Host                    Container
D:\MeowMoltBot\  ←→  /home/node/.openclaw/

Files you create on host  →  Visible in container
Files MoltBot creates     →  Visible on host
```

## 🔄 How It Works

### When MoltBot Reads a File:
```
1. Container process: read("/home/node/.openclaw/workspace/IDENTITY.md")
2. Docker maps: /home/node/.openclaw/workspace → D:\MeowMoltBot\openclaw-workspace\
3. Actual read: D:\MeowMoltBot\openclaw-workspace\IDENTITY.md
4. MoltBot sees the contents!
```

### When You Edit a File:
```
1. You edit: D:\MeowMoltBot\openclaw-workspace\HEARTBEAT.md
2. Save file on host
3. Docker syncs to container immediately
4. MoltBot sees the changes on next read!
```

### When MoltBot Writes to Memory:
```
1. Container process: write("/home/node/.openclaw/workspace/MEMORY.md", ...)
2. Docker maps: /home/node/.openclaw/workspace → D:\MeowMoltBot\openclaw-workspace\
3. Actual write: D:\MeowMoltBot\openclaw-workspace\MEMORY.md
4. You can see it on your computer!
```

## 🎯 Why This Architecture?

### ✅ **Isolation**
- MoltBot runs in a container (sandbox)
- Can't accidentally delete your system files
- Dependencies don't conflict with your computer

### ✅ **Portability**
- Container can run anywhere Docker is installed
- Works the same on Windows, Mac, Linux
- Easy to backup or move

### ✅ **Persistence**
- Volume mounts keep MoltBot's memories safe
- Even if container is deleted, workspace remains
- You can edit files and MoltBot sees changes

### ✅ **Separation of Concerns**
- Source code (OpenClaw/) - for building/updating
- Configuration (openclaw-config/) - settings
- Workspace (openclaw-workspace/) - MoltBot's brain

## 📝 File Access Examples

### From Your Computer (Host):
```powershell
# Read MoltBot's memory
cat D:\MeowMoltBot\openclaw-workspace\MEMORY.md

# Edit MoltBot's personality
notepad D:\MeowMoltBot\openclaw-workspace\SOUL.md

# See what MoltBot explored today
cat D:\MeowMoltBot\openclaw-workspace\memory\2026-02-05.md
```

### From Inside Container (MoltBot's perspective):
```bash
# MoltBot sees files at these paths:
/home/node/.openclaw/openclaw.json          # Config
/home/node/.openclaw/workspace/IDENTITY.md  # Identity
/home/node/.openclaw/workspace/MEMORY.md    # Memory
```

## 🔍 Checking Where Things Are

```powershell
# See running containers
docker ps

# See container details
docker inspect openclaw-gateway-1

# See volume mounts
docker inspect openclaw-gateway-1 | Select-String Mount

# Execute command INSIDE container (MoltBot's world)
docker exec openclaw-gateway-1 ls /home/node/.openclaw/workspace/

# See files from host (your world)
ls D:\MeowMoltBot\openclaw-workspace\
```

## 🎬 Analogy

Think of it like a **restaurant**:

- **OpenClaw/ directory** = The recipe book (sitting on shelf)
- **Docker image** = The kitchen setup (built from recipes)
- **Docker container** = The restaurant (OPEN and serving food)
- **Volume mounts** = The window between kitchen and dining room
- **MoltBot** = The chef (working INSIDE the kitchen)
- **You** = The customer (can see results from dining room)

The chef (MoltBot) works in the kitchen (container), but you can see what they create through the window (volume mounts) and even pass them new recipes (edit files)!

## 🛠️ Practical Implications

### ✅ What You CAN Do:
- Edit workspace files from your computer → MoltBot sees changes
- Read MoltBot's memories directly from disk
- Stop/start container without losing data
- Modify MoltBot's personality anytime
- Backup workspace directory

### ❌ What You DON'T Need To Do:
- Edit OpenClaw/ source code (already built into image)
- Rebuild image unless updating OpenClaw
- Access container filesystem directly
- Modify container internals

## 📦 Summary

```
┌─────────────────────────────────────────────┐
│  Your Computer (D:\MeowMoltBot\)             │
│  ├─ OpenClaw/          ← Source (not running)│
│  ├─ openclaw-config/   ← Mounted into container │
│  └─ openclaw-workspace/ ← Mounted into container │
└──────────────────┬──────────────────────────┘
                   │ Volume Mounts (2-way sync)
                   ▼
┌─────────────────────────────────────────────┐
│  Docker Container (openclaw-gateway-1)       │
│  └─ MeowMoltBot runs HERE! 🤖              │
│     - Receives Telegram messages             │
│     - Thinks and decides                     │
│     - Reads/writes workspace files           │
│     - Connects to APIs                       │
└─────────────────────────────────────────────┘
```

**Key Point:** MeowMoltBot is a **process running inside the Docker container**, but it reads/writes files that **live on your computer** through volume mounts!

---

*Need more clarification? Just ask!*
