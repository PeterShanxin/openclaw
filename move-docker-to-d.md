# Move Docker Data to D: Drive

## Why Move Docker to D:?

- **Current usage**: ~6 GB on C: drive
- **Your D: drive has more space**
- **Keep your C: drive clean**

## ⚠️ Important Notes

- This will **stop all containers** temporarily
- Existing images/containers will be migrated
- Takes 5-10 minutes
- **Safe and reversible**

## Method 1: Docker Desktop Settings (Easiest)

### Step 1: Open Docker Desktop

1. Right-click Docker Desktop icon in tray
2. Select "Settings"
3. Go to "Advanced" or "Resources" > "Advanced"

### Step 2: Change Disk Location

1. Find "Disk image location" or "Disk location"
2. Click "Browse" or "Change"
3. Select: `D:\DockerData`
4. Click "Apply & Restart"

### Step 3: Wait for Migration

- Docker will move all data to D:
- This may take 5-10 minutes
- Don't close Docker Desktop during migration

### Step 4: Verify

After restart:
```powershell
docker info
# Look for "Docker Root Dir" - should show new location
```

## Method 2: WSL2 Manual Migration (If Method 1 Doesn't Work)

### Step 1: Stop Docker

```powershell
# Stop Docker Desktop
# Right-click tray icon > Quit Docker Desktop
```

### Step 2: Check Current WSL Distributions

```powershell
wsl --list -v
```

You should see:
```
NAME                   STATE           VERSION
* docker-desktop        Running         2
  docker-desktop-data   Running         2
```

### Step 3: Export Docker Data

```powershell
# Create destination directory
mkdir D:\DockerData

# Export docker-desktop-data
wsl --export docker-desktop-data D:\DockerData\docker-desktop-data.tar
```

### Step 4: Unregister Old Distribution

```powershell
wsl --unregister docker-desktop-data
```

### Step 5: Import to New Location

```powershell
wsl --import docker-desktop-data D:\DockerData\ D:\DockerData\docker-desktop-data.tar --version 2
```

### Step 6: Delete Tar File (Optional)

```powershell
del D:\DockerData\docker-desktop-data.tar
```

### Step 7: Start Docker Desktop

Double-click Docker Desktop icon to start.

### Step 8: Verify

```powershell
docker ps
docker system df
```

## Method 3: Clean Up First (Quick Space Recovery)

If you just want to free up space without moving:

```powershell
# Remove unused images
docker image prune -a

# Remove build cache
docker builder prune -a

# Remove everything unused
docker system prune -a

# Check space saved
docker system df
```

## Verification After Moving

### Check Docker is Working:

```powershell
# Container should still run
docker ps | grep openclaw-gateway-1

# Test MeowMoltBot
# Send message on Telegram
```

### Check Disk Space:

```powershell
# On D: drive
dir D:\DockerData

# Docker should show new location
docker info | grep "Docker Root"
```

## Restart MeowMoltBot After Migration

```powershell
cd D:\MeowMoltBot
docker-compose up -d
```

## Troubleshooting

### Docker Won't Start After Move

1. **Reinstall Docker Desktop**
2. **Use WSL method above**
3. **Reset Docker Desktop:**
   - Settings > Reset
   - Then try migration again

### Container Lost After Move

Your containers and images are preserved, but just in case:

```powershell
# Check if container still exists
docker ps -a

# If missing, restart MeowMoltBot:
cd D:\MeowMoltBot
docker-compose up -d
```

### WSL Command Not Found

- Install WSL2: `wsl --install`
- Restart computer
- Try again

## What Gets Moved?

✅ **Moved to D:**
- Docker images (6+ GB)
- Container layers
- Build cache
- Volume data

❌ **Stays on C:**
- Docker Desktop application (small)
- Your workspace files (D:\MeowMoltBot already!)

## Expected Results

**Before:**
```
C: drive: -6 GB (Docker data)
D: drive: D:\MeowMoltBot\ only
```

**After:**
```
C: drive: +6 GB freed
D: drive: +6 GB (Docker data)
```

## Safety Notes

- ✅ **Safe process** - standard Docker operation
- ✅ **Reversible** - can move back if needed
- ✅ **Your data preserved** - images, containers, volumes
- ⚠️ **Takes time** - 5-10 minutes for migration
- ⚠️ **Stops containers** - temporary downtime

---

**Recommendation:** Try Method 1 first (Docker Desktop settings). If that doesn't work, use Method 2 (WSL manual).

**After migration**, your 6 GB Docker data will be on D: drive, and MeowMoltBot will continue working normally!
