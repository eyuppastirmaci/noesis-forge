#!/usr/bin/env bash
set -euo pipefail

cmd="${1:-dev}"
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

compose_up() {
  local args=()
  for p in "$@"; do args+=( --profile "$p" ); done
  args+=( up -d --remove-orphans )
  echo ">> docker compose ${args[*]}"
  docker compose "${args[@]}"
}

case "$cmd" in
  dev)
    compose_up infra workers

    echo ">> starting backend (air) and frontend (npm run dev)..."
    (
      cd "$root/backend"
      if ! command -v air >/dev/null 2>&1; then
        echo "WARNING: 'air' not found in PATH. Install it or start backend manually." >&2
      fi
      nohup air >/dev/null 2>&1 &
    )
    (
      cd "$root/frontend"
      nohup npm run dev >/dev/null 2>&1 &
    )
    echo "Dev environment is up (processes started in background). To stop containers: './run.sh down'"
    ;;

  start)
    compose_up infra workers app
    echo "All services (app+infra+workers) are running."
    ;;

  down)
    echo ">> docker compose down --remove-orphans"
    docker compose down --remove-orphans
    echo "All containers stopped and removed."
    ;;

  *)
    echo "Usage: $0 [dev|start|down]" >&2
    exit 1
    ;;
esac
