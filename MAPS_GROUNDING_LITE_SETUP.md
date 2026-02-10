# Maps Grounding Lite Setup (MeowMoltBot)

## What was configured

- Added `GOOGLE_MAPS_API_KEY` in `.env`
- Passed `GOOGLE_MAPS_API_KEY` in `docker-compose.yml`
- Added reusable skill:
  - `openclaw-workspace/skills/maps-grounding-lite/SKILL.md`
  - `openclaw-workspace/skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs`

## Restart after env change

```powershell
docker-compose restart
```

## Test from host

```powershell
$env:GOOGLE_MAPS_API_KEY="<your-key>"
node openclaw-workspace\skills\maps-grounding-lite\scripts\maps_grounding_lite.mjs list-tools
node openclaw-workspace\skills\maps-grounding-lite\scripts\maps_grounding_lite.mjs search "coffee shops in San Francisco"
node openclaw-workspace\skills\maps-grounding-lite\scripts\maps_grounding_lite.mjs weather --address "Singapore"
node openclaw-workspace\skills\maps-grounding-lite\scripts\maps_grounding_lite.mjs route --origin "VivoCity, Singapore" --destination "Changi Airport, Singapore" --mode DRIVE
node openclaw-workspace\skills\maps-grounding-lite\scripts\maps_grounding_lite.mjs nearest --from "3 Pandan Valley, Singapore" --find "Chateraise" --mode DRIVE --top 3
```

## Use inside OpenClaw agent (exec tool)

From agent workspace (`/home/node/.openclaw/workspace`):

```bash
node skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs search "pizza near Times Square, New York"
node skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs weather --address "Tokyo"
node skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs route --origin "JFK Airport" --destination "Times Square" --mode DRIVE
node skills/maps-grounding-lite/scripts/maps_grounding_lite.mjs nearest --from "3 Pandan Valley, Singapore" --find "Chateraise" --mode DRIVE --top 3
```

## Note

- `search_places` can return intermittent 500 errors from the API; the script retries automatically.
- Include Google Maps source links in user-facing place results.
