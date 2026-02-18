# Openclaw Subtree Workflow

Use this when you want **one repository clone** (`MeowMoltBot`) while still syncing `openclaw` with your fork.

## Current setup

- `openclaw/` is a normal tracked folder in this repo (not a submodule).
- Remote alias for subtree sync:
  - `openclaw-fork` → `https://github.com/PeterShanxin/openclaw.git`

## Commands

From the repo root:

```bash
# Pull changes from your fork into openclaw/
scripts/openclaw-subtree.sh pull

# Optional: keep history compact
scripts/openclaw-subtree.sh pull --squash

# Push local openclaw/ changes back to your fork
scripts/openclaw-subtree.sh push

# Show split SHA generated from openclaw/ subtree
scripts/openclaw-subtree.sh split
```

## Notes

- You can override defaults via env vars:
  - `OPENCLAW_REMOTE` (default: `openclaw-fork`)
  - `OPENCLAW_BRANCH` (default: `main`)
  - `OPENCLAW_PREFIX` (default: `openclaw`)
- Typical flow:
  1. Work normally in this repo.
  2. Commit changes.
  3. Run `scripts/openclaw-subtree.sh push` when you want to sync `openclaw/` to your fork.
