#!/usr/bin/env bash

set -euo pipefail

REMOTE="${OPENCLAW_REMOTE:-openclaw-fork}"
BRANCH="${OPENCLAW_BRANCH:-main}"
PREFIX="${OPENCLAW_PREFIX:-openclaw}"

usage() {
  cat <<'EOF'
Usage:
  scripts/openclaw-subtree.sh pull [--squash]
  scripts/openclaw-subtree.sh push
  scripts/openclaw-subtree.sh split

Environment overrides:
  OPENCLAW_REMOTE   (default: openclaw-fork)
  OPENCLAW_BRANCH   (default: main)
  OPENCLAW_PREFIX   (default: openclaw)

Examples:
  scripts/openclaw-subtree.sh pull --squash
  scripts/openclaw-subtree.sh push
EOF
}

ensure_git_repo() {
  git rev-parse --is-inside-work-tree >/dev/null
}

ensure_remote_exists() {
  if ! git remote | grep -qx "$REMOTE"; then
    echo "Remote '$REMOTE' not found."
    echo "Add it with: git remote add $REMOTE https://github.com/PeterShanxin/openclaw.git"
    exit 1
  fi
}

pull_subtree() {
  local squash_flag=""
  if [[ "${1:-}" == "--squash" ]]; then
    squash_flag="--squash"
  fi

  echo "Fetching $REMOTE/$BRANCH..."
  git fetch "$REMOTE" "$BRANCH"

  echo "Pulling subtree into '$PREFIX'..."
  if [[ -n "$squash_flag" ]]; then
    git subtree pull --prefix="$PREFIX" "$REMOTE" "$BRANCH" --squash
  else
    git subtree pull --prefix="$PREFIX" "$REMOTE" "$BRANCH"
  fi
}

split_subtree() {
  git subtree split --prefix="$PREFIX"
}

push_subtree() {
  echo "Pushing subtree '$PREFIX' to $REMOTE/$BRANCH..."
  git subtree push --prefix="$PREFIX" "$REMOTE" "$BRANCH"
}

main() {
  ensure_git_repo
  ensure_remote_exists

  case "${1:-}" in
    pull)
      pull_subtree "${2:-}"
      ;;
    split)
      split_subtree
      ;;
    push)
      push_subtree
      ;;
    -h|--help|help|"")
      usage
      ;;
    *)
      echo "Unknown command: $1"
      usage
      exit 1
      ;;
  esac
}

main "$@"
