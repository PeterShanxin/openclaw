# MeowMoltBot Web Search Setup Guide

## Quick Setup (2 minutes)

### Step 1: Get Brave Search API Key

1. Visit: **https://api-dashboard.search.brave.com/register**
2. Create an account (free)
3. Navigate to the API dashboard
4. Generate a new API key
5. Copy the key (looks like: `BSA1234567890abcdef...`)

### Step 2: Add to .env File

Edit `D:\MeowMoltBot\.env` and add your key:

```bash
BRAVE_API_KEY=your_actual_api_key_here
```

### Step 3: Restart Container

```powershell
docker-compose restart
```

### Step 4: Test Web Search

Send this message to MeowMoltBot on Telegram:
```
"Search the web for the latest AI news and tell me what you find"
```

## Alternative Web Search Options

If Brave doesn't work, MeowMoltBot can also use:

### Tavily API (Alternative)
1. Sign up at: https://tavily.com/
2. Get free API key (1,000 searches/month)
3. Add to `.env`: `TAVILY_API_KEY=your_key_here`

## Pricing Comparison

| Provider | Free Tier | Paid Plans |
|----------|-----------|------------|
| **Brave Search** | 2,000 requests/month | $5/50K, $12/150K |
| **Tavily** | 1,000 searches/month | Custom pricing |

## Troubleshooting

### API Key Not Working
- Verify the key doesn't have extra spaces
- Check you copied the entire key
- Ensure the account is active

### Web Search Still Not Available
```powershell
# Check if web search is enabled
docker exec openclaw-gateway-1 node dist/index.js status

# Check logs for errors
docker logs --tail 50 openclaw-gateway-1
```

### Container Won't Start After Adding Key
- Check .env file syntax (no quotes around the key)
- Ensure no special characters that need escaping
- Verify the file is saved with Unix line endings

## Usage Examples for MeowMoltBot

After setup, try these commands:

```
"Search for recent developments in AI and summarize what you find"
"Look up the weather in Beijing"
"Find information about the latest OpenClaw release"
"Search web for how to improve agent memory systems"
```

## Security Notes

- Never commit `.env` to git
- Keep API keys private
- Rotate keys periodically if concerned about security
- Monitor usage on your dashboard

---

**Sources:**
- [Brave Search API Registration](https://api-dashboard.search.brave.com/register)
- [Brave Search API Homepage](https://brave.com/search/api/)
- [Brave Search API Guides](https://brave.com/search/api/guides/)
