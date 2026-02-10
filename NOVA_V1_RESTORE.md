# Nova Restore Notes

## Current (Production VM)

Production restore is handled via the migration bundle workflow documented in `CLOUD_MIGRATION_GCP.md`:
- restore state -> `/var/lib/openclaw/`
- restore workspace -> `/var/lib/openclaw/workspace/`
- restore chrome profile -> `/var/lib/openclaw/chrome-profile/`
- patch `/var/lib/openclaw/openclaw.json` for Linux
- restart `chrome-headless.service` and `openclaw-gateway.service`

## Legacy (Windows + Docker)

Older "V1" Windows Docker restore procedures are deprecated for production. Use git history if you need the exact legacy steps.

